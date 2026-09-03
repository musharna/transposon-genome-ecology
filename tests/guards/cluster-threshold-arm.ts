/**
 * The Guard 3 arm, defined ONCE.
 *
 * `tests/guards/cluster-threshold.test.ts` asserts against this arm,
 * `tools/sweep-cluster-size.ts` takes `BASE` as the model it sweeps, and
 * `scripts/explore-cluster-threshold.ts` derives every threshold below from it.
 * No file carries its own copy of `BASE`, `FRACTIONS`, `SEEDS` or
 * `GENERATIONS`, so the sweep cannot silently stop describing the guard — the
 * Task 11/12/13 pattern (`tests/guards/escape-arm.ts`,
 * `tests/guards/bloat-arm.ts`, `tests/guards/three-phases-arm.ts`), reused here
 * for the same reason.
 *
 * This file lives under `tests/` so `tsconfig.json`'s `include` typechecks it,
 * and therefore typechecks `BASE` against `Params`. It does NOT end in
 * `.test.ts`, and `vitest.config.ts`'s `include` is `["tests/**\/*.test.ts"]`,
 * so vitest never collects it — verified in this task by test-file count
 * (13 files before, 14 after, not 15), not assumed.
 *
 * `tools/sweep-cluster-size.ts` imports `BASE` from here rather than declaring
 * its own default. That is the same direction `scripts/explore-bloat.ts` and
 * `scripts/explore-three-phases.ts` already import their arms, and it is what
 * makes the brief's promise — that the browser's threshold readout and this
 * guard "measure the same thing the same way" — true by construction instead of
 * by convention. A default of `defaultParams()` in `tools/` would have let the
 * browser silently measure a different model.
 *
 * Every figure in this file and in the guard was measured in THIS task by
 * `scripts/explore-cluster-threshold.ts`, which prints all of them: ARM 1 the
 * guard's own sweep, ARM 2 the three disjoint 11-seed blocks, ARM 3 the
 * onset-versus-reduction-constant ladder, ARM 4 the horizon probe. No
 * wall-clock time is quoted anywhere in the guard: run times are
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
 * the swept variable. They are NOT imported from `./bloat-arm.js`: `c` is fixed
 * there and swept here, the horizons happen to agree today but answer to
 * different constraints, and the two guards must be able to move
 * independently. They were re-measured in this task rather than inherited — the
 * table on `FRACTIONS` below is this task's, at this task's seeds.
 */
import type { Params } from "../../sim/index.js";

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
 * able to express BOTH failure directions of the band check below: `0.001` sits
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
 * The two further disjoint 11-seed blocks the stability check uses. Not used by
 * the guard — used by ARM 2 of `scripts/explore-cluster-threshold.ts`, and
 * defined here so the block check and the guard cannot drift onto different
 * arms.
 */
export const BLOCK_2 = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
export const BLOCK_3 = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];

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
 * under the `OCCUPANCY_CEILING` below, and one sweep is seconds rather than
 * minutes.
 *
 * THE HORIZON IS LOAD-BEARING FOR THE ENDPOINTS OF `REDUCTION_PERCENTS`, and
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

/**
 * Kofler 2020's published band for the cluster fraction at which repression
 * establishes: 0.2% to 3% of the genome. The guard's second test asserts that
 * the measured onset lies inside it; `FRACTIONS` carries a grid point strictly
 * outside on each side so that assertion can fail in both directions.
 *
 * This is a band on a published quantity, not a calibration of this model. The
 * model's coefficients are not Kofler's, and nothing here licenses treating the
 * agreement as a prediction — only as the guard the spec asks for: a model
 * whose threshold sat at 30%, or at nothing at all, is wrong.
 */
export const KOFLER_LO = 0.002;
export const KOFLER_HI = 0.03;

