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
  // With rows to spare (the large stage) the lines spread out and the bars thicken.
  const step = clamp(Math.floor((rows - 9) / lines), 1, 5);
  const thick = step >= 5 ? 3 : step >= 3 ? 2 : 1;
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

// Padel is doubles: two players a side, one up at the net and one back. On a large screen each is
// a small figure; on a small one, a head over a body.
function court(cols: number, rows: number): Sim {
  const x0 = 2;
  const x1 = cols - 3;
  const y0 = 3;
  const y1 = rows - 2;
  const net = Math.round((x0 + x1) / 2);
  const mid = (y0 + y1) / 2;
  const half = net - x0;
  // Service lines sit 6.95 m from the net on a 10 m half.
  const sl = Math.round(net - half * 0.695);
  const sr = Math.round(net + half * 0.695);
  const big = rows >= 24;
  const players = [
    { x: x0 + Math.round(half * 0.18), y: mid - (y1 - y0) * 0.22, side: 0 },
    { x: net - Math.round(half * 0.35), y: mid + (y1 - y0) * 0.22, side: 0 },
    { x: x1 - Math.round(half * 0.18), y: mid + (y1 - y0) * 0.22, side: 1 },
    { x: net + Math.round(half * 0.35), y: mid - (y1 - y0) * 0.22, side: 1 },
  ];
  const home = players.map((q) => q.y);
  const ball = { x: net, y: mid, vx: (x1 - x0) * 0.5, vy: rand(-6, 6) };
  const trail: [number, number][] = [];
  let rally = 0;
  let every = 0;
  let hitter = 0;
  return {
    step(dt) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y < y0 + 1) (ball.y = y0 + 1), (ball.vy = Math.abs(ball.vy));
      if (ball.y > y1 - 1) (ball.y = y1 - 1), (ball.vy = -Math.abs(ball.vy));
      const side = ball.vx < 0 ? 0 : 1;
      // The player on the ball's side nearest its line takes it.
      const mine = players.filter((q) => q.side === side);
      const who = mine.reduce((p, q) => (Math.abs(q.y - ball.y) < Math.abs(p.y - ball.y) ? q : p));
      if ((side === 0 && ball.x <= who.x + 1) || (side === 1 && ball.x >= who.x - 1)) {
        ball.vx = -ball.vx * rand(0.9, 1.1);
        ball.vx = Math.sign(ball.vx) * clamp(Math.abs(ball.vx), (x1 - x0) * 0.4, (x1 - x0) * 0.62);
        ball.vy = rand(-1, 1) * (y1 - y0) * 0.8;
        hitter = players.indexOf(who);
        rally++;
      }
      players.forEach((q, k) => {
        const chasing = q.side === side && q === who;
        const target = chasing ? ball.y : home[k];
        q.y += clamp(target - q.y, -1, 1) * dt * (chasing ? 10 : 4);
      });
      every += dt;
      if (every > 1 / 30) {
        every = 0;
        trail.unshift([Math.round(ball.x), Math.round(ball.y)]);
        if (trail.length > 7) trail.pop();
      }
    },
    draw(g) {
      g.put(2, 1, "COURT 2", 0.5);
      if (cols > 30) g.put(10, 1, "19:00, booked, doubles", 0.24);
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
        g.put(sl, y, "|", 0.14);
        g.put(sr, y, "|", 0.14);
      }
      // The centre service line runs from each service line to the net.
      for (let x = sl; x <= sr; x++) if (x !== net) g.put(x, Math.round(mid), "-", 0.12);
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) g.put(x, y, "+", 0.4);
      trail.forEach(([x, y], k) => g.put(x, y, k < 2 ? "o" : ".", 0.5 - k * 0.06));
      players.forEach((q, k) => {
        const on = k === hitter;
        const y = Math.round(q.y);
        if (big) {
          g.put(q.x, y - 1, "o", on ? 0.9 : 0.6);
          g.put(q.x - 1, y, "/|\\", on ? 0.9 : 0.6);
          g.put(q.x - 1, y + 1, "/ \\", on ? 0.7 : 0.45);
        } else {
          g.put(q.x, y - 1, "o", 0.6);
          g.put(q.x, y, "@", 0.9);
        }
      });
      g.put(ball.x, ball.y, "o", 1, true);
    },
  };
}

// ---- Aston Martin F1: a lap of Silverstone, next door to the team's factory ----------------------

