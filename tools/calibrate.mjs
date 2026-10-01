// Calibration report: plays seeded seasons through the real simulation and compares the numbers with
// real football. Nothing is tuned here; it measures, so engine changes can be judged against reality.
//   node tools/calibrate.mjs [--seasons 2] [--seed 3]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const SEASONS = +(args.seasons || 2),
  SEED = +(args.seed || 3);
const { FM } = loadSim(SEED);
const W = FM.W,
  Sea = FM.Season,
  U = FM.U;
// --set chanceRate=0.14,xgScale=0.8 tries calibration values without editing the engine
if (args.set)
  for (const kv of String(args.set).split(',')) {
    const [k, v] = kv.split('=');
    // a bare key is an engine knob (FM.CAL); a dotted path reaches any setting, e.g. Season.YOUTH.wonder=0.003
    const path = k.includes('.') ? k.split('.') : ['CAL', k];
    const obj = path.slice(0, -1).reduce((o, part) => o && o[part], FM),
      key = path.at(-1);
    if (!obj || !(key in obj)) throw new Error('unknown setting ' + k);
    obj[key] = +v;
  }

W.newWorld({ win: 3, subs: 5, twoLegs: true, awayGoals: false }); // default rules (no foreign-player limit)
Sea.init();
W.takeCharge(Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 75).id, 'Calibration');
W.seedLegends();
const worldIds = FM.S.nextId; // players with a higher id were born in the simulation (academy intakes, regens)

// ---- collectors ----
const lg = {
  n: 0,
  goals: 0,
  h: 0,
  d: 0,
  a: 0,
  nil: 0,
  shots: 0,
  sot: 0,
  xg: 0,
  spGoals: 0,
  penAtt: 0,
  penGoals: 0,
  cards: 0,
  reds: 0,
};
const light = { n: 0, goals: 0, h: 0, d: 0, a: 0, nil: 0 };
const cup = { mixed: 0, upsets: 0 };
const titles = [];
const repRank = () => {
  const r = {};
  for (const c of W.leagues().filter((l) => l.sim === 'full' && l.tier === 1))
    c.clubs
      .slice()
      .sort((a, b) => FM.S.clubs[b].rep - FM.S.clubs[a].rep)
      .forEach((id, i) => (r[id] = i + 1));
  return r;
};
let ranks = repRank();

const apply = Sea.apply;
Sea.apply = function (fx, m) {
  const comp = FM.S.comps[fx.comp];
  const res = m.result();
  if (comp && comp.type === 'league' && !fx.ko && !fx.leg) {
    const g = res.hg + res.ag;
    lg.n++;
    lg.goals += g;
    lg.nil += g === 0 ? 1 : 0;
    res.hg > res.ag ? lg.h++ : res.hg < res.ag ? lg.a++ : lg.d++;
    lg.shots += res.shots[0] + res.shots[1];
    lg.sot += res.sot[0] + res.sot[1];
    lg.xg += res.xg[0] + res.xg[1];
    for (const e of m.events) {
      if (e.k === 'goal' && (e.sp || e.type === 'penalty')) lg.spGoals++;
      if ((e.k === 'goal' || e.k === 'chance') && e.type === 'penalty') {
        lg.penAtt++;
        if (e.k === 'goal') lg.penGoals++;
      }
    }
    lg.cards += res.cards.length;
    lg.reds += res.cards.filter((c) => c.k === 'red').length;
    // minutes by age in top flights (real age profiles are minutes-weighted)
    if (comp.tier === 1)
      for (const sd of m.sides)
        for (const pid in sd.mins) {
          const p = FM.S.players[pid],
            a = W.age(p),
            n = sd.mins[pid];
          car.apps += n;
          car.ageSum += a * n;
          if (a <= 21) car.appsU21 += n;
          if (a >= 30) car.apps30 += n;
          if (a >= 33) car.apps33 += n;
        }
  }
  // Domestic cup ties between clubs from different divisions: how often does the lower one go through?
  if (comp && comp.type === 'cup' && res.win != null) {
    const th = FM.S.comps[FM.S.clubs[fx.h].comp],
      ta = FM.S.comps[FM.S.clubs[fx.a].comp];
    if (th && ta && th.tier !== ta.tier && Math.min(th.tier, ta.tier) === 1) {
      cup.mixed++;
      const winner = res.win ? fx.a : fx.h,
        wt = FM.S.comps[FM.S.clubs[winner].comp].tier;
      if (wt > 1) cup.upsets++;
    }
  }
  return apply.call(this, fx, m);
};
const play = FM.Tiers.play;
FM.Tiers.play = function (fx, sim) {
  play.call(this, fx, sim);
  if (sim !== 'light') return;
  const r = fx.res,
    g = r.hg + r.ag;
  light.n++;
  light.goals += g;
  light.nil += g === 0 ? 1 : 0;
  r.hg > r.ag ? light.h++ : r.hg < r.ag ? light.a++ : light.d++;
};

