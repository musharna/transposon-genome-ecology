import { describe, expect, it } from "vitest";
import {
  activeCopies,
  logFitness,
  silencedCopies,
  type Params,
} from "../../sim/index.js";
import {
  armParams,
  BASE,
  constructGenome,
  FITNESS_PARAMS,
  GENERATIONS,
  HEAVY,
  LIGHT,
  MIN_CLUSTER_COPIES,
  MIN_RESIST_REPERTOIRE,
  runArm,
  SEEDS,
  T_NEAR_BOUNDARY,
  T_RESIST,
  T_TOLERATE,
} from "./tolerance-arm.js";

/**
 * GUARD 9 (spec §3.2 steps 2 and 5, §4 "Resistance ↔ tolerance") — the host
 * strategy dial is a difference IN KIND, not in degree.
 *
 * Two independent senses, and the guard asserts both because either alone would
 * be a weaker claim than the spec makes:
 *
 *   A. CONSCRIPTABILITY IS BINARY AT THE ENDPOINT. A purely tolerant host never
 *      forms a piRNA repertoire, so the trap — which is made of the element
 *      itself — cannot be built from it EVEN IN PRINCIPLE. And the boundary is a
 *      discontinuity, not the end of a slope: a host that resists one time in a
 *      hundred (`t = 0.99`) still ends up with every genome carrying a
 *      repertoire.
 *   B. `damageLoad` CHARGES A DIFFERENT POPULATION AT EACH END OF THE DIAL, and
 *      the visible consequence is that the fitness ORDERING between two genomes
 *      of equal copy number and opposite composition REVERSES: the active-heavy
 *      one is fitter at `t = 0`, the silenced-heavy one at `t = 1`.
 *
 *      ⚠️ WHICH ASSERTION CARRIES THIS, precisely, because the reversal is the
 *      memorable part and is NOT the discriminating part. Test 3 asserts four
 *      hand-computed log-fitness VALUES first (−0.05 / −0.40 / −0.40 / −0.05,
 *      one multiplication each from spec §3.2 step 5), and those four pin the
 *      whole shape. The reversal and the `t = 0.5` crossing that follow them are
 *      ARITHMETICALLY ENTAILED by those values — they cannot fail while the four
 *      pass, and the mutation for this claim fires at the third VALUE, not at
 *      the ordering. They are kept because they state the claim in the form the
 *      spec states it and their messages name the mechanism at the failure site;
 *      they add no coverage and must not be counted as separate checks.
 *
 * Before this task neither was asserted anywhere: `t = 0` in all seven
 * scientific arms and in both parameter defaults, so `damageLoad`'s tolerance
 * branch never executed in a population run and `trap`'s `1 - t` gate was
 * always `>= 1`.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED (scripts/explore-tolerance.ts prints every number)
 * ---------------------------------------------------------------------------
 * Generation 150, eleven seeds, `N = 100`:
 *
 *   t = 1   fractionWithRepertoire 0.000 at every seed, and no genome held an
 *           entry at ANY of the 150 generations, at any seed. Copies sitting in
 *           cluster sites at the horizon: 268..463. Copies per genome
 *           151.5..229.3, site occupancy 7.6%..11.5%. Silenced copies: 0.
 *   t = 0   fractionWithRepertoire 1.000 at every seed, 11.70..21.57 repertoire
 *           entries per genome, 1540..4316 silenced copies, copies per genome
 *           28.4..76.7.
 *   t = .99 fractionWithRepertoire 1.000 at every seed, 3.00..6.21 entries per
 *           genome.
 *
 * The two repertoire-size ranges at `t = 0` and `t = 0.99` do not overlap
 * (max 6.21 against min 11.70).
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS GUARD DOES NOT CLAIM — AND ONE THING IT REFUSES TO CLAIM
 * ---------------------------------------------------------------------------
 *   - ⚠️ IT DOES NOT CLAIM THE DIAL IS GRADED IN THE POPULATION. That was
 *     measured and it is FALSE at this arm: mean repertoire entries per genome
 *     at generation 150 is non-monotone in `t` over {0, 0.25, 0.5, 0.75} at ten
 *     of the eleven seeds — the response is flat inside seed noise until
 *     `t > 0.75`, because the repertoire saturates. `./tolerance-arm.js` has the
 *     table. The only graded statement asserted below is the far weaker
 *     `t = 0.99` < `t = 0`, which holds per seed with non-overlapping ranges,
 *     and it is there as a positive control on the dial rather than as a
 *     gradient claim.
 *   - IT DOES NOT CLAIM TOLERANCE IS WORSE, OR BETTER. The tolerant arm carries
 *     more copies here (151..229 per genome against 28..77), but `d` and `dTol`
 *     are set equal for the contrast and are not calibrated against anything, so
 *     no welfare comparison is licensed and none is asserted.
 *   - IT DOES NOT CLAIM `t = 0.999` BEHAVES LIKE `t = 0.99`. It does not, at
 *     this horizon: `fractionWithRepertoire` there is 0.030 at seed 4 and 0.070
 *     at seed 3 while six other seeds are at 1.000. 0.999 is the measured edge
 *     of the claim, recorded in the arm module and deliberately not the arm.
 *   - THE FITNESS TESTS ARE ARITHMETIC ON CONSTRUCTED GENOMES, NOT A POPULATION
 *     RESULT. They say what `damageLoad` and `logFitness` do to two genomes; they
 *     do not say that a population run ever contains such a pair.
 */

