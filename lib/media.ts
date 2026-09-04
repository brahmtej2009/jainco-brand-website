import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db, UPLOAD_DIR } from './db';
import { SAFE_FILENAME } from './image-meta';

export function isStoredFilename(name: unknown): name is string {
  return typeof name === 'string' && SAFE_FILENAME.test(name);
}

export function referencedFiles(): Set<string> {
  const images = db().prepare('SELECT file FROM product_images').all() as { file: string }[];
  const covers = db()
    .prepare('SELECT cover_image AS file FROM categories WHERE cover_image IS NOT NULL')
    .all() as { file: string }[];
  return new Set([...images, ...covers].map((r) => r.file));
}

/**
 * Files uploaded in the editor exist on disk before the product is saved. The grace period
 * means a save elsewhere in the dashboard can never delete images someone is still working on.
 */
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

/** Deletes upload files no row points at any more, so removing a product frees its disk space. */
export async function sweepOrphanedUploads(): Promise<number> {
  const keep = referencedFiles();
  const cutoff = Date.now() - ORPHAN_GRACE_MS;
  let removed = 0;

  const entries = await fs.readdir(UPLOAD_DIR).catch(() => [] as string[]);

  for (const name of entries) {
    if (!SAFE_FILENAME.test(name) || keep.has(name)) continue;

    const target = path.join(UPLOAD_DIR, name);
    const stats = await fs.stat(target).catch(() => null);
    if (!stats || stats.mtimeMs > cutoff) continue;

    await fs.unlink(target).catch(() => {});
    removed += 1;
  }

  return removed;
}
