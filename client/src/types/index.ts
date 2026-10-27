// client/src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  default_target_percentage: number;
}

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

export interface Subject {
  id: string;
  name: string;
  code: string;
  target_percentage: number;
  teacher_name?: string;
  color?: string;
  created_at?: string;
  stats?: AttendanceStats;
  shortage?: ShortageAnalysis;
}

export interface AttendanceRecord {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  subject_color?: string;
  date: string;
  time_slot: string;
  status: 'attended' | 'absent' | 'cancelled';
  notes?: string;
  shared_session_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  creator_id: string;
  created_at: string;
  my_role: 'admin' | 'member';
  member_count: number;
  session_count: number;
}

export interface GroupMember {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupSharedSession {
  id: string;
  group_id: string;
  creator_id: string;
  creator_name: string;
  subject_name: string;
  subject_code: string;
  date: string;
  time_slot: string;
  session_status: 'conducted' | 'cancelled';
  notes: string;
  created_at: string;
  synced_by_me: boolean;
  my_personal_status: string | null;
}

export interface DashboardData {
  overall: {
    stats: AttendanceStats;
    shortage: ShortageAnalysis;
    defaultTarget: number;
  };
  subjects: Array<Subject & { stats: AttendanceStats; shortage: ShortageAnalysis }>;
  shortageAlerts: Array<Subject & { stats: AttendanceStats; shortage: ShortageAnalysis }>;
  recentRecords: AttendanceRecord[];
  chartBarData: Array<{
    name: string;
    fullName: string;
    attendance: number;
    target: number;
    attended: number;
    conducted: number;
    isShortage: boolean;
  }>;
  chartPieData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface ProjectionResult {
  subjectName: string;
  targetPercentage: number;
  current: {
    attended: number;
    conducted: number;
    percentage: number;
  };
  projection: {
    futureClassesToAttend: number;
    totalFutureClasses: number;
    resultingAttended: number;
    resultingConducted: number;
    resultingPercentage: number;
    meetsTarget: boolean;
  };
  scenarios: {
    attendAll: {
      resultingPercentage: number;
      meetsTarget: boolean;
    };
    attendNone: {
      resultingPercentage: number;
      meetsTarget: boolean;
    };
    custom: {
      resultingPercentage: number;
      meetsTarget: boolean;
    };
  };
  curveTable: Array<{
    classesAttended: number;
    classesMissed: number;
    resultingPercentage: number;
    meetsTarget: boolean;
  }>;
}
