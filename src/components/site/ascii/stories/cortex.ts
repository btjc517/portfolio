import { clamp, type Grid, type Sim } from "../grid";

// Cortex: the detail sheet's scene, acting out each step of "How it works" (see the steps
// for "cortex" in src/data/cv.ts). Placeholder until the story is written: it names the step.

const STEPS = ["Sync", "Link", "Ask", "Act"];

export function cortexFlow(cols: number, rows: number): Sim {
  let at = 0;
  let since = 0;
  return {
    stage(n) {
      at = clamp(n, 0, STEPS.length - 1);
      since = 0;
    },
    step(dt) {
      since += dt;
    },
    draw(g: Grid) {
      g.put(2, 1, "CORTEX", 0.5);
      const name = `${String(at + 1).padStart(2, "0")}  ${STEPS[at]}`;
      g.put(Math.floor((cols - name.length) / 2), Math.floor(rows / 2), name, clamp(since * 2), true);
    },
  };
}
