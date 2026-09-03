/**
 * The Guard 1 arm, defined ONCE.
 *
 * `tests/guards/equilibrium.test.ts` asserts against this arm and
 * `scripts/explore-equilibrium.ts` derives the guard's parameters and thresholds
 * from it. Neither file carries its own copy of `BASE`, `ARMS`, `SEEDS`,
 * `GENERATIONS`, `HIGH_COPY_START` or either window, so the sweep cannot
 * silently stop describing the guard — the Task 11 pattern
 * (`tests/guards/escape-arm.ts`), reused here for the same reason.
 *
 * This file lives under `tests/` so `tsconfig.json`'s `include` typechecks it,
 * and therefore typechecks `BASE` against `Params`, which `scripts/` is not. It
 * does NOT end in `.test.ts`, and `vitest.config.ts`'s `include` is
 * `["tests/**\/*.test.ts"]`, so vitest never collects it — verified in this task
 * by test-file count (14 files before, 15 after, not 16), not assumed. It is
 * NOT in `tools/`: nothing production or browser-facing consumes the
 * Charlesworth null arm, and Task 14's rule is one-way — tests may import
 * production code, production code must never import tests.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GUARD ASSERTS, AND WHY IT IS NOT A NUMBER
 * ---------------------------------------------------------------------------
 * `docs/charlesworth-1983-equilibrium.md` records the paper as read from the OA
 * PDF. Its fitness form is `w_n = 1 - s*n^t` (eq. 23, p. 13), its balance
 * condition is `-d ln w_n/dn ~ u - v` (eq. 29, p. 16) and its necessary
 * condition for an interior equilibrium is `d2 ln w_n/dn2 < 0` (p. 11).
 *
 * Substituting our `ln w = -(a*n + b*n^2)` into eq. (29) gives
 * `n_bar = (r - v - a)/(2b) = 48` at these coefficients. THAT PREDICTION IS
 * WRONG — measured here it is 26.8 — and the reason is structural, not a
 * miscalibration: Charlesworth's model is DIPLOID, ours is haploid, and
 * `sim/phases/reproduce.ts` deduplicates sites inherited from both parents.
 * That dedup is a copy sink with no counterpart in the null model, and it is
 * relatedness-dependent, so it has no fixed analytic value. ARM 3 of the sweep
 * shows it directly: the same arm equilibrates at 19.2 copies per genome at
 * N = 100, 26.8 at N = 200 and 31.3 at N = 400. A quantity that moves with N is
 * not a constant of the fitness function.
 *
 * So the guard asserts the paper's QUALITATIVE predictions, each against the
 * negative control the paper itself supplies — see `ARMS`. Calibrating a
 * numeric equilibrium off our own simulation instead would be circular: a
 * constant read from the artifact under test cannot falsify that artifact.
 *
 * Every numeric figure quoted in this file was measured by
 * `scripts/explore-equilibrium.ts` in this task, on this machine, at the commit
 * this file is committed in. No figure here is restated from the task brief,
 * the controller addendum or the Charlesworth doc without having been
 * re-derived. No wall-clock time is quoted except where cost is the stated
 * reason for a choice: run times are machine-dependent and do not reproduce.
 * Occupancy does.
 */
import {
  createWorld,
  defaultParams,
  observe,
  run,
  type Params,
  type Snapshot,
  type World,
} from "../../sim/index.js";

