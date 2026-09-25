import { clamp, Grid, type Sim, type Tone } from "../grid";

// Symphony: the detail sheet's scene, acting out each step of "How it works" (see the steps for
// "symphony" in src/data/cv.ts). One job, SYM-412, is the thread through every step: it is a row
// in the Linear queue, a worktree on m1, the terminal the agent builds in, the diff under review,
// the pull request with its proof, and finally a commit on main. Two things carry it between
// steps: the job's id, which walks to its next place a cell at a time, and a single frame that
// moves and resizes to hold whatever is in focus. Everything else changes in a wave that spreads
// out from where the job lands, each cell scrambling once before it settles.
//
// Every picture is a pure function of the time since its step began, so any step can follow any
// other, pause and speed work, and a reduced-motion reader gets each step's settled state.

const NOISE = ".:;+=*x#%";
const TOKEN = "SYM-412";
const MORPH = 0.84; // seconds the wave between two steps takes to cross the scene
// Under reduced motion each step is drawn once, this long after it began: after its key action.
const SETTLED = [1.4, 1.8, 3.4, 3.6, 3.6, 3.2];

function hash(i: number, j: number) {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };
type Way = { x: number; y: number; after: number };
type Cell = [number, number];

// One step toward a target, along whichever axis is further in screen distance, so a run of
// steps makes a staircase that follows the straight line.
function toward(x: number, y: number, gx: number, gy: number): Cell {
  const dx = gx - x;
  const dy = gy - y;
  if (dx !== 0 && Math.abs(dx) * 0.6 >= Math.abs(dy)) return [x + Math.sign(dx), y];
  if (dy !== 0) return [x, y + Math.sign(dy)];
  return [x + Math.sign(dx), y];
}

// The cells a walker visits going through each point in turn.
function walk(pts: Cell[]): Cell[] {
  const out: Cell[] = [pts[0]];
  let [x, y] = pts[0];
  for (let k = 1; k < pts.length; k++) {
    const [gx, gy] = pts[k];
    while (x !== gx || y !== gy) {
      [x, y] = toward(x, y, gx, gy);
      out.push([x, y]);
    }
  }
  return out;
}

