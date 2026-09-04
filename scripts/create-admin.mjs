// Interactive admin-credential creator.
//   npm run admin:create
//   npm run admin:create -- --user manager --pass "s3cret-pass"   (non-interactive)
import bcrypt from 'bcryptjs';
import readline from 'node:readline';
import { openDb } from './db.mjs';

const CTRL_C = 3;
const BACKSPACE = 8;
const DELETE = 127;

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Reads a line without echoing the characters back to the terminal.
function askSecret(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);

    const wasRaw = Boolean(stdin.isRaw);
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);

        if (ch === '\r' || ch === '\n') {
          stdin.removeListener('data', onData);
          if (stdin.isTTY) stdin.setRawMode(wasRaw);
          stdin.pause();
          stdout.write('\n');
          return resolve(value.trim());
        }
        if (code === CTRL_C) {
          if (stdin.isTTY) stdin.setRawMode(wasRaw);
          stdout.write('\n');
          process.exit(130);
        }
        if (code === BACKSPACE || code === DELETE) {
          if (value.length) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (code < 32) continue;

        value += ch;
        stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

const db = openDb();

try {
  console.log('\n  JainCo - create or update an admin account\n');

  let username = arg('--user');
  let password = arg('--pass');

  if (!username) username = await ask('  Username: ');
  if (!username || username.length < 3) throw new Error('Username must be at least 3 characters.');

  if (!password) {
    password = await askSecret('  Password: ');
    const confirm = await askSecret('  Confirm : ');
    if (password !== confirm) throw new Error('Passwords do not match.');
  }
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');

  const hash = bcrypt.hashSync(password, 12);
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

  if (existing) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    console.log(`\n  Password updated for "${username}". Existing sessions were signed out.\n`);
  } else {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`\n  Admin "${username}" created. Sign in at /admin\n`);
  }
} catch (err) {
  console.error(`\n  ${err.message}\n`);
  process.exitCode = 1;
} finally {
  db.close();
}
