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
import { spawn } from 'node:child_process';
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
const saveHistory = () => fs.writeFileSync(HISTORY, JSON.stringify(history.slice(-300)));
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
  const t = text.slice(-4000);
  const ratio = t.match(/(\d+)\/(\d+) in range/);
  const summary = ratio
    ? `${ratio[1]}/${ratio[2]} in range`
    : /All checks passed|all checks passed/.test(t)
      ? 'All checks passed'
      : /\bFAIL\b|Failures:/.test(t)
        ? 'Failed'
        : '';
  return { metrics, summary };
};

// ---------- Running ----------
const running = new Map(); // id → { rec, proc, out, listeners }
let nextId = history.reduce((m, r) => Math.max(m, r.id), 0) + 1;
function start(jobId, params = {}) {
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
  const proc = spawn(job.cmd[0], [...job.cmd.slice(1), ...args], {
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
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
  proc.on('close', (code) => {
    rec.ended = Date.now();
    rec.code = code;
    Object.assign(rec, parseOutput(r.out));
    rec.tail = r.out.slice(-6000);
    history.push(rec);
    saveHistory();
    for (const l of r.listeners) l(null);
    running.delete(rec.id);
  });
  return rec;
}

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
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Touchline developer dashboard: http://localhost:${PORT}`));
