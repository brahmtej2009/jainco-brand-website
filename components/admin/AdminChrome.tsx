'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, Inbox, LayoutGrid, LogOut, Package, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { ToastProvider } from './ui';

const TABS = [
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Collections', icon: LayoutGrid },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { href: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
];

export default function AdminChrome({
  username,
  newEnquiries,
  children,
}: {
  username: string;
  newEnquiries: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <ToastProvider>
      <div className="admin">
        <header className="sticky top-0 z-40 border-b border-[color:var(--a-line)] bg-[color:var(--a-bg)]">
          <div className="mx-auto flex w-[min(1280px,100%-2rem)] items-center justify-between gap-4 py-3">
            <Link href="/admin/products" className="flex items-baseline gap-2.5">
              <span className="text-[0.95rem] font-semibold tracking-[0.18em] text-white">JAINCO</span>
              <span className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--a-faint)]">
                Admin
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="hidden text-[0.78rem] text-[color:var(--a-muted)] sm:block">
                {username}
              </span>

              <Link
                href="/"
                target="_blank"
                className="a-btn a-btn-quiet !px-2.5"
                aria-label="Open the public site in a new tab"
                title="Open the public site"
              >
                <ExternalLink size={15} />
              </Link>

              <button type="button" onClick={signOut} className="a-btn a-btn-quiet !px-2.5" aria-label="Sign out" title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          </div>

          <nav
            className="hide-scrollbar mx-auto flex w-[min(1280px,100%-2rem)] gap-1 overflow-x-auto"
            aria-label="Admin sections"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className="flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[0.84rem] font-medium transition-colors"
                  style={{
                    borderColor: active ? 'var(--a-accent)' : 'transparent',
                    color: active ? 'var(--a-text)' : 'var(--a-muted)',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                  {tab.href === '/admin/enquiries' && newEnquiries > 0 && (
                    <span
                      className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[0.65rem] font-semibold"
                      style={{ background: 'var(--a-accent)', color: '#04101c' }}
                    >
                      {newEnquiries}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-[min(1280px,100%-2rem)] py-7 pb-24">{children}</main>
      </div>
    </ToastProvider>
  );
}
