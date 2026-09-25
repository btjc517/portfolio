"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/data/cv";
import type { SceneKind } from "./ascii/scenes";
import { ArrowUpRight } from "./icons";
import { Miniature } from "./miniature";
import { RailHead } from "./staged";
import s from "./site.module.css";

// Projects in two layers. At a glance: a grid of live scenes of different sizes, each with its
// name, one line and one number. Pressing one opens a sheet over the page with the detail: the
// scene large with pause and speed, a short account, three numbers, and how it works as steps
// that play through on their own until the reader picks one. Each project has its own address
// (#projects/<id>), and the browser's Back closes the sheet.

const SIZES = ["lg", "md", "md", "wide"] as const;
// The sheet's scene for each project acts out its steps; see ascii/stories.
const FLOW: Record<Project["id"], SceneKind> = { symphony: "symphonyFlow", ingest: "ingestFlow", cortex: "cortexFlow", scout: "scoutFlow" };
const STEP_MS = 4500;
const pad2 = (n: number) => String(n).padStart(2, "0");
const hashOf = (id: string) => `#projects/${id}`;

export function ProjectsSection({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const openRef = useRef<string | null>(null);
  const pushed = useRef(false); // whether opening added a history entry that closing should undo
  const opener = useRef<HTMLElement | null>(null);

  const show = useCallback((id: string, from?: HTMLElement | null) => {
    if (from) opener.current = from;
    if (openRef.current) window.history.replaceState({ project: id }, "", hashOf(id));
    else {
      window.history.pushState({ project: id }, "", hashOf(id));
      pushed.current = true;
    }
    openRef.current = id;
    setOpen(id);
  }, []);

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back(); // the popstate below clears the sheet
    } else {
      window.history.replaceState(null, "", "#projects");
      openRef.current = null;
      setOpen(null);
    }
  }, []);

  // Open from the address on load, and follow Back and Forward.
  useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/^#projects\/([\w-]+)$/);
      const id = m && projects.some((p) => p.id === m[1]) ? m[1] : null;
      openRef.current = id;
      setOpen(id);
      if (!id) pushed.current = false;
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [projects]);

  // Hand focus back to the tile that opened the sheet.
  useEffect(() => {
    if (!open) opener.current?.focus({ preventScroll: true });
  }, [open]);

  const k = projects.findIndex((p) => p.id === open);

  return (
    <section id="projects" className={s.section} aria-labelledby="projects-h">
      <div className={s.rule} />
      <div className={s.grid}>
        <div className={s.rail}>
          <RailHead n="03" label="Projects" count={projects.length} />
        </div>
        <div className={s.body}>
          <h2 id="projects-h" className={s.projectsLead}>
            Things I&apos;ve built, at a glance. <span>Open one to see how it works.</span>
          </h2>
        </div>
      </div>
      <div className={s.bento}>
        {projects.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`${s.pTile} ${s.reveal}`}
            data-size={SIZES[i] ?? "md"}
            data-reveal
            data-tile
            aria-haspopup="dialog"
            aria-label={`${p.name}, ${p.kind}. Open the detail`}
            onClick={(e) => show(p.id, e.currentTarget)}
            style={{ ["--d" as string]: i % 2 }}
          >
            <span className={s.pScreen} aria-hidden="true">
              <Miniature kind={p.id} label={`${p.name}: ${p.kind}, animated in characters`} rows={SIZES[i] === "lg" ? 40 : 24} maxCell={13} />
            </span>
            <span className={s.pScrim} aria-hidden="true" />
            <span className={`${s.mono} ${s.pOpen}`} aria-hidden="true">
              Open <ArrowUpRight />
            </span>
            <span className={s.pText}>
              <span className={`${s.mono} ${s.pKind}`}>
                {pad2(i + 1)} &middot; {p.kind}
              </span>
              <span className={s.pName}>{p.name}</span>
              <span className={s.pLine}>{p.line}</span>
            </span>
            <span className={s.pStat}>
              <span className={s.pStatValue}>{p.stat.value}</span>
              <span className={s.mono}>{p.stat.label}</span>
            </span>
          </button>
        ))}
      </div>
      {k >= 0 ? (
        <CaseSheet
          project={projects[k]}
          index={k}
          count={projects.length}
          onClose={close}
          onStep={(d) => show(projects[(k + d + projects.length) % projects.length].id)}
        />
      ) : null}
    </section>
  );
}

