// News feed + emergent stories. Everything the world does surfaces here as cards, not emails.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;

  // News about your club and news about the wider game are capped separately (100 each), so a busy transfer
  // window can't push your own club's stories off the end; a decision still waiting on you is kept over older items
  const CLUB_TYPES = [
    'press',
    'bid',
    'report',
    'youth',
    'dressing',
    'board',
    'meeting',
    'medical',
    'contracts',
    'desk',
  ];
  FM.News = {
    CAP: 100,
    // About your club: its own news, and decisions and reports for you (a bid names the bidding club)
    isClub: (n, clubId) => (clubId != null && n.clubId === clubId) || CLUB_TYPES.includes(n.type),
    isOpen: (n) =>
      (n.type === 'bid' && n.data && n.data.status === 'open') ||
      ((n.type === 'press' || n.type === 'meeting' || n.type === 'medical' || n.type === 'desk') && !n.resolved),
    trim(S) {
      const cid = S.user && S.user.clubId;
      // open decisions take their club places first; the oldest other club items make room for them
      let club = S.news.filter(FM.News.isOpen).length,
        world = 0;
      S.news = S.news.filter((n) =>
        FM.News.isOpen(n) ? true : FM.News.isClub(n, cid) ? ++club <= FM.News.CAP : ++world <= FM.News.CAP,
      );
    },
    // What you follow (S.user.follow): clubs, players, competitions and nations whose news comes into your feed
    follows() {
      const u = FM.S.user;
      if (!u) return { clubs: [], players: [], comps: [], nations: [] };
      return (u.follow = u.follow || { clubs: [], players: [], comps: [], nations: [] });
    },
    followed(n) {
      const f = FM.News.follows(),
        S = FM.S;
      const fav = S.user && S.user.favClub;
      if (fav && n.clubId === fav) return true; // your boyhood club counts as followed
      if (!f.clubs.length && !f.players.length && !f.comps.length && !f.nations.length) return false;
      if (n.clubId && f.clubs.includes(n.clubId)) return true;
      if (n.pid && f.players.includes(n.pid)) return true;
      const c = n.clubId && S.clubs[n.clubId];
      if (c && c.comp && f.comps.includes(c.comp)) return true;
      if (n.comp && f.comps.includes(n.comp)) return true;
      const p = n.pid && S.players[n.pid];
      if (p && f.nations.includes('n_' + p.nat) && /international|national|caps?\b|debut/i.test(n.title || ''))
        return true;
      if (n.deals) return n.deals.some((d) => (d.c && f.clubs.includes(d.c)) || (d.pid && f.players.includes(d.pid)));
      return false;
    },
    add(n) {
      const S = FM.S;
      // The day's ordinary transfers and loans elsewhere go into one Transfer round-up (big deals keep their own
      // story, and so does a move by a player or club you follow)
      if (n.type === 'transfer' && !n.big && !FM.News.isClub(n, S.user && S.user.clubId) && !FM.News.followed(n)) {
        let r = S.news.find((x) => x.type === 'roundup' && x.day === S.day && x.year === S.year);
        if (!r) {
          r = { id: FM.nextId('n'), day: S.day, year: S.year, read: false, type: 'roundup', deals: [] };
          S.news.unshift(r);
        }
        r.deals.push({ t: n.title, pid: n.pid, c: n.clubId });
        r.title = `Transfer round-up: ${r.deals.length} deal${r.deals.length === 1 ? '' : 's'}`;
        r.read = false;
        return r;
      }
      const item = { id: FM.nextId('n'), day: S.day, year: S.year, read: false, ...n };
      S.news.unshift(item);
      if (S.news.length > 2 * FM.News.CAP) FM.News.trim(S);
      return item;
    },
  };

  const DEMONYM = {
    ENG: 'English',
    BRA: 'Brazilian',
    ARG: 'Argentine',
    JPN: 'Japanese',
    KOR: 'Korean',
    THA: 'Thai',
    SRB: 'Serbian',
    FRA: 'French',
    ESP: 'Spanish',
    NGA: 'Nigerian',
    POR: 'Portuguese',
    NED: 'Dutch',
    GER: 'German',
    BEL: 'Belgian',
    IRL: 'Irish',
    SCO: 'Scottish',
    WAL: 'Welsh',
    URU: 'Uruguayan',
    COL: 'Colombian',
    SEN: 'Senegalese',
    GHA: 'Ghanaian',
    CIV: 'Ivorian',
    MAR: 'Moroccan',
    USA: 'American',
    DEN: 'Danish',
    NOR: 'Norwegian',
    CRO: 'Croatian',
    ITA: 'Italian',
    MEX: 'Mexican',
    TUR: 'Turkish',
    CZE: 'Czech',
    GRE: 'Greek',
    POL: 'Polish',
    AUT: 'Austrian',
    SUI: 'Swiss',
  };
  const NOUN = {
    GK: 'goalkeeper',
    CB: 'centre-back',
    FB: 'full-back',
    DM: 'midfielder',
    CM: 'midfielder',
    AM: 'playmaker',
    W: 'winger',
    ST: 'striker',
  };
  const PAPERS = ['The Daily Touchline', 'Football Weekly', 'The Terrace Times', 'Evening Sports Post'];
  const describe = (p) =>
    DEMONYM[p.nat]
      ? `${W.age(p)}-year-old ${DEMONYM[p.nat]} ${NOUN[p.pos]}`
      : `${W.age(p)}-year-old ${NOUN[p.pos]} from ${D.NATIONS[p.nat].name}`;
  FM.Stories = { describe, DEMONYM, NOUN };
  const St = FM.Stories;
  const C = (id) => FM.S.clubs[id];
  const P = (id) => FM.S.players[id];

  // ---------- after the user's match ----------
  St.userMatch = function (fx, m, side) {
    const S = FM.S,
      r = fx.res,
      me = m.sides[side],
      op = m.sides[1 - side];
    const club = me.club,
      opp = op.club;
    const gf = me.goals,
      ga = op.goals;
    const won = gf > ga || (r.pens && r.pens[side] > r.pens[1 - side]);
    const lost = ga > gf || (r.pens && r.pens[side] < r.pens[1 - side]);
    const score = `${r.hg}–${r.ag}`;
    const myGoals = r.goals.filter((g) => g.side === side);
    const ratings = Object.entries(me.rating)
      .filter(([pid]) => me.mins[pid] >= 30)
      .sort((a, b) => b[1] - a[1]);
    const best = P(ratings[0][0]),
      worst = P(ratings[ratings.length - 1][0]);
    const scorerCount = {};
    myGoals.forEach((g) => (scorerCount[g.pid] = (scorerCount[g.pid] || 0) + 1));
    const hat = Object.entries(scorerCount).find(([, n]) => n >= 3);
    const upset = won && opp.rep - club.rep >= 10;
    const lateWinner = won && myGoals.length && parseInt(myGoals[myGoals.length - 1].min) >= 85 && gf - ga === 1;
    const wasBehind = m.events.some(
      (e) => e.k === 'goal' && ((side === 0 && e.score[1] > e.score[0]) || (side === 1 && e.score[0] > e.score[1])),
    );
    const comeback = won && wasBehind;
    const mgr = S.user.name.split(' ').pop();

    // Headline
    let h;
    if (m.derby && won)
      h = U.pick([
        `${club.name} rule the ${club.city} streets`,
        `Derby delight: ${club.short} silence their rivals`,
        `${club.name} claim ${m.derby ? C(club.rival).city : ''} bragging rights`,
      ]);
    else if (m.derby && lost) h = U.pick([`Derby misery for ${club.name}`, `Humiliation: ${opp.name} win the derby`]);
    else if (upset)
      h = U.pick([
        `${club.name} stun ${opp.name}`,
        `Giant-killing! ${club.short} topple ${opp.name}`,
        `Shock result as ${opp.name} fall to ${club.name}`,
      ]);
    else if (hat) h = `${W.name(P(hat[0]))} hat-trick fires ${club.name} to victory`;
    else if (comeback)
      h = U.pick([
        `Never write them off: ${club.name} complete stunning comeback`,
        `From behind to glory — ${club.name} fight back`,
      ]);
    else if (lateWinner)
      h = `Late drama! ${W.name(P(myGoals[myGoals.length - 1].pid))} wins it in the ${myGoals[myGoals.length - 1].min}`;
    else if (won && gf - ga >= 3) h = `${club.name} run riot against ${opp.name}`;
    else if (won)
      h = U.pick([
        `${club.name} edge past ${opp.name}`,
        `${W.name(best)} inspires ${club.name} win`,
        `Job done for ${club.name}`,
      ]);
    else if (lost && ga - gf >= 3)
      h = U.pick([`Crisis talks? ${club.name} thrashed by ${opp.name}`, `${club.name} humbled ${score}`]);
    else if (lost)
      h = U.pick([`${club.name} fall to ${opp.name}`, `Frustration for ${mgr} as ${club.short} lose again`]);
    else h = U.pick([`Honours even between ${club.short} and ${opp.short}`, `${club.name} held by ${opp.name}`]);
    const xgLine = `xG ${me.xg.toFixed(2)}–${op.xg.toFixed(2)}`;
    FM.News.add({
      type: 'headline',
      paper: U.pick(PAPERS),
      title: h,
      body: `${C(fx.h).name} ${score}${r.pens ? ` (${r.pens[0]}–${r.pens[1]} pens)` : ''} ${C(fx.a).name}. ${xgLine}. Player of the match: ${W.name(P(r.motm))}.`,
      clubId: club.id,
      fxId: fx.id,
    });

    // Fan reactions
    const posts = [];
    const handles = U.shuffle([
      `@${club.short}_ultras`,
      `@${club.city}Loyal`,
      `@${U.pick(D.NATIONS.ENG.fn)}${U.randi(10, 99)}_${club.short}`,
      `@${club.name.split(' ').pop()}Faithful`,
      `@TheRealTerraceTalk`,
      `@${club.city}Til1Die`,
    ]);
    const handle = () => handles.pop() || `@fan${U.randi(100, 999)}`;
    const fill = (t) =>
      t
        .replace('{best}', W.short(best))
        .replace('{worst}', W.short(worst))
        .replace('{score}', score)
        .replace('{ticket}', U.money(50))
        .replace('{mgr}', mgr)
        .replace('{opp}', opp.name)
        .replace('{rival}', opp.short);
    const xiAvg = (sd) => U.avg(sd.xi.filter(Boolean), (p) => p.ca);
    const exp = FM.Season.expected(xiAvg(me), xiAvg(op), side === 0, !!fx.neutral),
      surprise = (won ? 1 : lost ? 0 : 0.5) - exp;
    const pool =
      won && exp >= 0.65
        ? [
            'Job done. Never in doubt 👍',
            '{score}, as it should be. On to the next one',
            'Professional. {best} was different class',
            'Expected the three points and got them. No complaints',
          ]
        : lost && exp <= 0.35
          ? [
              'Always going to be tough against {opp}. Heads up',
              'Lost, but we gave them a game. Nothing to be ashamed of',
              "{opp} are a level above us right now. That's football",
              "Didn't expect much from this one tbh. Bigger games coming",
            ]
          : !won && !lost && exp <= 0.45
            ? [
                "A point against {opp}? I'll take that all day 👏",
                'Great point. {best} was immense',
                'Nobody gave us a chance. Proud of the lads today',
                "That's a point gained, not two dropped",
              ]
            : won
              ? [
                  'What a performance!!! {best} you absolute legend 🔥',
                  "{score}. GET IN!!! {mgr} knows exactly what he's doing",
                  "Best I've seen us play in years. Proper football 👏",
                  '{best} is levels above this league. Do NOT sell him.',
                  'Three points, clean shirts, happy days 😎',
                ]
              : lost
                ? [
                    "Embarrassing. {worst} shouldn't be anywhere near the XI",
                    '{mgr} out? Too early to say but that was dire.',
                    'Nothing about that was good enough. Nothing.',
                    "Players don't look like they care 😡",
                    'Paid {ticket} to watch that. Never again (see you next week)',
                  ]
                : [
                    "Point's a point I suppose 🤷",
                    "Should've won that. {worst} was poor again.",
                    'xG says we deserved more. Frustrating.',
                    '{best} was the only one who turned up today',
                  ];
    U.shuffle(pool)
      .slice(0, 3)
      .forEach((t) => posts.push({ h: handle(), t: fill(t), likes: U.randi(12, 2400) }));
    if (m.derby) {
      posts.unshift({
        h: handle(),
        t: won
          ? 'DERBY DAY!!! {rival} fans are awfully quiet tonight 🤫'
          : "Worst day of the season. Can't show my face at work tomorrow.",
        likes: U.randi(800, 9000),
      });
      posts.push({
        h: `@${opp.short}_Faithful`,
        t: won ? 'Ref gifted them that. Enjoy it while it lasts.' : 'Our city 😂😂😂',
        likes: U.randi(300, 5000),
        rival: true,
      });
      posts[0].t = fill(posts[0].t);
    }
    FM.News.add({
      type: 'social',
      title: `Fans react: ${club.short} ${gf}–${ga} ${opp.short}`,
      posts,
      clubId: club.id,
      mood: surprise > 0.15 ? 'up' : surprise < -0.15 ? 'down' : 'flat',
    });

    // Shareable story cards
    const kid = (p) => W.age(p) <= 20;
    Object.keys(me.mins).forEach((pid) => {
      const p = P(pid),
        sp = W.spell(p);
      const scored = scorerCount[pid];
      if (sp && sp.apps === 1 && scored && (sp.signed || p.career.apps === 1)) {
        St.share({
          kicker: 'DEBUT',
          title: `${describe(p)} scores on debut`,
          sub: `${W.name(p)} marks his first game for ${club.name} with ${scored > 1 ? scored + ' goals' : 'a goal'}.`,
          big: scored > 1 ? `${scored}⚽` : '⚽',
          clubId: club.id,
          pid,
        });
      } else if (p.youth === club.id && p.career.apps === 1 && kid(p)) {
        St.share({
          kicker: 'ACADEMY',
          title: `${W.age(p)}-year-old academy graduate makes debut`,
          sub: `${W.name(p)} steps up from the ${club.name} academy.${me.rating[pid] >= 7 ? ' A composed display.' : ''}`,
          big: `#${S.user.stats.youthDebuts}`,
          clubId: club.id,
          pid,
        });
      }
      const ms = [100, 200, 300, 400, 500, 600, 700];
      if (ms.includes(p.career.apps))
        St.share({
          kicker: 'MILESTONE',
          title: `${W.name(p)} reaches ${p.career.apps} career games`,
          sub: `${W.age(p)} years old and still going.`,
          big: String(p.career.apps),
          clubId: club.id,
          pid,
        });
      if (sp && [50, 100, 150, 200, 250, 300].includes(sp.apps))
        St.share({
          kicker: 'CLUB LEGEND',
          title: `${sp.apps} games for ${club.name}`,
          sub: `${W.name(p)} — ${sp.goals} goals for the club so far.`,
          big: String(sp.apps),
          clubId: club.id,
          pid,
        });
    });
    if (hat)
      St.share({
        kicker: 'HAT-TRICK',
        title: `${W.name(P(hat[0]))} hits a hat-trick`,
        sub: `${club.name} ${gf}–${ga} ${opp.name}`,
        big: `${hat[1]}⚽`,
        clubId: club.id,
        pid: hat[0],
      });
    if (upset)
      St.share({
        kicker: 'UPSET',
        title: `${club.name} shock ${opp.name}`,
        sub: `${score} — a ${opp.rep - club.rep}-point reputation gap overturned.`,
        big: `${gf}–${ga}`,
        clubId: club.id,
      });
    if (m.derby && won)
      St.share({
        kicker: 'DERBY',
        title: `${club.name} win the ${club.derby}`,
        sub: `${W.name(best)} the hero as ${club.short} beat ${opp.short} ${gf}–${ga}.`,
        big: `${gf}–${ga}`,
        clubId: club.id,
      });

    // Dressing room
    const leader = W.squad(club.id)
      .filter((p) => W.hasTrait(p, 'Leader'))
      .sort((a, b) => b.career.apps - a.career.apps)[0];
    if (lost && ga - gf >= 2 && leader)
      FM.News.add({
        type: 'dressing',
        title: `${W.name(leader)} calls a players-only meeting`,
        body: `"That's not who we are. Everyone in this room needs to look at themselves." — the squad's morale steadies.`,
        pid: leader.id,
        clubId: club.id,
      });
    if (lost && ga - gf >= 2 && leader) W.squad(club.id).forEach((p) => (p.morale = Math.min(100, p.morale + 3)));

    // Press conference (interactive): a question about the moment (a run of results, the board, a rumour, the
    // kids) when one fits, else about the game
    const topical = St.pressQuestion(club);
    if (topical && Math.random() < 0.35 && !S.news.some((n) => n.type === 'press' && !n.resolved))
      FM.News.add({ type: 'press', title: 'Post-match press conference', clubId: club.id, ...topical });
    else if (
      (m.derby || upset || Math.abs(gf - ga) >= 3 || Math.random() < 0.12) &&
      !S.news.some((n) => n.type === 'press' && !n.resolved)
    ) {
      const q = lost
        ? `That's a tough one to take. Is your position under threat?`
        : won
          ? `A big result. Can this team go all the way this season?`
          : `A point today — satisfied?`;
      FM.News.add({
        type: 'press',
        title: 'Post-match press conference',
        body: q,
        clubId: club.id,
        choices: lost
          ? [
              {
                label: 'Back the players',
                fx: { morale: 4, board: -1 },
                reply: 'The squad appreciate the public support.',
              },
              { label: 'Take responsibility', fx: { board: 2, fans: 3 }, reply: 'Fans respect the honesty.' },
              {
                label: 'Blame the referee',
                fx: { fans: 4, board: -3 },
                reply: 'The fans love it. The federation is less impressed.',
              },
            ]
          : won
            ? [
                { label: 'Stay humble', fx: { board: 2, morale: 1 }, reply: 'A measured response. The board approve.' },
                {
                  label: 'Talk up the title',
                  fx: { fans: 6, morale: 3, board: -2 },
                  reply: 'The fans are dreaming. Expectations just rose.',
                },
                {
                  label: 'Praise the academy',
                  fx: { fans: 3, youth: 5 },
                  reply: 'The youngsters walk a little taller.',
                },
              ]
            : [
                { label: 'We deserved more', fx: { morale: 2 }, reply: 'The players agree.' },
                { label: 'A fair result', fx: { board: 1 }, reply: 'Sensible.' },
              ],
      });
    }
  };

  // Journalists' questions for the moment you're in. Each returns { body, pid?, choices } or null.
  St.PRESS_BANK = [
    (c) => {
      const r = c.recent || [];
      if (r.length < 3 || r.slice(-3).some((x) => x !== 0)) return null;
      return {
        body: 'Three defeats in a row. Is the dressing room still with you?',
        choices: [
          { label: 'Back the players', fx: { morale: 3, board: -1 }, reply: 'The squad close ranks behind you.' },
          {
            label: 'Demand a reaction',
            fx: { morale: -1, board: 2 },
            reply: 'A message heard loud and clear, inside and outside the club.',
          },
          {
            label: 'Point to the injuries',
            fx: { fans: -2 },
            reply: 'Some sympathy, and some eye-rolling in the stands.',
          },
        ],
      };
    },
    (c) => {
      const r = c.recent || [];
      if (r.length < 3 || r.slice(-3).some((x) => x !== 1)) return null;
      return {
        body: "Three wins on the bounce. What's changed?",
        choices: [
          { label: 'Credit the players', fx: { morale: 3 }, reply: 'The players lap it up.' },
          { label: 'One game at a time', fx: { board: 1 }, reply: 'Measured. The board like it.' },
          {
            label: "We're only getting started",
            fx: { fans: 5, board: -1 },
            reply: 'The fans are dreaming. So are the papers.',
          },
        ],
      };
    },
    (c) => {
      if ((c.boardConf ?? 60) >= 40) return null;
      return {
        body: 'The board are said to be losing patience. Are you worried about your job?',
        choices: [
          {
            label: 'I have their backing',
            fx: { board: -2, fans: 1 },
            reply: 'Bold. The board may see it differently.',
          },
          { label: 'Results will answer it', fx: { board: 2 }, reply: 'The right tone for the boardroom.' },
          { label: "I won't discuss it", fx: {}, reply: 'The story runs anyway.' },
        ],
      };
    },
    (c) => {
      const p = W.squad(c.id)
        .filter((q) => !q.loan && W.interest(q) >= 2)
        .sort((a, b) => b.value - a.value)[0];
      if (!p) return null;
      return {
        body: `There's talk of interest in ${W.name(p)}. Is he for sale?`,
        pid: p.id,
        choices: [
          { label: 'Not for sale', fx: { fans: 3, player: 4 }, reply: `${W.short(p)} is glad to hear it.` },
          { label: 'Everyone has a price', fx: { player: -6, board: 1 }, reply: `${W.short(p)} reads it as a hint.` },
          { label: 'No comment', fx: {}, reply: 'The rumours carry on.' },
        ],
      };
    },
    (c) => {
      const kid = W.squad(c.id).find(
        (q) => W.age(q) <= 20 && q.season.apps >= 3 && q.form.length && U.avg(q.form) >= 7,
      );
      if (!kid) return null;
      return {
        body: `${W.name(kid)} has been excellent. How good can he become?`,
        pid: kid.id,
        choices: [
          { label: 'The sky is the limit', fx: { player: 4, fans: 2 }, reply: `${W.short(kid)} grows another inch.` },
          {
            label: "Let's not get carried away",
            fx: { player: 1, board: 1 },
            reply: 'Keeping his feet on the ground.',
          },
        ],
      };
    },
  ];
  St.pressQuestion = function (c) {
    for (const q of U.shuffle(St.PRESS_BANK)) {
      const r = q(c);
      if (r) return r;
    }
    return null;
  };
  // Before a big game (a derby, a knockout tie, a top side): the pre-match press conference. Mind games can
  // lift your players or fire up theirs (FM.Match reads S.user.preMatch).
  St.preMatchPress = function () {
    const s = FM.S,
      c = W.employed() && W.userClub(),
      fx = c && FM.Season.userFixture();
    if (!fx || fx.intl || s.news.some((n) => n.type === 'press' && !n.resolved && n.pre)) return;
    const opp = FM.clubOf(fx.h === c.id ? fx.a : fx.h);
    const big = c.rival === opp.id || fx.ko || fx.first || opp.rep >= 80;
    if (!big || (s.user.preMatch && s.user.preMatch.day === s.day && s.user.preMatch.year === s.year)) return;
    const mgr = opp.manager && s.staff[opp.manager];
    FM.News.add({
      type: 'press',
      pre: { opp: opp.id },
      title: `Pre-match press conference: ${opp.name}`,
      body: `${mgr ? `${mgr.fn} ${mgr.ln} says his side fear nobody.` : `${opp.name} say they fear nobody.`} Your thoughts?`,
      clubId: c.id,
      choices: [
        {
          label: 'Praise them',
          fx: { match: { us: 0.005, them: 0 } },
          reply: 'Respectful. Nothing for them to pin on the dressing-room wall.',
        },
        {
          label: 'Play mind games',
          fx: { match: U.chance(0.55) ? { us: 0.02, them: 0 } : { us: 0, them: 0.02 } },
          reply: '',
        },
        {
          label: 'Play it down',
          fx: { match: { us: 0.008, them: 0 }, board: 1 },
          reply: 'Low-key. The players take the pressure off themselves.',
        },
      ],
    });
  };
  St.applyPress = function (n, i) {
    const c = W.userClub(),
      ch = n.choices[i],
      f = ch.fx;
    if (n.resolved) return;
    n.resolved = ch.label;
    const sq = W.squad(c.id);
    if (f.player && n.pid && FM.S.players[n.pid])
      FM.S.players[n.pid].morale = U.clamp(FM.S.players[n.pid].morale + f.player, 0, 100);
    if (f.match && n.pre) {
      FM.S.user.preMatch = { opp: n.pre.opp, day: FM.S.day, year: FM.S.year, us: f.match.us, them: f.match.them };
      if (!ch.reply)
        ch.reply =
          f.match.us > 0
            ? 'It gets under their skin. Your players are buzzing.'
            : "It backfires: they've pinned it on their dressing-room wall.";
    }
    if (f.morale)
      sq.forEach((p) => (p.morale = U.clamp(p.morale + f.morale + (W.hasTrait(p, 'Media Friendly') ? 2 : 0), 0, 100)));
    if (f.youth) sq.filter((p) => W.age(p) <= 21).forEach((p) => (p.morale = Math.min(100, p.morale + f.youth)));
    if (f.fans) c.fanMood = U.clamp(c.fanMood + f.fans, 0, 100);
    if (f.board) c.boardConf = U.clamp(c.boardConf + f.board, 0, 100);
    n.reply = ch.reply;
  };

  St.share = function (o) {
    FM.News.add({ type: 'story', ...o });
  };

  // ---------- AI matches ----------
  St.worldMatch = function (fx, m) {
    const r = fx.res,
      hc = C(fx.h),
      ac = C(fx.a);
    const cnt = {};
    r.goals.forEach((g) => (cnt[g.pid] = (cnt[g.pid] || 0) + 1));
    for (const pid in cnt) {
      const p = P(pid);
      if (cnt[pid] >= 3 && Math.random() < 0.8)
        FM.News.add({
          type: 'brief',
          title: `${W.name(p)} hat-trick for ${C(p.clubId).name}`,
          body: `${hc.name} ${r.hg}–${r.ag} ${ac.name}`,
          pid,
          clubId: p.clubId,
        });
      else if (cnt[pid] >= 2 && W.age(p) <= 19 && Math.random() < 0.7)
        St.share({
          kicker: 'WONDERKID',
          title: `${describe(p)} scores twice for ${C(p.clubId).name}`,
          sub: `The ${C(p.clubId).city} crowd has a new favourite.`,
          big: `${W.age(p)}`,
          clubId: p.clubId,
          pid,
        });
    }
    const w = r.hg > r.ag ? hc : r.ag > r.hg ? ac : null;
    if (w) {
      const l = w === hc ? ac : hc;
      if (l.rep - w.rep >= 16 && Math.random() < 0.8)
        FM.News.add({
          type: 'headline',
          paper: U.pick(PAPERS),
          title: `${w.name} shock ${l.name}`,
          body: `${hc.name} ${r.hg}–${r.ag} ${ac.name}. One of the upsets of the season.`,
          clubId: w.id,
        });
      if (m.derby)
        FM.News.add({
          type: 'brief',
          title: `${w.name} win the ${w.derby}`,
          body: `${hc.name} ${r.hg}–${r.ag} ${ac.name}`,
          clubId: w.id,
        });
    }
  };

  // ---------- daily world chatter ----------
  St.daily = function () {
    const S = FM.S;
    // Mid-season sackings
    if (S.day >= 8 && S.day <= 18 && Math.random() < 0.18) {
      for (const comp of W.leagues()) {
        const t = W.sortedTable(comp);
        const cands = t
          .slice(-3)
          .map((r) => C(r.id))
          .filter((c) => !W.isUser(c.id) && c.manager && FM.Season.expectedPos(c) <= comp.clubs.length - 4);
        if (cands.length) {
          const c = cands[0],
            old = S.staff[c.manager];
          St.newManager(
            c,
            `${c.name} sack ${old.fn} ${old.ln}`,
            `With the club ${U.ordinal(W.position(c.id))} in the ${comp.name}, the board have acted.`,
          );
          break;
        }
      }
    }
    // A big club well off the pace changes manager: from a third of the way into the season, a club expected in
    // the top four sitting five or more places below that may sack him (once a season)
    for (const comp of W.leagues()) {
      if (comp.tier !== 1 || FM.Season.gamesPlayed(comp.clubs[0]) < Math.round(comp.fixtures.length / 3)) continue;
      for (const id of comp.clubs) {
        const c = C(id);
        if (W.isUser(id) || !c.manager || c.sackedYear === S.year) continue;
        const exp = FM.Season.expectedPos(c);
        if (exp <= 4 && W.position(id) >= exp + 5 && Math.random() < 0.04) {
          c.sackedYear = S.year;
          const old = S.staff[c.manager];
          St.newManager(
            c,
            `${c.name} sack ${old.fn} ${old.ln}`,
            `${U.ordinal(W.position(id))} is not good enough for a club of ${c.name}'s standing.`,
          );
        }
      }
    }
    // Wonderkid hype
    if (Math.random() < 0.12) {
      const young = Object.values(S.players).filter(
        (p) =>
          !p.retired &&
          p.clubId &&
          W.age(p) <= 19 &&
          p.season.apps >= 3 &&
          p.form.length &&
          U.avg(p.form.slice(-4)) >= 7.1,
      );
      if (young.length) {
        const p = U.pick(young);
        const legend = St.clubLegend(p.clubId);
        const cmp = legend
          ? `compared to club legend ${legend}`
          : U.pick([
              'tipped for a big-money move',
              'compared to a young Brazilian great',
              'called up to the U21 squad',
            ]);
        FM.News.add({
          type: 'headline',
          paper: U.pick(PAPERS),
          title: `Teen ${NOUN[p.pos]} ${W.name(p)} ${cmp}`,
          body: `${describe(p)} averaging ${U.avg(p.form.slice(-4)).toFixed(1)} over his last four games for ${C(p.clubId).name}.`,
          pid: p.id,
          clubId: p.clubId,
        });
      }
    }
    // Veteran refuses transfer / loyalty stories
    if (Math.random() < 0.05) {
      const vets = Object.values(S.players).filter(
        (p) =>
          p.clubId &&
          W.hasTrait(p, 'Loyal') &&
          W.age(p) >= 30 &&
          W.spell(p) &&
          W.spell(p).apps >= 20 &&
          !W.isUser(p.clubId),
      );
      if (vets.length) {
        const p = U.pick(vets);
        FM.News.add({
          type: 'headline',
          paper: U.pick(PAPERS),
          title: `Veteran ${W.name(p)} refuses transfer`,
          body: `"I'll finish my career at ${C(p.clubId).name}." Fans unfurl a banner in his honour.`,
          pid: p.id,
          clubId: p.clubId,
        });
      }
    }
    // Fan protests
    if (Math.random() < 0.06) {
      const angry = Object.values(S.clubs).filter((c) => c.sim === 'full' && c.fanMood < 25 && !W.isUser(c.id));
      if (angry.length) {
        const c = U.pick(angry);
        FM.News.add({
          type: 'world',
          title: `${c.name} fans protest owner's decisions`,
          body: `Hundreds gather outside ${c.stadium.name} demanding change.`,
          clubId: c.id,
        });
      }
    }
  };

  // noPoach: this vacancy was itself created by a poaching (stops chains of moves)
  St.newManager = function (c, title, body, noPoach) {
    const S = FM.S,
      old = c.manager && S.staff[c.manager];
    let from = null;
    // Legacy: retired club legends can return as managers
    const legend = S.retired.find(
      (r) => !r.became && r.lead >= 12 && r.spells.some((s) => s.c === c.id && s.apps >= 60) && S.year - r.year >= 1,
    );
    let nm;
    if (legend && Math.random() < 0.7) {
      legend.became = 'Manager of ' + c.name;
      nm = W.genStaff('Manager', legend.nat, { rep: c.rep - 5 });
      nm.fn = legend.fn;
      nm.ln = legend.ln;
      nm.age = S.year - (legend.year - 35);
      nm.legend = legend.id;
      body += ` Club legend ${legend.fn} ${legend.ln} returns as manager.`;
      St.share({
        kicker: 'HOMECOMING',
        title: `Club legend ${legend.fn} ${legend.ln} returns as ${c.name} manager`,
        sub: `${legend.spells.filter((s) => s.c === c.id).reduce((a, s) => a + s.apps, 0)} games as a player. Now he's in the dugout.`,
        big: '🏠',
        clubId: c.id,
      });
    } else {
      // Managers move around the world: poach a successful one from a smaller club, rehire one out of work, or a new face
      const pick = FM.Records.findManager(c, noPoach);
      if (pick && pick.from) {
        nm = pick.m;
        from = pick.from;
        body += ` ${nm.fn} ${nm.ln} (${D.NATIONS[nm.nat].flag}) leaves ${from.name} to take over.`;
      } else if (pick) {
        nm = pick.m;
        const last = (nm.career || []).filter((x) => S.clubs[x[0]]).at(-1);
        body += ` ${nm.fn} ${nm.ln} (${D.NATIONS[nm.nat].flag}) returns to management${last ? ` after leaving ${S.clubs[last[0]].name}${last[2] && last[2] < S.year ? ` in ${last[2]}` : ' earlier this year'}` : ''}.`;
      } else {
        nm = W.genStaff('Manager', U.chance(0.7) ? c.nat : U.pick(Object.keys(D.NATIONS)), { rep: c.rep });
        body += ` ${nm.fn} ${nm.ln} (${D.NATIONS[nm.nat].flag}) is appointed.`;
      }
    }
    FM.Records.managerChange(c, old, nm, from);
    c.manager = nm.id;
    c.tactic = W.aiTactic(c);
    c.tactic.fam = 45; // his ideas take time to land
    FM.News.add({
      type: 'world',
      cat: 'managers',
      title: from ? `${nm.fn} ${nm.ln} leaves ${from.name} for ${c.name}` : title,
      body: from ? `${title}. ${body}` : body,
      clubId: c.id,
    });
    // The poached manager's old club now needs someone (no further poaching down the chain)
    if (from) from.manager = null; // he has gone: don't treat him as that club's departing manager
    if (from)
      St.newManager(
        from,
        `${from.name} lose ${nm.fn} ${nm.ln} to ${c.name}`,
        `His work caught a bigger club's eye.`,
        true,
      );
  };

  St.clubLegend = function (clubId) {
    const c = C(clubId);
    const r = FM.S.retired
      .filter((x) => x.spells.some((s) => s.c === clubId && s.apps >= 80))
      .sort((a, b) => b.cult - a.cult)[0];
    if (r) return `${r.fn} ${r.ln}`;
    return c.legends && c.legends.length ? c.legends[0].name : null;
  };

  St.rumour = function (p, c) {
    W.addInterest(p);
    FM.News.add({
      type: 'rumour',
      title: `${c.name} linked with ${W.name(p)}`,
      body: `${describe(p)} at ${p.clubId ? C(p.clubId).name : 'no club'}. ${U.pick(['Scouts were spotted at his last game.', 'Talks are said to be at an early stage.', 'His agent has been seen in ' + c.city + '.'])}`,
      pid: p.id,
      clubId: c.id,
    });
  };

  St.transfer = function (p, from, to, fee, f = {}) {
    const involvesUser = W.isUser(to.id) || (from && W.isUser(from.id));
    if (!involvesUser && fee < 4e6 && !(from && from.sim === 'minimal') && !(f.intl && fee >= 1e6) && !f.veteran)
      return;
    const land = (c) => D.NATIONS[c.nat].name;
    let title = fee
      ? `${W.name(p)} completes ${U.money(fee)} move to ${to.name}`
      : `${to.name} sign ${W.name(p)} on a free`;
    if (f.marquee) title = `${to.name} raid ${land(from)} for ${W.name(p)} in ${U.money(fee)} deal`;
    if (f.veteran) title = `Veteran ${W.name(p)} seals move to ${land(to)}'s ${to.name}`;
    const body = `${describe(p)} ${from ? `joins from ${from.name}${f.intl ? ` (${land(from)})` : ''}` : 'was a free agent'}.${f.veteran ? ' One last adventure abroad.' : f.intl ? ` A new country, a new league: ${D.NATIONS[from.nat].flag} → ${D.NATIONS[to.nat].flag}` : ''}`;
    FM.News.add({
      type: 'transfer',
      title,
      body,
      pid: p.id,
      clubId: to.id,
      intl: f.intl,
      big: f.marquee || fee >= 2e7,
    });
    if (f.marquee && fee >= 1.5e7 && !involvesUser)
      St.share({
        kicker: 'MARQUEE SIGNING',
        title: `${to.name} sign ${W.name(p)}`,
        sub: `${describe(p)} leaves ${from.name} for ${U.money(fee)}.`,
        big: U.money(fee),
        clubId: to.id,
        pid: p.id,
      });
    if (from && W.isUser(from.id) && fee >= 1e7)
      St.share({
        kicker: 'RECORD SALE',
        title: `${W.name(p)} sold for ${U.money(fee)}`,
        sub: `${from.name} bank a fortune as he joins ${to.name}.`,
        big: U.money(fee),
        clubId: from.id,
        pid: p.id,
      });
    if (W.isUser(to.id) && from && from.sim === 'minimal')
      St.share({
        kicker: 'SIGNING',
        title: `${describe(p)} joins ${to.name}`,
        sub: `Unearthed by the scouting network in ${D.NATIONS[from.nat].name}.`,
        big: D.NATIONS[p.nat].flag,
        clubId: to.id,
        pid: p.id,
      });
  };

  // ---------- International football ----------
  St.intlWindow = function (games) {
    const S = FM.S,
      uc = W.userClub() || { id: null, short: '' };
    const called = W.squad(uc.id)
      .filter(
        (p) =>
          p.intl &&
          S.intlLog.slice(0, games.length).some((g) => g.h === 'n_' + p.nat || g.a === 'n_' + p.nat) &&
          p.intl.caps > 0,
      )
      .slice(0, 12);
    const T = (id) => S.nteams[id];
    const shock = games
      .filter(
        (g) =>
          g.winner && Math.abs(T(g.h).elo - T(g.a).elo) > 150 && T(g.winner).elo < Math.max(T(g.h).elo, T(g.a).elo),
      )
      .slice(0, 1)[0];
    FM.News.add({
      type: 'world',
      title: 'International break',
      body:
        games
          .slice(0, 8)
          .map(
            (g) =>
              `${D.NATIONS[T(g.h).code].flag} ${T(g.h).name} ${g.hg}–${g.ag} ${T(g.a).name} ${D.NATIONS[T(g.a).code].flag}`,
          )
          .join('\n') +
        (shock
          ? `\n\nShock of the break: ${T(shock.winner).name} beat ${T(shock.winner === shock.h ? shock.a : shock.h).name}.`
          : ''),
    });
    if (called.length)
      FM.News.add({
        type: 'club',
        title: `${called.length} ${uc.short} players on international duty`,
        body: called
          .map((p) => `${D.NATIONS[p.nat].flag} ${W.name(p)} — ${p.intl.caps} caps, ${p.intl.goals} goals`)
          .join('\n'),
        clubId: uc.id,
      });
  };
  St.firstCap = function (p, team, opp) {
    St.share({
      kicker: 'FIRST CAP',
      title: `${describe(p)} makes international debut`,
      sub: `${W.name(p)} wins his first cap for ${team.name} against ${opp.name}.`,
      big: D.NATIONS[p.nat].flag,
      clubId: p.clubId || (W.userClub() || {}).id,
      pid: p.id,
    });
  };
  St.intlTournament = function (res, champ) {
    const S = FM.S;
    St.share({
      kicker: res.id === 'WC' ? 'WORLD CHAMPIONS' : 'CHAMPIONS',
      title: `${champ.name} win the ${res.name}`,
      sub: `Final: ${S.nteams[res.winner].name} ${res.final} ${S.nteams[res.runnerUp].name}.${res.topScorer ? ` Top scorer: ${res.topScorer.name} (${res.topScorer.goals}).` : ''}`,
      big: D.NATIONS[champ.code].flag,
      clubId: (W.userClub() || {}).id,
    });
    const mine = !W.employed()
      ? []
      : W.squad(W.userClub().id).filter(
          (p) => p.nat === champ.code && p.intl && p.intl.caps && FM.Intl.squad(champ.code).includes(p),
        );
    if (mine.length)
      FM.News.add({
        type: 'club',
        title: `${mine.length} of our players are ${res.id === 'WC' ? 'world' : 'continental'} champions`,
        body: mine.map((p) => `${W.name(p)} — ${p.intl.caps} caps`).join('\n'),
        clubId: W.userClub().id,
      });
  };

  St.loan = function (p, from, to, share) {
    const mine = W.isUser(to.id) || W.isUser(from.id);
    if (!mine && !((p.pa >= 80 || from.rep >= 85) && Math.random() < 0.5)) return; // the wider loan market is quiet unless a big prospect moves
    FM.News.add({
      type: 'transfer',
      title: `${W.name(p)} joins ${to.name} on loan`,
      body: `${describe(p)} moves from ${from.name} for the rest of the season. ${to.name} cover ${Math.round(share * 100)}% of his wages.${from.nat !== to.nat ? ` ${D.NATIONS[from.nat].flag} → ${D.NATIONS[to.nat].flag}` : ''}`,
      pid: p.id,
      clubId: to.id,
      intl: from.nat !== to.nat,
    });
  };

  St.youthIntake = function (c, made) {
    const best = made.slice().sort((a, b) => b.pa - a.pa)[0];
    const asst = FM.Staff.get('assistant');
    const tone =
      best.pa >= 84
        ? "I've been doing this 20 years. This one is special."
        : best.pa >= 70
          ? "There's real talent in this group."
          : "A modest group, but they'll work hard.";
    FM.News.add({
      type: 'youth',
      title: `Youth intake: ${made.length} new academy players`,
      body: `${asst.fn} ${asst.ln}: "${tone} Keep an eye on ${W.name(best)}."`,
      pids: made.map((p) => p.id),
      pid: best.id,
      clubId: c.id,
    });
    if (best.pa >= 84)
      St.share({
        kicker: 'ACADEMY',
        title: `${describe(best)} joins the academy`,
        sub: `Staff at ${c.name} believe ${W.name(best)} could be one of the best they've produced.`,
        big: '🌱',
        clubId: c.id,
        pid: best.id,
      });
  };

  St.retirement = function (p) {
    const sp = p.career.spells.slice().sort((a, b) => b.apps - a.apps)[0] || { c: null, apps: 0 };
    const c = sp.c && C(sp.c);
    const lead = W.hasTrait(p, 'Leader') ? 'captain' : W.age(p) >= 36 ? 'veteran' : 'stalwart';
    const involvesUser = p.career.spells.some((s) => W.isUser(s.c));
    if (involvesUser || p.career.apps >= 500)
      St.share({
        kicker: 'RETIREMENT',
        title: `${lead[0].toUpperCase() + lead.slice(1)} ${W.name(p)} retires after ${p.career.apps} games`,
        sub: `${p.career.goals} goals. ${sp.apps} appearances for ${c ? c.name : 'his clubs'}.`,
        big: String(p.career.apps),
        clubId: sp.c,
        pid: null,
      });
    else
      FM.News.add({
        type: 'brief',
        title: `${W.name(p)} hangs up his boots`,
        body: `${p.career.apps} career games, ${p.career.goals} goals.`,
        clubId: sp.c,
      });
  };

  St.seasonEnd = function (e) {
    const S = FM.S;
    for (const to in e.qualified || {})
      FM.News.add({
        type: 'world',
        title: `Qualified for next season's ${S.comps[to].name}`,
        body: e.qualified[to].map((id) => `${D.NATIONS[C(id).nat].flag} ${C(id).name}`).join('\n'),
      });
    const abroad = [];
    for (const cid in e.comps) {
      const x = e.comps[cid],
        ch = C(x.champion);
      // Story cards for the full-simulation leagues and your own; one round-up for the rest of the world
      if (!W.homeLeague(x) && cid !== (W.userClub() || {}).comp) {
        abroad.push(
          `${D.NATIONS[x.nat].flag} ${x.name}: ${ch.name}${x.topScorer ? ` · top scorer ${x.topScorer.name} (${x.topScorer.goals})` : ''}`,
        );
        continue;
      }
      St.share({
        kicker: 'CHAMPIONS',
        title: `${ch.name} are ${x.name} champions`,
        sub: `${e.label}. Title number ${ch.titles[cid]}.${x.topScorer ? ` Golden Boot: ${x.topScorer.name} (${x.topScorer.goals}).` : ''}`,
        big: '🏆',
        clubId: ch.id,
      });
      if (x.poty)
        FM.News.add({
          type: 'award',
          title: `${x.name} Player of the Season: ${x.poty.name}`,
          body: `Average rating ${x.poty.avg} for ${C(x.poty.club).name}.${x.ypoty ? ` Young Player: ${x.ypoty.name}.` : ''}`,
          pid: x.poty.pid,
          clubId: x.poty.club,
        });
      if (x.playoffWinner)
        FM.News.add({
          type: 'headline',
          paper: U.pick(PAPERS),
          title: `${C(x.playoffWinner).name} win the playoff final`,
          body: 'Promotion secured in the most dramatic way possible.',
          clubId: x.playoffWinner,
        });
    }
    if (abroad.length) FM.News.add({ type: 'world', title: 'Champions around the world', body: abroad.join('\n') });
    if (e.promoted.length)
      FM.News.add({
        type: 'world',
        title: 'Promoted: ' + e.promoted.map((id) => C(id).name).join(', '),
        body: 'New faces in higher divisions next season.',
      });
    if (e.relegated.length)
      FM.News.add({
        type: 'world',
        title: 'Relegated: ' + e.relegated.map((id) => C(id).name).join(', '),
        body: `Heartbreak in ${e.relegated.length} towns.`,
      });
  };

  St.welcome = function () {
    const S = FM.S,
      c = W.userClub(),
      asst = FM.Staff.get('assistant');
    if (!c) {
      // a career that starts out of work
      FM.News.add({
        type: 'dressing',
        title: `${asst.fn} ${asst.ln} will be your assistant — wherever you end up`,
        body: `"We'll get a job. Clubs in your range will call — the struggling ones first. Take the right one, not the first one."`,
        clubId: null,
      });
      St.share({
        kicker: 'NEW CAREER',
        title: `${S.user.name} is looking for a first job`,
        sub: 'No club yet. The phone could ring any day.',
        big: '🧳',
      });
      return;
    }
    const I = D.IDENTITY[c.identity];
    FM.News.add({
      type: 'board',
      title: `Board meeting: expectations for ${FM.Season.seasonLabel()}`,
      body:
        FM.Season.objectives(c)
          .map((o) => '• ' + o.text)
          .join('\n') + `\n\nTransfer budget: ${U.money(c.budget)}.`,
      clubId: c.id,
    });
    FM.News.add({
      type: 'club',
      title: `Know your club: ${I.icon} ${I.label}`,
      body: `${I.fans}\n\nThe fans sing ${c.chant}\nTradition: ${c.tradition}.${c.rival ? `\nThe big one: the ${c.derby} against ${S.clubs[c.rival].name}.` : ''}`,
      clubId: c.id,
    });
    FM.News.add({
      type: 'dressing',
      title: `${asst.fn} ${asst.ln}, your assistant, says hello`,
      body: `"${asst.personality === 'Outspoken' ? "I'll always tell you what I think — even when you won't like it." : asst.personality === 'Old-School' ? "Hard work and a flat back four. That's how I see it." : 'The squad is ready to work for you, boss.'}" Scouts are standing by for assignments — check the Scouting tab.`,
      clubId: c.id,
    });
    St.share({
      kicker: 'NEW ERA',
      title: `${S.user.name} appointed ${c.name} manager`,
      sub: `${I.label}. ${c.stadium.name}, ${c.stadium.cap.toLocaleString()} seats. The story starts now.`,
      big: '✍️',
      clubId: c.id,
    });
  };

  // ---------- living world between seasons ----------
  St.worldEvents = function (e) {
    const S = FM.S;
    const full = Object.values(S.clubs).filter((c) => c.sim === 'full');
    // AI managers sacked for underperformance
    full
      .filter((c) => !W.isUser(c.id))
      .forEach((c) => {
        const row = Object.values(e.comps)
          .map((x) => x.table.findIndex((r) => r.id === c.id))
          .find((i) => i >= 0);
        const exp = c.rep; // crude
        if (!c.manager || !S.staff[c.manager])
          return St.newManager(c, `${c.name} appoint a new manager`, 'The club fills its vacant dugout.');
        if (e.relegated.includes(c.id) || (row >= 8 && exp >= 70))
          if (Math.random() < 0.7)
            St.newManager(
              c,
              `${c.name} part ways with ${S.staff[c.manager].fn} ${S.staff[c.manager].ln}`,
              'A disappointing season ends in change.',
            );
      });
    // Takeover
    if (Math.random() < 0.5) {
      const c = U.pick(full.filter((x) => !W.isUser(x.id) && x.identity !== 'oil'));
      c.identity = 'oil';
      c.balance += FM.Season.revenuePotential(c) * 2;
      c.budget = Math.round(c.balance * 0.5);
      c.rep = Math.min(99, c.rep + 4);
      FM.News.add({
        type: 'world',
        title: `Consortium completes takeover of ${c.name}`,
        body: `A sovereign-wealth-backed group promises "a new era". Fans are divided. Transfer budget tripled.`,
        clubId: c.id,
        big: true,
      });
    }
    // Stadium expansion for a thriving club
    const thriving = full.filter((c) => c.fanMood >= 75 && !W.isUser(c.id));
    if (thriving.length) {
      const c = U.pick(thriving);
      FM.Records.expandStadium(c, 5000, 'Expansion for record demand');
      FM.News.add({
        type: 'world',
        title: `${c.name} expand ${c.stadium.name}`,
        body: `Capacity rises to ${c.stadium.cap.toLocaleString()} after record demand.`,
        clubId: c.id,
      });
    }
    // Rule changes
    if (Math.random() < 0.45) {
      const options = [
        () => {
          S.rules.subs = S.rules.subs === 5 ? 3 : 5;
          return [
            `Federation sets substitutions at ${S.rules.subs} per match`,
            S.rules.subs === 3
              ? 'A return to tradition. Squad depth matters less; stamina matters more.'
              : 'Five subs are back. Deep squads benefit.',
          ];
        },
        () => {
          if (S.rules.reg === 'real' || S.rules.foreignLimit >= W.NO_LIMIT) return null; // real league rules, or you chose no limit: the federation leaves it be
          S.rules.foreignLimit = U.pick([4, 5, 6, 8]);
          return [
            `New homegrown rule: max ${S.rules.foreignLimit} foreign players in a matchday squad`,
            'Clubs scramble to promote academy talent.',
          ];
        },
        () => {
          const lg = U.pick(W.leagues().filter((l) => l.tier === 1));
          lg.tvBoost = (lg.tvBoost || 1) * 1.2;
          return [`Record TV deal for ${lg.name}`, `${lg.name} clubs will receive 20% more broadcast income.`];
        },
      ];
      const change = U.pick(options)();
      if (change) FM.News.add({ type: 'world', title: change[0], body: change[1], big: true });
    }
  };
})();
