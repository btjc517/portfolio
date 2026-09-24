"use client";

import { useEffect, useRef } from "react";

// A photograph drawn in characters, room and all. It sits against the right edge at the
// full height of its stage, and its left edge burns off into the page. The burning is a small
// heat simulation, the classic ASCII "Doom fire" turned on its side: the body of the picture is
// the heat source, each step every edge cell takes its heat from its neighbour on the fuel side
// (usually from the row below, so shapes rise) and loses some, and the picture shows wherever the
// heat is high enough. The default look ("emission", see EDGES) makes that half fire and half
// radiation: the loss follows smooth noise so the tongues are tall and slow, pulses travel out
// through the edge leaving faint rings, and the characters the edge drops stream far out in
// straight lines.
//
// The person moves: a generated living photograph (public/cv/portrait.mp4, picture on the
// left half and a per-frame person mask on the right, made by scripts/portrait-mask-frames.swift)
// is sampled every frame. Until the clip is ready, or when it cannot play (reduced motion,
// iOS low power mode), the still photograph is drawn instead, with blinks and a grin from
// two extra stills masked to the eyes and mouth.
//
// On first load the characters fly in from the left and resolve into the picture. Everything
// that moves, the intro and the characters shed from the edge, moves a whole cell at a time on
// the portrait's grid; nothing floats between cells.

const FRAMES = "/cv/";
const VIDEO = "/cv/portrait.mp4";
const VIDEO_WAIT = 4000; // ms to wait for the clip before giving up on it
const INTRO_DUR = 0.85; // seconds each cell takes to land
const INTRO_END = 2.2; // seconds after which the intro is over for every cell
const SRC_W = 375;
const SRC_H = 500;
const CROP = { x0: 0, y0: 0.12, x1: 1, y1: 1 };
const RAMP = " .,:;-=+*x#%@";
const INK = "#e8e6df";
const GROUND = "#0b0b0c";
const CELL_ASPECT = 0.6;
const ROWS = 88; // look 06: rows of characters down the frame, whatever the screen height
const SHARPEN = 0.5;
const HEAT = 1; // heat of the fuel, the body of the picture
const SHOW = 0.3; // a cell shows the picture while its heat is at least this
const MAX_EMBERS = 700;

// How the left edge burns. Pick one with ?edge=<name> on the page URL.
type EdgeLook = {
  span: number; // depth of the burning band, as a fraction of the frame's width
  reach: number; // how far, on average, the flames reach across the band
  hz: number; // simulation steps per second
  ease: number; // seconds the drawn heat takes to follow the simulation; 0 draws every step as is
  grain: number; // share of each step's heat loss that is per-cell chance; the rest is smooth noise
  tall: number; // rows per feature of that smooth noise: larger means taller tongues
  rise: number; // chance a cell takes its heat from the row below, so shapes rise
  sink: number; // chance it takes it from the row above
  flicker: number; // how often, per second, the characters at the front jitter
  glow: number; // brightness the burning front is pushed toward
  dense: number; // ramp steps the front's characters are pushed denser
  pulse: number; // heat a passing pulse adds, pushing the front out; 0 for no pulses
  period: number; // seconds between pulses
  rings: number; // brightness of the thin ring a pulse draws through the burnt part of the band
  emit: number; // chance a character the edge drops becomes a particle
  burst: number; // chance, per row, that a pulse crossing the front throws off a particle
  life: [number, number]; // particle lifetime range, in seconds
  speed: [number, number]; // particle speed range, in cells per second
  drag: number; // how much particles slow over their life
  climb: number; // chance, per step, that a particle moves up a row
  trail: number; // cells of streak behind a particle
  cool: number; // steps a particle takes per step down the ramp
  bright: number; // particle brightness as it leaves
  mark: number; // the lightest ramp character a particle starts as
};

const EDGES: Record<string, EdgeLook> = {
  // Half fire, half radiation: tall slow tongues, outgoing pulses, long straight emission.
  emission: {
    span: 0.38, reach: 0.45, hz: 14, ease: 0.16, grain: 0.3, tall: 14, rise: 0.22, sink: 0.14, flicker: 6,
    glow: 0.6, dense: 2, pulse: 0.24, period: 2.8, rings: 0.45, emit: 0.1, burst: 0.55,
    life: [3, 6], speed: [10, 22], drag: 0.5, climb: 0.035, trail: 3, cool: 7, bright: 0.8, mark: 5,
  },
  // The literal flame it grew out of (24 September), kept for comparison.
  fire: {
    span: 0.24, reach: 0.5, hz: 22, ease: 0, grain: 1, tall: 14, rise: 0.34, sink: 0.1, flicker: 11,
    glow: 0.78, dense: 3, pulse: 0, period: 2.8, rings: 0, emit: 0.07, burst: 0,
    life: [0.9, 2.4], speed: [10, 28], drag: 1.8, climb: 0.14, trail: 2, cool: 3, bright: 0.92, mark: 2,
  },
};
const BACK = 0.55; // brightness of the room relative to the person, blended through a blurred mask
const FACE = { x: 0.47, y: 0.42 }; // centre of the vignette, as a fraction of the frame

type Cell = {
  i: number;
  col: number; // column within the portrait frame, 0 at its left edge
  row: number;
  hx: number;
  hy: number;
  ix: number; // intro: where the cell starts, relative to home
  iy: number;
  id: number; // intro: delay before it sets off
};

// A character that has burnt off the edge. It moves on the grid, one cell at a time, slowing as
// it goes, rising a little like an ember, and leaves a short trail in the cells it has just left.
type Ember = {
  col: number;
  row: number;
  g: number;
  a: number;
  t: number;
  life: number;
  every: number;
  wait: number;
  steps: number;
  trail: [number, number][];
  id: number; // intro delay of the cell it came from
};

type Grid = { lum: Float32Array; mask: Float32Array; extra: Float32Array; wide?: Float32Array };
type Sheet = { frames: Grid[]; keyframes: number[] };

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
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const smoother = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

