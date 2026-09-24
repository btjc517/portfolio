// Ben's name, set large, must be no heavier than MAX_WEIGHT everywhere it appears: the hero, the
// footer wordmark (a canvas, which reports its weight in data-weight) and the PDF CV's header.
// Ben asked twice for a lighter name; this fails on the old 540, 400 and 600 settings.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-type.cjs [base-url]
const { chromium } = require("playwright");

const MAX_WEIGHT = 300;
const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const base = (process.argv[2] || "http://localhost:3110/").replace(/\/$/, "");
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const p = await b.newPage({ extraHTTPHeaders: bypass });
  await p.goto(base + "/", { waitUntil: "networkidle" });
  const home = await p.evaluate(() => ({
    hero: Number(getComputedStyle(document.querySelector("#top h1")).fontWeight),
    wordmark: Number(document.querySelector('canvas[data-weight]')?.dataset.weight ?? NaN),
  }));
  await p.goto(base + "/cv", { waitUntil: "networkidle" });
  const cv = await p.evaluate(() => Number(getComputedStyle(document.querySelector("article h1")).fontWeight));
  await b.close();
  let failed = 0;
  for (const [where, w] of [["hero", home.hero], ["footer wordmark", home.wordmark], ["PDF CV header", cv]]) {
    const ok = Number.isFinite(w) && w <= MAX_WEIGHT;
    if (!ok) failed++;
    console.log(`${where}: weight ${w} ${ok ? "ok" : "FAIL (max " + MAX_WEIGHT + ")"}`);
  }
  process.exit(failed ? 1 : 0);
})();
