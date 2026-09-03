import type { Params } from "../params.js";
import { activeCopies, silencedCopies } from "../silencing.js";
import type { Genome } from "../state.js";

/**
 * Fitness cost of carrying n transposable-element copies, under synergistic
 * epistasis.
 *
 * `ln w_n = -(a·n + b·n²)`, so `w_n = exp(-(a·n + b·n²))`.
 *
 * CONFIRMED against Charlesworth, B. & Charlesworth, D. (1983), "The population
 * dynamics of transposable elements", Genet. Res. 42(1):1-27,
 * doi:10.1017/S0016672300021455, read from the OA PDF. The reading, with page
 * and equation numbers, is `docs/charlesworth-1983-equilibrium.md`.
 *
 * This is NOT the paper's own form. Theirs is `w_n = 1 - s·n^t` (eq. 23, p. 13).
 * Ours is a different functional family — exponential-of-polynomial rather than
 * one-minus-power — so it was checked against the paper's CONDITIONS rather than
 * pattern-matched to its formula, and it satisfies them:
 *
 *   - `∂² ln w_n/∂n² < 0` is necessary for an interior equilibrium (p. 11). Here
 *     `∂² ln w/∂n² = -2b`, so the condition holds IFF `b > 0`. At `b = 0` the
 *     model degenerates to `w = (e^-a)^n`, EXACTLY the independent-effects
 *     multiplicative case p. 12 rules out ("fitness must fall off more steeply
 *     with n than does a multiplicative function `w_n = (1 - s)^n`"). The `b`
 *     term is the entire ballgame.
 *   - `f(0) < u - v` is needed for copy number to rise from zero (p. 11); here
 *     that is `a < r0 - v`.
 *
 * It is also better behaved than eq. (23), which goes negative for large `n` and
 * needs truncation, while `exp(-(a·n + b·n²))` is positive everywhere and
 * strictly decreasing. Keeping our form is the deliberate modelling choice; the
 * form was NOT replaced.
 *
 * WHAT DOES NOT TRANSFER IS THE PAPER'S NUMBER. Eq. (29), p. 16 gives the
 * balance `-∂ ln w_n/∂n ≈ u - v` in the regime `n << T`, which for our form
 * predicts `n̄ = (r - v - a)/(2b)` = 48 at the current defaults. Measured, it is
 * 26.8 — because Charlesworth's model is DIPLOID and ours is haploid:
 * `reproduce.ts` discards a site inherited from both parents, a copy sink the
 * null model has no counterpart for, and a relatedness-dependent one (the same
 * arm equilibrates at 19.2, 26.8 and 31.3 copies per genome at N = 100, 200 and
 * 400). Guard 1 therefore asserts the paper's qualitative predictions and their
 * paper-supplied negative controls, and asserts no equilibrium value at all —
 * see `tests/guards/equilibrium-arm.ts` for the derivation and every measured
 * figure.
 *
 * `a` and `b` themselves remain the values chosen in the reference base. They
 * were NOT recalibrated in Task 15: every other guard in the suite is derived
 * against them and the golden hash in `tests/step.test.ts` pins the RNG stream.
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
 * The regime is reachable in this model's own parameter space, and the exact
 * boundary is checkable: with Guard 5's coefficients `a: 0.002, b: 0.0002`
 * (`tests/guards/rate-evolves.test.ts`, `S: 2000`), naive `fitness` is
 * 5e-324 at n = 1925 and underflows to exactly 0 at n >= 1926 — 96% of
 * saturation; with that guard's STRONG arm (`a: 0.02, b: 0.002`) the boundary
 * is n >= 606, and with `defaultParams`' `a: 0.001, b: 0.0005` it is n >= 1220.
 *
 * NO GUARD IN THE SUITE CURRENTLY REACHES IT, and this comment previously
 * claimed two that do. Both claims were re-measured in Task 15 and are
 * corrected here: Guard 5 runs 60 generations, not 300, and peaks under 9% site
 * occupancy, so its largest naive fitness argument is nowhere near the
 * boundary; and Guard 1 is `S: 2000`, not `S: 4000`, with a largest copy number
 * of 300 per genome at its seeded from-above start, where naive `fitness` is
 * 2.1e-20 — small, but 300 orders of magnitude above underflow. The boundary
 * figures above are arithmetic on `Math.exp`, not run measurements, and they do
 * not depend on any guard reaching them. That is the point: `relativeFitness`
 * makes this failure structurally impossible instead of leaving it as a regime
 * every future caller has to remember to stay out of.
 *
 * A fitness-proportional sampler built on naive `fitness` in that
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
