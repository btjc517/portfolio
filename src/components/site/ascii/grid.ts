// The character grid every small ASCII scene draws into, and the helpers they share. Colours come
// from the page's theme when the grid is drawn (see miniature.tsx).

export const ASPECT = 0.6; // cell width over cell height

/** The colours a character can take besides the ink. Each has one meaning across the site:
 * live is the orange accent (what is happening now, or the one thing that matters); green is
 * done, passed or ESG; blue is data, water and structure; violet is AI and agents; pink is
 * creators and social. Used on a few characters per scene, never whole scenes. */
export type Tone = "live" | "green" | "blue" | "violet" | "pink";
export const TONES: readonly Tone[] = ["live", "green", "blue", "violet", "pink"];

export class Grid {
  ch: string[];
  a: Float32Array;
  /** The tone of each cell: 0 for ink, otherwise 1 + its index in TONES. */
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
  /** Writes text at a cell; later writes win unless keep is set and the cell is brighter.
   * hot is true for the live accent, or a Tone. */
  put(x: number, y: number, text: string, alpha: number, hot: boolean | Tone = false, keep = false) {
    const tone = hot === true ? 1 : hot ? TONES.indexOf(hot) + 1 : 0;
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
      this.hot[i] = tone;
    }
  }
}

export type Sim = {
  step: (dt: number, t: number) => void;
  draw: (g: Grid, t: number) => void;
  /** Story scenes only: move to step n of the project's "How it works". Called whenever the
   * reader's step changes, in any order, and once right after the scene is created. */
  stage?: (n: number) => void;
};

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const pick = (xs: string) => xs[(Math.random() * xs.length) | 0];

