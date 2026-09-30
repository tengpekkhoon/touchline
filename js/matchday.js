// Matchday leadership and set pieces: captain choice, penalty / free-kick / corner takers,
// the pre-match team talk, and the weekly matchday digest in the feed.
// Pure game logic (no DOM) so the headless season harness can load it.
(function () {
  const FM = window.FM,
    U = FM.U,
    W = FM.W;
  const Md = (FM.Matchday = {});
  const P = (id) => FM.S.players[id];

  // ---------- Captain ----------
  // Who should wear the armband: leadership first, then experience and standing in the squad
  Md.captainScore = (p) =>
    p.hid.lead +
    (W.hasTrait(p, 'Leader') ? 3 : 0) +
    U.clamp(W.age(p) - 21, 0, 8) * 0.25 +
    Math.min(3, ((W.spell(p) && W.spell(p).apps) || 0) / 40) +
    p.ca / 40;
  Md.leadWord = (p) =>
    p.hid.lead >= 16 ? 'Inspirational' : p.hid.lead >= 13 ? 'Strong leader' : p.hid.lead >= 9 ? 'Steady' : 'Quiet';
  // A club's captain: the manager's pick while he's at the club, otherwise the natural choice. At your club the
  // squad's choice sticks (tactic.captAuto) until he leaves or you let the squad choose again, so the armband
  // doesn't drift from week to week as form and ability change.
  Md.captainOf = function (clubId) {
    const T = W.isUser(clubId) ? FM.S.user.tactic : null;
    const at = (id) => {
      const p = id && P(id);
      return p && p.clubId === clubId && !p.retired ? p : null;
    };
    const mine = T && (at(T.capt) || at(T.captAuto));
    if (mine) return mine;
    const sq = W.squad(clubId)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 16);
    const natural = sq.sort((a, b) => Md.captainScore(b) - Md.captainScore(a))[0] || null;
    if (T) T.captAuto = natural && natural.id;
    return natural;
  };
  // The armband on the pitch: the club captain if he plays, otherwise the best leader on the field
  Md.armband = function (sd, onPitch) {
    const club = sd.club.sim === 'nation' ? null : Md.captainOf(sd.club.id);
    const on = onPitch.map((o) => o.p);
    if (club && on.includes(club)) return club;
    return on.slice().sort((a, b) => Md.captainScore(b) - Md.captainScore(a))[0] || null;
  };
  // Team boost from the man wearing the armband: about ±1–3%
  Md.capBoost = (p) => (p ? 1 + (p.hid.lead - 10) * 0.002 + (W.hasTrait(p, 'Leader') ? 0.01 : 0) : 1);
  // How much a defeat stings the dressing room with this captain (1 = full, 0.5 = halved)
  Md.calm = (p) => (!p ? 1 : W.hasTrait(p, 'Leader') ? 0.5 : p.hid.lead >= 14 ? 0.75 : 1);

  // Appoint the user's captain. Returns a short message for a toast.
  Md.setCaptain = function (pid) {
    const S = FM.S,
      T = S.user.tactic,
      club = W.userClub();
    const old = Md.captainOf(club.id),
      p = P(pid);
    if (!p || old === p) {
      T.capt = pid;
      return `${W.short(p)} keeps the armband`;
    }
    T.capt = pid;
    p.morale = Math.min(100, p.morale + 8);
    let msg = `${W.name(p)} is your new captain`;
    // An explicit captain who loses the armband takes it personally; an automatic one less so
    if (old && old.clubId === club.id) {
      const hurt =
        (T.captSet ? 10 : 5) *
        (W.hasTrait(old, 'Loyal') || old.hid.prof >= 15 ? 0.5 : 1) *
        (old.hid.temp <= 6 ? 1.4 : 1);
      old.morale = Math.max(0, old.morale - Math.round(hurt));
      msg += ` — ${W.short(old)} ${hurt >= 8 ? 'is unhappy to lose it' : 'accepts the decision'}`;
    }
    // Changing captain again within a few weeks unsettles everyone
    if (T.captSet && T.captDay != null && T.captYear === S.year && S.day - T.captDay < 6) {
      W.squad(club.id).forEach((q) => {
        if (q !== p) q.morale = Math.max(0, q.morale - 2);
      });
      msg += '. Another change so soon unsettles the squad';
    }
    T.captSet = true;
    T.captDay = S.day;
    T.captYear = S.year;
    FM.News.add({
      type: 'dressing',
      title: `${W.name(p)} named club captain`,
      body: `${Md.leadWord(p)}${W.hasTrait(p, 'Leader') ? ', a natural leader' : ''}. ${old && old.clubId === club.id ? `He takes the armband from ${W.name(old)}.` : ''}`.trim(),
      pid: p.id,
      clubId: club.id,
      quiet: true,
    });
    return msg;
  };

  // ---------- Set-piece takers ----------
  Md.SP = {
    pen: {
      label: 'Penalties',
      icon: '🎯',
      score: (A) => (A.finishing * 1.2 + A.composure * 1.3 + A.technique * 0.5) / 3,
    },
    fk: {
      label: 'Free kicks',
      icon: '🌀',
      score: (A) => (A.technique * 1.3 + A.finishing * 0.8 + A.vision * 0.4 + A.composure * 0.5) / 3,
    },
    cor: { label: 'Corners', icon: '⛳', score: (A) => (A.passing * 1.1 + A.technique + A.vision * 0.9) / 3 },
  };
  Md.spScore = (p, k) => Md.SP[k].score(p.attrs);
  Md.bestTaker = (players, k) =>
    players.filter((p) => p.pos !== 'GK').sort((a, b) => Md.spScore(b, k) - Md.spScore(a, k))[0] || null;
  // The user's chosen taker (if picked), else the best candidate in the XI
  Md.takerFor = function (clubId, k, xi) {
    const T = W.isUser(clubId) ? FM.S.user.tactic : null;
    const id = T && T.sp && T.sp[k];
    const chosen = id && xi.find((p) => p && p.id === id);
    return { p: chosen || Md.bestTaker(xi.filter(Boolean), k), chosen: !!chosen, set: !!id };
  };
  // In the engine: the side's taker if he is on the pitch, else the best one left out there
  Md.taker = function (sd, k, on) {
    const id = sd.tactic.sp && sd.tactic.sp[k];
    const c = id && on.find((o) => o.p.id === id);
    if (c) return c;
    const best = Md.bestTaker(
      on.map((o) => o.p),
      k,
    );
    return best ? on.find((o) => o.p === best) : null;
  };

  // ---------- Pre-match team talk ----------
  Md.TALKS = {
    calm: { label: 'Keep it calm', desc: 'No pressure. Safe with nervous players' },
    focus: { label: 'Stay focused', desc: 'No complacency. Best when we are favourites' },
    free: { label: 'Go and enjoy it', desc: 'Nothing to lose. Best as underdogs' },
    fire: { label: 'Fire them up', desc: 'For derbies and big nights. Hot-heads may overdo it' },
  };
  // Context the talk lands in: our chance of winning and how big the occasion is
  Md.talkContext = function (fx) {
    const S = FM.S,
      home = W.isMine(fx.h),
      me = FM.clubOf(home ? fx.h : fx.a),
      opp = FM.clubOf(home ? fx.a : fx.h);
    const str = (t) => U.avg(W.pickXI(t.id, W.isUser(t.id) ? S.user.tactic : t.tactic).xi.filter(Boolean), (p) => p.ca);
    const pw = U.clamp(0.36 + (str(me) - str(opp)) / 25 + (fx.neutral ? 0 : home ? 0.06 : -0.04), 0.08, 0.85);
    const derby = me.rival === opp.id;
    const comp = S.comps[fx.comp];
    const big = derby || !!fx.ko || !!fx.first || !!fx.intl || opp.rep >= 80 || (comp && comp.type === 'continental');
    return { pw, fav: pw >= 0.5, under: pw < 0.33, big, derby };
  };
  Md.suggestTalk = (ctx) => (ctx.derby ? 'fire' : ctx.under ? 'free' : ctx.fav ? 'focus' : ctx.big ? 'fire' : 'calm');
  // Per-player reaction to a talk (morale points)
  Md.talkReaction = function (p, kind, ctx) {
    const volatile = p.hid.temp <= 6 || W.hasTrait(p, 'Temperamental');
    const nervy = p.hid.big <= 7 && !W.hasTrait(p, 'Big Game Player');
    let d = 0;
    if (kind === 'calm') d = nervy || volatile ? 3 : ctx.big ? -1 : 1;
    if (kind === 'focus') d = (ctx.fav ? 3 : ctx.under ? -2 : 1) + (p.hid.prof >= 14 ? 1 : 0);
    if (kind === 'free') d = (ctx.under ? 4 : ctx.fav ? -3 : 1) + (nervy ? 1 : 0);
    if (kind === 'fire')
      d =
        (ctx.big ? 4 : ctx.fav ? -1 : 1) +
        (volatile ? (ctx.big ? -2 : -3) : 0) +
        (W.hasTrait(p, 'Leader') ? 1 : 0) +
        (nervy && ctx.big ? -2 : 0);
    return d;
  };
  // Apply the talk to a live FM.Match (user side). Returns the dressing-room verdict.
  Md.applyTalk = function (m, kind, ctx) {
    const sd = m.sides.find((s) => s.user);
    if (!sd || !Md.TALKS[kind]) return null;
    const on = m.onPitch(sd),
      capt = Md.armband(sd, on),
      steady = capt && W.hasTrait(capt, 'Leader');
    let good = 0,
      bad = 0;
    on.forEach(({ p }) => {
      let d = Md.talkReaction(p, kind, ctx);
      if (d < 0 && steady) d = Math.ceil(d / 2); // a Leader captain keeps heads level
      p.morale = U.clamp(p.morale + d, 0, 100);
      sd.rating[p.id] += d * 0.02;
      d > 0 ? good++ : d < 0 ? bad++ : 0;
    });
    sd.mods.att += (good - bad) * 0.003;
    sd.mods.mid += (good - bad) * 0.003;
    if (kind === 'fire') sd.hot = 1.3; // more bookings
    const outcome = good >= 8 ? 'fired' : bad > good ? 'flat' : bad >= 3 ? 'mixed' : 'ok';
    const verdict = {
      fired: 'The players look right up for it.',
      flat: "That didn't land — a few heads have gone down.",
      mixed: 'A mixed reaction in the dressing room.',
      ok: 'The message gets through.',
    }[outcome];
    Md.recordTalk(kind, outcome);
    return `${Md.TALKS[kind].label}: ${verdict}${steady && bad ? ` ${W.short(capt)} settles the doubters.` : ''}`;
  };
  // Career record of pre-match talks (Manager tab): totals by outcome, and per talk how often it landed
  Md.recordTalk = function (kind, outcome) {
    const u = FM.S.user;
    if (!u) return;
    const t = (u.teamTalks = u.teamTalks || { n: 0, fired: 0, ok: 0, mixed: 0, flat: 0, kinds: {} });
    t.n++;
    t[outcome]++;
    const k = (t.kinds[kind] = t.kinds[kind] || { n: 0, good: 0 });
    k.n++;
    if (outcome === 'fired' || outcome === 'ok') k.good++;
  };

  // ---------- Weekly matchday digest ----------
  // Table order before the round, so the digest can show who moved
  Md.snapshot = function () {
    const c = FM.S.comps[W.userClub().comp];
    return { comp: c.id, order: W.sortedTable(c).map((r) => r.id) };
  };
  Md.digest = function (cal, snap) {
    const S = FM.S,
      club = W.userClub(),
      comp = S.comps[snap.comp];
    const today = comp && comp.fixtures && W.roundFixtures(comp, cal.round),
      round = comp ? W.roundOn(comp, cal.round) : -1;
    if (!comp || comp.id !== club.comp || !today) return;
    const fxs = today.filter((f) => f.res);
    if (!fxs.length) return;
    const table = W.sortedTable(comp),
      n = table.length;
    const pos = (id) => table.findIndex((r) => r.id === id) + 1;
    // Movement means nothing after the opening round (the table started alphabetical)
    const move = (id) => (round === 0 ? 0 : snap.order.indexOf(id) + 1 - pos(id));
    const mine = fxs.find((f) => f.h === club.id || f.a === club.id);
    // Headline moments of the round
    const notes = [];
    const big = fxs
      .slice()
      .sort(
        (a, b) =>
          Math.abs(b.res.hg - b.res.ag) - Math.abs(a.res.hg - a.res.ag) || b.res.hg + b.res.ag - (a.res.hg + a.res.ag),
      )[0];
    if (big && Math.abs(big.res.hg - big.res.ag) >= 3) {
      const w = big.res.hg > big.res.ag ? big.h : big.a,
        l = w === big.h ? big.a : big.h;
      notes.push(
        `💥 Biggest win: ${S.clubs[w].name} ${Math.max(big.res.hg, big.res.ag)}–${Math.min(big.res.hg, big.res.ag)} ${S.clubs[l].name}`,
      );
    }
    const cnt = {},
      ga = {};
    fxs.forEach((f) =>
      (f.res.goals || []).forEach((g) => {
        cnt[g.pid] = (cnt[g.pid] || 0) + 1;
        ga[g.pid] = (ga[g.pid] || 0) + 1;
        if (g.ast) ga[g.ast] = (ga[g.ast] || 0) + 1;
      }),
    );
    Object.entries(cnt)
      .filter(([, k]) => k >= 3)
      .forEach(
        ([pid, k]) =>
          P(pid) &&
          notes.push(
            `🎩 ${k === 3 ? 'Hat-trick' : k + ' goals'} for ${W.name(P(pid))} (${S.clubs[P(pid).clubId] ? S.clubs[P(pid).clubId].short : ''})`,
          ),
      );
    const star = Object.entries(ga).sort((a, b) => b[1] - a[1] || (cnt[b[0]] || 0) - (cnt[a[0]] || 0))[0];
    const upset = fxs.find((f) => {
      const hw = f.res.hg > f.res.ag,
        aw = f.res.ag > f.res.hg;
      if (!hw && !aw) return false;
      const w = S.clubs[hw ? f.h : f.a],
        l = S.clubs[hw ? f.a : f.h];
      return l.rep - w.rep >= 12 && pos(l.id) <= 4;
    });
    if (upset) {
      const hw = upset.res.hg > upset.res.ag;
      notes.push(`😮 Shock: ${S.clubs[hw ? upset.h : upset.a].name} beat ${S.clubs[hw ? upset.a : upset.h].name}`);
    }
    const leader = table[0];
    if (snap.order[0] !== leader.id && round > 0) notes.push(`👑 ${S.clubs[leader.id].name} go top`);
    // Golden boot race in this league
    const leaguePlayers = comp.clubs.flatMap((id) => W.squad(id));
    const scorer = leaguePlayers.filter((p) => p.season.goals > 0).sort((a, b) => b.season.goals - a.season.goals)[0];
    // Hot and cold: average of the last three ratings, among regulars with at least three games this season
    const last3 = (p) => U.avg(p.form.slice(-3));
    const regulars = leaguePlayers
      .filter((p) => p.season.apps >= 3 && p.form.length >= 3)
      .sort((a, b) => last3(b) - last3(a));
    const hot = regulars[0],
      cold = regulars.length > 1 ? regulars[regulars.length - 1] : null;
    const next = FM.Season.nextUserFixture();
    const rels = comp.rules.relegate ? comp.rules.relegate.n : 0;
    const my = table.find((r) => r.id === club.id);
    const gap = my && pos(club.id) > 1 ? table[0].pts - my.pts : my && table[1] ? my.pts - table[1].pts : 0;
    // Near the bottom: points clear of the drop zone (vs the first relegated place), or points from safety when in it
    const lastSafe = n - rels,
      inZone = !!rels && pos(club.id) > lastSafe;
    const safety =
      rels && my && pos(club.id) > lastSafe - 3 ? my.pts - table[inZone ? lastSafe - 1 : lastSafe].pts : null;
    FM.News.add({
      type: 'digest',
      clubId: club.id,
      title: `${comp.name} · Matchday ${round + 1} round-up`,
      data: {
        comp: comp.id,
        round,
        mine: mine && { h: mine.h, a: mine.a, hg: mine.res.hg, ag: mine.res.ag },
        pos: pos(club.id),
        pts: my ? my.pts : 0,
        move: move(club.id),
        gap,
        top: pos(club.id) === 1,
        safety,
        inZone,
        table: table.slice(0, 4).map((r) => [r.id, r.pts, move(r.id)]),
        results: fxs.map((f) => [f.h, f.a, f.res.hg, f.res.ag]),
        notes: notes.slice(0, 4),
        star: star && star[1] >= 2 && P(star[0]) ? [star[0], cnt[star[0]] || 0, star[1] - (cnt[star[0]] || 0)] : null,
        scorer: scorer ? [scorer.id, scorer.season.goals] : null,
        hot: hot ? [hot.id, Math.round(last3(hot) * 10) / 10] : null,
        cold: cold ? [cold.id, Math.round(last3(cold) * 10) / 10] : null,
        next: next && { h: next.h, a: next.a, round: next.round },
      },
    });
  };
})();
