// All copy and data for the TORN SIGNAL poster site.

export const INKTRACE_URL = "https://inktrace.app";

export const posterChrome = {
  topLeft: "JACKIE//1127",
  topRight: "00",
  signalDetected: "SIGNAL DETECTED",
  dragHint: "DRAG THE SIGNAL",
  clickHint: "CLICK TO TEAR", // reduced-motion / no-pointer path
};

export type PanelId = "work" | "about" | "contact";

export const navLinks: { id: PanelId; label: string }[] = [
  { id: "work", label: "WORK" },
  { id: "about", label: "ABOUT" },
  { id: "contact", label: "CONTACT" },
];

// Hidden messages revealed while scrubbing the signal.
// zone = normalized scrub offset range [-1, 1].
export const hiddenMessages = [
  { zone: [-1, -0.6] as const, text: "SIGNAL SOURCE: LAB 7" },
  { zone: [0.35, 0.65] as const, text: "EMPLOYEE #777?" },
  { zone: [0.78, 1] as const, text: "W3 4R3 0N3" },
];

export const allVisitedReward = "…3c5614…";

export const workEntries = [
  {
    id: "FILE_01",
    title: "INKTRACE",
    status: "SHIPPING",
    blurb:
      "Novel-writing database web app. Chapters, characters, wiki, timelines, mind maps — one canonical home for an author's whole universe.",
    tags: ["NEXT.JS", "PostgreSQL", "MCP", "PRODUCT"],
    href: INKTRACE_URL,
  },
  {
    id: "FILE_02",
    title: "THIS_SIGNAL",
    status: "LIVE",
    blurb:
      "The page you tore open. Next.js 16, GSAP Draggable, WebAudio synthesis, no UI libraries.",
    tags: ["GSAP", "WEBAUDIO", "CANVAS"],
  },
  {
    id: "FILE_03",
    title: "TERMLINK // JR INDUSTRIES",
    status: "DANGER",
    blurb:
      "Recovered 1981 terminal. Boots. Asks for a password. The signal knows it.",
    tags: ["THREE.JS", "CRT", "PLAYABLE"],
    href: "/terminal",
    warn: true,
  },
];

export const aboutLines = [
  "Yuchao Wang (Jackie) — UNSW graduate, Sydney, Australia.",
  "Frontend / full-stack engineer. Usually awake too late.",
  "I build web things with opinions: part engineering,",
  "part stubbornness, part 'what if it did THIS when you clicked it?'",
  "STATUS: OPEN_TO_WORK",
];

export const skillGroups = [
  { name: "LANGUAGES", items: ["JavaScript", "TypeScript", "Python", "Java", "C", "SQL"] },
  { name: "FRONTEND", items: ["React", "Next.js", "Three.js", "Tailwind", "GSAP"] },
  { name: "BACKEND", items: ["Node.js", "AWS", "PostgreSQL", "MongoDB", "Docker"] },
  { name: "CREATIVE", items: ["Unreal Engine 5", "Figma", "MCP", "AI workflows"] },
];

export const contactLinks = [
  { label: "EMAIL", value: "whoisjackie1127@gmail.com", href: "mailto:whoisjackie1127@gmail.com" },
  { label: "GITHUB", value: "github.com/JackieNonSense", href: "https://github.com/JackieNonSense" },
  { label: "LINKEDIN", value: "linkedin.com/in/yuchao-wang", href: "https://www.linkedin.com/in/yuchao-wang-4a014b198/" },
];
