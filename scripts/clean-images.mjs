// Clears every product image row and every uploaded file. Used to reset a demo catalogue
// before real photography goes in.  npm run images:clear -- --yes
import fs from 'node:fs';
import path from 'node:path';
import { openDb, UPLOAD_DIR } from './db.mjs';

if (!process.argv.includes('--yes')) {
  console.log('\n  This deletes every uploaded image. Re-run with:  npm run images:clear -- --yes\n');
  process.exit(0);
}

const db = openDb();
const rows = db.prepare('DELETE FROM product_images').run().changes;
db.prepare('UPDATE categories SET cover_image = NULL').run();
db.close();

let removed = 0;
for (const file of fs.readdirSync(UPLOAD_DIR)) {
  if (file === '.gitkeep') continue;
  fs.unlinkSync(path.join(UPLOAD_DIR, file));
  removed += 1;
}

console.log(`\n  Removed ${rows} image record(s) and ${removed} file(s).\n`);
