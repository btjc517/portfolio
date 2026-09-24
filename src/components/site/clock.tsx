"use client";

import { useEffect, useState } from "react";

const fmt = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date());

// London time, ticking. Renders a placeholder on the server so hydration matches.
export function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    setNow(fmt());
    const id = window.setInterval(() => setNow(fmt()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{now ?? "--:--:-- ---"}</span>;
}