// The Grand Prix circuit, every 40 m round the lap, clockwise from the old pit straight: x east and
// y south, in km. From bacinger/f1-circuits (MIT licence).
const SILVERSTONE = [
  0.611,0.015,0.651,0.012,0.691,0.008,0.731,0.005,0.771,0.002,0.81,0.0,0.849,0.007,0.881,0.03,
  0.903,0.064,0.915,0.101,0.925,0.14,0.935,0.179,0.945,0.218,0.951,0.257,0.955,0.297,0.958,0.337,
  0.96,0.377,0.962,0.417,0.963,0.457,0.965,0.497,0.976,0.535,0.994,0.57,1.01,0.607,1.004,0.646,
  0.99,0.683,0.976,0.721,0.972,0.76,0.985,0.798,1.008,0.83,1.027,0.866,1.024,0.905,1.0,0.936,
  0.967,0.958,0.932,0.979,0.901,1.004,0.881,1.038,0.862,1.073,0.843,1.109,0.824,1.144,0.804,1.179,
  0.785,1.214,0.766,1.249,0.747,1.284,0.728,1.319,0.708,1.354,0.689,1.389,0.67,1.424,0.651,1.459,
  0.632,1.495,0.612,1.53,0.591,1.563,0.569,1.597,0.547,1.63,0.524,1.663,0.496,1.691,0.459,1.704,
  0.419,1.698,0.385,1.677,0.365,1.643,0.348,1.607,0.328,1.572,0.304,1.54,0.279,1.509,0.251,1.48,
  0.224,1.451,0.198,1.42,0.172,1.39,0.141,1.369,0.11,1.393,0.074,1.401,0.045,1.374,0.022,1.341,
  0.007,1.304,0.0,1.265,0.018,1.23,0.042,1.197,0.066,1.166,0.091,1.134,0.115,1.102,0.139,1.071,
  0.164,1.039,0.188,1.007,0.213,0.976,0.237,0.944,0.262,0.913,0.286,0.881,0.314,0.852,0.351,0.84,
  0.391,0.841,0.43,0.847,0.47,0.853,0.51,0.855,0.549,0.847,0.584,0.828,0.615,0.803,0.647,0.779,
  0.678,0.754,0.709,0.729,0.743,0.709,0.774,0.728,0.785,0.766,0.796,0.805,0.823,0.831,0.852,0.808,
  0.866,0.77,0.877,0.732,0.883,0.692,0.879,0.653,0.852,0.624,0.823,0.597,0.793,0.57,0.763,0.543,
  0.734,0.516,0.704,0.489,0.675,0.462,0.645,0.436,0.615,0.409,0.586,0.382,0.556,0.355,0.526,0.328,
  0.497,0.301,0.467,0.274,0.437,0.247,0.408,0.221,0.374,0.2,0.335,0.198,0.3,0.216,0.29,0.254,
  0.285,0.294,0.273,0.331,0.238,0.348,0.201,0.337,0.179,0.305,0.186,0.266,0.204,0.23,0.222,0.195,
  0.24,0.159,0.261,0.125,0.288,0.096,0.319,0.07,0.353,0.05,0.391,0.037,0.431,0.032,0.47,0.028,
  0.51,0.025,0.55,0.021
];
const TURNS: [number, string][] = [
  [22, "Copse"],
  [29, "Becketts"],
  [54, "Stowe"],
  [72, "Club"],
  [86, "Abbey"],
  [102, "The Loop"],
  [129, "Luffield"],
];
const START = 80; // the start line, on the Hamilton Straight

