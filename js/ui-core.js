// UI shell: components, sheets, navigation, save/load, title + new-career flow.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;
  const UI = (FM.UI = {
    tab: 'home',
    sub: { squad: 'list', scout: 'scouts', league: null, club: 'overview', feed: 'club' },
    acts: {},
  });
  const esc = U.esc;
  const $ = (s, r = document) => r.querySelector(s);

  // ---------------- Components ----------------
  const C = (UI.C = {});
  // Club badge in the club's own two colours: a shape and a pattern picked from its id (the same every time).
  // 4 shapes × 11 patterns; on busy patterns the initials get a dark outline so they stay readable.
  const CREST_SHAPES = [
    'M20 1.5 L38 7.5 V22 C38 34 29 41 20 44.5 C11 41 2 34 2 22 V7.5 Z', // classic shield
    'M20 4 A19 19 0 1 1 19.99 4 Z', // round badge
    'M3 3 H37 V20 C37 33 28 40 20 44.5 C12 40 3 33 3 20 Z', // flat-topped heater
    'M6 2 H34 Q38 2 38 6 V31 Q38 35 34 37.5 L20 44.5 L6 37.5 Q2 35 2 31 V6 Q2 2 6 2 Z', // rounded plaque
  ];
  const CREST_PATTERNS = [
    [(c) => `<path d="M20 2 L37 8 V16 H3 V8Z" fill="${c}"/>`, false], // top band
    [
      (c) =>
        `<rect x="10" y="0" width="6" height="46" fill="${c}"/><rect x="24" y="0" width="6" height="46" fill="${c}"/>`,
      true,
    ], // twin stripes
    [(c) => `<path d="M3 30 L37 10 V18 L3 38Z" fill="${c}"/>`, true], // sash
    [(c) => `<rect x="20" y="0" width="20" height="46" fill="${c}"/>`, true], // halves
    [
      (c) =>
        `<rect y="6" width="40" height="6" fill="${c}"/><rect y="18" width="40" height="6" fill="${c}"/><rect y="30" width="40" height="6" fill="${c}"/>`,
      true,
    ], // hoops
    [(c) => `<rect width="20" height="23" fill="${c}"/><rect x="20" y="23" width="20" height="23" fill="${c}"/>`, true], // quarters
    [
      (c) => [5, 12.5, 20, 27.5, 35].map((x) => `<rect x="${x - 1}" width="2" height="46" fill="${c}"/>`).join(''),
      true,
    ], // pinstripes
    [(c) => `<rect x="14" width="12" height="46" fill="${c}"/>`, true], // centre stripe
    [(c) => `<rect x="16" width="8" height="46" fill="${c}"/><rect y="17" width="40" height="8" fill="${c}"/>`, true], // cross
    [(c) => `<path d="M0 4 L20 20 L40 4 V13 L20 29 L0 13Z" fill="${c}"/>`, true], // chevron
    [(c) => `<rect y="35" width="40" height="11" fill="${c}"/>`, false], // bottom band
  ];
  C.crest = function (club, size = 36) {
    if (!club) return '';
    const [c1, c2] = club.colors,
      h = U.hash(club.id),
      shape = CREST_SHAPES.at(h % CREST_SHAPES.length),
      [pattern, busy] = CREST_PATTERNS.at(Math.floor(h / CREST_SHAPES.length) % CREST_PATTERNS.length);
    const id = 'cl' + club.id;
    // The letters: on busy patterns they sit on a solid band of the main colour so stripes never cross them; too
    // small to read (under 20 px), the badge goes without them
    const label =
      size < 20
        ? ''
        : `${busy ? `<rect x="5" y="21.5" width="30" height="13" rx="2.5" fill="${c1}"/>` : ''}<text x="20" y="31.5" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="11.5" fill="${U.ink(c1)}">${esc(club.short)}</text>`;
    return `<svg class="crest" data-club="${esc(club.id)}" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="40" height="46" fill="${c1}"/>${pattern(c2)}</g><path d="${shape}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/>${label}</svg>`;
  };
  C.stars = function (lo, hi = lo, pot = null) {
    const a = (Math.round(lo * 2) / 2 / 5) * 100,
      b = (Math.round(hi * 2) / 2 / 5) * 100;
    const p = pot != null ? (Math.round(pot * 2) / 2 / 5) * 100 : b;
    return `<span class="stars" style="background:linear-gradient(90deg,var(--gold) ${a}%,color-mix(in srgb,var(--gold) 55%,transparent) ${a}% ${Math.max(b, a)}%,color-mix(in srgb,var(--gold) 28%,transparent) ${Math.max(b, a)}% ${Math.max(p, b)}%,var(--line2) ${Math.max(p, b)}%);-webkit-background-clip:text;background-clip:text;color:transparent">★★★★★</span>`;
  };
  C.playerStars = function (p) {
    const v = FM.Scouting.view(p);
    if (v.own) return C.stars(W.stars(p.ca), W.stars(p.ca), W.stars(p.pa));
    if (!v.ca) return `<span class="dim small b">? ? ?</span>`;
    return C.stars(W.stars(v.ca[0]), W.stars(v.ca[1]), v.pa ? W.stars(v.pa[1]) : null);
  };
  C.pos = (p) => `<span class="pos ${D.POS_GROUP[p.pos]}">${p.pos}</span>`;
  C.flag = (nat) => (D.NATIONS[nat] ? D.NATIONS[nat].flag : '🏳️');
  // The manager's avatar (older careers without one get a neutral face)
  C.avatar = (user, size = 40) => {
    const a = (user && user.avatar) || { e: '🧑‍💼', bg: '#243042' };
    return `<div class="avatar" style="width:${size}px;height:${size}px;background:${a.bg};font-size:${Math.round(size * 0.58)}px">${a.e}</div>`;
  };
  C.vcls = (v) => (v >= 16 ? 'v-e' : v >= 13 ? 'v-g' : v >= 9 ? 'v-m' : 'v-p');
  C.fitColor = (f) => (f >= 90 ? 'var(--good)' : f >= 75 ? 'var(--acc2)' : f >= 60 ? 'var(--warn)' : 'var(--bad)');
  C.fit = (f) => `<div class="fitbar"><i style="width:${f}%;background:${C.fitColor(f)}"></i></div>`;
  // Match fitness: bar plus percentage, coloured by how ready he is to start
  // A transfer fee: green for a player coming in, red for one going out (dir null: someone else's deal)
  C.fee = (fee, dir, loan) =>
    `<b style="white-space:nowrap${dir === 'in' ? ';color:var(--good)' : dir === 'out' ? ';color:var(--bad)' : ''}">${fee ? U.money(fee) : loan ? 'Loan' : 'Free'}</b>`;
  C.fitTag = (f) => {
    f = Math.round(f);
    return `<span class="fitw" title="Match fitness">${C.fit(f)}<span style="color:${C.fitColor(f)}">${f}%</span></span>`;
  };
  C.form = (form) => `<div class="formdots">${form.map((r) => `<i class="f${r}">${r}</i>`).join('')}</div>`;
  C.rating = (r) =>
    `<span class="pill" style="color:${r >= 7.5 ? 'var(--good)' : r >= 6.5 ? 'var(--ink)' : 'var(--bad)'};font-weight:800">${r.toFixed(1)}</span>`;
  C.radar = function (p, approx = false, size = 220) {
    const axes = p.pos === 'GK' ? D.RADAR_GK : D.RADAR;
    const keys = Object.keys(axes),
      n = keys.length,
      cx = size / 2,
      cy = size / 2,
      R = size / 2 - 30;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
    };
    let g = '';
    [0.25, 0.5, 0.75, 1].forEach(
      (f) =>
        (g += `<polygon points="${keys.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`),
    );
    keys.forEach((_, i) => {
      const [x, y] = pt(i, 1);
      g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;
    });
    const vals = keys.map((k) => U.avg(axes[k], (a) => p.attrs[a]) / 20);
    const poly = vals.map((v, i) => pt(i, v).join(',')).join(' ');
    const labels = keys
      .map((k, i) => {
        const [x, y] = pt(i, 1.22);
        return `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink2)">${k}</text>`;
      })
      .join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px;display:block;margin:auto">${g}<polygon points="${poly}" fill="color-mix(in srgb, var(--acc) 30%, transparent)" stroke="var(--acc)" stroke-width="2" ${approx ? 'stroke-dasharray="4 3" style="filter:blur(1.2px)"' : ''}/>${labels}</svg>`;
  };
  C.bar = (v, color) =>
    `<div class="bar"><i style="width:${U.clamp(v, 0, 100)}%;${color ? 'background:' + color : ''}"></i></div>`;
  C.moodColor = (v) => (v >= 65 ? 'var(--good)' : v >= 40 ? 'var(--warn)' : 'var(--bad)');
  C.playerRow = function (p, extra = '', right = '') {
    const own = W.ownPlayer(p);
    const [ml, me] = W.moraleLabel(p.morale);
    const tags = [];
    if (own && FM.Matchday && FM.Matchday.captainOf(p.clubId) === p)
      tags.push('<span class="capt-tag" title="Club captain">C</span>');
    if (p.inj) tags.push(`<span class="pill bad" title="${esc(p.inj.type)}">🚑 ${FM.Injury.weeksLeft(p)}w</span>`);
    else if (own && p.injRisk)
      tags.push('<span class="pill warn" title="Just back from injury: higher risk of a setback">🩹</span>');
    if (p.susp) tags.push(`<span class="pill warn">🟥 ${p.susp}</span>`);
    if (p.listed) tags.push(`<span class="pill">Listed</span>`);
    if (p.loan && W.ownPlayer(p)) tags.push(`<span class="pill acc">Loan</span>`);
    const club = p.clubId ? FM.S.clubs[p.clubId] : null;
    return `<div class="prow tap" data-act="player" data-id="${p.id}">${C.pos(p)}<div class="grow"><div class="b ellip">${C.flag(p.nat)} ${esc(W.name(p))} ${tags.join(' ')}</div><div class="small dim ellip">${W.age(p)} yrs · ${own ? `${me} ${ml}` : club ? esc(club.name) : 'Free agent'}${extra}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="row" style="gap:6px">${C.playerStars(p)}${own ? `<b class="carate" title="Current ability">${Math.round(p.ca)}</b>${Math.round(p.lastGrowth || 0) ? `<span class="tiny b" title="Change this season" style="color:${p.lastGrowth > 0 ? 'var(--good)' : 'var(--bad)'}">${p.lastGrowth > 0 ? '▲' : '▼'}${Math.abs(Math.round(p.lastGrowth))}</span>` : ''}` : ''}</div>${own ? C.fitTag(p.fitness) : ''}${right}</div></div>`;
  };
  C.heat = function (canvas, grid, cols = 12, rows = 8, color = [61, 200, 255]) {
    const ctx = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height;
    ctx.fillStyle = '#17532d';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      if (i % 2) {
        ctx.fillStyle = '#1a5c32';
        ctx.fillRect((i * w) / 10, 0, w / 10, h);
      }
    }
    const max = Math.max(1, ...grid);
    const cw = w / cols,
      ch = h / rows;
    ctx.globalCompositeOperation = 'lighter';
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = grid[y * cols + x] / max;
        if (v <= 0.02) continue;
        const g = ctx.createRadialGradient((x + 0.5) * cw, (y + 0.5) * ch, 0, (x + 0.5) * cw, (y + 0.5) * ch, cw * 1.3);
        const hot = v > 0.65 ? [255, 70, 50] : v > 0.35 ? [255, 210, 50] : color;
        g.addColorStop(0, `rgba(${hot.join(',')},${0.25 + v * 0.65})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect((x - 1) * cw, (y - 1) * ch, cw * 3, ch * 3);
      }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, h * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(0, h * 0.22, w * 0.14, h * 0.56);
    ctx.strokeRect(w * 0.86, h * 0.22, w * 0.14, h * 0.56);
  };
  // Synthetic heat for a player based on position (for scouting reports)
  C.posHeat = function (p) {
    const g = new Array(96).fill(0);
    const base = {
      GK: [0.05, 0.5],
      CB: [0.22, 0.5],
      FB: [0.35, p.foot === 'Left' ? 0.12 : 0.88],
      DM: [0.4, 0.5],
      CM: [0.52, 0.5],
      AM: [0.65, 0.5],
      W: [0.72, p.foot === 'Left' ? 0.85 : 0.15],
      ST: [0.8, 0.5],
    }[p.pos];
    const spread = 0.12 + (p.attrs.workRate / 20) * 0.12 + (p.attrs.stamina / 20) * 0.06;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 12; x++) {
        const dx = (x + 0.5) / 12 - base[0],
          dy = (y + 0.5) / 8 - base[1];
        g[y * 12 + x] =
          Math.exp(-(dx * dx) / (2 * spread * spread) - (dy * dy) / (2 * (spread * 1.2) ** 2)) *
          (0.7 + ((U.hash(p.id + x + '' + y) % 100) / 100) * 0.6);
      }
    return g;
  };

  // ---------------- Sheets / toasts ----------------
  UI.sheet = function (html, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet ${opts.full ? 'full' : ''}">${opts.full ? '' : '<div class="grab"></div>'}<div class="sh-head"><div class="grow h2 ellip">${opts.title || ''}</div><button class="icon-btn" data-act="closeSheet">✕</button></div><div class="sh-body">${html}</div></div>`;
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) UI.closeSheet();
    });
    $('#app').appendChild(wrap);
    wrap._opts = opts;
    return wrap;
  };
  UI.closeSheet = function () {
    const all = document.querySelectorAll('.sheet-wrap');
    const last = all[all.length - 1];
    if (last) {
      if (last._opts && last._opts.onClose) last._opts.onClose();
      last.remove();
    }
  };
  UI.closeAllSheets = () => document.querySelectorAll('.sheet-wrap').forEach((s) => s.remove());
  UI.refreshSheet = function (html) {
    const all = document.querySelectorAll('.sheet-wrap');
    const last = all[all.length - 1];
    if (last) last.querySelector('.sh-body').innerHTML = html;
  };
  UI.toast = function (msg, ms = 2600) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('#app').appendChild(t);
    setTimeout(() => t.remove(), ms);
  };

  // ---------------- Save / load ----------------
  // Storage, versioning and migrations live in save.js (FM.Save)
  UI.slot = 1;
  UI.save = function () {
    if (UI.simBusy) return false; // the world is being simulated elsewhere; it saves when it comes back
    try {
      const pre = FM.SimRunner && FM.SimRunner.takePacked(FM.S);
      FM.Save.write(UI.slot, FM.S, pre).catch((e) => {
        console.warn('save failed', e);
        UI.toast('⚠️ Could not save (storage full?)');
      });
      return true;
    } catch (e) {
      console.warn('save failed', e);
      UI.toast('⚠️ Could not save');
      return false;
    }
  };
  UI.slotMeta = (n) => FM.Save.metaOf(n);
  UI.load = async function (n) {
    const raw = await FM.Save.read(n);
    if (!raw) return false;
    try {
      const { state, from } = FM.Save.unpack(raw);
      FM.S = state;
      UI.slot = n;
      if (from < FM.Save.VERSION) {
        // Keep the original, then write the upgraded save straight away
        await FM.Save.keepBackup(n, raw);
        UI.save();
        setTimeout(() => UI.toast(`Save upgraded to the latest format (v${from} → v${FM.Save.VERSION})`, 3200), 400);
      }
      const left = FM.Season.resolveLive();
      if (left) {
        UI.save();
        const r = left.result();
        setTimeout(
          () =>
            UI.toast(
              `The match you left was played to the end: ${FM.clubOf(left.o.h).name} ${r.hg}–${r.ag} ${FM.clubOf(left.o.a).name}`,
              4500,
            ),
          500,
        );
      }
      return true;
    } catch (e) {
      console.warn('load failed', e);
      UI.toast(e.code ? e.message : 'This save could not be opened.', 5000);
      return false;
    }
  };

  UI.applyTheme = function () {
    const t =
      (FM.S && FM.S.settings && FM.S.settings.theme) ||
      (() => {
        try {
          return localStorage.getItem('touchline.theme');
        } catch (e) {
          return null;
        }
      })() ||
      'dark';
    document.documentElement.dataset.theme = t;
  };

  // ---------------- Shell ----------------
  const TABS = [
    ['home', '🏠', 'Home'],
    ['squad', '👕', 'Squad'],
    ['scout', '🔭', 'Scouting'],
    ['league', '🏆', 'League'],
    ['intl', '🌍', 'International'],
    ['club', '🏟️', 'Club'],
  ];
  UI.mount = function () {
    const app = $('#app');
    app.innerHTML = `<header class="topbar" id="topbar"></header><main id="main"></main><nav class="nav" id="nav">${TABS.map(([k, i, l]) => `<button data-act="tab" data-tab="${k}" id="nav-${k}"><span class="ni">${i}</span>${l}</button>`).join('')}</nav>`;
    UI.render();
    // swipe between tabs
    const main = $('#main');
    let sx = 0,
      sy = 0,
      st = 0;
    main.addEventListener(
      'touchstart',
      (e) => {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        st = Date.now();
      },
      { passive: true },
    );
    main.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].clientX - sx,
          dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && Date.now() - st < 500) {
          if (e.target.closest('.chips, canvas, input, .noswipe')) return;
          const i = TABS.findIndex((t) => t[0] === UI.tab);
          const ni = U.clamp(i + (dx < 0 ? 1 : -1), 0, TABS.length - 1);
          if (ni !== i) UI.go(TABS[ni][0], dx < 0 ? 'fromR' : 'fromL');
        }
      },
      { passive: true },
    );
  };
  UI.noClubView = (tab) =>
    `<div class="empty" style="margin-top:12vh;line-height:1.6">${tab === 'squad' ? '👕' : '🔭'}<br><b>No club, no ${tab === 'squad' ? 'squad' : 'scouting network'}.</b><br>Job offers are on the Home tab — take one and this fills up.<br><button class="btn sm pri" style="margin-top:12px" data-act="tab" data-tab="home">See job offers</button></div>`;
  UI.go = function (tab, anim = 'fadeIn') {
    UI.tab = tab;
    UI.render(anim);
    $('#main').scrollTop = 0;
  };
  UI.render = function (anim) {
    const S = FM.S,
      club = W.userClub();
    TABS.forEach(([k]) => $('#nav-' + k).classList.toggle('on', k === UI.tab));
    const unread = S.news.filter(FM.News.isOpen).length;
    $('#nav-home').querySelector('.badge')?.remove();
    if (unread) $('#nav-home').insertAdjacentHTML('beforeend', `<span class="badge">${unread}</span>`);
    const cal = FM.Season.today();
    const md = !cal
      ? ''
      : cal.type === 'league'
        ? FM.Season.matchdayLabel(cal)
        : cal.type === 'cup'
          ? cal.world
            ? 'Club World Cup'
            : cal.stage
              ? 'Continental night'
              : 'Cup day'
          : cal.type === 'pre'
            ? `Pre-season ${cal.idx + 1}/${FM.D.PRESEASON_DAYS}`
            : cal.type === 'intl'
              ? 'International break'
              : cal.type === 'tourn'
                ? 'Summer finals'
                : cal.stage === 'F'
                  ? 'Playoff final'
                  : 'Playoff semis';
    // On a cup, continental or international day, still show how far the league season has got
    const lc = club && S.comps[club.comp];
    const mdAll =
      cal && cal.type !== 'league' && cal.type !== 'pre' && lc && lc.fixtures
        ? `${md} · MD ${FM.Season.gamesPlayed(club.id)}/${lc.fixtures.length} played`
        : md;
    const nt = !club && S.user.nation && S.nteams && S.nteams[S.user.nation];
    $('#topbar').innerHTML = club
      ? `${C.crest(club, 30)}<div class="t-main"><div class="t-title">${esc(club.name)}</div><div class="t-sub">${FM.Season.seasonLabel()} · ${mdAll}${FM.Season.windowOpen() ? ` · <span style="color:var(--acc)">${UI.windowLabel()}</span>` : ''}</div></div><div class="money">${U.money(club.balance)}</div><button class="icon-btn settings-btn ${UI.tab === 'club' && UI.sub.club === 'settings' ? 'on' : ''}" data-act="openSettings" aria-label="Settings" title="Settings">⚙️</button>`
      : `${C.avatar(S.user, 32)}<div class="t-main"><div class="t-title">${esc(S.user.name)}</div><div class="t-sub">${FM.Season.seasonLabel()} · ${md} · <span style="color:var(--warn)">Out of work</span>${nt ? ` · ${esc(nt.name)}` : ''}</div></div><button class="icon-btn settings-btn ${UI.tab === 'club' && UI.sub.club === 'settings' ? 'on' : ''}" data-act="openSettings" aria-label="Settings" title="Settings">⚙️</button>`;
    // Squad and scouting belong to a club; out of work they explain themselves instead
    const html = !club && ['squad', 'scout'].includes(UI.tab) ? UI.noClubView(UI.tab) : UI.screens[UI.tab]();
    $('#main').innerHTML = `<div class="screen ${anim || ''}">${html}</div>`;
    UI.afterRender && UI.afterRender();
  };

  // ---------------- Event delegation ----------------
  // Out of work, only actions that make sense without a club run (anything club-bound — offers, talks, tactics,
  // old feed decisions — would reach for a club that isn't there). A whitelist fails safe: a toast, never a crash.
  const OUT_OF_WORK_OK =
    /^(tab|sub|openSettings|closeSheet|player|clubView|takeJob|advance|skipToMatch|preview|kickoff|instant|talkPick|warmPick|follow|leagueGo|post[A-Z]\w*|m[A-Z]\w*|theme|setFlag|speedDef|saveNow|exportSave|importSave|importTo|toTitle|continue|newCareer|ng(Slot|Back|Next|Club|Random|Rule|Start|Unemployed|Avatar|AvatarBg)|matchReport|share|clearRead|roundupAll|currency|statsComp|cupsView|digestTable|goCups|goNation|nation|nt[A-Z]\w*|course|installApp|sqSort|sqFilter)$/;
  // A club badge anywhere opens that club's overview, except where choosing the club is the point of the button,
  // and not during a match
  const CREST_KEEP = /^(ngClub|ngRandom|clubView|clubGoMine|takeJob)$/;
  document.addEventListener('click', (e) => {
    const crest = e.target.closest('svg.crest[data-club]');
    if (crest && FM.S && FM.S.clubs && FM.S.clubs[crest.dataset.club] && !crest.closest('#matchOv')) {
      const host = crest.closest('[data-act]');
      if (!host || !CREST_KEEP.test(host.dataset.act)) {
        e.preventDefault();
        return UI.clubSheet(crest.dataset.club);
      }
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = UI.acts[el.dataset.act];
    if (
      fn &&
      FM.S &&
      FM.S.user &&
      document.getElementById('main') &&
      !W.employed() &&
      !OUT_OF_WORK_OK.test(el.dataset.act)
    ) {
      e.preventDefault();
      return UI.toast('You need a club for that — job offers are on the Home tab');
    }
    if (fn) {
      e.preventDefault();
      FM.Native.haptic('light');
      fn(el.dataset, el, e);
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && UI.acts[el.dataset.input]) UI.acts[el.dataset.input](el.dataset, el, e);
  });

  UI.acts.tab = (d) => UI.go(d.tab);
  // Settings live under Club, but the top bar's gear reaches them from anywhere
  UI.acts.openSettings = () => {
    UI.closeAllSheets();
    UI.sub.club = 'settings';
    UI.go('club');
  };
  UI.acts.closeSheet = () => UI.closeSheet();
  UI.acts.sub = (d) => {
    UI.sub[d.k] = d.v;
    UI.render();
  };

  // ---------------- Title / new career ----------------
  UI.title = function () {
    UI.applyTheme();
    const app = $('#app');
    const last = (() => {
      try {
        return +localStorage.getItem('touchline.last') || 1;
      } catch (e) {
        return 1;
      }
    })();
    const slots = [1, 2, 3].map((n) => ({ n, m: UI.slotMeta(n) }));
    const cont = slots.find((s) => s.n === last && s.m) || slots.find((s) => s.m);
    app.innerHTML = `<div class="title"><div class="pitchlines"></div>
      <div class="logo">TOUCH<br>LINE<span>.</span></div>
      <div class="tag">The deepest football management experience built for mobile. Your club. Your stories. Your history.</div>
      <div class="actions">
        ${cont ? `<button class="btn pri block" data-act="continue" data-n="${cont.n}">▶ Continue — ${esc(cont.m.club.name)} · ${cont.m.year}</button>` : ''}
        <button class="btn ${cont ? '' : 'pri'} block" data-act="newCareer">＋ New Career</button>
        ${slots
          .filter((s) => s.m && s !== cont)
          .map(
            (s) =>
              `<button class="btn block" data-act="continue" data-n="${s.n}">Slot ${s.n}: ${esc(s.m.club.name)} · ${s.m.year}</button>`,
          )
          .join('')}
        <button class="btn block" style="background:transparent;border-color:#243042;color:#9fb0c5" data-act="importSave">⬇️ Import a backup</button>
        <div class="tiny center" style="color:#5d6d82;margin-top:8px">Prototype build · One-time purchase · No energy · No packs · No pay-to-win</div>
      </div></div>`;
  };
  UI.acts.continue = async (d) => {
    if (!(await UI.load(+d.n))) return;
    UI.applyTheme();
    UI.mount();
  };

  const NG = {
    step: 0,
    fn: '',
    ln: '',
    nat: 'ENG',
    fav: '',
    avatar: { e: '🧑', bg: '#1f6feb' },
    club: null,
    q: '', // club picker search
    lg: 'all', // club picker league filter
    rules: { win: 3, subs: 5, reg: 1, foreignLimit: W.NO_LIMIT, twoLegs: 1, awayGoals: 0 },
    slot: 1,
  };
  // A career needs a manager's name: flag the empty fields and say which (updates as you type once shown)
  const nameError = () => {
    const fields = [
      ['fn', 'first name', NG.fn],
      ['ln', 'last name', NG.ln],
    ];
    const missing = fields.filter(([, , v]) => !v.trim());
    fields.forEach(([k, , v]) => $('#ng-' + k).classList.toggle('bad', !v.trim()));
    const err = $('#ng-err');
    err.textContent = missing.length
      ? `Enter your ${missing.map(([, label]) => label).join(' and ')} to start your career.`
      : '';
    err.hidden = !missing.length;
    return missing.map(([k]) => k);
  };
  const ngProfile = () => ({
    fn: NG.fn.trim() || 'New', // only if the name check is bypassed; not a real person's name
    ln: NG.ln.trim() || 'Manager',
    nat: NG.nat,
    fav: NG.fav || null,
    avatar: NG.avatar,
  });
  UI.acts.newCareer = () => {
    NG.step = 0;
    const free = [1, 2, 3].find((n) => !UI.slotMeta(n));
    NG.slot = free || 1;
    UI.newCareer();
  };
  UI.newCareer = function () {
    const app = $('#app');
    let body = '';
    if (NG.step === 0) {
      const nations = Object.entries(D.NATIONS).sort((a, b) => a[1].name.localeCompare(b[1].name));
      const favName = NG.fav && (D.LEAGUES.flatMap((l) => D[l.clubs]).find((r) => 'c_' + r[1] === NG.fav) || [])[0];
      const favOpts = D.LEAGUES.map(
        (l) =>
          `<optgroup label="${esc(l.name)} · ${esc(D.NATIONS[l.nat].name)}">${D[l.clubs].map((r) => `<option value="c_${r[1]}" ${NG.fav === 'c_' + r[1] ? 'selected' : ''}>${esc(r[0])}</option>`).join('')}</optgroup>`,
      ).join('');
      body = `<div class="h1" style="margin-top:4vh">Who are you?</div><div class="tag">Every legend starts somewhere.</div>
        <div class="row" style="gap:14px;margin-top:18px;align-items:center">${C.avatar({ avatar: NG.avatar }, 64)}<div class="grow"><div class="b" id="ng-preview" style="font-size:18px">${esc(`${NG.fn} ${NG.ln}`.trim() || 'Your name')}</div><div class="small" style="color:#9fb0c5">${C.flag(NG.nat)} ${esc(D.NATIONS[NG.nat].name)}${favName ? ` · ❤️ ${esc(favName)}` : ''}</div></div></div>
        <div class="ng-names"><input type="text" id="ng-fn" placeholder="First name" maxlength="16" value="${esc(NG.fn)}" autocomplete="given-name"><input type="text" id="ng-ln" placeholder="Last name" maxlength="20" value="${esc(NG.ln)}" autocomplete="family-name"></div><div class="ng-err" id="ng-err" role="alert" hidden></div>
        <div class="ng-label">Country <span style="color:#6f7f96">· your own national team will know your name</span></div>
        <select id="ng-nat">${nations.map(([k, n]) => `<option value="${k}" ${NG.nat === k ? 'selected' : ''}>${n.flag} ${esc(n.name)}</option>`).join('')}</select>
        <div class="ng-label">Favourite club <span style="color:#6f7f96">· managing them is a homecoming; their rivals won't forget</span></div>
        <select id="ng-fav"><option value="">No favourite club</option>${favOpts}</select>
        <div class="ng-label">Avatar</div>
        <div class="avgrid">${W.AVATARS.map((e) => `<button class="avpick ${NG.avatar.e === e ? 'on' : ''}" data-act="ngAvatar" data-e="${e}" aria-label="Avatar ${e}">${e}</button>`).join('')}</div>
        <div class="swatches">${W.AVATAR_BG.map((bg) => `<button class="swatch ${NG.avatar.bg === bg ? 'on' : ''}" style="background:${bg}" data-act="ngAvatarBg" data-bg="${bg}" aria-label="Avatar background"></button>`).join('')}</div>
        <div class="ng-label">Save slot</div>
        <div class="seg">${[1, 2, 3].map((n) => `<button class="${NG.slot === n ? 'on' : ''}" data-act="ngSlot" data-n="${n}">Slot ${n}${UI.slotMeta(n) ? ' (overwrite)' : ''}</button>`).join('')}</div>
        <div class="actions"><button class="btn pri block" data-act="ngNext">Choose your club →</button><button class="btn block" data-act="ngBack">Back</button></div>`;
    } else if (NG.step === 1) {
      const row = (r, div) => {
        const [name, short, , c1, c2, idt, rep] = r;
        const fake = { id: 'c_' + short, short, colors: [c1, c2] };
        const I = D.IDENTITY[idt];
        const diff =
          rep >= 80
            ? 'Expectations: huge'
            : rep >= 65
              ? 'Expectations: high'
              : rep >= 55
                ? 'Expectations: moderate'
                : 'Expectations: patient';
        return `<button class="clubpick ${NG.club === fake.id ? 'on' : ''}" data-act="ngClub" data-id="${fake.id}">${C.crest(fake, 38)}<div class="grow"><div class="b">${esc(name)}</div><div class="small" style="color:#9fb0c5">${I.icon} ${I.label} · ${diff}</div><div class="tiny" style="color:#6f7f96;margin-top:2px">${esc(I.fans)}</div></div><div class="tiny" style="color:#9fb0c5">${div}</div></button>`;
      };
      // The list, filtered by the search box (club or city, accents ignored) and the league picker; redrawn on its own
      // as you type so the keyboard stays up
      const plain = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      UI._ngList = () => {
        const names = Object.fromEntries(D.LEAGUES.map((l) => [l.id, l.name]));
        const tier = Object.fromEntries(D.LEAGUES.map((l) => [l.id, `Tier ${l.tier}`]));
        const cols = ['#c8ff3d', '#3de0ff', '#a78bfa', '#ffb347', '#fbbf24', '#f87171', '#60a5fa', '#34d399'];
        const q = plain(NG.q.trim());
        const html = D.LEAGUE_CLUBS.map(([cid, key, nat], i) => {
          if (NG.lg !== 'all' && NG.lg !== cid) return '';
          // B teams (row[9] names the parent) aren't yours to manage: their players belong to the parent club
          const rows = D[key].filter((r) => !r[9] && (!q || plain(r[0]).includes(q) || plain(r[2] || '').includes(q)));
          return rows.length
            ? `<div class="small b" style="color:${cols[i]};margin:16px 0 8px;letter-spacing:1px">${D.NATIONS[nat].flag} ${names[cid].toUpperCase()} · ${D.NATIONS[nat].name.toUpperCase()}</div>${rows.map((r) => row(r, tier[cid])).join('')}`
            : '';
        }).join('');
        return html || '<div class="empty">No club matches that search.</div>';
      };
      body = `<div class="h1" style="margin-top:2vh">Pick your club</div><div class="tag">Every club has an identity. The board and fans will judge you by it.</div><div class="sp"></div>
        <div class="ng-find"><input type="search" id="ng-q" placeholder="Search club or city" value="${esc(NG.q)}" autocomplete="off"><select id="ng-lg"><option value="all">All leagues</option>${D.LEAGUE_CLUBS.map(([cid, , nat]) => `<option value="${cid}" ${NG.lg === cid ? 'selected' : ''}>${D.NATIONS[nat].flag} ${esc(D.LEAGUES.find((l) => l.id === cid).name)}</option>`).join('')}</select></div>
        <div id="ng-list">${UI._ngList()}</div>
        <div class="actions ng-foot"><button class="btn sm" data-act="ngBack" aria-label="Back">←</button><button class="btn sm" data-act="ngRandom">🎲 Random</button><button class="btn sm" data-act="ngUnemployed">🧳 No club</button><button class="btn sm pri grow" data-act="ngNext" ${NG.club && NG.club !== 'none' ? '' : 'disabled'}>${NG.club && NG.club !== 'none' ? `${esc(D.allClubRows().find((r) => 'c_' + r[1] === NG.club)[0])} →` : 'World rules →'}</button></div>`;
    } else {
      const label = (k, v) => (k === 'foreignLimit' && v >= W.NO_LIMIT ? 'No limit' : v);
      const seg = (k, vals, lbl) =>
        `<div class="small" style="color:#9fb0c5;margin:16px 0 6px">${lbl}</div><div class="seg">${vals.map((v) => `<button class="${NG.rules[k] === v ? 'on' : ''}" data-act="ngRule" data-k="${k}" data-v="${v}">${label(k, v)}</button>`).join('')}</div>`;
      const tog = (k, lbl, on, off) =>
        `<div class="small" style="color:#9fb0c5;margin:16px 0 6px">${lbl}</div><div class="seg">${[
          [1, on],
          [0, off],
        ]
          .map(
            ([v, l]) =>
              `<button class="${NG.rules[k] === v ? 'on' : ''}" data-act="ngRule" data-k="${k}" data-v="${v}">${l}</button>`,
          )
          .join('')}</div>`;
      body = `<div class="h1" style="margin-top:4vh">World rules</div><div class="tag">A taste of the World Editor. Change football before it begins.</div>
        ${seg('win', [3, 2], 'Points for a win')}${seg('subs', [3, 5], 'Substitutions per match')}${tog('reg', 'Foreign players', "Each league's real rules", 'One rule for all')}${NG.rules.reg ? '<div class="tiny" style="color:#6f7f96;margin-top:6px;line-height:1.5">Homegrown quotas in England and Italy, non-EU limits in Spain, Italy and France, international slots in MLS, foreign-player caps in Brazil, Japan, Mexico and more.</div>' : seg('foreignLimit', [4, 6, 9, W.NO_LIMIT], 'Max foreign players in a matchday squad')}
        ${tog('twoLegs', 'Continental knockouts and playoff semi-finals', 'Two legs', 'Single match')}${tog('awayGoals', 'Away goals rule (two-legged ties)', 'On', 'Off')}
        <div class="tiny" style="color:#6f7f96;margin-top:14px;line-height:1.5">30 leagues in 27 nations, in three simulation tiers. Full: the Premier League, Championship, LaLiga, Bundesliga, Ligue 1 and Brasileirão — every match in the engine. Light: League One, the Segunda División, Serie A, the Primeira Liga, the Eredivisie, Argentina, MLS and the J1 League — every fixture played by a fast statistical model (your own league, and the leagues just above and below it, always play in the full engine). Minimal: Belgium, Turkey, Czechia, Greece, Norway, Poland, Denmark, Austria, Switzerland, Scotland, Serbia, Mexico, Korea, Thailand, Nigeria and Morocco — scores only, squads for scouting. Five continental cups feed a Club World Cup. National teams play qualifiers and friendlies in two double-header breaks, with the World Cup every four years and continental championships in between.</div>
        ${NG.club === 'none' ? '<div class="small" style="color:#c8ff3d;margin-top:14px;line-height:1.5">🧳 You start out of work, with a modest reputation. Clubs in your range will make offers over the first weeks — the struggling ones first.</div>' : ''}
        <div class="actions"><button class="btn pri block" data-act="ngStart">${NG.club === 'none' ? 'Start career — no club yet 🧳' : 'Start career ⚽'}</button><button class="btn block" data-act="ngBack">Back</button></div>`;
    }
    app.innerHTML = `<div class="title">${body}</div>`;
    // Profile fields update as you type; the preview line follows along
    const preview = () => {
      const el = $('#ng-preview');
      if (el) el.textContent = `${NG.fn} ${NG.ln}`.trim() || 'Your name';
    };
    const clearNameError = () => {
      if (!$('#ng-err').hidden) nameError();
    };
    const ngQ = $('#ng-q'),
      ngLg = $('#ng-lg');
    if (ngQ)
      ngQ.addEventListener('input', () => {
        NG.q = ngQ.value;
        $('#ng-list').innerHTML = UI._ngList();
      });
    if (ngLg)
      ngLg.addEventListener('change', () => {
        NG.lg = ngLg.value;
        $('#ng-list').innerHTML = UI._ngList();
      });
    const fn = $('#ng-fn'),
      ln = $('#ng-ln'),
      nat = $('#ng-nat'),
      fav = $('#ng-fav');
    if (fn)
      fn.addEventListener('input', () => {
        NG.fn = fn.value;
        clearNameError();
        preview();
      });
    if (ln)
      ln.addEventListener('input', () => {
        NG.ln = ln.value;
        clearNameError();
        preview();
      });
    if (nat)
      nat.addEventListener('change', () => {
        NG.nat = nat.value;
        UI.newCareer();
      });
    if (fav)
      fav.addEventListener('change', () => {
        NG.fav = fav.value;
        UI.newCareer();
      });
  };
  UI.acts.ngSlot = (d) => {
    NG.slot = +d.n;
    UI.newCareer();
  };
  UI.acts.ngAvatar = (d) => {
    NG.avatar = { ...NG.avatar, e: d.e };
    UI.newCareer();
  };
  UI.acts.ngAvatarBg = (d) => {
    NG.avatar = { ...NG.avatar, bg: d.bg };
    UI.newCareer();
  };
  UI.acts.ngBack = () => {
    if (NG.step === 0) UI.title();
    else {
      NG.step--;
      UI.newCareer();
    }
  };
  UI.acts.ngNext = () => {
    if (NG.step === 0) {
      const missing = nameError();
      if (missing.length) return $('#ng-' + missing[0]).focus();
    }
    if (NG.step === 1 && !NG.club) return;
    NG.step++;
    UI.newCareer();
  };
  UI.acts.ngUnemployed = () => {
    NG.club = 'none';
    NG.step = 2;
    UI.newCareer();
  };
  UI.acts.ngClub = (d) => {
    NG.club = d.id;
    const y = $('.title').scrollTop;
    UI.newCareer();
    $('.title').scrollTop = y;
  };
  // Pick any club at random and scroll it into view
  UI.acts.ngRandom = () => {
    const all = D.allClubRows()
      .filter((r) => !r[9]) // not a B team
      .map((r) => 'c_' + r[1])
      .filter((id) => id !== NG.club);
    NG.club = U.pick(all);
    UI.newCareer();
    const el = document.querySelector(`[data-act=ngClub][data-id="${NG.club}"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    UI.toast('🎲 Fate has chosen…');
  };
  UI.acts.ngRule = (d) => {
    NG.rules[d.k] = +d.v;
    UI.newCareer();
  };
  UI.acts.ngStart = () => {
    $('#app').innerHTML =
      `<div class="title"><div class="logo" style="font-size:40px">Building<br>your world<span>…</span></div><div class="tag">Generating clubs, players, personalities and scouting networks.</div></div>`;
    setTimeout(() => {
      const theme = (FM.S && FM.S.settings) || { theme: document.documentElement.dataset.theme || 'dark', speed: 1 };
      FM.S = null;
      W.newWorld({
        ...NG.rules,
        reg: NG.rules.reg === 0 ? null : 'real',
        twoLegs: !!NG.rules.twoLegs,
        awayGoals: !!NG.rules.awayGoals,
      });
      FM.S.settings = theme;
      FM.Season.init();
      if (NG.club === 'none') {
        // A career without a club: a modest reputation and offers from the lower leagues
        W.newManager(ngProfile(), 38, NG.nat);
        if (!FM.S.staffPool) W.refreshStaffPool();
        W.goUnemployed('start');
      } else W.takeCharge(NG.club, ngProfile());
      W.seedLegends();
      FM.Stories.welcome();
      UI.slot = NG.slot;
      UI.save();
      UI.tab = 'home';
      UI.mount();
    }, 60);
  };
})();
