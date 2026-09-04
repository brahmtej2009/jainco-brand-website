'use client';

import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { GlassLink } from './RouteTransition';

const EASE = [0.22, 1, 0.36, 1] as const;
const TITLE = 'JainCo';

const SHARDS = [
  { w: 300, h: 200, top: '15%', left: '4%', depth: 34, delay: 0, rotate: -3 },
  { w: 180, h: 250, top: '47%', left: '81%', depth: -46, delay: 0.4, rotate: 2.5 },
  { w: 150, h: 150, top: '72%', left: '13%', depth: 26, delay: 0.7, rotate: 4 },
  { w: 230, h: 155, top: '11%', left: '69%', depth: -30, delay: 1, rotate: -2 },
];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Scroll parallax: the video and the copy drift apart as the page moves on.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.22]);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-40%']);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const veil = useTransform(scrollYProgress, [0, 1], [0.72, 1]);

  // Pointer parallax for the floating shards and the specular highlight.
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 60, damping: 20, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 60, damping: 20, mass: 0.6 });

  const spotlight = useTransform(
    [smoothX, smoothY],
    ([x, y]: number[]) =>
      `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(121,230,255,0.20), transparent 65%)`,
  );

  // One transform pair per shard, declared up front so the hook order never shifts.
  const shardX = [
    useTransform(smoothX, (v) => (v - 0.5) * SHARDS[0].depth),
    useTransform(smoothX, (v) => (v - 0.5) * SHARDS[1].depth),
    useTransform(smoothX, (v) => (v - 0.5) * SHARDS[2].depth),
    useTransform(smoothX, (v) => (v - 0.5) * SHARDS[3].depth),
  ];
  const shardY = [
    useTransform(smoothY, (v) => (v - 0.5) * SHARDS[0].depth),
    useTransform(smoothY, (v) => (v - 0.5) * SHARDS[1].depth),
    useTransform(smoothY, (v) => (v - 0.5) * SHARDS[2].depth),
    useTransform(smoothY, (v) => (v - 0.5) * SHARDS[3].depth),
  ];

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointerX.set(event.clientX / window.innerWidth);
      pointerY.set(event.clientY / window.innerHeight);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [pointerX, pointerY]);

  // Autoplay is refused or silently paused in a few situations: a policy block on first
  // load, and any time the tab is backgrounded. Nudge it back whenever that happens.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resume = () => {
      // A cached video can be ready before React hydrates, so its events never reach us.
      if (video.readyState >= 2) setVideoReady(true);
      if (!video.paused || document.hidden) return;
      video.muted = true;
      void video.play().catch(() => {});
    };

    resume();
    video.addEventListener('loadeddata', resume);
    video.addEventListener('canplay', resume);
    video.addEventListener('pause', resume);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pointerdown', resume, { once: true });

    return () => {
      video.removeEventListener('loadeddata', resume);
      video.removeEventListener('canplay', resume);
      video.removeEventListener('pause', resume);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pointerdown', resume);
    };
  }, []);

  // `isolate` keeps the negative-z video layers inside this section rather than letting
  // them fall behind the page background gradient.
  return (
    <section
      ref={sectionRef}
      className="relative isolate w-full overflow-hidden"
      style={{ height: '100svh', minHeight: '540px' }}
    >
      {/* ---------- video plate ---------- */}
      <motion.div className="absolute inset-0 -z-20" style={{ y: videoY, scale: videoScale }}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ filter: 'brightness(0.55) saturate(1.1) contrast(1.05)' }}
          src="/background.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          onCanPlay={() => setVideoReady(true)}
        />
      </motion.div>

      {/* Holds the frame while the video decodes, so the hero never flashes white. */}
      <motion.div
        className="absolute inset-0 -z-20"
        style={{
          background: 'linear-gradient(160deg, #071a2c 0%, #04101d 45%, #04070e 100%)',
        }}
        animate={{ opacity: videoReady ? 0 : 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      />

      {/* ---------- legibility veils ---------- */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{
          opacity: veil,
          background:
            'linear-gradient(180deg, rgba(4,7,14,0.72) 0%, rgba(4,10,20,0.4) 42%, rgba(4,7,14,0.86) 100%)',
        }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(80% 65% at 50% 46%, rgba(4,7,14,0.28) 20%, rgba(4,7,14,0.72) 100%)' }}
      />

      {/* Dissolves the bright video into the dark page below, so the join is invisible. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[34%]"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(4,7,14,0.72) 58%, #04070e 100%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32"
        style={{ background: 'linear-gradient(180deg, rgba(4,7,14,0.78), transparent)' }}
      />

      {/* Specular highlight that tracks the pointer across the glass. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
        style={{ background: spotlight }}
      />

      {/* ---------- floating shards ---------- */}
      {SHARDS.map((shard, index) => (
        <motion.div
          key={index}
          aria-hidden
          className="pointer-events-none absolute hidden lg:block"
          style={{
            top: shard.top,
            left: shard.left,
            width: shard.w,
            height: shard.h,
            x: shardX[index],
            y: shardY[index],
            rotate: shard.rotate,
            borderRadius: '26px',
            // Thin, bright-edged and barely tinted, so the pane reveals the video behind it.
            background:
              'linear-gradient(148deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.02) 46%, rgba(205,246,255,0.06) 100%)',
            backdropFilter: 'blur(9px) saturate(150%) brightness(1.08)',
            WebkitBackdropFilter: 'blur(9px) saturate(150%) brightness(1.08)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(140,210,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.13), 0 50px 100px -60px rgba(0,0,0,0.95)',
          }}
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{
            opacity: 1,
            scale: 1,
            translateY: [0, -16, 0],
          }}
          transition={{
            opacity: { duration: 1.4, delay: 0.6 + shard.delay, ease: EASE },
            scale: { duration: 1.4, delay: 0.6 + shard.delay, ease: EASE },
            filter: { duration: 1.4, delay: 0.6 + shard.delay, ease: EASE },
            translateY: { duration: 11 + index * 2.5, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      ))}

      {/* ---------- copy ---------- */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-16 pt-28 text-center sm:pt-32"
        style={{ y: copyY, opacity: copyOpacity }}
      >
        <div className="relative mt-8 sm:mt-10">
          {/* Pool of shadow and light directly behind the name, so it reads at any brightness. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[125%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                'radial-gradient(closest-side, rgba(4,7,14,0.78) 0%, rgba(4,7,14,0.55) 45%, transparent 78%)',
              filter: 'blur(26px)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[95%] w-[70%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background: 'radial-gradient(closest-side, rgba(121,230,255,0.22) 0%, transparent 75%)',
              filter: 'blur(34px)',
            }}
          />

          <h1
            className="display text-[clamp(3.8rem,15vw,12rem)]"
            style={{ lineHeight: 1.16, paddingBottom: '0.1em' }}
            aria-label="JainCo"
          >
            <span className="sr-only">JainCo</span>
            <span aria-hidden className="flex justify-center">
              {TITLE.split('').map((char, index) => (
                <motion.span
                  key={index}
                  className="chrome inline-block"
                  initial={{ opacity: 0, y: '40%' }}
                  animate={{ opacity: 1, y: '0%' }}
                  transition={{ duration: 0.85, delay: 0.32 + index * 0.06, ease: EASE }}
                  style={{ paddingBottom: '0.08em' }}
                >
                  {char}
                </motion.span>
              ))}
            </span>
          </h1>
        </div>

        <motion.p
          className="lede mt-6 max-w-xl text-balance"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 1.05, ease: EASE }}
        >
          Glassware, serveware, storage, home decor, gift wrap and packaging, chocolate moulds and
          baking supplies.
        </motion.p>

        <motion.div
          className="mt-7 h-px w-[min(420px,70vw)] overflow-hidden"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.1, delay: 0.9, ease: EASE }}
        >
          <motion.span
            className="block h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(121,230,255,0.15) 20%, rgba(255,255,255,0.85) 50%, rgba(121,230,255,0.15) 80%, transparent)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.div
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.25, ease: EASE }}
        >
          <GlassLink href="/catalog" className="btn btn-primary group">
            Enter the catalogue
            <ArrowRight size={15} className="transition-transform duration-500 group-hover:translate-x-1" />
          </GlassLink>
          <GlassLink href="/about" className="btn btn-ghost">
            About JainCo
          </GlassLink>
        </motion.div>

      </motion.div>

      {/* ---------- scroll hint ---------- */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.9 }}
        style={{ opacity: copyOpacity }}
      >
        <ChevronDown size={22} className="animate-scroll-hint text-[color:var(--aqua)]" aria-hidden />
      </motion.div>
    </section>
  );
}
