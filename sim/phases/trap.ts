import { isSilenced } from "../silencing.js";
import { isClusterSite, type World } from "../state.js";

/**
 * Phase 2. A copy occupying a piRNA cluster site is captured: its sequence
 * coordinate enters the genome's repertoire, and everything within theta of it is
 * thereby silenced. The trap is made of the element itself.
 *
 * Gated by the tolerance dial. A genome captures with probability (1 - t): a purely
 * tolerant host never forms a repertoire, and therefore CANNOT BE CONSCRIPTED. This
 * gate is the reason resistance and tolerance are different in kind, not degree.
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
      genome.repertoire.push(copy.s);
    }
  }
}
