import { createChessStateController, type ChessWorkerRequest } from "../lib/chessState";

const controller = createChessStateController();

self.onmessage = (event: MessageEvent<ChessWorkerRequest>) => {
  self.postMessage(controller.handle(event.data));
};

export {};
