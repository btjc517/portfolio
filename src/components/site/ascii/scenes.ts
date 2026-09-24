// Small live scenes drawn in characters: one per project, one per role and school. Each is a
// simulation that writes into a Grid every frame; see ascii/grid.ts.

import { ASPECT, clamp, ease, Grid, pick, rand, type Sim } from "./grid";

// ---- Symphony: agents on three machines, each carrying a change from start to merge ----------

function symphony(cols: number, rows: number): Sim {
  const machines = ["mbp-m3", "m1", "desktop-home"];
  const lanesPer = 2;
  const n = machines.length * lanesPer;
  const top = 4;
  const gap = Math.max(2, Math.floor((rows - top - 2) / n));
  // Narrow tiles drop the agent column and shorten the machine names.
  const wide = cols >= 64;
  const labelW = cols >= 48 ? 13 : 7;
  const agentX = 2 + labelW + 1;
  const x0 = wide ? agentX + 8 : agentX;
  const x1 = cols - 9;
  let shipped = 1284;
  let task = 2210;
  const lanes = Array.from({ length: n }, (_, i) => ({
    machine: i % lanesPer === 0 ? (labelW < 13 ? machines[i / lanesPer].slice(0, 6) : machines[i / lanesPer]) : "",
    agent: i % 2 === 0 ? "claude" : "codex",
    p: Math.random(),
    speed: rand(0.05, 0.13),
    review: rand(0.62, 0.82),
    hold: 0,
    reviewed: false,
    merged: -10,
    task: task++,
  }));
  let time = 0;
  return {
    step(dt) {
      time += dt;
      for (const l of lanes) {
        if (l.hold > 0) {
          l.hold -= dt;
          continue;
        }
        l.p += dt * l.speed;
        if (!l.reviewed && l.p >= l.review) {
          l.reviewed = true;
          l.hold = rand(0.6, 1.8);
        }
        if (l.p >= 1) {
          l.p = 0;
          l.merged = time;
          l.speed = rand(0.05, 0.14);
          l.review = rand(0.6, 0.85);
          l.reviewed = false;
          l.task = task++;
          shipped++;
        }
      }
    },
    draw(g) {
      g.put(2, 1, "FLEET", 0.5);
      if (cols >= 56) g.put(9, 1, `${n} agents on 3 machines`, 0.26);
      const label = `shipped ${shipped}`;
      g.put(cols - 2 - label.length, 1, label, 0.5);
      lanes.forEach((l, i) => {
        const y = top + i * gap;
        if (l.machine) g.put(2, y, l.machine, 0.42);
        if (wide) g.put(agentX, y, l.agent, 0.24);
        for (let x = x0; x <= x1; x += 2) g.put(x, y, ".", 0.12);
        const head = x0 + Math.round(l.p * (x1 - x0));
        for (let x = x0; x < head; x++) g.put(x, y, "=", 0.34);
        const inReview = l.hold > 0 && l.reviewed;
        g.put(head, y, inReview ? (Math.floor(time * 4) % 2 ? "?" : ">") : ">", 1);
        if (inReview) g.put(head + 2, y, "review", 0.4);
        const since = time - l.merged;
        if (since < 1.4) g.put(x1 + 2, y, "merged", 1 - since / 1.4, since < 0.5);
        else g.put(x1 + 2, y, `#${l.task}`, 0.2);
      });
    },
  };
}

// ---- ImpactOS engine: messy uploads cross a gate and settle into a clean table ----------------

