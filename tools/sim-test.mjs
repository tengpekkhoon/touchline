// Headless regression test: builds a world with a seeded RNG, plays seasons through the same code the
// app uses (our matches applied first, the rest of each day simulated after a JSON round trip, exactly
// like the Web Worker), then checks invariants, save packing and save migrations.
//   node tools/sim-test.mjs [--seasons 2] [--seed 7]
import vm from 'node:vm';
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const SEASONS = +(args.seasons || 2),
  SEED = +(args.seed || 7);
const store = {};
const { ctx, FM } = loadSim(SEED, {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
});
const W = FM.W,
  Sea = FM.Season;
// Use the context's own JSON: objects from the host realm would make the simulation much slower
const roundTrip = () => vm.runInContext('FM.S = FM.Save.relink(JSON.parse(JSON.stringify(FM.S)))', ctx);
const cJSON = vm.runInContext('JSON', ctx);

const fails = [];
const check = (ok, msg) => {
  if (!ok) fails.push(msg);
};
const t0 = Date.now();

W.newWorld({ win: 3, subs: 5, foreignLimit: 6, twoLegs: true, awayGoals: false });
Sea.init();
const cid = Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 75).id;
W.takeCharge(cid, 'Test Manager');
W.seedLegends();
FM.Stories.welcome();
check(FM.S.version === FM.SAVE_VERSION, `new world has version ${FM.S.version}, expected ${FM.SAVE_VERSION}`);

// ---- play seasons ----
const stats = { matches: 0, goals: 0, userMatches: 0, days: 0 };
const origApply = Sea.apply;
Sea.apply = function (fx, m) {
  stats.matches++;
  stats.goals += m.sides[0].goals + m.sides[1].goals;
  return origApply.call(this, fx, m);
};
const trends = [],
  leagueSize = Object.fromEntries(W.leagues().map((l) => [l.id, l.clubs.length]));
