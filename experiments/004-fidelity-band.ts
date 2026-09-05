import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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
import { trap } from "../sim/phases/trap.js";

/**
 * Registered question 004 — a band, or only a delay?
 *
 * Registration: `docs/pre-registrations/2026-09-04-a-band-or-only-a-delay.md`,
 * committed ALONE at `cec9955` BEFORE this file existed. The dial, the grid, the
 * seeds, BOTH horizons, the stopping rule, the outcome class, the edge
 * definition, the evaluability precondition and the four manipulation checks are
 * all fixed by that document. IF THIS FILE AND THE DOCUMENT DISAGREE, THE
 * DOCUMENT IS RIGHT AND THIS FILE IS A BUG.
 *
 * Emits CSV. The pre-specified analysis and the figures are R —
 * `docs/analysis/plot-004.R`.
 *
 * WHAT THIS ADDS TO 003, AND WHY
 * ------------------------------
 * The dial `entry = (1 - phi) * copy.s` is 003's, unchanged, and so is
 * `trapAtFidelity`. Two things are new:
 *
 *  1. THE GRID IS LOG2 BELOW 003's FIRST STEP. 003 found CONTROLLED at phi = 0
 *     and nowhere else on a grid whose first step above zero was 0.125, so it
 *     could not distinguish "control needs exact tracking" from "the band is
 *     narrower than one grid step".
 *
 *  2. EVERY RUN IS SCORED AT TWO HORIZONS, OUT OF ONE RUN. `s` is a random walk
 *     (`sim/phases/transpose.ts:37`) so `max|s|` grows without bound, while the
 *     self-coverage reach `theta/phi` is FIXED. For any phi > 0 there is
 *     therefore a horizon at which the walk outruns the reach, and a band
 *     measured at one horizon may be only a DELAY. 003 ran one horizon and could
 *     not see this.
 *
 * READING TWO HORIZONS OUT OF ONE RUN IS AN ASSUMPTION, AND IT IS CHECKED.
 * The RNG stream does not depend on the horizon, so a run to 1800 passes through
 * exactly the state a run to 600 reaches. That is manipulation check 3a — an
 * independent 600-generation run must agree BIT-FOR-BIT on `stateHash` with the
 * 1800-generation run's generation-600 checkpoint. Without it the dual-horizon
 * design is an assumption wearing a result's clothes.
 *
 * `sim/` IS NOT MODIFIED. The phase is composed here in `sim/step.ts`'s order
 * with phase 2 substituted, and manipulation check 1 is what makes that
 * legitimate. Carried from 002 and 003 unchanged.
 *
 * NOTE ON THE `exploratory` COLUMN: 003 had one because its ratio 2.00 was
 * pre-registered exploratory. All three ratios are REGISTERED in 004 (the
 * registration argues why: new seeds, an unsampled region of phi, and a numeric
 * prediction stated in advance), so the column would be constant zero and is
 * dropped rather than carried as dead weight.
 */

const CSV = "experiments/004-fidelity-band.csv";
/** Manipulation check 2's runs are expensive and cacheable; the model is frozen. */
const CONTROL_CSV = "experiments/004-reproduction-control.csv";
/** The oracle check 2 holds this runner to. Committed by 003, 270 rows. */
const CSV_003 = "experiments/003-trap-fidelity.csv";

/**
 * Registration: the grid is stated IN THE RATIO, because 002 established that
 * `theta` and `sigmaS` are one axis in `s`-space. All three registered.
 *
 * `phiStar` is the REGISTERED prediction for this ratio's edge — `theta / max|s|`
 * with `max|s|` taken from 003's phi = 0 cells (18.678, 10.367, 6.211). It is
 * carried here so the runner reports against it, but NOTHING IN THE RUN DEPENDS
 * ON IT: it is not used to choose a grid point, a stopping rule or a criterion.
 * Secondary 2 is scored on it in `plot-004.R`.
 *
 * ⚠️ `sigmaS` IS PINNED, NOT DERIVED AS `theta / ratio` — the labels are rounded,
 * `0.10 / 3.33` is `0.03003`, and deriving it would put the cell a hair off 003's
 * grid and silently break manipulation check 2. Exact ratios are 2, 10/3, 5.
 */
