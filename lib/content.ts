// All copy and data for the study room + JR-OS.

export const INKTRACE_URL = "https://inktrace.app";

// ── Room hotspot labels (EN + CN handwritten chips) ──
export const roomLabels = {
  computer: { en: "the old computer", cn: "老电脑" },
  notebook: { en: "my notebook", cn: "笔记本" },
  ink: { en: "ink & manuscripts", cn: "墨水与手稿" },
  corkboard: { en: "pinned things", cn: "钉着的东西" },
  drawer: { en: "the drawer", cn: "抽屉" },
  lamp: { en: "lamp", cn: "台灯" },
  window: { en: "3 a.m. rain", cn: "凌晨三点的雨" },
} as const;

// ── Notebook (About) pages ──
export const notebookPages = [
  {
    title: "hi, i'm Jackie",
    lines: [
      "Yuchao Wang · UNSW graduate",
      "Sydney, Australia — usually awake too late.",
      "I build web things that feel alive:",
      "part engineering, part stubbornness,",
      "part 'what if it did THIS when you clicked it?'",
    ],
    photo: true,
  },
  {
    title: "things i use",
    skills: true,
  },
  {
    title: "right now",
    lines: [
      "→ building InkTrace, a home for novelists",
      "→ collecting old-web interactions",
      "→ open to work. seriously, email me.",
      "status: caffeinated ☕",
    ],
  },
] as const;

export const skillGroups = [
  { name: "languages", items: ["JavaScript", "TypeScript", "Python", "Java", "C", "SQL"] },
  { name: "frontend", items: ["React", "Next.js", "Three.js", "Tailwind", "GSAP"] },
  { name: "backend", items: ["Node.js", "AWS", "PostgreSQL", "MongoDB", "Docker"] },
  { name: "creative", items: ["Unreal Engine 5", "Figma", "MCP", "AI workflows"] },
] as const;

// ── Corkboard cards ──
export type PinCard = {
  id: string;
  title: string;
  note: string;
  href?: string;
  tone: "paper" | "warn" | "torn";
};

export const pinCards: PinCard[] = [
  {
    id: "inktrace",
    title: "InkTrace",
    note: "a canonical home for a novelist's whole universe — chapters, characters, wiki, timelines. my main thing.",
    href: INKTRACE_URL,
    tone: "paper",
  },
  {
    id: "this-site",
    title: "this room",
    note: "you are here. hand-built, no templates harmed.",
    tone: "paper",
  },
  {
    id: "termlink",
    title: "JR terminal",
    note: "found a 1981 machine in the drawer of history. it still boots. password's around here somewhere…",
    href: "/terminal",
    tone: "warn",
  },
  {
    id: "soon",
    title: "????",
    note: "(torn off — whatever it was, it's not ready)",
    tone: "torn",
  },
];

// ── JR-OS ──
export const osApps = {
  about: { title: "ABOUT_ME.TXT", icon: "txt" },
  cases: { title: "CASE_FILES", icon: "folder" },
  contact: { title: "CONTACT.EXE", icon: "mail" },
  terminal: { title: "TERMINAL.EXE", icon: "term" },
  recycle: { title: "RECYCLE BIN", icon: "bin" },
} as const;

export const aboutTxt = [
  "ABOUT_ME.TXT — last modified 03:12 AM",
  "",
  "name:     Yuchao Wang (Jackie)",
  "origin:   UNSW · Sydney, Australia",
  "role:     frontend / full-stack engineer",
  "state:    open to work",
  "",
  "I like interfaces with opinions.",
  "This OS is one of them.",
];

export const recycleBinItems = [
  { name: "phosphor_green_dossier_page.tsx", note: "v2 of this site. rated 2/10 by the boss. deserved." },
  { name: "3d_water_background.glsl", note: "pretty, said nothing." },
  { name: "hamburger_menu.svg", note: "we don't do that here." },
  { name: "hero_carousel_final_FINAL(3).psd", note: "no." },
];

export const contactLinks = [
  { label: "EMAIL", value: "whoisjackie1127@gmail.com", href: "mailto:whoisjackie1127@gmail.com" },
  { label: "GITHUB", value: "github.com/JackieNonSense", href: "https://github.com/JackieNonSense" },
  { label: "LINKEDIN", value: "linkedin.com/in/yuchao-wang", href: "https://www.linkedin.com/in/yuchao-wang-4a014b198/" },
];

export const caseFiles = [
  {
    id: "FILE_01",
    title: "INKTRACE",
    status: "SHIPPING",
    blurb:
      "Novel-writing database web app. Chapters, characters, wiki, timelines, mind maps — one canonical home for an author's universe.",
    href: INKTRACE_URL,
  },
  {
    id: "FILE_02",
    title: "THIS_SITE.LOG",
    status: "RUNNING",
    blurb: "The room you walked in through. Next.js, GSAP, no UI libraries, questionable hours.",
  },
  {
    id: "FILE_03",
    title: "████████",
    status: "ENCRYPTED",
    blurb: "[decryption key not found]",
  },
];
