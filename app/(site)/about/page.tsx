import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Reveal, { RevealGroup, RevealItem } from '@/components/Reveal';
import { GlassLink } from '@/components/RouteTransition';
import { catalogStats } from '@/lib/queries';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'About',
  description:
    'JainCo is a home, gifting and party supplies shop. Glassware, decor, storage, gift wrap and baking pieces, all in one place.',
};

const STAGES = [
  {
    step: 'Find it',
    body: 'Have a look through the catalogue. Each piece has a reference number under the photo, jot that down if you like something.',
  },
  {
    step: 'Ask',
    body: 'Send us the numbers and how many you need, through the form or over a call, and we will tell you the price and whether it is in stock.',
  },
  {
    step: 'Collect',
    body: 'We keep it ready for you at the counter. Happy to wrap and box anything that is a gift.',
  },
];

const STANDARDS = [
  {
    title: 'Six departments',
    body: 'Table, kitchen, decor, gifting and baking, all in one shop, so you are not running between four different places.',
  },
  {
    title: 'Details listed',
    body: 'We put down the size, the capacity, and how a piece is sold, right there in the catalogue.',
  },
  {
    title: 'Gifting in one place',
    body: 'Wrap, ribbon, boxes and tags are kept next to the gifts, not in a separate corner.',
  },
  {
    title: 'Stock changes with the season',
    body: 'Festive, wedding and party lines come in through the year and we add them as they arrive.',
  },
];

export default function AboutPage() {
  const stats = catalogStats();
  const settings = getSettings();

  return (
    <>
      <PageHeader
        eyebrow="About JainCo"
        title="One shop, many departments"
        lede="Six departments for the table, the kitchen, the home and gifting. We keep the catalogue matching what is actually on the shelves."
        meta={[
          { label: 'Departments', value: String(stats.categories) },
          { label: 'Catalogued items', value: String(stats.products) },
        ]}
      />

      {/* ---------------- story ---------------- */}
      <section className="shell pb-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal variant="left">
            <div className="glass sheen p-8 sm:p-10">
              <p className="eyebrow">Who we serve</p>
              <p className="lede mt-5">
                Most people who walk in already know roughly what they want. A set of glasses, jars
                for the kitchen shelf, something for a bare corner of a room, moulds for chocolates,
                or wrap for a gift that needs sorting last minute.
              </p>
              <p className="lede mt-4">
                We also do bigger orders, corporate gifting, weddings, festival stock, that sort of
                thing. Just tell us the quantity and we will let you know what we can put together.
              </p>
            </div>
          </Reveal>

          <Reveal variant="right" delay={0.12}>
            <div className="glass sheen h-full p-8 sm:p-10">
              <p className="eyebrow">Prices and availability</p>
              <p className="lede mt-5">
                We do not put prices on the website. They depend on the piece, the quantity, and
                stock changes often enough through the year that a printed number would go stale
                fast. Easier to just ask.
              </p>
              <p className="lede mt-4">
                Send us the item numbers you have your eye on and we will get back to you with the
                price and how many we have on hand.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <GlassLink href="/contact" className="btn btn-primary group">
                  Ask about an item
                  <ArrowRight size={15} className="transition-transform duration-500 group-hover:translate-x-1" />
                </GlassLink>
                <GlassLink href="/catalog" className="btn btn-ghost">
                  See the catalogue
                </GlassLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- process ---------------- */}
      <section className="shell pt-24">
        <Reveal>
          <p className="eyebrow">Ordering</p>
          <h2 className="display mt-4 max-w-2xl text-[clamp(2rem,4.6vw,3.4rem)] text-balance">
            Three steps
          </h2>
        </Reveal>

        <div className="mt-12 space-y-px">
          {STAGES.map((stage, index) => (
            <Reveal key={stage.step} delay={index * 0.07}>
              <div className="group grid gap-4 border-t border-white/10 py-8 transition-colors duration-500 hover:border-white/25 sm:grid-cols-[80px_minmax(0,220px)_1fr] sm:gap-8">
                <span className="display text-[1.6rem] leading-none text-white/20 transition-colors duration-500 group-hover:text-[color:var(--aqua)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[1.02rem] font-medium text-white">{stage.step}</h3>
                <p className="text-[0.88rem] leading-relaxed text-[color:var(--muted)]">{stage.body}</p>
              </div>
            </Reveal>
          ))}
          <div className="border-t border-white/10" />
        </div>
      </section>

      {/* ---------------- standards ---------------- */}
      <section className="shell pt-24">
        <Reveal>
          <p className="eyebrow">Why people keep coming back</p>
        </Reveal>

        <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STANDARDS.map((standard) => (
            <RevealItem key={standard.title}>
              <div className="glass sheen h-full p-6 transition-transform duration-700 hover:-translate-y-1.5">
                <h3 className="text-[0.98rem] font-medium text-white">{standard.title}</h3>
                <p className="mt-3 text-[0.85rem] leading-relaxed text-[color:var(--muted)]">
                  {standard.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ---------------- contact ---------------- */}
      <section className="shell pt-24">
        <Reveal variant="scale">
          <div className="glass relative overflow-hidden px-7 py-16 text-center sm:px-14 sm:py-20">
            <div
              aria-hidden
              className="animate-float-slow pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-45"
              style={{ background: 'radial-gradient(circle, rgba(121,230,255,0.32), transparent 65%)' }}
            />

            <p className="eyebrow relative">Talk to us</p>
            <h2 className="display relative mt-5 text-[clamp(2rem,5vw,3.4rem)] text-balance">
              Tell us what you need.
            </h2>
            <p className="lede relative mx-auto mt-5 max-w-lg">
              Send us the item numbers and how many you need. We will check the price and stock and
              hold it for you.
            </p>

            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GlassLink href="/contact" className="btn btn-primary">
                Contact us
              </GlassLink>
              {settings.contact_email && (
                <a href={`mailto:${settings.contact_email}`} className="btn btn-ghost">
                  {settings.contact_email}
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