function silverstone(cols: number, rows: number): Sim {
  const raw: [number, number][] = [];
  for (let k = 0; k < SILVERSTONE.length; k += 2) raw.push([SILVERSTONE[k], SILVERSTONE[k + 1]]);
  const kmW = Math.max(...raw.map((q) => q[0]));
  const kmH = Math.max(...raw.map((q) => q[1]));
  const top = 3;
  const foot = rows >= 18 ? 2 : 0;
  const availW = (cols - 6) * ASPECT; // in row heights
  const availH = rows - top - 1 - foot;
  // Lie the circuit on its side when the screen is wider than it is tall.
  const turn = availW / availH > 1.15;
  const pts = raw.map(([x, y]) => (turn ? [y, kmW - x] : [x, y]) as [number, number]);
  const w = turn ? kmH : kmW;
  const h = turn ? kmW : kmH;
  const sc = Math.min(availW / w, availH / h); // row heights per km
  const x0 = (cols - (w * sc) / ASPECT) / 2;
  const y0 = top + (availH - h * sc) / 2;
  const n = pts.length;
  const at = (k: number): [number, number] => {
    const i = ((Math.floor(k) % n) + n) % n;
    const f = k - Math.floor(k);
    const a = pts[i];
    const b = pts[(i + 1) % n];
    return [x0 + ((a[0] + (b[0] - a[0]) * f) * sc) / ASPECT, y0 + (a[1] + (b[1] - a[1]) * f) * sc];
  };
  // How sharply the track turns at each point, from which the car's speed follows.
  const bend = pts.map((_, k) => {
    const [ax, ay] = at(k - 2);
    const [bx, by] = at(k);
    const [cx, cy] = at(k + 2);
    let d = Math.abs(Math.atan2((cy - by), (cx - bx) * ASPECT) - Math.atan2((by - ay), (bx - ax) * ASPECT));
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d;
  });
  // The track as a thin line, one cell per step, each cell drawn with the stroke that matches
  // the way the line runs through it.
  const path: [number, number][] = [];
  for (let k = 0; k < n; k += 0.05) {
    const [x, y] = at(k);
    const q: [number, number] = [Math.round(x), Math.round(y)];
    const last = path[path.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) path.push(q);
  }
  // Drop a cell where its neighbours already touch each other, so corners are not doubled.
  for (let k = path.length - 2; k > 0; k--) {
    const [a, b] = [path[k - 1], path[k + 1]];
    if (Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1) path.splice(k, 1);
  }
  const cells = new Map<string, string>();
  path.forEach(([x, y], k) => {
    const a = path[(k - 1 + path.length) % path.length];
    const b = path[(k + 1) % path.length];
    const dx = (b[0] - a[0]) * ASPECT;
    const dy = b[1] - a[1];
    const deg = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
    const stroke = deg < 24 ? "-" : deg > 66 ? "|" : dx * dy > 0 ? "\\" : "/";
    cells.set(`${x},${y}`, stroke);
  });
  // Corner names sit just outside the track, on whichever side is clear.
  const [cx0, cy0] = pts.reduce(([sx, sy], [x, y]) => [sx + x / n, sy + y / n], [0, 0]);
  const taken = new Set<string>(); // cells already used by a placed name, with a gap round it
  const labels = TURNS.map(([k, name]) => {
    const [x, y] = at(k);
    const [mx, my] = [x0 + (cx0 * sc) / ASPECT, y0 + cy0 * sc];
    const len = Math.hypot((x - mx) * ASPECT, y - my) || 1;
    const ux = ((x - mx) * ASPECT) / len;
    const uy = (y - my) / len;
    // Try outside first, then further out, then inside, then straight left or right.
    const tries: [number, number][] = [[ux, uy], [ux * 1.6, uy * 1.6], [-ux, -uy], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [vx, vy] of tries) {
      const lx = Math.round(x + (vx * 2) / ASPECT - (vx < -0.3 ? name.length - 1 : vx > 0.3 ? 0 : name.length / 2));
      const ly = Math.round(y + vy * 1.5);
      let clear = lx >= 1 && lx + name.length < cols && ly > top && ly < rows - foot;
      for (let q = -1; clear && q <= name.length; q++) if (cells.has(`${lx + q},${ly}`) || taken.has(`${lx + q},${ly}`)) clear = false;
      if (clear) {
        for (let q = -1; q <= name.length; q++) for (const dy of [-1, 0, 1]) taken.add(`${lx + q},${ly + dy}`);
        return { x: lx, y: ly, name };
      }
    }
    return null;
  });
  let s = 0;
  let lap = 24;
  let lapT = 0;
  let best = 86.9;
  let kph = 0;
  const trail: number[] = [];
  let every = 0;
  const LAP = 12; // seconds a lap takes on screen; the clock shows it as a race lap
  const shown = (v: number) => (v * 87.4) / LAP;
  return {
    step(dt) {
      const k = Math.floor(s) % n;
      const v = 1 - Math.min(0.72, bend[k] * 1.9);
      s += dt * v * n * 0.135;
      lapT += dt;
      kph += (95 + 225 * v - kph) * Math.min(1, dt * 3);
      if (s >= n) {
        s -= n;
        lap++;
        best = Math.min(best, shown(lapT));
        lapT = 0;
      }
      every += dt;
      if (every > 1 / 24) {
        every = 0;
        trail.unshift(s);
        if (trail.length > 10) trail.pop();
      }
    },
    draw(g) {
      const fmt = (v: number) => `${Math.floor(v / 60)}:${(v % 60).toFixed(1).padStart(4, "0")}`;
      g.put(2, 1, "SILVERSTONE", 0.5);
      if (cols > 40) g.put(14, 1, "5.891 km", 0.24);
      const clock = `LAP ${lap}  ${fmt(shown(lapT))}`;
      g.put(cols - 2 - clock.length, 1, clock, 0.6);
      for (const [key, stroke] of cells) {
        const [x, y] = key.split(",").map(Number);
        g.put(x, y, stroke, 0.26);
      }
      for (const l of labels) if (l) g.put(l.x, l.y, l.name, 0.3);
      const [sx, sy] = at(START);
      g.put(sx, sy, "#", 0.75);
      trail.forEach((k, m) => {
        const [x, y] = at(k);
        g.put(x, y, m < 3 ? "=" : "-", 0.62 - m * 0.05);
      });
      const [x, y] = at(s);
      g.put(x, y, "@", 1, true);
      if (foot) {
        g.put(2, rows - 2, `${Math.round(kph)} km/h`.padStart(9), 0.55);
        const b = `best ${fmt(best)}`;
        g.put(cols - 2 - b.length, rows - 2, b, 0.3);
      }
    },
  };
}