/**
 * The Charlesworth null regime, fully pinned — all 20 fields, nothing inherited
 * from `defaultParams`' provisional values, because a guard's configuration is
 * part of the guard.
 *
 * `BASE` IS the quadratic arm: it is the only one of the three that satisfies
 * the paper's necessary condition for an interior equilibrium
 * (`d2 ln w_n/dn2 = -2b < 0`, p. 11). The other two arms are `BASE` with `b`,
 * or with `a` and `b`, set to zero — see `ARMS`.
 *
 * Why each field is what it is:
 *
 *   - `silencingOn: false`, `pDom: 0` — `sim/step.ts` documents phases 1, 4, 5
 *     and 6 as the Charlesworth model, with phase 2 the piRNA trap and phase 3
 *     domestication. These two switches disable exactly phases 2 and 3, which
 *     is what "reduces to Charlesworth & Charlesworth 1983" means operationally.
 *     The guard checks the reduction actually happened rather than trusting it:
 *     measured, `silencedCopies` and `domesticatedCopies` are 0 in all fifteen
 *     arm-by-seed runs at the horizon.
 *   - `c: 0`, `beta: 0`, `wDom: 0` — no cluster span for a repertoire to form in
 *     and no beneficial span for a copy to be co-opted into, so the trap and
 *     domestication are off structurally as well as by switch.
 *   - `sigmaR: 0` — MANDATORY, and not in the original brief's `pre` block.
 *     Charlesworth's transposition rate `u` is a CONSTANT (p. 11: "the
 *     probabilities of both transposition and loss are constants"). Ours is a
 *     heritable per-copy trait and it does not sit still. Measured here (ARM 5
 *     of the sweep, NONE arm, seed 1): at `sigmaR: 0.1`, mean `r` goes
 *     0.056 -> 0.068 -> 0.122 -> 0.852 at generations 50/100/150/200 and the
 *     genome is at 75.0% occupancy by generation 200. At `sigmaR: 0` mean `r`
 *     is exactly 0.050 at every mark. With `sigmaR > 0` there is no fixed `r`
 *     for a transposition-selection balance to be a balance OF, and the run
 *     saturates instead of equilibrating.
 *   - `sigmaS: 0`, `theta: 0` — the sequence-identity machinery. In an
 *     unsilenced world nothing ever reads `s` back (Guard 4's invariance test
 *     pins exactly this), so both are inert here; they are pinned to zero
 *     anyway so the arm reads as what it is. `transpose` calls `rng.normal()`
 *     unconditionally, so zeroing them does not move the RNG stream.
 *   - `d: 0`, `dTol: 0`, `t: 0` — the paper's selection is on copy number
 *     alone. Our damage terms are an addition to the null model, not part of
 *     it, and `damageLoad` is identically zero here.
 *   - `sexual: true` — load-bearing, not stylistic. The paper assumes random
 *     mating and free recombination. Measured (ARM 4, seed 1, same parameters
 *     otherwise): run asexually the NONE arm reaches 964 copies per genome —
 *     48.2% occupancy — by generation 150 and is still climbing, the LINEAR arm
 *     goes EXTINCT (0 copies at generation 300), and the QUADRATIC arm settles
 *     at 405.5 copies per genome, 16x its sexual value of 24.7. None of the
 *     three is the model the paper analyses.
 *   - `r0: 0.05`, `v: 0.001`, `rMax: 1` — transposition and excision. The
 *     paper's `f(0) < u - v` condition for copy number to increase from zero
 *     (p. 11) is `r0 > v + a` here: 0.05 > 0.002, with room.
 *   - `a: 0.001`, `b: 0.0005` — the current `defaultParams` values, UNCHANGED.
 *     `sim/params.ts` is not touched by this task: every other guard in the
 *     suite is calibrated against those defaults and the golden hash `9c15fd28`
 *     in `tests/step.test.ts` pins the number of RNG draws consumed.
 *   - `N: 200` — see `N_SWEEP`. `S: 2000` — at the horizon the largest arm sits
 *     at 15.70% occupancy (ARM 1), far below where `transpose`'s rejection
 *     sampler starts costing several draws per insertion.
 */
export const BASE: Params = {
  N: 200,
  S: 2000,
  c: 0,
  r0: 0.05,
  rMax: 1,
  sigmaR: 0,
  sigmaS: 0,
  theta: 0,
  v: 0.001,
  a: 0.001,
  b: 0.0005,
  d: 0,
  dTol: 0,
  t: 0,
  beta: 0,
  pDom: 0,
  wDom: 0,
  sexual: true,
  silencingOn: false,
  seed: 1,
};

