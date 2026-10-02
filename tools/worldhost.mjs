// World host: one headless world kept in memory for the developer dashboard to look inside. The dashboard server starts
// this as a child process and sends it commands; it never runs by itself.
//
//   new / loadSave / exportSave     make a world, open a save file, write the world out
//   overview / clubs / club / players / player / table / feed / scan     look at the world as it is now
//   advance / timeline              play days (with optional "run until" conditions) and what was recorded each day
//   matchLab                        one fixture simulated many times, with optional tactic changes
//   inspectSave                     what is in a save file (sizes, version, upgrades) without opening it as the world
//
// Everything is read from the game's own objects (FM.S, FM.W ...); nothing here changes how the game plays.
import zlib from 'node:zlib';
import { loadSim } from './harness.mjs';

let FM = null,
  W = null,
  Sea = null,
  D = null,
  U = null;
let seed = 1;
let timeline = [];
let counters = { matches: 0, goals: 0, transfers: 0 };
let firstFailures = {};

const progress = (p) => process.send && process.send({ progress: p });

// ---------- A world ----------
function boot(s) {
  seed = s;
  ({ FM } = loadSim(s));
  W = FM.W;
  Sea = FM.Season;
  D = FM.D;
  U = FM.U;
  timeline = [];
  firstFailures = {};
  counters = { matches: 0, goals: 0, transfers: 0 };
  const apply = Sea.apply;
  Sea.apply = function (fx, m) {
    counters.matches++;
    counters.goals += m.sides[0].goals + m.sides[1].goals;
    return apply.call(this, fx, m);
  };
  const exec = FM.Transfers.execute;
  FM.Transfers.execute = function () {
    counters.transfers++;
    return exec.apply(this, arguments);
  };
}
const need = () => {
  if (!FM || !FM.S) throw new Error('No world yet: make one or open a save first.');
};
function newWorld({ seed: s = 7, club = null }) {
  boot(+s);
  W.newWorld(W.REAL_RULES);
  Sea.init();
  const pick = (club && FM.S.clubs[club]) || Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 70);
  W.takeCharge(pick.id, 'Dev Manager');
  return overview();
}
function toBytes(b64) {
  const buf = Buffer.from(b64, 'base64');
  try {
    return zlib.gunzipSync(buf).toString('utf8');
  } catch (e) {
    return buf.toString('utf8');
  }
}
function loadSave({ b64, seed: s = 7 }) {
  boot(+s);
  const { state, from } = FM.Save.unpack(toBytes(b64));
  FM.S = FM.Save.relink(state);
  W.rosterVer++;
  return { ...overview(), upgradedFrom: from };
}
function loadDef({ def, seed: s = 7 }) {
  boot(+s);
  const report = FM.WorldDef.load(def);
  Sea.init();
  const pick = Object.values(FM.S.clubs).find((c) => c.comp === 'D1' && c.rep < 70) || Object.values(FM.S.clubs)[0];
  W.takeCharge(pick.id, 'Dev Manager');
  return { ...overview(), definition: report };
}
function exportSave() {
  need();
  const text = FM.Save.pack(FM.S);
  return { b64: zlib.gzipSync(Buffer.from(text, 'utf8')).toString('base64'), bytes: text.length };
}

