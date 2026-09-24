"use client";

import { useEffect, useRef, useState } from "react";
import s from "./site.module.css";

// A paragraph whose words light up in reading order as it scrolls through the viewport.
export function Statement({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");
  const [lit, setLit] = useState(words.length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top of the paragraph reaches 85% of the viewport, 1 when its bottom reaches 55%.
      const p = (vh * 0.85 - r.top) / (r.height + vh * 0.3);
      setLit(Math.round(Math.min(1, Math.max(0, p)) * words.length));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [words.length]);

  return (
    <p ref={ref} className={s.statement}>
      {words.map((w, i) => (
        <span key={i} className={`${s.word} ${i < lit ? s.wordOn : ""}`}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
