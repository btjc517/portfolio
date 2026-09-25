// Checks the project pages: each tile opens /projects/<id> with its name, a breadcrumb and its
// scene; picking a step selects it; moving on from a project's last step to one with fewer steps
// keeps the page working (it once asked for a step the next project did not have); the arrow keys
// and Esc move between projects and back; Back and the breadcrumb return to Projects on the home
// page; old #projects/<id> links land on the page; and a phone never scrolls sideways.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/check-projects.cjs [url]
const { chromium } = require("playwright");

const bypass = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;

(async () => {
  const base = (process.argv[2] || "http://localhost:3110/").replace(/\/?$/, "/");
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  let failed = 0;
  const check = (ok, what) => {
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  };
  const projectsInView = (p) =>
    p.evaluate(() => {
      const r = document.querySelector("#projects")?.getBoundingClientRect();
      return !!r && r.top < innerHeight * 0.5 && r.bottom > 0;
    });

  for (const [w, h] of [[1512, 945], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, colorScheme: "dark", extraHTTPHeaders: bypass });
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(base, { waitUntil: "networkidle" });
    const n = await p.locator("#projects a[data-size]").count();

    for (let i = 0; i < n; i++) {
      await p.goto(base, { waitUntil: "networkidle" });
      const tile = p.locator("#projects a[data-size]").nth(i);
      await tile.scrollIntoViewIfNeeded();
      const name = (await tile.getAttribute("aria-label"))?.split(",")[0];
      await tile.click();
      await p.waitForURL(/\/projects\/[\w-]+$/);
      await p.waitForTimeout(700);
      const s = await p.evaluate(() => ({
        path: location.pathname,
        h1: document.querySelector("h1")?.textContent,
        crumbs: [...document.querySelectorAll("nav[aria-label=Breadcrumb] li")].map((li) => li.textContent.trim()),
        current: document.querySelector("nav[aria-label=Breadcrumb] [aria-current=page]")?.textContent.trim(),
        scene: !!document.querySelector("main canvas"),
        wide: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      check(s.h1 === name && s.current === name && s.crumbs.length === 3 && s.scene && !s.wide, `${w}px ${name}: ${s.path}, breadcrumb ${s.crumbs.join(" / ")}, scene drawn, no sideways scroll`);
    }

    // Steps, and moving on from a last step into a project with fewer steps.
    await p.goto(base + "projects/ingest", { waitUntil: "networkidle" });
    const steps = p.locator("main ol button[aria-controls]");
    await steps.nth(2).click();
    await p.waitForTimeout(300);
    const picked = await p.evaluate(() => document.querySelector("main ol button[aria-current=step] span:last-of-type")?.textContent);
    check(picked === "Silver", `${w}px picking a step selects it (${picked})`);
    const before = errors.length;
    await steps.nth((await steps.count()) - 1).click();
    await p.locator("a[aria-label^='Next project']").click();
    await p.waitForURL(/\/projects\/cortex$/);
    await p.waitForFunction(() => document.querySelector("h1")?.textContent === "Cortex", null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(300);
    const cortex = await p.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, on: document.querySelector("main ol button[aria-current=step] span:last-of-type")?.textContent }));
    check(cortex.h1 === "Cortex" && cortex.on === "Sync" && errors.length === before, `${w}px from the engine's last step, Next opens Cortex at its first step (${cortex.on}), no page errors`);

    // Keys: right arrow to the next project, Esc back to Projects.
    await p.keyboard.press("ArrowRight");
    await p.waitForURL(/\/projects\/scout$/);
    check(true, `${w}px the right arrow moves to the next project (scout)`);
    await p.keyboard.press("Escape");
    await p.waitForURL((u) => u.pathname === "/");
    await p.waitForTimeout(900);
    check(await projectsInView(p), `${w}px Esc goes back to Projects on the home page`);

    // Back from a project page lands on Projects, and so does the breadcrumb.
    await p.goto(base, { waitUntil: "networkidle" });
    await p.locator("#projects a[data-size]").nth(2).scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    await p.locator("#projects a[data-size]").nth(2).click();
    await p.waitForURL(/\/projects\//);
    await p.waitForTimeout(500);
    await p.goBack();
    await p.waitForURL((u) => u.pathname === "/");
    await p.waitForTimeout(900);
    check(await projectsInView(p), `${w}px Back from a project returns to Projects`);
    await p.goto(base + "projects/symphony", { waitUntil: "networkidle" });
    const crumb = p.locator("nav[aria-label=Breadcrumb] a", { hasText: "Projects" });
    await crumb.click();
    await p.waitForURL((u) => u.pathname === "/");
    await p.waitForTimeout(900);
    check(await projectsInView(p), `${w}px the breadcrumb's Projects returns to Projects`);

    // Old links from when projects opened over the page.
    // (Loaded fresh, as a link from elsewhere would be.)
    await p.goto("about:blank");
    await p.goto(base + "#projects/scout", { waitUntil: "networkidle" });
    await p.waitForURL(/\/projects\/scout$/, { timeout: 5000 }).catch(() => {});
    check(new URL(p.url()).pathname === "/projects/scout", `${w}px an old #projects/scout link lands on /projects/scout`);

    check(errors.length === 0, `${w}px no page errors (${errors.length})`);
    await p.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
