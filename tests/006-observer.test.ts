import { afterEach, describe, expect, it, vi } from "vitest";
import { runOne, RATIOS } from "../experiments/006-is-the-exponent-one.js";

/**
 * `runOne`'s optional observer, added POST-DATA for registered question 007
 * (`docs/pre-registrations/2026-09-19-do-the-controlled-seeds-saturate.md`).
 *
 * 007 needs two things from inside 006's loop: the state hash at generation
 * 70013 (its replay check) and copies/genome every 1000 generations (its trend
 * rule). Importing the loop and observing it keeps ONE copy of the definitions;
 * the price is a change to a registered runner, so the change must provably be
 * an observation and never a part of the run.
 */

afterEach(() => vi.restoreAllMocks());

const RATIO = RATIOS[2]!;
const quietly = <T>(f: () => T): T => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  return f();
};

describe("runOne's observer", () => {
  it("leaves every field of the returned row unchanged", () => {
    const plain = quietly(() => runOne(0.0005, RATIO, 9002, 150, "x", 0));
    const seen: number[] = [];
    const observed = quietly(() =>
      runOne(0.0005, RATIO, 9002, 150, "x", 0, undefined, (w) =>
        seen.push(w.generation),
      ),
    );
    expect(observed).toEqual(plain);
    expect(seen.length).toBeGreaterThan(0);
  });

  it("is called once per generation, in order, up to the horizon", () => {
    const seen: number[] = [];
    const row = quietly(() =>
      runOne(0.0005, RATIO, 9002, 150, "x", 0, undefined, (w) =>
        seen.push(w.generation),
      ),
    );
    // The run must not have stopped early, or this would test a shorter loop.
    expect(row.stoppedAt).toBe(150);
    expect(seen).toEqual(Array.from({ length: 150 }, (_, i) => i + 1));
  });
  // ⚠️ NOT unit-tested here: that the observer is NOT called for the
  // generation at which a run stops early. The cheapest early stop found
  // (saturation at phi 0.0453, ~312 generations at ~1500 copies/genome) costs
  // ~30 s alone and, run in parallel with the suite, timed out and starved two
  // other tests. 007's manipulation check 5 asserts exactly this on every real
  // run's series, so it is checked where it matters rather than here.
});
