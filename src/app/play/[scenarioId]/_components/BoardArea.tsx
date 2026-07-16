import type { RefObject, ReactNode } from "react";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type Square = `${(typeof files)[number]}${"8" | "7" | "6" | "5" | "4" | "3" | "2" | "1"}`;
type Side = "w" | "b";
type PieceKind = "p" | "n" | "b" | "r" | "q";
type PromotionPiece = "q" | "r" | "b" | "n";
type LegalSafety = { attacked: boolean; defended: boolean };
type MoveSafety = "danger" | "contested" | "safe";
type PlayerCardInfo = {
  side: string;
  color: Side;
  label: string;
};
type MaterialSummary = {
  capturedByWhite: PieceKind[];
  capturedByBlack: PieceKind[];
  whitePoints: number;
  blackPoints: number;
};
type Snapshot = {
  fen: string;
  turn: Side;
  isCheckmate: boolean;
};

const pieceGlyphs: Record<Side, Record<PieceKind, string>> = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" },
};

const pieceRoles: Record<PieceKind, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
};

function BoardPieceIcon({ color, piece }: { color: Side; piece: PieceKind }) {
  const className = `ce-piece-icon ${pieceRoles[piece]} ${color === "w" ? "white" : "black"}`;

  return (
    <span
      className="cg-wrap ce-piece-holder"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: `<piece class="${className}"></piece>` }}
    />
  );
}

function squareOverlayPosition(square: Square, isFlipped: boolean) {
  const file = files.indexOf(square[0] as (typeof files)[number]);
  const rank = Number(square[1]);
  const column = isFlipped ? 7 - file : file;
  const row = isFlipped ? rank - 1 : 8 - rank;
  return {
    left: `${column * 12.5}%`,
    top: `${row * 12.5}%`,
  };
}

function promotionMenuPosition(square: Square, color: Side, isFlipped: boolean) {
  const file = files.indexOf(square[0] as (typeof files)[number]);
  const rank = Number(square[1]);
  const column = isFlipped ? 7 - file : file;
  const row = isFlipped ? rank - 1 : 8 - rank;
  const opensDown = color === "w" ? !isFlipped : isFlipped;
  const topRow = opensDown ? row : row - 3;

  return {
    left: `${column * 12.5}%`,
    top: `${Math.max(0, Math.min(4, topRow)) * 12.5}%`,
  };
}

function moveSafety(info: LegalSafety | undefined): MoveSafety {
  if (info?.attacked && info.defended) return "contested";
  if (info?.attacked) return "danger";
  return "safe";
}

function MoveSafetyOverlay({ safety }: { safety: MoveSafety }) {
  return (
    <span className={`move-safety-icon move-safety-icon--${safety}`} aria-hidden="true">
      {safety === "danger" ? (
        <svg viewBox="0 0 24 24">
          <path d="M8.5 18.5V21M12 18.5V21M15.5 18.5V21" />
          <path d="M7 18.5h10v-2.2a8 8 0 1 0-10 0v2.2Z" />
          <circle cx="9.25" cy="11.5" r="1.15" />
          <circle cx="14.75" cy="11.5" r="1.15" />
          <path d="m12 14-1.1 1.5h2.2L12 14Z" />
        </svg>
      ) : safety === "contested" ? (
        <svg viewBox="0 0 24 24">
          <path d="m4 3 2 6 12 12" />
          <path d="m13.5 14.5 3-3" />
          <path d="m18 21 3-3" />
          <path d="m20 3-2 6L6 21" />
          <path d="m10.5 14.5-3-3" />
          <path d="m6 21-3-3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24">
          <path d="M11 17c-3.5.3-6.6-1.2-8.5-4.2 2.2.2 4-.4 5.5-1.8-2.4-.4-4.2-1.7-5.4-3.8 3.7.1 6.5 1.6 8.4 4.3V17Z" />
          <path d="M13 17c3.5.3 6.6-1.2 8.5-4.2-2.2.2-4-.4-5.5-1.8 2.4-.4 4.2-1.7 5.4-3.8-3.7.1-6.5 1.6-8.4 4.3V17Z" />
          <path d="M12 10.5V20" />
        </svg>
      )}
    </span>
  );
}