// ---------- Looking ----------
const pname = (p) => W.name(p);
const age = (p) => W.age(p);
const clubName = (id) => (id && FM.S.clubs[id] ? FM.S.clubs[id].name : '—');
const userClubId = () => FM.S.user && FM.S.user.clubId;
function overview() {
  need();
  const S = FM.S,
    cal = S.calendar || [];
  const players = Object.values(S.players);
  return {
    seed,
    year: S.year,
    day: S.day,
    days: cal.length,
    today: cal[S.day] ? cal[S.day].type : 'end',
    label: (() => {
      try {
        return Sea.dayLabel();
      } catch (e) {
        return '';
      }
    })(),
    user: S.user && S.user.clubId ? { club: userClubId(), name: clubName(userClubId()) } : null,
    version: S.version,
    clubs: Object.keys(S.clubs).length,
    clubsBySim: Object.values(S.clubs).reduce((o, c) => ((o[c.sim] = (o[c.sim] || 0) + 1), o), {}),
    players: players.filter((p) => !p.retired).length,
    retired: players.filter((p) => p.retired).length,
    freeAgents: players.filter((p) => !p.retired && !p.clubId).length,
    news: S.news.length,
    archive: (S.archive || []).length,
    leagues: W.leagues().map((l) => ({
      id: l.id,
      name: l.name,
      tier: l.tier,
      sim: l.sim || 'full',
      clubs: l.clubs.length,
    })),
    counters,
    formations: Object.keys(D.FORMATIONS),
    buildups: D.BUILDUP,
    presses: D.PRESS,
    widths: D.WIDTH,
  };
}
function xiOf(c) {
  const tactic = W.isUser(c.id) ? FM.S.user.tactic : c.tactic || W.aiTactic(c);
  const { xi, bench } = W.pickXI(c.id, tactic);
  const slots = D.FORMATIONS[tactic.formation];
  const full = xi.length === 11 && xi.every(Boolean);
  const keeper = full && xi.some((p, i) => slots[i].t === 'GK' && p.pos === 'GK');
  return { xi, bench, full, keeper, tactic };
}
function clubRow(c) {
  const sq = W.squad(c.id),
    { xi, bench, full, keeper } = xiOf(c);
  const live = xi.filter(Boolean);
  const mgr = c.manager && FM.S.staff[c.manager];
  return {
    id: c.id,
    name: c.name,
    comp: c.comp,
    sim: c.sim,
    rep: Math.round(c.rep),
    squad: sq.length,
    keepers: sq.filter((p) => p.pos === 'GK').length,
    xiCA: live.length ? Math.round(U.avg(live, (p) => p.ca) * 10) / 10 : 0,
    bench: bench.length,
    full,
    keeper,
    injured: sq.filter((p) => p.inj).length,
    balance: Math.round(c.balance),
    wages: Math.round(sq.reduce((t, p) => t + (p.wage || 0), 0)),
    board: Math.round(c.boardConf),
    fans: Math.round(c.fanMood),
    manager: mgr ? `${mgr.fn} ${mgr.ln}` : '',
    user: W.isUser(c.id),
  };
}
const CLUB_FILTERS = {
  benchShort: (r) => r.sim === 'full' && r.bench < 5,
  noKeeper: (r) => r.sim === 'full' && !r.keeper,
  hardFail: (r) => r.sim === 'full' && (!r.full || r.bench < 3 || r.keepers < 2),
  smallSquad: (r) => r.sim !== 'minimal' && r.squad < 18,
  bigSquad: (r) => r.squad > 40,
  negBalance: (r) => r.balance < 0,
  manyInjured: (r) => r.injured >= 6,
  noManager: (r) => r.sim !== 'minimal' && !r.manager && !r.user,
};
function clubs({ league, q, filter, sort = 'rep', dir = -1, limit = 150 }) {
  need();
  const qq = (q || '').toLowerCase();
  let list = Object.values(FM.S.clubs).filter(
    (c) =>
      (!league || c.comp === league) && (!qq || c.name.toLowerCase().includes(qq) || c.id.toLowerCase().includes(qq)),
  );
  let rows = list.map(clubRow);
  if (filter && CLUB_FILTERS[filter]) rows = rows.filter(CLUB_FILTERS[filter]);
  rows.sort((a, b) => (typeof a[sort] === 'string' ? a[sort].localeCompare(b[sort]) : a[sort] - b[sort]) * dir);
  return { total: rows.length, rows: rows.slice(0, limit) };
}
function playerRow(p) {
  const a = D.ATTRS.map((k) => p.attrs[k]);
  const mean = a.reduce((t, v) => t + v, 0) / a.length;
  return {
    id: p.id,
    name: pname(p),
    pos: W.posLabel(p),
    group: D.POS_GROUP[p.pos],
    age: age(p),
    nat: p.nat,
    club: p.clubId,
    clubName: clubName(p.clubId),
    ca: Math.round(p.ca),
    pa: Math.round(p.pa),
    morale: Math.round(p.morale),
    inj: p.inj ? p.inj.type : '',
    contract: p.contract,
    wage: p.wage,
    value: p.value,
    sd: Math.round(Math.sqrt(a.reduce((t, v) => t + (v - mean) ** 2, 0) / a.length) * 100) / 100,
    loan: !!p.loan,
    retired: !!p.retired,
  };
}
function players({
  q,
  pos,
  nat,
  club,
  league,
  minAge,
  maxAge,
  minCa,
  maxCa,
  free,
  flat,
  sort = 'ca',
  dir = -1,
  limit = 150,
}) {
  need();
  const S = FM.S,
    qq = (q || '').toLowerCase();
  const rows = [];
  for (const p of Object.values(S.players)) {
    if (p.retired) continue;
    if (qq && !pname(p).toLowerCase().includes(qq)) continue;
    if (pos && p.pos !== pos && D.POS_GROUP[p.pos] !== pos) continue;
    if (nat && p.nat !== nat) continue;
    if (club && p.clubId !== club) continue;
    if (league && !(p.clubId && S.clubs[p.clubId] && S.clubs[p.clubId].comp === league)) continue;
    if (free && p.clubId) continue;
    const a = age(p);
    if (minAge != null && minAge !== '' && a < +minAge) continue;
    if (maxAge != null && maxAge !== '' && a > +maxAge) continue;
    if (minCa != null && minCa !== '' && p.ca < +minCa) continue;
    if (maxCa != null && maxCa !== '' && p.ca > +maxCa) continue;
    const r = playerRow(p);
    if (flat && r.sd >= +flat) continue;
    rows.push(r);
  }
  rows.sort((a, b) => (typeof a[sort] === 'string' ? a[sort].localeCompare(b[sort]) : a[sort] - b[sort]) * dir);
  return { total: rows.length, rows: rows.slice(0, limit) };
}
function club({ id }) {
  need();
  const c = FM.S.clubs[id];
  if (!c) throw new Error('No such club');
  const sq = W.squad(id)
    .slice()
    .sort((a, b) => b.ca - a.ca);
  const { xi, tactic } = xiOf(c);
  const inXI = new Set(xi.filter(Boolean).map((p) => p.id));
  const comp = FM.S.comps[c.comp];
  const table = comp && comp.table ? W.sortedTable(comp) : [];
  return {
    ...clubRow(c),
    nick: c.nick,
    city: c.city,
    nat: c.nat,
    identity: c.identity,
    colors: c.colors,
    stadium: c.stadium,
    facilities: c.facilities,
    tactic: { formation: tactic.formation, buildup: tactic.buildup, press: tactic.press, width: tactic.width },
    position: table.some((r) => r.p > 0) ? table.findIndex((r) => r.id === id) + 1 : 0,
    leagueName: comp ? comp.name : '',
    revenue: Math.round(Sea.revenuePotential(c)),
    squadRows: sq.map((p) => ({ ...playerRow(p), xi: inXI.has(p.id), apps: p.season.apps, goals: p.season.goals })),
    form: (table.find((r) => r.id === id) || {}).form || [],
  };
}
function player({ id }) {
  need();
  const p = FM.S.players[id];
  if (!p) throw new Error('No such player');
  return {
    ...playerRow(p),
    fn: p.fn,
    ln: p.ln,
    born: p.born,
    foot: p.foot,
    side: p.side,
    alt: p.alt || {},
    attrs: Object.fromEntries(D.ATTRS.map((k) => [k, Math.round(p.attrs[k] * 10) / 10])),
    hidden: p.hid,
    traits: p.traits,
    personality: p.personality,
    arc: p.arc,
    positions: W.positionTable ? W.positionTable(p, 0.5).map((x) => ({ t: x.t, fam: x.fam, ovr: x.ovr })) : [],
    season: p.season,
    career: { apps: p.career.apps, goals: p.career.goals, spells: p.career.spells },
    history: p.history || [],
    loan: p.loan || null,
    value: p.value,
    wage: p.wage,
  };
}
function table({ comp }) {
  need();
  const c = FM.S.comps[comp];
  if (!c || !c.table) throw new Error('No table for that competition');
  return {
    name: c.name,
    rows: W.sortedTable(c).map((r, i) => ({
      pos: i + 1,
      id: r.id,
      name: clubName(r.id),
      p: r.p,
      w: r.w,
      d: r.d,
      l: r.l,
      gf: r.gf,
      ga: r.ga,
      gd: r.gd,
      pts: r.pts,
    })),
  };
}
function feed({ limit = 60, type }) {
  need();
  return FM.S.news
    .filter((n) => !type || n.type === type)
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      year: n.year,
      day: n.day,
      club: n.clubId,
      paper: n.paper,
    }));
}

