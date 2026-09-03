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
  // ⚠️ AND IT IS BLIND TO THE ORDER OF `genome.repertoire`, which `stateHash`
  // digests positionally. All 24 genomes hold exactly ONE entry at generation
  // 15 here, so insertion order and sorted order are the same string. The
  // second pin below covers that and carries the measurement; three documents
  // in this repo asserted that this pin would catch it, and they were wrong.
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

  // GOLDEN VALUE #2 — REPERTOIRE ORDER. DO NOT UPDATE THE LITERAL TO MAKE THIS
  // PASS, for the same reasons as the pin above.
  //
  // ⚠️ WHY A SECOND PIN EXISTS: THE PIN ABOVE IS BLIND TO REPERTOIRE ORDER, AND
  // THIS PROJECT SPENT THREE DOCUMENTS BELIEVING OTHERWISE. `docs/ROADMAP.md`,
  // `web/main.ts` and `web/render/field.ts` all recorded that keeping
  // `genome.repertoire` sorted "changes that array's ORDER, and `stateHash`
  // reads it", so the change would "need its own task and a check against
  // golden hash `9c15fd28`". On 2026-09-03 `sim/phases/trap.ts` was changed
  // from `push` to a sorted insert and THE HASH DID NOT MOVE — it is still
  // `9c15fd28`, from the same run that produced every other figure in this
  // file.
  //
  // Measured, at the pinned configuration above, generation 15: all 24 genomes
  // hold EXACTLY ONE repertoire entry (`[1,1,1,...]`, 24 of 24), and a
  // one-element array digests identically whatever order it is in. The reason
  // is in the parameters: `theta / sigmaS` is 0.1 / 0.02 = 5, which by this
  // project's own classification (`web/params.ts:22-23`,
  // `tests/guards/bloat-arm.ts`) is the regime where one captured entry
  // silences a whole family at once — so `trap`'s "already covered" skip
  // (`sim/phases/trap.ts:22`) rejects every later candidate and a second entry
  // never appears. `stateHash` is the project's determinism oracle, and for the
  // one observable this change has it could not fail.
  //
  // So this pin runs a configuration where the repertoire is MULTI-ENTRY. It is
  // `TOY_DEFAULTS` at `N: 20`, which is the regime the toy actually runs
  // (`theta / sigmaS` = 0.04 / 0.08 = 0.5, i.e. escape by divergence is
  // routine, so captures keep accumulating), spelled out in full rather than
  // imported so a recalibration of `TOY_DEFAULTS` cannot silently invalidate
  // the literal — the same argument the pin above makes about `defaultParams`.
  //
  // Measured for THIS configuration at generation 300, node v22.14.0:
  //
  //   - 20 of 20 genomes hold 2 or more repertoire entries; the largest holds 6;
  //   - 700 total copies, of which 611 active, 77 silenced and 12 domesticated,
  //     so no field of the digested string is constant across copies;
  //   - hash with the sorted insert:                         3c7584d8
  //   - hash with `push` (the code as it stood at 29fff12):  fd9b48d0
  //
  // Those last two lines are the coverage claim, and they are a measurement,
  // taken by running this exact configuration in a worktree at 29fff12 — every
  // other figure above is identical between the two runs, including
  // `totalCopies` 700 and the 20-of-20 multi-entry count, so the hash moved on
  // the ORDER and on nothing else. This pin sees repertoire order. The one
  // above does not: it returns 9c15fd28 in both trees.
  //
  // What it does NOT claim: it is not a second RNG-stream guard with its own
  // per-phase draw counts. The pin above is that, and it stays the one to read
  // when the stream moves.
  it("pins repertoire ORDER, which the golden pin above cannot see", () => {
    const params = defaultParams({
      N: 20,
      S: 1000,
      c: 0.005,
      r0: 0.1,
      rMax: 0.2,
      sigmaR: 0.05,
      sigmaS: 0.08,
      theta: 0.04,
      v: 0.01,
      a: 0.001,
      b: 0.001,
      d: 0.0005,
      dTol: 0.002,
      t: 0,
      beta: 0.02,
      pDom: 0.02,
      wDom: 0.01,
      sexual: true,
      silencingOn: true,
      seed: 777,
    });
    const w = createWorld(params);
    run(w, 300);

    // THE PIN'S OWN PRECONDITION, ASSERTED RATHER THAN TRUSTED. A hash pinned
    // over single-entry repertoires cannot see their order, which is exactly
    // how the pin above went inert for this change. If a future parameter edit
    // collapses this configuration back to one entry per genome, this fails
    // here — naming the reason — instead of passing while testing nothing.
    const multi = w.genomes.filter((g) => g.repertoire.length >= 2).length;
    expect(
      multi,
      "every genome must hold 2+ repertoire entries or the hash below cannot see their order",
    ).toBe(20);

    expect(stateHash(w)).toBe("3c7584d8");
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
