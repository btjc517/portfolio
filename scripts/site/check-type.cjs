// Ben's name, set as type in the hero and the PDF CV's header, must be no heavier than MAX_WEIGHT:
// he asked twice for it lighter (540, then 400). The footer wordmark, the name drawn in
// characters (a canvas that reports its weight in data-weight), must stay bold: he liked it that
// way and it went thin when it shared the hero's setting.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-type.cjs [base-url]
const { chromium } = require("playwright");

const MAX_WEIGHT = 200;
const WORDMARK_MIN = 800;
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
  for (const [where, w] of [["hero", home.hero], ["PDF CV header", cv]]) {
    const ok = Number.isFinite(w) && w <= MAX_WEIGHT;
    if (!ok) failed++;
    console.log(`${where}: weight ${w} ${ok ? "ok" : "FAIL (max " + MAX_WEIGHT + ")"}`);
  }
  const bold = Number.isFinite(home.wordmark) && home.wordmark >= WORDMARK_MIN;
  if (!bold) failed++;
  console.log(`footer wordmark: weight ${home.wordmark} ${bold ? "ok" : "FAIL (min " + WORDMARK_MIN + ")"}`);
  process.exit(failed ? 1 : 0);
})();
