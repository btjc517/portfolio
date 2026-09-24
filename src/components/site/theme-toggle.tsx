"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import s from "./site.module.css";

// Switches between light and dark. The site follows the device's setting until someone picks;
// picking the mode the device is already in hands control back to the device.
export function ThemeToggle() {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const light = mounted && resolvedTheme === "light";
  const next = light ? "dark" : "light";
  return (
    <button
      type="button"
      className={s.themeBtn}
      onClick={() => setTheme(next === systemTheme ? "system" : next)}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
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
      <span>{mounted ? (light ? "Dark mode" : "Light mode") : "Theme"}</span>
    </button>
  );
}
