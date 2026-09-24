import { education, person, profile as PROFILE, projects, roles, toolkit } from "@/data/cv";
import { Clock } from "@/components/site/clock";
import { ArrowDown, ArrowUpRight } from "@/components/site/icons";
import { Miniature } from "@/components/site/miniature";
import { Nav } from "@/components/site/nav";
import { Portrait } from "@/components/site/portrait";
import { Reveals } from "@/components/site/reveals";
import { EducationSection, RailHead, WorkSection } from "@/components/site/staged";
import { Statement } from "@/components/site/statement";
import { Wordmark } from "@/components/site/wordmark";
import s from "@/components/site/site.module.css";


function Rail(props: { n: string; label: string; count?: number }) {
  return (
    <div className={s.rail}>
      <RailHead {...props} />
    </div>
  );
}

export default function Home() {
  const year = new Date().getFullYear();
  return (
    <div className={s.site}>
      <style>{`html,body{background:#0b0b0c;color-scheme:dark}`}</style>
      <a href="#profile" className={s.skip}>
        Skip to content
      </a>
      <Nav />

      <main>
        <section id="top" className={s.hero} aria-label="Introduction">
          <div className={s.heroStage}>
            <Portrait />
          </div>
          <div className={s.heroShade} />
          <div className={s.heroInner}>
            <p className={`${s.mono} ${s.status} ${s.enter}`} style={{ ["--i" as string]: 0 }}>
              <span className={s.dot} aria-hidden="true" />
              {person.role} at {person.company}
            </p>
            <h1 className={s.name} aria-label={person.name}>
              <span className={s.nameLine} aria-hidden="true">
                <span className={s.rise} style={{ ["--i" as string]: 0 }}>
                  {person.first}
                </span>
              </span>
              <span className={s.nameLine} aria-hidden="true">
                <span className={s.rise} style={{ ["--i" as string]: 1 }}>
                  {person.last}
                </span>
              </span>
            </h1>
            <p className={`${s.heroLine} ${s.enter}`} style={{ ["--i" as string]: 1 }}>
              <strong>{person.line}</strong> Final year of AI and Computer Science at Birmingham. Based in London.
            </p>
            <div className={`${s.cta} ${s.enter}`} style={{ ["--i" as string]: 2 }}>
              <a className={`${s.btn} ${s.btnSolid}`} href={person.cv} download>
                Download CV <ArrowDown />
              </a>
              <a className={`${s.btn} ${s.btnGhost}`} href={`mailto:${person.email}`}>
                Get in touch <ArrowUpRight />
              </a>
            </div>
          </div>
          <div className={`${s.heroFoot} ${s.mono} ${s.enter}`} style={{ ["--i" as string]: 3 }}>
            <span>
              <span>
                LON <Clock />
              </span>
              <span>51.5072° N, 0.1276° W</span>
            </span>
            <span className={s.scrollCue} aria-hidden="true">
              Scroll <span className={s.scrollBar} />
            </span>
          </div>
        </section>

        <section id="profile" className={s.section} aria-labelledby="profile-h">
          <div className={s.rule} />
          <div className={s.grid}>
            <Rail n="01" label="Profile" />
            <div className={s.body}>
              <h2 id="profile-h" className="sr-only">
                Profile
              </h2>
              <Statement text={PROFILE} />
              <dl className={s.facts}>
                {[
                  ["Based", "London, UK", "Raised in Dubai"],
                  ["Now", "Founding Technical Lead", "ImpactOS, since July 2025"],
                  ["Studying", "B.Sc. AI and Computer Science", "Birmingham, graduating 2027"],
                  ["Focus", "Retrieval and data pipelines", "and the agents that build them"],
                ].map(([k, v, sub], i) => (
                  <div key={k} className={`${s.fact} ${s.reveal}`} data-reveal style={{ ["--d" as string]: i }}>
                    <dt className={s.mono}>{k}</dt>
                    <dd>
                      {v}
                      <span>{sub}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <WorkSection roles={roles} />

        <section id="projects" className={s.section} aria-labelledby="projects-h">
          <div className={s.rule} />
          <div className={s.grid}>
            <Rail n="03" label="Projects" count={projects.length} />
            <div className={s.body}>
              <h2 id="projects-h" className="sr-only">
                Projects
              </h2>
              <div className={s.tiles}>
                {projects.map((p, i) => (
                  <article key={p.id} className={`${s.tile} ${s.reveal}`} data-reveal data-tile style={{ ["--d" as string]: i % 2 }}>
                    <div className={s.screen}>
                      <Miniature kind={p.id} label={`${p.name}: ${p.kind}, animated in characters`} />
                    </div>
                    <div className={s.tileText}>
                      <h3 className={s.tileName}>{p.name}</h3>
                      <span className={`${s.mono} ${s.tileKind}`}>{p.kind}</span>
                      <p className={s.tileLine}>{p.line}</p>
                      <p className={`${s.mono} ${s.tileStack}`}>{p.stack}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <EducationSection education={education} />

        <section id="toolkit" className={s.section} aria-labelledby="toolkit-h">
          <div className={s.rule} />
          <div className={s.grid}>
            <Rail n="05" label="Toolkit" />
            <div className={s.body}>
              <h2 id="toolkit-h" className="sr-only">
                Toolkit
              </h2>
              <div className={s.tools}>
                {toolkit.map((t, i) => (
                  <div key={t.group} className={s.reveal} data-reveal style={{ ["--d" as string]: i }}>
                    <h3 className={s.mono}>{t.group}</h3>
                    <ul>
                      {t.items.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className={`${s.section} ${s.contact}`} aria-labelledby="contact-h">
          <div className={s.rule} />
          <div className={s.grid}>
            <Rail n="06" label="Contact" />
            <div className={s.body}>
              <h2 id="contact-h" className={s.lead}>
                Building something hard with data or agents? <strong>I&apos;d like to hear about it.</strong>
              </h2>
              <a className={s.mail} href={`mailto:${person.email}`}>
                {person.email}
                <ArrowUpRight />
              </a>
              <div className={s.links}>
                <a href={person.linkedin} target="_blank" rel="noreferrer">
                  <span className={s.mono}>LinkedIn</span>
                  <span>in/ben-cheesebrough ↗</span>
                </a>
                <a href={person.cv} download>
                  <span className={s.mono}>CV</span>
                  <span>Download PDF ↓</span>
                </a>
                <div>
                  <span className={s.mono}>Local time</span>
                  <span>
                    London, <Clock />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={s.wordmark}>
            <Wordmark text={person.name} />
          </div>
        </section>
      </main>

      <footer className={`${s.foot} ${s.mono}`} style={{ marginInline: "var(--pad)" }}>
        <span>© {year} {person.name}</span>
        <span>Portrait redrawn in characters from a living photograph, every frame</span>
        <a href="#top">Back to top ↑</a>
      </footer>
      <Reveals />
    </div>
  );
}
