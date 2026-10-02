// Developer tools: interactive checks on a running game, for the developer only. This file is left out of the public and
// store builds (tools/build.mjs), so a player never sees it; from the source folder it adds a Developer tools button to
// Settings. Everything that plays the game runs on a copy of your save and puts the real one back afterwards.
(function () {
  const FM = window.FM,
    UI = FM.UI,
    U = FM.U,
    W = FM.W,
    D = FM.D;
  const S = () => FM.S;
  const esc = U.esc;
  const Dev = (FM.Dev = {});

  // ---------- Checks on a world ----------
  // Each check is [what, passes?]. A few of the headless suite's invariants, run on the world you are playing.
  Dev.invariants = function (s = S()) {
    const out = [],
      chk = (what, ok) => out.push([what, !!ok]);
    const clubs = Object.values(s.clubs),
      players = Object.values(s.players).filter((p) => !p.retired);
    chk(
      'every player is at a club that exists',
      players.every((p) => !p.clubId || s.clubs[p.clubId]),
    );
    chk(
      'every position is a known one, every ability a number',
      players.every((p) => D.POS.includes(p.pos) && Number.isFinite(p.ca) && Number.isFinite(p.pa)),
    );
    chk(
      'second positions are real and different from his own',
      players.every((p) => Object.keys(p.alt || {}).every((t) => D.POS.includes(t) && t !== p.pos)),
    );
    const playing = clubs.filter((c) => c.sim === 'full' || c.sim === 'light');
    chk(
      'every full and light club has a keeper',
      playing.every((c) => W.squad(c.id).some((p) => p.pos === 'GK')),
    );
    chk(
      'every full club can field an eleven',
      playing.filter((c) => c.sim === 'full').every((c) => W.pickXI(c.id, c.tactic).xi.every(Boolean)),
    );
    chk(
      'every tactic has roles that exist for its slots',
      playing.every((c) => {
        const sl = D.FORMATIONS[c.tactic.formation];
        return c.tactic.roles.every((r, i) => D.ROLES[sl[i].t][r]);
      }),
    );
    chk(
      'every league has the clubs its table has',
      W.leagues().every(
        (l) => Object.keys(l.table).length === l.clubs.length && new Set(l.clubs).size === l.clubs.length,
      ),
    );
    chk(
      'league tables are in points order',
      W.leagues().every((l) => W.sortedTable(l).every((r, i, a) => !i || a[i - 1].pts >= r.pts)),
    );
    chk(
      'no club is in two continental cups',
      (() => {
        const seen = new Set();
        for (const c of W.continentals())
          for (const id of c.clubs || [])
            if (seen.has(id)) return false;
            else seen.add(id);
        return true;
      })(),
    );
    chk(
      'no player has a pre-contract with a club that is gone',
      players.every((p) => !p.pre || s.clubs[p.pre.c]),
    );
    chk('the calendar and the day agree', s.calendar && s.day >= 0 && s.day <= s.calendar.length);
    chk(
      'national teams have a coefficient',
      Object.values(s.nteams || {}).every((t) => Number.isFinite(t.coef)),
    );
    chk(
      'history rows are for real seasons and clubs',
      players.every((p) => (p.history || []).every((h) => h.y && h.apps > 0 && (h.c == null || s.clubs[h.c]))),
    );
    return out;
  };
  // The market so far this season, from the transfer log: how many, how much, and the shares that matter
  Dev.market = function (s = S()) {
    const log = (s.seasonLog && s.seasonLog.transfers) || [],
      moves = log.filter((t) => !t.loan);
    const pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : '—');
    return [
      ['transfers (not loans)', moves.length],
      ['loans', log.length - moves.length],
      ['free', pct(moves.filter((t) => !t.fee).length, moves.length)],
      ['across a border', pct(moves.filter((t) => t.intl).length, moves.length)],
      ['biggest fee', U.money(Math.max(0, ...moves.map((t) => t.fee)))],
      ['elite moves (ability 82+)', moves.filter((t) => s.players[t.pid] && s.players[t.pid].ca >= 82).length],
    ];
  };
  Dev.wonderkids = function (s = S()) {
    const kids = Object.values(s.players)
      .filter((p) => !p.retired && W.age(p) <= 19 && p.pa >= 80)
      .sort((a, b) => b.pa - a.pa);
    return { n: kids.length, top: kids.slice(0, 12) };
  };

  // ---------- Runs on a copy of the save ----------
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const copyOf = () => FM.Save.relink(JSON.parse(JSON.stringify(S())));
  // fn(copy) runs with the copy as the world; the real save goes back whatever happens
  Dev.onCopy = async function (fn) {
    const real = S(),
      busy = UI.simBusy;
    UI.simBusy = true; // nothing saves the copy over your career
    try {
      FM.S = copyOf();
      W.rosterVer++;
      return await fn(FM.S);
    } finally {
      FM.S = real;
      W.rosterVer++;
      UI.simBusy = busy;
    }
  };
  const play = (s) => {
    const Sea = FM.Season;
    const fx = Sea.userFixture();
    if (fx) Sea.applyUserMatch(FM.quickSim(fx, !!fx.ko));
    return Sea.advance(null);
  };
  Dev.speed = (days = 5) =>
    Dev.onCopy(async (s) => {
      const t = [];
      for (let i = 0; i < days && s.day < s.calendar.length - 1; i++) {
        const t0 = performance.now();
        play(s);
        t.push(performance.now() - t0);
        await tick();
      }
      return { days: t.length, avg: U.avg(t), worst: Math.max(...t) };
    });
  Dev.season = (progress) =>
    Dev.onCopy(async (s) => {
      const t0 = performance.now(),
        e0 = { ...(s.eraLog || { g: 0, n: 0 }) },
        total = s.calendar.length - s.day;
      let summary = null,
        mk = null,
        i = 0;
      while (!summary) {
        summary = play(s);
        if (!summary) mk = Dev.market(s); // (the log starts again with the new season)
        progress && progress(++i, total);
        await tick();
      }
      const e = s.eraLog || e0;
      return {
        secs: (performance.now() - t0) / 1000,
        days: i,
        goals: e.n - e0.n ? ((e.g - e0.g) / (e.n - e0.n)).toFixed(2) : '—',
        market: mk || Dev.market(s),
        checks: Dev.invariants(FM.S),
      };
    });

  // ---------- UI smoke test ----------
  // Opens every tab, every sub-tab on it and a sample of sheets (players of each kind, clubs, settings), and reports what
  // threw or showed a broken value ("undefined", "NaN", "[object Object]"). Runs on a copy of the save.
  const BROKEN = /\bundefined\b|\bNaN\b|\[object |\bInfinity\b/;
  const lastSheet = () => [...document.querySelectorAll('.sheet-wrap')].pop() || document.body;
  Dev.smoke = () =>
    Dev.onCopy(async (s) => {
      const problems = [];
      let opened = 0;
      const look = (what, el) => {
        opened++;
        const t = el ? el.innerText || '' : '';
        if (!t.trim()) return problems.push(`${what}: nothing on screen`);
        const m = what === 'sheet whatsNew' ? null : t.match(BROKEN); // (the changelog talks about bugs)
        if (m) {
          const at = t.indexOf(m[0]);
          problems.push(`${what}: shows "${m[0]}" (…${t.slice(Math.max(0, at - 30), at + 20).replace(/\s+/g, ' ')}…)`);
        }
      };
      const attempt = (what, fn) => {
        try {
          fn();
        } catch (e) {
          opened++;
          problems.push(`${what}: ${e && e.message}`);
        }
      };
      const main = () => document.getElementById('main');
      for (const tab of Object.keys(UI.screens)) {
        attempt(`tab ${tab}`, () => {
          UI.go(tab);
          look(`tab ${tab}`, main());
        });
        const subs = [...document.querySelectorAll('#main [data-act="sub"]')].map((b) => [b.dataset.k, b.dataset.v]);
        for (const [k, v] of subs) {
          attempt(`${tab} › ${k}=${v}`, () => {
            UI.acts.sub({ k, v });
            look(`${tab} › ${k}=${v}`, main());
          });
          await tick();
        }
      }
      // sheets: your players of each kind, someone else's, a club of each size, and the standard sheets
      const mine = W.squad(W.userClub().id),
        others = Object.values(s.players).filter((p) => !p.retired && p.clubId && !W.ownPlayer(p));
      const sample = [
        mine.find((p) => p.pos === 'GK'),
        mine.find((p) => p.pos !== 'GK'),
        mine.find((p) => p.team),
        mine.find((p) => p.inj),
        others.find((p) => p.pos === 'GK'),
        others[0],
        others[others.length >> 1],
        others.find((p) => W.age(p) <= 18),
        others.find((p) => W.age(p) >= 35),
        Object.values(s.players).find((p) => !p.clubId && !p.retired),
      ].filter(Boolean);
      for (const p of sample) {
        attempt(`player ${p.id}`, () => {
          UI.playerSheet(p.id);
          look(`player ${W.name(p)} (${p.pos})`, lastSheet());
          UI.closeAllSheets();
        });
        await tick();
      }
      const clubs = Object.values(s.clubs).sort((a, b) => b.rep - a.rep);
      for (const c of [clubs[0], clubs[clubs.length >> 1], clubs[clubs.length - 1], W.userClub()]) {
        attempt(`club ${c.name}`, () => {
          UI.clubSheet(c.id);
          look(`club ${c.name}`, lastSheet());
          UI.closeAllSheets();
        });
        await tick();
      }
      for (const act of ['whatsNew', 'reportProblem', 'sendFeedback'])
        attempt(`sheet ${act}`, () => {
          UI.acts[act]({});
          look(`sheet ${act}`, lastSheet());
          UI.closeAllSheets();
        });
      UI.go('home');
      return { opened, problems };
    });

  // ---------- The panel ----------
  const lines = (rows) =>
    rows
      .map(
        ([k, v]) =>
          `<div class="row small" style="padding:4px 0;border-top:1px solid var(--line)"><span class="grow">${esc(k)}</span><b>${esc(String(v))}</b></div>`,
      )
      .join('');
  const checks = (rows) =>
    rows
      .map(
        ([k, ok]) =>
          `<div class="row small" style="padding:4px 0;border-top:1px solid var(--line)"><span>${ok ? '✅' : '❌'}</span><span class="grow" style="margin-left:8px">${esc(k)}</span></div>`,
      )
      .join('');
  const show = (title, html) => {
    const out = document.getElementById('dev-out');
    if (out) out.innerHTML = `<div class="h3" style="margin:12px 0 4px">${esc(title)}</div>${html}`;
  };
  UI.acts.devPanel = () =>
    UI.sheet(
      `<div class="small dim" style="line-height:1.5">Developer tools. Runs on a copy of your save; the real one is put back. This panel isn't in public builds.</div>
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn sm" data-act="devCheck">✅ World check</button>
        <button class="btn sm" data-act="devMarket">💱 Market so far</button>
        <button class="btn sm" data-act="devKids">🌱 Wonderkids</button>
        <button class="btn sm" data-act="devSpeed">⏱ Speed (5 days)</button>
        <button class="btn sm" data-act="devSeason">🏁 Play a season</button>
        <button class="btn sm" data-act="devSmoke">🔎 UI smoke test</button>
      </div><div id="dev-out"></div>`,
      { title: '🛠 Developer tools', full: true },
    );
  UI.acts.devCheck = () => {
    const r = Dev.invariants();
    show(`World check: ${r.filter((x) => x[1]).length} of ${r.length} pass`, checks(r));
  };
  UI.acts.devMarket = () => show('Market so far this season', lines(Dev.market()));
  UI.acts.devKids = () => {
    const k = Dev.wonderkids();
    show(
      `${k.n} wonderkids (19 or under, potential 80+)`,
      lines(
        k.top.map((p) => [
          `${W.name(p)} · ${W.posLabel(p)} · ${W.age(p)}`,
          `${Math.round(p.ca)} → ${Math.round(p.pa)}`,
        ]),
      ),
    );
  };
  UI.acts.devSpeed = async () => {
    show('Speed', '<div class="small dim">Playing five days on a copy…</div>');
    await tick();
    try {
      const r = await Dev.speed(5);
      show(
        'Speed',
        lines([
          ['days played', r.days],
          ['average a day', `${r.avg.toFixed(0)} ms`],
          ['slowest day', `${r.worst.toFixed(0)} ms`],
        ]),
      );
    } catch (e) {
      show('Speed failed', `<div class="small">${esc(String(e.stack || e))}</div>`);
    }
  };
  UI.acts.devSmoke = async () => {
    show('UI smoke test', '<div class="small dim">Opening every screen…</div>');
    await tick();
    try {
      const r = await Dev.smoke();
      UI.acts.devPanel(); // (the sheets were closed to look at the rest)
      show(
        `UI smoke test: ${r.opened} screens, ${r.problems.length} problems`,
        r.problems.length
          ? lines(r.problems.map((x) => [x, '']))
          : '<div class="small">Everything opened cleanly.</div>',
      );
    } catch (e) {
      show('Smoke test failed', `<div class="small">${esc(String(e.stack || e))}</div>`);
    }
  };
  UI.acts.devSeason = async () => {
    show('Season', '<div class="small dim" id="dev-prog">Starting…</div>');
    await tick();
    try {
      const r = await Dev.season((i, n) => {
        const el = document.getElementById('dev-prog');
        if (el) el.textContent = `Day ${i} of about ${n}…`;
      });
      show(
        'Season on a copy',
        lines([
          ['days', r.days],
          ['time', `${r.secs.toFixed(0)} s`],
          ['goals a match', r.goals],
        ]) +
          `<div class="small b dim" style="margin:10px 0 2px">MARKET</div>${lines(r.market)}<div class="small b dim" style="margin:10px 0 2px">CHECKS AFTER</div>${checks(r.checks)}`,
      );
    } catch (e) {
      show('Season failed', `<div class="small">${esc(String(e.stack || e))}</div>`);
    }
  };
})();
