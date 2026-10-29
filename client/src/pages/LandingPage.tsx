// client/src/pages/LandingPage.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Users,
  Download,
  ShieldCheck,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    try {
      await login('alex.student@university.edu', 'Student@123');
      navigate('/dashboard');
    } catch {
      try {
        await login('demo.student@university.edu', 'demo1234');
        navigate('/dashboard');
      } catch {
        // If neither exists, redirect to login page
        navigate('/login');
      }
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-semibold mb-6">
          <CheckCircle2 className="w-4 h-4" />
          Unofficial Student Attendance & Shortage Management
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Track Your Attendance <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Before Official Lists Drop.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Take control of your academic standing. Record lectures, detect shortages early, calculate exact classes needed to reach 75%, and optionally sync timetable updates with classmates.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-0.5"
            >
              Go to Your Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-0.5"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Log In
              </Link>
              <button
                onClick={handleDemoLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3.5 rounded-xl font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline text-sm transition"
              >
                Quick Demo Login
              </button>
            </>
          )}
        </div>

        {/* Disclaimer Notice Box */}
        <div className="mt-10 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-left text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Academic Transparency Notice:</span> This application is an independent personal self-tracking utility. All percentage figures, shortage estimates, and margins calculated are unofficial estimates and do not substitute for official college or university records.
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Designed for Real Student Life
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Everything you need to avoid exam debarment and stay above your required threshold.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Exact Mathematical Precision
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Formula strictly uses <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Attended / (Attended + Absent)</code>. Cancelled sessions are strictly excluded from conducted classes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Shortage Alerts & Safe Margin
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Know immediately how many consecutive classes you must attend to recover from a shortage, or how many you can safely miss while staying above 75%.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Shared Class Groups
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Class representatives or peers can broadcast class sessions and cancellations with a unique invite code. Members sync updates to their records in 1-click.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              What-If Projection Simulator
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Simulate upcoming semesters and planned leaves. See the exact percentage trajectory if you attend all, some, or none of future sessions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              RFC-4180 CSV Data Export
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Export your attendance records, timestamps, dates, and remarks to standard CSV files compatible with Excel, Google Sheets, or institutional review.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Strict Privacy & Isolation
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Password-protected accounts with individual database tenant isolation. Classmates cannot alter your private records even when collaborating in groups.
            </p>
          </div>
        </div>
      </section>

      {/* Verified Calculation Proof Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-800 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">
                Formula Verification
              </span>
              <h3 className="text-2xl font-bold mt-1">
                Verified Calculation Accuracy
              </h3>
              <p className="text-sm text-slate-300 mt-2 max-w-xl">
                Example: 18 classes attended + 6 absent + 2 cancelled = 24 conducted classes. <br />
                <span className="text-emerald-400 font-mono font-semibold">18 / 24 × 100 = 75.0%</span>.
                Cancelled classes are excluded, and shortage algorithms compute consecutive recovery classes without error.
              </p>
            </div>
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm whitespace-nowrap shadow-md shadow-blue-600/30 transition"
            >
              Start Tracking Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
