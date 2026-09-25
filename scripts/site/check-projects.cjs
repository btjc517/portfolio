// Checks the Projects section's detail sheet: each tile opens it at its own address with focus
// inside; the arrow keys move between projects; Esc and the browser's Back both close it and
// give focus back to the tile; the page behind cannot scroll while it is open; and on a phone
// the sheet fills the screen and its detail scrolls to the end.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-projects.cjs [url]
const { chromium } = require("playwright");

const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const url = process.argv[2] || "http://localhost:3110/";
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  const check = (ok, what) => {
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  };
  for (const [w, h] of [[1512, 945], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, colorScheme: "dark", extraHTTPHeaders: bypass });
    await p.goto(url, { waitUntil: "networkidle" });
    const tiles = p.locator("#projects button[data-size]");
    const n = await tiles.count();
    for (let i = 0; i < n; i++) {
      await tiles.nth(i).scrollIntoViewIfNeeded();
      await tiles.nth(i).click();
      await p.waitForTimeout(700);
      const s = await p.evaluate(() => {
        const d = document.querySelector("[role=dialog]");
        const r = d?.getBoundingClientRect();
        return {
          open: !!d,
          hash: location.hash,
          focusIn: !!d && d.contains(document.activeElement),
          locked: document.documentElement.style.overflow === "hidden",
          // A phone gets the whole screen; a desktop gets a large sheet with the page around it.
          fills: !!r && (innerWidth < 800 ? r.width >= innerWidth - 1 && r.height >= innerHeight - 1 : r.width >= innerWidth * 0.8 && r.height >= innerHeight * 0.85),
        };
      });
      check(s.open && s.hash.startsWith("#projects/") && s.focusIn && s.locked && s.fills, `${w}px project ${i + 1}: sheet open at ${s.hash}, focus inside, page held, ${w < 800 ? "fills the screen" : "large sheet"}`);
      if (i === 0) {
        // Step picking shows that step's text.
        const texts = await p.locator("[role=dialog] [role=tab]").count();
        await p.locator("[role=dialog] [role=tab]").nth(Math.min(2, texts - 1)).click();
        const sel = await p.evaluate(() => document.querySelector("[role=dialog] [role=tab][aria-selected=true] span:last-child")?.textContent);
        check(!!sel, `${w}px picking a step selects it (${sel})`);
        // The detail scrolls to its end.
        const end = await p.evaluate(() => {
          const d = document.querySelector("[role=dialog]");
          const scroller = [...d.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY));
          if (scroller) scroller.scrollTop = scroller.scrollHeight;
          const chips = d.querySelector("h4:last-of-type")?.getBoundingClientRect();
          return chips ? chips.bottom <= innerHeight + 1 : false;
        });
        check(end, `${w}px the detail scrolls to "Built with"`);
        // Arrow keys move to the next project.
        await p.keyboard.press("Escape");
        await p.waitForTimeout(500);
        await tiles.nth(0).click();
        await p.waitForTimeout(600);
        const before = await p.evaluate(() => location.hash);
        await p.locator("[role=dialog] [data-close]").focus();
        await p.keyboard.press("ArrowRight");
        await p.waitForTimeout(400);
        const after = await p.evaluate(() => location.hash);
        check(before !== after && after.startsWith("#projects/"), `${w}px the right arrow moves to the next project (${before} to ${after})`);
        // Back closes it.
        await p.goBack();
        await p.waitForTimeout(600);
        const closed = await p.evaluate(() => !document.querySelector("[role=dialog]") && document.documentElement.style.overflow !== "hidden");
        check(closed, `${w}px the browser's Back closes the sheet and frees the page`);
        continue;
      }
      await p.keyboard.press("Escape");
      await p.waitForTimeout(600);
      const after = await p.evaluate((i) => ({
        open: !!document.querySelector("[role=dialog]"),
        back: document.activeElement === document.querySelectorAll("#projects button[data-size]")[i],
        hash: location.hash,
      }), i);
      check(!after.open && after.back && !/projects\//.test(after.hash), `${w}px project ${i + 1}: Esc closes, focus back on the tile, address ${after.hash || "(none)"}`);
    }
    // Moving on from a late step of a project to one with fewer steps must not break the sheet
    // (it once asked the next project for a step it did not have, and the sheet vanished).
    {
      const errors = [];
      const onErr = (e) => errors.push(String(e));
      p.on("pageerror", onErr);
      let alive = false;
      try {
        await tiles.nth(1).scrollIntoViewIfNeeded();
        await tiles.nth(1).click();
        await p.waitForTimeout(600);
        const steps = p.locator("[role=dialog] [role=tab]");
        await steps.nth((await steps.count()) - 1).click();
        await p.waitForTimeout(300);
        for (const label of ["Next project", "Next project", "Previous project", "Previous project", "Previous project"]) {
          await p.locator(`[role=dialog] button[aria-label='${label}']`).click({ timeout: 3000 });
          await p.waitForTimeout(350);
          const tabs = p.locator("[role=dialog] [role=tab]");
          await tabs.nth((await tabs.count()) - 1).click({ timeout: 3000 });
          await p.waitForTimeout(250);
        }
        alive = await p.evaluate(() => !!document.querySelector("[role=dialog] [role=tabpanel]"));
      } catch {
        alive = false;
      }
      p.off("pageerror", onErr);
      check(alive && errors.length === 0, `${w}px moving between projects from their last steps keeps the sheet (${errors.length} page errors)`);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(500);
    }
    // Opening straight from an address.
    await p.goto(url.replace(/#.*$/, "") + "#projects/cortex", { waitUntil: "networkidle" });
    await p.waitForTimeout(800);
    const direct = await p.evaluate(() => document.querySelector("[role=dialog] h3")?.textContent);
    check(direct === "Cortex", `${w}px #projects/cortex opens Cortex directly (${direct})`);
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