type Props = {
  /** Background colour behind the characters; defaults to the lab's near-black. */
  ground?: string;
  /** Character colour; defaults to the lab's off-white. */
  ink?: string;
  /** Rows of characters down the frame; more rows means finer cells. The count is the look,
   *  so a taller screen gets bigger cells rather than more of them. */
  rows?: number;
  /** Characters from empty to dense. */
  ramp?: string;
  /** Unsharp mask strength on the luminance, 0 to 1, for more edge detail. */
  sharpen?: number;
  /** Blur passes on the luminance before it becomes characters, for a softer picture. */
  soften?: number;
  /** Characters fly in and resolve into the picture on first load. */
  intro?: boolean;
  /** Called once the first frame is on screen. */
  onReady?: () => void;
};

export function Portrait({ ground = GROUND, ink = INK, rows: rowCount = ROWS, ramp: rampText = RAMP, sharpen = SHARPEN, soften = 0, intro = true, onReady }: Props = {}) {
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    const canvasEl = canvasRef.current;
    if (!stageEl || !canvasEl) return;
    const stage: HTMLDivElement = stageEl;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let raf = 0;
    let resizeTimer = 0;
    let last = 0;
    let time = 0;

    // Rebuilt on resize.
    let W = 0;
    let H = 0;
    let dpr = 1;
    let cellW = 0;
    let cellH = 0;
    let rows = 0;
    let pCols = 0;
    let pLeft = 0;
    let cells: Cell[] = []; // every cell of the frame, indexed like the tone arrays
    let embers: Ember[] = [];
    let span = new Float32Array(0); // per row: the depth of the burning band, in cells
    let fuel = new Int16Array(0); // per row: the first column that is always fuel
    let heat = new Float32Array(0); // per cell, in the burning band
    let shown = new Float32Array(0); // the heat as drawn, easing after the simulation
    let ringOn = new Uint8Array(0); // per row: a pulse is crossing the front
    let fireWait = 0;
    const E: EdgeLook = EDGES[new URLSearchParams(window.location.search).get("edge") ?? ""] ?? EDGES.emission;
    let sprites: HTMLCanvasElement[] = [];
    let tone = new Float32Array(0);
    let toneScale = new Float32Array(0); // vignette per cell, fixed
    let dither = new Float32Array(0); // per cell, fixed
    let shimmer: { i: number; ch: number; until: number }[] = [];
    let introT0 = intro && !reduced ? -1 : -Infinity; // field time the intro started at

    // Photographs at grid resolution: the original, the blink, the grin, and three head paths
    // that all start at the original: left (a turn to the left), glance (a slight turn, then
    // looking down) and away (the fuller turn, then looking down).
    let N: Grid | null = null;
    let B: Grid | null = null;
    let G: Grid | null = null;
    const sheets: Record<string, Sheet> = {};
    let branch: "glance" | "away" = "glance"; // which right-hand path h > 0 refers to
    const hNeutral = 0;
    let images: Record<string, HTMLImageElement> = {};
    const manifest: Record<string, { frames: number; keyframes: number[]; chain?: string[] }> = {};
    let video: HTMLVideoElement | null = null;
    let videoPacked = false; // picture on the left half, person mask on the right half
    let videoCanvas: HTMLCanvasElement | null = null;
    let videoCtx: CanvasRenderingContext2D | null = null;
    let maskCanvas: HTMLCanvasElement | null = null;
    let maskCtx: CanvasRenderingContext2D | null = null;
    const videoMask = { v: new Float32Array(0) };

    // Pose. h runs from -1 (the end of the left path) through 0 (the photograph as taken) to
    // 1 (the end of the current right-hand path); g is the grin; sB is the blink. Each follows
    // its target through a smoothing filter, with noise layered on top, so nothing ever moves
    // in a straight line or stops dead.
    let h = 0; // damped state
    let hShown = 0; // what is drawn: the state plus this frame's noise
    let hVel = 0;
    let hTarget = 0;
    let hSmooth = 0.7; // seconds
    let g = 0;
    let gShown = 0;
    let gVel = 0;
    let gTarget = 0;
    let gSmooth = 0.5;
    let sB = 0;
    let breathX = 0; // cells
    let breathY = 0;

    function makeSpriteSet(family: string, scale: number) {
      const out: HTMLCanvasElement[] = [];
      const w = Math.ceil(cellW * scale * dpr);
      const h = Math.ceil(cellH * scale * dpr);
      for (let i = 0; i < rampText.length; i++) {
        const s = document.createElement("canvas");
        s.width = w;
        s.height = h;
        const g = s.getContext("2d")!;
        g.fillStyle = ink;
        g.font = `500 ${cellH * scale * 0.94 * dpr}px ${family}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(rampText[i], w / 2, h / 2 + cellH * scale * dpr * 0.04);
        out.push(s);
      }
      return out;
    }

    function drawCell(x: number, y: number, ch: number, alpha: number) {
      if (ch <= 0 || alpha <= 0.01) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprites[ch], Math.round(x * dpr), Math.round(y * dpr));
    }

    // Draw one frame of a PNG into the grid, cropped like the portrait, and read its channels.
    function sampleImage(img: HTMLImageElement, frame = 0): [Float32Array, Float32Array, Float32Array] {
      const sc = document.createElement("canvas");
      sc.width = pCols;
      sc.height = rows;
      const g = sc.getContext("2d", { willReadFrequently: true })!;
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.drawImage(
        img,
        CROP.x0 * SRC_W,
        frame * SRC_H + CROP.y0 * SRC_H,
        (CROP.x1 - CROP.x0) * SRC_W,
        (CROP.y1 - CROP.y0) * SRC_H,
        0,
        0,
        pCols,
        rows,
      );
      const d = g.getImageData(0, 0, pCols, rows).data;
      const n = pCols * rows;
      const r = new Float32Array(n);
      const gg = new Float32Array(n);
      const b = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        r[i] = d[i * 4] / 255;
        gg[i] = d[i * 4 + 1] / 255;
        b[i] = d[i * 4 + 2] / 255;
      }
      return [r, gg, b];
    }

    function blur3(src: Float32Array, passes: number) {
      let m = src;
      for (let p = 0; p < passes; p++) {
        const out = new Float32Array(m.length);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < pCols; c++) {
            let sum = 0;
            let n = 0;
            for (let dr = -1; dr <= 1; dr++) {
              const rr = r + dr;
              if (rr < 0 || rr >= rows) continue;
              for (let dc = -1; dc <= 1; dc++) {
                const cc = c + dc;
                if (cc < 0 || cc >= pCols) continue;
                sum += m[rr * pCols + cc];
                n++;
              }
            }
            out[r * pCols + c] = sum / n;
          }
        }
        m = out;
      }
      return m;
    }

    function gridFrom(img: HTMLImageElement, frame = 0): Grid {
      const [lum, mask, extra] = sampleImage(img, frame);
      return { lum, mask: blur3(mask, 3), extra: blur3(extra, 1) };
    }

    // The person mask grown by a few cells, so a head that moves in the clip stays inside it.
    function widen(mask: Float32Array, radius: number) {
      const out = new Float32Array(mask.length);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < pCols; c++) {
          let m = 0;
          for (let dr = -radius; dr <= radius; dr++) {
            const rr = r + dr;
            if (rr < 0 || rr >= rows) continue;
            for (let dc = -radius; dc <= radius; dc++) {
              const cc = c + dc;
              if (cc < 0 || cc >= pCols) continue;
              const v = mask[rr * pCols + cc];
              if (v > m) m = v;
            }
          }
          out[r * pCols + c] = m;
        }
      }
      return blur3(out, 2);
    }

    function sheetFrom(name: string, img: HTMLImageElement): Sheet {
      const n = Math.round(img.naturalHeight / SRC_H);
      const frames: Grid[] = [];
      for (let k = 0; k < n; k++) frames.push(gridFrom(img, k));
      const keyframes = manifest[name]?.keyframes ?? [0, n - 1];
      return { frames, keyframes };
    }

    // Cross-fade between the two sheet frames either side of position s in [0, 1].
    function blendSheet(sheet: Sheet, at: number, lumOut: Float32Array, maskOut: Float32Array) {
      const frames = sheet.frames;
      const pos = clamp(at, 0, 1) * (frames.length - 1);
      const k = Math.min(frames.length - 2, Math.floor(pos));
      const f = pos - k;
      const a = frames[k];
      const b = frames[k + 1];
      for (let i = 0; i < lumOut.length; i++) {
        lumOut[i] = a.lum[i] + (b.lum[i] - a.lum[i]) * f;
        maskOut[i] = a.mask[i] + (b.mask[i] - a.mask[i]) * f;
      }
    }

    // Signed position of a keyframe: negative on the left path, positive on a right path.
    function keyAt(name: string, on?: "left" | "glance" | "away") {
      const which = on ?? (sheets.left && (manifest.left?.chain ?? []).includes(name) && name !== "neutral" ? "left" : branch);
      const sheet = sheets[which];
      const chain = manifest[which]?.chain ?? [];
      const index = chain.indexOf(name);
      if (!sheet || index < 0) return 0;
      const f = sheet.keyframes[index] / (sheet.frames.length - 1);
      return which === "left" ? -f : f;
    }
    const has = (name: string, on: "left" | "glance" | "away") => !!sheets[on] && (manifest[on]?.chain ?? []).includes(name);
    const lastKey = (on: "glance" | "away") => {
      const chain = manifest[on]?.chain ?? [];
      return chain[chain.length - 1] ?? "neutral";
    };

    // Sample the current frame of the living-photograph clip into the grid. The clip was made
    // from the photograph, either at its own 3:4 or centre-cropped to a narrower aspect; in the
    // second case it lands in the middle band of the frame and the photograph fills the sides.
    function sampleVideo(lumOut: Float32Array, maskOut: Float32Array) {
      if (!N || !video || !videoCtx || video.readyState < 2) return false;
      const vw = videoPacked ? video.videoWidth / 2 : video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return false;
      const photoAspect = SRC_W / SRC_H;
      const clipAspect = vw / vh;
      // Fraction of the photograph the clip covers, assuming a centred crop.
      let fx0 = 0;
      let fx1 = 1;
      let fy0 = 0;
      let fy1 = 1;
      if (clipAspect < photoAspect - 0.001) {
        const w = clipAspect / photoAspect;
        fx0 = (1 - w) / 2;
        fx1 = fx0 + w;
      } else if (clipAspect > photoAspect + 0.001) {
        const h = photoAspect / clipAspect;
        fy0 = (1 - h) / 2;
        fy1 = fy0 + h;
      }
      // Where that band sits in the cropped grid.
      const gx0 = Math.round(((fx0 - CROP.x0) / (CROP.x1 - CROP.x0)) * pCols);
      const gx1 = Math.round(((fx1 - CROP.x0) / (CROP.x1 - CROP.x0)) * pCols);
      const gy0 = Math.round(((fy0 - CROP.y0) / (CROP.y1 - CROP.y0)) * rows);
      const gy1 = Math.round(((fy1 - CROP.y0) / (CROP.y1 - CROP.y0)) * rows);
      // The part of the clip that is inside the cropped grid.
      const sx0 = Math.max(0, ((CROP.x0 - fx0) / (fx1 - fx0)) * vw);
      const sy0 = Math.max(0, ((CROP.y0 - fy0) / (fy1 - fy0)) * vh);
      const sx1 = Math.min(vw, ((CROP.x1 - fx0) / (fx1 - fx0)) * vw);
      const sy1 = Math.min(vh, ((CROP.y1 - fy0) / (fy1 - fy0)) * vh);
      const dx0 = Math.max(0, gx0);
      const dy0 = Math.max(0, gy0);
      const dx1 = Math.min(pCols, gx1);
      const dy1 = Math.min(rows, gy1);
      if (dx1 <= dx0 || dy1 <= dy0) return false;
      lumOut.set(N.lum);
      maskOut.set(N.wide ?? N.mask);
      videoCtx.drawImage(video, sx0, sy0, sx1 - sx0, sy1 - sy0, dx0, dy0, dx1 - dx0, dy1 - dy0);
      const d = videoCtx.getImageData(dx0, dy0, dx1 - dx0, dy1 - dy0).data;
      const bw = dx1 - dx0;
      for (let r = dy0; r < dy1; r++) {
        for (let c = dx0; c < dx1; c++) {
          const k = ((r - dy0) * bw + (c - dx0)) * 4;
          // Rec. 601 luma of the video frame.
          lumOut[r * pCols + c] = (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255;
        }
      }
      if (videoPacked && maskCtx) {
        // The person mask for this frame, from the right half, softened like the still's mask.
        maskCtx.drawImage(video, vw + sx0, sy0, sx1 - sx0, sy1 - sy0, dx0, dy0, dx1 - dx0, dy1 - dy0);
        const m = maskCtx.getImageData(dx0, dy0, dx1 - dx0, dy1 - dy0).data;
        if (videoMask.v.length !== lumOut.length) videoMask.v = new Float32Array(lumOut.length);
        videoMask.v.set(N.mask);
        for (let r = dy0; r < dy1; r++) {
          for (let c = dx0; c < dx1; c++) {
            videoMask.v[r * pCols + c] = m[((r - dy0) * bw + (c - dx0)) * 4] / 255;
          }
        }
        maskOut.set(blur3(videoMask.v, 2));
      }
      return true;
    }

    // The photograph for the current pose, as luminance and mask per cell.
    function composePose(lumOut: Float32Array, maskOut: Float32Array) {
      if (!N) return;
      if (sampleVideo(lumOut, maskOut)) return;
      const sheet = hShown < 0 ? sheets.left : sheets[branch];
      if (sheet && sheet.frames.length > 1 && Math.abs(hShown) > 0.0005) blendSheet(sheet, Math.abs(hShown), lumOut, maskOut);
      else {
        lumOut.set(N.lum);
        maskOut.set(N.mask);
      }
      // The grin and the closed eyes were photographed in the original pose, so both fade
      // out as the head moves away from it; near it the offset is under a cell.
      const reach = hShown < 0 ? Math.abs(keyAt("slightleft", "left")) * 0.4 : Math.abs(keyAt("halfturn", branch));
      const away = Math.abs(hShown) / Math.max(0.001, reach);
      const near = 1 - smooth((away - 0.9) / 0.6);
      const gw = gShown * near;
      if (gw > 0.001 && G) {
        for (let i = 0; i < lumOut.length; i++) {
          const e = G.extra[i] * gw;
          if (e > 0.001) lumOut[i] += (G.lum[i] - N.lum[i]) * e;
        }
      }
      const bw = sB * near;
      if (bw > 0.001 && B) {
        for (let i = 0; i < lumOut.length; i++) {
          const e = B.extra[i] * bw;
          if (e > 0.001) lumOut[i] += (B.lum[i] - lumOut[i]) * e;
        }
      }
    }

    let poseLum = new Float32Array(0);
    let poseMask = new Float32Array(0);

    function updateTone() {
      composePose(poseLum, poseMask);
      if (soften > 0) poseLum.set(blur3(poseLum, soften));
      if (sharpen > 0) {
        const soft = blur3(poseLum, 1);
        for (let i = 0; i < poseLum.length; i++) poseLum[i] = clamp(poseLum[i] + sharpen * (poseLum[i] - soft[i]), 0, 1);
      }
      for (let i = 0; i < tone.length; i++) {
        const m = poseMask[i];
        // The person gets a shadow lift (a lower exponent) so the unlit side of the face still
        // reads; the room keeps its darker curve.
        let v = Math.pow(poseLum[i], 0.85 - 0.25 * m);
        v = clamp((v - 0.08) / 0.82, 0, 1);
        if (v > 0.8) v = 0.8 + (v - 0.8) * 0.45;
        tone[i] = clamp(v * (BACK + (1 - BACK) * m) * toneScale[i] + dither[i], 0, 1);
      }
    }

    function charFor(t: number) {
      return Math.max(1, Math.min(rampText.length - 1, Math.round(t * (rampText.length - 1))));
    }

    // The pulse at a cell d columns out from the fuel on row r: 0 to 1, near 1 while a pulse is
    // passing. Pulses leave the body every E.period seconds and travel out through the band, so
    // each one follows the contour of the edge like a ripple. `width` is the pulse's thickness as
    // a fraction of the distance between pulses.
    function pulseAt(d: number, r: number, width: number) {
      if (!E.pulse && !E.rings) return 0;
      const wavelength = Math.max(8, span[r] * 0.95);
      const phase = d / wavelength - time / E.period + 0.12 * noise(r * 0.05, time * 0.1);
      const f = phase - Math.floor(phase);
      const dist = Math.min(f, 1 - f);
      return smooth(1 - dist / width) * clamp(1 - d / (span[r] * 1.15), 0, 1);
    }

    // One step of the fire. Right to left, so each cell reads its fuel-side neighbour's heat from
    // this step, as in the original algorithm, which is what makes the tongues coherent.
    function stepFire() {
      const drift = time * (1.8 / E.tall); // the smooth noise rises this many features a second
      for (let r = 0; r < rows; r++) {
        const loss = ((HEAT - SHOW) / (E.reach * span[r])) * 2; // mean loss per column is half this
        for (let c = fuel[r] - 1; c >= 0; c--) {
          const q = Math.random();
          const from = Math.min(rows - 1, Math.max(0, r + (q < E.rise ? 1 : q < E.rise + E.sink ? -1 : 0)));
          const i = r * pCols + c;
          const was = heat[i] >= SHOW;
          // Smooth noise that changes slowly along a row and over E.tall rows, rising: a group of rows
          // where it is low burns far out as one tall tongue, where it is high burns short. The
          // per-cell chance on top keeps their edges ragged.
          const n = clamp((noise(c * 0.035 + 11, r / E.tall + drift) - 0.5) * 2.4 + 0.5, 0.12, 1);
          heat[i] = Math.max(0, heat[from * pCols + c + 1] - loss * ((1 - E.grain) * n + E.grain * Math.random()));
          if (was && heat[i] < SHOW && Math.random() < E.emit) spawnEmber(cells[i], false);
        }
        // A pulse crossing the front throws off a burst of particles along it.
        if (E.burst) {
          let front = fuel[r];
          while (front > 0 && heat[r * pCols + front - 1] >= SHOW) front--;
          const on = pulseAt(fuel[r] - front, r, 0.05) > 0.5 ? 1 : 0;
          if (on && !ringOn[r] && Math.random() < E.burst) spawnEmber(cells[r * pCols + front], true);
          ringOn[r] = on;
        }
      }
    }

    function spawnEmber(c: Cell, burst: boolean) {
      if (embers.length >= MAX_EMBERS) return;
      const t = tone[c.i];
      if (t < 0.05 && !burst) return;
      embers.push({
        col: c.col,
        row: c.row,
        g: Math.max(E.mark, Math.min(rampText.length - 1, charFor(t) + E.dense)),
        a: E.bright * (0.7 + 0.3 * Math.min(1, t * 2)),
        t: 0,
        life: E.life[0] + Math.random() * (E.life[1] - E.life[0]),
        every: 1 / (E.speed[0] + Math.random() * (E.speed[1] - E.speed[0])),
        wait: 0,
        steps: 0,
        trail: [],
        id: c.id,
      });
    }

    function build(family: string) {
      // Size from the stage, so the portrait can fill a hero section as well as the viewport.
      W = stage.clientWidth || window.innerWidth;
      H = stage.clientHeight || window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      rows = Math.max(40, Math.round(rowCount));
      cellH = H / rows;
      cellW = cellH * CELL_ASPECT;
      const cropAspect = ((CROP.x1 - CROP.x0) * SRC_W) / ((CROP.y1 - CROP.y0) * SRC_H);
      pCols = Math.round((H * cropAspect) / cellW);
      pLeft = W - pCols * cellW;
      sprites = makeSpriteSet(family, 1);

      N = gridFrom(images.neutral);
      N.wide = widen(N.mask, 4);
      videoCanvas = document.createElement("canvas");
      videoCanvas.width = pCols;
      videoCanvas.height = rows;
      videoCtx = videoCanvas.getContext("2d", { willReadFrequently: true });
      if (videoCtx) {
        videoCtx.imageSmoothingEnabled = true;
        videoCtx.imageSmoothingQuality = "high";
      }
      maskCanvas = document.createElement("canvas");
      maskCanvas.width = pCols;
      maskCanvas.height = rows;
      maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.imageSmoothingEnabled = true;
        maskCtx.imageSmoothingQuality = "high";
      }
      B = images.blink ? gridFrom(images.blink) : null;
      G = images.grin ? gridFrom(images.grin) : null;
      for (const name of ["left", "glance", "away"]) {
        if (images[name]) sheets[name] = sheetFrom(name, images[name]);
      }
      h = 0;
      hTarget = 0;

      const n = pCols * rows;
      tone = new Float32Array(n);
      toneScale = new Float32Array(n);
      dither = new Float32Array(n);
      poseLum = new Float32Array(n);
      poseMask = new Float32Array(n);
      cells = [];
      embers = [];
      span = new Float32Array(rows);
      fuel = new Int16Array(rows);
      heat = new Float32Array(rows * pCols);
      shown = new Float32Array(rows * pCols);
      ringOn = new Uint8Array(rows);
      const looseCols = pCols * E.span;
      for (let r = 0; r < rows; r++) {
        // The burning band is not a straight line either: its depth wanders with the row.
        span[r] = looseCols * (0.7 + 0.6 * noise(r * 0.11, 3.7));
        fuel[r] = Math.min(pCols - 1, Math.ceil(span[r]));
        // The fire eats the room and the shoulders, never the face: on the rows of the head the
        // band stops a few cells short of the person, with the mask grown to allow for the clip.
        if (N?.wide && r / rows < 0.62) {
          let face = 0;
          while (face < pCols && N.wide[r * pCols + face] < 0.35) face++;
          if (face < fuel[r] + 3) {
            fuel[r] = Math.max(2, face - 3);
            span[r] = Math.min(span[r], fuel[r]);
          }
        }
        const v = r / rows;
        for (let c = 0; c < pCols; c++) {
          const i = r * pCols + c;
          const u = c / pCols; // 0 at the frame's left edge
          // The frame darkens gently away from the face, like a lens would, and a
          // little dither keeps flat areas from turning into stripes of one character.
          const dist = Math.hypot((u - FACE.x) / 0.75, (v - FACE.y) / 0.95);
          toneScale[i] = 1 - 0.45 * smooth((dist - 0.25) / 0.8);
          dither[i] = (hash(c + 53, r + 211) - 0.5) * 0.07;
          // The face lands first, the room around it after, each cell from somewhere to its left.
          const person = N ? N.mask[i] : 0;
          const rA = hash(c + 17, r + 431);
          const rB = hash(c + 911, r + 29);
          cells.push({
            i,
            col: c,
            row: r,
            hx: pLeft + c * cellW,
            hy: r * cellH,
            id: person > 0.5 ? 0.05 + 0.55 * rA : 0.25 + 0.75 * rA + 0.2 * (1 - u),
            ix: -(0.04 + 0.3 * rB * rB) * W,
            iy: (hash(c + 5, r + 77) - 0.5) * cellH * 10,
          });
        }
      }
      shimmer = [];
      updateTone();
      for (let i = 0; i < heat.length; i++) heat[i] = cells[i].col >= fuel[cells[i].row] ? HEAT : 0;
      // Run the fire forward so embers are already in the air on the first frame, as if it had
      // always been burning. The intro draws the picture in that state (see render), so nothing
      // changes when the intro ends.
      if (!reduced) for (let k = 0; k < 240; k++) stepField(1 / 30);
      else for (let k = 0; k < 60; k++) stepFire(); // a still frame of the fire, not a straight edge
      if (reduced) embers = [];
      shown.set(heat);
      if (introT0 === -1) introT0 = time;
      else introT0 = -Infinity; // a rebuild after a resize draws the picture straight away
    }

    // ---- choreography -------------------------------------------------------

    // Critically damped smoothing toward a target (the SmoothDamp of game engines): the
    // motion eases in and out on its own and settles without snapping.
    function damp(cur: number, vel: number, target: number, smoothTime: number, dt: number): [number, number] {
      const omega = 2 / Math.max(0.0001, smoothTime);
      const x = omega * dt;
      const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const change = cur - target;
      const temp = (vel + omega * change) * dt;
      const nv = (vel - omega * temp) * e;
      return [target + (change + temp) * e, nv];
    }

    let hold = 0; // seconds before the next step of the script
    let nextGesture = rand(2, 4);
    let nextBlink = rand(1.2, 3);
    let blinkT = -1; // time into the current blink, or -1
    let blinkClose = 0.09;
    let blinkStay = 0.04;
    let blinkOpen = 0.17;
    let blinkPeak = 1;
    let blinkAgain = false;
    let restTarget = 0; // where the head drifts back to, changes a little every few seconds
    let nextRest = 0;
    let grinRest = 0.08;
    let nextGrinRest = 0;
    let script: (() => void)[] = [];

    function blink(again = false, peak = 1) {
      if (blinkT >= 0) return;
      blinkT = 0;
      blinkAgain = again;
      blinkPeak = peak;
      blinkClose = rand(0.07, 0.11);
      blinkStay = rand(0.02, 0.06);
      blinkOpen = rand(0.14, 0.24);
    }

    // Head targets are expressed between named keyframes on a given path.
    function between(on: "left" | "glance" | "away", nameA: string, nameB: string, f: number) {
      const a = nameA === "neutral" ? 0 : keyAt(nameA, on);
      const b = nameB === "neutral" ? 0 : keyAt(nameB, on);
      return a + (b - a) * f;
    }

    // The glance and away paths share their first leg (the original to the slight turn), so
    // the right-hand branch can change whenever the head is within that leg.
    function switchBranch(next: "glance" | "away") {
      if (branch === next || !sheets[next]) return;
      const shared = Math.min(Math.abs(keyAt("halfturn", "glance")), Math.abs(keyAt("halfturn", "away")));
      if (h <= shared + 0.002) branch = next;
    }

    function planGesture() {
      const roll = Math.random();
      const hasLeft = has("slightleft", "left");
      const hasGlance = has("halfturn", "glance") && has("halfdown", "glance");
      const hasDeep = has("turndown", "away") || has("turn", "away");
      if (roll < 0.34 && hasGlance) {
        // A small turn and a glance down, then drift back.
        hSmooth = rand(0.75, 1.1);
        script = [
          () => {
            switchBranch("glance");
            if (Math.random() < 0.65) blink();
            hTarget = between(branch, "halfturn", "halfdown", rand(0.55, 1));
            hold = rand(1.6, 3.4);
          },
          () => {
            hSmooth = rand(0.9, 1.3);
            hTarget = restTarget;
            hold = rand(0.6, 1.2);
          },
        ];
      } else if (roll < 0.52 && hasDeep) {
        // Look away and down properly, linger, then come back in two stages.
        hSmooth = rand(1, 1.4);
        script = [
          () => {
            switchBranch("away");
            if (branch !== "away") {
              hTarget = 0;
              hold = 0.8;
              script.unshift(() => {
                switchBranch("away");
                if (Math.random() < 0.8) blink();
                hTarget = between("away", "halfturn", lastKey("away"), rand(0.75, 1));
                hold = rand(2.2, 4.2);
              });
              return;
            }
            if (Math.random() < 0.8) blink();
            hTarget = between("away", "halfturn", lastKey("away"), rand(0.75, 1));
            hold = rand(2.2, 4.2);
          },
          () => {
            // Come part of the way back, as if something else caught the eye.
            hSmooth = rand(1, 1.4);
            hTarget = between("away", "neutral", "halfturn", rand(0.4, 1));
            hold = rand(0.8, 1.8);
          },
          () => {
            if (Math.random() < 0.5) blink();
            hSmooth = rand(1.1, 1.5);
            hTarget = restTarget;
            hold = rand(0.5, 1);
          },
        ];
      } else if (roll < 0.66 && hasLeft) {
        // A glance to the other side.
        hSmooth = rand(0.8, 1.2);
        script = [
          () => {
            if (Math.random() < 0.5) blink();
            hTarget = between("left", "neutral", "slightleft", rand(0.3, 0.65));
            hold = rand(1.2, 2.6);
          },
          () => {
            hSmooth = rand(0.9, 1.3);
            hTarget = restTarget;
            hold = rand(0.5, 1);
          },
        ];
      } else if (roll < 0.88) {
        // The grin, held a while, then let go slowly.
        gSmooth = rand(0.35, 0.55);
        script = [
          () => {
            gTarget = rand(0.7, 1);
            hold = rand(1.6, 3.6);
          },
          () => {
            gSmooth = rand(0.7, 1.1);
            gTarget = grinRest;
            hold = rand(0.6, 1.2);
          },
        ];
      } else if (hasGlance) {
        // A grin that turns into a glance down while it fades.
        gSmooth = rand(0.35, 0.5);
        script = [
          () => {
            gTarget = rand(0.65, 0.95);
            hold = rand(1, 1.8);
          },
          () => {
            gSmooth = rand(0.8, 1.2);
            gTarget = grinRest;
            hSmooth = rand(0.9, 1.2);
            switchBranch("glance");
            blink();
            hTarget = between(branch, "halfturn", "halfdown", rand(0.6, 1));
            hold = rand(1.6, 3);
          },
          () => {
            hSmooth = rand(1, 1.4);
            hTarget = restTarget;
            hold = rand(0.5, 1);
          },
        ];
      } else {
        script = [];
      }
    }

    function stepPose(dt: number) {
      // With a living-photograph clip the movement comes from the clip; only breathing stays.
      if (video && video.readyState >= 2) {
        const t = time;
        const breath = Math.sin(t * (2 * Math.PI) / 4.6 + noise(t * 0.05, 1.7) * 2);
        breathY = breath * 0.2 + (noise(t * 0.3, 2.2) - 0.5) * 0.1;
        breathX = (noise(t * 0.22, 6.4) - 0.5) * 0.12;
        return;
      }
      // Blink envelope: quick close, brief hold, slower open. Sizes and speeds vary.
      if (blinkT >= 0) {
        blinkT += dt;
        if (blinkT < blinkClose) sB = blinkPeak * smoother(blinkT / blinkClose);
        else if (blinkT < blinkClose + blinkStay) sB = blinkPeak;
        else if (blinkT < blinkClose + blinkStay + blinkOpen) sB = blinkPeak * (1 - smoother((blinkT - blinkClose - blinkStay) / blinkOpen));
        else {
          sB = 0;
          blinkT = -1;
          if (blinkAgain) {
            blinkAgain = false;
            nextBlink = rand(0.18, 0.3);
          }
        }
      } else {
        nextBlink -= dt;
        if (nextBlink <= 0) {
          const r = Math.random();
          blink(r < 0.14, r > 0.86 ? rand(0.5, 0.7) : 1);
          nextBlink = rand(2.2, 6.5);
        }
      }

      // The resting head position and mouth wander a little every few seconds.
      nextRest -= dt;
      if (nextRest <= 0) {
        nextRest = rand(2.5, 6);
        // Rest wanders between a third of the way to the left turn and the slight right turn.
        const left = has("slightleft", "left") ? keyAt("slightleft", "left") * 0.3 : 0;
        const right = has("halfturn", branch) ? keyAt("halfturn", branch) : 0;
        restTarget = left + (right - left) * Math.random();
        if (!script.length && hold <= 0) {
          hSmooth = rand(1.4, 2.4);
          hTarget = restTarget;
        }
      }
      nextGrinRest -= dt;
      if (nextGrinRest <= 0) {
        nextGrinRest = rand(2, 5);
        grinRest = rand(0.02, 0.22);
        if (!script.length && hold <= 0) {
          gSmooth = rand(0.9, 1.6);
          gTarget = grinRest;
        }
      }

      if (hold > 0) hold -= dt;
      else if (script.length) script.shift()!();
      else {
        nextGesture -= dt;
        if (nextGesture <= 0) {
          planGesture();
          nextGesture = rand(3.5, 7.5);
        }
      }

      [h, hVel] = damp(h, hVel, hTarget, hSmooth, dt);
      [g, gVel] = damp(g, gVel, gTarget, gSmooth, dt);

      // Layered noise keeps everything alive: a slow sway of the head, a faster tremor of
      // almost nothing, a little life in the mouth, and breathing in the whole figure.
      const t = time;
      const sway = (noise(t * 0.16, 3.3) - 0.5) * 0.06 + (noise(t * 0.7, 8.1) - 0.5) * 0.012;
      hShown = clamp(h + sway, -1, 1);
      gShown = clamp(g + (noise(t * 0.45, 5.5) - 0.5) * 0.05, 0, 1);
      const breath = Math.sin(t * (2 * Math.PI) / 4.6 + noise(t * 0.05, 1.7) * 2);
      breathY = breath * 0.28 + (noise(t * 0.3, 2.2) - 0.5) * 0.15;
      breathX = (noise(t * 0.22, 6.4) - 0.5) * 0.2;
    }

    // ---- the character field --------------------------------------------------

    function stepField(dt: number) {
      time += dt;
      const nt = time * 0.18;
      fireWait += dt;
      while (fireWait >= 1 / E.hz) {
        fireWait -= 1 / E.hz;
        stepFire();
      }
      // The drawn heat eases after the simulation, so shapes morph rather than jump.
      const k = E.ease > 0 ? 1 - Math.exp(-dt / E.ease) : 1;
      for (let i = 0; i < shown.length; i++) shown[i] += (heat[i] - shown[i]) * k;
      for (let k = embers.length - 1; k >= 0; k--) {
        const e = embers[k];
        e.t += dt;
        const x = pLeft + e.col * cellW;
        if (e.t >= e.life || x < -cellW || e.row < 0 || e.row >= rows) {
          embers.splice(k, 1);
          continue;
        }
        // One cell left per step, each step a little slower than the last; it rises now and then,
        // and the noise field decides when it slips a row the other way.
        e.wait += dt;
        const every = e.every * (1 + E.drag * (e.t / e.life));
        while (e.wait >= every) {
          e.wait -= every;
          e.trail.unshift([e.col, e.row]);
          if (e.trail.length > E.trail) e.trail.pop();
          e.col--;
          const drift = noise(x * 0.0045 + nt, e.row * cellH * 0.0045) - 0.5;
          if (Math.random() < E.climb) e.row--;
          else if (Math.random() < Math.abs(drift) * E.climb * 2) e.row += drift < 0 ? -1 : 1;
          // It thins toward the lightest characters as it cools.
          if (++e.steps % E.cool === 0) e.g = Math.max(1, e.g - 1);
        }
      }
      shimmer = shimmer.filter((s) => s.until > time);
      while (shimmer.length < 36 && cells.length) {
        const cell = cells[(Math.random() * cells.length) | 0];
        if (cell.col < fuel[cell.row] + 2 || tone[cell.i] < 0.12) continue;
        shimmer.push({ i: cell.i, ch: Math.random() < 0.5 ? -1 : 1, until: time + 0.08 + Math.random() * 0.2 });
      }
    }

    const shimmerAt = new Map<number, number>();

    function render() {
      ctx.globalAlpha = 1;
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      shimmerAt.clear();
      for (const s of shimmer) shimmerAt.set(s.i, s.ch);
      const bx = breathX * cellW;
      const by = breathY * cellH;
      const it = time - introT0;
      // How far a cell's intro has got: 0 before it sets off, 1 once it has landed.
      const landed = (id: number) => (it < INTRO_END ? smooth(clamp((it - id) / INTRO_DUR, 0, 1) * 1.6) : 1);
      const flick = Math.floor(time * E.flicker);
      const top = rampText.length - 1;
      for (const c of cells) {
        const t = tone[c.i];
        // Burnt where the heat, plus any pulse passing through, has dropped too low. A burnt cell
        // in the band can still carry the thin ring a pulse draws on its way out.
        const inBand = c.col < fuel[c.row];
        const d = inBand ? fuel[c.row] - c.col : 0;
        const h = inBand ? shown[c.i] + E.pulse * pulseAt(d, c.row, 0.16) : HEAT;
        if (h < SHOW) {
          if (!E.rings) continue;
          const ring = pulseAt(d, c.row, 0.035);
          if (ring < 0.25 || hash(c.i, flick) > 0.55 + 0.45 * ring) continue;
          // Rings fade in with the intro like everything else, so nothing appears when it ends.
          drawCell(c.hx, c.hy, 1 + ((hash(c.i + 3, flick) * 3) | 0), E.rings * ring * landed(c.id));
          continue;
        }
        const warmth = Math.min(1, (h - SHOW) / (HEAT - SHOW));
        // The burning front glows: the closer a cell is to going out, the brighter and denser its
        // character, whatever the picture is doing there.
        const rim = 1 - smooth(warmth / 0.3);
        if (t < 0.035 && rim < 0.2) continue;
        let ch = Math.min(top, Math.max(rim > 0.2 ? 2 : 1, charFor(t) + Math.round(rim * E.dense)));
        if (rim > 0 && hash(c.i + 7, flick) < 0.45 * rim) ch = Math.max(1, Math.min(top, ch + (hash(c.i, flick + 1) < 0.5 ? -1 : 1)));
        const sh = shimmerAt.get(c.i);
        if (sh !== undefined) ch = Math.max(1, Math.min(rampText.length - 1, ch + sh));
        let alpha = (0.32 + 0.68 * t) * (0.5 + 0.5 * smooth(warmth * 1.4));
        alpha += rim * Math.max(0, E.glow - alpha) * (0.75 + 0.25 * hash(c.i, flick + 2));
        // The figure breathes: the person's cells drift by a fraction of a cell, the room stays.
        const m = N ? N.mask[c.i] : 0;
        const x = c.hx + bx * m;
        const y = c.hy + by * m;
        if (it < INTRO_END) {
          const p = clamp((it - c.id) / INTRO_DUR, 0, 1);
          if (p <= 0) continue;
          const e = 1 - Math.pow(1 - p, 3);
          // In flight the character is still noise; it only becomes the picture as it lands.
          const flying = p < 0.72 ? 1 + ((hash(c.i, Math.floor(it * 18)) * (rampText.length - 1)) | 0) : ch;
          drawCell(x + Math.round((c.ix * (1 - e)) / cellW) * cellW, y + Math.round((c.iy * (1 - e)) / cellH) * cellH, flying, alpha * smooth(p * 1.6));
          continue;
        }
        drawCell(x, y, ch, alpha);
      }
      for (const e of embers) {
        const k = e.t / e.life;
        // An ember already in the air appears as the part of the edge it came from lands.
        const a = e.a * Math.pow(1 - k, 1.5) * landed(e.id);
        e.trail.forEach(([c, r], n) => drawCell(pLeft + c * cellW, r * cellH, Math.max(1, e.g - 1 - n), a * 0.45 * (1 - n / (E.trail + 1))));
        drawCell(pLeft + e.col * cellW, e.row * cellH, e.g, a);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      if (cancelled) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      stepPose(dt);
      updateTone();
      stepField(dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reduced && !offscreen) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    let family = "monospace";
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (stage.clientWidth === W && stage.clientHeight === H) return;
        build(family);
        render();
      }, 120);
    }
    const sizer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => onResize()) : null;
    // Pause when the hero is scrolled out of view; resume when it comes back.
    let offscreen = false;
    const watcher =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => {
            offscreen = !entries[0]?.isIntersecting;
            if (offscreen) {
              cancelAnimationFrame(raf);
              raf = 0;
              if (video) video.pause();
            } else if (!raf && !reduced && !document.hidden) {
              last = 0;
              if (video) video.play().catch(() => {});
              raf = requestAnimationFrame(frame);
            }
          })
        : null;

    (async () => {
      const names: Record<string, string> = { neutral: "neutral.png", blink: "blink.png", grin: "grin.png" };
      const loaded = await Promise.all(
        Object.entries(names).map(async ([key, file]) => {
          try {
            return [key, await loadImage(FRAMES + file)] as const;
          } catch {
            return [key, null] as const;
          }
        }),
      );
      images = {};
      for (const [key, img] of loaded) if (img) images[key] = img;
      if (!images.neutral || cancelled) return;
      family = getComputedStyle(stage).fontFamily || "monospace";
      try {
        await document.fonts.load(`500 12px ${family}`);
      } catch {
        // fall back to whatever the browser resolves
      }
      if (cancelled) return;
      // Draw the still straight away; the clip takes over when it can play.
      build(family);
      render();
      readyRef.current?.();
      if (!reduced) raf = requestAnimationFrame(frame);
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      sizer?.observe(stage);
      watcher?.observe(stage);
      if (reduced) return;

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
        return; // autoplay refused: stay on the still, which still blinks
      }
      if (cancelled) {
        v.pause();
        return;
      }
      video = v;
      videoPacked = true;
      if (offscreen) v.pause();
    })();

    return () => {
      cancelled = true;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      sizer?.disconnect();
      watcher?.disconnect();
    };
  }, [ground, ink, rowCount, rampText, sharpen, soften, intro]);

  return (
    <div ref={stageRef} style={{ position: "absolute", inset: 0, overflow: "hidden", background: ground, color: ink, fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <canvas
        ref={canvasRef}
        aria-label="Portrait of Ben Cheesebrough, drawn in characters"
        role="img"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
