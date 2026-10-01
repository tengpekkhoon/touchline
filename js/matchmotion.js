// Match motion v2: steering-based player movement, off-the-ball runs, dribbles, weighted passes,
// lofted balls, receivers running onto passes, goalkeeper dives and goal celebrations.
// Replaces the simple lerp animation in matchview.js; the simulation (engine.js) is unchanged —
// the view only decides *how* the scripted events look.
(function () {
  const FM = window.FM,
    U = FM.U,
    MV = FM.MatchView;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const easeOut = (f) => 1 - (1 - f) * (1 - f); // ground pass: decelerates as it arrives
  const easeInOut = (f) => (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);

  // Attacking direction in global coordinates for a side (home attacks +x)
  const dir = (side) => (side === 0 ? 1 : -1);

  // ---------- Plan a minute: turn the engine's script into timed, natural-looking actions ----------
  MV.planActions = function (script) {
    const st = MV.st,
      sp = st.speed;
    const acts = [];
    let prevWasPass = false;
    script.forEach((a, idx) => {
      if (a.k === 'pass' || a.k === 'cross') {
        const from = st.dots[a.side][a.from],
          to = st.dots[a.side][a.to];
        const d = from && to ? dist(from, to) : 0.2;
        // Take a touch / dribble first (more often after receiving, less when first-timing it)
        if (!a.fast && Math.random() < (prevWasPass ? 0.5 : 0.3))
          acts.push({ k: 'carry', side: a.side, slot: a.from, nat: U.rand(220, 420) });
        const lofted = a.k === 'cross' || d > 0.36;
        acts.push({ ...a, lofted, nat: U.clamp((d / (lofted ? 0.6 : 0.95)) * 1000, 200, 1000) * (a.fast ? 0.8 : 1) });
        prevWasPass = true;
      } else if (a.k === 'shot') {
        if (a.type !== 'penalty' && Math.random() < 0.6)
          acts.push({ k: 'carry', side: a.side, slot: a.from, nat: 240, pre: true });
        acts.push({ ...a, nat: a.type === 'longshot' ? 520 : 380 });
        prevWasPass = false;
      } else if (a.k === 'win') {
        acts.push({ ...a, nat: 260 });
        prevWasPass = false;
      } else if (a.k === 'kickoff') {
        acts.push({ ...a, nat: 420 });
        prevWasPass = false;
      }
    });
    // Fit the minute: compress long sequences, pad short ones with the carrier on the ball
    const budget = st.minuteMs * 0.92;
    const natural = acts.reduce((t, a) => t + a.nat / sp, 0);
    const scale = natural > budget ? Math.max(0.42, budget / natural) : 1;
    acts.forEach((a) => (a.dur = Math.max(140, (a.nat / sp) * scale)));
    const total = acts.reduce((t, a) => t + a.dur, 0);
    if (total > st.minuteMs) st.minuteMs = total / 0.92;
    st.actions = acts;
    st.nActions = acts.length;
  };

  // ---------- Action lifecycle ----------
  MV.tick = function (ms) {
    const st = MV.st;
    if (st.hold > 0) {
      st.hold -= ms;
      if (st.hold <= 0) st.celebrate = null;
      return;
    }
    st.minuteT += ms;
    if (st.act) {
      st.act.t += ms;
      const f = Math.min(1, st.act.t / st.act.dur);
      const A = st.act;
      if (A.kind === 'ball') {
        const e = A.lofted ? easeInOut(f) * 0.25 + f * 0.75 : A.shot ? f : easeOut(f);
        // crosses and lofted balls bend slightly
        const bend = A.curve ? Math.sin(f * Math.PI) * A.curve : 0;
        st.ball.x = U.lerp(A.x0, A.x1, e) + A.nx * bend;
        st.ball.y = U.lerp(A.y0, A.y1, e) + A.ny * bend;
        st.ball.h = A.arc ? 4 * A.arc * f * (1 - f) : 0;
      }
      if (f >= 1) MV.endAction();
    } else if (st.actions.length) MV.beginAction(st.actions.shift());
    if (!st.act && !st.actions.length && st.minuteT >= st.minuteMs) MV.nextMinute();
  };

  MV.beginAction = function (a) {
    const st = MV.st,
      b = st.ball;
    st.override = {};
    // A through ball or a counter is coming next: the runner sets off before the pass, into the space behind
    const nx = st.actions[0];
    if (nx && nx.k === 'pass' && (nx.ctype === 'through' || nx.ctype === 'counter')) {
      const r = st.dots[nx.side][nx.to];
      if (r) {
        const f = MV.toFrame(nx.side, r.x, r.y),
          g = MV.toGlobal(nx.side, U.clamp(f.x + 0.12, 0.05, 0.9), U.clamp(f.y + (0.5 - f.y) * 0.25, 0.08, 0.92));
        st.override[`${nx.side}:${nx.to}`] = { x: g.x, y: g.y, sprint: true };
      }
    }
    if (a.k === 'carry') {
      // Dribble: carrier pushes forward (and a little sideways) with the ball at his feet
      const d = st.dots[a.side][a.slot];
      const fwd = U.rand(0.02, a.pre ? 0.03 : 0.065) * dir(a.side);
      const tx = U.clamp(d.x + fwd, 0.03, 0.97),
        ty = U.clamp(d.y + U.rand(-0.035, 0.035), 0.05, 0.95);
      st.override[`${a.side}:${a.slot}`] = { x: tx, y: ty, sprint: true };
      b.side = a.side;
      b.slot = a.slot;
      st.act = { kind: 'carry', a, t: 0, dur: a.dur };
      return;
    }
    if (a.k === 'kickoff') {
      b.x = 0.5;
      b.y = 0.5;
      b.h = 0;
    }
    let x1,
      y1,
      arc = 0,
      curve = 0,
      shot = false,
      lofted = !!a.lofted;
    if (a.k === 'pass' || a.k === 'cross' || a.k === 'win' || a.k === 'kickoff') {
      // Lead the receiver: aim where he's heading, and send him onto the ball
      const d = st.dots[a.side][a.to];
      const tgt = (st.targets && st.targets[a.side] && st.targets[a.side][a.to]) || d;
      // into space for a through ball (the runner is already going), a lead pass otherwise
      const lead = a.k === 'win' ? 0 : a.ctype === 'through' || a.ctype === 'counter' ? 1.05 : 0.55;
      x1 = U.clamp(d.x + (tgt.x - d.x) * lead + (a.k === 'win' ? 0 : dir(a.side) * 0.012), 0.02, 0.98);
      y1 = U.clamp(d.y + (tgt.y - d.y) * lead, 0.03, 0.97);
      st.override[`${a.side}:${a.to}`] = { x: x1, y: y1, sprint: true };
      if (lofted) arc = 0.02 + Math.min(0.05, dist(b, { x: x1, y: y1 }) * 0.09);
      if (a.k === 'cross') {
        arc = 0.045;
        curve = 0.03 * (Math.random() < 0.5 ? -1 : 1);
      }
    } else if (a.k === 'shot') {
      shot = true;
      const gy = 0.5 + U.rand(-0.035, 0.035);
      let gx = 1.012,
        fy = gy;
      const gk = a.gk != null ? st.dots[1 - a.side][a.gk] : null;
      if (a.outcome === 'saved' && gk) {
        const g = MV.toFrame(a.side, gk.x, gk.y);
        gx = Math.min(0.99, g.x + 0.006);
        fy = U.clamp(gy + U.rand(-0.02, 0.02), 0.44, 0.56);
      }
      if (a.outcome === 'wide') {
        gx = 1.03;
        fy = 0.5 + (Math.random() < 0.5 ? -1 : 1) * U.rand(0.06, 0.14);
      }
      if (a.outcome === 'blocked') {
        const f = MV.toFrame(a.side, b.x, b.y);
        gx = f.x + 0.045;
        fy = f.y + U.rand(-0.05, 0.05);
      }
      const g = MV.toGlobal(a.side, gx, fy);
      x1 = g.x;
      y1 = g.y;
      arc = a.type === 'longshot' ? 0.03 : a.type === 'cross' ? 0.015 : 0.006;
      curve = a.type === 'longshot' ? 0.02 * (Math.random() < 0.5 ? -1 : 1) : 0;
      // Keeper reacts: shuffles and dives toward where the ball is going
      if (gk && a.gk != null)
        st.override[`${1 - a.side}:${a.gk}`] = {
          x: U.lerp(gk.x, x1, a.outcome === 'saved' ? 0.9 : 0.5),
          y: U.lerp(gk.y, y1, a.outcome === 'saved' ? 1 : 0.6),
          sprint: true,
          dive: true,
        };
      if (a.big) MV.banner(`⚡ ${MV.m.clock}`, MV.pendingChanceText || 'Big chance…', false);
    }
    // perpendicular unit vector for curling balls
    const dx = x1 - b.x,
      dy = y1 - b.y,
      L = Math.hypot(dx, dy) || 1;
    st.act = {
      kind: 'ball',
      a,
      t: 0,
      dur: a.dur,
      x0: b.x,
      y0: b.y,
      x1,
      y1,
      arc,
      curve,
      nx: -dy / L,
      ny: dx / L,
      lofted,
      shot,
    };
    if (a.k !== 'shot') {
      b.side = a.side;
      b.slot = a.to;
      b.inFlight = true;
    }
  };

  MV.endAction = function () {
    const st = MV.st,
      A = st.act,
      a = A.a;
    st.act = null;
    st.ball.inFlight = false;
    st.ball.h = 0;
    if (a.k !== 'shot') st.touch = 0.22; // the receiver's first touch: the ball settles rather than sticks
    if (a.k === 'shot') {
      const ev = st.pendingEv.shift();
      if (ev) MV.showEvent(ev);
      if (a.outcome === 'goal') {
        st.hold = 1700;
        st.celebrate = { side: a.side, slot: a.from };
      } else if (a.big) st.hold = 700;
      st.override = {};
    }
  };

  // ---------- Movement: steering with pace-limited acceleration ----------
  MV.moveDots = function (dt) {
    const st = MV.st,
      m = MV.m,
      b = st.ball;
    if (!st) return;
    st.clockT = (st.clockT || 0) + dt * (st.paused || st.prompt ? 0.2 : 1);
    const t = st.clockT,
      owner = b.side;
    st.targets = st.targets || [[], []];
    m.sides.forEach((sd, k) => {
      const bf = MV.toFrame(k, b.x, b.y);
      const inPoss = owner === k;
      const opp = m.sides[1 - k],
        oppDots = st.dots[1 - k];
      const fr = sd.slots.map((s, i) => {
        const p = FM.Pos(sd, i, inPoss, bf);
        let x = p.x,
          y = p.y;
        if (s.t !== 'GK') {
          // natural shuffle so the shape breathes instead of standing still
          x += 0.008 * Math.sin(t * 0.7 + i * 2.1 + k * 1.3);
          y += 0.012 * Math.sin(t * 0.53 + i * 1.37 + k * 2.2);
          if (inPoss) {
            // timed forward runs by attacking players when the ball is in a good area
            if (['ST', 'W', 'AM', 'WB'].includes(s.t) || (s.t === 'FB' && Math.abs(y - bf.y) < 0.35)) {
              const phase = Math.sin(t * 0.45 + i * 1.9 + k);
              if (phase > 0.5 && bf.x > 0.32) {
                const run = (phase - 0.5) / 0.5;
                x += (s.t === 'ST' ? 0.08 : 0.06) * run;
                if (s.t === 'W' || s.t === 'WB' || s.t === 'FB') y += (y < 0.5 ? -1 : 1) * 0.025 * run;
                else y += (0.5 - y) * 0.15 * run;
              }
            }
          }
        } else {
          // keeper stays between ball and goal
          y = 0.5 + (bf.y - 0.5) * 0.35;
          x = 0.025 + Math.max(0, 0.5 - bf.x) * 0.06;
        }
        return { x, y };
      });
      if (!inPoss) {
        // the back line steps up and drops together, and stays goal-side of the ball
        const back = sd.slots.map((s, i) => i).filter((i) => ['CB', 'FB', 'WB'].includes(sd.slots[i].t));
        if (back.length >= 2) {
          let line = U.avg(back, (i) => fr[i].x);
          line = Math.min(line, Math.max(0.07, bf.x - 0.05));
          back.forEach((i) => (fr[i].x = U.lerp(fr[i].x, line, sd.slots[i].t === 'WB' ? 0.5 : 0.8)));
        }
        // defenders pick up the nearest runner in their zone, goal-side of him
        const att = oppDots.map((d) => MV.toFrame(k, d.x, d.y));
        back.forEach((i) => {
          const z = fr[i],
            a = att
              .map((q, j) => ({ q, j, d: Math.hypot(q.x - z.x, q.y - z.y) }))
              .filter((o) => o.j !== b.slot && opp.slots[o.j].t !== 'GK' && o.d < 0.16)
              .sort((p, q) => p.d - q.d)[0];
          if (a) {
            z.y = U.lerp(z.y, a.q.y, 0.45);
            z.x = Math.min(z.x, a.q.x - 0.025);
          }
        });
      }
      const targets = fr.map((p) => MV.toGlobal(k, U.clamp(p.x, 0.02, 0.98), U.clamp(p.y, 0.03, 0.97)));

      if (inPoss) {
        // two nearest teammates come short to offer angles to the carrier
        const carrier = st.dots[k][b.slot];
        if (carrier && !b.inFlight) {
          targets
            .map((tg, i) => ({ i, d: dist(st.dots[k][i], carrier) }))
            .filter((o) => o.i !== b.slot && sd.slots[o.i].t !== 'GK')
            .sort((p, q) => p.d - q.d)
            .slice(0, 2)
            .forEach(({ i }, n) => {
              targets[i].x = U.lerp(targets[i].x, carrier.x - dir(k) * 0.02, 0.22);
              targets[i].y = U.lerp(targets[i].y, carrier.y + (n ? 0.09 : -0.09), 0.25);
            });
          // the carrier himself drives forward gently when not in an action
          if (!st.act) {
            targets[b.slot] = { x: U.clamp(carrier.x + dir(k) * 0.03, 0.04, 0.96), y: U.lerp(carrier.y, 0.5, 0.05) };
          }
        }
      } else {
        // press the ball, and cut the nearest passing lane
        const n = sd.tactic.press === 'High Press' ? 2 : 1,
          pull = { 'High Press': 0.75, 'Mid Block': 0.55, 'Low Block': 0.35 }[sd.tactic.press];
        const near = targets
          .map((tg, i) => ({ i, d: dist(st.dots[k][i], b) }))
          .filter((o) => sd.slots[o.i].t !== 'GK')
          .sort((p, q) => p.d - q.d);
        // the nearest presser closes down goal-side of the ball and jockeys; a second one (high press) shows him wide
        near.slice(0, n).forEach(({ i }, j) => {
          const gx = b.x - dir(k) * (j ? 0.05 : 0.028),
            gy = b.y + (j ? (b.y < 0.5 ? 0.04 : -0.04) : 0);
          targets[i].x = U.lerp(targets[i].x, gx, j ? pull * 0.8 : Math.max(pull, 0.85));
          targets[i].y = U.lerp(targets[i].y, gy, j ? pull * 0.8 : Math.max(pull, 0.85));
        });
        const outlet = oppDots
          .map((d, i) => ({ d, i }))
          .filter((o) => o.i !== b.slot && opp.slots[o.i].t !== 'GK')
          .sort((p, q) => dist(p.d, b) - dist(q.d, b))[0];
        const cover = near[n];
        if (outlet && cover) {
          targets[cover.i].x = U.lerp(targets[cover.i].x, (outlet.d.x + b.x) / 2, 0.55);
          targets[cover.i].y = U.lerp(targets[cover.i].y, (outlet.d.y + b.y) / 2, 0.55);
        }
      }

      // celebrations: scorer to the corner flag, team-mates follow
      if (st.celebrate) {
        const C = st.celebrate,
          sc = st.dots[C.side][C.slot];
        if (k === C.side && sc) {
          const corner = { x: C.side === 0 ? 0.97 : 0.03, y: sc.y < 0.5 ? 0.04 : 0.96 };
          targets[C.slot] = corner;
          targets.forEach((tg, i) => {
            if (i !== C.slot && sd.slots[i].t !== 'GK') {
              tg.x = U.lerp(tg.x, corner.x, 0.35);
              tg.y = U.lerp(tg.y, corner.y, 0.35);
            }
          });
        }
      }
      // action overrides (receiver running onto a pass, dribbler, diving keeper)
      for (const key in st.override || {}) {
        const [ks, is] = key.split(':');
        if (+ks === k) targets[+is] = st.override[key];
      }
      st.targets[k] = targets;

      targets.forEach((tg, i) => {
        const d = st.dots[k][i],
          p = sd.xi[i];
        if (!d) return;
        d.vx = d.vx || 0;
        d.vy = d.vy || 0;
        const energy = p && sd.st[p.id] != null ? 0.75 + 0.25 * (sd.st[p.id] / 100) : 1;
        const pace = p ? p.attrs.pace : 10;
        const ov = st.override && st.override[`${k}:${i}`];
        let vmax =
          (0.13 + 0.09 * (pace / 20)) *
          energy *
          (ov && ov.sprint ? 1.45 : 1) *
          (ov && ov.dive ? 2.2 : 1) *
          Math.max(1, st.speed * 0.75);
        if (st.celebrate && st.celebrate.side === k) vmax *= 1.2;
        else if (!ov && Math.hypot(tg.x - d.x, tg.y - d.y) < 0.08) vmax *= 0.6; // jog into shape, sprint to recover
        let dvx = (tg.x - d.x) * 3.2,
          dvy = (tg.y - d.y) * 3.2;
        const sp = Math.hypot(dvx, dvy);
        if (sp > vmax) {
          dvx *= vmax / sp;
          dvy *= vmax / sp;
        }
        const acc = Math.min(1, dt * (ov ? 9 : 5));
        d.vx += (dvx - d.vx) * acc;
        d.vy += (dvy - d.vy) * acc;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      });
    });

    // Nobody stands on anybody: players closer than a stride ease apart (the ball carrier holds his line)
    const all = [];
    st.dots.forEach((side, k) => side.forEach((d, i) => d && all.push({ d, k, i })));
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const A = all[i].d,
          B = all[j].d,
          dx = B.x - A.x,
          dy = B.y - A.y,
          L = Math.hypot(dx, dy),
          min = all[i].k === all[j].k ? 0.04 : 0.02;
        if (L >= min || L === 0) continue;
        const push = (min - L) * Math.min(1, dt * 6),
          ux = dx / L,
          uy = dy / L;
        const holdA = all[i].k === b.side && all[i].i === b.slot,
          holdB = all[j].k === b.side && all[j].i === b.slot;
        if (!holdA) ((A.x -= ux * push * (holdB ? 1 : 0.5)), (A.y -= uy * push * (holdB ? 1 : 0.5)));
        if (!holdB) ((B.x += ux * push * (holdA ? 1 : 0.5)), (B.y += uy * push * (holdA ? 1 : 0.5)));
      }
    // Ball at the carrier's feet, slightly ahead in the direction he's moving
    if (!st.act || st.act.kind === 'carry') {
      const d = st.dots[b.side] && st.dots[b.side][b.slot];
      if (d) {
        const v = Math.hypot(d.vx || 0, d.vy || 0);
        const fx = v > 0.01 ? d.vx / v : dir(b.side),
          fy = v > 0.01 ? d.vy / v : 0;
        const tx = d.x + fx * 0.011,
          ty = d.y + fy * 0.011;
        st.touch = Math.max(0, (st.touch || 0) - dt);
        const k = Math.min(1, dt * (st.touch > 0 ? 7 : 18));
        b.x = U.lerp(b.x, tx, k);
        b.y = U.lerp(b.y, ty, k);
        b.h = 0;
      }
    }
    st.trail.push([b.x, b.y]);
    if (st.trail.length > 10) st.trail.shift();
  };

  // Dots now carry velocity
  const origInit = MV.initDots;
  MV.initDots = function () {
    origInit();
    MV.st.dots.forEach((side) =>
      side.forEach((d) => {
        d.vx = 0;
        d.vy = 0;
      }),
    );
    MV.st.override = {};
    MV.st.celebrate = null;
  };
})();
