// Derivation sweeps for Guard 6 (tests/guards/escape.test.ts). Prints every
// number the guard's comments and thresholds rest on. Run:
//   npx tsx scripts/explore-escape.ts
import {
  createWorld,
  defaultParams,
  isSilenced,
  silencedCopies,
  type Params,
} from "../sim/index.js";
import { transpose } from "../sim/phases/transpose.js";

const BASE: Params = {
  N: 1,
  S: 5000,
  c: 0,
  r0: 1,
  rMax: 1,
  sigmaR: 0,
  sigmaS: 0.5,
  theta: 0.1,
  v: 0,
  a: 0,
  b: 0,
  d: 0,
  dTol: 0,
  t: 0,
  beta: 0,
  pDom: 0,
  wDom: 0,
  sexual: false,
  silencingOn: true,
  seed: 55,
};

const SEEDS = [55, 1, 2, 3, 7, 9, 101, 202, 303, 404, 505];
const GENERATIONS = 8;

function arm(overrides: Partial<Params>) {
  const p = defaultParams({ ...BASE, ...overrides });
  const w = createWorld(p);
  const g = w.genomes[0]!;
  g.copies = [
    { id: 0, site: 1000, r: 1, s: 0, domesticated: false },
    { id: 1, site: 1001, r: 1, s: 0.2, domesticated: false },
  ];
  g.repertoire = [0];
  w.nextCopyId = 2;
  for (let i = 0; i < GENERATIONS; i++) transpose(w);
  const escaped = g.copies.filter((c) => !isSilenced(c, g, p));
  const caught = silencedCopies(g, p);
  const nonFounder = g.copies.filter((c) => c.id !== 0);
  return {
    p,
    g,
    total: g.copies.length,
    escapedN: escaped.length,
    caughtN: caught.length,
    maxAbsS: Math.max(...escaped.map((c) => Math.abs(c.s))),
    minAbsS: Math.min(...escaped.map((c) => Math.abs(c.s))),
    nonFounderExactlySeed: nonFounder.every((c) => c.s === 0.2),
    nonFounderN: nonFounder.length,
    founderSilenced: isSilenced(g.copies.find((c) => c.id === 0)!, g, p),
  };
}

console.log("=== ARM A: sigmaS = 0.5 (divergence ON), 8 generations ===");
console.log("seed  total  escaped  caught  max|s|   min|s|  founderSilenced");
const aStats = SEEDS.map((seed) => {
  const r = arm({ seed });
  console.log(
    `${String(seed).padStart(4)}  ${String(r.total).padStart(5)}  ${String(r.escapedN).padStart(7)}  ${String(r.caughtN).padStart(6)}  ${r.maxAbsS.toFixed(4).padStart(6)}  ${r.minAbsS.toFixed(4).padStart(6)}  ${r.founderSilenced}`,
  );
  return r;
});
console.log(
  `A: min over seeds -> total ${Math.min(...aStats.map((r) => r.total))}, escaped ${Math.min(...aStats.map((r) => r.escapedN))}, caught ${Math.min(...aStats.map((r) => r.caughtN))}, max|s| ${Math.min(...aStats.map((r) => r.maxAbsS)).toFixed(4)}`,
);
console.log(
  `A: max over seeds -> total ${Math.max(...aStats.map((r) => r.total))}, escaped ${Math.max(...aStats.map((r) => r.escapedN))}, caught ${Math.max(...aStats.map((r) => r.caughtN))}, max|s| ${Math.max(...aStats.map((r) => r.maxAbsS)).toFixed(4)}`,
);
console.log(
  `A: seed 55 exact -> total ${aStats[0]!.total}, escaped ${aStats[0]!.escapedN}, caught ${aStats[0]!.caughtN}, max|s| ${aStats[0]!.maxAbsS}`,
);

console.log("\n=== ARM B: sigmaS = 0 (divergence OFF), 8 generations ===");
console.log("seed  total  escaped  caught  max|s|  allNonFounderExactly0.2");
const bStats = SEEDS.map((seed) => {
  const r = arm({ seed, sigmaS: 0 });
  console.log(
    `${String(seed).padStart(4)}  ${String(r.total).padStart(5)}  ${String(r.escapedN).padStart(7)}  ${String(r.caughtN).padStart(6)}  ${r.maxAbsS.toFixed(4).padStart(6)}  ${r.nonFounderExactlySeed}`,
  );
  return r;
});
console.log(
  `B: totals distinct -> ${[...new Set(bStats.map((r) => r.total))].join(",")}; max|s| distinct -> ${[...new Set(bStats.map((r) => r.maxAbsS))].join(",")}; all-exact -> ${bStats.every((r) => r.nonFounderExactlySeed)}`,
);
console.log(
  `B: 0.2 + 0 * normal() === 0.2 for every non-founder at every seed: ${bStats.every((r) => r.nonFounderExactlySeed)}`,
);

console.log(
  "\n=== ARM C: growth per generation, sigmaS = 0 vs 0.5 (seed 55) ===",
);
for (const sigmaS of [0, 0.5]) {
  const p = defaultParams({ ...BASE, sigmaS, seed: 55 });
  const w = createWorld(p);
  const g = w.genomes[0]!;
  g.copies = [
    { id: 0, site: 1000, r: 1, s: 0, domesticated: false },
    { id: 1, site: 1001, r: 1, s: 0.2, domesticated: false },
  ];
  g.repertoire = [0];
  w.nextCopyId = 2;
  const counts: number[] = [g.copies.length];
  for (let i = 0; i < GENERATIONS; i++) {
    transpose(w);
    counts.push(g.copies.length);
  }
  console.log(`sigmaS=${sigmaS}: ${counts.join(" -> ")}`);
}

console.log(
  "\n=== ARM D: test 3 — one silenced founder alone, one transpose ===",
);
console.log("seed  trappedLen  freeLen");
const dRows = SEEDS.map((seed) => {
  const p = defaultParams({ ...BASE, seed });
  const mk = (repertoire: number[]) => {
    const w = createWorld(p);
    const gg = w.genomes[0]!;
    gg.copies = [{ id: 0, site: 1000, r: 1, s: 0, domesticated: false }];
    gg.repertoire = repertoire;
    w.nextCopyId = 1;
    transpose(w);
    return gg.copies.length;
  };
  const trapped = mk([0]);
  const free = mk([]);
  console.log(
    `${String(seed).padStart(4)}  ${String(trapped).padStart(10)}  ${String(free).padStart(7)}`,
  );
  return { trapped, free };
});
console.log(
  `D: trapped always 1 -> ${dRows.every((r) => r.trapped === 1)}; free always 2 -> ${dRows.every((r) => r.free === 2)}`,
);