// ---- Fiera Real Estate: the fund's London assets on the river, one inspected at a time ----------

// The Thames from Battersea to Blackwall, as longitude and latitude.
const THAMES: [number, number][] = [
  [-0.17, 51.4818], [-0.16, 51.4835], [-0.15, 51.4848], [-0.14, 51.4855], [-0.1275, 51.488], [-0.1235, 51.4945],
  [-0.1218, 51.5008], [-0.1203, 51.5063], [-0.1167, 51.5087], [-0.1043, 51.5097], [-0.0877, 51.5079],
  [-0.0754, 51.5055], [-0.06, 51.504], [-0.047, 51.506], [-0.033, 51.508], [-0.027, 51.503], [-0.025, 51.495],
  [-0.02, 51.487], [-0.01, 51.4845], [-0.003, 51.4865], [0.003, 51.493], [0.006, 51.501], [0.01, 51.506],
];
// Illustrative holdings, named by postcode district: where they sit, what they are, value (£m), yield (%).
const ASSETS: { name: string; lon: number; lat: number; sector: string; value: number; yld: number }[] = [
  { name: "EC2", lon: -0.088, lat: 51.518, sector: "office", value: 84.2, yld: 5.1 },
  { name: "SE1", lon: -0.092, lat: 51.501, sector: "life sci", value: 61.0, yld: 4.6 },
  { name: "W1", lon: -0.145, lat: 51.514, sector: "retail", value: 45.3, yld: 5.4 },
  { name: "E14", lon: -0.02, lat: 51.505, sector: "office", value: 72.8, yld: 5.9 },
  { name: "N1", lon: -0.124, lat: 51.533, sector: "office", value: 58.6, yld: 4.8 },
  { name: "SW1", lon: -0.143, lat: 51.496, sector: "resi", value: 39.1, yld: 4.2 },
  { name: "SE10", lon: 0.0, lat: 51.479, sector: "industrial", value: 27.4, yld: 6.1 },
];

