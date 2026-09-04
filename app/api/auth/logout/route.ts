import type { NextRequest } from 'next/server';
import { endSession } from '@/lib/auth';
import { fail, json } from '@/lib/api';
import { ValidationError, assertSameOrigin } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await endSession();
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail('Sign-out failed.', 500);
  }
}
