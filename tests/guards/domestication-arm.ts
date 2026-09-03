/**
 * The Guard 8 arm, defined ONCE.
 *
 * `tests/guards/domestication.test.ts` asserts against this arm and
 * `scripts/explore-domestication.ts` derives the guard's thresholds from it.
 * Neither file carries its own copy of `BASE`, `SEEDS` or `GENERATIONS`, so the
 * sweep cannot silently stop describing the guard — the pattern of
 * `tests/guards/escape-arm.ts`, `bloat-arm.ts` and `three-phases-arm.ts`,
 * reused here for the same reason.
 *
 * This file lives under `tests/` because the guard imports it and the dependency
 * runs one way: the sweep script imports the guard's arm, never the reverse.
 * ⚠️ `scripts/` IS typechecked — `tsconfig.json`'s `include` lists it alongside
 * `tests` — so `BASE` would be checked against `Params` in either location; the
 * claim to the contrary that stood here was wrong and is corrected across all
 * six arm modules (2026-09-03). This file does NOT end in `.test.ts`, and
 * `vitest.config.ts`'s `include` is `["tests/**\/*.test.ts"]`, so vitest never
 * collects it — verified in this task by test-file count (20 files before, 22
 * after, not 24), not assumed.
 *
 * Every figure in this file and in the guard was measured in THIS task by
 * `scripts/explore-domestication.ts`, WHICH COMPUTES EACH ONE — including the
 * two distinct minima below, which an earlier version of this module conflated.
 * At all eleven seeds. No figure here is single-seed.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS ARM EXISTS TO SHOW, AND WHY IT NEEDED DERIVING
 * ---------------------------------------------------------------------------
 * Spec §3.2 step 3 and §4's last row call domestication "the alternate win":
 * a copy that stops being a parasite persists by being useful. Before this task
 * NOTHING IN THE SUITE ASSERTED ANYTHING ABOUT IT — `pDom = 0` in all six
 * scientific arms, so `sim/phases/lifecycle.ts`'s `domesticate` never fired
 * inside a guard.
 *
 * The first thing measuring it produced was a NEGATIVE result: at the shipped
 * `defaultParams` bonus `wDom = 0.01` domesticated copies DO NOT persist. They
 * appear, peak, and are gone. That is not a missing mechanism — the model
 * expresses persistence perfectly well above a benefit threshold — it is a
 * CALIBRATION finding, and it is recorded in `docs/ROADMAP.md` rather than
 * fixed here, because moving a default moves every other guard's derivation and
 * the golden hash in `tests/step.test.ts`.
 *
 * So this guard asserts the CONTRAST, which is the only form in which the
 * finding is a claim rather than an anecdote: below the threshold they are lost,
 * above it they persist, and they persist THROUGH THE FAMILY'S DEATH.
 *
 * ---------------------------------------------------------------------------
 * WHY THEY ARE LOST BELOW THE THRESHOLD — SEGREGATION, NOT EXCISION, NOT SELECTION
 * ---------------------------------------------------------------------------
 * A domesticated copy is exempt from excision: `sim/phases/lifecycle.ts:25`
 * short-circuits `lose`'s filter before the `world.rng.next() >= p.v` draw. It
 * is exempt from silencing: `sim/silencing.ts:83` returns false for it. And it
 * does not transpose: `activeCopies` excludes it, so `transpose` never picks it
 * as a parent. That last exemption is the trap. By ceasing to transpose it has
 * given up THE ONLY MECHANISM IN THIS MODEL THAT CAN RAISE ITS OWN FREQUENCY.
 *
 * What is NOT exempt is segregation. `sim/phases/reproduce.ts:63-67` keeps each
 * of a parent's copies with probability 1/2 under free recombination, and
 * `:49` shows the flag itself is inherited faithfully (`domesticated:
 * c.domesticated`), so this is not a lost-flag artefact. A domesticated copy is
 * therefore a neutral-to-mildly-beneficial allele under drift with no
 * replication of its own, and at a small enough bonus drift wins.
 *
 * The ASEXUAL arm is the control that pins this. At the SAME `wDom = 0.01` that
 * loses them at every seed under sex, `sexual: false` keeps them at every seed
 * (4.00 .. 14.00 copies per genome at generation 600). `sexual` is the only
 * field that differs — the fitness function is untouched, so selection cannot
 * be the difference, and `lose` is untouched, so excision cannot be either.
 *
 * ⚠️ BUT `sexual` IS ONE FLAG OVER THREE MECHANISMS, AND THE ARM ALONE CANNOT
 * SEPARATE THEM. Flipping it changes (a) the 1/2 transmission draw per copy,
 * (b) inheritance from two parents rather than one, and (c) the dedup of a site
 * inherited from both (`sim/phases/reproduce.ts:58-77`). The arm establishes
 * "the loss route is the recombination branch"; it does NOT by itself establish
 * WHICH of the three. What does is the guard's mutation for this claim — adding
 * ONLY the 1/2 draw to the clonal branch, leaving one-parent inheritance and the
 * absent dedup exactly as they are. That single change drops the asexual arm to
 * 0.00 per genome at seed 1, which is the sharpest available statement that
 * SEGREGATION SPECIFICALLY is the route. It is recorded on the test that carries
 * the claim, and the mutation is the discriminator, not the arm.
 *
 * ⚠️ THE ASEXUAL ARM IS NOT AN INDEPENDENT DISCOVERY AND MUST NOT BE READ AS
 * ONE. Under `sexual: false` a daughter is a verbatim clone, so once a lineage
 * fixes, a copy that neither excises nor transposes cannot leave the population
 * at all; the per-genome counts are exact integers because the population IS one
 * clone (measured: 4.00, 5.00, 6.00, 8.00, 9.00, 13.00, 14.00 — never a
 * fraction). What the arm demonstrates is that the ONLY route out of the
 * population for a domesticated copy runs through the recombination branch. It
 * is a mechanism demonstration, not evidence that asexuality is good for
 * domestication. And it is not tautological: the clone that fixes could have
 * carried zero domesticated copies, and at `wDom = 0` (no benefit at all) three
 * of the eleven seeds do end at exactly zero — which is why the control is run
 * at `wDom = 0.01` and not at `wDom = 0`.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE THRESHOLD FALLS, AT THIS ARM AND THIS HORIZON
 * ---------------------------------------------------------------------------
 * Domesticated copies per genome at generation 600, eleven seeds
 * (ARM 2 of `scripts/explore-domestication.ts` prints the full grid):
 *
 *   wDom     min    mean   seeds ending at exactly zero
 *   0       0.00    0.00   11 / 11
 *   0.01    0.00    0.00   11 / 11    <-- the shipped default
 *   0.02    0.00    0.00   11 / 11
 *   0.03    0.00    0.00   11 / 11
 *   0.05    0.00    0.13    5 / 11    <-- transition begins
 *   0.06    0.00    0.69    1 / 11
 *   0.075   1.16    2.31    0 / 11    <-- every seed persists from here up
 *   0.09    1.74    5.22    0 / 11
 *   0.1     3.89    7.15    0 / 11
 *   0.15   10.57   16.07    0 / 11
 *   0.2    14.91   18.83    0 / 11
 *   0.3    17.84   20.27    0 / 11
 *
 * So the threshold is a BAND, not a point: `0.03 < wDom* <= 0.075` at this arm,
 * this `N`, this horizon. `WDOM_BELOW` is 0.01 — the shipped default, and 5x
 * below the lowest bonus at which ANY seed survives. `WDOM_ABOVE` is 0.3 — 4x
 * above the lowest bonus at which EVERY seed survives.
 *
 * ⚠️ THE THRESHOLD IS A PROPERTY OF THIS ARM, NOT OF THE MODEL. It is a
 * drift-versus-selection balance, so it moves with `N`, with `v`, with `beta`
 * and `pDom` (which set the supply), and with the horizon: at `wDom = 0.05`
 * five of eleven seeds still hold copies at generation 600 and NONE do at
 * generation 1000. Nothing here licenses quoting "0.075" as the model's
 * domestication threshold.
 *
 * ---------------------------------------------------------------------------
 * A NON-MONOTONICITY, RECORDED AND ONLY PARTLY EXPLAINED
 * ---------------------------------------------------------------------------
 * More bonus is not monotonically more domesticated copies. Mean per genome at
 * generation 1000 rises to a peak near `wDom = 0.3` (19.71) and then FALLS:
 * 18.27 at 0.5, 14.75 at 1, 11.69 at 2, 10.14 at 5. This holds at all eleven
 * seeds, so it is systematic, not a seed accident (ARM 5).
 *
 * What is established: it is a difference in ACCUMULATION, not in RETENTION.
 * The whole difference is present by generation 30-60 and every trajectory is
 * flat thereafter — at `wDom = 5`, seed 1, per genome runs 14.3 (g30) -> 12.8
 * (g100) -> 12.8 (g1000). Two things move together as `wDom` rises, both
 * squeezing the window in which new domestication events can happen: the
 * still-transposing family — the only source of new domesticated copies — dies
 * EARLIER (non-domesticated copies per genome reach zero by generation ~40-60
 * at `wDom = 5` against ~100-150 at `wDom = 0.2`), and lineage diversity
 * collapses (distinct sets of domesticated sites in a 200-genome population:
 * 200/200 at `wDom = 0.2`, 106/200 at `wDom = 5`, seed 101).
 *
 * WHICH OF THOSE TWO IS UPSTREAM OF THE OTHER WAS NOT ISOLATED. Both are
 * consequences of near-truncation selection once `wDom * nDom` dominates the
 * fitness ranking, and no probe here separates them. This is recorded as an
 * uncharacterised observation on purpose; NO GUARD ASSERTION DEPENDS ON IT, and
 * nothing here should be quoted as its cause.
 */