function fund(cols: number, rows: number): Sim {
  const lon0 = -0.175;
  const lon1 = 0.012;
  const lat0 = 51.474;
  const lat1 = 51.538;
  const kmW = (lon1 - lon0) * 69.4;
  const kmH = (lat1 - lat0) * 111.2;
  const tableRows = rows >= 26 ? ASSETS.length : 0;
  const top = rows >= 22 ? 5 : 3;
  const mapRows = Math.min(rows - top - 1 - (tableRows ? tableRows + 3 : 0), ((cols - 4) * ASPECT * kmH) / kmW);
  const sc = mapRows / kmH; // rows per km
  const mapW = (kmW * sc) / ASPECT;
  const mx = (cols - mapW) / 2;
  // The map and the table sit together, centred in the space under the header.
  const block = mapRows + (tableRows ? tableRows + 3 : 0);
  const my = top + Math.max(0, Math.floor((rows - 1 - top - block) / 2));
  const project = (lon: number, lat: number): [number, number] => [mx + ((lon - lon0) * 69.4 * sc) / ASPECT, my + (lat1 - lat) * 111.2 * sc];
  // The river, sampled finely so every cell along it is drawn.
  const river: [number, number][] = [];
  for (let k = 0; k < THAMES.length - 1; k++) {
    const [a, b] = [project(...THAMES[k]), project(...THAMES[k + 1])];
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let q = 0; q < steps; q++) river.push([a[0] + ((b[0] - a[0]) * q) / steps, a[1] + ((b[1] - a[1]) * q) / steps]);
  }
  const pins = ASSETS.map((x) => project(x.lon, x.lat));
  const vals = ASSETS.map((x) => x.value);
  const nav: number[] = [];
  let v = 0.45;
  for (let k = 0; k < cols - 4; k++) nav.push((v = clamp(v + rand(-0.05, 0.065), 0.1, 0.95)));
  let t = 0;
  let sel = 0;
  let since = 0;
  let nextShift = 0;
  const DWELL = 2.4;
  return {
    step(dt) {
      t += dt;
      since += dt;
      if (since > DWELL) {
        since = 0;
        sel = (sel + 1) % ASSETS.length;
      }
      nextShift -= dt;
      if (nextShift <= 0) {
        nextShift = 0.3;
        nav.shift();
        nav.push((v = clamp(v + rand(-0.05, 0.065), 0.1, 0.95)));
      }
      // The selected asset's valuation settles by small steps while it is inspected.
      if (Math.random() < dt * 4) vals[sel] = Math.round((vals[sel] + rand(-0.15, 0.2)) * 10) / 10;
    },
    draw(g) {
      const total = vals.reduce((p, q) => p + q, 0);
      g.put(2, 1, "FUND", 0.5);
      if (cols > 36) g.put(7, 1, "London, 7 assets", 0.24);
      const head = `£${total.toFixed(1)}m`;
      g.put(cols - 2 - head.length, 1, head, 0.6);
      if (top >= 5) nav.forEach((q, k) => g.put(2 + k, 2 + Math.round((1 - q) * 2), k === nav.length - 1 ? "*" : ".", k === nav.length - 1 ? 0.8 : 0.25, k === nav.length - 1));
      // The river flows east, a character at a time.
      river.forEach(([x, y], k) => g.put(x, y, (Math.floor(k / 2 - t * 3) & 3) === 0 ? "-" : "~", 0.42, false, true));
      const [rx, ry] = river[Math.floor(river.length * 0.05)];
      g.put(rx, ry + 1, "thames", 0.22);
      pins.forEach(([x, y], k) => {
        if (k === sel) return;
        g.put(x, y, "o", 0.5);
        const nm = ASSETS[k].name;
        g.put(x + 2 + nm.length < cols ? x + 2 : x - 1 - nm.length, y, nm, 0.28);
      });
      // The inspected asset: a ring that opens out from it, and its name and value beside it.
      const [px, py] = pins[sel];
      const ring = (since * 3) % 3;
      for (let q = 0; q < 16; q++) {
        const th = (q / 16) * Math.PI * 2;
        g.put(px + (Math.cos(th) * (ring + 1)) / ASPECT / 1.4, py + Math.sin(th) * (ring + 1) * 0.6, ".", 0.5 * (1 - ring / 3), false, true);
      }
      g.put(px, py, "@", 1, true);
      // Its tag goes to the right if it fits, else the left, else on the row above.
      const tag = `${ASSETS[sel].name} ${ASSETS[sel].sector}  £${vals[sel].toFixed(1)}m`;
      if (px + 2 + tag.length < cols - 1) g.put(px + 2, py, tag, 0.85);
      else if (px - 2 - tag.length >= 1) g.put(px - 2 - tag.length, py, tag, 0.85);
      else g.put(clamp(Math.round(px - tag.length / 2), 1, cols - 1 - tag.length), py - 2, tag, 0.85);
      if (!tableRows) return;
      const ty = my + mapRows + 2;
      const cX = [2, 8, cols - 15, cols - 7];
      ["asset", "sector", "value", "yield"].forEach((h, k) => g.put(cX[k], ty, h, 0.3));
      ASSETS.forEach((x, k) => {
        const on = k === sel;
        const y = ty + 1 + k;
        const al = on ? 0.9 : 0.4;
        g.put(cX[0] - 2, y, on ? ">" : " ", 1, on);
        g.put(cX[0], y, x.name, al);
        g.put(cX[1], y, x.sector, al * 0.8);
        g.put(cX[2], y, `£${vals[k].toFixed(1)}m`.padStart(7), al);
        g.put(cX[3], y, `${x.yld.toFixed(1)}%`.padStart(5), al * 0.8);
      });
    },
  };
}