/**
 * The three arms. They differ in `a` and `b` AND NOTHING ELSE, so the only
 * mechanism that can separate them is the shape of the copy-number load —
 * which is exactly what the paper's argument is about.
 *
 *   NONE      `ln w = 0`              no host selection on copy number at all.
 *   LINEAR    `ln w = -a*n`, i.e. `w = (e^-a)^n` — EXACTLY the independent-
 *                                     effects multiplicative model the paper
 *                                     rules out (p. 12: fitness "must fall off
 *                                     more steeply with n than does a
 *                                     multiplicative function w_n = (1-s)^n").
 *                                     `d2 ln w/dn2 = 0`, so it fails the p. 11
 *                                     condition.
 *   QUADRATIC `ln w = -(a*n + b*n^2)`  `d2 ln w/dn2 = -2b < 0`: the p. 11
 *                                     condition holds, and holds ONLY because
 *                                     of the `b` term.
 *
 * Both controls come from the paper, not from this simulation. NONE is the
 * no-selection baseline its `f(0) < u - v` argument is about; LINEAR is the
 * case it argues on pp. 12-13 is not viable.
 *
 * MEASURED at the horizon, five seeds, from the default one-copy start
 * (ARM 1 of the sweep), copies per genome:
 *
 *   arm        seed1  seed2  seed3  seed4  seed5    mean    min    max
 *   NONE       305.0  313.4  314.0  308.5  299.9   308.2  299.9  314.0
 *   LINEAR     286.8  298.8  300.6  307.2  301.9   299.1  286.8  307.2
 *   QUADRATIC   24.7   28.4   27.1   25.5   28.1    26.8   24.7   28.4
 *
 *   LINEAR    as % of NONE, per seed:  94.0  95.4  95.7  99.6 100.7  (mean 97.0)
 *   QUADRATIC as % of NONE, per seed:   8.1   9.1   8.6   8.3   9.4  (mean  8.7)
 *   LINEAR / QUADRATIC,     per seed:  11.6  10.5  11.1  12.0  10.7  (mean 11.2)
 *
 * A LIMIT ON WHAT THIS LICENSES, and the reason the guard asserts a floor and a
 * ceiling rather than an ordering: at seed 5 the LINEAR arm is ABOVE the NONE
 * arm (301.9 vs 299.9, 100.7%). The per-seed ranges [299.9, 314.0] and
 * [286.8, 307.2] overlap. Linear selection has a small effect that is
 * consistent on the mean (97.0%) but NOT resolvable seed by seed at this
 * horizon, so "NONE > LINEAR at every seed" is asserted nowhere — it is false
 * here. The claim that survives is the comparative one the paper actually
 * supports: a few percent against an order of magnitude.
 */
export const ARMS = {
  NONE: { a: 0, b: 0 },
  LINEAR: { a: 0.001, b: 0 },
  QUADRATIC: { a: 0.001, b: 0.0005 },
} as const satisfies Record<string, Partial<Params>>;

export type ArmName = keyof typeof ARMS;
export const ARM_NAMES = ["NONE", "LINEAR", "QUADRATIC"] as const;

/**
 * The horizon: past the knee, on the plateau, and affordable at five seeds.
 *
 * ARM 1 of the sweep runs all three arms at all five seeds to generation 600
 * and reads copies per genome at each of `FLATNESS_MARKS`. Means:
 *
 *   arm         g200   g300   g400   g500   g600
 *   NONE       240.3  308.2  315.1  312.8  314.0
 *   LINEAR     211.0  299.1  305.5  306.7  305.6
 *   QUADRATIC   27.4   26.8   28.2   26.9   26.7
 *
 * g200 is still climbing steeply (NONE 240.3 -> 308.2 over the next hundred
 * generations); g300 onward is flat. At g300 each of NONE and LINEAR sits at
 * 98% of its own g400-g600 level — the SAME 98%, which is why the ratios the
 * guard asserts are not biased by the two arms approaching at different rates:
 * LINEAR/NONE is 97.0% at g300, 97.0% at g400 and 97.3% at g600, and
 * QUADRATIC/NONE is 8.7%, 8.9% and 8.5%.
 *
 * 400 was measured first and rejected on cost, not on science: three arms at
 * five seeds costs 51s of wall clock at g400 against roughly 30s at g300, and
 * `vitest.config.ts` sets a 60s per-test timeout. The alternative — keeping
 * g400 and dropping to three seeds — buys a stronger claim (at g400 the NONE
 * and LINEAR per-seed ranges do NOT overlap) at the price of two seeds. Five
 * seeds at a claim true at both horizons was preferred.
 */
export const GENERATIONS = 300;

/**
 * The seed set every claim in the guard is checked at. No claim rests on one
 * seed, and every threshold is a floor under the weakest of these five or a
 * ceiling over the strongest.
 */
export const SEEDS = [1, 2, 3, 4, 5] as const;

