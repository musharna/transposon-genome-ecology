import type { Params } from "../params.js";
import { activeCopies, silencedCopies } from "../silencing.js";
import type { Genome } from "../state.js";

/**
 * Fitness cost of carrying n transposable-element copies, under synergistic
 * epistasis.
 *
 * ⚠️ PROVISIONAL. This form and its coefficients have NOT been read out of
 * Charlesworth & Charlesworth 1983 — the reference base was built from abstracts
 * and registry metadata. Task 15 confirms or replaces both. Guard 1 (the
 * equilibrium check) cannot be calibrated until it does. Everything else in the
 * model is independent of this choice, which is why it lives alone in one function.
 */
export function copyNumberLoad(n: number, p: Params): number {
  return p.a * n + p.b * n * n;
}

/**
 * The damage term, and the only place the host's two strategies differ numerically.
 *
 * Resistance (t = 0) pays per SILENCED copy — Hollister & Gaut's cost of silencing
 * a TE also suppressing its neighbours. Tolerance (t = 1) pays per ACTIVE copy
 * instead, absorbing the damage rather than suppressing the element. The two costs
 * scale with different quantities, so they are different shapes, not one knob.
 */
export function damageLoad(
  nActive: number,
  nSilenced: number,
  p: Params,
): number {
  const resistance = p.d * nSilenced;
  const tolerance = p.dTol * nActive;
  return (1 - p.t) * resistance + p.t * tolerance;
}

/**
 * Log-fitness: the exponent that `fitness` exponentiates. Selection only ever
 * needs RELATIVE fitness, and this stays finite (modulo IEEE-754 double range)
 * across the whole domain even where `Math.exp` of it would underflow to 0 —
 * so anything that must compare or rank genomes by copy-number load (Task 8's
 * sampler among them) should prefer this over `fitness` once absolute values
 * are no longer needed. The expression is exactly the one `fitness` exponentiates,
 * not restructured.
 */
export function logFitness(genome: Genome, p: Params): number {
  const active = activeCopies(genome, p);
  const silenced = silencedCopies(genome, p);
  const nDom = genome.copies.reduce(
    (acc, c) => acc + (c.domesticated ? 1 : 0),
    0,
  );
  const n = active.length + silenced.length;

  const load =
    copyNumberLoad(n, p) + damageLoad(active.length, silenced.length, p);
  return -load + p.wDom * nDom;
}

/**
 * Multiplicative fitness in (0, ∞) in exact arithmetic. Never zero
 * mathematically, so selection never divides by zero — but in IEEE-754
 * double precision, `Math.exp` of a sufficiently negative `logFitness`
 * underflows to exactly 0 (below roughly -745.13). Callers that need to rank
 * or compare genomes at copy numbers large enough to risk that boundary
 * should use `logFitness` instead, where the ordering survives.
 */
export function fitness(genome: Genome, p: Params): number {
  return Math.exp(logFitness(genome, p));
}
