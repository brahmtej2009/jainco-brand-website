import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Mail, Send } from 'lucide-react';
import ProductGallery from '@/components/ProductGallery';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import { GlassLink } from '@/components/RouteTransition';
import { getProductByItemId, listRelatedProducts } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { formatItemId, formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

function parseItemId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const itemId = parseItemId((await params).id);
  const product = itemId ? getProductByItemId(itemId) : null;
  if (!product) return { title: 'Item not found' };

  return {
    title: `${product.name}, item ${formatItemId(product.item_id)}`,
    description: product.summary || product.description.slice(0, 160) || `${product.name} from JainCo.`,
  };
}


export default async function ProductPage({ params }: Props) {
  const itemId = parseItemId((await params).id);
  const product = itemId ? getProductByItemId(itemId) : null;
  if (!product) notFound();

  const settings = getSettings();
  const related = listRelatedProducts(product, 4);
  const price = formatPrice(product.price, product.currency);

  const specs = product.specs.filter((spec) => spec.label.trim());

  const contactHref = `/contact?item=${encodeURIComponent(formatItemId(product.item_id))}`;

  const mailHref = settings.contact_email
    ? `mailto:${settings.contact_email}?subject=${encodeURIComponent(
        `Enquiry: item ${formatItemId(product.item_id)} (${product.name})`,
      )}&body=${encodeURIComponent(
        `Item reference: ${formatItemId(product.item_id)}\nProduct: ${product.name}\n\nQuantity required:\nDelivery destination:\n\nNotes:\n`,
      )}`
    : null;

  return (
    <article className="pt-32 sm:pt-40">
      <div className="shell">
        <Reveal variant="fade" duration={0.6}>
          <nav className="flex flex-wrap items-center gap-2 text-[0.74rem] text-[color:var(--faint)]">
            <GlassLink href="/catalog" className="transition-colors hover:text-white">
              Catalogue
            </GlassLink>
            {product.category_slug && (
              <>
                <span>/</span>
                <GlassLink href={`/catalog/${product.category_slug}`} className="transition-colors hover:text-white">
                  {product.category_name}
                </GlassLink>
              </>
            )}
            <span>/</span>
            <span className="text-white/70">Item {formatItemId(product.item_id)}</span>
          </nav>
        </Reveal>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* ---------------- images ---------------- */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={product.images} itemId={product.item_id} name={product.name} />
          </div>

          {/* ---------------- detail ---------------- */}
          <div>
            <Reveal variant="right">
              <div className="flex flex-wrap items-center gap-3">
                <span className="glass px-3.5 py-1.5 text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--aqua)]">
                  Item {formatItemId(product.item_id)}
                </span>
                {product.category_name && (
                  <span className="text-[0.74rem] uppercase tracking-[0.16em] text-[color:var(--faint)]">
                    {product.category_name}
                  </span>
                )}
              </div>

              <h1 className="display mt-5 text-[clamp(2.2rem,6vw,3.9rem)] text-balance">{product.name}</h1>

              {product.summary && <p className="lede mt-4 max-w-lg">{product.summary}</p>}

              <div className="mt-7 flex flex-wrap items-center gap-4">
                {price && (
                  <span className="display text-[2rem] text-[color:var(--aqua)]">
                    {price}
                    <span className="ml-2 align-middle text-[0.7rem] uppercase tracking-[0.16em] text-[color:var(--faint)]">
                      per piece
                    </span>
                  </span>
                )}

              </div>
            </Reveal>

            {product.description && (
              <Reveal variant="right" delay={0.1}>
                <div className="mt-10">
                  <p className="eyebrow">Description</p>
                  <p className="lede mt-4 whitespace-pre-line">{product.description}</p>
                </div>
              </Reveal>
            )}

            <Reveal variant="right" delay={0.16}>
                <div className="glass mt-10 overflow-hidden">
                  <p className="eyebrow border-b border-white/10 px-6 py-4">Specification</p>
                  <dl>
                    {specs.map((spec, index) => (
                      <div
                        key={spec.id}
                        className="grid grid-cols-[minmax(96px,0.6fr)_1fr] gap-4 px-6 py-3.5"
                        style={{
                          borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <dt className="text-[0.76rem] uppercase tracking-[0.1em] text-[color:var(--faint)]">
                          {spec.label}
                        </dt>
                        <dd className="whitespace-pre-line text-[0.88rem] text-white/90">{spec.value}</dd>
                      </div>
                    ))}
                    <div
                      className="grid grid-cols-[minmax(96px,0.6fr)_1fr] gap-4 px-6 py-3.5"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <dt className="text-[0.76rem] uppercase tracking-[0.1em] text-[color:var(--faint)]">
                        Item ID
                      </dt>
                      <dd className="text-[0.88rem] font-medium text-[color:var(--aqua)]">
                        {formatItemId(product.item_id)}
                      </dd>
                    </div>
                  </dl>
                </div>
            </Reveal>

            <Reveal variant="right" delay={0.22}>
              <div className="glass mt-8 p-6">
                <p className="text-[0.95rem] font-medium text-white">Enquire about this item</p>
                <p className="mt-2 text-[0.83rem] leading-relaxed text-[color:var(--muted)]">
                  This product has reference ID{' '}
                  <strong className="text-white">{formatItemId(product.item_id)}</strong>. Send us this
                  number along with the quantity you need, and we will reply with a price, packing
                  details and a delivery date.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <GlassLink href={contactHref} className="btn btn-primary">
                    <Send size={15} />
                    Enquire about this item
                  </GlassLink>

                  {mailHref && (
                    <a href={mailHref} className="btn btn-ghost">
                      <Mail size={15} />
                      Email us
                    </a>
                  )}
                  {settings.whatsapp && (
                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello JainCo, I would like to enquire about item ${formatItemId(product.item_id)} (${product.name}).`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </Reveal>

            <div className="mt-8 flex flex-wrap gap-3">
              {product.category_slug && (
                <GlassLink href={`/catalog/${product.category_slug}`} className="btn btn-ghost group !px-5 !py-2.5">
                  <ArrowLeft size={15} className="transition-transform duration-500 group-hover:-translate-x-1" />
                  Back to {product.category_name}
                </GlassLink>
              )}
              <GlassLink href="/catalog" className="btn btn-ghost !px-5 !py-2.5">
                All collections
              </GlassLink>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="shell pt-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Also in this collection</p>
                <h2 className="display mt-4 text-[clamp(1.8rem,4vw,2.8rem)]">Related pieces</h2>
              </div>
              {product.category_slug && (
                <GlassLink href={`/catalog/${product.category_slug}`} className="btn btn-ghost group">
                  See all
                  <ArrowRight size={15} className="transition-transform duration-500 group-hover:translate-x-1" />
                </GlassLink>
              )}
            </div>
          </Reveal>

          <div className="masonry mt-10">
            {related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
