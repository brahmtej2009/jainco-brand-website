// Shared database bootstrap for CLI scripts (npm run db:init / admin:create / seed).
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../db/migrations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DB_PATH = path.join(root, 'data', 'jainco.db');
export const UPLOAD_DIR = path.join(root, 'data', 'uploads');

const DEFAULT_SETTINGS = {
  show_prices: '0',
  site_tagline: 'Everything for the table, the shelf and the gift.',
  contact_email: 'sales@jainco.example',
  contact_phone: '+91 00000 00000',
  whatsapp: '',
  address: '',
};

export function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8'));

  const put = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) put.run(k, v);

  runMigrations(db);

  return db;
}