// ---- player careers: ages of who plays, how ability changes with age, when players retire ----
const topComp = (clubId) => {
  const c = clubId && FM.S.clubs[clubId],
    comp = c && FM.S.comps[c.comp];
  return !!comp && c.sim === 'full' && comp.tier === 1;
};
var car = {
  bySeason: [],
  apps: 0,
  appsU21: 0,
  apps30: 0,
  apps33: 0,
  ageSum: 0,
  gkAge: [],
  top100: [],
  retire: [],
  retireTop: [],
  delta: {},
};
let caPrev = {};
const newSeason = Sea.newSeason;
Sea.newSeason = function (entry) {
  const S = FM.S,
    act = Object.values(S.players).filter((p) => !p.retired);
  // first-choice keepers: the most-used GK at each top-flight club
  const byClub = {};
  for (const p of act)
    if (p.pos === 'GK' && topComp(p.clubId) && (!byClub[p.clubId] || p.season.apps > byClub[p.clubId].season.apps))
      byClub[p.clubId] = p;
  Object.values(byClub).forEach((p) => p.season.apps >= 10 && car.gkAge.push(W.age(p)));
  const top = act
    .filter((p) => p.clubId)
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 100);
  car.top100.push(U.avg(top, (p) => W.age(p)));
  (car.eliteCA = car.eliteCA || []).push(
    U.avg(
      act
        .filter((p) => p.clubId)
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 200),
      (p) => p.ca,
    ),
  ); // world top-200 ability
  // yearly ability change by age (players also seen at last season's end), clubbed players only
  const now = {};
  for (const p of act) {
    if (!p.clubId) continue;
    now[p.id] = p.ca;
    if (caPrev[p.id] == null) continue;
    const k = (p.pos === 'GK' ? 'g' : 'o') + W.age(p);
    (car.delta[k] = car.delta[k] || []).push(p.ca - caPrev[p.id]);
  }
  caPrev = now;
  return newSeason.call(this, entry);
};
// squad turnover: permanent signings (free or fee) into top-flight clubs
const exec = FM.Transfers.execute;
FM.Transfers.execute = function (p, toId, ...rest) {
  if (topComp(toId)) car.signings = (car.signings || 0) + 1;
  return exec.call(this, p, toId, ...rest);
};
// ---- market: loans, free agents, and players created from nowhere (anything but academy intakes) ----
const mk = { loansTop: 0, loanApps: [], faWait: [], conjured: 0, faN: 0, faTop: 0 };
const loanF = FM.Transfers.loan;
FM.Transfers.loan = function (p, toId) {
  if (topComp(p.clubId)) mk.loansTop++;
  return loanF.apply(this, arguments);
};
const endF = FM.Transfers.endLoans;
FM.Transfers.endLoans = function () {
  for (const p of Object.values(FM.S.players))
    if (p.loan && !W.isUser(p.loan.from)) {
      const sp = W.spell(p);
      if (sp) mk.loanApps.push(sp.apps);
    }
  return endF.apply(this, arguments);
};
const exF = FM.Transfers.execute;
FM.Transfers.execute = function (p) {
  if (!p.clubId && p.freeSince != null) {
    const d = (FM.S.year - Math.floor(p.freeSince / 1000)) * FM.S.calendar.length + FM.S.day - (p.freeSince % 1000);
    mk.faWait.push((d * 46) / FM.S.calendar.length);
  }
  return exF.apply(this, arguments);
};
let inIntake = false;
const yi = Sea.youthIntake;
Sea.youthIntake = function () {
  inIntake = true;
  try {
    return yi.apply(this, arguments);
  } finally {
    inIntake = false;
  }
};
const gp = W.genPlayer;
W.genPlayer = function () {
  if (!inIntake) mk.conjured++;
  return gp.apply(this, arguments);
};
const retire = Sea.retire;
Sea.retire = function (p) {
  const a = W.age(p) - 1; // retirements happen after the year ticks over: the age they finished playing at
  car.retire.push(a);
  const last = p.career.spells.at(-1);
  if (topComp(p.clubId) || (last && topComp(last.c))) car.retireTop.push(a);
  return retire.call(this, p);
};

