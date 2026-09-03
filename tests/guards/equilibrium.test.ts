import { describe, expect, it } from "vitest";
import {
  ARMS,
  ARM_NAMES,
  BASE,
  GENERATIONS,
  GROWTH_WINDOW,
  HIGH_COPY_START,
  SEEDS,
  STABILITY_WINDOW,
  armParams,
  copiesOffRate,
  mean,
  relDrift,
  runArm,
  runArmMarks,
} from "./equilibrium-arm.js";

/**
 * GUARD 1 (spec §6). THE CORRECTNESS FLOOR.
 *
 * With the piRNA trap and domestication disabled, the model reduces to
 * Charlesworth & Charlesworth 1983, "The population dynamics of transposable
 * elements", Genet. Res. 42(1):1-27, doi:10.1017/S0016672300021455 — read from
 * the OA PDF and written up with page and equation numbers in
 * `docs/charlesworth-1983-equilibrium.md`.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS GUARD ASSERTS NO NUMBER
 * ---------------------------------------------------------------------------
 * The brief specified a `PREDICTED_EQUILIBRIUM` constant taken from the paper's
 * balance condition. There is no such constant to take, and the reason is worth
 * stating where the guard is read rather than only where it is derived.
 *
 * Eq. (29), p. 16 gives `-d ln w_n/dn ~ u - v` in the regime `n << T`.
 * Substituting our `ln w = -(a*n + b*n^2)` gives `n_bar = (r - v - a)/(2b)`,
 * which is 48 at these coefficients. Measured, it is 26.8. The gap is
 * structural: Charlesworth's `n` counts elements in a DIPLOID individual
 * (eq. 18b carries `dn/dx_i = 2` for exactly that reason), while our `Genome`
 * is haploid and `sim/phases/reproduce.ts` discards a site inherited from both
 * parents. That dedup is a copy sink the null model does not have, and it is
 * relatedness-dependent — the sweep measures the same arm equilibrating at
 * 19.2 copies per genome at N = 100, 26.8 at N = 200 and 31.3 at N = 400.
 * A quantity that moves with N is not a constant of the fitness function, so
 * there is nothing here for a paper-derived number to be compared against.
 *
 * The other option — reading the constant off our own simulation — is worse. A
 * constant calibrated from the artifact under test cannot falsify that
 * artifact; it is a test that cannot fail.
 *
 * So this guard asserts the paper's QUALITATIVE predictions, each against a
 * negative control the PAPER supplies rather than one this repository invented:
 *
 *   1. An interior equilibrium exists and is approached from BOTH directions
 *      (p. 11: `0 < n_bar < T`; the brief is right that a value reached from
 *      below but not from above is a bug, not an equilibrium).
 *   2. A LINEAR fitness function does not control copy number (pp. 12-13:
 *      `t = 1` is argued not viable). Our `b = 0` arm is `w = (e^-a)^n`, which
 *      is EXACTLY the independent-effects multiplicative model p. 12 rules out.
 *   3. The QUADRATIC term is what controls it (p. 11: `d2 ln w_n/dn2 < 0` is
 *      necessary for an interior equilibrium, and `d2 ln w/dn2 = -2b` here).
 *   4. Copy number stabilises far below saturation: `n_bar << T` (p. 11). That
 *      is a claim about SITE occupancy, which is the quantity this file
 *      measures. The paper's companion figure — equilibrium mean fitness ~95.5%
 *      of a copy-free individual at its Table 2 parameters, p. 16 — is a claim
 *      about FITNESS, nothing here measures fitness, and ours does not match it.
 *      See the DOES NOT CLAIM block below.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED
 * ---------------------------------------------------------------------------
 * The per-seed table of copies per genome at the horizon is NOT transcribed
 * here. It is defined once, on `ARMS` in `./equilibrium-arm.js`, together with
 * the three ratio rows the thresholds below are derived from and the limit on
 * what they license. `scripts/explore-equilibrium.ts` prints all of it. A
 * measured table copied into two files is a table that will stop agreeing with
 * itself; each threshold's own margin is quoted on the test that asserts it.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GUARD DOES NOT CLAIM
 * ---------------------------------------------------------------------------
 * - Not that NONE exceeds LINEAR at every seed. It does not — the arms overlap,
 *   and one seed reverses. Only a floor is asserted, never an ordering; the
 *   measured detail is on `ARMS` in `./equilibrium-arm.js`.
 * - Not that the LINEAR arm is "statistically indistinguishable" from no
 *   selection. It is not — the mean ratio is consistently below 100%.
 * - Not any equilibrium VALUE, in any arm, for the reasons above.
 * - NOT that our equilibrium sits in the paper's "a small decrement in fitness
 *   is sufficient to balance the increase in copy number by transposition"
 *   regime (p. 16). It does not, and the gap is large enough to matter. At
 *   n_bar = 26.8 the load is 0.001*26.8 + 0.0005*26.8^2 = 0.3859, so
 *   w = exp(-0.3859) = 0.680 — a 32.0% fitness decrement, cross-checked against
 *   the real `fitness()` on a 27-copy genome (0.6760). Charlesworth's Table 2
 *   equilibrium is ~95.5% of a copy-free individual, a ~4.5% decrement: ours is
 *   SEVEN TIMES further from copy-free. That is a parameterisation difference,
 *   not a reproduced result, and it is deliberately NOT tuned away — `a` and
 *   `b` are the `defaultParams` values every other guard in the suite is
 *   calibrated against, and moving them would move the golden hash. The
 *   `occupancy < 0.4` assertions below are about SITE saturation, a different
 *   quantity; no assertion in this file rests on fitness at all.
 * - Not that NONE and LINEAR have equilibria at all in the paper's sense. At
 *   these parameters they plateau at the level the haploid dedup sink imposes
 *   (~15.4% site occupancy), which is a property of `reproduce.ts`, not of
 *   host selection. They are controls, not subjects.
 */
