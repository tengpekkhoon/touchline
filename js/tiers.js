// Simulation tiers for the wider world.
//  light   — every fixture is played, but by a fast statistical model rather than the match engine:
//            scores come from team strength, and goals, assists, cards, injuries and ratings are
//            attributed to real players so scouts see honest numbers.
//  minimal — fixtures produce scores only (from reputation); players get synthetic weekly stats
//            (Season.minimalSimWeek), enough for scouting and the market.
// Continental and Club World Cup ties always use the full engine, whatever tier a club plays in.
(function () {
  const FM = window.FM, U = FM.U, D = FM.D, W = FM.W;
  const Ti = (FM.Tiers = {});
  const S = () => FM.S;

  // Squads of every club, indexed once per matchday (the tiers run hundreds of fixtures a day)
  let cache = { key: null, v: {}, rosters: null };
  const fresh = () => { const key = `${S().year}-${S().day}`; if (cache.key !== key || cache.S !== S()) cache = { key, S: S(), v: {}, rosters: null }; }; // per save, per matchday
  Ti.roster = function (clubId) {
    fresh();
    if (!cache.rosters) {
      cache.rosters = {};
      Object.values(S().players).forEach((p) => { if (p.clubId && !p.retired) (cache.rosters[p.clubId] = cache.rosters[p.clubId] || []).push(p); });
    }
    return cache.rosters[clubId] || [];
  };
  // Team strength = average ability of the best XI (cached per matchday)
  Ti.strength = function (clubId) {
    fresh();
    if (cache.v[clubId] == null) {
      const c = S().clubs[clubId];
      const { xi, bench } = W.pickXI(clubId, c.tactic, Ti.roster(clubId));
      cache.v[clubId] = { r: U.avg(xi.filter(Boolean), (p) => p.ca) || W.levelFor(c.rep), xi: xi.filter(Boolean), bench };
    }
    return cache.v[clubId];
  };

  // Expected goals for each side from a strength gap (about +0.3 goals per 5 CA)
  Ti.lambdas = function (rh, ra) {
    const d = (rh - ra) / 10;
    return [U.clamp(1.42 * Math.exp(0.3 * d), 0.25, 4.2), U.clamp(1.12 * Math.exp(-0.3 * d), 0.2, 3.8)];
  };

  Ti.play = function (fx, sim) {
    const comp = S().comps[fx.comp];
    const res = sim === 'light' ? Ti.light(fx) : Ti.minimal(fx);
    fx.res = res;
    FM.Season.updTable(comp.table, fx, res);
    FM.Season.noteResult(fx, res);
    const hc = S().clubs[fx.h], ac = S().clubs[fx.a];
    [hc, ac].forEach((c, k) => {
      const w = k ? res.ag > res.hg : res.hg > res.ag, l = k ? res.hg > res.ag : res.ag > res.hg;
      c.fanMood = U.clamp(c.fanMood + (w ? 4 : l ? -4 : 0), 0, 100);
    });
    const winner = res.hg > res.ag ? hc : res.ag > res.hg ? ac : null;
    if (winner) {
      const loser = winner === hc ? ac : hc;
      if (loser.rep - winner.rep >= 14) winner.rep = Math.min(99, winner.rep + 0.5);
    }
  };

  // Minimal: score from reputation; the 13 best players get an appearance, scorers drawn by position
  Ti.minimal = function (fx) {
    const hc = S().clubs[fx.h], ac = S().clubs[fx.a];
    const [lh, la] = Ti.lambdas(W.levelFor(hc.rep), W.levelFor(ac.rep));
    const hg = U.poisson(lh), ag = U.poisson(la);
    const goals = [];
    [[fx.h, hg, ag, 0], [fx.a, ag, hg, 1]].forEach(([id, gf, ga, side]) => {
      const sq = Ti.roster(id).filter(W.available).sort((a, b) => b.ca - a.ca).slice(0, 13);
      if (!sq.length) return;
      const avg = U.avg(sq, (p) => p.ca);
      sq.forEach((p) => {
        const r = Math.round(U.clamp(U.gauss(6.5 + (p.ca - avg) / 15 + (gf - ga) * 0.15, 0.55), 4.5, 9.8) * 10) / 10;
        p.season.apps++; p.season.rsum += r; p.career.apps++;
        const sp = W.spell(p); if (sp && sp.c === p.clubId) sp.apps++;
        p.form.push(r); p.form = p.form.slice(-10);
      });
      for (let i = 0; i < gf; i++) {
        const sc = U.wpick(sq, (p) => (GOAL_W[p.pos] || 0.05) * (0.5 + p.attrs.finishing / 12));
        sc.season.goals++; sc.career.goals++;
        const sp = W.spell(sc); if (sp && sp.c === sc.clubId) sp.goals++;
        goals.push({ side, pid: sc.id });
      }
    });
    return { hg, ag, goals, sim: 'minimal' };
  };

  const GOAL_W = { ST: 1, W: 0.55, AM: 0.5, CM: 0.2, DM: 0.08, FB: 0.07, CB: 0.07, GK: 0 };
  const AST_W = { AM: 1, W: 0.9, CM: 0.6, ST: 0.5, FB: 0.45, DM: 0.25, CB: 0.08, GK: 0.02 };
  Ti.light = function (fx) {
    const H = Ti.strength(fx.h), A = Ti.strength(fx.a);
    const [lh, la] = Ti.lambdas(H.r, A.r);
    const hg = U.poisson(lh), ag = U.poisson(la);
    const res = { hg, ag, xg: [+(lh * U.rand(0.8, 1.2)).toFixed(2), +(la * U.rand(0.8, 1.2)).toFixed(2)], poss: null, goals: [], cards: [], sim: 'light' };
    const share = U.clamp(50 + (H.r - A.r) * 1.2 + U.randi(-6, 6), 28, 72);
    res.poss = [Math.round(share), 100 - Math.round(share)];
    const ratings = {};
    let motm = null, best = 0;
    [[H, hg, ag, 0], [A, ag, hg, 1]].forEach(([T, gf, ga, side]) => {
      // XI plus two substitutes get the appearance
      const played = T.xi.concat(T.bench.filter((p) => p.pos !== 'GK').slice(0, 2));
      const mins = {};
      played.forEach((p, i) => (mins[p.id] = i < T.xi.length ? 90 : U.randi(10, 35)));
      const scorerW = (p) => (GOAL_W[p.pos] || 0.05) * (0.5 + p.attrs.finishing / 12) * (mins[p.id] / 90);
      const r = {};
      played.forEach((p) => (r[p.id] = 6.3 + (gf - ga) * 0.18 + (p.ca - T.r) / 20 + U.gauss(0, 0.45)));
      const times = [...Array(gf)].map(() => U.randi(1, 90)).sort((a, b) => a - b);
      times.forEach((min) => {
        const sc = U.wpick(played, scorerW);
        const astPool = played.filter((p) => p !== sc);
        const ast = Math.random() < 0.72 ? U.wpick(astPool, (p) => (AST_W[p.pos] || 0.1) * (0.5 + p.attrs.passing / 14)) : null;
        res.goals.push({ side, pid: sc.id, ast: ast && ast.id, min: `${min}'` });
        r[sc.id] += 0.9;
        if (ast) r[ast.id] += 0.45;
      });
      if (ga === 0) played.filter((p) => ['GK', 'CB', 'FB'].includes(p.pos)).forEach((p) => (r[p.id] += 0.45));
      played.forEach((p) => {
        const rt = Math.round(U.clamp(r[p.id], 4, 10) * 10) / 10;
        ratings[p.id] = rt;
        if (rt > best && mins[p.id] >= 45) { best = rt; motm = p.id; }
        p.season.apps++; p.season.rsum += rt; p.career.apps++;
        p.season.lapps = (p.season.lapps || 0) + 1;
        const sp = W.spell(p); if (sp && sp.c === p.clubId) sp.apps++;
        p.form.push(rt); p.form = p.form.slice(-10);
        p.fitness = Math.max(55, p.fitness - (mins[p.id] >= 90 ? U.randi(18, 30) : 8));
        p.morale = U.clamp(p.morale + (gf > ga ? 3 : gf < ga ? -3 : 0), 0, 100);
        // Cards and knocks
        if (Math.random() < 0.09 * (W.hasTrait(p, 'Temperamental') ? 1.6 : 1) * (mins[p.id] / 90)) {
          res.cards.push({ side, pid: p.id, k: 'yellow' });
          p.season.yc++; if (p.season.yc % 5 === 0) { p.susp = 1; p.suspNew = true; }
        } else if (Math.random() < 0.004) { res.cards.push({ side, pid: p.id, k: 'red' }); p.season.rc++; p.susp = 2; p.suspNew = true; }
        if (Math.random() < FM.Injury.lightChance(p) * (mins[p.id] / 90)) FM.Injury.hurt(p, { where: 'match' });
      });
    });
    res.goals.forEach((g) => {
      const p = S().players[g.pid];
      p.season.goals++; p.career.goals++;
      const sp = W.spell(p); if (sp && sp.c === p.clubId) sp.goals++;
      if (g.ast && S().players[g.ast]) S().players[g.ast].season.ast++;
    });
    res.motm = motm;
    if (motm) S().players[motm].season.motm++;
    res.goals.sort((a, b) => parseInt(a.min) - parseInt(b.min));
    return res; // ratings aren't stored per fixture for light leagues (keeps saves small)
  };

  // Labels for the UI
  Ti.LABEL = { full: 'Full simulation', light: 'Light simulation', minimal: 'Minimal simulation' };
  Ti.ICON = { full: '●●●', light: '●●○', minimal: '●○○' };
})();
