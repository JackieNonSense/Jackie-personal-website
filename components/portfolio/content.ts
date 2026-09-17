export const chapters = [
  { id: "signal", label: "SIGNAL", index: "00" },
  { id: "about", label: "ABOUT", index: "01" },
  { id: "work", label: "PROJECTS", index: "02" },
  { id: "experiments", label: "EXPERIMENTS", index: "03" },
  { id: "contact", label: "CONTACT", index: "04" },
] as const;

export const portfolioContent = {
  inktrace: { name: "Inktrace", href: "https://inktrace.app", description: "An independent creative website. A different corner of my internet." },
  email: "whoisjackie1127@gmail.com",
  github: "https://github.com/JackieNonSense",
  linkedin: "https://www.linkedin.com/in/yuchao-wang-4a014b198/",
  // What was made, not which APIs were touched: a list of browser features says
  // nothing a hundred other sites could not also claim.
  practice: [
    ["INTERFACES", "Things you can operate,", "not just look at"],
    ["EXPERIMENTS", "A CD deck, a CRT terminal,", "a small puzzle behind it"],
    ["INKTRACE", "An independent platform", "for people who write"],
  ],
};
