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
  scenarioTitle: string;
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
  scenarioTitle,
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
    <aside className={`${className} ce-panel min-h-0 p-3 lg:overflow-y-auto`}>
      <div className="ce-rule flex min-w-0 items-center gap-2.5 border-b pb-3">
        <div className="ce-brand-mark h-8 w-8 text-[13px] font-bold">
          CE
        </div>
        <div className="min-w-0">
          <h1 className="ce-title text-base">Chess Engineer</h1>
          <p className="ce-muted truncate text-xs font-medium" title={scenarioTitle}>
            {scenarioTitle}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <p className="ce-accent-panel px-2.5 py-2 text-xs font-bold">
          {status}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onRestart}
            className="ce-button-primary px-2 py-1.5 text-xs font-bold transition-colors"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={onFlip}
            className="ce-button-secondary px-2 py-1.5 text-xs font-bold transition-colors"
          >
            Flip
          </button>
          <button
            type="button"
            onClick={onHome}
            className="ce-button-secondary px-2 py-1.5 text-xs font-bold transition-colors"
          >
            Home
          </button>
        </div>

        <div>
          <p className="ce-section-title mb-2">Players</p>
          <div className="space-y-2">
            <label className="ce-label block">
              White
              <select
                value={whiteController}
                onChange={(event) => onWhiteControllerChange(event.target.value)}
                disabled={controlsDisabled}
                className="ce-select mt-1 w-full px-2 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="human">Human</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ce-label block">
              Black
              <select
                value={blackController}
                onChange={(event) => onBlackControllerChange(event.target.value)}
                disabled={controlsDisabled}
                className="ce-select mt-1 w-full px-2 py-1.5 text-xs font-semibold outline-none"
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
              className="ce-button-secondary w-full px-2 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
            >
              Swap Colors
            </button>
          </div>
        </div>

        <div className="ce-rule border-t pt-3">
          <p className="ce-section-title mb-2">Model Play</p>
          <label className="ce-label mb-2 block">
            Move selection
            <select
              value={temperatureMode}
              onChange={(event) => onTemperatureModeChange(event.target.value as TemperatureMode)}
              className="ce-select mt-1 w-full px-2 py-1.5 text-xs font-semibold outline-none"
            >
              {temperatureOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-bold text-[var(--ce-ink)]">
            Auto-play turns
            <input
              type="checkbox"
              checked={autoPlayModels}
              onChange={(event) => onAutoPlayModelsChange(event.target.checked)}
              disabled={controlsDisabled}
              className="ce-checkbox"
            />
          </label>
          <button
            type="button"
            onClick={onRequestModelMove}
            disabled={!canRequestModelMove}
            className="ce-button-primary mt-1.5 w-full px-2 py-1.5 text-xs font-bold transition-colors disabled:border-[var(--ce-line)] disabled:bg-[var(--ce-line-soft)] disabled:text-[var(--ce-heading-muted)]"
          >
            Step Model Move
          </button>
          <p className="ce-muted mt-2 flex items-center gap-2 text-xs font-medium">
            <span
              className={`h-2 w-2 ${
                engineStatus === "connected" ? "bg-[var(--ce-green)]" : "bg-[var(--ce-line)]"
              }`}
            />
            Runner {engineStatus} · {availableModels.length} option
            {availableModels.length === 1 ? "" : "s"}
            {engineThinking ? " · thinking" : ""}
          </p>
        </div>

        <div className="ce-rule border-t pt-3">
          <p className="ce-section-title mb-2">Analysis</p>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-bold text-[var(--ce-ink)]">
            Eval bar
            <input
              type="checkbox"
              checked={showEvalBar}
              onChange={(event) => onShowEvalBarChange(event.target.checked)}
              className="ce-checkbox"
            />
          </label>
          <p className="ce-muted mt-1 text-xs font-medium">Browser Stockfish · {evalText}</p>
        </div>

        <div className="ce-rule border-t pt-3">
          <p className="ce-section-title mb-2">Board Overlay</p>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-bold text-[var(--ce-ink)]">
            Move labels
            <input
              type="checkbox"
              checked={showMoveQualityLabels}
              onChange={(event) => onShowMoveQualityLabelsChange(event.target.checked)}
              className="ce-checkbox"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-bold text-[var(--ce-ink)]">
            Move safety hints
            <input
              type="checkbox"
              checked={showMoveSafetyHints}
              onChange={(event) => onShowMoveSafetyHintsChange(event.target.checked)}
              className="ce-checkbox"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium text-[var(--ce-ink)]">
            Show control
            <input
              type="checkbox"
              checked={showControlOverlay}
              onChange={(event) => onShowControlOverlayChange(event.target.checked)}
              className="ce-checkbox"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium text-[var(--ce-ink)]">
            Occupied only
            <input
              type="checkbox"
              checked={showOccupiedOnly}
              onChange={(event) => onShowOccupiedOnlyChange(event.target.checked)}
              disabled={!showControlOverlay}
              className="ce-checkbox"
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5 text-xs font-medium text-[var(--ce-ink)]">
            Own pieces only
            <input
              type="checkbox"
              checked={showOwnOccupiedOnly}
              onChange={(event) => onShowOwnOccupiedOnlyChange(event.target.checked)}
              disabled={overlayOwnPiecesDisabled}
              className="ce-checkbox"
            />
          </label>
          <label className="ce-label mt-2 block">
            Side
            <select
              value={overlaySide}
              onChange={(event) => onOverlaySideChange(event.target.value as "both" | "w" | "b")}
              disabled={!showControlOverlay}
              className="ce-select mt-1 w-full px-2 py-1.5 text-xs outline-none"
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
