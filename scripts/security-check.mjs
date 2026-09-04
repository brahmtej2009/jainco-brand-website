/**
 * Runs a battery of attacks against a running JainCo server and reports what happened.
 *
 *   npm run dev            (in one terminal)
 *   npm run security:check (in another)
 *
 * Point it elsewhere with:  npm run security:check -- --url https://catalogue.example
 */
import { openDb } from './db.mjs';

const flagIndex = process.argv.indexOf('--url');
const BASE = (flagIndex > -1 ? process.argv[flagIndex + 1] : 'http://localhost:3000').replace(/\/$/, '');

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

const expect = (name, condition, detail) => (condition ? pass(name, detail) : fail(name, detail));

async function get(path, init) {
  return fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
}

/* ------------------------------------------------------------ admin lockout */

async function adminEndpointsRequireAuth() {
  const endpoints = [
    ['GET', '/api/admin/products'],
    ['GET', '/api/admin/categories'],
    ['GET', '/api/admin/settings'],
    ['POST', '/api/admin/products'],
    ['POST', '/api/admin/categories'],
    ['POST', '/api/admin/upload'],
    ['PATCH', '/api/admin/settings'],
    ['PATCH', '/api/admin/products/1'],
    ['DELETE', '/api/admin/products/1'],
    ['DELETE', '/api/admin/categories/1'],
  ];

  for (const [method, path] of endpoints) {
    const response = await get(path, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify({ name: 'intruder' }),
    });

    expect(
      `${method} ${path} rejects anonymous callers`,
      response.status === 401,
      `got ${response.status}`,
    );
  }
}

async function adminPageDoesNotLeak() {
  const html = await (await get('/admin')).text();

  expect(
    'GET /admin serves the sign-in screen, not the dashboard',
    html.includes('Sign in') && !html.includes('New product'),
  );
}

/* ------------------------------------------------------------------- CSRF */

async function crossSiteWritesBlocked() {
  for (const [method, path] of [
    ['POST', '/api/auth/login'],
    ['POST', '/api/admin/products'],
    ['POST', '/api/admin/upload'],
    ['PATCH', '/api/admin/settings'],
  ]) {
    const response = await get(path, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
      body: JSON.stringify({ username: 'x', password: 'y' }),
    });

    expect(
      `${method} ${path} refuses a cross-origin write`,
      response.status === 400 || response.status === 403,
      `got ${response.status}`,
    );
  }

  const sneaky = await get('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' },
    body: JSON.stringify({ show_prices: true }),
  });

  expect(
    'PATCH /api/admin/settings refuses a cross-site request with no Origin header',
    sneaky.status === 400 || sneaky.status === 403,
    `got ${sneaky.status}`,
  );
}

/* -------------------------------------------------------- path traversal */

async function traversalBlocked() {
  const payloads = [
    '../../data/jainco.db',
    '..%2F..%2Fpackage.json',
    '..%252F..%252Fpackage.json',
    '....//....//package.json',
    '%2e%2e%2f%2e%2e%2fdb/schema.sql',
    '/etc/passwd',
    'C:\\Windows\\win.ini',
    'jainco.db',
    'not-a-uuid.png',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.svg',
  ];

  for (const payload of payloads) {
    const response = await get(`/api/media/${encodeURIComponent(payload)}`);
    expect(`/api/media rejects "${payload}"`, response.status === 404, `got ${response.status}`);
  }
}

/* ------------------------------------------------------- SQL injection */

