import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { adminGetProduct } from '@/lib/queries';
import { updateProduct } from '@/lib/product-writes';
import { json, withAdmin, type RouteContext } from '@/lib/api';
import { ValidationError, readJson, routeId } from '@/lib/security';
import { sweepOrphanedUploads } from '@/lib/media';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withAdmin<Params>(async (_admin, _request: NextRequest, ctx: RouteContext<Params>) => {
  const product = adminGetProduct(routeId((await ctx.params).id));
  if (!product) throw new ValidationError('Product not found.');
  return json({ product });
});

export const PATCH = withAdmin<Params>(async (_admin, request: NextRequest, ctx: RouteContext<Params>) => {
  const id = routeId((await ctx.params).id);
  const result = updateProduct(id, await readJson(request));

  await sweepOrphanedUploads();
  return json({ ok: true, ...result });
});

export const DELETE = withAdmin<Params>(async (_admin, _request: NextRequest, ctx: RouteContext<Params>) => {
  const id = routeId((await ctx.params).id);

  db().prepare('DELETE FROM products WHERE id = ?').run(id);
  await sweepOrphanedUploads();

  return json({ ok: true });
});
