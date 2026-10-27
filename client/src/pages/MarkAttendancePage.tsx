// client/src/pages/MarkAttendancePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Subject } from '../types';
import {
  CheckCircle2,
  XCircle,
  Slash,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  AlertCircle,
  Check,
  RefreshCw
} from 'lucide-react';

const TIME_SLOTS = [
  '09:00 - 10:00 AM',
  '10:00 - 11:00 AM',
  '11:15 - 12:15 PM',
  '12:15 - 01:15 PM',
  '02:00 - 03:00 PM',
  '03:00 - 04:00 PM',
  '04:00 - 05:00 PM'
];

export const MarkAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [status, setStatus] = useState<'attended' | 'absent' | 'cancelled'>('attended');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoading(true);
        const res = await api.getSubjects();
        setSubjects(res.subjects);
        if (res.subjects.length > 0) {
          setSubjectId(res.subjects[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load subjects.');
      } finally {
        setLoading(false);
      }
    }
    loadSubjects();
  }, []);

  const selectedSubject = subjects.find(s => s.id === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.markAttendance({
        subjectId,
        date,
        timeSlot,
        status,
        notes: notes.trim()
      });

      setSuccessMsg(`Attendance marked as ${status.toUpperCase()} for ${selectedSubject?.code}!`);
      setNotes('');

      // Auto redirect after short delay or let user keep recording
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-slate-500 text-sm">Loading course list...</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Subjects Enrolled</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          You need to add at least one subject before recording attendance.
        </p>
        <Link
          to="/subjects"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm inline-block"
        >
          Add Subjects First
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Mark Attendance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Record class status for individual sessions with collision prevention.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Select Course / Subject *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {subjects.map(s => {
                const isSelected = s.id === subjectId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubjectId(s.id)}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || '#3B82F6' }}
                    />
                    <div className="overflow-hidden">
                      <div className="font-bold text-sm truncate">{s.code}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Class Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Time Slot *
              </label>
              <select
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
              >
                {TIME_SLOTS.map(slot => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Selector Pills */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Class Attendance Status *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStatus('attended')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border font-bold text-sm transition-all ${
                  status === 'attended'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <CheckCircle2 className="w-6 h-6 mb-1 text-emerald-600 dark:text-emerald-400" />
                Attended
              </button>

              <button
                type="button"
                onClick={() => setStatus('absent')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border font-bold text-sm transition-all ${
                  status === 'absent'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-2 ring-red-500/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <XCircle className="w-6 h-6 mb-1 text-red-600 dark:text-red-400" />
                Absent
              </button>

              <button
                type="button"
                onClick={() => setStatus('cancelled')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border font-bold text-sm transition-all ${
                  status === 'cancelled'
                    ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white ring-2 ring-slate-400/30 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Slash className="w-6 h-6 mb-1 text-slate-500 dark:text-slate-400" />
                Cancelled
              </button>
            </div>
            {status === 'cancelled' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                Notice: Cancelled classes do not count towards total conducted classes and do not reduce your attendance percentage.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Notes / Topics Covered (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Chapter 4: Memory Management, Surprise Quiz"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm"
              maxLength={250}
            />
          </div>

          {/* Submit & Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4">
            <Link
              to="/history"
              className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              View Attendance Log
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Done
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Recording...' : 'Record Class'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
