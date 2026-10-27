// server/src/db/seed.ts
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, initDatabase } from './database';

async function seed() {
  console.log('🌱 Seeding realistic demo data...');
  initDatabase();

  const demoEmail = 'alex.student@university.edu';
  const peerEmail = 'sarah.chen@university.edu';
  const defaultPassword = 'Student@123';

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // Check if already seeded
  const existingAlex = db.get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (existingAlex) {
    console.log('Demo user already exists. Cleaning up existing demo data for clean state...');
    db.run('DELETE FROM users WHERE email IN (?, ?)', [demoEmail, peerEmail]);
  }

  const alexId = crypto.randomUUID();
  const sarahId = crypto.randomUUID();

  // 1. Create Users
  db.run(
    `INSERT INTO users (id, name, email, password_hash, default_target_percentage)
     VALUES (?, ?, ?, ?, ?)`,
    [alexId, 'Alex Morgan', demoEmail, passwordHash, 75]
  );

  db.run(
    `INSERT INTO users (id, name, email, password_hash, default_target_percentage)
     VALUES (?, ?, ?, ?, ?)`,
    [sarahId, 'Sarah Chen', peerEmail, passwordHash, 75]
  );

  // 2. Create Subjects for Alex
  const cs301Id = crypto.randomUUID();
  const cs302Id = crypto.randomUUID();
  const cs303Id = crypto.randomUUID();
  const ma301Id = crypto.randomUUID();

  db.run(
    `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cs301Id, alexId, 'Operating Systems', 'CS301', 75, 'Dr. Aris Thorne', '#3B82F6']
  );

  db.run(
    `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cs302Id, alexId, 'Database Management Systems', 'CS302', 75, 'Prof. Evelyn Reed', '#EF4444']
  );

  db.run(
    `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cs303Id, alexId, 'Computer Networks', 'CS303', 80, 'Dr. Marcus Vance', '#10B981']
  );

  db.run(
    `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ma301Id, alexId, 'Discrete Mathematics', 'MA301', 75, 'Prof. Linda Zhao', '#8B5CF6']
  );

  // 3. Create Attendance Records
  // Requirement Example for CS301:
  // Attended: 18, Absent: 6, Cancelled: 2 => Conducted: 24, Attendance: 75.0%
  const today = new Date();

  function makeDate(daysAgo: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  // 18 Attended
  for (let i = 1; i <= 18; i++) {
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), alexId, cs301Id, makeDate(30 + i), '10:00 - 11:00 AM', 'attended', `Session ${i}: Core OS Concepts`]
    );
  }

  // 6 Absent
  for (let i = 1; i <= 6; i++) {
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), alexId, cs301Id, makeDate(10 + i), '10:00 - 11:00 AM', 'absent', `Missed class ${i}`]
    );
  }

  // 2 Cancelled (Excluded from conducted total)
  db.run(
    `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), alexId, cs301Id, makeDate(3), '10:00 - 11:00 AM', 'cancelled', 'College sports festival holiday']
  );
  db.run(
    `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), alexId, cs301Id, makeDate(2), '10:00 - 11:00 AM', 'cancelled', 'Professor on academic leave']
  );

  // CS302: Shortage Scenario (14 attended, 8 absent = 63.64%, needs consecutive to reach 75%)
  for (let i = 1; i <= 14; i++) {
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), alexId, cs302Id, makeDate(20 + i), '11:15 - 12:15 PM', 'attended', `DBMS Lecture ${i}`]
    );
  }
  for (let i = 1; i <= 8; i++) {
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), alexId, cs302Id, makeDate(5 + i), '11:15 - 12:15 PM', 'absent', `Missed SQL Lab ${i}`]
    );
  }

  // CS303: Surplus Scenario (22 attended, 3 absent = 88.0%, target 80%, has safe margin)
  for (let i = 1; i <= 22; i++) {
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), alexId, cs303Id, makeDate(25 + i), '02:00 - 03:00 PM', 'attended', `Networks Unit ${i}`]
    );
  }
  for (let i = 1; i <= 3; i++) {
    db.run(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), alexId, cs303Id, makeDate(i), '02:00 - 03:00 PM', 'absent', `Missed session ${i}`]
    );
  }

  // 4. Create Class Group & Broadcast Sessions
  const groupId = crypto.randomUUID();
  const inviteCode = 'CS3A26';

  db.run(
    `INSERT INTO class_groups (id, name, description, invite_code, creator_id)
     VALUES (?, ?, ?, ?, ?)`,
    [groupId, 'CS 3rd Year - Section A', 'Official class group for timetable synchronization & cancellations', inviteCode, sarahId]
  );

  // Group Memberships
  db.run(`INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'admin')`, [crypto.randomUUID(), groupId, sarahId]);
  db.run(`INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')`, [crypto.randomUUID(), groupId, alexId]);

  // Shared Sessions
  const sharedSession1 = crypto.randomUUID();
  const sharedSession2 = crypto.randomUUID();

  db.run(
    `INSERT INTO group_shared_sessions (id, group_id, creator_id, subject_name, subject_code, date, time_slot, session_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sharedSession1,
      groupId,
      sarahId,
      'Operating Systems',
      'CS301',
      makeDate(0),
      '10:00 - 11:00 AM',
      'conducted',
      'Covered Semaphore Implementation and Producer-Consumer problem'
    ]
  );

  db.run(
    `INSERT INTO group_shared_sessions (id, group_id, creator_id, subject_name, subject_code, date, time_slot, session_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sharedSession2,
      groupId,
      sarahId,
      'Computer Networks',
      'CS303',
      makeDate(1),
      '02:00 - 03:00 PM',
      'cancelled',
      'Class cancelled: Dr. Vance attending IEEE Conference'
    ]
  );

  console.log('✅ Realistic demo data successfully seeded!');
  console.log(`👤 Student Account: ${demoEmail} / ${defaultPassword}`);
  console.log(`👥 Peer Account:    ${peerEmail} / ${defaultPassword}`);
  console.log(`🔑 Group Invite:    ${inviteCode}`);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
