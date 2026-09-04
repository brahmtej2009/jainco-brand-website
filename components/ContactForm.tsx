'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Check, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

type Draft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  item_ref: string;
  website: string;
};

export default function ContactForm({ compact = false }: { compact?: boolean }) {
  const params = useSearchParams();
  const prefilledRef = params.get('item') ?? '';

  const [draft, setDraft] = useState<Draft>({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: prefilledRef
      ? `I would like the price and availability for item ${prefilledRef}.\n\nHow many:\n`
      : '',
    item_ref: prefilledRef,
    website: '',
  });

  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? 'We could not send that just now.');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send that just now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`glass relative overflow-hidden ${compact ? 'p-6 sm:p-8' : 'p-7 sm:p-10'}`}>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="py-10 text-center"
          >
            <motion.span
              className="mx-auto grid h-16 w-16 place-items-center rounded-full"
              style={{
                background: 'linear-gradient(140deg, #ffffff, var(--aqua))',
                color: '#03131c',
                boxShadow: '0 18px 44px -18px rgba(121,230,255,0.9)',
              }}
              initial={{ scale: 0.4, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            >
              <Check size={26} strokeWidth={2.5} />
            </motion.span>

            <h3 className="display mt-6 text-[1.9rem]">Thank you, your enquiry is with us</h3>
            <p className="lede mx-auto mt-3 max-w-sm text-sm">
              We will come back with prices and availability, usually within three business days. For a
              quicker answer, give the shop a call.
            </p>

            <button
              type="button"
              onClick={() => {
                setSent(false);
                setDraft((current) => ({ ...current, message: '', item_ref: '' }));
              }}
              className="btn btn-ghost mt-8 !px-5 !py-2.5"
            >
              Send another
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="contact-name">
                  Your name
                </label>
                <input
                  id="contact-name"
                  className="field"
                  value={draft.name}
                  onChange={(event) => set('name', event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="contact-company">
                  Company <span className="normal-case tracking-normal opacity-60">(optional)</span>
                </label>
                <input
                  id="contact-company"
                  className="field"
                  value={draft.company}
                  onChange={(event) => set('company', event.target.value)}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="contact-email">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="field"
                  value={draft.email}
                  onChange={(event) => set('email', event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="contact-phone">
                  Phone <span className="normal-case tracking-normal opacity-60">(optional)</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  className="field"
                  value={draft.phone}
                  onChange={(event) => set('phone', event.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            {draft.item_ref && (
              <div>
                <label className="label" htmlFor="contact-item">
                  Item reference
                </label>
                <input
                  id="contact-item"
                  className="field font-mono"
                  value={draft.item_ref}
                  onChange={(event) => set('item_ref', event.target.value)}
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="contact-message">
                How can we help?
              </label>
              <textarea
                id="contact-message"
                className="field min-h-[140px] resize-y leading-relaxed"
                value={draft.message}
                onChange={(event) => set('message', event.target.value)}
                placeholder="Tell us which pieces interest you and how many you need. Item numbers help us find them quickly."
                required
              />
            </div>

            {/* Honeypot: hidden from people, irresistible to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={draft.website}
              onChange={(event) => set('website', event.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-lg px-3.5 py-2.5 text-[0.82rem] text-red-200"
                style={{ background: 'rgba(255,90,90,0.1)', boxShadow: 'inset 0 0 0 1px rgba(255,120,120,0.35)' }}
              >
                {error}
              </motion.p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending' : 'Send enquiry'}
                {!busy && <Send size={14} />}
              </button>
              <p className="text-[0.74rem] text-[color:var(--faint)]">
                We use your details only to answer this enquiry.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
