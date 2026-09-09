export const chapters = [
  { id: "signal", label: "SIGNAL", index: "00" },
  { id: "work", label: "WORK", index: "01" },
  { id: "about", label: "ABOUT", index: "02" },
  { id: "experiments", label: "EXPERIMENTS", index: "03" },
  { id: "contact", label: "CONTACT", index: "04" },
] as const;

export const portfolioContent = {
  inktrace: { name: "Inktrace", href: "https://inktrace.app", description: "An independent creative website. A different corner of my internet." },
  email: "whoisjackie1127@gmail.com",
  github: "https://github.com/JackieNonSense",
  linkedin: "https://www.linkedin.com/in/yuchao-wang-4a014b198/",
  practice: [
    ["INTERFACES", "React / Next.js", "TypeScript / HTML / CSS"],
    ["INTERACTION", "Motion / Canvas", "Scroll / Pointer / Keyboard"],
    ["EXPERIMENTS", "Three.js", "An interactive monitor"],
  ],
};
