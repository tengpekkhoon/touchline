// The world remembers: club records, all-time head-to-heads, rivalries that grow out of what happens
// on the pitch, player of the month, and injury histories. State lives in S.records (created lazily)
// and in two optional player fields (honours, injHist). No DOM here: the simulation worker loads it.
(function () {
  const FM = window.FM, U = FM.U, W = FM.W;
  const R = (FM.Records = {});
  const S = () => FM.S;
  const MONTHS = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
  R.MONTHS = MONTHS;
  // The world transfer record starts from history: a fee above anything the current market has paid,
  // so the first seasons' big deals don't all "break" it
  const seedWorld = () => {
    const top = Object.values(S().players).reduce((m, p) => Math.max(m, p.value || 0), 0);
    return { transfer: { name: 'a transfer before your time', fee: U.roundMoney(Math.max(2e7, top * 0.5)), year: S().year - 3, historic: true } };
  };
  const store = () => (S().records = S().records || { since: S().year, clubs: {}, h2h: {}, heat: {}, world: seedWorld() });
  // Club records start with the save, so they only make the news once there is a season to compare with
  const newsworthy = () => S().year > store().since;
  R.store = store;
  const clubRec = (id) => { const r = store(); return (r.clubs[id] = r.clubs[id] || {}); };
  const club = (id) => S().clubs[id];
  const isFull = (id) => !!(club(id) && club(id).sim === 'full');
  const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const compName = (id) => (S().comps[id] ? S().comps[id].name : '');
  const news = (o) => FM.News.add(o);
  const poss = (name) => (name.endsWith('s') ? `${name}'` : `${name}'s`);

  // ---------- Club match records + head-to-head + rivalry heat (after every engine match) ----------
  const margin = (m) => m.gf - m.ga;
  const beats = (m, old) => margin(m) > margin(old) || (margin(m) === margin(old) && m.gf > old.gf);
  const lossBeats = (m, old) => -margin(m) > -margin(old) || (margin(m) === margin(old) && m.ga > old.ga);
  R.onMatch = function (fx, res) {
    const s = S(), comp = s.comps[fx.comp];
    if (!comp || comp.type === 'friendly') return;
    [[fx.h, fx.a, res.hg, res.ag], [fx.a, fx.h, res.ag, res.hg]].forEach(([id, opp, gf, ga]) => {
      if (!isFull(id)) return;
      const cr = clubRec(id), m = { gf, ga, opp, year: s.year, comp: fx.comp };
      if (gf > ga && (!cr.bigWin || beats(m, cr.bigWin))) {
        const prev = cr.bigWin; cr.bigWin = m;
        if (prev && W.isUser(id) && newsworthy()) news({ type: 'club', title: `Club record: ${poss(club(id).name)} biggest win`, body: `${gf}–${ga} against ${club(opp).name} beats the ${prev.gf}–${prev.ga} against ${club(prev.opp) ? club(prev.opp).name : '?'} (${prev.year}).`, clubId: id, fxId: fx.id });
      }
      if (ga > gf && (!cr.bigLoss || lossBeats(m, cr.bigLoss))) {
        const prev = cr.bigLoss; cr.bigLoss = m;
        if (prev && W.isUser(id) && newsworthy()) news({ type: 'club', title: `Unwanted record: ${poss(club(id).name)} heaviest defeat`, body: `${gf}–${ga} at the hands of ${club(opp).name} — worse than the ${prev.gf}–${prev.ga} against ${club(prev.opp) ? club(prev.opp).name : '?'} (${prev.year}).`, clubId: id, fxId: fx.id });
      }
    });
    // Head-to-head for the user's club, across seasons and competitions
    const u = s.user && s.user.clubId;
    if (u && (fx.h === u || fx.a === u)) {
      const home = fx.h === u, opp = home ? fx.a : fx.h, gf = home ? res.hg : res.ag, ga = home ? res.ag : res.hg;
      const key = `${u}|${opp}`, h = (store().h2h[key] = store().h2h[key] || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, last: [] });
      h.p++; h.gf += gf; h.ga += ga;
      gf > ga ? h.w++ : gf < ga ? h.l++ : h.d++;
      h.last = [[s.year, gf, ga, home ? 1 : 0, fx.comp, res.pens ? (home ? res.pens : [res.pens[1], res.pens[0]]) : 0]].concat(h.last).slice(0, 6);
      R.checkAllTime(u, fx, res, home ? 0 : 1);
    }
    // Rivalry heat: knockouts decided between two clubs, red cards, bad-tempered games
    if (isFull(fx.h) && isFull(fx.a) && club(fx.h).rival !== fx.a) {
      const reds = res.cards.filter((c) => c.k === 'red').length, yellows = res.cards.length - reds;
      let add = 2 * reds + (yellows >= 6 ? 1 : 0);
      const why = [];
      if (res.win === 0 || res.win === 1) { add += 3; why.push(`${club(res.win ? fx.a : fx.h).short} knocked ${club(res.win ? fx.h : fx.a).short} out of the ${compName(fx.comp)}`); }
      if (reds) why.push(reds === 1 ? 'a red card' : `${reds} red cards`);
      if (add) R.addHeat(fx.h, fx.a, add, why.join(' and '));
    }
  };

  // ---------- Rivalries that grow ----------
  R.EMERGING = 8; R.RIVALRY = 14;
  R.heat = (a, b) => { const h = S().records && S().records.heat[pairKey(a, b)]; return h ? h.v : 0; };
  R.heated = (a, b) => R.heat(a, b) >= R.EMERGING;
  R.addHeat = function (a, b, n, why) {
    const k = pairKey(a, b), h = (store().heat[k] = store().heat[k] || { v: 0, st: 0 });
    h.v += n;
    const mine = W.isUser(a) || W.isUser(b), me = W.isUser(a) ? a : b, them = me === a ? b : a;
    if (h.st < 1 && h.v >= R.EMERGING) {
      h.st = 1;
      if (mine) news({ type: 'dressing', title: `A new rivalry is emerging with ${club(them).name}`, body: `${why ? why[0].toUpperCase() + why.slice(1) + '. ' : ''}The fans have noticed — there's needle every time these two meet now. A chant about ${club(them).short} is already doing the rounds on the terraces.`, clubId: me });
      else if (Math.random() < 0.3) news({ type: 'world', title: `Bad blood: ${club(a).name} v ${club(b).name} is becoming a rivalry`, body: why ? `${why[0].toUpperCase() + why.slice(1)}.` : '', clubId: a });
    }
    if (h.st < 2 && h.v >= R.RIVALRY) {
      h.st = 2;
      if (mine) news({ type: 'dressing', title: `${club(them).name} are now a full-blown rival`, body: `Supporters mark this fixture on the calendar now. Expect a hostile atmosphere, more cards, and a crowd that takes the result personally.`, clubId: me });
    }
  };
  // New season: rivalries cool unless they are fed
  R.seasonEnd = function () {
    const r = S().records;
    if (!r) return;
    for (const k in r.heat) {
      const h = r.heat[k];
      h.v = Math.round(h.v * 0.6 * 10) / 10;
      const [a, b] = k.split('|'), mine = W.isUser(a) || W.isUser(b), them = W.isUser(a) ? b : a;
      if (h.st >= 1 && h.v < R.EMERGING * 0.6) {
        h.st = 0;
        if (mine && club(them)) news({ type: 'club', title: `The rivalry with ${club(them).name} is cooling`, body: 'A quiet season between the clubs, and the needle has faded.', clubId: S().user.clubId, quiet: true });
      }
      if (h.v < 1 && !h.st) delete r.heat[k];
    }
  };

  // ---------- Transfer records ----------
  R.onTransfer = function (p, fromId, toId, fee) {
    if (!(fee > 0)) return;
    const s = S(), name = W.name(p), rec = { pid: p.id, name, fee, year: s.year };
    const to = club(toId), from = fromId && club(fromId);
    if (to) {
      const cr = clubRec(toId), prev = cr.sign;
      if (!prev || fee > prev.fee) {
        cr.sign = { ...rec, from: fromId };
        if (prev && W.isUser(toId) && newsworthy()) news({ type: 'transfer', title: `Club-record signing: ${U.money(fee)} for ${name}`, body: `${to.name} break their transfer record${from ? ` to sign him from ${from.name}` : ''}. The previous record was ${U.money(prev.fee)} for ${prev.name} in ${prev.year}.`, pid: p.id, clubId: toId });
      }
    }
    if (from) {
      const cr = clubRec(fromId), prev = cr.sale;
      if (!prev || fee > prev.fee) {
        cr.sale = { ...rec, to: toId };
        if (prev && W.isUser(fromId) && newsworthy()) news({ type: 'transfer', title: `Club-record sale: ${name} goes for ${U.money(fee)}`, body: `The biggest fee ${from.name} have ever received, beating ${U.money(prev.fee)} for ${prev.name} in ${prev.year}.`, pid: p.id, clubId: fromId });
      }
    }
    const w = store().world, prevW = w.transfer;
    if (!prevW || fee > prevW.fee) {
      w.transfer = { ...rec, from: fromId, to: toId };
      if (prevW) news({ type: 'headline', paper: 'Football Weekly', title: `World-record transfer: ${name} joins ${to ? to.name : '?'} for ${U.money(fee)}`, body: `The most expensive transfer in history, beating ${prevW.historic ? `the ${U.money(prevW.fee)} record that had stood since ${prevW.year}` : `${U.money(prevW.fee)} for ${prevW.name} (${prevW.year})`}.`, pid: p.id, clubId: toId });
    }
  };

  // ---------- All-time lists (players + retired + the club's historical legends) ----------
  R.allTime = function (clubId) {
    const s = S(), c = club(clubId);
    const people = Object.values(s.players).map((p) => ({ id: p.id, name: W.name(p), nat: p.nat, pos: p.pos, youth: p.youth, cult: p.cult, spells: p.career.spells, active: true, derbyGoals: p.derbyGoals }))
      .concat((s.retired || []).map((r) => ({ id: r.id, name: r.fn + ' ' + r.ln, nat: r.nat, pos: r.pos, youth: r.youth, cult: r.cult, spells: r.spells || [], active: false, derbyGoals: r.derbyGoals, became: r.became })));
    const withClub = people.map((x) => { const sp = x.spells.filter((q) => q.c === clubId); return { ...x, apps: U.sum(sp, (q) => q.apps), goals: U.sum(sp, (q) => q.goals) }; }).filter((x) => x.apps > 0);
    const legends = ((c && c.legends) || []).map((l) => ({ name: l.name, nat: l.nat, pos: l.pos, apps: l.apps, goals: l.goals, note: l.note, era: l.era, hist: true }));
    const all = withClub.concat(legends);
    return { withClub, all, scorers: all.filter((x) => x.goals).sort((a, b) => b.goals - a.goals), apps: all.slice().sort((a, b) => b.apps - a.apps) };
  };
  // After our match: did anyone just become the club's all-time top scorer or appearance maker?
  R.checkAllTime = function (clubId, fx, res, side) {
    const at = R.allTime(clubId), c = club(clubId);
    const scored = {};
    res.goals.filter((g) => g.side === side).forEach((g) => (scored[g.pid] = (scored[g.pid] || 0) + 1));
    const [s1, s2] = at.scorers;
    if (s1 && s2 && s1.id && scored[s1.id] && s1.goals > s2.goals && s1.goals - scored[s1.id] <= s2.goals) news({ type: 'story', kicker: 'CLUB RECORD', title: `${s1.name} is ${poss(c.name)} all-time top scorer`, sub: `${s1.goals} goals for the club — past ${poss(s2.name)} ${s2.goals}.`, big: String(s1.goals), clubId, pid: s1.id });
    const [a1, a2] = at.apps;
    if (a1 && a2 && a1.id && S().players[a1.id] && fx.ratings && fx.ratings[a1.id] != null && a1.apps > a2.apps && a1.apps - 1 <= a2.apps) news({ type: 'story', kicker: 'CLUB RECORD', title: `${a1.name} makes a record ${U.ordinal(a1.apps)} appearance`, sub: `No one has played more games for ${c.name} — past ${poss(a2.name)} ${a2.apps}.`, big: String(a1.apps), clubId, pid: a1.id });
  };

  // ---------- Player of the month (every four league rounds, in the user's league) ----------
  R.afterLeagueDay = function (cal) {
    const s = S(), u = s.user;
    const b = W.baseRound(cal.round); // monthly, on the 22-round scale
    if (!u || u.sacked || !W.employed() || cal.type !== 'league' || (b + 1) % 4 || (cal.round > 0 && W.baseRound(cal.round - 1) === b)) return;
    const comp = s.comps[W.userClub().comp];
    if (!comp || !comp.fixtures) return;
    const last4 = (p) => U.avg(p.form.slice(-4));
    const pool = comp.clubs.flatMap((id) => W.squad(id)).filter((p) => p.form.length >= 4 && p.season.apps >= 4);
    const best = pool.sort((a, b) => last4(b) - last4(a) || b.season.goals - a.season.goals)[0];
    if (!best) return;
    const month = MONTHS.at((b + 1) / 4 - 1) || 'the month';
    best.honours = (best.honours || []).concat([[s.year, 'potm', comp.id, month]]);
    best.morale = Math.min(100, best.morale + 5);
    news({ type: 'award', title: `${W.name(best)} is ${comp.name} Player of the Month for ${month}`, body: `${last4(best).toFixed(2)} average over his last four games for ${club(best.clubId).name}${best.season.goals ? `, with ${best.season.goals} goal${best.season.goals === 1 ? '' : 's'} this season` : ''}.`, pid: best.id, clubId: best.clubId });
  };

  // ---------- Injury history (players at fully simulated clubs) ----------
  R.noteInjury = function (p) {
    if (!p.inj || !isFull(p.clubId)) return;
    p.injHist = (p.injHist || []).concat([[S().year, p.inj.type, p.inj.out || p.inj.weeks]]).slice(-8);
  };
  // Summary for the player card: [{y, type, weeks}], total weeks, and a recurring problem if any
  R.injurySummary = function (p) {
    const list = (p.injHist || []).map(([y, type, weeks]) => ({ y, type, weeks }));
    if (!list.length) return null;
    const recent = list.filter((x) => x.y >= S().year - 1), byPart = {};
    recent.forEach((x) => { const part = FM.Injury ? FM.Injury.part(x.type) : x.type.split(' ')[0].toLowerCase(); byPart[part] = (byPart[part] || 0) + 1; });
    const rec = Object.entries(byPart).filter(([part, n]) => n >= 2 && !['knock', 'bruised', 'illness', 'head', 'ribs'].includes(part)).sort((a, b) => b[1] - a[1])[0];
    return { list, weeks: U.sum(list, (x) => x.weeks), recurring: rec ? { part: rec[0], n: rec[1] } : null };
  };

  // ---------- Managers move around the world ----------
  // Each manager's career: [clubId, fromYear, toYear|null, how they left]; the world's recent moves in records.moves
  const mgrJoin = (m, clubId) => { m.career = (m.career || []).concat([[clubId, S().year, null, null]]); delete m.unemployed; };
  const mgrLeave = (m, clubId, how) => { const last = (m.career || []).at(-1); if (last && last[0] === clubId && last[2] == null) { last[2] = S().year; last[3] = how; } else m.career = (m.career || []).concat([[clubId, null, S().year, how]]); };
  R.logMove = (m, from, to, kind) => { const r = store(); r.moves = [[S().year, m.id, from || null, to || null, kind]].concat(r.moves || []).slice(0, 80); };
  // Who takes a vacant job: a successful manager poached from a smaller club, an out-of-work manager (one who
  // left in an earlier season: nobody is rehired the year he was sacked), or nobody (→ new face)
  R.findManager = function (c, noPoach) {
    const s = S();
    if (!noPoach && Math.random() < 0.45) {
      const cands = Object.values(s.clubs).filter((x) => x !== c && x.sim === 'full' && !W.isUser(x.id) && x.manager && s.staff[x.manager] && x.rep < c.rep - 2 && x.rep >= c.rep - 25 && x.boardConf >= 60);
      const pick = cands.length ? U.wpick(cands, (x) => x.boardConf - 55 + x.rep / 10) : null;
      if (pick) return { m: s.staff[pick.manager], from: pick };
    }
    if (Math.random() < 0.5) {
      const free = Object.values(s.staff).filter((m) => m.role === 'Manager' && m.unemployed && m.age < 68 && ((m.career || []).at(-1) || [])[2] < s.year && (m.rep || 50) >= c.rep - 20);
      if (free.length) return { m: U.pick(free) };
    }
    return null;
  };
  // Bookkeeping when a club changes manager (called from FM.Stories.newManager)
  R.managerChange = function (c, oldM, newM, fromClub) {
    if (oldM) { mgrLeave(oldM, c.id, 'left'); oldM.unemployed = true; R.logMove(oldM, c.id, null, 'left'); }
    if (fromClub) mgrLeave(newM, fromClub.id, 'poached');
    mgrJoin(newM, c.id);
    newM.rep = Math.max(newM.rep || 0, Math.round(c.rep * 0.9));
    R.logMove(newM, fromClub ? fromClub.id : null, c.id, fromClub ? 'poached' : newM.career.length > 1 ? 'return' : 'new');
  };
  // The user taking a job displaces its manager; the club the user left hires one
  R.managerLeft = (m, clubId) => { mgrLeave(m, clubId, 'replaced'); m.unemployed = true; R.logMove(m, clubId, null, 'left'); };
  R.managerJoined = (m, clubId) => { mgrJoin(m, clubId); R.logMove(m, null, clubId, 'new'); };
  // "Since 2027 · previously Eastport Dockers" for the team overview
  R.managerLine = function (m, clubId) {
    const car = m.career || [], cur = car.at(-1), prev = car.filter((x) => x[0] !== clubId && S().clubs[x[0]]).at(-1);
    return [cur && cur[0] === clubId && cur[1] ? `since ${cur[1]}` : '', prev ? `previously ${S().clubs[prev[0]].name}` : ''].filter(Boolean).join(' · ');
  };

  // ---------- Stadium histories ----------
  // Every ground gets an opening year (from its club, deterministic) and a history of capacity changes
  R.stadium = function (c) {
    const st = c.stadium;
    if (!st.opened) st.opened = Math.min(2012, 1880 + (U.hash(c.id + st.name) % 118));
    if (!st.hist) st.hist = [[store().since, 'Capacity', st.cap]]; // seeded before any change it records
    return st;
  };
  // All capacity growth goes through here: history, and a story for the user's club
  R.expandStadium = function (c, add, why) {
    const st = R.stadium(c), before = st.cap;
    st.cap += add;
    st.hist.push([S().year, why || 'Expansion', st.cap]);
    const milestone = [20000, 30000, 40000, 50000, 60000, 75000].find((m) => before < m && st.cap >= m);
    if (W.isUser(c.id)) FM.Stories.share({ kicker: 'STADIUM', title: `${st.name} now holds ${st.cap.toLocaleString()}`, sub: `${why || 'Expansion'} complete: ${add.toLocaleString()} more seats${milestone ? ` — past ${milestone.toLocaleString()} for the first time since it opened in ${st.opened}` : ''}.`, big: `${Math.round(st.cap / 1000)}K`, clubId: c.id });
    return st.cap;
  };

  // Rivalries cool a little every summer
  const endSeason = FM.Season.endSeason;
  FM.Season.endSeason = function () { const out = endSeason.apply(this, arguments); R.seasonEnd(); return out; };
})();
