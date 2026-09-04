import { ArrowRight } from 'lucide-react';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import Reveal, { RevealGroup, RevealItem } from '@/components/Reveal';
import CategoryRail from '@/components/CategoryRail';
import ProductCard from '@/components/ProductCard';
import { GlassLink } from '@/components/RouteTransition';
import { listCategories, listFeaturedProducts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const PRINCIPLES = [
  {
    number: '01',
    title: 'Every item has a number',
    body: 'The reference shown on each photograph identifies that exact piece. Quote it and there is no confusion over which one you mean.',
  },
  {
    number: '02',
    title: 'Sizes are listed',
    body: 'Dimensions, capacity and what a piece is sold as are recorded for each item, so you can check it fits before you come in.',
  },
  {
    number: '03',
    title: 'Kept current',
    body: 'Stock moves through the year, particularly around festivals and weddings. The catalogue is updated as it does.',
  },
];

export default function HomePage() {
  const categories = listCategories();
  const featured = listFeaturedProducts(8);

  return (
    <>
      <Hero />

      {/* ---------------- positioning ---------------- */}
      <section className="shell relative pt-28 sm:pt-36">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal variant="left">
            <p className="eyebrow">What we stock</p>
            <h2 className="display mt-5 text-[clamp(2.3rem,5.4vw,4.2rem)] text-balance">
              Tableware, storage, decor and{' '}
              <span className="chrome">gifting</span>, under one roof.
            </h2>
          </Reveal>

          <Reveal variant="right" delay={0.12}>
            <div className="lg:pt-6">
              <p className="lede">
                Six departments in one shop: glassware, serveware, jars and storage, home decor, gift
                wrap and packaging, and chocolate moulds and baking supplies.
              </p>
              <p className="lede mt-5">
                This catalogue lists what is on our shelves, with sizes and details for each piece and
                a reference number you can quote when you get in touch.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <GlassLink href="/catalog" className="btn btn-ghost group">
                  Browse the catalogue
                  <ArrowRight size={15} className="transition-transform duration-500 group-hover:translate-x-1" />
                </GlassLink>
                <GlassLink href="/contact" className="btn btn-ghost">
                  Ask about an item
                </GlassLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {categories.length > 0 && (
        <div className="mt-24">
          <Marquee items={categories.map((category) => category.name)} />
        </div>
      )}

      {/* ---------------- departments, straight from the collections ---------------- */}
      {categories.length > 0 && (
        <section className="shell pt-24 sm:pt-28">
          <Reveal>
            <p className="eyebrow">Around the shop</p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((category) => (
              <RevealItem key={category.id}>
                <GlassLink
                  href={`/catalog/${category.slug}`}
                  className="glass sheen block h-full p-6 transition-transform duration-700 hover:-translate-y-1.5"
                >
                  <h3 className="display text-[1.5rem] text-white">{category.name}</h3>
                  <p className="mt-3 line-clamp-4 text-[0.86rem] leading-relaxed text-[color:var(--muted)]">
                    {category.tagline || category.description}
                  </p>
                  <p className="mt-4 text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--aqua)]">
                    {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
                  </p>
                </GlassLink>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}

      {/* ---------------- collections ---------------- */}
      {categories.length > 0 && (
        <div className="pt-28 sm:pt-36">
          <CategoryRail categories={categories} />
        </div>
      )}

      {/* ---------------- selected pieces ---------------- */}
      {featured.length > 0 && (
        <section className="shell relative pt-28 sm:pt-36">
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -right-40 top-0 h-[26rem] w-[26rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(121,230,255,0.14), transparent 68%)' }}
          />
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Selected pieces</p>
                <h2 className="display mt-4 text-[clamp(2rem,4.6vw,3.4rem)]">Our Best Sellers</h2>
              </div>
              <p className="max-w-xs text-[0.8rem] text-[color:var(--faint)]">
                The number on each image is that item&rsquo;s catalogue reference. Quote it when you ask
                about a piece.
              </p>
            </div>
          </Reveal>

          {/* Best sellers line up on a single grid, so every card is the same size. */}
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} priority={index < 4} uniform />
            ))}
          </div>
        </section>
      )}

      {/* ---------------- principles ---------------- */}
      <section className="shell pt-28 sm:pt-36">
        <Reveal>
          <p className="eyebrow">How the catalogue works</p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PRINCIPLES.map((principle, index) => (
            <Reveal key={principle.number} delay={index * 0.1} variant="scale">
              <article className="glass sheen h-full p-7">
                <span className="display text-[2.6rem] leading-none text-white/15">{principle.number}</span>
                <h3 className="mt-5 text-[1.05rem] font-medium text-white">{principle.title}</h3>
                <p className="mt-3 text-[0.87rem] leading-relaxed text-[color:var(--muted)]">
                  {principle.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- closing ---------------- */}
      <section className="shell pt-28 sm:pt-36">
        <Reveal variant="scale">
          <div className="glass relative overflow-hidden px-7 py-16 text-center sm:px-14 sm:py-24">
            <div
              aria-hidden
              className="animate-float-slow pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-50"
              style={{ background: 'radial-gradient(circle, rgba(121,230,255,0.35), transparent 65%)' }}
            />
            <div
              aria-hidden
              className="animate-float-slow pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full opacity-40"
              style={{ background: 'radial-gradient(circle, rgba(91,140,255,0.4), transparent 65%)' }}
            />

            <p className="eyebrow relative">Next step</p>
            <h2 className="display relative mt-5 text-[clamp(2.2rem,5.6vw,4rem)] text-balance">
              Send us the item numbers.
            </h2>
            <p className="lede relative mx-auto mt-6 max-w-lg">
              Tell us which pieces and how many. We will confirm the price and what is in stock, and
              hold them for collection.
            </p>

            <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GlassLink href="/contact" className="btn btn-primary group">
                Ask about an item
                <ArrowRight size={15} className="transition-transform duration-500 group-hover:translate-x-1" />
              </GlassLink>
              <GlassLink href="/catalog" className="btn btn-ghost">
                Open the catalogue
              </GlassLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
