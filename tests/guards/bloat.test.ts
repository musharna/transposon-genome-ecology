import { describe, expect, it } from "vitest";
import {
  armParams,
  BASE,
  GENERATIONS,
  INVARIANCE_SEEDS,
  runArm,
  SEEDS,
  SIGMA_S_HI,
  SIGMA_S_LO,
  THETA_HI,
  THETA_LO,
} from "./bloat-arm.js";

/**
 * GUARD 4 (spec §6) — switching the piRNA silencing system off must INCREASE
 * copy number. This is the model's counterfactual arm: the one guard tied to a
 * real cross-taxon observation rather than to internal consistency.
 *
 * DIRECTION ONLY. The magnitude is not calibrated against any measurement and
 * is not asserted anywhere below. The measured knockout/silenced ratio at the
 * horizon is 2.12..4.32 across the eleven seeds; nothing in this repository
 * licenses treating any of that as a prediction, so no assertion refers to it.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES THIS GUARD HARD TO WRITE HONESTLY
 * ---------------------------------------------------------------------------
 * "Knockout has more copies" is satisfied by the silenced arm being DEAD. That
 * is not a hypothetical: at the parameter set this guard was originally
 * specified with, the silenced arm is extinct by generation 200 and the
 * comparison passes on a corpse (`tests/guards/bloat-arm.ts` records the
 * re-measured trajectory; `scripts/explore-bloat.ts` prints it as ARM 0). So
 * the liveness controls here are asserted BEFORE the comparison, per seed,
 * inside the same test body — a control in a separate `it` cannot stop a
 * comparison in this one from passing for the wrong reason.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED (scripts/explore-bloat.ts prints every number below)
 * ---------------------------------------------------------------------------
 * Guard arm, 120 generations, copies per genome at the horizon:
 *
 *   seed        1      2      3      4      5      7     11     13     17    101    202
 *   silenced 63.3   96.2   58.1   71.8   56.9   56.8   65.5   67.7  105.0   39.3   46.5
 *   knockout 234.8  204.3  177.7  189.7  219.8  214.0  181.3  162.7  276.3  169.5  196.8
 *   ratio     3.71   2.12   3.06   2.64   3.86   3.77   2.77   2.40   2.63   4.32   4.23
 *   sil'd n   2452   5332   2604   3729   2535   2298   4031   3374   5383   1659   2262
 *   ko occ   11.7%  10.2%   8.9%   9.5%  11.0%  10.7%   9.1%   8.1%  13.8%   8.5%   9.8%
 *
 * Means over the eleven seeds: silenced 66.1, knockout 202.4 copies per genome.
 * The two ranges do not overlap — the weakest knockout seed (13, at 162.7) is
 * still 1.55x the strongest silenced seed (17, at 105.0).
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GUARD DOES NOT CLAIM — READ THE ARM MODULE BEFORE GENERALISING
 * ---------------------------------------------------------------------------
 * This is a claim about THIS pinned arm at THIS horizon, not a general property
 * of the model. Three limits, all measured, all documented in full on
 * `GENERATIONS` in `./bloat-arm.js` and reproduced by ARMs 4-6 of
 * `scripts/explore-bloat.ts`:
 *   - it is a FIXED-HORIZON comparison, not an equilibrium one. Neither arm has
 *     plateaued at generation 120, the narrowest ratio decays from 2.63 there
 *     to 1.30 by generation 160, and at generation 180 the direction REVERSES
 *     at seed 17 (silenced 175.6 vs knockout 158.5) (ARM 4);
 *   - one rejected cell of the derivation grid (`c: 0.005, sigmaS: 0.2,
 *     theta: 0.02`) reverses at seeds 3 and 5 while its MEAN still points the
 *     right way — which is why the direction is asserted per seed below and not
 *     only on the means (ARM 5);
 *   - moving `r0` alone from 0.1 to 0.15 reverses the direction at seeds 11 and
 *     13 (ARM 6).
 * Anyone reading the title as "silencing knockout produces bloat, generally" is
 * over-reading it.
 */

