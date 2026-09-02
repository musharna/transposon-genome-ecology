// Shared arms and summary statistics for the Guard 5 exploratory scripts. BASE is
// the same fully pinned 20-field parameter set as tests/guards/rate-evolves.test.ts,
// so the scripts and the guard measure the same model.
import type { Params } from "../sim/index.js";
import type { World } from "../sim/index.js";

export const BASE: Params = {
  N: 300,
  S: 2000,
  c: 0.01,
  r0: 0.1,
  rMax: 1,
  sigmaR: 0.15,
  sigmaS: 0.02,
  theta: 0.1,
  v: 0.02,
  a: 0.002,
  b: 0.0002,
  d: 0,
  dTol: 0,
  t: 0,
  beta: 0.005,
  pDom: 0,
  wDom: 0,
  sexual: true,
  silencingOn: false,
  seed: 101,
};

/** The four arms the guard's thresholds are derived from. One knob each. */
export const ARMS: Record<string, Partial<Params>> = {
  ON: { sigmaR: 0.15 },
  OFF: { sigmaR: 0 },
  NEUTRAL: { a: 0, b: 0 },
  STRONG: { a: 0.02, b: 0.002 },
};

export interface ArmStats {
  n: number;
  mean: number;
  /** Geometric mean — unbiased under the multiplicative drift r inherits. */
  geo: number;
  /** Mean copies per genome as a fraction of S. */
  occ: number;
  /** Copies whose r is bit-identical to r0. */
  exact: number;
}

export function stats(world: World): ArmStats {
  let n = 0;
  let sum = 0;
  let logSum = 0;
  let exact = 0;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      n++;
      sum += copy.r;
      logSum += Math.log(Math.max(copy.r, Number.MIN_VALUE));
      if (copy.r === world.params.r0) exact++;
    }
  }
  return {
    n,
    mean: n === 0 ? 0 : sum / n,
    geo: n === 0 ? 0 : Math.exp(logSum / n),
    occ:
      world.genomes.length === 0
        ? 0
        : n / world.genomes.length / world.params.S,
    exact,
  };
}
