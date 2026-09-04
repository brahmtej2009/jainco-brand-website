import type { NextRequest } from 'next/server';
import { getSettings, setSettings } from '@/lib/settings';
import { json, str, withAdmin } from '@/lib/api';
import { readJson } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only these keys can be written from the browser; anything else in the body is ignored.
const EDITABLE = ['site_tagline', 'contact_email', 'contact_phone', 'whatsapp', 'address'] as const;

export const GET = withAdmin(async () => json({ settings: getSettings() }));

export const PATCH = withAdmin(async (_admin, request: NextRequest) => {
  const body = await readJson(request);
  const patch: Record<string, string> = {};

  if ('show_prices' in body) patch.show_prices = body.show_prices ? '1' : '0';
  for (const key of EDITABLE) {
    if (key in body) patch[key] = str(body[key], 300);
  }

  setSettings(patch);
  return json({ settings: getSettings() });
});
