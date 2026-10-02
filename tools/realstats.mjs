// Real-stats converter, command line. Turns a CSV or JSON file of real players' numbers into game attributes and ability.
//   node tools/realstats.mjs players.csv [--league D1] [--out converted.json]   convert a file
//   node tools/realstats.mjs --test                                              self-check (npm run test:realstats)
// Columns (any that exist are used; names, nat, born and club are carried through):
//   name, nat, born | age, pos, foot, club, league, minutes, goals, assists, xg, xa, shots, passes, passPct, keyPasses,
//   tackles, interceptions, clearances, dribbles, aerials, pressures, saves, savePct, goalsConceded, rating, topSpeed
// Counts are season totals; add a `per90` column of 1 when they are already per 90 minutes.
import fs from 'node:fs';
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const { FM } = loadSim(1);
const R = FM.RealStats;

if ('test' in args) {
  const fails = [];
  const check = (ok, msg) => ok || fails.push(msg);
  const st = {
    pos: 'ST',
    age: 25,
    minutes: 2700,
    league: 'D1',
    goals: 15,
    xg: 14,
    shots: 90,
    assists: 4,
    passes: 500,
    passPct: 76,
  };
  const a = R.convert(st),
    more = R.convert({ ...st, goals: 28, xg: 22 }),
    weak = R.convert({ ...st, league: 35 }),
    few = R.convert({ ...st, minutes: 150, goals: 3, xg: 1 }),
    old = R.convert({ ...st, age: 35 }),
    young = R.convert({ ...st, age: 18 });
  check(more.ca > a.ca, 'more goals did not raise ability');
  check(more.attrs.finishing > a.attrs.finishing, 'more goals did not raise finishing');
  check(weak.ca < a.ca - 5, 'the same numbers in a weak league did not come out lower');
  check(
    Math.abs(few.ca - R.baseline(R.leagueStrength('D1'))) < Math.abs(a.ca - R.baseline(R.leagueStrength('D1'))) + 1,
    'few minutes did not pull toward the baseline',
  );
  check(old.attrs.pace < a.attrs.pace, 'a 35-year-old is as quick as a 25-year-old');
  check(young.pa > young.ca && old.pa === old.ca, 'potential: the young should have room, the old none');
  for (const r of [
    a,
    more,
    weak,
    few,
    old,
    young,
    R.convert({ pos: 'GK', age: 28, minutes: 3000, league: 'D1', savePct: 0.78, goalsConceded: 30 }),
  ]) {
    check(
      Object.values(r.attrs).every((v) => v >= 1 && v <= 20),
      `attributes out of range: ${JSON.stringify(r.attrs)}`,
    );
    check(r.ca === FM.W.calcCA({ attrs: r.attrs }, r.pos), 'ability does not follow from the attributes');
    check(r.pa >= r.ca && r.pa <= 96, 'potential below ability or above 96');
  }
  for (const p of ['LB', 'RWB', 'CDM', 'CAM', 'LW', 'CF', 'RM', 'gk', 'ST ', 'DC'])
    check(R.position(p), `position ${p} not understood`);
  check(R.position('QB') === null, 'a made-up position was accepted');
  const csv = R.parseCSV('name,pos,minutes\n"Doe, John",ST,2000\nSmith,CM,900\n');
  check(csv.length === 2 && csv[0].name === 'Doe, John', 'CSV with a quoted comma was misread');
  check(JSON.stringify(R.convert(st)) === JSON.stringify(R.convert(st)), 'conversion is not deterministic');
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'Real-stats converter: all checks passed.');
  process.exit(fails.length ? 1 : 0);
}

const file = process.argv[2];
if (!file || file.startsWith('--')) {
  console.log('usage: node tools/realstats.mjs players.csv [--league D1] [--out converted.json] | --test');
  process.exit(1);
}
const text = fs.readFileSync(file, 'utf8');
const rows = file.endsWith('.json') ? JSON.parse(text) : R.parseCSV(text).map(R.clean);
const out = rows.map((r) => {
  try {
    const x = R.convert({ league: args.league, ...r });
    return { name: r.name, nat: r.nat, born: r.born, club: r.club, foot: r.foot, ...x };
  } catch (e) {
    return { name: r.name, error: e.message };
  }
});
const dest = args.out;
if (dest) fs.writeFileSync(dest, JSON.stringify(out, null, 2));
for (const o of out)
  console.log(
    o.error
      ? `✗ ${o.name}: ${o.error}`
      : `${(o.name || '?').padEnd(24)} ${o.pos.padEnd(3)} CA ${o.ca} PA ${o.pa} (${Math.round(o.confidence * 100)}% sure)`,
  );
if (dest) console.log(`\nWrote ${out.length} players to ${dest}`);
