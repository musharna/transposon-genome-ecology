/**
 * The Guard 9 arm, defined ONCE.
 *
 * `tests/guards/tolerance.test.ts` asserts against this arm and
 * `scripts/explore-tolerance.ts` derives the guard's thresholds from it.
 * Neither file carries its own copy of `BASE`, `SEEDS` or `GENERATIONS` — the
 * pattern of `escape-arm.ts`, `bloat-arm.ts`, `three-phases-arm.ts` and
 * `domestication-arm.ts`, reused for the same reason.
 *
 * This file lives under `tests/` so `tsconfig.json`'s `include` typechecks it,
 * and therefore typechecks `BASE` against `Params`, which `scripts/` is not.
 * It does NOT end in `.test.ts`, and `vitest.config.ts`'s `include` is
 * `["tests/**\/*.test.ts"]`, so vitest never collects it.
 *
 * Every figure in this file and in the guard was measured in THIS task by
 * `scripts/explore-tolerance.ts`, at all eleven seeds.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS ARM EXISTS TO SHOW
 * ---------------------------------------------------------------------------
 * Spec §4 says resistance and tolerance "are two costs with different shapes,
 * not one cost with a knob", and gives the reason: a tolerating host never
 * builds clusters, so it CANNOT BE CONSCRIPTED. Before this task nothing in the
 * suite asserted any of it — `t = 0` in all seven scientific arms AND in
 * `defaultParams` AND in `TOY_DEFAULTS`, so the tolerance branch of
 * `damageLoad` (`sim/phases/select.ts:69`) never executed in a population run
 * anywhere in the repository, and the `1 - t` gate in `sim/phases/trap.ts:43`
 * was always `>= 1`.
 *
 * "Different in kind, not degree" is a strong claim and it needs two separate
 * pieces of evidence, which are the guard's first two claims:
 *
 *   1. AT `t = 1` NO REPERTOIRE EVER FORMS — structurally, not statistically.
 *      `trap` draws `world.rng.next()` and skips when it is `>= 1 - t`; at
 *      `t = 1` that is `>= 0`, and `next()` is documented uniform in [0, 1), so
 *      the skip is unconditional. Every genome ends with an empty repertoire and
 *      `isSilenced` is false for every copy.
 *   2. THE BOUNDARY IS A DISCONTINUITY, NOT THE END OF A GRADIENT. At
 *      `t = 0.99` — a host that resists one time in a hundred — every genome at
 *      every seed still ends up carrying a repertoire. The property is binary AT
 *      THE ENDPOINT.
 *
 * ---------------------------------------------------------------------------
 * A MEASURED NEGATIVE RESULT: THE DIAL IS NOT GRADED IN THE POPULATION
 * ---------------------------------------------------------------------------
 * The obvious third claim — "a mid-dial value behaves between the two, so the
 * dial is continuous in effect" — WAS MEASURED AND IS FALSE at this arm and
 * horizon. Mean repertoire entries per genome at generation 150:
 *
 *   t       min    mean     monotone in t, per seed?
 *   0      11.70   16.40    -
 *   0.25   10.47   16.43    10 of 11 seeds NOT monotone over t in {0, .25, .5, .75}
 *   0.5    14.65   17.79
 *   0.75    9.63   14.42
 *   0.9     8.55   11.73
 *   0.99    3.00    4.65
 *   0.999   0.03    1.03
 *   1       0.00    0.00
 *
 * Between `t = 0` and `t = 0.75` the response is flat inside seed noise and
 * moves the WRONG WAY at ten of the eleven seeds. Halving or quartering the
 * capture probability does not halve the repertoire, because the repertoire
 * saturates: a genome only needs a few entries before every copy in a
 * low-`sigmaS` family is inside `theta` of one of them.
 *
 * So the guard asserts NO mid-dial gradient. What it does assert is the part
 * that survived measurement: repertoire size at `t = 0.99` is below repertoire
 * size at `t = 0` at every seed, with non-overlapping ranges (max 6.21 at 0.99
 * against min 11.70 at 0) — the dial is live below the endpoint, which is the
 * positive control that makes claim 2 mean something, and is a weaker statement
 * than "graded" on purpose.
 *
 * This negative result strengthens rather than weakens the spec's claim: `t = 1`
 * is not the far end of a slope, it is a discontinuity.
 *
 * ---------------------------------------------------------------------------
 * `t = 0.999` IS THE MEASURED EDGE, AND IS NOT THE ARM
 * ---------------------------------------------------------------------------
 * At `t = 0.999` the effect is marginal rather than absent: `fractionWithRepertoire`
 * at generation 150 is 1.000 at six seeds but 0.030 at seed 4 and 0.070 at
 * seed 3. That is one order of magnitude from the endpoint and already inside
 * sampling noise at this horizon, so `T_NEAR_BOUNDARY` is 0.99 — where all
 * eleven seeds are at exactly 1.000 — and 0.999 is recorded here as the point
 * where the claim would stop being safe.
 */
