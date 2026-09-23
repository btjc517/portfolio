// Regression check for the experience rows: clicking a row must never hide it.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-rows.cjs [url]
// Set PW_CHROME to a Chrome binary if Playwright's bundled one is missing.
const { chromium } = require("playwright");

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  for (const viewport of [{ width: 1512, height: 945 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport });
    await p.goto(url, { waitUntil: "networkidle" });
    await p.locator("#work").scrollIntoViewIfNeeded();
    await p.waitForTimeout(1500);
    const rows = p.locator("#work ol > li");
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      for (const press of ["open", "close"]) {
        await row.locator("button").first().click();
        await p.waitForTimeout(900);
        const opacity = await row.evaluate((el) => Number(getComputedStyle(el).opacity));
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
