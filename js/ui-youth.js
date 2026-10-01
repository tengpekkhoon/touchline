// The Academy tab's youth sides and B team: U21 and U18 squads with their league positions, the B team (when the
// club has one) and moving players between them and the first team.
(function () {
  const FM = window.FM,
    UI = FM.UI,
    U = FM.U,
    W = FM.W,
    C = UI.C,
    Y = FM.Youth;
  const S = () => FM.S;
  const esc = U.esc;

  const btn = (id, to, label) =>
    `<button class="btn sm" style="padding:4px 8px" data-act="youthMove" data-id="${id}" data-v="${to}">${label}</button>`;
  const leagueLine = (c, team) => {
    const t = Y.table(c.nat, team),
      i = t.findIndex((r) => r.id === c.id),
      lg = S().youth && S().youth[c.nat] && S().youth[c.nat][team],
      last = lg && lg.last[c.id],
      opp = last && S().clubs[last.opp];
    return i < 0
      ? '<span class="tiny dim">Youth league starts with the season</span>'
      : `<span class="tiny dim">${U.ordinal(i + 1)} of ${t.length} · ${t[i].pts} pts${last && opp ? ` · last: ${last.gf}–${last.ga} ${last.home ? 'v' : 'at'} ${esc(opp.short)}` : ''}</span>`;
  };
  UI.youthSides = function (c) {
    const out = [];
    for (const [team, def] of Object.entries(Y.TEAMS)) {
      const sq = Y.squadOf(c.id, team).sort((a, b) => b.pa - a.pa);
      out.push(`<div class="sec"><div class="h3">${def.label}</div>${leagueLine(c, team)}</div>
        <div class="card flat list" style="padding:4px 12px">${
          sq
            .map((p) =>
              C.playerRow(
                p,
                p.season.yapps ? ` · ${p.season.yapps} youth games` : '',
                `<div class="row" style="gap:4px;margin-top:4px">${btn(p.id, 'first', '↑ First team')}${btn(p.id, team === 'u21' ? 'u18' : 'u21', team === 'u21' ? '↓ U18' : '↑ U21')}</div>`,
              ),
            )
            .join('') || `<div class="empty">Nobody in the ${def.label} squad.</div>`
        }</div>`);
    }
    // young first-team players who could get games in the youth sides
    const young = W.squad(c.id).filter((p) => !p.team && !p.loan && W.age(p) <= 21);
    if (young.length)
      out.push(`<div class="sec"><div class="h3">Young players in the first-team squad</div></div>
        <div class="card flat list" style="padding:4px 12px">${young
          .map((p) =>
            C.playerRow(
              p,
              ` · ${p.season.apps} apps`,
              `<div class="row" style="gap:4px;margin-top:4px">${btn(p.id, W.age(p) <= 18 ? 'u18' : 'u21', W.age(p) <= 18 ? '↓ U18' : '↓ U21')}</div>`,
            ),
          )
          .join('')}</div>`);
    // the B team
    const b = Y.bTeamOf(c.id);
    if (b) {
      const comp = S().comps[b.comp],
        pos = comp && comp.table && comp.table[b.id] ? W.position(b.id) : null;
      const bs = W.squad(b.id)
        .filter((p) => !p.loan)
        .sort((a, x) => x.ca - a.ca);
      out.push(`<div class="sec"><div class="h3">B team · ${esc(b.name)}</div><span class="tiny dim">${comp ? `${esc(comp.name)}${pos ? ` · ${U.ordinal(pos)}` : ''}` : ''}</span></div>
        <div class="tiny dim" style="margin:-4px 2px 6px">Your players, on your wages: move them between the two any time. A B team can never go up into your division.</div>
        <div class="card flat list" style="padding:4px 12px">${bs
          .map((p) =>
            C.playerRow(
              p,
              ` · ${p.season.apps} apps`,
              `<div class="row" style="gap:4px;margin-top:4px">${btn(p.id, 'up', '↑ First team')}</div>`,
            ),
          )
          .join('')}</div>`);
      const spare = W.squad(c.id).filter((p) => !p.loan && !p.team && W.age(p) <= 23);
      if (spare.length)
        out.push(
          `<div class="tiny dim" style="margin:6px 2px">Send down to ${esc(b.short)}: ${spare
            .slice(0, 12)
            .map(
              (p) =>
                `<button class="chip" data-act="youthMove" data-id="${p.id}" data-v="b">${esc(W.short(p))}</button>`,
            )
            .join(' ')}</div>`,
        );
    }
    return out.join('');
  };
  UI.acts.youthMove = (d) => {
    const s = S(),
      p = s.players[d.id],
      c = W.userClub();
    if (!p || !c) return;
    if (d.v === 'b') {
      const b = Y.bTeamOf(c.id);
      if (b) Y.move(p, b.id);
    } else if (d.v === 'up') Y.move(p, c.id);
    else {
      p.team = d.v === 'first' ? undefined : d.v;
      if (s.user.tactic.lineup && p.team)
        s.user.tactic.lineup = s.user.tactic.lineup.map((x) => (x === p.id ? null : x));
    }
    p.teamSet = true;
    UI.save();
    UI.render();
  };
})();
