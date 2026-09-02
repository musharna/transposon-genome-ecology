# Transposons as Genome Ecology — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a poke-and-watch browser toy in which a population of genomes
evolves transposable-element copies whose transposition rates are heritable, and
which reproduces the Charlesworth 1983 copy-number equilibrium and the Kofler 2019
three-phase invasion.

**Architecture:** One pure TypeScript simulation core in `sim/` with no DOM and no
I/O, composed of six single-responsibility generation phases. `web/` renders it and
mutates parameters mid-run. `experiments/` and `tests/` import the same core under
node, so the artifact that is played is the artifact that is validated.

**Tech Stack:** TypeScript (ESM), vitest, tsx, Vite for `web/`, Playwright for one
cross-environment guard. No numeric or simulation libraries — the model is small
and every line of it must be inspectable.

**Spec:** `docs/superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`

## Global Constraints

- **The unit is the copy.** Transposition rate `r` is a per-copy heritable trait.
  "Family" is never a declared entity — it is a cluster in `s`-space.
- **Silencing is derived, never stored.** A copy is silenced iff its `s` lies within
  `θ` of any entry in its genome's `repertoire`. There is no `silenced` field.
- **Iteration order must be deterministic.** Copies live in ordered arrays. Never
  `Set`, never `Map` traversal, never `Object.keys` over numeric keys, in any code
  path that affects simulation state. Seeded RNG alone does not give reproducibility.
- **Every guard runs against a deliberately broken model first** and must fail *for
  the stated reason* before it counts as passing.
- **Every negative assertion carries a positive control in the same test.**
- **All randomness flows through the `Rng` passed in `World`.** No `Math.random()`
  anywhere in `sim/`.
- **Node 20+.** ESM only (`"type": "module"`).
- **Analysis figures are R + ggplot2** from one sourced theme file. Experiments emit
  CSV. Canvas rendering inside the toy is not a plot and does not use this path.

---

## File Structure

| file | responsibility |
| --- | --- |
| `sim/rng.ts` | Seeded deterministic PRNG; uniform and normal draws |
| `sim/params.ts` | `Params` interface and `defaultParams()` |
| `sim/state.ts` | `Copy`, `Genome`, `World` types; `createWorld()` |
| `sim/silencing.ts` | Derived silencing predicates — the one place `θ` is applied |
| `sim/phases/transpose.ts` | Phase 1 |
| `sim/phases/trap.ts` | Phase 2 |
| `sim/phases/lifecycle.ts` | Phases 3 and 4 — domestication and excision |
| `sim/phases/select.ts` | Phase 5 — fitness, incl. the one unconfirmed form |
| `sim/phases/reproduce.ts` | Phase 6 — sexual/asexual, maternal repertoire |
| `sim/step.ts` | Composes the six phases into `step(world)` |
| `sim/observe.ts` | Read-only derived measures for tests, runners and UI |
| `sim/index.ts` | Public barrel — the only import surface for `web/` and `experiments/` |
| `tests/*.test.ts` | Unit tests, one per phase |
| `tests/guards/*.test.ts` | The seven guards from spec §6 |
| `web/index.html`, `web/main.ts`, `web/render/*.ts` | The toy |
| `experiments/001-per-copy-vs-family-rate.ts` | The registered question |
| `tools/sweep-cluster-size.ts` | Guard 3's sweep, reusable |

---

## Task 1: Scaffold and seeded RNG

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `sim/rng.ts`
- Test: `tests/rng.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `interface Rng { next(): number; normal(): number }`, `makeRng(seed: number): Rng`

- [ ] **Step 1: Create the project files**

`package.json`:

```json
{
  "name": "transposon-genome-ecology",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "tsx": "^4.19.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["sim", "tests", "experiments", "tools", "web"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
```

Then run `npm install`.

- [ ] **Step 2: Write the failing test**

`tests/rng.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx vitest run tests/rng.test.ts`
Expected: FAIL — cannot resolve `../sim/rng.js`.

- [ ] **Step 4: Implement the RNG**

`sim/rng.ts`:

```ts
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Standard normal, mean 0, variance 1. */
  normal(): number;
}

/**
 * mulberry32 — small, fast, and adequate for a toy. Chosen over Math.random
 * because every run in this project must be reproducible from its seed.
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  let spare: number | null = null;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Marsaglia polar method; caches the second variate.
  const normal = (): number => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    let u = 0;
    let v = 0;
    let sSq = 0;
    do {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      sSq = u * u + v * v;
    } while (sSq >= 1 || sSq === 0);
    const mul = Math.sqrt((-2 * Math.log(sSq)) / sSq);
    spare = v * mul;
    return u * mul;
  };

  return { next, normal };
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx vitest run tests/rng.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts sim/rng.ts tests/rng.test.ts
git commit -m "feat(sim): seeded deterministic RNG"
```

---

## Task 2: Parameters and world construction

**Files:**
- Create: `sim/params.ts`, `sim/state.ts`
- Test: `tests/state.test.ts`

**Interfaces:**
- Consumes: `makeRng` from Task 1
- Produces:
  - `interface Params` (all fields below)
  - `defaultParams(overrides?: Partial<Params>): Params`
  - `interface Copy { id: number; site: number; r: number; s: number; domesticated: boolean }`
  - `interface Genome { copies: Copy[]; repertoire: number[] }`
  - `interface World { genomes: Genome[]; params: Params; rng: Rng; generation: number; nextCopyId: number }`
  - `createWorld(params: Params): World`
  - `isClusterSite(site: number, p: Params): boolean`
  - `isBeneficialSite(site: number, p: Params): boolean`

- [ ] **Step 1: Write the failing test**

`tests/state.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL — cannot resolve `../sim/params.js`.

- [ ] **Step 3: Implement params**

`sim/params.ts`:

```ts
export interface Params {
  /** Population size (number of genomes). */
  N: number;
  /** Occupiable sites per genome. */
  S: number;
  /** Fraction of sites that are piRNA cluster sites (a span at the genome start). */
  c: number;
  /** Initial transposition rate of the founding copies. */
  r0: number;
  /** Ceiling on transposition rate. */
  rMax: number;
  /** SD of the multiplicative lognormal mutation applied to r on transposition. */
  sigmaR: number;
  /** SD of the additive mutation applied to s on transposition. */
  sigmaS: number;
  /** Silencing similarity threshold in s-space. */
  theta: number;
  /** Per-copy excision probability per generation. */
  v: number;
  /** Linear copy-number fitness coefficient. */
  a: number;
  /** Quadratic copy-number fitness coefficient (synergistic epistasis). */
  b: number;
  /** Per-silenced-copy cost, paid under resistance. */
  d: number;
  /** Per-active-copy damage-absorption cost, paid under tolerance. */
  dTol: number;
  /** Host strategy dial: 0 = pure resistance, 1 = pure tolerance. */
  t: number;
  /** Fraction of sites that are beneficial (a span at the genome end). */
  beta: number;
  /** Per-generation probability a copy in a beneficial site is domesticated. */
  pDom: number;
  /** Fitness bonus per domesticated copy. */
  wDom: number;
  /** Sexual reproduction with free recombination, versus clonal. */
  sexual: boolean;
  /** Master switch for the piRNA trap. Off reproduces the pre-trap model. */
  silencingOn: boolean;
  seed: number;
}

/**
 * Provisional defaults. These have NOT been calibrated against any published
 * equilibrium; Task 15 sets them from Charlesworth & Charlesworth 1983.
 * They are chosen only to keep the model numerically well-behaved in early tasks.
 */
export function defaultParams(overrides: Partial<Params> = {}): Params {
  return {
    N: 300,
    S: 2000,
    c: 0.01,
    r0: 0.05,
    rMax: 1,
    sigmaR: 0.1,
    sigmaS: 0.02,
    theta: 0.1,
    v: 0.001,
    a: 0.001,
    b: 0.0005,
    d: 0.0005,
    dTol: 0.002,
    t: 0,
    beta: 0.005,
    pDom: 0.001,
    wDom: 0.01,
    sexual: true,
    silencingOn: true,
    seed: 1,
    ...overrides,
  };
}
```

- [ ] **Step 4: Implement state**

`sim/state.ts`:

```ts
import type { Params } from "./params.js";
import { makeRng, type Rng } from "./rng.js";

export interface Copy {
  id: number;
  site: number;
  /** Transposition rate. Heritable. The strategy. */
  r: number;
  /** Sequence coordinate. Heritable. The identity. */
  s: number;
  domesticated: boolean;
}

export interface Genome {
  /**
   * ORDERED. Never a Set or Map — iteration order is part of reproducibility.
   * Kept sorted by `site` so that structural comparisons are stable.
   */
  copies: Copy[];
  /** ORDERED s-values this genome has captured into piRNA clusters. */
  repertoire: number[];
}

export interface World {
  genomes: Genome[];
  params: Params;
  rng: Rng;
  generation: number;
  nextCopyId: number;
}

/** Cluster sites occupy a contiguous span at the start of the genome. */
export function isClusterSite(site: number, p: Params): boolean {
  return site < Math.floor(p.c * p.S);
}

/** Beneficial sites occupy a contiguous span at the end of the genome. */
export function isBeneficialSite(site: number, p: Params): boolean {
  return site >= p.S - Math.floor(p.beta * p.S);
}

/**
 * Every genome starts with exactly one copy at rate r0 and sequence coordinate 0,
 * placed in a non-cluster, non-beneficial site. A single founding lineage is what
 * makes families *emerge* rather than being seeded as distinct groups.
 */
