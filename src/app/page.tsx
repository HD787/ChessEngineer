"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { scenarios as scenarioData } from "../data/scenarios";

type Side = "w" | "b";
type TemperatureMode = "optimal" | "argmax" | "focused" | "human" | "loose";
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
  id: string;
  title: string;
  description: string;
  category: string;
  shortDescription?: string;
  variants: ScenarioVariant[];
};

const trainingModes = scenarioData as TrainingScenario[];
const sandboxMode = trainingModes.find((mode) => mode.id === "sandbox");
const scenarioModes = trainingModes.filter((mode) => mode.id !== "sandbox");
const categoryOrder = Array.from(new Set(scenarioModes.map((mode) => mode.category))).sort((a, b) =>
  a.localeCompare(b),
);

function playPath(scenarioId: string, variantId: string) {
  return `/play/${encodeURIComponent(scenarioId)}?variant=${encodeURIComponent(variantId)}`;
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries(scenarioModes.map((scenario) => [scenario.id, scenario.variants[0].id])),
  );
  const sandboxVariant = sandboxMode?.variants[0];
  const scenarioCards = useMemo(
    () =>
      scenarioModes
        .filter((mode) => activeCategory === "All" || mode.category === activeCategory)
        .map((mode) => ({
          mode,
          selectedVariant:
            mode.variants.find((variant) => variant.id === selectedVariants[mode.id]) ??
            mode.variants[0],
        })),
    [activeCategory, selectedVariants],
  );

  return (
    <main className="ce-page-shell min-h-screen px-4 py-8 text-[var(--ce-ink)] sm:px-8 sm:py-12">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-stretch justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="ce-brand-mark h-11 w-11 shrink-0 text-xl font-bold">
              CE
            </div>
            <div className="min-w-0">
              <h1 className="ce-title text-2xl">Chess Engineer</h1>
              <p className="ce-muted text-sm font-medium">Choose a position to train</p>
            </div>
          </div>
          {sandboxMode && sandboxVariant ? (
            <Link
              href={playPath(sandboxMode.id, sandboxVariant.id)}
              className="scenario-card sandbox-mini-card group hidden min-h-24 w-[46%] min-w-72 cursor-pointer px-5 py-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ce-green)] sm:flex sm:flex-col sm:justify-center"
            >
              <span className="block text-[0.62rem] font-black uppercase tracking-[0.08em] ce-positive">
                Free board
              </span>
              <span className="ce-title mt-1 flex items-center justify-between gap-3 text-base">
                Sandbox
                <span className="scenario-card-arrow text-xl transition-transform group-hover:translate-x-1">
                  {"›"}
                </span>
              </span>
              <span className="ce-muted mt-1 block text-xs font-bold">
                Play freely, edit positions, and test models.
              </span>
            </Link>
          ) : null}
        </div>
        {sandboxMode && sandboxVariant ? (
          <Link
            href={playPath(sandboxMode.id, sandboxVariant.id)}
            className="scenario-card sandbox-mini-card mb-5 cursor-pointer px-4 py-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ce-green)] sm:hidden"
          >
            <span className="block text-[0.62rem] font-black uppercase tracking-[0.08em] ce-positive">
              Free board
            </span>
            <span className="ce-title mt-1 flex items-center justify-between gap-3 text-base">
              Sandbox
              <span className="scenario-card-arrow text-xl">{"›"}</span>
            </span>
          </Link>
        ) : null}

        <div className="mb-3 flex items-end justify-between gap-4 border-b border-[var(--ce-ink)] pb-2">
          <div>
            <p className="ce-section-title">Training library</p>
            <h2 className="ce-title text-xl">Scenario drills</h2>
          </div>
          <p className="ce-muted hidden text-xs font-bold uppercase tracking-[0.08em] sm:block">
            Openings and endgames
          </p>
        </div>

        <div className="mb-5 border border-[var(--ce-ink)] bg-[var(--ce-paper)] p-2">
          <div className="flex flex-wrap justify-center gap-1.5">
            {["All", ...categoryOrder].map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] transition-colors ${
                    isActive
                      ? "bg-[var(--ce-ink)] text-[var(--ce-cream)]"
                      : "ce-button-secondary text-[var(--ce-muted)] hover:text-[var(--ce-ink)]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {scenarioCards.map(({ mode, selectedVariant }) => (
            <article
              key={mode.id}
              className="scenario-card group flex min-h-36 w-full cursor-pointer flex-col p-5 pl-6 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ce-green)] sm:p-6 sm:pl-7"
            >
              <Link
                href={playPath(mode.id, selectedVariant.id)}
                className="absolute inset-0 z-0"
                aria-label={`Start ${mode.title}`}
              />
              <div className="pointer-events-none relative z-10 flex w-full items-start justify-between gap-5">
                <div>
                  <span className="block text-xs font-black uppercase ce-positive">
                    {mode.shortDescription ?? mode.category}
                  </span>
                  <span className="ce-title mt-2 block text-xl">
                    {mode.title}
                  </span>
                  <span className="ce-text mt-1 block text-sm leading-6">
                    {mode.description}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {mode.variants.length > 1 ? (
                    <label
                      className="ce-section-title pointer-events-auto"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Variant
                      <select
                        value={selectedVariant.id}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setSelectedVariants((current) => ({
                            ...current,
                            [mode.id]: event.target.value,
                          }))
                        }
                        className="ce-select mt-1 block max-w-44 px-2 py-1.5 text-xs font-semibold normal-case outline-none"
                      >
                        {mode.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <span className="scenario-card-arrow text-2xl transition-transform group-hover:translate-x-1">
                    {"›"}
                  </span>
                </div>
              </div>
              <p className="ce-muted pointer-events-none relative z-10 mt-4 border-t border-[var(--ce-line-soft)] pt-3 text-xs font-bold">
                {selectedVariant.detail}
              </p>
            </article>
          ))}
        </div>

        <footer className="mt-8 border border-[var(--ce-ink)] bg-[var(--ce-paper)] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="ce-section-title">Source</p>
              <p className="ce-muted text-xs font-bold">Code and published models</p>
            </div>
            <nav className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.08em]">
              <a
                href="https://github.com/HD787/ChessEngineer"
                target="_blank"
                rel="noreferrer"
                className="ce-button-secondary px-3 py-1.5"
              >
                Web UI
              </a>
              <a
                href="https://github.com/HD787/ChessModelServer"
                target="_blank"
                rel="noreferrer"
                className="ce-button-secondary px-3 py-1.5"
              >
                Model runner
              </a>
              <a
                href="https://huggingface.co/hd787"
                target="_blank"
                rel="noreferrer"
                className="ce-button-secondary px-3 py-1.5"
              >
                Models
              </a>
            </nav>
          </div>
        </footer>
      </section>
    </main>
  );
}
