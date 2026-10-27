// server/src/routes/groups.ts
import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(100),
  description: z.string().max(255).optional().default('')
});

const joinGroupSchema = z.object({
  inviteCode: z.string().min(4).max(12)
});

const sharedSessionSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required').max(100),
  subjectCode: z.string().min(1, 'Subject code is required').max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  timeSlot: z.string().min(1).max(50).default('09:00 - 10:00'),
  sessionStatus: z.enum(['conducted', 'cancelled']).default('conducted'),
  notes: z.string().max(500).optional().default('')
});

const syncSessionSchema = z.object({
  status: z.enum(['attended', 'absent', 'cancelled']),
  targetSubjectId: z.string().optional()
});

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/groups - List all groups user belongs to
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const groups = db.query<{
      id: string;
      name: string;
      description: string;
      invite_code: string;
      creator_id: string;
      created_at: string;
      my_role: string;
      member_count: number;
      session_count: number;
    }>(
      `SELECT 
         g.id, g.name, g.description, g.invite_code, g.creator_id, g.created_at,
         gm.role AS my_role,
         (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
         (SELECT COUNT(*) FROM group_shared_sessions WHERE group_id = g.id) AS session_count
       FROM class_groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.json({ groups });
  } catch (error: any) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ error: 'Failed to retrieve class groups.' });
  }
});

// POST /api/groups - Create a new class group
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createGroupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const { name, description } = parseResult.data;

    let inviteCode = generateInviteCode();
    // Ensure uniqueness
    while (db.get('SELECT id FROM class_groups WHERE invite_code = ?', [inviteCode])) {
      inviteCode = generateInviteCode();
    }

    const groupId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    // Transaction-like insert
    db.run(
      `INSERT INTO class_groups (id, name, description, invite_code, creator_id)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, name.trim(), description.trim(), inviteCode, userId]
    );

    db.run(
      `INSERT INTO group_members (id, group_id, user_id, role)
       VALUES (?, ?, ?, 'admin')`,
      [membershipId, groupId, userId]
    );

    const created = db.get(
      `SELECT id, name, description, invite_code, creator_id, created_at FROM class_groups WHERE id = ?`,
      [groupId]
    );

    res.status(201).json({
      group: {
        ...created,
        my_role: 'admin',
        member_count: 1,
        session_count: 0
      },
      message: 'Class group created successfully.'
    });
  } catch (error: any) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create class group.' });
  }
});

// POST /api/groups/join - Join a group via invite code
router.post('/join', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = joinGroupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const cleanCode = parseResult.data.inviteCode.trim().toUpperCase();

    const group = db.get<{
      id: string;
      name: string;
      description: string;
      creator_id: string;
    }>('SELECT id, name, description, creator_id FROM class_groups WHERE UPPER(invite_code) = ?', [cleanCode]);

    if (!group) {
      res.status(404).json({ error: 'Invalid invitation code. No class group found.' });
      return;
    }

    // Check if already a member
    const existingMember = db.get(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [group.id, userId]
    );

    if (existingMember) {
      res.status(409).json({ error: 'You are already a member of this class group.' });
      return;
    }

    const membershipId = crypto.randomUUID();
    db.run(
      `INSERT INTO group_members (id, group_id, user_id, role)
       VALUES (?, ?, ?, 'member')`,
      [membershipId, group.id, userId]
    );

    res.status(200).json({
      group,
      message: `Successfully joined ${group.name}!`
    });
  } catch (error: any) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Failed to join group.' });
  }
});

// GET /api/groups/:id - Get group details, members, and shared class feed
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    // Verify membership
    const membership = db.get<{ role: string }>(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'You do not have permission to access this class group.' });
      return;
    }

    const group = db.get<{
      id: string;
      name: string;
      description: string;
      invite_code: string;
      creator_id: string;
      created_at: string;
    }>('SELECT * FROM class_groups WHERE id = ?', [groupId]);

    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    // Members
    const members = db.query<{
      user_id: string;
      name: string;
      email: string;
      role: string;
      joined_at: string;
    }>(
      `SELECT gm.user_id, u.name, u.email, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.role ASC, gm.joined_at ASC`,
      [groupId]
    );

    // Shared sessions feed with contributor attribution
    const sharedSessions = db.query<{
      id: string;
      group_id: string;
      creator_id: string;
      creator_name: string;
      subject_name: string;
      subject_code: string;
      date: string;
      time_slot: string;
      session_status: string;
      notes: string;
      created_at: string;
      synced_by_me: boolean;
      my_personal_status: string | null;
    }>(
      `SELECT 
         s.id, s.group_id, s.creator_id, u.name AS creator_name,
         s.subject_name, s.subject_code, s.date, s.time_slot, s.session_status, s.notes, s.created_at,
         CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END AS synced_by_me,
         ar.status AS my_personal_status
       FROM group_shared_sessions s
       JOIN users u ON s.creator_id = u.id
       LEFT JOIN attendance_records ar ON ar.shared_session_id = s.id AND ar.user_id = ?
       WHERE s.group_id = ?
       ORDER BY s.date DESC, s.created_at DESC`,
      [userId, groupId]
    );

    res.json({
      group: {
        ...group,
        my_role: membership.role
      },
      members,
      sharedSessions: sharedSessions.map(s => ({
        ...s,
        synced_by_me: Boolean(s.synced_by_me)
      }))
    });
  } catch (error: any) {
    console.error('Fetch group details error:', error);
    res.status(500).json({ error: 'Failed to retrieve group details.' });
  }
});

