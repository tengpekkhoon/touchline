// Developer dashboard: a local web app for running the project's tools and keeping what they report. It is not part of
// the game (nothing here is built, deployed or loaded by the game's own page).
//   npm run dev-tools            then open http://localhost:5190
//
// What it does
//   Run         the test suites, calibration, wonderkid and transfer tests, lint, docs and build as jobs, with live output,
//               a stop button and a history of results kept in .devtools/history.json; two runs of the same job can be
//               compared measure by measure
//   Converter   the real-stats converter (tools/realstats.mjs) on pasted or uploaded CSV/JSON
//   Importer    the historical importer (tools/import-history.mjs) on tables, players and clubs, and the validator for a
//               world definition (tools/worlddef.mjs)
//   Game        the game itself in a frame, with the developer panel switched on (js/devtools.js is only added here)
//
// It listens on 127.0.0.1 only and runs a fixed list of jobs: it never runs a command it was sent.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || process.argv[2] || 5190);
const STORE = path.join(ROOT, '.devtools');
const HISTORY = path.join(STORE, 'history.json');
fs.mkdirSync(STORE, { recursive: true });

// ---------- The jobs it may run ----------
// params: name → { label, default, min, max }; they become numeric `--name value` arguments.
const NODE = process.execPath;
const JOBS = {
  test: {
    label: 'Regression test',
    note: 'sim-test: seeded seasons, invariants, saves',
    cmd: [NODE, 'tools/sim-test.mjs'],
    params: { seasons: { default: 2, min: 1, max: 6 }, seed: { default: 7, min: 1, max: 9999 } },
  },
  suite: {
    label: 'Wider suite',
    note: 'speed, tables, squads, finances, stability',
    cmd: [NODE, 'tools/suite.mjs'],
    params: { seasons: { default: 3, min: 1, max: 30 }, seed: { default: 11, min: 1, max: 9999 } },
  },
  long: {
    label: 'Long run',
    note: '20 seasons without the speed limits',
    cmd: [NODE, 'tools/suite.mjs', '--skip-speed'],
    params: { seasons: { default: 20, min: 4, max: 40 }, seed: { default: 11, min: 1, max: 9999 } },
  },
  calibrate: {
    label: 'Calibration',
    note: 'the game against real football',
    cmd: [NODE, 'tools/calibrate.mjs'],
    params: { seasons: { default: 3, min: 1, max: 12 }, seed: { default: 7, min: 1, max: 9999 } },
  },
  wonderkids: {
    label: 'Wonderkids',
    note: 'how the best prospects turn out',
    cmd: [NODE, 'tools/wonderkids.mjs'],
    params: { seasons: { default: 10, min: 3, max: 20 }, seed: { default: 5, min: 1, max: 9999 } },
  },
  transfers: {
    label: 'Transfer realism',
    note: 'the market against real transfers',
    cmd: [NODE, 'tools/transfer-realism.mjs'],
    params: { seasons: { default: 3, min: 2, max: 8 }, seed: { default: 5, min: 1, max: 9999 } },
  },
  profile: {
    label: 'CPU profile',
    note: 'a sampling profile of a run: where the time goes, by file and function',
    cmd: [NODE, '--cpu-prof', '--cpu-prof-dir=.devtools/prof', 'tools/suite.mjs', '--skip-speed'],
    params: { seasons: { default: 1, min: 1, max: 3 }, seed: { default: 11, min: 1, max: 9999 } },
  },
  regens: { label: 'Regens', note: 'academy intakes aged year by year', cmd: [NODE, 'tools/regens.mjs'], params: {} },
  realstats: {
    label: 'Converter self-test',
    note: 'real-stats converter checks',
    cmd: [NODE, 'tools/realstats.mjs', '--test'],
    params: {},
  },
  worlddef: {
    label: 'World definition test',
    note: 'export, validate, edit, load, play',
    cmd: [NODE, 'tools/worlddef.mjs', '--test'],
    params: {},
  },
  import: {
    label: 'Importer test',
    note: 'tables, players, clubs into a world',
    cmd: [NODE, 'tools/import-history.mjs', '--test'],
    params: {},
  },
  docs: { label: 'Docs check', note: 'docs agree with the data', cmd: [NODE, 'tools/check-docs.mjs'], params: {} },
  lint: { label: 'Lint', note: 'eslint', cmd: [NODE, 'node_modules/eslint/bin/eslint.js', '.'], params: {} },
  format: {
    label: 'Format check',
    note: 'prettier',
    cmd: [NODE, 'node_modules/prettier/bin/prettier.cjs', '--check', '.'],
    params: {},
  },
  build: { label: 'Build', note: 'dist/ as the store and Pages build', cmd: [NODE, 'tools/build.mjs'], params: {} },
};

// ---------- History ----------
let history = [];
try {
  history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
} catch (e) {
  history = [];
}
const saveHistory = () => fs.writeFileSync(HISTORY, JSON.stringify(history.slice(-800)));
// "✓ Goals per match   2.77   real 2.5–2.9" → { name, value, ok, range }
const METRIC = /^([✓✗·])\s+(.+?)\s{2,}(-?\d[\d.,]*|—)\s+real\s+(.+)$/;
const parseOutput = (text) => {
  const metrics = [];
  for (const line of text.split('\n')) {
    const m = line.match(METRIC);
    if (m)
      metrics.push({
        ok: m[1] === '✓' ? true : m[1] === '✗' ? false : null,
        name: m[2].trim(),
        value: m[3],
        range: m[4].trim(),
      });
  }
  const sp = text.match(
    /league day (\d+) ms avg, (\d+) ms p99 \u00b7 pre-season day (\d+) ms \u00b7 season (\d+) s \u00b7 save ([\d.]+) MB/,
  );
  const perf = sp ? { dayMs: +sp[1], dayP99: +sp[2], preMs: +sp[3], seasonSecs: +sp[4], saveMB: +sp[5] } : undefined;
  const t = text.slice(-4000);
  const ratio = t.match(/(\d+)\/(\d+) in range/);
  const summary = ratio
    ? `${ratio[1]}/${ratio[2]} in range`
    : /All checks passed|all checks passed/.test(t)
      ? 'All checks passed'
      : /\bFAIL\b|Failures:/.test(t)
        ? 'Failed'
        : '';
  return perf ? { metrics, summary, perf } : { metrics, summary };
};