// ---------- Scan: things that should not be ----------
function scan() {
  need();
  const S = FM.S;
  const out = [];
  const add = (check, list, fmt) => out.push({ check, n: list.length, examples: list.slice(0, 6).map(fmt) });
  const rows = Object.values(S.clubs).map(clubRow);
  for (const [name, f] of Object.entries(CLUB_FILTERS)) {
    const bad = rows.filter(f);
    add(
      `Clubs: ${name}`,
      bad,
      (r) =>
        `${r.name} (${r.comp}): squad ${r.squad}, bench ${r.bench}, keepers ${r.keepers}${r.keeper ? '' : ', no keeper in XI'}`,
    );
  }
  const all = Object.values(S.players).filter((p) => !p.retired);
  add(
    'Players: invalid attributes',
    all.filter((p) => !Number.isFinite(p.ca) || D.ATTRS.some((k) => !(p.attrs[k] >= 1 && p.attrs[k] <= 20.5))),
    (p) => `${pname(p)} (${p.id})`,
  );
  add(
    'Players: flat attribute spread (sd under 1)',
    all.filter((p) => playerRow(p).sd < 1),
    (p) => `${pname(p)}: ${W.posLabel(p)}, ca ${Math.round(p.ca)}`,
  );
  add(
    'Players: potential below ability',
    all.filter((p) => p.pa < p.ca - 0.5),
    (p) => `${pname(p)}: ca ${Math.round(p.ca)}, pa ${Math.round(p.pa)}`,
  );
  add(
    'Players: aged 40 or more and still playing',
    all.filter((p) => age(p) >= 40),
    (p) => `${pname(p)} (${age(p)}) at ${clubName(p.clubId)}`,
  );
  add(
    'Players: contract ended but still at a club',
    all.filter((p) => p.clubId && p.contract < S.year && !p.loan),
    (p) => `${pname(p)}: ${p.contract}, ${clubName(p.clubId)}`,
  );
  add(
    'Players: free agents of ability 65 or more',
    all.filter((p) => !p.clubId && p.ca >= 65),
    (p) => `${pname(p)}: ca ${Math.round(p.ca)}, age ${age(p)}`,
  );
  add(
    'Players: at a club that does not exist',
    all.filter((p) => p.clubId && !S.clubs[p.clubId]),
    (p) => `${pname(p)} → ${p.clubId}`,
  );
  const names = new Map();
  for (const p of all) names.set(pname(p), (names.get(pname(p)) || 0) + 1);
  add(
    'Players: two with the same name',
    [...names].filter(([, n]) => n > 1),
    ([n, k]) => `${n} ×${k}`,
  );
  add(
    'World: staff managing two clubs',
    (() => {
      const seen = new Map(),
        dup = [];
      for (const c of Object.values(S.clubs)) if (c.manager) seen.has(c.manager) ? dup.push(c) : seen.set(c.manager, c);
      return dup;
    })(),
    (c) => `${c.name}`,
  );
  add(
    'World: a league whose table does not match its clubs',
    W.leagues().filter((l) => l.table && Object.keys(l.table).length !== l.clubs.length),
    (l) => l.name,
  );
  return { year: S.year, day: S.day, checks: out };
}