import {
  createWorld,
  defaultParams,
  isClusterSite,
  observe,
  step,
  type Copy,
  type Genome,
  type Params,
  type Snapshot,
} from "../../sim/index.js";

/**
 * Fully pinned — all 20 fields.
 *
 * The arms differ in `t` AND NOTHING ELSE, so the only mechanism that can
 * separate them is the pair of places `t` is read: the capture gate in
 * `sim/phases/trap.ts:43` and the damage term in `sim/phases/select.ts:70`.
 * Everything that would give the dial a THIRD route is pinned off: `beta = 0`,
 * `pDom = 0` and `wDom = 0` remove domestication (Guard 8 owns that, and a
 * domesticated copy is exempt from silencing, which would confound the
 * repertoire measurement), and `silencingOn: true` because the whole claim is
 * about whether a trap can exist.
 *
 * `d` and `dTol` are BOTH 0.001 and both live. Equal on purpose: it means the
 * `t = 0` and `t = 1` arms pay the same per-copy rate and differ only in WHICH
 * population they pay it on, which is exactly the spec's "different shapes, not
 * one knob". If they differed, a magnitude difference could masquerade as a
 * shape difference.
 *
 * `sigmaS: 0.1` is 2x `theta: 0.05`, so escape by divergence is routine and the
 * resisting arm stays alive rather than being sterilised by its own trap — the
 * same reasoning, and the same two values, as `bloat-arm.ts`. That matters here
 * because the `t = 0` arm is this guard's positive control and a dead control
 * arm proves nothing.
 *
 * `c: 0.02` gives 40 cluster sites in 2000, DOUBLE the cluster fraction
 * `bloat-arm.ts` uses. The reason is the liveness control
 * on the tolerant arm: the guard has to show that copies really are landing in
 * cluster sites at `t = 1` and still not being captured. At `c = 0.01` the
 * tolerant arm holds 131..200 copies in cluster sites at the horizon; at
 * `c = 0.02` it holds 268..463, which is a floor with room under it.
 */
export const BASE: Params = {
  N: 100,
  S: 2000,
  c: 0.02,
  r0: 0.1,
  rMax: 1,
  sigmaR: 0.05,
  sigmaS: 0.1,
  theta: 0.05,
  v: 0.02,
  a: 0.001,
  b: 0.00005,
  d: 0.001,
  dTol: 0.001,
  t: 0,
  beta: 0,
  pDom: 0,
  wDom: 0,
  sexual: true,
  silencingOn: true,
  seed: 1,
};

/**
 * The horizon. Long enough that the resisting arm has saturated
 * (`fractionWithRepertoire` is 1.000 at every seed well before it) and that the
 * tolerant arm has accumulated hundreds of copies in cluster sites, so "nothing
 * was captured" is a statement about a world with plenty to capture. Short
 * enough that the tolerant arm — which has no trap to limit it — stays at
 * 7.6%..11.5% site occupancy, below the ~40% where `transpose`'s rejection
 * sampler starts reporting its own behaviour.
 */
export const GENERATIONS = 150;

/** The seed set every claim is checked at — the same eleven Guards 4 and 8 use. */
export const SEEDS = [1, 2, 3, 4, 5, 7, 11, 13, 17, 101, 202] as const;

/** Pure resistance. The positive-control arm. */
export const T_RESIST = 0;

/** Pure tolerance. The arm the negative claim is about. */
export const T_TOLERATE = 1;

/**
 * One hundredth of the way in from pure tolerance. At this value the capture
 * gate fires with probability 0.01 per eligible copy per generation and EVERY
 * GENOME AT EVERY SEED still ends up with a repertoire — which is what makes
 * `t = 1` a discontinuity rather than the end of a slope. See the module
 * docstring for why 0.999 was rejected as the arm.
 */
export const T_NEAR_BOUNDARY = 0.99;

/**
 * Guard threshold: copies sitting in cluster sites in the TOLERANT arm at the
 * horizon. Measured 268..463 across the eleven seeds; a floor of 100 is 2.68x
 * under the weakest seed (7, at 268). This is the control that makes "no
 * repertoire ever formed" a statement about the gate rather than about an empty
 * genome.
 */
export const MIN_CLUSTER_COPIES = 100;

/**
 * Guard threshold: mean repertoire entries per genome in the RESISTING arm at
 * the horizon. Measured 11.70..21.57; a floor of 5 is 2.34x under the weakest
 * seed (13, at 11.70).
 */
export const MIN_RESIST_REPERTOIRE = 5;

/**
 * The two constructed genomes the fitness-ordering claim uses: equal total copy
 * number, opposite composition.
 *
 * 45 copies each. The ACTIVE_HEAVY genome has 40 active and 5 silenced; the
 * SILENCED_HEAVY genome has 5 active and 40 silenced.
 */
