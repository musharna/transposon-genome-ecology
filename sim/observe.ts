import { activeCopies, silencedCopies } from "./silencing.js";
import type { World } from "./state.js";
import { step } from "./step.js";

export interface Snapshot {
  generation: number;
  totalCopies: number;
  activeCopies: number;
  silencedCopies: number;
  domesticatedCopies: number;
  /** Mean transposition rate across every live copy. Zero if there are none. */
  meanRate: number;
  fractionWithRepertoire: number;
}

export function observe(world: World): Snapshot {
  const p = world.params;
  let total = 0;
  let active = 0;
  let silenced = 0;
  let domesticated = 0;
  let rateSum = 0;
  let withRepertoire = 0;

  for (const genome of world.genomes) {
    total += genome.copies.length;
    active += activeCopies(genome, p).length;
    silenced += silencedCopies(genome, p).length;
    for (const c of genome.copies) {
      rateSum += c.r;
      if (c.domesticated) domesticated++;
    }
    if (genome.repertoire.length > 0) withRepertoire++;
  }

  return {
    generation: world.generation,
    totalCopies: total,
    activeCopies: active,
    silencedCopies: silenced,
    domesticatedCopies: domesticated,
    meanRate: total === 0 ? 0 : rateSum / total,
    fractionWithRepertoire:
      world.genomes.length === 0 ? 0 : withRepertoire / world.genomes.length,
  };
}

/** Snapshot at generation 0, then after each of `generations` steps. */
export function history(world: World, generations: number): Snapshot[] {
  const out: Snapshot[] = [observe(world)];
  for (let i = 0; i < generations; i++) {
    step(world);
    out.push(observe(world));
  }
  return out;
}

/**
 * Structural digest of the world, for cross-environment comparison. Deliberately
 * excludes copy ids, which are allocation-order artefacts rather than state.
 *
 * `toFixed(9)` is a deliberate tolerance, not incidental precision loss: two
 * `r` or `s` values differing by less than 5e-10 hash identically. Task 19's
 * cross-environment (node vs. browser) comparison relies on this.
 *
 * Sorts a COPY of `genome.copies` by `site` before hashing rather than trusting
 * the array's existing order. `Genome.copies` is documented to be kept sorted
 * by every phase that mutates it, and today it is — but this function is the
 * project's determinism oracle, and an oracle should not hold an unchecked
 * assumption about state it did not itself verify: a future phase that pushes
 * to `copies` without re-sorting would otherwise make two structurally
 * identical worlds hash differently, with nothing here to catch it.
 */
export function stateHash(world: World): string {
  const parts: string[] = [];
  for (const genome of world.genomes) {
    const sortedCopies = [...genome.copies].sort((a, b) => a.site - b.site);
    const sites = sortedCopies
      .map(
        (c) =>
          `${c.site}:${c.r.toFixed(9)}:${c.s.toFixed(9)}:${c.domesticated ? 1 : 0}`,
      )
      .join(",");
    const rep = genome.repertoire.map((x) => x.toFixed(9)).join(",");
    parts.push(`${sites}|${rep}`);
  }
  const joined = `${world.generation}#${parts.join(";")}`;

  // FNV-1a, 32-bit. Adequate for equality checking between two runs.
  let h = 0x811c9dc5;
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
