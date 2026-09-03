import type { Params } from "./params.js";
import { makeRng, type Rng } from "./rng.js";

export interface Copy {
  id: number;
  site: number;
  /** Transposition rate. Heritable. The strategy. */
  r: number;
  /** Sequence coordinate. Heritable. The identity. */
  s: number;
  domesticated: boolean;
}

export interface Genome {
  /**
   * ORDERED. Never a Set or Map — iteration order is part of reproducibility.
   * Kept sorted by `site` so that structural comparisons are stable.
   */
  copies: Copy[];
  /**
   * ORDERED s-values this genome has captured into piRNA clusters.
   *
   * KEPT SORTED ASCENDING. `sim/silencing.ts`'s `isSilenced` binary-searches
   * this array and tests only the insertion point's two neighbours, which is
   * exact for any sorted array and WRONG, SILENTLY, for an unsorted one — no
   * count, no colour and no picture in this project would look different.
   * `sim/phases/trap.ts` is the only place an entry is ever added and it
   * inserts at the sorted position; `sim/phases/reproduce.ts` copies the array
   * wholesale into each daughter, which preserves order; nothing anywhere
   * removes one. `tests/trap.test.ts` asserts the invariant over real
   * generations and demonstrates the check failing on an out-of-order append.
   *
   * The order is also STATE, not an implementation detail: `sim/observe.ts`'s
   * `stateHash` digests this array positionally. It is NOT part of golden hash
   * `9c15fd28` — that configuration never holds more than one entry per genome,
   * so it is blind to this array's order; the second pin in
   * `tests/step.test.ts` is the one that reads it.
   */
  repertoire: number[];
}

export interface World {
  genomes: Genome[];
  params: Params;
  rng: Rng;
  generation: number;
  nextCopyId: number;
}

/** Cluster sites occupy a contiguous span at the start of the genome. */
export function isClusterSite(site: number, p: Params): boolean {
  return site < Math.floor(p.c * p.S);
}

/** Beneficial sites occupy a contiguous span at the end of the genome. */
export function isBeneficialSite(site: number, p: Params): boolean {
  return site >= p.S - Math.floor(p.beta * p.S);
}

/**
 * Every genome starts with exactly one copy at rate r0 and sequence coordinate 0,
 * placed in a non-cluster, non-beneficial site. A single founding lineage is what
 * makes families *emerge* rather than being seeded as distinct groups.
 */
export function createWorld(params: Params): World {
  const rng = makeRng(params.seed);
  const firstOrdinary = Math.floor(params.c * params.S);
  const lastOrdinary = params.S - Math.floor(params.beta * params.S);
  const span = lastOrdinary - firstOrdinary;

  const genomes: Genome[] = [];
  let nextCopyId = 0;
  for (let i = 0; i < params.N; i++) {
    const site = firstOrdinary + Math.floor(rng.next() * span);
    genomes.push({
      copies: [
        { id: nextCopyId++, site, r: params.r0, s: 0, domesticated: false },
      ],
      repertoire: [],
    });
  }

  return { genomes, params, rng, generation: 0, nextCopyId };
}