function ingest(cols: number, rows: number): Sim {
  const messy = "0123456789.,;:%$£-_/#?~abcdefxyz ";
  const gate = Math.floor(cols * 0.44);
  const tx0 = gate + 4;
  const colW = Math.max(7, Math.floor((cols - tx0 - 2) / 3));
  const ty0 = 4;
  const tRows = Math.max(3, rows - ty0 - 2);
  const table: string[][] = Array.from({ length: tRows }, () => ["", "", ""]);
  let fill = 0; // next free slot, row-major
  let shift = 0; // eases from 1 to 0 after the table scrolls up a row
  let gateFlash = new Float32Array(rows);
  type Item = { x: number; y: number; vx: number; ph: number; s: string; a: number; state: 0 | 1; t: number; fx: number; fy: number; slot: number; val: string };
  const items: Item[] = [];
  const value = () => {
    const v = Math.random() < 0.3 ? rand(0, 1).toFixed(2) : rand(1, 999).toFixed(1);
    return v.padStart(colW - 2, " ");
  };
  const spawn = (x = rand(-2, 0)) =>
    items.push({
      x,
      y: rand(ty0, rows - 2),
      vx: rand(5, 10),
      ph: rand(0, 6.28),
      s: Array.from({ length: (rand(3, 6) | 0) }, () => pick(messy)).join(""),
      a: rand(0.22, 0.6),
      state: 0,
      t: 0,
      fx: 0,
      fy: 0,
      slot: -1,
      val: "",
    });
  for (let i = 0; i < 30; i++) spawn(rand(0, gate - 4));
  let time = 0;
  let nextSpawn = 0;
  return {
    step(dt) {
      time += dt;
      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        spawn();
        nextSpawn = rand(0.06, 0.16);
      }
      shift = Math.max(0, shift - dt / 0.35);
      for (let r = 0; r < rows; r++) gateFlash[r] = Math.max(0, gateFlash[r] - dt * 2.5);
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.state === 0) {
          it.x += it.vx * dt;
          it.y += Math.sin(time * 1.3 + it.ph) * dt * 0.8;
          if (Math.random() < dt * 6) {
            const k = (Math.random() * it.s.length) | 0;
            it.s = it.s.slice(0, k) + pick(messy) + it.s.slice(k + 1);
          }
          if (it.x >= gate) {
            if (fill >= tRows * 3) {
              // Table full: commit the top row and scroll everything up.
              table.shift();
              table.push(["", "", ""]);
              fill -= 3;
              shift = 1;
              for (const o of items) if (o.state === 1) o.slot -= 3;
            }
            gateFlash[Math.round(it.y)] = 1;
            it.state = 1;
            it.t = 0;
            it.fx = it.x;
            it.fy = it.y;
            it.slot = fill++;
            it.val = value();
          }
        } else {
          it.t += dt / 0.7;
          if (it.t >= 1) {
            // A slot below zero was committed while this value was still landing.
            if (it.slot >= 0) table[Math.floor(it.slot / 3)][it.slot % 3] = it.val;
            items.splice(i, 1);
          }
        }
      }
    },
    draw(g) {
      g.put(2, 1, "UPLOADS", 0.5);
      if (gate > 24) g.put(10, 1, "xlsx pdf csv", 0.24);
      g.put(tx0, 1, "REPORT", 0.5);
      if (cols - tx0 > 28) g.put(tx0 + 7, 1, "mapped to framework", 0.24);
      ["scope", "metric", "value"].forEach((h, c) => g.put(tx0 + c * colW, 2, h, 0.3));
      for (let x = tx0; x < tx0 + colW * 3 - 1; x++) g.put(x, 3, "-", 0.16);
      for (let y = ty0 - 1; y < rows - 1; y++) g.put(gate, y, ":", 0.12 + 0.7 * gateFlash[y], gateFlash[y] > 0.5);
      for (let r = 0; r < tRows; r++) {
        const y = ty0 + r + shift;
        for (let c = 0; c < 3; c++) if (table[r][c]) g.put(tx0 + c * colW, y, table[r][c], r === 0 && shift > 0 ? 0.5 * (1 - shift) : 0.62);
      }
      for (const it of items) {
        if (it.state === 0) {
          const fade = clamp(it.x / 3);
          g.put(it.x, it.y, it.s, it.a * fade);
        } else {
          const e = ease(it.t);
          const tx = tx0 + (it.slot % 3) * colW;
          const ty = ty0 + Math.floor(it.slot / 3) + shift;
          // The string resolves into its value as it lands.
          const shown = Array.from(it.val, (ch, k) => (it.t > 0.25 + (k / it.val.length) * 0.6 ? ch : ch === " " ? " " : pick(messy))).join("");
          g.put(it.fx + (tx - it.fx) * e, it.fy + (ty - it.fy) * e, shown, 0.5 + 0.5 * e);
        }
      }
    },
  };
}

// ---- Cortex: a knowledge graph turning slowly, with queries spreading through it ------------------