const RATIOS = [
  { label: "2.00", theta: 0.1, sigmaS: 0.05, maxAbsS003: 18.678, phiStar: 0.0054 },
  { label: "3.33", theta: 0.1, sigmaS: 0.03, maxAbsS003: 10.367, phiStar: 0.0096 },
  { label: "5.00", theta: 0.1, sigmaS: 0.02, maxAbsS003: 6.211, phiStar: 0.0161 },
] as const;

/**
 * Registration: log2 from 0.001 to 0.064, plus the anchors 0 and 0.125.
 *
 * 0.125 rather than the sequence's own next point 0.128 SO THAT BOTH ANCHORS ARE
 * EXACTLY 003 GRID CELLS and manipulation check 2 can run against committed data.
 * Span is 125x, and the lowest point sits 3.09x below the smallest predicted edge
 * at either horizon (0.0031, ratio 2.00 at 1800), so a null result cannot be
 * blamed on the grid stopping too high — the criticism 003 earned.
 */
const PHIS = [0, 0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.125] as const;

/** Registration: seeds 3001-3010, disjoint from 003's 2001-2010, 002's 1-10, the pilot's 1001-1006. */
const SEEDS = Array.from({ length: 10 }, (_, i) => 3001 + i);
/** Manipulation check 2 reproduces 003 on ITS seeds. */
const CONTROL_SEEDS = Array.from({ length: 10 }, (_, i) => 2001 + i);
/** The two anchors are exactly 003 grid cells. */
const CONTROL_PHIS = [0, 0.125] as const;

/** Registration: the grid runs to 1800 and is scored at 600 as well. */
const GENERATIONS = 1800;
const CHECKPOINT = 600;
/** Check 2's runs reproduce 003, which ran to 600. */
const CONTROL_GENERATIONS_HORIZON = 600;

/** Pre-specified stopping rule, carried from 002 and 003 UNCHANGED so check 2 is exact. */
const SATURATION_COPIES_PER_GENOME = 1500;

/** Manipulation check 1's horizon. Short enough that nothing has died. */
const CONTROL_GENERATIONS = 80;

/** Registration: everything else pinned at 002's and 003's values. */
const BASE: Partial<Params> = {
  N: 300, S: 3000, c: 0.02, r0: 0.2, rMax: 1, sigmaR: 0.05,
  v: 0.005, a: 0.0004, b: 0.00001, d: 0.0005, dTol: 0.002, t: 0,
  beta: 0.005, pDom: 0, wDom: 0.01, sexual: true, silencingOn: true,
};

// ---------------------------------------------------------------------------
// THE DIAL — 003's, unchanged.

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

/**
 * Manipulation check 4's instrument, measured AT INSERTION inside one run.
 *
 * `absSSum` is new in 004. Check 4 requires mean displacement to agree with
 * `phi * mean|s at insertion|`, which is the test that the dial is SCALED
 * correctly and not merely nonzero — the failure mode unique to this grid is a
 * smallest setting that is not a small perturbation but no perturbation.
 */
interface DialProbe {
  captures: number;
  displacementSum: number;
  absSSum: number;
  maxAbsEntry: number;
}
const newProbe = (): DialProbe => ({
  captures: 0, displacementSum: 0, absSSum: 0, maxAbsEntry: 0,
});

