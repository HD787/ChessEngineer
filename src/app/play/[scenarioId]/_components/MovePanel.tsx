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

const pieceRoles: Record<PieceCode[1], string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

function BoardPieceIcon({ code }: { code: PieceCode }) {
  const className = `ce-piece-icon ${pieceRoles[code[1]]} ${code[0] === "w" ? "white" : "black"}`;

  return (
    <span
      className="cg-wrap ce-piece-holder"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: `<piece class="${className}"></piece>` }}
    />
  );
}

type Props = {
  className?: string;
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
  className = "",
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
    <section className={`${className} ce-panel flex min-h-0 flex-col p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="ce-title text-lg">{positionEditor ? "Position Editor" : "Moves"}</h2>
          {!positionEditor ? (
            <span className="ce-muted text-xs font-medium">
              {lastPly === 0 ? "New game" : `${Math.ceil(lastPly / 2)} move${lastPly > 2 ? "s" : ""}`}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!positionEditor ? (
            <button
              type="button"
              onClick={onShowBestMoves}
              disabled={!canShowBestMoves || bestMovesThinking}
              className="ce-button-secondary px-2.5 py-1.5 text-xs font-bold ce-positive disabled:border-[var(--ce-line)] disabled:text-[var(--ce-heading-muted)] disabled:hover:bg-transparent"
            >
              {bestMovesThinking ? "Finding..." : "Best moves"}
            </button>
          ) : null}
          {activeMode === "sandbox" ? (
            <button
              type="button"
              onClick={() => onTogglePositionEditor(!positionEditor)}
              disabled={!positionEditor && isReviewing}
              className={`px-3 py-1.5 text-xs font-bold ${
                positionEditor
                  ? "ce-button-primary"
                  : "ce-button-secondary disabled:border-[var(--ce-line)] disabled:text-[var(--ce-heading-muted)]"
              }`}
            >
              {positionEditor ? "Done" : "Edit Position"}
            </button>
          ) : null}
        </div>
      </div>
      {positionEditor ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <p className="ce-text text-sm font-medium">Drag pieces onto the board or move existing pieces freely.</p>
          {(["w", "b"] as Side[]).map((color) => (
            <div key={color} className="mt-5">
              <p className="ce-section-title mb-2">
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
                      className="ce-subpanel grid aspect-square place-items-center text-3xl text-[var(--ce-ink)] shadow-sm hover:border-[var(--ce-green)] hover:bg-[var(--ce-green-soft)]"
                      title={`Drag ${piece.name} onto board`}
                      aria-label={`Drag ${piece.name} onto board`}
                    >
                      <BoardPieceIcon code={piece.code} />
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <div className="ce-rule mt-6 grid grid-cols-[1fr_auto] gap-2 border-t pt-4">
            <label className="ce-label">
              Side to move
              <select
                value={activeState?.turn ?? "w"}
                onChange={(event) => onChangeEditorTurn(event.target.value as Side)}
                className="ce-select mt-1 w-full px-2 py-2 text-sm outline-none"
              >
                <option value="w">White</option>
                <option value="b">Black</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onDeleteSelectedPiece}
              disabled={!selected}
              className="ce-button-danger self-end px-3 py-2 text-sm font-bold disabled:border-[var(--ce-line)] disabled:text-[var(--ce-heading-muted)]"
            >
              Delete selected
            </button>
          </div>
          <p className="ce-muted mt-auto border-l-2 border-[#b7a88f] pl-3 text-xs font-medium leading-5">
            A playable position requires one king of each color.
          </p>
        </div>
      ) : (
        <>
          <div className="ce-accent-panel mt-2 px-3 py-2">
            <div className="flex min-h-8 items-center justify-between gap-3">
              <div className="min-w-0">
                {currentOpening ? (
                  <>
                    <p className="text-[10px] font-black uppercase ce-positive">{currentOpening.eco}</p>
                    <p className="truncate text-sm font-bold text-[var(--ce-green-dark)]" title={currentOpening.name}>
                      {currentOpening.name}
                    </p>
                  </>
                ) : (
                  <p className="ce-muted text-sm font-medium">Starting position</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {activeVariant?.solution ? (
                  <button
                    type="button"
                    onClick={isSolutionMode ? onReturnFromSolution : onShowSolutionTimeline}
                    className="ce-button-secondary px-2.5 py-1.5 text-xs font-bold ce-positive"
                  >
                    {isSolutionMode ? "Back to game" : "Reveal solution"}
                  </button>
                ) : null}
              </div>
            </div>
            {isSolutionMode && activeVariant?.solution ? (
              <div className="mt-2 border-t border-[#c7dbc8] pt-2">
                <p className="font-mono text-sm font-bold text-[var(--ce-green-dark)]">
                  {activeVariant.solution.moves.join(" ")}
                </p>
                <p className="mt-1 text-xs font-medium leading-5 ce-positive">
                  {activeVariant.solution.explanation}
                </p>
              </div>
            ) : null}
          </div>

          <div
            ref={moveHistoryRef}
            className="ce-subpanel mt-3 min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
          >
            <div className="ce-table-head sticky top-0 grid grid-cols-[44px_1fr_1fr] border-b px-2 py-2">
              <span>#</span>
              <span>White</span>
              <span>Black</span>
            </div>
            {moveRows.length === 0 ? (
              <p className="ce-muted px-3 py-5 text-sm font-medium">Moves will appear here as the game is played.</p>
            ) : (
              moveRows.map((row) => (
                <div
                  key={row.moveNumber}
                  className="ce-table-row grid grid-cols-[44px_1fr_1fr] items-center border-b px-2 py-1 last:border-b-0"
                >
                  <span className="text-xs font-medium tabular-nums text-[var(--ce-heading-muted)]">{row.moveNumber}.</span>
                  <button
                    type="button"
                    onClick={() => onGoToPly(row.whitePly)}
                    className={`h-12 px-2 py-1 text-left text-sm font-bold hover:bg-[var(--background)] ${
                      currentPly === row.whitePly ? "ce-active-row" : ""
                    }`}
                  >
                    <span className="block truncate">{row.white}</span>
                    {renderHistoryMoveLabel(row.whitePly)}
                  </button>
                  {row.blackPly ? (
                    <button
                      type="button"
                      onClick={() => onGoToPly(row.blackPly!)}
                      className={`h-12 px-2 py-1 text-left text-sm font-bold hover:bg-[var(--background)] ${
                        currentPly === row.blackPly ? "ce-active-row" : ""
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

          <div className="ce-subpanel mt-3 shrink-0 bg-[var(--ce-paper-warm)] p-3">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onGoToPly(0)}
                disabled={!timelineExists || currentPly === 0}
                className="ce-button-secondary h-9 w-9 text-sm font-bold disabled:opacity-40"
                aria-label="Jump to beginning"
                title="Jump to beginning"
              >
                {"|<"}
              </button>
              <button
                type="button"
                onClick={() => onGoToPly(currentPly - 1)}
                disabled={!timelineExists || currentPly === 0}
                className="ce-button-secondary h-9 w-9 text-sm font-bold disabled:opacity-40"
                aria-label="Previous move"
                title="Previous move"
              >
                {"<"}
              </button>
              <button
                type="button"
                onClick={() => onGoToPly(currentPly + 1)}
                disabled={!timelineExists || currentPly === lastPly}
                className="ce-button-secondary h-9 w-9 text-sm font-bold disabled:opacity-40"
                aria-label="Next move"
                title="Next move"
              >
                {">"}
              </button>
              <button
                type="button"
                onClick={() => onGoToPly(lastPly)}
                disabled={!timelineExists || currentPly === lastPly}
                className="ce-button-secondary h-9 w-9 text-sm font-bold disabled:opacity-40"
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
            <p className="ce-text mt-2 text-center text-xs font-bold">{currentMoveText}</p>
          </div>
        </>
      )}
    </section>
  );
}
