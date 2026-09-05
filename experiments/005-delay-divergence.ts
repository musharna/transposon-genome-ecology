import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  createWorld,
  defaultParams,
  isClusterSite,
  observe,
  repertoireInsertionIndex,
  stateHash,
  step,
  type Genome,
  type Params,
  type World,
} from "../sim/index.js";
import { domesticate, lose } from "../sim/phases/lifecycle.js";
import { reproduce } from "../sim/phases/reproduce.js";
import { transpose } from "../sim/phases/transpose.js";

/**
 * Registered question 005 — does the delay diverge, or is there a floor?
 * `docs/pre-registrations/2026-09-05-does-the-delay-diverge.md`, committed alone
 * before this file existed.
 *
 * 004 concluded "every phi > 0 saturates; phi sets WHEN, not WHETHER". That is an
 * extrapolation. NO RUN IN THIS PROJECT HAS EVER OBSERVED A SATURATION BELOW
 * phi = 0.008 — 004's 90 runs at phi in {0.001, 0.002, 0.004} were all still
 * CONTROLLED when their 1800-generation horizon ran out, which is what BOTH the
 * divergence reading and the floor reading predict.
 *
 * THREE THINGS THIS RUNNER DOES THAT 004's DID NOT:
 *
 *  1. HORIZON IS PER-PHI, from a registered table, each at least 1.75x the largest
 *     predicted t_sat at that phi. Asserted before any run, because the "too late"
 *     direction of secondary 1 is only observable if the horizon covers the band —
 *     without it "saturated 30% late" and "never saturated" are the same reading.
 *
 *  2. TWO CHECKPOINTS, 600 AND 1800, not one. This is what lets the reproduction
 *     control be compared against 004's committed rows on BOTH its records, and
 *     what makes check 3 a comparison against a different experiment's committed
 *     data rather than against this runner's own output.
 *
 *  3. THE PREDICTION'S CONSTANTS ARE RE-DERIVED FROM 004's CSV AND ASSERTED
 *     (check 6). They are frozen by the registration; a typo here would silently
 *     redefine what is being tested, and nothing else in the pipeline would notice.
 */

const CSV = "experiments/005-delay-divergence.csv";
const CONTROL_CSV = "experiments/005-reproduction-control.csv";
const CSV_004 = "experiments/004-fidelity-band.csv";
const shardPath = (label: string) =>
  CSV.replace(/\.csv$/, `.shard-${label}.csv`);

/**
 * Registration: three ratios, `theta` pinned at 0.10 and `sigmaS` pinned, NOT
 * derived as theta/ratio — 0.10/3.33 is 0.03003 and deriving it would put the cell
 * a hair off the grid the reproduction control compares against. Exact ratios are
 * 2, 10/3, 5.
 *
 * `a` and `C` are 004's fitted constants, FROZEN by the registration. Check 6
 * re-derives them from 004's committed CSV and aborts if they disagree.
 */
const RATIOS = [
  { label: "2.00", theta: 0.1, sigmaS: 0.05, a: 0.7304, C: 35.2258 },
  { label: "3.33", theta: 0.1, sigmaS: 0.03, a: 0.736, C: 38.7872 },
  { label: "5.00", theta: 0.1, sigmaS: 0.02, a: 0.7447, C: 43.5347 },
] as const;

/**
 * Registration: two points BELOW the fitted range (004 ran them but never measured
 * a t_sat there — every one was still CONTROLLED at 1800), and the three GEOMETRIC
 * MIDPOINTS of 004's doubling grid, which no experiment in this repository has run
 * at any ratio. The midpoints are maximally distant in log-phi from every point the
 * law was fitted to.
 */
const PHIS = [0.002, 0.004, 0.0113, 0.0226, 0.0453] as const;

/**
 * Registration: the smallest multiple of 500, floor 1000, that is at least 1.75x
 * the largest predicted t_sat at that phi across the three ratios. Written out
 * rather than computed so the registered numbers are literals in the source; the
 * FORMULA is re-derived and asserted against them in `assertHorizons`.
 */
const HORIZON: Record<string, number> = {
  "0.002": 8000,
  "0.004": 5000,
  "0.0113": 2500,
  "0.0226": 1500,
  "0.0453": 1000,
};
const HEADROOM = 1.75;
const HORIZON_FLOOR = 1000;
const HORIZON_STEP = 500;

/** Registration: seeds 4001-4010, disjoint from 004's 3001-3010, 003's 2001-2010, 002's 1-10 and the 002 pilot's 1001-1006. */
const SEEDS = Array.from({ length: 10 }, (_, i) => 4001 + i);
/** The reproduction control reproduces 004 on ITS seeds. */
const CONTROL_SEEDS = Array.from({ length: 10 }, (_, i) => 3001 + i);
/**
 * The two cells 004 ran below its fitted range, PLUS phi = 0.125.
 *
 * ⚠️ DEVIATION 1, made before any data existed, and found by taking the
 * registration's own mutation table seriously. As registered the control was
 * {0.002, 0.004}, and the table claims a saturation ceiling moved from 1500 to
 * 1400 is caught by check 2. IT IS NOT: neither of those cells saturates by
 * generation 1800 — 004 recorded ~544 copies per genome at 1800 at phi = 0.002 —
 * so the ceiling never binds in the control and the mutant would pass every check
 * in the experiment. phi = 0.125 is a 004 grid cell that saturates at generation
 * ~174-219, so with it the ceiling is pinned against committed data. It costs 30
 * runs of ~220 generations, about five minutes.
 */
const CONTROL_PHIS = [0.002, 0.004, 0.125] as const;
/** 004's horizon. The reproduction control must stop exactly where 004 stopped. */
const CONTROL_HORIZON = 1800;
/** Check 3's long run, at the phi whose horizon is longest. */
const EXTENSION_PHI = 0.002;
const EXTENSION_HORIZON = HORIZON["0.002"]!;

/**
 * Two checkpoints. 600 because 004 recorded one there; 1800 because that is 004's
 * horizon and therefore where its FINAL record sits.
 */
const CHECKPOINTS = [600, 1800] as const;

/** Pre-specified stopping rule, carried from 002, 003 and 004 UNCHANGED so the reproduction control is exact. */
const SATURATION_COPIES_PER_GENOME = 1500;

/** Manipulation check 1's horizon. Short enough that nothing has died. */
const CONTROL_GENERATIONS = 80;
/** Check 4b compares against the grid's generation-600 checkpoint. */
const DIAL_CHECK_GENERATIONS = 600;

/** Registration: everything else pinned at 002's, 003's and 004's values. */
const BASE: Partial<Params> = {
  N: 300,
  S: 3000,
  c: 0.02,
  r0: 0.2,
  rMax: 1,
  sigmaR: 0.05,
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
};

const predict = (r: (typeof RATIOS)[number], phi: number) => r.C * phi ** -r.a;

// ---------------------------------------------------------------------------
// THE DIAL — 003's and 004's, unchanged.

