'use client';

import Image from 'next/image';
import Link from 'next/link';
import { EyeOff, Plus, Search, Star, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Spinner, useToast } from './ui';
import { cropStyle, formatItemId, formatPrice, isUncropped, mediaUrl } from '@/lib/utils';
import type { ProductWithImages } from '@/lib/types';

export default function ProductsList() {
  const { notify } = useToast();

  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [nextItemId, setNextItemId] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/products?q=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not load products.');

        setProducts(data.products);
        setNextItemId(data.nextItemId);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not load products.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  // Debounced so typing an item number does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <div>
          <h1 className="text-[1.15rem] font-semibold">Products</h1>
          <p className="text-[0.78rem] text-[color:var(--a-muted)]">
            {loading ? 'Loading' : `${products.length} item${products.length === 1 ? '' : 's'}`}
            {!loading && !query && `, next free reference is ${formatItemId(nextItemId)}`}
          </p>
        </div>

        <Link href="/admin/products/new" className="a-btn a-btn-primary">
          <Plus size={15} />
          New product
        </Link>
      </div>

      <div className="a-card mb-4 flex items-center gap-2.5 px-3 py-2">
        <Search size={15} className="shrink-0 text-[color:var(--a-faint)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by item ID, name, material or collection"
          className="w-full bg-transparent text-[0.88rem] outline-none placeholder:text-[color:var(--a-faint)]"
          aria-label="Search products"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="a-btn a-btn-quiet !px-1.5 !py-1">
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid place-items-center py-24">
          <Spinner size={20} />
        </div>
      ) : products.length === 0 ? (
        <div className="a-card px-6 py-16 text-center">
          <p className="text-[1rem] font-medium">{query ? 'Nothing matches that search.' : 'No products yet.'}</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.84rem] text-[color:var(--a-muted)]">
            {query
              ? 'Try an item number on its own, or clear the search.'
              : 'Add your first piece and it appears in the public catalogue straight away.'}
          </p>
          {!query && (
            <Link href="/admin/products/new" className="a-btn a-btn-primary mt-5">
              <Plus size={15} />
              Add a product
            </Link>
          )}
        </div>
      ) : (
        <ul className="a-card overflow-hidden">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/admin/products/${product.id}`} className="a-row">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-[color:var(--a-bg)]">
                  {product.images[0] ? (
                    product.images[0].fit_mode === 'fit' && isUncropped(product.images[0]) ? (
                      <Image src={mediaUrl(product.images[0].file)} alt="" fill sizes="48px" className="object-contain" />
                    ) : (
                      <span className="block" style={cropStyle(product.images[0])}>
                        <Image src={mediaUrl(product.images[0].file)} alt="" fill sizes="96px" className="object-fill" />
                      </span>
                    )
                  ) : (
                    <span className="grid h-full place-items-center text-[0.55rem] uppercase tracking-wide text-[color:var(--a-faint)]">
                      None
                    </span>
                  )}
                </span>

                <span className="a-ref w-14 shrink-0">{formatItemId(product.item_id)}</span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-medium">{product.name}</span>
                  <span className="block truncate text-[0.76rem] text-[color:var(--a-faint)]">
                    {product.category_name ?? 'Uncategorised'}
                    {product.images.length > 1 && `, ${product.images.length} images`}
                    {product.specs.length > 0 && `, ${product.specs.length} specs`}
                  </span>
                </span>

                <span className="hidden shrink-0 items-center gap-2 sm:flex">
                  {product.featured === 1 && (
                    <span className="a-chip">
                      <Star size={10} className="fill-current text-[color:var(--a-accent)]" />
                      Best seller
                    </span>
                  )}
                  {product.visible === 0 && (
                    <span className="a-chip">
                      <EyeOff size={10} />
                      Hidden
                    </span>
                  )}
                </span>

                <span className="w-20 shrink-0 text-right text-[0.82rem] text-[color:var(--a-muted)]">
                  {product.price != null ? formatPrice(product.price, product.currency) : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
