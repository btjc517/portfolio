import type { Metadata } from "next";
import { education, person, profile, projects, roles, toolkit } from "@/data/cv";
import s from "./cv.module.css";

// The CV as a single A4 page, from the same data as the site. scripts/site/make-cv-pdf.cjs
// prints it to public/BenCheesebrough-CV.pdf, which the Download CV buttons serve.

export const metadata: Metadata = {
  title: "CV",
  robots: { index: false, follow: false },
};

export default function CvPage() {
  return (
    <div className={s.desk}>
      <article className={s.sheet}>
        <header className={s.head}>
          <div>
            <h1 className={s.name}>{person.name}</h1>
            <p className={s.line}>
              {person.role} at {person.company}. Final year, B.Sc. Artificial Intelligence and Computer Science, University of Birmingham.
            </p>
          </div>
          <dl className={s.contact}>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${person.email}`}>{person.email}</a>
            </dd>
            <dt>Phone</dt>
            <dd>{person.phone}</dd>
            <dt>Web</dt>
            <dd>
              <a href={person.site}>{person.siteLabel}</a>
            </dd>
            <dt>LinkedIn</dt>
            <dd>
              <a href={person.linkedin}>{person.linkedinLabel}</a>
            </dd>
            <dt>Based</dt>
            <dd>{person.location}</dd>
          </dl>
        </header>

        <div className={s.cols}>
          <main className={s.main}>
            <section>
              <h2 className={s.label}>Profile</h2>
              <p className={s.profile}>{profile}</p>
            </section>

            <section>
              <h2 className={s.label}>Experience</h2>
              {roles.map((r) => (
                <div key={r.id} className={s.role}>
                  <div className={s.roleHead}>
                    <h3>
                      {r.company} <span>{r.role}</span>
                    </h3>
                    <span className={s.meta}>
                      {r.now ? <i className={s.now} aria-hidden="true" /> : null}
                      {r.when}, {r.place}
                    </span>
                  </div>
                  <p className={s.summary}>{r.summary}</p>
                  <ul className={s.points}>
                    {r.points.map((pt, k) => (
                      <li key={k}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

          </main>

          <aside className={s.side}>
            <section>
              <h2 className={s.label}>Education</h2>
              {education.map((e) => (
                <div key={e.id} className={s.edu}>
                  <h3>{e.school}</h3>
                  <p>{e.award}</p>
                  <p className={s.meta}>{e.when}</p>
                  <p className={s.note}>{e.note}</p>
                </div>
              ))}
            </section>

            <section>
              <h2 className={s.label}>Toolkit</h2>
              {toolkit.map((t) => (
                <div key={t.group} className={s.tool}>
                  <h3 className={s.meta}>{t.group}</h3>
                  <p>{t.items.join(", ")}</p>
                </div>
              ))}
            </section>

          </aside>
        </div>

        <section className={s.band}>
          <h2 className={s.label}>Projects</h2>
          <div className={s.projects}>
            {projects.map((p) => (
              <div key={p.id} className={s.project}>
                <h3>
                  {p.name} <span>{p.kind}</span>
                </h3>
                <p>{p.line}</p>
                <p className={s.stack}>{p.stack}</p>
              </div>
            ))}
          </div>
        </section>

      </article>
    </div>
  );
}
