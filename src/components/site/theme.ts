// The site's colours, read from the CSS tokens on [data-site] so canvases draw in the same ink as
// the page, and a way to hear when the theme changes. Themes are set by next-themes as
// data-theme="light" | "dark" on <html>.

export type Palette = { ink: string; bg: string; accent: string; light: boolean };

const FALLBACK: Palette = { ink: "#ecebe6", bg: "#0b0b0c", accent: "#ff5b1f", light: false };

export function readPalette(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const site = document.querySelector<HTMLElement>("[data-site]");
  if (!site) return FALLBACK;
  const cs = getComputedStyle(site);
  const get = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: get("--ink", FALLBACK.ink),
    bg: get("--bg", FALLBACK.bg),
    accent: get("--accent", FALLBACK.accent),
    light: document.documentElement.getAttribute("data-theme") === "light",
  };
}

/** Calls back with the new palette whenever <html data-theme> changes. Returns an unsubscribe. */
export function onThemeChange(cb: (p: Palette) => void) {
  const mo = new MutationObserver(() => cb(readPalette()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