/**
 * Copies per genome the from-above arm is seeded with — an order of magnitude
 * above the QUADRATIC arm's measured equilibrium of 26.8, and 15% of `S`, so
 * `seedHighCopy`'s sites 0..299 all exist and the start is nowhere near
 * saturation.
 *
 * Measured (ARM 2), copies per genome at the horizon:
 *
 *   arm        from below (mean)  from above (mean)  above/below per seed
 *   QUADRATIC       26.8               28.3          1.074 1.041 1.017 1.102 1.056
 *   NONE           308.2              313.7          (means only: 1.018)
 *   LINEAR         299.1              305.7          (means only: 1.022)
 *
 * The two directions agree to within 10.2% at the worst seed. That is the test
 * the brief calls the one that matters, and it is why the guard seeds a high
 * start at all: approaching from below ALONE is not evidence of an equilibrium,
 * and at these parameters a low reading from below can be pure drift (see
 * `N_SWEEP`).
 */
export const HIGH_COPY_START = 300;

/** The marks the sweep's flatness probe reads copy number at. */
export const FLATNESS_MARKS = [200, 300, 400, 500, 600] as const;

/**
 * The horizon and twice the horizon. The stability test asserts copy number is
 * in the same place at both — a stronger statement than "the last quarter did
 * not drift", and the one that separates an equilibrium from a horizon
 * snapshot.
 *
 * Measured |drift| across this window, per seed:
 *
 *   NONE       2.7%  0.3%  0.1%  1.3%  5.3%   max  5.3%
 *   LINEAR     7.2%  1.0%  0.8%  0.6%  1.5%   max  7.2%
 *   QUADRATIC  6.5%  7.5%  6.4%  3.2%  3.8%   max  7.5%
 *
 * The last quarter of this horizon (g225 -> g300) was tried first and rejected:
 * measured, it is 6.9%..14.0% for NONE and 7.9%..28.5% for LINEAR, because at
 * g225 those two arms are still climbing. A stability threshold loose enough to
 * pass a 28.5% climb is a threshold that cannot see a drifting model.
 */
export const STABILITY_WINDOW = [300, 600] as const;

/**
 * A window of the same shape taken from the GROWTH phase, before any arm has
 * plateaued. The stability test's positive control: the same predicate,
 * measured the same way, must FAIL here. Without it, "copy number did not
 * change much" is satisfied by a model that never moves at all.
 *
 * Measured |drift| across this window, per seed:
 *
 *   NONE       684.9%  629.3%  758.6%  931.0%  787.1%   min  629.3%
 *   LINEAR     636.4%  640.7%  899.3%  637.3% 1059.7%   min  636.4%
 *   QUADRATIC  217.2%  117.5%  258.5%  202.6%  225.4%   min  117.5%
 */
export const GROWTH_WINDOW = [75, 150] as const;

/**
 * The population sizes ARM 3 of the sweep contrasts, to establish that the
 * equilibrium the guard asserts is not drift-dominated at `BASE.N`.
 *
 * QUADRATIC arm, five seeds, copies per genome at the horizon:
 *
 *   N     from below (mean)         from above (mean)  above/below  extinct arms
 *    50   3.4 [6.6,10.2,0.0,0.0,0.0]      8.1             2.419          3
 *   100  19.2                            21.4             1.116          0
 *   200  26.8                            28.3             1.057          0
 *   400  31.3                            31.7             1.011          0
 *
 * At N = 50 three of the ten runs lose the element entirely and the two
 * directions differ by a factor of 2.4: that is drift, not an equilibrium, and
 * a guard reading the from-below number there would be reading 0. N = 200 is
 * the smallest swept value at which no run goes extinct AND the two directions
 * agree to better than 10%. N = 400 agrees to 1.1% but costs about twice as
 * much per generation.
 *
 * Note what this table also shows: the equilibrium ITSELF moves with N
 * (19.2 -> 26.8 -> 31.3). That is the relatedness-dependent dedup sink, and it
 * is the second independent reason the guard asserts no number.
 */
export const N_SWEEP = [50, 100, 200, 400] as const;

export interface ArmResult {
  p: Params;
  world: World;
  snapshot: Snapshot;
  /** Copies per genome. `Snapshot.totalCopies` is a POPULATION total. */
  perGenome: number;
  /** Copies per genome as a fraction of S — how close `transpose` is to saturation. */
  occupancy: number;
  /**
   * Copies per genome BEFORE the first generation. The from-above arm's
   * positive control: without it, a `seedHighCopy` that silently did nothing
   * would turn the convergence test into a comparison of two from-below runs.
   */
  startPerGenome: number;
}

