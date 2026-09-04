import 'server-only';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
// Plain ESM helper, shared with the CLI scripts so both paths migrate identically.
import { runMigrations } from '../db/migrations.mjs';

const DATA_DIR = path.join(process.cwd(), 'data');
export const DB_PATH = path.join(DATA_DIR, 'jainco.db');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const DEFAULT_SETTINGS: Record<string, string> = {
  show_prices: '0',
  site_tagline: 'Everything for the table, the shelf and the gift.',
  contact_email: 'sales@jainco.example',
  contact_phone: '+91 00000 00000',
  whatsapp: '',
  address: '',
};

// Cached on globalThis so Next's dev hot-reload does not open a new handle per edit.
const globalForDb = globalThis as unknown as { __jaincoDb?: Database.Database };

function create(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const database = new Database(DB_PATH);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8'));

  const put = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) put.run(k, v);

  runMigrations(database);

  database.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

  return database;
}

export function db(): Database.Database {
  if (!globalForDb.__jaincoDb) globalForDb.__jaincoDb = create();
  return globalForDb.__jaincoDb;
}
