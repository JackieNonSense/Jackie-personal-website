"use client";

/** Fixed xerox atmosphere: animated grain, faint blue ink stains, vignette. */
export default function GrainOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
      {/* faint blue ink stains */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-screen"
        style={{
          background:
            "radial-gradient(340px 520px at 26% 18%, var(--blue-ink) 0%, transparent 60%), radial-gradient(240px 420px at 74% 82%, var(--blue-ink) 0%, transparent 65%), radial-gradient(120px 260px at 38% 88%, var(--blue-soft) 0%, transparent 60%)",
          filter: "blur(2px)",
        }}
      />
      {/* animated film grain */}
      <div className="noise absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      {/* vignette */}
      <div className="crt-vignette absolute inset-0" />
    </div>
  );
}
