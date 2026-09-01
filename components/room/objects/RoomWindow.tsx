import ArtSlot from "../ArtSlot";

/** Wood-frame window onto a rainy night city; rain animated via CSS. */
export default function RoomWindow() {
  return (
    <ArtSlot id="window-night" width={480} height={560}>
      <div className="relative w-full h-full">
        <svg viewBox="0 0 480 560" className="w-full h-full" aria-hidden>
          {/* outer frame */}
          <rect x="6" y="6" width="468" height="548" rx="8" fill="var(--wood)" stroke="var(--ink)" strokeWidth="4" />
          {/* night glass */}
          <rect x="34" y="34" width="412" height="492" fill="var(--night)" stroke="var(--ink)" strokeWidth="3" />
          {/* muntins */}
          <path d="M 240 34 V 526 M 34 280 H 446" stroke="var(--wood)" strokeWidth="14" />
          <path d="M 240 34 V 526 M 34 280 H 446" stroke="var(--ink)" strokeWidth="2.5" opacity="0.5" />
          {/* moon */}
          <circle cx="120" cy="120" r="34" fill="#e8e4d2" opacity="0.9" />
          <circle cx="134" cy="110" r="30" fill="var(--night)" />
          {/* skyline */}
          <path d="M 40 470 h 50 v -70 h 34 v 40 h 44 v -100 h 40 v 130 h 30 v -60 h 50 v 80 h 36 v -44 h 44 v 78 H 40 Z" fill="var(--night-deep)" />
          {/* lit city windows */}
          <g fill="var(--amber)" opacity="0.8">
            <rect x="104" y="416" width="7" height="9" /><rect x="150" y="360" width="7" height="9" />
            <rect x="162" y="382" width="7" height="9" /><rect x="216" y="428" width="7" height="9" />
            <rect x="300" y="440" width="7" height="9" /><rect x="384" y="470" width="7" height="9" />
            <rect x="352" y="452" width="7" height="9" />
          </g>
          {/* sill */}
          <rect x="0" y="526" width="480" height="30" rx="6" fill="var(--wood-dark)" stroke="var(--ink)" strokeWidth="3.5" />
          {/* tiny plant on sill */}
          <path d="M 396 522 c -4 -14, 4 -22, 8 -30 M 404 522 c 6 -10, 2 -22, 10 -28" stroke="#3a6b4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 388 522 h 34 l -4 16 h -26 Z" fill="#a8552e" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        {/* animated rain inside the glass area */}
        <div
          aria-hidden
          className="rain absolute"
          style={{ left: "7%", top: "6%", width: "86%", height: "88%", opacity: 0.7 }}
        />
      </div>
    </ArtSlot>
  );
}
