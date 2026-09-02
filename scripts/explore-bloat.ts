// Derivation sweeps for Guard 4 (tests/guards/bloat.test.ts). Prints every
// number the guard's comments and thresholds rest on. Run:
//   npx tsx scripts/explore-bloat.ts
//
// The arm itself — BASE, SEEDS, GENERATIONS, the contrast values and the runner
// — is imported from tests/guards/bloat-arm.ts, the SAME module the guard
// asserts against, so this script cannot describe a different model than the
// guard describes. There is one definition, not two hand-maintained copies.
import { createWorld, defaultParams, observe, step } from "../sim/index.js";
import type { Params } from "../sim/index.js";
import {
  BASE,
  GENERATIONS,
  INVARIANCE_SEEDS,
  runArm,
  SEEDS,
  SIGMA_S_HI,
  SIGMA_S_LO,
  THETA_HI,
  THETA_LO,
} from "../tests/guards/bloat-arm.js";

const pad = (x: unknown, n: number) => String(x).padStart(n);

// ---------------------------------------------------------------------------
// ARM 0: the parameter set this guard was ORIGINALLY specified with. Kept as a
// permanent record of why it was replaced: the silenced arm goes extinct, so the
// direction the guard claims to measure is produced by a dead control arm.
// ---------------------------------------------------------------------------
const ORIGINAL: Params = defaultParams({
  N: 200,
  S: 2000,
  c: 0.02,
  r0: 0.15,
  sigmaR: 0.05,
  sigmaS: 0.01,
  theta: 0.1,
  v: 0.01,
  a: 0.0005,
  b: 0.00002,
  pDom: 0,
  t: 0,
  sexual: true,
  seed: 1,
});

console.log(
  "=== ARM 0: the originally specified parameters, seed 1, 250 generations ===",
);
for (const silencingOn of [true, false]) {
  const p = { ...ORIGINAL, silencingOn };
  const w = createWorld(p);
  const t0 = Date.now();
  const marks: string[] = [];
  for (let g = 1; g <= 250; g++) {
    step(w);
    if (g % 50 === 0) {
      const s = observe(w);
      marks.push(
        `g${g}: n/genome=${(s.totalCopies / w.genomes.length).toFixed(0)} silenced=${s.silencedCopies}`,
      );
    }
  }
  const s = observe(w);
  console.log(`silencingOn=${silencingOn} [${Date.now() - t0}ms]`);
  for (const m of marks) console.log(`   ${m}`);
  console.log(
    `   FINAL occupancy=${((s.totalCopies / w.genomes.length / p.S) * 100).toFixed(1)}%  extinct=${s.totalCopies === 0}`,
  );
}

// ---------------------------------------------------------------------------
// ARM 1: the guard's own arm. Both silencing states, every seed.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 1: the guard arm, ${GENERATIONS} generations, ${SEEDS.length} seeds ===`,
);
console.log(
  "seed    on n/g    off n/g   ratio   on total   off total   on silenced   off occ",
);
let armMs = 0;
const rows = SEEDS.map((seed) => {
  const t0 = Date.now();
  const on = runArm({ seed, silencingOn: true });
  const off = runArm({ seed, silencingOn: false });
  armMs += Date.now() - t0;
  console.log(
    `${pad(seed, 4)}  ${pad(on.perGenome.toFixed(1), 8)}  ${pad(off.perGenome.toFixed(1), 9)}  ${pad(
      (off.perGenome / on.perGenome).toFixed(2),
      6,
    )}  ${pad(on.snapshot.totalCopies, 9)}  ${pad(off.snapshot.totalCopies, 10)}  ${pad(
      on.snapshot.silencedCopies,
      12,
    )}  ${pad((off.occupancy * 100).toFixed(1) + "%", 8)}`,
  );
  return { seed, on, off };
});
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const onN = rows.map((r) => r.on.perGenome);
const offN = rows.map((r) => r.off.perGenome);
console.log(`ARM 1 wall clock for ${SEEDS.length * 2} runs: ${armMs}ms`);
console.log(
  `on:  min=${Math.min(...onN).toFixed(1)} max=${Math.max(...onN).toFixed(1)} mean=${mean(onN).toFixed(1)}`,
);
console.log(
  `off: min=${Math.min(...offN).toFixed(1)} max=${Math.max(...offN).toFixed(1)} mean=${mean(offN).toFixed(1)}`,
);
console.log(
  `direction holds at EVERY seed: ${rows.every((r) => r.off.perGenome > r.on.perGenome)}; ` +
    `mean off > mean on: ${mean(offN) > mean(onN)}; ` +
    `distributions disjoint (min off > max on): ${Math.min(...offN) > Math.max(...onN)}`,
);
console.log(
  `THRESHOLD SUPPORT -> weakest seed: silenced totalCopies=${Math.min(
    ...rows.map((r) => r.on.snapshot.totalCopies),
  )}, silenced n/genome=${Math.min(...onN).toFixed(1)}, silencedCopies=${Math.min(
    ...rows.map((r) => r.on.snapshot.silencedCopies),
  )}, knockout totalCopies=${Math.min(
    ...rows.map((r) => r.off.snapshot.totalCopies),
  )}, worst knockout occupancy=${(Math.max(...rows.map((r) => r.off.occupancy)) * 100).toFixed(1)}%`,
);

