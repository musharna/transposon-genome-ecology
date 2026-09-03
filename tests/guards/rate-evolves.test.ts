import { describe, expect, it } from "vitest";
import {
  createWorld,
  defaultParams,
  observe,
  type Params,
  run,
  step,
  type World,
} from "../../sim/index.js";

/**
 * GUARD 5 (spec §6) — per-copy transposition rate actually EVOLVES.
 *
 * This is the kill-switch on the project's central modelling decision: the unit
 * of selection is the COPY. If `r` cannot move, "rate is heritable" is an empty
 * claim and the copy-level design was the wrong choice.
 *
 * ------------------------------------------------------------------------------
 * WHAT WAS MEASURED, AND WHY THE OBVIOUS GUARD IS THE WRONG ONE
 * ------------------------------------------------------------------------------
 * The naive Guard 5 asserts "the mean rate MOVES from r0". Measured on the live
 * `sim/` at the params pinned below, that assertion passes identically in a
 * NEUTRAL arm with no host selection whatsoever (mean r 0.100 -> 0.2446 at
 * generation 60). A positive control that passes under its own null is not a
 * control. So the movement is asserted here only against a matched arm with the
 * variation generator switched OFF (Test A), never against r0 alone.
 *
 * The second naive assertion — "host selection pushes the mean rate DOWN" — is
 * FALSE. It was measured and is recorded in Test C.
 *
 * ------------------------------------------------------------------------------
 * ⚠️ THE ARITHMETIC MEAN IS A BIASED STATISTIC HERE, AND THE GUARD DOES NOT
 * REST ON IT ALONE
 * ------------------------------------------------------------------------------
 * `transpose` sets `r' = r · exp(𝒩(0, σ_r))`, whose multiplier has
 * `E[exp(𝒩(0,σ))] = exp(σ²/2) = 1.0113` at `σ_r = 0.15`. So the ARITHMETIC mean
 * of `r` rises from mutational bias alone, with no selection of any kind, and
 * Test A's null (σ_r = 0) removes the bias and the variation TOGETHER — it
 * cannot separate "the mean moved" from "selection moved it".
 *
 * THE DISCRIMINATOR IS THE GEOMETRIC MEAN, which is unbiased under multiplicative
 * drift: `E[log r'] = E[log r] + E[𝒩(0,σ_r)] = E[log r]`. Mutational bias moves
 * the arithmetic mean and leaves the geometric mean where it was. Measured on the
 * live model at `g = 60`, geometric mean of `r` over every live copy:
 *
 *   seed        101      202      303      404      505
 *   ON       0.2942   0.3102   0.7789   0.3765   0.2061     (arith 0.3783 .. 0.8034)
 *   NEUTRAL  0.2075   0.7059   0.8016   0.3777   0.2077     (arith 0.2446 .. 0.8275)
 *   OFF      0.1000 exactly, every seed
 *
 * The geometric mean rises to 2.06x..7.79x `r0`. That is not mutational bias; it
 * is COPY-LEVEL SELECTION — a higher-`r` copy leaves more daughters within its own
 * genome, so high-`r` lineages are over-represented among survivors. It rises in
 * the NEUTRAL arm too, which is the point: the effect needs no host selection.
 * Test A asserts it, so the claim does not live only in this comment.
 *
 * The `Math.min(p.rMax, ...)` clamp at `sim/phases/transpose.ts:33` truncates the
 * upper tail, which DEPRESSES both means. The measured rise is therefore a floor
 * on the true one, not an artefact of the ceiling.
 *
 * ------------------------------------------------------------------------------
 * EVERY TEST RUNS AT FIVE SEEDS
 * ------------------------------------------------------------------------------
 * Until 2026-09-03 this file pinned `seed = 101` and no test looped, while guards
 * 1–4 and 6 loop 3–11 seeds. Its five exploratory seeds were quoted in prose and
 * never asserted, and threshold 4's margin was quoted against seed 101 — the
 * seed the threshold was derived on. All three tests now loop
 * `SEEDS = [101, 202, 303, 404, 505]`, and every threshold below states its
 * margin under the WEAKEST seed, not under seed 101.
 *
 * ------------------------------------------------------------------------------
 * HORIZON, N AND OCCUPANCY
 * ------------------------------------------------------------------------------
 * Transposition rejection-samples an empty site, so cost per insertion scales as
 * S / (S - occupied) and explodes near saturation. Two exploratory sweeps, both
 * committed under `scripts/`, four arms, seeds 101/202/303/404/505:
 * `scripts/explore-horizon.ts` walks generations 10..110 in steps of 10 to find the
 * region where the contrasts open up, and `scripts/explore-candidates.ts` then
 * resolves the candidate marks g=55/60/65 quoted below.
 *
 *   arm      g=55    g=60    g=65    | copies g=60 | occupancy g=60
 *   ON       0.2590  0.3783  0.6261  |      40 789 |  6.80%
 *   OFF      0.1000  0.1000  0.1000  |       9 361 |  1.56%
 *   NEUTRAL  0.1843  0.2446  0.3989  |      51 198 |  8.53%
 *   STRONG   0.1266  0.1430  0.1571  |       2 237 |  0.37%
 *
 * ⚠️ THAT TABLE IS SEED 101 ONLY, AND ITS OCCUPANCY COLUMN DOES NOT GENERALISE.
 * An earlier version of this docstring said "mean occupancy stays under 9% of S
 * — far below the 50% ceiling", and that the NEUTRAL arm saturates only "beyond
 * g=65". Both are wrong, and the multi-seed loop is what exposed them. Measured
 * site occupancy at g=60, all five seeds:
 *
 *   arm      101     202     303     404     505      | asserted below
 *   ON      6.80%   5.50%  26.97%   7.33%   5.14%     | < 40%
 *   OFF     1.56%   1.88%   1.82%   1.80%   1.84%     | < 40%
 *   STRONG  0.37%   0.44%   0.44%   0.63%   0.35%     | < 40%
 *   NEUTRAL 8.53%  74.03%  74.03%  15.47%  11.95%     | < 90% only — see below
 *
 * THE NEUTRAL ARM SATURATES AT TWO OF FIVE SEEDS, at g=60, not beyond g=65. 74%
 * is precisely the regime `tests/guards/bloat-arm.ts:25` documents as the point
 * "where `transpose`'s rejection sampler" degrades. It cannot carry the 40%
 * ceiling guards 1/2/3/4 assert, so it is not given one; it is held below 90%,
 * which is the failure that would matter — an arm pinned at `S` is a model of its
 * own sampler and its mean `r` would be an artefact of the rejection loop.
 *
 * WHAT THAT COSTS THRESHOLD 3, STATED PLAINLY. Saturation INFLATES the neutral
 * arm's mean `r` (0.7599 and 0.8275 at the two saturating seeds, against
 * 0.2446/0.4916/0.2549 at the other three), which SHRINKS the strong/neutral
 * ratio and makes threshold 3 easier to pass. The retardation claim therefore
 * does not rest on those two seeds — and does not need to: the three
 * non-saturating seeds give ratios 0.5847, 0.4876 and 0.6056, each clear of the
 * 0.75 ceiling on its own. Because the loop asserts every seed independently,
 * removing the two saturating seeds would not weaken any assertion here.
 *
 * Generation 60 is kept as the horizon: it is the smallest decade mark at which
 * BOTH contrasts are unambiguous at every one of the five exploratory seeds (at
 * g=55 the strong/neutral ratio at seed 404 narrows to 0.83, versus 0.61 or
 * better at g=60). N stays at 300. Whole file measured at 7.2 s over the five
 * seeds (1.6 s Test A, 0.3 s Test B, 5.4 s Test C — the NEUTRAL arm's two
 * saturating seeds are most of that).
 *
 * Every number in this file was measured against the live model; none is copied
 * from a brief.
 *
 * ------------------------------------------------------------------------------
 * CROSS-GUARD CORROBORATION
 * ------------------------------------------------------------------------------
 * None here. Guard 5's arms are unique in the suite (`silencingOn: false` plus
 * `pDom: 0`, at `sigmaR` contrasts nothing else varies). The one place in the
 * body where two guards independently measure the same quantity is guard 3's
 * `c = 0` control against guard 4's `silencingOn: false` knockout; see the note
 * in `tests/guards/cluster-threshold.test.ts` and `tests/guards/bloat.test.ts`.
 */

