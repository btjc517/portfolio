"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { education as Education, Role } from "@/data/cv";
import type { SceneKind } from "./ascii/scenes";
import { Decode } from "./decode";
import { Experience } from "./experience";
import { Miniature } from "./miniature";
import s from "./site.module.css";

export function RailHead({ n, label, count }: { n: string; label: string; count?: number }) {
  return (
    <div className={`${s.railHead} ${s.mono}`}>
      <span className={s.railNum}>{n}</span>
      <Decode text={label} />
      {count ? <span className={s.railCount}>{String(count).padStart(2, "0")}</span> : null}
    </div>
  );
}

type Item = { id: string; scene: SceneKind; caption: string; name: string };

// The row a reader is on: the one under the pointer, otherwise the last row whose top has
// passed the middle of the screen.
export function useActiveRow(ids: string[]) {
  const listRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(ids[0]);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const list = listRef.current;
      if (!list) return;
      // Beside the list (desktop) the line is mid-screen; stacked above it (phone) the pinned
      // scene covers the top of the screen, so the line sits just below the scene.
      const stage = list.parentElement?.querySelector<HTMLElement>("[data-tile]")?.getBoundingClientRect();
      const stacked = stage ? stage.right > list.getBoundingClientRect().left : false;
      const line = stacked && stage ? stage.bottom + 72 : window.innerHeight * 0.5;
      let on = ids[0];
      list.querySelectorAll<HTMLElement>("[data-stage-id]").forEach((el) => {
        if (el.getBoundingClientRect().top < line) on = el.dataset.stageId ?? on;
      });
      setScrolled(on);
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
  }, [ids]);

  return { listRef, active: hover ?? scrolled, setHover };
}

// A pinned screen in the left column that shows the scene for the active row.
export function Stage({ items, active }: { items: Item[]; active: string }) {
  const k = Math.max(0, items.findIndex((it) => it.id === active));
  const item = items[k];
  return (
    <figure className={s.stage} data-tile>
      <div className={s.stageScreen}>
        <Miniature kind={item.scene} label={`${item.name}: ${item.caption}, animated in characters`} />
      </div>
      <figcaption className={`${s.mono} ${s.stageCap}`}>
        <span>
          {String(k + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>
        <span className={s.stageName}>{item.caption}</span>
      </figcaption>
    </figure>
  );
}

export function StagedSection({
  id,
  n,
  label,
  count,
  items,
  children,
}: {
  id: string;
  n: string;
  label: string;
  count?: number;
  items: Item[];
  children: (state: { active: string; setHover: (id: string | null) => void }) => ReactNode;
}) {
  const { listRef, active, setHover } = useActiveRow(items.map((it) => it.id));
  return (
    <section id={id} className={s.section} aria-labelledby={`${id}-h`}>
      <div className={s.rule} />
      <div className={s.grid}>
        <div className={`${s.rail} ${s.railStaged}`}>
          <RailHead n={n} label={label} count={count} />
          <Stage items={items} active={active} />
        </div>
        <div className={s.body} ref={(el) => void (listRef.current = el)}>
          <h2 id={`${id}-h`} className="sr-only">
            {label}
          </h2>
          {children({ active, setHover })}
        </div>
      </div>
    </section>
  );
}

export function WorkSection({ roles }: { roles: Role[] }) {
  return (
    <StagedSection
      id="work"
      n="02"
      label="Experience"
      count={roles.length}
      items={roles.map((r) => ({ id: r.id, scene: r.scene, caption: r.caption, name: r.company }))}
    >
      {({ active, setHover }) => <Experience roles={roles} active={active} setHover={setHover} />}
    </StagedSection>
  );
}

export function EducationSection({ education }: { education: typeof Education }) {
  return (
    <StagedSection id="education" n="04" label="Education" items={education.map((e) => ({ id: e.id, scene: e.scene, caption: e.caption, name: e.school }))}>
      {({ active, setHover }) => (
        <div className={s.list}>
          {education.map((e, i) => (
            <div
              key={e.id}
              className={`${s.eduRow} ${active === e.id ? s.itemActive : ""} ${s.reveal}`}
              data-reveal
              data-stage-id={e.id}
              onPointerEnter={() => setHover(e.id)}
              onPointerLeave={() => setHover(null)}
              style={{ ["--d" as string]: i }}
            >
              <span className={`${s.mono} ${s.when}`}>{e.when}</span>
              <span className={s.main}>
                <span className={s.title}>{e.school}</span>
                <span className={s.summary}>{e.award}</span>
              </span>
              <span className={s.eduNote}>{e.note}</span>
            </div>
          ))}
        </div>
      )}
    </StagedSection>
  );
}
