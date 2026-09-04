import { openDb, DB_PATH } from './db.mjs';

const db = openDb();
const counts = {
  admins: db.prepare('SELECT COUNT(*) c FROM users').get().c,
  categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
  products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
};
db.close();

console.log(`\n  Database ready  ->  ${DB_PATH}`);
console.log(`  admins: ${counts.admins}   categories: ${counts.categories}   products: ${counts.products}`);
if (counts.admins === 0) console.log('\n  No admin account yet. Run:  npm run admin:create\n');
else console.log('');
