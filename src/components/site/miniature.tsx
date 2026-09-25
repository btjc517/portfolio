"use client";

import { useEffect, useRef } from "react";
import { ASPECT, clamp, Grid, type Sim } from "./ascii/grid";
import { onThemeChange, readPalette } from "./theme";
import { SCENES, type SceneKind } from "./ascii/scenes";

// Draws one ASCII scene into a canvas. Scenes run only while on screen, speed up while their
// tile is hovered, and hold a single frame under reduced motion. When `kind` changes the scene
// scrambles into the next one, a cell at a time, rather than cutting. `rows` is roughly how many
// rows of characters to fit, and `maxCell` caps the row height, so a large screen can show the
// same scene with bigger characters rather than a sparse one.
//
// With `field` set, the scene runs in a window in the middle of the canvas and the rest is a field
// of dim, shifting characters. Both edges of the field are ragged and move: the outer one
// dissolves into the page, and the inner one now and then creeps a cell or two into the scene's
// empty cells, never over what the scene draws.

const SWITCH = 0.55; // seconds the scramble between scenes takes
const NOISE = ".:;+=*x#%";
const FIELD = ".,:;-=+*x#%";

function hash(i: number, j: number) {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth value noise in three dimensions, in [0, 1].
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const s = (v: number) => v * v * (3 - 2 * v);
  const fx = s(x - xi);
  const fy = s(y - yi);
  const fz = s(z - zi);
  const h = (a: number, b: number, c: number) => hash(a + c * 7919, b - c * 104729);
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const plane = (zz: number) =>
    lerp(lerp(h(xi, yi, zz), h(xi + 1, yi, zz), fx), lerp(h(xi, yi + 1, zz), h(xi + 1, yi + 1, zz), fx), fy);
  return lerp(plane(zi), plane(zi + 1), fz);
}
const fbm = (x: number, y: number, z: number) => vnoise(x, y, z) * 0.65 + vnoise(x * 2.1 + 17, y * 2.1 + 5, z * 1.7) * 0.35;

