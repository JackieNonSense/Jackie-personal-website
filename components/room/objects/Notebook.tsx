import ArtSlot from "../ArtSlot";

/** Closed kraft notebook with elastic band and a pen resting on top. */
export default function Notebook() {
  return (
    <ArtSlot id="notebook" width={220} height={160}>
      <svg viewBox="0 0 220 160" className="w-full h-full" aria-hidden>
        <g transform="rotate(-4 110 80)">
          {/* pages edge */}
          <rect x="26" y="34" width="170" height="102" rx="8" fill="#efe6cd" stroke="var(--ink)" strokeWidth="3" />
          {/* cover */}
          <rect x="20" y="26" width="170" height="102" rx="8" fill="#b28c5e" stroke="var(--ink)" strokeWidth="3.5" />
          {/* elastic band */}
          <path d="M 158 26 L 158 128" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
          {/* label */}
          <rect x="46" y="58" width="76" height="34" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.5" transform="rotate(-2 84 75)" />
          <path d="M 56 72 h 56 M 56 82 h 40" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-2 84 75)" />
        </g>
        {/* pen */}
        <g transform="rotate(14 110 30)">
          <rect x="40" y="18" width="130" height="10" rx="5" fill="#2f3a4f" stroke="var(--ink)" strokeWidth="2.5" />
          <path d="M 170 20 l 18 3 l -18 5 Z" fill="var(--amber)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      </svg>
    </ArtSlot>
  );
}
