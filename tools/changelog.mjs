// Writes js/changelog.js (the "What's new" list in Settings) from the Shipped table in docs/ROADMAP.md, newest first, so
// there is one place to write what changed. Run `npm run changelog` after adding a row there.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './harness.mjs';

const text = fs.readFileSync(path.join(ROOT, 'docs/ROADMAP.md'), 'utf8').replace(/\r\n/g, '\n');
const shipped = text.slice(text.indexOf('## Shipped'), text.indexOf('## Next'));
// | Build | What shipped |  (the first two lines of the table are the header and its rule)
const rows = shipped
  .split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| Build') && !l.startsWith('| ---'))
  .map((l) => l.split(/ \| /).map((c) => c.replace(/^\| /, '').replace(/ \|$/, '').trim()))
  .filter((c) => c.length >= 2)
  .slice(0, 10)
  .map(([build, ...rest]) => ({
    build,
    text: rest
      .join(' | ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links to plain text
      .replace(/\*\*/g, ''),
  }));
const out = `// Generated from docs/ROADMAP.md by tools/changelog.mjs (npm run changelog): the newest builds, for Settings → What's new.
window.FM = window.FM || {};
window.FM.CHANGELOG = ${JSON.stringify(rows, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, 'js/changelog.js'), out);
console.log(`js/changelog.js: ${rows.length} builds, newest "${rows[0].build}"`);
