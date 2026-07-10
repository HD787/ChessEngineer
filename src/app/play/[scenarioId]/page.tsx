"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Key, Piece as GroundPiece } from "chessground/types";
import openingData from "../../../data/openings.json";
import { scenarios as scenarioData } from "../../../data/scenarios";
import { BrowserStockfish, type StockfishResult } from "../../../lib/browserStockfish";
import { BoardArea } from "./_components/BoardArea";
import { EvalBar } from "./_components/EvalBar";
import { GameSidebar } from "./_components/GameSidebar";
import { MovePanel } from "./_components/MovePanel";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

type Square = `${(typeof files)[number]}${(typeof ranks)[number]}`;
type PieceCode = `${"w" | "b"}${"p" | "n" | "b" | "r" | "q" | "k"}`;
type BoardState = (PieceCode | null)[][];
type AttackInfo = { w: boolean; b: boolean; occupied: boolean; attackersW: Square[]; attackersB: Square[] };
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

type ServedModel = {
  id: string;
  name: string;
  path: string;
  epoch?: number;
  metrics?: Record<string, number>;
};

type PlayerController = "human" | string;
type Side = "w" | "b";
type PieceKind = "p" | "n" | "b" | "r" | "q";
type MaterialSummary = {
  capturedByWhite: PieceKind[];
  capturedByBlack: PieceKind[];
  whitePoints: number;
  blackPoints: number;
};

type EngineWsMessage =
  | { type: "ready"; message: string; models: ServedModel[]; defaultModelId?: string }
  | { type: "models"; models: ServedModel[]; defaultModelId?: string }
  | { type: "pong" }
  | { type: "engineMove"; bestmove: string; modelId?: string; requestId?: string }
  | { type: "error"; error: string; requestId?: string };

