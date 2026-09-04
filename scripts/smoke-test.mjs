/**
 * Exercises every feature against a running server: public pages, search, the contact
 * form, and the full admin lifecycle for collections and products.
 *
 *   npm run dev            (in one terminal)
 *   npm run test:smoke     (in another)
 *
 * It creates a temporary admin account and temporary catalogue rows, then removes them.
 */
import bcrypt from 'bcryptjs';
import { openDb } from './db.mjs';
import { renderGlass } from './demo-images.mjs';

const flag = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const BASE = flag('--url', 'http://localhost:3000').replace(/\/$/, '');
const TEST_USER = 'smoke-test-admin';
const TEST_PASS = 'smoke-test-password-9137';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

let cookie = '';

async function call(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (cookie) headers.set('cookie', cookie);
  if (init.method && init.method !== 'GET') headers.set('origin', BASE);

  const response = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });

  const setCookie = response.headers.getSetCookie?.() ?? [];
  for (const entry of setCookie) {
    if (entry.startsWith('jainco_session=')) cookie = entry.split(';')[0];
  }

  return response;
}

const asJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------ public pages */

async function publicPages() {
  const db = openDb();
  const category = db.prepare('SELECT slug FROM categories WHERE visible = 1 LIMIT 1').get();
  const product = db.prepare('SELECT item_id FROM products WHERE visible = 1 LIMIT 1').get();
  db.close();

  const pages = [
    ['/', 'JainCo'],
    ['/about', 'One shop'],
    ['/catalog', 'Collections'],
    ['/contact', 'Get in touch'],
    ['/robots.txt', 'Disallow'],
    ['/sitemap.xml', '<urlset'],
    ['/icon.svg', '<svg'],
  ];

  if (category) pages.push([`/catalog/${category.slug}`, 'Other collections']);
  if (product) pages.push([`/product/${product.item_id}`, 'reference ID']);

  for (const [path, marker] of pages) {
    const response = await call(path);
    const body = await response.text();

    check(`GET ${path} responds 200`, response.status === 200, `got ${response.status}`);
    check(`GET ${path} renders its content`, body.includes(marker), `missing "${marker}"`);
  }

  // Things that should not exist.
  for (const path of ['/product/999999', '/catalog/no-such-collection', '/nope']) {
    const response = await call(path);
    check(`GET ${path} is a 404`, response.status === 404, `got ${response.status}`);
  }
}

async function retiredWording() {
  const db = openDb();
  const product = db.prepare('SELECT item_id FROM products WHERE visible = 1 LIMIT 1').get();
  db.close();
  if (!product) return;

  const body = await (await call(`/product/${product.item_id}`)).text();

  check('product page no longer says "In production"', !body.includes('In production'));
  check('product page uses the reference wording', body.includes('This product has reference ID'));

  const home = await (await call('/')).text();
  check('home page shows Our Best Sellers', home.includes('Our Best Sellers'));
  check('home page has no em dashes', !home.includes('—'), 'found an em dash');
}

/* ------------------------------------------------------------------ search */

async function search() {
  const db = openDb();
  const product = db.prepare('SELECT item_id, name FROM products WHERE visible = 1 LIMIT 1').get();
  db.close();
  if (!product) return;

  const firstWord = product.name.split(/\s+/)[0];

  const byName = await asJson(await call(`/api/search?q=${encodeURIComponent(firstWord)}`));
  check('search finds a product by name', byName?.products?.some((p) => p.item_id === product.item_id));

  const byRef = await asJson(await call(`/api/search?q=%23${product.item_id}`));
  check('search jumps to an item by reference', byRef?.products?.[0]?.item_id === product.item_id);

  // A near-miss spelling should still land.
  const typo = `${firstWord.slice(0, -1)}${firstWord.slice(-1) === 'e' ? 'a' : 'e'}`;
  const fuzzy = await asJson(await call(`/api/search?q=${encodeURIComponent(typo)}`));
  check('search tolerates a typo', (fuzzy?.products?.length ?? 0) > 0, `"${typo}" found nothing`);

  const empty = await asJson(await call('/api/search?q=qqzzxx'));
  check('search returns nothing for nonsense', (empty?.products?.length ?? 0) === 0);

  const short = await asJson(await call('/api/search?q=a'));
  check('search ignores a single character', (short?.products?.length ?? 0) === 0);
}

/* ------------------------------------------------------------ contact form */

