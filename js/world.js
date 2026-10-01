// World generation + player/club model helpers.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D;
  const W = (FM.W = {});

  // ---------------- Player model ----------------
  W.age = (p) => FM.S.year - p.born;
  W.name = (p) => `${p.fn} ${p.ln}`;
  W.short = (p) => `${p.fn[0]}. ${p.ln}`;
  const slotPos = (t) => (t === 'WB' ? 'FB' : t);

  W.calcCA = function (p, pos = p.pos) {
    const w = D.POS_W[slotPos(pos)];
    let s = 0,
      t = 0;
    for (const k in w) {
      s += p.attrs[k] * w[k];
      t += w[k];
    }
    return Math.round((s / t) * 5);
  };
  W.refresh = function (p) {
    p.ca = W.calcCA(p);
    if (p.pa < p.ca) p.pa = p.ca; // generation rounding can nudge ability past potential
    p.value = W.value(p);
  };
  // Market value: what the player is worth on the market (fees, asking prices, release clauses, scouting).
  // The ability-and-age base (W.baseValue, which wages follow) scaled by where he plays, how much he is wanted and
  // his form: a player at a big club in a strong league costs more than the same player in a small league.
  W.value = function (p) {
    return Math.max(10000, U.roundMoney(W.baseValue(p) * W.marketFactor(p) * W.interestFactor(p) * W.formFactor(p)));
  };
  let leagueTop = null; // the top of each league's reputation band: how strong the league is
  W.marketFactor = function (p) {
    const c = p.clubId && FM.S.clubs[p.clubId];
    if (!c) return 0.8;
    leagueTop = leagueTop || Object.fromEntries(D.LEAGUES.map((l) => [l.id, l.repBand[0]]));
    const top = leagueTop[c.comp] || 60;
    return U.clamp((0.75 + (c.rep - 50) * 0.012) * (0.85 + (top - 60) * 0.008), 0.55, 1.5);
  };
  // Transfer interest: every rumour or bid adds to it; it halves each season
  W.interest = (p) => (p.buzz ? p.buzz * 0.5 ** (FM.S.year - (p.buzzY || FM.S.year)) : 0);
  W.addInterest = function (p, n = 1) {
    p.buzz = Math.round((W.interest(p) + n) * 100) / 100;
    p.buzzY = FM.S.year;
  };
  W.interestFactor = (p) => 1 + Math.min(0.3, W.interest(p) * 0.06);
  // Recent form (last matches' ratings): ±10–15%
  W.formFactor = (p) => (p.form && p.form.length >= 4 ? 1 + U.clamp((U.avg(p.form) - 6.7) * 0.15, -0.1, 0.15) : 1);
  W.baseValue = function (p) {
    const age = W.age(p);
    let v = 1000 * Math.pow(1.13, p.ca);
    if (age <= 21) v *= 1.2 + Math.max(0, p.pa - p.ca) / 30;
    else if (age <= 24) v *= 1.1 + Math.max(0, p.pa - p.ca) / 60;
    else if (age >= 31) v *= 0.4;
    else if (age >= 29) v *= 0.7;
    const yrs = Math.max(0, p.contract - FM.S.year);
    if (yrs <= 0) v *= 0.35;
    else if (yrs === 1) v *= 0.7;
    if (p.hid.cons >= 15) v *= 1.05;
    return v;
  };
  W.stars = (ca) => U.clamp(Math.round(((ca - 30) / 55) * 10) / 2, 0.5, 5); // 0.5–5
  // How well a player fits a slot (0–1): his natural position's table, or a second position he has learned
  // (p.alt). Given the slot itself, its side counts on the flanks: a full-back or wing-back is at home on the side
  // of his stronger foot, a winger too unless his role cuts inside (inv), when he wants the other flank.
  W.SIDE_FIT = 0.93; // full-back or wing-back on his weaker side
  W.SIDE_FIT_W = 0.95; // winger on the side his role doesn't want
  W.fitAt = (p, slotType, slot, role) => {
    let f = (D.FIT[p.pos] && D.FIT[p.pos][slotType]) || (p.pos === slotType ? 1 : 0.4);
    if (p.alt && p.alt[slotType] > f) f = p.alt[slotType];
    if (slot && p.foot !== 'Both' && (slotType === 'FB' || slotType === 'WB' || slotType === 'W')) {
      const side = D.slotSide(slot);
      if (side) {
        const strong = p.foot === 'Left' ? 'L' : 'R';
        const inv = slotType === 'W' && role && (D.ROLES.W[role] || {}).inv;
        if ((side === strong) === !!inv) f *= slotType === 'W' ? W.SIDE_FIT_W : W.SIDE_FIT;
      }
    }
    return f;
  };
  // Second positions: a third of outfield players start with one (a few with two) from the positions next to
  // theirs; playing there teaches it (Sea.learnPositions)
  W.genAlt = function (p) {
    if (p.pos === 'GK' || Math.random() > 0.35) return;
    const near = Object.keys(D.FIT[p.pos] || {}).filter((t) => t !== p.pos);
    const n = Math.random() < 0.25 ? 2 : 1;
    U.shuffle(near)
      .slice(0, n)
      .forEach((t) => ((p.alt = p.alt || {})[t] = Math.round(U.rand(0.86, 0.97) * 100) / 100));
  };
  W.effAt = function (p, slotType, slot, role) {
    const fit = W.fitAt(p, slotType, slot, role);
    return W.calcCA(p, slotType) * (0.62 + 0.38 * fit) * (0.8 + 0.2 * (p.fitness / 100)) * (0.95 + p.morale / 1000);
  };
  W.available = (p) => !p.inj && !p.susp && !p.retired;
  // Selection weight for match fitness: fresh players are preferred, tired ones rested
  W.fitnessPick = (p) => {
    const f = p.fitness;
    return f >= 90 ? 1 : f >= 75 ? 1 - (90 - f) * 0.008 : 0.88 - (75 - f) * 0.016;
  };
  W.hasTrait = (p, t) => p.traits.includes(t);
  W.personality = function (h) {
    if (h.prof >= 16 && h.amb >= 13) return 'Model Professional';
    if (h.loy >= 16) return 'Loyal Servant';
    if (h.amb >= 16 && h.loy <= 8) return 'Mercenary';
    if (h.lead >= 16) return 'Born Leader';
    if (h.temp <= 5) return 'Volatile';
    if (h.prof <= 6) return 'Laid Back';
    if (h.amb >= 16) return 'Ambitious';
    if (h.prof >= 15) return 'Professional';
    return 'Balanced';
  };
  W.moraleLabel = (m) =>
    m >= 85
      ? ['Superb', '😁']
      : m >= 70
        ? ['Good', '🙂']
        : m >= 50
          ? ['Okay', '😐']
          : m >= 30
            ? ['Poor', '😕']
            : ['Very Poor', '😠'];

  function genAttrs(pos, nat, target) {
    const b = target / 5,
      w = D.POS_W[pos],
      bias = D.NATIONS[nat].bias,
      a = {};
    for (const k of D.ATTRS) {
      const wt = w[k] || 0;
      let mean = wt >= 1.5 ? b + 1.2 : wt > 0 ? b : b - 2.5;
      if ((k === 'reflexes' || k === 'handling') && pos !== 'GK') mean = U.rand(1, 4);
      if (pos === 'GK' && ['dribbling', 'finishing', 'tackling', 'vision', 'technique'].includes(k)) mean = b - 4;
      a[k] = U.clamp(U.gauss(mean, 1.8) + (bias[k] || 0) * (pos === 'GK' && !wt ? 0.3 : 1), 1, 20);
    }
    const tmp = { attrs: a };
    for (let i = 0; i < 4; i++) {
      const diff = (target - W.calcCA(tmp, pos)) / 5;
      for (const k in w) a[k] = U.clamp(a[k] + diff, 1, 20);
    }
    return a;
  }

  function genTraits(p) {
    const h = p.hid,
      t = [];
    if (h.inj >= 16) t.push('Injury Prone');
    if (h.loy >= 16) t.push('Loyal');
    else if (h.amb >= 15 && h.loy <= 7) t.push('Mercenary');
    if (h.lead >= 16) t.push('Leader');
    if (h.temp <= 4) t.push('Temperamental');
    if (h.big >= 17) t.push('Big Game Player');
    if (h.cons >= 17) t.push('Consistent');
    if (U.chance(0.08)) t.push('Late Bloomer');
    if (U.chance(0.07)) t.push('Media Friendly');
    if (U.chance(0.05)) t.push('Derby Specialist');
    if (U.chance(0.06)) t.push('Fair-Weather');
    if (p.attrs.dribbling >= 14 && U.chance(0.25)) t.push('Flair');
    return U.shuffle(t).slice(0, 3);
  }

  // Every full name in the world (active + retired legends), rebuilt when a different save is loaded
  let nameSet = null,
    nameWorld = null;
  W.nameTaken = function (n) {
    if (nameWorld !== FM.S) {
      nameWorld = FM.S;
      nameSet = new Set(
        Object.values(FM.S.players || {})
          .map((q) => `${q.fn} ${q.ln}`)
          .concat((FM.S.retired || []).map((r) => `${r.fn} ${r.ln}`)),
      );
    }
    return nameSet.has(n);
  };
  W.claimName = (n) => {
    W.nameTaken(n);
    nameSet.add(n);
  };
  const REAL_NAMES = new Set([
    'Nuno Mendes',
    'Enzo Fernández',
    'Cristian Romero',
    'Lisandro Martínez',
    'Nahuel Molina',
    'Harvey Barnes',
    'Piotr Zieliński',
    'Rúben Dias',
    'Bernardo Silva',
    'Kevin De Bruyne',
    'Erling Haaland',
    'Martin Ødegaard',
    'Luka Modrić',
    'Christian Pulisic',
    'Achraf Hakimi',
    'Sadio Mané',
    'Mohammed Kudus',
    'Thomas Müller',
    'Joshua Kimmich',
    'Florian Wirtz',
    'Leroy Sané',
    'Arda Güler',
    'Hakan Çalhanoğlu',
    'Dušan Tadić',
    'Sergej Milinković-Savić',
    'Filip Kostić',
    'Nemanja Matić',
    'Emil Forsberg',
    'Gerard Moreno',
    'Pau Torres',
    'Fernando Torres',
    'Raúl García',
    'Diego López',
    'Íñigo Martínez',
    'Marcos Alonso',
    'Carlos Soler',
    'Mikel Merino',
    'Jordi Alba',
    'David Villa',
    'David Silva',
    'Unai Simón',
    'Mikel Oyarzabal',
    'Álvaro Morata',
    'Dani Olmo',
    'Borja Iglesias',
    'Nacho Fernández',
    'Jon Guridi',
    'Aitor Paredes',
    'Luis Suárez',
    'Luis Díaz',
    'Juan Cuadrado',
    'Christian Eriksen',
    'Bruno Fernandes',
    'Rui Patrício',
    'Joel Matip',
    'Ryan Gravenberch',
    'Tyler Adams',
    'Josh Sargent',
    'Harry Wilson',
    'Tom Lockyer',
    'Andrew Robertson',
    'Scott McTominay',
    'Kevin Mbabu',
    'Ante Budimir',
    'Marco Asensio',
    'Kenji Watanabe',
    'Leandro Paredes',
    'Nicolás Otamendi',
    'Lucas Ocampos',
    'Rodrigo De Paul',
    'Kasper Dolberg',
    'Christian Nørgaard',
    'Mats Hummels',
    'Luca Waldschmidt',
    'Leon Goretzka',
    'Kai Havertz',
    'Paul Pogba',
    'Louis Saha',
    'Noah Okafor',
    'Theo Walcott',
    'Jack Wilshere',
    'Harry Maguire',
    'Henry Onyekuru',
    'Sergio Ramos',
    'Kyle Walker',
    'Emiliano Martínez',
    'Lautaro Martínez',
    'Nicolás González',
    'Julián Álvarez',
    'Lucas Silva',
    'Thiago Silva',
    'Gabriel Jesus',
    'Rodrigo Moreno',
    'Dani Carvajal',
    'Marcos Llorente',
    'Hugo Ekitike',
    'Jordan Henderson',
    'Harry Kane',
    'Declan Rice',
    'Mason Mount',
    'Luke Shaw',
    'Aaron Ramsdale',
    'Kieran Trippier',
    'Callum Wilson',
    'Conor Gallagher',
    'Wataru Endo',
    'Takumi Minamino',
    'Daichi Kamada',
    'Min-jae Kim',
    'Kylian Mbappé',
    'Theo Hernández',
    'Victor Osimhen',
    'Samuel Chukwueze',
    'Dušan Vlahović',
    'Aleksandar Mitrović',
    'Nikola Milenković',
    'Chanathip Songkrasin',
    'Theerathon Bunmathan',
    'Javier Hernández',
    'Hirving Lozano',
    'Raúl Jiménez',
    'Andrés Guardado',
    'Guillermo Ochoa',
    'Héctor Herrera',
    'Edson Álvarez',
    'Carlos Vela',
    'Rafael Márquez',
    'Jesús Corona',
    'Diego Lainez',
    'Orbelín Pineda',
    'Uriel Antuna',
    'Santiago Giménez',
    'César Montes',
    'Julián Quiñones',
    'Alexis Vega',
    'Luis Romo',
    'Luis Chávez',
    'Jorge Sánchez',
    'Carlos Rodríguez',
    'Héctor Moreno',
    'Miguel Layún',
  ]);
  W.genPlayer = function ({ nat, pos, age, ca, pa, clubId = null, youthClub = null }) {
    const N = D.NATIONS[nat];
    const hid = {};
    ['cons', 'inj', 'prof', 'amb', 'loy', 'temp', 'big', 'lead'].forEach(
      (k) => (hid[k] = Math.round(U.clamp(U.gauss(11, 4), 1, 20))),
    );
    const p = {
      id: FM.nextId('p'),
      fn: U.pick(N.fn),
      ln: U.pick(N.ln),
      nat,
      born: FM.S.year - age,
      pos,
      foot: U.chance(0.72) ? 'Right' : U.chance(0.85) ? 'Left' : 'Both',
      attrs: genAttrs(pos, nat, ca),
      pa: Math.round(U.clamp(pa, ca, 96)),
      ca: 0,
      value: 0,
      morale: U.randi(60, 80),
      form: [],
      fitness: 100,
      inj: null,
      susp: 0,
      wage: 0,
      contract: FM.S.year + U.randi(1, 4),
      traits: [],
      hid,
      clubId,
      youth: youthClub,
      season: W.blankSeason(),
      career: { apps: 0, goals: 0, spells: [] },
      cult: 0,
      derbyGoals: 0,
    };
    W.genAlt(p);
    // Unique names (and never a famous real player). Retry combinations, then fall back to a second surname.
    let tries = 0;
    while ((REAL_NAMES.has(`${p.fn} ${p.ln}`) || W.nameTaken(`${p.fn} ${p.ln}`)) && tries++ < 60) {
      p.fn = U.pick(N.fn);
      p.ln = U.pick(N.ln);
    }
    while (REAL_NAMES.has(`${p.fn} ${p.ln}`) || W.nameTaken(`${p.fn} ${p.ln}`)) {
      const second = U.pick(N.ln.filter((x) => x !== p.ln));
      p.ln = D.TWO_SURNAMES.includes(nat) ? `${p.ln.split(' ')[0]} ${second}` : `${p.ln.split('-')[0]}-${second}`;
    }
    W.claimName(`${p.fn} ${p.ln}`);
    p.traits = genTraits(p);
    p.personality = W.personality(hid);
    // Plausible prior career for older players (so "600 games" veterans can exist)
    const yrs = Math.max(0, age - 18);
    p.career.apps = Math.round(yrs * U.rand(18, 34));
    p.career.goals = Math.round(
      p.career.apps * ({ ST: 0.35, W: 0.2, AM: 0.18, CM: 0.07, DM: 0.03 }[pos] || 0.02) * U.rand(0.5, 1.4),
    );
    W.refresh(p);
    p.wage = W.wageFor(p);
    FM.Season.assignArc(p, age); // hidden career arc: most players have none
    if (clubId) W.startSpell(p, clubId);
    return p;
  };
  // A season's numbers. From fully simulated matches also minutes, shots, key passes, tackles and passes, clean
  // sheets, and for keepers saves, goals conceded and the xG of the shots they faced.
  W.blankSeason = () => ({
    apps: 0,
    goals: 0,
    ast: 0,
    rsum: 0,
    motm: 0,
    yc: 0,
    rc: 0,
    mins: 0,
    sh: 0,
    sot: 0,
    kp: 0,
    tk: 0,
    pas: 0,
    cs: 0,
    sv: 0,
    ga: 0,
    xga: 0,
    yapps: 0,
    ic: 0,
  });
  W.STAT_KEYS = Object.keys(W.blankSeason());
  // One history row per season and club from a season's numbers ({ y, c, apps, g, a, r, ... })
  W.seasonRow = (y, c, st) => ({
    y,
    c,
    apps: st.apps,
    g: st.goals,
    a: st.ast,
    r: st.apps ? +(st.rsum / st.apps).toFixed(2) : 0,
    mins: st.mins,
    sh: st.sh,
    kp: st.kp,
    tk: st.tk,
    ic: st.ic,
    cs: st.cs,
    sv: st.sv,
    ga: st.ga,
    xga: Math.round(st.xga * 10) / 10,
    motm: st.motm,
    yc: st.yc,
    rc: st.rc,
  });
  // The season's rows: a player who moved mid-season (a transfer, a loan, back from loan) gets one per club
  W.seasonRows = function (p, y) {
    const rows = [];
    let prev = W.blankSeason();
    const diff = (a, b) => Object.fromEntries(W.STAT_KEYS.map((k) => [k, (a[k] || 0) - (b[k] || 0)]));
    for (const sp of p.splits || []) {
      const d = diff(sp.s, prev);
      if (d.apps > 0) rows.push(W.seasonRow(y, sp.c, d));
      prev = sp.s;
    }
    const last = diff(p.season, prev);
    if (last.apps > 0) rows.push(W.seasonRow(y, p.clubId, last));
    return rows;
  };
  W.wageFor = (p) => Math.max(750, Math.round((W.baseValue(p) * 0.0035) / 50) * 50); // wages follow ability and age, not market swings
  W.startSpell = function (p, clubId) {
    // a move in the middle of a season: remember the numbers so far, for a history row with the old club
    if (p.clubId && p.clubId !== clubId && p.season && p.season.apps > 0)
      (p.splits = p.splits || []).push({ c: p.clubId, s: { ...p.season } });
    p.clubId = clubId;
    const fresh = sqIdx.S === FM.S && sqIdx.ver === W.rosterVer;
    W.rosterVer++;
    if (fresh) {
      const b = (sqIdx.by[clubId] = sqIdx.by[clubId] || []);
      if (!b.includes(p)) b.push(p);
      sqIdx.ver = W.rosterVer; // still complete: squads filter out anyone who has since left
    }
    p.career.spells.push({ c: clubId, from: FM.S.year, to: null, apps: 0, goals: 0 });
  };
  W.spell = (p) => p.career.spells[p.career.spells.length - 1];
  // Your player: at your club or at your B team (whose players belong to you)
  W.ownPlayer = (p) => !!(p && p.clubId) && W.isUser(FM.Youth ? FM.Youth.owner(p.clubId) : p.clubId);
  // Move a player within a club family (a parent and its B team): no transfer, no new career spell
  W.moveWithin = function (p, clubId) {
    p.clubId = clubId;
    const fresh = sqIdx.S === FM.S && sqIdx.ver === W.rosterVer;
    W.rosterVer++;
    if (fresh) {
      const b = (sqIdx.by[clubId] = sqIdx.by[clubId] || []);
      if (!b.includes(p)) b.push(p);
      sqIdx.ver = W.rosterVer;
    }
  };

  function randomPos(counts) {
    const out = [];
    for (const k in counts) for (let i = 0; i < counts[k]; i++) out.push(k);
    return out;
  }
  const SQUAD = D.SQUAD_TIER.full;
  // Squad size an AI club aims for, by simulation tier
  W.squadTarget = (c) => U.sum(Object.values(D.SQUAD_TIER[c.sim] || SQUAD)) + 2;
  // How far short of his prime a generated player is at each age (ability peaks ~26–30)
  const AGE_GAP = {
    18: 12,
    19: 10.5,
    20: 9,
    21: 7,
    22: 5,
    23: 3.5,
    24: 2.2,
    25: 1.2,
    26: 0.5,
    27: 0,
    28: 0,
    29: 0,
    30: 0.3,
    31: 1,
    32: 2,
    33: 3,
    34: 4,
    35: 5,
    36: 6,
    37: 7,
  };
  // Squad ages follow the shape the simulated world settles into over many seasons (so a new world doesn't
  // carry an age bulge that ages through it for a decade). Keepers skew older: they mature later and play on longer.
  const AGES = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
  const AGE_W = { 18: 3, 19: 3, 20: 3, 21: 4.5, 30: 3.8, 31: 3.4, 32: 3, 33: 2.2, 34: 1.5, 35: 0.9, 36: 0.4, 37: 0 };
  function pickAge(pos) {
    if (pos === 'GK') return U.wpick(AGES, (a) => (a < 21 ? 1.5 : a <= 24 ? 4 : a <= 33 ? 5 : a <= 35 ? 2.5 : 1));
    return U.wpick(AGES, (a) => AGE_W[a] ?? 5);
  }
  // Potential of a generated player: roughly how far he is from his prime at this age (AGE_GAP), with a spread
  // that is wider the younger he is. Centring it on the ageing curve keeps the next generation's elite about as
  // strong as today's; a flat bonus (up to +30) made every generation outgrow the last.
  W.potentialFor = function (ca, age) {
    const gap = age >= 26 ? AGE_GAP[Math.min(age, 26)] || 0 : AGE_GAP[Math.max(18, age)] + Math.max(0, 18 - age) * 2;
    return ca + Math.max(0, Math.round(gap + U.gauss(0, 1.5 + gap * 0.4)));
  };
  W.levelFor = (rep) => 25 + rep * 0.58;
  // Ability of an unattached player the world invents (a new world's free agents, a thin summer market): mostly
  // lower-league standard; only rarely someone good enough for a top flight
  // Free agents the world generates (world start, summer top-up): mostly journeymen; a genuinely good one is rare
  W.freeAgentCA = () => (Math.random() < 0.01 ? U.randi(60, 70) : Math.round(U.clamp(U.gauss(42, 6), 30, 56)));

  // Nationality for a new player at a club: league mix where one exists, mostly local elsewhere
  W.natFor = function (club) {
    const mix = club.comp && D.NAT_MIX[club.comp];
    if (mix) return D.pickNat(mix);
    return Math.random() < 0.88 ? club.nat : U.pick(Object.keys(D.NATIONS));
  };
  W.youthNat = (club) =>
    D.YOUTH_MIX[club.nat]
      ? D.pickNat(D.YOUTH_MIX[club.nat])
      : Math.random() < 0.95
        ? club.nat
        : U.pick(Object.keys(D.NATIONS));

  function genSquad(club) {
    const lvl = W.levelFor(club.rep);
    const positions = randomPos(D.SQUAD_TIER[club.sim] || SQUAD);
    const made = []; // nationality and age of each player so far: the squad starts within its league's rules
    const nat = (age, pick) => {
      const n = FM.Reg.genNat(club, made, age, pick);
      made.push({ nat: n, age });
      return n;
    };
    positions.forEach((pos, i) => {
      // a B team is a young side: mostly 18 to 23, with a few older heads
      const age = club.parent ? (Math.random() < 0.85 ? U.randi(18, 23) : U.randi(24, 27)) : pickAge(pos);
      const starter = i % 2 === 0;
      let ca = Math.round(
        U.clamp(
          U.gauss(lvl + (starter ? 3 : -4) - AGE_GAP[pos === 'GK' ? Math.round(20 + (age - 20) * 0.7) : age], 4),
          30,
          92,
        ),
      );
      const p = W.genPlayer({
        nat: nat(age, () => W.natFor(club)),
        pos,
        age,
        ca,
        pa: W.potentialFor(ca, age),
        clubId: club.id,
      });
      FM.S.players[p.id] = p;
    });
    // Academy prospects
    for (let i = 0; i < (D.ACADEMY_TIER[club.sim] ?? 2); i++) {
      const age = U.randi(17, 19),
        pos = U.pick(['CB', 'CM', 'W', 'ST', 'FB', 'AM']);
      const ca = Math.round(lvl - U.randi(12, 20));
      const p = W.genPlayer({
        nat: nat(age, () => W.youthNat(club)),
        pos,
        age,
        ca,
        pa: ca + U.randi(15, 35),
        clubId: club.id,
        youthClub: club.id,
      });
      FM.S.players[p.id] = p;
    }
  }

  // Squads come from an index rebuilt whenever someone joins a club (W.startSpell bumps rosterVer).
  // Leavers, retirees and deleted players are filtered out on read, so the index never goes stale.
  let sqIdx = { S: null, ver: -1, by: null };
  W.rosterVer = 0;
  W.squad = function (clubId) {
    const S = FM.S;
    if (sqIdx.S !== S || sqIdx.ver !== W.rosterVer) {
      const by = {};
      for (const id in S.players) {
        const p = S.players[id];
        if (p.clubId) (by[p.clubId] = by[p.clubId] || []).push(p);
      }
      sqIdx = { S, ver: W.rosterVer, by };
    }
    return (sqIdx.by[clubId] || []).filter((p) => p.clubId === clubId && !p.retired && S.players[p.id] === p);
  };

  // ---------------- Staff ----------------
  W.genStaff = function (role, nat = 'ENG', extra = {}) {
    const N = D.NATIONS[nat];
    const s = {
      id: FM.nextId('s'),
      role,
      fn: U.pick(N.fn),
      ln: U.pick(N.ln),
      nat,
      age: U.randi(34, 64),
      personality: U.pick(D.STAFF_PERSONALITY),
      ability: U.randi(8, 17),
      ...extra,
    };
    if (s.role === 'Scout' && !s.regions) Object.assign(s, W.scoutProfile(nat, s.ability));
    s.wage = s.wage || W.staffWage(s);
    s.contract = s.contract || FM.S.year + U.randi(1, 3);
    FM.S.staff[s.id] = s;
    return s;
  };
  W.staffWage = (s) => Math.round((200 + Math.pow(s.judge || s.ability, 2.4) * 9) / 50) * 50;
  // A scout knows their home region best, neighbouring regions a little
  W.scoutProfile = function (nat, ability) {
    const home = D.NATIONS[nat].region;
    const regions = {};
    for (const r in D.REGIONS)
      regions[r] = U.clamp(U.rand(0.15, 0.5) + (r === home ? 0.45 : 0) + (r === 'ENG' ? 0.1 : 0), 0.1, 0.97);
    const second = U.pick(Object.keys(D.REGIONS).filter((r) => r !== home));
    regions[second] = Math.max(regions[second], U.rand(0.55, 0.8));
    const judge = U.clamp(Math.round(ability + U.randi(-2, 2)), 6, 19);
    const best = Object.keys(regions).sort((a, b) => regions[b] - regions[a]);
    return {
      regions,
      judge,
      note: `Strongest in ${D.REGIONS[best[0]]}${regions[best[1]] > 0.6 ? ' and ' + D.REGIONS[best[1]] : ''}. Weak in ${D.REGIONS[best[best.length - 1]]}.`,
    };
  };
  // Staff available for hire (refreshed each season and during windows)
  W.refreshStaffPool = function () {
    const S = FM.S;
    (S.staffPool || []).forEach((id) => {
      if (!Object.values(S.user.staff).includes(id) && !S.user.scouts.includes(id)) delete S.staff[id];
    });
    const roles = [
      'Assistant Manager',
      'First-Team Coach',
      'Head of Analytics',
      'Head Physio',
      'Sporting Director',
      'Scout',
      'Scout',
      'Scout',
      'Scout',
    ];
    S.staffPool = [];
    roles.forEach((r) => {
      for (let i = 0; i < 2; i++) {
        const nat = U.pick(Object.keys(D.NATIONS));
        const st = W.genStaff(r, nat, { ability: Math.round(U.clamp(U.gauss(12, 3.5), 5, 20)) });
        if (r === 'Scout') (Object.assign(st, W.scoutProfile(nat, st.ability)), (st.wage = W.staffWage(st)));
        S.staffPool.push(st.id);
      }
    });
  };
  W.userStaff = () =>
    Object.values(FM.S.user.staff)
      .map((id) => FM.S.staff[id])
      .concat(FM.S.user.scouts.map((id) => FM.S.staff[id]))
      .filter(Boolean);
  W.staffAbility = (key) => {
    const id = FM.S.user.staff[key];
    return id && FM.S.staff[id] ? FM.S.staff[id].ability : 6;
  };

  // ---------------- Tactics ----------------
  W.defaultRoles = (formation) => D.FORMATIONS[formation].map((s) => Object.keys(D.ROLES[s.t])[0]);
  // How an AI club sets up: formation from the usual mix, build-up from its identity, big clubs press high.
  // Used for new worlds and every new manager alike, so the world's tactical mix (and its goals per game) stays
  // steady over long saves instead of drifting toward a uniform, more open mix as managers come and go.
  W.AI_FORMATIONS = {
    '4-3-3': 2,
    '4-2-3-1': 2,
    '4-4-2': 1,
    '3-5-2': 0.8,
    '5-3-2': 0.6,
    '4-1-4-1': 0.8,
    '4-4-1-1': 0.6,
    '3-4-2-1': 0.6,
    '4-1-2-1-2': 0.3,
    '4-3-1-2': 0.3,
    '5-4-1': 0.4,
  };
  W.aiTactic = (c) =>
    W.newTactic(
      U.wpick(Object.keys(W.AI_FORMATIONS), (f) => W.AI_FORMATIONS[f]),
      { fan: 'Short', giant: 'Possession', oil: 'Possession', youth: 'Short' }[c.identity] ||
        (c.rep < 60 ? 'Counter' : U.pick(D.BUILDUP)),
      c.rep > 75 ? 'High Press' : U.pick(D.PRESS),
      U.wpick(D.WIDTH, (w) => (w === 'Balanced' ? 3 : 1)),
    );
  W.newTactic = (formation = '4-3-3', buildup = 'Short', press = 'Mid Block', width = 'Balanced') => ({
    formation,
    buildup,
    press,
    width,
    roles: W.defaultRoles(formation),
    invFB: false,
    lineup: null,
  });
  // The user's second tactic (Plan B), made on first use from the first one; it has its own familiarity
  W.secondTactic = function () {
    const u = FM.S.user;
    if (!u.tactic2) {
      u.tactic2 = JSON.parse(JSON.stringify(u.tactic));
      u.tactic2.fam = Math.round((u.tactic.fam ?? 55) * 0.6);
      u.tactic2.lineup = null;
    }
    return u.tactic2;
  };
  // Swap: Plan B becomes the tactic you start with. Captain and set-piece takers stay with the team, not the plan.
  W.swapTactics = function () {
    const u = FM.S.user,
      a = u.tactic,
      b = W.secondTactic();
    for (const k of ['capt', 'captAuto', 'sp']) {
      b[k] = a[k];
      delete a[k];
    }
    u.tactic = b;
    u.tactic2 = a;
    const c = W.userClub();
    if (c) c.tactic = u.tactic;
  };
  // Weather on the day, by the home side's climate and the time of the season (the calendar runs August–May)
  W.weatherFor = function (club) {
    const f = FM.S.calendar && FM.S.calendar.length ? FM.S.day / FM.S.calendar.length : 0.5,
      nat = club && club.nat,
      C = D.CLIMATE,
      winter = f > 0.3 && f < 0.7,
      edge = f < 0.15 || f > 0.85;
    const w = { Clear: 0.55, Cloudy: 0.2, Rain: 0.2, Snow: 0, Hot: 0 };
    if (C.wet.includes(nat)) w.Rain = 0.3;
    if (C.warm.includes(nat) || C.tropical.includes(nat)) w.Rain = 0.12;
    if (C.cold.includes(nat) && winter) w.Snow = 0.12;
    if (C.tropical.includes(nat)) w.Hot = winter ? 0.15 : 0.35;
    else if (C.warm.includes(nat) && edge) w.Hot = 0.3;
    const k = U.wpick(Object.keys(w), (x) => w[x]);
    return D.WEATHER.find((x) => x[0] === k);
  };

  // Picks an XI (respecting a saved user lineup when valid) and a bench
  W.NO_LIMIT = 99; // rules.foreignLimit value for "no limit on foreign players"
  W.foreignLimitText = () =>
    FM.S.rules.reg === 'real'
      ? "each league's own rules"
      : FM.S.rules.foreignLimit >= W.NO_LIMIT
        ? 'no limit'
        : `max ${FM.S.rules.foreignLimit}`;
  W.pickXI = function (clubId, tactic, squad) {
    const slots = D.FORMATIONS[tactic.formation];
    const club = FM.clubOf(clubId);
    let pool = (squad || (club.sim === 'nation' ? FM.Intl.squad(club.code) : W.squad(clubId))).filter(W.available);
    // Youth-side players (U21, U18) only step up when the first-team squad is short
    if (club.sim !== 'nation' && pool.some((p) => p.team)) {
      const first = pool.filter((p) => !p.team);
      pool =
        first.length >= 16
          ? first
          : first.concat(
              pool
                .filter((p) => p.team)
                .sort((a, b) => b.ca - a.ca)
                .slice(0, 16 - first.length),
            );
    }
    // Registration rules: caps on foreign (or non-EU) players in the matchday squad, XI and bench (FM.Reg)
    const lims = FM.Reg.matchdayLimits(club);
    const limited = (p) => lims.some((l) => l.f(p));
    const over = (list) => lims.some((l) => list.filter((p) => p && l.f(p)).length > l.cap);
    const used = new Set();
    const xi = new Array(slots.length).fill(null);
    if (tactic.lineup) {
      tactic.lineup.forEach((pid, i) => {
        const p = FM.S.players[pid];
        if (p && p.clubId === clubId && W.available(p) && !used.has(pid) && i < slots.length) {
          xi[i] = p;
          used.add(pid);
        }
      });
    }
    const order = slots
      .map((s, i) => i)
      .sort(
        (a, b) =>
          ['GK', 'ST', 'CB', 'DM', 'CM', 'FB', 'WB', 'W', 'AM'].indexOf(slots[a].t) -
          ['GK', 'ST', 'CB', 'DM', 'CM', 'FB', 'WB', 'W', 'AM'].indexOf(slots[b].t),
      );
    for (const i of order) {
      if (xi[i]) continue;
      let best = null,
        bv = -1;
      for (const p of pool) {
        if (used.has(p.id)) continue;
        if (slots[i].t === 'GK' ? p.pos !== 'GK' : p.pos === 'GK') continue;
        // a loanee his parent club insisted should play gets the benefit of the doubt
        const v =
          W.effAt(p, slots[i].t, slots[i], tactic.roles && tactic.roles[i]) *
          W.fitnessPick(p) *
          (p.loan && p.loan.promised ? 1.1 : 1);
        if (v > bv) {
          bv = v;
          best = p;
        }
      }
      if (!best) best = pool.find((p) => !used.has(p.id));
      if (best) {
        xi[i] = best;
        used.add(best.id);
      }
    }
    // Your club: improve the quick pick by swapping players between positions, or bringing in an unused player,
    // while the team's total fit rises (players you placed yourself stay put). AI clubs keep the quick pick: it runs
    // thousands of times a day and the match balance is calibrated on it.
    if (W.isUser(clubId)) {
      const locked = new Set(
        (tactic.lineup || []).map((pid, i) => (xi[i] && xi[i].id === pid ? i : -1)).filter((i) => i >= 0),
      );
      const val = (p, i) =>
        !p || (slots[i].t === 'GK') !== (p.pos === 'GK')
          ? 0
          : W.effAt(p, slots[i].t, slots[i], tactic.roles && tactic.roles[i]) * W.fitnessPick(p);
      for (let pass = 0, better = true; better && pass < 4; pass++) {
        better = false;
        for (let i = 0; i < slots.length; i++) {
          if (locked.has(i)) continue;
          for (let j = i + 1; j < slots.length; j++) {
            if (locked.has(j)) continue;
            if (val(xi[j], i) + val(xi[i], j) > val(xi[i], i) + val(xi[j], j) + 1e-9) {
              [xi[i], xi[j]] = [xi[j], xi[i]];
              better = true;
            }
          }
          for (const q of pool) {
            if (used.has(q.id) || val(q, i) <= val(xi[i], i) + 1e-9) continue;
            if (xi[i]) used.delete(xi[i].id);
            used.add(q.id);
            xi[i] = q;
            better = true;
          }
        }
      }
    }
    // Over a limit: take out the limited starter whose best unlimited replacement costs the least at his position,
    // until the XI is within every limit (so the cap costs a little quality, not a keeper at wing-back)
    const slotVal = (p, i) =>
      !p || (slots[i].t === 'GK') !== (p.pos === 'GK') ? 0 : W.effAt(p, slots[i].t) * W.fitnessPick(p);
    while (lims.length && over(xi)) {
      let pick = null;
      xi.forEach((p, i) => {
        if (!p || !lims.some((l) => l.f(p) && xi.filter((q) => q && l.f(q)).length > l.cap)) return;
        const sub = pool
          .filter((q) => !used.has(q.id) && !limited(q))
          .reduce((b, q) => (slotVal(q, i) > slotVal(b, i) ? q : b), null);
        const loss = slotVal(p, i) - slotVal(sub, i) + (sub ? 0 : 1e6);
        if (!pick || loss < pick.loss) pick = { i, sub, loss };
      });
      if (!pick || !pick.sub) break; // no domestic player left to bring in
      used.delete(xi[pick.i].id);
      used.add(pick.sub.id);
      xi[pick.i] = pick.sub;
    }
    const left = lims.map((l) => l.cap - xi.filter((p) => p && l.f(p)).length);
    // Bench: a keeper, then cover for defence, midfield and attack, then the best of the rest (within the limits)
    const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => b.ca - a.ca);
    const bench = [];
    const add = (p) => {
      if (!p || bench.includes(p) || bench.length >= 9 || lims.some((l, k) => l.f(p) && left[k] <= 0)) return;
      bench.push(p);
      lims.forEach((l, k) => l.f(p) && left[k]--);
    };
    add(rest.find((p) => p.pos === 'GK'));
    for (const g of ['DEF', 'MID', 'ATT']) add(rest.find((p) => D.POS_GROUP[p.pos] === g));
    for (const p of rest) if (p.pos !== 'GK') add(p);
    for (const p of rest) add(p); // a second keeper only if places are left
    return { xi, bench };
  };

  // ---------------- Competitions ----------------
  W.roundRobin = function (ids) {
    const t = U.shuffle(ids);
    if (t.length % 2) t.push(null);
    const n = t.length,
      rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const rd = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i],
          b = t[n - 1 - i];
        if (a && b) rd.push(r % 2 ? [a, b] : [b, a]);
      }
      rounds.push(rd);
      t.splice(1, 0, t.pop());
    }
    const second = rounds.map((rd) => rd.map(([h, a]) => [a, h]));
    return rounds.concat(second);
  };

  W.setupSeasonFixtures = function (comp) {
    comp.table = {};
    comp.clubs.forEach(
      (id) =>
        (comp.table[id] = {
          p: 0,
          w: 0,
          d: 0,
          l: 0,
          gf: 0,
          ga: 0,
          pts: comp.deductions?.[id] ? -comp.deductions[id] : 0,
          form: [],
        }),
    );
    comp.deductions = {};
    let rounds = W.roundRobin(comp.clubs);
    if (comp.rules && comp.rules.rounds) rounds = rounds.slice(0, comp.rules.rounds); // formats shorter than a double round-robin
    comp.fixtures = rounds.map((rd, r) =>
      rd.map(([h, a]) => ({ id: FM.nextId('f'), comp: comp.id, round: r, h, a, res: null })),
    );
    comp.playoff = null;
  };

  W.sortedTable = function (comp) {
    return Object.entries(comp.table)
      .map(([id, r]) => ({ id, ...r, gd: r.gf - r.ga }))
      .sort(
        (a, b) =>
          b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || FM.clubOf(a.id).name.localeCompare(FM.clubOf(b.id).name),
      );
  };
  W.position = (clubId) => {
    const c = FM.S.clubs[clubId];
    return W.sortedTable(FM.S.comps[c.comp]).findIndex((r) => r.id === clubId) + 1;
  };

  W.leagues = () => Object.values(FM.S.comps).filter((c) => c.type === 'league');
  W.cups = () => Object.values(FM.S.comps).filter((c) => c.type === 'cup');
  W.continentals = () => Object.values(FM.S.comps).filter((c) => c.type === 'continental');

  W.worldCups = () => Object.values(FM.S.comps).filter((c) => c.type === 'world');
  W.simOf = (compId) => (FM.S.comps[compId] && FM.S.comps[compId].sim) || 'full';

  // The season has as many league days as the longest league has rounds (S.rounds). Every league spreads its own
  // rounds evenly across them, so a 38-round and a 46-round league both start in August and finish in May.
  // Calendar events were designed on a 22-round season; W.scaleRound / W.baseRound convert between the two.
  W.scaleRound = (r) => Math.round((r * ((FM.S.rounds || 22) - 1)) / 21);
  W.baseRound = (r) => Math.round((r * 21) / ((FM.S.rounds || 22) - 1));
  W.dayScale = () => 21 / ((FM.S.rounds || 22) - 1); // per-day rates tuned on 22 league days
  // A league's own round on league day r (-1: it doesn't play that day), its fixtures, and rounds before day r
  W.roundOn = (c, r) => (c.onDay ? (c.onDay[r] ?? -1) : r);
  W.roundFixtures = (c, r) => {
    const k = W.roundOn(c, r);
    return k >= 0 ? c.fixtures[k] || null : null;
  };
  W.roundsBefore = (c, r) => {
    if (!c.onDay) return Math.min(r, c.fixtures.length);
    let n = 0;
    for (let i = 0; i < r && i < c.onDay.length; i++) if (c.onDay[i] >= 0) n++;
    return n;
  };

  // League days with midweek cup, continental, Club World Cup and international days slotted in between.
  // Two-legged knockouts add a second leg day; tournament summers append the finals at the end.
  W.buildCalendar = function () {
    const S = FM.S,
      rounds = Math.max(...W.leagues().map((c) => c.fixtures.length));
    S.rounds = rounds;
    for (const c of W.leagues()) {
      const n = c.fixtures.length;
      c.onDay = Array(rounds).fill(-1);
      for (let k = 0; k < n; k++) c.onDay[n > 1 ? Math.round((k * (rounds - 1)) / (n - 1)) : 0] = k;
    }
    const at = (map) => {
      const out = {};
      for (const [k, v] of Object.entries(map)) {
        let r = W.scaleRound(+k);
        while (out[r] !== undefined) r++;
        out[r] = v;
      }
      return out;
    };
    const CC = at(D.CC_AFTER),
      CWC = at(D.CWC_AFTER),
      INTL = at(D.INTL_AFTER);
    // Domestic cup days: enough rounds for the biggest cup (byes even out the first round), spread through the season
    const biggest = Math.max(2, ...W.cups().map((c) => FM.Cups.entrants(c).length));
    const cupDays = Math.max(Object.keys(D.CUP_AFTER).length, Math.ceil(Math.log2(biggest)));
    const CUP = {},
      c0 = W.scaleRound(1),
      c1 = W.scaleRound(19);
    for (let i = 0; i < cupDays; i++) {
      let r = Math.round(c0 + (i * (c1 - c0)) / Math.max(1, cupDays - 1));
      while (CUP[r]) r++;
      CUP[r] = 'DC';
    }
    const legs = !!S.rules.twoLegs;
    const cal = [];
    for (let i = 0; i < D.PRESEASON_DAYS; i++) cal.push({ type: 'pre', idx: i });
    for (let r = 0; r < rounds; r++) {
      cal.push({ type: 'league', round: r });
      let st = CC[r];
      if (st && !legs) st = /2$/.test(st) && st !== 'G2' ? null : st.replace(/^(QF|SF)1$/, '$1');
      if (st && W.continentals().length) cal.push({ type: 'cup', comps: W.continentals().map((c) => c.id), stage: st });
      if (CWC[r] && W.worldCups().length)
        cal.push({ type: 'cup', comps: W.worldCups().map((c) => c.id), stage: CWC[r], world: true });
      if (CUP[r] && W.cups().length) cal.push({ type: 'cup', comps: W.cups().map((c) => c.id) });
      if (INTL[r] && S.nteams) INTL[r].forEach((tag) => cal.push({ type: 'intl', tag }));
    }
    if (legs)
      cal.push({ type: 'playoff', stage: 'SF1' }, { type: 'playoff', stage: 'SF2' }, { type: 'playoff', stage: 'F' });
    else cal.push({ type: 'playoff', stage: 'SF' }, { type: 'playoff', stage: 'F' });
    // International tournament finals in the summer at the end of this season
    if (S.nteams && FM.Intl.tournamentFor(S.year))
      FM.Intl.tournamentStages(S.year).forEach((stage) => cal.push({ type: 'tourn', stage }));
    return cal;
  };

  // ---------------- New world ----------------
  W.newWorld = function (opts) {
    FM.S = {
      version: FM.SAVE_VERSION,
      nextId: 1,
      year: opts.startYear || D.SEASON_START, // groundwork for saves that start in a past season
      day: 0,
      players: {},
      clubs: {},
      comps: {},
      staff: {},
      news: [],
      archive: [],
      retired: [],
      rules: {
        win: opts.win || 3,
        subs: opts.subs || 5,
        foreignLimit: opts.foreignLimit ?? W.NO_LIMIT, // like the real Premier League: no cap unless chosen
        reg: opts.reg === undefined ? 'real' : opts.reg, // 'real': each league's own registration rules (FM.Reg)
        twoLegs: opts.twoLegs ?? true,
        awayGoals: !!opts.awayGoals,
      },
      user: null,
      settings: FM.S?.settings || { theme: 'dark', speed: 1 },
    };
    const S = FM.S;
    // Competitions are data: relationships (relegate/promote/qualify) drive the season, nothing is hardcoded
    D.LEAGUES.forEach(
      (l) =>
        (S.comps[l.id] = {
          id: l.id,
          type: 'league',
          nat: l.nat,
          name: l.name,
          short: l.short,
          tier: l.tier,
          sim: l.sim,
          repBand: l.repBand,
          clubs: [],
          rules: JSON.parse(JSON.stringify(l.rules)),
        }),
    );
    const CUP = (id, nat, name, short) => (S.comps[id] = { id, type: 'cup', nat, name, short, clubs: [], prize: 3e6 });
    CUP('CUPENG', 'ENG', 'FA Cup', 'FAC');
    CUP('CUPESP', 'ESP', 'Copa del Rey', 'CDR');
    CUP('CUPGER', 'GER', 'DFB-Pokal', 'DFB');
    CUP('CUPFRA', 'FRA', 'Coupe de France', 'CDF');
    CUP('CUPBRA', 'BRA', 'Copa do Brasil', 'CDB');
    S.comps.FR = { id: 'FR', type: 'friendly', name: 'Pre-season friendly', short: 'FR', clubs: [] };
    D.CONTINENTALS.forEach((c) => (S.comps[c.id] = { ...c, type: 'continental', clubs: [] }));
    S.comps.CWC = { id: 'CWC', type: 'world', name: 'FIFA Club World Cup', short: 'CWC', clubs: [], prize: 1e7 };

    const mkClub = (row, compId, nat, sim) => {
      const [name, short, city, c1, c2, identity, rep] = row;
      const stadium =
        row[7] || { MEX: `Estadio ${city}`, MAR: `Stade de ${city}`, SRB: `Stadion ${city}` }[nat] || `${city} Stadium`;
      const cap = row[8] || Math.round((8000 + (rep - 40) * 900) / 500) * 500;
      const id = 'c_' + short,
        parent = row[9] ? 'c_' + row[9] : null; // a B team's parent club
      const lvl = W.levelFor(rep),
        idt = D.IDENTITY[identity];
      const budget =
        Math.round((1000 * Math.pow(1.13, lvl + 2) * 1.2 * idt.budget) / 1e5) *
        1e5 *
        (sim === 'full' ? 1 : sim === 'light' ? 0.6 : 0.3);
      const club = {
        id,
        name,
        short,
        city,
        nat,
        colors: [c1, c2],
        identity,
        rep,
        parent,
        stadium: { name: stadium, cap, cap0: cap },
        comp: compId,
        sim,
        balance: budget * 1.5 + 4e6,
        budget,
        fanMood: 60,
        boardConf: 65,
        facilities: {
          training: U.randi(2, 4),
          academy: identity === 'youth' ? 4 : U.randi(1, 3),
          medical: U.randi(2, 3),
          analytics: U.randi(1, 3),
          stadium: 1,
          fanzone: U.randi(1, 2),
          museum: rep > 70 ? 2 : 1,
        },
        tactic: W.aiTactic({ identity, rep }),
        chant: U.pick(D.CHANTS)
          .replace('{city}', city)
          .replace('{short}', short)
          .replace('{nick}', name.split(' ').pop()),
        tradition: U.pick(D.TRADITIONS),
        rival: null,
        derby: null,
        titles: {},
        ledger: [],
        bestSales: [],
        manager:
          sim === 'minimal'
            ? null
            : W.genStaff('Manager', U.chance(0.75) ? nat : U.pick(Object.keys(D.NATIONS)), {
                rep: Math.round(rep * U.rand(0.8, 1.05)),
              }).id,
      };
      S.clubs[id] = club;
      S.comps[compId].clubs.push(id);
      genSquad(club);
      return club;
    };
    D.LEAGUES.forEach((l) => D[l.clubs].forEach((r) => mkClub(r, l.id, l.nat, l.sim)));
    D.RIVALS.forEach(([a, b, name]) => {
      if (!S.clubs['c_' + a] || !S.clubs['c_' + b]) return;
      S.clubs['c_' + a].rival = 'c_' + b;
      S.clubs['c_' + b].rival = 'c_' + a;
      S.clubs['c_' + a].derby = S.clubs['c_' + b].derby = name;
    });
    D.CLUBS_OVERSEAS.forEach(([name, short, nat, c1, c2, rep]) => {
      const id = 'c_' + short;
      const club = {
        id,
        name,
        short,
        city: name,
        nat,
        colors: [c1, c2],
        identity: 'selling',
        rep,
        comp: null,
        sim: 'minimal',
        fanMood: 50,
        boardConf: 50,
        balance: 5e6,
        budget: 0,
        facilities: { academy: 2 },
        tactic: W.newTactic(),
        titles: {},
        bestSales: [],
      };
      S.clubs[id] = club;
      genSquad(club);
    });
    // Some unattached free agents
    for (let i = 0; i < 45; i++) {
      const age = U.randi(19, 34),
        ca = W.freeAgentCA(),
        pos = U.pick(D.POS);
      const p = W.genPlayer({ nat: U.pick(Object.keys(D.NATIONS)), pos, age, ca, pa: W.potentialFor(ca, age) });
      p.contract = S.year;
      S.players[p.id] = p;
    }
    FM.Contracts.seedWorld();
    W.leagues().forEach(W.setupSeasonFixtures);
    FM.Intl.setup();
    FM.Cups.setupSeason(null);
    S.calendar = W.buildCalendar();
    // A world with a past: players of 22+ have been at their club for a while (most 1–3 seasons, a few long-servers
    // a decade), with appearances to match their standing, so long-serving captains are club icons from day one
    for (const id in S.players) {
      const p = S.players[id],
        c = p.clubId && S.clubs[p.clubId],
        age = W.age(p);
      if (!c || age < 22) continue;
      const yrs = Math.min(age - 18, Math.floor(-Math.log(1 - Math.random()) * 3));
      if (yrs <= 0) continue;
      const share = p.ca >= W.levelFor(c.rep) - 2 ? 0.85 : p.ca >= W.levelFor(c.rep) - 10 ? 0.5 : 0.2;
      const sp = W.spell(p);
      sp.from = S.year - yrs;
      sp.apps = Math.round(yrs * 40 * share * U.rand(0.8, 1.1));
      p.career.apps += sp.apps;
    }
    for (const id in S.players) S.players[id].value = W.value(S.players[id]); // priced with their final club and contract
    FM.Youth.assignAll(); // U21 and U18 squads from the start
    return S;
  };

  // Attach the human manager to a club
  // The manager's own profile, independent of any club (a new career creates it; it survives every job)
  // who: a name, or a profile { fn, ln, nat, fav, avatar: { e, bg } } from the new-career screen
  W.newManager = function (who, rep, nat) {
    const S = FM.S,
      prof = typeof who === 'string' ? { name: who } : who || {};
    const mgrName = prof.fn || prof.ln ? `${prof.fn || ''} ${prof.ln || ''}`.trim() : prof.name || 'New Manager';
    const scouts = [
      W.genStaff('Scout', 'ARG', {
        ability: 15,
        regions: { SAM: 0.95, EUR: 0.45, ENG: 0.55, NAM: 0.35, ASIA: 0.15, AFR: 0.3 },
        judge: 15,
        note: 'Excellent in Argentina & Brazil. Poor in Asia.',
      }),
      W.genStaff('Scout', 'JPN', {
        ability: 13,
        regions: { ASIA: 0.95, ENG: 0.4, EUR: 0.35, NAM: 0.4, SAM: 0.2, AFR: 0.2 },
        judge: 13,
        note: 'Knows every academy in Japan, Korea & Thailand.',
      }),
      W.genStaff('Scout', 'ENG', {
        ability: 12,
        regions: { ENG: 0.9, EUR: 0.7, AFR: 0.55, NAM: 0.3, SAM: 0.3, ASIA: 0.25 },
        judge: 12,
        note: 'Domestic expert with a good European network.',
      }),
    ];
    S.user = {
      name: mgrName,
      fn: prof.fn || mgrName.split(' ')[0],
      ln: prof.ln || mgrName.split(' ').slice(1).join(' '),
      nat: prof.nat || nat,
      favClub: prof.fav && S.clubs[prof.fav] ? prof.fav : null,
      avatar: prof.avatar || null,
      clubId: null,
      rep: Math.round(rep),
      joined: S.year,
      badges: 'Continental B',
      stats: {
        games: 0,
        w: 0,
        d: 0,
        l: 0,
        youthDebuts: 0,
        giantKills: 0,
        promotions: 0,
        trophies: 0,
        bought: 0,
        sold: 0,
      },
      history: [],
      scouts: scouts.map((s) => s.id),
      assignments: [],
      knowledge: {},
      reports: {},
      shortlist: [],
      staff: {
        assistant: W.genStaff('Assistant Manager', nat).id,
        coach: W.genStaff('First-Team Coach', nat).id,
        analyst: W.genStaff('Head of Analytics', nat).id,
        physio: W.genStaff('Head Physio', nat).id,
        director: W.genStaff('Sporting Director', nat).id,
      },
      lastMatch: null,
      pendingPrompts: [],
      promises: [],
      talks: {},
      trust: 60,
      board: { year: S.year, meetings: 0 },
      nation: null,
      ntHistory: [],
      course: null,
      tactic: W.newTactic(),
      preseason: {},
      offers: [],
    };
    return S.user;
  };
  // A club's simulation tier follows its league (promotion from League One makes it fully simulated, and so on),
  // except the club you manage, which is always fully simulated: finances, squad size, records, the lot
  W.syncSim = function (c) {
    const comp = c && c.comp && FM.S.comps[c.comp];
    if (c) c.sim = W.isUser(c.id) ? 'full' : comp && comp.sim ? comp.sim : c.sim;
  };
  // Your league, the league above it and the league below it always play in the full engine (a light league becomes
  // full the moment it matters to you: relegated from the Premier League, League One is suddenly next door). Every
  // other league runs at its base tier from the data. Re-applied when you take a job, lose one, and after promotion
  // and relegation.
  W.applySimFocus = function () {
    const S = FM.S,
      uc = W.employed() && W.userClub(),
      my = uc && S.comps[uc.comp];
    const focus = new Set();
    if (my) {
      focus.add(my.id);
      const r = my.rules || {};
      if (r.promote) focus.add(r.promote.to);
      if (r.relegate) focus.add(r.relegate.to);
    }
    for (const c of W.leagues()) {
      if (!c.baseSim) c.baseSim = (D.LEAGUES.find((l) => l.id === c.id) || {}).sim || c.sim;
      c.sim = focus.has(c.id) && c.baseSim !== 'minimal' ? 'full' : c.baseSim;
    }
    Object.values(S.clubs).forEach(W.syncSim);
  };
  // Avatars for the manager profile
  W.AVATARS = [
    '🧑',
    '👨',
    '👩',
    '🧔',
    '👨‍🦱',
    '👩‍🦱',
    '👨‍🦰',
    '👩‍🦰',
    '👱',
    '👱‍♀️',
    '👨‍🦳',
    '👩‍🦳',
    '🧑‍🦲',
    '👴',
    '👵',
    '🧑🏽',
    '👨🏾',
    '👩🏿',
    '🧔🏻',
    '👨🏼‍🦱',
    '👩🏽‍🦱',
    '🧑🏿‍🦲',
    '🧢',
    '🎩',
  ];
  W.AVATAR_BG = ['#1f6feb', '#c8102e', '#0b8a3e', '#6a1b9a', '#f59e0b', '#0f172a', '#e11d48', '#0891b2'];
  W.homeLeague = (x) => !x.sim || x.sim === 'full' || D.LEAGUES.some((l) => l.nat === x.nat && l.sim === 'full');
  W.employed = () => !!(FM.S.user && FM.S.user.clubId && FM.S.clubs[FM.S.user.clubId]);
  // Out of work (sacked, resigned, or a career that starts without a club): the old club hires a successor,
  // time keeps passing, and job offers arrive through FM.Season.jobMarket
  W.goUnemployed = function (reason) {
    const S = FM.S,
      u = S.user,
      old = W.userClub();
    if (old) {
      const successor = W.genStaff('Manager', old.nat, { rep: old.rep });
      old.manager = successor.id;
      old.tactic = JSON.parse(JSON.stringify(u.tactic)); // the club keeps playing the way it was set up
      delete old.tactic.lineup;
      delete old.tactic.capt;
      delete old.tactic.captAuto;
      delete old.tactic.sp;
      if (FM.Records) FM.Records.managerJoined(successor, old.id);
      u.history.push({ club: old.id, left: S.year, reason });
    }
    (u.promises || []).forEach((x) => {
      if (x.state === 'open') {
        x.state = 'void';
        x.closed = S.day;
      }
    });
    // Decisions still waiting in the feed belonged to the old job
    S.news.forEach((n) => {
      if (n.type === 'bid' && n.data && n.data.status === 'open') {
        n.data.status = 'void';
        n.reply = 'You left the club before answering.';
      }
      if ((n.type === 'press' || n.type === 'meeting') && !n.resolved) {
        n.resolved = '—';
        n.reply = 'You left the club before answering.';
      }
    });
    u.clubId = null;
    u.sacked = false;
    u.nation = u.nation || null;
    W.applySimFocus(); // leagues return to their own tiers
    u.unemployed = { since: S.year, day: S.day, from: old ? old.id : null, reason };
    u.tactic = W.newTactic();
    u.preseason = {};
    u.offers = [];
    u.lastMatch = null;
    u.building = null;
    u.neg = {};
    u.talks = {};
    u.contractRem = null;
    if (FM.Season.jobMarket) FM.Season.jobMarket(true);
  };
  W.takeCharge = function (clubId, mgrName, isNew = true) {
    const S = FM.S,
      club = S.clubs[clubId];
    if (isNew) W.newManager(mgrName, club.rep * 0.55, club.nat);
    S.user.clubId = clubId;
    W.applySimFocus(); // your league and its neighbours in the full engine
    S.user.history.push({ club: clubId, from: S.year });
    // A new job wipes the slate: promises, talks and board business belonged to the old club
    (S.user.promises || []).forEach((x) => {
      if (x.state === 'open') {
        x.state = 'void';
        x.closed = S.day;
      }
    });
    S.user.neg = {};
    S.user.talks = {};
    S.user.contractRem = null;
    S.user.adviceDone = {};
    S.user.board = { year: S.year, meetings: 0 };
    S.user.trust = 60;
    S.user.sacked = false;
    delete S.user.unemployed;
    S.user.offers = [];
    if (club.manager && S.staff[club.manager] && FM.Records) FM.Records.managerLeft(S.staff[club.manager], clubId);
    club.manager = null;
    club.boardConf = 70;
    // Your favourite club: a homecoming buys goodwill; its rivals' fans will take some winning over
    const fav = S.user.favClub && S.clubs[S.user.favClub];
    if (fav && fav.id === clubId) {
      club.fanMood = Math.min(100, club.fanMood + 12);
      club.boardConf += 8;
      if (FM.Stories)
        FM.Stories.share({
          kicker: 'HOMECOMING',
          title: `${S.user.name} takes charge of boyhood club ${club.name}`,
          sub: 'The supporters know one of their own when they see one.',
          big: '❤️',
          clubId,
        });
    } else if (fav && club.rival === fav.id) {
      club.fanMood = Math.max(0, club.fanMood - 10);
      if (FM.News)
        FM.News.add({
          type: 'dressing',
          title: 'Fans wary of the new manager',
          body: `Supporters haven't forgotten that ${S.user.name} grew up following ${fav.name}. Results will have to do the talking.`,
          clubId,
        });
    }
    S.user.joinedClubYear = S.year;
    S.user.tactic = club.tactic;
    if (S.user.tactic.fam == null) S.user.tactic.fam = 55; // tactical familiarity 0–100
    S.user.preseason = S.user.preseason || {};
    if (!S.staffPool) W.refreshStaffPool();
    // Own-club and same-league players are partially known
    Object.values(S.players).forEach((p) => {
      if (p.clubId === clubId) S.user.knowledge[p.id] = 100;
      else if (p.clubId && S.clubs[p.clubId].comp)
        S.user.knowledge[p.id] = Math.max(S.user.knowledge[p.id] || 0, S.clubs[p.clubId].comp === club.comp ? 35 : 20);
    });
  };

  // Fictional historic legends so every club has a past before your save writes its future
  W.seedLegends = function () {
    const notes = [
      'Captained the club to its last title',
      'Club record goalscorer',
      'Cult hero — scored in five straight derbies',
      'One-club man, 17 seasons',
      'The greatest free signing in club history',
      'Academy graduate turned legend',
      'Scored the goal that saved the club from relegation',
    ];
    Object.values(FM.S.clubs)
      .filter((c) => c.sim === 'full')
      .forEach((c) => {
        c.legends = [0, 1, 2]
          .map((i) => {
            const nat = Math.random() < 0.8 ? 'ENG' : U.pick(Object.keys(D.NATIONS));
            const from = U.randi(1962, 2008),
              yrs = U.randi(7, 16),
              pos = U.pick(['ST', 'CM', 'CB', 'W', 'GK', 'AM']);
            const apps = yrs * U.randi(28, 40);
            return {
              name: `${U.pick(D.NATIONS[nat].fn)} ${U.pick(D.NATIONS[nat].ln)}`,
              nat,
              pos,
              era: `${from}–${from + yrs}`,
              apps,
              goals: Math.round(apps * ({ ST: 0.45, W: 0.2, AM: 0.22, CM: 0.1 }[pos] || 0.03)),
              note: notes[(U.hash(c.id) + i) % notes.length],
            };
          })
          .sort((a, b) => b.apps - a.apps);
      });
  };

  // ---------------- Compact save format ----------------
  // Players are ~80% of a save. Attributes, hidden attributes, season stats, career spells and history are
  // stored as arrays, common keys are shortened, defaults are dropped, and derived fields (ability, value,
  // personality) are recomputed on load. Unknown keys pass through untouched.
  const HID = ['cons', 'inj', 'prof', 'amb', 'loy', 'temp', 'big', 'lead'];
  const HIST = [
    'y',
    'c',
    'apps',
    'g',
    'r',
    'a',
    'mins',
    'sh',
    'kp',
    'tk',
    'cs',
    'sv',
    'ga',
    'xga',
    'motm',
    'yc',
    'rc',
    'ic',
  ]; // history row fields, packed in this order (old saves: the first five)
  const SEASON = [
    'apps',
    'goals',
    'ast',
    'rsum',
    'motm',
    'yc',
    'rc',
    'lapps',
    'mins',
    'sh',
    'sot',
    'kp',
    'tk',
    'pas',
    'cs',
    'sv',
    'ga',
    'xga',
    'yapps',
    'ic',
  ];
  const KEYS = {
    fn: 'f',
    ln: 'l',
    nat: 'n',
    born: 'b',
    pos: 'p',
    foot: 'ft',
    morale: 'm',
    form: 'fo',
    fitness: 'fi',
    inj: 'i',
    susp: 's',
    wage: 'w',
    contract: 'c',
    traits: 't',
    clubId: 'cl',
    youth: 'y',
    cult: 'cu',
    derbyGoals: 'dg',
    intl: 'in',
    deal: 'de',
    agent: 'ag',
    lastGrowth: 'lg',
    flagMinutes: 'fm',
    loan: 'lo',
    listed: 'li',
    debuted: 'db',
    wantsOut: 'wo',
    askedRaise: 'ar',
    injRisk: 'ir',
    arc: 'ac',
    settled: 'st',
    buzz: 'bz',
    buzzY: 'by',
  };
  const UNKEY = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [v, k]));
  const DEFAULTS = {
    inj: null,
    susp: 0,
    youth: null,
    cult: 0,
    derbyGoals: 0,
    lastGrowth: 0,
    flagMinutes: false,
    listed: false,
  };
  const DROP = new Set([
    'ca',
    'value',
    'personality',
    'attrs',
    'hid',
    'season',
    'career',
    'history',
    '_heat',
    '_riskPlayOn',
  ]);
  const r2 = (v) => Math.round(v * 100) / 100;
  W.packPlayer = function (p) {
    // C: current ability as it was, so rounding the attributes can never shift a rating across a save/load
    const o = { A: D.ATTRS.map((k) => r2(p.attrs[k])), H: HID.map((k) => p.hid[k]), C: p.ca };
    if (SEASON.some((k) => p.season[k])) o.Z = SEASON.map((k) => r2(p.season[k] || 0));
    o.K = [
      p.career.apps,
      p.career.goals,
      p.career.spells.map((s) => {
        const a = [s.c, s.from, s.to, s.apps, s.goals, (s.loan ? 1 : 0) + (s.signed ? 2 : 0)];
        if (s.fee != null) a.push(s.fee);
        return a;
      }),
    ];
    if (p.history && p.history.length) o.Y = p.history.map((h) => HIST.map((k) => h[k] ?? 0));
    for (const k in p) {
      if (DROP.has(k) || p[k] === undefined) continue;
      if (k in DEFAULTS && p[k] === DEFAULTS[k]) continue;
      o[KEYS[k] || k] = p[k];
    }
    return o;
  };
  W.unpackPlayer = function (o) {
    const p = { ...DEFAULTS };
    for (const k in o) if (!['A', 'H', 'Z', 'K', 'Y', 'C'].includes(k)) p[UNKEY[k] || k] = o[k];
    p.attrs = Object.fromEntries(D.ATTRS.map((k, i) => [k, o.A[i]]));
    p.hid = Object.fromEntries(HID.map((k, i) => [k, o.H[i]]));
    p.season = W.blankSeason();
    if (o.Z)
      SEASON.forEach((k, i) => {
        if (o.Z[i] || (k !== 'lapps' && o.Z[i] != null)) p.season[k] = o.Z[i]; // older saves have fewer fields
      });
    p.career = {
      apps: o.K[0],
      goals: o.K[1],
      spells: o.K[2].map(([c, from, to, apps, goals, f, fee]) => ({
        c,
        from,
        to,
        apps,
        goals,
        ...(f & 1 ? { loan: true } : {}),
        ...(f & 2 ? { signed: true } : {}),
        ...(fee != null ? { fee } : {}),
      })),
    };
    if (o.Y) p.history = o.Y.map((a) => Object.fromEntries(HIST.map((k, i) => [k, a[i] ?? 0])));
    p.personality = W.personality(p.hid);
    W.refresh(p);
    if (o.C != null && o.C !== p.ca) {
      p.ca = o.C;
      if (p.pa < p.ca) p.pa = p.ca;
      p.value = W.value(p);
    }
    return p;
  };
  W.packPlayers = (players) => {
    const out = {};
    for (const id in players) out[id] = W.packPlayer(players[id]);
    return out;
  };
  W.unpackPlayers = (packed) => {
    const out = {};
    for (const id in packed) out[id] = W.unpackPlayer(packed[id]);
    return out;
  };

  W.userClub = () => FM.S.clubs[FM.S.user.clubId];
  W.isUser = (clubId) => FM.S.user && FM.S.user.clubId === clubId;
  W.isUserNation = (id) => !!(FM.S.user && FM.S.user.nation && FM.S.user.nation === id);
  W.isMine = (id) => W.isUser(id) || W.isUserNation(id);
})();
