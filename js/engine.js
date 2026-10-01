// Match engine: minute-by-minute simulation shared by quick-sims and the live view.
// In live mode it also emits a "script" of ball actions per minute so the visual
// pitch always shows exactly what the simulation decided.
(function () {
  const FM = window.FM,
    U = FM.U,
    D = FM.D,
    W = FM.W;

  // ---- Calibration: the knobs that tie the engine to real football (tools/calibrate.mjs measures the result) ----
  // Tuned against real top-flight averages (goals 2.6–2.9, home/draw/away ~45/25/30, ~24 shots and ~8.5 on
  // target, ~0.3 penalties, ~4 cards). Re-run tools/calibrate.mjs after any engine change.
  const CAL = (FM.CAL = {
    aiFam: 1, // AI clubs' tactical familiarity counts like yours (0 = off)
    defActs: 0.7, // chance per minute that the side without the ball makes a tackle or interception (~25 a match, as real)
    defRating: 0.07, // what each tackle or interception adds to the player's match rating
    mgr: 0.006, // an AI manager's ability (8–17, 12 neutral) scales his side's strength by this per point (about −2.5% to +3%)
    chanceRate: 0.14, // shot opportunities per minute per side, before strengths and tactics
    xgScale: 0.82, // scales open-play chance quality
    penRate: 0.013, // share of chances that are penalties
    spWeight: 0.3,
    spXg: 1.3, // how often chances come from corners/free kicks, and their quality
    homeAtt: 1.1,
    homeMid: 1.04,
    homeDef: 1.02, // home advantage (none at neutral venues)
    savedBase: 0.2,
    savedXg: 0.6, // chance a missed shot was on target (saved)
    yellowRate: 0.017,
    redRate: 0.00016, // cautions and straight reds per side per minute
    bookedCaution: 0.3, // a booked player's chance of another card, relative to the rest
    gameState: 0.25, // late on, a leading side creates fewer chances and a trailing side more
    qualityExp: 1.1, // how sharply the attack/defence gap turns into chances (higher = more predictable, more lopsided)
    dayForm: 0.04, // each side's form on the day: strength × (1 ± this, normally distributed) — upsets
    conf: 0.03, // a club's confidence (−1 to 1, from recent results against expectations) scales its strength by ±this
    gkErr: 0.008, // chance that a keeper spills a shot he would have saved (scaled by his handling and composure)
    star: 0.04, // in a big game a side's best player raises his level by this
    snow: 0.85, // chance rate in snow
    heat: 1.3, // fatigue in the heat
    targetGoals: 2.72, // tactical equilibrium: the league scoring rate the game settles back toward over long saves
  });
  const AW = { GK: 0, CB: 0.1, FB: 0.25, WB: 0.35, DM: 0.2, CM: 0.4, AM: 0.8, W: 0.85, ST: 1 };
  const MW = { GK: 0.1, CB: 0.3, FB: 0.5, WB: 0.5, DM: 0.9, CM: 1, AM: 0.8, W: 0.5, ST: 0.3 };
  const DW = { GK: 0.5, CB: 1, FB: 0.8, WB: 0.6, DM: 0.8, CM: 0.45, AM: 0.15, W: 0.15, ST: 0.1 };
  const attackVal = (a) =>
    (a.finishing * 1.2 + a.dribbling + a.pace * 0.8 + a.technique * 0.8 + a.composure * 0.7) / 4.5;
  const midVal = (a) => (a.passing * 1.2 + a.vision + a.technique * 0.8 + a.composure * 0.5 + a.workRate * 0.5) / 4;
  const defVal = (a) =>
    (a.tackling * 1.2 + a.positioning * 1.2 + a.strength * 0.6 + a.pace * 0.5 + a.workRate * 0.5) / 4;
  const gkVal = (a) => (a.reflexes * 1.3 + a.handling + a.positioning * 0.7) / 3;

  // A good manager gets more out of the same players: an AI club's manager ability shifts its strength by about
  // −2.5% to +3% (the user is the manager, so never the user's side). Club dynamics that reputation doesn't predict.
  FM.managerBoost = function (club, isUser) {
    if (isUser || !club || club.sim === 'nation' || !club.manager) return 1;
    const m = FM.S.staff[club.manager];
    return m ? 1 + (m.ability - 12) * CAL.mgr : 1;
  };
  // How well a role suits a player: each role leans on attack, midfield or defence (plus crossing, pressing or
  // getting forward, measured against a typical professional's 12), judged against the player's own profile, so a creative centre-back gets Ball-Playing CB
  FM.roleScore = function (p, t, name) {
    const r = D.ROLES[t][name] || {},
      a = p.attrs;
    const att = attackVal(a),
      mid = midVal(a),
      def = defVal(a),
      avg = (att + mid + def) / 3;
    return (
      (r.att || 0) * (att - avg) +
      (r.mid || 0) * (mid - avg) +
      (r.def || 0) * (def - avg) +
      (r.cross || 0) * ((a.pace + a.passing) / 2 - 12) * 0.2 +
      (r.press || 0) * ((a.workRate + a.stamina) / 2 - 12) * 0.2 +
      (r.dx || 0) * ((a.pace + a.stamina) / 2 - 12) * 0.1 +
      // an all-round role (equal leanings, e.g. Box-to-Box) is about getting up and down the pitch
      (r.att && r.att === r.mid && r.mid === r.def ? r.att * ((a.workRate + a.stamina) / 2 - 12) * 2 : 0)
    );
  };
  FM.bestRole = (p, t, exclude = []) =>
    Object.keys(D.ROLES[t])
      .filter((name) => !exclude.includes(name))
      .reduce((best, name) => (FM.roleScore(p, t, name) > FM.roleScore(p, t, best) ? name : best));
  // One of each specialist role per team (a single sweeper, one No. 10 free role, one false nine)
  FM.UNIQUE_ROLES = ['Libero', 'Trequartista', 'False 9'];
  FM.bestRoles = function (xi, slots, defaults) {
    const taken = new Set(),
      out = slots.map((s, i) => defaults[i]);
    // the strongest claim to a specialist role gets it: go through the players by how much they suit their best role
    const order = slots
      .map((s, i) => i)
      .filter((i) => xi[i])
      .sort(
        (a, b) =>
          FM.roleScore(xi[b], slots[b].t, FM.bestRole(xi[b], slots[b].t)) -
          FM.roleScore(xi[a], slots[a].t, FM.bestRole(xi[a], slots[a].t)),
      );
    for (const i of order) {
      const r = FM.bestRole(xi[i], slots[i].t, [...taken]);
      out[i] = r;
      if (FM.UNIQUE_ROLES.includes(r)) taken.add(r);
    }
    return out;
  };

  // Who wins the ball back, by slot (relative): centre-backs and holding midfielders most, keepers never
  const DEF_SHARE = { GK: 0, CB: 3, FB: 2.2, WB: 2, DM: 3.2, CM: 2, AM: 0.9, W: 1, ST: 0.5 };

  // Position of a slot's player in that side's frame (x → attacking goal)
  FM.Pos = function (side, i, inPoss, ball) {
    const s = side.slots[i];
    let x = s.x,
      y = s.y;
    const role = D.ROLES[s.t][side.tactic.roles[i]] || {};
    const T = side.tactic,
      front = s.t === 'ST' || s.t === 'W' || s.t === 'AM';
    if (inPoss) {
      x += 0.1 + (role.dx || 0);
      let pull = role.in || 0;
      if (T.invFB && s.t === 'FB') {
        pull = 0.3;
        x += 0.08;
      }
      y += (0.5 - y) * pull;
      if (T.buildup === 'Counter') x -= front ? 0 : 0.04;
      // width: wide stretches the shape to the touchlines, narrow tucks it in
      if (s.t !== 'GK') y = 0.5 + (y - 0.5) * (T.width === 'Wide' ? 1.15 : T.width === 'Narrow' ? 0.85 : 1);
      // playing out from the back: the centre-backs split and the holding midfielder drops between them
      if ((T.buildup === 'Short' || T.buildup === 'Possession') && ball.x < 0.4) {
        if (s.t === 'CB') y = 0.5 + (y - 0.5) * 1.5;
        if (s.t === 'DM') x -= 0.06;
      }
      if (T.buildup === 'Possession' && (s.t === 'FB' || s.t === 'WB')) x += 0.05; // full-backs push on
      if (T.buildup === 'Direct' && s.t === 'ST') x += 0.05; // a target to hit early
    } else {
      x += { 'High Press': 0.08, 'Mid Block': 0, 'Low Block': -0.09 }[T.press] || 0;
      if (T.press === 'High Press' && front) x += 0.04; // the front line presses high
      if (T.press === 'Low Block' && s.t !== 'GK') y = 0.5 + (y - 0.5) * 0.88; // compact: no gaps between the lines
      if (T.buildup === 'Counter' && (s.t === 'ST' || s.t === 'W')) x += 0.06; // forwards stay up to break
    }
    if (s.t !== 'GK') {
      x += (ball.x - 0.5) * 0.38;
      y += (ball.y - 0.5) * 0.22;
    } else {
      x = 0.03 + Math.max(0, ball.x - 0.5) * 0.12;
      y = 0.5 + (ball.y - 0.5) * 0.25;
    }
    return { x: U.clamp(x, 0.02, 0.96), y: U.clamp(y, 0.04, 0.96) };
  };

  class Match {
    constructor(o) {
      this.o = o;
      this.comp = o.comp;
      this.knockout = !!o.knockout;
      this.neutral = !!o.neutral; // finals and tournaments: no home advantage
      // Second leg of a two-legged tie: goals already scored in leg 1 by [this home side, this away side]
      this.agg = o.agg || null;
      this.awayGoals = !!o.awayGoals;
      this.live = !!o.live;
      const hc = FM.clubOf(o.h),
        ac = FM.clubOf(o.a);
      this.weather = o.weather || W.weatherFor(hc);
      this.derby = hc.rival === ac.id;
      // A rivalry that has grown out of past meetings (FM.Records): a big game with a bit more edge
      this.heated = !this.derby && FM.Records.heated(hc.id, ac.id);
      this.big = this.derby || this.heated || Math.max(hc.rep, ac.rep) >= 80;
      // A big occasion for the stars: a derby, a knockout tie, or two top sides meeting
      this.bigGame = this.derby || this.heated || this.knockout || Math.min(hc.rep, ac.rep) >= 75;
      this.homeF = this.neutral ? 0 : Match.homeFactor(hc, ac, this.derby || this.heated);
      this.sides = [this.mkSide(hc, 0), this.mkSide(ac, 1)];
      // What you said before the game (a pre-match press conference): it lifts your side, or theirs
      const pm = FM.S.user && FM.S.user.preMatch;
      if (pm && pm.year === FM.S.year && pm.day === FM.S.day) {
        const us = this.sides.find((sd) => sd.user),
          them = us && this.sides[1 - us.idx];
        if (us && them.club.id === pm.opp) {
          us.mods.att += pm.us;
          us.mods.mid += pm.us;
          them.mods.att += pm.them;
          them.mods.mid += pm.them;
        }
      }
      // What the result was expected to be worth to the home side (win 1, draw ½): confidence moves against it
      const avg = (sd) => U.avg(sd.xi.filter(Boolean), (p) => p.ca);
      this.exp = FM.Season.expected(avg(this.sides[0]), avg(this.sides[1]), true, this.neutral);
      this.events = [];
      this.momentum = [];
      this.mom = 0;
      this.idx = 0;
      this.ball = { side: 0, slot: 9, x: 0.5, y: 0.5 };
      this.finished = false;
      this.pens = null;
      this.shotLog = [];
      this.xgLine = [];
      this.buildTimeline();
    }

    mkSide(club, idx) {
      const user = W.isUser(club.id) || W.isUserNation(club.id);
      const tactic = JSON.parse(JSON.stringify(W.isUser(club.id) ? FM.S.user.tactic : club.tactic));
      const { xi, bench } = W.pickXI(club.id, tactic);
      const slots = D.FORMATIONS[tactic.formation];
      const sd = {
        idx,
        club,
        user,
        tactic,
        slots,
        xi: xi.slice(),
        bench: bench.slice(),
        subsLeft: FM.S.rules.subs,
        subWindows: 3,
        st: {},
        rating: {},
        mins: {},
        on: {},
        off: {},
        yc: {},
        sentOff: {},
        injured: {},
        mods: { att: 0, mid: 0, def: 0 },
        goals: 0,
        xg: 0,
        shots: 0,
        sot: 0,
        possTicks: 0,
        passes: {},
        passCount: 0,
        heat: new Array(12 * 8).fill(0),
        subsMade: [],
        ps: {},
      };
      xi.forEach((p) => {
        if (p) {
          sd.st[p.id] = p.fitness;
          sd.rating[p.id] = 6.3;
          sd.on[p.id] = 0;
          sd.ps[p.id] = { pass: 0, kp: 0, sh: 0, sot: 0, tk: 0, ic: 0, tch: 0, sv: 0, ga: 0, xga: 0 };
        }
      });
      // On the day: form (a little luck either way, capped), confidence from recent results, and the best player
      const s = CAL.dayForm;
      sd.day = 1 + U.clamp(U.gauss(0, s), -2.5 * s, 2.5 * s);
      sd.conf = club.sim === 'nation' ? 0 : club.conf || 0;
      const star = xi.filter(Boolean).sort((a, b) => b.ca - a.ca)[0];
      sd.star = star && star.id;
      // Armband: the club captain if he starts, else the best leader in the XI (passed on if he goes off)
      const capt = FM.Matchday.armband(
        sd,
        xi.filter(Boolean).map((p) => ({ p })),
      );
      sd.capt = capt && capt.id;
      return sd;
    }

    buildTimeline() {
      const t = [],
        s1 = U.randi(1, 3),
        s2 = U.randi(2, 6);
      for (let m = 1; m <= 45; m++) t.push({ m, label: `${m}'`, half: 1 });
      for (let i = 1; i <= s1; i++) t.push({ m: 45, label: `45+${i}'`, half: 1 });
      t.push({ ev: 'HT' });
      for (let m = 46; m <= 90; m++) t.push({ m, label: `${m}'`, half: 2 });
      for (let i = 1; i <= s2; i++) t.push({ m: 90, label: `90+${i}'`, half: 2 });
      t.push({ ev: 'FT90' });
      this.timeline = t;
    }
    addExtraTime() {
      const t = this.timeline;
      for (let m = 91; m <= 105; m++) t.push({ m, label: `${m}'`, half: 3 });
      t.push({ ev: 'ETHT' });
      for (let m = 106; m <= 120; m++) t.push({ m, label: `${m}'`, half: 4 });
      t.push({ ev: 'FT120' });
    }

    get minute() {
      const e = this.timeline[Math.max(0, this.idx - 1)];
      return e && e.m ? e.m : 0;
    }
    get clock() {
      for (let i = this.idx - 1; i >= 0; i--) if (this.timeline[i].label) return this.timeline[i].label;
      return "0'";
    }
    onPitch(sd) {
      return sd.xi.map((p, i) => ({ p, i })).filter(({ p }) => p && !sd.sentOff[p.id]);
    }

    // A player's fit in his slot (side and role included) and each slot's role, worked out once per match: the
    // engine asks every minute. Subs and a change of tactic clear them.
    fitOf(sd, p, i) {
      const c = (sd.fitC = sd.fitC || []),
        e = c[i];
      if (e && e[0] === p) return e[1];
      const f = 0.62 + 0.38 * W.fitAt(p, sd.slots[i].t, sd.slots[i], sd.tactic.roles[i]);
      c[i] = [p, f];
      return f;
    }
    roleAt(sd, i) {
      const c = (sd.roleC = sd.roleC || []);
      return c[i] || (c[i] = D.ROLES[sd.slots[i].t][sd.tactic.roles[i]] || {});
    }
    factor(sd, p) {
      let f = 0.72 + 0.28 * Math.sqrt((sd.st[p.id] ?? 100) / 100);
      f *= 0.96 + p.morale / 1250;
      if (this.weather[0] === 'Rain' && W.hasTrait(p, 'Fair-Weather')) f *= 0.9;
      if (this.big && W.hasTrait(p, 'Big Game Player')) f *= 1.06;
      if (this.bigGame && p.id === sd.star) f *= 1 + CAL.star;
      if (this.derby && W.hasTrait(p, 'Derby Specialist')) f *= 1.08;
      if (sd.injured[p.id]) f *= 0.6;
      return f;
    }

    strength(sd) {
      let a = 0,
        aw = 0,
        m = 0,
        mw = 0,
        d = 0,
        dw = 0,
        gk = 10,
        ra = 0,
        rm = 0,
        rd = 0,
        cross = 0,
        win = 0,
        capt = null;
      const on = this.onPitch(sd);
      for (const { p, i } of on) {
        if (p.id === sd.capt) capt = p;
        const t = sd.slots[i].t,
          fit = this.fitOf(sd, p, i),
          f = this.factor(sd, p) * fit,
          A = p.attrs;
        a += AW[t] * attackVal(A) * f;
        aw += AW[t];
        m += MW[t] * midVal(A) * f;
        mw += MW[t];
        d += DW[t] * defVal(A) * f;
        dw += DW[t];
        if (t === 'GK') gk = gkVal(A) * f;
        const r = this.roleAt(sd, i);
        ra += r.att || 0;
        rm += r.mid || 0;
        rd += r.def || 0;
        cross += r.cross || 0;
        win += (r.win || 0) + (r.press || 0) * 0.4; // ball-winners and pressing forwards win it back
      }
      if (!capt && on.length) {
        capt = FM.Matchday.armband(sd, on);
        sd.capt = capt && capt.id;
      }
      const T = sd.tactic,
        reds = Object.keys(sd.sentOff).length;
      let att = (a / aw) * (1 + ra),
        mid = (m / mw) * (1 + rm),
        def = (d / dw) * (1 + rd);
      const b = Match.BUILDUP[T.buildup] || Match.BUILDUP.Short;
      att *= b[0];
      mid *= b[1];
      def *= b[2];
      const shape = T.formation[0];
      if (shape === '3') {
        att *= 1.04;
        def *= 0.97;
      }
      if (shape === '5') {
        att *= 0.94;
        def *= 1.06;
      }
      if (T.invFB) {
        mid *= 1.04;
        def *= 0.99;
      }
      // The warm-up: an intense one starts sharp, a light one slowly (the first 15 minutes)
      if (sd.warm && this.minute <= 15) {
        const w = sd.warm === 'intense' ? 1.03 : sd.warm === 'light' ? 0.98 : 1;
        att *= w;
        mid *= w;
      }
      // Rain: the ball skids and short passing suffers
      if (this.weather[0] === 'Rain' && (T.buildup === 'Short' || T.buildup === 'Possession')) mid *= 0.97;
      // Home advantage, as big as the crowd, the stadium and the occasion make it (Match.homeFactor)
      if (sd.idx === 0 && this.homeF) {
        const h = this.homeF;
        att *= 1 + (CAL.homeAtt - 1) * h;
        mid *= 1 + (CAL.homeMid - 1) * h;
        def *= 1 + (CAL.homeDef - 1) * h;
      }
      // Form on the day and confidence
      const day = sd.day * (1 + sd.conf * CAL.conf);
      att *= day;
      mid *= day;
      def *= day;
      const famNow =
        sd.club.sim === 'nation'
          ? null
          : sd.user
            ? (sd.tactic.fam ?? FM.S.user.tactic.fam)
            : CAL.aiFam
              ? (sd.tactic.fam ?? 70)
              : null;
      if (famNow != null) {
        const f = 1 + (famNow - 60) * 0.0008;
        att *= f;
        mid *= f;
        def *= f;
      }
      const cb = FM.Matchday.capBoost(capt) * FM.managerBoost(sd.club, sd.user);
      att *= cb;
      mid *= cb;
      def *= cb;
      const pen = 1 - 0.11 * reds;
      att *= pen * (1 + sd.mods.att);
      mid *= pen * (1 + sd.mods.mid);
      def *= pen * (1 + sd.mods.def);
      return { att, mid, def, gk, rate: b[3], q: b[4], cross, win: Math.min(0.08, win) };
    }

    // ---------- one simulated minute ----------
    step() {
      if (this.finished) return null;
      const tl = this.timeline[this.idx++];
      if (!tl) {
        this.finish();
        return { ev: 'FT', events: [] };
      }
      if (tl.ev) return this.periodEvent(tl.ev);
      const out = { tl, events: [], script: [] };
      const [H, A] = this.sides;
      const sH = this.strength(H),
        sA = this.strength(A);
      // pressing effects on opponent control
      const pm = { 'High Press': 0.93, 'Mid Block': 1, 'Low Block': 1.06 };
      // the other side's ball-winners and pressers make it harder to keep the ball
      const midH = sH.mid * pm[A.tactic.press] * (1 - sA.win),
        midA = sA.mid * pm[H.tactic.press] * (1 - sH.win);
      let possH = U.clamp(Math.pow(midH, 3) / (Math.pow(midH, 3) + Math.pow(midA, 3)), 0.25, 0.75);
      if (A.tactic.press === 'Low Block') possH = Math.min(0.78, possH + 0.04);
      if (H.tactic.press === 'Low Block') possH = Math.max(0.22, possH - 0.04);

      const rates = [H, A].map((sd, k) => {
        const me = k ? sA : sH,
          op = k ? sH : sA,
          opSd = k ? H : A;
        const poss = k ? 1 - possH : possH;
        let r = CAL.chanceRate * (FM.S.era || 1) * Math.pow(me.att / op.def, CAL.qualityExp) * (0.5 + poss) * me.rate;
        if (opSd.tactic.press === 'Low Block') r *= 0.88;
        if (sd.tactic.press === 'Low Block') r *= 0.92;
        if (sd.tactic.buildup === 'Counter' && opSd.tactic.press === 'High Press') r *= 1.15;
        if (opSd.tactic.buildup === 'Possession') r *= 0.93;
        if (this.weather[0] === 'Snow') r *= CAL.snow; // heavy pitch, fewer chances
        // Game state: from the hour mark the team in front sits deeper and the team behind pushes
        const diff = sd.goals - opSd.goals;
        if (diff && tl.m >= 55) r *= 1 - Math.sign(diff) * CAL.gameState * Math.min(1, (tl.m - 55) / 35);
        return r;
      });

      // momentum (danger)
      const dH = (possH * sH.att) / sA.def,
        dA = ((1 - possH) * sA.att) / sH.def;
      let chanceSide = -1;
      const roll = Math.random();
      if (roll < rates[0]) chanceSide = 0;
      else if (roll < rates[0] + rates[1]) chanceSide = 1;
      const possSide = chanceSide >= 0 ? chanceSide : Math.random() < possH ? 0 : 1;
      this.sides[possSide].possTicks++;
      // record possession for both (stats use ticks + possH mix for smoothness)
      H.possAcc = (H.possAcc || 0) + possH;
      A.possAcc = (A.possAcc || 0) + 1 - possH;

      this.defend(1 - possSide);
      if (this.live || this.o.track) this.circulate(possSide, out, chanceSide >= 0);
      let impulse = (dH - dA) * 0.6;
      if (chanceSide >= 0) {
        const res = this.chance(chanceSide, chanceSide ? sA : sH, chanceSide ? sH : sA, tl, out);
        impulse += (chanceSide ? -1 : 1) * (0.6 + res.xg * 4);
      }
      this.mom = U.clamp(this.mom * 0.82 + impulse * 0.18, -1, 1);
      this.momentum.push(this.mom);
      this.xgLine.push([H.xg, A.xg]);

      this.discipline(tl, out);
      this.fatigue(tl, out);
      if (tl.m >= 58)
        this.sides.forEach((sd) => {
          if (!sd.user || !this.live) this.aiSubs(sd, tl);
        }); // assistant handles subs in instant results
      this.events.push(...out.events);
      return out;
    }

    periodEvent(ev) {
      const out = { ev, events: [] };
      if (ev === 'HT') out.events.push({ k: 'period', text: 'Half-time', min: "45'" });
      if (ev === 'FT90') {
        if (this.knockout && this.tied()) {
          this.addExtraTime();
          out.events.push({ k: 'period', text: 'Extra time!', min: "90'" });
          out.ev = 'ET';
        } else {
          this.finish();
          out.ev = 'FT';
        }
      }
      if (ev === 'ETHT') out.events.push({ k: 'period', text: 'Extra-time break', min: "105'" });
      if (ev === 'FT120') {
        if (this.tied()) this.shootout(out);
        this.finish();
        out.ev = 'FT';
      }
      this.events.push(...out.events);
      return out;
    }

    // Winning the ball back, in every match (not only the ones drawn on the pitch): the side without the ball makes
    // a tackle or an interception, mostly through its defenders and midfielders, ball-winning roles and the best
    // tacklers and readers of the game. A tackler wins it with his tackling, an interceptor with his positioning;
    // a high press makes more tackles, a low block more interceptions. Each one counts in his stats and rating.
    defend(k) {
      if (Math.random() >= CAL.defActs) return;
      const sd = this.sides[k],
        on = this.onPitch(sd);
      if (!on.length) return;
      const o = U.wpick(on, ({ p, i }) => {
        const t = sd.slots[i].t,
          role = D.ROLES[t] && D.ROLES[t][sd.tactic.roles[i]];
        return (
          (DEF_SHARE[t] || 0) *
          (1 + ((role && role.win) || 0) * 20 + ((role && role.press) || 0) * 8) *
          (0.6 + (p.attrs.tackling + p.attrs.positioning) / 40)
        );
      });
      if (!o) return;
      const a = o.p.attrs,
        lean = { 'High Press': 1.15, 'Low Block': 0.85 }[sd.tactic.press] || 1;
      const tackle = Math.random() < U.clamp((a.tackling / (a.tackling + a.positioning)) * 1.2 * lean, 0.25, 0.8);
      const ps = sd.ps[o.p.id];
      if (ps) tackle ? ps.tk++ : (ps.ic = (ps.ic || 0) + 1);
      if (sd.rating[o.p.id] != null) sd.rating[o.p.id] += CAL.defRating;
    }

    // ball circulation for the visual script + passing network/heat map
    circulate(side, out, leadingToChance) {
      const sd = this.sides[side];
      const on = this.onPitch(sd);
      if (!on.length) return;
      const won = this.ball.side !== side;
      if (won) {
        // turnover: nearest defender wins it back
        const bx = 1 - this.ball.x,
          by = 1 - this.ball.y;
        let best = on[0],
          bd = 9;
        for (const o of on) {
          const pp = FM.Pos(sd, o.i, false, { x: bx, y: by });
          const dd = (pp.x - bx) ** 2 + (pp.y - by) ** 2;
          if (dd < bd) {
            bd = dd;
            best = o;
          }
        }
        this.ball = { side, slot: best.i, x: bx, y: by };
        out.script.push({ k: 'win', side, to: best.i }); // drawn only: tackles and interceptions are counted in defend()
      }
      // How the side moves the ball follows its build-up (Match.PASSING): how many passes, how far, how forward
      const T = sd.tactic,
        P = Match.PASSING[T.buildup] || Match.PASSING.Short,
        broke = won && T.buildup === 'Counter'; // a counter: straight forward, fast, before they recover
      let n = broke ? U.randi(1, 3) : U.randi(P.n[0], P.n[1]);
      if (leadingToChance) n = Math.min(n, 3);
      const wideW = (T.width === 'Wide' ? 0.5 : T.width === 'Narrow' ? -0.4 : 0) + (P.wide || 0);
      for (let k = 0; k < n; k++) {
        const from = this.ball.slot;
        const fp = FM.Pos(sd, from, true, this.ball);
        const deep = this.ball.x < 0.4;
        // the keeper is part of it when a short side plays out from the back
        const cands = on.filter((o) => o.i !== from && (sd.slots[o.i].t !== 'GK' || (deep && P.gk && !broke)));
        const pick = U.wpick(cands, (o) => {
          const pp = FM.Pos(sd, o.i, true, this.ball);
          const dist = Math.hypot(pp.x - fp.x, pp.y - fp.y);
          const prog = pp.x - fp.x,
            wide = Math.abs(pp.y - 0.5) > 0.25;
          return (
            Math.exp(-dist * (broke ? 2 : P.reach)) *
            (prog >= 0 ? 1 + prog * (broke ? 5 : P.prog) : P.back) *
            (wide ? Math.max(0.2, 1 + wideW) : 1 - Math.min(0.3, wideW * 0.3)) *
            (sd.slots[o.i].t === 'GK' ? P.gk : 1) *
            (0.5 + o.p.attrs.passing / 20)
          );
        });
        if (!pick) break;
        const to = pick.i;
        const tp = FM.Pos(sd, to, true, this.ball);
        this.ball = { side, slot: to, x: tp.x, y: tp.y };
        out.script.push({ k: 'pass', side, from, to, fast: broke || P.fast, slow: P.slow });
        const key = from < to ? `${from}-${to}` : `${to}-${from}`;
        sd.passes[key] = (sd.passes[key] || 0) + 1;
        sd.passCount++;
        this.touch(sd, tp);
        const pf = sd.xi[from],
          pt = sd.xi[to];
        if (pf) {
          sd.rating[pf.id] += 0.012;
          if (sd.ps[pf.id]) sd.ps[pf.id].pass++;
        }
        if (pt && sd.ps[pt.id]) sd.ps[pt.id].tch++;
      }
    }
    touch(sd, pos) {
      const gx = U.clamp(Math.floor(pos.x * 12), 0, 11),
        gy = U.clamp(Math.floor(pos.y * 8), 0, 7);
      sd.heat[gy * 12 + gx]++;
    }

    chance(side, me, op, tl, out) {
      const sd = this.sides[side],
        od = this.sides[1 - side];
      const on = this.onPitch(sd).filter(({ i }) => sd.slots[i].t !== 'GK');
      const T = sd.tactic;
      const w = {
        through: 0.2,
        cross: 0.2 + me.cross * 0.3,
        cutback: 0.14,
        longshot: 0.2,
        counter: 0.1,
        setpiece: CAL.spWeight,
      };
      if (T.buildup === 'Direct') {
        w.cross += 0.1;
        w.longshot += 0.05;
      }
      if (T.buildup === 'Counter') w.counter += 0.18;
      if (T.buildup === 'Possession' || T.buildup === 'Short') {
        w.cutback += 0.08;
        w.through += 0.05;
      }
      if (T.buildup === 'Wing Play') {
        w.cross += 0.2;
        w.cutback += 0.04;
      }
      // Width: wide stretches them for crosses; narrow plays through the middle (and leaves the flanks)
      if (T.width === 'Wide') {
        w.cross += 0.12;
        w.through -= 0.03;
      } else if (T.width === 'Narrow') {
        w.cross -= 0.1;
        w.through += 0.04;
        w.cutback += 0.03;
      }
      if (od.tactic.width === 'Narrow') w.cross += 0.08;
      if (od.tactic.press === 'High Press') w.counter += 0.06;
      if (od.tactic.press === 'Low Block') {
        w.longshot += 0.08;
        w.through -= 0.06;
      }
      let type = U.wpick(Object.keys(w), (k) => Math.max(0.01, w[k]));
      if (Math.random() < CAL.penRate) type = 'penalty';
      const XG = {
        through: [0.12, 0.34],
        cross: [0.03, 0.11],
        cutback: [0.1, 0.26],
        longshot: [0.015, 0.05],
        counter: [0.1, 0.3],
        setpiece: [0.03, 0.09],
        penalty: [0.745, 0.765],
      }[type]; // penalties go to the designated taker, so the base rate sits a touch lower
      let xg = U.rand(XG[0], XG[1]) * (type === 'penalty' ? 1 : type === 'setpiece' ? CAL.spXg : CAL.xgScale);
      // Set pieces: a direct free kick for the free-kick taker, or a corner delivered by the corner taker
      const Md = FM.Matchday;
      let sp = null,
        spTaker = null;
      if (type === 'setpiece') {
        sp = Math.random() < 0.3 ? 'fk' : 'cor';
        spTaker = Md.taker(sd, sp, on);
        if (spTaker)
          xg *=
            sp === 'fk'
              ? 0.45 + (Md.spScore(spTaker.p, 'fk') / 20) * 0.7
              : 0.6 + (Md.spScore(spTaker.p, 'cor') / 20) * 0.45;
        if (sd.user && sd.club.sim !== 'nation') xg *= FM.Staff.impact('analyst').sp; // rehearsed routines
        if (sd.warm === 'setpieces') xg *= 1.06;
        if (sd.user && sd.club.sim !== 'nation') xg *= FM.Training.spK(); // set-piece training
      }
      if (type !== 'penalty') xg = U.clamp(xg * me.q * Math.sqrt(me.att / op.def), 0.01, 0.8);
      // Roles decide who gets on the end of things: shoot (who shoots), head (who wins crosses and corners), assist
      const roleOf = (o) => this.roleAt(sd, o.i);
      // shooter
      const shooterW = (o) => {
        const t = sd.slots[o.i].t,
          A = o.p.attrs,
          r = roleOf(o);
        if (type === 'longshot')
          return (
            ({ CM: 1, AM: 1.2, DM: 0.6, W: 0.8, ST: 0.6 }[t] || 0.15) *
            (A.finishing + A.technique) *
            (1 + Math.max(-0.5, r.shoot || 0) * 0.5)
          );
        if (type === 'cross')
          return (
            (AW[t] + (t === 'CB' ? 0.2 : 0)) * (A.strength + A.finishing) * (1 + (r.head || 0) + (r.shoot || 0) * 0.3)
          );
        if (type === 'penalty') return (AW[t] + 0.05) * (A.finishing + A.composure) ** 2;
        if (sp === 'cor')
          return (
            ({ CB: 1, ST: 1, DM: 0.5, AM: 0.35, CM: 0.35, W: 0.25, FB: 0.3, WB: 0.3 }[t] || 0.2) *
            (A.strength + A.positioning * 0.6 + A.finishing * 0.6) ** 1.5 *
            (1 + (r.head || 0) * 0.5)
          );
        return (AW[t] + 0.02) * (A.finishing + A.composure + A.pace * 0.5) * Math.max(0.3, 1 + (r.shoot || 0));
      };
      const penTaker = type === 'penalty' ? Md.taker(sd, 'pen', on) : null;
      const shooter =
        penTaker ||
        (sp === 'fk' && spTaker) ||
        U.wpick(sp === 'cor' && spTaker && on.length > 1 ? on.filter((o) => o !== spTaker) : on, shooterW);
      let assister = null;
      if (sp === 'cor' && spTaker && spTaker !== shooter) assister = spTaker;
      else if (!['penalty', 'longshot'].includes(type) && sp !== 'fk' && on.length > 1) {
        const pool = on.filter((o) => o !== shooter);
        assister = U.wpick(pool, (o) => {
          const t = sd.slots[o.i].t,
            A = o.p.attrs,
            r = roleOf(o);
          if (type === 'cross')
            return (
              ({ W: 1.2, FB: 0.9, WB: 1.1, AM: 0.4 }[t] || 0.1) *
              A.passing *
              (1 + (r.assist || 0) * 0.5 + (r.cross || 0) * 3)
            );
          return (MW[t] + AW[t] * 0.5) * (A.passing + A.vision) * (1 + (r.assist || 0));
        });
      }
      const p = shooter.p,
        A = p.attrs;
      const finF = 0.75 + ((A.finishing + A.composure) / 40) * 0.5;
      const gkF = 1.2 - (op.gk / 20) * 0.4;
      let pGoal = U.clamp(
        xg * (sp === 'fk' ? 0.68 + (Md.spScore(p, 'fk') / 20) * 0.5 : finF) * gkF * this.factor(sd, p),
        0.01,
        0.9,
      );
      if (type === 'longshot' && W.hasTrait(p, 'Flair')) pGoal += 0.03;
      let outcome,
        howler = false;
      if (Math.random() < pGoal) outcome = 'goal';
      else if (Math.random() < CAL.savedBase + xg * CAL.savedXg) outcome = 'saved';
      else outcome = Math.random() < 0.45 ? 'blocked' : 'wide';
      // A rare keeper's error: a shot he should have saved slips through (worse hands and nerves, wet ball)
      const gk = this.onPitch(od).find(({ i }) => od.slots[i].t === 'GK');
      if (outcome === 'saved' && gk && type !== 'penalty') {
        const G = gk.p.attrs,
          q = U.clamp(1 + (11 - (G.handling + G.composure) / 2) * 0.15, 0.3, 2.5);
        if (Math.random() < CAL.gkErr * q * (this.weather[0] === 'Rain' ? 1.8 : 1)) {
          outcome = 'goal';
          howler = true;
        }
      }

      // the keeper's own numbers: what he faced, saved and let in
      const gps = gk && od.ps[gk.p.id];
      if (gps) {
        gps.xga += xg;
        if (outcome === 'saved') gps.sv++;
        if (outcome === 'goal') gps.ga++;
      }
      sd.shots++;
      sd.xg += xg;
      if (outcome === 'goal' || outcome === 'saved') sd.sot++;
      const ty = ((sd.types = sd.types || {})[type] = sd.types[type] || [0, 0, 0]); // shots, goals, xG by chance type
      ty[0]++;
      ty[2] += xg;
      if (outcome === 'goal') ty[1]++;
      if (sd.ps[p.id]) {
        sd.ps[p.id].sh++;
        if (outcome === 'goal' || outcome === 'saved') sd.ps[p.id].sot++;
      }
      if (assister && sd.ps[assister.p.id]) sd.ps[assister.p.id].kp++;
      if (this.live || this.o.track) {
        const R = {
          through: [0.86, 0.93, 0.08],
          cutback: [0.87, 0.92, 0.05],
          counter: [0.84, 0.92, 0.09],
          cross: [0.9, 0.95, 0.06],
          setpiece: [0.89, 0.94, 0.07],
          longshot: [0.7, 0.8, 0.14],
          penalty: [0.895, 0.895, 0],
        }[type];
        this.shotLog.push({
          side,
          pid: p.id,
          type,
          xg,
          outcome,
          m: tl.m,
          mi: this.momentum.length,
          x: U.rand(R[0], R[1]),
          y: U.clamp(0.5 + U.gauss(0, R[2]), 0.22, 0.78),
        });
      }
      const ev = {
        k: 'chance',
        side,
        type,
        xg,
        outcome,
        pid: p.id,
        ast: assister && assister.p.id,
        min: tl.label,
        m: tl.m,
        mi: this.momentum.length,
        big: xg >= 0.12 || outcome === 'goal' || (sp === 'fk' && outcome === 'saved'),
      };
      if (sp) ev.sp = sp;
      if (howler) {
        ev.err = gk.p.id;
        od.rating[gk.p.id] -= 1.1;
      }
      if (outcome === 'goal') {
        sd.goals++;
        sd.rating[p.id] += type === 'penalty' ? 0.7 : 1.0;
        if (assister) sd.rating[assister.p.id] += 0.6;
        this.onPitch(od).forEach(({ p: q, i }) => {
          if (['GK', 'CB', 'FB', 'WB'].includes(od.slots[i].t)) od.rating[q.id] -= 0.22;
        });
        ev.k = 'goal';
        ev.score = [this.sides[0].goals, this.sides[1].goals];
      } else if (outcome === 'saved' && gk) {
        od.rating[gk.p.id] += 0.15 + xg * 0.8;
        sd.rating[p.id] += 0.08;
      } else sd.rating[p.id] -= xg * 0.4;
      if (assister && outcome !== 'goal') sd.rating[assister.p.id] += 0.08;
      ev.text = howler
        ? `Howler! ${W.short(gk.p)} lets ${W.short(p)}'s shot slip through his hands.`
        : FM.Commentary.chance(ev, p, assister && assister.p, gk && gk.p, this);
      out.events.push(ev);

      if (this.live || this.o.track) {
        // build-up to the shot on the visual pitch
        if (assister && this.ball.slot !== assister.i)
          out.script.push({ k: 'pass', side, from: this.ball.slot, to: assister.i });
        if (assister)
          out.script.push({
            k: type === 'cross' ? 'cross' : 'pass',
            side,
            from: assister.i,
            to: shooter.i,
            fast: true,
            ctype: type, // the match view sends the runner early for a through ball or a counter
          });
        else if (this.ball.slot !== shooter.i && type !== 'penalty' && ev.sp !== 'fk')
          out.script.push({ k: 'pass', side, from: this.ball.slot, to: shooter.i });
        // a penalty or a direct free kick is taken from a dead ball (the view puts it on the spot), not played in
        out.script.push({
          k: 'shot',
          side,
          from: shooter.i,
          outcome,
          xg,
          type,
          gk: gk && gk.i,
          big: ev.big,
          dead: type === 'penalty' ? 'pen' : ev.sp === 'fk' ? 'fk' : null,
        });
        const sp = FM.Pos(sd, shooter.i, true, { x: 0.8, y: 0.5 });
        this.touch(sd, { x: Math.max(sp.x, 0.78), y: sp.y });
        if (outcome === 'goal') this.ball = { side: 1 - side, slot: this.kickoffSlot(od), x: 0.5, y: 0.5 };
        else if (outcome === 'saved' && gk) this.ball = { side: 1 - side, slot: gk.i, x: 0.03, y: 0.5 };
        else this.ball = { side: 1 - side, slot: gk ? gk.i : 0, x: 0.05, y: 0.5 };
        if (outcome === 'goal') out.script.push({ k: 'kickoff', side: 1 - side, to: this.ball.slot });
      }
      return ev;
    }
    // Change to another tactic mid-match (your Plan B): style, pressing, width and roles at once, and the shape
    // too, the players on the pitch re-arranged into the new formation's slots by who fits each best
    switchTactic(sd, t) {
      const nt = JSON.parse(JSON.stringify(t));
      nt.lineup = null;
      if (nt.formation !== sd.tactic.formation) {
        const slots = D.FORMATIONS[nt.formation],
          players = sd.xi.filter(Boolean),
          xi = new Array(slots.length).fill(null);
        // Best natural fits first (a striker to the striker's slot), ability breaking ties; the keeper stays in
        // goal and a sent-off player fills a slot last
        const pairs = [];
        slots.forEach((s, i) =>
          players.forEach((p) => {
            if ((s.t === 'GK') !== (p.pos === 'GK')) return;
            const fit = sd.sentOff[p.id] ? -1 : W.fitAt(p, s.t, s, nt.roles[i]);
            pairs.push({ i, p, fit, eff: W.effAt(p, s.t, s, nt.roles[i]) });
          }),
        );
        pairs.sort((a, b) => b.fit - a.fit || b.eff - a.eff);
        const used = new Set();
        for (const x of pairs)
          if (!xi[x.i] && !used.has(x.p.id)) {
            xi[x.i] = x.p;
            used.add(x.p.id);
          }
        sd.xi = xi;
        sd.slots = slots;
      }
      sd.tactic = nt;
      sd.switched = true;
      sd.fitC = sd.roleC = sd.rfC = null;
    }
    kickoffSlot(sd) {
      const st =
        this.onPitch(sd).find(({ i }) => sd.slots[i].t === 'ST') ||
        this.onPitch(sd).find(({ i }) => sd.slots[i].t !== 'GK');
      return st ? st.i : 0;
    }

    discipline(tl, out) {
      this.sides.forEach((sd) => {
        const press = sd.tactic.press === 'High Press' ? 1.4 : sd.tactic.press === 'Low Block' ? 0.8 : 1;
        if (Math.random() < CAL.yellowRate * press * (this.derby ? 1.4 : this.heated ? 1.2 : 1) * (sd.hot || 1)) {
          const on = this.onPitch(sd).filter(({ i }) => sd.slots[i].t !== 'GK');
          const o = U.wpick(
            on,
            ({ p, i }) =>
              (22 - p.hid.temp) *
              (DW[sd.slots[i].t] + 0.2) *
              (W.hasTrait(p, 'Temperamental') ? 2 : 1) *
              (sd.yc[p.id] ? CAL.bookedCaution : 1),
          );
          if (!o) return;
          const p = o.p;
          if (sd.yc[p.id]) {
            sd.sentOff[p.id] = true;
            sd.rating[p.id] -= 1.2;
            sd.off[p.id] = tl.m;
            out.events.push({
              k: 'red',
              side: sd.idx,
              pid: p.id,
              min: tl.label,
              text: `🟥 Second yellow! ${W.short(p)} is sent off.`,
              big: true,
            });
          } else {
            sd.yc[p.id] = 1;
            sd.rating[p.id] -= 0.3;
            // Why he was booked, with a little context: time-wasting only when protecting a lead late on
            const op = this.sides[1 - sd.idx],
              lead = sd.goals - op.goals;
            const why = U.pick([
              'for a late challenge',
              'for a cynical foul to stop a counter',
              'for pulling back his man',
              'for a reckless tackle',
              ...(tl.m >= 70 && lead > 0 ? ['for time-wasting', 'for taking too long over a throw-in'] : []),
              ...(lead < 0 ? ['for dissent'] : []),
            ]);
            out.events.push({
              k: 'yellow',
              side: sd.idx,
              pid: p.id,
              min: tl.label,
              text: `🟨 ${W.short(p)} booked ${why}.`,
            });
          }
        } else if (Math.random() < CAL.redRate) {
          const on = this.onPitch(sd).filter(({ i }) => sd.slots[i].t !== 'GK');
          const o = U.pick(on);
          if (!o) return;
          sd.sentOff[o.p.id] = true;
          sd.rating[o.p.id] -= 1.5;
          sd.off[o.p.id] = tl.m;
          out.events.push({
            k: 'red',
            side: sd.idx,
            pid: o.p.id,
            min: tl.label,
            text: `🟥 Straight red! ${W.short(o.p)} sees red for a reckless lunge.`,
            big: true,
          });
        }
      });
    }

    fatigue(tl, out) {
      this.sides.forEach((sd) => {
        const pf =
          { 'High Press': 1.35, 'Mid Block': 1, 'Low Block': 0.82 }[sd.tactic.press] *
          (this.weather[0] === 'Hot' ? CAL.heat : 1) * // the heat drains legs
          (sd.warm === 'intense' ? 1.07 : sd.warm === 'light' ? 0.94 : 1); // and so does an intense warm-up
        const rfs = (sd.rfC = sd.rfC || []);
        for (const { p, i } of this.onPitch(sd)) {
          const t = sd.slots[i].t;
          // how hard the slot and its role run: wide and central midfielders more, pressing roles more still
          const rf =
            rfs[i] ??
            (rfs[i] =
              (t === 'GK' ? 0.25 : t === 'WB' || t === 'FB' || t === 'CM' ? 1.1 : 1) *
              (1 + (this.roleAt(sd, i).press || 0) * 2));
          sd.st[p.id] = Math.max(0, sd.st[p.id] - 0.42 * (1.35 - (p.attrs.stamina / 20) * 0.7) * pf * rf);
          if (!sd.injured[p.id] && Math.random() < FM.Injury.matchChance(p, sd.st[p.id])) {
            sd.injured[p.id] = tl.m;
            out.events.push({
              k: 'injury',
              side: sd.idx,
              pid: p.id,
              min: tl.label,
              text: `🚑 ${W.short(p)} ${U.pick(['goes down holding his hamstring.', 'pulls up clutching his thigh.', 'is down after a heavy challenge.', 'lands awkwardly and stays down.', "signals to the bench — he can't go on."])}`,
              big: true,
            });
            if (!sd.user) this.makeSub(sd, i, null, tl, out);
          }
        }
      });
    }

    aiSubs(sd, tl) {
      if (!sd.subsLeft || !sd.subWindows) return;
      if (![60, 68, 76, 84].includes(tl.m)) return;
      const tired = this.onPitch(sd)
        .filter(({ p, i }) => sd.slots[i].t !== 'GK' && sd.st[p.id] < 66)
        .sort((a, b) => sd.st[a.p.id] - sd.st[b.p.id])
        .slice(0, 2);
      if (!tired.length) return;
      sd.subWindows--;
      tired.forEach(({ i }) => this.makeSub(sd, i, null, tl));
    }

    // Replace slot i with bench player (best fit if pid null). Returns the event.
    // batch: the minute's event list, so a substitution is logged after whatever caused it that minute
    makeSub(sd, i, inPid, tl, batch) {
      if (!sd.subsLeft) return null;
      const out = sd.xi[i];
      const t = sd.slots[i].t;
      const cands = sd.bench.filter((p) => !Object.hasOwn(sd.on, p.id) && (t === 'GK') === (p.pos === 'GK'));
      const pIn = inPid ? sd.bench.find((p) => p.id === inPid) : cands.sort((a, b) => W.effAt(b, t) - W.effAt(a, t))[0];
      if (!pIn || Object.hasOwn(sd.on, pIn.id)) return null;
      const m = tl ? tl.m : this.minute;
      sd.xi[i] = pIn;
      sd.fitC = null;
      sd.subsLeft--;
      sd.st[pIn.id] = pIn.fitness;
      sd.rating[pIn.id] = 6.3;
      sd.on[pIn.id] = m;
      sd.ps[pIn.id] = { pass: 0, kp: 0, sh: 0, sot: 0, tk: 0, ic: 0, tch: 0, sv: 0, ga: 0, xga: 0 };
      if (out) sd.off[out.id] = m;
      const ev = {
        k: 'sub',
        side: sd.idx,
        pid: pIn.id,
        out: out && out.id,
        min: tl ? tl.label : this.clock,
        text: `🔁 ${W.short(pIn)} replaces ${out ? W.short(out) : '—'}.`,
      };
      sd.subsMade.push(ev);
      (batch ? batch.events : this.events).push(ev);
      return ev;
    }

    shootout(out) {
      const kick = (sd) => {
        const on = this.onPitch(sd),
          first = FM.Matchday.taker(sd, 'pen', on);
        const takers = on.sort(
          (a, b) => b.p.attrs.finishing + b.p.attrs.composure - (a.p.attrs.finishing + a.p.attrs.composure),
        );
        return first ? [first, ...takers.filter((o) => o !== first)] : takers;
      };
      const tk = [kick(this.sides[0]), kick(this.sides[1])];
      const sc = [0, 0],
        log = [[], []];
      let r = 0;
      while (true) {
        for (let s = 0; s < 2; s++) {
          const t = tk[s][r % tk[s].length].p;
          const ok = Math.random() < 0.62 + (t.attrs.composure + t.attrs.finishing) / 200;
          if (ok) sc[s]++;
          log[s].push(ok);
        }
        r++;
        if (r >= 5 && sc[0] !== sc[1]) break;
        if (r < 5) {
          const left = 5 - r;
          if (sc[0] > sc[1] + left || sc[1] > sc[0] + left) break;
        }
        if (r > 15) {
          sc[Math.random() < 0.5 ? 0 : 1]++;
          break;
        }
      }
      this.pens = sc;
      this.penLog = log;
      out.events.push({ k: 'pens', text: `Penalties: ${sc[0]}–${sc[1]}`, min: "120'", big: true });
    }

    // Is the tie still level? Single matches compare goals; second legs compare the aggregate (then away goals if in use)
    tied() {
      const [H, A] = this.sides;
      if (!this.agg) return H.goals === A.goals;
      const aggH = this.agg[0] + H.goals,
        aggA = this.agg[1] + A.goals;
      if (aggH !== aggA) return false;
      return !this.awayGoals || this.agg[0] === A.goals; // leg-2 home side's away goals came in leg 1
    }
    // Which side won the tie (knockouts only): 0 home, 1 away
    tieWinner() {
      const [H, A] = this.sides;
      if (this.pens) return this.pens[0] > this.pens[1] ? 0 : 1;
      if (!this.agg) return H.goals === A.goals ? null : H.goals > A.goals ? 0 : 1;
      const aggH = this.agg[0] + H.goals,
        aggA = this.agg[1] + A.goals;
      if (aggH !== aggA) return aggH > aggA ? 0 : 1;
      if (this.awayGoals && this.agg[0] !== A.goals) return this.agg[0] > A.goals ? 0 : 1;
      return null;
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      const [H, A] = this.sides;
      const endM = this.timeline.some((t) => t.half === 3) ? 120 : 90;
      const hw = H.goals > A.goals || (this.pens && this.pens[0] > this.pens[1]);
      const aw = A.goals > H.goals || (this.pens && this.pens[1] > this.pens[0]);
      this.sides.forEach((sd, k) => {
        const won = k ? aw : hw,
          lost = k ? hw : aw;
        const conceded = this.sides[1 - k].goals;
        for (const pid in sd.on) {
          const p = FM.S.players[pid];
          const mins = (sd.off[pid] ?? endM) - sd.on[pid];
          sd.mins[pid] = Math.max(1, mins);
          let r = sd.rating[pid] + (won ? 0.3 : lost ? -0.2 : 0);
          const slotI = sd.xi.findIndex((q) => q && q.id === pid);
          const t = slotI >= 0 ? sd.slots[slotI].t : p.pos;
          if (conceded === 0 && ['GK', 'CB', 'FB', 'WB'].includes(t) && mins > 60) r += 0.5;
          r += U.gauss(0, 0.35 * (1.3 - p.hid.cons / 20) * (W.hasTrait(p, 'Consistent') ? 0.5 : 1));
          sd.rating[pid] = Math.round(U.clamp(r, 3, 10) * 10) / 10;
        }
      });
      let motm = null,
        best = 0;
      this.sides.forEach((sd) => {
        for (const pid in sd.rating)
          if (sd.mins[pid] >= 30 && sd.rating[pid] > best) {
            best = sd.rating[pid];
            motm = pid;
          }
      });
      this.motm = motm;
    }

    // Full-match passing as the TV graphics would show it. The engine only simulates the passes that matter
    // (passCount, ~150 a side); a real side makes 350–650, so the total is read from possession and build-up style,
    // with small match-to-match variation from the simulated count, and accuracy from possession, style and passing.
    passStats(k) {
      const sd = this.sides[k],
        poss = this.result().poss[k],
        T = sd.tactic;
      const style = { Possession: 1.15, Short: 1.05, Direct: 0.85, Counter: 0.8, 'Wing Play': 0.95 }[T.buildup] || 1;
      // ~500 at 50% possession, ~700 at 72%, ~300 at 28%; style nudges it, the simulated count adds ±5%
      const total = Math.round((150 + 7 * poss) * Math.sqrt(style) * (0.95 + (sd.passCount % 11) / 100));
      const xi = sd.xi.filter(Boolean),
        passing = xi.length ? xi.reduce((s, p) => s + p.attrs.passing, 0) / xi.length : 12;
      const wet = { Rain: -3, Snow: -5 }[this.weather[0]] || 0; // a wet or heavy pitch costs accuracy
      const acc = Math.round(U.clamp(78 + (poss - 50) * 0.35 + (style - 1) * 20 + (passing - 12) * 1.4 + wet, 62, 92));
      return { total, acc };
    }
    result() {
      const [H, A] = this.sides;
      const tot = (H.possAcc || 1) + (A.possAcc || 1);
      return {
        hg: H.goals,
        ag: A.goals,
        pens: this.pens,
        xg: [H.xg, A.xg].map((v) => Math.round(v * 100) / 100),
        poss: [Math.round((100 * (H.possAcc || 1)) / tot), Math.round((100 * (A.possAcc || 1)) / tot)],
        shots: [H.shots, A.shots],
        sot: [H.sot, A.sot],
        motm: this.motm,
        weather: this.weather[0],
        goals: this.events
          .filter((e) => e.k === 'goal')
          .map((e) => ({ side: e.side, pid: e.pid, ast: e.ast, min: e.min, pen: e.type === 'penalty' })),
        cards: this.events
          .filter((e) => e.k === 'yellow' || e.k === 'red')
          .map((e) => ({ side: e.side, pid: e.pid, k: e.k })),
        ...(this.knockout ? { win: this.tieWinner() } : {}),
        ...(this.agg ? { agg: [this.agg[0] + H.goals, this.agg[1] + A.goals] } : {}),
      };
    }
  }
  FM.Match = Match;
  // How each build-up moves the ball in the matches drawn on the pitch: passes per spell (n), how sharply distance
  // cuts a pass's chance (reach: high = short passes), how much forward passes are favoured (prog) and backward
  // ones allowed (back), the keeper's part in it (gk), a lean to the flanks (wide) and the tempo (fast / slow)
  Match.PASSING = {
    Short: { n: [3, 6], reach: 6, prog: 1.2, back: 0.35, gk: 1 },
    Possession: { n: [4, 8], reach: 6.5, prog: 0.7, back: 0.55, gk: 0.7, slow: true },
    Direct: { n: [1, 3], reach: 1.3, prog: 3.5, back: 0.05, gk: 0, fast: true },
    Counter: { n: [2, 4], reach: 3, prog: 2.5, back: 0.15, gk: 0 },
    'Wing Play': { n: [2, 5], reach: 4, prog: 1.5, back: 0.2, gk: 0.1, wide: 1 },
  };
  // Build-up styles: [attack, midfield, defence, chance rate, chance quality]
  Match.BUILDUP = {
    Short: [1, 1.04, 1, 1, 1.05],
    Direct: [1.02, 0.95, 1, 1.08, 0.92],
    Counter: [1, 0.93, 1.04, 0.95, 1.05],
    Possession: [0.99, 1.1, 1.01, 0.9, 1.06],
    'Wing Play': [1.01, 0.97, 1, 1.04, 0.96],
  };
  // How much the home side's advantage counts (1 = the usual): a happy crowd and a big stadium make it bigger, a
  // derby's atmosphere and a long trip for the visitors (another country) too; a fed-up crowd, a small ground less
  Match.homeFactor = function (h, a, derby) {
    if (!h || h.sim === 'nation') return 1;
    const mood = h.fanMood ?? 60,
      cap = (h.stadium && h.stadium.cap) || 25000;
    const f =
      1 +
      (0.3 * (mood - 60)) / 40 +
      U.clamp(0.12 * Math.log2(cap / 25000), -0.2, 0.2) +
      (derby ? 0.15 : 0) +
      (a && a.nat !== h.nat ? 0.15 : 0);
    return U.clamp(f, 0.5, 1.6);
  };
  // Aggregate / away-goal options for a fixture that is the second leg of a tie
  // Options a fixture carries into its match: the weather forecast (Match.forecast) and, for a second leg, the
  // first leg's score
  Match.tieOpts = function (fx) {
    const o = fx.wx ? { weather: D.WEATHER.find((w) => w[0] === fx.wx) } : {};
    if (!fx.first) return o;
    const f1 = FM.Cups.findFixture(fx.first);
    if (!f1 || !f1.res) return o;
    // leg 1 was played with the sides reversed
    return { ...o, agg: [f1.res.ag, f1.res.hg], awayGoals: !!FM.S.rules.awayGoals };
  };
  // The forecast for a fixture, fixed once you've seen it (your pre-match screen) so the match is played in it
  Match.forecast = function (fx) {
    if (!fx.wx) fx.wx = W.weatherFor(FM.clubOf(fx.h))[0];
    return D.WEATHER.find((w) => w[0] === fx.wx);
  };
  // What the weather does, in a few words (pre-match screen)
  Match.WEATHER_NOTE = {
    Rain: 'short passing suffers and keepers fumble more',
    Snow: 'a heavy pitch: fewer chances',
    Hot: 'legs tire faster, pressing costs more',
  };

  // ---------------- Commentary ----------------
  FM.Commentary = {
    chance(ev, p, a, gk, m) {
      const n = W.short(p),
        an = a && W.short(a),
        gn = gk ? W.short(gk) : 'the keeper';
      const T = {
        through: {
          goal: [
            `${an} threads it through — ${n} slots it past ${gn}!`,
            `${n} races onto ${an}'s pass and finishes coolly!`,
          ],
          saved: [`${n} is clean through… ${gn} spreads himself and saves!`],
          wide: [`${n} through on goal but drags it wide!`],
          blocked: [`${n} gets in behind but the shot is blocked!`],
        },
        cross: {
          goal: [`${an} whips it in — ${n} rises and heads home!`, `Glorious delivery from ${an}, ${n} nods it in!`],
          saved: [`${n} meets ${an}'s cross, ${gn} tips it over!`],
          wide: [`${n} glances ${an}'s cross just wide.`],
          blocked: [`${an}'s cross is cleared under pressure.`],
        },
        cutback: {
          goal: [`${an} cuts it back and ${n} sweeps it into the corner!`],
          saved: [`${an} pulls it back, ${n} forces a sharp save!`],
          wide: [`${n} scuffs the cutback wide.`],
          blocked: [`${n}'s effort from the cutback is blocked on the line!`],
        },
        longshot: {
          goal: [
            `WHAT A HIT! ${n} lets fly from 25 yards — top corner!`,
            `${n} tries his luck from distance… and it flies in!`,
          ],
          saved: [`${n} lets fly from range, ${gn} holds on.`],
          wide: [`${n} shoots from distance — well over.`],
          blocked: [`${n}'s long-range effort deflects off a defender.`],
        },
        counter: {
          goal: [`Lightning counter! ${an} to ${n}, and it's in!`, `They break at speed — ${n} finishes the move!`],
          saved: [`Rapid break, ${n} shoots — ${gn} saves!`],
          wide: [`${n} fluffs the counter-attack chance.`],
          blocked: [`The counter is snuffed out by a last-ditch block.`],
        },
        setpiece: {
          goal: [`From the set-piece — ${n} bundles it home!`, `${an}'s free-kick is flicked in by ${n}!`],
          saved: [`${n} gets a header on the corner, ${gn} claws it away.`],
          wide: [`Corner comes to ${n}, header goes wide.`],
          blocked: [`Set-piece cleared at the near post.`],
        },
        // a penalty says it was one, and who won it: on the pitch it is taken from the spot
        penalty: {
          goal: [
            `Penalty to ${m.sides[ev.side].club.short}! ${n} steps up and sends ${gn} the wrong way.`,
            `${n} is brought down in the box — and converts the penalty himself!`,
          ],
          saved: [`Penalty to ${m.sides[ev.side].club.short}… saved! ${gn} guesses right and denies ${n}!`],
          wide: [`Penalty to ${m.sides[ev.side].club.short}, but ${n} blazes it over!`],
          blocked: [`Penalty to ${m.sides[ev.side].club.short}… ${n} hits the post!`],
        },
      };
      if (ev.sp === 'fk') {
        const F = {
          goal: [
            `${n} steps up… and curls the free kick into the top corner!`,
            `Free kick — ${n} bends it over the wall and in!`,
          ],
          saved: [`${n}'s free kick is heading in — ${gn} tips it round the post!`],
          wide: [`${n} goes for goal from the free kick — just over the bar.`],
          blocked: [`${n}'s free kick smacks into the wall.`],
        };
        return U.pick(F[ev.outcome]);
      }
      if (ev.sp === 'cor' && a) {
        const K = {
          goal: [
            `${an}'s corner is met by ${n} — it's in!`,
            `${an} swings in the corner and ${n} powers the header home!`,
          ],
          saved: [`${an}'s corner, ${n} gets his head to it — ${gn} saves!`],
          wide: [`${an}'s corner finds ${n}, header just wide.`],
          blocked: [`${an}'s corner is cleared at the near post.`],
        };
        return U.pick(K[ev.outcome]);
      }
      return U.pick(T[ev.type][ev.outcome]);
    },
  };

  // ---------------- Tactical prompts (live user match) ----------------
  FM.Prompts = {
    check(m) {
      const sd = m.sides.find((s) => s.user);
      if (!sd || m.finished) return null;
      const op = m.sides[1 - sd.idx];
      const used = (m.promptsUsed = m.promptsUsed || {});
      const min = m.minute,
        diff = sd.goals - op.goals;
      const asst = FM.Staff.get('assistant'),
        anl = FM.Staff.get('analyst');
      const sign = sd.idx === 0 ? 1 : -1;
      const last = m.momentum.slice(-6);
      const quote = (who, text) => ({ who: `${who.fn} ${who.ln}`, role: who.role, text });
      const mk = (id, o) => {
        used[id] = min;
        return { id, ...o };
      };
      const since = (id, n) => used[id] === undefined || min - used[id] >= n;

      const injured = m.onPitch(sd).find(({ p }) => sd.injured[p.id] && !used['inj' + p.id]);
      if (injured) {
        used['inj' + injured.p.id] = min;
        return mk('injury', {
          icon: '🚑',
          title: `${W.short(injured.p)} is injured`,
          body: "The physio signals he can't continue at full speed.",
          quote: quote(FM.Staff.get('physio'), 'Take him off. Playing on risks a longer layoff.'),
          options: [
            { label: 'Substitute him', sub: injured.i, apply: () => 'Choose a replacement.' },
            {
              label: 'Play on (risky)',
              apply: () => {
                injured.p._riskPlayOn = true;
                return 'He limps on…';
              },
            },
          ],
        });
      }
      if (m.events.some((e) => e.k === 'red' && e.side === sd.idx) && !used.red) {
        return mk('red', {
          icon: '🟥',
          title: 'Down to ten men',
          body: 'How do we respond?',
          quote: quote(
            asst,
            asst.personality === 'Outspoken'
              ? 'We keep going for it. Sitting back invites pressure.'
              : "Let's get compact and see this out.",
          ),
          options: [
            {
              label: 'Stay compact',
              desc: 'Low block, defensive boost',
              apply: () => {
                sd.tactic.press = 'Low Block';
                sd.mods.def += 0.07;
                sd.mods.att -= 0.04;
                return 'The team drops deep and narrows.';
              },
            },
            {
              label: 'Stay aggressive',
              desc: 'Keep the press on',
              apply: () => {
                sd.mods.att += 0.03;
                return 'We keep pressing with ten.';
              },
            },
          ],
        });
      }
      if (min >= 25 && min <= 38 && !used.analyst) {
        const opDef = m
          .onPitch(op)
          .filter(({ i }) => ['FB', 'WB', 'CB'].includes(op.slots[i].t))
          .sort((a, b) => a.p.attrs.pace - b.p.attrs.pace)[0];
        const ourFast = m
          .onPitch(sd)
          .filter(({ i }) => ['W', 'ST', 'AM', 'WB'].includes(sd.slots[i].t))
          .sort((a, b) => b.p.attrs.pace - a.p.attrs.pace)[0];
        if (opDef && ourFast && ourFast.p.attrs.pace - opDef.p.attrs.pace >= 3) {
          return mk('analyst', {
            icon: '📊',
            title: 'Analyst insight',
            body: `Their ${D.POS_NAME[op.slots[opDef.i].t].toLowerCase()} ${W.short(opDef.p)} is struggling for pace. ${W.short(ourFast.p)} is winning every race.`,
            quote: quote(anl, `Overload that side — our data says it's their weak link.`),
            options: [
              {
                label: 'Target the weak side',
                desc: 'Attack +6%',
                apply: () => {
                  sd.mods.att += 0.06;
                  return `${W.short(ourFast.p)} is told to stay high and isolate him.`;
                },
              },
              { label: 'Stick to the plan', apply: () => 'No changes.' },
            ],
          });
        }
      }
      if (min >= 55 && diff < 0 && since('chase', 18)) {
        return mk('chase', {
          icon: '⏱️',
          title: `${Math.abs(diff) > 1 ? 'Two down' : 'Behind'} with ${90 - min} to play`,
          body: 'The crowd is getting restless.',
          quote: quote(
            asst,
            asst.personality === 'Cautious'
              ? "Don't panic. One goal changes everything."
              : 'We need to throw the kitchen sink at them.',
          ),
          options: [
            {
              label: 'Go for it',
              desc: 'Direct + high press. Attack ↑ Defence ↓',
              apply: () => {
                sd.tactic.buildup = 'Direct';
                sd.tactic.press = 'High Press';
                sd.mods.att += 0.08;
                sd.mods.def -= 0.06;
                return 'Everybody forward!';
              },
            },
            {
              label: 'Stay patient',
              desc: 'Keep the ball, work openings',
              apply: () => {
                sd.mods.mid += 0.04;
                return 'Calm heads. Keep moving it.';
              },
            },
            { label: 'Make a change', sub: -1, apply: () => 'Pick your substitution.' },
          ],
        });
      }
      if (min >= 72 && diff > 0 && !used.protect) {
        return mk('protect', {
          icon: '🛡️',
          title: 'Protect the lead?',
          body: `We lead ${sd.goals}–${op.goals}. ${90 - min} minutes left.`,
          quote: quote(asst, "Your call, boss. They'll come at us now."),
          options: [
            {
              label: 'Low block',
              desc: 'Defence ↑ Attack ↓',
              apply: () => {
                sd.tactic.press = 'Low Block';
                sd.mods.def += 0.08;
                sd.mods.att -= 0.08;
                return 'Two banks of four. Nobody gets through.';
              },
            },
            {
              label: 'Keep the ball',
              desc: 'Possession, kill the tempo',
              apply: () => {
                sd.tactic.buildup = 'Possession';
                sd.mods.mid += 0.05;
                return 'Slow it down. Make them chase.';
              },
            },
            {
              label: 'Go for the kill',
              desc: 'Attack ↑',
              apply: () => {
                sd.mods.att += 0.06;
                sd.mods.def -= 0.03;
                return 'Finish them off!';
              },
            },
          ],
        });
      }
      if (min >= 20 && last.length === 6 && last.every((v) => v * sign < -0.35) && since('pinned', 20)) {
        return mk('pinned', {
          icon: '🌊',
          title: "They're pinning us back",
          body: `${op.club.name} are dominating the ball and territory.`,
          quote: quote(asst, "We can't get out. Change something or ride it out?"),
          options: [
            {
              label: 'Switch to counter',
              desc: 'Sit deeper, break fast',
              apply: () => {
                sd.tactic.buildup = 'Counter';
                sd.mods.def += 0.04;
                return 'Absorb and spring forward.';
              },
            },
            {
              label: 'Press higher',
              desc: 'Win it back early — tiring',
              apply: () => {
                sd.tactic.press = 'High Press';
                sd.mods.mid += 0.04;
                return 'Get in their faces!';
              },
            },
            {
              label: 'Hold our shape',
              apply: () => {
                sd.mods.def += 0.02;
                return 'Stay disciplined.';
              },
            },
          ],
        });
      }
      if (min >= 58 && since('tired', 14)) {
        const t = m
          .onPitch(sd)
          .filter(({ p, i }) => sd.slots[i].t !== 'GK' && sd.st[p.id] < 58)
          .sort((a, b) => sd.st[a.p.id] - sd.st[b.p.id])[0];
        if (t && sd.subsLeft) {
          return mk('tired', {
            icon: '🔋',
            title: `${W.short(t.p)} is running on empty`,
            body: `Energy at ${Math.round(sd.st[t.p.id])}%. He's losing his duels.`,
            quote: quote(asst, 'Fresh legs would help.'),
            options: [
              { label: 'Bring him off', sub: t.i, apply: () => 'Choose a replacement.' },
              { label: 'Leave him on', apply: () => 'He stays on.' },
            ],
          });
        }
      }
      return null;
    },
    halftime(m) {
      const sd = m.sides.find((s) => s.user),
        op = m.sides[1 - sd.idx];
      const diff = sd.goals - op.goals;
      const apply = (kind) => () => {
        let good = 0,
          bad = 0;
        const capt = FM.Matchday.armband(sd, m.onPitch(sd)),
          steady = capt && W.hasTrait(capt, 'Leader');
        m.onPitch(sd).forEach(({ p }) => {
          let d = 0;
          const volatile = p.hid.temp <= 6 || W.hasTrait(p, 'Temperamental');
          if (kind === 'calm') d = diff >= 0 ? 3 : -1;
          if (kind === 'demand') d = volatile ? -4 : diff < 0 ? 5 : diff === 0 ? 2 : -3;
          if (kind === 'praise') d = diff > 0 ? 5 : diff === 0 ? 1 : -4;
          if (kind === 'demand' && W.hasTrait(p, 'Leader')) d += 2;
          if (d < 0 && steady) d = Math.ceil(d / 2); // a Leader wearing the armband keeps heads level
          p.morale = U.clamp(p.morale + d, 0, 100);
          d > 0 ? good++ : d < 0 ? bad++ : 0;
          sd.rating[p.id] += d * 0.02;
        });
        sd.mods.att += (good - bad) * 0.004;
        sd.mods.mid += (good - bad) * 0.003;
        if (good > bad * 2) return 'The players look fired up for the second half.';
        if (bad > good)
          return "That didn't land. Some heads have dropped." + (steady ? ` ${W.short(capt)} tries to lift them.` : '');
        return 'A mixed reaction in the dressing room.';
      };
      return {
        id: 'ht',
        icon: '🗣️',
        title: 'Half-time team talk',
        body: `${sd.goals}–${op.goals} at the break. xG ${sd.xg.toFixed(2)} – ${op.xg.toFixed(2)}.`,
        options: [
          { label: 'Keep calm', desc: 'Stay the course', apply: apply('calm') },
          { label: 'Demand more', desc: 'Risky with volatile players', apply: apply('demand') },
          { label: 'Praise them', desc: 'Best when playing well', apply: apply('praise') },
          {
            label: 'Tactical tweaks',
            desc: "Fix what isn't working (your assistant's eye matters)",
            apply: () => {
              const k = 0.01 + (FM.Staff.impact('assistant').fam - 1) * 0.1;
              if (op.xg > sd.xg) {
                sd.mods.def += k + 0.01;
                return 'Shape tightened where they were getting through.';
              }
              sd.mods.att += k + 0.01;
              return 'A couple of tweaks to make the most of our pressure.';
            },
          },
          {
            label: 'Go for it',
            desc: 'More attack, more risk at the back',
            apply: () => {
              sd.mods.att += diff < 0 ? 0.05 : 0.03;
              sd.mods.def -= 0.03;
              return diff < 0 ? 'Everyone forward: we need goals.' : 'We go looking for more.';
            },
          },
          {
            label: 'Shut up shop',
            desc: 'Protect what we have',
            apply: () => {
              sd.mods.def += diff > 0 ? 0.05 : 0.02;
              sd.mods.att -= 0.04;
              return diff > 0 ? 'Back in shape. They will have to break us down.' : 'Cautious: keep it tight first.';
            },
          },
        ],
      };
    },
  };

  // Quick sim (AI vs AI): same engine, no visuals
  FM.quickSim = function (fx, knockout = false) {
    const m = new Match({ h: fx.h, a: fx.a, comp: fx.comp, knockout, neutral: !!fx.neutral, ...FM.Match.tieOpts(fx) });
    while (!m.finished) m.step();
    return m;
  };
})();
