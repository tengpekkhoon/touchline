// Wider headless suite: the checks sim-test does not make. Plays seeded seasons with a manager who plays every match
// by quick-sim (like the wonderkid test) and reports
//   speed        time per matchday, per season and per pre-season day, against a budget
//   competitions every table adds up (played, points, goals for = against, wins = losses), leagues keep their size,
//                promotion and relegation move as many clubs up as down
//   squads       every full-simulation club can field a legal XI with a keeper in goal and a full bench, all season
//   finances     no club drifts into impossible debt or wealth
//   career       the manager's jobs and sackings stay possible
//   stability    the world keeps its size and shape from the first season to the last (use --seasons 20 for the long run)
//   node tools/suite.mjs [--seasons 3] [--seed 11] [--budget 1] [--skip-speed]
// --budget scales the speed limits (2 = twice as slow allowed, for a throttled CPU).
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const SEASONS = +(args.seasons || 3),
  SEED = +(args.seed || 11),
  BUDGET = +(args.budget || 1);
const { FM } = loadSim(SEED);
const W = FM.W,
  Sea = FM.Season,
  U = FM.U;

const fails = [];
const checks = [];
const check = (area, ok, msg) => {
  checks.push([area, ok, msg]);
  if (!ok) fails.push(`${area}: ${msg}`);
};

W.newWorld(W.REAL_RULES);
Sea.init();
W.takeCharge(Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 70).id, 'Suite Manager');
const sizeAt = () => ({
  clubs: Object.keys(FM.S.clubs).length,
  players: Object.values(FM.S.players).filter((p) => !p.retired).length,
  news: FM.S.news.length,
  staff: Object.keys(FM.S.staff || {}).length,
  leagues: Object.fromEntries(W.leagues().map((l) => [l.id, l.clubs.length])),
});
const first = sizeAt();

// ---- the checks ----
function checkTables(entry, label) {
  for (const [id, c] of Object.entries(entry.comps)) {
    const t = c.table,
      sum = (f) => t.reduce((a, r) => a + f(r), 0);
    check(
      'competitions',
      t.every((r) => r.p === r.w + r.d + r.l),
      `${label} ${id}: a row where played ≠ won + drawn + lost`,
    );
    check(
      'competitions',
      t.every((r) => r.pts >= 3 * r.w + r.d - 12 && r.pts <= 3 * r.w + r.d + 12), // (points deductions are small)
      `${label} ${id}: points do not follow from results`,
    );
    check('competitions', sum((r) => r.gf) === sum((r) => r.ga), `${label} ${id}: goals for ≠ goals against`);
    check('competitions', sum((r) => r.w) === sum((r) => r.l), `${label} ${id}: wins ≠ losses`);
    check('competitions', sum((r) => r.d) % 2 === 0, `${label} ${id}: an odd number of draws`);
    const n = t.length;
    if (c.sim !== 'minimal')
      check(
        'competitions',
        t.every((r) => r.p >= n - 1),
        `${label} ${id}: a club played fewer than ${n - 1} games`,
      );
  }
}
function checkSquads(label) {
  const bad = [];
  for (const c of Object.values(FM.S.clubs)) {
    if (c.sim !== 'full') continue;
    const tactic = c.tactic || W.aiTactic(c);
    const sq = W.squad(c.id);
    const { xi, bench } = W.pickXI(c.id, tactic);
    const slots = FM.D.FORMATIONS[tactic.formation];
    const full = xi.length === 11 && xi.every(Boolean);
    const keeper = full && xi.some((p, i) => slots[i].t === 'GK' && p.pos === 'GK');
    if (!full || !keeper || bench.length < 5 || sq.filter((p) => p.pos === 'GK').length < 2)
      bad.push(`${c.name} (${full ? (keeper ? 'bench ' + bench.length : 'no keeper') : 'XI incomplete'})`);
  }
  check('squads', bad.length === 0, `${label}: ${bad.length} clubs cannot field a legal side, e.g. ${bad.slice(0, 3)}`);
}
function checkFinances(label) {
  const bal = Object.values(FM.S.clubs)
    .filter((c) => c.sim === 'full')
    .map((c) => ({ c, b: c.balance, r: Sea.revenuePotential(c) }));
  const bust = bal.filter((x) => !Number.isFinite(x.b) || x.b < -8 * x.r - 5e7);
  const rich = bal.filter((x) => x.b > 40 * x.r + 5e8);
  check(
    'finances',
    bust.length === 0,
    `${label}: ${bust.length} clubs in impossible debt, e.g. ${bust[0] && bust[0].c.name}`,
  );
  check(
    'finances',
    rich.length === 0,
    `${label}: ${rich.length} clubs with impossible wealth, e.g. ${rich[0] && rich[0].c.name}`,
  );
  return bal;
}

