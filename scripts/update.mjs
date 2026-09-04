// Pulls the latest code from git, backs up the catalogue first, applies any new database
// migrations, reinstalls dependencies and rebuilds. Meant to be run on the server where the
// site is actually deployed.
//
//   npm run update
//   npm run update -- --skip-restart   (don't try to restart pm2 automatically)
//
// What it will never do: touch anything in data/ except to copy it somewhere safer first.
// The catalogue database and every uploaded photo live there, and nothing in this script
// deletes, overwrites, or resets that folder.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const backupRoot = path.join(root, 'backups');

const skipRestart = process.argv.includes('--skip-restart');

// npm and pm2 are .cmd shims on Windows, and current Node refuses to spawn those without a
// shell. Every command and argument below is a fixed literal written in this file, with the
// single exception of the pm2 process name, which is checked against a strict pattern before
// it is ever passed along.
const isWindows = process.platform === 'win32';

/**
 * Windows needs a shell to reach npm and pm2, since those are .cmd shims. Elsewhere the
 * command is executed directly, with no shell involved at all.
 */
function exec(command, args, options) {
  if (isWindows) return execSync([command, ...args].join(' '), options);
  return execFileSync(command, args, options);
}

function run(command, args, options = {}) {
  console.log(`  $ ${command} ${args.join(' ')}`);
  return exec(command, args, { cwd: root, stdio: 'inherit', ...options });
}

function runQuiet(command, args) {
  return String(exec(command, args, { cwd: root, encoding: 'utf8' })).trim();
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exitCode = 1;
}

console.log('\n  JainCo update\n');

// ---------------------------------------------------------------- sanity checks

if (!fs.existsSync(path.join(root, '.git'))) {
  fail('This folder is not a git checkout. Clone the repository with git first, this script has nothing to pull from.');
  process.exit(1);
}

let branch;
try {
  branch = runQuiet('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  fail('Could not read the current git branch.');
  process.exit(1);
}

// Only files git already tracks are checked here. Untracked paths are skipped on purpose:
// data/, node_modules/ and .next/ live in every real deployment and are none of git's
// business, so counting them would mean this check could never pass on a live server.
const dirty = runQuiet('git', ['status', '--porcelain', '--untracked-files=no']);
if (dirty) {
  fail(
    'There are uncommitted changes in this checkout. Commit, stash, or discard them first, ' +
      'so the update pulls a clean, known state.\n\n  Changed files:\n' +
      dirty
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n'),
  );
  process.exit(1);
}

// ---------------------------------------------------------------- back up the data folder

if (fs.existsSync(dataDir)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(backupRoot, `data-${stamp}`);

  console.log(`  Backing up data/ to ${path.relative(root, backupDir)}`);
  fs.mkdirSync(backupRoot, { recursive: true });

  // These backups hold the live database and every customer photo. Give the folder its own
  // ignore rule so it can never be swept into a commit by an absent-minded `git add .`.
  fs.writeFileSync(path.join(backupRoot, '.gitignore'), '*\n');

  fs.cpSync(dataDir, backupDir, { recursive: true });
} else {
  console.log('  No data/ folder yet, nothing to back up.');
}

// ---------------------------------------------------------------- pull, install, migrate, build

try {
  console.log(`\n  Fetching the latest code (branch: ${branch})`);
  run('git', ['fetch', 'origin']);

  // Fast forward only. If the server has commits of its own, or history has diverged, this
  // refuses rather than silently merging or rewriting anything.
  run('git', ['merge', '--ff-only', `origin/${branch}`]);

  console.log('\n  Installing dependencies');
  run('npm', ['ci']);

  console.log('\n  Applying database migrations');
  console.log('  (new tables and columns are added; nothing existing is changed or removed)');
  run('npm', ['run', 'db:init']);

  console.log('\n  Building');
  run('npm', ['run', 'build']);
} catch {
  fail(
    'The update stopped before finishing. Nothing in data/ was touched, and the backup made ' +
      'above is untouched too, so the site can keep running on the version it already has ' +
      'while you look into the error above.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------- restart, if we can

if (!skipRestart) {
  try {
    runQuiet('pm2', ['--version']);
    const list = runQuiet('pm2', ['jlist']);
    const processes = JSON.parse(list);
    const match = processes.find((p) => p.name && /jainco/i.test(p.name));

    // Only restart a name that is plainly a name, since it reaches a shell on Windows.
    if (match && /^[\w.-]+$/.test(match.name)) {
      console.log(`\n  Restarting pm2 process "${match.name}"`);
      run('pm2', ['restart', match.name]);
    } else {
      console.log('\n  pm2 is installed but no process here looks like this site. Restart it yourself:');
      console.log('    pm2 restart <name>');
    }
  } catch {
    console.log('\n  Built successfully. Restart the server process yourself, for example:');
    console.log('    pm2 restart jainco');
    console.log('    # or however you run npm start on this server');
  }
}

console.log('\n  Update complete. The catalogue and every upload are exactly as they were.\n');
