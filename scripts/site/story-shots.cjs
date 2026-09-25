// Screens a project's detail-sheet scene at every step of "How it works", on a desktop and a
// phone, mid-change and settled, so a story scene can be checked step by step. Optionally records
// a video of the steps playing through on their own.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/story-shots.cjs <project-id> <out-dir> [--video] [url]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const [id, out, ...rest] = process.argv.slice(2);
  const video = rest.includes("--video");
  const url = rest.find((r) => r.startsWith("http")) || "http://localhost:3110/";
  if (!id || !out) {
    console.error("usage: story-shots.cjs <project-id> <out-dir> [--video] [url]");
    process.exit(2);
  }
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  for (const [w, h, name] of [[1512, 945, "desktop"], [390, 844, "phone"]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, colorScheme: "dark" });
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(url.replace(/#.*$/, "") + "#projects/" + id, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    const tabs = p.locator("[role=dialog] [role=tab]");
    const n = await tabs.count();
    for (let k = 0; k < n; k++) {
      await tabs.nth(k).click();
      await p.waitForTimeout(450);
      await p.locator("[role=dialog] canvas").first().screenshot({ path: path.join(out, `${name}-${k + 1}-mid.png`) });
      await p.waitForTimeout(2600);
      await p.locator("[role=dialog] canvas").first().screenshot({ path: path.join(out, `${name}-${k + 1}.png`) });
    }
    console.log(`${name}: ${n} steps screened${errors.length ? ", page errors: " + errors.join(" | ") : ""}`);
    await p.close();
  }
  if (video) {
    const ctx = await b.newContext({ viewport: { width: 1512, height: 945 }, colorScheme: "dark", recordVideo: { dir: out, size: { width: 1512, height: 945 } } });
    const p = await ctx.newPage();
    await p.goto(url.replace(/#.*$/, "") + "#projects/" + id, { waitUntil: "networkidle" });
    const n = await p.locator("[role=dialog] [role=tab]").count();
    await p.waitForTimeout(n * 4600 + 1500); // the steps play through on their own
    await ctx.close();
    console.log("video saved in", out);
  }
  await b.close();
})();
