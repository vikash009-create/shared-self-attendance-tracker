// server/src/routes/stats.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { calculateAttendanceStats, analyzeAttendanceShortage, projectAttendance } from '../utils/calculator';

const router = Router();
router.use(requireAuth);

const projectSchema = z.object({
  subjectId: z.string().optional(),
  futureClasses: z.number().int().min(1).max(200),
  classesToAttend: z.number().int().min(0).max(200)
});

// GET /api/stats/dashboard - Comprehensive dashboard metrics
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const defaultTarget = req.user!.default_target_percentage || 75;

    // Overall attendance counts
    const overallCounts = db.get<{
      attended: number;
      absent: number;
      cancelled: number;
    }>(
      `SELECT
         SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) AS attended,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
       FROM attendance_records
       WHERE user_id = ?`,
      [userId]
    ) || { attended: 0, absent: 0, cancelled: 0 };

    const overallStats = calculateAttendanceStats(
      overallCounts.attended || 0,
      overallCounts.absent || 0,
      overallCounts.cancelled || 0
    );

    const overallShortage = analyzeAttendanceShortage(
      overallStats.attended,
      overallStats.conducted,
      defaultTarget
    );

    // Subject breakdown with shortage checks
    const subjects = db.query<{
      id: string;
      name: string;
      code: string;
      target_percentage: number;
      color: string;
      teacher_name: string;
    }>(
      `SELECT id, name, code, target_percentage, color, teacher_name
       FROM subjects
       WHERE user_id = ?
       ORDER BY name ASC`,
      [userId]
    );

    const subjectStatsList = subjects.map(s => {
      const counts = db.get<{
        attended: number;
        absent: number;
        cancelled: number;
      }>(
        `SELECT
           SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) AS attended,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
         FROM attendance_records
         WHERE user_id = ? AND subject_id = ?`,
        [userId, s.id]
      ) || { attended: 0, absent: 0, cancelled: 0 };

      const stats = calculateAttendanceStats(counts.attended || 0, counts.absent || 0, counts.cancelled || 0);
      const target = s.target_percentage || defaultTarget;
      const shortage = analyzeAttendanceShortage(stats.attended, stats.conducted, target);

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        target_percentage: target,
        color: s.color,
        teacher_name: s.teacher_name,
        stats,
        shortage
      };
    });

    // Shortage alerts: subjects with attendance strictly below target
    const shortageAlerts = subjectStatsList.filter(
      s => s.stats.conducted > 0 && s.shortage.isShortage
    );

    // Recent 5 attendance records
    const recentRecords = db.query(
      `SELECT ar.id, ar.date, ar.time_slot, ar.status, ar.notes,
              s.name AS subject_name, s.code AS subject_code, s.color AS subject_color
       FROM attendance_records ar
       JOIN subjects s ON ar.subject_id = s.id
       WHERE ar.user_id = ?
       ORDER BY ar.date DESC, ar.time_slot DESC, ar.created_at DESC
       LIMIT 5`,
      [userId]
    );

    // Recharts-ready Bar Chart data
    const chartBarData = subjectStatsList.map(s => ({
      name: s.code,
      fullName: s.name,
      attendance: s.stats.percentage,
      target: s.target_percentage,
      attended: s.stats.attended,
      conducted: s.stats.conducted,
      isShortage: s.shortage.isShortage
    }));

    // Recharts-ready Pie Chart data
    const chartPieData = [
      { name: 'Attended', value: overallStats.attended, color: '#10B981' },
      { name: 'Absent', value: overallStats.absent, color: '#EF4444' },
      { name: 'Cancelled', value: overallStats.cancelled, color: '#6B7280' }
    ].filter(item => item.value > 0);

    res.json({
      overall: {
        stats: overallStats,
        shortage: overallShortage,
        defaultTarget
      },
      subjects: subjectStatsList,
      shortageAlerts,
      recentRecords,
      chartBarData,
      chartPieData
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics.' });
  }
});

// POST /api/stats/project - Projected attendance calculator
router.post('/project', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = projectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const { subjectId, futureClasses, classesToAttend } = parseResult.data;

    if (classesToAttend > futureClasses) {
      res.status(400).json({ error: 'Classes to attend cannot exceed total upcoming classes.' });
      return;
    }

    let attended = 0;
    let absent = 0;
    let target = req.user!.default_target_percentage || 75;
    let subjectName = 'Overall Attendance';

    if (subjectId && subjectId !== 'overall') {
      const subject = db.get<{ name: string; code: string; target_percentage: number }>(
        'SELECT name, code, target_percentage FROM subjects WHERE id = ? AND user_id = ?',
        [subjectId, userId]
      );

      if (!subject) {
        res.status(404).json({ error: 'Selected subject not found.' });
        return;
      }

      subjectName = `${subject.name} (${subject.code})`;
      target = subject.target_percentage || target;

      const counts = db.get<{ attended: number; absent: number }>(
        `SELECT
           SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) AS attended,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
         FROM attendance_records
         WHERE user_id = ? AND subject_id = ?`,
        [userId, subjectId]
      ) || { attended: 0, absent: 0 };

      attended = counts.attended || 0;
      absent = counts.absent || 0;
    } else {
      const counts = db.get<{ attended: number; absent: number }>(
        `SELECT
           SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) AS attended,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent
         FROM attendance_records
         WHERE user_id = ?`,
        [userId]
      ) || { attended: 0, absent: 0 };

      attended = counts.attended || 0;
      absent = counts.absent || 0;
    }

    const currentStats = calculateAttendanceStats(attended, absent);
    const selectedScenario = projectAttendance(
      attended,
      currentStats.conducted,
      futureClasses,
      classesToAttend,
      target
    );

    // Generate table of full curve: 0, 25%, 50%, 75%, 100% of upcoming classes
    const curveStep = Math.max(1, Math.round(futureClasses / 5));
    const comparisonPoints = new Set<number>([0, futureClasses, classesToAttend]);
    for (let c = 0; c <= futureClasses; c += curveStep) {
      comparisonPoints.add(c);
    }

    const curveTable = Array.from(comparisonPoints)
      .sort((a, b) => a - b)
      .map(k => {
        const proj = projectAttendance(attended, currentStats.conducted, futureClasses, k, target);
        return {
          classesAttended: k,
          classesMissed: futureClasses - k,
          resultingPercentage: proj.resultingPercentage,
          meetsTarget: proj.meetsTarget
        };
      });

    res.json({
      subjectName,
      targetPercentage: target,
      current: {
        attended,
        conducted: currentStats.conducted,
        percentage: currentStats.percentage
      },
      projection: selectedScenario,
      scenarios: {
        attendAll: projectAttendance(attended, currentStats.conducted, futureClasses, futureClasses, target),
        attendNone: projectAttendance(attended, currentStats.conducted, futureClasses, 0, target),
        custom: selectedScenario
      },
      curveTable
    });
  } catch (error: any) {
    console.error('Projection error:', error);
    res.status(500).json({ error: 'Failed to calculate projected attendance.' });
  }
});

export default router;
