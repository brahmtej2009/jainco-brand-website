'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import type { ProductWithImages } from '@/lib/types';

type Sort = 'reference' | 'name' | 'newest';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'reference', label: 'Reference' },
  { key: 'name', label: 'Name' },
  { key: 'newest', label: 'Newest' },
];

export default function CategoryGallery({ products }: { products: ProductWithImages[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('reference');

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    const filtered = term
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(term) ||
            product.summary.toLowerCase().includes(term) ||
            String(product.item_id).includes(term),
        )
      : products;

    const sorted = [...filtered];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'newest') sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else sorted.sort((a, b) => a.position - b.position || a.item_id - b.item_id);

    return sorted;
  }, [products, query, sort]);

  return (
    <>
      <div className="shell flex flex-wrap items-center justify-between gap-4 pb-8">
        <div className="glass flex min-w-[240px] flex-1 items-center gap-3 px-4 py-2.5 sm:max-w-xs">
          <Search size={15} className="shrink-0 text-[color:var(--faint)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or item number"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            aria-label="Search within this collection"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} className="text-[color:var(--faint)] transition-colors hover:text-white" />
            </button>
          )}
        </div>

        <div className="glass flex items-center gap-1 p-1">
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSort(option.key)}
              className="relative rounded-full px-3.5 py-1.5 text-[0.72rem] uppercase tracking-[0.12em] transition-colors"
              style={{ color: sort === option.key ? '#fff' : 'var(--faint)' }}
            >
              {sort === option.key && (
                <motion.span
                  layoutId="sort-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-white/10"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(210,245,255,0.28)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="shell pb-10">
        <AnimatePresence mode="popLayout">
          {visible.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass px-8 py-20 text-center"
            >
              <p className="display text-[1.7rem]">Nothing matches that search.</p>
              <p className="lede mx-auto mt-3 max-w-sm">
                Try an item number on its own, or clear the search to see the whole collection. If you
                are looking for something specific, tell us and we will find it for you.
              </p>
            </motion.div>
          ) : (
            <motion.div key={`${sort}-${query}`} className="masonry" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {visible.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} priority={index < 4} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
