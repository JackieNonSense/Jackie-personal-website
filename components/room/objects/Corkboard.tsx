import ArtSlot from "../ArtSlot";

/** Cork pinboard: frame, pinned notes, red conspiracy string. */
export default function Corkboard() {
  return (
    <ArtSlot id="corkboard" width={460} height={340}>
      <svg viewBox="0 0 460 340" className="w-full h-full" aria-hidden>
        {/* frame */}
        <rect x="8" y="8" width="444" height="324" rx="10" fill="var(--wood)" stroke="var(--ink)" strokeWidth="4" />
        {/* cork */}
        <rect x="28" y="28" width="404" height="284" rx="6" fill="#c2a075" stroke="var(--ink)" strokeWidth="3" />
        <g fill="var(--wood-dark)" opacity="0.35">
          <circle cx="90" cy="70" r="3" /><circle cx="350" cy="120" r="2.5" /><circle cx="200" cy="250" r="3" />
          <circle cx="140" cy="180" r="2" /><circle cx="390" cy="240" r="2.5" /><circle cx="260" cy="60" r="2" />
        </g>
        {/* pinned notes */}
        <g transform="rotate(-4 120 110)">
          <rect x="60" y="60" width="120" height="96" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
          <path d="M 76 90 h 88 M 76 108 h 66 M 76 126 h 78" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g transform="rotate(3 320 100)">
          <rect x="250" y="52" width="140" height="90" fill="#efe6cd" stroke="var(--ink)" strokeWidth="3" />
          <path d="M 268 82 c 20 -14, 40 12, 60 -4 c 14 -10, 30 8, 44 0" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 268 108 h 96" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g transform="rotate(-2 200 230)">
          <rect x="140" y="190" width="110" height="80" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
          <circle cx="196" cy="228" r="22" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="4 5" />
          <text x="186" y="235" fontSize="20" fill="var(--ink)" fontFamily="var(--font-hand-display)">?</text>
        </g>
        {/* torn corner note */}
        <path d="M 320 210 l 78 6 l -8 58 l -62 -10 Z" fill="#efe6cd" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 336 232 h 44 M 334 248 h 30" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" />
        {/* pins + red string */}
        <circle cx="120" cy="66" r="7" fill="#c33" stroke="var(--ink)" strokeWidth="2.5" />
        <circle cx="318" cy="60" r="7" fill="#3a6" stroke="var(--ink)" strokeWidth="2.5" />
        <circle cx="196" cy="196" r="7" fill="#c33" stroke="var(--ink)" strokeWidth="2.5" />
        <circle cx="392" cy="216" r="7" fill="#36c" stroke="var(--ink)" strokeWidth="2.5" />
        <path d="M 120 66 C 200 120, 160 160, 196 196 C 260 230, 330 200, 392 216" fill="none" stroke="#c0392b" strokeWidth="2.5" opacity="0.85" />
      </svg>
    </ArtSlot>
  );
}
