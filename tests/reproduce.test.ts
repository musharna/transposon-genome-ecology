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

    // Under the naive-fitness bug, `sampleParent` falls through to
    // `cumulative.length - 1` on every draw, so every offspring clones the
    // LAST genome specifically. Tag it with a marker copy and confirm not
    // every offspring carries it.
    const marker = 99999;
    w.genomes[w.genomes.length - 1]!.copies.push({
      id: -1,
      site: marker,
      r: 0.1,
      s: 0,
      domesticated: false,
    });

    reproduce(w);

    const allCarryMarker = w.genomes.every((g) =>
      g.copies.some((c) => c.site === marker),
    );
    expect(allCarryMarker).toBe(false);
  });

  // Additive test: reproduce.test.ts:14-15's maternal-deposition test uses
  // sexual: false (no father exists) and gives every genome the SAME
  // repertoire content, so it cannot tell "took the mother's" apart from
  // "took a shared/aliased array" or "took the father's" — this test pins
  // the array-independence half of that gap. A single parent is forced by
  // constructing the world at N: 1 (so relativeFitness/sampleParent has
  // exactly one candidate and always returns it, deterministically — no
  // reliance on RNG luck), then reusing that one-genome world to draw many
  // more offspring than parents by raising params.N afterward.
  it("gives every offspring its own repertoire array — not shared with the mother or with siblings", () => {
    const p = defaultParams({ N: 1, sexual: false });
    const w = createWorld(p);
    const mother = w.genomes[0]!;
    mother.repertoire = [7];
    p.N = 40; // draw many offspring from the one available parent

    reproduce(w);

    expect(w.genomes).toHaveLength(40);
    for (const child of w.genomes) {
      expect(child.repertoire).toEqual([7]);
      expect(child.repertoire).not.toBe(mother.repertoire);
    }

    const sentinel = 12345;
    w.genomes[0]!.repertoire.push(sentinel);
    expect(mother.repertoire).not.toContain(sentinel);
    for (let i = 1; i < w.genomes.length; i++) {
      expect(w.genomes[i]!.repertoire).not.toContain(sentinel);
    }
  });

  // Additive test: pins maternal-not-paternal, and maternal-not-merged,
  // repertoire inheritance under sexual reproduction specifically — the gap
  // reproduce.test.ts:14-15 cannot close (it runs sexual: false, so there is
  // no father to confuse with the mother). Forces the population to exactly
  // two genomes with equal fitness (both n=0 copies) and distinct,
  // disjoint repertoires, so `sampleParent`'s cumulative array is [1,2] and
  // its `target < cumulative[i]` scan reduces to: index 0 if u < 0.5, else
  // index 1. Zero copies on both genomes means reproduce() consumes exactly
  // two rng draws per offspring (mother, then father) with no per-copy
  // coin-flip draws to skip past, so a twin world seeded identically (same
  // technique as tests/lifecycle.test.ts's "consumes exactly one rng draw
  // per..." test) reproduces the exact same draw sequence and lets us know,
  // for every offspring, which index reproduce() actually drew as mother —
  // ground truth independent of reproduce()'s internals.
  it("inherits specifically the mother's repertoire, not the father's or a merge — sexual", () => {
    const p = defaultParams({ N: 2, sexual: true, seed: 55 });
    const w = createWorld(p);
    const shadow = createWorld(p);
    w.genomes[0]!.repertoire = [100];
    w.genomes[1]!.repertoire = [200];
    w.genomes[0]!.copies = [];
    w.genomes[1]!.copies = [];
    p.N = 30; // draw many offspring from the 2-genome pool

    const expectedMotherIdx: number[] = [];
    for (let i = 0; i < p.N; i++) {
      const motherU = shadow.rng.next();
      expectedMotherIdx.push(motherU < 0.5 ? 0 : 1);
      shadow.rng.next(); // father draw, consumed to stay in lockstep
    }

    reproduce(w);

    expect(w.genomes).toHaveLength(p.N);
    for (let i = 0; i < p.N; i++) {
      const expected = expectedMotherIdx[i] === 0 ? [100] : [200];
      expect(w.genomes[i]!.repertoire).toEqual(expected);
    }
  });

  // Additive test: reproduce.test.ts:81's fresh-ids test runs sexual: false,
  // so a reference-sharing bug confined to the sexual branch (pushing the
  // parent's own Copy object instead of a fresh cloneCopy(c)) is caught by
  // nothing. Under sexual reproduction with N=60 offspring drawn from a
  // 60-genome pool of equal fitness, the same parent is virtually certain
  // to be drawn as mother (or father) for more than one offspring (birthday
  // effect); if that parent's ORIGINAL Copy objects were pushed instead of
  // clones, the same `id` would appear in more than one offspring's copies,
  // and the uniqueness check below would fail.
  it("gives offspring fresh copy ids under sexual reproduction too", () => {
    const w = createWorld(defaultParams({ N: 60, sexual: true }));
    reproduce(w);
    const ids = w.genomes.flatMap((g) => g.copies.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Additive test: no existing test checks the documented invariant
  // (sim/state.ts: "Kept sorted by site") holds for reproduce()'s output.
  // The precedent is tests/lifecycle.test.ts's "keeps surviving copies
  // sorted by site" test, written for a strictly weaker gap (a single
  // parent's own list can only ever be reordered, not interleaved). Here
  // each genome carries three copies spread across three site ranges so
  // that, under sexual recombination, a mother's and a father's contributed
  // subsets — pushed as [mother's picks][father's picks], each internally
  // increasing but not merged in order — very likely interleave out of
  // order before the final sort. Checked for BOTH branches.
  it("keeps offspring copies sorted by site — asexual and sexual", () => {
    for (const sexual of [false, true]) {
      const w = createWorld(defaultParams({ N: 40, sexual, S: 500, seed: 12 }));
      w.genomes.forEach((g, i) => {
        g.copies = [
          { id: i * 3, site: 5 + i, r: 0.1, s: 0, domesticated: false },
          { id: i * 3 + 1, site: 205 + i, r: 0.1, s: 0, domesticated: false },
          { id: i * 3 + 2, site: 405 + i, r: 0.1, s: 0, domesticated: false },
        ];
      });
      reproduce(w);
      for (const g of w.genomes) {
        const sites = g.copies.map((c) => c.site);
        expect(sites).toEqual([...sites].sort((a, b) => a - b));
      }
    }
  });
});
