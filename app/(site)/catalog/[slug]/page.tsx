import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CategoryGallery from '@/components/CategoryGallery';
import PageHeader from '@/components/PageHeader';
import Reveal from '@/components/Reveal';
import { GlassLink } from '@/components/RouteTransition';
import { getCategoryBySlug, listCategories, listProductsByCategory } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategoryBySlug((await params).slug);
  if (!category) return { title: 'Collection not found' };

  return {
    title: category.name,
    description: category.tagline || category.description || `${category.name} from the JainCo catalogue.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategoryBySlug((await params).slug);
  if (!category || !category.visible) notFound();

  const products = listProductsByCategory(category.id);
  const siblings = listCategories().filter((entry) => entry.id !== category.id);

  return (
    <>
      <PageHeader
        eyebrow="Collection"
        title={category.name}
        lede={category.tagline || category.description || undefined}
        meta={[{ label: 'Items', value: String(products.length) }]}
      />

      {category.description && category.tagline && (
        <section className="shell pb-12">
          <Reveal>
            <p className="lede max-w-3xl whitespace-pre-line">{category.description}</p>
          </Reveal>
        </section>
      )}

      {products.length === 0 ? (
        <section className="shell pb-10">
          <Reveal>
            <div className="glass px-8 py-20 text-center">
              <p className="display text-[1.9rem]">No pieces published in this collection yet.</p>
              <GlassLink href="/catalog" className="btn btn-ghost mt-8">
                <ArrowLeft size={15} />
                All collections
              </GlassLink>
            </div>
          </Reveal>
        </section>
      ) : (
        <CategoryGallery products={products} />
      )}

      {siblings.length > 0 && (
        <section className="shell pt-14">
          <Reveal>
            <p className="eyebrow">Other collections</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {siblings.map((sibling) => (
                <GlassLink
                  key={sibling.id}
                  href={`/catalog/${sibling.slug}`}
                  className="glass sheen px-5 py-2.5 text-[0.82rem] text-[color:var(--muted)] transition-colors hover:text-white"
                >
                  {sibling.name}
                  <span className="ml-2 text-[0.7rem] text-white/25">{sibling.product_count}</span>
                </GlassLink>
              ))}
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}