// ---------------------------------------------------------------------------
// ARM 2: growth trajectories, to show neither arm has plateaued at the horizon
// and that the silenced arm is not on its way to extinction.
// ---------------------------------------------------------------------------
console.log(`\n=== ARM 2: trajectories (copies per genome / silenced) ===`);
for (const seed of INVARIANCE_SEEDS) {
  for (const silencingOn of [true, false]) {
    const p = defaultParams({ ...BASE, seed, silencingOn });
    const w = createWorld(p);
    const marks: string[] = [];
    for (let g = 1; g <= GENERATIONS; g++) {
      step(w);
      if (g % 20 === 0) {
        const s = observe(w);
        marks.push(
          `g${g}:${(s.totalCopies / w.genomes.length).toFixed(0)}/${s.silencedCopies}`,
        );
      }
    }
    console.log(
      `seed=${pad(seed, 3)} on=${silencingOn ? " true" : "false"}  ${marks.join("  ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// ARM 3: THE INVARIANCE PROOF. With silencingOn false, `trap` returns before
// touching the repertoire, so no repertoire ever forms, `isSilenced` is false
// for every copy, and `theta` is never consulted. `sigmaS` IS still consulted —
// `transpose` perturbs each daughter's `s` — but nothing reads `s` back. So
// varying either must leave copy number untouched. If this ever fails, the
// parameter choice above is unsound AND `s` is leaking into unsilenced
// dynamics, which is a model bug.
// ---------------------------------------------------------------------------
console.log(`\n=== ARM 3: knockout-arm invariance to sigmaS and theta ===`);
console.log(
  "seed  knob        lo value -> total   hi value -> total   equal   hash differs",
);
for (const seed of INVARIANCE_SEEDS) {
  const sLo = runArm({ seed, silencingOn: false, sigmaS: SIGMA_S_LO });
  const sHi = runArm({ seed, silencingOn: false, sigmaS: SIGMA_S_HI });
  console.log(
    `${pad(seed, 4)}  sigmaS   ${pad(SIGMA_S_LO, 8)} -> ${pad(sLo.snapshot.totalCopies, 6)}   ${pad(
      SIGMA_S_HI,
      8,
    )} -> ${pad(sHi.snapshot.totalCopies, 6)}   ${pad(
      sLo.snapshot.totalCopies === sHi.snapshot.totalCopies,
      5,
    )}   ${sLo.hash !== sHi.hash} (${sLo.hash} vs ${sHi.hash})`,
  );
  console.log(
    `      whole snapshot identical: ${JSON.stringify(sLo.snapshot) === JSON.stringify(sHi.snapshot)}`,
  );
  const tLo = runArm({ seed, silencingOn: false, theta: THETA_LO });
  const tHi = runArm({ seed, silencingOn: false, theta: THETA_HI });
  console.log(
    `${pad(seed, 4)}  theta    ${pad(THETA_LO, 8)} -> ${pad(tLo.snapshot.totalCopies, 6)}   ${pad(
      THETA_HI,
      8,
    )} -> ${pad(tHi.snapshot.totalCopies, 6)}   ${pad(
      tLo.snapshot.totalCopies === tHi.snapshot.totalCopies,
      5,
    )}   ${tLo.hash !== tHi.hash} (${tLo.hash} vs ${tHi.hash})`,
  );
  // POSITIVE CONTROLS: both knobs are live parameters where a repertoire exists,
  // so the invariance above is a real invariance and not an inert knob.
  const onThetaLo = runArm({ seed, silencingOn: true, theta: THETA_LO });
  const onThetaHi = runArm({ seed, silencingOn: true, theta: THETA_HI });
  const onSigLo = runArm({ seed, silencingOn: true, sigmaS: SIGMA_S_LO });
  const onSigHi = runArm({ seed, silencingOn: true, sigmaS: SIGMA_S_HI });
  console.log(
    `      CONTROL silenced arm: theta ${THETA_LO}->${onThetaLo.snapshot.totalCopies} vs ${THETA_HI}->${onThetaHi.snapshot.totalCopies} (differ: ${
      onThetaLo.snapshot.totalCopies !== onThetaHi.snapshot.totalCopies
    });  sigmaS ${SIGMA_S_LO}->${onSigLo.snapshot.totalCopies} vs ${SIGMA_S_HI}->${onSigHi.snapshot.totalCopies} (differ: ${
      onSigLo.snapshot.totalCopies !== onSigHi.snapshot.totalCopies
    })`,
  );
}
