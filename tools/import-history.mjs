// Historical data importer: reads historical datasets into a world definition (js/worlddef.js), using the real-stats
// converter (js/realstats.js) for player attributes. The base for historical eras and for club and league packs.
//
//   node tools/import-history.mjs --tables tables.csv [--players players.csv] [--clubs clubs.csv] [--out world.json]
//   node tools/import-history.mjs --dir data/samples/history [--out world.json]      (tables.csv, players.csv, clubs.csv)
//   node tools/import-history.mjs --test
//
// tables.csv   season, league, pos, club, p, w, d, l, gf, ga, pts     one row per club per season (season = the year it
//                                                                       started: 2023 for 2023/24); league is a league id
//                                                                       (D1) or its name; club is a club id (c_MCI), name
//                                                                       or short name
// players.csv  name, nat, born (or age), pos, club, league, minutes, goals, assists, xg, ... (see tools/realstats.mjs)
//                                                                       each row becomes a player at that club, converted
// clubs.csv    club, name, short, nick, city, colour1, colour2, rep, stadium, capacity     changes to clubs already in the world
//
// Clubs are matched against the base world's clubs; whatever cannot be matched is listed and left out. The result is
// validated before it is written. Nothing here invents data: every number comes from the files.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const { FM } = loadSim(+(args.seed || 4));
const W = FM.W,
  WD = FM.WorldDef,
  R = FM.RealStats;

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(fc|afc|cf|sc|ac|as|ssc|sv|fk|bk|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

// The importer: texts in, { def, report } out. `base` is the world it matches clubs and leagues against.
export function importHistory({ tables, players, clubs, name = 'Imported world' }, S = FM.S) {
  const def = WD.fromState(S, { name, players: false });
  def.meta.base = 'import';
  const E = WD.editor(def, S);
  const rep = { seasons: 0, rows: 0, players: 0, clubEdits: 0, unmatched: new Set(), skipped: [], errors: [] };
  const byKey = new Map();
  for (const c of def.clubs) for (const k of [c.id, c.name, c.short, c.nick]) if (k) byKey.set(norm(k), c);
  const club = (x) => byKey.get(norm(x)) || byKey.get(norm(String(x).replace(/^c_/, '')));
  const leagueOf = (x) => {
    const n = norm(x);
    return def.leagues.find((l) => norm(l.id) === n || norm(l.name) === n || norm(l.short) === n);
  };

  // tables → past seasons
  const seasons = new Map();
  for (const row of (tables || []).map(R.clean)) {
    const lg = leagueOf(row.league),
      c = club(row.club);
    if (!lg) {
      rep.skipped.push(`table row ${row.season} ${row.league}: unknown league`);
      continue;
    }
    if (!c) {
      rep.unmatched.add(row.club);
      continue;
    }
    const key = `${row.season}|${lg.id}`;
    if (!seasons.has(key)) seasons.set(key, { year: +row.season, league: lg.id, rows: [] });
    const p = row.p ?? row.w + row.d + row.l;
    seasons.get(key).rows.push({
      id: c.id,
      pos: +row.pos || 0,
      p,
      w: row.w,
      d: row.d,
      l: row.l,
      gf: row.gf,
      ga: row.ga,
      pts: row.pts ?? row.w * def.rules.win + row.d,
      gd: row.gf - row.ga,
    });
    rep.rows++;
  }
  const byYear = new Map();
  for (const s of seasons.values()) {
    s.rows.sort((a, b) => a.pos - b.pos || b.pts - a.pts || b.gd - a.gd);
    s.rows.forEach((r) => delete r.pos);
    if (!byYear.has(s.year))
      byYear.set(s.year, { year: s.year, label: `${s.year}/${String(s.year + 1).slice(2)}`, comps: {} });
    byYear.get(s.year).comps[s.league] = { champion: s.rows[0].id, runnerUp: s.rows[1] && s.rows[1].id, table: s.rows };
  }
  for (const s of [...byYear.values()].sort((a, b) => a.year - b.year)) {
    const r = E.addSeason(s);
    if (r.ok) rep.seasons++;
    else rep.errors.push(...r.errors.map((e) => `season ${s.year}: ${e}`));
  }

  // clubs → edits
  for (const row of (clubs || []).map(R.clean)) {
    const c = club(row.club);
    if (!c) {
      rep.unmatched.add(row.club);
      continue;
    }
    const patch = {};
    for (const k of ['name', 'short', 'nick', 'city']) if (row[k]) patch[k] = row[k];
    if (row.colour1 && row.colour2) patch.colors = [row.colour1, row.colour2];
    if (row.rep) patch.rep = row.rep;
    if (row.stadium || row.capacity)
      patch.stadium = { ...(row.stadium ? { name: row.stadium } : {}), ...(row.capacity ? { cap: row.capacity } : {}) };
    const r = E.setClub(c.id, patch);
    if (r.ok) rep.clubEdits++;
    else rep.errors.push(...r.errors);
  }

  // players → converted
  const converted = [];
  for (const row of (players || []).map(R.clean)) {
    const c = club(row.club);
    if (!c) {
      rep.unmatched.add(row.club);
      continue;
    }
    try {
      const lg = def.leagues.find((l) => l.id === c.league);
      const x = R.convert({
        ...row,
        league: row.league ?? (lg && lg.id) ?? 50,
        age: row.age ?? (row.born ? S.year - row.born : undefined),
      });
      converted.push({
        name: row.name,
        nat: row.nat,
        born: row.born ?? S.year - row.age,
        club: c.id,
        foot: row.foot || 'Right',
        contract: row.contract,
        ...x,
      });
    } catch (e) {
      converted.push({ name: row.name, error: e.message });
    }
  }
  const r = E.importPlayers(converted);
  rep.players = r.added;
  rep.errors.push(...r.errors);
  rep.unmatched = [...rep.unmatched];
  const v = WD.validate(def, S);
  rep.errors.push(...v.errors);
  rep.warnings = v.warnings;
  return { def, report: rep };
}

const readTable = (f) => {
  const t = fs.readFileSync(f, 'utf8');
  return f.endsWith('.json') ? JSON.parse(t) : R.parseCSV(t);
};
const show = (rep) => {
  console.log(
    `${rep.seasons} past season(s) from ${rep.rows} table rows · ${rep.players} players · ${rep.clubEdits} club edits · ${rep.unmatched.length} unmatched names · ${rep.errors.length} errors · ${rep.warnings.length} warnings`,
  );
  if (rep.unmatched.length) console.log('Unmatched clubs (left out): ' + rep.unmatched.slice(0, 20).join(', '));
  for (const l of rep.skipped.slice(0, 10)) console.log('· ' + l);
  for (const e of rep.errors.slice(0, 15)) console.log('✗ ' + e);
  for (const w of rep.warnings.slice(0, 10)) console.log('· ' + w);
};

if ('test' in args) {
  W.newWorld(W.REAL_RULES);
  FM.Season.init();
  const d1 = Object.values(FM.S.clubs).filter((c) => c.comp === 'D1');
  const mk = (year) =>
    ['season,league,pos,club,p,w,d,l,gf,ga,pts']
      .concat(
        d1.map(
          (c, i) =>
            `${year},D1,${i + 1},${i % 2 ? c.name : c.id},38,${20 - i},8,${10 + i},${60 - i},${40 + i},${68 - 3 * i}`,
        ),
      )
      .join('\n');
  const tables = R.parseCSV(
    mk(2022) + '\n' + mk(2023).split('\n').slice(1).join('\n') + '\n2023,D1,99,Not A Real Club,38,1,1,36,5,90,4',
  );
  const players = R.parseCSV(
    `name,nat,born,pos,club,minutes,goals,assists,xg,shots,passes,passPct\nTest Striker,ENG,${FM.S.year - 25},ST,${d1[3].short},2700,20,4,16,95,480,75\nBad Row,ENG,2000,QB,${d1[0].id},900,1,1,1,1,1,70`,
  );
  const clubs = R.parseCSV(`club,name,colour1,colour2,capacity\n${d1[1].id},Renamed Albion,#223344,#eeeeee,40000`);
  const { def, report } = importHistory({ tables, players, clubs, name: 'Test import' });
  const fails = [];
  const check = (ok, msg) => ok || fails.push(msg);
  check(report.seasons === 2, `seasons ${report.seasons}`);
  check(report.unmatched.includes('Not A Real Club'), 'the unknown club was not reported');
  check(
    report.players === 1 && report.errors.some((e) => /Bad Row/.test(e)),
    'player rows: ' + JSON.stringify(report.errors.slice(0, 3)),
  );
  check(
    report.clubEdits === 1 && def.clubs.find((c) => c.id === d1[1].id).name === 'Renamed Albion',
    'the club edit was not made',
  );
  check(
    def.history.seasons.length === 2 && def.history.seasons[0].comps.D1.table.length === d1.length,
    'the seasons are not in the definition',
  );
  check(def.history.seasons[0].comps.D1.champion === d1[0].id, 'the champion is not the club on top of the table');
  // it loads
  const out = WD.load(JSON.parse(WD.stringify(def)));
  check(out.seasons === 2 && out.playersAdded === 1, `loaded ${JSON.stringify(out)}`);
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'Historical importer: all checks passed.');
  process.exit(fails.length ? 1 : 0);
}

const dir = args.dir;
const file = (k, f) => args[k] || (dir && fs.existsSync(path.join(dir, f)) ? path.join(dir, f) : null);
const tf = file('tables', 'tables.csv'),
  pf = file('players', 'players.csv'),
  cf = file('clubs', 'clubs.csv');
if (!tf && !pf && !cf) {
  console.log(
    'usage: node tools/import-history.mjs --tables t.csv [--players p.csv] [--clubs c.csv] [--out world.json] | --dir folder | --test',
  );
  process.exit(1);
}
W.newWorld(W.REAL_RULES);
FM.Season.init();
const { def, report } = importHistory({
  tables: tf && readTable(tf),
  players: pf && readTable(pf),
  clubs: cf && readTable(cf),
  name: args.name || 'Imported world',
});
show(report);
if (args.out && !report.errors.length) {
  fs.writeFileSync(args.out, WD.stringify(def));
  console.log(`Wrote ${args.out}`);
}
process.exit(report.errors.length ? 1 : 0);
