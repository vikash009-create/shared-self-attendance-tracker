// client/src/pages/SubjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Subject } from '../types';
import { SubjectModal } from '../components/SubjectModal';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSubjects();
      setSubjects(res.subjects);
    } catch (err: any) {
      setError(err.message || 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editingSubject) {
      await api.updateSubject(editingSubject.id, data);
    } else {
      await api.createSubject(data);
    }
    await fetchSubjects();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? All associated attendance logs will be permanently deleted.`)) {
      try {
        await api.deleteSubject(id);
        await fetchSubjects();
      } catch (err: any) {
        alert(err.message || 'Failed to delete subject.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Subjects & Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your enrolled subjects and set custom attendance requirements.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center max-w-lg mx-auto shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Subjects Enrolled Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
            Add your semester subjects to start tracking lecture attendance.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
          >
            + Add First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map(s => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: s.color || '#3B82F6' }}
                    />
                    <span className="font-extrabold text-lg text-slate-900 dark:text-white">
                      {s.code}
                    </span>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    Target: {s.target_percentage}%
                  </span>
                </div>

                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">
                  {s.name}
                </h3>
                {s.teacher_name ? (
                  <p className="text-xs text-slate-400 mt-0.5">Instructor: {s.teacher_name}</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5 italic">No instructor specified</p>
                )}

                {s.stats && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Current Attendance:</span>
                      <span className={`font-bold ${
                        s.stats.conducted === 0
                          ? 'text-slate-400'
                          : s.stats.percentage >= s.target_percentage
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {s.stats.conducted === 0 ? '0%' : `${s.stats.percentage}%`}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Attended / Conducted:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {s.stats.attended} / {s.stats.conducted} classes
                      </span>
                    </div>

                    {s.shortage && s.stats.conducted > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 font-medium">
                        {s.shortage.isShortage ? (
                          <span className="text-red-600 dark:text-red-400">
                            Shortage: Needs {s.shortage.classesNeeded} consecutive class{s.shortage.classesNeeded === 1 ? '' : 'es'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Safe: Can miss {s.shortage.safeMargin} class{s.shortage.safeMargin === 1 ? '' : 'es'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Edit Subject"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  title="Delete Subject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        subjectToEdit={editingSubject}
        defaultTarget={user?.default_target_percentage || 75}
      />
    </div>
  );
};
