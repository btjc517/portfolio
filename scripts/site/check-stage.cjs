// Scrolls through Experience and Education on desktop screens and checks that every row takes
// its turn on the scene while the scene's caption line is fully in view under the nav. For
// Experience, which pins and steps through its roles, the role must also be open and wholly
// visible in the list at that moment, with nothing else open.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-stage.cjs [url] [shots-prefix]
const { chromium } = require("playwright");

const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const shots = process.argv[3];
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  for (const [w, h] of [[1512, 945], [1280, 800], [1440, 720]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: "dark", extraHTTPHeaders: bypass });
    await p.goto(url, { waitUntil: "networkidle" });
    for (const sec of ["#work", "#education"]) {
      const n = await p.locator(`${sec} [data-stage-id]`).count();
      const top = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sec);
      const end = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().bottom + scrollY, sec);
      const seen = new Map();
      for (let y = top - h; y < end; y += 24) {
        await p.evaluate((y) => window.scrollTo(0, y), y);
        await p.waitForTimeout(sec === "#work" ? 260 : 60);
        const r = await p.evaluate((s) => {
          const fig = document.querySelector(`${s} figure[data-tile]`);
          const bar = fig.querySelector("figcaption").getBoundingClientRect();
          const idx = parseInt(fig.querySelector("figcaption span").textContent, 10);
          // For Experience: is that role the only one open, and is all of it on screen?
          let row = true;
          const rows = document.querySelectorAll(`${s} ol > li`);
          if (rows.length) {
            const li = rows[idx - 1];
            // The nearest ancestor that clips the list, if any.
            let el = li.parentElement;
            while (el && !/clip|hidden/.test(getComputedStyle(el).overflow)) el = el.parentElement;
            const clip = el?.getBoundingClientRect();
            const box = li.getBoundingClientRect();
            const open = [...rows].filter((x) => x.querySelector("button").getAttribute("aria-expanded") === "true");
            row = open.length === 1 && open[0] === li && box.top >= Math.max(60, clip ? clip.top : 0) - 1 && box.bottom <= Math.min(innerHeight, clip ? clip.bottom : innerHeight) + 1;
          }
          return { idx, barTop: bar.top, barBottom: bar.bottom, row };
        }, sec);
        const inView = r.barTop >= 60 && r.barBottom <= h && r.row;
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
