// Derivation sweeps for Guard 6 (tests/guards/escape.test.ts). Prints every
// number the guard's comments and thresholds rest on. Run:
//   npx tsx scripts/explore-escape.ts
//
// The arm itself — BASE, SEEDS, GENERATIONS and the runners — is imported from
// tests/guards/escape-arm.ts, the SAME module the guard asserts against. This
// script therefore cannot describe a different model than the guard: there is one
// definition, not two hand-maintained copies.
import { defaultParams, isSilenced, silencedCopies } from "../sim/index.js";
import { transpose } from "../sim/phases/transpose.js";
import {
  BASE,
  FOUNDER_ID,
  GENERATIONS,
  runArm,
  SEED_S,
  SEEDS,
  seedTrappedGenome,
  transposeOnce,
} from "../tests/guards/escape-arm.js";

function stats(seed: number, sigmaS: number) {
  const { p, g, founder, escaped } = runArm(seed, sigmaS);
  const nonFounder = g.copies.filter((c) => c.id !== FOUNDER_ID);
  return {
    total: g.copies.length,
    escapedN: escaped.length,
    caughtN: silencedCopies(g, p).length,
    maxAbsS: Math.max(...escaped.map((c) => Math.abs(c.s))),
    minAbsS: Math.min(...escaped.map((c) => Math.abs(c.s))),
    nonFounderExactlySeed: nonFounder.every((c) => c.s === SEED_S),
    founderSilenced: isSilenced(founder, g, p),
  };
}

console.log(
  `=== ARM A: sigmaS = ${BASE.sigmaS} (divergence ON), ${GENERATIONS} generations ===`,
);
console.log("seed  total  escaped  caught  max|s|   min|s|  founderSilenced");
const aStats = SEEDS.map((seed) => {
  const r = stats(seed, BASE.sigmaS);
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

console.log(
  `\n=== ARM B: sigmaS = 0 (divergence OFF), ${GENERATIONS} generations ===`,
);
console.log("seed  total  escaped  caught  max|s|  allNonFounderExactly0.2");
const bStats = SEEDS.map((seed) => {
  const r = stats(seed, 0);
  console.log(
    `${String(seed).padStart(4)}  ${String(r.total).padStart(5)}  ${String(r.escapedN).padStart(7)}  ${String(r.caughtN).padStart(6)}  ${r.maxAbsS.toFixed(4).padStart(6)}  ${r.nonFounderExactlySeed}`,
  );
  return r;
});
console.log(
  `B: totals distinct -> ${[...new Set(bStats.map((r) => r.total))].join(",")}; max|s| distinct -> ${[...new Set(bStats.map((r) => r.maxAbsS))].join(",")}; all-exact -> ${bStats.every((r) => r.nonFounderExactlySeed)}`,
);
console.log(
  `B: ${SEED_S} + 0 * normal() === ${SEED_S} for every non-founder at every seed: ${bStats.every((r) => r.nonFounderExactlySeed)}`,
);

console.log(
  `\n=== ARM C: growth per generation, sigmaS = 0 vs ${BASE.sigmaS} (seed 55) ===`,
);
for (const sigmaS of [0, BASE.sigmaS]) {
  const p = defaultParams({ ...BASE, seed: 55, sigmaS });
  const { world, genome } = seedTrappedGenome(p);
  const counts: number[] = [genome.copies.length];
  for (let i = 0; i < GENERATIONS; i++) {
    transpose(world);
    counts.push(genome.copies.length);
  }
  console.log(`sigmaS=${sigmaS}: ${counts.join(" -> ")}`);
}

console.log(
  "\n=== ARM D: test 3 — one silenced founder alone, one transpose ===",
);
console.log("seed  trappedLen  freeLen");
const dRows = SEEDS.map((seed) => {
  const p = defaultParams({ ...BASE, seed });
  const trapped = transposeOnce(p, [0]).copies.length;
  const free = transposeOnce(p, []).copies.length;
  console.log(
    `${String(seed).padStart(4)}  ${String(trapped).padStart(10)}  ${String(free).padStart(7)}`,
  );
  return { trapped, free };
});
console.log(
  `D: trapped always 1 -> ${dRows.every((r) => r.trapped === 1)}; free always 2 -> ${dRows.every((r) => r.free === 2)}`,
);
