// server/tests/calculator.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateAttendanceStats,
  analyzeAttendanceShortage,
  projectAttendance
} from '../src/utils/calculator';

describe('Mathematical Attendance Calculator Engine', () => {
  describe('Attendance Percentage & Conducted Counts', () => {
    it('accurately calculates attendance from the required specification example', () => {
      // Example from specification:
      // Attended: 18, Absent: 6, Cancelled: 2
      // Conducted: 18 + 6 = 24
      // Percentage: 18 / 24 * 100 = 75.0%
      const stats = calculateAttendanceStats(18, 6, 2);

      expect(stats.attended).toBe(18);
      expect(stats.absent).toBe(6);
      expect(stats.cancelled).toBe(2);
      expect(stats.conducted).toBe(24);
      expect(stats.percentage).toBe(75.0);
    });

    it('strictly excludes cancelled classes from conducted count', () => {
      // 10 attended, 0 absent, 15 cancelled => Conducted is 10, Attendance is 100%
      const stats = calculateAttendanceStats(10, 0, 15);
      expect(stats.conducted).toBe(10);
      expect(stats.percentage).toBe(100.0);
    });

    it('handles zero conducted classes safely without NaN or division-by-zero crash', () => {
      const stats = calculateAttendanceStats(0, 0, 0);
      expect(stats.conducted).toBe(0);
      expect(stats.percentage).toBe(0.0);
      expect(Number.isNaN(stats.percentage)).toBe(false);

      // Only cancelled classes conducted
      const statsCancelledOnly = calculateAttendanceStats(0, 0, 5);
      expect(statsCancelledOnly.conducted).toBe(0);
      expect(statsCancelledOnly.percentage).toBe(0.0);
      expect(Number.isNaN(statsCancelledOnly.percentage)).toBe(false);
    });

    it('rounds percentage to two decimal places cleanly', () => {
      // 1 out of 3 = 33.33%
      const stats = calculateAttendanceStats(1, 2, 0);
      expect(stats.percentage).toBe(33.33);

      // 2 out of 3 = 66.67%
      const stats2 = calculateAttendanceStats(2, 1, 0);
      expect(stats2.percentage).toBe(66.67);
    });
  });

  describe('Attendance Shortage and Consecutive Classes Calculation', () => {
    it('correctly calculates consecutive classes needed to reach 75% target', () => {
      // Attended: 16, Conducted: 24 (66.67% attendance)
      // Target: 75% (T = 0.75)
      // Formula: ceil((0.75 * 24 - 16) / (1 - 0.75)) = ceil((18 - 16) / 0.25) = ceil(2 / 0.25) = 8
      const analysis = analyzeAttendanceShortage(16, 24, 75);

      expect(analysis.isShortage).toBe(true);
      expect(analysis.classesNeeded).toBe(8);
      expect(analysis.isTargetAchievable).toBe(true);

      // Verify that after 8 consecutive classes, attendance is >= 75%:
      // (16 + 8) / (24 + 8) = 24 / 32 = 75.0%
      const verified = (16 + analysis.classesNeeded) / (24 + analysis.classesNeeded) * 100;
      expect(verified).toBeGreaterThanOrEqual(75.0);

      // Verify that 7 classes would be strictly below 75%:
      const under = (16 + 7) / (24 + 7) * 100;
      expect(under).toBeLessThan(75.0);
    });

    it('correctly identifies when attendance already meets target and consecutive needed is 0', () => {
      // Attended: 18, Conducted: 24 (75% attendance), Target: 75%
      const analysis = analyzeAttendanceShortage(18, 24, 75);
      expect(analysis.isShortage).toBe(false);
      expect(analysis.classesNeeded).toBe(0);
    });

    it('handles impossible 100% target when at least one class is already missed', () => {
      // Attended: 19, Conducted: 20 (95% attendance), Target: 100%
      const analysis = analyzeAttendanceShortage(19, 20, 100);
      expect(analysis.isShortage).toBe(true);
      expect(analysis.isTargetAchievable).toBe(false);
      expect(analysis.classesNeeded).toBe(Infinity);
      expect(analysis.statusMessage).toContain('impossible');
    });

    it('handles 100% target when zero classes have been missed', () => {
      // Attended: 15, Conducted: 15 (100% attendance), Target: 100%
      const analysis = analyzeAttendanceShortage(15, 15, 100);
      expect(analysis.isShortage).toBe(false);
      expect(analysis.classesNeeded).toBe(0);
      expect(analysis.isTargetAchievable).toBe(true);
    });
  });

  describe('Safe Margin (Classes Allowed to Miss)', () => {
    it('correctly calculates how many classes a student can miss while remaining above target', () => {
      // Attended: 20, Conducted: 24 (83.33% attendance)
      // Target: 75%
      // Safe margin y: floor((20 - 0.75 * 24) / 0.75) = floor((20 - 18) / 0.75) = floor(2.666) = 2
      const analysis = analyzeAttendanceShortage(20, 24, 75);

      expect(analysis.isShortage).toBe(false);
      expect(analysis.safeMargin).toBe(2);

      // Verification: missing 2 classes: 20 / 26 = 76.92% (>= 75%)
      expect((20 / (24 + 2)) * 100).toBeGreaterThanOrEqual(75.0);

      // Verification: missing 3 classes: 20 / 27 = 74.07% (< 75%)
      expect((20 / (24 + 3)) * 100).toBeLessThan(75.0);
    });

    it('returns safe margin of 0 when student is exactly on the target threshold boundary', () => {
      // Attended: 18, Conducted: 24 (75.0% attendance), Target: 75%
      const analysis = analyzeAttendanceShortage(18, 24, 75);
      expect(analysis.safeMargin).toBe(0);
      expect(analysis.statusMessage).toContain('Missing the next class will put you below target');
    });
  });

  describe('Projected Attendance Calculator', () => {
    it('projects future attendance when attending all future classes', () => {
      // Current: 15/20 (75%). Upcoming: 10. Attending all 10: 25/30 = 83.33%
      const projection = projectAttendance(15, 20, 10, 10, 75);
      expect(projection.resultingAttended).toBe(25);
      expect(projection.resultingConducted).toBe(30);
      expect(projection.resultingPercentage).toBe(83.33);
      expect(projection.meetsTarget).toBe(true);
    });

    it('projects future attendance when missing all future classes', () => {
      // Current: 15/20 (75%). Upcoming: 10. Attending 0: 15/30 = 50.0%
      const projection = projectAttendance(15, 20, 10, 0, 75);
      expect(projection.resultingAttended).toBe(15);
      expect(projection.resultingConducted).toBe(30);
      expect(projection.resultingPercentage).toBe(50.0);
      expect(projection.meetsTarget).toBe(false);
    });

    it('projects future attendance when attending partial future classes', () => {
      // Current: 10/20 (50%). Upcoming: 10. Attending 5: 15/30 = 50.0%
      const projection = projectAttendance(10, 20, 10, 5, 75);
      expect(projection.resultingPercentage).toBe(50.0);
      expect(projection.meetsTarget).toBe(false);
    });
  });
});
