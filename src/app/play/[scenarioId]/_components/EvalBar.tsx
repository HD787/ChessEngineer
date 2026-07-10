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
      className={`${className} relative flex min-h-72 overflow-hidden rounded-md border shadow-sm lg:min-h-0 ${
        active ? "border-zinc-400 bg-zinc-950" : "border-zinc-300 bg-zinc-300"
      }`}
      aria-label={showEvalBar ? `Stockfish evaluation ${label}` : "Evaluation bar hidden"}
    >
      {active ? (
        <>
          <div
            className={`${topSide === "w" ? "bg-zinc-50" : "bg-zinc-950"} w-full transition-[height] duration-1000 ease-out`}
            style={{ height: `${topHeight}%` }}
            aria-hidden="true"
          />
          <div
            className={`${bottomSide === "w" ? "bg-zinc-50" : "bg-zinc-950"} absolute bottom-0 left-0 w-full transition-[height] duration-1000 ease-out`}
            style={{ height: `${bottomHeight}%` }}
            aria-hidden="true"
          />
          <span
            className={`pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-black leading-none ${
              topSide === "w" ? "text-zinc-950" : "text-zinc-50"
            }`}
          >
            {topSide.toUpperCase()}
          </span>
          <span
            className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black leading-none ${
              bottomSide === "w" ? "text-zinc-950" : "text-zinc-50"
            }`}
          >
            {bottomSide.toUpperCase()}
          </span>
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-white/85 px-1.5 py-1 text-[10px] font-bold leading-none text-zinc-950 shadow-sm">
            {label}
          </span>
        </>
      ) : (
        <div className="absolute inset-0 bg-zinc-300" aria-hidden="true" />
      )}
    </aside>
  );
}
