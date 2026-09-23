"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/data/cv";

// Small live scenes, one per project, drawn in the same characters as the portrait. Each is a
// simulation that writes characters into a grid every frame; the grid is then drawn with
// cached glyph sprites. They run only while on screen, speed up while hovered, and hold a
// single frame under reduced motion.

type Kind = Project["id"];

const INK = "#ecebe6";
const ACCENT = "#ff5b1f";
const ASPECT = 0.6; // cell width over cell height

class Grid {
  ch: string[];
  a: Float32Array;
  hot: Uint8Array;
  constructor(
    public cols: number,
    public rows: number,
  ) {
    this.ch = new Array(cols * rows).fill("");
    this.a = new Float32Array(cols * rows);
    this.hot = new Uint8Array(cols * rows);
  }
  clear() {
    this.ch.fill("");
    this.a.fill(0);
    this.hot.fill(0);
  }
  /** Writes text at a cell; later writes win unless keep is set and the cell is brighter. */
  put(x: number, y: number, text: string, alpha: number, hot = false, keep = false) {
    const yi = Math.round(y);
    if (yi < 0 || yi >= this.rows) return;
    const xi = Math.round(x);
    for (let k = 0; k < text.length; k++) {
      const c = xi + k;
      if (c < 0 || c >= this.cols) continue;
      const i = yi * this.cols + c;
      if (keep && this.a[i] >= alpha) continue;
      this.ch[i] = text[k];
      this.a[i] = alpha;
      this.hot[i] = hot ? 1 : 0;
    }
  }
}

type Sim = { step: (dt: number, t: number) => void; draw: (g: Grid, t: number) => void };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const pick = (xs: string) => xs[(Math.random() * xs.length) | 0];

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

const SIMS: Record<Kind, (cols: number, rows: number) => Sim> = { symphony, ingest, cortex, scout };

export function Miniature({ kind, label }: { kind: Kind; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tile = canvas.closest<HTMLElement>("[data-tile]");

    let W = 0;
    let H = 0;
    let dpr = 1;
    let cellH = 0;
    let cellW = 0;
    let ox = 0;
    let oy = 0;
    let grid: Grid | null = null;
    let sim: Sim | null = null;
    let sprites = new Map<string, HTMLCanvasElement>();
    let family = "monospace";
    let raf = 0;
    let last = 0;
    let t = 0;
    let speed = 1;
    let speedTarget = 1;
    let visible = false;

    function sprite(ch: string, hot: boolean) {
      const key = hot ? "!" + ch : ch;
      let s = sprites.get(key);
      if (s) return s;
      s = document.createElement("canvas");
      s.width = Math.ceil(cellW * dpr) + 2;
      s.height = Math.ceil(cellH * dpr);
      const g = s.getContext("2d")!;
      g.fillStyle = hot ? ACCENT : INK;
      g.font = `400 ${cellH * 0.86 * dpr}px ${family}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(ch, s.width / 2, s.height / 2 + cellH * dpr * 0.04);
      sprites.set(key, s);
      return s;
    }

    function build() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cellH = clamp(Math.round(H / 24), 10, 15);
      cellW = cellH * ASPECT;
      const cols = Math.floor(W / cellW);
      const rows = Math.floor(H / cellH);
      ox = (W - cols * cellW) / 2;
      oy = (H - rows * cellH) / 2;
      grid = new Grid(cols, rows);
      sim = SIMS[kind](cols, rows);
      sprites = new Map();
      t = 0;
      // Warm up so the first frame is mid-flow rather than empty.
      for (let k = 0; k < (reduced ? 240 : 90); k++) {
        t += 1 / 30;
        sim.step(1 / 30, t);
      }
    }

    function render() {
      if (!grid || !sim) return;
      grid.clear();
      sim.draw(grid, t);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { cols, rows, ch, a, hot } = grid;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const glyph = ch[i];
          if (!glyph || glyph === " " || a[i] < 0.02) continue;
          ctx.globalAlpha = Math.min(1, a[i]);
          ctx.drawImage(sprite(glyph, hot[i] === 1), Math.round((ox + c * cellW) * dpr) - 1, Math.round((oy + r * cellH) * dpr));
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      speed += (speedTarget - speed) * Math.min(1, dt * 4);
      if (sim) {
        t += dt * speed;
        sim.step(dt * speed, t);
      }
      render();
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }

    function start() {
      if (reduced || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible) start();
      },
      { rootMargin: "80px" },
    );
    const ro = new ResizeObserver(() => {
      if (canvas.clientWidth === W && canvas.clientHeight === H) return;
      build();
      render();
    });
    const enter = () => (speedTarget = 2.4);
    const leave = () => (speedTarget = 1);
    const onVis = () => start();

    (async () => {
      family = getComputedStyle(canvas).fontFamily || "monospace";
      try {
        await document.fonts.load(`400 12px ${family}`);
      } catch {
        // use whatever resolves
      }
      build();
      render();
      io.observe(canvas);
      ro.observe(canvas);
      tile?.addEventListener("pointerenter", enter);
      tile?.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", onVis);
    })();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      io.disconnect();
      ro.disconnect();
      tile?.removeEventListener("pointerenter", enter);
      tile?.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [kind]);

  return <canvas ref={ref} role="img" aria-label={label} style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }} />;
}
