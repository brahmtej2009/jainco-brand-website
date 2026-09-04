import 'server-only';
import { db } from './db';
import { nextItemId } from './queries';
import { bool, num, str } from './api';
import { isStoredFilename } from './media';
import { ValidationError } from './security';

export type IncomingImage = {
  file: string;
  width?: number;
  height?: number;
  alt?: string;
  crop_x?: number;
  crop_y?: number;
  crop_w?: number;
  crop_h?: number;
  fit_mode?: string;
};

export type IncomingSpec = { label?: string; value?: string };

const TEXT_FIELDS = ['summary', 'description'] as const;

/**
 * The only column names that may ever be written. Column names cannot be bound as SQL
 * parameters, so every name interpolated into a statement is checked against this list.
 * A request body can never introduce one.
 */
const WRITABLE_COLUMNS = new Set<string>([
  'item_id',
  'name',
  'category_id',
  'price',
  'currency',
  'availability',
  'featured',
  'visible',
  'position',
  ...TEXT_FIELDS,
]);

const CURRENCIES = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED']);
const AVAILABILITY = new Set(['available', 'made-to-order', 'discontinued']);

const MAX_ITEM_ID = 999_999_999;
const MAX_PRICE = 100_000_000;
const MAX_IMAGES = 12;
const MAX_SPECS = 30;

function assertColumns(columns: string[]) {
  for (const column of columns) {
    if (!WRITABLE_COLUMNS.has(column)) throw new ValidationError('Unsupported field in request.');
  }
}

function fieldValues(body: Record<string, unknown>) {
  const name = str(body.name, 160);
  if (!name) throw new ValidationError('Product name is required.');

  const categoryId = num(body.category_id);
  if (categoryId !== null) {
    if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
      throw new ValidationError('Invalid category.');
    }
    const exists = db().prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId);
    if (!exists) throw new ValidationError('That category no longer exists.');
  }

  const price = num(body.price);
  if (price !== null && (price < 0 || price > MAX_PRICE)) {
    throw new ValidationError('Price is out of range.');
  }

  const currency = str(body.currency, 8).toUpperCase() || 'INR';
  if (!CURRENCIES.has(currency)) throw new ValidationError('Unsupported currency.');

  const availability = str(body.availability, 40) || 'available';
  if (!AVAILABILITY.has(availability)) throw new ValidationError('Unsupported availability value.');

  const position = num(body.position) ?? 0;
  if (!Number.isSafeInteger(position) || Math.abs(position) > 1_000_000) {
    throw new ValidationError('Sort position is out of range.');
  }

  return {
    name,
    category_id: categoryId,
    price,
    currency,
    availability,
    featured: bool(body.featured),
    visible: body.visible === undefined ? 1 : bool(body.visible),
    position,
    ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, str(body[f], f === 'description' ? 8000 : 500)])),
  } as Record<string, unknown> & { name: string };
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function writeImages(productId: number, images: unknown) {
  if (!Array.isArray(images)) return;
  if (images.length > MAX_IMAGES) throw new ValidationError(`A product can hold up to ${MAX_IMAGES} images.`);

  db().prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);

  const insert = db().prepare(
    `INSERT INTO product_images
       (product_id, file, width, height, alt, position, fit_mode, crop_x, crop_y, crop_w, crop_h)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  images.forEach((raw, index) => {
    const image = raw as IncomingImage;

    // Rejects anything not produced by our own upload route.
    if (!isStoredFilename(image?.file)) return;

    // Keep the rectangle inside the image, whatever the client sent.
    const cropW = clamp(image.crop_w, 0.02, 1, 1);
    const cropH = clamp(image.crop_h, 0.02, 1, 1);
    const cropX = clamp(image.crop_x, 0, 1 - cropW, 0);
    const cropY = clamp(image.crop_y, 0, 1 - cropH, 0);

    insert.run(
      productId,
      image.file,
      clamp(image.width, 0, 100_000, 0),
      clamp(image.height, 0, 100_000, 0),
      str(image.alt, 200),
      index,
      image.fit_mode === 'fit' ? 'fit' : 'fill',
      cropX,
      cropY,
      cropW,
      cropH,
    );
  });
}

/** Specifications are whatever the administrator decides to record, in their own order. */
function writeSpecs(productId: number, specs: unknown) {
  if (!Array.isArray(specs)) return;
  if (specs.length > MAX_SPECS) throw new ValidationError(`A product can hold up to ${MAX_SPECS} specifications.`);

  db().prepare('DELETE FROM product_specs WHERE product_id = ?').run(productId);

  const insert = db().prepare(
    'INSERT INTO product_specs (product_id, label, value, position) VALUES (?, ?, ?, ?)',
  );

  let position = 0;
  for (const raw of specs) {
    const spec = raw as IncomingSpec;
    const label = str(spec?.label, 80);
    const value = str(spec?.value, 500);

    // A row with neither a label nor a value is simply an empty line the admin left behind.
    if (!label && !value) continue;
    if (!label) throw new ValidationError('Every specification needs a label.');

    insert.run(productId, label, value, position);
    position += 1;
  }
}

function normalisedItemId(value: unknown, fallback: number): number {
  const requested = num(value);
  if (requested === null) return fallback;

  const itemId = Math.floor(requested);
  if (!Number.isSafeInteger(itemId) || itemId < 1 || itemId > MAX_ITEM_ID) {
    throw new ValidationError('Item ID must be a whole number of 1 or more.');
  }
  return itemId;
}

function assertItemIdFree(itemId: number, exceptProductId?: number) {
  const clash = db()
    .prepare('SELECT id FROM products WHERE item_id = ? AND id != ?')
    .get(itemId, exceptProductId ?? -1);

  if (clash) throw new ValidationError(`Item ID ${itemId} is already used by another product.`);
}

export function createProduct(body: Record<string, unknown>): { id: number; item_id: number } {
  const values = fieldValues(body);
  const itemId = normalisedItemId(body.item_id, nextItemId());
  assertItemIdFree(itemId);

  const columns = ['item_id', ...Object.keys(values)];
  assertColumns(columns);

  const write = db().transaction(() => {
    const info = db()
      .prepare(
        `INSERT INTO products (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})`,
      )
      .run(itemId, ...Object.values(values));

    const id = Number(info.lastInsertRowid);
    writeImages(id, body.images);
    writeSpecs(id, body.specs);
    return id;
  });

  return { id: write(), item_id: itemId };
}

export function updateProduct(id: number, body: Record<string, unknown>): { item_id: number } {
  const existing = db().prepare('SELECT item_id FROM products WHERE id = ?').get(id) as
    | { item_id: number }
    | undefined;
  if (!existing) throw new ValidationError('Product not found.');

  const values = fieldValues(body);
  const itemId = normalisedItemId(body.item_id, existing.item_id);
  assertItemIdFree(itemId, id);

  const columns = ['item_id', ...Object.keys(values)];
  assertColumns(columns);

  const assignments = columns.map((c) => `${c} = ?`).join(', ');

  const write = db().transaction(() => {
    db()
      .prepare(`UPDATE products SET ${assignments}, updated_at = datetime('now') WHERE id = ?`)
      .run(itemId, ...Object.values(values), id);

    writeImages(id, body.images);
    writeSpecs(id, body.specs);
  });

  write();
  return { item_id: itemId };
}
