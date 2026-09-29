// Detective-style scouting + transfers (user offers, AI market, bids for your players).
(function () {
  const FM = window.FM, U = FM.U, D = FM.D, W = FM.W;

  const Sc = (FM.Scouting = {});
  Sc.region = function (p) {
    const c = p.clubId && FM.S.clubs[p.clubId];
    if (c) return c.nat === 'ENG' ? 'ENG' : D.NATIONS[c.nat].region;
    return D.NATIONS[p.nat].region;
  };
  Sc.know = (pid) => FM.S.user.knowledge[pid] || 0;
  // Average ability of the user's current XI (cached per matchday — used on every report render)
  Sc.level = function () {
    const S = FM.S, key = `${S.day}-${S.user.clubId}-${S.year}`;
    if (Sc._lvlKey !== key || Sc._lvlS !== S) {
      // Out of work there is no XI to compare with: judge against the level your reputation would get you
      Sc._lvlS = S; Sc._lvlKey = key; Sc._lvl = W.employed() ? U.avg(W.pickXI(S.user.clubId, S.user.tactic).xi.filter(Boolean), (q) => q.ca) : W.levelFor(S.user.rep + 8); }
    return Sc._lvl;
  };
  Sc.bestScoutFor = function (region) {
    return FM.S.user.scouts.map((id) => FM.S.staff[id]).sort((a, b) => b.regions[region] - a.regions[region])[0];
  };

  Sc.dismiss = function (pid) {
    const u = FM.S.user;
    (u.dismissed = u.dismissed || {})[pid] = { year: FM.S.year, rep: u.reports[pid] || null };
    delete u.reports[pid];
  };
  // Undo a dismissal: the report comes back as it was, and scouts may pick him up again
  Sc.restore = function (pid) {
    const u = FM.S.user, d = u.dismissed && u.dismissed[pid];
    if (!d) return;
    if (d.rep) u.reports[pid] = { ...d.rep, isNew: false };
    delete u.dismissed[pid];
  };
  Sc.assign = function (scoutId, spec) {
    const u = FM.S.user;
    if (spec.type === 'player' && u.dismissed) delete u.dismissed[spec.pid];
    u.assignments = u.assignments.filter((a) => a.scout !== scoutId);
    if (spec.type === 'player') {
      const s = FM.S.staff[scoutId], p = FM.S.players[spec.pid];
      spec.weeks = Math.max(1, Math.round(3 - 2 * s.regions[Sc.region(p)]));
    }
    u.assignments.push({ scout: scoutId, since: FM.S.day, ...spec });
  };

  function learn(scout, p, mult = 1) {
    const u = FM.S.user, reg = Sc.region(p), exp = scout.regions[reg];
    const gain = (6 + 24 * exp + scout.judge * 0.6) * mult;
    const before = u.knowledge[p.id] || 0;
    u.knowledge[p.id] = Math.min(100, before + gain * (1 - before / 140));
    const rep = u.reports[p.id];
    if (!rep || rep.scout !== scout.id) u.reports[p.id] = { scout: scout.id, err: U.gauss(0, 1), errP: U.gauss(0, 1), day: FM.S.day, year: FM.S.year, isNew: true };
    else { rep.day = FM.S.day; rep.year = FM.S.year; rep.isNew = true; }
  }

  // A scout's own (imperfect) read of potential, stable per scout+player
  Sc.scoutPA = (scout, p) => p.pa + (((U.hash(scout.id + p.id) % 1000) / 1000) - 0.5) * 2 * (21 - scout.judge) * 0.8;
  Sc.focusLabel = (a) => {
    const where = a.type === 'league' ? FM.S.comps[a.comp].name : D.REGIONS[a.region];
    const bits = [a.pos === 'any' ? 'all positions' : a.pos, `≤${a.maxAge}`];
    if (a.minStars) bits.push(`${a.minStars}★+ potential`);
    if (a.maxFee) bits.push(`under ${U.money(a.maxFee)}`);
    if (a.focus && a.focus !== 'any') bits.push({ moneyball: 'undervalued', wonderkid: 'wonderkids', ready: 'ready-made' }[a.focus]);
    return `${where} · ${bits.join(' · ')}`;
  };

  Sc.tick = function () {
    const S = FM.S, u = S.user;
    const done = [];
    for (const a of u.assignments) {
      const scout = S.staff[a.scout];
      if (!scout) { done.push(a); continue; }
      if (a.type === 'region' || a.type === 'league') {
        const lvl = U.avg(W.pickXI(u.clubId, u.tactic).xi.filter(Boolean), (q) => q.ca);
        const dis = u.dismissed || {};
        const cands = Object.values(S.players).filter((p) => !p.retired && p.clubId !== u.clubId && !dis[p.id] &&
          (a.type === 'league' ? p.clubId && S.clubs[p.clubId].comp === a.comp : Sc.region(p) === a.region) &&
          (a.pos === 'any' || D.POS_GROUP[p.pos] === a.pos) && W.age(p) <= a.maxAge &&
          (!a.minStars || W.stars(Sc.scoutPA(scout, p)) >= a.minStars) &&
          (!a.maxFee || T.askPrice(p) <= a.maxFee * 1.1));
        if (!cands.length) continue;
        const weight = (c) => {
          let w = (1.05 - Sc.know(c.id) / 100) * Math.pow(0.5 + Sc.scoutPA(scout, c) / 100, 4);
          if (a.focus === 'moneyball') w *= c.season.apps ? Math.pow(c.season.rsum / c.season.apps / 6.5, 6) * (3e6 / (c.value + 1e6)) : 0.2;
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
          if (p) { found.push(p); learn(scout, p); }
        }
        if (found.length) {
          const graded = found.map((p) => ({ p, v: Sc.view(p) })).sort((x, y) => y.v.score - x.v.score);
          const top = graded[0];
          const star = top.v.grade === 'A' || (top.v.grade === 'B' && top.v.rec === 'Loan');
          FM.News.add({
            type: 'report', title: star ? `${scout.fn} ${scout.ln}: "You need to see ${W.name(top.p)}"` : `${scout.fn} ${scout.ln}: new reports — ${Sc.focusLabel(a)}`,
            body: graded.map(({ p, v }) => `${D.NATIONS[p.nat].flag} ${W.name(p)} (${W.age(p)}, ${p.pos}) — grade ${v.grade}: ${v.verdict}`).join('\n'),
            pid: top.p.id, quiet: !star,
          });
        }
      } else if (a.type === 'player') {
        const p = S.players[a.pid];
        if (!p) { done.push(a); continue; }
        learn(scout, p, 1.4);
        if (--a.weeks <= 0) {
          done.push(a);
          FM.News.add({ type: 'report', title: `Scout report: ${W.name(p)}`, body: `${scout.fn} ${scout.ln} has finished watching ${W.name(p)} of ${p.clubId ? S.clubs[p.clubId].name : 'no club'}. Verdict: ${Sc.view(p).verdict}.`, pid: p.id });
        }
      }
    }
    u.assignments = u.assignments.filter((a) => !done.includes(a));
  };

  // What the user can see about a player, given knowledge
  Sc.view = function (p) {
    const S = FM.S, u = S.user, own = p.clubId === u.clubId;
    const k = own ? 100 : Sc.know(p.id);
    const rep = u.reports[p.id];
    const scout = rep && S.staff[rep.scout];
    const exp = scout ? scout.regions[Sc.region(p)] : 0.4;
    const unc = 1 - k / 100;
    const errC = rep ? rep.err : 0, errP = rep ? rep.errP : 0;
    const caEst = U.clamp(p.ca + errC * unc * 14 * (1.3 - exp), 20, 99);
    const paEst = U.clamp(Math.max(caEst, p.pa + errP * unc * 22 * (1.3 - exp)), 20, 99);
    const wC = unc * 16 + (k < 100 ? 2 : 0), wP = unc * 24 + (k < 100 ? 4 : 0);
    const v = {
      k, own, scout,
      ca: k >= 10 ? [caEst - wC / 2, caEst + wC / 2] : null,
      pa: k >= 25 ? [paEst - wP / 2, paEst + wP / 2] : null,
      showAttrs: k >= 70, attrsApprox: k >= 40 && k < 70,
      strengths: [], weaknesses: [],
      personality: k >= 50 ? p.personality : null,
      traits: k >= 60 ? p.traits : k >= 40 ? p.traits.filter((t) => t !== 'Injury Prone').slice(0, 1) : [],
      injury: k >= 55 ? (p.hid.inj >= 15 ? 'Significant injury history — recurring muscle problems' : p.hid.inj >= 10 ? 'Occasional knocks, nothing serious' : 'Clean bill of health') : null,
      hidden: k >= 75 ? [p.hid.cons >= 14 ? 'Performs consistently week to week' : p.hid.cons <= 7 ? 'Wildly inconsistent' : 'Reasonably consistent', p.hid.big >= 14 ? 'Thrives on the big occasion' : p.hid.big <= 7 ? 'Goes missing in big games' : 'Handles pressure okay', p.hid.prof >= 15 ? 'Consummate professional in training' : p.hid.prof <= 7 ? 'Questionable work ethic off the pitch' : 'Decent attitude in training'] : null,
      confidence: k >= 85 ? 'High' : k >= 55 ? 'Medium' : 'Low',
    };
    if (k >= 25) {
      const w = D.POS_W[p.pos];
      const rel = D.ATTRS.filter((a) => w[a] || ['pace', 'stamina', 'composure', 'workRate'].includes(a)).filter((a) => p.pos === 'GK' || !['reflexes', 'handling'].includes(a));
      const sorted = rel.slice().sort((a, b) => p.attrs[b] - p.attrs[a]);
      v.strengths = sorted.filter((a) => p.attrs[a] >= 14).slice(0, 3).map((a) => D.PHRASES[a][p.attrs[a] >= 17 ? 0 : 1]);
      v.weaknesses = sorted.reverse().filter((a) => p.attrs[a] <= 8).slice(0, 2).map((a) => D.PHRASES[a][2]);
    }
    // Tactical fit against the user's current system
    const T = u.tactic, slots = D.FORMATIONS[T.formation];
    let bi = 0, bv = 0;
    slots.forEach((s, i) => { const e = W.effAt(p, s.t); if (e > bv) { bv = e; bi = i; } });
    v.fit = { slot: slots[bi].t, role: T.roles[bi], score: W.fitAt(p, slots[bi].t) };
    // Verdict relative to user squad level
    const lvl = Sc.level();
    if (!v.ca) v.verdict = 'Unknown — needs scouting';
    else {
      const c = (v.ca[0] + v.ca[1]) / 2, pa = v.pa ? (v.pa[0] + v.pa[1]) / 2 : c;
      if (c >= lvl + 4) v.verdict = 'Would walk into your first XI';
      else if (c >= lvl - 2) v.verdict = 'Good enough to compete for a starting place';
      else if (W.age(p) <= 21 && pa >= lvl + 6) v.verdict = 'One for the future — could become a star';
      else if (c >= lvl - 8) v.verdict = 'Useful squad depth';
      else v.verdict = 'Not at the required level';
    }
    // Moneyball: analytics department highlights undervalued output
    const club = W.userClub();
    if (club && club.facilities.analytics >= 3 && p.season.apps >= 4 && k >= 30) {
      const avg = p.season.rsum / p.season.apps;
      if (avg >= 7.0 && p.value < 4e6) v.moneyball = `Analytics flag: averaging ${avg.toFixed(2)} — output of a player worth far more than ${U.money(p.value)}.`;
    }
    v.fee = k >= 20 ? U.roundMoney(FM.Transfers.askPrice(p) * (1 + (rep ? rep.err * 0.1 * unc : 0))) : null;
    // Scout's grade + recommendation (what the scout believes, not the truth)
    if (v.ca) {
      const c = (v.ca[0] + v.ca[1]) / 2, pa = v.pa ? (v.pa[0] + v.pa[1]) / 2 : c, age = W.age(p);
      let score = c - lvl + (age <= 21 ? Math.max(0, pa - c) * 0.35 : 0) - (age >= 31 ? (age - 30) * 1.5 : 0);
      if (v.moneyball) score += 3;
      v.score = score;
      v.grade = score >= 4 ? 'A' : score >= -2 ? 'B' : score >= -8 ? 'C' : 'D';
      v.rec = own ? null : p.loan ? 'Monitor' : age <= 21 && pa >= lvl + 4 && c < lvl - 3 ? 'Loan' : v.grade === 'A' || v.grade === 'B' ? 'Sign' : v.grade === 'C' ? 'Monitor' : 'Avoid';
      const name = p.fn;
      const Q = {
        A: [`${name} is the real deal. I'd move now before someone else does.`, `Best player I've watched this season. Don't hesitate.`, `He'd start for us tomorrow — and he's only getting better.`],
        B: [`A very good player. He'd push for a place straight away.`, `Solid, reliable, the kind of signing that wins you points.`, `I like him a lot. Worth a serious look.`],
        C: [`Decent — a squad option, not a game-changer.`, `He'd do a job, but I wouldn't break the bank.`, `Keep him on the list. Not a priority.`],
        D: [`Not for us, I'm afraid.`, `Honest pro, but not at our level.`, `I'd pass on this one.`],
      };
      v.quote = v.rec === 'Loan' ? `Not ready for our first team, but the talent is obvious. A loan with an eye on the future makes sense.` : Q[v.grade][U.hash(p.id) % 3];
      if (v.rec === 'Sign' && p.clubId && club && v.fee > club.budget * 1.5) { v.rec = 'Monitor'; v.pricey = true; v.quote += ` Trouble is, he's well out of our price range.`; }
      if (v.traits.includes('Big Game Player') && v.grade !== 'D') v.quote += ' Loves the big occasions, too.';
      if (v.injury && p.hid.inj >= 15) v.quote += ' My one worry is his fitness record.';
    } else { v.score = -99; v.grade = '?'; v.rec = 'Scout'; }
    return v;
  };

  // Best targets across all reports, for the scouting home screen and the assistant
  Sc.recommendations = function (limit = 6) {
    const S = FM.S, c = W.userClub();
    return Object.keys(S.user.reports).map((id) => S.players[id]).filter((p) => p && !W.isUser(p.clubId) && !p.retired)
      .map((p) => ({ p, v: Sc.view(p) })).filter(({ v, p }) => ['A', 'B'].includes(v.grade) && (!p.clubId || (v.fee || 0) <= c.budget * 1.25 || v.rec === 'Loan'))
      .sort((a, b) => b.v.score - a.v.score).slice(0, limit);
  };

  // ---------------- Transfers ----------------
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
    const round = FM.Season.leagueRound();
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

  // AI market for one window day: squad needs (at home or abroad), marquee raids, veterans heading abroad
  T.aiWindow = function () {
    const S = FM.S;
    const full = Object.values(S.clubs).filter((c) => (c.sim === 'full' || c.sim === 'light') && !W.isUser(c.id));
    U.shuffle(full).slice(0, 6).forEach((c) => {
      const sq = W.squad(c.id);
      if (sq.length >= 26) return;
      const groups = ['DEF', 'MID', 'ATT', 'GK'];
      const weakest = groups.map((g) => ({ g, best: Math.max(0, ...sq.filter((p) => D.POS_GROUP[p.pos] === g).map((p) => p.ca)) })).sort((a, b) => a.best - b.best)[0];
      const foreignFull = T.foreignCount(c) >= S.rules.foreignLimit + 3;
      const pool = Object.values(S.players).filter((p) => !p.retired && !p.loan && D.POS_GROUP[p.pos] === weakest.g && p.clubId !== c.id && !W.isUser(p.clubId) && W.age(p) <= 31 && p.ca >= weakest.best - 2 &&
        (!p.clubId || S.clubs[p.clubId].rep < c.rep - 2) && T.askPrice(p) <= c.budget && !(foreignFull && p.nat !== c.nat));
      if (!pool.length) return;
      // Scouting networks abroad make foreign targets slightly more attractive for bigger clubs
      const p = U.wpick(pool, (x) => Math.pow(x.ca, 3) * (nationOf(x.clubId) && nationOf(x.clubId) !== c.nat && c.rep >= 70 ? 1.3 : 1));
      if (Math.random() < 0.35) { FM.Stories.rumour(p, c); return; }
      T.execute(p, c.id, T.askPrice(p), T.wageDemand(p, c));
    });

    // Good free agents don't stay unemployed: the best club that needs him and can pay signs him
    Object.values(S.players).filter((p) => !p.clubId && !p.retired && W.age(p) <= 33).sort((a, b) => b.ca - a.ca).slice(0, 2).forEach((p) => {
      const suitors = full.filter((c) => W.levelFor(c.rep) >= p.ca - 8 && W.levelFor(c.rep) <= p.ca + 4 && W.squad(c.id).length < 26).sort((a, b) => b.rep - a.rep);
      const c = suitors[0];
      if (c && Math.random() < 0.6) T.execute(p, c.id, 0, T.wageDemand(p, c));
    });

    // Marquee raid: a giant prises the best young talent out of another country
    if (Math.random() < 0.35) {
      const giants = full.filter((c) => c.rep >= 80 && c.budget > 1e7);
      const g = giants.length && U.pick(giants);
      if (g) {
        const cands = Object.values(S.players).filter((p) => p.clubId && !p.loan && !W.isUser(p.clubId) && nationOf(p.clubId) !== g.nat && S.clubs[p.clubId].rep < g.rep && W.age(p) <= 24 && T.askPrice(p) * 1.15 <= g.budget);
        const star = cands.sort((a, b) => (b.ca + (b.pa - b.ca) * 0.5) - (a.ca + (a.pa - a.ca) * 0.5))[0];
        if (star && star.ca >= W.levelFor(g.rep) - 6) T.execute(star, g.id, U.roundMoney(T.askPrice(star) * 1.15), T.wageDemand(star, g), { marquee: true });
      }
    }

    // Veterans head abroad for one last adventure (or a big pay day)
    if (Math.random() < 0.5) {
      const vets = Object.values(S.players).filter((p) => p.clubId && !p.loan && !W.isUser(p.clubId) && S.clubs[p.clubId].sim === 'full' && W.age(p) >= 30 && p.season.apps < Math.max(3, FM.Season.leagueRound() * 0.4));
      const v = vets.length && U.pick(vets);
      if (v) {
        const dests = Object.values(S.clubs).filter((c) => c.id !== v.clubId && c.nat !== nationOf(v.clubId) && (c.sim === 'minimal' || c.rep < S.clubs[v.clubId].rep - 5) && !W.isUser(c.id));
        const d = dests.length && U.pick(dests);
        if (d) T.execute(v, d.id, U.roundMoney(v.value * 0.6), Math.round(v.wage * (d.sim === 'minimal' ? 1.4 : 1)), { veteran: true });
      }
    }

    // Development loans: big clubs send young talent to smaller clubs for minutes
    if (Math.random() < 0.5) {
      const kids = Object.values(S.players).filter((p) => p.clubId && !p.loan && !W.isUser(p.clubId) && S.clubs[p.clubId].sim === 'full' && S.clubs[p.clubId].rep >= 70 && W.age(p) <= 21 && p.season.apps <= 2 && p.pa - p.ca >= 10);
      const k = kids.length && U.pick(kids);
      if (k) {
        const dests = full.filter((c) => c.id !== k.clubId && c.rep < S.clubs[k.clubId].rep - 8 && W.levelFor(c.rep) <= k.ca + 6);
        const d = dests.length && U.pick(dests);
        if (d) T.loan(k, d.id, U.pick([0.5, 0.75, 1]), 0);
      }
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
