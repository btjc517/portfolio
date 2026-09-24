// Scrolls through Experience and Education on a desktop screen and checks that every row takes
// its turn on the pinned scene while the scene's bar is still fully in view under the nav.
// A large scene pins for a short stretch; if rows only switched at a fixed line mid-screen, the
// last ones would come on after the scene had started to scroll away.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-stage.cjs [url] [shots-prefix]
const { chromium } = require("playwright");

const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const shots = process.argv[3];
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  for (const [w, h] of [[1512, 945], [1280, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: "dark", extraHTTPHeaders: bypass });
    await p.goto(url, { waitUntil: "networkidle" });
    for (const sec of ["#work", "#education"]) {
      const n = await p.locator(`${sec} [data-stage-id]`).count();
      const top = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sec);
      const end = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().bottom + scrollY, sec);
      const seen = new Map();
      for (let y = top - h; y < end; y += 24) {
        await p.evaluate((y) => window.scrollTo(0, y), y);
        await p.waitForTimeout(60);
        const r = await p.evaluate((s) => {
          const fig = document.querySelector(`${s} figure[data-tile]`);
          const bar = fig.querySelector("figcaption").getBoundingClientRect();
          const idx = parseInt(fig.querySelector("figcaption span").textContent, 10);
          return { idx, barTop: bar.top, barBottom: bar.bottom };
        }, sec);
        const inView = r.barTop >= 60 && r.barBottom <= h;
        if (inView && !seen.has(r.idx)) seen.set(r.idx, y);
      }
      for (let k = 1; k <= n; k++) {
        const ok = seen.has(k);
        if (!ok) failed++;
        console.log(`${w}px ${sec} row ${k}/${n}: ${ok ? "on with the scene in view" : "FAIL, never on while the scene was in view"}`);
        if (ok && shots) {
          await p.evaluate((y) => window.scrollTo(0, y), seen.get(k));
          await p.waitForTimeout(1500);
          await p.locator(`${sec} figure[data-tile]`).screenshot({ path: `${shots}-${w}-${sec.slice(1)}-${k}.png` });
        }
      }
    }
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
