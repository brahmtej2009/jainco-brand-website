// Schema migrations that cannot live in schema.sql because they change existing tables.
// Every step is idempotent, so this runs safely on each boot.

const LEGACY_SPEC_FIELDS = [
  ['material', 'Material'],
  ['dimensions', 'Dimensions'],
  ['capacity', 'Capacity'],
  ['finish', 'Finish'],
  ['colour', 'Colour'],
  ['weight', 'Weight'],
  ['packing', 'Packing'],
  ['moq', 'Minimum order'],
  ['lead_time', 'Lead time'],
  ['care', 'Care'],
];

function columnNames(database, table) {
  return database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function addColumn(database, table, column, definition) {
  if (columnNames(database, table).includes(column)) return;
  database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

/**
 * Framing controls. The crop is stored as a rectangle in fractions of the source image,
 * so what an administrator sees in the cropper is exactly what a visitor gets.
 */
function addImageFraming(database) {
  addColumn(database, 'product_images', 'fit_mode', "TEXT NOT NULL DEFAULT 'fill'");
  addColumn(database, 'product_images', 'crop_x', 'REAL NOT NULL DEFAULT 0');
  addColumn(database, 'product_images', 'crop_y', 'REAL NOT NULL DEFAULT 0');
  addColumn(database, 'product_images', 'crop_w', 'REAL NOT NULL DEFAULT 1');
  addColumn(database, 'product_images', 'crop_h', 'REAL NOT NULL DEFAULT 1');
}

/** Moves the old fixed specification columns into the flexible product_specs table. */
function migrateLegacySpecs(database) {
  const done = database.prepare("SELECT value FROM settings WHERE key = 'specs_migrated'").get();
  if (done?.value === '1') return 0;

  const available = columnNames(database, 'products');
  const usable = LEGACY_SPEC_FIELDS.filter(([column]) => available.includes(column));

  let moved = 0;

  const run = database.transaction(() => {
    if (usable.length) {
      const products = database
        .prepare(`SELECT id, ${usable.map(([column]) => column).join(', ')} FROM products`)
        .all();

      const hasSpecs = database.prepare('SELECT 1 FROM product_specs WHERE product_id = ? LIMIT 1');
      const insert = database.prepare(
        'INSERT INTO product_specs (product_id, label, value, position) VALUES (?, ?, ?, ?)',
      );

      for (const product of products) {
        if (hasSpecs.get(product.id)) continue;

        let position = 0;
        for (const [column, label] of usable) {
          const value = String(product[column] ?? '').trim();
          if (!value) continue;

          insert.run(product.id, label, value, position);
          position += 1;
          moved += 1;
        }
      }
    }

    database
      .prepare(
        "INSERT INTO settings (key, value) VALUES ('specs_migrated', '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
      )
      .run();
  });

  run();
  return moved;
}

export function runMigrations(database) {
  addImageFraming(database);
  migrateLegacySpecs(database);
}
