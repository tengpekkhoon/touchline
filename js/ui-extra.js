// Extra screens: season preview, pre-season planner, assistant notes, staff market,
// scouting hub, offers/loans with fine-grained steppers, comparison, richer post-match analysis.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W,
    UI = FM.UI,
    C = UI.C,
    MV = FM.MatchView;
  const esc = U.esc;
  const S = () => FM.S;
  const club = () => W.userClub();
  const P = (id) => FM.S.players[id];
  const CL = (id) => FM.S.clubs[id];
  const chipRow = (act, key, cur, opts, extra = '') =>
    `<div class="chips" style="flex-wrap:wrap;margin-top:6px">${opts.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-act="${act}" data-k="${key}" data-v="${v}" ${extra}>${l}</button>`).join('')}</div>`;
  const gradeBadge = (g, size = 30) =>
    `<span class="grade g${g === '?' ? 'X' : g}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.55)}px">${g}</span>`;
  const recPill = (r) =>
    r
      ? `<span class="pill ${r === 'Sign' ? 'good' : r === 'Loan' ? 'acc' : r === 'Avoid' ? 'bad' : ''}">${r === 'Sign' ? '✍️ Sign' : r === 'Loan' ? '🔁 Loan' : r === 'Avoid' ? '✋ Avoid' : r === 'Scout' ? '🔭 Scout more' : '👀 Monitor'}</span>`
      : '';
  const knowBar = (k) =>
    `<div class="bar" style="height:4px;width:54px"><i style="width:${k}%;background:${k >= 70 ? 'var(--good)' : k >= 35 ? 'var(--warn)' : 'var(--bad)'}"></i></div>`;

  // ======================= Player card pieces =======================
  UI.reportCard = function (p, v) {
    const s = S();
    const reg = FM.Scouting.region(p);
    const isFree = !p.clubId;
    const loanT = p.clubId && !p.loan ? FM.Transfers.loanTerms(p) : null;
    return `<div class="card"><div class="row" style="align-items:flex-start">${gradeBadge(v.grade, 44)}<div class="grow"><div class="h3">🔭 Scout report</div><div class="small dim">${v.scout ? `${esc(v.scout.fn + ' ' + v.scout.ln)} · ${Math.round(v.scout.regions[reg] * 100)}% knowledge of ${D.REGIONS[reg]}` : 'No dedicated report yet'}</div><div class="row" style="margin-top:6px;gap:6px">${recPill(v.rec)}<span class="pill">${Math.round(v.k)}% known</span></div></div></div>
      <div class="h2" style="margin:12px 0 4px">“${esc(v.verdict)}”</div>
      ${v.quote ? `<div class="q" style="margin:8px 0;padding:10px 12px;background:var(--card2);border-radius:12px;font-size:13.5px;border-left:3px solid var(--acc2);font-style:italic">${esc(v.quote)}</div>` : ''}
      ${v.strengths.map((t) => `<div class="phrase"><span>✅</span><span>${esc(t)}</span></div>`).join('')}
      ${v.weaknesses.map((t) => `<div class="phrase"><span>⚠️</span><span>${esc(t)}</span></div>`).join('')}
      ${v.k < 25 ? '<div class="lock">🔒 Strengths & weaknesses — needs more scouting</div>' : ''}
      <div class="hr"></div>
      <div class="phrase"><span>🧠</span><span>${v.personality ? `Personality: <b>${esc(v.personality)}</b>` : '<span class="dim">Personality unknown (50%)</span>'}</span></div>
      <div class="phrase"><span>🩺</span><span>${v.injury ? esc(v.injury) : '<span class="dim">Injury history unknown (55%)</span>'}</span></div>
      ${v.hidden ? v.hidden.map((h) => `<div class="phrase"><span>🔍</span><span>${esc(h)}</span></div>`).join('') : '<div class="phrase"><span>🔍</span><span class="dim">Hidden attributes unlock at 75%</span></div>'}
      ${v.foot ? `<div class="phrase"><span>🦶</span><span>${esc(v.foot)}-footed${v.alt && v.alt.length ? ` · can also play ${v.alt.join(', ')}` : ''}</span></div>` : ''}
      ${v.role ? `<div class="phrase"><span>🎭</span><span>Best suited to <b>${esc(v.role)}</b></span></div>` : ''}
      ${v.situation ? `<div class="phrase"><span>📋</span><span>${esc(v.situation)}</span></div>` : ''}
      ${v.mental ? v.mental.map((t) => `<div class="phrase"><span>🧭</span><span>${esc(t)}</span></div>`).join('') : ''}
      ${v.agent ? `<div class="phrase"><span>💼</span><span>${esc(v.agent.name)} (${esc(v.agent.style)}) · would want ~${U.money(v.wageAsk)}/wk from us</span></div>` : ''}
      <div class="phrase"><span>🧩</span><span>Tactical fit: best as <b>${v.fit.slot}</b> (${esc(v.fit.role)}) in your ${s.user.tactic.formation}</span></div>
      ${!v.own && FM.Scouting.nextRung(v.k) ? `<div class="tiny dim" style="margin-top:6px">🔭 ${Math.round(v.k)}% known · at ${FM.Scouting.nextRung(v.k)[0]}%: ${esc(FM.Scouting.nextRung(v.k)[1])}</div>` : ''}
      <div class="phrase"><span>📈</span><span>Potential confidence: <b>${v.confidence}</b></span></div>
      ${v.moneyball ? `<div class="warnline" style="margin-top:8px;color:var(--acc2);background:color-mix(in srgb,var(--acc2) 12%,transparent)">📊 ${esc(v.moneyball)}</div>` : ''}
      <div class="row small" style="margin-top:10px"><span class="grow muted">${isFree ? 'Free agent — wants' : 'Estimated fee'}</span><b>${isFree ? U.money(FM.Transfers.wageDemand(p, club())) + '/wk' : v.fee != null ? '~' + U.money(v.fee) : '?'}</b></div>
      ${loanT && loanT.available ? `<div class="row small" style="margin-top:4px"><span class="grow muted">Loan possible</span><b>~${Math.round(Math.min(1, loanT.share) * 100)}% of wages</b></div>` : ''}
      <div class="row" style="gap:6px;margin-top:12px;flex-wrap:wrap"><button class="btn sm grow" data-act="scoutPlayer" data-id="${p.id}">🔭 Scout</button><button class="btn sm grow" data-act="shortlist" data-id="${p.id}">${s.user.shortlist.includes(p.id) ? '★ Listed' : '☆ Shortlist'}</button><button class="btn sm grow" data-act="compare" data-id="${p.id}">⚖️ Compare</button>${UI.trialButton(p)}${p.loan ? '' : `<button class="btn sm pri grow" data-act="offer" data-id="${p.id}">${isFree ? 'Offer contract' : 'Make offer'}</button>`}</div></div>`;
  };

  UI.ownActions = function (p) {
    const inXI = W.pickXI(club().id, S().user.tactic).xi.some((q) => q && q.id === p.id);
    if (p.loan)
      return `<div class="warnline">On loan from ${esc(CL(p.loan.from).name)} until the end of the season. You pay ${Math.round(p.loan.share * 100)}% of his wages.</div>`;
    return `<div class="row" style="gap:6px;margin-bottom:12px;flex-wrap:wrap"><button class="btn sm grow" data-act="listPlayer" data-id="${p.id}">${p.listed ? 'Unlist' : 'Transfer list'}</button><button class="btn sm grow" data-act="renew" data-id="${p.id}">Renew</button>${!inXI ? `<button class="btn sm grow" data-act="loanOut" data-id="${p.id}">Loan out</button>` : ''}<button class="btn sm grow danger" data-act="release" data-id="${p.id}">Release</button></div>`;
  };

  UI.acts.loanOut = (d) => {
    const p = P(d.id);
    if (!FM.Season.windowOpen()) return UI.toast('Loans can only be agreed while the window is open.');
    const offers = FM.Transfers.loanOutOffers(p.id);
    UI._loanOffers = offers;
    UI.sheet(
      `<div class="small muted" style="margin-bottom:10px">Clubs interested in taking ${esc(W.name(p))} for the rest of the season:</div>${
        offers
          .map((o, i) => {
            const c = CL(o.club);
            return `<div class="card row">${C.crest(c, 34)}<div class="grow"><div class="b">${C.flag(c.nat)} ${esc(c.name)}</div><div class="small dim">${esc(S().comps[c.comp].name)} · ${o.minutes} · pays ${Math.round(o.share * 100)}% of wages</div></div><button class="btn sm pri" data-act="acceptLoanOut" data-i="${i}" data-id="${p.id}">Accept</button></div>`;
          })
          .join('') || '<div class="empty">No interest right now. Try again later in the window.</div>'
      }`,
      { title: 'Loan offers' },
    );
  };
  UI.acts.acceptLoanOut = (d) => {
    const o = UI._loanOffers[+d.i],
      p = P(d.id);
    FM.Transfers.loan(p, o.club, o.share, 0);
    UI.closeAllSheets();
    UI.toast(`${W.short(p)} joins ${CL(o.club).name} on loan`);
    UI.save();
    UI.render();
  };
  UI.acts.release = (d) => {
    const p = P(d.id);
    const yrs = Math.max(1, p.contract - S().year + 1);
    const pay = U.roundMoney(p.wage * 52 * yrs * 0.5);
    UI.sheet(
      `<div class="h3">Release ${esc(W.name(p))}?</div><div class="small muted" style="margin:8px 0 14px">He has ${yrs} year(s) left on ${U.money(p.wage)}/wk. Terminating costs a settlement of <b>${U.money(pay)}</b>. He becomes a free agent.</div><button class="btn block danger" data-act="doRelease" data-id="${p.id}">Release for ${U.money(pay)}</button>`,
      { title: 'Release player' },
    );
  };
  UI.acts.doRelease = (d) => {
    const p = P(d.id),
      c = club(),
      yrs = Math.max(1, p.contract - S().year + 1),
      pay = U.roundMoney(p.wage * 52 * yrs * 0.5);
    c.balance -= pay;
    W.spell(p).to = S().year;
    p.clubId = null;
    p.contract = S().year;
    p.listed = false;
    if (S().user.tactic.lineup) S().user.tactic.lineup = S().user.tactic.lineup.map((x) => (x === p.id ? null : x));
    UI.closeAllSheets();
    UI.toast(`${W.short(p)} released`);
    UI.save();
    UI.render();
  };

  // ---------- Compare ----------
  C.radar2 = function (a, b, size = 240) {
    const axes = a.pos === 'GK' ? D.RADAR_GK : D.RADAR;
    const keys = Object.keys(axes),
      n = keys.length,
      cx = size / 2,
      cy = size / 2,
      R = size / 2 - 32;
    const pt = (i, v) => {
      const t = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(t) * R * v, cy + Math.sin(t) * R * v];
    };
    let g = '';
    [0.25, 0.5, 0.75, 1].forEach(
      (f) =>
        (g += `<polygon points="${keys.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" stroke="var(--line)"/>`),
    );
    const poly = (p, col, dash) =>
      `<polygon points="${keys.map((k, i) => pt(i, U.avg(axes[k], (x) => p.attrs[x]) / 20).join(',')).join(' ')}" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="2" ${dash ? 'stroke-dasharray="5 3"' : ''}/>`;
    const labels = keys
      .map((k, i) => {
        const [x, y] = pt(i, 1.2);
        return `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink2)">${k}</text>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px;display:block;margin:auto">${g}${poly(a, 'var(--acc2)')}${poly(b, 'var(--acc)', true)}${labels}</svg>`;
  };
  UI.acts.compare = (d) => {
    const t = P(d.id),
      v = FM.Scouting.view(t);
    const sq = W.squad(club().id).filter((p) => (t.pos === 'GK') === (p.pos === 'GK'));
    const mine = sq.sort((a, b) => W.effAt(b, v.fit.slot) - W.effAt(a, v.fit.slot))[0];
    if (!mine) return UI.toast('No comparable player in your squad');
    if (v.k < 40) return UI.toast('Scout him more first (40% knowledge needed)');
    const unc = Math.round((1 - v.k / 100) * 6);
    const keys = D.ATTRS.filter((k) => t.pos === 'GK' || !['reflexes', 'handling'].includes(k));
    const rows = keys
      .map((k) => {
        const a = Math.round(mine.attrs[k]),
          b = Math.round(t.attrs[k]);
        const better = b - unc > a ? 'var(--good)' : b + unc < a ? 'var(--bad)' : 'var(--ink2)';
        return `<div class="row small" style="padding:4px 0"><b style="width:28px;text-align:center;color:var(--acc2)">${a}</b><span class="grow center muted">${D.ATTR_LABEL[k]}</span><b style="width:44px;text-align:center;color:${better}">${unc ? `${Math.max(1, b - unc)}–${Math.min(20, b + unc)}` : b}</b></div>`;
      })
      .join('');
    UI.sheet(
      `<div class="row" style="justify-content:space-between"><div><div class="tiny dim b">YOUR BEST AT ${v.fit.slot}</div><div class="b" style="color:var(--acc2)">${esc(W.name(mine))}</div><div class="tiny dim">${W.age(mine)} · ${U.money(mine.value)} · ${U.money(mine.wage)}/wk</div></div><div style="text-align:right"><div class="tiny dim b">TARGET</div><div class="b" style="color:var(--acc)">${esc(W.name(t))}</div><div class="tiny dim">${W.age(t)} · ${v.fee ? '~' + U.money(v.fee) : 'free'}</div></div></div>
      <div class="card" style="margin-top:12px">${C.radar2(mine, t)}<div class="row tiny" style="justify-content:center;gap:14px;margin-top:4px"><span style="color:var(--acc2)">■ ${esc(mine.ln)}</span><span style="color:var(--acc)">■ ${esc(t.ln)}${unc ? ' (approx.)' : ''}</span></div></div>
      <div class="card">${rows}</div>
      <div class="small muted center">Green = clearly better than your man. Ranges narrow as scouting knowledge grows.</div>`,
      { title: 'Compare' },
    );
  };

  // ---------- Offers: fine-grained steppers, contract length, loans ----------
  UI.acts.offer = (d) => {
    const p = P(d.id),
      c = club();
    const mode = p.clubId && !p.loan && FM.Scouting.view(p).rec === 'Loan' ? 'loan' : 'transfer';
    UI._offer = {
      pid: p.id,
      mode,
      fee: p.clubId ? FM.Transfers.userAsk(p) : 0,
      wage: FM.Transfers.wageDemand(p, c),
      years: 3,
      share: 0.5,
      loanFee: 0,
    };
    UI.offerSheet();
  };
  const stepBtns = (field, steps) =>
    `<div class="row" style="gap:4px;margin-top:6px;flex-wrap:wrap">${steps.map((st) => `<button class="btn sm" style="flex:1;padding:7px 2px;font-size:12px" data-act="ofStep" data-f="${field}" data-v="${st}">${st > 0 ? '+' : '−'}${U.money(Math.abs(st)).replace('$', '')}</button>`).join('')}</div>`;
  UI.offerSheet = function (msg) {
    const o = UI._offer,
      p = P(o.pid),
      c = club(),
      T = FM.Transfers;
    const ask = p.clubId ? T.userAsk(p) : 0,
      dem = T.wageDemand(p, c);
    const loanable = p.clubId && !p.loan;
    const dir = FM.Staff.get('director');
    const tabs = loanable
      ? `<div class="seg" style="margin:10px 0">${[
          ['transfer', 'Permanent'],
          ['loan', 'Loan'],
        ]
          .map(([k, l]) => `<button class="${o.mode === k ? 'on' : ''}" data-act="ofMode" data-v="${k}">${l}</button>`)
          .join('')}</div>`
      : '';
    let body = '';
    if (o.mode === 'transfer') {
      body = `${
        p.clubId
          ? `<div class="row" style="margin-top:12px"><div class="h3 grow">Transfer fee</div><span class="tiny dim">asking ~${U.money(ask)}</span></div>
        <div class="row" style="gap:8px;margin-top:6px"><input type="number" inputmode="numeric" min="0" step="1000" value="${o.fee}" data-input="ofNum" data-f="fee" class="numin"><b id="ofFee" style="min-width:74px;text-align:right">${U.money(o.fee)}</b></div>
        ${stepBtns('fee', [-1e6, -1e5, -1e4, 1e4, 1e5, 1e6])}`
          : `<div class="warnline" style="margin-top:12px">Free agent — no fee. Signing-on bonus ${U.money(T.signingBonus(p, o.wage))} (10 weeks' wages).</div>`
      }
        <div class="row" style="margin-top:14px"><div class="h3 grow">Weekly wage</div><span class="tiny dim">agent wants ${U.money(dem)}</span></div>
        <div class="row" style="gap:8px;margin-top:6px"><input type="number" inputmode="numeric" min="0" step="50" value="${o.wage}" data-input="ofNum" data-f="wage" class="numin"><b id="ofWage" style="min-width:74px;text-align:right">${U.money(o.wage)}</b></div>
        ${stepBtns('wage', [-1000, -250, -50, 50, 250, 1000])}
        <div class="h3" style="margin-top:14px">Contract length</div>${chipRow('ofSet', 'years', o.years, [
          [1, '1 yr'],
          [2, '2 yrs'],
          [3, '3 yrs'],
          [4, '4 yrs'],
          [5, '5 yrs'],
        ])}
        <div class="small dim" style="margin-top:6px">Total cost over the deal: <b>${U.money(o.fee + o.wage * 52 * o.years + T.signingBonus(p, o.wage))}</b></div>`;
    } else {
      body = `<div class="h3" style="margin-top:12px">Share of wages you pay</div>${chipRow('ofSet', 'share', o.share, [
        [0.25, '25%'],
        [0.5, '50%'],
        [0.75, '75%'],
        [1, '100%'],
      ])}
        <div class="small dim" style="margin-top:6px">That's ${U.money(p.wage * o.share)}/wk of his ${U.money(p.wage)}/wk.</div>
        <div class="row" style="margin-top:14px"><div class="h3 grow">Loan fee (optional)</div></div>
        <div class="row" style="gap:8px;margin-top:6px"><input type="number" inputmode="numeric" min="0" step="1000" value="${o.loanFee}" data-input="ofNum" data-f="loanFee" class="numin"><b id="ofLoanFee" style="min-width:74px;text-align:right">${U.money(o.loanFee)}</b></div>
        ${stepBtns('loanFee', [-1e5, -1e4, 1e4, 1e5])}
        <div class="small dim" style="margin-top:6px">A fee of ~5% of his value (${U.money(p.value * 0.05)}) makes his club more flexible on wages. He returns at the end of the season.</div>`;
    }
    const html = `<div class="row">${C.pos(p)}<div class="grow b">${esc(W.name(p))} <span class="dim small">${W.age(p)}</span></div>${p.clubId ? C.crest(CL(p.clubId), 26) : '<span class="pill">Free agent</span>'}</div>
      <div class="small dim" style="margin-top:6px">Budget ${U.money(c.budget)} · Window ${FM.Season.windowOpen() ? '<b style="color:var(--acc)">open</b>' : '<b style="color:var(--bad)">closed</b>'}${dir.vacant ? '' : ` · ${esc(dir.fn + ' ' + dir.ln)} negotiating (${dir.ability}/20)`}</div>
      ${tabs}${body}
      ${msg ? `<div class="reply" style="margin-top:12px">${esc(msg)}</div>` : ''}
      <button class="btn pri block" style="margin-top:16px" data-act="submitOffer">${o.mode === 'loan' ? 'Propose loan' : p.clubId ? 'Submit offer' : 'Offer contract'}</button>`;
    if (document.querySelector('.sheet-wrap .offer-sheet')) UI.refreshSheet(`<div class="offer-sheet">${html}</div>`);
    else UI.sheet(`<div class="offer-sheet">${html}</div>`, { title: 'Negotiation' });
  };
  UI.acts.ofMode = (d) => {
    UI._offer.mode = d.v;
    UI.offerSheet();
  };
  UI.acts.ofSet = (d) => {
    UI._offer[d.k] = +d.v;
    UI.offerSheet();
  };
  UI.acts.ofStep = (d) => {
    const o = UI._offer;
    o[d.f] = Math.max(0, o[d.f] + +d.v);
    UI.offerSheet();
  };
  UI.acts.ofNum = (d, el) => {
    const o = UI._offer;
    o[d.f] = Math.max(0, Math.round(+el.value || 0));
    const id = { fee: 'ofFee', wage: 'ofWage', loanFee: 'ofLoanFee' }[d.f];
    const b = document.getElementById(id);
    if (b) b.textContent = U.money(o[d.f]);
  };
  UI.acts.submitOffer = () => {
    const o = UI._offer,
      p = P(o.pid);
    const r =
      o.mode === 'loan'
        ? FM.Transfers.loanOffer(o.pid, o.share, o.loanFee)
        : FM.Transfers.offer(o.pid, p.clubId ? o.fee : 0, o.wage);
    if (r.ok) {
      if (o.mode === 'transfer') p.contract = S().year + o.years - 1;
      UI.closeAllSheets();
      UI.toast(r.msg, 3500);
      UI.save();
      UI.render();
      return;
    }
    if (r.counter) {
      if (o.mode === 'loan') o.share = r.counter;
      else o.fee = r.counter;
    }
    if (r.wageDemand) o.wage = r.wageDemand;
    UI.offerSheet(r.msg);
  };

  // ======================= Squad: assistant notes + loans =======================
  const origSquad = UI.screens.squad;
  UI.screens.squad = function () {
    const html = origSquad();
    if (UI.sub.squad !== 'list') return html;
    const a = FM.Advice.assistant();
    const out = Object.values(S().players).filter((p) => p.loan && W.isUser(p.loan.from));
    const notes = `<div class="card"><div class="row"><div style="font-size:26px">🗒️</div><div class="grow"><div class="h3">${esc(a.who)}'s notes</div><div class="tiny dim">${a.role}${a.personality ? ' · ' + esc(a.personality) : ''}</div></div></div>
      ${a.notes.map((n) => `<div class="row small note" style="padding:8px 0;border-top:1px solid var(--line);align-items:flex-start"><span>${n.icon}</span><span class="grow ${n.pid ? 'tap' : ''}" ${n.pid ? `data-act="player" data-id="${n.pid}"` : ''}>${esc(n.text)}</span>${n.act ? `<button class="btn sm" data-act="noteAct" data-key="${n.key}" data-a="${n.act.act}" ${n.act.id ? `data-id="${n.act.id}"` : ''}>${n.act.label}</button>` : ''}${n.key ? `<button class="icon-btn" style="width:30px;height:30px;font-size:13px" title="Done" data-act="noteDone" data-key="${n.key}">✓</button>` : ''}</div>`).join('')}</div>`;
    const loans = out.length
      ? `<div class="sec"><div class="h3">Out on loan</div><span class="dim small">${out.length}</span></div><div class="card flat list" style="padding:4px 12px">${out.map((p) => C.playerRow(p, ` · at ${esc(CL(p.clubId).short)} · ${p.season.apps} apps${p.form.length ? ' · ' + U.avg(p.form.slice(-5)).toFixed(1) : ''}`)).join('')}</div>`
      : '';
    const i = html.indexOf('<div class="row small dim"');
    return html.slice(0, i) + notes + html.slice(i) + loans;
  };
  // Acting on a note (or ticking it off) removes it from the assistant's list
  UI.acts.noteAct = (d) => {
    FM.Advice.done(d.key);
    const tab = UI.tab;
    UI.acts[d.a]({ id: d.id });
    if (UI.tab === tab && !['loanOut', 'release'].includes(d.a)) UI.render();
    else if (UI.tab === tab) {
      const y = document.getElementById('main').scrollTop;
      UI.render();
      document.getElementById('main').scrollTop = y;
    }
    UI.save();
  };
  UI.acts.noteDone = (d, el) => {
    FM.Advice.done(d.key);
    const row = el.closest('.note');
    if (row) {
      row.style.transition = 'opacity .25s, transform .25s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(24px)';
      setTimeout(() => UI.render(), 260);
    } else UI.render();
    UI.save();
  };
  UI.acts.swapIn = (d) => {
    const [i, pid] = d.id.split(':');
    UI.acts.pickSlot({ i, id: pid });
    UI.toast('Lineup updated');
  };
  UI.acts.scoutNeed = (d) => {
    UI.sub.scout = 'hub';
    UI._as = { ...UI._as, pos: d.id, scout: S().user.scouts[0] };
    UI.go('scout');
    UI.assignSheet();
  };
  UI.acts.goFree = (d) => {
    UI.sub.scout = 'free';
    UI._fq = { pos: d.id };
    UI.go('scout');
  };

  // ======================= Staff =======================
  UI.staffView = function () {
    const s = S();
    const roles = Object.entries(D.STAFF_ROLES).filter(([, r]) => r.key !== 'scout');
    const card = (st, role, key) => {
      const r = D.STAFF_ROLES[role];
      return `<div class="card"><div class="row"><div style="font-size:26px">${st.vacant ? '🪑' : C.flag(st.nat)}</div><div class="grow"><div class="b">${esc(st.fn + ' ' + st.ln)}</div><div class="small dim">${esc(role)}${st.vacant ? '' : ` · ${esc(st.personality)} · age ${st.age}`}</div></div>${st.vacant ? '<span class="pill bad">Vacant</span>' : `<b>${U.money(st.wage)}/wk</b>`}</div>
        <div class="row small" style="margin-top:10px"><span class="dim" style="width:64px">Ability</span><div class="grow">${C.bar((st.ability / 20) * 100, st.ability >= 15 ? 'var(--good)' : st.ability >= 10 ? 'var(--acc2)' : 'var(--bad)')}</div><b style="margin-left:8px">${st.judge || st.ability}/20</b></div>
        ${st.regions ? `<div class="tiny dim" style="margin-top:6px">${esc(st.note || '')}</div>` : ''}
        <div class="small" style="margin-top:6px">⚡ ${esc(FM.Staff.IMPACT[key](st.ability).text)}</div>
        <div class="tiny dim" style="margin-top:4px">${r.effect}${st.vacant ? '' : ` · contract to ${st.contract}`}</div>
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn sm grow" data-act="staffMarket" data-role="${esc(role)}">${st.vacant ? 'Hire' : key === 'scout' ? 'Hire another' : 'Replace'}</button>${st.vacant ? '' : `<button class="btn sm grow danger" data-act="staffFire" data-id="${st.id}">Release (${U.money(FM.Staff.compensation(st))})</button>`}</div></div>`;
    };
    const wageBill = U.sum(W.userStaff(), (x) => x.wage);
    return `<div class="small muted" style="margin:0 2px 10px">Staff ability matters: coaches develop players, physios speed recovery, analysts spot bargains, directors negotiate. Staff wages: <b>${U.money(wageBill)}/wk</b>.</div>
      ${roles.map(([role, r]) => card(FM.Staff.get(r.key), role, r.key)).join('')}
      <div class="sec"><div class="h3">Scouts</div><span class="dim small">${s.user.scouts.length}/5</span></div>
      ${s.user.scouts.map((id) => card(s.staff[id], 'Scout', 'scout')).join('')}`;
  };
  UI.acts.staffMarket = (d) => {
    const s = S(),
      role = d.role;
    const cands = (s.staffPool || [])
      .map((id) => s.staff[id])
      .filter((x) => x && x.role === role)
      .sort((a, b) => (b.judge || b.ability) - (a.judge || a.ability));
    UI.sheet(
      `<div class="small muted" style="margin-bottom:10px">${esc(D.STAFF_ROLES[role].effect)}. Signing-on fee = 4 weeks' wages. Replacing someone costs their compensation.</div>${
        cands
          .map(
            (
              st,
            ) => `<div class="card"><div class="row"><div style="font-size:24px">${C.flag(st.nat)}</div><div class="grow"><div class="b">${esc(st.fn + ' ' + st.ln)}</div><div class="small dim">${esc(st.personality)} · age ${st.age}</div></div><b>${U.money(st.wage)}/wk</b></div>
      <div class="row small" style="margin-top:8px"><span class="dim" style="width:64px">Ability</span><div class="grow">${C.bar(((st.judge || st.ability) / 20) * 100)}</div><b style="margin-left:8px">${st.judge || st.ability}/20</b></div>
      ${st.regions ? `<div class="tiny dim" style="margin-top:6px">${esc(st.note)}</div>` : ''}
      <button class="btn sm pri block" style="margin-top:10px" data-act="staffHire" data-id="${st.id}">Hire · ${U.money(U.roundMoney(st.wage * 4))} fee</button></div>`,
          )
          .join('') || '<div class="empty">Nobody available right now. The market refreshes each season.</div>'
      }`,
      { title: `Hire: ${role}` },
    );
  };
  UI.acts.staffHire = (d) => {
    const r = FM.Staff.hire(d.id);
    UI.toast(r.msg);
    if (r.ok) {
      UI.closeAllSheets();
      UI.save();
      UI.render();
    }
  };
  UI.acts.staffFire = (d) => {
    const r = FM.Staff.fire(d.id);
    UI.toast(r.msg, 3200);
    if (r.ok) {
      UI.save();
      UI.render();
    }
  };

  // ======================= Home: pre-season planner + season preview =======================
  const origHome = UI.screens.home;
  UI.screens.home = function () {
    const html = origHome();
    const s = S(),
      cal = FM.Season.today();
    if (!W.employed() || !cal) return html;
    let top = '';
    if (cal.type === 'pre') {
      if (!s.user.previewSeen && !s.settings.skipPreview)
        setTimeout(() => {
          if (!document.querySelector('.sheet-wrap')) UI.seasonPreview();
        }, 350);
      top += planner(cal.idx);
    }
    const lr = FM.Season.baseRound();
    if (cal.type === 'pre' || lr <= 2)
      top += `<button class="card row tap" style="width:100%;text-align:left" data-act="preview2"><span style="font-size:26px">🔮</span><div class="grow"><div class="h3">Season preview</div><div class="small dim">Predicted finish, title odds and your best XI</div></div><span class="dim">›</span></button>`;
    return top + html;
  };
  function planner(today) {
    const s = S(),
      plan = s.user.preseason;
    const slot = (i) => {
      const x = plan[i],
        done = i < today,
        cur = i === today;
      const label = !x
        ? done
          ? 'Rest'
          : 'Not booked'
        : x.type === 'camp'
          ? `${D.CAMPS[x.key].icon} ${D.CAMPS[x.key].name}`
          : `⚽ ${CL(x.fx.h === club().id ? x.fx.a : x.fx.h).name} (${x.fx.h === club().id ? 'H' : 'A'})${x.fx.res ? ` · ${x.fx.res.hg}–${x.fx.res.ag}` : ''}`;
      return `<div class="row small" style="padding:9px 0;border-top:1px solid var(--line)"><span class="pill ${cur ? 'acc' : ''}">Day ${i + 1}</span><span class="grow ellip ${done ? 'dim' : ''}">${esc(label)}</span>${!done ? `<button class="btn sm" data-act="plan" data-i="${i}">${x ? 'Change' : 'Book'}</button>` : ''}</div>`;
    };
    return `<div class="card"><div class="row"><span style="font-size:24px">☀️</span><div class="grow"><div class="h3">Pre-season</div><div class="tiny dim">Book friendlies or camps for each day, then play/advance. Familiarity ${Math.round(s.user.tactic.fam ?? 60)}%.</div></div></div>${[...Array(D.PRESEASON_DAYS).keys()].map(slot).join('')}</div>`;
  }
  UI.acts.plan = (d) => {
    const i = +d.i,
      opts = FM.Season.friendlyOptions();
    UI.sheet(
      `<div class="h3">Friendly</div><div class="small dim" style="margin:4px 0 8px">Home games earn gate money; away tours earn an appearance fee. Stronger opponents test you harder.</div>
      ${opts.map((c) => `<div class="card row">${C.crest(c, 32)}<div class="grow"><div class="b">${C.flag(c.nat)} ${esc(c.name)}</div><div class="small dim">${c.comp ? esc(S().comps[c.comp].name) : D.NATIONS[c.nat].name} · rep ${Math.round(c.rep)}</div></div><button class="btn sm" data-act="bookF" data-i="${i}" data-id="${c.id}" data-h="1">Home</button><button class="btn sm" data-act="bookF" data-i="${i}" data-id="${c.id}" data-h="0">Away</button></div>`).join('')}
      <div class="h3" style="margin-top:14px">Camp</div>
      ${Object.entries(D.CAMPS)
        .map(
          ([k, x]) =>
            `<div class="card row tap" data-act="bookC" data-i="${i}" data-k="${k}"><span style="font-size:24px">${x.icon}</span><div class="grow"><div class="b">${x.name}</div><div class="small dim">${x.desc}</div></div><b style="color:${x.cost > 0 ? 'var(--bad)' : 'var(--good)'}">${x.cost > 0 ? '−' : '+'}${U.money(Math.abs(x.cost))}</b></div>`,
        )
        .join('')}
      <button class="btn block" data-act="bookClear" data-i="${i}">Rest day</button>`,
      { title: `Pre-season day ${i + 1}` },
    );
  };
  UI.acts.bookF = (d) => {
    FM.Season.bookFriendly(+d.i, d.id, d.h === '1');
    UI.closeAllSheets();
    UI.save();
    UI.render();
  };
  UI.acts.bookC = (d) => {
    FM.Season.bookCamp(+d.i, d.k);
    UI.closeAllSheets();
    UI.save();
    UI.render();
  };
  UI.acts.bookClear = (d) => {
    delete S().user.preseason[+d.i];
    UI.closeAllSheets();
    UI.save();
    UI.render();
  };
  UI.acts.preview2 = () => UI.seasonPreview();

  UI.seasonPreview = function () {
    const s = S(),
      pv = FM.Advice.preview(),
      c = club();
    s.user.previewSeen = true;
    UI.save();
    const slots = D.FORMATIONS[pv.formation];
    const dots = slots
      .map((sl, i) => {
        const p = pv.xi[i];
        return `<div class="slot-dot" style="left:${sl.y * 100}%;top:${6 + (1 - (sl.x - 0.04) / 0.76) * 80}%"><div class="d" style="background:${c.colors[0]};color:${U.ink(c.colors[0])}">${p ? Math.round(p.ca) : '—'}</div><div class="n">${p ? esc(p.ln) : ''}</div></div>`;
      })
      .join('');
    const objs = FM.Season.objectives(c);
    UI.sheet(
      `<div class="hero" style="--c1:${c.colors[0]};--c2:${c.colors[1]}"><div class="tag">${FM.Season.seasonLabel()} preview · ${esc(pv.comp.name)}</div><div class="row" style="margin-top:10px"><div class="grow"><div class="small" style="opacity:.85">Predicted finish</div><div class="h1" style="font-size:54px">${U.ordinal(pv.pos)}</div></div>${C.crest(c, 60)}</div><div class="small" style="opacity:.92;margin-top:6px">“${esc(pv.verdict)}” — ${esc(pv.who)}</div><div class="tiny" style="opacity:.8;margin-top:4px">Your assistant's prediction. The board expects ${U.ordinal(FM.Season.expectedPos(c))}.</div></div>
      <div class="card"><div class="h3">Board expects</div>${objs.map((o) => `<div class="small" style="margin-top:6px">• ${esc(o.text)}</div>`).join('')}</div>
      <div class="card"><div class="h3">Title odds</div>${pv.odds.map((o) => `<div class="row small" style="padding:5px 0">${C.crest(CL(o.id), 18)}<span class="grow ${W.isUser(o.id) ? 'b' : ''}">${esc(CL(o.id).name)}</span><b>${o.odds}</b></div>`).join('')}</div>
      <div class="card"><div class="h3">Predicted table</div><table class="t" style="margin-top:6px">${pv.rows.map((r, i) => `<tr class="${W.isUser(r.id) ? 'me' : ''}"><td>${i + 1}</td><td class="l"><div class="row" style="gap:6px">${C.crest(CL(r.id), 16)}<span class="ellip">${esc(CL(r.id).name)}</span></div></td><td class="dim">${r.pts}</td></tr>`).join('')}</table><div class="tiny dim" style="margin-top:6px">Number = predicted points. Your assistant's read — a better assistant predicts more accurately.</div></div>
      <div class="card"><div class="h3" style="margin-bottom:8px">Pre-season best XI · ${pv.formation}</div><div class="tpitch">${dots}</div></div>
      <div class="card">${pv.star ? `<div class="row small tap" data-act="player" data-id="${pv.star.id}" style="padding:6px 0">⭐ <span class="grow">Key man: <b>${esc(W.name(pv.star))}</b></span>${C.playerStars(pv.star)}</div>` : ''}${pv.kid ? `<div class="row small tap" data-act="player" data-id="${pv.kid.id}" style="padding:6px 0">🌱 <span class="grow">One to watch: <b>${esc(W.name(pv.kid))}</b> (${W.age(pv.kid)})</span>${C.playerStars(pv.kid)}</div>` : ''}${pv.signings.length ? `<div class="small" style="padding:6px 0">✍️ Summer signings: ${pv.signings.map((p) => esc(W.short(p))).join(', ')}</div>` : ''}</div>
      <button class="btn pri block" data-act="closeSheet">Let's go</button>`,
      { title: 'Season preview' },
    );
  };

  // ======================= Scouting hub =======================
  UI.sub.scout = 'hub';
  UI.screens.scout = function () {
    const t = UI.sub.scout,
      s = S();
    const newCount = Object.values(s.user.reports).filter((r) => r.isNew).length;
    const win = FM.Season.windowOpen();
    const head = `<div class="card flat row" style="padding:10px 14px"><span style="font-size:20px">${win ? '🟢' : '🔴'}</span><div class="grow"><div class="b small">Transfer window ${win ? 'OPEN' : 'closed'}</div><div class="tiny dim">${win ? `Transfers and loans can be completed. ${UI.windowLabel()}.` : 'Opens pre-season and matchdays 12–14. Until then only free agents can sign.'}</div></div><div class="col" style="align-items:flex-end"><div class="tiny dim">Budget</div><b>${U.money(club().budget)}</b></div></div>`;
    const tabs = [
      ['hub', 'Hub'],
      ['reports', `Reports${newCount ? ` (${newCount})` : ''}`],
      ['search', 'Search'],
      ['free', 'Free agents'],
      ['shortlist', 'Shortlist'],
      ['market', 'Transfer Centre'],
    ];
    const views = {
      hub: hubView,
      reports: reportsView,
      search: searchView,
      free: freeView,
      shortlist: shortlistView,
      market: marketView,
    };
    return (
      head +
      `<div class="chips">${tabs.map(([v, l]) => `<button class="chip ${t === v ? 'on' : ''}" data-act="sub" data-k="scout" data-v="${v}">${l}</button>`).join('')}</div>` +
      (views[t] || hubView)()
    );
  };
  const reportRow = (p, v, extra = '', dismiss = false) => {
    const c = p.clubId && CL(p.clubId);
    const clause = p.clubId && v.k >= 40 && p.deal && p.deal.release ? ` · 🔓 ${U.money(p.deal.release)}` : '';
    return `<div class="prow tap" data-act="player" data-id="${p.id}">${gradeBadge(v.grade)}<div class="grow" style="min-width:0"><div class="b ellip">${C.flag(p.nat)} ${esc(W.name(p))} <span class="dim small">${W.age(p)} · ${p.pos}</span></div><div class="tiny dim ellip">${c ? esc(c.name) : 'Free agent'}${p.loan ? ' (loan)' : ''} · ${v.fee != null ? (p.clubId ? '~' + U.money(v.fee) : U.money(FM.Transfers.wageDemand(p, club())) + '/wk') : '?'}${clause}${extra}</div><div class="row" style="gap:6px;margin-top:3px">${recPill(v.rec).replace('class="pill', 'style="font-size:10px;padding:1px 6px" class="pill')}${knowBar(v.k)}</div></div><div class="col" style="align-items:flex-end;gap:4px">${C.playerStars(p)}</div>${dismiss === 'restore' ? `<button class="btn sm" style="flex:none" data-act="restoreReport" data-id="${p.id}">Restore</button>` : dismiss ? `<div class="col" style="gap:4px;flex:none"><button class="icon-btn" style="width:30px;height:30px;font-size:13px" title="Compare with your best at his position" aria-label="Compare" data-act="compare" data-id="${p.id}">⚖️</button><button class="icon-btn" style="width:30px;height:30px;font-size:13px" title="Dismiss report" aria-label="Dismiss report" data-act="dismissReport" data-id="${p.id}">✕</button></div>` : ''}</div>`;
  };
  function hubView() {
    const s = S();
    const picks = FM.Advice.scoutPicks(5);
    const asg = s.user.scouts
      .map((id) => {
        const sc = s.staff[id],
          a = s.user.assignments.find((x) => x.scout === id);
        const best = Object.entries(sc.regions)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 2)
          .map(([k]) => D.REGIONS[k])
          .join(', ');
        return `<div class="row" style="padding:10px 0;border-top:1px solid var(--line)"><span style="font-size:22px">${C.flag(sc.nat)}</span><div class="grow" style="min-width:0"><div class="b small">${esc(sc.fn + ' ' + sc.ln)} <span class="dim">· ${sc.judge}/20</span></div><div class="tiny dim ellip">${a ? (a.type === 'player' ? `Watching ${esc(P(a.pid) ? W.name(P(a.pid)) : '?')} · ${a.weeks}w left` : esc(FM.Scouting.focusLabel(a))) : `Idle · best in ${best}`}</div></div><button class="btn sm ${a ? '' : 'pri'}" data-act="assignScout" data-id="${id}">${a ? 'Change' : 'Assign'}</button></div>`;
      })
      .join('');
    return `<div class="card"><div class="row"><div class="h3 grow">Scout picks</div><span class="tiny dim">best-graded targets</span></div>${picks.length ? picks.map(({ p, v }) => reportRow(p, v)).join('') : '<div class="small dim" style="margin-top:6px">No A/B-graded targets yet. Give your scouts assignments and advance a few days.</div>'}</div>
      <div class="card"><div class="row"><div class="h3 grow">Assignments</div><button class="btn sm" data-act="goStaff">Hire scouts</button></div>${asg}</div>
      <div class="card"><div class="h3">Scouting knowledge</div><div class="small dim" style="margin:4px 0 8px">Your network's best coverage per region</div>${Object.entries(
        D.REGIONS,
      )
        .map(([k, l]) => {
          const b = Math.max(...s.user.scouts.map((id) => s.staff[id].regions[k] || 0));
          return `<div class="row tiny" style="margin:5px 0"><span style="width:96px" class="dim">${l}</span><div class="grow">${C.bar(b * 100, b >= 0.8 ? 'var(--good)' : b >= 0.45 ? 'var(--acc2)' : 'var(--bad)')}</div><b style="width:34px;text-align:right">${Math.round(b * 100)}%</b></div>`;
        })
        .join('')}</div>`;
  }
  UI.acts.goStaff = () => {
    UI.sub.club = 'staff';
    UI.go('club');
  };

  UI._as = {
    type: 'region',
    region: 'SAM',
    comp: 'ES1',
    pos: 'any',
    nat: 'any',
    maxAge: 23,
    minStars: 0,
    maxFee: 0,
    focus: 'any',
  };
  UI.acts.assignScout = (d) => {
    UI._as.scout = d.id;
    const a = S().user.assignments.find((x) => x.scout === d.id && x.type !== 'player');
    if (a) Object.assign(UI._as, a, { scout: d.id });
    UI.assignSheet();
  };
  UI.assignSheet = function () {
    const a = UI._as,
      s = S(),
      sc = s.staff[a.scout || s.user.scouts[0]];
    a.scout = sc.id;
    const bud = club().budget;
    // Nationality: the nations of the chosen region, or the nationalities actually playing in the chosen league
    const natOpts = (
      a.type === 'region'
        ? Object.keys(D.NATIONS).filter((k) => D.NATIONS[k].region === a.region)
        : [...new Set(s.comps[a.comp].clubs.flatMap((id) => W.squad(id).map((p) => p.nat)))]
    ).sort((x, y) => D.NATIONS[x].name.localeCompare(D.NATIONS[y].name));
    if (a.nat !== 'any' && !natOpts.includes(a.nat)) a.nat = 'any';
    const html = `<div class="row small" style="margin-bottom:6px">${C.flag(sc.nat)} <b>${esc(sc.fn + ' ' + sc.ln)}</b><span class="dim">· judging ${sc.judge}/20</span></div>
      <div class="seg">${[
        ['region', 'By region'],
        ['league', 'By league'],
      ]
        .map(
          ([k, l]) =>
            `<button class="${a.type === k ? 'on' : ''}" data-act="as" data-k="type" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>
      ${
        a.type === 'region'
          ? `<div class="h3" style="margin-top:12px">Region</div>${chipRow(
              'as',
              'region',
              a.region,
              Object.entries(D.REGIONS).map(([k, l]) => [k, `${l} · ${Math.round((sc.regions[k] || 0) * 100)}%`]),
            )}`
          : `<div class="h3" style="margin-top:12px">League</div>${chipRow(
              'as',
              'comp',
              a.comp,
              W.leagues().map((c) => [c.id, c.name]),
            )}`
      }
      <div class="h3" style="margin-top:6px">Position</div>${chipRow('as', 'pos', a.pos, [
        ['any', 'Any'],
        ['GK', 'GK'],
        ['DEF', 'DEF'],
        ['MID', 'MID'],
        ['ATT', 'ATT'],
      ])}
      <div class="h3" style="margin-top:6px">Nationality</div><select id="as-nat" class="as-nat"><option value="any">Any nationality</option>${natOpts.map((k) => `<option value="${k}" ${a.nat === k ? 'selected' : ''}>${D.NATIONS[k].flag} ${esc(D.NATIONS[k].name)}</option>`).join('')}</select>
      <div class="h3" style="margin-top:6px">Max age</div>${chipRow('as', 'maxAge', a.maxAge, [
        [19, '≤19'],
        [21, '≤21'],
        [23, '≤23'],
        [27, '≤27'],
        [35, 'Any'],
      ])}
      <div class="h3" style="margin-top:6px">Minimum potential</div>${chipRow('as', 'minStars', a.minStars, [
        [0, 'Any'],
        [3, '3★'],
        [3.5, '3.5★'],
        [4, '4★'],
        [4.5, '4.5★'],
      ])}
      <div class="h3" style="margin-top:6px">Max fee</div>${chipRow('as', 'maxFee', a.maxFee, [
        [0, 'Any'],
        [1e6, U.money(1e6)],
        [5e6, U.money(5e6)],
        [1.5e7, U.money(1.5e7)],
        [Math.max(1e5, U.roundMoney(bud)), `Budget (${U.money(bud)})`],
      ])}
      <div class="h3" style="margin-top:6px">Focus</div>${chipRow('as', 'focus', a.focus, [
        ['any', 'Best available'],
        ['moneyball', 'Undervalued'],
        ['wonderkid', 'Wonderkids'],
        ['ready', 'Ready now'],
      ])}
      <button class="btn pri block" data-act="doAssign" style="margin-top:12px">Send ${esc(sc.fn)}</button>
      ${s.user.assignments.some((x) => x.scout === sc.id) ? `<button class="btn block" data-act="stopAssign" style="margin-top:8px">Stop current assignment</button>` : ''}`;
    if (document.querySelector('.sheet-wrap .assign-sheet')) UI.refreshSheet(`<div class="assign-sheet">${html}</div>`);
    else UI.sheet(`<div class="assign-sheet">${html}</div>`, { title: 'Scouting assignment' });
    const nat = document.querySelector('.assign-sheet #as-nat');
    if (nat) nat.addEventListener('change', () => (UI._as.nat = nat.value));
  };
  UI.acts.as = (d) => {
    const num = ['maxAge', 'minStars', 'maxFee'].includes(d.k);
    UI._as[d.k] = num ? +d.v : d.v;
    UI.assignSheet();
  };
  UI.acts.doAssign = () => {
    const a = UI._as;
    const spec = {
      type: a.type,
      pos: a.pos,
      nat: a.nat,
      maxAge: a.maxAge,
      minStars: a.minStars,
      maxFee: a.maxFee,
      focus: a.focus,
    };
    if (a.type === 'region') spec.region = a.region;
    else spec.comp = a.comp;
    FM.Scouting.assign(a.scout, spec);
    UI.save();
    UI.closeSheet();
    UI.render();
    UI.toast('Reports will arrive after each matchday');
  };
  UI.acts.stopAssign = () => {
    const u = S().user;
    u.assignments = u.assignments.filter((x) => x.scout !== UI._as.scout);
    UI.save();
    UI.closeSheet();
    UI.render();
  };

  // ---------- Shared filters for Reports, Search and Free agents ----------
  // Everything is judged on what your scouts know (their estimates), never the hidden truth
  UI._sf = {
    pos: 'any',
    age: 'any',
    level: 'any',
    price: 'any',
    wage: 'any',
    contract: 'any',
    nat: 'any',
    comp: 'any',
    avail: 'any',
    more: false,
  };
  const SF_AGE = { any: [0, 99], u19: [0, 19], u21: [0, 21], u23: [0, 23], prime: [24, 29], vet: [30, 99] };
  const SF_PRICE = { any: Infinity, m1: 1e6, m5: 5e6, m20: 2e7 };
  const SF_WAGE = { any: Infinity, k10: 1e4, k25: 2.5e4, k50: 5e4, k100: 1e5 };
  const sfActive = () => Object.entries(UI._sf).filter(([k, v]) => k !== 'more' && v !== 'any').length;
  // Your XI's level: "a starter for us" means at least that
  const myLevel = () => {
    const c = club();
    return c ? U.avg(W.pickXI(c.id, S().user.tactic).xi.filter(Boolean), (p) => p.ca) : 60;
  };
  const mid = (r) => (r ? (r[0] + r[1]) / 2 : null);
  function sfApply(players) {
    const f = UI._sf,
      s = S(),
      me = club(),
      lvl = f.level === 'any' ? 0 : myLevel();
    return players.filter((p) => {
      if (f.pos !== 'any' && p.pos !== f.pos) return false;
      const a = W.age(p),
        [lo, hi] = SF_AGE[f.age];
      if (a < lo || a > hi) return false;
      if (f.nat !== 'any' && p.nat !== f.nat) return false;
      if (f.comp !== 'any' && !(p.clubId && CL(p.clubId).comp === f.comp)) return false;
      if (f.contract !== 'any' && !(p.clubId && p.contract <= s.year + (f.contract === 'now' ? 0 : 1))) return false;
      if (f.avail === 'free' && p.clubId) return false;
      if (f.avail === 'loan' && !(p.clubId && !p.loan && FM.Transfers.loanTerms(p).available)) return false;
      if (f.avail === 'cheap' && !(p.clubId && FM.Market.wantsAway(p))) return false;
      if (f.level !== 'any' || f.price !== 'any') {
        const v = FM.Scouting.view(p),
          ca = mid(v.ca),
          pa = mid(v.pa);
        if (f.level === 'starter' && !(ca != null && ca >= lvl)) return false;
        if (f.level === 'squad' && !(ca != null && ca >= lvl - 6)) return false;
        if (f.level === 'prospect' && !(a <= 21 && pa != null && pa >= lvl + 2)) return false;
        if (f.price !== 'any') {
          const fee = p.clubId ? v.fee : 0;
          if (fee == null) return false;
          if (f.price === 'budget' ? fee > (me ? me.budget : 0) : fee > SF_PRICE[f.price]) return false;
        }
      }
      if (f.wage !== 'any' && me && FM.Transfers.wageDemand(p, me) > SF_WAGE[f.wage]) return false;
      return true;
    });
  }
  function sfPanel() {
    const f = UI._sf,
      n = sfActive();
    const row = (k, opts) =>
      `<div class="chips" style="margin-top:4px">${opts.map(([v, l]) => `<button class="chip ${f[k] === v ? 'on' : ''}" data-act="sf" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const sel = (k, opts) =>
      `<select data-input="sfSel" data-k="${k}" style="flex:1;min-width:0;padding:8px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink)">${opts.map(([v, l]) => `<option value="${esc(v)}" ${f[k] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const more = f.more
      ? `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${sel('wage', [
          ['any', 'Any wage'],
          ...Object.keys(SF_WAGE)
            .filter((k) => k !== 'any')
            .map((k) => [k, `Wants ≤ ${U.money(SF_WAGE[k])}/wk`]),
        ])}${sel('contract', [
          ['any', 'Any contract'],
          ['now', 'Ends this season'],
          ['next', 'Ends within a year'],
        ])}</div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${sel('nat', [
          ['any', 'Any nationality'],
          ...Object.entries(D.NATIONS)
            .sort((a, b) => a[1].name.localeCompare(b[1].name))
            .map(([k, x]) => [k, `${x.flag} ${x.name}`]),
        ])}${sel('comp', [['any', 'Any league'], ...W.leagues().map((c) => [c.id, c.name.replace('The ', '')])])}</div>
        <div class="row" style="gap:6px;margin-top:6px">${sel('avail', [
          ['any', 'Any availability'],
          ['loan', 'Available on loan'],
          ['cheap', 'Wants away / sells cheaply'],
          ['free', 'Free agents only'],
        ])}</div>`
      : '';
    return `<div class="card flat" style="padding:8px 10px;margin-bottom:8px">
      ${row('pos', [['any', 'All'], ...D.POS.map((x) => [x, x])])}
      ${row('age', [
        ['any', 'Any age'],
        ['u19', '≤19'],
        ['u21', '≤21'],
        ['u23', '≤23'],
        ['prime', '24–29'],
        ['vet', '30+'],
      ])}
      ${row('level', [
        ['any', 'Any level'],
        ['starter', 'Would start for us'],
        ['squad', 'Squad player'],
        ['prospect', 'Prospect'],
      ])}
      ${row('price', [
        ['any', 'Any fee'],
        ['budget', 'Within budget'],
        ['m1', `≤ ${U.money(1e6)}`],
        ['m5', `≤ ${U.money(5e6)}`],
        ['m20', `≤ ${U.money(2e7)}`],
      ])}
      ${more}
      <div class="row" style="margin-top:6px;gap:6px"><button class="btn sm" data-act="sfMore">${f.more ? 'Fewer filters ▴' : 'More filters ▾'}</button><span class="grow"></span>${n ? `<button class="btn sm" data-act="sfReset">Clear ${n} filter${n === 1 ? '' : 's'}</button>` : ''}</div></div>`;
  }
  UI.acts.sf = (d) => {
    UI._sf[d.k] = d.v;
    UI.render();
  };
  UI.acts.sfSel = (d, el) => {
    UI._sf[d.k] = el.value;
    UI.render();
  };
  UI.acts.sfMore = () => {
    UI._sf.more = !UI._sf.more;
    UI.render();
  };
  UI.acts.sfReset = () => {
    const more = UI._sf.more;
    Object.keys(UI._sf).forEach((k) => (UI._sf[k] = 'any'));
    UI._sf.more = more;
    UI.render();
  };

  UI._rf = { grade: 'all', pos: 'any', age: 99, sort: 'grade' };
  function reportsView() {
    const s = S(),
      f = UI._rf;
    let reps = Object.entries(s.user.reports)
      .map(([pid, r]) => ({ p: P(pid), r }))
      .filter(({ p }) => p && !W.isUser(p.clubId))
      .map((x) => ({ ...x, v: FM.Scouting.view(x.p) }));
    if (f.grade !== 'all') reps = reps.filter((x) => (f.grade === 'AB' ? ['A', 'B'] : [f.grade]).includes(x.v.grade));
    const keep = new Set(sfApply(reps.map((x) => x.p)));
    reps = reps.filter((x) => keep.has(x.p));
    const sorts = {
      grade: (a, b) => b.v.score - a.v.score,
      newest: (a, b) => b.r.year - a.r.year || b.r.day - a.r.day,
      fee: (a, b) => (a.v.fee || 0) - (b.v.fee || 0),
      age: (a, b) => W.age(a.p) - W.age(b.p),
    };
    reps.sort(sorts[f.sort]);
    const disList = Object.keys(s.user.dismissed || {})
      .map(P)
      .filter((p) => p && !p.retired && !W.isUser(p.clubId));
    const nDis = disList.length;
    const cnt = (g) =>
      Object.keys(s.user.reports).filter(
        (id) => P(id) && !W.isUser(P(id).clubId) && FM.Scouting.view(P(id)).grade === g,
      ).length;
    return `<div class="row" style="gap:6px;margin-bottom:8px">${['A', 'B', 'C', 'D'].map((g) => `<div class="kpi tap grow" style="padding:8px;text-align:center" data-act="rf" data-k="grade" data-v="${f.grade === g ? 'all' : g}">${gradeBadge(g, 24)}<div class="tiny dim" style="margin-top:4px">${cnt(g)}</div></div>`).join('')}</div>
      ${sfPanel()}
      <div class="row" style="justify-content:flex-end;gap:6px;margin:-2px 0 6px;flex-wrap:wrap">${nDis ? `<button class="btn sm ${f.dismissed ? 'pri' : ''}" data-act="rfDismissed">${f.dismissed ? '← Back to reports' : `Dismissed (${nDis})`}</button>` : ''}${!f.dismissed && cnt('C') + cnt('D') ? `<button class="btn sm" data-act="dismissWeak">🗑 Dismiss all C & D (${cnt('C') + cnt('D')})</button>` : ''}</div>
      ${chipRow('rf', 'sort', f.sort, [
        ['grade', 'Sort: grade'],
        ['newest', 'Newest'],
        ['fee', 'Cheapest'],
        ['age', 'Youngest'],
      ])}
      <div class="card flat list" style="padding:4px 12px">${
        f.dismissed
          ? disList.map((p) => reportRow(p, FM.Scouting.view(p), '', 'restore')).join('') ||
            '<div class="empty">Nothing dismissed.</div>'
          : reps
              .slice(0, 60)
              .map(({ p, v, r }) =>
                reportRow(p, v, r.isNew ? ' · <span style="color:var(--acc)">NEW</span>' : '', true),
              )
              .join('') || '<div class="empty">No reports match. Assign scouts from the Hub.</div>'
      }</div>`;
  }
  UI.acts.rf = (d) => {
    UI._rf[d.k] = d.k === 'age' ? +d.v : d.v;
    UI.render();
  };

  UI._q = { text: '', pos: 'any', region: 'any', comp: 'any' };
  function searchView() {
    const q = UI._q,
      s = S();
    let ps = Object.values(s.players).filter((p) => !p.retired && !W.isUser(p.clubId));
    if (q.text)
      ps = ps.filter((p) =>
        (W.name(p) + ' ' + (p.clubId ? CL(p.clubId).name : '') + ' ' + D.NATIONS[p.nat].name)
          .toLowerCase()
          .includes(q.text.toLowerCase()),
      );
    if (q.region !== 'any') ps = ps.filter((p) => FM.Scouting.region(p) === q.region);
    // the cheap filters first, so the scouting estimates are worked out only for what's left
    ps = sfApply(ps).sort((a, b) => FM.Scouting.know(b.id) - FM.Scouting.know(a.id) || b.value - a.value);
    return `<input type="text" placeholder="Search players, clubs or nations…" value="${esc(q.text)}" data-input="searchText" style="width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card);margin-bottom:6px">
      ${chipRow('q', 'region', q.region, [['any', 'Everywhere'], ...Object.entries(D.REGIONS)])}
      ${sfPanel()}
      <div class="card flat list" style="padding:4px 12px">${
        ps
          .slice(0, 50)
          .map((p) => reportRow(p, FM.Scouting.view(p)))
          .join('') || '<div class="empty">No matches</div>'
      }</div>`;
  }
  UI.acts.q = (d) => {
    UI._q[d.k] = d.v;
    UI.render();
  };

  UI._fq = { pos: 'any' };
  function freeView() {
    let ps = sfApply(Object.values(S().players).filter((p) => !p.clubId && !p.retired));
    ps = ps.map((p) => ({ p, v: FM.Scouting.view(p) })).sort((a, b) => b.v.score - a.v.score || b.p.ca - a.p.ca);
    return `<div class="small muted" style="margin:0 2px 8px">Out-of-contract players can sign any time, window open or not — no fee, but they want a signing-on bonus and slightly higher wages. Scout them to see what you're getting.</div>
      ${sfPanel()}
      <div class="card flat list" style="padding:4px 12px">${
        ps
          .slice(0, 60)
          .map(({ p, v }) => reportRow(p, v))
          .join('') || '<div class="empty">No free agents.</div>'
      }</div>`;
  }
  UI.acts.fq = (d) => {
    UI._fq[d.k] = d.v;
    UI.render();
  };
  function shortlistView() {
    const sl = S().user.shortlist.filter(P);
    return sl.length
      ? `<div class="card flat list" style="padding:4px 12px">${sl.map((id) => reportRow(P(id), FM.Scouting.view(P(id)))).join('')}</div>`
      : '<div class="empty">Your shortlist is empty. Tap ☆ on a player card.</div>';
  }
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
      UI._mk === 'intl'
        ? intl
        : UI._mk === 'loans'
          ? all.filter((t) => t.loan)
          : UI._mk === 'mine'
            ? all.filter((t) => W.isUser(t.to) || W.isUser(t.from))
            : all;
    const spend = U.sum(all, (t) => t.fee);
    return `<div class="kpis"><div class="kpi"><div class="v">${all.length}</div><div class="l">Deals</div></div><div class="kpi"><div class="v">${intl.length}</div><div class="l">International</div></div><div class="kpi"><div class="v">${U.money(spend)}</div><div class="l">Total fees</div></div></div>
      ${
        Object.keys(flows).length
          ? `<div class="card flat"><div class="h3" style="margin-bottom:6px">Cross-border flows</div>${Object.values(
              flows,
            )
              .sort((a, b) => b.fee - a.fee)
              .slice(0, 8)
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
        ['loans', 'Loans'],
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
            return `<div class="row small tap" style="padding:9px 0;border-top:1px solid var(--line)" data-act="player" data-id="${t.pid}"><div class="grow" style="min-width:0"><div class="b ellip">${C.flag(t.nat)} ${esc(t.name)} ${t.loan ? '<span class="pill">LOAN</span>' : ''} ${t.intl ? '<span class="pill acc">INTL</span>' : ''}</div><div class="tiny dim ellip">${from ? `${C.flag(from.nat)} ${esc(from.short)}` : 'Free agent'} → ${C.flag(to.nat)} ${esc(to.name)}${t.age ? ` · age ${t.age}` : ''}</div></div>${C.fee(t.fee, W.isUser(t.to) ? 'in' : W.isUser(t.from) ? 'out' : null, t.loan)}</div>`;
          })
          .join('') || '<div class="empty">No deals yet this season.</div>'
      }</div>`;
  }
  UI.acts.mk = (d) => {
    UI._mk = d.v;
    UI.render();
  };

  // ======================= Post-match: shots, xG race, player stats, insights =======================
  MV._origPost = MV.post;
  MV.post = function () {
    MV._origPost();
    const chips = document.getElementById('postChips');
    if (chips)
      chips.innerHTML = [
        ['summary', 'Summary'],
        ['insights', 'Insights'],
        ['shots', 'Shots & xG'],
        ['stats', 'Player stats'],
        ['ratings', 'Ratings'],
        ['analysis', 'Shape'],
      ]
        .map(
          ([k, l]) =>
            `<button class="chip ${k === 'summary' ? 'on' : ''}" data-act="postTab" data-v="${k}">${l}</button>`,
        )
        .join('');
  };
  MV._origRender = MV.renderPost;
  MV.renderPost = function () {
    const t = MV.postTab,
      body = document.getElementById('postBody');
    if (!['shots', 'stats', 'insights'].includes(t)) return MV._origRender();
    const m = MV.m,
      us = MV.us,
      me = m.sides[us],
      op = m.sides[1 - us];
    if (t === 'shots')
      body.innerHTML = `<div class="card"><div class="h3">Shot map</div><div class="tiny dim">Circle size = xG · filled = goal · ringed = on target · faded = off target / blocked</div>${MV.shotMap(m)}<div class="row tiny" style="justify-content:space-between;margin-top:6px"><span style="color:${colOf(op)}">◀ ${esc(op.club.short)} attack</span><span style="color:${colOf(me)}">${esc(me.club.short)} attack ▶</span></div></div>
      <div class="card"><div class="h3">xG race</div>${MV.xgRace(m)}</div>
      <div class="card"><div class="h3">Chance types</div>${MV.typeTable(m)}</div>`;
    if (t === 'stats') body.innerHTML = MV.statTable(me) + MV.statTable(op, true);
    if (t === 'insights') {
      const a = FM.Staff.get('analyst');
      body.innerHTML = `<div class="card"><div class="row"><span style="font-size:24px">📊</span><div class="grow"><div class="h3">${esc(a.fn + ' ' + a.ln)}</div><div class="tiny dim">Head of Analytics · ${a.ability}/20</div></div></div>${MV.insights(
        m,
      )
        .map(
          (x) =>
            `<div class="phrase" style="border-top:1px solid var(--line);padding:9px 0"><span>${x[0]}</span><span>${esc(x[1])}</span></div>`,
        )
        .join('')}</div>`;
    }
  };
  const colOf = (sd) =>
    sd.club.colors[0] === '#FFFFFF' || sd.club.colors[0].toUpperCase() === '#FFFFFF'
      ? sd.club.colors[1]
      : sd.club.colors[0];
  MV.shotMap = function (m) {
    const w = 340,
      h = 220,
      pad = 10,
      us = MV.us;
    const X = (x, side) => (side === us ? pad + x * (w - 2 * pad) : pad + (1 - x) * (w - 2 * pad));
    const Y = (y, side) => pad + (side === us ? y : 1 - y) * (h - 2 * pad);
    const lines = `<rect x="${pad}" y="${pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" fill="none" stroke="rgba(255,255,255,.45)"/><line x1="${w / 2}" y1="${pad}" x2="${w / 2}" y2="${h - pad}" stroke="rgba(255,255,255,.45)"/><circle cx="${w / 2}" cy="${h / 2}" r="26" fill="none" stroke="rgba(255,255,255,.45)"/><rect x="${pad}" y="${h * 0.22}" width="${(w - 2 * pad) * 0.157}" height="${h * 0.56}" fill="none" stroke="rgba(255,255,255,.45)"/><rect x="${w - pad - (w - 2 * pad) * 0.157}" y="${h * 0.22}" width="${(w - 2 * pad) * 0.157}" height="${h * 0.56}" fill="none" stroke="rgba(255,255,255,.45)"/>`;
    const dots = m.shotLog
      .map((s) => {
        const col = colOf(m.sides[s.side]),
          r = 3.5 + s.xg * 16;
        const goal = s.outcome === 'goal',
          on = s.outcome === 'saved';
        return `<circle cx="${X(s.x, s.side)}" cy="${Y(s.y, s.side)}" r="${r}" fill="${goal ? col : 'none'}" fill-opacity="${goal ? 0.95 : 0}" stroke="${goal ? '#fff' : col}" stroke-width="${goal ? 1.6 : on ? 2 : 1.2}" stroke-opacity="${goal || on ? 1 : 0.5}"><title>${s.m}' ${W.short(P(s.pid))} · ${s.type} · xG ${s.xg.toFixed(2)} · ${s.outcome}</title></circle>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;margin-top:8px;background:#1f7a3f;border-radius:10px">${lines}${dots}</svg>`;
  };
  MV.xgRace = function (m) {
    const w = 320,
      h = 120,
      pad = 22,
      L = m.xgLine,
      n = Math.max(90, L.length);
    const max = Math.max(1, ...L.map((x) => Math.max(x[0], x[1]))) * 1.1;
    const pt = (i, v) => `${pad + (i / n) * (w - pad - 8)},${h - pad - (v / max) * (h - pad - 10)}`;
    const line = (k) => {
      let d = `${pad},${h - pad}`;
      L.forEach((x, i) => (d += ` ${pt(i + 1, x[k])}`));
      return d;
    };
    const goals = m.shotLog
      .filter((s) => s.outcome === 'goal')
      .map((s) => {
        const v = (L[s.mi] || L[L.length - 1] || [0, 0])[s.side];
        const [x, y] = pt(s.mi + 1, v).split(',');
        return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="${colOf(m.sides[s.side])}" stroke-width="2"/>`;
      })
      .join('');
    const [H, A] = m.sides;
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;margin-top:6px">${[0.5, 1, 1.5, 2, 2.5, 3]
      .filter((v) => v < max)
      .map(
        (v) =>
          `<line x1="${pad}" x2="${w - 8}" y1="${h - pad - (v / max) * (h - pad - 10)}" y2="${h - pad - (v / max) * (h - pad - 10)}" stroke="var(--line)"/><text x="4" y="${h - pad - (v / max) * (h - pad - 10) + 3}" font-size="9" fill="var(--ink3)">${v}</text>`,
      )
      .join(
        '',
      )}<polyline points="${line(0)}" fill="none" stroke="${colOf(H)}" stroke-width="2.5" stroke-linejoin="round"/><polyline points="${line(1)}" fill="none" stroke="${colOf(A)}" stroke-width="2.5" stroke-linejoin="round" ${colOf(H) === colOf(A) ? 'stroke-dasharray="5 3"' : ''}/>${goals}<text x="${pad}" y="${h - 6}" font-size="9" fill="var(--ink3)">0'</text><text x="${w - 30}" y="${h - 6}" font-size="9" fill="var(--ink3)">90'</text></svg>
      <div class="row tiny" style="gap:14px;justify-content:center"><span style="color:${colOf(H)}">■ ${esc(H.club.short)} ${H.xg.toFixed(2)}</span><span style="color:${colOf(A)}">■ ${esc(A.club.short)} ${A.xg.toFixed(2)}</span><span class="dim">○ goal</span></div>`;
  };
  const TYPE_NAME = {
    through: 'Through balls',
    cross: 'Crosses',
    cutback: 'Cutbacks',
    longshot: 'Long shots',
    counter: 'Counters',
    setpiece: 'Set pieces',
    penalty: 'Penalties',
  };
  MV.typeTable = function (m) {
    const [H, A] = m.sides;
    const agg = (side) => {
      const o = {};
      m.shotLog
        .filter((s) => s.side === side)
        .forEach((s) => {
          o[s.type] = o[s.type] || { n: 0, xg: 0, g: 0 };
          o[s.type].n++;
          o[s.type].xg += s.xg;
          if (s.outcome === 'goal') o[s.type].g++;
        });
      return o;
    };
    const a = agg(0),
      b = agg(1);
    const types = Object.keys(TYPE_NAME).filter((t) => a[t] || b[t]);
    return `<table class="t"><tr><th class="l">Type</th><th>${esc(H.club.short)}</th><th>xG</th><th>${esc(A.club.short)}</th><th>xG</th></tr>${types.map((t) => `<tr><td class="l">${TYPE_NAME[t]}</td><td>${a[t] ? `${a[t].n}${a[t].g ? ` (${a[t].g}⚽)` : ''}` : '–'}</td><td class="dim">${a[t] ? a[t].xg.toFixed(2) : '–'}</td><td>${b[t] ? `${b[t].n}${b[t].g ? ` (${b[t].g}⚽)` : ''}` : '–'}</td><td class="dim">${b[t] ? b[t].xg.toFixed(2) : '–'}</td></tr>`).join('')}</table>`;
  };
  MV.statTable = function (sd, compact) {
    // each player's share of the team's full passing total (the engine simulates only the passes that matter)
    const scale = MV.m && sd.passCount ? MV.m.passStats(sd.idx).total / sd.passCount : 1;
    const rows = Object.keys(sd.mins)
      .map((pid) => ({ p: P(pid), s: sd.ps[pid] || {}, r: sd.rating[pid], min: sd.mins[pid], st: sd.st[pid] }))
      .sort((a, b) => b.r - a.r);
    return `<div class="card"><div class="row b small" style="margin-bottom:6px">${C.crest(sd.club, 18)} ${esc(sd.club.name)}</div><table class="t"><tr><th class="l">Player</th><th>Min</th><th>Pas</th><th>KP</th><th>Sh</th><th>Tk</th><th>En</th><th>Rt</th></tr>${rows.map((x) => `<tr><td class="l ellip" style="max-width:96px">${esc(x.p ? x.p.ln : '?')}${x.p && x.p.id === MV.m.motm ? ' ⭐' : ''}</td><td class="dim">${x.min}</td><td>${Math.round((x.s.pass || 0) * scale)}</td><td>${x.s.kp || 0}</td><td>${x.s.sh || 0}${x.s.sot ? `<span class="dim">/${x.s.sot}</span>` : ''}</td><td>${x.s.tk || 0}</td><td style="color:${x.st < 45 ? 'var(--bad)' : x.st < 65 ? 'var(--warn)' : 'var(--ink2)'}">${Math.round(x.st)}</td><td>${C.rating(x.r)}</td></tr>`).join('')}</table>${compact ? '' : '<div class="tiny dim" style="margin-top:6px">Pas passes · KP key passes · Sh shots/on target · Tk possession won · En energy at the end</div>'}</div>`;
  };
  // Analyst insights — a better analyst says more (and more precisely)
  MV.insights = function (m) {
    const us = MV.us,
      me = m.sides[us],
      op = m.sides[1 - us],
      out = [];
    const a = FM.Staff.get('analyst'),
      n = 3 + Math.round((a.ability - 6) / 2.5);
    const gd = me.goals - op.goals,
      xgd = me.xg - op.xg;
    if (xgd > 0.8 && gd <= 0)
      out.push([
        '🍀',
        `We created ${me.xg.toFixed(2)} xG to their ${op.xg.toFixed(2)} and didn't win — on another day that's a comfortable victory. Keep doing the same things.`,
      ]);
    else if (xgd < -0.8 && gd >= 0)
      out.push([
        '😅',
        `We rode our luck: they generated ${op.xg.toFixed(2)} xG to our ${me.xg.toFixed(2)}. The result flatters us.`,
      ]);
    else out.push(['⚖️', `On balance the result was fair — xG ${me.xg.toFixed(2)} vs ${op.xg.toFixed(2)}.`]);
    const typ = (side) => {
      const o = {};
      m.shotLog
        .filter((s) => s.side === side)
        .forEach((s) => {
          o[s.type] = (o[s.type] || 0) + s.xg;
        });
      return Object.entries(o).sort((x, y) => y[1] - x[1]);
    };
    const mt = typ(us)[0],
      ot = typ(1 - us)[0];
    if (mt)
      out.push([
        '🎯',
        `Most of our threat came from ${TYPE_NAME[mt[0]].toLowerCase()} (${mt[1].toFixed(2)} xG, ${Math.round((mt[1] / Math.max(0.01, me.xg)) * 100)}% of our total).`,
      ]);
    if (ot && ot[1] >= 0.4)
      out.push([
        '🛑',
        `Their ${TYPE_NAME[ot[0]].toLowerCase()} hurt us (${ot[1].toFixed(2)} xG).${ot[0] === 'counter' ? ' A deeper line or less aggressive press would help.' : ot[0] === 'cross' ? ' We need to stop the crosses at source.' : ot[0] === 'longshot' ? ' Closing down shooters earlier would help.' : ''}`,
      ]);
    const half = (side, h2) =>
      m.shotLog.filter((s) => s.side === side && (h2 ? s.m > 45 : s.m <= 45)).reduce((t, s) => t + s.xg, 0);
    const h1 = half(us, false),
      h2 = half(us, true);
    if (Math.abs(h1 - h2) > 0.5)
      out.push([
        '⏱️',
        `${h2 > h1 ? 'We were much better after the break' : 'We faded in the second half'}: ${h1.toFixed(2)} xG before half-time, ${h2.toFixed(2)} after.`,
      ]);
    if (m.changeAt != null && m.changeAt > 5 && m.changeAt < m.xgLine.length - 5) {
      const at = m.changeAt,
        L = m.xgLine,
        end = L[L.length - 1],
        mid = L[at - 1] || [0, 0];
      const rate = (v, mins) => (v / Math.max(1, mins)) * 90;
      const bF = rate(mid[us], at),
        aF = rate(end[us] - mid[us], L.length - at),
        bA = rate(mid[1 - us], at),
        aA = rate(end[1 - us] - mid[1 - us], L.length - at);
      out.push([
        '📋',
        `Your first tactical change came at ~${Math.min(90, at)}'. Before: ${bF.toFixed(1)} xG for / ${bA.toFixed(1)} against per 90. After: ${aF.toFixed(1)} / ${aA.toFixed(1)}. ${aF - aA > bF - bA ? 'It worked.' : "It didn't shift the balance."}`,
      ]);
    }
    const tired = Object.keys(me.mins)
      .filter((pid) => me.st[pid] < 38 && !me.off[pid])
      .sort((x, y) => me.st[x] - me.st[y])
      .map(P)
      .filter(Boolean);
    if (tired.length)
      out.push([
        '🔋',
        `${tired
          .slice(0, 3)
          .map((p) => `${W.short(p)} (${Math.round(me.st[p.id])}%)`)
          .join(
            ', ',
          )}${tired.length > 3 ? ` and ${tired.length - 3} more` : ''} finished on empty. Earlier substitutions would have kept our shape.`,
      ]);
    const tk = (sd) => U.sum(Object.values(sd.ps), (x) => x.tk || 0);
    out.push([
      '🧲',
      `We won possession back ${tk(me)} times to their ${tk(op)}${me.tactic.press === 'High Press' ? ' — the high press is doing its job' : ''}.`,
    ]);
    const creators = Object.entries(me.ps).sort((x, y) => (y[1].kp || 0) - (x[1].kp || 0))[0];
    if (creators && creators[1].kp >= 2)
      out.push(['🔑', `${W.short(P(creators[0]))} was our chief creator with ${creators[1].kp} key passes.`]);
    const zone = (grid) => {
      let fin = 0,
        tot = 0;
      grid.forEach((v, i) => {
        tot += v;
        if (i % 12 >= 8) fin += v;
      });
      return tot ? Math.round((fin / tot) * 100) : 0;
    };
    out.push([
      '🗺️',
      `${zone(me.heat)}% of our touches came in the final third${zone(me.heat) < 25 ? ' — we struggled to get into dangerous areas' : zone(me.heat) > 38 ? ' — we pinned them back' : ''}.`,
    ]);
    {
      const mp = m.passStats(us).total,
        op2 = m.passStats(1 - us).total;
      out.push([
        '🔁',
        `Passes: ${mp} vs ${op2}. ${mp > op2 * 1.3 ? 'We dominated the ball.' : op2 > mp * 1.3 ? 'They had far more of it.' : 'An even contest for control.'}`,
      ]);
    }
    if (a.vacant)
      out.unshift(['🪑', "No Head of Analytics — this is the caretaker's best effort. Hire one for deeper analysis."]);
    return out.slice(0, n + (a.vacant ? 1 : 0));
  };
  // ---------- Sim to half-time ----------
  MV._origStart = MV.start;
  MV.start = function (fx, instant) {
    MV._origStart(fx, instant);
    const ctrl = document.querySelector('#matchOv .m-ctrl');
    if (ctrl && !instant)
      ctrl
        .querySelector('[data-act=mSim]')
        .insertAdjacentHTML('beforebegin', '<button id="mHT" data-act="mSimHT">⏩ HT</button>');
  };
  const origHT = FM.Prompts.halftime;
  FM.Prompts.halftime = (m) => {
    document.getElementById('mHT')?.remove();
    return origHT(m);
  };
  UI.acts.mSimHT = () => {
    const st = MV.st,
      m = MV.m;
    const htIdx = m.timeline.findIndex((t) => t.ev === 'HT');
    if (m.idx > htIdx) return UI.toast('Already past half-time — use End to sim the rest');
    const goalsBefore = m.events.filter((e) => e.k === 'goal').length;
    st.actions = [];
    st.act = null;
    st.pendingEv = [];
    st.hold = 0;
    st.checkPrompt = false;
    let out;
    while (!m.finished && m.idx <= htIdx) {
      out = m.step();
      if (out && out.ev === 'HT') break;
    }
    // Summarise what happened while skipping
    m.events
      .filter((e) => e.k === 'goal')
      .slice(goalsBefore)
      .forEach((e) => MV.ticker(`⚽ ${e.min} ${W.short(P(e.pid))} (${m.sides[e.side].club.short})`));
    st.ball = { x: 0.5, y: 0.5, side: 1, slot: m.kickoffSlot(m.sides[1]), h: 0 };
    MV.initDots();
    MV.updateHUD();
    document.getElementById('mClock').textContent = 'HALF-TIME';
    document.getElementById('mHT')?.remove();
    MV.banner(
      'HALF-TIME',
      `${m.sides[0].club.short} ${m.sides[0].goals}–${m.sides[1].goals} ${m.sides[1].club.short}. Time for the team talk.`,
    );
    MV.showPrompt(FM.Prompts.halftime(m));
  };

  // Remember when the user first changed tactics (for the insights "before/after")
  const mark = () => {
    if (MV.m && MV.m.changeAt == null) MV.m.changeAt = MV.m.momentum.length;
  };
  const o1 = UI.acts.mOpt,
    o2 = UI.acts.mTac,
    o3 = UI.acts.mSubIn;
  UI.acts.mOpt = (d) => {
    mark();
    o1(d);
  };
  UI.acts.mTac = (d) => {
    mark();
    o2(d);
  };
  UI.acts.mSubIn = (d) => {
    mark();
    o3(d);
  };
})();

// ======================= International football =======================
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W,
    UI = FM.UI,
    C = UI.C;
  const esc = U.esc,
    S = () => FM.S;
  const T = (id) => FM.S.nteams[id];
  const TNAME = {
    WC: 'World Championship',
    EC: 'European Nations Cup',
    SA: 'South American Championship',
    AF: 'Africa Nations Trophy',
    AS: 'Asia-Pacific Nations Cup',
  };
  const resultRow = (g, focus) => {
    const h = T(g.h),
      a = T(g.a),
      bold = (id) => (focus && id === focus ? 'font-weight:800' : '');
    return `<div class="row small" style="padding:7px 0;border-top:1px solid var(--line)"><span class="grow ellip tap" style="text-align:right;${bold(g.h)}" data-act="nation" data-id="${g.h}">${esc(h.name)} ${C.flag(h.code)}</span><b style="min-width:48px;text-align:center">${g.hg}–${g.ag}</b><span class="grow ellip tap" style="${bold(g.a)}" data-act="nation" data-id="${g.a}">${C.flag(a.code)} ${esc(a.name)}</span></div><div class="tiny dim center" style="margin-top:-2px">${esc(g.label)}${g.pens ? ` · pens ${g.pens[0]}–${g.pens[1]}` : ''}</div>`;
  };
  UI.intlView = function () {
    const s = S(),
      uc = W.userClub();
    const cal = s.calendar,
      nextBreak = cal.slice(s.day).findIndex((d) => d.type === 'intl');
    const nt = FM.Intl.nextTournament();
    const mine = W.squad(uc.id)
      .filter((p) => p.intl && p.intl.caps)
      .sort((a, b) => b.intl.caps - a.intl.caps);
    const called = new Set(
      W.squad(uc.id)
        .filter((p) => FM.Intl.squad(p.nat).includes(p))
        .map((p) => p.id),
    );
    const ranked = FM.Intl.ranked();
    const history = s.archive.flatMap((e) => (e.intl || []).map((x) => ({ ...x, label: e.label }))).reverse();
    return `<div class="card"><div class="row"><span style="font-size:26px">🌍</span><div class="grow"><div class="h3">International football</div><div class="tiny dim">${nextBreak >= 0 ? `Next international break in ${nextBreak} matchday${nextBreak === 1 ? '' : 's'}` : 'No more breaks this season'} · ${nt ? `${nt.kind === 'world' ? 'World Championship' : 'Continental championships'} in summer ${nt.year}` : ''}</div></div></div></div>
      <div class="sec"><div class="h3">Your internationals</div><span class="dim small">${called.size} in current squads</span></div>
      <div class="card flat list" style="padding:4px 12px">${
        mine.length
          ? mine
              .slice(0, 12)
              .map(
                (p) =>
                  `<div class="prow tap" data-act="player" data-id="${p.id}">${C.pos(p)}<div class="grow"><div class="b ellip">${C.flag(p.nat)} ${esc(W.name(p))} ${called.has(p.id) ? '<span class="pill acc">In squad</span>' : ''}</div><div class="tiny dim">${esc(D.NATIONS[p.nat].name)} · since ${p.intl.first}</div></div><b>${p.intl.caps}</b><span class="dim tiny" style="margin-left:4px">caps · ${p.intl.goals} gls</span></div>`,
              )
              .join('')
          : '<div class="empty">None of your players have been capped yet.</div>'
      }</div>
      <div class="sec"><div class="h3">World ranking</div><span class="dim small">Elo</span></div>
      <div class="card flat" style="padding:6px 10px"><table class="t">${ranked
        .map(
          (t, i) =>
            `<tr class="tap" data-act="nation" data-id="${t.id}"><td>${i + 1}</td><td class="l"><div class="row" style="gap:6px"><span>${C.flag(t.code)}</span><span class="ellip" style="max-width:120px">${esc(t.name)}</span>${
              Object.keys(t.titles).length
                ? `<span class="tiny">${'🏆'.repeat(
                    Math.min(
                      3,
                      Object.values(t.titles).reduce((a, b) => a + b, 0),
                    ),
                  )}</span>`
                : ''
            }</div></td><td class="b">${t.elo}</td><td class="l">${C.form((t.form || []).slice(-4))}</td></tr>`,
        )
        .join('')}</table></div>
      <div class="sec"><div class="h3">Recent results</div></div>
      <div class="card flat" style="padding:2px 12px">${
        s.intlLog
          .slice(0, 14)
          .map((g) => resultRow(g))
          .join('') || '<div class="empty">No internationals played yet.</div>'
      }</div>
      <div class="sec"><div class="h3">Tournament history</div></div>
      <div class="card flat" style="padding:4px 12px">${history.length ? history.map((x) => `<div class="row small" style="padding:8px 0;border-top:1px solid var(--line)"><span class="dim" style="width:48px">${x.year + 1}</span><div class="grow"><div class="b">${esc(x.name)}</div><div class="tiny dim">Final ${esc(x.final)} v ${esc(T(x.runnerUp).name)}${x.topScorer ? ` · top scorer ${esc(x.topScorer.name)} (${x.topScorer.goals})` : ''}</div></div><b>${C.flag(T(x.winner).code)} ${esc(T(x.winner).name)}</b></div>`).join('') : '<div class="empty">The first tournament is played at the end of this season.</div>'}</div>`;
  };
  UI.acts.nation = (d) => {
    const t = T(d.id),
      s = S();
    const squad = FM.Intl.squad(t.code);
    const games = s.intlLog.filter((g) => g.h === t.id || g.a === t.id).slice(0, 8);
    const rank = FM.Intl.ranked().indexOf(t) + 1;
    UI.sheet(
      `<div class="hero" style="--c1:${t.colors[0] === '#FFFFFF' ? t.colors[1] : t.colors[0]};--c2:#111"><div class="row"><div style="font-size:46px">${C.flag(t.code)}</div><div class="grow"><div class="h1">${esc(t.name)}</div><div class="small" style="opacity:.9">World ranking #${rank} · Elo ${t.elo} · ${esc(D.NATIONS[t.code].style)}</div></div>${UI.followBtn('nation', t.id, true)}</div>
        ${
          Object.keys(t.titles).length
            ? `<div class="small" style="margin-top:8px">${Object.entries(t.titles)
                .map(([k, n]) => `🏆 ${TNAME[k] || k} ×${n}`)
                .join(' · ')}</div>`
            : ''
        }</div>
      <div class="card"><div class="h3">Squad</div><div class="tiny dim" style="margin-bottom:6px">The best ${squad.length} available ${esc(D.NATIONS[t.code].name)} players</div>${squad.map((p) => `<div class="prow tap" data-act="player" data-id="${p.id}">${C.pos(p)}<div class="grow"><div class="b ellip">${esc(W.name(p))}${W.isUser(p.clubId) ? ' <span class="pill acc">Yours</span>' : ''}</div><div class="tiny dim ellip">${p.clubId ? esc(s.clubs[p.clubId].name) : 'Free agent'} · ${W.age(p)} · ${p.intl ? p.intl.caps : 0} caps</div></div>${C.playerStars(p)}</div>`).join('')}</div>
      <div class="card"><div class="h3">Recent results</div>${games.map((g) => resultRow(g, t.id)).join('') || '<div class="small dim">No matches yet.</div>'}</div>`,
      { title: t.name },
    );
  };
})();
