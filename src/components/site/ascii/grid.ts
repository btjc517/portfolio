// The character grid every small ASCII scene draws into, and the helpers they share. Colours come
// from the page's theme when the grid is drawn (see miniature.tsx).

export const ASPECT = 0.6; // cell width over cell height

export class Grid {
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

export type Sim = { step: (dt: number, t: number) => void; draw: (g: Grid, t: number) => void };

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const pick = (xs: string) => xs[(Math.random() * xs.length) | 0];

