// World definition tool.
//   node tools/worlddef.mjs --export world.json [--no-players]   the base world as a definition
//   node tools/worlddef.mjs --validate world.json               errors and warnings in a definition
//   node tools/worlddef.mjs --test                               self-check (npm run test:worlddef)
import fs from 'node:fs';
import { parseArgs, loadSim } from './harness.mjs';

const args = parseArgs();
const { FM } = loadSim(+(args.seed || 4));
const W = FM.W,
  WD = FM.WorldDef,
  R = FM.RealStats;
const baseWorld = () => {
  W.newWorld(W.REAL_RULES);
  FM.Season.init();
};

if ('export' in args || 'validate' in args) {
  const file = args.export || args.validate;
  baseWorld();
  if ('export' in args) {
    const def = WD.fromState(FM.S, { name: 'Base world', players: !('no-players' in args) });
    fs.writeFileSync(file, WD.stringify(def));
    console.log(
      `Wrote ${def.clubs.length} clubs, ${def.players.length} players, ${def.history.seasons.length} past seasons to ${file}`,
    );
  } else {
    const v = WD.validate(WD.parse(fs.readFileSync(file, 'utf8')), FM.S);
    console.log(`${v.errors.length} errors, ${v.warnings.length} warnings`);
    [...v.errors.map((e) => '✗ ' + e), ...v.warnings.map((w) => '· ' + w)].slice(0, 40).forEach((l) => console.log(l));
    process.exit(v.errors.length ? 1 : 0);
  }
  process.exit(0);
}

if ('test' in args) {
  const fails = [];
  const check = (ok, msg) => ok || fails.push(msg);
  baseWorld();
  const S0 = FM.S;
  const nClubs = Object.keys(S0.clubs).length;
  const def = WD.fromState(S0, { name: 'Test', players: false });
  const v0 = WD.validate(def, S0);
  check(!v0.errors.length, `the base world's own definition has errors: ${v0.errors.slice(0, 3)}`);
  check(def.clubs.length === nClubs, 'export dropped clubs');
  check(
    JSON.stringify(WD.parse(WD.stringify(def))) === JSON.stringify(def),
    'the definition changed through stringify/parse',
  );

  // refusals
  check(WD.validate({}, S0).errors.length > 0, 'an empty object was accepted');
  const bad = JSON.parse(JSON.stringify(def));
  bad.clubs[0].colors = ['red', 'blue'];
  bad.clubs.push({ ...bad.clubs[1], id: 'c_NEWCLUB', name: 'Brand New FC' });
  bad.meta.players = 'replace';
  const vb = WD.validate(bad, S0);
  check(
    vb.errors.some((e) => /colours/.test(e)),
    'bad colours were accepted',
  );
  check(
    vb.errors.some((e) => /new clubs are not supported/.test(e)),
    'a new club was accepted',
  );
  check(
    vb.errors.some((e) => /replace/.test(e)),
    'replace mode was accepted',
  );
  let threw = false;
  try {
    WD.parse(JSON.stringify({ ...def, version: 99 }));
  } catch (e) {
    threw = true;
  }
  check(threw, 'a newer format was read');

  // editing keeps the definition valid
  const E = WD.editor(def, S0);
  const club = def.clubs.find((c) => c.league === 'D1');
  check(!E.setClub(club.id, { rep: 5 }).ok, 'a club rating of 5 was accepted');
  check(
    E.setClub(club.id, {
      name: 'Test Rovers',
      colors: ['#112233', '#ffffff'],
      stadium: { name: 'Test Park', cap: 33333 },
    }).ok,
    'a good club edit was refused',
  );
  const conv = R.convert({
    pos: 'ST',
    age: 24,
    minutes: 2800,
    league: 'D1',
    goals: 22,
    xg: 17,
    shots: 100,
    assists: 5,
    passes: 520,
    passPct: 77,
    keyPasses: 28,
    dribbles: 45,
  });
  const res = E.importPlayers([
    { name: 'Alex Testwood', nat: 'ENG', born: S0.year - 24, club: club.id, ...conv },
    { name: 'No Position', error: 'x' },
  ]);
  check(res.added === 1 && res.errors.length === 1, 'importing converted players: ' + JSON.stringify(res));
  check(
    !E.addPlayer({ fn: 'A', ln: 'B', nat: 'ENG', born: S0.year - 24, pos: 'ST', attrs: { ...conv.attrs, pace: 99 } })
      .ok,
    'attribute 99 was accepted',
  );
  const tbl = def.clubs.filter((c) => c.league === 'D1').map((c) => c.id);
  const past = {
    year: S0.year - 1,
    label: 'Past',
    comps: {
      D1: {
        champion: tbl[0],
        runnerUp: tbl[1],
        table: tbl.map((id, i) => ({
          id,
          p: 38,
          w: 20 - i,
          d: 8,
          l: 10 + i,
          gf: 60 - i,
          ga: 40 + i,
          pts: 68 - 3 * i,
          gd: 20 - 2 * i,
        })),
      },
    },
  };
  check(
    E.addSeason(past).ok,
    'a good past season was refused: ' + JSON.stringify(E.addSeason(past).errors.slice(0, 2)),
  );
  check(E.validate().errors.length === 0, 'the edited definition has errors: ' + E.validate().errors.slice(0, 3));

  // load it into a new world
  const before = FM.S;
  const rep = WD.load(JSON.parse(WD.stringify(def)));
  const S = FM.S;
  check(S !== before, 'load did not make a new world');
  check(
    S.clubs[club.id].name === 'Test Rovers' && S.clubs[club.id].colors[0] === '#112233',
    'the club edit did not reach the world',
  );
  check(
    S.clubs[club.id].stadium.name === 'Test Park' && S.clubs[club.id].stadium.cap === 33333,
    'the stadium edit did not reach the world',
  );
  const p = Object.values(S.players).find((x) => x.fn === 'Alex' && x.ln === 'Testwood');
  check(p && p.clubId === club.id && p.pos === 'ST', 'the imported player is not at his club');
  check(p && Math.abs(p.ca - conv.ca) <= 1, `the imported player's ability is ${p && p.ca}, converted ${conv.ca}`);
  check(rep.playersAdded === 1, `playersAdded ${rep.playersAdded}`);
  const size = W.squad(club.id).length;
  check(size >= 16 && size <= 45, `${club.id} squad is ${size}`);
  check(
    S.archive.length >= 1 && S.archive[0].year === S.year - 1 && S.archive[0].comps.D1.table.length === tbl.length,
    'the past season did not reach the archive',
  );
  FM.Season.init();
  W.takeCharge(club.id, 'Definition Test');
  FM.Season.advance(null);
  FM.Season.advance(null);
  check(FM.S.day >= 2, 'the loaded world would not play');
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'World definition: all checks passed.');
  process.exit(fails.length ? 1 : 0);
}
console.log('usage: node tools/worlddef.mjs --export f.json | --validate f.json | --test');
