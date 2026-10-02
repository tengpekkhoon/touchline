// Transfer realism test: plays seasons and measures the market against real football (ages, fees, who moves
// where, whether signings fill a need and play), then — with --player — tests how the market treats a player you
// describe (a real one's age, ability, position and club): how often he moves, where, and for how much.
//   node tools/transfer-realism.mjs [--seasons 2] [--seed 5]
//   node tools/transfer-realism.mjs --player "age=24,ca=82,pos=ST,club=c_BRE" [--runs 6]
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const SEASONS = +(args.seasons || 2),
  SEED = +(args.seed || 5);

const fmtPct = (x) => `${(100 * x).toFixed(0)}%`;
const median = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : NaN;
};

function world(seed) {
  const { FM } = loadSim(seed);
  const W = FM.W,
    Sea = FM.Season;
  W.newWorld(W.REAL_RULES);
  Sea.init();
  W.takeCharge(Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 70).id, 'Realism');
  return { FM, W, Sea };
}
function playSeason({ FM, W, Sea }, onDay) {
  let summary = null;
  while (!summary) {
    const fx = Sea.userFixture();
    if (fx) Sea.applyUserMatch(FM.quickSim(fx, !!fx.ko));
    if (onDay) onDay();
    summary = Sea.advance(null);
    if (!W.employed() && FM.S.user.offers.length) W.takeCharge(FM.S.user.offers[0].id, 'Realism', false);
  }
}

// ---------- the market against real football ----------
function market() {
  const env = world(SEED),
    { FM, W } = env;
  const deals = [];
  // capture each deal as it happens, with the state of both clubs at that moment
  const T = FM.Transfers,
    exec = T.execute;
  T.execute = function (p, toId, fee, wage, opts) {
    const S = FM.S,
      from = p.clubId && S.clubs[FM.Youth.owner(p.clubId)],
      to = S.clubs[toId];
    const D = FM.D,
      g = D.POS_GROUP[p.pos],
      sq = W.squad(toId).filter((q) => !q.loan);
    const groupLevel = (grp) => {
      const n = { GK: 1, DEF: 4, MID: 3, ATT: 3 }[grp];
      const l = sq
        .filter((q) => D.POS_GROUP[q.pos] === grp)
        .sort((a, b) => b.ca - a.ca)
        .slice(0, n);
      return l.length ? l.reduce((s, q) => s + q.ca, 0) / l.length : 0;
    };
    const levels = ['GK', 'DEF', 'MID', 'ATT'].map((x) => [x, groupLevel(x)]);
    const weakest = levels.sort((a, b) => a[1] - b[1])[0][0];
    const starters = sq.filter((q) => D.POS_GROUP[q.pos] === g).sort((a, b) => b.ca - a.ca);
    const wouldStart = starters.filter((q) => q.ca > p.ca).length < ({ GK: 1, DEF: 4, MID: 3, ATT: 3 }[g] || 2);
    const r = {
      age: W.age(p),
      ca: p.ca,
      value: p.value,
      fee,
      free: !fee,
      user: W.isUser(toId) || (from && W.isUser(from.id)),
      domestic: from ? from.nat === to.nat : null,
      up: from ? to.rep > from.rep + 2 : null,
      buyerLevel: W.levelFor(to.rep),
      need: g === weakest,
      wouldStart,
      toTier: to.comp && S.comps[to.comp] ? S.comps[to.comp].tier : 9,
      elite: p.ca >= 82,
    };
    const out = exec.apply(this, arguments);
    if (to.sim === 'full' || to.sim === 'light') deals.push(r);
    return out;
  };
  // free agents join through W.startSpell directly
  const spell = W.startSpell;
  W.startSpell = function (p, clubId) {
    const c = FM.S.clubs[clubId];
    if (!p.clubId && !p.loan && c && (c.sim === 'full' || c.sim === 'light') && !W.isUser(clubId))
      deals.push({
        age: W.age(p),
        ca: p.ca,
        value: p.value,
        fee: 0,
        free: true,
        user: false,
        domestic: null,
        toTier: 9,
      });
    return spell.apply(this, arguments);
  };
  let topValue = 0;
  for (let s = 0; s < SEASONS; s++) {
    playSeason(env);
    topValue = Math.max(topValue, ...Object.values(FM.S.players).map((p) => p.value || 0));
  }
  W.startSpell = spell;
  T.execute = exec;
  const ai = deals.filter((d) => !d.user);
  const paid = ai.filter((d) => !d.free && d.value > 0);
  const top = ai.filter((d) => d.toTier === 1);
  const rows = [
    ['AI signings per season (full and light leagues)', ai.length / SEASONS, 1500, 6000, 0],
    ['Median age of a signing', median(ai.map((d) => d.age)), 24, 27, 1],
    ['Signings aged 30+ %', (100 * ai.filter((d) => d.age >= 30).length) / ai.length, 10, 25, 1],
    ['Signings aged 21 or under %', (100 * ai.filter((d) => d.age <= 21).length) / ai.length, 10, 30, 1],
    ['Free transfers %', (100 * ai.filter((d) => d.free).length) / ai.length, 20, 50, 1],
    ['Median fee / market value', median(paid.map((d) => d.fee / d.value)), 0.9, 1.4, 2],
    ['Paid moves to a bigger club %', (100 * paid.filter((d) => d.up).length) / paid.length, 45, 80, 1],
    [
      'Domestic moves %',
      (100 * ai.filter((d) => d.domestic).length) / ai.filter((d) => d.domestic != null).length,
      40,
      75,
      1,
    ],
    ['Top-flight signings who would start %', (100 * top.filter((d) => d.wouldStart).length) / top.length, 35, 70, 1],
    ['Top-flight signings into the weakest area %', (100 * top.filter((d) => d.need).length) / top.length, 30, 70, 1],
    ['Signing ability vs buyer level (median gap)', median(top.map((d) => d.ca - d.buyerLevel)), -6, 6, 1],
    ['Elite players (ability 82+) moving per season', ai.filter((d) => d.elite).length / SEASONS, 3, 25, 1],
    ["Record fee vs the most valuable player's value", Math.max(...ai.map((d) => d.fee)) / topValue, 0.6, 2.5, 2],
  ];
  console.log(`Transfer realism · ${SEASONS} season(s), seed ${SEED} · ${deals.length} deals recorded\n`);
  let ok = 0;
  for (const [label, v, lo, hi, dp] of rows) {
    const good = v >= lo && v <= hi;
    ok += good;
    console.log(`${good ? '✓' : '✗'} ${label.padEnd(48)} ${v.toFixed(dp).padStart(7)}   real ${lo}–${hi}`);
  }
  console.log(`\n${ok}/${rows.length} in range`);
}

