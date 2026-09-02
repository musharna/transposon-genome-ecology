/**
 * The Guard 4 arm, defined ONCE.
 *
 * `tests/guards/bloat.test.ts` asserts against this arm and
 * `scripts/explore-bloat.ts` derives the guard's parameters and thresholds from
 * it. Neither file carries its own copy of `BASE`, `SEEDS` or `GENERATIONS`, so
 * the sweep cannot silently stop describing the guard — the Task 11 pattern
 * (`tests/guards/escape-arm.ts`), reused here for the same reason.
 *
 * This file lives under `tests/` so `tsconfig.json`'s `include` typechecks it,
 * and therefore typechecks `BASE` against `Params`, which `scripts/` is not.
 * It does NOT end in `.test.ts`, and `vitest.config.ts`'s `include` is
 * `["tests/**\/*.test.ts"]`, so vitest never collects it — verified by test-file
 * count (11 files before this task, 12 after, not 13), not assumed.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE PARAMETERS AND NOT THE ONES THE PLAN ORIGINALLY SPECIFIED
 * ---------------------------------------------------------------------------
 * The parameter set this guard was first written against
 * (`N: 200, S: 2000, c: 0.02, r0: 0.15, sigmaR: 0.05, sigmaS: 0.01,
 * theta: 0.1, v: 0.01, a: 0.0005, b: 0.00002`, 250 generations) STERILISES the
 * silenced arm. Re-measured in this task at seed 1: copies per genome fall
 * 6 -> 1 -> 0 at generations 50/100/150 and the arm is extinct (0 copies,
 * 0 silenced) by generation 250, while the knockout arm reaches 1489 copies
 * per genome — 74.4% site occupancy — in 31 seconds for that single run.
 * A `meanOff > meanOn` comparison in that regime is satisfied by the control
 * arm being DEAD, which is extinction masquerading as the effect.
 *
 * The cause is that `sigmaS = 0.01` is far smaller than `theta = 0.1`, so
 * descendants never diverge out of the silencing window: one captured
 * repertoire entry silences the whole family at once, silenced copies cannot
 * transpose, and excision then clears the lineage. Here `sigmaS = 0.1` is
 * 2x `theta = 0.05`, so a single transposition step moves a daughter's `s`
 * about two window-widths on average and escape by divergence is routine —
 * the mechanism Guard 6 isolates, running the other way. The silenced arm
 * settles at 39.3..105.0 copies per genome across the eleven seeds instead of
 * dying, and the knockout arm at 162.7..276.3 (8.1%..13.8% occupancy),
 * well below the occupancy where `transpose`'s rejection sampler degrades.
 *
 * Every figure above and below was measured in this task by
 * `scripts/explore-bloat.ts`, which prints all of them.
 */
import {
  createWorld,
  defaultParams,
  observe,
  run,
  stateHash,
  type Params,
  type Snapshot,
  type World,
} from "../../sim/index.js";

/**
 * Fully pinned — all 20 fields, nothing inherited from `defaultParams`'
 * provisional values, because a guard's configuration is part of the guard.
 *
 * The two arms differ in `silencingOn` AND NOTHING ELSE, so the only mechanism
 * that can separate them is that a silenced copy does not transpose. Everything
 * that would give silencing a SECOND route to copy number is pinned off:
 * `d = 0` removes the per-silenced-copy fitness cost (with `d > 0` the silenced
 * arm would also be selected against, and the guard could not say which route
 * produced the direction), `dTol = 0` and `t = 0` remove the tolerance branch,
 * `pDom = 0`, `beta = 0` and `wDom = 0` remove domestication — which is the
 * other way a copy escapes silencing.
 *
 * `c = 0.01` gives 20 cluster sites in 2000; `beta = 0` makes
 * `isBeneficialSite` (`site >= S - floor(0 * S)`, i.e. `site >= S`) false
 * everywhere, so the whole genome outside the cluster span is ordinary.
 * `a = 0.001, b = 0.00005` keep the copy-number load at the horizon around
 * `exp(-3)` in the knockout arm — deep enough for selection to bite, nowhere
 * near the `Math.exp` underflow regime documented on `relativeFitness`.
 */