function CaseSheet({
  project: p,
  index,
  count,
  onClose,
  onStep,
}: {
  project: Project;
  index: number;
  count: number;
  onClose: () => void;
  onStep: (d: number) => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const [rate, setRate] = useState(1);
  // The step belongs to the project it was chosen in, so moving to a project with fewer steps
  // starts it at its first step in the same render, never at a step it does not have.
  const [at, setAt] = useState({ id: p.id, step: 0 });
  const step = at.id === p.id ? Math.min(at.step, p.steps.length - 1) : 0;
  const setStep = (n: number) => setAt({ id: p.id, step: n });
  const [auto, setAuto] = useState(true);
  const [reduced, setReduced] = useState(false);

  // A new project starts at its first step, playing.
  useEffect(() => {
    setAuto(true);
    sheet.current?.querySelector<HTMLElement>("[data-scroll]")?.scrollTo({ top: 0 });
  }, [p.id]);

  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  // The steps play through on their own until the reader picks one.
  useEffect(() => {
    if (!auto || reduced) return;
    const id = window.setTimeout(() => setAt({ id: p.id, step: (step + 1) % p.steps.length }), STEP_MS);
    return () => window.clearTimeout(id);
  }, [auto, reduced, step, p.id, p.steps.length]);

  // Hold the page still behind the sheet, and take focus into it.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("[data-close]")?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = before;
    };
  }, []);

  // Esc closes, the arrow keys move between projects, and Tab stays inside the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const tag = (document.activeElement as HTMLElement | null)?.getAttribute("role");
        if (tag === "tab") return;
        onStep(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key === "Tab" && sheet.current) {
        const all = Array.from(sheet.current.querySelectorAll<HTMLElement>("button, a[href]")).filter((el) => el.offsetParent !== null);
        if (!all.length) return;
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  const pick = (n: number) => {
    setStep(n);
    setAuto(false);
  };

  return (
    <div className={s.caseLayer}>
      <div className={s.caseBackdrop} onClick={onClose} aria-hidden="true" />
      <div ref={sheet} className={s.case} role="dialog" aria-modal="true" aria-labelledby="case-title">
        <div className={`${s.mono} ${s.caseBar}`}>
          <span className={s.caseIdx}>
            {pad2(index + 1)} / {pad2(count)}
          </span>
          <span className={s.caseCrumb}>Projects</span>
          <span className={s.caseNav}>
            <button type="button" onClick={() => onStep(-1)} aria-label="Previous project">
              &larr;
            </button>
            <button type="button" onClick={() => onStep(1)} aria-label="Next project">
              &rarr;
            </button>
            <button type="button" data-close onClick={onClose} aria-label="Close">
              Esc &times;
            </button>
          </span>
        </div>
        <div className={s.caseBody} data-scroll>
          <div className={s.caseStage}>
            <div className={s.caseScreen}>
              <Miniature kind={FLOW[p.id]} label={`${p.name}, how it works: ${p.steps[step].name}`} rows={44} maxCell={13} rate={rate} stage={step} field />
            </div>
            <div className={`${s.mono} ${s.caseControls}`} role="group" aria-label="Animation">
              <button type="button" onClick={() => setRate(rate ? 0 : 1)} aria-pressed={rate === 0}>
                {rate ? "Pause" : "Play"}
              </button>
              {[1, 2, 4].map((r) => (
                <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r}>
                  {r}&times;
                </button>
              ))}
            </div>
          </div>
          <div className={s.caseInfo}>
            <p className={`${s.mono} ${s.caseKind}`}>{p.kind}</p>
            <h3 id="case-title" className={s.caseName}>
              {p.name}
            </h3>
            <p className={s.caseOverview}>{p.overview}</p>

            <dl className={s.caseNumbers}>
              {p.numbers.map((n) => (
                <div key={n.label}>
                  <dt className={s.caseNumber}>{n.value}</dt>
                  <dd>{n.label}</dd>
                </div>
              ))}
            </dl>

            <h4 className={`${s.mono} ${s.caseLabel}`}>How it works</h4>
            <div className={s.flow} role="tablist" aria-label={`How ${p.name} works`}>
              {p.steps.map((st, n) => (
                <button
                  key={st.name}
                  type="button"
                  role="tab"
                  aria-selected={n === step}
                  className={s.flowStep}
                  onClick={() => pick(n)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const next = (n + (e.key === "ArrowRight" ? 1 : -1) + p.steps.length) % p.steps.length;
                      pick(next);
                      (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
                    }
                  }}
                >
                  <span className={s.flowNum}>{pad2(n + 1)}</span>
                  <span className={s.flowName}>{st.name}</span>
                  {n === step && auto && !reduced ? <i key={`${p.id}-${n}`} className={s.flowBar} style={{ animationDuration: `${STEP_MS}ms` }} /> : null}
                </button>
              ))}
            </div>
            <p key={`${p.id}-${step}`} className={s.flowText} role="tabpanel">
              {p.steps[step].text}
            </p>

            <h4 className={`${s.mono} ${s.caseLabel}`}>Built with</h4>
            <div className={s.meta}>
              {p.stack.split(" · ").map((t) => (
                <span key={t} className={`${s.mono} ${s.chip}`}>
                  {t}
                </span>
              ))}
              {p.link ? (
                <a className={s.visit} href={p.link.href} target="_blank" rel="noreferrer">
                  {p.link.label} <ArrowUpRight />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
