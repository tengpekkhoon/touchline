// Staff advice: the assistant's notes on selection and the squad, scout recommendations,
// and the pre-season preview (predicted table, best XI, one to watch).
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const A = (FM.Advice = {});
  const S = () => FM.S;

  const staff = (key) => S().staff[S().user.staff[key]];
  const who = (st) => (st ? `${st.fn} ${st.ln}` : 'Staff');

  // Assistant manager's notes. A better assistant notices more.
  A.SNOOZE = 6; // matchdays before a dismissed note can reappear
  A.done = (key) => {
    const s = S();
    (s.user.adviceDone = s.user.adviceDone || {})[key] = s.day;
  };

  A.assistant = function () {
    const s = S(),
      c = W.userClub(),
      asst = staff('assistant');
    const T = s.user.tactic,
      slots = D.FORMATIONS[T.formation];
    const { xi, bench } = W.pickXI(c.id, T);
    const sq = W.squad(c.id);
    const notes = [];
    const add = (key, pri, icon, text, pid, act) => notes.push({ key, pri, icon, text, pid, act });

    const usedAlts = new Set(),
      tired = [];
    xi.forEach((p, i) => {
      if (!p) return;
      const fit = W.fitAt(p, slots[i].t);
      if (fit < 0.8) {
        const alt = sq
          .filter((q) => W.available(q) && !xi.includes(q) && !usedAlts.has(q.id) && W.fitAt(q, slots[i].t) >= 0.95)
          .sort((a, b) => W.effAt(b, slots[i].t) - W.effAt(a, slots[i].t))[0];
        if (alt && W.effAt(alt, slots[i].t) >= W.effAt(p, slots[i].t) * 0.96) {
          usedAlts.add(alt.id);
          add(
            'oop:' + p.id,
            5,
            '🧩',
            `${W.short(p)} is playing out of position at ${slots[i].t}. ${W.short(alt)} is a natural there and just as effective.`,
            p.id,
            { label: 'Swap', act: 'swapIn', id: `${i}:${alt.id}` },
          );
        } else
          add(
            'cover:' + slots[i].t,
            3,
            '🧩',
            `${W.short(p)} is filling in at ${slots[i].t}. We lack a natural ${D.POS_NAME[slots[i].t] ? D.POS_NAME[slots[i].t].toLowerCase() : slots[i].t} of his level — worth scouting.`,
            p.id,
          );
      }
      if (p.fitness < 72) tired.push(p);
    });
    // One grouped fitness note instead of one line per player
    if (tired.length) {
      tired.sort((a, b) => a.fitness - b.fitness);
      const names = tired
        .slice(0, 3)
        .map((p) => `${W.short(p)} (${Math.round(p.fitness)}%)`)
        .join(', ');
      add(
        'fit',
        tired.length >= 3 ? 4 : 3,
        '🔋',
        tired.length === 1
          ? `${names} is short of fitness. Consider resting him.`
          : `${tired.length} starters are short of fitness: ${names}${tired.length > 3 ? '…' : ''}. Rotate if you can.`,
        tired[0].id,
      );
    }
    bench.forEach((p) => {
      const f = p.form.slice(-3);
      if (f.length >= 2 && U.avg(f) >= 7.2)
        add(
          'form:' + p.id,
          3,
          '🔥',
          `${W.short(p)} is in great form (${U.avg(f).toFixed(1)} avg) but is on the bench.`,
          p.id,
        );
    });
    sq.filter((p) => p.morale < 40)
      .slice(0, 2)
      .forEach((p) =>
        add(
          'unhappy:' + p.id,
          4,
          '😠',
          `${W.short(p)} is unhappy (${W.moraleLabel(p.morale)[0].toLowerCase()} morale). ${p.hid.amb >= 14 ? 'He wants more minutes — or a move.' : 'A chat or some game time would help.'}`,
          p.id,
        ),
      );
    // Loans: a young player with room to grow who isn't getting games, if we can spare him at his position, and
    // where he'd actually play (FM.Market.loanTarget) — not just "needs minutes"
    const games = FM.Season.gamesPlayed(c.id),
      groupCount = (g) => sq.filter((q) => !q.loan && D.POS_GROUP[q.pos] === g).length,
      NEED = { GK: 2, DEF: 6, MID: 5, ATT: 4 };
    sq.filter((p) => W.age(p) <= 23 && !xi.includes(p) && !p.loan).forEach((p) => {
      const rivals = xi.filter(
        (q, i) => q && D.POS_GROUP[slots[i].t === 'WB' ? 'FB' : slots[i].t] === D.POS_GROUP[p.pos],
      );
      const weakest = rivals.sort((a, b) => a.ca - b.ca)[0];
      if (weakest && p.ca >= weakest.ca - 2)
        add(
          'ready:' + p.id,
          3,
          '🌱',
          `${W.short(p)} (${W.age(p)}) is ready. He's as good as ${W.short(weakest)} already.`,
          p.id,
        );
      else if (
        p.pa - p.ca >= 6 &&
        W.age(p) >= 18 &&
        p.season.apps <= Math.max(2, games * 0.3) &&
        groupCount(D.POS_GROUP[p.pos]) > NEED[D.POS_GROUP[p.pos]]
      ) {
        const dest = FM.Market.loanTarget(p),
          comp = dest && s.comps[dest.comp];
        if (!dest) return;
        const starts = W.levelFor(dest.rep) <= p.ca + 2,
          open = FM.Season.windowOpen();
        add(
          'loan:' + p.id,
          2,
          '✈️',
          `${W.short(p)} (${W.age(p)}, ${p.pos}) needs games: ${p.season.apps} so far. ${dest.name}${comp ? ` (${comp.name})` : ''} would ${starts ? 'start him' : 'give him minutes'} at a level that stretches him.${open ? '' : ' Loans reopen with the window.'}`,
          p.id,
          open ? { label: 'Loan out', act: 'loanOut', id: p.id } : null,
        );
      }
    });
    // Weak area of the squad
    const groups = ['GK', 'DEF', 'MID', 'ATT'].map((g) => {
      const ps = sq.filter((p) => D.POS_GROUP[p.pos] === g).sort((a, b) => b.ca - a.ca);
      const need = { GK: 1, DEF: 4, MID: 3, ATT: 2 }[g];
      return { g, avg: U.avg(ps.slice(0, need), (p) => p.ca) || 0, depth: ps.length };
    });
    const teamAvg = U.avg(groups, (x) => x.avg);
    const weak = groups.sort((a, b) => a.avg - b.avg)[0];
    const scouting = (g) => s.user.assignments.some((a) => a.type !== 'player' && a.pos === g);
    if (weak.avg < teamAvg - 3 && !scouting(weak.g))
      add(
        'weak:' + weak.g,
        4,
        '🔭',
        `Our weakest area is ${{ GK: 'goalkeeper', DEF: 'defence', MID: 'midfield', ATT: 'attack' }[weak.g]}. I'd send a scout to find an upgrade.`,
        null,
        { label: 'Scout it', act: 'scoutNeed', id: weak.g },
      );
    groups
      .filter((x) => x.depth < { GK: 2, DEF: 6, MID: 5, ATT: 4 }[x.g])
      .forEach((x) =>
        add(
          'depth:' + x.g,
          3,
          '📉',
          `We're short of bodies in ${{ GK: 'goal', DEF: 'defence', MID: 'midfield', ATT: 'attack' }[x.g]} — only ${x.depth}. One injury and we're stretched.`,
          null,
          { label: 'Free agents', act: 'goFree', id: x.g },
        ),
      );
    // Contracts
    sq.filter((p) => p.contract <= s.year && p.ca >= teamAvg - 4 && !p.loan)
      .slice(0, 2)
      .forEach((p) =>
        add(
          'contract:' + p.id,
          5,
          '📝',
          `${W.short(p)}'s contract runs out this season. Renew him or he could leave for nothing.`,
          p.id,
          { label: 'Renew', act: 'renew', id: p.id },
        ),
      );
    // Deadwood: only once a few matchdays have been played, and never a player in the current XI
    const played = FM.Season.gamesPlayed(c.id),
      starters = new Set(
        W.pickXI(c.id, T)
          .xi.filter(Boolean)
          .map((p) => p.id),
      );
    sq.filter(
      (p) =>
        played >= 5 &&
        !starters.has(p.id) &&
        W.age(p) >= 29 &&
        !p.listed &&
        p.season.apps <= Math.max(1, FM.Season.gamesPlayed(p.clubId) * 0.15) &&
        p.wage > U.avg(sq, (q) => q.wage) * 1.2 &&
        !p.loan,
    )
      .slice(0, 2)
      .forEach((p) =>
        add(
          'dead:' + p.id,
          2,
          '💼',
          `${W.short(p)} earns ${U.money(p.wage)}/wk and barely plays. Selling would free up wages.`,
          p.id,
          { label: 'List him', act: 'listPlayer', id: p.id },
        ),
      );
    // Familiarity
    if ((T.fam ?? 60) < 45)
      add(
        'fam',
        3,
        '🧠',
        `The players are still learning the ${T.formation}. Familiarity is ${Math.round(T.fam)}% — sticking with it will help.`,
      );

    const ab = asst ? asst.ability : 10;
    const limit = 3 + Math.round((ab - 8) / 3);
    // Hide notes the manager has acted on or dismissed (they return after a few matchdays if still true)
    const done = s.user.adviceDone || {};
    const live = notes.filter(
      (n) => done[n.key] === undefined || s.day - done[n.key] >= A.SNOOZE || done[n.key] > s.day,
    );
    const out = live.sort((a, b) => b.pri - a.pri).slice(0, Math.max(2, limit));
    if (!out.length) out.push({ pri: 0, icon: '👍', text: 'The squad is in good shape. No concerns from me, boss.' });
    return { who: who(asst), role: 'Assistant Manager', personality: asst ? asst.personality : '', notes: out };
  };

  // Scout picks: the best graded targets from the reports
  A.scoutPicks = (n = 5) => FM.Scouting.recommendations(n).map(({ p, v }) => ({ p, v, scout: v.scout }));

  // ---------- Season preview ----------
  A.teamRating = (clubId) => {
    const c = S().clubs[clubId];
    const { xi } = W.pickXI(clubId, W.isUser(clubId) ? S().user.tactic : c.tactic);
    return U.avg(xi.filter(Boolean), (p) => p.ca);
  };
  A.preview = function () {
    const s = S(),
      c = W.userClub(),
      comp = s.comps[c.comp],
      asst = staff('assistant');
    const err = asst ? (20 - asst.ability) * 0.18 : 2;
    const rows = comp.clubs
      .map((id) => {
        const noise = ((U.hash(id + s.year) % 1000) / 1000 - 0.5) * 2 * err;
        return { id, r: A.teamRating(id) + S().clubs[id].rep * 0.06 + noise };
      })
      .sort((a, b) => b.r - a.r);
    // Predicted points from the same number the table is sorted by, so the order and the figure always agree
    const mean = U.avg(rows, (x) => x.r),
      games = comp.fixtures.length;
    rows.forEach((x) => (x.pts = Math.round(games * U.clamp(1.37 + (x.r - mean) * 0.09, 0.4, 2.5))));
    const pos = rows.findIndex((x) => x.id === c.id) + 1;
    const top = rows[0].r;
    // Bookmaker odds: softmax over team ratings, with a margin
    const ws = rows.map((x) => Math.exp((x.r - top) / 4));
    const tot = U.sum(ws);
    const FR = [
      [1, 5],
      [1, 4],
      [1, 3],
      [2, 5],
      [1, 2],
      [4, 7],
      [4, 6],
      [4, 5],
      [10, 11],
      [1, 1],
      [6, 5],
      [5, 4],
      [6, 4],
      [7, 4],
      [2, 1],
      [9, 4],
      [5, 2],
      [3, 1],
      [7, 2],
      [4, 1],
      [9, 2],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [10, 1],
      [12, 1],
      [14, 1],
      [16, 1],
      [20, 1],
      [25, 1],
      [33, 1],
      [40, 1],
      [50, 1],
      [66, 1],
      [100, 1],
      [250, 1],
    ];
    const fmt = (p) => {
      const o = 1 / (p * 1.12) - 1;
      const [a, b] = FR.reduce((best, f) => (Math.abs(f[0] / f[1] - o) < Math.abs(best[0] / best[1] - o) ? f : best));
      return a === b ? 'Evens' : `${a}/${b}`;
    };
    const odds = rows.slice(0, 5).map((x, i) => ({ id: x.id, odds: fmt(ws[i] / tot) }));
    const T = s.user.tactic;
    const { xi } = W.pickXI(c.id, T);
    const sq = W.squad(c.id);
    const star = sq.slice().sort((a, b) => b.ca - a.ca)[0];
    const kid = sq.filter((p) => W.age(p) <= 21).sort((a, b) => b.pa + b.ca - (a.pa + a.ca))[0];
    const signings = s.seasonLog.transfers
      .filter((t) => W.isUser(t.to))
      .map((t) => s.players[t.pid])
      .filter(Boolean);
    const verdict =
      pos <= 1
        ? 'We are favourites. Anything less than the title will be seen as failure.'
        : pos <= 3
          ? 'A title challenge is realistic if we stay fit.'
          : pos <= Math.ceil(rows.length / 2)
            ? 'Top half is the target — a good cup run would make it a season to remember.'
            : pos >= rows.length - 2
              ? 'It will be a fight. Every point against the teams around us is gold.'
              : 'A season of consolidation. Build, develop, and surprise people.';
    return { comp, rows, pos, odds, xi, formation: T.formation, star, kid, signings, verdict, who: who(asst) };
  };
})();