// ---------- Running ----------
const running = new Map(); // id → { rec, proc, out, listeners }
let nextId = history.reduce((m, r) => Math.max(m, r.id), 0) + 1;
function startRun(jobId, params = {}, opts = {}) {
  const job = JOBS[jobId];
  if (!job) throw new Error('Unknown job');
  const args = [];
  const used = {};
  for (const [k, p] of Object.entries(job.params)) {
    const v = Math.round(Math.min(p.max, Math.max(p.min, +(params[k] ?? p.default))));
    args.push('--' + k, String(v));
    used[k] = v;
  }
  const rec = {
    id: nextId++,
    job: jobId,
    label: job.label,
    params: used,
    started: Date.now(),
    ended: null,
    code: null,
    summary: '',
    metrics: [],
    tail: '',
  };
  if (opts.tune) rec.tune = opts.tune;
  if (opts.group) rec.group = opts.group;
  const env = { ...process.env, FORCE_COLOR: '0' };
  if (opts.tune) env.TOUCHLINE_TUNE = JSON.stringify(opts.tune);
  const proc = spawn(job.cmd[0], [...job.cmd.slice(1), ...args], { cwd: ROOT, env });
  const r = { rec, proc, out: '', listeners: new Set() };
  running.set(rec.id, r);
  const feed = (d) => {
    const s = d.toString();
    r.out += s;
    if (r.out.length > 400000) r.out = r.out.slice(-300000);
    for (const l of r.listeners) l(s);
  };
  proc.stdout.on('data', feed);
  proc.stderr.on('data', feed);
  const done = new Promise((resolve) =>
    proc.on('close', (code) => {
      rec.ended = Date.now();
      rec.code = code;
      Object.assign(rec, parseOutput(r.out));
      rec.tail = r.out.slice(-6000);
      try {
        rec.head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
        if (jobId === 'build' && code === 0) rec.size = recordBuildSize(r.out);
        if (jobId === 'profile') {
          const f = fs
            .readdirSync(PROF_DIR)
            .filter((x) => x.endsWith('.cpuprofile'))
            .map((x) => [x, fs.statSync(path.join(PROF_DIR, x)).mtimeMs])
            .sort((x, y) => y[1] - x[1])[0];
          if (f && f[1] >= rec.started - 2000) rec.profile = f[0];
        }
      } catch (e) {
        // (the run is still recorded)
      }
      history.push(rec);
      saveHistory();
      for (const l of r.listeners) l(null);
      running.delete(rec.id);
      resolve(rec);
    }),
  );
  return { rec, done };
}
const start = (jobId, params, opts) => startRun(jobId, params, opts).rec;

// Run a tool once and wait for it (the converter and importer)
const runOnce = (args, timeout = 300000) =>
  new Promise((resolve) => {
    const p = spawn(NODE, args, { cwd: ROOT });
    let out = '';
    const t = setTimeout(() => p.kill(), timeout);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => {
      clearTimeout(t);
      resolve({ code, out });
    });
  });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'touchline-dev-'));

// ---------- Comparing runs ----------
const num = (v) => parseFloat(String(v).replace(/,/g, ''));
// "2.5–2.9" → [2.5, 2.9]; "70–" → [70, Infinity]
const parseRange = (r) => {
  const m = String(r).match(/^(-?[\d.]+)\s*[–-]\s*(-?[\d.]*)\s*$/);
  return m ? [parseFloat(m[1]), m[2] === '' ? Infinity : parseFloat(m[2])] : null;
};
// A run against a baseline run of the same job: what left its range, what came back, what moved a lot
function compareRuns(cur, base) {
  const out = { regressions: [], improved: [], moved: [], note: '' };
  if (!base) return out;
  if (JSON.stringify(cur.params) !== JSON.stringify(base.params))
    out.note = `baseline #${base.id} used other settings (${Object.entries(base.params)
      .map(([k, v]) => k + ' ' + v)
      .join(', ')})`;
  if (cur.code !== 0 && base.code === 0)
    out.regressions.push({ name: 'The job', text: 'failed (it passed in the baseline)' });
  const before = Object.fromEntries((base.metrics || []).map((m) => [m.name, m]));
  for (const m of cur.metrics || []) {
    const b = before[m.name];
    if (!b) continue;
    if (b.ok === true && m.ok === false)
      out.regressions.push({ name: m.name, text: `now out of range: ${b.value} → ${m.value} (real ${m.range})` });
    else if (b.ok === false && m.ok === true)
      out.improved.push({ name: m.name, text: `back in range: ${b.value} → ${m.value}` });
    else {
      const x = num(m.value),
        y = num(b.value),
        rg = parseRange(m.range);
      const width = rg && Number.isFinite(rg[1]) ? rg[1] - rg[0] : Math.abs(y) * 0.5;
      if (!Number.isNaN(x) && !Number.isNaN(y) && width > 0 && Math.abs(x - y) > 0.15 * width)
        out.moved.push({ name: m.name, text: `${b.value} → ${m.value}` });
    }
  }
  const ratio = (x) => (x && x.summary ? x.summary.match(/^(\d+)\/(\d+) in range/) : null);
  const rc = ratio(cur),
    rb = ratio(base);
  if (rc && rb && +rc[1] < +rb[1]) out.regressions.push({ name: 'Measures in range', text: `${rb[1]} → ${rc[1]}` });
  return out;
}
// Several runs of one job (seeds, or settings) as one table: per measure, the mean, spread and how many runs were in range
function aggregate(recs) {
  const by = new Map();
  for (const r of recs)
    for (const m of r.metrics || []) {
      if (!by.has(m.name)) by.set(m.name, { name: m.name, range: m.range, values: [], oks: [] });
      const e = by.get(m.name),
        v = num(m.value);
      if (!Number.isNaN(v)) e.values.push(v);
      e.oks.push(m.ok);
    }
  return [...by.values()].map((e) => {
    const n = e.values.length,
      mean = n ? e.values.reduce((a, b) => a + b, 0) / n : NaN,
      rg = parseRange(e.range);
    return {
      name: e.name,
      range: e.range,
      n,
      mean,
      min: n ? Math.min(...e.values) : NaN,
      max: n ? Math.max(...e.values) : NaN,
      inRange: e.oks.filter((x) => x === true).length,
      runs: e.oks.length,
      meanOk: rg && n ? mean >= rg[0] && mean <= rg[1] : null,
    };
  });
}

