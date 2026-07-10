import type { ReactNode, RefObject } from "react";

type Side = "w" | "b";
type PieceCode = `${Side}${"p" | "n" | "b" | "r" | "q" | "k"}`;
type Square =
  `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${"8" | "7" | "6" | "5" | "4" | "3" | "2" | "1"}`;

type Opening = {
  eco: string;
  name: string;
};

type ScenarioVariant = {
  solution?: {
    moves: string[];
    explanation: string;
  };
};

type Snapshot = {
  turn: Side;
};

type MoveRow = {
  moveNumber: number;
  white: string;
  black: string;
  whitePly: number;
  blackPly: number | null;
};

type EditorPiece = {
  code: PieceCode;
  glyph: string;
  name: string;
};

type Props = {
  positionEditor: boolean;
  activeMode: string;
  activeState: Snapshot | null | undefined;
  selected: Square | null;
  currentOpening: Opening | null;
  activeVariant: ScenarioVariant | undefined;
  isSolutionMode: boolean;
  isReviewing: boolean;
  bestMovesThinking: boolean;
  canShowBestMoves: boolean;
  moveHistoryRef: RefObject<HTMLDivElement | null>;
  moveRows: MoveRow[];
  currentPly: number;
  lastPly: number;
  timelineExists: boolean;
  currentMoveText: string;
  editorPieces: EditorPiece[];
  onTogglePositionEditor: (enabled: boolean) => void;
  onStartEditorPieceDrag: (piece: PieceCode, event: MouseEvent | TouchEvent) => void;
  onChangeEditorTurn: (turn: Side) => void;
  onDeleteSelectedPiece: () => void;
  onShowSolutionTimeline: () => void;
  onReturnFromSolution: () => void;
  onShowBestMoves: () => void;
  onGoToPly: (ply: number) => void;
  renderHistoryMoveLabel: (ply: number | null) => ReactNode;
};

