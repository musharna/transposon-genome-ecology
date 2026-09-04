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
 * Registered question 003 — how fresh must the trap be?
 *
 * Registration: `docs/pre-registrations/2026-09-04-how-fresh-must-the-trap-be.md`,
 * committed ALONE at `126e3bd` BEFORE this file existed. Everything here — the
 * dial, the grid, the seeds, the horizon, the stopping rule, the three-way
 * outcome class, the four manipulation checks — is fixed by that document.
 * IF THIS FILE AND THE DOCUMENT DISAGREE, THE DOCUMENT IS RIGHT AND THIS FILE
 * IS A BUG.
 *
 * Emits CSV. The pre-specified analysis and the figure are R —
 * `docs/analysis/plot-003.R`.
 *
 * THE DIAL
 * --------
 * 002's two arms were the endpoints of a continuum. The captured entry is
 *
 *     entry = (1 - phi) * copy.s
 *
 * so phi = 0 IS the shipped `trap` (002 arm A) and phi = 1 IS the ancestral-
 * fixed trap (002 arm B). Both endpoints are bit-exact, not merely similar —
 * see `trapAtFidelity` and manipulation check 2.
 *
 * `sim/` IS NOT MODIFIED
 * ----------------------
 * The phase is composed here, in `sim/step.ts`'s order with phase 2 substituted
 * — the pattern from `scripts/explore-fossil-state.ts`, carried through 002.
 * Manipulation check 1 is what makes that legitimate.
 *
 * WHAT IS NOT REGISTERED AS THE PRIMARY, AND WHY
 * ---------------------------------------------
 * 002 pre-committed 003 to a two-arm test at these ratios. Recomputed from
 * 002's committed CSV under a criterion separating persistence from runaway,
 * arm B is CONTROLLED in 0 of all 90 runs and arm A in 53 of 90; at the two
 * registered ratios the contrast is 30/30 against 0/30. Registering a test
 * whose answer the committed data already gives at complete separation would be
 * this project's signature defect — a check that cannot fail — installed on
 * purpose. The endpoints are run on fresh seeds and reported as an explicitly
 * NON-PRIMARY confirmation. The registered question is the interior.
 */

const CSV = "experiments/003-trap-fidelity.csv";
/** Manipulation check 2's runs are expensive and cacheable; the model is frozen. */
const CONTROL_CSV = "experiments/003-reproduction-control.csv";
/** The oracle check 2 holds this runner to. Committed, 180 rows. */
const CSV_002 = "experiments/002-conscription-vs-innate.csv";

/**
 * Registration: the grid is stated IN THE RATIO, because 002 established that
 * `theta` and `sigmaS` are one axis in `s`-space.
 *
 * ⚠️ `sigmaS` IS PINNED, NOT DERIVED AS `theta / ratio`. The labels are rounded:
 * `0.10 / 3.33` is `0.03003`, not `0.03`, which would put the cell a hair off
 * 002's grid and silently break manipulation check 2. The exact ratios are
 * 10/3, 5 and 2.
 */
const RATIOS = [
  { label: "2.00", theta: 0.1, sigmaS: 0.05, exploratory: true },
  { label: "3.33", theta: 0.1, sigmaS: 0.03, exploratory: false },
  { label: "5.00", theta: 0.1, sigmaS: 0.02, exploratory: false },
] as const;

/**
 * Registration: the dial is swept CLOSED, endpoints included, so no region of
 * the registered axis is unswept. 002's falsification lived below the floor its
 * own pilot swept; that lesson is applied here rather than restated.
 */
const PHIS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] as const;

/** Registration: seeds 2001-2010, disjoint from 002's 1-10 and its pilot's 1001-1006. */
const SEEDS = Array.from({ length: 10 }, (_, i) => 2001 + i);
/** Manipulation check 2 reproduces 002 on ITS seeds. */
const CONTROL_SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);
/** The two endpoints of the dial are 002's two arms. */
const CONTROL_PHIS = [0, 1] as const;

const GENERATIONS = 600;

/** Pre-specified stopping rule, carried from 002 UNCHANGED so check 2 is exact. */
const SATURATION_COPIES_PER_GENOME = 1500;

