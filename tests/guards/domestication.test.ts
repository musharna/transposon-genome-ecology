import { describe, expect, it } from "vitest";
import { defaultParams, type Params } from "../../sim/index.js";
import {
  armParams,
  BASE,
  GENERATIONS,
  MIN_ASEXUAL_DOMESTICATED_PER_GENOME,
  MIN_DOMESTICATED_PER_GENOME,
  MIN_PEAK_DOMESTICATED,
  MIN_PEAK_FAMILY_PER_GENOME,
  runArm,
  SEEDS,
  STABILITY_MARKS,
  WDOM_ABOVE,
  WDOM_BELOW,
} from "./domestication-arm.js";

/**
 * GUARD 8 (spec §3.2 step 3, §4 "Domestication") — domestication is an
 * ALTERNATE WIN, above a benefit threshold the shipped defaults do not meet.
 *
 * The spec's claim is that a copy which stops being a parasite persists by
 * being useful — syncytin and RAG1 are the real cases it names. What the model
 * does is narrower and this guard asserts exactly that narrower thing:
 *
 *   - BELOW the threshold domesticated copies are made and then LOST. This is
 *     the positive control: it proves the measurement can see loss, and it is
 *     run at the SHIPPED DEFAULT `wDom = 0.01`, so the guard goes red if anyone
 *     "fixes" the default without re-deriving the arm.
 *   - ABOVE the threshold they persist THROUGH THE FAMILY'S DEATH — the
 *     still-transposing copies reach exactly zero and the domesticated ones
 *     stay. That is the alternate win, and it is the assertion that fails if
 *     someone makes domesticated copies excisable or lets them transpose.
 *   - The ASEXUAL arm pins the loss route to segregation: at the same
 *     below-threshold bonus, `sexual: false` keeps them at every seed.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ A SPEC CLAIM THIS GUARD DELIBERATELY DOES NOT VINDICATE
 * ---------------------------------------------------------------------------
 * Spec §4 lists domestication as a poke with no qualification, and §3.2 step 3
 * describes it as a fitness bonus with permanent transposition-off. AT THE
 * SHIPPED DEFAULTS THAT IS NOT WHAT HAPPENS: `defaultParams`' `wDom = 0.01` is
 * roughly 7.5x below the lowest bonus at which every seed retains a single
 * domesticated copy, and `beta = 0.005, pDom = 0.001` make the event rare on top
 * of that. The alternate win is a real behaviour of this model and an
 * UNREACHABLE one at the values the toy ships with.
 *
 * That is written down rather than papered over: `docs/ROADMAP.md` carries it as
 * an open calibration item, and the defaults were NOT changed here — changing
 * `wDom` moves every other guard's derivation and the golden hash in
 * `tests/step.test.ts`. The guard's below-threshold arm IS the shipped default,
 * so the finding is asserted rather than merely noted.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED (scripts/explore-domestication.ts prints every number)
 * ---------------------------------------------------------------------------
 * At generation 600, eleven seeds. Counts are population totals; per genome is
 * over N = 200.
 *
 *   BELOW, wDom = 0.01 (the shipped default)
 *   seed        1    2    3    4    5    7   11   13   17  101  202
 *   peak dom  397  496  548  299  543  195  341  446  289  595  308
 *   peak gen   39   28   44   42   34   39   44   30   35   36   26
 *   last gen  374  160  219  172  199  139  161  275  131  183  179
 *   dom@600     0    0    0    0    0    0    0    0    0    0    0
 *
 *   ABOVE, wDom = 0.3
 *   seed           1     2     3     4     5     7    11    13    17   101   202
 *   dom/gen@600  20.5  21.1  19.2  21.4  19.9  21.4  21.1  18.6  19.8  17.8  22.2
 *   min@4 marks  19.6  21.1  19.2  20.6  19.9  21.4  21.1  18.6  17.7  16.6  22.2
 *   min@all gens 17.8  19.6  18.0  18.6  18.7  21.3  20.7  17.4  16.8  15.9  20.6
 *   peak family  15.7  22.1  10.9  14.4  15.6  27.4  31.1  16.3  12.6  10.8  32.7
 *   family dies@  118   145    87   110   102   158   131   116   119   121   104
 *   family@600      0     0     0     0     0     0     0     0     0     0     0
 *
 *   ⚠️ THE TWO MINIMUM ROWS ARE DIFFERENT QUANTITIES AND ONLY THE FIRST IS
 *   ASSERTED. `min@4 marks` is the minimum over generations 150/300/450/600 —
 *   the four values the floor below actually reads — and its worst seed is
 *   16.59, a 1.66x margin over the floor of 10. `min@all gens` is the minimum
 *   over every generation from 150 to 600 (worst seed 15.85, 1.58x); it is the
 *   stricter bound, nothing checks it, and an earlier version of this guard
 *   printed it under the first row's label. Both are now computed by `runArm`
 *   and printed side by side by ARM 1 of `scripts/explore-domestication.ts`.
 *
 *   ASEXUAL CONTROL, wDom = 0.01, sexual = false
 *   seed          1     2     3     4     5     7    11    13    17   101   202
 *   dom/gen@600 13.0  13.0   4.0   6.0   9.0   4.0   8.0   4.0   5.0   5.0  14.0
 *
 * The full `wDom` grid, the horizon probe to generation 2000, and the
 * non-monotone response above `wDom = 0.3` are in `./domestication-arm.js`.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GUARD DOES NOT CLAIM — READ THE ARM MODULE BEFORE GENERALISING
 * ---------------------------------------------------------------------------
 *   - IT DOES NOT LOCATE A THRESHOLD IN THE MODEL. It locates one in THIS arm at
 *     THIS `N` and THIS horizon — a drift-versus-selection balance that moves
 *     with population size, excision rate, domestication supply and how long you
 *     run. The measured band here is `0.03 < wDom* <= 0.075`; at `wDom = 0.05`
 *     five of eleven seeds still hold copies at generation 600 and none do at
 *     generation 1000. "0.075" is not a property of the model.
 *   - IT DOES NOT CLAIM MORE BONUS IS MORE DOMESTICATION. The response is
 *     non-monotone above `wDom ~ 0.3` at every seed, and the arm module records
 *     what was and was not established about why. No assertion below depends on
 *     it.
 *   - IT DOES NOT CLAIM ASEXUALITY FAVOURS DOMESTICATION. The asexual arm is a
 *     mechanism control, and under clonal reproduction a copy that neither
 *     excises nor transposes cannot leave a fixed lineage at all. See the arm
 *     module: at `wDom = 0` three of eleven asexual seeds still end at zero.
 *   - IT DOES NOT ASSERT A DOMESTICATED COUNT AS A PREDICTION. The ~20 copies
 *     per genome the above-threshold arm settles at is uncalibrated against
 *     anything; only the floor is asserted, and only to separate it from zero.
 */

