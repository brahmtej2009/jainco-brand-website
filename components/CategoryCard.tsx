'use client';

import Image from 'next/image';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { PointerEvent } from 'react';
import { GlassLink } from './RouteTransition';
import { mediaUrl } from '@/lib/utils';
import type { CategoryWithCount } from '@/lib/types';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CategoryCard({
  category,
  index = 0,
  featured = false,
}: {
  category: CategoryWithCount;
  index?: number;
  featured?: boolean;
}) {
  // Pointer-tracked tilt: the card leans towards the cursor like a pane being turned.
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 22 });
  const glareX = useSpring(useMotionValue(50), { stiffness: 160, damping: 24 });
  const glareY = useSpring(useMotionValue(50), { stiffness: 160, damping: 24 });

  const glare = useMotionTemplate`radial-gradient(280px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.22), transparent 70%)`;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    rotateY.set((x - 0.5) * 12);
    rotateX.set((0.5 - y) * 12);
    glareX.set(x * 100);
    glareY.set(y * 100);
  }

  function handleLeave() {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1, delay: Math.min(index, 6) * 0.09, ease: EASE }}
      style={{ perspective: 1200 }}
      className={featured ? 'sm:col-span-2' : undefined}
    >
      <motion.div
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileTap={{ scale: 0.985 }}
      >
        <GlassLink
          href={`/catalog/${category.slug}`}
          className="group glass-lite relative block overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: featured ? '16 / 9' : '4 / 3' }}
          >
            {category.cover_image ? (
              <Image
                src={mediaUrl(category.cover_image)}
                alt={category.name}
                fill
                sizes={featured ? '(max-width: 900px) 92vw, 62vw' : '(max-width: 900px) 92vw, 31vw'}
                className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
              />
            ) : (
              <div
                className="h-full w-full animate-drift"
                style={{
                  background:
                    'conic-gradient(from 200deg at 40% 30%, rgba(121,230,255,0.55), rgba(91,140,255,0.42), rgba(255,255,255,0.22), rgba(58,169,214,0.5), rgba(121,230,255,0.55))',
                }}
              />
            )}

            {/* A photograph needs a heavier scrim than the generated placeholder does. */}
            <div
              className="absolute inset-0"
              style={{
                background: category.cover_image
                  ? 'linear-gradient(180deg, rgba(4,7,14,0.15) 0%, rgba(4,7,14,0.35) 45%, rgba(4,7,14,0.9) 100%)'
                  : 'linear-gradient(180deg, rgba(4,7,14,0.05) 0%, rgba(4,10,20,0.28) 52%, rgba(4,7,14,0.86) 100%)',
              }}
            />

            {/* Sheet of light that follows the cursor across the pane. */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: glare }}
            />
          </div>

          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6"
            style={{ transform: 'translateZ(45px)' }}
          >
            <div className="min-w-0">
              <p className="eyebrow !text-[0.58rem]">
                {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
              </p>
              <h3 className="display mt-2 text-[clamp(1.5rem,3.4vw,2.3rem)] leading-none text-white">
                {category.name}
              </h3>
              {category.tagline && (
                <p className="mt-2 max-w-sm text-[0.82rem] text-[color:var(--muted)] line-clamp-2">
                  {category.tagline}
                </p>
              )}
            </div>

            <span className="glass-lite grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all duration-500 group-hover:bg-white/15">
              <ArrowUpRight
                size={17}
                className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </GlassLink>
      </motion.div>
    </motion.div>
  );
}
