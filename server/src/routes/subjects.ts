// server/src/routes/subjects.ts
import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { calculateAttendanceStats, analyzeAttendanceShortage } from '../utils/calculator';

const router = Router();
router.use(requireAuth);

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100),
  code: z.string().min(1, 'Subject code is required').max(20),
  targetPercentage: z.number().min(50).max(100).optional(),
  teacherName: z.string().max(100).optional().default(''),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color code').optional().default('#3B82F6')
});

// GET /api/subjects - List all subjects for current student with real-time stats
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const defaultTarget = req.user!.default_target_percentage;

    const subjects = db.query<{
      id: string;
      name: string;
      code: string;
      target_percentage: number;
      teacher_name: string;
      color: string;
      created_at: string;
    }>(
      `SELECT id, name, code, target_percentage, teacher_name, color, created_at
       FROM subjects
       WHERE user_id = ?
       ORDER BY name ASC`,
      [userId]
    );

    // Compute stats for each subject
    const subjectsWithStats = subjects.map(subj => {
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
        [userId, subj.id]
      ) || { attended: 0, absent: 0, cancelled: 0 };

      const stats = calculateAttendanceStats(counts.attended || 0, counts.absent || 0, counts.cancelled || 0);
      const target = subj.target_percentage || defaultTarget;
      const shortage = analyzeAttendanceShortage(stats.attended, stats.conducted, target);

      return {
        ...subj,
        target_percentage: target,
        stats,
        shortage
      };
    });

    res.json({ subjects: subjectsWithStats });
  } catch (error: any) {
    console.error('Fetch subjects error:', error);
    res.status(500).json({ error: 'Failed to retrieve subjects.' });
  }
});

// POST /api/subjects - Create a new subject
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = subjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const { name, code, targetPercentage, teacherName, color } = parseResult.data;
    const cleanCode = code.trim().toUpperCase();

    // Check duplicate code
    const existing = db.get(
      'SELECT id FROM subjects WHERE user_id = ? AND UPPER(code) = ?',
      [userId, cleanCode]
    );

    if (existing) {
      res.status(409).json({ error: `A subject with code '${cleanCode}' already exists in your account.` });
      return;
    }

    const subjectId = crypto.randomUUID();
    const finalTarget = targetPercentage || req.user!.default_target_percentage || 75;

    db.run(
      `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subjectId, userId, name.trim(), cleanCode, finalTarget, teacherName.trim(), color]
    );

    const created = db.get(
      'SELECT id, name, code, target_percentage, teacher_name, color, created_at FROM subjects WHERE id = ?',
      [subjectId]
    );

    res.status(201).json({
      subject: {
        ...created,
        stats: calculateAttendanceStats(0, 0, 0),
        shortage: analyzeAttendanceShortage(0, 0, finalTarget)
      },
      message: 'Subject added successfully.'
    });
  } catch (error: any) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject.' });
  }
});

// PUT /api/subjects/:id - Update subject
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = subjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const subjectId = req.params.id;
    const { name, code, targetPercentage, teacherName, color } = parseResult.data;
    const cleanCode = code.trim().toUpperCase();

    // Verify ownership
    const existing = db.get('SELECT id FROM subjects WHERE id = ? AND user_id = ?', [subjectId, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    // Check code uniqueness excluding this record
    const duplicate = db.get(
      'SELECT id FROM subjects WHERE user_id = ? AND UPPER(code) = ? AND id != ?',
      [userId, cleanCode, subjectId]
    );

    if (duplicate) {
      res.status(409).json({ error: `Another subject with code '${cleanCode}' already exists.` });
      return;
    }

    const finalTarget = targetPercentage || req.user!.default_target_percentage || 75;

    db.run(
      `UPDATE subjects
       SET name = ?, code = ?, target_percentage = ?, teacher_name = ?, color = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [name.trim(), cleanCode, finalTarget, teacherName.trim(), color, subjectId, userId]
    );

    const updated = db.get(
      'SELECT id, name, code, target_percentage, teacher_name, color, created_at FROM subjects WHERE id = ?',
      [subjectId]
    );

    res.json({ subject: updated, message: 'Subject updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update subject.' });
  }
});

// DELETE /api/subjects/:id - Delete subject and all its attendance records
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subjectId = req.params.id;

    const existing = db.get('SELECT id FROM subjects WHERE id = ? AND user_id = ?', [subjectId, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    db.run('DELETE FROM subjects WHERE id = ? AND user_id = ?', [subjectId, userId]);
    res.json({ message: 'Subject and associated attendance records deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete subject.' });
  }
});

export default router;