// ---------- Playing days ----------
function playOneDay() {
  const S = FM.S;
  const fx = Sea.userFixture();
  if (fx && S.user && !S.user.sacked) Sea.applyUserMatch(FM.quickSim(fx, !!fx.ko));
  const summary = Sea.advance(null);
  if (!W.employed() && S.user.offers && S.user.offers.length) W.takeCharge(S.user.offers[0].id, 'Dev Manager', false);
  return summary;
}
function dayStats() {
  const S = FM.S;
  const players = Object.values(S.players).filter((p) => !p.retired);
  const full = players.filter((p) => p.clubId && S.clubs[p.clubId] && S.clubs[p.clubId].sim === 'full');
  return {
    injuredPct: full.length ? Math.round((1000 * full.filter((p) => p.inj).length) / full.length) / 10 : 0,
    freeAgents: players.filter((p) => !p.clubId).length,
    players: players.length,
    news: S.news.length,
  };
}
// Conditions to run until (checked after each day); each returns a description when it holds
const UNTIL = {
  seasonEnd: () => null, // handled by the summary
  hardFail: () => {
    for (const c of Object.values(FM.S.clubs)) {
      if (c.sim !== 'full') continue;
      const r = clubRow(c);
      if (!r.full || r.bench < 3 || r.keepers < 2)
        return `${c.name} cannot field a legal side (squad ${r.squad}, bench ${r.bench}, keepers ${r.keepers})`;
    }
    return null;
  },
  noKeeper: () => {
    for (const c of Object.values(FM.S.clubs))
      if (c.sim === 'full' && !xiOf(c).keeper) return `${c.name} has no keeper in goal`;
    return null;
  },
  bigDebt: () => {
    for (const c of Object.values(FM.S.clubs))
      if (c.sim === 'full' && c.balance < -8 * Sea.revenuePotential(c) - 5e7) return `${c.name} is in impossible debt`;
    return null;
  },
  injuryWave: () => {
    const s = dayStats();
    return s.injuredPct > 12 ? `${s.injuredPct}% of players are injured` : null;
  },
  userSacked: () => (FM.S.user.sacked ? 'the manager was sacked' : null),
};
function advance({ days = 1, until = null, maxDays = 400 }) {
  need();
  const S = FM.S;
  const played = [];
  let stopped = null,
    summary = null;
  const target = until === 'seasonEnd' ? maxDays : days;
  for (let i = 0; i < target; i++) {
    const cal = S.calendar[S.day] || {};
    const label = (() => {
      try {
        return Sea.dayLabel();
      } catch (e) {
        return cal.type;
      }
    })();
    const c0 = { ...counters },
      year = S.year,
      day = S.day,
      t0 = performance.now();
    summary = playOneDay();
    const ms = Math.round(performance.now() - t0);
    const rec = {
      year,
      day,
      type: cal.type || 'end',
      label,
      ms,
      matches: counters.matches - c0.matches,
      goals: counters.goals - c0.goals,
      transfers: counters.transfers - c0.transfers,
      ...dayStats(),
    };
    const hit = until && UNTIL[until] ? UNTIL[until]() : null;
    if (hit) {
      rec.flag = hit;
      stopped = hit;
    }
    if (!firstFailures.hard) {
      const h = UNTIL.hardFail();
      if (h) {
        firstFailures.hard = { year, day, text: h };
        rec.flag = rec.flag || h;
      }
    }
    timeline.push(rec);
    played.push(rec);
    if (i % 10 === 9) progress({ played: i + 1, of: target });
    if (summary || stopped) break;
  }
  if (timeline.length > 4000) timeline = timeline.slice(-4000);
  return { played: played.length, stopped, seasonEnded: !!summary, overview: overview(), recent: played.slice(-40) };
}

