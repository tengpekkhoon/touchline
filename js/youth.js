// B teams and youth sides. A B team (Real Madrid Castilla, Barça Atlètic, VfB Stuttgart II, ...) is a reserve side
// in the lower divisions: it can never go up into its parent's division or above, its players belong to the
// parent (who pays them and takes the fee if one is sold) and they move freely between the two. Every club in the
// full and light leagues also has U21 and U18 squads (p.team) that play in national youth leagues each league
// day, so young players outside the first-team squad still get games.
(function () {
  const FM = window.FM,
    U = FM.U,
    W = FM.W;
  const Y = (FM.Youth = {});
  const S = () => FM.S;

  // ---------- B teams ----------
  Y.parentOf = (c) => c && c.parent && S().clubs[c.parent];
  Y.bTeamOf = (clubId) => Object.values(S().clubs).find((c) => c.parent === clubId) || null;
  // The club that pays a player and sells him: the parent for a B-team player
  Y.owner = (clubId) => {
    const c = clubId && S().clubs[clubId];
    return c && c.parent && S().clubs[c.parent] ? c.parent : clubId;
  };
  const tier = (compId) => (S().comps[compId] ? S().comps[compId].tier : 99);
  // Can this club go up into compId? Not a B team whose parent plays there or lower down.
  Y.canGoUp = (clubId, compId) => {
    const p = Y.parentOf(S().clubs[clubId]);
    return !p || !p.comp || tier(p.comp) < tier(compId);
  };
  // The league's table in order, with clubs that can't be promoted left out (auto promotion and play-off seeds)
  Y.promotable = (comp, rows) => rows.filter((r) => Y.canGoUp(r.id, comp.rules.promote.to));
  // After promotion and relegation: a B team now level with or above its parent drops a division, and the best
  // eligible club below goes up in its place (league sizes stay the same). Returns the extra moves made.
  Y.fixBTeams = function () {
    const s = S(),
      out = [];
    for (const b of Object.values(s.clubs)) {
      const p = Y.parentOf(b);
      if (!p || !b.comp || !p.comp || tier(b.comp) > tier(p.comp)) continue;
      const comp = s.comps[b.comp],
        down = comp.rules && comp.rules.relegate && comp.rules.relegate.to;
      if (!down || !s.comps[down]) continue;
      const lower = s.comps[down];
      const up = W.sortedTable(lower)
        .map((r) => r.id)
        .find((id) => id !== b.id && Y.canGoUp(id, comp.id) && !out.some((m) => m[0] === id));
      if (!up) continue;
      out.push([b.id, comp.id, down], [up, down, comp.id]);
    }
    return out;
  };
  // Move a player between a parent and its B team (no transfer: the same contract and career spell)
  Y.move = function (p, toId) {
    if (!p || !S().clubs[toId]) return;
    W.moveWithin(p, toId);
    p.team = undefined;
    const u = S().user;
    if (u && u.tactic && u.tactic.lineup) u.tactic.lineup = u.tactic.lineup.map((x) => (x === p.id ? null : x));
  };
  // AI parents keep their B team stocked: surplus young players go down, B-team players good enough come up
  Y.rebalance = function () {
    const s = S();
    for (const b of Object.values(s.clubs)) {
      const p = Y.parentOf(b);
      if (!p || W.isUser(p.id)) continue;
      const first = W.squad(p.id).filter((q) => !q.loan),
        reserve = W.squad(b.id).filter((q) => !q.loan),
        target = W.squadTarget(p);
      const ranked = first.slice().sort((a, c) => c.ca - a.ca);
      // down: young players outside the parent's best 22 while the squad is over its size
      for (const q of ranked.slice(22).filter((x) => W.age(x) <= 22)) {
        if (W.squad(p.id).length <= target) break;
        if (W.squad(b.id).length >= W.squadTarget(b) + 4) break;
        Y.move(q, b.id);
      }
      // up: a B-team player better than the parent's 18th, while the parent has room
      const eighteenth = ranked[17] ? ranked[17].ca : 0;
      for (const q of reserve.filter((x) => x.ca > eighteenth + 2).sort((a, c) => c.ca - a.ca)) {
        if (W.squad(p.id).length >= target + 2) break;
        Y.move(q, p.id);
      }
    }
  };

  // ---------- U21 and U18 squads, and their leagues ----------
  Y.TEAMS = { u21: { label: 'U21', max: 21 }, u18: { label: 'U18', max: 18 } };
  Y.hasYouth = (c) => c && (c.sim === 'full' || c.sim === 'light') && !c.parent;
  // AI clubs (and yours, until you choose) put young players outside the first-team squad in the youth sides
  Y.assign = function (c, force) {
    if (!Y.hasYouth(c)) {
      // no youth sides here (a club that was fully simulated while you managed it keeps no youth tags)
      for (const p of W.squad(c.id)) if (p.team) p.team = undefined;
      return;
    }
    const mine = W.isUser(c.id) && !force; // your club: only players you haven't placed yourself
    const sq = W.squad(c.id).filter((p) => !p.loan),
      top = new Set(
        sq
          .slice()
          .sort((a, b) => b.ca - a.ca)
          .slice(0, 22)
          .map((p) => p.id),
      );
    for (const p of sq) {
      if (mine && p.teamSet && W.age(p) <= 21) continue; // (too old for the U21s: back to the first team)
      const a = W.age(p);
      p.team = top.has(p.id) || a > 21 ? undefined : a <= 18 ? 'u18' : 'u21';
    }
  };
  Y.assignAll = () => Object.values(S().clubs).forEach((c) => Y.assign(c));
  Y.squadOf = (clubId, team) => W.squad(clubId).filter((p) => p.team === team && !p.loan);
  // A youth side's level: its real players, topped up to eleven by the academy's general standard (clubs don't
  // carry full youth squads in the database; only the real players record appearances)
  const strength = (clubId, team) => {
    const c = S().clubs[clubId],
      real = Y.squadOf(clubId, team)
        .filter(W.available)
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 11)
        .map((p) => p.ca);
    const base = W.levelFor(c.rep) - (team === 'u21' ? 16 : 24) + ((c.facilities && c.facilities.academy) || 2) * 2;
    while (real.length < 11) real.push(base);
    return U.avg(real, (x) => x);
  };
  // One round of every nation's youth leagues: clubs paired at random, a result from the two sides' level
  Y.round = function () {
    const s = S();
    s.youth = s.youth || {};
    const byNat = {};
    for (const c of Object.values(s.clubs)) if (Y.hasYouth(c)) (byNat[c.nat] = byNat[c.nat] || []).push(c.id);
    for (const nat in byNat) {
      for (const team of Object.keys(Y.TEAMS)) {
        const lg = ((s.youth[nat] = s.youth[nat] || {})[team] = s.youth[nat][team] || { table: {}, last: {} });
        const ids = U.shuffle(byNat[nat]);
        for (let i = 0; i + 1 < ids.length; i += 2) {
          const [h, a] = [ids[i], ids[i + 1]],
            sh = strength(h, team),
            sa = strength(a, team);
          const hg = U.poisson(Math.max(0.3, 1.45 + (sh - sa) / 14)),
            ag = U.poisson(Math.max(0.3, 1.2 + (sa - sh) / 14));
          for (const [id, gf, ga] of [
            [h, hg, ag],
            [a, ag, hg],
          ]) {
            const r = (lg.table[id] = lg.table[id] || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
            r.p++;
            r.gf += gf;
            r.ga += ga;
            if (gf > ga) (r.w++, (r.pts += 3));
            else if (gf === ga) (r.d++, r.pts++);
            else r.l++;
          }
          lg.last[h] = { opp: a, gf: hg, ga: ag, home: true };
          lg.last[a] = { opp: h, gf: ag, ga: hg, home: false };
          // the players who played get a youth appearance (counted toward development)
          for (const id of [h, a])
            Y.squadOf(id, team)
              .filter(W.available)
              .sort((x, y) => y.ca - x.ca)
              .slice(0, 13)
              .forEach((p) => (p.season.yapps = (p.season.yapps || 0) + 1));
        }
      }
    }
  };
  Y.table = (nat, team) => {
    const lg = S().youth && S().youth[nat] && S().youth[nat][team];
    return lg ? W.sortedTable({ table: lg.table }) : [];
  };
  // New season: fresh youth tables, squads re-sorted (B teams restocked too)
  Y.newSeason = function () {
    const s = S();
    s.youth = {};
    Y.assignAll();
    Y.rebalance();
  };
})();