const U = FM.U;
let tSeason = Date.now();
for (let s = 0; s < SEASONS; s++) {
  let summary = null,
    daysThisSeason = 0;
  const year = FM.S.year;
  while (!summary) {
    // Out of work (sacked): wait for an offer and take the first one, as a player would from the Home tab
    if (!W.employed() && (FM.S.user.offers || []).length) {
      W.takeCharge(FM.S.user.offers[0].id, 'Test Manager', false);
      stats.jobs = (stats.jobs || 0) + 1;
    }
    const fx = Sea.userFixture();
    if (fx && !FM.S.user.sacked) {
      const m = new FM.Match({
        h: fx.h,
        a: fx.a,
        comp: fx.comp,
        knockout: !!fx.ko,
        track: true,
        ...FM.Match.tieOpts(fx),
      });
      if (stats.userMatches % 3 === 0) FM.Matchday.applyTalk(m, 'focus', FM.Matchday.talkContext(fx));
      while (!m.finished) m.step();
      Sea.applyUserMatch(m);
      check(!!fx.res, `user fixture ${fx.id} has no result after applyUserMatch`);
      stats.userMatches++;
    }
    // The worker transport: the world crosses to the worker and back as JSON
    roundTrip();
    summary = stats.days % 5 === 4 ? Sea.skipToMatch().summary : Sea.advance(null);
    roundTrip();
    stats.days++;
    if (++daysThisSeason > 400) {
      fails.push(`season ${s + 1} never ended`);
      break;
    }
  }
  check(FM.S.year === year + 1, `season ${s + 1}: year did not advance`);
  check(summary && summary.entry, `season ${s + 1}: no season summary`);
  // Long-term drift: the world should stay the same size and roughly the same shape season after season
  const S0 = FM.S,
    full = Object.values(S0.clubs).filter((c) => c.sim === 'full'),
    active = Object.values(S0.players).filter((p) => !p.retired);
  const tier1 = W.leagues().filter((l) => l.tier === 1 && l.sim === 'full');
  const xiCA = U.avg(
    tier1.flatMap((l) =>
      l.clubs.map((id) =>
        U.avg(
          W.squad(id)
            .sort((a, b) => b.ca - a.ca)
            .slice(0, 11),
          (p) => p.ca,
        ),
      ),
    ),
  );
  const gpm =
    (stats.goals - (trends.at(-1) || { g: 0 }).g) / Math.max(1, stats.matches - (trends.at(-1) || { m: 0 }).m);
  const noKeeper = full.filter((c) => {
    const T = W.isUser(c.id) ? S0.user.tactic : c.tactic;
    const { xi } = W.pickXI(c.id, T);
    const slots = FM.D.FORMATIONS[T.formation];
    return xi.some((p, i) => p && slots[i].t === 'GK' && p.pos !== 'GK');
  }).length;
  check(noKeeper <= 2, `season ${s + 1}: ${noKeeper} clubs start an outfield player in goal`);
  const trend = {
    season: s + 1,
    gpm: gpm.toFixed(2),
    noKeeper,
    g: stats.goals,
    m: stats.matches,
    secs: Math.round((Date.now() - tSeason) / 1000),
    players: active.length,
    clubless: active.filter((p) => !p.clubId).length,
    retired: (S0.retired || []).length,
    staff: Object.keys(S0.staff).length,
    xiCA: xiCA.toFixed(1),
    allCA: U.avg(active, (p) => p.ca).toFixed(1),
    top100: U.avg(
      active
        .slice()
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 100),
      (p) => p.ca,
    ).toFixed(1),
    retiredKB: Math.round(JSON.stringify(S0.retired || []).length / 1024),
    rep: U.avg(full, (c) => c.rep).toFixed(1),
    balM: (U.avg(full, (c) => c.balance) / 1e6).toFixed(1),
    debt: full.filter((c) => c.balance < 0).length,
    news: S0.news.length,
    archive: (S0.archive || []).length,
    heat: Object.keys((S0.records || {}).heat || {}).length,
    saveMB: (FM.Save.pack(S0).length / 1e6).toFixed(2),
  };
  trends.push(trend);
  if ('trend' in args) console.log('  ' + JSON.stringify(trend));
  for (const lg of W.leagues())
    check(
      lg.clubs.length === leagueSize[lg.id],
      `season ${s + 1}: ${lg.name} has ${lg.clubs.length} clubs (started with ${leagueSize[lg.id]})`,
    );
  check(
    active.every((p) => !p.clubId || S0.clubs[p.clubId]),
    `season ${s + 1}: a player belongs to a club that doesn't exist`,
  );
  check(
    active.every((p) => W.age(p) >= 15 && W.age(p) <= 45),
    `season ${s + 1}: a player has an impossible age`,
  );
  check(
    full.every((c) => Number.isFinite(c.rep) && c.rep >= 1 && c.rep <= 99),
    `season ${s + 1}: a club reputation left 1–99`,
  );
  tSeason = Date.now();
  console.log(`season ${s + 1} done · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// ---- invariants ----
const S = FM.S;
const gpm = stats.goals / stats.matches;
check(gpm > 2.3 && gpm < 3.8, `goals per match ${gpm.toFixed(2)} outside 2.3–3.8`);
check(
  Number.isFinite(S.era) && S.era >= 0.85 && S.era <= 1.15,
  `tactical equilibrium factor ${S.era} missing or outside 0.85–1.15`,
);
// Simulation tiers follow the league after promotion and relegation (League One is light, the Championship full);
// the club you manage is always fully simulated
const wrongSim = Object.values(S.clubs).filter(
  (c) => c.comp && S.comps[c.comp] && c.sim !== (W.isUser(c.id) ? 'full' : S.comps[c.comp].sim),
);
check(
  wrongSim.length === 0,
  `${wrongSim.length} clubs on the wrong simulation tier (e.g. ${wrongSim[0] && wrongSim[0].name})`,
);
if (W.employed()) {
  const my = S.comps[W.userClub().comp],
    R = my.rules || {};
  const near = [my.id, R.promote && R.promote.to, R.relegate && R.relegate.to].filter(Boolean);
  check(
    near.every((id) => S.comps[id].sim === 'full'),
    `your league or a neighbour is not fully simulated (${near.map((id) => id + ':' + S.comps[id].sim).join(', ')})`,
  );
}
check(
  (S.comps.CUPENG.clubs || []).length === S.comps.D1.clubs.length + S.comps.D2.clubs.length + S.comps.D3.clubs.length,
  'FA Cup is missing English league clubs',
);
for (const c of Object.values(S.clubs)) {
  if (c.sim !== 'full') continue;
  const n = W.squad(c.id).length;
  check(n >= 16 && n <= 45, `${c.name} has ${n} players`);
  check(Number.isFinite(c.balance), `${c.name} balance is ${c.balance}`);
}
for (const comp of W.leagues()) {
  const rows = Object.values(comp.table || {});
  check(
    rows.every((r) => r.p === 0),
    `${comp.name}: table not reset for the new season`,
  );
  check(
    rows.length === comp.clubs.length,
    `${comp.name}: table has ${rows.length} rows for ${comp.clubs.length} clubs`,
  );
}
const bad = Object.values(S.players).filter(
  (p) =>
    !p.retired &&
    (!Number.isFinite(p.ca) || Object.values(p.attrs).some((v) => !Number.isFinite(v) || v < 1 || v > 20.5)),
);
check(bad.length === 0, `${bad.length} players with invalid attributes (e.g. ${bad[0] && bad[0].id})`);
check(S.news.length > 0 && S.news.length <= 160, `feed has ${S.news.length} items`);
// Records: our club's match records, all-time head-to-heads, player of the month, injury histories
const recs = S.records || {},
  managed = new Set(S.user.history.map((h) => h.club));
check(
  [...managed].some((id) => ((recs.clubs || {})[id] || {}).bigWin || ((recs.clubs || {})[id] || {}).bigLoss),
  'no club match records for any club the user managed',
);
check(Object.keys(recs.h2h || {}).length >= 5, `only ${Object.keys(recs.h2h || {}).length} head-to-head records`);
check(
  Object.values(S.players).some((p) => p.honours && p.honours.some((h) => h[1] === 'potm')),
  'no Player of the Month awarded',
);
check(
  Object.values(S.players).some((p) => p.injHist && p.injHist.length),
  'no injury histories recorded',
);
check(
  Object.values(recs.heat || {}).every((h) => Number.isFinite(h.v) && h.v >= 0),
  'invalid rivalry heat values',
);
// Injuries: catalogue types, sane countdowns, a realistic share of full-club squads out, medical decisions settled
const hurt = Object.values(S.players).filter((p) => p.inj);
check(
  hurt.every(
    (p) =>
      p.inj.weeks >= 1 &&
      Number.isFinite(p.inj.weeks) &&
      (p.inj.type === 'Illness' || FM.Injury.TYPES.some((t) => t.name === p.inj.type)),
  ),
  'an injury with a bad countdown or unknown type',
);
const fullSq = Object.values(S.clubs)
    .filter((c) => c.sim === 'full')
    .flatMap((c) => W.squad(c.id)),
  outPct = (100 * fullSq.filter((p) => p.inj).length) / fullSq.length;
check(outPct > 2 && outPct < 25, `${outPct.toFixed(1)}% of full-club players injured`);
check(
  S.news.filter((n) => n.type === 'medical' && !n.resolved).every((n) => S.year === n.year && S.day - n.day < 2),
  'a medical decision was never settled',
);
// Managers move between clubs; every full club still has exactly one manager, and nobody manages two clubs
check((recs.moves || []).length > 0, 'no manager moves recorded');
const mgrs = Object.values(S.clubs)
  .filter((c) => c.sim === 'full' && !W.isUser(c.id))
  .map((c) => c.manager);
check(
  mgrs.every((id) => id && S.staff[id]),
  'a full club has no manager',
);
check(new Set(mgrs).size === mgrs.length, 'one manager is in charge of two clubs');
check(
  mgrs.every((id) => !S.staff[id].unemployed),
  'a club is managed by someone marked unemployed',
);
check(stats.userMatches >= 15 * SEASONS, `only ${stats.userMatches} user matches in ${SEASONS} seasons`);
if (stats.jobs) console.log(`(the test manager was sacked ${stats.jobs}× and took a new job)`);

// ---- out of work: lose the job, wait for offers, take one ----
{
  if (!W.employed() && FM.S.user.offers.length) W.takeCharge(FM.S.user.offers[0].id, 'Test Manager', false); // sacked late on
  check(W.employed(), 'the test manager could not get a job for the out-of-work check');
  const was = FM.S.user.clubId;
  W.goUnemployed('sacked');
  const old = FM.S.clubs[was];
  check(!W.employed() && FM.S.user.unemployed, 'goUnemployed did not end the job');
  check(old.manager && FM.S.staff[old.manager], 'the old club was left without a manager');
  check(
    (FM.S.user.offers || []).length > 0 && !FM.S.user.offers.some((o) => o.id === was),
    'no fair job offers after losing the job',
  );
  const packedOut = FM.Save.pack(FM.S);
  check(FM.Save.unpack(packedOut).state.user.clubId === null, 'an out-of-work save does not load as out of work');
  let waited = 0,
    r = null;
  do {
    roundTrip();
    r = Sea.skipToMatch();
    waited += r.n;
  } while (!r.newOffer && !r.summary && waited < 60);
  check(r.newOffer || r.summary, `waiting ${waited} days brought no new offer`);
  if (FM.S.user.offers.length) {
    W.takeCharge(FM.S.user.offers[0].id, 'Test Manager', false);
    check(W.employed() && !FM.S.user.unemployed, 'taking an offer did not give a job');
  }
}

// ---- long-term drift (only meaningful over several seasons) ----
if (trends.length >= 4) {
  const first = trends[0],
    last = trends.at(-1);
  check(
    last.players < first.players * 1.25 && last.players > first.players * 0.8,
    `player count drifted ${first.players} → ${last.players}`,
  );
  check(Math.abs(last.xiCA - first.xiCA) < 6, `top-flight XI ability drifted ${first.xiCA} → ${last.xiCA}`);
  check(last.staff < first.staff * 2.5, `staff records grow without limit (${first.staff} → ${last.staff})`);
  check(
    last.secs < Math.max(first.secs * 2, first.secs + 20),
    `seasons are getting slower (${first.secs}s → ${last.secs}s)`,
  );
  // Saves grow while histories fill up, then should level off: judge the last few seasons' growth
  const slope = (last.saveMB - trends.at(-4).saveMB) / 3;
  check(
    trends.length < 12 ? last.saveMB < first.saveMB * 1.8 : slope < 0.12,
    `save size keeps growing (${first.saveMB} → ${last.saveMB} MB, ${slope.toFixed(2)} MB/season lately)`,
  );
}

// ---- save round trip ----
const packed = FM.Save.pack(S);
const back = FM.Save.unpack(packed).state;
check(Object.keys(back.players).length === Object.keys(S.players).length, 'player count changed through pack/unpack');
const drifted = Object.values(S.players).filter((p) => back.players[p.id] && back.players[p.id].ca !== p.ca);
check(
  drifted.length === 0,
  `${drifted.length} players' ability changed through pack/unpack (e.g. ${drifted[0] && `${drifted[0].ca} → ${back.players[drifted[0].id].ca}`})`,
);
check(
  JSON.stringify(back.comps) === JSON.stringify(JSON.parse(JSON.stringify(S.comps))),
  'competitions changed through pack/unpack',
);

