'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import ImageManager, { type EditableImage } from './ImageManager';
import { Spinner, Toggle, useToast } from './ui';
import { formatItemId } from '@/lib/utils';
import type { Category, ProductWithImages } from '@/lib/types';

type SpecRow = { key: string; label: string; value: string };

type Draft = {
  name: string;
  item_id: string;
  category_id: string;
  summary: string;
  description: string;
  price: string;
  currency: string;
  availability: string;
  featured: boolean;
  visible: boolean;
  position: string;
};

const SUGGESTED_LABELS = [
  'Material',
  'Dimensions',
  'Capacity',
  'Finish',
  'Colour',
  'Weight',
  'Packing',
  'Minimum order',
  'Availability',
  'Care',
];

let rowSeed = 0;
const newRow = (label = '', value = ''): SpecRow => ({ key: `spec-${(rowSeed += 1)}`, label, value });

export default function ProductForm({
  product,
  categories,
  suggestedItemId,
}: {
  product: ProductWithImages | null;
  categories: Category[];
  suggestedItemId: number;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [draft, setDraft] = useState<Draft>({
    name: product?.name ?? '',
    item_id: String(product?.item_id ?? suggestedItemId),
    category_id: product?.category_id ? String(product.category_id) : '',
    summary: product?.summary ?? '',
    description: product?.description ?? '',
    price: product?.price != null ? String(product.price) : '',
    currency: product?.currency ?? 'INR',
    availability: product?.availability ?? 'available',
    featured: Boolean(product?.featured),
    visible: product ? Boolean(product.visible) : true,
    position: String(product?.position ?? 0),
  });

  const [images, setImages] = useState<EditableImage[]>(
    (product?.images ?? []).map((image) => ({
      file: image.file,
      width: image.width,
      height: image.height,
      alt: image.alt,
      crop_x: image.crop_x ?? 0,
      crop_y: image.crop_y ?? 0,
      crop_w: image.crop_w ?? 1,
      crop_h: image.crop_h ?? 1,
      fit_mode: image.fit_mode === 'fit' ? 'fit' : 'fill',
    })),
  );

  // Specifications start empty. Rows are added only when the admin wants them.
  const [specs, setSpecs] = useState<SpecRow[]>(
    (product?.specs ?? []).map((spec) => newRow(spec.label, spec.value)),
  );

  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function updateSpec(index: number, patch: Partial<SpecRow>) {
    setSpecs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function moveSpec(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= specs.length) return;

    setSpecs((rows) => {
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!draft.name.trim()) {
      notify('Give the product a name.', 'error');
      return;
    }
    if (specs.some((row) => !row.label.trim() && row.value.trim())) {
      notify('Every specification needs a label.', 'error');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...draft,
        item_id: draft.item_id === '' ? null : Number(draft.item_id),
        category_id: draft.category_id === '' ? null : Number(draft.category_id),
        price: draft.price === '' ? null : Number(draft.price),
        position: Number(draft.position) || 0,
        images,
        specs: specs
          .filter((row) => row.label.trim() || row.value.trim())
          .map((row) => ({ label: row.label, value: row.value })),
      };

      const response = await fetch(
        product ? `/api/admin/products/${product.id}` : '/api/admin/products',
        {
          method: product ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save.');

      notify(product ? 'Product updated.' : 'Product added.');
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!product) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete.');

      notify(`"${product.name}" deleted.`);
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete.', 'error');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      {/* ---------------- header ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="a-btn a-btn-quiet !px-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-[1.15rem] font-semibold">
              {product ? product.name : 'New product'}
            </h1>
            <p className="text-[0.78rem] text-[color:var(--a-muted)]">
              {product ? `Item ${formatItemId(product.item_id)}` : `Next free reference is ${formatItemId(suggestedItemId)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/products" className="a-btn">
            Cancel
          </Link>
          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Save size={14} />}
            {product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        {/* ---------------- left column ---------------- */}
        <div className="space-y-4">
          <section className="a-card p-5">
            <h2 className="a-section-title">Details</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_130px]">
              <div>
                <label className="a-label" htmlFor="p-name">
                  Product name
                </label>
                <input
                  id="p-name"
                  className="a-input"
                  value={draft.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder="Faceted highball tumbler"
                  required
                />
              </div>

              <div>
                <label className="a-label" htmlFor="p-item">
                  Item ID
                </label>
                <input
                  id="p-item"
                  type="number"
                  min={1}
                  className="a-input font-mono"
                  value={draft.item_id}
                  onChange={(event) => set('item_id', event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="a-label" htmlFor="p-category">
                Collection
              </label>
              <select
                id="p-category"
                className="a-input"
                value={draft.category_id}
                onChange={(event) => set('category_id', event.target.value)}
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="a-label" htmlFor="p-summary">
                Short summary
              </label>
              <input
                id="p-summary"
                className="a-input"
                value={draft.summary}
                onChange={(event) => set('summary', event.target.value)}
                placeholder="One line, shown under the product in the gallery"
              />
            </div>

            <div className="mt-4">
              <label className="a-label" htmlFor="p-description">
                Description
              </label>
              <textarea
                id="p-description"
                className="a-input min-h-[150px] resize-y"
                value={draft.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="What the piece is, how it is made, and where it is used."
              />
            </div>
          </section>

          {/* ---------------- custom specifications ---------------- */}
          <section className="a-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="a-section-title">Specifications</h2>
              <button type="button" onClick={() => setSpecs((rows) => [...rows, newRow()])} className="a-btn">
                <Plus size={14} />
                Add field
              </button>
            </div>

            {specs.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-[color:var(--a-line)] px-5 py-8 text-center">
                <p className="text-[0.86rem] text-[color:var(--a-muted)]">No specification fields yet.</p>
                <p className="mt-1 text-[0.78rem] text-[color:var(--a-faint)]">
                  Add only the fields this product needs. Each one is a label and a value.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {SUGGESTED_LABELS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSpecs((rows) => [...rows, newRow(label)])}
                      className="a-chip hover:!border-[color:var(--a-accent)] hover:!text-[color:var(--a-text)]"
                    >
                      <Plus size={11} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {specs.map((row, index) => (
                    <li key={row.key} className="flex items-start gap-2">
                      <div className="flex flex-col pt-1.5">
                        <button
                          type="button"
                          onClick={() => moveSpec(index, -1)}
                          disabled={index === 0}
                          className="text-[color:var(--a-faint)] transition-colors hover:text-[color:var(--a-text)] disabled:opacity-25"
                          aria-label="Move up"
                        >
                          <GripVertical size={14} />
                        </button>
                      </div>

                      <input
                        className="a-input w-[38%] shrink-0"
                        value={row.label}
                        onChange={(event) => updateSpec(index, { label: event.target.value })}
                        placeholder="Label, e.g. Capacity"
                        list="spec-label-suggestions"
                        aria-label={`Specification ${index + 1} label`}
                      />
                      <input
                        className="a-input"
                        value={row.value}
                        onChange={(event) => updateSpec(index, { value: event.target.value })}
                        placeholder="Value, e.g. 350 ml"
                        aria-label={`Specification ${index + 1} value`}
                      />

                      <button
                        type="button"
                        onClick={() => setSpecs((rows) => rows.filter((_, i) => i !== index))}
                        className="a-btn a-btn-quiet mt-0.5 !px-2 hover:!text-[color:var(--a-danger)]"
                        aria-label="Remove field"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setSpecs((rows) => [...rows, newRow()])}
                  className="a-btn a-btn-quiet mt-3"
                >
                  <Plus size={14} />
                  Add another field
                </button>
              </>
            )}

            <datalist id="spec-label-suggestions">
              {SUGGESTED_LABELS.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </section>
        </div>

        {/* ---------------- right column ---------------- */}
        <div className="space-y-4">
          <section className="a-card p-5">
            <h2 className="a-section-title">Images</h2>
            <p className="mb-3 mt-1 text-[0.76rem] text-[color:var(--a-faint)]">
              Click any picture to choose what part of it shows.
            </p>
            <ImageManager images={images} onChange={setImages} />
          </section>

          <section className="a-card p-5">
            <h2 className="a-section-title">Commercial</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="a-label" htmlFor="p-price">
                  Price
                </label>
                <input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min={0}
                  className="a-input"
                  value={draft.price}
                  onChange={(event) => set('price', event.target.value)}
                  placeholder="0.00"
                />
                <p className="mt-1 text-[0.72rem] text-[color:var(--a-faint)]">
                  Hidden on the site unless the price toggle is on.
                </p>
              </div>

              <div>
                <label className="a-label" htmlFor="p-currency">
                  Currency
                </label>
                <select
                  id="p-currency"
                  className="a-input"
                  value={draft.currency}
                  onChange={(event) => set('currency', event.target.value)}
                >
                  {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="a-label" htmlFor="p-availability">
                  Availability
                </label>
                <select
                  id="p-availability"
                  className="a-input"
                  value={draft.availability}
                  onChange={(event) => set('availability', event.target.value)}
                >
                  <option value="available">In stock</option>
                  <option value="made-to-order">Order in</option>
                  <option value="discontinued">No longer stocked</option>
                </select>
              </div>

              <div>
                <label className="a-label" htmlFor="p-position">
                  Sort position
                </label>
                <input
                  id="p-position"
                  type="number"
                  className="a-input"
                  value={draft.position}
                  onChange={(event) => set('position', event.target.value)}
                />
                <p className="mt-1 text-[0.72rem] text-[color:var(--a-faint)]">Lower shows first.</p>
              </div>
            </div>
          </section>

          <section className="a-card space-y-5 p-5">
            <h2 className="a-section-title">Visibility</h2>

            <Toggle
              label="Visible on the site"
              hint="Turn off to keep the item in the system but out of the public catalogue."
              checked={draft.visible}
              onChange={(next) => set('visible', next)}
            />
            <Toggle
              label="Show in Our Best Sellers"
              hint="Featured items appear first in the home page strip."
              checked={draft.featured}
              onChange={(next) => set('featured', next)}
            />
          </section>

          {product && (
            <section className="a-card p-5">
              <h2 className="a-section-title">Danger zone</h2>

              {confirmDelete ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[0.82rem] text-[color:var(--a-danger)]">Delete permanently?</span>
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
                  Delete this product
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </form>
  );
}
