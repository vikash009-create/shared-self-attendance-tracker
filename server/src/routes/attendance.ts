// server/src/routes/attendance.ts
import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { calculateAttendanceStats } from '../utils/calculator';

const router = Router();
router.use(requireAuth);

const recordSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  timeSlot: z.string().min(1, 'Time slot is required').max(50).default('09:00 - 10:00'),
  status: z.enum(['attended', 'absent', 'cancelled'], {
    errorMap: () => ({ message: "Status must be 'attended', 'absent', or 'cancelled'" })
  }),
  notes: z.string().max(500).optional().default(''),
  sharedSessionId: z.string().optional().nullable()
});

// GET /api/attendance - List attendance records with optional filtering
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subjectId, startDate, endDate, status, search } = req.query;

    let query = `
      SELECT 
        ar.id, 
        ar.subject_id, 
        s.name AS subject_name, 
        s.code AS subject_code, 
        s.color AS subject_color,
        ar.date, 
        ar.time_slot, 
        ar.status, 
        ar.notes, 
        ar.shared_session_id,
        ar.created_at,
        ar.updated_at
      FROM attendance_records ar
      JOIN subjects s ON ar.subject_id = s.id
      WHERE ar.user_id = ?
    `;

    const params: any[] = [userId];

    if (subjectId && typeof subjectId === 'string' && subjectId !== 'all') {
      query += ` AND ar.subject_id = ?`;
      params.push(subjectId);
    }

    if (startDate && typeof startDate === 'string') {
      query += ` AND ar.date >= ?`;
      params.push(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      query += ` AND ar.date <= ?`;
      params.push(endDate);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND ar.status = ?`;
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      query += ` AND (ar.notes LIKE ? OR s.name LIKE ? OR s.code LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY ar.date DESC, ar.time_slot DESC, ar.created_at DESC`;

    const records = db.query(query, params);

    // Compute summary stats for the current filter
    let attended = 0;
    let absent = 0;
    let cancelled = 0;

    for (const r of records) {
      if (r.status === 'attended') attended++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'cancelled') cancelled++;
    }

    const summary = calculateAttendanceStats(attended, absent, cancelled);

    res.json({ records, summary });
  } catch (error: any) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance records.' });
  }
});

// POST /api/attendance - Mark attendance
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = recordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const { subjectId, date, timeSlot, status, notes, sharedSessionId } = parseResult.data;

    // Verify subject ownership
    const subject = db.get('SELECT id, name, code FROM subjects WHERE id = ? AND user_id = ?', [subjectId, userId]);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found in your account.' });
      return;
    }

    // Check for duplicate entry on same date & time slot
    const existing = db.get(
      'SELECT id FROM attendance_records WHERE user_id = ? AND subject_id = ? AND date = ? AND time_slot = ?',
      [userId, subjectId, date, timeSlot]
    );

    if (existing) {
      res.status(409).json({
        error: `An attendance record for ${subject.code} on ${date} (${timeSlot}) already exists. Please edit the existing entry instead.`
      });
      return;
    }

    const recordId = crypto.randomUUID();

    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes, shared_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recordId, userId, subjectId, date, timeSlot, status, notes.trim(), sharedSessionId || null]
    );

    const created = db.get(
      `SELECT ar.id, ar.subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
              ar.date, ar.time_slot, ar.status, ar.notes, ar.shared_session_id, ar.created_at
       FROM attendance_records ar
       JOIN subjects s ON ar.subject_id = s.id
       WHERE ar.id = ?`,
      [recordId]
    );

    res.status(201).json({ record: created, message: 'Attendance recorded successfully.' });
  } catch (error: any) {
    console.error('Record attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance.' });
  }
});

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = recordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const recordId = req.params.id;
    const { subjectId, date, timeSlot, status, notes } = parseResult.data;

    // Verify ownership
    const existing = db.get('SELECT id FROM attendance_records WHERE id = ? AND user_id = ?', [recordId, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Attendance record not found.' });
      return;
    }

    // Check collision with another record
    const duplicate = db.get(
      'SELECT id FROM attendance_records WHERE user_id = ? AND subject_id = ? AND date = ? AND time_slot = ? AND id != ?',
      [userId, subjectId, date, timeSlot, recordId]
    );

    if (duplicate) {
      res.status(409).json({
        error: `Another attendance record already exists for this subject on ${date} (${timeSlot}).`
      });
      return;
    }

    db.run(
      `UPDATE attendance_records
       SET subject_id = ?, date = ?, time_slot = ?, status = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [subjectId, date, timeSlot, status, notes.trim(), recordId, userId]
    );

    const updated = db.get(
      `SELECT ar.id, ar.subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color,
              ar.date, ar.time_slot, ar.status, ar.notes, ar.shared_session_id, ar.created_at, ar.updated_at
       FROM attendance_records ar
       JOIN subjects s ON ar.subject_id = s.id
       WHERE ar.id = ?`,
      [recordId]
    );

    res.json({ record: updated, message: 'Attendance record updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update attendance record.' });
  }
});

// DELETE /api/attendance/:id - Delete record
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const recordId = req.params.id;

    const existing = db.get('SELECT id FROM attendance_records WHERE id = ? AND user_id = ?', [recordId, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Attendance record not found.' });
      return;
    }

    db.run('DELETE FROM attendance_records WHERE id = ? AND user_id = ?', [recordId, userId]);
    res.json({ message: 'Attendance record deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete attendance record.' });
  }
});

// GET /api/attendance/export/csv - Export attendance history to CSV
router.get('/export/csv', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subjectId } = req.query;

    let query = `
      SELECT 
        ar.date,
        s.name AS subject_name,
        s.code AS subject_code,
        ar.time_slot,
        ar.status,
        ar.notes,
        ar.created_at
      FROM attendance_records ar
      JOIN subjects s ON ar.subject_id = s.id
      WHERE ar.user_id = ?
    `;

    const params: any[] = [userId];

    if (subjectId && typeof subjectId === 'string' && subjectId !== 'all') {
      query += ` AND ar.subject_id = ?`;
      params.push(subjectId);
    }

    query += ` ORDER BY ar.date DESC, ar.time_slot DESC`;

    const records = db.query<{
      date: string;
      subject_name: string;
      subject_code: string;
      time_slot: string;
      status: string;
      notes: string;
      created_at: string;
    }>(query, params);

    // Build RFC-4180 CSV
    const headers = ['Date', 'Subject Name', 'Subject Code', 'Time Slot', 'Status', 'Notes', 'Recorded At'];
    const rows = records.map(r => [
      `"${r.date}"`,
      `"${(r.subject_name || '').replace(/"/g, '""')}"`,
      `"${(r.subject_code || '').replace(/"/g, '""')}"`,
      `"${(r.time_slot || '').replace(/"/g, '""')}"`,
      `"${r.status.toUpperCase()}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${r.created_at}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    const filename = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('CSV Export error:', error);
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

export default router;
