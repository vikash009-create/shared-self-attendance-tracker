-- PostgreSQL / Supabase Schema with Row Level Security (RLS)
-- Shared Self-Attendance Tracker

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  default_target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
  teacher_name VARCHAR(255) DEFAULT '',
  color VARCHAR(20) DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_subject_code UNIQUE(user_id, code)
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL DEFAULT '09:00 - 10:00',
  status VARCHAR(20) NOT NULL CHECK (status IN ('attended', 'absent', 'cancelled')),
  notes TEXT DEFAULT '',
  shared_session_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_subject_date_slot UNIQUE(user_id, subject_id, date, time_slot)
);

-- Class groups
CREATE TABLE IF NOT EXISTS class_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_group_user_membership UNIQUE(group_id, user_id)
);

-- Group shared sessions
CREATE TABLE IF NOT EXISTS group_shared_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name VARCHAR(255) NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  session_status VARCHAR(20) NOT NULL DEFAULT 'conducted' CHECK (session_status IN ('conducted', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pg_subjects_user ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_records_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_records_subject ON attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_pg_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_pg_groups_code ON class_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_pg_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_shared_sessions_group ON group_shared_sessions(group_id);

-- Row Level Security (RLS) Configuration for Supabase / PostgreSQL
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_shared_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Subjects: Users can only see and manage their own subjects
CREATE POLICY subjects_user_isolation_policy ON subjects
  FOR ALL
  USING (user_id = auth.uid());

-- Attendance Records: Users can only view and modify their own attendance
CREATE POLICY attendance_user_isolation_policy ON attendance_records
  FOR ALL
  USING (user_id = auth.uid());

-- Class Groups: Users can view groups they are members of
CREATE POLICY class_groups_select_policy ON class_groups
  FOR SELECT
  USING (
    creator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = class_groups.id AND group_members.user_id = auth.uid())
  );

-- Shared Sessions: Group members can view sessions for their groups
CREATE POLICY shared_sessions_view_policy ON group_shared_sessions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_shared_sessions.group_id AND group_members.user_id = auth.uid())
  );
