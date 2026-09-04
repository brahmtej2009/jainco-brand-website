import type { NextRequest } from 'next/server';
import { createEnquiry, validateEnquiry } from '@/lib/enquiries';
import { fail, json } from '@/lib/api';
import { ValidationError, assertSameOrigin, clientKey, rateLimit, readJson } from '@/lib/security';

export const runtime = 'nodejs';

// Two separate budgets. A typo in an email address should never use up someone's ability
// to send, so only messages that actually reach the inbox count against the send limit.
// The wider attempt limit is there purely to stop a script hammering the endpoint.
const SENDS = { limit: 10, windowMs: 15 * 60_000 };
const ATTEMPTS = { limit: 60, windowMs: 15 * 60_000 };

/**
 * The one public write in the whole application. It is same-origin only, rate limited per
 * address, carries a honeypot field, and every value is bound as a parameter and escaped
 * again by React when an administrator reads it.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const ip = clientKey(request);

    if (!rateLimit(`enquiry-attempt:${ip}`, ATTEMPTS.limit, ATTEMPTS.windowMs)) {
      return fail('Too many requests from this connection. Please try again shortly.', 429);
    }

    const body = await readJson(request);

    // Bots fill every field they find; a real person never sees this one.
    if (typeof body.website === 'string' && body.website.trim()) {
      return json({ ok: true });
    }

    // Validation runs first, so a rejected message costs nothing but an attempt.
    const enquiry = validateEnquiry(body);

    if (!rateLimit(`enquiry-send:${ip}`, SENDS.limit, SENDS.windowMs)) {
      return fail('You have already sent a few messages. Please give us a little time to reply.', 429);
    }

    createEnquiry(enquiry);
    return json({ ok: true }, 201);
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);

    console.error('[enquiry]', err);
    return fail('We could not send that just now. Please try again.', 500);
  }
}
