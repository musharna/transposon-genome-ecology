/**
 * The Guard 2 arm, defined ONCE.
 *
 * `tests/guards/three-phases.test.ts` asserts against this arm and
 * `scripts/explore-three-phases.ts` derives the guard's horizon and thresholds
 * from it. Neither file carries its own copy of `BASE`, `SEEDS` or
 * `GENERATIONS`, so the sweep cannot silently stop describing the guard — the
 * Task 11/12 pattern (`tests/guards/escape-arm.ts`, `tests/guards/bloat-arm.ts`),
 * reused here for the same reason.
 *
 * This file lives under `tests/` so `tsconfig.json`'s `include` typechecks it,
 * and therefore typechecks `BASE` against `Params`, which `scripts/` is not.
 * It does NOT end in `.test.ts`, and `vitest.config.ts`'s `include` is
 * `["tests/**\/*.test.ts"]`, so vitest never collects it — verified in this task
 * by test-file count (12 files before, 13 after, not 14), not assumed.
 *
 * Every figure in this file and in the guard was measured in THIS task by
 * `scripts/explore-three-phases.ts`, which prints all of them: ARM 1 the
 * silenced arm's landmarks at every seed, ARM 2 the horizon-invariance of those
 * landmarks, ARM 3 the knockout arm, ARM 4 the post-horizon decay to extinction.
 * No wall-clock time is quoted anywhere in the guard: run times are
 * machine-dependent and do not reproduce. Occupancy does.
 */
import {
  createWorld,
  defaultParams,
  detectPhasesDetailed,
  history,
  type Params,
  type PhaseResult,
  type Snapshot,
} from "../../sim/index.js";

/**
 * Fully pinned — all 20 fields, nothing inherited from `defaultParams`'
 * provisional values, because a guard's configuration is part of the guard.
 *
 * This is an INVASION arm: a single founding copy per genome at a high rate
 * (`r0 = 0.2`) into a large genome (`S = 3000`) with a 2% cluster span
 * (`c = 0.02`, so 60 cluster sites). It is deliberately not the Guard 4 arm —
 * Guard 4 compares two arms at a fixed horizon, this one has to traverse a
 * whole invasion, and the two need different coefficients.
 *
 * The fields that carry the invasion:
 *   - `r0 = 0.2` with `sigmaR = 0.02`: fast amplification, and a rate that
 *     barely drifts, so what stops the invasion is silencing rather than rate
 *     evolution (which is Guard 5's subject, not this one).
 *   - `sigmaS = 0.005` against `theta = 0.15`: a daughter's sequence coordinate
 *     moves ~1/30th of a silencing window per transposition, so escape by
 *     divergence — Guard 6's subject — is negligible here and the trap, once
 *     formed, holds. This is the opposite regime from Guard 4's arm, where
 *     `sigmaS` is 2x `theta` and escape is routine. Both are legitimate; they
 *     are guarding different mechanisms.
 *   - `v = 0.005`: excision slow enough that the plateau is a plateau and not a
 *     collapse. See EXTINCTION, below, for what it does after the horizon.
 *   - `a = 0.0004, b = 0.00001`: copy-number load light enough that the
 *     population can amplify to thousands of copies before selection bites.
 *   - `pDom = 0`: no domestication, so `beta` and `wDom` are inert and
 *     `activeCopies` + `silencedCopies` exhaust every copy. The guard does not
 *     rely on that partition in general (`sim/silencing.ts` excludes
 *     domesticated copies from BOTH), but with `pDom = 0` it holds here, which
 *     is why `totalCopies` and the active/silenced split can be read together.
 *   - `t = 0`: pure resistance, so `trap` captures unconditionally
 *     (`sim/phases/trap.ts`) and `dTol` is inert. A tolerant host never forms a
 *     repertoire and could not have a plateau enforced by one.
 *   - `d = 0.0005`, `beta = 0.005`, `wDom = 0.01`, `rMax = 1`, `dTol = 0.002`
 *     are `defaultParams`' values, pinned here rather than inherited.
 *
 * ---------------------------------------------------------------------------
 * EXTINCTION — A REAL PROPERTY OF THE MODEL, DELIBERATELY NOT FIXED HERE
 * ---------------------------------------------------------------------------
 * THIS IS THE CANONICAL STATEMENT of the property. `sim/phases-detect.ts` and
 * `tests/guards/three-phases.test.ts` point here rather than restating it; an
 * earlier draft carried three copies of this paragraph and two copies of the
 * figures, which is three places for one measurement to go stale.
 *
 * Full inactivation implies the family eventually DIES in this model.
 * `sim/phases/lifecycle.ts`'s `lose` exempts only domesticated copies from
 * excision, so silenced copies keep being lost at rate `v` while silencing
 * prevents them from replacing themselves; decay to zero is then guaranteed.
 * ARM 4 of the sweep prints it: measured at these parameters, total copies fall
 * from a peak of 3400..6847 to 249..818 by generation 120 and 9..201 by
 * generation 200, and 8 of the 11 seeds reach `totalCopies: 0` on or before
 * generation 300 (earliest generation 205, seeds 4 and 202); the other three
 * are down to 5, 21 and 25 copies at 300.
 *
 * WHY THIS IS A DIVERGENCE FROM BIOLOGY, SPLIT INTO THE PART THAT IS CITED AND
 * THE PART THAT IS AN ASSUMPTION. An earlier version of this comment asserted
 * "real silenced TE insertions largely persist as genomic fossils" with nothing
 * behind it, while resting the whole divergence claim on it. Separated:
 *
 *   CITED. Inactive TE copies persist in genomes in overwhelming numbers rather
 *   than being purged. Brouha et al. 2003, PNAS 100(9):5280-5285,
 *   10.1073/pnas.0831042100 (registry-verified 2026-09-03 against CrossRef:
 *   first author Brouha, 2003, PNAS): LINE-1 makes up 17% of the human genome,
 *   an exhaustive search of the draft sequence found only 90 L1s with intact
 *   ORFs, and they estimate 80-100 retrotransposition-competent L1s per person.
 *   Hundreds of thousands of copies, of order a hundred able to move. Whatever
 *   removes TE copies from a genome, it is far too slow to have removed those.
 *
 *   ASSUMPTION, NOT A FACT ABOUT BIOLOGY. That piRNA-SILENCED copies
 *   specifically persist, i.e. that silencing and removal are decoupled. This
 *   model applies one excision rate `v` to every copy regardless of silencing
 *   state, so a fully silenced family is excised to zero. Note also that Brouha's
 *   L1 is a RETROtransposon and copies by copy-and-paste — it has no excision
 *   mechanism at all, so its persistence is partly structural and does not
 *   transfer wholesale to a cut-and-paste element. The right reading is that
 *   `lose`'s uniform `v` is a simplification whose consequence (guaranteed
 *   extinction after full silencing) is visible and known, not that biology has
 *   been measured and contradicted here.
 *
 * It is NOT fixed here: changing `lose` would alter the RNG draw stream and
 * invalidate every calibration in the suite. It is flagged in the spec, at
 * §10 "Open items carried into planning" — a bullet that exists as of
 * 2026-09-03; before that this sentence pointed at nothing. It is the direct
 * reason `detectPhases` conjoins `totalCopies > 0` and
 * `silencedCopies > activeCopies` onto the crossing — without them, this arm run
 * far enough reports a spike-and-crash to extinction as Kofler's invasion.
 */
