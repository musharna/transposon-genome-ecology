// Guard 1 (Charlesworth equilibrium) derivation sweep. Every figure quoted in
// tests/guards/equilibrium-arm.ts and tests/guards/equilibrium.test.ts is
// printed by one of the arms below.
//
//   ARM 1  flatness / horizon: three arms x SEEDS at FLATNESS_MARKS, from the
//          default one-copy start. Locates the plateau and gives the per-seed
//          finals the guard's thresholds are floors and ceilings under.
//   ARM 2  convergence from above: QUADRATIC at FLATNESS_MARKS from a
//          HIGH_COPY_START start, plus NONE and LINEAR at the horizon.
//   ARM 3  drift dominance: QUADRATIC over N_SWEEP, from below and from above.
//   ARM 4  sexual vs asexual, with an occupancy stop.
//   ARM 5  sigmaR: why the paper's constant u forces sigmaR = 0.
//   ARM 6  liveness and occupancy at the horizon, every arm, every seed.
//
// Run: npx tsx scripts/explore-equilibrium.ts [arm ...]   (default: all)
import { createWorld, observe, step } from "../sim/index.js";
import {
  ARM_NAMES,
  BASE,
  FLATNESS_MARKS,
  GENERATIONS,
  GROWTH_WINDOW,
  HIGH_COPY_START,
  N_SWEEP,
  SEEDS,
  STABILITY_WINDOW,
  armParams,
  mean,
  runArm,
  runArmMarks,
  seedHighCopy,
} from "../tests/guards/equilibrium-arm.js";

const want = process.argv.slice(2);
const on = (n: number) => want.length === 0 || want.includes(String(n));
const f1 = (x: number) => x.toFixed(1).padStart(7);

