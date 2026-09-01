import ArtSlot from "../ArtSlot";

/** Beige 80s CRT with a dark green screen and a blinking prompt glint. */
export default function DeskComputer() {
  return (
    <ArtSlot id="computer-crt" width={380} height={360}>
      <svg viewBox="0 0 380 360" className="w-full h-full" aria-hidden>
        {/* monitor shell */}
        <path
          d="M 42 22 C 140 14, 260 16, 340 24 C 348 100, 346 190, 340 252 C 240 260, 130 258, 44 250 C 36 180, 36 96, 42 22 Z"
          fill="#d9cfae"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* screen bezel */}
        <rect x="72" y="52" width="238" height="164" rx="10" fill="#20241f" stroke="var(--ink)" strokeWidth="3.5" />
        {/* screen */}
        <rect x="86" y="66" width="210" height="136" rx="6" fill="var(--crt-black)" />
        {/* phosphor prompt glint */}
        <text x="100" y="100" fontFamily="monospace" fontSize="26" fill="var(--phos-500)">
          &gt;_
          <animate attributeName="opacity" values="1;1;0;0" dur="1.4s" repeatCount="indefinite" />
        </text>
        <path d="M 92 190 h 196" stroke="rgba(51,255,51,0.12)" strokeWidth="3" />
        {/* vents + LED */}
        <path d="M 96 232 h 20 M 124 232 h 20 M 152 232 h 20" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="292" cy="233" r="6" fill="var(--phos-500)" stroke="var(--ink)" strokeWidth="2.5" />
        {/* stickers */}
        <g transform="rotate(-8 320 60)">
          <rect x="304" y="44" width="34" height="34" rx="4" fill="var(--amber)" stroke="var(--ink)" strokeWidth="2.5" />
          <path d="M 312 62 l 7 7 l 12 -14" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {/* base */}
        <path d="M 120 256 L 262 256 L 276 308 L 106 308 Z" fill="#cabf9c" stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 88 308 h 208 l 8 30 H 80 Z" fill="#d9cfae" stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" />
        <rect x="220" y="316" width="58" height="12" rx="3" fill="#20241f" stroke="var(--ink)" strokeWidth="2.5" />
      </svg>
    </ArtSlot>
  );
}
