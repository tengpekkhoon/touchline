// The board: what it demands of you each season and the four meetings where you face it.
// Demands are set when the season starts (they don't drift with results): a league aim and a minimum, cup targets
// that fit the club, the club's finances and its identity, each critical, important or a bonus. At the season's end
// the board judges you on them by weight. Four meetings a season (pre-season, autumn, the mid-season review and
// spring): the board says how it sees things and may set its own demand; you make one request, which it answers on
// confidence, money, form, your reputation and what you have asked before.
(function () {
  const FM = window.FM,
    U = FM.U,
    W = FM.W,
    D = FM.D;
  const B = (FM.Board = {});
  const S = () => FM.S;
  const Sea = () => FM.Season;

  // What a demand is worth to the board's confidence at the season's end, met or missed
  B.WEIGHT = {
    critical: { label: 'Critical', met: 10, miss: -14 },
    important: { label: 'Important', met: 6, miss: -6 },
    bonus: { label: 'Bonus', met: 4, miss: -1 },
  };

  // ---------- Demands ----------
  const leagueDemand = function (club) {
    const s = S(),
      comp = s.comps[club.comp],
      R = comp.rules || {},
      n = comp.clubs.length,
      exp = Sea().expectedPos(club),
      rel = R.relegate ? R.relegate.n : 0,
      safe = rel ? n - rel : n - 1,
      half = Math.ceil(n / 2);
    let aim, min;
    if (R.promote) {
      const auto = R.promote.auto,
        po = R.promote.playoff;
      if (exp <= auto)
        ((aim = { t: auto, text: 'Win promotion', promo: true }),
          (min = po ? { t: po[1], text: 'a play-off place' } : { t: auto + 2, text: `top ${auto + 2}` }));
      else if (po && exp <= po[1])
        ((aim = { t: po[1], text: `Reach the play-offs (top ${po[1]})` }), (min = { t: half, text: 'the top half' }));
      else if (rel && exp > safe - 2) aim = min = { t: safe, text: 'Avoid relegation' };
      else ((aim = { t: half, text: 'Finish in the top half' }), (min = { t: safe, text: 'stay up' }));
    } else {
      const places = R.qualify ? R.qualify.n : 0,
        cc = places && s.comps[R.qualify.to],
        second = D.CONTINENTALS.find((x) => x.feeders && x.feeders[comp.id]),
        europe = places + (second ? second.feeders[comp.id] : 0);
      if (exp === 1)
        ((aim = { t: 1, text: `Win ${comp.name}` }),
          (min = places ? { t: places, text: `${cc.name} qualification` } : { t: 2, text: 'second place' }));
      else if (places && exp <= places)
        ((aim = { t: places, text: `Qualify for the ${cc.name} (top ${places})` }),
          (min =
            europe > places
              ? { t: europe, text: `a ${second.name} place (top ${europe})` }
              : { t: places + 2, text: `top ${places + 2}` }));
      else if (europe && exp <= europe + 1)
        ((aim = { t: europe, text: `Qualify for Europe (top ${europe})` }), (min = { t: half, text: 'the top half' }));
      else if (exp <= half)
        ((aim = { t: half, text: 'Finish in the top half' }),
          (min = { t: safe, text: rel ? 'stay up' : 'stay off the bottom' }));
      else aim = min = { t: safe, text: rel ? 'Avoid relegation' : 'Avoid finishing bottom' };
    }
    return {
      id: 'pos',
      text: aim.text,
      target: aim.t,
      min: min.t,
      minText: min === aim ? '' : min.text,
      promo: !!aim.promo,
      weight: 'critical',
    };
  };
  // Cup demands: added when the club is in the competition (the draw comes after the season's first day)
  const cupDemands = function (club) {
    const s = S(),
      out = [],
      comp = s.comps[club.comp],
      top = comp && comp.tier === 1,
      exp = Sea().expectedPos(club);
    const cup = W.cups().find((c) => c.clubs.includes(club.id));
    if (cup) {
      if (top && exp <= 2)
        out.push({ id: 'cup', cup: cup.id, stage: 2, text: `Reach the ${cup.name} final`, weight: 'important' });
      else if (top && exp <= 5)
        out.push({ id: 'cup', cup: cup.id, stage: 4, text: `Reach the ${cup.name} semi-finals`, weight: 'important' });
      else if (top)
        out.push({ id: 'cup', cup: cup.id, stage: 8, text: `Reach the ${cup.name} quarter-finals`, weight: 'bonus' });
      else out.push({ id: 'cup', cup: cup.id, wins: 1, text: `Win a tie in the ${cup.name}`, weight: 'bonus' });
    }
    const cc = W.continentals().find((c) => c.clubs.includes(club.id));
    if (cc) {
      // judged against the rest of the field: the favourites must go deep, the outsiders get out of the group
      const rank =
        cc.clubs
          .map((id) => s.clubs[id])
          .filter(Boolean)
          .sort((a, b) => b.rep - a.rep)
          .findIndex((c) => c.id === club.id) + 1;
      const [stage, text, weight] =
        rank <= 2 && club.rep >= 85
          ? [3, `Reach the ${cc.name} final`, 'important']
          : rank <= 4
            ? [2, `Reach the ${cc.name} semi-finals`, 'important']
            : rank <= 8
              ? [1, `Reach the ${cc.name} quarter-finals`, 'important']
              : [0.5, `Get through the ${cc.name} group`, 'bonus'];
      out.push({ id: 'cc', cc: cc.id, stage, text, weight });
    }
    return out;
  };
  const otherDemands = function (club) {
    const out = [],
      F = FM.Finance,
      ratio = F ? F.wageRatio(club) : 0;
    // money: what the club's situation calls for
    if (ratio > 0.75)
      out.push({ id: 'wages', limit: 0.7, text: 'Bring the wage bill below 70% of revenue', weight: 'important' });
    else if (ratio > 0.6)
      out.push({ id: 'wages', limit: 0.7, text: 'Keep wages below 70% of revenue', weight: 'bonus' });
    if (club.balance < 0) out.push({ id: 'debt', text: 'Reduce the club’s debt', weight: 'important' });
    if (club.identity === 'selling')
      out.push({ id: 'profit', text: 'Make a net transfer profit', weight: 'important' });
    // the club's identity
    const idObj = {
      youth: { id: 'youth', text: 'Give 3 academy graduates 5+ appearances', weight: 'important' },
      fan: { id: 'goals', gpg: 1.6, text: 'Play attacking football: 1.6+ goals a game', weight: 'bonus' },
      oil: { id: 'goals', gpg: 2, text: 'Dominate: 2+ goals a game', weight: 'important' },
      giant: { id: 'derby', text: 'Don’t lose the derby', weight: 'important' },
      historic: { id: 'derby', text: 'Don’t lose the derby', weight: 'important' },
      fallen: { id: 'pos2', text: 'Show the club is rising again: finish above expectations', weight: 'important' },
    }[club.identity];
    // (no derby without a rival; a fallen giant expected near the top already has the league aim to meet)
    if (idObj && !(idObj.id === 'derby' && !club.rival) && !(idObj.id === 'pos2' && Sea().expectedPos(club) <= 3))
      out.push(idObj);
    return out;
  };
  // This season's demands for the club (made once, when first asked for; cups join once the club is drawn)
  B.list = function (club) {
    const u = S().user,
      y = S().year;
    if (!u) return [];
    const b = (u.board = u.board && u.board.year === y ? u.board : { year: y, meetings: 0 });
    if (!b.demands || b.demands.club !== club.id) {
      b.demands = { club: club.id, list: [leagueDemand(club), ...otherDemands(club)], startBalance: club.balance };
    }
    const L = b.demands.list;
    for (const d of cupDemands(club)) if (!L.some((x) => x.id === d.id)) L.push(d);
    return L;
  };

  // ---------- Progress ----------
  const reachedCup = function (cup, clubId) {
    // how far the club got in a domestic cup: teams left in the furthest round it played (1 = won it)
    if (!cup || !cup.rounds) return { teams: Infinity, wins: 0, out: false };
    if (cup.winner === clubId) return { teams: 1, wins: cup.rounds.length, out: false };
    let teams = Infinity,
      wins = 0,
      out = false;
    for (const r of cup.rounds) {
      const t = r.ties.find((f) => f.h === clubId || f.a === clubId);
      if (!t) continue;
      teams = Math.min(teams, r.ties.length * 2);
      if (t.res) {
        const won = FM.Season.winnerOf(t) === clubId;
        if (won) wins++;
        else out = true;
      }
    }
    return { teams, wins, out };
  };
  const reachedCC = function (cc, clubId) {
    if (!cc) return 0;
    if (cc.winner === clubId) return 4;
    const ko = cc.ko || {},
      has = (list) => (list || []).some((f) => f && (f.h === clubId || f.a === clubId));
    if (ko.final && (ko.final.h === clubId || ko.final.a === clubId)) return 3;
    if (has(ko.sf) || has(ko.sf2)) return 2;
    if (has(ko.qf) || has(ko.qf2)) return 1;
    return 0;
  };
  B.progress = function (o, club) {
    const s = S(),
      row = club.comp && s.comps[club.comp].table[club.id],
      pos = W.position(club.id);
    switch (o.id) {
      case 'pos':
        return {
          ok: pos <= o.target,
          minOk: pos <= o.min,
          status: `Currently ${U.ordinal(pos)}`,
        };
      case 'pos2': {
        const exp = Sea().expectedPos(club);
        return { ok: pos <= exp, status: `${U.ordinal(pos)} (board expects ${U.ordinal(exp)})` };
      }
      case 'cup': {
        const r = reachedCup(s.comps[o.cup], club.id);
        if (o.wins)
          return { ok: r.wins >= o.wins, status: r.wins ? 'Through' : r.out ? 'Knocked out' : 'Not played yet' };
        return {
          ok: r.teams <= o.stage,
          status:
            r.teams === 1 ? 'Winners' : r.out ? 'Knocked out' : r.teams < Infinity ? 'Still in' : 'Not played yet',
        };
      }
      case 'cc': {
        const reached = reachedCC(s.comps[o.cc], club.id),
          st = FM.Cups.status(club.id).find((x) => x.c.id === o.cc);
        return { ok: o.stage === 0.5 ? reached >= 1 : reached >= o.stage, status: st ? st.text : '' };
      }
      case 'wages': {
        const r = FM.Finance.wageRatio(club);
        return { ok: r <= o.limit, status: `${Math.round(r * 100)}% now` };
      }
      case 'debt': {
        const start = (s.user.board && s.user.board.demands && s.user.board.demands.startBalance) || 0;
        return { ok: club.balance > start, status: `${U.money(club.balance)} (from ${U.money(start)})` };
      }
      case 'profit': {
        const n = s.seasonLog.net[club.id] || 0;
        return { ok: n >= 0, status: `Net ${U.money(n)}` };
      }
      case 'youth': {
        const n = W.squad(club.id).filter((p) => p.youth === club.id && p.season.apps >= 5).length;
        return { ok: n >= 3, status: `${n}/3 so far` };
      }
      case 'goals': {
        const gpg = row && row.p ? row.gf / row.p : 0;
        return { ok: gpg >= o.gpg, status: `${gpg.toFixed(2)} a game` };
      }
      case 'derby': {
        const lost = FM.Cups.allFixtures().filter(
          (f) =>
            f.res &&
            ((f.h === club.id && f.a === club.rival && f.res.hg < f.res.ag) ||
              (f.a === club.id && f.h === club.rival && f.res.ag < f.res.hg)),
        ).length;
        return { ok: lost === 0, status: lost ? `Lost ${lost}` : 'Unbeaten' };
      }
    }
    return { ok: false, status: '' };
  };

  // ---------- The season's verdict ----------
  // Confidence change at the season's end, from the demands by weight (the league aim and minimum count most)
  B.verdict = function (objs, promoted) {
    let d = 0;
    for (const o of objs) {
      const W8 = B.WEIGHT[o.weight || 'important'];
      if (o.id === 'pos') {
        const ok = o.ok || (o.promo && promoted);
        if (ok) d += 12;
        else if (o.minOk) d += 1;
        else d += -10 - Math.max(0, W.position(W.userClub().id) - o.min) * 4;
      } else d += o.ok ? W8.met : W8.miss;
    }
    return d;
  };

  // ---------- Meetings ----------
  B.MEETINGS = [
    { k: 'pre', at: 0, label: 'Pre-season board meeting' },
    { k: 'autumn', at: 0.3, label: 'Autumn board meeting' },
    { k: 'winter', at: 0.55, label: 'Mid-season board review' },
    { k: 'spring', at: 0.8, label: 'Spring board meeting' },
  ];
  const board = () => {
    const u = S().user,
      y = S().year;
    return (u.board = u.board && u.board.year === y ? u.board : { year: y, meetings: 0 });
  };
  B.held = () => board().held || [];
  B.next = function () {
    const held = B.held();
    return B.MEETINGS.find((m) => !held.includes(m.k)) || null;
  };
  // Called each day: convene the next meeting when its time in the season comes
  B.tick = function () {
    if (!W.employed()) return;
    const s = S(),
      b = board(),
      club = W.userClub();
    if (!s.calendar) return;
    const due = (m) => s.day >= Math.floor(s.calendar.length * m.at);
    // a new job (or the first day of a season): meetings already past for this club are skipped, so a manager who
    // arrives mid-season meets the board once, at the latest meeting due, not at every one he missed
    if (b.club !== club.id) {
      b.club = club.id;
      b.held = B.MEETINGS.filter((m, i) => B.MEETINGS[i + 1] && due(B.MEETINGS[i + 1])).map((m) => m.k);
    }
    const m = B.next();
    if (!m || !due(m)) return;
    B.convene(m);
  };
  const form5 = (club) => {
    const r = Sea().lastResults(club.id) || [];
    return r.slice(-5);
  };
  // The requests on the table at a meeting: what fits the club's situation now
  B.REQUESTS = {
    funds: { label: 'More money for transfers', icon: '💰' },
    wages: { label: 'A bigger wage budget', icon: '🧾' },
    facility: { label: 'Fund a facility upgrade', icon: '🏗️' },
    stadium: { label: 'Expand the stadium', icon: '🏟️' },
    youth: { label: 'Back a youth-first project', icon: '🌱' },
    marquee: { label: 'Back a marquee signing', icon: '⭐' },
    lower: { label: 'Lower the league target', icon: '📉' },
    patience: { label: 'Ask for patience', icon: '⏳' },
    camp: { label: 'Pay for a pre-season training camp', icon: '🏔️' },
    none: { label: 'Nothing to ask today', icon: '🤝' },
  };
  const options = function (club, m) {
    const s = S(),
      conf = club.boardConf,
      ratio = FM.Finance.wageRatio(club),
      objs = Sea().objectives(club),
      pos = objs.find((o) => o.id === 'pos'),
      out = ['funds'];
    if (ratio > 0.55) out.push('wages');
    if (!club.building) out.push('facility');
    const fill = FM.Finance.attendance(club).fill;
    if (fill >= 0.92 && !club.building && club.facilities.stadium < 5) out.push('stadium');
    if (!board().youthAsked) out.push('youth');
    if (conf >= 70 && club.rep >= 70) out.push('marquee');
    if (pos && !pos.ok && m.k !== 'pre' && pos.target !== pos.min) out.push('lower');
    if (conf < 55) out.push('patience');
    if (m.k === 'pre' && s.user.preseason) out.push('camp');
    out.push('none');
    return out;
  };
  // What the board says before you ask for anything
  const statement = function (club, m) {
    const b = board(),
      F = FM.Finance,
      objs = Sea().objectives(club),
      conf = Math.round(club.boardConf),
      lines = [];
    const trend =
      b.lastConf == null ? '' : conf > b.lastConf + 2 ? ' (up)' : conf < b.lastConf - 2 ? ' (down)' : ' (steady)';
    lines.push(`Board confidence: ${conf}%${trend}.`);
    if (m.k === 'pre') {
      lines.push('This season the board expect:');
      for (const o of objs)
        lines.push(
          `• ${o.text}${o.minText ? ` — at the very least ${o.minText}` : ''} (${B.WEIGHT[o.weight || 'important'].label.toLowerCase()})`,
        );
    } else {
      const ok = objs.filter((o) => o.ok).length;
      lines.push(`Targets: ${ok} of ${objs.length} on track.`);
      for (const o of objs.filter((x) => (x.weight === 'critical' || x.weight === 'important') && !x.ok))
        lines.push(`• Behind: ${o.text} — ${o.status}.`);
      const f = form5(club);
      if (f.length) {
        const pts = f.reduce((t, r) => t + (r === 1 ? 3 : r === 0.5 ? 1 : 0), 0);
        lines.push(`Recent form: ${pts} points from the last ${f.length} games.`);
      }
    }
    lines.push(
      `Finances: ${U.money(club.balance)} in the bank, wages ${Math.round(F.wageRatio(club) * 100)}% of revenue (the board's limit is 70%).`,
    );
    // what came of the board's own demand from the last meeting
    if (b.agenda) {
      const a = b.agenda,
        done = agendaDone(club, a);
      club.boardConf = U.clamp(club.boardConf + (done ? 5 : -6), 0, 100);
      lines.push(
        done
          ? `✅ You delivered on our request: ${a.text.toLowerCase()}`
          : `❌ Our request was ignored: ${a.text.toLowerCase()}`,
      );
      b.agenda = null;
    }
    // and a new one, if the club's situation calls for it
    const a = agendaFor(club, m);
    if (a) {
      b.agenda = a;
      lines.push(`The board's demand: ${a.text}.`);
    }
    if (conf < 30) lines.push('⚠️ Results must improve. The board are watching every game.');
    b.lastConf = conf;
    return lines.join('\n');
  };
  const agendaFor = function (club, m) {
    if (m.k === 'spring') return null; // nothing left to deliver before the season's end
    const F = FM.Finance,
      ratio = F.wageRatio(club);
    if (ratio > 0.8) return { k: 'wages', text: 'Cut the wage bill: move on a high earner', ratio };
    if (club.balance < -20e6)
      return { k: 'sell', text: 'Raise money from player sales', net: S().seasonLog.net[club.id] || 0 };
    if (club.identity === 'youth') {
      const n = W.squad(club.id).filter((p) => p.youth === club.id && p.season.apps >= 1).length;
      if (n < 3) return { k: 'youth', text: 'Give academy players first-team minutes', n };
    }
    return null;
  };
  const agendaDone = function (club, a) {
    if (a.k === 'wages') return FM.Finance.wageRatio(club) < a.ratio - 0.03;
    if (a.k === 'sell') return (S().seasonLog.net[club.id] || 0) > a.net + 2e6;
    if (a.k === 'youth') return W.squad(club.id).filter((p) => p.youth === club.id && p.season.apps >= 1).length > a.n;
    return true;
  };
  B.convene = function (m) {
    const club = W.userClub(),
      b = board();
    (b.held = b.held || []).push(m.k);
    b.meetings = b.held.length;
    if (m.k === 'winter' && FM.People.midSeason) FM.People.midSeason(); // the review (and any ultimatum) comes first
    const opts = options(club, m);
    FM.Market.desk({
      kind: 'board',
      meeting: m.k,
      title: m.label,
      body: statement(club, m) + '\n\nWhat do you want to raise with the board?',
      def: opts.indexOf('none'),
      rec: opts.indexOf('none'),
      choices: opts.map((k) => ({ k, label: `${B.REQUESTS[k].icon} ${B.REQUESTS[k].label}` })),
    });
  };

  // ---------- Answers ----------
  // How the board feel about a request: confidence, money in the bank, recent form and your standing
  const mood = function (club) {
    const f = form5(club),
      formPts = f.length ? f.reduce((t, r) => t + (r === 1 ? 3 : r === 0.5 ? 1 : 0), 0) / (f.length * 3) : 0.5;
    const rep = S().user.rep || 50;
    return club.boardConf / 100 + (formPts - 0.45) * 0.4 + (rep - 55) / 200;
  };
  B.answer = function (n, k) {
    const s = S(),
      club = W.userClub(),
      b = board(),
      asked = (b.asked = b.asked || {}),
      again = asked[k] || 0;
    asked[k] = again + 1;
    if (!club) return { msg: '' };
    const conf = club.boardConf,
      rich = club.identity === 'oil' ? 1.8 : club.identity === 'giant' ? 1.3 : club.identity === 'fan' ? 0.7 : 1,
      R = Sea().revenuePotential(club),
      md = mood(club) - again * 0.12; // asking for the same thing twice wears thin
    const say = (t) => {
      FM.News.add({ type: 'board', title: `Board: ${B.REQUESTS[k].label.toLowerCase()}`, body: t, clubId: club.id });
      return { msg: t };
    };
    const cost = (x) => (club.boardConf = U.clamp(club.boardConf - x, 0, 100));
    switch (k) {
      case 'none':
        return { msg: 'The board note your confidence in the plan.' };
      case 'funds': {
        if (md >= 0.55 && club.balance > club.budget * 1.1) {
          const add = U.roundMoney(Math.min(club.balance * 0.2, R * 0.12 * rich) * (md >= 0.75 ? 1.3 : 1));
          club.budget += add;
          return say(`✅ Approved: an extra ${U.money(add)} for transfers.`);
        }
        if (club.identity === 'oil' && md >= 0.45) {
          const add = U.roundMoney(R * 0.1);
          club.budget += add;
          club.balance += add;
          return say(`✅ The owners inject ${U.money(add)} of fresh money.`);
        }
        if (md < 0.4) cost(3);
        return say(
          `❌ Refused. "${club.balance < club.budget ? 'The money simply isn’t there.' : again ? 'You asked us that already.' : 'Earn our trust first.'}"`,
        );
      }
      case 'wages': {
        // approved: the board tolerate wages 10 points higher against revenue this season before cutting the budget
        // or freezing new wages (FM.Finance.weekly)
        const ratio = FM.Finance.wageRatio(club),
          fp = (s.user.finPressure = s.user.finPressure || { year: s.year, cut: false, freeze: false });
        if (fp.year !== s.year) Object.assign(fp, { year: s.year, cut: false, freeze: false, boost: 0 });
        if (ratio < 0.85 && club.balance > 0 && md >= 0.5 && !fp.boost) {
          fp.boost = 0.1;
          return say(
            `✅ The board will stretch to wages of ${Math.round((FM.Finance.LIMIT.cut + 0.1) * 100)}% of revenue this season before stepping in.`,
          );
        }
        cost(ratio > 0.75 ? 4 : 1);
        return say(
          `❌ "Wages are already ${Math.round(ratio * 100)}% of what we bring in.${club.balance < 0 ? ' And we are in debt.' : ''} Not a penny more."`,
        );
      }
      case 'facility': {
        const order = ['training', 'academy', 'medical', 'analytics'].sort(
            (a, b2) => club.facilities[a] - club.facilities[b2],
          ),
          f = order.find((x) => club.facilities[x] < 5);
        if (!f) return say('❌ "Our facilities are already world-class."');
        if (md >= 0.6 && (rich >= 1 || md >= 0.8)) {
          club.building = { k: f, weeks: Sea().facWeeks(f, club.facilities[f]) };
          return say(
            `✅ The owners will pay for the ${Sea().FAC[f].name} upgrade (${U.money(Sea().facCost(f, club.facilities[f]))}). Work starts now.`,
          );
        }
        return say(`❌ "We can't justify that spending ${md < 0.6 ? 'with results as they are' : 'right now'}."`);
      }
      case 'stadium': {
        const lvl = club.facilities.stadium;
        if (md >= 0.55 && club.balance > Sea().facCost('stadium', lvl) * 0.5) {
          club.building = { k: 'stadium', weeks: Sea().facWeeks('stadium', lvl) };
          return say(`✅ Sold out every week? The board agree: the stadium will be expanded. Work starts now.`);
        }
        return say('❌ "An expansion is a big commitment. Show us it will pay for itself."');
      }
      case 'youth': {
        b.youthAsked = true;
        const grads = W.squad(club.id).filter((p) => p.youth === club.id && p.season.apps >= 3).length;
        if (['youth', 'fan', 'selling'].includes(club.identity) || grads >= 3) {
          club.boardConf = Math.min(100, conf + 4);
          club.fanMood = Math.min(100, club.fanMood + 3);
          if (club.facilities.academy < 5 && !club.building && md >= 0.55) {
            club.building = { k: 'academy', weeks: Sea().facWeeks('academy', club.facilities.academy) };
            return say('✅ The board love it, and will fund an academy upgrade.');
          }
          return say('✅ The board love the vision. Confidence up.');
        }
        return say('🤨 "A nice idea. But this club needs results now."');
      }
      case 'marquee': {
        if (md >= 0.7 && club.balance > 0) {
          const add = U.roundMoney(R * 0.2 * rich);
          club.budget += add;
          // the board raise the bar to match: the league aim tightens a place
          const pos = Sea()
            .objectives(club)
            .find((o) => o.id === 'pos');
          if (pos && pos.target > 1) {
            const d = b.demands.list.find((o) => o.id === 'pos');
            d.base = d.base || d.text;
            d.target = Math.max(1, d.target - 1);
            d.text = d.target === 1 ? 'Win the league' : `${d.base} — now top ${d.target}`;
          }
          return say(
            `✅ The board back a statement signing: ${U.money(add)} more to spend. They will expect more in return.`,
          );
        }
        return say('❌ "One big name won’t fix this. Build the team first."');
      }
      case 'lower': {
        const d = b.demands.list.find((o) => o.id === 'pos');
        if (!d || d.target === d.min) return say('🤨 "That is already the least we expect."');
        if (md >= 0.35) {
          d.target = d.min;
          d.text = `Revised target: ${d.minText}`;
          cost(6);
          return say(`✅ The board accept a revised target (${d.minText}), but it costs you some of their faith.`);
        }
        cost(4);
        return say('❌ "The target stands. Meet it."');
      }
      case 'patience': {
        if (conf < 45 && s.user.rep >= 55 && !b.patience) {
          club.boardConf = Math.min(100, conf + 10);
          b.patience = true;
          return say('✅ "We believe in the project. You have our backing, for now."');
        }
        if (conf >= 45) {
          cost(2);
          return say('🤨 "Patience? Nobody is questioning you. Yet."');
        }
        cost(4);
        return say('❌ "Results will decide your future, not speeches."');
      }
      case 'camp': {
        // a pre-season day still to come with no friendly booked (the plan is keyed by pre-season day)
        const plan = (s.user.preseason = s.user.preseason || {});
        const i = s.calendar.findIndex(
          (c, d) => c.type === 'pre' && d >= s.day && !(plan[c.idx] && plan[c.idx].type === 'friendly'),
        );
        if (md >= 0.45 && i >= 0) {
          const idx = s.calendar[i].idx;
          plan[idx] = { type: 'camp', key: club.facilities.training <= 2 ? 'fitness' : 'tactical', paid: true };
          return say(`✅ The board pay for a ${plan[idx].key} camp on pre-season day ${idx + 1}.`);
        }
        return say('❌ "Pre-season is already planned and paid for."');
      }
    }
    return { msg: '' };
  };
  B.newSeason = function () {
    const u = S().user;
    if (u) u.board = { year: S().year, meetings: 0 };
  };
})();