async function sqlInjectionBlocked() {
  const db = openDb();
  const before = {
    products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
    categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
  };
  db.close();

  const payloads = [
    "1' OR '1'='1",
    '1 OR 1=1',
    "1'; DROP TABLE products;--",
    '1); DELETE FROM users;--',
    "' UNION SELECT username, password_hash FROM users--",
    "1' AND (SELECT COUNT(*) FROM users) > 0--",
    'admin"--',
    '%27%20OR%20%271%27%3D%271',
  ];

  for (const payload of payloads) {
    for (const path of [`/product/${payload}`, `/catalog/${payload}`]) {
      const response = await get(`/${path.replace(/^\//, '')}`.replace(/ /g, '%20'));

      expect(
        `${path} is not a server error`,
        response.status !== 500,
        `got ${response.status}`,
      );
    }
  }

  // Malformed identifiers on the admin routes must be refused before they reach SQL.
  for (const payload of ['1 OR 1=1', "1';DROP TABLE products;--", 'abc', '-1', '1.5']) {
    const response = await get(`/api/admin/products/${encodeURIComponent(payload)}`, {
      method: 'DELETE',
      headers: { Origin: BASE },
    });

    expect(
      `DELETE /api/admin/products/${payload} refused`,
      response.status === 401 || response.status === 400,
      `got ${response.status}`,
    );
  }

  const db2 = openDb();
  const after = {
    products: db2.prepare('SELECT COUNT(*) c FROM products').get().c,
    categories: db2.prepare('SELECT COUNT(*) c FROM categories').get().c,
    users: db2.prepare('SELECT COUNT(*) c FROM users').get().c,
  };
  const tables = db2
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r) => r.name);
  db2.close();

  expect(
    'row counts unchanged after every injection attempt',
    before.products === after.products &&
      before.categories === after.categories &&
      before.users === after.users,
    `before ${JSON.stringify(before)} after ${JSON.stringify(after)}`,
  );

  expect(
    'all tables still present',
    ['categories', 'product_images', 'products', 'sessions', 'settings', 'users'].every((t) =>
      tables.includes(t),
    ),
    tables.join(', '),
  );
}

/* --------------------------------------------------------- stored XSS */

async function storedXssEscaped() {
  const payload = `<script>alert(1)</script><img src=x onerror=alert(2)>`;
  const db = openDb();

  const itemId = (db.prepare('SELECT COALESCE(MAX(item_id),0) m FROM products').get().m || 0) + 1;
  const info = db
    .prepare(
      `INSERT INTO products (item_id, name, summary, description, visible)
       VALUES (?, ?, ?, ?, 1)`,
    )
    .run(itemId, payload, payload, payload);
  db.close();

  try {
    const html = await (await get(`/product/${itemId}`)).text();

    expect(
      'a script tag stored in a product name is HTML-escaped on the page',
      !html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'),
    );
    expect(
      'an onerror image payload is escaped, not rendered',
      !html.includes('<img src=x onerror=alert(2)>'),
    );
  } finally {
    const cleanup = openDb();
    cleanup.prepare('DELETE FROM products WHERE id = ?').run(Number(info.lastInsertRowid));
    cleanup.close();
  }
}

/* ------------------------------------------------------- price privacy */

async function pricesStayServerSide() {
  const db = openDb();
  const showPrices = db.prepare("SELECT value FROM settings WHERE key = 'show_prices'").get()?.value;
  const priced = db
    .prepare('SELECT item_id, price FROM products WHERE price IS NOT NULL AND visible = 1 LIMIT 1')
    .get();
  db.close();

  if (!priced) {
    pass('price privacy', 'skipped, no product has a price set');
    return;
  }

  const html = await (await get(`/product/${priced.item_id}`)).text();
  const rendered = html.includes(String(Math.round(priced.price)));

  if (showPrices === '1') {
    expect('price toggle on: price is rendered', rendered);
  } else {
    expect(
      'price toggle off: the figure never reaches the HTML',
      !rendered,
      `looked for ${priced.price} on /product/${priced.item_id}`,
    );
  }
}

/* ------------------------------------------------------------- headers */

async function securityHeadersPresent() {
  const response = await get('/');
  const required = {
    'content-security-policy': /default-src 'self'/,
    'x-content-type-options': /nosniff/,
    'x-frame-options': /DENY/i,
    'referrer-policy': /strict-origin/,
    'permissions-policy': /camera=\(\)/,
  };

  for (const [header, pattern] of Object.entries(required)) {
    const value = response.headers.get(header);
    expect(`response carries ${header}`, Boolean(value && pattern.test(value)), value ?? 'missing');
  }

  expect(
    'CSP forbids framing and inline script without a nonce',
    /frame-ancestors 'none'/.test(response.headers.get('content-security-policy') ?? '') &&
      /nonce-/.test(response.headers.get('content-security-policy') ?? ''),
  );

  const adminHeaders = (await get('/admin')).headers;
  expect(
    '/admin is marked noindex',
    /noindex/.test(adminHeaders.get('x-robots-tag') ?? ''),
    adminHeaders.get('x-robots-tag') ?? 'missing',
  );
}

/* -------------------------------------------------------- login throttle */

