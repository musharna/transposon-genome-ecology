import { writeFileSync } from "node:fs";
import {
  createWorld,
  defaultParams,
  detectPhasesDetailed,
  history,
  makeRng,
  observe,
} from "../sim/index.js";

/**
 * Registered question 001 — per-copy versus family-level rate heritability.
 *
 * Registration: `docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md`,
 * committed at `f5ae5b1` BEFORE this file existed. Everything here — the regime,
 * the arms, the outcomes, the manipulation check — is fixed by that document; if
 * the two disagree, the document is right and this file is a bug.
 *
 * Emits CSV. Figures and the pre-specified tests are R — `docs/analysis/plot-001.R`.
 *
 * WHY sigmaS = 0.020 AND NOT GUARD 2's 0.005
 * ------------------------------------------
 * At guard 2's invasion arm every run in both arms goes extinct, so two of the
 * three outcomes are 0-versus-0 and 100%-versus-100%. The registration's §1–§4
 * carry the measurements and the arm-blind, held-out-seed criterion that picked
 * 0.020 instead. It is NOT a tuned value: it is the grid point whose POOLED
 * extinction fraction on seeds 1001..1010 (disjoint from the seeds below) came
 * closest to 0.5, which is the only regime in which all three outcomes can vary.
 *
 * WHY BOTH ARMS JITTER r0
 * -----------------------
 * `jitter` is seeded independently of the world RNG and is drawn identically in
 * both arms, so at a given seed the two arms start from the SAME founding rate.
 * The arms then differ in exactly one thing — whether rate mutates within a run.
 * An earlier draft gave the jitter to the family-level arm only, which is two
 * differences under a claim of one.
 */
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const GENERATIONS = 600;
const SIGMA_J = 0.05;
const SIGMA_R_PER_COPY = 0.05;
const BASE = {
  N: 300,
  S: 3000,
  c: 0.02,
  r0: 0.2,
  rMax: 1,
  sigmaS: 0.02,
  theta: 0.15,
  v: 0.005,
  a: 0.0004,
  b: 0.00001,
  d: 0.0005,
  dTol: 0.002,
  t: 0,
  beta: 0.005,
  pDom: 0,
  wDom: 0.01,
  sexual: true,
  silencingOn: true,
};

interface Row {
  arm: string;
  seed: number;
  r0: number;
  peakCopiesPerGenome: number;
  peakGeneration: number;
  finalCopiesPerGenome: number;
  extinct: number;
  timeToInactivation: number | "NA";
  phaseFailure: string;
  meanRateAtPeak: number;
  meanRateEnd: number;
}

const rows: Row[] = [];
const started = Date.now();

for (const seed of SEEDS) {
  // Independent of the world RNG, and identical in both arms at a given seed.
  const r0 = BASE.r0 * Math.exp(makeRng(seed * 7919).normal() * SIGMA_J);

  for (const arm of ["per-copy", "family-level"] as const) {
    const sigmaR = arm === "per-copy" ? SIGMA_R_PER_COPY : 0;

    const world = createWorld(defaultParams({ ...BASE, r0, sigmaR, seed }));
    const h = history(world, GENERATIONS);
    const final = observe(world);
    const detected = detectPhasesDetailed(h);

    // Outcome 1: the invasion's amplitude, defined whether or not it later dies.
    let peakGeneration = 0;
    for (let i = 1; i < h.length; i++) {
      if (h[i]!.totalCopies > h[peakGeneration]!.totalCopies) peakGeneration = i;
    }
    const peak = h[peakGeneration]!;

    rows.push({
      arm,
      seed,
      r0,
      peakCopiesPerGenome: peak.totalCopies / BASE.N,
      peakGeneration,
      finalCopiesPerGenome: final.totalCopies / BASE.N,
      extinct: final.totalCopies === 0 ? 1 : 0,
      timeToInactivation: detected.phases ? detected.phases.inactivation : "NA",
      phaseFailure: detected.failure ?? "none",
      meanRateAtPeak: peak.meanRate,
      meanRateEnd: final.meanRate,
    });
  }
}

const header = [
  "arm",
  "seed",
  "r0",
  "peak_copies_per_genome",
  "peak_generation",
  "final_copies_per_genome",
  "extinct",
  "time_to_inactivation",
  "phase_failure",
  "mean_rate_at_peak",
  "mean_rate_end",
].join(",");
const body = rows
  .map((r) =>
    [
      r.arm,
      r.seed,
      r.r0,
      r.peakCopiesPerGenome,
      r.peakGeneration,
      r.finalCopiesPerGenome,
      r.extinct,
      r.timeToInactivation,
      r.phaseFailure,
      r.meanRateAtPeak,
      r.meanRateEnd,
    ].join(","),
  )
  .join("\n");
writeFileSync(
  "experiments/001-per-copy-vs-family-rate.csv",
  `${header}\n${body}\n`,
);
console.log(
  `wrote ${rows.length} rows in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);

/**
 * MANIPULATION CHECK — pre-registered, and the experiment is void if it fails.
 *
 * Without it, a bug that silently gave both arms the same sigmaR would produce a
 * clean null and read as an answer. Tolerances come from the registration's
 * 2026-09-03 deviation note: `meanRate` is a sum divided by a count, so the
 * sigmaR = 0 arm is exact only up to summation error (guard 5 measures 1.54e-14
 * over 9361 copies). Bit-exactness of individual copies under sigmaR = 0 is
 * guard 5 test B's job, not this file's.
 *
 * The peak-generation condition is the positive control: at generation 0 every
 * copy carries r0 in BOTH arms by construction, so a run peaking there would
 * satisfy the family-level half of the check vacuously.
 */
const violations: string[] = [];
for (const r of rows) {
  const delta = Math.abs(r.meanRateAtPeak - r.r0);
  if (r.peakGeneration < 1) {
    violations.push(`${r.arm} seed ${r.seed}: peak at generation 0`);
  } else if (r.arm === "family-level" && delta > 1e-12) {
    violations.push(
      `family-level seed ${r.seed}: mean rate at peak deviates from r0 by ${delta}`,
    );
  } else if (r.arm === "per-copy" && delta <= 1e-6) {
    violations.push(
      `per-copy seed ${r.seed}: mean rate at peak is r0 to within ${delta} — the variation generator did not run`,
    );
  }
}
if (violations.length > 0) {
  console.error(
    `MANIPULATION CHECK FAILED (${violations.length} of ${rows.length} runs):`,
  );
  for (const v of violations.slice(0, 10)) console.error(`  ${v}`);
  throw new Error(
    "manipulation check failed — the arms are not what the registration says they are; the CSV is written but VOID",
  );
}
console.log(`manipulation check PASSED on all ${rows.length} runs`);
