import type { Params } from "./params.js";
import type { Copy, Genome } from "./state.js";

/**
 * A copy is silenced iff its sequence coordinate lies within theta of any entry
 * in its genome's piRNA repertoire. Derived, never stored: a daughter that mutates
 * far enough in s simply stops matching, which is escape by divergence with no
 * escape logic anywhere.
 *
 * Domesticated copies are exempt — they have been co-opted by the host.
 */
export function isSilenced(copy: Copy, genome: Genome, p: Params): boolean {
  if (copy.domesticated) return false;
  for (const entry of genome.repertoire) {
    if (Math.abs(copy.s - entry) <= p.theta) return true;
  }
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
