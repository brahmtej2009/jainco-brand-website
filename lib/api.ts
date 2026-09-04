import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { currentAdmin, type AdminUser } from './auth';
import { ValidationError, assertSameOrigin, clientKey, rateLimit } from './security';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export type RouteContext<P> = { params: Promise<P> };

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Guards an admin-only handler. Signed-out callers get a 401 before the handler runs,
 * writes must be same-origin, and only validation messages are echoed back. An
 * unexpected failure is logged server-side and reported generically, so SQLite errors
 * never leak schema details to the network.
 */
export function withAdmin<P = Record<string, never>>(
  handler: (
    admin: AdminUser,
    request: NextRequest,
    ctx: RouteContext<P>,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest, ctx: RouteContext<P>) => {
    try {
      if (WRITE_METHODS.has(request.method)) assertSameOrigin(request);

      if (!rateLimit(`admin:${clientKey(request)}`, 240, 60_000)) {
        return fail('Too many requests. Slow down and try again shortly.', 429);
      }

      const admin = await currentAdmin();
      if (!admin) return fail('Not signed in', 401);

      return await handler(admin, request, ctx);
    } catch (err) {
      if (err instanceof ValidationError) return fail(err.message, 400);

      console.error('[admin api]', err);
      return fail('Something went wrong handling that request.', 500);
    }
  };
}

// Everything except tab, newline and carriage return.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function str(value: unknown, max = 4000): string {
  if (typeof value !== 'string') return '';
  // Strip control characters so nothing invisible is stored or echoed back into a page.
  return value.replace(CONTROL_CHARS, '').trim().slice(0, max);
}

export function num(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function bool(value: unknown): 0 | 1 {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}
