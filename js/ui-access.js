// Accessibility, first-time help and a local error log (UI only): the text-size setting, screen-reader labels for
// buttons that are only an icon, the first-time tutorial, and a record of the errors a player ran into that the
// problem report carries (nothing leaves the device unless the player shares a report).
(function () {
  const FM = window.FM,
    UI = FM.UI;
  const get = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      /* private mode: the setting lasts for this session only */
    }
  };

  // ---------------- Text size ----------------
  // The whole app scales (CSS zoom on #app, with its height divided back so it still fills the screen)
  UI.TEXT_SIZES = [
    ['Small', 0.9],
    ['Default', 1],
    ['Large', 1.1],
    ['Largest', 1.2],
  ];
  UI.textScale = () => {
    const v = parseFloat(get('touchline.textSize'));
    return v >= 0.8 && v <= 1.5 ? v : 1;
  };
  UI.applyTextSize = () => document.documentElement.style.setProperty('--tz', String(UI.textScale()));
  UI.applyTextSize();
  UI.acts.textSize = (d) => {
    set('touchline.textSize', d.v);
    UI.applyTextSize();
    UI.render();
  };
  UI.textSizeCard = () =>
    `<div class="card"><div class="h3">Text size</div><div class="small dim">Makes everything in the game larger or smaller</div><div class="seg" style="margin-top:8px">${UI.TEXT_SIZES.map(
      ([label, v]) =>
        `<button class="${UI.textScale() === v ? 'on' : ''}" data-act="textSize" data-v="${v}">${label}</button>`,
    ).join('')}</div></div>`;

  // ---------------- Screen-reader labels ----------------
  // A button that is only an icon has no name for a screen reader: give it one from its title, then from the icon,
  // then from what it does. Things that act when tapped but are not buttons become buttons (reachable by keyboard).
  const ICONS = {
    '✕': 'Close',
    '×': 'Close',
    '←': 'Back',
    '→': 'Next',
    '‹': 'Back',
    '›': 'Open',
    '⚙️': 'Settings',
    '🔍': 'Search',
    '🏠': 'Home',
    '👕': 'Squad',
    '🔭': 'Scouting',
    '🏆': 'League',
    '🌍': 'Nations',
    '🏟️': 'Club',
    '⭐': 'Favourite',
    '☆': 'Favourite',
    '▶': 'Play',
    '⏸': 'Pause',
    '⏩': 'Faster',
    '🔔': 'Notifications',
    '📤': 'Share',
    '⬆️': 'Export',
    '⬇️': 'Import',
    '🗑': 'Delete',
    '＋': 'Add',
    '+': 'Add',
    '−': 'Remove',
  };
  const words = (act) =>
    act
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
  const WORDS = new RegExp('[\\p{L}\\p{N}]', 'u'),
    ICON_ONLY = new RegExp('^[\\p{Extended_Pictographic}\\s\\uFE0F]*$', 'u');
  UI.a11y = function (root) {
    root = root || document.getElementById('app');
    if (!root) return;
    root.querySelectorAll('button:not([aria-label]), [data-al], [data-act]:not(button):not([role])').forEach((el) => {
      if (el.tagName !== 'BUTTON') {
        el.setAttribute('role', 'button');
        if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      }
      if (el.dataset.al)
        el.removeAttribute('aria-label'); // (ours from an earlier pass: worked out again)
      else if (el.hasAttribute('aria-label')) return;
      const t = (el.textContent || '').trim();
      if (WORDS.test(t) && !ICON_ONLY.test(t)) {
        delete el.dataset.al; // it has words: those are its name
        return;
      }
      const label =
        el.getAttribute('title') ||
        ICONS[t] ||
        (el.dataset.act === 'tab' ? words(el.dataset.tab || '') : el.dataset.act ? words(el.dataset.act) : '');
      if (label) {
        el.setAttribute('aria-label', label);
        el.dataset.al = '1';
      }
    });
    root.querySelectorAll('.sheet:not([role])').forEach((el) => {
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
    });
    root.querySelectorAll('.toast:not([role])').forEach((el) => el.setAttribute('role', 'status'));
  };
  // Enter and Space press what looks like a button (a keyboard or switch user, a screen reader's activate)
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute('role') === 'button' && el.tagName !== 'BUTTON') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    }
  });
  // Labels follow the screen as it changes (a trailing pass at most every 250 ms: cheap, and out of the match's way)
  let pending = null;
  const schedule = () => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      UI.a11y();
    }, 250);
  };
  const watch = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
  };
  if (document.body) watch();
  else document.addEventListener('DOMContentLoaded', watch);

  // ---------------- First-time tutorial ----------------
  const TUT = [
    [
      '👋 Welcome, manager',
      'You run the football side of your club. The <b>Home</b> tab shows what needs you now: replies, decisions and the next fixture. <b>Next match</b> plays the days forward and stops when something needs an answer, so nothing slips past.',
    ],
    [
      '👕 Squad and tactics',
      "The <b>Squad</b> tab holds your players, their stars (measured against your league), fitness and mood. <b>Tactics</b> sets the formation, each player's role and a Plan B you can switch to during a match. Pick a captain and give a team talk before kick-off.",
    ],
    [
      '⚽ Matchdays',
      'Watch the match on the pitch or as text only (Club → Settings), change speed, and answer the prompts that come up: substitutions, shouts, set pieces. You can also take an instant result when you would rather not watch.',
    ],
    [
      '💸 Transfers and scouting',
      "Use <b>Scouting</b> to assign scouts and filter players. Transfers and loans happen in the windows; free agents can be signed any time. Make offers, haggle, and watch the deadline: every deal needs a registration place under your league's rules.",
    ],
    [
      '📰 The feed',
      "Board meetings, press questions, injuries, contract talks and offers arrive in the Home feed. Some need a choice; the rest are the story of your season. Tap any player's name to see his profile.",
    ],
    [
      '🏟️ Your club and your saves',
      'The <b>Club</b> tab has finances, training, the youth teams and the board. The game saves itself after every matchday and when you leave the app. Under Settings you can export a backup, switch save slots, and replay this tutorial.',
    ],
  ];
  let tutStep = 0;
  const tutHTML = (i) => {
    const [, body] = TUT[i];
    return `<div style="line-height:1.6">${body}</div>
      <div class="row" style="gap:6px;justify-content:center;margin:14px 0 4px">${TUT.map((_, k) => `<span style="width:7px;height:7px;border-radius:50%;background:${k === i ? 'var(--acc)' : 'var(--line2)'}"></span>`).join('')}</div>
      <div class="actions" style="margin-top:10px"><div class="row" style="gap:8px">${i > 0 ? '<button class="btn grow" data-act="tutBack">Back</button>' : '<button class="btn grow" data-act="tutSkip">Skip</button>'}<button class="btn pri grow" data-act="${i === TUT.length - 1 ? 'tutSkip' : 'tutNext'}">${i === TUT.length - 1 ? 'Start playing' : 'Next'}</button></div></div>`;
  };
  UI.tutorial = function (i = 0) {
    tutStep = i;
    const open = document.querySelector('.sheet-wrap[data-tut]');
    if (open) {
      open.querySelector('.sh-body').innerHTML = tutHTML(i);
      open.querySelector('.sh-head .h2').textContent = TUT[i][0];
      return;
    }
    const w = UI.sheet(tutHTML(i), {
      title: TUT[i][0],
      onClose: () => set('touchline.tutorial', 'done'),
    });
    w.dataset.tut = '1';
  };
  UI.acts.tutNext = () => UI.tutorial(Math.min(TUT.length - 1, tutStep + 1));
  UI.acts.tutBack = () => UI.tutorial(Math.max(0, tutStep - 1));
  UI.acts.tutSkip = () => UI.closeSheet();
  UI.acts.tutReplay = () => {
    UI.closeAllSheets();
    UI.tutorial(0);
  };
  // After a new career begins (never on loading a save, never twice)
  const mount = UI.mount;
  UI.mount = function () {
    const r = mount.apply(this, arguments);
    if (UI._newCareer) {
      UI._newCareer = false;
      // (it waits for anything else on screen, such as the season preview, to be closed)
      const tries = { n: 0 },
        show = () => {
          if (get('touchline.tutorial') === 'done' || ++tries.n > 120) return;
          if (document.querySelector('.sheet-wrap') || document.querySelector('.simov')) setTimeout(show, 1000);
          else UI.tutorial(0);
        };
      setTimeout(show, 600);
    }
    return r;
  };

  // ---------------- Error log ----------------
  const LOG = 'touchline.errors';
  const readLog = () => {
    try {
      return JSON.parse(get(LOG) || '[]');
    } catch (e) {
      return [];
    }
  };
  let told = false;
  const record = (kind, msg, stack) => {
    try {
      const a = readLog(),
        m = String(msg || 'Unknown error').slice(0, 300),
        last = a[a.length - 1];
      if (last && last.m === m) last.n = (last.n || 1) + 1;
      else
        a.push({
          t: Date.now(),
          k: kind,
          m,
          s: String(stack || '')
            .split('\n')
            .slice(0, 5)
            .join('\n')
            .slice(0, 600),
        });
      set(LOG, JSON.stringify(a.slice(-20)));
      if (!told && UI.toast && document.getElementById('app')) {
        told = true;
        UI.toast('Something went wrong. It is logged: Club → Settings → Report a problem sends it.', 4200);
      }
    } catch (e) {
      /* the log itself must never throw */
    }
  };
  window.addEventListener('error', (e) => {
    if (e.message) record('error', e.message, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    record('promise', (r && r.message) || r, r && r.stack);
  });
  UI.errorLog = readLog;
  UI.errorText = () =>
    readLog()
      .map(
        (x) =>
          `${new Date(x.t).toISOString().slice(0, 16).replace('T', ' ')} ${x.k}${x.n > 1 ? ` ×${x.n}` : ''}: ${x.m}${x.s ? '\n  ' + x.s.split('\n').join('\n  ') : ''}`,
      )
      .join('\n');
  UI.helpExtras = () => {
    const n = readLog().length;
    return `<button class="btn sm block" style="margin-top:8px" data-act="tutReplay">🎓 Replay the tutorial</button>${n ? `<div class="row small" style="margin-top:10px"><span class="grow dim">${n} error${n > 1 ? 's' : ''} logged on this device; the problem report includes them</span><button class="btn sm" data-act="errLogClear">Clear</button></div>` : ''}`;
  };
  UI.acts.errLogClear = () => {
    set(LOG, '[]');
    UI.render();
  };
  const diagnostics = UI.diagnostics;
  UI.diagnostics = async function () {
    const base = await diagnostics.apply(this, arguments),
      log = UI.errorText();
    return log ? `${base}\n\nErrors logged on this device:\n${log}` : base;
  };
})();
