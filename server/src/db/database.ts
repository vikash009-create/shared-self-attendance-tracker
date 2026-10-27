// server/src/db/database.ts
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test') {
    return ':memory:';
  }
  const configuredPath = process.env.SQLITE_DB_PATH || './data/attendance.db';
  return path.resolve(process.cwd(), configuredPath);
}

export function initDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new DatabaseSync(dbPath);

  // Enable WAL mode for high performance & foreign key constraints
  if (dbPath !== ':memory:') {
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Run schema initialization
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);
  } else {
    // Fallback if built into dist
    const distSchemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
    if (fs.existsSync(distSchemaPath)) {
      dbInstance.exec(fs.readFileSync(distSchemaPath, 'utf8'));
    }
  }

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
