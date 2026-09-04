import { NextResponse, type NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/db';
import { MIME_BY_EXT, SAFE_FILENAME } from '@/lib/image-meta';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ file: string }> };

const notFound = () => new NextResponse('Not found', { status: 404 });

export async function GET(_request: NextRequest, ctx: Ctx) {
  let file: string;
  try {
    file = decodeURIComponent((await ctx.params).file);
  } catch {
    return notFound();
  }

  // Only names our own upload route can mint are servable, which rules out traversal
  // and any attempt to reach the database file sitting one directory up.
  if (!SAFE_FILENAME.test(file)) return notFound();

  const resolved = path.resolve(UPLOAD_DIR, file);
  if (path.dirname(resolved) !== path.resolve(UPLOAD_DIR)) return notFound();

  try {
    const data = await fs.readFile(resolved);
    const ext = file.split('.').pop() as string;

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME_BY_EXT[ext] ?? 'application/octet-stream',
        'Content-Length': String(data.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        // Belt and braces: even a polyglot file cannot pull in or run anything.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch {
    return notFound();
  }
}