// POST /api/groups/:id/sessions - Broadcast a shared class session
router.post('/:id/sessions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = sharedSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const groupId = req.params.id;

    // Check membership
    const membership = db.get(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this class group.' });
      return;
    }

    const { subjectName, subjectCode, date, timeSlot, sessionStatus, notes } = parseResult.data;
    const sessionId = crypto.randomUUID();

    db.run(
      `INSERT INTO group_shared_sessions (id, group_id, creator_id, subject_name, subject_code, date, time_slot, session_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, groupId, userId, subjectName.trim(), subjectCode.trim().toUpperCase(), date, timeSlot, sessionStatus, notes.trim()]
    );

    const created = db.get(
      `SELECT s.*, u.name AS creator_name
       FROM group_shared_sessions s
       JOIN users u ON s.creator_id = u.id
       WHERE s.id = ?`,
      [sessionId]
    );

    res.status(201).json({
      session: {
        ...created,
        synced_by_me: false,
        my_personal_status: null
      },
      message: 'Class session shared to group successfully.'
    });
  } catch (error: any) {
    console.error('Broadcast session error:', error);
    res.status(500).json({ error: 'Failed to broadcast class session.' });
  }
});

// POST /api/groups/sessions/:sessionId/sync - 1-Click Sync shared session to personal attendance
router.post('/sessions/:sessionId/sync', (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = syncSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const userId = req.user!.id;
    const sessionId = req.params.sessionId;
    const { status, targetSubjectId } = parseResult.data;

    // Find the shared session
    const session = db.get<{
      id: string;
      group_id: string;
      subject_name: string;
      subject_code: string;
      date: string;
      time_slot: string;
      session_status: string;
      notes: string;
    }>('SELECT * FROM group_shared_sessions WHERE id = ?', [sessionId]);

    if (!session) {
      res.status(404).json({ error: 'Shared class session not found.' });
      return;
    }

    // Verify user is member of this group
    const membership = db.get(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [session.group_id, userId]
    );

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of the group that shared this session.' });
      return;
    }

    // Locate or create user's subject matching the code
    let finalSubjectId = targetSubjectId;
    if (!finalSubjectId) {
      const existingSubj = db.get<{ id: string }>(
        'SELECT id FROM subjects WHERE user_id = ? AND UPPER(code) = ?',
        [userId, session.subject_code.toUpperCase()]
      );

      if (existingSubj) {
        finalSubjectId = existingSubj.id;
      } else {
        // Auto-create subject for user if not existing
        finalSubjectId = crypto.randomUUID();
        db.run(
          `INSERT INTO subjects (id, user_id, name, code, target_percentage)
           VALUES (?, ?, ?, ?, ?)`,
          [finalSubjectId, userId, session.subject_name, session.subject_code.toUpperCase(), req.user!.default_target_percentage]
        );
      }
    }

    // Check if attendance already recorded for this date/time_slot
    const existingRecord = db.get<{ id: string }>(
      'SELECT id FROM attendance_records WHERE user_id = ? AND subject_id = ? AND date = ? AND time_slot = ?',
      [userId, finalSubjectId, session.date, session.time_slot]
    );

    if (existingRecord) {
      // Update existing record
      db.run(
        `UPDATE attendance_records
         SET status = ?, shared_session_id = ?, notes = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [status, session.id, session.notes, existingRecord.id]
      );
      res.json({ message: 'Updated your personal attendance record for this shared class.' });
      return;
    }

    // Insert new record
    const recordId = crypto.randomUUID();
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes, shared_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recordId, userId, finalSubjectId, session.date, session.time_slot, status, session.notes, session.id]
    );

    res.status(201).json({ message: 'Successfully synced to your personal attendance.' });
  } catch (error: any) {
    console.error('Sync session error:', error);
    res.status(500).json({ error: 'Failed to sync shared session.' });
  }
});

// DELETE /api/groups/:id - Delete group (admin only)
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const groupId = req.params.id;

    const group = db.get<{ creator_id: string }>('SELECT creator_id FROM class_groups WHERE id = ?', [groupId]);
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    if (group.creator_id !== userId) {
      res.status(403).json({ error: 'Only the group creator can delete this group.' });
      return;
    }

    db.run('DELETE FROM class_groups WHERE id = ?', [groupId]);
    res.json({ message: 'Class group deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete class group.' });
  }
});

// DELETE /api/groups/sessions/:sessionId - Delete shared session
router.delete('/sessions/:sessionId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId;

    const session = db.get<{ group_id: string; creator_id: string }>(
      'SELECT group_id, creator_id FROM group_shared_sessions WHERE id = ?',
      [sessionId]
    );

    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    // Must be either creator of the session or admin of the group
    const membership = db.get<{ role: string }>(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [session.group_id, userId]
    );

    if (session.creator_id !== userId && membership?.role !== 'admin') {
      res.status(403).json({ error: 'You are not authorized to delete this shared session.' });
      return;
    }

    db.run('DELETE FROM group_shared_sessions WHERE id = ?', [sessionId]);
    res.json({ message: 'Shared session removed from group feed.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete shared session.' });
  }
});

export default router;
