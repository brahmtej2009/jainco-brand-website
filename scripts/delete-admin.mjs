// npm run admin:delete -- --user manager
import { openDb } from './db.mjs';

const i = process.argv.indexOf('--user');
const username = i > -1 ? process.argv[i + 1] : undefined;

if (!username) {
  console.error('\n  Usage: npm run admin:delete -- --user <username>\n');
  process.exit(1);
}

const db = openDb();
const info = db.prepare('DELETE FROM users WHERE username = ?').run(username);
db.close();

console.log(info.changes ? `\n  Removed admin "${username}".\n` : `\n  No admin named "${username}".\n`);
