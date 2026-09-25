"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { person, type Project } from "@/data/cv";
import type { SceneKind } from "./ascii/scenes";
import { ArrowUpRight } from "./icons";
import { Miniature } from "./miniature";
import { ThemeToggle } from "./theme-toggle";
import { PAGE_BG, toneVar } from "./tone";
import s from "./site.module.css";

// A project's own page. The breadcrumb at the top left leads back to the site and to Projects;
// the arrows beside it move between projects. The project's story scene is pinned on the left
// and acts out "How it works" step by step; the steps play through on their own until the reader
// picks one. At the end, the next project.

const FLOW: Record<Project["id"], SceneKind> = { symphony: "symphonyFlow", ingest: "ingestFlow", cortex: "cortexFlow", scout: "scoutFlow" };
const STEP_MS = 4500;
const pad2 = (n: number) => String(n).padStart(2, "0");

export function ProjectPage({ project: p, index, count, prev, next }: { project: Project; index: number; count: number; prev: Project; next: Project }) {
  const router = useRouter();
  const [rate, setRate] = useState(1);
  // The step belongs to the project it was chosen in, so moving to a project with fewer steps
  // starts it at its first step in the same render, never at a step it does not have.
  const [at, setAt] = useState({ id: p.id, step: 0 });
  const step = at.id === p.id ? Math.min(at.step, p.steps.length - 1) : 0;
  const [auto, setAuto] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  useEffect(() => setAuto(true), [p.id]);

  // The steps play through on their own until the reader picks one.
  useEffect(() => {
    if (!auto || reduced) return;
    const id = window.setTimeout(() => setAt({ id: p.id, step: (step + 1) % p.steps.length }), STEP_MS);
    return () => window.clearTimeout(id);
  }, [auto, reduced, step, p.id, p.steps.length]);

  // The arrow keys move between projects; Esc goes back to Projects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /input|textarea|select/i.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") router.push(`/projects/${next.id}`);
      else if (e.key === "ArrowLeft") router.push(`/projects/${prev.id}`);
      else if (e.key === "Escape") router.push("/#projects");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, next.id, prev.id]);

  const pick = (n: number) => {
    setAt({ id: p.id, step: n });
    setAuto(false);
  };
  const hue = toneVar(p.hue);

  return (
    <div className={s.site} data-site style={{ ["--hue" as string]: hue }}>
      <style>{PAGE_BG}</style>
      <header className={`${s.nav} ${s.navSolid}`}>
        <nav aria-label="Breadcrumb" className={s.crumbs}>
          <ol>
            <li>
              <Link href="/">{person.name}</Link>
            </li>
            <li>
              <Link href="/#projects">Projects</Link>
            </li>
            <li aria-current="page">
              <i className={s.hueDot} aria-hidden="true" />
              {p.name}
            </li>
          </ol>
        </nav>
        <div className={s.ppNav}>
          <span className={`${s.mono} ${s.ppCount}`}>
            {pad2(index + 1)} / {pad2(count)}
          </span>
          <Link href={`/projects/${prev.id}`} className={s.ppArrow} aria-label={`Previous project: ${prev.name}`}>
            &larr;
          </Link>
          <Link href={`/projects/${next.id}`} className={s.ppArrow} aria-label={`Next project: ${next.name}`}>
            &rarr;
          </Link>
        </div>
      </header>

      <main className={s.pp} key={p.id}>
        <div className={s.ppStage}>
          <div className={s.ppScreen}>
            <Miniature kind={FLOW[p.id]} label={`${p.name}, how it works: ${p.steps[step].name}`} rows={48} maxCell={13} rate={rate} stage={step} field />
          </div>
          <div className={`${s.mono} ${s.ppControls}`}>
            <span className={s.ppNow}>
              <i className={s.hueDot} aria-hidden="true" />
              {pad2(step + 1)} {p.steps[step].name}
            </span>
            <span className={s.caseControls} role="group" aria-label="Animation">
              <button type="button" onClick={() => setRate(rate ? 0 : 1)} aria-pressed={rate === 0}>
                {rate ? "Pause" : "Play"}
              </button>
              {[1, 2, 4].map((r) => (
                <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r}>
                  {r}&times;
                </button>
              ))}
            </span>
          </div>
        </div>

        <div className={s.ppBody}>
          <p className={`${s.mono} ${s.ppKind}`}>
            <i className={s.hueDot} aria-hidden="true" />
            {p.kind}
          </p>
          <h1 className={s.ppName}>{p.name}</h1>
          <p className={s.ppOverview}>{p.overview}</p>

          <dl className={s.ppNumbers}>
            {p.numbers.map((n) => (
              <div key={n.label}>
                <dt>{n.value}</dt>
                <dd>{n.label}</dd>
              </div>
            ))}
          </dl>

          <h2 className={`${s.mono} ${s.ppLabel}`}>How it works</h2>
          <ol className={s.ppSteps}>
            {p.steps.map((st, n) => (
              <li key={st.name} data-on={n === step || undefined}>
                <button type="button" onClick={() => pick(n)} aria-current={n === step ? "step" : undefined} aria-controls={`step-${n}`}>
                  <span className={s.mono}>{pad2(n + 1)}</span>
                  <span>{st.name}</span>
                  {n === step && auto && !reduced ? <i key={`${p.id}-${n}`} className={s.flowBar} style={{ animationDuration: `${STEP_MS}ms` }} /> : null}
                </button>
                <div className={s.ppStepText} id={`step-${n}`}>
                  <div>
                    <p>{st.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <h2 className={`${s.mono} ${s.ppLabel}`}>Built with</h2>
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

          <Link href={`/projects/${next.id}`} className={s.ppNext} style={{ ["--next" as string]: toneVar(next.hue) }}>
            <span className={s.mono}>Next project</span>
            <span className={s.ppNextName}>
              {next.name} <span aria-hidden="true">&rarr;</span>
            </span>
            <span className={s.ppNextLine}>{next.line}</span>
          </Link>
        </div>
      </main>

      <footer className={`${s.foot} ${s.mono}`} style={{ marginInline: "var(--pad)" }}>
        <span>
          &copy; {new Date().getFullYear()} {person.name}
        </span>
        <span className={s.keysHint}>Arrow keys move between projects. Esc goes back.</span>
        <span className={s.footEnd}>
          <ThemeToggle />
          <Link href="/#projects">All projects &uarr;</Link>
        </span>
      </footer>
    </div>
  );
}