import {
  createWorld,
  defaultParams,
  observe,
  step,
  type Params,
  type Snapshot,
} from "../../sim/index.js";

/**
 * Fully pinned — all 20 fields, nothing inherited from `defaultParams`'
 * provisional values, because a guard's configuration is part of the guard.
 *
 * Every field is chosen so that the ONLY thing separating the guard's arms is
 * `wDom` (and, for the mechanism control, `sexual`):
 *
 *   - `beta: 0.10` and `pDom: 0.2` make domestication a frequent event rather
 *     than a rare one. At the shipped `beta: 0.005, pDom: 0.001` a whole run
 *     produces a handful of domesticated copies and every measurement is
 *     dominated by sampling noise. This is a deliberately GENEROUS supply: the
 *     guard's finding is that copies are lost even when they are cheap to make.
 *   - `sigmaS: 0.005` is far below `theta: 0.15`, so daughters never diverge out
 *     of the silencing window and escape-by-divergence is off. That is what
 *     makes THE FAMILY DIE — which is the point: the guard's central assertion
 *     is that domesticated copies outlive the family, and it needs a family that
 *     reliably dies. (This is the configuration `bloat-arm.ts` deliberately
 *     avoids, for the opposite reason: there a dead arm would fake the effect.
 *     Here a dead family IS the effect, and the domesticated count is measured
 *     separately from it.)
 *   - `silencingOn: true` because the family's death runs through the trap.
 *   - `v: 0.005` is a live excision rate, so "domesticated copies are exempt
 *     from excision" is a statement with content at this arm: the
 *     non-domesticated copies around them are being excised throughout.
 *   - `d: 0.0005, dTol: 0.002, t: 0` are the shipped defaults. `t = 0` means the
 *     tolerance branch of `damageLoad` is off and `d` is live — the host is
 *     paying the resistance cost while all this happens. Guard 9 owns `t`.
 *   - `a: 0.0004, b: 0.00001` keep the copy-number load shallow enough that the
 *     family's amplification phase is not cut off by copy-number selection
 *     before any domestication can occur.
 *   - `N: 200, S: 3000` — `N` sets the drift intensity that the threshold is a
 *     balance against, and is therefore load-bearing; `S = 3000` with
 *     `beta = 0.10` gives 300 beneficial sites, far more than the ~20 per genome
 *     the above-threshold arm settles at, so nothing here is a saturation
 *     artefact. Peak occupancy at the horizon is 0.74%.
 */
