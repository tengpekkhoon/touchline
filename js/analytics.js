// Match analytics for your club: one compact row per competitive match (xG, shots, possession, chance types and
// goal times), kept for this season and the last, and league averages worked out from the league's results.
(function () {
  const FM = window.FM,
    W = FM.W;
  const An = (FM.Analytics = {});
  const S = () => FM.S;
  const r2 = (v) => Math.round(v * 100) / 100;

  An.TYPES = ['through', 'cross', 'cutback', 'longshot', 'counter', 'setpiece', 'penalty'];
  // After one of your matches: a row in this season's log
  An.record = function (fx, m, side) {
    const u = S().user,
      comp = S().comps[fx.comp];
    if (!u || !comp || comp.type === 'friendly') return;
    const res = fx.res || m.result(),
      o = 1 - side;
    // chance types: [shots, goals, xG] for and against
    const types = [side, o].map((k) => {
      const t = {};
      for (const [ty, v] of Object.entries(m.sides[k].types || {})) t[ty] = [v[0], v[1], r2(v[2])];
      return t;
    });
    (u.log = u.log || []).push({
      y: S().year,
      d: S().day,
      comp: fx.comp,
      opp: side === 0 ? fx.a : fx.h,
      home: side === 0,
      gf: side === 0 ? res.hg : res.ag,
      ga: side === 0 ? res.ag : res.hg,
      xf: res.xg[side],
      xa: res.xg[o],
      poss: res.poss[side],
      sh: [res.shots[side], res.shots[o]],
      sot: [res.sot[side], res.sot[o]],
      types,
      gm: res.goals.map((g) => [g.side === side ? 1 : 0, parseInt(g.min, 10) || 0]),
    });
  };
  An.newSeason = function () {
    const u = S().user;
    if (!u) return;
    u.logPrev = u.log || [];
    u.log = [];
  };
  // League averages per club per match (xG for, shots, possession is 50 by definition) from the league's results
  An.leagueAvg = function (compId) {
    const comp = S().comps[compId];
    let n = 0,
      xg = 0,
      sh = 0,
      sot = 0,
      g = 0;
    for (const f of (comp && comp.fixtures ? comp.fixtures.flat() : []).filter((f) => f && f.res && f.res.xg)) {
      n += 2;
      xg += f.res.xg[0] + f.res.xg[1];
      g += f.res.hg + f.res.ag;
      if (f.res.shots) sh += f.res.shots[0] + f.res.shots[1];
      if (f.res.sot) sot += f.res.sot[0] + f.res.sot[1];
    }
    return n ? { n: n / 2, xg: xg / n, g: g / n, sh: sh / n, sot: sot / n } : null;
  };
  // Per-club numbers in a league (xG for and against per match), for the league ranking
  An.leagueClubs = function (compId) {
    const comp = S().comps[compId],
      by = {};
    for (const f of (comp && comp.fixtures ? comp.fixtures.flat() : []).filter((f) => f && f.res && f.res.xg)) {
      for (const [id, i] of [
        [f.h, 0],
        [f.a, 1],
      ]) {
        const r = (by[id] = by[id] || { id, n: 0, xf: 0, xa: 0 });
        r.n++;
        r.xf += f.res.xg[i];
        r.xa += f.res.xg[1 - i];
      }
    }
    return Object.values(by).map((r) => ({ ...r, xf: r.xf / r.n, xa: r.xa / r.n }));
  };
  An.club = () => W.userClub();
})();
