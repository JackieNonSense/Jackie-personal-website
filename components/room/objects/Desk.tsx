import ArtSlot from "../ArtSlot";

/** The desk: wood slab + front panel with one drawer (right side). */
export default function Desk() {
  return (
    <ArtSlot id="desk" width={1400} height={420}>
      <svg viewBox="0 0 1400 420" className="w-full h-full" aria-hidden>
        {/* table top */}
        <path
          d="M 18 62 C 300 52, 900 56, 1382 60 L 1390 118 C 1000 112, 400 114, 12 120 Z"
          fill="var(--wood)"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* wood grain doodles */}
        <path d="M 140 88 C 220 84, 300 90, 380 86 M 600 92 C 700 88, 820 94, 940 90 M 1080 88 C 1160 84, 1240 92, 1320 88" stroke="var(--wood-dark)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* front panel */}
        <path
          d="M 60 120 L 1348 116 L 1338 400 L 72 404 Z"
          fill="var(--wood-dark)"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* drawer (right) */}
        <rect x="1020" y="160" width="270" height="100" rx="6" fill="var(--wood)" stroke="var(--ink)" strokeWidth="3.5" transform="rotate(-0.4 1155 210)" />
        <circle cx="1155" cy="210" r="12" fill="var(--amber)" stroke="var(--ink)" strokeWidth="3" />
        {/* left panel scribbles: taped note */}
        <rect x="180" y="180" width="120" height="86" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" transform="rotate(-3 240 223)" />
        <path d="M 200 205 h 78 M 200 222 h 64 M 200 239 h 72" stroke="var(--ink-soft)" strokeWidth="2.5" transform="rotate(-3 240 223)" strokeLinecap="round" />
        {/* legs shadow */}
        <path d="M 90 404 L 96 418 M 1320 400 L 1314 416" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </ArtSlot>
  );
}
