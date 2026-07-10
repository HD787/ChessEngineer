type ServedModel = {
  id: string;
  name: string;
};

type PlayerController = "human" | string;
type TemperatureMode = "optimal" | "argmax" | "focused" | "human" | "loose";

type TemperatureOption = {
  id: TemperatureMode;
  label: string;
};

type Props = {
  className?: string;
  status: string;
  error: string | null;
  availableModels: ServedModel[];
  whiteController: PlayerController;
  blackController: PlayerController;
  temperatureMode: TemperatureMode;
  temperatureOptions: TemperatureOption[];
  autoPlayModels: boolean;
  canRequestModelMove: boolean;
  engineStatus: "disconnected" | "connecting" | "connected";
  engineThinking: boolean;
  showEvalBar: boolean;
  evalText: string;
  showMoveQualityLabels: boolean;
  showMoveSafetyHints: boolean;
  showControlOverlay: boolean;
  showOccupiedOnly: boolean;
  showOwnOccupiedOnly: boolean;
  overlaySide: "both" | "w" | "b";
  controlsDisabled: boolean;
  overlayOwnPiecesDisabled: boolean;
  onRestart: () => void;
  onFlip: () => void;
  onHome: () => void;
  onWhiteControllerChange: (value: string) => void;
  onBlackControllerChange: (value: string) => void;
  onSwapPlayerColors: () => void;
  onTemperatureModeChange: (value: TemperatureMode) => void;
  onAutoPlayModelsChange: (value: boolean) => void;
  onRequestModelMove: () => void;
  onShowEvalBarChange: (value: boolean) => void;
  onShowMoveQualityLabelsChange: (value: boolean) => void;
  onShowMoveSafetyHintsChange: (value: boolean) => void;
  onShowControlOverlayChange: (value: boolean) => void;
  onShowOccupiedOnlyChange: (value: boolean) => void;
  onShowOwnOccupiedOnlyChange: (value: boolean) => void;
  onOverlaySideChange: (value: "both" | "w" | "b") => void;
};

export function GameSidebar({
  className = "",
  status,
  error,
  availableModels,
  whiteController,
  blackController,
  temperatureMode,
  temperatureOptions,
  autoPlayModels,
  canRequestModelMove,
  engineStatus,
  engineThinking,
  showEvalBar,
  evalText,
  showMoveQualityLabels,
  showMoveSafetyHints,
  showControlOverlay,
  showOccupiedOnly,
  showOwnOccupiedOnly,
  overlaySide,
  controlsDisabled,
  overlayOwnPiecesDisabled,
  onRestart,
  onFlip,
  onHome,
  onWhiteControllerChange,
  onBlackControllerChange,
  onSwapPlayerColors,
  onTemperatureModeChange,
  onAutoPlayModelsChange,
  onRequestModelMove,
  onShowEvalBarChange,
  onShowMoveQualityLabelsChange,
  onShowMoveSafetyHintsChange,
  onShowControlOverlayChange,
  onShowOccupiedOnlyChange,
  onShowOwnOccupiedOnlyChange,
  onOverlaySideChange,
}: Props) {
  return (
    <aside className={`${className} min-h-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm lg:overflow-y-auto`}>
      <div className="flex items-center gap-2.5 border-b border-zinc-200 pb-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-emerald-700 text-base font-bold text-white">
          H
        </div>
        <div>
          <h1 className="text-base font-bold text-zinc-950">Chess Engineer</h1>
          <p className="text-xs text-zinc-500">Model playground</p>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <p className="rounded-md border-l-4 border-emerald-600 bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-950">
          {status}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md bg-zinc-900 px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={onFlip}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-100"
          >
            Flip
          </button>
          <button
            type="button"
            onClick={onHome}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-100"
          >
            Home
          </button>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase text-zinc-400">Players</p>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-600">
              White
              <select
                value={whiteController}
                onChange={(event) => onWhiteControllerChange(event.target.value)}
                disabled={controlsDisabled}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="human">Human</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-zinc-600">
              Black
              <select
                value={blackController}
                onChange={(event) => onBlackControllerChange(event.target.value)}
                disabled={controlsDisabled}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="human">Human</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onSwapPlayerColors}
              disabled={controlsDisabled || engineThinking}
              className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              Swap Colors
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase text-zinc-400">Model Play</p>
          <label className="mb-2 block text-xs font-semibold text-zinc-600">
            Move selection
            <select
              value={temperatureMode}
              onChange={(event) => onTemperatureModeChange(event.target.value as TemperatureMode)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-600"
            >
              {temperatureOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium">
            Auto-play turns
            <input
              type="checkbox"
              checked={autoPlayModels}
              onChange={(event) => onAutoPlayModelsChange(event.target.checked)}
              disabled={controlsDisabled}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <button
            type="button"
            onClick={onRequestModelMove}
            disabled={!canRequestModelMove}
            className="mt-1.5 w-full rounded-md bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            Step Model Move
          </button>
          <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span
              className={`h-2 w-2 rounded-full ${
                engineStatus === "connected" ? "bg-emerald-500" : "bg-zinc-300"
              }`}
            />
            Runner {engineStatus} · {availableModels.length} option
            {availableModels.length === 1 ? "" : "s"}
            {engineThinking ? " · thinking" : ""}
          </p>
        </div>

        <div className="border-t border-zinc-200 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase text-zinc-400">Analysis</p>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium">
            Eval bar
            <input
              type="checkbox"
              checked={showEvalBar}
              onChange={(event) => onShowEvalBarChange(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <p className="mt-1 text-xs text-zinc-500">Browser Stockfish · {evalText}</p>
        </div>

        <div className="border-t border-zinc-200 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase text-zinc-400">Board Overlay</p>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium">
            Move labels
            <input
              type="checkbox"
              checked={showMoveQualityLabels}
              onChange={(event) => onShowMoveQualityLabelsChange(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium">
            Move safety hints
            <input
              type="checkbox"
              checked={showMoveSafetyHints}
              onChange={(event) => onShowMoveSafetyHintsChange(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs">
            Show control
            <input
              type="checkbox"
              checked={showControlOverlay}
              onChange={(event) => onShowControlOverlayChange(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs">
            Occupied only
            <input
              type="checkbox"
              checked={showOccupiedOnly}
              onChange={(event) => onShowOccupiedOnlyChange(event.target.checked)}
              disabled={!showControlOverlay}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs">
            Own pieces only
            <input
              type="checkbox"
              checked={showOwnOccupiedOnly}
              onChange={(event) => onShowOwnOccupiedOnlyChange(event.target.checked)}
              disabled={overlayOwnPiecesDisabled}
              className="h-4 w-4 accent-emerald-700"
            />
          </label>
          <label className="mt-2 block text-xs font-semibold text-zinc-600">
            Side
            <select
              value={overlaySide}
              onChange={(event) => onOverlaySideChange(event.target.value as "both" | "w" | "b")}
              disabled={!showControlOverlay}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-emerald-600"
            >
              <option value="both">Both</option>
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-2 min-h-[20px]" aria-live="polite">
        <p className={`text-xs ${error ? "text-rose-600" : "text-transparent"}`}>
          {error ?? "."}
        </p>
      </div>
    </aside>
  );
}