/** Manipulation check 1's horizon. Short enough that nothing has died. */
const CONTROL_GENERATIONS = 80;

/** Registration: everything else pinned at 002's values. */
const BASE: Partial<Params> = {
  N: 300, S: 3000, c: 0.02, r0: 0.2, rMax: 1, sigmaR: 0.05,
  v: 0.005, a: 0.0004, b: 0.00001, d: 0.0005, dTol: 0.002, t: 0,
  beta: 0.005, pDom: 0, wDom: 0.01, sexual: true, silencingOn: true,
};

// ---------------------------------------------------------------------------
// THE DIAL

/**
 * Is `value` already within theta of some entry? The two-neighbour argument in
 * `sim/silencing.ts` applies unchanged.
 *
 * ⚠️ THIS, NOT `isSilenced`, IS THE FAITHFUL TRANSLATION OF `trap.ts`'s NO-OP
 * GUARD once the inserted value is not `copy.s`. `trap.ts:42` skips a copy that
 * is already silenced, under "capturing again would be a no-op" — sound THERE
 * because the value it inserts IS `copy.s`, so "already covered" and "already
 * silenced" are one test. At phi > 0 they are not: a copy that has diverged past
 * theta is NOT silenced and would insert a duplicate value forever. 002 measured
 * that at 11,045 entries per genome by generation 300 and 1.09 GB resident.
 * Asking whether the VALUE ABOUT TO BE INSERTED is already covered changes no
 * semantics, since `isSilenced` asks only whether SOME entry is within theta.
 */
function valueCovered(value: number, genome: Genome, p: Params): boolean {
  const rep = genome.repertoire;
  const i = repertoireInsertionIndex(rep, value);
  if (i < rep.length && Math.abs(value - rep[i]!) <= p.theta) return true;
  if (i > 0 && Math.abs(value - rep[i - 1]!) <= p.theta) return true;
  return false;
}

type TrapPhase = (world: World) => void;

/** Manipulation check 3's instrument, measured AT INSERTION inside one run. */
interface DialProbe {
  captures: number;
  displacementSum: number;
  maxAbsEntry: number;
}
const newProbe = (): DialProbe => ({ captures: 0, displacementSum: 0, maxAbsEntry: 0 });

