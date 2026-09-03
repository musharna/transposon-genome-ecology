import { describe, expect, it } from "vitest";
import {
  repressionOnset,
  sweepClusterSize,
  type SweepPoint,
} from "../../tools/sweep-cluster-size.js";
import {
  ALIVE_FLOOR,
  BASE,
  FRACTIONS,
  GENERATIONS,
  KOFLER_HI,
  KOFLER_LO,
  OCCUPANCY_CEILING,
  REDUCTION_ABOVE_BAND,
  REDUCTION_BELOW_BAND,
  REDUCTION_PERCENTS,
  REDUCTION_UNREACHABLE,
  SEEDS,
} from "./cluster-threshold-arm.js";

/**
 * GUARD 3 (spec §6). Repression must switch on as the piRNA cluster grows, and
 * the onset must fall inside Kofler 2020's 0.2%-3% band.
 *
 * This is the loosest guard in the suite by design: the published band spans
 * more than an order of magnitude and depends on parameters this model does not
 * match. It catches a model where cluster size does nothing, and one where the
 * threshold sits somewhere absurd — and, at least as importantly, a model where
 * cluster size does not grade at all but simply sterilises the family, which is
 * what the parameters this guard was originally specified with actually did.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES THIS GUARD HARD TO WRITE HONESTLY
 * ---------------------------------------------------------------------------
 * "The large cluster has fewer copies than no cluster" is satisfied by the
 * large-cluster arm being DEAD, and "the onset is the smallest c beating a 25%
 * reduction" is satisfied by every c killing the family, in which case the
 * onset is the smallest grid point whatever the model does. At the original
 * parameters BOTH of those held: `c = 0` ran to roughly 1.2e5 copies and every
 * non-zero fraction ended at exactly 0. The arm module
 * (`./cluster-threshold-arm.js`) records that measurement and why the
 * parameters were replaced.
 *
 * So the liveness controls here are asserted PER SEED and BEFORE the
 * comparisons, inside the same test bodies. A control in a separate `it` cannot
 * stop a comparison in this one from passing on a corpse.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED
 * ---------------------------------------------------------------------------
 * `scripts/explore-cluster-threshold.ts` prints every number quoted in this
 * file and in the arm module: ARM 1 the guard's own sweep per seed, ARM 2 the
 * three disjoint 11-seed blocks, ARM 3 the onset ladder, ARM 4 the horizon
 * probe. Nothing here is quoted from anywhere else, and no wall-clock time is
 * quoted anywhere: run times are machine-dependent and do not reproduce.
 *
 * The sweep is computed ONCE for the whole file (`sweep()` below) and shared by
 * all three tests. Recomputing it per test would triple the file's cost for
 * bit-identical data.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GUARD DOES NOT CLAIM
 * ---------------------------------------------------------------------------
 *   - NOT that copy number falls with cluster size at every seed. It does not:
 *     20 of the 33 seeds measured have at least one up-step across the grid.
 *     Monotonicity is asserted on the MEAN over 11 seeds and on nothing else.
 *   - NOT that the in-band window of reduction constants is horizon-independent.
 *     It is not: the window is 5%..75% at generation 80, 10%..85% at 100,
 *     20%..85% at 120 (this guard) and 20%..80% at 160. The horizon-robust core
 *     is 20%..75%; see `GENERATIONS` in the arm module.
 *   - NOT that the onset has a stable VALUE at 11 pooled seeds. Only its band
 *     MEMBERSHIP is stable: three disjoint 11-seed blocks disagree on the value
 *     by one grid step at 2 of the 14 asserted constants. See `SEEDS`.
 *   - NOT that Kofler's band is a prediction of this model. It is a published
 *     range this model is required not to be absurd against.
 */
