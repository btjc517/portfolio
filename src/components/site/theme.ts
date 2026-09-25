// The site's colours, read from the CSS tokens on [data-site] so canvases draw in the same ink as
// the page, and a way to hear when the theme changes. Themes are set by next-themes as
// data-theme="light" | "dark" on <html>.

export type Palette = { ink: string; bg: string; accent: string; light: boolean; tones: string[] };

// tones follows TONES in ascii/grid.ts: live, green, blue, violet, pink.
const FALLBACK: Palette = { ink: "#ecebe6", bg: "#0b0b0c", accent: "#ff5b1f", light: false, tones: ["#ff5b1f", "#79d4a1", "#86c2ff", "#bfb0ff", "#f79ec5"] };

export function readPalette(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const site = document.querySelector<HTMLElement>("[data-site]");
  if (!site) return FALLBACK;
  const cs = getComputedStyle(site);
  const get = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const accent = get("--accent", FALLBACK.accent);
  return {
    ink: get("--ink", FALLBACK.ink),
    bg: get("--bg", FALLBACK.bg),
    accent,
    light: document.documentElement.getAttribute("data-theme") === "light",
    tones: [accent, get("--green", FALLBACK.tones[1]), get("--blue", FALLBACK.tones[2]), get("--violet", FALLBACK.tones[3]), get("--pink", FALLBACK.tones[4])],
  };
}

/** Calls back with the new palette whenever <html data-theme> changes. Returns an unsubscribe. */
export function onThemeChange(cb: (p: Palette) => void) {
  const mo = new MutationObserver(() => cb(readPalette()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
