"use client";

import { useEffect, useRef } from "react";
import { onThemeChange, readPalette } from "./theme";
import { WORDMARK_WEIGHT } from "./type";

// The name set across the full width in characters: Geist rasterised at cell resolution,
// coverage mapped to a density ramp. It resolves out of noise the first time it scrolls into
// view; the pointer pushes cells aside, a whole cell at a time, and they spring back.

const RAMP = " .,:;-=+*"; // edges, by coverage
const FILL = "=+*x#"; // the solid body of the letters, a slow texture
const NOISE = "#%&*+=-/<>0123456789";
const ASPECT = 0.6;

type Cell = { x: number; y: number; cov: number; dx: number; dy: number; vx: number; vy: number; delay: number; heat: number; col: number; row: number };

function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function Wordmark({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let dpr = 1;
    let cellW = 0;
    let cellH = 0;
    let cells: Cell[] = [];
    let sprites: HTMLCanvasElement[] = [];
    let fill: HTMLCanvasElement[] = [];
    let noise: HTMLCanvasElement[] = [];
    let family = "sans-serif";
    let mono = "monospace";
    let raf = 0;
    let last = 0;
    let time = 0;
    let introAt = reduced ? -100 : Infinity; // set when first seen
    let visible = false;
    let cancelled = false;
    let ink = readPalette().ink;
    const pointer = { x: -1e4, y: -1e4, on: false };

    function glyphs(chars: string) {
      return Array.from(chars, (ch) => {
        const s = document.createElement("canvas");
        s.width = Math.ceil(cellW * dpr) + 2;
        s.height = Math.ceil(cellH * dpr);
        const g = s.getContext("2d")!;
        g.fillStyle = ink;
        g.font = `500 ${cellH * 0.92 * dpr}px ${mono}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, s.width / 2, s.height / 2 + cellH * dpr * 0.04);
        return s;
      });
    }

    function build() {
      W = canvas.clientWidth;
      if (!W) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      // On a phone one line would be too thin to read, so the name breaks after the first word.
      const lines = W < 700 ? text.split(" ") : [text];
      cellW = W < 700 ? Math.max(3.2, W / 104) : Math.max(3.6, Math.min(7, W / 250));
      cellH = cellW / ASPECT;
      const cols = Math.floor(W / cellW);

      // Size the type so the longest line spans the full width.
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.font = `${WORDMARK_WEIGHT} 100px ${family}`;
      const ms = lines.map((l) => probe.measureText(l));
      const widest = ms.reduce((a, b) => (b.actualBoundingBoxRight + b.actualBoundingBoxLeft > a.actualBoundingBoxRight + a.actualBoundingBoxLeft ? b : a));
      const fs = ((cols * cellW) / (widest.actualBoundingBoxRight + widest.actualBoundingBoxLeft)) * 100;
      const asc = (Math.max(...ms.map((m) => m.actualBoundingBoxAscent)) / 100) * fs;
      const desc = (Math.max(...ms.map((m) => m.actualBoundingBoxDescent)) / 100) * fs;
      const lineH = asc + desc * (lines.length > 1 ? 0.6 : 1);
      const rows = Math.ceil((lineH * lines.length + (lines.length > 1 ? desc * 0.4 : 0)) / cellH) + 1;
      const H = rows * cellH;

      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      const r = document.createElement("canvas");
      r.width = Math.ceil(cols * cellW);
      r.height = Math.ceil(H);
      const g = r.getContext("2d", { willReadFrequently: true })!;
      g.fillStyle = "#fff";
      g.font = `${WORDMARK_WEIGHT} ${fs}px ${family}`;
      g.textBaseline = "alphabetic";
      lines.forEach((l, k) => g.fillText(l, (ms[k].actualBoundingBoxLeft / 100) * fs, cellH * 0.5 + asc + k * lineH));
      const data = g.getImageData(0, 0, r.width, r.height).data;

      const ox = (W - cols * cellW) / 2;
      cells = [];
      for (let row = 0; row < rows; row++) {
        for (let c = 0; c < cols; c++) {
          const x0 = Math.floor(c * cellW);
          const x1 = Math.floor((c + 1) * cellW);
          const y0 = Math.floor(row * cellH);
          const y1 = Math.min(r.height, Math.floor((row + 1) * cellH));
          let sum = 0;
          let n = 0;
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              sum += data[(y * r.width + x) * 4 + 3];
              n++;
            }
          }
          const cov = n ? sum / n / 255 : 0;
          if (cov < 0.06) continue;
          cells.push({ x: ox + c * cellW, y: row * cellH, cov, dx: 0, dy: 0, vx: 0, vy: 0, delay: (c / cols) * 0.9 + Math.random() * 0.35, heat: 0, col: c, row });
        }
      }
      sprites = glyphs(RAMP);
      fill = glyphs(FILL);
      noise = glyphs(NOISE);
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const it = time - introAt;
      for (const c of cells) {
        let alpha: number;
        let s: HTMLCanvasElement;
        if (c.cov > 0.92) {
          // Inside a letter: a texture that drifts slowly, so the name looks woven, not stamped.
          const n = hash(c.col + Math.floor(time * 0.7 + hash(c.col, c.row) * 3), c.row);
          s = fill[Math.min(FILL.length - 1, (n * FILL.length) | 0)];
          alpha = 0.78 + 0.22 * n;
        } else {
          s = sprites[Math.max(1, Math.round(c.cov * (RAMP.length - 1)))];
          alpha = 0.25 + 0.6 * c.cov;
        }
        if (it < 2.2) {
          const p = Math.min(1, Math.max(0, (it - c.delay) / 0.5));
          if (p <= 0) continue;
          alpha *= p;
          if (p < 0.8) s = noise[(Math.random() * noise.length) | 0];
        }
        if (c.heat > 0.15 && Math.random() < c.heat) s = noise[(Math.random() * noise.length) | 0];
        ctx.globalAlpha = alpha;
        // Pushed cells jump from cell to cell rather than sliding, so the name stays on its grid.
        const gx = c.x + Math.round(c.dx / cellW) * cellW;
        const gy = c.y + Math.round(c.dy / cellH) * cellH;
        ctx.drawImage(s, Math.round(gx * dpr) - 1, Math.round(gy * dpr));
      }
      ctx.globalAlpha = 1;
    }

    function step(dt: number) {
      time += dt;
      const R = Math.max(70, cellH * 7);
      for (const c of cells) {
        let fx = -c.dx * 70 - c.vx * 11;
        let fy = -c.dy * 70 - c.vy * 11;
        if (pointer.on) {
          const ex = c.x + cellW / 2 - pointer.x;
          const ey = c.y + cellH / 2 - pointer.y;
          const d = Math.hypot(ex, ey);
          if (d < R && d > 0.001) {
            const f = Math.pow(1 - d / R, 2) * 5200;
            fx += (ex / d) * f;
            fy += (ey / d) * f;
            c.heat = Math.min(1, c.heat + dt * 6 * (1 - d / R));
          }
        }
        c.heat = Math.max(0, c.heat - dt * 1.8);
        c.vx += fx * dt;
        c.vy += fy * dt;
        c.dx += c.vx * dt;
        c.dy += c.vy * dt;
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.04, (now - (last || now)) / 1000);
      last = now;
      step(dt);
      render();
      raf = visible && !document.hidden && !cancelled ? requestAnimationFrame(frame) : 0;
    }

    function start() {
      if (reduced || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible && introAt === Infinity) introAt = time;
        if (visible) start();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    const ro = new ResizeObserver(() => {
      if (canvas.clientWidth === W) return;
      build();
      render();
    });
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = true;
    };
    const leave = () => (pointer.on = false);
    const onVis = () => start();

    (async () => {
      family = getComputedStyle(canvas).getPropertyValue("--font-geist-sans").trim() || getComputedStyle(canvas).fontFamily || "sans-serif";
      mono = getComputedStyle(canvas).getPropertyValue("--font-geist-mono").trim() || "monospace";
      try {
        await Promise.all([document.fonts.load(`${WORDMARK_WEIGHT} 100px ${family}`), document.fonts.load(`500 12px ${mono}`)]);
      } catch {
        // use whatever resolves
      }
      if (cancelled) return;
      build();
      render();
      io.observe(canvas);
      ro.observe(canvas);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerleave", leave);
      canvas.addEventListener("pointercancel", leave);
      document.addEventListener("visibilitychange", onVis);
    })();

    const stopTheme = onThemeChange((p) => {
      ink = p.ink;
      sprites = glyphs(RAMP);
      fill = glyphs(FILL);
      noise = glyphs(NOISE);
      render();
    });

    return () => {
      cancelled = true;
      stopTheme();
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [text]);

  return <canvas ref={ref} role="img" aria-label={text} data-weight={WORDMARK_WEIGHT} />;
}
