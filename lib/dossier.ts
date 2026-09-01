// All site copy and data for the SUBJECT FILE dossier.

// TODO(user): replace with the real InkTrace URL.
export const INKTRACE_URL = "#";

export const SUBJECT_ID = "A-34";
export const FILE_STAMP = "JR://SUBJECT_FILE";

export const dossierRows = [
  { k: "NAME", v: "YUCHAO WANG (JACKIE)" },
  { k: "ORIGIN", v: "UNSW · SYDNEY, AUSTRALIA" },
  { k: "FUNCTION", v: "FRONTEND · FULL-STACK ENGINEER" },
  { k: "INCEPT DATE", v: "CLASSIFIED" },
  { k: "MENTAL STATE", v: "OPTIMISTIC — CAFFEINATED" },
  { k: "STATUS", v: "OPEN_TO_WORK", accent: true },
  { k: "THREAT ASSESSMENT", v: "★★★★☆" },
] as const;

export const subjectNotes = [
  "Subject exhibits insatiable curiosity toward technology and all things interesting.",
  "Observed crafting immersive web experiences at the intersection of design and code.",
  "Driven by the joy of building things that feel alive and meaningful.",
  "Approach with caution: subject may attempt to show you a demo.",
];

export const skillCategories = [
  {
    title: "LANGUAGES",
    cn: "语言",
    skills: [
      { name: "JavaScript", level: 9 },
      { name: "TypeScript", level: 9 },
      { name: "Python", level: 8 },
      { name: "Java", level: 7 },
      { name: "C", level: 6 },
      { name: "SQL", level: 7 },
    ],
  },
  {
    title: "FRONTEND",
    cn: "前端",
    skills: [
      { name: "React", level: 9 },
      { name: "Next.js", level: 9 },
      { name: "Three.js", level: 8 },
      { name: "TailwindCSS", level: 9 },
      { name: "GSAP", level: 8 },
      { name: "HTML/CSS", level: 9 },
    ],
  },
  {
    title: "BACKEND & CLOUD",
    cn: "后端",
    skills: [
      { name: "Node.js", level: 8 },
      { name: "AWS", level: 7 },
      { name: "PostgreSQL", level: 8 },
      { name: "MongoDB", level: 7 },
      { name: "REST APIs", level: 8 },
      { name: "Docker", level: 7 },
    ],
  },
  {
    title: "CREATIVE & AI",
    cn: "创造",
    skills: [
      { name: "Unreal Engine 5", level: 6 },
      { name: "Figma", level: 7 },
      { name: "AI Workflows", level: 9 },
      { name: "MCP", level: 8 },
      { name: "Computer Vision", level: 6 },
      { name: "LLM Training", level: 6 },
    ],
  },
];

export type CaseFile = {
  id: string;
  title: string;
  cnStatus: string;
  status: "DECLASSIFIED" | "OPEN" | "ENCRYPTED";
  blurb?: string;
  tags?: string[];
  href?: string;
  warn?: boolean;
};

export const caseFiles: CaseFile[] = [
  {
    id: "FILE 01",
    title: "INKTRACE",
    cnStatus: "已解密",
    status: "DECLASSIFIED",
    blurb:
      "A novel-writing database web app. Chapters, characters, wiki, timelines and mind maps — one canonical home for an author's whole universe. Built for writers who think in systems.",
    tags: ["NEXT.JS", "DATABASE", "MCP", "PRODUCT"],
    href: INKTRACE_URL,
  },
  {
    id: "FILE 02",
    title: "TERMLINK / JR INDUSTRIES MAINFRAME",
    cnStatus: "危险",
    status: "OPEN",
    blurb:
      "Recovered 1981 terminal, Lab 7. Boot sequence intact. Access at your own risk — containment status unknown.",
    tags: ["THREE.JS", "R3F", "CRT", "PLAYABLE"],
    href: "/terminal",
    warn: true,
  },
  {
    id: "FILE 03",
    title: "REDACTED",
    cnStatus: "未解密",
    status: "ENCRYPTED",
  },
  {
    id: "FILE 04",
    title: "REDACTED",
    cnStatus: "未解密",
    status: "ENCRYPTED",
  },
];

export const contactLinks = [
  {
    label: "EMAIL",
    value: "whoisjackie1127@gmail.com",
    href: "mailto:whoisjackie1127@gmail.com",
  },
  {
    label: "GITHUB",
    value: "github.com/JackieNonSense",
    href: "https://github.com/JackieNonSense",
  },
  {
    label: "LINKEDIN",
    value: "linkedin.com/in/yuchao-wang",
    href: "https://www.linkedin.com/in/yuchao-wang-4a014b198/",
  },
];

export const tickerText =
  "机密 // CLASSIFIED // DO NOT DISTRIBUTE // 档案 A-34 // SUBJECT FILE // 检索中... // SIGNAL LOCKED // 警告 // JR INDUSTRIES // 访客记录 // ACCESS RESTRICTED // ";

export const navTabs = [
  { id: "summary", label: "SUMMARY" },
  { id: "subject", label: "SUBJECT" },
  { id: "assessment", label: "ASSESSMENT" },
  { id: "case-files", label: "CASE FILES" },
  { id: "uplink", label: "UPLINK" },
];
