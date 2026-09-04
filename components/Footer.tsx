import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { GlassLink } from './RouteTransition';
import type { Settings } from '@/lib/settings';
import type { CategoryWithCount } from '@/lib/types';

const PAGES = [
  { href: '/', label: 'Home' },
  { href: '/catalog', label: 'Catalogue' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer({
  settings,
  categories,
}: {
  settings: Settings;
  categories: CategoryWithCount[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-28 pb-10 pt-px">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-40"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(121,230,255,0.05))' }}
      />

      <div className="shell">
        <div className="glass overflow-hidden px-6 py-12 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
            <div>
              <p className="eyebrow">JainCo</p>
              <p className="display mt-4 max-w-sm text-[clamp(1.7rem,3.2vw,2.4rem)] text-balance">
                {settings.site_tagline || 'Everything for the table, the shelf and the gift.'}
              </p>
              <p className="lede mt-5 max-w-md text-sm">
                Glassware, serveware, storage, home decor, gift wrap and packaging, chocolate moulds
                and baking supplies.
              </p>

              <GlassLink href="/contact" className="btn btn-primary group mt-7 !px-5 !py-2.5 !text-[0.72rem]">
                Ask about an item
                <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
              </GlassLink>
            </div>

            <div>
              <p className="eyebrow mb-5">Catalogue</p>
              <ul className="space-y-2.5">
                {categories.map((category) => (
                  <li key={category.id}>
                    <GlassLink
                      href={`/catalog/${category.slug}`}
                      className="text-sm text-[color:var(--muted)] transition-colors hover:text-white"
                    >
                      {category.name}
                    </GlassLink>
                  </li>
                ))}
                <li>
                  <GlassLink href="/catalog" className="text-sm text-[color:var(--aqua)] hover:text-white">
                    All collections
                  </GlassLink>
                </li>
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-5">Pages</p>
              <ul className="space-y-2.5">
                {PAGES.map((page) => (
                  <li key={page.href}>
                    <GlassLink
                      href={page.href}
                      className="text-sm text-[color:var(--muted)] transition-colors hover:text-white"
                    >
                      {page.label}
                    </GlassLink>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-5">Enquiries</p>
              <ul className="space-y-3.5 text-sm text-[color:var(--muted)]">
                {settings.contact_email && (
                  <li>
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="flex items-start gap-3 transition-colors hover:text-white"
                    >
                      <Mail size={15} className="mt-0.5 shrink-0 text-[color:var(--aqua)]" />
                      <span className="break-all">{settings.contact_email}</span>
                    </a>
                  </li>
                )}
                {settings.contact_phone && (
                  <li>
                    <a
                      href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                      className="flex items-start gap-3 transition-colors hover:text-white"
                    >
                      <Phone size={15} className="mt-0.5 shrink-0 text-[color:var(--aqua)]" />
                      <span>{settings.contact_phone}</span>
                    </a>
                  </li>
                )}
                {settings.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 transition-colors hover:text-white"
                    >
                      <MessageCircle size={15} className="mt-0.5 shrink-0 text-[color:var(--aqua)]" />
                      <span>WhatsApp</span>
                    </a>
                  </li>
                )}
                {settings.address && (
                  <li className="flex items-start gap-3">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-[color:var(--aqua)]" />
                    <span className="whitespace-pre-line">{settings.address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-[color:var(--faint)] sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} JainCo. All rights reserved.</p>
            <p>
              Quote the reference number shown on a product image when you get in touch.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
