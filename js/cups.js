// Cup competitions: domestic knockouts (seeded byes, extra time, penalties), continental cups
// (groups of four, then quarter/semi-finals and a neutral final — two-legged when the world rule is on)
// and the Club World Cup for last season's continental finalists.
// Entrants come from data-driven qualification rules on the leagues (rules.qualify).
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const Cu = (FM.Cups = {});
  const S = () => FM.S;
  const rep = (id) => S().clubs[id].rep;
  const winnerOf = (f) => FM.Season.winnerOf(f);

  Cu.roundName = (n) => (n === 2 ? 'Final' : n === 4 ? 'Semi-final' : n === 8 ? 'Quarter-final' : `Round of ${n}`);
  const mkTable = (ids) =>
    Object.fromEntries(ids.map((id) => [id, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
  // (UEFA's group tiebreakers: head-to-head points, goal difference and goals, then overall)
  Cu.groupTable = (g) => W.sortedTable({ table: g.table, fixtures: g.fixtures, tiebreak: ['h2h', 'gd', 'gf'] });
  // Top two go through. With the games left, who is already through (or top), and who can no longer make it?
  Cu.groupMarks = function (g) {
    const win = S().rules.win,
      left = {};
    g.clubs.forEach((id) => (left[id] = g.fixtures.flat().filter((f) => !f.res && (f.h === id || f.a === id)).length));
    const rows = Cu.groupTable(g).map((r) => ({ id: r.id, pts: r.pts, max: r.pts + left[r.id] * win }));
    const out = {};
    rows.forEach((r) => {
      const others = rows.filter((o) => o !== r);
      if (others.every((o) => o.max < r.pts)) out[r.id] = 'top';
      else if (others.filter((o) => o.max >= r.pts).length <= 1) out[r.id] = 'through';
      else if (others.filter((o) => o.pts > r.max).length >= 2) out[r.id] = 'out';
    });
    return out;
  };
  // A fixture that settles a tie (single matches and second legs; not first legs)
  Cu.decides = (f) => f.leg !== 1;

  // qualified: { CC: [clubIds], ... } from last season's tables, or null in the first season
  // A domestic cup's entrants: every club in that nation's leagues, fully or lightly simulated (League One is in the FA Cup)
  Cu.entrants = (c) =>
    Object.values(S().clubs).filter(
      (x) => x.nat === c.nat && x.comp && S().comps[x.comp] && S().comps[x.comp].nat === c.nat && x.sim !== 'minimal',
    );
  Cu.setupSeason = function (qualified) {
    for (const c of W.cups()) {
      c.clubs = Cu.entrants(c)
        .sort((a, b) => b.rep - a.rep)
        .map((x) => x.id);
      c.rounds = [];
      c.winner = null;
      c.runnerUp = null;
    }
    // second-tier cups go second, so the main cups' entrants are taken first
    for (const c of W.continentals().sort((a, b) => (a.tier || 1) - (b.tier || 1))) {
      const def = D.CONTINENTALS.find((x) => x.id === c.id) || {};
      // [league, how many, skipping the first k] for each feeder league
      const feeders = def.feeders
        ? Object.entries(def.feeders)
            .map(([id, n]) => [S().comps[id], n, Cu.skipFor(id, def)])
            .filter(([l]) => l)
        : W.leagues()
            .filter((l) => l.rules.qualify && l.rules.qualify.to === c.id)
            .map((l) => [l, l.rules.qualify.n, 0]);
      const want = feeders.reduce((t, [, n]) => t + n, 0);
      let entrants = (qualified && qualified[c.id]) || [];
      entrants = entrants.filter((id) => S().clubs[id]);
      if (entrants.length < want) {
        const taken = new Set(
          W.continentals()
            .filter((x) => x !== c && x.clubs)
            .flatMap((x) => x.clubs),
        );
        entrants = [];
        feeders.forEach(([l, n, skip]) =>
          entrants.push(
            ...l.clubs
              .slice()
              .sort((a, b) => rep(b) - rep(a))
              .filter((id) => !taken.has(id))
              .slice(def.feeders ? 0 : skip, (def.feeders ? 0 : skip) + n),
          ),
        );
      }
      const G = Math.max(1, Math.floor(entrants.length / 4));
      c.clubs = entrants.slice(0, G * 4);
      // Seeded draw: pots of G by reputation, one from each pot per group, avoiding same-nation clashes where possible
      const seeded = c.clubs.slice().sort((a, b) => rep(b) - rep(a));
      const groupsIds = [...Array(G)].map(() => []);
      for (let p = 0; p < seeded.length; p += G) {
        let pot = U.shuffle(seeded.slice(p, p + G)),
          best = pot,
          clashes = 99;
        for (let tries = 0; tries < 30; tries++) {
          const c2 = groupsIds.reduce(
            (t, g, gi) => t + (pot[gi] && g.some((id) => S().clubs[id].nat === S().clubs[pot[gi]].nat) ? 1 : 0),
            0,
          );
          if (c2 < clashes) {
            clashes = c2;
            best = pot;
          }
          if (!c2) break;
          pot = U.shuffle(pot);
        }
        best.forEach((id, gi) => groupsIds[gi].push(id));
      }
      c.groups = groupsIds
        .map((ids, gi) => [String.fromCharCode(65 + gi), ids])
        .map(([name, ids]) => ({
          name,
          clubs: ids,
          table: mkTable(ids),
          fixtures: W.roundRobin(ids).map((rd, r) =>
            rd.map(([h, a]) => ({
              id: FM.nextId('f'),
              comp: c.id,
              group: name,
              round: r,
              h,
              a,
              res: null,
              po: `Group ${name} · MD${r + 1}`,
            })),
          ),
        }));
      c.ko = { qf: [], qf2: null, sf: [], sf2: null, final: null };
      c.winner = null;
      c.runnerUp = null;
      c.clubs.forEach((id) => (S().clubs[id].balance += c.prize * 0.13)); // participation fee
    }
    for (const c of W.worldCups()) Cu.setupWorld(c);
    Cu.licenceCheck();
  };

  // How many of a league's clubs go to its main continental cup (the second-tier cup takes the next places)
  Cu.mainPlaces = (compId) => {
    const l = D.LEAGUES.find((x) => x.id === compId);
    return (l && l.rules && l.rules.qualify && l.rules.qualify.n) || 0;
  };
  // Saves made before a competition existed get it (empty until the next season's draw)
  Cu.addDomestic = (s, id, nat, name, short, opts) =>
    (s.comps[id] = { id, type: 'cup', nat, name, short, clubs: [], prize: 3e6, opts: opts || {} });
  Cu.ensureContinentals = function (s) {
    for (const c of D.CONTINENTALS) if (!s.comps[c.id]) s.comps[c.id] = { ...c, type: 'continental', clubs: [] };
    for (const [id, nat, name, short, opts] of D.DOMESTIC_CUPS)
      if (!s.comps[id]) Cu.addDomestic(s, id, nat, name, short, opts);
  };
  // A cup's format (older saves made before formats existed read it from the data)
  Cu.optsOf = (c) => c.opts || (D.DOMESTIC_CUPS.find((x) => x[0] === c.id) || [])[4] || {};
  // Calendar days a domestic cup needs: a round a day, two days for a two-legged one
  Cu.daysNeeded = (c) => {
    const n = Math.max(2, Cu.entrants(c).length),
      p = 2 ** Math.floor(Math.log2(n)),
      legs = (Cu.optsOf(c).legs || []).filter((k) => k <= p).length;
    return Math.log2(p) + (n === p ? 0 : 1) + legs;
  };
  // The places a league's clubs skip for a lower continental cup: its main cup's, and those of the cups above this
  // one in the same region (the Conference League takes the places after the Europa League's)
  Cu.skipFor = (compId, cc) => {
    let skip = Cu.mainPlaces(compId);
    for (const x of D.CONTINENTALS)
      if (x.feeders && x.region === cc.region && (x.tier || 1) < (cc.tier || 1)) skip += x.feeders[compId] || 0;
    return skip;
  };
  // Club World Cup: last season's continental finalists; in the first season, each continent's biggest entrants
  Cu.setupWorld = function (c) {
    // Seed order keeps same-continent clubs apart in the quarter-finals (1v8, 4v5, 2v7, 3v6)
    const seen = new Set();
    let ids = D.CWC_SEEDS.map(([cid, i]) => {
      const cc = S().comps[cid];
      if (!cc) return null;
      const list = cc.lastFinal ? [cc.lastFinal.w, cc.lastFinal.r] : cc.clubs.slice().sort((a, b) => rep(b) - rep(a));
      return list[i];
    }).filter((id) => id && S().clubs[id] && !seen.has(id) && seen.add(id));
    if (ids.length < 8) {
      // Top up with the best-known continental entrants
      const extra = W.continentals()
        .flatMap((cc) => cc.clubs)
        .filter((id) => !seen.has(id))
        .sort((a, b) => rep(b) - rep(a));
      ids = ids.concat(extra).slice(0, 8);
    }
    c.clubs = ids.slice(0, 8);
    c.ko = { qf: [], sf: [], final: null };
    c.winner = null;
    c.runnerUp = null;
    c.clubs.forEach((id) => (S().clubs[id].balance += 2e6));
  };

  // Fixtures a cup plays on the current calendar day (draws are made lazily, on the day)
  // A club whose ground is below the competition's licence can't host there: its home games go to a neutral ground
  Cu.unlicensed = (clubId, comp) => {
    const c = S().clubs[clubId],
      min = D.GROUND_MIN[comp.id];
    return !!(c && min && c.stadium && c.stadium.cap < min);
  };
  Cu.fixturesFor = function (comp, cal) {
    if (comp.type === 'cup') return domestic(comp);
    if (comp.type === 'world') return world(comp, cal.stage);
    const list = continental(comp, cal.stage);
    for (const f of list) {
      if (f.res) continue;
      if (f.base === undefined) f.base = !!f.neutral;
      f.neutral = f.base || Cu.unlicensed(f.h, comp);
    }
    return list;
  };
  // The season's draw: tell the user if his ground is below a licence
  Cu.licenceCheck = function () {
    const u = S().user,
      club = u && W.userClub();
    if (!club) return;
    for (const c of W.continentals()) {
      if (!c.clubs || !c.clubs.includes(club.id) || !Cu.unlicensed(club.id, c)) continue;
      FM.News.add({
        type: 'club',
        title: `${club.name}'s ground isn't licensed for the ${c.name}`,
        body: `It holds ${club.stadium.cap.toLocaleString()}; the competition wants ${D.GROUND_MIN[c.id].toLocaleString()}. Until the stadium is built up your home games there are played at a neutral ground: no home advantage, and the fans are not happy about it.`,
        clubId: club.id,
      });
      club.fanMood = Math.max(0, club.fanMood - 3);
    }
  };

  function domestic(c) {
    if (c.winner) return [];
    const last = c.rounds[c.rounds.length - 1];
    if (last) {
      // a two-legged round: the return legs are made on the next cup day, once every first leg is in
      if (last.legs === 2 && !last.ties2) {
        if (last.day === S().day || last.ties.some((f) => !f.res)) return last.ties;
        last.day2 = S().day;
        last.ties2 = last.ties.map((f) => ({
          id: FM.nextId('f'),
          comp: c.id,
          h: f.a,
          a: f.h,
          res: null,
          ko: true,
          leg: 2,
          first: f.id,
          po: `${last.name} · 2nd leg`,
          final: last.n === 2,
          neutral: false,
        }));
        return last.ties2;
      }
      const decider = last.ties2 || last.ties;
      if ((last.ties2 ? last.day2 : last.day) === S().day || decider.some((f) => !f.res)) return decider;
    }
    const alive = last ? last.byes.concat((last.ties2 || last.ties).map(winnerOf)) : c.clubs.slice();
    if (alive.length < 2) return [];
    const n = alive.length,
      p = 2 ** Math.floor(Math.log2(n));
    const seeded = alive.slice().sort((a, b) => rep(b) - rep(a));
    let byes = [],
      playing = seeded;
    if (n !== p) {
      const k = n - p;
      byes = seeded.slice(0, n - 2 * k);
      playing = seeded.slice(n - 2 * k);
    }
    const name = n === p ? Cu.roundName(n) : c.rounds.length ? `Round ${c.rounds.length + 1}` : 'First round';
    const o = Cu.optsOf(c),
      twoLegs = n === p && (o.legs || []).includes(n),
      neutral = !twoLegs && (o.neutral === 'all' || (n === p && (o.neutral || [2]).includes(n)));
    const sh = U.shuffle(playing),
      ties = [];
    for (let i = 0; i + 1 < sh.length; i += 2) {
      // two legs: the better-placed club hosts the second
      const [x, y] = twoLegs && rep(sh[i]) > rep(sh[i + 1]) ? [sh[i + 1], sh[i]] : [sh[i], sh[i + 1]];
      ties.push(
        twoLegs
          ? { id: FM.nextId('f'), comp: c.id, h: x, a: y, res: null, ko: false, leg: 1, po: `${name} · 1st leg` }
          : {
              id: FM.nextId('f'),
              comp: c.id,
              h: x,
              a: y,
              res: null,
              ko: true,
              po: name,
              final: n === 2,
              neutral,
            },
      );
    }
    c.rounds.push({ name, day: S().day, ties, byes, n: p === n ? n : 0, legs: twoLegs ? 2 : 1 });
    return ties;
  }

  // Knockout round with optional legs. pairs: [[seeded, unseeded], ...] — the seeded side hosts the decider.
  function koRound(c, key, stage, label, pairsFn, neutral) {
    const leg = stage.endsWith('1') ? 1 : stage.endsWith('2') ? 2 : 0;
    if (leg === 2) {
      if (!c.ko[key + '2']) {
        if (!c.ko[key].length || c.ko[key].some((f) => !f.res)) return [];
        c.ko[key + '2'] = c.ko[key].map((f) => ({
          id: FM.nextId('f'),
          comp: c.id,
          h: f.a,
          a: f.h,
          res: null,
          ko: true,
          leg: 2,
          first: f.id,
          po: `${label} · 2nd leg`,
        }));
      }
      return c.ko[key + '2'];
    }
    if (!c.ko[key].length) {
      const pairs = pairsFn();
      if (!pairs) return [];
      c.ko[key] = pairs.map(([h, a]) =>
        leg === 1
          ? { id: FM.nextId('f'), comp: c.id, h: a, a: h, res: null, ko: false, leg: 1, po: `${label} · 1st leg` }
          : { id: FM.nextId('f'), comp: c.id, h, a, res: null, ko: true, po: label, neutral: !!neutral },
      );
      FM.News.add({
        type: 'world',
        title: `${c.name}: ${label.toLowerCase()} draw`,
        body: pairs.map(([h, a]) => `${S().clubs[h].name} v ${S().clubs[a].name}`).join('\n'),
        big: true,
      });
    }
    return c.ko[key];
  }
  // Winners of a finished knockout round (null while any tie is unresolved)
  Cu.roundWinners = function (c, key) {
    const dec = c.ko[key + '2'] && c.ko[key + '2'].length ? c.ko[key + '2'] : c.ko[key];
    if (!dec || !dec.length || dec.some((f) => !f.res || !Cu.decides(f))) return null;
    return dec.map(winnerOf);
  };

  // A continental cup's knockout format, as in real life: legs per round (qf, sf, f) and whether the knockouts are
  // played at one centralised venue (the AFC Champions League Elite)
  Cu.formatOf = (c) => {
    const d = D.CONTINENTALS.find((x) => x.id === c.id) || {};
    const legs = { qf: 2, sf: 2, f: 1, ...(d.legs || {}) };
    // a season already under way from an older save has no day for a second leg of the final
    if (!(S().calendar || []).some((x) => x.type === 'cup' && x.stage === 'F2')) legs.f = 1;
    return { legs, central: !!d.central };
  };
  function continental(c, stage) {
    if (!stage || !c.groups) return [];
    if (stage[0] === 'G') return c.groups.flatMap((g) => g.fixtures[+stage.slice(1) - 1] || []);
    const fmt = Cu.formatOf(c);
    const groupsDone = () => c.groups.every((g) => g.fixtures.flat().every((f) => f.res));
    // a round played over one leg uses the first leg's day; its second-leg day is empty
    const round = (key, label, pairsFn) => {
      const one = fmt.legs[key] === 1;
      if (one && stage.endsWith('2')) return [];
      return koRound(c, key, one ? stage.slice(0, -1) : stage, label, pairsFn, one && fmt.central);
    };
    if (stage.startsWith('QF')) {
      if (c.groups.length < 4) return [];
      return round('qf', 'Quarter-final', () => {
        if (!groupsDone()) return null;
        const [A, B, Cc, Dd] = c.groups.map(Cu.groupTable);
        return [
          [A[0].id, B[1].id],
          [B[0].id, A[1].id],
          [Cc[0].id, Dd[1].id],
          [Dd[0].id, Cc[1].id],
        ];
      });
    }
    if (stage.startsWith('SF')) {
      return round('sf', 'Semi-final', () => {
        if (c.groups.length >= 4) {
          const w = Cu.roundWinners(c, 'qf');
          return (
            w && [
              [w[0], w[2]],
              [w[1], w[3]],
            ]
          );
        }
        if (!groupsDone()) return null;
        if (c.groups.length === 1) {
          const A = Cu.groupTable(c.groups[0]);
          return [
            [A[0].id, A[3].id],
            [A[1].id, A[2].id],
          ];
        }
        const [A, B] = c.groups.map(Cu.groupTable);
        return [
          [A[0].id, B[1].id],
          [B[0].id, A[1].id],
        ];
      });
    }
    if (stage === 'F2') {
      // the return leg of a two-legged final
      if (fmt.legs.f !== 2 || !c.ko.final || !c.ko.final.res) return [];
      if (!c.ko.final2) {
        const f1 = c.ko.final;
        c.ko.final2 = {
          id: FM.nextId('f'),
          comp: c.id,
          h: f1.a,
          a: f1.h,
          res: null,
          ko: true,
          leg: 2,
          first: f1.id,
          po: 'Final · 2nd leg',
          final: true,
        };
      }
      return [c.ko.final2];
    }
    if (stage === 'F') {
      if (!c.ko.final) {
        const w = Cu.roundWinners(c, 'sf');
        if (!w) return [];
        if (fmt.legs.f === 2) {
          // the better-placed club hosts the second leg
          const [hi, lo] = rep(w[0]) >= rep(w[1]) ? [w[0], w[1]] : [w[1], w[0]];
          c.ko.final = {
            id: FM.nextId('f'),
            comp: c.id,
            h: lo,
            a: hi,
            res: null,
            ko: false,
            leg: 1,
            po: 'Final · 1st leg',
          };
        } else
          c.ko.final = {
            id: FM.nextId('f'),
            comp: c.id,
            h: w[0],
            a: w[1],
            res: null,
            ko: true,
            po: 'Final',
            final: true,
            neutral: true,
          };
      }
      return [c.ko.final];
    }
    return [];
  }

  // Club World Cup: single-leg neutral knockout, strongest continent's champion against the weakest seed
  function world(c, stage) {
    if (!c.clubs || c.clubs.length < 2) return [];
    const tie = (h, a, po, fin) => ({
      id: FM.nextId('f'),
      comp: c.id,
      h,
      a,
      res: null,
      ko: true,
      po,
      neutral: true,
      final: !!fin,
    });
    if (stage === 'QF') {
      if (!c.ko.qf.length) {
        const s = c.clubs;
        c.ko.qf = [
          [0, 7],
          [3, 4],
          [1, 6],
          [2, 5],
        ]
          .filter(([i, j]) => s[i] && s[j])
          .map(([i, j]) => tie(s[i], s[j], 'Quarter-final'));
        FM.News.add({
          type: 'world',
          title: `${c.name}: the draw`,
          body: c.ko.qf
            .map(
              (f) =>
                `${S().clubs[f.h].name} ${D.NATIONS[S().clubs[f.h].nat].flag} v ${D.NATIONS[S().clubs[f.a].nat].flag} ${S().clubs[f.a].name}`,
            )
            .join('\n'),
          big: true,
        });
      }
      return c.ko.qf;
    }
    if (stage === 'SF') {
      if (!c.ko.sf.length) {
        if (!c.ko.qf.length || c.ko.qf.some((f) => !f.res)) return [];
        const w = c.ko.qf.map(winnerOf);
        c.ko.sf = [
          [w[0], w[1]],
          [w[2], w[3]],
        ]
          .filter(([a, b]) => a && b)
          .map(([h, a]) => tie(h, a, 'Semi-final'));
      }
      return c.ko.sf;
    }
    if (stage === 'F') {
      if (!c.ko.final) {
        if (c.ko.sf.length < 2 || c.ko.sf.some((f) => !f.res)) return [];
        const [h, a] = c.ko.sf.map(winnerOf);
        c.ko.final = tie(h, a, 'Final', true);
      }
      return [c.ko.final];
    }
    return [];
  }

  // Called by Season.apply for every cup/continental result
  Cu.onResult = function (fx) {
    const c = S().comps[fx.comp],
      r = fx.res;
    if (fx.group) {
      const g = c.groups.find((x) => x.name === fx.group);
      FM.Season.updTable(g.table, fx, r);
      const w = r.hg > r.ag ? fx.h : r.ag > r.hg ? fx.a : null;
      const pay = c.prize * 0.1;
      if (w) S().clubs[w].balance += pay;
      else {
        S().clubs[fx.h].balance += pay / 3;
        S().clubs[fx.a].balance += pay / 3;
      }
      return;
    }
    if (!Cu.decides(fx)) {
      S().clubs[fx.h].balance += c.type === 'cup' ? 2e5 : c.prize * 0.08;
      return;
    } // first leg: gate receipts
    const w = winnerOf(fx),
      l = w === fx.h ? fx.a : fx.h;
    S().clubs[w].balance += c.type === 'cup' ? 4e5 : c.prize * 0.25;
    if (fx.final) Cu.finish(c, w, l);
  };

  Cu.finish = function (c, w, l) {
    const club = S().clubs[w];
    c.winner = w;
    c.runnerUp = l;
    c.lastFinal = { w, r: l, year: S().year };
    club.titles[c.id] = (club.titles[c.id] || 0) + 1;
    club.balance += c.prize || 0;
    club.rep = Math.min(99, club.rep + (c.type === 'cup' ? 2 : c.type === 'world' ? 4 : 5));
    club.fanMood = Math.min(100, club.fanMood + 15);
    if (W.isUser(w)) {
      S().user.stats.trophies++;
      S().user.rep = Math.min(99, S().user.rep + (c.type === 'cup' ? 4 : 8));
      club.boardConf = Math.min(100, club.boardConf + 15);
    }
    FM.Stories.share({
      kicker:
        c.type === 'world'
          ? 'CHAMPIONS OF THE WORLD'
          : c.type === 'continental'
            ? 'CHAMPIONS OF THE CONTINENT'
            : 'CUP WINNERS',
      title: `${club.name} win the ${c.name}`,
      sub: `${S().clubs[l].name} beaten in the final. Title number ${club.titles[c.id]}.`,
      big: c.type === 'world' ? '🌍' : '🏆',
      clubId: w,
    });
  };

  // Knockout fixtures of a continental/world cup in order (legs included)
  Cu.koList = (c) =>
    c.ko
      ? [
          ...(c.ko.qf || []),
          ...(c.ko.qf2 || []),
          ...(c.ko.sf || []),
          ...(c.ko.sf2 || []),
          c.ko.final,
          c.ko.final2,
        ].filter(Boolean)
      : [];

  // Everything a club could have played this season (for match reports)
  Cu.allFixtures = function () {
    const out = [];
    for (const c of Object.values(S().comps)) {
      if (c.type === 'league') {
        out.push(...(c.fixtures || []).flat());
        if (c.playoff) out.push(...c.playoff.sf, ...(c.playoff.sf2 || []), c.playoff.final, c.playoff.final2);
      }
      if (c.type === 'cup') (c.rounds || []).forEach((r) => out.push(...r.ties, ...(r.ties2 || [])));
      if (c.type === 'continental') (c.groups || []).forEach((g) => out.push(...g.fixtures.flat()));
      if (c.type === 'continental' || c.type === 'world') out.push(...Cu.koList(c));
    }
    return out.filter(Boolean);
  };
  // Knockout-only lookup (cheap: used to find a tie's first leg)
  Cu.findFixture = function (id) {
    for (const c of Object.values(S().comps)) {
      if (c.type === 'league' && c.playoff) {
        const f = [...c.playoff.sf, ...(c.playoff.sf2 || []), c.playoff.final].find((x) => x && x.id === id);
        if (f) return f;
      }
      for (const t of Object.values(S().relTies || {})) {
        const f = [t.leg1, t.leg2].find((x) => x && x.id === id);
        if (f) return f;
      }
      if (c.type === 'continental' || c.type === 'world') {
        const f = Cu.koList(c).find((x) => x.id === id);
        if (f) return f;
      }
    }
    return FM.Intl.findFixture ? FM.Intl.findFixture(id) : null;
  };

  // Which cups a club is still involved in (for home screen chips)
  Cu.status = function (clubId) {
    const out = [];
    const mine = (f) => f.h === clubId || f.a === clubId;
    for (const c of W.cups()) {
      if (!c.clubs.includes(clubId)) continue;
      if (c.winner === clubId) {
        out.push({ c, text: 'Winners' });
        continue;
      }
      const last = c.rounds[c.rounds.length - 1];
      const tie = last && (last.ties2 || last.ties).find(mine);
      const out1 = c.rounds.some((r) => (r.ties2 || r.ties).some((f) => f.res && mine(f) && winnerOf(f) !== clubId));
      out.push({
        c,
        text: out1 ? 'Knocked out' : tie ? last.name : last ? `Through to next round` : 'Awaiting draw',
        alive: !out1,
      });
    }
    for (const c of W.continentals().concat(W.worldCups())) {
      if (!c.clubs.includes(clubId)) continue;
      if (c.winner === clubId) {
        out.push({ c, text: 'Winners' });
        continue;
      }
      const ko = Cu.koList(c);
      const koOut = ko.some((f) => f.res && mine(f) && Cu.decides(f) && winnerOf(f) !== clubId);
      const inKO = ko.some(mine);
      const stageName =
        c.ko.final && mine(c.ko.final)
          ? 'Final'
          : [...c.ko.sf, ...(c.ko.sf2 || [])].some(mine)
            ? 'Semi-finals'
            : 'Quarter-finals';
      if (c.type === 'world') {
        out.push({ c, text: koOut ? 'Knocked out' : stageName, alive: !koOut });
        continue;
      }
      const g = c.groups.find((x) => x.clubs.includes(clubId));
      const pos = Cu.groupTable(g).findIndex((r) => r.id === clubId) + 1;
      const groupsDone = g.fixtures.flat().every((f) => f.res);
      const mark = !groupsDone && Cu.groupMarks(g)[clubId];
      out.push({
        c,
        text: koOut
          ? 'Knocked out'
          : inKO
            ? stageName
            : groupsDone
              ? pos <= 2
                ? 'Through to the knockouts'
                : 'Out in the groups'
              : mark === 'top'
                ? `Group ${g.name}: won`
                : mark === 'through'
                  ? `Group ${g.name}: through`
                  : mark === 'out'
                    ? 'Out in the groups'
                    : `Group ${g.name}: ${U.ordinal(pos)}`,
        alive: !koOut && mark !== 'out' && (inKO || !groupsDone || pos <= 2),
      });
    }
    return out;
  };
})();