function cortex(cols: number, rows: number): Sim {
  const N = 120;
  const pts: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const j = 0.9 + Math.random() * 0.2;
    pts.push([Math.cos(th) * r * j, y * j, Math.sin(th) * r * j]);
  }
  const edges: [number, number][] = [];
  const adj: number[][] = pts.map(() => []);
  for (let i = 0; i < N; i++) {
    const d = pts.map((p, j) => [j, (p[0] - pts[i][0]) ** 2 + (p[1] - pts[i][1]) ** 2 + (p[2] - pts[i][2]) ** 2] as const).filter(([j]) => j !== i);
    d.sort((a, b) => a[1] - b[1]);
    for (const [j] of d.slice(0, 3)) {
      if (!adj[i].includes(j)) {
        adj[i].push(j);
        adj[j].push(i);
        edges.push([i, j]);
      }
    }
  }
  let ay = 0;
  let pulse = { at: -10, dist: new Array<number>(N).fill(99), from: 0 };
  let nextPulse = 0.6;
  let time = 0;
  const cx = cols / 2;
  const cy = rows / 2;
  const R = Math.min(rows * 0.4, (cols * ASPECT) * 0.42);
  const proj = (p: [number, number, number]) => {
    const ax = 0.38 + 0.08 * Math.sin(time * 0.21);
    const c = Math.cos(ay);
    const s = Math.sin(ay);
    const x = p[0] * c + p[2] * s;
    let z = -p[0] * s + p[2] * c;
    const y = p[1] * Math.cos(ax) - z * Math.sin(ax);
    z = p[1] * Math.sin(ax) + z * Math.cos(ax);
    return { x: cx + (x * R) / ASPECT, y: cy + y * R, z };
  };
  return {
    step(dt) {
      time += dt;
      ay += dt * 0.22;
      nextPulse -= dt;
      if (nextPulse <= 0) {
        nextPulse = rand(2.2, 3.4);
        // Start from a node facing the viewer and spread by graph distance.
        let from = 0;
        let best = -2;
        for (let k = 0; k < 12; k++) {
          const i = (Math.random() * N) | 0;
          const z = proj(pts[i]).z;
          if (z > best) {
            best = z;
            from = i;
          }
        }
        const dist = new Array<number>(N).fill(99);
        dist[from] = 0;
        const q = [from];
        while (q.length) {
          const i = q.shift()!;
          for (const j of adj[i]) if (dist[j] > dist[i] + 1) (dist[j] = dist[i] + 1), q.push(j);
        }
        pulse = { at: time, dist, from };
      }
    },
    draw(g) {
      const P = pts.map(proj);
      const act = (i: number) => {
        const d = pulse.dist[i];
        if (d > 5) return 0;
        const t = time - pulse.at - d * 0.16;
        return t < 0 ? 0 : Math.exp(-t * 2.6) * (1 - d / 6);
      };
      for (const [i, j] of edges) {
        const a = P[i];
        const b = P[j];
        const depth = ((a.z + b.z) / 2 + 1) / 2;
        const lit = Math.min(act(i), act(j));
        const steps = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)));
        for (let k = 1; k < steps; k++) {
          const f = k / steps;
          g.put(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, lit > 0.2 ? "-" : ".", 0.05 + 0.16 * depth + 0.6 * lit, false, true);
        }
      }
      P.forEach((p, i) => {
        const depth = (p.z + 1) / 2;
        const l = act(i);
        const ch = l > 0.35 ? "#" : depth > 0.72 ? "@" : depth > 0.5 ? "o" : depth > 0.28 ? "*" : ".";
        g.put(p.x, p.y, ch, Math.min(1, 0.18 + 0.72 * depth + l), i === pulse.from && time - pulse.at < 0.8);
      });
      g.put(2, 1, "GRAPH", 0.5);
      g.put(8, 1, `${N} notes, ${edges.length} links`, 0.24);
      const q = time - pulse.at < 1.6 ? `query  ${Object.values(pulse.dist).filter((d) => d <= 3).length} related` : "idle";
      g.put(2, rows - 2, q, 0.3);
    },
  };
}

// ---- Scout: a field of creators, scanned and ranked --------------------------------------------

function scout(cols: number, rows: number): Sim {
  const panel = Math.min(22, Math.floor(cols * 0.3));
  const x0 = 3;
  const x1 = cols - panel - 3;
  const y0 = 3;
  const y1 = rows - 3;
  const pts = Array.from({ length: 64 }, () => {
    const u = Math.pow(Math.random(), 1.4);
    const v = clamp(u * 0.7 + rand(-0.25, 0.3));
    return { u, v, ph: rand(0, 6.28), id: 1000 + ((Math.random() * 9000) | 0), flash: 0 };
  });
  let time = 0;
  let ranked = pts.slice();
  let nextRank = 0;
  const score = (p: (typeof pts)[number]) => 0.55 * p.v + 0.45 * p.u;
  return {
    step(dt) {
      time += dt;
      for (const p of pts) {
        p.u = clamp(p.u + Math.sin(time * 0.35 + p.ph) * dt * 0.012);
        p.v = clamp(p.v + Math.cos(time * 0.28 + p.ph * 1.7) * dt * 0.016);
        p.flash = Math.max(0, p.flash - dt * 1.8);
      }
      const sx = ((time * 0.22) % 1) * (x1 - x0);
      for (const p of pts) if (Math.abs(p.u * (x1 - x0 - 2) + 1 - sx) < 0.6) p.flash = 1;
      nextRank -= dt;
      if (nextRank <= 0) {
        nextRank = 0.5;
        ranked = pts.slice().sort((a, b) => score(b) - score(a));
      }
    },
    draw(g) {
      g.put(2, 1, "SCORE", 0.5);
      g.put(8, 1, "engagement x reach", 0.24);
      for (let y = y0; y <= y1; y++) g.put(x0, y, "|", 0.16);
      for (let x = x0; x <= x1; x++) g.put(x, y1, "-", 0.16);
      g.put(x0, y1, "+", 0.3);
      g.put(x1 - 4, y1 + 1, "reach", 0.3);
      const sx = x0 + ((time * 0.22) % 1) * (x1 - x0);
      for (let y = y0; y < y1; y++) g.put(sx, y, ":", 0.1);
      for (const p of pts) {
        const sc = score(p);
        const ch = p.flash > 0.5 ? "@" : sc > 0.7 ? "@" : sc > 0.5 ? "O" : sc > 0.3 ? "o" : ".";
        g.put(x0 + 1 + p.u * (x1 - x0 - 2), y1 - 1 - p.v * (y1 - y0 - 2), ch, 0.25 + 0.6 * sc + 0.3 * p.flash);
      }
      const px = cols - panel;
      g.put(px, 1, "RANK", 0.5);
      for (let y = y0 - 1; y <= y1 + 1; y++) g.put(px - 2, y, "|", 0.1);
      const shown = Math.min(ranked.length, Math.floor((rows - 5) / 2));
      for (let k = 0; k < shown; k++) {
        const p = ranked[k];
        const y = y0 + k * 2;
        const line = `${String(k + 1).padStart(2, "0")}  c-${p.id}  ${(60 + 40 * score(p)).toFixed(1)}`;
        g.put(px, y, line, k === 0 ? 0.95 : 0.5 - k * 0.03);
        if (k === 0) g.put(px - 1, y, ">", 1, true);
      }
    },
  };
}