export const HEAVY = 40;
export const LIGHT = 5;

/**
 * Parameters for the fitness-ordering claim. NOT `BASE`: this is a
 * deterministic arithmetic check on two hand-built genomes, and it strips
 * everything that would add a term the hand arithmetic does not account for.
 *
 *   - `a = 0, b = 0` remove `copyNumberLoad`. The two genomes have equal copy
 *     number so it would cancel in the ORDERING anyway, but it would not cancel
 *     in the VALUES, and the guard asserts values as well as ordering.
 *   - `wDom = 0` removes the domestication bonus term from `logFitness`.
 *   - `d = dTol = 0.01`, equal, so the two arms differ only in which population
 *     the cost is charged on.
 *   - `theta = 0.1` with a repertoire holding the single entry 0: copies at
 *     `s = 0` are inside the window and copies at `s >= 10` are far outside it.
 *
 * With that, `logFitness` reduces to exactly
 * `-((1 - t)·0.01·nSilenced + t·0.01·nActive)` and every expected value in the
 * guard is one multiplication done by hand.
 */
export const FITNESS_PARAMS = (t: number): Params =>
  defaultParams({
    ...BASE,
    a: 0,
    b: 0,
    d: 0.01,
    dTol: 0.01,
    theta: 0.1,
    wDom: 0,
    t,
  });

/**
 * A genome with `nActive` copies far outside the silencing window and
 * `nSilenced` copies inside it, against a repertoire holding the single
 * entry 0.
 *
 * Built by hand rather than grown, because the claim is about the SHAPE of
 * `damageLoad` and a grown genome's composition is whatever the run happened to
 * produce. The guard asserts the resulting classification with `activeCopies`
 * and `silencedCopies` before using it, so the construction is checked rather
 * than assumed.
 *
 * `r` is 0 and `domesticated` is false on every copy: neither is read by
 * `logFitness`, and a non-zero `r` would invite the misreading that this
 * genome is something a run could step.
 */
export function constructGenome(nActive: number, nSilenced: number): Genome {
  const copies: Copy[] = [];
  let site = 0;
  for (let i = 0; i < nSilenced; i++) {
    copies.push({ id: site, site, r: 0, s: 0, domesticated: false });
    site++;
  }
  for (let i = 0; i < nActive; i++) {
    copies.push({ id: site, site, r: 0, s: 10 + i, domesticated: false });
    site++;
  }
  return { copies, repertoire: [0] };
}

export interface ArmResult {
  p: Params;
  snapshot: Snapshot;
  /** Mean piRNA repertoire entries per genome. */
  repertoirePerGenome: number;
  /** Genomes holding at least one repertoire entry, as a fraction. */
  fractionWithRepertoire: number;
  /**
   * Copies occupying a cluster site at the horizon — everything the trap had
   * the opportunity to capture and, at `t = 1`, did not.
   */
  clusterCopies: number;
  /**
   * Generations at which ANY genome in the population held a non-empty
   * repertoire. Zero means no repertoire existed at any point in the run, which
   * is stronger than an empty repertoire at the horizon.
   */
  generationsWithAnyRepertoire: number;
}

/**
 * `BASE` with `overrides` applied. Separated from `runArm` so a caller can
 * inspect an arm's configuration without paying for its 150 generations.
 */
export function armParams(overrides: Partial<Params>): Params {
  return defaultParams({ ...BASE, ...overrides });
}

/**
 * `BASE` with `overrides` applied, stepped to `GENERATIONS`.
 *
 * Checks the repertoire at EVERY generation rather than only at the horizon,
 * because "no repertoire ever forms" is a claim about the whole run and an
 * endpoint check cannot distinguish it from "a repertoire formed and was lost"
 * — even though nothing in `sim/` removes an entry today, that is exactly the
 * kind of invariant a guard should not borrow from the code it guards. The
 * scan reads array lengths and consumes no randomness, so it cannot move the
 * RNG stream.
 */
export function runArm(overrides: Partial<Params>): ArmResult {
  const p = armParams(overrides);
  const world = createWorld(p);
  let generationsWithAnyRepertoire = 0;

  for (let g = 1; g <= GENERATIONS; g++) {
    step(world);
    if (world.genomes.some((genome) => genome.repertoire.length > 0)) {
      generationsWithAnyRepertoire++;
    }
  }

  const snapshot = observe(world);
  let clusterCopies = 0;
  let repertoireEntries = 0;
  for (const genome of world.genomes) {
    repertoireEntries += genome.repertoire.length;
    for (const copy of genome.copies) {
      if (isClusterSite(copy.site, p)) clusterCopies++;
    }
  }

  return {
    p,
    snapshot,
    repertoirePerGenome: repertoireEntries / world.genomes.length,
    fractionWithRepertoire: snapshot.fractionWithRepertoire,
    clusterCopies,
    generationsWithAnyRepertoire,
  };
}