export const BASE: Params = {
  N: 200,
  S: 3000,
  c: 0.02,
  r0: 0.2,
  rMax: 1,
  sigmaR: 0.02,
  sigmaS: 0.005,
  theta: 0.15,
  v: 0.005,
  a: 0.0004,
  b: 0.00001,
  d: 0.0005,
  dTol: 0.002,
  t: 0,
  beta: 0.1,
  pDom: 0.2,
  wDom: 0.01,
  sexual: true,
  silencingOn: true,
  seed: 1,
};

/**
 * The horizon. Long enough that both fates are complete and neither is still in
 * transit, and it is NOT a fixed-horizon comparison of two moving quantities the
 * way Guard 4's is — both arms have settled here:
 *
 *   - below the threshold, the last generation at which ANY domesticated copy
 *     exists is 131..374 across the eleven seeds, so generation 600 is 226
 *     generations past the slowest seed's extinction;
 *   - above the threshold, the count plateaus. ARM 4 runs three seeds to
 *     generation 2000: seed 1 20.50 (g600) -> 18.86 -> 17.77 -> 16.98 (g2000),
 *     seed 7 21.38 -> 20.04 -> 21.44 -> 19.57, seed 101 17.84 -> 17.91 -> 17.79
 *     -> 17.61, with non-domesticated copies at exactly zero throughout. There
 *     is a slow drift downward at some seeds but no approach to zero, and the
 *     guard's floor of 10 per genome is not threatened at 2000 generations.
 */
export const GENERATIONS = 600;

