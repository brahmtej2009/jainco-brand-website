import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bool, json, str, withAdmin, type RouteContext } from '@/lib/api';
import { ValidationError, readJson, routeId } from '@/lib/security';
import { isStoredFilename, sweepOrphanedUploads } from '@/lib/media';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';

type Params = { id: string };

export const PATCH = withAdmin<Params>(async (_admin, request: NextRequest, ctx: RouteContext<Params>) => {
  const id = routeId((await ctx.params).id);

  const existing = db().prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!existing) throw new ValidationError('Category not found.');

  const body = await readJson(request);

  const name = str(body.name, 120);
  if (!name) throw new ValidationError('Category name is required.');

  const cover = body.cover_image;
  if (cover != null && cover !== '' && !isStoredFilename(cover)) {
    throw new ValidationError('That cover image is not a valid upload.');
  }

  const base = slugify(name) || `category-${id}`;
  let slug = base;
  let n = 2;
  while (db().prepare('SELECT 1 FROM categories WHERE slug = ? AND id != ?').get(slug, id)) slug = `${base}-${n++}`;

  db()
    .prepare(
      `UPDATE categories
          SET name = ?, slug = ?, tagline = ?, description = ?, cover_image = ?, position = ?, visible = ?
        WHERE id = ?`,
    )
    .run(
      name,
      slug,
      str(body.tagline, 200),
      str(body.description, 4000),
      isStoredFilename(cover) ? cover : null,
      Number(body.position) || 0,
      bool(body.visible),
      id,
    );

  await sweepOrphanedUploads();
  return json({ ok: true, slug });
});

export const DELETE = withAdmin<Params>(async (_admin, _request: NextRequest, ctx: RouteContext<Params>) => {
  const id = routeId((await ctx.params).id);

  // Products survive: the foreign key clears their category so nothing is lost by accident.
  db().prepare('DELETE FROM categories WHERE id = ?').run(id);
  await sweepOrphanedUploads();

  return json({ ok: true });
});
