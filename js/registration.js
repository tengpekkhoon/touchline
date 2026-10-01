// Squad registration: each real league's rules on foreign players, simplified to what matters for squad building.
// England and Italy: a 25-man list of over-21s with at least 8 homegrown players (trained in the country for three
// years before 21). Spain and France: a cap on non-EU players. Italy: at most two non-EU signings from abroad a
// season. MLS: eight international slots. Brazil and Japan: a cap on foreigners in the matchday squad. Argentina,
// Mexico, Korea, Thailand and Turkey: a cap on registered foreigners.
// rules.reg === 'real' turns these on (new worlds); otherwise the one world-wide rules.foreignLimit applies.
(function () {
  const FM = window.FM,
    D = FM.D,
    W = FM.W;
  const R = (FM.Reg = {});

  R.EU = new Set(['FRA', 'ESP', 'POR', 'NED', 'GER', 'BEL', 'IRL', 'DEN', 'CRO', 'ITA', 'CZE', 'GRE', 'POL', 'AUT']);
  const HG = { squad: 25, hg: 8 };
  // By league id. domestic: nations that count as local; exempt: partner nations that don't use a foreign place
  R.RULES = {
    D1: HG,
    D2: HG,
    D3: HG,
    D4: HG,
    ES3: { nonEU: 3 },
    FR2: { nonEU: 4 },
    IT1: { ...HG, nonEUSign: 2 },
    ES1: { nonEU: 3 },
    ES2: { nonEU: 3 },
    FR1: { nonEU: 4 },
    US1: { foreign: 8 },
    BR1: { matchday: 9 },
    JP1: { matchday: 5, exempt: ['THA'] },
    AR1: { foreign: 6, matchday: 5 },
    MX1: { foreign: 9 },
    KR1: { foreign: 6 },
    TH1: { foreign: 7 },
    TR1: { foreign: 14 },
  };
  R.real = () => FM.S.rules.reg === 'real';
  R.rulesFor = (c) => (R.real() && c && c.comp && R.RULES[c.comp]) || null;

  R.isEU = (p) => R.EU.has(p.nat);
  R.isForeign = (p, c, r) => p.nat !== c.nat && !(r && r.exempt && r.exempt.includes(p.nat));
  // Homegrown for a nation: three seasons at its clubs between 15 and 21. Players created with the world have no
  // youth record, so they count as trained where they were born (or at the academy that produced them).
  R.homegrown = function (p, nat) {
    const S = FM.S,
      sp = p.career.spells;
    if (p.youth && S.clubs[p.youth] && S.clubs[p.youth].nat === nat) return true;
    if (!sp.length || sp[0].from - p.born > 18) return p.nat === nat;
    let yrs = 0;
    for (const s of sp) {
      const c = S.clubs[s.c];
      if (!c || c.nat !== nat) continue;
      const a = Math.max(s.from, p.born + 15),
        b = Math.min(s.to == null ? S.year : s.to, p.born + 21);
      if (b >= a) yrs += b - a + 1;
    }
    return yrs >= 3;
  };
  const senior = (p) => W.age(p) > 21;

  // Where a squad stands against its league's rules (loanees out don't count; loanees in do)
  R.status = function (c, without) {
    const r = R.rulesFor(c);
    if (!r) return null;
    const sq = W.squad(c.id).filter((p) => p.id !== without);
    const st = { r, n: sq.length };
    if (r.squad) st.nonHG = sq.filter((p) => senior(p) && !R.homegrown(p, c.nat)).length;
    if (r.nonEU) st.nonEU = sq.filter((p) => !R.isEU(p)).length;
    if (r.foreign) st.foreign = sq.filter((p) => R.isForeign(p, c, r)).length;
    if (r.nonEUSign) st.nonEUSigned = R.nonEUSigned(c);
    return st;
  };
  // Non-EU players this club has brought in from abroad this season (transfers and loans)
  R.nonEUSigned = (c) =>
    ((FM.S.seasonLog && FM.S.seasonLog.transfers) || []).filter(
      (t) => t.to === c.id && t.from && FM.S.clubs[t.from] && FM.S.clubs[t.from].nat !== c.nat && !R.EU.has(t.nat),
    ).length;
  // Could the club register this player? { ok, why }. st: a status from R.status, to check many candidates quickly
  R.canSign = function (c, p, st) {
    st = st || R.status(c, p.id);
    if (!st) return { ok: true };
    const r = st.r;
    if (r.squad && senior(p) && !R.homegrown(p, c.nat) && st.nonHG >= r.squad - r.hg)
      return {
        ok: false,
        why: `No room on the squad list: ${st.nonHG} of ${r.squad - r.hg} places for non-homegrown over-21s are taken.`,
      };
    if (r.nonEU && !R.isEU(p) && st.nonEU >= r.nonEU)
      return { ok: false, why: `All ${r.nonEU} non-EU places are taken.` };
    if (r.foreign && R.isForeign(p, c, r) && st.foreign >= r.foreign)
      return {
        ok: false,
        why: `All ${r.foreign} ${c.comp === 'US1' ? 'international slots' : 'foreign-player places'} are taken.`,
      };
    if (r.nonEUSign && !R.isEU(p) && p.clubId && FM.S.clubs[p.clubId].nat !== c.nat && st.nonEUSigned >= r.nonEUSign)
      return { ok: false, why: `The ${r.nonEUSign} non-EU signings from abroad allowed this season have been made.` };
    return { ok: true };
  };
  // World generation: a nationality for a new squad member that keeps the club within its league's rules.
  // made: [{ nat, age }] of the players generated so far; pick: draws a nationality from the league's mix
  R.genNat = function (club, made, age, pick) {
    const r = R.rulesFor(club);
    if (!r) return pick();
    const foreign = (n) => n !== club.nat && !(r.exempt && r.exempt.includes(n));
    for (let i = 0; i < 10; i++) {
      const n = pick();
      if (
        r.squad &&
        age > 21 &&
        n !== club.nat &&
        made.filter((x) => x.age > 21 && x.nat !== club.nat).length >= r.squad - r.hg
      )
        continue;
      if (r.nonEU && !R.EU.has(n) && made.filter((x) => !R.EU.has(x.nat)).length >= r.nonEU) continue;
      if (r.foreign && foreign(n) && made.filter((x) => foreign(x.nat)).length >= r.foreign) continue;
      return n;
    }
    return club.nat;
  };
  // Limits on the matchday squad (XI and bench) for W.pickXI: [{ f: counts against it, cap }]
  const limCache = new Map();
  R.matchdayLimits = function (club) {
    if (club.sim === 'nation') return [];
    if (!R.real()) {
      const cap = club.sim === 'full' ? FM.S.rules.foreignLimit : Infinity;
      return cap < W.NO_LIMIT ? [{ f: (p) => p.nat !== club.nat, cap }] : [];
    }
    const r = R.rulesFor(club);
    if (!r) return [];
    if (limCache.S !== FM.S) {
      limCache.clear();
      limCache.S = FM.S;
    }
    const key = club.id + '|' + club.comp;
    let out = limCache.get(key);
    if (!out) {
      out = [];
      // registration caps apply on matchday too: anyone over them can't have been registered
      if (r.nonEU) out.push({ f: (p) => !R.isEU(p), cap: r.nonEU });
      if (r.foreign) out.push({ f: (p) => R.isForeign(p, club, r), cap: r.foreign });
      if (r.matchday) out.push({ f: (p) => R.isForeign(p, club, r), cap: r.matchday });
      limCache.set(key, out);
    }
    return out;
  };
  // One line for the squad screen: "Non-EU 2/3", "Homegrown rule: 15/17 non-homegrown over-21s", ...
  R.summary = function (c) {
    const st = R.status(c);
    if (!st) return null;
    const r = st.r,
      bits = [];
    if (r.squad) bits.push(`non-homegrown over-21s ${st.nonHG}/${r.squad - r.hg}`);
    if (r.nonEU) bits.push(`non-EU ${st.nonEU}/${r.nonEU}`);
    if (r.foreign) bits.push(`${c.comp === 'US1' ? 'international slots' : 'foreigners'} ${st.foreign}/${r.foreign}`);
    if (r.nonEUSign) bits.push(`non-EU signings from abroad ${st.nonEUSigned}/${r.nonEUSign}`);
    if (r.matchday) bits.push(`max ${r.matchday} foreigners in a matchday squad`);
    return bits.join(' · ');
  };
  R.describe = function (compId) {
    const r = R.RULES[compId];
    if (!r) return 'No limit on foreign players.';
    const out = [];
    if (r.squad)
      out.push(
        `A ${r.squad}-man list of over-21s with at least ${r.hg} homegrown players (three seasons at the country's clubs between 15 and 21); under-21s are free.`,
      );
    if (r.nonEU) out.push(`At most ${r.nonEU} players from outside the EU.`);
    if (r.nonEUSign) out.push(`At most ${r.nonEUSign} non-EU signings from abroad each season.`);
    if (r.foreign)
      out.push(
        compId === 'US1'
          ? `${r.foreign} international slots for players from outside the USA.`
          : `At most ${r.foreign} foreign players registered.`,
      );
    if (r.matchday)
      out.push(
        `At most ${r.matchday} foreigners in a matchday squad${r.exempt ? ` (${r.exempt.map((n) => D.NATIONS[n].name).join(', ')} count as local)` : ''}.`,
      );
    return out.join(' ');
  };
})();
