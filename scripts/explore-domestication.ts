// Derivation sweeps for Guard 8 (tests/guards/domestication.test.ts). Prints
// every number the guard's comments and thresholds rest on. Run:
//   npx tsx scripts/explore-domestication.ts
//
// The arm itself — BASE, SEEDS, GENERATIONS, the two bonuses, the thresholds and
// the runner — is imported from tests/guards/domestication-arm.ts, the SAME
// module the guard asserts against, so this script cannot describe a different
// model than the guard describes. There is one definition, not two
// hand-maintained copies.
import { createWorld, defaultParams, observe, step } from "../sim/index.js";
import type { Params } from "../sim/index.js";
import {
  armParams,
  BASE,
  GENERATIONS,
  MIN_ASEXUAL_DOMESTICATED_PER_GENOME,
  MIN_DOMESTICATED_PER_GENOME,
  MIN_PEAK_DOMESTICATED,
  MIN_PEAK_FAMILY_PER_GENOME,
  runArm,
  SEEDS,
  STABILITY_MARKS,
  WDOM_ABOVE,
  WDOM_BELOW,
} from "../tests/guards/domestication-arm.js";

const pad = (x: unknown, n: number) => String(x).padStart(n);
const f2 = (x: number, n = 7) => pad(x.toFixed(2), n);

/** `BASE` with overrides, stepped, reporting domesticated copies per genome at marks. */
function trajectory(
  overrides: Partial<Params>,
  generations: number,
  marks: readonly number[],
): { dom: number[]; family: number[] } {
  const p = defaultParams({ ...BASE, ...overrides });
  const world = createWorld(p);
  const markSet = new Set(marks);
  const dom: number[] = [];
  const family: number[] = [];
  for (let g = 1; g <= generations; g++) {
    step(world);
    if (markSet.has(g)) {
      const s = observe(world);
      dom.push(s.domesticatedCopies / world.genomes.length);
      family.push(
        (s.totalCopies - s.domesticatedCopies) / world.genomes.length,
      );
    }
  }
  return { dom, family };
}

// ---------------------------------------------------------------------------
// ARM 1: the guard's own arms at every seed — the table the guard quotes.
// ---------------------------------------------------------------------------
console.log(
  `=== ARM 1: the guard arms, ${GENERATIONS} generations, ${SEEDS.length} seeds ===`,
);
console.log(
  `BELOW wDom = ${WDOM_BELOW} (the shipped default: defaultParams().wDom = ${defaultParams().wDom})`,
);
console.log("seed  peakDom  peakGen  dom@600  family@600");
const belowPeaks: number[] = [];
for (const seed of SEEDS) {
  const r = runArm({ seed, wDom: WDOM_BELOW });
  belowPeaks.push(r.peakDomCount);
  console.log(
    `${pad(seed, 4)}  ${pad(r.peakDomCount, 7)}  ${pad(r.peakDomGeneration, 7)}  ${pad(r.domCount, 7)}  ${pad(r.familyCount, 10)}`,
  );
}
console.log(
  `BELOW: peak range ${Math.min(...belowPeaks)}..${Math.max(...belowPeaks)}; ` +
    `MIN_PEAK_DOMESTICATED = ${MIN_PEAK_DOMESTICATED}, margin ${(Math.min(...belowPeaks) / MIN_PEAK_DOMESTICATED).toFixed(2)}x`,
);