// ---- ImpactOS: a report assembling itself, then signed off --------------------------------------

function report(cols: number, rows: number): Sim {
  const names = ["scope 1", "scope 2", "scope 3", "energy", "water", "waste", "social", "governance"];
  const lines = Math.max(3, Math.min(names.length, rows - 8));
  // With rows to spare (the large stage) the lines spread out and each bar is two characters thick.
  const step = clamp(Math.floor((rows - 9) / lines), 1, 3);
  const thick = step >= 3 ? 2 : 1;
  const y0 = step > 1 ? 4 : 3;
  const barX = 14;
  const barW = Math.max(6, cols - barX - 8);
  let vals = names.map(() => rand(0.15, 0.95));
  let t = 0;
  const TYPE = 0.22; // seconds per line typed
  const GROW = 1.2;
  const HOLD = 2.6;
  const cycle = () => lines * TYPE + GROW + HOLD + 0.5;
  return {
    step(dt) {
      t += dt;
      if (t > cycle()) {
        t = 0;
        vals = names.map(() => rand(0.15, 0.95));
      }
    },
    draw(g) {
      const fade = 1 - clamp((t - (cycle() - 0.5)) / 0.5);
      g.put(2, 1, "REPORT", 0.5);
      if (cols > 30) g.put(9, 1, "FY25, mapped to CSRD", 0.24);
      for (let x = 2; x < cols - 2; x++) g.put(x, 2, "-", 0.12);
      const grow = ease((t - lines * TYPE) / GROW);
      for (let k = 0; k < lines; k++) {
        const y = y0 + k * step;
        const shown = clamp((t - k * TYPE) / TYPE);
        if (shown <= 0) break;
        const label = names[k].slice(0, Math.ceil(names[k].length * shown));
        g.put(2, y, label, 0.45 * fade);
        const n = Math.round(barW * vals[k] * grow);
        for (let r = 0; r < thick; r++) for (let x = 0; x < barW; x++) g.put(barX + x, y + r, x < n ? "#" : ".", (x < n ? 0.7 : 0.12) * fade);
        if (grow > 0) g.put(barX + barW + 2, y, `${Math.round(vals[k] * 100 * grow)}%`.padStart(4), 0.5 * fade);
      }
      const yb = y0 + (lines - 1) * step + thick + (step > 1 ? 1 : 0);
      for (let x = 2; x < cols - 2; x++) g.put(x, yb, "-", 0.12);
      if (rows > yb + 2) g.put(2, yb + 1, "UN SDG  UK SVM  CSRD", 0.3 * fade);
      const done = t > lines * TYPE + GROW;
      if (done && rows > yb + 3) {
        const stamp = "[ AUDIT READY ]";
        const on = t < lines * TYPE + GROW + 0.6 ? Math.floor(t * 8) % 2 === 0 : true;
        if (on) g.put(cols - 2 - stamp.length, rows - 2, stamp, 0.95 * fade, true);
      }
    },
  };
}

// ---- Access Technologies: a padel rally on a court booked through the app ----------------------