/**
 * Fully pinned — all 20 fields. A guard's configuration is part of the guard, so
 * nothing here is inherited from `defaultParams`' provisional values. Every arm
 * below is this base with ONE knob moved, so the knob is the only explanation for
 * any difference. `seed` is overridden per seed by the loop.
 *
 * `silencingOn: false` and `pDom: 0` remove the piRNA trap and domestication, so
 * the contrast under test is not confounded by trapping or co-option. With those
 * off, `d`, `dTol` and `wDom` are inert (no copy is ever silenced or domesticated,
 * and `t` is 0); they are pinned to 0 rather than left at their defaults so that
 * the fitness function reduces visibly to the copy-number load alone. That was
 * verified, not assumed: zeroing them reproduces the default-valued run bit for
 * bit (40 789 copies, mean r 0.37830811461694730 in the ON arm at seed 101).
 */
const BASE: Params = {
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

const HORIZON = 60;

/** The five seeds the exploratory sweeps under `scripts/` were run at. */
const SEEDS = [101, 202, 303, 404, 505];

/** The 40% ceiling guards 1/2/3/4 assert, for the same rejection-sampler reason. */
const OCCUPANCY_CEILING = 0.4;

/**
 * The NEUTRAL arm's ceiling. Deliberately NOT 0.4 — see the docstring: this arm
 * reaches 74% at two of the five seeds, and asserting 0.4 here would fail. 0.9
 * is the bound that still catches the failure worth catching.
 */
const NEUTRAL_OCCUPANCY_CEILING = 0.9;

function arm(overrides: Partial<Params>): World {
  return createWorld(defaultParams({ ...BASE, ...overrides }));
}

/** Fraction of all sites in the population that carry a copy. */
function occupancy(world: World): number {
  let total = 0;
  for (const genome of world.genomes) total += genome.copies.length;
  return total / (world.params.N * world.params.S);
}

/**
 * Geometric mean of `r` over every live copy — the statistic mutational bias
 * cannot move. Zero if the population is empty, matching `observe`'s meanRate.
 */
function geometricMeanRate(world: World): number {
  let logSum = 0;
  let n = 0;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      logSum += Math.log(copy.r);
      n++;
    }
  }
  return n === 0 ? 0 : Math.exp(logSum / n);
}

