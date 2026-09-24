// Pushes the footer wordmark hard with the pointer and checks that no character is cut off at the
// canvas edge (the outermost row and column of cells must stay empty, since pushes are capped
// inside the room the canvas has), and that the links around it still take clicks.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-wordmark.cjs [url]
const { chromium } = require("playwright");

const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  for (const [w, h, mobile] of [[1512, 945, false], [390, 844, true]]) {
    for (const scheme of ["dark", "light"]) {
      const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, extraHTTPHeaders: bypass });
      await p.goto(url, { waitUntil: "networkidle" });
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(3000);
      const name = await p.locator('[role=img][aria-label="Ben Cheesebrough"]').last().boundingBox();
      let worst = 0;
      // Sweep across the top edge, the bottom edge and the middle of the name, fast.
      for (const fy of [0.02, 0.5, 0.98]) {
        for (let x = name.x + 4; x < name.x + name.width - 4; x += 9) {
          await p.mouse.move(x, name.y + name.height * fy, { steps: 1 });
          if (x % 45 < 9) {
            const edge = await p.evaluate(() => {
              const c = document.querySelector("canvas[data-weight]");
              const ctx = c.getContext("2d");
              const ext = Number(c.dataset.ext);
              const rowPx = Math.ceil(c.height / (ext * 2 + 1) / 3); // well under one cell row
              const strips = [
                ctx.getImageData(0, 0, c.width, 2).data,
                ctx.getImageData(0, c.height - 2, c.width, 2).data,
              ];
              let ink = 0;
              for (const d of strips) for (let k = 3; k < d.length; k += 4) if (d[k] > 40) ink++;
              return ink;
            });
            worst = Math.max(worst, edge);
          }
        }
      }
      const clickable = await p.evaluate(() => {
        const a = [...document.querySelectorAll("a")].find((el) => el.textContent.includes("Download PDF"));
        const r = a.getBoundingClientRect();
        return document.elementFromPoint(r.left + 4, r.top + r.height / 2)?.closest("a") === a;
      });
      const ok = worst === 0 && clickable;
      if (!ok) failed++;
      console.log(`${w}px ${scheme}: ink on the canvas's top and bottom edge while pushing: ${worst}px, links clickable: ${clickable} ${ok ? "ok" : "FAIL"}`);
      await p.close();
    }
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
