import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
import BenCheesebroughCV from "@public/BenCheesebrough-CV.pdf";
import { ImpactOSLogo } from "@public/impactOS-logo";
import { AccessTechLogo } from "@/components/AccessTechLogo";
import { AMF1Logo } from "@/components/AMF1Logo";
import { ChatBubbleLeftRightIcon, GlobeEuropeAfricaIcon, LightBulbIcon, PuzzlePieceIcon, ScaleIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/solid";
import { Gavel } from "lucide-react";
import { HandshakeIcon } from 'lucide-react';
import { CubeTransparentIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
 

export const RESUME_DATA = {
  name: "Ben Cheesebrough",
  initials: "BTC",
  location: "London, UK",
  about: "B.Sc. Artificial Intelligence and Computer Science Student",
  summary:
    "Ambitious AI student with hands-on experience across tech, finance, and data-driven digital marketing growth strategies, fueled by a passion for tech, finance, investment and entrepreneurship. Completed internships with prominent organizations such as Aston Martin F1, Fiera Real Estate and Create Group. Founded a prop tech company in the Kingdom of Saudi Arabia during a gap year, connecting with key industry leaders.",
  avatarUrl: "/BenCVPhoto.JPG",
  personalWebsiteUrl: "https://bencheesebrough.com",
  resumeUrl: BenCheesebroughCV,
  contact: {
    email: "ben.cheesebrough@gmail.com",
    social: [
      // {
      //   name: "GitHub",
      //   url: "https://github.com/btjc517",
      //   icon: GitHubIcon,
      // },
      {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/ben-cheesebrough-12b18b220/",
        icon: LinkedInIcon,
      },
      // {
      //   name: "X",
      //   url: "https://x.com/SriNath693",
      //   icon: XIcon,
      // },
    ],
  },
  achievements: [
    {
      title: "Start up Establishment in KSA",
      icon: <LightBulbIcon className="size-4" />,
      content: "Successfully set up a fully foreign- owned prop-tech company in Saudi Arabia with endorsement from PIF (Saudi's sovereign wealth fund) accelerators."
    },
    {
      title: "Strategic Industry Engagement",
      icon: <ChatBubbleLeftRightIcon className="size-4" />,
      content: "Engaged in high-level discussions with influential industry leaders in Saudi Arabia to advance prop-tech solutions."
    },
    {
      title: "Legal & Administrative Leadership",
      icon: <ScaleIcon className="size-4" />,
      content: "Developed shareholder agreements and other essential legal documents to secure company structure and ensure compliance."
    },
    {
      title: "High-Caliber Recruitment",
      icon: <UserGroupIcon  className="size-4" />,
      content: "Recruited team members from top UK universities, ensuring a strong foundation of skilled professionals."
    },
    {
      title: "Collaborative Innovation in F1",
      icon: <PuzzlePieceIcon className="size-4" />,
      content: "Supported Aston Martin’s Web3 initiatives by creating strategic presentations and research for senior executives, enhancing digital strategy in motorsports."
    },
    {
      title: "Insight into Asset Management Fintech",
      icon: <CubeTransparentIcon className="size-4" />,
      content: "At Fiera Capital, worked with the digital team on internal tools, gaining a comprehensive view of fintech’s role in fund management."
    },
    {
      title: "Digital Strategy for MENA",
      icon: <GlobeEuropeAfricaIcon className="size-4" />,
      content: "Contributed to content strategies at Create Group for leading clients across the Middle East, with hands-on experience in campaign planning and analytics."
    },
  ],
  education: [
    {
      school: "University of Birmingham",
      title: "B.Sc. Artificial Intelligence and Computer Science",
      logo: "/UoB-logo.png",
      location: "Birmingham, UK",
      grades: ["2nd Year"],
      start: "2024",
      end: "2027",
    },
    {
      school: "Cheltenham College",
      logo: "/CC-logo.png",
      title: "A-Levels",
      grades: ["Mathematics: A", "Computer Science: A", "Physics: A"],
      location: "Cheltenham, UK",
      start: "2021",
      end: "2023",
    },
    {
      school: "Jumeirah College",
      logo: "/JC-logo.png",
      title: "GCSEs",
      grades: ["Mathematics: A*", "Computer Science: A*", "Physics: A*", "Biology: A*", "Chemistry: A*", "Economics: A", "English Language: A", "English Literature: A", "History: B", "French: B"],
      // title: "GCSEs in Computer Science, Mathematics, Physics, Economics, History, Chemistry, Biology, English Language, English Literature, French",
      location: "Dubai, UAE",
      start: "2019",
      end: "2021",
    },
  ],
  work: [
    {
      company: "ImpactOS",
      companyDescription: "AI platform turning messy ESG & social-value data into decision-grade, audit-ready metrics and reports",
      animatedLogo: <ImpactOSLogo className="size-8 text-foreground" />,
      location: "London, UK",
      link: "https://www.impactos.tech/",
      liveWebsite: true,
      badges: ["Public Sector", "AI", "Data Management"],
      title: "Founding Technical Lead",
      start: "July 2025",
      end: "present",
      workType: "Remote",
      shortDescription: "AI platform turning messy ESG & social-value data into decision-grade, audit-ready metrics and reports",
      description: "AI platform turning messy ESG & social-value data into decision-grade, audit-ready metrics and reports. Ingests spreadsheets/PDFs, maps to frameworks (UN SDG, UK SVM, CSRD, etc.), and enables natural- language analytics. Pre-revenue, MVP stage. Sister product to https://www.my-dayapp.com",
      lineItems: [
        "Designed the end-to-end system architecture and shipped the MVP independently (frontend + backend + data).",
        "Built the AI/data layer to handle messy tabular inputs: fuzzy matching, vector embeddings, semantic retrieval, late-interaction retrieval, NL2SQL, LLM-orchestrated pipelines, knowledge graphs, and ontologies; columnar storage with DuckDB/Parquet.",
        "Prototyped privacy-first analytics via synthetic data generation (diffusion-model approach) to avoid exposing PII.",
        "Designed a medallion (Bronze/Silver/Gold) ingestion & retrieval architecture with adaptive schema mapping and vectorized indexing; improved query latency and learned from usage/feedback.",
        "Created agentic research workflows using knowledge-graph traversal heuristic A* to evaluate tools/frameworks and auto-synthesize findings.",
        "Built the client-facing portal end-to-end: Next.js (React), shadcn/ui + Tailwind, Framer Motion, Supabase auth/DB, and documented custom APIs.",
        "Pitched the MVP to multinational enterprises, government entities, and top universities; iterated roadmap and product narrative based on feedback."
      ],
      techBadges: [
        "Next.js/React", 
        "JavaScript",
        "Supabase (Postgres/RLS)",
        "DuckDB + Parquet",
        "embeddings/vector search",
        "NL2SQL",
        "knowledge graphs/ontologies",
      ]
    },
    {
      company: "Access Technologies",
      companyDescription: "Sport SaaS startup providing a platform for sports organizations to manage their operations and data",
      animatedLogo: <AccessTechLogo className="size-5" />,
      location: "Riyadh, Saudi Arabia",
      link: "https://www.accesstechnologies.co/",
      liveWebsite: true,
      badges: ["SportsTech", "B2B SaaS", "Partnerships & BD"],
      workType: "Remote",
      title: "Co-Founder",
      start: "2023",
      end: "2024 (Gap Year)",
      description: "‘Functionality without aesthetic sacrifice’. Specializing in full stack bespoke software solutions for residential compounds within the Kingdom of Saudi Arabia. At our core we believe that UI/UX shouldn't have to be sacrificed for functionality, instead we incorporate it into every aspect of our platforms to ensure the highest user experience.",
      lineItems: [
        "Developed a backend web portal for admin management and a consumer-facing mobile app for iOS and Android, focused on sports booking administration.",
        "Established a fully foreign-owned business in Saudi Arabia with endorsements from PIF-backed accelerators (Saudi's sovereign wealth fund).",
        "Pitched to potential clients across Saudi Arabia.",
        "Drafted and implemented shareholder agreements and other key legal documents.",
        "Recruited top technical students from leading UK universities.",
        "Led and managed the sales team.",
        "Collaborated with leading regional prop-tech firms to integrate our technology, transitioning our operations as part of their larger platforms.",
        "Attended big tech events across the Kingdom such as LEAP to gain critical insights into market trends."
      ]
    },
    {
      company: "Fiera Capital - Real Estate",
      companyDescription: "UK real estate arm of Fiera Capital, a Canadian-based asset manager with $160 billion in AUM.",
      // logo: "https://github.com/evilrabbit.png",
      logo: "/FieraRealEstateLogo.png",
      location: "London, UK",
      link: "https://www.fierarealestate.co.uk/",
      badges: ["Fintech Tools", "Fund Ops", "Data Insights"],
      workType: "On Site",
      title: "Summer Internship",
      start: "2022",
      end: "",
      description:
        "Worked alongside the fintech team at a leading asset management firm, exploring the crucial role of fintech in fund management. This experience provided a deep understanding of how digital infrastructure enhances operational efficiency and supports strategic investment initiatives.",
      lineItems: [
        "Attended a quarterly update meeting with senior management, gaining insight into high-level financial and operational decision-making.",
        "Shadowed key team members to understand both the technical and financial aspects of fund management.",
        "Supported in developing and optimizing internal tools, observing the critical role of technology in daily operations.",
        "Enhanced knowledge of fintech’s impact on fund management, focusing on efficiency and strategic growth."        
      ]
    },
    {
      company: "Aston Martin F1",
      companyDescription: "Aston Martin Lagonda's Formula 1 team",
      animatedLogo: <AMF1Logo className="h-10 text-foreground" />,
      location: "London, UK",
      link: "https://www.astonmartinf1.com/en-GB",
      badges: ["Web3 Strategy", "Market Research", "Digital Innovation"],
      workType: "Hybrid (Remote/On Site)",
      title: "Summer Internship",
      start: "2022",
      end: "",
      description:
        "Supported Aston Martin’s Web3 initiatives, working closely with the Managing Director to drive digital innovation within the high-performance world of Formula 1. This experience provided invaluable exposure to cutting-edge technology and strategic planning in a fast-paced, competitive environment.",
      lineItems: [
        "Collaborated with the Managing Director to develop research and presentations on Web3 strategies for senior executives.",
        "Conducted in-depth analysis on Web3 digital trends impacting F1, enhancing understanding of the sport’s technical infrastructure.",
        "Gained first-hand insights into innovation management and digital strategy within a high-stakes motorsport setting."
      ]
    },
    {
      company: "Create Group",
      companyDescription: "A leading, MENA-focused, digital marketing agency",
      logo: "/CreateGroupDark-Logo.jpeg",
      location: "Dubai, UAE",
      link: "https://creategroup.me/",
      badges: ["Digital Strategy", "Client Decks", "Social Analytics"],
      workType: "On Site",
      title: "Summer Internship",
      start: "2022",
      end: "",
      description:
        "Assisted with Create Group's strategy and creative teams to drive digital marketing and content initiatives for leading clients across the Middle East. This internship offered practical experience in campaign planning and analytics, deepening my understanding of the UAE’s fast-evolving digital landscape.",
      lineItems: [
        "Contributed to digital marketing and content strategy meetings for major regional clients, tailoring approaches to the Middle Eastern market.",
        "Supported presentations and reports to guide client decision-making, focusing on impactful storytelling and data-driven insights.",
        "Gained hands-on experience in content strategy, social media analytics, and campaign planning.",
        "Enhanced knowledge of regional marketing dynamics and the UAE’s digital ecosystem."
      ]
    }
  ],
  skills: {
    "AI Research": ["PyTorch", "TensorFlow", "Transformers", "Diffusers", "Hugging Face"],
    "MLOps & Deployment": ["FastAPI", "Docker", "Kubernetes", "SageMaker", "Langchain"],
    "Data Engineering": ["Pandas", "Polars", "DuckDB", "PostgreSQL"],
    "Frontend & APIs": ["React.js", "Next.js", "Tailwind CSS", "Node.js", "Express"],
    "Vector Search": ["FAISS", "Qdrant"],
    "Cloud & Infra": ["AWS", "Azure", "Cloudflare", "E2E Cloud", "GCP"],
    "Languages": ["Python", "TypeScript", "PL/pgSQL", "JavaScript", "Java", "C", "iOS Development (Swift)"],
  },
  projects: [
    {
      title: "IntelliServe: Scalable LLM API Service",
      techStack: ["FastAPI", "Docker", "LangChain", "PostgreSQL", "AWS Lambda"],
      description:
        "Designed and deployed a production-ready API layer for serving multiple LLMs with dynamic routing, prompt templates, and user session tracking. Implemented usage-based rate limiting, caching, and custom logging middleware to support real-time integrations for over 15+ enterprise clients.",
      link: {
        label: "github.com",
        href: "https://github.com/yourusername/intelliserve-llm-api",
      },
    },
    {
      title: "IntelliServe: Scalable LLM API Service",
      techStack: ["FastAPI", "Docker", "LangChain", "PostgreSQL", "AWS Lambda"],
      description:
        "Designed and deployed a production-ready API layer for serving multiple LLMs with dynamic routing, prompt templates, and user session tracking. Implemented usage-based rate limiting, caching, and custom logging middleware to support real-time integrations for over 15+ enterprise clients.",
    },
    {
      title: "IntelliServe: Scalable LLM API Service",
      techStack: ["FastAPI", "Docker", "LangChain", "PostgreSQL", "AWS Lambda"],
      description:
        "Designed and deployed a production-ready API layer for serving multiple LLMs with dynamic routing, prompt templates, and user session tracking. Implemented usage-based rate limiting, caching, and custom logging middleware to support real-time integrations for over 15+ enterprise clients.",
      link: {
        label: "github.com",
        href: "https://github.com/yourusername/intelliserve-llm-api",
      },
    },
    {
      title: "IntelliServe: Scalable LLM API Service",
      techStack: ["FastAPI", "Docker", "LangChain", "PostgreSQL", "AWS Lambda"],
      description:
        "Designed and deployed a production-ready API layer for serving multiple LLMs with dynamic routing, prompt templates, and user session tracking. Implemented usage-based rate limiting, caching, and custom logging middleware to support real-time integrations for over 15+ enterprise clients.",
      link: {
        label: "github.com",
        href: "https://github.com/yourusername/intelliserve-llm-api",
      },
    },
    {
      title: "IntelliServe: Scalable LLM API Service",
      techStack: ["FastAPI", "Docker", "LangChain", "PostgreSQL", "AWS Lambda"],
      description:
        "Designed and deployed a production-ready API layer for serving multiple LLMs with dynamic routing, prompt templates, and user session tracking. Implemented usage-based rate limiting, caching, and custom logging middleware to support real-time integrations for over 15+ enterprise clients.",
    },
    {
      title: "IntelliServe: Scalable LLM API Service",
      techStack: ["FastAPI", "Docker", "LangChain", "PostgreSQL", "AWS Lambda"],
      description:
        "Designed and deployed a production-ready API layer for serving multiple LLMs with dynamic routing, prompt templates, and user session tracking. Implemented usage-based rate limiting, caching, and custom logging middleware to support real-time integrations for over 15+ enterprise clients.",
    }                        
  ],
  extraCurricular: [
    {
      title: "Google Developers Student Club Lead",
      description:
        "Led the Google Developers Student Club, fostering a collaborative environment for technology enthusiasts at PES University.",
    },
    {
      title: "Samarpana, Shunya Technical Head",
      description:
        "Directed technical teams for Samarpana (a fundraising marathon for families of martyrs) and Shunya (Math club) events.",
    },
    {
      title: "Hackathons Participant",
      description:
        "Won National Level Hackathons in Generative-AI - GenAI-Rush and Kodikon3. Participated in over 25 Hackathons with a 90% finalist selection rate.",
    },
  ]
} as const;
