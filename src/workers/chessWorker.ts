import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

type PieceCode = `${"w" | "b"}${PieceSymbol}`;

type BoardState = (PieceCode | null)[][];
type AttackInfo = {
  w: boolean;
  b: boolean;
  occupied: boolean;
  attackersW: Square[];
  attackersB: Square[];
};
type AttackMap = Record<Square, AttackInfo>;

type Snapshot = {
  fen: string;
  pgn: string;
  turn: "w" | "b";
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  board: BoardState;
  attackMap: AttackMap;
};
type TimelineEntry = {
  ply: number;
  san: string | null;
  uci: string | null;
  state: Snapshot;
};

type RequestBase = { id: string };

type WorkerRequest =
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

type WorkerSuccess = {
  id: string;
  ok: true;
  state: Snapshot;
  legalTargets?: Square[];
  legalSafety?: Partial<Record<Square, { attacked: boolean; defended: boolean }>>;
  timeline?: TimelineEntry[];
};

type WorkerFailure = {
  id: string;
  ok: false;
  error: string;
};

let game = new Chess();
const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

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
  return {
    fen: game.fen(),
    pgn: game.pgn(),
    turn: game.turn(),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    board: serializeBoard(),
    attackMap: serializeAttackMap(),
  };
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

function snapshotFrom(source: Chess): Snapshot {
  const previous = game;
  game = source;
  const snap = snapshot();
  game = previous;
  return snap;
}

function resetEditedPosition(turn = game.turn()) {
  const placement = game.fen().split(" ")[0];
  game = new Chess(`${placement} ${turn} - - 0 1`, { skipValidation: true });
}

function postSuccess(
  id: string,
  legalTargets?: Square[],
  legalSafety?: Partial<Record<Square, { attacked: boolean; defended: boolean }>>,
  timeline?: TimelineEntry[],
) {
  const response: WorkerSuccess = { id, ok: true, state: snapshot(), legalTargets, legalSafety, timeline };
  self.postMessage(response);
}

function postFailure(id: string, error: string) {
  const response: WorkerFailure = { id, ok: false, error };
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === "getState") {
      postSuccess(request.id);
      return;
    }

    if (request.type === "reset") {
      game = new Chess();
      postSuccess(request.id);
      return;
    }

    if (request.type === "importPgn") {
      const next = new Chess();
      try {
        next.loadPgn(request.pgn);
      } catch {
        postFailure(request.id, "Invalid PGN.");
        return;
      }
      game = next;
      postSuccess(request.id, undefined, undefined, buildTimeline());
      return;
    }
    if (request.type === "previewPgn") {
      const preview = new Chess();
      try {
        preview.loadPgn(request.pgn);
      } catch {
        postFailure(request.id, "Invalid solution PGN.");
        return;
      }
      postSuccess(request.id, undefined, undefined, buildTimelineFrom(preview));
      return;
    }

    if (request.type === "exportPgn") {
      postSuccess(request.id);
      return;
    }
    if (request.type === "getTimeline") {
      postSuccess(request.id, undefined, undefined, buildTimeline());
      return;
    }
    if (request.type === "setFen") {
      game = new Chess(request.fen);
      postSuccess(request.id);
      return;
    }
    if (request.type === "editMove") {
      if (request.from !== request.to) {
        const piece = game.remove(request.from);
        if (!piece) {
          postFailure(request.id, "No piece on the selected square.");
          return;
        }
        game.remove(request.to);
        game.put(piece, request.to);
        resetEditedPosition();
      }
      postSuccess(request.id);
      return;
    }
    if (request.type === "deletePiece") {
      game.remove(request.square);
      resetEditedPosition();
      postSuccess(request.id);
      return;
    }
    if (request.type === "putPiece") {
      const replaced = game.remove(request.square);
      const placed = game.put(
        { color: request.piece[0] as "w" | "b", type: request.piece[1] as PieceSymbol },
        request.square,
      );
      if (!placed) {
        if (replaced) game.put(replaced, request.square);
        postFailure(request.id, "That piece cannot be added to this position.");
        return;
      }
      resetEditedPosition();
      postSuccess(request.id);
      return;
    }
    if (request.type === "setTurn") {
      resetEditedPosition(request.turn);
      postSuccess(request.id);
      return;
    }

    if (request.type === "legalMoves") {
      const piece = game.get(request.from);
      if (!piece || piece.color !== game.turn()) {
        postSuccess(request.id, []);
        return;
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
        const attacked = next.isAttacked(target, opponent);
        const defended = next.attackers(target, piece.color).length > 0;
        legalSafety[target] = { attacked, defended };
      }

      postSuccess(request.id, legalTargets, legalSafety);
      return;
    }

    const move = game.move({
      from: request.from,
      to: request.to,
      ...(request.promotion ? { promotion: request.promotion } : {}),
    });

    if (!move) {
      postFailure(request.id, "Illegal move.");
      return;
    }

    postSuccess(request.id);
  } catch (error) {
    postFailure(request.id, error instanceof Error ? error.message : "Worker request failed.");
  }
};

export {};