export function Miniature({
  kind,
  label,
  rows = 24,
  maxCell = 15,
  field = false,
}: {
  kind: SceneKind;
  label: string;
  rows?: number;
  maxCell?: number;
  field?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const kindRef = useRef(kind);
  const sizeRef = useRef({ rows, maxCell, field });
  sizeRef.current = { rows, maxCell, field };
  const switchRef = useRef<((k: SceneKind) => void) | null>(null);

  useEffect(() => {
    kindRef.current = kind;
    switchRef.current?.(kind);
  }, [kind]);

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
    let cols = 0;
    let rowsN = 0;
    // The scene's window inside the canvas grid, as a margin in cells (none without a field).
    let mx = 0;
    let my = 0;
    let grid: Grid | null = null;
    let sim: Sim | null = null;
    let current: SceneKind = kindRef.current;
    let sprites = new Map<string, HTMLCanvasElement>();
    let family = "monospace";
    let raf = 0;
    let last = 0;
    let t = 0;
    let switchedAt = -Infinity;
    let speed = 1;
    let speedTarget = 1;
    let visible = false;
    let cancelled = false; // set on unmount, so a setup still awaiting fonts never draws
    let palette = readPalette();

    function sprite(ch: string, hot: boolean) {
      const key = hot ? "!" + ch : ch;
      let s = sprites.get(key);
      if (s) return s;
      s = document.createElement("canvas");
      s.width = Math.ceil(cellW * dpr) + 2;
      s.height = Math.ceil(cellH * dpr);
      const g = s.getContext("2d")!;
      g.fillStyle = hot ? palette.accent : palette.ink;
      g.font = `400 ${cellH * 0.86 * dpr}px ${family}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(ch, s.width / 2, s.height / 2 + cellH * dpr * 0.04);
      sprites.set(key, s);
      return s;
    }

    function start(k: SceneKind) {
      if (!grid) return;
      current = k;
      sim = SCENES[k](grid.cols, grid.rows);
      // Warm up so the first frame is mid-flow rather than empty.
      for (let n = 0; n < (reduced ? 240 : 90); n++) sim.step(1 / 30, t);
    }

    function build() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cellH = clamp(Math.round(H / sizeRef.current.rows), 10, sizeRef.current.maxCell);
      cellW = cellH * ASPECT;
      cols = Math.floor(W / cellW);
      rowsN = Math.floor(H / cellH);
      ox = (W - cols * cellW) / 2;
      oy = (H - rowsN * cellH) / 2;
      mx = sizeRef.current.field ? Math.max(3, Math.round(cols * 0.15)) : 0;
      my = sizeRef.current.field ? Math.max(2, Math.round(rowsN * 0.12)) : 0;
      grid = new Grid(cols - 2 * mx, rowsN - 2 * my);
      sprites = new Map();
      start(current);
    }

    // How strongly the field shows at a cell, and which character it shows there. The field is a
    // cloud rather than a frame: densest where it closes round the scene, thinning out towards
    // the edges of the canvas, with a clearing that wobbles in and out in slow lobes and density
    // that comes in patches.
    function fieldAt(c: number, r: number): [number, string] {
      // Distance into the scene's window (positive inside), with its corners rounded off, and
      // distance to the canvas edge, both in row heights.
      const band = Math.min(mx * ASPECT, my);
      const rad = band * 1.3;
      const hx = ((cols - 2 * mx) * ASPECT) / 2;
      const hy = (rowsN - 2 * my) / 2;
      const qx = Math.abs((c + 0.5 - cols / 2) * ASPECT) - (hx - rad);
      const qy = Math.abs(r + 0.5 - rowsN / 2) - (hy - rad);
      const e = -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad);
      const o = Math.min((c + 0.5) * ASPECT, (cols - c - 0.5) * ASPECT, r + 0.5, rowsN - r - 0.5);
      const drift = t * 0.14;
      const wobble = (fbm(c * 0.07 + 40, r * 0.11, drift) - 0.5) * 2.6;
      const reach = Math.pow(fbm(c * 0.19 + 3, r * 0.3, drift * 1.8), 3) * 2.2;
      const inner = clamp((-0.5 + wobble + reach - e) / 1.1);
      const rim = 0.2 + 1.2 * fbm(c * 0.09, r * 0.15 + 30, drift * 0.8);
      const outer = clamp((o - rim) / (band * 0.9));
      const w = inner * (0.25 + 0.75 * outer);
      if (w <= 0.03 || o < rim) return [0, ""];
      const dens = fbm(c * 0.11 + 9, r * 0.18, drift * 1.2);
      // Each cell re-rolls at its own slow rate, in place: whether it shows, and what it shows.
      const roll = Math.floor(t * (0.35 + 1.9 * hash(c + 7, r)) + hash(r, c) * 13);
      const coin = hash(c * 17 + roll, r * 31 - roll);
      if (coin > w * (0.42 + 0.8 * dens)) return [0, ""];
      const k = clamp(dens * 0.7 + hash(c * 5 - roll, r * 11 + roll) * 0.45);
      return [0.1 + 0.3 * w * dens, FIELD[Math.min(FIELD.length - 1, Math.floor(k * FIELD.length))]];
    }

    function render() {
      if (!grid || !sim) return;
      grid.clear();
      sim.draw(grid, t);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { ch, a, hot } = grid;
      const gc = grid.cols;
      const gr = grid.rows;
      const p = (t - switchedAt) / SWITCH;
      const tick = Math.floor(t * 24);
      const hasField = mx > 0;
      for (let r = 0; r < rowsN; r++) {
        for (let c = 0; c < cols; c++) {
          const sc = c - mx;
          const sr = r - my;
          let glyph = "";
          let alpha = 0;
          let isHot = false;
          if (sc >= 0 && sc < gc && sr >= 0 && sr < gr) {
            const i = sr * gc + sc;
            glyph = ch[i];
            alpha = a[i];
            isHot = hot[i] === 1;
            if (p < 1) {
              // Mid-switch: each cell settles at its own moment, sweeping left to right.
              const settle = hash(i, 7) * 0.55 + (sc / gc) * 0.45;
              if (p < settle) {
                if (!glyph && hash(i, tick) > 0.3) glyph = "";
                else {
                  glyph = NOISE[(hash(i, tick + 1) * NOISE.length) | 0];
                  alpha = 0.18 + 0.3 * hash(i, 3);
                  isHot = false;
                }
              }
            }
          }
          if (hasField && (!glyph || glyph === " " || alpha < 0.02)) {
            // Keep a clear cell either side of anything the scene draws, so the field never
            // touches its text.
            const near = (k: number) => sr >= 0 && sr < gr && k >= 0 && k < gc && !!ch[sr * gc + k] && ch[sr * gc + k] !== " " && a[sr * gc + k] >= 0.02;
            if (near(sc - 1) || near(sc + 1)) glyph = "";
            else {
              [alpha, glyph] = fieldAt(c, r);
              isHot = false;
            }
          }
          if (!glyph || glyph === " " || alpha < 0.02) continue;
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(sprite(glyph, isHot), Math.round((ox + c * cellW) * dpr) - 1, Math.round((oy + r * cellH) * dpr));
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      speed += (speedTarget - speed) * Math.min(1, dt * 4);
      t += dt * speed;
      sim?.step(dt * speed, t);
      render();
      raf = visible && !document.hidden && !cancelled ? requestAnimationFrame(frame) : 0;
    }

    function loop() {
      if (reduced || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    switchRef.current = (k: SceneKind) => {
      if (k === current || !grid) return;
      start(k);
      switchedAt = reduced ? -Infinity : t;
      if (reduced || !raf) render();
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible) loop();
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
    const onVis = () => loop();
    const stopTheme = onThemeChange((p) => {
      palette = p;
      sprites = new Map();
      render();
    });

    (async () => {
      family = getComputedStyle(canvas).fontFamily || "monospace";
      try {
        await document.fonts.load(`400 12px ${family}`);
      } catch {
        // use whatever resolves
      }
      if (cancelled) return;
      current = kindRef.current;
      build();
      render();
      io.observe(canvas);
      ro.observe(canvas);
      tile?.addEventListener("pointerenter", enter);
      tile?.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", onVis);
    })();

    return () => {
      cancelled = true;
      stopTheme();
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      switchRef.current = null;
      io.disconnect();
      ro.disconnect();
      tile?.removeEventListener("pointerenter", enter);
      tile?.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} role="img" aria-label={label} style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }} />;
}
