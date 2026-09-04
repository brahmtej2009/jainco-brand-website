import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { listCategories } from '@/lib/queries';
import { bool, json, str, withAdmin } from '@/lib/api';
import { ValidationError, readJson } from '@/lib/security';
import { isStoredFilename } from '@/lib/media';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => json({ categories: listCategories(true) }));

export const POST = withAdmin(async (_admin, request: NextRequest) => {
  const body = await readJson(request);

  const name = str(body.name, 120);
  if (!name) throw new ValidationError('Category name is required.');

  const cover = body.cover_image;
  if (cover != null && cover !== '' && !isStoredFilename(cover)) {
    throw new ValidationError('That cover image is not a valid upload.');
  }

  const base = slugify(name) || 'category';
  let slug = base;
  let n = 2;
  while (db().prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) slug = `${base}-${n++}`;

  const position =
    (db().prepare('SELECT COALESCE(MAX(position), 0) AS m FROM categories').get() as { m: number }).m + 1;

  const info = db()
    .prepare(
      `INSERT INTO categories (name, slug, tagline, description, cover_image, position, visible)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      slug,
      str(body.tagline, 200),
      str(body.description, 4000),
      isStoredFilename(cover) ? cover : null,
      Number(body.position) || position,
      body.visible === undefined ? 1 : bool(body.visible),
    );

  return json({ id: Number(info.lastInsertRowid), slug }, 201);
});
