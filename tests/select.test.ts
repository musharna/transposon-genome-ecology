import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import type { Genome } from "../sim/state.js";
import { copyNumberLoad, damageLoad, fitness, logFitness } from "../sim/phases/select.js";

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
    const p = defaultParams();
    // n=1000 keeps load (copyNumberLoad + damageLoad) under ~745.13, the
    // point past which Math.exp(-load) underflows to exactly 0 in IEEE-754
    // double precision (verified: load(1000) = 0.001*1000 + 0.0005*1000*1000
    // = 501, exp(-501) ~= 2.6e-218, still representable; load(2000) = 2002,
    // exp(-2002) underflows to exactly 0 with these same default params).
    expect(fitness(genomeWith(1000), p)).toBeGreaterThan(0);
  });

  it("logFitness stays finite and discriminates copy number past the point where absolute fitness underflows to 0", () => {
    const p = defaultParams();
    // n=2000 is exactly the fixture the original (removed) test used, chosen
    // because it underflows fitness() to a hard 0 under default params —
    // logFitness must still be finite and still rank it below a smaller n.
    const small = logFitness(genomeWith(1000), p);
    const large = logFitness(genomeWith(2000), p);
    expect(Number.isFinite(small)).toBe(true);
    expect(Number.isFinite(large)).toBe(true);
    expect(large).toBeLessThan(small);
  });

  it("rises with domesticated copies", () => {
    const p = defaultParams({ wDom: 0.05 });
    const plain = genomeWith(3);
    const domesticated = genomeWith(3);
    for (const c of domesticated.copies) c.domesticated = true;
    expect(fitness(domesticated, p)).toBeGreaterThan(fitness(plain, p));
  });
});
