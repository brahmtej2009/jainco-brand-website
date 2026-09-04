'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

const variants: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 34 },
    show: { opacity: 1, y: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1 },
  },
  left: {
    hidden: { opacity: 0, x: -40 },
    show: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: 40 },
    show: { opacity: 1, x: 0 },
  },
};

export default function Reveal({
  children,
  as = 'div',
  variant = 'up',
  delay = 0,
  duration = 0.62,
  amount = 0.25,
  once = true,
  className,
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'span' | 'header';
  variant?: keyof typeof variants;
  delay?: number;
  duration?: number;
  amount?: number;
  once?: boolean;
  className?: string;
}) {
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variants[variant]}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}

/** Staggers a group of Reveal-like children without hand-tuning each delay. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  variant = 'up',
  duration = 0.58,
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof variants;
  duration?: number;
}) {
  return (
    <motion.div className={className} variants={variants[variant]} transition={{ duration, ease: EASE }}>
      {children}
    </motion.div>
  );
}
