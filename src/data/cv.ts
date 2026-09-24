import type { SceneKind } from "@/components/site/ascii/scenes";

// Everything the site says about Ben, in one place. Facts come from
// src/data/resume-data.tsx and public/BenCheesebrough-CV.pdf; the wording is written for the web.

export const person = {
  name: "Ben Cheesebrough",
  first: "Ben",
  last: "Cheesebrough",
  role: "Founding Technical Lead",
  company: "ImpactOS",
  location: "London, UK",
  raised: "Dubai, UAE",
  email: "benjy.cheesebrough@gmail.com",
  linkedin: "https://www.linkedin.com/in/ben-cheesebrough-12b18b220/",
  cv: "/BenCheesebrough-CV.pdf",
  site: "https://bencheesebrough.com",
  line: "I build AI systems that hold up against real data.",
  /** Printed on the PDF CV only. */
  phone: "+44 7379 017770",
  siteLabel: "bencheesebrough.com",
  linkedinLabel: "linkedin.com/in/ben-cheesebrough",
};

export const profile =
  "I lead the technology at ImpactOS, an AI platform that turns messy ESG and social value data into audit-ready reports. I designed it and shipped the first version alone. Before that I co-founded a software company in Riyadh. I'm in my final year of AI and Computer Science at Birmingham, and I run a fleet of coding agents across three machines on tooling I wrote myself.";

/** Where each place is, shown in the scene beside Experience and Education. City centres, except
 * Silverstone (the circuit) and Birmingham (the university's campus). */
export const coords: Record<string, string> = {
  London: "51.51° N, 0.13° W",
  Riyadh: "24.71° N, 46.68° E",
  Silverstone: "52.08° N, 1.02° W",
  Dubai: "25.20° N, 55.27° E",
  Birmingham: "52.45° N, 1.93° W",
  Cheltenham: "51.90° N, 2.08° W",
};

export type Role = {
  id: string;
  company: string;
  role: string;
  when: string;
  place: string;
  url?: string;
  now?: boolean;
  /** The ASCII scene shown beside the role, and a few words for its caption. */
  scene: SceneKind;
  caption: string;
  summary: string;
  points: string[];
  stack: string[];
};

export const roles: Role[] = [
  {
    id: "impactos",
    scene: "report",
    caption: "The report, assembling",
    company: "ImpactOS",
    role: "Founding Technical Lead",
    when: "2025 to now",
    place: "London",
    url: "https://www.impactos.tech/",
    now: true,
    summary: "An AI platform that turns messy ESG and social value data into audit-ready reports.",
    points: [
      "Designed the system architecture and shipped the first version alone: frontend, backend and data.",
      "Built the ingestion and retrieval layer for spreadsheets and PDFs: fuzzy matching, embeddings, NL2SQL and knowledge graphs over DuckDB and Parquet.",
      "Designed a bronze, silver and gold ingestion pipeline with adaptive schema mapping, and prototyped synthetic data so analytics never touch personal data.",
      "Built the client portal in Next.js and Supabase, with documented APIs.",
      "Pitched the product to multinational companies, government bodies and universities, and rewrote the roadmap on what came back.",
    ],
    stack: ["Python", "Next.js", "Supabase", "DuckDB", "Vector search", "Knowledge graphs"],
  },
  {
    id: "access",
    scene: "court",
    caption: "Court 2, booked",
    company: "Access Technologies",
    role: "Co-Founder",
    when: "2023 to 2024",
    place: "Riyadh",
    url: "https://www.accesstechnologies.co/",
    summary: "Sports booking and management software for residential compounds in Saudi Arabia, built during a gap year.",
    points: [
      "Set up a fully foreign-owned company in Saudi Arabia, endorsed by accelerators backed by PIF, the Saudi sovereign wealth fund.",
      "Built the admin portal and the consumer app for iOS and Android.",
      "Drafted the shareholder agreements, recruited engineers from UK universities and ran the sales team.",
      "Merged the product into a larger regional prop-tech platform.",
    ],
    stack: ["Product", "Mobile", "Sales", "Company formation"],
  },
  {
    id: "amf1",
    scene: "track",
    caption: "Race pace",
    company: "Aston Martin F1",
    role: "Summer Intern",
    when: "2022",
    place: "Silverstone",
    url: "https://www.astonmartinf1.com/en-GB",
    summary: "Worked with the Managing Director on the team's Web3 strategy.",
    points: [
      "Researched digital trends across Formula 1 and wrote the presentations that went to senior executives.",
    ],
    stack: ["Strategy", "Research"],
  },
  {
    id: "fiera",
    scene: "skyline",
    caption: "The fund, and the city",
    company: "Fiera Real Estate",
    role: "Summer Intern",
    when: "2022",
    place: "London",
    url: "https://www.fierarealestate.co.uk/",
    summary: "The UK real estate arm of Fiera Capital. Sat with the fintech team that builds the fund's internal tools.",
    points: [
      "Supported internal tool development and shadowed both the technical and the financial side of fund management.",
      "Sat in on the quarterly update with senior management.",
    ],
    stack: ["Fintech", "Internal tools"],
  },
  {
    id: "create",
    scene: "feed",
    caption: "The feed",
    company: "Create Group",
    role: "Summer Intern",
    when: "2022",
    place: "Dubai",
    url: "https://creategroup.me/",
    summary: "A digital marketing agency focused on the Middle East. Worked on content and campaign strategy for large regional clients.",
    points: [
      "Joined strategy sessions, client presentations and social analytics with the strategy and creative teams.",
    ],
    stack: ["Marketing", "Analytics"],
  },
];

