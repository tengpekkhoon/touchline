// Injuries: a catalogue of real injury types with realistic layoffs, the risk model (proneness, age,
// fatigue, match fitness, a recent return from injury), training knocks and illness, re-injuries,
// the return to fitness, and medical decisions for your own players (surgery or rehab, rush him back?).
// Layoffs are in real weeks; a season's calendar packs ~46 weeks into fewer matchdays, so the countdown
// (p.inj.weeks, one per calendar day) is scaled, and the player card shows real weeks (Inj.weeksLeft).
(function () {
  const FM = window.FM,
    U = FM.U,
    W = FM.W;
  const Inj = (FM.Injury = {});
  const S = () => FM.S;

  // [name, body area, weight, min weeks, max weeks, where: 'c' contact (matches only) | 'a' anywhere, surgery option]
  Inj.TYPES = [
    ['Hamstring strain', 'hamstring', 11, 1, 4, 'a'],
    ['Hamstring tear', 'hamstring', 2.5, 5, 10, 'a', 1],
    ['Calf strain', 'calf', 7, 1, 4, 'a'],
    ['Groin strain', 'groin', 6, 1, 4, 'a'],
    ['Thigh strain', 'thigh', 6, 1, 4, 'a'],
    ['Ankle sprain', 'ankle', 10, 1, 4, 'a'],
    ['Ankle ligament damage', 'ankle', 2.5, 5, 10, 'a', 1],
    ['Knee sprain', 'knee', 6, 1, 5, 'a'],
    ['Knee ligament damage', 'knee', 2, 5, 10, 'a'],
    ['Torn meniscus', 'knee', 1.2, 6, 12, 'a', 1],
    ['ACL rupture', 'knee', 0.8, 30, 40, 'a'],
    ['Achilles tendinitis', 'achilles', 1.5, 2, 6, 'a'],
    ['Ruptured Achilles', 'achilles', 0.25, 30, 44, 'a'],
    ['Dead leg', 'knock', 8, 1, 1, 'c'],
    ['Bruised foot', 'foot', 4, 1, 2, 'c'],
    ['Bruised ribs', 'ribs', 2, 1, 3, 'c'],
    ['Concussion', 'head', 1.5, 1, 2, 'c'],
    ['Back spasms', 'back', 3, 1, 2, 'a'],
    ['Broken metatarsal', 'foot', 0.8, 8, 14, 'c'],
    ['Broken leg', 'leg', 0.2, 20, 36, 'c'],
    ['Fractured cheekbone', 'head', 0.3, 3, 6, 'c'],
    ['Dislocated shoulder', 'shoulder', 0.8, 3, 8, 'c', 1],
    ['Sports hernia', 'groin', 1, 4, 8, 'a', 1],
  ].map(([name, part, w, lo, hi, where, surg]) => ({ name, part, w, lo, hi, where, surg: !!surg }));
  const BY = Object.fromEntries(Inj.TYPES.map((t) => [t.name, t]));
  Inj.part = (type) =>
    BY[type] ? BY[type].part : type === 'Illness' ? 'illness' : String(type).split(' ')[0].toLowerCase();

  // Tuning knobs (checked by `npm run calibrate`)
  Inj.CAL = { match: 0.00047, light: 0.032, train: 0.0095, ill: 0.002, reinjury: 2.5, riskDays: 6 };

  // Calendar days per real week: the countdown runs on matchdays, the layoff is quoted in weeks
  Inj.perWeek = () => Math.max(1, (S().calendar ? S().calendar.length : 60) / 46);
  Inj.weeksLeft = (p) => (p.inj ? Math.max(1, Math.round(p.inj.weeks / Inj.perWeek())) : 0);

  // How likely this player is to break down, relative to an average player
  Inj.risk = function (p) {
    const a = W.age(p),
      c = p.clubId && S().clubs[p.clubId];
    let r = (0.45 + p.hid.inj / 20) * (W.hasTrait(p, 'Injury Prone') ? 1.6 : 1);
    r *= a <= 21 ? 0.9 : a <= 24 ? 0.95 : a <= 29 ? 1 : 1 + (a - 29) * 0.04;
    if (p.pos === 'GK') r *= 0.55;
    if (p.injRisk) r *= Inj.CAL.reinjury * (p.injRisk.rushed ? 2.4 : 1);
    const med = c ? c.facilities.medical || 2 : 2;
    r *= 1.08 - med * 0.035;
    if (c && W.isUser(c.id)) r *= FM.Staff.impact('physio').risk;
    return r;
  };

  // Choose what the injury is. A player just back from injury who breaks down again usually has the same problem.
  const pickType = function (p, where) {
    if (p.injRisk && Math.random() < 0.55) {
      const same = Inj.TYPES.filter((t) => t.part === p.injRisk.part && t.where === 'a');
      if (same.length) return U.pick(same);
    }
    const pool = Inj.TYPES.filter((t) => where === 'match' || where === 'intl' || t.where === 'a');
    let x = Math.random() * U.sum(pool, (t) => t.w);
    for (const t of pool) if ((x -= t.w) <= 0) return t;
    return pool[0];
  };
  const layoff = (t, p) => {
    const age = W.age(p),
      c = p.clubId && S().clubs[p.clubId];
    let w = t.lo + (t.hi - t.lo) * Math.pow(Math.random(), 1.6); // most injuries at the shorter end of the range
    w *= (1 + Math.max(0, age - 30) * 0.04) * (1.12 - (c ? c.facilities.medical || 2 : 2) * 0.04);
    if (c && W.isUser(c.id)) w *= FM.Staff.impact('physio').layoff;
    return Math.max(1, Math.round(w));
  };

  // Injure a player. ctx: { where: 'match' | 'intl' | 'train' | 'ill', type?, weeks?, rushed? }
  Inj.hurt = function (p, ctx = {}) {
    if (!p || p.retired) return null;
    const where = ctx.where || 'match';
    const t =
      where === 'ill'
        ? { name: 'Illness', part: 'illness', lo: 1, hi: 1 }
        : ctx.type
          ? BY[ctx.type] || pickType(p, where)
          : pickType(p, where);
    let out = ctx.weeks || (where === 'ill' ? 1 : layoff(t, p));
    if (p.injRisk && p.injRisk.part === t.part) out = Math.round(out * 1.3 + 1); // breaking down again is worse
    if (ctx.rushed) out = Math.round(out * 1.5 + 1);
    if (p.inj && p.inj.out >= out) return null; // already out for longer
    p.inj = { weeks: Math.max(1, Math.round(out * Inj.perWeek())), type: t.name, out };
    delete p.injRisk;
    FM.Records.noteInjury(p);
    if (where !== 'ill') Inj.announce(p, t);
    return p.inj;
  };

  // Engine: per-minute chance for a player on the pitch (stamina = sd.st, 0–100)
  Inj.matchChance = (p, stamina) => Inj.CAL.match * Inj.risk(p) * (1.6 - stamina / 100) * (p.fitness < 70 ? 1.3 : 1);
  // Light-tier matches: per appearance
  Inj.lightChance = (p) => Inj.CAL.light * Inj.risk(p) * (p.fitness < 70 ? 1.3 : 1);

  // Every calendar day: rehab countdown, the return to fitness, training knocks and illness
  Inj.daily = function () {
    const per = Inj.perWeek(),
      train = Inj.CAL.train / per,
      ill = Inj.CAL.ill / per;
    for (const p of Object.values(S().players)) {
      if (p.retired) continue;
      if (p.inj) {
        if (--p.inj.weeks <= 0) Inj.recover(p);
        continue;
      }
      if (p.injRisk && --p.injRisk.d <= 0) delete p.injRisk;
      if (!p.clubId) continue;
      if (Math.random() < train * Inj.risk(p)) Inj.hurt(p, { where: 'train' });
      else if (Math.random() < ill) Inj.hurt(p, { where: 'ill' });
    }
    Inj.expireDecisions();
  };

  // Back in training: match sharpness depends on how long he was out; a big injury can cost some pace for good
  Inj.recover = function (p) {
    const inj = p.inj,
      t = BY[inj.type],
      out = inj.out || 1;
    p.inj = null;
    p.fitness = Math.round(U.clamp(92 - out * 2.2, 55, 90));
    if (t && t.part !== 'knock' && out >= 2)
      p.injRisk = { part: t.part, d: Math.round(Inj.CAL.riskDays * (inj.rehab ? 2 : 1)) };
    if (out >= 20) {
      const age = W.age(p),
        loss = (age >= 28 ? 1.2 : 0.6) * U.rand(0.5, 1.5);
      p.attrs.pace = U.clamp(p.attrs.pace - loss, 1, 20);
      p.attrs.stamina = U.clamp(p.attrs.stamina - loss * 0.5, 1, 20);
      W.refresh(p);
    }
    if (W.isUser(p.clubId) && out >= 3)
      FM.News.add({
        type: 'club',
        title: `${W.name(p)} is back in training`,
        body: `After ${out} weeks out with ${article(inj.type)}. Match fitness ${p.fitness}% — he needs games${p.injRisk ? ', and the physios want his minutes managed for a while' : ''}.`,
        pid: p.id,
        clubId: p.clubId,
      });
  };
  const article = (type) => {
    if (type === 'Illness') return 'an illness';
    const t = type.toLowerCase().replace('acl', 'ACL');
    return /^(bruised ribs|back spasms)/.test(t) ? t : (/^[aeiou]/i.test(t) ? 'an ' : 'a ') + t;
  };
  const range = (w) =>
    w <= 1
      ? 'about a week'
      : w <= 3
        ? `${w - 1}–${w} weeks`
        : w < 10
          ? `${w - 1}–${w + 1} weeks`
          : `around ${Math.round(w / 4.3)} months`;
  Inj.range = range;

  // News: your players (with medical decisions where there is one), and long-term injuries to stars elsewhere
  Inj.announce = function (p, t) {
    const c = p.clubId && S().clubs[p.clubId];
    if (!c) return;
    const inj = p.inj;
    if (W.isUser(c.id)) {
      if (t.surg && inj.out >= 4) {
        const surgW = Math.round(inj.out * 1.35 + 1);
        FM.News.add({
          type: 'medical',
          title: `${W.name(p)}: surgery or rehab?`,
          body: `Scans show ${article(t.name)}. The medical team can operate — out ${range(surgW)}, but the problem should be fixed — or manage it with rehab: back in ${range(inj.out)}, with a real chance it flares up again. Head physio recommends ${W.age(p) <= 30 || inj.out >= 8 ? 'surgery' : 'rehab'}.`,
          pid: p.id,
          clubId: c.id,
          why: 'surgery',
          rec: W.age(p) <= 30 || inj.out >= 8 ? 0 : 1,
          surgW,
          choices: [
            { k: 'surgery', label: `Surgery (${range(surgW)})` },
            { k: 'rehab', label: `Rehab (${range(inj.out)})` },
          ],
        });
      } else if (inj.out >= 2)
        FM.News.add({
          type: 'club',
          title: `${W.name(p)} out for ${range(inj.out)}`,
          body: `${t.name === 'Illness' ? 'Illness.' : `The medical team confirm ${article(t.name)}.`}${inj.out >= 20 ? ' His season may be over.' : ''}`,
          pid: p.id,
          clubId: c.id,
        });
    } else if (inj.out >= 12 && c.sim === 'full' && p.ca >= W.levelFor(c.rep) + 2) {
      FM.News.add({
        type: 'world',
        title: `${c.name} blow: ${W.name(p)} out for ${range(inj.out)}`,
        body: `The ${FM.Stories.describe(p)} has suffered ${article(t.name)}.`,
        pid: p.id,
        clubId: c.id,
      });
    }
  };

  // Medical decisions for your players. Unanswered ones are settled by the head physio after a couple of days.
  Inj.resolve = function (n, i) {
    if (n.resolved) return;
    const p = S().players[n.pid],
      ch = n.choices[i];
    n.resolved = ch.label;
    if (!p || !W.isUser(p.clubId) || !p.inj) {
      n.reply = 'No longer relevant.';
      return;
    }
    if (ch.k === 'surgery') {
      const per = Inj.perWeek(),
        extra = n.surgW - p.inj.out;
      p.inj.weeks += Math.round(extra * per);
      p.inj.out = n.surgW;
      p.inj.surgery = true;
      const h = (p.injHist || []).at(-1);
      if (h && h[1] === p.inj.type) h[2] = n.surgW;
      n.reply = 'The operation goes well. The surgeon expects a full recovery.';
    } else if (ch.k === 'rehab') {
      p.inj.rehab = true;
      n.reply = 'Conservative treatment it is. The physios will keep a close eye on him when he returns.';
    } else if (ch.k === 'rush') {
      const tp = p.inj.type,
        back = p.inj.out;
      p.inj = null;
      p.fitness = 78;
      p.injRisk = { part: Inj.part(tp), d: Math.round(Inj.CAL.riskDays * 1.5), rushed: true };
      n.reply = `He's available — ${back >= 4 ? 'the physio is uneasy' : 'fingers crossed'}.`;
    } else if (ch.k === 'wait') n.reply = 'He will complete his rehab.';
  };
  Inj.expireDecisions = function () {
    const s = S();
    for (const n of s.news) {
      if (n.type !== 'medical' || n.resolved) continue;
      if (s.year > n.year || s.day - n.day >= 2) {
        Inj.resolve(n, n.rec || 0);
        n.resolved = `Head physio decided: ${n.resolved}`;
      }
    }
  };

  // "Risk him?" — a key player a few days from fitness before a big game
  Inj.riskHim = function (fx) {
    const c = W.userClub();
    if (!c || !fx || (fx.h !== c.id && fx.a !== c.id)) return;
    const s = S(),
      comp = s.comps[fx.comp],
      opp = s.clubs[fx.h === c.id ? fx.a : fx.h];
    if (!opp) return;
    const big =
      fx.ko ||
      (comp && comp.type !== 'league' && comp.type !== 'friendly') ||
      c.rival === opp.id ||
      FM.Records.heated(c.id, opp.id) ||
      (opp && Math.abs(opp.rep - c.rep) <= 6 && opp.rep >= 78);
    if (!big) return;
    const best = W.squad(c.id)
      .slice()
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 11);
    for (const p of best) {
      if (
        !p.inj ||
        p.inj.weeks > 1 ||
        p.inj.type === 'Illness' ||
        s.news.some((n) => n.type === 'medical' && n.pid === p.id && !n.resolved)
      )
        continue;
      const vs = opp.name;
      FM.News.add({
        type: 'medical',
        title: `Risk ${W.short(p)} against ${vs}?`,
        body: `He is a few days short of full fitness after ${article(p.inj.type)}. He could play, but the physio puts the risk of a setback at roughly one in ${p.inj.out >= 4 ? 3 : 4}.`,
        pid: p.id,
        clubId: c.id,
        why: 'rush',
        rec: 1,
        choices: [
          { k: 'rush', label: 'Risk him' },
          { k: 'wait', label: 'Give him the extra days' },
        ],
      });
      return;
    }
  };
})();
