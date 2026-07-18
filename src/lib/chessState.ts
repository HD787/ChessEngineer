import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

export type PieceCode = `${"w" | "b"}${PieceSymbol}`;
export type BoardState = (PieceCode | null)[][];
export type AttackInfo = {
  w: boolean;
  b: boolean;
  occupied: boolean;
  attackersW: Square[];
  attackersB: Square[];
};
export type AttackMap = Record<Square, AttackInfo>;
export type Snapshot = {
  fen: string;
  pgn: string;
  turn: "w" | "b";
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  drawReason: string | null;
  board: BoardState;
  attackMap: AttackMap;
};
export type TimelineEntry = {
  ply: number;
  san: string | null;
  uci: string | null;
  state: Snapshot;
};

type RequestBase = { id: string };

export type ChessWorkerRequest =
  | (RequestBase & { type: "getState" })
  | (RequestBase & { type: "reset" })
  | (RequestBase & { type: "importPgn"; pgn: string })
  | (RequestBase & { type: "previewPgn"; pgn: string })
  | (RequestBase & { type: "exportPgn" })
  | (RequestBase & { type: "getTimeline" })
  | (RequestBase & { type: "setFen"; fen: string })
  | (RequestBase & { type: "editMove"; from: Square; to: Square })
  | (RequestBase & { type: "deletePiece"; square: Square })
  | (RequestBase & { type: "putPiece"; square: Square; piece: PieceCode })
  | (RequestBase & { type: "setTurn"; turn: "w" | "b" })
  | (RequestBase & { type: "legalMoves"; from: Square })
  | (RequestBase & { type: "move"; from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" });

export type ChessWorkerSuccess = {
  id: string;
  ok: true;
  state: Snapshot;
  legalTargets?: Square[];
  legalSafety?: Partial<Record<Square, { attacked: boolean; defended: boolean }>>;
  timeline?: TimelineEntry[];
};

export type ChessWorkerFailure = {
  id: string;
  ok: false;
  error: string;
};

export type ChessWorkerResponse = ChessWorkerSuccess | ChessWorkerFailure;

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

function attackerCanLegallyCapture(source: Chess, from: Square, target: Square, defendingSide: "w" | "b") {
  const attacker = source.get(from);
  if (!attacker) return false;
  if (attacker.type !== "k") return true;
  return source.attackers(target, defendingSide).filter((square) => square !== target).length === 0;
}

export function createChessStateController() {
  let game = new Chess();

  function serializeBoard(): BoardState {
    return game.board().map((rank) =>
      rank.map((piece) => {
        if (!piece) {
          return null;
        }
        return `${piece.color}${piece.type}` as PieceCode;
      }),
    );
  }

  function serializeAttackMap(): AttackMap {
    const map = {} as AttackMap;

    for (const rank of ranks) {
      for (const file of files) {
        const square = `${file}${rank}` as Square;
        map[square] = {
          w: game.isAttacked(square, "w"),
          b: game.isAttacked(square, "b"),
          occupied: Boolean(game.get(square)),
          attackersW: game.attackers(square, "w"),
          attackersB: game.attackers(square, "b"),
        };
      }
    }

    return map;
  }

  function snapshot(): Snapshot {
    const drawReason = game.isStalemate()
      ? "stalemate"
      : game.isDrawByFiftyMoves()
        ? "50-move rule"
        : game.isThreefoldRepetition()
          ? "threefold repetition"
          : game.isInsufficientMaterial()
            ? "insufficient material"
            : null;

    return {
      fen: game.fen(),
      pgn: game.pgn(),
      turn: game.turn(),
      isCheck: game.isCheck(),
      isCheckmate: game.isCheckmate(),
      isDraw: game.isDraw(),
      drawReason,
      board: serializeBoard(),
      attackMap: serializeAttackMap(),
    };
  }

  function snapshotFrom(source: Chess): Snapshot {
    const previous = game;
    game = source;
    const snap = snapshot();
    game = previous;
    return snap;
  }

  function buildTimelineFrom(source: Chess): TimelineEntry[] {
    const headers = source.getHeaders();
    const root = headers.FEN
      ? new Chess(headers.FEN, { skipValidation: true })
      : new Chess();
    const timeline: TimelineEntry[] = [{ ply: 0, san: null, uci: null, state: snapshotFrom(root) }];
    const history = source.history({ verbose: true });

    for (let index = 0; index < history.length; index += 1) {
      const move = history[index];
      root.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion as Move["promotion"],
      });
      timeline.push({
        ply: index + 1,
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion ?? ""}`,
        state: snapshotFrom(root),
      });
    }

    return timeline;
  }

  function buildTimeline(): TimelineEntry[] {
    return buildTimelineFrom(game);
  }

  function resetEditedPosition(turn = game.turn()) {
    const placement = game.fen().split(" ")[0];
    game = new Chess(`${placement} ${turn} - - 0 1`, { skipValidation: true });
  }

  function success(
    id: string,
    legalTargets?: Square[],
    legalSafety?: Partial<Record<Square, { attacked: boolean; defended: boolean }>>,
    timeline?: TimelineEntry[],
  ): ChessWorkerSuccess {
    return { id, ok: true, state: snapshot(), legalTargets, legalSafety, timeline };
  }

  function failure(id: string, error: string): ChessWorkerFailure {
    return { id, ok: false, error };
  }

  function handle(request: ChessWorkerRequest): ChessWorkerResponse {
    try {
      if (request.type === "getState") return success(request.id);
      if (request.type === "reset") {
        game = new Chess();
        return success(request.id);
      }
      if (request.type === "importPgn") {
        const next = new Chess();
        try {
          next.loadPgn(request.pgn);
        } catch {
          return failure(request.id, "Invalid PGN.");
        }
        game = next;
        return success(request.id, undefined, undefined, buildTimeline());
      }
      if (request.type === "previewPgn") {
        const preview = new Chess();
        try {
          preview.loadPgn(request.pgn);
        } catch {
          return failure(request.id, "Invalid solution PGN.");
        }
        return success(request.id, undefined, undefined, buildTimelineFrom(preview));
      }
      if (request.type === "exportPgn") return success(request.id);
      if (request.type === "getTimeline") return success(request.id, undefined, undefined, buildTimeline());
      if (request.type === "setFen") {
        game = new Chess(request.fen);
        return success(request.id);
      }
      if (request.type === "editMove") {
        if (request.from !== request.to) {
          const piece = game.remove(request.from);
          if (!piece) return failure(request.id, "No piece on the selected square.");
          game.remove(request.to);
          game.put(piece, request.to);
          resetEditedPosition();
        }
        return success(request.id);
      }
      if (request.type === "deletePiece") {
        game.remove(request.square);
        resetEditedPosition();
        return success(request.id);
      }
      if (request.type === "putPiece") {
        const replaced = game.remove(request.square);
        const placed = game.put(
          { color: request.piece[0] as "w" | "b", type: request.piece[1] as PieceSymbol },
          request.square,
        );
        if (!placed) {
          if (replaced) game.put(replaced, request.square);
          return failure(request.id, "That piece cannot be added to this position.");
        }
        resetEditedPosition();
        return success(request.id);
      }
      if (request.type === "setTurn") {
        resetEditedPosition(request.turn);
        return success(request.id);
      }
      if (request.type === "legalMoves") {
        const piece = game.get(request.from);
        if (!piece || piece.color !== game.turn()) {
          return success(request.id, []);
        }

        const moves = game.moves({ square: request.from, verbose: true });
        const legalTargets = moves.map((move) => move.to as Square);
        const legalSafety: Partial<Record<Square, { attacked: boolean; defended: boolean }>> = {};

        for (const move of moves) {
          const next = new Chess(game.fen());
          next.move({
            from: move.from,
            to: move.to,
            promotion: (move.promotion ?? "q") as "q" | "r" | "b" | "n",
          });

          const target = move.to as Square;
          const opponent = piece.color === "w" ? "b" : "w";
          const defended = next.attackers(target, piece.color).length > 0;
          const attacked = next
            .attackers(target, opponent)
            .some((attacker) => attackerCanLegallyCapture(next, attacker, target, piece.color));
          legalSafety[target] = { attacked, defended };
        }

        return success(request.id, legalTargets, legalSafety);
      }

      const move = game.move({
        from: request.from,
        to: request.to,
        ...(request.promotion ? { promotion: request.promotion } : {}),
      });

      if (!move) return failure(request.id, "Illegal move.");
      return success(request.id);
    } catch (error) {
      return failure(request.id, error instanceof Error ? error.message : "Worker request failed.");
    }
  }

  return { handle };
}