export function MovePanel({
  positionEditor,
  activeMode,
  activeState,
  selected,
  currentOpening,
  activeVariant,
  isSolutionMode,
  isReviewing,
  bestMovesThinking,
  canShowBestMoves,
  moveHistoryRef,
  moveRows,
  currentPly,
  lastPly,
  timelineExists,
  currentMoveText,
  editorPieces,
  onTogglePositionEditor,
  onStartEditorPieceDrag,
  onChangeEditorTurn,
  onDeleteSelectedPiece,
  onShowSolutionTimeline,
  onReturnFromSolution,
  onShowBestMoves,
  onGoToPly,
  renderHistoryMoveLabel,
}: Props) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{positionEditor ? "Position Editor" : "Moves"}</h2>
          {!positionEditor ? (
            <span className="text-xs text-zinc-500">
              {lastPly === 0 ? "New game" : `${Math.ceil(lastPly / 2)} move${lastPly > 2 ? "s" : ""}`}
            </span>
          ) : null}
        </div>
        {activeMode === "sandbox" ? (
          <button
            type="button"
            onClick={() => onTogglePositionEditor(!positionEditor)}
            disabled={!positionEditor && isReviewing}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              positionEditor
                ? "bg-zinc-900 text-white hover:bg-zinc-700"
                : "border border-zinc-300 hover:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-300"
            }`}
          >
            {positionEditor ? "Done" : "Edit Position"}
          </button>
        ) : null}
      </div>
      {positionEditor ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <p className="text-sm text-zinc-600">Drag pieces onto the board or move existing pieces freely.</p>
          {(["w", "b"] as Side[]).map((color) => (
            <div key={color} className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase text-zinc-400">
                {color === "w" ? "White" : "Black"} pieces
              </p>
              <div className="grid grid-cols-6 gap-2">
                {editorPieces
                  .filter((piece) => piece.code[0] === color)
                  .map((piece) => (
                    <button
                      key={piece.code}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onStartEditorPieceDrag(piece.code, event.nativeEvent);
                      }}
                      onTouchStart={(event) => {
                        onStartEditorPieceDrag(piece.code, event.nativeEvent);
                      }}
                      className="grid aspect-square place-items-center rounded-md border border-zinc-300 bg-zinc-50 text-3xl text-zinc-900 hover:border-emerald-600 hover:bg-emerald-50"
                      title={`Drag ${piece.name} onto board`}
                      aria-label={`Drag ${piece.name} onto board`}
                    >
                      {piece.glyph}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-2 border-t border-zinc-200 pt-4">
            <label className="text-xs font-semibold text-zinc-600">
              Side to move
              <select
                value={activeState?.turn ?? "w"}
                onChange={(event) => onChangeEditorTurn(event.target.value as Side)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-2 text-sm outline-none focus:border-emerald-600"
              >
                <option value="w">White</option>
                <option value="b">Black</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onDeleteSelectedPiece}
              disabled={!selected}
              className="self-end rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:border-zinc-200 disabled:text-zinc-300"
            >
              Delete selected
            </button>
          </div>
          <p className="mt-auto border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-500">
            A playable position requires one king of each color.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2 border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2">
            <div className="flex min-h-8 items-center justify-between gap-3">
              <div className="min-w-0">
                {currentOpening ? (
                  <>
                    <p className="text-[10px] font-bold uppercase text-emerald-700">{currentOpening.eco}</p>
                    <p className="truncate text-sm font-semibold text-emerald-950" title={currentOpening.name}>
                      {currentOpening.name}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Starting position</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onShowBestMoves}
                  disabled={!canShowBestMoves || bestMovesThinking}
                  className="rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:border-zinc-200 disabled:text-zinc-300 disabled:hover:bg-white"
                >
                  {bestMovesThinking ? "Finding..." : "Show best moves"}
                </button>
                {activeVariant?.solution ? (
                  <button
                    type="button"
                    onClick={isSolutionMode ? onReturnFromSolution : onShowSolutionTimeline}
                    className="rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    {isSolutionMode ? "Back to game" : "Reveal solution"}
                  </button>
                ) : null}
              </div>
            </div>
            {isSolutionMode && activeVariant?.solution ? (
              <div className="mt-2 border-t border-emerald-200 pt-2">
                <p className="font-mono text-sm font-semibold text-emerald-950">
                  {activeVariant.solution.moves.join(" ")}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-900">
                  {activeVariant.solution.explanation}
                </p>
              </div>
            ) : null}
          </div>

          <div ref={moveHistoryRef} className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-zinc-300">
            <div className="sticky top-0 grid grid-cols-[44px_1fr_1fr] border-b border-zinc-300 bg-zinc-100 px-2 py-2 text-xs font-semibold uppercase text-zinc-500">
              <span>#</span>
              <span>White</span>
              <span>Black</span>
            </div>
            {moveRows.length === 0 ? (
              <p className="px-3 py-5 text-sm text-zinc-500">Moves will appear here as the game is played.</p>
            ) : (
              moveRows.map((row) => (
                <div
                  key={row.moveNumber}
                  className="grid grid-cols-[44px_1fr_1fr] items-center border-b border-zinc-200 px-2 py-1 last:border-b-0"
                >
                  <span className="text-xs tabular-nums text-zinc-500">{row.moveNumber}.</span>
                  <button
                    type="button"
                    onClick={() => onGoToPly(row.whitePly)}
                    className={`h-12 rounded px-2 py-1 text-left text-sm font-medium hover:bg-zinc-200 ${
                      currentPly === row.whitePly ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
                    }`}
                  >
                    <span className="block truncate">{row.white}</span>
                    {renderHistoryMoveLabel(row.whitePly)}
                  </button>
                  {row.blackPly ? (
                    <button
                      type="button"
                      onClick={() => onGoToPly(row.blackPly!)}
                      className={`h-12 rounded px-2 py-1 text-left text-sm font-medium hover:bg-zinc-200 ${
                        currentPly === row.blackPly ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
                      }`}
                    >
                      <span className="block truncate">{row.black}</span>
                      {renderHistoryMoveLabel(row.blackPly)}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 p-3">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onGoToPly(0)}
                disabled={!timelineExists || currentPly === 0}
                className="h-9 w-9 rounded border border-zinc-300 text-sm hover:bg-zinc-200 disabled:opacity-40"
                aria-label="Jump to beginning"
                title="Jump to beginning"
              >
                {"|<"}
              </button>
              <button
                type="button"
                onClick={() => onGoToPly(currentPly - 1)}
                disabled={!timelineExists || currentPly === 0}
                className="h-9 w-9 rounded border border-zinc-300 text-sm hover:bg-zinc-200 disabled:opacity-40"
                aria-label="Previous move"
                title="Previous move"
              >
                {"<"}
              </button>
              <button
                type="button"
                onClick={() => onGoToPly(currentPly + 1)}
                disabled={!timelineExists || currentPly === lastPly}
                className="h-9 w-9 rounded border border-zinc-300 text-sm hover:bg-zinc-200 disabled:opacity-40"
                aria-label="Next move"
                title="Next move"
              >
                {">"}
              </button>
              <button
                type="button"
                onClick={() => onGoToPly(lastPly)}
                disabled={!timelineExists || currentPly === lastPly}
                className="h-9 w-9 rounded border border-zinc-300 text-sm hover:bg-zinc-200 disabled:opacity-40"
                aria-label="Jump to end"
                title="Jump to end"
              >
                {">|"}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={lastPly}
              value={currentPly}
              onChange={(event) => onGoToPly(Number(event.target.value))}
              className="mt-3 w-full"
              disabled={!timelineExists}
            />
            <p className="mt-2 text-center text-xs text-zinc-600">{currentMoveText}</p>
          </div>
        </>
      )}
    </section>
  );
}