async function contactForm() {
  const db = openDb();
  const before = db.prepare('SELECT COUNT(*) c FROM enquiries').get().c;
  db.close();

  const send = (body) =>
    call('/api/enquiries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  // Ten failures in a row must not use up the send budget.
  for (let i = 0; i < 10; i += 1) {
    await send({ name: '', email: 'not-an-email', message: 'x' });
  }

  const good = await send({
    name: 'Smoke Test',
    email: 'smoke@example.com',
    phone: '+91 90000 00000',
    company: 'Smoke Ltd',
    message: 'A valid enquiry sent after several failed attempts, which must still go through.',
    item_ref: '#1',
  });
  check('a valid enquiry still sends after failed attempts', good.status === 201, `got ${good.status}`);

  const spam = await send({
    name: 'Bot',
    email: 'bot@spam.example',
    message: 'A message long enough to pass validation.',
    website: 'http://spam.example',
  });

  const db2 = openDb();
  const after = db2.prepare('SELECT COUNT(*) c FROM enquiries').get().c;
  db2.close();

  check('honeypot submissions are discarded', spam.status < 400 && after === before + 1, `rows ${before} -> ${after}`);
}

/* ------------------------------------------------------------------- admin */

async function signIn() {
  const db = openDb();
  db.prepare('DELETE FROM users WHERE username = ?').run(TEST_USER);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
    TEST_USER,
    bcrypt.hashSync(TEST_PASS, 10),
  );
  db.close();

  const bad = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: TEST_USER, password: 'wrong-password' }),
  });
  check('wrong password is refused', bad.status === 401, `got ${bad.status}`);

  const response = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
  });
  check('admin can sign in', response.status === 200, `got ${response.status}`);

  const session = await asJson(await call('/api/auth/session'));
  check('session reports the signed-in admin', session?.user?.username === TEST_USER);

  return response.status === 200;
}

async function adminLifecycle() {
  // ---- collection ----
  const created = await asJson(
    await call('/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Test Collection', tagline: 'Temporary', visible: 1 }),
    }),
  );
  check('collection created', Boolean(created?.id), JSON.stringify(created));
  if (!created?.id) return;

  const catalogue = await (await call('/catalog')).text();
  check('new collection appears in the catalogue', catalogue.includes('Smoke Test Collection'));

  // ---- upload ----
  const rendered = renderGlass({ width: 800, height: 1000, shape: 'vase', palette: 'aqua', seed: 5 });
  const form = new FormData();
  form.append('file', new File([rendered.buffer], 'smoke.png', { type: 'image/png' }));

  const upload = await asJson(await call('/api/admin/upload', { method: 'POST', body: form }));
  check('image upload accepted', Boolean(upload?.files?.[0]?.file), JSON.stringify(upload));

  const image = upload?.files?.[0];
  check('upload reports real dimensions', image?.width === 800 && image?.height === 1000);

  // ---- product with custom specs and a crop ----
  const productBody = {
    name: 'Smoke Test Piece',
    summary: 'Temporary product created by the smoke test',
    description: 'This row exists only while the test runs.',
    category_id: created.id,
    price: 999,
    currency: 'INR',
    availability: 'available',
    featured: 1,
    visible: 1,
    position: 0,
    specs: [
      { label: 'Material', value: 'Test glass' },
      { label: 'Capacity', value: '123 ml' },
      { label: '', value: '' },
    ],
    images: image
      ? [{ ...image, alt: 'Smoke test', fit_mode: 'fill', crop_x: 0.1, crop_y: 0.2, crop_w: 0.5, crop_h: 0.625 }]
      : [],
  };

  const product = await asJson(
    await call('/api/admin/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(productBody),
    }),
  );
  check('product created', Boolean(product?.id), JSON.stringify(product));
  if (!product?.id) return;

  const fetched = await asJson(await call(`/api/admin/products/${product.id}`));
  check('empty specification rows are dropped', fetched?.product?.specs?.length === 2);
  check('crop rectangle stored', Math.abs((fetched?.product?.images?.[0]?.crop_w ?? 0) - 0.5) < 0.001);

  const page = await (await call(`/product/${product.item_id}`)).text();
  check('product page shows its custom specifications', page.includes('Test glass') && page.includes('123 ml'));
  check('product page shows the reference', page.includes(`#${product.item_id}`));

  // ---- duplicate reference is refused ----
  const clash = await call('/api/admin/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...productBody, item_id: product.item_id }),
  });
  check('duplicate item ID refused', clash.status === 400, `got ${clash.status}`);

  // ---- best sellers only shows featured ----
  const db = openDb();
  const featuredCount = db.prepare('SELECT COUNT(*) c FROM products WHERE featured = 1 AND visible = 1').get().c;
  db.close();

  const home = await (await call('/')).text();
  const homeRefs = (home.match(/Smoke Test Piece/g) ?? []).length;
  check('featured product reaches Our Best Sellers', homeRefs > 0, `featured rows: ${featuredCount}`);

  // ---- unfeature, and it should leave ----
  await call(`/api/admin/products/${product.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...productBody, featured: 0 }),
  });
  const homeAgain = await (await call('/')).text();
  check('an unfeatured product leaves Our Best Sellers', !homeAgain.includes('Smoke Test Piece'));

  // ---- hidden products drop out of the public site ----
  await call(`/api/admin/products/${product.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...productBody, visible: 0 }),
  });
  const hidden = await call(`/product/${product.item_id}`);
  check('hidden product is not public', hidden.status === 404, `got ${hidden.status}`);

  // ---- price toggle ----
  await call(`/api/admin/products/${product.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...productBody, visible: 1, featured: 0 }),
  });

  await call('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ show_prices: true }),
  });
  const priced = await (await call(`/product/${product.item_id}`)).text();
  check('price shows when the toggle is on', priced.includes('999'));

  await call('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ show_prices: false }),
  });
  const unpriced = await (await call(`/product/${product.item_id}`)).text();
  check('price hides when the toggle is off', !unpriced.includes('₹999'));

  // ---- enquiries ----
  const inbox = await asJson(await call('/api/admin/enquiries'));
  const smokeEnquiry = inbox?.enquiries?.find((e) => e.email === 'smoke@example.com');
  check('the test enquiry reached the inbox', Boolean(smokeEnquiry));

  if (smokeEnquiry) {
    await call(`/api/admin/enquiries/${smokeEnquiry.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });

    const all = await asJson(await call('/api/admin/enquiries'));
    const archived = await asJson(await call('/api/admin/enquiries?status=archived'));

    check('archived enquiry leaves the All list', !all?.enquiries?.some((e) => e.id === smokeEnquiry.id));
    check('archived enquiry is under Archived', archived?.enquiries?.some((e) => e.id === smokeEnquiry.id));

    const removed = await call(`/api/admin/enquiries/${smokeEnquiry.id}`, { method: 'DELETE' });
    check('enquiry can be deleted', removed.status === 200);
  }

  // ---- admin pages render ----
  for (const path of [
    '/admin/products',
    '/admin/products/new',
    `/admin/products/${product.id}`,
    '/admin/categories',
    '/admin/categories/new',
    `/admin/categories/${created.id}`,
    '/admin/enquiries',
    '/admin/settings',
  ]) {
    const response = await call(path);
    check(`admin page ${path} renders`, response.status === 200, `got ${response.status}`);
  }

  // ---- delete ----
  const deletedProduct = await call(`/api/admin/products/${product.id}`, { method: 'DELETE' });
  check('product deleted', deletedProduct.status === 200);

  const deletedCategory = await call(`/api/admin/categories/${created.id}`, { method: 'DELETE' });
  check('collection deleted', deletedCategory.status === 200);

  const gone = await call(`/product/${product.item_id}`);
  check('deleted product is gone from the site', gone.status === 404, `got ${gone.status}`);
}

