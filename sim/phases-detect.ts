import type { Snapshot } from "./observe.js";

export interface PhaseIndices {
  /** Generation of peak growth rate in total copy number. */
  amplification: number;
  /** Generation at which total copy number peaks — growth has stopped. */
  plateau: number;
  /**
   * First generation after the plateau at which the family is INACTIVATED:
   * active copies have fallen below 20% of their own pre-plateau peak, copies
   * still exist, and silenced copies outnumber active ones.
   */
  inactivation: number;
}

/**
 * Which of the four exits `detectPhases` took when it returned null. A caller
 * asserting `detectPhases(...) === null` is otherwise asserting a disjunction of
 * four unrelated propositions — "the run never inactivated" and "nothing
 * happened at all" are the same value. `tests/guards/three-phases.test.ts`
 * asserts on this so its null assertion names one path.
 */
export type PhaseFailure =
  /** Fewer than 10 snapshots — nothing to locate landmarks in. */
  | "too-short"
  /** Total copy number never rose between consecutive generations. */
  | "no-growth"
  /** No active copy existed at or before the plateau. */
  | "no-active-peak"
  /** Growth and a plateau, but no generation after it satisfies inactivation. */
  | "no-inactivation";

export type PhaseResult =
  | { phases: PhaseIndices; failure: null }
  | { phases: null; failure: PhaseFailure };

/**
 * Locates Kofler's three phases in a run's history. Deliberately crude: these
 * are ORDERING LANDMARKS for a guard, not an inference procedure. It fits no
 * model, estimates no breakpoint, and its three indices are argmaxes and a
 * first-crossing, so the only thing it is fit to support is a claim about the
 * ORDER in which the three things happened.
 *
 * ---------------------------------------------------------------------------
 * WHY INACTIVATION CARRIES TWO CONDITIONS BEYOND THE CROSSING
 * ---------------------------------------------------------------------------
 * "Active copies fell below 20% of their peak" is satisfied TRIVIALLY BY A DEAD
 * POPULATION: `activeCopies` is 0 when every copy is gone, so a spike-and-crash
 * to extinction reports three phases and passes an ordering guard. That is not
 * hypothetical at this model's invasion parameters: the CANONICAL statement of
 * that model property, with the measured decay figures, is the EXTINCTION note
 * on `BASE` in `tests/guards/three-phases-arm.ts` — it is not restated here or
 * in the guard, so there is one copy to keep true. ARM 4 of
 * `scripts/explore-three-phases.ts` prints it.
 *
 * Inactivation means *the copies are still there and are silenced*, not *the
 * copies are gone*. So the crossing is conjoined with:
 *   - `totalCopies > 0` — there is still a family to be inactivated;
 *   - `silencedCopies > activeCopies` — it is silenced rather than merely small.
 * Both are measured at every guard seed in ARM 1 of the sweep, with the margins
 * recorded there. Neither is a tunable: they are the two ways the word
 * "inactivation" can be false while the crossing is true.
 *
 * The scan CONTINUES past an index that meets the crossing but fails either
 * added condition, and returns the FIRST index meeting all three — it does not
 * stop at the first crossing and give up. That is a semantic choice, not an
 * implementation detail: a family can dip below the crossing before the trap has
 * silenced the majority of it, and the generation that deserves the name
 * "inactivation" is the later one. Pinned by case D of the fifth test in
 * `tests/guards/three-phases.test.ts`; without that case, a version returning
 * `no-inactivation` at the first failed conjunction passes the whole suite.
 *
 * `silencedCopies` and `activeCopies` both exclude domesticated copies
 * (`sim/silencing.ts`), so this compares suppressed against transposition-capable
 * and says nothing about domesticated copies either way.
 *
 * The two added conditions are NOT independent, and that was measured rather
 * than assumed. `silencedCopies` counts copies, so
 * `silencedCopies > activeCopies >= 0` forces `silencedCopies >= 1` and hence
 * `totalCopies >= 1`: the survival condition is IMPLIED by the majority
 * condition, and deleting it leaves the whole suite green — a surviving mutant,
 * recorded here as one. It is kept because it is half of what the word
 * "inactivation" asserts and because `silencedCopies` is a derived quantity
 * (`sim/silencing.ts`) whose definition could change; it is not kept under any
 * pretence that it can reject a history the majority condition would accept.
 *
 * Pure: it reads a `Snapshot[]` and consumes no randomness, so it cannot move
 * the golden state hash in `tests/step.test.ts`.
 */
export function detectPhasesDetailed(h: Snapshot[]): PhaseResult {
  if (h.length < 10) return { phases: null, failure: "too-short" };

  // Amplification: the steepest one-generation rise in total copy number.
  let amplification = 0;
  let bestGrowth = -Infinity;
  for (let i = 1; i < h.length; i++) {
    const growth = h[i]!.totalCopies - h[i - 1]!.totalCopies;
    if (growth > bestGrowth) {
      bestGrowth = growth;
      amplification = i;
    }
  }
  if (bestGrowth <= 0) return { phases: null, failure: "no-growth" };

  // Plateau: the last generation at or after amplification that attains the
  // running maximum of total copy number — growth has stopped by then.
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
  if (peakActive === 0) return { phases: null, failure: "no-active-peak" };

  for (let i = plateau + 1; i < h.length; i++) {
    const s = h[i]!;
    if (
      s.activeCopies < 0.2 * peakActive &&
      s.totalCopies > 0 &&
      s.silencedCopies > s.activeCopies
    ) {
      return {
        phases: { amplification, plateau, inactivation: i },
        failure: null,
      };
    }
  }
  return { phases: null, failure: "no-inactivation" };
}

/**
 * The three phase landmarks, or null if the run never reaches an inactivation
 * that means what the word means. See `detectPhasesDetailed` for the definition
 * of each landmark and for why null has four distinct causes — a caller that
 * needs to know WHICH should call that instead of this.
 */
export function detectPhases(h: Snapshot[]): PhaseIndices | null {
  return detectPhasesDetailed(h).phases;
}
