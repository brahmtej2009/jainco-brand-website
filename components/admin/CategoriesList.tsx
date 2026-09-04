'use client';

import Image from 'next/image';
import Link from 'next/link';
import { EyeOff, Plus } from 'lucide-react';
import { mediaUrl } from '@/lib/utils';
import type { CategoryWithCount } from '@/lib/types';

export default function CategoriesList({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[1.15rem] font-semibold">Collections</h1>
          <p className="text-[0.78rem] text-[color:var(--a-muted)]">
            The top level of the catalogue. Lower sort positions appear first.
          </p>
        </div>

        <Link href="/admin/categories/new" className="a-btn a-btn-primary">
          <Plus size={15} />
          New collection
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="a-card px-6 py-16 text-center">
          <p className="text-[1rem] font-medium">No collections yet.</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.84rem] text-[color:var(--a-muted)]">
            Create one, such as drinkware, jars or bowls, then assign products to it.
          </p>
          <Link href="/admin/categories/new" className="a-btn a-btn-primary mt-5">
            <Plus size={15} />
            Add a collection
          </Link>
        </div>
      ) : (
        <ul className="a-card overflow-hidden">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/admin/categories/${category.id}`} className="a-row">
                <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-[color:var(--a-bg)]">
                  {category.cover_image ? (
                    <Image
                      src={mediaUrl(category.cover_image)}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[0.55rem] uppercase tracking-wide text-[color:var(--a-faint)]">
                      No cover
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-medium">{category.name}</span>
                  <span className="block truncate text-[0.76rem] text-[color:var(--a-faint)]">
                    /{category.slug}
                  </span>
                </span>

                {category.visible === 0 && (
                  <span className="a-chip shrink-0">
                    <EyeOff size={10} />
                    Hidden
                  </span>
                )}

                <span className="w-24 shrink-0 text-right text-[0.8rem] text-[color:var(--a-muted)]">
                  {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
                </span>

                <span className="w-10 shrink-0 text-right font-mono text-[0.76rem] text-[color:var(--a-faint)]">
                  {category.position}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
