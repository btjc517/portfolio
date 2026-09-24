"use client";

import { useEffect, useRef } from "react";
import { onThemeChange, readPalette } from "./theme";
import { WORDMARK_WEIGHT } from "./type";

// The name set across the full width in characters: Geist rasterised at cell resolution,
// coverage mapped to a density ramp. It resolves out of noise the first time it scrolls into
// view; the pointer pushes cells aside, a whole cell at a time, and they spring back.
//
// The canvas is larger than the name: it reaches EXT rows above and below it and across the page
// margins, and ignores the pointer so the links around it stay clickable. A pushed character can
// move at most PUSH_ROWS / PUSH_COLS cells, always inside that room, so none is ever cut off at an
// edge; and each cell of the grid shows one character, so pushed characters never stack.

const RAMP = " .,:;-=+*"; // edges, by coverage
const FILL = "=+*x#"; // the solid body of the letters, a slow texture
const NOISE = "#%&*+=-/<>"; // intro and heat scramble; no digits, which read as stray numbers
const ASPECT = 0.6;
const EXT = 7; // rows of room above and below the name
const PUSH_ROWS = 6; // furthest a character can be pushed, in rows
const PUSH_COLS = 10; // and in columns

type Cell = { x: number; y: number; cov: number; dx: number; dy: number; vx: number; vy: number; delay: number; heat: number; col: number; row: number };

function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function Wordmark({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    const boxEl = boxRef.current;
    if (!canvasEl || !boxEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const box: HTMLDivElement = boxEl;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0; // width of the name's own box
    let CW = 0; // width of the canvas, across the page margins
    let colsAll = 0;
    let rowsAll = 0;
    let gx0 = 0; // x of grid column 0 in the canvas
    let occA = new Float32Array(0); // per grid cell: alpha of the character drawn there this frame
    let occS: (HTMLCanvasElement | null)[] = [];
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
      W = box.clientWidth;
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

      // The name's box keeps the name's height; the canvas adds EXT rows above and below and
      // spans the page margins either side.
      box.style.height = `${H}px`;
      const inset = box.getBoundingClientRect().left - (box.parentElement?.getBoundingClientRect().left ?? 0);
      CW = W + 2 * inset;
      const CH = H + 2 * EXT * cellH;
      // The canvas is positioned in the box's parent, the full-width .wordmark, from its left edge.
      canvas.style.left = "0px";
      canvas.style.width = `${CW}px`;
      canvas.style.top = `${-EXT * cellH}px`;
      canvas.style.height = `${CH}px`;
      canvas.width = Math.round(CW * dpr);
      canvas.height = Math.round(CH * dpr);
      gx0 = (inset + (W - cols * cellW) / 2) % cellW;
      colsAll = Math.ceil((CW - gx0) / cellW);
      rowsAll = rows + 2 * EXT;
      occA = new Float32Array(colsAll * rowsAll);
      occS = new Array(colsAll * rowsAll).fill(null);

      const r = document.createElement("canvas");
      r.width = Math.ceil(cols * cellW);
      r.height = Math.ceil(H);
      const g = r.getContext("2d", { willReadFrequently: true })!;
      g.fillStyle = "#fff";
      g.font = `${WORDMARK_WEIGHT} ${fs}px ${family}`;
      g.textBaseline = "alphabetic";
      lines.forEach((l, k) => g.fillText(l, (ms[k].actualBoundingBoxLeft / 100) * fs, cellH * 0.5 + asc + k * lineH));
      const data = g.getImageData(0, 0, r.width, r.height).data;

      const ox = inset + (W - cols * cellW) / 2;
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
          cells.push({ x: ox + c * cellW, y: (row + EXT) * cellH, cov, dx: 0, dy: 0, vx: 0, vy: 0, delay: (c / cols) * 0.9 + Math.random() * 0.35, heat: 0, col: c, row });
        }
      }
      sprites = glyphs(RAMP);
      fill = glyphs(FILL);
      noise = glyphs(NOISE);
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      occA.fill(0);
      occS.fill(null);
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
        // Pushed cells jump from cell to cell rather than sliding, within the room the canvas has.
        const col = Math.round((c.x - gx0) / cellW) + Math.max(-PUSH_COLS, Math.min(PUSH_COLS, Math.round(c.dx / cellW)));
        const row = Math.round(c.y / cellH) + Math.max(-PUSH_ROWS, Math.min(PUSH_ROWS, Math.round(c.dy / cellH)));
        if (col < 0 || col >= colsAll || row < 0 || row >= rowsAll) continue;
        // One character per cell: where two land on the same cell, the stronger one shows.
        const k = row * colsAll + col;
        if (alpha <= occA[k]) continue;
        occA[k] = alpha;
        occS[k] = s;
      }
      for (let k = 0; k < occS.length; k++) {
        const s = occS[k];
        if (!s) continue;
        ctx.globalAlpha = occA[k];
        ctx.drawImage(s, Math.round((gx0 + (k % colsAll) * cellW) * dpr) - 1, Math.round(Math.floor(k / colsAll) * cellH * dpr));
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
            const f = Math.pow(1 - d / R, 2) * 5200 * (cellH / 11.7);
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
      if (box.clientWidth === W) return;
      build();
      render();
    });
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
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
      io.observe(box);
      ro.observe(box);
      window.addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      window.addEventListener("pointercancel", leave);
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
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [text]);

  return (
    <>
      <div ref={boxRef} role="img" aria-label={text} />
      <canvas
        ref={ref}
        aria-hidden="true"
        data-weight={WORDMARK_WEIGHT}
        data-ext={EXT}
        style={{ position: "absolute", display: "block", pointerEvents: "none" }}
      />
    </>
  );
}
