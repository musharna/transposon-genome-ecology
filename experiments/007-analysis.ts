/**
 * The analysis half of registered question 007 — "do the controlled seeds
 * saturate?" (`docs/pre-registrations/2026-09-19-do-the-controlled-seeds-saturate.md`).
 *
 * Pure functions over rows and series, so `tests/007-analysis.test.ts` pins
 * every rule against synthetic data with known answers before any run exists.
 * Mutation-table rows 4-7 land here.
 *
 * The saturation threshold is IMPORTED from 006's runner, never restated: 007's
 * definitions are 006's by construction.
 */
import { SATURATION_COPIES_PER_GENOME } from "./006-is-the-exponent-one.js";

/** One point of a run's recorded series. */
export interface Sample {
  generation: number;
  copiesPerGenome: number;
}

export type Label =
  | "saturated"
  | "extinct"
  | "controlled-flat"
  | "controlled-trending";

export type Outcome = "delay" | "floor-consistent" | "undecided";

/** The series is sampled every this many generations. */
export const SAMPLE_EVERY = 1000;

/** Fewer points than this in the fit window is not a fit. */
const MIN_FIT_SAMPLES = 10;

export interface Trend {
  slope: number;
  intercept: number;
  /** Fitted ln(copies/genome) at generation H. */
  fittedAtH: number;
  /** Fitted ln(copies/genome) at generation 2H — the registered test point. */
  fittedAt2H: number;
  samples: number;
  trending: boolean;
}

/**
 * THE REGISTERED TRENDING RULE. Over the last half of the run, generations H/2
 * to H, fit ln(copies/genome) against generation by ordinary least squares. The
 * seed is TRENDING if the fitted line, extended to 2H, reaches ln 1500;
 * otherwise flat. A slope of zero or below is always flat. No significance test.
 */
export function trendOf(series: Sample[], H: number): Trend {
  const win = series.filter((s) => s.generation >= H / 2 && s.generation <= H);
  if (win.length < MIN_FIT_SAMPLES) {
    throw new Error(
      `trend window [${H / 2}, ${H}] holds ${win.length} samples; at least ${MIN_FIT_SAMPLES} are needed to fit`,
    );
  }
  const bad = win.find((s) => !(s.copiesPerGenome > 0));
  if (bad) {
    throw new Error(
      `copies/genome ${bad.copiesPerGenome} at generation ${bad.generation}: a controlled run cannot have none`,
    );
  }
  const n = win.length;
  const xs = win.map((s) => s.generation);
  const ys = win.map((s) => Math.log(s.copiesPerGenome));
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const fittedAtH = intercept + slope * H;
  const fittedAt2H = intercept + slope * 2 * H;
  return {
    slope,
    intercept,
    fittedAtH,
    fittedAt2H,
    samples: n,
    trending: slope > 0 && fittedAt2H >= Math.log(SATURATION_COPIES_PER_GENOME),
  };
}

/** The fields of a run's row that decide its label. */
export interface Ending {
  saturated: number;
  extinct: number;
  stoppedAt: number;
  horizon: number;
}

/**
 * Exactly one label per seed. Saturated and extinct come from the ROW; only a
 * run that reached H neither saturated nor extinct is read from its series.
 */
export function labelOf(row: Ending, series: Sample[], H: number): Label {
  if (row.saturated === 1) return "saturated";
  if (row.extinct === 1) return "extinct";
  if (row.horizon !== H) {
    throw new Error(
      `a named or fresh run must have horizon ${H}; this one has ${row.horizon}`,
    );
  }
  if (row.stoppedAt < H) {
    throw new Error(
      `run stopped at ${row.stoppedAt}, before H = ${H}, without saturating or going extinct — not a registered outcome`,
    );
  }
  return trendOf(series, H).trending
    ? "controlled-trending"
    : "controlled-flat";
}

/** PRIMARY (delay): all three named seeds saturate before H. */
export function primaryHeld(labels: Label[]): boolean {
  if (labels.length !== 3) {
    throw new Error(
      `the PRIMARY is over the 3 named seeds; got ${labels.length}`,
    );
  }
  return labels.every((l) => l === "saturated");
}

/**
 * The overall outcome for the named seeds: delay if all three saturated; else
 * floor-consistent if at least one is controlled-flat; else undecided. An
 * extinction is never read as a floor.
 */
export function overallOf(labels: Label[]): Outcome {
  if (primaryHeld(labels)) return "delay";
  if (labels.includes("controlled-flat")) return "floor-consistent";
  return "undecided";
}

/** Wilson score interval for k of n, 95% by default. */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n <= 0 || k < 0 || k > n)
    throw new Error(`wilson(${k}, ${n}) is not a proportion`);
  const p = k / n;
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half =
    (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/**
 * The generations a run's series must hold (manipulation check 5): every
 * multiple of SAMPLE_EVERY up to its stopping generation — EXCEPT the stopping
 * generation itself when the run stopped early, because 006's `runOne` does not
 * call its observer for the generation at which a run stops.
 */
export function expectedSampleGenerations(
  stoppedAt: number,
  stoppedEarly: boolean,
  every: number = SAMPLE_EVERY,
): number[] {
  const out: number[] = [];
  for (let g = every; g <= stoppedAt; g += every) {
    if (stoppedEarly && g === stoppedAt) continue;
    out.push(g);
  }
  return out;
}

/**
 * Was a run still controlled — neither saturated nor extinct — at generation G?
 * For the SECONDARY's "controlled at 70013". A run that stopped after G was;
 * one that stopped at or before G by saturating or going extinct was not; one
 * that simply reached G as its horizon was.
 */
export function controlledAt(
  row: { stoppedAt: number; saturated: number; extinct: number },
  G: number,
): boolean {
  if (row.stoppedAt > G) return true;
  if (row.stoppedAt < G) return false;
  return row.saturated === 0 && row.extinct === 0;
}
