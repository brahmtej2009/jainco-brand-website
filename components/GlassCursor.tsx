'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, summary, [data-cursor]';

/**
 * A shard of glass in place of the pointer. It leans towards the direction of travel and
 * opens up over anything clickable. Only used where there is a real mouse, and switched
 * off entirely for readers who ask for less motion.
 */
export default function GlassCursor() {
  const [active, setActive] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const tipX = useSpring(x, { stiffness: 1100, damping: 60, mass: 0.35 });
  const tipY = useSpring(y, { stiffness: 1100, damping: 60, mass: 0.35 });

  // The halo trails a little further behind, which is what sells the weight of glass.
  const haloX = useSpring(x, { stiffness: 220, damping: 26, mass: 0.6 });
  const haloY = useSpring(y, { stiffness: 220, damping: 26, mass: 0.6 });

  const leanX = useTransform([x, haloX], ([a, b]: number[]) => a - b);
  const leanY = useTransform([y, haloY], ([a, b]: number[]) => a - b);
  const tilt = useTransform([leanX, leanY], ([dx, dy]: number[]) =>
    Math.max(-24, Math.min(24, dx * 0.35 + dy * 0.12)),
  );

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A pointer that redraws on every mouse move is a luxury. Skip it on machines that
    // report little memory or few cores, and leave them the ordinary system cursor.
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak = (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;

    if (!fine || reduced || weak) return;

    setActive(true);
    document.documentElement.classList.add('has-glass-cursor');

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setHovering(Boolean((event.target as Element | null)?.closest?.(INTERACTIVE)));
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });

    return () => {
      document.documentElement.classList.remove('has-glass-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [x, y]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483600]" aria-hidden>
      {/* soft light the shard carries with it */}
      <motion.div
        className="absolute"
        style={{
          x: haloX,
          y: haloY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          className="rounded-full"
          animate={{
            width: hovering ? 58 : 30,
            height: hovering ? 58 : 30,
            opacity: hovering ? 0.55 : 0.32,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{
            background: 'radial-gradient(circle, rgba(121,230,255,0.55), transparent 68%)',
            filter: 'blur(6px)',
          }}
        />
      </motion.div>

      {/* the shard itself */}
      <motion.svg
        width="34"
        height="38"
        viewBox="0 0 30 34"
        className="absolute"
        style={{
          x: tipX,
          y: tipY,
          rotate: tilt,
          // One shadow, not two: each one is a separate blur pass on an element that moves
          // with the mouse, so the second was pure cost for very little on screen.
          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.8))',
        }}
        animate={{ scale: pressed ? 0.82 : hovering ? 1.18 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        <defs>
          <linearGradient id="cursor-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#d6f6ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#79c6ff" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="cursor-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#79e6ff" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* A pointed shard: the tip sits exactly on the hotspot at 1,1 */}
        <path d="M1 1 L19.5 12.5 L11.8 15.4 L8.6 24.8 Z" fill="url(#cursor-face)" stroke="url(#cursor-edge)" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M1 1 L11.8 15.4" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="0.7" />
        <path d="M1 1 L8.6 24.8" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.6" />
      </motion.svg>
    </div>
  );
}