describe("guard 5: per-copy transposition rate evolves", () => {
  /**
   * TEST A. The rise and its own null, in ONE test body, at every seed.
   *
   * Two arms at the same seed and the same horizon, differing ONLY in sigmaR. The
   * ON arm is the positive control for the OFF arm's negative assertion: if the
   * harness were broken, "no movement" would show up in BOTH arms and read as
   * broken, rather than as "no evolution, as predicted".
   */
  it("mean rate rises with the variation generator ON and does not move with it OFF", () => {
    for (const seed of SEEDS) {
      const on = arm({ seed, sigmaR: 0.15 });
      const off = arm({ seed, sigmaR: 0 });
      run(on, HORIZON);
      run(off, HORIZON);

      const onSnap = observe(on);
      const offSnap = observe(off);

      // CONTROL, asserted first: neither arm is near saturation, where
      // `transpose` stops being a model of transposition and becomes a model of
      // its own rejection sampler. Measured maxima 26.97% (ON, seed 303) and
      // 1.88% (OFF, seed 202) — a 1.48x margin at the worst seed.
      expect(
        occupancy(on),
        `seed ${seed}: the ON arm reached ${(occupancy(on) * 100).toFixed(1)}% site occupancy`,
      ).toBeLessThan(OCCUPANCY_CEILING);
      expect(
        occupancy(off),
        `seed ${seed}: the OFF arm reached ${(occupancy(off) * 100).toFixed(1)}% site occupancy`,
      ).toBeLessThan(OCCUPANCY_CEILING);

      // THRESHOLD 1: ON arithmetic mean r at g=60 measured 0.2545..0.8034 over the
      // five seeds. Asserted at 2x r0 = 0.2. The weakest seed is 505 at 0.25455,
      // whose rise above r0 is 0.15455; it would take losing 35% of THAT seed's
      // rise for this to fail (64% at seed 101, which the threshold was derived on).
      expect(
        onSnap.meanRate,
        `seed ${seed}: ON mean r ${onSnap.meanRate.toFixed(5)} did not clear 2x r0`,
      ).toBeGreaterThan(2 * BASE.r0);

      // THRESHOLD 1b, AND THE ONE THAT RULES OUT MUTATIONAL BIAS. See the
      // docstring: the arithmetic mean rises from `E[exp(𝒩(0,σ))] > 1` alone, so
      // threshold 1 on its own cannot say selection did it. The GEOMETRIC mean is
      // unbiased under multiplicative drift and must therefore stay at r0 if
      // nothing but mutation is acting. Measured 0.2061..0.7789, i.e. 2.06x..7.79x
      // r0. Asserted at 1.5x r0 = 0.15, so it fails if the weakest seed's
      // geometric rise shrinks from +106% to under +50%.
      const onGeo = geometricMeanRate(on);
      expect(
        onGeo,
        `seed ${seed}: ON geometric mean r ${onGeo.toFixed(5)} did not clear 1.5x r0 — ` +
          `the arithmetic rise (${onSnap.meanRate.toFixed(5)}) is then consistent with ` +
          `mutational bias alone and this guard's central claim is unsupported`,
      ).toBeGreaterThan(1.5 * BASE.r0);

      // THRESHOLD 2: with sigmaR = 0 the arithmetic mean is r0 up to summation error
      // only. Measured deviation |meanRate - r0| is 5.97e-15..1.54e-14 over the five
      // seeds. `toBeCloseTo` at 12 digits fails above 5e-13, a 32x margin over the
      // worst measured accumulation error, and would fail on any real drift in r
      // (one copy in 9361 moving by 1e-9 already shifts the mean by 1e-13).
      // Exactness of the individual copies — which summation error hides — is
      // Test B's job.
      expect(offSnap.meanRate).toBeCloseTo(BASE.r0, 12);

      // And the geometric mean of the null arm is r0 too, exactly: every copy
      // carries the identical double, so `exp(mean(log r0))` returns r0.
      expect(geometricMeanRate(off)).toBeCloseTo(BASE.r0, 12);

      // POSITIVE CONTROL for threshold 2: "no movement" must not be extinction.
      // Measured 9361..11303 copies across 300 genomes at g=60.
      // Copy count is the only control worth asserting here: `reproduce` refills the
      // population with an unconditional push in a `for i < p.N` loop, so genome
      // count is a structural invariant no model behaviour can violate — asserting
      // it would be an assertion that cannot fail.
      expect(offSnap.totalCopies, `seed ${seed}`).toBeGreaterThan(0);

      // And the contrast itself, stated directly: the rise requires heritable variation.
      expect(onSnap.meanRate, `seed ${seed}`).toBeGreaterThan(offSnap.meanRate);
    }
  }, 120_000);

  /**
   * TEST B. Exactness of the sigmaR = 0 arm, at EVERY generation, at every seed.
   *
   * `parent.r * Math.exp(0)` is `parent.r` identically in IEEE-754, and
   * `Math.min(1, Math.max(0, 0.1))` is 0.1 identically, so with sigmaR = 0 every
   * copy in the population must carry r0 as the SAME double, not a nearby one.
   *
   * This is deliberately stronger than a `toBeCloseTo`, and the strength is the
   * point: a mutation that shifts the daughter's r by a single ULP passes any
   * closeness check and fails this one. Checking every generation rather than only
   * the last also catches drift that later excision or recombination might purge.
   */
  it("with the variation generator off, every copy carries r0 as the identical double", () => {
    for (const seed of SEEDS) {
      const off = arm({ seed, sigmaR: 0 });

      for (let g = 1; g <= HORIZON; g++) {
        step(off);
        let checked = 0;
        let deviant: number | null = null;
        for (const genome of off.genomes) {
          for (const copy of genome.copies) {
            checked++;
            if (copy.r !== BASE.r0 && deviant === null) deviant = copy.r;
          }
        }
        // Positive control INSIDE the loop: an empty population would satisfy an
        // all-copies assertion vacuously at every generation.
        expect(checked, `seed ${seed}, generation ${g}`).toBeGreaterThan(0);
        expect(
          deviant,
          `seed ${seed}, generation ${g}: a copy carried r=${deviant} instead of exactly r0=${BASE.r0} (${checked} copies checked)`,
        ).toBeNull();
      }

      // Measured 9361..11303 copies surviving to g=60 across the five seeds, all
      // exactly 0.1.
      const snap = observe(off);
      expect(snap.totalCopies, `seed ${seed}`).toBeGreaterThan(0);
      expect(snap.meanRate).toBeCloseTo(BASE.r0, 12);
    }
  }, 120_000);

  /**
   * TEST C. Host selection RETARDS the rise; it does not reverse it.
   *
   * The naive expectation — that selection against copy number lowers the evolved
   * transposition rate — was measured on this model and is FALSE: because the COPY
   * is the unit of selection, a higher-r copy out-replicates its neighbours WITHIN
   * a genome whatever the host pays, so the between-genome effect can only slow the
   * within-genome one, never invert it.
   *
   * ⚠️ THIS IS THE RESULT THAT REQUIRES THE `r` -> TRANSPOSITION COUPLING, and it
   * is the reason the coupling is not merely decorative. Test A's rise is
   * compatible with any process that over-represents high-`r` copies. Test C's
   * asymmetry — retarded but never reversed — is a direct consequence of `r`
   * being the per-copy replication probability read by `transpose`: host selection
   * acts on the genome's copy TOTAL, so it cannot see, and therefore cannot
   * reverse, the within-genome ordering that `r` imposes.
   *
   * Measured across the five seeds at g=60:
   *
   *   seed        NEUTRAL   STRONG   ratio    STRONG / r0
   *   101          0.2446   0.1430   0.5847      1.43x
   *   202          0.7599   0.1673   0.2202      1.67x
   *   303          0.8275   0.1680   0.2030      1.68x
   *   404          0.4916   0.2397   0.4876      2.40x
   *   505          0.2549   0.1544   0.6056      1.54x
   *
   * Every seed is retarded (ratio well under 1) and every seed still sits ABOVE
   * r0. The two saturating seeds (202, 303) are discussed in the file docstring;
   * the claim does not rest on them.
   *
   * Four selection strengths were measured at seed 101, g=60: a=0 (0.24461),
   * a=0.002 (0.37831), a=0.02 (0.14303) and a=0.1/b=0.05. The three the element
   * survives all end ABOVE r0; the fourth does not reverse the direction either, it
   * kills the element. That crush arm was re-derived from its FULL per-generation
   * trace rather than a sampled grid (`scripts/explore-crush.ts`, which prints every
   * fact below as a summary block). At seed 101 it is extinct from g=37, and copy
   * number falls to that point but NOT monotonically — it rises again at five
   * transitions (g=7->8 110->116, 17->18 19->21, 18->19 21->29, 25->26 3->5,
   * 27->28 4->6).
   *
   * The naive expectation IS directionally visible in this arm, but only as an
   * early transient: mean r sits below r0 at generations 1..8, bottoming at
   * 0.09891345273912153 on g=8 (1.09% below r0, 116 copies still alive). It crosses
   * back above r0 at g=9 (0.10086120785018485, 94 copies) and the last survivor at
   * g=36 carries 0.11022974342061904.
   *
   * That transient does not survive the run and its direction is not stable across
   * seeds. Seed 202 is below r0 at 13 of its 36 generations with a live copy, seed
   * 303 at 25 of its 27, and in BOTH the last survivor is below r0 rather than above
   * it (0.09351345295060659 at g=36; 0.09287402360910908 at g=27), seed 303
   * bottoming at 0.07721633444374956 on g=23. Once copy number collapses to single
   * digits the mean is a small-sample statistic over whichever few lineages happened
   * to survive — which is why no assertion in this file rests on the crush arm.
   *
   * The one thing that is NOT selection acting on rate is the large apparent fall
   * at the end: from the extinction generation (g=37 at seeds 101 and 202, g=28 at
   * seed 303) `observe` reports meanRate 0 solely because `totalCopies` is 0, with
   * the population still at 300 genomes. That is extinction reported as a rate, and
   * it is exactly what the survival assertions below exist to exclude.
   */
  it("host selection retards the rise without reversing it", () => {
    for (const seed of SEEDS) {
      const neutral = arm({ seed, a: 0, b: 0 });
      const strong = arm({ seed, a: 0.02, b: 0.002 });
      run(neutral, HORIZON);
      run(strong, HORIZON);

      const neutralSnap = observe(neutral);
      const strongSnap = observe(strong);

      // POSITIVE CONTROL, asserted BEFORE the inequality: an extinct or emptied arm
      // would make the inequality true for the wrong reason (meanRate is reported as
      // 0 when totalCopies is 0). Measured 51 198..444 184 copies neutral,
      // 2 101..3 775 strong.
      expect(neutralSnap.totalCopies, `seed ${seed}`).toBeGreaterThan(0);
      expect(strongSnap.totalCopies, `seed ${seed}`).toBeGreaterThan(0);

      // CONTROL: the STRONG arm — the one threshold 4 rests on — is nowhere near
      // saturation. Measured 0.35%..0.63%, a >60x margin under the ceiling.
      expect(
        occupancy(strong),
        `seed ${seed}: the STRONG arm reached ${(occupancy(strong) * 100).toFixed(1)}% site occupancy`,
      ).toBeLessThan(OCCUPANCY_CEILING);

      // CONTROL, at a DIFFERENT ceiling, and the docstring says why: this arm
      // measures 8.53%..74.06% and cannot carry the suite's 40%. What 90% excludes
      // is the failure that would actually corrupt the ratio — an arm pinned at S,
      // whose mean r is then a property of the rejection loop rather than of
      // selection.
      expect(
        occupancy(neutral),
        `seed ${seed}: the NEUTRAL arm reached ${(occupancy(neutral) * 100).toFixed(1)}% site occupancy, so the ratio below is measured against a saturated genome rather than against no selection`,
      ).toBeLessThan(NEUTRAL_OCCUPANCY_CEILING);

      const ratio = strongSnap.meanRate / neutralSnap.meanRate;

      // THRESHOLD 3 (the retardation): measured ratios 0.2030..0.6056 over the five
      // seeds. Asserted at 0.75. The WEAKEST seed is 505 at 0.6056, so it fails if
      // that seed's retardation weakens from a 39.4% gap to under a 25% gap. Every
      // seed is asserted, so this no longer rests on seed 101's 0.5847.
      expect(
        ratio,
        `seed ${seed}: STRONG ${strongSnap.meanRate.toFixed(5)} is ${(100 * ratio).toFixed(1)}% of NEUTRAL ${neutralSnap.meanRate.toFixed(5)} — host selection has stopped retarding the rise`,
      ).toBeLessThan(0.75);

      // THRESHOLD 4 (retarded, NOT reversed): this is the assertion that catches a
      // regression flipping the direction of the copy-level effect. Measured strong
      // mean r 1.43x..2.40x r0; asserted at 1.2x r0 = 0.12. The WEAKEST seed is 101
      // at 0.14303, so it fails if that seed's rise above r0 shrinks from +43% to
      // under +20% — a 19% margin, the thinnest in this file, and it is now one of
      // five independent chances to fail rather than the only one.
      expect(
        strongSnap.meanRate,
        `seed ${seed}: STRONG mean r ${strongSnap.meanRate.toFixed(5)} fell to within 1.2x r0 — host selection has reversed the copy-level effect, not merely retarded it`,
      ).toBeGreaterThan(1.2 * BASE.r0);
    }
  }, 120_000);
});
