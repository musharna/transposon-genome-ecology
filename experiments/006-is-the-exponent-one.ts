/**
 * QUESTION 006 — is the exponent one?
 * Registered: `docs/pre-registrations/2026-09-11-is-the-exponent-one.md`.
 *
 * 005 established that `t_sat` is not a power law in `phi` and that the exponent
 * you measure is a property of the window you fit in. This does not refit it. It
 * scores three frozen candidates — a free-exponent power law, a MECHANISM whose
 * exponent is fixed at one by derivation, and a quadratic in log-log — on cells
 * below `phi = 0.002` that no experiment in this project has ever run.
 *
 * ---------------------------------------------------------------------------
 * RUN IT IN PHASES. Phase 2's horizon is computed FROM Phase 1's output, which
 * is the registration's repair to 005's circular horizon sizing, so the phases
 * cannot run in one pass.
 *
 *     npx tsx experiments/006-is-the-exponent-one.ts --phase 1   # ~005-scale
 *     npx tsx experiments/006-is-the-exponent-one.ts --phase 2   # hours
 *     npx tsx experiments/006-is-the-exponent-one.ts --analyse   # seconds
 *
 * `--phase 1` may be sharded by ratio across three processes, as 005 was:
 *
 *     npx tsx experiments/006-is-the-exponent-one.ts --phase 1 --shard 2.00
 *
 * ⚠️ EVERY PHASE OVERWRITES ITS CSV. Do not run this to check a figure.
 * ---------------------------------------------------------------------------
 */
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
import {
  fitMechanism,
  fitPowerLaw,
  fitQuadratic,
  horizonFor,
  localExponent,
  predict,
  selectForm,
  type FormName,
  type Point,
} from "./006-forms.js";

const PHASE1_CSV = "experiments/006-phase1.csv";
const PHASE2_CSV = "experiments/006-phase2.csv";
const CONTROL_CSV = "experiments/006-reproduction-control.csv";
const CSV_005 = "experiments/005-delay-divergence.csv";
const shardPath = (p: string, label: string) =>
  p.replace(/\.csv$/, `.shard-${label}.csv`);

// ---------------------------------------------------------------------------
// THE GRID, as registered. Nothing below may be edited without re-registering.

const RATIOS = [
  { label: "2.00", theta: 0.1, sigmaS: 0.05 },
  { label: "3.33", theta: 0.1, sigmaS: 0.03 },
  { label: "5.00", theta: 0.1, sigmaS: 0.02 },
] as const;
type Ratio = (typeof RATIOS)[number];

/** Phase 1 interleaves 005's grid rather than repeating it. */
const PHASE1_PHIS = [0.0028, 0.0057, 0.008, 0.016, 0.032] as const;

/** Phase 2, column A: unconditional. Column B: gated, see `columnBRuns`. */
const PHASE2_A = 0.001;
const PHASE2_B = 0.0005;

/**
 * COLUMN B'S GATE, fixed in the registration before any data existed: it runs
 * iff Phase 1's SELECTED form predicts `t_sat(0.0005) <= 30000` at ratio 5.00,
 * so that a horizon at 2.5x the prediction fits the compute budget.
 */
const COLUMN_B_MAX_PREDICTED = 30_000;
const COLUMN_B_RATIO = "5.00";

const SEEDS = Array.from({ length: 10 }, (_, i) => 6001 + i);

/** 005's own seeds and cells, for the reproduction control. */
const CONTROL_SEEDS = Array.from({ length: 10 }, (_, i) => 4001 + i);
const CONTROL_PHIS = [0.002, 0.0453] as const;

const SATURATION_COPIES_PER_GENOME = 1500;
const CONTROL_GENERATIONS = 80;

/** 005's horizon rule, for Phase 1's in-range cells only. */
const P1_HEADROOM = 1.75;
const HORIZON_FLOOR = 1000;
const HORIZON_STEP = 500;

