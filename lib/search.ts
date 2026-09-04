import 'server-only';
import { db } from './db';
import { getSettings } from './settings';
import type { Product, ProductImage, ProductSpec, ProductWithImages } from './types';

export type SearchHit = {
  product: ProductWithImages;
  score: number;
  reason: string;
};

/* ----------------------------------------------------------------- matching */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'to', 'with', 'me', 'i', 'we', 'you', 'my', 'need', 'want',
  'looking', 'show', 'find', 'some', 'any', 'please', 'do', 'have', 'got', 'can',
]);

/** Very small stemmer: enough to tie "glasses" to "glass" and "boxes" to "box". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('hes'))) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokenise(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem)
    .slice(0, 12);
}

/** Damerau-style edit distance, capped: we only care whether it is 1 or 2. */
function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      current[j] = value;
      if (value < best) best = value;
    }

    if (best > max) return max + 1;
    previous = current;
  }

  return previous[b.length];
}

/** How well one query token matches one haystack word. */
function tokenScore(token: string, word: string): number {
  if (word === token) return 1;
  if (word.startsWith(token) || token.startsWith(word)) return 0.85;
  if (word.includes(token)) return 0.6;

  // Only spend edit distance on words long enough for a typo to be plausible.
  if (token.length >= 4 && word.length >= 4) {
    const distance = editDistance(token, word);
    if (distance === 1) return 0.75;
    if (distance === 2) return 0.45;
  }

  return 0;
}

function fieldScore(token: string, text: string): number {
  if (!text) return 0;

  let best = 0;
  for (const word of text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (!word) continue;
    const score = tokenScore(token, stem(word));
    if (score > best) best = score;
    if (best === 1) break;
  }
  return best;
}

/* ------------------------------------------------------------------ search */

type Row = Product & { category_name: string | null; category_slug: string | null };

const WEIGHTS = {
  name: 6,
  category: 3,
  summary: 2.5,
  specs: 1.6,
  description: 1,
};

export function searchProducts(query: string, limit = 24): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const rows = db()
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.visible = 1`,
    )
    .all() as Row[];

  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');

  const images = db()
    .prepare(`SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY position, id`)
    .all(...ids) as ProductImage[];
  const specs = db()
    .prepare(`SELECT * FROM product_specs WHERE product_id IN (${placeholders}) ORDER BY position, id`)
    .all(...ids) as ProductSpec[];

  const imagesBy = new Map<number, ProductImage[]>();
  for (const image of images) {
    imagesBy.set(image.product_id, [...(imagesBy.get(image.product_id) ?? []), image]);
  }

  const specsBy = new Map<number, ProductSpec[]>();
  for (const spec of specs) {
    specsBy.set(spec.product_id, [...(specsBy.get(spec.product_id) ?? []), spec]);
  }

  const tokens = tokenise(trimmed);
  const showPrices = getSettings().show_prices;

  // "12", "#12" and "item 12" should all land straight on that item.
  const referenceMatch = trimmed.match(/^#?\s*(\d{1,6})$/) ?? trimmed.match(/item\s*#?\s*(\d{1,6})/i);
  const wantedItemId = referenceMatch ? Number(referenceMatch[1]) : null;

  const hits: SearchHit[] = [];

  for (const row of rows) {
    const rowSpecs = specsBy.get(row.id) ?? [];
    const specText = rowSpecs.map((spec) => `${spec.label} ${spec.value}`).join(' ');

    let score = 0;
    let matchedName = 0;
    let matchedCategory = 0;
    let matchedSpec = 0;

    if (wantedItemId !== null && row.item_id === wantedItemId) score += 100;

    for (const token of tokens) {
      const name = fieldScore(token, row.name);
      const category = fieldScore(token, row.category_name ?? '');
      const summary = fieldScore(token, row.summary);
      const spec = fieldScore(token, specText);
      const description = fieldScore(token, row.description);

      const tokenTotal =
        name * WEIGHTS.name +
        category * WEIGHTS.category +
        summary * WEIGHTS.summary +
        spec * WEIGHTS.specs +
        description * WEIGHTS.description;

      // A token that matches nothing at all costs the result some ground.
      if (tokenTotal === 0) score -= 0.8;
      else score += tokenTotal;

      if (name > matchedName) matchedName = name;
      if (category > matchedCategory) matchedCategory = category;
      if (spec > matchedSpec) matchedSpec = spec;
    }

    // A gentle nudge so best sellers surface first among equals.
    if (row.featured) score += 0.6;

    if (score <= 0.5) continue;

    const reason =
      wantedItemId !== null && row.item_id === wantedItemId
        ? 'Matches this reference number'
        : matchedName >= 0.6
          ? 'Matches the product name'
          : matchedCategory >= 0.6
            ? `In ${row.category_name}`
            : matchedSpec >= 0.6
              ? 'Matches the specification'
              : 'Mentioned in the description';

    hits.push({
      product: {
        ...row,
        price: showPrices ? row.price : null,
        images: imagesBy.get(row.id) ?? [],
        specs: rowSpecs,
      },
      score,
      reason,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.product.item_id - b.product.item_id);
  return hits.slice(0, limit);
}

/** Collections whose name or wording matches, shown above the product results. */
export function searchCategories(query: string, limit = 4) {
  const tokens = tokenise(query);
  if (!tokens.length) return [];

  const rows = db()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.visible = 1) AS product_count
         FROM categories c WHERE c.visible = 1`,
    )
    .all() as (import('./types').CategoryWithCount)[];

  return rows
    .map((category) => {
      let score = 0;
      for (const token of tokens) {
        score += fieldScore(token, category.name) * 5;
        score += fieldScore(token, category.tagline) * 2;
        score += fieldScore(token, category.description);
      }
      return { category, score };
    })
    .filter((entry) => entry.score > 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.category);
}
