// Transfer market depth in the interface: the deadline countdown, desk decisions, counter-bids, trials, recalling
// loanees, structured fees in negotiations, payments in the finances and squad registration.
(function () {
  const FM = window.FM,
    UI = FM.UI,
    U = FM.U,
    W = FM.W,
    M = FM.Market;
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
  };

  // ---------- Counter-bids for your players ----------
  UI.bidButtons = (n) =>
    (n.data.deal
      ? `<div class="tiny" style="margin-top:8px">💷 Paid as ${esc(M.describeDeal(n.data.fee, n.data.deal))}</div>`
      : '') +
    `<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-act="bid" data-id="${n.id}" data-v="1">Accept ${U.money(n.data.fee)}</button>${[1.15, 1.3].map((m) => `<button class="btn sm" data-act="bidCounter" data-id="${n.id}" data-v="${m}">Ask ${U.money(U.roundMoney(n.data.fee * m))}</button>`).join('')}<button class="btn sm" data-act="bid" data-id="${n.id}" data-v="0">Reject</button><span class="grow"></span><button class="btn sm" data-act="player" data-id="${n.data.pid}">View</button></div>`;
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
