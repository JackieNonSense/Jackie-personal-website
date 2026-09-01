"use client";

/** Fixed full-screen CRT layer: scanlines + animated noise + vignette + sync bar. */
export default function CrtOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <div className="scanlines absolute inset-0" />
      <div className="noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      <div className="crt-vignette absolute inset-0" />
      <div className="sync-bar absolute inset-x-0 h-24" />
    </div>
  );
}
