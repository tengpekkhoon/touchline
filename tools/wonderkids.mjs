// Wonderkid test: how the game's best young prospects turn out. Plays seeded seasons, follows every player who is 19 or
// under with a potential of 85+ (the world's wonderkids at the start, and each season's academy intake after), and
// reports how many reach world class, become good professionals, stall or flop, and when the best peak, against what real
// football shows (of the top teenage prospects in a year, roughly a fifth reach the world's elite, about half become
// solid first-team players, and a third or so never do).
//   node tools/wonderkids.mjs [--seasons 10] [--seed 5]
// A season takes a couple of minutes; with fewer than about 8 seasons few of the first wonderkids have grown up, and the
// table says how many are still too young to judge.
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const SEASONS = +(args.seasons || 10),
  SEED = +(args.seed || 5);
const { FM } = loadSim(SEED);
const W = FM.W,
  Sea = FM.Season;
W.newWorld(W.REAL_RULES);
Sea.init();
W.takeCharge(Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 70).id, 'Wonderkids');

const kids = new Map(); // id → { y0, age0, pa0, ca0, peak, peakAge, last }
const scan = (label) => {
  const S = FM.S;
  for (const p of Object.values(S.players)) {
    if (p.retired) continue;
    const age = W.age(p);
    if (!kids.has(p.id) && age <= 19 && p.pa >= 85)
      kids.set(p.id, {
        y0: S.year,
        age0: age,
        pa0: p.pa,
        ca0: p.ca,
        peak: p.ca,
        peakAge: age,
        last: p.ca,
        lastAge: age,
      });
    const k = kids.get(p.id);
    if (k) {
      k.last = p.ca;
      k.lastAge = age;
      if (p.ca > k.peak) {
        k.peak = p.ca;
        k.peakAge = age;
      }
    }
  }
  console.log(`${label}: following ${kids.size} wonderkids`);
};
scan('start');
for (let s = 0; s < SEASONS; s++) {
  let summary = null;
  while (!summary) {
    const fx = Sea.userFixture();
    if (fx) Sea.applyUserMatch(FM.quickSim(fx, !!fx.ko));
    summary = Sea.advance(null);
    if (!W.employed() && FM.S.user.offers.length) W.takeCharge(FM.S.user.offers[0].id, 'Wonderkids', false);
  }
  scan(`season ${s + 1}`);
}

// Outcomes for those old enough to judge: 25 or over (or retired/gone, which counts as the last seen)
const all = [...kids.values()],
  judged = all.filter((k) => k.lastAge >= 25),
  young = all.length - judged.length;
const n = judged.length || 1;
const pct = (f) => (100 * judged.filter(f).length) / n;
const rows = [
  ['Wonderkids followed', all.length, 3, 400, 0],
  ['Old enough to judge (25+)', judged.length, 0, 1e9, 0],
  ['Reach world class (peak 82+) %', pct((k) => k.peak >= 82), 8, 35, 0],
  ['Good professionals (peak 70–81) %', pct((k) => k.peak >= 70 && k.peak < 82), 25, 60, 0],
  ['Never get beyond 69 (stall or flop) %', pct((k) => k.peak < 70), 15, 50, 0],
  ['Flop outright (peak under 62) %', pct((k) => k.peak < 62), 3, 30, 0],
  [
    'Peak age (median, those who reach 75+)',
    median(judged.filter((k) => k.peak >= 75).map((k) => k.peakAge)),
    24,
    30,
    0,
  ],
  ['Fall short of their potential by 10+ %', pct((k) => k.pa0 - k.peak >= 10), 25, 75, 0],
];
function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : NaN;
}
console.log(`\nWonderkids · ${SEASONS} season(s), seed ${SEED} · ${young} still too young to judge\n`);
let ok = 0;
for (const [label, v, lo, hi, dp] of rows) {
  const good = Number.isNaN(v) ? true : v >= lo && v <= hi;
  ok += good;
  console.log(
    `${good ? '✓' : '✗'} ${label.padEnd(44)} ${Number.isNaN(v) ? '—' : v.toFixed(dp).padStart(6)}   real ${lo}–${hi >= 1e9 ? '' : hi}`,
  );
}
console.log(`\n${ok}/${rows.length} in range`);