function court(cols: number, rows: number): Sim {
  const x0 = 2;
  const x1 = cols - 3;
  const y0 = 3;
  const y1 = rows - 2;
  const net = Math.round((x0 + x1) / 2);
  const p = [
    { x: x0 + 3, y: (y0 + y1) / 2 },
    { x: x1 - 3, y: (y0 + y1) / 2 },
  ];
  const ball = { x: net, y: (y0 + y1) / 2, vx: (x1 - x0) * 0.55, vy: rand(-6, 6) };
  const trail: [number, number][] = [];
  let rally = 0;
  let every = 0;
  return {
    step(dt) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y < y0 + 1) (ball.y = y0 + 1), (ball.vy = Math.abs(ball.vy));
      if (ball.y > y1 - 1) (ball.y = y1 - 1), (ball.vy = -Math.abs(ball.vy));
      const side = ball.vx < 0 ? 0 : 1;
      const pl = p[side];
      if ((side === 0 && ball.x <= pl.x + 1) || (side === 1 && ball.x >= pl.x - 1)) {
        ball.vx = -ball.vx;
        ball.vy = rand(-1, 1) * (y1 - y0) * 0.9;
        rally++;
      }
      // Each player moves toward where the ball is heading; the other drifts back to centre.
      p.forEach((q, k) => {
        const target = k === side ? ball.y : (y0 + y1) / 2;
        q.y += clamp(target - q.y, -1, 1) * dt * 9;
      });
      every += dt;
      if (every > 1 / 30) {
        every = 0;
        trail.unshift([Math.round(ball.x), Math.round(ball.y)]);
        if (trail.length > 6) trail.pop();
      }
    },
    draw(g) {
      g.put(2, 1, "COURT 2", 0.5);
      if (cols > 30) g.put(10, 1, "19:00, booked", 0.24);
      const r = `rally ${rally}`;
      g.put(cols - 2 - r.length, 1, r, 0.5);
      for (let x = x0; x <= x1; x++) {
        g.put(x, y0, "-", 0.3);
        g.put(x, y1, "-", 0.3);
      }
      for (let y = y0; y <= y1; y++) {
        g.put(x0, y, "|", 0.3);
        g.put(x1, y, "|", 0.3);
        g.put(net, y, ":", 0.45);
        g.put(Math.round((x0 + net) / 2), y, ".", 0.1);
        g.put(Math.round((net + x1) / 2), y, ".", 0.1);
      }
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) g.put(x, y, "+", 0.4);
      trail.forEach(([x, y], k) => g.put(x, y, k < 2 ? "o" : ".", 0.5 - k * 0.07));
      for (const q of p) {
        g.put(q.x, q.y - 1, "o", 0.6);
        g.put(q.x, q.y, "@", 0.9);
      }
      g.put(ball.x, ball.y, "o", 1, true);
    },
  };
}

// ---- Aston Martin F1: a car lapping a circuit against the clock ---------------------------------

function track(cols: number, rows: number): Sim {
  const cx = cols / 2;
  const cy = rows / 2 + 1;
  const rx = cols * 0.4;
  const ry = (rows - 6) * 0.45;
  const N = 480;
  const path: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    const th = (k / N) * Math.PI * 2;
    // An oval with a few bends in it, so it reads as a circuit rather than a ring.
    const x = cx + rx * (Math.cos(th) + 0.18 * Math.cos(3 * th) - 0.08 * Math.sin(2 * th));
    const y = cy + ry * (Math.sin(th) + 0.22 * Math.sin(2 * th) * Math.cos(th));
    path.push([x, y]);
  }
  const bend = path.map((_, k) => {
    const a = path[(k + N - 6) % N];
    const b = path[k];
    const c = path[(k + 6) % N];
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = Math.abs(t2 - t1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d;
  });
  let s = 0;
  let lap = 23;
  let lapT = 0;
  let best = 87.2;
  const trail: number[] = [];
  let every = 0;
  return {
    step(dt) {
      const k = Math.floor(s) % N;
      // Slower through the bends, flat out on the straights.
      s += dt * 150 * (1 - Math.min(0.6, bend[k] * 2.2));
      lapT += dt * 18;
      if (s >= N) {
        s -= N;
        lap++;
        best = Math.min(best, lapT);
        lapT = 0;
      }
      every += dt;
      if (every > 1 / 24) {
        every = 0;
        trail.unshift(Math.floor(s) % N);
        if (trail.length > 9) trail.pop();
      }
    },
    draw(g) {
      const fmt = (v: number) => `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, "0")}`;
      g.put(2, 1, `LAP ${lap}`, 0.5);
      g.put(10, 1, fmt(lapT), 0.7);
      const b = `best ${fmt(best)}`;
      if (cols > 34) g.put(cols - 2 - b.length, 1, b, 0.3);
      for (let k = 0; k < N; k += 3) g.put(path[k][0], path[k][1], bend[k] > 0.25 ? ":" : ".", bend[k] > 0.25 ? 0.35 : 0.2);
      trail.forEach((k, n) => g.put(path[k][0], path[k][1], n < 3 ? "=" : "-", 0.6 - n * 0.06));
      const k = Math.floor(s) % N;
      g.put(path[k][0], path[k][1], "@", 1, true);
      g.put(path[0][0], path[0][1] - 1, "#", 0.4);
    },
  };
}

// ---- Fiera Real Estate: the London skyline, lights on, with the fund line above it ---------------