/**
 * Phase 2 at infidelity `phi`. The entry is `(1 - phi) * copy.s`.
 *
 * Bit-exactness at phi = 0, load-bearing for manipulation check 2 and argued
 * rather than asserted: `1 * copy.s` is `copy.s` exactly (IEEE-754
 * multiplication by 1 is exact), and `valueCovered(copy.s, genome, p)` is then
 * the same predicate as `isSilenced(copy, genome, p)` — `sim/silencing.ts:82-89`
 * differs only by returning false for a domesticated copy, and `trap.ts:39` has
 * already `continue`d on domesticated before that test is reached. So the same
 * copies reach `world.rng.next()` in the same order and THE SAME DRAWS ARE
 * CONSUMED.
 *
 * ⚠️ THE SIGN OF ZERO IS NORMALISED, carried from 003. `(1 - 1) * copy.s` is
 * negative zero for every copy at a negative coordinate. 004's grid does not
 * include phi = 1, so this line is not reachable in anger here — it is kept
 * because removing it would make this function silently differ from the one
 * check 2's oracle was produced by, for no gain.
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
// MANIPULATION CHECK 1 — the composed loop IS the shipped model.
//
// ⚠️ THE HASH COMPARISON CARRIES ITS OWN POSITIVE CONTROL. Two worlds that have
// both gone extinct hash identically no matter what phase ran, so hash equality
// alone cannot tell "the composed loop is the shipped model" from "there is
// nothing left to disagree about". Non-extinction is asserted FIRST, and its
// failure VOIDS the check rather than passing it.

function manipulationCheck1(): void {
  const configs: { theta: number; sigmaS: number; seed: number; label: string }[] = [];
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
    const composed = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
    const shipped = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
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
      failures.push(`${where}: ${stateHash(composed)} != ${stateHash(shipped)}`);
    }
    checked++;
  }

  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 1 FAILED (${failures.length} configurations):`);
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
// ONE RUN, SCORED AT TWO HORIZONS

type Outcome = "EXTINCT" | "CONTROLLED" | "RUNAWAY";

/** The state of a run as of one generation. Both records in a Row are one of these. */
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
  /** At the run's stop — generation `horizon`, or the saturation generation. */
  final: Record0;
  /** At generation 600, or at the stop if the run stopped at or before 600. */
  at600: Record0;
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
    throw new Error(`outcome classes overlapped at ${where} — the criterion is broken`);
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
    silencedFraction: s.totalCopies === 0 ? 0 : s.silencedCopies / s.totalCopies,
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
  let at600: Record0 | null = null;

  for (let g = 0; g < horizon; g++) {
    stepWith(world, phase);

    // Cheap per-generation instrumentation. `observe` recomputes silencing for
    // every copy, so it is called only at a checkpoint or the stop. This block is
    // byte-for-byte 002's and 003's, because `saw_nonzero_entry` is one of the
    // columns manipulation check 2 compares against a committed oracle.
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
    if (withRepertoire > maxGenomesWithRepertoire) {
      maxGenomesWithRepertoire = withRepertoire;
    }

    if (extinctionGeneration === "NA" && total === 0) {
      extinctionGeneration = world.generation;
    }
    if (total > saturationTotal) {
      saturationGeneration = world.generation;
      stoppedAt = world.generation;
      break;
    }
    // The generation-600 checkpoint, taken only if the run is still going. A run
    // that saturates at or before 600 never reaches this and its 600-record is
    // its stop record, which is exactly what a horizon-600 run would have written.
    //
    // ⚠️ `horizon > CHECKPOINT` IS WHAT MAKES CHECK 3a ABLE TO FAIL. Without it a
    // run whose horizon IS the checkpoint would execute this branch too, so
    // check 3a would compare two runs that BOTH took a checkpoint — and any side
    // effect of taking one would be present on both sides and cancel. The check
    // would pass on exactly the bug it exists to detect. With the guard, the
    // 600-run never takes a checkpoint and the comparison is genuinely
    // "with checkpoint" against "without". A checkpoint is redundant there in any
    // case: at horizon 600 the final record already IS the 600 record.
    if (world.generation === CHECKPOINT && horizon > CHECKPOINT) {
      at600 = snapshot(world, CHECKPOINT, 0, maxGenomesWithRepertoire, sawNonZeroEntry, where);
    }
  }

  const final = snapshot(
    world, stoppedAt, saturationGeneration === "NA" ? 0 : 1,
    maxGenomesWithRepertoire, sawNonZeroEntry, where,
  );

  return {
    phi,
    ratio: ratio.label,
    theta,
    sigmaS,
    kStar: Math.round((theta / sigmaS) ** 2),
    seed,
    horizon,
    final,
    at600: at600 ?? final,
    saturationGeneration,
    extinctionGeneration,
    captures: probe.captures,
    meanDisplacement: probe.captures === 0 ? 0 : probe.displacementSum / probe.captures,
    meanAbsS: probe.captures === 0 ? 0 : probe.absSSum / probe.captures,
    maxAbsEntry: probe.maxAbsEntry,
  };
}

