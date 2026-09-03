// Derivation sweeps for Guard 9 (tests/guards/tolerance.test.ts). Prints every
// number the guard's comments and thresholds rest on, INCLUDING the mid-dial
// measurement that came out negative and is therefore not asserted. Run:
//   npx tsx scripts/explore-tolerance.ts
//
// The arm itself — BASE, SEEDS, GENERATIONS, the three `t` values, the
// thresholds, the constructed genomes and the runner — is imported from
// tests/guards/tolerance-arm.ts, the SAME module the guard asserts against.
import {
  activeCopies,
  logFitness,
  silencedCopies,
  type Params,
} from "../sim/index.js";
import {
  armParams,
  BASE,
  constructGenome,
  FITNESS_PARAMS,
  GENERATIONS,
  HEAVY,
  LIGHT,
  MIN_CLUSTER_COPIES,
  MIN_RESIST_REPERTOIRE,
  runArm,
  SEEDS,
  T_NEAR_BOUNDARY,
  T_RESIST,
  T_TOLERATE,
} from "../tests/guards/tolerance-arm.js";

const pad = (x: unknown, n: number) => String(x).padStart(n);

// ---------------------------------------------------------------------------
// ARM 1: the guard's three arms at every seed — the table the guard quotes.
// ---------------------------------------------------------------------------
console.log(
  `=== ARM 1: the guard arms, ${GENERATIONS} generations, ${SEEDS.length} seeds ===`,
);
console.log(
  "t       seed   n/genome    occ%   silenced  clusterCopies  repertoire/genome  fracWithRep  gensWithAnyRep",
);
const clusterAtTolerate: number[] = [];
const repertoireAtResist: number[] = [];
for (const t of [T_RESIST, T_NEAR_BOUNDARY, T_TOLERATE]) {
  for (const seed of SEEDS) {
    const r = runArm({ seed, t });
    if (t === T_TOLERATE) clusterAtTolerate.push(r.clusterCopies);
    if (t === T_RESIST) repertoireAtResist.push(r.repertoirePerGenome);
    const perGenome = r.snapshot.totalCopies / BASE.N;
    console.log(
      `${pad(t, 6)}  ${pad(seed, 4)}  ${pad(perGenome.toFixed(1), 9)}  ${pad(((perGenome / BASE.S) * 100).toFixed(1), 6)}  ` +
        `${pad(r.snapshot.silencedCopies, 9)}  ${pad(r.clusterCopies, 13)}  ${pad(r.repertoirePerGenome.toFixed(2), 17)}  ` +
        `${pad(r.fractionWithRepertoire.toFixed(3), 11)}  ${pad(r.generationsWithAnyRepertoire, 14)}`,
    );
  }
  console.log("");
}
console.log(
  `TOLERANT arm cluster copies ${Math.min(...clusterAtTolerate)}..${Math.max(...clusterAtTolerate)}; ` +
    `MIN_CLUSTER_COPIES = ${MIN_CLUSTER_COPIES}, margin ${(Math.min(...clusterAtTolerate) / MIN_CLUSTER_COPIES).toFixed(2)}x`,
);
console.log(
  `RESISTING arm repertoire ${Math.min(...repertoireAtResist).toFixed(2)}..${Math.max(...repertoireAtResist).toFixed(2)} per genome; ` +
    `MIN_RESIST_REPERTOIRE = ${MIN_RESIST_REPERTOIRE}, margin ${(Math.min(...repertoireAtResist) / MIN_RESIST_REPERTOIRE).toFixed(2)}x`,
);