/**
 * Is `value` already within theta of some entry? The two-neighbour argument in
 * `sim/silencing.ts` applies unchanged.
 *
 * ⚠️ THIS, NOT `isSilenced`, IS THE FAITHFUL TRANSLATION OF `trap.ts`'s NO-OP
 * GUARD once the inserted value is not `copy.s`. At phi > 0 "already covered" and
 * "already silenced" are different tests: a copy that has diverged past theta is
 * NOT silenced and would insert a duplicate value forever. 002 measured that at
 * 11,045 entries per genome by generation 300 and 1.09 GB resident.
 */
function valueCovered(value: number, genome: Genome, p: Params): boolean {
  const rep = genome.repertoire;
  const i = repertoireInsertionIndex(rep, value);
  if (i < rep.length && Math.abs(value - rep[i]!) <= p.theta) return true;
  if (i > 0 && Math.abs(value - rep[i - 1]!) <= p.theta) return true;
  return false;
}

type TrapPhase = (world: World) => void;

/** Manipulation check 4's instrument, measured AT INSERTION inside one run. */
interface DialProbe {
  captures: number;
  displacementSum: number;
  absSSum: number;
  maxAbsEntry: number;
}
const newProbe = (): DialProbe => ({
  captures: 0,
  displacementSum: 0,
  absSSum: 0,
  maxAbsEntry: 0,
});

/**
 * Phase 2 at infidelity `phi`. The entry is `(1 - phi) * copy.s`.
 *
 * Bit-exactness at phi = 0 is load-bearing for check 1 and is argued rather than
 * asserted: `1 * copy.s` is `copy.s` exactly (IEEE-754 multiplication by 1 is
 * exact), and `valueCovered(copy.s, genome, p)` is then the same predicate as
 * `isSilenced(copy, genome, p)` — `sim/silencing.ts:82-89` differs only by
 * returning false for a domesticated copy, and `trap.ts:39` has already
 * `continue`d on domesticated before that test is reached. So the same copies
 * reach `world.rng.next()` in the same order and THE SAME DRAWS ARE CONSUMED.
 *
 * ⚠️ THE SIGN OF ZERO IS NORMALISED, carried from 003 and 004. Not reachable at
 * this grid's phi values; kept because removing it would make this function
 * silently differ from the one the oracle was produced by, for no gain.
 */
function trapAtFidelity(phi: number, probe: DialProbe): TrapPhase {
  return (world: World): void => {
    const p = world.params;
    if (!p.silencingOn) return;

    for (const genome of world.genomes) {
      for (const copy of genome.copies) {
        if (copy.domesticated) continue;
        if (!isClusterSite(copy.site, p)) continue;
        const raw = (1 - phi) * copy.s;
        const value = raw === 0 ? 0 : raw;
        if (valueCovered(value, genome, p)) continue;
        if (world.rng.next() >= 1 - p.t) continue;
        const at = repertoireInsertionIndex(genome.repertoire, value);
        genome.repertoire.splice(at, 0, value);

        probe.captures++;
        probe.displacementSum += Math.abs(value - copy.s);
        probe.absSSum += Math.abs(copy.s);
        const abs = Math.abs(value);
        if (abs > probe.maxAbsEntry) probe.maxAbsEntry = abs;
      }
    }
  };
}

