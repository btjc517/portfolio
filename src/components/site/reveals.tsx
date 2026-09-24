"use client";

import { useEffect } from "react";

// Fades every [data-reveal] element up as it enters the viewport, once. It marks them with an
// attribute rather than a class: React rewrites className whenever a component re-renders
// (opening an experience row, say), which would strip a class added here and hide the element.
export function Reveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
