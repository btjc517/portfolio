import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/data/cv";
import { ProjectPage } from "@/components/site/project-page";

// One page per project, built ahead of time.

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const p = projects.find((x) => x.id === params.id);
  if (!p) return {};
  return { title: p.name, description: p.line, alternates: { canonical: `/projects/${p.id}` } };
}

export default function Page({ params }: { params: { id: string } }) {
  const k = projects.findIndex((x) => x.id === params.id);
  if (k < 0) notFound();
  const n = projects.length;
  return <ProjectPage project={projects[k]} index={k} count={n} prev={projects[(k - 1 + n) % n]} next={projects[(k + 1) % n]} />;
}
