// Derivation sweeps for Guard 3 (tests/guards/cluster-threshold.test.ts).
// Prints every number the guard's comments and thresholds rest on. Run:
//   npx tsx scripts/explore-cluster-threshold.ts
//
// The arm itself — BASE, FRACTIONS, SEEDS, GENERATIONS, the blocks, the
// reduction ladder and the thresholds — is imported from
// tests/guards/cluster-threshold-arm.ts, the SAME module the guard asserts
// against and the same module tools/sweep-cluster-size.ts sweeps by default,
// so this script cannot describe a different model than the guard describes.
// There is one definition, not three hand-maintained copies.
//
// ARM 4 (the horizon probe) is the expensive one — it reruns the whole grid at
// four horizons, the largest of which is well past the guard's. This script is
// not part of the test suite and is not run in CI.
import {
  repressionOnset,
  sweepClusterSize,
  type SweepPoint,
} from "../tools/sweep-cluster-size.js";
import {
  ALIVE_FLOOR,
  BASE,
  BLOCK_2,
  BLOCK_3,
  FRACTIONS,
  GENERATIONS,
  HORIZON_MARKS,
  KOFLER_HI,
  KOFLER_LO,
  OCCUPANCY_CEILING,
  REDUCTION_ABOVE_BAND,
  REDUCTION_BELOW_BAND,
  REDUCTION_PERCENTS,
  REDUCTION_UNREACHABLE,
  SEEDS,
} from "../tests/guards/cluster-threshold-arm.js";

const pad = (x: unknown, n: number) => String(x).padStart(n);
const inBand = (c: number) => c >= KOFLER_LO && c <= KOFLER_HI;

/** Every reduction constant the guard mentions, in order, for the ladder. */
const LADDER = [
  5,
  10,
  REDUCTION_BELOW_BAND,
  ...REDUCTION_PERCENTS,
  REDUCTION_ABOVE_BAND,
  REDUCTION_UNREACHABLE,
];

function onsetOf(points: SweepPoint[], pct: number): number | undefined {
  return repressionOnset(points, pct / 100)?.c;
}

// ---------------------------------------------------------------------------
// ARM 1: the guard's own sweep, per seed. Everything test 1 asserts comes from
// here: the liveness minimum, the c = 0 knockout identity, the trap control,
// the control arm's occupancy, the monotone step ratios and the endpoint ratio.
// ---------------------------------------------------------------------------
console.log(
  `=== ARM 1: the guard sweep — ${FRACTIONS.length} fractions x ${SEEDS.length} seeds x ${GENERATIONS} generations ===`,
);
const t1 = Date.now();
const guard = sweepClusterSize(FRACTIONS, SEEDS, GENERATIONS);
const guardSeconds = (Date.now() - t1) / 1000;
const none = guard[0]!;

console.log(
  "     c  sites       mean   %of c=0   weakest    minSil    minFwr   ratio",
);
for (let i = 0; i < guard.length; i++) {
  const p = guard[i]!;
  const sites = Math.floor(p.c * BASE.S);
  const pct = (100 * p.meanFinalCopies) / none.meanFinalCopies;
  const ratio =
    i === 0
      ? "     -"
      : pad((p.meanFinalCopies / guard[i - 1]!.meanFinalCopies).toFixed(3), 6);
  console.log(
    `${pad(p.c, 6)}  ${pad(sites, 5)}  ${pad(p.meanFinalCopies.toFixed(1), 9)}  ${pad(pct.toFixed(1), 8)}  ${pad(Math.min(...p.finalCopies), 8)}  ${pad(Math.min(...p.finalSilencedCopies), 8)}  ${pad(Math.min(...p.finalFractionWithRepertoire).toFixed(2), 8)}  ${ratio}`,
  );
}
console.log(
  `\nliveness: global minimum over the whole grid = ${Math.min(...guard.flatMap((p) => p.finalCopies))} copies, floor is ${ALIVE_FLOOR}`,
);
console.log(
  `c = 0 knockout identity: max silenced = ${Math.max(...none.finalSilencedCopies)}, max fractionWithRepertoire = ${Math.max(...none.finalFractionWithRepertoire)}`,
);
const occ = none.finalCopies.map((t) => t / BASE.N / BASE.S);
const worstOccSeed = SEEDS[occ.indexOf(Math.max(...occ))];
console.log(
  `c = 0 occupancy: max ${(100 * Math.max(...occ)).toFixed(1)}% (seed ${worstOccSeed}), mean ${((100 * occ.reduce((a, b) => a + b, 0)) / occ.length).toFixed(1)}%, ceiling ${100 * OCCUPANCY_CEILING}%`,
);
console.log(
  `c = 0 per-seed totals: ${none.finalCopies.map((t, i) => `s${SEEDS[i]}=${t}`).join(" ")}`,
);
console.log(
  `spread of the c = 0 arm: ${Math.min(...none.finalCopies)}..${Math.max(...none.finalCopies)} = ${(Math.max(...none.finalCopies) / Math.min(...none.finalCopies)).toFixed(2)}x`,
);
const large = guard[guard.length - 1]!;
console.log(
  `endpoint: c = ${large.c} at ${large.meanFinalCopies.toFixed(1)} vs c = 0 at ${none.meanFinalCopies.toFixed(1)} = ${(none.meanFinalCopies / large.meanFinalCopies).toFixed(2)}x`,
);
const weakestSeedArm = guard.flatMap((p) =>
  p.finalCopies.map((t, i) => ({ c: p.c, seed: SEEDS[i], t })),
);
weakestSeedArm.sort((a, b) => a.t - b.t);
console.log(
  `weakest single (c, seed): c = ${weakestSeedArm[0]!.c}, seed ${weakestSeedArm[0]!.seed}, ${weakestSeedArm[0]!.t} copies`,
);
console.log(`(this sweep took ${guardSeconds.toFixed(1)}s on this machine)`);

