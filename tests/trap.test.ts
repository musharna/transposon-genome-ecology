import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
import { isSilenced } from "../sim/silencing.js";
import { trap } from "../sim/phases/trap.js";

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
