'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Hash, Mail, Phone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Spinner, useToast } from './ui';
import type { Enquiry } from '@/lib/enquiries';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'archived', label: 'Archived' },
] as const;

const STATUS_STYLE: Record<string, { label: string; colour: string }> = {
  new: { label: 'New', colour: 'var(--a-accent)' },
  read: { label: 'Read', colour: 'rgba(214,232,255,0.55)' },
  archived: { label: 'Archived', colour: 'rgba(214,232,255,0.3)' },
};

function formatDate(value: string) {
  const parsed = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EnquiriesPanel({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { notify } = useToast();

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(
    async (status: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/enquiries?status=${encodeURIComponent(status)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not load enquiries.');

        setEnquiries(data.enquiries);
        onCountChange?.(data.newCount);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not load enquiries.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [notify, onCountChange],
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function setStatus(id: number, status: string) {
    const response = await fetch(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (response.ok) void load(filter);
    else notify('Could not update that enquiry.', 'error');
  }

  async function remove(id: number) {
    const response = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });

    if (response.ok) {
      notify('Enquiry deleted.');
      void load(filter);
    } else {
      notify('Could not delete that enquiry.', 'error');
    }
  }

  function toggle(enquiry: Enquiry) {
    const next = openId === enquiry.id ? null : enquiry.id;
    setOpenId(next);

    // Opening an unread enquiry marks it read, the way a mailbox does.
    if (next !== null && enquiry.status === 'new') void setStatus(enquiry.id, 'read');
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8rem] text-[color:var(--a-muted)]">
          Messages sent through the contact form and the enquiry buttons on product pages.
        </p>

        <div className="a-card flex items-center gap-1 p-1">
          {FILTERS.map((option) => (
            <button
              key={option.key || 'all'}
              type="button"
              onClick={() => setFilter(option.key)}
              className="relative rounded-full px-4 py-1.5 text-[0.74rem] transition-colors"
              style={{ color: filter === option.key ? '#fff' : 'var(--a-faint)' }}
            >
              {filter === option.key && (
                <motion.span
                  layoutId="enquiry-filter"
                  className="absolute inset-0 -z-10 rounded-full bg-white/10"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(210,245,255,0.3)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24">
          <Spinner size={22} />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="a-card mt-6 px-8 py-16 text-center">
          <p className="text-[1rem] font-medium">No enquiries here yet.</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.84rem] text-[color:var(--a-muted)]">
            Messages sent from the contact page and the enquiry buttons on product pages arrive in
            this list.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          <AnimatePresence initial={false}>
            {enquiries.map((enquiry, index) => {
              const status = STATUS_STYLE[enquiry.status] ?? STATUS_STYLE.read;
              const open = openId === enquiry.id;

              return (
                <motion.li
                  key={enquiry.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.02 }}
                  className="a-card overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggle(enquiry)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                    aria-expanded={open}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: status.colour,
                        boxShadow: enquiry.status === 'new' ? `0 0 10px 1px ${status.colour}` : 'none',
                      }}
                      aria-hidden
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[0.92rem] font-medium text-white">{enquiry.name}</span>
                        {enquiry.company && (
                          <span className="text-[0.76rem] text-[color:var(--a-faint)]">{enquiry.company}</span>
                        )}
                        {enquiry.item_ref && (
                          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[0.68rem] text-[color:var(--a-accent)]">
                            {enquiry.item_ref}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-[0.78rem] text-[color:var(--a-muted)]">
                        {enquiry.message}
                      </span>
                    </span>

                    <span className="hidden shrink-0 text-[0.72rem] text-[color:var(--a-faint)] sm:block">
                      {formatDate(enquiry.created_at)}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/10 px-5 py-5">
                          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[0.82rem]">
                            <a
                              href={`mailto:${enquiry.email}?subject=${encodeURIComponent(
                                `Re: your JainCo enquiry${enquiry.item_ref ? ` (item ${enquiry.item_ref})` : ''}`,
                              )}`}
                              className="flex items-center gap-2 text-white/85 transition-colors hover:text-[color:var(--a-accent)]"
                            >
                              <Mail size={14} className="text-[color:var(--a-accent)]" />
                              {enquiry.email}
                            </a>

                            {enquiry.phone && (
                              <a
                                href={`tel:${enquiry.phone.replace(/\s+/g, '')}`}
                                className="flex items-center gap-2 text-white/85 transition-colors hover:text-[color:var(--a-accent)]"
                              >
                                <Phone size={14} className="text-[color:var(--a-accent)]" />
                                {enquiry.phone}
                              </a>
                            )}

                            {enquiry.company && (
                              <span className="flex items-center gap-2 text-white/70">
                                <Building2 size={14} className="text-[color:var(--a-accent)]" />
                                {enquiry.company}
                              </span>
                            )}

                            {enquiry.item_ref && (
                              <span className="flex items-center gap-2 text-white/70">
                                <Hash size={14} className="text-[color:var(--a-accent)]" />
                                Item {enquiry.item_ref}
                              </span>
                            )}
                          </div>

                          <p className="mt-5 whitespace-pre-line text-[0.88rem] leading-relaxed text-white/85">
                            {enquiry.message}
                          </p>

                          <div className="mt-6 flex flex-wrap items-center gap-2.5">
                            <span className="text-[0.72rem] text-[color:var(--a-faint)] sm:hidden">
                              {formatDate(enquiry.created_at)}
                            </span>

                            {enquiry.status !== 'archived' ? (
                              <button
                                type="button"
                                onClick={() => setStatus(enquiry.id, 'archived')}
                                className="a-btn"
                              >
                                Archive
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setStatus(enquiry.id, 'read')}
                                className="a-btn"
                              >
                                Restore
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => remove(enquiry.id)}
                              className="flex items-center gap-2 rounded-full px-3 py-2 text-[0.74rem] text-[color:var(--a-faint)] transition-colors hover:bg-red-500/15 hover:text-red-300"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
