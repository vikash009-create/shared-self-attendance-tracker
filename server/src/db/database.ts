// server/src/db/database.ts
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: DatabaseSync | null = null;

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  default_target_percentage REAL NOT NULL DEFAULT 75.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  target_percentage REAL NOT NULL DEFAULT 75.0,
  teacher_name TEXT DEFAULT '',
  color TEXT DEFAULT '#3B82F6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, code)
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL DEFAULT '09:00 - 10:00',
  status TEXT NOT NULL CHECK (status IN ('attended', 'absent', 'cancelled')),
  notes TEXT DEFAULT '',
  shared_session_id TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, subject_id, date, time_slot)
);

-- Class groups
CREATE TABLE IF NOT EXISTS class_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Group memberships
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, user_id)
);

-- Group shared class events
CREATE TABLE IF NOT EXISTS group_shared_sessions (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  session_status TEXT NOT NULL DEFAULT 'conducted' CHECK (session_status IN ('conducted', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_records_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_subject ON attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_groups_code ON class_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_group ON group_shared_sessions(group_id);
`;

export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test') {
    return ':memory:';
  }

  // On Vercel serverless / AWS Lambda, the deployment filesystem is read-only except /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/attendance.db';
  }

  const configuredPath = process.env.SQLITE_DB_PATH || './data/attendance.db';
  try {
    const resolved = path.resolve(process.cwd(), configuredPath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return resolved;
  } catch (err) {
    console.warn('Read-only filesystem detected, falling back to /tmp/attendance.db');
    return '/tmp/attendance.db';
  }
}

function autoSeedIfEmpty(instance: DatabaseSync): void {
  try {
    const userCount = instance.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number } | undefined;
    if (userCount && userCount.count > 0) {
      return;
    }

    console.log('🌱 Database is empty. Auto-seeding default demo accounts and subjects...');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Student@123', salt);

    const alexId = crypto.randomUUID();
    const sarahId = crypto.randomUUID();
    const demoId = crypto.randomUUID();
    const demoPasswordHash = bcrypt.hashSync('demo1234', salt);

    // Insert demo users
    instance.prepare(
      `INSERT INTO users (id, name, email, password_hash, default_target_percentage)
       VALUES (?, ?, ?, ?, ?)`
    ).run(alexId, 'Alex Morgan', 'alex.student@university.edu', passwordHash, 75);

    instance.prepare(
      `INSERT INTO users (id, name, email, password_hash, default_target_percentage)
       VALUES (?, ?, ?, ?, ?)`
    ).run(sarahId, 'Sarah Chen', 'sarah.chen@university.edu', passwordHash, 75);

    instance.prepare(
      `INSERT INTO users (id, name, email, password_hash, default_target_percentage)
       VALUES (?, ?, ?, ?, ?)`
    ).run(demoId, 'Demo Student', 'demo.student@university.edu', demoPasswordHash, 75);

    // Insert subjects for Alex
    const cs301Id = crypto.randomUUID();
    const cs302Id = crypto.randomUUID();
    const cs303Id = crypto.randomUUID();

    instance.prepare(
      `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(cs301Id, alexId, 'Operating Systems', 'CS301', 75, 'Dr. Aris Thorne', '#3B82F6');

    instance.prepare(
      `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(cs302Id, alexId, 'Database Management Systems', 'CS302', 75, 'Prof. Evelyn Reed', '#EF4444');

    instance.prepare(
      `INSERT INTO subjects (id, user_id, name, code, target_percentage, teacher_name, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(cs303Id, alexId, 'Computer Networks', 'CS303', 80, 'Dr. Marcus Vance', '#10B981');

    const today = new Date();
    const makeDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // CS301: 18 attended, 6 absent, 2 cancelled = 24 conducted, 75.0%
    const insertRec = instance.prepare(
      `INSERT INTO attendance_records (id, user_id, subject_id, date, time_slot, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (let i = 1; i <= 18; i++) {
      insertRec.run(crypto.randomUUID(), alexId, cs301Id, makeDate(30 + i), '10:00 - 11:00 AM', 'attended', `Session ${i}`);
    }
    for (let i = 1; i <= 6; i++) {
      insertRec.run(crypto.randomUUID(), alexId, cs301Id, makeDate(10 + i), '10:00 - 11:00 AM', 'absent', `Missed class ${i}`);
    }
    insertRec.run(crypto.randomUUID(), alexId, cs301Id, makeDate(3), '10:00 - 11:00 AM', 'cancelled', 'Holiday');
    insertRec.run(crypto.randomUUID(), alexId, cs301Id, makeDate(2), '10:00 - 11:00 AM', 'cancelled', 'Faculty Leave');

    // CS302: 14 attended, 8 absent = 63.64% (shortage)
    for (let i = 1; i <= 14; i++) {
      insertRec.run(crypto.randomUUID(), alexId, cs302Id, makeDate(20 + i), '11:15 - 12:15 PM', 'attended', `DBMS Lecture ${i}`);
    }
    for (let i = 1; i <= 8; i++) {
      insertRec.run(crypto.randomUUID(), alexId, cs302Id, makeDate(5 + i), '11:15 - 12:15 PM', 'absent', `DBMS Lab ${i}`);
    }

    // CS303: 22 attended, 3 absent = 88.0% (surplus)
    for (let i = 1; i <= 22; i++) {
      insertRec.run(crypto.randomUUID(), alexId, cs303Id, makeDate(25 + i), '02:00 - 03:00 PM', 'attended', `Networks Unit ${i}`);
    }
    for (let i = 1; i <= 3; i++) {
      insertRec.run(crypto.randomUUID(), alexId, cs303Id, makeDate(i), '02:00 - 03:00 PM', 'absent', `Missed session ${i}`);
    }

    // Class Group
    const groupId = crypto.randomUUID();
    instance.prepare(
      `INSERT INTO class_groups (id, name, description, invite_code, creator_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(groupId, 'CS 3rd Year - Section A', 'Official class group', 'CS3A26', sarahId);

    instance.prepare(
      `INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'admin')`
    ).run(crypto.randomUUID(), groupId, sarahId);
    instance.prepare(
      `INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')`
    ).run(crypto.randomUUID(), groupId, alexId);

    console.log('✅ Default demo accounts automatically seeded!');
  } catch (err) {
    console.warn('Auto-seed check/execution notice:', err);
  }
}

export function initDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();

  try {
    dbInstance = new DatabaseSync(dbPath);
    if (dbPath !== ':memory:') {
      try {
        dbInstance.exec('PRAGMA journal_mode = WAL;');
      } catch {
        dbInstance.exec('PRAGMA journal_mode = MEMORY;');
      }
    }
  } catch (err) {
    console.warn(`Could not open SQLite database at ${dbPath}, falling back to :memory:`, err);
    dbInstance = new DatabaseSync(':memory:');
  }

  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema with embedded DDL (ensures tables always exist regardless of bundle layout)
  dbInstance.exec(SCHEMA_SQL);

  // Auto-seed demo accounts if new/empty database
  autoSeedIfEmpty(dbInstance);

  return dbInstance;
}

export const db = {
  get instance(): DatabaseSync {
    if (!dbInstance) {
      return initDatabase();
    }
    return dbInstance;
  },

  query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.instance.prepare(sql);
    return stmt.all(...params) as T[];
  },

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.instance.prepare(sql);
    return stmt.get(...params) as T | undefined;
  },

  run(sql: string, params: any[] = []): { changes: number | bigint; lastInsertRowid: number | bigint } {
    const stmt = this.instance.prepare(sql);
    return stmt.run(...params);
  },

  exec(sql: string): void {
    this.instance.exec(sql);
  },

  close(): void {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};