/**
 * Phase 2 at infidelity `phi`. The entry is `(1 - phi) * copy.s`.
 *
 * WHY THE ENDPOINTS ARE BIT-EXACT, NOT MERELY SIMILAR — this is load-bearing for
 * manipulation check 2, so it is argued rather than asserted:
 *
 *  - At phi = 0 the value is `1 * copy.s`, which is `copy.s` exactly (IEEE-754
 *    multiplication by 1 is exact). `valueCovered(copy.s, genome, p)` and
 *    `isSilenced(copy, genome, p)` are then the same predicate on the same
 *    arguments: `isSilenced` (`sim/silencing.ts:82-89`) differs only by
 *    returning false for a domesticated copy, and `trap.ts:39` has already
 *    `continue`d on domesticated before that test is reached. So the same copies
 *    reach `world.rng.next()` in the same order and THE SAME DRAWS ARE CONSUMED.
 *  - At phi = 1 the value is 0, which is 002's arm B including its guard.
 *
 * ⚠️ AND THE SIGN OF ZERO IS NORMALISED. `(1 - 1) * copy.s` is `0 * copy.s`,
 * which is NEGATIVE zero for every copy at a negative coordinate — half of them.
 * `-0` compares equal to `0` everywhere this model looks at it, so it is very
 * probably harmless, and that is exactly why it is not left to chance against a
 * bit-exactness check: `raw === 0` is true for both zeros and maps them to +0,
 * which is the literal 002's arm B inserts. Determinism doctrine — the draws
 * consumed and the state reached are both part of reproducible state.
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
// nothing left to disagree about". Non-extinction at CONTROL_GENERATIONS is
// asserted FIRST, and its failure VOIDS the check rather than passing it.

function manipulationCheck1(): void {
  // Every (ratio, seed) pair the experiment actually uses — the grid's seeds and
  // check 2's seeds both, since "at every seed used" is what is registered.
  const configs: { theta: number; sigmaS: number; seed: number; label: string }[] = [];
  for (const r of RATIOS) for (const seed of SEEDS) {
    configs.push({ theta: r.theta, sigmaS: r.sigmaS, seed, label: r.label });
  }
  for (const r of RATIOS) {
    if (r.exploratory) continue;
    for (const seed of CONTROL_SEEDS) {
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
    // The positive control, asserted BEFORE the hash comparison it protects.
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
// ONE RUN

type Outcome = "EXTINCT" | "CONTROLLED" | "RUNAWAY";

interface Row {
  phi: number;
  ratio: string;
  theta: number;
  sigmaS: number;
  kStar: number;
  seed: number;
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  outcome: Outcome;
  extinct: number;
  saturated: number;
  saturationGeneration: number | "NA";
  extinctionGeneration: number | "NA";
  entriesPerGenome: number;
  maxGenomesWithRepertoire: number;
  sawNonZeroEntry: number;
  everHadRepertoire: number;
  captures: number;
  meanDisplacement: number;
  maxAbsEntry: number;
  exploratory: number;
}

function runOne(
  phi: number,
  ratio: (typeof RATIOS)[number],
  seed: number,
): Row {
  const { theta, sigmaS } = ratio;
  const world = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
  const probe = newProbe();
  const phase = trapAtFidelity(phi, probe);
  const saturationTotal = SATURATION_COPIES_PER_GENOME * (BASE.N as number);

  let saturationGeneration: number | "NA" = "NA";
  let extinctionGeneration: number | "NA" = "NA";
  let maxGenomesWithRepertoire = 0;
  let sawNonZeroEntry = false;
  let stoppedAt = GENERATIONS;

  for (let g = 0; g < GENERATIONS; g++) {
    stepWith(world, phase);

    // Cheap per-generation instrumentation. `observe` recomputes silencing for
    // every copy, so it is called only at the stop. This block is byte-for-byte
    // 002's, because `saw_nonzero_entry` is one of the columns check 2 compares.
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
  }

  const s = observe(world);
  let entries = 0;
  for (const genome of world.genomes) entries += genome.repertoire.length;

  const extinct = s.totalCopies === 0 ? 1 : 0;
  const saturated = saturationGeneration === "NA" ? 0 : 1;
  // The registered classes are mutually exclusive and exhaustive. A saturated
  // run stopped ABOVE the ceiling, so it cannot also be empty; assert it rather
  // than trusting it, because a criterion that silently overlaps is exactly the
  // defect 002's VIABLE turned out to be.
  if (extinct === 1 && saturated === 1) {
    throw new Error(
      `outcome classes overlapped at phi=${phi} ratio=${ratio.label} seed=${seed} — the criterion is broken`,
    );
  }
  const outcome: Outcome = extinct ? "EXTINCT" : saturated ? "RUNAWAY" : "CONTROLLED";

  return {
    phi,
    ratio: ratio.label,
    theta,
    sigmaS,
    kStar: Math.round((theta / sigmaS) ** 2),
    seed,
    stoppedAt,
    copiesPerGenome: s.totalCopies / world.genomes.length,
    silencedFraction: s.totalCopies === 0 ? 0 : s.silencedCopies / s.totalCopies,
    outcome,
    extinct,
    saturated,
    saturationGeneration,
    extinctionGeneration,
    entriesPerGenome: entries / world.genomes.length,
    maxGenomesWithRepertoire,
    sawNonZeroEntry: sawNonZeroEntry ? 1 : 0,
    everHadRepertoire: maxGenomesWithRepertoire > 0 ? 1 : 0,
    captures: probe.captures,
    meanDisplacement: probe.captures === 0 ? 0 : probe.displacementSum / probe.captures,
    maxAbsEntry: probe.maxAbsEntry,
    exploratory: ratio.exploratory ? 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECKS 3 and 4 — per run.

/**
 * Check 3 (as amended in the registration, before any data existed) measures the
 * dial AT THE POINT OF INSERTION, inside one run. The first form compared a
 * run's mean |entry| against the phi=0 run at the same ratio and seed, which is
 * a comparison between two DIFFERENT WORLDS: the instant two phi values disagree
 * on one `valueCovered` test they consume different numbers of draws and every
 * later draw is displaced. That form could fail for a reason unrelated to the
 * dial, and a check that can do that is not a control.
 *
 * Check 4 is the one that stops a null being manufactured by nothing happening:
 * if no genome ever captures anything, every cell is the silencing knockout and
 * the whole dial is empty.
 */
