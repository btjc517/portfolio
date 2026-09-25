import { ASPECT, clamp, type Grid, type Sim } from "../grid";

// Cortex: the detail sheet's scene, acting out each step of "How it works" (see the steps for
// "cortex" in src/data/cv.ts). One picture that reshapes itself as the step changes:
//
//   Sync  five connectors on the left feed dotted lanes into a turning core of items.
//   Link  the core bursts into a graph of people, threads, tasks and files; one item at a time
//         lights up with a line back to the source it came from.
//   Ask   a question is typed or spoken, the items that answer it light up, and the answer
//         quotes them with numbered citations.
//   Act   the graph folds back into a core, the connectors turn into home controls that it sends
//         commands to, and a vault below it keeps passwords, always locked and masked.
//
// Everything moves one cell at a time, and text changes by scrambling in place, so any step can
// follow any other.

const NOISE = ".:;+=*x#%";
const GLYPH = { person: "@", thread: "=", task: "+", file: "#" } as const;
type Kind = keyof typeof GLYPH;

const SOURCES = ["gmail", "whatsapp", "canvas", "github", "linear"];
const CONTROLS = ["lights", "heating", "plugs", "speaker", "fan"];
const STATES: [string, string][] = [
  ["off", "on"],
  ["19c", "21c"],
  ["on", "off"],
  ["off", "on"],
  ["off", "on"],
];

// Illustrative items, invented: kind, name, source, topic.
const ITEMS: [Kind, string, number, number][] = [
  ["task", "submit coursework", 2, 0],
  ["thread", "study group", 1, 0],
  ["person", "tutor", 2, 0],
  ["file", "lecture 7.pdf", 2, 0],
  ["task", "quiz week 9", 2, 0],
  ["person", "classmate", 1, 0],
  ["thread", "flat bills", 0, 1],
  ["thread", "house chat", 1, 1],
  ["person", "flatmate", 1, 1],
  ["person", "landlord", 0, 1],
  ["file", "tenancy.pdf", 0, 1],
  ["file", "bills.csv", 0, 1],
  ["task", "CTX-212 sync retry", 4, 2],
  ["thread", "pr #88", 3, 2],
  ["file", "sync.ts", 3, 2],
  ["task", "CTX-219 voice mode", 4, 2],
  ["thread", "issue #41", 3, 2],
  ["file", "graph.sql", 3, 2],
  ["person", "reviewer", 3, 2],
  ["thread", "internship offer", 0, 3],
  ["file", "cv.pdf", 0, 3],
  ["task", "reply to offer", 4, 3],
  ["person", "recruiter", 0, 3],
  ["thread", "football sat", 1, 3],
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [2, 3], [1, 5],
  [6, 7], [6, 8], [6, 9], [6, 11], [9, 10], [7, 8], [10, 11],
  [13, 12], [13, 14], [13, 16], [13, 18], [12, 15], [14, 17], [16, 15],
  [19, 20], [19, 21], [19, 22], [19, 23], [21, 20],
  [1, 8], [8, 23],
];
// The four clusters the invented items fall into, named at their hub item.
const CLUSTERS: [number, string][] = [
  [0, "study"],
  [6, "home"],
  [13, "code"],
  [19, "work"],
];
const FOCUS = [0, 6, 13, 8, 12, 3, 19, 16, 22, 15, 7, 2];

const QUERIES = [
  { voice: true, q: "what's left on the flat bills?", quote: "wifi and gas, split three ways", cites: [6, 7] },
  { voice: false, q: "when is coursework due?", quote: "coursework due fri 17:00", cites: [0, 1] },
  { voice: false, q: "status of the sync retry fix?", quote: "fix sync retry: in review", cites: [12, 13] },
  { voice: true, q: "anything due this week?", quote: "quiz week 9 opens thursday", cites: [4, 3] },
];

const VAULT = ["github", "wifi", "router", "email", "nas", "bank"];
const MASK = "************";