// ---------------------------------------------------------------------------
// CSV

const REC_COLS = [
  "stopped_at", "copies_per_genome", "silenced_fraction", "outcome", "extinct",
  "saturated", "entries_per_genome", "max_genomes_with_repertoire",
  "saw_nonzero_entry", "hash",
];

const HEADER = [
  "phi", "ratio", "theta", "sigma_s", "k_star", "seed", "horizon",
  ...REC_COLS,
  ...REC_COLS.map((c) => `${c}_600`),
  "saturation_generation", "extinction_generation",
  "captures", "mean_displacement", "mean_abs_s", "max_abs_entry",
].join(",");

const rec = (r: Record0) => [
  r.stoppedAt, r.copiesPerGenome, r.silencedFraction, r.outcome, r.extinct,
  r.saturated, r.entriesPerGenome, r.maxGenomesWithRepertoire,
  r.sawNonZeroEntry, r.hash,
];

const format = (r: Row) =>
  [
    r.phi, r.ratio, r.theta, r.sigmaS, r.kStar, r.seed, r.horizon,
    ...rec(r.final), ...rec(r.at600),
    r.saturationGeneration, r.extinctionGeneration,
    r.captures, r.meanDisplacement, r.meanAbsS, r.maxAbsEntry,
  ].join(",");

/** Row key for resume and for the cross-cell checks 3a and 4c. */
const keyOf = (phi: number, ratio: string, seed: number) => `${phi}|${ratio}|${seed}`;

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
// MANIPULATION CHECK 2 — the anchors reproduce 003 EXACTLY.
//
// The strongest control in the experiment and the only one held to data that
// already exists in the repository, produced by a DIFFERENT RUNNER. phi = 0 and
// phi = 0.125 must reproduce 003 run for run, on 003's own seeds, at the same
// model freeze. It can fail loudly against a committed CSV.
//
// ⚠️ THE COMPARISON USES THE RUN'S **FINAL** RECORD, NOT ITS `_600` ONE. Control
// runs go to CONTROL_GENERATIONS_HORIZON, so their final record IS the record at
// 003's horizon, and that is true whatever CHECKPOINT is set to. Reading the
// `_600` columns here was the first form of this check and was WRONG: it happened
// to work only because CHECKPOINT and CONTROL_GENERATIONS_HORIZON are both 600,
// so the check's correctness depended on two independent constants coinciding.
// Caught by the mutation harness before any data existed, because fast-downing
// CHECKPOINT to 60 for the mutants made all 60 anchors disagree at once.

interface Row003 {
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  outcome: string;
  extinct: number;
  saturated: number;
  entriesPerGenome: number;
  sawNonZeroEntry: number;
  maxGenomesWithRepertoire: number;
}