// ---------- Match lab ----------
function runMatches(h, a, n, comp, tHome, tAway) {
  const S = FM.S;
  const withTactic = (c, t, fn) => {
    if (!t || !Object.keys(t).length) return fn();
    const holder = W.isUser(c.id) ? S.user : c,
      old = holder.tactic;
    holder.tactic = W.newTactic(
      t.formation || old.formation,
      t.buildup || old.buildup,
      t.press || old.press,
      t.width || old.width,
    );
    try {
      return fn();
    } finally {
      holder.tactic = old;
    }
  };
  const hc = S.clubs[h],
    ac = S.clubs[a];
  const scores = {},
    acc = {
      hw: 0,
      d: 0,
      aw: 0,
      hg: 0,
      ag: 0,
      hxg: 0,
      axg: 0,
      hs: 0,
      as: 0,
      hsot: 0,
      asot: 0,
      yc: 0,
      rc: 0,
      zero: 0,
      pts: [],
      hp: 0,
    };
  for (let i = 0; i < n; i++) {
    const m = withTactic(hc, tHome, () => withTactic(ac, tAway, () => FM.quickSim({ h, a, comp }, false)));
    const r = m.result();
    acc.hg += r.hg;
    acc.ag += r.ag;
    acc.hxg += r.xg[0];
    acc.axg += r.xg[1];
    acc.hs += r.shots[0];
    acc.as += r.shots[1];
    acc.hsot += r.sot[0];
    acc.asot += r.sot[1];
    acc.hp += r.poss[0];
    acc.yc += r.cards.filter((c) => c.k === 'yellow').length;
    acc.rc += r.cards.filter((c) => c.k === 'red').length;
    if (r.hg === 0 && r.ag === 0) acc.zero++;
    r.hg > r.ag ? acc.hw++ : r.hg < r.ag ? acc.aw++ : acc.d++;
    acc.pts.push(r.hg > r.ag ? 3 : r.hg === r.ag ? 1 : 0);
    const k = `${r.hg}–${r.ag}`;
    scores[k] = (scores[k] || 0) + 1;
    if (i % 100 === 99) progress({ played: i + 1, of: n });
  }
  const mean = acc.pts.reduce((t, v) => t + v, 0) / n,
    sd = Math.sqrt(acc.pts.reduce((t, v) => t + (v - mean) ** 2, 0) / n);
  const pc = (x) => Math.round((1000 * x) / n) / 10,
    av = (x) => Math.round((100 * x) / n) / 100;
  return {
    n,
    home: pc(acc.hw),
    draw: pc(acc.d),
    away: pc(acc.aw),
    goalsHome: av(acc.hg),
    goalsAway: av(acc.ag),
    xgHome: av(acc.hxg),
    xgAway: av(acc.axg),
    shotsHome: av(acc.hs),
    shotsAway: av(acc.as),
    sotHome: av(acc.hsot),
    sotAway: av(acc.asot),
    possHome: av(acc.hp),
    yellows: av(acc.yc),
    reds: av(acc.rc),
    nilNil: pc(acc.zero),
    ppg: Math.round(mean * 1000) / 1000,
    ppgCI: Math.round((1.96 * sd * 1000) / Math.sqrt(n)) / 1000,
    scorelines: Object.entries(scores)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 10)
      .map(([k, v]) => [k, pc(v)]),
  };
}
function matchLab({ home, away, runs = 300, home2, away2 }) {
  need();
  const S = FM.S;
  if (!S.clubs[home] || !S.clubs[away]) throw new Error('Pick two clubs in the world');
  const n = Math.min(3000, Math.max(20, +runs));
  const comp = S.clubs[home].comp;
  // a match leaves traces on players (fitness, form): the world is put back exactly as it was
  const snap = JSON.stringify(FM.S);
  try {
    const a = runMatches(home, away, n, comp, null, null);
    const alt = home2 || away2 ? runMatches(home, away, n, comp, home2 || null, away2 || null) : null;
    return { home: clubRow(S.clubs[home]), away: clubRow(S.clubs[away]), base: a, alt };
  } finally {
    FM.S = FM.Save.relink(JSON.parse(snap));
    W.rosterVer++;
  }
}

