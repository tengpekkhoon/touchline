// Runs matchday simulation in a Web Worker (sim-worker.js) with a progress overlay, falling back
// to the main thread (yielding between days so the overlay still paints) when workers are unavailable.
(function () {
  const FM = window.FM,
    UI = FM.UI;
  const R = (FM.SimRunner = {});
  // Everything the season simulation needs, in load order (no UI files)
  R.SCRIPTS = [
    'core',
    'data',
    'clubs',
    'world',
    'engine',
    'season',
    'careers',
    'cups',
    'intl',
    'tiers',
    'contracts',
    'people',
    'scouting',
    'transfers',
    'registration',
    'market',
    'finance',
    'stories',
    'advice',
    'matchday',
    'records',
    'injuries',
    'save',
  ];
  R.broken = false;
  // The save string the worker packed for the state it returned (used once by the next save)
  R.packed = null;
  R.takePacked = (S) => {
    const p = R.packed;
    R.packed = null;
    return p && p.S === S ? p.str : null;
  };
  R.last = null;

  // Scripts for the worker, relative to js/: the bundle in a built app, else the individual files
  R.scripts = function () {
    const bundle = document.querySelector('script[src*="sim.min.js"]');
    if (bundle) return [bundle.getAttribute('src').replace(/^.*\//, '')];
    const core = document.querySelector('script[src*="js/core.js"]');
    const q = core && core.getAttribute('src').includes('?') ? '?' + core.getAttribute('src').split('?')[1] : '';
    return R.SCRIPTS.map((f) => `${f}.js${q}`);
  };
  R.available = () => !R.broken && typeof Worker !== 'undefined' && location.protocol !== 'file:';

  let worker = null,
    ready = null,
    seq = 0;
  function getWorker() {
    if (ready) return ready;
    ready = new Promise((res, rej) => {
      try {
        const q = R.scripts()[0].split('?')[1] || '';
        worker = new Worker(`js/sim-worker.js${q ? '?' + q : ''}`);
        worker.onmessage = (e) => {
          if (e.data.type === 'ready') res(worker);
          else if (e.data.type === 'error') rej(new Error(e.data.message));
        };
        worker.onerror = (e) => rej(new Error(e.message || 'worker failed to start'));
        worker.postMessage({ type: 'init', scripts: R.scripts() });
      } catch (e) {
        rej(e);
      }
    });
    ready.catch(() => {
      ready = null;
      worker = null;
    });
    return ready;
  }
  // Warm the worker up in the background so the first matchday doesn't pay the start-up cost
  R.warm = () => {
    if (R.available())
      getWorker().catch(() => {
        R.broken = true;
      });
  };

  function viaWorker(mode, prog) {
    return getWorker().then(
      (w) =>
        new Promise((res, rej) => {
          const id = ++seq;
          w.onmessage = (e) => {
            const m = e.data;
            if (m.id !== id) return;
            if (m.type === 'progress') prog(m.n, m.label);
            else if (m.type === 'done') {
              FM.S = FM.Save.relink(JSON.parse(m.json));
              R.packed = { S: FM.S, str: m.packed };
              res(m.out);
            } else if (m.type === 'error') rej(Object.assign(new Error(m.message), { sim: true })); // the season code threw
          };
          w.onerror = (e) => rej(new Error(e.message || 'worker error'));
          w.postMessage({ type: 'run', id, mode, json: JSON.stringify(FM.S) });
        }),
    );
  }
  // Let the overlay paint between days; browsers pause animation frames in a hidden tab, so don't wait on one then
  const frame = () =>
    new Promise((r) => (document.hidden ? setTimeout(r, 0) : requestAnimationFrame(() => setTimeout(r, 0))));
  async function viaMain(mode, prog) {
    const Sea = FM.Season;
    if (mode !== 'toMatch') {
      prog(0, Sea.dayLabel());
      await frame();
      return { summary: Sea.advance(null), n: 1 };
    }
    const it = Sea.skipSteps();
    let r;
    while (!(r = it.next()).done) {
      prog(...r.value);
      await frame();
    }
    return r.value;
  }

  // ---------- Progress overlay ----------
  // The layer goes up at once (invisible) so no tap can change the old state while the new one is computed;
  // its content only appears if the day takes longer than 180 ms, so quick days never flash
  let ov = null,
    showT = null;
  function show(mode) {
    ov = document.createElement('div');
    ov.className = 'simov wait';
    document.getElementById('app').appendChild(ov);
    showT = setTimeout(() => {
      if (!ov) return;
      ov.classList.remove('wait');
      ov.innerHTML = `<div class="simbox"><div class="simball">⚽</div><div class="h3">${mode === 'toMatch' ? 'Simulating to your next match' : 'Simulating the matchday'}</div><div class="small dim" id="simLabel">Kicking off around the world…</div><div class="simbar"><i></i></div></div>`;
      if (R._label) progress(R._n, R._label);
    }, 180);
  }
  function progress(n, label) {
    R._label = label;
    R._n = n;
    const el = document.getElementById('simLabel');
    if (el) el.textContent = `${n ? `Day ${n + 1} · ` : ''}${label}`;
  }
  function hide() {
    clearTimeout(showT);
    if (ov) ov.remove();
    ov = null;
  }

  // mode: 'day' (advance one day) or 'toMatch' (skip to our next match). Resolves to
  // { summary, n, ... } once FM.S holds the new state, or null if a simulation is already running.
  R.run = async function (mode = 'day') {
    if (UI.simBusy) return null;
    UI.simBusy = true;
    const t0 = performance.now();
    let usedWorker = false;
    R._label = null;
    show(mode);
    try {
      let out = null;
      if (R.available()) {
        try {
          out = await viaWorker(mode, progress);
          usedWorker = true;
        } catch (e) {
          // A bug in the season code would fail on the main thread too, and there it would leave a half-played
          // day behind; the worker only ever touched a copy, so stop here with the world untouched
          if (e.sim) throw e;
          console.warn('Worker unavailable — simulating on the main thread', e);
          R.broken = true;
        }
      }
      if (!out) out = await viaMain(mode, progress);
      return out;
    } catch (e) {
      console.error('Simulation failed', e);
      UI.toast('⚠️ Something went wrong simulating the day. Your save is unchanged — please report this bug.', 6000);
      return null;
    } finally {
      UI.simBusy = false;
      hide();
      R.last = { mode, ms: Math.round(performance.now() - t0), worker: usedWorker };
    }
  };
})();
