// Player careers: the development curve, hidden career arcs, youth intake, retirement and AI contract renewals.
// Part of FM.Season (season.js drives when each runs).
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const Sea = FM.Season;

  // ---------- Development ----------
  // Career shape: ability rises quickly in the teens, levels off in the mid-twenties, peaks around 27–29
  // and falls away through the thirties. Keepers and centre-backs age more slowly; each player's clock
  // runs a little early or late (fixed per player), and professionals decline more gently.
  const CURVE = [
    [17, 4.8],
    [19, 4.3],
    [21, 3.6],
    [23, 2.9],
    [25, 2.0],
    [27, 1.0],
    [28, 0.3],
    [29, 0],
    [30, -1],
    [31, -1.9],
    [32, -2.8],
    [33, -3.6],
    [34, -4.4],
    [36, -5.6],
  ];
  const curveAt = (e) => {
    if (e <= CURVE[0][0]) return CURVE[0][1];
    for (let i = 1; i < CURVE.length; i++)
      if (e <= CURVE[i][0]) {
        const [a0, g0] = CURVE[i - 1],
          [a1, g1] = CURVE[i];
        return g0 + ((g1 - g0) * (e - a0)) / (a1 - a0);
      }
    return CURVE[CURVE.length - 1][1];
  };
  Sea.CURVE = CURVE; // exposed for calibration (tools/calibrate.mjs --set Season.CURVE.8.1=-0.6)
  Sea.AGE_STRETCH = { GK: 0.75, CB: 0.92, DM: 0.96, CM: 0.97 };
  // A player's own ageing clock: -1.2..+1.2 years, from his id so it never changes and needs no save field
  Sea.clock = (p) => {
    let h = 0;
    for (const ch of String(p.id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return ((Math.abs(h) % 1000) / 1000 - 0.5) * 2.4;
  };
  Sea.careerAge = function (p) {
    const a = W.age(p);
    if (a <= 20) return a;
    return 20 + (a - 20) * (Sea.AGE_STRETCH[p.pos] || 1) - Sea.clock(p) * Math.min(1, (a - 20) / 6);
  };
  Sea.growthCurve = function (p) {
    const a = W.age(p),
      lb = W.hasTrait(p, 'Late Bloomer'),
      arc = p.arc && p.arc.k;
    let g = curveAt(Sea.careerAge(p));
    if (lb) {
      if (a <= 21) g *= 0.6;
      else if (a <= 27) g += 2.2;
    }
    if (arc === 'burnout' && a > p.arc.peak) g = Math.min(g, -(2.5 + Math.min(3, (a - p.arc.peak) * 0.6))); // the legs, the hunger or the body go early
    if (arc === 'ageless' && g < 0 && a <= 35) g *= 0.3; // keeps his prime deep into his thirties
    return g;
  };

  // ---------- Career arcs ----------
  // Most careers follow the curve; a few don't. Hidden and fixed when the player is created (world or academy):
  //   stall   — a prospect who barely improves            plateau — levels off well short of his potential
  //   burnout — peaks early (22–25), then falls away fast  meteor  — one outstanding season (age 21–27), then fades
  //   early   — at or near his prime by 18–19 (Mbappé, Yamal)
  //   ageless — keeps his prime into his mid-thirties (Messi, Ronaldo): slow decline, retires late
  Sea.ARCS = { stall: 0.08, plateau: 0.12, burnout: 0.07, early: 0.1, meteor: 0.02, ageless: 0.04, agelessPlain: 0.01 };
  Sea.assignArc = function (p, age) {
    const A = Sea.ARCS,
      S = FM.S,
      x = Math.random();
    const prospect = age <= 21 && p.pa >= 78 && p.pa - p.ca >= 12;
    if (prospect) {
      if (x < A.stall) return (p.arc = { k: 'stall' });
      if (x < A.stall + A.plateau)
        return (p.arc = { k: 'plateau', cap: Math.round(p.ca + (p.pa - p.ca) * U.rand(0.35, 0.65)) });
      if (x < A.stall + A.plateau + A.burnout) return (p.arc = { k: 'burnout', peak: U.randi(22, 25) });
      if (p.pa >= 84 && x < A.stall + A.plateau + A.burnout + A.early) return (p.arc = { k: 'early' });
    }
    const y = Math.random();
    if (age <= 26 && y < A.meteor)
      return (p.arc = { k: 'meteor', y: S.year + U.randi(Math.max(1, 21 - age), 27 - age) });
    if (age <= 30 && y < A.meteor + (p.hid.prof >= 14 ? A.ageless : A.agelessPlain)) return (p.arc = { k: 'ageless' });
    return null;
  };
  Sea.develop = function (p, frac) {
    const S = FM.S;
    const club = p.clubId && S.clubs[p.clubId];
    const arc = p.arc && p.arc.k,
      a = W.age(p);
    let g = Sea.growthCurve(p);
    if (g > 0) {
      let head = p.pa - p.ca;
      if (arc === 'plateau') head = Math.min(head, p.arc.cap - p.ca);
      if (head <= 0 && arc !== 'meteor') return;
      head = Math.max(0, head);
      const train =
        (club ? club.facilities.training || 2 : 2) + (club && W.isUser(club.id) ? FM.Staff.impact('coach').dev : 0);
      const mins = Math.min(0.45, p.season.apps * 0.03 + Math.min(0.15, (p.season.yapps || 0) * 0.008)); // youth-team games help a little
      const f = 0.55 + train * 0.09 + (p.hid.prof - 10) / 25 + mins;
      const early = arc === 'early' && a <= 21,
        fast = early || (arc === 'burnout' && a <= p.arc.peak);
      g = Math.min(g * f * (early ? 3 : fast ? 1.3 : 1), head * (early ? 1.2 : 0.45)) * frac * U.rand(0.6, 1.4); // closing in on potential slows down: players keep improving into their mid-twenties
      if (arc === 'stall') g *= 0.2;
      if (p.ca >= Sea.ELITE.from) g *= Sea.ELITE.growth; // the very best grow more slowly: keeps the elite from inflating
      if (p.inj && (p.inj.out || 0) >= 8) g *= 0.4; // months on the treatment table cost development
      g *= FM.Training.devK(p); // your training focus and intensity
    } else {
      g = g * frac * (1.25 - p.hid.prof / 40) * U.rand(0.7, 1.3);
    }
    // One-season wonder: a sudden leap in his big year (above his potential), given back over the next two
    const boom = arc === 'meteor' ? S.year - p.arc.y : null;
    if (boom === 0) {
      if (p.arc.pa == null) p.arc.pa = p.pa;
      g += 9 * frac * U.rand(0.8, 1.2);
    } else if (boom === 1 || boom === 2) g -= 4.5 * frac * U.rand(0.8, 1.2);
    Sea.applyGrowth(p, g);
    if (Math.random() < frac * 0.3) Sea.reposition(p);
    if ((boom === 1 || boom === 2) && p.arc.pa != null) p.pa = Math.max(p.arc.pa, p.ca); // the big year never becomes his new ceiling
    // Experience: in their late twenties and thirties players keep reading the game better
    const e = Sea.careerAge(p);
    if (e >= 26 && e <= 31)
      for (const k of ['positioning', 'composure', 'vision'])
        p.attrs[k] = Math.min(20, p.attrs[k] + 0.12 * frac * Math.random() * 2);
  };
  // A player's game changes with his body, so his natural position can change: a winger who loses his pace becomes
  // a wide midfielder, a full-back moves inside, a striker drops into the playmaker's role. It happens when another
  // position he can already play (a neighbouring one) suits his attributes clearly better — more readily after 29,
  // when the legs go. The old position stays on as a second one.
  Sea.reposition = function (p) {
    if (p.pos === 'GK' || p.retired || W.age(p) < 18) return;
    const here = W.calcCA(p, p.pos),
      old = W.age(p) >= 29;
    let best = null,
      bv = 0;
    for (const t of D.POS) {
      if (t === p.pos || t === 'GK' || t === 'WB') continue; // (a wing-back slot is judged as a full-back's for anyone else)
      if (W.fitAt(p, t) < 0.82) continue;
      const gain = W.calcCA(p, t) - here;
      if (gain > bv) {
        bv = gain;
        best = t;
      }
    }
    if (!best || bv < (old ? 2.5 : 4)) return;
    const was = p.pos;
    (p.alt = p.alt || {})[was] =
      Math.round(Math.min(0.97, Math.max(0.88, ((D.FIT[best] || {})[was] || 0) + 0.06)) * 100) / 100;
    delete p.alt[best];
    if (p.alt && !Object.keys(p.alt).length) delete p.alt;
    if (!(W.FLANK.includes(was) && W.FLANK.includes(best))) delete p.side; // off the flank or onto it: his side is worked out afresh
    p.pos = best;
    W.refresh(p);
    if (W.ownPlayer(p))
      FM.News.add({
        type: 'club',
        title: `${W.name(p)} is now a ${D.POS_NAME[best].toLowerCase()}`,
        body: `His game has changed: he suits the ${D.POS_NAME[best].toLowerCase()} role better now, and can still cover at ${D.POS_NAME[was].toLowerCase()}.`,
        clubId: W.userClub().id,
      });
  };
  // How fast each attribute fades with age (relative): legs first, then touch, and reading the game last
  const AGEING = {
    pace: 2,
    stamina: 1.6,
    strength: 0.7,
    workRate: 1.1,
    dribbling: 1.1,
    reflexes: 1.2,
    technique: 0.6,
    finishing: 0.7,
    tackling: 0.9,
    handling: 0.6,
    passing: 0.5,
    vision: 0.35,
    positioning: 0.4,
    composure: 0.3,
  };
  Sea.applyGrowth = function (p, dCA) {
    const w = D.POS_W[p.pos];
    const before = p.ca,
      tw = dCA > 0 ? FM.Training.attrW(p, FM.Training.weights(p)) : null; // training focus shapes what grows
    for (const k of D.ATTRS) {
      let d;
      // Secondary attributes develop too (nearly as fast), so a player grown in the simulation ends up shaped like a
      // generated player of the same ability. At 15% they fell ever further behind, and as academy products
      // replaced the generated players, defending (which leans on them) eroded and goals crept up season by season.
      if (dCA >= 0) d = (dCA / 5) * (w[k] ? U.rand(0.5, 1.5) : 0.9 * U.rand(0.5, 1.5)) * (tw ? tw(k) : 1);
      else d = (dCA / 5) * (AGEING[k] || 0.8) * (w[k] ? 1 : 0.5) * U.rand(0.5, 1.5);
      if ((k === 'reflexes' || k === 'handling') && p.pos !== 'GK') continue;
      if (p.pos === 'GK' && D.GK_OUTFIELD[k] && d > 0) continue; // keepers don't grow outfield skills
      p.attrs[k] = U.clamp(p.attrs[k] + d, 1, 20);
    }
    W.refresh(p);
    if (p.ca > p.pa) p.pa = p.ca;
    p.lastGrowth = (p.lastGrowth || 0) + (p.ca - before);
  };

  // ---------- Youth intake ----------
  // Potential of academy prospects: mean rises with academy level (and a youth-focused club), plus rare wonderkids.
  // Tuned so each year's intake grows into an elite about as strong as the one it replaces (no inflation).
  Sea.YOUTH = { base: 51, perAcad: 4, youthClub: 4, sd: 6.5, wonder: 0.006 };
  Sea.youthIntake = function () {
    const Y = Sea.YOUTH;
    const S = FM.S;
    Object.values(S.clubs).forEach((c) => {
      const acad = c.facilities.academy || 2;
      const n = 2 + Math.floor(acad / 2) + (c.identity === 'youth' ? 1 : 0);
      const made = [];
      for (let i = 0; i < n; i++) {
        const nat = W.youthNat(c);
        const pos = U.pick(['GK', 'CB', 'CB', 'FB', 'WB', 'DM', 'CM', 'CM', 'WM', 'AM', 'W', 'W', 'ST', 'ST']);
        const ca = Math.round(U.clamp(U.gauss(26 + acad * 3, 4), 18, 48));
        let pa = Math.round(
          U.clamp(U.gauss(Y.base + acad * Y.perAcad + (c.identity === 'youth' ? Y.youthClub : 0), Y.sd), ca + 8, 94),
        );
        // Real wonderkids are rare: about 10 a year across the whole world
        if (Math.random() < Y.wonder * acad) pa = U.randi(83, 95);
        const p = W.genPlayer({ nat, pos, age: U.randi(15, 16), ca, pa, clubId: c.id, youthClub: c.id });
        p.career.apps = 0;
        p.career.goals = 0;
        p.contract = S.year + 3;
        p.wage = 400;
        S.players[p.id] = p;
        made.push(p);
      }
      if (W.isUser(c.id)) FM.Stories.youthIntake(c, made);
    });
  };

  // ---------- Retirement and renewals ----------
  Sea.squadMedian = function (clubId) {
    const cas = W.squad(clubId)
      .map((p) => p.ca)
      .sort((a, b) => a - b);
    return cas.length ? cas[Math.floor(cas.length / 2)] : 0;
  };

  // What the world keeps of a retired player: enough for the Hall of Fame, legends returning as managers and
  // club all-time lists, and everyone's season-by-season history (the archive behind historical stats).
  Sea.retiredEntry = function (p) {
    const S = FM.S,
      great =
        p.career.apps >= 450 ||
        p.career.spells.some((s) => s.apps >= 200) ||
        p.cult >= 40 ||
        (p.intl && p.intl.caps >= 50);
    const r = {
      id: p.id,
      fn: p.fn,
      ln: p.ln,
      nat: p.nat,
      pos: p.pos,
      youth: p.youth,
      spells: p.career.spells
        .filter((s) => s.apps >= 10)
        .map(({ c, from, to, apps, goals }) => ({ c, from, to, apps, goals })),
      apps: p.career.apps,
      goals: p.career.goals,
      cult: p.cult,
      derbyGoals: p.derbyGoals,
      year: S.year - 1,
      lead: p.hid.lead,
      history: p.history,
    };
    if (great) Object.assign(r, { great: true, traits: p.traits, caps: (p.intl && p.intl.caps) || 0 });
    return r;
  };
  // Keep the list bounded in very long saves: the least remembered go first, never a legend, a manager-to-be,
  // or anyone who played for a club you have managed
  Sea.trimRetired = function (max = 50000) {
    const S = FM.S;
    if (S.retired.length <= max) return;
    const mine = new Set((S.user.history || []).map((h) => h.club).concat(S.user.clubId || []));
    const keep = (r) => r.great || r.became || r.spells.some((s) => mine.has(s.c));
    const worth = (r) => (r.apps || 0) + (r.goals || 0) * 2 + (r.cult || 0) * 5;
    const drop = S.retired
      .filter((r) => !keep(r))
      .sort((a, b) => worth(a) - worth(b))
      .slice(0, S.retired.length - max);
    const gone = new Set(drop);
    S.retired = S.retired.filter((r) => !gone.has(r));
  };

  // Chance a player retires this summer: age (keepers last longer), still good enough for his club,
  // a long injury late in a career, and professionalism
  // ---------- Club icons ----------
  // A long-server at his club (250+ appearances, or 8+ seasons and 150+): fans adore him, he takes less to stay,
  // and selling him is not forgiven
  Sea.isIcon = function (p) {
    const sp = p.clubId && W.spell(p);
    if (!sp || sp.loan || sp.c !== p.clubId) return false;
    return sp.apps >= 250 || (FM.S.year - sp.from >= 8 && sp.apps >= 150);
  };
  // A testimonial in his tenth season at your club: a full house, a lift for the fans, a little income
  Sea.testimonials = function () {
    const S = FM.S,
      c = W.userClub();
    if (!c) return;
    for (const p of W.squad(c.id)) {
      const sp = W.spell(p);
      if (!sp || sp.loan || sp.c !== c.id || S.year - sp.from !== 9 || sp.apps < 150 || p.testimonial) continue;
      p.testimonial = S.year;
      const gate = U.roundMoney((c.stadium ? c.stadium.cap : 20000) * 25);
      c.balance += gate;
      c.fanMood = Math.min(100, c.fanMood + 3);
      FM.News.add({
        type: 'club',
        title: `Testimonial for ${W.name(p)}: a full house says thank you`,
        body: `Ten seasons and ${sp.apps} appearances for ${c.name}. The stadium sold out to honour him, raising ${U.money(gate)}.`,
        pid: p.id,
        clubId: c.id,
      });
    }
  };
  // Players already at elite level (75+) grow at half the usual rate: without it the world's top 200 gained ~0.4
  // ability a season (calibrated: trend +0.18, top-100 age 26.6 over six seasons)
  Sea.ELITE = { from: 75, growth: 0.4 };
  // Older legs recover more slowly between matches: fitness points less recovered per day for each year past 29.
  // Veterans get rested more often, so over-30s' share of minutes stays steady (calibrated: 3 → 20–27%, 5 → 18–26%)
  Sea.AGE_RECOVERY = 5;
  Sea.FA_RETIRE = { from: 32, perYear: 0.18, weak: 0.3, min: 0.05 }; // unattached veterans' chance of retiring each summer
  Sea.RETIRE_TOP = 1; // retirement chance multiplier for players at top-flight clubs
  Sea.retireChance = function (p) {
    const a = W.age(p) - (p.pos === 'GK' ? 2 : 0);
    if (a < 32) return 0;
    let r = [0.02, 0.05, 0.12, 0.24, 0.38, 0.52, 0.68][a - 32] ?? 0.9;
    const c = p.clubId && FM.S.clubs[p.clubId];
    if (c) {
      const gap = p.ca - Sea.squadMedian(c.id);
      r *= gap >= 4 ? 0.7 : gap >= -3 ? 0.9 : 1.5;
    }
    if (c && FM.S.comps[c.comp] && FM.S.comps[c.comp].tier === 1) r *= Sea.RETIRE_TOP;
    if (p.inj && (p.inj.out || 0) >= 12) r *= 1.8;
    if (p.hid.prof >= 15) r *= 0.8;
    if (p.arc && p.arc.k === 'ageless') r *= 0.35;
    return Math.min(0.95, r);
  };
  // AI clubs renewing an expiring contract: younger squad players usually, veterans (one year at a time) only
  // while they are still clearly good enough — which is how most careers wind down before retirement
  // Veterans (31+): renewed while clearly good enough (ability over the squad median by more than age - gapAge),
  // otherwise only by chance; a club icon usually gets another year
  Sea.VET = { gapAge: 30, chance: 0.15, icon: 0.6 };
  Sea.aiRenews = function (p, c) {
    const a = W.age(p),
      gap = p.ca - Sea.squadMedian(c.id);
    if (a < 31) return c.sim === 'minimal' || (gap >= -2 ? Math.random() < 0.92 : Math.random() < 0.45);
    if (Sea.isIcon(p) && Math.random() < Sea.VET.icon) return true;
    return gap >= a - Sea.VET.gapAge || Math.random() < (c.sim === 'minimal' ? 0.4 : Sea.VET.chance);
  };
  Sea.retire = function (p) {
    const S = FM.S;
    p.retired = true;
    const sp = W.spell(p);
    if (sp) sp.to = S.year - 1;
    const notable = p.career.apps >= 380 || p.career.spells.some((s) => s.apps >= 60);
    if (notable) {
      S.retired.push(Sea.retiredEntry(p));
      FM.Stories.retirement(p);
    }
    delete S.players[p.id];
  };
})();