// ---- IACT: both gloves streaming, every punch a spike on its trace ---------------------------------

function glove(cols: number, rows: number): Sim {
  const big = rows >= 20;
  const x0 = 2;
  const x1 = cols - 3;
  const head = 3;
  const foot = big ? 4 : 1;
  const laneH = Math.max(3, Math.floor((rows - head - foot - (big ? 3 : 1)) / 2));
  const lanes = [head + 1 + Math.floor(laneH / 2), head + 1 + laneH + (big ? 3 : 1) + Math.floor(laneH / 2)];
  const SPEED = 9; // cells a second the traces scroll
  const TYPES = ["jab", "cross", "hook", "upper"];
  type Hit = { t: number; lane: number; force: number; type: string; kph: number };
  let hits: Hit[] = [];
  let time = 0;
  let next = 0.4;
  let count = 118;
  let round = 2;
  let clock = 102; // seconds left in the round
  let last: Hit | null = null;
  return {
    step(dt) {
      time += dt;
      clock -= dt;
      if (clock <= 0) {
        clock = 120;
        round = (round % 3) + 1;
      }
      next -= dt;
      if (next <= 0) {
        // Punches come in combinations: a quick run, then a breath.
        next = Math.random() < 0.7 ? rand(0.22, 0.4) : rand(0.8, 1.6);
        const type = TYPES[(Math.random() * TYPES.length) | 0];
        const lane = type === "jab" ? 0 : type === "cross" ? 1 : Math.random() < 0.5 ? 0 : 1;
        last = { t: time, lane, force: rand(0.35, 1), type, kph: Math.round(rand(18, 34)) };
        hits.push(last);
        count++;
      }
      hits = hits.filter((h) => (time - h.t) * SPEED < x1 - x0 + 4);
    },
    draw(g) {
      g.put(2, 1, "IACT", 0.5);
      if (cols > 36) g.put(7, 1, "gloves L R connected", 0.24);
      const c = `ROUND ${round}  ${Math.floor(clock / 60)}:${String(Math.floor(clock % 60)).padStart(2, "0")}`;
      g.put(cols - 2 - c.length, 1, c, 0.6);
      lanes.forEach((y, k) => {
        g.put(x0, y - Math.floor(laneH / 2), k ? "R" : "L", 0.5);
        for (let x = x0 + 2; x <= x1; x++) g.put(x, y, "-", 0.14);
      });
      // Each punch is a sharp spike with a smaller swing either side, moving left as time passes.
      // Names are skipped where the one before on the same trace would touch them.
      const labelEnd = [-1e9, -1e9];
      for (const h of hits) {
        const x = Math.round(x1 - (time - h.t) * SPEED);
        const y = lanes[h.lane];
        const up = Math.max(1, Math.round(h.force * (laneH / 2 - 0.5)));
        const fresh = time - h.t < 0.35;
        for (let r = 1; r <= up; r++) g.put(x, y - r, r === up ? "^" : "|", fresh ? 1 : 0.7, fresh);
        g.put(x, y, "+", 0.8, fresh);
        if (up > 1) {
          for (let r = 1; r <= Math.ceil(up / 2); r++) g.put(x - 1, y - r, ":", 0.4);
          g.put(x + 1, y + 1, ".", 0.4);
          if (laneH > 4) g.put(x + 1, y + 2, ":", 0.3);
        }
        if (big && x - 1 > x0 + 2 && x + h.type.length < cols && x - 1 > labelEnd[h.lane] + 1) {
          g.put(x - 1, y - up - 1, h.type, fresh ? 0.8 : 0.35);
          labelEnd[h.lane] = x - 1 + h.type.length;
        }
      }
      if (!foot || !last) return;
      const fy = rows - 2;
      g.put(2, fy, `punches ${count}`, 0.55);
      if (cols > 44) g.put(Math.floor(cols * 0.36), fy, `speed ${last.kph} km/h`, 0.55);
      const f = `last ${last.type}`;
      g.put(cols - 2 - f.length, fy, f, 0.55);
      if (big) {
        // Power of the last few punches, as a row of bars.
        const bars = hits.slice(-Math.min(hits.length, Math.floor((cols - 4) / 2)));
        bars.forEach((h, n) => g.put(2 + n * 2, fy - 2, h.force > 0.75 ? "#" : h.force > 0.5 ? "=" : "-", 0.45 + 0.4 * h.force));
        g.put(2, fy - 3, "power", 0.3);
      }
    },
  };
}

