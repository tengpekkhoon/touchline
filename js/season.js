// Season loop: matchdays, results, finances, facilities, living world, season end. Player development, youth
// intake and retirement are in careers.js.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const Sea = (FM.Season = {});

  Sea.today = () => FM.S.calendar[FM.S.day];
  // League round the current day belongs to (cup days count as the round they follow)
  Sea.leagueRound = function () {
    const cal = FM.S.calendar;
    for (let d = Math.min(FM.S.day, cal.length - 1); d >= 0; d--) if (cal[d].type === 'league') return cal[d].round;
    return 0;
  };
  // The season's progress on the 22-round scale the calendar was designed on (windows, mid-season review, ...)
  Sea.baseRound = () => W.baseRound(Sea.leagueRound());
  // League games a club's league has played so far (leagues of different sizes play on different days)
  Sea.gamesPlayed = function (clubId) {
    const c = clubId && FM.S.clubs[clubId],
      comp = c && FM.S.comps[c.comp];
    return comp && comp.fixtures ? W.roundsBefore(comp, Sea.leagueRound()) : Sea.baseRound();
  };
  // "Matchday 12" for our league (or the first league with a game that day)
  Sea.matchdayLabel = function (cal) {
    const c = W.employed() && W.userClub(),
      comp = c && FM.S.comps[c.comp];
    const k = comp ? W.roundOn(comp, cal.round) : -1;
    return k >= 0 ? `Matchday ${k + 1}` : comp ? 'Other leagues play' : `Matchday ${cal.round + 1}`;
  };
  Sea.windowOpen = () => {
    const c = Sea.today();
    return !!c && c.type !== 'playoff' && c.type !== 'tourn' && D.WINDOW_ROUNDS.includes(Sea.baseRound());
  };
  Sea.seasonLabel = () => `${FM.S.year}/${String((FM.S.year + 1) % 100).padStart(2, '0')}`;

  // Fixtures played on the current day (creates playoff ties lazily)
  Sea.dayFixtures = function () {
    const S = FM.S,
      cal = Sea.today();
    if (!cal) return [];
    if (cal.type === 'league') {
      return W.leagues().flatMap((c) => W.roundFixtures(c, cal.round) || []);
    }
    if (cal.type === 'cup') return cal.comps.flatMap((id) => FM.Cups.fixturesFor(S.comps[id], cal));
    if (cal.type === 'pre') {
      const plan = S.user.preseason[cal.idx];
      return plan && plan.fx ? [plan.fx] : [];
    }
    if (cal.type === 'intl' || cal.type === 'tourn') return FM.Intl.dayFixtures(cal);
    const out = [];
    for (const c of W.leagues()) {
      const po = c.rules.promote && c.rules.promote.playoff;
      if (!po) continue;
      if (!c.playoff) {
        const t = W.sortedTable(c);
        const seeds = t.slice(po[0] - 1, po[1]).map((r) => r.id);
        c.playoff = { seeds, sf: [], final: null, winner: null };
      }
      const P = c.playoff;
      if ((cal.stage === 'SF' || cal.stage === 'SF1') && !P.sf.length) {
        const s = P.seeds,
          legs = cal.stage === 'SF1';
        // Two legs: the lower seed hosts the first leg, the higher seed the decider
        P.sf = [
          [s[0], s[3]],
          [s[1], s[2]],
        ].map(([hi, lo]) =>
          legs
            ? { id: FM.nextId('f'), comp: c.id, po: 'Semi-final · 1st leg', h: lo, a: hi, res: null, ko: false, leg: 1 }
            : { id: FM.nextId('f'), comp: c.id, po: 'Semi-final', h: hi, a: lo, res: null, ko: true },
        );
      }
      if (cal.stage === 'SF2' && !P.sf2)
        P.sf2 = P.sf.map((f) => ({
          id: FM.nextId('f'),
          comp: c.id,
          po: 'Semi-final · 2nd leg',
          h: f.a,
          a: f.h,
          res: null,
          ko: true,
          leg: 2,
          first: f.id,
        }));
      if (cal.stage === 'SF' || cal.stage === 'SF1') out.push(...P.sf);
      if (cal.stage === 'SF2') out.push(...P.sf2);
      if (cal.stage === 'F') {
        if (!P.final) {
          const w = (P.sf2 || P.sf).map(winnerOf);
          const [h, a] = P.seeds.indexOf(w[0]) < P.seeds.indexOf(w[1]) ? w : [w[1], w[0]];
          P.final = { id: FM.nextId('f'), comp: c.id, po: 'Playoff Final', h, a, res: null, ko: true, neutral: true };
        }
        out.push(P.final);
      }
    }
    return out;
  };
  function winnerOf(fx) {
    const r = fx.res;
    if (r.win === 0 || r.win === 1) return r.win ? fx.a : fx.h;
    if (r.hg !== r.ag) return r.hg > r.ag ? fx.h : fx.a;
    if (!r.pens) return fx.h; // defensive: a tie should always have penalties
    return r.pens[0] > r.pens[1] ? fx.h : fx.a;
  }
  Sea.winnerOf = winnerOf;
  // Our fixture today that is still to be played (once our result is in, the rest of the day can be simulated)
  Sea.userFixture = () => Sea.dayFixtures().find((f) => (W.isMine(f.h) || W.isMine(f.a)) && !f.res) || null;

  Sea.nextUserFixture = function () {
    const S = FM.S;
    for (let d = S.day; d < S.calendar.length; d++) {
      const cal = S.calendar[d];
      if (cal.type !== 'league') continue;
      if (!W.employed()) return null;
      const c = S.comps[W.userClub().comp];
      const fx = (W.roundFixtures(c, cal.round) || []).find((f) => W.isUser(f.h) || W.isUser(f.a));
      if (fx && !fx.res) return fx;
    }
    return null;
  };

  Sea.updTable = function (table, fx, res) {
    const S = FM.S,
      th = table[fx.h],
      ta = table[fx.a];
    th.p++;
    ta.p++;
    th.gf += res.hg;
    th.ga += res.ag;
    ta.gf += res.ag;
    ta.ga += res.hg;
    if (res.hg > res.ag) {
      th.w++;
      ta.l++;
      th.pts += S.rules.win;
      th.form.push('W');
      ta.form.push('L');
    } else if (res.hg < res.ag) {
      ta.w++;
      th.l++;
      ta.pts += S.rules.win;
      th.form.push('L');
      ta.form.push('W');
    } else {
      th.d++;
      ta.d++;
      th.pts++;
      ta.pts++;
      th.form.push('D');
      ta.form.push('D');
    }
    th.form = th.form.slice(-5);
    ta.form = ta.form.slice(-5);
  };

  // ---------- Apply a finished match ----------
  Sea.apply = function (fx, m) {
    const S = FM.S,
      res = m.result();
    fx.res = res;
    const comp = S.comps[fx.comp];
    if (comp.type === 'friendly') return Sea.applyFriendly(fx, m);
    const [hc, ac] = [S.clubs[fx.h], S.clubs[fx.a]];
    if (comp.type === 'league' && !fx.ko && !fx.leg) {
      Sea.updTable(comp.table, fx, res);
      const e = (S.eraLog = S.eraLog || { g: 0, n: 0 });
      e.g += res.hg + res.ag;
      e.n++;
    }
    if (comp.type !== 'league') FM.Cups.onResult(fx);
    const derby = m.derby;
    m.sides.forEach((sd, k) => {
      const won = k ? res.ag > res.hg : res.hg > res.ag,
        lost = k ? res.hg > res.ag : res.ag > res.hg;
      const calm = FM.Matchday.calm(S.players[sd.capt]); // a Leader captain softens a defeat
      for (const pid in sd.mins) {
        const p = S.players[pid];
        const r = sd.rating[pid];
        p.season.apps++;
        p.season.rsum += r;
        p.career.apps++;
        const sp = W.spell(p);
        if (sp && sp.c === sd.club.id) sp.apps++;
        p.form.push(r);
        p.form = p.form.slice(-10);
        p.fitness = Math.round(sd.st[pid] ?? p.fitness);
        p.morale = U.clamp(
          p.morale + (won ? 4 : lost ? -4 * (pid === sd.capt ? 1 : calm) : 0) + (r >= 7.5 ? 3 : r < 5.8 ? -3 : 0),
          0,
          100,
        );
        if (sd.injured[pid]) FM.Injury.hurt(p, { where: 'match', rushed: !!p._riskPlayOn });
        delete p._riskPlayOn;
      }
      if (m.motm && sd.mins[m.motm]) {
        S.players[m.motm].season.motm++;
        S.players[m.motm].morale = Math.min(100, S.players[m.motm].morale + 5);
      }
    });
    res.goals.forEach((g) => {
      const p = S.players[g.pid];
      p.season.goals++;
      p.career.goals++;
      const sp = W.spell(p);
      if (sp) sp.goals++;
      if (derby) {
        p.derbyGoals++;
        p.cult += 3;
      }
      if (g.ast) S.players[g.ast].season.ast++;
    });
    res.cards.forEach((c) => {
      const p = S.players[c.pid];
      if (c.k === 'yellow') {
        p.season.yc++;
        if (p.season.yc % 5 === 0) {
          p.susp = 1;
          p.suspNew = true;
        }
      } else {
        p.season.rc++;
        p.susp = 2;
        p.suspNew = true;
      }
    });
    // store ratings for post-match + archive-worthy upsets
    if (W.isUser(fx.h) || W.isUser(fx.a) || fx.final) {
      fx.ratings = {};
      m.sides.forEach((sd) => {
        for (const pid in sd.mins) fx.ratings[pid] = sd.rating[pid];
      });
    }
    const winner = res.hg > res.ag ? hc : res.ag > res.hg ? ac : null;
    if (winner) {
      const loser = winner === hc ? ac : hc;
      if (loser.rep - winner.rep >= 14) {
        S.seasonLog.upsets.push({
          w: winner.id,
          l: loser.id,
          score: `${res.hg}–${res.ag}`,
          gap: loser.rep - winner.rep,
          comp: fx.comp,
        });
        winner.rep = Math.min(99, winner.rep + 1);
      }
    }
    // fan mood (AI too)
    [hc, ac].forEach((c, k) => {
      const w = k ? res.ag > res.hg : res.hg > res.ag,
        l = k ? res.hg > res.ag : res.ag > res.hg;
      c.fanMood = U.clamp(c.fanMood + (w ? 5 : l ? -5 : 0) * (derby ? 2 : 1), 0, 100);
    });
    FM.Contracts.matchBonuses(fx, res, m.sides);
    FM.Records.onMatch(fx, res);
    Sea.noteResult(fx, res);
    if (W.isUser(fx.h) || W.isUser(fx.a)) Sea.userMatchAftermath(fx, m);
    else FM.Stories.worldMatch(fx, m);
  };

  // The user's club spending this season, by kind (Finances tab)
  Sea.spend = function (k, v) {
    const log = FM.S.seasonLog;
    if (!log || !v) return;
    log.spend = log.spend || {};
    log.spend[k] = (log.spend[k] || 0) + v;
  };
  // Last competitive result per club (shown on the next opponent's match card)
  Sea.noteResult = function (fx, res) {
    const S = FM.S;
    [
      [fx.h, fx.a, res.hg, res.ag],
      [fx.a, fx.h, res.ag, res.hg],
    ].forEach(([id, opp, gf, ga]) => {
      const c = S.clubs[id];
      if (c)
        c.lastResult = {
          opp,
          gf,
          ga,
          pens: res.pens ? (id === fx.h ? res.pens : [res.pens[1], res.pens[0]]) : null,
          comp: fx.comp,
          year: S.year,
          day: S.day,
        };
    });
  };
  Sea.applyFriendly = function (fx, m) {
    const S = FM.S,
      side = W.isUser(fx.h) ? 0 : 1,
      sd = m.sides[side],
      club = sd.club,
      opp = m.sides[1 - side].club;
    fx.ratings = {};
    m.sides.forEach((x) => {
      for (const pid in x.mins) fx.ratings[pid] = x.rating[pid];
    });
    for (const pid in sd.mins) {
      const p = S.players[pid];
      p.fitness = Math.round(Math.max(p.fitness, sd.st[pid] ?? p.fitness));
      p.morale = U.clamp(p.morale + (sd.rating[pid] >= 7.2 ? 3 : 0), 0, 100);
    }
    const gate =
      side === 0 ? Math.round(club.stadium.cap * 0.45 * (12 + opp.rep * 0.3)) : Math.round(2e5 + opp.rep * 1.5e4);
    club.balance += gate;
    S.user.tactic.fam = Math.min(100, (S.user.tactic.fam || 50) + 6);
    S.user.lastMatch = { fxId: fx.id, comp: fx.comp };
    const gf = sd.goals,
      ga = m.sides[1 - side].goals;
    FM.News.add({
      type: 'club',
      title: `Friendly: ${S.clubs[fx.h].short} ${fx.res.hg}–${fx.res.ag} ${S.clubs[fx.a].short}`,
      body: `${gf > ga ? 'A confident win' : gf < ga ? 'A useful workout, if not the result we wanted' : 'An even contest'} against ${opp.name}. Tactical familiarity improved. Match income ${U.money(gate)}. Player of the match: ${W.name(S.players[fx.res.motm])}.`,
      clubId: club.id,
      fxId: fx.id,
    });
  };

  // ----- Pre-season planning (3 slots: friendly or camp) -----
  Sea.friendlyOptions = function () {
    const S = FM.S,
      uc = W.userClub(),
      used = Object.values(S.user.preseason).map((x) => x.opp);
    const pool = Object.values(S.clubs).filter((c) => !W.isUser(c.id) && !used.includes(c.id));
    const pick = (f) => U.shuffle(pool.filter(f))[0];
    return [
      pick((c) => c.rep >= uc.rep + 6 && c.nat !== uc.nat) || pick((c) => c.rep >= uc.rep + 4),
      pick((c) => Math.abs(c.rep - uc.rep) <= 6 && c.nat !== uc.nat),
      pick((c) => c.rep < uc.rep - 5 && c.nat === uc.nat) || pick((c) => c.rep < uc.rep - 5),
      pick((c) => c.sim === 'minimal'),
    ]
      .filter(Boolean)
      .filter((c, i, a) => a.indexOf(c) === i);
  };
  Sea.bookFriendly = function (idx, oppId, home) {
    const S = FM.S,
      u = W.userClub().id;
    S.user.preseason[idx] = {
      type: 'friendly',
      opp: oppId,
      fx: {
        id: FM.nextId('f'),
        comp: 'FR',
        h: home ? u : oppId,
        a: home ? oppId : u,
        res: null,
        po: 'Pre-season friendly',
      },
    };
  };
  Sea.bookCamp = function (idx, key) {
    FM.S.user.preseason[idx] = { type: 'camp', key };
  };
  Sea.runCamp = function (key) {
    const S = FM.S,
      c = W.userClub(),
      camp = D.CAMPS[key],
      sq = W.squad(c.id);
    c.balance -= camp.cost;
    if (key === 'fitness')
      sq.forEach((p) => {
        p.fitness = 100;
        if (Math.random() < 0.5) p.attrs.stamina = Math.min(20, p.attrs.stamina + 0.4);
        W.refresh(p);
      });
    if (key === 'tactical') S.user.tactic.fam = Math.min(100, (S.user.tactic.fam || 50) + 25);
    if (key === 'youth')
      sq.filter((p) => W.age(p) <= 21).forEach((p) =>
        Sea.applyGrowth(p, Math.max(0, Math.min(3, (p.pa - p.ca) * 0.15))),
      );
    if (key === 'tour') {
      sq.forEach((p) => (p.fitness = Math.max(70, p.fitness - 12)));
      c.fanMood = Math.min(100, c.fanMood + 6);
      c.rep = Math.min(99, c.rep + 0.5);
    }
    sq.forEach((p) => (p.morale = Math.min(100, p.morale + (key === 'tour' ? 1 : 3))));
    FM.News.add({
      type: 'club',
      title: `${camp.icon} ${camp.name} complete`,
      body: `${camp.desc} ${camp.cost > 0 ? 'Cost ' + U.money(camp.cost) : 'Income ' + U.money(-camp.cost)}.`,
      clubId: c.id,
    });
  };

  Sea.userMatchAftermath = function (fx, m) {
    const S = FM.S,
      u = S.user,
      club = W.userClub();
    const side = W.isUser(fx.h) ? 0 : 1,
      sd = m.sides[side],
      op = m.sides[1 - side];
    const r = fx.res,
      gf = side ? r.ag : r.hg,
      ga = side ? r.hg : r.ag;
    const won = gf > ga || (r.pens && r.pens[side] > r.pens[1 - side]),
      lost = ga > gf || (r.pens && r.pens[side] < r.pens[1 - side]);
    u.stats.games++;
    won ? u.stats.w++ : lost ? u.stats.l++ : u.stats.d++;
    if (won && op.club.rep - club.rep >= 12) u.stats.giantKills++;
    u.rep = U.clamp(u.rep + (won ? 0.6 : lost ? -0.4 : 0.1) + (won && op.club.rep > club.rep ? 0.5 : 0), 1, 99);
    // youth debuts
    for (const pid in sd.mins) {
      const p = S.players[pid];
      if (p.youth === club.id && p.career.apps === 1 && !p.debuted) {
        p.debuted = true;
        u.stats.youthDebuts++;
      }
    }
    // board confidence vs expectation
    const exp = Sea.expectedPos(club),
      pos = W.position(club.id);
    const target = U.clamp(62 + (exp - pos) * 7, 15, 95);
    club.boardConf = U.clamp(
      club.boardConf +
        (target - club.boardConf) * 0.1 +
        (won ? 1.5 : lost ? -1.5 : 0) +
        (m.derby ? (won ? 4 : lost ? -4 : 0) : 0),
      0,
      100,
    );
    if (club.identity === 'fan' && gf >= 3) club.fanMood = Math.min(100, club.fanMood + 3);
    u.lastMatch = { fxId: fx.id, comp: fx.comp };
    u.tactic.fam = Math.min(
      100,
      (u.tactic.fam || 50) + Math.max(0.5, (100 - (u.tactic.fam || 50)) * 0.06) * FM.People.badgeBonus(),
    );
    FM.Stories.userMatch(fx, m, side);
  };

  Sea.expectedPos = function (club) {
    const comp = FM.S.comps[club.comp];
    return (
      comp.clubs
        .map((id) => FM.S.clubs[id])
        .sort((a, b) => b.rep - a.rep)
        .findIndex((c) => c.id === club.id) + 1
    );
  };

  Sea.objectives = function (club = W.userClub()) {
    const comp = FM.S.comps[club.comp],
      exp = Sea.expectedPos(club),
      n = comp.clubs.length;
    const out = [],
      R = comp.rules,
      rel = R.relegate ? R.relegate.n : 0;
    if (!R.promote) {
      if (exp <= 1) out.push({ id: 'pos', text: `Win ${comp.name}`, target: 1 });
      else if (exp <= 3) out.push({ id: 'pos', text: 'Finish in the top 3', target: 3 });
      else if (exp <= Math.ceil(n / 2))
        out.push({ id: 'pos', text: 'Finish in the top half', target: Math.ceil(n / 2) });
      else if (rel) out.push({ id: 'pos', text: 'Avoid relegation', target: n - rel });
      else out.push({ id: 'pos', text: 'Avoid finishing bottom', target: n - 1 });
    } else {
      if (exp <= 2) out.push({ id: 'pos', text: 'Win promotion', target: 2, promo: true });
      else if (exp <= R.promote.playoff[1])
        out.push({ id: 'pos', text: 'Reach the playoffs', target: R.promote.playoff[1] });
      else if (rel && exp > n - rel) out.push({ id: 'pos', text: 'Avoid relegation', target: n - rel });
      else out.push({ id: 'pos', text: 'Finish in the top half', target: Math.ceil(n / 2) + 1 });
    }
    const idObj = {
      youth: { id: 'youth', text: 'Give 3 academy graduates 5+ appearances' },
      fan: { id: 'goals', text: 'Play attacking football — 1.6+ goals per game' },
      selling: { id: 'profit', text: 'Make a net transfer profit' },
      oil: { id: 'goals', text: 'Dominate — 2+ goals per game' },
      giant: { id: 'derby', text: "Don't lose the derby" },
      fallen: { id: 'pos2', text: 'Show the club is rising again' },
      historic: { id: 'derby', text: "Don't lose the derby" },
    }[club.identity];
    if (idObj) out.push(idObj);
    const cc = W.continentals().find((c) => c.clubs.includes(club.id));
    if (cc) out.push({ id: 'cc', text: `Reach the ${cc.name} semi-finals`, cc: cc.id });
    return out.map((o) => ({ ...o, ...Sea.objProgress(o, club) }));
  };
  Sea.objProgress = function (o, club) {
    const S = FM.S,
      row = S.comps[club.comp].table[club.id],
      pos = W.position(club.id);
    if (o.id === 'pos') return { ok: pos <= o.target, status: `Currently ${U.ordinal(pos)}` };
    if (o.id === 'youth') {
      const n = W.squad(club.id).filter((p) => p.youth === club.id && p.season.apps >= 5).length;
      return { ok: n >= 3, status: `${n}/3 so far` };
    }
    if (o.id === 'goals') {
      const t = club.identity === 'oil' ? 2 : 1.6,
        gpg = row.p ? row.gf / row.p : 0;
      return { ok: gpg >= t, status: `${gpg.toFixed(2)} per game` };
    }
    if (o.id === 'profit') {
      const n = S.seasonLog.net[club.id] || 0;
      return { ok: n >= 0, status: `Net ${U.money(n)}` };
    }
    if (o.id === 'derby') {
      const lost = FM.Cups.allFixtures().filter(
        (f) =>
          f.res &&
          ((f.h === club.id && f.a === club.rival && f.res.hg < f.res.ag) ||
            (f.a === club.id && f.h === club.rival && f.res.ag < f.res.hg)),
      ).length;
      return { ok: lost === 0, status: lost ? `Lost ${lost}` : 'Unbeaten' };
    }
    if (o.id === 'cc') {
      const st = FM.Cups.status(club.id).find((x) => x.c.id === o.cc);
      return {
        ok:
          !!st &&
          (['Semi-finals', 'Final', 'Winners'].includes(st.text) ||
            (st.text === 'Knocked out' && S.comps[o.cc].ko.sf.some((f) => f.h === club.id || f.a === club.id))),
        status: st ? st.text : '',
      };
    }
    if (o.id === 'pos2') {
      const exp = Sea.expectedPos(club);
      return { ok: pos <= exp, status: `${U.ordinal(pos)} (expected ${U.ordinal(exp)})` };
    }
    return { ok: false, status: '' };
  };

  // Apply the user's finished match on its own, so the rest of the day can be simulated elsewhere
  // (Web Worker). Sea.advance(null) then skips the fixture because it already has a result.
  Sea.applyUserMatch = function (m) {
    const S = FM.S,
      fx = Sea.userFixture(),
      today = Sea.today();
    if (!fx || fx.res || !m) return;
    if (today && today.type === 'league' && S.user && !S.user.sacked) S.digestSnap = FM.Matchday.snapshot();
    if (fx.intl) FM.Intl.applyFixture(fx, m);
    else Sea.apply(fx, m);
  };
  // A decision waiting in today's feed (stops a multi-day skip)
  Sea.pendingDecision = () =>
    FM.S.news.some(
      (n) =>
        n.day === FM.S.day &&
        n.year === FM.S.year &&
        ((n.type === 'bid' && n.data.status === 'open') ||
          ((n.type === 'press' || n.type === 'meeting') && !n.resolved)),
    );
  // What the day about to be played is called (progress indicator)
  Sea.dayLabel = function () {
    const S = FM.S,
      c = Sea.today();
    if (!c) return 'Season';
    if (S.day === S.calendar.length - 1) return 'Final day — then awards, retirements and the new season';
    return c.type === 'league'
      ? Sea.matchdayLabel(c)
      : c.type === 'cup'
        ? c.world
          ? 'Club World Cup'
          : c.stage
            ? 'Continental night'
            : 'Cup day'
        : c.type === 'pre'
          ? 'Pre-season'
          : c.type === 'intl'
            ? 'International break'
            : c.type === 'tourn'
              ? 'Summer finals'
              : 'Playoffs';
  };
  // Sim through days without a match of ours; stop for our next fixture, a decision in the feed,
  // a transfer window opening or closing, or the season's end
  // A generator (yields [daysDone, label] before each day) so a caller can pause between days to draw progress
  Sea.skipSteps = function* () {
    const S = FM.S;
    let summary = null,
      n = 0,
      winChange = false;
    const win0 = Sea.windowOpen(),
      seen = new Set((S.user.offers || []).map((o) => o.id)),
      employed0 = W.employed();
    // Out of work: stop for any offer that wasn't on the table when the wait began (the window doesn't matter)
    const newOffer = () => !W.employed() && (S.user.offers || []).some((o) => !seen.has(o.id));
    do {
      yield [n, Sea.dayLabel()];
      summary = Sea.advance(null);
      n++;
      winChange = !summary && employed0 && Sea.windowOpen() !== win0;
    } while (
      !summary &&
      !winChange &&
      !Sea.userFixture() &&
      !S.user.sacked &&
      W.employed() === employed0 &&
      !newOffer() &&
      Sea.today() &&
      (Sea.today().type !== 'pre' || !W.employed()) &&
      n < (W.employed() ? 12 : 21) &&
      !Sea.pendingDecision()
    );
    return { summary, n, winChange, win0, pending: !summary && Sea.pendingDecision(), newOffer: newOffer() };
  };
  Sea.skipToMatch = function (onDay) {
    const it = Sea.skipSteps();
    let r;
    while (!(r = it.next()).done) onDay && onDay(...r.value);
    return r.value;
  };

  // ---------- Advance one matchday ----------
  // userMatch: finished FM.Match for the user's fixture (or null if none today)
  Sea.advance = function (userMatch) {
    const S = FM.S;
    const today = Sea.today();
    if (today && today.type === 'pre') {
      const plan = S.user.preseason[today.idx];
      if (plan && plan.type === 'camp') Sea.runCamp(plan.key);
    }
    const fxs = Sea.dayFixtures();
    // Table before the round (taken earlier if our own result was applied ahead of the rest)
    const employed = W.employed() && !S.user.sacked;
    const snap = S.digestSnap || (today && today.type === 'league' && employed ? FM.Matchday.snapshot() : null);
    delete S.digestSnap;
    for (const fx of fxs) {
      if (fx.res) continue;
      const mine = W.isMine(fx.h) || W.isMine(fx.a);
      if (fx.intl) {
        FM.Intl.applyFixture(fx, mine && userMatch ? userMatch : FM.Intl.sim(fx));
        continue;
      }
      // Light and minimal leagues resolve their round-robin fixtures without the match engine
      const sim = !fx.ko && !fx.leg && S.comps[fx.comp].type === 'league' ? W.simOf(fx.comp) : 'full';
      if (sim !== 'full' && !mine) {
        FM.Tiers.play(fx, sim);
        continue;
      }
      const m = mine && userMatch ? userMatch : FM.quickSim(fx, !!fx.ko);
      Sea.apply(fx, m);
    }
    if (today && (today.type === 'intl' || today.type === 'tourn')) FM.Intl.afterDay(today);
    if (snap && !(S.settings || {}).noDigest) FM.Matchday.digest(today, snap);
    if (today && today.type === 'league') FM.Records.afterLeagueDay(today);
    // weekly processes
    Object.values(S.players).forEach((p) => {
      if (p.retired) return;
      p.fitness = Math.min(100, p.fitness + 30 + (p.attrs.stamina - 10));
      if (p.susp && !p.suspNew) p.susp--;
      delete p.suspNew;
    });
    FM.Injury.daily(); // rehab countdowns, returns, training knocks and illness
    Sea.minimalSimWeek();
    Sea.freeAgents();
    if (employed) Sea.ensureUserSquad(14);
    Sea.ensureKeepers();
    Sea.finances();
    if (employed) Sea.userMorale();
    if (S.day % 4 === 3) {
      const frac = 1 / Math.floor(S.calendar.length / 4);
      Object.values(S.players).forEach((p) => !p.retired && Sea.develop(p, frac));
    } // one year of growth per season, whatever its length
    if (employed) FM.Scouting.tick();
    if (Sea.windowOpen()) {
      FM.Transfers.aiWindow();
      if (employed) {
        FM.Transfers.aiBidsForUser();
        FM.Contracts.releaseClauses();
      }
    }
    FM.People.tick();
    const cd = Sea.today();
    if (cd && cd.type === 'league' && cd.round === W.scaleRound(D.YOUTH_ROUND)) Sea.youthIntake();
    if (employed) {
      Sea.facilities();
      Sea.boardCheck();
    }
    FM.Stories.daily();
    S.day++;
    // A sacking takes effect once the day is done: the club appoints a successor and you are out of work
    const summary = S.day >= S.calendar.length ? Sea.endSeason() : null;
    if (S.user.sacked) W.goUnemployed('sacked');
    else if (!W.employed()) Sea.jobMarket();
    else if (!summary) FM.Injury.riskHim(Sea.userFixture()); // a key man nearly fit before a big game
    return summary;
  };

  // ---------- Out of work: the job market ----------
  // Offers come from clubs in your reputation range, more often from ones that are struggling. Each lasts a
  // week or so; up to three at a time. `initial` fills the list straight away (a sacking, a career start).
  Sea.dayIndex = () => FM.S.year * 1000 + FM.S.day;
  Sea.jobMarket = function (initial) {
    const S = FM.S,
      u = S.user;
    if (!u || W.employed()) return;
    const now = Sea.dayIndex();
    u.offers = (u.offers || []).filter((o) => o.until > now && S.clubs[o.id]);
    if (u.offers.length >= 3 || (!initial && Math.random() > 0.3)) return;
    const taken = new Set(u.offers.map((o) => o.id)),
      justLeft = u.unemployed && u.unemployed.since === S.year ? u.unemployed.from : null;
    const lower = (c) =>
      c.sim === 'light' &&
      S.comps[c.comp] &&
      S.comps[c.comp].tier > 1 &&
      S.comps[c.comp].nat === c.nat &&
      ['ENG', 'ESP'].includes(c.nat); // League One, Segunda
    const pool = Object.values(S.clubs).filter(
      (c) =>
        (c.sim === 'full' || lower(c)) &&
        c.comp &&
        !taken.has(c.id) &&
        c.id !== justLeft &&
        c.rep <= u.rep + 14 &&
        c.rep >= u.rep - 30,
    );
    for (let i = initial ? 3 : 1; i > 0 && pool.length; i--) {
      const c = U.wpick(
        pool,
        (x) => (100 - x.boardConf + 20 - Math.abs(x.rep - u.rep) * 0.5) * (x.id === u.favClub ? 3 : 1),
      ); // your boyhood club keeps an eye on you
      pool.splice(pool.indexOf(c), 1);
      u.offers.push({
        id: c.id,
        until: now + U.randi(5, 10),
        why: c.boardConf < 45 ? 'struggling' : c.rep > u.rep + 5 ? 'step up' : 'fresh start',
      });
      if (!initial)
        FM.News.add({
          type: 'board',
          title: `Job offer: ${c.name} want you as manager`,
          body: `${c.boardConf < 45 ? 'Results have been poor and the board want a change.' : 'The board think you are the right person to take the club forward.'} The offer stands for about a week.`,
          clubId: c.id,
        });
    }
  };

  // Every club keeps at least two goalkeepers (squads are topped up by headcount, which never guaranteed a
  // keeper: over long saves clubs ended up with an outfield player in goal and goals per game crept up).
  // Missing keepers are signed from free agents, or a young keeper is brought through.
  Sea.ensureKeepers = function () {
    const S = FM.S;
    let freeGK = null;
    for (const c of Object.values(S.clubs)) {
      if (c.sim === 'minimal' && !c.comp) continue;
      const sq = W.squad(c.id),
        keepers = sq.filter((p) => p.pos === 'GK');
      // three for fully simulated clubs (two can both be injured or banned), two elsewhere; and never none fit
      const need = Math.max(c.sim === 'full' ? 3 : 2, keepers.some(W.available) ? 0 : keepers.length + 1);
      let n = keepers.length;
      if (n >= need) continue;
      const user = W.isUser(c.id),
        signed = [];
      while (n < need) {
        if (!freeGK) freeGK = Object.values(S.players).filter((p) => !p.clubId && !p.retired && p.pos === 'GK');
        const level = W.levelFor(c.rep);
        const fa = freeGK.filter((p) => !p.clubId && p.ca >= level - 20).sort((a, b) => b.ca - a.ca)[0];
        let p = fa;
        if (p) {
          W.startSpell(p, c.id);
          p.wage = W.wageFor(p);
          p.contract = S.year + 1;
          if (!user) FM.Contracts.aiDeal(p, c);
        } else {
          p = W.genPlayer({
            nat: W.natFor ? W.natFor(c) : c.nat,
            pos: 'GK',
            age: U.randi(19, 23),
            ca: Math.round(level - 10),
            pa: W.potentialFor(level - 10, 21),
            clubId: c.id,
          });
          S.players[p.id] = p;
          p.contract = S.year + 2;
        }
        n++;
        signed.push(p);
      }
      if (user)
        FM.News.add({
          type: 'club',
          title: `Emergency signing: ${signed.map((p) => W.name(p)).join(' and ')} (GK)`,
          body: `Short of fit goalkeepers, the sporting director has brought in cover on a short deal.`,
          clubId: c.id,
          pids: signed.map((p) => p.id),
        });
    }
  };

  // The user's club never runs out of players: under `min` (18 for a new season, 14 at any time), the sporting
  // director signs free agents on one-year deals, or promotes youngsters when none fit, and says so in the feed
  Sea.ensureUserSquad = function (min) {
    const S = FM.S,
      c = S.user && !S.user.sacked && W.userClub();
    if (!c) return;
    const sq = W.squad(c.id);
    if (sq.length >= min) return;
    const want = D.SQUAD_TIER.full,
      level = W.levelFor(c.rep),
      signed = [];
    while (sq.length < min) {
      const counts = {};
      sq.forEach((p) => (counts[p.pos] = (counts[p.pos] || 0) + 1));
      const pos = Object.keys(want).find((k) => (counts[k] || 0) < want[k]) || U.pick(D.POS);
      const fa = Object.values(S.players)
        .filter((p) => !p.clubId && !p.retired && p.pos === pos && p.ca >= level - 18)
        .sort((a, b) => b.ca - a.ca)[0];
      let p = fa;
      if (p) {
        W.startSpell(p, c.id);
        p.wage = W.wageFor(p);
      } else {
        p = W.genPlayer({
          nat: c.nat,
          pos,
          age: U.randi(18, 20),
          ca: Math.round(level - 15),
          pa: W.potentialFor(level - 15, 19),
          clubId: c.id,
        });
        p.youth = c.id;
        S.players[p.id] = p;
      }
      p.contract = S.year + 1;
      sq.push(p);
      signed.push(p);
    }
    FM.News.add({
      type: 'club',
      title: `Sporting director makes up the numbers: ${signed.length} signing${signed.length === 1 ? '' : 's'}`,
      body: `With only ${sq.length - signed.length} players under contract, the club has added ${signed.map((p) => `${W.name(p)} (${p.pos}${p.youth === c.id ? ', academy' : ''})`).join(', ')} on one-year deals. Renew contracts before they expire to keep control of your squad.`,
      clubId: c.id,
      pids: signed.map((p) => p.id),
    });
  };

  // Free agents: released players look for a club at their level, and clubs with room sign them any day of the
  // season (no window needed for a free agent). The longer a player waits, the further down he'll go; veterans
  // who find nothing retire in the summer, and anyone unattached for a whole season drops out of the game.
  Sea.freeAgents = function () {
    const S = FM.S,
      now = Sea.dayIndex();
    const pool = Object.values(S.players).filter((p) => !p.clubId && !p.retired);
    if (!pool.length) return;
    const clubs = Object.values(S.clubs).filter((c) => !W.isUser(c.id));
    const room = new Map(clubs.map((c) => [c.id, W.squadTarget(c) - W.squad(c.id).length])); // a real gap in the squad
    for (const p of U.shuffle(pool)) {
      if (p.freeSince == null) p.freeSince = now;
      if (Math.random() > (0.12 * 55) / S.calendar.length) continue; // agents take their time; clubs have other priorities (rate per week, whatever the calendar)
      const waited = (S.year - Math.floor(p.freeSince / 1000)) * S.calendar.length + S.day - (p.freeSince % 1000);
      const lower = 8 + Math.min(14, waited * 0.4),
        want = D.SQUAD_TIER;
      const fits = clubs.filter((c) => {
        if (room.get(c.id) <= 0) return false;
        const lvl = W.levelFor(c.rep);
        if (p.ca < lvl - lower || p.ca > lvl + 4) return false;
        const same = W.squad(c.id).filter((q) => q.pos === p.pos).length;
        return same < ((want[c.sim] || want.full)[p.pos] || 2);
      });
      if (!fits.length) continue;
      const c = fits.sort((a, b) => b.rep - a.rep)[Math.floor(Math.random() * Math.min(3, fits.length))];
      FM.Transfers.execute(p, c.id, 0, FM.Transfers.wageDemand(p, c));
      p.contract = S.year + (W.age(p) >= 30 ? 1 : U.randi(1, 2));
      delete p.freeSince;
      room.set(c.id, room.get(c.id) - 1);
    }
  };

  // Overseas (minimal simulation) clubs: synthetic appearances so scouts see form & stats
  Sea.minimalSimWeek = function () {
    const S = FM.S;
    Object.values(S.clubs)
      .filter((c) => c.sim === 'minimal' && !c.comp)
      .forEach((c) => {
        // league clubs get stats from their fixtures
        const sq = W.squad(c.id)
          .sort((a, b) => b.ca - a.ca)
          .slice(0, 13);
        const avg = U.avg(sq, (p) => p.ca);
        sq.forEach((p) => {
          if (p.inj || Math.random() < 0.15) return;
          const r = Math.round(U.clamp(U.gauss(6.6 + (p.ca - avg) / 15, 0.6), 4.5, 9.8) * 10) / 10;
          p.season.apps++;
          p.season.rsum += r;
          p.career.apps++;
          const sp = W.spell(p);
          if (sp) sp.apps++;
          p.form.push(r);
          p.form = p.form.slice(-10);
          if (Math.random() < ({ ST: 0.4, W: 0.22, AM: 0.2, CM: 0.08 }[p.pos] || 0.03) * (p.attrs.finishing / 12)) {
            p.season.goals++;
            p.career.goals++;
            if (sp) sp.goals++;
          }
        });
      });
  };

  Sea.finances = function () {
    const S = FM.S,
      todays = Sea.dayFixtures();
    const wageBill = {};
    Object.values(S.players).forEach((p) => {
      if (!p.clubId || p.retired) return;
      if (p.loan) {
        wageBill[p.clubId] = (wageBill[p.clubId] || 0) + p.wage * p.loan.share;
        wageBill[p.loan.from] = (wageBill[p.loan.from] || 0) + p.wage * Math.max(0, 1 - p.loan.share);
      } else wageBill[p.clubId] = (wageBill[p.clubId] || 0) + p.wage;
    });
    const days = S.calendar.length,
      wk = D.WAGE_WEEKS / days;
    Object.values(S.clubs).forEach((c) => {
      if (c.sim !== 'full') return;
      const comp = S.comps[c.comp];
      const R = Sea.revenuePotential(c);
      // Broadcast (division-weighted) + commercial arrive every matchday; gate only on home days
      let inc =
        (R * 0.33 * (comp.tier === 1 ? 1 : comp.tier === 2 ? 0.7 : 0.5) * (comp.tvBoost || 1) +
          R * 0.25 * (1 + (c.facilities.fanzone - 1) * 0.06)) /
        days;
      const home = todays.some((f) => f.h === c.id && !f.neutral);
      if (home) {
        const fill = U.clamp(0.5 + c.rep / 300 + c.fanMood / 400, 0.3, 1);
        const homes = Math.max(6, (comp.fixtures ? comp.fixtures.length / 2 : 11) + 2);
        inc += ((R * 0.42) / homes) * (fill / 0.9) * (c.stadium.cap / (c.stadium.cap0 || c.stadium.cap));
      }
      const staffW = W.isUser(c.id) ? U.sum(W.userStaff(), (st) => st.wage) * wk : 0;
      const wages = (wageBill[c.id] || 0) * wk + staffW;
      if (W.isUser(c.id)) {
        Sea.spend('wages', wages - staffW);
        Sea.spend('staff', staffW);
      }
      c.balance += inc - wages;
      if (W.isUser(c.id)) {
        const bonuses = S.user.bonusesToday || 0; // appearance/goal bonuses were paid as matches finished
        S.user.bonusesToday = 0;
        c.ledger.push({ day: S.day, inc: Math.round(inc), exp: Math.round(wages + bonuses) });
        c.ledger = c.ledger.slice(-40);
      }
    });
  };

  // A club's season revenue potential. Wages rise ~exponentially with quality (value ∝ 1.13^CA,
  // CA ≈ 25 + 0.58·rep), so revenue follows the same curve: ~$55M at rep 88, ~$8M at rep 60.
  Sea.revenuePotential = (c) => 55e6 * Math.exp(0.071 * (c.rep - 88));

  Sea.userMorale = function () {
    const club = W.userClub();
    const sq = W.squad(club.id).sort((a, b) => b.ca - a.ca);
    // The captain's mood spreads: a happy one lifts the dressing room's resting point, an unhappy one drags it
    const capt = FM.Matchday.captainOf(club.id),
      rest = !capt ? 65 : capt.morale >= 75 ? 68 : capt.morale < 35 ? 59 : 65;
    sq.forEach((p, i) => {
      if (i < 13 && p.season.apps < Math.floor(Sea.gamesPlayed(p.clubId) * 0.4) && !p.inj) {
        p.morale = Math.max(0, p.morale - (p.hid.amb >= 14 ? 3 : 1.5));
        if (p.morale < 35 && !p.flagMinutes) {
          p.flagMinutes = true;
          FM.People.requestMeeting(p, 'minutes');
        }
      } else p.morale = U.lerp(p.morale, rest, 0.05);
    });
  };

  // ---------- Facilities ----------
  Sea.FAC = {
    training: { name: 'Training Ground', icon: '🏋️', effect: 'Faster player development' },
    academy: { name: 'Youth Academy', icon: '🌱', effect: 'Better & more youth intake prospects' },
    medical: { name: 'Medical Centre', icon: '🩺', effect: 'Shorter injury layoffs' },
    analytics: { name: 'Analytics Dept.', icon: '📊', effect: 'Moneyball insights in scout reports' },
    stadium: { name: 'Stadium', icon: '🏟️', effect: '+6,000 capacity per level' },
    fanzone: { name: 'Fan Zone', icon: '🎉', effect: 'Commercial income & fan mood' },
    museum: { name: 'Club Museum', icon: '🏛️', effect: 'Reputation & honours legends' },
  };
  Sea.facCost = (k, lvl) => Math.round(((k === 'stadium' ? 9e6 : 2.2e6) * Math.pow(lvl, 1.5)) / 1e5) * 1e5;
  Sea.facWeeks = (k, lvl) => (k === 'stadium' ? 8 : 3) + lvl * 2;
  Sea.upgrade = function (k) {
    const c = W.userClub(),
      lvl = c.facilities[k];
    if (lvl >= 5 || c.building) return false;
    const cost = Sea.facCost(k, lvl);
    if (c.balance < cost) return false;
    c.balance -= cost;
    c.building = { k, weeks: Sea.facWeeks(k, lvl) };
    return true;
  };
  Sea.facilities = function () {
    const c = W.userClub();
    if (!c.building) return;
    if (--c.building.weeks <= 0) {
      const k = c.building.k;
      c.facilities[k]++;
      if (k === 'stadium') FM.Records.expandStadium(c, 6000, 'New stand');
      if (k === 'museum') c.rep = Math.min(99, c.rep + 1);
      FM.News.add({
        type: 'club',
        title: `${Sea.FAC[k].name} upgrade complete`,
        body: `${Sea.FAC[k].icon} Now level ${c.facilities[k]}. ${Sea.FAC[k].effect}.`,
        clubId: c.id,
      });
      delete c.building;
    }
  };

  Sea.boardCheck = function () {
    const S = FM.S,
      c = W.userClub();
    const firstSeason = (S.user.joinedClubYear || S.user.joined) === S.year;
    if (FM.People.ultimatumFailed()) S.user.sacked = true;
    else if (
      !firstSeason &&
      FM.Season.baseRound() >= 14 &&
      c.boardConf < 10 &&
      W.position(c.id) > Sea.expectedPos(c) + 3 &&
      !S.user.sacked
    ) {
      S.user.sacked = true;
    } else if (S.day > 6 && c.boardConf < 30 && !c.warned) {
      c.warned = true;
      FM.News.add({
        type: 'board',
        title: 'The board are concerned',
        body: 'Results are well below expectations. The chairman wants to see immediate improvement.',
        clubId: c.id,
      });
    }
  };

  // ---------- Season end ----------
  Sea.endSeason = function () {
    const S = FM.S,
      log = S.seasonLog,
      club = W.userClub();
    const entry = {
      year: S.year,
      label: Sea.seasonLabel(),
      comps: {},
      promoted: [],
      relegated: [],
      upsets: log.upsets.sort((a, b) => b.gap - a.gap).slice(0, 3),
      transfers: log.transfers.sort((a, b) => b.fee - a.fee).slice(0, 5),
      user: club ? { club: club.id } : null,
    };
    const moves = [];
    const userCompId = club && club.comp,
      objs = club ? Sea.objectives(club) : [];
    const qualified = {};
    for (const comp of W.leagues()) {
      const t = W.sortedTable(comp);
      const players = Object.values(S.players).filter(
        (p) => !p.retired && p.clubId && S.clubs[p.clubId].comp === comp.id,
      );
      const top = players.slice().sort((a, b) => b.season.goals - a.season.goals)[0];
      const poty = players
        .filter((p) => p.season.apps >= 12)
        .sort((a, b) => b.season.rsum / b.season.apps - a.season.rsum / a.season.apps)[0];
      const ypoty = players
        .filter((p) => W.age(p) <= 21 && p.season.apps >= 8)
        .sort((a, b) => b.season.rsum / b.season.apps - a.season.rsum / a.season.apps)[0];
      entry.comps[comp.id] = {
        name: comp.name,
        sim: comp.sim || 'full',
        nat: comp.nat,
        champion: t[0].id,
        runnerUp: t[1].id,
        table: t.map((r) => ({ id: r.id, pts: r.pts, gd: r.gd })),
        topScorer: top && { pid: top.id, name: W.name(top), club: top.clubId, goals: top.season.goals },
        poty: poty && {
          pid: poty.id,
          name: W.name(poty),
          club: poty.clubId,
          avg: +(poty.season.rsum / poty.season.apps).toFixed(2),
        },
        ypoty: ypoty && { pid: ypoty.id, name: W.name(ypoty), club: ypoty.clubId },
      };
      const champ = S.clubs[t[0].id];
      champ.titles[comp.id] = (champ.titles[comp.id] || 0) + 1;
      champ.rep = Math.min(99, champ.rep + 2);
      // Merit payments + reputation drift toward league standing
      const n = t.length,
        [repTop, repBot] = comp.repBand || { 1: [88, 60], 2: [62, 46], 3: [50, 38] }[comp.tier] || [60, 40];
      t.forEach((r, i) => {
        const c = S.clubs[r.id];
        if (c.sim === 'full') c.balance += Sea.revenuePotential(c) * 0.12 * ((n - i) / n);
        const target = repTop - ((repTop - repBot) * i) / (n - 1);
        c.rep = U.clamp(c.rep + (target - c.rep) * 0.18, 20, 99);
      });
      if (poty) S.players[poty.id].cult += 5;
      const R = comp.rules;
      // Qualification relationship: this league's top n enter another competition next season
      if (R.qualify)
        qualified[R.qualify.to] = (qualified[R.qualify.to] || []).concat(t.slice(0, R.qualify.n).map((r) => r.id));
      if (R.relegate) t.slice(-R.relegate.n).forEach((r) => moves.push([r.id, comp.id, R.relegate.to]));
      if (R.promote) {
        t.slice(0, R.promote.auto).forEach((r) => moves.push([r.id, comp.id, R.promote.to]));
        if (comp.playoff && comp.playoff.final && comp.playoff.final.res) {
          const w = winnerOf(comp.playoff.final);
          entry.comps[comp.id].playoffWinner = w;
          moves.push([w, comp.id, R.promote.to]);
        }
      }
    }
    S.qualified = qualified;
    entry.qualified = qualified;
    entry.cups = {};
    for (const c of Object.values(S.comps))
      if (c.type !== 'league' && c.winner) entry.cups[c.id] = { name: c.name, winner: c.winner, runnerUp: c.runnerUp };
    // Apply promotion/relegation relationships
    moves.forEach(([id, from, to]) => {
      const c = S.clubs[id];
      S.comps[from].clubs = S.comps[from].clubs.filter((x) => x !== id);
      S.comps[to].clubs.push(id);
      c.comp = to;
      (S.comps[to].tier < S.comps[from].tier ? entry.promoted : entry.relegated).push(id);
      c.rep = U.clamp(c.rep + (S.comps[to].tier < S.comps[from].tier ? 4 : -5), 20, 99);
    });

    W.applySimFocus(); // after promotion and relegation: your (possibly new) league and its neighbours go full
    Sea.favClubNews(entry);
    // User evaluation (out of work: the season is recorded, but there is nothing to judge)
    if (!club) {
      S.archive.push(entry);
      const summary = {
        entry,
        userPos: null,
        trophies: [],
        promoted: false,
        relegated: false,
        objs: [],
        sacked: false,
        unemployed: true,
      };
      FM.People.seasonEnd(summary);
      FM.Stories.seasonEnd(entry);
      if (S.nteams) {
        entry.intl = FM.Intl.seasonResults();
        summary.intl = entry.intl;
        FM.Intl.seasonEnd(entry);
      }
      Sea.newSeason(entry);
      return summary;
    }
    const userComp = entry.comps[userCompId];
    const userPos = userComp.table.findIndex((r) => r.id === club.id) + 1;
    let trophies = [];
    if (userComp.champion === club.id) trophies.push(userComp.name);
    if (userComp.playoffWinner === club.id) trophies.push('Playoff winners');
    const promoted = entry.promoted.includes(club.id),
      relegated = entry.relegated.includes(club.id);
    if (promoted) S.user.stats.promotions++;
    S.user.stats.trophies += trophies.length; // cup wins are counted when the final is played
    Object.values(entry.cups).forEach((x) => {
      if (x.winner === club.id) trophies.push(x.name);
    });
    const met = objs.filter((o) => o.ok || (o.promo && promoted)).length;
    const primary = objs.find((o) => o.id === 'pos');
    const primaryOk = primary && (primary.ok || (primary.promo && promoted));
    const missBy = primary && !primaryOk ? userPos - primary.target : 0;
    club.boardConf = U.clamp(
      club.boardConf +
        (primaryOk ? 12 : -8 - missBy * 4) +
        (met - 1) * 4 +
        (trophies.length ? 20 : 0) -
        (relegated ? 35 : 0),
      0,
      100,
    );
    const firstSeason = (S.user.joinedClubYear || S.user.joined) === S.year;
    S.user.rep = U.clamp(
      S.user.rep + trophies.length * 6 + (met - 1) * 3 + (promoted ? 5 : 0) - (relegated ? 6 : 0),
      1,
      99,
    );
    S.user.history.push({
      year: S.year,
      club: club.id,
      pos: userPos,
      comp: userComp.name,
      trophies,
      promoted,
      relegated,
    });
    entry.user = {
      club: club.id,
      pos: userPos,
      trophies,
      promoted,
      relegated,
      objectivesMet: met,
      objectives: objs.length,
    };
    S.archive.push(entry);
    const summary = {
      entry,
      userPos,
      trophies,
      promoted,
      relegated,
      objs,
      sacked: club.boardConf < 20 && (relegated || (!firstSeason && missBy >= 2)),
    };

    FM.People.seasonEnd(summary);
    FM.Stories.seasonEnd(entry);
    // Summer international tournaments were played on the last days of the calendar
    if (S.nteams) {
      entry.intl = FM.Intl.seasonResults();
      summary.intl = entry.intl;
      FM.Intl.seasonEnd(entry);
    }
    Sea.newSeason(entry);
    if (summary.sacked) S.user.sacked = true;
    return summary;
  };

  // Tactical equilibrium: when the whole game drifts toward more (or fewer) goals, defending adapts. Each summer the
  // chance rate moves part of the way back toward the calibrated scoring level (damped, capped at ±15%). It never
  // changes the differences between teams, and the first season always plays the raw engine.
  Sea.settleEra = function () {
    const S = FM.S,
      e = S.eraLog;
    delete S.eraLog;
    if (!e || e.n < 200) return;
    S.era = U.clamp((S.era || 1) * Math.pow(FM.CAL.targetGoals / (e.g / e.n), 0.6), 0.85, 1.15);
  };
  // Your boyhood club's big moments reach your feed (unless you manage it — then they're your moments)
  Sea.favClubNews = function (entry) {
    const S = FM.S,
      id = S.user && S.user.favClub,
      c = id && S.clubs[id];
    if (!c || W.isUser(id)) return;
    const won = Object.values(entry.comps)
      .filter((x) => x.champion === id)
      .map((x) => x.name)
      .concat(
        Object.values(entry.cups || {})
          .filter((x) => x.winner === id)
          .map((x) => x.name),
      );
    const line = won.length
      ? `They won the ${won.join(' and the ')}. Somewhere, you're smiling.`
      : entry.promoted.includes(id)
        ? 'They won promotion — a good day to have grown up a fan.'
        : entry.relegated.includes(id)
          ? 'They were relegated. It still hurts.'
          : null;
    if (line) FM.News.add({ type: 'club', title: `Your boyhood club: ${c.name}`, body: line, clubId: id });
  };
  Sea.newSeason = function (entry) {
    const S = FM.S;
    Sea.settleEra();
    S.year++;
    FM.Transfers.endLoans();
    // retirements, contracts, history snapshot
    Object.values(S.players).forEach((p) => {
      if (p.retired) return;
      if (p.season.apps)
        (p.history = p.history || []).push({
          y: S.year - 1,
          c: p.clubId,
          apps: p.season.apps,
          g: p.season.goals,
          r: +(p.season.rsum / p.season.apps).toFixed(2),
        });
      p.history = (p.history || []).slice(-8); // the last eight seasons are enough for the player card and keep long saves small
      p.season = W.blankSeason();
      p.flagMinutes = false;
      p.lastGrowth = 0;
      if (Math.random() < Sea.retireChance(p)) return Sea.retire(p);
      if (p.clubId && p.contract < S.year) {
        const c = S.clubs[p.clubId];
        if (W.isUser(p.clubId)) {
          // No automatic renewals: anyone you didn't re-sign during the season leaves on a free
          FM.News.add({
            type: 'club',
            title: `${W.name(p)} leaves on a free`,
            body: `His contract expired without a new deal.${W.hasTrait(p, 'Loyal') ? ' He wanted to stay.' : ''}`,
            pid: p.id,
            clubId: p.clubId,
          });
          W.spell(p).to = S.year - 1;
          p.clubId = null;
          p.listed = false;
          if (S.user.tactic.lineup) S.user.tactic.lineup = S.user.tactic.lineup.map((x) => (x === p.id ? null : x));
        } else if (Sea.aiRenews(p, c)) {
          p.contract = S.year + (W.age(p) >= 31 ? 1 : U.randi(1, 3));
          p.wage = Math.max(p.wage, W.wageFor(p));
        } else {
          W.spell(p).to = S.year - 1;
          p.clubId = null;
        }
      }
      W.refresh(p);
    });
    // AI squad trimming: release surplus players; ageing free agents retire; cap the free-agent pool
    Object.values(S.clubs).forEach((c) => {
      if (W.isUser(c.id)) return;
      const sq = W.squad(c.id);
      const worth = (p) => p.ca + (W.age(p) <= 20 ? (p.pa - p.ca) * 0.5 : 0) - Math.max(0, W.age(p) - 29) * 2; // clubs plan for decline
      sq.sort((a, b) => worth(a) - worth(b));
      // release the least useful, but never a club's last two goalkeepers
      while (sq.length > W.squadTarget(c) + 3) {
        const i = sq.findIndex(
          (p) => p.pos !== 'GK' || sq.filter((q) => q.pos === 'GK').length > (c.sim === 'full' ? 3 : 2),
        );
        if (i < 0) break;
        const [p] = sq.splice(i, 1);
        W.spell(p).to = S.year - 1;
        p.clubId = null;
      }
    });
    // Unattached veterans: most hang up their boots, a few good ones hold out for a contract
    const free = Object.values(S.players).filter((p) => !p.clubId);
    free
      .filter(
        (p) => W.age(p) >= 31 && Math.random() < Math.min(1, 0.45 + (W.age(p) - 31) * 0.2 - (p.ca >= 65 ? 0.25 : 0)),
      )
      .forEach((p) => Sea.retire(p));
    // Unattached for a whole season: he has left professional football (a notable career still gets its farewell)
    Object.values(S.players)
      .filter((p) => !p.clubId && !p.retired && p.freeSince != null && p.freeSince < (S.year - 1) * 1000)
      .forEach((p) => (p.career.apps >= 380 ? Sea.retire(p) : delete S.players[p.id]));
    // Keep the pool a sensible size: the least employable (weakest, bar young players with a future) drop out first
    const worthFA = (p) => p.ca + (W.age(p) <= 21 ? (p.pa - p.ca) * 0.4 : 0);
    const pool = Object.values(S.players)
      .filter((p) => !p.clubId && !p.retired)
      .sort((a, b) => worthFA(a) - worthFA(b));
    while (pool.length > 150) delete S.players[pool.shift().id];
    // A thin market gets a few unattached pros from leagues outside the game (only when needed, never a flood)
    for (let i = pool.length; i < 40; i++) {
      const age = U.randi(22, 31),
        ca = W.freeAgentCA(),
        p = W.genPlayer({
          nat: U.pick(Object.keys(D.NATIONS)),
          pos: U.pick(D.POS),
          age,
          ca,
          pa: W.potentialFor(ca, age),
        });
      p.contract = S.year;
      p.freeSince = Sea.dayIndex();
      S.players[p.id] = p;
    }
    Sea.ensureUserSquad(18);
    // squads replenish (AI)
    Object.values(S.clubs).forEach((c) => {
      if (W.isUser(c.id)) return;
      const sq = W.squad(c.id);
      const need = W.squadTarget(c) - sq.length;
      const want = D.SQUAD_TIER[c.sim] || D.SQUAD_TIER.full;
      for (let i = 0; i < need; i++) {
        const counts = {};
        sq.forEach((p) => (counts[p.pos] = (counts[p.pos] || 0) + 1));
        const pos = Object.keys(want).find((k) => (counts[k] || 0) < want[k]) || U.pick(D.POS);
        const fa = Object.values(S.players).find(
          (p) => !p.clubId && !p.retired && p.pos === pos && p.ca >= W.levelFor(c.rep) - 12,
        );
        if (fa) {
          W.startSpell(fa, c.id);
          fa.contract = S.year + 2;
          FM.Contracts.aiDeal(fa, c);
          sq.push(fa);
          continue;
        }
        const age = U.randi(19, 29),
          ca = Math.round(U.gauss(W.levelFor(c.rep) - 3, 4));
        const p = W.genPlayer({ nat: W.natFor(c), pos, age, ca, pa: W.potentialFor(ca, age), clubId: c.id });
        S.players[p.id] = p;
        sq.push(p);
      }
      if (c.sim === 'light') c.budget = Math.max(3e5, Math.round((Sea.revenuePotential(c) * 0.25) / 1e5) * 1e5);
      if (c.sim === 'full') {
        // Owners don't sit on cash: excess over 2× annual revenue goes into infrastructure, debt and dividends
        const R = Sea.revenuePotential(c),
          excess = c.balance - 2 * R;
        if (excess > 0) {
          c.balance -= excess * 0.6;
          if (excess > 3e7 && Math.random() < 0.35) {
            FM.Records.expandStadium(c, 4000, 'Redevelopment');
            c.facilities.training = Math.min(5, (c.facilities.training || 2) + 1);
            FM.News.add({
              type: 'world',
              title: `${c.name} unveil major redevelopment`,
              body: `A ${U.money(excess * 0.6)} investment in the stadium and training ground. Capacity rises to ${c.stadium.cap.toLocaleString()}.`,
              clubId: c.id,
            });
          }
        }
        c.budget = Math.max(5e5, Math.round((c.balance * 0.35) / 1e5) * 1e5);
        if (c.balance < -8e6 && !c.admin) {
          c.admin = true;
          S.comps[c.comp].deductions = { ...(S.comps[c.comp].deductions || {}), [c.id]: 6 };
          FM.News.add({
            type: 'world',
            title: `${c.name} enter administration`,
            body: `Debts of ${U.money(-c.balance)} leave the club facing a 6-point deduction and a fire sale.`,
            clubId: c.id,
            big: true,
          });
          c.balance = 0;
        }
      }
    });
    const uc = W.userClub();
    if (uc) {
      uc.budget = Math.max(5e5, Math.round((uc.balance * 0.4) / 1e5) * 1e5);
      uc.warned = false;
    }
    FM.Stories.worldEvents(entry);
    FM.Contracts.newSeason();
    Sea.ageStaff();
    Sea.trimRetired();
    W.leagues().forEach(W.setupSeasonFixtures);
    FM.Cups.setupSeason(S.qualified);
    FM.Intl.newSeason();
    FM.People.newSeason();
    S.calendar = W.buildCalendar();
    S.day = 0;
    S.seasonLog = { upsets: [], transfers: [], net: {}, spend: {} };
    S.user.preseason = {};
    S.user.previewSeen = false;
    S.user.tactic.fam = Math.round((S.user.tactic.fam ?? 60) * 0.75); // new faces, rusty over the summer
    W.refreshStaffPool();
    // expectations for the new season
    if (uc)
      FM.News.add({
        type: 'board',
        title: `${Sea.seasonLabel()} — the board's expectations`,
        body: Sea.objectives(uc)
          .map((o) => '• ' + o.text)
          .join('\n'),
        clubId: uc.id,
      });
  };

  // Staff get older every summer; old AI managers retire, and long-forgotten staff records are cleared out
  Sea.ageStaff = function () {
    const S = FM.S,
      used = new Set([...Object.values(S.user.staff || {}), ...(S.user.scouts || []), ...(S.staffPool || [])]);
    Object.values(S.clubs).forEach((c) => c.manager && used.add(c.manager));
    Object.values(S.nteams || {}).forEach((t) => t.manager && used.add(t.manager));
    for (const id in S.staff) {
      const m = S.staff[id];
      m.age = (m.age || 45) + 1;
      if (used.has(id)) continue;
      const left = ((m.career || []).at(-1) || [])[2];
      if (m.age >= 70 || (m.unemployed && left != null && left <= S.year - 4) || (!m.career && !m.unemployed))
        delete S.staff[id];
    }
    Object.values(S.clubs).forEach((c) => {
      const m = c.manager && S.staff[c.manager];
      if (m && m.age >= 72 && !W.isUser(c.id) && c.sim !== 'minimal')
        FM.Stories.newManager(
          c,
          `${m.fn} ${m.ln} retires from management`,
          `After a long career, ${c.name}'s manager calls it a day.`,
        );
    });
  };

  Sea.init = function () {
    FM.S.seasonLog = { upsets: [], transfers: [], net: {}, spend: {} };
  };
})();