/**
 * The marks at which stability above the threshold is asserted. The first is
 * past the family's death at every seed (non-domesticated copies reach exactly
 * zero at generation 87..158), so every mark is measuring a post-family world.
 */
export const STABILITY_MARKS = [150, 300, 450, 600] as const;

/**
 * The seed set every claim is checked at — the same eleven Guard 4 uses, so the
 * two guards' seed coverage is comparable. No claim in the guard rests on a
 * single seed.
 */
export const SEEDS = [1, 2, 3, 4, 5, 7, 11, 13, 17, 101, 202] as const;

/**
 * BELOW the persistence threshold: the SHIPPED DEFAULT bonus. Chosen over the
 * larger below-threshold values (0.02, 0.03) precisely because it is the
 * default — the guard's finding is about the configuration the toy actually
 * runs. Margin: 5x below `wDom = 0.05`, the lowest bonus at which any seed
 * still holds a domesticated copy at the horizon.
 */
export const WDOM_BELOW = 0.01;

/**
 * ABOVE the persistence threshold. 4x above `wDom = 0.075`, the lowest bonus at
 * which every seed persists, and just above the measured peak of the
 * non-monotone response (~0.3), so the arm is not perched on a cliff edge:
 * 0.2 and 0.5 both persist at every seed too.
 */
export const WDOM_ABOVE = 0.3;

/**
 * Guard threshold: the below-threshold arm must first SHOW domestication
 * happening, or "they are lost" is satisfied by a world where none was ever
 * made. Measured peak population count of domesticated copies at
 * `WDOM_BELOW`: 195..595, reached at generation 26..44. A floor of 100 is
 * 1.95x under the weakest seed (7, at 195).
 */
export const MIN_PEAK_DOMESTICATED = 100;

/**
 * Guard threshold: domesticated copies per genome above the threshold, asserted
 * at every mark in `STABILITY_MARKS` and nowhere else.
 *
 * ⚠️ TWO DIFFERENT MINIMA LIVE IN THIS ARM AND AN EARLIER VERSION OF THIS
 * COMMENT CONFLATED THEM. They are both printed by ARM 1 of
 * `scripts/explore-domestication.ts`, labelled, so the pair cannot drift again:
 *
 *   - THE MARGIN THAT BINDS THIS CONSTANT is the minimum over the FOUR ASSERTED
 *     MARKS: **16.59** per genome (seed 101), because those four values are the
 *     only ones any assertion reads. A floor of 10 is a **1.66x** margin.
 *   - The minimum over EVERY GENERATION from 150 to 600 is lower, **15.85**
 *     (seed 101, 1.58x), and is recorded because it is the stricter statement —
 *     but no assertion checks it, so quoting it as this constant's margin
 *     overstated how tight the guard is. Per-seed marks minima: 19.58, 21.11,
 *     19.16, 20.57, 19.86, 21.38, 21.14, 18.57, 17.74, 16.59, 22.16; per-seed
 *     every-generation minima: 17.77, 19.55, 18.00, 18.59, 18.71, 21.34, 20.73,
 *     17.38, 16.84, 15.85, 20.57.
 *
 * 1.66x is still this guard's narrowest margin, and it is stated rather than
 * hidden. It separates from a below-threshold arm at EXACTLY zero, so the
 * quantity being floored is nowhere near the quantity it is distinguished from.
 */
export const MIN_DOMESTICATED_PER_GENOME = 10;

/**
 * Guard threshold: the LARGEST non-domesticated copy count per genome reached at
 * any point in the above-threshold run — the liveness control for "the family is
 * dead", asserting that there was a family to die.
 *
 * It replaces an earlier control (`domCount > 0`) that was strictly implied by
 * `MIN_DOMESTICATED_PER_GENOME` above — 10 per genome at N = 200 is 2000 copies,
 * so the old control could not fire unless the claim also failed, and it
 * pre-empted: removing `+ p.wDom * nDom` from `logFitness` turned the test red at
 * the control rather than at the floor. This one is independent of the
 * domestication bonus entirely.
 *
 * Measured peak family per genome in the above arm: 10.76..32.74, reached at
 * generation 21..41. A floor of 5 is a **2.15x** margin under the weakest seed
 * (101, at 10.76). It does NOT pre-empt: under the `wDom`-bonus removal the peak
 * family is still 9.08..21.04, above the floor, so that mutation now fires at the
 * claim.
 */
export const MIN_PEAK_FAMILY_PER_GENOME = 5;

/**
 * Guard threshold: domesticated copies per genome in the asexual control, at the
 * same below-threshold bonus that loses them under sex. Measured minimum at the
 * horizon: 4.00 (seeds 3, 7, 13). A floor of 2 is a 2x margin.
 */