function checkRun(row: Row): string[] {
  const where = `phi=${row.phi} ratio=${row.ratio} seed=${row.seed}`;
  const v: string[] = [];

  // Check 4, first: it is the precondition the rest is read against.
  if (row.everHadRepertoire === 0) {
    v.push(`${where}: no genome ever held a repertoire (check 4)`);
    return v;
  }
  if (row.captures === 0) {
    v.push(`${where}: a repertoire formed but no capture was recorded — the probe is not wired (check 3)`);
    return v;
  }

  if (row.phi === 0) {
    if (row.meanDisplacement !== 0) {
      v.push(`${where}: mean displacement ${row.meanDisplacement} != 0 — phi=0 is not the shipped trap (check 3)`);
    }
    if (row.maxAbsEntry <= 1e-9) {
      v.push(`${where}: every entry was the ancestral 0 — phi=0 is silently arm B (check 3)`);
    }
  } else if (row.phi === 1) {
    if (row.maxAbsEntry !== 0) {
      v.push(`${where}: max |entry| ${row.maxAbsEntry} != 0 — phi=1 is not the innate trap (check 3)`);
    }
  } else {
    if (!(row.meanDisplacement > 0)) {
      v.push(`${where}: mean displacement is 0 — the dial is silently stuck at arm A (check 3)`);
    }
    if (!(row.maxAbsEntry > 1e-9)) {
      v.push(`${where}: every entry was the ancestral 0 — the dial is silently stuck at arm B (check 3)`);
    }
  }
  return v;
}

// ---------------------------------------------------------------------------
// CSV

const HEADER = [
  "phi", "ratio", "theta", "sigma_s", "k_star", "seed", "stopped_at",
  "copies_per_genome", "silenced_fraction", "outcome", "extinct", "saturated",
  "saturation_generation", "extinction_generation", "entries_per_genome",
  "max_genomes_with_repertoire", "saw_nonzero_entry", "ever_had_repertoire",
  "captures", "mean_displacement", "max_abs_entry", "exploratory",
].join(",");

const format = (r: Row) =>
  [
    r.phi, r.ratio, r.theta, r.sigmaS, r.kStar, r.seed, r.stoppedAt,
    r.copiesPerGenome, r.silencedFraction, r.outcome, r.extinct, r.saturated,
    r.saturationGeneration, r.extinctionGeneration, r.entriesPerGenome,
    r.maxGenomesWithRepertoire, r.sawNonZeroEntry, r.everHadRepertoire,
    r.captures, r.meanDisplacement, r.maxAbsEntry, r.exploratory,
  ].join(",");

