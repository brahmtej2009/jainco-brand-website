'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Slow horizontal band of category words: motion at the edge of the eye. */
export default function Marquee({ items, speed = 46 }: { items: string[]; speed?: number }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(2);

  /**
   * The band has to be at least twice the viewport wide for the loop to be seamless,
   * otherwise the start of the sequence becomes visible on a wide or zoomed-out screen.
   * Measure one pass and repeat it as many times as the screen needs.
   */
  useEffect(() => {
    const measure = () => {
      const width = measureRef.current?.scrollWidth ?? 0;
      if (!width) return;

      setRepeats(Math.max(2, Math.ceil((window.innerWidth * 1.5) / width) + 1));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items]);

  if (!items.length) return null;

  const pass = (key: string, ref?: React.Ref<HTMLDivElement>) => (
    <div key={key} ref={ref} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={key !== 'pass-0'}>
      {items.map((item, index) => (
        <span key={`${key}-${index}`} className="flex items-center gap-10 whitespace-nowrap">
          <span className="display text-[clamp(1.6rem,4vw,2.9rem)] text-white/25">{item}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--aqua)]/50" />
        </span>
      ))}
    </div>
  );

  // Two identical halves; the animation travels exactly one half, so it never shows a seam.
  const half = Array.from({ length: repeats }, (_, i) =>
    pass(`pass-${i}`, i === 0 ? measureRef : undefined),
  );

  return (
    <div
      className="relative overflow-hidden py-6"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
    >
      <motion.div
        className="flex w-max items-center"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {half}
        {Array.from({ length: repeats }, (_, i) => pass(`echo-${i}`))}
      </motion.div>
    </div>
  );
}
