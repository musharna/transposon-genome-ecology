/**
 * The cluster-size sweep, the CANONICAL Guard 3 arm it sweeps, and the
 * definition of "repression onset" that the guard and the browser's threshold
 * readout share.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ARM LIVES HERE AND NOT IN `tests/`
 * ---------------------------------------------------------------------------
 * `BASE`, `FRACTIONS`, `SEEDS` and `GENERATIONS` are DEFINED in this file and
 * imported from it by `tests/guards/cluster-threshold-arm.ts`, which re-exports
 * them to the guard and to `scripts/explore-cluster-threshold.ts`. There is
 * exactly one definition of the arm and every consumer reaches the same one, so
 * the brief's promise — that the browser readout and the guard "measure the
 * same thing the same way" — is true by construction rather than by convention.
 * A default of `defaultParams()` here would have let the browser silently
 * measure a different model.
 *
 * The direction matters and it is one-way. `tools/` is production code: Tasks
 * 16-19 bundle it for the web, and a production module that imported from
 * `tests/` would drag a test-only module into the browser build. Tests may
 * depend on production code; production code must not depend on tests. So the
 * canonical arm is here, and everything genuinely test-only — the derivation
 * blocks, the reduction ladder, the liveness and occupancy thresholds, the
 * Kofler band the guard asserts against — stays in
 * `tests/guards/cluster-threshold-arm.ts`.
 *
 * `tools/` is inside `tsconfig.json`'s `include`, so this file is typechecked
 * and `BASE` is typechecked against `Params`.
 *
 * Every figure quoted in this file was measured by
 * `scripts/explore-cluster-threshold.ts`, which prints all of them: ARM 1 the
 * guard's own sweep, ARM 2 the three disjoint 11-seed blocks, ARM 2b the
 * sub-sample stability check, ARM 3 the onset-versus-reduction-constant ladder,
 * ARM 4 the horizon probe. No wall-clock time is quoted: run times are
 * machine-dependent and do not reproduce. Occupancy does.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE PARAMETERS AND NOT THE ONES THE PLAN ORIGINALLY SPECIFIED
 * ---------------------------------------------------------------------------
 * The parameter set this guard was first written against (`N: 200, S: 3000,
 * r0: 0.2, sigmaR: 0.02, sigmaS: 0.005, theta: 0.15, v: 0.005, a: 0.0004,
 * b: 0.00001`, 300 generations) has NO graded response to cluster size at all:
 * `c = 0` reaches roughly 1.2e5 copies while EVERY non-zero fraction on the
 * grid — down to `c = 0.001`, two cluster sites in 3000 — ends at exactly zero
 * copies. There is no threshold to locate in a step function from "unbounded"
 * to "sterile", and the guard's first claim ("large clusters beat none") would
 * have been satisfied by `0 < 120000`, which is extinction wearing repression's
 * clothes.
 *
 * The cause is the same one that superseded Guard 4's and Guard 2's original
 * parameters: `theta = 0.15` is thirty times `sigmaS = 0.005`, so a daughter
 * never diverges out of the silencing window, one captured entry silences the
 * whole family, and `lose` then clears the lineage at rate `v` because silenced
 * copies are still excised. Here `sigmaS = 0.1` is 2x `theta = 0.05`, escape by
 * divergence is routine, and repression grades with cluster size instead of
 * switching the family off.
 *
 * These coefficients are Guard 4's, with `c` promoted from a pinned constant to
 * the swept variable. They are NOT imported from `tests/guards/bloat-arm.ts`:
 * `c` is fixed there and swept here, the horizons happen to agree today but
 * answer to different constraints, and the two guards must be able to move
 * independently. They were re-measured in this task rather than inherited — the
 * table on `FRACTIONS` below is this task's, at this task's seeds.
 */
import {
  createWorld,
  defaultParams,
  observe,
  run,
  type Params,
} from "../sim/index.js";