// ---- Caspar Lee's companies: a voice note turning into four apps, one after another, live -------

// What each app's window types out as it is built. Handles and figures are made up.
const APPS: { title: string; body: string[] }[] = [
  {
    title: "scout",
    body: ["creator     score  30d", "@maya   ######## 82  +4", "@theo   ######   64  -1", "@juno   #######  77  +2", "@kit    ####     41  +0", "@remi   #####    55  +3", "@lola   ######## 88  +6", "ask: who fits a tech brand?"],
  },
  {
    title: "i360",
    body: ["brief         owner  due", "[x] kickoff     A    mon", "[x] shortlist   B    tue", "[x] brief sent  A    tue", "[ ] contracts   C    thu", "[ ] content     B    fri", "[ ] go live     A    fri", "6 briefs, 2 due today"],
  },
  {
    title: "pitch",
    body: ["BRAND x CREATORS", "", "reach          2.1m", "engagement     6.4%", "creators       3", "posts          6", "cost per view  0.02", "open the deck ->"],
  },
  {
    title: "proper living",
    body: ["+-----+-----+-----+", "| R1  | R2  | R3  |", "| xx  |     | xx  |", "+-----+-----+-----+", "| R4  | R5  | R6  |", "| xx  | xx  |     |", "+-----+-----+-----+", "rooms 6   booked 4"],
  },
];