/** `BASE` with an arm and `overrides` applied. Costs no generations. */
export function armParams(
  arm: ArmName,
  overrides: Partial<Params> = {},
): Params {
  return defaultParams({ ...BASE, ...ARMS[arm], ...overrides });
}

/**
 * Replace every genome's copies with `k` copies at sites 0..k-1, all at `r0`,
 * `s = 0`, undomesticated — the high-copy start the from-above arm needs.
 *
 * `world.nextCopyId` is advanced past every id minted here. Without that, the
 * ids handed out by `reproduce`'s `cloneCopy` would collide with the seeded
 * ones (this bit Task 11). Copy ids are read by no phase and are excluded from
 * `stateHash`, so a collision would be silent rather than wrong — which is
 * precisely why it is closed here rather than left to be noticed.
 *
 * Consumes NO RNG draws, so a from-above run sees the same stream a from-below
 * run at the same seed sees.
 *
 * Sites 0..k-1 are ordinary sites at `c: 0, beta: 0`: `isClusterSite` is
 * `site < floor(0 * S)`, false everywhere, and `isBeneficialSite` is
 * `site >= S - floor(0 * S)`, also false everywhere. The array is already
 * sorted by `site`, which `Genome.copies` requires.
 */
export function seedHighCopy(world: World, k: number): void {
  const p = world.params;
  for (const g of world.genomes) {
    g.copies = Array.from({ length: k }, (_, i) => ({
      id: world.nextCopyId + i,
      site: i,
      r: p.r0,
      s: 0,
      domesticated: false,
    }));
    world.nextCopyId += k;
  }
}

/** One arm, run to `generations`, observed once. */
export function runArm(
  arm: ArmName,
  overrides: Partial<Params> = {},
  opts: { generations?: number; highCopyStart?: number } = {},
): ArmResult {
  const p = armParams(arm, overrides);
  const world = createWorld(p);
  if (opts.highCopyStart !== undefined) {
    seedHighCopy(world, opts.highCopyStart);
  }
  const startPerGenome =
    observe(world).totalCopies / (world.genomes.length || 1);
  run(world, opts.generations ?? GENERATIONS);
  const snapshot = observe(world);
  const perGenome = snapshot.totalCopies / world.genomes.length;
  return {
    p,
    world,
    snapshot,
    perGenome,
    occupancy: perGenome / p.S,
    startPerGenome,
  };
}

/**
 * One arm, read at each of `marks` (ascending). Used by the sweep's flatness
 * probe and by the guard's stability test, so "flat" is measured the same way
 * in both.
 */
export function runArmMarks(
  arm: ArmName,
  marks: readonly number[],
  overrides: Partial<Params> = {},
  opts: { highCopyStart?: number } = {},
): { p: Params; world: World; perGenome: number[] } {
  const p = armParams(arm, overrides);
  const world = createWorld(p);
  if (opts.highCopyStart !== undefined) {
    seedHighCopy(world, opts.highCopyStart);
  }
  const perGenome: number[] = [];
  let at = 0;
  for (const m of marks) {
    run(world, m - at);
    at = m;
    perGenome.push(observe(world).totalCopies / world.genomes.length);
  }
  return { p, world, perGenome };
}

/**
 * How many copies in the world carry a transposition rate that is not
 * bit-identical to `r`. The guard's check that the paper's constant-`u`
 * assumption actually holds.
 *
 * Asserted on the copies rather than on `Snapshot.meanRate`, and the difference
 * matters: with `sigmaR = 0` every copy's `r` IS exact — `transpose` multiplies
 * by `Math.exp(rng.normal() * 0)`, which is `Math.exp(0)` = 1 exactly — but
 * `meanRate` is a floating-point SUM over tens of thousands of copies divided
 * by their count, and it accumulates error: measured, the NONE arm at seed 1
 * reports `meanRate` = 0.0500000000000382, not 0.05. An exact assertion on that
 * mean is a false claim about the model dressed as a strict one. This function
 * is the assertion the model actually supports.
 */
export function copiesOffRate(world: World, r: number): number {
  let off = 0;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) if (copy.r !== r) off++;
  }
  return off;
}

/** |b - a| / a. The one definition of "drift" the guard and the sweep share. */
export function relDrift(a: number, b: number): number {
  return Math.abs(b - a) / a;
}

/** Arithmetic mean. Used by the guard and the sweep alike. */
export function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