async function signOut() {
  const response = await call('/api/auth/logout', { method: 'POST' });
  check('admin can sign out', response.status === 200);

  const after = await call('/api/admin/products');
  check('admin API refuses the ended session', after.status === 401, `got ${after.status}`);
}

/* -------------------------------------------------------------------- run */

console.log(`\n  Smoke test against ${BASE}\n`);

try {
  await fetch(BASE);
} catch {
  console.error(`  Could not reach ${BASE}. Start the server first.\n`);
  process.exit(1);
}

try {
  await publicPages();
  await retiredWording();
  await search();
  await contactForm();

  if (await signIn()) {
    await adminLifecycle();
    await signOut();
  }
} catch (error) {
  check('suite ran to completion', false, error.message);
} finally {
  const db = openDb();
  db.prepare('DELETE FROM users WHERE username = ?').run(TEST_USER);
  db.prepare("DELETE FROM enquiries WHERE email = 'smoke@example.com'").run();
  db.prepare("DELETE FROM products WHERE name = 'Smoke Test Piece'").run();
  db.prepare("DELETE FROM categories WHERE name = 'Smoke Test Collection'").run();
  db.close();
}

const failed = results.filter((r) => !r.ok);

for (const entry of results) {
  if (!entry.ok) console.log(`  FAIL  ${entry.name}${entry.detail ? ` (${entry.detail})` : ''}`);
}

console.log(
  failed.length
    ? `\n  ${results.length - failed.length}/${results.length} checks passed, ${failed.length} FAILED\n`
    : `\n  All ${results.length} checks passed.\n`,
);

process.exit(failed.length ? 1 : 0);
