import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import type { Genome } from "../sim/state.js";
import { copyNumberLoad, damageLoad, fitness, logFitness, relativeFitness } from "../sim/phases/select.js";

const genomeWith = (n: number, repertoire: number[] = []): Genome => ({
  copies: Array.from({ length: n }, (_, i) => ({
    id: i,
    site: i,
    r: 0.1,
    s: 0,
    domesticated: false,
  })),
  repertoire,
});

describe("copyNumberLoad", () => {
  const p = defaultParams({ a: 0.01, b: 0.001 });

  it("is zero at zero copies", () => {
    expect(copyNumberLoad(0, p)).toBe(0);
  });

  it("increases with copy number", () => {
    expect(copyNumberLoad(10, p)).toBeGreaterThan(copyNumberLoad(5, p));
  });

  it("is synergistic — the increment grows with n", () => {
    const d1 = copyNumberLoad(11, p) - copyNumberLoad(10, p);
    const d2 = copyNumberLoad(101, p) - copyNumberLoad(100, p);
    expect(d2).toBeGreaterThan(d1);
  });

  // Additive: the assertion above compares two near-equal differences of
  // near-equal floating-point sums (n≈10 vs n≈100), so it can pass on
  // floating-point rounding noise alone even with the quadratic term fully
  // removed (verified: dropping `p.b * n * n` still passed the assertion
  // above, d1=0.009999999999999995 vs d2=0.010000000000000009). This test
  // uses n large enough that the quadratic contribution (b*n*n = 1000 at
  // n=1000) dwarfs what pure linear growth (a*n = 10) could ever produce,
  // so it cannot pass unless the quadratic term is actually present.
  it("quadratic term dominates at large n — not detectable from linear term alone", () => {
    expect(copyNumberLoad(1000, p)).toBeGreaterThan(20 * p.a * 1000);
  });
});

describe("damageLoad", () => {
  it("charges per silenced copy under pure resistance", () => {
    const p = defaultParams({ t: 0, d: 0.01, dTol: 0.5 });
    expect(damageLoad(10, 4, p)).toBeCloseTo(0.04, 10);
  });

  it("charges per active copy under pure tolerance", () => {
    const p = defaultParams({ t: 1, d: 0.5, dTol: 0.01 });
    expect(damageLoad(10, 4, p)).toBeCloseTo(0.1, 10);
  });

  it("interpolates at intermediate t", () => {
    const p = defaultParams({ t: 0.5, d: 0.01, dTol: 0.01 });
    expect(damageLoad(10, 4, p)).toBeCloseTo(0.5 * 0.04 + 0.5 * 0.1, 10);
  });
});

describe("fitness", () => {
  it("is 1 for an empty genome", () => {
    expect(fitness(genomeWith(0), defaultParams())).toBeCloseTo(1, 10);
  });

  it("falls as copy number rises", () => {
    const p = defaultParams();
    expect(fitness(genomeWith(50), p)).toBeLessThan(fitness(genomeWith(5), p));
  });

  it("is positive within the representable range", () => {
    // Params pinned locally (not defaultParams()'s current a/b) so this test's
    // safety margin against underflow does not depend on values Task 15 is
    // explicitly going to replace. n=1000 keeps load under ~745.13, the point
    // past which Math.exp(-load) underflows to exactly 0 in IEEE-754 double
    // precision (load(1000) = 0.001*1000 + 0.0005*1000*1000 = 501,
    // exp(-501) ~= 2.6e-218, still representable).
    const p = defaultParams({ a: 0.001, b: 0.0005 });
    expect(fitness(genomeWith(1000), p)).toBeGreaterThan(0);
  });

  it("logFitness stays finite and discriminates copy number past the point where absolute fitness underflows to 0", () => {
    // Params pinned locally for the same reason as above: load(2000) = 2002
    // under these exact a/b, well past the underflow point, and that margin
    // must not depend on defaultParams()'s current values.
    const p = defaultParams({ a: 0.001, b: 0.0005 });
    const small = logFitness(genomeWith(1000), p);
    const large = logFitness(genomeWith(2000), p);
    expect(Number.isFinite(small)).toBe(true);
    expect(Number.isFinite(large)).toBe(true);
    expect(large).toBeLessThan(small);
  });

  it("silenced copies still pay copy-number load, and damageLoad's arguments are in the right order", () => {
    // Params pinned locally: a/b small enough that load stays representable
    // at n=10 regardless of recalibration; d and dTol DISTINCT (0.01 vs 0.05)
    // so a swap at the damageLoad call site, or the two functions' argument
    // order, changes the numeric result rather than being invariant under it.
    const p = defaultParams({
      a: 0.001, b: 0.0005, t: 0.5, d: 0.01, dTol: 0.05, theta: 0.1,
    });
    const genome = genomeWith(10, [0]);
    // genomeWith gives every copy s=0; override so 4 copies land inside theta
    // of the repertoire entry (silenced) and 6 land far outside it (active).
    for (let i = 0; i < genome.copies.length; i++) {
      genome.copies[i]!.s = i < 4 ? 0 : 10;
    }
    const nSilenced = 4;
    const nActive = 6;
    const n = nActive + nSilenced;
    const expectedLoad =
      copyNumberLoad(n, p) + damageLoad(nActive, nSilenced, p);
    expect(fitness(genome, p)).toBeCloseTo(Math.exp(-expectedLoad), 10);
  });

  it("domesticated copies escape copy-number load entirely — full-escape identity", () => {
    // Records the "n excludes domesticated copies" semantics as an executable
    // identity: adding k domesticated copies to a genome must change fitness
    // by exactly exp(k * wDom), with no copy-number-load contribution from
    // those k copies at all.
    const p = defaultParams({ wDom: 0.02 });
    const plain = genomeWith(5);
    const mixed = genomeWith(8);
    for (let i = 0; i < 3; i++) mixed.copies[i]!.domesticated = true;
    expect(fitness(mixed, p)).toBeCloseTo(
      fitness(plain, p) * Math.exp(3 * p.wDom),
      10,
    );
  });

  it("rises with domesticated copies", () => {
    const p = defaultParams({ wDom: 0.05 });
    const plain = genomeWith(3);
    const domesticated = genomeWith(3);
    for (const c of domesticated.copies) c.domesticated = true;
    expect(fitness(domesticated, p)).toBeGreaterThan(fitness(plain, p));
  });
});

describe("relativeFitness", () => {
  it("returns [] for an empty population", () => {
    expect(relativeFitness([], defaultParams())).toEqual([]);
  });

  it("weights sum to at least 1 even when every genome underflows naive fitness to 0", () => {
    // Params pinned locally at values that underflow fitness() to exactly 0
    // for n=2000 (load = 2002, past the ~745.13 underflow point) — the exact
    // regime relativeFitness exists to make safe. A population entirely at
    // this n has fitness(g) === 0 for every g, so a naive sum-then-sample
    // sees total=0 and collapses; relativeFitness must not.
    const p = defaultParams({ a: 0.001, b: 0.0005 });
    const genomes = [genomeWith(2000), genomeWith(2000), genomeWith(2000)];
    expect(genomes.every((g) => fitness(g, p) === 0)).toBe(true);
    const weights = relativeFitness(genomes, p);
    const total = weights.reduce((sum, w) => sum + w, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });
});
