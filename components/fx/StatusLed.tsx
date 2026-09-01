type StatusLedProps = {
  label: string;
  color?: "green" | "acid" | "red";
  blink?: boolean;
};

/** Small square status LED with a mono label. */
export default function StatusLed({
  label,
  color = "green",
  blink = true,
}: StatusLedProps) {
  const bg =
    color === "red" ? "bg-warn" : color === "acid" ? "bg-acid" : "bg-phos-500";
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] text-phos-dim">
      <span aria-hidden className={`w-2 h-2 ${bg} ${blink ? "led-blink" : ""}`} />
      {label}
    </span>
  );
}
