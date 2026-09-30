// Saves: versioned format with step-by-step migrations, a repair pass on every load, and storage
// backends (real files in the native app, IndexedDB in the browser, localStorage as a last resort).
// Also compressed backup export/import. No DOM here, so the headless harness can test migrations.
(function () {
  const FM = window.FM, U = FM.U, W = FM.W;
  const Sv = (FM.Save = {});
  Sv.VERSION = FM.SAVE_VERSION;
  // Saves older than this predate the 20-league world; they cannot be rebuilt into it
  Sv.OLDEST = 4;

  // ---------- Migrations ----------
  // MIG[v] upgrades an unpacked state from version v to v + 1. Never edit a shipped migration:
  // add the next one and bump FM.SAVE_VERSION in core.js.
  const MIG = {
    // v4 → v5 (mobile readiness): fill everything later v4 builds added lazily, mark old feed items read
    4(s) {
      s.settings = Object.assign({ theme: 'dark', speed: 1 }, s.settings);
      (s.news || []).forEach((n) => { if (n.read === undefined) n.read = true; });
      const u = s.user;
      const defaults = { promises: [], talks: {}, trust: 60, board: { year: s.year, meetings: 0 }, nation: null, ntHistory: [], course: null, pendingPrompts: [], shortlist: [], reports: {}, knowledge: {}, assignments: [], history: [], preseason: {}, adviceDone: {}, neg: {} };
      for (const k in defaults) if (u[k] === undefined) u[k] = defaults[k];
      if (u.tactic && u.tactic.fam == null) u.tactic.fam = 55;
    },
    // v5 → v6 (long saves): slimmer retired-player records (no duplicated spells, history kept only for the greats)
    5(s) {
      s.retired = (s.retired || []).map((r) => {
        const car = r.career || {}, spells = (r.spells || car.spells || []).filter((x) => x.apps >= 10).map(({ c, from, to, apps, goals }) => ({ c, from, to, apps, goals }));
        const apps = r.apps != null ? r.apps : car.apps || 0, goals = r.goals != null ? r.goals : car.goals || 0;
        const great = apps >= 450 || spells.some((x) => x.apps >= 200) || (r.cult || 0) >= 40;
        const out = { id: r.id, fn: r.fn, ln: r.ln, nat: r.nat, pos: r.pos, youth: r.youth, spells, apps, goals, cult: r.cult, derbyGoals: r.derbyGoals, year: r.year, lead: r.lead };
        if (r.became) out.became = r.became;
        if (great) Object.assign(out, { great: true, traits: r.traits, history: r.history });
        return out;
      });
    },
  };
  Sv.MIGRATIONS = MIG;

  // In memory the user's tactic and their club's tactic are one object; JSON (saves, the simulation worker)
  // splits them into copies, so point the club back at the tactic the manager actually edits
  Sv.relink = function (s) {
    const c = s.user && s.clubs[s.user.clubId];
    if (c && s.user.tactic) c.tactic = s.user.tactic;
    return s;
  };
  // Consistency fixes on every load: references to players who have since left or retired
  Sv.repair = function (s) {
    Sv.relink(s);
    const u = s.user, has = (id) => id && s.players[id] && !s.players[id].retired;
    const T = u && u.tactic;
    if (T) {
      if (T.lineup) T.lineup = T.lineup.map((id) => (has(id) && s.players[id].clubId === u.clubId ? id : null));
      if (T.capt && !(has(T.capt) && s.players[T.capt].clubId === u.clubId)) T.capt = null;
      if (T.sp) for (const k in T.sp) if (T.sp[k] && !(has(T.sp[k]) && s.players[T.sp[k]].clubId === u.clubId)) T.sp[k] = null;
    }
    if (u && Array.isArray(u.shortlist)) u.shortlist = u.shortlist.filter(has);
    if (Array.isArray(s.news) && s.news.length > 160) s.news.length = 160;
    return s;
  };

  // Upgrade a state in place. Returns the version it started from.
  Sv.upgrade = function (s) {
    const from = s.version || 1;
    if (from < Sv.OLDEST) throw Object.assign(new Error('This save is from an early prototype (before the 20-league world) and can\'t be upgraded. Start a new career — the old save is kept.'), { code: 'too-old' });
    if (from > Sv.VERSION) throw Object.assign(new Error('This save was made by a newer version of Touchline. Update the game to open it.'), { code: 'too-new' });
    for (let v = from; v < Sv.VERSION; v++) {
      if (!MIG[v]) throw Object.assign(new Error(`No upgrade path from save version ${v}.`), { code: 'no-path' });
      MIG[v](s);
      s.version = v + 1;
    }
    Sv.repair(s);
    return from;
  };

  // ---------- Serialise ----------
  // Compact player format (attributes rounded, derived fields dropped) — much smaller saves
  Sv.pack = (s) => JSON.stringify({ ...s, players: W.packPlayers(s.players), pz: 1 });
  // Parse, unpack and upgrade. Returns { state, from }.
  Sv.unpack = function (raw) {
    const st = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!st || typeof st !== 'object' || !st.players || !st.clubs || !st.user) throw Object.assign(new Error('That file is not a Touchline save.'), { code: 'invalid' });
    // Unpacking recomputes ages and values from the save's own date, so it runs with this state current
    const prev = FM.S;
    FM.S = st;
    try {
      if (st.pz) { st.players = W.unpackPlayers(st.players); delete st.pz; }
      const from = Sv.upgrade(st);
      return { state: st, from };
    } finally { FM.S = prev; }
  };
  Sv.meta = (S) => { const c = S.clubs[S.user.clubId] || { id: null, name: `${S.user.name} (out of work)`, short: '—', colors: ['#1b2533', '#0c1118'] }; return { club: { id: c.id, name: c.name, short: c.short, colors: c.colors }, year: S.year, day: S.day, name: S.user.name, version: S.version, saved: Date.now() }; };

  // ---------- Storage backends ----------
  const KEY = (n) => 'touchline.save.' + n;
  const META = (n) => 'touchline.meta.' + n;
  const BACKUP = (n) => 'touchline.backup.' + n;
  Sv.KEY = KEY; Sv.META = META;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: (k) => { try { localStorage.removeItem(k); } catch (e) {} } };
  Sv.ls = ls;

  const IDB = {
    kind: 'idb',
    open() {
      if (IDB._p) return IDB._p;
      IDB._p = new Promise((res, rej) => {
        try {
          const r = indexedDB.open('touchline', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('saves');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
      return IDB._p;
    },
    async put(k, v) { const db = await IDB.open(); return new Promise((res, rej) => { const t = db.transaction('saves', 'readwrite'); t.objectStore('saves').put(v, k); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }); },
    async get(k) { const db = await IDB.open(); return new Promise((res, rej) => { const t = db.transaction('saves', 'readonly'); const q = t.objectStore('saves').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
    async del(k) { const db = await IDB.open(); return new Promise((res) => { const t = db.transaction('saves', 'readwrite'); t.objectStore('saves').delete(k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); },
  };

  // Native app: one file per key in the app's private data folder. Written to a temp file first and
  // renamed, so a crash mid-write never leaves a half-written save.
  const FILES = {
    kind: 'files',
    fs: () => window.Capacitor.Plugins.Filesystem,
    path: (k) => `saves/${k}.json`,
    async put(k, v) {
      const F = FILES.fs(), path = FILES.path(k), tmp = path + '.tmp';
      await F.writeFile({ path: tmp, data: v, directory: 'DATA', encoding: 'utf8', recursive: true });
      try { await F.deleteFile({ path, directory: 'DATA' }); } catch (e) { /* first write */ }
      await F.rename({ from: tmp, to: path, directory: 'DATA', toDirectory: 'DATA' });
      return true;
    },
    async get(k) {
      const F = FILES.fs(), path = FILES.path(k);
      for (const p of [path, path + '.tmp']) { try { return (await F.readFile({ path: p, directory: 'DATA', encoding: 'utf8' })).data; } catch (e) { /* try next */ } }
      return null;
    },
    async del(k) { const F = FILES.fs(), path = FILES.path(k); for (const p of [path, path + '.tmp']) { try { await F.deleteFile({ path: p, directory: 'DATA' }); } catch (e) {} } return true; },
  };

  Sv.native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem);
  Sv.store = () => (Sv.native() ? FILES : IDB);
  Sv.backend = () => (Sv.native() ? 'Device storage (files)' : typeof indexedDB !== 'undefined' ? 'Browser storage (IndexedDB)' : 'Browser storage (basic)');

  // Writes are queued so two saves in quick succession can never interleave
  let queue = Promise.resolve();
  Sv.pending = 0;
  // packed: an already-packed save string for S (the simulation worker prepares one)
  Sv.write = function (slot, S, packed) {
    const json = packed || Sv.pack(S), meta = JSON.stringify(Sv.meta(S));
    ls.set(META(slot), meta);
    ls.set('touchline.last', String(slot));
    Sv.pending++;
    const job = queue.then(async () => {
      const st = Sv.store();
      try {
        await st.put(KEY(slot), json);
        await st.put(META(slot), meta);
        ls.del(KEY(slot)); // an old localStorage copy is now stale
        return true;
      } catch (e) {
        // No IndexedDB (private mode) or the file write failed: fall back to localStorage
        if (ls.set(KEY(slot), json)) return true;
        throw e;
      } finally { Sv.pending--; }
    });
    queue = job.catch(() => {});
    return job;
  };
  Sv.read = async function (slot) {
    let raw = null;
    try { raw = await Sv.store().get(KEY(slot)); } catch (e) {}
    if (!raw && Sv.native()) { try { raw = await IDB.get(KEY(slot)); } catch (e) {} }
    if (!raw) raw = ls.get(KEY(slot));
    return raw || null;
  };
  Sv.remove = async function (slot) {
    ls.del(KEY(slot)); ls.del(META(slot));
    const st = Sv.store();
    await Promise.all([st.del(KEY(slot)), st.del(META(slot)), st.del(BACKUP(slot))].map((p) => p.catch(() => {})));
  };
  // Keep the pre-upgrade save, in case a migration ever gets something wrong (readBackup and remove complete the
  // storage API for a future restore / delete-slot screen)
  Sv.keepBackup = (slot, raw) => Sv.store().put(BACKUP(slot), raw).catch(() => {});
  Sv.readBackup = (slot) => Sv.store().get(BACKUP(slot)).catch(() => null);

  // Title-screen summaries are read synchronously from localStorage. The native app rebuilds that cache
  // from its files at start-up (the OS may clear WebView storage, but never the app's own files).
  Sv.metaOf = function (n) {
    try {
      const m = ls.get(META(n));
      if (m) return JSON.parse(m);
      const raw = ls.get(KEY(n));
      if (!raw) return null;
      const s = JSON.parse(raw), c = s.clubs[s.user.clubId];
      return { club: c, year: s.year, day: s.day, name: s.user.name, version: s.version };
    } catch (e) { return null; }
  };
  Sv.syncMeta = async function () {
    if (!Sv.native()) return;
    for (const n of [1, 2, 3]) {
      try { const m = await FILES.get(META(n)); if (m) ls.set(META(n), m); else if (!(await FILES.get(KEY(n)))) ls.del(META(n)); } catch (e) {}
    }
  };

  // ---------- Backup export / import ----------
  // A .touchline file is the packed save, gzip-compressed when the browser can (about 5× smaller)
  Sv.gzip = async function (str) {
    if (typeof CompressionStream === 'undefined') return new TextEncoder().encode(str);
    const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(cs).arrayBuffer());
  };
  Sv.gunzip = async function (bytes) {
    if (!(bytes[0] === 0x1f && bytes[1] === 0x8b)) return new TextDecoder().decode(bytes);
    if (typeof DecompressionStream === 'undefined') throw Object.assign(new Error('This device can\'t open compressed backups.'), { code: 'no-gzip' });
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(ds).text();
  };
  Sv.exportFile = async function (slot) {
    const raw = await Sv.read(slot), m = Sv.metaOf(slot);
    if (!raw) throw new Error('Nothing saved in that slot yet.');
    const bytes = await Sv.gzip(raw);
    const slug = (m && m.club ? m.club.name : 'career').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { bytes, name: `touchline-${slug}-${m ? m.year : ''}.touchline`, type: 'application/octet-stream' };
  };
  // Returns the upgraded state (throws with a readable message on a bad file)
  Sv.importBytes = async function (bytes) {
    let text;
    try { text = await Sv.gunzip(bytes); } catch (e) { throw e.code ? e : new Error('That file could not be read.'); }
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { throw new Error('That file is not a Touchline save.'); }
    return Sv.unpack(parsed);
  };
})();
