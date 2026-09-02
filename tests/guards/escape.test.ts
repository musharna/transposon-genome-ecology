import { describe, expect, it } from "vitest";
import {
  createWorld,
  defaultParams,
  isSilenced,
  type Copy,
  type Genome,
  type Params,
  silencedCopies,
} from "../../sim/index.js";
import { transpose } from "../../sim/phases/transpose.js";

/**
 * GUARD 6 (spec §6) — a sublineage that diverges far enough in s ESCAPES a trap
 * that is already established and still catching its parent.
 *
 * The whole point is that escape is not implemented. There is no `escaped` flag,
 * no escape branch, no "if diverged then release" anywhere in `sim/`. Silenced
 * status is DERIVED at exactly one line — `sim/silencing.ts:15`,
 * `Math.abs(copy.s - entry) <= p.theta` — and escape is the arithmetic
 * consequence of a daughter's `s` walking out of that window. This guard exists
 * to prove the consequence actually happens, and that it is selective: the
 * founder never escapes, while its diverged descendants do.
 *
 * ------------------------------------------------------------------------------
 * WHY THE SETUP LOOKS THE WAY IT DOES
 * ------------------------------------------------------------------------------
 * Only `transpose` is called, never `step`. That is deliberate: reproduction,
 * excision, selection and trapping would each move the copy set for reasons that
 * have nothing to do with sequence divergence, and the claim under test is about
 * divergence alone. With `r0 = rMax = 1` every active copy transposes every
 * generation (`world.rng.next() >= parent.r` can never hold, since `next()` is in
 * [0, 1)), so the only thing that can stop a lineage growing is being silenced.
 * Copy count therefore reports silencing directly.
 *
 * Two copies are seeded by hand. The founder at `s = 0` is inside `theta` of the
 * single repertoire entry `0`, so it is silenced and cannot transpose — it is
 * there only to establish the trap and to be the thing that does NOT escape. The
 * second copy at `s = 0.2` sits at 2 * theta, outside the window, and is the root
 * of the sublineage. `nextCopyId` is reset to 2 after the hand-seeding, or the
 * first daughter would be minted with id 1 and collide with the seeded copy;
 * `transpose` never reads `id`, so this is hygiene, not behaviour (verified: the
 * seed-55 arm produces the identical 206 copies either way).
 *
 * ------------------------------------------------------------------------------
 * WHAT WAS MEASURED (scripts/explore-escape.ts prints every number below)
 * ------------------------------------------------------------------------------
 * Arm A, sigmaS = 0.5, 8 generations, over the 11 seeds in SEEDS:
 *
 *   seed   55    1    2    3    7    9  101  202  303  404  505
 *   total 206  244  194  172  196  228  210  214  216  145  178
 *   escap 190  231  181  160  181  220  194  199  203  129  165
 *   caught 16   13   13   12   15    8   16   15   13   16   13
 *   max|s| 3.01 2.95 2.63 2.80 2.48 3.17 2.78 2.43 2.51 2.36 3.05
 *
 * The founder is silenced at every seed, before and after the run. Arm B, the
 * same thing with sigmaS = 0, is identical at all 11 seeds: 257 copies, 256
 * escaped, 1 caught (the founder), max|s| exactly 0.2.
 *
 * Every figure in this file was measured in this task.
 */

/**
 * Fully pinned — all 20 fields, nothing inherited from `defaultParams`'
 * provisional values, because a guard's configuration is part of the guard.
 *
 * Ten of the twenty are inert here and are pinned to zero/false so the arm reads
 * as what it is: `v, a, b, d, dTol, t, pDom, wDom, sexual, silencingOn` are read
 * only by `lifecycle`, `select`, `reproduce` and `trap`, none of which this file
 * calls. Note in particular that `silencingOn` is NOT consulted by
 * `isSilenced` — the master switch lives in `trap.ts`, which only governs whether
 * new entries are CAPTURED into a repertoire; a repertoire that already exists
 * silences either way. That was verified rather than assumed: re-running the
 * seed-55 arm with all ten fields at their `defaultParams` values instead
 * reproduces the run bit for bit (identical site/r/s for all 206 copies), as does
 * flipping `silencingOn` to false on its own.
 *
 * `c = 0` and `beta = 0` remove the cluster and beneficial spans so that the
 * hand-placed sites 1000 and 1001 are ordinary sites. `S = 5000` keeps occupancy
 * at most 257/5000 = 5.1%, far from the point where `transpose`'s rejection
 * sampler starts retrying, and far from its `occupied.size >= p.S` break.
 */
