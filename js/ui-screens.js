// Main tab screens + player card + tactics + scouting + league + club.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W,
    UI = FM.UI,
    C = UI.C;
  const esc = U.esc;
  const S = () => FM.S;
  const club = () => W.userClub();
  // Out of work there is no club: views fall back to the first league, and ids to null
  const myComp = () => (club() ? club().comp : W.leagues()[0].id);
  const NOCLUB = { colors: ['#1b2533', '#0c1118'], short: '', name: '' };
  const P = (id) => FM.S.players[id];
  const CL = (id) => FM.S.clubs[id];
  const chips = (k, opts) =>
    `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${UI.sub[k] === v ? 'on' : ''}" data-act="sub" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  UI.screens = {};

  // ======================= HOME =======================
  UI.screens.home = function () {
    const s = S(),
      c = club();
    if (!W.employed()) return unemployedView();
    const fx = FM.Season.userFixture();
    const cal = FM.Season.today();
    let hero;
    if (fx) {
      const TM = FM.clubOf,
        home = W.isMine(fx.h),
        me = TM(home ? fx.h : fx.a),
        opp = TM(home ? fx.a : fx.h);
      const derby = me.rival === opp.id;
      const str = (t) =>
        U.avg(W.pickXI(t.id, W.isUser(t.id) ? s.user.tactic : t.tactic).xi.filter(Boolean), (p) => p.ca);
      const us = str(me),
        them = str(opp);
      const pw = FM.Season.winChance(us, them, home, fx.neutral);
      const compName = fx.intl ? 'International' : s.comps[fx.comp].name;
      const f1 = fx.first && FM.Cups.findFixture(fx.first);
      const aggNote =
        f1 && f1.res
          ? `First leg: ${TM(f1.h).short} ${f1.res.hg}–${f1.res.ag} ${TM(f1.a).short}${s.rules.awayGoals ? ' · away goals count' : ''}`
          : '';
      // Their last result: clubs keep one; national teams read the international log
      const lr = (() => {
        if (fx.intl) {
          const g = (s.intlLog || []).find((x) => x.h === opp.id || x.a === opp.id);
          return (
            g && {
              opp: g.h === opp.id ? g.a : g.h,
              gf: g.h === opp.id ? g.hg : g.ag,
              ga: g.h === opp.id ? g.ag : g.hg,
              pens: g.pens && (g.h === opp.id ? g.pens : [g.pens[1], g.pens[0]]),
              label: g.label,
            }
          );
        }
        const r = opp.lastResult;
        return r && r.year === s.year && { ...r, label: s.comps[r.comp] ? s.comps[r.comp].name : '' };
      })();
      const lastLine = lr
        ? `Their last: ${lr.gf > lr.ga || (lr.pens && lr.pens[0] > lr.pens[1]) ? 'W' : lr.gf < lr.ga || (lr.pens && lr.pens[0] < lr.pens[1]) ? 'L' : 'D'} ${lr.gf}–${lr.ga}${lr.pens ? ` (${lr.pens[0]}–${lr.pens[1]} pens)` : ''} v ${TM(lr.opp) ? TM(lr.opp).name : '?'}${lr.label ? ` · ${lr.label}` : ''}`
        : '';
      const oppForm = fx.intl
        ? opp.form || []
        : s.comps[opp.comp] && s.comps[opp.comp].table[opp.id]
          ? s.comps[opp.comp].table[opp.id].form
          : [];
      hero = `<div class="hero" style="--c1:${me.colors[0]};--c2:${derby ? '#7a0010' : opp.colors[0]}">
        <div class="row"><span class="tag">${fx.po ? esc(fx.po) + ' · ' : cal.type === 'league' ? `${FM.Season.matchdayLabel(cal)} · ` : ''}${esc(compName)}</span><span class="grow"></span>${derby ? `<span class="pill" style="background:#fff;color:#b00020;border:0">⚔️ ${esc(me.derby)}</span>` : ''}</div>
        <div class="vs"><div class="side">${UI.C.crest(TM(fx.h), 54)}<span>${esc(TM(fx.h).name)}</span></div><div class="mid">VS<div class="tiny" style="font-family:var(--font);font-weight:700;opacity:.8">${fx.neutral ? 'NEUTRAL' : home ? 'HOME' : 'AWAY'}</div></div><div class="side">${UI.C.crest(TM(fx.a), 54)}<span>${esc(TM(fx.a).name)}</span></div></div>
        ${aggNote ? `<div class="small center b" style="margin:-4px 0 10px;opacity:.9">${esc(aggNote)}</div>` : ''}
        <div class="row small" style="margin-bottom:${lastLine ? 4 : 12}px;opacity:.9"><span>Win chance ${Math.round(pw * 100)}%</span><span class="grow"></span><span>Their form</span>${C.form(oppForm)}</div>
        ${lastLine ? `<div class="tiny ellip" style="margin-bottom:12px;opacity:.8;text-align:right">${esc(lastLine)}</div>` : ''}
        <button class="play" data-act="preview">▶ MATCHDAY</button></div>`;
    } else if (cal) {
      const others = FM.Season.dayFixtures();
      const away =
        cal.type === 'intl' ? W.squad(c.id).filter((p) => FM.S.nteams && FM.Intl.squad(p.nat).includes(p)) : [];
      const what =
        cal.type === 'intl'
          ? `International break. ${
              away.length
                ? `${away.length} of your players are called up: ${away
                    .slice(0, 4)
                    .map((p) => W.short(p))
                    .join(', ')}${away.length > 4 ? '…' : ''}.`
                : 'None of your players were called up.'
            }`
          : cal.type === 'playoff'
            ? 'The playoffs are being contested.'
            : cal.type === 'cup'
              ? `${others.length} ties elsewhere: ${[...new Set(others.map((f) => s.comps[f.comp].name))].join(', ') || 'no games'}.`
              : '';
      const what2 =
        cal.type === 'tourn'
          ? `${(s.tourns || []).map((t) => t.name).join(' · ') || 'The summer tournaments'} — ${others.length} match${others.length === 1 ? '' : 'es'} today.`
          : what;
      hero = `<div class="hero" style="--c1:#1b2533;--c2:#0c1118"><div class="tag">${cal.type === 'playoff' ? 'Playoffs' : cal.type === 'intl' ? '🌍 International break' : cal.type === 'tourn' ? '🏆 Summer tournament' : cal.type === 'cup' ? (cal.world ? 'Club World Cup' : cal.stage ? 'Continental night' : 'Cup day') : 'Matchday'}</div><div class="h2" style="margin:10px 0 14px">No match for ${esc(c.short)} today</div><div class="small" style="opacity:.8;margin-bottom:12px">${esc(what2)}</div><div class="row" style="gap:8px"><button class="play grow" data-act="advance">Advance ▶</button><button class="play grow" style="background:rgba(255,255,255,.14);color:#fff" data-act="skipToMatch">⏩ Next match</button></div></div>`;
    }
    const row = s.comps[c.comp].table[c.id];
    const pos = W.position(c.id);
    const objs = FM.Season.objectives(c);
    // The home feed is about your club; the wider game lives under World (older saves may remember another tab)
    if (!['club', 'reply', 'world'].includes(UI.sub.feed)) UI.sub.feed = 'club';
    const waiting = s.news.filter(UI.isOpenDecision).length;
    return `${hero}
      <div class="kpis">
        <div class="kpi">${FM.Season.gamesPlayed(c.id) ? `<div class="v">${U.ordinal(pos)}</div><div class="l">${s.comps[c.comp].short} · ${row.pts} pts</div>` : `<div class="v">—</div><div class="l">${s.comps[c.comp].short} · season starts soon</div>`}</div>
        <div class="kpi"><div class="v" style="color:${C.moodColor(c.boardConf)}">${Math.round(c.boardConf)}%</div><div class="l">Board</div></div>
        <div class="kpi"><div class="v" style="color:${C.moodColor(c.fanMood)}">${Math.round(c.fanMood)}%</div><div class="l">Fans</div></div>
      </div>
      ${cupPills(c)}
      <div class="card flat"><div class="row"><div class="h3 grow">Objectives</div>${C.form(row.form)}</div>${objs.map((o) => `<div class="row small" style="margin-top:8px"><span>${o.ok ? '✅' : '⏳'}</span><span class="grow">${esc(o.text)}</span><span class="dim">${esc(o.status)}</span></div>`).join('')}</div>
      <div class="sec"><div class="h3">The Feed</div><span class="dim small">${s.news.filter((n) => !n.read).length ? `${s.news.filter((n) => !n.read).length} new · ` : ''}${s.news.length} stories</span>${s.news.some((n) => n.read && !UI.isOpenDecision(n)) ? `<button class="btn sm" style="margin-left:8px" data-act="clearRead">Remove read stories</button>` : ''}</div>
      ${chips('feed', [
        ['club', 'My Club'],
        ['reply', waiting ? `🔔 Needs reply (${waiting})` : 'Needs reply'],
        ['following', '⭐ Following'],
        ['world', 'World'],
      ])}
      ${UI.sub.feed === 'world' ? chips('wnews', WNEWS) : ''}
      ${feed()}`;
  };

  function cupPills(c) {
    const st = FM.Cups.status(c.id);
    if (!st.length) return '';
    return `<div class="chips noswipe" style="margin-top:-2px">${st.map((x) => `<button class="chip" data-act="goCups" style="${x.text === 'Winners' ? 'border-color:var(--gold);color:var(--gold)' : x.alive === false ? 'opacity:.55' : ''}">${x.c.type === 'continental' ? '⭐' : '🏆'} ${esc(x.c.name)} · ${esc(x.text)}</button>`).join('')}</div>`;
  }
  UI.acts.goCups = () => {
    UI.sub.league = 'cups';
    UI.go('league');
  };

  // World News topics. Items can carry an explicit `cat`; otherwise the topic is read from type and headline
  const WNEWS = [
    ['all', 'Everything'],
    ['transfers', 'Transfers'],
    ['managers', 'Managers'],
    ['competitions', 'Competitions'],
    ['international', 'International'],
    ['records', 'Records'],
  ];
  UI.sub.wnews = UI.sub.wnews || 'all';
  UI.newsCats = function (n) {
    const t = `${n.title || ''} ${n.kicker || ''}`,
      out = [];
    if (n.cat) out.push(n.cat);
    if (
      ['transfer', 'roundup', 'rumour'].includes(n.type) ||
      /transfer|signs for|joins|\bfee\b|\bloan\b|release clause/i.test(t)
    )
      out.push('transfers');
    if (/manager|\bsack|appoint|part ways|takes over|dugout|leaves \w.* for /i.test(t)) out.push('managers');
    if (/international|national team|world championship|qualif|\bcaps?\b|summer finals|nations/i.test(t))
      out.push('international');
    if (/record/i.test(t)) out.push('records');
    if (
      /\bwin|\bwon|champions|\bcup\b|title|promot|relegat|final|player of the month|crowned|trophy|league|round-up|hat-trick|shock|stun|giant-kill|derby/i.test(
        t,
      )
    )
      out.push('competitions');
    return [...new Set(out)];
  };
  function feed() {
    const s = S(),
      f = UI.sub.feed,
      cid = club() ? club().id : null;
    let items = s.news;
    if (f === 'club') items = items.filter((n) => FM.News.isClub(n, cid) || FM.News.followed(n));
    if (f === 'following') items = items.filter((n) => FM.News.followed(n));
    if (f === 'reply') items = items.filter(UI.isOpenDecision);
    if (f === 'stories') items = items.filter((n) => n.type === 'story');
    if (f === 'world') {
      // World News: everything about other clubs and the wider game, filtered by topic
      const w = UI.sub.wnews || 'all';
      items = items.filter(
        (n) =>
          n.clubId !== cid &&
          ['headline', 'world', 'brief', 'award', 'story', 'transfer', 'roundup', 'rumour'].includes(n.type) &&
          (w === 'all' || UI.newsCats(n).includes(w)),
      );
    }
    if (f === 'transfers') items = items.filter((n) => ['transfer', 'roundup', 'rumour', 'bid'].includes(n.type));
    items = items.filter((n) => !n.quiet || f === 'club');
    const top = f === 'following' ? UI.followingPanel() : '';
    if (!items.length)
      return `${top}<div class="empty">${f === 'reply' ? 'Nothing is waiting for your reply.' : f === 'following' ? 'No news from what you follow yet.' : f === 'world' && UI.sub.wnews !== 'all' ? 'No world news on this topic yet.' : 'Nothing here yet. Play some football.'}</div>`;
    // New since you last looked: a dot on the card; everything shown now counts as read
    const shown = items.slice(0, 40);
    shown.forEach((n) => {
      if (!n.read) n._new = true;
    });
    const html = shown.map(UI.newsCard).join('');
    shown.forEach((n) => {
      n.read = true;
      delete n._new;
    });
    return top + html;
  }
  // Open decisions are never cleared: a live bid, an unanswered press conference or meeting
  UI.isOpenDecision = FM.News.isOpen;
  UI.acts.roundupAll = (d) => {
    const n = S().news.find((x) => x.id === d.id);
    if (n) n.open = true;
    UI.render();
  };
  UI.acts.clearRead = () => {
    const s = S(),
      before = s.news.length;
    s.news = s.news.filter((n) => !n.read || UI.isOpenDecision(n));
    UI.save();
    UI.render();
    UI.toast(`${before - s.news.length} read item${before - s.news.length === 1 ? '' : 's'} cleared`);
  };

  const TYPE = {
    roundup: ['🔁', 'Transfer round-up'],
    headline: ['📰', 'Headline'],
    social: ['💬', 'Fans'],
    story: ['', ''],
    press: ['🎙️', 'Press Conference'],
    bid: ['💼', 'Transfer Bid'],
    report: ['🔭', 'Scouting'],
    youth: ['🌱', 'Academy'],
    board: ['🏛️', 'Board'],
    dressing: ['👥', 'Dressing Room'],
    world: ['🌍', 'World'],
    brief: ['⚡', 'Around the league'],
    transfer: ['✍️', 'Transfer'],
    rumour: ['👀', 'Rumour'],
    award: ['🏅', 'Awards'],
    club: ['🏟️', 'Club'],
    meeting: ['🗣️', 'Player meeting'],
    medical: ['🩺', 'Medical'],
    contracts: ['📝', 'Contracts'],
    desk: ['🤝', 'Transfer desk'],
  };
  UI.newsCard = function (n) {
    const s = S();
    const when = `${n.year !== s.year ? n.year + ' · ' : ''}MD ${n.day + 1}`;
    if (n.type === 'story') {
      const c = CL(n.clubId) || club() || NOCLUB;
      return `<div class="story" style="--c1:${c.colors[0]};--c2:${c.colors[1]}"><div class="bg"></div><button class="share" data-act="share" data-id="${n.id}" aria-label="Share">⤴</button><div class="in"><span class="kick">${esc(n.kicker)}</span>${n.pid && P(n.pid) ? `<div class="tiny b" style="margin-top:10px;opacity:.85" data-act="player" data-id="${n.pid}">${C.flag(P(n.pid).nat)} ${esc(W.name(P(n.pid)))} ›</div>` : ''}<div class="big">${esc(n.big)}</div><div class="st">${esc(n.title)}</div><div class="ss">${esc(n.sub)}</div><div class="foot"><span>TOUCHLINE STORIES</span><span>${esc(c.short)} · ${n.year}</span></div></div></div>`;
    }
    if (n.type === 'digest' && n.data) return digestCard(n, when);
    if (n.type === 'roundup') {
      const shown = n.open ? n.deals : n.deals.slice(0, 8);
      return `<div class="news" data-nid="${n.id}"><div class="nh">${n._new ? '<span class="dot" title="New"></span>' : ''}🔁 Transfer round-up<span class="grow"></span><span class="tiny dim">${when}</span></div><div class="nb"><div class="nt">${n.deals.length} deal${n.deals.length === 1 ? '' : 's'} around the world</div>${shown
        .map(
          (d) =>
            `<div class="row small tap" data-act="player" data-id="${d.pid}" style="padding:5px 0;border-top:1px solid var(--line);gap:8px">${d.c && CL(d.c) ? C.crest(CL(d.c), 16) : ''}<span class="grow ellip">${esc(d.t)}</span></div>`,
        )
        .join(
          '',
        )}${n.deals.length > shown.length ? `<button class="btn sm" style="margin-top:8px" data-act="roundupAll" data-id="${n.id}">Show all ${n.deals.length}</button>` : ''}</div></div>`;
    }
    const [ic, lab] = TYPE[n.type] || ['•', n.type];
    const c = n.clubId && CL(n.clubId);
    let head = `<div class="nh">${n._new ? '<span class="dot" title="New"></span>' : ''}${ic} ${n.type === 'headline' ? `<span class="paper">${esc(n.paper || 'The Daily Touchline')}</span>` : lab}<span class="grow"></span>${c ? C.crest(c, 16) : ''}<span>${when}</span></div>`;
    let body = '';
    if (n.type === 'social') {
      body = n.posts
        .map(
          (p) =>
            `<div class="post"><div class="av" style="background:${p.rival ? '#3b0d12' : 'var(--card2)'};color:${p.rival ? '#ff8a8a' : 'var(--ink2)'}">${esc(p.h[1].toUpperCase())}</div><div class="grow"><div class="hn">${esc(p.h)}</div><div class="tx">${esc(p.t)}</div><div class="lk">♥ ${p.likes.toLocaleString()} · ↻ ${Math.round(p.likes / 7)}</div></div></div>`,
        )
        .join('');
      return `<div class="news social">${head}<div class="nb"><div class="nt">${esc(n.title)}</div>${body}</div></div>`;
    }
    let extra = '';
    if (n.type === 'meeting' || n.type === 'medical') {
      const act = n.type === 'medical' ? 'medical' : 'meet';
      extra = n.resolved
        ? `<div class="reply">You: “${esc(n.resolved)}” — ${esc(n.reply || '')}</div>`
        : `<div class="choices">${n.choices.map((ch, i) => `<button class="btn sm${n.type === 'medical' && i === n.rec ? ' pri' : ''}" data-act="${act}" data-id="${n.id}" data-i="${i}">${esc(ch.label)}</button>`).join('')}</div>`;
      if (n.pid && P(n.pid))
        extra += `<div style="margin-top:8px"><button class="btn sm" data-act="player" data-id="${n.pid}">View ${esc(W.short(P(n.pid)))} ›</button></div>`;
    }
    if (n.type === 'press') {
      extra = n.resolved
        ? `<div class="reply">You: “${esc(n.resolved)}” — ${esc(n.reply)}</div>`
        : `<div class="choices">${n.choices.map((ch, i) => `<button class="btn sm" data-act="press" data-id="${n.id}" data-i="${i}">${esc(ch.label)}</button>`).join('')}</div>`;
    }
    if (n.type === 'bid') {
      const st = n.data.status;
      extra =
        st === 'open'
          ? UI.bidButtons(n) + (n.reply ? `<div class="reply">${esc(n.reply)}</div>` : '')
          : `<div class="reply">${UI.BID_STATUS[st] || '—'}${n.reply ? ' — ' + esc(n.reply) : ''}</div>`;
    }
    if (n.type === 'desk') extra = UI.deskChoices(n);
    if (n.type === 'contracts' && n.pids)
      extra = `<div class="chips" style="margin:10px 0 0;flex-wrap:wrap">${n.pids
        .filter((id) => P(id) && W.isUser(P(id).clubId))
        .map(
          (id) =>
            `<button class="chip ${P(id).contract > S().year ? 'on' : ''}" data-act="renew" data-id="${id}">${P(id).contract > S().year ? '✅' : '✍️'} ${esc(W.short(P(id)))} · ${Math.round(P(id).ca)}</button>`,
        )
        .join('')}</div>`;
    if (n.type === 'youth' && n.pids)
      extra = `<div class="chips" style="margin:10px 0 0">${n.pids
        .filter(P)
        .map(
          (id) =>
            `<button class="chip" data-act="player" data-id="${id}">${C.flag(P(id).nat)} ${esc(W.short(P(id)))} · ${P(id).pos}</button>`,
        )
        .join('')}</div>`;
    if (['report', 'transfer', 'rumour', 'award', 'dressing'].includes(n.type) && n.pid && P(n.pid))
      extra += `<div style="margin-top:8px"><button class="btn sm" data-act="player" data-id="${n.pid}">View ${esc(W.short(P(n.pid)))} ›</button></div>`;
    if (n.type === 'headline' && n.fxId)
      extra += `<div style="margin-top:8px"><button class="btn sm" data-act="matchReport" data-id="${n.fxId}">Match report ›</button></div>`;
    return `<div class="news ${n.type}" data-nid="${n.id}">${head}<div class="nb"><div class="nt">${esc(n.title)}</div>${n.body ? `<div class="nx">${esc(n.body)}</div>` : ''}${extra}</div></div>`;
  };

  // Weekly round-up of a league matchday: our result, table movement, the rest of the round
  const TM = (id) => FM.clubOf(id);
  const arrow = (mv) =>
    mv > 0
      ? `<span style="color:var(--good)">▲${mv}</span>`
      : mv < 0
        ? `<span style="color:var(--bad)">▼${-mv}</span>`
        : '<span class="dim">–</span>';
  function digestCard(n, when) {
    const d = n.data,
      me = club() ? club().id : null,
      comp = S().comps[d.comp];
    let our = '';
    if (d.mine) {
      const home = d.mine.h === me,
        gf = home ? d.mine.hg : d.mine.ag,
        ga = home ? d.mine.ag : d.mine.hg,
        opp = TM(home ? d.mine.a : d.mine.h);
      const r = gf > ga ? ['W', 'var(--good)'] : gf < ga ? ['L', 'var(--bad)'] : ['D', 'var(--ink3)'];
      our = `<div class="big"><span class="wdl" style="background:${r[1]}">${r[0]}</span><div class="grow" style="min-width:0"><div class="b ellip">${gf}–${ga} v ${opp ? esc(opp.name) : '?'} (${home ? 'H' : 'A'})</div><div class="small dim">Now ${U.ordinal(d.pos)} ${arrow(d.move)} · ${d.pts} pts${d.top ? ` · ${d.gap ? `${d.gap} clear` : 'top on goal difference'}` : ` · ${d.gap ? `${d.gap} behind the leaders` : 'level on points with the leaders'}`}${d.safety != null ? ` · ${d.inZone ? (d.safety < 0 ? `${-d.safety} pts from safety` : 'in the drop zone on goal difference') : d.safety > 0 ? `${d.safety} pts clear of the drop zone` : 'level on points with the drop zone'}` : ''}</div></div></div>`;
    } else
      our = `<div class="small dim" style="margin-top:6px">No league game for us this round. We're ${U.ordinal(d.pos)} ${arrow(d.move)} on ${d.pts} pts.</div>`;
    const table = `<div class="dsec">${d.table.map(([id, pts, mv], i) => `<div class="dr ${id === me ? 'me' : ''}"><span style="width:18px" class="dim">${i + 1}</span>${C.crest(TM(id), 16)}<span class="grow ellip">${esc(TM(id).name)}</span>${arrow(mv)}<b style="width:28px;text-align:right">${pts}</b></div>`).join('')}${d.pos > d.table.length ? `<div class="dr me"><span style="width:18px">${d.pos}</span>${C.crest(TM(me), 16)}<span class="grow ellip">${esc(TM(me).name)}</span>${arrow(d.move)}<b style="width:28px;text-align:right">${d.pts}</b></div>` : ''}</div>`;
    const results = `<div class="dsec"><div class="tiny b dim">RESULTS</div><div class="res">${d.results
      .map(([h, a, hg, ag]) => {
        const m = h === me || a === me ? 'me' : '';
        return `<span class="ellip ${m}" style="text-align:right">${esc(TM(h).short)}</span><b class="${m}">${hg}–${ag}</b><span class="ellip ${m}">${esc(TM(a).short)}</span>`;
      })
      .join('')}</div></div>`;
    const P2 = (id) => S().players[id];
    const lines = [...d.notes];
    if (d.star && P2(d.star[0]))
      lines.push(
        `⭐ Star of the round: ${W.name(P2(d.star[0]))}${d.star[1] ? ` — ${d.star[1]} goal${d.star[1] > 1 ? 's' : ''}` : ''}${d.star[2] ? `${d.star[1] ? ',' : ' —'} ${d.star[2]} assist${d.star[2] > 1 ? 's' : ''}` : ''}`,
      );
    if (d.scorer && P2(d.scorer[0]))
      lines.push(
        `👟 Top scorer: ${W.name(P2(d.scorer[0]))} (${TM(P2(d.scorer[0]).clubId) ? TM(P2(d.scorer[0]).clubId).short : '—'}) — ${d.scorer[1]} this season`,
      );
    const clubShort = (p) => (TM(p.clubId) ? TM(p.clubId).short : '—');
    if (d.hot && P2(d.hot[0]))
      lines.push(
        `🔥 In form: ${W.name(P2(d.hot[0]))} (${clubShort(P2(d.hot[0]))}) — ${d.hot[1].toFixed(1)} average over his last 3`,
      );
    if (d.cold && P2(d.cold[0]))
      lines.push(
        `🧊 Out of form: ${W.name(P2(d.cold[0]))} (${clubShort(P2(d.cold[0]))}) — ${d.cold[1].toFixed(1)} average over his last 3`,
      );
    if (d.next && TM(d.next.h) && TM(d.next.a)) {
      const home = d.next.h === me;
      lines.push(
        `➡️ Next: ${TM(home ? d.next.a : d.next.h).name} (${home ? 'H' : 'A'}) · matchday ${d.next.round + 1}`,
      );
    }
    return `<div class="news digest" data-nid="${n.id}"><div class="nh">${n._new ? '<span class="dot" title="New"></span>' : ''}🗞️ Matchday digest<span class="grow"></span><span>${when}</span></div><div class="nb"><div class="nt">${esc(n.title)}</div>${our}${table}${results}${lines.length ? `<div class="dsec">${lines.map((l) => `<div class="small" style="padding:2px 0">${esc(l)}</div>`).join('')}</div>` : ''}${comp ? `<div style="margin-top:10px"><button class="btn sm" data-act="digestTable" data-id="${d.comp}">Full table ›</button></div>` : ''}</div></div>`;
  }
  UI.acts.digestTable = (d) => {
    UI.sub.league = d.id;
    UI.go('league');
  };

  UI.acts.medical = (d) => {
    const n = S().news.find((x) => x.id === d.id);
    FM.Injury.resolve(n, +d.i);
    UI.save();
    UI.render();
  };
  UI.acts.meet = (d) => {
    const n = S().news.find((x) => x.id === d.id);
    FM.People.resolveMeeting(n, +d.i);
    UI.save();
    UI.render();
  };
  UI.acts.press = (d) => {
    const n = S().news.find((x) => x.id === d.id);
    FM.Stories.applyPress(n, +d.i);
    UI.save();
    UI.render();
  };
  UI.acts.bid = (d) => {
    const n = S().news.find((x) => x.id === d.id);
    n.reply = FM.Transfers.respondBid(n, d.v === '1');
    UI.toast(n.reply);
    UI.save();
    UI.render();
  };
  UI.acts.share = (d) => UI.shareStory(S().news.find((x) => x.id === d.id));
  UI.acts.advance = async () => {
    const r = await FM.SimRunner.run('day');
    if (r) UI.afterDay(r.summary);
  };
  // Sim through days without a match of ours; stop for our next fixture, a decision in the feed, or the season's end
  UI.acts.skipToMatch = async () => {
    const r = await FM.SimRunner.run('toMatch');
    if (!r) return;
    UI.afterDay(r.summary);
    if (!r.summary)
      UI.toast(
        `⏩ ${r.n} day${r.n === 1 ? '' : 's'} simulated${r.newOffer ? ' — a new job offer has arrived' : !W.employed() ? ' — no new offers yet' : r.winChange ? (r.win0 ? ' — the transfer window has closed' : ' — the transfer window is open') : r.deadline ? " — it's deadline day" : r.pending ? ' — a decision is waiting in the feed' : ''}`,
        3500,
      );
  };
  UI.acts.preview = () => FM.MatchView.preview();

  UI.afterDay = function (summary) {
    UI.save(); // uses the save the simulation worker already packed
    if (summary) UI.seasonReview(summary);
    UI.render();
    // Rendering marks feed items read; save that a moment later rather than blocking the screen now
    clearTimeout(UI._saveT);
    UI._saveT = setTimeout(() => UI.save(), 2500);
  };

  // Out of work: offers from clubs in your reputation range, time passing while you wait, the world's news
  function unemployedView() {
    if (UI.sub.feed === 'club' || UI.sub.feed === 'reply') UI.sub.feed = 'all';
    const s = S(),
      u = s.user,
      un = u.unemployed || {},
      now = FM.Season.dayIndex();
    const from = un.from && CL(un.from),
      fresh = un.since === s.year && s.day - (un.day || 0) <= 2;
    const title =
      un.reason === 'sacked' && fresh
        ? "You've been sacked."
        : un.reason === 'start' && !u.stats.games
          ? 'Your career starts here.'
          : 'Looking for your next job';
    const line =
      un.reason === 'sacked' && fresh && from
        ? `The board at ${esc(from.name)} have lost patience. Football is cruel — but your reputation still opens doors.`
        : un.reason === 'start' && !u.stats.games
          ? 'No club yet. Clubs in your reputation range will make offers — the struggling ones call first. Take one, or wait for a better one.'
          : `Out of work${from ? ` since leaving ${esc(from.name)}` : ''}. Offers arrive every few days and last about a week.`;
    const fx = FM.Season.userFixture(); // a national team job carries on while you are between clubs
    const offers = (u.offers || []).filter((o) => CL(o.id));
    const card = (o) => {
      const c = CL(o.id),
        comp = s.comps[c.comp],
        obj = FM.Season.objectives(c)[0],
        days = Math.max(1, o.until - now);
      return `<div class="card"><div class="row">${C.crest(c, 42)}<div class="grow" style="min-width:0"><div class="b ellip">${esc(c.name)}</div><div class="small dim ellip">${comp ? `${esc(comp.name)}${comp.table[c.id] && comp.table[c.id].p ? ` · ${U.ordinal(W.position(c.id))}` : ''}` : ''} · ${D.IDENTITY[c.identity].icon} ${D.IDENTITY[c.identity].label}</div></div><span class="pill">Rep ${Math.round(c.rep)}</span></div>
        <div class="small muted" style="margin-top:8px;line-height:1.5">${o.why === 'struggling' ? 'Struggling and wants a change.' : o.why === 'step up' ? 'A step up for you.' : 'A fresh start.'}${obj ? ` The board expect you to: ${esc(obj.text.toLowerCase())}.` : ''} Budget ${U.money(c.budget || 0)}.</div>
        <div class="row" style="margin-top:10px;gap:8px"><span class="tiny dim grow">Offer open for about ${days} day${days === 1 ? '' : 's'}</span><button class="btn sm" data-act="clubView" data-id="${c.id}">Look closer</button><button class="btn sm pri" data-act="takeJob" data-id="${c.id}">Accept</button></div></div>`;
    };
    return `<div class="hero" style="--c1:${un.reason === 'sacked' && fresh ? '#5b0b12' : '#1b2533'};--c2:#0c1118"><div class="tag">${un.reason === 'sacked' && fresh ? 'Breaking' : 'Out of work'}</div><div class="h1" style="margin:10px 0">${title}</div><div class="small" style="opacity:.85">${line}</div>
        <div class="small" style="opacity:.75;margin-top:8px">Reputation ${Math.round(u.rep)} · ${esc(u.badges)} licence${u.nation && s.nteams && s.nteams[u.nation] ? ` · ${esc(s.nteams[u.nation].name)} manager` : ''}</div>
        <div class="row" style="gap:8px;margin-top:14px">${fx ? '<button class="play grow" data-act="preview">▶ MATCHDAY</button>' : '<button class="play grow" data-act="advance">Advance ▶</button><button class="play grow" style="background:rgba(255,255,255,.14);color:#fff" data-act="skipToMatch">⏩ Wait for an offer</button>'}</div></div>
      <div class="sec"><div class="h3">Job offers</div><span class="dim small">${offers.length ? `${offers.length} on the table` : ''}</span></div>
      ${offers.map(card).join('') || '<div class="empty">No offers right now. Keep waiting — clubs in your range will call.</div>'}
      <div class="sec"><div class="h3">The Feed</div></div>
      ${chips('feed', [
        ['all', 'All'],
        ['stories', 'Stories'],
        ['following', '⭐ Following'],
        ['world', 'World'],
        ['transfers', 'Transfers'],
      ])}
      ${UI.sub.feed === 'world' ? chips('wnews', WNEWS) : ''}
      ${feed()}`;
  }
  UI.acts.takeJob = (d) => {
    const s = S(),
      prev = s.user.unemployed || {},
      from = prev.from && CL(prev.from);
    if (!CL(d.id)) return;
    W.takeCharge(d.id, s.user.name, false);
    FM.Stories.share({
      kicker: 'NEW JOB',
      title: `${s.user.name} takes over at ${CL(d.id).name}`,
      sub: from ? `A fresh start after leaving ${from.name}.` : 'The first job of a new career.',
      big: '🤝',
      clubId: d.id,
    });
    UI.closeAllSheets();
    UI.tab = 'home';
    UI.sub.feed = 'club';
    UI.save();
    UI.render();
    UI.toast(`Welcome to ${CL(d.id).name}`);
  };

  // ---------- Share story as image ----------
  UI.shareStory = async function (n) {
    const c = CL(n.clubId) || club() || NOCLUB;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1350;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1080, 1350);
    g.addColorStop(0, c.colors[0]);
    g.addColorStop(0.5, c.colors[0]);
    g.addColorStop(1.3, c.colors[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, 1080, 1350);
    x.save();
    x.rotate(-0.4);
    x.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = -20; i < 40; i++) x.fillRect(i * 110, -600, 50, 3000);
    x.restore();
    const sh = x.createLinearGradient(0, 400, 0, 1350);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,.75)');
    x.fillStyle = sh;
    x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = '#fff';
    x.fillRect(60, 60, 40 + n.kicker.length * 26, 64);
    x.fillStyle = '#0b0f14';
    x.font = '900 34px Inter, sans-serif';
    x.fillText(n.kicker, 80, 105);
    x.fillStyle = '#fff';
    x.font = '900 260px "Barlow Condensed", Impact, sans-serif';
    x.fillText(n.big, 60, 830);
    x.font = '800 84px "Barlow Condensed", Impact, sans-serif';
    const wrap = (t, maxW, lh, y) => {
      const words = t.toUpperCase().split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (x.measureText(test).width > maxW && line) {
          x.fillText(line, 60, y);
          y += lh;
          line = w;
        } else line = test;
      }
      x.fillText(line, 60, y);
      return y;
    };
    let y = wrap(n.title, 960, 84, 960);
    x.font = '500 38px Inter, sans-serif';
    x.globalAlpha = 0.9;
    const words = n.sub.split(' ');
    let line = '';
    y += 70;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > 960 && line) {
        x.fillText(line, 60, y);
        y += 50;
        line = w;
      } else line = t;
    }
    x.fillText(line, 60, y);
    x.globalAlpha = 0.85;
    x.font = '800 30px Inter, sans-serif';
    x.fillText('TOUCHLINE STORIES', 60, 1290);
    x.textAlign = 'right';
    x.fillText(`${c.short} · ${n.year}`, 1020, 1290);
    cv.toBlob(async (blob) => {
      const r = await FM.Native.shareFile({ blob, name: 'touchline-story.png', type: 'image/png', title: n.title });
      if (r === 'saved') UI.toast('Story image saved');
    });
  };

  // ======================= SQUAD =======================
  UI.screens.squad = function () {
    const tab = UI.sub.squad;
    return (
      chips('squad', [
        ['list', 'Squad'],
        ['tactics', 'Tactics'],
        ['academy', 'Academy'],
        ['training', 'Training'],
        ['analytics', 'Analytics'],
      ]) +
      (tab === 'tactics'
        ? tacticsView()
        : tab === 'academy'
          ? academyView()
          : tab === 'training'
            ? UI.trainingView()
            : tab === 'analytics'
              ? UI.analyticsView()
              : squadView())
    );
  };
  UI._sq = { sort: 'pos', filter: 'all' };
  const SQ_SORT = {
    pos: ['Position', (a, b) => b.ca - a.ca],
    ca: ['Rating', (a, b) => b.ca - a.ca],
    fit: ['Fitness', (a, b) => a.fitness - b.fitness],
    age: ['Age', (a, b) => W.age(a) - W.age(b)],
    wage: ['Wage', (a, b) => b.wage - a.wage],
    contract: ['Contract', (a, b) => a.contract - b.contract || b.ca - a.ca],
    form: [
      'Form',
      (a, b) => (b.form.length ? U.avg(b.form.slice(-5)) : 0) - (a.form.length ? U.avg(a.form.slice(-5)) : 0),
    ],
  };
  const SQ_FILTER = {
    all: ['All', () => true],
    xi: ['Starting XI', (p, xi) => xi.has(p.id)],
    avail: ['Available', (p) => W.available(p)],
    out: ['Injured / banned', (p) => !W.available(p)],
    tired: ['Tired (<75%)', (p) => p.fitness < 75],
    expiring: ['Contract ending', (p) => p.contract <= S().year + 1],
    young: ['21 & under', (p) => W.age(p) <= 21],
  };
  UI.acts.sqSort = (d) => {
    UI._sq.sort = d.v;
    UI.render();
  };
  UI.acts.sqFilter = (d) => {
    UI._sq.filter = d.v;
    UI.render();
  };
  // Contract end: highlighted in the final season, amber with one season to go
  // Shown first on the line (rows truncate at the end); ordinary contract years only when sorting by contract
  const contractTag = (p, all) => {
    const y = S().year;
    return p.loan
      ? ''
      : p.contract <= y
        ? `<span class="tiny b" style="color:var(--bad)">⏳ Expires</span>`
        : p.contract === y + 1
          ? `<span class="tiny b" style="color:var(--warn)">to ${p.contract}</span>`
          : all
            ? `<span class="tiny dim">to ${p.contract}</span>`
            : '';
  };
  function squadView() {
    const sq = W.squad(club().id),
      q = UI._sq;
    const groups = [
      ['GK', 'Goalkeepers'],
      ['DEF', 'Defenders'],
      ['MID', 'Midfielders'],
      ['ATT', 'Attackers'],
    ];
    const { xi } = W.pickXI(club().id, S().user.tactic);
    const starters = new Set(xi.filter(Boolean).map((p) => p.id));
    const foreign = sq.filter((p) => p.nat !== club().nat).length;
    const expiring = sq.filter((p) => !p.loan && p.contract <= S().year).length;
    const extra = (p) =>
      `${q.sort === 'wage' ? ` · ${U.money(p.wage)}/wk` : ''}${starters.has(p.id) ? ' · <span style="color:var(--acc)">XI</span>' : ''}${p.form.length ? ' · ' + U.avg(p.form.slice(-5)).toFixed(1) + ' avg' : ''}`;
    const list = sq.filter((p) => SQ_FILTER[q.filter][1](p, starters)).sort(SQ_SORT[q.sort][1]);
    const chipsRow = (act, cur, map) =>
      `<div class="chips noswipe">${Object.entries(map)
        .map(
          ([k, [l]]) => `<button class="chip ${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>`;
    const body =
      q.sort === 'pos'
        ? groups
            .map(([g, l]) => {
              const ps = list.filter((p) => D.POS_GROUP[p.pos] === g);
              return ps.length
                ? `<div class="sec"><div class="h3">${l}</div><span class="dim small">${ps.length}</span></div><div class="card flat list" style="padding:4px 12px">${ps.map((p) => C.playerRow(p, extra(p), contractTag(p, q.sort === 'contract'))).join('')}</div>`
                : '';
            })
            .join('')
        : `<div class="card flat list" style="padding:4px 12px">${list.map((p) => C.playerRow(p, extra(p), contractTag(p, q.sort === 'contract'))).join('')}</div>`;
    return `<div class="row small dim" style="margin:0 2px 8px"><span>${sq.length} players</span><span>·</span><span>Wages ${U.money(U.sum(sq, (p) => p.wage))}/wk</span><span class="grow"></span><span>Foreign ${foreign}${FM.Reg.real() ? '' : ` (${W.foreignLimitText()} in squad)`}</span></div>${UI.regLine(club())}
      ${expiring ? `<button class="warnline tap" style="width:100%;text-align:left;border:0" data-act="sqFilter" data-v="expiring">⏳ ${expiring} contract${expiring === 1 ? '' : 's'} expire this season — unsigned players leave on a free. Show them ›</button>` : ''}
      <div class="small b dim" style="margin:4px 2px 0">SORT</div>${chipsRow('sqSort', q.sort, SQ_SORT)}<div class="small b dim" style="margin:0 2px">SHOW</div>${chipsRow('sqFilter', q.filter, SQ_FILTER)}
      ${list.length ? body : '<div class="empty">No players match this filter.</div>'}`;
  }
  function academyView() {
    const c = club();
    const grads = W.squad(c.id).filter((p) => p.youth === c.id);
    return `<div class="card"><div class="row"><div class="grow"><div class="h3">Youth Academy</div><div class="small dim">Level ${c.facilities.academy} · Intake arrives around matchday ${Math.round(((D.YOUTH_ROUND + 1) / 22) * (FM.S.comps[c.comp] && FM.S.comps[c.comp].fixtures ? FM.S.comps[c.comp].fixtures.length : 22))}</div></div><div class="lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= c.facilities.academy ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="small muted" style="margin-top:8px">Academy graduates in squad: <b>${grads.length}</b> · Youth debuts under you: <b>${S().user.stats.youthDebuts}</b></div></div>
      ${UI.youthSides(c)}`;
  }

  // ---------- Tactics ----------
  // The tactic being edited: Plan A (the one matches start with) or Plan B (switch to it in a match)
  const TT = () => (UI._planB ? W.secondTactic() : S().user.tactic);
  function tacticsView() {
    const T = TT(),
      c = club();
    const slots = D.FORMATIONS[T.formation];
    const { xi, bench } = W.pickXI(c.id, T);
    const sel = UI._slot;
    const arm = FM.Matchday.armband(
      { club: c },
      xi.filter(Boolean).map((p) => ({ p })),
    );
    const dots = slots
      .map((s, i) => {
        const p = xi[i];
        const fit = p ? W.fitAt(p, s.t, s, T.roles[i]) : 0;
        return `<div class="slot-dot ${sel === i ? 'sel' : ''}" style="left:${U.clamp(s.y * 100, 11, 89)}%;top:${s.t === 'GK' ? 90 : Math.min(74, 6 + (1 - (s.x - 0.04) / 0.76) * 80)}%" data-act="slot" data-i="${i}"><div class="d" style="background:${c.colors[0]};color:${U.ink(c.colors[0])};${fit < 0.8 ? 'border-color:var(--warn)' : ''}">${p ? Math.round(p.ca) : '—'}</div><div class="n">${p && p === arm ? '<b class="capt">C</b>' : ''}${p ? esc(p.ln) : 'Empty'}</div>${p ? `<div class="fr"><div class="f"><i style="width:${Math.round(p.fitness)}%;background:${C.fitColor(p.fitness)}"></i></div><span style="color:${C.fitColor(p.fitness)}">${Math.round(p.fitness)}%</span></div>` : ''}<div class="r">${D.slotLabel(s)} · ${esc(T.roles[i])}</div></div>`;
      })
      .join('');
    const seg = (k, vals) =>
      `<div class="seg" style="margin-top:6px">${vals.map((v) => `<button class="${T[k] === v ? 'on' : ''}" data-act="tac" data-k="${k}" data-v="${v}">${v.replace(' Press', '').replace(' Block', '')}</button>`).join('')}</div>`;
    const planB = !!UI._planB,
      A = S().user.tactic,
      B = S().user.tactic2;
    const plans = `<div class="seg" style="margin-bottom:6px"><button class="${planB ? '' : 'on'}" data-act="tacPlan" data-v="A">Plan A · ${Math.round(A.fam ?? 60)}%</button><button class="${planB ? 'on' : ''}" data-act="tacPlan" data-v="B">Plan B${B ? ` · ${Math.round(B.fam ?? 40)}%` : ''}</button></div>
      <div class="tiny dim" style="margin:0 2px 10px">${planB ? 'Plan B: switch to it during a match from Tactics. It has its own familiarity, which grows when you use it.' : 'Plan A starts every match. Set up a Plan B to switch to during a match (a chase, or shutting up shop).'}${planB ? ` <button class="btn sm" data-act="swapPlans">Make Plan B the starting plan</button>` : ''}</div>`;
    return `${plans}<div class="chips">${Object.keys(D.FORMATIONS)
      .map(
        (f) => `<button class="chip ${T.formation === f ? 'on' : ''}" data-act="formation" data-v="${f}">${f}</button>`,
      )
      .join('')}</div>
      <div class="row small dim" style="margin:-4px 2px 8px"><span>${D.shapeOf(T.formation)}</span><span>·</span><span>XI avg ${Math.round(U.avg(xi.filter(Boolean), (p) => p.ca))}</span><span>·</span><span>Familiarity ${Math.round(T.fam ?? 60)}%</span><span class="grow"></span><button class="btn sm" data-act="autoXI">Auto-pick</button></div>
      <div class="tpitch noswipe">${dots}</div>
      <div class="small dim center" style="margin:6px 0 12px">Tap a player to change him or his role. Orange ring = out of position. Bar = match fitness — auto-pick rests tired players.</div>
      <div class="card"><div class="h3">Build-up</div>${seg('buildup', D.BUILDUP)}
        <div class="h3" style="margin-top:14px">Pressing</div>${seg('press', D.PRESS)}
        <div class="h3" style="margin-top:14px">Width</div>${seg('width', D.WIDTH)}
        <div class="row" style="margin-top:14px"><div class="grow"><div class="h3">Inverted full-backs</div><div class="small dim">Full-backs step into midfield in possession</div></div><button class="btn sm ${T.invFB ? 'pri' : ''}" data-act="invfb">${T.invFB ? 'On' : 'Off'}</button></div>
        <div class="small muted" style="margin-top:12px;line-height:1.5">${tacticHint(T)}</div></div>
      ${leadershipCard(xi, arm)}
      <div class="sec"><div class="h3">Bench</div></div><div class="card flat list" style="padding:4px 12px">${bench.map((p) => C.playerRow(p)).join('')}</div>`;
  }
  function tacticHint(T) {
    const b = {
      Short: 'Patient short passing — good control, fewer but better chances.',
      Direct: 'Get it forward quickly — more crosses and long shots.',
      Counter: 'Absorb and break — deadly against high-pressing teams.',
      Possession: 'Dominate the ball — starves opponents, can lack cutting edge.',
      'Wing Play': 'Get it wide and into the box — lots of crosses; a Target Man feasts on them.',
    }[T.buildup];
    const w = {
      Narrow: 'Narrow: through the middle, more through balls — but it leaves the flanks to them.',
      Wide: 'Wide: stretch them and cross.',
    }[T.width || 'Balanced'];
    const p = {
      'High Press': 'High press wins the ball high up but tires legs and leaves space behind.',
      'Mid Block': 'Balanced mid block.',
      'Low Block': 'Deep block — hard to break down, but invites pressure.',
    }[T.press];
    return `💡 ${b} ${p}${w ? ' ' + w : ''}`;
  }
  // ---------- Captain & set-piece takers ----------
  const spNum = (v) =>
    `<span class="b" style="width:26px;text-align:right;color:${v >= 15 ? 'var(--good)' : v >= 11 ? 'var(--ink)' : 'var(--warn)'}">${Math.round(v)}</span>`;
  function leadershipCard(xi, arm) {
    const Md = FM.Matchday,
      T = S().user.tactic,
      c = club();
    const capt = Md.captainOf(c.id);
    const row = (act, k, icon, label, p, note, right) =>
      `<div class="prow tap" data-act="${act}" ${k ? `data-k="${k}"` : ''}><span style="width:22px;text-align:center">${icon}</span><div class="grow" style="min-width:0"><div class="small dim">${label}</div><div class="b ellip">${p ? esc(W.name(p)) : '—'}</div>${note ? `<div class="tiny dim">${note}</div>` : ''}</div>${right || ''}<span class="dim">›</span></div>`;
    const captNote = !capt
      ? ''
      : `${Md.leadWord(capt)}${W.hasTrait(capt, 'Leader') ? ' · 🎖️ Leader' : ''}${T.capt ? '' : ' · chosen by the squad'}${arm && arm !== capt ? ` · not in the XI — ${esc(W.short(arm))} wears the armband` : ''}`;
    const sp = Object.entries(Md.SP)
      .map(([k, d]) => {
        const t = Md.takerFor(c.id, k, xi),
          id = T.sp && T.sp[k];
        const note =
          id && !t.chosen && S().players[id]
            ? `${esc(W.short(S().players[id]))} isn't in the XI — ${t.p ? esc(W.short(t.p)) : 'best available'} takes them`
            : t.chosen
              ? 'Your choice'
              : 'Auto — best on the pitch';
        return row('spPick', k, d.icon, d.label, t.p, note, t.p ? spNum(Md.spScore(t.p, k)) : '');
      })
      .join('');
    return `<div class="sec"><div class="h3">Captain & set pieces</div></div><div class="card flat list" style="padding:4px 12px">${row('captPick', '', '©', 'Captain', capt, captNote)}${sp}</div>
      <div class="small dim" style="margin:-4px 2px 12px;line-height:1.5">A strong captain lifts the side and softens defeats; a Leader keeps heads level in team talks. Numbers are set-piece ability out of 20.</div>`;
  }
  UI.acts.captPick = () => {
    const Md = FM.Matchday,
      c = club(),
      capt = Md.captainOf(c.id),
      T = S().user.tactic;
    // Regular starters first (the squad's own pick comes from them), then everyone else
    const regs = new Set(
      W.squad(c.id)
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 16),
    );
    const list = W.squad(c.id)
      .sort((a, b) => regs.has(b) - regs.has(a) || Md.captainScore(b) - Md.captainScore(a))
      .slice(0, 22);
    UI.sheet(
      `<div class="small muted" style="margin-bottom:8px;line-height:1.5">The new captain gets a morale boost; the one who loses the armband may take it badly. Changing again within a few weeks unsettles the squad.</div>
      <div class="list">${list.map((p) => `<div class="prow tap" data-act="setCapt" data-id="${p.id}">${C.pos(p)}<div class="grow" style="min-width:0"><div class="b ellip">${esc(W.name(p))}${p === capt ? ' ©' : ''}</div><div class="small dim">${Md.leadWord(p)}${W.hasTrait(p, 'Leader') ? ' · 🎖️ Leader' : ''} · ${W.age(p)} yrs · ${(W.spell(p) && W.spell(p).apps) || 0} apps${regs.has(p) ? '' : ' · fringe'}</div></div><b style="margin-right:6px">${Math.round(p.ca)}</b><span title="Morale">${W.moraleLabel(p.morale)[1]}</span></div>`).join('')}</div>
      ${T.capt ? `<button class="btn block" style="margin-top:10px" data-act="setCapt" data-id="">Let the squad decide</button>` : ''}`,
      { title: 'Choose your captain' },
    );
  };
  UI.acts.setCapt = (d) => {
    const T = S().user.tactic;
    UI.closeSheet();
    if (!d.id) {
      T.capt = null;
      T.captAuto = null; // the squad chooses afresh
      UI.save();
      UI.render();
      return UI.toast('The squad will pick the captain');
    }
    const msg = FM.Matchday.setCaptain(d.id);
    UI.save();
    UI.render();
    UI.toast(msg, 3500);
  };
  UI.acts.spPick = (d) => {
    const Md = FM.Matchday,
      k = d.k,
      c = club(),
      T = S().user.tactic;
    const { xi } = W.pickXI(c.id, T),
      inXI = new Set(xi.filter(Boolean).map((p) => p.id));
    const cur = Md.takerFor(c.id, k, xi);
    const list = W.squad(c.id)
      .filter((p) => p.pos !== 'GK')
      .sort((a, b) => inXI.has(b.id) - inXI.has(a.id) || Md.spScore(b, k) - Md.spScore(a, k));
    UI.sheet(
      `<div class="small muted" style="margin-bottom:8px">If your taker isn't on the pitch, the best one who is steps up.</div>
      <button class="btn block ${T.sp && T.sp[k] ? '' : 'pri'}" style="margin-bottom:10px" data-act="setSp" data-k="${k}" data-id="">Auto — best on the pitch</button>
      <div class="list">${list.map((p) => `<div class="prow tap" data-act="setSp" data-k="${k}" data-id="${p.id}">${C.pos(p)}<div class="grow" style="min-width:0"><div class="b ellip">${esc(W.name(p))}${cur.chosen && cur.p === p ? ' ✓' : ''}</div><div class="small dim">${inXI.has(p.id) ? 'In the XI' : W.available(p) ? 'Not in the XI' : 'Unavailable'}</div></div>${spNum(Md.spScore(p, k))}</div>`).join('')}</div>`,
      { title: Md.SP[k].label },
    );
  };
  UI.acts.setSp = (d) => {
    const T = S().user.tactic,
      Md = FM.Matchday;
    T.sp = Object.assign({}, T.sp, { [d.k]: d.id || null });
    UI.closeSheet();
    UI.save();
    UI.render();
    UI.toast(
      d.id
        ? `${W.short(S().players[d.id])} takes the ${Md.SP[d.k].label.toLowerCase()}`
        : `${Md.SP[d.k].label}: best on the pitch`,
    );
  };
  UI.acts.tacPlan = (d) => {
    UI._planB = d.v === 'B';
    if (UI._planB) W.secondTactic();
    UI._slot = null;
    UI.save();
    UI.render();
  };
  UI.acts.swapPlans = () => {
    W.swapTactics();
    UI._planB = false;
    UI.save();
    UI.render();
    UI.toast('Plan B is now Plan A: matches start with it');
  };
  UI.acts.formation = (d) => {
    const T = TT();
    T.formation = d.v;
    T.roles = W.defaultRoles(d.v);
    T.lineup = null;
    UI._slot = null;
    UI.save();
    UI.render();
  };
  UI.acts.tac = (d) => {
    TT()[d.k] = d.v;
    UI.save();
    UI.render();
  };
  UI.acts.invfb = () => {
    const T = TT();
    T.invFB = !T.invFB;
    UI.save();
    UI.render();
  };
  UI.acts.autoXI = () => {
    const T = TT(),
      id = club().id;
    T.lineup = null;
    // Compare with a pick that ignores fitness: whoever drops out was rested
    const withFit = new Set(
      W.pickXI(id, T)
        .xi.filter(Boolean)
        .map((p) => p.id),
    );
    const fp = W.fitnessPick;
    W.fitnessPick = () => 1;
    const noFit = W.pickXI(id, T).xi.filter(Boolean);
    W.fitnessPick = fp;
    const rested = noFit.filter((p) => !withFit.has(p.id));
    // ...and gives each starter the role that suits him
    const { xi } = W.pickXI(id, T);
    T.roles = FM.bestRoles(xi, D.FORMATIONS[T.formation], W.defaultRoles(T.formation));
    UI.save();
    UI.render();
    UI.toast(
      rested.length
        ? `Best XI, bench and roles set — ${rested.length} rested for fitness: ${rested.map((p) => `${W.short(p)} (${Math.round(p.fitness)}%)`).join(', ')}`
        : 'Best XI, bench and roles set — everyone is fit enough to start',
      4000,
    );
  };
  UI.acts.slot = (d) => UI.slotPicker(+d.i);
  UI.slotPicker = function (i, inMatch) {
    const T = TT(),
      c = club(),
      s = D.FORMATIONS[T.formation][i];
    const { xi } = W.pickXI(c.id, T);
    const cur = xi[i];
    const roles = Object.keys(D.ROLES[s.t]);
    const cands = W.squad(c.id)
      .filter((p) => (s.t === 'GK') === (p.pos === 'GK'))
      .sort((a, b) => W.effAt(b, s.t, s, T.roles[i]) - W.effAt(a, s.t, s, T.roles[i]));
    UI.sheet(
      `<div class="h3">Role</div><div class="chips" style="margin-top:8px;flex-wrap:wrap">${roles.map((r) => `<button class="chip ${T.roles[i] === r ? 'on' : ''}" data-act="role" data-i="${i}" data-v="${r}">${r}</button>`).join('')}</div>
      <div class="tiny dim" style="margin:-2px 2px 8px">${esc((D.ROLES[s.t][T.roles[i]] || {}).desc || '')}${['FB', 'WB', 'W'].includes(s.t) && D.slotSide(s) ? ` · ${D.slotSide(s) === 'L' ? 'Left' : 'Right'} flank: ${s.t === 'W' && (D.ROLES.W[T.roles[i]] || {}).inv ? 'best with a ' + (D.slotSide(s) === 'L' ? 'right' : 'left') + '-footer cutting inside' : 'best with a ' + (D.slotSide(s) === 'L' ? 'left' : 'right') + '-footer'}` : ''}</div>
      <div class="h3" style="margin-top:6px">Player</div><div class="list">${cands
        .map((p) => {
          const inXI = xi.findIndex((q) => q && q.id === p.id);
          const fit = W.fitAt(p, s.t, s, T.roles[i]);
          const tag = !W.available(p)
            ? p.inj
              ? '🚑 Injured'
              : '🟥 Suspended'
            : inXI === i
              ? 'Selected'
              : inXI >= 0
                ? 'In XI (swap)'
                : '';
          return `<div class="prow tap" data-act="pickSlot" data-i="${i}" data-id="${p.id}">${C.pos(p)}<div class="grow"><div class="b ellip">${esc(W.name(p))} ${cur && cur.id === p.id ? '✓' : ''}</div><div class="small dim">${fit >= 1 ? 'Natural' : fit >= 0.8 ? 'Accomplished' : fit >= 0.6 ? 'Awkward' : 'Unfamiliar'}${tag ? ' · ' + tag : ''}</div></div>${C.fitTag(p.fitness)}<div class="b" style="width:26px;text-align:right">${Math.round(W.effAt(p, s.t, s, T.roles[i]))}</div></div>`;
        })
        .join('')}</div>`,
      { title: `${D.slotLabel(s)} · ${D.POS_NAME[s.t] || s.t}` },
    );
  };
  UI.acts.role = (d) => {
    TT().roles[+d.i] = d.v;
    UI.save();
    UI.closeSheet();
    UI.render();
  };
  UI.acts.pickSlot = (d) => {
    const T = TT(),
      c = club(),
      p = P(d.id);
    if (!W.available(p)) return UI.toast(`${W.short(p)} is unavailable`);
    const { xi } = W.pickXI(c.id, T);
    const lineup = xi.map((q) => (q ? q.id : null));
    const i = +d.i,
      j = lineup.indexOf(p.id);
    if (j >= 0) lineup[j] = lineup[i];
    lineup[i] = p.id;
    T.lineup = lineup;
    UI.save();
    UI.closeSheet();
    UI.render();
  };

  // ======================= PLAYER CARD =======================
  UI.acts.player = (d) => UI.playerSheet(d.id);
  UI.playerSheet = function (pid) {
    const p = P(pid);
    if (!p) return UI.toast('That player has retired.');
    const wrap = UI.sheet(playerHTML(p), { full: true, title: esc(W.name(p)) });
    const hc = wrap.querySelector('#pheat');
    if (hc) C.heat(hc, p.clubId === S().user.clubId && p._heat ? p._heat : C.posHeat(p));
    const rep = S().user.reports[pid];
    if (rep) rep.isNew = false;
  };
  UI.playerHTML = (p) => playerHTML(p);
  // Second positions he can play (learned, or from the start): "also DM, FB (learning)"
  const altLine = (p) => {
    const alt = Object.entries(p.alt || {})
      .filter(([, v]) => v >= 0.8)
      .sort((a, b) => b[1] - a[1])
      .map(([t, v]) => `${t}${v < 0.9 ? ' (learning)' : ''}`);
    return alt.length ? ` · also ${alt.join(', ')}` : '';
  };
  function playerHTML(p) {
    const v = FM.Scouting.view(p),
      c = p.clubId && CL(p.clubId),
      own = v.own;
    const col = c ? c.colors[0] : '#334155';
    const age = W.age(p);
    const [ml, me] = W.moraleLabel(p.morale);
    const avg = p.season.apps ? (p.season.rsum / p.season.apps).toFixed(2) : '—';
    const attrs = () => {
      if (!(own || v.k >= 40))
        return `<div class="lock">🔒 Attributes unknown — assign a scout to learn more (${Math.round(v.k)}% known)</div>`;
      const unc = own ? 0 : Math.round((1 - v.k / 100) * 6);
      return Object.entries(D.ATTR_GROUPS)
        .filter(([g]) => g !== 'Goalkeeping' || p.pos === 'GK')
        .map(
          ([g, ks]) =>
            `<div class="small b dim" style="margin:10px 0 2px;text-transform:uppercase;letter-spacing:.6px">${g}</div><div class="attr-grid">${ks
              .map((k) => {
                const val = Math.round(p.attrs[k]);
                const shown = unc ? `${Math.max(1, val - unc)}–${Math.min(20, val + unc)}` : val;
                return `<div class="attr"><span class="muted">${D.ATTR_LABEL[k]}</span><span class="v ${unc ? '' : C.vcls(val)}">${shown}</span></div>`;
              })
              .join('')}</div>`,
        )
        .join('');
    };
    const report = own ? '' : UI.reportCard(p, v);
    const ownActions = own
      ? UI.ownActions(p)
      : p.loan
        ? W.isUser(p.loan.from)
          ? UI.loanLine(p)
          : `<div class="warnline">On loan at ${esc(CL(p.clubId).name)} from ${esc(CL(p.loan.from).name)} until the end of the season.</div>`
        : '';
    const history = (p.history || []).slice().reverse();
    // The nation opens its national-team overview (nations without a national team in the world stay plain text)
    const nt = S().nteams && S().nteams['n_' + p.nat];
    const natLink = (html) =>
      nt
        ? `<span class="tap" data-act="nation" data-id="${nt.id}" style="text-decoration:underline dotted">${html}</span>`
        : html;
    return `<div class="pcard-hero" style="--c1:${col}"><div class="row" style="align-items:flex-start"><div class="grow"><div class="tiny b" style="opacity:.85;letter-spacing:1px;text-transform:uppercase">${D.POS_NAME[p.pos]}${altLine(p)} · ${p.foot} foot</div><div class="h1" style="margin-top:6px">${esc(p.fn)}<br>${esc(p.ln)}</div>${own ? '' : `<div style="margin-top:6px">${UI.followBtn('player', p.id, true)}</div>`}<div class="small" style="margin-top:8px;opacity:.9">${natLink(`${C.flag(p.nat)} ${D.NATIONS[p.nat].name}`)} · ${age} yrs${c ? ' · ' + esc(c.name) : ''}</div></div>${c ? C.crest(c, 48) : ''}</div>
      <div class="row" style="margin-top:14px;gap:14px"><div><div class="tiny" style="opacity:.75">ABILITY</div>${C.playerStars(p)}</div><div><div class="tiny" style="opacity:.75">VALUE</div><b>${own || v.k >= 30 ? U.money(p.value) : '?'}</b></div><div><div class="tiny" style="opacity:.75">WAGE</div><b>${own || v.k >= 30 ? U.money(p.wage) + '/wk' : '?'}</b></div>${own ? `<div><div class="tiny" style="opacity:.75">MORALE</div><b>${me} ${ml}</b></div>` : ''}</div></div>
      <div class="sp"></div>
      ${ownActions}
      ${FM.Season.isIcon(p) ? `<div style="margin-bottom:6px"><span class="trait" title="${esc(`${p.career.spells.at(-1).apps} appearances for ${CL(p.clubId).name}`)}">⭐ Club icon</span></div>` : ''}
      ${v.traits.length || own ? `<div style="margin-bottom:8px">${(own ? p.traits : v.traits).map((t) => `<span class="trait" title="${esc(D.TRAITS[t].desc)}">${D.TRAITS[t].icon} ${t}</span>`).join('')}${own ? `<span class="trait">🧠 ${esc(p.personality)}</span>` : ''}</div>` : ''}
      ${own && p.traits.length ? `<div class="small dim" style="margin:-2px 2px 12px">${p.traits.map((t) => D.TRAITS[t].desc).join(' ')}</div>` : ''}
      ${report}
      <div class="card"><div class="row"><div class="h3 grow">Profile</div>${!own && v.k < 70 ? '<span class="pill warn">Approximate</span>' : ''}</div>${own || v.k >= 40 ? C.radar(p, !own && v.k < 70) : '<div class="lock">🔒 Profile hidden</div>'}${attrs()}</div>
      <div class="card"><div class="row"><div class="h3 grow">Form</div><span class="small dim">last ${p.form.length}</span></div>
        <div class="row" style="align-items:flex-end;gap:5px;height:70px;margin-top:10px">${p.form.length ? p.form.map((r) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div class="tiny b">${r.toFixed(1)}</div><div style="width:100%;border-radius:4px;height:${(r - 4) * 8}px;background:${r >= 7.5 ? 'var(--good)' : r >= 6.5 ? 'var(--acc2)' : 'var(--bad)'}"></div></div>`).join('') : '<div class="dim small">No appearances yet.</div>'}</div>
