import { clamp, type Grid, type Sim } from "../grid";

// Scout: the detail sheet's scene, acting out each step of "How it works" (see the steps for
// "scout" in src/data/cv.ts). One continuous picture of a creator database:
//   1 Search    a brief is typed in plain English; the field of creators is swept and the ones
//               that match leave the field and become the result rows.
//   2 Score     every creator walks to its place on an alpha against beta chart, the rows re-rank
//               by Scout Score, and a crosshair steps through the shortlist.
//   3 Plan      the creators rain into budget bars, month by month (agency) or by campaign, with
//               brand spend alongside; the view flips between the two.
//   4 Feedback  a feedback button on a table element opens a note, the note's characters fly into
//               an agent job queue, and when the job ships the table changes.
// Every mover steps a whole cell at a time; text changes scramble in place, a character at a time.

const NOISE = ".:-+=*x#%";
// Seconds of each step shown as the still, under reduced motion: long enough for the key action
// to land (in feedback, for the change to ship).
const SETTLE = [2.6, 2.6, 2.6, 4.3];

const NAMES = [
  "maya", "jon", "ivy", "theo", "ren", "ada", "kofi", "lena", "sam", "noor", "eli", "zara",
  "finn", "isla", "omar", "bea", "cal", "dev", "esme", "hugo", "iris", "jude", "kai", "lola",
  "milo", "nia", "otto", "pia", "rio", "sol", "tia", "uma", "wren", "yas", "ned", "ami",
];
const NICHES = ["beauty", "fitness", "food", "travel", "gaming", "fashion", "tech", "music"];
const TAGS = [["glow", "skin"], ["fit", "runs"], ["eats", "cook"], ["goes", "trip"], ["play", "gg"], ["wear", "fits"], ["tech", "code"], ["beat", "sing"]];

// Each brief in three lengths; the longest that fits the bar is typed.
const QUERIES = [
  { niche: 0, text: ["beauty creators in the UK, 50k to 250k followers", "beauty creators in the UK, 50k to 250k", "UK beauty creators, 50k to 250k"] },
  { niche: 1, text: ["fitness creators with high engagement, under 30", "fitness creators with high engagement", "fitness creators, high engagement"] },
  { niche: 2, text: ["food creators who could film a recipe series", "food creators for a recipe series", "food creators, recipe series"] },
];

// The planner's two views: spend by month across the agency, and by campaign. Thousands of pounds.
const VIEWS = [
  { labels: ["apr", "may", "jun", "jul", "aug", "sep"], budget: [42, 58, 36, 64, 51, 72], brand: [30, 41, 29, 52, 44, 60] },
  { labels: ["spring edit", "run club", "recipe series", "back to uni"], budget: [48, 36, 27, 55], brand: [39, 30, 18, 47] },
];
const VMAX = 72;

const SUBS = ["ai search", "scout score", "budget planner", "feedback"];
const OLD_JOBS = ["export plan to csv", "filter roster by niche", "larger chart labels", "pin campaign totals", "sharpe on hover"];
// What the agent does with each kind of note, for its log.
const EDITS = ["reorders the roster table", "flags the creator row", "reformats brand spend"];

function hash(a: number, b: number) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lpad = (s: string, n: number) => s.padStart(n);
const rpad = (s: string, n: number) => s.padEnd(n);

type Mover = { x: number; y: number; tx: number; ty: number; wait: number; spd: number; acc: number };

// One cell toward the target: along the longer axis, and the shorter one in proportion, so a
// mover traces a line on the grid rather than an L.
function stepToward(m: Mover) {
  const dx = m.tx - m.x;
  const dy = m.ty - m.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= ay) {
    m.x += Math.sign(dx);
    if (ay && Math.random() < ay / ax) m.y += Math.sign(dy);
  } else {
    m.y += Math.sign(dy);
    if (ax && Math.random() < ax / ay) m.x += Math.sign(dx);
  }
}

function move(m: Mover, dt: number) {
  if (m.x === m.tx && m.y === m.ty) return;
  if (m.wait > 0) {
    m.wait -= dt;
    return;
  }
  m.acc += dt * m.spd;
  while (m.acc >= 1 && (m.x !== m.tx || m.y !== m.ty)) {
    m.acc -= 1;
    stepToward(m);
  }
}

type Creator = Mover & {
  handle: string;
  niche: number;
  reach: number;
  match: number;
  beta: number;
  alpha: number;
  sharpe: number;
  score: number;
  budget: number;
  brand: number;
  fx: number;
  fy: number;
  g: string;
  a: number;
  hot: boolean;
  absorb: boolean;
};

// A line of text that scrambles, a character at a time, into whatever it is told to say next,
// and steps a cell at a time when it is told to sit somewhere else.
type Text = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  cur: string[];
  tgt: string;
  tm: number[];
  a: number;
  ta: number;
  hot: boolean;
  seen: boolean;
  dur: number;
  acc: number;
  seed: number;
};

type Flyer = Mover & { ch: string };
type Job = { id: number; text: string; born: number; shown: boolean; state: 0 | 1 | 2 | 3; shipped: number };

