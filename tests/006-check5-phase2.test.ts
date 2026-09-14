import { afterEach, describe, expect, it, vi } from "vitest";
import {
  manipulationCheck5,
  phase2Keys,
  RATIOS,
  SEEDS,
  type Row,
} from "../experiments/006-is-the-exponent-one.js";

/**
 * Manipulation check 5 — grid integrity — applied to PHASE 2 of registered
 * question 006 (`docs/pre-registrations/2026-09-11-is-the-exponent-one.md`).
 *
 * ⚠️ WRITTEN AFTER THE DATA EXISTED. The runner committed pre-data applied check
 * 5 to Phase 1 only; the Result verified Phase 2's grid by a read-only script and
 * said so. This pins the key set the runner now checks Phase 2 against.
 *
 * The expected set must come from the COLUMN B GATE, never from which rows the
 * CSV happens to hold. Inferring "column B ran" from the presence of 0.0005 rows
 * would let a Phase 2 file with the entire column missing pass as a closed gate
 * — a whole registered column vanishing, read as a decision.
 */

afterEach(() => vi.restoreAllMocks());

const quiet = () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
};

/** Built here, independently of `phase2Grid`, from the registration's text. */
const registered = (phis: number[]): string[] =>
  phis.flatMap((phi) =>
    ["2.00", "3.33", "5.00"].flatMap((ratio) =>
      Array.from({ length: 10 }, (_, i) => `${phi}|${ratio}|${6001 + i}`),
    ),
  );

const rowFor = (key: string): Row => {
  const [phi, ratio, seed] = key.split("|");
  return {
    phi: Number(phi),
    ratio: ratio!,
    theta: 0.1,
    sigmaS: 0.05,
    seed: Number(seed),
    horizon: 30_000,
    horizonFrom: "mechanism",
    horizonPredicted: 12_000,
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
  };
};

describe("phase2Keys — the registered Phase 2 grid, from the gate", () => {
  it("with column B running: both columns, all three ratios, all ten seeds", () => {
    expect([...phase2Keys(true)].sort()).toEqual(
      registered([0.001, 0.0005]).sort(),
    );
  });

  it("with column B closed: column A only, and NO key at 0.0005 at any ratio", () => {
    const keys = [...phase2Keys(false)];
    expect(keys.sort()).toEqual(registered([0.001]).sort());
    expect(keys.some((k) => k.startsWith("0.0005|"))).toBe(false);
  });

  it("the independent key builder above assumes the runner's ratio labels and seeds", () => {
    expect(RATIOS.map((r) => r.label)).toEqual(["2.00", "3.33", "5.00"]);
    expect(SEEDS).toEqual(Array.from({ length: 10 }, (_, i) => 6001 + i));
  });
});

describe("check 5 on Phase 2", () => {
  const clean = registered([0.001, 0.0005]).map(rowFor);

  it("positive control: the clean 60-row grid passes when the gate ran", () => {
    quiet();
    expect(() =>
      manipulationCheck5(clean, phase2Keys(true), "Phase 2"),
    ).not.toThrow();
  });

  it("VOIDS when the gate ran and the whole of column B is absent", () => {
    quiet();
    const noB = clean.filter((r) => r.phi !== 0.0005);
    expect(() => manipulationCheck5(noB, phase2Keys(true), "Phase 2")).toThrow(
      /30 missing/,
    );
  });

  it("VOIDS when the gate was closed but column B rows are present", () => {
    quiet();
    expect(() =>
      manipulationCheck5(clean, phase2Keys(false), "Phase 2"),
    ).toThrow(/30 unexpected/);
  });

  it("VOIDS on one seed run twice in the same cell", () => {
    quiet();
    const dup = [...clean.slice(1), clean[1]!];
    expect(() => manipulationCheck5(dup, phase2Keys(true), "Phase 2")).toThrow(
      /1 duplicated, 1 missing/,
    );
  });
});