function skyline(cols: number, rows: number): Sim {
  const base = rows - 2;
  type B = { x: number; w: number; h: number; shard: boolean };
  const bs: B[] = [];
  let x = 1;
  while (x < cols - 3) {
    const w = 3 + Math.floor(Math.random() * 5);
    const shard = !bs.some((b) => b.shard) && x > cols * 0.55;
    const h = shard ? Math.floor((rows - 6) * 0.95) : Math.floor((rows - 7) * rand(0.25, 0.7));
    bs.push({ x, w: shard ? 7 : w, h, shard });
    x += (shard ? 7 : w) + (Math.random() < 0.3 ? 1 : 0);
  }
  const lit = new Map<string, number>();
  const nav: number[] = [];
  let v = 0.4;
  for (let k = 0; k < cols; k++) nav.push((v = clamp(v + rand(-0.06, 0.08), 0.1, 0.95)));
  let t = 0;
  let nextShift = 0;
  return {
    step(dt) {
      t += dt;
      nextShift -= dt;
      if (nextShift <= 0) {
        nextShift = 0.25;
        nav.shift();
        v = clamp(v + rand(-0.07, 0.08), 0.1, 0.95);
        nav.push(v);
      }
      if (Math.random() < dt * 14) {
        const b = bs[(Math.random() * bs.length) | 0];
        const key = `${b.x + 1 + ((Math.random() * (b.w - 2)) | 0)},${base - 1 - ((Math.random() * (b.h - 2)) | 0)}`;
        lit.set(key, lit.get(key) ? 0 : 1);
      }
    },
    draw(g) {
      g.put(2, 1, "FUND", 0.5);
      const pct = `NAV +${((nav[nav.length - 1] - nav[0]) * 10 + 4).toFixed(1)}%`;
      g.put(8, 1, pct, 0.3);
      const top = 2;
      const span = Math.max(2, Math.floor(rows * 0.22));
      nav.forEach((n, k) => g.put(k, top + Math.round((1 - n) * span), k === nav.length - 1 ? "*" : ".", k === nav.length - 1 ? 0.9 : 0.35, k === nav.length - 1));
      for (const b of bs) {
        const y0 = base - b.h;
        if (b.shard) {
          for (let y = y0; y <= base; y++) {
            const half = Math.round(((y - y0) / b.h) * (b.w / 2));
            g.put(b.x + 3 - half, y, "/", 0.5);
            g.put(b.x + 3 + half, y, "\\", 0.5);
            for (let c = b.x + 4 - half; c < b.x + 3 + half; c += 2) g.put(c, y, lit.get(`${c},${y}`) ? ":" : ".", lit.get(`${c},${y}`) ? 0.7 : 0.12);
          }
          continue;
        }
        for (let c = b.x; c < b.x + b.w; c++) g.put(c, y0, "_", 0.45);
        for (let y = y0 + 1; y <= base; y++) {
          g.put(b.x, y, "|", 0.35);
          g.put(b.x + b.w - 1, y, "|", 0.35);
          for (let c = b.x + 1; c < b.x + b.w - 1; c++) {
            const on = lit.get(`${c},${y}`);
            if ((c + y) % 2 === 0) g.put(c, y, on ? ":" : ".", on ? 0.75 : 0.12);
          }
        }
      }
      for (let c = 0; c < cols; c++) g.put(c, base + 1, "=", 0.25);
    },
  };
}

// ---- Create Group: a feed scrolling on a phone, the numbers going up ----------------------------

