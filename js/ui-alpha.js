// Alpha 1 screens: contract negotiation with clauses and agents, player talks and promises,
// the boardroom, coaching badges, and national team management (call-ups, tactics, qualifiers, finals).
(function () {
  const FM = window.FM, U = FM.U, D = FM.D, W = FM.W, UI = FM.UI, C = UI.C;
  const esc = U.esc, S = () => FM.S, P = (id) => FM.S.players[id], CL = (id) => FM.clubOf(id);
  const club = () => W.userClub();
  const Co = FM.Contracts, Pe = FM.People;
  const withCur = (opts, cur, fmt) => (opts.some(([v]) => String(v) === String(cur)) ? opts : opts.concat([[cur, fmt(cur)]]).sort((a, b) => a[0] - b[0]));
  const chipRow = (act, key, cur, opts) => `<div class="chips" style="flex-wrap:wrap;margin-top:6px">${opts.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-act="${act}" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const dots = (n, max) => `<span style="letter-spacing:2px">${'●'.repeat(Math.max(0, n))}${'○'.repeat(Math.max(0, max - n))}</span>`;

  // ======================= Player card: contract, agent, talks =======================
  const origOwn = UI.ownActions;
  UI.ownActions = function (p) {
    const base = origOwn(p);
    if (p.loan) return base;
    const d = p.deal || {}, ag = Co.agentInfo(p), open = Pe.openPromises(p.id);
    const clauses = [
      d.status ? `📋 ${D.STATUS[d.status].label}` : '',
      d.release ? `🔓 Release clause ${U.money(d.release)}` : '',
      d.app ? `👟 ${U.money(d.app)} per appearance` : '',
      d.goal ? `⚽ ${U.money(d.goal)} per goal` : '',
      d.rise ? `📈 +${Math.round(d.rise * 100)}% a year` : '',
      d.relegCut ? '⬇️ 25% wage cut if relegated' : '',
    ].filter(Boolean);
    const talk = `<button class="btn sm grow pri" data-act="talk" data-id="${p.id}">💬 Talk</button>`;
    const card = `<div class="card"><div class="row"><div class="h3 grow">Contract</div><span class="small dim">until ${p.contract}</span></div>
      <div class="row small" style="margin-top:6px"><span class="grow muted">Wage</span><b>${U.money(p.wage)}/wk</b></div>
      ${clauses.length ? `<div style="margin-top:6px">${clauses.map((x) => `<span class="trait">${esc(x)}</span>`).join('')}</div>` : '<div class="tiny dim" style="margin-top:6px">No clauses.</div>'}
      <div class="row small" style="margin-top:8px"><span class="grow muted">Agent</span><b>${ag.icon} ${esc(ag.name)}</b></div><div class="tiny dim">${esc(ag.firm)} · ${esc(ag.style)} — ${esc(ag.desc)}</div>
      ${open.length ? `<div class="h3" style="margin-top:10px">Promises</div>${open.map((x) => `<div class="row small" style="margin-top:4px"><span>🤝</span><span class="grow">${esc(Pe.PROMISE[x.type].label)}</span><span class="dim tiny">${esc(Pe.PROMISE[x.type].desc(x))}</span></div>`).join('')}` : ''}
      ${p.wantsOut ? '<div class="warnline" style="margin-top:8px">He wants to leave the club.</div>' : ''}</div>`;
    return base.replace('<div class="row" style="gap:6px;margin-bottom:12px;flex-wrap:wrap">', `<div class="row" style="gap:6px;margin-bottom:12px;flex-wrap:wrap">${talk}`) + card;
  };
  const origReport = UI.reportCard;
  UI.reportCard = function (p, v) {
    let html = origReport(p, v);
    const bits = [];
    if (v.k >= 40 && p.clubId) bits.push(`<div class="row small" style="margin-top:4px"><span class="grow muted">Release clause</span><b>${p.deal && p.deal.release ? U.money(p.deal.release) : 'None'}</b></div>`);
    if (v.k >= 30) { const ag = Co.agentInfo(p); bits.push(`<div class="row small" style="margin-top:4px"><span class="grow muted">Agent</span><b>${ag.icon} ${esc(ag.style)}</b></div>`); }
    if (bits.length) html = html.replace('<div class="row" style="gap:6px;margin-top:12px;flex-wrap:wrap">', bits.join('') + '<div class="row" style="gap:6px;margin-top:12px;flex-wrap:wrap">');
    return html;
  };

  // ---------- Talks ----------
  UI.acts.talk = (d) => {
    const p = P(d.id);
    const opts = Pe.talkOptions(p);
    const f = p.form.length ? U.avg(p.form.slice(-3)).toFixed(1) : '—';
    UI.sheet(`<div class="row">${C.pos(p)}<div class="grow"><div class="b">${esc(W.name(p))}</div><div class="tiny dim">${esc(p.personality)} · morale ${W.moraleLabel(p.morale).join(' ')} · recent form ${f}</div></div></div>
      <div class="small muted" style="margin:10px 0">Your word matters: kept promises lift morale and trust; broken ones cost both — and the whole dressing room notices. Squad trust <b>${Math.round(S().user.trust ?? 60)}%</b>.</div>
      ${Pe.canTalk(p) ? opts.map((k) => `<button class="card row tap" style="width:100%;text-align:left" data-act="doTalk" data-id="${p.id}" data-k="${k}"><span style="font-size:22px">${Pe.TALKS[k].icon}</span><div class="grow"><div class="b small">${esc(Pe.TALKS[k].label)}</div>${Pe.PROMISE[k] ? `<div class="tiny dim">Promise: ${esc(Pe.PROMISE[k].desc({ ...{ target: p.season.apps + 4, base: p.season.apps, days: Pe.PROMISE[k].days, status: 'regular' } }))}</div>` : ''}</div></button>`).join('') : '<div class="empty">You spoke to him recently. Give it a few days.</div>'}`, { title: 'Talk to player' });
  };
  UI.acts.doTalk = (d) => {
    const r = Pe.talk(d.id, d.k);
    UI.closeAllSheets();
    UI.toast(r.msg, 4200);
    UI.save(); UI.render();
    if (r.ok) UI.playerSheet(d.id);
  };

  // ======================= Negotiation =======================
  UI.acts.offer = (d) => {
    const p = P(d.id), c = club();
    const mode = p.clubId && !p.loan && FM.Scouting.view(p).rec === 'Loan' ? 'loan' : 'transfer';
    UI._offer = { pid: p.id, mode, fee: p.clubId ? FM.Transfers.userAsk(p) : 0, terms: Co.defaultTerms(p, c, 'transfer'), share: 0.5, loanFee: 0 };
    UI.offerSheet();
  };
  UI.acts.renew = (d) => {
    const p = P(d.id), c = club();
    UI._offer = { pid: p.id, mode: 'renew', fee: 0, terms: Co.defaultTerms(p, c, 'renew') };
    UI.offerSheet();
  };
  const stepBtns = (field, steps) => `<div class="row" style="gap:4px;margin-top:6px;flex-wrap:wrap">${steps.map((st) => `<button class="btn sm" style="flex:1;padding:7px 2px;font-size:12px" data-act="ngStep" data-f="${field}" data-v="${st}">${st > 0 ? '+' : '−'}${U.money(Math.abs(st)).replace('$', '')}</button>`).join('')}</div>`;
  const numIn = (field, val, id) => `<div class="row" style="gap:8px;margin-top:6px"><input type="number" inputmode="numeric" min="0" step="50" value="${val}" data-input="ngNum" data-f="${field}" class="numin"><b id="${id}" style="min-width:74px;text-align:right">${U.money(val)}</b></div>`;
  UI.offerSheet = function (msg) {
    const o = UI._offer, p = P(o.pid), c = club(), T = FM.Transfers;
    const renew = o.mode === 'renew';
    const loanable = !renew && p.clubId && !p.loan;
    const dir = FM.Staff.get('director'), ag = Co.agentInfo(p), pat = Co.patience(p);
    const tabs = loanable ? `<div class="seg" style="margin:10px 0">${[['transfer', 'Permanent'], ['loan', 'Loan']].map(([k, l]) => `<button class="${o.mode === k ? 'on' : ''}" data-act="ofMode" data-v="${k}">${l}</button>`).join('')}</div>` : '';
    let body = '';
    if (o.mode === 'loan') {
      body = `<div class="h3" style="margin-top:12px">Share of wages you pay</div>${chipRow('ofSet', 'share', o.share, [[0.25, '25%'], [0.5, '50%'], [0.75, '75%'], [1, '100%']])}
        <div class="small dim" style="margin-top:6px">That's ${U.money(p.wage * o.share)}/wk of his ${U.money(p.wage)}/wk.</div>
        <div class="row" style="margin-top:14px"><div class="h3 grow">Loan fee (optional)</div></div>
        ${numIn('loanFee', o.loanFee, 'ngLoanFee')}${stepBtns('loanFee', [-1e5, -1e4, 1e4, 1e5])}
        <div class="small dim" style="margin-top:6px">A fee of ~5% of his value (${U.money(p.value * 0.05)}) makes his club more flexible on wages. He returns at the end of the season.</div>`;
    } else {
      const t = o.terms, mode = renew ? 'renew' : 'transfer';
      const ev = Co.evaluate(p, c, t, mode);
      const need = Co.wageNeeded(p, c, t, mode);
      const pct = ev.hard ? 0 : U.clamp(Math.round((ev.value / ev.need) * 100), 0, 100);
      const clause = p.clubId && !renew && p.deal && p.deal.release;
      const fee = !renew && p.clubId ? `<div class="row" style="margin-top:12px"><div class="h3 grow">Transfer fee</div><span class="tiny dim">asking ~${U.money(T.userAsk(p))}</span></div>
          ${numIn('fee', o.fee, 'ngFee')}${stepBtns('fee', [-1e6, -1e5, -1e4, 1e4, 1e5, 1e6])}
          ${clause ? `<div class="tiny" style="margin-top:6px;color:var(--acc2)">🔓 Release clause ${U.money(clause)} — pay it and ${esc(S().clubs[p.clubId].name)} can't refuse. <button class="btn sm" data-act="ngClause">Pay clause</button></div>` : ''}` : '';
      const w = p.wage;
      body = `${fee}
        <div class="row" style="margin-top:14px"><div class="h3 grow">Weekly wage</div><span class="tiny dim">${need == null ? '' : `needs ~${U.money(need)} with these terms`}</span></div>
        ${numIn('wage', t.wage, 'ngWage')}${stepBtns('wage', [-1000, -250, -50, 50, 250, 1000])}
        <div class="h3" style="margin-top:14px">${renew ? 'Extend by' : 'Contract length'}</div>${chipRow('ngSet', 'years', t.years, [1, 2, 3, 4, 5].map((y) => [y, renew ? `+${y} (to ${Co.renewedUntil(p.contract, y)})` : `${y} yr${y > 1 ? 's' : ''}`]))}
        <div class="h3" style="margin-top:12px">Squad status <span class="tiny dim">(he expects: ${D.STATUS[ev.expSt || Co.expectedStatus(p, c)].label.toLowerCase()})</span></div>${chipRow('ngSet', 'status', t.status, Co.STATUS_ORDER.map((k) => [k, D.STATUS[k].label]))}
        <div class="h3" style="margin-top:12px">Signing-on fee</div>${chipRow('ngSet', 'bonus', t.bonus, withCur([[0, 'None'], ...[4, 10, 26].map((k) => [U.roundMoney((w || t.wage) * k), U.money(U.roundMoney((w || t.wage) * k))])], t.bonus, U.money))}
        <div class="h3" style="margin-top:12px">Appearance fee</div>${chipRow('ngSet', 'app', t.app, [[0, 'None'], ...[0.1, 0.25, 0.5].map((f) => [Math.round((t.wage * f) / 50) * 50, U.money(Math.round((t.wage * f) / 50) * 50)])])}
        ${['ST', 'W', 'AM', 'CM'].includes(p.pos) ? `<div class="h3" style="margin-top:12px">Goal bonus</div>${chipRow('ngSet', 'goal', t.goal, [[0, 'None'], ...[0.25, 0.5, 1].map((f) => [Math.round((t.wage * f) / 50) * 50, U.money(Math.round((t.wage * f) / 50) * 50)])])}` : ''}
        <div class="h3" style="margin-top:12px">Release clause</div>${chipRow('ngSet', 'release', t.release, [[0, 'None'], ...[1.5, 2.5, 4].map((f) => [U.roundMoney(p.value * f), `${U.money(p.value * f)}`])])}
        <div class="h3" style="margin-top:12px">Yearly wage rise</div>${chipRow('ngSet', 'rise', t.rise, [[0, 'None'], [0.05, '+5%'], [0.1, '+10%']])}
        <div class="row" style="margin-top:12px"><div class="grow"><div class="h3">Relegation wage cut</div><div class="tiny dim">Wage drops 25% if we go down</div></div><button class="btn sm ${t.relegCut ? 'pri' : ''}" data-act="ngToggle">${t.relegCut ? 'Included' : 'Off'}</button></div>
        <div class="card flat" style="margin-top:14px"><div class="row small"><span class="grow">Package vs his demands</span><b style="color:${ev.ok ? 'var(--good)' : pct >= 90 ? 'var(--warn)' : 'var(--bad)'}">${ev.hard ? 'Refuses the role' : ev.ok ? 'Acceptable' : pct + '%'}</b></div>${C.bar(pct, ev.ok ? 'var(--good)' : pct >= 90 ? 'var(--warn)' : 'var(--bad)')}
          <div class="tiny dim" style="margin-top:6px">Total cost: ${U.money((renew ? 0 : o.fee) + t.wage * 52 * t.years + (t.bonus || 0) + Co.agentFee(p, o.fee, t.wage, mode))} incl. agent fee ${U.money(Co.agentFee(p, o.fee, t.wage, mode))}${t.release ? ` · a club paying ${U.money(t.release)} can take him` : ''}</div></div>`;
    }
    const html = `<div class="row">${C.pos(p)}<div class="grow b">${esc(W.name(p))} <span class="dim small">${W.age(p)}</span></div>${p.clubId && !renew ? C.crest(CL(p.clubId), 26) : renew ? '<span class="pill acc">Renewal</span>' : '<span class="pill">Free agent</span>'}</div>
      <div class="small dim" style="margin-top:6px">${renew ? `Current: ${U.money(p.wage)}/wk until ${p.contract}` : `Budget ${U.money(c.budget)} · Window ${FM.Season.windowOpen() ? '<b style="color:var(--acc)">open</b>' : '<b style="color:var(--bad)">closed</b>'}`}${dir.vacant ? '' : ` · ${esc(dir.fn + ' ' + dir.ln)} negotiating (${dir.ability}/20)`}</div>
      <div class="card flat row" style="margin-top:10px;padding:10px 12px"><span style="font-size:22px">${ag.icon}</span><div class="grow"><div class="small b">${esc(ag.name)} · ${esc(ag.firm)}</div><div class="tiny dim">${esc(ag.style)} — ${esc(ag.desc)} Agent fee ${Math.round(ag.fee * 100)}%.</div></div><div class="tiny dim" style="text-align:right">Patience<br>${Co.blocked(p) ? '<b style="color:var(--bad)">Walked out</b>' : dots(pat.left, ag.patience)}</div></div>
      ${o.mode !== 'loan' ? talksLine(p) : ''}${tabs}${body}
      ${msg ? `<div class="reply" style="margin-top:12px">${esc(msg)}</div>` : ''}
      <button class="btn pri block" style="margin-top:16px" data-act="submitOffer">${o.mode === 'loan' ? 'Propose loan' : renew ? 'Offer new contract' : p.clubId ? 'Submit offer' : 'Offer contract'}</button>`;
    if (document.querySelector('.sheet-wrap .offer-sheet')) { const b = document.querySelector('.sheet-wrap:last-child .sh-body'); const y = b ? b.scrollTop : 0; UI.refreshSheet(`<div class="offer-sheet">${html}</div>`); if (b) b.scrollTop = y; }
    else UI.sheet(`<div class="offer-sheet">${html}</div>`, { title: renew ? 'Contract talks' : 'Negotiation' });
  };
  // What happened in earlier rounds of these talks
  const talksLine = (p) => {
    const log = Co.talksSoFar(p);
    if (!log) return '';
    const first = log[0].gap, last = log[log.length - 1];
    const closed = first > 0 ? Math.round((1 - last.gap / first) * 100) : 0;
    return `<div class="warnline" style="margin-top:10px">🗒️ ${log.length} offer${log.length === 1 ? '' : 's'} so far · last time the agent wanted <b>${U.money(last.need)}/wk</b> (you offered ${U.money(last.wage)})${log.length > 1 ? ` · gap ${U.money(first)} → ${U.money(last.gap)}${closed > 0 ? ` (${closed}% closed)` : ''}` : ''}</div>`;
  };
  UI.acts.ofMode = (d) => { UI._offer.mode = d.v; UI.offerSheet(); };
  UI.acts.ofSet = (d) => { UI._offer[d.k] = +d.v; UI.offerSheet(); };
  UI.acts.ngSet = (d) => { const t = UI._offer.terms; t[d.k] = d.k === 'status' ? d.v : +d.v; UI.offerSheet(); };
  UI.acts.ngToggle = () => { const t = UI._offer.terms; t.relegCut = !t.relegCut; UI.offerSheet(); };
  UI.acts.ngClause = () => { const o = UI._offer, p = P(o.pid); o.fee = p.deal.release; UI.offerSheet(); };
  const field = (o, f) => (f === 'wage' ? [o.terms, 'wage'] : [o, f]);
  UI.acts.ngStep = (d) => { const [obj, k] = field(UI._offer, d.f); obj[k] = Math.max(0, obj[k] + +d.v); UI.offerSheet(); };
  UI.acts.ngNum = (d, el) => {
    const [obj, k] = field(UI._offer, d.f);
    obj[k] = Math.max(0, Math.round(+el.value || 0));
    const b = document.getElementById({ fee: 'ngFee', wage: 'ngWage', loanFee: 'ngLoanFee' }[d.f]); if (b) b.textContent = U.money(obj[k]);
    clearTimeout(UI._ngT); UI._ngT = setTimeout(() => { const pos = el.selectionStart; UI.offerSheet(); const n = document.querySelector(`.offer-sheet [data-f="${d.f}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 700);
  };
  UI.acts.submitOffer = () => {
    const o = UI._offer, p = P(o.pid);
    const r = o.mode === 'loan' ? FM.Transfers.loanOffer(o.pid, o.share, o.loanFee) : o.mode === 'renew' ? Co.renewOffer(o.pid, { ...o.terms }) : Co.transferOffer(o.pid, p.clubId ? o.fee : 0, { ...o.terms });
    if (r.ok) { UI.closeAllSheets(); UI.toast(r.msg, 4000); UI.save(); UI.render(); return; }
    if (r.counter) { if (o.mode === 'loan') o.share = r.counter; else o.fee = r.counter; }
    UI.offerSheet(r.msg);
  };

  // ======================= Scout reports: dismiss =======================
  UI.acts.dismissReport = (d) => { FM.Scouting.dismiss(d.id); UI.save(); if (document.querySelector('.sheet-wrap')) UI.closeAllSheets(); UI.render(); UI.toast('Report dismissed — scouts will leave him alone unless you ask'); };
  UI.acts.restoreReport = (d) => { FM.Scouting.restore(d.id); UI.save(); UI.render(); UI.toast('Report restored'); };
  UI.acts.rfDismissed = () => { UI._rf.dismissed = !UI._rf.dismissed; UI.render(); };
  UI.acts.dismissWeak = () => {
    const s = S(); let n = 0;
    Object.keys(s.user.reports).forEach((id) => { const p = P(id); if (!p || W.isUser(p.clubId)) return; if (['C', 'D'].includes(FM.Scouting.view(p).grade)) { FM.Scouting.dismiss(id); n++; } });
    UI.save(); UI.render(); UI.toast(`${n} report${n === 1 ? '' : 's'} dismissed`);
  };
  const origReport2 = UI.reportCard;
  UI.reportCard = function (p, v) {
    const html = origReport2(p, v);
    return S().user.reports[p.id] ? html.replace(/<\/div>$/, `<button class="btn sm block" style="margin-top:8px" data-act="dismissReport" data-id="${p.id}">🗑 Dismiss report</button></div>`) : html;
  };

  // ======================= Home icon jumps to what needs attention =======================
  UI.pendingNews = () => S().news.filter((n) => (n.type === 'bid' && n.data.status === 'open') || ((n.type === 'press' || n.type === 'meeting' || n.type === 'medical') && !n.resolved));
  UI.acts.tab = (d) => {
    const pend = d.tab === 'home' ? UI.pendingNews() : [];
    if (!pend.length) return UI.go(d.tab);
    UI.sub.feed = 'all';
    UI.go('home');
    const n = pend[0];
    const el = document.querySelector(`#main [data-nid="${n.id}"]`);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('attn'); }
    else UI.sheet(`<div class="attn-sheet">${UI.newsCard(n)}</div>`, { title: 'Needs your attention' });
  };
  // Answering from the attention sheet closes it
  ['press', 'bid', 'meet'].forEach((k) => { const f = UI.acts[k]; UI.acts[k] = (d, el, e) => { const inSheet = el && el.closest('.attn-sheet'); f(d, el, e); if (inSheet) UI.closeSheet(); }; });

  // ======================= Team overview (from league and group tables) =======================
  UI.acts.clubView = (d) => UI.clubSheet(d.id);
  UI.clubSheet = function (id) {
    const s = S(), c = s.clubs[id];
    if (!c) return;
    const comp = c.comp && s.comps[c.comp], row = comp && comp.table[id];
    const I = D.IDENTITY[c.identity], mgr = c.manager && s.staff[c.manager];
    const tac = W.isUser(id) ? s.user.tactic : c.tactic;
    const sq = W.squad(id).sort((a, b) => b.ca - a.ca);
    const { xi } = W.pickXI(id, tac);
    const avg = Math.round(U.avg(xi.filter(Boolean), (p) => p.ca));
    const played = comp ? comp.fixtures.flat().filter((f) => f.res && (f.h === id || f.a === id)).slice(-5).reverse() : [];
    const next = comp ? comp.fixtures.flat().find((f) => !f.res && (f.h === id || f.a === id)) : null;
    // Every fixture this season: league rounds in order, then cup and continental ties
    const mine = (f) => f && (f.h === id || f.a === id);
    const leagueFx = comp ? comp.fixtures.map((rd, i) => ({ f: rd.find(mine), i })).filter((x) => x.f) : [];
    const cupFx = FM.Cups.allFixtures().filter((f) => mine(f) && f.comp !== c.comp);
    const allFx = leagueFx.map((x) => x.f).concat(cupFx);
    const roundOf = new Map(leagueFx.map((x) => [x.f, x.i]));
    const fxWhere = (f) => (roundOf.has(f) ? `${comp.short} · MD ${roundOf.get(f) + 1}` : `${s.comps[f.comp] ? s.comps[f.comp].name : ''}${f.po ? ' · ' + f.po : ''}`);
    // Head-to-head against your club this season (all competitions)
    const me = s.user.clubId;
    const h2h = W.isUser(id) ? [] : FM.Cups.allFixtures().filter((f) => mine(f) && (f.h === me || f.a === me));
    const tally = h2h.filter((f) => f.res).reduce((t, f) => { const w = FM.Season.winnerOf(f); const draw = f.res.hg === f.res.ag && !f.res.pens && f.res.win == null; if (draw) t.d++; else if (w === me) t.w++; else t.l++; return t; }, { w: 0, d: 0, l: 0 });
    const h2hRec = h2h.some((f) => f.res) ? `<span class="small b">You: ${tally.w}W ${tally.d}D ${tally.l}L</span>` : '<span class="tiny dim">Not played yet</span>';
    // All-time record against your club (every competition since the save began) and how heated it has become
    const at = !W.isUser(id) && s.records && s.records.h2h[`${me}|${id}`];
    const heat = !me || W.isUser(id) ? 0 : FM.Records.heat(me, id);
    const rivalTag = !me ? '' : s.clubs[me].rival === id ? '⚔️ Derby rivals' : heat >= FM.Records.RIVALRY ? '⚔️ Rivals' : heat >= FM.Records.EMERGING ? '🔥 A rivalry is emerging' : '';
    const allTimeCard = at ? `<div class="card"><div class="row"><div class="h3 grow">All-time head-to-head</div><span class="small b">P${at.p} · ${at.w}W ${at.d}D ${at.l}L · ${at.gf}–${at.ga}</span></div>
      ${at.last.map(([y, gf, ga, home, comp, pens]) => `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="dim" style="width:44px">${y}</span><span class="pill" style="min-width:26px;text-align:center;color:${gf > ga ? 'var(--good)' : gf < ga ? 'var(--bad)' : 'var(--ink3)'}">${gf > ga ? 'W' : gf < ga ? 'L' : 'D'}</span><span class="grow" style="margin-left:8px">${gf}–${ga}${pens ? ` (${pens[0]}–${pens[1]} pens)` : ''} ${home ? 'home' : 'away'}</span><span class="tiny dim ellip" style="max-width:40%">${esc(s.comps[comp] ? s.comps[comp].name : '')}</span></div>`).join('')}</div>` : '';
    const groups = [['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['ATT', 'Attackers']];
    const html = `<div class="hero" style="--c1:${c.colors[0]};--c2:${c.colors[1]}"><div class="row">${C.crest(c, 58)}<div class="grow"><div class="h2">${esc(c.name)}</div><div class="small" style="opacity:.9;margin-top:4px">${C.flag(c.nat)} ${comp ? `${esc(comp.name)} · ${U.ordinal(W.position(id))}` : 'No league'}</div><div style="margin-top:8px"><span class="pill" style="background:rgba(0,0,0,.3);color:#fff;border:0">${I.icon} ${I.label}</span> <span class="pill" style="background:rgba(0,0,0,.3);color:#fff;border:0">Rep ${Math.round(c.rep)}</span></div></div></div></div>
      ${W.isUser(id) ? `<button class="btn block" style="margin-bottom:10px" data-act="clubGoMine">This is your club → Club tab</button>` : ''}
      <div class="kpis"><div class="kpi"><div class="v">${row ? row.pts : '—'}</div><div class="l">Points</div></div><div class="kpi"><div class="v">${row ? `${row.w}-${row.d}-${row.l}` : '—'}</div><div class="l">W-D-L</div></div><div class="kpi"><div class="v">${avg || '—'}</div><div class="l">XI rating</div></div></div>
      <div class="card"><div class="row small"><span class="grow muted">Manager</span><b>${W.isUser(id) ? `${s.user.nat ? C.flag(s.user.nat) + ' ' : ''}${esc(s.user.name)}` : mgr ? `${C.flag(mgr.nat)} ${esc(mgr.fn + ' ' + mgr.ln)}` : '—'}</b></div>
        ${!W.isUser(id) && mgr && FM.Records.managerLine(mgr, id) ? `<div class="tiny dim" style="text-align:right;margin-top:2px">${esc(FM.Records.managerLine(mgr, id))}</div>` : ''}
        <div class="row small" style="margin-top:6px"><span class="grow muted">System</span><b>${tac.formation} · ${tac.buildup} · ${tac.press}</b></div>
        <div class="row small" style="margin-top:6px"><span class="grow muted">Stadium</span><b>${esc(c.stadium ? c.stadium.name : '—')}${c.stadium ? ` · ${c.stadium.cap.toLocaleString()}${c.sim === 'full' ? ` · opened ${FM.Records.stadium(c).opened}` : ''}` : ''}</b></div>
        ${c.rival ? `<div class="row small" style="margin-top:6px"><span class="grow muted">Rival</span><b class="tap" data-act="clubView" data-id="${c.rival}">⚔️ ${esc(s.clubs[c.rival].name)}</b></div>` : ''}
        ${rivalTag ? `<div class="row small" style="margin-top:6px"><span class="grow muted">With your club</span><b>${rivalTag}</b></div>` : ''}
        ${row ? `<div class="row small" style="margin-top:6px"><span class="grow muted">Form</span>${C.form(row.form)}</div>` : ''}
        ${c.sim && c.sim !== 'full' ? `<div class="tiny dim" style="margin-top:8px">${FM.Tiers.ICON[c.sim]} ${FM.Tiers.LABEL[c.sim]}</div>` : ''}</div>
      ${h2h.length ? `<div class="card"><div class="row"><div class="h3 grow">Head-to-head this season</div>${h2hRec}</div>${h2h.map((f) => `<div class="tiny dim" style="padding-top:6px">${esc(fxWhere(f))}</div>${f.res ? UI.fxLine(f) : `<div class="row small" style="padding:8px 0;border-top:1px solid var(--line)"><span class="grow ellip" style="text-align:right">${esc(s.clubs[f.h].name)}</span><b style="min-width:44px;text-align:center">v</b><span class="grow ellip">${esc(s.clubs[f.a].name)}</span></div>`}`).join('')}</div>` : ''}
      ${allTimeCard}
      ${allFx.length ? `<div class="card"><div class="row"><div class="h3 grow">Fixtures</div><span class="tiny dim">${allFx.filter((f) => f.res).length} played · ${allFx.filter((f) => !f.res).length} to come</span></div>${allFx.map((f) => `<div class="tiny dim" style="padding-top:6px">${esc(fxWhere(f))}${f === next ? ' · <b style="color:var(--acc)">next</b>' : ''}</div>${f.res ? UI.fxLine(f) : `<div class="row small" style="padding:8px 0;border-top:1px solid var(--line)"><span class="grow ellip" style="text-align:right;${f.h === id ? 'font-weight:700' : ''}">${esc(s.clubs[f.h].name)}</span>${C.crest(s.clubs[f.h], 18)}<b style="min-width:44px;text-align:center" class="dim">v</b>${C.crest(s.clubs[f.a], 18)}<span class="grow ellip" style="${f.a === id ? 'font-weight:700' : ''}">${esc(s.clubs[f.a].name)}</span></div>`}`).join('')}</div>` : ''}
      ${Object.keys(c.titles || {}).length ? `<div class="card"><div class="h3">Honours</div>${Object.entries(c.titles).map(([k, n]) => `<div class="row small" style="margin-top:6px">🏆 <span class="grow">${esc(s.comps[k] ? s.comps[k].name : k)}</span><b>${n}</b></div>`).join('')}</div>` : ''}
      <div class="sec"><div class="h3">Squad</div><span class="dim small">${sq.length} players</span></div>
      ${groups.map(([g, l]) => { const ps = sq.filter((p) => D.POS_GROUP[p.pos] === g); return ps.length ? `<div class="small b dim" style="margin:8px 2px 2px">${l.toUpperCase()}</div><div class="card flat list" style="padding:4px 12px">${ps.map((p) => C.playerRow(p, xi.includes(p) ? ' · <span style="color:var(--acc)">XI</span>' : '')).join('')}</div>` : ''; }).join('')}`;
    UI.sheet(html, { full: true, title: esc(c.name) });
  };
  UI.acts.clubGoMine = () => { UI.closeAllSheets(); UI.sub.club = 'overview'; UI.go('club'); };

  // ======================= Settings during a live match (pauses play) =======================
  const MV = FM.MatchView;
  const origStart = MV.start;
  MV.start = function (fx, instant) {
    origStart(fx, instant);
    const ctrl = document.querySelector('#matchOv .m-ctrl');
    if (ctrl) ctrl.insertAdjacentHTML('beforeend', '<button class="m-gear" data-act="mSettings" aria-label="Settings" title="Settings">⚙️</button>');
  };
  UI.acts.mSettings = () => {
    const st = MV.st;
    if (!st) return;
    UI._mWasPaused = st.paused;
    st.paused = true;
    MV.settingsSheet();
  };
  MV.settingsSheet = function () {
    const s = S(), st = MV.st;
    const seg = (act, cur, opts) => `<div class="seg" style="width:170px">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const html = `<div class="small muted" style="margin-bottom:10px">The match is paused while you change settings.</div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Match speed</div><div class="small dim">This match and future ones</div></div>${seg('mSetSpeed', st.speed, [[1, '1×'], [2, '2×'], [4, '4×']])}</div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Theme</div><div class="small dim">Menus and sheets</div></div>${seg('mSetTheme', s.settings.theme, [['dark', 'Dark'], ['light', 'Light']])}</div></div>
      <div class="card"><div class="row"><div class="grow"><div class="h3">Haptics</div><div class="small dim">Taps and goal buzz</div></div>${seg('mSetHaptics', s.settings.noHaptics ? 0 : 1, [[1, 'On'], [0, 'Off']])}</div></div>
      <div class="tiny dim" style="margin:4px 2px 12px">Everything else is under the ⚙️ in the top bar after the match.</div>
      <button class="btn pri block" data-act="mSettingsDone">Resume</button>`;
    if (document.querySelector('.sheet-wrap .m-settings')) UI.refreshSheet(`<div class="m-settings">${html}</div>`);
    else UI.sheet(`<div class="m-settings">${html}</div>`, { title: 'Settings', onClose: () => { if (MV.st) MV.st.paused = !!UI._mWasPaused; } });
  };
  UI.acts.mSetSpeed = (d) => { const st = MV.st; st.speed = +d.v; S().settings.speed = +d.v; const b = document.getElementById('mSpeed'); if (b) b.textContent = st.speed + '×'; UI.save(); MV.settingsSheet(); };
  UI.acts.mSetTheme = (d) => { S().settings.theme = d.v; try { localStorage.setItem('touchline.theme', d.v); } catch (e) {} UI.applyTheme(); UI.save(); MV.settingsSheet(); };
  UI.acts.mSetHaptics = (d) => { S().settings.noHaptics = d.v === '0'; UI.save(); MV.settingsSheet(); };
  UI.acts.mSettingsDone = () => UI.closeSheet(); // onClose restores the pause state from before

  // ======================= Install as an app (PWA) =======================
  UI._installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); UI._installEvt = e; if (document.querySelector('.title')) UI.title(); });
  window.addEventListener('appinstalled', () => { UI._installEvt = null; UI.toast('✅ Touchline installed — find it on your home screen'); });
  UI.standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  UI.installCard = function () {
    const offline = navigator.serviceWorker && navigator.serviceWorker.controller;
    let body;
    if (UI.standalone()) body = '<div class="small muted" style="margin-top:6px">✅ Running as an installed app.</div>';
    else if (UI._installEvt) body = '<button class="btn sm pri" style="margin-top:8px" data-act="installApp">📲 Install Touchline</button>';
    else if (isIOS()) body = '<div class="small muted" style="margin-top:6px;line-height:1.5">In Safari, tap <b>Share</b> ⎋ then <b>Add to Home Screen</b>.</div>';
    else body = '<div class="small muted" style="margin-top:6px;line-height:1.5">Open the game in Chrome, Edge or Safari over https (or localhost) to install it.</div>';
    return `<div class="card"><div class="h3">Install as an app</div>${body}<div class="tiny dim" style="margin-top:8px">${offline ? '🟢 Offline ready — the game works without internet.' : '⚪ Offline mode starts after the first load over https or localhost.'}</div></div>`;
  };
  UI.acts.installApp = async () => {
    const e = UI._installEvt;
    if (!e) return UI.toast(isIOS() ? 'In Safari: Share → Add to Home Screen' : 'Install is not available in this browser');
    e.prompt();
    const r = await e.userChoice.catch(() => null);
    UI._installEvt = null;
    if (r && r.outcome === 'accepted') UI.toast('Installing…');
    if (document.querySelector('.title')) UI.title(); else UI.render();
  };
  // Title screen: offer the install when the browser supports it
  const origTitle = UI.title;
  UI.title = function () {
    origTitle();
    const a = document.querySelector('.title .actions');
    if (a && !UI.standalone() && (UI._installEvt || isIOS())) a.insertAdjacentHTML('beforeend', `<button class="btn block" data-act="installApp">📲 Install app${isIOS() && !UI._installEvt ? ' (Share → Add to Home Screen)' : ''}</button>`);
  };
  // Ask the browser not to evict saves under storage pressure (once per session)
  const origSave = UI.save;
  UI.save = function () {
    if (!UI._persistAsked && navigator.storage && navigator.storage.persist) { UI._persistAsked = true; navigator.storage.persist().catch(() => {}); }
    return origSave();
  };

  // ======================= Boardroom =======================
  UI.boardroomCard = function () {
    const c = club(), left = Pe.boardMeetingsLeft(), ult = Pe.ultimatum();
    const row = S().comps[c.comp].table[c.id];
    return `<div class="card"><div class="row"><div class="h3 grow">🏛️ Boardroom</div><span class="tiny dim">${left} meeting${left === 1 ? '' : 's'} left this season</span></div>
      <div class="row small" style="margin-top:8px"><span style="width:90px" class="dim">Confidence</span><div class="grow">${C.bar(c.boardConf, C.moodColor(c.boardConf))}</div><b style="margin-left:8px">${Math.round(c.boardConf)}%</b></div>
      ${ult ? `<div class="warnline" style="margin-top:10px">⚠️ Ultimatum: ${ult.need} points from 5 league games. So far ${row.pts - ult.pts} from ${row.p - ult.from}.</div>` : ''}
      <div class="col" style="gap:6px;margin-top:10px">${Object.entries(Pe.BOARD).map(([k, b]) => `<button class="btn sm block" style="text-align:left" data-act="${k === 'facility' ? 'boardFac' : 'board'}" data-k="${k}" ${left ? '' : 'disabled'}>${b.icon} ${esc(b.label)}</button>`).join('')}</div>
      <div class="tiny dim" style="margin-top:8px">The board judge requests on confidence, finances and the club's identity. Asking for too much when things are going badly costs confidence.</div></div>`;
  };
  UI.acts.board = (d) => { const r = Pe.boardRequest(d.k); UI.toast(r.msg, 4200); UI.save(); UI.render(); };
  UI.acts.boardFac = () => {
    const c = club(), F = FM.Season.FAC;
    UI.sheet(`<div class="small muted" style="margin-bottom:10px">Which project should the owners pay for?</div>${['training', 'academy', 'medical', 'analytics', 'fanzone', 'stadium'].map((k) => `<button class="card row tap" style="width:100%;text-align:left" data-act="boardFacGo" data-k="${k}" ${c.facilities[k] >= 5 ? 'disabled' : ''}><span style="font-size:22px">${F[k].icon}</span><div class="grow"><div class="b small">${F[k].name} · level ${c.facilities[k]}</div><div class="tiny dim">${F[k].effect} · ${U.money(FM.Season.facCost(k, c.facilities[k]))}</div></div></button>`).join('')}`, { title: 'Facility funding' });
  };
  UI.acts.boardFacGo = (d) => { const r = Pe.boardRequest('facility', d.k); UI.closeAllSheets(); UI.toast(r.msg, 4200); UI.save(); UI.render(); };

  // ======================= Manager: badges + national team =======================
  UI.careerExtras = function () {
    const s = S(), u = s.user, nb = Pe.nextBadge(), course = u.course;
    const spec = nb && D.BADGE_COURSE[nb];
    const lic = `<div class="card"><div class="row"><span style="font-size:24px">🎓</span><div class="grow"><div class="h3">Coaching licence: ${esc(u.badges)}</div><div class="tiny dim">${D.BADGES.map((b) => (b === u.badges ? `<b>${b}</b>` : b)).join(' → ')}</div></div></div>
      ${course ? `<div class="small" style="margin-top:8px">📚 Studying for the ${esc(course.badge)} — ${Math.max(0, course.until - s.day)} day(s) to go.</div>` : nb ? `<div class="small muted" style="margin-top:8px">Next: ${esc(nb)} — ${U.money(spec.cost)}, ${spec.days} days, needs ${Pe.courseReq(nb)} games in charge. Higher licences unlock bigger national team jobs and speed up tactical familiarity (+12% per level).</div><button class="btn sm pri" style="margin-top:8px" data-act="course">Enrol</button>` : '<div class="small muted" style="margin-top:8px">You hold the highest licence.</div>'}</div>`;
    const t = u.nation && s.nteams[u.nation];
    const nt = t ? `<div class="card row tap" data-act="goNation"><span style="font-size:30px">${C.flag(t.code)}</span><div class="grow"><div class="h3">${esc(t.name)} manager</div><div class="tiny dim">World #${FM.Intl.ranked().indexOf(t) + 1} · ${u.ntStats ? `${u.ntStats.w}W ${u.ntStats.d}D ${u.ntStats.l}L` : ''} · tap to manage</div></div><span class="dim">›</span></div>`
      : `<div class="card row tap" data-act="goNation"><span style="font-size:26px">🌍</span><div class="grow"><div class="h3">National team jobs</div><div class="tiny dim">${(s.ntJobs || []).length} vacanc${(s.ntJobs || []).length === 1 ? 'y' : 'ies'} — manage a country alongside your club</div></div><span class="dim">›</span></div>`;
    return lic + nt;
  };
  UI.acts.course = () => { const r = Pe.startCourse(); UI.toast(r.msg, 4000); UI.save(); UI.render(); };
  UI.acts.goNation = () => { UI.closeAllSheets(); UI.sub.league = 'intl'; UI.go('league'); };

  // ======================= International: my nation, qualifiers, finals =======================
  const T = (id) => S().nteams[id];
  const miniTable = (tb, ids, mark = 0, hl) => `<table class="t">${W.sortedTable({ table: tb }).map((r, i) => `<tr class="${i < mark ? 'zone-up' : ''} ${r.id === hl ? 'me' : ''}"><td>${i + 1}</td><td class="l"><span class="ellip">${C.flag(T(r.id).code)} ${esc(T(r.id).name)}</span></td><td>${r.p}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td class="b">${r.pts}</td></tr>`).join('')}</table>`;
  const origIntl = UI.intlView;
  UI.intlView = function () {
    const s = S(), u = s.user, t = u.nation && T(u.nation);
    let top = '';
    if (t) {
      const rank = FM.Intl.ranked().indexOf(t) + 1;
      const next = s.calendar.slice(s.day).findIndex((d) => d.type === 'intl' || d.type === 'tourn');
      top += `<div class="hero" style="--c1:${t.colors[0] === '#FFFFFF' ? t.colors[1] : t.colors[0]};--c2:#111"><div class="row"><div style="font-size:44px">${C.flag(t.code)}</div><div class="grow"><div class="tag">Your national team</div><div class="h2" style="margin-top:4px">${esc(t.name)}</div><div class="small" style="opacity:.9">World #${rank} · Elo ${t.elo} · ${u.ntStats ? `${u.ntStats.w}W ${u.ntStats.d}D ${u.ntStats.l}L` : ''}</div></div></div>
        <div class="small" style="margin-top:8px;opacity:.9">${next >= 0 ? `Next international match in ${next} day${next === 1 ? '' : 's'}.` : 'No more internationals this season.'} ${t.picks ? `${t.picks.length} players hand-picked.` : 'Squad auto-picked (best available).'}</div>
        <div class="row" style="gap:8px;margin-top:12px"><button class="btn sm grow" data-act="ntSquad">👕 Squad & tactics</button><button class="btn sm grow danger" data-act="ntResign">Resign</button></div></div>`;
    } else {
      top += `<div class="card"><div class="row"><div class="h3 grow">National team vacancies</div><span class="tiny dim">refreshed each season</span></div>${(s.ntJobs || []).map((id) => { const n = T(id), ok = FM.Intl.canTake(n); return `<div class="row small" style="padding:8px 0;border-top:1px solid var(--line)"><span style="font-size:22px">${C.flag(n.code)}</span><div class="grow"><div class="b">${esc(n.name)}</div><div class="tiny dim">World #${FM.Intl.ranked().indexOf(n) + 1} · needs ${FM.Intl.badgeNeeded(n)}${ok.ok ? '' : ' · ' + esc(ok.why)}</div></div><button class="btn sm ${ok.ok ? 'pri' : ''}" data-act="ntTake" data-id="${id}" ${ok.ok ? '' : 'disabled'}>Apply</button></div>`; }).join('') || '<div class="small dim" style="margin-top:6px">No vacancies right now.</div>'}<div class="tiny dim" style="margin-top:8px">You keep your club job. National teams play in the international breaks and the summer finals; failing to qualify ends the job.</div></div>`;
    }
    if (s.tourns) {
      top += s.tourns.map((tn) => `<div class="card"><div class="row"><div class="h3 grow">🏆 ${esc(tn.name)}</div>${tn.winner ? `<span class="pill acc">${C.flag(T(tn.winner).code)} ${esc(T(tn.winner).name)}</span>` : ''}</div>${tn.groups.map((g) => `<div class="small b dim" style="margin:10px 0 2px">${tn.groups.length > 1 ? 'GROUP ' + g.name : 'GROUP'}</div>${miniTable(g.table, g.teams, tn.groups.length > 1 ? 2 : 2, u.nation)}`).join('')}
        ${[...tn.ko.qf, ...tn.ko.sf, tn.ko.final].filter(Boolean).map((f) => `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="pill">${UI.stagePill(f.po.split(' · ').pop())}</span><span class="grow ellip" style="text-align:right">${esc(T(f.h).name)} ${C.flag(T(f.h).code)}</span><b style="min-width:44px;text-align:center">${f.res ? `${f.res.hg}–${f.res.ag}` : 'v'}</b><span class="grow ellip">${C.flag(T(f.a).code)} ${esc(T(f.a).name)}</span></div>${f.res && f.res.pens ? `<div class="tiny dim center">pens ${f.res.pens[0]}–${f.res.pens[1]}</div>` : ''}`).join('')}</div>`).join('');
    } else if (s.quals && s.quals.groups.length) {
      const q = s.quals, mineFirst = q.groups.slice().sort((a, b) => (b.teams.includes(u.nation) ? 1 : 0) - (a.teams.includes(u.nation) ? 1 : 0));
      top += `<div class="sec"><div class="h3">Qualifying · ${q.kind === 'world' ? 'World Championship' : 'continental championships'} ${q.year + 1}</div></div>
        <div class="small muted" style="margin:0 2px 8px">Group winners go through first, then the best runners-up by points per game. ${Object.keys(q.direct).length ? `Qualified automatically: ${Object.values(q.direct).flat().map((id) => C.flag(T(id).code)).join(' ')}` : ''}</div>
        ${mineFirst.map((g) => `<div class="card flat" style="padding:6px 10px"><div class="row small b dim" style="margin:4px 0"><span class="grow">${esc(g.name.trim())}</span><span class="tiny">${g.slots} place${g.slots === 1 ? '' : 's'} in pool</span></div>${miniTable(g.table, g.teams, 1, u.nation)}</div>`).join('')}`;
    }
    return top + origIntl();
  };
  UI.acts.ntTake = (d) => { const r = FM.Intl.takeJob(d.id); UI.toast(r.msg, 3500); UI.save(); UI.render(); };
  UI.acts.ntResign = () => { FM.Intl.leaveNational('resigned'); UI.toast('You have resigned.'); UI.save(); UI.render(); };
  UI.acts.ntSquad = () => UI.ntSquadSheet();
  UI.ntSquadSheet = function () {
    const s = S(), t = T(s.user.nation);
    if (!t) return;
    const pool = FM.Intl.pool(t.code), picked = new Set(FM.Intl.squad(t.code).map((p) => p.id));
    const Tc = t.tactic;
    const seg = (k, vals) => `<div class="seg" style="margin-top:6px">${vals.map((v) => `<button class="${Tc[k] === v ? 'on' : ''}" data-act="ntTac" data-k="${k}" data-v="${v}">${v.replace(' Press', '').replace(' Block', '')}</button>`).join('')}</div>`;
    const html = `<div class="h3">Formation</div><div class="chips" style="flex-wrap:wrap;margin-top:6px">${Object.keys(D.FORMATIONS).map((f) => `<button class="chip ${Tc.formation === f ? 'on' : ''}" data-act="ntTac" data-k="formation" data-v="${f}">${f}</button>`).join('')}</div>
      <div class="h3" style="margin-top:8px">Build-up</div>${seg('buildup', D.BUILDUP)}<div class="h3" style="margin-top:10px">Pressing</div>${seg('press', D.PRESS)}
      <div class="row" style="margin-top:14px"><div class="h3 grow">Call-ups <span class="dim small">${picked.size}/23</span></div><button class="btn sm" data-act="ntAuto">Auto-pick</button></div>
      <div class="tiny dim" style="margin:4px 0 6px">The best ${pool.length} ${esc(D.NATIONS[t.code].name)} players. Tap to call up or drop. Injured players can't be picked.</div>
      <div class="list">${pool.map((p) => `<div class="prow tap" data-act="ntPick" data-id="${p.id}" style="${picked.has(p.id) ? '' : 'opacity:.55'}">${C.pos(p)}<div class="grow"><div class="b ellip">${picked.has(p.id) ? '✅ ' : ''}${esc(W.name(p))}${W.isUser(p.clubId) ? ' <span class="pill acc">Yours</span>' : ''}</div><div class="tiny dim ellip">${p.clubId ? esc(S().clubs[p.clubId].name) : 'Free agent'} · ${W.age(p)} · ${p.intl ? p.intl.caps : 0} caps${!W.available(p) ? ' · 🚑 unavailable' : ''}</div></div><b>${Math.round(p.ca)}</b></div>`).join('')}</div>`;
    if (document.querySelector('.sheet-wrap .nt-sheet')) UI.refreshSheet(`<div class="nt-sheet">${html}</div>`); else UI.sheet(`<div class="nt-sheet">${html}</div>`, { title: `${t.name} squad` });
  };
  UI.acts.ntTac = (d) => { const t = T(S().user.nation); if (d.k === 'formation') { t.tactic.formation = d.v; t.tactic.roles = W.defaultRoles(d.v); } else t.tactic[d.k] = d.v; UI.save(); UI.ntSquadSheet(); };
  UI.acts.ntAuto = () => { T(S().user.nation).picks = null; UI.save(); UI.ntSquadSheet(); };
  UI.acts.ntPick = (d) => {
    const t = T(S().user.nation), p = P(d.id);
    let picks = FM.Intl.squad(t.code).map((q) => q.id);
    if (picks.includes(d.id)) picks = picks.filter((x) => x !== d.id);
    else { if (!W.available(p)) return UI.toast('He is unavailable.'); if (picks.length >= 23) return UI.toast('Squad is full (23). Drop someone first.'); picks.push(d.id); }
    t.picks = picks;
    UI.save(); UI.ntSquadSheet();
  };
})();
