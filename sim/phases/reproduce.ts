import type { Copy, Genome, World } from "../state.js";
import { relativeFitness } from "./select.js";

/** Fitness-proportionate index draw. Linear scan — N is a few hundred. */
function sampleParent(cumulative: number[], total: number, u: number): number {
  const target = u * total;
  for (let i = 0; i < cumulative.length; i++) {
    if (target < cumulative[i]!) return i;
  }
  return cumulative.length - 1;
}

/**
 * Phase 6. Offspring are drawn fitness-proportionately to restore N.
 *
 * Sexual: two parents, free recombination — each site is inherited independently
 * from one parent or the other. Asexual: a single parent, cloned.
 *
 * In both cases the offspring inherits the MOTHER's piRNA repertoire (parent A),
 * per Kelleher et al. 2012 on maternal piRNA deposition. The defence is heritable
 * on the same footing as the strategy, which is what makes the arms race symmetric.
 *
 * Weights are `relativeFitness`, not naive `fitness`: at copy numbers large
 * enough that `Math.exp(-load)` underflows to exactly 0 in IEEE-754 double
 * precision, naive fitness-proportionate weights sum to 0 for the whole
 * population, and a sum-then-sample draw silently always returns the last
 * genome — see sim/phases/select.ts's `relativeFitness` doc for the exact
 * regime this is reachable in. `relativeFitness` is mathematically
 * proportional to naive fitness wherever naive fitness is representable, so
 * sampling is unchanged there, but its maximum is always exactly 1 and its
 * total can never be 0.
 */
export function reproduce(world: World): void {
  const p = world.params;

  const weights = relativeFitness(world.genomes, p);
  const cumulative: number[] = [];
  let total = 0;
  for (const w of weights) {
    total += w;
    cumulative.push(total);
  }

  const cloneCopy = (c: Copy): Copy => ({
    id: world.nextCopyId++,
    site: c.site,
    r: c.r,
    s: c.s,
    domesticated: c.domesticated,
  });

  const offspring: Genome[] = [];
  for (let i = 0; i < p.N; i++) {
    const motherIdx = sampleParent(cumulative, total, world.rng.next());
    const mother = world.genomes[motherIdx]!;

    let copies: Copy[];
    if (p.sexual) {
      const fatherIdx = sampleParent(cumulative, total, world.rng.next());
      const father = world.genomes[fatherIdx]!;
      copies = [];
      // Free recombination: every site segregates independently.
      for (const c of mother.copies) {
        if (world.rng.next() < 0.5) copies.push(cloneCopy(c));
      }
      for (const c of father.copies) {
        if (world.rng.next() < 0.5) copies.push(cloneCopy(c));
      }
      // A site inherited from both parents would appear twice; keep one.
      const seen = new Set<number>();
      copies = copies.filter((c) =>
        seen.has(c.site) ? false : (seen.add(c.site), true),
      );
      copies.sort((x, y) => x.site - y.site);
    } else {
      copies = mother.copies.map((c) => cloneCopy(c));
    }

    offspring.push({ copies, repertoire: [...mother.repertoire] });
  }

  world.genomes = offspring;
}