export const BASE: Params = {
  N: 300,
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
  beta: 0.005,
  pDom: 0,
  wDom: 0.01,
  sexual: true,
  silencingOn: true,
  seed: 7,
};

/**
 * The horizon, derived in this task rather than copied from the plan (which
 * specified 600).
 *
 * The constraint is: comfortably past the LATEST inactivation across the seed
 * set, and cheap enough that the knockout arm — which never inactivates, and so
 * grows for the whole horizon — stays far from site saturation and the file
 * stays fast.
 *
 * Measured by ARM 1: inactivation lands at generation 26..31 across the eleven
 * seeds (latest 31, seed 3; earliest 26, seeds 4, 5 and 101). So 60 leaves 29
 * generations of headroom past the latest, a 1.94x margin, and every landmark
 * sits in the first 52% of the run.
 *
 * ARM 2 shows the choice is not load-bearing in either direction: truncating the
 * same histories at 40, 50, 60, 80, 120, 200 and 300 gives BIT-IDENTICAL
 * `(amplification, plateau, inactivation)` triples at all eleven seeds — 66
 * comparisons (7 marks per seed, each compared against the seed's first mark, at
 * 11 seeds), 0 in which the triple moved. That is the ONE framing used
 * everywhere: the sweep prints it, the guard's fourth test asserts it, and this
 * paragraph quotes it. (An earlier draft here counted the 77 detections instead
 * of the 66 comparisons — the same measurement described two ways, which is one
 * way too many.) See the fourth test in `three-phases.test.ts` for which THIRD of
 * the triple that invariance is actually informative about; one of the three is a
 * tautology of the scan.
 *
 * The horizon is bounded from ABOVE by the knockout arm, not by the silenced
 * one. With silencing off there is no trap, nothing inactivates, and copy
 * number keeps compounding: ARM 3 measures 541..622 copies per genome at
 * generation 60 (18.0%..20.7% site occupancy). Past roughly 40% occupancy
 * `transpose`'s rejection sampler needs several draws per insertion and the arm
 * starts reporting the sampler as much as the model; the plan's horizon of 600
 * put it at 74.7%.
 */
export const GENERATIONS = 60;

/**
 * The seed set every per-seed claim is checked at. 1..17 are small values; 101
 * and 202 are the seeds the Guard 4/5/6 sweeps already use. No claim in the
 * guard rests on a single seed — the plan specified seed 7 alone.
 */
export const SEEDS = [1, 2, 3, 4, 5, 7, 11, 13, 17, 101, 202] as const;

