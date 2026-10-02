// The media: five outlets with voices of their own cover your club. After every match, big signing, sale and season they
// print a headline in their own register, and each keeps a view of you (-100 to 100) that moves with results at its own
// speed: the tabloid swings fast and hunts for a crisis, the broadsheet weighs a run of games, the local paper is on your
// side, the television panel argues about the tactics, the radio phone-in is the fans on a bad night. Together their
// mood is the pressure on the club: a hostile press wears down the board's confidence and the fans' patience a little
// every match, a friendly one props them up. It builds on the story feed (FM.Stories) and the press conferences.
//
// State is S.media, made on first use (older saves have none). Choices of wording come from a hash of the match and the
// day, not from random numbers, so nothing here changes how the rest of the world plays out.
(function () {
  const FM = window.FM,
    D = FM.D,
    W = FM.W,
    U = FM.U;
  const M = (FM.Media = {});

  // The outlets. vol: how fast their view of you moves; base: where it settles when nothing happens.
  M.OUTLETS = {
    tabloid: {
      name: 'The Daily Roar',
      kind: 'Tabloid',
      icon: '🗞️',
      vol: 1.6,
      base: -8,
      line: 'Looks for a crisis. Quick to turn on you and quick to forgive.',
    },
    paper: {
      name: 'The Chronicle',
      kind: 'Broadsheet',
      icon: '📰',
      vol: 0.6,
      base: 0,
      line: 'Weighs a run of games, not one. Hard to win over, hard to lose.',
    },
    local: {
      name: null,
      kind: 'Local paper',
      icon: '🏘️',
      vol: 0.5,
      base: 18,
      line: 'Your own town’s paper: on your side, and sorry when you lose.',
    },
    tv: {
      name: 'Touchline Tonight',
      kind: 'Television',
      icon: '📺',
      vol: 1.0,
      base: 0,
      line: 'A panel that argues about your tactics and picks sides.',
    },
    radio: {
      name: 'Radio Terrace',
      kind: 'Phone-in',
      icon: '📻',
      vol: 1.3,
      base: -4,
      line: 'The fans on the line: loud, fair-weather, and mostly right.',
    },
  };
  M.name = (id, club) => (id === 'local' ? `${(club || W.userClub() || {}).city || 'The'} Echo` : M.OUTLETS[id].name);
  M.order = ['tabloid', 'paper', 'local', 'tv', 'radio'];

  // ---------- State ----------
  M.state = function () {
    const S = FM.S;
    if (!S.media) {
      S.media = {
        att: Object.fromEntries(M.order.map((k) => [k, M.OUTLETS[k].base])),
        run: { w: 0, d: 0, l: 0, unbeaten: 0, winless: 0 },
        last: {},
        pundits: [],
      };
      // three regular pundits: made from fixed name lists, not dice, so nothing else in the world is disturbed
      const N = D.NATIONS.ENG;
      ['sensible', 'contrarian', 'hothead'].forEach((style, i) =>
        S.media.pundits.push({
          name: `${N.fn[(i * 7 + 3 + (S.year % 5)) % N.fn.length]} ${N.ln[(i * 11 + 5) % N.ln.length]}`,
          style,
        }),
      );
    }
    return S.media;
  };
  const hash = (s) => {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];
  M.mood = function () {
    const a = M.state().att;
    return Math.round(M.order.reduce((t, k) => t + a[k] * (k === 'tabloid' ? 1.2 : k === 'paper' ? 1.2 : 1), 0) / 5.4);
  };
  M.moodLabel = (v) =>
    v >= 45 ? 'Adoring' : v >= 20 ? 'Friendly' : v > -15 ? 'Neutral' : v > -40 ? 'Critical' : 'Hostile';
  // The pull on the club each match: -1 (hostile) to +1 (adoring)
  M.pressure = () => U.clamp(M.mood() / 60, -1, 1);
  M.view = (id) => {
    const v = M.state().att[id];
    return v >= 45
      ? 'Adores you'
      : v >= 20
        ? 'Likes you'
        : v > -15
          ? 'Undecided'
          : v > -40
            ? 'Sceptical'
            : 'Against you';
  };

  // ---------- Headlines ----------
  const post = (outlet, kicker, title, body, extra = {}) => {
    const club = W.userClub();
    if (!club) return;
    FM.News.add({ type: 'headline', paper: M.name(outlet, club), outlet, title, body, clubId: club.id, ...extra });
  };
  // What each outlet says for an event. {c} club, {o} opponent, {s} score, {m} manager's surname, {n} run length.
  const T = {
    win: {
      tabloid: ['{c} ROAR PAST {O}', 'Boss {m} is the toast of {city}', '{c} {s}: {o} sent packing'],
      paper: [
        '{c} take the points against {o}',
        'A professional {s} for {c}',
        'Control and a clean finish: {c} beat {o}',
      ],
      local: [
        'Magic night at home as {c} beat {o}',
        '{city} celebrates: {c} {s} {o}',
        'Great win for the lads, says {m}',
      ],
      tv: [
        'Pundits: {c} deserved it, {o} had no answer',
        '{c} look a team with a plan, says the panel',
        'The panel on {c}’s {s} win: tactics made the difference',
      ],
      radio: [
        'Callers delighted after {c} {s} {o}',
        '"Best I’ve seen them play" — the lines light up',
        'Phone-in: has {m} turned the corner?',
      ],
    },
    bigwin: {
      tabloid: ['{c} DEMOLISH {O}!', '{s}! {o} humiliated', 'Hammered! {o} fall apart at {c}'],
      paper: ['A statement win: {c} {s} {o}', 'Dominant {c} leave {o} with questions', '{c} show what they can be'],
      local: ['Goal-fest! {c} {s} {o}', 'Best result in years, say supporters', '{city} dares to dream after {s}'],
      tv: [
        'Pundits stunned by {c}’s {s} win',
        '"They can beat anyone": panel on {c}',
        'Where did that come from? The panel on {c}',
      ],
      radio: [
        'Callers beside themselves: {s}!',
        '"I want a pay rise" jokes caller after {c} win',
        'Phone-in lines jammed after {s}',
      ],
    },
    draw: {
      tabloid: ['Dull draw: {c} {s} {o}', '{m} settles for a point, fans want more', 'Snooze at {c}: {s}'],
      paper: [
        '{c} and {o} cancel each other out',
        'A point that suits neither: {c} {s} {o}',
        'Honours even between {c} and {o}',
      ],
      local: ['A hard-earned point for {c}', 'Plenty of effort, not quite enough: {s}', '{city} left wanting more'],
      tv: ['Panel split on {c}’s {s} draw', '"Two points dropped," says the panel', 'Fine margins in {c} {s} {o}'],
      radio: ['Callers split on the draw', '"We should have won": radio phone-in', 'A point is a point, say callers'],
    },
    loss: {
      tabloid: ['{c} FLOP: {o} win {s}', 'Pressure builds on {m} after defeat', 'Shambles! {c} beaten by {o}'],
      paper: [
        '{c} fall short against {o}',
        'Questions for {m} after {s} defeat',
        'Defensive lapses cost {c} against {o}',
      ],
      local: ['Heartbreak for {c}: {s}', 'The lads deserved more, says {m}', '{city} licks its wounds after defeat'],
      tv: [
        'Panel: {c} got the tactics wrong',
        '"{o} were better everywhere": the panel',
        'Where did {c} go wrong? The panel decides',
      ],
      radio: [
        'Callers furious after {s} defeat',
        '"{m} has to go" — one caller',
        'Phone-in: is the season slipping away?',
      ],
    },
    heavyloss: {
      tabloid: ['{m} OUT? {c} thrashed {s}', 'Humiliation! {c} routed by {o}', 'Crisis at {c}: {s} disaster'],
      paper: [
        'A damaging {s} defeat for {c}',
        'Serious questions after {c}’s heavy loss',
        '{c} undone by {o}: the manager’s position',
      ],
      local: ['A dark day for {c}: {s}', 'Not good enough, says {m} after {s}', '{city} stunned by a heavy defeat'],
      tv: [
        'Panel: "This is a real problem for {c}"',
        '{s}: the panel on a collapse',
        'No excuses: pundits on {c}’s heavy loss',
      ],
      radio: [
        'Callers demand answers after {s}',
        '"I want my money back": phone-in',
        'The phone lines are on fire after {c}’s loss',
      ],
    },
    derbywin: {
      tabloid: ['DERBY DAY GLORY! {c} rule {city}', 'Bragging rights: {c} crush the neighbours'],
      paper: ['{c} win the derby: a result that will be remembered'],
      local: ['We own the city! Derby win for {c}', 'The derby is ours: {s}'],
      tv: ['Derby verdict: {c} wanted it more'],
      radio: ['Derby day delirium on the phone-in'],
    },
    derbyloss: {
      tabloid: ['DERBY DISGRACE: {c} humbled by rivals', 'Neighbours have the last laugh: {s}'],
      paper: ['Derby defeat leaves {c} questions to answer'],
      local: ['A derby we’d rather forget'],
      tv: ['Derby verdict: {o} wanted it more'],
      radio: ['Derby defeat: the phone-in will not sleep tonight'],
    },
    upset: {
      tabloid: ['GIANT-KILLERS! {c} topple {o}', 'Shock of the season: {c} beat {o}'],
      paper: ['{c} upset the odds against {o}'],
      local: ['What a night! {c} beat mighty {o}'],
      tv: ['Pundits on {c}’s upset: "no fluke"'],
      radio: ['Callers can’t believe it: {c} beat {o}'],
    },
    hot: {
      tabloid: ['{n} WINS IN A ROW! Is {c} the team to beat?', 'Unstoppable! {c}’s run reaches {n}'],
      paper: ['{n} straight wins: what has changed at {c}?', 'A run that cannot be ignored: {c}'],
      local: ['{n} in a row! {city} is dreaming', 'The lads keep winning: {n} straight'],
      tv: ['The panel: {c} are now genuine contenders'],
      radio: ['Callers: "Can we really do it?" {n} wins and counting'],
    },
    cold: {
      tabloid: ['{m} ON THE BRINK: {n} defeats in a row', 'The end is nigh? {c} lose again'],
      paper: ['{n} defeats: the pressure on {m} grows', 'A losing run that the board cannot ignore'],
      local: ['A tough spell for {c}: {n} without a win', 'Stick with the lads, says {city}'],
      tv: ['The panel: {m} has a month to fix this'],
      radio: ['Callers: "Sack him!" after {n} defeats'],
    },
    signing: {
      tabloid: ['{c} SPLASH THE CASH: {p} for {fee}', 'Big money! {p} is the new hero'],
      paper: ['{c} sign {p} in a {fee} deal: a considered move', '{p} arrives: what he adds to {c}'],
      local: ['Welcome to {city}, {p}!', 'Our new man {p} cost {fee}'],
      tv: ['Pundits on {p}: "a statement of intent"'],
      radio: ['Callers on {p}’s {fee} fee: worth it?'],
    },
    sale: {
      tabloid: ['{c} CASH IN: {p} sold for {fee}', 'Why are they selling {p}? The inside story'],
      paper: ['{c} sell {p} for {fee}: a sensible decision?'],
      local: ['A sad day: {p} leaves {c}'],
      tv: ['The panel on {p}’s exit: "good business"'],
      radio: ['Callers split on {p} sale'],
    },
    title: {
      tabloid: ['CHAMPIONS! {c} are on top of the world'],
      paper: ['{c} crowned champions: the story of the season'],
      local: ['Champions! {city} will never forget this'],
      tv: ['The panel: champions deserved it'],
      radio: ['The phone lines are in party mode: champions!'],
    },
    relegated: {
      tabloid: ['DOWN! {c} relegated in disgrace'],
      paper: ['Relegation for {c}: how it went wrong'],
      local: ['Heartbreak: {city} faces life in the lower division'],
      tv: ['The panel on {c}’s relegation: "a long time coming"'],
      radio: ['Callers in tears as {c} go down'],
    },
    season: {
      tabloid: ['Season over: {c} finish {pos}'],
      paper: ['{c} finish {pos}: the season in review'],
      local: ['A season to remember? {c} finish {pos}'],
      tv: ['The panel’s verdict on {c}’s season: {pos}'],
      radio: ['Callers rate the season: {c} finish {pos}'],
    },
  };
  const fill = (t, x) =>
    t
      .replace(/\{O\}/g, String(x.o || '').toUpperCase())
      .replace(/\{c\}/g, x.c || '')
      .replace(/\{o\}/g, x.o || '')
      .replace(/\{s\}/g, x.s || '')
      .replace(/\{m\}/g, x.m || '')
      .replace(/\{n\}/g, x.n || '')
      .replace(/\{p\}/g, x.p || '')
      .replace(/\{fee\}/g, x.fee || '')
      .replace(/\{pos\}/g, x.pos || '')
      .replace(/\{city\}/g, x.city || '');
  const line = (kind, outlet, x, seed) => fill(pick(T[kind][outlet], seed + outlet + kind), x);

  // The pundits' take, in their own style, for the television item
  M.punditTake = function (kind, x, seed) {
    const p = pick(M.state().pundits, seed + 'pundit');
    const good = ['win', 'bigwin', 'hot', 'derbywin', 'upset'].includes(kind);
    const said = {
      sensible: good
        ? [
            'A sensible performance. They looked organised and they stuck to the plan.',
            'It was the shape that won it: compact, patient and clinical.',
          ]
        : [
            'They were open in the middle and it cost them. It is fixable.',
            'Too many mistakes at the back. The shape needs work, not a revolution.',
          ],
      contrarian: good
        ? [
            'I will say it: they were fortunate. Do not get carried away.',
            'Good result, but I am not convinced they will do it again.',
          ]
        : [
            'I thought they were unlucky. The manager’s plan was right.',
            'People will pile on, but the performance was better than the score.',
          ],
      hothead: good
        ? ['That is how you do it! They wanted it more, simple as that.', 'Put that team in any league: tremendous.']
        : [
            'I would have sat them down at half-time and told them where to go.',
            'Unacceptable. Where was the fight? Where was the desire?',
          ],
    }[p.style];
    return { who: p.name, text: pick(said, seed + 'text') };
  };

  // ---------- Reaction to events ----------
  const react = (id, d) => {
    const a = M.state().att,
      o = M.OUTLETS[id];
    a[id] = U.clamp(a[id] + d * o.vol, -100, 100);
  };
  const SWING = {
    win: 7,
    bigwin: 11,
    draw: -1,
    loss: -8,
    heavyloss: -13,
    derbywin: 9,
    derbyloss: -10,
    upset: 10,
    hot: 6,
    cold: -9,
  };
  // Which outlet speaks after this event: the one whose opinion moved most (the tabloid on drama, the paper on runs)
  const speaker = (kind, seed) => {
    const w = { tabloid: 1.5, paper: 1, local: 1, tv: 0.8, radio: 0.8 };
    if (['hot', 'cold'].includes(kind)) w.paper = 2;
    if (['bigwin', 'heavyloss', 'derbywin', 'derbyloss', 'upset'].includes(kind)) w.tabloid = 2.5;
    const list = M.order.flatMap((k) => Array(Math.round(w[k] * 2)).fill(k));
    return pick(list, seed + 'speaker');
  };
  // After one of your matches (called by Stories.userMatch's wrapper)
  M.afterMatch = function (fx, m, side) {
    const S = FM.S,
      st = M.state(),
      club = m.sides[side].club,
      opp = m.sides[1 - side].club;
    if (!W.isUser(club.id)) return;
    const gf = m.sides[side].goals,
      ga = m.sides[1 - side].goals,
      r = fx.res || {};
    const won = gf > ga || (r.pens && r.pens[side] > r.pens[1 - side]),
      lost = ga > gf || (r.pens && r.pens[side] < r.pens[1 - side]);
    const run = st.run;
    if (won) {
      run.w++;
      run.l = 0;
      run.unbeaten++;
      run.winless = 0;
    } else if (lost) {
      run.l++;
      run.w = 0;
      run.winless++;
      run.unbeaten = 0;
    } else {
      run.w = 0;
      run.l = 0;
      run.winless++;
      run.unbeaten++;
    }
    const diff = Math.abs(gf - ga),
      upset = won && opp.rep - club.rep >= 10;
    let kind = won ? (diff >= 3 ? 'bigwin' : 'win') : lost ? (diff >= 3 ? 'heavyloss' : 'loss') : 'draw';
    if (m.derby) kind = won ? 'derbywin' : lost ? 'derbyloss' : kind;
    else if (upset) kind = 'upset';
    else if (won && run.w >= 3) kind = 'hot';
    else if (lost && run.l >= 3) kind = 'cold';
    // each outlet's view moves by the result, at its own speed; the local paper softens a defeat, the broadsheet reads runs
    const swing = SWING[kind];
    for (const id of M.order) {
      let d = swing;
      if (id === 'local' && d < 0) d *= 0.5;
      if (id === 'paper') d += run.w >= 4 ? 3 : run.l >= 3 ? -3 : 0;
      if (id === 'tabloid' && (kind === 'draw' || kind === 'win')) d += run.winless >= 3 ? -5 : 0;
      react(id, d);
    }
    // everything drifts back toward where it settles
    for (const id of M.order) st.att[id] += (M.OUTLETS[id].base - st.att[id]) * 0.06;
    const seed = `${S.year}.${S.day}.${club.id}`;
    const x = {
      c: club.name,
      o: opp.name,
      s: `${gf}–${ga}`,
      m: (S.user.name || '').split(' ').pop(),
      n: kind === 'hot' ? run.w : run.l,
      city: club.city,
    };
    // Not every match makes the papers: derbies, upsets, heavy results and runs always do, the rest now and then
    const news =
      ['derbywin', 'derbyloss', 'upset', 'bigwin', 'heavyloss', 'hot', 'cold'].includes(kind) ||
      hash(seed + 'n') % 100 < 40;
    if (news) {
      const id = speaker(kind, seed);
      const mood = st.att[id];
      post(
        id,
        kind,
        line(kind, id, x, seed),
        `${M.OUTLETS[id].kind} · ${M.view(id).toLowerCase()} (${mood > 0 ? '+' : ''}${Math.round(mood)})`,
        { mediaKind: kind },
      );
      st.last[id] = { kind, day: S.day, year: S.year };
    }
    // The television panel weighs in on the big ones
    if (
      ['derbywin', 'derbyloss', 'upset', 'heavyloss', 'bigwin', 'cold'].includes(kind) &&
      hash(seed + 'tv') % 100 < 70
    ) {
      const t = M.punditTake(kind, x, seed);
      post('tv', kind, `${t.who} on ${club.name}: “${t.text}”`, 'Touchline Tonight panel', { mediaKind: 'pundit' });
    }
    // Pressure: the press moves the board and the fans a little every match
    const p = M.pressure();
    club.boardConf = U.clamp(club.boardConf + p * 0.6, 0, 100);
    club.fanMood = U.clamp(club.fanMood + p * 0.5, 0, 100);
  };
  M.afterTransfer = function (p, from, to, fee) {
    if (!W.userClub() || fee < 8e6) return;
    const club = W.userClub(),
      buying = to.id === club.id,
      selling = from && from.id === club.id;
    if (!buying && !selling) return;
    const S = FM.S,
      seed = `${S.year}.${S.day}.${p.id}`,
      kind = buying ? 'signing' : 'sale';
    const x = { c: club.name, p: W.name(p), fee: U.money(fee), city: club.city };
    const id = speaker(kind, seed);
    post(
      id,
      kind,
      line(kind, id, x, seed),
      `${M.OUTLETS[id].kind} · on the ${U.money(fee)} ${buying ? 'signing' : 'sale'}`,
      { mediaKind: kind, pid: p.id },
    );
    react('tabloid', buying ? 1 : -2);
    react('local', buying ? 3 : -3);
    react('radio', buying ? 2 : -2);
  };
  M.afterSeason = function (e) {
    const club = W.userClub();
    if (!club || !e || !e.comps || !e.comps[club.comp]) return;
    const x0 = e.comps[club.comp],
      pos = x0.table.findIndex((r) => r.id === club.id) + 1,
      n = x0.table.length;
    const champ = x0.champion === club.id,
      down =
        pos >
        n -
          (club.comp && FM.S.comps[club.comp].rules && FM.S.comps[club.comp].rules.relegate
            ? FM.S.comps[club.comp].rules.relegate.n
            : 3);
    const kind = champ ? 'title' : down ? 'relegated' : 'season';
    const seed = `${FM.S.year}.${club.id}.end`;
    const x = { c: club.name, pos: U.ordinal(pos), city: club.city };
    for (const id of ['tabloid', 'paper', 'local']) {
      post(id, kind, line(kind, id, x, seed), `${M.OUTLETS[id].kind} · ${x0.name} ${e.label || ''}`, {
        mediaKind: kind,
      });
      react(id, champ ? 14 : down ? -16 : pos <= 4 ? 6 : pos > n / 2 ? -5 : 1);
    }
  };
  // Your answer in a press conference: the papers pick it up (the choice's effect on fans and the board is the existing one)
  M.afterPress = function (n, i) {
    const club = W.userClub(),
      c = n && n.choices && n.choices[i];
    if (!club || !c) return;
    const loud = /blame|referee|slam|attack|rival|mind games/i.test(c.label),
      humble = /responsib|honest|respect|credit/i.test(c.label);
    const id = loud ? 'tabloid' : humble ? 'paper' : 'radio';
    react(id, loud ? 2 : humble ? 3 : 1);
    if (loud && hash(`${FM.S.year}.${FM.S.day}.${c.label}`) % 100 < 60)
      post(
        'tabloid',
        'press',
        `Boss ${(FM.S.user.name || '').split(' ').pop()}: “${c.label}”`,
        'The Daily Roar · on yesterday’s press conference',
        { mediaKind: 'press' },
      );
  };

  // ---------- Hooks: wrap the story functions so no other file has to change ----------
  const wrap = (name, after) => {
    const St = FM.Stories;
    if (!St || !St[name] || St[name]._media) return;
    const orig = St[name];
    St[name] = function () {
      const r = orig.apply(this, arguments);
      try {
        after.apply(null, arguments);
      } catch (e) {
        console.warn('media', e);
      }
      return r;
    };
    St[name]._media = true;
  };
  M.install = function () {
    wrap('userMatch', (fx, m, side) => M.afterMatch(fx, m, side));
    wrap('transfer', (p, from, to, fee) => M.afterTransfer(p, from, to, fee));
    wrap('seasonEnd', (e) => M.afterSeason(e));
    wrap('applyPress', (n, i) => M.afterPress(n, i));
  };
  M.install();
})();
