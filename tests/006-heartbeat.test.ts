import { afterEach, describe, expect, it, vi } from "vitest";
import { runOne, RATIOS } from "../experiments/006-is-the-exponent-one.js";

/**
 * A long run must say it is alive, for registered question 006.
 *
 * ⚠️ THIS TEST EXISTS BECAUSE A RUN WAS KILLED FOR BEING SILENT. Phase 1 was
 * submitted as jobd job 3742 on 2026-09-11 and reaped 91 minutes in with
 * `exit_code=-15`; the broker's own event stream gave the reason as
 * `watchdog_fired / idle_timeout / threshold_s=5400`. Nothing had crashed.
 * Manipulation check 2 re-runs sixty of 005's cells and printed only a header
 * before them and a verdict after, and one of those cells was measured at
 * **479 seconds** — so the check is silent for roughly four hours while working
 * perfectly, which is indistinguishable from a hang to any watchdog, including
 * a human reading the log.
 *
 * The repair is not a longer timeout. A longer timeout leaves the mechanism in
 * place and hands it a bigger window: Phase 2's horizons reach 59000+
 * generations, where a SINGLE run can outlast any threshold worth having. The
 * repair is that a run in progress emits progress, so silence means what a
 * watchdog assumes it means.
 */

afterEach(() => vi.restoreAllMocks());

/** Every line `runOne` wrote to stdout during `body`. */
function captured(body: () => void): string[] {
  const lines: string[] = [];
  const spy = vi
    .spyOn(console, "log")
    .mockImplementation((...a: unknown[]) => void lines.push(a.join(" ")));
  try {
    body();
  } finally {
    spy.mockRestore();
  }
  return lines;
}

const RATIO = RATIOS[0]!;

describe("runOne's heartbeat", () => {
  it("reports progress while a run is still going", () => {
    const lines = captured(() =>
      runOne(0, RATIO, 9001, 120, "heartbeat-test", 0, 50),
    );
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // The point of a heartbeat is that it moves. A fixed string repeated would
    // satisfy "emitted something" while telling a reader nothing.
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("names the generation it has reached, so a stuck run is visible AS stuck", () => {
    const lines = captured(() =>
      runOne(0, RATIO, 9001, 120, "heartbeat-test", 0, 50),
    );
    expect(lines[0]).toMatch(/\b50\b/);
    expect(lines[1]).toMatch(/\b100\b/);
  });

  /**
   * The other half, asserted in the same file: a heartbeat that fires on every
   * short run would flood 150 cells' worth of log and get the monitor rate-
   * limited, which is its own way of hiding a failure. Manipulation check 1
   * runs sixty 80-generation configurations and must stay quiet.
   */
  it("stays SILENT for a run shorter than one interval, at the default interval", () => {
    const lines = captured(() => runOne(0, RATIO, 9001, 80, "quiet-test", 0));
    expect(lines).toEqual([]);
  });

  it("does not change what the run returns", () => {
    // A progress line must be an observation of the run, never a part of it.
    // If the heartbeat could touch the draw stream this whole experiment's
    // reproduction control would be worthless.
    const loud = runOne(0, RATIO, 9001, 120, "x", 0, 50);
    const quiet = runOne(0, RATIO, 9001, 120, "x", 0, 1_000_000);
    expect(loud.hash).toBe(quiet.hash);
    expect(loud.saturationGeneration).toBe(quiet.saturationGeneration);
    expect(loud.copiesPerGenome).toBe(quiet.copiesPerGenome);
  });
});
