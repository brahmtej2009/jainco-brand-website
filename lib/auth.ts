import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';

export const SESSION_COOKIE = 'jainco_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SECRET = process.env.SESSION_SECRET ?? 'jainco-dev-secret-change-me';

export type AdminUser = { id: number; username: string };

/** The cookie carries the raw token; only its HMAC is stored, so a stolen DB grants no sessions. */
function fingerprint(token: string): string {
  return crypto.createHmac('sha256', SECRET).update(token).digest('hex');
}

// --- brute-force throttling (per process, resets on restart) ---
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 10 * 60 * 1000;

export function throttleStatus(key: string): { blocked: boolean; retryInSec: number } {
  const entry = attempts.get(key);
  if (!entry) return { blocked: false, retryInSec: 0 };
  if (Date.now() > entry.until) {
    attempts.delete(key);
    return { blocked: false, retryInSec: 0 };
  }
  return {
    blocked: entry.count >= MAX_ATTEMPTS,
    retryInSec: Math.ceil((entry.until - Date.now()) / 1000),
  };
}

export function recordFailure(key: string) {
  const entry = attempts.get(key);
  if (entry && Date.now() < entry.until) entry.count += 1;
  else attempts.set(key, { count: 1, until: Date.now() + LOCKOUT_MS });
}

export function clearFailures(key: string) {
  attempts.delete(key);
}

export function verifyCredentials(username: string, password: string): AdminUser | null {
  const row = db()
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined;

  // Always run a hash comparison so a missing user and a wrong password cost the same time.
  const hash = row?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
  const ok = bcrypt.compareSync(password, hash);

  return row && ok ? { id: row.id, username: row.username } : null;
}

const MAX_SESSIONS_PER_USER = 10;

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  db()
    .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(fingerprint(token), userId, now, now + SESSION_TTL_MS);

  // Retire expired rows and cap how many sessions one account can hold at once.
  db().prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db()
    .prepare(
      `DELETE FROM sessions
        WHERE user_id = ?
          AND token NOT IN (
            SELECT token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
          )`,
    )
    .run(userId, userId, MAX_SESSIONS_PER_USER);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token = ?').run(fingerprint(token));
  jar.delete(SESSION_COOKIE);
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = db()
    .prepare(
      `SELECT u.id, u.username, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .get(fingerprint(token)) as { id: number; username: string; expires_at: number } | undefined;

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db().prepare('DELETE FROM sessions WHERE token = ?').run(fingerprint(token));
    return null;
  }
  return { id: row.id, username: row.username };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthorizedError';
  }
}

export function hasAnyAdmin(): boolean {
  const row = db().prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  return row.c > 0;
}
