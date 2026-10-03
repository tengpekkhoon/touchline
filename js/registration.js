// Squad registration: each real league's rules on foreign players, simplified to what matters for squad building.
// England and Italy: a 25-man list of over-21s with at least 8 homegrown players (trained in the country for three
// years before 21). Spain and France: a cap on non-EU players. Italy: at most two non-EU signings from abroad a
// season. MLS: eight international slots. Brazil and Japan: a cap on foreigners in the matchday squad. Argentina,
// Mexico, Korea, Thailand and Turkey: a cap on registered foreigners.
// Britain's Governing Body Endorsement (work permit) for England, Scotland and Wales; Germany's eight locally trained
// players; Spain and France count players from Cotonou-agreement and Euro-Med partner countries as EU-like for the
// non-EU limit.
// rules.reg === 'real' turns these on (new worlds); otherwise the one world-wide rules.foreignLimit applies.
(function () {
  const FM = window.FM,
    D = FM.D,
    W = FM.W;
  const R = (FM.Reg = {});

  R.EU = new Set([
    'FRA',
    'ESP',
    'POR',
    'NED',
    'GER',
    'BEL',
    'IRL',
    'DEN',
    'CRO',
    'ITA',
    'CZE',
    'GRE',
    'POL',
    'AUT',
    'HUN',
  ]);
  // Nations whose players Spanish and French clubs do not count against the non-EU limit: the Cotonou Agreement's
  // African, Caribbean and Pacific states, and the Euro-Mediterranean partners
  R.COTONOU = new Set(['NGA', 'GHA', 'SEN', 'CIV']);
  R.EUROMED = new Set(['MAR']);
  const HG = { squad: 25, hg: 8 };
  // By league id. domestic: nations that count as local; exempt: partner nations that don't use a foreign place
  R.RULES = {
    D1: { ...HG, permit: true },
    D2: { ...HG, permit: true },
    D3: { ...HG, permit: true },
    D4: { ...HG, permit: true },
    SC1: { permit: true },
    WA1: { permit: true },
    DE1: { ...HG },
    DE2: { ...HG },
    ES3: { nonEU: 3, quasi: true },
    FR2: { nonEU: 4, quasi: true },
    IT1: { ...HG, nonEUSign: 2 },
    ES1: { nonEU: 3, quasi: true },
    ES2: { nonEU: 3, quasi: true },
    FR1: { nonEU: 4, quasi: true },
    AU1: { foreign: 5 }, // five visa players
    US1: { foreign: 8 },
    BR1: { matchday: 9 },
    JP1: { matchday: 5, exempt: ['THA'] },
    AR1: { foreign: 6, matchday: 5 },
    MX1: { foreign: 9 },
    KR1: { foreign: 6 },
    TH1: { foreign: 7 },
    TR1: { foreign: 14 },
  };
  // In words: what a league's registration rules ask of a squad (for the new-career screen and the rules pages)
  R.describe = function (id) {
    const r = R.RULES[id];
    if (!r) return ['No foreign-player limits: a club can field and register any number of foreign players.'];
    const nm = (code) => (D.NATIONS[code] ? D.NATIONS[code].name : code);
    const out = [];
    if (r.squad)
      out.push(
        `A ${r.squad}-player squad list of players over 21, at least ${r.hg} of them homegrown (three seasons at the nation's clubs between 15 and 21). Under-21s do not count against the list.`,
      );
    if (r.permit)
      out.push(
        "Work permits: a player from outside the British Isles needs a Governing Body Endorsement (EU players too since Brexit) unless he already plays or has played in Britain. It is automatic once he has played 30% (top-10 nation) to 70% (up to 70th) of his national team's games in two years; otherwise he needs 15 points from those games and his club minutes, weighted by his league. An exceptional talent is endorsed regardless.",
      );
    if (r.nonEU)
      out.push(
        `At most ${r.nonEU} non-EU players${r.quasi ? ' (players from Cotonou-agreement and Euro-Med partner countries count as EU)' : ''}.`,
      );
    if (r.nonEUSign) out.push(`No more than ${r.nonEUSign} non-EU signings from abroad in a season.`);
    if (r.foreign)
      out.push(`At most ${r.foreign} ${id === 'US1' ? 'international slots' : 'foreign players'} on the books.`);
    if (r.matchday) out.push(`No more than ${r.matchday} foreign players in a matchday squad.`);
    if (r.exempt) out.push(`Players from ${r.exempt.map(nm).join(', ')} do not count as foreign.`);
    return out;
  };
  R.real = () => FM.S.rules.reg === 'real';
  R.rulesFor = (c) => (R.real() && c && c.comp && R.RULES[c.comp]) || null;

  R.isEU = (p) => R.EU.has(p.nat);
  // Does he count against the non-EU limit at this club? (Spain and France exempt Cotonou and Euro-Med nationals)
  R.nonEUNat = (nat, club) => {
    if (R.EU.has(nat)) return false;
    const r = club && R.rulesFor(club);
    return !(r && r.quasi && (R.COTONOU.has(nat) || R.EUROMED.has(nat)));
  };
  R.nonEU = (p, club) => R.nonEUNat(p.nat, club);
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
    if (r.nonEU) st.nonEU = sq.filter((p) => R.nonEU(p, c)).length;
    if (r.foreign || r.matchday) st.foreign = sq.filter((p) => R.isForeign(p, c, r)).length;
    if (r.nonEUSign) st.nonEUSigned = R.nonEUSigned(c);
    return st;
  };
  // Non-EU players this club has brought in from abroad this season (transfers and loans)
  R.nonEUSigned = (c) =>
    ((FM.S.seasonLog && FM.S.seasonLog.transfers) || []).filter(
      (t) => t.to === c.id && t.from && FM.S.clubs[t.from] && FM.S.clubs[t.from].nat !== c.nat && !R.EU.has(t.nat),
    ).length;
  // Could the club register this player? { ok, why }. st: a status from R.status, to check many candidates quickly
  // Work permits in Britain (the Governing Body Endorsement, as the Football Association applies it since Brexit): every
  // player from outside the British Isles needs one, from the EU as well, unless he already plays or has played in
  // Britain. Two ways through.
  //  1. Automatic: he has played enough of his national team's games over the last two years, the share depending on
  //     where that team stands in the world ranking: 30% for the top ten, 40% to 20th, 50% to 30th, 60% to 50th,
  //     70% to 70th. Teams outside the top 70 have no automatic route.
  //  2. Points: 15 needed. Up to 8 for those international games (in proportion to the share required), and up to 8
  //     for minutes at his club(s) over two seasons, counted at what the league he plays in is worth: a regular in a
  //     top league scores most, one in a weak league little.
  // A player rated far above the league's best is endorsed as an exceptional talent whatever his numbers.
  R.UK = new Set(['ENG', 'SCO', 'WAL', 'IRL']);
  let rankCache = { key: null, map: null };
  const natRank = (code) => {
    const s = FM.S,
      key = `${s.year}-${s.day}`;
    if (rankCache.key !== key || rankCache.S !== s) {
      rankCache = { key, S: s, map: {} };
      if (s.nteams) FM.Intl.ranked().forEach((t, i) => (rankCache.map[t.code] = i));
    }
    return rankCache.map[code] ?? 99;
  };
  R.permitNeeded = (p) => {
    const cl = FM.S.clubs;
    return (
      !R.UK.has(p.nat) &&
      !(p.clubId && cl[p.clubId] && R.UK.has(cl[p.clubId].nat)) &&
      !p.career.spells.some((sp) => cl[sp.c] && R.UK.has(cl[sp.c].nat))
    );
  };
  // The share of his national team's games he played in the last two years that the automatic route asks for
  R.gbeShare = (rank) =>
    rank < 10 ? 0.3 : rank < 20 ? 0.4 : rank < 30 ? 0.5 : rank < 50 ? 0.6 : rank < 70 ? 0.7 : null;
  R.gbe = function (p, c) {
    const S = FM.S,
      rank = natRank(p.nat),
      need = R.gbeShare(rank);
    const by = (p.intl && p.intl.by) || {},
      games = (S.intlGames && S.intlGames[p.nat]) || {};
    const y = S.year;
    const recentCaps = (by[y] || 0) + (by[y - 1] || 0) || (p.intl && !p.intl.by ? Math.min(p.intl.caps || 0, 10) : 0);
    const teamGames = (games[y] || 0) + (games[y - 1] || 0) || 20; // (a new world has no record yet: a normal two years)
    const share = Math.min(1, recentCaps / teamGames);
    const out = { rank, need, share, intl: 0, club: 0, points: 0, auto: false, exceptional: false };
    out.intl = Math.min(8, Math.round((8 * share) / (need ?? 0.7))); // (a team outside the top 70 is judged against 70%)
    out.auto = need != null && share >= need;
    // minutes over two seasons at a share of the club's games, counted at the league's worth next to the top flight's
    const sp = p.season || {},
      last = (p.history || []).slice(-1)[0],
      mins = (sp.mins || (sp.apps || 0) * 75) + ((last && (last.mins || (last.apps || 0) * 75)) || 0); // (no minutes recorded: about 75 a game)
    const comp = p.clubId && S.clubs[p.clubId] && S.clubs[p.clubId].comp;
    const rounds = ((comp && S.comps[comp] && S.comps[comp].clubs.length) || 20) * 2 - 2;
    const minShare = Math.min(1, mins / (rounds * 2 * 90 * 0.9));
    const top = W.leagueLevel('D1'),
      here = comp ? W.leagueLevel(comp) : top - 12;
    out.club = Math.round(8 * minShare * U.clamp((here - 30) / (top - 30), 0.2, 1));
    out.points = out.intl + out.club;
    out.exceptional = p.ca >= W.leagueLevel(c.comp) + 14;
    out.ok = out.auto || out.points >= R.PERMIT_NEED || out.exceptional;
    return out;
  };
  const U = FM.U;
  R.PERMIT_NEED = 15;
  R.canSign = function (c, p, st) {
    st = st || R.status(c, p.id);
    if (!st) return { ok: true };
    const r = st.r;
    if (r.permit && R.permitNeeded(p)) {
      const g = R.gbe(p, c);
      if (!g.ok)
        return {
          ok: false,
          why: `No work permit (Governing Body Endorsement): ${g.need == null ? `${D.NATIONS[p.nat].name} are outside the top 70, so there is no automatic route` : `he has played ${Math.round(g.share * 100)}% of ${D.NATIONS[p.nat].name}'s games in two years and ${Math.round(g.need * 100)}% would be automatic`}; on points he has ${g.points} of the ${R.PERMIT_NEED} needed (${g.intl} for international games, ${g.club} for his minutes).`,
        };
    }
    if (r.squad && senior(p) && !R.homegrown(p, c.nat) && st.nonHG >= r.squad - r.hg)
      return {
        ok: false,
        why: `No room on the squad list: ${st.nonHG} of ${r.squad - r.hg} places for non-homegrown over-21s are taken.`,
      };
    if (r.nonEU && R.nonEU(p, c) && st.nonEU >= r.nonEU)
      return { ok: false, why: `All ${r.nonEU} non-EU places are taken.` };
    if (r.foreign && R.isForeign(p, c, r) && st.foreign >= r.foreign)
      return {
        ok: false,
        why: `All ${r.foreign} ${c.comp === 'US1' ? 'international slots' : 'foreign-player places'} are taken.`,
      };
    // a matchday cap needs a squad to match: at most five more foreigners than the matchday allows
    if (r.matchday && !r.foreign && R.isForeign(p, c, r) && st.foreign >= r.matchday + 5)
      return { ok: false, why: `Too many foreign players for the ${r.matchday}-a-matchday rule.` };
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
      if (r.nonEU && R.nonEUNat(n, club) && made.filter((x) => R.nonEUNat(x.nat, club)).length >= r.nonEU) continue;
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
      if (r.nonEU) out.push({ f: (p) => R.nonEU(p, club), cap: r.nonEU });
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
    if (r.permit) bits.push('work permits for players from outside the British Isles');
    if (r.matchday) bits.push(`max ${r.matchday} foreigners in a matchday squad`);
    return bits.join(' · ');
  };
  // Your squad against the rules: each limit you are over, with the players in that group (weakest first)
  R.over = function (c) {
    const st = R.status(c);
    if (!st) return [];
    const r = st.r,
      sq = W.squad(c.id),
      out = [];
    const add = (label, cap, f) => {
      const ps = sq.filter(f).sort((a, b) => a.ca - b.ca);
      if (ps.length > cap) out.push({ label, cap, n: ps.length, players: ps });
    };
    if (r.squad) add('non-homegrown over-21s', r.squad - r.hg, (p) => senior(p) && !R.homegrown(p, c.nat));
    if (r.nonEU) add('non-EU players', r.nonEU, (p) => R.nonEU(p, c));
    if (r.foreign)
      add(c.comp === 'US1' ? 'international players' : 'foreign players', r.foreign, (p) => R.isForeign(p, c, r));
    return out;
  };
  // Days to the registration deadline: the last day of the transfer window (null while it is shut)
  R.deadlineIn = () => (FM.Season.windowOpen() ? FM.Market.daysLeft() : null);
  // At the deadline your squad is registered within the rules: players you chose to leave out go first, then the
  // weakest in each group over its limit. Anyone left out can't play until the next window's deadline.
  R.registerSquad = function (c) {
    for (const p of W.squad(c.id)) delete p.unreg;
    const out = [];
    for (const g of R.over(c)) {
      let excess = g.n - g.cap;
      const order = g.players.slice().sort((a, b) => (b.leaveOut ? 1 : 0) - (a.leaveOut ? 1 : 0) || a.ca - b.ca);
      for (const p of order) {
        if (excess <= 0) break;
        if (p.unreg) {
          excess--;
          continue;
        }
        p.unreg = true;
        out.push(p);
        excess--;
      }
    }
    for (const p of W.squad(c.id)) delete p.leaveOut;
    if (out.length)
      FM.News.add({
        type: 'club',
        title: `Squad registered: ${out.length} left out`,
        body: `Over the league's limits at the deadline, so these players can't play until the next window closes: ${out.map((p) => W.name(p)).join(', ')}.`,
        clubId: c.id,
        big: true,
      });
    return out;
  };
})();
