// Production build → dist/ (the folder Capacitor packages, and a deployable static site).
// The game files stay plain scripts that share window.FM, so "bundling" is concatenation in
// index.html order + esbuild minification: sim.min.js (engine, also loaded by the Web Worker)
// and ui.min.js (screens). Asset URLs carry a content hash; the service worker's file list and
// cache name are regenerated so installed web apps update cleanly.
//   node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'js'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'css'), { recursive: true });

// Script order comes from index.html; the simulation set from FM.SimRunner.SCRIPTS
const html = rd('index.html');
// (js/devtools.js is the developer's panel: it stays out of every built version)
const order = [...html.matchAll(/<script src="js\/([\w-]+)\.js[^"]*"><\/script>/g)]
  .map((m) => m[1])
  .filter((f) => f !== 'devtools');
const SIM = rd('js/simrun.js')
  .match(/R\.SCRIPTS = \[([^\]]+)\]/)[1]
  .match(/'([^']+)'/g)
  .map((s) => s.slice(1, -1));
const missing = SIM.filter((f) => !order.includes(f));
if (missing.length) throw new Error('Simulation scripts not in index.html: ' + missing.join(', '));
const UIF = order.filter((f) => !SIM.includes(f));

const minify = async (code, loader = 'js') =>
  (
    await transform(code, {
      loader,
      minify: true,
      target: loader === 'js' ? 'es2020' : undefined,
      charset: 'utf8',
      legalComments: 'none',
    })
  ).code;
const out = {};
const emit = (rel, content) => {
  fs.mkdirSync(path.dirname(path.join(DIST, rel)), { recursive: true });
  fs.writeFileSync(path.join(DIST, rel), content);
  out[rel] = content.length;
};

const sim = await minify(SIM.map((f) => `/* ${f}.js */\n${rd(`js/${f}.js`)}`).join('\n;\n'));
const ui = await minify(UIF.map((f) => `/* ${f}.js */\n${rd(`js/${f}.js`)}`).join('\n;\n'));
const worker = await minify(rd('js/sim-worker.js'));
const hSim = hash(sim),
  hUi = hash(ui),
  hWorker = hash(worker);
emit('js/sim.min.js', sim);
emit('js/ui.min.js', ui);
emit('js/sim-worker.js', worker);
const css = await minify(rd('css/app.css'), 'css');
const fonts = await minify(rd('css/fonts.css'), 'css');
emit('css/app.css', css);
emit('css/fonts.css', fonts);
const hCss = hash(css + fonts);

// index.html: the two bundles replace the individual scripts
const scripts = [...html.matchAll(/ *<script src="js\/[\w-]+\.js[^"]*"><\/script>\r?\n/g)];
let page =
  html.slice(0, scripts[0].index) +
  `  <script src="js/sim.min.js?v=${hSim}"></script>\n  <script src="js/ui.min.js?v=${hUi}"></script>\n` +
  html.slice(scripts[scripts.length - 1].index + scripts[scripts.length - 1][0].length);
page = page.replace(/css\/(app|fonts)\.css\?v=[\w]+/g, (m, n) => `css/${n}.css?v=${hCss}`);
emit('index.html', page);

// Static assets
const copyDir = (d) => {
  for (const f of fs.readdirSync(path.join(ROOT, d))) {
    const rel = `${d}/${f}`;
    const buf = fs.readFileSync(path.join(ROOT, rel));
    emit(rel, buf);
  }
};
copyDir('fonts');
copyDir('icons');
emit('manifest.webmanifest', rd('manifest.webmanifest'));

// Service worker: precache exactly what was built
const files = ['./', ...Object.keys(out).map((f) => './' + f)];
const build = hash(hSim + hUi + hWorker + hCss);
let sw = rd('sw.js')
  .replace(/const CACHE = '[^']+';/, `const CACHE = 'touchline-${build}';`)
  .replace(
    /const FILES = \[[\s\S]*?\];/,
    `const FILES = ${JSON.stringify(files, null, 0).replace(/","/g, "', '").replace('["', "['").replace('"]', "']")};`,
  );
emit('sw.js', await minify(sw));

const total = Object.values(out).reduce((a, b) => a + b, 0);
const src = order.reduce((a, f) => a + rd(`js/${f}.js`).length, 0);
console.log(`Built dist/ (build ${build})`);
console.log(
  `  js: sim ${kb(out['js/sim.min.js'])} + ui ${kb(out['js/ui.min.js'])} (source ${kb(src)}) · css ${kb(out['css/app.css'])}`,
);
console.log(`  ${Object.keys(out).length} files, ${kb(total)} total`);
