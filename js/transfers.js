// Transfer market: asking prices, wage demands, loans, user offers, the AI market (windows, loans, winter exits)
// and bids for your players.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;

  const T = (FM.Transfers = {});
  // A player who has just moved or signed a new contract is settled for a year: he doesn't talk about leaving,
  // and clubs don't try to prise him away (p.settled = the day index it ends, same day next season)
  T.settle = (p) => (p.settled = FM.Season.dayIndex() + 1000);
  T.isSettled = (p) => p.settled != null && FM.Season.dayIndex() < p.settled;
  // A club's five best players (cached per matchday: the AI market asks this for thousands of players)
  let keyCache = { k: null, m: null };
  T.isKey = function (p) {
    if (!p.clubId) return false;
    const k = `${FM.S.year}-${FM.S.day}`;
    if (keyCache.k !== k || keyCache.S !== FM.S) {
      const by = {};
      Object.values(FM.S.players).forEach((q) => {
        if (q.clubId && !q.retired) (by[q.clubId] = by[q.clubId] || []).push(q);
      });
      const m = new Set();
      for (const id in by)
        by[id]
          .sort((a, b) => b.ca - a.ca)
          .slice(0, 5)
          .forEach((q) => m.add(q.id));
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
    f *= FM.Market.sellFactor(p); // a player who wants away, a club that needs the money, a surplus: cheaper
    if (p.deal && p.deal.release) f = Math.min(f, p.deal.release); // nobody asks more than the clause
    return U.roundMoney(f);
  };
  // A good sporting director shaves the fee and the agent's demands when you buy
  T.dirFactor = () => FM.Staff.impact('director').buy;
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
    const S = FM.S,
      parent = S.clubs[p.clubId],
      age = W.age(p);
    const round = FM.Season.gamesPlayed(p.clubId);
    let share = 0.45;
    if (T.isKey(p)) share += 0.6;
    if (p.season.apps > Math.max(3, round * 0.6)) share += 0.25;
    if (age <= 21) share -= 0.2;
    if (parent.rep >= 75) share -= 0.05;
    return {
      share: U.clamp(share, 0.25, 1.2),
      available: share <= 1 && age <= 30 && !p.loan && parent.sim !== 'minimal',
    };
  };
  T.loanOffer = function (pid, share, fee = 0) {
    const S = FM.S,
      p = S.players[pid],
      club = W.userClub();
    if (!FM.Season.windowOpen()) return { ok: false, msg: 'Loans can only be agreed while the window is open.' };
    if (!p.clubId) return { ok: false, msg: 'He is a free agent — just offer him a contract.' };
    if (p.loan) return { ok: false, msg: `He's already on loan at ${S.clubs[p.clubId].name}.` };
    const t = T.loanTerms(p);
    if (!t.available)
      return { ok: false, msg: `${S.clubs[p.clubId].name} won't loan him out — he's too important to them.` };
    const need = t.share - (fee >= p.value * 0.05 ? 0.2 : 0);
    if (share + 1e-9 < need)
      return {
        ok: false,
        counter: Math.min(1, Math.ceil(need * 20) / 20),
        msg: `${S.clubs[p.clubId].name} want you to cover at least ${Math.round(Math.min(1, need) * 100)}% of his wages${fee ? '' : ' (a small loan fee would help)'}.`,
      };
    if (!T.canRegister(club, p))
      return {
        ok: false,
        msg: `You can't register him: ${FM.Reg.real() ? FM.Reg.canSign(club, p).why : 'foreign-player limit'}`,
      };
    if (FM.Finance.frozen(p.wage * share))
      return { ok: false, msg: 'The board have frozen the wage bill: no new wages until it comes down.' };
    const lvl = FM.Scouting.level();
    if (p.ca < lvl - 14 && W.age(p) > 21)
      return { ok: false, msg: `His club want him to play regularly — they don't think he'd get minutes with you.` };
    if (fee > club.budget) return { ok: false, msg: `The loan fee exceeds your budget.` };
    T.loan(p, club.id, share, fee);
    return { ok: true, msg: `✅ ${W.name(p)} joins on a season-long loan (${Math.round(share * 100)}% of wages).` };
  };
  T.loan = function (p, toId, share, fee = 0) {
    const S = FM.S,
      from = S.clubs[p.clubId],
      to = S.clubs[toId];
    from.balance += fee;
    to.balance -= fee;
    to.budget = Math.max(0, to.budget - fee);
    const sp = W.spell(p);
    if (sp) sp.to = S.year;
    p.loan = { from: from.id, share, fee, year: S.year, wg: FM.Season.gamesPlayed(toId), wa: 0 }; // wg/wa: minutes watch
    W.startSpell(p, toId);
    W.spell(p).loan = true;
    W.spell(p).signed = true;
    p.morale = Math.min(100, p.morale + 6);
    if (W.isUser(toId)) S.user.knowledge[p.id] = 100;
    if (W.isUser(from.id) && S.user.tactic.lineup)
      S.user.tactic.lineup = S.user.tactic.lineup.map((x) => (x === p.id ? null : x));
    S.seasonLog.transfers.push({
      pid: p.id,
      name: W.name(p),
      nat: p.nat,
      from: from.id,
      to: toId,
      fee,
      intl: from.nat !== to.nat,
      day: S.day,
      age: W.age(p),
      loan: true,
    });
    FM.Stories.loan(p, from, to, share);
  };
  // AI clubs interested in taking one of the user's players on loan
  T.loanOutOffers = function (pid) {
    const S = FM.S,
      p = S.players[pid],
      uc = W.userClub();
    const clubs = Object.values(S.clubs).filter(
      (c) =>
        (c.sim === 'full' || c.sim === 'light') &&
        !W.isUser(c.id) &&
        c.rep < uc.rep + 5 &&
        W.levelFor(c.rep) >= p.ca - 12 &&
        T.canRegister(c, p),
    );
    return U.shuffle(clubs)
      .slice(0, 3)
      .map((c) => ({
        club: c.id,
        share: Math.min(1, Math.round((0.5 + Math.random() * 0.5 + (W.levelFor(c.rep) < p.ca ? 0.15 : 0)) * 20) / 20),
        minutes: W.levelFor(c.rep) <= p.ca + 2 ? 'Regular starter' : 'Rotation',
      }));
  };
  // Return every loanee to their parent club (season end)
  T.endLoans = function () {
    const S = FM.S;
    Object.values(S.players).forEach((p) => {
      if (!p.loan) return;
      // An option to buy: the borrower takes it up if he played most of their games
      const o = p.loan;
      if (o.buy && !W.ownPlayer(p) && S.clubs[p.clubId] && W.spell(p).apps >= 15 && S.clubs[p.clubId].budget >= o.buy) {
        const buyer = S.clubs[p.clubId],
          parent = S.clubs[o.from];
        W.spell(p).to = S.year - 1;
        delete p.loan;
        p.clubId = parent.id; // the sale is from the parent club
        T.execute(p, buyer.id, o.buy, T.wageDemand(p, buyer));
        if (W.isUser(parent.id))
          FM.News.add({
            type: 'club',
            title: `${buyer.name} make ${W.name(p)}'s move permanent`,
            body: `They took up the option to buy him for ${U.money(o.buy)}.`,
            pid: p.id,
            clubId: parent.id,
          });
        return;
      }
      const sp = W.spell(p);
      if (sp) sp.to = S.year - 1;
      const parent = p.loan.from,
        was = p.clubId;
      delete p.loan;
      W.startSpell(p, parent);
      if (W.isUser(parent))
        FM.News.add({
          type: 'club',
          title: `${W.name(p)} returns from loan`,
          body: `Back from ${S.clubs[was].name} after ${W.spell(p) && p.career.spells.slice(-2)[0].apps} appearances.`,
          pid: p.id,
          clubId: parent,
        });
    });
  };

  T.offer = function (pid, fee, wage) {
    const S = FM.S,
      p = S.players[pid],
      club = W.userClub();
    if (p.loan && W.isUser(p.loan.from))
      return { ok: false, msg: `${W.name(p)} is already your player, on loan at ${S.clubs[p.clubId].name}.` };
    if (p.loan)
      return {
        ok: false,
        msg: `He's on loan at ${S.clubs[p.clubId].name}. Try again when he returns to ${S.clubs[p.loan.from].name}.`,
      };
    if (p.clubId && !FM.Season.windowOpen())
      return {
        ok: false,
        msg: 'The transfer window is closed. It reopens mid-season (matchday 12) and in pre-season. Free agents can be signed any time.',
      };
    if (fee > club.budget) return { ok: false, msg: `That exceeds your transfer budget of ${U.money(club.budget)}.` };
    const seller = p.clubId && S.clubs[p.clubId];
    if (seller) {
      const ask = T.userAsk(p);
      if (fee < ask * 0.85)
        return {
          ok: false,
          msg: `${seller.name} reject the offer out of hand. They value him closer to ${U.money(ask)}.`,
        };
      if (fee < ask)
        return { ok: false, counter: ask, msg: `${seller.name} want ${U.money(ask)}. Close, but not enough.` };
    }
    // Player's view
    if (seller && T.isSettled(p) && !W.hasTrait(p, 'Mercenary'))
      return { ok: false, msg: `${W.name(p)} has only just committed to ${seller.name} and isn't looking to move.` };
    if (seller && W.hasTrait(p, 'Loyal') && T.isKey(p) && fee < T.userAsk(p) * 1.4)
      return { ok: false, msg: `${W.name(p)} is loyal to ${seller.name} and won't consider the move.` };
    if (seller && seller.rep > club.rep + 10 && p.hid.amb >= 12)
      return { ok: false, msg: `${W.name(p)} doesn't see ${club.name} as a step up.` };
    const dem = T.wageDemand(p, club);
    if (wage < dem)
      return { ok: false, counter: null, wageDemand: dem, msg: `${W.name(p)}'s agent wants ${U.money(dem)}/wk.` };
    const bonus = T.signingBonus(p, wage);
    if (bonus) club.balance -= bonus;
    T.execute(p, club.id, fee, wage);
    return {
      ok: true,
      msg: `✅ ${W.name(p)} signs for ${club.name}!${bonus ? ` Signing-on bonus: ${U.money(bonus)}.` : ''}`,
    };
  };

  // flags.deal: a structured fee (instalments, add-on, sell-on: FM.Market). Only the first instalment changes hands
  // now; the buyer's budget also sets aside half of what is still to pay.
  T.execute = function (p, toId, fee, wage, flags = {}) {
    const icon = W.ownPlayer(p) && FM.Season.isIcon(p);
    const S = FM.S,
      from = p.clubId && S.clubs[FM.Youth.owner(p.clubId)], // a B-team player is sold by the parent club
      to = S.clubs[toId];
    p.team = undefined; // a new club: he starts in its first-team squad
    const deal = from ? flags.deal : null,
      cash = FM.Market.cashNow(fee, deal);
    if (from) {
      FM.Market.onSale(p, from, to, fee, deal);
      from.balance += cash;
      if (icon) {
        from.fanMood = Math.max(0, from.fanMood - 10);
        FM.News.add({
          type: 'club',
          title: `Fans furious as club icon ${W.name(p)} is sold`,
          body: `${W.spell(p).apps} appearances for ${from.name}, and now he's gone to ${S.clubs[toId].name}. The supporters won't forget this one.`,
          pid: p.id,
          clubId: from.id,
        });
      }
      if (from.sim === 'full' || from.sim === 'light') from.budget += cash * FM.Finance.mix(from).sell; // selling leagues reinvest more
      from.bestSales = (from.bestSales || [])
        .concat([{ pid: p.id, name: W.name(p), fee, to: toId, year: S.year }])
        .sort((a, b) => b.fee - a.fee)
        .slice(0, 5);
      const sp = W.spell(p);
      if (sp) sp.to = S.year;
      S.seasonLog.net[from.id] = (S.seasonLog.net[from.id] || 0) + fee;
      if (W.isUser(from.id)) S.user.stats.sold++;
    }
    to.balance -= cash;
    to.budget = Math.max(0, to.budget - cash - (fee - cash) * 0.5);
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
    delete p.freeSince;
    delete p.trial;
    T.settle(p);
    p.value = W.value(p);
    if (!W.isUser(toId)) FM.Contracts.aiDeal(p, to);
    if (W.isUser(toId)) {
      S.user.knowledge[p.id] = 100;
      S.user.stats.bought++;
      S.user.shortlist = S.user.shortlist.filter((x) => x !== p.id);
    }
    if (W.isUser(from && from.id) && S.user.tactic.lineup)
      S.user.tactic.lineup = S.user.tactic.lineup.map((x) => (x === p.id ? null : x));
    const intl = !!from && from.nat !== to.nat;
    S.seasonLog.transfers.push({
      pid: p.id,
      name: W.name(p),
      nat: p.nat,
      from: from && from.id,
      to: toId,
      fee,
      intl,
      day: S.day,
      age: W.age(p),
    });
    FM.Stories.transfer(p, from, to, fee, { ...flags, intl });
    if (W.isUser(toId) || (from && W.isUser(from.id))) FM.Market.reactions(p, from, to, fee, flags);
  };

  const nationOf = (clubId) => (clubId && FM.S.clubs[clubId] ? FM.S.clubs[clubId].nat : null);
  T.foreignCount = (c) => W.squad(c.id).filter((p) => p.nat !== c.nat).length;

  // AI market for one window day: squad upgrades (at home or abroad), marquee raids, veterans heading abroad.
  // Each day a batch of clubs looks at its weakest starting spot — an ageing starter judged on where he is
  // heading, a youngster on where he could get to — and buys someone clearly better, from a smaller club or,
  // at a premium, from a peer.
  // Players climb the pyramid as they improve and slide down it as they fade: the player who lost his place is
  // sold to a smaller club that needs him, and that fee funds the next deal. Leftover surplus goes at the summer trim.
  T.AI_SHOPPERS = 60;
  const STARTERS = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
  const starterLevel = (sq, g) =>
    sq
      .filter((p) => D.POS_GROUP[p.pos] === g && !p.loan)
      .map(T.outlook)
      .sort((a, b) => b - a)[STARTERS[g] - 1] ?? 0;
  T.offload = function (c, g, clubs) {
    const sq = W.squad(c.id);
    if (sq.length <= W.squadTarget(c) + 2) return;
    const out = sq
      .filter((p) => D.POS_GROUP[p.pos] === g && !p.loan && W.age(p) >= 22)
      .sort((a, b) => T.outlook(a) - T.outlook(b))[0];
    if (!out) return;
    const fee = U.roundMoney(T.askPrice(out) * 0.8);
    const b = clubs
      .filter(
        (x) =>
          x.id !== c.id &&
          x.rep < c.rep - 3 &&
          fee <= x.budget &&
          W.squad(x.id).length < W.squadTarget(x) + 5 &&
          out.ca >= starterLevel(W.squad(x.id), g) + 2,
      )
      .sort((x, y) => y.rep - x.rep)
      .find((x) => T.canRegister(x, out));
    if (b) T.execute(out, b.id, fee, T.wageDemand(out, b));
  };
  T.outlook = (p) => {
    const a = W.age(p);
    return p.ca - Math.max(0, a - (p.pos === 'GK' ? 31 : 29)) * 3.5 + (a <= 21 ? Math.max(0, p.pa - p.ca) * 0.3 : 0);
  };
  const premium = (p, c) => (p.clubId && FM.S.clubs[p.clubId].rep >= c.rep - 2 ? 1.25 : 1); // prising a player from a rival costs more
  // Clubs don't sell to a direct domestic rival (same league, similar standing)
  const rivalSale = (p, c) => {
    const s = p.clubId && FM.S.clubs[p.clubId];
    return !!s && s.comp === c.comp && s.rep >= c.rep - 10;
  };
  // A club short of players (under its squad size, with a position below the tier's numbers) buys one for the
  // thinnest position while the window is open. Returns true if it signed someone. Free agents fill whatever is
  // still missing once the window has shut (Sea.freeAgents).
  // The AI market, indexed once per day: market players by position and by group, strongest first, and asking
  // prices cached (each shopper used to scan every player and price each one: most of a window day's time)
  const indexMarket = (market) => {
    const byPos = {},
      byGroup = {},
      ask = new Map();
    const sorted = market.slice().sort((a, b) => b.ca - a.ca);
    for (const p of sorted) {
      (byPos[p.pos] = byPos[p.pos] || []).push(p);
      (byGroup[D.POS_GROUP[p.pos]] = byGroup[D.POS_GROUP[p.pos]] || []).push(p);
    }
    const price = (p) => {
      let v = ask.get(p.id);
      if (v == null) ask.set(p.id, (v = T.askPrice(p)));
      return v;
    };
    return { byPos, byGroup, price };
  };
  T.fillGap = function (c, sq, mkt) {
    if (sq.length >= W.squadTarget(c)) return false;
    const want = D.SQUAD_TIER[c.sim] || D.SQUAD_TIER.full;
    const short = Object.keys(want)
      .map((pos) => ({ pos, gap: want[pos] - sq.filter((p) => p.pos === pos && !p.loan).length }))
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap)[0];
    if (!short) return false;
    const lvl = W.levelFor(c.rep),
      regOK = T.regCheck(c),
      urg = FM.Market.urgency(c, short.pos); // short-handed: pays over the odds
    const pool = [];
    for (const p of mkt.byPos[short.pos] || []) {
      if (p.ca > lvl + 4) continue;
      if (p.ca < lvl - 12) break; // strongest first: nobody further down is good enough
      if (
        p.clubId &&
        p.clubId !== c.id &&
        !T.isSettled(p) &&
        FM.S.clubs[p.clubId].rep < c.rep + 3 &&
        !rivalSale(p, c) &&
        regOK(p) &&
        mkt.price(p) * premium(p, c) * urg <= c.budget
      )
        pool.push(p);
    }
    if (!pool.length) return false;
    const p = U.wpick(pool, (x) => Math.pow(x.ca, 3) * (W.age(x) <= 25 ? 1.25 : 1));
    T.execute(p, c.id, U.roundMoney(T.askPrice(p) * premium(p, c) * urg), T.wageDemand(p, c));
    return true;
  };
  // Can club c register a player? A checker for many candidates: each league's rules (FM.Reg), or the world-wide
  // foreign limit (with a little slack: the limit is for the matchday squad)
  T.regCheck = function (c) {
    if (FM.Reg.real()) {
      const st = FM.Reg.status(c);
      return st ? (p) => FM.Reg.canSign(c, p, st).ok : () => true;
    }
    const full = T.foreignCount(c) >= FM.S.rules.foreignLimit + 3;
    return (p) => !(full && p.nat !== c.nat);
  };
  T.canRegister = (c, p) => T.regCheck(c)(p);
  // Squad planning by age: a starter past his best (31+, keepers 33+) with no heir in the squad is replaced now,
  // by someone of his level aged 27 or under, rather than once he has already declined. Returns true if it bought.
  T.SUCCESSION = { age: 31, gk: 33, heir: 27, min: 0, chance: 0.4 };
  T.succession = function (c, sq, mkt, full, regOK) {
    const K = T.SUCCESSION;
    for (const g of U.shuffle(Object.keys(STARTERS))) {
      const grp = sq.filter((p) => D.POS_GROUP[p.pos] === g && !p.loan).sort((a, b) => b.ca - a.ca);
      const starters = grp.slice(0, STARTERS[g]);
      const old = starters
        .filter((p) => W.age(p) >= (g === 'GK' ? K.gk : K.age))
        .sort((a, b) => W.age(b) - W.age(a))[0];
      if (!old) continue;
      if (grp.some((p) => p !== old && W.age(p) <= K.heir && p.ca >= old.ca - 4)) continue; // an heir is in place
      if (Math.random() > K.chance) continue;
      const pool = [];
      for (const p of mkt.byPos[old.pos] || []) {
        if (p.ca > old.ca + 6) continue;
        if (p.ca < old.ca - 2) break; // strongest first
        if (
          W.age(p) <= K.heir &&
          W.age(p) >= K.min &&
          p.clubId !== c.id &&
          !T.isSettled(p) &&
          (!p.clubId || FM.S.clubs[p.clubId].rep < c.rep + 3) &&
          !rivalSale(p, c) &&
          regOK(p) &&
          mkt.price(p) * premium(p, c) <= c.budget
        )
          pool.push(p);
      }
      if (!pool.length) continue;
      const p = U.wpick(pool, (x) => Math.pow(x.ca, 3) * (W.age(x) <= 24 ? 1.25 : 1));
      T.execute(p, c.id, U.roundMoney(T.askPrice(p) * premium(p, c)), T.wageDemand(p, c));
      T.offload(c, g, full);
      return true;
    }
    return false;
  };
  // In the window, good free agents don't stay unemployed: the best club at his level that has room signs him.
  // (Once it has shut, free agents only fill real squad gaps: Sea.freeAgents.)
  // A daily quota in whole deals: share = the part of the day being played (deadline day runs hour by hour)
  const quota = (q) => Math.floor(q) + (Math.random() < q % 1 ? 1 : 0);
  T.aiTopFreeAgents = function (share = 1) {
    const full = Object.values(FM.S.clubs).filter((c) => (c.sim === 'full' || c.sim === 'light') && !W.isUser(c.id));
    Object.values(FM.S.players)
      .filter((p) => !p.clubId && !p.retired && W.age(p) <= 33)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, Math.max(1, Math.round((2 * full.length) / 110)))
      .forEach((p) => {
        const suitors = full
          .filter((c) => W.levelFor(c.rep) >= p.ca - 8 && W.levelFor(c.rep) <= p.ca + 4 && W.squad(c.id).length < 26)
          .sort((a, b) => b.rep - a.rep);
        const c = suitors.find((x) => T.canRegister(x, p));
        if (c && Math.random() < 0.6 * W.dayScale() * share) T.execute(p, c.id, 0, T.wageDemand(p, c));
      });
  };
  T.aiWindow = function (share = 1) {
    const S = FM.S;
    const full = Object.values(S.clubs).filter((c) => (c.sim === 'full' || c.sim === 'light') && !W.isUser(c.id));
    const market = Object.values(S.players).filter(
      (p) =>
        !p.retired &&
        !p.loan &&
        !W.ownPlayer(p) &&
        !T.isSettled(p) &&
        W.age(p) >= 19 &&
        W.age(p) <= (p.pos === 'GK' ? 31 : 29),
    );
    const k = W.dayScale() * (full.length / 110) * share; // per-day quotas tuned on 110 clubs and 22 league days
    const dd = FM.Market.isDeadline(); // deadline day: more clubs in the market, paying a premium
    const mkt = indexMarket(market);
    U.shuffle(full)
      .slice(0, quota(T.AI_SHOPPERS * k * (dd ? 1.6 : 1)))
      .forEach((c) => {
        const sq = W.squad(c.id);
        if (T.fillGap(c, sq, mkt)) return; // squad gaps come first, while the window is open
        if (sq.length >= W.squadTarget(c) + 5) return;
        const regOK = T.regCheck(c);
        if (T.succession(c, sq, mkt, full, regOK)) return; // then a successor for an ageing starter
        const spots = Object.keys(STARTERS)
          .map((g) => ({ g, v: starterLevel(sq, g) }))
          .sort((a, b) => a.v - b.v);
        if (spots[0].v >= W.levelFor(c.rep) + 6 && Math.random() < 0.5) return; // strong everywhere: mostly stand pat
        // the weakest spot first; if nobody better is available there, the next one
        let pool = [];
        for (const spot of spots.slice(0, 2)) {
          pool = [];
          for (const p of mkt.byGroup[spot.g] || []) {
            if (p.ca < spot.v + 3) break; // strongest first: nobody further down would improve the side
            if (
              p.clubId !== c.id &&
              !T.isSettled(p) &&
              (!p.clubId || S.clubs[p.clubId].rep < c.rep + 3) &&
              !rivalSale(p, c) &&
              regOK(p) &&
              mkt.price(p) * premium(p, c) * (dd ? 1.1 : 1) <= c.budget
            )
              pool.push(p);
          }
          if (pool.length) break;
        }
        if (!pool.length) return;
        // Scouting networks abroad make foreign targets slightly more attractive for bigger clubs; younger ones have resale value
        const p = U.wpick(
          pool,
          (x) =>
            Math.pow(x.ca, 3) *
            (W.age(x) <= 25 ? 1.25 : 1) *
            (nationOf(x.clubId) && nationOf(x.clubId) !== c.nat && c.rep >= 70 ? 1.3 : 1),
        );
        if (Math.random() < 0.15) {
          FM.Stories.rumour(p, c);
          return;
        }
        T.execute(p, c.id, U.roundMoney(T.askPrice(p) * premium(p, c) * (dd ? 1.1 : 1)), T.wageDemand(p, c));
        T.offload(c, D.POS_GROUP[p.pos], full);
      });
    T.aiTopFreeAgents(share);

    // Marquee raid: a giant prises the best young talent out of another country
    if (Math.random() < 0.35 * k) {
      const giants = full.filter((c) => c.rep >= 80 && c.budget > 1e7);
      const g = giants.length && U.pick(giants);
      if (g) {
        const cands = Object.values(S.players).filter(
          (p) =>
            p.clubId &&
            !p.loan &&
            !W.ownPlayer(p) &&
            !T.isSettled(p) &&
            nationOf(p.clubId) !== g.nat &&
            S.clubs[p.clubId].rep < g.rep &&
            W.age(p) <= 24 &&
            T.askPrice(p) * 1.15 <= g.budget,
        );
        const star = cands.sort((a, b) => b.ca + (b.pa - b.ca) * 0.5 - (a.ca + (a.pa - a.ca) * 0.5))[0];
        if (star && star.ca >= W.levelFor(g.rep) - 6 && T.canRegister(g, star))
          T.execute(star, g.id, U.roundMoney(T.askPrice(star) * 1.15), T.wageDemand(star, g), { marquee: true });
      }
    }

    // Veterans head abroad for one last adventure (or a big pay day)
    if (Math.random() < 0.5 * k) {
      const vets = Object.values(S.players).filter(
        (p) =>
          p.clubId &&
          !p.loan &&
          !W.ownPlayer(p) &&
          S.clubs[p.clubId].sim === 'full' &&
          W.age(p) >= 30 &&
          p.season.apps < Math.max(3, FM.Season.gamesPlayed(p.clubId) * 0.4),
      );
      const v = vets.length && U.pick(vets);
      if (v) {
        const dests = Object.values(S.clubs).filter(
          (c) =>
            c.id !== v.clubId &&
            c.nat !== nationOf(v.clubId) &&
            (c.sim === 'minimal' || c.rep < S.clubs[v.clubId].rep - 5) &&
            !W.isUser(c.id),
        );
        const d = dests.length && U.pick(dests);
        if (d && T.canRegister(d, v))
          T.execute(v, d.id, U.roundMoney(v.value * 0.6), Math.round(v.wage * (d.sim === 'minimal' ? 1.4 : 1)), {
            veteran: true,
          });
      }
    }

    T.aiLoans(full, share);
    if (FM.Season.baseRound() >= 10) T.winterExits(full, share);
  };

  // Loans: clubs send players who aren't getting games to clubs where they will. Young ones (22 and under, with
  // room to grow) go to develop; some fringe seniors go to stay sharp or off the wage bill. The borrower must
  // be a smaller club where he'd start or rotate, and the parent keeps enough bodies in his position.
  T.LOANS_PER_DAY = 40;
  T.aiLoans = function (full, share = 1) {
    const levels = new Map(); // club|group → starter level (a loan changes only the borrowing club's)
    const levelOf = (c, g) => {
      const key = c.id + '|' + g;
      if (!levels.has(key)) levels.set(key, starterLevel(W.squad(c.id), g));
      return levels.get(key);
    };
    const S = FM.S,
      played = Math.max(2, FM.Season.baseRound() * 0.35 * 1.7); // ~games played by a typical club
    const pool = Object.values(S.players).filter((p) => {
      if (!p.clubId || p.loan || p.inj || W.ownPlayer(p) || p.contract <= S.year || p.season.apps > played)
        return false;
      const c = S.clubs[p.clubId],
        a = W.age(p);
      if (c.sim === 'minimal' || a < 18 || a > 29) return false;
      return a <= 22 ? p.pa - p.ca >= 5 && p.ca >= W.levelFor(c.rep) - 30 : p.ca < W.levelFor(c.rep) - 4;
    });
    const n = quota(T.LOANS_PER_DAY * W.dayScale() * (full.length / 110) * share);
    for (let i = 0; i < n && pool.length; i++) {
      const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
        parent = S.clubs[k.clubId],
        g = D.POS_GROUP[k.pos];
      if (W.age(k) > 22 && Math.random() < 0.5) continue; // much senior surplus stays put
      const home = W.squad(parent.id).filter((p) => !p.loan);
      if (
        home.length <= W.squadTarget(parent) - 1 ||
        home.filter((p) => D.POS_GROUP[p.pos] === g).length <= (g === 'GK' ? 3 : STARTERS[g] + 1)
      )
        continue;
      const dests = full
        .filter(
          (c) =>
            c.id !== parent.id &&
            c.rep < parent.rep - 3 &&
            k.ca <= W.levelFor(c.rep) + 12 &&
            W.squad(c.id).length < W.squadTarget(c) + 3 &&
            k.ca >= levelOf(c, g) + 1,
        )
        .sort((a, b) => b.rep - a.rep);
      const ok = dests.slice(0, 8).filter((x) => T.canRegister(x, k)); // clubs that could register him
      const d = ok[Math.floor(Math.random() * Math.min(3, ok.length))];
      if (d) {
        T.loan(k, d.id, W.age(k) <= 22 ? U.pick([0.5, 0.75, 1]) : U.pick([0.75, 1]), 0);
        levels.delete(d.id + '|' + g);
        levels.delete(parent.id + '|' + g);
      }
    }
  };
  // Winter exits: a few clubs with a bloated squad agree to cancel the contract of a veteran who isn't playing
  T.winterExits = function (full, share = 1) {
    const S = FM.S,
      played = Math.max(2, FM.Season.baseRound() * 0.25 * 1.7);
    for (const c of U.shuffle(full.slice()).slice(
      0,
      quota(Math.max(1, 4 * W.dayScale() * (full.length / 110)) * share),
    )) {
      const sq = W.squad(c.id);
      if (sq.length <= W.squadTarget(c) + 2) continue;
      const p = sq
        .filter((x) => !x.loan && W.age(x) >= 28 && x.season.apps <= played && x.pos !== 'GK')
        .sort((a, b) => T.outlook(a) - T.outlook(b))[0];
      if (!p || Math.random() < 0.5) continue;
      W.spell(p).to = S.year;
      p.clubId = null;
      p.listed = false;
      p.freeSince = FM.Season.dayIndex();
    }
  };

  T.aiBidsForUser = function () {
    const S = FM.S,
      uc = W.userClub();
    const sq = W.squad(uc.id).filter((p) => !p.loan && (p.listed || !T.isSettled(p)));
    const listed = sq.filter((p) => p.listed);
    if (!listed.length && Math.random() > 0.3) return;
    const target = listed.length
      ? U.pick(listed)
      : U.wpick(sq, (p) => Math.pow(p.value, 1.2) * (p.form.length ? U.avg(p.form) / 6.5 : 1));
    if (!target) return;
    const bidders = Object.values(S.clubs).filter(
      (c) =>
        (c.sim === 'full' || c.sim === 'light') &&
        !W.isUser(c.id) &&
        c.rep >= uc.rep - (target.listed ? 20 : 4) &&
        c.budget >= target.value * 0.8,
    );
    if (!bidders.length) return;
    const b = U.pick(bidders);
    if (S.news.some((n) => n.type === 'bid' && n.data.pid === target.id && n.data.status === 'open')) return;
    // A club short at his position (or buying on deadline day) bids higher and has more room to go up
    const urg = FM.Market.urgency(b, target.pos);
    // a good sporting director gets more out of the clubs bidding for your players
    let fee = U.roundMoney(
      target.value * U.rand(target.listed ? 0.75 : 0.9, 1.35) * urg * FM.Staff.impact('director').sell,
    );
    const r = Math.random(),
      deal = r < 0.25 ? { inst: U.pick([2, 3]) } : r < 0.4 ? { addOn: U.roundMoney(fee * 0.15), addApps: 20 } : null;
    if (deal && deal.inst) fee = U.roundMoney(fee * (deal.inst === 3 ? 1.1 : 1.06)); // paying later costs them more
    const max = U.roundMoney(fee * U.rand(1, 1.3) * (urg > 1 ? 1.1 : 1)); // as far as they'd go
    W.addInterest(target, 2);
    FM.News.add({
      type: 'bid',
      title: `${b.name} bid ${U.money(fee)} for ${W.name(target)}`,
      body: `${W.name(target)} is valued at ${U.money(target.value)}.${urg > 1.05 ? ` They're short at ${D.POS_NAME[target.pos].toLowerCase()} and keen to get it done.` : ''} ${W.hasTrait(target, 'Loyal') ? 'He has said he is happy here.' : target.hid.amb >= 14 ? 'He is known to be ambitious — rejecting could unsettle him.' : ''}`,
      pid: target.id,
      clubId: b.id,
      data: { pid: target.id, from: b.id, fee, status: 'open', max, deal, rounds: 0 },
    });
  };

  T.respondBid = function (n, accept) {
    const S = FM.S,
      p = S.players[n.data.pid];
    if (n.data.status !== 'open') return 'Already resolved.';
    if (!p || !W.ownPlayer(p)) {
      n.data.status = 'void';
      return 'The player is no longer at the club.';
    }
    if (!FM.Season.windowOpen()) {
      n.data.status = 'expired';
      return 'The window has closed — the bid lapsed.';
    }
    if (accept) return T.completeBid(n, p);
    n.data.status = 'rejected';
    if (n.data.loan) return 'Loan offer turned down.';
    if (FM.People.onBidRejected(p, n.data.fee))
      return `Bid rejected. ${W.name(p)} feels betrayed — you promised to let him go for the right offer.`;
    if (!W.hasTrait(p, 'Loyal') && p.hid.amb >= 13 && !T.isSettled(p)) {
      p.morale = Math.max(0, p.morale - 15);
      return `Bid rejected. ${W.name(p)} is unhappy — he wanted the move.`;
    }
    return 'Bid rejected. The player accepts the decision.';
  };
  // You've agreed to sell: the player can still turn the move down, and the buyer must be able to register him
  T.completeBid = function (n, p) {
    const S = FM.S,
      buyer = S.clubs[n.data.from];
    if (n.data.loan) {
      if (!T.canRegister(buyer, p)) {
        n.data.status = 'void';
        return `${buyer.name} can't register him under their league's rules — the loan is off.`;
      }
      n.data.status = 'accepted';
      T.loan(p, buyer.id, n.data.loan.share, 0);
      if (n.data.loan.buy) p.loan.buy = n.data.loan.buy;
      if (n.data.loan.starts) p.loan.promised = true;
      return `${W.name(p)} joins ${buyer.name} on loan${n.data.loan.buy ? ` (option to buy: ${U.money(n.data.loan.buy)})` : ''}.`;
    }
    if (!T.canRegister(buyer, p)) {
      n.data.status = 'void';
      return `${buyer.name} can't register ${W.name(p)} under their league's rules — the deal is off.`;
    }
    if (FM.Market.refusesMove(p, buyer)) {
      n.data.status = 'refused';
      return `${W.name(p)} turns down the move to ${buyer.name}. He's happy here.`;
    }
    n.data.status = 'accepted';
    T.execute(p, buyer.id, n.data.fee, null, { deal: n.data.deal });
    return `${W.name(p)} has joined ${buyer.name} for ${FM.Market.describeDeal(n.data.fee, n.data.deal)}.`;
  };
  // Negotiate a bid for your player in full: your fee and how it's paid (instalments, add-on, a sell-on clause for
  // you). The bidder accepts anything that costs them no more than their limit; above it they come back part of
  // the way (three times at most), and a demand far beyond it twice and they walk away.
  T.negotiateBid = function (n, fee, deal) {
    const S = FM.S,
      d = n.data,
      p = S.players[d.pid],
      buyer = S.clubs[d.from],
      M = FM.Market;
    if (d.status !== 'open') return { msg: 'Already resolved.' };
    if (!p || !W.ownPlayer(p)) {
      d.status = 'void';
      return { msg: 'The player is no longer at the club.' };
    }
    if (!FM.Season.windowOpen()) {
      d.status = 'expired';
      return { msg: 'The window has closed — the bid lapsed.' };
    }
    const cost = M.dealValue(p, fee, deal),
      max = d.max || d.fee,
      now = M.dealValue(p, d.fee, d.deal);
    if (cost <= max * 1.005) {
      d.fee = fee;
      d.deal = deal;
      return { done: true, msg: `${buyer.name} agree to ${M.describeDeal(fee, deal)}. ` + T.completeBid(n, p) };
    }
    if (cost > max * 1.6) {
      d.angry = (d.angry || 0) + 1;
      if (d.angry >= 2) {
        d.status = 'withdrawn';
        return { msg: `${buyer.name} find your demands insulting and pull out.` };
      }
      return { msg: `${buyer.name} won't even discuss that. Their offer stands at ${M.describeDeal(d.fee, d.deal)}.` };
    }
    d.rounds = (d.rounds || 0) + 1;
    if (d.rounds > 3) {
      d.status = 'withdrawn';
      return { msg: `${buyer.name} have gone as far as they will and walk away.` };
    }
    const target = Math.min(max, now + (cost - now) * U.rand(0.4, 0.7));
    d.fee = M.feeFor(p, target, deal);
    d.deal = deal;
    n.title = `${buyer.name} improve their offer for ${W.name(p)}`;
    n.read = false;
    return {
      counter: d.fee,
      msg: `${buyer.name} come back with ${M.describeDeal(d.fee, deal)}${d.rounds >= 3 ? ' — their final offer' : ''}.`,
    };
  };
  // Ask the bidding club for more (mult × their bid). Up to what they'd pay, they agree; beyond it they raise their
  // bid part of the way, twice at most, or walk away
  T.counterBid = function (n, mult) {
    const S = FM.S,
      d = n.data,
      p = S.players[d.pid],
      buyer = S.clubs[d.from];
    if (d.status !== 'open') return 'Already resolved.';
    if (!p || !W.ownPlayer(p)) {
      d.status = 'void';
      return 'The player is no longer at the club.';
    }
    if (!FM.Season.windowOpen()) {
      d.status = 'expired';
      return 'The window has closed — the bid lapsed.';
    }
    if (d.loan) return 'Loan offers are accepted or turned down.';
    const ask = U.roundMoney(d.fee * mult);
    if (ask <= (d.max || d.fee)) {
      d.fee = ask;
      return `${buyer.name} agree to ${U.money(ask)}. ` + T.completeBid(n, p);
    }
    d.rounds = (d.rounds || 0) + 1;
    if (d.rounds > 2 || Math.random() < 0.25) {
      d.status = 'withdrawn';
      return `${buyer.name} won't go that high and pull out.`;
    }
    d.fee = U.roundMoney(d.fee + ((d.max || d.fee) - d.fee) * U.rand(0.4, 0.7));
    n.title = `${buyer.name} raise their bid to ${U.money(d.fee)} for ${W.name(p)}`;
    n.read = false;
    return `${buyer.name} won't pay ${U.money(ask)}, but they've raised their bid to ${U.money(d.fee)}.`;
  };
})();
