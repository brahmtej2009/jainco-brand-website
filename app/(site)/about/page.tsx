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
    'JainCo is a home, gifting and party supplies shop: glassware, decor, storage, gift wrap and packaging, chocolate moulds and baking pieces, all under one roof.',
};

const STAGES = [
  {
    step: 'Find it',
    body: 'Browse the catalogue by department and note the reference number under any piece that interests you.',
  },
  {
    step: 'Ask',
    body: 'Send the numbers and quantities through the contact form, or call the shop. We confirm the price and what is in stock.',
  },
  {
    step: 'Collect',
    body: 'We set your order aside at the counter. Gifts can be wrapped and boxed before you take them.',
  },
];

const STANDARDS = [
  {
    title: 'Six departments',
    body: 'Table, kitchen, decor, gifting and baking in one shop, so one visit covers what would otherwise take several.',
  },
  {
    title: 'Details listed',
    body: 'Dimensions, capacity and what each piece is sold as are recorded in the catalogue.',
  },
  {
    title: 'Gifting in one place',
    body: 'Wrap, ribbon, boxes and tags sit alongside the gifts themselves.',
  },
  {
    title: 'Seasonal stock',
    body: 'Festive, wedding and party lines arrive through the year and are added to the catalogue.',
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
        lede="Six departments covering the table, the kitchen, the home and gifting, with the catalogue kept in step with the shelves."
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
                Most customers come in for something specific: a set of glasses, jars for a kitchen
                shelf, a piece of decor, moulds for a batch of chocolates, or wrap for a present.
              </p>
              <p className="lede mt-4">
                Larger orders are equally welcome, whether that is corporate gifting, a wedding or a
                festival. Tell us the quantities and we will tell you what we can supply.
              </p>
            </div>
          </Reveal>

          <Reveal variant="right" delay={0.12}>
            <div className="glass sheen h-full p-8 sm:p-10">
              <p className="eyebrow">Prices and availability</p>
              <p className="lede mt-5">
                Prices vary with the piece and the quantity, and stock changes through the year, so we
                confirm both on request rather than publishing figures that go out of date.
              </p>
              <p className="lede mt-4">
                Send the item numbers you are interested in and we will reply with prices, what is in
                stock, and how much of it.
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
          <p className="eyebrow">Why people come back</p>
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
              Send the item numbers and quantities. We will confirm prices and availability and hold
              them for you.
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
