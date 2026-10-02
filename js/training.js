// Training: your club's weekly focus and intensity, plus an individual focus for any player. It shapes how your
// players develop (how fast, and which attributes), training injuries, recovery between matches, set-piece
// routines and how quickly the team learns its tactics. AI clubs train a balanced week.
(function () {
  const FM = window.FM,
    W = FM.W;
  const Tr = (FM.Training = {});
  const S = () => FM.S;

  // attrs: weight multipliers on growth. dev, inj, rec, fam, sp: development rate, training-injury risk, recovery
  // per day (fitness points), familiarity growth, set-piece quality.
  Tr.FOCUS = {
    balanced: { label: 'Balanced', icon: '⚖️', desc: 'A bit of everything. No strengths, no gaps.' },
    fitness: {
      label: 'Fitness',
      icon: '🏃',
      desc: 'Pace, stamina and strength grow faster. Players recover a little quicker.',
      attrs: { pace: 1.7, stamina: 1.8, strength: 1.6, workRate: 1.3 },
      rec: 2,
    },
    attacking: {
      label: 'Attacking',
      icon: '🎯',
      desc: 'Finishing, dribbling and composure in front of goal.',
      attrs: { finishing: 1.8, dribbling: 1.5, composure: 1.4, technique: 1.2 },
    },
    defending: {
      label: 'Defending',
      icon: '🛡️',
      desc: 'Tackling, positioning and strength. Shape without the ball.',
      attrs: { tackling: 1.8, positioning: 1.7, strength: 1.3, workRate: 1.2 },
    },
    technical: {
      label: 'Technical',
      icon: '🎩',
      desc: 'Passing, technique and vision: keeping the ball.',
      attrs: { passing: 1.7, technique: 1.7, vision: 1.5, composure: 1.2 },
    },
    setpieces: {
      label: 'Set pieces',
      icon: '🚩',
      desc: 'Rehearsed corners and free kicks: better chances from dead balls.',
      attrs: { technique: 1.2, passing: 1.1 },
      sp: 1.1,
      dev: 0.95,
    },
    tactics: {
      label: 'Tactics',
      icon: '🧠',
      desc: 'Drills your system: familiarity grows half as fast again.',
      attrs: { positioning: 1.3, vision: 1.3 },
      fam: 1.5,
      dev: 0.92,
    },
    recovery: {
      label: 'Recovery',
      icon: '🛁',
      desc: 'Light sessions and treatment. Fresher legs and fewer knocks, slower development.',
      rec: 6,
      inj: 0.6,
      dev: 0.75,
    },
  };
  Tr.INTENSITY = {
    light: { label: 'Light', desc: 'Fresher legs, fewer knocks, slower progress', dev: 0.85, inj: 0.7, rec: 3 },
    normal: { label: 'Normal', desc: 'The usual week', dev: 1, inj: 1, rec: 0 },
    hard: { label: 'Hard', desc: 'Faster progress, more knocks, heavier legs', dev: 1.15, inj: 1.4, rec: -4 },
  };
  // Individual focus: an attribute group (as the team focuses) or learning a new position
  Tr.IND = {
    attacking: Tr.FOCUS.attacking,
    defending: Tr.FOCUS.defending,
    technical: Tr.FOCUS.technical,
    fitness: Tr.FOCUS.fitness,
    keeping: { label: 'Goalkeeping', icon: '🧤', attrs: { reflexes: 1.8, handling: 1.8, positioning: 1.3 } },
  };
  Tr.LEARN_STEP = 0.006; // a position learned in training each league day (about half a game's worth)

  Tr.get = function () {
    const u = S().user;
    if (!u) return null;
    if (!u.training) u.training = { focus: 'balanced', intensity: 'normal', ind: {} };
    if (!u.training.ind) u.training.ind = {};
    return u.training;
  };
  // A player's training this week (null for AI clubs' players and loanees out: they train at their club)
  const mine = (p) => p && p.clubId && W.isUser(FM.Youth.owner(p.clubId)) && !p.loan;
  const plan = (p) => {
    if (!mine(p)) return null;
    const t = Tr.get();
    return (
      t && {
        f: Tr.FOCUS[t.focus] || Tr.FOCUS.balanced,
        i: Tr.INTENSITY[t.intensity] || Tr.INTENSITY.normal,
        ind: t.ind[p.id],
      }
    );
  };
  Tr.devK = (p) => {
    const t = plan(p);
    return t ? (t.f.dev || 1) * t.i.dev : 1;
  };
  Tr.injK = (p) => {
    const t = plan(p);
    return t ? (t.f.inj || 1) * t.i.inj : 1;
  };
  Tr.recK = (p) => {
    const t = plan(p);
    return t ? (t.f.rec || 0) + t.i.rec : 0;
  };
  // Growth weights for each attribute: the team focus, and an individual focus on top (which counts for more)
  Tr.weights = (p) => {
    const t = plan(p);
    if (!t) return null;
    const ind = t.ind && Tr.IND[t.ind];
    if (!t.f.attrs && !ind) return null;
    const out = {};
    for (const k of FM.D.ATTRS) out[k] = ((t.f.attrs && t.f.attrs[k]) || 1) * (ind ? (ind.attrs[k] || 0.85) * 1.1 : 1);
    return out;
  };
  // A weighting that keeps the overall growth the same: the focused attributes grow at the others' expense
  Tr.attrW = (p, w) => {
    if (!w) return () => 1;
    const avg = FM.D.ATTRS.reduce((t, k) => t + w[k], 0) / FM.D.ATTRS.length;
    return (k) => w[k] / avg;
  };
  Tr.famK = () => {
    const t = Tr.get();
    return t ? (Tr.FOCUS[t.focus] || {}).fam || 1 : 1;
  };
  Tr.spK = () => {
    const t = Tr.get();
    return t ? (Tr.FOCUS[t.focus] || {}).sp || 1 : 1;
  };
  // Each league day: players learning a new position pick a little of it up on the training ground
  Tr.leagueDay = function () {
    const t = S().user && S().user.training;
    if (!t || !W.userClub()) return;
    for (const [id, v] of Object.entries(t.ind)) {
      const p = S().players[id];
      if (!mine(p)) {
        delete t.ind[id];
        continue;
      }
      if (!v.startsWith('pos:')) continue;
      const pos = v.slice(4),
        max = FM.Season.LEARN.max;
      const now = W.fitAt(p, pos);
      if (now >= max) {
        delete t.ind[id];
        FM.News.add({
          type: 'club',
          title: `${W.name(p)} has learned a new position`,
          body: `${W.name(p)} is now comfortable as a ${pos}. His individual training is back to normal.`,
          clubId: W.userClub().id,
        });
        continue;
      }
      const k = FM.Staff.impact('coach').learn * (p.hid.prof >= 14 ? 1.2 : 1) * FM.Season.learnRate(p);
      (p.alt = p.alt || {})[pos] = Math.round(Math.min(max, now + Tr.LEARN_STEP * k) * 1000) / 1000;
      (p.altY = p.altY || {})[pos] = FM.S.year; // being trained there keeps it sharp
    }
  };
})();
