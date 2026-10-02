// Contract depth: agents with personalities, contract clauses (signing-on fee, appearance and goal
// bonuses, release clauses, yearly rises, relegation wage cut), squad-status promises, and a
// negotiation model where the player weighs the whole package rather than the wage alone.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const Co = (FM.Contracts = {});
  const S = () => FM.S;
  const STATUS_ORDER = ['key', 'regular', 'rotation', 'backup', 'prospect'];

  // ---------- Agents ----------
  Co.agentOf = function (p) {
    if (p.agent && D.AGENTS[p.agent.style]) return p.agent;
    const age = W.age(p);
    const styles = Object.keys(D.AGENTS);
    const style = U.wpick(
      styles,
      (k) =>
        ({
          Shark: p.value > 8e6 ? 4 : 1.2,
          Pragmatic: 3,
          Family: age <= 21 ? 1.5 : 1,
          Showman: p.traits.includes('Media Friendly') ? 3 : 1,
          Rookie: age <= 20 ? 3 : 0.3,
        })[k],
    );
    const firm =
      style === 'Family' ? `${U.pick(['Brother', 'Father', 'Uncle', 'Cousin'])} (${p.ln})` : U.pick(D.AGENT_FIRMS);
    p.agent = { style, firm, name: `${U.pick(D.NATIONS[p.nat].fn)} ${U.pick(D.NATIONS[p.nat].ln)}` };
    return p.agent;
  };
  Co.agentInfo = (p) => ({ ...Co.agentOf(p), ...D.AGENTS[Co.agentOf(p).style] });

  // ---------- Deals ----------
  Co.deal = (p) => p.deal || (p.deal = {});
  // World seeding: Spanish and Portuguese contracts carry release clauses; elsewhere some young players have them
  Co.seedWorld = function () {
    Object.values(S().players).forEach((p) => {
      if (p.clubId) Co.aiDeal(p, S().clubs[p.clubId]);
    });
  };
  Co.aiDeal = function (p, club) {
    const d = Co.deal(p);
    const always = ['ESP', 'POR'].includes(club.nat);
    if (always || (W.age(p) <= 23 && Math.random() < 0.25) || Math.random() < 0.08)
      d.release = U.roundMoney(Math.max(5e5, p.value * (always ? U.rand(2.5, 6) : U.rand(1.8, 3.5))));
    else delete d.release;
    return d;
  };

  // What squad role a player expects at a club (rank by ability in the squad)
  Co.expectedStatus = function (p, club) {
    const sq = W.squad(club.id)
      .filter((q) => q.id !== p.id)
      .concat([p])
      .sort((a, b) => b.ca - a.ca);
    const rank = sq.indexOf(p);
    if (W.age(p) <= 20 && rank >= 11) return 'prospect';
    return rank < 4 ? 'key' : rank < 11 ? 'regular' : rank < 16 ? 'rotation' : 'backup';
  };
  const goalRate = (p) =>
    (({ ST: 0.45, W: 0.25, WM: 0.15, AM: 0.22, CM: 0.08, DM: 0.04, WB: 0.04, FB: 0.03, CB: 0.04, GK: 0 })[p.pos] ||
      0.05) *
    (0.6 + p.attrs.finishing / 25);

  // Weekly wage the player's side asks for before clauses
  Co.baseDemand = function (p, club, mode) {
    let w = FM.Transfers.wageDemand(p, club);
    if (mode === 'renew') {
      w = Math.max(p.wage * 1.04, W.wageFor(p) * (0.8 + club.rep / 250));
      if (W.hasTrait(p, 'Mercenary')) w *= 1.25;
      if (W.hasTrait(p, 'Loyal')) w *= 0.92;
      if (p.morale >= 75) w *= 0.96;
      else if (p.morale < 40) w *= 1.1;
      w *= FM.Transfers.dirFactor();
    }
    return Math.round(w / 50) * 50;
  };
  // The package the agent opens with: exactly what the player would accept, before any haggling
  Co.defaultTerms = function (p, club, mode) {
    const status = Co.expectedStatus(p, club);
    const t = {
      wage: 0,
      years: mode === 'renew' ? (W.age(p) >= 31 ? 1 : 3) : 3,
      bonus: 0,
      app: 0,
      goal: 0,
      release: 0,
      rise: 0,
      status,
      relegCut: false,
    };
    t.bonus = p.clubId ? 0 : FM.Transfers.signingBonus(p, Co.baseDemand(p, club, mode));
    const ev = Co.evaluate(p, club, t, mode);
    t.wage = Math.ceil((ev.need - ev.value) / 50) * 50;
    return t;
  };
  // Weekly wage he'd need with the other terms as they stand
  Co.wageNeeded = function (p, club, t, mode) {
    const ev = Co.evaluate(p, club, { ...t, wage: 0 }, mode);
    if (ev.hard) return null;
    // rise is proportional to wage: solve value(w) = need
    const k = 1 + ((t.rise || 0) * (t.years - 1)) / 2;
    return Math.max(0, Math.ceil((ev.need - ev.value) / k / 50) * 50);
  };

  // Value of a package to the player, in weekly-wage equivalents, versus what he needs
  Co.evaluate = function (p, club, t, mode) {
    const ag = Co.agentInfo(p);
    const age = W.age(p);
    const expSt = Co.expectedStatus(p, club);
    const offered = STATUS_ORDER.indexOf(t.status),
      wanted = STATUS_ORDER.indexOf(expSt);
    const apps = D.STATUS[t.status].apps * 0.9;
    let value =
      t.wage +
      ((t.bonus || 0) / (52 * t.years)) * ag.bonusW +
      ((t.app || 0) * apps) / 52 +
      ((t.goal || 0) * apps * goalRate(p)) / 52 +
      (t.wage * (t.rise || 0) * (t.years - 1)) / 2;
    let need = Co.baseDemand(p, club, mode) * ag.demand;
    const notes = [];
    // Squad status: flattery helps a little, a demotion hurts a lot
    if (offered < wanted) need *= 0.95;
    else if (offered > wanted) {
      if (!(expSt === 'prospect' && t.status === 'backup') && offered - wanted >= 2 && age >= 21)
        return {
          ok: false,
          hard: true,
          value,
          need,
          msg: `${W.name(p)} expects to be at least a ${D.STATUS[STATUS_ORDER[wanted + 1]].label.toLowerCase()} — he won't sign as a ${D.STATUS[t.status].label.toLowerCase()}.`,
        };
      need *= 1 + 0.08 * (offered - wanted) * (p.hid.amb >= 14 ? 1.5 : 1);
    }
    // Release clause: ambitious players want a way out
    const ambitious = p.hid.amb >= 13 || W.hasTrait(p, 'Mercenary');
    if (!W.hasTrait(p, 'Loyal')) {
      if (t.release > 0 && t.release <= p.value * 1.5) {
        need *= ambitious ? 0.9 : 0.95;
        notes.push('likes the low release clause');
      } else if (t.release > 0 && t.release <= p.value * 3) need *= ambitious ? 0.96 : 0.99;
      else if (ambitious) need *= 1.05;
    }
    // Contract length preferences
    if ((ag.longDeal || age >= 30) && t.years >= 3) need *= 0.96;
    if (age >= 32 && t.years === 1) need *= 1.06;
    if (age <= 23 && p.hid.amb >= 14 && t.years >= 5) need *= 1.04;
    if (t.relegCut) need *= 1.03;
    // Talks that keep coming close soften the agent a little (Co.logDemand); a happy trialist asks a little less
    const ng = (S().user.neg || {})[p.id];
    if (ng && ng.year === S().year && ng.ease) need *= ng.ease;
    need *= FM.Market.trialDiscount(p, club);
    if (p.wantsOut && mode === 'renew') need *= 1.25;
    // Veterans staying put take less, an icon or a loyal servant most of all
    if (mode === 'renew' && age >= 32 && !p.wantsOut) {
      need *= FM.Season.isIcon(p) || W.hasTrait(p, 'Loyal') ? 0.75 : 0.88;
      notes.push('happy to take less to stay');
    }
    const ok = value >= need - 1;
    const gap = Math.max(0, Math.round((need - value) / 50) * 50);
    return {
      ok,
      value,
      need,
      gap,
      expSt,
      notes,
      msg: ok
        ? `${ag.name} (${ag.firm}): "We have a deal."`
        : `${ag.name} (${ag.firm}): "We're ${U.money(gap)}/wk short — a higher wage, a bigger signing-on fee or better bonuses would do it."`,
    };
  };

  // Negotiation rounds: each rejected package costs patience; at zero the agent walks away for a while
  Co.patience = function (p) {
    const u = S().user;
    u.neg = u.neg || {};
    const n = u.neg[p.id];
    if (!n || n.year !== S().year || (n.until != null && S().day >= n.until))
      u.neg[p.id] = { left: D.AGENTS[Co.agentOf(p).style].patience, year: S().year, until: null };
    return u.neg[p.id];
  };
  // Remember each rejected package: how far off it was and what the agent asked for
  Co.logDemand = function (p, ev, t) {
    const n = Co.patience(p);
    (n.log = n.log || []).push({ gap: ev.gap, wage: t.wage, need: Math.round(t.wage + ev.gap) });
    n.log = n.log.slice(-8);
    if (ev.gap <= ev.need * 0.12) n.ease = Math.max(0.94, (n.ease || 1) - 0.02); // close: they meet you part way
  };
  Co.talksSoFar = (p) => {
    const n = (S().user.neg || {})[p.id];
    return n && n.year === S().year && n.log && n.log.length ? n.log : null;
  };
  Co.blocked = (p) => {
    const n = Co.patience(p);
    return n.until != null && S().day < n.until;
  };
  Co.spendPatience = function (p) {
    const n = Co.patience(p);
    n.left--;
    if (n.left <= 0) {
      n.until = S().day + 6;
      return true;
    }
    return false;
  };
  Co.agentFee = function (p, fee, wage, mode) {
    const ag = Co.agentInfo(p);
    const base = mode === 'transfer' && fee > 0 ? fee * ag.fee : wage * 52 * ag.fee * 0.6;
    return U.roundMoney(Math.max(wage * 2, base));
  };

  // Apply agreed terms to the player
  Co.applyTerms = function (p, club, t, mode, fee = 0) {
    const s = S();
    p.wage = t.wage;
    p.contract = s.year + t.years - 1;
    p.deal = {
      release: t.release || undefined,
      app: t.app || 0,
      goal: t.goal || 0,
      rise: t.rise || 0,
      status: t.status,
      relegCut: !!t.relegCut,
      signed: s.year,
      bonus: t.bonus || 0,
    };
    const agentFee = Co.agentFee(p, fee, t.wage, mode);
    club.balance -= (t.bonus || 0) + agentFee;
    if (W.isUser(club.id)) {
      FM.Season.spend('signing', t.bonus || 0);
      FM.Season.spend('agent', agentFee);
    }
    p.wantsOut = false;
    FM.Transfers.settle(p);
    delete (s.user.neg || {})[p.id];
    if (W.isUser(club.id) && ['key', 'regular'].includes(t.status))
      FM.People.promise(p, 'status', { status: t.status });
    return agentFee;
  };

  // User bids for a player with a full contract package. deal: how the fee is paid (FM.Market: instalments,
  // add-on, sell-on). The selling club haggles over the fee (FM.Market.offerFee), the agent over the package, and
  // other clubs chasing him may make him think again (FM.Market.choose).
  Co.transferOffer = function (pid, fee, t, deal) {
    const s = S(),
      p = s.players[pid],
      club = W.userClub(),
      T = FM.Transfers;
    if (Co.blocked(p))
      return {
        ok: false,
        msg: `${W.name(p)}'s agent has broken off talks. Try again in ${Co.patience(p).until - s.day} matchday(s).`,
      };
    if (p.loan && W.isUser(p.loan.from))
      return { ok: false, msg: `${W.name(p)} is already your player, on loan at ${s.clubs[p.clubId].name}.` };
    if (p.loan)
      return {
        ok: false,
        msg: `He's on loan at ${s.clubs[p.clubId].name}. Try again when he returns to ${s.clubs[p.loan.from].name}.`,
      };
    if (p.clubId && !FM.Season.windowOpen())
      return {
        ok: false,
        msg: 'The transfer window is closed. It reopens mid-season (matchday 12) and in pre-season. Free agents can be signed any time.',
      };
    if (p.clubId && T.isSettled(p) && !W.hasTrait(p, 'Mercenary'))
      return {
        ok: false,
        msg: `${W.name(p)} has only just committed to ${s.clubs[p.clubId].name} and isn't looking to move.`,
      };
    if (!p.clubId) deal = null;
    const cash = FM.Market.cashNow(fee, deal);
    if (cash + (fee - cash) * 0.5 > club.budget)
      return {
        ok: false,
        msg: `That exceeds your transfer budget of ${U.money(club.budget)}${deal && deal.inst > 1 ? ' (the board sets aside half of the later instalments)' : ''}.`,
      };
    if (FM.Reg.real() && !FM.Reg.canSign(club, p).ok)
      return { ok: false, msg: `You can't register him: ${FM.Reg.canSign(club, p).why}` };
    if (FM.Finance.frozen(t.wage))
      return {
        ok: false,
        msg: 'The board have frozen the wage bill: sell or let a high earner go before adding wages.',
      };
    const seller = p.clubId && s.clubs[p.clubId];
    const clause = seller && p.deal && p.deal.release;
    const triggered = clause && fee >= clause;
    const value = FM.Market.dealValue(p, fee, deal);
    if (seller && !triggered) {
      const r = FM.Market.offerFee(p, value, fee, deal);
      if (!r.ok)
        return {
          ok: false,
          counter: r.counter,
          msg: r.msg + (clause ? ` His release clause is ${U.money(clause)}.` : ''),
        };
    }
    if (seller && W.hasTrait(p, 'Loyal') && T.isKey(p) && value < T.userAsk(p) * 1.4 && !triggered)
      return { ok: false, msg: `${W.name(p)} is loyal to ${seller.name} and won't consider the move.` };
    if (seller && seller.rep > club.rep + 10 && p.hid.amb >= 12)
      return { ok: false, msg: `${W.name(p)} doesn't see ${club.name} as a step up.` };
    const ev = Co.evaluate(p, club, t, 'transfer');
    if (!ev.ok) {
      if (!ev.hard) Co.logDemand(p, ev, t);
      const walked = !ev.hard && Co.spendPatience(p);
      // the agent's own proposal: the same package at the wage that would do it
      const need = !ev.hard && !walked ? Co.wageNeeded(p, club, t, 'transfer') : null;
      return {
        ok: false,
        msg:
          ev.msg +
          (walked
            ? ` Talks have broken down — the agent won't take calls for 6 matchdays.`
            : ` (${Co.patience(p).left} round${Co.patience(p).left === 1 ? '' : 's'} of patience left)`),
        gap: ev.gap,
        terms: need != null ? { ...t, wage: need } : null,
      };
    }
    // Everyone has agreed: now the player weighs your offer against any other club chasing him
    const ch = FM.Market.choose(p, fee, t.wage, t.status);
    if (ch.club !== club) {
      T.execute(p, ch.club.id, p.clubId ? ch.fee : 0, ch.wage);
      delete (s.user.neg || {})[p.id];
      return {
        ok: false,
        lost: true,
        msg: `${W.name(p)} has chosen ${ch.club.name} over you — ${ch.why} swung it.`,
      };
    }
    T.execute(p, club.id, fee, t.wage, { deal });
    const af = Co.applyTerms(p, club, t, 'transfer', fee);
    return {
      ok: true,
      msg: `✅ ${W.name(p)} signs for ${club.name}${triggered ? ' — release clause paid' : ''}!${ch.beat ? ` He turned down ${ch.beat.join(' and ')} to join you.` : ''} ${t.bonus ? `Signing-on fee ${U.money(t.bonus)}. ` : ''}Agent fee ${U.money(af)}.`,
    };
  };

  Co.renewedUntil = (before, years) => Math.min(S().year + 6, Math.max(before, S().year) + Math.max(1, years));
  Co.renewOffer = function (pid, t) {
    const s = S(),
      p = s.players[pid],
      club = W.userClub();
    if (Co.blocked(p))
      return {
        ok: false,
        msg: `His agent has broken off talks. Try again in ${Co.patience(p).until - s.day} matchday(s).`,
      };
    if (W.hasTrait(p, 'Mercenary') && p.morale < 50)
      return { ok: false, msg: `${W.name(p)} won't discuss a new deal right now — he's unhappy.` };
    if (p.pre && !W.isUser(p.pre.c))
      return {
        ok: false,
        msg: `${W.name(p)} has signed a pre-contract with ${s.clubs[p.pre.c].name}. He leaves in the summer.`,
      };
    if (FM.Finance.frozen(t.wage - p.wage))
      return {
        ok: false,
        msg: `The board have frozen the wage bill: a renewal can't pay him more than his ${U.money(p.wage)}/wk now.`,
      };
    const ev = Co.evaluate(p, club, t, 'renew');
    if (!ev.ok) {
      if (!ev.hard) Co.logDemand(p, ev, t);
      const walked = !ev.hard && Co.spendPatience(p);
      return {
        ok: false,
        msg:
          ev.msg +
          (walked
            ? ' Talks have broken down for 6 matchdays.'
            : ` (${Co.patience(p).left} round${Co.patience(p).left === 1 ? '' : 's'} of patience left)`),
        gap: ev.gap,
        terms: !ev.hard && !walked ? { ...t, wage: Co.wageNeeded(p, club, t, 'renew') } : null,
      };
    }
    const before = p.contract;
    const af = Co.applyTerms(p, club, t, 'renew');
    p.contract = Co.renewedUntil(before, t.years); // extra years on top of the current deal, capped
    p.morale = Math.min(100, p.morale + 6);
    FM.People.onRenewed(p);
    return {
      ok: true,
      msg: `✍️ ${W.short(p)} signs until ${p.contract} on ${U.money(p.wage)}/wk. Agent fee ${U.money(af)}.`,
    };
  };

  // ---------- Money during the season ----------
  Co.matchBonuses = function (fx, res, sides) {
    if (!W.isUser(fx.h) && !W.isUser(fx.a)) return;
    const s = S(),
      side = W.isUser(fx.h) ? 0 : 1,
      sd = sides[side],
      club = W.userClub();
    let app = 0,
      goal = 0;
    for (const pid in sd.mins) {
      const p = s.players[pid];
      if (p && p.deal && p.deal.app) app += p.deal.app;
    }
    res.goals
      .filter((g) => g.side === side)
      .forEach((g) => {
        const p = s.players[g.pid];
        if (p && p.deal && p.deal.goal) goal += p.deal.goal;
      });
    const paid = app + goal;
    FM.Season.spend('app', app);
    FM.Season.spend('goal', goal);
    if (paid) {
      club.balance -= paid;
      s.user.bonusesToday = (s.user.bonusesToday || 0) + paid;
    }
  };

  // AI clubs meeting a release clause can take a player — you can't stop them
  Co.releaseClauses = function () {
    const s = S(),
      uc = W.userClub();
    const cands = W.squad(uc.id).filter((p) => !p.loan && p.deal && p.deal.release && !W.hasTrait(p, 'Loyal'));
    for (const p of cands) {
      const cheap = p.deal.release / Math.max(1, p.value);
      const chance = cheap <= 1.3 ? 0.12 : cheap <= 2 ? 0.05 : cheap <= 3 ? 0.012 : 0.002;
      if (Math.random() > chance) continue;
      const buyers = Object.values(s.clubs).filter(
        (c) =>
          (c.sim === 'full' || c.sim === 'light') &&
          !W.isUser(c.id) &&
          c.budget >= p.deal.release &&
          c.rep >= uc.rep - 4 &&
          W.levelFor(c.rep) >= p.ca - 6,
      );
      if (!buyers.length) continue;
      const b = U.pick(buyers);
      const willing =
        !FM.Transfers.isSettled(p) &&
        (W.hasTrait(p, 'Mercenary') || p.hid.amb >= 11 || b.rep > uc.rep + 3 || p.wantsOut);
      if (!willing) {
        FM.News.add({
          type: 'club',
          title: `${b.name} trigger ${W.name(p)}'s release clause — he says no`,
          body: `${b.name} lodged the ${U.money(p.deal.release)} payment, but ${W.short(p)} has told them he is staying.`,
          pid: p.id,
          clubId: uc.id,
        });
        p.morale = Math.min(100, p.morale + 5);
        continue;
      }
      const fee = p.deal.release;
      FM.People.onClause(p);
      FM.Transfers.execute(p, b.id, fee, FM.Transfers.wageDemand(p, b), { clause: true });
      FM.News.add({
        type: 'bid',
        title: `${b.name} pay ${W.name(p)}'s ${U.money(fee)} release clause`,
        body: `The clause in his contract leaves ${uc.name} powerless. He joins ${b.name} with immediate effect.`,
        pid: p.id,
        clubId: b.id,
        data: { pid: p.id, from: b.id, fee, status: 'accepted' },
      });
      return; // one per day is drama enough
    }
  };

  Co.newSeason = function () {
    const s = S();
    Object.values(s.players).forEach((p) => {
      if (!p.clubId || !p.deal) return;
      if (p.deal.rise && W.ownPlayer(p) && p.contract >= s.year)
        p.wage = Math.round((p.wage * (1 + p.deal.rise)) / 50) * 50;
      if (p.contract < s.year) delete p.deal.status;
    });
    // Relegation wage cuts kick in for the user's relegated squad
    const uc = W.userClub(),
      last = s.archive[s.archive.length - 1];
    if (uc && last && last.relegated.includes(uc.id))
      W.squad(uc.id).forEach((p) => {
        if (p.deal && p.deal.relegCut) {
          p.wage = Math.round((p.wage * 0.75) / 50) * 50;
          p.deal.relegCut = false;
        }
      });
  };

  Co.STATUS_ORDER = STATUS_ORDER;
})();
