import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import GlassCursor from '@/components/GlassCursor';
import RouteTransition from '@/components/RouteTransition';
import { listCategories } from '@/lib/queries';
import { getSettings } from '@/lib/settings';

// The catalogue is edited from /admin, so every visit reads the current database.
export const dynamic = 'force-dynamic';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const categories = listCategories();
  const settings = getSettings();

  return (
    <RouteTransition>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] btn btn-ghost">
        Skip to content
      </a>
      <GlassCursor />
      <Nav
        categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))}
        phone={settings.contact_phone}
      />
      <main id="main">{children}</main>
      <Footer settings={settings} categories={categories.slice(0, 6)} />
    </RouteTransition>
  );
}