</div>
      ${UI.statsCard(p, avg)}
      <div class="card"><div class="h3" style="margin-bottom:8px">Heat map</div><canvas id="pheat" class="heat" width="480" height="320"></canvas><div class="tiny dim" style="margin-top:6px">${own && p._heat ? 'From his last match' : 'Typical positioning from scouting footage'} · attacking →</div></div>
      <div class="card"><div class="h3">Career</div><div class="row small" style="margin:8px 0"><span class="grow muted">Total</span><b>${p.career.apps} games · ${p.career.goals} goals</b></div>
        ${p.career.spells
          .slice()
          .reverse()
          .map(
            (sp) =>
              `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)">${CL(sp.c) ? C.crest(CL(sp.c), 18) : ''}<span class="grow">${esc(CL(sp.c) ? CL(sp.c).name : '—')}</span><span class="dim">${sp.loan ? 'Loan · ' : sp.fee != null ? `${sp.fee ? U.money(sp.fee) : 'Free'} · ` : ''}${sp.from}–${sp.to || 'now'}</span><b style="margin-left:8px">${sp.apps}/${sp.goals}</b></div>`,
          )
          .join('')}
        ${p.intl && p.intl.caps ? `<div class="row small" style="margin-top:8px"><span class="grow muted">International</span><b>${natLink(`${C.flag(p.nat)} ${p.intl.caps} caps · ${p.intl.goals} goals`)}</b></div>` : ''}
        ${p.honours && p.honours.length ? `<div class="row small" style="margin-top:8px"><span class="grow muted">Honours</span><b>${honoursLine(p)}</b></div>` : ''}
        <div class="row small" style="margin-top:8px"><span class="grow muted">Contract</span><b>until ${p.contract}</b></div></div>
      ${UI.seasonsCard(p, history)}
      ${injuryCard(p)}`;
  }
  // This season's numbers: keepers their own (clean sheets, saves, save %, goals prevented), outfielders theirs,
  // with per-90 figures where they say more than totals
  UI.statsCard = function (p, avg) {
    const st = p.season,
      gk = p.pos === 'GK',
      m = st.mins || 0,
      p90 = (x) => (m >= 270 ? ((x * 90) / m).toFixed(2) : '—');
    const cell = (v, l, sub) =>
      `<div class="kpi" style="padding:8px 4px"><div class="v" style="font-size:18px">${v}</div><div class="l">${l}</div>${sub ? `<div class="tiny dim">${sub}</div>` : ''}</div>`;
    const faced = (st.sv || 0) + (st.ga || 0);
    const cells = gk
      ? [
          cell(st.apps, 'Apps', `${m} mins`),
          cell(st.cs || 0, 'Clean sheets'),
          cell(st.ga || 0, 'Conceded', m >= 270 ? `${p90(st.ga || 0)} per 90` : ''),
          cell(st.sv || 0, 'Saves'),
          cell(faced ? Math.round((100 * (st.sv || 0)) / faced) + '%' : '—', 'Save %'),
          cell(
            faced ? ((st.xga || 0) - (st.ga || 0) >= 0 ? '+' : '') + ((st.xga || 0) - (st.ga || 0)).toFixed(1) : '—',
            'Goals prevented',
            'xG faced − conceded',
          ),
          cell(avg, 'Avg rating'),
          cell(st.motm, 'MOTM'),
        ]
      : [
          cell(st.apps, 'Apps', `${m} mins`),
          cell(st.goals, 'Goals', p90(st.goals) !== '—' ? `${p90(st.goals)} per 90` : ''),
          cell(st.ast, 'Assists', p90(st.ast) !== '—' ? `${p90(st.ast)} per 90` : ''),
          cell(st.sh || 0, 'Shots', st.sh ? `${st.sot || 0} on target` : ''),
          cell(st.kp || 0, 'Chances made'),
          cell(st.tk || 0, 'Tackles won'),
          cell(avg, 'Avg rating'),
          cell(st.motm, 'MOTM', st.yc || st.rc ? `${st.yc}🟨 ${st.rc}🟥` : ''),
        ];
    return `<div class="card"><div class="row"><div class="h3 grow">${FM.Season.seasonLabel()} season</div>${['DEF'].includes(D.POS_GROUP[p.pos]) && st.cs ? `<span class="tiny dim">${st.cs} clean sheets</span>` : ''}</div>
      <div class="kpis" style="grid-template-columns:repeat(4,1fr);margin-top:8px">${cells.join('')}</div>
      <div class="tiny dim" style="margin-top:6px">Shots, chances, tackles, minutes and keeper numbers come from fully simulated matches.</div></div>`;
  };
  // Every season he has played, a row per club (a mid-season move gets two)
  UI.seasonsCard = function (p, history) {
    if (!history.length) return '';
    const gk = p.pos === 'GK';
    const head = gk ? ['Apps', 'CS', 'Conc', 'Rtg'] : ['Apps', 'G', 'A', 'Rtg'];
    const row = (h) => {
      const c = CL(h.c);
      const v = gk
        ? [h.apps, h.cs || 0, h.ga || 0, h.r ? h.r.toFixed(2) : '—']
        : [h.apps, h.g, h.a || 0, h.r ? h.r.toFixed(2) : '—'];
      return `<tr><td class="l">${h.y}/${String((h.y + 1) % 100).padStart(2, '0')}</td><td class="l"><span class="row" style="gap:6px">${c ? C.crest(c, 16) : ''}<span class="ellip" style="max-width:110px">${c ? esc(c.short) : '—'}</span></span></td>${v.map((x) => `<td>${x}</td>`).join('')}</tr>`;
    };
    const tot = history.reduce(
      (t, h) => ({
        apps: t.apps + h.apps,
        g: t.g + h.g,
        a: t.a + (h.a || 0),
        cs: t.cs + (h.cs || 0),
        ga: t.ga + (h.ga || 0),
      }),
      { apps: 0, g: 0, a: 0, cs: 0, ga: 0 },
    );
    return `<div class="card"><div class="h3">Season by season</div>
      <table class="t" style="margin-top:8px"><tr><th class="l">Season</th><th class="l">Club</th>${head.map((h) => `<th>${h}</th>`).join('')}</tr>
      ${history.map(row).join('')}
      <tr style="font-weight:700"><td class="l">Total</td><td></td>${(gk ? [tot.apps, tot.cs, tot.ga, ''] : [tot.apps, tot.g, tot.a, '']).map((x) => `<td>${x}</td>`).join('')}</tr></table></div>`;
  };
  // Player of the month awards, grouped: "🏅 Player of the Month ×2 (Oct 2026, Jan 2027)"
  function honoursLine(p) {
    const potm = p.honours.filter((h) => h[1] === 'potm');
    return potm.length
      ? `🏅 Player of the Month${potm.length > 1 ? ` ×${potm.length}` : ''} <span class="dim" style="font-weight:400">(${potm
          .slice(-3)
          .map((h) => `${esc(String(h[3]).slice(0, 3))} ${h[0]}`)
          .join(', ')})</span>`
      : '';
  }
  // Injury history: every layoff at a fully simulated club, and a warning when one problem keeps coming back
  function injuryCard(p) {
    const inj = FM.Records.injurySummary(p);
    const now = p.inj
      ? `<div class="warnline" style="margin:10px 0 4px">🚑 ${esc(p.inj.type)} — back in ${FM.Injury.range(FM.Injury.weeksLeft(p))}${p.inj.surgery ? ' (after surgery)' : ''}.</div>`
      : W.ownPlayer(p) && p.injRisk
        ? `<div class="warnline" style="margin:10px 0 4px">🩹 Just back from ${p.injRisk.rushed ? 'a rushed return' : 'injury'} — a higher risk of a setback for the next few weeks.</div>`
        : '';
    if (!inj) return now ? `<div class="card"><div class="h3">Fitness</div>${now}</div>` : '';
    // Same rule as the scout report: another club's medical record is known only once he's well scouted
    const v = FM.Scouting.view(p);
    if (!v.own && !v.injury) return '';
    const seasons = new Set(inj.list.map((x) => x.y)).size;
    return `<div class="card"><div class="row"><div class="h3 grow">Injury history</div><span class="small dim">${inj.list.length} injur${inj.list.length === 1 ? 'y' : 'ies'} · ${inj.weeks} weeks out${seasons > 1 ? ` · ${seasons} seasons` : ''}</span></div>
      ${now}${inj.recurring ? `<div class="warnline" style="margin:10px 0 4px">⚠️ Recurring ${esc(inj.recurring.part)} problems — ${inj.recurring.n} in the last two seasons. The medical team advise managing his minutes.</div>` : ''}
      ${inj.list
        .slice()
        .reverse()
        .map(
          (x) =>
            `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="dim" style="width:44px">${x.y}</span><span class="grow">${esc(x.type)}</span><b>${x.weeks}w</b></div>`,
        )
        .join('')}</div>`;
  }

  UI.acts.shortlist = (d) => {
    const sl = S().user.shortlist,
      i = sl.indexOf(d.id);
    i >= 0 ? sl.splice(i, 1) : sl.push(d.id);
    UI.refreshSheet(playerHTML(P(d.id)));
    UI.save();
  };
  UI.acts.listPlayer = (d) => {
    const p = P(d.id);
    p.listed = !p.listed;
    UI.toast(p.listed ? 'Transfer listed — bids will come in when the window is open' : 'Removed from transfer list');
    UI.refreshSheet(playerHTML(p));
    UI.save();
  };
  UI.acts.renew = (d) => {
    const p = P(d.id),
      c = club();
    const dem = Math.round((FM.Transfers.wageDemand(p, c) * 1.05) / 50) * 50;
    if (W.hasTrait(p, 'Mercenary') && p.morale < 50)
      return UI.toast(`${W.short(p)} won't discuss a new deal right now`);
    p.contract = Math.max(p.contract, S().year) + 2;
    p.wage = Math.max(p.wage, dem);
    p.morale = Math.min(100, p.morale + 6);
    UI.toast(`${W.short(p)} signs until ${p.contract} on ${U.money(p.wage)}/wk`);
    UI.refreshSheet(playerHTML(p));
    UI.save();
  };
  UI.acts.scoutPlayer = (d) => {
    const p = P(d.id),
      s = S();
    const reg = FM.Scouting.region(p);
    UI.sheet(
      `<div class="small muted" style="margin-bottom:10px">Who should watch ${esc(W.name(p))}? (${D.REGIONS[reg]})</div>${s.user.scouts
        .map((id) => {
          const sc = s.staff[id];
          return `<div class="card row tap" data-act="doScoutPlayer" data-s="${id}" data-id="${p.id}"><div class="grow"><div class="b">${C.flag(sc.nat)} ${esc(sc.fn + ' ' + sc.ln)}</div><div class="small dim">${Math.round(sc.regions[reg] * 100)}% knowledge of ${D.REGIONS[reg]} · ${Math.max(1, Math.round(3 - 2 * sc.regions[reg]))} week(s)</div></div>${C.bar(sc.regions[reg] * 100)}</div>`;
        })
        .join('')}`,
      { title: 'Assign scout' },
    );
  };
  UI.acts.doScoutPlayer = (d) => {
    FM.Scouting.assign(d.s, { type: 'player', pid: d.id });
    UI.save();
    UI.closeSheet();
    UI.toast('Scout assigned — report arrives after matchdays');
  };

  UI.acts.offer = (d) => {
    const p = P(d.id),
      c = club();
    const ask = FM.Transfers.askPrice(p);
    UI._offer = { pid: p.id, fee: ask, wage: FM.Transfers.wageDemand(p, c) };
    offerSheet();
  };
  function offerSheet(msg) {
    const o = UI._offer,
      p = P(o.pid),
      c = club();
    const ask = FM.Transfers.askPrice(p);
    const max = Math.max(ask * 2, 1e6);
    const html = `<div class="row">${C.pos(p)}<div class="grow b">${esc(W.name(p))}</div>${p.clubId ? C.crest(CL(p.clubId), 26) : ''}</div>
      <div class="small dim" style="margin-top:6px">Budget ${U.money(c.budget)} · Window ${FM.Season.windowOpen() ? '<b style="color:var(--acc)">open</b>' : '<b style="color:var(--bad)">closed</b>'}</div>
      ${p.clubId ? `<div class="h3" style="margin-top:16px">Transfer fee: <span id="ofee">${U.money(o.fee)}</span></div><input type="range" min="0" max="${max}" step="50000" value="${o.fee}" style="width:100%" data-input="offerFee">` : '<div class="h3" style="margin-top:16px">Free agent — no fee</div>'}
      <div class="h3" style="margin-top:12px">Wage: <span id="owage">${U.money(o.wage)}</span>/wk</div><input type="range" min="${Math.round(p.wage * 0.5)}" max="${Math.round(Math.max(p.wage, o.wage) * 2.5)}" step="100" value="${o.wage}" style="width:100%" data-input="offerWage">
      ${msg ? `<div class="reply" style="margin-top:12px">${esc(msg)}</div>` : ''}
      <button class="btn pri block" style="margin-top:16px" data-act="submitOffer">Submit offer</button>`;
    if (document.querySelector('.sheet-wrap:last-child #ofee, .sheet-wrap:last-child #owage')) UI.refreshSheet(html);
    else UI.sheet(html, { title: 'Make an offer' });
  }
  UI.acts.offerFee = (d, el) => {
    UI._offer.fee = +el.value;
    document.getElementById('ofee').textContent = U.money(+el.value);
  };
  UI.acts.offerWage = (d, el) => {
    UI._offer.wage = +el.value;
    document.getElementById('owage').textContent = U.money(+el.value);
  };
  UI.acts.submitOffer = () => {
    const o = UI._offer,
      p = P(o.pid);
    const r = FM.Transfers.offer(o.pid, p.clubId ? o.fee : 0, o.wage);
    if (r.ok) {
      UI.closeAllSheets();
      UI.toast(r.msg, 3500);
      UI.save();
      UI.render();
      return;
    }
    if (r.counter) o.fee = r.counter;
    if (r.wageDemand) o.wage = r.wageDemand;
    offerSheet(r.msg);
  };

  // ======================= SCOUTING =======================
  UI.screens.scout = function () {
    const t = UI.sub.scout,
      s = S();
    const newCount = Object.values(s.user.reports).filter((r) => r.isNew).length;
    const win = FM.Season.windowOpen();
    return (
      `<div class="card flat row" style="padding:10px 14px"><span style="font-size:20px">${win ? '🟢' : '🔴'}</span><div class="grow"><div class="b small">Transfer window ${win ? 'OPEN' : 'closed'}</div><div class="tiny dim">${win ? `Deals can be completed now. ${UI.windowLabel()}.` : 'Opens pre-season and matchdays 12–14.'}</div></div><div class="col" style="align-items:flex-end"><div class="tiny dim">Budget</div><b>${U.money(club().budget)}</b></div></div>` +
      chips('scout', [
        ['scouts', 'Scouts'],
        ['reports', `Reports${newCount ? ` (${newCount})` : ''}`],
        ['search', 'Search'],
        ['shortlist', 'Shortlist'],
        ['market', 'Transfer Centre'],
      ]) +
      { scouts: scoutsView, reports: reportsView, search: searchView, shortlist: shortlistView, market: marketView }[
        t
      ]()
    );
  };
  UI._mk = 'all';
  function marketView() {
    const s = S();
    const all = s.seasonLog.transfers.slice().reverse();
    const intl = all.filter((t) => t.intl);
    const land = (id) => (id && CL(id) ? CL(id).nat : null);
    const flows = {};
    intl.forEach((t) => {
      const k = `${land(t.from)}→${land(t.to)}`;
      flows[k] = flows[k] || { n: 0, fee: 0, from: land(t.from), to: land(t.to) };
      flows[k].n++;
      flows[k].fee += t.fee;
    });
    const list =
      UI._mk === 'intl' ? intl : UI._mk === 'mine' ? all.filter((t) => W.isUser(t.to) || W.isUser(t.from)) : all;
    const spend = U.sum(all, (t) => t.fee);
    return `<div class="kpis"><div class="kpi"><div class="v">${all.length}</div><div class="l">Deals</div></div><div class="kpi"><div class="v">${intl.length}</div><div class="l">International</div></div><div class="kpi"><div class="v">${U.money(spend)}</div><div class="l">Total fees</div></div></div>
      ${
        Object.keys(flows).length
          ? `<div class="card flat"><div class="h3" style="margin-bottom:6px">Cross-border flows</div>${Object.values(
              flows,
            )
              .sort((a, b) => b.fee - a.fee)
              .map(
                (f) =>
                  `<div class="row small" style="padding:5px 0"><span>${C.flag(f.from)} → ${C.flag(f.to)}</span><span class="grow dim">${D.NATIONS[f.from].name} to ${D.NATIONS[f.to].name}</span><b>${f.n}</b><span class="dim" style="width:64px;text-align:right">${U.money(f.fee)}</span></div>`,
              )
              .join('')}</div>`
          : ''
      }
      <div class="chips">${[
        ['all', 'All deals'],
        ['intl', 'International'],
        ['mine', 'My club'],
      ]
        .map(([k, l]) => `<button class="chip ${UI._mk === k ? 'on' : ''}" data-act="mk" data-v="${k}">${l}</button>`)
        .join('')}</div>
      <div class="card flat" style="padding:2px 12px">${
        list
          .slice(0, 60)
          .map((t) => {
            const from = t.from && CL(t.from),
              to = CL(t.to);
            return `<div class="row small tap" style="padding:9px 0;border-top:1px solid var(--line)" data-act="player" data-id="${t.pid}"><div class="grow" style="min-width:0"><div class="b ellip">${C.flag(t.nat)} ${esc(t.name)} ${t.intl ? '<span class="pill acc">INTL</span>' : ''}</div><div class="tiny dim ellip">${from ? `${C.flag(from.nat)} ${esc(from.short)}` : 'Free agent'} → ${C.flag(to.nat)} ${esc(to.name)}${t.age ? ` · age ${t.age}` : ''}</div></div>${C.fee(t.fee, W.isUser(t.to) ? 'in' : W.isUser(t.from) ? 'out' : null)}</div>`;
          })
          .join('') || '<div class="empty">No deals yet this season. The market moves when the window is open.</div>'
      }</div>`;
  }
  UI.acts.mk = (d) => {
    UI._mk = d.v;
    UI.render();
  };
  function scoutsView() {
    const s = S();
    return (
      `<div class="small muted" style="margin:0 2px 10px">Scouts have regional strengths. A South America specialist uncovers Argentine talent quickly — but struggles in Asia.</div>` +
      s.user.scouts
        .map((id) => {
          const sc = s.staff[id];
          const a = s.user.assignments.find((x) => x.scout === id);
          const task = !a
            ? '<span class="pill">Idle</span>'
            : a.type === 'region'
              ? `<span class="pill acc">Scouting ${D.REGIONS[a.region]} · ${a.pos === 'any' ? 'all' : a.pos} · ≤${a.maxAge}</span>`
              : `<span class="pill acc">Watching ${esc(P(a.pid) ? W.short(P(a.pid)) : '?')} · ${a.weeks}w</span>`;
          return `<div class="card"><div class="row"><div style="font-size:30px">${C.flag(sc.nat)}</div><div class="grow"><div class="b">${esc(sc.fn + ' ' + sc.ln)}</div><div class="small dim">Judging ability ${sc.judge}/20 · ${esc(sc.personality)}</div></div><button class="btn sm pri" data-act="assignScout" data-id="${id}">Assign</button></div>
        <div class="small muted" style="margin:10px 0 6px">${esc(sc.note)}</div>
        ${Object.entries(D.REGIONS)
          .map(
            ([k, l]) =>
              `<div class="row tiny" style="margin:5px 0"><span style="width:92px" class="dim">${l}</span><div class="grow">${C.bar(sc.regions[k] * 100, sc.regions[k] >= 0.8 ? 'var(--good)' : sc.regions[k] >= 0.45 ? 'var(--acc2)' : 'var(--bad)')}</div></div>`,
          )
          .join('')}
        <div style="margin-top:10px">${task}</div></div>`;
        })
        .join('')
    );
  }
  UI._as = { region: 'SAM', pos: 'any', maxAge: 23 };
  UI.acts.assignScout = (d) => {
    UI._as.scout = d.id;
    assignSheet();
  };
  function assignSheet() {
    const a = UI._as,
      sc = S().staff[a.scout];
    const html = `<div class="h3">Region</div><div class="chips" style="flex-wrap:wrap;margin-top:8px">${Object.entries(
      D.REGIONS,
    )
      .map(
        ([k, l]) =>
          `<button class="chip ${a.region === k ? 'on' : ''}" data-act="as" data-k="region" data-v="${k}">${l} · ${Math.round(sc.regions[k] * 100)}%</button>`,
      )
      .join('')}</div>
      <div class="h3">Position</div><div class="chips" style="margin-top:8px">${[
        ['any', 'Any'],
        ['GK', 'GK'],
        ['DEF', 'DEF'],
        ['MID', 'MID'],
        ['ATT', 'ATT'],
      ]
        .map(
          ([k, l]) =>
            `<button class="chip ${a.pos === k ? 'on' : ''}" data-act="as" data-k="pos" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>
      <div class="h3">Max age</div><div class="chips" style="margin-top:8px">${[19, 21, 23, 27, 35].map((v) => `<button class="chip ${a.maxAge === v ? 'on' : ''}" data-act="as" data-k="maxAge" data-v="${v}">≤ ${v}</button>`).join('')}</div>
      <button class="btn pri block" data-act="doAssign" style="margin-top:8px">Send ${esc(sc.fn)} to ${D.REGIONS[a.region]}</button>`;
    if (document.querySelector('.sheet-wrap')) UI.refreshSheet(html);
    else UI.sheet(html, { title: 'Scouting assignment' });
  }
  UI.acts.as = (d) => {
    UI._as[d.k] = d.k === 'maxAge' ? +d.v : d.v;
    assignSheet();
  };
  UI.acts.doAssign = () => {
    const a = UI._as;
    FM.Scouting.assign(a.scout, { type: 'region', region: a.region, pos: a.pos, maxAge: a.maxAge });
    UI.save();
    UI.closeSheet();
    UI.render();
    UI.toast('Reports will arrive after each matchday');
  };

  function reportsView() {
    const s = S();
    const reps = Object.entries(s.user.reports)
      .filter(([pid]) => P(pid) && !W.isUser(P(pid).clubId))
      .sort((a, b) => b[1].year - a[1].year || b[1].day - a[1].day);
    if (!reps.length)
      return '<div class="empty">No reports yet.<br>Assign a scout to a region, then play a matchday.</div>';
    return `<div class="card flat list" style="padding:4px 12px">${reps
      .slice(0, 60)
      .map(([pid, r]) => {
        const p = P(pid);
        const v = FM.Scouting.view(p);
        return C.playerRow(p, ` · ${r.isNew ? '<span style="color:var(--acc)">NEW</span> · ' : ''}${esc(v.verdict)}`);
      })
      .join('')}</div>`;
  }
  UI._q = { text: '', pos: 'any', region: 'any' };
  function searchView() {
    const q = UI._q,
      s = S();
    let ps = Object.values(s.players).filter((p) => !p.retired && !W.ownPlayer(p));
    if (q.text)
      ps = ps.filter((p) =>
        (W.name(p) + ' ' + (p.clubId ? CL(p.clubId).name : '')).toLowerCase().includes(q.text.toLowerCase()),
      );
    if (q.pos !== 'any') ps = ps.filter((p) => D.POS_GROUP[p.pos] === q.pos);
    if (q.region !== 'any') ps = ps.filter((p) => FM.Scouting.region(p) === q.region);
    ps.sort((a, b) => FM.Scouting.know(b.id) - FM.Scouting.know(a.id) || b.value - a.value);
    return `<input type="text" placeholder="Search players or clubs…" value="${esc(q.text)}" data-input="searchText" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card);margin-bottom:10px">
      <div class="chips">${[
        ['any', 'All'],
        ['GK', 'GK'],
        ['DEF', 'DEF'],
        ['MID', 'MID'],
        ['ATT', 'ATT'],
      ]
        .map(
          ([k, l]) =>
            `<button class="chip ${q.pos === k ? 'on' : ''}" data-act="q" data-k="pos" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>
      <div class="chips">${[['any', 'Everywhere'], ...Object.entries(D.REGIONS)].map(([k, l]) => `<button class="chip ${q.region === k ? 'on' : ''}" data-act="q" data-k="region" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="card flat list" style="padding:4px 12px" id="searchRes">${
        ps
          .slice(0, 50)
          .map((p) => C.playerRow(p, ` · ${Math.round(FM.Scouting.know(p.id))}% known`))
          .join('') || '<div class="empty">No matches</div>'
      }</div>`;
  }
  UI.acts.q = (d) => {
    UI._q[d.k] = d.v;
    UI.render();
  };
  let searchT;
  UI.acts.searchText = (d, el) => {
    UI._q.text = el.value;
    clearTimeout(searchT);
    searchT = setTimeout(() => {
      const pos = el.selectionStart;
      UI.render();
      const i = document.querySelector('[data-input="searchText"]');
      i.focus();
      i.setSelectionRange(pos, pos);
    }, 250);
  };
  function shortlistView() {
    const sl = S().user.shortlist.filter(P);
    return sl.length
      ? `<div class="card flat list" style="padding:4px 12px">${sl.map((id) => C.playerRow(P(id), ` · ${Math.round(FM.Scouting.know(id))}% known`)).join('')}</div>`
      : '<div class="empty">Your shortlist is empty. Tap ☆ on a player card.</div>';
  }

  // ======================= LEAGUE =======================
  UI.screens.league = function () {
    const t = UI.sub.league || (UI.sub.league = myComp());
    const mine = myComp(),
      lname = (c) => (c.nat && c.nat !== 'ENG' ? C.flag(c.nat) + ' ' : '') + c.name.replace('The ', '');
    const opts = [[mine, lname(S().comps[mine])]];
    if (S().comps[t] && S().comps[t].type === 'league' && t !== mine) opts.push([t, lname(S().comps[t])]);
    opts.push(['world', '🗺️ All leagues']);
    if (W.cups().length || W.continentals().length) opts.push(['cups', 'Cups']);
    opts.push(['fixtures', 'Fixtures'], ['stats', 'Stats']);
    return (
      chips('league', opts) +
      (t === 'fixtures'
        ? fixturesView()
        : t === 'stats'
          ? statsView()
          : t === 'cups'
            ? cupsView()
            : t === 'world'
              ? worldView()
              : tableView(t))
    );
  };
  // International football has its own tab: national teams, rankings, tournaments and your national job
  UI.screens.intl = () =>
    FM.S.nteams ? UI.intlView() : '<div class="empty">International football starts with your first season.</div>';
  // Every league in the world, grouped by continent, with its simulation tier
  function worldView() {
    const s = S(),
      cont = { EUR: 'Europe', ENG: 'Europe', SAM: 'South America', NAM: 'North America', ASIA: 'Asia', AFR: 'Africa' };
    const by = {};
    W.leagues().forEach((l) => {
      const k = cont[D.NATIONS[l.nat].region];
      (by[k] = by[k] || []).push(l);
    });
    const tierPill = (sim) =>
      `<span class="pill ${sim === 'full' ? 'acc' : ''}" title="${FM.Tiers.LABEL[sim]}" style="font-size:10px">${FM.Tiers.ICON[sim]} ${sim}</span>`;
    return (
      `<div class="small muted" style="margin:0 2px 10px;line-height:1.5">${W.leagues().length} leagues in three simulation tiers. <b>Full</b>: every match in the engine. <b>Light</b>: every fixture played by a fast statistical model. <b>Minimal</b>: scores only — squads exist for scouting. Tap a league for its table.</div>` +
      ['Europe', 'South America', 'North America', 'Asia', 'Africa']
        .filter((k) => by[k])
        .map(
          (k) =>
            `<div class="sec"><div class="h3">${k}</div></div><div class="card flat" style="padding:2px 12px">${by[k]
              .sort((a, b) => (a.nat + a.tier).localeCompare(b.nat + b.tier))
              .map((l) => {
                const t = W.sortedTable(l)[0];
                return `<div class="row small tap" style="padding:9px 0;border-top:1px solid var(--line)" data-act="sub" data-k="league" data-v="${l.id}"><span style="font-size:18px">${C.flag(l.nat)}</span><div class="grow" style="min-width:0"><div class="b ellip">${esc(l.name)}${l.id === club().comp ? ' <span class="pill acc">You</span>' : ''}</div><div class="tiny dim ellip">Tier ${l.tier} · ${l.clubs.length} clubs${l.rules.qualify ? ` · top ${l.rules.qualify.n} → ${esc(s.comps[l.rules.qualify.to].short)}` : ''} · leader ${t && t.p ? esc(CL(t.id).short) : '—'}</div></div>${tierPill(l.sim || 'full')}</div>`;
              })
              .join('')}</div>`,
        )
        .join('')
    );
  }
  function tableView(cid) {
    const s = S(),
      comp = s.comps[cid],
      t = W.sortedTable(comp),
      R = comp.rules,
      n = t.length;
    const zone = (i) =>
      R.relegate && i >= n - R.relegate.n
        ? 'zone-down'
        : R.promote && i < R.promote.auto
          ? 'zone-up'
          : R.promote && i + 1 >= R.promote.playoff[0] && i + 1 <= R.promote.playoff[1]
            ? 'zone-po'
            : i === 0
              ? 'zone-up'
              : R.qualify && i < R.qualify.n
                ? 'zone-po'
                : '';
    const legend = [
      R.promote ? `🟢 Promotion (${R.promote.auto})` : '🟢 Champion',
      R.promote
        ? `🔵 Playoffs (${R.promote.playoff.join('–')})`
        : R.qualify
          ? `🔵 ${s.comps[R.qualify.to].name} (top ${R.qualify.n})`
          : '',
      R.relegate ? `🔴 Relegation (${R.relegate.n})` : '',
    ].filter(Boolean);
    const po = comp.playoff;
    const tier =
      comp.sim && comp.sim !== 'full'
        ? `<div class="warnline" style="margin-bottom:8px">${FM.Tiers.ICON[comp.sim]} ${FM.Tiers.LABEL[comp.sim]} — ${comp.sim === 'light' ? 'results come from a fast statistical model; player stats are recorded.' : 'scores only; squads exist for scouting.'}</div>`
        : '';
    return `<div class="row" style="margin:0 2px 6px"><span class="grow"></span>${UI.followBtn('comp', cid, true)}</div>${tier}<div class="card flat" style="padding:6px 10px"><table class="t"><tr><th>#</th><th class="l">Club</th><th>P</th><th>GD</th><th>Pts</th><th class="l">Form</th></tr>${t.map((r, i) => `<tr class="${zone(i)} ${W.isUser(r.id) ? 'me' : ''} tap" data-act="clubView" data-id="${r.id}"><td>${i + 1}</td><td class="l"><div class="row" style="gap:6px">${C.crest(CL(r.id), 18)}<span class="ellip" style="max-width:130px">${esc(CL(r.id).name)}</span></div></td><td>${r.p}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="b">${r.pts}</td><td class="l">${C.form(r.form.slice(-3))}</td></tr>`).join('')}</table></div>
      <div class="row tiny dim" style="gap:12px;margin:0 4px 12px;flex-wrap:wrap">${legend.map((l) => `<span>${l}</span>`).join('')}</div>
      ${po ? `<div class="card"><div class="h3">Playoffs</div>${po.sf.map((f) => fxLine(f)).join('')}${(po.sf2 || []).map((f) => fxLine(f)).join('')}${po.final ? fxLine(po.final) : ''}</div>` : ''}`;
  }
  const stagePill = (po) => {
    const [base, leg] = po.split(' · ');
    const b =
      base === 'Semi-final'
        ? 'SF'
        : base === 'Final' || base === 'Playoff Final'
          ? 'Final'
          : base === 'Quarter-final'
            ? 'QF'
            : base.replace('Round of ', 'R').replace('First round', 'R1').replace('Round ', 'R');
    return b + (leg === '1st leg' ? ' L1' : leg === '2nd leg' ? ' L2' : '');
  };
  UI.stagePill = stagePill;
  function fxLine(f) {
    const r = f.res;
    return `<div class="row small tap" style="padding:8px 0;border-top:1px solid var(--line)" ${r ? `data-act="matchReport" data-id="${f.id}"` : ''}>${f.po && !f.group ? `<span class="pill">${stagePill(f.po)}</span>` : ''}<span class="grow ellip" style="text-align:right;${W.isUser(f.h) ? 'font-weight:800' : ''}" data-act="clubView" data-id="${f.h}">${esc(CL(f.h).name)}</span>${C.crest(CL(f.h), 18)}<b style="min-width:44px;text-align:center">${r ? `${r.hg}–${r.ag}` : 'v'}</b>${C.crest(CL(f.a), 18)}<span class="grow ellip" style="${W.isUser(f.a) ? 'font-weight:800' : ''}" data-act="clubView" data-id="${f.a}">${esc(CL(f.a).name)}</span></div>${r && (r.pens || r.agg) ? `<div class="tiny dim center">${r.agg ? `agg ${r.agg[0]}–${r.agg[1]}${r.pens ? '' : r.agg[0] === r.agg[1] && r.win != null ? ' · away goals' : ''}` : ''}${r.agg && r.pens ? ' · ' : ''}${r.pens ? `pens ${r.pens[0]}–${r.pens[1]}` : ''}</div>` : ''}`;
  }
  UI.fxLine = fxLine;
  function fixturesView() {
    const s = S(),
      c = club();
    if (!c) return '<div class="empty">Take a job to see your fixtures.</div>';
    const comp = s.comps[c.comp];
    const mine = comp.fixtures
      .map((rd, i) => ({ i, f: rd.find((f) => f.h === c.id || f.a === c.id) }))
      .filter((x) => x.f);
    const cal = FM.Season.today();
    const lastRound = cal && cal.type === 'league' ? W.roundsBefore(comp, cal.round) - 1 : comp.fixtures.length - 1;
    const rr = lastRound >= 0 ? comp.fixtures[lastRound] : null;
    return `${rr ? `<div class="sec"><div class="h3">Latest round</div><span class="dim small">MD ${lastRound + 1}</span></div><div class="card flat" style="padding:2px 12px">${rr.map(fxLine).join('')}</div>` : ''}
      ${(() => {
        const ties = FM.Cups.allFixtures().filter(
          (f) => f.comp !== c.comp && (f.h === c.id || f.a === c.id) && s.comps[f.comp].type !== 'league',
        );
        return ties.length
          ? `<div class="sec"><div class="h3">Cup ties</div></div><div class="card flat" style="padding:2px 12px">${ties.map((f) => `<div class="row tiny dim" style="padding-top:6px">${esc(s.comps[f.comp].name)} · ${esc(f.po || '')}</div>${fxLine(f)}`).join('')}</div>`
          : '';
      })()}
      <div class="sec"><div class="h3">Your fixtures</div></div><div class="card flat" style="padding:2px 12px">${mine.map(({ i, f }) => `<div class="row tiny dim" style="padding-top:6px">MD ${i + 1}${c.rival === (f.h === c.id ? f.a : f.h) ? ' · ⚔️ Derby' : ''}</div>${fxLine(f)}`).join('')}</div>`;
  }
  UI._statsComp = null;
  function statsView() {
    const s = S(),
      cur = UI._statsComp || myComp();
    const pick = `<div class="chips" style="flex-wrap:wrap"><button class="chip ${cur === 'all' ? 'on' : ''}" data-act="statsComp" data-v="all">🌍 All leagues</button>${W.leagues()
      .map(
        (c) =>
          `<button class="chip ${c.id === cur ? 'on' : ''}" data-act="statsComp" data-v="${c.id}">${C.flag(c.nat)} ${esc(c.short)}</button>`,
      )
      .join('')}</div>`;
    if (cur === 'all') {
      // Every league, one list: league shown beside each player; minimal-tier stats are synthetic, so marked
      const ps = Object.values(s.players).filter((p) => p.clubId && CL(p.clubId).comp && s.comps[CL(p.clubId).comp]);
      const lg = (p) => s.comps[CL(p.clubId).comp];
      const list = (arr, f, lab) =>
        `<div class="small b dim" style="margin:10px 0 4px">${lab}</div>${
          arr
            .slice(0, 15)
            .map(
              (p, i) =>
                `<div class="row small tap" style="padding:5px 0" data-act="player" data-id="${p.id}"><span class="dim" style="width:20px">${i + 1}</span>${C.crest(CL(p.clubId), 16)}<span class="grow ellip">${esc(W.name(p))} <span class="dim tiny">${C.flag(lg(p).nat)} ${esc(lg(p).short)}${lg(p).sim === 'minimal' ? '*' : ''}</span></span><b>${f(p)}</b></div>`,
            )
            .join('') || '<div class="dim small">—</div>'
        }`;
      return (
        pick +
        `<div class="card"><div class="h3">All leagues</div>
        ${list(
          ps.filter((p) => p.season.goals).sort((a, b) => b.season.goals - a.season.goals),
          (p) => p.season.goals,
          'Top scorers',
        )}
        ${list(
          ps.filter((p) => p.season.ast).sort((a, b) => b.season.ast - a.season.ast),
          (p) => p.season.ast,
          'Assists',
        )}
        ${list(
          ps
            .filter((p) => p.season.apps >= 8)
            .sort((a, b) => b.season.rsum / b.season.apps - a.season.rsum / a.season.apps),
          (p) => (p.season.rsum / p.season.apps).toFixed(2),
          'Average rating (8+ apps)',
        )}
        <div class="tiny dim" style="margin-top:8px">* Minimal-simulation league: results are real, player stats are estimated.</div></div>`
      );
    }
    return (
      pick +
      [cur]
        .map((cid) => {
          const ps = Object.values(s.players).filter((p) => p.clubId && CL(p.clubId).comp === cid);
          const list = (arr, f, lab) =>
            `<div class="small b dim" style="margin:10px 0 4px">${lab}</div>${
              arr
                .slice(0, 5)
                .map(
                  (p, i) =>
                    `<div class="row small tap" style="padding:5px 0" data-act="player" data-id="${p.id}"><span class="dim" style="width:16px">${i + 1}</span>${C.crest(CL(p.clubId), 16)}<span class="grow ellip">${esc(W.name(p))}</span><b>${f(p)}</b></div>`,
                )
                .join('') || '<div class="dim small">—</div>'
            }`;
          return `<div class="card"><div class="h3">${esc(s.comps[cid].name)}</div>
        ${list(
          ps.filter((p) => p.season.goals).sort((a, b) => b.season.goals - a.season.goals),
          (p) => p.season.goals,
          'Top scorers',
        )}
        ${list(
          ps.filter((p) => p.season.ast).sort((a, b) => b.season.ast - a.season.ast),
          (p) => p.season.ast,
          'Assists',
        )}
        ${list(
          ps
            .filter((p) => p.season.apps >= 3)
            .sort((a, b) => b.season.rsum / b.season.apps - a.season.rsum / a.season.apps),
          (p) => (p.season.rsum / p.season.apps).toFixed(2),
          'Average rating (3+ apps)',
        )}
        ${list(
          ps.filter((p) => p.season.kp).sort((a, b) => b.season.kp - a.season.kp),
          (p) => p.season.kp,
          'Chances made',
        )}
        ${list(
          ps.filter((p) => p.season.tk).sort((a, b) => b.season.tk - a.season.tk),
          (p) => p.season.tk,
          'Tackles won',
        )}</div>
        <div class="card"><div class="h3">Goalkeepers</div>
        ${list(
          ps.filter((p) => p.pos === 'GK' && p.season.cs).sort((a, b) => b.season.cs - a.season.cs),
          (p) => p.season.cs,
          'Clean sheets',
        )}
        ${list(
          ps
            .filter((p) => p.pos === 'GK' && (p.season.sv || 0) + (p.season.ga || 0) >= 20)
            .sort((a, b) => b.season.sv / (b.season.sv + b.season.ga) - a.season.sv / (a.season.sv + a.season.ga)),
          (p) => Math.round((100 * p.season.sv) / (p.season.sv + p.season.ga)) + '%',
          'Save % (20+ shots faced)',
        )}
        ${list(
          ps
            .filter((p) => p.pos === 'GK' && p.season.apps >= 3)
            .sort((a, b) => b.season.xga - b.season.ga - (a.season.xga - a.season.ga)),
          (p) => (p.season.xga - p.season.ga >= 0 ? '+' : '') + (p.season.xga - p.season.ga).toFixed(1),
          'Goals prevented (xG faced − conceded)',
        )}</div>`;
        })
        .join('')
    );
  }
  UI.acts.statsComp = (d) => {
    UI._statsComp = d.v;
    UI.render();
  };
  UI._cupsView = 'mine';
  UI.acts.cupsView = (d) => {
    UI._cupsView = d.v;
    UI.render();
  };
  function cupsView() {
    const s = S(),
      uc = club() ? club().id : null,
      v = UI._cupsView;
    const tabs = `<div class="chips">${[
      ['mine', 'My cups'],
      ['continental', 'Continental'],
      ['domestic', 'Domestic'],
      ['world', '🌍 Club World Cup'],
    ]
      .map(([k, l]) => `<button class="chip ${v === k ? 'on' : ''}" data-act="cupsView" data-v="${k}">${l}</button>`)
      .join('')}</div>`;
    const inIt = (c) => c.clubs.includes(uc);
    const legs = s.rules.twoLegs
      ? 'two-legged knockouts' + (s.rules.awayGoals ? ' (away goals)' : '')
      : 'single-leg knockouts';
    const wc = W.worldCups()
      .filter((c) => v === 'world' || (v === 'mine' && inIt(c)))
      .map(
        (
          c,
        ) => `<div class="card"><div class="row"><div class="h3 grow">🌍 ${esc(c.name)}</div>${c.winner ? `<span class="pill acc">🏆 ${esc(CL(c.winner).short)}</span>` : ''}</div><div class="tiny dim" style="margin-top:4px">Last season's continental finalists · neutral venues · played mid-season</div>
      <div class="chips" style="flex-wrap:wrap;margin-top:8px">${c.clubs.map((id) => `<span class="chip" style="${W.isUser(id) ? 'border-color:var(--acc)' : ''}">${C.flag(CL(id).nat)} ${esc(CL(id).short)}</span>`).join('')}</div>
      ${FM.Cups.koList(c).length ? FM.Cups.koList(c).map(fxLine).join('') : '<div class="small dim" style="margin-top:8px">The quarter-finals are drawn after matchday 10.</div>'}</div>`,
      )
      .join('');
    const cont = W.continentals()
      .filter((c) => v === 'continental' || (v === 'mine' && inIt(c)))
      .map((c) => {
        const grp =
          (c.groups || [])
            .map(
              (g) =>
                `<div class="small b dim" style="margin:10px 0 2px">GROUP ${g.name}</div><table class="t"><tr><th>#</th><th class="l">Club</th><th>P</th><th>GD</th><th>Pts</th><th></th></tr>${((
                  mk,
                ) =>
                  FM.Cups.groupTable(g)
                    .map(
                      (r, i) =>
                        `<tr class="${i < 2 ? 'zone-up' : ''} ${W.isUser(r.id) ? 'me' : ''} tap" data-act="clubView" data-id="${r.id}"><td>${i + 1}</td><td class="l"><div class="row" style="gap:6px">${C.crest(CL(r.id), 16)}<span class="ellip" style="max-width:150px">${C.flag(CL(r.id).nat)} ${esc(CL(r.id).name)}</span></div></td><td>${r.p}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="b">${r.pts}</td><td title="${{ top: 'Group won', through: 'Through to the knockouts', out: 'Eliminated' }[mk[r.id]] || ''}" style="color:${mk[r.id] === 'out' ? 'var(--bad)' : 'var(--good)'};font-weight:800">${{ top: '★', through: '✓', out: '✗' }[mk[r.id]] || ''}</td></tr>`,
                    )
                    .join(''))(FM.Cups.groupMarks(g))}</table>`,
            )
            .join('') +
          (c.groups && c.groups.length
            ? '<div class="tiny dim" style="margin-top:6px">★ group won · ✓ through to the knockouts · ✗ eliminated</div>'
            : '');
        const ko = FM.Cups.koList(c);
        return `<div class="card"><div class="row"><div class="h3 grow">⭐ ${esc(c.name)}</div>${c.winner ? `<span class="pill acc">🏆 ${esc(CL(c.winner).short)}</span>` : ''}</div><div class="tiny dim" style="margin-top:4px">${c.region || ''} · ${c.clubs.length} clubs · top 2 in each group reach the ${c.groups.length >= 4 ? 'quarter-finals' : 'semi-finals'} · ${legs} · neutral final</div>${grp}${ko.length ? `<div class="small b dim" style="margin:12px 0 2px">KNOCKOUT</div>${ko.map(fxLine).join('')}` : ''}</div>`;
      })
      .join('');
    const dom = W.cups()
      .filter((c) => v === 'domestic' || (v === 'mine' && inIt(c)))
      .map((c) => {
        return `<div class="card"><div class="row"><div class="h3 grow">🏆 ${esc(c.name)} ${C.flag(c.nat)}</div>${c.winner ? `<span class="pill acc">Winners: ${esc(CL(c.winner).short)}</span>` : ''}</div><div class="tiny dim" style="margin-top:4px">${c.clubs.length} clubs · single-leg knockout · extra time & penalties</div>
        ${
          c.rounds
            .slice()
            .reverse()
            .map(
              (r) =>
                `<div class="small b dim" style="margin:12px 0 2px">${esc(r.name.toUpperCase())}${r.byes.length ? ` · ${r.byes.length} byes` : ''}</div>${r.ties.map(fxLine).join('')}`,
            )
            .join('') || '<div class="small dim" style="margin-top:8px">The draw has not been made yet.</div>'
        }</div>`;
      })
      .join('');
    return (
      tabs +
      (wc + cont + dom ||
        `<div class="empty">${v === 'mine' ? "Your club isn't in any cup competitions right now." : 'Nothing here yet.'}</div>`)
    );
  }

  UI.acts.matchReport = (d) => {
    const f = FM.Cups.allFixtures().find((x) => x.id === d.id);
    if (!f || !f.res) return UI.toast('Report no longer available');
    const r = f.res;
    const side = (k) =>
      Object.entries(f.ratings || {})
        .filter(([pid]) => P(pid) && P(pid).clubId === (k ? f.a : f.h))
        .sort((a, b) => b[1] - a[1]);
    const tag = (k) => {
      const c = CL(k ? f.a : f.h);
      return `<b class="ev-team" style="background:${c.colors[0]};color:${U.ink(c.colors[0])}">${esc(c.short)}</b>`;
    };
    UI.sheet(
      `<div class="row" style="justify-content:space-around;text-align:center"><div>${C.crest(CL(f.h), 48)}<div class="small b">${esc(CL(f.h).name)}</div></div><div class="h1">${r.hg}–${r.ag}</div><div>${C.crest(CL(f.a), 48)}<div class="small b">${esc(CL(f.a).name)}</div></div></div>
      ${r.pens ? `<div class="center small dim">Penalties ${r.pens[0]}–${r.pens[1]}</div>` : ''}
      ${r.agg ? `<div class="center small b">Aggregate ${r.agg[0]}–${r.agg[1]}</div>` : ''}
      <div class="center small dim" style="margin:6px 0">${r.xg ? `xG ${r.xg[0]} – ${r.xg[1]}` : ''}${r.poss ? ` · Possession ${r.poss[0]}% – ${r.poss[1]}%` : ''}${r.weather ? ` · ${r.weather}` : ''}${r.att ? ` · ${r.att.toLocaleString()} crowd` : ''}${r.sim ? ` · ${FM.Tiers.LABEL[r.sim].toLowerCase()}` : ''}</div>
      <div class="card flat">${r.goals.map((g) => `<div class="row small" style="padding:4px 0;${g.side ? 'flex-direction:row-reverse;text-align:right' : ''}">${tag(g.side)}⚽ <b>${esc(P(g.pid) ? W.short(P(g.pid)) : '—')}</b> <span class="dim">${g.min || ''}${g.pen ? ' (pen)' : ''}</span></div>`).join('') || `<div class="dim small center">${r.hg + r.ag ? 'Scorers not recorded' : 'No goals'}</div>`}</div>
      <div class="row" style="align-items:flex-start;gap:12px">${[0, 1]
        .map(
          (k) =>
            `<div class="grow">${side(k)
              .map(
                ([pid, rt]) =>
                  `<div class="row small" style="padding:3px 0" data-act="player" data-id="${pid}"><span class="grow ellip">${esc(W.short(P(pid)))}${pid === r.motm ? ' ⭐' : ''}</span>${C.rating(rt)}</div>`,
              )
              .join('')}</div>`,
        )
        .join('')}</div>`,
      { title: 'Match report' },
    );
  };

  // ======================= CLUB =======================
  UI.screens.club = function () {
    // Out of work: only your own profile and the settings
    if (!club() && !['manager', 'settings'].includes(UI.sub.club)) UI.sub.club = 'manager';
    const t = UI.sub.club;
    return (
      chips(
        'club',
        club()
          ? [
              ['overview', 'Club'],
              ['staff', 'Staff'],
              ['facilities', 'Facilities'],
              ['finances', 'Finances'],
              ['hof', 'Hall of Fame'],
              ['archive', 'Archive'],
              ['manager', 'Manager'],
              ['settings', 'Settings'],
            ]
          : [
              ['manager', 'Manager'],
              ['settings', 'Settings'],
            ],
      ) +
      {
        overview: overviewView,
        staff: () => UI.staffView(),
        facilities: facilitiesView,
        finances: financesView,
        hof: hofView,
        archive: archiveView,
        manager: managerView,
        settings: settingsView,
      }[t]()
    );
  };
  // Club records: match records and transfer records since the save began, all-time lists including history
  UI.clubRecordsCard = function (c) {
    const s = S(),
      r = (s.records && s.records.clubs[c.id]) || {},
      at = FM.Records.allTime(c.id);
    const since = (s.records && s.records.since) || s.year;
    const oppName = (id) => (CL(id) ? CL(id).name : '?');
    const row = (label, main, sub, act) =>
      `<div class="row small" style="padding:7px 0;border-top:1px solid var(--line)"><span class="dim" style="width:118px;flex:none">${label}</span><div class="grow" style="min-width:0"><div class="b ellip ${act ? 'tap' : ''}" ${act || ''}>${main}</div>${sub ? `<div class="tiny dim ellip">${sub}</div>` : ''}</div></div>`;
    const match = (m) =>
      m
        ? [
            `${m.gf}–${m.ga} v ${esc(oppName(m.opp))}`,
            `${m.year} · ${esc(s.comps[m.comp] ? s.comps[m.comp].name : '')}`,
          ]
        : ['—', ''];
    const deal = (d, dir) =>
      d
        ? [
            `${esc(d.name)} · ${U.money(d.fee)}`,
            `${d.year} · ${dir === 'in' ? 'from' : 'to'} ${esc(oppName(dir === 'in' ? d.from : d.to))}`,
            s.players[d.pid] ? `data-act="player" data-id="${d.pid}"` : '',
          ]
        : ['—', '', ''];
    const top = at.scorers[0],
      most = at.apps[0];
    const person = (x, v) =>
      x
        ? [
            `${esc(x.name)} · ${v}`,
            x.era
              ? esc(x.era)
              : x.id && s.players[x.id] && W.isUser(s.players[x.id].clubId)
                ? 'In the squad'
                : x.hist
                  ? ''
                  : 'Former player',
            x.id && s.players[x.id] ? `data-act="player" data-id="${x.id}"` : '',
          ]
        : ['—', '', ''];
    const [w1, w2] = match(r.bigWin),
      [l1, l2] = match(r.bigLoss),
      [s1, s2, s3] = deal(r.sign, 'in'),
      [o1, o2, o3] = deal(r.sale, 'out');
    const [t1, t2, t3] = person(top, `${top ? top.goals : 0} goals`),
      [m1, m2, m3] = person(most, `${most ? most.apps : 0} games`);
    return `<div class="card"><div class="row"><div class="h3 grow">Club records</div><span class="tiny dim">matches & transfers since ${since}</span></div>
      ${row('Biggest win', w1, w2)}${row('Heaviest defeat', l1, l2)}${row('Record signing', s1, s2, s3)}${row('Record sale', o1, o2, o3)}${row('Top scorer', t1, t2, t3)}${row('Most appearances', m1, m2, m3)}</div>`;
  };
  // The ground's story: opened, capacity changes over the save
  UI.stadiumCard = function (c) {
    const st = FM.Records.stadium(c),
      first = st.hist[0];
    const grown = st.cap - first[2];
    return `<div class="card"><div class="row"><div class="h3 grow">${esc(st.name)}</div><span class="small dim">opened ${st.opened}</span></div>
      <div class="row small" style="margin-top:8px"><span class="grow muted">Capacity</span><b>${st.cap.toLocaleString()}</b>${grown > 0 ? `<span class="tiny" style="color:var(--good);margin-left:6px">+${grown.toLocaleString()} since ${first[0]}</span>` : ''}</div>
      ${st.hist
        .slice(1)
        .reverse()
        .map(
          ([y, what, cap]) =>
            `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="dim" style="width:44px">${y}</span><span class="grow">${esc(what)}</span><b>${cap.toLocaleString()}</b></div>`,
        )
        .join('')}</div>`;
  };
  function overviewView() {
    const s = S(),
      c = club(),
      I = D.IDENTITY[c.identity];
    const staff = Object.values(D.STAFF_ROLES)
      .filter((r) => r.key !== 'scout')
      .map((r) => FM.Staff.get(r.key));
    return `<div class="hero" style="--c1:${c.colors[0]};--c2:${c.colors[1]}"><div class="row">${C.crest(c, 64)}<div class="grow"><div class="h1">${esc(c.name)}</div><div class="small" style="opacity:.85;margin-top:4px">${esc(c.stadium.name)} · ${c.stadium.cap.toLocaleString()}</div><div style="margin-top:8px"><span class="pill" style="background:rgba(0,0,0,.3);color:#fff;border:0">${I.icon} ${I.label}</span> <span class="pill" style="background:rgba(0,0,0,.3);color:#fff;border:0">Rep ${Math.round(c.rep)}</span></div></div></div></div>
      <div class="card"><div class="h3">Club culture</div><div class="row small" style="margin-top:6px;gap:6px"><span>${I.icon}</span><b>${esc(I.label)}</b></div><div class="small muted" style="margin-top:4px;line-height:1.5">${esc(I.fans)}</div>
        <div class="phrase" style="margin-top:8px"><span>🎵</span><span>${esc(c.chant)}</span></div><div class="phrase"><span>🏟️</span><span>${esc(c.tradition)}</span></div>
        ${c.rival ? `<div class="phrase"><span>⚔️</span><span>The <b>${esc(c.derby)}</b> vs ${esc(CL(c.rival).name)}</span></div>` : ''}
        <div class="row small" style="margin-top:10px"><span style="width:90px" class="dim">Fan mood</span><div class="grow">${C.bar(c.fanMood, C.moodColor(c.fanMood))}</div></div>
        <div class="row small" style="margin-top:8px"><span style="width:90px" class="dim">Board</span><div class="grow">${C.bar(c.boardConf, C.moodColor(c.boardConf))}</div></div></div>
      ${UI.boardroomCard()}
      <div class="card"><div class="h3">Board objectives</div>${FM.Season.objectives(c)
        .map(
          (o) =>
            `<div class="row small" style="margin-top:8px"><span>${o.ok ? '✅' : '⏳'}</span><span class="grow">${esc(o.text)}</span><span class="dim">${esc(o.status)}</span></div>`,
        )
        .join('')}</div>
      <div class="card"><div class="h3">Honours</div>${
        Object.keys(c.titles).length
          ? Object.entries(c.titles)
              .map(
                ([k, n]) =>
                  `<div class="row small" style="margin-top:6px">🏆 <span class="grow">${esc(s.comps[k].name)}</span><b>${n}</b></div>`,
              )
              .join('')
          : '<div class="small dim" style="margin-top:6px">No trophies in this save — yet.</div>'
      }</div>
      ${UI.clubRecordsCard(c)}
      ${UI.stadiumCard(c)}
      <div class="card"><div class="h3">Backroom staff</div>${staff.map((st) => `<div class="row small" style="padding:8px 0;border-top:1px solid var(--line)"><span>${C.flag(st.nat)}</span><div class="grow"><b>${esc(st.fn + ' ' + st.ln)}</b><div class="dim tiny">${esc(st.role)}</div></div><span class="pill">${esc(st.personality)}</span></div>`).join('')}</div>`;
  }
  function facilitiesView() {
    const c = club(),
      F = FM.Season.FAC;
    return (
      `${c.building ? `<div class="warnline">🏗️ Building: ${F[c.building.k].name} — ${c.building.weeks} week(s) left</div>` : ''}<div class="small muted" style="margin:0 2px 10px">Infrastructure is your legacy. Upgrades take weeks and cost real money. One project at a time.</div><div class="card flat list" style="padding:0 14px">` +
      Object.entries(F)
        .map(([k, f]) => {
          const lvl = c.facilities[k],
            cost = FM.Season.facCost(k, lvl);
          return `<div class="fac"><div class="ico">${f.icon}</div><div class="grow"><div class="b">${f.name}</div><div class="tiny dim">${f.effect}</div><div class="lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</div></div>${lvl >= 5 ? '<span class="pill good">MAX</span>' : `<button class="btn sm" data-act="upgrade" data-k="${k}" ${c.building || c.balance < cost ? 'disabled' : ''}>${U.money(cost)}<br><span class="tiny dim">${FM.Season.facWeeks(k, lvl)}w</span></button>`}</div>`;
        })
        .join('') +
      '</div>'
    );
  }
  UI.acts.upgrade = (d) => {
    if (FM.Season.upgrade(d.k)) {
      UI.toast('Construction started');
      UI.save();
      UI.render();
    }
  };
  function financesView() {
    const c = club(),
      s = S(),
      sq = W.squad(c.id);
    const L = c.ledger.slice(-16);
    const mx = Math.max(1, ...L.map((l) => Math.max(l.inc, l.exp)));
    const net = s.seasonLog.net[c.id] || 0;
    return `<div class="kpis"><div class="kpi"><div class="v">${U.money(c.balance)}</div><div class="l">Balance</div></div><div class="kpi"><div class="v">${U.money(c.budget)}</div><div class="l">Transfer budget</div></div><div class="kpi"><div class="v">${U.money(U.sum(sq, (p) => p.wage))}</div><div class="l">Wages / wk</div></div></div>
      <div class="card"><div class="row"><div class="h3 grow">Weekly cash flow</div><span class="tiny"><span style="color:var(--good)">■</span> income <span style="color:var(--bad)">■</span> wages</span></div>
        <div class="row" style="align-items:flex-end;height:110px;gap:4px;margin-top:10px">${L.length ? L.map((l) => `<div class="grow row" style="align-items:flex-end;gap:1px;height:100%"><div class="grow" style="height:${(l.inc / mx) * 100}%;background:var(--good);border-radius:3px 3px 0 0"></div><div class="grow" style="height:${(l.exp / mx) * 100}%;background:var(--bad);border-radius:3px 3px 0 0;opacity:.8"></div></div>`).join('') : '<div class="dim small">Play a matchday to see cash flow.</div>'}</div>
        <div class="small dim" style="margin-top:8px">Home games bring gate receipts — bigger stadium, happier fans, more money.</div></div>
      ${UI.incomeCard(c)}
      ${spendCard(c, s, sq)}
      ${UI.paymentsCard(c)}
      <div class="card"><div class="row"><div class="h3 grow">Transfer activity this season</div><b style="color:${net >= 0 ? 'var(--good)' : 'var(--bad)'}">${net >= 0 ? '+' : ''}${U.money(net)}</b></div>
        ${
          s.seasonLog.transfers
            .filter((t) => W.isUser(t.to) || W.isUser(t.from))
            .map(
              (t) =>
                `<div class="row small tap" data-act="player" data-id="${t.pid}" style="padding:6px 0;border-top:1px solid var(--line)"><span>${W.isUser(t.to) ? '⬅️' : '➡️'}</span><span class="grow">${esc(t.name)}${t.loan ? ' <span class="pill">LOAN</span>' : ''}</span>${C.fee(t.fee, W.isUser(t.to) ? 'in' : 'out', t.loan)}</div>`,
            )
            .join('') || '<div class="small dim" style="margin-top:6px">No deals yet.</div>'
        }</div>`;
  }
  // Wages and bonuses this season, by kind, plus the biggest earners
  function spendCard(c, s, sq) {
    const sp = s.seasonLog.spend || {};
    const rows = [
      ['wages', 'Player wages'],
      ['staff', 'Staff wages'],
      ['app', 'Appearance bonuses'],
      ['goal', 'Goal bonuses'],
      ['signing', 'Signing-on fees'],
      ['agent', 'Agent fees'],
      ['interest', 'Interest on debt'],
    ];
    const total = U.sum(rows, ([k]) => sp[k] || 0),
      mx = Math.max(1, ...rows.map(([k]) => sp[k] || 0));
    const earners = sq
      .slice()
      .sort((a, b) => b.wage - a.wage)
      .slice(0, 5);
    const bits = (p) =>
      [
        p.deal && p.deal.app ? `${U.money(p.deal.app)}/app` : '',
        p.deal && p.deal.goal ? `${U.money(p.deal.goal)}/goal` : '',
      ]
        .filter(Boolean)
        .join(' · ');
    return `<div class="card"><div class="row"><div class="h3 grow">Wages & bonuses this season</div><b>${U.money(total)}</b></div>
      ${rows.map(([k, l]) => `<div class="row small" style="margin-top:8px"><span style="width:130px" class="dim">${l}</span><div class="grow">${C.bar(((sp[k] || 0) / mx) * 100, k === 'wages' || k === 'staff' ? 'var(--acc2)' : 'var(--warn)')}</div><b style="width:72px;text-align:right">${U.money(sp[k] || 0)}</b></div>`).join('')}
      <div class="small b dim" style="margin:14px 0 4px">TOP EARNERS</div>
      ${earners.map((p) => `<div class="row small tap" style="padding:5px 0" data-act="player" data-id="${p.id}"><span class="grow ellip">${esc(W.name(p))}${bits(p) ? ` <span class="tiny dim">${bits(p)}</span>` : ''}</span><b>${U.money(p.wage)}/wk</b></div>`).join('')}
      <div class="tiny dim" style="margin-top:8px">Bonuses and fees come from contract clauses you agree in negotiations.</div></div>`;
  }
  function hofView() {
    const s = S(),
      c = club();
    const { withClub, all } = FM.Records.allTime(c.id);
    const sec = (title, arr, val, sub) =>
      `<div class="sec"><div class="h3">${title}</div></div><div class="card flat" style="padding:2px 14px">${
        arr.length
          ? arr
              .slice(0, 5)
              .map(
                (x, i) =>
                  `<div class="legend-row ${x.id && s.players[x.id] ? 'tap' : ''}" ${x.id && s.players[x.id] ? `data-act="player" data-id="${x.id}"` : ''}><div class="rank">${i + 1}</div><div class="grow"><div class="b">${C.flag(x.nat)} ${esc(x.name)} ${x.active ? '<span class="pill acc">Active</span>' : ''}</div><div class="tiny dim">${esc(sub(x))}</div></div><div class="era">${val(x)}</div></div>`,
              )
              .join('')
          : '<div class="empty">Your save will write this chapter.</div>'
      }</div>`;
    return `<div class="small muted" style="margin:0 2px 4px">The club remembers. Legends from history sit alongside the ones your save creates.</div>
      ${sec(
        'Top scorers',
        all.filter((x) => x.goals).sort((a, b) => b.goals - a.goals),
        (x) => x.goals,
        (x) => `${x.pos} · ${x.apps} apps${x.era ? ' · ' + x.era : ''}`,
      )}
      ${sec(
        'Most appearances',
        all.slice().sort((a, b) => b.apps - a.apps),
        (x) => x.apps,
        (x) => `${x.pos}${x.era ? ' · ' + x.era : ''}${x.note ? ' · ' + x.note : ''}`,
      )}
      ${sec(
        'Academy graduates',
        withClub.filter((x) => x.youth === c.id).sort((a, b) => b.apps - a.apps),
        (x) => x.apps,
        (x) => `${x.pos} · ${x.goals} goals${x.became ? ' · ' + x.became : ''}`,
      )}
      ${sec(
        'Cult heroes',
        withClub.filter((x) => x.cult > 0).sort((a, b) => b.cult - a.cult),
        (x) => '⭐' + x.cult,
        (x) => `${x.derbyGoals} derby goals · ${x.apps} apps`,
      )}
      <div class="sec"><div class="h3">Biggest sales</div></div><div class="card flat" style="padding:2px 14px">${(c.bestSales || []).length ? c.bestSales.map((b, i) => `<div class="legend-row ${P(b.pid) ? 'tap' : ''}" ${P(b.pid) ? `data-act="player" data-id="${b.pid}"` : ''}><div class="rank">${i + 1}</div><div class="grow"><div class="b">${esc(b.name)}</div><div class="tiny dim">to ${esc(CL(b.to).name)} · ${b.year}</div></div><div class="era" style="color:var(--bad)">${U.money(b.fee)}</div></div>`).join('') : '<div class="empty">No big sales yet.</div>'}</div>`;
  }
  function archiveView() {
    const s = S();
    if (!s.archive.length)
      return `<div class="empty">📚 The Football Archive<br><br>Every season you play is recorded here — champions, Golden Boots, upsets, record transfers. Fifty seasons from now, scroll back through your alternate football history.<br><br>Finish your first season to write the first entry.</div>`;
    return s.archive
      .slice()
      .reverse()
      .map(
        (
          e,
        ) => `<div class="card"><div class="row"><div class="era grow">${e.label}</div>${e.user ? `<span class="pill ${e.user.trophies.length ? 'acc' : ''}">You: ${U.ordinal(e.user.pos)} with ${esc(CL(e.user.club).short)}</span>` : ''}</div>
      ${Object.values(e.comps)
        .filter(W.homeLeague)
        .map(
          (
            x,
          ) => `<div style="margin-top:10px"><div class="small b dim" style="text-transform:uppercase;letter-spacing:.6px">${esc(x.name)}</div>
        <div class="row small" style="margin-top:4px">🏆 ${C.crest(CL(x.champion), 18)} <b class="grow">${esc(CL(x.champion).name)}</b><span class="dim">runner-up ${esc(CL(x.runnerUp).short)}</span></div>
        ${x.topScorer ? `<div class="small" style="margin-top:3px">👟 ${esc(x.topScorer.name)} — ${x.topScorer.goals} goals</div>` : ''}
        ${x.poty ? `<div class="small" style="margin-top:3px">⭐ Player of the Season: ${esc(x.poty.name)} (${x.poty.avg})</div>` : ''}
        ${x.playoffWinner ? `<div class="small" style="margin-top:3px">🎟️ Playoff winners: ${esc(CL(x.playoffWinner).name)}</div>` : ''}</div>`,
        )
        .join('')}
      ${
        Object.values(e.comps).some((x) => !W.homeLeague(x))
          ? `<div style="margin-top:10px"><div class="small b dim" style="text-transform:uppercase;letter-spacing:.6px">Around the world</div>${Object.values(
              e.comps,
            )
              .filter((x) => !W.homeLeague(x))
              .map(
                (x) =>
                  `<div class="row small" style="margin-top:4px">${C.flag(x.nat)} <span class="dim grow ellip">${esc(x.name)}</span>${C.crest(CL(x.champion), 16)} <b>${esc(CL(x.champion).short)}</b></div>`,
              )
              .join('')}</div>`
          : ''
      }
      ${
        e.cups && Object.keys(e.cups).length
          ? `<div style="margin-top:10px"><div class="small b dim" style="text-transform:uppercase;letter-spacing:.6px">Cups</div>${Object.values(
              e.cups,
            )
              .map(
                (x) =>
                  `<div class="row small" style="margin-top:4px">🏆 <span class="dim">${esc(x.name)}</span><span class="grow"></span>${C.crest(CL(x.winner), 16)} <b>${esc(CL(x.winner).name)}</b></div>`,
              )
              .join('')}</div>`
          : ''
      }
      ${e.intl && e.intl.length ? `<div style="margin-top:10px"><div class="small b dim" style="text-transform:uppercase;letter-spacing:.6px">International</div>${e.intl.map((x) => `<div class="small" style="margin-top:4px">🌍 ${esc(x.name)}: <b>${C.flag(FM.S.nteams[x.winner].code)} ${esc(FM.S.nteams[x.winner].name)}</b> <span class="dim">${esc(x.final)} v ${esc(FM.S.nteams[x.runnerUp].name)}</span></div>`).join('')}</div>` : ''}
      <div class="small" style="margin-top:10px">⬆️ ${e.promoted.map((id) => esc(CL(id).short)).join(', ')} &nbsp; ⬇️ ${e.relegated.map((id) => esc(CL(id).short)).join(', ')}</div>
      ${e.upsets.length ? `<div class="small" style="margin-top:6px">😱 Upset of the season: ${esc(CL(e.upsets[0].w).name)} ${e.upsets[0].score.split('–').sort().reverse().join('–')} ${esc(CL(e.upsets[0].l).name)}</div>` : ''}
      ${e.transfers.length ? `<div class="small" style="margin-top:6px">💰 Record deal: ${esc(e.transfers[0].name)} to ${esc(CL(e.transfers[0].to).short)} for ${U.money(e.transfers[0].fee)}</div>` : ''}</div>`,
      )
      .join('');
  }
  // Pre-match team talks: how they landed, and which talk works best for you
  function teamTalkCard(u) {
    const t = u.teamTalks;
    if (!t || !t.n) return '';
    const kinds = Object.entries(t.kinds)
      .map(([k, v]) => [k, v, v.good / v.n])
      .sort((a, b) => b[2] - a[2] || b[1].n - a[1].n);
    const best = kinds.find(([, v]) => v.n >= 3);
    return `<div class="card"><div class="row"><div class="h3 grow">Team talks</div><span class="small dim">${t.n} before kick-off</span></div>
      <div class="row small" style="margin-top:10px;gap:14px;flex-wrap:wrap"><span>🔥 <b>${t.fired}</b> fired up</span><span>👍 <b>${t.ok}</b> got through</span><span>😐 <b>${t.mixed}</b> mixed</span><span>😞 <b>${t.flat}</b> didn't land</span></div>
      <div class="small dim" style="margin-top:8px;line-height:1.5">${kinds.map(([k, v]) => `${esc(FM.Matchday.TALKS[k].label)} ${v.good}/${v.n}`).join(' · ')}${best ? `<br>Your best: <b>${esc(FM.Matchday.TALKS[best[0]].label)}</b> lands ${Math.round(best[2] * 100)}% of the time.` : ''}</div></div>`;
  }
  function managerView() {
    const s = S(),
      u = s.user,
      st = u.stats;
    const tags = [];
    if (st.youthDebuts >= 3) tags.push(['🌱', 'Youth Developer']);
    if (st.giantKills >= 2) tags.push(['🗡️', 'Giant Killer']);
    if (st.promotions >= 1) tags.push(['📈', 'Promotion Specialist']);
    if (st.trophies >= 2) tags.push(['🏆', 'Serial Winner']);
    if (u.tactic.buildup === 'Possession' && st.w > st.l && st.games >= 10) tags.push(['🧠', 'Tactical Innovator']);
    if (st.sold >= 3) tags.push(['💼', 'Wheeler-Dealer']);
    const fav = u.favClub && S().clubs[u.favClub];
    return `<div class="card"><div class="row" style="gap:12px">${C.avatar(u, 52)}<div class="grow"><div class="h2">${u.nat ? C.flag(u.nat) + ' ' : ''}${esc(u.name)}</div><div class="small dim">${esc(u.badges)} licence · ${club() ? `Manager of ${esc(club().name)}` : 'Out of work'}${fav ? ` · ❤️ ${esc(fav.name)}` : ''}</div></div></div>
      <div class="row small" style="margin-top:12px"><span style="width:90px" class="dim">Reputation</span><div class="grow">${C.bar(u.rep)}</div><b style="margin-left:8px">${Math.round(u.rep)}</b></div>
      <div style="margin-top:12px">${tags.length ? tags.map(([i, t]) => `<span class="trait">${i} ${t}</span>`).join('') : '<span class="small dim">Your managerial identity will emerge from how you manage — youth, giant-killing, promotions, tactics.</span>'}</div></div>
      ${teamTalkCard(u)}
      ${UI.careerExtras()}
      <div class="kpis"><div class="kpi"><div class="v">${st.games}</div><div class="l">Games</div></div><div class="kpi"><div class="v">${st.games ? Math.round((st.w / st.games) * 100) : 0}%</div><div class="l">Win rate</div></div><div class="kpi"><div class="v">${st.trophies}</div><div class="l">Trophies</div></div></div>
      <div class="card flat small"><div class="row"><span class="grow dim">W / D / L</span><b>${st.w} / ${st.d} / ${st.l}</b></div><div class="row" style="margin-top:6px"><span class="grow dim">Youth debuts</span><b>${st.youthDebuts}</b></div><div class="row" style="margin-top:6px"><span class="grow dim">Giant-killings</span><b>${st.giantKills}</b></div><div class="row" style="margin-top:6px"><span class="grow dim">Signings / sales</span><b>${st.bought} / ${st.sold}</b></div></div>
      <div class="sec"><div class="h3">Career</div></div><div class="card flat">${
        u.history.filter((h) => h.year).length
          ? u.history
              .filter((h) => h.year)
              .slice()
              .reverse()
              .map(
                (h) =>
                  `<div class="row small" style="padding:6px 0">${C.crest(CL(h.club), 20)}<span class="grow">${h.year} · ${esc(h.comp)}</span><b>${U.ordinal(h.pos)}</b>${h.trophies.length ? ' 🏆' : ''}${h.promoted ? ' ⬆️' : ''}${h.relegated ? ' ⬇️' : ''}</div>`,
              )
              .join('')
          : '<div class="small dim">First season in progress.</div>'
      }</div>`;
  }
  function settingsView() {
    const s = S();
    return `<div class="card"><div class="row"><div class="grow"><div class="h3">Theme</div><div class="small dim">Dark or light UI</div></div><div class="seg" style="width:160px"><button class="${s.settings.theme === 'dark' ? 'on' : ''}" data-act="theme" data-v="dark">Dark</button><button class="${s.settings.theme === 'light' ? 'on' : ''}" data-act="theme" data-v="light">Light</button></div></div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Default match speed</div></div><div class="seg" style="width:160px">${[1, 2, 4].map((v) => `<button class="${s.settings.speed === v ? 'on' : ''}" data-act="speedDef" data-v="${v}">${v}×</button>`).join('')}</div></div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Season preview popup</div><div class="small dim">Show it automatically in pre-season (it's always on the Home screen)</div></div><div class="seg" style="width:120px"><button class="${!s.settings.skipPreview ? 'on' : ''}" data-act="setFlag" data-k="skipPreview" data-v="0">On</button><button class="${s.settings.skipPreview ? 'on' : ''}" data-act="setFlag" data-k="skipPreview" data-v="1">Off</button></div></div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Haptics</div><div class="small dim">A light tap on every button (phones that support it)</div></div><div class="seg" style="width:120px"><button class="${!s.settings.noHaptics ? 'on' : ''}" data-act="setFlag" data-k="noHaptics" data-v="0">On</button><button class="${s.settings.noHaptics ? 'on' : ''}" data-act="setFlag" data-k="noHaptics" data-v="1">Off</button></div></div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Matchday digest</div><div class="small dim">A round-up card in the feed after every league matchday</div></div><div class="seg" style="width:120px"><button class="${!s.settings.noDigest ? 'on' : ''}" data-act="setFlag" data-k="noDigest" data-v="0">On</button><button class="${s.settings.noDigest ? 'on' : ''}" data-act="setFlag" data-k="noDigest" data-v="1">Off</button></div></div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Currency</div><div class="small dim">Auto uses your club's: £ in Britain, € in the eurozone, $ elsewhere</div></div></div><div class="seg" style="margin-top:8px">${[
        ['auto', 'Auto'],
        ['GBP', '£'],
        ['EUR', '€'],
        ['USD', '$'],
      ]
        .map(
          ([v, l]) =>
            `<button class="${(s.settings.currency || 'auto') === v ? 'on' : ''}" data-act="currency" data-v="${v}">${l}</button>`,
        )
        .join('')}</div></div>
      <div class="card"><div class="h3">World rules</div><div class="small muted" style="margin-top:6px;line-height:1.6">Points for a win: <b>${s.rules.win}</b> · Subs: <b>${s.rules.subs}</b> · Foreign players in squad: <b>${W.foreignLimitText()}</b><br>Rules may change as the football world evolves.</div></div>
      ${UI.installCard()}
      <div class="card"><div class="row"><div class="grow"><div class="h3">Save slot ${UI.slot}</div><div class="small dim">Autosaves after every matchday and whenever you leave the app · ${esc(FM.Save.backend())}</div></div><button class="btn sm" data-act="saveNow">Save now</button></div>
        <div class="row" style="gap:8px;margin-top:12px"><button class="btn sm grow" data-act="exportSave">⬆️ Export backup</button><button class="btn sm grow" data-act="importSave">⬇️ Import backup</button></div>
        <div class="tiny dim" style="margin-top:8px;line-height:1.5">${backupLine(s)} A backup is one compressed .touchline file. Keep it somewhere safe, or move your career to another device.</div></div>
      <button class="btn block" data-act="toTitle" style="margin-bottom:10px">Main menu</button>
      <div class="tiny dim center" style="margin-top:14px;line-height:1.6">TOUCHLINE prototype · one-time purchase · no energy · no packs · no pay-to-win</div>`;
  }
  UI.acts.currency = (d) => {
    S().settings.currency = d.v;
    UI.save();
    UI.render();
  };
  UI.acts.theme = (d) => {
    S().settings.theme = d.v;
    try {
      localStorage.setItem('touchline.theme', d.v);
    } catch (e) {}
    UI.applyTheme();
    UI.save();
    UI.render();
  };
  UI.acts.setFlag = (d) => {
    S().settings[d.k] = d.v === '1';
    UI.save();
    UI.render();
  };
  UI.acts.speedDef = (d) => {
    S().settings.speed = +d.v;
    UI.save();
    UI.render();
  };
  UI.acts.saveNow = () => {
    if (UI.save()) UI.toast('Saved');
  };
  const backupLine = (s) => {
    const b = s.settings.lastBackup;
    if (!b) return '<b>No backup yet.</b>';
    const d = new Date(b.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return `<b>Last backup: ${esc(d)}</b> (season ${b.year}/${String((b.year + 1) % 100).padStart(2, '0')}).`;
  };
  // Once a season, at the review: nudge towards a backup if there isn't one from the season just finished
  // (the review opens after the new season has started, so "this season" is S().year - 1)
  UI.backupDue = () => {
    const b = S().settings.lastBackup;
    return !b || b.year < S().year - 1;
  };
  // ---------- Backups ----------
  UI.acts.exportSave = async () => {
    try {
      await FM.Save.write(UI.slot, S());
      const f = await FM.Save.exportFile(UI.slot);
      const r = await FM.Native.shareFile({
        bytes: f.bytes,
        name: f.name,
        type: f.type,
        title: 'Touchline backup',
        preferShare: matchMedia('(pointer: coarse)').matches,
      });
      if (r !== 'cancelled') {
        // Remember when (real date and game date) for the Settings line and the season-end reminder
        S().settings.lastBackup = { at: Date.now(), year: S().year, day: S().day };
        UI.save();
        document.getElementById('backupNudge')?.remove();
        if (UI.tab === 'club' && UI.sub.club === 'settings' && !document.querySelector('.sheet-wrap')) UI.render();
        UI.toast(
          `Backup ${r === 'saved' ? 'saved' : 'ready'}: ${f.name} (${Math.max(1, Math.round(f.bytes.length / 1024))} KB)`,
          3500,
        );
      }
    } catch (e) {
      console.warn(e);
      UI.toast('⚠️ ' + (e.message || 'Export failed'), 4000);
    }
  };
  UI.acts.importSave = async () => {
    const bytes = await FM.Native.pickFile('');
    if (!bytes) return;
    let res;
    try {
      res = await FM.Save.importBytes(bytes);
    } catch (e) {
      return UI.toast('⚠️ ' + e.message, 4500);
    }
    UI._import = res.state;
    const st = res.state,
      c = st.clubs[st.user.clubId];
    UI.sheet(
      `<div class="card row">${C.crest(c, 36)}<div class="grow"><div class="b">${esc(c.name)}</div><div class="small dim">${esc(st.user.name)} · ${st.year} · day ${st.day + 1}${res.from < FM.Save.VERSION ? ` · upgraded from v${res.from}` : ''}</div></div></div>
      <div class="h3" style="margin:10px 0 6px">Import into</div>
      <div class="list">${[1, 2, 3]
        .map((n) => {
          const m = UI.slotMeta(n);
          return `<div class="prow tap" data-act="importTo" data-n="${n}"><b style="width:52px">Slot ${n}</b><div class="grow small ${m ? '' : 'dim'}">${m ? `${esc(m.club.name)} · ${m.year} — <span style="color:var(--bad)">will be replaced</span>` : 'Empty'}</div><span class="dim">›</span></div>`;
        })
        .join('')}</div>`,
      { title: 'Import backup' },
    );
  };
  UI.acts.importTo = async (d) => {
    const st = UI._import,
      n = +d.n;
    if (!st) return;
    try {
      await FM.Save.write(n, st);
      UI._import = null;
      UI.closeAllSheets();
      if (!(await UI.load(n))) return;
      UI.applyTheme();
      UI.tab = 'home';
      UI.mount();
      UI.toast(`Backup imported into slot ${n}`, 3000);
    } catch (e) {
      console.warn(e);
      UI.toast('⚠️ Could not import: ' + (e.message || 'storage error'), 4500);
    }
  };
  UI.acts.toTitle = () => {
    UI.save();
    UI.title();
  };

  // ---------- Season review ----------
  UI.seasonReview = function (sm) {
    const e = sm.entry;
    const c = e.user ? CL(e.user.club) : NOCLUB; // out of work all season: no club to review
    UI.sheet(
      `<div class="hero" style="--c1:${c.colors[0]};--c2:${c.colors[1]}"><div class="tag">Season review · ${e.label}</div><div class="h1" style="margin:10px 0">${!e.user ? 'A season out of the dugout' : sm.trophies.length ? '🏆 ' + esc(sm.trophies.join(' & ')) : `Finished ${U.ordinal(sm.userPos)}`}</div><div class="small" style="opacity:.9">${sm.promoted ? `⬆️ Promoted to the ${esc(S().comps[c.comp].name)}!` : sm.relegated ? '⬇️ Relegated. The rebuild starts now.' : esc(c.name)}</div></div>
      ${!e.user ? '<div class="small muted" style="margin:4px 2px 12px">The football world carried on without you. Your offers are on the Home tab.</div>' : ''}
      ${e.user ? `<div class="card"><div class="h3">Board verdict</div>${sm.objs.map((o) => `<div class="row small" style="margin-top:8px"><span>${o.ok || (o.promo && sm.promoted) ? '✅' : '❌'}</span><span class="grow">${esc(o.text)}</span></div>`).join('')}<div class="small muted" style="margin-top:10px">${sm.sacked ? 'The board have seen enough.' : 'Board confidence: ' + Math.round(c.boardConf) + '%'}</div></div>` : ''}
      ${Object.values(e.comps)
        .filter(W.homeLeague)
        .map(
          (x) =>
            `<div class="card flat"><div class="small b dim">${esc(x.name.toUpperCase())}</div><div class="row small" style="margin-top:6px">🏆 ${C.crest(CL(x.champion), 18)}<b class="grow">${esc(CL(x.champion).name)}</b></div>${x.topScorer ? `<div class="small" style="margin-top:4px">👟 ${esc(x.topScorer.name)} (${x.topScorer.goals})</div>` : ''}${x.poty ? `<div class="small" style="margin-top:4px">⭐ ${esc(x.poty.name)}</div>` : ''}</div>`,
        )
        .join('')}
      <div class="card flat"><div class="small b dim">AROUND THE WORLD</div>${Object.values(e.comps)
        .filter((x) => !W.homeLeague(x))
        .map(
          (x) =>
            `<div class="row small" style="margin-top:6px">${C.flag(x.nat)} <span class="grow ellip">${esc(x.name)}</span>${C.crest(CL(x.champion), 16)} <b>${esc(CL(x.champion).short)}</b></div>`,
        )
        .join('')}</div>
      ${
        e.cups && Object.keys(e.cups).length
          ? `<div class="card flat"><div class="small b dim">CUPS</div>${Object.values(e.cups)
              .map(
                (x) =>
                  `<div class="row small" style="margin-top:6px">🏆 <span class="grow">${esc(x.name)}</span>${C.crest(CL(x.winner), 16)} <b>${esc(CL(x.winner).short)}</b></div>`,
              )
              .join('')}</div>`
          : ''
      }
      ${e.intl && e.intl.length ? `<div class="card flat"><div class="small b dim">THIS SUMMER</div>${e.intl.map((x) => `<div class="row small" style="margin-top:6px">🌍 <span class="grow">${esc(x.name)}</span><b>${C.flag(FM.S.nteams[x.winner].code)} ${esc(FM.S.nteams[x.winner].name)}</b></div>`).join('')}</div>` : ''}
      ${UI.backupDue() ? `<div class="warnline row" id="backupNudge" style="gap:10px"><span class="grow">💾 A good moment to export a backup of your career — one small file, safe anywhere.</span><button class="btn sm" data-act="exportSave">Export</button></div>` : ''}
      <div class="small muted center" style="margin:10px 0">Everything has been written into the Football Archive.<br>Players have aged, contracts expired, veterans retired, and the world moved on — check the feed.</div>
      <button class="btn pri block" data-act="closeSheet">Start ${FM.Season.seasonLabel()} →</button>`,
      { title: 'End of season' },
    );
  };
})();
