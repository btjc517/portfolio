import type { Tone } from "./ascii/grid";

/** The CSS colour for a tone: the accent for live, otherwise its token (see site.module.css). */
export const toneVar = (t: Tone) => (t === "live" ? "var(--accent)" : `var(--${t})`);

/** The page's own background, set on <html> so overscroll and the theme switch never flash. */
export const PAGE_BG = "html,body{background:#0b0b0c;color-scheme:dark}html[data-theme=light],html[data-theme=light] body{background:#f5f4f0;color-scheme:light}";
