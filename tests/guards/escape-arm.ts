/**
 * The Guard 6 arm, defined ONCE.
 *
 * `tests/guards/escape.test.ts` asserts against this arm and
 * `scripts/explore-escape.ts` derives the guard's thresholds from it. Before this
 * module existed the two files each carried their own hand-maintained copy of
 * `BASE`, `SEEDS` and `GENERATIONS`, with nothing asserting they agreed — so an
 * edit to the guard's parameters would have left the sweep script describing a
 * different model while still printing confident numbers. A derivation script
 * that cannot notice it has gone stale is worse than no script.
 *
 * This file is under `tests/` so `tsconfig.json`'s `include` typechecks it (and
 * therefore typechecks `BASE` against `Params`, which `scripts/` is not). It does
 * NOT end in `.test.ts`, and vitest's `include` in `vitest.config.ts` matches only
 * files that do, so it is never collected as a test file — verified by test-file
 * count before and after, not assumed.
 */
import {
  createWorld,
  defaultParams,
  isSilenced,
  type Copy,
  type Genome,
  type Params,
} from "../../sim/index.js";
import { transpose } from "../../sim/phases/transpose.js";

/**
 * Fully pinned — all 20 fields, nothing inherited from `defaultParams`'
 * provisional values, because a guard's configuration is part of the guard.
 *
 * Ten of the twenty are inert here and are pinned to zero/false so the arm reads
 * as what it is: `v, a, b, d, dTol, t, pDom, wDom, sexual, silencingOn` are read
 * only by `lifecycle`, `select`, `reproduce` and `trap`, none of which this arm
 * calls — it calls `transpose` and nothing else. Note in particular that
 * `silencingOn` is NOT consulted by `isSilenced` — the master switch lives in
 * `trap.ts`, which only governs whether new entries are CAPTURED into a
 * repertoire; a repertoire that already exists silences either way. That was
 * verified rather than assumed: re-running the seed-55 arm with all ten fields at
 * their `defaultParams` values instead reproduces the run bit for bit (identical
 * site/r/s for all 206 copies), as does flipping `silencingOn` to false on its own.
 *
 * `c = 0` and `beta = 0` remove the cluster and beneficial spans so that the
 * hand-placed sites 1000 and 1001 are ordinary sites. `S = 5000` keeps occupancy
 * at most 257/5000 = 5.1%, far from the point where `transpose`'s rejection
 * sampler starts retrying, and far from its `occupied.size >= p.S` break.
 */
export const BASE: Params = {
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
export const GENERATIONS = 8;

/**
 * The seed set every claim is checked at. 55 is the arm the exact numbers in the
 * guard's comments were read off; 101/202/303/404/505 are the seeds the Guard 5
 * sweeps already use; 1/2/3/7/9 are small values. No claim rests on a single seed.
 */
export const SEEDS = [55, 1, 2, 3, 7, 9, 101, 202, 303, 404, 505] as const;

export const FOUNDER_ID = 0;
/** 2 * theta: outside the silencing window, so the sublineage root is active. */
export const SEED_S = 0.2;

export interface Arm {
  p: Params;
  g: Genome;
  founder: Copy;
  escaped: Copy[];
}

/**
 * One genome carrying the silenced founder at s = 0 and the active sublineage
 * root at SEED_S, with a repertoire that catches the founder. Returned before any
 * transposition so callers can step it themselves.
 *
 * `nextCopyId` is reset to 2 after the hand-seeding, or the first daughter would
 * be minted with id 1 and collide with the seeded copy; `transpose` never reads
 * `id`, so this is hygiene, not behaviour (verified: the seed-55 arm produces the
 * identical 206 copies either way).
 */
export function seedTrappedGenome(p: Params): {
  world: ReturnType<typeof createWorld>;
  genome: Genome;
} {
  const world = createWorld(p);
  const genome = world.genomes[0]!;
  genome.copies = [
    { id: FOUNDER_ID, site: 1000, r: 1, s: 0, domesticated: false },
    { id: 1, site: 1001, r: 1, s: SEED_S, domesticated: false },
  ];
  genome.repertoire = [0];
  world.nextCopyId = 2;
  return { world, genome };
}

/**
 * The arm itself: the seeded genome above, GENERATIONS rounds of transposition,
 * and nothing else.
 */
export function runArm(seed: number, sigmaS: number): Arm {
  const p = defaultParams({ ...BASE, seed, sigmaS });
  const { world, genome: g } = seedTrappedGenome(p);

  for (let i = 0; i < GENERATIONS; i++) transpose(world);

  return {
    p,
    g,
    founder: g.copies.find((c) => c.id === FOUNDER_ID)!,
    escaped: g.copies.filter((c) => !isSilenced(c, g, p)),
  };
}

/**
 * The single-founder arm for the "a silenced copy cannot transpose" claim: one
 * copy at s = 0, the given repertoire, exactly one round of transposition.
 * `repertoire: [0]` catches it; `repertoire: []` is the matched positive control.
 */
export function transposeOnce(p: Params, repertoire: number[]): Genome {
  const world = createWorld(p);
  const genome = world.genomes[0]!;
  genome.copies = [
    { id: FOUNDER_ID, site: 1000, r: 1, s: 0, domesticated: false },
  ];
  genome.repertoire = repertoire;
  world.nextCopyId = 1;
  transpose(world);
  return genome;
}