function load003(): Map<string, Row003> {
  if (!existsSync(CSV_003)) {
    throw new Error(
      `manipulation check 2 cannot run: ${CSV_003} is missing. It is 003's committed result and is this check's oracle. The experiment is VOID without it.`,
    );
  }
  const lines = readFileSync(CSV_003, "utf8").trim().split("\n");
  const head = lines[0]!.split(",");
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0) {
      throw new Error(
        `${CSV_003} has no column "${name}" — the oracle is not the file this check was written against`,
      );
    }
    return i;
  };
  const c = {
    phi: col("phi"), ratio: col("ratio"), seed: col("seed"),
    stopped: col("stopped_at"), copies: col("copies_per_genome"),
    sil: col("silenced_fraction"), outcome: col("outcome"),
    ext: col("extinct"), sat: col("saturated"),
    entries: col("entries_per_genome"), nonzero: col("saw_nonzero_entry"),
    maxGen: col("max_genomes_with_repertoire"),
  };

  const m = new Map<string, Row003>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    m.set(keyOf(Number(f[c.phi]), f[c.ratio]!, Number(f[c.seed])), {
      stoppedAt: Number(f[c.stopped]),
      copiesPerGenome: Number(f[c.copies]),
      silencedFraction: Number(f[c.sil]),
      outcome: f[c.outcome]!,
      extinct: Number(f[c.ext]),
      saturated: Number(f[c.sat]),
      entriesPerGenome: Number(f[c.entries]),
      sawNonZeroEntry: Number(f[c.nonzero]),
      maxGenomesWithRepertoire: Number(f[c.maxGen]),
    });
  }

  // ⚠️ THE ORACLE MUST HAVE BEEN PRODUCED AT THE HORIZON THIS CHECK ASSUMES.
  // Check 2 compares this runner's control runs, taken at
  // CONTROL_GENERATIONS_HORIZON, against 003's rows. If 003 had run to a
  // different horizon the comparison would be between two different questions
  // and would fail for a reason that has nothing to do with the dial. 003's
  // CONTROLLED runs stop exactly at its horizon, so the largest stopped_at in
  // the oracle IS that horizon.
  let maxStopped = 0;
  for (const r of m.values()) maxStopped = Math.max(maxStopped, r.stoppedAt);
  if (maxStopped !== CONTROL_GENERATIONS_HORIZON) {
    throw new Error(
      `${CSV_003} was produced at horizon ${maxStopped}, but check 2 compares against horizon ${CONTROL_GENERATIONS_HORIZON}. The oracle is not the file this check was written against.`,
    );
  }
  return m;
}

