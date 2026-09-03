import { isSilenced, repertoireInsertionIndex } from "../silencing.js";
import { isClusterSite, type World } from "../state.js";

/**
 * Phase 2. A copy occupying a piRNA cluster site is captured: its sequence
 * coordinate enters the genome's repertoire, and everything within theta of it is
 * thereby silenced. The trap is made of the element itself.
 *
 * Gated by the tolerance dial. A genome captures with probability (1 - t): a purely
 * tolerant host never forms a repertoire, and therefore CANNOT BE CONSCRIPTED. This
 * gate is the reason resistance and tolerance are different in kind, not degree.
 *
 * THE INSERT IS SORTED, NOT AN APPEND, and this is the only place the invariant
 * on `Genome.repertoire` (`sim/state.ts`) is established: nothing else in `sim/`
 * ever adds an entry. `splice` shifts O(repertoire) elements, against the
 * O(copies x repertoire) full scan per pass that keeping it sorted removes — and
 * a capture is rare where a lookup is not: at `TOY_DEFAULTS` the repertoire
 * reaches ~660 entries over 11 000 generations, so a genome averages far under
 * one insert per generation while `isSilenced` runs once per copy per pass.
 *
 * IT CONSUMES NO RANDOMNESS AND MOVES NO DRAW. `repertoireInsertionIndex` is a
 * binary search over an array; the `world.rng.next()` gate below is unchanged
 * and still evaluated exactly once for each copy that reaches it, in the same
 * order. What the sorted insert changes is the ORDER OF ONE ARRAY, which
 * `sim/observe.ts`'s `stateHash` digests positionally.
 *
 * ⚠️ AND THE GOLDEN HASH DID NOT MOVE. `docs/ROADMAP.md`, `web/main.ts` and
 * `web/render/field.ts` all predicted that it would; the pinned configuration
 * in `tests/step.test.ts` never reaches a second repertoire entry, so it cannot
 * see this change at all. A second pin, at a multi-entry configuration, was
 * added there for it.
 */
export function trap(world: World): void {
  const p = world.params;
  if (!p.silencingOn) return;

  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      if (!isClusterSite(copy.site, p)) continue;
      // Already covered by an existing entry — capturing again would be a no-op.
      if (isSilenced(copy, genome, p)) continue;
      if (world.rng.next() >= 1 - p.t) continue;
      const at = repertoireInsertionIndex(genome.repertoire, copy.s);
      genome.repertoire.splice(at, 0, copy.s);
    }
  }
}
