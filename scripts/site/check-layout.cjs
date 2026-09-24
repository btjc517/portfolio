// Fails if the page is wider than the screen at any common size, which on a phone means the
// whole page scrolls sideways. Names the widest elements that stick out.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-layout.cjs [url]
const { chromium } = require("playwright");

// VERCEL_BYPASS, when set, is sent as Vercel's protection bypass header so a protected preview
// can be checked. It is read from the environment and never printed.
const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  for (const scheme of ["dark", "light"])
  for (const [w, h] of [[320, 640], [375, 667], [390, 844], [768, 1024], [1280, 800], [1512, 945]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, colorScheme: scheme, extraHTTPHeaders: bypass });
    await p.goto(url, { waitUntil: "networkidle" });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width && b.right > vw + 1 && getComputedStyle(el).position !== "fixed") over.push([Math.round(b.right), el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0], (el.textContent || "").trim().slice(0, 30)]);
      }
      over.sort((a, b) => b[0] - a[0]);
      return { vw, scroll: document.documentElement.scrollWidth, over: over.slice(0, 3) };
    });
    const ok = r.scroll <= r.vw;
    if (!ok) failed++;
    console.log(`${scheme} ${w}px: page ${r.scroll}px wide ${ok ? "ok" : "FAIL " + JSON.stringify(r.over)}`);
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
