type Side = "w" | "b";

type Props = {
  className?: string;
  active: boolean;
  showEvalBar: boolean;
  label: string;
  topSide: Side;
  bottomSide: Side;
  topHeight: number;
  bottomHeight: number;
};

export function EvalBar({
  className = "",
  active,
  showEvalBar,
  label,
  topSide,
  bottomSide,
  topHeight,
  bottomHeight,
}: Props) {
  return (
    <aside
      className={`${className} relative flex min-h-72 overflow-hidden border shadow-sm lg:min-h-0 ${
        active ? "border-[var(--ce-ink)] bg-[var(--ce-ink)]" : "border-[var(--ce-line)] bg-[var(--ce-line)]"
      }`}
      aria-label={showEvalBar ? `Stockfish evaluation ${label}` : "Evaluation bar hidden"}
    >
      {active ? (
        <>
          <div
            className={`${topSide === "w" ? "bg-[var(--ce-cream)]" : "bg-[var(--ce-ink)]"} w-full transition-[height] duration-1000 ease-out`}
            style={{ height: `${topHeight}%` }}
            aria-hidden="true"
          />
          <div
            className={`${bottomSide === "w" ? "bg-[var(--ce-cream)]" : "bg-[var(--ce-ink)]"} absolute bottom-0 left-0 w-full transition-[height] duration-1000 ease-out`}
            style={{ height: `${bottomHeight}%` }}
            aria-hidden="true"
          />
          <span
            className={`pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-black leading-none ${
              topSide === "w" ? "text-[var(--ce-ink)]" : "text-[var(--ce-cream)]"
            }`}
          >
            {topSide.toUpperCase()}
          </span>
          <span
            className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black leading-none ${
              bottomSide === "w" ? "text-[var(--ce-ink)]" : "text-[var(--ce-cream)]"
            }`}
          >
            {bottomSide.toUpperCase()}
          </span>
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-[var(--ce-line)] bg-[var(--ce-cream)]/92 px-1.5 py-1 text-[10px] font-black leading-none text-[var(--ce-ink)] shadow-sm">
            {label}
          </span>
        </>
      ) : (
        <div className="absolute inset-0 bg-[var(--ce-line)]" aria-hidden="true" />
      )}
    </aside>
  );
}