export const MIN_ASEXUAL_DOMESTICATED_PER_GENOME = 2;

export interface ArmResult {
  p: Params;
  snapshot: Snapshot;
  /** Domesticated copies per genome at the horizon. */
  domPerGenome: number;
  /** Population count of domesticated copies at the horizon. */
  domCount: number;
  /**
   * Population count of copies that are NOT domesticated — the still-parasitic
   * family. Zero means the family is dead.
   */
  familyCount: number;
  /** Largest population count of domesticated copies seen at any generation. */
  peakDomCount: number;
  /** The generation `peakDomCount` was reached at. */
  peakDomGeneration: number;
  /**
   * Largest non-domesticated ("family") copies per genome seen at any
   * generation, and the generation it was reached at. The liveness control for
   * "the family is dead": it establishes there was a family to die, and it is
   * independent of `wDom`.
   */
  peakFamilyPerGenome: number;
  peakFamilyGeneration: number;
  /**
   * Domesticated copies per genome at each of `STABILITY_MARKS`, in order.
   * Empty entries are impossible: every mark is <= `GENERATIONS`.
   */
  atMarks: number[];
  /**
   * THE QUANTITY THE GUARD'S FLOOR ACTUALLY BINDS: `Math.min(...atMarks)`.
   * Provided so the guard and the sweep read the same number rather than each
   * reducing `atMarks` themselves — the two disagreed once already, and the pair
   * below is the reason.
   */
  minAtMarks: number;
  /**
   * The minimum over EVERY generation from `STABILITY_MARKS[0]` to the horizon —
   * a strictly stronger bound than `minAtMarks`, which NO ASSERTION CHECKS. It
   * exists so the arm module can quote it as the stricter statement without the
   * sweep having to recompute it by a second, drifting route. Infinity if the
   * horizon is below the first mark, which the pinned values make impossible.
   */
  minAfterFirstMark: number;
}

/**
 * `BASE` with `overrides` applied. Separated from `runArm` so a caller can
 * inspect an arm's configuration without paying for its 600 generations.
 */
export function armParams(overrides: Partial<Params>): Params {
  return defaultParams({ ...BASE, ...overrides });
}

/**
 * `BASE` with `overrides` applied, stepped to `GENERATIONS`, observing at every
 * generation.
 *
 * It observes every generation rather than only at the marks because several of
 * the guard's quantities are extrema over the whole run — the peak domesticated
 * count, the peak family size, and the every-generation minimum — and an
 * extremum sampled at marks is not an extremum. That is exactly the confusion
 * `minAtMarks` and `minAfterFirstMark` exist to keep apart. `observe` is
 * O(copies) with no
 * randomness (`sim/observe.ts`), so this does not move the RNG stream and the
 * result is identical to a run that never observed.
 */
export function runArm(overrides: Partial<Params>): ArmResult {
  const p = armParams(overrides);
  const world = createWorld(p);
  const markSet = new Set<number>(STABILITY_MARKS);
  const firstMark = STABILITY_MARKS[0];
  const atMarks: number[] = [];
  let peakDomCount = 0;
  let peakDomGeneration = 0;
  let peakFamilyPerGenome = 0;
  let peakFamilyGeneration = 0;
  let minAfterFirstMark = Infinity;

  for (let g = 1; g <= GENERATIONS; g++) {
    step(world);
    const s = observe(world);
    const n = world.genomes.length;
    const domPerGenome = s.domesticatedCopies / n;
    const familyPerGenome = (s.totalCopies - s.domesticatedCopies) / n;

    if (s.domesticatedCopies > peakDomCount) {
      peakDomCount = s.domesticatedCopies;
      peakDomGeneration = g;
    }
    if (familyPerGenome > peakFamilyPerGenome) {
      peakFamilyPerGenome = familyPerGenome;
      peakFamilyGeneration = g;
    }
    if (g >= firstMark && domPerGenome < minAfterFirstMark) {
      minAfterFirstMark = domPerGenome;
    }
    if (markSet.has(g)) atMarks.push(domPerGenome);
  }

  const snapshot = observe(world);
  return {
    p,
    snapshot,
    domPerGenome: snapshot.domesticatedCopies / world.genomes.length,
    domCount: snapshot.domesticatedCopies,
    familyCount: snapshot.totalCopies - snapshot.domesticatedCopies,
    peakDomCount,
    peakDomGeneration,
    peakFamilyPerGenome,
    peakFamilyGeneration,
    atMarks,
    minAtMarks: Math.min(...atMarks),
    minAfterFirstMark,
  };
}
