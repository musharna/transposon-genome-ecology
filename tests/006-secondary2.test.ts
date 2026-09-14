import { describe, expect, it } from "vitest";
import {
  convergence,
  localExponent,
  localExponentWithSem,
  secondary2Falsified,
  summariseCell,
  type Cell,
} from "../experiments/006-forms.js";
import {
  PHASE1_PHIS,
  registeredConvergenceCells,
} from "../experiments/006-is-the-exponent-one.js";

/**
 * SECONDARY 2 of registered question 006 — "convergence, not coincidence"
 * (`docs/pre-registrations/2026-09-11-is-the-exponent-one.md`).
 *
 * ⚠️ WRITTEN AFTER THE DATA EXISTED. The clause was registered on 2026-09-11,
 * but the runner committed at `26a3a12` never implemented it, and that was only
 * noticed while writing the Result on 2026-09-14. The Result reported it from a
 * read-only script instead and marked it as such. These tests pin the runner's
 * implementation to the clause as written:
 *
 *   at each ratio, the local exponents over 0.0113→0.0226, 0.004→0.0113,
 *   0.002→0.004, 0.001→0.002 (and 0.0005→0.001 if column B runs) are
 *   non-decreasing within one combined SEM per step; FALSIFIED IF the sequence
 *   decreases by more than one combined SEM at any step, at two or more ratios.
 *
 * "Combined SEM" is taken as √(sem_i² + sem_j²) of the two local exponents,
 * which is what the Result's off-runner numbers used. It ignores the covariance
 * from the cell two adjacent intervals share; that covariance is negative, so
 * ignoring it UNDERSTATES the step SEM and makes a falsifying decrease easier
 * to find, not harder.
 */

/**
 * Cells whose local exponents are exactly `exps` over consecutive `phis`
 * (given from the LARGEST phi down), each cell carrying relative SEM `rel`.
 */
function cellsWithExponents(
  phis: number[],
  exps: number[],
  rel: number,
  t0 = 300,
): Cell[] {
  const out: Cell[] = [{ phi: phis[0]!, t: t0, sem: rel * t0, n: 10 }];
  for (let i = 0; i < exps.length; i++) {
    const prev = out[i]!;
    const t = prev.t * (prev.phi / phis[i + 1]!) ** exps[i]!;
    out.push({ phi: phis[i + 1]!, t, sem: rel * t, n: 10 });
  }
  return out;
}

const REG = [0.0226, 0.0113, 0.004, 0.002, 0.001, 0.0005];

describe("summariseCell", () => {
  it("returns the mean and the standard error of the mean", () => {
    const c = summariseCell(0.001, [10, 12, 14]);
    expect(c.phi).toBe(0.001);
    expect(c.t).toBe(12);
    expect(c.n).toBe(3);
    expect(c.sem).toBeCloseTo(2 / Math.sqrt(3), 12);
  });

  it("refuses a cell with fewer than two runs, whose SEM does not exist", () => {
    expect(() => summariseCell(0.001, [10])).toThrow(/two/);
    expect(() => summariseCell(0.001, [])).toThrow(/two/);
  });
});

describe("localExponentWithSem", () => {
  const lo: Cell = { phi: 0.001, t: 9000, sem: 90, n: 10 };
  const hi: Cell = { phi: 0.002, t: 4500, sem: 45, n: 10 };

  it("has the same exponent as localExponent", () => {
    expect(localExponentWithSem(lo, hi).a).toBe(localExponent(lo, hi));
  });

  it("propagates the two cells' relative SEMs through the log ratio", () => {
    // 1% on each cell, one doubling of phi: sqrt(2) * 0.01 / ln 2.
    expect(localExponentWithSem(lo, hi).sem).toBeCloseTo(
      (Math.SQRT2 * 0.01) / Math.LN2,
      12,
    );
  });

  it("names the interval by its lower and upper phi, whatever order it is given in", () => {
    for (const got of [
      localExponentWithSem(lo, hi),
      localExponentWithSem(hi, lo),
    ]) {
      expect(got.lo).toBe(0.001);
      expect(got.hi).toBe(0.002);
      expect(got.sem).toBeGreaterThan(0);
    }
  });
});

