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
  // Emblems in the middle of a crest (no lettering): drawn around (20, 25), inside every shape
  const CREST_EMBLEMS = [
    (f, bg) =>
      `<circle cx="20" cy="25" r="6.2" fill="${f}"/><path d="M20 21.3 L23.4 23.8 L22.1 27.8 H17.9 L16.6 23.8 Z" fill="${bg}"/>`, // ball
    (f) =>
      `<path d="M20 17.5 L22.3 22.6 L27.8 23.1 L23.6 26.7 L24.9 32.1 L20 29.2 L15.1 32.1 L16.4 26.7 L12.2 23.1 L17.7 22.6 Z" fill="${f}"/>`, // star
    (f) => `<path d="M13 30.5 L13.8 21 L17.3 24.6 L20 19 L22.7 24.6 L26.2 21 L27 30.5 Z" fill="${f}"/>`, // crown
    (f) => `<path d="M14 31 V21.5 H16.4 V23.6 H18.6 V21.5 H21.4 V23.6 H23.6 V21.5 H26 V31 Z" fill="${f}"/>`, // tower
    (f) => `<path d="M20 18 L26.5 25 L20 32 L13.5 25 Z" fill="${f}"/>`, // diamond
    (f, bg) => `<circle cx="20" cy="25" r="6.5" fill="${f}"/><circle cx="20" cy="25" r="3.2" fill="${bg}"/>`, // ring
  ];
  const lum = (hex) => {
    const c = String(hex).replace('#', '');
    return (
      (parseInt(c.substr(0, 2), 16) * 299 + parseInt(c.substr(2, 2), 16) * 587 + parseInt(c.substr(4, 2), 16) * 114) /
      1000
    );
  };
  let crestN = 0;
  C.crest = function (club, size = 36) {
    if (!club) return '';
    const [c1, c2] = club.colors,
      h = U.hash(club.id),
      shape = CREST_SHAPES.at(h % CREST_SHAPES.length),
      [pattern, busy] = CREST_PATTERNS.at(Math.floor(h / CREST_SHAPES.length) % CREST_PATTERNS.length),
      emblem = CREST_EMBLEMS.at(Math.floor(h / 97) % CREST_EMBLEMS.length);
    // every crest its own clip: a shared id breaks the clipping when the first copy sits in a hidden part of the page
    const id = `cl${++crestN}`;
    // the emblem in the second colour (or the colour that reads on the first), on a disc of the main colour over a
    // busy pattern so stripes never cross it; too small to see under 20 px
    const ink = Math.abs(lum(c1) - lum(c2)) > 60 ? c2 : U.ink(c1);
    const mark = size < 20 ? '' : `${busy ? `<circle cx="20" cy="25" r="9" fill="${c1}"/>` : ''}${emblem(ink, c1)}`;
    // drawn a touch inside the frame so the border is never cut off at the edge
    return `<svg class="crest" data-club="${esc(club.id)}" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><g transform="translate(1 1.15) scale(0.95)"><g clip-path="url(#${id})"><rect width="40" height="46" fill="${c1}"/>${pattern(c2)}${mark}</g><path d="${shape}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/></g></svg>`;
  };
  C.stars = function (lo, hi = lo, pot = null) {
    const a = (Math.round(lo * 2) / 2 / 5) * 100,
      b = (Math.round(hi * 2) / 2 / 5) * 100;
    const p = pot != null ? (Math.round(pot * 2) / 2 / 5) * 100 : b;
    return `<span class="stars" style="background:linear-gradient(90deg,var(--gold) ${a}%,color-mix(in srgb,var(--gold) 55%,transparent) ${a}% ${Math.max(b, a)}%,color-mix(in srgb,var(--gold) 28%,transparent) ${Math.max(b, a)}% ${Math.max(p, b)}%,var(--line2) ${Math.max(p, b)}%);-webkit-background-clip:text;background-clip:text;color:transparent">★★★★★</span>`;
  };
  // His rating in stars against the league you manage in (no numbers): a scouted player's is a range.
  C.playerOverall = function (p) {
    const v = FM.Scouting.view(p);
    if (v.own) return `${W.stars(p.ca)}★`;
    if (!v.ca) return '?';
    const lo = W.stars(v.ca[0]),
      hi = W.stars(v.ca[1]);
    return lo === hi ? `${lo}★` : `${lo}–${hi}★`;
  };
  // Stars for an ability value, as text ("3.5★")
  C.starText = (ca) => `${W.stars(ca)}★`;
  // Overall at each position he can play (his own first), when his attributes are known
  C.posOveralls = function (p) {
    if (p.pos === 'GK') return '';
    return W.positionTable(p, 0.8)
      .map(
        (x) =>
          `${x.t === p.pos ? W.posLabel(p) : W.altLabel(p, x.t)} ${C.starText(x.ovr)}${x.fam === 'natural' ? '' : ` (${x.fam})`}`,
      )
      .join(' · ');
  };
  C.playerStars = function (p) {
    const v = FM.Scouting.view(p);
    if (v.own) return C.stars(W.stars(p.ca), W.stars(p.ca), W.stars(p.pa));
    if (!v.ca) return `<span class="dim small b">? ? ?</span>`;
    return C.stars(W.stars(v.ca[0]), W.stars(v.ca[1]), v.pa ? W.stars(v.pa[1]) : null);
  };
  // A player's name that opens his profile when tapped (text: what to show, his short name by default)
  C.pname = (p, text) =>
    p
      ? `<span class="tap pname" data-act="player" data-id="${p.id}">${esc(text != null ? text : W.short(p))}</span>`
      : '—';
  C.pos = (p) => `<span class="pos ${D.POS_GROUP[p.pos]}">${W.posLabel(p)}</span>`;
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
    if (own && p.unreg)
      tags.push(
        '<span class="pill bad" title="Left off the registered squad: out until the next window closes">Unregistered</span>',
      );
    if (p.loan && W.ownPlayer(p)) tags.push(`<span class="pill acc">Loan</span>`);
    const club = p.clubId ? FM.S.clubs[p.clubId] : null;
    // what is moving his mood, when it is moving it (the biggest reason, with its size)
    const f = own && FM.People ? FM.People.moodFactors(p)[0] : null;
    const why =
      f && (Math.abs(f.d) >= 8 || p.morale <= 50) ? ` · ${esc(f.t)} (${f.d > 0 ? '+' : '−'}${Math.abs(f.d)})` : '';
    return `<div class="prow tap" data-act="player" data-id="${p.id}">${C.pos(p)}<div class="grow"><div class="b ellip">${p.clubId && p.no ? `<span class="sqno">${p.no}</span>` : ''}${C.flag(p.nat)} ${esc(W.name(p))} ${tags.join(' ')}</div><div class="small dim ellip">${W.age(p)} yrs · ${own ? `${me} ${ml}${why}` : club ? esc(club.name) : 'Free agent'}${extra}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="row" style="gap:6px">${C.playerStars(p)}${own && Math.round(p.lastGrowth || 0) ? `<span class="tiny b" title="Grown or slipped this season" style="color:${p.lastGrowth > 0 ? 'var(--good)' : 'var(--bad)'}">${p.lastGrowth > 0 ? '▲' : '▼'}</span>` : ''}</div>${own ? C.fitTag(p.fitness) : ''}${right}</div></div>`;
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
      WB: [0.4, p.foot === 'Left' ? 0.1 : 0.9],
      WM: [0.55, p.foot === 'Left' ? 0.15 : 0.85],
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
      // it slides away; meanwhile it no longer counts as an open sheet
      last.classList.replace('sheet-wrap', 'sheet-closing');
      setTimeout(() => last.remove(), 220);
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

  // Your club's colours as the app's accent (header ticks, buttons, highlights): the kit colour that reads best on the
  // page (a pale one is darkened on the light theme, a dark one lightened on the dark theme), the more colourful of the
  // two when both read, and white or black for a black-and-white club. Out of work or at the title screen: the default.
  const rgb = (hex) => {
    const c = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
  };
  const relLum = (hex) => {
    const [r, g, b] = rgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => (Math.max(relLum(a), relLum(b)) + 0.05) / (Math.min(relLum(a), relLum(b)) + 0.05);
  const toHex = (c) =>
    '#' +
    c
      .map((v) =>
        Math.round(U.clamp(v, 0, 255))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  const mixTo = (hex, to, t) => toHex(rgb(hex).map((v, i) => v + (to[i] - v) * t));
  UI.clubAccent = function (colors, theme) {
    const bg = theme === 'light' ? '#eef1f6' : '#0a0e14',
      toward = theme === 'light' ? [0, 0, 0] : [255, 255, 255];
    const sat = (h) => Math.max(...rgb(h)) - Math.min(...rgb(h));
    const ok = (h) => contrast(h, bg) >= 3;
    const pool = colors.filter((h) => /^#[0-9a-f]{6}$/i.test(h));
    if (!pool.length) return null;
    // the more colourful kit colour that reads; else the most colourful one, brought into range
    const reading = pool.filter(ok).sort((a, b) => sat(b) - sat(a));
    let pick = reading[0] || pool.sort((a, b) => sat(b) - sat(a))[0];
    // a colourless kit (white, black, grey): the end of the scale that reads on this page
    if (sat(pick) < 40) pick = theme === 'light' ? '#111827' : '#f4f6fa';
    for (let t = 0.1; contrast(pick, bg) < 4.5 && t <= 1; t += 0.1) pick = mixTo(pick, toward, 0.1);
    return pick;
  };
  UI.applyClubTheme = function () {
    const root = document.documentElement,
      club = FM.S && FM.S.user && W.userClub();
    const theme = root.dataset.theme || 'dark',
      off = !!(FM.S && FM.S.settings && FM.S.settings.noClubAccent),
      key = club && !off ? `${club.id}|${theme}|${club.colors.join()}` : '';
    if (UI._themeKey === key) return;
    UI._themeKey = key;
    const acc = club && !off && UI.clubAccent(club.colors, theme);
    if (!acc) {
      root.style.removeProperty('--acc');
      root.style.removeProperty('--acc-ink');
    } else {
      root.style.setProperty('--acc', acc);
      root.style.setProperty('--acc-ink', U.ink(acc));
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
    UI.applyClubTheme();
  };

  // ---------------- Shell ----------------
  const TABS = [
    ['home', '🏠', 'Home'],
    ['squad', '👕', 'Squad'],
    ['scout', '🔭', 'Scouting'],
    ['league', '🏆', 'League'],
    ['intl', '🌍', 'Nations'],
    ['club', '🏟️', 'Club'],
  ];
  UI.mount = function () {
    const app = $('#app');
    app.innerHTML = `<header class="topbar" id="topbar"></header><main id="main"></main><nav class="nav" id="nav">${TABS.map(([k, i, l]) => `<button data-act="tab" data-tab="${k}" id="nav-${k}"><span class="ni">${i}</span><span class="nl">${l}</span></button>`).join('')}</nav>`;
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
  // Going to a tab slides it in from the side of the tab you tapped; the same tab again just fades
  UI.go = function (tab, anim) {
    if (!anim) {
      const order = TABS.map(([k]) => k),
        a = order.indexOf(UI.tab),
        b = order.indexOf(tab);
      anim = a < 0 || b < 0 || a === b ? 'fadeIn' : b > a ? 'fromR' : 'fromL';
    }
    UI.tab = tab;
    UI.render(anim);
    $('#main').scrollTop = 0;
  };
  UI.render = function (anim) {
    const S = FM.S,
      club = W.userClub();
    UI.applyClubTheme();
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
                  : cal.stage === 'F2'
                    ? 'Playoff final · 2nd leg'
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
    /^(tab|sub|openSettings|closeSheet|player|clubView|takeJob|advance|skipToMatch|preview|kickoff|instant|talkPick|warmPick|follow|leagueGo|post[A-Z]\w*|m[A-Z]\w*|theme|setFlag|ngSim|ngSimPreset|setMatchView|speedDef|saveNow|exportSave|importSave|dev[A-Z]\w*|reportProblem|sendReport|sendFeedback|sendFeedbackGo|whatsNew|importTo|toTitle|continue|newCareer|ng(Slot|Back|Next|Club|Random|Rule|Start|Unemployed|Avatar|AvatarBg)|matchReport|share|clearRead|roundupAll|currency|statsComp|cupsView|digestTable|goCups|goNation|nation|nt[A-Z]\w*|course|installApp|sqSort|sqStat|sqAlt|sqFilter)$/;
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
    UI.render('subIn');
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
      <div class="tag">${esc(D.HOOK)}</div>
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
    UI.finishPendingDay();
  };
  // Your result is saved at full time, but the rest of that day (every other match) runs when you leave the
  // post-match screens. Closed before then, the save holds a half-played day: finish it as soon as it loads.
  UI.finishPendingDay = async function () {
    if (!FM.S || !FM.S.user || UI.simBusy || !FM.Season.today()) return;
    // our match today has its result, but other fixtures of the day are still unplayed
    const fxs = FM.Season.dayFixtures(),
      mine = fxs.find((f) => W.isMine(f.h) || W.isMine(f.a));
    if (!mine || !mine.res || fxs.every((f) => f.res)) return;
    const r = await FM.SimRunner.run('day');
    UI.afterDay(r && r.summary);
    UI.toast('The rest of the matchday has been played', 3000);
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
    slot: 1,
    sims: {}, // leagues whose simulation tier was changed from the default: { id: 'full' | 'light' | 'minimal' }
  };
  // The simulation tiers a world can run each league in (the new-career screen lets you choose before the save starts).
  // load: the work a club costs a day next to a fully simulated one
  const TIERS = [
    ['full', 'Full', 1, 'every match in the engine, with finances, transfers and cups'],
    ['light', 'Light', 0.1, 'every fixture played by a fast statistical model, with honest player numbers'],
    ['minimal', 'Minimal', 0.02, 'scores only, with squads kept for scouting and the market'],
  ];
  // Your league and the leagues just above and below it always run in full
  const lockedLeagues = () => {
    const code = NG.club && NG.club !== 'none' ? String(NG.club).replace(/^c_/, '') : null,
      mine = code && D.LEAGUES.find((l) => D[l.clubs].some((r) => r[1] === code)),
      out = new Set();
    if (mine) {
      out.add(mine.id);
      const r = mine.rules || {};
      if (r.promote) out.add(r.promote.to);
      if (r.relegate) out.add(r.relegate.to);
    }
    return out;
  };
  const simOfLeague = (l, locked) => (locked.has(l.id) ? 'full' : NG.sims[l.id] || l.sim);
  UI.simSetup = function () {
    const locked = lockedLeagues();
    const load = (f) => D.LEAGUES.reduce((t, l) => t + D[l.clubs].length * TIERS.find((x) => x[0] === f(l))[2], 0);
    const mine = load((l) => simOfLeague(l, locked)),
      base = load((l) => (locked.has(l.id) ? 'full' : l.sim));
    const counts = { full: 0, light: 0, minimal: 0 };
    D.LEAGUES.forEach((l) => (counts[simOfLeague(l, locked)] += D[l.clubs].length));
    const pct = Math.round((100 * mine) / base);
    const seg = (l) =>
      `<div class="seg" style="width:174px">${TIERS.map(([k, label]) => {
        const on = simOfLeague(l, locked) === k;
        return `<button class="${on ? 'on' : ''}" ${locked.has(l.id) && k !== 'full' ? 'disabled style="opacity:.35"' : ''} data-act="ngSim" data-id="${l.id}" data-v="${k}">${label}</button>`;
      }).join('')}</div>`;
    const nations = [...new Set(D.LEAGUES.map((l) => l.nat))];
    return `<details id="ng-sim" ${NG.simOpen ? 'open' : ''} style="margin-top:16px"><summary class="small" style="color:#c9d4e3;cursor:pointer">Choose how much of the world is simulated <span class="dim" style="color:#6f7f96">· ${counts.full} clubs in full, ${counts.light} light, ${counts.minimal} minimal</span></summary>
      <div class="tiny" style="color:#6f7f96;margin-top:8px;line-height:1.5">${TIERS.map(([, label, , d]) => `<b style="color:#c9d4e3">${label}</b>: ${d}.`).join(' ')} Your league and the ones just above and below it are always full. More full leagues means a richer world but slower days and bigger saves; simulation load ${pct}% of the default.</div>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn sm" data-act="ngSimPreset" data-v="default">Default</button><button class="btn sm" data-act="ngSimPreset" data-v="fast">Faster</button><button class="btn sm" data-act="ngSimPreset" data-v="deep">Deeper</button></div>
      ${nations
        .map((nat) => {
          const ls = D.LEAGUES.filter((l) => l.nat === nat);
          return `<div class="small b" style="margin:12px 0 4px;color:#c8ff3d">${D.NATIONS[nat].flag} ${esc(D.NATIONS[nat].name)}</div>${ls.map((l) => `<div class="row" style="padding:5px 0;align-items:center"><div class="grow small" style="color:#c9d4e3">${esc(l.name)} <span style="color:#6f7f96">· ${D[l.clubs].length} clubs${locked.has(l.id) ? ' · always full' : ''}</span></div>${seg(l)}</div>`).join('')}`;
        })
        .join('')}</details>`;
  };
  // The screen is drawn again after each choice, where you were (the list is long) and with the list still open
  const redrawKeepingPlace = () => {
    NG.simOpen = true;
    const y = window.scrollY,
      t = document.querySelector('.title'),
      ty = t ? t.scrollTop : 0;
    UI.newCareer();
    window.scrollTo(0, y);
    const t2 = document.querySelector('.title');
    if (t2) t2.scrollTop = ty;
  };
  UI.acts.ngSim = (d) => {
    if (lockedLeagues().has(d.id)) return;
    const l = D.LEAGUES.find((x) => x.id === d.id);
    if (d.v === l.sim) delete NG.sims[d.id];
    else NG.sims[d.id] = d.v;
    redrawKeepingPlace();
  };
  UI.acts.ngSimPreset = (d) => {
    NG.sims = {};
    if (d.v !== 'default') for (const l of D.LEAGUES) NG.sims[l.id] = d.v === 'fast' ? 'minimal' : 'full';
    redrawKeepingPlace();
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
  // The rules of one league, from the game's own data: format, tiebreakers, promotion and relegation, continental
  // places, cups and the squad and foreign-player rules (the new-career screen shows the league you picked)
  UI.leagueRules = function (l) {
    const R = FM.Reg,
      nat = D.NATIONS[l.nat],
      lname = (id) => (D.LEAGUES.find((x) => x.id === id) || {}).name || id;
    const n = D[l.clubs].length;
    const TB = { gd: 'goal difference', gf: 'goals scored', h2h: 'head-to-head record', wins: 'number of wins' };
    const tb = (D.TIEBREAK[l.id] || D.TIEBREAK_DEFAULT).map((k) => TB[k]).join(', then ');
    const r = l.rules || {};
    const move = [];
    if (r.promote) {
      move.push(`The top ${r.promote.auto} go up to the ${lname(r.promote.to)}.`);
      if (r.promote.playoff)
        move.push(
          `Places ${r.promote.playoff[0]}–${r.promote.playoff[1]} play off for a further place (semi-finals over two legs, the final ${r.promote.finalLegs === 2 ? 'over two legs' : 'a single match'}).`,
        );
    } else move.push(l.tier === 1 ? 'The top division: no promotion.' : 'No promotion from here.');
    if (r.relegate)
      move.push(
        `The bottom ${r.relegate.n} go down to the ${lname(r.relegate.to)}${r.relegate.playoff ? `, and the club just above them plays a two-legged play-off against the ${lname(r.relegate.to)}'s third-placed side` : ''}.`,
      );
    else move.push('No relegation from here.');
    const europe = [];
    if (r.qualify) {
      const cc = D.CONTINENTALS.find((c) => c.id === r.qualify.to);
      if (cc) europe.push(`The top ${r.qualify.n} qualify for the ${cc.name}.`);
    }
    for (const cc of D.CONTINENTALS) {
      const k = cc.feeders && cc.feeders[l.id];
      if (k)
        europe.push(k === 1 ? `The next place goes to the ${cc.name}.` : `The next ${k} places go to the ${cc.name}.`);
    }
    const cups = D.DOMESTIC_CUPS.filter((c) => c[1] === l.nat).map((c) => c[2]);
    const block = (title, lines) =>
      lines.length
        ? `<div class="ng-rules"><div class="ng-label" style="margin-top:14px">${esc(title)}</div>${lines.map((x) => `<div class="small" style="color:#c9d4e3;line-height:1.55;margin-top:4px">• ${esc(x)}</div>`).join('')}</div>`
        : '';
    return `<div class="h3" style="margin-top:14px;color:#c8ff3d">${nat.flag} ${esc(l.name)} · ${esc(nat.name)}</div>
      ${block('Format', [`${n} clubs, each playing every other home and away: ${(n - 1) * 2} matches.`, '3 points for a win, 1 for a draw.', `Level on points: ${tb}.`])}
      ${block('Promotion and relegation', move)}
      ${block('Continental places', europe.length ? europe : ['No continental places from this league.'])}
      ${block('Domestic cups', cups.length ? [`${cups.join(', ')}: one-off ties with extra time and penalties.`] : ['No domestic cup is played.'])}
      ${block('Squad and foreign-player rules', R.describe(l.id))}
      ${block('Matchday', ['Five substitutions from a bench of nine.', 'Knockout ties: extra time, then penalties; no away-goals rule.'])}`;
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
        <div class="actions ng-foot"><button class="btn sm" data-act="ngBack" aria-label="Back">←</button><button class="btn sm" data-act="ngRandom">🎲 Random</button><button class="btn sm" data-act="ngUnemployed">🧳 No club</button><button class="btn sm pri grow" data-act="ngNext" ${NG.club && NG.club !== 'none' ? '' : 'disabled'}>${NG.club && NG.club !== 'none' ? `${esc(D.allClubRows().find((r) => 'c_' + r[1] === NG.club)[0])} →` : 'Next →'}</button></div>`;
    } else {
      // Your world: what's in it and the rules it plays by (each competition's real ones; not chosen here)
      body = `<div class="h1" style="margin-top:4vh">Your world</div><div class="tag">Real football, played by its real rules.</div>
        ${(() => {
          const code = NG.club && NG.club !== 'none' ? String(NG.club).replace(/^c_/, '') : null;
          const lg = code && D.LEAGUES.find((l) => D[l.clubs].some((r) => r[1] === code));
          return lg
            ? `<div class="tiny" style="color:#6f7f96;margin-top:14px">The rules of the league you will manage in, as in real life:</div>${UI.leagueRules(lg)}`
            : '<div class="small" style="color:#c9d4e3;margin-top:16px;line-height:1.6">Three points for a win and five substitutions, as everywhere today. Each league has its own promotion and relegation, continental places and foreign-player rules; you will see your league\'s when you take a job. Knockout ties go to extra time and penalties, with no away-goals rule.</div>';
        })()}
        ${UI.simSetup()}
        <details style="margin-top:16px"><summary class="tiny" style="color:#6f7f96;cursor:pointer">The wider world</summary><div class="tiny" style="color:#6f7f96;margin-top:8px;line-height:1.5">${D.facts().clubs} clubs in ${D.facts().leagues} leagues across ${D.facts().nations} nations, in three simulation tiers. Full: the Premier League, Championship, LaLiga, Bundesliga, Ligue 1 and Brasileirão — every match in the engine. Light: League One and League Two, the Segunda División and Primera Federación, 2. and 3. Liga, Serie A and Serie B, Ligue 2, the Primeira Liga, the Eredivisie, Argentina, MLS and the J1 League — every fixture played by a fast statistical model (your own league, and the leagues just above and below it, always play in the full engine). Minimal: Belgium, Turkey, Czechia, Greece, Norway, Poland, Denmark, Austria, Switzerland, Scotland, Serbia, Hungary, Ireland, Wales, Australia, Mexico, Korea, Thailand, Nigeria and Morocco — scores only, squads for scouting. ${D.facts().continentalCups} continental cups, the Europa and Conference Leagues and Copa Sudamericana among them, feed a Club World Cup, and ${D.facts().domesticCups} domestic cups run alongside them. National teams play qualifiers and friendlies in two double-header breaks, with the World Cup every four years and continental championships in between.</div></details>
        ${NG.club === 'none' ? '<div class="small" style="color:#c8ff3d;margin-top:14px;line-height:1.5">🧳 You start out of work, with a modest reputation. Clubs in your range will make offers over the first weeks — the struggling ones first.</div>' : ''}
        <div class="actions"><button class="btn pri block" data-act="ngStart">${NG.club === 'none' ? 'Start career — no club yet 🧳' : 'Start career ⚽'}</button><button class="btn block" data-act="ngBack">Back</button></div>`;
    }
    app.innerHTML = `<div class="title">${body}</div>`;
    const simBox = $('#ng-sim');
    if (simBox) simBox.addEventListener('toggle', () => (NG.simOpen = simBox.open));
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
  UI.acts.ngStart = () => {
    $('#app').innerHTML =
      `<div class="title"><div class="logo" style="font-size:40px">Building<br>your world<span>…</span></div><div class="tag">Generating clubs, players, personalities and scouting networks.</div></div>`;
    setTimeout(() => {
      const theme = (FM.S && FM.S.settings) || { theme: document.documentElement.dataset.theme || 'dark', speed: 1 };
      FM.S = null;
      // your league and the two next to it are fully simulated whatever else was chosen
      const sims = { ...NG.sims };
      lockedLeagues().forEach((id) => (sims[id] = 'full'));
      W.newWorld({ ...W.REAL_RULES, sims });
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
