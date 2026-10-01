// Detective-style scouting: regions, scout assignments, knowledge and reports. The transfer market is in transfers.js.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;

  const Sc = (FM.Scouting = {});
  Sc.region = function (p) {
    const c = p.clubId && FM.S.clubs[p.clubId];
    if (c) return c.nat === 'ENG' ? 'ENG' : D.NATIONS[c.nat].region;
    return D.NATIONS[p.nat].region;
  };
  Sc.know = (pid) => FM.S.user.knowledge[pid] || 0;
  // Average ability of the user's current XI (cached per matchday — used on every report render)
  Sc.level = function () {
    const S = FM.S,
      key = `${S.day}-${S.user.clubId}-${S.year}`;
    if (Sc._lvlKey !== key || Sc._lvlS !== S) {
      // Out of work there is no XI to compare with: judge against the level your reputation would get you
      Sc._lvlS = S;
      Sc._lvlKey = key;
      Sc._lvl = W.employed()
        ? U.avg(W.pickXI(S.user.clubId, S.user.tactic).xi.filter(Boolean), (q) => q.ca)
        : W.levelFor(S.user.rep + 8);
    }
    return Sc._lvl;
  };

  Sc.dismiss = function (pid) {
    const u = FM.S.user;
    (u.dismissed = u.dismissed || {})[pid] = { year: FM.S.year, rep: u.reports[pid] || null };
    delete u.reports[pid];
  };
  // Undo a dismissal: the report comes back as it was, and scouts may pick him up again
  Sc.restore = function (pid) {
    const u = FM.S.user,
      d = u.dismissed && u.dismissed[pid];
    if (!d) return;
    if (d.rep) u.reports[pid] = { ...d.rep, isNew: false };
    delete u.dismissed[pid];
  };
  Sc.assign = function (scoutId, spec) {
    const u = FM.S.user;
    if (spec.type === 'player' && u.dismissed) delete u.dismissed[spec.pid];
    u.assignments = u.assignments.filter((a) => a.scout !== scoutId);
    if (spec.type === 'player') {
      const s = FM.S.staff[scoutId],
        p = FM.S.players[spec.pid];
      spec.weeks = Math.max(1, Math.round(3 - 2 * s.regions[Sc.region(p)]));
    }
    u.assignments.push({ scout: scoutId, since: FM.S.day, ...spec });
  };

  function learn(scout, p, mult = 1) {
    const u = FM.S.user,
      reg = Sc.region(p),
      exp = scout.regions[reg];
    const gain = (6 + 24 * exp + scout.judge * 0.6) * mult;
    const before = u.knowledge[p.id] || 0;
    u.knowledge[p.id] = Math.min(100, before + gain * (1 - before / 140));
    const rep = u.reports[p.id];
    if (!rep || rep.scout !== scout.id)
      u.reports[p.id] = {
        scout: scout.id,
        err: U.gauss(0, 1),
        errP: U.gauss(0, 1),
        day: FM.S.day,
        year: FM.S.year,
        isNew: true,
      };
    else {
      rep.day = FM.S.day;
      rep.year = FM.S.year;
      rep.isNew = true;
    }
  }

  // A scout's own (imperfect) read of potential, stable per scout+player
  Sc.scoutPA = (scout, p) => p.pa + ((U.hash(scout.id + p.id) % 1000) / 1000 - 0.5) * 2 * (21 - scout.judge) * 0.8;
  Sc.focusLabel = (a) => {
    const where = a.type === 'league' ? FM.S.comps[a.comp].name : D.REGIONS[a.region];
    const bits = [a.pos === 'any' ? 'all positions' : a.pos, `≤${a.maxAge}`];
    if (a.nat && a.nat !== 'any') bits.push(`${D.NATIONS[a.nat].name} only`);
    if (a.minStars) bits.push(`${a.minStars}★+ potential`);
    if (a.maxFee) bits.push(`under ${U.money(a.maxFee)}`);
    if (a.focus && a.focus !== 'any')
      bits.push({ moneyball: 'undervalued', wonderkid: 'wonderkids', ready: 'ready-made' }[a.focus]);
    return `${where} · ${bits.join(' · ')}`;
  };

  Sc.tick = function () {
    const S = FM.S,
      u = S.user;
    const done = [];
    for (const a of u.assignments) {
      const scout = S.staff[a.scout];
      if (!scout) {
        done.push(a);
        continue;
      }
      if (a.type === 'region' || a.type === 'league') {
        const lvl = U.avg(W.pickXI(u.clubId, u.tactic).xi.filter(Boolean), (q) => q.ca);
        const dis = u.dismissed || {};
        const cands = Object.values(S.players).filter(
          (p) =>
            !p.retired &&
            p.clubId !== u.clubId &&
            !dis[p.id] &&
            (a.type === 'league' ? p.clubId && S.clubs[p.clubId].comp === a.comp : Sc.region(p) === a.region) &&
            (a.pos === 'any' || D.POS_GROUP[p.pos] === a.pos) &&
            (!a.nat || a.nat === 'any' || p.nat === a.nat) &&
            W.age(p) <= a.maxAge &&
            (!a.minStars || W.stars(Sc.scoutPA(scout, p)) >= a.minStars) &&
            (!a.maxFee || FM.Transfers.askPrice(p) <= a.maxFee * 1.1),
        );
        if (!cands.length) continue;
        const weight = (c) => {
          let w = (1.05 - Sc.know(c.id) / 100) * Math.pow(0.5 + Sc.scoutPA(scout, c) / 100, 4);
          if (a.focus === 'moneyball')
            w *= c.season.apps ? Math.pow(c.season.rsum / c.season.apps / 6.5, 6) * (3e6 / (c.value + 1e6)) : 0.2;
          if (a.focus === 'wonderkid') w *= W.age(c) <= 19 ? Math.pow(Sc.scoutPA(scout, c) / 60, 6) : 0.05;
          if (a.focus === 'ready') w *= c.ca >= lvl - 2 ? 3 : 0.3;
          return w;
        };
        const found = [];
        const n = scout.judge >= 15 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const pool = cands.filter((c) => !found.includes(c));
          if (!pool.length) break;
          const p = U.wpick(pool, weight);
          if (p) {
            found.push(p);
            learn(scout, p);
          }
        }
        if (found.length) {
          const graded = found.map((p) => ({ p, v: Sc.view(p) })).sort((x, y) => y.v.score - x.v.score);
          const top = graded[0];
          const star = top.v.grade === 'A' || (top.v.grade === 'B' && top.v.rec === 'Loan');
          FM.News.add({
            type: 'report',
            title: star
              ? `${scout.fn} ${scout.ln}: "You need to see ${W.name(top.p)}"`
              : `${scout.fn} ${scout.ln}: new reports — ${Sc.focusLabel(a)}`,
            body: graded
              .map(
                ({ p, v }) =>
                  `${D.NATIONS[p.nat].flag} ${W.name(p)} (${W.age(p)}, ${p.pos}) — grade ${v.grade}: ${v.verdict}`,
              )
              .join('\n'),
            pid: top.p.id,
            quiet: !star,
          });
        }
      } else if (a.type === 'player') {
        const p = S.players[a.pid];
        if (!p) {
          done.push(a);
          continue;
        }
        learn(scout, p, 1.4);
        if (--a.weeks <= 0) {
          done.push(a);
          FM.News.add({
            type: 'report',
            title: `Scout report: ${W.name(p)}`,
            body: `${scout.fn} ${scout.ln} has finished watching ${W.name(p)} of ${p.clubId ? S.clubs[p.clubId].name : 'no club'}. Verdict: ${Sc.view(p).verdict}.`,
            pid: p.id,
          });
        }
      }
    }
    u.assignments = u.assignments.filter((a) => !done.includes(a));
  };

  // What the user can see about a player, given knowledge
  // How much a player's head-room (potential over current ability) counts in a scout's judgement, by age:
  // a teenager is bought for what he'll become, a 26-year-old for what he is
  Sc.potentialWeight = (age) => (age <= 19 ? 0.6 : age <= 21 ? 0.5 : age <= 23 ? 0.35 : age <= 25 ? 0.15 : 0);
  Sc.view = function (p) {
    const S = FM.S,
      u = S.user,
      own = p.clubId === u.clubId;
    const k = own ? 100 : Sc.know(p.id);
    const rep = u.reports[p.id];
    const scout = rep && S.staff[rep.scout];
    const exp = scout ? scout.regions[Sc.region(p)] : 0.4;
    const unc = 1 - k / 100;
    const errC = rep ? rep.err : 0,
      errP = rep ? rep.errP : 0;
    const caEst = U.clamp(p.ca + errC * unc * 14 * (1.3 - exp), 20, 99);
    const paEst = U.clamp(Math.max(caEst, p.pa + errP * unc * 22 * (1.3 - exp)), 20, 99);
    const wC = unc * 16 + (k < 100 ? 2 : 0),
      wP = unc * 24 + (k < 100 ? 4 : 0);
    const v = {
      k,
      own,
      scout,
      ca: k >= 10 ? [caEst - wC / 2, caEst + wC / 2] : null,
      pa: k >= 25 ? [paEst - wP / 2, paEst + wP / 2] : null,
      showAttrs: k >= 70,
      attrsApprox: k >= 40 && k < 70,
      strengths: [],
      weaknesses: [],
      personality: k >= 50 ? p.personality : null,
      traits: k >= 60 ? p.traits : k >= 40 ? p.traits.filter((t) => t !== 'Injury Prone').slice(0, 1) : [],
      injury:
        k >= 55
          ? p.hid.inj >= 15
            ? 'Significant injury history — recurring muscle problems'
            : p.hid.inj >= 10
              ? 'Occasional knocks, nothing serious'
              : 'Clean bill of health'
          : null,
      hidden:
        k >= 75
          ? [
              p.hid.cons >= 14
                ? 'Performs consistently week to week'
                : p.hid.cons <= 7
                  ? 'Wildly inconsistent'
                  : 'Reasonably consistent',
              p.hid.big >= 14
                ? 'Thrives on the big occasion'
                : p.hid.big <= 7
                  ? 'Goes missing in big games'
                  : 'Handles pressure okay',
              p.hid.prof >= 15
                ? 'Consummate professional in training'
                : p.hid.prof <= 7
                  ? 'Questionable work ethic off the pitch'
                  : 'Decent attitude in training',
            ]
          : null,
      confidence: k >= 85 ? 'High' : k >= 55 ? 'Medium' : 'Low',
    };
    if (k >= 25) {
      const w = D.POS_W[p.pos];
      const rel = D.ATTRS.filter((a) => w[a] || ['pace', 'stamina', 'composure', 'workRate'].includes(a)).filter(
        (a) => p.pos === 'GK' || !['reflexes', 'handling'].includes(a),
      );
      const sorted = rel.slice().sort((a, b) => p.attrs[b] - p.attrs[a]);
      v.strengths = sorted
        .filter((a) => p.attrs[a] >= 14)
        .slice(0, 3)
        .map((a) => D.PHRASES[a][p.attrs[a] >= 17 ? 0 : 1]);
      v.weaknesses = sorted
        .reverse()
        .filter((a) => p.attrs[a] <= 8)
        .slice(0, 2)
        .map((a) => D.PHRASES[a][2]);
    }
    // Tactical fit against the user's current system
    const T = u.tactic,
      slots = D.FORMATIONS[T.formation];
    let bi = 0,
      bv = 0;
    slots.forEach((s, i) => {
      const e = W.effAt(p, s.t);
      if (e > bv) {
        bv = e;
        bi = i;
      }
    });
    v.fit = { slot: slots[bi].t, role: T.roles[bi], score: W.fitAt(p, slots[bi].t) };
    // Verdict relative to user squad level
    const lvl = Sc.level();
    if (!v.ca) v.verdict = 'Unknown — needs scouting';
    else {
      const c = (v.ca[0] + v.ca[1]) / 2,
        pa = v.pa ? (v.pa[0] + v.pa[1]) / 2 : c;
      if (c >= lvl + 4) v.verdict = 'Would walk into your first XI';
      else if (c >= lvl - 2) v.verdict = 'Good enough to compete for a starting place';
      else if (W.age(p) <= 23 && pa >= lvl + 6) v.verdict = 'One for the future — could become a star';
      else if (c >= lvl - 8) v.verdict = 'Useful squad depth';
      else v.verdict = 'Not at the required level';
    }
    // Moneyball: analytics department highlights undervalued output
    const club = W.userClub();
    if (club && club.facilities.analytics >= 3 && p.season.apps >= 4 && k >= 30) {
      const avg = p.season.rsum / p.season.apps;
      if (avg >= 7.0 && p.value < 4e6)
        v.moneyball = `Analytics flag: averaging ${avg.toFixed(2)} — output of a player worth far more than ${U.money(p.value)}.`;
    }
    v.fee = k >= 20 ? U.roundMoney(FM.Transfers.askPrice(p) * (1 + (rep ? rep.err * 0.1 * unc : 0))) : null;
    // Scout's grade + recommendation (what the scout believes, not the truth)
    if (v.ca) {
      const c = (v.ca[0] + v.ca[1]) / 2,
        pa = v.pa ? (v.pa[0] + v.pa[1]) / 2 : c,
        age = W.age(p);
      let score = c - lvl + Math.max(0, pa - c) * Sc.potentialWeight(age) - (age >= 31 ? (age - 30) * 1.5 : 0);
      if (v.moneyball) score += 3;
      v.score = score;
      v.grade = score >= 4 ? 'A' : score >= -2 ? 'B' : score >= -8 ? 'C' : 'D';
      v.rec = own
        ? null
        : p.loan
          ? 'Monitor'
          : age <= 21 && pa >= lvl + 4 && c < lvl - 3
            ? 'Loan'
            : v.grade === 'A' || v.grade === 'B'
              ? 'Sign'
              : v.grade === 'C'
                ? 'Monitor'
                : 'Avoid';
      const name = p.fn;
      const Q = {
        A: [
          `${name} is the real deal. I'd move now before someone else does.`,
          `Best player I've watched this season. Don't hesitate.`,
          `He'd start for us tomorrow — and he's only getting better.`,
        ],
        B: [
          `A very good player. He'd push for a place straight away.`,
          `Solid, reliable, the kind of signing that wins you points.`,
          `I like him a lot. Worth a serious look.`,
        ],
        C: [
          `Decent — a squad option, not a game-changer.`,
          `He'd do a job, but I wouldn't break the bank.`,
          `Keep him on the list. Not a priority.`,
        ],
        D: [`Not for us, I'm afraid.`, `Honest pro, but not at our level.`, `I'd pass on this one.`],
      };
      v.quote =
        v.rec === 'Loan'
          ? `Not ready for our first team, but the talent is obvious. A loan with an eye on the future makes sense.`
          : Q[v.grade][U.hash(p.id) % 3];
      if (v.rec === 'Sign' && p.clubId && club && v.fee > club.budget * 1.5) {
        v.rec = 'Monitor';
        v.pricey = true;
        v.quote += ` Trouble is, he's well out of our price range.`;
      }
      if (v.traits.includes('Big Game Player') && v.grade !== 'D') v.quote += ' Loves the big occasions, too.';
      if (v.injury && p.hid.inj >= 15) v.quote += ' My one worry is his fitness record.';
    } else {
      v.score = -99;
      v.grade = '?';
      v.rec = 'Scout';
    }
    Sc.deeper(p, v, k);
    return v;
  };
  // What scouting reveals, rung by rung (the report shows what the next rung will add)
  Sc.LADDER = [
    [10, 'an estimate of his ability'],
    [20, 'his stronger foot and second positions'],
    [25, 'an estimate of his potential'],
    [35, 'the role that suits him'],
    [40, 'his attributes, roughly'],
    [50, 'his personality'],
    [55, 'his injury history'],
    [60, 'his traits'],
    [65, 'his situation: happy, unsettled or on his way out'],
    [70, 'his exact attributes'],
    [75, 'hidden attributes: consistency, big games, professionalism'],
    [90, 'his mentality, his wage demands and his agent'],
  ];
  Sc.nextRung = (k) => Sc.LADDER.find(([at]) => at > k) || null;
  Sc.deeper = function (p, v, k) {
    if (k >= 20) {
      v.foot = p.foot;
      v.alt = Object.entries(p.alt || {})
        .filter(([, x]) => x >= 0.8)
        .map(([t]) => t);
    }
    if (k >= 35 && D.ROLES[p.pos]) v.role = FM.bestRole(p, p.pos);
    if (k >= 65) {
      const s = FM.S,
        M = FM.Market;
      v.situation = p.pre
        ? `Has agreed to join ${s.clubs[p.pre.c] ? s.clubs[p.pre.c].name : 'another club'} in the summer`
        : !p.clubId
          ? 'Looking for a club'
          : FM.Transfers.isSettled(p)
            ? 'Settled: he has only just signed or renewed'
            : M.wantsAway(p)
              ? 'Unsettled: he would welcome a move, and his club would sell'
              : p.contract <= s.year
                ? 'Running down his contract: a free in the summer, or a pre-contract now'
                : 'Content where he is';
    }
    if (k >= 90) {
      const h = p.hid,
        word = (x, hi, lo, mid) => (x >= 15 ? hi : x <= 6 ? lo : mid);
      v.mental = [
        word(h.amb, 'Driven to reach the top', 'Happy with his lot', 'Ambitious enough'),
        word(h.loy, 'Fiercely loyal to his club', 'Will go wherever suits him', 'Loyal, within reason'),
        word(h.temp, 'Ice-cool under provocation', 'A short fuse', 'Keeps his head most of the time'),
        word(h.lead, 'A natural leader', 'Keeps himself to himself', 'Talks on the pitch when needed'),
      ];
      const c = FM.S.user && FM.S.clubs[FM.S.user.clubId];
      if (c) v.wageAsk = FM.Transfers.wageDemand(p, c);
      v.agent = FM.Contracts.agentInfo(p);
    }
  };

  // Best targets across all reports, for the scouting home screen and the assistant
  Sc.recommendations = function (limit = 6) {
    const S = FM.S,
      c = W.userClub();
    return Object.keys(S.user.reports)
      .map((id) => S.players[id])
      .filter((p) => p && !W.ownPlayer(p) && !p.retired)
      .map((p) => ({ p, v: Sc.view(p) }))
      .filter(
        ({ v, p }) =>
          ['A', 'B'].includes(v.grade) && (!p.clubId || (v.fee || 0) <= c.budget * 1.25 || v.rec === 'Loan'),
      )
      .sort((a, b) => b.v.score - a.v.score)
      .slice(0, limit);
  };
})();