function readKeys(path: string): Set<string> {
  const done = new Set<string>();
  if (!existsSync(path)) return done;
  const lines = readFileSync(path, "utf8").trim().split("\n").slice(1);
  for (const line of lines) {
    const [phi, ratio, , , , seed] = line.split(",");
    done.add(`${phi}|${ratio}|${seed}`);
  }
  return done;
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 2 — the endpoints reproduce 002 EXACTLY.
//
// This is the strongest control in the experiment and the only one held to data
// that already exists in the repository. phi=0 must reproduce 002's arm A and
// phi=1 its arm B, run for run, on 002's own seeds, at the same model freeze.
// It is what proves the dial's endpoints ARE 002's arms rather than resembling
// them — and it can fail loudly against a committed CSV.

interface Row002 {
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  extinct: number;
  saturated: number;
  entriesPerGenome: number;
  sawNonZeroEntry: number;
  maxGenomesWithRepertoire: number;
}

function load002(): Map<string, Row002> {
  if (!existsSync(CSV_002)) {
    throw new Error(
      `manipulation check 2 cannot run: ${CSV_002} is missing. It is 002's committed result and is this check's oracle. The experiment is VOID without it.`,
    );
  }
  const lines = readFileSync(CSV_002, "utf8").trim().split("\n");
  const head = lines[0]!.split(",");
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0) throw new Error(`${CSV_002} has no column "${name}" — the oracle is not the file this check was written against`);
    return i;
  };
  const [cArm, cTheta, cSigma, cSeed] = [col("arm"), col("theta"), col("sigma_s"), col("seed")];
  const cStopped = col("stopped_at");
  const cCopies = col("copies_per_genome");
  const cSil = col("silenced_fraction");
  const cExt = col("extinct");
  const cSat = col("saturated");
  const cEntries = col("entries_per_genome");
  const cNonZero = col("saw_nonzero_entry");
  const cMaxGen = col("max_genomes_with_repertoire");

  const m = new Map<string, Row002>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    // 002's arm A is phi=0; its arm B is phi=1.
    const phi = f[cArm]!.startsWith("A") ? 0 : 1;
    m.set(`${phi}|${f[cTheta]}|${f[cSigma]}|${f[cSeed]}`, {
      stoppedAt: Number(f[cStopped]),
      copiesPerGenome: Number(f[cCopies]),
      silencedFraction: Number(f[cSil]),
      extinct: Number(f[cExt]),
      saturated: Number(f[cSat]),
      entriesPerGenome: Number(f[cEntries]),
      sawNonZeroEntry: Number(f[cNonZero]),
      maxGenomesWithRepertoire: Number(f[cMaxGen]),
    });
  }
  return m;
}