function voicenote(cols: number, rows: number): Sim {
  const big = rows >= 24;
  const waveH = big ? 7 : 1;
  const across = big ? 2 : 4;
  const down = big ? 2 : 1;
  const gap = 2;
  const ww = Math.floor((cols - 4 - gap * (across - 1)) / across);
  // Windows are only as tall as what they hold; the note and the windows sit centred below the
  // header.
  const lines = Math.max(...APPS.map((x) => x.body.length));
  const room = rows - 3;
  const gapWave = big ? 5 : 1;
  const wh = Math.max(3, Math.min(lines + 4, Math.floor((room - waveH - gapWave - gap * (down - 1)) / down)));
  const block = waveH + gapWave + down * wh + (down - 1) * gap;
  const waveY = 3 + Math.max(0, Math.floor((room - block) / 2));
  const mid = waveY + Math.floor(waveH / 2);
  const wx0 = 2;
  const wx1 = cols - 3;
  const top = waveY + waveH + gapWave;
  const wins = APPS.map((_, k) => ({ x: 2 + (k % across) * (ww + gap), y: top + Math.floor(k / across) * (wh + gap) }));
  const inner = ww - 4;
  const shown = APPS.map((app) => app.body.slice(0, Math.max(0, wh - 3)).map((l) => l.slice(0, inner)));
  const totals = shown.map((ls) => ls.reduce((n, l) => n + l.length, 0));
  // Where the next character of a window will appear, for the falling characters to aim at.
  const cursor = (k: number, p: number): [number, number] => {
    let left = Math.floor(totals[k] * p);
    for (let n = 0; n < shown[k].length; n++) {
      if (left <= shown[k][n].length) return [wins[k].x + 2 + left, wins[k].y + 2 + n];
      left -= shown[k][n].length;
    }
    return [wins[k].x + 2, wins[k].y + 2 + shown[k].length];
  };
  const NOTE = 9; // seconds the note plays
  const HOLD = 3.5;
  let amp: number[] = [];
  const fresh = () => {
    amp = [];
    let v = 0.4;
    for (let x = wx0; x <= wx1; x++) amp.push((v = clamp(v + rand(-0.3, 0.3), 0.08, 1)));
  };
  fresh();
  type P = { x: number; y: number; k: number; ch: string };
  let parts: P[] = [];
  let time = 0;
  let tick = 0;
  return {
    step(dt) {
      time += dt;
      if (time > NOTE + HOLD + 0.6) {
        time = 0;
        parts = [];
        fresh();
      }
      const play = clamp(time / NOTE);
      const head = Math.round(wx0 + (wx1 - wx0) * play);
      const k = Math.min(3, Math.floor(play * 4));
      // Characters leave the note under the play head and fall, a cell at a time, to the spot
      // where the window being built is typing.
      if (play < 1 && Math.random() < dt * 30) parts.push({ x: head, y: waveY + waveH, k, ch: pick("|:.01+") });
      tick += dt;
      while (tick > 1 / 24) {
        tick -= 1 / 24;
        parts = parts.filter((q) => {
          const [tx, ty] = cursor(q.k, clamp(play * 4 - q.k));
          if (q.y < ty) q.y++;
          if (q.x !== tx && Math.random() < 0.7) q.x += Math.sign(tx - q.x);
          return q.y < ty || Math.abs(q.x - tx) > 1;
        });
      }
    },
    draw(g) {
      const fade = 1 - clamp((time - NOTE - HOLD) / 0.6);
      const play = clamp(time / NOTE);
      const head = Math.round(wx0 + (wx1 - wx0) * play);
      const secs = Math.floor(play * 42);
      g.put(2, 1, "VOICE NOTE", 0.5 * fade);
      if (cols > 36) g.put(13, 1, "from Caspar", 0.24 * fade);
      const done = APPS.filter((_, k) => play * 4 >= k + 1).length;
      const tag = `0:${String(secs).padStart(2, "0")} / 0:42   live ${done}/4`;
      g.put(cols - 2 - tag.length, 1, tag, 0.5 * fade);
      // The waveform: played bars bright, the rest dim.
      amp.forEach((v, n) => {
        const x = wx0 + n;
        const played = x < head;
        if (waveH === 1) g.put(x, mid, v > 0.66 ? "|" : v > 0.33 ? ":" : ".", (played ? 0.7 : 0.22) * fade);
        else {
          const h = Math.max(1, Math.round(v * waveH));
          for (let r = 0; r < h; r++) g.put(x, mid - Math.floor(h / 2) + r, played ? "|" : ":", (played ? 0.65 : 0.2) * fade);
        }
      });
      if (play < 1) for (let r = 0; r < waveH; r++) g.put(head, waveY + r, "|", 1, true);
      for (const q of parts) g.put(q.x, q.y, q.ch, 0.55 * fade);
      APPS.forEach((app, k) => {
        const { x, y } = wins[k];
        const p = clamp(play * 4 - k);
        const live = p >= 1;
        const al = (p > 0 ? 0.34 : 0.14) * fade;
        for (let c = x; c < x + ww; c++) {
          g.put(c, y, "-", al);
          g.put(c, y + wh - 1, "-", al);
        }
        for (let r = y; r < y + wh; r++) {
          g.put(x, r, "|", al);
          g.put(x + ww - 1, r, "|", al);
        }
        for (const [cx, cy] of [[x, y], [x + ww - 1, y], [x, y + wh - 1], [x + ww - 1, y + wh - 1]]) g.put(cx, cy, "+", al);
        g.put(x + 2, y, ` ${app.title} `.slice(0, Math.max(0, ww - 4)), (p > 0 ? 0.7 : 0.3) * fade);
        if (live && ww > 12) g.put(x + ww - 8, y, Math.floor(time * 2) % 2 ? " * live" : "   live", 0.9 * fade, true);
        // The body types itself out as the note plays over this window's quarter.
        let left = Math.floor(totals[k] * p);
        shown[k].forEach((l, n) => {
          const text = l.slice(0, left);
          left = Math.max(0, left - l.length);
          if (text) g.put(x + 2, y + 2 + n, text, (live ? 0.62 : 0.85) * fade);
        });
        if (p > 0 && !live && Math.floor(time * 4) % 2) {
          const [cx, cy] = cursor(k, p);
          g.put(cx, cy, "_", 0.9 * fade);
        }
      });
    },
  };
}

// ---- Create Group: a feed scrolling on a phone, the numbers going up ----------------------------

function feed(cols: number, rows: number): Sim {
  const pw = Math.min(34, Math.max(16, Math.floor(cols * 0.46)));
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
  silverstone,
  fund,
  feed,
  voicenote,
  glove,
  network,
  waves,
  dubai,
} satisfies Record<string, (cols: number, rows: number) => Sim>;

export type SceneKind = keyof typeof SCENES;
export { Grid };