// ---------------------------------------------------------------------------
// ARM 2: THE MID-DIAL NEGATIVE RESULT. The reason the guard asserts no
// gradient. Repertoire size is non-monotone in t below t ~ 0.75 at almost
// every seed.
// ---------------------------------------------------------------------------
const MID_GRID = [0, 0.25, 0.5, 0.75] as const;
console.log(
  `\n=== ARM 2: mid-dial repertoire entries per genome — THE NEGATIVE RESULT ===`,
);
console.log(
  `seed  ${MID_GRID.map((t) => pad(`t=${t}`, 9)).join("")}  monotone?`,
);
let nonMonotone = 0;
for (const seed of SEEDS) {
  const row = MID_GRID.map((t) => runArm({ seed, t }).repertoirePerGenome);
  let mono = true;
  for (let i = 1; i < row.length; i++) if (row[i]! > row[i - 1]!) mono = false;
  if (!mono) nonMonotone++;
  console.log(
    `${pad(seed, 4)}  ${row.map((x) => pad(x.toFixed(2), 9)).join("")}  ${mono ? "monotone" : "NOT monotone"}`,
  );
}
console.log(
  `NOT monotone at ${nonMonotone} of ${SEEDS.length} seeds. No guard assertion claims a mid-dial gradient.`,
);

// ---------------------------------------------------------------------------
// ARM 3: THE BOUNDARY. Where the conscription property actually switches, and
// why T_NEAR_BOUNDARY is 0.99 rather than 0.999.
// ---------------------------------------------------------------------------
const BOUNDARY_GRID = [0.9, 0.99, 0.999, 1] as const;
console.log(`\n=== ARM 3: the t = 1 boundary ===`);
console.log(`t        ${SEEDS.map((s) => pad(s, 7)).join("")}      min`);
for (const kind of [
  "repertoire per genome",
  "fractionWithRepertoire",
] as const) {
  console.log(`-- ${kind}`);
  for (const t of BOUNDARY_GRID) {
    const row = SEEDS.map((seed) => {
      const r = runArm({ seed, t });
      return kind === "repertoire per genome"
        ? r.repertoirePerGenome
        : r.fractionWithRepertoire;
    });
    console.log(
      `${pad(t, 7).padEnd(9)}${row.map((x) => pad(x.toFixed(3), 7)).join("")}  ${pad(Math.min(...row).toFixed(3), 7)}`,
    );
  }
}
console.log(
  "t = 0.999 is the measured edge: fractionWithRepertoire drops to 0.030 at seed 4. The guard uses 0.99.",
);

// ---------------------------------------------------------------------------
// ARM 4: THE FITNESS ORDERING. Arithmetic, no runs. Every value here is
// reproduced by hand in the guard's comment.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 4: the fitness ordering across t (constructed genomes, ${HEAVY + LIGHT} copies each) ===`,
);
const activeHeavy = constructGenome(HEAVY, LIGHT);
const silencedHeavy = constructGenome(LIGHT, HEAVY);
const p0 = FITNESS_PARAMS(0);
console.log(
  `active-heavy:   active=${activeCopies(activeHeavy, p0).length} silenced=${silencedCopies(activeHeavy, p0).length}`,
);
console.log(
  `silenced-heavy: active=${activeCopies(silencedHeavy, p0).length} silenced=${silencedCopies(silencedHeavy, p0).length}`,
);
console.log("t       logW(active-heavy)  logW(silenced-heavy)     difference");
for (const t of [0, 0.25, 0.5, 0.75, 1] as const) {
  const p = FITNESS_PARAMS(t);
  const a = logFitness(activeHeavy, p);
  const b = logFitness(silencedHeavy, p);
  console.log(
    `${pad(t, 6)}  ${pad(a.toFixed(6), 18)}  ${pad(b.toFixed(6), 20)}  ${pad((a - b).toFixed(6), 13)}`,
  );
}

// ---------------------------------------------------------------------------
// ARM 5: THE ARMS ARE MATCHED.
// ---------------------------------------------------------------------------
console.log("\n=== ARM 5: field-by-field arm comparison ===");
const keys = Object.keys(BASE) as (keyof Params)[];
const resist = armParams({ seed: 1, t: T_RESIST });
for (const t of [T_NEAR_BOUNDARY, T_TOLERATE]) {
  const other = armParams({ seed: 1, t });
  console.log(
    `t = ${T_RESIST} vs t = ${t}: differing fields = ${JSON.stringify(keys.filter((k) => resist[k] !== other[k]))}`,
  );
}
console.log(`BASE.d = ${BASE.d}, BASE.dTol = ${BASE.dTol} (equal by design)`);