function manipulationCheck2(resume: boolean): void {
  const oracle = load002();
  const controlRatios = RATIOS.filter((r) => !r.exploratory);
  const total = CONTROL_PHIS.length * controlRatios.length * CONTROL_SEEDS.length;
  console.log(
    `MANIPULATION CHECK 2 — the dial's endpoints must reproduce ${CSV_002} exactly, ${total} runs`,
  );

  const done = resume ? readKeys(CONTROL_CSV) : new Set<string>();
  if (!resume || !existsSync(CONTROL_CSV)) writeFileSync(CONTROL_CSV, `${HEADER}\n`);
  else if (done.size > 0) console.log(`  --resume: ${done.size} control runs already cached.`);

  const failures: string[] = [];
  const cached = new Map<string, Row>();
  if (resume && existsSync(CONTROL_CSV)) {
    // Re-read cached rows so a resumed run still COMPARES them; a cache that
    // skips the comparison would turn this check into a no-op on every rerun.
    const lines = readFileSync(CONTROL_CSV, "utf8").trim().split("\n");
    const head = lines[0]!.split(",");
    for (const line of lines.slice(1)) {
      const f = line.split(",");
      const o: Record<string, string> = {};
      head.forEach((h, i) => (o[h] = f[i]!));
      cached.set(`${o.phi}|${o.ratio}|${o.seed}`, {
        phi: Number(o.phi), ratio: o.ratio!, theta: Number(o.theta), sigmaS: Number(o.sigma_s),
        kStar: Number(o.k_star), seed: Number(o.seed), stoppedAt: Number(o.stopped_at),
        copiesPerGenome: Number(o.copies_per_genome), silencedFraction: Number(o.silenced_fraction),
        outcome: o.outcome as Outcome, extinct: Number(o.extinct), saturated: Number(o.saturated),
        saturationGeneration: o.saturation_generation === "NA" ? "NA" : Number(o.saturation_generation),
        extinctionGeneration: o.extinction_generation === "NA" ? "NA" : Number(o.extinction_generation),
        entriesPerGenome: Number(o.entries_per_genome),
        maxGenomesWithRepertoire: Number(o.max_genomes_with_repertoire),
        sawNonZeroEntry: Number(o.saw_nonzero_entry), everHadRepertoire: Number(o.ever_had_repertoire),
        captures: Number(o.captures), meanDisplacement: Number(o.mean_displacement),
        maxAbsEntry: Number(o.max_abs_entry), exploratory: Number(o.exploratory),
      });
    }
  }

  let n = 0;
  let compared = 0;
  for (const phi of CONTROL_PHIS) {
    for (const ratio of controlRatios) {
      for (const seed of CONTROL_SEEDS) {
        n++;
        const key = `${phi}|${ratio.label}|${seed}`;
        let row = cached.get(key);
        if (!row) {
          row = runOne(phi, ratio, seed);
          appendFileSync(CONTROL_CSV, `${format(row)}\n`);
        }

        const want = oracle.get(`${phi}|${ratio.theta}|${ratio.sigmaS}|${seed}`);
        const where = `phi=${phi} ratio=${ratio.label} seed=${seed}`;
        if (!want) {
          failures.push(`${where}: no matching row in ${CSV_002} — the oracle does not cover this cell`);
          continue;
        }
        const diffs: string[] = [];
        const cmp = (name: string, got: number, exp: number) => {
          if (got !== exp) diffs.push(`${name} ${got} != ${exp}`);
        };
        cmp("stopped_at", row.stoppedAt, want.stoppedAt);
        cmp("copies_per_genome", row.copiesPerGenome, want.copiesPerGenome);
        cmp("silenced_fraction", row.silencedFraction, want.silencedFraction);
        cmp("extinct", row.extinct, want.extinct);
        cmp("saturated", row.saturated, want.saturated);
        cmp("entries_per_genome", row.entriesPerGenome, want.entriesPerGenome);
        cmp("saw_nonzero_entry", row.sawNonZeroEntry, want.sawNonZeroEntry);
        cmp("max_genomes_with_repertoire", row.maxGenomesWithRepertoire, want.maxGenomesWithRepertoire);
        if (diffs.length > 0) failures.push(`${where}: ${diffs.join("; ")}`);
        compared++;
        if (n % 10 === 0) console.log(`  [${n}/${total}] compared ${compared}, ${failures.length} failing`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 2 FAILED (${failures.length} of ${total} runs):`);
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 2 failed — the dial's endpoints are NOT 002's arms, so the dial does not interpolate between the two things the registration says it does. The experiment is VOID.",
    );
  }
  console.log(`  PASSED — all ${compared} endpoint runs reproduce ${CSV_002} exactly.\n`);
}

// ---------------------------------------------------------------------------
// DRIVER

const resume = process.argv.includes("--resume");

const done = resume ? readKeys(CSV) : new Set<string>();
if (resume && existsSync(CSV)) {
  console.log(`--resume: ${done.size} runs already in ${CSV}, skipping those.\n`);
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
      if (done.has(`${phi}|${ratio.label}|${seed}`)) continue;
      const t0 = Date.now();
      const row = runOne(phi, ratio, seed);
      // Appended as each run completes: a kill costs the run in flight only.
      appendFileSync(CSV, `${format(row)}\n`);
      violations.push(...checkRun(row));
      ran++;
      console.log(
        `[${String(ran).padStart(3)}/${totalRuns}] ratio=${ratio.label}${ratio.exploratory ? "*" : " "} phi=${String(phi).padEnd(5)} seed=${seed} ` +
          `stop=${String(row.stoppedAt).padStart(3)} copies/genome=${row.copiesPerGenome.toFixed(2).padStart(8)} ` +
          `sil=${row.silencedFraction.toFixed(3)} ${row.outcome.padEnd(10)} ` +
          `(${((Date.now() - t0) / 1000).toFixed(1)}s)`,
      );
    }
  }
}

console.log(
  `\nwrote ${ran} runs to ${CSV} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);

if (violations.length > 0) {
  console.error(`MANIPULATION CHECKS 3-4 FAILED (${violations.length} runs):`);
  for (const v of violations.slice(0, 20)) console.error(`  ${v}`);
  throw new Error(
    "manipulation check failed — the dial is not what the registration says it is; the CSV is written but VOID",
  );
}
console.log(`manipulation checks 3-4 PASSED on all ${ran} runs`);
