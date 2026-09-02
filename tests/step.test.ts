import { describe, expect, it } from "vitest";
import {
  createWorld,
  defaultParams,
  history,
  observe,
  run,
  stateHash,
  step,
} from "../sim/index.js";

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
    const w = createWorld(
      defaultParams({ N: 20, S: 60, r0: 0.8, v: 0, a: 0, b: 0 }),
    );
    run(w, 40);
    expect(w.genomes.every((g) => g.copies.length <= 60)).toBe(true);
  });

  // GOLDEN VALUE — DO NOT UPDATE THE LITERAL TO MAKE THIS PASS.
  //
  // This pins the exact RNG stream produced by one fixed generation of six
  // phases (transpose, trap, domesticate, lose, reproduce's selection +
  // reproduction) run in the order `step` composes them, for a fixed seed,
  // fixed params (spelled out here rather than relying on `defaultParams()`
  // alone, so a future recalibration of the defaults cannot silently
  // invalidate this test), and a fixed generation count.
  //
  // It defends against exactly one failure mode: an extra or missing
  // `world.rng.next()`/`world.rng.normal()` call anywhere in any phase, or a
  // reordering of the six phases in `step`. Either one shifts every random
  // draw downstream of it, and every statistical/determinism test in this
  // suite is blind to that shift — self-comparison tests (like "is
  // deterministic for a seed" above) compare the implementation to itself
  // and pass no matter how the stream is generated, and tolerance-windowed
  // statistical tests absorb small shifts.
  //
  // If this test fails, DO NOT update the literal to match the new output.
  // Determine WHY the RNG stream moved — inspect which phase now calls
  // `next()`/`normal()` a different number of times, or whether phase order
  // changed — before deciding whether the change was intended. A genuinely
  // intended model change (e.g. adding a new mutation draw) will also break
  // this test; that is the point, not a false positive.
  it("pins the exact state after a fixed run — golden RNG-stream regression guard", () => {
    const params = defaultParams({
      N: 24,
      S: 100,
      c: 0.1,
      r0: 0.2,
      rMax: 1,
      sigmaR: 0.1,
      sigmaS: 0.02,
      theta: 0.1,
      v: 0.01,
      a: 0.001,
      b: 0.0005,
      d: 0.0005,
      dTol: 0.002,
      t: 0,
      beta: 0.1,
      pDom: 0.01,
      wDom: 0.01,
      sexual: true,
      silencingOn: true,
      seed: 777,
    });
    const w = createWorld(params);
    run(w, 15);
    expect(stateHash(w)).toBe("13e0c227");
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
    expect(s.activeCopies + s.silencedCopies + s.domesticatedCopies).toBe(
      s.totalCopies,
    );
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
