'use client';

import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Shared masthead for the inner pages: the title rises out of a clipped band. */
export default function PageHeader({
  eyebrow,
  title,
  lede,
  meta = [],
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  meta?: { label: string; value: string }[];
}) {
  return (
    <header className="shell relative pb-14 pt-36 sm:pt-44">
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -top-10 left-1/4 h-80 w-80 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(121,230,255,0.28), transparent 65%)' }}
      />

      <motion.p
        className="eyebrow relative"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        {eyebrow}
      </motion.p>

      <h1 className="display relative mt-5 overflow-hidden text-[clamp(2.8rem,9vw,6.5rem)]">
        <motion.span
          className="block"
          initial={{ y: '110%', rotate: 4 }}
          animate={{ y: '0%', rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.04, ease: EASE }}
        >
          {title}
        </motion.span>
      </h1>

      {lede && (
        <motion.p
          className="lede relative mt-6 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.14, ease: EASE }}
        >
          {lede}
        </motion.p>
      )}

      {meta.length > 0 && (
        <motion.dl
          className="relative mt-9 flex flex-wrap gap-x-10 gap-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.24 }}
        >
          {meta.map((entry) => (
            <div key={entry.label}>
              <dt className="eyebrow !text-[0.56rem]">{entry.label}</dt>
              <dd className="display mt-1.5 text-[1.7rem] text-white">{entry.value}</dd>
            </div>
          ))}
        </motion.dl>
      )}
    </header>
  );
}