async function loginThrottled() {
  let sawThrottle = false;
  let unauthorised = 0;

  for (let attempt = 0; attempt < 26; attempt += 1) {
    const response = await get('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({ username: 'no-such-admin', password: `wrong-${attempt}` }),
    });

    if (response.status === 429) {
      sawThrottle = true;
      break;
    }
    if (response.status === 401) unauthorised += 1;
  }

  expect(
    'repeated failed sign-ins are throttled',
    sawThrottle,
    `${unauthorised} attempts returned 401 without a 429`,
  );

  const body = await (
    await get('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({ username: 'no-such-admin', password: 'x' }),
    })
  ).json();

  expect(
    'sign-in errors do not reveal whether the username exists',
    !/user|account|exist/i.test(body.error ?? '') || /incorrect username or password/i.test(body.error ?? ''),
    body.error ?? '',
  );
}

/* ---------------------------------------------------------- body limits */

async function oversizedBodyRejected() {
  const response = await get('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ username: 'a'.repeat(400_000), password: 'b' }),
  });

  expect(
    'an oversized JSON body is refused',
    response.status === 400 || response.status === 413 || response.status === 429,
    `got ${response.status}`,
  );
}

/* ------------------------------------------------------- contact form */

async function contactFormIsSafe() {
  const send = (body, extraHeaders = {}) =>
    get('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE, ...extraHeaders },
      body: JSON.stringify(body),
    });

  const cross = await get('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
    body: JSON.stringify({ name: 'x', email: 'a@b.com', message: 'hello there friend' }),
  });
  expect('contact form refuses a cross-origin post', cross.status === 400 || cross.status === 403, `got ${cross.status}`);

  const invalid = await send({ name: '', email: 'nope', message: 'hi' });
  expect('contact form validates its input', invalid.status === 400 || invalid.status === 429, `got ${invalid.status}`);

  const db = openDb();
  const before = db.prepare('SELECT COUNT(*) c FROM enquiries').get().c;
  db.close();

  const spam = await send({
    name: 'Bot',
    email: 'bot@spam.example',
    message: 'A message long enough to pass validation.',
    website: 'http://spam.example',
  });

  const after = openDb();
  const count = after.prepare('SELECT COUNT(*) c FROM enquiries').get().c;
  after.close();

  expect(
    'honeypot submissions are discarded silently',
    spam.status < 400 && count === before,
    `status ${spam.status}, rows ${before} -> ${count}`,
  );

  // Flooding must be stopped rather than filling the inbox.
  let throttled = false;
  for (let i = 0; i < 14; i += 1) {
    const response = await send({
      name: `Flood ${i}`,
      email: `flood${i}@example.com`,
      message: 'A message long enough to pass validation checks.',
    });
    if (response.status === 429) {
      throttled = true;
      break;
    }
  }
  expect('contact form throttles a flood of submissions', throttled);

  const cleanup = openDb();
  const removed = cleanup.prepare("DELETE FROM enquiries WHERE email LIKE 'flood%@example.com'").run().changes;
  cleanup.close();
  pass('flood test rows cleaned up', `${removed} removed`);
}

/* ------------------------------------------------------------------ run */

const SUITES = [
  ['Admin API requires authentication', adminEndpointsRequireAuth],
  ['Admin page leaks nothing when signed out', adminPageDoesNotLeak],
  ['Cross-site writes are blocked', crossSiteWritesBlocked],
  ['Media route resists path traversal', traversalBlocked],
  ['SQL injection has no effect', sqlInjectionBlocked],
  ['Stored XSS is escaped', storedXssEscaped],
  ['Prices respect the toggle', pricesStayServerSide],
  ['Security headers are set', securityHeadersPresent],
  ['Sign-in is throttled', loginThrottled],
  ['Request bodies are capped', oversizedBodyRejected],
  ['Contact form is safe', contactFormIsSafe],
];

console.log(`\n  Security check against ${BASE}\n`);

try {
  await get('/');
} catch {
  console.error(`  Could not reach ${BASE}. Start the server first (npm run dev).\n`);
  process.exit(1);
}

for (const [label, suite] of SUITES) {
  const start = results.length;
  try {
    await suite();
  } catch (err) {
    fail(label, err.message);
  }

  const slice = results.slice(start);
  const bad = slice.filter((r) => !r.ok);
  const mark = bad.length ? 'FAIL' : ' ok ';

  console.log(`  [${mark}] ${label}  (${slice.length - bad.length}/${slice.length})`);
  for (const entry of bad) console.log(`         ✗ ${entry.name}${entry.detail ? `: ${entry.detail}` : ''}`);
}

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length
    ? `\n  ${results.length - failed.length}/${results.length} checks passed, ${failed.length} FAILED\n`
    : `\n  All ${results.length} checks passed.\n`,
);

process.exit(failed.length ? 1 : 0);