// ---- injuries at fully simulated clubs ----
const inj = {
  n: 0,
  weeks: 0,
  sev: 0,
  long: 0,
  match: 0,
  muscle: 0,
  ham: 0,
  re: 0,
  old: 0,
  oldExp: 0,
  young: 0,
  youngExp: 0,
  burden: [],
};
const lastInj = {};
let gday = 0;
const injHook = (p, where) => {
  const c = p.clubId && FM.S.clubs[p.clubId];
  if (!c || c.sim !== 'full' || !p.inj) return;
  const w = p.inj.out || p.inj.weeks,
    type = p.inj.type;
  inj.n++;
  inj.weeks += w;
  if (w > 4) inj.sev++;
  if (w >= 12) inj.long++;
  if (where !== 'train' && where !== 'ill') inj.match++;
  if (/hamstring|calf|groin|thigh|adductor/i.test(type)) inj.muscle++;
  if (/hamstring/i.test(type)) inj.ham++;
  const part = FM.Injury ? FM.Injury.part(type) : type.split(' ')[0].toLowerCase(),
    prev = lastInj[p.id];
  if (prev && prev.part === part && gday - prev.back <= 8) inj.re++;
  lastInj[p.id] = { part, back: gday + (p.inj.weeks || 1) };
  const a = W.age(p);
  if (a >= 30) inj.old++;
  else if (a <= 24) inj.young++;
};
if (FM.Injury) {
  const hurt = FM.Injury.hurt;
  FM.Injury.hurt = function (p, ctx) {
    const r = hurt.call(this, p, ctx);
    if (r) injHook(p, ctx && ctx.where);
    return r;
  };
} else {
  const note = FM.Records.noteInjury;
  FM.Records.noteInjury = function (p) {
    injHook(p, 'match');
    return note.call(this, p);
  };
}
const injDay = () => {
  gday++;
  let sq = 0,
    out = 0;
  for (const c of Object.values(FM.S.clubs)) {
    if (c.sim !== 'full') continue;
    for (const p of W.squad(c.id)) {
      sq++;
      if (p.inj) out++;
      const a = W.age(p);
      if (a >= 30) inj.oldExp++;
      else if (a <= 24) inj.youngExp++;
    }
  }
  inj.burden.push(out / Math.max(1, sq));
  for (const p of Object.values(FM.S.players))
    if (!p.clubId && !p.retired) {
      mk.faN++;
      if (p.ca >= 70) mk.faTop++;
    } // free agents good enough for a top flight
};

const t0 = Date.now(),
  seasonGoals = [];