describe("guard 3: cluster-size threshold", () => {
  /**
   * The sweep, computed once. `SweepPoint[]` is read-only in practice — no test
   * below mutates it — so sharing it cannot leak state between tests.
   */
  let cached: SweepPoint[] | undefined;
  const sweep = (): SweepPoint[] =>
    (cached ??= sweepClusterSize(FRACTIONS, SEEDS, GENERATIONS));

  /**
   * TEST 1. The response is GRADED, with all four controls in the same body and
   * asserted before the two claims.
   *
   * Thresholds:
   *   - EVERY ARM ALIVE, per seed, > `ALIVE_FLOOR` = 100 copies (one per genome
   *     in a population of 100). Measured minimum over the 8 x 11 grid: 308
   *     copies at `c = 0.05`, seed 4 — a 3.08x margin. This is the assertion
   *     that goes red on the superseded parameterisation, where every non-zero
   *     fraction ends at exactly 0.
   *   - THE `c = 0` ARM IS A KNOCKOUT BY CONSTRUCTION: exactly zero silenced
   *     copies and exactly zero genomes with a repertoire, at every seed. Not a
   *     threshold — an identity. `isClusterSite` is `site < Math.floor(0 * S)`,
   *     false everywhere, so `trap` can never capture. Asserted rather than
   *     argued because it is the reference every reduction below is measured
   *     against.
   *   - EVERY NON-ZERO ARM ACTUALLY TRAPS, silenced copies > 0 at every seed.
   *     Measured minimum 99 (at `c = 0.03`). Asserted at > 0 rather than at a
   *     floor near 99 because a floor there would be asserting how MUCH the
   *     trap silences, which is uncalibrated. Without this control the arms
   *     differ only in which RNG draws were consumed and any difference between
   *     them is noise wearing the effect's clothes.
   *   - THE CONTROL ARM IS BELOW SATURATION, occupancy < 40%. Measured maximum
   *     11.3%, a 3.5x margin. Past roughly 40% `transpose` stops being a model
   *     of transposition and starts being a model of its own rejection sampler.
   *
   * The two claims carry no threshold of their own: both are strict
   * inequalities on the means. The monotone one goes red if cluster SIZE stops
   * mattering — a model that repressed identically at 2 and at 100 cluster
   * sites would still pass every control above and still pass "largest beats
   * none". That is the assertion that makes this a threshold guard rather than
   * a knockout guard.
   */
  it("cluster size grades copy number down: every arm alive at every seed, means monotone in c, largest cluster beats none", () => {
    const points = sweep();
    expect(points.map((p) => p.c)).toEqual(FRACTIONS);
    const none = points[0]!;
    expect(none.c, "the first sweep point is not the no-cluster control").toBe(
      0,
    );

    // CONTROL 1, per seed, before anything is compared: no arm is extinct or
    // limping. A mean cannot carry this — it is satisfied by one live seed.
    for (const p of points) {
      p.finalCopies.forEach((total, i) => {
        expect(
          total,
          `c = ${p.c}, seed ${SEEDS[i]}: ${total} copies at generation ${GENERATIONS} — this arm is dead or limping, so any comparison against it is measuring a corpse rather than repression`,
        ).toBeGreaterThan(ALIVE_FLOOR);
      });
    }

    // CONTROL 2: the baseline really is a knockout. Exact, not a threshold.
    none.finalSilencedCopies.forEach((silenced, i) => {
      expect(
        silenced,
        `seed ${SEEDS[i]}: the c = 0 arm has ${silenced} silenced copies, but with no cluster sites nothing can ever be captured — the baseline is not a knockout`,
      ).toBe(0);
    });
    none.finalFractionWithRepertoire.forEach((fwr, i) => {
      expect(
        fwr,
        `seed ${SEEDS[i]}: the c = 0 arm has a repertoire in ${(fwr * 100).toFixed(1)}% of genomes`,
      ).toBe(0);
    });

    // CONTROL 3: every cluster-bearing arm actually formed a trap. Without it,
    // the arms differ only in RNG consumption.
    for (const p of points.slice(1)) {
      p.finalSilencedCopies.forEach((silenced, i) => {
        expect(
          silenced,
          `c = ${p.c}, seed ${SEEDS[i]}: nothing is silenced, so this arm is not a repressed arm and the gradient below is not repression`,
        ).toBeGreaterThan(0);
      });
    }

    // CONTROL 4: the control arm — the largest, and the only one at risk — is
    // nowhere near the occupancy where `transpose`'s rejection sampler degrades.
    none.finalCopies.forEach((total, i) => {
      const occupancy = total / BASE.N / BASE.S;
      expect(
        occupancy,
        `seed ${SEEDS[i]}: the c = 0 arm reached ${(occupancy * 100).toFixed(1)}% site occupancy`,
      ).toBeLessThan(OCCUPANCY_CEILING);
    });

    // CLAIM 1: repression strengthens with cluster size. On the MEANS — 20 of
    // the 33 seeds measured are non-monotone individually, and this guard does
    // not claim otherwise. Weakest measured step ratio: 0.842.
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const cur = points[i]!;
      expect(
        cur.meanFinalCopies,
        `c = ${cur.c} (${cur.meanFinalCopies.toFixed(1)} copies) did not fall below c = ${prev.c} (${prev.meanFinalCopies.toFixed(1)}): cluster size has stopped grading copy number, so there is no threshold for the band check to locate`,
      ).toBeLessThan(prev.meanFinalCopies);
    }

    // CLAIM 2: the endpoint comparison the spec states, now that every arm is
    // known to be alive. Measured 1393.7 against 19296.4, a 13.85x separation.
    const large = points[points.length - 1]!;
    expect(
      large.meanFinalCopies,
      `the largest cluster (c = ${large.c}, ${large.meanFinalCopies.toFixed(1)} copies) did not beat no cluster at all (${none.meanFinalCopies.toFixed(1)})`,
    ).toBeLessThan(none.meanFinalCopies);
  });

  /**
   * TEST 2. The onset falls inside Kofler's band — at every reduction constant
   * from 20% to 85%, not at one arbitrary constant.
   *
   * The brief defined the onset as the smallest `c` achieving a 25% reduction.
   * 25% is arbitrary, and a claim that holds only at the constant chosen for it
   * is a claim about the constant. It is unnecessary here: the onset is in band
   * at all fourteen constants in `REDUCTION_PERCENTS`, and identically so at
   * three disjoint 11-seed blocks (arm module, `REDUCTION_PERCENTS`).
   *
   * The band is not a tolerance window this model was fitted into. It is
   * Kofler's published range, `FRACTIONS` carries a grid point strictly outside
   * it on each side, and TEST 3 asserts that the check does go red on both
   * sides just past the ends of this window — so this assertion is not one that
   * could not fail.
   *
   * The liveness control is repeated here rather than delegated to test 1,
   * because an onset computed over dead arms is meaningless in exactly the way a
   * comparison over dead arms is, and a control in another `it` cannot stop it.
   */
  it("the repression onset falls inside Kofler's 0.2%-3% band at every reduction constant from 20% to 85%", () => {
    const points = sweep();

    // CONTROL, before any onset is computed: every arm alive, and the baseline
    // is a real amplifying population rather than a founder count.
    for (const p of points) {
      p.finalCopies.forEach((total, i) => {
        expect(
          total,
          `c = ${p.c}, seed ${SEEDS[i]}: ${total} copies — an onset computed over a dead arm is not a threshold`,
        ).toBeGreaterThan(ALIVE_FLOOR);
      });
    }
    const none = points[0]!;
    expect(
      none.meanFinalCopies,
      `the c = 0 baseline is ${none.meanFinalCopies.toFixed(1)} copies from ${BASE.N} founders — it never amplified, so a "reduction" against it means nothing`,
    ).toBeGreaterThan(10 * BASE.N);

    for (const pct of REDUCTION_PERCENTS) {
      const onset = repressionOnset(points, pct / 100);
      expect(
        onset,
        `no cluster fraction on the grid (up to c = ${FRACTIONS[FRACTIONS.length - 1]}) achieves a ${pct}% reduction against the no-cluster arm`,
      ).toBeDefined();
      expect(
        onset!.c,
        `at a ${pct}% reduction the onset is c = ${onset!.c}, BELOW Kofler's ${KOFLER_LO * 100}% floor — repression establishes at a smaller cluster than any observed`,
      ).toBeGreaterThanOrEqual(KOFLER_LO);
      expect(
        onset!.c,
        `at a ${pct}% reduction the onset is c = ${onset!.c}, ABOVE Kofler's ${KOFLER_HI * 100}% ceiling — repression needs a bigger cluster than any observed`,
      ).toBeLessThanOrEqual(KOFLER_HI);
    }
  });

  /**
   * TEST 3. WHERE THE CLAIM STOPS, asserted rather than omitted.
   *
   * The window in test 2 has two ends, and a guard that states a range without
   * saying what happens just outside it is hiding the shape of its own claim.
   * Measured at the guard's own seeds:
   *   - at a 15% reduction the onset is `c = 0.001` — two cluster sites in
   *     2000, under Kofler's 0.2% floor. This is the reason the asserted window
   *     starts at 20% and not lower, and it is the thinnest margin in the
   *     guard: staying in band at 20% requires the `c = 0.001` arm to hold at or
   *     above 80% of the control, and it sits at 84.2% at these seeds (80.9% at
   *     the second block — 0.9 percentage points of room).
   *   - at a 90% reduction the onset is `c = 0.05`, over the 3% ceiling.
   *   - at 95% no fraction on the grid gets there at all, and `repressionOnset`
   *     returns undefined.
   *
   * The upper two hold at all three disjoint 11-seed blocks. THE LOWER ONE DOES
   * NOT: at 15% the third block still gives `c = 0.002`, inside the band. 15%
   * is excluded from test 2's window because it is not in band at ALL blocks —
   * that is the criterion — and this assertion is scoped to the guard's pinned
   * seeds accordingly. The arm module's `REDUCTION_PERCENTS` carries the full
   * per-block ladder.
   *
   * This test is also test 2's positive control, and it carries its own in the
   * same body: the first assertion checks that a constant INSIDE the window
   * lands in band with the very same `points`, `repressionOnset` and band
   * constants. Without it, "the onset is outside the band at 15%" would be
   * equally satisfied by a broken sweep, an empty grid or a band comparison
   * that never matches anything — which is the difference between a negative
   * result and a broken harness. With it, test 2's band assertions are known to
   * be assertions that can go red on this grid, in both directions.
   */
  it("the in-band window has two ends: at 15% the onset drops below the band, at 90% it rises above it, at 95% it is off the grid", () => {
    const points = sweep();

    // POSITIVE CONTROL, first and in this body: the machinery under test does
    // produce an in-band answer for a constant inside the window.
    const inside = REDUCTION_PERCENTS[0]!;
    const control = repressionOnset(points, inside / 100);
    expect(
      control,
      `the ${inside}% reduction — the lowest constant test 2 asserts — has no onset at all, so this test cannot tell an out-of-band result from a broken sweep`,
    ).toBeDefined();
    expect(
      control!.c,
      `the ${inside}% reduction puts the onset at c = ${control!.c}, outside Kofler's band — the band comparisons below cannot distinguish an out-of-band boundary from a sweep that is out of band everywhere`,
    ).toBeGreaterThanOrEqual(KOFLER_LO);
    expect(
      control!.c,
      `the ${inside}% reduction puts the onset at c = ${control!.c}, outside Kofler's band — the band comparisons below cannot distinguish an out-of-band boundary from a sweep that is out of band everywhere`,
    ).toBeLessThanOrEqual(KOFLER_HI);

    // BOUNDARY 1, below. The measured value is the grid's smallest non-zero
    // fraction; the assertion is only that it is under Kofler's floor, because
    // that is what bounds the window.
    const below = repressionOnset(points, REDUCTION_BELOW_BAND / 100);
    expect(
      below,
      `no fraction achieves a ${REDUCTION_BELOW_BAND}% reduction`,
    ).toBeDefined();
    expect(
      below!.c,
      `at a ${REDUCTION_BELOW_BAND}% reduction the onset is c = ${below!.c}, which is INSIDE Kofler's band — repression has strengthened at small clusters and the asserted window should now start below ${REDUCTION_PERCENTS[0]}%`,
    ).toBeLessThan(KOFLER_LO);

    // BOUNDARY 2, above.
    const above = repressionOnset(points, REDUCTION_ABOVE_BAND / 100);
    expect(
      above,
      `no fraction achieves a ${REDUCTION_ABOVE_BAND}% reduction`,
    ).toBeDefined();
    expect(
      above!.c,
      `at a ${REDUCTION_ABOVE_BAND}% reduction the onset is c = ${above!.c}, which is INSIDE Kofler's band — repression has strengthened at large clusters and the asserted window should now extend past ${REDUCTION_PERCENTS[REDUCTION_PERCENTS.length - 1]}%`,
    ).toBeGreaterThan(KOFLER_HI);

    // BOUNDARY 3, off the grid entirely.
    expect(
      repressionOnset(points, REDUCTION_UNREACHABLE / 100),
      `a ${REDUCTION_UNREACHABLE}% reduction is now reached somewhere on the grid, so the grid no longer brackets the model's repression`,
    ).toBeUndefined();
  });
});
