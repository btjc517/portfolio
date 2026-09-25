// Regression check for the experience rows: clicking a row must never hide it.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-rows.cjs [url]
// Set PW_CHROME to a Chrome binary if Playwright's bundled one is missing.
const { chromium } = require("playwright");

// VERCEL_BYPASS, when set, is sent as Vercel's protection bypass header so a protected preview
// can be checked. It is read from the environment and never printed.
const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  for (const viewport of [{ width: 1512, height: 945 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport , extraHTTPHeaders: bypass });
    await p.goto(url, { waitUntil: "networkidle" });
    await p.locator("#work").scrollIntoViewIfNeeded();
    await p.waitForTimeout(1500);
    const rows = p.locator("#work ol > li");
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      for (const press of ["open", "close"]) {
        await row.locator("button").first().click();
        // Pressing a row can scroll to it first (the pinned section steps to it), so give it up
        // to 2.5 s to settle; the bug this guards against left the row faded for good.
        let opacity = 0;
        for (let waited = 0; waited < 2500 && opacity <= 0.99; waited += 100) {
          await p.waitForTimeout(100);
          opacity = await row.evaluate((el) => Number(getComputedStyle(el).opacity));
        }
        const ok = opacity > 0.99;
        if (!ok) failed++;
        console.log(`${viewport.width}px row ${i + 1}/${n} after ${press}: opacity ${opacity.toFixed(2)} ${ok ? "ok" : "FAIL"}`);
      }
    }
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
