import { describe, expect, it } from "vitest";
import {
  controlledAt,
  expectedSampleGenerations,
  labelOf,
  overallOf,
  primaryHeld,
  trendOf,
  wilson,
  type Sample,
} from "../experiments/007-analysis.js";

/**
 * The analysis half of registered question 007
 * (`docs/pre-registrations/2026-09-19-do-the-controlled-seeds-saturate.md`),
 * against synthetic series with known answers, before any data exists.
 * Mutation-table rows 4-7 are pinned here.
 */

const H = 239_030;
const SAT = 1500;

/** Samples every 1000 generations up to `end`, copies/genome from `f(g)`. */
const series = (end: number, f: (g: number) => number): Sample[] =>
  Array.from({ length: Math.floor(end / 1000) }, (_, i) => {
    const g = (i + 1) * 1000;
    return { generation: g, copiesPerGenome: f(g) };
  });

const controlled = { saturated: 0, extinct: 0, stoppedAt: H, horizon: H };

describe("trendOf — the registered trending rule", () => {
  it("calls a flat series flat", () => {
    expect(
      trendOf(
        series(H, () => 500),
        H,
      ).trending,
    ).toBe(false);
  });

  it("calls a series whose last-half drift reaches 1500 by 2H trending", () => {
    // ln-linear from 500 at H/2 to 900 at H: extended to 2H it passes 1500.
    const k = Math.log(900 / 500) / (H / 2);
    const s = series(H, (g) =>
      g < H / 2 ? 500 : 500 * Math.exp(k * (g - H / 2)),
    );
    expect(trendOf(s, H).trending).toBe(true);
  });

  it("calls a rising series too slow to reach 1500 by 2H flat", () => {
    // 500 -> 550 over the last half: extended one more H, about 665. Not 1500.
    const k = Math.log(550 / 500) / (H / 2);
    const s = series(H, (g) =>
      g < H / 2 ? 500 : 500 * Math.exp(k * (g - H / 2)),
    );
    expect(trendOf(s, H).trending).toBe(false);
  });

  it("row 4: fits the LAST HALF only — a steep early climb that has stopped is flat", () => {
    // Rises 100 -> 700 over the first half, then flat at 700. A whole-run fit
    // sees a strong slope and would call it trending.
    const s = series(H, (g) =>
      g < H / 2 ? 100 * Math.exp((Math.log(7) * g) / (H / 2)) : 700,
    );
    expect(trendOf(s, H).trending).toBe(false);
  });

  it("row 5: extrapolates to 2H, not H — a seed reaching 1500 between H and 2H is trending", () => {
    // Last half 600 -> 1000; the fitted line reaches ~1667 at 2H but only 1000 at H.
    const k = Math.log(1000 / 600) / (H / 2);
    const s = series(H, (g) =>
      g < H / 2 ? 600 : 600 * Math.exp(k * (g - H / 2)),
    );
    const t = trendOf(s, H);
    expect(Math.exp(t.fittedAtH)).toBeLessThan(SAT);
    expect(t.trending).toBe(true);
  });

  it("a slope of zero or below is always flat", () => {
    const s = series(H, (g) => 800 - g / 1000);
    expect(trendOf(s, H).trending).toBe(false);
  });

  it("refuses a window with too few samples to fit", () => {
    expect(() =>
      trendOf(
        series(3000, () => 500),
        H,
      ),
    ).toThrow();
  });
});

describe("labelOf — exactly one label per seed", () => {
  it("saturated and extinct come from the row, never from the series", () => {
    const flat = series(H, () => 500);
    expect(
      labelOf({ ...controlled, saturated: 1, stoppedAt: 30000 }, flat, H),
    ).toBe("saturated");
    // Row 6: an extinct seed must not be read as controlled, however its
    // series looked before it died.
    expect(
      labelOf({ ...controlled, extinct: 1, stoppedAt: 90000 }, flat, H),
    ).toBe("extinct");
  });

  it("a run that reached H neither saturated nor extinct is controlled-flat or -trending", () => {
    expect(
      labelOf(
        controlled,
        series(H, () => 500),
        H,
      ),
    ).toBe("controlled-flat");
    const k = Math.log(900 / 500) / (H / 2);
    const rising = series(H, (g) =>
      g < H / 2 ? 500 : 500 * Math.exp(k * (g - H / 2)),
    );
    expect(labelOf(controlled, rising, H)).toBe("controlled-trending");
  });

  it("refuses a run that stopped before H without saturating or going extinct", () => {
    expect(() =>
      labelOf(
        { ...controlled, stoppedAt: H - 1 },
        series(H - 1, () => 500),
        H,
      ),
    ).toThrow();
  });
});

