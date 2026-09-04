# JainCo Brand Website

Website for JainCo, a home, gifting and party supplies shop. It has a public catalogue site
plus a private admin dashboard for managing products, departments, photos and enquiries.

Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion and SQLite
(better-sqlite3). No external database, no third party API keys, no payment provider.

## Requirements

- Node.js 20 or newer (tested on 22 and 24)
- npm

`better-sqlite3` needs a native binding for your OS and Node version. Normally `npm install`
downloads a prebuilt one automatically. If it fails, see [Native dependency](#native-dependency)
below.

## Setup

```bash
npm install
npm run db:init
npm run admin:create
npm run dev
```

This creates the database, asks you to set an admin username and password, and starts the
site at http://localhost:3000. Sign in at `/admin`.

Want to see it filled in with example data first? Run this instead of, or before, creating
real products:

```bash
npm run demo
```

It adds a few example departments and products with generated placeholder photos, plus one
sample enquiry so the inbox isn't empty. It only runs on an empty catalogue, so it won't
overwrite anything real. To wipe and reseed anyway:

```bash
npm run seed -- --force
```

To clear demo photos once real ones are ready:

```bash
npm run images:clear -- --yes
```

### Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Needed | What it's for |
| --- | --- | --- |
| `SESSION_SECRET` | Yes, in production | Used to sign admin session tokens. Any long random string. Changing it logs every admin out. Not required for local development, it falls back to a placeholder. |
| `SITE_URL` | Recommended in production | Your live domain, used in meta tags and the sitemap. Defaults to localhost. |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Admin accounts

Accounts are created from the terminal only, not from the site itself, so a compromised
admin session can never create another account.

```bash
npm run admin:create                          # interactive, prompts for username and password
npm run admin:create -- --user name --pass "secret"   # non interactive
npm run admin:list
npm run admin:delete -- --user name
```

Passwords need at least 8 characters and are hashed with bcrypt.

## What's in the admin dashboard

Every section is its own page. Nothing opens in a popup.

**Products** search by item number, name, material or department. Each product has a name,
description, price, availability, and any specification fields you want (nothing is fixed,
add or remove fields per product).

**Photos** can be cropped right in the browser. Drag the crop box, resize its corner, and
choose whether the photo should fill its space or fit within it at its own shape.

**Departments** group products for the public catalogue, each with its own cover photo and
description.

**Enquiries** is the inbox for the contact form and the enquiry button on product pages.

**Settings** has the price visibility toggle, contact details, and a phone number shown at
the top of the site.

### Item numbers

Every product gets its own number automatically, shown in a small red circle on the corner
of its photo everywhere it appears, and used in the URL (`/product/7`). Customers quote this
number when they ask about something.

### Price toggle

Off by default. When it's off, prices are removed on the server before the page is sent, so
they never appear in the page source at all, not just hidden with CSS. Turn it on any time
from Settings.

## Deploying

This needs a normal server that stays running, not a serverless platform, because it writes
to a SQLite file and an uploads folder on disk between requests.

```bash
git clone <your-repo-url>
cd jainco-brand-website
npm ci
npm run db:init
npm run admin:create
npm run build
```

Set `.env.local` with a real `SESSION_SECRET` and your `SITE_URL`. Then run it:

```bash
npm start
```

Use something like pm2 to keep it running:

```bash
pm2 start npm --name jainco -- start
pm2 save
```

Put a reverse proxy in front for HTTPS and your domain (nginx, Caddy, or whatever your host
gives you).

Back up the `data` folder regularly. It holds the database and every uploaded photo, and
nothing else on the server matters if you lose it.

```bash
cp -r data backups/data-$(date +%Y%m%d)
```

To update a live site:

```bash
git pull
npm ci
npm run build
pm2 restart jainco
```

This never touches the `data` folder, so your catalogue and admin accounts are safe across
updates.

### Native dependency

If `npm install` fails to set up `better-sqlite3`, try:

```bash
npm install-scripts approve better-sqlite3
npm install
```

Always run `npm install` on the machine (or container) you're deploying to. A `node_modules`
folder built on one OS or CPU architecture won't work on another.

## Testing

Two scripts check the site is actually working, not just that it builds.

```bash
npm run test:smoke      # walks through every feature: pages, search, contact form, admin
npm run security:check  # tries real attacks: SQL injection, path traversal, CSRF, and more
```

Run them against a live server:

```bash
npm run test:smoke -- --url https://your-domain.com
npm run security:check -- --url https://your-domain.com
```

Both should report every check passing.

## How photos are handled

Uploads are checked by their actual file content, not the filename or what the browser
claims the type is. Only real JPG, PNG, WebP or GIF files are accepted, capped at 8 MB and
40 megapixels. Stored filenames are random, so nothing a visitor types ever touches the
filesystem directly.

Each photo has a crop rectangle you set in the admin, plus a mode: fill (always crops to the
gallery's standard shape, so a row of products lines up evenly) or fit (keeps the photo's own
shape, either locked to a ratio you choose or its true proportions, kept within a sensible
size range so one oddly shaped photo can't break the layout).

## Project layout

```
app/
  (site)/         public pages: home, about, catalogue, product, contact, search
  admin/          the dashboard, gated on the server so it's invisible unless signed in
  api/            routes for auth, admin actions, uploads, media, search, enquiries
components/       page components
  admin/          dashboard components
lib/              database, auth, search, image handling, security helpers
db/               schema and migrations
scripts/          setup, admin management, demo data, tests
data/             the database and uploaded photos (not in git, created on first run)
public/           static files, including the hero background video
```

## Notes

Route changes play a short curtain animation, and there's a custom cursor. Both switch off
automatically for anyone with reduced motion enabled in their OS, on touch devices, or on
low powered machines.

Public pages read the database directly on each request, so anything changed in the admin
shows up immediately, no rebuild needed.