export function scoutFlow(cols: number, rows: number): Sim {
  const rnd = seeded(20260701);
  const rr = (a: number, b: number) => a + rnd() * (b - a);
  const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Layout, all from cols and rows ----
  const L = 2;
  const R = cols - 3;
  const W = R - L + 1;
  const gap = rows >= 38 ? 2 : 1;
  const N = rows >= 50 ? 7 : rows >= 34 ? 6 : 5;
  // On a very tall screen the picture stops growing at 36 rows and the whole of it, bar to
  // table, sits in the middle of the height left under the label.
  const extra = Math.max(0, rows - 4 - (N - 1) * gap - 2 - 6 + 1 - 36);
  const top = Math.floor(extra / 2);
  const tTop = rows - 4 - (N - 1) * gap - (extra - top); // table header; its rule is the row below
  const rowY = (k: number) => tTop + 2 + k * gap;
  const barY = 3 + top;
  const qX = L + 7;
  const vy0 = 6 + top;
  const vy1 = tTop - 2;
  const vh = vy1 - vy0 + 1;

  // Table columns, with a bar where the width allows.
  const bw1 = clamp(W - 2 - 33 - 1, 0, 18);
  const bw2 = clamp(W - 2 - 39 - 1, 0, 16);
  const SCORE_AT = 11 + 4 + 2 + 5 + 2 + 6 + 2; // where the score sits in a step-2 row

  // Chart (step 2).
  const axX = L + 6;
  const sxL = axX + 2;
  const sxR = R - 1;
  const syT = vy0 + 1;
  const syB = vy1 - 1;
  const sx = (beta: number) => sxL + Math.round(((beta - 0.3) / 1.6) * (sxR - sxL));
  const sy = (alpha: number) => syB - Math.round(((alpha + 3) / 8) * (syB - syT));
  const zeroY = sy(0);
  const oneX = sx(1);

  // Planner (step 3).
  const pY0 = vy0 + 3;
  const labW = 14;
  const bX0 = L + labW;
  const bMax = Math.max(6, R - 5 - bX0);
  const fits = (per: number, n: number) => pY0 + (n - 1) * per + 1 <= vy1;
  const per = fits(5, 6) ? 5 : fits(4, 6) ? 4 : fits(3, 4) ? 3 : 2;
  const itemsFit = Math.floor((vy1 - 1 - pY0) / per) + 1;
  // A view with fewer bars spreads them over the height; the bars step to their new rows.
  const perOf = (n: number) => (n <= 1 ? per : clamp(Math.floor((vy1 - 1 - pY0) / (n - 1)), per, 7));

  // Queue (step 4).
  const gapQ = vh >= 22 ? 2 : 1;
  const qy0 = vy0 + 2;
  const Q = Math.min(6, Math.floor((vy1 - qy0) / gapQ) + 1);
  const jX = L + 10;
  const stX = R - 7;
  const jW = Math.max(8, stX - 2 - jX);
  // Under the queue, where there is room: the path a note takes, station by station.
  const pipeY = qy0 + Q * gapQ + gapQ;
  const hasPipe = pipeY + 1 <= vy1;
  // Under the path, where there is room: the agent's log for the job in hand.
  const logY = pipeY + 4;
  const logN = hasPipe ? clamp(vy1 - logY + 1, 0, 5) : 0;
  const STATIONS = ["note", "queue", "agent", "shipped"];
  const stationX = (k: number) => (k === 3 ? R - 6 : L + Math.round((k * (W - 7)) / 3));

  // ---- Creators: one per dot in the field ----
  const lattice: [number, number][] = [];
  for (let y = vy0; y <= vy1; y += 2) for (let x = L; x <= R - 1; x += 3) lattice.push([x + (rnd() < 0.5 ? 0 : 1), Math.min(vy1, y + (rnd() < 0.5 ? 0 : 1))]);
  for (let i = lattice.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [lattice[i], lattice[j]] = [lattice[j], lattice[i]];
  }
  const P = Math.min(lattice.length, clamp(Math.floor((W * vh) / 16), 30, 110));
  const creators: Creator[] = Array.from({ length: P }, (_, i) => {
    const core = i < 3 * (N + 2);
    const niche = core ? i % 3 : Math.floor(rnd() * NICHES.length);
    const alpha = rr(-2.6, 4.6);
    const beta = rr(0.35, 1.85);
    const sharpe = clamp(0.55 + alpha * 0.27 + rr(-0.35, 0.45), 0.1, 2.9);
    const budget = rr(6, 24);
    const [fx, fy] = lattice[i];
    return {
      handle: `@${NAMES[i % NAMES.length]}.${TAGS[niche][rnd() < 0.5 ? 0 : 1]}`,
      niche,
      reach: Math.round(rr(42, 248)),
      match: Math.round(core ? rr(80, 98) : rr(55, 76)),
      beta,
      alpha,
      sharpe,
      score: Math.round(clamp(55 + alpha * 5.5 + (sharpe - 1) * 11 - Math.abs(beta - 1) * 7 + rr(-3, 3), 21, 98)),
      budget,
      brand: budget * rr(0.45, 1.05),
      fx,
      fy,
      x: fx,
      y: fy,
      tx: fx,
      ty: fy,
      wait: 0,
      spd: 10,
      acc: 0,
      g: ".",
      a: 0.2,
      hot: false,
      absorb: false,
    };
  });
  const fieldGlyph = (c: Creator) => (c.reach > 180 ? "O" : c.reach > 100 ? "o" : ".");
  const chartGlyph = (c: Creator) => (c.sharpe > 1.8 ? "@" : c.sharpe > 1.2 ? "O" : c.sharpe > 0.7 ? "o" : ".");

  function aim(c: Creator, x: number, y: number, g: string, a: number, hot = false, absorb = false) {
    if (x !== c.tx || y !== c.ty) {
      // A hidden creator that is already home can hop unseen; anything visible walks.
      if (absorb && c.absorb && c.x === c.tx && c.y === c.ty) {
        c.x = x;
        c.y = y;
      } else {
        const d = Math.max(Math.abs(x - c.x), Math.abs(y - c.y));
        c.wait = Math.random() * 0.3;
        c.spd = Math.max(10, d / (0.45 + Math.random() * 0.35));
        c.acc = 0;
      }
      c.tx = x;
      c.ty = y;
    }
    c.g = g;
    c.a = a;
    c.hot = hot;
    c.absorb = absorb;
  }

  // ---- Text store ----
  const texts = new Map<string, Text>();
  let seedN = 1;
  function retext(o: Text, s: string) {
    if (o.tgt === s) return;
    o.tgt = s;
    const n = Math.max(s.length, o.cur.length);
    const changed: number[] = [];
    for (let i = 0; i < n; i++) if ((s[i] ?? " ") !== (o.cur[i] ?? " ") && !(o.tm[i] > 0)) changed.push(i);
    const stagger = changed.length > 3 ? 0.007 : 0;
    changed.forEach((i, k) => (o.tm[i] = o.dur * (0.3 + 0.7 * Math.random()) + k * stagger));
  }
  function txt(id: string, x: number, y: number, s: string, a: number, hot = false, dur = 0.3) {
    let o = texts.get(id);
    if (!o) {
      o = { x, y, tx: x, ty: y, cur: [], tgt: "", tm: [], a, ta: a, hot, seen: true, dur, acc: 0, seed: seedN++ };
      texts.set(id, o);
    }
    o.tx = x;
    o.ty = y;
    o.ta = a;
    o.hot = hot;
    o.seen = true;
    o.dur = dur;
    retext(o, s);
  }
  // Puts text in place at once, for text that has just arrived by other means (a flown note).
  function txtNow(id: string, x: number, y: number, s: string, a: number) {
    txt(id, x, y, s, a, false, 0.05);
    const o = texts.get(id)!;
    o.cur = s.split("");
    o.tm = [];
  }
  function advanceTexts(dt: number) {
    for (const [id, o] of texts) {
      if (!o.seen) {
        o.dur = 0.35;
        retext(o, "");
      }
      o.seen = false;
      let live = false;
      for (let i = 0; i < o.tm.length; i++) {
        if (o.tm[i] > 0) {
          o.tm[i] -= dt;
          if (o.tm[i] <= 0) o.cur[i] = o.tgt[i] ?? " ";
          else live = true;
        }
      }
      if (o.cur.length > o.tgt.length && !live) o.cur.length = o.tgt.length;
      o.a += (o.ta - o.a) * Math.min(1, dt * 5);
      if (o.x !== o.tx || o.y !== o.ty) {
        o.acc += dt * 22;
        while (o.acc >= 1 && (o.x !== o.tx || o.y !== o.ty)) {
          o.acc -= 1;
          o.x += Math.sign(o.tx - o.x);
          o.y += Math.sign(o.ty - o.y);
        }
      } else o.acc = 0;
      if (!o.tgt && !live && !o.cur.some((c) => c && c !== " ")) texts.delete(id);
    }
  }
  const settled = (id: string) => {
    const o = texts.get(id);
    return !!o && o.x === o.tx && o.y === o.ty && !o.tm.some((v) => v > 0);
  };

  // ---- State ----
  let at = 0;
  let since = 0;
  let time = 0;
  let tick = 0;

  // Search
  let qi = 0;
  let qStart = 0;
  let short: number[] = [];
  let prev: number[] = []; // the last shortlist, held in the table until the new one arrives
  const ready = new Set<number>();
  const qText = (k: number) => QUERIES[k].text.find((s) => qX + s.length + 1 <= R) ?? QUERIES[k].text[2].slice(0, Math.max(8, R - qX - 1));
  function pickShort() {
    prev = short;
    short = creators
      .map((_, i) => i)
      .filter((i) => creators[i].niche === QUERIES[qi].niche)
      .sort((a, b) => creators[b].match - creators[a].match)
      .slice(0, N);
    ready.clear();
  }
  pickShort();
  let scanX = -1;

  // Score
  let pAxes = 0;
  const cross = { x: sx(1), y: zeroY };
  let focus = -1;
  const flab = { x: 0, y: 0, len: 0 }; // where the focused creator's label sits

  // Plan
  let baseView = 0;
  let view = 0;
  const bLen = new Array(6).fill(0);
  const bY = Array.from({ length: 6 }, (_, k) => pY0 + k * per);
  const sLen = new Array(6).fill(0);
  let bAcc = 0;
  let yAcc = 0;
  const under = { x: L, len: 0 };

  // Feedback
  let kindBase = 0;
  let nextKind = 0;
  let sortKey: "score" | "budget" = "score";
  let flagged = -1;
  let pct = false;
  let lastSent = -1;
  let lastApplied = -1;
  let jobId = 418;
  const jobs: Job[] = OLD_JOBS.map((text, k) => ({ id: 417 - k, text, born: -99, shown: true, state: 3, shipped: -99 }));
  const flyers: Flyer[] = [];
  let pointer = { y: tTop, on: false };
  let note = "";
  let noteTyped = 0;
  let targetY = tTop;
  let targetRow = -1; // creator index, or -1 for the header
  let phase = 0;
  let cycle = 0;
  let pPipe = 0;
  const token = { x: L, on: false, acc: 0 };
  const stationNow = () => {
    const j = jobs[0];
    if (lastSent < cycle || !j || (j.state === 3 && lastApplied < cycle)) return 0;
    return j.state <= 1 ? 1 : j.state === 2 ? 2 : 3;
  };

  const byScore = (a: number, b: number) => creators[b].score - creators[a].score;
  const byBudget = (a: number, b: number) => creators[b].budget - creators[a].budget;
  function order(): number[] {
    if (at === 0) return short.slice();
    if (at === 3) return short.slice().sort(sortKey === "score" ? byScore : byBudget);
    return short.slice().sort(byScore);
  }

  function header(): string {
    if (at === 0) return rpad("creator", 11) + rpad("niche", 8) + lpad("reach", 5) + "  " + lpad("match", 5);
    if (at === 1) return rpad("creator", 11) + lpad("beta", 4) + "  " + lpad("alpha", 5) + "  " + lpad("sharpe", 6) + "  " + lpad("score", 5);
    if (at === 2) return rpad("creator", 11) + lpad("budget", 6) + "  " + lpad("brand", 6) + "  " + lpad("share", 5);
    return rpad("creator", 11) + lpad("score", 5) + "  " + lpad("budget", 6) + "  " + lpad("brand", 6);
  }
  const total = () => short.reduce((s, i) => s + creators[i].budget, 0);
  function rowText(i: number): string {
    const c = creators[i];
    if (at === 0) {
      const bar = bw1 ? "  " + "#".repeat(Math.round(((c.match - 50) / 50) * bw1)) : "";
      return rpad(c.handle, 11) + rpad(NICHES[c.niche], 8) + lpad(c.reach + "k", 5) + "  " + lpad(c.match + "%", 5) + bar;
    }
    if (at === 1) {
      const bar = bw2 ? "  " + "#".repeat(Math.max(1, Math.round((c.score / 100) * bw2))) : "";
      const al = (c.alpha >= 0 ? "+" : "") + c.alpha.toFixed(1);
      return rpad(c.handle, 11) + lpad(c.beta.toFixed(2), 4) + "  " + lpad(al, 5) + "  " + lpad(c.sharpe.toFixed(2), 6) + "  " + lpad(String(c.score), 5) + bar;
    }
    if (at === 2) {
      const share = Math.round((c.budget / total()) * 100) + "%";
      return rpad(c.handle, 11) + lpad(c.budget.toFixed(1) + "k", 6) + "  " + lpad(c.brand.toFixed(1) + "k", 6) + "  " + lpad(share, 5);
    }
    const brand = pct ? Math.round((c.brand / c.budget) * 100) + "%" : c.brand.toFixed(1) + "k";
    return rpad(c.handle, 11) + lpad(String(c.score), 5) + "  " + lpad(c.budget.toFixed(1) + "k", 6) + "  " + lpad(brand, 6) + (flagged === i ? "  rising" : "");
  }

  // ---- Feedback cycle ----
  const CYCLE = 5.5;
  function noteFor(kind: number, target: number) {
    if (kind === 0) return sortKey === "score" ? "sort roster by budget" : "sort roster by score";
    if (kind === 1) return (flagged === target ? "unflag " : "flag ") + creators[target].handle + (flagged === target ? "" : " as rising");
    return pct ? "show brand spend in GBP" : "show brand spend as %";
  }

  // ---- Per-frame layout: says where everything should be and what it should say ----
  function layout() {
    const ord = order();
    const slot = (i: number) => ord.indexOf(i);

    txt("title", L, 1, "SCOUT", 0.5);
    txt("sub", L + 6, 1, SUBS[at], 0.26);
    if (W >= 44) {
      const right = at === 0 ? "2,418 creators" : at === 1 ? "in postgres" : at === 2 ? `plan ${Math.round(total())}k` : `${jobs.filter((j) => j.state === 3).length} shipped`;
      txt("right", R - 15, 1, lpad(right, 16), 0.26);
    }

    // Query bar: the brief in search, context elsewhere, the note in feedback.
    const q = qText(qi);
    const s1 = time - qStart;
    const typed = at === 0 ? Math.min(q.length, Math.floor(s1 * 70)) : q.length;
    const tDone = q.length / 70;
    txt("qp", L, barY, at === 3 ? "note >" : " ask >", at === 0 || at === 3 ? 0.5 : 0.3);
    if (at === 3) {
      if (phase < 0.85) txt("q", qX, barY, note.slice(0, noteTyped), 0.9, false, 0.06);
    } else txt("q", qX, barY, q.slice(0, typed), at === 0 ? 0.9 : 0.3, false, at === 0 ? 0.06 : 0.4);

    // Table
    txt("hdr", L + 2, tTop, header(), at === 3 && pointer.on && targetRow === -1 ? 0.9 : 0.34);
    ord.forEach((i, k) => {
      if (at === 0 && !ready.has(i)) {
        // Until its creator lands, a slot keeps the row it had, dimmed.
        const old = prev[k];
        if (old !== undefined && (old === i || !short.includes(old))) txt(`r${old}`, L + 2, rowY(k), rowText(old), 0.3);
        return;
      }
      let a = 0.6;
      if (at === 0) a = k === 0 ? 0.85 : 0.62;
      if (at === 1 && focus === i) a = 1;
      if (at === 3 && pointer.on && targetRow === i) a = 1;
      txt(`r${i}`, L + 2, rowY(k), rowText(i), a);
    });

    // Creators
    const qn = QUERIES[qi].niche;
    scanX = at === 0 && s1 > tDone && s1 < tDone + 0.5 ? L + Math.floor(((s1 - tDone) / 0.5) * W) : -1;
    const swept = (c: Creator) => at === 0 && s1 > tDone && (s1 >= tDone + 0.5 || c.fx <= scanX);
    const qLines = jobs.filter((j) => j.shown && j.state === 3).slice(0, Q);
    creators.forEach((c, i) => {
      if (at === 0) {
        const lit = c.niche === qn && swept(c);
        const held = prev.indexOf(i);
        if (lit && short.includes(i)) aim(c, L, rowY(slot(i)), "o", 0.9, !ready.has(i));
        else if (held >= 0 && !short.includes(i) && !ready.has(short[held])) aim(c, L, rowY(held), "o", 0.3);
        else aim(c, c.fx, c.fy, fieldGlyph(c), lit ? 0.62 : 0.2 + (c.reach / 248) * 0.12);
      } else if (at === 1) {
        const mine = short.includes(i);
        aim(c, sx(c.beta), sy(c.alpha), focus === i ? "@" : chartGlyph(c), mine ? 0.85 : 0.16 + (c.score / 100) * 0.22, focus === i);
      } else if (at === 2) {
        const v = VIEWS[view];
        const n = Math.min(v.labels.length, itemsFit);
        const b = i % n;
        const k = Math.floor(i / n);
        const perBar = Math.ceil(P / n);
        const len = Math.max(1, Math.round((v.budget[b] / VMAX) * bMax));
        aim(c, bX0 + Math.min(len - 1, Math.floor(((k + 0.5) / perBar) * len)), pY0 + b * perOf(n), "#", 0.7);
      } else {
        // Into the queue's shipped lines, where they disappear into the text.
        const lines = qLines.length ? qLines : jobs.slice(0, 1);
        const j = i % lines.length;
        const line = `job-${lines[j].id}  ${lines[j].text}`;
        const y = qy0 + jobs.indexOf(lines[j]) * gapQ;
        aim(c, L + ((i * 7) % line.length), y, ".", 0.4, false, true);
      }
    });

    // Chart labels
    if (at === 1) {
      txt("ax-a", L, vy0, "alpha", 0.4);
      txt("ax-0", axX - 2, zeroY, "0", 0.3);
      txt("ax-b", R - 3, vy1 + 1, "beta", 0.4);
      txt("ax-1", oneX - 1, vy1 + 1, "1.0", 0.3);
      if (focus >= 0) {
        const c = creators[focus];
        const label = `${c.handle} ${c.score}`;
        const x = sx(c.beta) + 2 + label.length <= R ? sx(c.beta) + 2 : sx(c.beta) - 2 - label.length;
        const y = clamp(sy(c.alpha), vy0 + 1, vy1 - 1);
        txt(`fl${focus}`, x, y, label, 0.85, false, 0.25);
        flab.x = x;
        flab.y = y;
        flab.len = label.length;
      }
    }

    // Planner labels
    if (at === 2) {
      txt("tabA", L, vy0, "agency", view === 0 ? 0.9 : 0.3);
      txt("tabC", L + 9, vy0, "campaign", view === 1 ? 0.9 : 0.3);
      if (W >= 44) txt("legend", R - 22, vy0, "# budget  = brand spend", 0.3);
      const v = VIEWS[view];
      const n = Math.min(v.labels.length, itemsFit);
      for (let k = 0; k < n; k++) {
        const y = bY[k];
        txt(`bl${k}`, L, y, v.labels[k], 0.5);
        txt(`bv${k}`, R - 3, y, lpad(v.budget[k] + "k", 4), 0.55);
        if (per > 1) txt(`bs${k}`, R - 3, y + 1, lpad(v.brand[k] + "k", 4), 0.3);
      }
    }

    // Queue
    if (at === 3) {
      txt("jh", L, vy0, "JOBS", 0.5);
      txt("jh2", L + 6, vy0, "from feedback", 0.26);
      jobs.slice(0, Q).forEach((j, k) => {
        if (!j.shown) return;
        const y = qy0 + k * gapQ;
        const live = j.state < 3 || time - j.shipped < 0.9;
        txt(`j${j.id}`, L, y, `job-${j.id}  ${j.text.slice(0, jW)}`, live ? 0.85 : 0.34);
        const st = j.state === 1 ? "queued" : j.state === 2 ? "agent" : "shipped";
        txt(`js${j.id}`, stX, y, st, j.state === 3 && time - j.shipped < 0.9 ? 1 : live ? 0.6 : 0.3, j.state === 3 && time - j.shipped < 0.9, 0.2);
      });
      if (pointer.on && phase >= 0.15) txt("fb", R - 2, targetY, "[+]", 1, true, 0.15);
      if (hasPipe) {
        const now = token.on ? stationNow() : -1;
        STATIONS.forEach((name, k) => txt(`st${k}`, stationX(k), pipeY, name, k === now ? 0.85 : 0.3, k === now && k === 3));
      }
      const j = jobs[0];
      if (logN && j && j.shown && lastSent === cycle) {
        const kind = (kindBase + cycle) % 3;
        const lines: [number, string][] = [
          [1.3, `queued   job-${j.id}`],
          [1.9, `agent    picks up job-${j.id}`],
          [2.6, `agent    ${EDITS[kind]}`],
          [3.1, "checks   pass"],
          [3.4, "shipped  live in the app"],
        ];
        const due = lines.filter(([t]) => phase >= t);
        due.slice(-logN).forEach(([t, s], k, arr) => {
          const last = k === arr.length - 1;
          txt(`lg${cycle}-${t}`, L, logY + k, `${t.toFixed(1).padStart(4, "0")}s  ${s}`, last ? 0.62 : 0.3, false, 0.2);
        });
      }
    }
  }

  // ---- Clock ----
  function advance(dt: number) {
    time += dt;
    since += dt;
    tick = Math.floor(time * 20);

    // Search: a new brief every few seconds while the reader stays.
    if (at === 0 && time - qStart > 8.5) {
      qi = (qi + 1) % QUERIES.length;
      qStart = time;
      pickShort();
    }

    // Score: the crosshair steps through the shortlist by rank.
    if (at === 1) {
      const ord = order();
      focus = since < 1.1 ? -1 : ord[Math.floor((since - 1.1) / 1.8) % ord.length];
    } else focus = -1;

    // Plan: agency, then campaign, then back.
    if (at === 2) view = (baseView + (since < 3.6 ? 0 : Math.floor((since - 3.6) / 4) + 1)) % 2;

    // Feedback: one note at a time, from the button to shipped.
    if (at === 3) {
      cycle = Math.floor(since / CYCLE);
      phase = since - cycle * CYCLE;
      const kind = (kindBase + cycle) % 3;
      const ord = order();
      // What this cycle is about, settled before its note is sent.
      if (lastSent < cycle && phase < 0.85) {
        targetRow = kind === 1 ? ord[1 + (cycle % (N - 1))] : -1;
        note = noteFor(kind, targetRow);
      }
      targetY = targetRow >= 0 ? rowY(ord.indexOf(targetRow)) : tTop;
      pointer.on = phase < 4.8;
      noteTyped = phase < 0.35 ? 0 : Math.min(note.length, Math.floor((phase - 0.35) * 60));
      if (phase >= 0.85 && lastSent < cycle) {
        lastSent = cycle;
        // The note lifts off the bar, a character at a time, and flies to the top of the queue.
        const q = texts.get("q");
        if (q) {
          q.cur = [];
          q.tm = [];
          q.tgt = "";
        }
        const job: Job = { id: jobId++, text: note, born: time, shown: false, state: 0, shipped: 0 };
        jobs.unshift(job);
        if (jobs.length > Q + 1) jobs.length = Q + 1;
        const line = `job-${job.id}  ${note.slice(0, jW)}`;
        for (let k = 0; k < note.length && k < jW; k++) {
          if (note[k] === " ") continue;
          const tx = L + (line.length - Math.min(note.length, jW)) + k;
          const d = Math.max(Math.abs(tx - (qX + k)), Math.abs(qy0 - barY));
          flyers.push({ ch: note[k], x: qX + k, y: barY, tx, ty: qy0, wait: k * 0.012, spd: Math.max(12, d / 0.4), acc: 0 });
        }
      }
      const job = jobs[0];
      if (job && job.state < 3 && lastSent === cycle) {
        if (!job.shown && flyers.length && flyers.every((f) => f.x === f.tx && f.y === f.ty)) {
          job.shown = true;
          job.state = 1;
          flyers.length = 0;
          txtNow(`j${job.id}`, L, qy0, `job-${job.id}  ${job.text.slice(0, jW)}`, 0.85);
        }
        if (job.shown && phase >= 1.9 && job.state === 1) job.state = 2;
        if (job.state === 2 && phase >= 3.4 && lastApplied < cycle) {
          lastApplied = cycle;
          job.state = 3;
          job.shipped = time;
          if (kind === 0) sortKey = sortKey === "score" ? "budget" : "score";
          else if (kind === 1) flagged = flagged === targetRow ? -1 : targetRow;
          else pct = !pct;
          nextKind = (kind + 1) % 3;
        }
      }
    }

    layout();
    advanceTexts(dt);

    for (const c of creators) {
      move(c, dt);
      if (at === 0 && c.x === c.tx && c.y === c.ty && c.x === L && c.y >= tTop) {
        const i = creators.indexOf(c);
        if (short.includes(i)) ready.add(i);
      }
    }
    for (let k = flyers.length - 1; k >= 0; k--) {
      move(flyers[k], dt);
      // A note whose job was dropped (the reader left mid-flight) lands and is gone.
      if (!jobs.some((j) => !j.shown) && flyers[k].x === flyers[k].tx && flyers[k].y === flyers[k].ty) flyers.splice(k, 1);
    }

    // Chart axes and crosshair.
    pAxes = at === 1 ? Math.min(1, pAxes + dt / 0.45) : Math.max(0, pAxes - dt / 0.35);
    if (focus >= 0) {
      const fx = sx(creators[focus].beta);
      const fy = sy(creators[focus].alpha);
      const d = Math.max(Math.abs(fx - cross.x), Math.abs(fy - cross.y));
      if (d > 0) {
        const m: Mover = { x: cross.x, y: cross.y, tx: fx, ty: fy, wait: 0, spd: 0, acc: 0 };
        const n = Math.max(1, Math.round(dt * 70));
        for (let k = 0; k < n && (m.x !== fx || m.y !== fy); k++) stepToward(m);
        cross.x = m.x;
        cross.y = m.y;
      }
    }

    // Planner bars grow and shrink a cell at a time.
    bAcc += dt * 60;
    const nSteps = Math.floor(bAcc);
    bAcc -= nSteps;
    const v = VIEWS[view];
    const n = Math.min(v.labels.length, itemsFit);
    const pv = perOf(n);
    yAcc += dt * 16;
    const ySteps = Math.floor(yAcc);
    yAcc -= ySteps;
    for (let k = 0; k < 6; k++) {
      // A bar the view drops shrinks where it stands.
      const ty = k < n ? pY0 + k * pv : bY[k];
      // A hidden bar takes its row at once; a shown one steps there a row at a time.
      if (bLen[k] === 0 && sLen[k] === 0) bY[k] = ty;
      else for (let s = 0; s < ySteps; s++) if (bY[k] !== ty) bY[k] += Math.sign(ty - bY[k]);
      const on = at === 2 && k < n && since > k * 0.06;
      const tb = on ? Math.round((v.budget[k] / VMAX) * bMax) : 0;
      const ts = on && per > 1 ? Math.round((v.brand[k] / VMAX) * bMax) : 0;
      for (let s = 0; s < nSteps; s++) {
        if (bLen[k] !== tb) bLen[k] += Math.sign(tb - bLen[k]);
        if (sLen[k] !== ts) sLen[k] += Math.sign(ts - sLen[k]);
      }
    }
    const ux = view === 0 ? L : L + 9;
    const ul = at === 2 ? (view === 0 ? 6 : 8) : 0;
    for (let s = 0; s < Math.max(1, Math.floor(nSteps / 2)); s++) {
      if (under.x !== ux) under.x += Math.sign(ux - under.x);
      if (under.len !== ul) under.len += Math.sign(ul - under.len);
    }

    // The note's token walks the path, a cell at a time.
    pPipe = at === 3 ? Math.min(1, pPipe + dt / 0.5) : Math.max(0, pPipe - dt / 0.35);
    const shippedAgo = jobs[0] && jobs[0].state === 3 && lastApplied === cycle ? time - jobs[0].shipped : 0;
    const wasOn = token.on;
    token.on = at === 3 && phase >= 0.35 && shippedAgo < 1.2;
    if (!token.on || !wasOn) token.x = L;
    else {
      const goal = stationX(stationNow()) + (stationNow() === 3 ? 3 : 1);
      token.acc += dt * 45;
      while (token.acc >= 1 && token.x !== goal) {
        token.acc -= 1;
        token.x += Math.sign(goal - token.x);
      }
      if (token.x === goal) token.acc = 0;
    }

    // Pointer steps between targets.
    if (at === 3 && pointer.on) {
      if (pointer.y !== targetY) pointer.y += Math.sign(targetY - pointer.y);
    }
  }

  return {
    stage(n) {
      const next = clamp(Math.round(n), 0, 3);
      if (at === 3 && next !== 3) {
        // Drop a note still in flight; its job never reached the queue for this reader.
        const k = jobs.findIndex((j) => j.state < 3);
        if (k >= 0) jobs.splice(k, 1);
        pointer.on = false;
      }
      if (next === 3 && at !== 3) {
        kindBase = nextKind;
        lastSent = cycle = -1;
        lastApplied = -1;
        note = "";
        pointer = { y: tTop, on: false };
      }
      at = next;
      since = 0;
      if (at === 0) {
        qStart = time;
        prev = short.slice();
        ready.clear();
      }
      if (at === 2) baseView = 0;
      if (reduced) while (since < SETTLE[at]) advance(1 / 30);
    },
    step(dt) {
      if (reduced && since >= SETTLE[at]) return;
      advance(dt);
    },
    draw(g: Grid) {
      // Rules
      for (let x = L; x <= R; x++) g.put(x, tTop + 1, "-", 0.12);
      for (let x = L; x <= R; x += 2) g.put(x, barY + 1, ".", 0.1);

      // Search sweep
      if (scanX >= 0) for (let y = vy0; y <= vy1; y++) g.put(scanX, y, ":", 0.28);

      // Chart axes grow out of the origin.
      if (pAxes > 0) {
        const h = Math.round(pAxes * (vy1 - vy0));
        const w = Math.round(pAxes * (R - axX));
        for (let k = 0; k <= h; k++) g.put(axX, vy1 - k, k === 0 ? "+" : "|", 0.3);
        for (let k = 1; k <= w; k++) g.put(axX + k, vy1, "-", 0.3);
        for (let k = 2; k <= w; k += 2) g.put(axX + k, zeroY, ".", 0.14);
        for (let k = 2; k <= h; k += 2) if (vy1 - k >= vy0) g.put(oneX, vy1 - k, ".", 0.14);
        if (focus >= 0 && pAxes >= 1) {
          for (let y = cross.y + 1; y < vy1; y++) g.put(cross.x, y, ":", 0.2);
          for (let x = axX + 1; x < cross.x; x++) g.put(x, cross.y, "-", 0.14);
        }
      }

      // Planner bars and view underline
      for (let k = 0; k < 6; k++) {
        const y = bY[k];
        for (let x = 0; x < bLen[k]; x++) g.put(bX0 + x, y, "#", 0.7);
        for (let x = 0; x < sLen[k]; x++) g.put(bX0 + x, y + 1, "=", 0.3);
      }
      for (let k = 0; k < under.len; k++) g.put(under.x + k, vy0 + 1, "-", 0.9, true);

      // Creators
      for (const c of creators) {
        const moving = c.x !== c.tx || c.y !== c.ty;
        if (moving) g.put(c.x, c.y, c.hot ? "o" : ".", Math.max(0.3, Math.min(0.8, c.a)), c.hot, true);
        else if (!c.absorb) g.put(c.x, c.y, c.g, c.a, c.hot, true);
      }

      // A clear cell either side of the focused label, so no dot runs into it.
      if (at === 1 && focus >= 0) {
        g.put(flab.x - 1, flab.y, " ", 1);
        g.put(flab.x + flab.len, flab.y, " ", 1);
      }

      // Text
      for (const o of texts.values()) {
        for (let i = 0; i < Math.max(o.cur.length, o.tm.length); i++) {
          if (o.tm[i] > 0) {
            g.put(o.x + i, o.y, NOISE[Math.floor(hash(o.seed * 131 + i, tick) * NOISE.length)], Math.max(0.14, o.a * 0.55));
            continue;
          }
          const ch = o.cur[i];
          if (!ch || ch === " ") continue;
          g.put(o.x + i, o.y, ch, o.a, o.hot);
        }
      }

      // Accents: the live cursor, the focused score, the feedback pointer, the running job.
      const q = qText(qi);
      if (at === 0) {
        const typed = Math.min(q.length, Math.floor((time - qStart) * 70));
        if (typed < q.length || Math.floor(time * 2.2) % 2 === 0) g.put(qX + typed, barY, "_", 1, true);
      }
      if (at === 3 && pointer.on && phase >= 0.35 && phase < 0.85) {
        if (noteTyped < note.length || Math.floor(time * 4) % 2 === 0) g.put(qX + noteTyped, barY, "_", 1, true);
      }
      if (at === 1 && focus >= 0) {
        const k = order().indexOf(focus);
        if (k >= 0 && settled(`r${focus}`)) {
          g.put(L, rowY(k), ">", 0.9, true);
          g.put(L + 2 + SCORE_AT, rowY(k), lpad(String(creators[focus].score), 5), 1, true);
        }
      }
      if (at === 3 && pointer.on) g.put(L, pointer.y, ">", 1, true);
      if (at === 3) {
        jobs.slice(0, Q).forEach((j, k) => {
          if (j.shown && j.state === 2) g.put(R, qy0 + k * gapQ, "|/-\\"[tick % 4], 1, true);
        });
      }
      if (hasPipe && pPipe > 0) {
        const len = Math.round(pPipe * W);
        for (let k = 0; k < len; k++) g.put(L + k, pipeY + 1, "-", 0.14);
        if (token.on) {
          for (let x = L; x < token.x; x++) g.put(x, pipeY + 1, "=", 0.5);
          g.put(token.x, pipeY + 1, "*", 1, true);
        }
      }
      for (const f of flyers) g.put(f.x, f.y, f.ch, 0.95, true);
    },
  };
}