function hash(a: number, b: number) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cells on a line, one step at a time (diagonal steps allowed), both ends included.
function line(x0: number, y0: number, x1: number, y1: number, out: number[] = []) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (let n = 0; n < 400; n++) {
    out.push(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

/** A line of text that morphs: changed characters scramble through noise and settle one by one,
 * or, when typed, arrive in order. */
class Txt {
  from = "";
  to = "";
  st: number[] = [];
  en: number[] = [];
  seed = (Math.random() * 1e6) | 0;
  constructor(private c: { t: number }) {}
  set(s: string, delay = 0, spread = 0.35, type = 0) {
    if (s === this.to) return;
    const now = this.c.t;
    this.from = this.text();
    this.to = s;
    const n = Math.max(this.from.length, s.length);
    this.st = [];
    this.en = [];
    for (let k = 0; k < n; k++) {
      const a = this.from[k] ?? " ";
      const b = s[k] ?? " ";
      let s0 = now;
      let e0 = now;
      if (a !== b) {
        if (type) s0 = e0 = now + delay + k * type;
        else {
          s0 = now + delay + Math.random() * spread;
          e0 = s0 + 0.08 + Math.random() * 0.22;
        }
      }
      this.st.push(s0);
      this.en.push(e0);
    }
  }
  /** Settle at once. */
  snap() {
    this.from = this.to;
    this.st = this.st.map(() => 0);
    this.en = this.en.map(() => 0);
  }
  text() {
    let s = "";
    for (let k = 0; k < this.st.length; k++) s += (this.c.t < this.st[k] ? this.from[k] : this.to[k]) ?? " ";
    return s.replace(/\s+$/, "");
  }
  /** Whether anything is showing, or still scrambling away. */
  live() {
    return !!this.to || this.en.some((e) => e > this.c.t);
  }
  /** How many characters of a typed line have arrived. */
  typed() {
    let n = 0;
    while (n < this.to.length && this.c.t >= this.st[n]) n++;
    return n;
  }
  draw(g: Grid, x: number, y: number, alpha: number | ((k: number) => number), hot: boolean | ((k: number) => boolean) = false) {
    const now = this.c.t;
    const tick = Math.floor(now * 20);
    for (let k = 0; k < this.st.length; k++) {
      let ch: string;
      let a = typeof alpha === "number" ? alpha : alpha(k);
      let h = typeof hot === "boolean" ? hot : hot(k);
      if (now < this.st[k]) ch = this.from[k] ?? " ";
      else if (now < this.en[k]) {
        ch = NOISE[(hash(k + this.seed, tick) * NOISE.length) | 0];
        a = Math.min(a, 0.32);
        h = false;
      } else ch = this.to[k] ?? " ";
      if (ch !== " ") g.put(x + k, y, ch, a, h);
    }
  }
}

type Mover = { x: number; y: number; tx: number; ty: number; acc: number; v: number; wait: number; trail: number[] };
const mover = (x: number, y: number): Mover => ({ x, y, tx: x, ty: y, acc: 0, v: 0, wait: 0, trail: [] });

/** Sends a mover towards a cell, to arrive in about `dur` seconds after `wait`. */
function aim(m: Mover, tx: number, ty: number, dur: number, wait = 0) {
  m.tx = Math.round(tx);
  m.ty = Math.round(ty);
  m.wait = wait;
  m.v = Math.max(6, (Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y)) / dur);
}

/** Steps a mover one cell at a time, along whichever axis keeps its path straightest. */
function glide(m: Mover, dt: number, now: number) {
  while (m.trail.length && now - m.trail[2] > 0.16) m.trail.splice(0, 3);
  if (m.wait > 0) {
    m.wait -= dt;
    return;
  }
  if (m.x === m.tx && m.y === m.ty) {
    m.acc = 0;
    return;
  }
  m.acc += dt * m.v;
  while (m.acc >= 1) {
    m.acc -= 1;
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    if (!dx && !dy) {
      m.acc = 0;
      break;
    }
    m.trail.push(m.x, m.y, now);
    if (dx && (!dy || Math.abs(dx) * ASPECT >= Math.abs(dy))) m.x += Math.sign(dx);
    else m.y += Math.sign(dy);
  }
}

export function cortexFlow(cols: number, rows: number): Sim {
  const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = { t: 0 };
  const T = () => new Txt(clock);

  // ---- Layout, all from cols and rows ----------------------------------------------------------
  const wide = cols >= 56;
  const X0 = 3;
  const slotX = X0 + 9;
  const slotW = wide ? 4 : 3;
  const laneX0 = slotX + slotW + 1;
  const gx0 = laneX0 + 3;
  const right = cols - 4;
  const top = 4;
  const bottom = rows - 4;
  const mid = Math.round((top + bottom) / 2);
  const N = ITEMS.length;

  // The core: items packed into rings inside a turning dotted ring, a little right of centre so
  // the lanes have room, and a little larger on a big screen.
  const big = cols >= 64 && rows >= 44;
  const vast = cols >= 96; // a wide, short sheet (a portrait tablet): spread the core sideways
  const cs = vast ? 4 : big ? 3 : 2; // columns between items in the core
  const coreRX = cs * 4;
  const coreRY = big || vast ? 5 : 4;
  const ringCells: number[] = [];
  for (let k = 0; k < 400; k++) {
    const th = (k / 400) * Math.PI * 2;
    const x = Math.round(Math.cos(th) * coreRX);
    const y = Math.round(Math.sin(th) * coreRY);
    const n = ringCells.length;
    if (n && ringCells[n - 2] === x && ringCells[n - 1] === y) continue;
    if (n > 2 && ringCells[0] === x && ringCells[1] === y) continue;
    ringCells.push(x, y);
  }
  const sCore = { x: Math.round(gx0 + (right - gx0) * 0.6), y: mid };
  const room = sCore.x - coreRX - 3 - laneX0 - 3;
  const spS = clamp(Math.min(Math.floor((room * 1.5 + coreRY) / 2), Math.floor((bottom - top - 2) / 4), big ? 8 : 7), 2, 8);

  // Act: the core sits above the vault, the pair centred on the screen.
  const vaultRows = rows >= 44 ? 6 : 4;
  const vaultH = vaultRows + 4;
  const VW = Math.min(30, right - gx0 + 1);
  const groupH = 2 * coreRY + 1 + 2 + vaultH;
  const groupTop = clamp(Math.round(mid - groupH / 2), top + 2, Math.max(top + 2, bottom - groupH + 1));
  const vx = clamp(Math.round(sCore.x - VW / 2), gx0, right - VW + 1);
  const aCore = { x: vx + Math.floor(VW / 2), y: groupTop + coreRY };
  const vaultTop = aCore.y + coreRY + 3;

  // Ask: the question on top, the answer at the bottom, the graph squeezed between.
  const qY = top;
  const ansY = rows - 8;
  const bandTop = top + 3;
  const bandBot = ansY - 3;
  const askMid = Math.round((bandTop + bandBot) / 2);

  // Link: the graph fills the right-hand side.
  const lTop = top + 1;
  const lBot = rows - 6;
  const legendY = rows - 3;

  // Core slots, in rings; each ring turns on its own.
  const rings: [number, number][][] = [[], [], [], []];
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -2 * cs; dx <= 2 * cs; dx += cs) {
      const d = Math.hypot((dx / cs) * 2 * ASPECT, dy);
      if (d > 3.25) continue;
      rings[Math.min(3, Math.round(d))].push([dx, dy]);
    }
  for (const r of rings) r.sort((a, b) => Math.atan2(a[1], a[0] * ASPECT) - Math.atan2(b[1], b[0] * ASPECT));
  const rnd = seeded(11);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => rnd() - 0.5);
  const ringOf = new Array<number>(N);
  const idxOf = new Array<number>(N);
  {
    let r = 0;
    let k = 0;
    for (const i of order) {
      while (k >= rings[r].length) {
        r++;
        k = 0;
      }
      ringOf[i] = r;
      // Spread the outer ring's items round it rather than bunching them on one side.
      idxOf[i] = r === 3 ? Math.round((k * rings[3].length) / (N - (rings[0].length + rings[1].length + rings[2].length))) : k;
      k++;
    }
  }
  const spin = [0, 0, 0, 0];
  const coreAt = (i: number, c: { x: number; y: number }) => {
    const ring = rings[ringOf[i]];
    const s = ring[(((idxOf[i] + spin[ringOf[i]]) % ring.length) + ring.length) % ring.length];
    return [c.x + s[0], c.y + s[1]] as const;
  };

  // The graph: four clusters (study, home, code, work), each a hub with its items round it, laid
  // out by hand in a unit square and stretched to the space.
  const UV: [number, number][] = [
    [0.22, 0.2], [0.42, 0.3], [0.06, 0.1], [0.08, 0.36], [0.32, 0.04], [0.44, 0.46],
    [0.76, 0.24], [0.6, 0.34], [0.64, 0.5], [0.94, 0.12], [0.97, 0.34], [0.8, 0.04],
    [0.08, 0.62], [0.26, 0.76], [0.44, 0.66], [0.03, 0.86], [0.14, 0.96], [0.52, 0.82], [0.38, 0.94],
    [0.8, 0.76], [0.96, 0.62], [0.97, 0.9], [0.7, 0.96], [0.64, 0.64],
  ];
  const H = Math.max(6, lBot - lTop);
  const px = UV.map(([u]) => u * (right - 1 - gx0) * ASPECT);
  const py = UV.map(([, v]) => v * H);
  // Fits the layout into a band of rows, keeping items apart so each can carry a tag.
  const offsets: [number, number][] = [];
  for (let dy = -6; dy <= 6; dy++) for (let dx = -14; dx <= 14; dx++) offsets.push([dx, dy]);
  offsets.sort((a, b) => Math.hypot(a[0] * ASPECT, a[1]) - Math.hypot(b[0] * ASPECT, b[1]));
  const fit = (y0: number, y1: number) => {
    const out: [number, number][] = [];
    const clash = (x: number, y: number) =>
      out.some(([qx, qy]) => (qy === y && Math.abs(qx - x) <= 5) || (Math.abs(qy - y) === 1 && Math.abs(qx - x) <= 1));
    for (let i = 0; i < N; i++) {
      const bx = gx0 + Math.round(px[i] / ASPECT);
      const by = y0 + Math.round((py[i] / H) * (y1 - y0));
      let best: [number, number] = [bx, by];
      for (const [dx, dy] of offsets) {
        const x = bx + dx;
        const y = by + dy;
        if (x < gx0 || x > right - 1 || y < y0 || y > y1 || clash(x, y)) continue;
        best = [x, y];
        break;
      }
      out.push(best);
    }
    return out;
  };
  const linkAt = fit(lTop, lBot);
  const askAt = fit(bandTop, bandBot);
  // Link: a quiet name under (or over) each cluster's hub, where no item sits.
  const clusterAt = CLUSTERS.map(([hub, name]) => {
    const [hx, hy] = linkAt[hub];
    const x = clamp(hx - Math.floor(name.length / 2), gx0, right - name.length);
    for (const dy of [1, -1, 2, -2]) {
      const y = hy + dy;
      if (y < top || y >= legendY - 1) continue;
      if (linkAt.some(([qx, qy]) => Math.abs(qy - y) === 0 && qx >= x - 2 && qx <= x + name.length + 1)) continue;
      return [x, y] as const;
    }
    return null;
  });
  const adj: number[][] = ITEMS.map(() => []);
  for (const [a, b] of EDGES) {
    adj[a].push(b);
    adj[b].push(a);
  }

  // ---- State -----------------------------------------------------------------------------------
  let at = 0;
  let since = 0;
  let time = 0;
  let first = true;
  let pending = false; // a change that has not played out yet
  let idle = 0; // draws since the last step; the sheet is paused, or motion is reduced

  const rowsM = SOURCES.map((_, i) => mover(X0, mid + (i - 2) * spS));
  const names = SOURCES.map(() => T());
  const slots = SOURCES.map(() => T());
  const nameFlash = new Float32Array(5);
  const cc = mover(sCore.x, sCore.y);
  const nodes = ITEMS.map(() => mover(sCore.x, sCore.y));
  const nodeA = new Float32Array(N);
  const nodeFlash = new Float32Array(N);
  let laneRev = 0;
  let endMix = 0; // 0: lanes fan in (Sync); 1: lanes meet each row (Act)
  let edgeRev = 0;
  let paths: number[][] = SOURCES.map(() => []);

  const caption = T();
  const store = T();
  const legend = T();
  const clusterTxt = CLUSTERS.map(() => T());

  // Sync
  const synced = [12, 9, 4, 7, 3];
  let stored = 18204;
  const spawnIn = SOURCES.map(() => Math.random() * 0.6);
  const RATE = [0.55, 0.45, 1.1, 0.8, 1.3]; // seconds between items, roughly, per source
  type Packet = { lane: number; p: number; back: boolean; cmd: number; ch: string };
  let packets: Packet[] = [];

  // Link
  let focus = -1;
  let focAt = -10;
  let focK = 0;
  let focT = 0;
  let labels: { txt: Txt; node: number }[] = [];

  // Ask
  let qi = 0;
  let askU = 0;
  let phase = 0;
  let matched: number[] = [];
  let matchAt = -10;
  const query = T();
  const quote = T();
  const cites = [T(), T()];
  let tags: { txt: Txt; node: number }[] = [];

  // Act
  const state = STATES.map(() => 0);
  let cmdIn = 0;
  let cmdK = 0;
  let vaultIn = 0;
  let vaultK = 0;
  let vaultDrop = -1; // cells down the connector, or -1
  let writeAt = -10;
  let writeRow = 0;
  const vaultLines = Array.from({ length: vaultH }, () => T());
  const vaultState = T();

  // ---- Helpers ---------------------------------------------------------------------------------
  const pad = (a: string, b: string, w: number) => a + " ".repeat(Math.max(1, w - a.length - b.length)) + b;
  const citeLine = (k: number, i: number) => {
    const aw = right - X0 + 1;
    const src = SOURCES[ITEMS[i][2]];
    let body = `[${k + 1}] ${ITEMS[i][0]}: ${ITEMS[i][1]}`;
    if (body.length + src.length + 2 > aw) body = `[${k + 1}] ${ITEMS[i][1]}`;
    return pad(body, src, aw);
  };
  const slotText = (i: number) => {
    if (at === 0) return `+${synced[i]}`;
    if (at === 2) {
      const k = phase >= 4 && phase < 5 ? matched.findIndex((m) => ITEMS[m][2] === i) : -1;
      return k >= 0 ? `[${k + 1}]` : "";
    }
    if (at === 3) return STATES[i][state[i]];
    return "";
  };
  const coreFor = (n: number) => (n === 3 ? aCore : sCore);

  // Lanes run level from each source to a shared bend, then diagonally, then level again into
  // the ring, each meeting it at its own point, so they fan in like a bus.
  function lanePaths() {
    // Sync fans the lanes in to points spread round the ring; Act meets each control's row
    // head on where it can, so its lanes run straight. Between the two, the ends step across.
    const ends = SOURCES.map((_, i) => {
      const th = Math.PI - (i - 2) * 0.3;
      const fy = Math.sin(th) * coreRY;
      const ry = clamp(rowsM[i].y - cc.y, -(coreRY - 1), coreRY - 1);
      const y = Math.round(fy + (ry - fy) * endMix);
      const x = -Math.round(coreRX * Math.sqrt(1 - (y / coreRY) ** 2));
      return [cc.x + x - 2, cc.y + y];
    });
    let bx = Infinity;
    for (let i = 0; i < 5; i++) bx = Math.min(bx, ends[i][0] - 2 - Math.abs(ends[i][1] - rowsM[i].y));
    bx = Math.max(laneX0, bx);
    return SOURCES.map((_, i) => {
      const sy = rowsM[i].y;
      const [ex, ey] = ends[i];
      const out: number[] = [];
      for (let x = laneX0; x < bx; x++) out.push(x, sy);
      const dx = Math.min(Math.abs(ey - sy), Math.max(0, ex - bx));
      line(bx, sy, bx + dx, ey, out);
      for (let x = bx + dx + 1; x <= ex; x++) out.push(x, ey);
      return out;
    });
  }

  function aimNodes(n: number, prev: number) {
    for (let i = 0; i < N; i++) {
      const m = nodes[i];
      if (n === 1 || n === 2) {
        const [x, y] = (n === 1 ? linkAt : askAt)[i];
        // Out of a core, the inner rings leave first, so the core bursts open.
        const wait = first ? 0 : prev === 1 || prev === 2 ? Math.random() * 0.12 : ringOf[i] * 0.07 + Math.random() * 0.1;
        aim(m, x, y, 0.7, wait);
      } else {
        const [x, y] = coreAt(i, coreFor(n));
        aim(m, x, y, 0.7, first ? 0 : Math.random() * 0.25);
      }
      if (first) {
        m.x = m.tx;
        m.y = m.ty;
      }
    }
  }

  function clearAsk() {
    query.set("", 0, 0.25);
    quote.set("", 0, 0.3);
    for (const c of cites) c.set("", 0, 0.3);
    for (const t of tags) t.txt.set("", 0, 0.2);
    matched = [];
  }

  function setSlots() {
    slots.forEach((t, i) => t.set(slotText(i), 0.05, 0.3));
  }

  function vaultText(show: boolean) {
    const lines = [
      pad("VAULT", "", VW),
      "-".repeat(VW),
      ...VAULT.slice(0, vaultRows).map((v) => pad(v, MASK, VW)),
      "-".repeat(VW),
      pad("self-hosted", `${vaultRows} entries`, VW),
    ];
    vaultLines.forEach((t, k) => t.set(show ? lines[k] : "", show ? 0.15 + k * 0.03 : 0, 0.4));
    vaultState.set(show ? "locked" : "", show ? 0.4 : 0, 0.3);
  }

  function enter(n: number) {
    const prev = at;
    at = n;
    since = 0;
    pending = true;
    const sp = [spS, spS, 3, 2][n];
    const cy = [mid, mid, askMid, aCore.y][n];
    rowsM.forEach((m, i) => {
      aim(m, X0, cy + (i - 2) * sp, 0.6, first ? 0 : Math.abs(i - 2) * 0.04);
      if (first) m.y = m.ty;
    });
    names.forEach((t, i) => t.set(n === 3 ? CONTROLS[i] : SOURCES[i], 0.05 + i * 0.05, 0.35));
    if (n === 0 || n === 3) {
      aim(cc, coreFor(n).x, coreFor(n).y, 0.6);
      if (first) {
        cc.x = cc.tx;
        cc.y = cc.ty;
      }
    }
    aimNodes(n, prev);
    caption.set(["5 connectors", `${N} items, ${EDGES.length} links`, "search or voice", "home + vault"][n], 0, 0.4);
    store.set(n === 0 ? `postgres  ${stored.toLocaleString("en-GB")}` : "", 0.3, 0.4);
    legend.set(n === 1 ? "@ people   = threads   + tasks   # files" : "", n === 1 ? 0.4 : 0, 0.4);
    clusterTxt.forEach((t, k) => t.set(n === 1 ? CLUSTERS[k][1] : "", n === 1 ? 0.75 + k * 0.08 : 0, 0.3));
    // Link
    focus = -1;
    focT = 0.3;
    for (const l of labels) l.txt.set("", 0, 0.2);
    // Ask
    clearAsk();
    askU = -0.1;
    phase = 0;
    if (prev === 2 && n !== 2) qi++;
    // Act
    cmdIn = 0.45;
    vaultIn = 1.1;
    vaultDrop = -1;
    writeAt = -10;
    vaultText(n === 3);
    packets = packets.filter((p) => !p.back);
    setSlots();
    if (first) {
      for (const t of [...names, ...slots, caption, store, legend, ...clusterTxt, ...vaultLines, vaultState]) t.snap();
      laneRev = n === 0 || n === 3 ? 1 : 0;
      endMix = n === 3 ? 1 : 0;
      edgeRev = n === 1 || n === 2 ? 1 : 0;
      first = false;
    }
    paths = lanePaths();
  }

  function advance(dt: number) {
    time += dt;
    clock.t = time;
    since += dt;
    for (const m of rowsM) glide(m, dt, time);
    glide(cc, dt, time);
    for (const m of nodes) glide(m, dt, time);

    const lanesOn = at === 0 || at === 3;
    laneRev = clamp(laneRev + (lanesOn && since > 0.15 ? dt * 2.2 : -dt * 3));
    if (lanesOn) endMix = clamp(endMix + (at === 3 ? dt : -dt) * 2.5);
    edgeRev = clamp(edgeRev + (at === 1 || at === 2 ? (since > 0.3 ? dt * 1.6 : 0) : -dt * 4));
    paths = lanePaths();

    // The core turns, a ring at a time, while the items are in it.
    if (lanesOn) {
      const tick = Math.floor(time / 0.3);
      const prevTick = Math.floor((time - dt) / 0.3);
      if (tick !== prevTick) {
        for (let r = 1; r <= 3; r++) if (tick % (4 - r) === 0) spin[r] += r % 2 ? 1 : -1;
        const c = coreFor(at);
        for (let i = 0; i < N; i++) {
          const m = nodes[i];
          if (m.x !== m.tx || m.y !== m.ty || m.wait > 0) continue;
          const [x, y] = coreAt(i, c);
          aim(m, x, y, 0.16);
        }
      }
    }

    // Sync: items leave each source along its lane and land in the core.
    if (at === 0 && since > 0.3) {
      for (let i = 0; i < 5; i++) {
        spawnIn[i] -= dt;
        if (spawnIn[i] <= 0) {
          spawnIn[i] = RATE[i] * (0.5 + Math.random());
          // Each item already knows what it is: a person, thread, task or file from this source.
          const mine = ITEMS.filter((it) => it[2] === i);
          packets.push({ lane: i, p: 0, back: false, cmd: 0, ch: GLYPH[mine[(Math.random() * mine.length) | 0][0]] });
          synced[i]++;
          nameFlash[i] = 1;
          slots[i].set(slotText(i), 0, 0);
          slots[i].snap();
        }
      }
    }
    for (let k = packets.length - 1; k >= 0; k--) {
      const p = packets[k];
      const len = paths[p.lane].length / 2;
      p.p += dt * (p.back ? 42 : 30);
      if (p.p < len) continue;
      packets.splice(k, 1);
      if (!p.back) {
        if (at !== 0) continue;
        stored++;
        store.set(`postgres  ${stored.toLocaleString("en-GB")}`, 0, 0);
        store.snap();
        nodeFlash[(Math.random() * N) | 0] = 1;
      } else if (at === 3) {
        state[p.cmd] = 1 - state[p.cmd];
        nameFlash[p.cmd] = 1;
        slots[p.cmd].set(slotText(p.cmd), 0, 0.15);
      }
    }

    // Link: one item at a time, traced back to its source.
    if (at === 1) {
      focT -= dt;
      if (focT <= 0) {
        focT = 1.6;
        for (const l of labels) l.txt.set("", 0, 0.2);
        focus = FOCUS[focK++ % FOCUS.length];
        focAt = time;
        const txt = T();
        txt.set(`${ITEMS[focus][0]}: ${ITEMS[focus][1]}`, 0.32, 0.25);
        labels.push({ txt, node: focus });
      }
    }
    labels = labels.filter((l) => l.txt.live());

    // Ask: a question, typed or spoken; the items that answer it light up; the answer quotes them.
    if (at === 2) {
      askU += dt;
      const q = QUERIES[qi % QUERIES.length];
      const typedEnd = 0.1 + (q.q.length + 2) * 0.02;
      const tMatch = q.voice ? 1.0 : typedEnd + 0.12;
      if (phase === 0 && askU >= 0) {
        phase = 1;
        if (q.voice) query.set("(o)", 0, 0.1);
        else query.set(`> ${q.q}`, 0.05, 0, 0.02);
      } else if (phase === 1 && q.voice && askU >= 0.8) {
        phase = 2;
        query.set(`(o) ${q.q}`, 0, 0.25);
      } else if (phase <= 2 && askU >= tMatch) {
        phase = 3;
        matched = q.cites.slice();
        matchAt = time;
        tags = matched.map((node, k) => {
          const txt = T();
          txt.set(`[${k + 1}]`, 0.12 + k * 0.08, 0.15);
          return { txt, node };
        });
      } else if (phase === 3 && askU >= tMatch + 0.2) {
        phase = 4;
        quote.set(`"${q.quote}"`, 0, 0.3);
        cites.forEach((c, k) => c.set(citeLine(k, q.cites[k]), 0.1 + k * 0.1, 0.3));
        setSlots();
      } else if (phase === 4 && askU >= 5.6) {
        phase = 5;
        clearAsk();
        setSlots();
      } else if (phase === 5 && askU >= 6.4) {
        phase = 0;
        askU = 0;
        qi++;
      }
    }
    tags = tags.filter((l) => l.txt.live());

    // Act: commands go out to the home controls; now and then the vault stores a password.
    if (at === 3) {
      cmdIn -= dt;
      if (cmdIn <= 0) {
        cmdIn = 1.35;
        const c = cmdK++ % 5;
        packets.push({ lane: c, p: 0, back: true, cmd: c, ch: "<" });
      }
      vaultIn -= dt;
      if (vaultIn <= 0) {
        vaultIn = 4.8;
        vaultDrop = 0;
        vaultState.set("saving", 0, 0.15);
      }
      if (vaultDrop >= 0) {
        vaultDrop += dt * 12;
        if (vaultDrop >= 3) {
          vaultDrop = -1;
          writeAt = time;
          writeRow = vaultK++ % vaultRows;
        }
      }
      if (writeAt > 0 && time - writeAt > 0.6 && vaultState.to !== "locked") vaultState.set("locked", 0, 0.15);
    }

    for (let i = 0; i < 5; i++) nameFlash[i] = Math.max(0, nameFlash[i] - dt * 1.6);
    for (let i = 0; i < N; i++) {
      nodeFlash[i] = Math.max(0, nodeFlash[i] - dt * 3);
      let a = 0.6;
      if (at === 0 || at === 3) a = [1, 0.85, 0.68, 0.52][ringOf[i]] * (at === 3 ? 0.9 : 1);
      else if (at === 1) a = 0.82;
      else if (matched.length) a = matched.includes(i) ? 1 : matched.some((m) => adj[m].includes(i)) ? 0.62 : 0.26;
      else a = 0.55;
      nodeA[i] += (a - nodeA[i]) * Math.min(1, dt * 8);
    }
    if (since > 3) pending = false;
  }

  function settle() {
    for (let k = 0; k < 84; k++) advance(1 / 30);
    for (const m of [...nodes, ...rowsM, cc]) {
      m.x = m.tx;
      m.y = m.ty;
      m.trail = [];
    }
    pending = false;
  }

  // ---- Drawing ---------------------------------------------------------------------------------
  const buf: number[] = [];

  return {
    stage(n) {
      enter(clamp(Math.round(n), 0, 3));
      if (reduced) settle();
    },
    step(dt) {
      idle = 0;
      advance(dt);
    },
    draw(g: Grid) {
      if (pending && ++idle > 2) settle();

      g.put(2, 1, "CORTEX", 0.5);
      caption.draw(g, 9, 1, 0.26);
      if (wide) g.put(cols - 2 - 11, 1, "home server", 0.26);

      // Lanes, from each source into the core (Sync) or from the core out to each control (Act).
      if (laneRev > 0) {
        const fromCore = at === 3;
        for (const p of paths) {
          const len = p.length / 2;
          const show = Math.floor(laneRev * len);
          for (let k = 0; k < len; k++) {
            const on = fromCore ? k >= len - show : k < show;
            if (on) g.put(p[k * 2], p[k * 2 + 1], ".", 0.2, false, true);
          }
        }
        // The ring round the core, drawn round as it appears, turning a cell at a time.
        const rl = ringCells.length / 2;
        const turn = Math.floor(time * 7);
        for (let k = 0; k < Math.floor(laneRev * rl); k++) {
          const j = (k + turn) % rl;
          if (j % 4 === 3) continue;
          g.put(cc.x + ringCells[k * 2], cc.y + ringCells[k * 2 + 1], j % 4 === 0 ? ":" : ".", j % 4 === 0 ? 0.42 : 0.22, false, true);
        }
        for (const pk of packets) {
          const p = paths[pk.lane];
          const len = p.length / 2;
          const show = Math.floor(laneRev * len);
          const k = pk.back ? len - 1 - Math.floor(pk.p) : Math.floor(pk.p);
          if (k < 0 || k >= len || (fromCore ? k < len - show : k >= show)) continue;
          const tk = pk.back ? k + 1 : k - 1;
          if (tk >= 0 && tk < len) g.put(p[tk * 2], p[tk * 2 + 1], ".", 0.5, pk.back);
          g.put(p[k * 2], p[k * 2 + 1], pk.ch, pk.back ? 1 : 0.95, pk.back);
        }
      }

      // Edges between items, drawn outward from one end as the graph forms.
      if (edgeRev > 0) {
        const lit = at === 2 && matched.length > 0;
        for (const [a, b] of EDGES) {
          const A = nodes[a];
          const B = nodes[b];
          buf.length = 0;
          line(A.x, A.y, B.x, B.y, buf);
          const len = buf.length / 2;
          const show = Math.floor(edgeRev * (len - 1));
          const hit = lit && (matched.includes(a) || matched.includes(b));
          const sweep = hit ? clamp((time - matchAt) / 0.35) : 0;
          for (let k = 1; k < Math.min(show, len - 1); k++) {
            const x = buf[k * 2];
            const y = buf[k * 2 + 1];
            if (hit && k / len <= sweep) g.put(x, y, ".", 0.55, false, true);
            else g.put(x, y, ".", at === 2 ? 0.12 : 0.22, false, true);
          }
        }
      }

      // Link: each cluster's name, over the edges but under the items.
      clusterTxt.forEach((t, k) => {
        const p = clusterAt[k];
        if (!p || !t.live()) return;
        const len = Math.max(t.to.length, t.from.length);
        g.put(p[0] - 1, p[1], " ", 0);
        g.put(p[0] + len, p[1], " ", 0);
        t.draw(g, p[0], p[1], 0.3);
      });

      // Link: as the graph forms, every item trails a thread back to its source, then they fade.
      if (at === 1 && since < 2.2) {
        const env = clamp((since - 0.15) / 0.3) * clamp((2.1 - since) / 0.6);
        if (env > 0.05)
          for (let i = 0; i < N; i++) {
            const m = nodes[i];
            buf.length = 0;
            line(laneX0 - 1, rowsM[ITEMS[i][2]].y, m.x - 1, m.y, buf);
            for (let k = 0; k < buf.length / 2 - 1; k++) g.put(buf[k * 2], buf[k * 2 + 1], ".", 0.16 * env, false, true);
          }
      }

      // Link: the focused item's line back to its source.
      if (at === 1 && focus >= 0) {
        const m = nodes[focus];
        const src = ITEMS[focus][2];
        buf.length = 0;
        line(laneX0 - 1, rowsM[src].y, m.x - 2, m.y, buf);
        const len = buf.length / 2;
        const show = Math.floor(clamp((time - focAt) / 0.32) * len);
        for (let k = 0; k < show; k++) g.put(buf[k * 2], buf[k * 2 + 1], ".", 0.6, true, true);
      }

      // Items.
      for (let i = 0; i < N; i++) {
        const m = nodes[i];
        for (let k = 0; k < m.trail.length; k += 3) g.put(m.trail[k], m.trail[k + 1], ".", 0.22 * (1 - (time - m.trail[k + 2]) / 0.16), false, true);
        let a = nodeA[i];
        let hot = false;
        if (at === 1 && i === focus && time - focAt > 0.3) {
          a = 1;
          hot = true;
        } else if (at === 2 && matched.includes(i)) hot = time - matchAt > 0.05;
        if (nodeFlash[i] > 0 && at === 0) {
          a = Math.max(a, nodeFlash[i]);
          hot = nodeFlash[i] > 0.4;
        }
        g.put(m.x, m.y, GLYPH[ITEMS[i][0]], a, hot);
      }

      // Tags beside items: the focused item's name (Link), citation numbers (Ask).
      for (const l of labels) {
        const m = nodes[l.node];
        const len = l.txt.to.length || l.txt.from.length;
        // Beside the item, or above it where the right-hand side has no room.
        let x = m.x + 2;
        let y = m.y;
        if (x + len > cols - 2) {
          x = Math.max(X0, m.x + 1 - len);
          y = m.y - 1;
        }
        g.put(x - 1, y, " ", 0);
        g.put(x + len, y, " ", 0);
        l.txt.draw(g, x, y, 0.85);
      }
      for (const l of tags) l.txt.draw(g, nodes[l.node].x + 2, nodes[l.node].y, 1, true);

      // Sources, or controls.
      for (let i = 0; i < 5; i++) {
        const y = rowsM[i].y;
        let a = [0.55, 0.45, 0.32, 0.55][at];
        let hot = false;
        if (at === 1 && focus >= 0 && ITEMS[focus][2] === i && time - focAt > 0.25) {
          a = 1;
          hot = true;
        }
        if (at === 2 && phase === 4 && matched.some((m) => ITEMS[m][2] === i)) a = 0.85;
        if (at === 3 && nameFlash[i] > 0) {
          a = Math.max(a, 0.55 + nameFlash[i] * 0.45);
          hot = nameFlash[i] > 0.5;
        }
        names[i].draw(g, X0, y, a, hot);
        const sa = at === 0 ? 0.3 + nameFlash[i] * 0.5 : at === 3 ? 0.4 + nameFlash[i] * 0.6 : 0.9;
        slots[i].draw(g, slotX + slotW - Math.max(slots[i].to.length, 1), y, sa, at === 2 || (at === 3 && nameFlash[i] > 0.5));
      }

      // Sync: the store under the core.
      store.draw(g, sCore.x - 8, sCore.y + coreRY + 2, (k) => (k < 8 ? 0.4 : 0.7));

      // Link: what the glyphs mean.
      legend.draw(g, X0, legendY, (k) => ("@=+#".includes(legend.to[k] ?? " ") ? 0.8 : 0.34));

      // Ask: the question and the answer.
      const q = QUERIES[qi % QUERIES.length];
      query.draw(g, X0, qY, (k) => (k < 3 ? 0.55 : 0.95), (k) => q.voice && k < 3 && phase >= 1 && phase < 5);
      if (at === 2 && q.voice && phase === 1) {
        // Listening: a waveform, a cell per column, stepping with the voice.
        const tick = Math.floor(time * 16);
        const wlen = Math.min(18, right - X0 - 6);
        for (let k = 0; k < wlen; k++) {
          const env = Math.sin(((k + 0.5) / wlen) * Math.PI);
          const v = env * (0.35 + 0.65 * hash(k, tick)) * clamp(askU * 5) * clamp((0.8 - askU) * 6);
          const ch = v > 0.66 ? "|" : v > 0.4 ? ":" : v > 0.14 ? "." : "";
          if (ch) g.put(X0 + 4 + k, qY, ch, 0.9, true);
        }
      }
      if (at === 2 && !q.voice && phase >= 1 && phase < 5) {
        const n = query.typed();
        if (n < query.to.length || Math.floor(time * 2.4) % 2 === 0) g.put(X0 + n, qY, "_", 0.9, true);
      }
      quote.draw(g, X0, ansY, 0.92);
      cites.forEach((c, k) => c.draw(g, X0, ansY + 2 + k, (j) => (j < 3 ? 1 : j < right - X0 - 9 ? 0.5 : 0.34), (j) => j < 3));

      // Act: the vault under the core, joined to it; always locked, entries always masked.
      if (at === 3 || vaultLines[0].live()) {
        if (at === 3 && since > 0.3) {
          for (let y = aCore.y + coreRY + 1; y < vaultTop; y++) g.put(aCore.x, y, ":", 0.2);
          if (vaultDrop >= 0) g.put(aCore.x, aCore.y + coreRY + Math.floor(vaultDrop), "*", 1, true);
        }
        vaultLines.forEach((t, k) =>
          t.draw(g, vx, vaultTop + k, (j) => (k === 0 ? 0.5 : k === 1 || k === vaultH - 2 ? 0.14 : k === vaultH - 1 ? 0.28 : j < VW - MASK.length ? 0.45 : 0.3)),
        );
        const writing = at === 3 && time - writeAt < 0.6;
        const justLocked = at === 3 && time - writeAt >= 0.6 && time - writeAt < 2;
        vaultState.draw(g, vx + VW - 6, vaultTop, justLocked ? 1 : 0.5, justLocked);
        if (writing) {
          const tick = Math.floor(time * 20);
          for (let j = 0; j < MASK.length; j++) g.put(vx + VW - MASK.length + j, vaultTop + 2 + writeRow, NOISE[(hash(j, tick) * NOISE.length) | 0], 0.8, true);
        }
      }
    },
  };
}
