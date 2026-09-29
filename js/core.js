// Core utilities + global namespace. No build step: every file attaches to window.FM.
(function () {
  const FM = (window.FM = window.FM || {});

  const U = (FM.U = {
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    sum: (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0),
    avg: (arr, f = (x) => x) => (arr.length ? U.sum(arr, f) / arr.length : 0),
    gauss(mean = 0, sd = 1) {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    wpick(arr, wf) {
      const ws = arr.map(wf);
      let t = U.sum(ws) * Math.random();
      for (let i = 0; i < arr.length; i++) {
        t -= ws[i];
        if (t <= 0) return arr[i];
      }
      return arr[arr.length - 1];
    },
    poisson(l) {
      const L = Math.exp(-l);
      let k = 0, p = 1;
      do { k++; p *= Math.random(); } while (p > L);
      return k - 1;
    },
    // Money with enough precision to tell $6.35M from $6.4M
    money(v) {
      const s = v < 0 ? '-' : '';
      v = Math.abs(v);
      const trim = (x, d) => { const t = x.toFixed(d); return t.includes('.') ? t.replace(/\.?0+$/, '') : t; };
      if (v >= 1e9) return s + '$' + trim(v / 1e9, 2) + 'B';
      if (v >= 1e6) return s + '$' + trim(v / 1e6, v >= 1e8 ? 0 : v >= 1e7 ? 1 : 2) + 'M';
      if (v >= 1e3) return s + '$' + trim(v / 1e3, v >= 1e5 ? 0 : 1) + 'K';
      return s + '$' + Math.round(v);
    },
    // Realistic fee granularity: $1K steps under $100K, $10K under $10M, $50K under $50M, then $100K
    roundMoney(v) {
      const step = v < 1e5 ? 1e3 : v < 1e7 ? 1e4 : v < 5e7 ? 5e4 : 1e5;
      return Math.round(v / step) * step;
    },
    moneyStep(v) { return v < 1e5 ? 1e3 : v < 1e6 ? 5e3 : v < 1e7 ? 1e4 : v < 5e7 ? 5e4 : 1e5; },
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },
    hash(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
      return h >>> 0;
    },
    // Contrast-aware text colour for a background hex
    ink(hex) {
      const c = hex.replace('#', '');
      const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0b0f14' : '#ffffff';
    },
    // Grammar helpers
    plural: (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`,
  });

  // Save format version. Bump it with a migration in save.js whenever the saved state changes shape.
  FM.SAVE_VERSION = 6;

  FM.nextId = function (prefix) {
    FM.S.nextId = (FM.S.nextId || 1) + 1;
    return prefix + FM.S.nextId;
  };

  // Tiny event bus for UI refreshes
  const subs = {};
  FM.on = (ev, fn) => ((subs[ev] = subs[ev] || []).push(fn));
  FM.emit = (ev, data) => (subs[ev] || []).forEach((fn) => fn(data));
})();
