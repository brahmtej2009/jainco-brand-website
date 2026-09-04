import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/db';
import { MAX_PIXELS, MAX_UPLOAD_BYTES, sniffImage } from '@/lib/image-meta';
import { fail, json, withAdmin } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

const MAX_FILES = 12;
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES * MAX_FILES;

export const POST = withAdmin(async (admin, request: NextRequest) => {
  // Refuse an oversized request before any of it is buffered into memory.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return fail('That upload is too large.', 413);
  }

  if (!rateLimit(`upload:${admin.id}:${clientKey(request)}`, 120, 10 * 60_000)) {
    return fail('Too many uploads in a short time. Try again in a few minutes.', 429);
  }

  const form = await request.formData();
  const uploads = form.getAll('file').filter((entry): entry is File => entry instanceof File);

  if (!uploads.length) return fail('No file received.', 400);
  if (uploads.length > MAX_FILES) return fail(`Upload up to ${MAX_FILES} images at a time.`, 400);

  const saved: { file: string; width: number; height: number }[] = [];
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  for (const upload of uploads) {
    if (upload.size > MAX_UPLOAD_BYTES) {
      return fail(`"${sanitiseName(upload.name)}" is larger than 8 MB.`, 413);
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return fail(`"${sanitiseName(upload.name)}" is larger than 8 MB.`, 413);
    }

    // The filename and the browser's content-type are ignored; the bytes decide.
    const sniffed = sniffImage(buffer);
    if (!sniffed) {
      return fail(`"${sanitiseName(upload.name)}" is not a JPG, PNG, WebP or GIF image.`, 415);
    }

    // A small file can still declare enormous dimensions; decoding one would exhaust memory.
    if (sniffed.width * sniffed.height > MAX_PIXELS) {
      return fail(`"${sanitiseName(upload.name)}" has an unreasonable pixel size.`, 413);
    }

    // Server-generated name: nothing user-controlled reaches the filesystem.
    const filename = `${crypto.randomUUID()}.${sniffed.ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx' });

    saved.push({ file: filename, width: sniffed.width, height: sniffed.height });
  }

  return json({ files: saved }, 201);
});

/** The client-supplied name is only ever echoed in an error message, never stored. */
function sanitiseName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 60) || 'file';
}
