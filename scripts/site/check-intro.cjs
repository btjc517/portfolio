// Regression checks for the portrait intro, sampling the ink in the frayed left edge every
// animation frame for the first seconds after load:
// 1. No jump: the edge never loses a large share of its characters between two frames.
// 2. No pause: the edge is already shedding when the intro ends, so its ink just after the intro
//    matches its ink a few seconds later. An edge that lands whole and only then starts
//    shedding thins out afterwards and fails this.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-intro.cjs [url]
// Set PW_CHROME to a Chrome binary if Playwright's bundled one is missing.
const { chromium } = require("playwright");

const SECONDS = 10.5;
// Largest allowed loss of band ink from one frame to the next. The bug this guards against
// (every loose character leaving at once when the intro ended) measured 31 to 35%; the intended
// resolve from noise into the picture measures up to about 11% on a busy machine at 28fps.
const MAX_DROP = 0.18;
// Largest allowed change in average edge ink from just after the intro to later. The edge's tall,
// slow shapes swing its ink by up to 25% between single seconds on their own, so the check compares
// two seconds just after the intro with four seconds from 6 to 10 s.
const MAX_SETTLE = 0.2;

// VERCEL_BYPASS, when set, is sent as Vercel's protection bypass header so a protected preview
// can be checked. It is read from the environment and never printed.
const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  // Desktop sizes only: on a phone the portrait is cropped and its frayed edge is off-screen.
  for (const viewport of [{ width: 1512, height: 945 }, { width: 1920, height: 1080 }]) {
    // Dark mode: the check measures light ink on the dark ground.
    const p = await b.newPage({ viewport, deviceScaleFactor: 2, colorScheme: "dark", extraHTTPHeaders: bypass });
    await p.addInitScript((seconds) => {
      const out = (window.__band = []);
      const small = document.createElement("canvas");
      const sctx = small.getContext("2d", { willReadFrequently: true });
      let t0 = 0;
      const tick = (now) => {
        const c = document.querySelector('canvas[aria-label^="Portrait"]');
        if (c && c.width) {
          if (!t0) t0 = now;
          // The portrait is right-aligned; its frame is the photo's crop aspect times the height.
          const H = c.height;
          const frameW = Math.min(c.width, H * (375 / (500 * 0.88)));
          const x0 = c.width - frameW;
          const bw = frameW * 0.14; // the outer part of the fray, where most characters come loose
          small.width = 60;
          small.height = 160;
          sctx.drawImage(c, x0, 0, bw, H, 0, 0, 60, 160);
          const d = sctx.getImageData(0, 0, 60, 160).data;
          // Ink above the ground colour (#0b0b0c), so the dark background does not count.
          let ink = 0;
          for (let k = 0; k < d.length; k += 4) ink += Math.max(0, d[k] - 12);
          out.push([(now - t0) / 1000, ink]);
        }
        if (!t0 || now - t0 < seconds * 1000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, SECONDS);
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout((SECONDS + 3) * 1000);
    const band = await p.evaluate(() => window.__band);
    // Only judge once the edge has mostly arrived; before that the ink is still rising.
    const peak = Math.max(...band.map(([, v]) => v));
    let worst = 0;
    let at = 0;
    for (let k = 1; k < band.length; k++) {
      const [t, v] = band[k];
      const prev = band[k - 1][1];
      if (prev < peak * 0.5) continue;
      const drop = (prev - v) / peak;
      if (drop > worst) (worst = drop), (at = t);
    }
    const ok = worst <= MAX_DROP;
    if (!ok) failed++;
    console.log(`${viewport.width}px: ${band.length} frames, worst one-frame drop ${(worst * 100).toFixed(1)}% of peak at ${at.toFixed(2)}s ${ok ? "ok" : "FAIL"}`);
    // The intro ends 2.2s after the portrait first draws.
    const mean = (a, b) => {
      const v = band.filter(([t]) => t >= a && t < b).map(([, x]) => x);
      return v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
    };
    const early = mean(2.6, 4.6);
    const late = mean(6, 10);
    const settle = Math.abs(early - late) / Math.max(early, late);
    const ok2 = settle <= MAX_SETTLE;
    if (!ok2) failed++;
    console.log(`${viewport.width}px: edge ink 2.6 to 4.6s vs 6 to 10s differs by ${(settle * 100).toFixed(1)}% ${ok2 ? "ok" : "FAIL"}`);
    if (process.env.TRACE) console.log(band.filter((_, k) => k % 6 === 0).map(([t, v]) => `${t.toFixed(2)}:${Math.round((v / peak) * 100)}`).join(" "));
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