describe("the PRIMARY and the overall outcome", () => {
  it("delay only if all three saturated", () => {
    expect(primaryHeld(["saturated", "saturated", "saturated"])).toBe(true);
    expect(overallOf(["saturated", "saturated", "saturated"])).toBe("delay");
    expect(primaryHeld(["saturated", "saturated", "extinct"])).toBe(false);
  });

  it("floor-consistent if not all saturated and at least one is controlled-flat", () => {
    expect(
      overallOf(["saturated", "controlled-flat", "controlled-trending"]),
    ).toBe("floor-consistent");
  });

  it("row 7: undecided when every controlled seed is trending — never floor-consistent", () => {
    expect(
      overallOf(["controlled-trending", "controlled-trending", "saturated"]),
    ).toBe("undecided");
  });

  it("an extinction is never read as a floor", () => {
    expect(overallOf(["saturated", "saturated", "extinct"])).toBe("undecided");
  });

  it("demands exactly three named-seed labels", () => {
    expect(() => overallOf(["saturated", "saturated"])).toThrow();
  });
});

describe("wilson — 95% score interval", () => {
  it("matches known values", () => {
    const [lo0, hi0] = wilson(0, 20);
    expect(lo0).toBe(0);
    expect(hi0).toBeCloseTo(0.1611, 3);
    const [lo, hi] = wilson(10, 20);
    expect(lo).toBeCloseTo(0.2993, 3);
    expect(hi).toBeCloseTo(0.7007, 3);
  });
});

describe("expectedSampleGenerations — the series a run must have", () => {
  it("a run that reached its horizon has every multiple of 1000 up to it", () => {
    expect(expectedSampleGenerations(5000, false)).toEqual([
      1000, 2000, 3000, 4000, 5000,
    ]);
    expect(expectedSampleGenerations(5500, false)).toEqual([
      1000, 2000, 3000, 4000, 5000,
    ]);
  });

  it("a run that stopped early has none AT its stopping generation", () => {
    // The observer is not called for the generation at which a run stops.
    expect(expectedSampleGenerations(5000, true)).toEqual([
      1000, 2000, 3000, 4000,
    ]);
    expect(expectedSampleGenerations(5500, true)).toEqual([
      1000, 2000, 3000, 4000, 5000,
    ]);
  });
});

describe("controlledAt — was a run still controlled at generation G?", () => {
  const r = (stoppedAt: number, saturated = 0, extinct = 0) => ({
    stoppedAt,
    saturated,
    extinct,
  });
  it("a run that stopped after G was controlled at G, however it ended", () => {
    expect(controlledAt(r(90_000, 1), 70_013)).toBe(true);
    expect(controlledAt(r(90_000, 0, 1), 70_013)).toBe(true);
  });
  it("a run that saturated or went extinct at or before G was not", () => {
    expect(controlledAt(r(70_013, 1), 70_013)).toBe(false);
    expect(controlledAt(r(23_000, 1), 70_013)).toBe(false);
    expect(controlledAt(r(50_000, 0, 1), 70_013)).toBe(false);
  });
  it("a run that reached G as its horizon, neither saturated nor extinct, was", () => {
    expect(controlledAt(r(70_013), 70_013)).toBe(true);
  });
});

describe("expectedSampleGenerations at another interval", () => {
  it("honours the interval it is given", () => {
    expect(expectedSampleGenerations(100, false, 20)).toEqual([
      20, 40, 60, 80, 100,
    ]);
  });
});
