import 'server-only';
import { db } from './db';

export type Settings = {
  show_prices: boolean;
  site_tagline: string;
  contact_email: string;
  contact_phone: string;
  whatsapp: string;
  address: string;
};

export function getSettings(): Settings {
  const rows = db().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    show_prices: map.show_prices === '1',
    site_tagline: map.site_tagline ?? '',
    contact_email: map.contact_email ?? '',
    contact_phone: map.contact_phone ?? '',
    whatsapp: map.whatsapp ?? '',
    address: map.address ?? '',
  };
}

export function setSettings(patch: Record<string, string>) {
  const stmt = db().prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  const tx = db().transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) stmt.run(k, v);
  });
  tx(Object.entries(patch));
}
