// server/src/utils/calculator.ts
/**
 * Mathematical Calculation Engine for Shared Self-Attendance Tracker
 * 
 * Conducted Classes = Attended + Absent (Cancelled classes are strictly excluded)
 * Attendance % = (Attended / Conducted) * 100
 */

export interface AttendanceStats {
  attended: number;
  absent: number;
  cancelled: number;
  conducted: number;
  percentage: number;
  hasRecords: boolean;
}

export interface ShortageAnalysis {
  isShortage: boolean;
  currentPercentage: number;
  targetPercentage: number;
  classesNeeded: number;
  isTargetAchievable: boolean;
  safeMargin: number;
  statusMessage: string;
}

export interface ProjectionScenario {
  futureClassesToAttend: number;
  totalFutureClasses: number;
  resultingAttended: number;
  resultingConducted: number;
  resultingPercentage: number;
  meetsTarget: boolean;
}

/**
 * Calculates attendance summary statistics
 */
export function calculateAttendanceStats(
  attended: number,
  absent: number,
  cancelled: number = 0
): AttendanceStats {
  const safeAttended = Math.max(0, Math.floor(attended));
  const safeAbsent = Math.max(0, Math.floor(absent));
  const safeCancelled = Math.max(0, Math.floor(cancelled));

  const conducted = safeAttended + safeAbsent;
  const hasRecords = conducted > 0 || safeCancelled > 0;

  if (conducted === 0) {
    return {
      attended: safeAttended,
      absent: safeAbsent,
      cancelled: safeCancelled,
      conducted: 0,
      percentage: 0.0,
      hasRecords
    };
  }

  const rawPercentage = (safeAttended / conducted) * 100;
  const percentage = Math.round(rawPercentage * 100) / 100;

  return {
    attended: safeAttended,
    absent: safeAbsent,
    cancelled: safeCancelled,
    conducted,
    percentage,
    hasRecords: true
  };
}

/**
 * Analyzes shortage and safe margin against target threshold
 */
export function analyzeAttendanceShortage(
  attended: number,
  conducted: number,
  targetPercentage: number = 75
): ShortageAnalysis {
  const safeAttended = Math.max(0, Math.floor(attended));
  const safeConducted = Math.max(0, Math.floor(conducted));
  const target = Math.max(1, Math.min(100, targetPercentage));
  const targetFraction = target / 100;

  if (safeConducted === 0) {
    return {
      isShortage: false,
      currentPercentage: 0.0,
      targetPercentage: target,
      classesNeeded: 0,
      isTargetAchievable: true,
      safeMargin: 0,
      statusMessage: 'No conducted classes recorded yet.'
    };
  }

  const currentFraction = safeAttended / safeConducted;
  const currentPercentage = Math.round(currentFraction * 10000) / 100;
  const isShortage = currentPercentage < target;

  if (isShortage) {
    // If target is 100% and student already missed at least 1 class (safeAttended < safeConducted)
    if (targetFraction >= 1.0) {
      return {
        isShortage: true,
        currentPercentage,
        targetPercentage: target,
        classesNeeded: Infinity,
        isTargetAchievable: false,
        safeMargin: 0,
        statusMessage: 'Target of 100% is impossible to achieve because at least one class has been missed.'
      };
    }

    // Required consecutive classes: (A + x) / (C + x) >= T => x >= (T*C - A) / (1 - T)
    const numerator = targetFraction * safeConducted - safeAttended;
    const denominator = 1 - targetFraction;
    const classesNeeded = Math.max(0, Math.ceil(numerator / denominator));

    return {
      isShortage: true,
      currentPercentage,
      targetPercentage: target,
      classesNeeded,
      isTargetAchievable: true,
      safeMargin: 0,
      statusMessage: `Attendance shortage! You must attend the next ${classesNeeded} consecutive class${classesNeeded === 1 ? '' : 'es'} to reach ${target}%.`
    };
  } else {
    // Safe margin: A / (C + y) >= T => y <= (A - T*C) / T
    let safeMargin = 0;
    if (targetFraction > 0) {
      const margin = (safeAttended - targetFraction * safeConducted) / targetFraction;
      safeMargin = Math.max(0, Math.floor(margin + 1e-9)); // tiny epsilon to avoid IEEE 754 precision issues
    }

    const statusMessage = safeMargin === 0
      ? `You are right at the ${target}% threshold. Missing the next class will put you below target.`
      : `You are in good standing! You can miss up to ${safeMargin} class${safeMargin === 1 ? '' : 'es'} and still stay at or above ${target}%.`;

    return {
      isShortage: false,
      currentPercentage,
      targetPercentage: target,
      classesNeeded: 0,
      isTargetAchievable: true,
      safeMargin,
      statusMessage
    };
  }
}

/**
 * Projects attendance percentage given future upcoming classes
 */
export function projectAttendance(
  attended: number,
  conducted: number,
  upcomingClasses: number,
  classesToAttend: number,
  targetPercentage: number = 75
): ProjectionScenario {
  const safeAttended = Math.max(0, Math.floor(attended));
  const safeConducted = Math.max(0, Math.floor(conducted));
  const safeUpcoming = Math.max(0, Math.floor(upcomingClasses));
  const safeAttendFuture = Math.max(0, Math.min(safeUpcoming, Math.floor(classesToAttend)));

  const resultingAttended = safeAttended + safeAttendFuture;
  const resultingConducted = safeConducted + safeUpcoming;

  const rawPercentage = resultingConducted === 0 ? 0 : (resultingAttended / resultingConducted) * 100;
  const resultingPercentage = Math.round(rawPercentage * 100) / 100;

  return {
    futureClassesToAttend: safeAttendFuture,
    totalFutureClasses: safeUpcoming,
    resultingAttended,
    resultingConducted,
    resultingPercentage,
    meetsTarget: resultingPercentage >= targetPercentage
  };
}
