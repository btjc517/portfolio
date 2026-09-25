import type { SceneKind } from "@/components/site/ascii/scenes";

// Everything the site says about Ben, in one place. Facts come from
// src/data/resume-data.tsx and public/BenCheesebrough-CV.pdf; the wording is written for the web.

export const person = {
  name: "Ben Cheesebrough",
  first: "Ben",
  last: "Cheesebrough",
  role: "Technical Co-Founder",
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
  "I lead the technology at ImpactOS, an AI platform that turns messy ESG and social value data into audit-ready reports. I designed it and shipped the first version alone. Before that I co-founded a software company in Riyadh. I'm in my final year of AI and Computer Science at Birmingham, and I run a fleet of coding agents across three machines on an orchestrator I rebuilt from OpenAI's Symphony.";

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
  /** Shown as one line in an "Earlier internships" block on the PDF CV, to keep it to a page:
   * the company, the place and this. */
  early?: string;
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
    role: "Technical Co-Founder",
    when: "2025 to now",
    place: "London",
    url: "https://www.impactos.tech/",
    now: true,
    summary: "An AI platform that turns messy ESG and social value data into audit-ready reports.",
    points: [
      "Designed the system architecture and shipped the first version alone: frontend, backend and data.",
      "Runs a live CDP climate disclosure for a global investment manager. CDP has no API, so rebuilt its questionnaire from CDP's own data: answers are drafted with sources, approved by the client's reviewers and uploaded to its portal, with 96% of 3,345 cells matching.",
      "Built the ingestion and retrieval layer for spreadsheets and PDFs: fuzzy matching, embeddings, NL2SQL and knowledge graphs over DuckDB and Parquet.",
      "Built the client app in Next.js and Convex over a FastAPI backend on AWS, with Postgres, Qdrant and Neo4j behind it.",
      "Designed a bronze, silver and gold ingestion pipeline with adaptive schema mapping, and prototyped synthetic data so analytics never touch personal data.",
      "Led the SOC 2 security certification work, and onboarded a second engineer.",
      "Pitched the product to multinational companies, government bodies and universities, and rewrote the roadmap on what came back.",
    ],
    stack: ["Python", "FastAPI", "Next.js", "Convex", "AWS", "Postgres", "Qdrant", "Neo4j"],
  },
  {
    id: "iact",
    scene: "glove",
    caption: "Round two, every punch counted",
    company: "IACT",
    role: "CTO",
    when: "2026 to now",
    place: "London",
    now: true,
    summary: "Smart boxing gloves that sense every punch, and the apps that coach and track a session.",
    points: [
      "Built the native iOS app in SwiftUI, reading the gloves over Bluetooth, and shipped it to testers on TestFlight.",
      "Built the trainer and admin dashboard in Next.js on Convex, with live session data.",
      "Built the 3D investor demo in Three.js, and designed the investor and teaser decks.",
      "Planned the platform: a shared glove protocol and data layer, and the route from the Unity prototype to native apps.",
    ],
    stack: ["Swift", "SwiftUI", "Bluetooth LE", "Next.js", "Convex", "Three.js"],
  },
  {
    id: "caspar",
    scene: "voicenote",
    caption: "Voice note in, working software out",
    company: "Influencer.com, MVE and Creator Ventures",
    role: "Summer Intern",
    when: "2026",
    place: "London",
    url: "https://www.influencer.com/",
    summary: "Seven weeks with Caspar Lee, shipping internal software across his companies.",
    points: [
      "Rebuilt Scout, MVE's creator-scouting tool, as a full-stack web app: AI search, a scoring engine that rates creators the way a quant rates assets, and agency and campaign views. Demoed it to the MVE team.",
      "Moved Influencer.com's internal operations app and its client pitch-deck app off Lovable onto Supabase and Clerk, and took the operations app live on an influencer.com subdomain.",
      "Migrated Proper Living's booking and resident platform to a new database with proper sign-in and access rules. It now runs properliving.co.za.",
      "Ran coding-agent loops that audited each app, logged over 100 issues in Linear and merged the fixes.",
      "Sourced candidates for the Creator Ventures Fellowship, and wrote sourced research for Caspar, including a creator-economy one-pager for a London college.",
    ],
    stack: ["React", "TypeScript", "Supabase", "Clerk", "Vercel", "Claude Code"],
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
    summary: "Sports booking software for residential compounds in Saudi Arabia, built in a gap year.",
    points: [
      "Set up a fully foreign-owned company in Saudi Arabia, endorsed by accelerators backed by PIF, the Saudi sovereign wealth fund.",
      "Built the admin portal and the consumer app for iOS and Android.",
      "Drafted the shareholder agreements, recruited engineers from UK universities and ran the sales team.",
      "Held talks to fold the product into a larger regional prop-tech platform.",
    ],
    stack: ["Product", "Mobile", "Sales", "Company formation"],
  },
  {
    id: "amf1",
    early: "Web3 strategy with the Managing Director.",
    scene: "silverstone",
    caption: "A lap of Silverstone",
    company: "Aston Martin F1",
    role: "Summer Intern",
    when: "2022",
    place: "London",
    url: "https://www.astonmartinf1.com/en-GB",
    summary: "Worked with the Managing Director on the team's Web3 strategy.",
    points: [
      "Researched digital trends across Formula 1 and wrote the presentations that went to senior executives.",
    ],
    stack: ["Strategy", "Research"],
  },
  {
    id: "fiera",
    early: "Internal tools with the fintech team.",
    scene: "fund",
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
    early: "Content and campaign strategy for regional clients.",
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
  /** One sentence for the tile, seen at a glance. */
  line: string;
  /** A shorter line for the PDF CV's projects band. */
  short: string;
  stack: string;
  /** The number on the tile. */
  stat: { value: string; label: string };
  /** The detail view: a few sentences, three numbers, and how it works, step by step. */
  overview: string;
  numbers: { value: string; label: string }[];
  steps: { name: string; text: string }[];
  link?: { label: string; href: string };
};