for (let s = 0; s < SEASONS; s++) {
  let summary = null;
  while (!summary) {
    const fx = Sea.userFixture();
    if (fx) Sea.applyUserMatch(FM.quickSim(fx, !!fx.ko));
    summary = Sea.advance(null);
    injDay();
    if (!W.employed() && FM.S.user.offers.length) W.takeCharge(FM.S.user.offers[0].id, 'Calibration', false);
  }
  const e = summary.entry;
  for (const id in e.comps) {
    const c = FM.S.comps[id];
    if (!c || c.sim !== 'full' || c.tier !== 1) continue;
    const t = e.comps[id].table,
      games = (t.length - 1) * 2;
    titles.push({
      comp: id,
      ppg: t[0].pts / games,
      gap: t[0].pts - t[1].pts,
      games,
      rank: ranks[e.comps[id].champion] || 99,
    });
  }
  seasonGoals.push(((lg.goals - (seasonGoals.g || 0)) / Math.max(1, lg.n - (seasonGoals.n || 0))).toFixed(2));
  seasonGoals.g = lg.goals;
  seasonGoals.n = lg.n;
  (seasonGoals.era = seasonGoals.era || []).push((FM.S.era || 1).toFixed(3));
  car.bySeason.push(
    ((100 * (car.apps30 - (car.bySeason.a30 || 0))) / Math.max(1, car.apps - (car.bySeason.a || 0))).toFixed(0),
  );
  car.bySeason.a30 = car.apps30;
  car.bySeason.a = car.apps;
  ranks = repRank();
  process.stderr.write(`season ${s + 1} · ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
}

// ---- report ----
// Player shape: secondary attributes (the ones a position's rating ignores) relative to ability, for 22–30-year-olds
// who grew up in the simulation vs those generated with the world. A gap means development distorts players.
const shape = (p) => {
  const w = FM.D.POS_W[p.pos],
    ks = FM.D.ATTRS.filter((k) => !w[k] && (p.pos === 'GK' || (k !== 'reflexes' && k !== 'handling')));
  return U.avg(ks, (k) => p.attrs[k]) - p.ca / 5;
};
const adults = Object.values(FM.S.players).filter((p) => !p.retired && p.clubId && W.age(p) >= 22 && W.age(p) <= 30);
const grown = adults.filter((p) => +p.id.slice(1) > worldIds && p.youth),
  made = adults.filter((p) => +p.id.slice(1) <= worldIds);
const shapeGap = grown.length >= 30 ? U.avg(grown, shape) - U.avg(made, shape) : NaN;
// Goals trend: least-squares slope of goals per match across seasons
const slope = (ys) => {
  const n = ys.length,
    mx = (n - 1) / 2,
    my = U.avg(ys, (y) => +y);
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (+ys[i] - my);
    den += (i - mx) ** 2;
  }
  return num / Math.max(1e-9, den);
};
const pct = (x, n) => (n ? (100 * x) / n : 0);
const rows = [
  ['Goals per match', lg.goals / lg.n, 2.6, 2.9, 2],
  ['Home wins %', pct(lg.h, lg.n), 42, 48, 1],
  ['Draws %', pct(lg.d, lg.n), 23, 28, 1],
  ['Away wins %', pct(lg.a, lg.n), 27, 33, 1],
  ['0–0 draws %', pct(lg.nil, lg.n), 6, 9, 1],
  ['Shots per match (both)', lg.shots / lg.n, 22, 27, 1],
  ['On target per match', lg.sot / lg.n, 7.5, 9.5, 1],
  ['xG per match', lg.xg / lg.n, 2.5, 3.0, 2],
  ['Set-piece share of goals %', pct(lg.spGoals, lg.goals), 22, 32, 1],
  ['Penalty conversion %', pct(lg.penGoals, lg.penAtt), 74, 80, 1],
  ['Penalties per match', lg.penAtt / lg.n, 0.2, 0.35, 2],
  ['Cards per match', lg.cards / lg.n, 3.5, 4.5, 1],
  ['Red cards per match', lg.reds / lg.n, 0.1, 0.25, 2],
  ['Champion points per game', U.avg(titles, (t) => t.ppg), 2.15, 2.5, 2],
  ['Title margin (pts)', U.avg(titles, (t) => t.gap), 2, 10, 1],
  ['Champion was a top-3 club %', pct(titles.filter((t) => t.rank <= 3).length, titles.length), 70, 90, 0],
  ['Cup upsets (lower division wins) %', pct(cup.upsets, cup.mixed), 15, 30, 1],
  ['Light leagues: goals per match', light.goals / light.n, 2.5, 2.9, 2],
  ['Light leagues: home wins %', pct(light.h, light.n), 42, 48, 1],
  ['Light leagues: draws %', pct(light.d, light.n), 23, 29, 1],
  ['Goals per match trend (per season)', SEASONS >= 4 ? slope(seasonGoals) : NaN, -0.02, 0.02, 3], // a steady game: no creep over long saves
];
// Ability-change curve: the age where the average player stops improving
const curve = (g) => {
  const out = [];
  for (let a = 17; a <= 37; a++) {
    const d = car.delta[g + a];
    if (d && d.length >= 12) out.push([a, U.avg(d, (x) => x)]);
  }
  return out;
};
const peak = (c) => {
  const i = c.findIndex(([a, d], j) => a >= 21 && d <= 0 && (!c[j + 1] || c[j + 1][1] <= 0));
  return i < 0 ? NaN : c[i][0] - 0.5;
};
const oc = curve('o'),
  gc = curve('g');
const fullClubs = Object.values(FM.S.clubs).filter((c) => c.sim === 'full').length;
const careerRows = [
  ['Top-flight average age (by minutes)', car.ageSum / car.apps, 26, 27.8, 1],
  ['Top-flight minutes by U21s %', pct(car.appsU21, car.apps), 6, 14, 1], // big-five leagues 6–10, France and Brazil 12–17
  ['Top-flight minutes by 30+ %', pct(car.apps30, car.apps), 17, 28, 1],
  ['Top-flight minutes by 33+ %', pct(car.apps33, car.apps), 3, 8, 1],
  ['First-choice top-flight keeper age', U.avg(car.gkAge, (x) => x), 27.5, 31, 1],
  ['World top-100 players average age', U.avg(car.top100, (x) => x), 26.5, 29, 1],
  ['Outfield peak age (ability stops rising)', peak(oc), 26.5, 29.5, 1],
  ['Keeper peak age', peak(gc), 28.5, 32.5, 1],
  ['Retirement age (all)', U.avg(car.retire, (x) => x), 32.5, 35.5, 1],
  ['Retirement age (from a top flight)', U.avg(car.retireTop, (x) => x), 33.5, 36.5, 1],
  ['Academy-grown vs generated player shape', shapeGap, -1, 1, 2],
  ['World top-200 ability trend (per season)', SEASONS >= 4 ? slope(car.eliteCA) : NaN, -0.2, 0.2, 2], // a stable elite: no inflation over long saves // secondary attributes minus ability/5, 22–30-year-olds
  [
    'Top-flight signings per club per season',
    (car.signings || 0) / (Object.values(FM.S.clubs).filter((c) => topComp(c.id)).length * SEASONS),
    3,
    9,
    1,
  ], // permanent deals, big-five clubs ~5–8
];
const med = (xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};
const topClubs = Object.values(FM.S.clubs).filter((c) => topComp(c.id)).length;
const marketRows = [
  ['Top-flight loans out per club per season', mk.loansTop / (topClubs * SEASONS), 1, 4, 1], // first-team squads only: real clubs also loan out reserves the game doesn't model
  ['Loanees: appearances on loan (median)', med(mk.loanApps), 10, 25, 0], // mix of season-long and half-season loans
  ['Free agents: weeks unattached before signing (median)', med(mk.faWait), 1, 8, 1],
  [
    'Players created from nowhere per season, per 100 clubs',
    (100 * mk.conjured) / (SEASONS * Object.keys(FM.S.clubs).length),
    0,
    20,
    1,
  ],
  ['Free agents of top-flight quality (ability 70+) %', pct(mk.faTop, mk.faN), 0, 5, 1],
];
const injRows = [
  ['Injuries per club per season', inj.n / (fullClubs * SEASONS), 20, 40, 1],
  ['Squad injured at any time %', 100 * U.avg(inj.burden, (x) => x), 8, 15, 1],
  ['Average layoff (weeks)', inj.weeks / inj.n, 2.2, 4, 1],
  ['Injuries longer than 4 weeks %', pct(inj.sev, inj.n), 12, 25, 1],
  ['Long-term (12+ weeks) per club per season', inj.long / (fullClubs * SEASONS), 0.5, 2.5, 2],
  ['Injuries in matches %', pct(inj.match, inj.n), 50, 70, 1],
  ['Muscle injuries %', pct(inj.muscle, inj.n), 30, 45, 1],
  ['Hamstring share %', pct(inj.ham, inj.n), 12, 22, 1],
  ['Re-injuries (same area, soon after) %', pct(inj.re, inj.n), 7, 18, 1],
  [
    'Injury rate 30+ vs 24-and-under',
    inj.old / Math.max(1, inj.oldExp) / (inj.young / Math.max(1, inj.youngExp)),
    1.15,
    1.8,
    2,
  ],
];
console.log(
  `\nCalibration · ${SEASONS} season(s), seed ${SEED} · ${lg.n} full-engine league matches, ${light.n} light-league matches, ${titles.length} top-flight titles, ${cup.mixed} cup ties across divisions\n`,
);
let off = 0,
  skipped = 0;
const show = (title, list) => {
  console.log(title);
  for (const [name, v, lo, hi, dp] of list) {
    if (!Number.isFinite(v)) {
      skipped++;
      console.log(`· ${name.padEnd(42)}      —   needs a longer run (--seasons 8)`);
      continue;
    }
    const ok = v >= lo && v <= hi;
    if (!ok) off++;
    console.log(
      `${ok ? '✓' : '✗'} ${name.padEnd(42)} ${(Number.isFinite(v) ? v.toFixed(dp) : '—').padStart(6)}   real ${lo}–${hi}`,
    );
  }
};
show('Matches', rows);
show('\nPlayer careers', careerRows);
show('\nInjuries (fully simulated clubs)', injRows);
show('\nMarket', marketRows);
const all = rows.length + careerRows.length + injRows.length + marketRows.length - skipped;
console.log(`\n${all - off}/${all} in range · goals per match by season: ${seasonGoals.join(', ')}`);
console.log(`Tactical equilibrium (chance-rate factor) after each season: ${seasonGoals.era.join(', ')}`);
// Which leagues are too predictable: champions' pre-season reputation rank, by league
{
  const by = {};
  for (const t of titles) (by[t.comp] = by[t.comp] || []).push(t.rank);
  console.log(
    `Champion's pre-season rank by league: ${Object.entries(by)
      .map(([id, r]) => `${FM.S.comps[id].short} ${r.join('/')}`)
      .join(' · ')}`,
  );
}
console.log(
  `Top-flight minutes by 30+ % by season: ${car.bySeason.join(', ')} · world top-200 ability by season: ${car.eliteCA.map((x) => x.toFixed(1)).join(', ')}`,
);
console.log(
  'Ability change per season by age, outfield: ' +
    oc.map(([a, d]) => `${a}:${d >= 0 ? '+' : ''}${d.toFixed(1)}`).join(' '),
);
console.log(
  'Ability change per season by age, keepers:  ' +
    gc.map(([a, d]) => `${a}:${d >= 0 ? '+' : ''}${d.toFixed(1)}`).join(' '),
);
if (args.json !== undefined)
  fs.writeFileSync(
    path.join(ROOT, 'tools', 'calibration.json'),
    JSON.stringify(
      {
        rows: rows.concat(careerRows, injRows, marketRows).map(([n, v, lo, hi]) => ({ n, v, lo, hi })),
        lg,
        light,
        cup,
        titles,
      },
      null,
      1,
    ),
  );