function PlayerCard({
  player,
  material,
  whiteMaterialAdvantage,
}: {
  player: PlayerCardInfo;
  material: MaterialSummary;
  whiteMaterialAdvantage: number;
}) {
  const isWhite = player.color === "w";
  const captured = isWhite ? material.capturedByWhite : material.capturedByBlack;
  const capturedColor = isWhite ? "b" : "w";
  const pointTotal = isWhite ? material.whitePoints : material.blackPoints;
  const advantage = isWhite ? whiteMaterialAdvantage : -whiteMaterialAdvantage;
  const advantageText = advantage > 0 ? `+${advantage}` : advantage < 0 ? `${advantage}` : "0";

  return (
    <div className="player-card border px-3 py-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`h-8 w-8 shrink-0 border ${
              isWhite ? "border-[#cfc4b2] bg-[var(--ce-cream)]" : "border-[var(--ce-ink)] bg-[var(--ce-ink)]"
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="ce-section-title text-[10px]">{player.side}</p>
            <div className="flex min-w-0 items-baseline gap-2">
              <p className="ce-title truncate text-sm" title={player.label}>
                {player.label}
              </p>
              <span
                className={`shrink-0 text-xs font-semibold ${
                  advantage > 0
                    ? "ce-positive"
                    : advantage < 0
                      ? "ce-negative"
                    : "ce-muted"
                }`}
                title={`${pointTotal} captured material point${pointTotal === 1 ? "" : "s"}`}
              >
                {advantageText}
              </span>
            </div>
          </div>
        </div>
        <div
          className="flex max-w-[44%] shrink-0 items-center justify-end gap-1 overflow-hidden text-lg leading-none text-[var(--ce-ink)]"
          aria-label={`${player.side} captured pieces`}
        >
          {captured.length === 0 ? (
            <span className="text-xs font-medium leading-6 text-[var(--ce-heading-muted)]">0 pts</span>
          ) : (
            <>
              <span className="ce-muted mr-1 shrink-0 text-xs font-bold leading-5">
                {pointTotal} pts
              </span>
              {captured.map((kind, index) => (
                <span key={`${kind}-${index}`} className="shrink-0" title={`${player.side} captured ${kind}`}>
                  {pieceGlyphs[capturedColor][kind]}
                </span>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type Props = {
  className?: string;
  boardRef: RefObject<HTMLDivElement | null>;
  topPlayer: PlayerCardInfo;
  bottomPlayer: PlayerCardInfo;
  material: MaterialSummary;
  whiteMaterialAdvantage: number;
  isReviewing: boolean;
  showMoveSafetyHints: boolean;
  selected: Square | null;
  positionEditor: boolean;
  legalTargets: Set<Square>;
  legalSafety: Partial<Record<Square, LegalSafety>>;
  isFlipped: boolean;
  boardMoveLabel: ReactNode;
  showCheckmateOverlay: boolean;
  activeState: Snapshot | null | undefined;
  promotionChoice: { color: Side; square: Square } | null;
  onChoosePromotion: (piece: PromotionPiece) => void;
  onDismissCheckmate: () => void;
};

export function BoardArea({
  className = "",
  boardRef,
  topPlayer,
  bottomPlayer,
  material,
  whiteMaterialAdvantage,
  isReviewing,
  showMoveSafetyHints,
  selected,
  positionEditor,
  legalTargets,
  legalSafety,
  isFlipped,
  boardMoveLabel,
  showCheckmateOverlay,
  activeState,
  promotionChoice,
  onChoosePromotion,
  onDismissCheckmate,
}: Props) {
  return (
    <section className={`${className} flex min-h-0 flex-col items-stretch justify-start gap-1 lg:min-h-[420px]`}>
      <div>
        <PlayerCard
          player={topPlayer}
          material={material}
          whiteMaterialAdvantage={whiteMaterialAdvantage}
        />
      </div>
      <div className={`board-frame flex shrink-0 items-center justify-center overflow-hidden ${isReviewing ? "bg-[#fbf1cf]" : ""}`}>
        <div
          className={`cg-wrap board-square overflow-hidden ${
            showMoveSafetyHints ? "move-safety-enabled" : ""
          }`}
        >
          <div ref={boardRef} className="cg-board h-full w-full" />
          {boardMoveLabel ? (
            <div className="move-quality-layer" aria-hidden="true">
              {boardMoveLabel}
            </div>
          ) : null}
          {selected && showMoveSafetyHints && !positionEditor ? (
            <div className="move-safety-layer" aria-hidden="true">
              {Array.from(legalTargets).map((square) => (
                <span
                  key={square}
                  className="move-safety-square"
                  style={squareOverlayPosition(square, isFlipped)}
                >
                  <MoveSafetyOverlay safety={moveSafety(legalSafety[square])} />
                </span>
              ))}
            </div>
          ) : null}
          {showCheckmateOverlay && activeState ? (
            <button
              type="button"
              className="checkmate-overlay"
              aria-live="polite"
              aria-label="Dismiss checkmate result"
              onPointerDown={(event) => {
                event.stopPropagation();
                onDismissCheckmate();
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="checkmate-result">
                <span>Checkmate</span>
                <strong>{activeState.turn === "w" ? "Black" : "White"} wins</strong>
              </div>
            </button>
          ) : null}
          {promotionChoice ? (
            <div
              className="promotion-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Choose promotion piece"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div
                className="promotion-picker"
                style={promotionMenuPosition(promotionChoice.square, promotionChoice.color, isFlipped)}
              >
                {(["q", "r", "b", "n"] as const).map((piece) => (
                  <button
                    key={piece}
                    type="button"
                    className="promotion-option"
                    onClick={() => onChoosePromotion(piece)}
                    aria-label={`Promote to ${piece === "q" ? "queen" : piece === "r" ? "rook" : piece === "b" ? "bishop" : "knight"}`}
                  >
                    <BoardPieceIcon color={promotionChoice.color} piece={piece} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-auto">
        <PlayerCard
          player={bottomPlayer}
          material={material}
          whiteMaterialAdvantage={whiteMaterialAdvantage}
        />
      </div>
    </section>
  );
}
