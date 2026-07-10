import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Chess } from "chess.js";

const sourceDir = process.argv[2];
if (!sourceDir) {
  throw new Error("usage: node scripts/build-openings.mjs <directory-containing-a.tsv-through-e.tsv>");
}

const openings = {};
for (const volume of ["a", "b", "c", "d", "e"]) {
  const source = await readFile(join(sourceDir, `${volume}.tsv`), "utf8");
  const [, ...rows] = source.trim().split("\n");
  for (const row of rows) {
    const [eco, name, pgn] = row.split("\t");
    const game = new Chess();
    game.loadPgn(pgn);
    const position = game.fen().split(" ").slice(0, 4).join(" ");
    openings[position] = { eco, name };
  }
}

const outputDir = new URL("../src/data/", import.meta.url);
await mkdir(outputDir, { recursive: true });
await writeFile(
  new URL("openings.json", outputDir),
  `${JSON.stringify(openings)}\n`,
);
console.log(`Wrote ${Object.keys(openings).length} opening positions.`);
