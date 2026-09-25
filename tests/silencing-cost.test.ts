import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld, type Genome } from "../sim/state.js";
import { step } from "../sim/step.js";
import { isSilenced } from "../sim/silencing.js";
import { nearestSignedDistance } from "../web/render/field.js";
import { TOY_DEFAULTS } from "../web/params.js";

/**
 * THE COST OF ONE LOOKUP, COUNTED — NOT TIMED.
 *
 * Until 2026-09-03 `isSilenced` scanned the whole repertoire, and since
 * nothing ever removes an entry the toy got slower the longer it ran (see
 * `web/main.ts`). `tests/silencing.test.ts` proves the binary search gives the
 * same ANSWER as that scan, which a scan also passes. The only guard on its
 * COST was `tests/layout.test.ts`'s flooded-frame ceiling of 20 000 ms, and a
 * return to the scan passes that too: the regression was 1 ms -> 36 ms.
 *
 * So these tests count what a lookup does: every repertoire entry it reads,
 * through a Proxy, with no change to the code under test. A binary search over
 * n entries reads at most ceil(log2(n + 1)) of them, plus the two neighbours of
 * the insertion point. A scan reads up to n. The bound depends only on n, not
 * on the simulation's dynamics, so a legitimate change to `trap` or `step`
 * cannot move it; only a change to how a lookup searches can.
 */
function counted(entries: number[]): { view: number[]; reads: () => number } {
  let reads = 0;
  const view = new Proxy(entries, {
    get(target, key, receiver) {
      if (typeof key === "string" && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, receiver);
    },
  });
  return { view, reads: () => reads };
}

const readCeiling = (n: number): number => Math.ceil(Math.log2(n + 1)) + 2;

/** Real genomes at the toy's own parameters, run far enough for long repertoires. */
function realGenomes(): Genome[] {
  const p = defaultParams(TOY_DEFAULTS);
  const world = createWorld(p);
  const seen: Genome[] = [];
  let generation = 0;
  for (const mark of [100, 800, 2500]) {
    while (generation < mark) {
      step(world);
      generation++;
    }
    // Snapshot: later steps append to these repertoires in place.
    for (const g of world.genomes) {
      seen.push({ ...g, copies: g.copies.slice(), repertoire: g.repertoire.slice() });
    }
  }
  return seen;
}

describe("the cost of one repertoire lookup is logarithmic, counted in entries read", () => {
  const p = defaultParams(TOY_DEFAULTS);
  const genomes = realGenomes();

  it("isSilenced reads at most ceil(log2(n + 1)) + 2 entries, on every copy of every real genome", () => {
    let lookups = 0;
    let longLookups = 0;
    let mostRead = 0;
    for (const genome of genomes) {
      const n = genome.repertoire.length;
      for (const c of genome.copies) {
        if (c.domesticated) continue;
        const { view, reads } = counted(genome.repertoire);
        isSilenced(c, { ...genome, repertoire: view }, p);
        expect(
          reads(),
          `copy ${c.id} read ${reads()} of ${n} repertoire entries (ceiling ${readCeiling(n)})`,
        ).toBeLessThanOrEqual(readCeiling(n));
        lookups++;
        if (n >= 100) longLookups++;
        mostRead = Math.max(mostRead, reads());
      }
    }
    // POSITIVE CONTROLS. The bound only separates a search from a scan when n
    // is large (at n = 100 it is 9 against up to 100), so long repertoires must
    // actually occur, and the Proxy must actually be seeing reads.
    expect(lookups).toBeGreaterThan(3000);
    expect(longLookups).toBeGreaterThan(500);
    expect(mostRead).toBeGreaterThan(2);
  });

  it("nearestSignedDistance (the render field's copy of the search) obeys the same ceiling", () => {
    let longLookups = 0;
    for (const genome of genomes) {
      const sorted = genome.repertoire;
      const n = sorted.length;
      if (n === 0) continue;
      for (const c of genome.copies) {
        const { view, reads } = counted(sorted);
        nearestSignedDistance(c.s, view);
        expect(
          reads(),
          `s=${c.s} read ${reads()} of ${n} entries (ceiling ${readCeiling(n)})`,
        ).toBeLessThanOrEqual(readCeiling(n));
        if (n >= 100) longLookups++;
      }
    }
    expect(longLookups).toBeGreaterThan(500);
  });
});
