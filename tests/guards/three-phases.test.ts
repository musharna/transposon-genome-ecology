import { describe, expect, it } from "vitest";
import {
  detectPhases,
  detectPhasesDetailed,
  type Snapshot,
} from "../../sim/index.js";
import {
  GENERATIONS,
  HORIZON_MARKS,
  INVARIANCE_SEEDS,
  KNOCKOUT_SEEDS,
  PLATEAU_BAND,
  PLATEAU_MIN_GENERATIONS,
  plateauDuration,
  runArm,
  SEEDS,
} from "./three-phases-arm.js";

/**
 * GUARD 2 (spec §6). A trap-model invasion runs in three phases, per Kofler
 * 2019: amplification, then a plateau while piRNA cluster insertions segregate
 * through the population, then inactivation. This asserts the ORDERING — an
 * endpoint-only test passes on a model that jumps straight to inactivation.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED (scripts/explore-three-phases.ts prints every number below)
 * ---------------------------------------------------------------------------
 * Silenced arm, horizon 60, the eleven seeds of `SEEDS`:
 *
 *   seed        1    2    3    4    5    7   11   13   17  101  202
 *   amp        19   18   19   14   20   20   16   18   15   13   16
 *   plateau    27   28   30   25   25   29   22   27   27   25   28
 *   inact      28   29   31   26   26   30   27   28   29   26   29
 *   peak tot 5428 5570 6847 4305 5503 5436 3765 4953 4690 4989 3400
 *   fwr@amp  .580 .620 .547 .477 .573 .593 .670 .493 .480 .320 .617
 *   fwr@plat .920 .957 .967 .943 .910 .960 .883 .917 .917 .970 .923
 *
 *   plateau duration (consecutive generations within 10% of peak copy number):
 *                16   11   14   16   11   11   15   12   10   11    9
 *
 * The ordering holds at every seed. The three landmarks are the same triple
 * whether the history is truncated at 40, 50, 60, 80, 120, 200 or 300
 * generations: 66 truncation comparisons across the eleven seeds, 0 in which the
 * triple moved (ARM 2, and the fourth test below — which also says which THIRD of
 * that triple the invariance is actually informative about).
 *
 * ---------------------------------------------------------------------------
 * A MODEL PROPERTY THIS GUARD DOES NOT CLAIM AWAY — FLAGGED FOR THE SPEC
 * ---------------------------------------------------------------------------
 * In this model, full inactivation implies the family eventually DIES, and this
 * guard is scoped to generation 60, before that happens. The CANONICAL statement
 * of the property — the mechanism in `sim/phases/lifecycle.ts`, the measured
 * decay figures, and why it is not fixed — is the EXTINCTION note on `BASE` in
 * `./three-phases-arm.js`. READ IT. It is deliberately not restated here or in
 * `sim/phases-detect.ts`, so there is one copy to keep true. The first test
 * asserts liveness at the horizon explicitly rather than letting "three phases in
 * order" quietly also be true of a run that has since died.
 */
