import 'server-only';
import { db } from './db';
import { getSettings } from './settings';
import type {
  Category,
  CategoryWithCount,
  Product,
  ProductImage,
  ProductSpec,
  ProductWithImages,
} from './types';

function imagesFor(productIds: number[]): Map<number, ProductImage[]> {
  const map = new Map<number, ProductImage[]>();
  if (!productIds.length) return map;

  const placeholders = productIds.map(() => '?').join(',');
  const rows = db()
    .prepare(
      `SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY position, id`,
    )
    .all(...productIds) as ProductImage[];

  for (const row of rows) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

function specsFor(productIds: number[]): Map<number, ProductSpec[]> {
  const map = new Map<number, ProductSpec[]>();
  if (!productIds.length) return map;

  const placeholders = productIds.map(() => '?').join(',');
  const rows = db()
    .prepare(`SELECT * FROM product_specs WHERE product_id IN (${placeholders}) ORDER BY position, id`)
    .all(...productIds) as ProductSpec[];

  for (const row of rows) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

/** Prices never leave the server while the price toggle is off. */
function applyPriceVisibility<T extends Product>(rows: T[]): T[] {
  if (getSettings().show_prices) return rows;
  return rows.map((row) => ({ ...row, price: null }));
}

function hydrate(rows: (Product & { category_name?: string; category_slug?: string })[]): ProductWithImages[] {
  const ids = rows.map((r) => r.id);
  const images = imagesFor(ids);
  const specs = specsFor(ids);

  return applyPriceVisibility(rows).map((row) => ({
    ...row,
    images: images.get(row.id) ?? [],
    specs: specs.get(row.id) ?? [],
  }));
}

// ---------- categories ----------

export function listCategories(includeHidden = false): CategoryWithCount[] {
  return db()
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM products p
                WHERE p.category_id = c.id ${includeHidden ? '' : 'AND p.visible = 1'}) AS product_count
         FROM categories c
        ${includeHidden ? '' : 'WHERE c.visible = 1'}
        ORDER BY c.position, c.name`,
    )
    .all() as CategoryWithCount[];
}

export function getCategoryBySlug(slug: string): Category | null {
  return (db().prepare('SELECT * FROM categories WHERE slug = ?').get(slug) as Category) ?? null;
}

// ---------- products ----------

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id`;

export function listProductsByCategory(categoryId: number): ProductWithImages[] {
  const rows = db()
    .prepare(`${PRODUCT_SELECT} WHERE p.category_id = ? AND p.visible = 1 ORDER BY p.position, p.item_id`)
    .all(categoryId) as Product[];
  return hydrate(rows);
}

/** Only products an administrator actually marked as a best seller. */
export function listFeaturedProducts(limit = 8): ProductWithImages[] {
  const rows = db()
    .prepare(
      `${PRODUCT_SELECT} WHERE p.visible = 1 AND p.featured = 1 ORDER BY p.position, p.item_id LIMIT ?`,
    )
    .all(limit) as Product[];
  return hydrate(rows);
}

export function getProductByItemId(itemId: number): ProductWithImages | null {
  const row = db()
    .prepare(`${PRODUCT_SELECT} WHERE p.item_id = ? AND p.visible = 1`)
    .get(itemId) as Product | undefined;
  if (!row) return null;
  return hydrate([row])[0];
}

export function listRelatedProducts(product: ProductWithImages, limit = 4): ProductWithImages[] {
  const rows = db()
    .prepare(
      `${PRODUCT_SELECT}
        WHERE p.visible = 1 AND p.id != ?
          AND (p.category_id = ? OR ? IS NULL)
        ORDER BY p.position, p.item_id LIMIT ?`,
    )
    .all(product.id, product.category_id, product.category_id, limit) as Product[];
  return hydrate(rows);
}

export function allProductItemIds(): number[] {
  const rows = db().prepare('SELECT item_id FROM products WHERE visible = 1').all() as { item_id: number }[];
  return rows.map((r) => r.item_id);
}

export function catalogStats() {
  const products = db().prepare('SELECT COUNT(*) AS c FROM products WHERE visible = 1').get() as { c: number };
  const categories = db().prepare('SELECT COUNT(*) AS c FROM categories WHERE visible = 1').get() as { c: number };
  return { products: products.c, categories: categories.c };
}

// ---------- admin (unfiltered) ----------

export function adminListProducts(search = ''): ProductWithImages[] {
  const term = search.trim();
  let rows: Product[];

  if (!term) {
    rows = db().prepare(`${PRODUCT_SELECT} ORDER BY p.item_id`).all() as Product[];
  } else if (/^\d+$/.test(term)) {
    rows = db()
      .prepare(`${PRODUCT_SELECT} WHERE p.item_id = ? OR p.name LIKE ? ORDER BY p.item_id`)
      .all(Number(term), `%${term}%`) as Product[];
  } else {
    const like = `%${term}%`;
    rows = db()
      .prepare(
        `${PRODUCT_SELECT} WHERE p.name LIKE ? OR p.summary LIKE ? OR p.material LIKE ? OR c.name LIKE ?
          ORDER BY p.item_id`,
      )
      .all(like, like, like, like) as Product[];
  }

  const ids = rows.map((r) => r.id);
  const images = imagesFor(ids);
  const specs = specsFor(ids);

  return rows.map((row) => ({
    ...row,
    images: images.get(row.id) ?? [],
    specs: specs.get(row.id) ?? [],
  }));
}

export function adminGetProduct(id: number): ProductWithImages | null {
  const row = db().prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id) as Product | undefined;
  if (!row) return null;

  return {
    ...row,
    images: imagesFor([row.id]).get(row.id) ?? [],
    specs: specsFor([row.id]).get(row.id) ?? [],
  };
}

export function nextItemId(): number {
  const row = db().prepare('SELECT COALESCE(MAX(item_id), 0) AS m FROM products').get() as { m: number };
  return row.m + 1;
}
