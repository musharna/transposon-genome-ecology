import { describe, expect, it } from "vitest";
import { makeRng } from "../sim/rng.js";

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it("returns uniforms in [0, 1)", () => {
    const r = makeRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("produces normals with roughly zero mean and unit variance", () => {
    const r = makeRng(99);
    const xs = Array.from({ length: 50_000 }, () => r.normal());
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const varr = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(varr - 1)).toBeLessThan(0.05);
  });
});
