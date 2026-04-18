import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dataDir = process.env.DATA_DIR ?? path.join(__dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(path.join(dataDir, 'hassboard.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dashboards (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id           TEXT PRIMARY KEY,
    dashboard_id TEXT NOT NULL,
    type         TEXT NOT NULL,
    col          INTEGER NOT NULL,
    row          INTEGER NOT NULL,
    col_span     INTEGER DEFAULT 1,
    row_span     INTEGER DEFAULT 1,
    config       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plugins (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    version      TEXT NOT NULL,
    bundle_url   TEXT NOT NULL,
    installed_at TEXT NOT NULL
  );
`)

// Insert default dashboard if none exists
const existing = db.prepare('SELECT id FROM dashboards LIMIT 1').get()
if (!existing) {
  db.prepare('INSERT INTO dashboards (id, name, sort_order) VALUES (?, ?, ?)').run('default', 'Hem', 0)
}

export default db
