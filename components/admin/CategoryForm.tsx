'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import ImageManager, { blankImage, type EditableImage } from './ImageManager';
import { Spinner, Toggle, useToast } from './ui';
import type { CategoryWithCount } from '@/lib/types';

export default function CategoryForm({ category }: { category: CategoryWithCount | null }) {
  const router = useRouter();
  const { notify } = useToast();

  const [draft, setDraft] = useState({
    name: category?.name ?? '',
    tagline: category?.tagline ?? '',
    description: category?.description ?? '',
    position: String(category?.position ?? 0),
    visible: category ? Boolean(category.visible) : true,
  });

  const [cover, setCover] = useState<EditableImage[]>(
    category?.cover_image ? [blankImage(category.cover_image, 0, 0)] : [],
  );

  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!draft.name.trim()) {
      notify('Give the collection a name.', 'error');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        category ? `/api/admin/categories/${category.id}` : '/api/admin/categories',
        {
          method: category ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            position: Number(draft.position) || 0,
            cover_image: cover[0]?.file ?? null,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save.');

      notify(category ? 'Collection updated.' : 'Collection created.');
      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!category) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete.');

      notify(`"${category.name}" deleted. Its products are now uncategorised.`);
      router.push('/admin/categories');
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete.', 'error');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/categories" className="a-btn a-btn-quiet !px-2">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-[1.15rem] font-semibold">{category ? category.name : 'New collection'}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/categories" className="a-btn">
            Cancel
          </Link>
          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <section className="a-card p-5">
          <h2 className="a-section-title">Details</h2>

          <div className="mt-4">
            <label className="a-label" htmlFor="c-name">
              Name
            </label>
            <input
              id="c-name"
              className="a-input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Drinkware"
              required
              autoFocus
            />
          </div>

          <div className="mt-4">
            <label className="a-label" htmlFor="c-tagline">
              Tagline
            </label>
            <input
              id="c-tagline"
              className="a-input"
              value={draft.tagline}
              onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
              placeholder="Tumblers, highballs and stemware for daily use"
            />
            <p className="mt-1 text-[0.72rem] text-[color:var(--a-faint)]">
              One line, shown on the collection card and on the home page.
            </p>
          </div>

          <div className="mt-4">
            <label className="a-label" htmlFor="c-description">
              Description
            </label>
            <textarea
              id="c-description"
              className="a-input min-h-[120px] resize-y"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </div>

          <div className="mt-4 w-40">
            <label className="a-label" htmlFor="c-position">
              Sort position
            </label>
            <input
              id="c-position"
              type="number"
              className="a-input"
              value={draft.position}
              onChange={(event) => setDraft({ ...draft, position: event.target.value })}
            />
          </div>
        </section>

        <div className="space-y-4">
          <section className="a-card p-5">
            <h2 className="a-section-title">Cover image</h2>
            <p className="mb-3 mt-1 text-[0.76rem] text-[color:var(--a-faint)]">
              Click the picture to choose what part of it shows.
            </p>
            <ImageManager images={cover} onChange={setCover} single />
          </section>

          <section className="a-card p-5">
            <h2 className="a-section-title">Visibility</h2>
            <div className="mt-4">
              <Toggle
                label="Visible on the site"
                hint="Hidden collections stay in the system but drop out of the public catalogue."
                checked={draft.visible}
                onChange={(next) => setDraft({ ...draft, visible: next })}
              />
            </div>
          </section>

          {category && (
            <section className="a-card p-5">
              <h2 className="a-section-title">Danger zone</h2>
              <p className="mt-2 text-[0.78rem] text-[color:var(--a-muted)]">
                Products in this collection are kept and simply become uncategorised.
              </p>

              {confirmDelete ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={remove} className="a-btn a-btn-danger" disabled={busy}>
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="a-btn">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="a-btn a-btn-danger mt-3"
                >
                  <Trash2 size={14} />
                  Delete this collection
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </form>
  );
}