console.log(`\nABOVE wDom = ${WDOM_ABOVE}`);
console.log(
  `seed  ${STABILITY_MARKS.map((m) => pad(`dom@${m}`, 8)).join("")}  family@600  occupancy`,
);
// ⚠️ TWO MINIMA, PRINTED SIDE BY SIDE AND LABELLED. `minAtMarks` is the
// quantity the guard's floor reads; `minAfterFirstMark` is the stricter
// every-generation bound that NO assertion checks. Both come from `runArm`, so
// neither the guard nor this script can compute one and label it the other —
// which is exactly what happened before 2026-09-03.
const minAtMarks: number[] = [];
const minAllGens: number[] = [];
const peakFamilies: number[] = [];
for (const seed of SEEDS) {
  const r = runArm({ seed, wDom: WDOM_ABOVE });
  minAtMarks.push(r.minAtMarks);
  minAllGens.push(r.minAfterFirstMark);
  peakFamilies.push(r.peakFamilyPerGenome);
  const occ = r.snapshot.totalCopies / BASE.N / BASE.S;
  console.log(
    `${pad(seed, 4)}  ${r.atMarks.map((x) => f2(x, 8)).join("")}  ${pad(r.familyCount, 10)}  ${(occ * 100).toFixed(2)}%` +
      `  min@marks ${f2(r.minAtMarks, 6)}  min@allGens ${f2(r.minAfterFirstMark, 6)}` +
      `  peakFamily ${f2(r.peakFamilyPerGenome, 6)} @g${r.peakFamilyGeneration}`,
  );
}
console.log(
  `ABOVE, THE ASSERTED QUANTITY: minimum over the ${STABILITY_MARKS.length} marks and ${SEEDS.length} seeds ` +
    `${Math.min(...minAtMarks).toFixed(2)} per genome; MIN_DOMESTICATED_PER_GENOME = ${MIN_DOMESTICATED_PER_GENOME}, ` +
    `margin ${(Math.min(...minAtMarks) / MIN_DOMESTICATED_PER_GENOME).toFixed(2)}x`,
);
console.log(
  `ABOVE, the stricter bound NOTHING ASSERTS: minimum over EVERY generation from ${STABILITY_MARKS[0]} to ${GENERATIONS} ` +
    `${Math.min(...minAllGens).toFixed(2)} per genome (would be ${(Math.min(...minAllGens) / MIN_DOMESTICATED_PER_GENOME).toFixed(2)}x)`,
);
console.log(
  `ABOVE, the liveness control: peak family ${Math.min(...peakFamilies).toFixed(2)}..${Math.max(...peakFamilies).toFixed(2)} per genome; ` +
    `MIN_PEAK_FAMILY_PER_GENOME = ${MIN_PEAK_FAMILY_PER_GENOME}, margin ${(Math.min(...peakFamilies) / MIN_PEAK_FAMILY_PER_GENOME).toFixed(2)}x`,
);

console.log(`\nASEXUAL CONTROL, wDom = ${WDOM_BELOW}, sexual = false`);
console.log("seed  dom@600  domPerGenome@600  family@600");
const asexVals: number[] = [];
for (const seed of SEEDS) {
  const r = runArm({ seed, wDom: WDOM_BELOW, sexual: false });
  asexVals.push(r.domPerGenome);
  console.log(
    `${pad(seed, 4)}  ${pad(r.domCount, 7)}  ${f2(r.domPerGenome, 16)}  ${pad(r.familyCount, 10)}`,
  );
}
console.log(
  `ASEXUAL: minimum ${Math.min(...asexVals).toFixed(2)} per genome; ` +
    `MIN_ASEXUAL_DOMESTICATED_PER_GENOME = ${MIN_ASEXUAL_DOMESTICATED_PER_GENOME}, ` +
    `margin ${(Math.min(...asexVals) / MIN_ASEXUAL_DOMESTICATED_PER_GENOME).toFixed(2)}x`,
);
console.log(
  "NOTE: every asexual value is an exact integer because the population has fixed on one clone.",
);

// ---------------------------------------------------------------------------
// ARM 2: THE THRESHOLD. The grid the "0.03 < wDom* <= 0.075" band comes from.
// ---------------------------------------------------------------------------
const THRESHOLD_GRID = [
  0, 0.01, 0.02, 0.03, 0.05, 0.06, 0.075, 0.09, 0.1, 0.15, 0.2, 0.3,
] as const;
console.log(
  `\n=== ARM 2: the wDom threshold at the guard horizon (${GENERATIONS} generations) ===`,
);
console.log(
  `wDom  ${SEEDS.map((s) => pad(s, 7)).join("")}      min     mean  zeroSeeds`,
);
for (const wDom of THRESHOLD_GRID) {
  const row = SEEDS.map((seed) => runArm({ seed, wDom }).domPerGenome);
  const zeros = row.filter((x) => x === 0).length;
  console.log(
    `${pad(wDom, 5).padEnd(6)}${row.map((x) => f2(x)).join("")}  ${f2(Math.min(...row))}  ` +
      `${f2(row.reduce((a, b) => a + b, 0) / row.length)}  ${pad(`${zeros}/${row.length}`, 9)}`,
  );
}