export const projects: Project[] = [
  {
    id: "symphony",
    name: "Symphony",
    kind: "Agent orchestration",
    line: "Runs Claude and Codex coding agents across three machines, and reviews and merges what they ship.",
    short: "A fork of OpenAI's Symphony, rebuilt beyond recognition. Runs coding agents across three machines.",
    stack: "Elixir · Electron · TypeScript · Tailscale",
    stat: { value: "3", label: "machines, one fleet" },
    overview:
      "Symphony began in March as Helix, a team of planner, builder, reviewer and verifier agents. It then grew out of a fork of OpenAI's open-source Symphony and was rebuilt beyond recognition: 495 of its 512 commits are mine. It takes work from Linear, hands it to coding agents on three machines, has a second model review every change, and merges what passes.",
    numbers: [
      { value: "3", label: "machines: a MacBook, an always-on M1 and a Windows desktop" },
      { value: "495/512", label: "commits mine, in a fork of OpenAI's Symphony" },
      { value: "100%", label: "test coverage required by the engine" },
    ],
    steps: [
      { name: "Issue", text: "Work starts as a Linear issue. Symphony picks it up and claims it, so no two agents take the same job." },
      { name: "Dispatch", text: "agent-cloud gives the task its own git worktree on one of three machines, linked over Tailscale." },
      { name: "Build", text: "Claude or Codex makes the change in that worktree, with the repo's own rules and checks." },
      { name: "Review", text: "A second model reviews the change. Findings go back to the builder until the review comes back clean." },
      { name: "Proof", text: "The pull request carries proof of what was checked: screenshots, a video and a written account." },
      { name: "Merge", text: "Only the orchestrator can merge or touch the live database. When a call needs a human, it asks in plain English." },
    ],
  },
  {
    id: "ingest",
    name: "ImpactOS engine",
    kind: "Data ingestion",
    line: "Reads whatever a client uploads, maps it to the right reporting framework and answers questions about it in plain English.",
    short: "Maps whatever a client uploads to the right reporting framework, and answers questions on it.",
    stack: "Python · FastAPI · DuckDB · Parquet · Qdrant · Neo4j",
    stat: { value: "96%", label: "of 3,345 CDP cells matched" },
    overview:
      "The engine behind ImpactOS. Clients upload spreadsheets and PDFs in whatever shape they come. The engine keeps them as they are, maps them onto the reporting framework the client needs, and answers questions with a citation back to the source row. For one client it drafts a full CDP climate disclosure, which their reviewers approve before it goes in.",
    numbers: [
      { value: "96%", label: "of 3,345 cells matched on upload to CDP's portal" },
      { value: "3", label: "tiers from raw to report: bronze, silver, gold" },
      { value: "4", label: "ways to find an answer: fuzzy, vector, SQL and graph" },
    ],
    steps: [
      { name: "Upload", text: "Spreadsheets, PDFs and CSVs arrive as they are. There is no template for the client to fill in." },
      { name: "Bronze", text: "Raw files are kept untouched, so every figure in a report can be traced back to where it came from." },
      { name: "Silver", text: "Columns are matched to known fields with fuzzy matching and embeddings, and the mapping adapts to each client's layout." },
      { name: "Gold", text: "Clean tables line up item by item with the framework the client reports against, such as CDP or the UK Social Value Model." },
      { name: "Answer", text: "Questions in plain English become SQL or graph queries over DuckDB and Parquet, and every answer cites its source rows." },
      { name: "Review", text: "Reviewers approve each drafted answer. For CDP, an agent then enters it in the portal and checks every cell." },
    ],
    link: { label: "impactos.tech", href: "https://www.impactos.tech/" },
  },
  {
    id: "cortex",
    name: "Cortex",
    kind: "Personal AI assistant",
    line: "Pulls Gmail, WhatsApp, Canvas, GitHub and Linear into one knowledge graph, with a voice mode. Runs on a server at home.",
    short: "Gmail, WhatsApp, Canvas, GitHub and Linear in one knowledge graph, with voice. Runs at home.",
    stack: "Electron · React · Node · Postgres",
    stat: { value: "5", label: "sources, one graph" },
    overview:
      "My own assistant. It pulls my email, messages, university coursework, code and tasks into one knowledge graph, so every answer links back to where it came from. I can ask it things out loud, and it also runs my home controls and a password vault. The sync service and its database run on a Windows server at home.",
    numbers: [
      { value: "5", label: "sources: Gmail, WhatsApp, Canvas, GitHub, Linear" },
      { value: "1,800+", label: "commits since April" },
      { value: "24/7", label: "on a server at home" },
    ],
    steps: [
      { name: "Sync", text: "Connectors pull in Gmail, WhatsApp, Canvas, GitHub and Linear." },
      { name: "Link", text: "Each item becomes part of the graph: people, threads, tasks and files, each tied to its source." },
      { name: "Ask", text: "Search, or ask out loud. Answers quote the items they came from." },
      { name: "Act", text: "It also drives home controls and keeps passwords in a self-hosted vault." },
    ],
  },
  {
    id: "scout",
    name: "Scout",
    kind: "Creator intelligence",
    line: "Rates creators the way a quant rates assets, for the talent agency MVE. Built summer 2026.",
    short: "Rates creators the way a quant rates assets, for the talent agency MVE.",
    stack: "React · Supabase · Clerk · Postgres",
    stat: { value: "4", label: "weeks, idea to demo" },
    overview:
      "Scout is MVE's tool for finding and tracking creators. I rebuilt it as a full-stack web app in four weeks with coding agents: AI search across the roster, a page for every creator, and a scoring engine that treats each creator like an asset, with a beta, an alpha, a Sharpe ratio and an overall Scout Score, computed in Postgres.",
    numbers: [
      { value: "~200", label: "commits in four weeks" },
      { value: "4", label: "scores per creator: beta, alpha, Sharpe, Scout Score" },
      { value: "8", label: "views, from AI search to a Creator 100 index" },
    ],
    steps: [
      { name: "Search", text: "Ask in plain English for the creators a brief needs." },
      { name: "Score", text: "Each creator gets a beta, an alpha and a Sharpe ratio, the way a quant scores a stock, rolled into one Scout Score that ranks the roster." },
      { name: "Plan", text: "Agency and campaign views plan budgets across a roster, with brand spend alongside." },
      { name: "Feedback", text: "A feedback button on any element sends notes straight into an agent job queue, so changes land fast." },
    ],
  },
];

