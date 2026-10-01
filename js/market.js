// Transfer market depth: the deadline (warning, deadline day, the window's summary), trials for free agents,
// loanees who aren't playing, fee talks that go back and forth, a relative market (who needs to sell, who needs to
// buy), players choosing between clubs, and structured fees (instalments, add-ons, sell-on clauses) with the
// payments they leave behind. Decisions for you arrive in the feed as 'desk' items.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const M = (FM.Market = {});
  const S = () => FM.S;
  const now = () => FM.Season.dayIndex();

  M.DEADLINE_WARN = 3; // days before the deadline that the warning arrives
  M.TRIAL_DAYS = 4; // about a fortnight
  M.MAX_TRIALS = 3;
  M.LOAN_GAMES = 6; // games at the borrowing club before we judge a loanee's minutes
  M.LOAN_SHARE = 0.4; // fewer appearances than this share of those games: not playing enough
  M.RIVAL_CHANCE = 0.3; // chance that other clubs are also chasing a player you go for
  M.DESK_DAYS = 3; // an unanswered desk decision is settled with its default after this many days

  const state = () => (S().market = S().market || { open: false, from: 0 });
  const payments = () => (S().payments = S().payments || []);

  // ---------- The window and its deadline ----------
  // Is the window open on a given day of this season? (Sea.windowOpen asks about today)
  const openOn = function (day) {
    const s = S(),
      d0 = s.day;
    if (day >= s.calendar.length) return false;
    s.day = day;
    try {
      return FM.Season.windowOpen();
    } finally {
      s.day = d0;
    }
  };
  let leftCache = { k: null, v: 0 };
  // Days of the window left, today included (0 = shut)
  M.daysLeft = function () {
    const s = S(),
      k = `${s.year}-${s.day}`;
    if (leftCache.k === k && leftCache.S === s) return leftCache.v;
    let n = 0;
    if (FM.Season.windowOpen()) while (openOn(s.day + n)) n++;
    leftCache = { k, v: n, S: s };
    return n;
  };
  M.isDeadline = () => M.daysLeft() === 1;

  // Once a day, as each new day begins (after the previous one is played)
  M.newDay = function () {
    const s = S(),
      mk = state(),
      open = FM.Season.windowOpen(),
      employed = W.employed() && !s.user.sacked;
    if (open && !mk.open) mk.from = Math.max(0, s.day - 1); // it opened on the day just played
    if (!open && mk.open && employed) M.windowClosed();
    mk.open = open;
    if (employed) {
      const left = M.daysLeft();
      if (left === M.DEADLINE_WARN) M.warnDeadline(left);
      if (left === 1) M.deadlineDay();
      M.trialsDaily();
      M.loanWatch();
    }
    M.payDue();
    M.expire();
  };

  // What you still have in hand a few days before the deadline
  M.warnDeadline = function (left) {
    const s = S(),
      c = W.userClub();
    const sq = W.squad(c.id).filter((p) => !p.loan || p.loan.from !== c.id);
    const want = D.SQUAD_TIER.full;
    const thin = Object.keys(want)
      .filter((pos) => sq.filter((p) => p.pos === pos).length < want[pos] - (pos === 'GK' ? 1 : 0))
      .map((pos) => D.POS_NAME[pos].toLowerCase());
    const bids = s.news.filter((n) => n.type === 'bid' && n.data.status === 'open').length;
    const listed = sq.filter((p) => p.listed && W.isUser(p.clubId)).length;
    const bits = [`Budget ${U.money(c.budget)}.`];
    if (thin.length) bits.push(`Thin at ${thin.join(', ')}.`);
    if (bids) bits.push(`${U.plural(bids, 'bid')} waiting for an answer.`);
    if (listed) bits.push(`${U.plural(listed, 'listed player')} still here.`);
    if (s.user.shortlist.length) bits.push(`${U.plural(s.user.shortlist.length, 'player')} on your shortlist.`);
    FM.News.add({
      type: 'club',
      title: `Transfer deadline in ${left} days`,
      body: `${left} days left in the window, today included. ${bits.join(' ')}`,
      clubId: c.id,
    });
  };
  M.deadlineDay = function () {
    const c = W.userClub();
    FM.News.add({
      type: 'club',
      title: '⏰ Deadline day',
      body: 'The window shuts tonight. Clubs are scrambling: expect late bids, panic buys and asking prices that move. Anything you want done has to be done today.',
      clubId: c.id,
    });
  };
  // The window has shut: your business, and the biggest deals in your league and the world
  M.windowClosed = function () {
    const s = S(),
      c = W.userClub(),
      from = state().from;
    const deals = s.seasonLog.transfers.filter((t) => t.day >= from && !t.loan);
    const ins = deals.filter((t) => t.to === c.id),
      outs = deals.filter((t) => t.from === c.id);
    const league = deals
      .filter(
        (t) =>
          (s.clubs[t.to] && s.clubs[t.to].comp === c.comp) ||
          (t.from && s.clubs[t.from] && s.clubs[t.from].comp === c.comp),
      )
      .sort((a, b) => b.fee - a.fee)[0];
    const top = deals.slice().sort((a, b) => b.fee - a.fee)[0];
    const line = (t) => `${t.name} to ${s.clubs[t.to].name} (${t.fee ? U.money(t.fee) : 'free'})`;
    const spent = U.sum(ins, (t) => t.fee),
      got = U.sum(outs, (t) => t.fee);
    FM.News.add({
      type: 'club',
      title: 'The transfer window has closed',
      body: `Your business: ${ins.length} in${spent ? ` (${U.money(spent)})` : ''}, ${outs.length} out${got ? ` (${U.money(got)})` : ''}. ${deals.length} deals around the world.${league ? ` Biggest in your league: ${line(league)}.` : ''}${top && top !== league ? ` Biggest anywhere: ${line(top)}.` : ''} Free agents can still be signed.`,
      clubId: c.id,
    });
  };

  // ---------- Desk decisions (in the feed) ----------
  M.desk = (n) => FM.News.add({ type: 'desk', clubId: W.userClub().id, ...n });
  // Answer a desk decision. Returns { msg, offer: pid } (offer: open contract talks with him)
  M.resolve = function (n, i) {
    if (n.resolved) return { msg: 'Already decided.' };
    const ch = n.choices[i],
      p = S().players[n.pid];
    n.resolved = ch.label;
    const r = (n.kind === 'trial' ? trialChoice : n.kind === 'loan' ? loanChoice : () => ({ msg: '' }))(n, ch.k, p);
    n.reply = r.msg;
    return r;
  };
  M.expire = function () {
    const s = S();
    for (const n of s.news) {
      if (n.type !== 'desk' || n.resolved) continue;
      if (s.year > n.year || s.day - n.day >= M.DESK_DAYS) {
        M.resolve(n, n.def || 0);
        n.resolved = `No answer, so: ${n.resolved}`;
      }
    }
  };

  // ---------- Trials ----------
  M.trials = () => (S().user.trials = S().user.trials || []);
  M.onTrial = (p) => M.trials().some((t) => t.pid === p.id);
  M.canTrial = function (p) {
    const c = W.userClub();
    if (!c) return { ok: false, msg: 'You need a club to run trials.' };
    if (p.clubId) return { ok: false, msg: 'Only free agents come on trial.' };
    if (M.onTrial(p)) return { ok: false, msg: `${W.name(p)} is already on trial with you.` };
    if (M.trials().length >= M.MAX_TRIALS)
      return { ok: false, msg: `You already have ${M.MAX_TRIALS} trialists. Decide on one of them first.` };
    // Established players don't audition
    if (p.ca >= W.levelFor(c.rep) + 4 || (p.intl && p.intl.caps >= 20))
      return {
        ok: false,
        msg: `${W.name(p)} doesn't need to prove himself — his agent says to make an offer or move on.`,
      };
    return { ok: true };
  };
  M.startTrial = function (pid) {
    const s = S(),
      p = s.players[pid],
      chk = M.canTrial(p);
    if (!chk.ok) return chk;
    M.trials().push({ pid, until: now() + M.TRIAL_DAYS, ext: 0 });
    s.user.knowledge[pid] = Math.max(s.user.knowledge[pid] || 0, 40);
    return {
      ok: true,
      msg: `${W.name(p)} joins training on trial for about two weeks. Other clubs can still sign him in the meantime.`,
    };
  };
  M.trialsDaily = function () {
    const s = S(),
      c = W.userClub();
    s.user.trials = M.trials().filter((t) => {
      const p = s.players[t.pid];
      if (!p || p.retired) return false;
      if (p.clubId) {
        if (!W.isUser(p.clubId))
          FM.News.add({
            type: 'club',
            title: `${W.name(p)} cuts his trial short`,
            body: `He has signed for ${s.clubs[p.clubId].name}. You waited too long.`,
            pid: p.id,
            clubId: c.id,
          });
        return false;
      }
      s.user.knowledge[p.id] = Math.min(100, (s.user.knowledge[p.id] || 0) + 25); // the coaches see him every day
      if (now() < t.until) return true;
      s.user.knowledge[p.id] = 100;
      const v = verdict(p, c),
        good = v.better <= 2;
      M.desk({
        kind: 'trial',
        title: `Trial over: ${W.name(p)}`,
        body: v.text + (t.ext ? '' : ' You can keep him another week if you are not sure.'),
        pid: p.id,
        rec: good ? 0 : t.ext ? 1 : 2,
        def: t.ext ? 1 : 2,
        choices: [
          { k: 'sign', label: 'Offer a contract' },
          ...(t.ext ? [] : [{ k: 'extend', label: 'Another week' }]),
          { k: 'release', label: 'Let him go' },
        ],
      });
      return false;
    });
  };
  // The coaches' report: level against the squad, character, fitness
  function verdict(p, c) {
    const sq = W.squad(c.id).filter((q) => q.pos === p.pos || D.POS_GROUP[q.pos] === D.POS_GROUP[p.pos]);
    const better = sq.filter((q) => q.ca > p.ca).length;
    const level =
      better === 0
        ? 'He looked better than anyone we have in his position.'
        : better <= 2
          ? 'He held his own with our first-choice players.'
          : better <= 4
            ? 'Squad player at best for us.'
            : "Not at our level — he'd be a long way down the pecking order.";
    const h = p.hid;
    const char =
      h.prof >= 15
        ? 'First in, last out, a proper professional.'
        : h.prof <= 7
          ? 'Coasted through some sessions; the staff have doubts about his attitude.'
          : h.temp <= 6
            ? 'Lost his head in a training-ground spat.'
            : 'No problems off the pitch.';
    const body =
      h.inj >= 14
        ? 'The physios flag his injury record.'
        : p.fitness < 70
          ? 'Short of match fitness after time without a club.'
          : 'Passed the medical without a worry.';
    return { better, text: `${level} ${char} ${body}` };
  }
  function trialChoice(n, k, p) {
    const gone = !p || p.clubId || p.retired;
    if (k === 'extend') {
      if (gone) return { msg: 'He has moved on.' };
      M.trials().push({ pid: p.id, until: now() + 3, ext: 1 });
      return { msg: 'He stays for another week.' };
    }
    if (k === 'sign') {
      if (gone) return { msg: `Too late: ${p ? W.name(p) : 'he'} has signed elsewhere.` };
      p.trial = { c: W.userClub().id, until: now() + 6 }; // keen to stay: asks a little less for a few days
      return { msg: 'His agent is ready to talk.', offer: p.id };
    }
    return { msg: gone ? 'He has moved on.' : `${W.name(p)} leaves with the staff's best wishes.` };
  }
  // A player whose trial went well settles for a little less while it's fresh (Co.evaluate)
  M.trialDiscount = (p, club) => (p.trial && p.trial.c === club.id && now() < p.trial.until ? 0.95 : 1);

  // ---------- Loanees who aren't playing ----------
  M.loanedOut = (clubId) => Object.values(S().players).filter((p) => p.loan && p.loan.from === clubId && !p.retired);
  M.loanMinutes = function (p) {
    const l = p.loan,
      sp = W.spell(p);
    if (l.wg == null) {
      l.wg = FM.Season.gamesPlayed(p.clubId);
      l.wa = sp.apps;
    }
    return { games: FM.Season.gamesPlayed(p.clubId) - l.wg, apps: sp.apps - l.wa };
  };
  M.loanWatch = function () {
    const c = W.userClub(),
      open = FM.Season.windowOpen();
    for (const p of M.loanedOut(c.id)) {
      if (p.loan.recall && open) {
        const was = S().clubs[p.clubId];
        M.recall(p);
        FM.News.add({
          type: 'club',
          title: `${W.name(p)} recalled from ${was.name}`,
          body: 'The window is open and he is back with us.',
          pid: p.id,
          clubId: c.id,
        });
        continue;
      }
      if (p.loan.recall || p.inj) continue;
      const { games, apps } = M.loanMinutes(p);
      if (games < M.LOAN_GAMES || apps >= games * M.LOAN_SHARE) continue;
      const host = S().clubs[p.clubId];
      p.loan.wg += games; // judge the next stretch on its own
      p.loan.wa += apps;
      M.desk({
        kind: 'loan',
        title: `${W.name(p)} isn't playing at ${host.name}`,
        body: `${apps} appearance${apps === 1 ? '' : 's'} in their last ${games} games${p.loan.promised ? `, even after ${host.name} promised him more minutes` : ''}. ${W.age(p) <= 21 ? 'He was sent there to develop.' : 'He needs games.'}`,
        pid: p.id,
        rec: p.loan.promised ? 0 : 1,
        def: 2,
        choices: [
          { k: 'recall', label: open ? 'Recall him' : 'Recall him when the window opens' },
          ...(p.loan.promised ? [] : [{ k: 'complain', label: `Tell ${host.name} to play him` }]),
          { k: 'leave', label: 'Leave him there' },
        ],
      });
    }
  };
  function loanChoice(n, k, p) {
    const c = W.userClub();
    if (!p || !p.loan || p.loan.from !== c.id) return { msg: 'He is no longer out on loan.' };
    const host = S().clubs[p.clubId];
    if (k === 'recall') {
      if (FM.Season.windowOpen()) {
        M.recall(p);
        return { msg: `${W.name(p)} is back with us.` };
      }
      p.loan.recall = true;
      return { msg: `He'll come back as soon as the window opens.` };
    }
    if (k === 'complain') {
      p.loan.promised = true;
      p.morale = Math.min(100, p.morale + 5);
      return { msg: `${host.name} promise to give him more minutes. He appreciates you fighting his corner.` };
    }
    if (p.hid.amb >= 13) p.morale = Math.max(0, p.morale - 6);
    return { msg: p.hid.amb >= 13 ? 'He is frustrated to be left there.' : 'He stays and keeps working.' };
  }
  // End a loan early: the player goes back to his club
  M.recall = function (p) {
    const s = S(),
      sp = W.spell(p);
    if (sp) sp.to = s.year;
    const parent = p.loan.from;
    delete p.loan;
    W.startSpell(p, parent);
  };

  // ---------- Relative market ----------
  // A player not getting games, unhappy or wanting a move: his club will take less
  M.wantsAway = function (p) {
    if (p.wantsOut || p.listed || p.morale < 35) return true;
    const a = W.age(p),
      games = FM.Season.gamesPlayed(p.clubId);
    return a >= 21 && a <= 30 && games >= 6 && p.season.apps < games * 0.3 && !FM.Transfers.isKey(p);
  };
  // The seller's position: a player who wants away, a club short of money or with more than it needs at his
  // position sells for less
  M.sellFactor = function (p) {
    const c = S().clubs[p.clubId];
    let f = 1;
    if (M.wantsAway(p)) f *= 0.85;
    if (c.balance < 0) f *= c.balance < -2e7 ? 0.8 : 0.9;
    if (!W.isUser(c.id)) {
      const same = W.squad(c.id).filter((q) => q.pos === p.pos && !q.loan).length;
      if (same > ((D.SQUAD_TIER[c.sim] || D.SQUAD_TIER.full)[p.pos] || 2) + 1) f *= 0.9;
    }
    return f;
  };
  // The buyer's position: a club short at the position, or buying on deadline day, pays over the odds
  M.urgency = function (c, pos) {
    const want = (D.SQUAD_TIER[c.sim] || D.SQUAD_TIER.full)[pos] || 2;
    const have = W.squad(c.id).filter((q) => q.pos === pos && !q.loan).length;
    let f = have < want - 1 ? 1.15 : have < want ? 1.07 : 1;
    if (FM.Season.windowOpen() && M.isDeadline()) f *= 1.1;
    return f;
  };

  // ---------- Fee talks (your bids) ----------
  // The selling club opens at its asking price and, if you're in the right area, comes down a little each round to
  // a floor it won't go below; three counters and that's its final word. Offers far below the floor annoy them:
  // twice, and they stop taking your calls for a few days.
  const talks = function (p) {
    const s = S(),
      u = s.user;
    u.neg = u.neg || {};
    const n = (u.neg[p.id] = u.neg[p.id] || { left: D.AGENTS[FM.Contracts.agentOf(p).style].patience, year: s.year });
    if (!n.fee || n.fee.year !== s.year || n.fee.from !== state().from || n.fee.club !== p.clubId) {
      const ask = FM.Transfers.userAsk(p);
      const firm = FM.Transfers.isKey(p) ? 1 : M.wantsAway(p) ? U.rand(0.8, 0.9) : U.rand(0.88, 0.97);
      n.fee = {
        year: s.year,
        from: state().from,
        club: p.clubId,
        ask,
        floor: U.roundMoney(ask * firm),
        rounds: 0,
        angry: 0,
        until: 0,
      };
    }
    return n.fee;
  };
  M.feeState = (p) => (p.clubId ? talks(p) : null);
  M.FEE_ROUNDS = 3;
  // value: what the offer is worth to the seller (M.dealValue). Returns { ok } or { counter, msg } or { msg }
  M.offerFee = function (p, value, fee, deal) {
    const s = S(),
      t = talks(p),
      club = s.clubs[p.clubId];
    if (now() < t.until)
      return { msg: `${club.name} aren't taking your calls after those last offers. Try again in a few days.` };
    if (value >= t.ask * 0.995) return { ok: true }; // within rounding of what they asked
    const back = (target) => M.feeFor(p, target, deal);
    if (value < t.floor * 0.8) {
      t.angry++;
      if (t.angry >= 2) {
        t.until = now() + 4;
        return { msg: `${club.name} feel insulted and break off talks for a few days.` };
      }
      return {
        counter: back(t.ask),
        msg: `${club.name} reject it out of hand — nowhere near. They still want ${U.money(back(t.ask))}.`,
      };
    }
    if (t.rounds >= M.FEE_ROUNDS)
      return { counter: back(t.ask), msg: `${club.name}: "${U.money(back(t.ask))}, and that is our final word."` };
    t.rounds++;
    t.ask = Math.max(t.floor, U.roundMoney(t.ask - (t.ask - value) * 0.4));
    const last = t.rounds >= M.FEE_ROUNDS || t.ask === t.floor;
    return {
      counter: back(t.ask),
      msg: `${club.name} won't accept ${U.money(fee)}, but they'll do it for ${U.money(back(t.ask))}${last ? ' — and they say they can go no lower' : ''}.`,
    };
  };

  // ---------- Structured fees ----------
  // deal: { inst: number of yearly payments (1–3), addOn: extra paid once he makes addApps appearances,
  // addApps, sellOn: share of his next fee }. What it is worth to the seller today:
  M.PAY = { 1: 1, 2: 0.95, 3: 0.92 }; // money later is worth less than money now
  M.sellOnValue = function (p, pct) {
    const a = W.age(p);
    return pct * p.value * (a <= 21 ? 1 : a <= 24 ? 0.6 : a <= 27 ? 0.3 : 0.1);
  };
  M.dealValue = (p, fee, deal) =>
    !deal ? fee : fee * (M.PAY[deal.inst || 1] || 1) + (deal.addOn || 0) * 0.5 + M.sellOnValue(p, deal.sellOn || 0);
  // The fee that, with this structure, is worth `target` to the seller
  // The fee that, with this structure, is worth `target` to the seller (rounded up, so it really is)
  M.feeFor = function (p, target, deal) {
    const extra = deal ? (deal.addOn || 0) * 0.5 + M.sellOnValue(p, deal.sellOn || 0) : 0,
      raw = Math.max(0, target - extra) / (deal ? M.PAY[deal.inst || 1] || 1 : 1),
      step = U.moneyStep(raw);
    return Math.ceil(raw / step) * step;
  };
  M.cashNow = (fee, deal) => (deal && deal.inst > 1 ? U.roundMoney(fee / deal.inst) : fee);
  M.describeDeal = function (fee, deal) {
    if (!deal) return U.money(fee);
    const bits = [];
    bits.push(
      deal.inst > 1
        ? `${U.money(M.cashNow(fee, deal))} now + ${deal.inst - 1} × ${U.money(M.cashNow(fee, deal))} yearly`
        : `${U.money(fee)} up front`,
    );
    if (deal.addOn) bits.push(`${U.money(deal.addOn)} after ${deal.addApps || 25} appearances`);
    if (deal.sellOn) bits.push(`${Math.round(deal.sellOn * 100)}% sell-on`);
    return bits.join(' · ');
  };
  // Called by T.execute for a sale between clubs: pays any sell-on clause the selling club owes from this fee, and
  // books the instalments and add-ons of this deal
  M.onSale = function (p, from, to, fee, deal) {
    const s = S();
    if (p.sellOn && p.sellOn.length) {
      for (const so of p.sellOn) {
        const ben = s.clubs[so.c];
        if (!ben || ben.id === to.id || !fee) continue;
        const amt = U.roundMoney(fee * so.pct);
        from.balance -= amt;
        ben.balance += amt;
        if (W.isUser(ben.id))
          FM.News.add({
            type: 'club',
            title: `Sell-on windfall: ${U.money(amt)}`,
            body: `${W.name(p)} has moved from ${from.name} to ${to.name} for ${U.money(fee)}, and our ${Math.round(so.pct * 100)}% sell-on clause pays out.`,
            pid: p.id,
            clubId: ben.id,
          });
        else if (W.isUser(from.id))
          FM.News.add({
            type: 'club',
            title: `${U.money(amt)} of the fee goes to ${ben.name}`,
            body: `Their ${Math.round(so.pct * 100)}% sell-on clause on ${W.name(p)}.`,
            pid: p.id,
            clubId: from.id,
          });
      }
      delete p.sellOn;
    }
    if (!deal) return;
    const per = M.cashNow(fee, deal);
    for (let k = 1; k < (deal.inst || 1); k++)
      payments().push({ pid: p.id, from: to.id, to: from.id, amt: per, due: now() + 1000 * k, why: 'inst' });
    if (deal.addOn)
      payments().push({
        pid: p.id,
        from: to.id,
        to: from.id,
        amt: deal.addOn,
        apps: deal.addApps || 25,
        a0: p.career.apps,
        exp: now() + 3000,
        why: 'addon',
      });
    if (deal.sellOn) p.sellOn = [{ c: from.id, pct: deal.sellOn }];
  };
  const transfer = function (pay) {
    const s = S(),
      a = s.clubs[pay.from],
      b = s.clubs[pay.to];
    if (!a || !b) return;
    a.balance -= pay.amt;
    b.balance += pay.amt;
    if (!W.isUser(b.id) && (b.sim === 'full' || b.sim === 'light')) b.budget += pay.amt * 0.5;
  };
  // Instalments that fall due, and add-ons whose condition has been met (or has lapsed)
  M.payDue = function () {
    const s = S(),
      t = now();
    if (!s.payments || !s.payments.length) return;
    s.payments = s.payments.filter((pay) => {
      if (pay.why === 'addon') {
        const p = s.players[pay.pid];
        if (!p || p.retired || p.clubId !== pay.from || t > pay.exp) return false;
        if (p.career.apps - pay.a0 < pay.apps) return true;
        transfer(pay);
        if (W.isUser(pay.from) || W.isUser(pay.to))
          FM.News.add({
            type: 'club',
            title: `Add-on triggered: ${U.money(pay.amt)}`,
            body: `${W.name(p)} has made ${pay.apps} appearances for ${s.clubs[pay.from].name}, so ${U.money(pay.amt)} goes to ${s.clubs[pay.to].name}.`,
            pid: p.id,
            clubId: W.isUser(pay.from) ? pay.from : pay.to,
          });
        return false;
      }
      if (pay.due > t) return true;
      transfer(pay);
      return false;
    });
  };
  // What a club owes and is owed: { owe: [...], owed: [...] }
  M.ledger = (clubId) => ({
    owe: payments().filter((x) => x.from === clubId),
    owed: payments().filter((x) => x.to === clubId),
  });

  // ---------- Players choosing between clubs ----------
  const leagueTop = (c) => {
    const l = c.comp && D.LEAGUES.find((x) => x.id === c.comp);
    return l ? l.repBand[0] : 45;
  };
  const STATUS_PT = { key: 2.2, regular: 1.6, rotation: 0.5, backup: -1, prospect: 0.6 };
  // How a move looks to the player: the league, the club, playing time, wages, home. Parts, so we can say why.
  M.appeal = function (p, c, wage, status) {
    const amb = 0.6 + p.hid.amb / 25,
      age = W.age(p);
    return {
      league: (leagueTop(c) - 60) * 0.08 * amb,
      club: (c.rep - 60) * 0.06 * amb,
      time: (STATUS_PT[status] ?? 0.5) * (age >= 23 ? 1.3 : 0.8),
      money:
        Math.log2(Math.max(0.3, wage / Math.max(500, p.wage || W.wageFor(p)))) * (W.hasTrait(p, 'Mercenary') ? 3 : 1.6),
      home: c.nat === p.nat ? (age >= 30 ? 1.2 : 0.5) : 0,
    };
  };
  const total = (a) => a.league + a.club + a.time + a.money + a.home;
  const WHY = {
    league: 'a bigger league',
    club: 'the bigger club',
    time: 'the promise of regular football',
    money: 'the better contract',
    home: 'the chance to go home',
  };
  // Other clubs chasing the same player this window (decided once, so you can see them in your talks)
  M.rivals = function (p) {
    const s = S(),
      u = s.user;
    u.neg = u.neg || {};
    const n = (u.neg[p.id] = u.neg[p.id] || { left: D.AGENTS[FM.Contracts.agentOf(p).style].patience, year: s.year });
    if (n.rivals && n.rivals.year === s.year && n.rivals.from === state().from)
      return n.rivals.ids.map((id) => s.clubs[id]).filter(Boolean);
    const uc = W.userClub(),
      g = D.POS_GROUP[p.pos];
    let ids = [];
    if (Math.random() < M.RIVAL_CHANCE * (1 + Math.min(1, W.interest(p) * 0.3))) {
      const ask = p.clubId ? FM.Transfers.askPrice(p) : 0;
      ids = U.shuffle(
        Object.values(s.clubs).filter((c) => {
          if ((c.sim !== 'full' && c.sim !== 'light') || W.isUser(c.id) || c.id === p.clubId) return false;
          const lvl = W.levelFor(c.rep);
          if (p.ca < lvl - 6 || p.ca > lvl + 10 || c.budget < ask) return false;
          if (W.squad(c.id).length >= W.squadTarget(c) + 4) return false;
          const best = W.squad(c.id)
            .filter((q) => D.POS_GROUP[q.pos] === g)
            .sort((a, b) => b.ca - a.ca)[g === 'GK' ? 0 : 2];
          return (!best || best.ca < p.ca + 1) && FM.Reg.canSign(c, p).ok;
        }),
      )
        .filter((c) => c.id !== uc.id)
        .slice(0, 2)
        .map((c) => c.id);
    }
    n.rivals = { year: s.year, from: state().from, ids };
    return ids.map((id) => s.clubs[id]);
  };
  // The player weighs your offer against the rivals'. Returns { club, fee, wage, why, beat: [names] }
  M.choose = function (p, fee, wage, status) {
    const uc = W.userClub(),
      rivals = M.rivals(p);
    if (!rivals.length) return { club: uc };
    const opts = [{ c: uc, fee, wage, a: M.appeal(p, uc, wage, status) }].concat(
      rivals.map((c) => {
        const w = Math.round((FM.Transfers.wageDemand(p, c) * U.rand(1, 1.15)) / 50) * 50,
          f = p.clubId
            ? Math.min(c.budget, U.roundMoney(Math.max(fee, FM.Transfers.askPrice(p)) * U.rand(1, 1.08)))
            : 0;
        return { c, fee: f, wage: w, a: M.appeal(p, c, w, FM.Contracts.expectedStatus(p, c)) };
      }),
    );
    opts.forEach((o) => (o.score = total(o.a) + U.gauss(0, 0.8)));
    opts.sort((a, b) => b.score - a.score);
    const win = opts[0],
      mine = opts.find((o) => o.c === uc);
    // the biggest reason the winner looked better than the runner-up
    const vs = win === mine ? opts[1] : mine;
    const key = Object.keys(WHY).sort((a, b) => win.a[b] - vs.a[b] - (win.a[a] - vs.a[a]))[0];
    return {
      club: win.c,
      fee: win.fee,
      wage: win.wage,
      why: WHY[key],
      beat: opts.filter((o) => o !== win).map((o) => o.c.name),
    };
  };
  // A player you've agreed to sell can still say no: a move that looks worse than staying (a smaller club, less
  // football, no more money) is turned down unless he wants out
  M.refusesMove = function (p, buyer) {
    if (p.wantsOut || p.listed) return false;
    const home = S().clubs[p.clubId];
    const stay = total(M.appeal(p, home, p.wage, FM.Contracts.expectedStatus(p, home)));
    const go = total(M.appeal(p, buyer, FM.Transfers.wageDemand(p, buyer), FM.Contracts.expectedStatus(p, buyer)));
    return go < stay - 1.2 && Math.random() < 0.7;
  };
})();
