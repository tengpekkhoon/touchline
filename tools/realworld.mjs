// The game's names, kept apart from the game. Club, league, cup and derby names are data: this tool moves them in and
// out of the source as a database file.
//   node tools/realworld.mjs extract [file]     write the names the source holds now to a database (default
//                                               data/real-world.json)
//   node tools/realworld.mjs placeholders [file] [seed]   swap every club, league, cup and derby name in the source for a
//                                               generated fictional one (club codes, so saves and ids, stay the same)
//   node tools/realworld.mjs apply [file]       put a database's names into the source (default data/real-world.json:
//                                               this is how the real set comes back)
// The files it edits: js/clubs.js (club rows, abbreviations, nicknames, derbies) and js/data.js (league, continental
// and domestic cup names). Run `npm run format` afterwards (the tool does it for you when prettier is installed).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, loadSim } from './harness.mjs';
import { generate } from './worldgen.mjs';

const [cmd, fileArg] = process.argv.slice(2);
const DB = path.resolve(ROOT, fileArg || 'data/real-world.json');
const CLUBS_JS = path.join(ROOT, 'js/clubs.js'),
  DATA_JS = path.join(ROOT, 'js/data.js');

// ---------------------------------------------------------------- read the source
function readSource() {
  const { FM } = loadSim(1);
  const D = FM.D;
  const clubs = {},
    leagues = {};
  for (const l of D.LEAGUES) {
    leagues[l.id] = { nat: l.nat, tier: l.tier, name: l.name, short: l.short };
    for (const row of D[l.clubs]) {
      const info = D.CLUB_INFO[row[1]] || [];
      clubs[row[1]] = { league: l.id, nat: l.nat, row, short: info[0] || '', nick: info[1] || '' };
    }
  }
  return {
    clubs,
    leagues,
    continentals: Object.fromEntries(
      D.CONTINENTALS.map((c) => [c.id, { region: c.region, tier: c.tier || 1, name: c.name, short: c.short }]),
    ),
    cups: Object.fromEntries(D.DOMESTIC_CUPS.map((c) => [c[0], { nat: c[1], name: c[2], short: c[3] }])),
    rivals: D.RIVALS.map(([a, b, name]) => [a, b, name]),
    nations: Object.fromEntries(Object.entries(D.NATIONS).map(([k, n]) => [k, n.name])),
  };
}

