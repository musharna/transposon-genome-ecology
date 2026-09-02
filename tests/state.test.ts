import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld, isBeneficialSite, isClusterSite } from "../sim/state.js";

describe("createWorld", () => {
  it("creates N genomes", () => {
    const w = createWorld(defaultParams({ N: 50 }));
    expect(w.genomes).toHaveLength(50);
  });

  it("seeds every genome with exactly one starting copy at rate r0", () => {
    const p = defaultParams({ N: 20, r0: 0.07 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      expect(g.copies).toHaveLength(1);
      expect(g.copies[0]!.r).toBe(0.07);
      expect(g.copies[0]!.domesticated).toBe(false);
    }
  });

  it("starts with empty repertoires", () => {
    const w = createWorld(defaultParams());
    expect(w.genomes.every((g) => g.repertoire.length === 0)).toBe(true);
  });

  it("assigns unique copy ids", () => {
    const w = createWorld(defaultParams({ N: 100 }));
    const ids = w.genomes.flatMap((g) => g.copies.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is deterministic for a seed", () => {
    const a = createWorld(defaultParams({ seed: 42 }));
    const b = createWorld(defaultParams({ seed: 42 }));
    expect(JSON.stringify(a.genomes)).toBe(JSON.stringify(b.genomes));
  });
});

describe("site classification", () => {
  it("puts cluster sites in a contiguous span at the start of the genome", () => {
    const p = defaultParams({ S: 1000, c: 0.01 });
    expect(isClusterSite(0, p)).toBe(true);
    expect(isClusterSite(9, p)).toBe(true);
    expect(isClusterSite(10, p)).toBe(false);
    expect(isClusterSite(999, p)).toBe(false);
  });

  it("puts beneficial sites in a contiguous span at the end of the genome", () => {
    const p = defaultParams({ S: 1000, beta: 0.01 });
    expect(isBeneficialSite(999, p)).toBe(true);
    expect(isBeneficialSite(990, p)).toBe(true);
    expect(isBeneficialSite(989, p)).toBe(false);
  });

  it("gives no cluster sites when c is zero", () => {
    const p = defaultParams({ S: 1000, c: 0 });
    expect(isClusterSite(0, p)).toBe(false);
  });
});
