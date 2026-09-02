import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
import { fitness } from "../sim/phases/select.js";
import { reproduce } from "../sim/phases/reproduce.js";

describe("reproduce", () => {
  it("holds the population at N", () => {
    const w = createWorld(defaultParams({ N: 120 }));
    reproduce(w);
    expect(w.genomes).toHaveLength(120);
  });

  it("passes the mother's repertoire to offspring — maternal deposition", () => {
    const p = defaultParams({ N: 40, sexual: false });
    const w = createWorld(p);
    for (const g of w.genomes) g.repertoire = [2.5];
    reproduce(w);
    expect(w.genomes.every((g) => g.repertoire.includes(2.5))).toBe(true);
  });

  it("clones under asexual reproduction — offspring sites match some parent", () => {
    const p = defaultParams({ N: 30, sexual: false, S: 500 });
    const w = createWorld(p);
    const parentSignatures = new Set(
      w.genomes.map((g) => g.copies.map((c) => c.site).join(",")),
    );
    reproduce(w);
    for (const g of w.genomes) {
      expect(parentSignatures.has(g.copies.map((c) => c.site).join(","))).toBe(
        true,
      );
    }
  });

  it("recombines under sexual reproduction — produces novel site combinations", () => {
    const p = defaultParams({ N: 200, sexual: true, S: 500, seed: 21 });
    const w = createWorld(p);
    w.genomes.forEach((g, i) => {
      g.copies = [
        { id: i * 2, site: 100 + i, r: 0.1, s: 0, domesticated: false },
        { id: i * 2 + 1, site: 300 + i, r: 0.1, s: 0, domesticated: false },
      ];
    });
    const before = new Set(
      w.genomes.map((g) => g.copies.map((c) => c.site).join(",")),
    );
    reproduce(w);
    const novel = w.genomes.filter(
      (g) => !before.has(g.copies.map((c) => c.site).join(",")),
    );
    expect(novel.length).toBeGreaterThan(0);
  });

  it("favours fitter genomes — low-copy genomes come to dominate", () => {
    const p = defaultParams({
      N: 200,
      sexual: false,
      S: 2000,
      a: 0.05,
      b: 0.001,
      seed: 8,
    });
    const w = createWorld(p);
    w.genomes.forEach((g, i) => {
      const n = i < 100 ? 1 : 40;
      g.copies = Array.from({ length: n }, (_, k) => ({
        id: i * 100 + k,
        site: k + 10,
        r: 0.1,
        s: 0,
        domesticated: false,
      }));
    });
    for (let i = 0; i < 5; i++) reproduce(w);
    const meanCopies =
      w.genomes.reduce((acc, g) => acc + g.copies.length, 0) / w.genomes.length;
    expect(meanCopies).toBeLessThan(20);
  });

  it("gives offspring fresh copy ids", () => {
    const w = createWorld(defaultParams({ N: 60, sexual: false }));
    reproduce(w);
    const ids = w.genomes.flatMap((g) => g.copies.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is deterministic for a seed", () => {
    const run = () => {
      const w = createWorld(defaultParams({ N: 50, seed: 404 }));
      reproduce(w);
      return JSON.stringify(w.genomes);
    };
    expect(run()).toBe(run());
  });

  // Additive test beyond the brief's suite (see task-8-brief.md deviation):
  // pins the relativeFitness-based sampler against the exact-zero-fitness
  // collapse that naive `fitness`-based weighting hits. Params and n=2000
  // are the same combination tests/select.test.ts already proves underflows
  // fitness() to exactly 0 (load = a*n + b*n*n = 0.001*2000 + 0.0005*2000^2
  // = 2002, exp(-2002) is below the ~1e-308 double-precision floor).
  it("does not collapse to a single lineage when every genome underflows naive fitness to 0", () => {
    const p = defaultParams({
      N: 50,
      sexual: false,
      S: 4000,
      a: 0.001,
      b: 0.0005,
      seed: 3,
    });
    const w = createWorld(p);
    w.genomes.forEach((g, i) => {
      g.copies = Array.from({ length: 2000 }, (_, k) => ({
        id: i * 2000 + k,
        site: k,
        r: 0.1,
        s: 0,
        domesticated: false,
      }));
    });
    // Confirm the premise: naive fitness really is exactly 0 for every genome.
    expect(w.genomes.every((g) => fitness(g, p) === 0)).toBe(true);

    reproduce(w);

    // A collapse to a single lineage means every offspring cloned the same
    // parent, so every offspring's copy count would be identical (it is,
    // trivially, here) AND the parent index would be constant across draws.
    // We can observe that indirectly: tag each parent with a distinct site
    // range isn't preserved through cloning identity, so instead check that
    // offspring are not all bitwise-identical in their (site) signature to
    // one single genome — with 50 distinct parents at 2000 sites [0..1999]
    // each, a collapse produces 50 offspring all cloned from ONE parent,
    // which is indistinguishable by site signature alone since all parents
    // share the same site set. So tag identity via copy `id` ranges instead:
    // each parent i owns ids [i*2000, i*2000+2000), untouched by cloning
    // structure since cloneCopy assigns fresh ids — but the mother's
    // ORIGINAL id range determines the offspring's id-modulo structure only
    // indirectly. Simplest robust signal: under collapse, sampleParent always
    // returns cumulative.length - 1 for every draw, so every offspring is a
    // clone of world.genomes[49] specifically. Give parent 49 a distinguishing
    // marker (a single extra copy at a unique site) and confirm not every
    // offspring carries it.
    const marker = 99999;
    const w2 = createWorld(p);
    w2.genomes.forEach((g, i) => {
      g.copies = Array.from({ length: 2000 }, (_, k) => ({
        id: i * 2000 + k,
        site: k,
        r: 0.1,
        s: 0,
        domesticated: false,
      }));
    });
    w2.genomes[w2.genomes.length - 1]!.copies.push({
      id: -1,
      site: marker,
      r: 0.1,
      s: 0,
      domesticated: false,
    });
    reproduce(w2);
    const allCarryMarker = w2.genomes.every((g) =>
      g.copies.some((c) => c.site === marker),
    );
    expect(allCarryMarker).toBe(false);
  });
});
