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
 * The ordering holds at every seed, strictly, in both inequalities. The three
 * landmarks are the same triple whether the history is truncated at 40, 50, 60,
 * 80, 120, 200 or 300 generations: 66 truncation comparisons across the eleven
 * seeds, 0 in which the triple moved (ARM 2, and the fourth test below).
 *
 * ---------------------------------------------------------------------------
 * A MODEL PROPERTY THIS GUARD DOES NOT CLAIM AWAY — FLAGGED FOR THE SPEC
 * ---------------------------------------------------------------------------
 * In this model, full inactivation implies the family eventually DIES.
 * `sim/phases/lifecycle.ts`'s `lose` exempts only domesticated copies from
 * excision, so silenced copies keep being lost at rate `v` while silencing
 * prevents them from replacing themselves, and decay to zero follows. Measured
 * here (ARM 4): from peaks of 3400..6847 copies, the eleven seeds fall to
 * 249..818 by generation 120 and to 9..201 by generation 200, and 8 of 11 reach
 * `totalCopies: 0` on or before generation 300, earliest at 205. Real silenced
 * TE insertions largely persist as genomic fossils, so that is a genuine
 * divergence from the biology. It is NOT fixed here — changing `lose` would move
 * the RNG draw stream and invalidate every calibration in the suite — and this
 * guard is scoped to generation 60, where every seed still carries 1702..4014
 * copies. The first test asserts that liveness explicitly rather than letting
 * "three phases in order" quietly also be true of a run that has since died.
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
   * The ordering itself carries no threshold: two strict inequalities, asserted
   * per seed, never on a mean. It goes red if the model jumps from amplification
   * to inactivation with no plateau (`amplification === plateau`), or if copy
   * number peaks only after active copies have already collapsed.
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

      // THE CLAIM. Ordering only — no duration, no magnitude, no rate.
      expect(
        ph.amplification,
        `seed ${seed}: amplification (${ph.amplification}) did not precede the plateau (${ph.plateau}) — copy number peaked at the moment of fastest growth, which is a jump, not a plateau`,
      ).toBeLessThan(ph.plateau);
      expect(
        ph.plateau,
        `seed ${seed}: the plateau (${ph.plateau}) did not precede inactivation (${ph.inactivation})`,
      ).toBeLessThan(ph.inactivation);
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

      // THE CLAIM, with the null path named so it cannot be confused with the
      // other three ways of returning null.
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

    // --- POSITIVE CONTROL: the same shape, but genuinely inactivated. The
    // copies are still there and are mostly silenced. Without this, cases A and
    // B would be satisfied by a predicate that rejects every history. ---
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