describe("convergence", () => {
  it("orders the intervals from the LARGEST phi down, as the clause lists them", () => {
    const got = convergence(
      cellsWithExponents(REG, [0.8, 0.9, 0.95, 1, 1], 0.01),
    );
    expect(got.intervals.map((i) => [i.lo, i.hi])).toEqual([
      [0.0113, 0.0226],
      [0.004, 0.0113],
      [0.002, 0.004],
      [0.001, 0.002],
      [0.0005, 0.001],
    ]);
    expect(got.intervals.map((i) => i.a)).toEqual(
      [0.8, 0.9, 0.95, 1, 1].map((a) => expect.closeTo(a, 10)),
    );
  });

  it("does not depend on the order the cells are given in", () => {
    const cells = cellsWithExponents(REG, [0.8, 1.1, 0.9, 1, 1], 0.001);
    const shuffled = [
      cells[3]!,
      cells[0]!,
      cells[5]!,
      cells[1]!,
      cells[4]!,
      cells[2]!,
    ];
    expect(convergence(shuffled)).toEqual(convergence(cells));
  });

  it("finds no decrease in a sequence that only rises", () => {
    const got = convergence(
      cellsWithExponents(REG, [0.8, 0.9, 0.95, 1, 1.02], 0.001),
    );
    expect(got.decreases).toEqual([]);
  });

  it("COUNTS a decrease larger than one combined SEM, at the step where it happens", () => {
    // 0.95 -> 0.85 at the third step; SEMs here are ~0.001-0.002.
    const got = convergence(
      cellsWithExponents(REG, [0.8, 0.9, 0.95, 0.85, 1], 0.001),
    );
    expect(got.decreases).toHaveLength(1);
    const d = got.decreases[0]!;
    expect([d.from.lo, d.from.hi, d.to.lo, d.to.hi]).toEqual([
      0.002, 0.004, 0.001, 0.002,
    ]);
    expect(d.drop).toBeCloseTo(0.1, 10);
    expect(d.combinedSem).toBeCloseTo(Math.hypot(d.from.sem, d.to.sem), 12);
  });

  it("does NOT count a decrease that lies within one combined SEM", () => {
    // Same 0.1 dip, but 10% SEM per cell makes every step's SEM far larger.
    const got = convergence(
      cellsWithExponents(REG, [0.8, 0.9, 0.95, 0.85, 1], 0.1),
    );
    expect(got.decreases).toEqual([]);
  });

  it("never counts an INCREASE, however large, because the clause predicts one", () => {
    const got = convergence(
      cellsWithExponents(REG, [0.5, 0.9, 1.5, 1.6, 2.5], 0.0001),
    );
    expect(got.decreases).toEqual([]);
  });
});

describe("secondary2Falsified — at TWO OR MORE ratios", () => {
  const clean = convergence(
    cellsWithExponents(REG, [0.8, 0.9, 0.95, 1, 1], 0.001),
  );
  const oneDip = convergence(
    cellsWithExponents(REG, [0.8, 0.9, 0.95, 0.85, 1], 0.001),
  );
  const twoDips = convergence(
    cellsWithExponents(REG, [0.9, 0.8, 0.95, 0.85, 1], 0.001),
  );

  it("positive control: the fixtures contain the decreases they claim", () => {
    expect(clean.decreases).toHaveLength(0);
    expect(oneDip.decreases).toHaveLength(1);
    expect(twoDips.decreases).toHaveLength(2);
  });

  it("HOLDS when no ratio decreases", () => {
    expect(secondary2Falsified([clean, clean, clean])).toBe(false);
  });

  it("HOLDS when exactly one ratio decreases", () => {
    expect(secondary2Falsified([clean, oneDip, clean])).toBe(false);
  });

  it("counts RATIOS, not steps: two decreases at ONE ratio still hold", () => {
    expect(secondary2Falsified([twoDips, clean, clean])).toBe(false);
  });

  it("is FALSIFIED when two ratios decrease", () => {
    expect(secondary2Falsified([oneDip, clean, twoDips])).toBe(true);
  });
});

describe("registeredConvergenceCells — the registered intervals, and only those", () => {
  const ladder = (phis: readonly number[]): Cell[] =>
    phis.map((phi) => ({ phi, t: 10 / phi, sem: 0.1 / phi, n: 10 }));
  const all = ladder([0.0453, ...REG, ...PHASE1_PHIS]);

  it("keeps 005's four smallest cells and column A, and drops Phase 1's interleaved cells", () => {
    // Phase 1's cells sit between the registered ones. Adjacent-cell exponents
    // on that finer ladder are noisier and are NOT what the clause lists, so a
    // leak here would change the verdict rather than merely refine it.
    const got = registeredConvergenceCells(all, false).map((c) => c.phi);
    expect(got).toEqual([0.0226, 0.0113, 0.004, 0.002, 0.001]);
    for (const p of PHASE1_PHIS) expect(got).not.toContain(p);
  });

  it("adds 0.0005 when column B ran", () => {
    expect(registeredConvergenceCells(all, true).map((c) => c.phi)).toEqual(
      REG,
    );
  });

  it("refuses to score a sequence with a registered cell missing", () => {
    const holed = all.filter((c) => c.phi !== 0.004);
    expect(() => registeredConvergenceCells(holed, false)).toThrow(/0\.004/);
  });

  it("refuses when column B ran but its cell is absent", () => {
    const noB = all.filter((c) => c.phi !== 0.0005);
    expect(() => registeredConvergenceCells(noB, true)).toThrow(/0\.0005/);
  });
});
