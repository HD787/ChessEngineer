export type StockfishResult = {
  bestmove: string | null;
  principalMoves: string[];
  scoreCp: number | null;
  mate: number | null;
};

type AnalyzeOptions = {
  depth?: number;
  movetime?: number;
  multipv?: number;
};

type PendingRequest = {
  fen: string;
  options: AnalyzeOptions;
  resolve: (result: StockfishResult) => void;
  reject: (error: Error) => void;
};

function turnFromFen(fen: string): "w" | "b" {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

function scoreFromWhitePerspective(fen: string, score: number): number {
  return turnFromFen(fen) === "w" ? score : -score;
}

function mateFromWhitePerspective(fen: string, mate: number): number {
  return turnFromFen(fen) === "w" ? mate : -mate;
}

function stockfishWorkerPath(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  return `${basePath}/stockfish/stockfish-18-lite-single.js`;
}

export class BrowserStockfish {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private queue: PendingRequest[] = [];
  private active: PendingRequest | null = null;
  private latestScoreCp: number | null = null;
  private latestMate: number | null = null;
  private latestPrincipalMoves = new Map<number, string>();

  constructor(private readonly scriptPath = stockfishWorkerPath()) {}

  analyze(fen: string, options: AnalyzeOptions = {}): Promise<StockfishResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, options, resolve, reject });
      void this.pump();
    });
  }

  terminate() {
    this.worker?.postMessage("quit");
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    this.queue = [];
    this.active = null;
  }

  private async pump() {
    if (this.active || this.queue.length === 0) return;
    await this.ensureReady();
    if (this.active || this.queue.length === 0) return;
    const request = this.queue.shift();
    if (!request || !this.worker) return;

    this.active = request;
    this.latestScoreCp = null;
    this.latestMate = null;
    this.latestPrincipalMoves.clear();
    if (request.options.multipv) {
      this.worker.postMessage(`setoption name MultiPV value ${Math.max(1, request.options.multipv)}`);
    } else {
      this.worker.postMessage("setoption name MultiPV value 1");
    }
    this.worker.postMessage(`position fen ${request.fen}`);
    const go =
      typeof request.options.movetime === "number"
        ? `go movetime ${request.options.movetime}`
        : `go depth ${request.options.depth ?? 6}`;
    this.worker.postMessage(go);
  }

  private ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;

    this.worker = new Worker(this.scriptPath);
    this.worker.onmessage = (event: MessageEvent<string>) => this.handleLine(String(event.data));
    this.worker.onerror = () => {
      const error = new Error("Browser Stockfish failed to load.");
      this.active?.reject(error);
      this.queue.splice(0).forEach((request) => request.reject(error));
      this.active = null;
    };

    this.readyPromise = new Promise((resolve) => {
      const worker = this.worker;
      if (!worker) return;
      const previousHandler = worker.onmessage;
      worker.onmessage = (event: MessageEvent<string>) => {
        const line = String(event.data);
        if (line === "uciok") {
          worker.postMessage("setoption name Hash value 16");
          worker.postMessage("isready");
          return;
        }
        if (line === "readyok") {
          worker.onmessage = previousHandler;
          resolve();
          return;
        }
        this.handleLine(line);
      };
      worker.postMessage("uci");
    });

    return this.readyPromise;
  }

  private handleLine(line: string) {
    if (line.startsWith("info ")) {
      this.readScore(line);
      return;
    }
    if (!line.startsWith("bestmove ")) {
      return;
    }

    const request = this.active;
    if (!request) return;
    const bestmove = line.split(/\s+/)[1] ?? null;
    request.resolve({
      bestmove: bestmove === "(none)" ? null : bestmove,
      principalMoves: Array.from(this.latestPrincipalMoves.entries())
        .sort(([left], [right]) => left - right)
        .map(([, move]) => move),
      scoreCp: this.latestScoreCp,
      mate: this.latestMate,
    });
    this.active = null;
    void this.pump();
  }

  private readScore(line: string) {
    const multipv = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
    const pv = line.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
    if (pv) {
      this.latestPrincipalMoves.set(multipv, pv[1]);
    }

    const cp = line.match(/\bscore cp (-?\d+)/);
    if (cp && this.active && multipv === 1) {
      this.latestScoreCp = scoreFromWhitePerspective(this.active.fen, Number(cp[1]));
      this.latestMate = null;
      return;
    }

    const mate = line.match(/\bscore mate (-?\d+)/);
    if (mate && this.active && multipv === 1) {
      this.latestMate = mateFromWhitePerspective(this.active.fen, Number(mate[1]));
      this.latestScoreCp = null;
    }
  }
}
