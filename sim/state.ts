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
  /** ORDERED s-values this genome has captured into piRNA clusters. */
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
