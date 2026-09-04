import type { NextRequest } from 'next/server';
import { adminListProducts, nextItemId } from '@/lib/queries';
import { createProduct } from '@/lib/product-writes';
import { json, str, withAdmin } from '@/lib/api';
import { readJson } from '@/lib/security';
import { sweepOrphanedUploads } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (_admin, request: NextRequest) => {
  const search = str(request.nextUrl.searchParams.get('q'), 120);
  return json({ products: adminListProducts(search), nextItemId: nextItemId() });
});

export const POST = withAdmin(async (_admin, request: NextRequest) => {
  const created = createProduct(await readJson(request));
  await sweepOrphanedUploads();
  return json(created, 201);
});
