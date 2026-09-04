'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Phone, Search, X } from 'lucide-react';
import { GlassLink } from './RouteTransition';
import Wordmark from './Wordmark';
import SearchDialog from './SearchDialog';

type NavCategory = { id: number; name: string; slug: string };

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/catalog', label: 'Catalogue' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** How far you have to scroll back up before the bar comes down again. */
const REVEAL_DISTANCE = 90;
const HIDE_AFTER = 160;

export default function Nav({ categories, phone }: { categories: NavCategory[]; phone?: string }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();

  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeTimer = useRef<number | null>(null);

  // Where the current run of scrolling started, so a stray wobble does not toggle the bar.
  const anchor = useRef(0);
  const direction = useRef<'up' | 'down'>('up');

  useMotionValueEvent(scrollY, 'change', (value) => {
    setCondensed(value > 40);

    const previous = scrollY.getPrevious() ?? 0;
    const goingDown = value > previous;

    if (goingDown !== (direction.current === 'down')) {
      direction.current = goingDown ? 'down' : 'up';
      anchor.current = value;
    }

    if (goingDown) {
      // Out of the way once you are past the hero and clearly heading down the page.
      if (value > HIDE_AFTER && value - anchor.current > 24) setHidden(true);
      return;
    }

    // Back again, but only after a deliberate scroll up rather than a small nudge.
    if (anchor.current - value > REVEAL_DISTANCE || value < HIDE_AFTER) setHidden(false);
  });

  // Never leave the bar hidden while a menu or dialog that belongs to it is open.
  useEffect(() => {
    if (menuOpen || searchOpen) setHidden(false);
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setCatalogOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // A short delay stops the panel flickering as the pointer crosses the gap to it.
  function openPanel() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setCatalogOpen(true);
  }

  function closePanel() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setCatalogOpen(false), 140);
  }

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        initial={{ y: -80, opacity: 0 }}
        animate={hidden ? { y: '-120%', opacity: 0 } : { y: 0, opacity: 1 }}
        transition={
          hidden
            ? { duration: 0.32, ease: [0.4, 0, 1, 1] }
            : { duration: 0.45, delay: 0.02, ease: EASE }
        }
      >
        <div className="shell">
          <motion.nav
            className="glass sheen mt-3 flex items-center justify-between gap-4 px-4 sm:px-6"
            animate={{
              paddingTop: condensed ? 10 : 16,
              paddingBottom: condensed ? 10 : 16,
              backgroundColor: condensed ? 'rgba(8,16,28,0.62)' : 'rgba(255,255,255,0.035)',
            }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <GlassLink href="/" className="shrink-0" aria-label="JainCo home">
              <Wordmark condensed={condensed} />
            </GlassLink>

            <div className="hidden items-center gap-1 lg:flex">
              {LINKS.map((link) => {
                const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                const hasPanel = link.href === '/catalog' && categories.length > 0;

                return (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={hasPanel ? openPanel : undefined}
                    onMouseLeave={hasPanel ? closePanel : undefined}
                    onFocusCapture={hasPanel ? openPanel : undefined}
                    onBlurCapture={hasPanel ? closePanel : undefined}
                  >
                    <GlassLink
                      href={link.href}
                      className="relative block px-4 py-2 text-[0.8rem] font-medium uppercase tracking-[0.16em] transition-colors"
                      style={{ color: active ? 'var(--frost)' : 'var(--muted)' }}
                    >
                      {link.label}
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 -z-10 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            boxShadow: 'inset 0 0 0 1px rgba(210,245,255,0.28)',
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                    </GlassLink>

                    {hasPanel && (
                      <AnimatePresence>
                        {catalogOpen && (
                          <motion.div
                            className="absolute left-1/2 top-full z-10 -translate-x-1/2 pt-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {/* A solid pane, not a see-through one: the names have to stay readable
                                over whatever the page is showing behind them. */}
                            <motion.div
                              className="w-max min-w-[15rem] max-w-[min(80vw,24rem)] overflow-hidden rounded-[20px] p-2"
                              style={{
                                background:
                                  'linear-gradient(158deg, rgba(16,30,50,0.96) 0%, rgba(8,16,28,0.97) 100%)',
                                backdropFilter: 'blur(30px) saturate(160%)',
                                WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                                boxShadow:
                                  'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.12), 0 40px 80px -40px rgba(0,0,0,0.95)',
                              }}
                              initial={{ opacity: 0, x: 26, y: -6, scale: 0.96 }}
                              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 18, y: -4, scale: 0.97 }}
                              transition={{ duration: 0.42, ease: EASE }}
                            >
                              <p className="px-3 pb-2 pt-1.5 text-[0.6rem] uppercase tracking-[0.24em] text-[color:var(--faint)]">
                                Collections
                              </p>

                              {categories.slice(0, 8).map((category, index) => (
                                <motion.div
                                  key={category.id}
                                  initial={{ opacity: 0, x: 14 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.06 + index * 0.035, duration: 0.32, ease: EASE }}
                                >
                                  <GlassLink
                                    href={`/catalog/${category.slug}`}
                                    className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-[0.86rem] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                                  >
                                    <span className="truncate">{category.name}</span>
                                    <ArrowUpRight size={13} className="shrink-0 opacity-40" />
                                  </GlassLink>
                                </motion.div>
                              ))}

                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-1 border-t border-white/10 pt-1"
                              >
                                <GlassLink
                                  href="/catalog"
                                  className="block rounded-xl px-3 py-2.5 text-[0.82rem] text-[color:var(--aqua)] transition-colors hover:bg-white/10"
                                >
                                  View all collections
                                </GlassLink>
                              </motion.div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="glass hidden items-center gap-2 rounded-full px-3.5 py-2 text-[0.78rem] text-[color:var(--muted)] transition-colors hover:text-white md:inline-flex"
                  title={`Call ${phone}`}
                >
                  <Phone size={14} className="shrink-0 text-[color:var(--aqua)]" />
                  <span className="whitespace-nowrap tabular-nums">{phone}</span>
                </a>
              )}

              {phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="glass grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-white/10 md:hidden"
                  aria-label={`Call ${phone}`}
                >
                  <Phone size={16} className="text-[color:var(--aqua)]" />
                </a>
              )}

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="glass grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-white/10"
                aria-label="Search the catalogue"
                title="Search"
              >
                <Search size={16} />
              </button>

              <GlassLink
                href="/contact"
                className="btn btn-primary hidden !px-5 !py-2.5 text-[0.72rem] lg:inline-flex"
              >
                Request a quote
              </GlassLink>

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="glass grid h-10 w-10 place-items-center rounded-full lg:hidden"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </motion.nav>
        </div>
      </motion.header>

      {/* ---------------- mobile menu: plain, legible, quick ---------------- */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(5,9,17,0.96)', backdropFilter: 'blur(24px)' }}
              onClick={() => setMenuOpen(false)}
            />

            <motion.nav
              className="relative flex h-full flex-col overflow-y-auto px-6 pb-10 pt-24"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } } }}
              aria-label="Main menu"
            >
              {LINKS.map((link) => (
                <motion.div
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <GlassLink
                    href={link.href}
                    className="block border-b border-white/10 py-4 text-[1.5rem] font-light text-white"
                  >
                    {link.label}
                  </GlassLink>
                </motion.div>
              ))}

              {categories.length > 0 && (
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="pt-8"
                >
                  <p className="eyebrow !text-[0.58rem]">Collections</p>
                  <ul className="mt-4 space-y-1">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <GlassLink
                          href={`/catalog/${category.slug}`}
                          className="block rounded-xl px-3 py-2.5 text-[0.95rem] text-[color:var(--muted)] transition-colors hover:bg-white/10 hover:text-white"
                        >
                          {category.name}
                        </GlassLink>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              <motion.div
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col gap-3 pt-9"
              >
                <GlassLink href="/contact" className="btn btn-primary w-full">
                  Request a quote
                </GlassLink>

                {phone && (
                  <a href={`tel:${phone.replace(/\s+/g, '')}`} className="btn btn-ghost w-full">
                    <Phone size={15} />
                    {phone}
                  </a>
                )}
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
