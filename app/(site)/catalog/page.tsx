import type { Metadata } from 'next';
import CategoryCard from '@/components/CategoryCard';
import PageHeader from '@/components/PageHeader';
import Reveal from '@/components/Reveal';
import { GlassLink } from '@/components/RouteTransition';
import { catalogStats, listCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catalogue',
  description:
    'Browse the JainCo catalogue by department: glassware, home decor, storage, gift wrap, chocolate moulds and party pieces, each item carrying its own reference number.',
};

export default function CatalogPage() {
  const categories = listCategories();
  const stats = catalogStats();

  return (
    <>
      <PageHeader
        eyebrow="The catalogue"
        title="Collections"
        lede="Everything on our shelves, grouped the way the shop is laid out. Open a department to see the pieces, their details and their reference numbers."
        meta={[
          { label: 'Collections', value: String(stats.categories) },
          { label: 'Items', value: String(stats.products) },
        ]}
      />

      <section className="shell pb-8">
        {categories.length === 0 ? (
          <Reveal>
            <div className="glass px-8 py-20 text-center">
              <p className="display text-[1.9rem]">The catalogue is being prepared.</p>
              <p className="lede mx-auto mt-4 max-w-md">
                New collections are being photographed and will appear here shortly. In the meantime,
                tell us what you are looking for and we will send you what we have.
              </p>
              <GlassLink href="/contact" className="btn btn-primary mt-8">
                Contact us
              </GlassLink>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