/** `sim/step.ts`'s phase order, with phase 2 substituted. */
function stepWith(world: World, trapPhase: TrapPhase): void {
  transpose(world);
  trapPhase(world);
  domesticate(world);
  lose(world);
  reproduce(world);
  world.generation++;
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 6 — the frozen constants ARE the fitted constants.
//
// Not a scientific check. It is the guard that stops a typo in RATIOS from
// silently redefining the prediction after the fact, which nothing downstream
// would notice: every band, every residual and every verdict is computed from
// these six numbers.

/** Ordinary least squares of log(t) on log(phi). Returns the power law's (a, C). */
function fitPowerLaw(pts: { phi: number; t: number }[]): {
  a: number;
  C: number;
} {
  const n = pts.length;
  if (n < 3) throw new Error(`fitPowerLaw needs at least 3 points, got ${n}`);
  const xs = pts.map((p) => Math.log(p.phi));
  const ys = pts.map((p) => Math.log(p.t));
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { a: -slope, C: Math.exp(my - slope * mx) };
}

function manipulationCheck6(): void {
  if (!existsSync(CSV_004)) {
    throw new Error(
      `manipulation check 6 cannot run: ${CSV_004} is missing. It is 004's committed result and the source of every constant this experiment predicts with. The experiment is VOID without it.`,
    );
  }
  const lines = readFileSync(CSV_004, "utf8").trim().split("\n");
  const head = lines[0]!.split(",");
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0)
      throw new Error(
        `${CSV_004} has no column "${name}" — it is not the file check 6 was written against`,
      );
    return i;
  };
  const c = {
    phi: col("phi"),
    ratio: col("ratio"),
    sat: col("saturation_generation"),
  };

  // Cell means over the saturating rows, exactly the recipe the registration
  // states: aggregate by (ratio, phi), mean over seeds, then fit on the logs.
  const cells = new Map<string, number[]>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    if (f[c.sat] === "NA") continue;
    const key = `${f[c.ratio]}|${f[c.phi]}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(Number(f[c.sat]));
  }

  console.log(
    `MANIPULATION CHECK 6 — the frozen constants must be re-derivable from ${CSV_004}`,
  );
  const failures: string[] = [];
  for (const r of RATIOS) {
    const pts: { phi: number; t: number }[] = [];
    for (const [key, vals] of cells) {
      const [lab, phiStr] = key.split("|");
      if (lab !== r.label) continue;
      pts.push({
        phi: Number(phiStr),
        t: vals.reduce((s, v) => s + v, 0) / vals.length,
      });
    }
    pts.sort((x, y) => x.phi - y.phi);
    // POSITIVE CONTROL, asserted FIRST: the fit must be over the five saturating
    // cells the registration names. A fit over a different number of points would
    // be a different estimator agreeing by luck, and "the constants matched" would
    // then mean nothing.
    if (pts.length !== 5) {
      failures.push(
        `ratio=${r.label}: fitted over ${pts.length} cells, not the 5 the registration names`,
      );
      continue;
    }
    const got = fitPowerLaw(pts);
    if (Math.abs(got.a - r.a) > 1e-3)
      failures.push(
        `ratio=${r.label}: a re-derives to ${got.a.toFixed(6)}, frozen as ${r.a}`,
      );
    if (Math.abs(got.C - r.C) > 1e-3)
      failures.push(
        `ratio=${r.label}: C re-derives to ${got.C.toFixed(6)}, frozen as ${r.C}`,
      );
    console.log(
      `  ratio=${r.label}: a=${got.a.toFixed(4)} C=${got.C.toFixed(4)} over ${pts.length} cells`,
    );
  }
  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 6 FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 6 failed — the constants this experiment predicts with are not the constants 004 measured. The experiment is VOID.",
    );
  }
  console.log(
    "  PASSED — all six constants re-derive from 004's committed CSV.\n",
  );
}

// ---------------------------------------------------------------------------
// THE HORIZON PRECONDITION — asserted before any run.
//
// ⚠️ THIS IS WHAT MAKES SECONDARY 1's "TOO LATE" DIRECTION OBSERVABLE. A horizon
// that does not clear the top of the registered band turns "saturated 30% late"
// and "never saturated" into the same reading, and the prediction would then be
// one-sided in fact while claiming to be two-sided on paper. 003 shipped a
// falsification clause that covered only one direction; this is the same defect,
// caught at the level of the instrument instead of the prose.

function assertHorizons(): void {
  const failures: string[] = [];
  console.log(
    `HORIZON PRECONDITION — every cell's horizon must clear ${HEADROOM}x its predicted t_sat`,
  );
  for (const phi of PHIS) {
    const h = HORIZON[String(phi)];
    if (h === undefined) {
      failures.push(`phi=${phi}: no horizon in the registered table`);
      continue;
    }
    let worst = 0;
    let worstLabel = "";
    for (const r of RATIOS) {
      const p = predict(r, phi);
      if (p > worst) {
        worst = p;
        worstLabel = r.label;
      }
      if (h / p < HEADROOM) {
        failures.push(
          `phi=${phi} ratio=${r.label}: horizon ${h} is ${(h / p).toFixed(2)}x the predicted t_sat ${p.toFixed(0)}, below the registered ${HEADROOM}x`,
        );
      }
    }
    // The registered FORMULA, re-derived, so the literal table cannot drift from
    // the rule that produced it.
    const want = Math.max(
      HORIZON_FLOOR,
      Math.ceil((worst * HEADROOM) / HORIZON_STEP) * HORIZON_STEP,
    );
    if (h !== want) {
      failures.push(
        `phi=${phi}: table says horizon ${h}, the registered formula gives ${want} (largest predicted t_sat ${worst.toFixed(0)} at ratio ${worstLabel})`,
      );
    }
    console.log(
      `  phi=${String(phi).padEnd(7)} horizon ${String(h).padStart(4)}  worst-case t_sat ${worst.toFixed(0).padStart(4)} (ratio ${worstLabel})  headroom ${(h / worst).toFixed(2)}x`,
    );
  }
  if (failures.length > 0) {
    console.error(`HORIZON PRECONDITION FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    throw new Error(
      "the horizon table does not cover the registered band, so secondary 1's 'too late' direction would be censored rather than measured. The experiment is VOID.",
    );
  }
  console.log("  PASSED.\n");
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 1 — the composed loop IS the shipped model.
//
// ⚠️ THE HASH COMPARISON CARRIES ITS OWN POSITIVE CONTROL. Two worlds that have
// both gone extinct hash identically no matter what phase ran, so hash equality
// alone cannot tell "the composed loop is the shipped model" from "there is
// nothing left to disagree about". Non-extinction is asserted FIRST, and its
// failure VOIDS the check rather than passing it.

function manipulationCheck1(): void {
  const configs: {
    theta: number;
    sigmaS: number;
    seed: number;
    label: string;
  }[] = [];
  for (const r of RATIOS) {
    for (const seed of [...SEEDS, ...CONTROL_SEEDS]) {
      configs.push({ theta: r.theta, sigmaS: r.sigmaS, seed, label: r.label });
    }
  }

  console.log(
    `MANIPULATION CHECK 1 — composed loop at phi=0 vs sim/step.ts, ${configs.length} configurations at generation ${CONTROL_GENERATIONS}`,
  );
  const failures: string[] = [];
  let checked = 0;
  let minCopies = Infinity;

  for (const { theta, sigmaS, seed, label } of configs) {
    const composed = createWorld(
      defaultParams({ ...BASE, theta, sigmaS, seed }),
    );
    const shipped = createWorld(
      defaultParams({ ...BASE, theta, sigmaS, seed }),
    );
    const phase = trapAtFidelity(0, newProbe());
    for (let g = 0; g < CONTROL_GENERATIONS; g++) stepWith(composed, phase);
    for (let g = 0; g < CONTROL_GENERATIONS; g++) step(shipped);

    const live = observe(composed).totalCopies;
    minCopies = Math.min(minCopies, live);
    const where = `ratio=${label} seed=${seed}`;
    if (live === 0) {
      failures.push(
        `${where}: extinct at generation ${CONTROL_GENERATIONS} — the hash comparison would be vacuous`,
      );
      continue;
    }
    if (stateHash(composed) !== stateHash(shipped)) {
      failures.push(
        `${where}: ${stateHash(composed)} != ${stateHash(shipped)}`,
      );
    }
    checked++;
  }

  if (failures.length > 0) {
    console.error(
      `MANIPULATION CHECK 1 FAILED (${failures.length} configurations):`,
    );
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 1 failed — the composed loop is not the shipped model, so phi=0 is not the shipped trap. The experiment is VOID.",
    );
  }
  console.log(
    `  PASSED on all ${checked} configurations; smallest surviving population ${minCopies} copies, so no comparison was vacuous.\n`,
  );
}

// ---------------------------------------------------------------------------
// ONE RUN, SCORED AT ITS STOP AND AT TWO CHECKPOINTS

type Outcome = "EXTINCT" | "CONTROLLED" | "RUNAWAY";

/** The state of a run as of one generation. Every record in a Row is one of these. */
interface Record0 {
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  outcome: Outcome;
  extinct: number;
  saturated: number;
  entriesPerGenome: number;
  maxGenomesWithRepertoire: number;
  sawNonZeroEntry: number;
  hash: string;
}

interface Row {
  phi: number;
  ratio: string;
  theta: number;
  sigmaS: number;
  kStar: number;
  seed: number;
  horizon: number;
  predicted: number;
  /** At the run's stop — generation `horizon`, or the saturation generation. */
  final: Record0;
  /** At generation 600, or the stop record if the run stopped at or before 600. */
  at600: Record0;
  /** At generation 1800, or the stop record if the run stopped at or before 1800. */
  at1800: Record0;
  saturationGeneration: number | "NA";
  extinctionGeneration: number | "NA";
  captures: number;
  meanDisplacement: number;
  meanAbsS: number;
  maxAbsEntry: number;
}

/**
 * Classify, and ASSERT the classes do not overlap. A saturated run stopped ABOVE
 * the ceiling so it cannot also be empty; asserting it rather than trusting it,
 * because a criterion that silently overlaps is exactly the defect 002's `VIABLE`
 * turned out to be.
 */
function classify(extinct: number, saturated: number, where: string): Outcome {
  if (extinct === 1 && saturated === 1) {
    throw new Error(
      `outcome classes overlapped at ${where} — the criterion is broken`,
    );
  }
  return extinct ? "EXTINCT" : saturated ? "RUNAWAY" : "CONTROLLED";
}

function snapshot(
  world: World,
  stoppedAt: number,
  saturated: number,
  maxGenomesWithRepertoire: number,
  sawNonZeroEntry: boolean,
  where: string,
): Record0 {
  const s = observe(world);
  let entries = 0;
  for (const genome of world.genomes) entries += genome.repertoire.length;
  const extinct = s.totalCopies === 0 ? 1 : 0;
  return {
    stoppedAt,
    copiesPerGenome: s.totalCopies / world.genomes.length,
    silencedFraction:
      s.totalCopies === 0 ? 0 : s.silencedCopies / s.totalCopies,
    outcome: classify(extinct, saturated, where),
    extinct,
    saturated,
    entriesPerGenome: entries / world.genomes.length,
    maxGenomesWithRepertoire,
    sawNonZeroEntry: sawNonZeroEntry ? 1 : 0,
    hash: stateHash(world),
  };
}

function runOne(
  phi: number,
  ratio: (typeof RATIOS)[number],
  seed: number,
  horizon: number,
): Row {
  const { theta, sigmaS } = ratio;
  const where = `phi=${phi} ratio=${ratio.label} seed=${seed}`;
  const world = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
  const probe = newProbe();
  const phase = trapAtFidelity(phi, probe);
  const saturationTotal = SATURATION_COPIES_PER_GENOME * (BASE.N as number);

  let saturationGeneration: number | "NA" = "NA";
  let extinctionGeneration: number | "NA" = "NA";
  let maxGenomesWithRepertoire = 0;
  let sawNonZeroEntry = false;
  let stoppedAt = horizon;
  const marks = new Map<number, Record0>();

  for (let g = 0; g < horizon; g++) {
    stepWith(world, phase);

    // Cheap per-generation instrumentation. `observe` recomputes silencing for
    // every copy, so it is called only at a checkpoint or the stop. This block is
    // byte-for-byte 002's, 003's and 004's, because `saw_nonzero_entry` is one of
    // the columns check 2 compares against a committed oracle.
    let total = 0;
    let withRepertoire = 0;
    for (const genome of world.genomes) {
      total += genome.copies.length;
      if (genome.repertoire.length > 0) {
        withRepertoire++;
        if (!sawNonZeroEntry) {
          for (const e of genome.repertoire) {
            if (Math.abs(e) > 1e-9) {
              sawNonZeroEntry = true;
              break;
            }
          }
        }
      }
    }
    if (withRepertoire > maxGenomesWithRepertoire)
      maxGenomesWithRepertoire = withRepertoire;

    if (extinctionGeneration === "NA" && total === 0)
      extinctionGeneration = world.generation;

    if (total > saturationTotal) {
      saturationGeneration = world.generation;
      stoppedAt = world.generation;
      break;
    }

    // A checkpoint is taken only if the run is still going PAST it. A run that
    // stops at or before a checkpoint never reaches this and that checkpoint's
    // record is its stop record, which is exactly what a run whose horizon IS the
    // checkpoint would have written.
    //
    // ⚠️ `horizon > cp` IS INERT IN THIS EXPERIMENT, AND THAT WAS MEASURED, NOT
    // ASSUMED. This comment first claimed the guard was what made check 3 able to
    // fail — carried over from 004, where it was true. THE MUTANT THAT REMOVES IT
    // SURVIVED: check 3's three comparisons still matched 004's committed hashes
    // exactly. The reason is structural. No grid horizon equals a checkpoint, and
    // for the control run, whose horizon IS checkpoint 1800, a checkpoint taken
    // there is identical to the final record — the loop breaks on saturation
    // BEFORE this block, so the two could only differ for a run that saturated,
    // which by construction never reaches here. 004 needed the guard because its
    // check 3a compared against a freshly-run short arm; 005's check 3 compares
    // against a COMMITTED FILE, which removes the hazard.
    //
    // The guard stays: it is correct, it is free, and it becomes load-bearing the
    // moment a horizon is added that equals a checkpoint. But it is NOT what
    // check 3 tests. See Deviation 4 in the registration, and the mutant that
    // replaced it — one extra RNG draw on any run longer than the control
    // horizon, which check 2 cannot see and check 3 catches on all three
    // comparisons.
    for (const cp of CHECKPOINTS) {
      if (world.generation === cp && horizon > cp) {
        marks.set(
          cp,
          snapshot(
            world,
            cp,
            0,
            maxGenomesWithRepertoire,
            sawNonZeroEntry,
            where,
          ),
        );
      }
    }
  }

  const final = snapshot(
    world,
    stoppedAt,
    saturationGeneration === "NA" ? 0 : 1,
    maxGenomesWithRepertoire,
    sawNonZeroEntry,
    where,
  );

  return {
    phi,
    ratio: ratio.label,
    theta,
    sigmaS,
    kStar: Math.round((theta / sigmaS) ** 2),
    seed,
    horizon,
    predicted: predict(ratio, phi),
    final,
    at600: marks.get(600) ?? final,
    at1800: marks.get(1800) ?? final,
    saturationGeneration,
    extinctionGeneration,
    captures: probe.captures,
    meanDisplacement:
      probe.captures === 0 ? 0 : probe.displacementSum / probe.captures,
    meanAbsS: probe.captures === 0 ? 0 : probe.absSSum / probe.captures,
    maxAbsEntry: probe.maxAbsEntry,
  };
}

// ---------------------------------------------------------------------------
// CSV

const REC_COLS = [
  "stopped_at",
  "copies_per_genome",
  "silenced_fraction",
  "outcome",
  "extinct",
  "saturated",
  "entries_per_genome",
  "max_genomes_with_repertoire",
  "saw_nonzero_entry",
  "hash",
];

const HEADER = [
  "phi",
  "ratio",
  "theta",
  "sigma_s",
  "k_star",
  "seed",
  "horizon",
  "predicted_t_sat",
  ...REC_COLS,
  ...REC_COLS.map((c) => `${c}_600`),
  ...REC_COLS.map((c) => `${c}_1800`),
  "saturation_generation",
  "extinction_generation",
  "captures",
  "mean_displacement",
  "mean_abs_s",
  "max_abs_entry",
].join(",");

const rec = (r: Record0) => [
  r.stoppedAt,
  r.copiesPerGenome,
  r.silencedFraction,
  r.outcome,
  r.extinct,
  r.saturated,
  r.entriesPerGenome,
  r.maxGenomesWithRepertoire,
  r.sawNonZeroEntry,
  r.hash,
];

const format = (r: Row) =>
  [
    r.phi,
    r.ratio,
    r.theta,
    r.sigmaS,
    r.kStar,
    r.seed,
    r.horizon,
    r.predicted,
    ...rec(r.final),
    ...rec(r.at600),
    ...rec(r.at1800),
    r.saturationGeneration,
    r.extinctionGeneration,
    r.captures,
    r.meanDisplacement,
    r.meanAbsS,
    r.maxAbsEntry,
  ].join(",");

/** Row key for resume and for the cross-run checks. */
const keyOf = (phi: number, ratio: string, seed: number) =>
  `${phi}|${ratio}|${seed}`;

function readRows(path: string): Map<string, Record<string, string>> {
  const m = new Map<string, Record<string, string>>();
  if (!existsSync(path)) return m;
  const lines = readFileSync(path, "utf8").trim().split("\n");
  if (lines.length < 2) return m;
  const head = lines[0]!.split(",");
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    const o: Record<string, string> = {};
    head.forEach((h, i) => (o[h] = f[i]!));
    m.set(keyOf(Number(o.phi), o.ratio!, Number(o.seed)), o);
  }
  return m;
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 2 — the reproduction control reproduces 004 EXACTLY.
//
// The strongest control in the experiment and the only one held to data that
// already exists in the repository, produced by a DIFFERENT RUNNER. phi = 0.002
// and phi = 0.004 must reproduce 004 run for run, on 004's own seeds, at the same
// model freeze, on BOTH records — generation 600 and generation 1800.
//
// ⚠️ THE COMPARISON USES THE RUN'S **FINAL** RECORD FOR 004's FINAL COLUMNS, NOT
// ITS `_1800` ONE. Control runs go to CONTROL_HORIZON, so their final record IS
// the record at 004's horizon, and that stays true whatever CHECKPOINTS is set to.
// Reading the `_1800` columns here would happen to work only because CONTROL_HORIZON
// and the second checkpoint are both 1800 — the correctness of the check would
// depend on two independent constants coinciding, which is the defect 004 caught in
// its own check 2 with a fast-downed checkpoint.

/** One of 004's two records, as read from its committed CSV. */
interface Rec004 {
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  outcome: string;
  extinct: number;
  saturated: number;
  entriesPerGenome: number;
  sawNonZeroEntry: number;
  maxGenomesWithRepertoire: number;
  hash: string;
}

function load004(): Map<string, { at600: Rec004; final: Rec004 }> {
  if (!existsSync(CSV_004)) {
    throw new Error(
      `manipulation check 2 cannot run: ${CSV_004} is missing. It is 004's committed result and this check's oracle. The experiment is VOID without it.`,
    );
  }
  const lines = readFileSync(CSV_004, "utf8").trim().split("\n");
  const head = lines[0]!.split(",");
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0) {
      throw new Error(
        `${CSV_004} has no column "${name}" — the oracle is not the file this check was written against`,
      );
    }
    return i;
  };
  const idx = (suffix: string) => ({
    stopped: col(`stopped_at${suffix}`),
    copies: col(`copies_per_genome${suffix}`),
    sil: col(`silenced_fraction${suffix}`),
    outcome: col(`outcome${suffix}`),
    ext: col(`extinct${suffix}`),
    sat: col(`saturated${suffix}`),
    entries: col(`entries_per_genome${suffix}`),
    nonzero: col(`saw_nonzero_entry${suffix}`),
    maxGen: col(`max_genomes_with_repertoire${suffix}`),
    hash: col(`hash${suffix}`),
  });
  const cFinal = idx("");
  const c600 = idx("_600");
  const cKey = { phi: col("phi"), ratio: col("ratio"), seed: col("seed") };
  const pick = (f: string[], c: ReturnType<typeof idx>): Rec004 => ({
    stoppedAt: Number(f[c.stopped]),
    copiesPerGenome: Number(f[c.copies]),
    silencedFraction: Number(f[c.sil]),
    outcome: f[c.outcome]!,
    extinct: Number(f[c.ext]),
    saturated: Number(f[c.sat]),
    entriesPerGenome: Number(f[c.entries]),
    sawNonZeroEntry: Number(f[c.nonzero]),
    maxGenomesWithRepertoire: Number(f[c.maxGen]),
    hash: f[c.hash]!,
  });

  const m = new Map<string, { at600: Rec004; final: Rec004 }>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    m.set(keyOf(Number(f[cKey.phi]), f[cKey.ratio]!, Number(f[cKey.seed])), {
      at600: pick(f, c600),
      final: pick(f, cFinal),
    });
  }

  // ⚠️ THE ORACLE MUST HAVE BEEN PRODUCED AT THE HORIZON THIS CHECK ASSUMES.
  // If 004 had run to a different horizon the comparison would be between two
  // different questions and would fail for a reason that has nothing to do with
  // the dial. `stopped_at` rather than the `horizon` column: it is evidence that
  // at least one run was actually allowed to reach 1800, where the column is only
  // a claim that it was.
  let maxStopped = 0;
  for (const r of m.values())
    maxStopped = Math.max(maxStopped, r.final.stoppedAt);
  if (maxStopped !== CONTROL_HORIZON) {
    throw new Error(
      `${CSV_004} was produced at horizon ${maxStopped}, but check 2 compares against horizon ${CONTROL_HORIZON}. The oracle is not the file this check was written against.`,
    );
  }
  return m;
}

/** Compare one record against 004's. Returns the differing fields. */
function diffRec(got: Rec004, want: Rec004): string[] {
  const d: string[] = [];
  const n = (name: string, a: number, b: number) => {
    if (a !== b) d.push(`${name} ${a} != ${b}`);
  };
  n("stopped_at", got.stoppedAt, want.stoppedAt);
  n("copies_per_genome", got.copiesPerGenome, want.copiesPerGenome);
  n("silenced_fraction", got.silencedFraction, want.silencedFraction);
  n("extinct", got.extinct, want.extinct);
  n("saturated", got.saturated, want.saturated);
  n("entries_per_genome", got.entriesPerGenome, want.entriesPerGenome);
  n("saw_nonzero_entry", got.sawNonZeroEntry, want.sawNonZeroEntry);
  n(
    "max_genomes_with_repertoire",
    got.maxGenomesWithRepertoire,
    want.maxGenomesWithRepertoire,
  );
  if (got.outcome !== want.outcome)
    d.push(`outcome ${got.outcome} != ${want.outcome}`);
  if (got.hash !== want.hash) d.push(`hash ${got.hash} != ${want.hash}`);
  return d;
}

const asRec = (r: Record0): Rec004 => ({
  stoppedAt: r.stoppedAt,
  copiesPerGenome: r.copiesPerGenome,
  silencedFraction: r.silencedFraction,
  outcome: r.outcome,
  extinct: r.extinct,
  saturated: r.saturated,
  entriesPerGenome: r.entriesPerGenome,
  sawNonZeroEntry: r.sawNonZeroEntry,
  maxGenomesWithRepertoire: r.maxGenomesWithRepertoire,
  hash: r.hash,
});

const fromCsv = (o: Record<string, string>, suffix: string): Rec004 => ({
  stoppedAt: Number(o[`stopped_at${suffix}`]),
  copiesPerGenome: Number(o[`copies_per_genome${suffix}`]),
  silencedFraction: Number(o[`silenced_fraction${suffix}`]),
  outcome: o[`outcome${suffix}`]!,
  extinct: Number(o[`extinct${suffix}`]),
  saturated: Number(o[`saturated${suffix}`]),
  entriesPerGenome: Number(o[`entries_per_genome${suffix}`]),
  sawNonZeroEntry: Number(o[`saw_nonzero_entry${suffix}`]),
  maxGenomesWithRepertoire: Number(o[`max_genomes_with_repertoire${suffix}`]),
  hash: o[`hash${suffix}`]!,
});

function manipulationCheck2(
  resume: boolean,
  oracle: Map<string, { at600: Rec004; final: Rec004 }>,
): void {
  const total = CONTROL_PHIS.length * RATIOS.length * CONTROL_SEEDS.length;
  console.log(
    `MANIPULATION CHECK 2 — the reproduction control must reproduce ${CSV_004} exactly on BOTH records, ${total} runs at horizon ${CONTROL_HORIZON}`,
  );

  // Re-read cached rows so a resumed run still COMPARES them; a cache that skips
  // the comparison would turn this check into a no-op on every rerun.
  const cached = resume
    ? readRows(CONTROL_CSV)
    : new Map<string, Record<string, string>>();
  if (!resume || !existsSync(CONTROL_CSV))
    writeFileSync(CONTROL_CSV, `${HEADER}\n`);
  else if (cached.size > 0)
    console.log(
      `  --resume: ${cached.size} control runs cached, re-comparing them.`,
    );

  const failures: string[] = [];
  let n = 0;
  let compared = 0;

  for (const phi of CONTROL_PHIS) {
    for (const ratio of RATIOS) {
      for (const seed of CONTROL_SEEDS) {
        n++;
        const key = keyOf(phi, ratio.label, seed);
        const where = `phi=${phi} ratio=${ratio.label} seed=${seed}`;
        const hit = cached.get(key);
        let got600: Rec004;
        let gotFinal: Rec004;
        if (hit) {
          got600 = fromCsv(hit, "_600");
          gotFinal = fromCsv(hit, "");
        } else {
          const row = runOne(phi, ratio, seed, CONTROL_HORIZON);
          appendFileSync(CONTROL_CSV, `${format(row)}\n`);
          got600 = asRec(row.at600);
          gotFinal = asRec(row.final);
        }

        const want = oracle.get(key);
        if (!want) {
          failures.push(
            `${where}: no matching row in ${CSV_004} — the oracle does not cover this cell`,
          );
          continue;
        }
        const d600 = diffRec(got600, want.at600).map((s) => `gen600 ${s}`);
        const dFinal = diffRec(gotFinal, want.final).map((s) => `gen1800 ${s}`);
        const diffs = [...d600, ...dFinal];
        if (diffs.length > 0) failures.push(`${where}: ${diffs.join("; ")}`);
        compared++;
        if (n % 15 === 0)
          console.log(
            `  [${n}/${total}] compared ${compared}, ${failures.length} failing`,
          );
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `MANIPULATION CHECK 2 FAILED (${failures.length} of ${total} runs):`,
    );
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 2 failed — the control cells are NOT 004's cells, so this grid does not extend 004's. The experiment is VOID.",
    );
  }
  console.log(
    `  PASSED — all ${compared} control runs reproduce ${CSV_004} exactly, on both records.\n`,
  );
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 3 — the horizon extension is inert.
//
// This is what licenses reading a long run's intermediate state as if it were a
// short run's stop. A horizon-8000 run must agree BIT-FOR-BIT with 004's
// committed horizon-1800 rows at generation 600 AND at generation 1800.
//
// Strictly stronger than 004's check 3a, which compared two runs of its own
// experiment against each other: here both sides of the comparison exist before
// this runner does, one of them in a file committed by a different experiment.
//
// ⚠️ POSITIVE CONTROL ASSERTED FIRST. Two extinct worlds hash identically no
// matter what ran, so a comparison between two empty worlds would pass by
// agreeing on nothing. Non-extinction at each checkpoint is required before the
// records are compared, and its absence VOIDS the check rather than passing it.

function manipulationCheck3(
  oracle: Map<string, { at600: Rec004; final: Rec004 }>,
): string[] {
  const v: string[] = [];
  const seed = CONTROL_SEEDS[0]!;
  console.log(
    `MANIPULATION CHECK 3 — a horizon-${EXTENSION_HORIZON} run must equal ${CSV_004}'s horizon-${CONTROL_HORIZON} rows at generations ${CHECKPOINTS.join(" and ")}, ${RATIOS.length} comparisons`,
  );
  for (const ratio of RATIOS) {
    const where = `phi=${EXTENSION_PHI} ratio=${ratio.label} seed=${seed}`;
    const want = oracle.get(keyOf(EXTENSION_PHI, ratio.label, seed));
    if (!want) {
      v.push(`${where}: no row in ${CSV_004} to compare against (check 3)`);
      continue;
    }
    const long = runOne(EXTENSION_PHI, ratio, seed, EXTENSION_HORIZON);
    if (
      long.at600.extinct === 1 ||
      long.at1800.extinct === 1 ||
      want.at600.extinct === 1 ||
      want.final.extinct === 1
    ) {
      v.push(
        `${where}: a world was extinct at a checkpoint — the comparison would be vacuous (check 3)`,
      );
      continue;
    }
    // ⚠️ The long run MUST have taken real checkpoints. If it saturated before
    // 1800 its `at1800` falls back to its stop record and the comparison below
    // would silently be against the wrong generation. That fallback is correct
    // behaviour for the CSV and wrong for this check, so it is caught here rather
    // than allowed to pass as agreement.
    if (long.at600.stoppedAt !== 600 || long.at1800.stoppedAt !== 1800) {
      v.push(
        `${where}: the long run did not take both checkpoints (600->${long.at600.stoppedAt}, 1800->${long.at1800.stoppedAt}); it stopped at ${long.final.stoppedAt}, so there is nothing to compare (check 3)`,
      );
      continue;
    }
    const d600 = diffRec(asRec(long.at600), want.at600).map(
      (s) => `gen600 ${s}`,
    );
    const d1800 = diffRec(asRec(long.at1800), want.final).map(
      (s) => `gen1800 ${s}`,
    );
    const diffs = [...d600, ...d1800];
    if (diffs.length > 0) {
      v.push(`${where}: ${diffs.join("; ")} (check 3)`);
    } else {
      console.log(
        `  ${where}: ${long.at600.hash} / ${long.at1800.hash} identical to ${CSV_004}, ${long.at1800.copiesPerGenome.toFixed(1)} copies/genome at 1800`,
      );
    }
  }
  return v;
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 4a, per run — the dial is live AND CORRECTLY SCALED.
//
// The failure mode this grid is exposed to is a dial applying the WRONG phi.
// "Displacement is nonzero" cannot see that; the scaling test can.
//
// `|entry - copy.s|` is `phi*|s|` in exact arithmetic but NOT bit-identical to it
// in IEEE-754: `fl(fl(1-phi)*s) - s` and `-fl(phi*s)` round differently. Hence a
// tolerance, which the registration fixes at 1e-9 — roughly five orders of
// magnitude above the ~2e-15 per-term rounding this can actually produce at these
// magnitudes, and well below the smallest mean displacement the grid can generate.

function checkRun(row: Row): string[] {
  const where = `phi=${row.phi} ratio=${row.ratio} seed=${row.seed}`;
  const v: string[] = [];

  // Carried from 002, 003 and 004, FIRST: it is the precondition the rest is read
  // against. A cell where nothing is ever captured is the silencing knockout
  // wearing a dial's clothes.
  if (
    row.at600.maxGenomesWithRepertoire === 0 &&
    row.final.maxGenomesWithRepertoire === 0
  ) {
    v.push(`${where}: no genome ever held a repertoire (check 4a)`);
    return v;
  }
  if (row.captures === 0) {
    v.push(
      `${where}: a repertoire formed but no capture was recorded — the probe is not wired (check 4a)`,
    );
    return v;
  }
  if (!(row.meanDisplacement > 0)) {
    v.push(
      `${where}: mean displacement is 0 — the dial is silently stuck at phi=0 (check 4a)`,
    );
  }
  if (!(row.maxAbsEntry > 1e-9)) {
    v.push(
      `${where}: every entry was the ancestral 0 — the dial is silently stuck at phi=1 (check 4a)`,
    );
  }
  const want = row.phi * row.meanAbsS;
  if (Math.abs(row.meanDisplacement - want) > 1e-9) {
    v.push(
      `${where}: mean displacement ${row.meanDisplacement} != phi*mean|s| ${want} ` +
        `(diff ${Math.abs(row.meanDisplacement - want)}) — the dial is live but MIS-SCALED (check 4a)`,
    );
  }
  return v;
}

/**
 * CHECK 4b — the dial changes THE WORLD, at every setting, not just the probe.
 *
 * A dial whose setting produces a bit-identical world is not a dial with a small
 * setting, it is a dial with a broken one, and that cell would be measuring the
 * shipped trap under another name. The probe-based half cannot see this: it reads
 * displacement AT INSERTION, which is non-zero by construction even if the
 * perturbation never changes a single coverage decision. 004 found exactly this
 * mutant, and every probe-based check passed on it.
 *
 * ⚠️ DEVIATION 2, made before any data existed. As registered this compared only
 * "the smallest registered phi" against phi = 0 — which in 005 is phi = 0.002,
 * and phi = 0.002 is ALSO a reproduction-control cell, so check 2 already pins it
 * against committed data and check 4b was fully redundant. 004's grid ran two
 * decades below its control cells, so there the smallest setting was genuinely
 * unguarded; 005's is not. Comparing EVERY grid phi restores the check's purpose,
 * covering 0.0113, 0.0226 and 0.0453, which no oracle touches. It costs nothing:
 * the phi = 0 run is the same run whichever cell it is compared against.
 *
 * ⚠️ POSITIVE CONTROL ASSERTED FIRST, same reason as check 3 — and the check
 * FAILS if it made no comparison at all, because a check that silently compares
 * nothing reports success for having done no work.
 */
function manipulationCheck4b(
  grid: Map<string, Record<string, string>>,
): string[] {
  const v: string[] = [];
  let compared = 0;
  let skipped = 0;
  console.log(
    `MANIPULATION CHECK 4b — every grid phi vs phi=0 at generation ${DIAL_CHECK_GENERATIONS}, on the world and not the probe`,
  );
  for (const ratio of RATIOS) {
    for (const seed of SEEDS) {
      // One shipped-trap run per (ratio, seed), reused across every phi.
      const shipped = runOne(0, ratio, seed, DIAL_CHECK_GENERATIONS);
      for (const phi of PHIS) {
        const where = `phi=${phi} ratio=${ratio.label} seed=${seed}`;
        const dialled = grid.get(keyOf(phi, ratio.label, seed));
        if (!dialled) {
          v.push(`${where}: no grid row to compare (check 4b)`);
          continue;
        }
        // A cell that saturated at or before the checkpoint has no
        // generation-600 record — its `_600` columns are its stop record. That is
        // correct for the CSV and useless here, so it is SKIPPED AND COUNTED,
        // never quietly treated as agreement.
        if (Number(dialled.stopped_at_600) !== DIAL_CHECK_GENERATIONS) {
          skipped++;
          continue;
        }
        if (
          shipped.final.extinct === 1 &&
          Number(dialled.copies_per_genome_600) === 0
        ) {
          v.push(
            `${where}: both worlds extinct at generation ${DIAL_CHECK_GENERATIONS} — the comparison would be vacuous (check 4b)`,
          );
          continue;
        }
        if (shipped.final.hash === dialled.hash_600) {
          v.push(
            `${where}: bit-identical to phi=0 at generation ${DIAL_CHECK_GENERATIONS} (${shipped.final.hash}) — this setting is no setting (check 4b)`,
          );
        }
        compared++;
      }
    }
  }
  console.log(
    `  ${compared} comparisons made, ${skipped} cells skipped for saturating at or before generation ${DIAL_CHECK_GENERATIONS}.`,
  );
  if (compared === 0) {
    v.push(
      `check 4b compared nothing — every cell saturated before generation ${DIAL_CHECK_GENERATIONS} or was missing, so the dial was never tested on the world (check 4b)`,
    );
  }
  return v;
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 5 — sharding is inert.
//
// Every run is a pure function of (phi, ratio, seed, horizon) and nothing in the
// loop reads another run's state, so splitting the grid across processes must not
// change a single byte. That is an argument, not a measurement, and this is the
// measurement: one cell from each shard is re-run in THIS process and its CSV line
// must be byte-identical to the one the shard wrote.
//
// ⚠️ WHEN THE RUN IS NOT SHARDED THIS REPORTS **NOT RUN**, NEVER PASSED. A check
// that reports success when it did not execute is the defect this project has met
// more than twenty times, and it is the cheapest possible instance of it.

function manipulationCheck5(shardFiles: string[]): string[] {
  const v: string[] = [];
  if (shardFiles.length === 0) {
    console.log(
      "MANIPULATION CHECK 5 — NOT RUN: this was a single-process run, so there are no shard boundaries to test.",
    );
    return v;
  }
  console.log(
    `MANIPULATION CHECK 5 — re-running one cell from each of ${shardFiles.length} shards in this process`,
  );
  for (const path of shardFiles) {
    const lines = readFileSync(path, "utf8").trim().split("\n");
    if (lines.length < 2) {
      v.push(
        `${path}: no data rows, so the shard boundary cannot be tested (check 5)`,
      );
      continue;
    }
    const head = lines[0]!.split(",");
    if (head.join(",") !== HEADER) {
      v.push(
        `${path}: header differs from this runner's — the shard was written by a different version (check 5)`,
      );
      continue;
    }
    const want = lines[1]!;
    const f = want.split(",");
    const o: Record<string, string> = {};
    head.forEach((h, i) => (o[h] = f[i]!));
    const ratio = RATIOS.find((r) => r.label === o.ratio);
    if (!ratio) {
      v.push(
        `${path}: row names ratio ${o.ratio}, which is not in this runner's grid (check 5)`,
      );
      continue;
    }
    const got = format(
      runOne(Number(o.phi), ratio, Number(o.seed), Number(o.horizon)),
    );
    if (got !== want) {
      v.push(
        `${path}: re-run in one process differs from the shard's row (check 5)\n      shard:  ${want}\n      re-run: ${got}`,
      );
    } else {
      console.log(
        `  ${path}: phi=${o.phi} ratio=${o.ratio} seed=${o.seed} byte-identical`,
      );
    }
  }
  return v;
}

// ---------------------------------------------------------------------------
// DRIVER

const argv = process.argv.slice(2);
const resume = argv.includes("--resume");
const combine = argv.includes("--combine");
const shardArg = argv.find((a) => a.startsWith("--shard="));
const shardLabel = shardArg ? shardArg.slice("--shard=".length) : null;

if (shardLabel && combine) {
  throw new Error(
    "--shard and --combine are separate phases; run each shard first, then --combine once.",
  );
}
if (shardLabel && !RATIOS.some((r) => r.label === shardLabel)) {
  throw new Error(
    `--shard=${shardLabel} is not one of the registered ratios: ${RATIOS.map((r) => r.label).join(", ")}`,
  );
}

const gridRatios = shardLabel
  ? RATIOS.filter((r) => r.label === shardLabel)
  : [...RATIOS];
const outPath = shardLabel ? shardPath(shardLabel) : CSV;

// Checks that must hold before a single generation is stepped, in every mode.
manipulationCheck6();
assertHorizons();

if (combine) {
  // --------------------------------------------------------------------
  // COMBINE PHASE — merge the shards, prove the boundary was inert, then run
  // every check that needs the whole grid.
  const shardFiles = RATIOS.map((r) => shardPath(r.label));
  const missing = shardFiles.filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(
      `--combine needs every shard: missing ${missing.join(", ")}. Run --shard=<ratio> for each first.`,
    );
  }
  writeFileSync(CSV, `${HEADER}\n`);
  let merged = 0;
  for (const path of shardFiles) {
    const lines = readFileSync(path, "utf8").trim().split("\n");
    if (lines[0] !== HEADER)
      throw new Error(
        `${path}: header differs from this runner's — refusing to merge`,
      );
    for (const line of lines.slice(1)) {
      appendFileSync(CSV, `${line}\n`);
      merged++;
    }
  }
  console.log(
    `--combine: merged ${merged} rows from ${shardFiles.length} shards into ${CSV}\n`,
  );

  const oracle = load004();
  const violations: string[] = [];
  violations.push(...manipulationCheck5(shardFiles));
  manipulationCheck1();
  manipulationCheck2(resume, oracle);
  const grid = readRows(CSV);
  for (const [, o] of grid) {
    violations.push(
      ...checkRun({
        phi: Number(o.phi),
        ratio: o.ratio!,
        theta: Number(o.theta),
        sigmaS: Number(o.sigma_s),
        kStar: Number(o.k_star),
        seed: Number(o.seed),
        horizon: Number(o.horizon),
        predicted: Number(o.predicted_t_sat),
        final: { ...asRec0(o, ""), outcome: o.outcome as Outcome },
        at600: { ...asRec0(o, "_600"), outcome: o.outcome_600 as Outcome },
        at1800: { ...asRec0(o, "_1800"), outcome: o.outcome_1800 as Outcome },
        saturationGeneration:
          o.saturation_generation === "NA"
            ? "NA"
            : Number(o.saturation_generation),
        extinctionGeneration:
          o.extinction_generation === "NA"
            ? "NA"
            : Number(o.extinction_generation),
        captures: Number(o.captures),
        meanDisplacement: Number(o.mean_displacement),
        meanAbsS: Number(o.mean_abs_s),
        maxAbsEntry: Number(o.max_abs_entry),
      }),
    );
  }
  violations.push(...manipulationCheck3(oracle));
  violations.push(...manipulationCheck4b(grid));
  report(violations, grid.size);
} else {
  // --------------------------------------------------------------------
  // RUN PHASE — the grid, sharded or whole.
  const existing = resume
    ? readRows(outPath)
    : new Map<string, Record<string, string>>();
  if (resume && existsSync(outPath)) {
    console.log(
      `--resume: ${existing.size} runs already in ${outPath}, skipping those.\n`,
    );
  } else {
    writeFileSync(outPath, `${HEADER}\n`);
  }

  const oracle = shardLabel ? null : load004();
  manipulationCheck1();
  if (oracle) manipulationCheck2(resume, oracle);

  const started = Date.now();
  const violations: string[] = [];
  let ran = 0;
  const totalRuns = gridRatios.length * PHIS.length * SEEDS.length;

  for (const ratio of gridRatios) {
    for (const phi of PHIS) {
      const horizon = HORIZON[String(phi)]!;
      for (const seed of SEEDS) {
        if (existing.has(keyOf(phi, ratio.label, seed))) continue;
        const t0 = Date.now();
        const row = runOne(phi, ratio, seed, horizon);
        // Appended as each run completes: a kill costs the run in flight only.
        appendFileSync(outPath, `${format(row)}\n`);
        violations.push(...checkRun(row));
        ran++;
        const sat =
          row.saturationGeneration === "NA"
            ? "  none"
            : String(row.saturationGeneration).padStart(6);
        console.log(
          `[${String(ran).padStart(3)}/${totalRuns}] ratio=${ratio.label} phi=${String(phi).padEnd(6)} seed=${seed} ` +
            `${row.final.outcome.padEnd(10)} t_sat=${sat} pred=${row.predicted.toFixed(0).padStart(4)} ` +
            `copies/genome=${row.final.copiesPerGenome.toFixed(1).padStart(7)} sil=${row.final.silencedFraction.toFixed(3)} ` +
            `(${((Date.now() - t0) / 1000).toFixed(1)}s)`,
        );
      }
    }
  }

  console.log(
    `\nwrote ${ran} runs to ${outPath} in ${((Date.now() - started) / 1000).toFixed(1)}s\n`,
  );

  if (shardLabel) {
    console.log(
      `shard ${shardLabel} complete. Run the other shards, then --combine to merge and run checks 2, 3, 4b and 5.`,
    );
  } else {
    // The cross-run checks read the CSV back, so they cover resumed rows too.
    const grid = readRows(CSV);
    violations.push(...manipulationCheck5([]));
    violations.push(...manipulationCheck3(oracle!));
    violations.push(...manipulationCheck4b(grid));
    report(violations, grid.size);
  }
}

/** Shared exit path so a sharded and an unsharded run report identically. */
function report(violations: string[], rows: number): void {
  if (violations.length > 0) {
    console.error(
      `\nMANIPULATION CHECKS FAILED (${violations.length} violations):`,
    );
    for (const v of violations.slice(0, 20)) console.error(`  ${v}`);
    throw new Error(
      "manipulation check failed — the dial, the horizon design or the shard boundary is not what the registration says it is; the CSV is written but VOID",
    );
  }
  console.log(
    `\nmanipulation checks 1, 2, 3, 4a, 4b, 5 and 6 PASSED — ${rows} rows in ${CSV}`,
  );
}

/** Read one record's numeric fields back out of a CSV row. */
function asRec0(
  o: Record<string, string>,
  suffix: string,
): Omit<Record0, "outcome"> {
  return {
    stoppedAt: Number(o[`stopped_at${suffix}`]),
    copiesPerGenome: Number(o[`copies_per_genome${suffix}`]),
    silencedFraction: Number(o[`silenced_fraction${suffix}`]),
    extinct: Number(o[`extinct${suffix}`]),
    saturated: Number(o[`saturated${suffix}`]),
    entriesPerGenome: Number(o[`entries_per_genome${suffix}`]),
    maxGenomesWithRepertoire: Number(o[`max_genomes_with_repertoire${suffix}`]),
    sawNonZeroEntry: Number(o[`saw_nonzero_entry${suffix}`]),
    hash: o[`hash${suffix}`]!,
  };
}