/**
 * "Onset" is the smallest cluster fraction achieving a given fractional
 * REDUCTION in mean copy number against the `c = 0` arm — and that reduction is
 * an arbitrary constant. The brief picked 25%. A claim that holds only at one
 * arbitrary constant is a claim about the constant, and picking the constant
 * that makes it pass is the objection it would deserve.
 *
 * So the guard asserts the band membership at EVERY constant from 20% to 85% in
 * 5% steps — fourteen of them — rather than at one. Measured (ARM 3), onset per
 * constant at each of the three disjoint blocks `SEEDS` / `BLOCK_2` /
 * `BLOCK_3`:
 *
 *   red    blk1    blk2    blk3    in [0.002, 0.03]?
 *    5%   0.001   0.001   0.001    no
 *   10%   0.001   0.001   0.001    no
 *   15%   0.001   0.001   0.002    no
 *   20%   0.002   0.002   0.002    YES
 *   25%   0.002   0.002   0.002    YES
 *   30%   0.002   0.002   0.005    YES
 *   35%   0.005   0.005   0.005    YES
 *   40%   0.005   0.005   0.005    YES
 *   45%   0.005   0.005   0.005    YES
 *   50%   0.010   0.010   0.010    YES
 *   55%   0.010   0.010   0.010    YES
 *   60%   0.010   0.010   0.010    YES
 *   65%   0.020   0.010   0.010    YES
 *   70%   0.020   0.020   0.020    YES
 *   75%   0.020   0.020   0.020    YES
 *   80%   0.020   0.020   0.020    YES
 *   85%   0.030   0.030   0.030    YES
 *   90%   0.050   0.050   0.050    no  (above the band)
 *   95%    none    none    none    no  (off the grid entirely)
 *
 * The window is bounded on BOTH sides and both boundaries are asserted by the
 * guard's third test rather than left as prose. Above 85% the onset rises to
 * `c = 0.05`, over Kofler's ceiling, at all three blocks; at 95% no fraction on
 * the grid suppresses that hard, at any block. Below 20% it falls to
 * `c = 0.001` — two cluster sites in 2000 — under Kofler's floor.
 *
 * THE TWO BOUNDARIES ARE NOT EQUALLY STABLE, and the guard's third test is
 * scoped accordingly. The upper one holds at every block. The lower one does
 * not: at a 15% reduction blocks 1 and 2 give `c = 0.001`, below the band,
 * while block 3 still gives `c = 0.002`, inside it. 15% is excluded from the
 * asserted window because it is not in band at ALL blocks, which is the
 * criterion; the third test's "below the band at 15%" assertion is true at the
 * guard's own pinned seeds and is a statement about them, not about the arm at
 * every seed set.
 *
 * The narrowest margin anywhere inside the asserted window is at its lower
 * edge: at 20%, staying in band requires the `c = 0.001` arm NOT to have fallen
 * below 80% of the control, and at `BLOCK_2` it sits at 80.9% — 0.9 percentage
 * points of room. At the guard's own seeds it is 84.2%, 4.2 points. That is the
 * thinnest number in this guard and it is why the lower boundary is asserted
 * explicitly at 15% rather than assumed to be far away.
 */
export const REDUCTION_PERCENTS = [
  20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85,
];

/**
 * The two constants just outside `REDUCTION_PERCENTS`, kept as permanent
 * negative results and ASSERTED by the guard's third test so the limit of the
 * claim is reproducible rather than remembered: at the guard's seeds, at 15%
 * the onset is `c = 0.001` (below `KOFLER_LO`), at 90% it is `c = 0.05` (above
 * `KOFLER_HI`), and at 95% no fraction on the grid reaches the reduction at
 * all. See `REDUCTION_PERCENTS` for which of these hold at the other two blocks
 * and which do not.
 */
export const REDUCTION_BELOW_BAND = 15;
export const REDUCTION_ABOVE_BAND = 90;
export const REDUCTION_UNREACHABLE = 95;

/**
 * The liveness floor, asserted PER SEED at every fraction. One copy per genome
 * in a population of `BASE.N = 100`, so this is "the family still exists as
 * more than a rounding error", not a claim about the size of the effect.
 *
 * Measured minimum over the guard's 8 x 11 grid: 308 copies (`c = 0.05`,
 * seed 4), a 3.08x margin. This is the assertion that goes red on the failure
 * mode that superseded the original parameters, where every non-zero fraction
 * ends at exactly 0.
 */
export const ALIVE_FLOOR = 100;

/**
 * The ceiling on site occupancy in the `c = 0` control arm — the largest and
 * most expensive arm, and the only one at risk. Past roughly 40%, `transpose`'s
 * rejection sampler needs several draws per insertion and the arm reports the
 * sampler's behaviour as much as the model's.
 *
 * Measured maximum over the guard's seeds: 11.3%, at seed 11 (22511 copies in
 * 100 genomes of 2000 sites) — a 3.5x margin. The worst seed anywhere in the
 * 33 measured is seed 17 at 24952 copies, 12.5%, still a 3.2x margin.
 */
export const OCCUPANCY_CEILING = 0.4;

/** The horizons ARM 4 of the derivation script reruns the whole ladder at. */
export const HORIZON_MARKS = [80, 100, 120, 160];
