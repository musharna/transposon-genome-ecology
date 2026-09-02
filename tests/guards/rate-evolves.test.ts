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
 * HORIZON, N AND OCCUPANCY (all measured in this task, seed 101, N = 300)
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
 * Generation 60 is the chosen horizon: it is the smallest decade mark at which
 * BOTH contrasts are unambiguous at every one of the five exploratory seeds
 * (at g=55 the strong/neutral ratio at seed 404 narrows to 0.83, versus 0.61 or
 * better at g=60), while mean occupancy stays under 9% of S — far below the 50%
 * ceiling where the rejection sampler starts to dominate runtime. N stays at 300.
 * Beyond g=65 the NEUTRAL arm saturates on some seeds (74% occupancy at seed 303,
 * ~8 s for a single arm), which is why the horizon is not pushed further to widen
 * the gaps. Whole file measured at roughly 1 s of simulation.
 *
 * Every number in this file was measured in this task; none is copied from a brief.
 */

/**
 * Fully pinned — all 20 fields. A guard's configuration is part of the guard, so
 * nothing here is inherited from `defaultParams`' provisional values. Every arm
 * below is this base with ONE knob moved, so the knob is the only explanation for
 * any difference.
 *
 * `silencingOn: false` and `pDom: 0` remove the piRNA trap and domestication, so
 * the contrast under test is not confounded by trapping or co-option. With those
 * off, `d`, `dTol` and `wDom` are inert (no copy is ever silenced or domesticated,
 * and `t` is 0); they are pinned to 0 rather than left at their defaults so that
 * the fitness function reduces visibly to the copy-number load alone. That was
 * verified, not assumed: zeroing them reproduces the default-valued run bit for
 * bit (40 789 copies, mean r 0.37830811461694730 in the ON arm).
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

function arm(overrides: Partial<Params>): World {
  return createWorld(defaultParams({ ...BASE, ...overrides }));
}

describe("guard 5: per-copy transposition rate evolves", () => {
  /**
   * TEST A. The rise and its own null, in ONE test body.
   *
   * Two arms at the same seed and the same horizon, differing ONLY in sigmaR. The
   * ON arm is the positive control for the OFF arm's negative assertion: if the
   * harness were broken, "no movement" would show up in BOTH arms and read as
   * broken, rather than as "no evolution, as predicted".
   */
  it("mean rate rises with the variation generator ON and does not move with it OFF", () => {
    const on = arm({ sigmaR: 0.15 });
    const off = arm({ sigmaR: 0 });
    run(on, HORIZON);
    run(off, HORIZON);

    const onSnap = observe(on);
    const offSnap = observe(off);

    // THRESHOLD 1: measured ON mean r at g=60 is 0.37830811461694730, i.e. 3.78x r0.
    // Asserted at 2x r0 = 0.2. The ON arm's rise above r0 is 0.2783; it would take
    // losing 64% of that rise for this to fail. The floor also clears every
    // exploratory seed measured (the weakest, seed 505, reached 0.2545 at g=60).
    expect(onSnap.meanRate).toBeGreaterThan(2 * BASE.r0);

    // THRESHOLD 2: with sigmaR = 0 the arithmetic mean is r0 up to summation error
    // only. Measured deviation |meanRate - r0| over 9361 copies is 1.54e-14; the
    // worst deviation at ANY generation in 1..60 is also 1.54e-14. `toBeCloseTo`
    // at 12 digits fails above 5e-13, a 32x margin over the measured accumulation
    // error, and would fail on any real drift in r (one copy in 9361 moving by
    // 1e-9 already shifts the mean by 1e-13). Exactness of the individual copies —
    // which summation error hides — is Test B's job.
    expect(offSnap.meanRate).toBeCloseTo(BASE.r0, 12);

    // POSITIVE CONTROL for threshold 2: "no movement" must not be extinction.
    // Measured 9361 copies across 300 genomes at g=60 (1.56% occupancy).
    // Copy count is the only control worth asserting here: `reproduce` refills the
    // population with an unconditional push in a `for i < p.N` loop, so genome
    // count is a structural invariant no model behaviour can violate — asserting
    // it would be an assertion that cannot fail.
    expect(offSnap.totalCopies).toBeGreaterThan(0);

    // And the contrast itself, stated directly: the rise requires heritable variation.
    expect(onSnap.meanRate).toBeGreaterThan(offSnap.meanRate);
  });

  /**
   * TEST B. Exactness of the sigmaR = 0 arm, at EVERY generation.
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
    const off = arm({ sigmaR: 0 });

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
      expect(checked).toBeGreaterThan(0);
      expect(
        deviant,
        `generation ${g}: a copy carried r=${deviant} instead of exactly r0=${BASE.r0} (${checked} copies checked)`,
      ).toBeNull();
    }

    // Measured: 9361 copies survive to g=60, all exactly 0.1.
    const snap = observe(off);
    expect(snap.totalCopies).toBeGreaterThan(0);
    expect(snap.meanRate).toBeCloseTo(BASE.r0, 12);
  });

  /**
   * TEST C. Host selection RETARDS the rise; it does not reverse it.
   *
   * The naive expectation — that selection against copy number lowers the evolved
   * transposition rate — was measured on this model and is FALSE: because the COPY
   * is the unit of selection, a higher-r copy out-replicates its neighbours WITHIN
   * a genome whatever the host pays, so the between-genome effect can only slow the
   * within-genome one, never invert it.
   *
   * Measured at seed 101, g=60: NEUTRAL mean r 0.24461191306928531 versus
   * STRONG mean r 0.14302729174503145 — the strong arm is retarded to 58.5% of the
   * neutral arm, yet still sits 43% ABOVE r0.
   *
   * Four selection strengths were measured here at seed 101, g=60: a=0 (0.24461),
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
    const neutral = arm({ a: 0, b: 0 });
    const strong = arm({ a: 0.02, b: 0.002 });
    run(neutral, HORIZON);
    run(strong, HORIZON);

    const neutralSnap = observe(neutral);
    const strongSnap = observe(strong);

    // POSITIVE CONTROL, asserted BEFORE the inequality: an extinct or emptied arm
    // would make the inequality true for the wrong reason (meanRate is reported as
    // 0 when totalCopies is 0). Measured 51 198 copies neutral, 2 237 strong.
    expect(neutralSnap.totalCopies).toBeGreaterThan(0);
    expect(strongSnap.totalCopies).toBeGreaterThan(0);

    // THRESHOLD 3 (the retardation): measured ratio strong/neutral = 0.5847.
    // Asserted at 0.75, so it fails if the retardation weakens from a 41.5% gap to
    // under a 25% gap. The 0.75 ceiling clears all five exploratory seeds at g=60
    // (ratios 0.585, 0.220, 0.203, 0.488, 0.606), so it is not tuned to seed 101.
    expect(strongSnap.meanRate).toBeLessThan(0.75 * neutralSnap.meanRate);

    // THRESHOLD 4 (retarded, NOT reversed): this is the assertion that catches a
    // regression flipping the direction of the copy-level effect. Measured strong
    // mean r 0.14303 = 1.43x r0; asserted at 1.2x r0 = 0.12, so it fails if the
    // strong arm's rise above r0 shrinks from +43% to under +20%. The weakest of
    // the five exploratory seeds at g=60 was 0.1430 — seed 101 itself.
    expect(strongSnap.meanRate).toBeGreaterThan(1.2 * BASE.r0);
  });
});
