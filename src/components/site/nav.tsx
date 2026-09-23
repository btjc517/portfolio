"use client";

import { useEffect, useState } from "react";
import { person } from "@/data/cv";
import { ArrowDown } from "./icons";
import s from "./site.module.css";

const LINKS = [
  { id: "profile", label: "Profile" },
  { id: "work", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      setSolid(y > vh * 0.6);
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
        <a href={person.cv} className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} download>
          CV <ArrowDown />
        </a>
      </nav>
    </header>
  );
}
