"use client";

import { useState } from "react";
import type { Role } from "@/data/cv";
import { ArrowUpRight } from "./icons";
import s from "./site.module.css";

export function Experience({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([roles[0]?.id]));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ol className={s.list} style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {roles.map((r, i) => {
        const isOpen = open.has(r.id);
        return (
          <li key={r.id} className={`${s.item} ${isOpen ? s.itemOpen : ""} ${s.reveal}`} data-reveal style={{ ["--d" as string]: i }}>
            <button className={s.row} aria-expanded={isOpen} aria-controls={`role-${r.id}`} onClick={() => toggle(r.id)}>
              <span className={`${s.mono} ${s.when} ${r.now ? s.whenNow : ""}`}>
                {r.now ? <span className={s.dot} aria-hidden="true" /> : null}
                {r.when}
              </span>
              <span className={s.main}>
                <span className={s.title}>
                  {r.company}
                  <em>{r.role}</em>
                </span>
                <span className={s.summary}>{r.summary}</span>
              </span>
              <span className={`${s.mono} ${s.place}`}>{r.place}</span>
              <span className={s.plus} aria-hidden="true" />
            </button>
            <div className={s.panel} id={`role-${r.id}`} role="region" aria-label={`${r.company} details`}>
              <div className={s.panelInner}>
                <div className={s.panelBody}>
                  <ul className={s.points}>
                    {r.points.map((p, k) => (
                      <li key={k}>
                        <span className={s.mono}>{String(k + 1).padStart(2, "0")}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={s.meta}>
                    {r.stack.map((t) => (
                      <span key={t} className={`${s.mono} ${s.chip}`}>
                        {t}
                      </span>
                    ))}
                    {r.url ? (
                      <a className={s.visit} href={r.url} target="_blank" rel="noreferrer" tabIndex={isOpen ? 0 : -1}>
                        {new URL(r.url).hostname.replace(/^www\./, "")} <ArrowUpRight />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