// ---------------------------------------------------------------- ARM 1
if (on(1)) {
  console.log("=== ARM 1: flatness, from the default one-copy start ===");
  console.log(
    `arm        seed ${FLATNESS_MARKS.map((m) => `   g${m}`.padStart(8)).join("")}`,
  );
  const finals: Record<string, number[]> = {};
  const byMark: Record<string, number[][]> = {};
  for (const arm of ARM_NAMES) {
    finals[arm] = [];
    byMark[arm] = FLATNESS_MARKS.map(() => []);
    for (const seed of SEEDS) {
      const t0 = Date.now();
      const r = runArmMarks(arm, FLATNESS_MARKS, { seed });
      r.perGenome.forEach((v, i) => byMark[arm]![i]!.push(v));
      finals[arm]!.push(r.perGenome[FLATNESS_MARKS.indexOf(GENERATIONS)]!);
      console.log(
        `${arm.padEnd(10)} ${String(seed).padStart(4)} ${r.perGenome.map(f1).join(" ")}  (${Date.now() - t0}ms)`,
      );
    }
  }
  console.log("");
  for (const arm of ARM_NAMES) {
    console.log(
      `${arm.padEnd(10)} MEAN ${byMark[arm]!.map((xs) => f1(mean(xs))).join(" ")}`,
    );
  }
  console.log("");
  for (const arm of ARM_NAMES) {
    const xs = finals[arm]!;
    console.log(
      `${arm.padEnd(10)} g${GENERATIONS} finals: ${xs.map((x) => x.toFixed(1)).join(", ")}  mean=${mean(xs).toFixed(1)} min=${Math.min(...xs).toFixed(1)} max=${Math.max(...xs).toFixed(1)}`,
    );
  }
  const none = finals["NONE"]!;
  const lin = finals["LINEAR"]!;
  const quad = finals["QUADRATIC"]!;
  const pct = (a: number[], b: number[]) => a.map((x, i) => (100 * x) / b[i]!);
  const lp = pct(lin, none);
  const qp = pct(quad, none);
  console.log(
    `LINEAR as % of NONE: mean ${(100 * mean(lin)) / mean(none)} | per-seed ${lp.map((x) => x.toFixed(1)).join(", ")} | min ${Math.min(...lp).toFixed(1)} max ${Math.max(...lp).toFixed(1)}`,
  );
  console.log(
    `QUADRATIC as % of NONE: mean ${(100 * mean(quad)) / mean(none)} | per-seed ${qp.map((x) => x.toFixed(1)).join(", ")} | min ${Math.min(...qp).toFixed(1)} max ${Math.max(...qp).toFixed(1)}`,
  );
  // PLATEAU drift, read straight out of the marks already collected above so no
  // arm is re-run: STABILITY_WINDOW's two marks are both in FLATNESS_MARKS.
  const iLo = FLATNESS_MARKS.indexOf(STABILITY_WINDOW[0]);
  const iHi = FLATNESS_MARKS.indexOf(STABILITY_WINDOW[1]);
  console.log(
    `\n--- PLATEAU drift, g${STABILITY_WINDOW[0]} -> g${STABILITY_WINDOW[1]} ---`,
  );
  for (const arm of ARM_NAMES) {
    const ds = SEEDS.map((_, k) => {
      const lo = byMark[arm]![iLo]![k]!;
      const hi = byMark[arm]![iHi]![k]!;
      return Math.abs(hi - lo) / lo;
    });
    console.log(
      `${arm.padEnd(10)} |drift|: ${ds.map((d) => (100 * d).toFixed(1) + "%").join(", ")}  max ${(100 * Math.max(...ds)).toFixed(1)}%  min ${(100 * Math.min(...ds)).toFixed(1)}%`,
    );
  }
  // GROWTH window — the positive control. The same predicate must FAIL here.
  console.log(
    `\n--- GROWTH drift, g${GROWTH_WINDOW[0]} -> g${GROWTH_WINDOW[1]} ---`,
  );
  for (const arm of ARM_NAMES) {
    const ds: number[] = [];
    for (const seed of SEEDS) {
      const r = runArmMarks(arm, GROWTH_WINDOW, { seed });
      ds.push(Math.abs(r.perGenome[1]! - r.perGenome[0]!) / r.perGenome[0]!);
    }
    console.log(
      `${arm.padEnd(10)} |drift|: ${ds.map((d) => (100 * d).toFixed(1) + "%").join(", ")}  max ${(100 * Math.max(...ds)).toFixed(1)}%  min ${(100 * Math.min(...ds)).toFixed(1)}%`,
    );
  }
  // The claim the guard states as a ratio, not as two thresholds.
  console.log("");
  const lq = lin.map((x, i) => x / quad[i]!);
  console.log(
    `LINEAR / QUADRATIC per seed: ${lq.map((x) => x.toFixed(1)).join(", ")}  min ${Math.min(...lq).toFixed(1)}  mean-of-means ${(mean(lin) / mean(quad)).toFixed(1)}`,
  );
  console.log(
    `NONE occupancy at g${GENERATIONS}: ${none.map((x) => ((100 * x) / BASE.S).toFixed(2) + "%").join(", ")}  max ${((100 * Math.max(...none)) / BASE.S).toFixed(2)}%`,
  );
}

// ---------------------------------------------------------------- ARM 2
if (on(2)) {
  console.log(
    `\n=== ARM 2: convergence from a ${HIGH_COPY_START}-copy start ===`,
  );
  console.log(
    `arm        seed ${FLATNESS_MARKS.map((m) => `   g${m}`.padStart(8)).join("")}`,
  );
  const hi: number[] = [];
  for (const seed of SEEDS) {
    const r = runArmMarks("QUADRATIC", FLATNESS_MARKS, { seed }, {
      highCopyStart: HIGH_COPY_START,
    });
    hi.push(r.perGenome[FLATNESS_MARKS.indexOf(GENERATIONS)]!);
    console.log(
      `QUADRATIC  ${String(seed).padStart(4)} ${r.perGenome.map(f1).join(" ")}`,
    );
  }
  const lo = SEEDS.map((seed) => runArm("QUADRATIC", { seed }).perGenome);
  console.log(
    `QUADRATIC g${GENERATIONS} from-above: ${hi.map((x) => x.toFixed(1)).join(", ")} mean=${mean(hi).toFixed(1)}`,
  );
  console.log(
    `QUADRATIC g${GENERATIONS} from-below: ${lo.map((x) => x.toFixed(1)).join(", ")} mean=${mean(lo).toFixed(1)}`,
  );
  console.log(
    `ratio above/below per seed: ${hi.map((x, i) => (x / lo[i]!).toFixed(3)).join(", ")}`,
  );
  for (const arm of ["NONE", "LINEAR"] as const) {
    const a = SEEDS.map(
      (seed) =>
        runArm(arm, { seed }, { highCopyStart: HIGH_COPY_START }).perGenome,
    );
    const b = SEEDS.map((seed) => runArm(arm, { seed }).perGenome);
    console.log(
      `${arm.padEnd(10)} g${GENERATIONS} above: ${a.map((x) => x.toFixed(1)).join(", ")} (mean ${mean(a).toFixed(1)}) | below: ${b.map((x) => x.toFixed(1)).join(", ")} (mean ${mean(b).toFixed(1)})`,
    );
  }
}