// ---------------------------------------------------------------------------
// ARM 3: THE MECHANISM. Trajectories showing that the family dies in BOTH
// bonus arms and only the domesticated copies' fate differs.
// ---------------------------------------------------------------------------
const TRAJ_MARKS = [50, 100, 150, 250, 400, 600] as const;
const TRAJ_SEEDS = [1, 7, 101] as const;
console.log(
  `\n=== ARM 3: trajectories, marks ${TRAJ_MARKS.join("/")} — dom / family per genome ===`,
);
for (const seed of TRAJ_SEEDS) {
  for (const [label, ov] of [
    ["below   ", { wDom: WDOM_BELOW }],
    ["above   ", { wDom: WDOM_ABOVE }],
    ["asexual ", { wDom: WDOM_BELOW, sexual: false }],
  ] as const) {
    const t = trajectory({ ...ov, seed }, GENERATIONS, TRAJ_MARKS);
    console.log(
      `${label} seed ${pad(seed, 3)}  dom    ${t.dom.map((x) => f2(x, 8)).join("")}`,
    );
    console.log(
      `                  family ${t.family.map((x) => f2(x, 8)).join("")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// ARM 4: THE HORIZON PROBE. Evidence that the above-threshold plateau is a
// plateau and not a slow decay the horizon happens to stop before.
// ---------------------------------------------------------------------------
const HORIZON_MARKS = [600, 1000, 1400, 2000] as const;
const HORIZON_SEEDS = [1, 7, 101] as const;
console.log(
  `\n=== ARM 4: horizon probe past ${GENERATIONS}, wDom = ${WDOM_ABOVE} ===`,
);
console.log(`seed  ${HORIZON_MARKS.map((m) => pad(`g${m}`, 9)).join("")}`);
for (const seed of HORIZON_SEEDS) {
  const t = trajectory({ wDom: WDOM_ABOVE, seed }, 2000, HORIZON_MARKS);
  console.log(
    `${pad(seed, 4)}  ${t.dom.map((x, i) => pad(`${x.toFixed(2)}/${t.family[i]!.toFixed(0)}`, 9)).join("")}`,
  );
}
console.log(
  "Format is dom/family per genome. Family stays at exactly 0 at every mark.",
);

// ---------------------------------------------------------------------------
// ARM 5: THE NON-MONOTONICITY, kept as a permanent uncharacterised observation.
// No guard assertion depends on it. See ./domestication-arm.ts for what was and
// was not established about its mechanism.
// ---------------------------------------------------------------------------
const NONMONO_GRID = [0.2, 0.3, 0.5, 1, 2, 5] as const;
const NONMONO_MARKS = [30, 60, 100, 300, 1000] as const;
console.log(
  `\n=== ARM 5: the non-monotone response above wDom ~ 0.3 (1000 generations) ===`,
);
console.log(`wDom  ${SEEDS.map((s) => pad(s, 7)).join("")}      min     mean`);
for (const wDom of NONMONO_GRID) {
  const row = SEEDS.map(
    (seed) => trajectory({ wDom, seed }, 1000, [1000]).dom[0]!,
  );
  console.log(
    `${pad(wDom, 5).padEnd(6)}${row.map((x) => f2(x)).join("")}  ${f2(Math.min(...row))}  ${f2(row.reduce((a, b) => a + b, 0) / row.length)}`,
  );
}
console.log(
  `\nACCUMULATION, NOT RETENTION: the difference is set by generation ~60 and flat after.`,
);
console.log(
  `wDom  seed  ${NONMONO_MARKS.map((m) => pad(`g${m}`, 9)).join("")}`,
);
for (const wDom of [0.2, 5] as const) {
  for (const seed of [1, 5, 101] as const) {
    const t = trajectory({ wDom, seed }, 1000, NONMONO_MARKS);
    console.log(
      `${pad(wDom, 4)}  ${pad(seed, 4)}  ${t.dom.map((x, i) => pad(`${x.toFixed(1)}/${t.family[i]!.toFixed(1)}`, 9)).join("")}`,
    );
  }
}
console.log("Format is dom/family per genome.");

// ---------------------------------------------------------------------------
// ARM 6: THE ARMS ARE MATCHED. Printed rather than only asserted, so a reader
// can see which fields the contrasts rest on.
// ---------------------------------------------------------------------------
console.log("\n=== ARM 6: field-by-field arm comparison ===");
const keys = Object.keys(BASE) as (keyof Params)[];
const pairs: [string, Params, Params][] = [
  [
    "below vs above",
    armParams({ seed: 1, wDom: WDOM_BELOW }),
    armParams({ seed: 1, wDom: WDOM_ABOVE }),
  ],
  [
    "sexual vs asexual",
    armParams({ seed: 1, wDom: WDOM_BELOW, sexual: true }),
    armParams({ seed: 1, wDom: WDOM_BELOW, sexual: false }),
  ],
];
for (const [label, a, b] of pairs) {
  console.log(
    `${label}: differing fields = ${JSON.stringify(keys.filter((k) => a[k] !== b[k]))}`,
  );
}
