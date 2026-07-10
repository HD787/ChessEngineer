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
  variants: ScenarioVariant[];
};

const trainingModes = scenarioData as TrainingScenario[];

function playPath(scenarioId: string, variantId: string) {
  return `/play/${encodeURIComponent(scenarioId)}?variant=${encodeURIComponent(variantId)}`;
}

export default function Home() {
  const router = useRouter();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries(trainingModes.map((scenario) => [scenario.id, scenario.variants[0].id])),
  );
  const scenarioCards = useMemo(
    () =>
      trainingModes.map((mode) => ({
        mode,
        selectedVariant:
          mode.variants.find((variant) => variant.id === selectedVariants[mode.id]) ??
          mode.variants[0],
      })),
    [selectedVariants],
  );

  return (
    <main className="min-h-screen bg-[#f3f4f2] px-4 py-8 text-zinc-900 sm:px-8 sm:py-12">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-700 text-xl font-bold text-white">
            H
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Chess Engineer</h1>
            <p className="text-sm text-zinc-500">Choose a position to train</p>
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
              className="group flex min-h-36 w-full cursor-pointer flex-col border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:p-6"
            >
              <div className="flex w-full items-start justify-between gap-5">
                <div>
                  <span className="block text-xs font-bold uppercase text-emerald-700">
                    {mode.category}
                  </span>
                  <span className="mt-2 block text-xl font-bold text-zinc-950">
                    {mode.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-600">
                    {mode.description}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {mode.variants.length > 1 ? (
                    <label
                      className="text-[10px] font-bold uppercase text-zinc-400"
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
                        className="mt-1 block max-w-44 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-medium normal-case text-zinc-900 outline-none focus:border-emerald-600"
                      >
                        {mode.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <span className="text-xl text-emerald-700 transition-transform group-hover:translate-x-1">
                    {">"}
                  </span>
                </div>
              </div>
              <p className="mt-4 border-t border-zinc-100 pt-3 text-xs font-semibold text-zinc-500">
                {selectedVariant.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
