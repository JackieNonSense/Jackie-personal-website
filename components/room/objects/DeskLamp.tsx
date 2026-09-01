import ArtSlot from "../ArtSlot";

type DeskLampProps = { lit: boolean };

/** Banker's lamp with pull chain; shade glows when lit. */
export default function DeskLamp({ lit }: DeskLampProps) {
  return (
    <ArtSlot id="lamp" width={260} height={420}>
      <svg viewBox="0 0 260 420" className="w-full h-full" aria-hidden>
        {/* base */}
        <ellipse cx="130" cy="392" rx="78" ry="18" fill="#8a7340" stroke="var(--ink)" strokeWidth="4" />
        {/* stem */}
        <path d="M 130 390 C 126 330, 134 280, 128 230 C 124 196, 138 170, 158 152" fill="none" stroke="#8a7340" strokeWidth="12" strokeLinecap="round" />
        <path d="M 130 390 C 126 330, 134 280, 128 230 C 124 196, 138 170, 158 152" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        {/* shade */}
        <path
          d="M 66 150 C 100 120, 200 118, 232 156 L 210 196 C 170 176, 110 178, 84 194 Z"
          fill={lit ? "#3f7a4f" : "#2e5a3a"}
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* bulb glow */}
        <ellipse cx="148" cy="196" rx="52" ry="14" fill={lit ? "var(--amber)" : "#665c44"} opacity={lit ? 0.95 : 0.5}>
          {lit && <animate attributeName="opacity" values="0.95;0.85;0.95" dur="3s" repeatCount="indefinite" />}
        </ellipse>
        {/* pull chain */}
        <path d="M 196 196 C 198 220, 194 240, 198 258" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="3 4" />
        <circle cx="198" cy="266" r="6" fill="var(--amber)" stroke="var(--ink)" strokeWidth="2.5" />
      </svg>
    </ArtSlot>
  );
}