describe("guard 1: Charlesworth equilibrium", () => {
  /**
   * TEST 1. An interior equilibrium, reached from both directions.
   *
   * The brief calls this the test that matters, and it is the one the guard is
   * built around: a model that arrives at a value from below but not from above
   * has a bug, not an equilibrium.
   *
   * Thresholds:
   *   - alive, both directions: measured minimum 4940 copies (from below,
   *     seed 1). Asserted at > 0 — extinction is what this control exists to
   *     catch, and any floor above 0 would be a claim about equilibrium size.
   *   - the high start really is high: `startPerGenome` must be exactly
   *     `HIGH_COPY_START` and at least 5x the from-below result. Measured
   *     300 / 28.4 = 10.6x at the weakest seed, a 2.1x margin. This is the
   *     positive control for the comparison below: a `seedHighCopy` that
   *     silently did nothing would make this a comparison of two identical
   *     from-below runs, which agree trivially.
   *   - non-saturating, both directions: occupancy < 40%. Measured maximum
   *     1.49% (from above, seed 5), a 27x margin. 40% is Guard 4's threshold
   *     and is here for Guard 4's reason: past roughly there, `transpose`'s
   *     rejection sampler needs several draws per insertion and the arm reports
   *     the sampler as much as the model. It also discharges the paper's
   *     `n_bar < T` (p. 11) and the brief's `perGenome < 0.5 * S`.
   *   - THE CLAIM: |above - below| / below < 0.30. Measured maximum 0.102
   *     (seed 4), a 2.9x margin. Goes red if the two directions land in
   *     different places — which is what a hysteretic or absorbing model does.
   */
  it("reaches an interior equilibrium, and the same one from a high-copy start", () => {
    const below: number[] = [];
    const above: number[] = [];

    for (const seed of SEEDS) {
      const lo = runArm("QUADRATIC", { seed });
      const hi = runArm(
        "QUADRATIC",
        { seed },
        { highCopyStart: HIGH_COPY_START },
      );

      // CONTROL 1, before the comparison: neither direction is a corpse. Two
      // extinct populations agree perfectly, and 0/0 is not a convergence.
      expect(
        lo.snapshot.totalCopies,
        `seed ${seed}: the from-below arm is extinct at generation ${GENERATIONS}`,
      ).toBeGreaterThan(0);
      expect(
        hi.snapshot.totalCopies,
        `seed ${seed}: the from-above arm is extinct at generation ${GENERATIONS}`,
      ).toBeGreaterThan(0);

      // CONTROL 2, the positive control for the comparison: the high start was
      // actually applied, and it actually is above the equilibrium. Without
      // this the test degenerates into comparing a run with itself.
      expect(
        hi.startPerGenome,
        `seed ${seed}: seedHighCopy left ${hi.startPerGenome} copies per genome, not ${HIGH_COPY_START} — the "from above" arm did not start above anything`,
      ).toBe(HIGH_COPY_START);
      expect(
        hi.startPerGenome / lo.perGenome,
        `seed ${seed}: the ${HIGH_COPY_START}-copy start is only ${(hi.startPerGenome / lo.perGenome).toFixed(1)}x the from-below equilibrium of ${lo.perGenome.toFixed(1)}, which is not far enough above it to be an approach from above`,
      ).toBeGreaterThan(5);

      // CONTROL 3: neither direction saturates the genome. `n_bar < T`, p. 11.
      for (const [name, r] of [
        ["below", lo],
        ["above", hi],
      ] as const) {
        expect(
          r.occupancy,
          `seed ${seed}: the from-${name} arm reached ${(100 * r.occupancy).toFixed(1)}% site occupancy, where transpose is reporting its own rejection sampler`,
        ).toBeLessThan(0.4);
      }

      // THE CLAIM.
      expect(
        relDrift(lo.perGenome, hi.perGenome),
        `seed ${seed}: from below ${lo.perGenome.toFixed(1)} and from above ${hi.perGenome.toFixed(1)} copies per genome are not the same equilibrium`,
      ).toBeLessThan(0.3);

      below.push(lo.perGenome);
      above.push(hi.perGenome);
    }

    expect(
      relDrift(mean(below), mean(above)),
      `over ${SEEDS.length} seeds, mean from below ${mean(below).toFixed(1)} and mean from above ${mean(above).toFixed(1)} copies per genome disagree`,
    ).toBeLessThan(0.3);
  });

  /**
   * TEST 2. The paper's central qualitative claim: a linear fitness function is
   * not enough, and the quadratic term is what does the work.
   *
   * Three arms differing in `a` and `b` and nothing else (test 4 checks that
   * against the live constants rather than trusting this sentence).
   *
   * Thresholds, all per seed, all against the same NONE arm at the same seed:
   *   - every arm alive: measured minimum 4940 copies (QUADRATIC, seed 1).
   *   - the reduction to the null model actually happened: `silencedCopies` and
   *     `domesticatedCopies` exactly 0, and the transposition
   *     rate is bit-identical to `r0` on EVERY copy. `sigmaR = 0` makes
   *     `transpose`'s multiplier `Math.exp(0)` = 1 exactly, so that is an exact
   *     assertion, and it is what makes the paper's constant-`u` assumption
   *     true here rather than approximately true. It is asserted on the copies
   *     and NOT on `Snapshot.meanRate`: the mean is a floating-point sum over
   *     tens of thousands of copies and it drifts (measured: 0.0500000000000382
   *     in the NONE arm at seed 1), so `meanRate === r0` is a false claim that
   *     merely looks stricter. `copiesOffRate` carries the whole note.
   *   - NONE not saturating: occupancy < 40%. Measured maximum 15.70%, a 2.5x
   *     margin. If the baseline saturated, every ratio below would be measured
   *     against the genome's size instead of against no selection.
   *   - CEILING, asserted FIRST because it is this test's positive control:
   *     QUADRATIC / NONE < 0.15. Measured maximum 0.094 (seed 5), a 1.6x
   *     margin. This is what proves the ratio can detect copy-number control at
   *     all; without it the floor below is satisfied by a metric that is simply
   *     insensitive.
   *   - FLOOR: LINEAR / NONE > 0.85. Measured minimum 0.940 (seed 1), a margin
   *     of 9.0 percentage points. Goes red if a purely multiplicative fitness
   *     starts controlling copy number — which is the paper's negative claim.
   *   - THE SEPARATION, stated as one ratio so it does not depend on the NONE
   *     arm at all: LINEAR / QUADRATIC > 5. Measured minimum 10.5 (seed 2), a
   *     2.1x margin. This is "a few percent against an order of magnitude" in
   *     one number, and it is the assertion that goes red if `b` stops mattering.
   */
  it("a linear fitness function does not control copy number; the quadratic term does", () => {
    const finals: Record<string, number[]> = {
      NONE: [],
      LINEAR: [],
      QUADRATIC: [],
    };

    for (const seed of SEEDS) {
      const r = {
        NONE: runArm("NONE", { seed }),
        LINEAR: runArm("LINEAR", { seed }),
        QUADRATIC: runArm("QUADRATIC", { seed }),
      };

      for (const arm of ARM_NAMES) {
        // CONTROL 1: alive. A dead arm makes every ratio below meaningless,
        // and at N = 50 an arm really does die (see N_SWEEP in the arm module).
        expect(
          r[arm].snapshot.totalCopies,
          `seed ${seed}: the ${arm} arm is extinct at generation ${GENERATIONS}`,
        ).toBeGreaterThan(0);

        // CONTROL 2: this really is the Charlesworth reduction. Phases 2 and 3
        // are off, and `u` is a constant.
        expect(
          r[arm].snapshot.silencedCopies,
          `seed ${seed}: the ${arm} arm silenced copies with silencingOn false — this is not the null model`,
        ).toBe(0);
        expect(
          r[arm].snapshot.domesticatedCopies,
          `seed ${seed}: the ${arm} arm domesticated copies with pDom 0 and beta 0 — this is not the null model`,
        ).toBe(0);
        expect(
          copiesOffRate(r[arm].world, BASE.r0),
          `seed ${seed}: the ${arm} arm has copies whose transposition rate is no longer bit-identical to r0 = ${BASE.r0}, so there is no constant u for a balance condition to be about`,
        ).toBe(0);

        finals[arm]!.push(r[arm].perGenome);
      }

      // CONTROL 3: the baseline is not pinned against the genome's size.
      expect(
        r.NONE.occupancy,
        `seed ${seed}: the NONE arm reached ${(100 * r.NONE.occupancy).toFixed(1)}% site occupancy, so the ratios below are measured against saturation, not against no selection`,
      ).toBeLessThan(0.4);

      const quadRatio = r.QUADRATIC.perGenome / r.NONE.perGenome;
      const linRatio = r.LINEAR.perGenome / r.NONE.perGenome;

      // POSITIVE CONTROL FOR THE FLOOR, asserted before it: this ratio CAN go
      // low, and does, as soon as the fitness function is strictly log-concave.
      expect(
        quadRatio,
        `seed ${seed}: the QUADRATIC arm is at ${(100 * quadRatio).toFixed(1)}% of no selection (${r.QUADRATIC.perGenome.toFixed(1)} vs ${r.NONE.perGenome.toFixed(1)}) — the b term has stopped controlling copy number`,
      ).toBeLessThan(0.15);

      // THE FLOOR: linear selection does NOT control copy number.
      expect(
        linRatio,
        `seed ${seed}: the LINEAR arm is at ${(100 * linRatio).toFixed(1)}% of no selection (${r.LINEAR.perGenome.toFixed(1)} vs ${r.NONE.perGenome.toFixed(1)}) — a multiplicative fitness function is controlling copy number, which Charlesworth 1983 p. 12 says it cannot`,
      ).toBeGreaterThan(0.85);

      // THE SEPARATION, independent of the NONE arm.
      expect(
        r.LINEAR.perGenome / r.QUADRATIC.perGenome,
        `seed ${seed}: LINEAR ${r.LINEAR.perGenome.toFixed(1)} is only ${(r.LINEAR.perGenome / r.QUADRATIC.perGenome).toFixed(1)}x QUADRATIC ${r.QUADRATIC.perGenome.toFixed(1)} — the concavity of log-fitness is no longer what separates them`,
      ).toBeGreaterThan(5);
    }

    // The same three claims on the means, which is the form the spec states
    // them in. The per-seed assertions above are the stronger statement; these
    // are here so a failure reports the size of the effect, not only its worst
    // seed.
    //
    // ⚠️ ALL THREE ARE ENTAILED, NOT INDEPENDENT, and they cannot fail while the
    // per-seed loop passes. Each is a ratio of MEANS, and the per-seed loop
    // asserts the corresponding ratio at every seed; since every denominator is
    // positive, `Q_i < 0.15·N_i` for all i gives `ΣQ_i < 0.15·ΣN_i` and hence
    // `mean(Q)/mean(N) < 0.15`, and identically for `mean(L)/mean(N) > 0.85`
    // and `mean(L)/mean(Q) > 5`. (This would NOT hold for a mean OF RATIOS,
    // which is a different statistic; it holds here only because these are
    // ratios of means.) Kept for the failure message and for the spec's
    // phrasing — but they add no coverage and must not be counted as three
    // further checks.
    const m = {
      NONE: mean(finals["NONE"]!),
      LINEAR: mean(finals["LINEAR"]!),
      QUADRATIC: mean(finals["QUADRATIC"]!),
    };
    expect(
      m.QUADRATIC / m.NONE,
      `mean QUADRATIC ${m.QUADRATIC.toFixed(1)} is ${(100 * (m.QUADRATIC / m.NONE)).toFixed(1)}% of mean NONE ${m.NONE.toFixed(1)}`,
    ).toBeLessThan(0.15);
    expect(
      m.LINEAR / m.NONE,
      `mean LINEAR ${m.LINEAR.toFixed(1)} is ${(100 * (m.LINEAR / m.NONE)).toFixed(1)}% of mean NONE ${m.NONE.toFixed(1)}`,
    ).toBeGreaterThan(0.85);
    expect(
      m.LINEAR / m.QUADRATIC,
      `mean LINEAR ${m.LINEAR.toFixed(1)} is only ${(m.LINEAR / m.QUADRATIC).toFixed(1)}x mean QUADRATIC ${m.QUADRATIC.toFixed(1)}`,
    ).toBeGreaterThan(5);
    // Its own timeout, rather than `vitest.config.ts`'s 60s default for the
    // whole suite. This test runs two arms that sit at ~15% site occupancy for
    // 300 generations at five seeds each and measured 41.5s here; the other
    // three tests in this file together cost 13s. Raising the SUITE timeout to
    // cover one expensive guard would also stop every cheap test in the
    // repository from ever reporting a hang.
    //
    // 100s, not more: that is 2.4x the measured 41.5s, so it absorbs machine
    // variance, while a 3x regression in `step` or `transpose` still turns this
    // test red instead of passing silently in the file that should catch it
    // first. THE REAL MARGIN IS THINNER THAN THIS NUMBER SUGGESTS: the whole
    // Guard 1 file measured 47.9-55.4s against the task's 60s budget, roughly
    // 8% headroom, so a slower machine blows that budget with nothing here
    // reporting it. If this test's duration starts climbing, cut a seed or the
    // horizon and re-derive — do not raise this timeout.
  }, 100_000);

  /**
   * TEST 3. The horizon reading is an equilibrium, not a snapshot.
   *
   * Copy number at twice the horizon must be where it was at the horizon. This
   * is measured on the QUADRATIC arm only — it is the only one of the three
   * that satisfies the paper's `d2 ln w_n/dn2 < 0` and therefore the only one
   * with an equilibrium in the paper's sense. (The sweep measures the same
   * window for NONE and LINEAR too, at 5.3% and 7.2% worst-seed drift; they are
   * flat as well, but running them here would cost more than the whole rest of
   * this file and their plateau is a property of `reproduce.ts`'s dedup sink,
   * not a Charlesworth prediction.)
   *
   * Thresholds:
   *   - alive at both marks: measured minimum 4940 copies.
   *   - THE CLAIM: |n(600) - n(300)| / n(300) < 0.25. Measured maximum 0.075
   *     (seed 2), a 3.3x margin.
   *   - POSITIVE CONTROL, in this same body: the identical predicate over
   *     `GROWTH_WINDOW` (g75 -> g150), where the arm has NOT plateaued, must
   *     FAIL. Measured minimum 1.175 (seed 2), 4.7x above the threshold. This
   *     is what stops "copy number did not change much" from being satisfied by
   *     an inert model or a mis-specified window: the same measurement, on the
   *     same arm, at the same seed, has to be able to come out large.
   */
  it("the equilibrium is an equilibrium: it is in the same place at twice the horizon", () => {
    for (const seed of SEEDS) {
      const plateau = runArmMarks("QUADRATIC", STABILITY_WINDOW, { seed });
      const growth = runArmMarks("QUADRATIC", GROWTH_WINDOW, { seed });

      // CONTROL: alive at both ends of both windows, so no drift figure below
      // is a division by, or a comparison of, zero.
      for (const [label, marks, vals] of [
        ["plateau", STABILITY_WINDOW, plateau.perGenome],
        ["growth", GROWTH_WINDOW, growth.perGenome],
      ] as const) {
        vals.forEach((v, i) => {
          expect(
            v,
            `seed ${seed}: the arm is extinct at generation ${marks[i]} of the ${label} window`,
          ).toBeGreaterThan(0);
        });
      }

      // POSITIVE CONTROL FIRST: the predicate can come out large.
      const growthDrift = relDrift(growth.perGenome[0]!, growth.perGenome[1]!);
      expect(
        growthDrift,
        `seed ${seed}: copy number moved only ${(100 * growthDrift).toFixed(1)}% between generations ${GROWTH_WINDOW[0]} and ${GROWTH_WINDOW[1]}, where the arm is supposed to still be growing — this measurement cannot detect drift, so the stability assertion below is vacuous`,
      ).toBeGreaterThan(0.25);

      // THE CLAIM.
      const plateauDrift = relDrift(
        plateau.perGenome[0]!,
        plateau.perGenome[1]!,
      );
      expect(
        plateauDrift,
        `seed ${seed}: copy number moved ${(100 * plateauDrift).toFixed(1)}% from ${plateau.perGenome[0]!.toFixed(1)} at generation ${STABILITY_WINDOW[0]} to ${plateau.perGenome[1]!.toFixed(1)} at generation ${STABILITY_WINDOW[1]} — the horizon reading is a snapshot of a moving quantity, not an equilibrium`,
      ).toBeLessThan(0.25);
    }
  });

  /**
   * TEST 4. The guard's configuration IS part of the guard.
   *
   * Everything asserted above is a claim about the null regime. If `BASE` stops
   * being the null regime — if the trap comes back on, if `sigmaR` stops being
   * zero, if the arms start differing in something other than the shape of the
   * copy-number load — then every ratio above is measuring something else and
   * the guard's title is a lie. None of that is expensive to check, and none of
   * it is checked by reading the prose in `./equilibrium-arm.js`.
   *
   * Costs no generations: `armParams` builds the parameter set without running.
   */
  it("the arms differ in a and b and nothing else, in a regime that is the null model", () => {
    const none = armParams("NONE");
    const linear = armParams("LINEAR");
    const quadratic = armParams("QUADRATIC");
    const keys = Object.keys(BASE) as (keyof typeof BASE)[];

    for (const [name, other] of [
      ["NONE", none],
      ["LINEAR", linear],
    ] as const) {
      const differing = keys.filter((k) => other[k] !== quadratic[k]).sort();
      expect(
        differing,
        `the ${name} arm and the QUADRATIC arm are no longer matched on everything but the copy-number load, so a difference between them is no longer attributable to the shape of ln w`,
      ).toEqual(name === "NONE" ? ["a", "b"] : ["b"]);
    }

    // The loop above really ranged over all twenty fields. This does NOT catch
    // a change to `Params` itself — `BASE` is typed as `Params`, so adding or
    // removing a field there is a `tsc` error, not a test failure. What it
    // catches is `BASE` acquiring a key that is not a `Params` field, which a
    // spread can introduce silently and which the filter above would then
    // compare as `undefined !== undefined` and quietly ignore.
    expect(
      keys.length,
      "BASE no longer has exactly the 20 Params fields — an extra key would be compared as undefined on both arms and silently ignored above",
    ).toBe(20);

    // The regime itself. Each of these is load-bearing for a specific claim,
    // and each is documented on `BASE` in `./equilibrium-arm.js`.
    expect(
      {
        silencingOn: quadratic.silencingOn,
        pDom: quadratic.pDom,
        c: quadratic.c,
        beta: quadratic.beta,
        wDom: quadratic.wDom,
        sigmaR: quadratic.sigmaR,
        d: quadratic.d,
        dTol: quadratic.dTol,
        sexual: quadratic.sexual,
      },
      "the arm is no longer the Charlesworth null regime: the trap, domestication, a non-constant transposition rate, a damage term or clonal reproduction has been switched back on",
    ).toEqual({
      silencingOn: false,
      pDom: 0,
      c: 0,
      beta: 0,
      wDom: 0,
      sigmaR: 0,
      d: 0,
      dTol: 0,
      sexual: true,
    });

    // The paper's two structural conditions on the coefficients themselves,
    // p. 11: `d2 ln w_n/dn2 = -2b < 0` for an interior equilibrium, and
    // `f(0) < u - v` — here `a < r0 - v` — for copy number to rise from zero.
    expect(
      ARMS.QUADRATIC.b,
      "the QUADRATIC arm's b is not positive, so log-fitness is not strictly concave and Charlesworth 1983 p. 11 predicts no interior equilibrium for it",
    ).toBeGreaterThan(0);
    expect(
      ARMS.LINEAR.b,
      "the LINEAR arm's b is not zero, so it is no longer the multiplicative model p. 12 rules out",
    ).toBe(0);
    expect(
      ARMS.QUADRATIC.a,
      `a = ${ARMS.QUADRATIC.a} is not below r0 - v = ${BASE.r0 - BASE.v}, so f(0) < u - v fails and copy number cannot increase from zero (p. 11)`,
    ).toBeLessThan(BASE.r0 - BASE.v);
  });
});
