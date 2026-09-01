type DossierRowProps = {
  k: string;
  v: string;
  accent?: boolean;
};

/** Key/value row for the specimen table. */
export default function DossierRow({ k, v, accent }: DossierRowProps) {
  return (
    <div className="dossier-row flex items-baseline justify-between gap-4 border-b border-line py-2.5">
      <span className="font-tab text-[11px] tracking-[0.2em] text-phos-dim shrink-0">
        {k}
      </span>
      <span
        className={`font-mono text-sm text-right ${
          accent ? "text-acid" : "text-scan"
        }`}
      >
        {accent && (
          <span aria-hidden className="led-blink inline-block w-2 h-2 bg-acid mr-2" />
        )}
        {v}
      </span>
    </div>
  );
}
