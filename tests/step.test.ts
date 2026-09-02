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
  // This pins the exact RNG stream produced by 15 generations of the six
  // phases (transpose, trap, domesticate, lose, reproduce's selection +
  // reproduction) run in the order `step` composes them, for a fixed seed,
  // fixed params (spelled out here rather than relying on `defaultParams()`
  // alone, so a future recalibration of the defaults cannot silently
  // invalidate this test), and a fixed generation count.
  //
  // The coverage claim below is about THIS pinned configuration, not the
  // phases in the abstract — a coverage claim that can't be checked against
  // measured numbers is exactly how an inert guard slips through review.
  // Measured (by instrumenting `world.rng` around each phase call, for this
  // exact seed/params/generation-count, node v22.14.0):
  //
  //   transpose:   765 next() + 556 normal() draws
  //   trap:         31 next() draws
  //   domesticate: 172 next() draws
  //   lose:       2179 next() draws
  //   reproduce:  5055 next() draws
  //
  // Every one of those five counts is nonzero, which is the property the
  // first version of this test lacked: under r0: 0.2, no copy ever landed on
  // a beneficial site in 15 generations, so `domesticate` made zero draws,
  // and deleting the `domesticate(world)` call from `step`, or swapping it
  // with either neighbour (trap<->domesticate, domesticate<->lose), left
  // this hash unchanged — an inert guard for exactly the phase that is the
  // model's alternate win condition. r0: 0.6 (the smallest change found that
  // fixes it) was verified, for this seed/params/generation-count, to make
  // EVERY one of the five single-phase omissions and EVERY one of the four
  // adjacent-pair swaps change the hash — see task-9-report.md for the full
  // before/after table.
  //
  // End state at generation 15 (also measured, not assumed): 153 total
  // copies across 24 genomes (0 empty — versus 18 copies/8 empty under the
  // old r0: 0.2 pinning), 4 domesticated, 149 silenced, 0 active. The
  // domesticated field of the hashed string is therefore NOT a hardcoded
  // constant across copies (4 of 153 are 1, not 0 as under the old pinning).
  // activeCopies is still 0 at this exact generation — every non-domesticated
  // copy has drifted within `theta` of some repertoire entry by generation
  // 15, which is expected for a single-founder lineage under a pure-resistance
  // host (t: 0) with no active-copy-specific behaviour left to distinguish in
  // the hash anyway (the hash records site/r/s/domesticated, not silenced
  // status) — flagging so a future param edit that changes this ratio is
  // visible against a written baseline, not so this test asserts it.
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
      r0: 0.6,
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
    expect(stateHash(w)).toBe("9c15fd28");
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

  // ADDITIVE — closes a gap the mutation sweep found: "partitions total into
  // active, silenced and domesticated" above drives a real run, which at
  // N=30/10 generations from defaultParams's pDom=0.001 produces zero
  // domesticated copies almost every time, so a mutant that double-counts a
  // domesticated copy into the active tally has nothing to double and
  // survives. This test hand-builds a genome with one guaranteed copy of
  // each kind so the tally can't accidentally be vacuously true.
  it("excludes domesticated copies from both the active and silenced tallies", () => {
    const w = createWorld(defaultParams({ N: 1 }));
    w.genomes[0]!.repertoire = [0];
    w.genomes[0]!.copies = [
      // Would match the repertoire (|0-0|<=theta) but is exempt: domesticated.
      { id: 0, site: 10, r: 0.1, s: 0, domesticated: true },
      // Matches the repertoire entry within theta, not domesticated: silenced.
      { id: 1, site: 20, r: 0.2, s: 0, domesticated: false },
      // Far outside theta from the only repertoire entry: active.
      { id: 2, site: 30, r: 0.3, s: 5, domesticated: false },
    ];
    const s = observe(w);
    expect(s.totalCopies).toBe(3);
    expect(s.domesticatedCopies).toBe(1);
    expect(s.silencedCopies).toBe(1);
    expect(s.activeCopies).toBe(1);
  });
});

describe("history", () => {
  it("returns one snapshot per generation plus the initial state", () => {
    const w = createWorld(defaultParams({ N: 20 }));
    expect(history(w, 25)).toHaveLength(26);
  });
});
