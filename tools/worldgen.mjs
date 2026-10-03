// The fictional football world: club, league, cup and derby names that keep the real structure (the same clubs by code,
// leagues, sizes, promotion and relegation, cups and rules) with none of the real identities.
//   node tools/worldgen.mjs [--seed 1] [--out data/fictional-world.json]
// Reads the structure from data/real-world.json (each club's nation, league, kit colours, identity, rank) and writes a
// names database in the same format; `node tools/realworld.mjs apply data/fictional-world.json` puts it into the game.
// Everything is deterministic from the seed, so a world can be regenerated, or another one made with a new seed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- random numbers
const hash = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const rngOf = (seed) => {
  let s = hash(seed);
  const r = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.pick = (a) => a[Math.floor(r() * a.length)];
  return r;
};
const words = (s) => s.trim().split(/\s+/);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- languages
// place: how towns sound (prefixes + endings, and the odd pattern); club: how clubs are named ({c} is the town);
// ground: how stadiums are named ({c} town, {x} a made-up name, {p} a person's surname); colour words for nicknames
const LANG = {
  eng: {
    nations: 'ENG SCO WAL IRL AUS USA RSA GHA NGA',
    a: words(
      'Ash Bar Bex Bran Brad Cal Chel Dar Dor Elm Fen Gil Glen Har Hex Kel Kes Lan Lin Mal Mar Nor Oak Pen Pres Red Rip Sal Sedge Shaf Stan Thorn Tun Wex Whit Wyn Yar Ald Brom',
    ),
    b: words(
      'ford ham ton bury field wick mouth chester worth by ley stead brook dale port minster wood combe bridge thorpe mere wold cliff haven gate borough ing well',
    ),
    mods: ['Upper', 'Lower', 'New', 'West', 'East', 'North', 'South', 'Great', 'Little'],
    club: [
      '{c} Town',
      '{c} City',
      '{c} United',
      '{c} Athletic',
      '{c} Rovers',
      '{c} Albion',
      '{c} Wanderers',
      '{c} Rangers',
      '{c} County',
      '{c} Borough',
      '{c} Victoria',
      '{c} Orient',
    ],
    ground: ['{c} Park', '{x} Road', '{x} Lane', '{c} Ground', 'The {x} Stadium', '{p} Park', '{x} Field', '{x} Park'],
    colours: {
      red: 'Reds',
      blue: 'Blues',
      white: 'Whites',
      black: 'Blacks',
      yellow: 'Yellows',
      green: 'Greens',
      orange: 'Oranges',
      claret: 'Maroons',
      sky: 'Sky Blues',
      navy: 'Navy',
    },
    misc: words(
      'Lions Eagles Wolves Rams Stags Kestrels Otters Badgers Herons Mariners Miners Ironmen Drovers Foresters Chargers Spartans Falcons',
    ),
  },
  spa: {
    nations: 'ESP MEX ARG URU CHI COL VEN PER ECU PAR BOL',
    a: words(
      'Villa Alto Bajo Cerro Costa Monte Puerto Rio Santa San Valle Playa Torre Campo Fuente Nueva Vega Pico Arroyo Cañada Puente Lomas Peña Sierra Río Cabo Bahía Pozo Mesa Prado Roca Llano Cumbre Fortín',
    ),
    b: words('real mar nueva dorada blanca verde alta luna sol norte sur grande bella lara mora rosa'),
    club: [
      '{c} CF',
      'Deportivo {c}',
      'Atlético {c}',
      'Sporting {c}',
      'Racing {c}',
      'Unión {c}',
      'Club {c}',
      'Real {c}',
      '{c} Balompié',
      'CD {c}',
      'UD {c}',
    ],
    ground: [
      'Estadio Municipal de {c}',
      'Estadio {x}',
      'Campo de {c}',
      'Estadio {p}',
      'Estadio La {x}',
      'Nuevo Estadio {c}',
    ],
    colours: {
      red: 'Rojos',
      blue: 'Azules',
      white: 'Blancos',
      black: 'Negros',
      yellow: 'Amarillos',
      green: 'Verdes',
      orange: 'Naranjas',
      claret: 'Granates',
      sky: 'Celestes',
      navy: 'Azulones',
    },
    misc: words(
      'Leones Águilas Lobos Halcones Tiburones Toros Cóndores Jaguares Gladiadores Alacranes Mineros Marineros Venados',
    ),
  },
  por: {
    nations: 'POR BRA',
    a: words('Vila Santa São Porto Monte Praia Serra Ribeira Alto Campo Valverde Bela Boa Nova Torre'),
    b: words('nova mar alegre azul real grande verde bela rio sol lua branca'),
    club: [
      '{c} FC',
      'Sporting {c}',
      'Atlético {c}',
      'Clube {c}',
      '{c} EC',
      'Associação {c}',
      'Esporte Clube {c}',
      'Grémio {c}',
      'União {c}',
      'Racing {c}',
    ],
    ground: ['Estádio {x}', 'Estádio Municipal de {c}', 'Arena {x}', 'Estádio {p}', 'Estádio Nova {x}'],
    colours: {
      red: 'Rubro-Negros',
      blue: 'Azuis',
      white: 'Brancos',
      black: 'Pretos',
      yellow: 'Amarelos',
      green: 'Verdes',
      orange: 'Laranjas',
      claret: 'Grenás',
      sky: 'Celestes',
      navy: 'Azuis-Marinho',
    },
    misc: words('Leões Águias Lobos Tubarões Falcões Tigres Gaviões Onças Corvos Mineiros Marinheiros Veados'),
  },
  ger: {
    nations: 'GER AUT SUI',
    a: words(
      'Alt Berg Dorn Eich Frei Grün Hag Kirch Lind Mühl Neu Rhein Stein Thal Wald Wester Zell Burg Hohen Ober Unter Bad',
    ),
    b: words('burg berg stadt feld bach dorf heim hafen au kirchen tal hausen see ingen furt'),
    club: [
      'SV {c}',
      'FC {c}',
      '{c} SC',
      'TSV {c}',
      'FSV {c}',
      'VfB {c}',
      'VfL {c}',
      'Sportfreunde {c}',
      'SpVgg {c}',
      '{c} 04',
      'Fortuna {c}',
      'Eintracht {c}',
    ],
    ground: ['{c}-Arena', 'Stadion {x}', '{x}-Stadion', 'Sportpark {x}', 'Stadion am {x}', '{p}-Stadion'],
    colours: {
      red: 'Roten',
      blue: 'Blauen',
      white: 'Weißen',
      black: 'Schwarzen',
      yellow: 'Gelben',
      green: 'Grünen',
      orange: 'Orangen',
      claret: 'Weinroten',
      sky: 'Himmelblauen',
      navy: 'Dunkelblauen',
    },
    misc: words('Löwen Adler Wölfe Füchse Falken Bären Bergleute Hirsche Schmiede Fischer Ritter Pioniere'),
  },
  nld: {
    nations: 'NED BEL',
    a: words('Oost West Noord Zuid Hoog Laag Groot Klein Nieuw Oud Berg Dijk Veen Haar Wage'),
    b: words('dam burg hoven stad dijk veen wijk brug horst kerk lo rade zand'),
    club: [
      'FC {c}',
      'SC {c}',
      'RKC {c}',
      'VV {c}',
      'KV {c}',
      'Sparta {c}',
      'AFC {c}',
      'ADO {c}',
      '{c} Boys',
      'Victoria {c}',
    ],
    ground: ['{x} Stadion', 'Stadion {x}', '{c} Arena', 'De {x}', '{p} Stadion'],
    colours: {
      red: 'Rooien',
      blue: 'Blauwen',
      white: 'Witten',
      black: 'Zwarten',
      yellow: 'Geelen',
      green: 'Groenen',
      orange: 'Oranjes',
      claret: 'Bordeauxen',
      sky: 'Hemelsblauwen',
      navy: 'Donkerblauwen',
    },
    misc: words('Leeuwen Arenden Wolven Valken Stieren Zwanen Ruiters Kikkers Spechten Bijen'),
  },
  nor: {
    nations: 'DEN NOR SWE FIN ISL',
    a: words('Nord Syd Øst Vest Stor Lille Ny Gammel Fjord Skov Berg Dal Strand Bro Hav Sol'),
    b: words('by borg sund vik næs holm lund strup gård ø løkke fors dal'),
    club: ['{c} IF', '{c} FK', 'IK {c}', 'FC {c}', '{c} BK', '{c} Boldklub', 'BK {c}', '{c} IL', 'Fremad {c}'],
    ground: ['{x} Stadion', '{c} Arena', '{x} Park', '{p} Stadion', '{x} Idrætspark'],
    colours: {
      red: 'De Røde',
      blue: 'De Blå',
      white: 'De Hvide',
      black: 'De Sorte',
      yellow: 'De Gule',
      green: 'De Grønne',
      orange: 'De Orange',
      claret: 'De Mørkerøde',
      sky: 'De Lyseblå',
      navy: 'De Mørkeblå',
    },
    misc: words('Løver Ørne Ulve Bjørne Falke Elge Vikinger Svaner Rever Bæverne'),
  },
  fra: {
    nations: 'FRA MAR ALG TUN SEN CIV CMR COD MLI BFA GUI',
    a: words('Aub Bel Cha Dur Fon Lan Mon Nan Pon Roc Saint Tour Vil Val Mar Bour Beau Cler Cour Lav'),
    b: words('ville mont eau court ac ens ay on lac gnan lieu bourg sur-mer les-bains'),
    club: ['FC {c}', 'AS {c}', 'US {c}', 'Stade {c}', '{c} FC', 'RC {c}', 'AJ {c}', 'SC {c}', 'Athlétic {c}', 'ES {c}'],
    ground: [
      'Stade {x}',
      'Stade Municipal de {c}',
      'Parc des Sports de {c}',
      'Stade {p}',
      'Stade de la {x}',
      'Complexe {x}',
    ],
    colours: {
      red: 'Rouges',
      blue: 'Bleus',
      white: 'Blancs',
      black: 'Noirs',
      yellow: 'Jaunes',
      green: 'Verts',
      orange: 'Oranges',
      claret: 'Grenats',
      sky: 'Ciel et Blancs',
      navy: 'Marines',
    },
    misc: words('Lions Aigles Loups Faucons Cerfs Lynx Cigognes Mineurs Dragons Marins Forgerons Pionniers'),
  },
  ita: {
    nations: 'ITA',
    a: words('Alba Bor Cas Fer Gal Lan Mon Pie Rav Sant Tor Ven Vil Ser Mar San Val Bel Pon Rocca'),
    b: words('ino ara ento ola etto ate ana ello ona ezia ago ia ello'),
    club: [
      '{c} Calcio',
      'AC {c}',
      'US {c}',
      'Unione {c}',
      '{c} 1908',
      'Virtus {c}',
      'ASD {c}',
      'Atletico {c}',
      'SSC {c}',
      'FC {c}',
    ],
    ground: ['Stadio {x}', 'Stadio Comunale di {c}', 'Stadio {p}', 'Stadio Nuovo {x}', 'Arena {x}'],
    colours: {
      red: 'Rossi',
      blue: 'Azzurri',
      white: 'Bianchi',
      black: 'Neri',
      yellow: 'Gialli',
      green: 'Verdi',
      orange: 'Arancioni',
      claret: 'Granata',
      sky: 'Celesti',
      navy: 'Blu',
    },
    misc: words('Leoni Aquile Lupi Falchi Grifoni Tori Cavalieri Minatori Marinai Cervi Fabbri Pionieri'),
  },
  slav: {
    nations: 'SRB CZE POL GRE HUN ROU SVK SVN BUL CRO BIH UKR RUS',
    a: words('Bor Dra Gor Kra Lub Mal Nov Pol Rad Sla Tar Vel Zag Bel Ples Brat Kos Mir Zel Bog'),
    b: words('ovo grad ice ava ina ovac ica ek in pol ec any'),
    club: [
      'FK {c}',
      '{c} Sokol',
      'Slavia {c}',
      'SK {c}',
      'KS {c}',
      'NK {c}',
      'Union {c}',
      'FC {c}',
      'MFK {c}',
      'AO {c}',
    ],
    ground: ['Stadion {x}', '{x} Arena', 'Gradski Stadion {c}', 'Stadion {p}', '{c} Park'],
    colours: {
      red: 'Crveni',
      blue: 'Plavi',
      white: 'Beli',
      black: 'Crni',
      yellow: 'Žuti',
      green: 'Zeleni',
      orange: 'Narandžasti',
      claret: 'Bordo',
      sky: 'Svetloplavi',
      navy: 'Tamnoplavi',
    },
    misc: words('Orlovi Vukovi Lavovi Sokolovi Medvedi Zmajevi Gavranovi Bikovi Rakete Baroni'),
  },
  tur: {
    nations: 'TUR',
    a: words('Ak Bay Çam Dem Kar Mer Öz Sar Tek Yeni Gül Esk Kız Boz Kara'),
    b: words('ova ehir köy pınar tepe kale lar saray bahçe dere'),
    club: [
      '{c}spor',
      '{c} Belediyespor',
      '{c} SK',
      '{c} FK',
      'Yeni {c}spor',
      '{c} Gençlik',
      '{c} İdman Yurdu',
      '{c} Atletik',
      '{c} Gücü',
      '{c}gücü',
    ],
    ground: ['{x} Stadyumu', '{c} Şehir Stadyumu', '{p} Stadyumu', '{x} Arena', '{c} Cumhuriyet Stadyumu'],
    colours: {
      red: 'Kırmızılar',
      blue: 'Mavililer',
      white: 'Beyazlar',
      black: 'Siyahlar',
      yellow: 'Sarılar',
      green: 'Yeşiller',
      orange: 'Turuncular',
      claret: 'Bordolar',
      sky: 'Gökler',
      navy: 'Lacivertler',
    },
    misc: words('Aslanlar Kartallar Kurtlar Şahinler Boğalar Akbabalar Atmacalar Yıldızlar Kaplanlar Ejderler'),
  },
  jpn: {
    nations: 'JPN',
    a: words('Aka Hoku Kawa Miya Naga Oka Sai Taka Yama Kita Minami Shin Higashi Nishi Fuji Sakura Take Haru Aki Nari'),
    b: words('saki gawa moto hama yama shima mori kami ta no ura hara zawa'),
    club: [
      '{c} FC',
      '{c} United',
      '{c} Athletic',
      '{c} Sport Club',
      '{c} City',
      'FC {c}',
      '{c} Verde',
      '{c} Blaze',
      '{c} Sevens',
      '{c} Phoenix',
    ],
    ground: ['{x} Stadium', '{c} Athletic Stadium', '{x} Arena', '{x} Park', '{c} Sports Complex'],
    colours: {
      red: 'Reds',
      blue: 'Blues',
      white: 'Whites',
      black: 'Blacks',
      yellow: 'Yellows',
      green: 'Greens',
      orange: 'Oranges',
      claret: 'Crimsons',
      sky: 'Sky Blues',
      navy: 'Navy',
    },
    misc: words('Dragons Tigers Phoenixes Hawks Wolves Samurai Warriors Cranes Bears Typhoons'),
  },
  kor: {
    nations: 'KOR CHN',
    a: words('Dae Gang Hae Chung Jeon Gyeong Nam Bu Jin Chun Seo Pyeong Dong Wol Sin Mun'),
    b: words('gu ju san cheon jeong seong ri yang won jin dong hwa'),
    club: ['{c} FC', '{c} United', '{c} Citizen', '{c} Dolphins', 'FC {c}', '{c} Athletic', '{c} Stars', '{c} Tigers'],
    ground: ['{c} Stadium', '{x} Sports Complex', '{x} Arena', '{c} Civic Stadium'],
    colours: {
      red: 'Reds',
      blue: 'Blues',
      white: 'Whites',
      black: 'Blacks',
      yellow: 'Yellows',
      green: 'Greens',
      orange: 'Oranges',
      claret: 'Crimsons',
      sky: 'Sky Blues',
      navy: 'Navy',
    },
    misc: words('Tigers Dragons Eagles Dolphins Hawks Bears Phoenixes Wolves'),
  },
  tha: {
    nations: 'THA IND IDN VIE MYS UZB IRN KSA QAT UAE IRQ',
    a: words('Ban Chiang Nakhon Sri Phra Lam Pak Ubon Sing Mae Nong Kao Phu Tha Wang Khao'),
    b: words('buri pur mai nong kaeo chan ra sai yai thong lek nam'),
    club: ['{c} United', 'FC {c}', '{c} City', '{c} Athletic', '{c} FC', 'Muang {c}', '{c} Rangers', '{c} Mariners'],
    ground: ['{x} Stadium', '{c} Provincial Stadium', '{x} Arena', '{x} Sports Park'],
    colours: {
      red: 'Reds',
      blue: 'Blues',
      white: 'Whites',
      black: 'Blacks',
      yellow: 'Yellows',
      green: 'Greens',
      orange: 'Oranges',
      claret: 'Crimsons',
      sky: 'Sky Blues',
      navy: 'Navy',
    },
    misc: words('Elephants Tigers Eagles Dragons Cobras Hornbills Lions Panthers'),
  },
};
const langOf = (nat) => Object.values(LANG).find((l) => l.nations.split(' ').includes(nat)) || LANG.eng;

