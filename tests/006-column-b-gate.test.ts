import { describe, expect, it } from "vitest";
import {
  fitMechanism,
  fitPowerLaw,
  fitQuadratic,
  horizonFor,
  predict,
  selectForm,
  type Point,
} from "../experiments/006-forms.js";
import {
  columnBGate,
  phase2Grid,
  COLUMN_B_MAX_HORIZON,
  PHASE2_A,
  PHASE2_B,
} from "../experiments/006-is-the-exponent-one.js";

/**
 * Column B's gate, for registered question 006
 * (`docs/pre-registrations/2026-09-11-is-the-exponent-one.md`).
 *
 * The registration originally gated column B on the SELECTED form's prediction
 * of `t_sat(0.0005)`. The smoke run exposed that as the wrong quantity: the
 * compute a cell actually costs is `horizonFor`, which is 2.5x the LARGEST of
 * the three candidates, and the selected form is not in general the largest.
 * So the gate could wave through a column costing 3.7x what it read, or cancel
 * one that was affordable, depending on which candidate happened to win a
 * contest that has nothing to do with cost. The registration was amended before
 * any data existed; these tests pin the amended criterion.
 *
 * Known answers throughout, built from the candidate fits themselves rather
 * than from hardcoded numbers, so a change to a fit cannot silently make a
 * precondition vacuous.
 */

const PHIS = [0.002, 0.004, 0.0113, 0.0226, 0.0453];

/** t = C * phi^-a, exactly. */
const powerLawPoints = (C: number, a: number): Point[] =>
  PHIS.map((phi) => ({ phi, t: C * phi ** -a }));

/** 005's ratio 5.00 column, the five in-range cells, verbatim from its CSV. */
const CELLS_005_RATIO_5: Point[] = [
  { phi: 0.002, t: 6102 },
  { phi: 0.004, t: 3107 },
  { phi: 0.0113, t: 1235 },
  { phi: 0.0226, t: 678 },
  { phi: 0.0453, t: 398 },
];

describe("columnBGate", () => {
  /**
   * POSITIVE CONTROL, asserted first. Every negative below would pass
   * vacuously against a gate that refuses everything, so the gate must be shown
   * to accept the data the registration was written around.
   */
  it("PASSES on 005's own ratio 5.00 cells, which is what it was budgeted for", () => {
    const gate = columnBGate(CELLS_005_RATIO_5);
    expect(gate.runs).toBe(true);
    expect(gate.horizon).toBeLessThanOrEqual(COLUMN_B_MAX_HORIZON);
  });

  it("reports the horizon that will ACTUALLY be spent, not a candidate's point prediction", () => {
    // The gate's number and the runner's number must be the same number. If
    // they can drift apart, the gate is budgeting for a run other than the one
    // that happens.
    const gate = columnBGate(CELLS_005_RATIO_5);
    expect(gate.horizon).toBeCloseTo(
      horizonFor(PHASE2_B, CELLS_005_RATIO_5),
      6,
    );
  });

  /**
   * THE AMENDMENT, stated as a test. Exact power-law data, scaled so that the
   * SELECTED form (the power law — leave-one-out prefers the cheaper exact
   * explanation) predicts comfortably under the old 30000 threshold, while the
   * mechanism — which is the largest candidate here and therefore the one that
   * sizes the horizon — puts the real cost over budget.
   *
   * Under the ORIGINAL registered criterion this column runs. It must not.
   */
  it("REFUSES a column the selected form calls cheap and the horizon rule calls unaffordable", () => {
    const pts = powerLawPoints(33.53, 0.87);

    // Preconditions, asserted first, so the assertion below is discriminating
    // rather than accidentally true.
    expect(selectForm(pts).winner).toBe("power-law");
    const selected = predict(fitPowerLaw(pts), PHASE2_B);
    expect(selected).toBeLessThan(30_000); // the old gate waved this through
    const largest = Math.max(
      predict(fitPowerLaw(pts), PHASE2_B),
      predict(fitMechanism(pts), PHASE2_B),
      predict(fitQuadratic(pts), PHASE2_B),
    );
    expect(largest).toBeGreaterThan(selected * 1.2); // they really do disagree

    expect(horizonFor(PHASE2_B, pts)).toBeGreaterThan(COLUMN_B_MAX_HORIZON);
    expect(columnBGate(pts).runs).toBe(false);
  });

  it("preserves the registered budget exactly: 2.5x the registered 30000 prediction", () => {
    // The amendment changes WHICH quantity is compared, not how much compute
    // the project agreed to spend. 2.5 is the registered headroom factor and
    // 30000 was the registered prediction ceiling; their product is the budget
    // the original clause's own stated rationale implied.
    expect(COLUMN_B_MAX_HORIZON).toBe(75_000);
  });
});

describe("phase2Grid — one decision for the whole column", () => {
  /**
   * MUTATION TABLE ROW 9. The runner's first version cancelled column B only at
   * ratio 5.00, leaving ratios 2.00 and 3.33 to run it anyway. The registration
   * makes column B one conditional decision covering all three ratios: "If the
   * criterion fails, Column B is **not** run."
   *
   * The first attempt at this guard asserted `phase2Phis.length === 1`, meaning
   * to pin that the builder cannot see the ratio. It was run against the
   * mutation and SURVIVED: a parameter with a default value does not count
   * toward `Function.length`, so the guard tested nothing. That is recorded
   * here because it is the reason these assertions are made on the grid the
   * runner actually iterates, rather than on the shape of a signature.
   */
  it("runs all three ratios at both phis when the gate passes", () => {
    const grid = phase2Grid(true);
    expect(grid).toHaveLength(6);
    expect(grid.filter((c) => c.phi === PHASE2_B)).toHaveLength(3);
    expect(new Set(grid.map((c) => c.ratio.label))).toEqual(
      new Set(["2.00", "3.33", "5.00"]),
    );
  });

  it("puts NO cell at column B's phi, AT ANY RATIO, when the gate fails", () => {
    const grid = phase2Grid(false);
    expect(grid.filter((c) => c.phi === PHASE2_B)).toEqual([]);
    // Positive control in the same test: column A is untouched by the gate, so
    // a builder that simply returned nothing would not read as success here.
    expect(grid.filter((c) => c.phi === PHASE2_A)).toHaveLength(3);
  });
});
