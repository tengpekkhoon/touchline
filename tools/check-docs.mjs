// Docs check: the headline numbers (clubs, leagues, nations, national teams, cups) in the README and docs must match the
// data (FM.D.facts, js/data.js). Run `npm run check:docs`; it fails when a doc has gone stale. A line about a past
// build ("Playtest feedback, batch 6 ... 664 clubs in 36 leagues") is history and is left alone: only the present-tense
// phrases below are checked.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadSim } from './harness.mjs';

const { FM } = loadSim(1);
const F = FM.D.facts();
const word = (n) =>
  ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] ||
  String(n);
// [pattern, what it must say, which fact]
const RULES = [
  [
    /(\d+) real clubs in (\d+) real leagues(?: \(at their real sizes\))? across (\d+) nations/g,
    (m) => [+m[1] === F.clubs, +m[2] === F.leagues, +m[3] === F.nations].every(Boolean),
    `${F.clubs} real clubs in ${F.leagues} real leagues across ${F.nations} nations`,
  ],
  [/(\d+) national teams/g, (m) => +m[1] === F.nationalTeams, `${F.nationalTeams} national teams`],
  [
    /(\w+) domestic cups, (\w+) continental cups/g,
    (m) => [m[1], m[2]].join() === [word(F.domesticCups), word(F.continentalCups)].join(),
    `${word(F.domesticCups)} domestic cups, ${word(F.continentalCups)} continental cups`,
  ],
];
const FILES = ['README.md', 'docs/GAME_DESIGN_DOCUMENT.md'];
let bad = 0;
for (const f of FILES) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const [re, ok, say] of RULES)
    for (const m of text.matchAll(re))
      if (!ok(m)) {
        bad++;
        console.log(`✗ ${f}: "${m[0]}" — should be "${say}"`);
      }
}
console.log(
  bad
    ? `\n${bad} stale number(s)`
    : `✓ docs agree with the data (${F.clubs} clubs, ${F.leagues} leagues, ${F.nations} nations, ${F.nationalTeams} national teams, ${F.domesticCups} + ${F.continentalCups} cups)`,
);
process.exit(bad ? 1 : 0);