const BASE: Params = {
  N: 1,
  S: 5000,
  c: 0,
  r0: 1,
  rMax: 1,
  sigmaR: 0,
  sigmaS: 0.5,
  theta: 0.1,
  v: 0,
  a: 0,
  b: 0,
  d: 0,
  dTol: 0,
  t: 0,
  beta: 0,
  pDom: 0,
  wDom: 0,
  sexual: false,
  silencingOn: true,
  seed: 55,
};

/** Eight generations of unchecked doubling: enough for 2^8 = 256 descendants. */
const GENERATIONS = 8;

/**
 * The seed set every claim below is checked at. 55 is the arm the exact numbers
 * in the comments were read off; 101/202/303/404/505 are the seeds the Guard 5
 * sweeps already use; 1/2/3/7/9 are small values. No claim in this file rests on
 * a single seed.
 */
const SEEDS = [55, 1, 2, 3, 7, 9, 101, 202, 303, 404, 505] as const;

const FOUNDER_ID = 0;
/** 2 * theta: outside the silencing window, so the sublineage root is active. */
const SEED_S = 0.2;

interface Arm {
  p: Params;
  g: Genome;
  founder: Copy;
  escaped: Copy[];
}

/**
 * One genome, one silenced founder, one active copy at SEED_S, GENERATIONS rounds
 * of transposition and nothing else.
 */
function runArm(seed: number, sigmaS: number): Arm {
  const p = defaultParams({ ...BASE, seed, sigmaS });
  const w = createWorld(p);
  const g = w.genomes[0]!;
  g.copies = [
    { id: FOUNDER_ID, site: 1000, r: 1, s: 0, domesticated: false },
    { id: 1, site: 1001, r: 1, s: SEED_S, domesticated: false },
  ];
  g.repertoire = [0];
  w.nextCopyId = 2;

  for (let i = 0; i < GENERATIONS; i++) transpose(w);

  return {
    p,
    g,
    founder: g.copies.find((c) => c.id === FOUNDER_ID)!,
    escaped: g.copies.filter((c) => !isSilenced(c, g, p)),
  };
}

