import type { NextRequest } from 'next/server';
import { clearFailures, recordFailure, startSession, throttleStatus, verifyCredentials } from '@/lib/auth';
import { fail, json, str } from '@/lib/api';
import { ValidationError, assertSameOrigin, clientKey, rateLimit, readJson } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const ip = clientKey(request);
    if (!rateLimit(`login:${ip}`, 20, 10 * 60_000)) {
      return fail('Too many sign-in attempts. Try again later.', 429);
    }

    const body = await readJson(request);
    const username = str(body.username, 64);
    const password = typeof body.password === 'string' ? body.password.slice(0, 512) : '';

    const key = `${ip}:${username.toLowerCase()}`;
    const throttle = throttleStatus(key);
    if (throttle.blocked) {
      return fail(`Too many attempts. Try again in ${Math.ceil(throttle.retryInSec / 60)} minute(s).`, 429);
    }

    if (!username || !password) return fail('Enter a username and password.', 400);

    const user = verifyCredentials(username, password);
    if (!user) {
      recordFailure(key);
      // Deliberately identical for an unknown user and a wrong password.
      return fail('Incorrect username or password.', 401);
    }

    clearFailures(key);
    await startSession(user.id);

    return json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);

    console.error('[login]', err);
    return fail('Sign-in failed.', 500);
  }
}
