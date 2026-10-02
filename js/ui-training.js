// Squad → Training (team focus, intensity, individual training) and Squad → Analytics (your season in numbers:
// xG, chance types, goal times, the league comparison and the analyst's reading of it).
(function () {
  const FM = window.FM,
    UI = FM.UI,
    U = FM.U,
    W = FM.W,
    C = UI.C,
    Tr = FM.Training,
    An = FM.Analytics;
  const S = () => FM.S;
  const esc = U.esc;
  const pct = (k) => `${k >= 1 ? '+' : '−'}${Math.abs(Math.round((k - 1) * 100))}%`;
  const LEARNABLE = ['CB', 'FB', 'WB', 'DM', 'CM', 'WM', 'AM', 'W', 'ST'];

  // ---------- Training ----------
  const indLabel = (v) =>
    !v ? 'Team focus' : v.startsWith('pos:') ? `Learning ${v.slice(4)}` : `${Tr.IND[v].icon} ${Tr.IND[v].label}`;
  UI.trainingView = function () {
    const c = W.userClub();
    if (!c) return '<div class="empty">Take a job to run training.</div>';
    const t = Tr.get(),
      f = Tr.FOCUS[t.focus],
      i = Tr.INTENSITY[t.intensity];
    const dev = (f.dev || 1) * i.dev,
      inj = (f.inj || 1) * i.inj,
      rec = (f.rec || 0) + i.rec;
    const focus = Object.entries(Tr.FOCUS)
      .map(
        ([k, x]) =>
          `<button class="chip ${t.focus === k ? 'on' : ''}" data-act="trFocus" data-v="${k}">${x.icon} ${x.label}</button>`,
      )
      .join(' ');
    const intensity = `<div class="seg" style="margin-top:6px">${Object.entries(Tr.INTENSITY)
      .map(
        ([k, x]) =>
          `<button class="${t.intensity === k ? 'on' : ''}" data-act="trIntensity" data-v="${k}">${x.label}</button>`,
      )
      .join('')}</div>`;
    const eff = [
      ['Development', pct(dev), dev >= 1],
      ['Training injuries', pct(inj), inj <= 1],
      ['Recovery', `${rec >= 0 ? '+' : '−'}${Math.abs(rec)} a day`, rec >= 0],
    ];
    if (f.fam) eff.push(['Tactical familiarity', pct(f.fam), true]);
    if (f.sp) eff.push(['Set-piece chances', pct(f.sp), true]);
    const effects = eff
      .map(
        ([l, v, good]) =>
          `<div class="row small" style="padding:4px 0"><span class="grow dim">${l}</span><b style="color:${v.startsWith('+0') || v.startsWith('−0') ? 'var(--ink2)' : good ? 'var(--good)' : 'var(--bad)'}">${v}</b></div>`,
      )
      .join('');
    const sq = W.squad(c.id)
      .filter((p) => !p.loan)
      .sort((a, b) => FM.D.POS.indexOf(a.pos) - FM.D.POS.indexOf(b.pos) || b.ca - a.ca);
    const ind = sq
      .map((p) =>
        C.playerRow(
          p,
          '',
          `<button class="btn sm" style="padding:4px 8px;white-space:nowrap" data-act="trInd" data-id="${p.id}">${esc(indLabel(t.ind[p.id]))}</button>`,
        ),
      )
      .join('');
    return `<div class="card"><div class="h3">Team focus</div><div class="tiny dim" style="margin:2px 0 8px">${esc(f.desc)}</div>${focus}
        <div class="h3" style="margin-top:14px">Intensity</div><div class="tiny dim" style="margin-top:2px">${esc(i.desc)}</div>${intensity}</div>
      <div class="card"><div class="h3">This week's effect</div><div class="tiny dim" style="margin:2px 0 4px">On your players, against a normal, balanced week. Your coaches (${esc(FM.Staff.impact('coach').text)}) and physio add to it.</div>${effects}</div>
      <div class="sec"><div class="h3">Individual training</div><span class="tiny dim">Tap to change</span></div>
      <div class="tiny dim" style="margin:-4px 2px 6px">An individual focus counts on top of the team's. Learning a new position teaches it a little every week, as playing there does.</div>
      <div class="card flat list" style="padding:4px 12px">${ind}</div>`;
  };
  UI.acts.trFocus = (d) => {
    Tr.get().focus = d.v;
    UI.save();
    UI.render();
  };
  UI.acts.trIntensity = (d) => {
    Tr.get().intensity = d.v;
    UI.save();
    UI.render();
  };
  UI.acts.trInd = (d) => {
    const p = S().players[d.id];
    if (!p) return;
    const cur = Tr.get().ind[p.id];
    const opt = (v, label, sub) =>
      `<button class="btn block ${cur === v || (!cur && !v) ? 'pri' : ''}" style="margin-bottom:6px;text-align:left" data-act="trSetInd" data-id="${p.id}" data-v="${v || ''}">${label}${sub ? `<div class="tiny" style="opacity:.75">${sub}</div>` : ''}</button>`;
    const groups = Object.entries(Tr.IND)
      .filter(([k]) => (k === 'keeping') === (p.pos === 'GK'))
      .map(([k, x]) =>
        opt(
          k,
          `${x.icon} ${x.label}`,
          Object.keys(x.attrs)
            .map((a) => FM.D.ATTR_LABEL[a])
            .join(', '),
        ),
      )
      .join('');
    const pos =
      p.pos === 'GK'
        ? ''
        : `<div class="h3" style="margin:12px 0 6px">Learn a position</div>${LEARNABLE.filter((t) => t !== p.pos)
            .map((t) => {
              const f = W.fitAt(p, t);
              return f >= FM.Season.LEARN.max ? '' : opt(`pos:${t}`, `${t} · now ${Math.round(f * 100)}%`, '');
            })
            .join('')}`;
    UI.sheet(`${opt('', 'Team focus only', 'No individual work')}${groups}${pos}`, {
      title: `${esc(W.name(p))} · training`,
    });
  };
  UI.acts.trSetInd = (d) => {
    const t = Tr.get();
    if (d.v) t.ind[d.id] = d.v;
    else delete t.ind[d.id];
    UI.closeSheet();
    UI.save();
    UI.render();
  };

  // ---------- Analytics ----------
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const TYPE_NAME = {
    through: 'Through balls',
    cross: 'Crosses',
    cutback: 'Cutbacks',
    longshot: 'Long shots',
    counter: 'Counters',
    setpiece: 'Set pieces',
    penalty: 'Penalties',
  };
  UI._an = { season: 'this' };
  // xG for and against each match: paired bars, goals as dots
  const matchChart = (log) => {
    const L = log.slice(-24),
      w = 340,
      h = 130,
      pad = 20,
      bw = (w - pad - 6) / Math.max(L.length, 8);
    const max = Math.max(2, ...L.map((r) => Math.max(r.xf, r.xa, r.gf, r.ga))) * 1.08;
    const y = (v) => h - pad - (v / max) * (h - pad - 8);
    const bars = L.map((r, i) => {
      const x = pad + i * bw;
      return `<rect x="${x + 1}" y="${y(r.xf)}" width="${bw / 2 - 1.5}" height="${h - pad - y(r.xf)}" fill="var(--acc)" rx="1.5"/>
        <rect x="${x + bw / 2}" y="${y(r.xa)}" width="${bw / 2 - 1.5}" height="${h - pad - y(r.xa)}" fill="var(--bad)" opacity=".75" rx="1.5"/>
        <circle cx="${x + bw / 4}" cy="${y(r.gf)}" r="2.6" fill="var(--ink)"/><circle cx="${x + (3 * bw) / 4}" cy="${y(r.ga)}" r="2.6" fill="var(--ink)" opacity=".55"/>`;
    }).join('');
    const grid = [1, 2, 3, 4]
      .filter((v) => v < max)
      .map(
        (v) =>
          `<line x1="${pad}" x2="${w - 4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="4" y="${y(v) + 3}" font-size="9" fill="var(--ink3)">${v}</text>`,
      )
      .join('');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;margin-top:6px">${grid}${bars}</svg>
      <div class="row tiny" style="gap:12px;justify-content:center"><span style="color:var(--acc)">■ xG for</span><span style="color:var(--bad)">■ xG against</span><span class="dim">● goals</span></div>`;
  };
  // A line comparing yours with the league average (a bar each)
  const vs = (label, mine, avg, better, fmt = f2) => {
    const max = Math.max(mine, avg, 0.01) * 1.1,
      good = better === 'high' ? mine >= avg : mine <= avg;
    return `<div style="margin:8px 0"><div class="row small"><span class="grow">${label}</span><b style="color:${good ? 'var(--good)' : 'var(--bad)'}">${fmt(mine)}</b><span class="tiny dim" style="margin-left:6px">league ${fmt(avg)}</span></div>
      <div style="position:relative;height:6px;background:var(--line);border-radius:3px;margin-top:4px"><div style="width:${(mine / max) * 100}%;height:100%;background:${good ? 'var(--good)' : 'var(--bad)'};border-radius:3px"></div><div style="position:absolute;left:${(avg / max) * 100}%;top:-3px;width:2px;height:12px;background:var(--ink2)"></div></div></div>`;
  };
  // What the analyst reads into it: the better he is, the more he spots
  const insights = (log, lg, rank) => {
    const out = [],
      n = log.length,
      gf = sum(log, (r) => r.gf),
      ga = sum(log, (r) => r.ga),
      xf = sum(log, (r) => r.xf),
      xa = sum(log, (r) => r.xa);
    const fin = gf - xf,
      kp = xa - ga;
    if (Math.abs(fin) >= Math.max(2, n * 0.15))
      out.push(
        fin > 0
          ? `We've scored ${fin.toFixed(1)} more than our chances were worth. Good finishing, but it rarely lasts: expect it to even out.`
          : `We've scored ${(-fin).toFixed(1)} fewer than our chances were worth. The chances are there; the finishing will come, or a sharper striker would.`,
      );
    if (Math.abs(kp) >= Math.max(2, n * 0.15))
      out.push(
        kp > 0
          ? `We've let in ${kp.toFixed(1)} fewer than the chances against us deserved. The keeper is earning his wages; don't count on it.`
          : `We've conceded ${(-kp).toFixed(1)} more than the chances against us deserved. Bad luck, or the goalkeeper — worth a look.`,
      );
    const agg = (k) => {
      const t = {};
      for (const r of log)
        for (const [ty, v] of Object.entries(r.types[k] || {})) {
          const x = (t[ty] = t[ty] || [0, 0, 0]);
          x[0] += v[0];
          x[1] += v[1];
          x[2] += v[2];
        }
      return Object.entries(t).sort((a, b) => b[1][2] - a[1][2]);
    };
    const fa = agg(0),
      ag = agg(1);
    if (fa.length && n >= 4)
      out.push(
        `Most of our danger comes from ${TYPE_NAME[fa[0][0]].toLowerCase()} (${f2(fa[0][1][2])} xG). ${fa.length > 1 ? `${TYPE_NAME[fa[fa.length - 1][0]]} give us the least.` : ''}`,
      );
    if (ag.length && n >= 4)
      out.push(
        `We concede our best chances from ${TYPE_NAME[ag[0][0]].toLowerCase()} (${f2(ag[0][1][2])} xG against). That's where to work on the shape.`,
      );
    const late = log.flatMap((r) => r.gm).filter(([us, m]) => !us && m >= 76).length,
      allA = log.flatMap((r) => r.gm).filter(([us]) => !us).length;
    if (allA >= 6 && late / allA >= 0.3)
      out.push(
        `${late} of the ${allA} goals we've let in came in the last quarter of an hour. Fitness or concentration — fresher legs off the bench would help.`,
      );
    if (rank && lg)
      out.push(
        `Our chances created rank ${U.ordinal(rank.f)} in the league and chances allowed ${U.ordinal(rank.a)}. ${rank.f + rank.a <= 8 ? 'The numbers back a top side.' : rank.f + rank.a >= rank.n * 1.4 ? 'The numbers say we are fighting at the wrong end.' : 'Mid-table numbers so far.'}`,
      );
    return out;
  };
  UI.analyticsView = function () {
    const c = W.userClub(),
      u = S().user;
    if (!c) return '<div class="empty">Take a job to see your analytics.</div>';
    const prev = UI._an.season === 'last',
      log = ((prev ? u.logPrev : u.log) || []).filter((r) => !prev || r.y < S().year);
    const tabs = `<div class="chips">${[
      ['this', 'This season'],
      ['last', 'Last season'],
    ]
      .map(
        ([v, l]) =>
          `<button class="chip ${UI._an.season === v ? 'on' : ''}" data-act="anSeason" data-v="${v}">${l}</button>`,
      )
      .join('')}</div>`;
    if (!log.length)
      return `${tabs}<div class="empty">No competitive matches ${prev ? 'last season' : 'yet this season'}. Your analyst logs every one: xG, chance types, when the goals come.</div>`;
    const n = log.length,
      w = log.filter((r) => r.gf > r.ga).length,
      dr = log.filter((r) => r.gf === r.ga).length,
      gf = sum(log, (r) => r.gf),
      ga = sum(log, (r) => r.ga),
      xf = sum(log, (r) => r.xf),
      xa = sum(log, (r) => r.xa);
    const lgLog = log.filter((r) => r.comp === c.comp);
    const lg = !prev && An.leagueAvg(c.comp);
    let rank = null;
    if (lg) {
      const cl = An.leagueClubs(c.comp),
        me = cl.find((r) => r.id === c.id);
      if (me)
        rank = {
          f: cl.filter((r) => r.xf > me.xf).length + 1,
          a: cl.filter((r) => r.xa < me.xa).length + 1,
          n: cl.length,
        };
    }
    const lgN = Math.max(1, lgLog.length);
    const comp = lg
      ? `<div class="card"><div class="h3">Against the league</div><div class="tiny dim">League matches · per game · the mark is the league average${rank ? ` · xG for ${U.ordinal(rank.f)}, xG against ${U.ordinal(rank.a)} of ${rank.n}` : ''}</div>
        ${vs('xG for', sum(lgLog, (r) => r.xf) / lgN, lg.xg, 'high')}
        ${vs('xG against', sum(lgLog, (r) => r.xa) / lgN, lg.xg, 'low')}
        ${vs('Shots', sum(lgLog, (r) => r.sh[0]) / lgN, lg.sh, 'high', (v) => v.toFixed(1))}
        ${vs('Shots faced', sum(lgLog, (r) => r.sh[1]) / lgN, lg.sh, 'low', (v) => v.toFixed(1))}
        ${vs('On target', sum(lgLog, (r) => r.sot[0]) / lgN, lg.sot, 'high', (v) => v.toFixed(1))}
        ${vs('Possession %', sum(lgLog, (r) => r.poss) / lgN, 50, 'high', (v) => v.toFixed(0))}</div>`
      : '';
    // chance types, for and against
    const types = [0, 1].map((k) => {
      const t = {};
      for (const r of log)
        for (const [ty, v] of Object.entries(r.types[k] || {})) {
          const x = (t[ty] = t[ty] || [0, 0, 0]);
          x[0] += v[0];
          x[1] += v[1];
          x[2] += v[2];
        }
      return t;
    });
    const typeRows = An.TYPES.filter((ty) => types[0][ty] || types[1][ty])
      .map((ty) => {
        const a = types[0][ty] || [0, 0, 0],
          b = types[1][ty] || [0, 0, 0];
        return `<tr><td class="l">${TYPE_NAME[ty]}</td><td>${a[0]}</td><td>${a[1]}</td><td>${f2(a[2])}</td><td class="dim">${b[0]}</td><td class="dim">${b[1]}</td><td class="dim">${f2(b[2])}</td></tr>`;
      })
      .join('');
    // goals by quarter of an hour
    const bands = [0, 15, 30, 45, 60, 75].map((lo, i) => {
      const hi = i === 5 ? 200 : lo + 15,
        g = log.flatMap((r) => r.gm).filter(([, m]) => m > lo && m <= hi);
      return [`${lo}–${i === 5 ? '90+' : hi}`, g.filter(([us]) => us).length, g.filter(([us]) => !us).length];
    });
    const bmax = Math.max(1, ...bands.map((b) => Math.max(b[1], b[2])));
    const bandRows = bands
      .map(
        ([l, a, b]) =>
          `<div class="row tiny" style="gap:6px;margin:3px 0"><span style="width:44px" class="dim">${l}</span><div class="grow" style="display:flex;justify-content:flex-end"><div style="width:${(a / bmax) * 100}%;height:8px;background:var(--acc);border-radius:2px"></div></div><b style="width:18px;text-align:center">${a}</b><b style="width:18px;text-align:center" class="dim">${b}</b><div class="grow"><div style="width:${(b / bmax) * 100}%;height:8px;background:var(--bad);opacity:.75;border-radius:2px"></div></div></div>`,
      )
      .join('');
    const an = W.staffAbility('analyst'),
      notes = insights(log, lg, rank).slice(0, an >= 15 ? 6 : an >= 11 ? 4 : an >= 7 ? 3 : 2);
    return `${tabs}
      <div class="card"><div class="row" style="text-align:center">${[
        [`${w}-${dr}-${n - w - dr}`, `${n} matches`],
        [`${gf}–${ga}`, 'goals'],
        [`${f2(xf)}–${f2(xa)}`, 'xG'],
        [`${(gf - xf >= 0 ? '+' : '') + (gf - xf).toFixed(1)}`, 'goals vs xG'],
      ]
        .map(([v, l]) => `<div class="grow"><div class="h3">${v}</div><div class="tiny dim">${l}</div></div>`)
        .join('')}</div></div>
      <div class="card"><div class="h3">Match by match</div><div class="tiny dim">The last ${Math.min(24, n)} competitive matches</div>${matchChart(log)}</div>
      <div class="card"><div class="h3">The analyst's view</div><div class="tiny dim" style="margin-bottom:4px">${esc(FM.Staff.get('analyst').fn)} ${esc(FM.Staff.get('analyst').ln)} · ability ${an}/20 — a better analyst spots more</div>${notes.map((t) => `<div class="small note" style="padding:7px 0;border-top:1px solid var(--line)">📊 ${esc(t)}</div>`).join('') || '<div class="small dim">Too early to say much.</div>'}</div>
      ${comp}
      <div class="card"><div class="h3">Where the chances come from</div><table class="t" style="margin-top:6px"><tr><th class="l"></th><th>Shots</th><th>Goals</th><th>xG</th><th>Faced</th><th>Conc.</th><th>xGA</th></tr>${typeRows}</table></div>
      <div class="card"><div class="h3">When the goals come</div><div class="row tiny dim" style="margin:4px 0"><span class="grow" style="text-align:right">Scored</span><span style="width:52px"></span><span class="grow">Conceded</span></div>${bandRows}</div>`;
  };
  UI.acts.anSeason = (d) => {
    UI._an.season = d.v;
    UI.render();
  };
  // ---------- Promises ----------
  // Every promise you have made a player: what, how it is going and how long is left; then the ones settled
  UI.promisesView = function () {
    const Pe = FM.People,
      s = S(),
      all = (s.user.promises || []).slice().reverse();
    const open = all.filter((x) => x.state === 'open' && s.players[x.pid]);
    const done = all
      .filter((x) => (x.state === 'kept' || x.state === 'broken') && s.players[x.pid] && x.year >= s.year - 1)
      .slice(0, 20);
    const progress = (x, p) => {
      if (x.type === 'minutes') return `${p.season.apps - x.base} of ${x.target - x.base} appearances`;
      if (x.type === 'debut') return p.career.apps ? 'Debut made' : 'No debut yet';
      if (x.type === 'contract') return p.contract > x.contract ? 'Renewed' : 'Not renewed yet';
      if (x.type === 'status') return `${p.season.apps} appearances so far`;
      return '';
    };
    const left = (x) => {
      if (x.days >= 99) return x.type === 'noSell' ? 'Until the window shuts' : 'This season';
      const d = x.due - s.day;
      return d <= 0 ? 'Due now' : `${d} day${d === 1 ? '' : 's'} left`;
    };
    const row = (x, settled) => {
      const p = s.players[x.pid],
        def = Pe.PROMISE[x.type];
      return `<div class="row small" style="padding:9px 0;border-top:1px solid var(--line);align-items:flex-start">${C.pos(p)}<div class="grow"><div class="b">${C.pname(p, W.name(p))}</div><div class="tiny dim">${esc(def.label)} · ${esc(def.desc(x))}</div>${settled ? '' : `<div class="tiny" style="margin-top:2px">${esc(progress(x, p))}</div>`}</div><span class="tiny ${settled ? (x.state === 'kept' ? 'pill good' : 'pill bad') : 'dim'}" style="white-space:nowrap">${settled ? (x.state === 'kept' ? 'Kept' : 'Broken') : esc(left(x))}</span></div>`;
    };
    return `<div class="card"><div class="h3">Open promises</div><div class="tiny dim" style="margin:2px 0 4px">Kept, they lift morale and the squad's trust in your word; broken, they cost both.</div>${open.length ? open.map((x) => row(x, false)).join('') : '<div class="small dim" style="padding:8px 0">No promises open. You make them in player talks and meetings.</div>'}</div>
      ${done.length ? `<div class="card"><div class="h3">Settled</div>${done.map((x) => row(x, true)).join('')}</div>` : ''}`;
  };
})();