function manipulationCheck2(resume: boolean): void {
  const oracle = load003();
  const total = CONTROL_PHIS.length * RATIOS.length * CONTROL_SEEDS.length;
  console.log(
    `MANIPULATION CHECK 2 — the anchors must reproduce ${CSV_003} exactly, ${total} runs at horizon ${CONTROL_GENERATIONS_HORIZON}`,
  );

  // Re-read cached rows so a resumed run still COMPARES them; a cache that skips
  // the comparison would turn this check into a no-op on every rerun.
  const cached = resume ? readRows(CONTROL_CSV) : new Map<string, Record<string, string>>();
  if (!resume || !existsSync(CONTROL_CSV)) writeFileSync(CONTROL_CSV, `${HEADER}\n`);
  else if (cached.size > 0) console.log(`  --resume: ${cached.size} control runs cached, re-comparing them.`);

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
        let got: Row003;
        if (hit) {
          got = {
            stoppedAt: Number(hit.stopped_at),
            copiesPerGenome: Number(hit.copies_per_genome),
            silencedFraction: Number(hit.silenced_fraction),
            outcome: hit.outcome!,
            extinct: Number(hit.extinct),
            saturated: Number(hit.saturated),
            entriesPerGenome: Number(hit.entries_per_genome),
            sawNonZeroEntry: Number(hit.saw_nonzero_entry),
            maxGenomesWithRepertoire: Number(hit.max_genomes_with_repertoire),
          };
        } else {
          const row = runOne(phi, ratio, seed, CONTROL_GENERATIONS_HORIZON);
          appendFileSync(CONTROL_CSV, `${format(row)}\n`);
          got = {
            stoppedAt: row.final.stoppedAt,
            copiesPerGenome: row.final.copiesPerGenome,
            silencedFraction: row.final.silencedFraction,
            outcome: row.final.outcome,
            extinct: row.final.extinct,
            saturated: row.final.saturated,
            entriesPerGenome: row.final.entriesPerGenome,
            sawNonZeroEntry: row.final.sawNonZeroEntry,
            maxGenomesWithRepertoire: row.final.maxGenomesWithRepertoire,
          };
        }

        const want = oracle.get(key);
        if (!want) {
          failures.push(`${where}: no matching row in ${CSV_003} — the oracle does not cover this cell`);
          continue;
        }
        const diffs: string[] = [];
        const cmpN = (name: string, a: number, b: number) => {
          if (a !== b) diffs.push(`${name} ${a} != ${b}`);
        };
        cmpN("stopped_at", got.stoppedAt, want.stoppedAt);
        cmpN("copies_per_genome", got.copiesPerGenome, want.copiesPerGenome);
        cmpN("silenced_fraction", got.silencedFraction, want.silencedFraction);
        cmpN("extinct", got.extinct, want.extinct);
        cmpN("saturated", got.saturated, want.saturated);
        cmpN("entries_per_genome", got.entriesPerGenome, want.entriesPerGenome);
        cmpN("saw_nonzero_entry", got.sawNonZeroEntry, want.sawNonZeroEntry);
        cmpN("max_genomes_with_repertoire", got.maxGenomesWithRepertoire, want.maxGenomesWithRepertoire);
        if (got.outcome !== want.outcome) diffs.push(`outcome ${got.outcome} != ${want.outcome}`);
        if (diffs.length > 0) failures.push(`${where}: ${diffs.join("; ")}`);
        compared++;
        if (n % 15 === 0) console.log(`  [${n}/${total}] compared ${compared}, ${failures.length} failing`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 2 FAILED (${failures.length} of ${total} runs):`);
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 2 failed — the anchors are NOT 003's cells, so this grid does not extend 003's. The experiment is VOID.",
    );
  }
  console.log(`  PASSED — all ${compared} anchor runs reproduce ${CSV_003} exactly.\n`);
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 4, per run — the dial is live AND CORRECTLY SCALED.
//
// The failure mode unique to this grid is a smallest setting that is not a small
// perturbation but NO perturbation. "Displacement is nonzero" does not catch a
// dial applying the WRONG phi; the scaling test does.
//
// `|entry - copy.s|` is `phi*|s|` in exact arithmetic but NOT bit-identical to it
// in IEEE-754: `fl(fl(1-phi)*s) - s` and `-fl(phi*s)` round differently. Hence a
// tolerance, which the registration fixes at 1e-9 — roughly five orders of
// magnitude above the ~2e-15 per-term rounding this can actually produce at these
// magnitudes, and well below the smallest mean displacement the grid can generate.

function checkRun(row: Row): string[] {
  const where = `phi=${row.phi} ratio=${row.ratio} seed=${row.seed}`;
  const v: string[] = [];

  // Carried from 002 and 003, FIRST: it is the precondition the rest is read
  // against. A cell where nothing is ever captured is the silencing knockout
  // wearing a dial's clothes.
  if (row.at600.maxGenomesWithRepertoire === 0 && row.final.maxGenomesWithRepertoire === 0) {
    v.push(`${where}: no genome ever held a repertoire (check 4)`);
    return v;
  }
  if (row.captures === 0) {
    v.push(`${where}: a repertoire formed but no capture was recorded — the probe is not wired (check 4)`);
    return v;
  }

  if (row.phi === 0) {
    // POSITIVE CONTROL, asserted first and in the same body as the test it
    // protects: at phi = 0 displacement is not merely small, it is exactly zero,
    // and the entries are not all the ancestral 0.
    if (row.meanDisplacement !== 0) {
      v.push(`${where}: mean displacement ${row.meanDisplacement} != 0 — phi=0 is not the shipped trap (check 4)`);
    }
    if (row.maxAbsEntry <= 1e-9) {
      v.push(`${where}: every entry was the ancestral 0 — phi=0 is silently the innate trap (check 4)`);
    }
  } else {
    if (!(row.meanDisplacement > 0)) {
      v.push(`${where}: mean displacement is 0 — the dial is silently stuck at phi=0 (check 4)`);
    }
    if (!(row.maxAbsEntry > 1e-9)) {
      v.push(`${where}: every entry was the ancestral 0 — the dial is silently stuck at phi=1 (check 4)`);
    }
    const want = row.phi * row.meanAbsS;
    if (Math.abs(row.meanDisplacement - want) > 1e-9) {
      v.push(
        `${where}: mean displacement ${row.meanDisplacement} != phi*mean|s| ${want} ` +
          `(diff ${Math.abs(row.meanDisplacement - want)}) — the dial is live but MIS-SCALED (check 4)`,
      );
    }
  }
  return v;
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECKS 3a, 3b and 4c — across runs, after the grid.

/**
 * CHECK 3a — the horizon extension is inert at generation 600.
 *
 * This is what licenses reading two horizons out of one run. An independent
 * 600-generation run must agree BIT-FOR-BIT with the 1800-generation run's
 * generation-600 checkpoint. It reuses the grid's stored hash rather than
 * re-running to 1800, so it costs three 600-generation runs; a failure voids the
 * experiment whenever it is detected.
 *
 * ⚠️ POSITIVE CONTROL ASSERTED FIRST. Two extinct worlds hash identically no
 * matter what ran, so a comparison between two empty worlds would pass by
 * agreeing on nothing. Non-extinction at generation 600 is required before the
 * hashes are compared, and its absence VOIDS the check rather than passing it.
 */
function manipulationCheck3a(grid: Map<string, Record<string, string>>): string[] {
  const phi = 0.001; // strictly inside (0, 0.125), as registered
  const seed = SEEDS[0]!;
  const v: string[] = [];
  console.log(`MANIPULATION CHECK 3a — horizon extension inert at generation ${CHECKPOINT}, ${RATIOS.length} comparisons`);
  for (const ratio of RATIOS) {
    const where = `phi=${phi} ratio=${ratio.label} seed=${seed}`;
    const long = grid.get(keyOf(phi, ratio.label, seed));
    if (!long) {
      v.push(`${where}: no grid row to compare against (check 3a)`);
      continue;
    }
    const short = runOne(phi, ratio, seed, CHECKPOINT);
    if (short.final.copiesPerGenome === 0 || Number(long.copies_per_genome_600) === 0) {
      v.push(`${where}: extinct at generation ${CHECKPOINT} — the hash comparison would be vacuous (check 3a)`);
      continue;
    }
    if (short.final.hash !== long.hash_600) {
      v.push(`${where}: 600-run hash ${short.final.hash} != 1800-run checkpoint ${long.hash_600} (check 3a)`);
    } else {
      console.log(`  ${where}: ${short.final.hash} identical, ${short.final.copiesPerGenome.toFixed(1)} copies/genome`);
    }
  }
  return v;
}

/**
 * CHECK 3b — the horizon is actually reached.
 *
 * ⚠️ AMENDMENT 1, made BEFORE ANY DATA EXISTED. See the registration.
 * As registered this read: every phi = 0 run must record generation 1800 or a
 * saturation stop in (600, 1800]. THAT FORM CAN FAIL FOR A REASON UNRELATED TO
 * WHAT IT TESTS — a phi = 0 run that legitimately saturated at generation 400 on
 * a new seed would void the whole experiment, when what the check exists to catch
 * is a SILENTLY TRUNCATED HORIZON. The replacement fires only on the thing it
 * names: a run that stopped exactly at the checkpoint with no stop reason
 * recorded. An early saturation at phi = 0 would be a scientific surprise and is
 * REPORTED as one, not treated as an instrument failure.
 */
function manipulationCheck3b(grid: Map<string, Record<string, string>>): string[] {
  const v: string[] = [];
  let reached = 0;
  const surprises: string[] = [];
  for (const [key, o] of grid) {
    if (Number(o.phi) !== 0) continue;
    const stopped = Number(o.stopped_at);
    const sat = o.saturation_generation;
    if (stopped === CHECKPOINT && sat === "NA") {
      v.push(`${key}: stopped at generation ${CHECKPOINT} with no stop reason — the horizon was silently truncated (check 3b)`);
      continue;
    }
    if (stopped === GENERATIONS) reached++;
    if (sat !== "NA" && Number(sat) <= CHECKPOINT) {
      surprises.push(`${key}: phi=0 saturated at generation ${sat}`);
    }
  }
  console.log(`MANIPULATION CHECK 3b — ${reached} phi=0 runs reached generation ${GENERATIONS}`);
  if (surprises.length > 0) {
    console.log(`  ⚠️ REPORTED, NOT A FAILURE — ${surprises.length} phi=0 runs saturated at or before ${CHECKPOINT}:`);
    for (const s of surprises.slice(0, 10)) console.log(`     ${s}`);
  }
  return v;
}

/**
 * CHECK 4c — the dial is live AT ITS SMALLEST SETTING, measured on the WORLD and
 * not on the probe.
 *
 * A dial whose smallest setting produces a bit-identical world is not a dial with
 * a small setting, it is a dial with a broken one, and every cell below the edge
 * would be a false CONTROLLED. The probe-based half of check 4 cannot see this:
 * it reads displacement at insertion, which is nonzero by construction even if
 * the perturbation never changes a single coverage decision.
 *
 * ⚠️ POSITIVE CONTROL ASSERTED FIRST, same reason as 3a.
 */
function manipulationCheck4c(grid: Map<string, Record<string, string>>): string[] {
  const v: string[] = [];
  let compared = 0;
  for (const ratio of RATIOS) {
    for (const seed of SEEDS) {
      const a = grid.get(keyOf(0, ratio.label, seed));
      const b = grid.get(keyOf(0.001, ratio.label, seed));
      const where = `ratio=${ratio.label} seed=${seed}`;
      if (!a || !b) {
        v.push(`${where}: missing a phi=0 or phi=0.001 row to compare (check 4c)`);
        continue;
      }
      if (Number(a.copies_per_genome_600) === 0 && Number(b.copies_per_genome_600) === 0) {
        v.push(`${where}: both worlds extinct at generation ${CHECKPOINT} — the comparison would be vacuous (check 4c)`);
        continue;
      }
      if (a.hash_600 === b.hash_600) {
        v.push(`${where}: phi=0.001 is bit-identical to phi=0 at generation ${CHECKPOINT} (${a.hash_600}) — the smallest setting is no setting (check 4c)`);
      }
      compared++;
    }
  }
  console.log(`MANIPULATION CHECK 4c — phi=0.001 vs phi=0 at generation ${CHECKPOINT}, ${compared} comparisons`);
  return v;
}

// ---------------------------------------------------------------------------
// DRIVER

const resume = process.argv.includes("--resume");

const existing = resume ? readRows(CSV) : new Map<string, Record<string, string>>();
if (resume && existsSync(CSV)) {
  console.log(`--resume: ${existing.size} runs already in ${CSV}, skipping those.\n`);
} else {
  writeFileSync(CSV, `${HEADER}\n`);
}

manipulationCheck1();
manipulationCheck2(resume);

const started = Date.now();
const violations: string[] = [];
let ran = 0;
const totalRuns = RATIOS.length * PHIS.length * SEEDS.length;

for (const ratio of RATIOS) {
  for (const phi of PHIS) {
    for (const seed of SEEDS) {
      if (existing.has(keyOf(phi, ratio.label, seed))) continue;
      const t0 = Date.now();
      const row = runOne(phi, ratio, seed, GENERATIONS);
      // Appended as each run completes: a kill costs the run in flight only.
      appendFileSync(CSV, `${format(row)}\n`);
      violations.push(...checkRun(row));
      ran++;
      console.log(
        `[${String(ran).padStart(3)}/${totalRuns}] ratio=${ratio.label} phi=${String(phi).padEnd(5)} seed=${seed} ` +
          `600:${row.at600.outcome.padEnd(10)} ${String(row.final.stoppedAt).padStart(4)}:${row.final.outcome.padEnd(10)} ` +
          `copies/genome=${row.final.copiesPerGenome.toFixed(1).padStart(7)} sil=${row.final.silencedFraction.toFixed(3)} ` +
          `(${((Date.now() - t0) / 1000).toFixed(1)}s)`,
      );
    }
  }
}

console.log(`\nwrote ${ran} runs to ${CSV} in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);

// The cross-run checks read the CSV back, so they cover resumed rows too.
const grid = readRows(CSV);
violations.push(...manipulationCheck3a(grid));
violations.push(...manipulationCheck3b(grid));
violations.push(...manipulationCheck4c(grid));

if (violations.length > 0) {
  console.error(`\nMANIPULATION CHECKS FAILED (${violations.length} violations):`);
  for (const v of violations.slice(0, 20)) console.error(`  ${v}`);
  throw new Error(
    "manipulation check failed — the dial or the dual-horizon design is not what the registration says it is; the CSV is written but VOID",
  );
}
console.log(`\nmanipulation checks 3a, 3b, 4 and 4c PASSED — ${grid.size} rows in ${CSV}`);