describe("guard 9: resistance and tolerance differ in kind, not in degree", () => {
  /**
   * TEST 1 — CLAIM A(i): at pure tolerance no repertoire ever forms, in a world
   * that is demonstrably full of things to capture.
   *
   * "Nothing ever happened" is the single easiest assertion in this repository
   * to pass for the wrong reason, so three controls are asserted BEFORE it, in
   * this body, per seed:
   *
   *   1. the tolerant population is ALIVE and carrying copies;
   *   2. hundreds of those copies are SITTING IN CLUSTER SITES at the horizon —
   *      so the trap had the opportunity and declined it, rather than never
   *      being offered one. This is the control the claim actually needs, and it
   *      is the one a "no repertoire" test is most likely to omit;
   *   3. the same arm at `t = 0` forms a repertoire in every genome — so the
   *      capture machinery works at these parameters at all.
   *
   * The claim is then checked at EVERY generation, not only at the horizon, so
   * it cannot be satisfied by a repertoire that formed and was later emptied.
   *
   * The mutation this is here to catch: an off-by-epsilon leak in the capture
   * gate — `world.rng.next() >= 1 - p.t + 0.001` in `sim/phases/trap.ts`, so a
   * purely tolerant host captures one time in a thousand instead of never. This
   * goes red at seed 1 with "at t = 1 a repertoire existed at 83 of 150
   * generations", which is the assertion the every-generation scan exists for:
   * an endpoint-only check would still see 83 generations of repertoire, but a
   * leak that stopped before the horizon it would not.
   *
   * ⚠️ A RELATED MUTATION THAT GOES RED AT A CONTROL, NOT AT THE CLAIM, AND IS
   * RECORDED BECAUSE IT IS THE MORE OBVIOUS ONE TO TRY. Removing the gate
   * entirely (`world.rng.next() >= 1`, capture unconditional) turns this test
   * red at CONTROL 2 — "only 97 copies occupy cluster sites in the tolerant
   * arm" — because a tolerant arm that suddenly silences also stops growing,
   * and 97 falls just under the floor of 100 derived from the unmutated arm's
   * 268..463. The guard is red either way, and test 2 below catches the same
   * mutation AT ITS CLAIM ("genomes carry a repertoire at t = 1"). But this test
   * alone would report it as a broken control rather than as a broken gate.
   */
  it("at t = 1 no repertoire ever forms, though hundreds of copies sit in cluster sites", () => {
    for (const seed of SEEDS) {
      const tolerant = runArm({ seed, t: T_TOLERATE });
      const resistant = runArm({ seed, t: T_RESIST });

      // CONTROL 1: the tolerant arm is alive.
      expect(
        tolerant.snapshot.totalCopies,
        `seed ${seed}: the tolerant arm is extinct at generation ${GENERATIONS}, so "no repertoire formed" is a statement about a dead world`,
      ).toBeGreaterThan(0);

      // CONTROL 2 — THE ONE THAT MATTERS: copies really did reach cluster sites.
      // Without this, a change that stopped copies landing in clusters at all
      // would satisfy the claim below and read as "tolerance cannot be
      // conscripted" when what happened is "nothing was ever offered".
      expect(
        tolerant.clusterCopies,
        `seed ${seed}: only ${tolerant.clusterCopies} copies occupy cluster sites in the tolerant arm, so the trap was never offered anything to capture`,
      ).toBeGreaterThan(MIN_CLUSTER_COPIES);

      // CONTROL 3: the capture machinery works at these parameters.
      expect(
        resistant.fractionWithRepertoire,
        `seed ${seed}: the RESISTING arm formed no repertoire either, so capture is broken at this arm and the tolerant arm's emptiness means nothing`,
      ).toBe(1);

      // THE CLAIM, over the whole run rather than at its end.
      expect(
        tolerant.generationsWithAnyRepertoire,
        `seed ${seed}: at t = ${T_TOLERATE} a repertoire existed at ${tolerant.generationsWithAnyRepertoire} of ${GENERATIONS} generations`,
      ).toBe(0);

      // AND ITS CONSEQUENCE. ⚠️ ENTAILED, NOT INDEPENDENT: `isSilenced`
      // (`sim/silencing.ts:82`) searches the repertoire and returns false for an
      // empty one, so an empty repertoire at every generation ALREADY forces
      // zero silenced copies — this cannot fail while the assertion above
      // passes, and it must not be counted as a second check. It is kept because
      // it names the property the spec's "cannot be conscripted" is actually
      // about (the trap is made of the element itself, so with no capture there
      // is no suppression) and because its message says so at the failure site.
      expect(
        tolerant.snapshot.silencedCopies,
        `seed ${seed}: ${tolerant.snapshot.silencedCopies} copies are silenced at t = ${T_TOLERATE} with an empty repertoire`,
      ).toBe(0);
    }
  });

  /**
   * TEST 2 — CLAIM A(ii): the boundary is a DISCONTINUITY, not the end of a
   * gradient.
   *
   * A host that resists one time in a hundred is not "almost unconscriptable";
   * it is fully conscriptable, in every genome, at every seed. That is what
   * makes `t = 1` a difference in kind rather than the extreme of a degree.
   *
   * The graded assertion in the same body — repertoire at `t = 0.99` strictly
   * below repertoire at `t = 0` — is the positive control that `t` is a live
   * parameter below the endpoint. Without it, a build where `t` was ignored
   * everywhere except the endpoint would pass the discontinuity claim. It is
   * asserted per seed and the two measured ranges do not overlap (max 6.21 at
   * 0.99, min 11.70 at 0); it is NOT a gradient claim, for which see this
   * file's header.
   *
   * The mutation this is here to catch: turning the probabilistic gate in
   * `trap` into a mid-dial switch (`if (p.t > 0.5) continue`). `t = 1` then
   * still forms no repertoire, so test 1 stays green, but `t = 0.99` stops
   * forming one and this goes red — which is exactly the wrong model of the
   * dial, and exactly what test 1 alone cannot see.
   */
  it("t = 0.99 forms a repertoire in every genome while t = 1 forms none: the boundary is a discontinuity", () => {
    for (const seed of SEEDS) {
      const resistant = runArm({ seed, t: T_RESIST });
      const nearBoundary = runArm({ seed, t: T_NEAR_BOUNDARY });
      const tolerant = runArm({ seed, t: T_TOLERATE });

      // POSITIVE CONTROL, asserted first: `t` is live below the endpoint. A
      // hundredfold cut in capture probability DOES reduce the repertoire.
      //
      // ⚠️ DO NOT DELETE THIS AS REDUNDANT. It is the ONLY assertion in either
      // guard file that catches a build where `t` is read solely at its
      // endpoint — an implementation that special-cases `t === 1` and ignores
      // every intermediate value passes every other assertion in both files,
      // including the discontinuity claim below (which only needs `t = 0.99` to
      // behave like `t = 0`). Confirmed by review, not assumed.
      expect(
        nearBoundary.repertoirePerGenome,
        `seed ${seed}: t = ${T_NEAR_BOUNDARY} holds ${nearBoundary.repertoirePerGenome.toFixed(2)} repertoire entries per genome against ${resistant.repertoirePerGenome.toFixed(2)} at t = ${T_RESIST}, so the dial is inert below the endpoint`,
      ).toBeLessThan(resistant.repertoirePerGenome);
      expect(
        resistant.repertoirePerGenome,
        `seed ${seed}: the resisting arm holds only ${resistant.repertoirePerGenome.toFixed(2)} repertoire entries per genome`,
      ).toBeGreaterThan(MIN_RESIST_REPERTOIRE);

      // THE CLAIM: reduced, but not remotely absent. Every genome, every seed.
      expect(
        nearBoundary.fractionWithRepertoire,
        `seed ${seed}: only ${(nearBoundary.fractionWithRepertoire * 100).toFixed(1)}% of genomes carry a repertoire at t = ${T_NEAR_BOUNDARY}, so the conscription property is fading gradually rather than switching at the endpoint`,
      ).toBe(1);

      // AND THE ENDPOINT, in the same body, so the discontinuity is one
      // assertion pair rather than two tests that might not both be running.
      expect(
        tolerant.fractionWithRepertoire,
        `seed ${seed}: genomes carry a repertoire at t = ${T_TOLERATE}`,
      ).toBe(0);
    }
  });

  /**
   * TEST 3 — CLAIM B: the fitness ORDERING between two genomes flips with `t`.
   *
   * Two constructed genomes, 45 copies each, opposite composition. Every
   * expected value below is one hand multiplication against the rule spec §3.2
   * step 5 states — `(1 - t)·d·nSilenced + t·dTol·nActive` — and NOT a number
   * read off a run, so none of it is the code under test reporting its own
   * output.
   *
   * With `d = dTol = 0.01`, `a = b = wDom = 0`:
   *
   *   t     ACTIVE_HEAVY (40 active, 5 silenced)   SILENCED_HEAVY (5, 40)
   *   0     -0.01 * 5  = -0.05                     -0.01 * 40 = -0.40
   *   0.5   -(0.05 + 0.40)/2 = -0.225              -(0.40 + 0.05)/2 = -0.225
   *   1     -0.01 * 40 = -0.40                     -0.01 * 5  = -0.05
   *
   * The composition is asserted with `activeCopies`/`silencedCopies` before any
   * fitness is read, so the construction is checked rather than assumed — if
   * `theta` or the repertoire entry ever stopped classifying these copies the
   * way the arithmetic assumes, the guard would otherwise be asserting hand
   * numbers against a genome that is not the one described.
   *
   * The mutation this is here to catch: making the tolerance branch of
   * `damageLoad` scale with silenced copies instead of active ones
   * (`p.dTol * nSilenced`). Both branches then charge the same population, the
   * ordering no longer reverses, and this goes red while tests 1 and 2 stay
   * green.
   */
  it("the fitness ordering between an active-heavy and a silenced-heavy genome reverses between t = 0 and t = 1", () => {
    const activeHeavy = constructGenome(HEAVY, LIGHT);
    const silencedHeavy = constructGenome(LIGHT, HEAVY);

    // CONTROL, asserted before any fitness is read: the two genomes really have
    // the composition the arithmetic below assumes, and equal copy number.
    for (const [name, genome, expectedActive, expectedSilenced] of [
      ["active-heavy", activeHeavy, HEAVY, LIGHT],
      ["silenced-heavy", silencedHeavy, LIGHT, HEAVY],
    ] as const) {
      const p = FITNESS_PARAMS(0);
      expect(
        [activeCopies(genome, p).length, silencedCopies(genome, p).length],
        `the ${name} genome is not composed as the guard's arithmetic assumes`,
      ).toEqual([expectedActive, expectedSilenced]);
    }
    expect(
      activeHeavy.copies.length,
      "the two genomes no longer have equal copy number, so a copy-number difference could produce the ordering below",
    ).toBe(silencedHeavy.copies.length);

    // THE VALUES, hand-computed from the spec's rule. THESE FOUR ARE THE CLAIM:
    // everything below them is entailed by them, and the mutation for this
    // claim fires on the third of them.
    const at = (t: number) => FITNESS_PARAMS(t);
    const why = (who: string, t: number, rule: string) =>
      `${who} at t = ${t}: spec §3.2 step 5 gives (1-t)*d*nSilenced + t*dTol*nActive = ${rule}, so log-fitness must be its negation`;
    expect(
      logFitness(activeHeavy, at(0)),
      why("active-heavy", 0, `0.01 * ${LIGHT} = 0.05`),
    ).toBeCloseTo(-0.05, 12);
    expect(
      logFitness(silencedHeavy, at(0)),
      why("silenced-heavy", 0, `0.01 * ${HEAVY} = 0.40`),
    ).toBeCloseTo(-0.4, 12);
    expect(
      logFitness(activeHeavy, at(1)),
      why("active-heavy", 1, `0.01 * ${HEAVY} = 0.40`),
    ).toBeCloseTo(-0.4, 12);
    expect(
      logFitness(silencedHeavy, at(1)),
      why("silenced-heavy", 1, `0.01 * ${LIGHT} = 0.05`),
    ).toBeCloseTo(-0.05, 12);

    // THE ORDERING, and that it reverses. ⚠️ ENTAILED, NOT INDEPENDENT: −0.05 >
    // −0.40 and −0.40 < −0.05 follow from the four values above by arithmetic,
    // so neither of these can fail while those pass. Kept because the spec
    // states the claim as a reversal and because these messages name the
    // mechanism at the failure site — not because they add coverage.
    expect(
      logFitness(activeHeavy, at(0)),
      "under pure resistance the active-heavy genome is not the fitter one, so the cost is not being charged per silenced copy",
    ).toBeGreaterThan(logFitness(silencedHeavy, at(0)));
    expect(
      logFitness(activeHeavy, at(1)),
      "under pure tolerance the active-heavy genome is still the fitter one, so the cost is not being charged per active copy and the two strategies are the same shape",
    ).toBeLessThan(logFitness(silencedHeavy, at(1)));

    // AND THE CROSSING. With `d = dTol` and mirrored compositions the two are
    // exactly equal at t = 0.5 — the dial's effect on the ORDERING is
    // continuous even though the conscription property of test 1 is binary, and
    // this is the one place in the guard where a mid-dial claim is made,
    // because here it is arithmetic rather than a population measurement. The
    // difference is entailed by the value below it; the value is the real check,
    // and it is a fifth hand-computed number, not a restatement of the four.
    expect(
      logFitness(activeHeavy, at(0.5)) - logFitness(silencedHeavy, at(0.5)),
      "the ordering does not cross at t = 0.5 where the interpolation is symmetric",
    ).toBeCloseTo(0, 12);
    expect(
      logFitness(activeHeavy, at(0.5)),
      why("active-heavy", 0.5, "(0.05 + 0.40) / 2 = 0.225"),
    ).toBeCloseTo(-0.225, 12);
  });

  /**
   * The arm — the fully pinned 20-field `BASE`, the seed set, the horizon, the
   * three `t` values, the thresholds, the constructed genomes and the runner —
   * lives in `./tolerance-arm.js`, shared with `scripts/explore-tolerance.ts`.
   *
   * This checks "the arms differ in `t` and nothing else" against the live
   * `BASE` rather than trusting the prose, and costs no generations.
   */
  it("the arms differ in t and in nothing else", () => {
    const keys = Object.keys(BASE) as (keyof Params)[];
    const arms: Params[] = [
      armParams({ seed: 1, t: T_RESIST }),
      armParams({ seed: 1, t: T_NEAR_BOUNDARY }),
      armParams({ seed: 1, t: T_TOLERATE }),
    ];
    for (let i = 1; i < arms.length; i++) {
      expect(
        keys.filter((k) => arms[0]![k] !== arms[i]![k]),
        "the tolerance arms are no longer matched, so a difference between them is no longer attributable to the strategy dial",
      ).toEqual(["t"]);
    }

    // `d` and `dTol` equal is load-bearing for the contrast: unequal rates would
    // let a magnitude difference masquerade as the shape difference the guard
    // claims.
    expect(
      BASE.d,
      "the resistance and tolerance per-copy rates are no longer equal, so the population arms differ in magnitude as well as in shape",
    ).toBe(BASE.dTol);
  });
});
