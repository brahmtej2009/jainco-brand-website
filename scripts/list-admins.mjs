import { openDb } from './db.mjs';

const db = openDb();
const rows = db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all();
db.close();

if (!rows.length) {
  console.log('\n  No admin accounts yet. Run:  npm run admin:create\n');
} else {
  console.log('\n  Admin accounts\n');
  for (const r of rows) console.log(`   #${r.id}  ${r.username.padEnd(20)} created ${r.created_at}`);
  console.log('');
}