// ---------- Baselines ----------
const BASE_FILE = path.join(STORE, 'baselines.json');
let baselines = {};
try {
  baselines = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
} catch (e) {
  baselines = {};
}
const saveBaselines = () => fs.writeFileSync(BASE_FILE, JSON.stringify(baselines));
const baselineOf = (job) => (baselines[job] ? history.find((r) => r.id === baselines[job]) : null);

// ---------- Groups: gate, seed matrix, sweep ----------
const GROUP_FILE = path.join(STORE, 'groups.json');
let groups = [];
try {
  groups = JSON.parse(fs.readFileSync(GROUP_FILE, 'utf8'));
} catch (e) {
  groups = [];
}
let nextGroup = groups.reduce((m, g) => Math.max(m, g.id), 0) + 1;
const saveGroups = () => fs.writeFileSync(GROUP_FILE, JSON.stringify(groups.slice(-100)));
const runById = (id) => history.find((r) => r.id === id);
const MAXPAR = Math.max(1, Math.min(4, os.cpus().length - 1));

async function runGroup(group, concurrency) {
  let i = 0;
  const worker = async () => {
    while (i < group.items.length && !group.stopped) {
      const item = group.items[i++];
      item.status = 'running';
      const { rec, done } = startRun(item.job, item.params, { tune: item.tune, group: group.id });
      item.runId = rec.id;
      saveGroups();
      await done;
      item.status = rec.code === 0 ? 'done' : 'failed';
      saveGroups();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, group.items.length) }, worker));
  group.items.forEach((it) => it.status === 'queued' && (it.status = 'skipped'));
  group.status = group.stopped ? 'stopped' : 'done';
  group.ended = Date.now();
  group.result = finalize(group);
  saveGroups();
}
function finalize(g) {
  const recs = g.items.map((it) => runById(it.runId));
  if (g.kind === 'gate') {
    const items = g.items.map((it, k) => {
      const rec = recs[k];
      if (!rec) return { job: it.job, label: JOBS[it.job].label, verdict: 'skipped' };
      const base = baselineOf(it.job);
      const cmp = compareRuns(rec, base);
      const verdict = rec.code !== 0 ? 'failed' : cmp.regressions.length ? 'regressed' : base ? 'ok' : 'no baseline';
      return {
        job: it.job,
        label: rec.label,
        runId: rec.id,
        summary: rec.summary,
        verdict,
        baselineId: base && base.id,
        ...cmp,
      };
    });
    const bad = items.filter((x) => ['failed', 'regressed'].includes(x.verdict)).length;
    return { items, verdict: g.stopped ? 'stopped' : bad ? 'fail' : 'pass', bad };
  }
  if (g.kind === 'matrix') {
    const ok = recs.filter(Boolean);
    return {
      measures: aggregate(ok),
      passed: ok.filter((r) => r.code === 0).length,
      runs: ok.length,
      summaries: ok.map((r) => ({ id: r.id, seed: r.params.seed, summary: r.summary, code: r.code })),
    };
  }
  if (g.kind === 'sweep') {
    const values = g.values.map((v) => {
      const mine = g.items
        .map((it, k) => [it, recs[k]])
        .filter(([it, r]) => r && (it.tune ? it.tune[g.path] === v : v === null));
      const rs = mine.map(([, r]) => r);
      const measures = aggregate(rs);
      return {
        value: v,
        measures,
        inRange: measures.filter((m) => m.meanOk === true).length,
        total: measures.length,
        passed: rs.filter((r) => r.code === 0).length,
        runs: rs.length,
      };
    });
    return { path: g.path, values };
  }
  return null;
}
const newGroup = (kind, label, items, extra = {}) => {
  const g = {
    id: nextGroup++,
    kind,
    label,
    created: Date.now(),
    status: 'running',
    items: items.map((it) => ({ ...it, status: 'queued' })),
    ...extra,
  };
  groups.push(g);
  saveGroups();
  return g;
};
const stopGroup = (id) => {
  const g = groups.find((x) => x.id === id);
  if (!g || g.status !== 'running') return false;
  g.stopped = true;
  for (const it of g.items) if (it.status === 'running' && running.get(it.runId)) running.get(it.runId).proc.kill();
  return true;
};
// A group that was going when the server stopped is not coming back
for (const g of groups)
  if (g.status === 'running') {
    g.status = 'stopped';
    g.items.forEach((it) => ['queued', 'running'].includes(it.status) && (it.status = 'skipped'));
  }

const GATES = {
  quick: {
    label: 'Quick gate',
    jobs: [['docs'], ['lint'], ['format'], ['realstats'], ['worlddef'], ['import'], ['suite', { seasons: 1 }]],
    par: 3,
  },
  full: {
    label: 'Full gate',
    jobs: [
      ['docs'],
      ['lint'],
      ['format'],
      ['realstats'],
      ['worlddef'],
      ['import'],
      ['test', { seasons: 2 }],
      ['suite', { seasons: 3 }],
      ['calibrate', { seasons: 3 }],
      ['wonderkids', { seasons: 10 }],
      ['transfers', { seasons: 3 }],
    ],
    par: MAXPAR,
  },
};

