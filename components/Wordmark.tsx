'use client';

import { motion } from 'framer-motion';

/** Prism mark + wordmark. The mark's inner facet slowly catches light. */
export default function Wordmark({ condensed = false }: { condensed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <motion.svg
        width="30"
        height="30"
        viewBox="0 0 40 40"
        fill="none"
        animate={{ rotate: condensed ? 0 : [0, 4, 0, -4, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        <defs>
          <linearGradient id="mark-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#79e6ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#5b8cff" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="mark-b" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#79e6ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        <path d="M20 2.6 34.8 11v18L20 37.4 5.2 29V11Z" fill="url(#mark-b)" stroke="url(#mark-a)" strokeWidth="1.3" />
        <path d="M20 2.6V37.4M5.2 11 34.8 29M34.8 11 5.2 29" stroke="url(#mark-a)" strokeWidth="0.65" opacity="0.5" />
        <motion.path
          d="M20 11.4 27.6 15.7v8.6L20 28.6l-7.6-4.3v-8.6Z"
          fill="url(#mark-a)"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.svg>

      <span className="flex flex-col leading-none">
        <span className="text-[1.02rem] font-semibold tracking-[0.34em] text-white">JAINCO</span>
        <motion.span
          className="overflow-hidden text-[0.53rem] font-medium uppercase tracking-[0.26em]"
          style={{ color: 'var(--faint)' }}
          animate={{ height: condensed ? 0 : 12, opacity: condensed ? 0 : 1, marginTop: condensed ? 0 : 3 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Home &amp; Gifting
        </motion.span>
      </span>
    </span>
  );
}
