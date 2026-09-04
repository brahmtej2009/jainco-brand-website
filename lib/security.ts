import 'server-only';
import type { NextRequest } from 'next/server';

/** Thrown for input the caller got wrong; its message is safe to show them. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Rejects cross-site writes. The session cookie is already SameSite=Lax, which stops a
 * cross-origin form POST from carrying it; this is the second lock on the same door and
 * also covers same-site subdomain attackers.
 */
export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Same-origin fetch() always sends Origin on a state-changing request.
  if (!origin) {
    const dest = request.headers.get('sec-fetch-site');
    if (dest && dest !== 'same-origin') throw new ValidationError('Cross-site request blocked.');
    return;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ValidationError('Cross-site request blocked.');
  }

  const host = request.headers.get('host');
  if (!host || originHost !== host) throw new ValidationError('Cross-site request blocked.');
}

const MAX_JSON_BYTES = 256 * 1024;

/** Reads a JSON body with a hard size ceiling, so one request cannot exhaust memory. */
export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    throw new ValidationError('Request body is too large.');
  }

  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new ValidationError('Request body is too large.');
  if (!text) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ValidationError('Malformed request body.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ValidationError('Malformed request body.');
  }
  return parsed as Record<string, unknown>;
}

/** Route parameters reach SQL, so anything that is not a plain positive integer is refused. */
export function routeId(raw: string | undefined): number {
  if (!raw || !/^\d{1,9}$/.test(raw)) throw new ValidationError('Invalid identifier.');

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new ValidationError('Invalid identifier.');
  return value;
}

/* --------------------------------------------------------------- rate limits */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Fixed-window limiter, per process. Enough to blunt scripted abuse of a single-box deploy. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'local';
}

// Keeps the map from growing without bound on a long-running server.
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (now > bucket.resetAt) buckets.delete(key);
  }, 60_000);
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
}
