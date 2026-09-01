import ArtSlot from "../ArtSlot";

/** Ink bottle beside a manuscript stack, with a small splatter. */
export default function InkBottle() {
  return (
    <ArtSlot id="ink-bottle" width={200} height={220}>
      <svg viewBox="0 0 200 220" className="w-full h-full" aria-hidden>
        {/* manuscript stack */}
        <g transform="rotate(2 130 170)">
          <rect x="70" y="150" width="120" height="16" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" transform="rotate(-2 130 158)" />
          <rect x="66" y="164" width="126" height="16" fill="#efe6cd" stroke="var(--ink)" strokeWidth="2.5" transform="rotate(1 129 172)" />
          <rect x="70" y="178" width="122" height="16" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" />
          <path d="M 84 158 h 70 M 82 172 h 84 M 86 186 h 76" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" />
        </g>
        {/* bottle */}
        <path
          d="M 44 96 C 40 120, 36 160, 40 190 C 42 202, 100 204, 102 192 C 106 158, 102 122, 96 96 C 88 88, 52 88, 44 96 Z"
          fill="#273043"
          stroke="var(--ink)"
          strokeWidth="3.5"
        />
        {/* ink shine */}
        <path d="M 54 120 C 52 140, 50 160, 52 178" stroke="rgba(255,255,255,0.25)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* neck + cap */}
        <rect x="52" y="72" width="38" height="24" fill="#273043" stroke="var(--ink)" strokeWidth="3" />
        <rect x="46" y="52" width="50" height="22" rx="4" fill="#1b202e" stroke="var(--ink)" strokeWidth="3.5" />
        {/* label */}
        <rect x="50" y="128" width="42" height="30" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" transform="rotate(-2 71 143)" />
        <text x="56" y="149" fontSize="16" fill="var(--ink)" fontFamily="var(--font-hand-display)" transform="rotate(-2 71 143)">ink</text>
        {/* splatter */}
        <circle cx="122" cy="205" r="5" fill="#273043" />
        <circle cx="136" cy="212" r="2.5" fill="#273043" />
        <circle cx="112" cy="214" r="2" fill="#273043" />
      </svg>
    </ArtSlot>
  );
}
