import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
import { transpose } from "../sim/phases/transpose.js";

describe("transpose", () => {
  it("adds no copies when r is zero", () => {
    const w = createWorld(defaultParams({ N: 50, r0: 0 }));
    transpose(w);
    expect(w.genomes.every((g) => g.copies.length === 1)).toBe(true);
  });

  it("adds copies when r is one", () => {
    const w = createWorld(defaultParams({ N: 50, r0: 1 }));
    transpose(w);
    expect(w.genomes.every((g) => g.copies.length === 2)).toBe(true);
  });

  it("gives daughters unique ids", () => {
    const w = createWorld(defaultParams({ N: 30, r0: 1 }));
    transpose(w);
    const ids = w.genomes.flatMap((g) => g.copies.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mutates the daughter's r away from the parent's", () => {
    const w = createWorld(
      defaultParams({ N: 200, r0: 1, sigmaR: 0.2, rMax: 10 }),
    );
    transpose(w);
    const daughters = w.genomes.map((g) => g.copies[1]!);
    expect(daughters.some((c) => c.r !== 1)).toBe(true);
  });

  it("clips r to [0, rMax]", () => {
    const w = createWorld(
      defaultParams({ N: 200, r0: 1, sigmaR: 3, rMax: 1.5 }),
    );
    transpose(w);
    for (const g of w.genomes) {
      for (const c of g.copies) {
        expect(c.r).toBeGreaterThanOrEqual(0);
        expect(c.r).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it("mutates the daughter's s away from the parent's", () => {
    const w = createWorld(defaultParams({ N: 200, r0: 1, sigmaS: 0.1 }));
    transpose(w);
    const daughters = w.genomes.map((g) => g.copies[1]!);
    expect(daughters.some((c) => c.s !== 0)).toBe(true);
  });

  it("never places two copies at the same site in one genome", () => {
    const w = createWorld(
      defaultParams({ N: 20, S: 50, r0: 1, c: 0, beta: 0 }),
    );
    for (let i = 0; i < 5; i++) transpose(w);
    for (const g of w.genomes) {
      const sites = g.copies.map((c) => c.site);
      expect(new Set(sites).size).toBe(sites.length);
    }
  });

  it("does not exceed S copies in a genome", () => {
    const w = createWorld(defaultParams({ N: 5, S: 8, r0: 1, c: 0, beta: 0 }));
    for (let i = 0; i < 20; i++) transpose(w);
    expect(w.genomes.every((g) => g.copies.length <= 8)).toBe(true);
  });

  it("does not transpose silenced copies", () => {
    const w = createWorld(defaultParams({ N: 10, r0: 1, theta: 0.1 }));
    for (const g of w.genomes) g.repertoire = [0];
    transpose(w);
    expect(w.genomes.every((g) => g.copies.length === 1)).toBe(true);
  });

  it("is deterministic for a seed", () => {
    const run = () => {
      const w = createWorld(defaultParams({ N: 40, r0: 0.5, seed: 77 }));
      transpose(w);
      return JSON.stringify(w.genomes);
    };
    expect(run()).toBe(run());
  });

  // Additive: the two "mutates away from parent" tests above locate the daughter
  // by array index after a site-sort, which is not guaranteed to be the daughter.
  // A bug that mutates the parent's r/s in place (instead of the daughter's) can
  // still satisfy those assertions, because *some* copy in the pair now differs
  // from the founding value — it just isn't necessarily the newly created one.
  // This test pins the founding copy by its stable id (assigned once, before
  // transpose ever runs) and asserts it is untouched.
  it("does not mutate the parent's r or s in place", () => {
    const w = createWorld(
      defaultParams({ N: 100, r0: 1, sigmaR: 0.3, sigmaS: 0.1, rMax: 10 }),
    );
    const founderIds = new Map(w.genomes.map((g) => [g, g.copies[0]!.id]));
    transpose(w);
    for (const g of w.genomes) {
      const founder = g.copies.find((c) => c.id === founderIds.get(g))!;
      expect(founder.r).toBe(1);
      expect(founder.s).toBe(0);
    }
  });
});
