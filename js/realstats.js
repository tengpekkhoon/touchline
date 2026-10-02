// Real-stats converter: a real player's numbers in (age, position, minutes, goals, assists, xG, passes, tackles, saves,
// the strength of his league ...), the game's attributes, current and potential ability out. Pure and deterministic (no
// random numbers, no save needed), so the world editor, club data packs and the historical importer all build on it.
//
//   FM.RealStats.convert({ pos: 'ST', age: 24, minutes: 2700, league: 'D1', goals: 18, xg: 15.2, ... })
//     → { pos, ca, pa, attrs, confidence, notes }
//
// How it works: every count is turned into a per-90 rate and compared with what is typical for his position group
// (z-scores against the reference table below: rough averages and spreads from public top-five-league data, good enough
// to rank players, not to quote). A position-weighted blend of those is his quality; the league's strength sets the
// baseline it is measured from, so a good player in a weak league comes out lower than the same numbers in a strong one.
// Few minutes pull everything back toward the baseline (little evidence). Attributes are the baseline level, moved up or
// down by the metrics that bear on each, then rescaled so the game's own ability formula gives back his ability.
(function () {
  const FM = window.FM,
    D = FM.D,
    W = FM.W,
    U = FM.U;
  const RS = (FM.RealStats = {});

  // ---------- Positions people write ----------
  const POS_ALIAS = {
    GK: 'GK',
    G: 'GK',
    GKP: 'GK',
    CB: 'CB',
    DC: 'CB',
    CD: 'CB',
    LCB: 'CB',
    RCB: 'CB',
    SW: 'CB',
    D: 'CB',
    FB: 'FB',
    LB: 'FB',
    RB: 'FB',
    DL: 'FB',
    DR: 'FB',
    WB: 'WB',
    LWB: 'WB',
    RWB: 'WB',
    DM: 'DM',
    CDM: 'DM',
    DMC: 'DM',
    HM: 'DM',
    CM: 'CM',
    MC: 'CM',
    M: 'CM',
    LM: 'WM',
    RM: 'WM',
    WM: 'WM',
    ML: 'WM',
    MR: 'WM',
    AM: 'AM',
    CAM: 'AM',
    AMC: 'AM',
    SS: 'AM',
    W: 'W',
    LW: 'W',
    RW: 'W',
    AML: 'W',
    AMR: 'W',
    ST: 'ST',
    CF: 'ST',
    FW: 'ST',
    F: 'ST',
    STC: 'ST',
  };
  RS.position = (s) =>
    POS_ALIAS[
      String(s || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
    ] || null;

  // ---------- The strength of a league (0–100) ----------
  // The game's own leagues use their top reputation band; anything else can be given as a number.
  RS.leagueStrength = function (league) {
    if (typeof league === 'number') return U.clamp(league, 0, 100);
    const l = (D.LEAGUES || []).find((x) => x.id === league || x.name === league || x.short === league);
    if (!l) return 50;
    // top of the league's band, lowered for each step down the pyramid
    const top = (l.repBand && l.repBand[0]) || 60;
    return U.clamp(top - (l.tier - 1) * 6, 10, 98);
  };
  // The ability an average regular is expected to have at that strength
  RS.baseline = (strength) => 34 + strength * 0.36;

  // ---------- What is typical, per 90 minutes, by position group: [mean, spread] ----------
  // gls goals · ast assists · xg · xa expected assists · sh shots · pas passes · pct pass completion % · kp key passes ·
  // tkl tackles · int interceptions · clr clearances · drb dribbles won · aer aerial duels won · prs pressures
  const REF = {
    ATT: {
      gls: [0.32, 0.22],
      ast: [0.15, 0.11],
      xg: [0.3, 0.2],
      xa: [0.14, 0.1],
      sh: [2.4, 1.2],
      pas: [22, 8],
      pct: [76, 6],
      kp: [1.2, 0.8],
      tkl: [0.7, 0.45],
      int: [0.4, 0.3],
      clr: [0.3, 0.3],
      drb: [1.4, 1.0],
      aer: [1.2, 1.0],
      prs: [12, 4],
    },
    MID: {
      gls: [0.1, 0.1],
      ast: [0.12, 0.09],
      xg: [0.1, 0.09],
      xa: [0.12, 0.09],
      sh: [1.1, 0.8],
      pas: [48, 14],
      pct: [86, 5],
      kp: [1.1, 0.8],
      tkl: [1.9, 0.8],
      int: [1.1, 0.6],
      clr: [0.8, 0.6],
      drb: [0.9, 0.7],
      aer: [1.1, 0.9],
      prs: [15, 4],
    },
    DEF: {
      gls: [0.04, 0.06],
      ast: [0.06, 0.07],
      xg: [0.05, 0.06],
      xa: [0.06, 0.06],
      sh: [0.5, 0.45],
      pas: [52, 16],
      pct: [86, 6],
      kp: [0.5, 0.5],
      tkl: [1.9, 0.8],
      int: [1.3, 0.7],
      clr: [3.2, 1.9],
      drb: [0.7, 0.6],
      aer: [2.4, 1.6],
      prs: [11, 4],
    },
    GK: {
      pas: [28, 10],
      pct: [70, 9],
      sav: [2.8, 0.9], // saves per 90
      svp: [70, 6], // save %
      cgp: [1.2, 0.35], // goals conceded per 90
      clr: [0.9, 0.6],
    },
  };
  // What each position group's quality is made of: the metrics that matter, with weights
  const QUALITY = {
    ATT: { gls: 3, xg: 2, ast: 1.5, xa: 1.5, kp: 1, drb: 1, sh: 0.5, pct: 0.5 },
    MID: { pas: 1, pct: 1.5, kp: 1.5, xa: 1.5, ast: 1, tkl: 1.5, int: 1, gls: 0.8, drb: 0.7, prs: 0.5 },
    DEF: { tkl: 2, int: 2, clr: 1.5, aer: 1.5, pct: 1.5, pas: 0.7, prs: 0.5, kp: 0.3 },
    GK: { svp: 3, cgp: -2, sav: 0.7, pct: 1, pas: 0.5 },
  };
  // Which metrics move which attribute (weights); a metric's z-score becomes a nudge to the attribute
  const ATTR_FROM = {
    finishing: { gls: 0.5, xg: 0.3, sh: 0.2 },
    dribbling: { drb: 0.8, ast: 0.2 },
    technique: { kp: 0.35, drb: 0.35, ast: 0.3 },
    passing: { pct: 0.5, pas: 0.3, kp: 0.2 },
    vision: { kp: 0.35, xa: 0.35, ast: 0.3 },
    tackling: { tkl: 0.7, int: 0.3 },
    positioning: { int: 0.4, clr: 0.2, xg: 0.4 },
    strength: { aer: 0.7, clr: 0.3 },
    workRate: { prs: 0.6, tkl: 0.4 },
    composure: { over: 0.6, pct: 0.4 }, // over = goals above what his chances were worth
    pace: { drb: 0.5, top: 0.5 }, // top = a measured top speed, when there is one
    stamina: { mins: 0.6, prs: 0.4 }, // mins = how much he plays
    reflexes: { svp: 0.7, sav: 0.3 },
    handling: { svp: 0.5, cgp: -0.3, clr: 0.2 },
  };
  const NUDGE = 1.7; // attribute points for one spread above typical
  const MAXNUDGE = 4;

  // ---------- The conversion ----------
  const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? null : +v);

  // The numbers as per-90 rates under the short metric names
  RS.rates = function (inp) {
    const mins = Math.max(90, num(inp.minutes) ?? (num(inp.matches) ? inp.matches * 80 : 1800));
    const pick = (...names) => {
      for (const n of names) if (num(inp[n]) != null) return num(inp[n]);
      return null;
    };
    const raw = {
      gls: pick('goals', 'gls'),
      ast: pick('assists', 'ast'),
      xg: pick('xg', 'xG'),
      xa: pick('xa', 'xA', 'xag'),
      sh: pick('shots', 'sh'),
      pas: pick('passes', 'pas', 'passesCompleted'),
      kp: pick('keyPasses', 'kp'),
      tkl: pick('tackles', 'tkl'),
      int: pick('interceptions', 'int'),
      clr: pick('clearances', 'clr'),
      drb: pick('dribbles', 'dribblesWon', 'drb'),
      aer: pick('aerials', 'aerialsWon', 'aer'),
      prs: pick('pressures', 'prs'),
      sav: pick('saves', 'sav'),
    };
    const r = {};
    for (const k in raw) if (raw[k] != null) r[k] = inp.per90 ? raw[k] : (raw[k] * 90) / mins;
    // percentages are not totals
    const pct = pick('passPct', 'passAccuracy', 'pct');
    if (pct != null) r.pct = pct <= 1 ? pct * 100 : pct;
    const svp = pick('savePct', 'svp');
    if (svp != null) r.svp = svp <= 1 ? svp * 100 : svp;
    const conceded = pick('goalsConceded', 'conceded', 'ga');
    if (conceded != null) r.cgp = inp.per90 ? conceded : (conceded * 90) / mins;
    if (r.gls != null && r.xg != null) r.over = r.gls - r.xg; // finishing above or below his chances
    const top = pick('topSpeed', 'sprintSpeed');
    if (top != null) r.top = top; // km/h
    r.mins = mins;
    return r;
  };

  RS.convert = function (inp) {
    const notes = [];
    const pos = RS.position(inp.pos) || RS.position(inp.position);
    if (!pos) throw new Error(`Unknown position "${inp.pos || inp.position}"`);
    const age = num(inp.age) ?? (num(inp.born) && num(inp.year) ? inp.year - inp.born : 25);
    const group = D.POS_GROUP[pos];
    const ref = REF[group];
    const strength = RS.leagueStrength(inp.league ?? 50);
    const base = RS.baseline(strength);
    const r = RS.rates(inp);
    // evidence: 0 with no minutes, 0.5 at 900, ~0.75 at 2700, near 1 over several seasons
    const conf = U.clamp(r.mins / (r.mins + 900), 0.05, 0.97);
    if (r.mins < 900)
      notes.push('Under 900 minutes: the numbers say little, so ability stays close to his league’s average.');

    // z-scores against the position group
    const z = {};
    for (const k in ref) if (r[k] != null) z[k] = U.clamp((r[k] - ref[k][0]) / ref[k][1], -3, 3);
    // quality: the weighted blend of the metrics there are
    let qs = 0,
      qw = 0;
    for (const [k, w] of Object.entries(QUALITY[group])) {
      if (z[k] == null) continue;
      qs += z[k] * w;
      qw += Math.abs(w);
    }
    let q = qw ? qs / qw : 0;
    if (!qw) notes.push('No usable performance numbers: ability is the league average.');
    // a match rating (0–10) is a second opinion
    const rating = num(inp.rating);
    if (rating != null) q = qw ? q * 0.7 + ((rating - 6.8) / 0.55) * 0.3 : (rating - 6.8) / 0.55;
    q = U.clamp(q, -2.5, 3);
    // ability: the baseline moved by quality, pulled back by how little there is to go on
    const ca = Math.round(U.clamp(base + q * 8 * conf, 22, 94));

    // attributes: every one the position asks for starts at the ability level, others a little lower; the metrics
    // that bear on an attribute then move it
    const w = D.POS_W[pos],
      b = ca / 5,
      a = {};
    const zz = Object.assign({}, z);
    if (r.over != null) zz.over = U.clamp(r.over / 0.12, -3, 3);
    if (r.top != null) zz.top = U.clamp((r.top - 33) / 1.6, -3, 3);
    zz.mins = U.clamp((Math.min(r.mins, 3400) - 1900) / 700, -2, 2);
    for (const k of D.ATTRS) {
      const wt = w[k] || 0;
      let v = wt >= 1.5 ? b + 1.2 : wt > 0 ? b : b - 2.5;
      if (pos !== 'GK' && (k === 'reflexes' || k === 'handling')) v = 2;
      if (pos === 'GK' && D.GK_OUTFIELD[k]) {
        const [lo, hi] = D.GK_OUTFIELD[k];
        a[k] = (lo + hi) / 2;
        continue;
      }
      const src = ATTR_FROM[k];
      if (src && !(pos !== 'GK' && (k === 'reflexes' || k === 'handling'))) {
        let s = 0,
          sw = 0;
        for (const [m, mw] of Object.entries(src)) {
          if (zz[m] == null) continue;
          s += zz[m] * mw;
          sw += Math.abs(mw);
        }
        if (sw) v += U.clamp((s / sw) * NUDGE * conf, -MAXNUDGE, MAXNUDGE);
      }
      a[k] = v;
    }
    // age: legs go first, then stamina; the young have not filled out
    if (pos !== 'GK') {
      if (age >= 31) a.pace -= (age - 30) * 0.45;
      if (age >= 33) a.stamina -= (age - 32) * 0.3;
      if (age <= 20) a.strength -= (21 - age) * 0.4;
      if (age >= 28) a.composure += Math.min(2, (age - 27) * 0.3);
    }
    if (inp.foot && !['Left', 'Right', 'Both'].includes(inp.foot)) notes.push(`Unknown foot "${inp.foot}"`);
    // pull the attribute set back so the game's own formula gives the ability it should
    const tmp = { attrs: a };
    for (let i = 0; i < 6; i++) {
      const diff = (ca - W.calcCA(tmp, pos)) / 5;
      if (Math.abs(diff) < 0.02) break;
      for (const k in w) a[k] = U.clamp(a[k] + diff, 1, 20);
    }
    for (const k of D.ATTRS) a[k] = Math.round(U.clamp(a[k], 1, 20) * 10) / 10;

    return {
      pos,
      ca: W.calcCA({ attrs: a }, pos),
      pa: RS.potential(ca, age, inp.pa),
      attrs: a,
      confidence: +conf.toFixed(2),
      notes,
    };
  };

  // Potential: what a player of this age and level can still become (a given value wins). Deterministic: the typical gap
  // the game's own generator uses, not a roll of the dice.
  const GAP = { 17: 12, 18: 11, 19: 9, 20: 8, 21: 6, 22: 5, 23: 4, 24: 3, 25: 2, 26: 1 };
  RS.potential = function (ca, age, given) {
    if (num(given) != null) return Math.round(U.clamp(given, ca, 96));
    const gap = age >= 27 ? 0 : (GAP[Math.max(17, age)] ?? 13);
    // the very good have less room above them
    const room = ca >= 85 ? 0.5 : ca >= 75 ? 0.75 : 1;
    return Math.round(U.clamp(ca + gap * room, ca, 96));
  };

  // ---------- Many rows at once (CSV text or an array of objects) ----------
  RS.parseCSV = function (text) {
    const rows = [];
    let cur = [],
      field = '',
      q = false;
    const t = String(text).replace(/\r\n?/g, '\n');
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) {
        if (c === '"' && t[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') {
        cur.push(field);
        field = '';
      } else if (c === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else field += c;
    }
    if (field.length || cur.length) {
      cur.push(field);
      rows.push(cur);
    }
    const head = (rows.shift() || []).map((h) => h.trim());
    return rows
      .filter((r) => r.some((x) => x.trim() !== ''))
      .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
  };
  // Row values arrive as text: numbers become numbers
  RS.clean = (row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v !== '' && !Number.isNaN(+v) ? +v : v === '' ? null : v]),
    );
})();