// ---------- Save inspector ----------
function inspectSave({ b64 }) {
  if (!FM) boot(7);
  const text = toBytes(b64);
  const raw = JSON.parse(text);
  const sizes = Object.entries(raw)
    .map(([k, v]) => ({ key: k, bytes: JSON.stringify(v === undefined ? null : v).length }))
    .sort((a, b) => b.bytes - a.bytes);
  const total = text.length;
  const gz = zlib.gzipSync(Buffer.from(text, 'utf8')).length;
  const version = raw.version;
  const count = (o) => (o ? (Array.isArray(o) ? o.length : Object.keys(o).length) : 0);
  const info = {
    version,
    current: FM.SAVE_VERSION,
    bytes: total,
    gzip: gz,
    sections: sizes.slice(0, 14).map((s) => ({ ...s, pct: Math.round((1000 * s.bytes) / total) / 10 })),
    packedPlayers: !!raw.pz,
    counts: {
      players: raw.pz ? count(raw.players) : count(raw.players),
      clubs: count(raw.clubs),
      news: count(raw.news),
      archive: count(raw.archive),
      staff: count(raw.staff),
    },
    bytesPerPlayer: raw.players ? Math.round(JSON.stringify(raw.players).length / Math.max(1, count(raw.players))) : 0,
    year: raw.year,
    day: raw.day,
    migrations: [],
  };
  if (version > FM.SAVE_VERSION) return { ...info, error: 'Made by a newer version of the game' };
  if (version < (FM.Save.OLDEST || 4)) return { ...info, error: 'Too old to upgrade' };
  const keysBefore = new Set(Object.keys(raw));
  let up;
  try {
    up = FM.Save.unpack(text);
  } catch (e) {
    return { ...info, error: String(e.message || e) };
  }
  for (let v = version; v < FM.SAVE_VERSION; v++) info.migrations.push(`v${v} → v${v + 1}`);
  const after = up.state;
  info.after = {
    version: after.version,
    keysAdded: Object.keys(after).filter((k) => !keysBefore.has(k)),
    keysRemoved: [...keysBefore].filter((k) => !(k in after)),
    players: count(after.players),
  };
  // a round trip: pack the upgraded state, open it again, the same world comes back
  const again = FM.Save.unpack(FM.Save.pack(after)).state;
  info.roundTrip = {
    ok:
      count(again.players) === count(after.players) &&
      count(again.clubs) === count(after.clubs) &&
      again.year === after.year,
    players: count(again.players),
  };
  return info;
}

// ---------- Messages ----------
const CMDS = {
  newWorld,
  loadSave,
  loadDef,
  exportSave,
  overview,
  clubs,
  club,
  players,
  player,
  table,
  feed,
  scan,
  advance,
  matchLab,
  inspectSave,
};
process.on('message', (msg) => {
  const { id, cmd, args } = msg;
  try {
    if (cmd === 'timeline')
      return process.send({ id, ok: true, result: { timeline: timeline.slice(-1500), firstFailures } });
    if (cmd === 'ping') return process.send({ id, ok: true, result: { world: !!(FM && FM.S) } });
    const fn = CMDS[cmd];
    if (!fn) throw new Error('Unknown command');
    process.send({ id, ok: true, result: fn(args || {}) });
  } catch (e) {
    process.send({ id, ok: false, error: String(e && e.message ? e.message : e) });
  }
});
process.send && process.send({ ready: true });
