import { describe, expect, it } from "vitest";
import {
  fitMechanism,
  fitPowerLaw,
  fitQuadratic,
  horizonFor,
  localExponent,
  predict,
  selectForm,
  type Point,
} from "../experiments/006-forms.js";

/**
 * The analysis half of registered question 006
 * (`docs/pre-registrations/2026-09-11-is-the-exponent-one.md`).
 *
 * This is a separate module from the runner, and the split is the point: the
 * registration's mutation table has to be SEEN TO FAIL before the runner may be
 * committed, and running the experiment to find that out costs ~16 hours. Every
 * mutation the table names is a defect in one of these functions or in a caller
 * of them, so every one of them is checkable here in milliseconds against
 * synthetic data with a known answer.
 *
 * Known answers throughout. A fit tested only against data it fitted tells you
 * nothing, so each fit is given data generated from the exact form it claims to
 * recover, and is asked for the generating constants back.
 */

/** t = C * phi^-a, exactly. */
const powerLawPoints = (C: number, a: number, phis: number[]): Point[] =>
  phis.map((phi) => ({ phi, t: C * phi ** -a }));

const PHIS = [0.002, 0.004, 0.0113, 0.0226, 0.0453];

describe("fitPowerLaw", () => {
  it("recovers the exponent and constant it was generated from", () => {
    const got = fitPowerLaw(powerLawPoints(11.1, 0.8, PHIS));
    expect(got.a).toBeCloseTo(0.8, 10);
    expect(got.C).toBeCloseTo(11.1, 8);
  });

  it("recovers a DIFFERENT exponent, so it is fitting rather than returning a constant", () => {
    const got = fitPowerLaw(powerLawPoints(3.0, 1.4, PHIS));
    expect(got.a).toBeCloseTo(1.4, 10);
    expect(got.C).toBeCloseTo(3.0, 8);
  });
});

describe("fitMechanism", () => {
  it("recovers K from t = K / phi", () => {
    const pts = PHIS.map((phi) => ({ phi, t: 9.44 / phi }));
    expect(fitMechanism(pts).K).toBeCloseTo(9.44, 8);
  });

  it("has NO free exponent — its prediction is exactly inverse in phi", () => {
    // The registration's whole claim is that this candidate carries one
    // constant and a FIXED exponent of 1. If a free exponent ever appears here,
    // halving phi must stop exactly doubling t, and this catches it.
    const m = fitMechanism(PHIS.map((phi) => ({ phi, t: 5 / phi ** 0.87 })));
    expect(predict(m, 0.001) / predict(m, 0.002)).toBeCloseTo(2, 12);
    expect(predict(m, 0.0005) / predict(m, 0.002)).toBeCloseTo(4, 12);
  });
});

describe("fitQuadratic", () => {
  it("recovers a quadratic in log-log that it was generated from", () => {
    const q = { q0: 2, q1: -0.9, q2: 0.05 };
    const pts = PHIS.map((phi) => {
      const L = Math.log(phi);
      return { phi, t: Math.exp(q.q0 + q.q1 * L + q.q2 * L * L) };
    });
    const got = fitQuadratic(pts);
    expect(got.q0).toBeCloseTo(q.q0, 6);
    expect(got.q1).toBeCloseTo(q.q1, 6);
    expect(got.q2).toBeCloseTo(q.q2, 6);
  });

  it("returns q2 = 0 on exact power-law data, because that data is not curved", () => {
    const got = fitQuadratic(powerLawPoints(11.1, 0.87, PHIS));
    expect(got.q2).toBeCloseTo(0, 8);
  });
});

describe("localExponent", () => {
  /**
   * MUTATION TABLE ROW 4 — "a_local computed with the sign flipped". The
   * registration scores the PRIMARY on this number lying in [0.95, 1.05], so a
   * flipped sign reads about -1 and the primary fails for a reason that has
   * nothing to do with the model. The sign convention is pinned here.
   */
  it("is POSITIVE when t falls as phi rises, and equals the generating exponent", () => {
    const a = localExponent({ phi: 0.001, t: 2000 }, { phi: 0.002, t: 1000 });
    expect(a).toBeCloseTo(1, 12);
    expect(a).toBeGreaterThan(0);
  });

  it("does not depend on the order the two cells are given in", () => {
    const lo = { phi: 0.001, t: 2000 };
    const hi = { phi: 0.002, t: 1000 };
    expect(localExponent(lo, hi)).toBeCloseTo(localExponent(hi, lo), 12);
  });

  it("reads back the exponent of exact power-law data at every interval", () => {
    const pts = powerLawPoints(11.1, 0.87, PHIS);
    for (let i = 0; i < pts.length - 1; i++) {
      expect(localExponent(pts[i]!, pts[i + 1]!)).toBeCloseTo(0.87, 10);
    }
  });
});