const DEMONYM = {
  ENG: 'English',
  SCO: 'Scottish',
  WAL: 'Welsh',
  IRL: 'Irish',
  ESP: 'Spanish',
  GER: 'German',
  FRA: 'French',
  BRA: 'Brazilian',
  ITA: 'Italian',
  POR: 'Portuguese',
  NED: 'Dutch',
  ARG: 'Argentine',
  USA: 'American',
  JPN: 'Japanese',
  MEX: 'Mexican',
  KOR: 'Korean',
  THA: 'Thai',
  NGA: 'Nigerian',
  MAR: 'Moroccan',
  SRB: 'Serbian',
  BEL: 'Belgian',
  TUR: 'Turkish',
  CZE: 'Czech',
  GRE: 'Greek',
  NOR: 'Norwegian',
  POL: 'Polish',
  DEN: 'Danish',
  AUT: 'Austrian',
  SUI: 'Swiss',
  AUS: 'Australian',
  HUN: 'Hungarian',
};
// a league's name: by tier, in the nation's own word for it where there is one
const TIERS = {
  default: ['Premier Division', 'Second Division', 'Third Division', 'Fourth Division', 'Fifth Division'],
  ENG: [
    'Premier Division',
    'National Championship',
    'National League One',
    'National League Two',
    'National League Three',
  ],
  ESP: ['Liga Nacional', 'Segunda Nacional', 'Tercera Nacional', 'Cuarta Nacional', 'Quinta Nacional'],
  GER: ['Nationalliga', 'Zweite Nationalliga', 'Dritte Nationalliga', 'Vierte Nationalliga', 'Fünfte Nationalliga'],
  FRA: [
    'Division Nationale',
    'Division Nationale 2',
    'Division Nationale 3',
    'Division Nationale 4',
    'Division Nationale 5',
  ],
  ITA: [
    'Campionato Nazionale',
    'Campionato Nazionale B',
    'Campionato Nazionale C',
    'Campionato Nazionale D',
    'Campionato Nazionale E',
  ],
  BRA: ['Série Nacional A', 'Série Nacional B', 'Série Nacional C', 'Série Nacional D', 'Série Nacional E'],
  POR: [
    'Liga Nacional',
    'Segunda Liga Nacional',
    'Terceira Liga Nacional',
    'Quarta Liga Nacional',
    'Quinta Liga Nacional',
  ],
  NED: ['Eerste Nationale', 'Tweede Nationale', 'Derde Nationale', 'Vierde Nationale', 'Vijfde Nationale'],
};
const CUPS = {
  ESP: 'Copa Nacional',
  ARG: 'Copa Nacional',
  MEX: 'Copa Nacional',
  GER: 'Nationalpokal',
  AUT: 'Nationalpokal',
  FRA: 'Coupe Nationale',
  ITA: 'Coppa Nazionale',
  POR: 'Taça Nacional',
  BRA: 'Copa Nacional',
  NED: 'Nationale Beker',
  BEL: 'Nationale Beker',
};
const CONTINENT_WORD = {
  Europe: 'European',
  'South America': 'South American',
  Asia: 'Asian',
  Africa: 'African',
  'North America': 'North American',
};
const CONTINENT_SHORT = { Europe: 'EUR', 'South America': 'SAM', Asia: 'ASI', Africa: 'AFR', 'North America': 'NAM' };
const CONT_TIER = {
  1: (r) => `${CONTINENT_WORD[r]} Champions Cup`,
  2: (r) => `${CONTINENT_WORD[r]} Shield`,
  3: (r) => `${CONTINENT_WORD[r]} Trophy`,
};

