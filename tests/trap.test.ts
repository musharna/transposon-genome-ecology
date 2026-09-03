import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld, type World } from "../sim/state.js";
import { isSilenced } from "../sim/silencing.js";
import { step } from "../sim/step.js";
import { trap } from "../sim/phases/trap.js";
import { TOY_DEFAULTS } from "../web/params.js";

/**
 * Index of the first entry that is smaller than the one before it, or -1 when
 * the array is ascending. Returns the POSITION rather than a boolean so a
 * failure message can say where, and so the positive control below can assert
 * that this function distinguishes the two cases rather than merely returning
 * something.
 */
function firstDescent(xs: number[]): number {
  for (let i = 1; i < xs.length; i++) if (xs[i]! < xs[i - 1]!) return i;
  return -1;
}

describe("trap", () => {
  it("captures the s of a copy sitting in a cluster site", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, t: 0 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [
      { id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false },
    ];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([1.25]);
  });

  it("ignores copies outside cluster sites", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [
      { id: 0, site: 500, r: 0.1, s: 1.25, domesticated: false },
    ];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([]);
  });

  it("silences everything within theta of the captured copy", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, theta: 0.1 });
    const w = createWorld(p);
    const g = w.genomes[0]!;
    g.copies = [
      { id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false },
      { id: 1, site: 500, r: 0.1, s: 1.3, domesticated: false },
      { id: 2, site: 600, r: 0.1, s: 9.0, domesticated: false },
    ];
    trap(w);
    expect(isSilenced(g.copies[1]!, g, p)).toBe(true);
    expect(isSilenced(g.copies[2]!, g, p)).toBe(false);
  });

  it("does not capture the same s twice", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, theta: 0.1 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [
      { id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false },
    ];
    trap(w);
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([1.25]);
  });

  it("captures nothing when silencing is switched off", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, silencingOn: false });
    const w = createWorld(p);
    w.genomes[0]!.copies = [
      { id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false },
    ];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([]);
  });

  it("captures nothing under pure tolerance — a tolerating host builds no clusters", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, t: 1 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [
      { id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false },
    ];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([]);
  });

  it("captures probabilistically at intermediate t", () => {
    const p = defaultParams({ N: 400, S: 1000, c: 0.01, t: 0.5, seed: 3 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false }];
    }
    trap(w);
    const captured = w.genomes.filter((g) => g.repertoire.length > 0).length;
    expect(captured).toBeGreaterThan(120);
    expect(captured).toBeLessThan(280);
  });

  it("does not capture a domesticated copy", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [
      { id: 0, site: 5, r: 0.1, s: 1.25, domesticated: true },
    ];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([]);
  });
});

/* ========================================================================== *
 * THE SORTED INVARIANT.
 *
 * `sim/silencing.ts`'s `isSilenced` binary-searches `genome.repertoire` and
 * tests only two neighbours. That is exact for an ascending array and WRONG for
 * any other, and wrong SILENTLY: a copy whose match sits on the far side of a
 * descent is simply reported active, and no count, colour, guard threshold or
 * picture in this project would look different — the population would just
 * behave as though the trap had missed. `trap` is the only place in `sim/` that
 * ever adds an entry, so this is where the invariant is made, and this is where
 * it is guarded.
 * ========================================================================== */

describe("trap keeps the repertoire sorted ascending", () => {
  it("inserts at the sorted position rather than appending", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, theta: 0.1, t: 0 });
    const w = createWorld(p);
    // Three cluster copies (sites 0..9 at c = 0.01, S = 1000), presented in
    // DESCENDING s and spaced far wider than theta so each is captured rather
    // than skipped as already covered. An append would leave [5, 3, 1].
    w.genomes[0]!.copies = [
      { id: 0, site: 1, r: 0.1, s: 5, domesticated: false },
      { id: 1, site: 2, r: 0.1, s: 3, domesticated: false },
      { id: 2, site: 3, r: 0.1, s: 1, domesticated: false },
    ];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([1, 3, 5]);
  });

  it("holds for every genome across real generations at the toy's own parameters", () => {
    // POSITIVE CONTROL, FIRST: the check below is worth nothing unless it can
    // tell an out-of-order array from an ascending one. `firstDescent` is the
    // whole detector, so it is exercised on both.
    expect(firstDescent([0, 1, 0.5, 2]), "a descent must be located").toBe(2);
    expect(firstDescent([0, 1, 2]), "an ascending array has none").toBe(-1);
    expect(firstDescent([2, 2, 2]), "equal entries are not a descent").toBe(-1);

    const p = defaultParams(TOY_DEFAULTS);
    const world: World = createWorld(p);
    let generation = 0;
    let longest = 0;
    let genomesChecked = 0;

    // Marks span an empty repertoire to ~150 entries per genome. Every mark is
    // AFTER `reproduce`, which is the other place order could be lost: it
    // copies the mother's array wholesale, and a copy that reordered would show
    // up here rather than in `trap`'s own unit tests.
    for (const mark of [1, 50, 400, 1200, 2500]) {
      while (generation < mark) {
        step(world);
        generation++;
      }
      for (let i = 0; i < world.genomes.length; i++) {
        const rep = world.genomes[i]!.repertoire;
        longest = Math.max(longest, rep.length);
        genomesChecked++;
        expect(
          firstDescent(rep),
          `gen ${mark}, genome ${i}: repertoire descends at index ${firstDescent(rep)} of ${rep.length}`,
        ).toBe(-1);
      }
    }

    // FIXTURE CONTROL. An invariant asserted only over empty and one-element
    // arrays is vacuous — a `push` would satisfy it too.
    expect(genomesChecked).toBeGreaterThan(200);
    expect(longest).toBeGreaterThan(100);
  });
});
