// Regen test: how do academy prospects (and the world's generated youngsters) turn out? Runs the real development
// code year by year with no matches (a quick model of minutes stands in), then reports career shapes — who reaches
// his potential, who flops (stalls, plateaus, burns out), one-season wonders, early primes and long primes — with
// examples, and checks them against expected ranges. Exits non-zero if any check fails.
//   node tools/regens.mjs [--years 20] [--seed 7] [--intakes 5]
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const YEARS = +(args.years || 20), SEED = +(args.seed || 7), INTAKES = +(args.intakes || 5);
const { FM } = loadSim(SEED);
const W = FM.W, Sea = FM.Season, U = FM.U;

W.newWorld({ win: 3, subs: 5, foreignLimit: 6, twoLegs: true, awayGoals: false });
const S = FM.S;
const track = new Map(); // id -> { p, pa0, arc, from: 'intake' | 'world', traj: {age: ca} }
const add = (p, from) => track.set(p.id, { p, pa0: p.pa, arc: p.arc ? p.arc.k : 'none', from, traj: { [W.age(p)]: p.ca }, born: p.born });
Object.values(S.players).forEach((p) => p.clubId && W.age(p) <= 21 && add(p, 'world'));
const steps = Math.floor(S.calendar.length / 4);

// Minutes model: first-teamers play, fringe players a little; under-21s get loan minutes elsewhere
const apps = (p) => {
  const c = S.clubs[p.clubId], lvl = W.levelFor(c.rep), a = W.age(p);
  const own = p.ca >= lvl - 2 ? 30 : p.ca >= lvl - 10 ? 15 : p.ca >= lvl - 20 ? 5 : 0;
  return a <= 21 ? Math.max(own, 15) : own;
};
for (let y = 0; y < YEARS; y++) {
  if (y < INTAKES) { const before = new Set(Object.keys(S.players)); Sea.youthIntake(); for (const id in S.players) if (!before.has(id)) add(S.players[id], 'intake'); }
  for (const t of track.values()) {
    const p = t.p;
    if (p.retired) continue;
    p.season = W.blankSeason(); p.season.apps = apps(p);
    for (let i = 0; i < steps; i++) Sea.develop(p, 1 / steps);
    t.traj[W.age(p)] = p.ca;
  }
  S.year++;
  for (const t of track.values()) if (!t.p.retired && W.age(t.p) >= 30 && Math.random() < Sea.retireChance(t.p)) { t.p.retired = true; t.retired = W.age(t.p) - 1; }
}

// ---- analysis ----
const all = [...track.values()];
for (const t of all) {
  const e = Object.entries(t.traj).map(([a, ca]) => [+a, ca]).sort((x, y) => x[0] - y[0]);
  t.e = e; t.first = e[0];
  const pk = e.reduce((b, x) => (x[1] > b[1] ? x : b), e[0]);
  t.peak = pk[1];
  const top = e.filter((x) => x[1] >= pk[1] - 1); t.peakAge = U.avg(top, (x) => x[0]); // middle of his best spell
  t.lastAge = e[e.length - 1][0];
  t.ratio = (t.peak - t.first[1]) / Math.max(1, t.pa0 - t.first[1]); // share of his head-room he actually grew
  t.at = (a) => { const x = e.find((q) => q[0] === a); return x ? x[1] : null; };
  let jump = 0, jumpAge = null; for (let i = 1; i < e.length; i++) if (e[i][1] - e[i - 1][1] > jump) { jump = e[i][1] - e[i - 1][1]; jumpAge = e[i][0]; }
  t.jump = jump; t.jumpAge = jumpAge;
}
const done = all.filter((t) => t.lastAge >= 27 && t.first[0] <= 18); // followed from 18 or younger to at least 27
const prospects = done.filter((t) => t.pa0 >= 80);
const pc = (n, d) => (d ? (100 * n) / d : 0);
const byArc = {};
for (const t of prospects) (byArc[t.arc] = byArc[t.arc] || []).push(t);
const traj = (t, from = 16, to = 38) => t.e.filter(([a]) => a >= from && a <= to).map(([a, ca]) => `${a}:${Math.round(ca)}`).join(' ');
const name = (t) => `${t.p.fn} ${t.p.ln} (${t.p.pos}, PA ${t.pa0})`;