// ---------------------------------------------------------------- colours
const PALETTE = {
  red: [200, 16, 46],
  blue: [0, 70, 180],
  white: [245, 245, 245],
  black: [25, 25, 25],
  yellow: [250, 210, 20],
  green: [20, 140, 60],
  orange: [240, 120, 20],
  claret: [110, 25, 60],
  sky: [108, 171, 221],
  navy: [20, 35, 90],
};
const colourName = (hex) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let best = 'white',
    bd = Infinity;
  for (const [k, p] of Object.entries(PALETTE)) {
    const d = (v[0] - p[0]) ** 2 + (v[1] - p[1]) ** 2 + (v[2] - p[2]) ** 2;
    if (d < bd) ((bd = d), (best = k));
  }
  return best;
};

// ---------------------------------------------------------------- the world
export function generate(real, seed = 1) {
  const out = JSON.parse(JSON.stringify(real));
  const usedPlace = new Set(Object.values(real.clubs).flatMap((c) => [c.row[2], c.row[0]])), // never a real town or club
    usedName = new Set(),
    usedShort = new Set(),
    usedGround = new Set();
  const placeFor = new Map(),
    perPlace = {},
    done = {};

  const makePlace = (nat, realCity) => {
    const key = `${nat}|${realCity}`;
    if (placeFor.has(key)) return placeFor.get(key);
    const L = langOf(nat),
      r = rngOf(`${seed}|${key}`);
    let place,
      n = 0;
    do {
      place = cap(r.pick(L.a)) + r.pick(L.b);
      if (L.mods && r() < 0.12) place = `${r.pick(L.mods)} ${place}`;
    } while (usedPlace.has(place) && ++n < 500);
    if (usedPlace.has(place)) place += n;
    usedPlace.add(place);
    placeFor.set(key, place);
    return place;
  };
  const shortOf = (place) => {
    const base = place.replace(/[^A-Za-zÀ-ÿ]/g, '').toUpperCase();
    for (const s of [base.slice(0, 3), base.slice(0, 2) + base.slice(-1), base[0] + base.slice(-2), base.slice(0, 4)])
      if (s.length >= 3 && !usedShort.has(s)) return (usedShort.add(s), s);
    for (let i = 2; ; i++) {
      const s = base.slice(0, 3) + i;
      if (!usedShort.has(s)) return (usedShort.add(s), s);
    }
  };
  const surname = (L, r) => cap(r.pick(L.a)) + r.pick(L.b);
  const nickOf = (c, r, L, taken) => {
    // most clubs are known by their colours; some by an animal or a trade
    const [c1, c2] = [colourName(c.row[3]), colourName(c.row[4])];
    const byColour = L.colours[c1] === L.colours[c2] ? L.colours[c1] : L.colours[c1];
    let n = r() < 0.62 ? byColour : r.pick(L.misc);
    if (taken.has(n)) n = r.pick(L.misc);
    return n;
  };

  const doClub = (code) => {
    if (done[code]) return done[code];
    const c = out.clubs[code],
      row = c.row,
      parent = row[9] && out.clubs[row[9]];
    if (parent) {
      const p = doClub(row[9]);
      return (done[code] = {
        name: `${p.name} B`,
        city: p.city,
        stadium: p.stadium,
        short: (p.short + 'B').slice(0, 4),
        nick: '',
      });
    }
    const L = langOf(c.nat),
      place = makePlace(c.nat, row[2]),
      key = `${c.nat}|${place}`,
      k = (perPlace[key] = (perPlace[key] || 0) + 1),
      r = rngOf(`${seed}|${code}`);
    let name,
      tries = 0;
    do {
      // the first club in a town takes the plain town name more often than a second one does
      name = L.club[(Math.floor(r() * L.club.length) + (k - 1) * 3 + tries) % L.club.length].replace('{c}', place);
      tries++;
    } while (usedName.has(name) && tries < L.club.length * 2);
    if (usedName.has(name)) name = `${place} ${k + 1}`;
    usedName.add(name);
    let ground,
      gt = 0;
    do ground = r.pick(L.ground).replace('{c}', place).replace('{x}', surname(L, r)).replace('{p}', surname(L, r));
    while (usedGround.has(ground) && ++gt < 30);
    usedGround.add(ground);
    return (done[code] = { name, city: place, stadium: ground, short: shortOf(place), nick: '' });
  };
  for (const code of Object.keys(out.clubs)) doClub(code);
  // nicknames (after names, so a town's clubs can differ from each other)
  const nickTaken = {};
  for (const code of Object.keys(out.clubs)) {
    const c = out.clubs[code];
    if (c.row[9]) continue;
    const L = langOf(c.nat),
      place = done[code].city,
      taken = (nickTaken[`${c.nat}|${place}`] = nickTaken[`${c.nat}|${place}`] || new Set());
    done[code].nick = nickOf(c, rngOf(`${seed}|nick|${code}`), L, taken);
    taken.add(done[code].nick);
  }
  for (const code of Object.keys(out.clubs)) {
    const i = done[code],
      row = out.clubs[code].row.slice();
    row[0] = i.name;
    row[2] = i.city;
    row[7] = i.stadium;
    out.clubs[code].row = row;
    out.clubs[code].short = i.short;
    out.clubs[code].nick = i.nick;
  }
  // leagues and cups keep their ids, formats and rules; only the name changes
  for (const [id, l] of Object.entries(out.leagues)) {
    const dem = DEMONYM[l.nat] || real.nations[l.nat] || l.nat,
      tiers = TIERS[l.nat] || TIERS.default;
    l.name = `${dem} ${tiers[l.tier - 1] || `Division ${l.tier}`}`;
    l.short = id;
  }
  const seen = new Set();
  for (const c of Object.values(out.continentals)) {
    c.name = (CONT_TIER[c.tier] || CONT_TIER[1])(c.region);
    if (seen.has(c.name)) c.name += ' II';
    seen.add(c.name);
    c.short = `${CONTINENT_SHORT[c.region] || c.region.slice(0, 3).toUpperCase()}${c.tier}`;
  }
  for (const c of Object.values(out.cups)) {
    c.name = CUPS[c.nat]
      ? `${DEMONYM[c.nat] || real.nations[c.nat]} ${CUPS[c.nat]}`
      : `${DEMONYM[c.nat] || real.nations[c.nat] || c.nat} Cup`;
    c.short = `${c.nat}C`;
  }
  out.rivals = real.rivals.map(([a, b]) => {
    const ca = out.clubs[a],
      cb = out.clubs[b];
    if (!ca || !cb) return [a, b, 'Derby'];
    const pa = ca.row[2],
      pb = cb.row[2];
    return [a, b, pa === pb ? `${pa} Derby` : `${pa}–${pb} Derby`];
  });
  out.format = 'touchline-names';
  out.version = 1;
  out.seed = seed;
  out.note = `A fictional world (seed ${seed}): the real structure, rules and club codes with generated names. The real names are in data/real-world.json.`;
  return out;
}

// ---------------------------------------------------------------- command line
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/real-world.json'), 'utf8'));
  const outFile = path.resolve(ROOT, opt('out', 'data/fictional-world.json'));
  const world = generate(real, +opt('seed', 1));
  fs.writeFileSync(outFile, JSON.stringify(world, null, 1) + '\n');
  console.log(`Wrote ${path.relative(ROOT, outFile)} (seed ${world.seed}): ${Object.keys(world.clubs).length} clubs.`);
}