/** Byte-identical to 005's. Check 2 compares against 005's committed CSV. */
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

// ---------------------------------------------------------------------------
// THE DIAL — 003's, 004's and 005's, unchanged. See 005 for the bit-exactness
// argument at phi = 0, which manipulation check 1 depends on.

function valueCovered(value: number, genome: Genome, p: Params): boolean {
  const rep = genome.repertoire;
  const i = repertoireInsertionIndex(rep, value);
  if (i < rep.length && Math.abs(value - rep[i]!) <= p.theta) return true;
  if (i > 0 && Math.abs(value - rep[i - 1]!) <= p.theta) return true;
  return false;
}

type TrapPhase = (world: World) => void;

interface DialProbe {
  captures: number;
  absSSum: number;
  maxAbsEntry: number;
}
const newProbe = (): DialProbe => ({
  captures: 0,
  absSSum: 0,
  maxAbsEntry: 0,
});

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
// RUNNING ONE CELL

interface Row {
  phi: number;
  ratio: string;
  theta: number;
  sigmaS: number;
  seed: number;
  horizon: number;
  /** Which candidate's prediction the horizon came from. Check 4. */
  horizonFrom: string;
  horizonPredicted: number;
  stoppedAt: number;
  copiesPerGenome: number;
  silencedFraction: number;
  extinct: number;
  saturated: number;
  saturationGeneration: number | "NA";
  entriesPerGenome: number;
  captures: number;
  meanAbsS: number;
  maxAbsEntry: number;
  hash: string;
}

function runOne(
  phi: number,
  ratio: Ratio,
  seed: number,
  horizon: number,
  horizonFrom: string,
  horizonPredicted: number,
): Row {
  const { theta, sigmaS } = ratio;
  const world = createWorld(defaultParams({ ...BASE, theta, sigmaS, seed }));
  const probe = newProbe();
  const phase = trapAtFidelity(phi, probe);
  const saturationTotal = SATURATION_COPIES_PER_GENOME * (BASE.N as number);

  let saturationGeneration: number | "NA" = "NA";
  let stoppedAt = horizon;

  for (let g = 0; g < horizon; g++) {
    stepWith(world, phase);
    let total = 0;
    for (const genome of world.genomes) total += genome.copies.length;
    if (total > saturationTotal) {
      saturationGeneration = world.generation;
      stoppedAt = world.generation;
      break;
    }
    if (total === 0) {
      stoppedAt = world.generation;
      break;
    }
  }

  const s = observe(world);
  let entries = 0;
  for (const genome of world.genomes) entries += genome.repertoire.length;
  return {
    phi,
    ratio: ratio.label,
    theta,
    sigmaS,
    seed,
    horizon,
    horizonFrom,
    horizonPredicted,
    stoppedAt,
    copiesPerGenome: s.totalCopies / world.genomes.length,
    silencedFraction:
      s.totalCopies === 0 ? 0 : s.silencedCopies / s.totalCopies,
    extinct: s.totalCopies === 0 ? 1 : 0,
    saturated: saturationGeneration === "NA" ? 0 : 1,
    saturationGeneration,
    entriesPerGenome: entries / world.genomes.length,
    captures: probe.captures,
    meanAbsS: probe.captures === 0 ? 0 : probe.absSSum / probe.captures,
    maxAbsEntry: probe.maxAbsEntry,
    hash: stateHash(world),
  };
}

const HEADER = [
  "phi",
  "ratio",
  "theta",
  "sigma_s",
  "seed",
  "horizon",
  "horizon_from",
  "horizon_predicted",
  "stopped_at",
  "copies_per_genome",
  "silenced_fraction",
  "extinct",
  "saturated",
  "saturation_generation",
  "entries_per_genome",
  "captures",
  "mean_abs_s",
  "max_abs_entry",
  "hash",
].join(",");

