// Fills an empty catalogue with example collections, products, a sample enquiry and
// generated placeholder photography, so the site can be walked through before real content
// exists. Safe to run on a fresh install — it only acts when the catalogue is empty.
//   npm run demo             (same as npm run seed, easier to remember)
//   npm run seed             (only seeds when the catalogue is empty)
//   npm run seed -- --force  (replaces the existing collections, products and enquiries)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { openDb, UPLOAD_DIR } from './db.mjs';
import { renderGlass } from './demo-images.mjs';

const force = process.argv.includes('--force');
const skipImages = process.argv.includes('--no-images');

const CATEGORIES = [
  {
    name: 'Glassware',
    slug: 'glassware',
    tagline: 'Tumblers, highballs and stemware for everyday use.',
    description:
      'Drinking glasses for the table and for guests, from plain everyday tumblers to cut and frosted pieces that suit an occasion.',
    shape: 'tumbler',
    palette: 'aqua',
  },
  {
    name: 'Jars & Storage',
    slug: 'jars-storage',
    tagline: 'Jars and canisters that tidy a kitchen shelf.',
    description:
      'Airtight jars, clip-tops and canisters with matched lids, in sizes that suit a spice rack, a pantry shelf or a countertop.',
    shape: 'jar',
    palette: 'amber',
  },
  {
    name: 'Serveware',
    slug: 'serveware',
    tagline: 'Bowls, platters and dessert pieces for the table.',
    description:
      'Serving pieces for everyday meals and for entertaining, including bowls, platters and dessert glasses.',
    shape: 'bowl',
    palette: 'sea',
  },
  {
    name: 'Gift Wrap & Packaging',
    slug: 'gift-wrap-packaging',
    tagline: 'Wrap, ribbon, boxes and everything that finishes a present.',
    description:
      'Sheets and rolls of wrap, ribbon and twine, gift boxes and bags, tags and cards. The shelf people visit last, and the one that makes the difference.',
    shape: 'box',
    palette: 'rose',
  },
  {
    name: 'Chocolate Moulds & Baking',
    slug: 'chocolate-moulds-baking',
    tagline: 'Moulds, cases and tools for baking and confectionery.',
    description:
      'Chocolate moulds in a range of shapes, along with cases, liners, cutters and the small tools that home baking and festive gifting run on.',
    shape: 'coaster',
    palette: 'amber',
  },
  {
    name: 'Home Decor',
    slug: 'home-decor',
    tagline: 'Vases, votives and pieces that finish a room.',
    description:
      'Vases, candle holders, decorative bowls and accent pieces, in styles that sit comfortably alongside what you already own.',
    shape: 'vase',
    palette: 'azure',
  },
];