console.log(`\nRegen test · seed ${SEED} · ${YEARS} years · ${INTAKES} academy intakes · ${all.length} players tracked (${all.filter((t) => t.from === 'intake').length} academy, ${all.filter((t) => t.from === 'world').length} generated youngsters)\n`);
console.log(`Followed from ≤18 to 27+: ${done.length} · prospects (potential 80+): ${prospects.length}`);
console.log('\nProspects by career arc — share of head-room actually grown (1.0 = reached potential), peak age:');
for (const [k, list] of Object.entries(byArc).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${k.padEnd(8)} ${String(list.length).padStart(4)}  grew ${U.avg(list, (t) => t.ratio).toFixed(2)}  peak age ${U.avg(list, (t) => t.peakAge).toFixed(1)}  peak CA ${U.avg(list, (t) => t.peak).toFixed(1)}`);

const peaksAll = done.map((t) => t.peakAge).sort((a, b) => a - b);
const reached = (x) => done.filter((t) => t.peak >= x).length;
console.log(`\nAll followed players: median peak age ${peaksAll[Math.floor(peaksAll.length / 2)]} · reached CA 70+ ${pc(reached(70), done.length).toFixed(1)}% · 80+ ${pc(reached(80), done.length).toFixed(1)}% · 85+ ${reached(85)} players`);

const pick = (list, f) => list.slice().sort((a, b) => f(b) - f(a))[0];
const examples = [
  ['Wonderkid who delivered', pick(prospects.filter((t) => t.arc === 'none'), (t) => t.peak)],
  ['Early prime (Mbappé/Yamal)', pick(all.filter((t) => t.arc === 'early' && t.at(19) != null), (t) => t.at(19))],
  ['Long prime (Messi/Ronaldo)', pick(all.filter((t) => t.arc === 'ageless' && t.lastAge >= 33), (t) => (t.at(33) || 0))],
  ['Flop: stalled', pick(prospects.filter((t) => t.arc === 'stall'), (t) => t.pa0)],
  ['Flop: plateaued', pick(prospects.filter((t) => t.arc === 'plateau'), (t) => t.pa0)],
  ['Flop: burned out', pick(prospects.filter((t) => t.arc === 'burnout'), (t) => t.peak)],
  ['One-season wonder', pick(all.filter((t) => t.arc === 'meteor'), (t) => t.jump)],
];
console.log('\nExamples (age:ability):');
for (const [label, t] of examples) console.log(t ? `  ${label}: ${name(t)}\n    ${traj(t)}` : `  ${label}: none in this run`);

// ---- checks ----
const flops = prospects.filter((t) => ['stall', 'plateau', 'burnout'].includes(t.arc));
const normal = prospects.filter((t) => t.arc === 'none');
const early = all.filter((t) => t.arc === 'early' && t.at(19) != null && t.first[0] <= 16); // followed from academy age
const ageless = all.filter((t) => t.arc === 'ageless' && t.lastAge >= 33 && t.peakAge <= 31);
const agelessKeep = ageless.map((t) => (t.at(33) ?? t.peak) / t.peak);
const normalOld = done.filter((t) => t.arc === 'none' && t.at(33) != null);
const normalKeep = normalOld.map((t) => t.at(33) / t.peak);
const meteors = all.filter((t) => t.arc === 'meteor' && t.jumpAge && t.at(t.jumpAge + 2) != null);
const checks = [
  ['Prospects who flop (stall, plateau or burn out) %', pc(flops.length, prospects.length), 15, 40],
  ['Normal prospects reach most of their potential (share grown)', U.avg(normal, (t) => t.ratio), 0.75, 1.05],
  ['Flops fall well short (share grown)', U.avg(flops.filter((t) => t.arc !== 'burnout'), (t) => t.ratio), 0, 0.65],
  ['Burnouts: ability lost from peak by 29', U.avg(prospects.filter((t) => t.arc === 'burnout' && t.at(29) != null), (t) => t.peak - t.at(29)), 7, 30],
  ['Early primes: share of potential grown by 19', U.avg(early, (t) => (t.at(19) - t.first[1]) / Math.max(1, t.pa0 - t.first[1])), 0.7, 1.1],
  ['Normal prospects: share of potential grown by 19', U.avg(normal.filter((t) => t.at(19) != null), (t) => (t.at(19) - t.first[1]) / Math.max(1, t.pa0 - t.first[1])), 0.2, 0.65],
  ['Long primes: ability kept at 33 (vs peak)', U.avg(agelessKeep, (x) => x), 0.9, 1.01],
  ['Normal players: ability kept at 33 (vs peak)', U.avg(normalKeep, (x) => x), 0.75, 0.93],
  ['One-season wonders: jump in the big year', U.avg(meteors, (t) => t.jump), 5, 15],
  ['One-season wonders: given back within two years', U.avg(meteors, (t) => t.at(t.jumpAge) - t.at(t.jumpAge + 2)), 4, 15],
  ['Median peak age (everyone followed)', peaksAll[Math.floor(peaksAll.length / 2)], 25, 29],
  ['Followed players reaching CA 80+ %', pc(reached(80), done.length), 1, 8],
];
console.log('\nChecks:');
let fail = 0;
for (const [label, v, lo, hi] of checks) {
  const ok = Number.isFinite(v) && v >= lo && v <= hi;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${label.padEnd(62)} ${Number.isFinite(v) ? v.toFixed(2).padStart(6) : '     —'}   expected ${lo}–${hi}`);
}
console.log(`\n${checks.length - fail}/${checks.length} checks passed · samples: ${prospects.length} prospects, ${early.length} early primes, ${ageless.length} long primes, ${meteors.length} one-season wonders`);
process.exit(fail ? 1 : 0);