// ---------- Staff market: hire and fire ----------
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const St = (FM.Staff = {});
  const S = () => FM.S;
  // A vacant role is covered by a caretaker with low ability
  St.get = (key) =>
    S().staff[S().user.staff[key]] || {
      fn: 'Caretaker',
      ln: '(vacant)',
      role: Object.keys(D.STAFF_ROLES).find((r) => D.STAFF_ROLES[r].key === key),
      ability: 6,
      personality: 'Cautious',
      nat: W.userClub().nat,
      vacant: true,
    };
  // What each role's ability (1–20, 10 = an average professional) does, as multipliers and a line for the staff
  // screen. Every number here is used somewhere in the game.
  const pc = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))}%`;
  St.IMPACT = {
    assistant: (a) => ({
      fam: 1 + (a - 10) * 0.04,
      text: `Tactics bed in ${pc((a - 10) * 0.04)} faster · sharper advice`,
    }),
    coach: (a) => ({
      dev: (a - 10) * 0.12,
      learn: 1 + (a - 10) * 0.05,
      text: `Player development ${pc((a - 10) * 0.011)} · new positions learned ${pc((a - 10) * 0.05)} faster`,
    }),
    analyst: (a) => ({
      sp: 1 + (a - 10) * 0.012,
      text: `Set-piece chances ${pc((a - 10) * 0.012)} · opposition reports and bargains`,
    }),
    physio: (a) => ({
      risk: 1 - (a - 10) * 0.012,
      layoff: 1 - (a - 10) * 0.03,
      rec: (a - 10) * 0.5,
      text: `Injury risk ${pc(-(a - 10) * 0.012)} · layoffs ${pc(-(a - 10) * 0.03)} · recovery ${(a - 10) * 0.5 >= 0 ? '+' : '−'}${Math.abs((a - 10) * 0.5)} fitness a day`,
    }),
    director: (a) => ({
      buy: 1 - (a - 10) * 0.008,
      sell: 1 + (a - 10) * 0.01,
      text: `Fees and wages you pay ${pc(-(a - 10) * 0.008)} · bids for your players ${pc((a - 10) * 0.01)}`,
    }),
    scout: () => ({ text: 'Finds and assesses players; better in the regions he knows' }),
  };
  St.impact = (key) => St.IMPACT[key](W.staffAbility(key));
  St.compensation = (st) => U.roundMoney(st.wage * 8 * Math.max(1, st.contract - S().year + 1));
  St.hire = function (id) {
    const s = S(),
      st = s.staff[id],
      c = W.userClub();
    if (!st || !s.staffPool.includes(id)) return { ok: false, msg: 'No longer available.' };
    const key = D.STAFF_ROLES[st.role].key;
    const fee = U.roundMoney(st.wage * 4);
    if (c.balance < fee) return { ok: false, msg: 'Not enough money for the signing-on fee.' };
    if (key === 'scout') {
      if (s.user.scouts.length >= 5) return { ok: false, msg: 'You already employ 5 scouts. Release one first.' };
      s.user.scouts.push(id);
    } else {
      const old = s.user.staff[key] && s.staff[s.user.staff[key]];
      if (old) {
        c.balance -= St.compensation(old);
        delete s.staff[old.id];
      }
      s.user.staff[key] = id;
    }
    c.balance -= fee;
    st.contract = s.year + 2;
    s.staffPool = s.staffPool.filter((x) => x !== id);
    FM.News.add({
      type: 'club',
      title: `${st.fn} ${st.ln} appointed ${st.role}`,
      body: `${D.NATIONS[st.nat].flag} ${st.personality}, ability ${st.ability}/20. ${D.STAFF_ROLES[st.role].effect}.`,
      clubId: c.id,
    });
    return { ok: true, msg: `${st.fn} ${st.ln} joins as ${st.role}. Signing-on fee ${U.money(fee)}.` };
  };
  St.fire = function (id) {
    const s = S(),
      st = s.staff[id],
      c = W.userClub();
    if (!st) return { ok: false, msg: 'Unknown staff member.' };
    const key = D.STAFF_ROLES[st.role].key;
    if (key === 'scout') {
      if (s.user.scouts.length <= 1) return { ok: false, msg: 'You need at least one scout.' };
      s.user.scouts = s.user.scouts.filter((x) => x !== id);
      s.user.assignments = s.user.assignments.filter((a) => a.scout !== id);
    } else s.user.staff[key] = null;
    const comp = St.compensation(st);
    c.balance -= comp;
    delete s.staff[id];
    return {
      ok: true,
      msg: `${st.fn} ${st.ln} released. Compensation: ${U.money(comp)}.${key !== 'scout' ? ' A caretaker covers the role until you hire.' : ''}`,
    };
  };
})();
