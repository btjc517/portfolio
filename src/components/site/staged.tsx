"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { coords, type education as Education, type Role } from "@/data/cv";
import type { Tone } from "./ascii/grid";
import type { SceneKind } from "./ascii/scenes";
import { Decode } from "./decode";
import { Experience } from "./experience";
import { Miniature } from "./miniature";
import { toneVar } from "./tone";
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

type Item = { id: string; scene: SceneKind; caption: string; name: string; when: string; place: string; hue: Tone };
type Shape = "tall" | "wide";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The first and last year a "when" covers: "2022", "2023 to 2024", "2025 to now". */
function yearsOf(when: string, thisYear: number): [number, number] {
  const ys = (when.match(/\d{4}/g) ?? [String(thisYear)]).map(Number);
  return [ys[0], /now/i.test(when) ? thisYear : ys[ys.length - 1]];
}

// The row a reader is on: the one under the pointer, otherwise the one scrolling has reached.
// Beside the list, the rows take turns in step with scroll progress while the whole scene is on
// screen (pinned, or for a short list, moving with it), so the last row comes on before the
// scene starts to scroll away. Stacked above the rows on a phone, a row is on once its top
// passes a line just below the scene.
export function useActiveRow(ids: string[]) {
  const listRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(ids[0]);
  const [hover, setHover] = useState<string | null>(null);
  const key = ids.join(" ");

  useEffect(() => {
    const ids = key.split(" ");
    let raf = 0;
    const update = () => {
      raf = 0;
      const list = listRef.current;
      if (!list) return;
      const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-stage-id]"));
      if (!rows.length) return;
      const box = list.getBoundingClientRect();
      const stageEl = list.parentElement?.querySelector<HTMLElement>("[data-tile]");
      const stage = stageEl?.getBoundingClientRect();
      const stacked = stage ? stage.right > box.left : false;
      let on = ids[0];
      const rail = stageEl?.parentElement;
      const pinned = rail ? parseFloat(getComputedStyle(rail).top) : NaN;
      let p = NaN;
      if (!stacked && rail && stage && Number.isFinite(pinned)) {
        const railBox = rail.getBoundingClientRect();
        const range = box.height - railBox.height;
        if (range > 80) p = (pinned - box.top) / range;
        else {
          // A list no taller than its scene never pins, so the scene moves with it: step through
          // the rows from when the scene is fully on screen to when it reaches the nav.
          const low = window.innerHeight - stage.height;
          const high = pinned + (stage.top - railBox.top);
          if (low - high > 80) p = (low - stage.top) / (low - high);
        }
      }
      if (Number.isFinite(p)) {
        p = Math.min(1, Math.max(0, p));
        const first = rows[0].getBoundingClientRect().top;
        const span = rows[rows.length - 1].getBoundingClientRect().top - first;
        for (const el of rows) if (el.getBoundingClientRect().top - first <= p * span + 1) on = el.dataset.stageId ?? on;
      } else {
        // Stacked above the list (phone), the pinned scene covers the top of the screen, so the
        // line sits just below it.
        const line = stacked && stage ? stage.bottom + 72 : window.innerHeight * 0.5;
        for (const el of rows) if (el.getBoundingClientRect().top < line) on = el.dataset.stageId ?? on;
      }
      setScrolled(on);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // Opening or closing a row changes the list's height without a scroll.
    const ro = new ResizeObserver(onScroll);
    if (listRef.current) ro.observe(listRef.current);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  return { listRef, active: hover ?? scrolled, setHover };
}

// The scene for the active row, in the left column, set in a field of characters rather than a
// box. The line above it says which row, what the scene is and where it happened; the years
// below light up the ones that row covers, in the accent colour when it is still going.
export function Stage({ items, active, shape, span }: { items: Item[]; active: string; shape: Shape; span: [number, number] }) {
  const k = Math.max(0, items.findIndex((it) => it.id === active));
  const item = items[k];
  const thisYear = new Date().getFullYear();
  const [from, to] = yearsOf(item.when, thisYear);
  const live = /now/i.test(item.when);
  const years = Array.from({ length: span[1] - span[0] + 1 }, (_, n) => span[0] + n);
  return (
    <figure className={s.stage} data-tile data-shape={shape}>
      <figcaption className={`${s.mono} ${s.stageBar}`}>
        <span className={s.stageIdx}>
          {pad2(k + 1)} / {pad2(items.length)}
        </span>
        <span className={s.stageName}>
          <i className={s.hueDot} style={{ ["--hue" as string]: toneVar(item.hue) }} aria-hidden="true" />
          <Decode text={item.caption} />
        </span>
        <span className={s.stageWhere}>
          <span>{item.place}</span>
          <Decode text={coords[item.place] ?? ""} className={s.stageCoords} />
        </span>
      </figcaption>
      <div className={s.stageScreen}>
        <Miniature kind={item.scene} label={`${item.name}: ${item.caption}, animated in characters`} rows={shape === "tall" ? 56 : 28} maxCell={12} field />
      </div>
      <div className={`${s.mono} ${s.years}`} role="img" aria-label={`${item.name}, ${item.when}`}>
        {years.map((y) => {
          const on = y >= from && y <= to;
          return (
            <span key={y} className={s.year} data-on={on || undefined} data-live={(on && live) || undefined} data-future={y > thisYear || undefined}>
              {y}
            </span>
          );
        })}
      </div>
    </figure>
  );
}

export function StagedSection({
  id,
  n,
  label,
  count,
  items,
  shape,
  span,
  children,
}: {
  id: string;
  n: string;
  label: string;
  count?: number;
  items: Item[];
  shape: Shape;
  span: [number, number];
  children: (state: { active: string; setHover: (id: string | null) => void }) => ReactNode;
}) {
  const { listRef, active, setHover } = useActiveRow(items.map((it) => it.id));
  return (
    <section id={id} className={s.section} aria-labelledby={`${id}-h`}>
      <div className={s.rule} />
      <div className={s.grid}>
        <div className={`${s.rail} ${s.railStaged}`}>
          <RailHead n={n} label={label} count={count} />
          <Stage items={items} active={active} shape={shape} span={span} />
        </div>
        <div className={`${s.body} ${s.bodyStaged}`} ref={(el) => void (listRef.current = el)}>
          <h2 id={`${id}-h`} className="sr-only">
            {label}
          </h2>
          {children({ active, setHover })}
        </div>
      </div>
    </section>
  );
}

// Experience. On a desktop screen tall enough to hold it, the section pins and scrolling steps
// through the roles: each stretch of scroll opens one role and closes the last, and the list
// slides so the open role stays in view. Elsewhere the page flows, and each role opens as the
// reader reaches it and stays open. Pressing a row steps to it when pinned, or opens and closes
// it when flowing.
export function WorkSection({ roles }: { roles: Role[] }) {
  const ids = roles.map((r) => r.id);
  const { listRef, active: flowActive, setHover } = useActiveRow(ids);
  const trackRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);
  const [step, setStep] = useState(0);
  const [shift, setShift] = useState(0);
  const [open, setOpen] = useState<Set<string>>(() => new Set([ids[0]]));
  const active = pinned ? ids[step] : flowActive;

  // Pinned: which role the scroll position has reached.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const track = trackRef.current;
      const frame = track?.firstElementChild as HTMLElement | null;
      if (!track || !frame) return;
      const style = getComputedStyle(frame);
      const isPinned = style.position === "sticky";
      setPinned(isPinned);
      if (!isPinned) return;
      const per = (track.offsetHeight - frame.offsetHeight) / roles.length;
      const into = parseFloat(style.top) - track.getBoundingClientRect().top;
      setStep(Math.min(roles.length - 1, Math.max(0, Math.floor(into / per))));
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
  }, [roles.length]);

  // Flowing: a role opens when the reader reaches it, and stays open.
  useEffect(() => {
    if (pinned) return;
    setOpen((prev) => (prev.has(flowActive) ? prev : new Set(prev).add(flowActive)));
  }, [pinned, flowActive]);

  // Pinned: slide the list so the open role sits near the top with the one before it peeking
  // above, and its whole panel on screen. Measured from the closed heights, so it is right
  // before the panels finish animating.
  useEffect(() => {
    const body = bodyRef.current;
    if (!pinned || !body) return setShift(0);
    const items = Array.from(body.querySelectorAll<HTMLElement>("[data-stage-id]"));
    const closed = items.map((el) => (el.firstElementChild as HTMLElement).offsetHeight + 1);
    const panel = (items[step]?.querySelector("[role=region]")?.firstElementChild as HTMLElement | undefined)?.scrollHeight ?? 0;
    const above = closed.slice(0, step).reduce((p, q) => p + q, 0);
    const peek = step > 0 ? Math.min(closed[step - 1] * 0.55, 72) : 0;
    let y = peek - above;
    const room = body.clientHeight - 32;
    if (above + y + closed[step] + panel > room) y = room - above - closed[step] - panel;
    // Near the end, stop once the list's last row reaches the bottom, so the rows before fill
    // the space above rather than leaving it empty.
    const total = closed.reduce((p, q) => p + q, 0) + panel;
    y = Math.max(y, Math.min(0, room - total));
    setShift(Math.min(0, y));
  }, [pinned, step]);

  const shown = pinned ? new Set([active]) : open;
  const press = (id: string) => {
    const track = trackRef.current;
    if (pinned && track) {
      const frame = track.firstElementChild as HTMLElement;
      const per = (track.offsetHeight - frame.offsetHeight) / roles.length;
      const top = track.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(frame).top);
      window.scrollTo({ top: top + (ids.indexOf(id) + 0.5) * per, behavior: "smooth" });
      return;
    }
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const items = roles.map((r) => ({ id: r.id, scene: r.scene, caption: r.caption, name: r.company, when: r.when, place: r.place, hue: r.hue }));
  return (
    <section id="work" className={s.section} aria-labelledby="work-h">
      <div className={s.rule} />
      <div className={s.workTrack} ref={trackRef} style={{ ["--steps" as string]: roles.length }}>
        <div className={`${s.grid} ${s.workFrame}`}>
          <div className={`${s.rail} ${s.railStaged} ${s.railWork}`}>
            <RailHead n="02" label="Experience" count={roles.length} />
            <Stage items={items} active={active} shape="tall" span={[2022, new Date().getFullYear()]} />
          </div>
          <div
            className={`${s.body} ${s.bodyStaged} ${s.workBody}`}
            data-shifted={shift < 0 || undefined}
            ref={(el) => {
              bodyRef.current = el;
              listRef.current = el;
            }}
          >
            <h2 id="work-h" className="sr-only">
              Experience
            </h2>
            <div className={s.workList} style={{ transform: shift ? `translateY(${shift}px)` : undefined }}>
              <Experience roles={roles} active={active} open={shown} focus={pinned} onPress={press} setHover={pinned ? undefined : setHover} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EducationSection({ education }: { education: typeof Education }) {
  return (
    <StagedSection
      id="education"
      n="04"
      label="Education"
      shape="wide"
      span={[2019, 2027]}
      items={education.map((e) => ({ id: e.id, scene: e.scene, caption: e.caption, name: e.school, when: e.when, place: e.place, hue: e.hue }))}
    >
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
              <span className={`${s.mono} ${s.rowMeta}`}>
                <span className={s.when}>{e.when}</span>
                <span>{e.place}</span>
              </span>
              <span className={s.main}>
                <span className={s.title}>{e.school}</span>
                <span className={s.summary}>{e.award}</span>
              </span>
              <span className={s.eduNote}>
                {e.note}
                {e.more?.map((m) => (
                  <span key={m} className={s.eduMore}>
                    {m}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </StagedSection>
  );
}