export function createWorld(params: Params): World {
  const rng = makeRng(params.seed);
  const firstOrdinary = Math.floor(params.c * params.S);
  const lastOrdinary = params.S - Math.floor(params.beta * params.S);
  const span = lastOrdinary - firstOrdinary;

  const genomes: Genome[] = [];
  let nextCopyId = 0;
  for (let i = 0; i < params.N; i++) {
    const site = firstOrdinary + Math.floor(rng.next() * span);
    genomes.push({
      copies: [{ id: nextCopyId++, site, r: params.r0, s: 0, domesticated: false }],
      repertoire: [],
    });
  }

  return { genomes, params, rng, generation: 0, nextCopyId };
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx vitest run tests/state.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add sim/params.ts sim/state.ts tests/state.test.ts
git commit -m "feat(sim): params and world construction"
```

---

## Task 3: Derived silencing

This is the one place `θ` is applied. Silencing is computed from the genome's
repertoire on demand; there is no stored flag. That is what makes
escape-by-divergence automatic rather than a coded special case.

**Files:**
- Create: `sim/silencing.ts`
- Test: `tests/silencing.test.ts`

**Interfaces:**
- Consumes: `Copy`, `Genome`, `Params` from Task 2
- Produces:
  - `isSilenced(copy: Copy, genome: Genome, p: Params): boolean`
  - `activeCopies(genome: Genome, p: Params): Copy[]`
  - `silencedCopies(genome: Genome, p: Params): Copy[]`

- [ ] **Step 1: Write the failing test**

`tests/silencing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import type { Copy, Genome } from "../sim/state.js";
import { activeCopies, isSilenced, silencedCopies } from "../sim/silencing.js";

const copy = (over: Partial<Copy> = {}): Copy => ({
  id: 0, site: 100, r: 0.05, s: 0, domesticated: false, ...over,
});

describe("isSilenced", () => {
  const p = defaultParams({ theta: 0.1 });

  it("is false when the repertoire is empty", () => {
    const g: Genome = { copies: [], repertoire: [] };
    expect(isSilenced(copy({ s: 0 }), g, p)).toBe(false);
  });

  it("is true within theta of a repertoire entry", () => {
    const g: Genome = { copies: [], repertoire: [0.5] };
    expect(isSilenced(copy({ s: 0.55 }), g, p)).toBe(true);
    expect(isSilenced(copy({ s: 0.45 }), g, p)).toBe(true);
  });

  it("is false beyond theta — this is escape by divergence", () => {
    const g: Genome = { copies: [], repertoire: [0.5] };
    expect(isSilenced(copy({ s: 0.65 }), g, p)).toBe(false);
    expect(isSilenced(copy({ s: -0.5 }), g, p)).toBe(false);
  });

  it("matches against any entry, not only the first", () => {
    const g: Genome = { copies: [], repertoire: [-2, 0.5, 3] };
    expect(isSilenced(copy({ s: 3.05 }), g, p)).toBe(true);
  });

  it("exempts domesticated copies even inside theta", () => {
    const g: Genome = { copies: [], repertoire: [0.5] };
    expect(isSilenced(copy({ s: 0.5, domesticated: true }), g, p)).toBe(false);
  });
});

describe("activeCopies / silencedCopies", () => {
  const p = defaultParams({ theta: 0.1 });

  it("partition the genome's copies", () => {
    const g: Genome = {
      copies: [
        copy({ id: 1, s: 0.5 }),
        copy({ id: 2, s: 5 }),
        copy({ id: 3, s: 0.52 }),
        copy({ id: 4, s: 0.5, domesticated: true }),
      ],
      repertoire: [0.5],
    };
    expect(silencedCopies(g, p).map((c) => c.id)).toEqual([1, 3]);
    expect(activeCopies(g, p).map((c) => c.id)).toEqual([2]);
  });

  it("treats every copy as active when the repertoire is empty", () => {
    const g: Genome = { copies: [copy({ id: 1 }), copy({ id: 2 })], repertoire: [] };
    expect(activeCopies(g, p)).toHaveLength(2);
    expect(silencedCopies(g, p)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/silencing.test.ts`
Expected: FAIL — cannot resolve `../sim/silencing.js`.

- [ ] **Step 3: Implement silencing**

`sim/silencing.ts`:

```ts
import type { Params } from "./params.js";
import type { Copy, Genome } from "./state.js";

/**
 * A copy is silenced iff its sequence coordinate lies within theta of any entry
 * in its genome's piRNA repertoire. Derived, never stored: a daughter that mutates
 * far enough in s simply stops matching, which is escape by divergence with no
 * escape logic anywhere.
 *
 * Domesticated copies are exempt — they have been co-opted by the host.
 */
export function isSilenced(copy: Copy, genome: Genome, p: Params): boolean {
  if (copy.domesticated) return false;
  for (const entry of genome.repertoire) {
    if (Math.abs(copy.s - entry) <= p.theta) return true;
  }
  return false;
}

/** Copies that can still transpose: not silenced, not domesticated. */
export function activeCopies(genome: Genome, p: Params): Copy[] {
  return genome.copies.filter((c) => !c.domesticated && !isSilenced(c, genome, p));
}

/** Copies suppressed by the genome's own piRNAs. Excludes domesticated copies. */
export function silencedCopies(genome: Genome, p: Params): Copy[] {
  return genome.copies.filter((c) => !c.domesticated && isSilenced(c, genome, p));
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/silencing.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add sim/silencing.ts tests/silencing.test.ts
git commit -m "feat(sim): derived silencing by sequence similarity"
```

---

## Task 4: Transpose phase

**Files:**
- Create: `sim/phases/transpose.ts`
- Test: `tests/transpose.test.ts`

**Interfaces:**
- Consumes: `World`, `Copy`, `activeCopies`, `Rng`
- Produces: `transpose(world: World): void` — mutates `world.genomes` and `world.nextCopyId` in place

- [ ] **Step 1: Write the failing test**

`tests/transpose.test.ts`:

```ts
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
    const w = createWorld(defaultParams({ N: 200, r0: 1, sigmaR: 0.2, rMax: 10 }));
    transpose(w);
    const daughters = w.genomes.map((g) => g.copies[1]!);
    expect(daughters.some((c) => c.r !== 1)).toBe(true);
  });

  it("clips r to [0, rMax]", () => {
    const w = createWorld(defaultParams({ N: 200, r0: 1, sigmaR: 3, rMax: 1.5 }));
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
    const w = createWorld(defaultParams({ N: 20, S: 50, r0: 1, c: 0, beta: 0 }));
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
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/transpose.test.ts`
Expected: FAIL — cannot resolve `../sim/phases/transpose.js`.

- [ ] **Step 3: Implement transpose**

`sim/phases/transpose.ts`:

```ts
import { activeCopies } from "../silencing.js";
import type { Copy, World } from "../state.js";

/**
 * Phase 1. Each active, unsilenced copy transposes with probability r into a
 * uniformly chosen EMPTY site in its own genome. The daughter inherits r and s,
 * each with mutation. This is the variation generator: without per-copy mutation
 * of r there is nothing for selection to act on, and "rate is heritable" is empty.
 */
export function transpose(world: World): void {
  const p = world.params;

  for (const genome of world.genomes) {
    // Snapshot the parents before adding daughters, so a daughter created this
    // generation cannot itself transpose in the same generation.
    const parents = activeCopies(genome, p);
    if (parents.length === 0) continue;

    const occupied = new Set(genome.copies.map((c) => c.site));
    const newborns: Copy[] = [];

    for (const parent of parents) {
      if (world.rng.next() >= parent.r) continue;
      if (occupied.size >= p.S) break;

      // Rejection-sample an empty site. Bounded: we already know one exists.
      let site = 0;
      do {
        site = Math.floor(world.rng.next() * p.S);
      } while (occupied.has(site));
      occupied.add(site);

      const r = Math.min(p.rMax, Math.max(0, parent.r * Math.exp(world.rng.normal() * p.sigmaR)));
      const s = parent.s + world.rng.normal() * p.sigmaS;
      newborns.push({ id: world.nextCopyId++, site, r, s, domesticated: false });
    }

    if (newborns.length > 0) {
      genome.copies.push(...newborns);
      genome.copies.sort((x, y) => x.site - y.site);
    }
  }
}
```

Note: the `Set` here is a local occupancy index used only for membership tests,
never iterated. That is permitted; iterating a `Set` is not.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/transpose.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add sim/phases/transpose.ts tests/transpose.test.ts
git commit -m "feat(sim): transposition with heritable rate and sequence mutation"
```

---

## Task 5: Trap phase

**Files:**
- Create: `sim/phases/trap.ts`
- Test: `tests/trap.test.ts`

**Interfaces:**
- Consumes: `World`, `isClusterSite`, `isSilenced`
- Produces: `trap(world: World): void`

- [ ] **Step 1: Write the failing test**

`tests/trap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
import { isSilenced } from "../sim/silencing.js";
import { trap } from "../sim/phases/trap.js";

describe("trap", () => {
  it("captures the s of a copy sitting in a cluster site", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, t: 0 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [{ id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false }];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([1.25]);
  });

  it("ignores copies outside cluster sites", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [{ id: 0, site: 500, r: 0.1, s: 1.25, domesticated: false }];
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
    w.genomes[0]!.copies = [{ id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false }];
    trap(w);
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([1.25]);
  });

  it("captures nothing when silencing is switched off", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, silencingOn: false });
    const w = createWorld(p);
    w.genomes[0]!.copies = [{ id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false }];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([]);
  });

  it("captures nothing under pure tolerance — a tolerating host builds no clusters", () => {
    const p = defaultParams({ N: 1, S: 1000, c: 0.01, t: 1 });
    const w = createWorld(p);
    w.genomes[0]!.copies = [{ id: 0, site: 5, r: 0.1, s: 1.25, domesticated: false }];
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
    w.genomes[0]!.copies = [{ id: 0, site: 5, r: 0.1, s: 1.25, domesticated: true }];
    trap(w);
    expect(w.genomes[0]!.repertoire).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/trap.test.ts`
Expected: FAIL — cannot resolve `../sim/phases/trap.js`.

- [ ] **Step 3: Implement trap**

`sim/phases/trap.ts`:

```ts
import { isSilenced } from "../silencing.js";
import { isClusterSite, type World } from "../state.js";

/**
 * Phase 2. A copy occupying a piRNA cluster site is captured: its sequence
 * coordinate enters the genome's repertoire, and everything within theta of it is
 * thereby silenced. The trap is made of the element itself.
 *
 * Gated by the tolerance dial. A genome captures with probability (1 - t): a purely
 * tolerant host never forms a repertoire, and therefore CANNOT BE CONSCRIPTED. This
 * gate is the reason resistance and tolerance are different in kind, not degree.
 */
export function trap(world: World): void {
  const p = world.params;
  if (!p.silencingOn) return;

  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      if (!isClusterSite(copy.site, p)) continue;
      // Already covered by an existing entry — capturing again would be a no-op.
      if (isSilenced(copy, genome, p)) continue;
      if (world.rng.next() >= 1 - p.t) continue;
      genome.repertoire.push(copy.s);
    }
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/trap.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add sim/phases/trap.ts tests/trap.test.ts
git commit -m "feat(sim): piRNA trap capture, gated by the tolerance dial"
```

---

## Task 6: Domestication and excision

**Files:**
- Create: `sim/phases/lifecycle.ts`
- Test: `tests/lifecycle.test.ts`

**Interfaces:**
- Consumes: `World`, `isBeneficialSite`
- Produces: `domesticate(world: World): void`, `lose(world: World): void`

- [ ] **Step 1: Write the failing test**

`tests/lifecycle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
import { domesticate, lose } from "../sim/phases/lifecycle.js";

describe("domesticate", () => {
  it("can domesticate a copy in a beneficial site", () => {
    const p = defaultParams({ N: 200, S: 1000, beta: 0.01, pDom: 1, seed: 5 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 999, r: 0.1, s: 0, domesticated: false }];
    }
    domesticate(w);
    expect(w.genomes.every((g) => g.copies[0]!.domesticated)).toBe(true);
  });

  it("never domesticates a copy outside a beneficial site", () => {
    const p = defaultParams({ N: 50, S: 1000, beta: 0.01, pDom: 1 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 500, r: 0.1, s: 0, domesticated: false }];
    }
    domesticate(w);
    expect(w.genomes.every((g) => !g.copies[0]!.domesticated)).toBe(true);
  });

  it("never reverts a domesticated copy", () => {
    const p = defaultParams({ N: 50, S: 1000, beta: 0.01, pDom: 0 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 999, r: 0.1, s: 0, domesticated: true }];
    }
    domesticate(w);
    expect(w.genomes.every((g) => g.copies[0]!.domesticated)).toBe(true);
  });
});

describe("lose", () => {
  it("removes nothing when v is zero", () => {
    const w = createWorld(defaultParams({ N: 50, v: 0 }));
    lose(w);
    expect(w.genomes.every((g) => g.copies.length === 1)).toBe(true);
  });

  it("removes everything undomesticated when v is one", () => {
    const w = createWorld(defaultParams({ N: 50, v: 1 }));
    lose(w);
    expect(w.genomes.every((g) => g.copies.length === 0)).toBe(true);
  });

  it("never excises a domesticated copy", () => {
    const w = createWorld(defaultParams({ N: 50, v: 1 }));
    for (const g of w.genomes) g.copies[0]!.domesticated = true;
    lose(w);
    expect(w.genomes.every((g) => g.copies.length === 1)).toBe(true);
  });

  it("removes roughly the expected fraction", () => {
    const w = createWorld(defaultParams({ N: 1, S: 5000, v: 0.2, seed: 11 }));
    w.genomes[0]!.copies = Array.from({ length: 2000 }, (_, i) => ({
      id: i, site: i, r: 0.1, s: 0, domesticated: false,
    }));
    lose(w);
    const remaining = w.genomes[0]!.copies.length;
    expect(remaining).toBeGreaterThan(1500);
    expect(remaining).toBeLessThan(1700);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/lifecycle.test.ts`
Expected: FAIL — cannot resolve `../sim/phases/lifecycle.js`.

- [ ] **Step 3: Implement lifecycle**

`sim/phases/lifecycle.ts`:

```ts
import { isBeneficialSite, type World } from "../state.js";

/**
 * Phase 3. A copy in a beneficial site may be co-opted by the host: it stops
 * transposing, becomes exempt from silencing and excision, and pays the genome a
 * fitness bonus. This is domestication — the alternate win. It never reverts.
 */
export function domesticate(world: World): void {
  const p = world.params;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      if (!isBeneficialSite(copy.site, p)) continue;
      if (world.rng.next() >= p.pDom) continue;
      copy.domesticated = true;
    }
  }
}

/** Phase 4. Excision. Domesticated copies are structural and are not lost. */
export function lose(world: World): void {
  const p = world.params;
  for (const genome of world.genomes) {
    genome.copies = genome.copies.filter(
      (c) => c.domesticated || world.rng.next() >= p.v,
    );
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/lifecycle.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add sim/phases/lifecycle.ts tests/lifecycle.test.ts
git commit -m "feat(sim): domestication and excision"
```

---

## Task 7: Selection

The `copyNumberLoad` function isolated here is the single unconfirmed piece of the
model. Task 15 replaces its coefficients — and possibly its form — with what
Charlesworth & Charlesworth 1983 actually specifies. Keep it in one function so
that task touches one place.

**Files:**
- Create: `sim/phases/select.ts`
- Test: `tests/select.test.ts`

**Interfaces:**
- Consumes: `Genome`, `Params`, `activeCopies`, `silencedCopies`
- Produces:
  - `copyNumberLoad(n: number, p: Params): number`
  - `damageLoad(nActive: number, nSilenced: number, p: Params): number`
  - `fitness(genome: Genome, p: Params): number`

- [ ] **Step 1: Write the failing test**

`tests/select.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import type { Genome } from "../sim/state.js";
import { copyNumberLoad, damageLoad, fitness } from "../sim/phases/select.js";

const genomeWith = (n: number, repertoire: number[] = []): Genome => ({
  copies: Array.from({ length: n }, (_, i) => ({
    id: i, site: i, r: 0.1, s: 0, domesticated: false,
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

  it("is always positive", () => {
    const p = defaultParams();
    expect(fitness(genomeWith(2000), p)).toBeGreaterThan(0);
  });

  it("rises with domesticated copies", () => {
    const p = defaultParams({ wDom: 0.05 });
    const plain = genomeWith(3);
    const domesticated = genomeWith(3);
    for (const c of domesticated.copies) c.domesticated = true;
    expect(fitness(domesticated, p)).toBeGreaterThan(fitness(plain, p));
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/select.test.ts`
Expected: FAIL — cannot resolve `../sim/phases/select.js`.

- [ ] **Step 3: Implement selection**

`sim/phases/select.ts`:

```ts
import type { Params } from "../params.js";
import { activeCopies, silencedCopies } from "../silencing.js";
import type { Genome } from "../state.js";

/**
 * Fitness cost of carrying n transposable-element copies, under synergistic
 * epistasis.
 *
 * ⚠️ PROVISIONAL. This form and its coefficients have NOT been read out of
 * Charlesworth & Charlesworth 1983 — the reference base was built from abstracts
 * and registry metadata. Task 15 confirms or replaces both. Guard 1 (the
 * equilibrium check) cannot be calibrated until it does. Everything else in the
 * model is independent of this choice, which is why it lives alone in one function.
 */
export function copyNumberLoad(n: number, p: Params): number {
  return p.a * n + p.b * n * n;
}

/**
 * The damage term, and the only place the host's two strategies differ numerically.
 *
 * Resistance (t = 0) pays per SILENCED copy — Hollister & Gaut's cost of silencing
 * a TE also suppressing its neighbours. Tolerance (t = 1) pays per ACTIVE copy
 * instead, absorbing the damage rather than suppressing the element. The two costs
 * scale with different quantities, so they are different shapes, not one knob.
 */
export function damageLoad(nActive: number, nSilenced: number, p: Params): number {
  const resistance = p.d * nSilenced;
  const tolerance = p.dTol * nActive;
  return (1 - p.t) * resistance + p.t * tolerance;
}

/** Multiplicative fitness in (0, ∞). Never zero, so selection never divides by zero. */
export function fitness(genome: Genome, p: Params): number {
  const active = activeCopies(genome, p);
  const silenced = silencedCopies(genome, p);
  const nDom = genome.copies.reduce((acc, c) => acc + (c.domesticated ? 1 : 0), 0);
  const n = active.length + silenced.length;

  const load = copyNumberLoad(n, p) + damageLoad(active.length, silenced.length, p);
  return Math.exp(-load + p.wDom * nDom);
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/select.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add sim/phases/select.ts tests/select.test.ts
git commit -m "feat(sim): fitness with tolerance-shaped damage term"
```

---

## Task 8: Reproduction

**Files:**
- Create: `sim/phases/reproduce.ts`
- Test: `tests/reproduce.test.ts`

**Interfaces:**
- Consumes: `World`, `Genome`, `Copy`, `fitness`
- Produces: `reproduce(world: World): void`

- [ ] **Step 1: Write the failing test**

`tests/reproduce.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
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
      expect(parentSignatures.has(g.copies.map((c) => c.site).join(","))).toBe(true);
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
    const before = new Set(w.genomes.map((g) => g.copies.map((c) => c.site).join(",")));
    reproduce(w);
    const novel = w.genomes.filter(
      (g) => !before.has(g.copies.map((c) => c.site).join(",")),
    );
    expect(novel.length).toBeGreaterThan(0);
  });

  it("favours fitter genomes — low-copy genomes come to dominate", () => {
    const p = defaultParams({ N: 200, sexual: false, S: 2000, a: 0.05, b: 0.001, seed: 8 });
    const w = createWorld(p);
    w.genomes.forEach((g, i) => {
      const n = i < 100 ? 1 : 40;
      g.copies = Array.from({ length: n }, (_, k) => ({
        id: i * 100 + k, site: k + 10, r: 0.1, s: 0, domesticated: false,
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
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/reproduce.test.ts`
Expected: FAIL — cannot resolve `../sim/phases/reproduce.js`.

- [ ] **Step 3: Implement reproduction**

`sim/phases/reproduce.ts`:

```ts
import type { Copy, Genome, World } from "../state.js";
import { fitness } from "./select.js";

/** Fitness-proportionate index draw. Linear scan — N is a few hundred. */
function sampleParent(cumulative: number[], total: number, u: number): number {
  const target = u * total;
  for (let i = 0; i < cumulative.length; i++) {
    if (target < cumulative[i]!) return i;
  }
  return cumulative.length - 1;
}

/**
 * Phase 6. Offspring are drawn fitness-proportionately to restore N.
 *
 * Sexual: two parents, free recombination — each site is inherited independently
 * from one parent or the other. Asexual: a single parent, cloned.
 *
 * In both cases the offspring inherits the MOTHER's piRNA repertoire (parent A),
 * per Kelleher et al. 2012 on maternal piRNA deposition. The defence is heritable
 * on the same footing as the strategy, which is what makes the arms race symmetric.
 */
export function reproduce(world: World): void {
  const p = world.params;

  const weights = world.genomes.map((g) => fitness(g, p));
  const cumulative: number[] = [];
  let total = 0;
  for (const w of weights) {
    total += w;
    cumulative.push(total);
  }

  const cloneCopy = (c: Copy): Copy => ({
    id: world.nextCopyId++,
    site: c.site,
    r: c.r,
    s: c.s,
    domesticated: c.domesticated,
  });

  const offspring: Genome[] = [];
  for (let i = 0; i < p.N; i++) {
    const motherIdx = sampleParent(cumulative, total, world.rng.next());
    const mother = world.genomes[motherIdx]!;

    let copies: Copy[];
    if (p.sexual) {
      const fatherIdx = sampleParent(cumulative, total, world.rng.next());
      const father = world.genomes[fatherIdx]!;
      copies = [];
      // Free recombination: every site segregates independently.
      for (const c of mother.copies) {
        if (world.rng.next() < 0.5) copies.push(cloneCopy(c));
      }
      for (const c of father.copies) {
        if (world.rng.next() < 0.5) copies.push(cloneCopy(c));
      }
      // A site inherited from both parents would appear twice; keep one.
      const seen = new Set<number>();
      copies = copies.filter((c) => (seen.has(c.site) ? false : (seen.add(c.site), true)));
      copies.sort((x, y) => x.site - y.site);
    } else {
      copies = mother.copies.map((c) => cloneCopy(c));
    }

    offspring.push({ copies, repertoire: [...mother.repertoire] });
  }

  world.genomes = offspring;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/reproduce.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add sim/phases/reproduce.ts tests/reproduce.test.ts
git commit -m "feat(sim): reproduction with recombination and maternal piRNA deposition"
```

---

## Task 9: Compose the step, and the observables

**Files:**
- Create: `sim/step.ts`, `sim/observe.ts`, `sim/index.ts`
- Test: `tests/step.test.ts`

**Interfaces:**
- Consumes: every phase from Tasks 4–8
- Produces:
  - `step(world: World): void`, `run(world: World, generations: number): void`
  - `interface Snapshot { generation: number; totalCopies: number; activeCopies: number; silencedCopies: number; domesticatedCopies: number; meanRate: number; fractionWithRepertoire: number }`
  - `observe(world: World): Snapshot`
  - `history(world: World, generations: number): Snapshot[]`
  - `stateHash(world: World): string`

- [ ] **Step 1: Write the failing test**

`tests/step.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWorld, defaultParams, history, observe, run, stateHash, step } from "../sim/index.js";

describe("step", () => {
  it("advances the generation counter", () => {
    const w = createWorld(defaultParams({ N: 20 }));
    step(w);
    expect(w.generation).toBe(1);
  });

  it("holds the population at N across many generations", () => {
    const w = createWorld(defaultParams({ N: 80 }));
    run(w, 50);
    expect(w.genomes).toHaveLength(80);
  });

  it("is deterministic for a seed", () => {
    const hashOf = () => {
      const w = createWorld(defaultParams({ N: 60, seed: 2024 }));
      run(w, 30);
      return stateHash(w);
    };
    expect(hashOf()).toBe(hashOf());
  });

  it("diverges across seeds", () => {
    const hashOf = (seed: number) => {
      const w = createWorld(defaultParams({ N: 60, seed }));
      run(w, 30);
      return stateHash(w);
    };
    expect(hashOf(1)).not.toBe(hashOf(2));
  });

  it("never exceeds S copies in a genome", () => {
    const w = createWorld(defaultParams({ N: 20, S: 60, r0: 0.8, v: 0, a: 0, b: 0 }));
    run(w, 40);
    expect(w.genomes.every((g) => g.copies.length <= 60)).toBe(true);
  });
});

describe("observe", () => {
  it("reports zero copies for an emptied world", () => {
    const w = createWorld(defaultParams({ N: 10 }));
    for (const g of w.genomes) g.copies = [];
    const snap = observe(w);
    expect(snap.totalCopies).toBe(0);
    expect(snap.meanRate).toBe(0);
  });

  it("partitions total into active, silenced and domesticated", () => {
    const w = createWorld(defaultParams({ N: 30 }));
    run(w, 10);
    const s = observe(w);
    expect(s.activeCopies + s.silencedCopies + s.domesticatedCopies).toBe(s.totalCopies);
  });

  it("reports the fraction of genomes carrying a repertoire", () => {
    const w = createWorld(defaultParams({ N: 10 }));
    w.genomes[0]!.repertoire = [1];
    w.genomes[1]!.repertoire = [2];
    expect(observe(w).fractionWithRepertoire).toBeCloseTo(0.2, 10);
  });
});

describe("history", () => {
  it("returns one snapshot per generation plus the initial state", () => {
    const w = createWorld(defaultParams({ N: 20 }));
    expect(history(w, 25)).toHaveLength(26);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/step.test.ts`
Expected: FAIL — cannot resolve `../sim/index.js`.

- [ ] **Step 3: Implement the step**

`sim/step.ts`:

```ts
import { domesticate, lose } from "./phases/lifecycle.js";
import { reproduce } from "./phases/reproduce.js";
import { transpose } from "./phases/transpose.js";
import { trap } from "./phases/trap.js";
import type { World } from "./state.js";

/**
 * One generation, in the order specified by the design.
 *
 * Phases 1, 4, 5 and 6 alone are the Charlesworth 1983 model; phase 2 adds
 * Kofler's trap and phase 3 adds domestication. Guard 1 runs with silencingOn
 * false and pDom zero, which disables exactly phases 2 and 3.
 */
export function step(world: World): void {
  transpose(world);   // 1
  trap(world);        // 2
  domesticate(world); // 3
  lose(world);        // 4
  reproduce(world);   // 5 selection, 6 reproduction
  world.generation++;
}

export function run(world: World, generations: number): void {
  for (let i = 0; i < generations; i++) step(world);
}
```

- [ ] **Step 4: Implement the observables**

`sim/observe.ts`:

```ts
import { activeCopies, silencedCopies } from "./silencing.js";
import type { World } from "./state.js";
import { step } from "./step.js";

export interface Snapshot {
  generation: number;
  totalCopies: number;
  activeCopies: number;
  silencedCopies: number;
  domesticatedCopies: number;
  /** Mean transposition rate across every live copy. Zero if there are none. */
  meanRate: number;
  fractionWithRepertoire: number;
}

export function observe(world: World): Snapshot {
  const p = world.params;
  let total = 0;
  let active = 0;
  let silenced = 0;
  let domesticated = 0;
  let rateSum = 0;
  let withRepertoire = 0;

  for (const genome of world.genomes) {
    total += genome.copies.length;
    active += activeCopies(genome, p).length;
    silenced += silencedCopies(genome, p).length;
    for (const c of genome.copies) {
      rateSum += c.r;
      if (c.domesticated) domesticated++;
    }
    if (genome.repertoire.length > 0) withRepertoire++;
  }

  return {
    generation: world.generation,
    totalCopies: total,
    activeCopies: active,
    silencedCopies: silenced,
    domesticatedCopies: domesticated,
    meanRate: total === 0 ? 0 : rateSum / total,
    fractionWithRepertoire:
      world.genomes.length === 0 ? 0 : withRepertoire / world.genomes.length,
  };
}

/** Snapshot at generation 0, then after each of `generations` steps. */
export function history(world: World, generations: number): Snapshot[] {
  const out: Snapshot[] = [observe(world)];
  for (let i = 0; i < generations; i++) {
    step(world);
    out.push(observe(world));
  }
  return out;
}

/**
 * Structural digest of the world, for cross-environment comparison. Deliberately
 * excludes copy ids, which are allocation-order artefacts rather than state.
 */
export function stateHash(world: World): string {
  const parts: string[] = [];
  for (const genome of world.genomes) {
    const sites = genome.copies
      .map((c) => `${c.site}:${c.r.toFixed(9)}:${c.s.toFixed(9)}:${c.domesticated ? 1 : 0}`)
      .join(",");
    const rep = genome.repertoire.map((x) => x.toFixed(9)).join(",");
    parts.push(`${sites}|${rep}`);
  }
  const joined = `${world.generation}#${parts.join(";")}`;

  // FNV-1a, 32-bit. Adequate for equality checking between two runs.
  let h = 0x811c9dc5;
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
```

- [ ] **Step 5: Implement the barrel**

`sim/index.ts`:

```ts
export { defaultParams, type Params } from "./params.js";
export { history, observe, stateHash, type Snapshot } from "./observe.js";
export { activeCopies, isSilenced, silencedCopies } from "./silencing.js";
export { run, step } from "./step.js";
export {
  createWorld,
  isBeneficialSite,
  isClusterSite,
  type Copy,
  type Genome,
  type World,
} from "./state.js";
export { copyNumberLoad, damageLoad, fitness } from "./phases/select.js";
export { makeRng, type Rng } from "./rng.js";
```

- [ ] **Step 6: Run the test and verify it passes**

Run: `npx vitest run tests/step.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 7: Run the whole suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 8: Commit**

```bash
git add sim/step.ts sim/observe.ts sim/index.ts tests/step.test.ts
git commit -m "feat(sim): compose the generation step and add observables"
```

---

## Task 10: Guard 5 — rate actually evolves

Run first among the guards. It tests the single claim that justifies choosing the
copy as the unit: that per-copy heritable rate gives selection something to act on.
If this fails, the design decision was wrong and later tasks are wasted work.

**Files:**
- Create: `tests/guards/rate-evolves.test.ts`

**Interfaces:**
- Consumes: `createWorld`, `defaultParams`, `run`, `observe`

- [ ] **Step 1: Write the guard**

`tests/guards/rate-evolves.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWorld, defaultParams, observe, run } from "../../sim/index.js";

/**
 * GUARD 5 (spec §6). Mean transposition rate must MOVE under selection, and must
 * NOT move when the variation generator is switched off.
 *
 * The negative half (sigmaR = 0 produces no movement) is paired with the positive
 * half (sigmaR > 0 produces movement) IN THE SAME FILE, so that a broken harness
 * reads as broken rather than as "no evolution, as predicted".
 */
describe("guard 5: rate evolves", () => {
  const base = {
    N: 300, S: 2000, r0: 0.1, sigmaR: 0.15, v: 0.02,
    a: 0.002, b: 0.0002, silencingOn: false, pDom: 0, sexual: true,
  };

  it("POSITIVE CONTROL: mean rate moves when copies mutate", () => {
    const w = createWorld(defaultParams({ ...base, seed: 101 }));
    const before = observe(w).meanRate;
    run(w, 300);
    const after = observe(w).meanRate;
    expect(after).not.toBeCloseTo(before, 3);
  });

  it("mean rate is unchanged when the variation generator is off", () => {
    const w = createWorld(defaultParams({ ...base, sigmaR: 0, seed: 101 }));
    const before = observe(w).meanRate;
    run(w, 300);
    const after = observe(w).meanRate;
    // Every copy descends from a founder at r0 with no mutation, so the mean is
    // exactly r0 regardless of which lineages survive.
    expect(after).toBeCloseTo(before, 10);
  });

  it("selection against copy number pushes the mean rate DOWN", () => {
    const w = createWorld(defaultParams({ ...base, a: 0.02, b: 0.002, seed: 202 }));
    const before = observe(w).meanRate;
    run(w, 400);
    const after = observe(w).meanRate;
    expect(after).toBeLessThan(before);
  });

  it("the population does not go extinct while this is measured", () => {
    const w = createWorld(defaultParams({ ...base, seed: 303 }));
    run(w, 300);
    expect(observe(w).totalCopies).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the guard against a deliberately broken model and watch it fail**

Temporarily edit `sim/phases/transpose.ts` so the daughter's rate is not mutated:

```ts
      const r = parent.r; // BROKEN ON PURPOSE — no mutation
```

Run: `npx vitest run tests/guards/rate-evolves.test.ts`
Expected: FAIL on "POSITIVE CONTROL: mean rate moves when copies mutate" and on
"selection against copy number pushes the mean rate DOWN". **Confirm the failure
message names those two tests.** A guard never observed failing is not evidence.

- [ ] **Step 3: Restore the real implementation**

Revert `sim/phases/transpose.ts` to:

```ts
      const r = Math.min(p.rMax, Math.max(0, parent.r * Math.exp(world.rng.normal() * p.sigmaR)));
```

- [ ] **Step 4: Run the guard and verify it passes**

Run: `npx vitest run tests/guards/rate-evolves.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/guards/rate-evolves.test.ts
git commit -m "test(guard5): rate evolves, with the variation generator as control"
```

---

## Task 11: Guard 6 — escape by divergence

**Files:**
- Create: `tests/guards/escape.test.ts`

- [ ] **Step 1: Write the guard**

`tests/guards/escape.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWorld, defaultParams, isSilenced } from "../../sim/index.js";
import { transpose } from "../../sim/phases/transpose.js";

/**
 * GUARD 6 (spec §6). A sublineage that diverges far enough in s escapes an
 * established trap. This must emerge from deriving silenced status rather than
 * from any escape-specific code — there is none.
 */
describe("guard 6: escape by divergence", () => {
  it("a diverged daughter escapes a repertoire its parent is caught by", () => {
    const p = defaultParams({
      N: 1, S: 5000, c: 0, theta: 0.1, sigmaS: 0.5, r0: 1, rMax: 1, sigmaR: 0, seed: 55,
    });
    const w = createWorld(p);
    const g = w.genomes[0]!;
    // One founding copy, and a repertoire that catches it.
    g.copies = [{ id: 0, site: 1000, r: 1, s: 0, domesticated: false }];
    g.repertoire = [0];
    expect(isSilenced(g.copies[0]!, g, p)).toBe(true);

    // The founder is silenced, so it cannot transpose. Seed an unsilenced copy
    // just outside theta and let it diverge further over several generations.
    g.copies.push({ id: 1, site: 1001, r: 1, s: 0.2, domesticated: false });
    for (let i = 0; i < 8; i++) transpose(w);

    const escaped = g.copies.filter((c) => !isSilenced(c, g, p));
    expect(escaped.length).toBeGreaterThan(1);
    expect(Math.max(...escaped.map((c) => Math.abs(c.s)))).toBeGreaterThan(0.5);
  });

  it("POSITIVE CONTROL: with no sequence drift, nothing escapes", () => {
    const p = defaultParams({
      N: 1, S: 5000, c: 0, theta: 0.1, sigmaS: 0, r0: 1, rMax: 1, sigmaR: 0, seed: 55,
    });
    const w = createWorld(p);
    const g = w.genomes[0]!;
    g.copies = [{ id: 0, site: 1000, r: 1, s: 0.05, domesticated: false }];
    g.repertoire = [0];
    for (let i = 0; i < 8; i++) transpose(w);
    expect(g.copies.every((c) => isSilenced(c, g, p))).toBe(true);
  });

  it("a silenced copy cannot transpose at all", () => {
    const p = defaultParams({ N: 1, S: 5000, c: 0, theta: 0.1, r0: 1, seed: 9 });
    const w = createWorld(p);
    const g = w.genomes[0]!;
    g.copies = [{ id: 0, site: 1000, r: 1, s: 0, domesticated: false }];
    g.repertoire = [0];
    transpose(w);
    expect(g.copies).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run against a broken model and watch it fail**

Temporarily edit `sim/silencing.ts` so `isSilenced` ignores `theta` and matches
anything once a repertoire exists:

```ts
  return genome.repertoire.length > 0; // BROKEN ON PURPOSE
```

Run: `npx vitest run tests/guards/escape.test.ts`
Expected: FAIL on "a diverged daughter escapes...". Confirm the message names it.

- [ ] **Step 3: Restore `sim/silencing.ts`** to the similarity comparison from Task 3.

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run tests/guards/escape.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/guards/escape.test.ts
git commit -m "test(guard6): escape by sequence divergence"
```

---

## Task 12: Guard 4 — silencing knockout produces bloat

**Files:**
- Create: `tests/guards/bloat.test.ts`

- [ ] **Step 1: Write the guard**

`tests/guards/bloat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWorld, defaultParams, observe, run } from "../../sim/index.js";

/**
 * GUARD 4 (spec §6). Switching silencing off must increase copy number.
 * DIRECTION ONLY — the magnitude is not calibrated against any measurement and
 * must not be asserted.
 */
describe("guard 4: silencing knockout produces bloat", () => {
  const base = {
    N: 200, S: 2000, c: 0.02, r0: 0.15, sigmaR: 0.05, sigmaS: 0.01,
    theta: 0.1, v: 0.01, a: 0.0005, b: 0.00002, pDom: 0, t: 0, sexual: true,
  };

  const finalCopies = (silencingOn: boolean, seed: number): number => {
    const w = createWorld(defaultParams({ ...base, silencingOn, seed }));
    run(w, 250);
    return observe(w).totalCopies;
  };

  it("knockout yields more copies than the silenced control, across seeds", () => {
    const seeds = [1, 2, 3, 4, 5];
    const withSilencing = seeds.map((s) => finalCopies(true, s));
    const without = seeds.map((s) => finalCopies(false, s));
    const meanOn = withSilencing.reduce((a, b) => a + b, 0) / seeds.length;
    const meanOff = without.reduce((a, b) => a + b, 0) / seeds.length;
    expect(meanOff).toBeGreaterThan(meanOn);
  });

  it("POSITIVE CONTROL: the silenced arm actually silences something", () => {
    const w = createWorld(defaultParams({ ...base, silencingOn: true, seed: 1 }));
    run(w, 250);
    expect(observe(w).silencedCopies).toBeGreaterThan(0);
  });

  it("POSITIVE CONTROL: neither arm goes extinct", () => {
    expect(finalCopies(true, 1)).toBeGreaterThan(0);
    expect(finalCopies(false, 1)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run against a broken model and watch it fail**

Temporarily edit `sim/phases/trap.ts` to return immediately:

```ts
export function trap(world: World): void {
  return; // BROKEN ON PURPOSE — trap never fires
}
```

Run: `npx vitest run tests/guards/bloat.test.ts`
Expected: FAIL on the knockout comparison AND on the "actually silences something"
control. Two failures is the correct signature: with the trap disabled both arms
are identical, so there is nothing to silence and no difference to detect.

- [ ] **Step 3: Restore `sim/phases/trap.ts`.**

- [ ] **Step 4: Run and verify it passes**

Run: `npx vitest run tests/guards/bloat.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/guards/bloat.test.ts
git commit -m "test(guard4): silencing knockout produces bloat, direction only"
```

---

## Task 13: Guard 2 — the three-phase invasion

**Files:**
- Create: `sim/phases-detect.ts`
- Create: `tests/guards/three-phases.test.ts`

**Interfaces:**
- Consumes: `Snapshot[]`
- Produces: `detectPhases(h: Snapshot[]): { amplification: number; plateau: number; inactivation: number } | null`

- [ ] **Step 1: Write the failing test**

`tests/guards/three-phases.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWorld, defaultParams, history } from "../../sim/index.js";
import { detectPhases } from "../../sim/phases-detect.js";

/**
 * GUARD 2 (spec §6). A trap-model invasion runs in three phases, per Kofler 2019:
 * amplification, then a plateau enforced by segregating cluster insertions, then
 * inactivation. This asserts the ORDERING, not the endpoint — an endpoint-only
 * test passes on a model that jumps straight to inactivation.
 */
describe("guard 2: three-phase invasion", () => {
  const invasion = {
    N: 300, S: 3000, c: 0.02, r0: 0.2, sigmaR: 0.02, sigmaS: 0.005,
    theta: 0.15, v: 0.005, a: 0.0004, b: 0.00001,
    pDom: 0, t: 0, silencingOn: true, sexual: true,
  };

  it("passes through amplification, plateau and inactivation in order", () => {
    const w = createWorld(defaultParams({ ...invasion, seed: 7 }));
    const h = history(w, 600);
    const phases = detectPhases(h);
    expect(phases).not.toBeNull();
    expect(phases!.amplification).toBeLessThan(phases!.plateau);
    expect(phases!.plateau).toBeLessThan(phases!.inactivation);
  });

  it("the plateau coincides with clusters spreading through the population", () => {
    const w = createWorld(defaultParams({ ...invasion, seed: 7 }));
    const h = history(w, 600);
    const phases = detectPhases(h)!;
    const atAmp = h[phases.amplification]!.fractionWithRepertoire;
    const atPlateau = h[phases.plateau]!.fractionWithRepertoire;
    expect(atPlateau).toBeGreaterThan(atAmp);
  });

  it("POSITIVE CONTROL: with the trap off there is no inactivation phase", () => {
    const w = createWorld(defaultParams({ ...invasion, silencingOn: false, seed: 7 }));
    const h = history(w, 600);
    expect(detectPhases(h)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/guards/three-phases.test.ts`
Expected: FAIL — cannot resolve `../../sim/phases-detect.js`.

- [ ] **Step 3: Implement phase detection**

`sim/phases-detect.ts`:

```ts
import type { Snapshot } from "./observe.js";

export interface PhaseIndices {
  /** Generation of peak growth rate in total copy number. */
  amplification: number;
  /** Generation at which total copy number peaks — growth has stopped. */
  plateau: number;
  /** First generation at which active copies fall below 20% of their own peak. */
  inactivation: number;
}

/**
 * Locates Kofler's three phases in a run's history, or returns null if the run
 * never reaches inactivation. Deliberately crude: these are ordering landmarks
 * for a guard, not an inference procedure.
 */
export function detectPhases(h: Snapshot[]): PhaseIndices | null {
  if (h.length < 10) return null;

  let amplification = 0;
  let bestGrowth = -Infinity;
  for (let i = 1; i < h.length; i++) {
    const growth = h[i]!.totalCopies - h[i - 1]!.totalCopies;
    if (growth > bestGrowth) {
      bestGrowth = growth;
      amplification = i;
    }
  }
  if (bestGrowth <= 0) return null;

  let plateau = amplification;
  let peakTotal = h[amplification]!.totalCopies;
  for (let i = amplification; i < h.length; i++) {
    if (h[i]!.totalCopies >= peakTotal) {
      peakTotal = h[i]!.totalCopies;
      plateau = i;
    }
  }

  let peakActive = 0;
  for (let i = 0; i <= plateau; i++) {
    peakActive = Math.max(peakActive, h[i]!.activeCopies);
  }
  if (peakActive === 0) return null;

  for (let i = plateau + 1; i < h.length; i++) {
    if (h[i]!.activeCopies < 0.2 * peakActive) {
      return { amplification, plateau, inactivation: i };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/guards/three-phases.test.ts`
Expected: PASS, 3 tests.

If the invasion parameters do not produce all three phases, adjust `r0`, `c` and
`theta` in the `invasion` object until they do, and record the working values in a
comment. Do not weaken the assertions to make the test pass — the ordering claim
is the guard.

- [ ] **Step 5: Export and commit**

Add to `sim/index.ts`:

```ts
export { detectPhases, type PhaseIndices } from "./phases-detect.js";
```

```bash
git add sim/phases-detect.ts sim/index.ts tests/guards/three-phases.test.ts
git commit -m "test(guard2): three-phase invasion ordering"
```

---

## Task 14: Guard 3 — the cluster-size threshold

**Files:**
- Create: `tools/sweep-cluster-size.ts`
- Create: `tests/guards/cluster-threshold.test.ts`

**Interfaces:**
- Produces: `sweepClusterSize(fractions: number[], seeds: number[], generations: number): { c: number; meanFinalCopies: number }[]`

- [ ] **Step 1: Write the failing test**

`tests/guards/cluster-threshold.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sweepClusterSize } from "../../tools/sweep-cluster-size.js";

/**
 * GUARD 3 (spec §6). Repression must switch on as cluster size grows, and the
 * onset must fall inside Kofler 2020's 0.2%–3% band.
 *
 * This is the loosest guard in the suite by design: the published band spans an
 * order of magnitude and depends on parameters this model does not match exactly.
 * It catches a model where cluster size does nothing, or where the threshold sits
 * somewhere absurd like 30%.
 */
describe("guard 3: cluster-size threshold", () => {
  const fractions = [0, 0.001, 0.002, 0.005, 0.01, 0.02, 0.03, 0.05];
  const seeds = [1, 2, 3];

  it("repression strengthens monotonically enough that large clusters beat none", () => {
    const results = sweepClusterSize(fractions, seeds, 300);
    const none = results.find((r) => r.c === 0)!;
    const large = results.find((r) => r.c === 0.05)!;
    expect(large.meanFinalCopies).toBeLessThan(none.meanFinalCopies);
  });

  it("the repression onset falls inside Kofler's 0.2%-3% band", () => {
    const results = sweepClusterSize(fractions, seeds, 300);
    const none = results.find((r) => r.c === 0)!.meanFinalCopies;
    // Onset: the smallest c achieving a 25% reduction against no clusters at all.
    const onset = results.find(
      (r) => r.c > 0 && r.meanFinalCopies < 0.75 * none,
    );
    expect(onset).toBeDefined();
    expect(onset!.c).toBeGreaterThanOrEqual(0.002);
    expect(onset!.c).toBeLessThanOrEqual(0.03);
  });

  it("POSITIVE CONTROL: the zero-cluster arm is not itself extinct", () => {
    const results = sweepClusterSize([0], [1], 300);
    expect(results[0]!.meanFinalCopies).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/guards/cluster-threshold.test.ts`
Expected: FAIL — cannot resolve `../../tools/sweep-cluster-size.js`.

- [ ] **Step 3: Implement the sweep**

`tools/sweep-cluster-size.ts`:

```ts
import { createWorld, defaultParams, observe, run } from "../sim/index.js";

export interface SweepPoint {
  c: number;
  meanFinalCopies: number;
}

/**
 * Mean final copy number across seeds, for each cluster fraction. Shared by
 * guard 3 and by the browser's threshold readout so that both measure the same
 * thing the same way.
 */
export function sweepClusterSize(
  fractions: number[],
  seeds: number[],
  generations: number,
): SweepPoint[] {
  return fractions.map((c) => {
    let sum = 0;
    for (const seed of seeds) {
      const w = createWorld(
        defaultParams({
          N: 200, S: 3000, c, r0: 0.2, sigmaR: 0.02, sigmaS: 0.005,
          theta: 0.15, v: 0.005, a: 0.0004, b: 0.00001,
          pDom: 0, t: 0, silencingOn: true, sexual: true, seed,
        }),
      );
      run(w, generations);
      sum += observe(w).totalCopies;
    }
    return { c, meanFinalCopies: sum / seeds.length };
  });
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/guards/cluster-threshold.test.ts`
Expected: PASS, 3 tests.

This sweep is 24 runs of 300 generations. If it exceeds roughly two minutes,
submit it through jobd rather than blocking the session:
`job submit --project transposon-genome-ecology --cwd $(pwd) --wait -- npx vitest run tests/guards/cluster-threshold.test.ts`

- [ ] **Step 5: Commit**

```bash
git add tools/sweep-cluster-size.ts tests/guards/cluster-threshold.test.ts
git commit -m "test(guard3): cluster-size repression threshold"
```

---

## Task 15: Guard 1 — the Charlesworth equilibrium ⚠️ BLOCKED

**This task cannot be completed from the reference base as it stands.** Step 1 is
the unblock and must be done first. Every other task in this plan can proceed
without it; nothing depends on this one.

**Files:**
- Modify: `sim/phases/select.ts` (the `copyNumberLoad` function only)
- Modify: `sim/params.ts` (calibrated defaults)
- Modify: `docs/superpowers/specs/2026-09-02-transposon-genome-ecology-design.md` §3.4 and §10
- Create: `tests/guards/equilibrium.test.ts`

- [ ] **Step 1: UNBLOCK — read the source, not the abstract**

Obtain Charlesworth & Charlesworth 1983, "The population dynamics of transposable
elements", *Genetics Research* 42(1):1–27, `10.1017/s0016672300021455`. Extract:

1. The exact fitness function of copy number used in the analytic treatment.
2. The transposition–selection balance condition that gives equilibrium copy number.
3. Whether excision is modelled as a separate rate, and how it enters the balance.

Record all three, with page or equation numbers, in spec §3.4, replacing the
warning block. Move the corresponding entry in spec §10 to resolved.

**Do not proceed past this step by inferring the equations.** The entire point of
this guard is that it is an external check; deriving it from the same intuitions
that produced the model would make it a test that cannot fail.

- [ ] **Step 2: Update `copyNumberLoad` and the defaults**

Replace the provisional body of `copyNumberLoad` in `sim/phases/select.ts` with the
form from Step 1, and set `a`, `b`, `v` and `r0` in `defaultParams()` to values for
which the paper predicts a finite, non-zero equilibrium. Delete the `⚠️ PROVISIONAL`
comment and replace it with a citation naming the equation used.

- [ ] **Step 3: Write the guard**

`tests/guards/equilibrium.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWorld, defaultParams, observe, run } from "../../sim/index.js";

/**
 * GUARD 1 (spec §6). THE CORRECTNESS FLOOR.
 *
 * With the trap and domestication disabled, the model reduces to Charlesworth &
 * Charlesworth 1983. Copy number must settle to a stable, non-zero,
 * non-saturating equilibrium near the analytic prediction.
 *
 * PREDICTED_EQUILIBRIUM below is filled in from the paper in Step 1. It is NOT a
 * value read off this simulation — a constant calibrated from the artifact under
 * test cannot falsify that artifact.
 */
const PREDICTED_EQUILIBRIUM = 0; // ← set in Step 2 from the paper's balance condition
const TOLERANCE = 0.3; // fractional

describe("guard 1: Charlesworth equilibrium", () => {
  const pre = {
    N: 400, S: 4000, silencingOn: false, pDom: 0, c: 0, beta: 0, sexual: true,
  };

  it("settles near the analytic prediction", () => {
    const w = createWorld(defaultParams({ ...pre, seed: 1 }));
    run(w, 2000);
    const perGenome = observe(w).totalCopies / w.genomes.length;
    expect(PREDICTED_EQUILIBRIUM).toBeGreaterThan(0); // fails loudly if Step 2 was skipped
    expect(Math.abs(perGenome - PREDICTED_EQUILIBRIUM) / PREDICTED_EQUILIBRIUM)
      .toBeLessThan(TOLERANCE);
  });

  it("is stable — the last quarter of the run does not drift", () => {
    const w = createWorld(defaultParams({ ...pre, seed: 2 }));
    run(w, 1500);
    const early = observe(w).totalCopies;
    run(w, 500);
    const late = observe(w).totalCopies;
    expect(Math.abs(late - early) / early).toBeLessThan(0.25);
  });

  it("does not saturate the genome", () => {
    const w = createWorld(defaultParams({ ...pre, seed: 3 }));
    run(w, 2000);
    const perGenome = observe(w).totalCopies / w.genomes.length;
    expect(perGenome).toBeLessThan(0.5 * 4000);
  });

  it("does not go extinct", () => {
    const w = createWorld(defaultParams({ ...pre, seed: 4 }));
    run(w, 2000);
    expect(observe(w).totalCopies).toBeGreaterThan(0);
  });

  it("reaches the same equilibrium from a high-copy start", () => {
    const w = createWorld(defaultParams({ ...pre, seed: 5 }));
    for (const g of w.genomes) {
      g.copies = Array.from({ length: 200 }, (_, i) => ({
        id: 100000 + i, site: i, r: defaultParams().r0, s: 0, domesticated: false,
      }));
    }
    run(w, 2000);
    const perGenome = observe(w).totalCopies / w.genomes.length;
    expect(Math.abs(perGenome - PREDICTED_EQUILIBRIUM) / PREDICTED_EQUILIBRIUM)
      .toBeLessThan(TOLERANCE);
  });
});
```

- [ ] **Step 4: Run against a broken model and watch it fail**

Temporarily set `copyNumberLoad` to return `0`, removing selection on copy number.

Run: `npx vitest run tests/guards/equilibrium.test.ts`
Expected: FAIL — copy number runs away to saturation. Confirm both "settles near
the analytic prediction" and "does not saturate the genome" go red.

- [ ] **Step 5: Restore, run, verify it passes**

Run: `npx vitest run tests/guards/equilibrium.test.ts`
Expected: PASS, 5 tests.

The convergence-from-both-directions test is the one that matters: a model that
reaches the right number from below but not from above has a bug, not an
equilibrium.

- [ ] **Step 6: Commit**

```bash
git add sim/phases/select.ts sim/params.ts tests/guards/equilibrium.test.ts docs/superpowers/specs/2026-09-02-transposon-genome-ecology-design.md
git commit -m "test(guard1): Charlesworth equilibrium, calibrated from the 1983 paper"
```

---

## Task 16: The browser toy — field render and run loop

**Files:**
- Modify: `package.json` (add `vite`, add `dev`/`build`/`preview` scripts)
- Create: `vite.config.ts`, `web/index.html`, `web/main.ts`, `web/render/field.ts`

**Interfaces:**
- Consumes: `createWorld`, `defaultParams`, `step`, `observe`, `isSilenced` from `sim/`
- Produces: `drawField(ctx: CanvasRenderingContext2D, world: World, w: number, h: number): void`

- [ ] **Step 1: Add Vite**

Add to `package.json` `devDependencies`: `"vite": "^5.4.0"`. Add to `scripts`:

```json
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  build: { outDir: "../dist", emptyOutDir: true },
});
```

Run `npm install`.

- [ ] **Step 2: Create the page**

`web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Transposons as genome ecology</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0d0f12; color: #d8dee9; font: 13px/1.5 system-ui, sans-serif; }
      #app { display: grid; grid-template-columns: 1fr 320px; height: 100vh; }
      #stage { display: grid; grid-template-rows: 1fr 180px 220px; gap: 8px; padding: 8px; min-width: 0; }
      canvas { width: 100%; height: 100%; display: block; background: #14181d; border-radius: 4px; }
      #controls { padding: 12px; border-left: 1px solid #232830; overflow-y: auto; }
      #controls label { display: block; margin: 10px 0 2px; color: #9aa5b1; }
      #controls input[type="range"] { width: 100%; }
      #readout { font-variant-numeric: tabular-nums; white-space: pre; color: #8fbcbb; }
    </style>
  </head>
  <body>
    <div id="app">
      <div id="stage">
        <canvas id="field"></canvas>
        <canvas id="timeline"></canvas>
        <canvas id="scatter"></canvas>
      </div>
      <div id="controls"><div id="readout"></div></div>
    </div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Implement the field renderer**

`web/render/field.ts`:

```ts
import { isSilenced, type World } from "../../sim/index.js";

/**
 * Genomes as rows, sites as horizontal position. The cluster span is tinted so the
 * trap is visible as a place rather than as an event you have to be told about.
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number,
): void {
  const p = world.params;
  ctx.clearRect(0, 0, width, height);

  const rowH = Math.max(1, height / world.genomes.length);
  const clusterW = (Math.floor(p.c * p.S) / p.S) * width;

  ctx.fillStyle = "#1d2530";
  ctx.fillRect(0, 0, clusterW, height);

  for (let i = 0; i < world.genomes.length; i++) {
    const genome = world.genomes[i]!;
    const y = i * rowH;
    for (const copy of genome.copies) {
      const x = (copy.site / p.S) * width;
      ctx.fillStyle = copy.domesticated
        ? "#a3be8c"
        : isSilenced(copy, genome, p)
          ? "#4c566a"
          : "#bf616a";
      ctx.fillRect(x, y, Math.max(1, width / p.S), Math.max(1, rowH - 0.5));
    }
  }
}
```

- [ ] **Step 4: Implement the run loop**

`web/main.ts`:

```ts
import {
  createWorld, defaultParams, observe, step,
  type Params, type Snapshot, type World,
} from "../sim/index.js";
import { drawField } from "./render/field.js";

const params: Params = defaultParams();
let world: World = createWorld(params);
let snapshots: Snapshot[] = [observe(world)];
/** Generations advanced per animation frame. The toy must feel fast. */
let speed = 3;

const fieldCanvas = document.getElementById("field") as HTMLCanvasElement;
const readout = document.getElementById("readout") as HTMLDivElement;

function fit(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function frame(): void {
  for (let i = 0; i < speed; i++) step(world);
  const snap = observe(world);
  snapshots.push(snap);
  if (snapshots.length > 4000) snapshots = snapshots.slice(-4000);

  const rect = fieldCanvas.getBoundingClientRect();
  drawField(fit(fieldCanvas), world, rect.width, rect.height);

  readout.textContent = [
    `gen        ${snap.generation}`,
    `copies     ${snap.totalCopies}`,
    `active     ${snap.activeCopies}`,
    `silenced   ${snap.silencedCopies}`,
    `domestic.  ${snap.domesticatedCopies}`,
    `mean rate  ${snap.meanRate.toFixed(4)}`,
    `w/ piRNA   ${(snap.fractionWithRepertoire * 100).toFixed(1)}%`,
  ].join("\n");

  requestAnimationFrame(frame);
}

// Exposed for guard 7 and for poking from the console.
Object.assign(window, {
  __sim: {
    get world() { return world; },
    get snapshots() { return snapshots; },
    setSpeed(n: number) { speed = n; },
    reset(overrides: Partial<Params> = {}) {
      world = createWorld(defaultParams({ ...params, ...overrides }));
      snapshots = [observe(world)];
    },
  },
});

requestAnimationFrame(frame);
```

- [ ] **Step 5: Verify it runs**

Run: `npm run dev`, open the printed URL.
Expected: rows of genomes with red marks spreading, the cluster span tinted on the
left, grey marks appearing as silencing takes hold, and the readout ticking.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts web/index.html web/main.ts web/render/field.ts
git commit -m "feat(web): field render and run loop"
```

---

## Task 17: Timeline and scatter

**Files:**
- Create: `web/render/timeline.ts`, `web/render/scatter.ts`
- Modify: `web/main.ts` (draw both each frame)

**Interfaces:**
- Produces:
  - `drawTimeline(ctx, snapshots: Snapshot[], width: number, height: number): void`
  - `drawScatter(ctx, world: World, width: number, height: number): void`

- [ ] **Step 1: Implement the timeline**

`web/render/timeline.ts`:

```ts
import type { Snapshot } from "../../sim/index.js";

/**
 * Total, active and silenced copy counts against generation. This is where a
 * poke's consequence becomes legible, and where Kofler's three phases show up as
 * shape rather than as a number.
 */
export function drawTimeline(
  ctx: CanvasRenderingContext2D,
  snapshots: Snapshot[],
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  if (snapshots.length < 2) return;

  const maxY = Math.max(1, ...snapshots.map((s) => s.totalCopies));
  const xAt = (i: number) => (i / (snapshots.length - 1)) * width;
  const yAt = (v: number) => height - (v / maxY) * height;

  const series: [keyof Snapshot, string][] = [
    ["totalCopies", "#d8dee9"],
    ["activeCopies", "#bf616a"],
    ["silencedCopies", "#5e81ac"],
  ];

  for (const [key, colour] of series) {
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    snapshots.forEach((s, i) => {
      const y = yAt(s[key] as number);
      if (i === 0) ctx.moveTo(xAt(i), y);
      else ctx.lineTo(xAt(i), y);
    });
    ctx.stroke();
  }

  ctx.fillStyle = "#6b7684";
  ctx.fillText(`peak ${maxY}`, 6, 12);
}
```

- [ ] **Step 2: Implement the scatter**

`web/render/scatter.ts`:

```ts
import { isSilenced, type World } from "../../sim/index.js";

/**
 * Every live copy plotted as (s, r): sequence identity against strategy.
 *
 * Families are clusters along x. Strategy is height. Selection on rate is the whole
 * cloud drifting vertically. Escape from silencing is a cluster budding sideways
 * out of a greyed one. One panel, both heritable dimensions.
 */
export function drawScatter(
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number,
): void {
  const p = world.params;
  ctx.clearRect(0, 0, width, height);

  let sMin = Infinity;
  let sMax = -Infinity;
  for (const g of world.genomes) {
    for (const c of g.copies) {
      if (c.s < sMin) sMin = c.s;
      if (c.s > sMax) sMax = c.s;
    }
  }
  if (!Number.isFinite(sMin)) return;
  if (sMax - sMin < 1e-9) { sMin -= 0.5; sMax += 0.5; }

  const xAt = (s: number) => ((s - sMin) / (sMax - sMin)) * width;
  const yAt = (r: number) => height - (Math.min(r, p.rMax) / p.rMax) * height;

  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      ctx.fillStyle = copy.domesticated
        ? "rgba(163,190,140,0.7)"
        : isSilenced(copy, genome, p)
          ? "rgba(76,86,106,0.5)"
          : "rgba(191,97,106,0.55)";
      ctx.fillRect(xAt(copy.s) - 1, yAt(copy.r) - 1, 2, 2);
    }
  }

  ctx.fillStyle = "#6b7684";
  ctx.fillText(`s ∈ [${sMin.toFixed(2)}, ${sMax.toFixed(2)}]   r ∈ [0, ${p.rMax}]`, 6, 12);
}
```

- [ ] **Step 3: Wire both into the frame loop**

In `web/main.ts`, add the imports and the two canvases, and draw them inside
`frame()` after the field:

```ts
import { drawTimeline } from "./render/timeline.js";
import { drawScatter } from "./render/scatter.js";

const timelineCanvas = document.getElementById("timeline") as HTMLCanvasElement;
const scatterCanvas = document.getElementById("scatter") as HTMLCanvasElement;
```

```ts
  const tRect = timelineCanvas.getBoundingClientRect();
  drawTimeline(fit(timelineCanvas), snapshots, tRect.width, tRect.height);

  const sRect = scatterCanvas.getBoundingClientRect();
  drawScatter(fit(scatterCanvas), world, sRect.width, sRect.height);
```

- [ ] **Step 4: Verify**

Run: `npm run dev`.
Expected: the timeline rises then bends; the scatter shows a cloud that spreads
sideways in `s` and drifts vertically in `r`, greying as silencing spreads.

- [ ] **Step 5: Commit**

```bash
git add web/render/timeline.ts web/render/scatter.ts web/main.ts
git commit -m "feat(web): timeline and the s-by-r scatter"
```

---

## Task 18: The pokes

**Files:**
- Create: `web/controls.ts`
- Modify: `web/main.ts` (mount the controls)

**Interfaces:**
- Produces: `mountControls(host: HTMLElement, params: Params, onReset: (o: Partial<Params>) => void): void`

- [ ] **Step 1: Implement the controls**

`web/controls.ts`:

```ts
import type { Params } from "../sim/index.js";

interface Slider {
  key: keyof Params;
  label: string;
  min: number;
  max: number;
  stepSize: number;
}

/** Continuous pokes. These take effect MID-RUN — that is the session shape. */
const SLIDERS: Slider[] = [
  { key: "c", label: "piRNA cluster size (fraction of genome)", min: 0, max: 0.05, stepSize: 0.001 },
  { key: "t", label: "resistance ← → tolerance", min: 0, max: 1, stepSize: 0.01 },
  { key: "v", label: "excision rate", min: 0, max: 0.05, stepSize: 0.001 },
  { key: "pDom", label: "domestication probability", min: 0, max: 0.02, stepSize: 0.0005 },
];

/**
 * Every control mutates the LIVE params object. Nothing here restarts the run
 * except the two explicit buttons — perturbing a running world and watching it
 * respond is the entire verb.
 */
export function mountControls(
  host: HTMLElement,
  params: Params,
  onReset: (overrides: Partial<Params>) => void,
): void {
  for (const s of SLIDERS) {
    const label = document.createElement("label");
    label.textContent = `${s.label}: ${String(params[s.key])}`;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.stepSize);
    input.value = String(params[s.key]);
    input.addEventListener("input", () => {
      (params[s.key] as number) = Number(input.value);
      label.textContent = `${s.label}: ${input.value}`;
    });
    host.append(label, input);
  }

  const silencing = document.createElement("button");
  const paintSilencing = () => {
    silencing.textContent = params.silencingOn ? "knock out silencing" : "restore silencing";
  };
  silencing.addEventListener("click", () => {
    params.silencingOn = !params.silencingOn;
    paintSilencing();
  });
  paintSilencing();

  const sex = document.createElement("button");
  const paintSex = () => {
    sex.textContent = params.sexual ? "go asexual" : "go sexual";
  };
  sex.addEventListener("click", () => {
    params.sexual = !params.sexual;
    paintSex();
  });
  paintSex();

  // Restarts, because they change the founding condition rather than the world.
  const invade = document.createElement("button");
  invade.textContent = "seed a fresh invasion";
  invade.addEventListener("click", () => onReset({ seed: Math.floor(Math.random() * 1e9) }));

  const small = document.createElement("button");
  small.textContent = "shrink the population (more drift)";
  small.addEventListener("click", () => onReset({ N: Math.max(40, Math.floor(params.N / 2)) }));

  for (const b of [silencing, sex, invade, small]) {
    b.style.cssText = "display:block;width:100%;margin-top:8px;padding:6px;cursor:pointer;";
    host.append(b);
  }
}
```

Note the deliberate split: the sliders and the two toggles mutate a running world;
only "seed a fresh invasion" and "shrink the population" restart, because they
change the founding condition rather than the conditions the population is living
under. Restarting for a knockout would destroy the thing you wanted to watch.

- [ ] **Step 2: Mount them**

In `web/main.ts`:

```ts
import { mountControls } from "./controls.js";

mountControls(document.getElementById("controls") as HTMLElement, params, (o) => {
  world = createWorld(defaultParams({ ...params, ...o }));
  snapshots = [observe(world)];
});
```

- [ ] **Step 3: Verify each poke by hand**

Run: `npm run dev`, then confirm:
- Dragging cluster size from 0 upward makes silenced (grey) marks appear.
- "knock out silencing" makes copy count climb; restoring it bends the curve back.
- Pushing tolerance to 1 stops new silencing appearing — no repertoire forms.
- "go asexual" leaves the population running rather than collapsing.

- [ ] **Step 4: Commit**

```bash
git add web/controls.ts web/main.ts
git commit -m "feat(web): mid-run pokes"
```

---

## Task 19: Guard 7 — one implementation

Proves the claim that the artifact played is the artifact validated. Without this,
"one implementation" is an assertion in a design document.

**Files:**
- Modify: `package.json` (add `@playwright/test`)
- Create: `web/hash-harness.html`, `web/hash-harness.ts`
- Create: `tests/guards/one-implementation.test.ts`

- [ ] **Step 1: Add Playwright**

Add `"@playwright/test": "^1.48.0"` to `devDependencies`, run `npm install`, then
`npx playwright install chromium`.

- [ ] **Step 2: Create the browser harness**

`web/hash-harness.html`:

```html
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>hash harness</title></head>
  <body><script type="module" src="./hash-harness.ts"></script></body>
</html>
```

`web/hash-harness.ts`:

```ts
import { createWorld, defaultParams, run, stateHash } from "../sim/index.js";

/** Runs a fixed scenario and publishes its state hash for guard 7. */
const world = createWorld(defaultParams({ N: 120, S: 1500, seed: 31337 }));
run(world, 120);
Object.assign(window, { __stateHash: stateHash(world) });
```

Add the harness as a second Vite entry in `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "web",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "web/index.html"),
        harness: resolve(__dirname, "web/hash-harness.html"),
      },
    },
  },
});
```

- [ ] **Step 3: Write the guard**

`tests/guards/one-implementation.test.ts`:

```ts
import { chromium } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { preview, type PreviewServer } from "vite";
import { createWorld, defaultParams, run, stateHash } from "../../sim/index.js";

let server: PreviewServer;
let origin: string;

beforeAll(async () => {
  server = await preview({ preview: { port: 4321, strictPort: true } });
  origin = server.resolvedUrls!.local[0]!.replace(/\/$/, "");
}, 120_000);

afterAll(async () => {
  await new Promise<void>((res, rej) =>
    server.httpServer.close((e) => (e ? rej(e) : res())),
  );
});

/**
 * GUARD 7 (spec §6). The browser and node must produce a BYTE-IDENTICAL state
 * hash for the same seed and generation count. If they diverge there are two
 * models, and validating one says nothing about the other.
 */
describe("guard 7: one implementation", () => {
  it("browser and node agree on the state hash", async () => {
    const nodeWorld = createWorld(defaultParams({ N: 120, S: 1500, seed: 31337 }));
    run(nodeWorld, 120);
    const nodeHash = stateHash(nodeWorld);

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(`${origin}/hash-harness.html`);
      await page.waitForFunction(() => "__stateHash" in window, undefined, { timeout: 60_000 });
      const browserHash = await page.evaluate(() => (window as never as { __stateHash: string }).__stateHash);
      expect(browserHash).toBe(nodeHash);
    } finally {
      await browser.close();
    }
  }, 180_000);

  it("POSITIVE CONTROL: the node hash is non-trivial", () => {
    const w = createWorld(defaultParams({ N: 120, S: 1500, seed: 31337 }));
    run(w, 120);
    const h = stateHash(w);
    expect(h).toMatch(/^[0-9a-f]{8}$/);
    expect(h).not.toBe("00000000");
  });
});
```

The positive control matters here: without it, a harness that returned an empty
hash from both environments would pass by agreeing on nothing.

- [ ] **Step 4: Run against a broken model and watch it fail**

Temporarily change the browser harness's seed to `31338`.

Run: `npm run build && npx vitest run tests/guards/one-implementation.test.ts`
Expected: FAIL on the hash comparison, with two different eight-character hashes.
That failure is what proves the guard can detect divergence at all.

- [ ] **Step 5: Restore the seed, rebuild, run**

Run: `npm run build && npx vitest run tests/guards/one-implementation.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts web/hash-harness.html web/hash-harness.ts tests/guards/one-implementation.test.ts
git commit -m "test(guard7): browser and node produce identical state"
```

---

## Task 20: Pre-registration and the first experiment

Registers the question before the runner exists, per the `_pm` convention recorded
in `README.md`.

**Files:**
- Create: `docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md`
- Create: `experiments/001-per-copy-vs-family-rate.ts`
- Create: `docs/analysis/theme.R`, `docs/analysis/plot-001.R`

- [ ] **Step 1: Write the pre-registration, and commit it BEFORE the runner**

`docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md`:

```markdown
# Pre-registration — per-copy versus family-level rate heritability

**Registered:** 2026-09-02, before any runner existed.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`

## Question

Does per-copy rate heritability change invasion outcomes relative to family-level
rate, holding everything else fixed?

## Why it is worth asking

Every simulation in `../REFERENCES.md` models transposition rate at the family
level — Kofler 2019 and 2020, Bourgeois et al. 2020, Tomar et al. 2023. This model
places it on the copy. If the two agree, the literature's abstraction is
vindicated and this model is a more expensive way to get the same answer. If they
disagree, the abstraction is hiding something.

## Arms

- **per-copy:** `sigmaR = 0.05`. Daughters inherit a mutated rate.
- **family-level:** `sigmaR = 0`, with the founding rate resampled per replicate
  from the same lognormal spread. Rate varies BETWEEN runs, never WITHIN one.

Everything else identical. 40 seeds per arm, 600 generations.

## Pre-specified outcomes

1. **Final copy number per genome**, mean across seeds.
2. **Extinction rate** — the fraction of seeds reaching zero copies.
3. **Time to inactivation**, via `detectPhases`; undefined runs are excluded and
   the exclusion count is reported.

## Pre-specified analysis

Welch's t-test on outcome 1; two-proportion test on outcome 2; Welch's t-test on
outcome 3 among runs where both arms reached inactivation.

## What would falsify the design decision

If the arms are indistinguishable on all three outcomes, per-copy heritability
buys nothing, and the spec §2 unit decision was more expensive than it was worth.
**That result gets written up, not buried.**

## Deviations

Any change to arms, seeds, generations or outcomes after this file is committed
must be recorded below with its date and reason.
```

```bash
git add docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md
git commit -m "docs: pre-register the per-copy vs family-level rate question"
```

- [ ] **Step 2: Write the runner**

`experiments/001-per-copy-vs-family-rate.ts`:

```ts
import { writeFileSync } from "node:fs";
import {
  createWorld, defaultParams, detectPhases, history, makeRng, observe,
} from "../sim/index.js";

/**
 * Registered question: docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md
 * Emits CSV. Figures are made in R — see docs/analysis/plot-001.R.
 */
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const GENERATIONS = 600;
const BASE = {
  N: 300, S: 3000, c: 0.02, r0: 0.2, sigmaS: 0.005, theta: 0.15,
  v: 0.005, a: 0.0004, b: 0.00001, pDom: 0, t: 0,
  silencingOn: true, sexual: true,
};

interface Row {
  arm: string;
  seed: number;
  finalCopiesPerGenome: number;
  extinct: number;
  timeToInactivation: number | "NA";
}

const rows: Row[] = [];

for (const seed of SEEDS) {
  for (const arm of ["per-copy", "family-level"] as const) {
    // Family-level: no within-run mutation, but the founding rate is drawn from
    // the same lognormal spread so that variation exists BETWEEN runs.
    const jitter = makeRng(seed * 7919);
    const r0 = arm === "family-level"
      ? BASE.r0 * Math.exp(jitter.normal() * 0.05)
      : BASE.r0;
    const sigmaR = arm === "per-copy" ? 0.05 : 0;

    const world = createWorld(defaultParams({ ...BASE, r0, sigmaR, seed }));
    const h = history(world, GENERATIONS);
    const final = observe(world);
    const phases = detectPhases(h);

    rows.push({
      arm,
      seed,
      finalCopiesPerGenome: final.totalCopies / world.genomes.length,
      extinct: final.totalCopies === 0 ? 1 : 0,
      timeToInactivation: phases ? phases.inactivation : "NA",
    });
  }
}

const header = "arm,seed,final_copies_per_genome,extinct,time_to_inactivation";
const body = rows
  .map((r) => `${r.arm},${r.seed},${r.finalCopiesPerGenome},${r.extinct},${r.timeToInactivation}`)
  .join("\n");
writeFileSync("experiments/001-per-copy-vs-family-rate.csv", `${header}\n${body}\n`);
console.log(`wrote ${rows.length} rows`);
```

- [ ] **Step 3: Run it**

Run: `npx tsx experiments/001-per-copy-vs-family-rate.ts`
Expected: `wrote 80 rows`, and a CSV in `experiments/`.

80 runs of 600 generations. If this exceeds roughly five minutes, submit through
jobd instead of blocking the session:
`job submit --project transposon-genome-ecology --cwd $(pwd) --wait -- npx tsx experiments/001-per-copy-vs-family-rate.ts`

- [ ] **Step 4: Write the house plotting theme and the figure script**

`docs/analysis/theme.R`:

```r
# The project's single plotting house style. Every figure script sources this
# file; restyle here, never inline.
library(ggplot2)

palette_tge <- c("per-copy" = "#bf616a", "family-level" = "#5e81ac")

theme_tge <- function(base_size = 11) {
  theme_minimal(base_size = base_size) +
    theme(
      panel.grid.minor = element_blank(),
      panel.grid.major = element_line(colour = "grey90", linewidth = 0.3),
      axis.title = element_text(colour = "grey25"),
      plot.title = element_text(face = "bold", size = base_size + 2),
      plot.subtitle = element_text(colour = "grey35"),
      legend.position = "top"
    )
}
```

`docs/analysis/plot-001.R`:

```r
# One graph, one figure. Sources the house theme; defines no styling of its own.
source("docs/analysis/theme.R")

d <- read.csv("experiments/001-per-copy-vs-family-rate.csv")

p <- ggplot(d, aes(x = arm, y = final_copies_per_genome, fill = arm)) +
  geom_boxplot(outlier.shape = NA, alpha = 0.55, width = 0.5) +
  geom_jitter(width = 0.12, size = 1.2, alpha = 0.7) +
  scale_fill_manual(values = palette_tge, guide = "none") +
  labs(
    title = "Final copy number per genome, by rate-heritability arm",
    subtitle = "40 seeds per arm, 600 generations",
    x = NULL, y = "copies per genome"
  ) +
  theme_tge()

ggsave("docs/analysis/fig-001-final-copies.png", p, width = 6, height = 4.5, dpi = 200)

cat("\n--- pre-registered test: Welch's t on final copy number ---\n")
print(t.test(final_copies_per_genome ~ arm, data = d))
```

- [ ] **Step 5: Produce the figure and record the result**

Run: `Rscript docs/analysis/plot-001.R`
Expected: `docs/analysis/fig-001-final-copies.png`, and the t-test printed.

Write the outcome into `docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md`
under a new "Result" heading — **including if the arms are indistinguishable.**
That outcome falsifies the spec §2 unit decision and is the most useful thing this
experiment can produce.

- [ ] **Step 6: Commit**

```bash
git add experiments/ docs/analysis/ docs/pre-registrations/
git commit -m "feat(experiments): registered question 001, per-copy vs family-level rate"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task:

| spec | task |
| --- | --- |
| §3.1 state, two heritable traits, derived silencing | 2, 3 |
| §3.2 six phases | 4, 5, 6, 7, 8, 9 |
| §3.3 emergent families, escape, resurrection | 3, 11 |
| §3.4 parameters | 2, 15 |
| §4 the seven pokes | 18 |
| §5 field, timeline, scatter | 16, 17 |
| §6 guards 1–7 | 15, 13, 14, 12, 10, 11, 19 |
| §7 layout, R+ggplot2 figures | 1, 20 |
| §8 registered question | 20 |
| §9 out of scope | not built, by construction |
| §10 open items | 15 step 1 |

**Placeholder scan.** No TBDs. The one deliberately unfilled value —
`PREDICTED_EQUILIBRIUM` in Task 15 — is written as a failing assertion
(`expect(PREDICTED_EQUILIBRIUM).toBeGreaterThan(0)`) so that skipping Step 2 makes
the guard go red rather than silently pass.

**Type consistency.** `Copy`, `Genome`, `World`, `Params`, `Snapshot`,
`PhaseIndices` and `SweepPoint` are each defined once and imported everywhere else.
Phase functions all share the shape `(world: World) => void`; pure functions
(`fitness`, `copyNumberLoad`, `damageLoad`, `isSilenced`) take `Params` explicitly.
`sim/index.ts` is the only import surface used by `web/`, `tests/guards/`,
`tools/` and `experiments/`.

**Ordering note.** Tasks 1–9 build the model; 10–14 are guards that can run as soon
as the model exists; 15 is blocked on external reading and can be deferred without
blocking anything else; 16–18 build the toy; 19 ties the two environments together
and needs 16 to exist; 20 needs 13 (`detectPhases`).