const format = (r: Row) =>
  [
    r.phi,
    r.ratio,
    r.theta,
    r.sigmaS,
    r.seed,
    r.horizon,
    r.horizonFrom,
    r.horizonPredicted.toFixed(2),
    r.stoppedAt,
    r.copiesPerGenome.toFixed(6),
    r.silencedFraction.toFixed(6),
    r.extinct,
    r.saturated,
    r.saturationGeneration,
    r.entriesPerGenome.toFixed(6),
    r.captures,
    r.meanAbsS.toFixed(6),
    r.maxAbsEntry.toFixed(6),
    r.hash,
  ].join(",");

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 1 — the composed loop IS the shipped model.
//
// The hash comparison carries its own positive control: two extinct worlds hash
// identically whatever phase ran, so non-extinction is asserted FIRST and its
// failure VOIDS the check rather than passing it.

function manipulationCheck1(): void {
  console.log(
    `MANIPULATION CHECK 1 — composed loop at phi=0 vs sim/step.ts at generation ${CONTROL_GENERATIONS}`,
  );
  const failures: string[] = [];
  let checked = 0;
  let minCopies = Infinity;
  for (const r of RATIOS) {
    for (const seed of [...SEEDS, ...CONTROL_SEEDS]) {
      const opts = { ...BASE, theta: r.theta, sigmaS: r.sigmaS, seed };
      const composed = createWorld(defaultParams(opts));
      const shipped = createWorld(defaultParams(opts));
      const phase = trapAtFidelity(0, newProbe());
      for (let g = 0; g < CONTROL_GENERATIONS; g++) stepWith(composed, phase);
      for (let g = 0; g < CONTROL_GENERATIONS; g++) step(shipped);
      const live = observe(composed).totalCopies;
      minCopies = Math.min(minCopies, live);
      const where = `ratio=${r.label} seed=${seed}`;
      if (live === 0) {
        failures.push(`${where}: extinct — the comparison would be vacuous`);
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
  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 1 FAILED (${failures.length}):`);
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 1 failed — the composed loop is not the shipped model. The experiment is VOID.",
    );
  }
  console.log(
    `  PASSED on ${checked} configurations; smallest surviving population ${minCopies} copies, so nothing was vacuous.\n`,
  );
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 2 — this runner reproduces 005 EXACTLY.

interface Cell005 {
  saturationGeneration: string;
  hash: string;
  horizon: number;
}

function load005(): Map<string, Cell005> {
  if (!existsSync(CSV_005)) {
    throw new Error(`manipulation check 2 cannot run: ${CSV_005} is missing`);
  }
  const lines = readFileSync(CSV_005, "utf8").trim().split("\n");
  const cols = lines[0]!.split(",");
  const idx = (n: string) => {
    const i = cols.indexOf(n);
    if (i < 0) throw new Error(`${CSV_005} has no column ${n}`);
    return i;
  };
  const out = new Map<string, Cell005>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    out.set(`${f[idx("phi")]}|${f[idx("ratio")]}|${f[idx("seed")]}`, {
      saturationGeneration: f[idx("saturation_generation")]!,
      hash: f[idx("hash")]!,
      horizon: Number(f[idx("horizon")]),
    });
  }
  return out;
}

function manipulationCheck2(): void {
  const oracle = load005();
  console.log(
    `MANIPULATION CHECK 2 — re-running 005's own cells at 005's own seeds must reproduce ${CSV_005} exactly`,
  );
  const failures: string[] = [];
  let checked = 0;
  const rows: Row[] = [];
  for (const phi of CONTROL_PHIS) {
    for (const r of RATIOS) {
      for (const seed of CONTROL_SEEDS) {
        const key = `${phi}|${r.label}|${seed}`;
        const want = oracle.get(key);
        if (!want) {
          failures.push(`${key}: absent from ${CSV_005}`);
          continue;
        }
        const got = runOne(phi, r, seed, want.horizon, "005-oracle", 0);
        rows.push(got);
        if (String(got.saturationGeneration) !== want.saturationGeneration) {
          failures.push(
            `${key}: t_sat ${got.saturationGeneration} != ${want.saturationGeneration}`,
          );
        } else if (got.hash !== want.hash) {
          failures.push(`${key}: hash ${got.hash} != ${want.hash}`);
        }
        checked++;
      }
    }
  }
  writeFileSync(CONTROL_CSV, `${HEADER}\n`);
  for (const r of rows) appendFileSync(CONTROL_CSV, `${format(r)}\n`);

  if (failures.length > 0) {
    console.error(`MANIPULATION CHECK 2 FAILED (${failures.length}):`);
    for (const f of failures.slice(0, 10)) console.error(`  ${f}`);
    throw new Error(
      "manipulation check 2 failed — this runner is not the model 005 ran. The experiment is VOID and the model freeze is indicted.",
    );
  }
  console.log(`  PASSED on all ${checked} cells, t_sat and state hash both.\n`);
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 5 — grid integrity.

/**
 * Grid integrity: the EXACT registered key set, not a row count.
 *
 * ⚠️ A COUNT AND A DUPLICATE SCAN ARE NOT ENOUGH, and that was demonstrated
 * rather than reasoned about. Mutation table row 1 changes one Phase 2 cell's
 * `phi` to 0.002. That introduces no duplicate — 0.002 is not a Phase 2 cell —
 * and changes no count, so the first version of this check PASSED it, and the
 * experiment would have scored a cell it never ran. The observed key set is now
 * compared against the expected one in both directions.
 */
function manipulationCheck5(
  rows: Row[],
  expectedKeys: Set<string>,
  what: string,
): void {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const r of rows) {
    const k = `${r.phi}|${r.ratio}|${r.seed}`;
    if (seen.has(k)) dups.push(k);
    seen.add(k);
  }
  const missing = [...expectedKeys].filter((k) => !seen.has(k));
  const unexpected = [...seen].filter((k) => !expectedKeys.has(k));
  if (dups.length > 0 || missing.length > 0 || unexpected.length > 0) {
    console.error(`MANIPULATION CHECK 5 FAILED for ${what}:`);
    for (const d of dups.slice(0, 5)) console.error(`  duplicated: ${d}`);
    for (const m of missing.slice(0, 5)) console.error(`  MISSING: ${m}`);
    for (const u of unexpected.slice(0, 5)) console.error(`  UNEXPECTED: ${u}`);
    throw new Error(
      `manipulation check 5 failed for ${what}: ${dups.length} duplicated, ${missing.length} missing, ${unexpected.length} unexpected. The experiment is VOID.`,
    );
  }
  console.log(
    `MANIPULATION CHECK 5 — ${what}: ${rows.length} rows, exactly the registered (ratio, phi, seed) set. PASSED\n`,
  );
}

const keysFor = (
  phis: readonly number[],
  ratios: readonly Ratio[],
): Set<string> => {
  const out = new Set<string>();
  for (const phi of phis)
    for (const r of ratios)
      for (const seed of SEEDS) out.add(`${phi}|${r.label}|${seed}`);
  return out;
};

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 3 — no censoring, Phase 2 only.

function manipulationCheck3(rows: Row[]): Row[] {
  const censored = rows.filter((r) => r.saturated === 0);
  console.log(`MANIPULATION CHECK 3 — censoring in Phase 2`);

  // ⚠️ THE FLAG IS NOT THE EVIDENCE. Mutation table row 3 records a censored
  // run's t_sat as its horizon, and sets the saturated flag with it — so a
  // check that reads only `saturated` passes that mutation. A run that
  // "saturated" AT its horizon did not saturate, it ran out. Checked against
  // the horizon itself, independently of the flag.
  const atHorizon = rows.filter(
    (r) => r.saturated === 1 && Number(r.saturationGeneration) >= r.horizon,
  );
  if (atHorizon.length > 0) {
    console.error(
      `  ${atHorizon.length} runs are flagged saturated with t_sat AT OR PAST their horizon:`,
    );
    for (const c of atHorizon.slice(0, 5)) {
      console.error(
        `    phi=${c.phi} ratio=${c.ratio} seed=${c.seed}: t_sat ${c.saturationGeneration}, horizon ${c.horizon}`,
      );
    }
    throw new Error(
      "manipulation check 3 failed — a censored run is recorded as saturated. The experiment is VOID.",
    );
  }
  if (censored.length > 0) {
    console.error(
      `  ⚠️ ${censored.length} of ${rows.length} runs did NOT saturate inside their horizon.`,
    );
    for (const c of censored.slice(0, 10)) {
      console.error(
        `    phi=${c.phi} ratio=${c.ratio} seed=${c.seed}: horizon ${c.horizon}, stopped at ${c.stoppedAt}`,
      );
    }
    console.error(
      `  These are EXCLUDED from every t_sat statistic and reported as censored.`,
    );
  } else {
    console.log(
      `  PASSED — all ${rows.length} runs saturated inside horizon.\n`,
    );
  }
  return rows.filter((r) => r.saturated === 1);
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECK 4 — horizon provenance.

function manipulationCheck4(rows: Row[]): void {
  const from = new Set(rows.map((r) => r.horizonFrom));
  console.log(`MANIPULATION CHECK 4 — horizon provenance, recorded per row`);
  for (const r of rows.slice(0, 0)) void r;
  const missing = rows.filter((r) => !r.horizonFrom || r.horizonFrom === "");
  if (missing.length > 0) {
    throw new Error(
      `manipulation check 4 failed: ${missing.length} rows carry no horizon provenance. The experiment is VOID.`,
    );
  }
  console.log(
    `  every row names the candidate that sized it: ${[...from].join(", ")}`,
  );
  if (from.size === 1 && from.has("mechanism")) {
    console.log(
      `  ⚠️ THE MAX RULE DID NOT BITE. Every horizon came from the mechanism, so\n` +
        `     "2.5x the largest candidate" and "2.5x the mechanism" were the same\n` +
        `     number here. The registration predicted this and requires it be said.\n`,
    );
  } else {
    console.log(`  the max was NOT always the mechanism — the rule bit.\n`);
  }
}

// ---------------------------------------------------------------------------
// CELL MEANS AND THE VERDICTS

const cellMeans = (rows: Row[], ratio: string): Point[] => {
  const by = new Map<number, number[]>();
  for (const r of rows) {
    if (r.ratio !== ratio || r.saturated !== 1) continue;
    const t = Number(r.saturationGeneration);
    by.set(r.phi, [...(by.get(r.phi) ?? []), t]);
  }
  return [...by.entries()]
    .map(([phi, ts]) => ({ phi, t: ts.reduce((a, b) => a + b, 0) / ts.length }))
    .sort((a, b) => a.phi - b.phi);
};

function readRows(path: string): Row[] {
  if (!existsSync(path))
    throw new Error(`missing ${path} — run that phase first`);
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const cols = lines[0]!.split(",");
  const at = (f: string[], n: string) => f[cols.indexOf(n)]!;
  return lines.slice(1).map((line) => {
    const f = line.split(",");
    return {
      phi: Number(at(f, "phi")),
      ratio: at(f, "ratio"),
      theta: Number(at(f, "theta")),
      sigmaS: Number(at(f, "sigma_s")),
      seed: Number(at(f, "seed")),
      horizon: Number(at(f, "horizon")),
      horizonFrom: at(f, "horizon_from"),
      horizonPredicted: Number(at(f, "horizon_predicted")),
      stoppedAt: Number(at(f, "stopped_at")),
      copiesPerGenome: Number(at(f, "copies_per_genome")),
      silencedFraction: Number(at(f, "silenced_fraction")),
      extinct: Number(at(f, "extinct")),
      saturated: Number(at(f, "saturated")),
      saturationGeneration:
        at(f, "saturation_generation") === "NA"
          ? "NA"
          : Number(at(f, "saturation_generation")),
      entriesPerGenome: Number(at(f, "entries_per_genome")),
      captures: Number(at(f, "captures")),
      meanAbsS: Number(at(f, "mean_abs_s")),
      maxAbsEntry: Number(at(f, "max_abs_entry")),
      hash: at(f, "hash"),
    } satisfies Row;
  });
}

/** 005's five in-range cells, read from its committed CSV. */
function inRange005(ratio: string): Point[] {
  const lines = readFileSync(CSV_005, "utf8").trim().split("\n");
  const cols = lines[0]!.split(",");
  const at = (f: string[], n: string) => f[cols.indexOf(n)]!;
  const by = new Map<number, number[]>();
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    if (at(f, "ratio") !== ratio || at(f, "saturated") !== "1") continue;
    const phi = Number(at(f, "phi"));
    by.set(phi, [
      ...(by.get(phi) ?? []),
      Number(at(f, "saturation_generation")),
    ]);
  }
  return [...by.entries()]
    .map(([phi, ts]) => ({ phi, t: ts.reduce((a, b) => a + b, 0) / ts.length }))
    .sort((a, b) => a.phi - b.phi);
}

/**
 * MUTATION TABLE ROW 5 — "Phase 2 cells included in the candidate fits".
 *
 * The whole design rests on Phase 2 being OUT OF SAMPLE: the candidates are
 * fitted in-range and then scored on cells they never saw. If a Phase 2 cell
 * leaks into the fit, every candidate improves, the mechanism's advantage
 * evaporates into a curve-fitting exercise, and nothing announces it — the
 * numbers just get better. Nothing else in this runner would notice, so this is
 * asserted at every point a fit is taken.
 */
const PHASE2_PHIS: readonly number[] = [PHASE2_A, PHASE2_B];

function assertInRange(pts: Point[], where: string): Point[] {
  const leaked = pts.filter((p) =>
    PHASE2_PHIS.some((q) => Math.abs(p.phi - q) < 1e-12),
  );
  if (leaked.length > 0) {
    throw new Error(
      `analysis assertion failed at ${where}: ${leaked
        .map((l) => l.phi)
        .join(", ")} is a Phase 2 cell and must never be fitted. ` +
        `Phase 2 is scored OUT OF SAMPLE. The analysis is VOID.`,
    );
  }
  return pts;
}

// ---------------------------------------------------------------------------
// PHASES

function runPhase1(shard?: string): void {
  manipulationCheck1();
  manipulationCheck2();

  const out = shard ? shardPath(PHASE1_CSV, shard) : PHASE1_CSV;
  writeFileSync(out, `${HEADER}\n`);
  const ratios = shard ? RATIOS.filter((r) => r.label === shard) : RATIOS;
  const rows: Row[] = [];

  for (const r of ratios) {
    const base = inRange005(r.label);
    const pl = fitPowerLaw(base);
    for (const phi of PHASE1_PHIS) {
      // Phase 1 is in-range, so it uses 005's own horizon rule, as registered.
      const pred = predict(pl, phi);
      const horizon = Math.max(
        HORIZON_FLOOR,
        Math.ceil((P1_HEADROOM * pred) / HORIZON_STEP) * HORIZON_STEP,
      );
      for (const seed of SEEDS) {
        const row = runOne(phi, r, seed, horizon, "005-power-law", pred);
        rows.push(row);
        appendFileSync(out, `${format(row)}\n`);
        console.log(
          `  phi=${phi} ratio=${r.label} seed=${seed}: t_sat=${row.saturationGeneration} (horizon ${horizon})`,
        );
      }
    }
  }
  manipulationCheck5(rows, keysFor(PHASE1_PHIS, ratios), "Phase 1");
  console.log(`Phase 1 written to ${out}`);
}

function columnBRuns(inRange: Point[]): { runs: boolean; predicted: number } {
  const sel = selectForm(inRange);
  const fit = {
    "power-law": fitPowerLaw,
    mechanism: fitMechanism,
    quadratic: fitQuadratic,
  }[sel.winner](inRange);
  const predicted = predict(fit, PHASE2_B);
  return { runs: predicted <= COLUMN_B_MAX_PREDICTED, predicted };
}

/** Which candidate supplies the largest prediction, and what it is. */
function horizonSource(phi: number, inRange: Point[]): [FormName, number] {
  const fits: [FormName, number][] = [
    ["power-law", predict(fitPowerLaw(inRange), phi)],
    ["mechanism", predict(fitMechanism(inRange), phi)],
    ["quadratic", predict(fitQuadratic(inRange), phi)],
  ];
  return fits.reduce((a, b) => (b[1] > a[1] ? b : a));
}

function runPhase2(): void {
  manipulationCheck1();

  const p1 = readRows(PHASE1_CSV);
  writeFileSync(PHASE2_CSV, `${HEADER}\n`);
  const rows: Row[] = [];

  for (const r of RATIOS) {
    const inRange = assertInRange(
      [...inRange005(r.label), ...cellMeans(p1, r.label)].sort(
        (a, b) => a.phi - b.phi,
      ),
      `Phase 2 horizon fit, ratio ${r.label}`,
    );
    const sel = selectForm(inRange);
    console.log(
      `ratio ${r.label}: selected form = ${sel.winner} ` +
        `(LOO MARE ${Object.entries(sel.scores)
          .map(([k, v]) => `${k} ${(100 * v).toFixed(2)}%`)
          .join(", ")})`,
    );

    const gate = columnBRuns(inRange);
    const phis: number[] = [PHASE2_A];
    if (r.label === COLUMN_B_RATIO && !gate.runs) {
      console.log(
        `  ⚠️ COLUMN B GATE FAILED at ratio ${COLUMN_B_RATIO}: selected form predicts ` +
          `t_sat(${PHASE2_B}) = ${gate.predicted.toFixed(0)} > ${COLUMN_B_MAX_PREDICTED}. ` +
          `Column B is NOT run, as registered, and the primary is scored on ${PHASE2_A} alone.`,
      );
    } else {
      phis.push(PHASE2_B);
    }

    for (const phi of phis) {
      const [from, pred] = horizonSource(phi, inRange);
      const horizon = Math.ceil(horizonFor(phi, inRange));
      for (const seed of SEEDS) {
        const row = runOne(phi, r, seed, horizon, from, pred);
        rows.push(row);
        appendFileSync(PHASE2_CSV, `${format(row)}\n`);
        console.log(
          `  phi=${phi} ratio=${r.label} seed=${seed}: t_sat=${row.saturationGeneration} (horizon ${horizon} from ${from})`,
        );
      }
    }
  }
  manipulationCheck4(rows);
  manipulationCheck3(rows);
  console.log(`Phase 2 written to ${PHASE2_CSV}`);
}

function analyse(): void {
  const p1 = readRows(PHASE1_CSV);
  const p2 = readRows(PHASE2_CSV);
  manipulationCheck4(p2);
  const usable = manipulationCheck3(p2);

  console.log("\n=== PRIMARY — the local exponent converges to 1 ===\n");
  let inBand = 0;
  let outLow = 0;
  let outHigh = 0;

  for (const r of RATIOS) {
    const all = [
      ...inRange005(r.label),
      ...cellMeans(p1, r.label),
      ...cellMeans(usable, r.label),
    ].sort((a, b) => a.phi - b.phi);
    const locals = all
      .slice(0, -1)
      .map((_, i) => ({
        lo: all[i]!.phi,
        hi: all[i + 1]!.phi,
        a: localExponent(all[i]!, all[i + 1]!),
      }));
    console.log(
      `  ratio ${r.label}: ` +
        locals.map((l) => `[${l.lo}→${l.hi}] ${l.a.toFixed(3)}`).join("  "),
    );
    const deepest = locals[0]!;
    if (deepest.a < 0.95) outLow++;
    else if (deepest.a > 1.05) outHigh++;
    else inBand++;
    console.log(
      `    deepest interval [${deepest.lo}→${deepest.hi}]: a_local = ${deepest.a.toFixed(4)} ` +
        `→ ${deepest.a >= 0.95 && deepest.a <= 1.05 ? "IN" : "OUT OF"} [0.95, 1.05]`,
    );
  }
  const verdict =
    outLow + outHigh >= 2
      ? `FALSIFIED (${outLow} below 0.95, ${outHigh} above 1.05)`
      : `HELD (${inBand} of 3 ratios in band)`;
  console.log(`\n  PRIMARY: ${verdict}`);

  console.log("\n=== SECONDARY 1 — out-of-sample form selection ===\n");
  for (const r of RATIOS) {
    const inRange = assertInRange(
      [...inRange005(r.label), ...cellMeans(p1, r.label)].sort(
        (a, b) => a.phi - b.phi,
      ),
      `SECONDARY 1 fit, ratio ${r.label}`,
    );
    const held = cellMeans(usable, r.label);
    const fits: [
      FormName,
      (
        | ReturnType<typeof fitPowerLaw>
        | ReturnType<typeof fitMechanism>
        | ReturnType<typeof fitQuadratic>
      ),
    ][] = [
      ["power-law", fitPowerLaw(inRange)],
      ["mechanism", fitMechanism(inRange)],
      ["quadratic", fitQuadratic(inRange)],
    ];
    const errs = fits.map(([n, f]) => {
      const e =
        held.reduce((s, p) => s + Math.abs(predict(f, p.phi) - p.t) / p.t, 0) /
        held.length;
      return [n, e] as const;
    });
    const best = errs.reduce((a, b) => (b[1] < a[1] ? b : a));
    console.log(
      `  ratio ${r.label}: ` +
        errs.map(([n, e]) => `${n} ${(100 * e).toFixed(2)}%`).join(", ") +
        `  → ${best[0]}`,
    );
  }

  console.log(
    "\n=== SECONDARY 3 — the mechanism's own intermediate quantity ===\n",
  );
  for (const r of RATIOS) {
    const vals = usable
      .filter((x) => x.ratio === r.label)
      .map((x) => x.maxAbsEntry / Number(x.saturationGeneration));
    if (vals.length === 0) continue;
    const spread = Math.max(...vals) / Math.min(...vals);
    console.log(
      `  ratio ${r.label}: max|s|/t spread ${spread.toFixed(3)}x ` +
        `→ ${spread <= 1.15 ? "within" : "OUTSIDE"} the registered 15%`,
    );
  }
}

// ---------------------------------------------------------------------------

/**
 * Exported so the manipulation checks can be exercised without running the
 * experiment. The dispatch below is GUARDED on being the entry point: importing
 * this file must not launch sixteen hours of simulation, and an unguarded
 * top-level dispatch would make every check in here untestable except by
 * running the thing it is supposed to gate.
 */
export {
  manipulationCheck1,
  manipulationCheck2,
  manipulationCheck3,
  manipulationCheck5,
  assertInRange,
  keysFor,
  runOne,
  PHASE1_PHIS,
  RATIOS,
  SEEDS,
  type Row,
};

function main(): void {
  const argv = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const phase = flag("--phase");
  if (argv.includes("--analyse")) analyse();
  else if (phase === "1") runPhase1(flag("--shard"));
  else if (phase === "2") runPhase2();
  else {
    console.error(
      "usage: 006-is-the-exponent-one.ts --phase 1 [--shard 2.00] | --phase 2 | --analyse",
    );
    process.exit(2);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "\u0000");
if (invokedDirectly) main();