function feed(cols: number, rows: number): Sim {
  const pw = Math.min(26, Math.max(16, Math.floor(cols * 0.46)));
  // Wide screens centre the phone and its reach bar together; narrow ones centre the phone alone.
  const px = cols > 40 ? Math.max(3, Math.floor((cols - pw - 10) / 2)) : Math.floor((cols - pw) / 2);
  const py = 2;
  const ph = rows - 3;
  const POST = 7;
  type P = { tex: string[]; likes: number; who: string };
  const handles = ["@brand", "@studio", "@dxb.eats", "@launch", "@drop"];
  const make = (): P => ({
    who: handles[(Math.random() * handles.length) | 0],
    likes: Math.floor(rand(200, 4000)),
    tex: Array.from({ length: 3 }, () => Array.from({ length: pw - 4 }, () => pick(" .:+x#%")).join("")),
  });
  const posts: P[] = Array.from({ length: 8 }, make);
  let off = 0;
  let reach = 0;
  return {
    step(dt) {
      off += dt * 2.2;
      if (off >= POST) {
        off -= POST;
        posts.shift();
        posts.push(make());
      }
      for (const p of posts) if (Math.random() < dt * 3) p.likes += Math.ceil(Math.random() * 12);
      reach = clamp(reach + dt * 0.04);
      if (reach >= 1) reach = 0;
    },
    draw(g) {
      g.put(2, 0, "FEED", 0.5);
      for (let x = px; x < px + pw; x++) {
        g.put(x, py, "-", 0.35);
        g.put(x, py + ph, "-", 0.35);
      }
      for (let y = py; y <= py + ph; y++) {
        g.put(px, y, "|", 0.35);
        g.put(px + pw - 1, y, "|", 0.35);
      }
      g.put(px, py, ".", 0.4);
      g.put(px + pw - 1, py, ".", 0.4);
      g.put(px, py + ph, "'", 0.4);
      g.put(px + pw - 1, py + ph, "'", 0.4);
      const top = py + 1;
      const bottom = py + ph - 1;
      posts.forEach((p, k) => {
        const y = top + k * POST - Math.floor(off);
        const inside = (yy: number) => yy >= top && yy <= bottom;
        if (inside(y)) g.put(px + 2, y, p.who, 0.55);
        p.tex.forEach((row, n) => inside(y + 1 + n) && g.put(px + 2, y + 1 + n, row, 0.3));
        const likes = p.likes >= 1000 ? `${(p.likes / 1000).toFixed(1)}k` : `${p.likes}`;
        if (inside(y + 4)) g.put(px + 2, y + 4, `<3 ${likes}`, 0.7, k === 1);
      });
      if (cols > 40) {
        const rx = px + pw + 4;
        g.put(rx, 3, "REACH", 0.5);
        const h = rows - 8;
        const n = Math.round(h * (0.3 + 0.7 * reach));
        for (let k = 0; k < h; k++) g.put(rx + 1, rows - 3 - k, k < n ? "#" : ".", k < n ? 0.6 : 0.12);
        g.put(rx, rows - 2, `+${Math.round(12 * (0.3 + 0.7 * reach))}%`, 0.6);
      }
    },
  };
}

// ---- Birmingham: a small network, a forward pass every couple of seconds ------------------------

function network(cols: number, rows: number): Sim {
  const layers = [3, 5, 5, 3].map((n) => Math.min(n, Math.max(2, rows - 6)));
  const xs = layers.map((_, l) => Math.round(4 + (l / (layers.length - 1)) * (cols - 14)));
  const nodes = layers.map((n, l) => Array.from({ length: n }, (_, k) => [xs[l], Math.round(3 + ((k + 0.5) / n) * (rows - 5))] as [number, number]));
  const edges: { a: [number, number]; b: [number, number]; l: number; w: number }[] = [];
  for (let l = 0; l < layers.length - 1; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) edges.push({ a, b, l, w: Math.random() });
  let t = 0;
  let outs = nodes[nodes.length - 1].map(() => Math.random());
  const HOP = 0.4;
  return {
    step(dt) {
      t += dt;
      if (t > layers.length * HOP + 1.4) {
        t = 0;
        for (const e of edges) e.w = Math.random();
        const o = nodes[nodes.length - 1].map(() => Math.random());
        const sum = o.reduce((a, b) => a + b, 0);
        outs = o.map((v) => v / sum);
      }
    },
    draw(g) {
      g.put(2, 1, "NETWORK", 0.5);
      if (cols > 30) g.put(10, 1, "forward pass", 0.24);
      for (const e of edges) {
        const steps = Math.max(Math.abs(e.b[0] - e.a[0]), Math.abs(e.b[1] - e.a[1]));
        for (let k = 1; k < steps; k += 2) {
          const f = k / steps;
          g.put(e.a[0] + (e.b[0] - e.a[0]) * f, e.a[1] + (e.b[1] - e.a[1]) * f, ".", 0.07, false, true);
        }
        // The strong weights carry a pulse across while their layer is firing.
        const f = (t - e.l * HOP) / HOP;
        if (e.w > 0.55 && f > 0 && f < 1) g.put(e.a[0] + (e.b[0] - e.a[0]) * f, e.a[1] + (e.b[1] - e.a[1]) * f, "*", 0.9);
      }
      nodes.forEach((ns, l) =>
        ns.forEach(([x, y]) => {
          const on = t > l * HOP && t < l * HOP + HOP * 1.6;
          g.put(x, y, on ? "O" : "o", on ? 1 : 0.4, on && l === 0);
        }),
      );
      nodes[nodes.length - 1].forEach(([x, y], k) => {
        const shown = t > (layers.length - 1) * HOP;
        g.put(x + 2, y, shown ? outs[k].toFixed(2) : "----", shown ? (outs[k] === Math.max(...outs) ? 0.9 : 0.4) : 0.15);
      });
    },
  };
}

// ---- Cheltenham: two sources on a ripple tank, the interference between them -------------------