const PRODUCTS = [
  {
    category: 'glassware',
    name: 'Faceted Highball Tumbler',
    summary: 'Cut-facet body with a heavy base',
    description:
      'A 350 ml highball with twelve vertical facets down the body that catch the light nicely on a laid table. The thick base gives it weight in the hand and keeps it steady.\n\nStocked in clear, with smoke and amber in when we can get them.',
    shape: 'tumbler',
    palette: 'aqua',
    price: 148,
    featured: 1,
    specs: [
      ['Material', 'Soda-lime glass'],
      ['Size', '72 mm across, 142 mm tall'],
      ['Capacity', '350 ml'],
      ['Colour', 'Clear, sometimes smoke and amber'],
      ['Sold as', 'Single piece, or a set of six'],
      ['Care', 'Dishwasher safe'],
    ],
  },
  {
    category: 'glassware',
    name: 'Double-Wall Glass Mug',
    summary: 'Insulated wall, 250 ml, no handle needed',
    description:
      'A double-walled mug that keeps tea or coffee hot while staying comfortable to hold, so it does not need a handle. The drink appears to float inside, which is half the appeal.\n\nPopular as a pair, and an easy gift with a box from the gifting shelf.',
    shape: 'mug',
    palette: 'smoke',
    price: 265,
    featured: 1,
    specs: [
      ['Material', 'Borosilicate glass'],
      ['Size', '80 mm across, 96 mm tall'],
      ['Capacity', '250 ml'],
      ['Sold as', 'Single piece, or a boxed pair'],
      ['Care', 'Hand wash recommended'],
    ],
  },
  {
    category: 'jars-storage',
    name: 'Apothecary Storage Jar, 1 L',
    summary: 'Bevelled lid with a ground seat',
    description:
      'A one-litre jar with a weighted bevelled lid that sits square without a rubber seal. Good for dry goods, and good enough looking to leave out on the counter.\n\nWe keep three heights, so a row of them lines up neatly on a shelf.',
    shape: 'jar',
    palette: 'amber',
    price: 420,
    featured: 1,
    specs: [
      ['Material', 'Soda-lime glass'],
      ['Size', '110 mm across, 210 mm tall'],
      ['Capacity', '1000 ml'],
      ['Also available', '600 ml and 1.5 L'],
      ['Care', 'Hand wash'],
    ],
  },
  {
    category: 'jars-storage',
    name: 'Clip-Top Preserve Jar, 500 ml',
    summary: 'Steel clip with a replaceable seal',
    description:
      'The familiar clip-top jar, for pickles, preserves or anything you want to keep airtight. Spare seals are sold separately, so the jar stays useful long after the first one perishes.',
    shape: 'jar',
    palette: 'sea',
    price: 195,
    specs: [
      ['Material', 'Glass, stainless steel, silicone'],
      ['Size', '86 mm across, 148 mm tall'],
      ['Capacity', '500 ml'],
      ['Also available', '250 ml, 750 ml and 1 L'],
      ['Care', 'Dishwasher safe, take the seal out first'],
    ],
  },
  {
    category: 'serveware',
    name: 'Rolled-Rim Serving Bowl, 240 mm',
    summary: 'Heavy enough for everyday use',
    description:
      'A generous serving bowl with a rolled rim and a thick wall, meant to be used rather than admired. Salads, fruit, or whatever the table needs.',
    shape: 'bowl',
    palette: 'sea',
    price: 540,
    specs: [
      ['Material', 'Soda-lime glass'],
      ['Size', '240 mm across, 92 mm tall'],
      ['Capacity', '1800 ml'],
      ['Also available', '180 mm and 300 mm'],
      ['Care', 'Dishwasher safe'],
    ],
  },
  {
    category: 'serveware',
    name: 'Frosted Dessert Coupe',
    summary: 'Satin-etched bowl on a clear stem',
    description:
      'A dessert coupe with a frosted bowl and a clear stem. The contrast looks well under warm light, and the frosting hides fingerprints through an evening.',
    shape: 'bowl',
    palette: 'rose',
    price: 230,
    specs: [
      ['Material', 'Soda-lime glass'],
      ['Size', '112 mm across, 88 mm tall'],
      ['Capacity', '220 ml'],
      ['Sold as', 'Single piece, or a set of six'],
      ['Care', 'Dishwasher safe'],
    ],
  },
  {
    category: 'gift-wrap-packaging',
    name: 'Textured Gift Wrap Roll',
    summary: 'Heavy paper that folds crisply',
    description:
      'A weighty wrapping paper that creases sharply and does not tear at the corners, which is most of what makes a wrapped gift look tidy.\n\nWe keep it in several finishes, with ribbon on the same shelf chosen to go with each.',
    shape: 'box',
    palette: 'rose',
    price: 120,
    featured: 1,
    specs: [
      ['Material', 'Coated paper'],
      ['Roll size', '70 cm wide, 3 m long'],
      ['Finishes', 'Matt, pearl and metallic'],
      ['Goes with', 'Satin ribbon and gift tags'],
    ],
  },
  {
    category: 'gift-wrap-packaging',
    name: 'Rigid Gift Box with Lid',
    summary: 'Sturdy two-piece box, several sizes',
    description:
      'A rigid box with a separate lid, firm enough to hold a glass or a candle without collapsing. Plain enough to dress up with ribbon, and worth keeping afterwards.',
    shape: 'box',
    palette: 'smoke',
    price: 175,
    specs: [
      ['Material', 'Rigid board'],
      ['Size', '220 x 160 x 90 mm'],
      ['Also available', 'Small, medium and large'],
      ['Colour', 'Kraft, white and black'],
      ['Goes with', 'Shredded filler and ribbon'],
    ],
  },
  {
    category: 'chocolate-moulds-baking',
    name: 'Polycarbonate Chocolate Mould',
    summary: 'Twenty-one cavities, high shine',
    description:
      'A rigid mould that gives chocolates a proper gloss and a clean release, which soft silicone trays never quite manage. Twenty-one cavities to a sheet.\n\nA favourite around festivals, when it tends to go quickly.',
    shape: 'coaster',
    palette: 'amber',
    price: 340,
    featured: 1,
    specs: [
      ['Material', 'Polycarbonate'],
      ['Cavities', '21 per sheet'],
      ['Sheet size', '275 x 175 mm'],
      ['Shapes', 'Several patterns in stock'],
      ['Care', 'Hand wash, warm water only'],
    ],
  },
  {
    category: 'chocolate-moulds-baking',
    name: 'Foil Chocolate Cases',
    summary: 'Pack of one hundred, assorted colours',
    description:
      'Small foil cases for finished chocolates and truffles, in an assortment of colours. They hold their shape in a box rather than flattening on the way.',
    shape: 'coaster',
    palette: 'rose',
    price: 95,
    specs: [
      ['Material', 'Lined foil'],
      ['Pack', '100 cases'],
      ['Size', '30 mm across'],
      ['Colours', 'Gold, silver, red and assorted'],
    ],
  },
  {
    category: 'home-decor',
    name: 'Column Vase, 300 mm',
    summary: 'Straight sides and a weighted base',
    description:
      'A tall straight vase with a thick base, heavy enough to hold long stems upright without a liner. Plain by design, so it does not compete with what goes in it.',
    shape: 'vase',
    palette: 'azure',
    price: 720,
    specs: [
      ['Material', 'Soda-lime glass'],
      ['Size', '100 mm across, 300 mm tall'],
      ['Capacity', '2100 ml'],
      ['Colour', 'Clear, smoke and sea green'],
      ['Care', 'Hand wash'],
    ],
  },
  {
    category: 'home-decor',
    name: 'Ribbed Votive Holder',
    summary: 'Optical ribs, sized for a tealight',
    description:
      'A small holder with ribbing that breaks candlelight across the surface. One is pleasant, a row of them along a table is better.',
    shape: 'tumbler',
    palette: 'amber',
    price: 95,
    specs: [
      ['Material', 'Soda-lime glass'],
      ['Size', '68 mm across, 72 mm tall'],
      ['Fits', 'Standard tealight'],
      ['Colour', 'Clear, amber and smoke'],
      ['Sold as', 'Single piece, or a set of four'],
    ],
  },
];

