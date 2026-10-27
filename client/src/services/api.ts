// client/src/services/api.ts
import {
  User,
  Subject,
  AttendanceRecord,
  AttendanceStats,
  ClassGroup,
  GroupMember,
  GroupSharedSession,
  DashboardData,
  ProjectionResult
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('attendance_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async register(body: { name: string; email: string; password: string; defaultTargetPercentage?: number }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ user: User; token: string; message: string }>(res);
  },

  async login(body: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ user: User; token: string; message: string }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ user: User }>(res);
  },

  async updateProfile(body: { name: string; defaultTargetPercentage: number }) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ user: User; token: string; message: string }>(res);
  },

  async changePassword(body: { currentPassword: string; newPassword: string }) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ message: string }>(res);
  },

  // Subjects
  async getSubjects() {
    const res = await fetch(`${API_BASE}/subjects`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ subjects: Subject[] }>(res);
  },

  async createSubject(body: { name: string; code: string; targetPercentage?: number; teacherName?: string; color?: string }) {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ subject: Subject; message: string }>(res);
  },

  async updateSubject(id: string, body: { name: string; code: string; targetPercentage?: number; teacherName?: string; color?: string }) {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ subject: Subject; message: string }>(res);
  },

  async deleteSubject(id: string) {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  // Attendance
  async getAttendance(params?: { subjectId?: string; startDate?: string; endDate?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`${API_BASE}/attendance?${query.toString()}`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ records: AttendanceRecord[]; summary: AttendanceStats }>(res);
  },

  async markAttendance(body: { subjectId: string; date: string; timeSlot: string; status: 'attended' | 'absent' | 'cancelled'; notes?: string; sharedSessionId?: string | null }) {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ record: AttendanceRecord; message: string }>(res);
  },

  async updateAttendance(id: string, body: { subjectId: string; date: string; timeSlot: string; status: 'attended' | 'absent' | 'cancelled'; notes?: string }) {
    const res = await fetch(`${API_BASE}/attendance/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ record: AttendanceRecord; message: string }>(res);
  },

  async deleteAttendance(id: string) {
    const res = await fetch(`${API_BASE}/attendance/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  getExportCsvUrl(subjectId?: string): string {
    const token = localStorage.getItem('attendance_token');
    const param = subjectId && subjectId !== 'all' ? `?subjectId=${subjectId}` : '';
    return `${API_BASE}/attendance/export/csv${param}`;
  },

  async downloadCsv(subjectId?: string) {
    const url = this.getExportCsvUrl(subjectId);
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to download CSV export');
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Groups
  async getGroups() {
    const res = await fetch(`${API_BASE}/groups`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ groups: ClassGroup[] }>(res);
  },

  async createGroup(body: { name: string; description?: string }) {
    const res = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ group: ClassGroup; message: string }>(res);
  },

  async joinGroup(body: { inviteCode: string }) {
    const res = await fetch(`${API_BASE}/groups/join`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ group: ClassGroup; message: string }>(res);
  },

  async getGroupDetails(id: string) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ group: ClassGroup; members: GroupMember[]; sharedSessions: GroupSharedSession[] }>(res);
  },

  async broadcastSession(groupId: string, body: { subjectName: string; subjectCode: string; date: string; timeSlot: string; sessionStatus: 'conducted' | 'cancelled'; notes?: string }) {
    const res = await fetch(`${API_BASE}/groups/${groupId}/sessions`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ session: GroupSharedSession; message: string }>(res);
  },

  async syncSharedSession(sessionId: string, body: { status: 'attended' | 'absent' | 'cancelled'; targetSubjectId?: string }) {
    const res = await fetch(`${API_BASE}/groups/sessions/${sessionId}/sync`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<{ message: string }>(res);
  },

  async deleteGroup(id: string) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  async deleteSharedSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/groups/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  // Dashboard & Calculator
  async getDashboard() {
    const res = await fetch(`${API_BASE}/stats/dashboard`, {
      headers: getAuthHeader()
    });
    return handleResponse<DashboardData>(res);
  },

  async calculateProjection(body: { subjectId?: string; futureClasses: number; classesToAttend: number }) {
    const res = await fetch(`${API_BASE}/stats/project`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse<ProjectionResult>(res);
  }
};