// ---------------------------------------------------------------- ARM 3
if (on(3)) {
  console.log("\n=== ARM 3: drift dominance over N ===");
  for (const N of N_SWEEP) {
    const lo: number[] = [];
    const hi: number[] = [];
    let extinct = 0;
    for (const seed of SEEDS) {
      const a = runArm("QUADRATIC", { N, seed });
      const b = runArm(
        "QUADRATIC",
        { N, seed },
        { highCopyStart: HIGH_COPY_START },
      );
      lo.push(a.perGenome);
      hi.push(b.perGenome);
      if (a.snapshot.totalCopies === 0 || b.snapshot.totalCopies === 0)
        extinct++;
    }
    console.log(
      `N=${String(N).padStart(3)} below ${mean(lo).toFixed(1).padStart(6)} [${lo.map((x) => x.toFixed(1)).join(",")}] | above ${mean(hi).toFixed(1).padStart(6)} [${hi.map((x) => x.toFixed(1)).join(",")}] | above/below ${(mean(hi) / mean(lo)).toFixed(3)} | extinct arms ${extinct}`,
    );
  }
}

// ---------------------------------------------------------------- ARM 4
if (on(4)) {
  console.log("\n=== ARM 4: sexual vs asexual, occupancy stop at 40% ===");
  for (const arm of ARM_NAMES) {
    for (const sexual of [true, false]) {
      const p = armParams(arm, { sexual, seed: 1 });
      const w = createWorld(p);
      let stopped = "";
      for (let g = 1; g <= GENERATIONS; g++) {
        step(w);
        if (g % 5) continue;
        const pg = observe(w).totalCopies / w.genomes.length;
        if (pg / p.S > 0.4) {
          stopped = ` STOPPED at g=${g}, ${pg.toFixed(0)} copies/genome = ${((100 * pg) / p.S).toFixed(1)}% occupancy`;
          break;
        }
      }
      const pg = observe(w).totalCopies / w.genomes.length;
      console.log(
        `${arm.padEnd(10)} sexual=${String(sexual).padEnd(5)} g=${w.generation} perGenome=${pg.toFixed(1)} occ=${((100 * pg) / p.S).toFixed(1)}%${stopped}`,
      );
    }
  }
}

// ---------------------------------------------------------------- ARM 5
if (on(5)) {
  console.log("\n=== ARM 5: sigmaR — the paper's u is a constant, ours is not ===");
  for (const sigmaR of [0, 0.1]) {
    const p = armParams("NONE", { sigmaR, seed: 1 });
    const w = createWorld(p);
    for (let g = 1; g <= GENERATIONS; g++) {
      step(w);
      if (g % 50) continue;
      const s = observe(w);
      const pg = s.totalCopies / w.genomes.length;
      console.log(
        `NONE sigmaR=${sigmaR} g=${String(g).padStart(3)} meanRate=${s.meanRate.toFixed(3)} perGenome=${pg.toFixed(1)} occ=${((100 * pg) / p.S).toFixed(1)}%`,
      );
      if (pg / p.S > 0.5) {
        console.log("  -> past 50% occupancy, stopping");
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- ARM 6
if (on(6)) {
  console.log("\n=== ARM 6: liveness and occupancy at the horizon ===");
  for (const arm of ARM_NAMES) {
    for (const seed of SEEDS) {
      const r = runArm(arm, { seed });
      console.log(
        `${arm.padEnd(10)} seed ${String(seed).padStart(3)} totalCopies=${String(r.snapshot.totalCopies).padStart(7)} perGenome=${r.perGenome.toFixed(1).padStart(6)} occ=${((100 * r.occupancy)).toFixed(2)}% silenced=${r.snapshot.silencedCopies} domesticated=${r.snapshot.domesticatedCopies} meanRate=${r.snapshot.meanRate.toFixed(4)}`,
      );
    }
  }
}
