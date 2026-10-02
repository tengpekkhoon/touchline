// Club money by country, attendance, and the pressure of a wage bill: where revenue comes from (TV money in
// England, gate receipts in Germany, player sales in the selling leagues), how full the ground is (results, fan
// mood, ticket prices, the size of the stadium, the occasion), and what the board does when wages outgrow revenue
// (budget cuts, a wage freeze, interest on debt and, at worst, administration).
(function () {
  const FM = window.FM,
    U = FM.U,
    W = FM.W;
  const F = (FM.Finance = {});
  const S = () => FM.S;

  // Revenue mix by country: multipliers on the broadcast, commercial and matchday shares of a club's revenue
  // potential (Sea.revenuePotential), and the share of a sale's fee that goes back into the transfer budget
  F.MIX = {
    _: { tv: 1, com: 1, gate: 1, sell: 0.5 },
    ENG: { tv: 1.45, com: 1.05, gate: 0.85 }, // the richest TV deal by far
    ESP: { tv: 1.15, com: 1.05, gate: 0.85 },
    ITA: { tv: 1.1, com: 0.9, gate: 0.85 },
    GER: { tv: 0.75, com: 1.1, gate: 1.3 }, // full stadiums, cheap tickets, 50+1 ownership
    FRA: { tv: 0.85, com: 1, gate: 0.95 },
    NED: { tv: 0.7, com: 0.95, gate: 1.05, sell: 0.75 }, // selling leagues: development and sales pay the bills
    POR: { tv: 0.65, com: 0.85, gate: 0.85, sell: 0.8 },
    BEL: { tv: 0.65, com: 0.9, gate: 0.95, sell: 0.75 },
    BRA: { tv: 0.85, com: 0.85, gate: 0.85, sell: 0.8 },
    ARG: { tv: 0.7, com: 0.8, gate: 1, sell: 0.8 },
    USA: { tv: 0.9, com: 1.2, gate: 1.05 }, // salary-capped, commercially strong
    MEX: { tv: 1, com: 1, gate: 0.95 },
  };
  F.mix = (c) => ({ ...F.MIX._, ...(F.MIX[c.nat] || {}) });
  F.SHARE = { tv: 0.33, com: 0.25, gate: 0.42 };
  // A season's revenue for a club, by source (before attendance and cup runs move the gate part)
  F.annual = function (c) {
    const R = FM.Season.revenuePotential(c),
      m = F.mix(c),
      comp = S().comps[c.comp],
      tier = comp ? comp.tier : 1;
    const tvTier = tier === 1 ? 1 : tier === 2 ? 0.7 : 0.5;
    return {
      tv: R * F.SHARE.tv * m.tv * tvTier * ((comp && comp.tvBoost) || 1),
      com: R * F.SHARE.com * m.com * (1 + (((c.facilities && c.facilities.fanzone) || 1) - 1) * 0.06),
      gate: R * F.SHARE.gate * m.gate,
    };
  };
  F.revenue = (c) => {
    const a = F.annual(c);
    return a.tv + a.com + a.gate;
  };

  // ---------- Attendance ----------
  F.TICKETS = {
    Low: { fill: 0.08, price: 0.8, mood: 0.2 },
    Normal: { fill: 0, price: 1, mood: 0 },
    High: { fill: -0.1, price: 1.25, mood: -0.25 },
  };
  F.ticket = (c) => (W.isUser(c.id) && S().user.tickets) || 'Normal';
  // How full the ground is for a home game: reputation, fan mood, recent results, the price, the opponent and the
  // occasion; a bigger stadium is harder to fill. Returns { att, fill }.
  F.attendance = function (c, opp, derby) {
    const cap = (c.stadium && c.stadium.cap) || 20000,
      t = F.TICKETS[F.ticket(c)];
    const form = FM.Season.lastResults ? FM.Season.lastResults(c.id) : null;
    let fill =
      0.5 +
      c.rep / 280 +
      ((c.fanMood ?? 60) - 50) / 250 +
      t.fill +
      (opp ? Math.max(0, opp.rep - c.rep) / 300 : 0) +
      (derby ? 0.12 : 0) -
      Math.max(0, Math.log2(cap / (12000 + c.rep * 450))) * 0.12; // a ground built bigger than the club fills less
    if (form && form.length) fill += (form.reduce((s, r) => s + r, 0) / form.length - 0.45) * 0.15;
    fill = U.clamp(fill, 0.25, 1);
    return { att: Math.round(cap * fill), fill };
  };

  // ---------- Wages against revenue ----------
  F.wageBill = (c) =>
    U.sum(W.squad(c.id), (p) => p.wage * (p.loan && p.clubId === c.id ? p.loan.share : 1)) * FM.D.WAGE_WEEKS;
  F.wageRatio = (c) => F.wageBill(c) / Math.max(1, F.revenue(c));
  F.LIMIT = { cut: 0.7, freeze: 0.85, interest: 0.01 };
  // Weekly: interest on debt for everyone; for your club, the board steps in as the wage bill outgrows revenue
  F.weekly = function () {
    const s = S();
    for (const c of Object.values(s.clubs)) {
      if (c.sim !== 'full') continue;
      if (c.balance < 0) {
        const i = Math.round(-c.balance * F.LIMIT.interest);
        c.balance -= i;
        if (W.isUser(c.id)) FM.Season.spend('interest', i);
      }
      // an AI club deep in the red stops buying and puts its best-paid player up for sale
      if (!W.isUser(c.id) && c.balance < -0.3 * F.revenue(c)) {
        c.budget = 0;
        const top = W.squad(c.id).sort((a, b) => b.wage - a.wage)[0];
        if (top) top.listed = true;
      }
    }
    const uc = W.employed() && W.userClub();
    if (!uc) return;
    const r = F.wageRatio(uc),
      fp = (s.user.finPressure = s.user.finPressure || { year: s.year, cut: false, freeze: false });
    if (fp.year !== s.year) Object.assign(fp, { year: s.year, cut: false, freeze: false, boost: 0 });
    const boost = fp.boost || 0; // the board agreed to tolerate higher wages this season (a board meeting)
    if (r > F.LIMIT.cut + boost && !fp.cut) {
      fp.cut = true;
      const before = uc.budget;
      uc.budget = U.roundMoney(uc.budget * 0.75);
      FM.News.add({
        type: 'board',
        title: 'The board cut the transfer budget',
        body: `Wages are ${Math.round(r * 100)}% of revenue (the board want them under ${Math.round(F.LIMIT.cut * 100)}%). The budget drops from ${U.money(before)} to ${U.money(uc.budget)}.`,
        clubId: uc.id,
      });
    }
    if (r > F.LIMIT.freeze + boost && !fp.freeze) {
      fp.freeze = true;
      FM.News.add({
        type: 'board',
        title: 'Wage freeze',
        body: `Wages have reached ${Math.round(r * 100)}% of revenue. No new contract may add to the wage bill until it falls below ${Math.round(F.LIMIT.freeze * 100)}%. Selling a high earner would help.`,
        clubId: uc.id,
      });
    }
    if (fp.freeze && r < F.LIMIT.freeze + boost - 0.03) {
      fp.freeze = false;
      FM.News.add({
        type: 'board',
        title: 'Wage freeze lifted',
        body: 'The wage bill is back within limits.',
        clubId: uc.id,
      });
    }
  };
  // The board's wage freeze: no new deal may push wages up (renewals at the same wage or less, and sales, are fine)
  F.frozen = (wageAdded) => {
    const fp = S().user && S().user.finPressure;
    return !!(fp && fp.freeze && fp.year === S().year && wageAdded > 0);
  };
  // Administration: debts beyond half a season's revenue (and at least £8M)
  F.adminThreshold = (c) => -Math.max(8e6, 0.5 * F.revenue(c));
})();
