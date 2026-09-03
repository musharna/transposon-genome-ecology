import type { Params } from "./params.js";
import type { Copy, Genome } from "./state.js";

/**
 * Index at which `s` belongs in `sorted` to keep it ascending — a textbook
 * `lower_bound`, i.e. the index of the first entry `>= s`, or `sorted.length`
 * when every entry is below it. With duplicates it returns the index of the
 * FIRST equal entry, so an insert at this index never splits a run of equals.
 *
 * This is the one primitive `Genome.repertoire`'s sorted invariant is
 * maintained and read through: `sim/phases/trap.ts` inserts here and
 * `isSilenced` below searches here. Exported (and re-exported from
 * `sim/index.ts`) so a test can drive the boundaries — empty array, everything
 * below, everything above, exact match, duplicates — directly rather than
 * inferring them from `isSilenced`'s boolean.
 *
 * CONSUMES NO RANDOMNESS, and neither does anything else in this file. The
 * number and order of RNG draws is part of reproducible state
 * (`tests/guards/one-implementation.test.ts`), so the acceleration below had to
 * be reachable without one.
 */
export function repertoireInsertionIndex(sorted: number[], s: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! < s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * A copy is silenced iff its sequence coordinate lies within theta of any entry
 * in its genome's piRNA repertoire. Derived, never stored: a daughter that mutates
 * far enough in s simply stops matching, which is escape by divergence with no
 * escape logic anywhere.
 *
 * Domesticated copies are exempt — they have been co-opted by the host.
 *
 * ----------------------------------------------------------------------------
 * TWO NEIGHBOURS, NOT THE WHOLE REPERTOIRE — AND WHY THAT IS EXACT
 * ----------------------------------------------------------------------------
 * This used to scan every entry. `trap` only ever inserts and NOTHING EVER
 * REMOVES AN ENTRY, so the scan cost O(copies x repertoire) per pass over a
 * repertoire that grows for as long as the world runs, and the toy got slower
 * the longer anyone watched it: 0.67 ms/step at generation 200 against
 * 15.97 ms/step at 6000, a 24x slowdown while copy number rose 1.6x
 * (`web/main.ts` has the repertoire-size table that number comes from).
 *
 * `Genome.repertoire` is now kept SORTED ASCENDING (`sim/state.ts`), so the
 * nearest entry to `s` can be found by binary search. The argument that
 * checking the insertion point's two neighbours is EXHAUSTIVE:
 *
 *   - if any entry lies within theta of `s`, the entry NEAREST to `s` does;
 *   - in an ascending array the nearest entry to `s` is either the first entry
 *     `>= s` (index `i`) or the last entry `< s` (index `i - 1`), because
 *     `s - entry` is non-increasing in `entry` — and IEEE-754 subtraction is
 *     monotone in its operands, so that stays true of the computed differences,
 *     not merely of the exact ones. `fl(s - e)` is `<= 0` for every `e >= s`
 *     and `> 0` for every `e < s` (a subtraction of two distinct doubles never
 *     rounds to zero), so the sign change happens exactly at `i` and the
 *     minimum of `|fl(s - e)|` is at one of those two indices.
 *
 * So it is exact for ANY sorted array of any contents — no assumption about
 * spacing, no assumption that entries are distinct, and nothing a future change
 * to `trap` could do can break it short of breaking the sort itself. The
 * comparison is `<=` theta, matching the boundary the old scan used, and it is
 * the same `Math.abs(copy.s - entry)` expression, so agreement is exact rather
 * than within a tolerance.
 *
 * THE SORTED INVARIANT IS THE WHOLE RISK. An entry appended out of order makes
 * this return the wrong answer SILENTLY, on a predicate no picture can check.
 * `tests/trap.test.ts` asserts the invariant over real generations, and sees
 * itself fail against an out-of-order append.
 *
 * The identical argument, independently derived, already carries
 * `web/render/field.ts`'s `nearestSignedDistance`; the two are separate
 * implementations on purpose and `tests/render-field.test.ts` (a2) holds them
 * to each other.
 */
export function isSilenced(copy: Copy, genome: Genome, p: Params): boolean {
  if (copy.domesticated) return false;
  const rep = genome.repertoire;
  const i = repertoireInsertionIndex(rep, copy.s);
  if (i < rep.length && Math.abs(copy.s - rep[i]!) <= p.theta) return true;
  if (i > 0 && Math.abs(copy.s - rep[i - 1]!) <= p.theta) return true;
  return false;
}

/** Copies that can still transpose: not silenced, not domesticated. */
export function activeCopies(genome: Genome, p: Params): Copy[] {
  return genome.copies.filter(
    (c) => !c.domesticated && !isSilenced(c, genome, p),
  );
}

/** Copies suppressed by the genome's own piRNAs. Excludes domesticated copies. */
export function silencedCopies(genome: Genome, p: Params): Copy[] {
  return genome.copies.filter(
    (c) => !c.domesticated && isSilenced(c, genome, p),
  );
}
