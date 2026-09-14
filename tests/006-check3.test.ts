import { afterEach, describe, expect, it, vi } from "vitest";
import {
  manipulationCheck3,
  type Row,
} from "../experiments/006-is-the-exponent-one.js";

/**
 * Manipulation check 3 of registered question 006 must say WHY a run has no
 * `t_sat` (`docs/pre-registrations/2026-09-11-is-the-exponent-one.md`).
 *
 * ⚠️ WRITTEN AFTER THE DATA EXISTED, and it changes WORDING ONLY. Phase 2
 * produced three runs that went EXTINCT (ratio 3.33) and three that were
 * CENSORED at their horizon (phi 0.0005, ratio 5.00). The check printed all six
 * as "did NOT saturate inside their horizon" — true of the censored runs, false
 * of the extinct ones, which ended thousands of generations before their
 * horizon because the element was gone. Extinction is a registered per-cell
 * outcome; censoring is what check 3 is about. Which rows the check returns —
 * the saturated ones, and so every number downstream — does not change, and the
 * first test pins that.
 */

afterEach(() => vi.restoreAllMocks());

const row = (seed: number, over: Partial<Row> = {}): Row => ({
  phi: 0.001,
  ratio: "3.33",
  theta: 0.1,
  sigmaS: 0.03,
  seed,
  horizon: 30_883,
  horizonFrom: "mechanism",
  horizonPredicted: 12_353,
  stoppedAt: 10_000,
  copiesPerGenome: 1500,
  silencedFraction: 0.5,
  extinct: 0,
  saturated: 1,
  saturationGeneration: 10_000,
  entriesPerGenome: 10,
  captures: 100,
  meanAbsS: 1,
  maxAbsEntry: 50,
  hash: "deadbeef",
  ...over,
});

const saturated = row(6002);
const extinct = row(6001, {
  extinct: 1,
  saturated: 0,
  saturationGeneration: "NA",
  stoppedAt: 9848,
  copiesPerGenome: 0,
});
const censored = row(6005, {
  saturated: 0,
  saturationGeneration: "NA",
  stoppedAt: 30_883,
  copiesPerGenome: 573,
});

/** Everything check 3 prints, stdout and stderr, and what it returns. */
function run(rows: Row[]): { out: string; kept: Row[] } {
  const lines: string[] = [];
  const push = (...a: unknown[]) => void lines.push(a.join(" "));
  vi.spyOn(console, "log").mockImplementation(push);
  vi.spyOn(console, "error").mockImplementation(push);
  const kept = manipulationCheck3(rows);
  vi.restoreAllMocks();
  return { out: lines.join("\n"), kept };
}

describe("manipulation check 3 — censored and extinct are different outcomes", () => {
  it("returns exactly the saturated runs, as before: the fix moves no number", () => {
    expect(run([saturated, extinct, censored]).kept).toEqual([saturated]);
  });

  it("positive control: a fully saturated grid still PASSES in the words it always used", () => {
    const { out, kept } = run([saturated, row(6003)]);
    expect(out).toContain("PASSED — all 2 runs saturated inside horizon.");
    expect(kept).toHaveLength(2);
  });

  it("counts ONLY the censored run as censored at its horizon", () => {
    const { out } = run([saturated, extinct, censored]);
    expect(out).toMatch(/1 of 3 runs were CENSORED at their horizon/);
    expect(out).not.toMatch(/2 of 3 runs/);
  });

  it("reports the extinct run AS EXTINCT, with the generation it died", () => {
    const { out } = run([saturated, extinct, censored]);
    expect(out).toMatch(/1 of 3 runs went EXTINCT/);
    expect(out).toMatch(/seed=6001: extinct at generation 9848/);
  });

  it("never describes an extinct run as having failed to saturate inside its horizon", () => {
    const { out } = run([saturated, extinct]);
    expect(out).not.toMatch(/did NOT saturate inside/);
    expect(out).not.toMatch(/CENSORED/);
    expect(out).toMatch(/No run was censored at its horizon/);
    // Not every run saturated, so the all-saturated PASS line must not print.
    expect(out).not.toMatch(/PASSED — all/);
  });

  it("names a run that stopped EARLY without saturating or dying, rather than calling it censored", () => {
    const early = row(6007, {
      saturated: 0,
      saturationGeneration: "NA",
      stoppedAt: 12_000,
    });
    const { out, kept } = run([saturated, early]);
    expect(out).toMatch(/NOT a registered outcome/);
    expect(out).toMatch(/seed=6007/);
    expect(out).not.toMatch(/CENSORED/);
    expect(kept).toEqual([saturated]);
  });

  it("still VOIDS on a censored run recorded as saturated at its horizon (mutation row 3)", () => {
    const disguised = row(6009, {
      saturationGeneration: 30_883,
      stoppedAt: 30_883,
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => manipulationCheck3([saturated, disguised])).toThrow(/VOID/);
  });
});
