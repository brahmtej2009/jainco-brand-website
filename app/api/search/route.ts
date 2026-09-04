import type { NextRequest } from 'next/server';
import { searchCategories, searchProducts } from '@/lib/search';
import { json, str } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!rateLimit(`search:${clientKey(request)}`, 120, 60_000)) {
    return json({ products: [], categories: [], throttled: true }, 429);
  }

  const query = str(request.nextUrl.searchParams.get('q'), 120);
  if (query.length < 2) return json({ products: [], categories: [] });

  return json({
    query,
    categories: searchCategories(query),
    products: searchProducts(query, 12).map((hit) => ({
      item_id: hit.product.item_id,
      name: hit.product.name,
      summary: hit.product.summary,
      category_name: hit.product.category_name ?? null,
      price: hit.product.price,
      currency: hit.product.currency,
      image: hit.product.images[0] ?? null,
      reason: hit.reason,
    })),
  });
}
