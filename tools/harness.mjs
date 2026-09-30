// Shared by the headless tools (sim-test, calibrate, regens): loads the simulation scripts — the same list the Web
// Worker uses, FM.SimRunner.SCRIPTS in js/simrun.js — into a VM context whose Math.random is a seeded generator,
// so every run with the same seed plays out identically.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// --seasons 3 --seed 7 --json  →  { seasons: '3', seed: '7', json: undefined }
export const parseArgs = (argv = process.argv.slice(2)) => Object.fromEntries(argv.join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)));

export const SIM_SCRIPTS = fs.readFileSync(path.join(ROOT, 'js/simrun.js'), 'utf8').match(/R\.SCRIPTS = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));

// Load the simulation with a seeded Math.random. localStorage defaults to a no-op stand-in.
export function loadSim(seed, localStorage = { getItem: () => null, setItem() {}, removeItem() {} }) {
  let s = seed;
  const rng = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const SMath = Object.create(Math); SMath.random = rng;
  const ctx = { console, Math: SMath, setTimeout, performance, localStorage };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of SIM_SCRIPTS) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return { ctx, FM: ctx.FM };
}
