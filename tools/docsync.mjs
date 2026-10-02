// Which repo docs have changed since they were last copied to the Claude Docs versions.
//   node tools/docsync.mjs            status (exit 1 when something has changed since the last sync)
//   node tools/docsync.mjs --mark     record the docs as they are now as synced (do this right after syncing them)
//
// The Claude Docs copies cannot be read from here, so the record is a hash of each doc's text at the moment it was last
// synced, kept in docs/SYNC.json. A doc whose hash differs has changed since, and needs syncing again. Line endings are
// ignored so a checkout on another system does not look like a change.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'docs/SYNC.json');
// The docs that have a Claude Docs copy (README and the competition rules do not)
export const SYNCED = ['ROADMAP.md', 'FEATURES.md', 'GAME_DESIGN_DOCUMENT.md'];

const hash = (f) =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'docs', f), 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex')
    .slice(0, 16);

export function status() {
  let rec = { docs: {} };
  try {
    rec = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    // never synced
  }
  return {
    syncedOn: rec.date || null,
    docs: SYNCED.map((f) => {
      const now = hash(f),
        then = (rec.docs || {})[f] || null;
      return { file: f, state: !then ? 'unknown' : then === now ? 'synced' : 'changed' };
    }),
  };
}
export function mark() {
  const docs = Object.fromEntries(SYNCED.map((f) => [f, hash(f)]));
  fs.writeFileSync(FILE, JSON.stringify({ date: new Date().toISOString().slice(0, 10), docs }, null, 1) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--mark')) {
    mark();
    console.log('Recorded as synced: ' + SYNCED.join(', '));
  } else {
    const s = status();
    for (const d of s.docs) console.log(`${d.state === 'synced' ? '✓' : '✗'} ${d.file}: ${d.state}`);
    console.log(s.syncedOn ? `last synced ${s.syncedOn}` : 'never recorded');
    process.exit(s.docs.every((d) => d.state === 'synced') ? 0 : 1);
  }
}