/**
 * The seeds the KNOCKOUT arm is run at. Three, not eleven, and that is a cost
 * decision stated openly: with silencing off nothing inactivates, so the arm
 * compounds for the whole horizon and one seed costs roughly thirty times a
 * silenced one. Three independent streams is replication against arithmetic
 * accident; the claim it supports ("no inactivation without a trap") is
 * mechanistic — `trap` returns immediately when `silencingOn` is false
 * (`sim/phases/trap.ts`), so no repertoire can ever form and `isSilenced` is
 * false for every copy — not statistical.
 */
export const KNOCKOUT_SEEDS = [1, 5, 7] as const;

/**
 * The marks ARM 2 and the horizon-invariance test truncate the histories at.
 * 40 is below `GENERATIONS` and still past every inactivation; 300 is five
 * times it and deep into the post-inactivation decay documented on `BASE`.
 */
export const HORIZON_MARKS = [40, 50, 60, 80, 120, 200, 300] as const;

/**
 * The seeds the horizon-invariance test uses. Three streams, chosen rather than
 * sampled: seed 3 has the LATEST inactivation (31), seed 11 the WIDEST
 * plateau-to-inactivation gap (22 -> 27, five generations where every other
 * seed's is one or two), and seed 101 the EARLIEST amplification (13) and the
 * lowest cluster spread at amplification (0.320). If the landmarks were going to
 * move with the horizon, these are the seeds where it would show.
 */
export const INVARIANCE_SEEDS = [3, 11, 101] as const;

/** The horizon ARM 4 runs to when documenting the post-inactivation decay. */
export const DECAY_HORIZON = 300;

/**
 * The band that defines "still at the plateau": total copy number within 10% of
 * its peak. Shared by the guard and by ARM 6 of the sweep so the assertion and
 * the measurement that derived its floor cannot drift apart.
 */
export const PLATEAU_BAND = 0.9;

/**
 * The floor on how many CONSECUTIVE generations copy number stays inside
 * `PLATEAU_BAND` of its peak — the plateau as a DURATION rather than as an
 * argmax. Derived in ARM 6: measured 9..16 generations across the eleven seeds
 * (weakest seed 202 at 9, strongest seeds 1 and 4 at 16, mean 12.4), so a floor
 * of 6 leaves a 3-generation margin, 1.5x, under the weakest seed.
 *
 * This is the assertion a SPIKE-shaped model fails: a run that peaks for one
 * generation and falls away has a run length of 1..2 here, while the ordering
 * assertions it would still satisfy. It is the one number in this guard that
 * makes the word "plateau" mean a phase.
 */
export const PLATEAU_MIN_GENERATIONS = 6;

/**
 * The length of the maximal run of CONSECUTIVE generations containing `plateau`
 * over which total copy number stays at or above `PLATEAU_BAND` of its peak.
 *
 * `plateau` is by definition the index attaining that peak, so the run always
 * contains it and is at least 1 — the quantity is a duration, and 1 is the value
 * a pure spike gets. Measured note, not an assumption: at every one of the
 * eleven seeds this maximal run is the ONLY stretch of the whole history inside
 * the band (ARM 6 prints both the run and the whole-history count, and they are
 * equal at every seed), so there is no second excursion for the "containing
 * `plateau`" qualifier to be doing work against here. It is written that way
 * anyway, because a duration that could be summed out of two separate visits to
 * the band would not be a phase.
 */
export function plateauDuration(h: Snapshot[], plateau: number): number {
  const threshold = PLATEAU_BAND * h[plateau]!.totalCopies;
  let lo = plateau;
  while (lo - 1 >= 0 && h[lo - 1]!.totalCopies >= threshold) lo--;
  let hi = plateau;
  while (hi + 1 < h.length && h[hi + 1]!.totalCopies >= threshold) hi++;
  return hi - lo + 1;
}

export interface ArmResult {
  p: Params;
  /** `history(w, generations)`: length generations + 1, `h[i]` is generation i. */
  h: Snapshot[];
  /** The detector's verdict, with the null path named. */
  result: PhaseResult;
  /** Snapshot at the horizon. */
  last: Snapshot;
  /** Copies per genome at the horizon. `totalCopies` is a POPULATION total. */
  perGenome: number;
  /** Copies per genome as a fraction of S — how close `transpose` is to saturation. */
  occupancy: number;
}

/** `BASE` with `overrides` applied, without paying for any generations. */
export function armParams(overrides: Partial<Params>): Params {
  return defaultParams({ ...BASE, ...overrides });
}

/**
 * `BASE` with `overrides` applied, observed at generation 0 and after each of
 * `generations` steps, then run through the detector.
 */
export function runArm(
  overrides: Partial<Params>,
  generations: number = GENERATIONS,
): ArmResult {
  const p = armParams(overrides);
  const world = createWorld(p);
  const h = history(world, generations);
  const last = h[h.length - 1]!;
  const perGenome = last.totalCopies / p.N;
  return {
    p,
    h,
    result: detectPhasesDetailed(h),
    last,
    perGenome,
    occupancy: perGenome / p.S,
  };
}