describe("guard 6: escape by divergence", () => {
  /**
   * TEST 1. Divergence produces escape from an established trap, while the
   * founder that trap was built around stays caught.
   *
   * The two thresholds are floors under the WEAKEST of the eleven seeds, not
   * around the value at seed 55, so neither is tuned to one stream.
   */
  it("a diverged sublineage escapes a repertoire its founder stays caught by", () => {
    for (const seed of SEEDS) {
      const before = defaultParams({ ...BASE, seed });
      const w = createWorld(before);
      const g0 = w.genomes[0]!;
      g0.copies = [{ id: 0, site: 1000, r: 1, s: 0, domesticated: false }];
      g0.repertoire = [0];
      // PRECONDITION: the trap is established and does catch the founder, so
      // "escape" below is escape from something real rather than from nothing.
      expect(
        isSilenced(g0.copies[0]!, g0, before),
        `seed ${seed}: the founder at s=0 is not caught by repertoire [0] at theta=${before.theta}`,
      ).toBe(true);

      const { p, g, founder, escaped } = runArm(seed, BASE.sigmaS);

      // CONTROL, asserted before the escape claim: the trap is STILL catching
      // copies at the end of the run. Without this, an `isSilenced` that had
      // degenerated to `false` would satisfy every escape assertion below.
      // Measured caught counts across the eleven seeds: 8..16.
      expect(
        silencedCopies(g, p).length,
        `seed ${seed}: nothing at all is silenced after ${GENERATIONS} generations, so "escaped" is meaningless`,
      ).toBeGreaterThan(0);

      // THE CLAIM. Measured escaped counts 129..231 across the eleven seeds
      // (190 of 206 copies at seed 55). The floor of 100 sits 22% below the
      // weakest seed (404, 129 escaped) and goes red the moment silencing stops
      // being a function of sequence distance — under an `isSilenced` that
      // ignores theta the sublineage never transposes and this set is empty.
      expect(
        escaped.length,
        `seed ${seed}: only ${escaped.length} of ${g.copies.length} copies escaped`,
      ).toBeGreaterThan(100);

      // Escape MEANS "outside theta of every repertoire entry" — re-derived here
      // from the copies' own coordinates rather than from `isSilenced`. With the
      // live model and repertoire [0] this is true by construction; it is not
      // unfailable, because it goes red for any predicate that stops meaning
      // "within theta" (an always-false one admits the founder at s = 0, giving
      // min |s| = 0). Measured min over the escaped set: 0.1003..0.1272.
      const minAbsS = Math.min(...escaped.map((c) => Math.abs(c.s)));
      expect(
        minAbsS,
        `seed ${seed}: an escaped copy sits at |s|=${minAbsS}, inside theta=${p.theta}`,
      ).toBeGreaterThan(p.theta);

      // ...and the divergence is not marginal. Measured max |s| 2.36..3.17
      // across the eleven seeds (3.0141555526826873 at seed 55). Asserted at
      // 10 * theta = 1.0, which the weakest seed (404, 2.3638) clears by 2.4x;
      // it fails if divergence at that seed collapses by 58%.
      const maxAbsS = Math.max(...escaped.map((c) => Math.abs(c.s)));
      expect(
        maxAbsS,
        `seed ${seed}: the escaped set only reaches |s|=${maxAbsS}`,
      ).toBeGreaterThan(10 * p.theta);

      // And the founder — the copy the repertoire was built around — is still
      // caught after all of it. Escape is a property of the diverged sublineage,
      // not a decay of the trap. True at all eleven seeds.
      expect(
        isSilenced(founder, g, p),
        `seed ${seed}: the founder at s=${founder.s} stopped being silenced`,
      ).toBe(true);
    }
  });

  /**
   * TEST 2. Turn divergence off and the escape of test 1 does not happen: the
   * sublineage stays exactly where it was seeded and never reaches the |s| that
   * test 1 demands. This is the contrast that makes test 1 about DIVERGENCE
   * rather than about transposition.
   *
   * The negative claims here ("nothing moved", "nothing got further out") are
   * carried by a positive control asserted first: the population really did grow.
   * Without it the assertions would range over an empty or inert set — which is
   * precisely how the first draft of this test was vacuous, passing identically
   * with sigmaS turned fully up.
   */
  it("with no sequence drift nothing diverges and nothing escapes beyond the seeded copy", () => {
    for (const seed of SEEDS) {
      const { p, g, founder, escaped } = runArm(seed, 0);

      // POSITIVE CONTROL. Measured 257 copies at every one of the eleven seeds.
      // The floor of 100 is deliberately below BOTH that and the 145..244 copies
      // the same arm produces when the daughter's s is perturbed regardless of
      // sigmaS, so this control stays green under the mutation the assertions
      // below are meant to catch, and only goes red if transposition itself dies.
      expect(
        g.copies.length,
        `seed ${seed}: only ${g.copies.length} copies exist, so the no-drift assertions would be vacuous`,
      ).toBeGreaterThan(100);

      // NO DIVERGENCE, exactly. `parent.s + world.rng.normal() * 0` is
      // `parent.s` identically in IEEE-754 (a finite double times zero is +-0,
      // and x + -0 === x), so every descendant of the seeded copy must carry
      // 0.2 as the SAME double, not a nearby one. `toBeCloseTo` would absorb a
      // real drift; `===` cannot. Verified true for all 256 descendants at all
      // eleven seeds. (`transpose` still CONSUMES the normal() draw when sigmaS
      // is 0 — that is load-bearing for the RNG stream and must not be
      // "optimised" away; this assertion is about its effect, not its existence.)
      const drifted = g.copies.filter(
        (c) => c.id !== FOUNDER_ID && c.s !== SEED_S,
      );
      expect(
        drifted.length,
        `seed ${seed}: ${drifted.length} descendants drifted off s=${SEED_S}, first at s=${drifted[0]?.s}`,
      ).toBe(0);

      // NO ESCAPE BEYOND THE SEED, exactly. This is the assertion that pairs
      // against test 1's `> 10 * theta`: there, max |s| reaches 2.36..3.17;
      // here it is exactly the 0.2 it was seeded at and never more.
      const maxAbsS = Math.max(...escaped.map((c) => Math.abs(c.s)));
      expect(
        maxAbsS,
        `seed ${seed}: the escaped set reached |s|=${maxAbsS} without any drift`,
      ).toBe(SEED_S);

      // Perfect doubling, which is the same fact told through copy count: with
      // nothing drifting, nothing new is ever caught, so every descendant stays
      // active and the active set doubles all 8 generations. 2^8 + 1 inert
      // founder = 257, measured at every seed. Under drift it is 145..244.
      expect(g.copies.length, `seed ${seed}: copy count`).toBe(
        2 ** GENERATIONS + 1,
      );

      // The founder is still the only caught copy: the trap caught exactly what
      // it was built to catch and nothing wandered into it.
      expect(
        silencedCopies(g, p).map((c) => c.id),
        `seed ${seed}`,
      ).toEqual([FOUNDER_ID]);
      expect(isSilenced(founder, g, p), `seed ${seed}`).toBe(true);
    }
  });

  /**
   * TEST 3. The mechanism the other two rest on: a silenced copy does not
   * transpose at all. `transpose` iterates `activeCopies`, which filters on
   * `isSilenced`, so a caught copy contributes nothing — and that is why copy
   * count is a legible readout of silencing in tests 1 and 2.
   *
   * The negative claim ("the trapped genome does not grow") is carried by a
   * matched positive control in the same body: the SAME genome, the SAME seed,
   * the SAME copy, with the repertoire emptied, does grow. Without it, a
   * `transpose` that had stopped working entirely would read as a passing guard.
   */
  it("a silenced copy cannot transpose, while the same copy untrapped can", () => {
    for (const seed of SEEDS) {
      const p = defaultParams({ ...BASE, seed });

      const onceWithRepertoire = (repertoire: number[]): Genome => {
        const w = createWorld(p);
        const g = w.genomes[0]!;
        g.copies = [
          { id: FOUNDER_ID, site: 1000, r: 1, s: 0, domesticated: false },
        ];
        g.repertoire = repertoire;
        w.nextCopyId = 1;
        transpose(w);
        return g;
      };

      // POSITIVE CONTROL FIRST. Empty repertoire, so nothing is silenced; r = 1
      // makes transposition certain, so exactly one daughter must appear.
      // Measured: 2 copies at every one of the eleven seeds.
      const free = onceWithRepertoire([]);
      expect(
        free.copies.length,
        `seed ${seed}: an unsilenced copy at r=1 failed to transpose, so this test cannot distinguish anything`,
      ).toBe(2);

      // THE CLAIM. Same copy, same seed, a repertoire that catches it: no
      // daughter. Measured: 1 copy at every one of the eleven seeds.
      const trapped = onceWithRepertoire([0]);
      expect(
        trapped.copies.length,
        `seed ${seed}: a silenced copy transposed — ${trapped.copies.length} copies where 1 was expected`,
      ).toBe(1);
    }
  });
});