describe("guard 2: three-phase invasion", () => {
  /**
   * TEST 1. The ordering, per seed, with its controls in the same body.
   *
   * Thresholds, each a floor under the WEAKEST of the eleven seeds:
   *   - THE INVASION IS REAL, peak total copies > 1500: measured minimum 3400
   *     (seed 202) against 300 founding copies, a 2.27x margin on the floor and
   *     an 11.3x rise on the founding population. Without this, a family that
   *     never amplified could still produce three ordered indices out of noise.
   *   - THE FAMILY IS STILL THERE at the horizon, > 500 copies: measured minimum
   *     1702 (seed 11), a 3.4x margin. This is the assertion that goes red on the
   *     decay documented above; at generation 300 it fails at 8 of 11 seeds, by
   *     design, because at that horizon the ordering claim would be true of a
   *     corpse.
   *   - HEADROOM, inactivation at least 20 generations before the horizon:
   *     measured minimum headroom 29 (seed 3, inactivation 31), a 9-generation
   *     margin. This is what stops the guard passing because the run was cut off
   *     — a first-crossing landmark found in the last few generations of a
   *     truncated history is an artefact of the truncation.
   *
   *   - THE PLATEAU IS A PHASE, at least 6 consecutive generations within 10% of
   *     peak copy number: measured 9..16 across the eleven seeds (weakest seed
   *     202 at 9, strongest seeds 1 and 4 at 16, mean 12.4), a 3-generation
   *     margin, 1.5x. Derived in ARM 6; `PLATEAU_BAND` and
   *     `PLATEAU_MIN_GENERATIONS` are pinned in `./three-phases-arm.js` and
   *     `plateauDuration` is shared with the sweep. This is the ONLY assertion
   *     here that a spike-shaped model fails — see the next paragraph for why it
   *     had to be added.
   *
   * ---------------------------------------------------------------------------
   * ONE HALF OF THE ORDERING CANNOT FAIL. SAYING SO IS THE POINT OF THIS BLOCK.
   * ---------------------------------------------------------------------------
   * The two inequalities are NOT alike, and an earlier version of this comment
   * claimed a falsifiability for the second that it does not have:
   *
   *   - `amplification < plateau` IS falsifiable. The plateau scan in
   *     `sim/phases-detect.ts` starts at `i = amplification`, so `plateau ===
   *     amplification` is reachable — it is what happens when copy number peaks
   *     at the very generation of fastest growth, i.e. a jump rather than a
   *     plateau. Deleting the plateau scan reddens it, verified by mutation.
   *
   *   - `plateau < inactivation` is VACUOUS. The inactivation scan starts at
   *     `i = plateau + 1` and returns that `i`, so `inactivation >= plateau + 1`
   *     for EVERY possible input. No model behaviour can make it red. It is kept
   *     because it documents the intended reading of the triple, and it costs
   *     nothing, but it carries no information and no margin — the 1-generation
   *     gap between the two landmarks at 9 of the 11 seeds is not a margin,
   *     because there is no quantity that could shrink it to zero.
   *
   * Losing that half of the ordering claim is why the plateau-duration floor
   * above exists: it is a claim about the same phase that CAN go red.
   *
   * ---------------------------------------------------------------------------
   * ADJACENT INDICES, EXTENDED TRAJECTORY — TWO DIFFERENT CLAIMS, NOT BLURRED
   * ---------------------------------------------------------------------------
   * The plateau and inactivation LANDMARKS are adjacent at 9 of the 11 seeds
   * (plateau 27 -> inactivation 28 and the like; the exceptions are seed 11,
   * 22 -> 27, and seed 17, 27 -> 29). Read alone, that looks like a model with no
   * plateau at all, and before this fix round only that adjacency was asserted.
   *
   * The TRAJECTORY is a different matter and is what the word "plateau" is about:
   * copy number stays within 10% of its peak for 9..16 consecutive generations,
   * a stretch that straddles both landmarks. The two facts are consistent — the
   * landmarks are an argmax and a first crossing, and both fall late inside a
   * long flat top, because the flat top is flat. Anyone reading "the landmarks
   * are adjacent" as "there is no plateau" has confused the index for the
   * trajectory, and anyone reading the duration as licensing a claim about WHERE
   * the landmarks fall has done the reverse. Both are asserted below, separately.
   *
   * The two conditions `detectPhases` conjoins onto the crossing —
   * `totalCopies > 0` and `silencedCopies > activeCopies` AT the inactivation
   * index — are deliberately NOT re-asserted here. The detector enforces them,
   * so asserting them of its output is a test that cannot fail. What they are
   * worth is checked instead in the fifth test, against histories built to
   * violate them.
   */
  it("passes through amplification, plateau and inactivation in order, at every seed", () => {
    for (const seed of SEEDS) {
      const a = runArm({ seed });
      const ph = a.result.phases;

      expect(
        ph,
        `seed ${seed}: no three-phase invasion was detected (null path: ${a.result.failure}) at horizon ${GENERATIONS}`,
      ).not.toBeNull();
      if (!ph) continue;

      // CONTROL 1, before the comparison: the invasion actually amplified. The
      // founding population is one copy per genome, so this is a rise, not a level.
      const peakTotal = a.h[ph.plateau]!.totalCopies;
      expect(
        peakTotal,
        `seed ${seed}: peak copy number ${peakTotal} from ${a.h[0]!.totalCopies} founders is not an invasion, so the three indices below are landmarks on noise`,
      ).toBeGreaterThan(1500);

      // CONTROL 2: the family is still present at the horizon. Inactivation in
      // this model is followed by decay to extinction (see the header); an
      // ordering claim about a family that has since vanished is a claim about
      // a spike-and-crash.
      expect(
        a.last.totalCopies,
        `seed ${seed}: only ${a.last.totalCopies} copies remain at generation ${GENERATIONS}, so "inactivated" is indistinguishable from "gone"`,
      ).toBeGreaterThan(500);

      // CONTROL 3: the horizon is not what produced the landmarks. Inactivation
      // is found well inside the run, not scraped off its truncated end.
      expect(
        GENERATIONS - ph.inactivation,
        `seed ${seed}: inactivation at generation ${ph.inactivation} leaves only ${GENERATIONS - ph.inactivation} generations of headroom before the horizon ${GENERATIONS}`,
      ).toBeGreaterThanOrEqual(20);

      // THE CLAIM, PART 1: the ordering of the landmark indices.
      //
      // Falsifiable: `plateau === amplification` is reachable, and is what a
      // model that jumps from peak growth straight to peak copy number produces.
      expect(
        ph.amplification,
        `seed ${seed}: amplification (${ph.amplification}) did not precede the plateau (${ph.plateau}) — copy number peaked at the moment of fastest growth, which is a jump, not a plateau`,
      ).toBeLessThan(ph.plateau);
      // VACUOUS BY CONSTRUCTION, and labelled as such rather than dropped: the
      // inactivation scan starts at `plateau + 1`, so this holds for every
      // possible input and no model behaviour can redden it. It documents the
      // intended reading of the triple. It is not evidence of anything, and the
      // 1-generation gap it "passes" by at 9 of 11 seeds is not a margin.
      expect(
        ph.plateau,
        `seed ${seed}: the plateau (${ph.plateau}) did not precede inactivation (${ph.inactivation}) — which sim/phases-detect.ts makes impossible, so this firing means the scan's start index changed`,
      ).toBeLessThan(ph.inactivation);

      // THE CLAIM, PART 2: the plateau is a PHASE, not an argmax. This is the
      // assertion a spike-shaped model fails and the ordering above does not.
      const duration = plateauDuration(a.h, ph.plateau);
      expect(
        duration,
        `seed ${seed}: copy number stayed within ${((1 - PLATEAU_BAND) * 100).toFixed(0)}% of its peak for only ${duration} generation(s) around the plateau at ${ph.plateau} — that is a spike, not a plateau phase`,
      ).toBeGreaterThanOrEqual(PLATEAU_MIN_GENERATIONS);
    }
  });

  /**
   * TEST 2. The plateau coincides with piRNA clusters spreading through the
   * population — the mechanism Kofler's plateau phase is named for. Without
   * this, "copy number stopped rising" could be selection, saturation or
   * rate decay, and the guard would be asserting a shape with no cause.
   *
   * `fractionWithRepertoire` is the fraction of genomes carrying at least one
   * captured cluster insertion (`sim/observe.ts`), which is the observable for
   * "cluster insertions are segregating through the population".
   *
   * The threshold is a single separating level, 0.75, derived from the measured
   * ranges rather than picked: across the eleven seeds the value at amplification
   * spans 0.320..0.670 and at the plateau 0.883..0.970. The two ranges do not
   * overlap and 0.75 lies between them, 0.080 above the highest amplification
   * value (seed 11) and 0.133 below the lowest plateau value (seed 11 again).
   * Stating it as one level rather than as two tuned bounds is deliberate: it
   * cannot be widened on one side to absorb a drift on the other.
   *
   * The strict rise is asserted as well as the level, because a run that started
   * at 0.80 and stayed there would clear the level while nothing spread.
   * Measured rise 0.213..0.650.
   */
  it("the plateau coincides with clusters spreading through the population, at every seed", () => {
    for (const seed of SEEDS) {
      const a = runArm({ seed });
      const ph = a.result.phases;
      expect(
        ph,
        `seed ${seed}: no phases to locate the spread against`,
      ).not.toBeNull();
      if (!ph) continue;

      const atAmp = a.h[ph.amplification]!.fractionWithRepertoire;
      const atPlateau = a.h[ph.plateau]!.fractionWithRepertoire;

      // POSITIVE CONTROL, in the same body: the observable starts empty and
      // therefore moved. `createWorld` gives every genome an empty repertoire
      // (`sim/state.ts`), so a non-zero value anywhere is something the run did.
      // Without this, a `fractionWithRepertoire` that was 1 from the outset —
      // or one that never changed — would satisfy the level assertion below.
      expect(
        a.h[0]!.fractionWithRepertoire,
        `seed ${seed}: genomes already carry a repertoire at generation 0, so the rise below is not cluster spread`,
      ).toBe(0);

      // Amplification happens while clusters are still a minority of genomes...
      expect(
        atAmp,
        `seed ${seed}: clusters were already in ${(atAmp * 100).toFixed(1)}% of genomes at peak growth, so the plateau cannot be attributed to their spread`,
      ).toBeLessThan(0.75);

      // ...and by the plateau they are in most of them.
      expect(
        atPlateau,
        `seed ${seed}: clusters reached only ${(atPlateau * 100).toFixed(1)}% of genomes at the plateau`,
      ).toBeGreaterThan(0.75);

      // And the direction, which the level pair does not by itself assert.
      expect(
        atPlateau,
        `seed ${seed}: cluster spread did not rise between amplification (${atAmp.toFixed(3)}) and the plateau (${atPlateau.toFixed(3)})`,
      ).toBeGreaterThan(atAmp);
    }
  });

  /**
   * TEST 3. The counterfactual: with the trap switched off there is no
   * inactivation phase.
   *
   * `expect(detectPhases(h)).toBeNull()` on its own is a weak assertion — the
   * detector has FOUR null exits (`too-short`, `no-growth`, `no-active-peak`,
   * `no-inactivation`) and only the last is the reason this test intends. A
   * knockout arm that failed to grow at all would satisfy it. So this test names
   * the exit, and carries four controls in the same body:
   *   - the arm is ALIVE AND INVADING: > 100x growth on the founding population.
   *     Measured 541.4x..621.7x at the three seeds (162432..186511 copies from
   *     300), a 5.4x margin on the floor.
   *   - the arm is far from SATURATION, occupancy < 40%: measured 18.0%..20.7%,
   *     a 1.93x margin. Past roughly 40%, `transpose`'s rejection sampler needs
   *     several draws per insertion and the arm reports the sampler as much as
   *     the model. (Occupancy, not wall clock: run times are machine-dependent
   *     and are quoted nowhere in this guard.)
   *   - the MECHANISM is absent, not merely the outcome: no repertoire ever
   *     forms and nothing is silenced, because `trap` returns before touching
   *     the repertoire when `silencingOn` is false (`sim/phases/trap.ts`).
   *   - the DETECTOR IS NOT SIMPLY BROKEN: at the same seed, with silencing on,
   *     it returns a triple. Without this control, a `detectPhases` that
   *     returned null unconditionally would pass this test.
   *
   * Three seeds rather than eleven, stated openly as a cost decision: with
   * nothing to inactivate the knockout arm compounds for the whole horizon and
   * one seed costs roughly thirty times a silenced one. The claim it supports is
   * mechanistic — no `silencingOn`, no repertoire, no silenced copy anywhere —
   * not statistical.
   *
   * ---------------------------------------------------------------------------
   * WHERE THE DYNAMICAL CONTENT OF THIS TEST ACTUALLY LIVES
   * ---------------------------------------------------------------------------
   * The final `no-inactivation` claim is ENTAILED BY CONTROL 3. With
   * `silencingOn: false`, `silencedCopies` is 0 at every generation, so
   * `silencedCopies > activeCopies` is false everywhere and `no-inactivation` is
   * forced unless silencing leaks — which control 3 asserts against, and asserts
   * more directly. The mutation log bears this out: the model-layer mutation
   * (deleting the `silencingOn` guard in `trap`) reddened CONTROL 1, and only a
   * detector-layer mutation reddened the final claim. So the null is a
   * consistency check on the detector's exit labelling, not evidence about the
   * model, and it is not the reason to keep this test.
   *
   * The dynamical content is controls 1 and 3 — the arm really invades, and the
   * mechanism really is absent — plus CONTROL 5, added in this fix round: the
   * crossing-only property, asserted over the whole trajectory. Active copies
   * never fall to 20% of their peak after reaching it. That IS a statement about
   * how the arm behaves rather than about what the detector returns, and it is
   * what a knockout arm that crashed for some unrelated reason would fail.
   */
  it("with the trap off there is no inactivation phase, on an arm that is alive and invading", () => {
    for (const seed of KNOCKOUT_SEEDS) {
      const off = runArm({ seed, silencingOn: false });

      // CONTROL 1: alive and invading, asserted before the null claim.
      expect(
        off.h[0]!.totalCopies,
        `seed ${seed}: the knockout arm did not start from one copy per genome`,
      ).toBe(off.p.N);
      expect(
        off.last.totalCopies,
        `seed ${seed}: the knockout arm reached only ${off.last.totalCopies} copies from ${off.h[0]!.totalCopies} founders, so "no inactivation" is indistinguishable from "nothing happened"`,
      ).toBeGreaterThan(100 * off.h[0]!.totalCopies);

      // CONTROL 2: nowhere near site saturation.
      expect(
        off.occupancy,
        `seed ${seed}: the knockout arm reached ${(off.occupancy * 100).toFixed(1)}% site occupancy, where transposition is reporting its own rejection sampler`,
      ).toBeLessThan(0.4);

      // CONTROL 3: the mechanism really is switched off, not just its outcome.
      expect(
        off.last.fractionWithRepertoire,
        `seed ${seed}: a repertoire formed in the knockout arm`,
      ).toBe(0);
      expect(
        off.last.silencedCopies,
        `seed ${seed}: ${off.last.silencedCopies} copies are silenced in the knockout arm`,
      ).toBe(0);

      // CONTROL 4: the detector can still say yes, at this very seed.
      const on = runArm({ seed });
      expect(
        on.result.phases,
        `seed ${seed}: the detector returns null WITH silencing on too, so the null below says nothing about the trap`,
      ).not.toBeNull();

      // CONTROL 5, the dynamical one: over the WHOLE trajectory, active copies
      // never fall to 20% of their peak after reaching it. This is the
      // crossing-only property stated about the arm rather than read off the
      // detector's return value, and it is what an arm that crashed for some
      // reason other than silencing would fail. Measured minimum of the ratio
      // across the three seeds: 0.599 (seed 1, peak 223747 at generation 44,
      // minimum 134105 at generation 56), a 3.0x margin over the 0.2 level.
      let peakActive = 0;
      let peakAt = 0;
      for (let i = 0; i < off.h.length; i++) {
        if (off.h[i]!.activeCopies > peakActive) {
          peakActive = off.h[i]!.activeCopies;
          peakAt = i;
        }
      }
      let trough = Infinity;
      let troughAt = peakAt;
      for (let i = peakAt; i < off.h.length; i++) {
        if (off.h[i]!.activeCopies < trough) {
          trough = off.h[i]!.activeCopies;
          troughAt = i;
        }
      }
      expect(
        trough,
        `seed ${seed}: active copies fell from ${peakActive} at generation ${peakAt} to ${trough} at generation ${troughAt} — the knockout arm crashed, so it is not the never-inactivating arm this test needs`,
      ).toBeGreaterThan(0.2 * peakActive);

      // THE CLAIM, with the null path named so it cannot be confused with the
      // other three ways of returning null. Entailed by control 3 — see the
      // docstring; this is a check on the detector's exit labelling, not on the
      // model.
      expect(
        off.result.failure,
        `seed ${seed}: the knockout arm returned null for the wrong reason`,
      ).toBe("no-inactivation");
      expect(
        detectPhases(off.h),
        `seed ${seed}: the knockout arm produced an inactivation phase with no piRNA trap`,
      ).toBeNull();
    }
  });

  /**
   * TEST 4. The landmarks do not depend on the pinned horizon.
   *
   * `GENERATIONS` is a choice, and every number in this guard is read off
   * histories of that length. If the triple moved when the run was longer or
   * shorter, the guard would be describing 60 generations rather than an
   * invasion. It does not: one history per seed, truncated at each of
   * `HORIZON_MARKS` (40..300) and re-detected, gives the identical triple.
   * Measured across all eleven seeds in ARM 2 of the sweep — 66 comparisons, 0
   * moves; asserted here at the three seeds where it would break first (seed 3
   * has the latest inactivation, seed 11 the widest plateau-to-inactivation gap,
   * seed 101 the earliest amplification).
   *
   * The positive control is in the same body: "truncation changed nothing" is
   * exactly the assertion that also passes when the truncation never happened,
   * so the lengths of the sliced histories are asserted to differ first.
   *
   * ---------------------------------------------------------------------------
   * WHICH THIRD OF THE TRIPLE THIS IS ACTUALLY EVIDENCE ABOUT
   * ---------------------------------------------------------------------------
   * The three landmarks are not equally at risk from a longer history, and the
   * test title is broader than its content. Taking them in turn, against the
   * scans in `sim/phases-detect.ts`:
   *
   *   - `amplification` — REAL CONTENT. A strict-`>` argmax over one-generation
   *     growth. Appending generations moves it only if a later generation has
   *     STRICTLY greater growth than the incumbent. In a decaying tail that
   *     cannot happen, which is the substantive thing being checked.
   *
   *   - `plateau` — REAL CONTENT, AND THE MOST FRAGILE OF THE THREE. A `>=`
   *     running-max scan, so ties resolve to the LATER index: appending a
   *     generation that merely EQUALS the incumbent peak moves it, no strict
   *     increase required. This is the third most likely to move, and the one
   *     that makes the test worth running.
   *
   *   - `inactivation` — TAUTOLOGY, GIVEN THE OTHER TWO. It is the first index
   *     after `plateau` satisfying a per-index conjunction. Once that index has
   *     been found inside a prefix, appending data cannot move it: a first
   *     crossing in a prefix is a first crossing in every extension of that
   *     prefix. So it is stable whenever `plateau` is stable, and it carries no
   *     independent evidence.
   *
   * Two thirds content, one third bookkeeping. The assertion compares the whole
   * triple because that is the cheap and readable thing to do, not because all
   * three are equally informative.
   */
  it("the three landmarks are invariant to the horizon", () => {
    const longest = Math.max(...HORIZON_MARKS);
    for (const seed of INVARIANCE_SEEDS) {
      const a = runArm({ seed }, longest);
      const lengths = new Set<number>();
      let reference = "";

      for (const mark of HORIZON_MARKS) {
        const truncated = a.h.slice(0, mark + 1);
        lengths.add(truncated.length);
        const r = detectPhasesDetailed(truncated);
        const triple = r.phases
          ? `${r.phases.amplification}/${r.phases.plateau}/${r.phases.inactivation}`
          : `null(${r.failure})`;
        if (reference === "") reference = triple;
        expect(
          triple,
          `seed ${seed}: truncating at generation ${mark} gives ${triple}, not ${reference} — the landmarks are an artefact of the horizon`,
        ).toBe(reference);
      }

      // POSITIVE CONTROL: the truncations were real and distinct.
      expect(
        lengths.size,
        `seed ${seed}: the ${HORIZON_MARKS.length} truncations produced ${lengths.size} distinct history lengths, so the invariance above is vacuous`,
      ).toBe(HORIZON_MARKS.length);
      expect(
        reference,
        `seed ${seed}: no phases were detected at any horizon, so there was nothing for truncation to move`,
      ).not.toContain("null");
    }
  });

  /**
   * TEST 5. What the two conditions beyond the 20% crossing are worth.
   *
   * `detectPhases` does not define inactivation as "active copies fell below 20%
   * of their peak" alone. A DEAD POPULATION satisfies that trivially —
   * `activeCopies` is 0 when every copy is gone — so a crossing-only predicate
   * reports a spike-and-crash as Kofler's invasion. The extra conditions, both
   * evaluated AT the inactivation index, are `totalCopies > 0` and
   * `silencedCopies > activeCopies`.
   *
   * They cannot be shown to be worth anything on the guard's own arm: there, the
   * crossing, survival and silenced-majority all first hold at the SAME
   * generation, so both predicates return the identical triple at all eleven
   * seeds (ARM 5 of the sweep prints the comparison). A test that only ran the
   * arm would therefore be a test that cannot fail. So the histories here are
   * CONSTRUCTED to separate them, and each case asserts the crossing condition
   * IS met before asserting that the predicate still rejects — otherwise
   * "rejected" would not be attributable to the added conditions.
   *
   * Note on redundancy, measured rather than assumed: `silencedCopies` counts
   * copies, so `silencedCopies > activeCopies >= 0` forces `silencedCopies >= 1`
   * and hence `totalCopies >= 1`. The survival condition is therefore IMPLIED by
   * the majority condition under the current `Snapshot` semantics, and case A
   * below is rejected by both at once — it is kept as an explicit statement of
   * what the landmark must mean, not because it can reject alone.
   *
   * Case D pins a different thing: that the scan CONTINUES past an index which
   * meets the crossing but fails the conjunction, rather than giving up there.
   * Cases A and B cannot pin it, because in both of them the conjunction fails at
   * every index after the crossing, so a detector that gave up at the first
   * failure returns the same answer. That detector would also pass the guard arm,
   * where the conjunction happens to hold at the first crossing. Case D is the
   * only thing in the suite that distinguishes them.
   */
  it("inactivation is not extinction: a crash the trap did not cause is rejected", () => {
    const snap = (
      generation: number,
      totalCopies: number,
      activeCopies: number,
      silencedCopies: number,
    ): Snapshot => ({
      generation,
      totalCopies,
      activeCopies,
      silencedCopies,
      domesticatedCopies: 0,
      meanRate: 0.2,
      fractionWithRepertoire: 0,
    });

    /** Rise to a peak of 3200 active copies at index 5, held at index 6. */
    const rise = [100, 200, 400, 800, 1600, 3200, 3200];
    const peakActive = 3200;
    const plateauIndex = 6;

    // --- CASE A: spike, then total extinction. Nothing is ever silenced. ---
    const extinct: Snapshot[] = [
      ...rise.map((n, i) => snap(i, n, n, 0)),
      ...Array.from({ length: 23 }, (_, k) => snap(7 + k, 0, 0, 0)),
    ];
    // The crossing condition IS satisfied, at a generation with no copies left.
    const crossingA = extinct.findIndex(
      (s, i) => i > plateauIndex && s.activeCopies < 0.2 * peakActive,
    );
    expect(
      crossingA,
      "case A: the crossing condition is never met, so this history does not test the added conditions",
    ).toBe(7);
    expect(
      extinct[crossingA]!.totalCopies,
      "case A: the crossing generation still has copies, so it is not the extinction case",
    ).toBe(0);
    expect(
      detectPhasesDetailed(extinct).failure,
      "case A: a population that crashed to zero copies was reported as an inactivated family",
    ).toBe("no-inactivation");

    // --- CASE B: crash to a small but living, wholly UNSILENCED remnant. ---
    const unsilenced: Snapshot[] = [
      ...rise.map((n, i) => snap(i, n, n, 0)),
      ...Array.from({ length: 23 }, (_, k) => snap(7 + k, 300, 300, 0)),
    ];
    const crossingB = unsilenced.findIndex(
      (s, i) => i > plateauIndex && s.activeCopies < 0.2 * peakActive,
    );
    expect(
      crossingB,
      "case B: the crossing condition is never met, so this history does not test the added conditions",
    ).toBe(7);
    expect(
      unsilenced[crossingB]!.totalCopies,
      "case B: the remnant is not alive, so this is case A again rather than the unsilenced-crash case",
    ).toBeGreaterThan(0);
    expect(
      detectPhasesDetailed(unsilenced).failure,
      "case B: a crash with nothing silenced was reported as inactivation, so the predicate cannot tell suppression from collapse",
    ).toBe("no-inactivation");

    // --- CASE D: the scan must CONTINUE past a failed conjunction, not give up
    // at the first crossing. Cases A and B both fail the conjunction at EVERY
    // subsequent index, so a detector that returned `no-inactivation` at the
    // first crossing whose extra conditions fail would pass both of them, and
    // would pass the guard arm too. Here the crossing is met at index 7 with the
    // majority the WRONG way round (silenced 200 < active 400), and the majority
    // is achieved at index 9 — the generation that deserves the name.
    //
    // The recovery at index 9 is to 2000 copies, not to the 3000 a first draft
    // used, and the reason is worth recording: a jump of 2500 from the 500-copy
    // trough would have been a LARGER one-generation growth than anything in the
    // rise, so `amplification` moved to index 9, `plateau` followed it to the end
    // of the history, and the whole case silently degenerated into a
    // `no-inactivation` null that would have looked like the fixture working.
    // Every snapshot here also keeps `total === active + silenced`, as the guard
    // arm's `pDom: 0` makes the model do. ---
    const late: Snapshot[] = [
      ...rise.map((n, i) => snap(i, n, n, 0)),
      snap(7, 600, 400, 200),
      snap(8, 600, 400, 200),
      ...Array.from({ length: 21 }, (_, k) => snap(9 + k, 2000, 300, 1700)),
    ];
    const crossingD = late.findIndex(
      (s, i) => i > plateauIndex && s.activeCopies < 0.2 * peakActive,
    );
    expect(
      crossingD,
      "case D: the crossing is not met at index 7, so this history does not test that the scan continues",
    ).toBe(7);
    expect(
      late[crossingD]!.silencedCopies < late[crossingD]!.activeCopies,
      "case D: the conjunction already holds at the first crossing, so there is nothing for the scan to continue past",
    ).toBe(true);
    // FIXTURE INTEGRITY, computed from the fixture's own numbers and NOT from
    // the detector, so that a broken fixture and a broken detector cannot be
    // mistaken for each other. (They were: the first version of this block
    // asked the detector where the plateau was, and under a detector mutation it
    // reported `undefined` with a message blaming the fixture.) The steepest
    // one-generation rise must still be the rise's last step, and the running
    // maximum of total copies must still be last attained at `plateauIndex` —
    // both of which the 3000-copy recovery broke.
    let steepestAt = 0;
    let steepest = -Infinity;
    for (let i = 1; i < late.length; i++) {
      const g = late[i]!.totalCopies - late[i - 1]!.totalCopies;
      if (g > steepest) {
        steepest = g;
        steepestAt = i;
      }
    }
    expect(
      steepestAt,
      "case D: the recovery out-grew the rise, so amplification relocates and the case no longer tests the scan",
    ).toBe(5);
    let lastPeakAt = 0;
    let peakSoFar = -Infinity;
    for (let i = 0; i < late.length; i++) {
      if (late[i]!.totalCopies >= peakSoFar) {
        peakSoFar = late[i]!.totalCopies;
        lastPeakAt = i;
      }
    }
    expect(
      lastPeakAt,
      "case D: the recovery reattained the peak, so the plateau relocates and the scan does not start where the case assumes",
    ).toBe(plateauIndex);
    expect(
      detectPhasesDetailed(late).phases?.inactivation,
      "case D: the scan stopped at the first crossing instead of continuing to the first generation where the family is actually majority-silenced",
    ).toBe(9);

    // --- POSITIVE CONTROL: the same shape, but genuinely inactivated. The
    // copies are still there and are mostly silenced. Without this, cases A, B
    // and D would be satisfied by a predicate that rejects every history. ---
    const inactivated: Snapshot[] = [
      ...rise.map((n, i) => snap(i, n, n, 0)),
      ...Array.from({ length: 23 }, (_, k) => snap(7 + k, 3000, 300, 2700)),
    ];
    const detected = detectPhasesDetailed(inactivated);
    expect(
      detected.failure,
      "positive control: a family that is intact and mostly silenced was NOT recognised as inactivated, so the two rejections above prove nothing",
    ).toBeNull();
    expect(detected.phases).toEqual({
      amplification: 5,
      plateau: plateauIndex,
      inactivation: 7,
    });
  });
});