// ---- play ----
const dayMs = [],
  preMs = [],
  seasonSecs = [],
  perSeason = [];
let jobs = 0,
  sackings = 0;
for (let s = 0; s < SEASONS; s++) {
  let summary = null,
    days = 0;
  const year = FM.S.year,
    tSeason = performance.now();
  checkSquads(`season ${s + 1} start`);
  while (!summary) {
    const fx = Sea.userFixture();
    if (fx && !FM.S.user.sacked) Sea.applyUserMatch(FM.quickSim(fx, !!fx.ko));
    const t0 = performance.now();
    const wasMatchday = (FM.S.calendar[FM.S.day] || {}).type !== 'pre';
    summary = Sea.advance(null);
    (wasMatchday ? dayMs : preMs).push(performance.now() - t0);
    if (!W.employed() && FM.S.user.offers.length) {
      W.takeCharge(FM.S.user.offers[0].id, 'Suite Manager', false);
      jobs++;
    }
    if (FM.S.user.sacked) sackings++;
    if (days++ === 100) checkSquads(`season ${s + 1} mid`);
    if (days > 450) {
      fails.push(`season ${s + 1} never ended`);
      break;
    }
  }
  seasonSecs.push((performance.now() - tSeason) / 1000);
  check('stability', FM.S.year === year + 1, `season ${s + 1}: the year did not advance`);
  if (summary && summary.entry) checkTables(summary.entry, `season ${s + 1}`);
  const now = sizeAt();
  for (const [id, n] of Object.entries(first.leagues))
    check(
      'competitions',
      now.leagues[id] === n,
      `season ${s + 1}: ${id} has ${now.leagues[id]} clubs, started with ${n}`,
    );
  const moved = summary && summary.entry ? summary.entry : { promoted: [], relegated: [] };
  check(
    'competitions',
    moved.promoted.length === moved.relegated.length,
    `season ${s + 1}: ${moved.promoted.length} promoted but ${moved.relegated.length} relegated`,
  );
  const fin = checkFinances(`season ${s + 1}`);
  const wealth = fin.map((x) => x.b / Math.max(1, x.r)).sort((a, b) => a - b);
  const xi = U.avg(
    Object.values(FM.S.clubs)
      .filter((c) => c.sim === 'full' && c.comp === 'D1')
      .map((c) => U.avg(W.pickXI(c.id, c.tactic || W.aiTactic(c)).xi.filter(Boolean), (p) => p.ca)),
  );
  perSeason.push({ ...now, secs: seasonSecs[s], xi, poor: wealth[0], rich: wealth[wealth.length - 1] });
  console.log(
    `season ${s + 1} · ${seasonSecs[s].toFixed(0)}s · ${now.players} players · feed ${now.news} · top-flight XI ${xi.toFixed(1)} · wealth ${wealth[0].toFixed(1)}…${wealth[wealth.length - 1].toFixed(1)} × revenue`,
  );
}