describe("guard 4: silencing knockout produces bloat", () => {
  /**
   * TEST 1. The direction, with all three of its controls in the same body and
   * asserted before it.
   *
   * Thresholds, each a floor under the WEAKEST of the eleven seeds:
   *   - silenced arm alive at all: measured minimum 3927 copies (seed 101).
   *   - silenced arm NOT LIMPING, > 10 copies per genome: measured minimum 39.3
   *     (seed 101), a 3.9x margin. This is the assertion that goes red on the
   *     failure mode described above — the original parameterisation reaches
   *     0 copies per genome by generation 150. It is a liveness floor on the
   *     control arm, not a claim about the size of the effect.
   *   - trap actually trapping, silencedCopies > 0: measured minimum 1659
   *     (seed 101). Asserted at > 0 rather than at a floor near 1659 because a
   *     floor there would be asserting how MUCH the trap silences, which is
   *     uncalibrated.
   *   - knockout arm below saturation, occupancy < 40%: measured maximum 13.8%
   *     (seed 17), a 2.9x margin. Past roughly 40%, `transpose`'s rejection
   *     sampler needs several draws per insertion and the arm is reporting the
   *     sampler's behaviour as much as the model's; the original
   *     parameterisation's knockout arm sat at 74.4%. (Occupancy, not wall
   *     clock: run times are machine-dependent and are quoted nowhere here.)
   *
   * The comparison itself carries no threshold: it is a strict inequality,
   * asserted per seed and then on the means. It goes red if silencing stops
   * suppressing transposition — which is the whole claim.
   */
  it("knockout has more copies than the silenced control, at every seed, with both arms alive", () => {
    const silenced: number[] = [];
    const knockout: number[] = [];

    for (const seed of SEEDS) {
      const on = runArm({ seed, silencingOn: true });
      const off = runArm({ seed, silencingOn: false });

      // CONTROL 1, asserted before the comparison: BOTH arms are alive. Without
      // this, extinction of the silenced arm satisfies the comparison below and
      // the guard reports "silencing limits copy number" when what happened is
      // "silencing sterilised the population".
      expect(
        on.snapshot.totalCopies,
        `seed ${seed}: the SILENCED arm is extinct at generation ${GENERATIONS}, so the comparison below would be measuring a corpse`,
      ).toBeGreaterThan(0);
      expect(
        off.snapshot.totalCopies,
        `seed ${seed}: the KNOCKOUT arm is extinct at generation ${GENERATIONS}`,
      ).toBeGreaterThan(0);

      // CONTROL 2: the silenced arm is not merely alive but carrying a real
      // copy load — one or two copies limping is extinction in slow motion.
      expect(
        on.perGenome,
        `seed ${seed}: the silenced arm is down to ${on.perGenome.toFixed(2)} copies per genome`,
      ).toBeGreaterThan(10);

      // CONTROL 3: the trap is doing something. If nothing is silenced then the
      // two arms differ only in which RNG draws were consumed, and any
      // difference between them is noise wearing the effect's clothes.
      expect(
        on.snapshot.silencedCopies,
        `seed ${seed}: nothing is silenced in the silencing-ON arm, so there is no knockout to compare against`,
      ).toBeGreaterThan(0);

      // CONTROL 4: the knockout arm is nowhere near site saturation, where
      // `transpose` stops being a model of transposition and starts being a
      // model of its own rejection sampler.
      expect(
        off.occupancy,
        `seed ${seed}: the knockout arm reached ${(off.occupancy * 100).toFixed(1)}% site occupancy`,
      ).toBeLessThan(0.4);

      // THE CLAIM, per seed. Direction only — no ratio, no magnitude.
      expect(
        off.perGenome,
        `seed ${seed}: knockout ${off.perGenome.toFixed(1)} copies per genome did not exceed silenced ${on.perGenome.toFixed(1)}`,
      ).toBeGreaterThan(on.perGenome);

      silenced.push(on.perGenome);
      knockout.push(off.perGenome);
    }

    // THE CLAIM, on the means, which is the form the spec states it in.
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(
      mean(knockout),
      `mean knockout ${mean(knockout).toFixed(1)} did not exceed mean silenced ${mean(silenced).toFixed(1)} over ${SEEDS.length} seeds`,
    ).toBeGreaterThan(mean(silenced));
  });

  /**
   * TEST 2. The invariance that licenses the parameter choice in test 1.
   *
   * The obvious objection to re-deriving `sigmaS` and `theta` for this guard is
   * that they were tuned until the effect appeared. They cannot have been. With
   * `silencingOn` false, `trap` returns before touching the repertoire
   * (`sim/phases/trap.ts:15`), no repertoire ever forms, `isSilenced` is false
   * for every copy, and `theta` — read only at `sim/silencing.ts:15` — is never
   * consulted at all. `sigmaS` IS still consulted: `transpose` perturbs every
   * daughter's `s` by `normal() * sigmaS`. But nothing in an unsilenced world
   * ever reads `s` back. So both knobs move only the SILENCED arm, and neither
   * can manufacture the direction test 1 asserts.
   *
   * That is an argument. This test is the measurement, and it is worth keeping
   * permanently: it pins the claim that `s` cannot affect an unsilenced world.
   * Both halves carry a positive control in this same body, because "changing
   * X changed nothing" is exactly the assertion that also passes when X was
   * never applied:
   *   - for `sigmaS`, the control is internal to the knockout arm — the
   *     structural hash, which unlike the snapshot does see `s`, MUST differ.
   *     Measured: totals identical (23475 / 21983 / 16949 at seeds 1 / 5 / 101)
   *     and in fact the WHOLE snapshot is identical, while the hashes differ
   *     (6b0da952 vs b892bbc8 at seed 1).
   *   - for `theta` no such internal control exists — theta genuinely touches
   *     nothing in an unsilenced world, and the hash is byte-identical too. So
   *     the control is the matched silenced arm at the same seeds, where the
   *     same theta change is enormous: 6329 -> 186, 5693 -> 581, 3927 -> 54.
   *
   * `sigmaS` also does not change the NUMBER of RNG draws consumed: `transpose`
   * calls `normal()` unconditionally, including when sigmaS is 0. That is why
   * the two runs stay on the same stream and the snapshots match exactly rather
   * than approximately, and it is why that call must not be "optimised" away.
   */
  it("in an unsilenced world s cannot affect anything: copy number is invariant to sigmaS and to theta", () => {
    for (const seed of INVARIANCE_SEEDS) {
      // --- sigmaS, in the knockout arm ---
      const sLo = runArm({ seed, silencingOn: false, sigmaS: SIGMA_S_LO });
      const sHi = runArm({ seed, silencingOn: false, sigmaS: SIGMA_S_HI });

      // POSITIVE CONTROL FIRST: sigmaS really did reach `transpose` and really
      // did move the sequence coordinates. Without this, an override that was
      // silently dropped would satisfy the invariance below.
      expect(
        sHi.hash,
        `seed ${seed}: sigmaS ${SIGMA_S_LO} -> ${SIGMA_S_HI} left the world structurally identical, so it never took effect and the invariance below is vacuous`,
      ).not.toBe(sLo.hash);

      // THE INVARIANCE. Not just copy number: every observable in the snapshot.
      expect(
        sHi.snapshot,
        `seed ${seed}: sigmaS changed the knockout arm — s is leaking into unsilenced dynamics`,
      ).toEqual(sLo.snapshot);

      // --- theta, in the knockout arm ---
      const tLo = runArm({ seed, silencingOn: false, theta: THETA_LO });
      const tHi = runArm({ seed, silencingOn: false, theta: THETA_HI });

      // POSITIVE CONTROL FIRST, from the matched silenced arm: theta is a live
      // parameter at these seeds and this horizon, and a very large one.
      const onLo = runArm({ seed, silencingOn: true, theta: THETA_LO });
      const onHi = runArm({ seed, silencingOn: true, theta: THETA_HI });
      expect(
        onHi.snapshot.totalCopies,
        `seed ${seed}: theta ${THETA_LO} -> ${THETA_HI} changed nothing even WITH silencing on, so theta is inert everywhere and the invariance below means nothing`,
      ).not.toBe(onLo.snapshot.totalCopies);

      // THE INVARIANCE. theta is read at exactly one line, inside `isSilenced`,
      // over a repertoire that is empty in this arm — so this is byte-identical,
      // hash included, not merely equal in copy number.
      expect(
        tHi.snapshot,
        `seed ${seed}: theta changed the knockout arm, where no repertoire exists for it to threshold against`,
      ).toEqual(tLo.snapshot);
      expect(
        tHi.hash,
        `seed ${seed}: theta perturbed the knockout world's structure`,
      ).toBe(tLo.hash);
    }
  });

  /**
   * The arm — the fully pinned 20-field `BASE`, the seed sets, the horizon, the
   * contrast values and the runner — lives in `./bloat-arm.js`, shared with
   * `scripts/explore-bloat.ts` so the guard and the sweep that derives its
   * numbers cannot drift apart. That module carries the rationale for every
   * pinned field, including why the two arms differ in `silencingOn` and
   * nothing else. Nothing here re-declares any of it, and this test checks that
   * "differ in nothing else" against the live `BASE` rather than trusting the
   * prose. It uses `armParams`, not `runArm`, so it costs no generations.
   */
  it("the two arms differ in silencingOn and in nothing else", () => {
    const on = armParams({ seed: 1, silencingOn: true });
    const off = armParams({ seed: 1, silencingOn: false });
    const differing = (Object.keys(BASE) as (keyof typeof BASE)[]).filter(
      (k) => on[k] !== off[k],
    );
    expect(
      differing,
      "the knockout and silenced arms are no longer matched, so a difference between them is no longer attributable to silencing",
    ).toEqual(["silencingOn"]);
    // And the loop above really ranged over all twenty fields. This does NOT
    // catch a change to `Params` itself — `BASE` is typed as `Params`, so
    // adding or removing a field there is a `tsc` error, not a test failure.
    // What it catches is `BASE` acquiring a key that is not a `Params` field,
    // which a spread can introduce silently and which the filter above would
    // then compare as `undefined !== undefined` and quietly ignore.
    expect(
      Object.keys(BASE).length,
      "BASE no longer has exactly the 20 Params fields — an extra key would be compared as undefined on both arms and silently ignored above",
    ).toBe(20);
  });
});
