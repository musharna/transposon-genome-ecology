import { activeCopies } from "../silencing.js";
import type { Copy, World } from "../state.js";

/**
 * Phase 1. Each active, unsilenced copy transposes with probability r into a
 * uniformly chosen EMPTY site in its own genome. The daughter inherits r and s,
 * each with mutation. This is the variation generator: without per-copy mutation
 * of r there is nothing for selection to act on, and "rate is heritable" is empty.
 */
export function transpose(world: World): void {
  const p = world.params;

  for (const genome of world.genomes) {
    // Snapshot the parents before adding daughters, so a daughter created this
    // generation cannot itself transpose in the same generation.
    const parents = activeCopies(genome, p);
    if (parents.length === 0) continue;

    const occupied = new Set(genome.copies.map((c) => c.site));
    const newborns: Copy[] = [];

    for (const parent of parents) {
      if (world.rng.next() >= parent.r) continue;
      if (occupied.size >= p.S) break;

      // Rejection-sample an empty site. Bounded: we already know one exists.
      let site = 0;
      do {
        site = Math.floor(world.rng.next() * p.S);
      } while (occupied.has(site));
      occupied.add(site);

      const r = Math.min(
        p.rMax,
        Math.max(0, parent.r * Math.exp(world.rng.normal() * p.sigmaR)),
      );
      const s = parent.s + world.rng.normal() * p.sigmaS;
      newborns.push({
        id: world.nextCopyId++,
        site,
        r,
        s,
        domesticated: false,
      });
    }

    if (newborns.length > 0) {
      genome.copies.push(...newborns);
      genome.copies.sort((x, y) => x.site - y.site);
    }
  }
}