// ---------------------------------------------------------------------------
// ARM 2: three DISJOINT 11-seed blocks. This is the check that decided the seed
// count. At three seeds the onset moves between seed sets; the guard needs a
// pooled count at which it does not. Also prints the per-seed monotonicity
// count, which is why the guard asserts monotonicity on the means ONLY.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 2: three disjoint ${SEEDS.length}-seed blocks at ${GENERATIONS} generations ===`,
);
const blocks: { label: string; seeds: number[] }[] = [
  { label: `blk1 (${SEEDS[0]}..${SEEDS[SEEDS.length - 1]})`, seeds: SEEDS },
  {
    label: `blk2 (${BLOCK_2[0]}..${BLOCK_2[BLOCK_2.length - 1]})`,
    seeds: BLOCK_2,
  },
  {
    label: `blk3 (${BLOCK_3[0]}..${BLOCK_3[BLOCK_3.length - 1]})`,
    seeds: BLOCK_3,
  },
];
const swept = blocks.map((b) => ({
  ...b,
  points:
    b.seeds === SEEDS
      ? guard
      : sweepClusterSize(FRACTIONS, b.seeds, GENERATIONS),
}));

console.log("     c  " + swept.map((s) => pad(s.label, 16)).join(""));
for (const p of FRACTIONS) {
  const cells = swept.map((s) => {
    const pt = s.points.find((q) => q.c === p)!;
    const base = s.points[0]!.meanFinalCopies;
    return pad(
      `${pt.meanFinalCopies.toFixed(0)} (${((100 * pt.meanFinalCopies) / base).toFixed(1)}%)`,
      16,
    );
  });
  console.log(`${pad(p, 6)}  ` + cells.join(""));
}
for (const s of swept) {
  const means = s.points.map((p) => p.meanFinalCopies);
  const ups = means.filter((m, i) => i > 0 && m >= means[i - 1]!).length;
  console.log(
    `${s.label}: mean series has ${ups} non-decreasing step(s); min over grid = ${Math.min(...s.points.flatMap((p) => p.finalCopies))} copies`,
  );
}

console.log(
  "\nper-seed monotonicity across the grid (the guard does NOT assert this):",
);
let nonMonotoneSeeds = 0;
let totalSeeds = 0;
for (const s of swept) {
  for (let i = 0; i < s.seeds.length; i++) {
    totalSeeds++;
    const series = s.points.map((p) => p.finalCopies[i]!);
    const ups = series.filter((v, j) => j > 0 && v > series[j - 1]!).length;
    if (ups > 0) {
      nonMonotoneSeeds++;
      console.log(
        `  seed ${pad(s.seeds[i], 2)}: ${ups} up-step(s)  [${series.join(", ")}]`,
      );
    }
  }
}
console.log(
  `  ${nonMonotoneSeeds}/${totalSeeds} individual seeds are NOT monotone; all ${swept.length} block MEANS are.`,
);