// ---------- Trends: a measure across the runs of one job ----------
function trends(job, seasons) {
  const runs = history.filter(
    (r) =>
      r.job === job && !r.tune && r.metrics && r.metrics.length && (seasons == null || r.params.seasons === seasons),
  );
  if (!runs.length) return { runs: [], series: [] };
  const names = [];
  for (const r of runs) for (const m of r.metrics) if (!names.includes(m.name)) names.push(m.name);
  const recent = runs.slice(-40);
  return {
    runs: recent.map((r) => ({ id: r.id, t: r.started, params: r.params, summary: r.summary })),
    series: names.map((name) => {
      const pts = recent
        .map((r) => ({ id: r.id, m: r.metrics.find((m) => m.name === name) }))
        .filter((p) => p.m)
        .map((p) => ({ id: p.id, v: num(p.m.value), ok: p.m.ok }));
      const last = recent[recent.length - 1].metrics.find((m) => m.name === name);
      const first = pts[0] && pts[0].v,
        end = pts[pts.length - 1] && pts[pts.length - 1].v;
      return {
        name,
        range: last ? parseRange(last.range) : null,
        pts,
        drift: pts.length > 2 && !Number.isNaN(first) && !Number.isNaN(end) ? end - first : 0,
      };
    }),
  };
}

// ---------- Tuning constants (found by loading the game once) ----------
let tunables = null;
async function getTunables() {
  if (!tunables) {
    const { loadSim, listTunables } = await import('./harness.mjs');
    tunables = listTunables(loadSim(1).FM);
  }
  return tunables;
}

// ---------- The world host: one headless world to look inside ----------
let host = null,
  hostSeq = 0,
  hostProgress = null;
