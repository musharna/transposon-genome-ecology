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
 */
export function stateHash(world: World): string {
  const parts: string[] = [];
  for (const genome of world.genomes) {
    const sites = genome.copies
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
