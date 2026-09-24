// Prints the /cv page to public/BenCheesebrough-CV.pdf, the file the Download CV buttons
// serve, and fails if the CV no longer fits on one A4 page.
// Usage: NODE_PATH=$PWD/node_modules node scripts/site/make-cv-pdf.cjs [base-url]
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const base = process.argv[2] || "http://localhost:3110";
  const out = path.join(__dirname, "../../public/BenCheesebrough-CV.pdf");
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const p = await b.newPage();
  await p.goto(base + "/cv", { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  // The sheet is a fixed 297mm tall; its content must end inside it.
  const fit = await p.evaluate(() => {
    const sheet = document.querySelector("article");
    const over = [...sheet.querySelectorAll("section")].map((s) => s.getBoundingClientRect().bottom).reduce((a, b) => Math.max(a, b), 0);
    const pad = parseFloat(getComputedStyle(sheet).paddingBottom);
    const limit = sheet.getBoundingClientRect().bottom - pad;
    return { contentBottom: Math.round(over), limit: Math.round(limit), overflow: sheet.scrollHeight > sheet.clientHeight + 1 };
  });
  await p.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log(`wrote ${out}`, JSON.stringify(fit));
  if (fit.overflow || fit.contentBottom > fit.limit) {
    console.error("The CV does not fit on one page.");
    process.exit(1);
  }
})();