export const BASE: Params = {
  N: 100,
  S: 2000,
  c: 0.01,
  r0: 0.1,
  rMax: 1,
  sigmaR: 0.05,
  sigmaS: 0.1,
  theta: 0.05,
  v: 0.02,
  a: 0.001,
  b: 0.00005,
  d: 0,
  dTol: 0,
  t: 0,
  beta: 0,
  pDom: 0,
  wDom: 0,
  sexual: true,
  silencingOn: true,
  seed: 1,
};

/**
 * The horizon. Long enough that both arms have grown far past their single
 * founding copy and separated cleanly (silenced 39.3..105.0 copies per genome,
 * knockout 162.7..276.3, no overlap across the eleven seeds), short enough that
 * the knockout arm stays at 8.1%..13.8% occupancy and the whole guard file runs
 * in seconds.
 *
 * This is a FIXED-HORIZON comparison, not an equilibrium one — neither arm has
 * plateaued at generation 120. Measured beyond it, the direction still held at
 * every seed and mark checked (140/160/180/200/240) but the margin narrows
 * (at seed 17, generation 200: 184 vs 212 copies per genome) and the knockout
 * arm becomes erratic — at seed 1, generation 240 it reaches 1473 copies per
 * genome, 74% occupancy, where the rejection sampler in `transpose` costs
 * several draws per insertion. The guard therefore pins 120 rather than running
 * to a plateau that this model, at these coefficients, does not reach cheaply.
 */
export const GENERATIONS = 120;

/**
 * The seed set every claim is checked at. 1..17 are small values; 101 and 202
 * are the seeds the Guard 5 and Guard 6 sweeps already use. No claim in the
 * guard rests on a single seed.
 */
export const SEEDS = [1, 2, 3, 4, 5, 7, 11, 13, 17, 101, 202] as const;

/**
 * The three seeds the invariance test uses. Invariance is exact rather than
 * statistical, so it needs replication against arithmetic accident, not
 * statistical power; three streams at six runs each keeps the file fast.
 */
export const INVARIANCE_SEEDS = [1, 5, 101] as const;

/** The two `sigmaS` values the invariance test contrasts. `BASE.sigmaS` is LO. */
export const SIGMA_S_LO = BASE.sigmaS;
export const SIGMA_S_HI = 0.5;

/** The two `theta` values the invariance test contrasts. `BASE.theta` is LO. */
export const THETA_LO = BASE.theta;
export const THETA_HI = 0.9;

export interface ArmResult {
  p: Params;
  world: World;
  snapshot: Snapshot;
  /** Copies per genome. `Snapshot.totalCopies` is a POPULATION total. */
  perGenome: number;
  /** Copies per genome as a fraction of S — how close `transpose` is to saturation. */
  occupancy: number;
  /** Structural digest, which unlike the snapshot DOES see `s`. */
  hash: string;
}

/**
 * `BASE` with `overrides` applied. Separated from `runArm` so a caller can
 * inspect an arm's configuration without paying for its 120 generations.
 */
export function armParams(overrides: Partial<Params>): Params {
  return defaultParams({ ...BASE, ...overrides });
}

/** `BASE` with `overrides` applied, `GENERATIONS` steps, then one observation. */
export function runArm(overrides: Partial<Params>): ArmResult {
  const p = armParams(overrides);
  const world = createWorld(p);
  run(world, GENERATIONS);
  const snapshot = observe(world);
  const perGenome = snapshot.totalCopies / world.genomes.length;
  return {
    p,
    world,
    snapshot,
    perGenome,
    occupancy: perGenome / p.S,
    hash: stateHash(world),
  };
}
