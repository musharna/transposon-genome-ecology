// Derivation sweeps for Guard 2 (tests/guards/three-phases.test.ts). Prints
// every number the guard's comments and thresholds rest on. Run:
//   npx tsx scripts/explore-three-phases.ts
//
// The arm itself — BASE, SEEDS, GENERATIONS, the seed subsets and the runner —
// is imported from tests/guards/three-phases-arm.ts, the SAME module the guard
// asserts against, so this script cannot describe a different model than the
// guard describes. There is one definition, not two hand-maintained copies.
import { detectPhasesDetailed } from "../sim/index.js";
import {
  BASE,
  DECAY_HORIZON,
  GENERATIONS,
  HORIZON_MARKS,
  INVARIANCE_SEEDS,
  KNOCKOUT_SEEDS,
  PLATEAU_BAND,
  PLATEAU_MIN_GENERATIONS,
  plateauDuration,
  runArm,
  SEEDS,
} from "../tests/guards/three-phases-arm.js";

const pad = (x: unknown, n: number) => String(x).padStart(n);
const f3 = (x: number) => x.toFixed(3);

// ---------------------------------------------------------------------------
// ARM 1: the guard arm. The three landmarks per seed, the cluster spread at
// amplification and at the plateau, and the two conditions that separate
// inactivation from extinction, measured AT the inactivation index.
// ---------------------------------------------------------------------------
console.log(
  `=== ARM 1: silenced arm, ${SEEDS.length} seeds, horizon ${GENERATIONS} ===`,
);
console.log(
  "seed   amp  plat  inact | peakTot  tot@inact  silenced  active  sil/act | fwr@amp fwr@plat  fwr rise",
);
const inactGens: number[] = [];
const ratios: number[] = [];
const fwrPlateaus: number[] = [];
const fwrAmps: number[] = [];
const rises: number[] = [];
for (const seed of SEEDS) {
  const a = runArm({ seed });
  const ph = a.result.phases;
  if (!ph) {
    console.log(`${pad(seed, 4)}   NULL (${a.result.failure})`);
    continue;
  }
  const at = a.h[ph.inactivation]!;
  const ratio = at.silencedCopies / Math.max(at.activeCopies, 1);
  const fwrAmp = a.h[ph.amplification]!.fractionWithRepertoire;
  const fwrPlat = a.h[ph.plateau]!.fractionWithRepertoire;
  inactGens.push(ph.inactivation);
  ratios.push(ratio);
  fwrAmps.push(fwrAmp);
  fwrPlateaus.push(fwrPlat);
  rises.push(fwrPlat - fwrAmp);
  console.log(
    `${pad(seed, 4)}  ${pad(ph.amplification, 4)}  ${pad(ph.plateau, 4)}  ${pad(ph.inactivation, 5)} | ${pad(a.h[ph.plateau]!.totalCopies, 7)}  ${pad(at.totalCopies, 9)}  ${pad(at.silencedCopies, 8)}  ${pad(at.activeCopies, 6)}  ${pad(ratio.toFixed(1), 6)} | ${f3(fwrAmp)}   ${f3(fwrPlat)}     ${f3(fwrPlat - fwrAmp)}`,
  );
}
const min = (xs: number[]) => Math.min(...xs);
const max = (xs: number[]) => Math.max(...xs);
console.log(
  `\nlatest inactivation ${max(inactGens)}, earliest ${min(inactGens)} => horizon ${GENERATIONS} leaves ${GENERATIONS - max(inactGens)} generations of headroom (${(GENERATIONS / max(inactGens)).toFixed(2)}x)`,
);
console.log(
  `silenced/active at inactivation: min ${min(ratios).toFixed(1)}, max ${max(ratios).toFixed(1)} (the guard asserts only > 1)`,
);
console.log(
  `fractionWithRepertoire at amplification: ${f3(min(fwrAmps))}..${f3(max(fwrAmps))}; at plateau: ${f3(min(fwrPlateaus))}..${f3(max(fwrPlateaus))}; rise ${f3(min(rises))}..${f3(max(rises))}`,
);

