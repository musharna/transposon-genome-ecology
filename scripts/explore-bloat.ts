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
  FRAGILE_R0,
  GENERATIONS,
  HORIZON_MARKS,
  HORIZON_SEEDS,
  INVARIANCE_SEEDS,
  NEGATIVE_CELL,
  NEGATIVE_CELL_SEEDS,
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

// ---------------------------------------------------------------------------
// ARM 4: THE HORIZON PROBE. The evidence for stopping at GENERATIONS rather
// than running to a plateau. Steps past the horizon and prints copies per
// genome for both arms at each mark, so the caveat on `GENERATIONS` in
// tests/guards/bloat-arm.ts is reproducible rather than remembered. Slow by
// design — the knockout arm approaches saturation at the far marks, which is
// itself one of the findings.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 4: horizon probe, marks ${HORIZON_MARKS.join("/")}, seeds ${HORIZON_SEEDS.join(",")} ===`,
);
console.log(
  "seed  silencing   " + HORIZON_MARKS.map((m) => pad(`g${m}`, 12)).join(""),
);
interface Mark {
  seed: number;
  silencingOn: boolean;
  g: number;
  perGenome: number;
  occupancy: number;
}
const horizon: Mark[] = [];
for (const seed of HORIZON_SEEDS) {
  for (const silencingOn of [true, false]) {
    const p = defaultParams({ ...BASE, seed, silencingOn });
    const w = createWorld(p);
    const cells: string[] = [];
    for (let g = 1; g <= Math.max(...HORIZON_MARKS); g++) {
      step(w);
      if ((HORIZON_MARKS as readonly number[]).includes(g)) {
        const snap = observe(w);
        const perGenome = snap.totalCopies / w.genomes.length;
        const occupancy = perGenome / p.S;
        horizon.push({ seed, silencingOn, g, perGenome, occupancy });
        cells.push(pad(`${perGenome.toFixed(1)}/${(occupancy * 100).toFixed(0)}%`, 12));
      }
    }
    console.log(`${pad(seed, 4)}  ${silencingOn ? "    on" : "   off"}      ${cells.join("")}`);
  }
}
const markRows = HORIZON_MARKS.map((g) => {
  const at = (silencingOn: boolean, seed: number) =>
    horizon.find((m) => m.g === g && m.seed === seed && m.silencingOn === silencingOn)!;
  const ratios = HORIZON_SEEDS.map((seed) => at(false, seed).perGenome / at(true, seed).perGenome);
  const held = HORIZON_SEEDS.every((seed) => at(false, seed).perGenome > at(true, seed).perGenome);
  const worstSeed = HORIZON_SEEDS[ratios.indexOf(Math.min(...ratios))]!;
  const maxOcc = Math.max(...HORIZON_SEEDS.map((seed) => at(false, seed).occupancy));
  const maxOccSeed = HORIZON_SEEDS.find((seed) => at(false, seed).occupancy === maxOcc)!;
  return { g, held, minRatio: Math.min(...ratios), worstSeed, maxOcc, maxOccSeed, at };
});
for (const r of markRows) {
  const on = r.at(true, r.worstSeed).perGenome.toFixed(1);
  const off = r.at(false, r.worstSeed).perGenome.toFixed(1);
  console.log(
    `g${pad(r.g, 3)}: direction holds at all ${HORIZON_SEEDS.length} seeds=${r.held}; ` +
      `narrowest ratio ${r.minRatio.toFixed(2)} at seed ${r.worstSeed} (silenced ${on} vs knockout ${off}); ` +
      `worst knockout occupancy ${(r.maxOcc * 100).toFixed(0)}% at seed ${r.maxOccSeed} ` +
      `(${r.at(false, r.maxOccSeed).perGenome.toFixed(0)} copies per genome)`,
  );
}
for (const seed of HORIZON_SEEDS) {
  for (const silencingOn of [true, false]) {
    const series = HORIZON_MARKS.map(
      (g) => horizon.find((m) => m.g === g && m.seed === seed && m.silencingOn === silencingOn)!.perGenome,
    );
    const monotone = series.every((x, i) => i === 0 || x >= series[i - 1]!);
    if (!monotone) {
      console.log(
        `NON-MONOTONE across the horizon: seed ${seed}, silencing ${silencingOn ? "on" : "off"} -> ${series
          .map((x) => x.toFixed(1))
          .join(" -> ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// ARM 5: THE NEGATIVE RESULT. The one cell of the derivation grid where the
// direction did NOT hold at every seed. Kept permanently and reproduced here so
// it cannot be rediscovered the hard way: the direction is a property of the
// pinned arm, not of the model at every nearby setting.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 5: the grid cell that FAILED — BASE with ${JSON.stringify(NEGATIVE_CELL)} ===`,
);
console.log("seed   silenced n/g   knockout n/g   ratio   direction holds");
const negRows = NEGATIVE_CELL_SEEDS.map((seed) => {
  const on = runArm({ ...NEGATIVE_CELL, seed, silencingOn: true });
  const off = runArm({ ...NEGATIVE_CELL, seed, silencingOn: false });
  const holds = off.perGenome > on.perGenome;
  console.log(
    `${pad(seed, 4)}  ${pad(on.perGenome.toFixed(1), 13)}  ${pad(off.perGenome.toFixed(1), 13)}  ${pad(
      (off.perGenome / on.perGenome).toFixed(2),
      6,
    )}  ${pad(holds, 15)}`,
  );
  return { seed, on, off, holds };
});
const negMeanOn = mean(negRows.map((r) => r.on.perGenome));
const negMeanOff = mean(negRows.map((r) => r.off.perGenome));
console.log(
  `ARM 5: direction holds at every seed: ${negRows.every((r) => r.holds)} ` +
    `(reversed at ${negRows.filter((r) => !r.holds).map((r) => `seed ${r.seed}`).join(", ") || "no seed"}); ` +
    `means silenced ${negMeanOn.toFixed(1)} vs knockout ${negMeanOff.toFixed(1)} (ratio ${(negMeanOff / negMeanOn).toFixed(2)}) ` +
    `— so the MEAN still points the right way while a seed does not`,
);

// ---------------------------------------------------------------------------
// ARM 6: SINGLE-KNOB FRAGILITY. BASE with r0 alone moved to the value the guard
// was originally specified with. Everything else — including sigmaS, theta and
// the horizon — is untouched.
// ---------------------------------------------------------------------------
console.log(
  `\n=== ARM 6: single-knob fragility — BASE with r0 ${BASE.r0} -> ${FRAGILE_R0} ===`,
);
console.log("seed   silenced n/g   knockout n/g   ratio   direction holds");
const fragRows = SEEDS.map((seed) => {
  const on = runArm({ seed, r0: FRAGILE_R0, silencingOn: true });
  const off = runArm({ seed, r0: FRAGILE_R0, silencingOn: false });
  const holds = off.perGenome > on.perGenome;
  console.log(
    `${pad(seed, 4)}  ${pad(on.perGenome.toFixed(1), 13)}  ${pad(off.perGenome.toFixed(1), 13)}  ${pad(
      (off.perGenome / on.perGenome).toFixed(2),
      6,
    )}  ${pad(holds, 15)}`,
  );
  return { seed, on, off, holds };
});
console.log(
  `ARM 6: direction holds at every seed: ${fragRows.every((r) => r.holds)} ` +
    `(reversed at ${fragRows.filter((r) => !r.holds).map((r) => `seed ${r.seed} (silenced ${r.on.perGenome.toFixed(1)} vs knockout ${r.off.perGenome.toFixed(1)})`).join(", ") || "no seed"}); ` +
    `means silenced ${mean(fragRows.map((r) => r.on.perGenome)).toFixed(1)} vs knockout ${mean(fragRows.map((r) => r.off.perGenome)).toFixed(1)}`,
);
