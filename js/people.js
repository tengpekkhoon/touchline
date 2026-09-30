// People management: one-to-one player talks, promises that are tracked and judged, meetings players
// ask for, board meetings (requests, mid-season review, ultimatums) and coaching badge courses.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const Pe = (FM.People = {});
  const S = () => FM.S;
  const P = (id) => FM.S.players[id];
  const u = () => FM.S.user;
  const recentForm = (p, n = 3) => (p.form.length ? U.avg(p.form.slice(-n)) : 6.5);

  // ---------- Promises ----------
  Pe.PROMISE = {
    minutes: { label: 'More minutes', days: 10, desc: (x) => `${x.target - x.base} appearances within ${x.days} days` },
    contract: { label: 'A new contract', days: 9, desc: (x) => `New contract within ${x.days} days` },
    noSell: { label: 'Not to be sold', days: 99, desc: () => 'Not sold or loaned out this window' },
    letGo: {
      label: 'Can leave for the right offer',
      days: 99,
      desc: () => 'Accept a fair bid (≥ 90% of value) this season',
    },
    debut: { label: 'A first-team debut', days: 10, desc: (x) => `Debut within ${x.days} days` },
    status: {
      label: 'Squad status',
      days: 999,
      desc: (x) => `${D.STATUS[x.status].label} — about ${Math.round(D.STATUS[x.status].share * 100)}% of matches`,
    },
  };
  Pe.promise = function (p, type, extra = {}) {
    const s = S(),
      list = (u().promises = u().promises || []);
    const old = list.find((x) => x.pid === p.id && x.type === type && x.state === 'open');
    if (old) return old;
    const days = Pe.PROMISE[type].days;
    const x = {
      id: FM.nextId('pr'),
      pid: p.id,
      type,
      state: 'open',
      day: s.day,
      year: s.year,
      days,
      due: s.day + days,
      base: p.season.apps,
      target: p.season.apps + (type === 'minutes' ? 4 : 1),
      contract: p.contract,
      fromRound: FM.Season.gamesPlayed(p.clubId),
      ...extra,
    };
    list.push(x);
    return x;
  };
  Pe.openPromises = (pid) => (u().promises || []).filter((x) => x.state === 'open' && (!pid || x.pid === pid));
  function settle(x, kept, why) {
    const p = P(x.pid);
    x.state = kept === null ? 'void' : kept ? 'kept' : 'broken';
    x.closed = S().day;
    if (!p || kept === null) return;
    const c = W.userClub();
    if (kept) {
      p.morale = Math.min(100, p.morale + 10);
      u().trust = Math.min(100, (u().trust ?? 60) + 3);
      FM.News.add({
        type: 'dressing',
        title: `${W.name(p)}: "The manager kept his word"`,
        body: `${Pe.PROMISE[x.type].label} — promise kept. ${why || ''} Morale up; the dressing room notices.`,
        pid: p.id,
        clubId: c.id,
        quiet: true,
      });
    } else {
      p.morale = Math.max(0, p.morale - (W.hasTrait(p, 'Loyal') ? 15 : 25));
      u().trust = Math.max(0, (u().trust ?? 60) - 8);
      if (p.hid.amb >= 12 || W.hasTrait(p, 'Mercenary')) p.wantsOut = true;
      W.squad(c.id)
        .filter((q) => q !== p && (W.hasTrait(q, 'Leader') || q.nat === p.nat))
        .forEach((q) => (q.morale = Math.max(0, q.morale - 3)));
      FM.News.add({
        type: 'dressing',
        title: `${W.name(p)} feels betrayed`,
        body: `You promised him ${Pe.PROMISE[x.type].label.toLowerCase()}. ${why || ''}${p.wantsOut ? ' He wants to leave.' : ''} Teammates have taken note — your word counts for less now.`,
        pid: p.id,
        clubId: c.id,
      });
    }
  }
  Pe.evalPromises = function (seasonEnd = false) {
    const s = S(),
      c = W.userClub();
    if (!c) return; // out of work: promises were voided when the job ended
    Pe.openPromises().forEach((x) => {
      const p = P(x.pid);
      if (!p || p.retired) return settle(x, null);
      const gone = p.clubId !== c.id || (p.loan && p.loan.from === c.id);
      if (x.type === 'letGo') {
        if (gone) settle(x, true, 'He got his move.');
        else if (seasonEnd) settle(x, null);
        return;
      }
      if (gone) {
        if (x.clause) return settle(x, null);
        return settle(x, x.type === 'noSell' ? false : null, x.type === 'noSell' ? 'He was sold anyway.' : '');
      }
      const due = seasonEnd || (x.year === s.year && s.day >= x.due);
      if (x.type === 'minutes' || x.type === 'debut') {
        if (p.season.apps >= x.target) settle(x, true);
        else if (due) settle(x, false, `He has played ${p.season.apps - x.base} time(s) since.`);
      } else if (x.type === 'contract') {
        if (p.contract > x.contract) settle(x, true);
        else if (due) settle(x, false, 'No new deal was offered.');
      } else if (x.type === 'noSell') {
        // Kept once a transfer window has opened and closed with him still here
        if (FM.Season.windowOpen()) x.sawWindow = true;
        else if (x.sawWindow || seasonEnd) settle(x, true, 'The window closed and he is still here.');
      } else if (x.type === 'status' && seasonEnd) {
        const rounds = s.comps[c.comp].fixtures.length;
        const games = Math.max(1, rounds - (x.year === s.year ? x.fromRound || 0 : 0));
        if (games < 6) return; // signed too late in the season to judge — carried over
        const share = (p.season.lapps || 0) / games;
        settle(x, share >= D.STATUS[x.status].share * 0.75, `He played ${Math.round(share * 100)}% of league games.`);
      }
    });
  };
  Pe.onBidRejected = function (p, fee) {
    const x = Pe.openPromises(p.id).find((y) => y.type === 'letGo');
    if (!x || fee < p.value * 0.9) return false;
    settle(x, false, `You turned down ${U.money(fee)}.`);
    return true;
  };
  Pe.onClause = (p) => Pe.openPromises(p.id).forEach((x) => (x.clause = true));
  Pe.onRenewed = (p) =>
    Pe.openPromises(p.id)
      .filter((x) => x.type === 'contract')
      .forEach((x) => settle(x, true));

  // ---------- One-to-one talks ----------
  Pe.TALKS = {
    praise: { label: 'Praise his form', icon: '👏' },
    criticise: { label: 'Criticise his form', icon: '☝️' },
    minutes: { label: 'Promise more minutes', icon: '⏱️' },
    contract: { label: 'Promise a new contract', icon: '✍️' },
    noSell: { label: "Promise he won't be sold", icon: '🔒' },
    letGo: { label: 'Tell him he can leave', icon: '🚪' },
    debut: { label: 'Promise a first-team debut', icon: '🌱' },
    plans: { label: "He's part of my plans", icon: '🧩' },
  };
  Pe.canTalk = (p) => {
    const t = (u().talks || {})[p.id];
    return !t || t.year !== S().year || S().day - t.day >= 3;
  };
  Pe.talkOptions = function (p) {
    const open = Pe.openPromises(p.id).map((x) => x.type);
    const xi = W.pickXI(W.userClub().id, u().tactic).xi.some((q) => q && q.id === p.id);
    return Object.keys(Pe.TALKS).filter((k) => {
      if (open.includes(k)) return false;
      if (k === 'debut') return W.age(p) <= 20 && p.career.apps === 0;
      if (k === 'minutes') return !xi;
      if (k === 'contract') return p.contract <= S().year + 1;
      if (k === 'noSell') return FM.Season.windowOpen() || p.listed;
      return true;
    });
  };
  // Does he believe you? Low trust, a history of broken promises, or a volatile personality makes promises land softly
  Pe.believes = (p) => (u().trust ?? 60) >= 35 || W.hasTrait(p, 'Loyal') || Math.random() < 0.35;
  Pe.talk = function (pid, topic) {
    const s = S(),
      p = P(pid),
      club = W.userClub();
    if (!Pe.canTalk(p)) return { ok: false, msg: `You spoke to ${W.short(p)} recently. Give it a few days.` };
    (u().talks = u().talks || {})[pid] = { day: s.day, year: s.year };
    const f = recentForm(p),
      prof = p.hid.prof,
      volatile = p.hid.temp <= 6 || W.hasTrait(p, 'Temperamental');
    let d = 0,
      msg = '';
    if (topic === 'praise') {
      if (f >= 6.9) {
        d = 8 + (W.hasTrait(p, 'Media Friendly') ? 2 : 0);
        msg = `"Thanks, boss. I feel sharp at the moment."`;
      } else if (f >= 6.3) {
        d = 3;
        msg = `"Appreciate it. I know there's more in me."`;
      } else {
        d = prof >= 14 ? 0 : -2;
        msg = `"With respect, I haven't played well." He looks unconvinced.`;
      }
    } else if (topic === 'criticise') {
      if (f < 6.4) {
        if (volatile) {
          d = -12;
          msg = `He storms out. "You always pick on me."`;
          if (p.hid.amb >= 12) p.wantsOut = true;
        } else if (prof >= 13 || W.hasTrait(p, 'Leader')) {
          d = 6;
          msg = `"You're right. I'll put it right on Saturday."`;
        } else {
          d = 1;
          msg = `He nods and says nothing.`;
        }
      } else {
        d = -10;
        msg = `"What more do you want from me?" He thinks the criticism is unfair.`;
      }
    } else if (topic === 'plans') {
      const xi = W.pickXI(club.id, u().tactic).xi.some((q) => q && q.id === p.id);
      d = xi ? 4 : p.season.apps < 3 && Sea().baseRound() > 6 ? -3 : 2;
      msg = xi
        ? `"Good to hear. I want to be here."`
        : d < 0
          ? `"Then why am I not playing?"`
          : `"I'll be ready when you need me."`;
    } else if (topic === 'letGo') {
      p.listed = true;
      d = p.hid.amb >= 13 || p.wantsOut || W.hasTrait(p, 'Mercenary') ? 8 : W.hasTrait(p, 'Loyal') ? -15 : -4;
      msg =
        d > 0
          ? `"Thank you for being honest. I think a move is right for me."`
          : `"I didn't think my time here was over." He's hurt.`;
      Pe.promise(p, 'letGo');
    } else {
      const believed = Pe.believes(p);
      const x = Pe.promise(p, topic);
      d = believed ? (topic === 'minutes' ? 10 : topic === 'debut' ? 12 : 8) : 2;
      msg = believed
        ? `"I'll hold you to that." ${Pe.PROMISE[topic].desc(x)}.`
        : `"I've heard that before." He doesn't seem to believe you — but the promise stands: ${Pe.PROMISE[topic].desc(x).toLowerCase()}.`;
      if (topic === 'minutes' || topic === 'noSell') p.flagMinutes = false;
    }
    p.morale = U.clamp(p.morale + d, 0, 100);
    return { ok: true, msg, d };
  };
  const Sea = () => FM.Season;

  // Player-initiated meetings arrive in the feed with choices
  Pe.requestMeeting = function (p, why) {
    const c = W.userClub();
    if (S().news.some((n) => n.type === 'meeting' && !n.resolved && n.pid === p.id)) return;
    const opts =
      why === 'minutes'
        ? [
            ['minutes', 'Promise more minutes'],
            ['fight', 'Fight for your place'],
            ['letGo', "We'll listen to offers"],
          ]
        : why === 'raise'
          ? [
              ['contract', 'Promise a new contract'],
              ['later', 'Not now'],
              ['plans', "You're part of my plans"],
            ]
          : [
              ['plans', "You're part of my plans"],
              ['fight', 'Keep working hard'],
            ];
    const body =
      why === 'minutes'
        ? `${p.personality === 'Mercenary' ? 'His agent has been making calls.' : 'He wants to know where he stands.'} Morale is ${W.moraleLabel(p.morale)[0].toLowerCase()}.`
        : why === 'raise'
          ? `He's been one of our best players and thinks his ${U.money(p.wage)}/wk contract doesn't reflect it.`
          : 'He has something on his mind.';
    FM.News.add({
      type: 'meeting',
      title: `${W.name(p)} asks for a meeting`,
      body,
      pid: p.id,
      clubId: c.id,
      why,
      choices: opts.map(([k, label]) => ({ k, label })),
    });
  };
  Pe.resolveMeeting = function (n, i) {
    if (n.resolved) return;
    const p = P(n.pid),
      ch = n.choices[i];
    n.resolved = ch.label;
    if (!p || !W.isUser(p.clubId)) {
      n.reply = 'He has since left the club.';
      return;
    }
    if (Pe.TALKS[ch.k]) {
      (u().talks = u().talks || {})[p.id] = null;
      const r = Pe.talk(p.id, ch.k);
      n.reply = r.msg;
      return;
    }
    if (ch.k === 'fight') {
      const ok = p.hid.prof >= 12 || W.hasTrait(p, 'Leader');
      p.morale = U.clamp(p.morale + (ok ? 6 : -8), 0, 100);
      n.reply = ok
        ? '"Fair enough. I\'ll make it impossible to leave me out."'
        : '"I\'ve worked hard enough." He leaves the meeting frustrated.';
      if (!ok && p.hid.amb >= 14) p.wantsOut = true;
    } else if (ch.k === 'later') {
      p.morale = U.clamp(p.morale - (p.hid.amb >= 13 ? 12 : 5), 0, 100);
      n.reply = '"I see." He is disappointed.';
    }
  };

  // ---------- Board ----------
  Pe.boardMeetingsLeft = () => {
    const b = u().board;
    if (!b || b.year !== S().year) u().board = { year: S().year, meetings: 0 };
    return Math.max(0, 2 - u().board.meetings);
  };
  Pe.BOARD = {
    funds: { label: 'Ask for more transfer funds', icon: '💰' },
    facility: { label: 'Ask the owners to fund a facility', icon: '🏗️' },
    patience: { label: 'Ask for patience', icon: '⏳' },
    youth: { label: 'Pitch a youth-first project', icon: '🌱' },
  };
  Pe.boardRequest = function (topic, facKey) {
    const c = W.userClub(),
      s = S();
    if (!Pe.boardMeetingsLeft()) return { ok: false, msg: 'The chairman has no more time for you this season.' };
    u().board.meetings++;
    const conf = c.boardConf,
      rich = c.identity === 'oil' ? 1.8 : c.identity === 'giant' ? 1.3 : c.identity === 'fan' ? 0.7 : 1;
    let msg;
    if (topic === 'funds') {
      const R = Sea().revenuePotential(c);
      if (conf >= 55 && c.balance > c.budget * 1.2) {
        const add = U.roundMoney(Math.min(c.balance * 0.2, R * 0.12 * rich) * (conf >= 75 ? 1.3 : 1));
        c.budget += add;
        msg = `✅ Approved. The board release an extra ${U.money(add)} for transfers.`;
      } else if (conf >= 45 && c.identity === 'oil') {
        const add = U.roundMoney(R * 0.1);
        c.budget += add;
        c.balance += add;
        msg = `✅ The owners inject ${U.money(add)} of fresh money.`;
      } else {
        if (conf < 45) c.boardConf = Math.max(0, conf - 3);
        msg = `❌ Refused. "${c.balance < c.budget ? "The money simply isn't there." : 'Earn our trust first.'}"`;
      }
    } else if (topic === 'facility') {
      const k = facKey || 'training',
        lvl = c.facilities[k];
      if (c.building) msg = '❌ "One project at a time — finish the current build first."';
      else if (lvl >= 5) msg = '❌ That facility is already world-class.';
      else if (conf >= 65 && (rich >= 1 || conf >= 80)) {
        c.building = { k, weeks: Sea().facWeeks(k, lvl) };
        msg = `✅ The owners will fund the ${Sea().FAC[k].name} upgrade (${U.money(Sea().facCost(k, lvl))}). Work starts now.`;
      } else msg = `❌ "We can't justify that spending ${conf < 65 ? 'with results as they are' : 'right now'}."`;
    } else if (topic === 'patience') {
      if (conf < 45 && s.user.rep >= 55 && !u().board.patience) {
        c.boardConf = Math.min(100, conf + 10);
        u().board.patience = true;
        msg = '✅ "We believe in the project. You have our backing — for now."';
      } else if (conf >= 45) {
        c.boardConf = Math.max(0, conf - 2);
        msg = '🤨 "Patience? Nobody is questioning you. Yet."';
      } else {
        c.boardConf = Math.max(0, conf - 4);
        msg = '❌ "Results will decide your future, not speeches."';
      }
    } else if (topic === 'youth') {
      const grads = W.squad(c.id).filter((p) => p.youth === c.id && p.season.apps >= 3).length;
      if (['youth', 'fan', 'selling'].includes(c.identity) || grads >= 3) {
        c.boardConf = Math.min(100, conf + 4);
        c.fanMood = Math.min(100, c.fanMood + 3);
        if (c.facilities.academy < 5 && !c.building && conf >= 55) {
          c.building = { k: 'academy', weeks: Sea().facWeeks('academy', c.facilities.academy) };
          msg = '✅ The board love it — and will fund an academy upgrade.';
        } else msg = '✅ The board love the vision. Confidence up.';
      } else {
        msg = '🤨 "Nice idea. But this club needs results now."';
      }
    }
    FM.News.add({
      type: 'board',
      title: `Board meeting: ${Pe.BOARD[topic].label.toLowerCase()}`,
      body: msg,
      clubId: c.id,
    });
    return { ok: true, msg };
  };
  // Mid-season review; a struggling manager gets a 5-game ultimatum
  Pe.midSeason = function () {
    const s = S(),
      c = W.userClub();
    u().board = u().board && u().board.year === s.year ? u().board : { year: s.year, meetings: 0 };
    if (u().board.review) return;
    u().board.review = true;
    const pos = W.position(c.id),
      exp = Sea().expectedPos(c),
      conf = Math.round(c.boardConf);
    const firstSeason = (u().joinedClubYear || u().joined) === s.year;
    let body = `Halfway verdict: ${U.ordinal(pos)} (expected ${U.ordinal(exp)}). Board confidence ${conf}%.`;
    if (conf < 35 && !firstSeason) {
      const row = s.comps[c.comp].table[c.id];
      u().board.ultimatum = { from: row.p, pts: row.pts, games: 5, need: s.rules.win * 2 + 1, done: false };
      body += `\n\nULTIMATUM: take at least ${u().board.ultimatum.need} points from the next 5 league games — or you're gone.`;
    } else
      body +=
        conf >= 70
          ? '\n\nThe board are delighted. Keep it up.'
          : conf >= 50
            ? '\n\nSteady progress. The board expect it to continue.'
            : '\n\nThe board want to see improvement in the second half.';
    FM.News.add({ type: 'board', title: 'Mid-season board review', body, clubId: c.id, big: conf < 35 });
  };
  Pe.ultimatum = () => {
    const b = u().board;
    return b && b.year === S().year && b.ultimatum && !b.ultimatum.done ? b.ultimatum : null;
  };
  Pe.ultimatumFailed = function () {
    const x = Pe.ultimatum();
    if (!x) return false;
    const c = W.userClub(),
      row = S().comps[c.comp].table[c.id];
    const played = row.p - x.from,
      got = row.pts - x.pts;
    if (got >= x.need) {
      x.done = true;
      c.boardConf = Math.min(100, c.boardConf + 12);
      FM.News.add({
        type: 'board',
        title: 'Ultimatum met',
        body: `${got} points from ${played} games. The board are satisfied — for now.`,
        clubId: c.id,
      });
      return false;
    }
    if (played >= x.games || got + (x.games - played) * S().rules.win < x.need) {
      x.done = true;
      return true;
    }
    return false;
  };

  // Reminders (mid-season and near the end) listing players whose contracts expire this season
  Pe.contractReminder = function (round) {
    const s = S(),
      c = W.userClub(),
      n = s.comps[c.comp].fixtures.length;
    const due = [10, n - 5, n - 2].filter((r) => r >= 0);
    const r = (u().contractRem =
      u().contractRem && u().contractRem.year === s.year ? u().contractRem : { year: s.year, done: [] });
    const at = due.find((d) => round >= d && !r.done.includes(d));
    if (at == null) return;
    r.done.push(...due.filter((d) => d <= round));
    const exp = W.squad(c.id)
      .filter((p) => !p.loan && p.contract <= s.year)
      .sort((a, b) => b.ca - a.ca);
    if (!exp.length) return;
    const left = n - round;
    FM.News.add({
      type: 'contracts',
      title: `${exp.length} contract${exp.length === 1 ? '' : 's'} expire${exp.length === 1 ? 's' : ''} this season`,
      body: `${left} league games left. Anyone you don't re-sign leaves on a free in the summer. Tap a player to open talks.`,
      pids: exp.map((p) => p.id),
      clubId: c.id,
    });
  };

  // ---------- Coaching badges ----------
  Pe.nextBadge = () => D.BADGES[D.BADGES.indexOf(u().badges) + 1] || null;
  Pe.courseReq = (b) => (b === 'Continental A' ? 20 : b === 'Continental Pro' ? 60 : 0);
  Pe.startCourse = function () {
    const b = Pe.nextBadge(),
      c = W.userClub();
    if (!b) return { ok: false, msg: 'You already hold the top licence.' };
    if (!c) return { ok: false, msg: 'Courses are paid for by your club — take a job first.' };
    if (u().course) return { ok: false, msg: 'You are already on a course.' };
    const spec = D.BADGE_COURSE[b],
      games = u().stats.games + (u().ntStats ? u().ntStats.games : 0);
    if (games < Pe.courseReq(b))
      return { ok: false, msg: `The ${b} course needs ${Pe.courseReq(b)} games of experience (you have ${games}).` };
    if (c.balance < spec.cost) return { ok: false, msg: "The club can't cover the course fee." };
    c.balance -= spec.cost;
    u().course = { badge: b, until: S().day + spec.days, year: S().year, days: spec.days };
    return {
      ok: true,
      msg: `Enrolled on the ${b} licence. ${spec.days} days of study (${U.money(spec.cost)}, paid by the club).`,
    };
  };
  Pe.courseTick = function () {
    const x = u().course;
    if (!x) return;
    if (x.year !== S().year) x.until -= S().calendar.length; // season rolled over mid-course
    x.year = S().year;
    if (S().day >= x.until) {
      u().badges = x.badge;
      u().course = null;
      u().rep = Math.min(99, u().rep + D.BADGE_COURSE[x.badge].rep);
      FM.Stories.share({
        kicker: 'COACHING',
        title: `${u().name} earns the ${x.badge} licence`,
        sub: 'New doors open — bigger clubs and national teams now take notice.',
        big: '🎓',
        clubId: (W.userClub() || {}).id,
      });
    }
  };
  // Better-qualified managers drill tactics faster
  Pe.badgeBonus = () => 1 + Math.max(0, D.BADGES.indexOf(u().badges) - 1) * 0.12;

  // ---------- Daily / seasonal hooks ----------
  Pe.tick = function () {
    const s = S(),
      cal = FM.Season.today();
    if (!s.user) return;
    Pe.courseTick();
    if (!W.employed()) return; // everything below is about your club
    Pe.evalPromises(false);
    if (cal && cal.type === 'league' && Sea().baseRound() >= 10) Pe.midSeason();
    if (cal && cal.type === 'league') Pe.contractReminder(Sea().gamesPlayed(W.userClub().id));
    // Star performers on modest wages ask for a raise
    if (cal && cal.type === 'league' && Math.random() < 0.08) {
      const c = W.userClub();
      const cand = W.squad(c.id).filter(
        (p) =>
          !p.loan &&
          W.age(p) <= 29 &&
          p.form.length >= 4 &&
          recentForm(p, 5) >= 7.1 &&
          p.wage < W.wageFor(p) * 0.7 &&
          !Pe.openPromises(p.id).some((x) => x.type === 'contract') &&
          !p.askedRaise,
      );
      if (cand.length) {
        const p = U.pick(cand);
        p.askedRaise = s.year;
        Pe.requestMeeting(p, 'raise');
      }
    }
  };
  Pe.seasonEnd = function () {
    if (S().user) Pe.evalPromises(true);
  };
  Pe.newSeason = function () {
    const s = S();
    if (!s.user) return;
    u().board = { year: s.year, meetings: 0 };
    u().promises = (u().promises || []).filter((x) => x.state === 'open' || x.year >= s.year - 1).slice(-40);
    Object.values(s.players).forEach((p) => {
      if (p.askedRaise && p.askedRaise < s.year) delete p.askedRaise;
    });
  };
})();