const hostWait = new Map();
function ensureHost() {
  if (host) return host;
  host = fork(path.join(ROOT, 'tools/worldhost.mjs'), [], {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  host.on('message', (m) => {
    if (m.progress) hostProgress = { ...m.progress, at: Date.now() };
    else if (m.id && hostWait.has(m.id)) {
      hostWait.get(m.id)(m);
      hostWait.delete(m.id);
    }
  });
  host.on('exit', () => {
    for (const f of hostWait.values()) f({ ok: false, error: 'The world host stopped' });
    hostWait.clear();
    host = null;
    hostProgress = null;
  });
  return host;
}
const hostCall = (cmd, args) =>
  new Promise((resolve) => {
    const h = ensureHost();
    const id = ++hostSeq;
    hostWait.set(id, resolve);
    hostProgress = null;
    h.send({ id, cmd, args });
  });
const HOST_CMDS = new Set([
  'newWorld',
  'loadSave',
  'exportSave',
  'overview',
  'clubs',
  'club',
  'players',
  'player',
  'table',
  'feed',
  'scan',
  'advance',
  'matchLab',
  'inspectSave',
  'loadDef',
  'timeline',
  'ping',
]);

// ---------- Reference world: the base world's clubs and the converter, for the data tools ----------
// Made once on first use and kept (a world is a few hundred MB, so it is only built when a data tool needs it).
let ref = null;
async function getRef() {
  if (!ref) {
    const { loadSim } = await import('./harness.mjs');
    const { FM } = loadSim(4);
    FM.W.newWorld(FM.W.REAL_RULES);
    FM.Season.init();
    const S = FM.S;
    ref = {
      FM,
      S,
      clubs: Object.values(S.clubs).map((c) => ({
        id: c.id,
        name: c.name,
        short: c.short,
        nick: c.nick || '',
        league: c.comp,
        nat: c.nat,
      })),
      leagues: Object.values(S.comps)
        .filter((c) => c.type === 'league')
        .map((c) => ({ id: c.id, name: c.name, short: c.short, tier: c.tier })),
      nations: Object.keys(FM.D.NATIONS),
      baseDef: JSON.stringify(FM.WorldDef.fromState(S, { name: 'Base world', players: false })),
    };
  }
  return ref;
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
// Converter against ratings you trust: how far off, and the offset and spread that would fit them best
async function calibrate(rows, league) {
  const { FM } = await getRef();
  const RS = FM.RealStats;
  const keep = RS.TUNE ? { ...RS.TUNE } : null;
  const usable = [];
  const skipped = [];
  for (const r of rows) {
    const expected = parseFloat(r.expected ?? r.expectedCA ?? r.ca);
    if (Number.isNaN(expected)) {
      skipped.push(`${r.name || '?'}: no expected value`);
      continue;
    }
    usable.push({ row: { league, ...r }, expected, name: r.name || '' });
  }
  const run = (offset, spread) => {
    RS.TUNE.offset = offset;
    RS.TUNE.spread = spread;
    return usable.map((u) => {
      try {
        const x = RS.convert(u.row);
        return { ca: x.ca, pos: x.pos, conf: x.confidence };
      } catch (e) {
        return { error: e.message };
      }
    });
  };
  try {
    const now = run(keep.offset, keep.spread);
    const good = usable.map((u, i) => [u, now[i]]).filter(([, p]) => !p.error);
    for (const [u, p] of usable.map((u, i) => [u, now[i]])) if (p.error) skipped.push(`${u.name}: ${p.error}`);
    const err = (preds) => good.map(([u], i) => preds[i] - u.expected);
    const stats = (e) => ({
      n: e.length,
      bias: mean(e),
      mae: mean(e.map(Math.abs)),
      rmse: Math.sqrt(mean(e.map((x) => x * x))),
    });
    const preds = good.map(([, p]) => p.ca);
    const corr = (() => {
      const xs = good.map(([u]) => u.expected),
        mx = mean(xs),
        my = mean(preds);
      const cov = mean(xs.map((x, i) => (x - mx) * (preds[i] - my)));
      return (
        cov / (Math.sqrt(mean(xs.map((x) => (x - mx) ** 2))) * Math.sqrt(mean(preds.map((y) => (y - my) ** 2))) || 1)
      );
    })();
    // a grid of offset and spread; the best by mean squared error
    let best = null;
    const goodRows = good.map(([u]) => u);
    for (let offset = -12; offset <= 12; offset += 1)
      for (let spread = 3; spread <= 24; spread += 1) {
        RS.TUNE.offset = offset;
        RS.TUNE.spread = spread;
        const e = goodRows.map((u) => {
          try {
            return RS.convert(u.row).ca - u.expected;
          } catch (er) {
            return 0;
          }
        });
        const m = mean(e.map((x) => x * x));
        if (!best || m < best.mse) best = { offset, spread, mse: m };
      }
    const bestPreds = good.length
      ? run(best.offset, best.spread)
          .filter((p) => !p.error)
          .map((p) => p.ca)
      : [];
    const byGroup = {};
    good.forEach(([u, p], i) => {
      const g = FM.D.POS_GROUP[p.pos];
      (byGroup[g] = byGroup[g] || []).push(preds[i] - u.expected);
    });
    return {
      current: { ...stats(err(preds)), corr, offset: keep.offset, spread: keep.spread },
      best: good.length
        ? { offset: best.offset, spread: best.spread, ...stats(good.map(([u], i) => bestPreds[i] - u.expected)) }
        : null,
      byGroup: Object.fromEntries(Object.entries(byGroup).map(([g, e]) => [g, { n: e.length, bias: mean(e) }])),
      rows: good.map(([u, p], i) => ({
        name: u.name,
        pos: p.pos,
        expected: u.expected,
        predicted: p.ca,
        error: p.ca - u.expected,
        atBest: bestPreds[i],
        confidence: p.conf,
      })),
      skipped,
    };
  } finally {
    if (keep) Object.assign(RS.TUNE, keep);
  }
}

// ---------- Release and health ----------
const sh = (cmd, args, timeout = 20000) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout, windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};
function gitInfo() {
  const status = sh('git', ['status', '--porcelain']);
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out;
  const head = sh('git', ['rev-parse', 'HEAD']).out;
  const last = sh('git', ['log', '-1', '--format=%h %s']).out;
  const lr = sh('git', ['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`])
    .out.split(/\s+/)
    .map(Number);
  const remote = sh('git', ['remote', 'get-url', 'origin']).out;
  return {
    branch,
    head,
    last,
    dirty: status.out ? status.out.split('\n').length : 0,
    dirtyFiles: status.out ? status.out.split('\n').slice(0, 8) : [],
    behind: lr[0] || 0,
    ahead: lr[1] || 0,
    remote,
  };
}
function ghInfo() {
  const r = sh(
    'gh',
    ['run', 'list', '--limit', '4', '--json', 'status,conclusion,headSha,displayTitle,createdAt,url,workflowName'],
    25000,
  );
  if (!r.ok) return { error: r.err || 'gh is not available' };
  try {
    return { runs: JSON.parse(r.out) };
  } catch (e) {
    return { error: 'Could not read the run list' };
  }
}
const localBuild = () => {
  try {
    return (fs.readFileSync(path.join(ROOT, 'dist/sw.js'), 'utf8').match(/touchline-([0-9a-f]{6,})/) || [])[1] || null;
  } catch (e) {
    return null;
  }
};
async function siteInfo(remote) {
  const m = String(remote).match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!m) return { error: 'No GitHub remote' };
  const base = `https://${m[1]}.github.io/${m[2]}/`;
  try {
    const t0 = Date.now();
    const page = await fetch(base, { signal: AbortSignal.timeout(15000) });
    const sw = await fetch(base + 'sw.js', { signal: AbortSignal.timeout(15000) });
    const live = sw.ok ? ((await sw.text()).match(/touchline-([0-9a-f]{6,})/) || [])[1] : null;
    return {
      url: base,
      status: page.status,
      ms: Date.now() - t0,
      modified: page.headers.get('last-modified'),
      liveBuild: live,
      localBuild: localBuild(),
    };
  } catch (e) {
    return { url: base, error: String(e.message || e) };
  }
}
// The size of what ships, from the build's own report, kept so the next build can be compared
const SIZE_FILE = path.join(STORE, 'buildsize.json');
function recordBuildSize(text) {
  const m = String(text).match(/js: sim (\d+) KB \+ ui (\d+) KB .*css (\d+) KB/);
  const t = String(text).match(/(\d+) files, (\d+) KB total/);
  if (!m || !t) return null;
  let hist = [];
  try {
    hist = JSON.parse(fs.readFileSync(SIZE_FILE, 'utf8'));
  } catch (e) {
    hist = [];
  }
  const rec = { at: Date.now(), sim: +m[1], ui: +m[2], css: +m[3], files: +t[1], total: +t[2] };
  hist.push(rec);
  fs.writeFileSync(SIZE_FILE, JSON.stringify(hist.slice(-60)));
  return rec;
}
const buildSizes = () => {
  try {
    return JSON.parse(fs.readFileSync(SIZE_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
};
const SMOKE_FILE = path.join(STORE, 'smoke.json');
const readSmoke = () => {
  try {
    return JSON.parse(fs.readFileSync(SMOKE_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
};
const lastRun = (job, filter = () => true) => [...history].reverse().find((r) => r.job === job && !r.tune && filter(r));

async function releaseInfo() {
  const git = gitInfo();
  const docs = (await import('./docsync.mjs')).status();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  let fmVersion = null;
  try {
    fmVersion = (fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8').match(/FM\.VERSION = '([^']+)'/) || [])[1];
  } catch (e) {
    fmVersion = null;
  }
  const gates = groups.filter((g) => g.kind === 'gate' && g.status === 'done').slice(-2);
  const sizes = buildSizes();
  const [gh, site] = await Promise.all([Promise.resolve(ghInfo()), siteInfo(git.remote)]);
  const runInfo = (job, filter) => {
    const r = lastRun(job, filter);
    return r ? { id: r.id, code: r.code, summary: r.summary, at: r.ended || r.started, head: r.head || null } : null;
  };
  return {
    now: Date.now(),
    git,
    gh,
    site,
    docs,
    version: { package: pkg.version, game: fmVersion },
    smoke: readSmoke(),
    sizes: {
      latest: sizes[sizes.length - 1] || null,
      previous: sizes[sizes.length - 2] || null,
      first: sizes[0] || null,
    },
    jobs: Object.fromEntries(
      ['docs', 'lint', 'format', 'realstats', 'worlddef', 'import', 'build'].map((j) => [j, runInfo(j)]),
    ),
    suite: runInfo('suite'),
    gate: gates.length
      ? {
          id: gates[gates.length - 1].id,
          verdict: gates[gates.length - 1].result && gates[gates.length - 1].result.verdict,
          at: gates[gates.length - 1].ended,
          label: gates[gates.length - 1].label,
        }
      : null,
    headChangedSince: (() => {
      // jobs run before the newest commit or edit are not evidence for it
      const last = Math.max(0, ...['docs', 'lint', 'format', 'build'].map((j) => (lastRun(j) || {}).ended || 0));
      return last;
    })(),
  };
}

// ---------- Profiles: a CPU profile of a run, and where the time went ----------
const PROF_DIR = path.join(STORE, 'prof');
fs.mkdirSync(PROF_DIR, { recursive: true });
function summariseProfile(file) {
  const raw = JSON.parse(fs.readFileSync(path.join(PROF_DIR, path.basename(file)), 'utf8'));
  const byId = new Map(raw.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = raw.timeDeltas || [];
  raw.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i + 1] ?? dt[i] ?? 0)));
  const total = [...self.values()].reduce((a, b) => a + b, 0) || 1;
  const nameOf = (n) => n.callFrame.functionName || '(anonymous)';
  const fileOf = (n) => {
    const u = n.callFrame.url || '';
    if (!u)
      return n.callFrame.functionName && n.callFrame.functionName.startsWith('(')
        ? n.callFrame.functionName
        : '(native)';
    return u
      .replace(/^file:\/\/\//, '')
      .split(/[\\/]/)
      .slice(-2)
      .join('/');
  };
  const incl = new Map();
  const visit = (id) => {
    const n = byId.get(id);
    let t = self.get(id) || 0;
    for (const c of n.children || []) t += visit(c);
    incl.set(id, t);
    return t;
  };
  visit(raw.nodes[0].id);
  const fn = new Map();
  const files = new Map();
  for (const n of raw.nodes) {
    const key = `${nameOf(n)}|${fileOf(n)}|${n.callFrame.lineNumber}`;
    const e = fn.get(key) || { name: nameOf(n), file: fileOf(n), line: n.callFrame.lineNumber + 1, self: 0 };
    e.self += self.get(n.id) || 0;
    fn.set(key, e);
    files.set(fileOf(n), (files.get(fileOf(n)) || 0) + (self.get(n.id) || 0));
  }
  // an icicle of the call tree: the heavy branches to a depth of 7
  const tree = (id, depth) => {
    const n = byId.get(id);
    const node = {
      name: nameOf(n),
      file: fileOf(n),
      line: n.callFrame.lineNumber + 1,
      ms: Math.round((incl.get(id) || 0) / 100) / 10,
      self: Math.round((self.get(id) || 0) / 100) / 10,
      children: [],
    };
    if (depth < 7)
      for (const c of (n.children || []).slice().sort((a, b) => incl.get(b) - incl.get(a))) {
        if ((incl.get(c) || 0) / total < 0.012) continue;
        node.children.push(tree(c, depth + 1));
      }
    return node;
  };
  const ms = (us) => Math.round(us / 100) / 10;
  return {
    file: path.basename(file),
    totalMs: ms(total),
    byFile: [...files]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([f, us]) => ({ file: f, ms: ms(us), pct: Math.round((1000 * us) / total) / 10 })),
    byFunction: [...fn.values()]
      .sort((a, b) => b.self - a.self)
      .slice(0, 40)
      .map((e) => ({ ...e, ms: ms(e.self), pct: Math.round((1000 * e.self) / total) / 10 })),
    tree: tree(raw.nodes[0].id, 0),
  };
}
const profiles = () =>
  fs
    .readdirSync(PROF_DIR)
    .filter((f) => f.endsWith('.cpuprofile'))
    .map((f) => ({
      file: f,
      bytes: fs.statSync(path.join(PROF_DIR, f)).size,
      at: fs.statSync(path.join(PROF_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.at - a.at);

// ---------- Performance across runs: what the suite reports about speed ----------
const perfSeries = () =>
  history
    .filter((r) => r.job === 'suite' && r.perf && !r.tune)
    .slice(-60)
    .map((r) => ({ id: r.id, t: r.started, seasons: r.params.seasons, ...r.perf }));

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let b = '';
    req.on('data', (d) => {
      b += d;
      if (b.length > 40e6) reject(new Error('Too large'));
    });
    req.on('end', () => resolve(b));
  });
const json = async (req) => JSON.parse((await readBody(req)) || '{}');

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    // the dashboard
    if (p === '/' || p === '/index.html')
      return send(res, 200, fs.readFileSync(path.join(ROOT, 'tools/dev/index.html')), MIME['.html']);
    // the game, with the developer panel added (it is not in the game's own page)
    if (p.startsWith('/game')) {
      let rel = p.replace(/^\/game\/?/, '') || 'index.html';
      const file = path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
        return send(res, 404, 'Not found', 'text/plain');
      if (rel === 'index.html') {
        let html = fs.readFileSync(file, 'utf8').replace('<head>', '<head><base href="/game/">');
        html = html.replace(
          '<script src="js/native.js',
          '<script src="js/devtools.js"></script>\n    <script src="js/native.js',
        );
        return send(res, 200, html, MIME['.html']);
      }
      if (rel === 'sw.js') return send(res, 200, 'self.addEventListener("fetch",()=>{});', MIME['.js']); // no offline cache in here
      return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
    }
    // API
    if (p === '/api/jobs')
      return send(res, 200, {
        jobs: Object.fromEntries(
          Object.entries(JOBS).map(([k, j]) => [k, { label: j.label, note: j.note, params: j.params }]),
        ),
        running: [...running.values()].map((r) => r.rec),
      });
    if (p === '/api/history')
      return send(
        res,
        200,
        history
          .slice(-200)
          .reverse()
          .map(({ tail, ...r }) => r),
      );
    if (p.startsWith('/api/job/')) {
      const id = +p.split('/').pop();
      const live = running.get(id);
      if (live) return send(res, 200, { ...live.rec, tail: live.out.slice(-6000), running: true });
      const rec = history.find((r) => r.id === id);
      return rec ? send(res, 200, rec) : send(res, 404, { error: 'No such run' });
    }
    if (p.startsWith('/api/stream/')) {
      const id = +p.split('/').pop();
      const live = running.get(id);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      if (!live) {
        res.write('event: done\ndata: {}\n\n');
        return res.end();
      }
      res.write(`data: ${JSON.stringify(live.out)}\n\n`);
      const l = (s) => {
        if (s === null) {
          res.write('event: done\ndata: {}\n\n');
          res.end();
          live.listeners.delete(l);
        } else res.write(`data: ${JSON.stringify(s)}\n\n`);
      };
      live.listeners.add(l);
      req.on('close', () => live.listeners.delete(l));
      return;
    }
    if (p === '/api/run' && req.method === 'POST') {
      const b = await json(req);
      return send(res, 200, start(b.job, b.params));
    }
    if (p === '/api/stop' && req.method === 'POST') {
      const b = await json(req);
      const r = running.get(+b.id);
      if (r) r.proc.kill();
      return send(res, 200, { ok: !!r });
    }
    // the real-stats converter: a CSV or JSON text in, converted players out
    if (p === '/api/convert' && req.method === 'POST') {
      const b = await json(req);
      const dir = tmp();
      const input = path.join(dir, b.format === 'json' ? 'in.json' : 'in.csv');
      const out = path.join(dir, 'out.json');
      fs.writeFileSync(input, b.text || '');
      const args = ['tools/realstats.mjs', input, '--out', out];
      if (b.league) args.push('--league', String(b.league).replace(/[^\w .-]/g, ''));
      const r = await runOnce(args, 60000);
      const players = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
      fs.rmSync(dir, { recursive: true, force: true });
      return send(res, 200, { code: r.code, output: r.out, players });
    }
    // the historical importer: tables, players and clubs in, a world definition out
    if (p === '/api/import' && req.method === 'POST') {
      const b = await json(req);
      const dir = tmp();
      const args = ['tools/import-history.mjs'];
      for (const k of ['tables', 'players', 'clubs'])
        if (b[k] && b[k].trim()) {
          const f = path.join(dir, k + (b[k].trim().startsWith('[') ? '.json' : '.csv'));
          fs.writeFileSync(f, b[k]);
          args.push('--' + k, f);
        }
      const out = path.join(dir, 'world.json');
      args.push('--out', out, '--name', String(b.name || 'Imported world').replace(/[^\w .-]/g, ''));
      const r = await runOnce(args);
      const world = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
      fs.rmSync(dir, { recursive: true, force: true });
      return send(res, 200, { code: r.code, output: r.out, world });
    }
    // a world definition checked against the base world
    if (p === '/api/validate' && req.method === 'POST') {
      const b = await json(req);
      const dir = tmp();
      const f = path.join(dir, 'world.json');
      fs.writeFileSync(f, b.world || '');
      const r = await runOnce(['tools/worlddef.mjs', '--validate', f], 120000);
      fs.rmSync(dir, { recursive: true, force: true });
      return send(res, 200, { code: r.code, output: r.out });
    }
    if (p === '/api/baselines')
      return send(
        res,
        200,
        Object.fromEntries(
          Object.entries(baselines).map(([j, id]) => {
            const r = runById(id);
            return [j, r ? { id, summary: r.summary, started: r.started, params: r.params } : null];
          }),
        ),
      );
    if (p === '/api/baseline' && req.method === 'POST') {
      const b = await json(req);
      if (b.clear) delete baselines[b.job];
      else {
        const r = runById(+b.id);
        if (!r) return send(res, 404, { error: 'No such run' });
        baselines[r.job] = r.id;
      }
      saveBaselines();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/trends') {
      const q = url.searchParams;
      return send(res, 200, trends(q.get('job'), q.get('seasons') ? +q.get('seasons') : null));
    }
    if (p === '/api/compare') {
      const cur = runById(+url.searchParams.get('id'));
      return send(
        res,
        200,
        cur
          ? { ...compareRuns(cur, baselineOf(cur.job)), baseline: baselines[cur.job] || null }
          : { error: 'No such run' },
      );
    }
    if (p === '/api/tunables') return send(res, 200, await getTunables());
    if (p === '/api/groups')
      return send(
        res,
        200,
        groups
          .slice(-40)
          .reverse()
          .map((g) => ({
            id: g.id,
            kind: g.kind,
            label: g.label,
            status: g.status,
            created: g.created,
            ended: g.ended,
            n: g.items.length,
            done: g.items.filter((i) => ['done', 'failed'].includes(i.status)).length,
            verdict: g.result && g.result.verdict,
          })),
      );
    if (p.startsWith('/api/group/') && req.method === 'GET') {
      const g = groups.find((x) => x.id === +p.split('/').pop());
      return g ? send(res, 200, g) : send(res, 404, { error: 'No such group' });
    }
    if (p === '/api/gate' && req.method === 'POST') {
      const b = await json(req);
      const gate = GATES[b.preset];
      if (!gate) return send(res, 400, { error: 'Unknown gate' });
      const g = newGroup(
        'gate',
        gate.label,
        gate.jobs.map(([job, params]) => ({ job, params: params || {} })),
      );
      runGroup(g, gate.par);
      return send(res, 200, { id: g.id });
    }
    if (p === '/api/gate/promote' && req.method === 'POST') {
      const b = await json(req);
      const g = groups.find((x) => x.id === +b.id);
      if (!g || g.kind !== 'gate') return send(res, 404, { error: 'No such gate' });
      for (const it of g.items) {
        const rec = runById(it.runId);
        if (rec && rec.code === 0) baselines[rec.job] = rec.id;
      }
      saveBaselines();
      return send(res, 200, { ok: true });
    }
    if (p === '/api/matrix' && req.method === 'POST') {
      const b = await json(req);
      const job = JOBS[b.job];
      if (!job || !job.params.seed) return send(res, 400, { error: 'That job has no seed' });
      const n = Math.min(10, Math.max(2, +b.count || 4));
      const base = +(b.params && b.params.seed) || job.params.seed.default;
      const items = Array.from({ length: n }, (_, k) => ({
        job: b.job,
        params: { ...(b.params || {}), seed: base + k * 17 },
      }));
      const g = newGroup('matrix', `${job.label} on ${n} seeds`, items, { jobId: b.job });
      runGroup(g, MAXPAR);
      return send(res, 200, { id: g.id });
    }
    if (p === '/api/sweep' && req.method === 'POST') {
      const b = await json(req);
      const job = JOBS[b.job];
      const known = (await getTunables()).find((t) => t.path === b.path);
      if (!job || !job.params.seed || !known) return send(res, 400, { error: 'Unknown job or constant' });
      const values = (b.values || [])
        .map(Number)
        .filter((v) => Number.isFinite(v))
        .slice(0, 8);
      if (!values.length) return send(res, 400, { error: 'No values' });
      const seeds = Math.min(5, Math.max(1, +b.seeds || 2));
      const base = +(b.params && b.params.seed) || job.params.seed.default;
      const items = [];
      for (const v of [null, ...values])
        for (let k = 0; k < seeds; k++)
          items.push({
            job: b.job,
            params: { ...(b.params || {}), seed: base + k * 17 },
            tune: v === null ? undefined : { [b.path]: v },
          });
      const g = newGroup('sweep', `${job.label}: ${b.path}`, items, {
        path: b.path,
        values: [null, ...values],
        jobId: b.job,
        defaultValue: known.value,
      });
      runGroup(g, MAXPAR);
      return send(res, 200, { id: g.id });
    }
    if (p === '/api/group/stop' && req.method === 'POST') {
      const b = await json(req);
      return send(res, 200, { ok: stopGroup(+b.id) });
    }
    if (p === '/api/world/progress') return send(res, 200, hostProgress || {});
    if (p === '/api/world/reset' && req.method === 'POST') {
      if (host) host.kill();
      return send(res, 200, { ok: true });
    }
    if (p.startsWith('/api/world/') && req.method === 'POST') {
      const cmd = p.split('/').pop();
      if (!HOST_CMDS.has(cmd)) return send(res, 404, { error: 'Unknown command' });
      const r = await hostCall(cmd, await json(req));
      return send(res, r.ok ? 200 : 400, r.ok ? r.result : { error: r.error });
    }
    if (p === '/api/def/clubs') {
      const r = await getRef();
      return send(res, 200, { clubs: r.clubs, leagues: r.leagues, nations: r.nations });
    }
    if (p === '/api/def/base') return send(res, 200, (await getRef()).baseDef, 'application/json');
    if (p === '/api/def/validate' && req.method === 'POST') {
      const b = await json(req);
      const r = await getRef();
      return send(res, 200, r.FM.WorldDef.validate(b.def, r.S));
    }
    if (p === '/api/def/convert' && req.method === 'POST') {
      const b = await json(req);
      const { FM } = await getRef();
      const out = (b.rows || []).map((row) => {
        try {
          return { name: row.name, ...FM.RealStats.convert({ league: b.league, ...row }) };
        } catch (e) {
          return { name: row.name, error: e.message };
        }
      });
      return send(res, 200, out);
    }
    if (p === '/api/def/calibrate' && req.method === 'POST') {
      const b = await json(req);
      return send(res, 200, await calibrate(b.rows || [], b.league ?? 'D1'));
    }
    if (p === '/api/release') return send(res, 200, await releaseInfo());
    if (p === '/api/release/run' && req.method === 'POST') {
      const b = await json(req);
      const items = [
        ['docs'],
        ['lint'],
        ['format'],
        ['realstats'],
        ['worlddef'],
        ['import'],
        ['build'],
        ['suite', { seasons: 1 }],
      ];
      if (b.full)
        items.push(
          ['test', { seasons: 2 }],
          ['calibrate', { seasons: 3 }],
          ['wonderkids', { seasons: 10 }],
          ['transfers', { seasons: 3 }],
        );
      const g = newGroup(
        'release',
        b.full ? 'Release check (full)' : 'Release check',
        items.map(([job, params]) => ({ job, params: params || {} })),
      );
      runGroup(g, 3);
      return send(res, 200, { id: g.id });
    }
    if (p === '/api/release/smoke' && req.method === 'POST') {
      const b = await json(req);
      fs.writeFileSync(
        SMOKE_FILE,
        JSON.stringify({
          at: Date.now(),
          opened: b.opened,
          problems: (b.problems || []).slice(0, 30),
          head: gitInfo().head,
        }),
      );
      return send(res, 200, { ok: true });
    }
    if (p === '/api/release/sizes') return send(res, 200, buildSizes());
    if (p === '/api/profiles') return send(res, 200, profiles());
    if (p === '/api/profile/summary') {
      const f = url.searchParams.get('file') || '';
      if (!/^[\w.-]+\.cpuprofile$/.test(f) || !fs.existsSync(path.join(PROF_DIR, f)))
        return send(res, 404, { error: 'No such profile' });
      return send(res, 200, summariseProfile(f));
    }
    if (p.startsWith('/api/profile/file/')) {
      const f = path.basename(p);
      if (!/^[\w.-]+\.cpuprofile$/.test(f) || !fs.existsSync(path.join(PROF_DIR, f)))
        return send(res, 404, { error: 'No such profile' });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${f}"` });
      return res.end(fs.readFileSync(path.join(PROF_DIR, f)));
    }
    if (p === '/api/perf') return send(res, 200, perfSeries());
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});
process.on('exit', () => host && host.kill());
server.listen(PORT, '127.0.0.1', () => console.log(`Touchline developer dashboard: http://localhost:${PORT}`));
