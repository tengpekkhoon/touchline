// Transfer market: asking prices, wage demands, loans, user offers, the AI market (windows, loans, winter exits)
// and bids for your players.
(function () {
  const FM = window.FM, U = FM.U, D = FM.D, W = FM.W;

  const T = (FM.Transfers = {});
  // A club's five best players (cached per matchday: the AI market asks this for thousands of players)
  let keyCache = { k: null, m: null };
  T.isKey = function (p) {
    if (!p.clubId) return false;
    const k = `${FM.S.year}-${FM.S.day}`;
    if (keyCache.k !== k || keyCache.S !== FM.S) {
      const by = {};
      Object.values(FM.S.players).forEach((q) => { if (q.clubId && !q.retired) (by[q.clubId] = by[q.clubId] || []).push(q); });
      const m = new Set();
      for (const id in by) by[id].sort((a, b) => b.ca - a.ca).slice(0, 5).forEach((q) => m.add(q.id));
      keyCache = { k, m, S: FM.S };
    }
    return keyCache.m.has(p.id);
  };
  T.askPrice = function (p) {
    if (!p.clubId) return 0;
    const c = FM.S.clubs[p.clubId];
    let f = p.value * D.IDENTITY[c.identity].sell;
    if (T.isKey(p)) f *= 1.25;
    if (c.sim === 'minimal') f *= 0.85;
    if (W.hasTrait(p, 'Loyal')) f *= 1.2;
    if (p.deal && p.deal.release) f = Math.min(f, p.deal.release); // nobody asks more than the clause
    return U.roundMoney(f);
  };
  // A good sporting director shaves the fee and the agent's demands when you buy
  T.dirFactor = () => 1 - (W.staffAbility('director') - 10) * 0.008;
  T.userAsk = (p) => U.roundMoney(T.askPrice(p) * T.dirFactor());
  T.wageDemand = function (p, toClub) {
    let w = Math.max(p.wage * 1.15, W.wageFor(p) * (0.8 + toClub.rep / 250));
    if (W.hasTrait(p, 'Mercenary')) w *= 1.3;
    if (!p.clubId) w *= 1.1; // free agents want a bit more
    if (W.isUser(toClub.id)) w *= T.dirFactor();
    return Math.round(w / 50) * 50;
  };
  T.signingBonus = (p, wage) => (p.clubId ? 0 : U.roundMoney(wage * 10));

  // ----- Loans -----
  // Share = proportion of the wage the borrowing club pays
  T.loanTerms = function (p) {
    const S = FM.S, parent = S.clubs[p.clubId], age = W.age(p);
    const round = FM.Season.gamesPlayed(p.clubId);
    let share = 0.45;
    if (T.isKey(p)) share += 0.6;
    if (p.season.apps > Math.max(3, round * 0.6)) share += 0.25;
    if (age <= 21) share -= 0.2;
    if (parent.rep >= 75) share -= 0.05;
    return { share: U.clamp(share, 0.25, 1.2), available: share <= 1 && age <= 30 && !p.loan && parent.sim !== 'minimal' };
  };
  T.loanOffer = function (pid, share, fee = 0) {
    const S = FM.S, p = S.players[pid], club = W.userClub();
    if (!FM.Season.windowOpen()) return { ok: false, msg: 'Loans can only be agreed while the window is open.' };
    if (!p.clubId) return { ok: false, msg: 'He is a free agent — just offer him a contract.' };
    if (p.loan) return { ok: false, msg: `He's already on loan at ${S.clubs[p.clubId].name}.` };
    const t = T.loanTerms(p);
    if (!t.available) return { ok: false, msg: `${S.clubs[p.clubId].name} won't loan him out — he's too important to them.` };
    const need = t.share - (fee >= p.value * 0.05 ? 0.2 : 0);
    if (share + 1e-9 < need) return { ok: false, counter: Math.min(1, Math.ceil(need * 20) / 20), msg: `${S.clubs[p.clubId].name} want you to cover at least ${Math.round(Math.min(1, need) * 100)}% of his wages${fee ? '' : ' (a small loan fee would help)'}.` };
    const lvl = FM.Scouting.level();
    if (p.ca < lvl - 14 && W.age(p) > 21) return { ok: false, msg: `His club want him to play regularly — they don't think he'd get minutes with you.` };
    if (fee > club.budget) return { ok: false, msg: `The loan fee exceeds your budget.` };
    T.loan(p, club.id, share, fee);
    return { ok: true, msg: `✅ ${W.name(p)} joins on a season-long loan (${Math.round(share * 100)}% of wages).` };
  };
  T.loan = function (p, toId, share, fee = 0) {
    const S = FM.S, from = S.clubs[p.clubId], to = S.clubs[toId];
    from.balance += fee; to.balance -= fee; to.budget = Math.max(0, to.budget - fee);
    const sp = W.spell(p); if (sp) sp.to = S.year;
    p.loan = { from: from.id, share, fee, year: S.year };
    W.startSpell(p, toId);
    W.spell(p).loan = true; W.spell(p).signed = true;
    p.morale = Math.min(100, p.morale + 6);
    if (W.isUser(toId)) S.user.knowledge[p.id] = 100;
    if (W.isUser(from.id) && S.user.tactic.lineup) S.user.tactic.lineup = S.user.tactic.lineup.map((x) => (x === p.id ? null : x));
    S.seasonLog.transfers.push({ pid: p.id, name: W.name(p), nat: p.nat, from: from.id, to: toId, fee, intl: from.nat !== to.nat, day: S.day, age: W.age(p), loan: true });
    FM.Stories.loan(p, from, to, share);
  };
  // AI clubs interested in taking one of the user's players on loan
  T.loanOutOffers = function (pid) {
    const S = FM.S, p = S.players[pid], uc = W.userClub();
    const clubs = Object.values(S.clubs).filter((c) => (c.sim === 'full' || c.sim === 'light') && !W.isUser(c.id) && c.rep < uc.rep + 5 && W.levelFor(c.rep) >= p.ca - 12);
    return U.shuffle(clubs).slice(0, 3).map((c) => ({ club: c.id, share: Math.min(1, Math.round((0.5 + Math.random() * 0.5 + (W.levelFor(c.rep) < p.ca ? 0.15 : 0)) * 20) / 20), minutes: W.levelFor(c.rep) <= p.ca + 2 ? 'Regular starter' : 'Rotation' }));
  };
  // Return every loanee to their parent club (season end)
  T.endLoans = function () {
    const S = FM.S;
    Object.values(S.players).forEach((p) => {
      if (!p.loan) return;
      const sp = W.spell(p); if (sp) sp.to = S.year - 1;
      const parent = p.loan.from, was = p.clubId;
      delete p.loan;
      W.startSpell(p, parent);
      if (W.isUser(parent)) FM.News.add({ type: 'club', title: `${W.name(p)} returns from loan`, body: `Back from ${S.clubs[was].name} after ${W.spell(p) && p.career.spells.slice(-2)[0].apps} appearances.`, pid: p.id, clubId: parent });
    });
  };

  T.offer = function (pid, fee, wage) {
    const S = FM.S, p = S.players[pid], club = W.userClub();
    if (p.clubId && !FM.Season.windowOpen()) return { ok: false, msg: 'The transfer window is closed. It reopens mid-season (matchday 12) and in pre-season. Free agents can be signed any time.' };
    if (p.loan) return { ok: false, msg: `He's on loan at ${S.clubs[p.clubId].name}. Try again when he returns to ${S.clubs[p.loan.from].name}.` };
    if (fee > club.budget) return { ok: false, msg: `That exceeds your transfer budget of ${U.money(club.budget)}.` };
    const seller = p.clubId && S.clubs[p.clubId];
    if (seller) {
      const ask = T.userAsk(p);
      if (fee < ask * 0.85) return { ok: false, msg: `${seller.name} reject the offer out of hand. They value him closer to ${U.money(ask)}.` };
      if (fee < ask) return { ok: false, counter: ask, msg: `${seller.name} want ${U.money(ask)}. Close, but not enough.` };
    }
    // Player's view
    if (seller && W.hasTrait(p, 'Loyal') && T.isKey(p) && fee < T.userAsk(p) * 1.4) return { ok: false, msg: `${W.name(p)} is loyal to ${seller.name} and won't consider the move.` };
    if (seller && seller.rep > club.rep + 10 && p.hid.amb >= 12) return { ok: false, msg: `${W.name(p)} doesn't see ${club.name} as a step up.` };
    const dem = T.wageDemand(p, club);
    if (wage < dem) return { ok: false, counter: null, wageDemand: dem, msg: `${W.name(p)}'s agent wants ${U.money(dem)}/wk.` };
    const bonus = T.signingBonus(p, wage);
    if (bonus) club.balance -= bonus;
    T.execute(p, club.id, fee, wage);
    return { ok: true, msg: `✅ ${W.name(p)} signs for ${club.name}!${bonus ? ` Signing-on bonus: ${U.money(bonus)}.` : ''}` };
  };

  T.execute = function (p, toId, fee, wage, flags = {}) {
    const S = FM.S, from = p.clubId && S.clubs[p.clubId], to = S.clubs[toId];
    if (from) {
      from.balance += fee;
      if (from.sim === 'full' || from.sim === 'light') from.budget += fee * 0.5;
      from.bestSales = (from.bestSales || []).concat([{ pid: p.id, name: W.name(p), fee, to: toId, year: S.year }]).sort((a, b) => b.fee - a.fee).slice(0, 5);
      const sp = W.spell(p); if (sp) sp.to = S.year;
      S.seasonLog.net[from.id] = (S.seasonLog.net[from.id] || 0) + fee;
      if (W.isUser(from.id)) S.user.stats.sold++;
    }
    to.balance -= fee; to.budget = Math.max(0, to.budget - fee);
    S.seasonLog.net[toId] = (S.seasonLog.net[toId] || 0) - fee;
    W.startSpell(p, toId);
    W.spell(p).signed = true;
    W.spell(p).fee = fee; // remembered on the career timeline (0 = free transfer)
    FM.Records.onTransfer(p, from && from.id, toId, fee);
    p.wage = wage || T.wageDemand(p, to);
    p.contract = S.year + U.randi(3, 5);
    p.morale = Math.min(100, p.morale + 10);
    p.listed = false;
    p.wantsOut = false;
    if (!W.isUser(toId)) FM.Contracts.aiDeal(p, to);
    if (W.isUser(toId)) { S.user.knowledge[p.id] = 100; S.user.stats.bought++; S.user.shortlist = S.user.shortlist.filter((x) => x !== p.id); }
    if (W.isUser(from && from.id) && S.user.tactic.lineup) S.user.tactic.lineup = S.user.tactic.lineup.map((x) => (x === p.id ? null : x));
    const intl = !!from && from.nat !== to.nat;
    S.seasonLog.transfers.push({ pid: p.id, name: W.name(p), nat: p.nat, from: from && from.id, to: toId, fee, intl, day: S.day, age: W.age(p) });
    FM.Stories.transfer(p, from, to, fee, { ...flags, intl });
  };

  const nationOf = (clubId) => clubId && FM.S.clubs[clubId] ? FM.S.clubs[clubId].nat : null;
  T.foreignCount = (c) => W.squad(c.id).filter((p) => p.nat !== c.nat).length;

  // AI market for one window day: squad upgrades (at home or abroad), marquee raids, veterans heading abroad.
  // Each day a batch of clubs looks at its weakest starting spot — an ageing starter judged on where he is
  // heading, a youngster on where he could get to — and buys someone clearly better, from a smaller club or,
  // at a premium, from a peer.
  // Players climb the pyramid as they improve and slide down it as they fade: the player who lost his place is
  // sold to a smaller club that needs him, and that fee funds the next deal. Leftover surplus goes at the summer trim.
  T.AI_SHOPPERS = 60;
  const STARTERS = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
  const starterLevel = (sq, g) => sq.filter((p) => D.POS_GROUP[p.pos] === g && !p.loan).map(T.outlook).sort((a, b) => b - a)[STARTERS[g] - 1] ?? 0;
  T.offload = function (c, g, clubs) {
    const sq = W.squad(c.id);
    if (sq.length <= W.squadTarget(c) + 2) return;
    const out = sq.filter((p) => D.POS_GROUP[p.pos] === g && !p.loan && W.age(p) >= 22).sort((a, b) => T.outlook(a) - T.outlook(b))[0];
    if (!out) return;
    const fee = U.roundMoney(T.askPrice(out) * 0.8);
    const b = clubs.filter((x) => x.id !== c.id && x.rep < c.rep - 3 && fee <= x.budget && W.squad(x.id).length < W.squadTarget(x) + 5 && out.ca >= starterLevel(W.squad(x.id), g) + 2)
      .sort((x, y) => y.rep - x.rep)[0];
    if (b) T.execute(out, b.id, fee, T.wageDemand(out, b));
  };
  T.outlook = (p) => { const a = W.age(p); return p.ca - Math.max(0, a - (p.pos === 'GK' ? 31 : 29)) * 3.5 + (a <= 21 ? Math.max(0, p.pa - p.ca) * 0.3 : 0); };
  const premium = (p, c) => (p.clubId && FM.S.clubs[p.clubId].rep >= c.rep - 2 ? 1.25 : 1); // prising a player from a rival costs more
  // Clubs don't sell to a direct domestic rival (same league, similar standing)
  const rivalSale = (p, c) => { const s = p.clubId && FM.S.clubs[p.clubId]; return !!s && s.comp === c.comp && s.rep >= c.rep - 10; };
  T.aiWindow = function () {
    const S = FM.S;
    const full = Object.values(S.clubs).filter((c) => (c.sim === 'full' || c.sim === 'light') && !W.isUser(c.id));
    const market = Object.values(S.players).filter((p) => !p.retired && !p.loan && !W.isUser(p.clubId) && W.age(p) >= 19 && W.age(p) <= (p.pos === 'GK' ? 31 : 29));
    const k = W.dayScale() * (full.length / 110); // per-day quotas tuned on 110 clubs and 22 league days
    U.shuffle(full).slice(0, Math.round(T.AI_SHOPPERS * k)).forEach((c) => {
      const sq = W.squad(c.id);
      if (sq.length >= W.squadTarget(c) + 5) return;
      const spots = Object.keys(STARTERS).map((g) => ({ g, v: starterLevel(sq, g) })).sort((a, b) => a.v - b.v);
      if (spots[0].v >= W.levelFor(c.rep) + 6 && Math.random() < 0.5) return; // strong everywhere: mostly stand pat
      const foreignFull = T.foreignCount(c) >= S.rules.foreignLimit + 3;
      // the weakest spot first; if nobody better is available there, the next one
      let pool = [];
      for (const spot of spots.slice(0, 2)) {
        pool = market.filter((p) => D.POS_GROUP[p.pos] === spot.g && p.clubId !== c.id && p.ca >= spot.v + 3 &&
          (!p.clubId || S.clubs[p.clubId].rep < c.rep + 3) && !rivalSale(p, c) && T.askPrice(p) * premium(p, c) <= c.budget && !(foreignFull && p.nat !== c.nat));
        if (pool.length) break;
      }
      if (!pool.length) return;
      // Scouting networks abroad make foreign targets slightly more attractive for bigger clubs; younger ones have resale value
      const p = U.wpick(pool, (x) => Math.pow(x.ca, 3) * (W.age(x) <= 25 ? 1.25 : 1) * (nationOf(x.clubId) && nationOf(x.clubId) !== c.nat && c.rep >= 70 ? 1.3 : 1));
      if (Math.random() < 0.15) { FM.Stories.rumour(p, c); return; }
      T.execute(p, c.id, U.roundMoney(T.askPrice(p) * premium(p, c)), T.wageDemand(p, c));
      T.offload(c, D.POS_GROUP[p.pos], full);
    });

    // Good free agents don't stay unemployed: the best club that needs him and can pay signs him
    Object.values(S.players).filter((p) => !p.clubId && !p.retired && W.age(p) <= 33).sort((a, b) => b.ca - a.ca).slice(0, Math.max(1, Math.round(2 * full.length / 110))).forEach((p) => {
      const suitors = full.filter((c) => W.levelFor(c.rep) >= p.ca - 8 && W.levelFor(c.rep) <= p.ca + 4 && W.squad(c.id).length < 26).sort((a, b) => b.rep - a.rep);
      const c = suitors[0];
      if (c && Math.random() < 0.6 * W.dayScale()) T.execute(p, c.id, 0, T.wageDemand(p, c));
    });

    // Marquee raid: a giant prises the best young talent out of another country
    if (Math.random() < 0.35 * k) {
      const giants = full.filter((c) => c.rep >= 80 && c.budget > 1e7);
      const g = giants.length && U.pick(giants);
      if (g) {
        const cands = Object.values(S.players).filter((p) => p.clubId && !p.loan && !W.isUser(p.clubId) && nationOf(p.clubId) !== g.nat && S.clubs[p.clubId].rep < g.rep && W.age(p) <= 24 && T.askPrice(p) * 1.15 <= g.budget);
        const star = cands.sort((a, b) => (b.ca + (b.pa - b.ca) * 0.5) - (a.ca + (a.pa - a.ca) * 0.5))[0];
        if (star && star.ca >= W.levelFor(g.rep) - 6) T.execute(star, g.id, U.roundMoney(T.askPrice(star) * 1.15), T.wageDemand(star, g), { marquee: true });
      }
    }

    // Veterans head abroad for one last adventure (or a big pay day)
    if (Math.random() < 0.5 * k) {
      const vets = Object.values(S.players).filter((p) => p.clubId && !p.loan && !W.isUser(p.clubId) && S.clubs[p.clubId].sim === 'full' && W.age(p) >= 30 && p.season.apps < Math.max(3, FM.Season.gamesPlayed(p.clubId) * 0.4));
      const v = vets.length && U.pick(vets);
      if (v) {
        const dests = Object.values(S.clubs).filter((c) => c.id !== v.clubId && c.nat !== nationOf(v.clubId) && (c.sim === 'minimal' || c.rep < S.clubs[v.clubId].rep - 5) && !W.isUser(c.id));
        const d = dests.length && U.pick(dests);
        if (d) T.execute(v, d.id, U.roundMoney(v.value * 0.6), Math.round(v.wage * (d.sim === 'minimal' ? 1.4 : 1)), { veteran: true });
      }
    }

    T.aiLoans(full);
    if (FM.Season.baseRound() >= 10) T.winterExits(full);
  };

  // Loans: clubs send players who aren't getting games to clubs where they will. Young ones (22 and under, with
  // room to grow) go to develop; some fringe seniors go to stay sharp or off the wage bill. The borrower must
  // be a smaller club where he'd start or rotate, and the parent keeps enough bodies in his position.
  T.LOANS_PER_DAY = 40;
  T.aiLoans = function (full) {
    const S = FM.S, played = Math.max(2, FM.Season.baseRound() * 0.35 * 1.7); // ~games played by a typical club
    const pool = Object.values(S.players).filter((p) => {
      if (!p.clubId || p.loan || p.inj || W.isUser(p.clubId) || p.contract <= S.year || p.season.apps > played) return false;
      const c = S.clubs[p.clubId], a = W.age(p);
      if (c.sim === 'minimal' || a < 18 || a > 29) return false;
      return a <= 22 ? p.pa - p.ca >= 5 && p.ca >= W.levelFor(c.rep) - 30 : p.ca < W.levelFor(c.rep) - 4;
    });
    for (let i = 0; i < Math.round(T.LOANS_PER_DAY * W.dayScale() * (full.length / 110)) && pool.length; i++) {
      const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], parent = S.clubs[k.clubId], g = D.POS_GROUP[k.pos];
      if (W.age(k) > 22 && Math.random() < 0.5) continue; // much senior surplus stays put
      const home = W.squad(parent.id).filter((p) => !p.loan);
      if (home.length <= W.squadTarget(parent) - 1 || home.filter((p) => D.POS_GROUP[p.pos] === g).length <= (g === 'GK' ? 3 : STARTERS[g] + 1)) continue;
      const dests = full.filter((c) => c.id !== parent.id && c.rep < parent.rep - 3 && W.squad(c.id).length < W.squadTarget(c) + 3 &&
        k.ca >= starterLevel(W.squad(c.id), g) + 1 && k.ca <= W.levelFor(c.rep) + 12).sort((a, b) => b.rep - a.rep);
      const d = dests[Math.floor(Math.random() * Math.min(3, dests.length))];
      if (d) T.loan(k, d.id, W.age(k) <= 22 ? U.pick([0.5, 0.75, 1]) : U.pick([0.75, 1]), 0);
    }
  };
  // Winter exits: a few clubs with a bloated squad agree to cancel the contract of a veteran who isn't playing
  T.winterExits = function (full) {
    const S = FM.S, played = Math.max(2, FM.Season.baseRound() * 0.25 * 1.7);
    for (const c of U.shuffle(full.slice()).slice(0, Math.max(1, Math.round(4 * W.dayScale() * (full.length / 110))))) {
      const sq = W.squad(c.id);
      if (sq.length <= W.squadTarget(c) + 2) continue;
      const p = sq.filter((x) => !x.loan && W.age(x) >= 28 && x.season.apps <= played && x.pos !== 'GK').sort((a, b) => T.outlook(a) - T.outlook(b))[0];
      if (!p || Math.random() < 0.5) continue;
      W.spell(p).to = S.year; p.clubId = null; p.listed = false; p.freeSince = FM.Season.dayIndex();
    }
  };

  T.aiBidsForUser = function () {
    const S = FM.S, uc = W.userClub();
    const sq = W.squad(uc.id).filter((p) => !p.loan);
    const listed = sq.filter((p) => p.listed);
    if (!listed.length && Math.random() > 0.3) return;
    const target = listed.length ? U.pick(listed) : U.wpick(sq, (p) => Math.pow(p.value, 1.2) * (p.form.length ? U.avg(p.form) / 6.5 : 1));
    if (!target) return;
    const bidders = Object.values(S.clubs).filter((c) => (c.sim === 'full' || c.sim === 'light') && !W.isUser(c.id) && c.rep >= uc.rep - (target.listed ? 20 : 4) && c.budget >= target.value * 0.8);
    if (!bidders.length) return;
    const b = U.pick(bidders);
    const fee = U.roundMoney(target.value * U.rand(target.listed ? 0.75 : 0.9, 1.35));
    if (S.news.some((n) => n.type === 'bid' && n.data.pid === target.id && n.data.status === 'open')) return;
    FM.News.add({ type: 'bid', title: `${b.name} bid ${U.money(fee)} for ${W.name(target)}`, body: `${W.name(target)} is valued at ${U.money(target.value)}. ${W.hasTrait(target, 'Loyal') ? 'He has said he is happy here.' : target.hid.amb >= 14 ? 'He is known to be ambitious — rejecting could unsettle him.' : ''}`, pid: target.id, clubId: b.id, data: { pid: target.id, from: b.id, fee, status: 'open' } });
  };

  T.respondBid = function (n, accept) {
    const S = FM.S, p = S.players[n.data.pid];
    if (n.data.status !== 'open') return 'Already resolved.';
    if (!p || !W.isUser(p.clubId)) { n.data.status = 'void'; return 'The player is no longer at the club.'; }
    if (!FM.Season.windowOpen()) { n.data.status = 'expired'; return 'The window has closed — the bid lapsed.'; }
    if (accept) {
      n.data.status = 'accepted';
      T.execute(p, n.data.from, n.data.fee, null);
      return `${W.name(p)} has joined ${S.clubs[n.data.from].name} for ${U.money(n.data.fee)}.`;
    }
    n.data.status = 'rejected';
    if (FM.People.onBidRejected(p, n.data.fee)) return `Bid rejected. ${W.name(p)} feels betrayed — you promised to let him go for the right offer.`;
    if (!W.hasTrait(p, 'Loyal') && p.hid.amb >= 13) { p.morale = Math.max(0, p.morale - 15); return `Bid rejected. ${W.name(p)} is unhappy — he wanted the move.`; }
    return 'Bid rejected. The player accepts the decision.';
  };
})();