describe("guard 8: domestication is an alternate win, above a benefit threshold", () => {
  /**
   * TEST 1 — CLAIM A: below the threshold, domesticated copies are made and
   * then lost.
   *
   * This is also the positive control for test 2. "They are lost" is satisfied
   * by a world in which none was ever made, so the peak is asserted FIRST, in
   * this same body, per seed. A control in a separate `it` cannot stop this one
   * from passing for the wrong reason.
   *
   * The mutation this is here to catch: anything that exempts a domesticated
   * copy from segregation in `sim/phases/reproduce.ts` — the loss route this
   * guard identifies — makes the shipped default persist and turns this red.
   */
  it("below the threshold, at the SHIPPED DEFAULT bonus, domesticated copies appear and are then lost entirely", () => {
    for (const seed of SEEDS) {
      const below = runArm({ seed, wDom: WDOM_BELOW });

      // CONTROL, asserted before the claim: domestication ACTUALLY HAPPENED.
      // Without this, `pDom` silently reaching zero, `isBeneficialSite` never
      // being true, or the family dying before it can reach a beneficial site
      // all satisfy the claim below, and the guard reports "domesticated copies
      // are lost" when what happened is "none was ever made".
      expect(
        below.peakDomCount,
        `seed ${seed}: only ${below.peakDomCount} domesticated copies were ever made at wDom ${WDOM_BELOW}, so "they are lost" below would be vacuous`,
      ).toBeGreaterThan(MIN_PEAK_DOMESTICATED);

      // THE CLAIM. Exactly zero, not "few": at this bonus the loss is total at
      // every seed, and the last generation holding one is 374 at the slowest
      // seed against a horizon of 600.
      expect(
        below.domCount,
        `seed ${seed}: ${below.domCount} domesticated copies survive to generation ${GENERATIONS} at the shipped default wDom ${WDOM_BELOW} (peak was ${below.peakDomCount} at generation ${below.peakDomGeneration})`,
      ).toBe(0);
    }
  });

  /**
   * TEST 2 — CLAIM B: above the threshold they persist, and specifically they
   * persist THROUGH THE FAMILY'S DEATH.
   *
   * The family dying is not incidental, it is half the claim. The same
   * parameters that kill every still-transposing copy — silencing with no escape
   * by divergence, then excision — leave the domesticated ones untouched,
   * because `lose` exempts them and `isSilenced` returns false for them. Both
   * halves are asserted per seed in this body: family at exactly zero, and
   * domesticated above the floor at four marks spanning generations 150 to 600.
   *
   * The mutation this is here to catch: deleting `!c.domesticated &&` from
   * `activeCopies` in `sim/silencing.ts`, so a domesticated copy transposes
   * again. Its daughters are ordinary copies (`sim/phases/transpose.ts:43` sets
   * `domesticated: false`), the family is therefore never dead, and this goes
   * red at seed 1 with "39954 non-domesticated copies remain at generation 600,
   * so the domesticated copies have not outlived anything".
   *
   * ⚠️ A MUTATION THIS TEST DOES **NOT** CATCH, MEASURED AND RECORDED RATHER
   * THAN GUESSED. Deleting `c.domesticated ||` from `sim/phases/lifecycle.ts`'s
   * `lose` filter — making domesticated copies excisable at rate `v` like
   * everything else — LEAVES THIS TEST GREEN. Measured at all eleven seeds: the
   * count at the four marks becomes 15.49..26.54 per genome against 16.59..22.16
   * unmutated. At `wDom = 0.3` selection replaces excision losses as fast as
   * `v = 0.005` inflicts them, so the excision exemption is not load-bearing at
   * THIS arm. It is load-bearing in test 3's asexual arm, which the same
   * mutation turns red (falling to 1.18 per genome at seed 2) — and the reason
   * is that ONCE THE CLONE HAS FIXED there is no variation left for selection to
   * act on, so nothing can replace what excision takes. It is NOT that selection
   * is absent from the asexual arm: selection does substantial work there,
   * choosing WHICH clone fixes. Measured, asexual per genome at generation 600 —
   * `wDom = 0`: 1.17 0.00 1.00 2.00 1.67 2.72 1.00 0.00 2.00 0.00 1.00, against
   * `wDom = 0.01`: 13.00 13.00 4.00 6.00 9.00 4.00 8.00 4.00 5.00 5.00 14.00.
   * Nothing in this guard should be read as asserting the exemption in `lose`;
   * the assertion that covers it is test 3's.
   */
  it("above the threshold, domesticated copies outlive the family: the transposing copies reach zero and the domesticated ones stay", () => {
    for (const seed of SEEDS) {
      const above = runArm({ seed, wDom: WDOM_ABOVE });

      // CONTROL, asserted before the claim: THERE WAS A FAMILY TO DIE. "The
      // transposing copies reached zero" is satisfied by a world where they
      // never got anywhere, so the control is the peak family size, which is
      // independent of `wDom` and of everything the claim asserts.
      //
      // (This replaces an earlier control, `above.domCount > 0`, which was
      // strictly IMPLIED by the floor below — 10 per genome at N = 200 is 2000
      // copies — so it could not fire unless the claim also failed, and it
      // pre-empted: removing `+ p.wDom * nDom` from `logFitness` turned this
      // test red at that control rather than at the floor, hiding which
      // assertion had actually caught the mutation. Same defect as the one fixed
      // in test 3, one test up.)
      expect(
        above.peakFamilyPerGenome,
        `seed ${seed}: the family never exceeded ${above.peakFamilyPerGenome.toFixed(2)} copies per genome, so it did not die — it never lived`,
      ).toBeGreaterThan(MIN_PEAK_FAMILY_PER_GENOME);

      // THE CLAIM, first half: the parasitic family is EXTINCT. Not "reduced" —
      // exactly zero non-domesticated copies in the whole population. Measured
      // to reach zero at generation 87..158 and stay there.
      expect(
        above.familyCount,
        `seed ${seed}: ${above.familyCount} non-domesticated copies remain at generation ${GENERATIONS}, so the domesticated copies have not outlived anything`,
      ).toBe(0);

      // THE CLAIM, second half: and they are STABLE, not in transit. Asserted at
      // every mark, all of which are past the family's death at every seed, so
      // this is a claim about a post-family world at each of four points rather
      // than a single endpoint that a slow decay could still be passing through.
      above.atMarks.forEach((perGenome, i) => {
        const mark = STABILITY_MARKS[i]!;
        expect(
          perGenome,
          `seed ${seed}: domesticated copies fell to ${perGenome.toFixed(2)} per genome at generation ${mark}`,
        ).toBeGreaterThan(MIN_DOMESTICATED_PER_GENOME);
      });
    }
  });

  /**
   * TEST 3 — CLAIM C: the loss below the threshold is SEGREGATION, and the
   * asexual arm is what pins it there.
   *
   * Same bonus, same seeds, same everything except `sexual`. The fitness
   * function is untouched between the arms, so selection cannot be the
   * difference; `lose` is untouched and exempts domesticated copies in both, so
   * excision cannot be either; and `sim/phases/reproduce.ts:49` copies the flag
   * verbatim in both branches, so it is not a lost flag. What is left is the
   * free-recombination branch, where each of a parent's copies is kept with
   * probability 1/2 — and a copy that has given up transposition has no way to
   * replace what that loses.
   *
   * The sexual half is asserted in this same body rather than borrowed from
   * test 1: a comparison whose other arm lives in a different `it` can pass
   * while that arm is failing.
   *
   * The mutation this is here to catch: making the asexual branch of
   * `reproduce` segregate domesticated copies the way the sexual branch does.
   * Measured: this goes red at seed 1 with "the ASEXUAL arm fell to 0.00
   * domesticated copies per genome", while tests 1 and 2 — both sexual — stay
   * green.
   */
  it("the loss is segregation: at the same below-threshold bonus, asexual reproduction keeps them and sexual does not", () => {
    for (const seed of SEEDS) {
      const sexual = runArm({ seed, wDom: WDOM_BELOW, sexual: true });
      const asexual = runArm({ seed, wDom: WDOM_BELOW, sexual: false });

      // CONTROL, asserted before the comparison, ON THE SEXUAL ARM — the arm
      // whose asserted result is zero, and therefore the only one of the two
      // that a "nothing ever happened" world could satisfy vacuously. The
      // asexual arm needs no such control: its assertion is that a count is
      // ABOVE a floor, which no empty world passes.
      //
      // (An earlier version of this guard put this control on the asexual arm
      // instead. It was wrong in a way worth recording: under the mutation this
      // test exists to catch, the asexual arm's peak count falls BELOW the floor
      // too, so the control fired first and the claim below was never reached —
      // a control that pre-empts its own claim is not a control, it is a second
      // assertion of the same thing.)
      expect(
        sexual.peakDomCount,
        `seed ${seed}: only ${sexual.peakDomCount} domesticated copies were ever made in the sexual arm, so its zero below is vacuous`,
      ).toBeGreaterThan(MIN_PEAK_DOMESTICATED);

      // THE CONTRAST. Sexual loses them all; asexual keeps them, at the same
      // bonus, same seed, same horizon.
      expect(
        sexual.domCount,
        `seed ${seed}: the SEXUAL arm retained ${sexual.domCount} domesticated copies at wDom ${WDOM_BELOW}, so there is no loss for the asexual arm to be a control on`,
      ).toBe(0);
      expect(
        asexual.domPerGenome,
        `seed ${seed}: the ASEXUAL arm fell to ${asexual.domPerGenome.toFixed(2)} domesticated copies per genome, so removing segregation did not preserve them and the loss is not attributable to it`,
      ).toBeGreaterThan(MIN_ASEXUAL_DOMESTICATED_PER_GENOME);
    }
  });

  /**
   * The arm — the fully pinned 20-field `BASE`, the seed set, the horizon, the
   * two bonuses and the runner — lives in `./domestication-arm.js`, shared with
   * `scripts/explore-domestication.ts` so the guard and the sweep that derives
   * its numbers cannot drift apart.
   *
   * This test checks the "differ in nothing else" claims against the live
   * `BASE` rather than trusting the prose above, and it uses `armParams`, not
   * `runArm`, so it costs no generations.
   */
  it("the arms differ in exactly the one field each contrast names", () => {
    const differing = (a: Params, b: Params) =>
      (Object.keys(BASE) as (keyof Params)[]).filter((k) => a[k] !== b[k]);

    const below = armParams({ seed: 1, wDom: WDOM_BELOW });
    const above = armParams({ seed: 1, wDom: WDOM_ABOVE });
    expect(
      differing(below, above),
      "the below- and above-threshold arms are no longer matched, so the contrast between them is no longer attributable to the domestication bonus",
    ).toEqual(["wDom"]);

    const sexual = armParams({ seed: 1, wDom: WDOM_BELOW, sexual: true });
    const asexual = armParams({ seed: 1, wDom: WDOM_BELOW, sexual: false });
    expect(
      differing(sexual, asexual),
      "the sexual and asexual arms are no longer matched, so the contrast between them is no longer attributable to segregation",
    ).toEqual(["sexual"]);

    // And the below-threshold arm really is the shipped default bonus, which is
    // the whole point of test 1 being run at it. If `defaultParams` is ever
    // recalibrated, this goes red and the arm must be re-derived rather than
    // silently continuing to describe a value the project no longer ships.
    expect(
      WDOM_BELOW,
      `the below-threshold arm (wDom ${WDOM_BELOW}) is no longer the shipped default (${defaultParams().wDom}), so this guard has stopped being a statement about the configuration the toy runs at — re-derive the arm rather than editing this line`,
    ).toBe(defaultParams().wDom);
  });
});
