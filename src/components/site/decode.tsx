"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=-/<>";

// Monospace text that arrives as noise and resolves left to right when it scrolls into
// view. Width never changes because every glyph is the same width.
export function Decode({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPending(false);
      return;
    }
    let raf = 0;
    let start = 0;
    const order = Array.from(text, (_, i) => i / Math.max(1, text.length - 1) * 0.55 + Math.random() * 0.45);
    const run = (now: number) => {
      if (!start) start = now;
      const t = (now - start - delay) / 700;
      let done = true;
      const out = Array.from(text, (ch, i) => {
        if (ch === " " || t >= order[i]) return ch;
        done = false;
        return t < 0 && i > 0 ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join("");
      setShown(out);
      if (!done) raf = requestAnimationFrame(run);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        setPending(false);
        raf = requestAnimationFrame(run);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, delay]);

  return (
    <span ref={ref} className={className} aria-label={text} style={{ opacity: pending ? 0 : 1, whiteSpace: "pre" }}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
