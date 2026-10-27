// server/tests/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { db } from '../src/db/database';

describe('API Integration Tests', () => {
  let authToken = '';
  let secondUserToken = '';
  let testUserId = '';
  let subjectId = '';
  let groupId = '';
  let inviteCode = '';
  let sharedSessionId = '';

  const testEmail = `test.student.${Date.now()}@university.edu`;
  const peerEmail = `peer.student.${Date.now()}@university.edu`;

  afterAll(() => {
    db.close();
  });

  describe('Authentication Flow', () => {
    it('successfully registers a new student account', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alex Student',
          email: testEmail,
          password: 'Password123!',
          defaultTargetPercentage: 75
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.token).toBeDefined();

      authToken = res.body.token;
      testUserId = res.body.user.id;
    });

    it('prevents registering with duplicate email address', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alex Duplicate',
          email: testEmail,
          password: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('successfully logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
    });

    it('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
    });

    it('blocks access to protected endpoints without token', async () => {
      const res = await request(app).get('/api/subjects');
      expect(res.status).toBe(401);
    });

    it('registers a second student account for group testing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Peer Student',
          email: peerEmail,
          password: 'Password123!',
          defaultTargetPercentage: 80
        });

      expect(res.status).toBe(201);
      secondUserToken = res.body.token;
    });
  });

  describe('Subject Management', () => {
    it('creates a new subject for the student', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Operating Systems',
          code: 'CS301',
          targetPercentage: 75,
          teacherName: 'Dr. Johnson',
          color: '#3B82F6'
        });

      expect(res.status).toBe(201);
      expect(res.body.subject.code).toBe('CS301');
      subjectId = res.body.subject.id;
    });

    it('prevents duplicate subject code for the same student', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Another Operating Systems',
          code: 'CS301'
        });

      expect(res.status).toBe(409);
    });

    it('lists subjects for authenticated student', async () => {
      const res = await request(app)
        .get('/api/subjects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.subjects)).toBe(true);
      expect(res.body.subjects.some((s: any) => s.code === 'CS301')).toBe(true);
    });
  });

  describe('Attendance Recording & Duplicate Prevention', () => {
    it('records attendance for a class', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subjectId,
          date: '2026-10-27',
          timeSlot: '10:00 - 11:00 AM',
          status: 'attended',
          notes: 'Covered Process Synchronization'
        });

      expect(res.status).toBe(201);
      expect(res.body.record.status).toBe('attended');
    });

    it('prevents duplicate attendance entry on the exact same date and time slot', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subjectId,
          date: '2026-10-27',
          timeSlot: '10:00 - 11:00 AM',
          status: 'absent'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('allows marking another session on a different time slot or date', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subjectId,
          date: '2026-10-27',
          timeSlot: '02:00 - 03:00 PM',
          status: 'absent',
          notes: 'Lab missed due to travel'
        });

      expect(res.status).toBe(201);
    });

    it('records a cancelled class and verifies it is excluded from conducted count', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subjectId,
          date: '2026-10-26',
          timeSlot: '10:00 - 11:00 AM',
          status: 'cancelled',
          notes: 'Cancelled due to college symposium'
        });

      expect(res.status).toBe(201);

      // Check subject stats: 1 attended, 1 absent, 1 cancelled => conducted = 2, % = 50.0%
      const subjRes = await request(app)
        .get('/api/subjects')
        .set('Authorization', `Bearer ${authToken}`);

      const cs301 = subjRes.body.subjects.find((s: any) => s.id === subjectId);
      expect(cs301.stats.attended).toBe(1);
      expect(cs301.stats.absent).toBe(1);
      expect(cs301.stats.cancelled).toBe(1);
      expect(cs301.stats.conducted).toBe(2);
      expect(cs301.stats.percentage).toBe(50.0);
    });

    it('exports attendance records as valid CSV format', async () => {
      const res = await request(app)
        .get('/api/attendance/export/csv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Date,Subject Name,Subject Code,Time Slot,Status,Notes,Recorded At');
      expect(res.text).toContain('CS301');
    });
  });

  describe('Shared Class Groups & Peer Synchronization', () => {
    it('creates a class group and generates a unique invite code', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Computer Science Batch 2026',
          description: 'Official shared updates for CS Section A'
        });

      expect(res.status).toBe(201);
      expect(res.body.group.name).toBe('Computer Science Batch 2026');
      expect(res.body.group.invite_code).toBeDefined();

      groupId = res.body.group.id;
      inviteCode = res.body.group.invite_code;
    });

    it('allows a peer student to join the group via invite code', async () => {
      const res = await request(app)
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ inviteCode });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Successfully joined');
    });

    it('broadcasts a shared class session to the group', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupId}/sessions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subjectName: 'Operating Systems',
          subjectCode: 'CS301',
          date: '2026-10-28',
          timeSlot: '11:00 - 12:00 PM',
          sessionStatus: 'conducted',
          notes: 'Lecture on Deadlocks by Prof. Miller'
        });

      expect(res.status).toBe(201);
      expect(res.body.session.subject_code).toBe('CS301');
      sharedSessionId = res.body.session.id;
    });

    it('allows the peer student to 1-click sync the shared session into their own attendance', async () => {
      const res = await request(app)
        .post(`/api/groups/sessions/${sharedSessionId}/sync`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ status: 'attended' });

      expect(res.status).toBe(201);

      // Verify peer now has this record in their private attendance
      const peerRecords = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(peerRecords.status).toBe(200);
      expect(peerRecords.body.records.some((r: any) => r.date === '2026-10-28')).toBe(true);
    });
  });

  describe('Dashboard Analytics & Projection Calculator', () => {
    it('retrieves comprehensive dashboard statistics', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.overall).toBeDefined();
      expect(res.body.chartBarData).toBeDefined();
      expect(res.body.chartPieData).toBeDefined();
      expect(Array.isArray(res.body.shortageAlerts)).toBe(true);
    });

    it('projects future attendance simulation correctly', async () => {
      const res = await request(app)
        .post('/api/stats/project')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subjectId,
          futureClasses: 10,
          classesToAttend: 8
        });

      expect(res.status).toBe(200);
      expect(res.body.projection).toBeDefined();
      expect(res.body.projection.resultingConducted).toBe(12); // 2 current conducted + 10 future
      expect(Array.isArray(res.body.curveTable)).toBe(true);
    });
  });
});
