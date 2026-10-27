// client/src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardData, Subject } from '../types';
import { QuickMarkModal } from '../components/QuickMarkModal';
import { SubjectModal } from '../components/SubjectModal';
import {
  CheckCircle2,
  XCircle,
  Slash,
  AlertTriangle,
  Plus,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [quickMarkOpen, setQuickMarkOpen] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | undefined>();
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboard = await api.getDashboard();
      setData(dashboard);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleMarkSuccess = async (markData: any) => {
    await api.markAttendance(markData);
    await fetchDashboard();
  };

  const handleCreateSubject = async (subjData: any) => {
    await api.createSubject(subjData);
    await fetchDashboard();
  };

  const openQuickMark = (subjId?: string) => {
    setActiveSubjectId(subjId);
    setQuickMarkOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Computing attendance metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Dashboard</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { overall, subjects, shortageAlerts, recentRecords, chartBarData, chartPieData } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time calculations based on your self-recorded lectures.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSubjectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
          {subjects.length > 0 && (
            <button
              onClick={() => openQuickMark()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              Mark Class
            </button>
          )}
        </div>
      </div>

      {/* Shortage Alert Banner (if any subjects or overall below threshold) */}
      {shortageAlerts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Attendance Shortage Detected in {shortageAlerts.length} Subject{shortageAlerts.length === 1 ? '' : 's'}!
              </h3>
              <div className="mt-2 space-y-1.5 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                {shortageAlerts.map(s => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-800/40 pb-1.5 last:border-0 last:pb-0">
                    <div>
                      <span className="font-semibold">{s.code} ({s.name}): </span>
                      <span>Currently {s.stats.percentage}% (Target: {s.target_percentage}%)</span>
                    </div>
                    <span className="font-medium bg-amber-200/70 dark:bg-amber-900/60 px-2 py-0.5 rounded-md text-xs">
                      {s.shortage.isTargetAchievable
                        ? `Attend next ${s.shortage.classesNeeded} consecutive class${s.shortage.classesNeeded === 1 ? '' : 'es'}`
                        : '100% Target Unattainable'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when zero subjects exist */}
      {subjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            No Subjects Added Yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-6">
            Add the courses you are enrolled in (e.g. Operating Systems, Mathematics, DBMS) with their required attendance target to begin tracking.
          </p>
          <button
            onClick={() => setSubjectModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            Add Your First Subject
          </button>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Overall Percentage Card */}
            <div className="col-span-2 sm:col-span-1 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <span>Overall Attendance</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                  overall.stats.percentage >= overall.defaultTarget
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                }`}>
                  Target: {overall.defaultTarget}%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                  overall.stats.conducted === 0
                    ? 'text-slate-400'
                    : overall.stats.percentage >= overall.defaultTarget
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {overall.stats.conducted === 0 ? '0%' : `${overall.stats.percentage}%`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {overall.shortage.statusMessage}
              </p>
            </div>

            {/* Total Classes Conducted */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <span>Conducted</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {overall.stats.conducted}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Attended ({overall.stats.attended}) + Absent ({overall.stats.absent})
              </p>
            </div>

            {/* Total Classes Attended */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                <span>Attended</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {overall.stats.attended}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Classes present in person
              </p>
            </div>

            {/* Total Classes Missed & Cancelled */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
                <span>Absent / Cancelled</span>
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                  {overall.stats.absent}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  + {overall.stats.cancelled} cancelled
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Cancelled excluded from conducted
              </p>
            </div>
          </div>

          {/* Visual Charts Section (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Subject Comparison Bar Chart */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Subject-Wise Attendance vs Target
                </h3>
                <span className="text-xs text-slate-400">Target Line: {overall.defaultTarget}%</span>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-lg space-y-1">
                              <p className="font-bold">{d.fullName} ({d.name})</p>
                              <p>Attendance: <span className="font-semibold text-blue-400">{d.attendance}%</span></p>
                              <p>Attended: {d.attended} / {d.conducted} conducted</p>
                              <p>Target: {d.target}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={overall.defaultTarget} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Target', fill: '#EF4444', fontSize: 10 }} />
                    <Bar dataKey="attendance" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Status Distribution Pie Chart */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                  Overall Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Breakdown across recorded sessions
                </p>
              </div>

              {chartPieData.length > 0 ? (
                <div className="h-56 w-full my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartPieData}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="my-auto py-12 text-center text-xs text-slate-400">
                  No attendance logged yet.
                </div>
              )}

              <div className="flex items-center justify-around border-t border-slate-100 dark:border-slate-700/60 pt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">Attended</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-600 dark:text-slate-400">Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-slate-600 dark:text-slate-400">Cancelled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Summaries Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Course Summaries & Action Items
              </h2>
              <Link
                to="/subjects"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Manage All Subjects <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjects.map(s => {
                const isShortage = s.shortage.isShortage;
                return (
                  <div
                    key={s.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Header with color dot & target badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: s.color || '#3B82F6' }}
                          />
                          <span className="font-bold text-base text-slate-900 dark:text-white">
                            {s.code}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          s.stats.conducted === 0
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            : isShortage
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {s.stats.percentage}%
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">
                        {s.name}
                      </h4>
                      {s.teacher_name && (
                        <p className="text-xs text-slate-400 mt-0.5">Prof. {s.teacher_name}</p>
                      )}

                      {/* Conducted breakdown */}
                      <div className="mt-4 grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-center text-xs">
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Attended</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {s.stats.attended}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Absent</div>
                          <div className="font-bold text-red-600 dark:text-red-400 mt-0.5">
                            {s.stats.absent}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-bold">Total</div>
                          <div className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                            {s.stats.conducted}
                          </div>
                        </div>
                      </div>

                      {/* Status Advice */}
                      <div className="mt-3 text-xs">
                        {s.stats.conducted === 0 ? (
                          <span className="text-slate-400">No classes conducted yet.</span>
                        ) : isShortage ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            ⚠️ Attend next {s.shortage.classesNeeded} consecutive class{s.shortage.classesNeeded === 1 ? '' : 'es'} to reach {s.target_percentage}%.
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Can safely miss {s.shortage.safeMargin} class{s.shortage.safeMargin === 1 ? '' : 'es'} above {s.target_percentage}%.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Mark button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <Link
                        to={`/history?subjectId=${s.id}`}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                      >
                        View Logs
                      </Link>
                      <button
                        onClick={() => openQuickMark(s.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                      >
                        + Mark Class
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Log */}
          {recentRecords.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Recent Attendance Logs
                </h3>
                <Link
                  to="/history"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View Full History <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentRecords.map(r => (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full`}
                        style={{ backgroundColor: r.subject_color || '#3B82F6' }}
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.subject_code} — {r.subject_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {r.date} &bull; {r.time_slot} {r.notes && `&bull; "${r.notes}"`}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      r.status === 'attended'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : r.status === 'absent'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <QuickMarkModal
        isOpen={quickMarkOpen}
        onClose={() => setQuickMarkOpen(false)}
        subjects={subjects}
        initialSubjectId={activeSubjectId}
        onMark={handleMarkSuccess}
        onSuccess={fetchDashboard}
      />

      <SubjectModal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSubmit={handleCreateSubject}
        defaultTarget={overall.defaultTarget}
      />
    </div>
  );
};
