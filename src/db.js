// ═══════════════════════════════════════════
// SQLite database initialisation
// DB path: ~/.compliance-shield-mcp/compliance.db
// ═══════════════════════════════════════════

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DB_DIR = join(homedir(), '.compliance-shield-mcp');
const DB_PATH = join(DB_DIR, 'compliance.db');

if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Tables ──────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS audits (
    audit_id      TEXT    PRIMARY KEY,
    agent_id      TEXT    NOT NULL,
    framework     TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'active',
    findings_json TEXT    NOT NULL DEFAULT '[]',
    created_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS violations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_id  TEXT    NOT NULL,
    agent_id  TEXT    NOT NULL,
    rule      TEXT    NOT NULL,
    severity  TEXT    NOT NULL,
    detail    TEXT    NOT NULL,
    timestamp TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exemptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id   TEXT    NOT NULL,
    rule       TEXT    NOT NULL,
    reason     TEXT    NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audits_agent_id     ON audits(agent_id);
  CREATE INDEX IF NOT EXISTS idx_violations_agent_id ON violations(agent_id);
  CREATE INDEX IF NOT EXISTS idx_exemptions_agent_id ON exemptions(agent_id);
`);

export default db;