describe("selectForm — leave-one-out, not R²", () => {
  /**
   * The registration selects the form that sizes Phase 2's horizon by
   * leave-one-out mean absolute relative error, explicitly NOT by R². 005's
   * finding was that R² between 0.993 and 0.9986 failed to separate a
   * misspecified form from a right one, so a selector that rewards fit alone
   * would pick the most flexible candidate every time.
   */
  it("picks the mechanism when the data is exactly inverse in phi", () => {
    const pts = PHIS.map((phi) => ({ phi, t: 9.44 / phi }));
    expect(selectForm(pts).winner).toBe("mechanism");
  });

  it("picks the quadratic when the data is genuinely curved in log-log", () => {
    const pts = PHIS.map((phi) => {
      const L = Math.log(phi);
      return { phi, t: Math.exp(2 - 0.9 * L + 0.08 * L * L) };
    });
    expect(selectForm(pts).winner).toBe("quadratic");
  });

  it("does NOT pick the most flexible candidate by default", () => {
    // Exact power-law data with a != 1. The quadratic can fit it perfectly too
    // (q2 = 0), so a selector scoring in-sample fit would tie or prefer the
    // quadratic. Leave-one-out must prefer the cheaper exact explanation.
    const pts = powerLawPoints(11.1, 0.87, PHIS);
    expect(selectForm(pts).winner).toBe("power-law");
  });

  it("reports a score for every candidate, so the choice is auditable", () => {
    const got = selectForm(PHIS.map((phi) => ({ phi, t: 9.44 / phi })));
    expect(Object.keys(got.scores).sort()).toEqual([
      "mechanism",
      "power-law",
      "quadratic",
    ]);
    for (const v of Object.values(got.scores))
      expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe("horizonFor", () => {
  /**
   * MUTATION TABLE ROW 2 — "horizon taken from candidate B rather than the
   * max". 005 sized its horizon from its own favoured candidate, came in 43%
   * low, and burned 82% of the horizon at its worst seed. The registration
   * repairs that by taking 2.5x the LARGEST prediction across all three
   * candidates, so the horizon cannot come from the model under test.
   */
  it("takes 2.5x the LARGEST candidate prediction, not the selected one's", () => {
    const pts = PHIS.map((phi) => ({ phi, t: 9.44 / phi }));
    const h = horizonFor(0.001, pts);
    const all = [
      predict(fitPowerLaw(pts), 0.001),
      predict(fitMechanism(pts), 0.001),
      predict(fitQuadratic(pts), 0.001),
    ];
    expect(h).toBeGreaterThanOrEqual(2.5 * Math.max(...all) - 1e-6);
  });

  /**
   * MUTATION TABLE ROW 2, PROPERLY. The first version of this test used data
   * that is exactly inverse in phi, where all three candidates nearly agree --
   * so replacing the max with the mechanism's own prediction changed nothing
   * and the mutation went UNCAUGHT. It is recorded here because it is the
   * reason this test exists in this shape.
   *
   * Worth knowing about the real data too: on 005's cells the mechanism happens
   * to BE the largest candidate at both Phase 2 cells, so the max rule and "use
   * the mechanism" coincide there. The rule is still the right one -- it cannot
   * be known in advance which candidate will be largest -- but on this data it
   * does not bite, which is why the runner records horizon provenance per row
   * rather than leaving it to be inferred.
   */
  it("uses the LARGEST candidate even when that is not the mechanism", () => {
    // Strong positive curvature: extrapolated below the range the quadratic
    // blows past both the mechanism and the power law.
    const pts = PHIS.map((phi) => {
      const L = Math.log(phi);
      return { phi, t: Math.exp(2 - 0.9 * L + 0.15 * L * L) };
    });
    const q = predict(fitQuadratic(pts), 0.0005);
    const m = predict(fitMechanism(pts), 0.0005);
    // Precondition, asserted first: the quadratic really is the bigger one
    // here, so the assertion below is discriminating rather than vacuous.
    expect(q).toBeGreaterThan(m * 1.5);
    expect(horizonFor(0.0005, pts)).toBeCloseTo(2.5 * q, 6);
  });

  it("is strictly larger than every candidate's own prediction", () => {
    const pts = PHIS.map((phi) => ({ phi, t: 9.44 / phi }));
    const h = horizonFor(0.0005, pts);
    for (const f of [fitPowerLaw(pts), fitMechanism(pts), fitQuadratic(pts)]) {
      expect(h).toBeGreaterThan(predict(f, 0.0005));
    }
  });

  it("grows as phi shrinks, because t_sat does", () => {
    const pts = PHIS.map((phi) => ({ phi, t: 9.44 / phi }));
    expect(horizonFor(0.0005, pts)).toBeGreaterThan(horizonFor(0.001, pts));
    expect(horizonFor(0.001, pts)).toBeGreaterThan(horizonFor(0.002, pts));
  });
});