// ---- speed ----
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a, q) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length * q)] : 0);
if (!args['skip-speed']) {
  check(
    'speed',
    avg(dayMs) < 4000 * BUDGET,
    `a league day averages ${avg(dayMs).toFixed(0)} ms (limit ${4000 * BUDGET})`,
  );
  check(
    'speed',
    pct(dayMs, 0.99) < 12000 * BUDGET,
    `the slowest 1% of league days take ${pct(dayMs, 0.99).toFixed(0)} ms (limit ${12000 * BUDGET})`,
  );
  check(
    'speed',
    avg(preMs) < 1500 * BUDGET,
    `a pre-season day averages ${avg(preMs).toFixed(0)} ms (limit ${1500 * BUDGET})`,
  );
  check(
    'speed',
    avg(seasonSecs) < 900 * BUDGET,
    `a season takes ${avg(seasonSecs).toFixed(0)} s (limit ${900 * BUDGET})`,
  );
}

// ---- media ----
{
  const m = FM.S.media;
  check(
    'career',
    !!m && Object.values(m.att).every((v) => Number.isFinite(v) && v >= -100 && v <= 100),
    'the media view of the manager is out of range',
  );
  check('career', FM.S.news.filter((n) => n.outlet).length > 0 || SEASONS < 1, 'no media headlines in the feed');
}

// ---- career ----
check('career', !!FM.S.user, 'the manager is left in an impossible state');
check('career', sackings <= SEASONS * 40, `${sackings} sacked days in ${SEASONS} seasons`);

// ---- stability ----
const last = perSeason[perSeason.length - 1];
// (the first season is a burn-in: a new world's intake and backfilled history add players once)
const base = perSeason.length > 1 ? perSeason[0] : first;
check('stability', Math.abs(last.clubs - first.clubs) <= 2, `club count ${first.clubs} → ${last.clubs}`);
check(
  'stability',
  Math.abs(last.players - base.players) < base.players * 0.08,
  `players ${base.players} → ${last.players}`,
);
check('stability', last.news <= 2 * FM.News.CAP, `the feed holds ${last.news} items`);
check('stability', last.staff < first.staff * 2.5 + 200, `staff records ${first.staff} → ${last.staff}`);
if (perSeason.length >= 3)
  check(
    'stability',
    Math.abs(last.xi - perSeason[0].xi) < 6,
    `top-flight XI ability ${perSeason[0].xi.toFixed(1)} → ${last.xi.toFixed(1)}`,
  );
check(
  'stability',
  last.secs < perSeason[0].secs * 2.5 + 60,
  `a season slows from ${perSeason[0].secs.toFixed(0)} s to ${last.secs.toFixed(0)} s`,
);
const packed = FM.Save.pack(FM.S);
const mb = (packed.length || packed.byteLength || 0) / 1048576;
check('stability', mb < 60, `a save is ${mb.toFixed(1)} MB`);
check(
  'stability',
  Object.keys(FM.Save.unpack(packed).state.players).length === Object.keys(FM.S.players).length,
  'pack/unpack changed the player count',
);

// ---- report ----
const areas = [...new Set(checks.map((c) => c[0]))];
console.log(
  `\nSuite · ${SEASONS} season(s), seed ${SEED}\nspeed: league day ${avg(dayMs).toFixed(0)} ms avg, ${pct(dayMs, 0.99).toFixed(0)} ms p99 · pre-season day ${avg(preMs).toFixed(0)} ms · season ${avg(seasonSecs).toFixed(0)} s · save ${mb.toFixed(1)} MB · ${jobs} new jobs, ${sackings} sacked days\n`,
);
for (const a of areas) {
  const mine = checks.filter((c) => c[0] === a);
  console.log(
    `${mine.every((c) => c[1]) ? '✓' : '✗'} ${a.padEnd(13)} ${mine.filter((c) => c[1]).length}/${mine.length}`,
  );
}
if (fails.length) {
  console.log('\nFailures:\n' + [...new Set(fails)].slice(0, 40).join('\n'));
  process.exit(1);
}
console.log('\nAll checks passed.');
