// Syncs the single source of truth — public/guide-data.js (week-by-week
// guidance) — into the Flutter app as app/assets/guide_data.json.
//
//   node tools/sync_guide.mjs
//
// Run it whenever guide-data.js changes, then rebuild the app. The web app,
// the PWA and the native app all read from the same content, so the
// companionship guidance can never drift between platforms.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'public', 'guide-data.js'), 'utf8');

const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const guide = sandbox.window.PREGNANCY_GUIDE;
if (!guide) {
  console.error('✗ PREGNANCY_GUIDE not found in public/guide-data.js');
  process.exit(1);
}

const outDir = join(root, 'app', 'assets');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'guide_data.json'), JSON.stringify(guide, null, 2));

const weeks = Object.keys(guide.weeks || {}).length;
console.log(`✓ app/assets/guide_data.json — ${weeks} weeks, ${(guide.trimesters || []).length} trimesters`);
