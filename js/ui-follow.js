// Following: clubs, players, competitions and nations you follow. Their news comes into your feed (My Club, and
// a Following chip with a panel of how each is doing); a ☆ on their screens toggles it.
(function () {
  const FM = window.FM,
    UI = FM.UI,
    U = FM.U,
    W = FM.W,
    C = UI.C;
  const S = () => FM.S;
  const esc = U.esc;
  const KINDS = { club: 'clubs', player: 'players', comp: 'comps', nation: 'nations' };

  UI.follows = () => FM.News.follows();
  UI.isFollowing = (kind, id) => UI.follows()[KINDS[kind]].includes(id);
  UI.followBtn = (kind, id, small) => {
    if (!S().user) return '';
    const on = UI.isFollowing(kind, id);
    return `<button class="btn sm ${on ? 'pri' : ''}" ${small ? 'style="padding:4px 10px"' : ''} data-act="follow" data-k="${kind}" data-id="${esc(id)}">${on ? '★ Following' : '☆ Follow'}</button>`;
  };
  UI.acts.follow = (d, el) => {
    const f = UI.follows(),
      list = f[KINDS[d.k]],
      on = list.includes(d.id);
    f[KINDS[d.k]] = on ? list.filter((x) => x !== d.id) : list.concat(d.id);
    UI.save();
    if (el) {
      el.classList.toggle('pri', !on);
      el.textContent = on ? '☆ Follow' : '★ Following';
    }
    UI.toast(on ? 'No longer following' : 'Following: their news comes into your feed');
  };

  // How each followed club, player, competition and nation is doing, above their news
  UI.followingPanel = function () {
    const s = S(),
      f = UI.follows(),
      rows = [];
    for (const id of f.clubs) {
      const c = s.clubs[id];
      if (!c) continue;
      const comp = c.comp && s.comps[c.comp],
        pos = comp && comp.table && comp.table[id] ? W.position(id) : null;
      rows.push(
        `<div class="row small tap" data-act="clubView" data-id="${id}" style="padding:7px 0;border-top:1px solid var(--line);gap:8px">${C.crest(c, 20)}<span class="grow ellip">${esc(c.name)}</span><span class="dim">${pos ? `${U.ordinal(pos)} · ${comp.table[id].pts} pts` : comp ? esc(comp.name) : ''}</span><span class="tiny dim" style="margin-left:6px">${esc(FM.Season.confLabel(c))}</span></div>`,
      );
    }
    for (const id of f.players) {
      const p = s.players[id];
      if (!p) continue;
      const c = p.clubId && s.clubs[p.clubId];
      const st = p.season;
      rows.push(
        `<div class="row small tap" data-act="player" data-id="${id}" style="padding:7px 0;border-top:1px solid var(--line);gap:8px">${C.pos(p)}<span class="grow ellip">${esc(W.name(p))} <span class="tiny dim">${c ? esc(c.short) : p.retired ? 'retired' : 'free agent'}</span></span><span class="dim">${p.pos === 'GK' ? `${st.apps} apps · ${st.cs || 0} CS` : `${st.apps} apps · ${st.goals}⚽ ${st.ast}🅰️`}</span></div>`,
      );
    }
    for (const id of f.comps) {
      const comp = s.comps[id];
      if (!comp) continue;
      const top = comp.table && Object.entries(comp.table).sort((a, b) => b[1].pts - a[1].pts)[0];
      rows.push(
        `<div class="row small tap" data-act="leagueGo" data-id="${id}" style="padding:7px 0;border-top:1px solid var(--line);gap:8px"><span>🏆</span><span class="grow ellip">${esc(comp.name)}</span><span class="dim">${top && s.clubs[top[0]] ? `${esc(s.clubs[top[0]].short)} lead · ${top[1].pts} pts` : ''}</span></div>`,
      );
    }
    for (const id of f.nations) {
      const t = s.nteams && s.nteams[id];
      if (!t) continue;
      rows.push(
        `<div class="row small tap" data-act="nation" data-id="${id}" style="padding:7px 0;border-top:1px solid var(--line);gap:8px"><span>${C.flag(t.code)}</span><span class="grow ellip">${esc(t.name)}</span><span class="dim">World #${FM.Intl.ranked().indexOf(t) + 1}</span></div>`,
      );
    }
    return rows.length
      ? `<div class="card flat" style="padding:4px 12px;margin-bottom:10px">${rows.join('')}</div>`
      : '<div class="empty">You aren\'t following anyone yet. Tap ☆ Follow on a club, player, league or nation.</div>';
  };
  UI.acts.leagueGo = (d) => {
    UI.sub.league = d.id;
    UI.go('league');
  };
})();
