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
 * per genome — 74.4% site occupancy, where `transpose`'s rejection sampler
 * needs several draws per insertion and one run costs tens of seconds. (No
 * wall-clock figure is quoted anywhere in this guard: it is machine-dependent
 * and does not reproduce. The occupancy is deterministic and does.)
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
 * Every figure above and below was measured in this task and is printed by
 * `scripts/explore-bloat.ts`: ARM 0 the superseded parameters, ARM 1 the guard
 * arm at every seed, ARM 2 the trajectories, ARM 3 the invariance, ARM 4 the
 * horizon probe past `GENERATIONS`, ARM 5 the rejected grid cell, ARM 6 the
 * single-knob fragility probe. No figure in this guard comes from anywhere
 * else, and none is a wall-clock time.
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
 * plateaued at generation 120, and the horizon is load-bearing. ARM 4 of
 * `scripts/explore-bloat.ts` steps HORIZON_SEEDS to 240 and prints copies per
 * genome at each of HORIZON_MARKS:
 *
 *   seed  arm        g120     g140     g160     g180     g200     g240
 *      1  silenced   63.3     69.0     65.6     63.6     94.1    143.0
 *      1  knockout  234.8    246.3    310.7    238.1    212.9   1473.0
 *      5  silenced   56.9     67.6     75.3     97.2    102.6    124.6
 *      5  knockout  219.8    222.2    228.3    169.6    196.3    253.4
 *     17  silenced  105.0    121.2    158.0    175.6    184.1    188.8
 *     17  knockout  276.3    211.6    205.4    158.5    211.7    621.1
 *    101  silenced   39.3     56.3     87.1    104.2    124.3    182.0
 *    101  knockout  169.5    152.8    200.3    234.6    252.6    344.3
 *
 * Read that before extending the horizon. The narrowest knockout/silenced ratio
 * over the four seeds decays 2.63 (g120) -> 1.75 -> 1.30 -> 0.90 -> 1.15 -> 1.89,
 * and at generation 180 THE DIRECTION REVERSES at seed 17: silenced 175.6
 * against knockout 158.5. (An earlier version of this comment claimed the
 * direction held at every seed and mark past the horizon. It does not; that
 * claim was read off a scratch print-out that showed only the raw numbers, and
 * ARM 4 exists so the claim is checkable instead.) Meanwhile the knockout arm
 * becomes erratic and expensive — at seed 1, generation 240 it reaches 1473
 * copies per genome, 74% occupancy, where `transpose`'s rejection sampler needs
 * several draws per insertion. Seven of the eight series above are non-monotone
 * in generation; ARM 4 flags each one.
 *
 * So 120 is not "early enough to be cheap"; it is the mark at which the two
 * arms are cleanly separated at every seed. The guard pins it rather than
 * running to a plateau that this model, at these coefficients, does not reach
 * cheaply — and the guard's claim is scoped to it.
 *
 * ---------------------------------------------------------------------------
 * TWO MORE LIMITS ON WHAT THIS ARM LICENSES
 * ---------------------------------------------------------------------------
 * 1. A NEGATIVE RESULT FROM THE DERIVATION GRID. `NEGATIVE_CELL` — `BASE` with
 *    `c: 0.005, sigmaS: 0.2, theta: 0.02` — does NOT hold the direction at
 *    every seed. Measured by ARM 5 over `NEGATIVE_CELL_SEEDS`: it reverses at
 *    seed 3 (silenced 184.9 vs knockout 176.5) and at seed 5 (227.6 vs 218.8),
 *    while the seven-seed means still point the right way (178.3 vs 188.1,
 *    ratio 1.06). That cell was rejected during derivation; it is kept and
 *    reproduced so the rejection is evidence rather than memory, and because it
 *    shows a MEAN-ONLY comparison passing on a parameter set where the effect is
 *    not reliable — which is why the guard asserts per seed as well.
 *
 * 2. SINGLE-KNOB FRAGILITY. Move `r0` alone from 0.1 to `FRAGILE_R0` (0.15, the
 *    value the guard was originally specified with), changing nothing else, and
 *    the direction reverses at two of the eleven seeds. Measured by ARM 6:
 *    seed 11 (silenced 199.1 vs knockout 191.8) and seed 13 (205.0 vs 194.1);
 *    means still 155.6 vs 228.5. The guard is sound — it asserts at its own
 *    pinned arm, and the reviewer's independent probe reverting r0, v, a, b, c
 *    and N to the plan's values one at a time AND all at once found the
 *    direction intact — but "silencing knockout produces bloat" is a claim
 *    about THIS arm at THIS horizon, not a property of the model at every
 *    nearby coefficient. Anyone reading it more broadly is over-reading it.
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

/**
 * The horizon probe: the marks and seeds ARM 4 of `scripts/explore-bloat.ts`
 * steps to, which is where the figures in `GENERATIONS`' docstring above come
 * from. Defined here rather than in the script so the caveat and the sweep that
 * evidences it cannot drift apart, the same reason `BASE` lives here.
 */
export const HORIZON_MARKS = [120, 140, 160, 180, 200, 240] as const;
export const HORIZON_SEEDS = [1, 5, 17, 101] as const;

/**
 * The one cell of the derivation grid where the direction did NOT hold at every
 * seed, kept as a permanent negative result: `BASE` with these three overrides
 * (`c` halved, `sigmaS` doubled, `theta` more than halved) reverses at one of
 * the seven seeds it was swept at. ARM 5 of `scripts/explore-bloat.ts`
 * reproduces it. See `GENERATIONS`' docstring for what it means.
 */
export const NEGATIVE_CELL: Partial<Params> = {
  c: 0.005,
  sigmaS: 0.2,
  theta: 0.02,
};
export const NEGATIVE_CELL_SEEDS = [1, 2, 3, 4, 5, 7, 11] as const;

/**
 * The single-knob fragility probe: `BASE.r0` replaced by the value the guard was
 * originally specified with, everything else untouched. ARM 6 of
 * `scripts/explore-bloat.ts` reproduces it.
 */
export const FRAGILE_R0 = 0.15;

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
