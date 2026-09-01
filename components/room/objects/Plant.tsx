import ArtSlot from "../ArtSlot";

/** Foreground monstera, bottom-left edge. */
export default function Plant() {
  return (
    <ArtSlot id="plant" width={300} height={500}>
      <svg viewBox="0 0 300 500" className="w-full h-full" aria-hidden>
        {/* pot */}
        <path d="M 80 400 h 150 l -18 88 h -114 Z" fill="#a8552e" stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 70 386 h 170 l -6 22 H 76 Z" fill="#c26437" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
        {/* stems + leaves */}
        <g stroke="var(--ink)" strokeWidth="3" fill="#3a6b4a">
          <path d="M 150 390 C 140 320, 120 280, 90 240" fill="none" strokeWidth="5" />
          <path d="M 90 240 C 40 220, 30 150, 80 130 C 130 115, 150 180, 118 218 C 108 230, 98 238, 90 240 Z" />
          <path d="M 160 388 C 168 300, 190 250, 226 210" fill="none" strokeWidth="5" />
          <path d="M 226 210 C 280 190, 290 110, 234 96 C 180 84, 162 160, 198 196 C 208 204, 218 210, 226 210 Z" />
          <path d="M 152 390 C 152 330, 158 270, 152 210" fill="none" strokeWidth="5" />
          <path d="M 152 210 C 108 180, 116 100, 168 96 C 220 94, 216 176, 172 202 C 165 206, 158 209, 152 210 Z" />
        </g>
        {/* leaf slits */}
        <path d="M 70 180 l 30 8 M 250 150 l -28 10 M 140 140 l 24 10" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </ArtSlot>
  );
}
