'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GlassLink } from './RouteTransition';
import { cropStyle, formatItemId, formatPrice, isUncropped, mediaUrl } from '@/lib/utils';

type Result = {
  item_id: number;
  name: string;
  summary: string;
  category_name: string | null;
  price: number | null;
  currency: string;
  reason: string;
  image: {
    file: string;
    crop_x: number;
    crop_y: number;
    crop_w: number;
    crop_h: number;
    fit_mode: string;
    alt: string;
  } | null;
};

type Collection = { id: number; name: string; slug: string; product_count: number };

export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Result[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    const focus = window.setTimeout(() => inputRef.current?.focus(), 80);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.clearTimeout(focus);
    };
  }, [open, onClose]);

  // Debounced so a fast typist does not fire a request per keystroke.
  useEffect(() => {
    if (!open) return;

    const term = query.trim();
    if (term.length < 2) {
      setProducts([]);
      setCollections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setProducts(data.products ?? []);
        setCollections(data.categories ?? []);
      } catch {
        // An aborted request is the normal case while typing.
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  if (!mounted) return null;

  const term = query.trim();
  const empty = term.length >= 2 && !loading && !products.length && !collections.length;

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2147482000] flex items-start justify-center p-4 pt-[12svh] sm:p-8 sm:pt-[14svh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal
          aria-label="Search the catalogue"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(3,6,12,0.86)', backdropFilter: 'blur(20px)' }}
            onClick={onClose}
          />

          <motion.div
            className="glass relative flex max-h-[74svh] w-full max-w-2xl flex-col overflow-hidden"
            initial={{ opacity: 0, y: -16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search size={17} className="shrink-0 text-[color:var(--aqua)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a piece, a collection or an item number"
                className="w-full bg-transparent text-[0.98rem] text-white outline-none placeholder:text-white/35"
                aria-label="Search the catalogue"
              />
              <button type="button" onClick={onClose} className="shrink-0 text-white/45 hover:text-white" aria-label="Close search">
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {term.length < 2 && (
                <p className="px-3 py-8 text-center text-[0.84rem] text-[color:var(--faint)]">
                  Try a shape, a material, a use, or a reference number. Close spellings are fine.
                </p>
              )}

              {empty && (
                <div className="px-3 py-8 text-center">
                  <p className="text-[0.95rem] text-white/85">Nothing matched &ldquo;{term}&rdquo;.</p>
                  <p className="mt-2 text-[0.82rem] text-[color:var(--faint)]">
                    Tell us what you are after and we will find it for you.
                  </p>
                  <GlassLink href="/contact" onClick={onClose} className="btn btn-ghost mt-5 !px-5 !py-2.5">
                    Contact us
                  </GlassLink>
                </div>
              )}

              {collections.length > 0 && (
                <div className="mb-2">
                  <p className="eyebrow px-3 py-2 !text-[0.55rem]">Collections</p>
                  <div className="flex flex-wrap gap-2 px-3 pb-2">
                    {collections.map((collection) => (
                      <GlassLink
                        key={collection.id}
                        href={`/catalog/${collection.slug}`}
                        onClick={onClose}
                        className="glass px-4 py-2 text-[0.82rem] text-[color:var(--muted)] transition-colors hover:text-white"
                      >
                        {collection.name}
                        <span className="ml-2 text-[0.7rem] text-white/30">{collection.product_count}</span>
                      </GlassLink>
                    ))}
                  </div>
                </div>
              )}

              {products.length > 0 && (
                <>
                  <p className="eyebrow px-3 py-2 !text-[0.55rem]">Products</p>
                  <ul>
                    {products.map((result) => (
                      <li key={result.item_id}>
                        <GlassLink
                          href={`/product/${result.item_id}`}
                          onClick={onClose}
                          className="flex items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
                            {result.image ? (
                              result.image.fit_mode === 'fit' && isUncropped(result.image) ? (
                                <Image src={mediaUrl(result.image.file)} alt="" fill sizes="56px" className="object-contain" />
                              ) : (
                                <span className="block" style={cropStyle(result.image)}>
                                  <Image src={mediaUrl(result.image.file)} alt="" fill sizes="112px" className="object-fill" />
                                </span>
                              )
                            ) : null}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                              <span className="truncate text-[0.92rem] font-medium text-white">{result.name}</span>
                              <span className="shrink-0 font-mono text-[0.72rem] text-[#ff7a7a]">
                                {formatItemId(result.item_id)}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[0.76rem] text-[color:var(--faint)]">
                              {result.reason}
                              {result.category_name ? ` · ${result.category_name}` : ''}
                            </span>
                          </span>

                          {result.price != null && (
                            <span className="shrink-0 text-[0.82rem] text-[color:var(--aqua)]">
                              {formatPrice(result.price, result.currency)}
                            </span>
                          )}
                        </GlassLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}
