'use client';

import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Spinner, Toggle, useToast } from './ui';
import type { Settings } from '@/lib/settings';

export default function SettingsPanel({ initial }: { initial: Settings }) {
  const { notify } = useToast();

  const [settings, setSettings] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);

  async function patch(body: Partial<Settings>, message: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save.');

      setSettings(data.settings);
      notify(message);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    void patch(
      {
        site_tagline: settings.site_tagline,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        whatsapp: settings.whatsapp,
        address: settings.address,
      },
      'Details saved.',
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ---------------- price visibility ---------------- */}
      <motion.section
        className="a-card h-max p-6 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          boxShadow: settings.show_prices
            ? 'inset 0 0 0 1px rgba(121,230,255,0.4), 0 30px 60px -40px rgba(0,0,0,0.9)'
            : undefined,
        }}
      >
        <p className="a-section-title">Pricing</p>

        <div className="mt-5">
          <Toggle
            label="Show prices on the public site"
            hint="Off by default. While this is off, prices are stripped on the server, so they are never sent to a visitor's browser, even in the page source."
            checked={settings.show_prices}
            disabled={busy}
            onChange={(next) =>
              void patch({ show_prices: next }, next ? 'Prices are now public.' : 'Prices are hidden.')
            }
          />
        </div>

        <div
          className="mt-6 rounded-[14px] px-4 py-3.5 text-[0.78rem] leading-relaxed"
          style={{
            background: settings.show_prices ? 'rgba(121,230,255,0.08)' : 'rgba(255,255,255,0.035)',
            color: 'var(--a-muted)',
          }}
        >
          {settings.show_prices
            ? 'Every product with a price set is showing it in the gallery and on its product page.'
            : 'Visitors see specifications and an enquiry route instead of a price. Prices you enter are still stored, ready for when you switch this on.'}
        </div>
      </motion.section>

      {/* ---------------- company details ---------------- */}
      <motion.section
        className="a-card p-6 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        <p className="a-section-title">Company details</p>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
              <span className="a-label">Footer tagline</span>
              <input
              value={settings.site_tagline}
              onChange={(event) => setSettings({ ...settings, site_tagline: event.target.value })}
              className="a-input"
              placeholder="Glass, made deliberately."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="a-label">Enquiry email</span>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(event) => setSettings({ ...settings, contact_email: event.target.value })}
                className="a-input"
                placeholder="sales@jainco.com"
              />
            </div>

            <div>
              <span className="a-label">Phone</span>
              <input
                value={settings.contact_phone}
                onChange={(event) => setSettings({ ...settings, contact_phone: event.target.value })}
                className="a-input"
                placeholder="+91 00000 00000"
              />
              <p className="mt-1 text-[0.72rem]" style={{ color: 'var(--a-faint)' }}>
                Shown in the top right of every page, and tappable to call. Leave empty to hide it.
              </p>
            </div>
          </div>

          <div>
              <span className="a-label">WhatsApp number</span>
              <input
              value={settings.whatsapp}
              onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })}
              className="a-input"
              placeholder="919000000000"
            />
          </div>

          <div>
              <span className="a-label">Address</span>
              <textarea
              value={settings.address}
              onChange={(event) => setSettings({ ...settings, address: event.target.value })}
              className="a-input min-h-[86px] resize-y"
              placeholder="Works address, city, country"
            />
          </div>

          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
            {busy ? <Spinner /> : <Save size={14} />}
            Save details
          </button>
        </form>
      </motion.section>

      {/* ---------------- account note ---------------- */}
      <motion.section
        className="a-card p-6 sm:p-7 lg:col-span-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
      >
        <p className="a-section-title">Admin accounts</p>
        <p className="mt-4 max-w-2xl text-[0.85rem] leading-relaxed text-[color:var(--a-muted)]">
          Accounts are managed from the project folder rather than the browser, so a stolen session can
          never create another administrator. Run these from a terminal in the project directory:
        </p>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {[
            { command: 'npm run admin:create', note: 'Add an admin, or reset an existing password' },
            { command: 'npm run admin:list', note: 'List the accounts that exist' },
            { command: 'npm run admin:delete -- --user name', note: 'Remove an account' },
          ].map((entry) => (
            <div key={entry.command} className="rounded-[14px] bg-black/30 px-4 py-3.5">
              <code className="block font-mono text-[0.76rem] text-[color:var(--a-accent)]">{entry.command}</code>
              <p className="mt-2 text-[0.73rem] text-[color:var(--a-faint)]">{entry.note}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