// ---------- one player: where would the market take him? ----------
function scenario(spec) {
  const o = Object.fromEntries(spec.split(',').map((kv) => kv.split('=').map((x) => x.trim())));
  const runs = +(args.runs || 6);
  const dests = new Map(),
    fees = [];
  let moved = 0;
  for (let r = 0; r < runs; r++) {
    const env = world(SEED + r),
      { FM, W } = env;
    const club = FM.S.clubs[o.club];
    if (!club) throw new Error('unknown club ' + o.club);
    const p = W.genPlayer({
      nat: o.nat || club.nat,
      pos: o.pos || 'ST',
      age: +(o.age || 24),
      ca: +(o.ca || 75),
      pa: Math.max(+(o.pa || 0), +(o.ca || 75)),
      clubId: club.id,
    });
    p.contract = FM.S.year + +(o.years || 3);
    FM.S.players[p.id] = p;
    W.startSpell(p, club.id);
    W.refresh(p);
    W.rosterVer++;
    let done = false;
    playSeason(env, () => {
      if (done || p.clubId === club.id) return;
      done = true;
      moved++;
      const last = FM.S.seasonLog.transfers.filter((t) => t.pid === p.id).at(-1);
      const to = FM.S.clubs[p.clubId];
      if (to) dests.set(to.name, (dests.get(to.name) || 0) + 1);
      if (last) fees.push(last.fee);
    });
    if (r === 0)
      console.log(
        `${W.name(p)} · ${o.pos || 'ST'} · ${o.age || 24} · ability ${Math.round(p.ca)} · ${club.name} · value ${FM.U.money(p.value)}\n`,
      );
  }
  console.log(`Moved in ${moved} of ${runs} seasons simulated (${fmtPct(moved / runs)})`);
  if (fees.length)
    console.log(
      `Fees: median ${(median(fees) / 1e6).toFixed(1)}M, range ${(Math.min(...fees) / 1e6).toFixed(1)}–${(Math.max(...fees) / 1e6).toFixed(1)}M`,
    );
  if (dests.size)
    console.log(
      'Destinations: ' +
        [...dests.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([n, k]) => `${n} ×${k}`)
          .join(', '),
    );
}

if (args.player) scenario(String(args.player));
else market();