// ---- migrations: a synthetic v4 save (older shape) upgrades cleanly ----
const v4 = cJSON.parse(packed);
v4.version = 4;
delete v4.settings.theme;
delete v4.user.adviceDone;
delete v4.user.promises;
v4.news.forEach((n) => delete n.read);
v4.user.tactic.capt = 'p_missing';
v4.user.shortlist = ['p_missing'];
const up = FM.Save.unpack(cJSON.stringify(v4));
check(up.from === 4 && up.state.version === FM.SAVE_VERSION, `v4 save upgraded to v${up.state.version}`);
check(
  up.state.settings.theme === 'dark' && Array.isArray(up.state.user.promises) && up.state.user.adviceDone,
  'v4 → v5 defaults not filled',
);
check(
  up.state.news.every((n) => n.read === true),
  'old feed items not marked read',
);
check(
  up.state.user.tactic.capt === null && up.state.user.shortlist.length === 0,
  'repair did not drop missing players',
);
// every version from OLDEST has a migration path; too-old and too-new saves are refused with a code
for (let v = FM.Save.OLDEST; v < FM.SAVE_VERSION; v++)
  check(typeof FM.Save.MIGRATIONS[v] === 'function', `no migration from v${v}`);
const refuse = (v) => {
  const o = cJSON.parse(packed);
  o.version = v;
  try {
    FM.Save.unpack(cJSON.stringify(o));
    return null;
  } catch (e) {
    return e.code;
  }
};
check(refuse(3) === 'too-old', 'v3 save not refused as too old');
check(refuse(FM.SAVE_VERSION + 1) === 'too-new', 'future save not refused as too new');

// ---- report ----
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(
  `${stats.matches} matches · ${gpm.toFixed(2)} goals/match · ${stats.userMatches} user matches · ${stats.days} sim steps · save ${(packed.length / 1e6).toFixed(2)} MB · ${secs}s`,
);
if (fails.length) {
  console.error(`\nFAILED (${fails.length}):\n - ` + fails.join('\n - '));
  process.exit(1);
}
console.log('All checks passed.');
