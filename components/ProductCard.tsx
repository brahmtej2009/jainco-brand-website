'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { GlassLink } from './RouteTransition';
import { cropStyle, displayRatio, formatItemId, formatPrice, isUncropped, mediaUrl } from '@/lib/utils';
import type { ProductWithImages } from '@/lib/types';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ProductCard({
  product,
  index = 0,
  priority = false,
  uniform = false,
}: {
  product: ProductWithImages;
  index?: number;
  priority?: boolean;
  /** Forces the standard tile ratio, used where a row of cards should line up exactly. */
  uniform?: boolean;
}) {
  const cover = product.images[0];
  const price = formatPrice(product.price, product.currency);

  // Only a genuinely uncropped "Original" photo keeps its own shape; every other case
  // (Fill, or Fit locked to a chosen ratio) has already been cropped to a known rectangle.
  const original = Boolean(cover && cover.fit_mode === 'fit' && isUncropped(cover));
  const ratio = cover ? (uniform && !original ? 0.8 : displayRatio(cover)) : 0.8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: Math.min(index, 8) * 0.05, ease: EASE }}
    >
      <GlassLink
        href={`/product/${product.item_id}`}
        className="group glass-lite sheen block overflow-hidden p-2.5 transition-transform duration-700 hover:-translate-y-1.5"
        aria-label={`${product.name}, item ${formatItemId(product.item_id)}`}
      >
        <div
          className="relative overflow-hidden rounded-[16px] bg-white/[0.03]"
          style={{ aspectRatio: ratio }}
        >
          {/* The catalogue reference: the number a customer quotes when enquiring. */}
          <span className="item-id">{formatItemId(product.item_id)}</span>

          {cover ? (
            original ? (
              <Image
                src={mediaUrl(cover.file)}
                alt={cover.alt || product.name}
                fill
                sizes="(max-width: 480px) 92vw, (max-width: 900px) 46vw, (max-width: 1360px) 30vw, 22vw"
                className="object-contain transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                priority={priority}
              />
            ) : (
              // The chosen crop is scaled up to fill the tile exactly, without distortion.
              <div
                className="transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                style={cropStyle(cover)}
              >
                <Image
                  src={mediaUrl(cover.file)}
                  alt={cover.alt || product.name}
                  fill
                  sizes="(max-width: 480px) 120vw, (max-width: 900px) 60vw, 40vw"
                  className="object-fill"
                  priority={priority}
                />
              </div>
            )
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white/[0.07] to-transparent">
              <span className="eyebrow !text-[0.55rem]">No image yet</span>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(4,10,20,0.75) 100%)' }}
          />
        </div>

        <div className="flex items-start justify-between gap-3 px-1.5 pb-1 pt-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-[0.94rem] font-medium text-white/95">{product.name}</h3>
            {product.summary && (
              <p className="mt-1 truncate text-[0.76rem] text-[color:var(--faint)]">{product.summary}</p>
            )}
          </div>

          {price && (
            <span className="shrink-0 pt-0.5 text-[0.86rem] font-medium text-[color:var(--aqua)]">{price}</span>
          )}
        </div>
      </GlassLink>
    </motion.div>
  );
}
