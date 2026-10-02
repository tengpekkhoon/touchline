// International football: national teams picked from the best players of each nationality, a coefficient ranking,
// two international breaks a season (two matchdays each), qualifying groups in the season before a
// tournament, and the summer finals played as calendar days at the end of the season —
// a World Championship every 4 years, continental championships in the years between.
// The human manager can also take a national team job and play these matches live.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const I = (FM.Intl = {});
  const S = () => FM.S;
  // Clubs and national teams share the match engine; this resolves either
  FM.clubOf = (id) => FM.S.clubs[id] || (FM.S.nteams && FM.S.nteams[id]);
  const T = (id) => S().nteams[id];
  I.region = (code) => {
    const r = D.NATIONS[code].region;
    return r === 'ENG' ? 'EUR' : r;
  };
  I.REGION_NAME = { EUR: 'Europe', SAM: 'South America', AFR: 'Africa', ASIA: 'Asia', NAM: 'North America' };

  // Tournament formats. pools: [[regions], slots]
  I.TOURNS = {
    world: [
      {
        id: 'WC',
        name: 'FIFA World Cup',
        size: 16,
        pools: [
          [['EUR'], 9],
          [['SAM'], 3],
          [['AFR'], 2],
          [['ASIA'], 1],
          [['NAM'], 1],
        ],
      },
    ],
    continental: [
      { id: 'EC', name: 'UEFA European Championship', size: 8, pools: [[['EUR'], 8]] },
      { id: 'SA', name: 'Copa América', size: 4, pools: [[['SAM'], 4]] },
      { id: 'AF', name: 'Africa Cup of Nations', size: 4, pools: [[['AFR'], 4]] },
      { id: 'AS', name: 'Asia-Pacific Nations Cup', size: 4, pools: [[['ASIA', 'NAM'], 4]] },
    ],
  };
  I.TNAME = {
    WC: 'FIFA World Cup',
    EC: 'UEFA European Championship',
    SA: 'Copa América',
    AF: 'Africa Cup of Nations',
    AS: 'Asia-Pacific Nations Cup',
  }; // Asia and North America share one tournament here, so it keeps its own name

  I.setup = function () {
    const s = S();
    s.nteams = {};
    s.intlLog = [];
    for (const code in D.NATIONS) {
      const N = D.NATIONS[code];
      s.nteams['n_' + code] = {
        id: 'n_' + code,
        code,
        name: N.name,
        short: code,
        nat: code,
        city: N.name,
        colors: D.NT_COLORS[code] || ['#FFFFFF', '#000000'],
        sim: 'nation',
        rep: 60,
        coef: 50,
        tactic: W.newTactic('4-3-3', 'Short', 'Mid Block'),
        titles: {},
        facilities: { medical: 3 },
        fanMood: 60,
        form: [],
        caps: {},
      };
    }
    Object.values(s.nteams).forEach((t) => {
      t.coef = Math.round(50 + (I.rating(t.code) - 62) * 2.2 * 10) / 10;
      t.rep = I.repFromCoef(t.coef);
    });
    I.newSeason();
  };
  // The ranking is a coefficient: points (about 50 for an average nation, 90 and over for the best) that every
  // match moves, by how much it was worth and how surprising the result was (the Elo method, on a smaller scale)
  I.repFromCoef = (c) => U.clamp(Math.round(60 + ((c - 50) * 10) / 12), 30, 97);
  I.pool = (code) =>
    Object.values(S().players)
      .filter((p) => p.nat === code && !p.retired && W.age(p) >= 17)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 30);
  I.rating = (code) => {
    const xi = I.pool(code).slice(0, 11);
    return xi.length ? U.avg(xi, (p) => p.ca) : 40;
  };
  // The squad: the user's own call-ups when managing the nation, otherwise the best 23 available
  I.squad = function (code) {
    const t = S().nteams && S().nteams['n_' + code];
    if (t && t.picks && W.isUserNation(t.id)) {
      const picked = t.picks
        .map((id) => S().players[id])
        .filter((p) => p && !p.retired && p.nat === code && W.available(p));
      if (picked.length >= 16) return picked.slice(0, 26);
      return picked.concat(I.pool(code).filter((p) => W.available(p) && !picked.includes(p))).slice(0, 23);
    }
    return I.pool(code).filter(W.available).slice(0, 23);
  };
  I.ranked = () => Object.values(S().nteams).sort((a, b) => b.coef - a.coef);

  // ---------- Calendar ----------
  I.tournamentFor = (year) => (year % 4 === 2 ? 'world' : year % 4 === 0 ? 'continental' : null);
  I.nextTournament = function () {
    for (let y = S().year; y < S().year + 4; y++) {
      const k = I.tournamentFor(y);
      if (k) return { year: y + 1, kind: k };
    }
    return null;
  };
  I.tournamentStages = (year) =>
    I.tournamentFor(year) === 'world' ? ['G1', 'G2', 'G3', 'QF', 'SF', 'F'] : ['G1', 'G2', 'G3', 'SF', 'F'];
  const MD = { I1a: 0, I1b: 1, I2a: 2, I2b: 3 };

  // ---------- Season setup: qualifying groups for the coming summer ----------
  I.newSeason = function () {
    const s = S();
    s.quals = null;
    s.tourns = null;
    s.intlSeason = [];
    s.intlDay = null;
    s.intlBreak = [];
    const kind = I.tournamentFor(s.year);
    if (kind) {
      const q = { kind, year: s.year, groups: [], direct: {} };
      I.TOURNS[kind].forEach((tn) =>
        tn.pools.forEach(([regions, slots], pi) => {
          const teams = I.ranked().filter((t) => regions.includes(I.region(t.code)));
          const key = `${tn.id}:${pi}`;
          if (teams.length <= slots) {
            q.direct[key] = teams.map((t) => t.id);
            return;
          }
          const g = Math.max(1, Math.ceil(teams.length / 4));
          const groups = [...Array(g)].map(() => []);
          teams.forEach((t, i) => {
            const row = Math.floor(i / g),
              col = i % g;
            groups[row % 2 ? g - 1 - col : col].push(t.id);
          });
          groups.forEach((ids, gi) => {
            const rr = W.roundRobin(ids);
            const rounds = ids.length === 2 ? rr : rr.slice(0, rr.length / 2); // pairs play home and away; bigger groups once each
            const name = `${tn.id === 'WC' ? '' : tn.id + ' '}${I.REGION_NAME[regions[0]]}${regions.length > 1 ? '+' : ''} ${String.fromCharCode(65 + gi)}`;
            q.groups.push({
              key,
              tn: tn.id,
              slots,
              name,
              teams: ids,
              table: Object.fromEntries(
                ids.map((id) => [id, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]),
              ),
              rounds: rounds.map((rd) => rd.map(([h, a]) => ({ h, a }))),
            });
          });
        }),
      );
      // A nation can't be in two qualifying groups at once (the World Championship takes priority)
      s.quals = q;
    }
    I.refreshJobs();
  };

  // Teams through from a pool, ranked group winners first, then runners-up, and so on
  I.poolQualifiers = function (key) {
    const q = S().quals;
    if (!q) return [];
    if (q.direct[key]) return q.direct[key];
    const groups = q.groups.filter((g) => g.key === key);
    if (!groups.length) return [];
    const slots = groups[0].slots;
    const rows = groups.flatMap((g) =>
      W.sortedTable({ table: g.table }).map((r, pos) => ({
        ...r,
        pos,
        ppg: r.p ? r.pts / r.p : 0,
        gdg: r.p ? r.gd / r.p : 0,
        gfg: r.p ? r.gf / r.p : 0,
      })),
    );
    rows.sort(
      (a, b) => a.pos - b.pos || b.ppg - a.ppg || b.gdg - a.gdg || b.gfg - a.gfg || T(b.id).coef - T(a.id).coef,
    );
    return rows.slice(0, slots).map((r) => r.id);
  };
  I.qualifiedFor = (tnId) => {
    const tn = I.TOURNS[S().quals ? S().quals.kind : 'world'].find((x) => x.id === tnId);
    return tn ? tn.pools.flatMap((_, pi) => I.poolQualifiers(`${tnId}:${pi}`)) : [];
  };

  // ---------- Fixtures for an international or tournament day (built once per day) ----------
  const mkFx = (h, a, po, extra = {}) => ({
    id: FM.nextId('i'),
    comp: 'INTL',
    intl: true,
    h,
    a,
    res: null,
    po,
    ...extra,
  });
  I.dayFixtures = function (cal) {
    const s = S();
    if (s.intlDay && s.intlDay.day === s.day && s.intlDay.year === s.year) {
      // Knockout ties also live in their tournament's bracket. A save/load or the simulation worker's JSON
      // hand-off turns the two into separate copies, so point the cached list back at the bracket's objects
      // (otherwise results land on the copies and the bracket never learns who went through)
      if (cal.type === 'tourn' && s.tourns) {
        const byId = new Map();
        s.tourns.forEach((t) => [...t.ko.qf, ...t.ko.sf, t.ko.final].filter(Boolean).forEach((f) => byId.set(f.id, f)));
        s.intlDay.fx = s.intlDay.fx.map((f) => byId.get(f.id) || f);
      }
      return s.intlDay.fx;
    }
    const fx = cal.type === 'tourn' ? I.tournamentDay(cal.stage) : I.breakDay(cal.tag);
    s.intlDay = { day: s.day, year: s.year, fx };
    return fx;
  };
  I.breakDay = function (tag) {
    const s = S(),
      md = MD[tag] ?? 0,
      fx = [],
      busy = new Set();
    if (s.quals) {
      s.quals.groups.forEach((g) => {
        (g.rounds[md] || []).forEach(({ h, a }) => {
          if (busy.has(h) || busy.has(a)) return;
          busy.add(h);
          busy.add(a);
          fx.push(mkFx(h, a, `${I.TNAME[g.tn]} qualifier · ${g.name.trim()}`, { kind: 'qual', group: g.name }));
        });
      });
    }
    // Everyone else plays a friendly against a similarly ranked side
    const free = I.ranked().filter((t) => !busy.has(t.id)),
      order = [];
    for (let i = 0; i < free.length; i += 4) order.push(...U.shuffle(free.slice(i, i + 4)));
    for (let i = 0; i + 1 < order.length; i += 2)
      fx.push(mkFx(order[i].id, order[i + 1].id, 'International friendly', { kind: 'friendly' }));
    return fx;
  };

  // ---------- Summer tournaments ----------
  I.setupTournaments = function () {
    const s = S(),
      kind = I.tournamentFor(s.year);
    s.tourns = (I.TOURNS[kind] || []).map((tn) => {
      let teams = I.qualifiedFor(tn.id).map(T);
      if (teams.length < tn.size)
        teams = teams
          .concat(I.ranked().filter((t) => !teams.includes(t) && tn.pools.some(([r]) => r.includes(I.region(t.code)))))
          .slice(0, tn.size);
      teams = teams.sort((a, b) => b.coef - a.coef).slice(0, tn.size);
      const G = Math.max(1, teams.length / 4);
      const groups = [...Array(G)].map(() => []);
      teams.forEach((t, i) => {
        const row = Math.floor(i / G),
          col = i % G;
        groups[row % 2 ? G - 1 - col : col].push(t.id);
      });
      return {
        id: tn.id,
        name: tn.name,
        teams: teams.map((t) => t.id),
        games: [],
        groups: groups.map((ids, gi) => ({
          name: String.fromCharCode(65 + gi),
          teams: ids,
          table: Object.fromEntries(ids.map((id) => [id, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }])),
          rounds: W.roundRobin(ids).slice(0, 3),
        })),
        ko: { qf: [], sf: [], final: null },
        winner: null,
        runnerUp: null,
      };
    });
    // National team job: failing to qualify ends it
    const u = s.user;
    if (u && u.nation && !s.tourns.some((t) => t.teams.includes(u.nation)))
      I.sackNational(`${T(u.nation).name} failed to qualify for the ${s.tourns.map((t) => t.name).join(' / ')}.`);
    FM.News.add({
      type: 'world',
      title: `${s.tourns.map((t) => t.name).join(' · ')}: the finals begin`,
      body: s.tourns.map((t) => `${t.name}: ${t.teams.map((id) => D.NATIONS[T(id).code].flag).join(' ')}`).join('\n'),
      big: true,
    });
  };
  I.tournamentDay = function (stage) {
    const s = S();
    if (!s.tourns) I.setupTournaments();
    const out = [];
    for (const t of s.tourns) {
      const lbl = (x) => `${t.name} · ${x}`;
      if (stage[0] === 'G') {
        const r = +stage.slice(1) - 1;
        t.groups.forEach((g) =>
          (g.rounds[r] || []).forEach(([h, a]) =>
            out.push(mkFx(h, a, lbl(`Group ${g.name}`), { kind: 'tourn', tid: t.id, group: g.name, neutral: true })),
          ),
        );
      } else if (stage === 'QF') {
        if (t.groups.length !== 4) continue;
        if (!t.ko.qf.length) {
          const [A, B, Cc, Dd] = t.groups.map((g) => W.sortedTable({ table: g.table }));
          t.ko.qf = [
            [A[0].id, B[1].id],
            [B[0].id, A[1].id],
            [Cc[0].id, Dd[1].id],
            [Dd[0].id, Cc[1].id],
          ].map(([h, a]) => mkFx(h, a, lbl('Quarter-final'), { kind: 'tourn', tid: t.id, ko: true, neutral: true }));
        }
        out.push(...t.ko.qf);
      } else if (stage === 'SF') {
        if (t.groups.length < 2) continue;
        if (!t.ko.sf.length) {
          let pairs;
          if (t.groups.length === 4) {
            const w = t.ko.qf.map((f) => FM.Season.winnerOf(f));
            pairs = [
              [w[0], w[2]],
              [w[1], w[3]],
            ];
          } else {
            const [A, B] = t.groups.map((g) => W.sortedTable({ table: g.table }));
            pairs = [
              [A[0].id, B[1].id],
              [B[0].id, A[1].id],
            ];
          }
          t.ko.sf = pairs.map(([h, a]) =>
            mkFx(h, a, lbl('Semi-final'), { kind: 'tourn', tid: t.id, ko: true, neutral: true }),
          );
        }
        out.push(...t.ko.sf);
      } else if (stage === 'F') {
        if (!t.ko.final) {
          const [h, a] =
            t.groups.length === 1
              ? W.sortedTable({ table: t.groups[0].table })
                  .slice(0, 2)
                  .map((r) => r.id)
              : t.ko.sf.map((f) => FM.Season.winnerOf(f));
          t.ko.final = mkFx(h, a, lbl('Final'), { kind: 'tourn', tid: t.id, ko: true, neutral: true, final: true });
        }
        out.push(t.ko.final);
      }
    }
    return out;
  };

  // ---------- Playing a match ----------
  I.sim = function (fx) {
    const m = new FM.Match({ h: fx.h, a: fx.a, comp: 'INTL', knockout: !!fx.ko, neutral: !!fx.neutral });
    while (!m.finished) m.step();
    return m;
  };
  I.applyFixture = function (fx, m) {
    const s = S(),
      r = m.result(),
      [H, A] = m.sides;
    fx.res = r;
    const tourn = fx.kind === 'tourn';
    const rec = {
      id: fx.id,
      year: s.year,
      day: s.day,
      h: H.club.id,
      a: A.club.id,
      hg: r.hg,
      ag: r.ag,
      pens: r.pens,
      label: fx.po,
      goals: r.goals.map((g) => ({ pid: g.pid, side: g.side, min: g.min })),
    };
    m.sides.forEach((sd, k) => {
      for (const pid in sd.mins) {
        const p = s.players[pid];
        p.intl = p.intl || { caps: 0, goals: 0, first: s.year };
        const first = p.intl.caps === 0;
        p.intl.caps++;
        if (!tourn) {
          // players come back tired, occasionally injured, and happier for the call-up
          p.fitness = Math.max(45, Math.round(sd.st[pid] ?? p.fitness) - 6);
          if (sd.injured[pid]) FM.Injury.hurt(p, { where: 'intl' });
          p.morale = Math.min(100, p.morale + 3);
        } else p.fitness = Math.max(50, Math.round(sd.st[pid] ?? p.fitness));
        if (first && (W.isUser(p.clubId) || W.age(p) <= 19 || W.isUserNation(sd.club.id)))
          FM.Stories.firstCap(p, sd.club, m.sides[1 - k].club);
      }
    });
    r.goals.forEach((g) => {
      const p = s.players[g.pid];
      if (p && p.intl) p.intl.goals++;
    });
    // Coefficient update (qualifiers and finals count for more than friendlies)
    const exp = 1 / (1 + Math.pow(10, ((A.club.coef - H.club.coef) * 10 - (fx.neutral ? 0 : 60)) / 400));
    const score = r.hg > r.ag ? 1 : r.hg < r.ag ? 0 : r.pens ? (r.pens[0] > r.pens[1] ? 0.6 : 0.4) : 0.5;
    const gd = Math.abs(r.hg - r.ag),
      K = (tourn ? 45 : fx.kind === 'qual' ? 35 : 22) * (gd <= 1 ? 1 : gd === 2 ? 1.5 : 1.75);
    const delta = (K * (score - exp)) / 10;
    H.club.coef = Math.round((H.club.coef + delta) * 10) / 10;
    A.club.coef = Math.round((A.club.coef - delta) * 10) / 10;
    H.club.rep = I.repFromCoef(H.club.coef);
    A.club.rep = I.repFromCoef(A.club.coef);
    [H, A].forEach((sd, k) => {
      const won = k ? r.ag > r.hg : r.hg > r.ag,
        lost = k ? r.hg > r.ag : r.ag > r.hg;
      sd.club.form = (sd.club.form || []).concat([won ? 'W' : lost ? 'L' : 'D']).slice(-5);
    });
    rec.winner = r.hg !== r.ag || r.pens ? FM.Season.winnerOf({ h: rec.h, a: rec.a, res: r }) : null;
    rec.motm = m.motm;
    s.intlLog.unshift(rec);
    if (s.intlLog.length > 120) s.intlLog.length = 120;
    // Group tables
    if (fx.kind === 'qual' && s.quals) {
      const g = s.quals.groups.find((x) => x.name === fx.group);
      if (g) FM.Season.updTable(g.table, fx, r);
    }
    if (tourn) {
      const t = s.tourns.find((x) => x.id === fx.tid);
      t.games.push(rec);
      if (fx.group) FM.Season.updTable(t.groups.find((g) => g.name === fx.group).table, fx, r);
    } else s.intlBreak.push(rec);
    if (W.isUserNation(H.club.id) || W.isUserNation(A.club.id)) I.userResult(fx, m, W.isUserNation(H.club.id) ? 0 : 1);
    return rec;
  };

  I.afterDay = function (cal) {
    const s = S();
    if (cal.type === 'intl' && /b$/.test(cal.tag)) {
      FM.Stories.intlWindow(s.intlBreak);
      s.intlBreak = [];
    }
    if (cal.type === 'tourn' && cal.stage === 'F' && s.tourns)
      s.tourns.forEach((t) => t.ko.final && t.ko.final.res && !t.winner && I.finishTournament(t));
  };

  I.finishTournament = function (t) {
    const s = S(),
      fin = t.ko.final,
      w = FM.Season.winnerOf(fin);
    const champ = T(w),
      runner = T(w === fin.h ? fin.a : fin.h);
    t.winner = champ.id;
    t.runnerUp = runner.id;
    champ.titles[t.id] = (champ.titles[t.id] || 0) + 1;
    const goals = {};
    t.games.forEach((g) => g.goals.forEach((x) => (goals[x.pid] = (goals[x.pid] || 0) + 1)));
    const top = Object.entries(goals).sort((a, b) => b[1] - a[1])[0];
    I.squad(champ.code).forEach((p) => {
      p.morale = Math.min(100, p.morale + 10);
      p.cult = (p.cult || 0) + 2;
    });
    const hw = fin.res.hg !== fin.res.ag ? fin.res.hg > fin.res.ag : fin.res.pens && fin.res.pens[0] > fin.res.pens[1];
    const [wg, lg] = hw ? [fin.res.hg, fin.res.ag] : [fin.res.ag, fin.res.hg];
    const res = {
      id: t.id,
      name: t.name,
      year: s.year,
      winner: champ.id,
      runnerUp: runner.id,
      final: `${wg}–${lg}${fin.res.pens ? ` (${hw ? fin.res.pens[0] : fin.res.pens[1]}–${hw ? fin.res.pens[1] : fin.res.pens[0]} pens)` : ''}`,
      games: t.games.length,
      topScorer:
        top && s.players[top[0]]
          ? { pid: top[0], name: W.name(s.players[top[0]]), goals: top[1], nat: s.players[top[0]].nat }
          : null,
    };
    s.intlSeason.push(res);
    FM.Stories.intlTournament(res, champ);
    const u = s.user;
    if (u && u.nation && t.teams.includes(u.nation)) I.judgeTournament(t);
  };
  I.seasonResults = () => (S().intlSeason || []).slice();
  I.seasonEnd = function () {
    const s = S();
    s.tourns = null;
    s.intlDay = null;
  };
  I.findFixture = function (id) {
    const s = S();
    return (s.tourns || []).flatMap((t) => [...t.ko.qf, ...t.ko.sf, t.ko.final]).find((f) => f && f.id === id) || null;
  };
  // A tournament team's progress, for the national team screen
  I.stageReached = function (t, id) {
    if (t.winner === id) return 'Winners';
    if (t.ko.final && [t.ko.final.h, t.ko.final.a].includes(id)) return 'Final';
    if (t.ko.sf.some((f) => f.h === id || f.a === id)) return 'Semi-finals';
    if (t.ko.qf.some((f) => f.h === id || f.a === id)) return 'Quarter-finals';
    return 'Group stage';
  };

  // ---------- National team jobs ----------
  I.badgeNeeded = (t) => (t.rep >= 90 ? 'Continental Pro' : t.rep >= 78 ? 'Continental A' : 'Continental B');
  I.canTake = function (t) {
    const u = S().user;
    const badgeOk = D.BADGES.indexOf(u.badges) >= D.BADGES.indexOf(I.badgeNeeded(t));
    const need = t.rep - 30 - (u.nat === t.code ? 8 : 0); // your own country will take a chance on one of its own
    const repOk = u.rep >= need;
    return {
      ok: badgeOk && repOk,
      why: !badgeOk
        ? `Requires a ${I.badgeNeeded(t)} licence`
        : !repOk
          ? `Your reputation (${Math.round(u.rep)}) is too low — they want ${need}+`
          : '',
    };
  };
  I.refreshJobs = function () {
    const s = S();
    const pool = Object.values(s.nteams).filter((t) => !(s.user && s.user.nation === t.id));
    // Four vacancies: two from the lower half of the ranking (realistic first jobs), two from anywhere
    const low = U.shuffle(
      pool
        .slice()
        .sort((a, b) => a.coef - b.coef)
        .slice(0, Math.ceil(pool.length / 2)),
    ).slice(0, 2);
    const rest = U.shuffle(pool.filter((t) => !low.includes(t))).slice(0, 2);
    let jobs = low.concat(rest);
    const home = s.user && s.user.nat && s.nteams['n_' + s.user.nat];
    if (home && s.user.nation !== home.id && !jobs.includes(home) && Math.random() < 0.35)
      jobs = jobs.slice(0, 3).concat(home); // your own country comes calling now and then
    s.ntJobs = jobs.map((t) => t.id).sort((a, b) => T(b).coef - T(a).coef);
  };
  I.takeJob = function (id) {
    const s = S(),
      u = s.user,
      t = T(id);
    if (!s.ntJobs.includes(id)) return { ok: false, msg: 'That job is no longer available.' };
    const c = I.canTake(t);
    if (!c.ok) return { ok: false, msg: c.why };
    if (u.nation) I.leaveNational('resigned');
    u.nation = id;
    u.ntStats = { games: 0, w: 0, d: 0, l: 0 };
    u.ntHistory.push({ nation: id, from: s.year, to: null });
    s.ntJobs = s.ntJobs.filter((x) => x !== id);
    t.picks = null;
    const club = W.userClub();
    if (club)
      club.boardConf = U.clamp(
        club.boardConf + (club.identity === 'oil' || club.identity === 'giant' ? -4 : 1),
        0,
        100,
      );
    FM.Stories.share({
      kicker: 'NATIONAL TEAM',
      title: `${u.name} named ${t.name} manager`,
      sub: `${club ? `A dual role alongside ${club.name}.` : 'A full-time international job while you wait for a club.'} ${I.nextTournament() ? `Next up: the ${I.nextTournament().kind === 'world' ? 'World Cup' : 'continental championships'} in ${I.nextTournament().year}.` : ''}`,
      big: D.NATIONS[t.code].flag,
      clubId: club.id,
    });
    return { ok: true, msg: `You are the new ${t.name} manager.` };
  };
  I.leaveNational = function (how) {
    const s = S(),
      u = s.user;
    if (!u.nation) return;
    const h = u.ntHistory[u.ntHistory.length - 1];
    if (h) {
      h.to = s.year;
      h.how = how;
      h.stats = u.ntStats;
    }
    const t = T(u.nation);
    t.picks = null;
    u.nation = null;
    if (how === 'resigned')
      FM.News.add({
        type: 'board',
        title: `You step down as ${t.name} manager`,
        body: 'The federation thanks you for your service.',
      });
  };
  I.sackNational = function (why) {
    const u = S().user;
    if (!u.nation) return;
    const t = T(u.nation);
    I.leaveNational('sacked');
    u.rep = Math.max(1, u.rep - 3);
    FM.News.add({
      type: 'board',
      title: `Sacked by ${t.name}`,
      body: `${why} The federation has decided to make a change.`,
      big: true,
    });
  };
  // Expectation: seeds (top quarter by coefficient) should reach the semi-finals, the rest get out of the group
  I.judgeTournament = function (t) {
    const u = S().user,
      id = u.nation;
    if (!id) return;
    const seed =
      t.teams
        .slice()
        .sort((a, b) => T(b).coef - T(a).coef)
        .indexOf(id) < Math.max(1, t.teams.length / 4);
    const st = I.stageReached(t, id),
      rank = ['Group stage', 'Quarter-finals', 'Semi-finals', 'Final', 'Winners'].indexOf(st);
    const target = seed ? (t.teams.length >= 8 ? 2 : 3) : t.teams.length >= 16 ? 1 : t.teams.length >= 8 ? 2 : 3;
    if (st === 'Winners') {
      u.rep = Math.min(99, u.rep + 10);
      u.stats.trophies++;
    } else if (rank >= target) u.rep = Math.min(99, u.rep + 4);
    else if (rank < target - 1)
      I.sackNational(`${T(id).name} went out at the ${st.toLowerCase()} — below expectations.`);
    else u.rep = Math.max(1, u.rep - 1);
    if (u.nation)
      FM.News.add({
        type: 'board',
        title: `${t.name}: ${T(id).name} reach the ${st.toLowerCase()}`,
        body:
          rank >= target
            ? 'The federation is pleased with the campaign.'
            : 'Not quite what the federation hoped for — but your job is safe.',
      });
  };
  I.userResult = function (fx, m, side) {
    const u = S().user,
      r = fx.res,
      me = m.sides[side],
      op = m.sides[1 - side];
    const gf = me.goals,
      ga = op.goals;
    const won = gf > ga || (r.pens && r.pens[side] > r.pens[1 - side]),
      lost = ga > gf || (r.pens && r.pens[side] < r.pens[1 - side]);
    u.ntStats = u.ntStats || { games: 0, w: 0, d: 0, l: 0 };
    u.ntStats.games++;
    won ? u.ntStats.w++ : lost ? u.ntStats.l++ : u.ntStats.d++;
    u.rep = U.clamp(u.rep + (won ? 0.4 : lost ? -0.3 : 0.05) * (fx.kind === 'friendly' ? 0.5 : 1.5), 1, 99);
    const t = me.club;
    FM.News.add({
      type: 'headline',
      paper: 'International Football Weekly',
      title: won
        ? `${t.name} beat ${op.club.name}`
        : lost
          ? `${t.name} lose to ${op.club.name}`
          : `${t.name} held by ${op.club.name}`,
      body: `${fx.po}. ${m.sides[0].club.name} ${r.hg}–${r.ag}${r.pens ? ` (${r.pens[0]}–${r.pens[1]} pens)` : ''} ${m.sides[1].club.name}.${m.motm ? ` Player of the match: ${W.name(S().players[m.motm])}.` : ''}`,
    });
    u.lastMatch = { fxId: fx.id, comp: 'INTL' };
  };
})();