function waves(cols: number, rows: number): Sim {
  const RAMP = " .:-=+*#%@";
  const s1: [number, number] = [cols * 0.32, rows * 0.55];
  const s2: [number, number] = [cols * 0.68, rows * 0.55];
  let t = 0;
  return {
    step(dt) {
      t += dt;
    },
    draw(g) {
      for (let r = 2; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d1 = Math.hypot((c - s1[0]) * ASPECT, r - s1[1]);
          const d2 = Math.hypot((c - s2[0]) * ASPECT, r - s2[1]);
          const v = (Math.sin(d1 * 1.25 - t * 3) / (1 + d1 * 0.08) + Math.sin(d2 * 1.25 - t * 3) / (1 + d2 * 0.08) + 2) / 4;
          // Only the crests are drawn, so the pattern reads as lines on a dark tank.
          if (v < 0.6) continue;
          const k = Math.round(((v - 0.6) / 0.4) * (RAMP.length - 1));
          if (k > 0) g.put(c, r, RAMP[k], 0.15 + 0.75 * (v - 0.6) / 0.4);
        }
      }
      g.put(s1[0], s1[1], "*", 1, true);
      g.put(s2[0], s2[1], "*", 1, true);
      g.put(2, 0, "WAVES", 0.5);
      if (cols > 30) g.put(8, 0, "two sources, one pattern", 0.24);
    },
  };
}

// ---- Jumeirah: Dubai at dusk, the Burj against a low sun, heat on the horizon -------------------

function dubai(cols: number, rows: number): Sim {
  const RAMP = " .:-=+*#%@";
  const hz = Math.round(rows * 0.72);
  const sr = rows * 0.15;
  const sun: [number, number] = [cols * 0.72, hz - rows * 0.3];
  const burj = Math.round(cols * 0.36);
  const towers: [number, number, number][] = [];
  for (let x = 2; x < cols - 2; ) {
    const w = 2 + Math.floor(Math.random() * 3);
    // Low towers, kept clear of the Burj and short under the sun so it sits above the skyline.
    const underSun = Math.abs(x - sun[0]) < sr / ASPECT;
    if (Math.abs(x - burj) > 4) towers.push([x, w, Math.floor(rand(0.1, underSun ? 0.18 : 0.34) * hz)]);
    x += w + 1 + Math.floor(Math.random() * 2);
  }
  let t = 0;
  return {
    step(dt) {
      t += dt;
    },
    draw(g) {
      g.put(2, 0, "DUBAI", 0.5);
      // The sun, a soft disc low in the sky.
      for (let r = 1; r < hz; r++) {
        for (let c = 0; c < cols; c++) {
          const d = Math.hypot((c - sun[0]) * ASPECT, r - sun[1]) / sr;
          if (d < 1.9) {
            const v = d < 1 ? 0.55 : 0.55 * (1 - (d - 1) / 0.9);
            g.put(c, r, RAMP[Math.round(v * (RAMP.length - 1))], 0.15 + v * 0.5);
          }
        }
      }
      // Towers, with the heat moving the rows just above the horizon a cell at a time.
      const shimmer = (r: number) => (hz - r < 3 ? Math.round(Math.sin(t * 5 + r * 1.7) * 0.8) : 0);
      for (const [x, w, h] of towers) {
        for (let r = hz - h; r < hz; r++) {
          const sx = x + shimmer(r);
          g.put(sx, r, "|", 0.4);
          g.put(sx + w, r, "|", 0.4);
          // Windows every other cell; the rest is blank, so a tower hides the sun behind it.
          for (let c = sx + 1; c < sx + w; c++) g.put(c, r, (c + r) % 2 ? ":" : " ", 0.3);
        }
        for (let c = x; c <= x + w; c++) g.put(c, hz - h - 1, "_", 0.4);
      }
      // The Burj Khalifa: setbacks narrowing up to a spire.
      const bh = hz - 2;
      for (let k = 0; k < bh; k++) {
        const r = hz - 1 - k;
        const half = Math.max(0, Math.round(3 * (1 - k / bh) ** 1.3));
        const sx = burj + shimmer(r);
        if (half === 0) g.put(sx, r, "|", 0.7);
        else {
          g.put(sx - half, r, "/", 0.6);
          g.put(sx + half, r, "\\", 0.6);
          for (let c = sx - half + 1; c < sx + half; c++) g.put(c, r, ":", 0.35);
        }
      }
      // The sea, with the sun's reflection breaking up in it.
      for (let r = hz; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wob = Math.sin(c * 0.5 + t * 2 + r) * 0.5 + 0.5;
          const refl = Math.abs(c - sun[0] + Math.sin(t * 3 + r) * 1.5) < sr * 0.9;
          if (refl && wob > 0.3) g.put(c, r, "=", 0.6 * (1 - (r - hz) / (rows - hz + 1)));
          else if (wob > 0.75) g.put(c, r, "~", 0.18);
        }
      }
      for (let c = 0; c < cols; c++) g.put(c, hz, "-", 0.35);
    },
  };
}

export const SCENES = {
  symphony,
  ingest,
  cortex,
  scout,
  report,
  court,
  track,
  skyline,
  feed,
  network,
  waves,
  dubai,
} satisfies Record<string, (cols: number, rows: number) => Sim>;

export type SceneKind = keyof typeof SCENES;
export { Grid };
