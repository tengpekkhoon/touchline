// Transfer market depth in the interface: the deadline countdown, desk decisions, counter-bids, trials, recalling
// loanees, structured fees in negotiations, payments in the finances and squad registration.
(function () {
  const FM = window.FM,
    UI = FM.UI,
    U = FM.U,
    W = FM.W,
    M = FM.Market,
    C = UI.C;
  const S = () => FM.S;
  const P = (id) => FM.S.players[id];
  const esc = U.esc;

  // "Window open · 3 days left" / "Deadline day"
  UI.windowLabel = () => {
    const n = M.daysLeft();
    return n === 1 ? '⏰ Deadline day' : n ? `Window open · ${n} days left` : 'Window closed';
  };

  // ---------- Desk decisions ----------
  UI.deskChoices = (n) =>
    n.resolved
      ? `<div class="reply">${esc(n.resolved)}${n.reply ? ' — ' + esc(n.reply) : ''}</div>`
      : `<div class="choices">${n.choices.map((ch, i) => `<button class="btn sm${i === n.rec ? ' pri' : ''}" data-act="desk" data-id="${n.id}" data-i="${i}">${esc(ch.label)}</button>`).join('')}</div>${n.pid && P(n.pid) ? `<div style="margin-top:8px"><button class="btn sm" data-act="player" data-id="${n.pid}">View ${esc(W.short(P(n.pid)))} ›</button></div>` : ''}`;
  UI.acts.desk = (d, el) => {
    const n = S().news.find((x) => x.id === d.id);
    if (!n) return;
    const inSheet = el && el.closest('.attn-sheet');
    const r = M.resolve(n, +d.i);
    UI.save();
    if (inSheet) UI.closeSheet();
    UI.render();
    if (r.msg) UI.toast(r.msg, 3500);
    if (r.offer) UI.acts.offer({ id: r.offer });
    if (r.renew) UI.acts.renew({ id: r.renew });
  };

  // ---------- Counter-bids for your players ----------
  UI.bidButtons = (n) =>
    n.data.loan
      ? `<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-act="bid" data-id="${n.id}" data-v="1">Accept the loan</button><button class="btn sm" data-act="bid" data-id="${n.id}" data-v="0">Turn it down</button><span class="grow"></span><button class="btn sm" data-act="player" data-id="${n.data.pid}">View</button></div>`
      : (n.data.deal
          ? `<div class="tiny" style="margin-top:8px">💷 Paid as ${esc(M.describeDeal(n.data.fee, n.data.deal))}</div>`
          : '') +
        `<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-act="bid" data-id="${n.id}" data-v="1">Accept ${U.money(n.data.fee)}</button>${[1.15, 1.3].map((m) => `<button class="btn sm" data-act="bidCounter" data-id="${n.id}" data-v="${m}">Ask ${U.money(U.roundMoney(n.data.fee * m))}</button>`).join('')}<button class="btn sm" data-act="bidNeg" data-id="${n.id}">Negotiate…</button><button class="btn sm" data-act="bid" data-id="${n.id}" data-v="0">Reject</button><span class="grow"></span><button class="btn sm" data-act="player" data-id="${n.data.pid}">View</button></div>`;
  // ---------- Negotiating a bid for your player ----------
  UI.acts.bidNeg = (d) => {
    const n = S().news.find((x) => x.id === d.id);
    if (!n || n.data.status !== 'open') return;
    UI._neg = { nid: n.id, fee: U.roundMoney(n.data.fee * 1.2), inst: 1, addPct: 0, sellOn: 0, msg: '' };
    UI.bidNegSheet();
  };
  const negDeal = (g) =>
    g.inst > 1 || g.addPct || g.sellOn
      ? { inst: g.inst, addOn: g.addPct ? U.roundMoney(g.fee * g.addPct) : 0, addApps: 25, sellOn: g.sellOn }
      : null;
  UI.bidNegSheet = function () {
    const g = UI._neg,
      n = S().news.find((x) => x.id === g.nid);
    if (!n) return;
    const p = P(n.data.pid),
      buyer = S().clubs[n.data.from];
    const chips = (k, opts) =>
      `<div class="chips" style="flex-wrap:wrap;margin-top:6px">${opts.map(([v, l]) => `<button class="chip ${g[k] === v ? 'on' : ''}" data-act="negSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const steps = [-1e6, -1e5, 1e5, 1e6];
    const html = `<div class="row">${C.pos(p)}<div class="grow b">${esc(W.name(p))} <span class="dim small">${W.age(p)} · valued at ${U.money(p.value)}</span></div>${C.crest(buyer, 26)}</div>
      <div class="warnline" style="margin-top:10px">${esc(buyer.name)} offer <b>${esc(M.describeDeal(n.data.fee, n.data.deal))}</b></div>
      <div class="h3" style="margin-top:12px">Your asking fee</div>
      <div class="row" style="gap:8px;margin-top:6px"><input type="number" inputmode="numeric" min="0" value="${g.fee}" data-input="negFee" class="numin"><b id="negFee" style="min-width:74px;text-align:right">${U.money(g.fee)}</b></div>
      <div class="row" style="gap:4px;margin-top:6px">${steps.map((st) => `<button class="btn sm" style="flex:1" data-act="negStep" data-v="${st}">${st > 0 ? '+' : '−'}${U.money(Math.abs(st))}</button>`).join('')}</div>
      <div class="h3" style="margin-top:12px">How they pay</div>${chips('inst', [
        [1, 'Up front'],
        [2, '2 yearly instalments'],
        [3, '3 yearly instalments'],
      ])}
      <div class="h3" style="margin-top:12px">Add-on <span class="tiny dim">(if he makes 25 appearances for them)</span></div>${chips(
        'addPct',
        [
          [0, 'None'],
          [0.1, `+${U.money(U.roundMoney(g.fee * 0.1))}`],
          [0.2, `+${U.money(U.roundMoney(g.fee * 0.2))}`],
        ],
      )}
      <div class="h3" style="margin-top:12px">Sell-on clause for us</div>${chips('sellOn', [
        [0, 'None'],
        [0.1, '10%'],
        [0.2, '20%'],
      ])}
      <div class="tiny dim" style="margin-top:8px">Your demand is worth ${U.money(M.dealValue(p, g.fee, negDeal(g)))} to them today. Money later counts for less; a sell-on clause counts for more on a young player.</div>
      ${g.msg ? `<div class="reply" style="margin-top:12px">${esc(g.msg)}</div>` : ''}
      <div class="row" style="gap:8px;margin-top:14px"><button class="btn pri grow" data-act="negSend">Send demand</button><button class="btn grow" data-act="bid" data-id="${n.id}" data-v="1">Accept their offer</button></div>`;
    if (document.querySelector('.sheet-wrap .neg-sheet')) UI.refreshSheet(`<div class="neg-sheet">${html}</div>`);
    else UI.sheet(`<div class="neg-sheet">${html}</div>`, { title: 'Negotiate the sale' });
  };
  UI.acts.negSet = (d) => {
    UI._neg[d.k] = +d.v;
    UI.bidNegSheet();
  };
  UI.acts.negStep = (d) => {
    UI._neg.fee = Math.max(0, UI._neg.fee + +d.v);
    UI.bidNegSheet();
  };
  UI.acts.negFee = (d, el) => {
    UI._neg.fee = Math.max(0, Math.round(+el.value || 0));
    const b = document.getElementById('negFee');
    if (b) b.textContent = U.money(UI._neg.fee);
  };
  UI.acts.negSend = () => {
    const g = UI._neg,
      n = S().news.find((x) => x.id === g.nid);
    if (!n) return;
    const r = FM.Transfers.negotiateBid(n, g.fee, negDeal(g));
    n.reply = r.msg;
    UI.save();
    if (r.done || n.data.status !== 'open') {
      UI.closeAllSheets();
      UI.toast(r.msg, 4500);
      UI.render();
      return;
    }
    g.msg = r.msg;
    UI.bidNegSheet();
    UI.render();
  };

  // ---------- Deadline day, hour by hour ----------
  UI.deadlineCard = function () {
    if (!W.employed() || !M.isDeadline()) return '';
    const d = M.dd(),
      i = d ? d.i : 0,
      next = M.DD_HOURS[i];
    return `<div class="card row tap" data-act="ddOpen" style="border:1px solid var(--warn)"><span style="font-size:28px">⏰</span><div class="grow"><div class="h3">Deadline day${next ? ` · ${String(next).padStart(2, '0')}:00` : ' · window shut'}</div><div class="tiny dim">${next ? 'Follow it hour by hour: late bids, panic buys, deals collapsing.' : 'The window has shut. Advance to play the day.'}</div></div><span class="dim">›</span></div>`;
  };
  UI.acts.ddOpen = () => UI.deadlineSheet();
  UI.deadlineSheet = function () {
    const d = M.startDeadline();
    if (!d) return UI.toast('Not deadline day');
    const next = M.DD_HOURS[d.i];
    const tone = { mine: 'var(--acc)', league: 'var(--ink)', bid: 'var(--warn)', world: 'var(--ink2)' };
    const log = d.log.length
      ? d.log
          .map(
            (l) =>
              `<div class="row small ${l.pid ? 'tap' : ''}" ${l.pid ? `data-act="player" data-id="${l.pid}"` : ''} style="padding:6px 0;border-top:1px solid var(--line);gap:8px"><span class="dim" style="width:42px">${String(l.h).padStart(2, '0')}:00</span><span class="grow" style="color:${tone[l.k] || 'var(--ink)'}">${esc(l.t)}</span></div>`,
          )
          .join('')
      : '<div class="small dim" style="padding:8px 0">09:00. Phones are ringing. Step through the day hour by hour.</div>';
    const html = `<div class="row"><div class="h2 grow">${next ? `${String(next).padStart(2, '0')}:00` : 'Window shut'}</div><span class="tiny dim">Budget ${U.money(W.userClub().budget)}</span></div>
      <div class="row" style="gap:8px;margin:10px 0">${next ? `<button class="btn pri grow" data-act="ddNext">Next hour ▶</button><button class="btn grow" data-act="ddAll">To 23:00 ⏩</button>` : '<button class="btn grow" data-act="closeSheet">Done</button>'}</div>
      <div class="row" style="gap:8px;margin-bottom:6px"><button class="btn sm grow" data-act="ddGo" data-v="market">Transfer Centre</button><button class="btn sm grow" data-act="ddGo" data-v="reply">Bids to answer</button></div>
      <div class="card flat" style="padding:2px 12px;max-height:55vh;overflow:auto">${log}</div>`;
    if (document.querySelector('.sheet-wrap .dd-sheet')) UI.refreshSheet(`<div class="dd-sheet">${html}</div>`);
    else UI.sheet(`<div class="dd-sheet">${html}</div>`, { title: '⏰ Deadline day' });
  };
  UI.acts.ddNext = () => {
    M.deadlineHour();
    UI.save();
    UI.deadlineSheet();
    UI.render();
  };
  UI.acts.ddAll = () => {
    while (M.dd() && M.dd().i < M.DD_HOURS.length) M.deadlineHour();
    UI.save();
    UI.deadlineSheet();
    UI.render();
  };
  UI.acts.ddGo = (d) => {
    UI.closeAllSheets();
    if (d.v === 'market') {
      UI.sub.scout = 'market';
      UI.go('scout');
    } else {
      UI.sub.feed = 'reply';
      UI.go('home');
    }
  };
  const homeScreen = UI.screens.home;
  UI.screens.home = (...a) => UI.deadlineCard() + homeScreen(...a);
  UI.BID_STATUS = {
    accepted: '✅ Accepted',
    rejected: '❌ Rejected',
    expired: '⌛ Expired',
    refused: '🙅 He said no',
    withdrawn: '🚪 They pulled out',
    void: '—',
  };
  UI.acts.bidCounter = (d, el) => {
    const n = S().news.find((x) => x.id === d.id);
    if (!n) return;
    const inSheet = el && el.closest('.attn-sheet');
    n.reply = FM.Transfers.counterBid(n, +d.v);
    UI.toast(n.reply, 3500);
    UI.save();
    if (inSheet && n.data.status !== 'open') UI.closeSheet();
    UI.render();
  };

  // ---------- Trials ----------
  UI.trialButton = (p) => {
    if (p.clubId || !W.employed()) return '';
    if (M.onTrial(p)) return '<button class="btn sm grow" disabled>🏃 On trial</button>';
    return `<button class="btn sm grow" data-act="trial" data-id="${p.id}">🏃 Trial</button>`;
  };
  UI.acts.trial = (d) => {
    const r = M.startTrial(d.id);
    UI.toast(r.msg, 4000);
    if (!r.ok) return;
    UI.save();
    UI.render();
    if (document.querySelector('.sheet-wrap')) {
      UI.closeAllSheets();
      UI.playerSheet(d.id);
    }
  };

  // ---------- Your players out on loan ----------
  UI.loanLine = function (p) {
    if (!p.loan || !W.isUser(p.loan.from)) return '';
    const host = S().clubs[p.clubId],
      sp = W.spell(p),
      open = FM.Season.windowOpen();
    return `<div class="warnline" style="margin-bottom:12px">On loan at ${esc(host.name)}: ${sp.apps} appearance${sp.apps === 1 ? '' : 's'} so far${p.loan.promised ? ' · they promised him minutes' : ''}${p.loan.recall ? ' · recall booked for the next window' : ''}. <button class="btn sm" data-act="recallLoan" data-id="${p.id}" ${p.loan.recall && !open ? 'disabled' : ''}>${open ? 'Recall now' : 'Recall when the window opens'}</button></div>`;
  };
  UI.acts.recallLoan = (d) => {
    const p = P(d.id);
    if (!p || !p.loan) return;
    if (FM.Season.windowOpen()) {
      M.recall(p);
      UI.toast(`${W.short(p)} is back from loan`);
    } else {
      p.loan.recall = true;
      UI.toast('He will come back as soon as the window opens');
    }
    UI.save();
    UI.closeAllSheets();
    UI.render();
    UI.playerSheet(p.id);
  };

  // ---------- Payments still to come ----------
  UI.paymentsCard = function (c) {
    const s = S(),
      { owe, owed } = M.ledger(c.id);
    if (
      !owe.length &&
      !owed.length &&
      !(s.players && Object.values(s.players).some((p) => p.sellOn && p.sellOn.some((x) => x.c === c.id)))
    )
      return '';
    const row = (x, out) => {
      const p = P(x.pid),
        other = s.clubs[out ? x.to : x.from];
      const when =
        x.why === 'addon'
          ? `after ${x.apps} appearances`
          : `${Math.floor(x.due / 1000)}/${String((Math.floor(x.due / 1000) + 1) % 100).padStart(2, '0')}`;
      return `<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="grow ellip">${out ? '➡️' : '⬅️'} ${p ? esc(W.short(p)) : '—'} <span class="tiny dim">${x.why === 'addon' ? 'add-on' : 'instalment'} · ${other ? esc(other.short) : ''} · ${when}</span></span><b style="color:${out ? 'var(--bad)' : 'var(--good)'}">${out ? '−' : '+'}${U.money(x.amt)}</b></div>`;
    };
    const clauses = Object.values(s.players).filter(
      (p) => !p.retired && p.sellOn && p.sellOn.some((x) => x.c === c.id),
    );
    return `<div class="card"><div class="row"><div class="h3 grow">Payments to come</div><span class="tiny dim">owed ${U.money(U.sum(owed, (x) => x.amt))} · we owe ${U.money(U.sum(owe, (x) => x.amt))}</span></div>
      ${owed.map((x) => row(x, false)).join('')}${owe.map((x) => row(x, true)).join('')}
      ${clauses.length ? `<div class="small b dim" style="margin:12px 0 2px">SELL-ON CLAUSES WE HOLD</div>${clauses.map((p) => `<div class="row small tap" style="padding:5px 0" data-act="player" data-id="${p.id}"><span class="grow ellip">${esc(W.name(p))} <span class="tiny dim">${p.clubId ? esc(s.clubs[p.clubId].name) : 'free agent'}</span></span><b>${Math.round(p.sellOn.find((x) => x.c === c.id).pct * 100)}%</b></div>`).join('')}` : ''}
      <div class="tiny dim" style="margin-top:8px">Instalments fall due a year apart; add-ons when the player reaches the appearances agreed.</div></div>`;
  };

  // ---------- Squad registration ----------
  UI.regLine = function (c) {
    const sum = FM.Reg.summary(c);
    return sum
      ? `<div class="tiny dim tap" style="margin:-4px 2px 8px" data-act="regInfo">📋 Registration: ${esc(sum)} ›</div>`
      : '';
  };
  UI.acts.regInfo = () => {
    const c = W.userClub(),
      comp = S().comps[c.comp];
    UI.sheet(
      `<div class="small muted" style="line-height:1.6">${esc(comp ? comp.name : '')}: ${esc(FM.Reg.describe(c.comp))}</div><div class="card flat small" style="margin-top:12px;line-height:1.6">${esc(FM.Reg.summary(c) || 'No limit')}</div><div class="tiny dim" style="margin-top:10px">Simplified from the real rules. You can't sign a player you couldn't register, and the matchday squad stays within the caps.</div>`,
      { title: 'Squad registration' },
    );
  };
})();