// A single example enquiry, so the admin inbox is not empty on a first look either.
const DEMO_ENQUIRIES = [
  {
    name: 'Asha Mehta',
    email: 'asha.mehta@example.com',
    phone: '+91 98200 00000',
    company: '',
    message:
      'Hello, I would like to check the price and availability of item #1 (Faceted Highball Tumbler). I need 6 pieces for a housewarming gift. Please let me know if it is in stock.',
    item_ref: '#1',
    status: 'new',
  },
];

/** Renders a placeholder image and stores it the way the upload route would. */
function makeImage({ width, height, shape, palette, seed }) {
  const rendered = renderGlass({ width, height, shape, palette, seed });
  const file = `${crypto.randomUUID()}.png`;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, file), rendered.buffer);

  return { file, width: rendered.width, height: rendered.height };
}

const db = openDb();

try {
  const existing = db.prepare('SELECT COUNT(*) c FROM products').get().c;

  if (existing > 0 && !force) {
    console.log(`\n  Catalogue already holds ${existing} product(s). Re-run with --force to replace them.\n`);
    process.exit(0);
  }

  if (!skipImages) console.log('\n  Rendering placeholder images, this takes a few seconds.');

  // Images are generated outside the transaction: rendering is the slow part.
  const categoryCovers = new Map();
  const productImages = new Map();

  if (!skipImages) {
    CATEGORIES.forEach((category, index) => {
      categoryCovers.set(category.slug, makeImage({ width: 1200, height: 675, shape: category.shape, palette: category.palette, seed: index + 1 }));
    });

    PRODUCTS.forEach((product, index) => {
      const shots = [
        makeImage({ width: 1000, height: 1250, shape: product.shape, palette: product.palette, seed: index + 11 }),
        makeImage({ width: 1200, height: 900, shape: product.shape, palette: product.palette, seed: index + 41 }),
      ];
      productImages.set(product.name, shots);
    });
  }

  const seed = db.transaction(() => {
    if (force) {
      db.prepare('DELETE FROM product_images').run();
      db.prepare('DELETE FROM product_specs').run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM enquiries').run();

      // Start the row ids from 1 again, so the demo catalogue reads cleanly.
      db.prepare(
        "DELETE FROM sqlite_sequence WHERE name IN ('products','categories','product_images','product_specs','enquiries')",
      ).run();
    }

    const insertCategory = db.prepare(
      'INSERT INTO categories (name, slug, tagline, description, cover_image, position) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const categoryIds = {};

    CATEGORIES.forEach((category, index) => {
      const info = insertCategory.run(
        category.name,
        category.slug,
        category.tagline,
        category.description,
        categoryCovers.get(category.slug)?.file ?? null,
        index,
      );
      categoryIds[category.slug] = Number(info.lastInsertRowid);
    });

    const insertProduct = db.prepare(`
      INSERT INTO products
        (item_id, name, category_id, summary, description, price, currency, availability, featured, position)
      VALUES
        (@item_id, @name, @category_id, @summary, @description, @price, 'INR', 'available', @featured, @position)
    `);

    const insertSpec = db.prepare(
      'INSERT INTO product_specs (product_id, label, value, position) VALUES (?, ?, ?, ?)',
    );
    const insertImage = db.prepare(
      `INSERT INTO product_images
         (product_id, file, width, height, alt, position, fit_mode, crop_x, crop_y, crop_w, crop_h)
       VALUES (?, ?, ?, ?, ?, ?, 'fill', ?, ?, ?, ?)`,
    );

    // Centre a 4:5 crop, exactly as the admin cropper would.
    const centredCrop = (width, height) => {
      const ratio = 0.8;
      if (!width || !height) return { x: 0, y: 0, w: 1, h: 1 };

      const imageRatio = width / height;
      if (imageRatio > ratio) {
        const w = ratio / imageRatio;
        return { x: (1 - w) / 2, y: 0, w, h: 1 };
      }
      const h = imageRatio / ratio;
      return { x: 0, y: (1 - h) / 2, w: 1, h };
    };

    PRODUCTS.forEach((product, index) => {
      const info = insertProduct.run({
        item_id: index + 1,
        name: product.name,
        category_id: categoryIds[product.category] ?? null,
        summary: product.summary ?? '',
        description: product.description ?? '',
        price: product.price ?? null,
        featured: product.featured ?? 0,
        position: index,
      });

      const id = Number(info.lastInsertRowid);

      (product.specs ?? []).forEach(([label, value], order) => insertSpec.run(id, label, value, order));
      (productImages.get(product.name) ?? []).forEach((image, order) => {
        const crop = centredCrop(image.width, image.height);
        insertImage.run(id, image.file, image.width, image.height, product.name, order, crop.x, crop.y, crop.w, crop.h);
      });
    });

    // The generated catalogue already uses the new specification table.
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('specs_migrated', '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
    ).run();

    const existingEnquiries = db.prepare('SELECT COUNT(*) c FROM enquiries').get().c;
    if (existingEnquiries === 0) {
      const insertEnquiry = db.prepare(
        `INSERT INTO enquiries (name, email, phone, company, message, item_ref, status)
         VALUES (@name, @email, @phone, @company, @message, @item_ref, @status)`,
      );
      DEMO_ENQUIRIES.forEach((enquiry) => insertEnquiry.run(enquiry));
    }
  });

  seed();

  console.log(
    `\n  Seeded ${CATEGORIES.length} collections, ${PRODUCTS.length} products and ${DEMO_ENQUIRIES.length} sample enquiry.`,
  );
  if (!skipImages) {
    console.log(`  Generated ${CATEGORIES.length + PRODUCTS.length * 2} placeholder images.`);
  }
  console.log(`  Item IDs 1 to ${PRODUCTS.length} are in use. Replace the images from /admin.\n`);
} catch (err) {
  console.error(`\n  ${err.message}\n`);
  process.exitCode = 1;
} finally {
  db.close();
}
