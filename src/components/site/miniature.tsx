"use client";

import { useEffect, useRef } from "react";
import { ASPECT, clamp, Grid, type Sim } from "./ascii/grid";
import { onThemeChange, readPalette } from "./theme";
import { SCENES, type SceneKind } from "./ascii/scenes";

// Draws one ASCII scene into a canvas. Scenes run only while on screen, speed up while their
// tile is hovered, and hold a single frame under reduced motion. When `kind` changes the scene
// scrambles into the next one, a cell at a time, rather than cutting.

const SWITCH = 0.55; // seconds the scramble between scenes takes
const NOISE = ".:;+=*x#%";

function hash(i: number, j: number) {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function Miniature({ kind, label }: { kind: SceneKind; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const kindRef = useRef(kind);
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
      cellH = clamp(Math.round(H / 24), 10, 15);
      cellW = cellH * ASPECT;
      const cols = Math.floor(W / cellW);
      const rows = Math.floor(H / cellH);
      ox = (W - cols * cellW) / 2;
      oy = (H - rows * cellH) / 2;
      grid = new Grid(cols, rows);
      sprites = new Map();
      start(current);
    }

    function render() {
      if (!grid || !sim) return;
      grid.clear();
      sim.draw(grid, t);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { cols, rows, ch, a, hot } = grid;
      const p = (t - switchedAt) / SWITCH;
      const tick = Math.floor(t * 24);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          let glyph = ch[i];
          let alpha = a[i];
          let isHot = hot[i] === 1;
          if (p < 1) {
            // Mid-switch: each cell settles at its own moment, sweeping left to right.
            const settle = hash(i, 7) * 0.55 + (c / cols) * 0.45;
            if (p < settle) {
              if (!glyph && hash(i, tick) > 0.3) continue;
              glyph = NOISE[(hash(i, tick + 1) * NOISE.length) | 0];
              alpha = 0.18 + 0.3 * hash(i, 3);
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
