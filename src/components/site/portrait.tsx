"use client";

import { useEffect, useRef } from "react";

// Ben, drawn in characters from a living photograph.
//
// Source: public/cv/portrait.mp4, a generated clip of the CV photograph with a per-frame person
// mask packed beside the picture (picture on the left half, mask on the right, made by
// scripts/portrait-mask-frames.swift). The still photograph stands in until the clip plays, and
// for good when it cannot (reduced motion, iOS low power mode).
//
// Each cell is sampled as a 2 by 3 grid of brightness values and matched against the shapes of
// the glyphs themselves, so edges get the character that follows them (/ \ | ( ) _) rather than
// one picked by density alone. That is the technique in alexharri.com/blog/ascii-rendering.
// The face is tone-mapped on its own each frame so the eyes and mouth read; the room is pushed
// far back and the shirt fades out toward the bottom, so the face is always the brightest thing.
// A cell only changes glyph when the picture has really changed, which keeps video noise from
// turning into flicker.

const STILL = "/cv/neutral.png"; // R luminance, G person mask
const BLINK = "/cv/blink.png"; // R luminance with the eyes closed, B the eye region
const VIDEO = "/cv/portrait.mp4";
const VIDEO_WAIT = 4000;
const CLIP_FPS = 24;

const SRC_ASPECT = 3 / 4; // the photograph and each half of the clip
const CROP = { y0: 0.1, y1: 1 }; // fraction of the frame height shown
// Rows sit closer than the font's own line height, so glyphs nearly touch top to bottom and the
// gaps between rows do not read as scanlines. A cell is ADVANCE wide and LEADING tall, as
// fractions of the font size.
const ADVANCE = 0.6;
const LEADING = 0.72;
const CELL_ASPECT = ADVANCE / LEADING;
const SX = 2; // sub-samples per cell, across
const SY = 3; // and down
const LEVELS = 8; // quantisation per sub-sample for the glyph lookup table
// Flat cells take their glyph from a density ramp by brightness alone. Cells with an edge in
// them are matched by shape against the ramp plus a set of glyphs that draw lines.
// Ordered by measured ink in Geist Mono; no - or =, whose runs draw lines across the face.
const RAMP = " .:;+*xo#%&@";
const EDGES = "/\\|_()<>^'`,;!";

const GROUND = "#0b0b0c";
const INK = "#ecebe6";

const BODY_FADE = [0.5, 0.98]; // the shirt fades out between these fractions of the height
const FACE_ROWS = 0.6; // the tone range comes from the person above this fraction of the height

// Look controls, exposed for tuning on /lab/hero.
export type Tune = {
  ramp?: string;
  edges?: string;
  flat?: number; // brightness range inside a cell below which it counts as flat
  dither?: number; // ordered dither on the ramp, in ramp steps, so flat areas do not form rows
  back?: number; // brightness of the room relative to the person
  gamma?: number; // tone curve on the person; above 1 pushes midtones down
  local?: number; // local contrast: how far each sample is pushed from its surroundings
  edge?: number; // sharpening of the shape inside a cell before glyph matching
  floor?: number; // the dimmest glyph alpha on the person
  leading?: number; // row height as a fraction of the font size
  knee?: number; // brightness above which highlights are compressed
  rows?: number; // rows of characters down the portrait, whatever the screen
  cap?: number; // the brightest glyph alpha
};
const TUNE: Required<Tune> = {
  ramp: RAMP,
  edges: EDGES,
  leading: LEADING,
  knee: 0.72,
  flat: 0.2,
  dither: 0.9,
  back: 0.22,
  gamma: 1.25,
  local: 1.0,
  edge: 1.5,
  floor: 0.16,
  rows: 138,
  cap: 1,
};

// How much of the photograph comes through. "detailed" reads as a photograph set in type;
// Ben found it too clear, and creepy. The others trade likeness for characters.
export const LOOKS: Record<string, Tune> = {
  detailed: {},
  soft: { rows: 88, local: 0.25, gamma: 1.05, flat: 0.4, floor: 0.36, back: 0.24, cap: 0.88 },
  abstract: { rows: 70, local: 0.05, gamma: 1.0, flat: 0.55, floor: 0.42, back: 0.22, cap: 0.82 },
};
export const DEFAULT_LOOK = "soft";

