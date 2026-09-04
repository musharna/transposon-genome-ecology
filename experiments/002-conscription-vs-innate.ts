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
 * Registered question 002 — conscription versus an innate silencer.
 *
 * Registration: `docs/pre-registrations/2026-09-04-conscription-vs-innate-silencer.md`,
 * committed ALONE at `82ab678` BEFORE this file existed. Everything here — the
 * grid, the arms, the horizon, the stopping rule, the outcomes, the four
 * manipulation checks — is fixed by that document. IF THIS FILE AND THE
 * DOCUMENT DISAGREE, THE DOCUMENT IS RIGHT AND THIS FILE IS A BUG.
 *
 * Emits CSV. The figure and the pre-specified analysis are R —
 * `docs/analysis/plot-002.R`.
 *
 * WHAT IS REGISTERED IS A GRID CLAIM, NOT A TWO-SAMPLE CONTRAST
 * ------------------------------------------------------------
 * The pilot (`scripts/pilot-002-conscription.ts`, held-out seeds 1001-1006)
 * found no grid point at which both arms are viable, and the registration
 * argues that is structural rather than a gap in the grid. So the registered
 * prediction is "no grid point has both arms VIABLE", VIABLE meaning fewer than
 * half the seeds extinct at the horizon. No t-test is run here or in the R,
 * because the registration pre-specifies that reporting one would be the "rank
 * tables invite a comparison their CIs cannot support" failure.
 *
 * `sim/` IS NOT MODIFIED
 * ----------------------
 * The arm switch is composed in this file, in `sim/step.ts`'s phase order with
 * phase 2 substituted — the pattern established in
 * `scripts/explore-fossil-state.ts`. Manipulation check 1 is what makes that
 * legitimate: the composed loop running the SHIPPED `trap` must reproduce
 * `sim/step.ts`'s own `stateHash`.
 *
 * RESUMABILITY IS NOT A CONVENIENCE HERE
 * --------------------------------------
 * Two pilot runs were killed under system memory pressure with 20+ GB held by
 * other processes. Rows are appended as each run completes, and `--resume`
 * skips (arm, theta, sigmaS, seed) tuples already in the CSV, so a kill costs
 * the run in flight and nothing else.
 */

const CSV = "experiments/002-conscription-vs-innate.csv";

/** The ancestral sequence coordinate. `createWorld` founds every copy at 0. */
const ANCESTRAL_S = 0;

/** Registration: theta x sigmaS, 9 points. */
const THETAS = [0.1, 0.15, 0.2] as const;
const SIGMA_S = [0.015, 0.02, 0.03] as const;
/** Registration: seeds 1-10, disjoint from the pilot's held-out 1001-1006. */
const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);
const GENERATIONS = 600;

/**
 * Pre-specified stopping rule. A run exceeding this many copies per genome is
 * stopped and recorded as SATURATED, with the generation it happened at.
 * Saturation counts as NOT extinct for viability. Half of S, fixed in advance so
 * it cannot be adjusted after seeing results.
 */
const SATURATION_COPIES_PER_GENOME = 1500;

/** Manipulation check 1's horizon. Short enough that neither arm has died. */
const CONTROL_GENERATIONS = 80;

/** Registration: everything else pinned, at the pilot's values. */
const BASE: Partial<Params> = {
  N: 300, S: 3000, c: 0.02, r0: 0.2, rMax: 1, sigmaR: 0.05,
  v: 0.005, a: 0.0004, b: 0.00001, d: 0.0005, dTol: 0.002, t: 0,
  beta: 0.005, pDom: 0, wDom: 0.01, sexual: true, silencingOn: true,
};

// ---------------------------------------------------------------------------
// THE ARMS

/**
 * Is `value` already within theta of some entry? The two-neighbour argument in
 * `sim/silencing.ts` applies unchanged: the nearest entry is one of the two at
 * the insertion point.
 *
 * ⚠️ THIS, NOT `isSilenced`, IS THE FAITHFUL TRANSLATION OF `trap.ts`'s NO-OP
 * GUARD, and the registration records why at length. `trap.ts` skips a copy that
 * is already silenced, under the comment "capturing again would be a no-op" —
 * sound THERE because the value it inserts IS `copy.s`, so "already covered" and
 * "already silenced" are one test. In arm B the value inserted is 0, so a copy
 * that has diverged past theta is NOT silenced and would still insert a
 * duplicate 0: measured at 11,045 entries per genome by generation 300 and
 * 1.09 GB resident, which killed the first pilot. Asking whether the VALUE ABOUT
 * TO BE INSERTED is already covered bounds arm B's repertoire to one entry and
 * changes no semantics, since `isSilenced` asks only whether SOME entry is
 * within theta.
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
 * Arm B — innate. The repertoire entry is the ancestral 0 rather than the
 * capturing copy's current `s`. Inserts on the SAME EVENT as arm A — a
 * non-domesticated copy in a cluster site, past the same `(1 - t)` gate,
 * evaluated in the same genome and copy order — so capture rate is matched by
 * construction. Without that matching this is guard 2's silencing knockout in
 * disguise, and guard 2 already answers that question.
 */
