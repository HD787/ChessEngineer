"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
const categoryOrder = Array.from(new Set(trainingModes.map((mode) => mode.category))).sort((a, b) =>
  a.localeCompare(b),
);

function playPath(scenarioId: string, variantId: string) {
  return `/play/${encodeURIComponent(scenarioId)}?variant=${encodeURIComponent(variantId)}`;
}

export default function Home() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries(trainingModes.map((scenario) => [scenario.id, scenario.variants[0].id])),
  );
  const scenarioCards = useMemo(
    () =>
      trainingModes
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
        <div className="mb-8 flex items-center gap-3">
          <div className="ce-brand-mark h-11 w-11 text-xl font-bold">
            CE
          </div>
          <div>
            <h1 className="ce-title text-2xl">Chess Engineer</h1>
            <p className="ce-muted text-sm font-medium">Choose a position to train</p>
          </div>
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
              role="button"
              tabIndex={0}
              onClick={() => router.push(playPath(mode.id, selectedVariant.id))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(playPath(mode.id, selectedVariant.id));
                }
              }}
              className="scenario-card group flex min-h-36 w-full cursor-pointer flex-col p-5 pl-6 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ce-green)] sm:p-6 sm:pl-7"
            >
              <div className="flex w-full items-start justify-between gap-5">
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
                      className="ce-section-title"
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
              <p className="ce-muted mt-4 border-t border-[var(--ce-line-soft)] pt-3 text-xs font-bold">
                {selectedVariant.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