// 4x4 Bayer matrix, for dithering that stays put from frame to frame.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
const FACE = { x: 0.56, y: 0.38 }; // where the intro starts, as a fraction of the frame

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c + (d - c) * sx - a - (b - a) * sx) * sy;
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

// Coverage of each glyph in the 2x3 regions of its cell, scaled so the densest region of any
// glyph is 1. Measured once per font at a large size.
function glyphShapes(family: string, glyphs: string, leading: number) {
  const h = 60;
  const w = Math.round(h * (ADVANCE / leading));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const out = new Float32Array(glyphs.length * SX * SY);
  let max = 0;
  for (let k = 0; k < glyphs.length; k++) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#fff";
    g.font = `500 ${h / leading}px ${family}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(glyphs[k], w / 2, h / 2 + (h / leading) * 0.04);
    const d = g.getImageData(0, 0, w, h).data;
    for (let ry = 0; ry < SY; ry++) {
      for (let rx = 0; rx < SX; rx++) {
        let sum = 0;
        const x0 = Math.floor((rx * w) / SX);
        const x1 = Math.floor(((rx + 1) * w) / SX);
        const y0 = Math.floor((ry * h) / SY);
        const y1 = Math.floor(((ry + 1) * h) / SY);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += d[(y * w + x) * 4 + 3];
        const v = sum / ((x1 - x0) * (y1 - y0) * 255);
        out[k * SX * SY + ry * SX + rx] = v;
        if (v > max) max = v;
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

type Props = {
  ground?: string;
  ink?: string;
  /** Font size of the characters in CSS pixels. By default the look sets the row count and the
   *  font follows from the stage height. */
  font?: number;
  /** Characters resolve out of noise, face first, on first load. */
  intro?: boolean;
  onReady?: () => void;
  tune?: Tune;
  /** Set false to draw only the still photograph. */
  clip?: boolean;
};

// A character that has come off the silhouette. It moves on the grid, one cell at a time, and
// leaves a short fading trail in the cells it has just left.
type Particle = { col: number; row: number; g: number; life: number; t: number; a: number; every: number; wait: number; steps: number; trail: [number, number][] };

export function Portrait({ ground = GROUND, ink = INK, font, intro = true, onReady, tune, clip = true }: Props = {}) {
  const tuneKey = JSON.stringify(tune ?? {});
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const stageEl = stageRef.current;
    const canvasEl = canvasRef.current;
    const overlayEl = overlayRef.current;
    if (!stageEl || !canvasEl || !overlayEl) return;
    const overlay: HTMLCanvasElement = overlayEl;
    const stage: HTMLDivElement = stageEl;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A ?look= on the page URL picks a preset, so looks can be compared on a phone.
    const asked = new URLSearchParams(window.location.search).get("look");
    const preset = LOOKS[asked ?? ""] ?? LOOKS[DEFAULT_LOOK];
    const T: Required<Tune> = { ...TUNE, ...preset, ...(JSON.parse(tuneKey) as Tune) };
    const GL = T.ramp + Array.from(T.edges).filter((ch) => !T.ramp.includes(ch)).join("");
    const rampTop = T.ramp.length - 1;
    const aspect = ADVANCE / T.leading;
    // Lookup tables for the curves applied to every sample, so the hot loops never call pow.
    const TONE = new Float32Array(1025);
    for (let k = 0; k <= 1024; k++) {
      let v = Math.pow(k / 1024, T.gamma);
      if (v > T.knee) v = T.knee + (v - T.knee) * 0.4; // highlights roll off instead of clipping
      TONE[k] = v;
    }
    const SHARP = new Float32Array(257);
    for (let k = 0; k <= 256; k++) SHARP[k] = Math.pow(k / 256, T.edge);
    const ALPHA = new Float32Array(257);
    for (let k = 0; k <= 256; k++) ALPHA[k] = T.floor + (T.cap - T.floor) * Math.pow(Math.min(1, (k / 256) * 1.25), 0.7);

    let cancelled = false;
    let raf = 0;
    let last = 0;
    let time = 0;
    let offscreen = false;
    let family = "monospace";

    // Layout, rebuilt on resize.
    let W = 0;
    let H = 0;
    let dpr = 1;
    let rows = 0;
    let cols = 0;
    let cellW = 0;
    let cellH = 0;
    let left = 0;
    let sprites: HTMLCanvasElement[] = [];
    // The cells are drawn only when the picture changes. The drifting characters live on a
    // transparent canvas on top, which is cleared and redrawn every frame over the area they use.
    const lctx = ctx;
    const octx = overlay.getContext("2d")!;
    let dirtyBox = [0, 0, 0, 0];

    // Sampling surfaces: the picture at sub-cell resolution, the mask at cell resolution.
    let pic: CanvasRenderingContext2D | null = null;
    let msk: CanvasRenderingContext2D | null = null;

    // Per cell state.
    let glyph = new Uint8Array(0); // what is drawn
    let pend = new Uint8Array(0); // a different glyph the picture is asking for
    let pendN = new Uint8Array(0); // for how many samples in a row
    let alpha = new Float32Array(0);
    let target = new Float32Array(0);
    let reveal = new Float32Array(0); // intro: when each cell settles, in seconds
    let person = new Float32Array(0); // mask after the dithered edge, 0 to 1
    let edge = new Int16Array(0); // per row: leftmost person column, or -1
    let L = new Float32Array(0); // luminance per sub-sample
    let B = new Float32Array(0); // its blur, for local contrast
    let tmp = new Float32Array(0);

    let shapes: Float32Array | null = null;
    const lut = new Uint8Array(LEVELS ** (SX * SY)).fill(255);

    let still: HTMLImageElement | null = null;
    let blink: HTMLImageElement | null = null;
    let video: HTMLVideoElement | null = null;
    let lastVideoTime = -1;
    let introT0 = intro && !reduced ? -1 : -Infinity;
    let toneLo = -1;
    let toneHi = 1;
    let blinkAt = 2.5;
    let blinkT = -1;

    const particles: Particle[] = [];

    function nearest(key: number) {
      // Dequantise to the centre of each level, then take the closest glyph shape.
      const n = SX * SY;
      const v = new Float32Array(n);
      let k = key;
      for (let i = 0; i < n; i++) {
        v[i] = ((k % LEVELS) + 0.5) / LEVELS;
        k = Math.floor(k / LEVELS);
      }
      let best = 0;
      let bestD = Infinity;
      for (let g = 0; g < GL.length; g++) {
        let d = 0;
        for (let i = 0; i < n; i++) {
          const e = v[i] - shapes![g * n + i];
          d += e * e;
        }
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
      return best;
    }

    function makeSprites() {
      sprites = Array.from(GL, (ch) => {
        const fs = (cellH / T.leading) * dpr;
        const s = document.createElement("canvas");
        s.width = Math.ceil(cellW * dpr) + 2;
        s.height = Math.ceil(fs * 1.3);
        const g = s.getContext("2d")!;
        g.fillStyle = ink;
        g.font = `500 ${fs}px ${family}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, s.width / 2, s.height / 2 + fs * 0.04);
        return s;
      });
    }

    function build() {
      W = stage.clientWidth || window.innerWidth;
      H = stage.clientHeight || window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = overlay.width = Math.round(W * dpr);
      canvas.height = overlay.height = Math.round(H * dpr);
      // The row count is the look, so a phone shows the same picture in smaller characters.
      rows = Math.round(clamp(font ? H / (font * T.leading) : T.rows, 50, 170));
      cellH = H / rows;
      cellW = cellH * aspect;
      const frameW = H * (SRC_ASPECT / (CROP.y1 - CROP.y0));
      cols = Math.min(Math.round(frameW / cellW), Math.floor(W / cellW));
      left = W - cols * cellW;
      makeSprites();

      const p = document.createElement("canvas");
      p.width = cols * SX;
      p.height = rows * SY;
      pic = p.getContext("2d", { willReadFrequently: true });
      const m = document.createElement("canvas");
      m.width = cols;
      m.height = rows;
      msk = m.getContext("2d", { willReadFrequently: true });
      for (const c of [pic, msk]) {
        if (!c) continue;
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = "high";
      }

      const n = cols * rows;
      glyph = new Uint8Array(n);
      pend = new Uint8Array(n);
      pendN = new Uint8Array(n);
      alpha = new Float32Array(n);
      target = new Float32Array(n);
      person = new Float32Array(n);
      edge = new Int16Array(rows).fill(-1);
      reveal = new Float32Array(n);
      L = new Float32Array(cols * SX * rows * SY);
      B = new Float32Array(L.length);
      tmp = new Float32Array(L.length);
      // The frame is right-aligned; when the stage is narrower than the frame it is cropped
      // from the left, so the face stays in view.
      const frameCols = Math.round(frameW / cellW);
      const fcx = FACE.x * frameCols - (frameCols - cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = (c - fcx) * aspect;
          const dy = r - FACE.y * rows;
          reveal[r * cols + c] = 0.2 + (Math.hypot(dx, dy) / rows) * 1.5 + hash(c, r) * 0.35;
        }
      }
      particles.length = 0;
      sample(true);
      if (introT0 === -1) introT0 = time;
      else introT0 = -Infinity;
    }

    // Reads the current picture into the grid and updates each cell's glyph and brightness.
    function sample(force = false) {
      if (!pic || !msk || !shapes) return;
      const pw = cols * SX;
      const ph = rows * SY;
      // The visible part of a 3:4 frame: full width, the cropped band of its height, and when
      // the stage is narrower than the frame, only its right-hand part.
      const frameCols = Math.round((H * (SRC_ASPECT / (CROP.y1 - CROP.y0))) / cellW);
      const fx0 = 1 - cols / Math.max(cols, frameCols);
      const draw = (ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, ox: number, w: number, h: number) =>
        ctx.drawImage(src, ox + fx0 * sw, CROP.y0 * sh, (1 - fx0) * sw, (CROP.y1 - CROP.y0) * sh, 0, 0, w, h);

      const playing = video && video.readyState >= 2;
      if (playing) {
        const vw = video!.videoWidth / 2;
        const vh = video!.videoHeight;
        draw(pic, video!, vw, vh, 0, pw, ph);
        draw(msk, video!, vw, vh, vw, cols, rows);
      } else if (still) {
        draw(pic, still, still.naturalWidth, still.naturalHeight, 0, pw, ph);
        draw(msk, still, still.naturalWidth, still.naturalHeight, 0, cols, rows);
        if (blink && blinkT >= 0) {
          // Closed eyes, laid over the eye region only, eased in and out.
          const k = Math.sin(clamp(blinkT / 0.22) * Math.PI);
          pic.globalAlpha = k;
          draw(pic, blink, blink.naturalWidth, blink.naturalHeight, 0, pw, ph);
          pic.globalAlpha = 1;
        }
      } else return;

      const pd = pic.getImageData(0, 0, pw, ph).data;
      const md = msk.getImageData(0, 0, cols, rows).data;
      // In the still the mask is the green channel; in the clip's mask half it is grey.
      const mc = playing ? 0 : 1;
      const pc = playing ? -1 : 0; // -1: luma from RGB, else a single channel

      if (pc < 0) for (let k = 0, j = 0; k < L.length; k++, j += 4) L[k] = (0.299 * pd[j] + 0.587 * pd[j + 1] + 0.114 * pd[j + 2]) / 255;
      else for (let k = 0, j = pc; k < L.length; k++, j += 4) L[k] = pd[j] / 255;

      // Local contrast: push every sample away from the average of its neighbourhood (a box blur
      // about one cell wide), so the eyes, brows and mouth separate from the skin around them.
      const R = 3;
      for (let y = 0; y < ph; y++) {
        let acc = 0;
        for (let x = -R; x <= R; x++) acc += L[y * pw + clamp(x, 0, pw - 1)];
        for (let x = 0; x < pw; x++) {
          tmp[y * pw + x] = acc / (2 * R + 1);
          acc += L[y * pw + Math.min(pw - 1, x + R + 1)] - L[y * pw + Math.max(0, x - R)];
        }
      }
      for (let x = 0; x < pw; x++) {
        let acc = 0;
        for (let y = -R; y <= R; y++) acc += tmp[clamp(y, 0, ph - 1) * pw + x];
        for (let y = 0; y < ph; y++) {
          B[y * pw + x] = acc / (2 * R + 1);
          acc += tmp[Math.min(ph - 1, y + R + 1) * pw + x] - tmp[Math.max(0, y - R) * pw + x];
        }
      }
      for (let k = 0; k < L.length; k++) L[k] = clamp(L[k] + T.local * (L[k] - B[k]));

      // Tone range of the face and hair this frame (not the shirt, which is far brighter).
      const hist = new Uint32Array(64);
      let count = 0;
      const faceRows = Math.floor(rows * FACE_ROWS);
      for (let r = 0; r < faceRows; r++) {
        for (let c = 0; c < cols; c++) {
          if (md[(r * cols + c) * 4 + mc] < 160) continue;
          for (let sy = 0; sy < SY; sy++) {
            for (let sx = 0; sx < SX; sx++) {
              hist[Math.min(63, (L[(r * SY + sy) * pw + c * SX + sx] * 64) | 0)]++;
              count++;
            }
          }
        }
      }
      let lo = 0.05;
      let hi = 0.95;
      if (count > 50) {
        let acc = 0;
        let loSet = false;
        for (let b = 0; b < 64; b++) {
          acc += hist[b];
          if (!loSet && acc >= count * 0.04) {
            lo = b / 64;
            loSet = true;
          }
          if (acc >= count * 0.99) {
            hi = (b + 1) / 64;
            break;
          }
        }
      }
      // Ease the range toward this frame's, so exposure does not pump as the head moves.
      if (toneLo < 0 || force) {
        toneLo = lo;
        toneHi = hi;
      } else {
        toneLo += (lo - toneLo) * 0.15;
        toneHi += (hi - toneHi) * 0.15;
      }
      lo = toneLo;
      const span = Math.max(0.2, toneHi - toneLo);

      const n = SX * SY;
      const s = new Float32Array(n);
      const t = time * 0.12;
      edge.fill(-1);
      for (let r = 0; r < rows; r++) {
        const bodyFade = 1 - 0.9 * smooth(BODY_FADE[0], BODY_FADE[1], r / rows);
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const m = md[i * 4 + mc] / 255;
          // The silhouette breaks up with noise instead of ending on a hard line. Only cells near
          // the edge of the mask need the noise; the rest are plainly inside or outside.
          let w = m > 0.97 ? 1 : 0;
          if (m > 0.02 && m <= 0.97) {
            const thr = 0.15 + 0.7 * noise(c * 0.35 + t, r * 0.35);
            w = smooth(thr - 0.3, thr + 0.3, m);
          }
          person[i] = w;
          if (w > 0.5 && edge[r] < 0) edge[r] = c;
          // The room fades out toward the left edge of the frame, into the page.
          const room = T.back * smooth(0.02, 0.55, c / cols) * (1 - 0.6 * smooth(0.7, 1, r / rows));
          let mx = 0;
          let mn = 1;
          let mean = 0;
          for (let sy = 0; sy < SY; sy++) {
            for (let sx = 0; sx < SX; sx++) {
              const k = (r * SY + sy) * pw + c * SX + sx;
              const pv = TONE[(clamp((L[k] - lo) / span) * 1024) | 0] * bodyFade;
              // The room comes from the blurred picture, so it is a soft texture with no hard lines.
              const v = room * B[k] * (1 - w) + pv * w;
              s[sy * SX + sx] = v;
              if (v > mx) mx = v;
              if (v < mn) mn = v;
              mean += v;
            }
          }
          mean /= n;
          let g: number;
          if (w < 0.5 || mx - mn < T.flat) {
            g = Math.round(clamp(clamp(mean * 1.1) * rampTop + T.dither * BAYER[(r & 3) * 4 + (c & 3)], 0, rampTop));
          } else {
            // An edge: sharpen the shape inside the cell, then take the glyph that follows it.
            let key = 0;
            let mul = 1;
            for (let k = 0; k < n; k++) {
              const v = mx * SHARP[((s[k] / mx) * 256) | 0];
              key += Math.min(LEVELS - 1, Math.floor(v * LEVELS)) * mul;
              mul *= LEVELS;
            }
            g = lut[key];
            if (g === 255) g = lut[key] = nearest(key);
          }
          // Hysteresis: a new glyph has to be asked for twice in a row, unless it is a big change.
          if (force) glyph[i] = g;
          else if (g !== glyph[i]) {
            if (g === pend[i]) pendN[i]++;
            else {
              pend[i] = g;
              pendN[i] = 1;
            }
            if (pendN[i] >= 2 || Math.abs(mean - target[i]) > 0.18) {
              glyph[i] = g;
              pendN[i] = 0;
            }
          } else pendN[i] = 0;
          target[i] = mean;
          if (force) alpha[i] = mean;
        }
      }
    }

    function drawCells() {
      lctx.globalAlpha = 1;
      lctx.fillStyle = ground;
      lctx.fillRect(0, 0, canvas.width, canvas.height);
      const it = time - introT0;
      const introOn = it < 3;
      const oy = (sprites[0].height - cellH * dpr) / 2;
      for (let r = 0; r < rows; r++) {
        const y = Math.round(r * cellH * dpr - oy);
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          alpha[i] += (target[i] - alpha[i]) * 0.6;
          let g = glyph[i];
          if (g === 0) continue;
          // Dim cells are dim glyphs as well as light ones, and the room sits well behind.
          let a = ALPHA[(clamp(alpha[i]) * 256) | 0] * (0.55 + 0.45 * person[i]);
          if (introOn) {
            const d = it - reveal[i];
            if (d < -0.35) continue;
            if (d < 0) {
              // Still resolving: noise at the same density, fading in.
              g = 1 + ((hash(i, Math.floor(it * 20)) * (GL.length - 1)) | 0);
              a *= 0.5 * (1 + d / 0.35);
            }
          }
          lctx.globalAlpha = a;
          lctx.drawImage(sprites[g], Math.round((left + c * cellW) * dpr) - 1, y);
        }
      }
      lctx.globalAlpha = 1;
    }

    function render() {
      const [x0, y0, x1, y1] = dirtyBox;
      if (x1 > x0) octx.clearRect(x0, y0, x1 - x0, y1 - y0);
      if (!particles.length) {
        dirtyBox = [0, 0, 0, 0];
        return;
      }
      const oy = (sprites[0].height - cellH * dpr) / 2;
      const sw = sprites[0].width;
      const sh = sprites[0].height;
      let bx0 = Infinity;
      let by0 = Infinity;
      let bx1 = -Infinity;
      let by1 = -Infinity;
      const put = (col: number, row: number, g: number, a: number) => {
        const x = Math.round((left + col * cellW) * dpr) - 1;
        const y = Math.round(row * cellH * dpr - oy);
        octx.globalAlpha = a;
        octx.drawImage(sprites[g], x, y);
        if (x < bx0) bx0 = x;
        if (y < by0) by0 = y;
        if (x + sw > bx1) bx1 = x + sw;
        if (y + sh > by1) by1 = y + sh;
      };
      for (const p of particles) {
        const k = p.t / p.life;
        const a = p.a * (1 - k * k);
        p.trail.forEach(([c, r], n) => put(c, r, Math.max(1, p.g - 1 - n), a * (0.45 - n * 0.14)));
        put(p.col, p.row, p.g, a);
      }
      octx.globalAlpha = 1;
      dirtyBox = [bx0 - 2, by0 - 2, bx1 + 2, by1 + 2];
    }

    function stepParticles(dt: number) {
      const it = time - introT0;
      if (it > 1.2 && !reduced) {
        let spawn = rows * 0.35 * dt + Math.random();
        while (spawn-- >= 1 && particles.length < 140) {
          const r = Math.floor(rows * (0.08 + Math.random() * 0.62));
          const c = edge[r];
          if (c < 0) continue;
          const i = r * cols + c;
          if (!glyph[i]) continue;
          particles.push({
            col: c - 1,
            row: r,
            // Leaves as a ramp character as dense as the cell it came from.
            g: Math.max(2, Math.round(clamp(alpha[i] * 1.2) * rampTop)),
            life: 1.6 + Math.random() * 3,
            t: 0,
            a: 0.3 + 0.4 * Math.random(),
            every: 1 / (5 + Math.random() * 12),
            wait: 0,
            steps: 0,
            trail: [],
          });
        }
      }
      for (let k = particles.length - 1; k >= 0; k--) {
        const p = particles[k];
        p.t += dt;
        p.wait += dt;
        while (p.wait >= p.every) {
          p.wait -= p.every;
          p.trail.unshift([p.col, p.row]);
          if (p.trail.length > 3) p.trail.pop();
          p.col--;
          // Now and then it drops or rises a row, still on the grid.
          if (Math.random() < 0.1) p.row = Math.max(0, Math.min(rows - 1, p.row + (Math.random() < 0.5 ? -1 : 1)));
          // It thins toward the lightest characters as it goes.
          if (++p.steps % 4 === 0) p.g = Math.max(1, p.g - 1);
        }
        if (p.t >= p.life || left + p.col * cellW < -cellW * 4) particles.splice(k, 1);
      }
    }

    function frame(now: number) {
      if (cancelled) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      time += dt;
      let dirty = time - introT0 < 3;
      if (video && video.readyState >= 2) {
        // currentTime moves on every screen refresh; the picture only changes 24 times a second.
        const f = Math.floor(video.currentTime * CLIP_FPS);
        if (f !== lastVideoTime) {
          lastVideoTime = f;
          sample();
          dirty = true;
        }
      } else if (blink) {
        blinkAt -= dt;
        if (blinkAt <= 0 && blinkT < 0) blinkT = 0;
        if (blinkT >= 0) {
          blinkT += dt;
          if (blinkT > 0.22) {
            blinkT = -1;
            blinkAt = 2.5 + Math.random() * 4;
          }
          sample();
          dirty = true;
        } else if (Math.floor(time * 4) !== Math.floor((time - dt) * 4)) {
          sample();
          dirty = true;
        }
      }
      if (dirty) drawCells();
      stepParticles(dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function startLoop() {
      if (reduced || raf || offscreen || document.hidden || cancelled) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stopLoop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (stage.clientWidth === W && stage.clientHeight === H) return;
        build();
        drawCells();
        render();
      }, 120);
    };
    const onVisibility = () => {
      if (document.hidden) {
        stopLoop();
        video?.pause();
      } else {
        video?.play().catch(() => {});
        startLoop();
      }
    };
    const sizer = new ResizeObserver(onResize);
    const watcher = new IntersectionObserver((entries) => {
      offscreen = !entries[0]?.isIntersecting;
      if (offscreen) {
        stopLoop();
        video?.pause();
      } else {
        video?.play().catch(() => {});
        startLoop();
      }
    });

    (async () => {
      family = getComputedStyle(stage).fontFamily || "monospace";
      try {
        await document.fonts.load(`500 12px ${family}`);
      } catch {
        // use whatever resolves
      }
      [still, blink] = await Promise.all([loadImage(STILL).catch(() => null), loadImage(BLINK).catch(() => null)]);
      if (cancelled || !still) return;
      shapes = glyphShapes(family, GL, T.leading);
      build();
      drawCells();
      render();
      readyRef.current?.();
      sizer.observe(stage);
      watcher.observe(stage);
      document.addEventListener("visibilitychange", onVisibility);
      startLoop();
      if (reduced || !clip) return;

      const v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      v.src = VIDEO;
      const ok = await new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => resolve(false), VIDEO_WAIT);
        v.addEventListener("loadeddata", () => (window.clearTimeout(timer), resolve(true)), { once: true });
        v.addEventListener("error", () => (window.clearTimeout(timer), resolve(false)), { once: true });
      });
      if (!ok || cancelled) return;
      try {
        await v.play();
      } catch {
        return; // autoplay refused: the still keeps blinking
      }
      if (cancelled) return v.pause();
      video = v;
      if (offscreen) v.pause();
    })();

    return () => {
      cancelled = true;
      stopLoop();
      window.clearTimeout(resizeTimer);
      sizer.disconnect();
      watcher.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [ground, ink, font, intro, tuneKey, clip]);

  return (
    <div
      ref={stageRef}
      style={{ position: "absolute", inset: 0, overflow: "hidden", background: ground, color: ink, fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Portrait of Ben Cheesebrough, drawn in characters"
        role="img"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
      <canvas ref={overlayRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
    </div>
  );
}
