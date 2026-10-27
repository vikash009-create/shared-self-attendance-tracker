// client/src/pages/CalculatorPage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Subject, ProjectionResult } from '../types';
import {
  Calculator,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

export const CalculatorPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('overall');
  const [futureClasses, setFutureClasses] = useState(10);
  const [classesToAttend, setClassesToAttend] = useState(8);
  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setInitLoading(true);
        const res = await api.getSubjects();
        setSubjects(res.subjects);
      } catch (err) {
        console.error('Failed to load subjects for calculator:', err);
      } finally {
        setInitLoading(false);
      }
    }
    loadData();
  }, []);

  const runCalculation = async () => {
    try {
      setLoading(true);
      const res = await api.calculateProjection({
        subjectId: selectedSubjectId === 'overall' ? undefined : selectedSubjectId,
        futureClasses: Number(futureClasses),
        classesToAttend: Number(classesToAttend)
      });
      setResult(res);
    } catch (err) {
      console.error('Failed to compute projection:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initLoading) {
      runCalculation();
    }
  }, [selectedSubjectId, futureClasses, classesToAttend, initLoading]);

  const handleFutureChange = (val: number) => {
    const nextVal = Math.max(1, Math.min(100, val));
    setFutureClasses(nextVal);
    if (classesToAttend > nextVal) {
      setClassesToAttend(nextVal);
    }
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-slate-500 text-sm">Preparing calculator...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Calculator className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Projected Attendance Calculator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Forecast your future attendance percentage under different attendance scenarios.
        </p>
      </div>

      {/* Simulator Control Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Target Scope */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Select Scope / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overall">Overall Attendance (All Subjects)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name} (Target: {s.target_percentage}%)
                </option>
              ))}
            </select>
          </div>

          {/* Planned Future Classes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Planned Future Classes
              </label>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {futureClasses} classes
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={futureClasses}
              onChange={e => handleFutureChange(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Classes to Attend Slider */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Classes You Plan to Attend (out of {futureClasses})
            </label>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
              {classesToAttend} / {futureClasses} classes
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={futureClasses}
            value={classesToAttend}
            onChange={e => setClassesToAttend(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
            <span>0 (Miss all)</span>
            <span>{Math.round(futureClasses / 2)} (Half)</span>
            <span>{futureClasses} (Attend all)</span>
          </div>
        </div>
      </div>

      {/* Projection Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Main 3 Scenario Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Scenario 1: Attend All */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                Best Case: Attend All {futureClasses}
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white my-1">
                {result.scenarios.attendAll.resultingPercentage}%
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                result.scenarios.attendAll.meetsTarget
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}>
                {result.scenarios.attendAll.meetsTarget ? 'Meets Target' : 'Below Target'}
              </span>
            </div>

            {/* Scenario 2: Custom Selection */}
            <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 shadow-md text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block mb-1">
                Custom: Attend {classesToAttend} of {futureClasses}
              </span>
              <div className="text-4xl font-black text-blue-700 dark:text-blue-300 my-1">
                {result.projection.resultingPercentage}%
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                result.projection.meetsTarget
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {result.projection.meetsTarget ? 'Meets Target Target' : 'Below Target Target'}
              </span>
            </div>

            {/* Scenario 3: Attend None */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block mb-1">
                Worst Case: Miss All {futureClasses}
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white my-1">
                {result.scenarios.attendNone.resultingPercentage}%
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                result.scenarios.attendNone.meetsTarget
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}>
                {result.scenarios.attendNone.meetsTarget ? 'Meets Target' : 'Below Target'}
              </span>
            </div>
          </div>

          {/* Mathematical Explanation Card */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-800 shadow-lg space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              Calculation Breakdown & Formula Transparency
            </h3>
            <div className="text-xs sm:text-sm text-slate-300 space-y-2">
              <p>
                <span className="font-semibold text-white">Current Base:</span> Attended{' '}
                <span className="text-emerald-400 font-mono">{result.current.attended}</span> classes out of{' '}
                <span className="text-blue-400 font-mono">{result.current.conducted}</span> conducted classes ({result.current.percentage}%).
              </p>
              <p>
                <span className="font-semibold text-white">Projection Formula:</span>
                <code className="mx-2 px-2 py-1 rounded bg-slate-800 text-blue-300 font-mono text-xs">
                  (Current Attended + Future Attended) / (Current Conducted + Total Future) × 100
                </code>
              </p>
              <p>
                <span className="font-semibold text-white">Step-by-Step:</span>
                <span className="font-mono text-xs block mt-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-700 text-emerald-300">
                  ({result.current.attended} + {result.projection.futureClassesToAttend}) / ({result.current.conducted} + {result.projection.totalFutureClasses}) × 100
                  = {result.projection.resultingAttended} / {result.projection.resultingConducted} × 100
                  = {result.projection.resultingPercentage}%
                </span>
              </p>
            </div>
          </div>

          {/* Trajectory Curve Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Trajectory Matrix ({result.subjectName} — Target: {result.targetPercentage}%)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Classes Attended</th>
                    <th className="py-2.5 px-3">Classes Missed</th>
                    <th className="py-2.5 px-3">Projected %</th>
                    <th className="py-2.5 px-3">Target Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {result.curveTable.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.classesAttended === classesToAttend ? 'bg-blue-50/70 dark:bg-blue-950/40 font-bold' : ''}
                    >
                      <td className="py-2.5 px-3">{row.classesAttended} of {futureClasses}</td>
                      <td className="py-2.5 px-3">{row.classesMissed}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{row.resultingPercentage}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          row.meetsTarget
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {row.meetsTarget ? '✓ Pass' : '✗ Shortage'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
