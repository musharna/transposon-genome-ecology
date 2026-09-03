/**
 * The cluster-size sweep, and the definition of "repression onset" that Guard 3
 * and the browser's threshold readout share.
 *
 * `BASE` is imported from `tests/guards/cluster-threshold-arm.ts` — the SAME
 * module the guard asserts against — rather than declared here or defaulted to
 * `defaultParams()`. That is deliberate: the point of putting this function in
 * `tools/` is that the guard and the browser readout "measure the same thing the
 * same way", and a second copy of the parameter set, or a default that is not
 * the guard's arm, would make that true only until someone edited one of them.
 * `scripts/explore-bloat.ts` and `scripts/explore-three-phases.ts` already
 * import their arms from `tests/guards/` for the same reason. The arm module
 * imports nothing from here, so there is no cycle.
 *
 * `tools/` is inside `tsconfig.json`'s `include`, so this file is typechecked.
 */
import {
  createWorld,
  defaultParams,
  observe,
  run,
  type Params,
} from "../sim/index.js";
import { BASE } from "../tests/guards/cluster-threshold-arm.js";

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
