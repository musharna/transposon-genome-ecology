/**
 * The Guard 3 arm as the guard sees it: a re-export of the CANONICAL arm plus
 * the thresholds that are genuinely test-only.
 *
 * `BASE`, `FRACTIONS`, `SEEDS` and `GENERATIONS` are NOT defined here. They are
 * defined in `tools/sweep-cluster-size.ts` — production code, the module the
 * browser's threshold readout calls — and re-exported below so that
 * `tests/guards/cluster-threshold.test.ts` and
 * `scripts/explore-cluster-threshold.ts` import the arm from one place, as
 * `escape-arm.ts`, `bloat-arm.ts` and `three-phases-arm.ts` do. There is still
 * exactly ONE definition of the arm and every consumer reaches the same one, so
 * the sweep cannot silently stop describing the guard; only the ownership
 * direction differs from those three, and deliberately. Production code must
 * not depend on tests: `tools/` is bundled for the web in Tasks 16-19, and an
 * import pointing the other way would drag this module into that bundle.
 *
 * What stays here is what only the guard uses: the two extra seed blocks the
 * stability check pools, the Kofler band, the reduction ladder and its two
 * boundary constants, and the liveness and occupancy floors. None of it is
 * meaningful to a browser readout, and all of it is a threshold this guard
 * asserts — a guard's configuration is part of the guard.
 *
 * This file lives under `tests/` so `tsconfig.json`'s `include` typechecks it.
 * It does NOT end in `.test.ts`, and `vitest.config.ts`'s `include` is
 * `["tests/**\/*.test.ts"]`, so vitest never collects it — verified in this
 * task by test-file count (13 files before, 14 after, not 15), not assumed.
 *
 * Every figure below was measured in THIS task by
 * `scripts/explore-cluster-threshold.ts`: ARM 1 the guard's own sweep, ARM 2
 * the three disjoint 11-seed blocks, ARM 2b the sub-sample stability check,
 * ARM 3 the onset-versus-reduction-constant ladder, ARM 4 the horizon probe.
 * No wall-clock time is quoted anywhere in the guard: run times are
 * machine-dependent and do not reproduce. Occupancy does.
 *
 * The rationale for every pinned field of `BASE`, the grid, the seed count and
 * the horizon — including the measured sweep table and the horizon-dependence
 * of the asserted window — lives on those declarations in
 * `tools/sweep-cluster-size.ts`. READ IT THERE; it is deliberately not restated
 * here, so there is one copy to keep true.
 */
export {
  BASE,
  FRACTIONS,
  GENERATIONS,
  SEEDS,
} from "../../tools/sweep-cluster-size.js";

/**
 * The two further disjoint 11-seed blocks the stability check uses. Not used by
 * the guard — used by ARM 2 of `scripts/explore-cluster-threshold.ts`, and
 * defined here so the block check and the guard cannot drift onto different
 * arms.
 */
export const BLOCK_2 = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
export const BLOCK_3 = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];

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