// ---------------------------------------------------------------------------
// ARM 2: horizon invariance. One history per seed run to the longest mark, then
// TRUNCATED at each mark and re-detected. If the landmarks move with the
// horizon, the guard's pinned GENERATIONS is load-bearing and every number in
// ARM 1 is a statement about 60 rather than about the invasion.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 2: landmark invariance under truncation at ${HORIZON_MARKS.join(", ")} ===`,
);
let moved = 0;
let checked = 0;
for (const seed of SEEDS) {
  const full = runArm({ seed }, max([...HORIZON_MARKS]));
  const cells: string[] = [];
  let ref = "";
  for (const m of HORIZON_MARKS) {
    const r = detectPhasesDetailed(full.h.slice(0, m + 1));
    const triple = r.phases
      ? `${r.phases.amplification}/${r.phases.plateau}/${r.phases.inactivation}`
      : `NULL(${r.failure})`;
    if (ref === "") ref = triple;
    else {
      checked++;
      if (triple !== ref) moved++;
    }
    cells.push(`${m}:${triple}`);
  }
  console.log(
    `seed ${pad(seed, 4)} ${cells.join("  ")}${(INVARIANCE_SEEDS as readonly number[]).includes(seed) ? "   <- asserted in the guard" : ""}`,
  );
}
console.log(
  `${checked} truncation comparisons, ${moved} in which the triple moved`,
);

// ---------------------------------------------------------------------------
// ARM 3: the knockout arm, which is the positive control for the guard's null
// assertion. It must be ALIVE and INVADING (else "no inactivation" is
// indistinguishable from "nothing happened") and it must stay far from site
// saturation, where `transpose`'s rejection sampler dominates.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 3: knockout arm (silencingOn: false), horizon ${GENERATIONS} ===`,
);
console.log(
  "seed  verdict           tot@0  tot@horizon    growth  perGenome  occupancy  silenced  repertoire",
);
for (const seed of KNOCKOUT_SEEDS) {
  const a = runArm({ seed, silencingOn: false });
  const verdict = a.result.phases
    ? `PHASES ${a.result.phases.amplification}/${a.result.phases.plateau}/${a.result.phases.inactivation}`
    : `NULL(${a.result.failure})`;
  console.log(
    `${pad(seed, 4)}  ${verdict.padEnd(16)} ${pad(a.h[0]!.totalCopies, 5)}  ${pad(a.last.totalCopies, 11)}  ${pad((a.last.totalCopies / a.h[0]!.totalCopies).toFixed(1) + "x", 8)}  ${pad(a.perGenome.toFixed(1), 9)}  ${pad((a.occupancy * 100).toFixed(1) + "%", 9)}  ${pad(a.last.silencedCopies, 8)}  ${pad(f3(a.last.fractionWithRepertoire), 10)}`,
  );
}

// ---------------------------------------------------------------------------
// ARM 4: what happens AFTER the horizon. This is the reason `detectPhases`
// conjoins `totalCopies > 0` and `silencedCopies > activeCopies` onto the 20%
// crossing: run far enough, this arm goes EXTINCT, and a crossing-only
// predicate reports a spike-and-crash as Kofler's invasion.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 4: post-inactivation decay, horizon ${DECAY_HORIZON} ===`,
);
console.log(
  "seed  peakTot   g60    g120   g200   g300  first generation with totalCopies == 0",
);
let extinctSeeds = 0;
const extinctGens: number[] = [];
for (const seed of SEEDS) {
  const a = runArm({ seed }, DECAY_HORIZON);
  let peak = 0;
  for (const s of a.h) peak = Math.max(peak, s.totalCopies);
  let extinct = -1;
  for (let i = 0; i < a.h.length; i++) {
    if (a.h[i]!.totalCopies === 0) {
      extinct = i;
      break;
    }
  }
  if (extinct >= 0) {
    extinctSeeds++;
    extinctGens.push(extinct);
  }
  console.log(
    `${pad(seed, 4)}  ${pad(peak, 7)} ${pad(a.h[60]!.totalCopies, 5)}  ${pad(a.h[120]!.totalCopies, 6)} ${pad(a.h[200]!.totalCopies, 6)} ${pad(a.h[300]!.totalCopies, 6)}  ${extinct >= 0 ? extinct : "not by " + DECAY_HORIZON}`,
  );
}
console.log(
  `${extinctSeeds} of ${SEEDS.length} seeds extinct by generation ${DECAY_HORIZON}${extinctGens.length > 0 ? `, earliest at ${min(extinctGens)}` : ""}`,
);

