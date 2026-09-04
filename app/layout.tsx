import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import GlassDefs from '@/components/GlassDefs';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'JainCo | Home, Gifting and Party Supplies',
    template: '%s | JainCo',
  },
  description:
    'JainCo stocks glassware, home decor, storage, gift wrap and packaging, chocolate moulds and baking supplies, and pieces for every celebration.',
  openGraph: {
    title: 'JainCo | Home, Gifting and Party Supplies',
    description:
      'A browsable catalogue of glassware, home decor, storage, gift wrap, chocolate moulds and party supplies.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#04070e',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <GlassDefs />
        {children}
      </body>
    </html>
  );
}