// A straight line of cells between two points.
function line(x0: number, y0: number, x1: number, y1: number): Cell[] {
  const out: Cell[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    out.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

function box(g: Grid, r: Rect, a: number) {
  const x0 = Math.min(r.x0, r.x1);
  const x1 = Math.max(r.x0, r.x1);
  const y0 = Math.min(r.y0, r.y1);
  const y1 = Math.max(r.y0, r.y1);
  for (let x = x0 + 1; x < x1; x++) {
    g.put(x, y0, "-", a);
    g.put(x, y1, "-", a);
  }
  for (let y = y0 + 1; y < y1; y++) {
    g.put(x0, y, "|", a);
    g.put(x1, y, "|", a);
  }
  const c = Math.min(1, a * 1.8);
  g.put(x0, y0, "+", c);
  g.put(x1, y0, "+", c);
  g.put(x0, y1, "+", c);
  g.put(x1, y1, "+", c);
}

function wrap(text: string, w: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    if (cur && cur.length + 1 + word.length > w) {
      out.push(cur);
      cur = word;
    } else cur = cur ? cur + " " + word : word;
  }
  if (cur) out.push(cur);
  return out;
}

const right = (g: Grid, x1: number, y: number, text: string, a: number, hot: boolean | Tone = false) => g.put(x1 - text.length + 1, y, text, a, hot);

// ---- What each step shows ------------------------------------------------------------------------

const TITLES = [
  "retry backoff on 429s",
  "flaky worktree cleanup",
  "time out stuck agent runs",
  "proof links on issues",
  "fleet view in dark mode",
  "tailscale health check",
  "resume runs after restart",
  "rate-limit the Linear sync",
  "cap parallel runs per host",
  "retry failed screenshots",
  "archive merged worktrees",
  "show review rounds per PR",
  "quieter logs on m1",
];
const AGENTS = ["codex-2", "claude-3", "codex-3", "claude-4", "codex-4", "claude-5"];

const EDITS: { file: string; lines: string[] }[][] = [
  [
    {
      file: "lib/symphony/runner.ex",
      lines: ["+ @max_run :timer.minutes(40)", "+ def handle_info(:timeout, s) do", "+   {:stop, :timed_out, s}", "+ end", "- # runs never time out"],
    },
    { file: "config/runtime.exs", lines: ["+ config :symphony, max_run: 40"] },
  ],
  [
    {
      file: "lib/symphony/runner.ex",
      lines: ["+ Logger.warning(\"run timed out\")", "+ Issue.comment(s.issue, :timeout)", "  {:stop, :timed_out, s}"],
    },
    { file: "test/runner_test.exs", lines: ["+ test \"stops a stuck run\" do", "+   assert_stop(run, :timed_out)"] },
  ],
];
const CHECKS = [
  ["format", "ok"],
  ["credo", "ok"],
  ["tests", "214 ok"],
  ["cover", "100%"],
];

const REVIEW_LINES = [
  "+ @max_run :timer.minutes(40)",
  "+ def handle_info(:timeout, s) do",
  "+   {:stop, :timed_out, s}",
  "+ end",
  "- # runs never time out",
];
const FINDINGS = [
  { row: 1, note: "no test for the timeout", fixed: "test added" },
  { row: 2, note: "log why the run stopped", fixed: "logged" },
];

const PROOF_DOC = ["# PROOF", "runs stop at 40 min", "2 review rounds", "214 tests pass", "fleet view checked"];
const QUESTION = "This adds a column to the live runs table. Run the migration now?";

export function symphonyFlow(cols: number, rows: number): Sim {
  const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The scene keeps its outer edge clear: the sheet draws its own field of characters there.
  const L = 2;
  const R = cols - 3;
  const T = 3;
  // On a screen with room, a strip along the bottom shows all six steps and where the job is.
  const pipe = rows >= 38;
  const B = rows - 2 - (pipe ? 5 : 0);
  const CW = R - L + 1;
  const CH = B - T + 1;
  const cx = Math.floor(cols / 2);
  const tall = rows >= 46;
  const compact = rows < 34;
  const narrow = cols < 56;
  const wide = cols >= 90;
  const center = (w: number) => cx - Math.floor(w / 2);
  const middle = (h: number) => T + Math.max(0, Math.floor((CH - h) / 2));
  const rect = (x0: number, y0: number, w: number, h: number): Rect => ({ x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 });

  // ---- 1 Issue: the Linear queue, polled by Symphony, which claims one job for one agent -------
  const qn = tall ? 8 : compact ? 6 : 7;
  const qg = tall ? 3 : 2;
  const Q = (() => {
    const w = Math.min(CW, wide ? 64 : 58);
    const h = qn * qg + 6 - qg;
    return rect(center(w), middle(h), w, h);
  })();
  const qRow = (k: number) => Q.y0 + 4 + k * qg;
  const OURS = 2;
  const qCycle = 2.2 * (qn - 3) + 1.8;

  // ---- 2 Dispatch: three machines on a Tailscale mesh; the job gets a worktree on m1 -----------
  const bw = narrow || compact ? 16 : 20;
  const bh = tall ? 8 : 7;
  const slots = bh - 5;
  const hg = Math.min(CW - 2 * bw, wide ? 32 : 22);
  const vg = compact ? 3 : tall ? 9 : 6;
  const mTop = middle(2 + bh + vg + bh) + 2;
  const MB = [
    { name: "mbp-m3", kind: "macbook pro", r: rect(cx - (hg >> 1) - bw, mTop, bw, bh) },
    { name: "m1", kind: "always-on", r: rect(cx + hg - (hg >> 1), mTop, bw, bh) },
    { name: "desktop-home", kind: "windows + wsl", r: rect(center(bw), mTop + bh + vg, bw, bh) },
  ];
  const [mbp, m1, dh] = MB.map((m) => m.r);
  const meshY = mTop + 3;
  const links: Cell[][] = [
    line(mbp.x1 + 1, meshY, m1.x0 - 1, meshY),
    line(mbp.x0 + (bw >> 1), mbp.y1 + 1, dh.x0 + 3, dh.y0 - 1),
    line(m1.x0 + (bw >> 1) - 1, m1.y1 + 1, dh.x1 - 3, dh.y0 - 1),
  ];
  const BASE_WT = [["SYM-401"], ["SYM-405"], ["SYM-399", "SYM-407"]];
  // Later jobs, dispatched while the reader stays on this step: when, which id, which machine.
  const events = Array.from({ length: 24 }, (_, j) => {
    const to = j % 2 === 0 ? 2 : 0;
    const from: Cell = [mbp.x0 + 5, meshY];
    const pts: Cell[] = to === 2 ? [from, [mbp.x0 + (bw >> 1) - 3, mbp.y1 + 1], [dh.x0 + 1, dh.y0 - 1], [dh.x0 + 5, dh.y0 + 5]] : [[mbp.x0 + 5, mbp.y0 - 1], [mbp.x0 + 5, mbp.y0 + 5]];
    return { at: 2.0 + 2.6 * j, id: `SYM-${413 + j}`, to, path: walk(pts) };
  });

  // ---- 3 Build: the worktree's terminal on m1, where the agent edits and the checks run -------
  const TB = rect(center(Math.min(CW, 62)), middle(20), Math.min(CW, 62), 20);
  const buildCycle = 10;

  // ---- 4 Review: the diff between a builder and a reviewer, going round until clean -----------
  const RW = Math.min(CW, 60);
  const RH = 16;
  const RB = rect(center(RW), middle(RH + 3) + 3, RW, RH);
  const labelY = RB.y0 - 3;
  const chanY = RB.y0 - 2;

  // ---- 5 Proof: the pull request, with screenshots, a video and a written account -------------
  const PW = Math.min(CW, 60);
  const th = compact ? 4 : tall ? 8 : 6;
  const vh = compact ? 5 : tall ? 9 : 7;
  const PH = 4 + th + 2 + vh + 2 + (tall ? 2 : 0);
  const PB = rect(center(PW), middle(PH), PW, PH);
  const pIn = PW - 4;
  const tw = Math.floor((pIn - 4) / 3);
  const thumbY = PB.y0 + (tall ? 4 : 3);
  const vidY = thumbY + th + 2;
  const vw = Math.floor((pIn - 3) / 2);

  // ---- 6 Merge: onto main, by the orchestrator only; a question to Ben when it needs one ------
  const MW = Math.min(CW, 60);
  const mx0 = center(MW);
  const qLines = wrap(QUESTION, MW - 6);
  const msgH = qLines.length + 6;
  const gap6 = compact ? 2 : tall ? 4 : 3;
  const mergeH = 1 + 1 + 2 + gap6 + 4 + gap6 + msgH;
  const yM = middle(mergeH) + 1;
  const yB = yM + 2;
  const yT = yB + gap6 + 1;
  const MSG = rect(mx0, yT + 4 + gap6, MW, msgH);
  const xh = mx0 + MW - 10; // the head of main, where the job lands
  const bx0 = mx0 + Math.floor(MW * 0.3);
  const dbX = MW >= 45 ? mx0 + MW - 10 : -1;

  // Where the job's id goes on each step, in order, and the frame that holds each step's focus.
  const ROUTES: Way[][] = [
    [{ x: Q.x0 + 4, y: qRow(OURS), after: 0 }],
    [
      { x: mbp.x0 + 5, y: meshY, after: 0 },
      { x: m1.x0 + 5, y: m1.y0 + 5, after: 0.62 },
    ],
    [{ x: TB.x0 + 9, y: TB.y0 + 1, after: 0 }],
    [{ x: RB.x0 + 9, y: RB.y0 + 1, after: 0 }],
    [{ x: PB.x0 + 11, y: PB.y0 + 1, after: 0 }],
    [
      { x: bx0, y: yB, after: 0 },
      { x: xh + 2, y: yM, after: 0.3 },
    ],
  ];
  const FRAMES: Rect[] = [Q, m1, TB, RB, PB, MSG];

  // ---- State -------------------------------------------------------------------------------------
  const N = cols * rows;
  const pic = new Grid(cols, rows);
  const last = { ch: new Array<string>(N).fill(""), a: new Float32Array(N), hot: new Uint8Array(N) };
  const old = { ch: new Array<string>(N).fill(""), a: new Float32Array(N), hot: new Uint8Array(N) };
  let at = 0;
  let staged = false;
  let since = 0;
  let time = 0;
  let origin: Cell = [cx, rows >> 1];
  let maxD = 1;
  // The job's id: where it is, where it is going, and when it got there.
  let tx = ROUTES[0][0].x;
  let ty = ROUTES[0][0].y;
  let route = ROUTES[0];
  let ri = 0;
  let acc = 0;
  let legSpeed = 0;
  let landed = -1; // since, when the id reached its place on this step
  const trail: { x: number; y: number; at: number }[] = [];
  // The frame: each edge walks to its target a cell at a time.
  const fr = [FRAMES[0].x0, FRAMES[0].y0, FRAMES[0].x1, FRAMES[0].y1];
  const fTo = [...fr];
  const fAcc = [0, 0, 0, 0];
  const fSpd = [0, 0, 0, 0];

  const tick = () => Math.floor(time * 24);
  // Seconds since the id landed on this step, or -1 until it has.
  const sinceLand = (s: number) => (landed < 0 ? -1 : s - landed);

  // Text that scrambles into place over dur seconds from start.
  function reveal(g: Grid, x: number, y: number, text: string, a: number, s: number, start: number, dur = 0.35, hot: boolean | Tone = false) {
    if (s < start) return;
    const p = (s - start) / dur;
    if (p >= 1) {
      g.put(x, y, text, a, hot);
      return;
    }
    for (let k = 0; k < text.length; k++) {
      if (text[k] === " ") continue;
      const settle = (k / Math.max(1, text.length)) * 0.6 + hash(x * 31 + k, y) * 0.3;
      if (p >= settle) g.put(x + k, y, text[k], a, hot);
      else if (p >= settle - 0.4) g.put(x + k, y, NOISE[(hash(x + k, y * 7 + tick()) * NOISE.length) | 0], a * 0.45);
    }
  }

  // ---- 1 -----------------------------------------------------------------------------------------
  function drawQueue(g: Grid, s: number) {
    const { x0, y0, x1 } = Q;
    g.put(x0 + 2, y0 + 1, "LINEAR", 0.5);
    g.put(x0 + 9, y0 + 1, "todo", 0.26);
    right(g, x1 - 2, y0 + 1, `symphony polling ${"|/-\\"[Math.floor(time * 8) % 4]}`, 0.3);
    for (let x = x0 + 1; x < x1; x++) g.put(x, y0 + 2, "-", 0.1);
    const land = sinceLand(s);
    const claimAt = land < 0 ? Infinity : Math.max(0.5, landed + 0.08);
    const loop = s - 1.5;
    const cyc = loop < 0 ? 0 : Math.floor(loop / qCycle);
    const u = loop < 0 ? -1 : loop - cyc * qCycle;
    const cycStart = 1.5 + cyc * qCycle;
    // The poller walks down from the top; claimed rows it passes are skipped.
    let cursor = -1;
    if (s < 0.9) cursor = Math.min(OURS, Math.floor(s / 0.15));
    else if (u >= 0) {
      const j = Math.floor(u / 2.2);
      const v = u - j * 2.2;
      if (j < qn - 3 && v < 0.12 * (3 + j) + 0.7) cursor = Math.min(3 + j, Math.floor(v / 0.12));
    }
    const titleW = x1 - 2 - 9 - 2 - (x0 + 13) + 1;
    for (let k = 0; k < qn; k++) {
      const y = qRow(k);
      const idN = 410 + k + (k > OURS && cyc > 0 ? cyc * (qn - 3) : 0);
      let claimed: string | null = null;
      let claimT = 0;
      if (k < OURS) claimed = k === 0 ? "codex-1" : "claude-1";
      else if (k === OURS) {
        if (s >= claimAt) (claimed = "claude-2"), (claimT = claimAt);
      } else if (u >= 0) {
        const ct = 2.2 * (k - 3) + 0.12 * k + 0.15;
        if (u >= ct) (claimed = AGENTS[(k - 3 + cyc * (qn - 3)) % AGENTS.length]), (claimT = cycStart + ct);
      }
      const title = TITLES[(idN - 410) % TITLES.length].slice(0, titleW);
      const ours = k === OURS;
      const fresh = k > OURS && cyc > 0 && s - cycStart < 0.5;
      if (!ours) {
        const a = claimed ? 0.3 : 0.55;
        if (fresh) reveal(g, x0 + 4, y, `SYM-${idN}`, a, s, cycStart, 0.45);
        else g.put(x0 + 4, y, `SYM-${idN}`, a);
      }
      const ta = ours ? (claimed ? 0.75 : 0.5) : claimed ? 0.22 : 0.42;
      if (fresh) reveal(g, x0 + 13, y, title, ta, s, cycStart, 0.45);
      else g.put(x0 + 13, y, title, ta);
      const passing = cursor === k;
      if (claimed) {
        const flash = s - claimT < 0.7;
        const a = ours ? 0.85 : passing ? 0.75 : flash ? 0.7 : 0.4;
        const text = claimed.padStart(9);
        if (s - claimT < 0.35) reveal(g, x1 - 10, y, text, a, s, claimT, 0.35, ours ? true : "violet");
        else g.put(x1 - 10, y, text, a, ours && flash ? true : "violet");
      } else g.put(x1 - 10, y, "todo".padStart(9), 0.25);
      if (passing) g.put(x0 + 2, y, ">", 0.9);
    }
  }

  // ---- 2 -----------------------------------------------------------------------------------------
  function drawMesh(g: Grid, s: number) {
    // The Tailscale mesh, with traffic stepping along each link.
    links.forEach((ln, i) => {
      for (const [x, y] of ln) g.put(x, y, ".", 0.2);
      const n = ln.length;
      const pos = Math.floor(time * 12 + i * 17) % (n * 2 + 8);
      if (pos < n * 2) {
        const idx = pos < n ? pos : n * 2 - 1 - pos;
        g.put(ln[idx][0], ln[idx][1], "*", 0.55, "blue");
      }
    });
    g.put(cx - 4, meshY + 1, "tailscale", 0.4, "blue");
    g.put(mbp.x0, mbp.y0 - 1, "agent-cloud", 0.4);
    box(g, mbp, 0.2);
    box(g, dh, 0.2);
    // Worktrees on each machine: the base set plus jobs that have arrived by now.
    const lists = BASE_WT.map((l) => l.map((id) => ({ id, at: -9 })));
    for (const e of events) {
      if (s < e.at) break;
      const p = Math.floor((s - e.at) * 26);
      if (p < e.path.length) {
        const [x, y] = e.path[p];
        g.put(x, y, e.id, 0.5);
      } else lists[e.to].push({ id: e.id, at: e.at + e.path.length / 26 });
    }
    MB.forEach((m, i) => {
      const r = m.r;
      g.put(r.x0 + 2, r.y0 + 1, m.name, i === 1 ? 0.8 : 0.6);
      g.put(r.x0 + 2, r.y0 + 2, m.kind, 0.28);
      if (i === 1) {
        g.put(r.x0 + 2, r.y0 + 4, `wt/${lists[1][0].id}`, 0.32);
        const land = sinceLand(s);
        if (land >= 0) reveal(g, r.x0 + 2, r.y0 + 5, "wt/", 0.8, s, landed, 0.3, land < 0.9);
        return;
      }
      const shown = lists[i].slice(-slots);
      shown.forEach((w, k) => {
        const y = r.y0 + 4 + k;
        if (s - w.at < 0.35) reveal(g, r.x0 + 2, y, `wt/${w.id}`, 0.45, s, w.at, 0.35);
        else g.put(r.x0 + 2, y, `wt/${w.id}`, 0.32);
      });
    });
    // A worktree is a checkout of its own: each shows its branch beside it on the big layout.
    if (!narrow && !compact) g.put(m1.x0 + 2, m1.y1 + 1, "own git worktree", sinceLand(s) >= 0 ? 0.3 : 0);
  }

  // ---- 3 -----------------------------------------------------------------------------------------
  function drawBuild(g: Grid, s: number) {
    const { x0, y0, x1 } = TB;
    const cyc = Math.floor(s / buildCycle);
    const u = s - cyc * buildCycle;
    const edit = EDITS[cyc % EDITS.length];
    g.put(x0 + 2, y0 + 1, "m1", 0.6);
    g.put(x0 + 6, y0 + 1, "wt/", 0.4);
    for (let x = x0 + 1; x < x1; x++) g.put(x, y0 + 2, "-", 0.1);
    g.put(x0 + 2, y0 + 3, "rules", 0.3);
    g.put(x0 + 9, y0 + 3, "AGENTS.md  CLAUDE.md", 0.42);
    // The agent types the change, then the repo's own checks run.
    const cps = 100;
    const t0 = 0.2;
    let budget = Math.max(0, Math.floor((u - t0) * cps));
    const total = edit.reduce((n, f) => n + f.lines.reduce((m, l) => m + l.length, 0), 0);
    const typedAt = t0 + total / cps;
    const out = u > buildCycle - 0.6; // the wave that clears the terminal for the next change
    let y = y0 + 5;
    let caret: Cell | null = null;
    for (const f of edit) {
      if (budget > 0 || f === edit[0]) g.put(x0 + 2, y, f.file, 0.45);
      y++;
      for (const ln of f.lines) {
        const n = Math.min(ln.length, budget);
        budget -= n;
        const minus = ln[0] === "-";
        const ctx = ln[0] === " ";
        if (out) {
          const p = (u - (buildCycle - 0.6)) / 0.6;
          for (let k = 0; k < n; k++)
            if (hash(k * 13 + y, 3) > p) g.put(x0 + 2 + k, y, ln[k], 0.3);
            else if (hash(k * 13 + y, tick()) > 0.7) g.put(x0 + 2 + k, y, NOISE[(hash(k, y + tick()) * 9) | 0], 0.2);
        } else if (n > 0) {
          g.put(x0 + 2, y, ln[0], minus ? 0.35 : ctx ? 0.2 : 0.7);
          g.put(x0 + 3, y, ln.slice(1, n), minus ? 0.3 : ctx ? 0.3 : 0.6);
        }
        if (n > 0 && n < ln.length) caret = [x0 + 2 + n, y];
        y++;
      }
      y++;
    }
    const agent = "claude";
    const status = u < typedAt ? "writing" : u < typedAt + 1.3 ? "checking" : "checks pass";
    right(g, x1 - 2, y0 + 1, status, status === "checks pass" ? 0.7 : 0.45, status === "checks pass" ? "green" : false);
    right(g, x1 - 3 - status.length, y0 + 1, agent, 0.6, "violet");
    if (caret && Math.floor(time * 3) % 2 === 0) g.put(caret[0], caret[1], "_", 0.9);
    // Checks: two columns, each a spinner until it passes.
    const cy0 = TB.y1 - 3;
    g.put(x0 + 2, cy0 - 1, "checks", 0.3);
    const colW = Math.floor((TB.x1 - TB.x0 - 4) / 2);
    CHECKS.forEach(([name, ok], k) => {
      const x = x0 + 2 + (k % 2) * colW;
      const yy = cy0 + (k >> 1);
      const st = typedAt + 0.15 + k * 0.25;
      const done = st + 0.4;
      g.put(x, yy, name, u >= st ? 0.5 : 0.25);
      const vx = x + 8;
      if (u >= done && !out) {
        if (u - done < 0.3) reveal(g, vx, yy, ok, 0.75, u, done, 0.3, "green");
        else g.put(vx, yy, ok, 0.75, "green");
      } else if (u >= st && !out) g.put(vx, yy, "|/-\\"[Math.floor(time * 10 + k) % 4], 0.6);
      else g.put(vx, yy, ".", 0.2);
    });
  }

  // ---- 4 -----------------------------------------------------------------------------------------
  function drawReview(g: Grid, s: number) {
    const { x0, y0, x1 } = RB;
    const a = Math.max(0.2, landed < 0 ? 0.2 : landed);
    const u = s - a;
    // Who is on each side of the review.
    g.put(x0, labelY, "claude", 0.65, "violet");
    g.put(x0 + 7, labelY, "builder", 0.3);
    const rev = "codex";
    const verdictAt = 2.7;
    const FIX = 1.15; // when the builder's fixes land
    const role = u >= verdictAt ? "approved" : "reviewer";
    right(g, x1, labelY, role, u >= verdictAt ? 0.6 : 0.3, u >= verdictAt ? "green" : false);
    right(g, x1 - role.length - 1, labelY, rev, 0.65, "violet");
    // The channel between them: findings go left, fixes come back.
    for (let x = x0; x <= x1; x += 2) g.put(x, chanY, ".", 0.12);
    const span = x1 - x0;
    const packet = (from: number, dur: number, text: string, leftward: boolean) => {
      if (u < from || u > from + dur) return;
      const p = clamp((u - from) / dur);
      const room = span - text.length;
      const x = leftward ? x1 - text.length + 1 - Math.floor(p * room) : x0 + Math.floor(p * room);
      g.put(x, chanY, text, 0.85);
    };
    packet(0.55, 0.5, "<< 2 findings", true);
    packet(1.6, 0.45, "fixed >>", false);
    // The diff, with the reviewer's reading line moving through it.
    g.put(x0 + 2, y0 + 1, "diff", 0.45);
    const round = u >= 2.05 ? 2 : 1;
    right(g, x1 - 2, y0 + 1, `round ${round}`, 0.45);
    for (let x = x0 + 1; x < x1; x++) g.put(x, y0 + 2, "-", 0.1);
    const scan = (from: number) => (u >= from && u < from + 0.45 ? Math.floor((u - from) / 0.07) : -1);
    let reading = scan(0) >= 0 ? scan(0) : scan(2.05);
    if (reading < 0 && u >= verdictAt + 1) {
      // After approval the reviewer keeps an eye on it: a slow dim pass every few seconds.
      const v = (u - verdictAt - 1) % 4;
      if (v < 1.2) reading = Math.floor(v / 0.2);
    }
    const lines = [...REVIEW_LINES, u >= FIX ? "+ Logger.warning(\"run timed out\")" : ""];
    lines.forEach((ln, k) => {
      const y = y0 + 4 + k;
      g.put(x0 + 2, y, String(40 + k), 0.18);
      if (!ln) return;
      const on = reading === k;
      const minus = ln[0] === "-";
      const base = minus ? 0.3 : 0.55;
      if (k === 5) {
        const n = Math.min(ln.length, Math.floor((u - FIX) * 70));
        g.put(x0 + 6, y, ln.slice(0, n), on ? 0.9 : 0.6);
      } else g.put(x0 + 6, y, ln, on ? Math.min(1, base + 0.35) : base);
      if (on) g.put(x0 + 5, y, ">", u >= verdictAt ? 0.4 : 0.8);
    });
    // Findings, marked on their lines and listed below.
    const notesY = y0 + 11;
    FINDINGS.forEach((f, k) => {
      const shown = u >= 0.07 * f.row + 0.1;
      if (!shown) return;
      const fixed = u >= FIX + k * 0.2;
      const y = y0 + 4 + f.row;
      g.put(x1 - 2, y, fixed ? "~" : "!", fixed ? 0.35 : 1, !fixed);
      const tag = `${fixed ? "~" : "!"} ${40 + f.row}`;
      g.put(x0 + 2, notesY + k, tag, fixed ? 0.3 : 0.9);
      if (fixed && u - (FIX + k * 0.2) < 0.4) reveal(g, x0 + 9, notesY + k, f.fixed, 0.5, u, FIX + k * 0.2, 0.4);
      else if (fixed) g.put(x0 + 9, notesY + k, f.fixed, 0.4);
      else g.put(x0 + 9, notesY + k, f.note, 0.7);
    });
    // The verdict.
    const vy = RB.y1 - 2;
    g.put(x0 + 2, vy, "verdict", 0.3);
    if (u >= verdictAt) reveal(g, x0 + 11, vy, "clean", 1, u, verdictAt, 0.35, "green");
    else if (u >= 0.4) g.put(x0 + 11, vy, round === 2 ? "re-reading" : u >= FIX ? "2 fixed" : "2 findings", 0.55);
    if (u >= verdictAt) g.put(x0 + 18, vy, "0 findings, round 2", 0.35);
  }

  // ---- 5 -----------------------------------------------------------------------------------------
  function drawProof(g: Grid, s: number) {
    const { x0, y0, x1 } = PB;
    g.put(x0 + 2, y0 + 1, "PR #231", 0.6);
    const n = Math.min(3, Math.max(0, Math.floor((s - 0.9) / 0.5) + 1));
    right(g, x1 - 2, y0 + 1, n === 3 ? "proof 3 of 3" : `proof ${n} of 3`, n === 3 ? 0.6 : 0.35);
    for (let x = x0 + 1; x < x1; x++) g.put(x, y0 + 2, "-", 0.1);
    // Screenshots develop a row at a time; one at a time is picked out afterwards.
    const pick = s > 3 ? Math.floor((s - 3) / 1.6) % 3 : -1;
    for (let k = 0; k < 3; k++) {
      const tx0 = x0 + 2 + k * (tw + 2);
      const st = 0.15 + k * 0.22;
      if (s < st) continue;
      const r = rect(tx0, thumbY, tw, th);
      box(g, r, pick === k ? 0.42 : 0.2);
      const rowsIn = th - 2;
      const shown = Math.floor((s - st) / 0.06);
      for (let yy = 0; yy < rowsIn; yy++) {
        if (yy >= shown) break;
        for (let xx = 0; xx < tw - 2; xx++) {
          let c = "";
          if (yy === 0) c = xx < 3 ? "o" : xx > tw - 7 ? "=" : "";
          else if (xx === 0) c = ":";
          else if (hash(xx + k * 40, yy) > 0.52 - (yy === 1 ? 0.3 : 0)) c = yy === 1 ? "#" : hash(xx, yy + k) > 0.5 ? "=" : "-";
          if (c) g.put(tx0 + 1 + xx, thumbY + 1 + yy, c, yy === shown - 1 && s - st < 0.5 ? 0.6 : 0.26);
        }
      }
    }
    if (s >= 0.4) g.put(x0 + 2, thumbY + th, "playwright", 0.45);
    if (s >= 0.4) g.put(x0 + 13, thumbY + th, "3 screenshots", 0.28);
    // The video: a play mark and a progress bar that loops.
    if (s >= 0.9) {
      const vr = rect(x0 + 2, vidY, vw, vh);
      box(g, vr, 0.2);
      const my = vidY + (vh >> 1) - 1;
      g.put(x0 + 2 + (vw >> 1) - 1, my, "|>", 0.7);
      const barW = vw - 4;
      const p = ((s - 0.9) % 7) / 7;
      const fill = Math.floor(p * barW);
      for (let x = 0; x < barW; x++) g.put(x0 + 4 + x, vidY + vh - 2, x < fill ? "=" : "-", x < fill ? 0.55 : 0.15);
      g.put(x0 + 2, vidY + vh, "video", 0.45);
      const secs = Math.floor(p * 31);
      g.put(x0 + 8, vidY + vh, `0:${String(secs).padStart(2, "0")} / 0:31`, 0.28);
    }
    // The written account, typed.
    const dx = x0 + 2 + vw + 3;
    const dw = x1 - 2 - dx + 1;
    if (s >= 1.1) {
      let budget = Math.floor((s - 1.1) * 70);
      // A blank line under the heading when there is room for it.
      const gapRow = vh > PROOF_DOC.length ? 1 : 0;
      let end: Cell = [dx, vidY];
      PROOF_DOC.forEach((ln, k) => {
        const text = (k === 0 ? ln : `- ${ln}`).slice(0, dw);
        const m = Math.min(text.length, budget);
        budget -= m;
        const y = vidY + k + (k > 0 ? gapRow : 0);
        g.put(dx, y, text.slice(0, m), k === 0 ? 0.6 : 0.42);
        if (m > 0) end = [dx + m, y];
      });
      if (Math.floor(time * 2.5) % 2 === 0) g.put(end[0] + 1, end[1], "_", 0.6);
      g.put(dx, vidY + vh, "PROOF.md", 0.45);
    }
  }

  // ---- 6 -----------------------------------------------------------------------------------------
  function drawMerge(g: Grid, s: number) {
    const land = sinceLand(s);
    // Main, with its earlier merges; the job's branch runs up into its head.
    g.put(mx0, yM, "main", 0.45);
    for (let x = mx0 + 6; x < xh; x++) g.put(x, yM, (xh - x) % 6 === 0 ? "o" : "-", (xh - x) % 6 === 0 ? 0.4 : 0.16);
    g.put(xh, yM, "o", land >= 0 ? 1 : 0.3, land >= 0 && land < 1.2);
    g.put(mx0, yB, "#231", 0.35);
    for (let x = bx0; x < xh - 1; x++) g.put(x, yB, "-", 0.16);
    g.put(xh - 1, yM + 1, "/", 0.3);
    if (land >= 0) reveal(g, xh + 2, yM - 1, "merged", 0.7, s, landed, 0.35, "green");
    // Who may do what.
    const t0 = 0.5;
    if (s >= t0) {
      reveal(g, mx0 + 15, yT, "merge", 0.3, s, t0);
      reveal(g, mx0 + 23, yT, "live db", 0.3, s, t0);
      const who = ["orchestrator", "claude", "codex"];
      // Every few seconds an agent reaches for one of them, and is turned away.
      const tryN = s >= 1.6 ? Math.floor((s - 1.6) / 2.4) : -1;
      const tryU = s >= 1.6 ? (s - 1.6) % 2.4 : 9;
      who.forEach((w, k) => {
        const y = yT + 1 + k;
        const st = t0 + 0.1 * (k + 1);
        const trying = k > 0 && tryN >= 0 && 1 + (tryN % 2) === k && tryU < 1.1;
        reveal(g, mx0, y, w, k === 0 ? 0.75 : trying ? 0.7 : 0.5, s, st, 0.35, k === 0 ? false : "violet");
        const yes = k === 0;
        reveal(g, mx0 + 15, y, yes ? "yes" : "no", yes ? 0.7 : trying ? 0.9 : 0.3, s, st);
        reveal(g, mx0 + 23, y, yes ? "yes" : "no", yes ? 0.7 : trying ? 0.9 : 0.3, s, st);
        if (trying && dbX > 0) {
          const reach = Math.min(dbX - mx0 - 29, Math.floor(tryU * 30));
          for (let x = 0; x < reach; x++) g.put(mx0 + 28 + x, y, "-", 0.35);
          if (reach >= dbX - mx0 - 29) g.put(mx0 + 28 + reach, y, "x", 0.9);
        }
      });
      if (dbX > 0 && s >= 0.8) {
        for (let x = mx0 + 28; x < dbX - 1; x++) g.put(x, yT + 1, "-", 0.3);
        g.put(dbX - 2, yT + 1, ">", 0.6);
        const cyl = [" _______ ", "(_______)", "|       |", "(_______)"];
        cyl.forEach((c, k) => {
          for (let i = 0; i < c.length; i++) if (c[i] !== " ") g.put(dbX + i - 1, yT + k, c[i], 0.35);
        });
        g.put(dbX, yT + 2, "live db", 0.55);
      }
    }
    // When a call needs a human: one plain question to Ben.
    const q0 = 1.4;
    const { x0, y0, x1 } = MSG;
    if (s >= q0 - 0.3) {
      g.put(x0 + 2, y0 + 1, "symphony", 0.55);
      g.put(x0 + 11, y0 + 1, "to ben", 0.35);
      right(g, x1 - 2, y0 + 1, "needs you", 0.8, s - q0 < 1.2);
      let budget = Math.floor((s - q0) * 55);
      qLines.forEach((ln, k) => {
        const m = Math.min(ln.length, Math.max(0, budget));
        budget -= m;
        g.put(x0 + 2, y0 + 3 + k, ln.slice(0, m), 0.8);
      });
      const oy = y0 + 3 + qLines.length + 1;
      if (budget > 0) {
        g.put(x0 + 2, oy, "[ yes, run it ]", 0.6);
        g.put(x0 + 20, oy, "[ not yet ]", 0.35);
        if (Math.floor(time * 2) % 2 === 0) g.put(x0 + 34, oy, "_", 0.7);
      }
    }
  }

  // ---- The six steps along the bottom -----------------------------------------------------------
  const PIPE = ["issue", "dispatch", "build", "review", "proof", "merge"];
  const pY = rows - 4;
  // On a very wide screen the strip keeps a readable length rather than spanning it all.
  const pw = Math.min(R - L - 8, 66);
  const pX0 = center(pw);
  const nodeX = PIPE.map((_, k) => pX0 + Math.round((k * pw) / 5));
  let pm = nodeX[0];
  let pAcc = 0;
  let pSpd = 0;
  function drawPipe(g: Grid) {
    const x0 = nodeX[0];
    const x1 = nodeX[5];
    for (let x = x0; x <= x1; x++) g.put(x, pY, x <= pm ? "=" : "-", x <= pm ? 0.3 : 0.12);
    PIPE.forEach((name, k) => {
      const x = nodeX[k];
      const here = k === at && pm === x;
      g.put(x, pY, "o", here ? 1 : x <= pm ? 0.45 : 0.22);
      g.put(x - (name.length >> 1), pY + 1, name, k === at ? 0.7 : 0.24);
    });
    if (pm !== nodeX[at]) g.put(pm, pY, "*", 0.9);
  }

  const DRAW = [drawQueue, drawMesh, drawBuild, drawReview, drawProof, drawMerge];

  function snapToken() {
    const w = route[route.length - 1];
    tx = w.x;
    ty = w.y;
    ri = route.length;
    landed = 0.6;
  }

  return {
    stage(n) {
      const k = clamp(Math.round(n), 0, ROUTES.length - 1);
      if (staged && k === at) return;
      staged = true;
      // What is on screen now becomes the picture the wave replaces.
      for (let i = 0; i < N; i++) old.ch[i] = last.ch[i];
      old.a.set(last.a);
      old.hot.set(last.hot);
      at = k;
      since = 0;
      route = ROUTES[k];
      ri = 0;
      acc = 0;
      legSpeed = 0;
      landed = -1;
      const f = FRAMES[k];
      [f.x0, f.y0, f.x1, f.y1].forEach((v, e) => {
        fTo[e] = v;
        fAcc[e] = 0;
        fSpd[e] = Math.max(24, Math.abs(v - fr[e]) / 0.5);
      });
      const end = route[route.length - 1];
      origin = [end.x + 3, end.y];
      maxD = Math.max(
        ...[
          [0, 0],
          [cols, 0],
          [0, rows],
          [cols, rows],
        ].map(([x, y]) => Math.hypot((x - origin[0]) * 0.6, y - origin[1])),
      );
      pAcc = 0;
      pSpd = Math.max(20, Math.abs(nodeX[k] - pm) / 0.6);
      if (reduced) {
        pm = nodeX[k];
        since = SETTLED[k];
        snapToken();
        for (let e = 0; e < 4; e++) fr[e] = fTo[e];
      }
    },
    step(dt) {
      since += dt;
      time += dt;
      // The job's id walks its route, a cell at a time.
      if (ri < route.length) {
        const w = route[ri];
        if (since >= w.after) {
          if (!legSpeed) legSpeed = Math.max(28, (Math.abs(w.x - tx) + Math.abs(w.y - ty)) / 0.5);
          acc += dt * legSpeed;
          while (acc >= 1 && (tx !== w.x || ty !== w.y)) {
            acc -= 1;
            trail.push({ x: tx + 3, y: ty, at: time });
            [tx, ty] = toward(tx, ty, w.x, w.y);
          }
          if (tx === w.x && ty === w.y) {
            ri++;
            acc = 0;
            legSpeed = 0;
            if (ri === route.length) landed = since;
          }
        }
      }
      while (trail.length && time - trail[0].at > 0.4) trail.shift();
      // The marker on the strip of steps walks to this one.
      if (pm !== nodeX[at]) {
        pAcc += dt * pSpd;
        while (pAcc >= 1 && pm !== nodeX[at]) {
          pAcc -= 1;
          pm += Math.sign(nodeX[at] - pm);
        }
      }
      // The frame's edges walk to their places.
      for (let e = 0; e < 4; e++) {
        if (fr[e] === fTo[e]) continue;
        fAcc[e] += dt * fSpd[e];
        while (fAcc[e] >= 1 && fr[e] !== fTo[e]) {
          fAcc[e] -= 1;
          fr[e] += Math.sign(fTo[e] - fr[e]);
        }
        if (fr[e] === fTo[e]) fAcc[e] = 0;
      }
    },
    draw(g: Grid) {
      pic.clear();
      DRAW[at](pic, since);
      // The wave: cells near where the job lands change first, each scrambling once on the way.
      const morphing = !reduced && since < MORPH;
      const tk = tick();
      for (let i = 0; i < N; i++) {
        let c = pic.ch[i];
        let a = pic.a[i];
        let h = pic.hot[i];
        if (morphing) {
          const oc = old.ch[i];
          if (oc !== c || (c && Math.abs(old.a[i] - a) > 0.25)) {
            const x = i % cols;
            const y = (i / cols) | 0;
            const d = Math.hypot((x - origin[0]) * 0.6, y - origin[1]) / maxD;
            const settle = 0.05 + 0.62 * d + 0.12 * hash(i, 5);
            if (since < settle - 0.16) {
              c = oc;
              a = old.a[i];
              h = old.hot[i];
            } else if (since < settle) {
              // The wavefront: most cells scramble once, some just clear.
              c = (oc || c) && hash(i, tk + 1) > 0.3 ? NOISE[(hash(i, tk) * NOISE.length) | 0] : "";
              a = 0.12 + 0.22 * hash(i, 3);
              h = 0;
            }
          }
        }
        g.ch[i] = c;
        g.a[i] = a;
        g.hot[i] = h;
        last.ch[i] = c;
        last.a[i] = a;
        last.hot[i] = h;
      }
      // The frame, then the job's id and the short trail it leaves.
      box(g, { x0: fr[0], y0: fr[1], x1: fr[2], y1: fr[3] }, 0.24);
      for (const p of trail) {
        const i = p.y * cols + p.x;
        if (p.x < 0 || p.x >= cols || p.y < 0 || p.y >= rows || (g.ch[i] && g.ch[i] !== " ")) continue;
        if (p.y === ty && p.x >= tx && p.x < tx + TOKEN.length) continue;
        g.put(p.x, p.y, ".", 0.4 * (1 - (time - p.at) / 0.4));
      }
      g.put(tx, ty, TOKEN, 1, true);
      // Label and where we are in the six steps.
      g.put(2, 1, "SYMPHONY", 0.5);
      if (pipe) drawPipe(g);
      else {
        const bar = 6 * 3 - 1;
        for (let k = 0; k < 6; k++) g.put(cols - 2 - bar + k * 3, 1, k === at ? "==" : "--", k === at ? 0.8 : k < at ? 0.32 : 0.16);
      }
    },
  };
}
