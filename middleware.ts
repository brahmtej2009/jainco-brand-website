import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sets a per-request Content-Security-Policy. Next.js picks the nonce up from the request
 * header and stamps it onto its own bootstrap scripts, so no inline script can run unless
 * it came from this server on this request.
 *
 * `style-src` has to allow inline styles: React and Framer Motion both write element
 * styles directly. Inline styles cannot execute code, so this is the normal trade-off.
 */
export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const dev = process.env.NODE_ENV !== 'production';

  const csp = [
    "default-src 'self'",
    // Dev needs eval for React Refresh; production does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ''}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers } });

  response.headers.set('content-security-policy', csp);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set(
    'permissions-policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );

  // The dashboard and everything behind it stays out of search results.
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    response.headers.set('cache-control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next's own static output and the favicon.
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
};