export type Project = {
  id: "symphony" | "cortex" | "scout" | "ingest";
  name: string;
  kind: string;
  line: string;
  stack: string;
};

export const projects: Project[] = [
  {
    id: "symphony",
    name: "Symphony",
    kind: "Agent orchestration",
    line: "Runs a fleet of Claude and Codex coding agents across three machines, and tracks every change they ship.",
    stack: "Elixir · Electron · TypeScript",
  },
  {
    id: "ingest",
    name: "ImpactOS engine",
    kind: "Data ingestion",
    line: "Reads whatever a client uploads, maps it to the right reporting framework and answers questions about it in plain English.",
    stack: "Python · DuckDB · Parquet · Embeddings",
  },
  {
    id: "cortex",
    name: "Cortex",
    kind: "Knowledge app",
    line: "A local-first knowledge app with its own sync service and Postgres backend.",
    stack: "Electron · React · Node · Postgres",
  },
  {
    id: "scout",
    name: "Scout",
    kind: "Creator intelligence",
    line: "Scores creators for a creator-economy investor the way a quant scores assets. Built summer 2026.",
    stack: "React · Supabase · Postgres",
  },
];

export const education: { id: string; school: string; award: string; when: string; place: string; note: string; scene: SceneKind; caption: string }[] = [
  {
    id: "birmingham",
    scene: "network",
    caption: "A forward pass",
    school: "University of Birmingham",
    award: "B.Sc. Artificial Intelligence and Computer Science",
    when: "2024 to 2027",
    place: "Birmingham",
    note: "Final year",
  },
  {
    id: "cheltenham",
    scene: "waves",
    caption: "Two sources, one pattern",
    school: "Cheltenham College",
    award: "A Levels",
    when: "2021 to 2023",
    place: "Cheltenham",
    note: "Mathematics A, Computer Science A, Physics A",
  },
  {
    id: "jumeirah",
    scene: "dubai",
    caption: "Dubai, at dusk",
    school: "Jumeirah College, Dubai",
    award: "GCSEs",
    when: "2019 to 2021",
    place: "Dubai",
    note: "A* in Mathematics, Computer Science, Physics, Chemistry and Biology",
  },
];

export const toolkit = [
  { group: "AI and retrieval", items: ["PyTorch", "Transformers", "Hugging Face", "FAISS", "Qdrant", "LangChain"] },
  { group: "Data", items: ["Python", "DuckDB", "PostgreSQL", "Pandas", "Polars", "PL/pgSQL"] },
  { group: "Product", items: ["TypeScript", "React", "Next.js", "Tailwind", "Node", "Swift"] },
  { group: "Infrastructure", items: ["AWS", "Docker", "Kubernetes", "FastAPI", "Cloudflare", "Vercel"] },
  { group: "Agents", items: ["Claude Code", "Codex", "MCP", "Elixir", "Electron", "tmux"] },
];
