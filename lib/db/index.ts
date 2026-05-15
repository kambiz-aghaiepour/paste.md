import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const DB_PATH = "data/paste.db";

// Ensure the data directory exists before opening the database
const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    size_bytes INTEGER NOT NULL
  )
`);
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_expires_at ON pastes (expires_at)
`);

export const db = drizzle({ client: sqlite, schema });
