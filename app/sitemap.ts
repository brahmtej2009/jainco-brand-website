import type { MetadataRoute } from 'next';
import { allProductItemIds, listCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const BASE = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/catalog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...listCategories().map((category) => ({
      url: `${BASE}/catalog/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...allProductItemIds().map((itemId) => ({
      url: `${BASE}/product/${itemId}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