export const education: {
  id: string;
  school: string;
  award: string;
  when: string;
  place: string;
  note: string;
  /** Further lines under the note: prizes, projects. */
  more?: string[];
  scene: SceneKind;
  caption: string;
}[] = [
  {
    id: "birmingham",
    scene: "network",
    caption: "A forward pass",
    school: "University of Birmingham",
    award: "B.Sc. Artificial Intelligence and Computer Science",
    when: "2024 to 2027",
    place: "Birmingham",
    note: "Final year",
    more: [
      "Semi-finalist, AI Innovator of the Year, Undergraduate of the Year Awards 2026",
      "Team project: After Hours, an app for getting home safely at night. Set up the codebase and designed its safety-aware routing.",
    ],
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

/** Outside work, for the profile and the PDF. */
export const outside = "Padel, rugby, golf, rowing, skiing, tennis and scuba diving";

export const toolkit = [
  { group: "AI and retrieval", items: ["PyTorch", "Transformers", "Hugging Face", "FAISS", "Qdrant", "LangChain"] },
  { group: "Data", items: ["Python", "DuckDB", "PostgreSQL", "Pandas", "Polars", "PL/pgSQL"] },
  { group: "Product", items: ["TypeScript", "React", "Next.js", "Tailwind", "Node", "Swift"] },
  { group: "Infrastructure", items: ["AWS", "Docker", "Kubernetes", "FastAPI", "Cloudflare", "Vercel"] },
  { group: "Agents", items: ["Claude Code", "Codex", "MCP", "Elixir", "Electron", "tmux"] },
];
