'use client';

import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

type Phase = 'idle' | 'covering' | 'revealing';

type NavContext = {
  navigate: (href: string) => void;
  phase: Phase;
};

const Ctx = createContext<NavContext>({ navigate: () => {}, phase: 'idle' });

export const useGlassNav = () => useContext(Ctx);

const PANES = 7;

// Timing: each pane takes COVER_MS to fall, and they are staggered, so the screen is only
// fully covered once the last one lands. The route change waits for that moment. The panes
// then hold long enough for the incoming page to run its own entrance behind them, so what
// appears when they lift is a settled page rather than one that starts animating again.
const COVER_MS = 380;
const STAGGER_MS = 26;
const FULL_COVER_MS = COVER_MS + STAGGER_MS * (PANES - 1);
const HOLD_AFTER_ARRIVAL_MS = 430;
const EASE = [0.76, 0, 0.24, 1] as const;

/**
 * Wraps route changes in a curtain of glass panes: they fall to cover the screen,
 * the navigation happens behind them, then they lift away over the new page.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<Phase>('idle');
  const pendingRef = useRef<string | null>(null);
  const arrivedFrom = useRef(pathname);

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname || pendingRef.current) return;

      // Respect the reader's motion preference: jump straight there instead.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        router.push(href);
        return;
      }

      pendingRef.current = href;
      arrivedFrom.current = pathname;
      setPhase('covering');
      router.prefetch(href);

      // Navigate only once the panes have sealed the screen, so the swap is never seen.
      window.setTimeout(() => {
        router.push(href);
      }, FULL_COVER_MS);
    },
    [pathname, router],
  );

  // Once the new route is actually on screen, lift the panes away.
  useEffect(() => {
    if (!pendingRef.current) return;
    if (pathname === arrivedFrom.current) return;

    pendingRef.current = null;

    // Give the incoming page a frame or two to paint behind the panes before lifting them.
    const timer = window.setTimeout(() => setPhase('revealing'), HOLD_AFTER_ARRIVAL_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (phase !== 'revealing') return;
    const timer = window.setTimeout(() => setPhase('idle'), FULL_COVER_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Safety net: never leave the curtain stuck if a route fails to resolve.
  useEffect(() => {
    if (phase !== 'covering') return;
    const timer = window.setTimeout(() => {
      pendingRef.current = null;
      setPhase('revealing');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const covering = phase === 'covering';

  return (
    <Ctx.Provider value={{ navigate, phase }}>
      {/* Honours the visitor's OS "reduce motion" setting across every animation below. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>

      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            key="curtain"
            className="pointer-events-none fixed inset-0 z-[90] flex"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: PANES }).map((_, index) => (
              <motion.span
                key={index}
                className="relative h-full flex-1"
                style={{
                  // Fully opaque, so the page swap behind them is never glimpsed.
                  background:
                    'linear-gradient(180deg, #1b3a58 0%, #102337 38%, #070d18 74%, #04070e 100%)',
                  boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.16), inset -1px 0 0 rgba(0,0,0,0.6)',
                }}
                initial={{ y: covering ? '-102%' : '0%' }}
                animate={{ y: covering ? '0%' : '102%' }}
                transition={{
                  duration: COVER_MS / 1000,
                  ease: EASE,
                  delay: ((covering ? index : PANES - 1 - index) * STAGGER_MS) / 1000,
                }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-24"
                  style={{
                    background: 'linear-gradient(180deg, rgba(205,246,255,0.55), transparent)',
                    filter: 'blur(6px)',
                  }}
                />
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

type GlassLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  prefetch?: boolean;
};

/** Drop-in <Link> that routes through the pane transition. */
export function GlassLink({ href, children, onClick, prefetch = true, ...rest }: GlassLinkProps) {
  const { navigate } = useGlassNav();

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
