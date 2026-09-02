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
 * across the whole domain even where `Math.exp` of it would underflow to 0.
 * The expression is exactly the one `fitness` exponentiates, not restructured.
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
 * should use `logFitness` or `relativeFitness` instead, where the ordering
 * survives.
 */
export function fitness(genome: Genome, p: Params): number {
  return Math.exp(logFitness(genome, p));
}

/**
 * Fitness of every genome in a population, relative to the fittest genome in
 * it (which always maps to exactly 1). Computed via the standard max-shift:
 * subtract the largest log-fitness before exponentiating, so the result is
 * mathematically identical to `fitness(g,p) / max(fitness(...))` but cannot
 * underflow a whole population to all-zero the way naive `fitness` can.
 *
 * That failure is not hypothetical: Task 10's Guard 5 runs with
 * `a: 0.002, b: 0.0002, S: 2000, silencingOn: false, r0: 0.1` for 300
 * generations specifically to drive unchecked copy-number bloat, and
 * underflows naive `fitness` to exactly 0 for every genome at n >= 1925
 * (96% of saturation) — its second arm (`a: 0.02, b: 0.002`) underflows at
 * n >= 606. Guard 1's `S: 4000`, `silencingOn: false` arm hits the same
 * failure. A fitness-proportional sampler built on naive `fitness` in that
 * regime sees `total = 0`, `target = 0`, every `target < cumulative[i]` is
 * `0 < 0` = false, and silently always returns the last genome — the
 * population collapses to clones with no error. `relativeFitness` is the
 * fix that makes that failure structurally impossible rather than a
 * convention callers must remember to follow.
 *
 * Returns `[]` for an empty population — there is no fittest genome to be
 * relative to, and an empty result composes safely with a sum-then-sample
 * caller (an empty weights array can't be drawn from either).
 */
export function relativeFitness(genomes: Genome[], p: Params): number[] {
  if (genomes.length === 0) return [];
  const logs = genomes.map((g) => logFitness(g, p));
  const max = logs.reduce((m, x) => (x > m ? x : m), -Infinity);
  return logs.map((x) => Math.exp(x - max));
}
