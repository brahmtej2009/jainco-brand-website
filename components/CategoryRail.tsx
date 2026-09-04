'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, MoveRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GlassLink } from './RouteTransition';
import { mediaUrl } from '@/lib/utils';
import type { CategoryWithCount } from '@/lib/types';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A gallery of collections that pans sideways as the reader scrolls down. The section
 * pins itself, moves through the collections one pixel of pan per pixel of scroll, then
 * holds on the last card for a moment before the page carries on downwards.
 */
export default function CategoryRail({ categories }: { categories: CategoryWithCount[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [distance, setDistance] = useState(0);
  const [hold, setHold] = useState(0);
  const [enabled, setEnabled] = useState(false);

  // Measure how far the row has to travel. On narrow screens, and for readers who ask for
  // less motion, a plain swipeable row is easier to use than a pinned section.
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;

      const wide = window.matchMedia('(min-width: 900px)').matches;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setEnabled(wide && !reduced);
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth));
      // Extra runway once the last card has arrived, so nobody scrolls past it by accident.
      setHold(Math.round(window.innerHeight * 0.55));
    };

    measure();
    const timer = window.setTimeout(measure, 400); // once images have laid out
    window.addEventListener('resize', measure);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [categories.length]);

  const progressRef = useRef<HTMLDivElement>(null);

  /**
   * Panning is mapped one pixel of scroll to one pixel of travel, written straight to the
   * element in the scroll handler. Browsers already fire scroll at most once per frame, and
   * writing there rather than inside a requestAnimationFrame callback avoids the extra
   * frame of lag that made this feel like it was catching up with the wheel.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    if (!enabled) {
      track.style.transform = '';
      return;
    }

    const update = () => {
      const section = sectionRef.current;
      if (!section) return;

      const travelled = Math.min(Math.max(-section.getBoundingClientRect().top, 0), distance);

      track.style.transform = `translate3d(${-travelled}px, 0, 0)`;
      if (progressRef.current) {
        progressRef.current.style.width = `${distance > 0 ? (travelled / distance) * 100 : 0}%`;
      }
    };

    // Driven purely by scroll and resize. An earlier version also ran a permanent frame
    // loop as a belt-and-braces fallback, which meant a transform write every frame for as
    // long as the section was anywhere near the viewport, whether or not anything had
    // moved. On a modest machine that is a lot of work for nothing.
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled, distance]);

  if (!categories.length) return null;

  const card = (category: CategoryWithCount, index: number) => (
    <article
      key={category.id}
      className="group glass-lite relative w-[78vw] shrink-0 overflow-hidden sm:w-[44vw] lg:w-[27vw] xl:w-[24vw]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {category.cover_image ? (
          <Image
            src={mediaUrl(category.cover_image)}
            alt=""
            fill
            sizes="(max-width: 900px) 80vw, 28vw"
            className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                'conic-gradient(from 200deg at 40% 30%, rgba(121,230,255,0.5), rgba(91,140,255,0.4), rgba(255,255,255,0.2), rgba(58,169,214,0.45), rgba(121,230,255,0.5))',
            }}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(4,7,14,0.05) 0%, rgba(4,10,20,0.3) 55%, rgba(4,7,14,0.88) 100%)',
          }}
        />

        <span className="absolute left-4 top-4 text-[0.65rem] uppercase tracking-[0.22em] text-white/50">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="p-5">
        <p className="eyebrow !text-[0.56rem]">
          {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
        </p>
        <h3 className="display mt-2 text-[clamp(1.4rem,2.2vw,1.9rem)] leading-none text-white">
          {category.name}
        </h3>
        {category.tagline && (
          <p className="mt-2.5 line-clamp-2 text-[0.82rem] leading-relaxed text-[color:var(--muted)]">
            {category.tagline}
          </p>
        )}

        <GlassLink
          href={`/catalog/${category.slug}`}
          className="btn btn-ghost group/btn mt-5 !px-5 !py-2.5 !text-[0.7rem]"
        >
          View products
          <ArrowRight size={14} className="transition-transform duration-500 group-hover/btn:translate-x-1" />
        </GlassLink>
      </div>
    </article>
  );

  const heading = (
    <div className="shell">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-wrap items-end justify-between gap-6 pb-8"
      >
        <div>
          <p className="eyebrow">Collections</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.6vw,3.4rem)]">Organised the way you shop</h2>
        </div>

        <div className="flex items-center gap-4">
          {enabled && (
            <span className="hidden items-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--faint)] lg:flex">
              Keep scrolling
              <MoveRight size={14} className="text-[color:var(--aqua)]" />
            </span>
          )}
          <GlassLink href="/catalog" className="btn btn-ghost group !px-5 !py-2.5 !text-[0.7rem]">
            All collections
            <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
          </GlassLink>
        </div>
      </motion.div>
    </div>
  );

  // One section element, always carrying the scroll ref. Framer measures the scroll target
  // on mount, so swapping the element in later would leave the progress stuck at zero.
  return (
    <section
      ref={sectionRef}
      className="relative"
      style={enabled ? { height: `calc(100svh + ${distance + hold}px)` } : undefined}
      aria-label="Collections"
    >
      <div className={enabled ? 'sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden' : ''}>
        {heading}

        {enabled ? (
          <>
            <div
              ref={trackRef}
              style={{ willChange: 'transform' }}
              className="flex gap-4 pl-[max(1.25rem,calc((100vw-1150px)/2))] pr-[max(1.25rem,calc((100vw-1150px)/2))]"
            >
              {categories.map(card)}
            </div>

            <div className="shell mt-8">
              <div className="h-px w-full bg-white/10">
                <div ref={progressRef} className="h-px w-0 bg-[color:var(--aqua)]" />
              </div>
            </div>
          </>
        ) : (
          <div className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
            <div ref={trackRef} className="flex gap-4">
              {categories.map((category, index) => (
                <div key={category.id} className="snap-start">
                  {card(category, index)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
