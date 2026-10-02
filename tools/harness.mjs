// Shared by the headless tools (sim-test, calibrate, regens): loads the simulation scripts — the same list the Web
// Worker uses, FM.SimRunner.SCRIPTS in js/simrun.js — into a VM context whose Math.random is a seeded generator,
// so every run with the same seed plays out identically.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// --seasons 3 --seed 7 --json  →  { seasons: '3', seed: '7', json: undefined }
export const parseArgs = (argv = process.argv.slice(2)) =>
  Object.fromEntries(
    argv
      .join(' ')
      .split('--')
      .filter(Boolean)
      .map((a) => a.trim().split(/\s+/)),
  );

export const SIM_SCRIPTS = fs
  .readFileSync(path.join(ROOT, 'js/simrun.js'), 'utf8')
  .match(/R\.SCRIPTS = \[([^\]]+)\]/)[1]
  .match(/'([^']+)'/g)
  .map((s) => s.slice(1, -1));

// Load the simulation with a seeded Math.random. localStorage defaults to a no-op stand-in.
export function loadSim(seed, localStorage = { getItem: () => null, setItem() {}, removeItem() {} }) {
  let s = seed;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const SMath = Object.create(Math);
  SMath.random = rng;
  const ctx = { console, Math: SMath, setTimeout, performance, localStorage };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of SIM_SCRIPTS)
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  const FM = ctx.FM;
  applyTune(FM, process.env.TOUCHLINE_TUNE);
  return { ctx, FM };
}

// Tuning constants can be overridden for one run without editing the source, to try a value (the developer dashboard's
// parameter sweeps do this): TOUCHLINE_TUNE='{"Transfers.HOME_SCALE":1.2,"Season.LEARN.step":0.02}'. A path names a
// number that already exists under FM; anything else is refused, so a typo cannot silently do nothing.
export function applyTune(FM, text) {
  if (!text) return;
  const tune = typeof text === 'string' ? JSON.parse(text) : text;
  for (const [p, v] of Object.entries(tune)) {
    const parts = p.split('.');
    const key = parts.pop();
    const target = parts.reduce((o, k) => (o == null ? o : o[k]), FM);
    if (!target || typeof target[key] !== 'number' || typeof v !== 'number')
      throw new Error(`Cannot tune "${p}": not a number in the game`);
    target[key] = v;
  }
}

// Every number the game exposes as a tuning constant: capitalised numbers on a module (FM.Transfers.OFFLOAD) and the
// numbers inside capitalised objects (FM.Season.LEARN.step), with their current values.
export function listTunables(FM) {
  const out = [];
  for (const [mod, obj] of Object.entries(FM)) {
    if (!obj || typeof obj !== 'object' || ['D', 'S', 'U', 'Dev'].includes(mod)) continue;
    for (const [k, v] of Object.entries(obj)) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
      if (typeof v === 'number') out.push({ path: `${mod}.${k}`, value: v });
      else if (v && typeof v === 'object' && !Array.isArray(v))
        for (const [k2, v2] of Object.entries(v))
          if (typeof v2 === 'number') out.push({ path: `${mod}.${k}.${k2}`, value: v2 });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