// ---------------------------------------------------------------------------
// ARM 5: the crossing-only predicate the plan specified, applied to the same
// extinct histories. Reproduced permanently so the strengthening is evidence
// rather than memory: this is the guard the plan would have shipped.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 5: the plan's crossing-only predicate at horizon ${DECAY_HORIZON} ===`,
);
function detectPhasesCrossingOnly(
  h: { totalCopies: number; activeCopies: number }[],
): { amplification: number; plateau: number; inactivation: number } | null {
  if (h.length < 10) return null;
  let amplification = 0;
  let bestGrowth = -Infinity;
  for (let i = 1; i < h.length; i++) {
    const g = h[i]!.totalCopies - h[i - 1]!.totalCopies;
    if (g > bestGrowth) {
      bestGrowth = g;
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
  for (let i = 0; i <= plateau; i++)
    peakActive = Math.max(peakActive, h[i]!.activeCopies);
  if (peakActive === 0) return null;
  for (let i = plateau + 1; i < h.length; i++)
    if (h[i]!.activeCopies < 0.2 * peakActive)
      return { amplification, plateau, inactivation: i };
  return null;
}
console.log(
  "seed  crossing-only triple  tot at its inactivation  strengthened triple  tot at its inactivation",
);
for (const seed of SEEDS) {
  const a = runArm({ seed }, DECAY_HORIZON);
  const crude = detectPhasesCrossingOnly(a.h);
  const strong = a.result.phases;
  console.log(
    `${pad(seed, 4)}  ${(crude ? `${crude.amplification}/${crude.plateau}/${crude.inactivation}` : "null").padEnd(20)}  ${pad(crude ? a.h[crude.inactivation]!.totalCopies : "-", 23)}  ${(strong ? `${strong.amplification}/${strong.plateau}/${strong.inactivation}` : "null").padEnd(19)}  ${pad(strong ? a.h[strong.inactivation]!.totalCopies : "-", 23)}`,
  );
}
console.log(
  '\nBoth predicates agree at this horizon in WHICH generation they name, because the\ncrossing, the survival condition and the silenced-majority condition all first hold\ntogether. The strengthening is not idle: it is what makes the returned index MEAN\ninactivation, and ARM 4 above is the trajectory that would otherwise let a run with\nzero copies satisfy it. See the guard\'s `it("...an extinct population...")` test,\nwhich builds exactly that history and checks the predicate rejects it.',
);
// ---------------------------------------------------------------------------
// ARM 6: the plateau as a DURATION, which is what makes it a phase rather than
// an argmax. Derives PLATEAU_MIN_GENERATIONS. Half of the guard's ordering claim
// (`plateau < inactivation`) is vacuous by construction of the inactivation
// scan, so this is the assertion that carries the plateau's weight instead: a
// spike-shaped model gets a run length of 1..2 here.
//
// Two measures are printed. `plateauDuration` — the maximal CONSECUTIVE run
// containing the plateau index — is the one the guard asserts. The count of
// generations inside the band anywhere in the history is printed beside it to
// check that the run is the only excursion (they are equal at every seed, so
// the "consecutive" qualifier is not hiding a second visit). The count inside
// the [amplification, inactivation] WINDOW is printed third and was REJECTED as
// the guard's statistic: it is bounded above by inactivation - amplification + 1
// (7..12 here), so its floor could only be 3 against a measured minimum of 4 —
// a one-generation margin on a quantity whose ceiling is set by the other two
// landmarks rather than by the trajectory.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 6: plateau duration, band ${PLATEAU_BAND} of peak, horizon ${GENERATIONS} ===`,
);
console.log(
  "seed  amp  plat  inact  peakTot |  consecutive (asserted)  anywhere-in-band  in [amp,inact] (rejected)",
);
const durations: number[] = [];
const windowed: number[] = [];
for (const seed of SEEDS) {
  const a = runArm({ seed });
  const ph = a.result.phases!;
  const peak = a.h[ph.plateau]!.totalCopies;
  const run = plateauDuration(a.h, ph.plateau);
  let anywhere = 0;
  for (const s of a.h) if (s.totalCopies >= PLATEAU_BAND * peak) anywhere++;
  let win = 0;
  for (let i = ph.amplification; i <= ph.inactivation; i++)
    if (a.h[i]!.totalCopies >= PLATEAU_BAND * peak) win++;
  durations.push(run);
  windowed.push(win);
  console.log(
    `${pad(seed, 4)} ${pad(ph.amplification, 4)}  ${pad(ph.plateau, 4)}  ${pad(ph.inactivation, 5)}  ${pad(peak, 7)} | ${pad(run, 22)}  ${pad(anywhere, 16)}  ${pad(win, 24)}${run === anywhere ? "" : "   <- RUN IS NOT THE ONLY EXCURSION"}`,
  );
}
console.log(
  `\nconsecutive: min ${min(durations)} (weakest), max ${max(durations)}, mean ${(durations.reduce((x, y) => x + y, 0) / durations.length).toFixed(1)} => floor ${PLATEAU_MIN_GENERATIONS} leaves a ${min(durations) - PLATEAU_MIN_GENERATIONS}-generation margin (${(min(durations) / PLATEAU_MIN_GENERATIONS).toFixed(2)}x)`,
);
console.log(
  `rejected window statistic: min ${min(windowed)}, max ${max(windowed)} — see the comment above ARM 6`,
);

console.log(`\nBASE: ${JSON.stringify(BASE)}`);