function trapInnate(world: World): void {
  const p = world.params;
  if (!p.silencingOn) return;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      if (!isClusterSite(copy.site, p)) continue;
      if (valueCovered(ANCESTRAL_S, genome, p)) continue;
      if (world.rng.next() >= 1 - p.t) continue;
      const at = repertoireInsertionIndex(genome.repertoire, ANCESTRAL_S);
      genome.repertoire.splice(at, 0, ANCESTRAL_S);
    }
  }
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

const ARMS = [
  { name: "A-conscription", phase: trap },
  { name: "B-innate", phase: trapInnate },
] as const;

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 1 — the composed loop IS the shipped model.
//
// Runs at EVERY grid point and EVERY seed the experiment uses, because whether
// the loops agree is a property of the parameters as much as of the code.
//
// ⚠️ THE HASH COMPARISON CARRIES ITS OWN POSITIVE CONTROL. Two worlds that have
// both gone extinct hash identically no matter what phase ran, so hash equality
// alone cannot tell "the composed loop is the shipped model" from "there is
// nothing left to disagree about". The registration requires this control at a
// horizon short enough that neither arm has died, so non-extinction at
// CONTROL_GENERATIONS is asserted FIRST and a failure of it voids the check
// rather than passing it.

function manipulationCheck1(): void {
  console.log(
    `MANIPULATION CHECK 1 — composed loop vs sim/step.ts, ${THETAS.length * SIGMA_S.length * SEEDS.length} configurations at generation ${CONTROL_GENERATIONS}`,
  );
  const failures: string[] = [];
  let checked = 0;
  let minCopies = Infinity;

  for (const theta of THETAS) {
    for (const sigmaS of SIGMA_S) {
      for (const seed of SEEDS) {
        const composed = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
        const shipped = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
        for (let g = 0; g < CONTROL_GENERATIONS; g++) stepWith(composed, trap);
        for (let g = 0; g < CONTROL_GENERATIONS; g++) step(shipped);

        const live = observe(composed).totalCopies;
        minCopies = Math.min(minCopies, live);
        const where = `theta=${theta} sigmaS=${sigmaS} seed=${seed}`;
        // The positive control, asserted BEFORE the hash comparison it protects.
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
    }
  }

  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 1 FAILED (${failures.length} configurations):`);
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 1 failed — the composed loop is not the shipped model, so the arms are not what the registration says they are. The experiment is VOID.",
    );
  }
  console.log(
    `  PASSED on all ${checked} configurations; smallest surviving population ${minCopies} copies, so no comparison was vacuous.\n`,
  );
}

// ---------------------------------------------------------------------------
// ONE RUN

interface Row {
  arm: string;
  theta: number;
  sigmaS: number;
  kStar: number;
  seed: number;
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  extinct: number;
  saturated: number;
  saturationGeneration: number | "NA";
  extinctionGeneration: number | "NA";
  entriesPerGenome: number;
  maxGenomesWithRepertoire: number;
  sawNonZeroEntry: number;
  everHadRepertoire: number;
}

function runOne(
  armName: string,
  phase: TrapPhase,
  theta: number,
  sigmaS: number,
  seed: number,
): Row {
  const world = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
  const saturationTotal = SATURATION_COPIES_PER_GENOME * (BASE.N as number);

  let saturationGeneration: number | "NA" = "NA";
  let extinctionGeneration: number | "NA" = "NA";
  let maxGenomesWithRepertoire = 0;
  let sawNonZeroEntry = false;
  let stoppedAt = GENERATIONS;

  for (let g = 0; g < GENERATIONS; g++) {
    stepWith(world, phase);

    // Cheap per-generation instrumentation. `observe` recomputes silencing for
    // every copy, which is the expensive part, so it is called only at the stop.
    let total = 0;
    let withRepertoire = 0;
    for (const genome of world.genomes) {
      total += genome.copies.length;
      if (genome.repertoire.length > 0) {
        withRepertoire++;
        // Arm A: stop scanning once a non-ancestral entry is seen, it is proved.
        // Arm B: keep scanning, because every entry being exactly 0 is the claim.
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

  return {
    arm: armName,
    theta,
    sigmaS,
    kStar: Math.round((theta / sigmaS) ** 2),
    seed,
    stoppedAt,
    copiesPerGenome: s.totalCopies / world.genomes.length,
    silencedFraction: s.totalCopies === 0 ? 0 : s.silencedCopies / s.totalCopies,
    extinct: s.totalCopies === 0 ? 1 : 0,
    saturated: saturationGeneration === "NA" ? 0 : 1,
    saturationGeneration,
    extinctionGeneration,
    entriesPerGenome: entries / world.genomes.length,
    maxGenomesWithRepertoire,
    sawNonZeroEntry: sawNonZeroEntry ? 1 : 0,
    everHadRepertoire: maxGenomesWithRepertoire > 0 ? 1 : 0,
  };
}

/**
 * MANIPULATION CHECKS 2, 3 and 4 — per run, so a violation names the run that
 * produced it and the experiment stops instead of writing a void CSV.
 *
 * 4 is the one that stops a null being manufactured by nothing happening: if no
 * genome ever captures anything, both arms are the silencing knockout and the
 * comparison is empty. 2 and 3 are the positive control for the arm switch
 * itself — the pilot confirms they separate (arm A entries 0.0267, arm B 0).
 */
function checkRun(row: Row): string[] {
  const where = `${row.arm} theta=${row.theta} sigmaS=${row.sigmaS} seed=${row.seed}`;
  const violations: string[] = [];

  // Check 4, first: it is the precondition the other two are read against.
  if (row.everHadRepertoire === 0) {
    violations.push(`${where}: no genome ever held a repertoire (check 4)`);
  }
  if (row.arm.startsWith("A") && row.everHadRepertoire === 1 && row.sawNonZeroEntry === 0) {
    violations.push(
      `${where}: formed a repertoire but every entry was the ancestral 0 — arm A is not tracking (check 2)`,
    );
  }
  if (row.arm.startsWith("B") && row.sawNonZeroEntry === 1) {
    violations.push(
      `${where}: an entry differed from 0 — arm B is not innate (check 3)`,
    );
  }
  return violations;
}

// ---------------------------------------------------------------------------
// DRIVER

const HEADER = [
  "arm", "theta", "sigma_s", "k_star", "seed", "stopped_at",
  "copies_per_genome", "silenced_fraction", "extinct", "saturated",
  "saturation_generation", "extinction_generation", "entries_per_genome",
  "max_genomes_with_repertoire", "saw_nonzero_entry", "ever_had_repertoire",
].join(",");

const format = (r: Row) =>
  [
    r.arm, r.theta, r.sigmaS, r.kStar, r.seed, r.stoppedAt,
    r.copiesPerGenome, r.silencedFraction, r.extinct, r.saturated,
    r.saturationGeneration, r.extinctionGeneration, r.entriesPerGenome,
    r.maxGenomesWithRepertoire, r.sawNonZeroEntry, r.everHadRepertoire,
  ].join(",");

const resume = process.argv.includes("--resume");
const done = new Set<string>();
if (resume && existsSync(CSV)) {
  const lines = readFileSync(CSV, "utf8").trim().split("\n").slice(1);
  for (const line of lines) {
    const [arm, theta, sigmaS, , seed] = line.split(",");
    done.add(`${arm}|${theta}|${sigmaS}|${seed}`);
  }
  console.log(`--resume: ${done.size} runs already in ${CSV}, skipping those.\n`);
} else {
  writeFileSync(CSV, `${HEADER}\n`);
}

manipulationCheck1();

const started = Date.now();
const violations: string[] = [];
let ran = 0;
const totalRuns = THETAS.length * SIGMA_S.length * ARMS.length * SEEDS.length;

for (const theta of THETAS) {
  for (const sigmaS of SIGMA_S) {
    for (const { name, phase } of ARMS) {
      for (const seed of SEEDS) {
        if (done.has(`${name}|${theta}|${sigmaS}|${seed}`)) continue;
        const t0 = Date.now();
        const row = runOne(name, phase, theta, sigmaS, seed);
        // Appended as each run completes: a kill costs the run in flight only.
        appendFileSync(CSV, `${format(row)}\n`);
        violations.push(...checkRun(row));
        ran++;
        console.log(
          `[${String(ran).padStart(3)}/${totalRuns}] ${name} theta=${theta} sigmaS=${sigmaS} seed=${String(seed).padStart(2)} ` +
            `k*=${String(row.kStar).padStart(4)} stop=${String(row.stoppedAt).padStart(3)} ` +
            `copies/genome=${row.copiesPerGenome.toFixed(2).padStart(8)} sil=${row.silencedFraction.toFixed(3)} ` +
            `${row.extinct ? "EXTINCT" : row.saturated ? "SATURATED" : "alive"} ` +
            `(${((Date.now() - t0) / 1000).toFixed(1)}s)`,
        );
      }
    }
  }
}

console.log(
  `\nwrote ${ran} runs to ${CSV} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);

if (violations.length > 0) {
  console.error(`MANIPULATION CHECKS 2-4 FAILED (${violations.length} runs):`);
  for (const v of violations.slice(0, 20)) console.error(`  ${v}`);
  throw new Error(
    "manipulation check failed — the arms are not what the registration says they are; the CSV is written but VOID",
  );
}
console.log(`manipulation checks 2-4 PASSED on all ${ran} runs`);