/**
 * Fully pinned — all 20 fields, nothing inherited from `defaultParams`'
 * provisional values, because a guard's configuration is part of the guard.
 *
 * `c` is a PLACEHOLDER here and is overridden at every point of the sweep; it
 * is set to `FRACTIONS[0]` so that a `BASE` used unswept is the no-cluster
 * control rather than an arbitrary fraction.
 *
 * The fields that carry the mechanism:
 *   - `sigmaS = 0.1` against `theta = 0.05`: one transposition moves a
 *     daughter's `s` about two silencing windows, so a captured entry silences
 *     a neighbourhood rather than the family. This is what makes repression
 *     GRADED — with the opposite ratio (Guard 2's arm) it is a switch.
 *   - `r0 = 0.1`, `sigmaR = 0.05`, `rMax = 1`: amplification fast enough to
 *     reach 1.9e4 copies by the horizon in the `c = 0` arm, with a rate that
 *     drifts too little for rate evolution (Guard 5's subject) to be what
 *     separates the arms.
 *   - `v = 0.02`: excision fast enough that repression has something to bite
 *     against, slow enough that no arm on the grid dies (measured minimum 308
 *     copies, at `c = 0.05`, seed 4).
 *   - `a = 0.001, b = 0.00005`: copy-number load deep enough for selection to
 *     bite by the horizon, nowhere near `Math.exp` underflow.
 *   - `d = 0` and `dTol = 0` and `t = 0`: no per-silenced-copy fitness cost and
 *     no tolerance branch, so cluster size acts on copy number through ONE
 *     route — a silenced copy does not transpose — and not also through
 *     selection against silenced copies. `t = 0` additionally makes `trap`
 *     capture unconditionally, so the only thing standing between a cluster
 *     site and a repertoire entry is whether a copy landed there.
 *   - `beta = 0`, `pDom = 0`, `wDom = 0`: no beneficial span and no
 *     domestication, which is the other way a copy escapes silencing. With
 *     `pDom = 0`, `domesticatedCopies` is 0 everywhere and `activeCopies` and
 *     `silencedCopies` do partition `totalCopies` in this arm — they do NOT in
 *     general (`sim/silencing.ts` excludes domesticated copies from both).
 *   - `N = 100`: the sweep is 8 fractions x 11 seeds, so the population size is
 *     a cost decision. 100 genomes still give 1.9e4 copies in the control arm.
 */