// ---------------------------------------------------------------- write into the source
const q = (s) => JSON.stringify(s);
function applyClubs(db) {
  let src = fs.readFileSync(CLUBS_JS, 'utf8');
  const crlf = src.includes('\r\n');
  src = src.replace(/\r\n/g, '\n');
  // rows the formatter spread over several lines come back to one
  src = src.replace(/^(\s*)\[\n((?:\1 {2}.*\n)+?)\1\],$/gm, (all, ind, body) => {
    try {
      const arr = new Function(`return [${body}]`)();
      return Array.isArray(arr) && arr.length >= 7 && typeof arr[1] === 'string' && db.clubs[arr[1]]
        ? `${ind}${JSON.stringify(arr)},`
        : all;
    } catch (e) {
      return all;
    }
  });
  const lines = src.split('\n');
  const rivalIx = new Map(db.rivals.map(([a, b, name]) => [`${a}|${b}`, name]));
  let rows = 0,
    rivals = 0;
  const out = lines.map((line) => {
    const m = line.match(/^(\s*)(\[.*\]),(\s*\/\/.*)?$/);
    if (!m) return line;
    let arr;
    try {
      arr = new Function(`return ${m[2]}`)();
    } catch (e) {
      return line;
    }
    if (!Array.isArray(arr)) return line;
    if (arr.length === 3 && typeof arr[2] === 'string' && rivalIx.has(`${arr[0]}|${arr[1]}`)) {
      rivals++;
      return `${m[1]}[${q(arr[0])}, ${q(arr[1])}, ${q(rivalIx.get(`${arr[0]}|${arr[1]}`))}],`;
    }
    if (arr.length >= 7 && typeof arr[0] === 'string' && typeof arr[1] === 'string' && db.clubs[arr[1]]) {
      const c = db.clubs[arr[1]],
        r = c.row.slice();
      rows++;
      return `${m[1]}[${r.map((v) => (typeof v === 'string' ? q(v) : v)).join(', ')}],`;
    }
    return line;
  });
  src = out.join('\n');
  // abbreviations and nicknames: one "CODE|SHORT|Nickname" line for every club (an empty abbreviation keeps the code)
  const NL = String.fromCharCode(10),
    TICK = String.fromCharCode(96);
  const open = `FM.D.CLUB_INFO = Object.fromEntries(${NL}    ${TICK}`;
  const start = src.indexOf(open) + open.length,
    end = src.indexOf(`${TICK}${NL}      .split(`, start);
  if (start < open.length || end < 0) throw new Error('CLUB_INFO block not found in js/clubs.js');
  const codes = Object.keys(db.clubs);
  src =
    src.slice(0, start) +
    codes.map((c) => `${c}|${db.clubs[c].short || ''}|${db.clubs[c].nick || ''}`).join(NL) +
    src.slice(end);
  const infoLines = codes.length;
  fs.writeFileSync(CLUBS_JS, crlf ? src.replace(/\n/g, '\r\n') : src);
  return { rows, rivals, infoLines };
}
function applyData(db) {
  let src = fs.readFileSync(DATA_JS, 'utf8');
  const crlf = src.includes('\r\n');
  src = src.replace(/\r\n/g, '\n');
  let n = 0;
  const swap = (re, name, short) => {
    const before = src;
    src = src.replace(re, (_, a, _q1, _nm, mid, _q2, _sh) => `${a}${q(name)}${mid}${q(short)}`);
    if (src !== before) n++;
  };
  for (const [id, l] of Object.entries(db.leagues))
    swap(
      new RegExp(
        `(\\bid: '${id}',[\\s\\S]{0,120}?name: )(['"])((?:\\\\.|(?!\\2).)*)\\2([\\s\\S]{0,20}?short: )(['"])([^'"]*)\\5`,
      ),
      l.name,
      l.short,
    );
  for (const [id, c] of Object.entries(db.continentals))
    swap(
      new RegExp(
        `(\\bid: '${id}',[\\s\\S]{0,80}?name: )(['"])((?:\\\\.|(?!\\2).)*)\\2([\\s\\S]{0,20}?short: )(['"])([^'"]*)\\5`,
      ),
      c.name,
      c.short,
    );
  for (const [id, c] of Object.entries(db.cups))
    swap(new RegExp(`(\\['${id}', '[A-Z]+', )(['"])((?:\\\\.|(?!\\2).)*)\\2(, )(['"])([^'"]*)\\5`), c.name, c.short);
  fs.writeFileSync(DATA_JS, crlf ? src.replace(/\n/g, '\r\n') : src);
  return n;
}
function apply(db) {
  const a = applyClubs(db),
    d = applyData(db);
  console.log(
    `Applied: ${a.rows} club rows, ${a.infoLines} abbreviation/nickname lines, ${a.rivals} derbies, ${d} league and competition names.`,
  );
  try {
    execSync('npx prettier --write js/clubs.js js/data.js', { cwd: ROOT, stdio: 'ignore' });
  } catch (e) {
    console.log('(prettier not run: npm run format)');
  }
}

// ---------------------------------------------------------------- commands
if (cmd === 'extract') {
  const real = readSource();
  real.format = 'touchline-names';
  real.version = 1;
  real.note =
    'Club, league, cup and derby names as they were in the game source. Keyed by club code (the part of the id after c_). Apply with: node tools/realworld.mjs apply';
  fs.mkdirSync(path.dirname(DB), { recursive: true });
  fs.writeFileSync(DB, JSON.stringify(real, null, 1) + '\n');
  console.log(
    `Wrote ${path.relative(ROOT, DB)}: ${Object.keys(real.clubs).length} clubs, ${Object.keys(real.leagues).length} leagues, ${Object.keys(real.continentals).length} continental and ${Object.keys(real.cups).length} domestic cups, ${real.rivals.length} derbies.`,
  );
} else if (cmd === 'placeholders') {
  const seed = +(process.argv[4] || 1);
  // the structure comes from the real names file, so this works on a source that already holds placeholders
  const base = fs.existsSync(path.join(ROOT, 'data/real-world.json'))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/real-world.json'), 'utf8'))
    : readSource();
  apply(generate(base, seed));
} else if (cmd === 'apply') {
  apply(JSON.parse(fs.readFileSync(DB, 'utf8')));
} else {
  console.log('Usage: node tools/realworld.mjs extract|placeholders|apply [file]');
  process.exit(1);
}