// ---------------------------------------------------------------------------
// ARM 2b: WHY ELEVEN SEEDS AND NOT THREE. Re-uses the per-seed totals ARM 2
// already paid for — no extra runs — and re-pools them into every disjoint
// 3-seed triple of 1..33, then into the three 11-seed blocks. The question is
// not whether the onset is the same number at every sub-sample (it is not, even
// at eleven) but whether it stays INSIDE Kofler's band, which is what the guard
// asserts.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 2b: band membership at 3 pooled seeds vs at ${SEEDS.length}, over disjoint sub-samples of seeds 1..33 ===`,
);
/** Per-fraction, per-seed totals for seeds 1..33 in order. */
const pooledSeeds = swept.flatMap((s) => s.seeds);
const pooledTotals = FRACTIONS.map((c) =>
  swept.flatMap((s) => s.points.find((q) => q.c === c)!.finalCopies),
);
function onsetOfSubset(idx: number[], pct: number): number | undefined {
  const means = pooledTotals.map(
    (totals) => idx.reduce((a, i) => a + totals[i]!, 0) / idx.length,
  );
  const threshold = (1 - pct / 100) * means[0]!;
  for (let i = 1; i < FRACTIONS.length; i++) {
    if (means[i]! < threshold) return FRACTIONS[i];
  }
  return undefined;
}
function subsets(size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i + size <= pooledSeeds.length; i += size) {
    out.push(Array.from({ length: size }, (_, k) => i + k));
  }
  return out;
}
for (const size of [3, SEEDS.length]) {
  const groups = subsets(size);
  console.log(
    `\n  ${groups.length} disjoint ${size}-seed sub-samples: ${groups.map((g) => `${pooledSeeds[g[0]!]}-${pooledSeeds[g[g.length - 1]!]}`).join(" ")}`,
  );
  console.log(
    "  red  " +
      groups.map((g) => pad(String(pooledSeeds[g[0]!]), 7)).join("") +
      "   out-of-band sub-samples",
  );
  for (const pct of LADDER) {
    const onsets = groups.map((g) => onsetOfSubset(g, pct));
    const bad = onsets.filter((o) => o === undefined || !inBand(o)).length;
    console.log(
      `${pad(pct, 5)}%  ` +
        onsets.map((o) => pad(o === undefined ? "none" : o, 7)).join("") +
        `   ${bad}/${groups.length}${bad === 0 ? "" : "  <-- a guard pooling this many seeds is flaky here"}`,
    );
  }
}

// ---------------------------------------------------------------------------
// ARM 3: the onset ladder. The guard asserts band membership at every constant
// in REDUCTION_PERCENTS and asserts the two boundary constants just outside it.
// This is where those choices come from, and it is checked at all three blocks
// so the asserted window is not an artefact of the guard's own seeds.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 3: onset vs reduction constant, at each block. Kofler band [${KOFLER_LO}, ${KOFLER_HI}] ===`,
);
console.log(
  "  red  " +
    swept.map((s) => pad(s.label.split(" ")[0], 8)).join("") +
    "   all in band?   asserted by the guard",
);
for (const pct of LADDER) {
  const onsets = swept.map((s) => onsetOf(s.points, pct));
  const all = onsets.every((o) => o !== undefined && inBand(o));
  const asserted = REDUCTION_PERCENTS.includes(pct)
    ? "TEST 2: in band"
    : pct === REDUCTION_BELOW_BAND
      ? "TEST 3: below band"
      : pct === REDUCTION_ABOVE_BAND
        ? "TEST 3: above band"
        : pct === REDUCTION_UNREACHABLE
          ? "TEST 3: undefined"
          : "-";
  console.log(
    `${pad(pct, 5)}%  ` +
      onsets.map((o) => pad(o === undefined ? "none" : o, 8)).join("") +
      `   ${pad(all ? "YES" : "no", 12)}   ${asserted}`,
  );
}

console.log(
  "\nmargin at the lower edge of the asserted window: for the onset to stay at or above",
);
console.log(
  `Kofler's floor at a ${REDUCTION_PERCENTS[0]}% reduction, the c = ${FRACTIONS[1]} arm must hold at or above ${100 - REDUCTION_PERCENTS[0]!}% of its block's control.`,
);
for (const s of swept) {
  const small = s.points[1]!.meanFinalCopies;
  const base = s.points[0]!.meanFinalCopies;
  const held = (100 * small) / base;
  console.log(
    `  ${s.label}: ${held.toFixed(1)}%  (${(held - (100 - REDUCTION_PERCENTS[0]!)).toFixed(1)} percentage points of room)`,
  );
}

// ---------------------------------------------------------------------------
// ARM 4: the horizon probe. The guard's window of reduction constants is NOT
// horizon-independent, and this is the measurement that says so. Reruns the
// whole ladder at each of HORIZON_MARKS, at the guard's seeds.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 4: the ladder at horizons ${HORIZON_MARKS.join(", ")} (guard seeds) ===`,
);
console.log(
  "    G  " +
    LADDER.map((p) => pad(`${p}%`, 7)).join("") +
    "   c=0 mean   occ   minTot",
);
for (const g of HORIZON_MARKS) {
  const points =
    g === GENERATIONS ? guard : sweepClusterSize(FRACTIONS, SEEDS, g);
  const row = LADDER.map((pct) => {
    const o = onsetOf(points, pct);
    return pad(o === undefined ? "none" : o, 7);
  });
  const base = points[0]!;
  const o = base.meanFinalCopies / BASE.N / BASE.S;
  console.log(
    `${pad(g, 5)}  ` +
      row.join("") +
      `   ${pad(base.meanFinalCopies.toFixed(0), 8)}  ${pad((100 * o).toFixed(1) + "%", 5)}  ${pad(Math.min(...points.flatMap((p) => p.finalCopies)), 6)}`,
  );
  const window = LADDER.filter((pct) => {
    const c = onsetOf(points, pct);
    return c !== undefined && inBand(c);
  });
  console.log(
    `       in-band constants: ${window.length === 0 ? "none" : `${window[0]}%..${window[window.length - 1]}%`} (${window.map((w) => `${w}%`).join(" ")})`,
  );
}