export const BASE: Params = {
  N: 100,
  S: 2000,
  c: 0,
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
 * The cluster fractions swept, and the reason the grid looks like this.
 *
 * `isClusterSite` is `site < Math.floor(c * S)`, so at `S = 2000` these eight
 * fractions are 0, 2, 4, 10, 20, 40, 60 and 100 cluster sites. The grid must be
 * able to express BOTH failure directions of the band check the guard applies:
 * `0.001` sits
 * strictly under Kofler's 0.2% floor and `0.05` strictly over its 3% ceiling,
 * with five points inside. A grid whose points were all inside the band could
 * not fail the guard's second test at all.
 *
 * The onset is quantised to this grid — it is "the smallest fraction ON THIS
 * GRID achieving the reduction", not a continuous root. Refining the grid can
 * only move an onset downward, never upward.
 *
 * Measured at `SEEDS` and `GENERATIONS` (ARM 1 of
 * `scripts/explore-cluster-threshold.ts`), total copies at the horizon:
 *
 *   c        sites   mean     %of c=0   weakest seed   min silenced   min fwr
 *   0            0   19296.4    100.0          13338              0      0.00
 *   0.001        2   16248.7     84.2          11619           2664      0.88
 *   0.002        4   13364.9     69.3          10376           3337      1.00
 *   0.005       10   10606.2     55.0           7005           2639      1.00
 *   0.01        20    6944.5     36.0           5681           1868      1.00
 *   0.02        40    3503.6     18.2           1896           1037      1.00
 *   0.03        60    2799.2     14.5            449             99      1.00
 *   0.05       100    1393.7      7.2            308            191      1.00
 *
 * Successive step ratios on the means are 0.842, 0.823, 0.794, 0.655, 0.505,
 * 0.799, 0.498 — every one below 1, the weakest (the first) by 15.8%.
 *
 * MONOTONICITY IS A CLAIM ABOUT THE MEANS AND NOT ABOUT THE SEEDS. Measured
 * over all 33 seeds of the three blocks, 20 of 33 individual seed series
 * contain at least one up-step (ARM 2 prints each one; seed 9 has four). The
 * guard asserts monotonicity on `meanFinalCopies` only, and asserts LIVENESS
 * per seed. Anyone reading the monotone assertion as "copy number falls with
 * cluster size at every seed" is over-reading it — that is false here.
 */
export const FRACTIONS = [0, 0.001, 0.002, 0.005, 0.01, 0.02, 0.03, 0.05];

/**
 * The seeds pooled into the guard's sweep. Eleven, and the count is derived
 * rather than conventional.
 *
 * At THREE seeds the guard would be flaky. The quantity being thresholded is a
 * mean of runs whose seed-to-seed spread is wide — at `c = 0` the guard's own
 * eleven seeds range 13338..22511, a 1.69x spread — and three draws do not pin
 * its ratio to the control arm tightly enough to keep the crossing inside the
 * band. ARM 2b of the script repools the 33 measured seeds into every disjoint
 * 3-seed triple and into the three disjoint 11-seed blocks, and counts the
 * sub-samples whose onset leaves Kofler's band:
 *
 *   reduction    out of band at 3 pooled seeds    out of band at 11
 *      20%             2 of 11 triples                 0 of 3 blocks
 *      25%             1 of 11                         0 of 3
 *   30%..80%           0 of 11                         0 of 3
 *      85%             4 of 11                         0 of 3
 *
 * So a three-seed guard asserting this window goes red at roughly one triple in
 * five at the window's lower edge and at four in eleven at its upper edge,
 * while at eleven pooled seeds no block leaves the band anywhere in the window.
 * Eleven is a count measurement supports, not a convention.
 *
 * WHAT IS STABLE AT ELEVEN SEEDS IS BAND MEMBERSHIP, NOT THE ONSET ITSELF. The
 * three blocks disagree on the onset's VALUE at two of the fourteen asserted
 * constants — at 30% they give 0.002 / 0.002 / 0.005 and at 65% they give
 * 0.02 / 0.01 / 0.01, each a single step of `FRACTIONS`, each still inside the
 * band. The guard therefore asserts membership and never a value, and anyone
 * reading "the onset of this arm is 0.002" is over-reading it.
 *
 * Contiguous 1..11 rather than the curated seed sets the other guards use,
 * because the point here is three EQUAL-SIZED DISJOINT blocks: a stability
 * check that used a curated block against two leftover blocks would be
 * comparing samples of different provenance.
 */
export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * The horizon.
 *
 * Bounded from BELOW by needing a spread that a threshold can live in: the
 * `c = 0` arm must have amplified far past its single founding copy, and the
 * repressed arms must have separated from it. Bounded from ABOVE by the
 * `c = 0` arm, which is the largest and therefore the most expensive — with
 * `transpose` rejection-sampling an empty site, cost per insertion is roughly
 * `S/(S - occupied)` draws and degrades sharply near saturation.
 *
 * Measured (ARM 4), `c = 0` mean copies and site occupancy at the guard's
 * seeds: 7812 / 3.9% at generation 80, 15885 / 7.9% at 100, 19296 / 9.6% at
 * 120, 22049 / 11.0% at 160. So 120 sits at a tenth of saturation, a 4x margin
 * under the occupancy ceiling the guard asserts (`OCCUPANCY_CEILING` in
 * `tests/guards/cluster-threshold-arm.ts`), and one sweep is seconds rather
 * than minutes.
 *
 * THE HORIZON IS LOAD-BEARING FOR THE ENDPOINTS OF THE GUARD'S REDUCTION
 * LADDER (`REDUCTION_PERCENTS` in `tests/guards/cluster-threshold-arm.ts`), and
 * that is a stated limit, not a hidden one. ARM 4 reruns the whole ladder at
 * 80, 100, 120 and 160 generations. The window over which the onset stays in
 * band moves with the horizon:
 *
 *   horizon   in-band reduction window (5% steps, ladder 5%..95%)
 *      80      5% .. 75%     (80% is already out: onset 0.05)
 *     100     10% .. 85%
 *     120     20% .. 85%     <- this guard
 *     160     20% .. 80%     (85% is out: onset 0.05)
 *
 * Two things move with the horizon and they move in opposite directions: a
 * shorter run has not yet let the small-cluster arms separate from the control,
 * so the window opens LOWER (at generation 80 even a 5% reduction first happens
 * at `c = 0.002`), while a longer run drives the large-cluster arms further
 * down, so the window closes EARLIER at the top.
 *
 * The intersection — 20% through 75% — is in band at all four horizons. The
 * guard asserts the wider 20%..85% because it is pinned at generation 120 and
 * that is what is true there; the horizon-robust core of the claim is the
 * narrower window, and this paragraph is where that distinction is recorded.
 */
export const GENERATIONS = 120;

export interface SweepPoint {
  /** The cluster fraction this point was run at. */
  c: number;
  /** Mean total copies at the horizon, over `seeds`. */
  meanFinalCopies: number;
  /**
   * Per-seed total copies at the horizon, in `seeds` order.
   *
   * The mean alone cannot support a liveness control: a mean of several
   * thousand is satisfied by ten live seeds and one extinct one, and
   * extinction masquerading as repression is precisely the failure this guard
   * has to exclude. Ordered, never a Set — iteration order is reproducible
   * state in this project.
   */
  finalCopies: number[];
  /** Per-seed silenced copies at the horizon, in `seeds` order. */
  finalSilencedCopies: number[];
  /**
   * Per-seed fraction of genomes holding a non-empty piRNA repertoire, in
   * `seeds` order. At `c = 0` this is 0 by construction — `isClusterSite` is
   * `site < Math.floor(0 * S)`, false everywhere, so `trap` never captures —
   * which is what makes the `c = 0` arm a knockout rather than a small cluster.
   */
  finalFractionWithRepertoire: number[];
}

/**
 * Mean final copy number across seeds, for each cluster fraction, plus the
 * per-seed values the guard's controls need.
 *
 * `base` defaults to the Guard 3 arm and exists so a caller can sweep `c`
 * against a different parameter set without reimplementing the sweep; every
 * point overrides `base.c` and `base.seed`.
 *
 * Cost note: `transpose` rejection-samples an empty site, so a run costs
 * roughly `S/(S - occupied)` draws per insertion. The `c = 0` arm is the
 * largest and therefore the most expensive point of any sweep; the arm module's
 * `OCCUPANCY_CEILING` is what keeps it away from the regime where that
 * degrades.
 */
export function sweepClusterSize(
  fractions: readonly number[],
  seeds: readonly number[],
  generations: number,
  base: Params = BASE,
): SweepPoint[] {
  return fractions.map((c) => {
    const finalCopies: number[] = [];
    const finalSilencedCopies: number[] = [];
    const finalFractionWithRepertoire: number[] = [];
    let sum = 0;
    for (const seed of seeds) {
      const w = createWorld(defaultParams({ ...base, c, seed }));
      run(w, generations);
      const s = observe(w);
      finalCopies.push(s.totalCopies);
      finalSilencedCopies.push(s.silencedCopies);
      finalFractionWithRepertoire.push(s.fractionWithRepertoire);
      sum += s.totalCopies;
    }
    return {
      c,
      meanFinalCopies: seeds.length === 0 ? 0 : sum / seeds.length,
      finalCopies,
      finalSilencedCopies,
      finalFractionWithRepertoire,
    };
  });
}

/**
 * The repression onset: the smallest NON-ZERO cluster fraction on `points`
 * whose mean copy number falls below `1 - reduction` times the `c = 0` arm's.
 *
 * Defined once, here, because it is the quantity the guard asserts a band on
 * AND the quantity the browser readout displays; two implementations of it
 * would be two definitions of the guard's subject.
 *
 * Returns `undefined` when no fraction on the grid achieves the reduction —
 * a real outcome (measured at a 95% reduction), not an error. The onset is
 * quantised to the grid `points` was swept over; refining the grid can only
 * move it downward.
 *
 * Requires a `c === 0` point to compare against and throws without one, rather
 * than silently treating the smallest swept fraction as the control: a sweep
 * that lost its control arm must not quietly return an onset measured against
 * an already-repressed baseline.
 */
export function repressionOnset(
  points: readonly SweepPoint[],
  reduction: number,
): SweepPoint | undefined {
  const none = points.find((p) => p.c === 0);
  if (none === undefined) {
    throw new Error(
      "repressionOnset: the sweep has no c = 0 arm, so there is no baseline to measure a reduction against",
    );
  }
  const threshold = (1 - reduction) * none.meanFinalCopies;
  return points.find((p) => p.c > 0 && p.meanFinalCopies < threshold);
}