type WorkerRequest =
  | { id: string; type: "getState" }
  | { id: string; type: "reset" }
  | { id: string; type: "importPgn"; pgn: string }
  | { id: string; type: "previewPgn"; pgn: string }
  | { id: string; type: "exportPgn" }
  | { id: string; type: "getTimeline" }
  | { id: string; type: "setFen"; fen: string }
  | { id: string; type: "editMove"; from: Square; to: Square }
  | { id: string; type: "deletePiece"; square: Square }
  | { id: string; type: "putPiece"; square: Square; piece: PieceCode }
  | { id: string; type: "setTurn"; turn: Side }
  | { id: string; type: "legalMoves"; from: Square }
  | { id: string; type: "move"; from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" };

type WorkerResponse =
  | {
      id: string;
      ok: true;
      state: Snapshot;
      legalTargets?: Square[];
      legalSafety?: Partial<Record<Square, { attacked: boolean; defended: boolean }>>;
      timeline?: TimelineEntry[];
    }
  | {
      id: string;
      ok: false;
      error: string;
    };

type LegalSafety = { attacked: boolean; defended: boolean };
type TrainingMode = string;
type TemperatureMode = "optimal" | "argmax" | "focused" | "human" | "loose";
type Opening = { eco: string; name: string };
type MoveLabelId =
  | "book"
  | "best"
  | "excellent"
  | "great"
  | "brilliant"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder"
  | "forced";
type MoveLabel = {
  id: MoveLabelId;
  text: string;
  symbol: string;
  title: string;
};
type ScenarioVariant = {
  id: string;
  label: string;
  detail: string;
  playerSide?: Side;
  setup: {
    pgn?: string;
    fen?: string;
  };
  temperature: {
    mode: TemperatureMode;
  };
  solution?: {
    moves: string[];
    explanation: string;
    pgn: string;
  };
};
type TrainingScenario = {
  id: TrainingMode;
  title: string;
  description: string;
  category: string;
  variants: ScenarioVariant[];
};

const openings = openingData as Record<string, Opening>;
const BROWSER_STOCKFISH_ID = "browser-stockfish-lite";
const browserStockfishModel: ServedModel = {
  id: BROWSER_STOCKFISH_ID,
  name: "Browser Stockfish Lite",
  path: "browser",
};

function openingPositionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

const trainingModes = scenarioData as TrainingScenario[];

const temperatureOptions: Array<{ id: TemperatureMode; label: string }> = [
  { id: "optimal", label: "Optimal · 0 after move 3" },
  { id: "argmax", label: "Argmax · 0" },
  { id: "focused", label: "Focused · 0.35" },
  { id: "human", label: "Human-like · 0.8" },
  { id: "loose", label: "Loose · 1.0" },
];

function requestTemperature(mode: TemperatureMode, fen: string): number {
  if (mode === "argmax") return 0;
  if (mode === "focused") return 0.35;
  if (mode === "human") return 0.8;
  if (mode === "loose") return 1;

  const fullmove = Number(fen.split(" ")[5] ?? 1);
  return fullmove > 3 ? 0 : 0.8;
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

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function controllerLabel(controller: PlayerController, modelById: Map<string, ServedModel>) {
  if (controller === "human") {
    return "Human";
  }
  return modelById.get(controller)?.name ?? controller;
}

const startingPieces: Record<PieceKind, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const pieceValues: Record<PieceKind, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const pieceOrder: PieceKind[] = ["q", "r", "b", "n", "p"];
const editorPieces: Array<{ code: PieceCode; glyph: string; name: string }> = [
  { code: "wk", glyph: "♔", name: "White king" },
  { code: "wq", glyph: "♕", name: "White queen" },
  { code: "wr", glyph: "♖", name: "White rook" },
  { code: "wb", glyph: "♗", name: "White bishop" },
  { code: "wn", glyph: "♘", name: "White knight" },
  { code: "wp", glyph: "♙", name: "White pawn" },
  { code: "bk", glyph: "♚", name: "Black king" },
  { code: "bq", glyph: "♛", name: "Black queen" },
  { code: "br", glyph: "♜", name: "Black rook" },
  { code: "bb", glyph: "♝", name: "Black bishop" },
  { code: "bn", glyph: "♞", name: "Black knight" },
  { code: "bp", glyph: "♟", name: "Black pawn" },
];
const groundRoles: Record<PieceCode[1], GroundPiece["role"]> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

function groundPiece(code: PieceCode): GroundPiece {
  return {
    color: code[0] === "w" ? "white" : "black",
    role: groundRoles[code[1]],
  };
}

function materialSummary(board: BoardState | undefined): MaterialSummary {
  const remaining: Record<Side, Record<PieceKind, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  for (const rank of board ?? []) {
    for (const piece of rank) {
      if (!piece || piece[1] === "k") {
        continue;
      }
      remaining[piece[0] as Side][piece[1] as PieceKind] += 1;
    }
  }

  const capturedByWhite: PieceKind[] = [];
  const capturedByBlack: PieceKind[] = [];
  for (const kind of pieceOrder) {
    for (let count = remaining.b[kind]; count < startingPieces[kind]; count += 1) {
      capturedByWhite.push(kind);
    }
    for (let count = remaining.w[kind]; count < startingPieces[kind]; count += 1) {
      capturedByBlack.push(kind);
    }
  }

  const whitePoints = capturedByWhite.reduce((sum, kind) => sum + pieceValues[kind], 0);
  const blackPoints = capturedByBlack.reduce((sum, kind) => sum + pieceValues[kind], 0);
  return { capturedByWhite, capturedByBlack, whitePoints, blackPoints };
}

function hasBothKings(board: BoardState | undefined): boolean {
  let whiteKings = 0;
  let blackKings = 0;
  for (const rank of board ?? []) {
    for (const piece of rank) {
      if (piece === "wk") whiteKings += 1;
      if (piece === "bk") blackKings += 1;
    }
  }
  return whiteKings === 1 && blackKings === 1;
}

const allSquares: Square[] = files.flatMap((file) => ranks.map((rank) => `${file}${rank}` as Square));
const ENGINE_DELAY_MIN_MS = 350;
const ENGINE_DELAY_MAX_MS = 1100;
const EVAL_DEPTH = 7;
const MOVE_DEPTH = 6;
const MOVE_LABEL_DEPTH = 7;
const MOVE_LABELS: Record<MoveLabelId, MoveLabel> = {
  book: {
    id: "book",
    text: "Book",
    symbol: "📖",
    title: "Recognized opening database move.",
  },
  best: {
    id: "best",
    text: "Best",
    symbol: "⭐",
    title: "Matches the strongest Stockfish move.",
  },
  excellent: {
    id: "excellent",
    text: "Excellent",
    symbol: "✅",
    title: "Very close to the engine's best move.",
  },
  great: {
    id: "great",
    text: "Great",
    symbol: "❗",
    title: "A critical move that preserves a strong position.",
  },
  brilliant: {
    id: "brilliant",
    text: "Brilliant",
    symbol: "💎",
    title: "A strong apparent sacrifice that remains objectively sound.",
  },
  good: {
    id: "good",
    text: "Good",
    symbol: "👍",
    title: "Keeps the position playable with moderate evaluation loss.",
  },
  inaccuracy: {
    id: "inaccuracy",
    text: "Inaccuracy",
    symbol: "🤔",
    title: "Slightly worsens the position.",
  },
  mistake: {
    id: "mistake",
    text: "Mistake",
    symbol: "⚠️",
    title: "Clearly worsens the position.",
  },
  miss: {
    id: "miss",
    text: "Miss",
    symbol: "👀",
    title: "Missed a much stronger continuation.",
  },
  blunder: {
    id: "blunder",
    text: "Blunder",
    symbol: "❌",
    title: "Loses a large amount of evaluation.",
  },
  forced: {
    id: "forced",
    text: "Forced",
    symbol: "🔒",
    title: "Only one legal move was available.",
  },
};

function isBrowserStockfish(controller: PlayerController) {
  return controller === BROWSER_STOCKFISH_ID;
}

function modelWebsocketUrl() {
  const configured = process.env.NEXT_PUBLIC_MODEL_WS_URL?.trim();
  if (configured) {
    if (configured.startsWith("ws://") || configured.startsWith("wss://")) {
      return configured;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const path = configured.startsWith("/") ? configured : `/${configured}`;
    return `${protocol}//${window.location.host}${path}`;
  }

  const host = window.location.hostname || "localhost";
  return `ws://${host}:8787`;
}

function formatEval(result: StockfishResult | null, isThinking: boolean) {
  if (!result) return isThinking ? "..." : "0.00";
  if (result.mate !== null) {
    return result.mate > 0 ? `M${result.mate}` : `-M${Math.abs(result.mate)}`;
  }
  return `${((result.scoreCp ?? 0) / 100).toFixed(2)}`;
}

function evalWhitePercent(result: StockfishResult | null) {
  if (!result) return 50;
  if (result.mate !== null) return result.mate > 0 ? 96 : 4;
  const score = Math.max(-1200, Math.min(1200, result.scoreCp ?? 0));
  return 50 + (score / 1200) * 46;
}

function stockfishValueForSide(result: StockfishResult | null | undefined, side: Side): number {
  if (!result) return 0;
  const perspective = side === "w" ? 1 : -1;
  if (result.mate !== null) {
    return perspective * Math.sign(result.mate) * (100000 - Math.min(Math.abs(result.mate), 100));
  }
  return perspective * (result.scoreCp ?? 0);
}

function mateForSide(result: StockfishResult | null | undefined, side: Side): number | null {
  if (!result || result.mate === null) return null;
  return side === "w" ? result.mate : -result.mate;
}

function legalMoveCount(fen: string): number {
  try {
    return new Chess(fen).moves().length;
  } catch {
    return 0;
  }
}

function isOpeningBookMove(afterFen: string, ply: number): boolean {
  return ply <= 24 && Boolean(openings[openingPositionKey(afterFen)]);
}

function isApparentSacrifice(beforeFen: string, uci: string): boolean {
  try {
    const game = new Chess(beforeFen);
    const movingColor = game.turn();
    const move = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    if (!move || move.piece === "p" || move.piece === "k") return false;
    const movedValue = pieceValues[move.piece as PieceKind] ?? 0;
    const capturedValue = move.captured ? pieceValues[move.captured as PieceKind] ?? 0 : 0;
    if (movedValue <= capturedValue) return false;

    return game.moves({ verbose: true }).some((reply) => {
      if (reply.to !== move.to || !reply.captured) return false;
      const replyGame = new Chess(game.fen());
      replyGame.move({
        from: reply.from,
        to: reply.to,
        promotion: reply.promotion as "q" | "r" | "b" | "n" | undefined,
      });
      const recaptureExists = replyGame.moves({ verbose: true }).some((recapture) => {
        if (recapture.to !== move.to || !recapture.captured) return false;
        const piece = replyGame.get(recapture.from);
        return piece?.color === movingColor;
      });
      return !recaptureExists;
    });
  } catch {
    return false;
  }
}

function hangsMovedPieceForFree(beforeFen: string, uci: string): { value: number; withCheck: boolean } | null {
  try {
    const game = new Chess(beforeFen);
    const movingColor = game.turn();
    const move = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    if (!move || move.piece === "p" || move.piece === "k") return null;
    const movedValue = pieceValues[move.piece as PieceKind] ?? 0;

    for (const reply of game.moves({ verbose: true })) {
      if (reply.to !== move.to || !reply.captured) continue;
      const replyGame = new Chess(game.fen());
      replyGame.move({
        from: reply.from,
        to: reply.to,
        promotion: reply.promotion as "q" | "r" | "b" | "n" | undefined,
      });
      const recaptureExists = replyGame.moves({ verbose: true }).some((recapture) => {
        if (recapture.to !== move.to || !recapture.captured) return false;
        const piece = replyGame.get(recapture.from);
        return piece?.color === movingColor;
      });
      if (!recaptureExists) {
        return { value: movedValue, withCheck: replyGame.isCheck() };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function classifyMoveLabel({
  before,
  after,
  beforeEval,
  afterEval,
}: {
  before: TimelineEntry;
  after: TimelineEntry;
  beforeEval: StockfishResult;
  afterEval: StockfishResult;
}): MoveLabel {
  const uci = after.uci;
  if (!uci) return MOVE_LABELS.good;
  if (isOpeningBookMove(after.state.fen, after.ply)) return MOVE_LABELS.book;
  if (legalMoveCount(before.state.fen) <= 1) return MOVE_LABELS.forced;

  const mover = before.state.turn;
  const beforeValue = stockfishValueForSide(beforeEval, mover);
  const afterValue = stockfishValueForSide(afterEval, mover);
  const afterMate = mateForSide(afterEval, mover);
  if (afterMate !== null && afterMate < 0) {
    return Math.abs(afterMate) <= 5 ? MOVE_LABELS.blunder : MOVE_LABELS.inaccuracy;
  }
  const loss = Math.max(0, beforeValue - afterValue);
  const isBestMove = beforeEval.bestmove === uci;
  const freePiece = hangsMovedPieceForFree(before.state.fen, uci);

  if (isBestMove && isApparentSacrifice(before.state.fen, uci) && afterValue >= 120) {
    return MOVE_LABELS.brilliant;
  }
  if (isBestMove) {
    const improvement = afterValue - beforeValue;
    return improvement >= 150 && afterValue >= 180 && legalMoveCount(before.state.fen) > 2
      ? MOVE_LABELS.great
      : MOVE_LABELS.best;
  }
  if (freePiece && freePiece.value >= 5 && (freePiece.withCheck || loss >= 100)) return MOVE_LABELS.blunder;
  if (loss <= 15) return MOVE_LABELS.excellent;
  if (loss <= 50) return MOVE_LABELS.good;
  if (loss <= 120) return MOVE_LABELS.inaccuracy;
  if (beforeValue >= 180 && loss >= 120 && loss <= 300) return MOVE_LABELS.miss;
  if (loss <= 250) return MOVE_LABELS.mistake;
  return MOVE_LABELS.blunder;
}

export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ scenarioId: string }>();
  const searchParams = useSearchParams();
  const routeScenarioId = params.scenarioId;
  const routeVariantId = searchParams.get("variant") ?? undefined;
  const routeScenario =
    trainingModes.find((scenario) => scenario.id === routeScenarioId) ?? trainingModes[0];
  const routeVariant =
    routeScenario.variants.find((variant) => variant.id === routeVariantId) ??
    routeScenario.variants[0];
  const [activeMode, setActiveMode] = useState<TrainingMode>(routeScenario.id);
  const [activeVariantId, setActiveVariantId] = useState(routeVariant.id);
  const [isSolutionMode, setIsSolutionMode] = useState(false);
  const [state, setState] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<Square>>(new Set());
  const [legalSafety, setLegalSafety] = useState<Partial<Record<Square, LegalSafety>>>({});
  const [error, setError] = useState<string | null>(null);
  const [showControlOverlay, setShowControlOverlay] = useState(false);
  const [showMoveSafetyHints, setShowMoveSafetyHints] = useState(false);
  const [showMoveQualityLabels, setShowMoveQualityLabels] = useState(true);
  const [showOccupiedOnly, setShowOccupiedOnly] = useState(false);
  const [showOwnOccupiedOnly, setShowOwnOccupiedOnly] = useState(false);
  const [overlaySide, setOverlaySide] = useState<"both" | "w" | "b">("both");
  const [isFlipped, setIsFlipped] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [modeStartPly, setModeStartPly] = useState(0);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [engineStatus, setEngineStatus] = useState<"disconnected" | "connecting" | "connected">("connecting");
  const [engineThinking, setEngineThinking] = useState(false);
  const [models, setModels] = useState<ServedModel[]>([]);
  const [whiteController, setWhiteController] = useState<PlayerController>("human");
  const [blackController, setBlackController] = useState<PlayerController>("human");
  const [autoPlayModels, setAutoPlayModels] = useState(true);
  const [temperatureMode, setTemperatureMode] = useState<TemperatureMode>("optimal");
  const [positionEditor, setPositionEditor] = useState(false);
  const [showEvalBar, setShowEvalBar] = useState(false);
  const [evalResult, setEvalResult] = useState<StockfishResult | null>(null);
  const [evalThinking, setEvalThinking] = useState(false);
  const [moveLabels, setMoveLabels] = useState<Record<number, MoveLabel>>({});
  const [moveEvalCache, setMoveEvalCache] = useState<Record<string, StockfishResult>>({});
  const [visibleBoardMoveLabelPly, setVisibleBoardMoveLabelPly] = useState<number | null>(null);
  const [dismissedCheckmateFen, setDismissedCheckmateFen] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, (result: WorkerResponse) => void>());
  const boardElRef = useRef<HTMLDivElement | null>(null);
  const moveHistoryRef = useRef<HTMLDivElement | null>(null);
  const groundRef = useRef<Api | null>(null);
  const engineWsRef = useRef<WebSocket | null>(null);
  const applyingEngineMoveRef = useRef(false);
  const moveInFlightRef = useRef<string | null>(null);
  const activeStateRef = useRef<Snapshot | null>(null);
  const isReviewingRef = useRef(false);
  const pendingEngineRequestRef = useRef<{ id: string; fen: string } | null>(null);
  const activeModeRef = useRef<TrainingMode>("sandbox");
  const activeVariantIdRef = useRef("standard");
  const temperatureModeRef = useRef<TemperatureMode>("optimal");
  const requestMoveRef = useRef<(from: Square, to: Square) => Promise<boolean>>(
    async () => false,
  );
  const moveHandlerRef = useRef<(orig: Square, dest: Square) => void>(() => {});
  const selectHandlerRef = useRef<(square: Square) => void>(() => {});
  const newPieceHandlerRef = useRef<(square: Square) => void>(() => {});
  const draggedEditorPieceRef = useRef<PieceCode | null>(null);
  const solutionReturnRef = useRef<{ timeline: TimelineEntry[]; currentPly: number } | null>(null);
  const routeStartedRef = useRef(false);
  const startTrainingModeRef = useRef<
    (mode: TrainingMode, preserveControllers?: boolean, requestedVariantId?: string) => Promise<void>
  >(async () => {});
  const browserMoveEngineRef = useRef<BrowserStockfish | null>(null);
  const browserEvalEngineRef = useRef<BrowserStockfish | null>(null);
  const browserMoveLabelEngineRef = useRef<BrowserStockfish | null>(null);

  useEffect(() => {
    activeModeRef.current = activeMode;
    activeVariantIdRef.current = activeVariantId;
  }, [activeMode, activeVariantId]);

  useEffect(() => {
    temperatureModeRef.current = temperatureMode;
  }, [temperatureMode]);

  useEffect(() => {
    return () => {
      browserMoveEngineRef.current?.terminate();
      browserEvalEngineRef.current?.terminate();
      browserMoveLabelEngineRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("../../../workers/chessWorker.ts?v=3", import.meta.url));
    const pending = pendingRef.current;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const resolver = pending.get(response.id);
      if (!resolver) {
        return;
      }
      pending.delete(response.id);
      resolver(response);
    };

    workerRef.current = worker;

    void runWorker({ id: requestId(), type: "getState" }).then((response) => {
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setState(response.state);
      setTimeline([{ ply: 0, san: null, uci: null, state: response.state }]);
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  useEffect(() => {
    routeStartedRef.current = false;
  }, [routeScenarioId, routeVariantId]);

  const lastPly = Math.max(0, (timeline?.length ?? 1) - 1);
  const isReviewing = Boolean(timeline && currentPly < lastPly);
  const activeState =
    isSolutionMode || isReviewing ? timeline?.[currentPly]?.state ?? state : state;
  const availableModels = useMemo(() => [browserStockfishModel, ...models], [models]);
  const modelById = useMemo(
    () => new Map(availableModels.map((model) => [model.id, model])),
    [availableModels],
  );
  const whiteLabel = controllerLabel(whiteController, modelById);
  const blackLabel = controllerLabel(blackController, modelById);
  const material = useMemo(() => materialSummary(activeState?.board), [activeState?.board]);
  const whiteMaterialAdvantage = material.whitePoints - material.blackPoints;
  const evalBarWhite = activeState?.isCheckmate
    ? activeState.turn === "w" ? 4 : 96
    : activeState?.isDraw
      ? 50
      : evalWhitePercent(evalResult);
  const evalLabel = activeState?.isCheckmate
    ? activeState.turn === "w" ? "-M0" : "M0"
    : activeState?.isDraw
      ? "0.00"
      : formatEval(evalResult, evalThinking);
  const evalBarActive = showEvalBar && !activeState?.isDraw;
  const evalTopSide: Side = isFlipped ? "w" : "b";
  const evalBottomSide: Side = isFlipped ? "b" : "w";
  const evalTopHeight = evalTopSide === "w" ? evalBarWhite : 100 - evalBarWhite;
  const evalBottomHeight = 100 - evalTopHeight;
  const appGridClass =
    "lg:grid-cols-[210px_minmax(0,min(820px,calc(100vh-118px)))_36px_minmax(300px,0.9fr)]";
  const topPlayer = isFlipped
    ? { side: "White", color: "w" as const, label: whiteLabel }
    : { side: "Black", color: "b" as const, label: blackLabel };
  const bottomPlayer = isFlipped
    ? { side: "Black", color: "b" as const, label: blackLabel }
    : { side: "White", color: "w" as const, label: whiteLabel };
  const activeController = activeState?.turn === "w" ? whiteController : blackController;
  const activeScenario = trainingModes.find((scenario) => scenario.id === activeMode);
  const activeVariant =
    activeScenario?.variants.find((variant) => variant.id === activeVariantId) ??
    activeScenario?.variants[0];
  const displayedMove = timeline?.[currentPly] ?? null;
  const displayedMoveLabel =
    showMoveQualityLabels && visibleBoardMoveLabelPly === currentPly && currentPly > 0
      ? moveLabels[currentPly]
      : undefined;
  const displayedMoveSquare = displayedMove?.uci ? (displayedMove.uci.slice(2, 4) as Square) : null;
  const showCheckmateOverlay =
    Boolean(activeState?.isCheckmate) && dismissedCheckmateFen !== activeState?.fen;
  const canRequestModelMove =
    Boolean(activeState) &&
    !isReviewing &&
    !isIntroPlaying &&
    !isSolutionMode &&
    !positionEditor &&
    !activeState?.isCheckmate &&
    !activeState?.isDraw &&
    activeController !== "human" &&
    (isBrowserStockfish(activeController ?? "human") || engineStatus === "connected") &&
    !engineThinking;

  useEffect(() => {
    startTrainingModeRef.current = startTrainingMode;
  });

  useEffect(() => {
    if (!state || routeStartedRef.current) return;
    const scenario = trainingModes.find((item) => item.id === routeScenarioId);
    if (!scenario) {
      router.replace("/");
      return;
    }
    routeStartedRef.current = true;
    void startTrainingModeRef.current(routeScenarioId, false, routeVariantId);
  }, [routeScenarioId, routeVariantId, router, state]);

  function dismissCheckmateOverlay() {
    if (!showCheckmateOverlay || !activeState?.fen) return;
    setDismissedCheckmateFen(activeState.fen);
  }

  useEffect(() => {
    activeStateRef.current = activeState;
    isReviewingRef.current = isReviewing;
  }, [activeState, isReviewing]);

  useEffect(() => {
    if (!activeState?.isCheckmate && dismissedCheckmateFen !== null) {
      const timer = window.setTimeout(() => setDismissedCheckmateFen(null), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeState?.isCheckmate, dismissedCheckmateFen]);

  useEffect(() => {
    if (!isIntroPlaying || !timeline) return;
    if (currentPly >= timeline.length - 1) {
      const finishTimer = window.setTimeout(() => setIsIntroPlaying(false), 0);
      return () => window.clearTimeout(finishTimer);
    }
    const timer = window.setTimeout(() => {
      setCurrentPly((ply) => Math.min(ply + 1, timeline.length - 1));
    }, 260);
    return () => window.clearTimeout(timer);
  }, [currentPly, isIntroPlaying, timeline]);

  const scheduleEngineMove = useCallback((bestmove: string | null, pending: { id: string; fen: string }) => {
    if (!bestmove || bestmove.length < 4) {
      pendingEngineRequestRef.current = null;
      setEngineThinking(false);
      return;
    }
    const from = bestmove.slice(0, 2) as Square;
    const to = bestmove.slice(2, 4) as Square;
    applyingEngineMoveRef.current = true;
    const delayMs = Math.floor(
      ENGINE_DELAY_MIN_MS + Math.random() * (ENGINE_DELAY_MAX_MS - ENGINE_DELAY_MIN_MS + 1),
    );
    window.setTimeout(() => {
      const latest = activeStateRef.current;
      if (
        pendingEngineRequestRef.current?.id !== pending.id ||
        !latest ||
        latest.fen !== pending.fen ||
        latest.isCheckmate ||
        latest.isDraw ||
        isReviewingRef.current
      ) {
        pendingEngineRequestRef.current = null;
        applyingEngineMoveRef.current = false;
        setEngineThinking(false);
        return;
      }
      pendingEngineRequestRef.current = null;
      setEngineThinking(false);
      void requestMoveRef.current(from, to).finally(() => {
        applyingEngineMoveRef.current = false;
      });
    }, delayMs);
  }, []);

  const requestCurrentModelMove = useCallback((stateOverride?: Snapshot | null) => {
    const current = stateOverride ?? activeState;
    if (!current || current.isCheckmate || current.isDraw || isReviewing || isIntroPlaying || isSolutionMode || positionEditor) {
      return false;
    }
    const controller = current.turn === "w" ? whiteController : blackController;
    if (controller === "human") {
      return false;
    }
    const engineRequestId = requestId();
    pendingEngineRequestRef.current = { id: engineRequestId, fen: current.fen };
    setEngineThinking(true);

    if (isBrowserStockfish(controller)) {
      const browserEngine = browserMoveEngineRef.current ?? new BrowserStockfish();
      browserMoveEngineRef.current = browserEngine;
      browserEngine
        .analyze(current.fen, { depth: MOVE_DEPTH })
        .then((result) => {
          const pending = pendingEngineRequestRef.current;
          if (!pending || pending.id !== engineRequestId) return;
          scheduleEngineMove(result.bestmove, pending);
        })
        .catch((reason: unknown) => {
          pendingEngineRequestRef.current = null;
          setEngineThinking(false);
          setError(reason instanceof Error ? reason.message : "Browser Stockfish failed.");
        });
      return true;
    }

    const ws = engineWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingEngineRequestRef.current = null;
      setEngineThinking(false);
      setError("Model runner is not connected.");
      return false;
    }
    ws.send(
      JSON.stringify({
        type: "engineMove",
        fen: current.fen,
        modelId: controller,
        requestId: engineRequestId,
        temperature: requestTemperature(temperatureModeRef.current, current.fen),
      }),
    );
    return true;
  }, [activeState, blackController, isIntroPlaying, isReviewing, isSolutionMode, positionEditor, scheduleEngineMove, whiteController]);

  function swapPlayerColors() {
    setWhiteController(blackController);
    setBlackController(whiteController);
  }

  useEffect(() => {
    const ws = new WebSocket(modelWebsocketUrl());
    engineWsRef.current = ws;

    ws.onopen = () => {
      setEngineStatus("connected");
    };

    ws.onclose = () => {
      setEngineStatus("disconnected");
      setEngineThinking(false);
      if (engineWsRef.current === ws) {
        engineWsRef.current = null;
      }
    };

    ws.onerror = () => {
      setEngineStatus("disconnected");
      setEngineThinking(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as EngineWsMessage;
        if (msg.type === "ready" || msg.type === "models") {
          const availableModels = Array.isArray(msg.models) ? msg.models : [];
          setModels(availableModels);
          const fallback = msg.defaultModelId ?? availableModels[0]?.id;
          if (activeModeRef.current === "sandbox") {
            setBlackController((value) => (value === "human" && fallback ? fallback : value));
          } else {
            const activeScenario = trainingModes.find((mode) => mode.id === activeModeRef.current);
            const playerSide = activeScenario?.variants.find(
              (variant) => variant.id === activeVariantIdRef.current,
            )?.playerSide;
            if (playerSide === "w") {
              setWhiteController("human");
              setBlackController((value) => (value === "human" && fallback ? fallback : value));
            } else {
              setWhiteController((value) => (value === "human" && fallback ? fallback : value));
              setBlackController("human");
            }
          }
          return;
        }
        if (msg.type === "engineMove") {
          const pending = pendingEngineRequestRef.current;
          if (!pending || msg.requestId !== pending.id) {
            return;
          }
          scheduleEngineMove(msg.bestmove, pending);
          return;
        }
        if (msg.type === "error") {
          setError(`Engine error: ${msg.error}`);
          pendingEngineRequestRef.current = null;
          setEngineThinking(false);
        }
      } catch {
        setError("Engine websocket message parse error.");
      }
    };

    return () => {
      ws.close();
    };
  }, [scheduleEngineMove]);

  useEffect(() => {
    if (!boardElRef.current || groundRef.current) {
      return;
    }

    const config: Config = {
      orientation: "white",
      turnColor: "white",
      movable: {
        free: false,
        color: "both",
        dests: new Map<Key, Key[]>(),
        events: {
          after: (orig, dest) => {
            moveHandlerRef.current(orig as Square, dest as Square);
          },
          afterNewPiece: (_role, key) => {
            newPieceHandlerRef.current(key as Square);
          },
        },
      },
      events: {
        select: (key) => {
          selectHandlerRef.current(key as Square);
        },
      },
    };

    groundRef.current = Chessground(boardElRef.current, config);
    return () => {
      groundRef.current?.destroy();
      groundRef.current = null;
    };
  }, []);

  const status = useMemo(() => {
    if (!activeState) {
      return "Loading board...";
    }
    if (activeState.isCheckmate) {
      return `Checkmate. ${activeState.turn === "w" ? "Black" : "White"} wins.`;
    }
    if (activeState.isDraw) {
      return "Draw.";
    }
    return `${activeState.turn === "w" ? "White" : "Black"} to move${activeState.isCheck ? " (check)" : ""}.`;
  }, [activeState]);

  const moveRows = useMemo(() => {
    if (!timeline) {
      return [];
    }

    const rows: Array<{ moveNumber: number; white: string; black: string; whitePly: number; blackPly: number | null }> = [];
    for (let ply = 1; ply < timeline.length; ply += 2) {
      rows.push({
        moveNumber: Math.ceil(ply / 2),
        white: timeline[ply]?.san ?? "",
        black: timeline[ply + 1]?.san ?? "",
        whitePly: ply,
        blackPly: timeline[ply + 1] ? ply + 1 : null,
      });
    }
    return rows;
  }, [timeline]);

  const currentOpening = useMemo(() => {
    if (!timeline) return null;
    const viewedPly = isReviewing ? currentPly : lastPly;
    for (let ply = viewedPly; ply >= 0; ply -= 1) {
      const opening = openings[openingPositionKey(timeline[ply].state.fen)];
      if (opening) return opening;
    }
    return null;
  }, [currentPly, isReviewing, lastPly, timeline]);
  const timelineSignature = useMemo(
    () => timeline?.map((entry) => entry.state.fen).join("|") ?? "",
    [timeline],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMoveLabels((current) => {
        const next: Record<number, MoveLabel> = {};
        for (const [ply, label] of Object.entries(current)) {
          const index = Number(ply);
          if (index <= lastPly) next[index] = label;
        }
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [lastPly, timelineSignature]);

  useEffect(() => {
    if (isReviewing || isSolutionMode) return;
    const timer = window.setTimeout(() => {
      const element = moveHistoryRef.current;
      if (!element) return;
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReviewing, isSolutionMode, lastPly]);

  useEffect(() => {
    if (!showMoveQualityLabels || currentPly <= 0 || !moveLabels[currentPly] || positionEditor) {
      const timer = window.setTimeout(() => setVisibleBoardMoveLabelPly(null), 0);
      return () => window.clearTimeout(timer);
    }

    const showTimer = window.setTimeout(() => setVisibleBoardMoveLabelPly(currentPly), 0);
    const timer = window.setTimeout(() => {
      setVisibleBoardMoveLabelPly((ply) => (ply === currentPly ? null : ply));
    }, 1300);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(timer);
    };
  }, [currentPly, moveLabels, positionEditor, showMoveQualityLabels]);

  function runWorker(request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve({ id: request.id, ok: false, error: "Worker unavailable." });
        return;
      }
      pendingRef.current.set(request.id, resolve);
      worker.postMessage(request);
    });
  }

  async function ensureWorkerAtActiveState() {
    if (!activeState) {
      return false;
    }
    if (state?.fen === activeState.fen) {
      return true;
    }
    const response = await runWorker({ id: requestId(), type: "setFen", fen: activeState.fen });
    if (!response.ok) {
      setError(response.error);
      return false;
    }
    setState(response.state);
    return true;
  }

  const pieceAt = useCallback((square: Square): PieceCode | null => {
    if (!activeState) {
      return null;
    }
    const fileIndex = files.indexOf(square[0] as (typeof files)[number]);
    const rankIndex = ranks.indexOf(square[1] as (typeof ranks)[number]);
    if (fileIndex < 0 || rankIndex < 0) {
      return null;
    }
    return activeState.board[rankIndex]?.[fileIndex] ?? null;
  }, [activeState]);

  const overlayClass = useCallback((square: Square): string => {
    if (selected) {
      if (!legalTargets.has(square)) {
        return "";
      }
      return "";
    }

    if (!activeState || !showControlOverlay) {
      return "";
    }
    const info = activeState.attackMap[square];
    if (!info || (showOccupiedOnly && !info.occupied)) {
      return "";
    }
    const piece = pieceAt(square);
    if (showOwnOccupiedOnly) {
      if (!piece) {
        return "";
      }
      if (overlaySide === "both") {
        return "";
      }
      if (piece[0] !== overlaySide) {
        return "";
      }
    }

    const white = info.w;
    const black = info.b;

    if (piece) {
      const defenders = piece[0] === "w" ? white : black;
      const attackers = piece[0] === "w" ? black : white;

      if (overlaySide === "w" && piece[0] !== "w") {
        return "";
      }
      if (overlaySide === "b" && piece[0] !== "b") {
        return "";
      }

      if (attackers && defenders) return "cg-contested";
      if (attackers) return "cg-danger";
      if (defenders) return "cg-safe";
      return "";
    }

    if (overlaySide === "w") {
      return white ? "cg-safe" : "";
    }
    if (overlaySide === "b") {
      return black ? "cg-danger" : "";
    }

    if (white && black) return "cg-contested";
    if (white) return "cg-safe";
    if (black) return "cg-danger";
    return "";
  }, [
    activeState,
    legalTargets,
    overlaySide,
    pieceAt,
    selected,
    showControlOverlay,
    showOccupiedOnly,
    showOwnOccupiedOnly,
  ]);

  useEffect(() => {
    const ground = groundRef.current;
    if (!ground || !activeState) {
      return;
    }

    const custom = new Map<Key, string>();
    for (const square of allSquares) {
      const cls = overlayClass(square);
      if (cls) {
        custom.set(square as Key, cls);
      }
    }

    const dests = new Map<Key, Key[]>();
    if (selected && legalTargets.size > 0) {
      dests.set(selected as Key, Array.from(legalTargets) as Key[]);
    }

    ground.set({
      fen: activeState.fen,
      orientation: isFlipped ? "black" : "white",
      turnColor: activeState.turn === "w" ? "white" : "black",
      check:
        !positionEditor && activeState.isCheck
          ? (activeState.turn === "w" ? "white" : "black")
          : false,
      selected: selected ?? undefined,
      movable: {
        free: positionEditor,
        color:
          positionEditor
            ? "both"
            : !isIntroPlaying && !isSolutionMode && (isReviewing || activeController === "human")
            ? (activeState.turn === "w" ? "white" : "black")
            : undefined,
        dests: positionEditor ? undefined : dests,
      },
      highlight: {
        custom,
      },
    });
  }, [activeController, activeState, isFlipped, isIntroPlaying, isReviewing, isSolutionMode, legalTargets, selected, legalSafety, overlaySide, overlayClass, positionEditor, showControlOverlay, showOccupiedOnly, showOwnOccupiedOnly]);

  async function requestLegalTargets(from: Square) {
    const synced = await ensureWorkerAtActiveState();
    if (!synced) return;

    const response = await runWorker({ id: requestId(), type: "legalMoves", from });
    if (!response.ok) {
      setError(response.error);
      return;
    }

    setState(response.state);
    setLegalTargets(new Set(response.legalTargets ?? []));
    setLegalSafety(response.legalSafety ?? {});
  }

  function applyEditedState(nextState: Snapshot) {
    setState(nextState);
    setTimeline([{ ply: 0, san: null, uci: null, state: nextState }]);
    setCurrentPly(0);
    setModeStartPly(0);
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
    setError(null);
  }

  async function editPieceMove(from: Square, to: Square) {
    const response = await runWorker({ id: requestId(), type: "editMove", from, to });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    applyEditedState(response.state);
  }

  async function deleteSelectedPiece() {
    if (!selected) return;
    const response = await runWorker({ id: requestId(), type: "deletePiece", square: selected });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    applyEditedState(response.state);
  }

  async function putEditorPiece(square: Square, piece: PieceCode) {
    const response = await runWorker({ id: requestId(), type: "putPiece", square, piece });
    if (!response.ok) {
      if (activeState) {
        groundRef.current?.set({ fen: activeState.fen });
      }
      setError(response.error);
      return;
    }
    applyEditedState(response.state);
  }

  function startEditorPieceDrag(piece: PieceCode, event: MouseEvent | TouchEvent) {
    if (!positionEditor || !groundRef.current) return;
    draggedEditorPieceRef.current = piece;
    groundRef.current.dragNewPiece(groundPiece(piece), event, true);
  }

  async function changeEditorTurn(turn: Side) {
    const response = await runWorker({ id: requestId(), type: "setTurn", turn });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    applyEditedState(response.state);
  }

  function togglePositionEditor(enabled: boolean) {
    if (!enabled && !hasBothKings(state?.board)) {
      setError("A playable position must contain one white king and one black king.");
      return;
    }
    pendingEngineRequestRef.current = null;
    setEngineThinking(false);
    setPositionEditor(enabled);
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
    setAutoPlayModels(enabled ? false : autoPlayModels);
    setError(null);
  }

  async function requestMove(from: Square, to: Square) {
    const moveKey = `${activeState?.fen}:${from}:${to}`;
    if (moveInFlightRef.current === moveKey) return false;
    moveInFlightRef.current = moveKey;

    let synced = false;
    if (isReviewing && timeline) {
      const reviewedState = timeline[currentPly].state;
      const branchResponse = currentPly === 0
        ? await runWorker({ id: requestId(), type: "reset" })
        : await runWorker({ id: requestId(), type: "importPgn", pgn: reviewedState.pgn });
      if (!branchResponse.ok) {
        moveInFlightRef.current = null;
        setError(branchResponse.error);
        return false;
      }
      synced = true;
    } else {
      synced = await ensureWorkerAtActiveState();
    }
    if (!synced) {
      moveInFlightRef.current = null;
      return false;
    }

    const movingPiece = pieceAt(from);
    const isPromotion =
      movingPiece?.[1] === "p" &&
      ((movingPiece[0] === "w" && to[1] === "8") || (movingPiece[0] === "b" && to[1] === "1"));
    const response = await runWorker({
      id: requestId(),
      type: "move",
      from,
      to,
      ...(isPromotion ? { promotion: "q" as const } : {}),
    });
    if (!response.ok) {
      moveInFlightRef.current = null;
      setError(response.error);
      return false;
    }

    setState(response.state);
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
    setError(null);

    const timelineResponse = await runWorker({ id: requestId(), type: "getTimeline" });
    if (timelineResponse.ok && timelineResponse.timeline) {
      setTimeline(timelineResponse.timeline);
      setCurrentPly(timelineResponse.timeline.length - 1);
    }

    if (
      autoPlayModels &&
      !applyingEngineMoveRef.current &&
      !response.state.isCheckmate &&
      !response.state.isDraw &&
      (response.state.turn === "w" ? whiteController : blackController) !== "human"
    ) {
      window.setTimeout(() => {
        void requestCurrentModelMove(response.state);
      }, ENGINE_DELAY_MIN_MS);
    }

    moveInFlightRef.current = null;
    return true;
  }

  useEffect(() => {
    requestMoveRef.current = requestMove;
  });

  useEffect(() => {
    if (autoPlayModels && canRequestModelMove) {
      const timer = window.setTimeout(() => {
        void requestCurrentModelMove();
      }, ENGINE_DELAY_MIN_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [autoPlayModels, canRequestModelMove, activeState?.fen, requestCurrentModelMove]);

  useEffect(() => {
    if (!showEvalBar || !activeState || activeState.isCheckmate || activeState.isDraw) {
      const timer = window.setTimeout(() => {
        setEvalThinking(false);
        if (!showEvalBar) setEvalResult(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const fen = activeState.fen;
    const timer = window.setTimeout(() => {
      setEvalThinking(true);
      const browserEngine = browserEvalEngineRef.current ?? new BrowserStockfish();
      browserEvalEngineRef.current = browserEngine;
      browserEngine
        .analyze(fen, { depth: EVAL_DEPTH })
        .then((result) => {
          if (activeStateRef.current?.fen !== fen) return;
          setEvalResult(result);
          setEvalThinking(false);
        })
        .catch(() => {
          if (activeStateRef.current?.fen !== fen) return;
          setEvalResult(null);
          setEvalThinking(false);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeState, activeState?.fen, showEvalBar]);

  useEffect(() => {
    if (!showMoveQualityLabels || !timeline || positionEditor || lastPly <= 0) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const engine = browserMoveLabelEngineRef.current ?? new BrowserStockfish();
        browserMoveLabelEngineRef.current = engine;
        const cache = { ...moveEvalCache };
        const nextCache: Record<string, StockfishResult> = {};
        const nextLabels: Record<number, MoveLabel> = {};
        const startPly = Math.max(1, lastPly - 79);

        async function analyzeFen(fen: string) {
          if (cache[fen]) return cache[fen];
          const result = await engine.analyze(fen, { depth: MOVE_LABEL_DEPTH });
          cache[fen] = result;
          nextCache[fen] = result;
          return result;
        }

        for (let ply = startPly; ply <= lastPly; ply += 1) {
          if (cancelled || moveLabels[ply]) continue;
          const before = timeline[ply - 1];
          const after = timeline[ply];
          if (!before || !after || !after.uci) continue;

          if (isOpeningBookMove(after.state.fen, after.ply)) {
            nextLabels[ply] = MOVE_LABELS.book;
            continue;
          }
          if (legalMoveCount(before.state.fen) <= 1) {
            nextLabels[ply] = MOVE_LABELS.forced;
            continue;
          }

          const beforeEval = await analyzeFen(before.state.fen);
          const afterEval = await analyzeFen(after.state.fen);
          if (cancelled) return;
          nextLabels[ply] = classifyMoveLabel({ before, after, beforeEval, afterEval });
        }

        if (cancelled) return;
        if (Object.keys(nextCache).length > 0) {
          setMoveEvalCache((current) => ({ ...current, ...nextCache }));
        }
        if (Object.keys(nextLabels).length > 0) {
          setMoveLabels((current) => ({ ...current, ...nextLabels }));
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lastPly, moveEvalCache, moveLabels, positionEditor, showMoveQualityLabels, timeline, timelineSignature]);

  useEffect(() => {
    moveHandlerRef.current = (orig, dest) => {
      if (positionEditor) {
        void editPieceMove(orig, dest);
      } else {
        void requestMove(orig, dest);
      }
    };
    selectHandlerRef.current = (square) => {
      void handleSquareClick(square);
    };
    newPieceHandlerRef.current = (square) => {
      const piece = draggedEditorPieceRef.current;
      draggedEditorPieceRef.current = null;
      if (positionEditor && piece) {
        void putEditorPiece(square, piece);
      }
    };
  });

  async function handleSquareClick(targetSquare: Square) {
    setError(null);
    if (!activeState || isIntroPlaying || isSolutionMode) return;
    if (positionEditor) {
      setSelected(pieceAt(targetSquare) ? targetSquare : null);
      setLegalTargets(new Set());
      setLegalSafety({});
      return;
    }
    if (
      !isReviewing &&
      (activeState.turn === "w" ? whiteController : blackController) !== "human"
    ) return;

    if (!selected) {
      const piece = pieceAt(targetSquare);
      if (!piece || piece[0] !== activeState.turn) return;
      setSelected(targetSquare);
      await requestLegalTargets(targetSquare);
      return;
    }

    if (selected === targetSquare) {
      setSelected(null);
      setLegalTargets(new Set());
      setLegalSafety({});
      return;
    }

    const clickedPiece = pieceAt(targetSquare);
    if (clickedPiece && clickedPiece[0] === activeState.turn && !legalTargets.has(targetSquare)) {
      setSelected(targetSquare);
      await requestLegalTargets(targetSquare);
      return;
    }

    if (!legalTargets.has(targetSquare)) {
      setSelected(null);
      setLegalTargets(new Set());
      setLegalSafety({});
      return;
    }
    // Chessground emits its `after` event for legal click and drag moves.
    // That event is the single path responsible for applying the move.
  }

  async function resetGame() {
    await startTrainingMode(activeMode, true);
  }

  async function startTrainingMode(
    mode: TrainingMode,
    preserveControllers = false,
    requestedVariantId?: string,
  ) {
    pendingEngineRequestRef.current = null;
    moveInFlightRef.current = null;
    const trainingMode = trainingModes.find((item) => item.id === mode);
    const variantId =
      requestedVariantId ?? (preserveControllers ? activeVariantId : trainingMode?.variants[0]?.id);
    const variant =
      trainingMode?.variants.find((item) => item.id === variantId) ?? trainingMode?.variants[0];
    const response = variant?.setup.fen
      ? await runWorker({ id: requestId(), type: "setFen", fen: variant.setup.fen })
      : variant?.setup.pgn
        ? await runWorker({ id: requestId(), type: "importPgn", pgn: variant.setup.pgn })
        : await runWorker({ id: requestId(), type: "reset" });
    if (!response.ok) {
      setError(response.error);
      return;
    }

    setState(response.state);
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
    setError(null);
    const nextTimeline = response.timeline ?? [{ ply: 0, san: null, uci: null, state: response.state }];
    const shouldPlayIntro = mode !== "sandbox" && nextTimeline.length > 1;
    setTimeline(nextTimeline);
    setCurrentPly(shouldPlayIntro ? 0 : nextTimeline.length - 1);
    setModeStartPly(nextTimeline.length - 1);
    setIsIntroPlaying(shouldPlayIntro);
    setEngineThinking(false);
    setPositionEditor(false);
    setActiveMode(mode);
    setActiveVariantId(variant?.id ?? "standard");
    setIsSolutionMode(false);
    solutionReturnRef.current = null;
    setAutoPlayModels(true);
    if (!preserveControllers) {
      setTemperatureMode(variant?.temperature.mode ?? "optimal");
    }
    if (mode === "sandbox") {
      setIsFlipped(false);
    } else {
      const playerSide = variant?.playerSide ?? "b";
      if (!preserveControllers) {
        setWhiteController(playerSide === "w" ? "human" : availableModels[0]?.id ?? "human");
        setBlackController(playerSide === "b" ? "human" : availableModels[0]?.id ?? "human");
      }
      setIsFlipped(playerSide === "b");
    }
  }

  function returnHome() {
    if (lastPly > modeStartPly) {
      const confirmed = window.confirm("Leave this game? Your current progress will be lost.");
      if (!confirmed) return;
    }
    pendingEngineRequestRef.current = null;
    moveInFlightRef.current = null;
    setEngineThinking(false);
    setAutoPlayModels(false);
    setIsIntroPlaying(false);
    setIsSolutionMode(false);
    solutionReturnRef.current = null;
    router.push("/");
  }

  function goToPly(ply: number) {
    if (!timeline || isIntroPlaying) return;
    setCurrentPly(Math.max(0, Math.min(timeline.length - 1, ply)));
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
  }

  async function showSolutionTimeline() {
    if (!activeVariant?.solution || !timeline || isSolutionMode) return;
    const response = await runWorker({
      id: requestId(),
      type: "previewPgn",
      pgn: activeVariant.solution.pgn,
    });
    if (!response.ok || !response.timeline) {
      setError(response.ok ? "The solution has no moves." : response.error);
      return;
    }

    solutionReturnRef.current = { timeline, currentPly };
    setTimeline(response.timeline);
    setCurrentPly(0);
    setIsSolutionMode(true);
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
    setError(null);
  }

  function returnFromSolution() {
    const previous = solutionReturnRef.current;
    if (!previous) return;
    setTimeline(previous.timeline);
    setCurrentPly(previous.currentPly);
    setIsSolutionMode(false);
    solutionReturnRef.current = null;
    setSelected(null);
    setLegalTargets(new Set());
    setLegalSafety({});
  }

  function moveLabelClass(label: MoveLabel) {
    if (label.id === "book") return "move-quality-badge--book";
    if (label.id === "best" || label.id === "excellent" || label.id === "great" || label.id === "brilliant") {
      return "move-quality-badge--strong";
    }
    if (label.id === "good" || label.id === "forced") return "move-quality-badge--neutral";
    if (label.id === "inaccuracy" || label.id === "miss") return "move-quality-badge--warning";
    return "move-quality-badge--bad";
  }

  function renderBoardMoveLabel() {
    if (!displayedMoveSquare || !displayedMoveLabel || positionEditor) return null;
    return (
      <span
        className="move-quality-square"
        style={squareOverlayPosition(displayedMoveSquare, isFlipped)}
        title={`${displayedMoveLabel.text}: ${displayedMoveLabel.title}`}
        aria-label={`${displayedMoveLabel.text} move`}
      >
        <span className={`move-quality-badge ${moveLabelClass(displayedMoveLabel)}`}>
          {displayedMoveLabel.symbol}
        </span>
      </span>
    );
  }

  function renderHistoryMoveLabel(ply: number | null) {
    if (!showMoveQualityLabels || !ply) {
      return <span className="move-history-label move-history-label--empty" aria-hidden="true" />;
    }

    const label = moveLabels[ply];
    if (!label) {
      return <span className="move-history-label move-history-label--empty" aria-hidden="true" />;
    }

    return (
      <span
        className={`move-history-label ${moveLabelClass(label)}`}
        title={`${label.text}: ${label.title}`}
      >
        <span aria-hidden="true">{label.symbol}</span>
        <span>{label.text}</span>
      </span>
    );
  }


  const currentMoveText =
    currentPly === 0
      ? "Starting position"
      : String(Math.ceil(currentPly / 2)) + (currentPly % 2 === 0 ? "..." : ".") + " " + (timeline?.[currentPly]?.san ?? "");

  return (
    <main
      className="min-h-screen bg-[#f3f4f2] p-2 text-zinc-900 lg:h-screen lg:overflow-hidden"
      onPointerDownCapture={dismissCheckmateOverlay}
    >
      <div className={"mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-2 lg:h-[calc(100vh-1rem)] " + appGridClass}>
        <GameSidebar
          status={status}
          error={error}
          availableModels={availableModels}
          whiteController={whiteController}
          blackController={blackController}
          temperatureMode={temperatureMode}
          temperatureOptions={temperatureOptions}
          autoPlayModels={autoPlayModels}
          canRequestModelMove={canRequestModelMove}
          engineStatus={engineStatus}
          engineThinking={engineThinking}
          showEvalBar={showEvalBar}
          evalText={showEvalBar ? formatEval(evalResult, evalThinking) : "hidden"}
          showMoveQualityLabels={showMoveQualityLabels}
          showMoveSafetyHints={showMoveSafetyHints}
          showControlOverlay={showControlOverlay}
          showOccupiedOnly={showOccupiedOnly}
          showOwnOccupiedOnly={showOwnOccupiedOnly}
          overlaySide={overlaySide}
          controlsDisabled={isReviewing || positionEditor}
          overlayOwnPiecesDisabled={!showControlOverlay || overlaySide === "both"}
          onRestart={() => void resetGame()}
          onFlip={() => setIsFlipped((value) => !value)}
          onHome={returnHome}
          onWhiteControllerChange={setWhiteController}
          onBlackControllerChange={setBlackController}
          onSwapPlayerColors={swapPlayerColors}
          onTemperatureModeChange={setTemperatureMode}
          onAutoPlayModelsChange={setAutoPlayModels}
          onRequestModelMove={() => void requestCurrentModelMove()}
          onShowEvalBarChange={setShowEvalBar}
          onShowMoveQualityLabelsChange={setShowMoveQualityLabels}
          onShowMoveSafetyHintsChange={setShowMoveSafetyHints}
          onShowControlOverlayChange={setShowControlOverlay}
          onShowOccupiedOnlyChange={setShowOccupiedOnly}
          onShowOwnOccupiedOnlyChange={setShowOwnOccupiedOnly}
          onOverlaySideChange={setOverlaySide}
        />

        <BoardArea
          boardRef={boardElRef}
          topPlayer={topPlayer}
          bottomPlayer={bottomPlayer}
          material={material}
          whiteMaterialAdvantage={whiteMaterialAdvantage}
          isReviewing={isReviewing}
          showMoveSafetyHints={showMoveSafetyHints}
          selected={selected}
          positionEditor={positionEditor}
          legalTargets={legalTargets}
          legalSafety={legalSafety}
          isFlipped={isFlipped}
          boardMoveLabel={renderBoardMoveLabel()}
          showCheckmateOverlay={showCheckmateOverlay}
          activeState={activeState}
          onDismissCheckmate={dismissCheckmateOverlay}
        />

        <EvalBar
          active={evalBarActive}
          showEvalBar={showEvalBar}
          label={evalLabel}
          topSide={evalTopSide}
          bottomSide={evalBottomSide}
          topHeight={evalTopHeight}
          bottomHeight={evalBottomHeight}
        />

        <MovePanel
          positionEditor={positionEditor}
          activeMode={activeMode}
          activeState={activeState}
          selected={selected}
          currentOpening={currentOpening}
          activeVariant={activeVariant}
          isSolutionMode={isSolutionMode}
          isReviewing={isReviewing}
          moveHistoryRef={moveHistoryRef}
          moveRows={moveRows}
          currentPly={currentPly}
          lastPly={lastPly}
          timelineExists={Boolean(timeline)}
          currentMoveText={currentMoveText}
          editorPieces={editorPieces}
          onTogglePositionEditor={togglePositionEditor}
          onStartEditorPieceDrag={startEditorPieceDrag}
          onChangeEditorTurn={(turn) => void changeEditorTurn(turn)}
          onDeleteSelectedPiece={() => void deleteSelectedPiece()}
          onShowSolutionTimeline={() => void showSolutionTimeline()}
          onReturnFromSolution={returnFromSolution}
          onGoToPly={goToPly}
          renderHistoryMoveLabel={renderHistoryMoveLabel}
        />
      </div>
    </main>
  );
}
