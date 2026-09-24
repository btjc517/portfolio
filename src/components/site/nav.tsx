"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { person } from "@/data/cv";
import { ArrowDown } from "./icons";
import s from "./site.module.css";

const LINKS = [
  { id: "profile", label: "Profile" },
  { id: "work", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const light = mounted && resolvedTheme === "light";
  return (
    <button
      type="button"
      className={s.themeBtn}
      onClick={() => setTheme(light ? "dark" : "light")}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
    >
      {!mounted ? null : light ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M13.2 9.6A5.5 5.5 0 0 1 6.4 2.8a5.5 5.5 0 1 0 6.8 6.8Z" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="8" cy="8" r="2.8" />
          <path d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5 3.4 3.4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      // Solid as soon as the page moves, so the nav never sits see-through over the hero's name.
      setSolid(y > 24);
      let on: string | null = null;
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top < vh * 0.45) on = l.id;
      }
      // The last section is short; count it once the page bottoms out.
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) on = "contact";
      setActive(on);
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
  }, []);

  return (
    <header className={`${s.nav} ${solid ? s.navSolid : ""}`}>
      <a href="#top" className={s.brand} aria-label="Ben Cheesebrough, back to top">
        <span>{person.name}</span>
        <span className={s.brandRole} style={{ opacity: solid ? 1 : 0 }}>
          {person.role}, {person.company}
        </span>
      </a>
      <nav className={s.navLinks} aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} className={`${s.navLink} ${active === l.id ? s.navLinkOn : ""}`}>
            {l.label}
          </a>
        ))}
        <ThemeToggle />
        <a href={person.cv} className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} download>
          CV <ArrowDown />
        </a>
      </nav>
    </header>
  );
}
