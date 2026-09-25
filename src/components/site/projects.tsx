"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Project } from "@/data/cv";
import { ArrowUpRight } from "./icons";
import { Miniature } from "./miniature";
import { RailHead } from "./staged";
import { toneVar } from "./tone";
import s from "./site.module.css";

// Projects at a glance: a grid of live scenes of different sizes, each with its name, one line
// and one number. Each opens the project's own page (/projects/<id>), where its scene acts out
// how it works step by step.

const SIZES = ["lg", "md", "md", "wide"] as const;
const pad2 = (n: number) => String(n).padStart(2, "0");

export function ProjectsSection({ projects }: { projects: Project[] }) {
  const router = useRouter();

  // Links from before projects had pages (#projects/<id>) still land on the right one.
  useEffect(() => {
    const m = window.location.hash.match(/^#projects\/([\w-]+)$/);
    if (m && projects.some((p) => p.id === m[1])) router.replace(`/projects/${m[1]}`);
  }, [projects, router]);

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
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={`${s.pTile} ${s.reveal}`}
            data-size={SIZES[i] ?? "md"}
            data-reveal
            data-tile
            aria-label={`${p.name}, ${p.kind}. Open the project`}
            style={{ ["--d" as string]: i % 2, ["--hue" as string]: toneVar(p.hue) }}
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
                <i className={s.hueDot} aria-hidden="true" />
                {pad2(i + 1)} &middot; {p.kind}
              </span>
              <span className={s.pName}>{p.name}</span>
              <span className={s.pLine}>{p.line}</span>
            </span>
            <span className={s.pStat}>
              <span className={s.pStatValue}>{p.stat.value}</span>
              <span className={s.mono}>{p.stat.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
