import { isBeneficialSite, type World } from "../state.js";

/**
 * Phase 3. A copy in a beneficial site may be co-opted by the host: it stops
 * transposing, becomes exempt from silencing and excision, and pays the genome a
 * fitness bonus. This is domestication — the alternate win. It never reverts.
 */
export function domesticate(world: World): void {
  const p = world.params;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      if (!isBeneficialSite(copy.site, p)) continue;
      if (world.rng.next() >= p.pDom) continue;
      copy.domesticated = true;
    }
  }
}

/** Phase 4. Excision. Domesticated copies are structural and are not lost. */
export function lose(world: World): void {
  const p = world.params;
  for (const genome of world.genomes) {
    genome.copies = genome.copies.filter(
      (c) => c.domesticated || world.rng.next() >= p.v,
    );
  }
}
