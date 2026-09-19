/**
 * Registered question 007 — do the controlled seeds saturate?
 * `docs/pre-registrations/2026-09-19-do-the-controlled-seeds-saturate.md`,
 * committed alone at `4641c64` before this runner existed.
 *
 * 006's Phase 2 left seeds 6005/6006/6008 at phi 0.0005, ratio 5.00 still
 * controlled at its 70013-generation horizon. 007 re-runs them from generation 0
 * under its own horizon H = 239,030, replaying 006's state at 70013 hash for
 * hash, plus 20 fresh seeds (descriptive) and a positive control that replays
 * 006's phi 0.001 cell exactly.
 *
 * THE LOOP IS 006's. `runOne` is imported, not copied, and observed through its
 * read-only `onGeneration` hook (006 Addendum 4), so saturation, extinction and
 * every parameter are 006's by construction.
 *
 * Usage (from the repository root, Node >= 22):
 *   npx tsx experiments/007-do-the-controlled-seeds-saturate.ts --smoke
 *   npx tsx experiments/007-do-the-controlled-seeds-saturate.ts --run <shard>
 *   npx tsx experiments/007-do-the-controlled-seeds-saturate.ts --merge
 *   npx tsx experiments/007-do-the-controlled-seeds-saturate.ts --analyse
 * Shards: control, named-6005, named-6006, named-6008, fresh-1 .. fresh-4.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stateHash, type World } from "../sim/index.js";
import { RATIOS, runOne, type Row } from "./006-is-the-exponent-one.js";
import {
  controlledAt,
  expectedSampleGenerations,
  labelOf,
  overallOf,
  primaryHeld,
  SAMPLE_EVERY,
  trendOf,
  wilson,
  type Label,
  type Sample,
} from "./007-analysis.js";

// ---------------------------------------------------------------------------
// REGISTERED CONSTANTS — each one that 006's data also fixes is re-derived
// from 006's CSV at run time and must agree (see `assertAgainst006`).

const CSV_006 = "experiments/006-phase2.csv";
const SHARD_DIR = "experiments/007-shards";
const RUNS_CSV = "experiments/007-runs.csv";
const SERIES_CSV = "experiments/007-series.csv";
const MODEL_COMMIT = "12e7b08";

const RATIO = RATIOS[2];
if (RATIO.label !== "5.00")
  throw new Error(`RATIOS[2] is ${RATIO.label}, not 5.00`);

export type Role = "named" | "fresh" | "control";

export interface Plan {
  cellPhi: number;
  controlPhi: number;
  named: number[];
  fresh: number[];
  controlSeeds: number[];
  /** Horizon for named and fresh runs. */
  H: number;
  /** Horizon for control runs: 006's horizon for that cell. */
  controlHorizon: number;
  /** Generation at which a named run's state must equal 006's end state. */
  replayGen: number;
  sampleEvery: number;
  /** Full plan only: every control run must saturate. */
  requireControlSaturates: boolean;
}

export const LATEST_SATURATION_006 = 23903;
export const FULL: Plan = {
  cellPhi: 0.0005,
  controlPhi: 0.001,
  named: [6005, 6006, 6008],
  fresh: Array.from({ length: 20 }, (_, i) => 7001 + i),
  controlSeeds: Array.from({ length: 10 }, (_, i) => 6001 + i),
  H: 10 * LATEST_SATURATION_006, // 239,030
  controlHorizon: 35007,
  replayGen: 70013,
  sampleEvery: SAMPLE_EVERY,
  requireControlSaturates: true,
};

/**
 * DELIBERATE DEFECTS, for the mutation table only. Production passes none;
 * `scripts/007-mutation-table.ts` passes one at a time and requires the smoke
 * to fail. Rows 1, 2, 3, 8, 9 and 10 of the registration's table.
 */
export interface Faults {
  /** Row 1: replay hash taken at replayGen + this. */
  replayGenOffset?: number;
  /** Row 2: control run at seed + this, recorded as the registered seed. */
  controlSeedOffset?: number;
  /** Row 3: named-seed horizon overridden. */
  namedHorizon?: number;
  /** Row 8: the observer consumes one RNG draw per generation. */
  observerDraws?: boolean;
  /** Row 9: series sampled at this interval instead of the plan's. */
  sampleEvery?: number;
  /** Row 10: the first fresh seed duplicated. */
  duplicateFresh?: boolean;
}

export interface Planned {
  role: Role;
  phi: number;
  seed: number;
}

export interface Result {
  role: Role;
  row: Row;
  /** stateHash at replayGen, or "NA" if the run never reached it. */
  replayHash: string;
  series: Sample[];
}

export function plannedRuns(plan: Plan, faults: Faults = {}): Planned[] {
  const fresh = faults.duplicateFresh
    ? [plan.fresh[0]!, ...plan.fresh]
    : plan.fresh;
  return [
    ...plan.named.map((seed) => ({
      role: "named" as const,
      phi: plan.cellPhi,
      seed,
    })),
    ...fresh.map((seed) => ({
      role: "fresh" as const,
      phi: plan.cellPhi,
      seed,
    })),
    ...plan.controlSeeds.map((seed) => ({
      role: "control" as const,
      phi: plan.controlPhi,
      seed,
    })),
  ];
}

/** One run, through 006's loop, observed. */
export function runPlanned(
  p: Planned,
  plan: Plan,
  faults: Faults = {},
  onReplay?: (hash: string) => void,
): Result {
  const horizon =
    p.role === "control"
      ? plan.controlHorizon
      : p.role === "named" && faults.namedHorizon !== undefined
        ? faults.namedHorizon
        : plan.H;
  const runSeed =
    p.role === "control" ? p.seed + (faults.controlSeedOffset ?? 0) : p.seed;
  const every = faults.sampleEvery ?? plan.sampleEvery;
  const replayAt = plan.replayGen + (faults.replayGenOffset ?? 0);
  const series: Sample[] = [];
  let replayHash = "NA";
  const observer = (w: World) => {
    if (faults.observerDraws) w.rng.next();
    if (w.generation % every === 0) {
      let total = 0;
      for (const g of w.genomes) total += g.copies.length;
      series.push({
        generation: w.generation,
        copiesPerGenome: total / w.genomes.length,
      });
    }
    if (w.generation === replayAt) {
      replayHash = stateHash(w);
      onReplay?.(replayHash);
    }
  };
  const row = runOne(
    p.phi,
    RATIO,
    runSeed,
    horizon,
    "007-registered",
    0,
    undefined,
    observer,
  );
  return { role: p.role, row: { ...row, seed: p.seed }, replayHash, series };
}

// ---------------------------------------------------------------------------
// MANIPULATION CHECKS — each throws; the experiment is void if any fails.

export interface Target {
  saturated: number;
  saturationGeneration: number | "NA";
  hash: string;
}

/** Check 1 — each named seed's state at replayGen equals 006's end state. */
export function check1Replay(
  results: Result[],
  targets: Map<number, string>,
): void {
  const named = results.filter((r) => r.role === "named");
  const bad = named.filter((r) => r.replayHash !== targets.get(r.row.seed));
  if (named.length === 0 || bad.length > 0) {
    throw new Error(
      `manipulation check 1 failed — replay: ${
        bad
          .map(
            (r) =>
              `seed ${r.row.seed} hash ${r.replayHash} != ${targets.get(r.row.seed)}`,
          )
          .join("; ") || "no named runs"
      }. 007 is VOID.`,
    );
  }
}

/** Check 2 — each control run reproduces its 006 row exactly. */
export function check2Control(
  results: Result[],
  targets: Map<number, Target>,
  plan: Plan,
): void {
  const ctl = results.filter((r) => r.role === "control");
  const bad = ctl.filter((r) => {
    const t = targets.get(r.row.seed);
    return (
      !t ||
      r.row.saturated !== t.saturated ||
      String(r.row.saturationGeneration) !== String(t.saturationGeneration) ||
      r.row.hash !== t.hash ||
      (plan.requireControlSaturates && r.row.saturated !== 1)
    );
  });
  if (ctl.length === 0 || bad.length > 0) {
    throw new Error(
      `manipulation check 2 failed — positive control: ${
        bad
          .map((r) => {
            const t = targets.get(r.row.seed);
            return `seed ${r.row.seed} t_sat ${r.row.saturationGeneration} hash ${r.row.hash} vs ${t?.saturationGeneration} ${t?.hash}`;
          })
          .join("; ") || "no control runs"
      }. 007 is VOID.`,
    );
  }
}

/** Check 3 — exactly the registered (role, seed) set. */
export function check3Grid(results: Result[], plan: Plan): void {
  const key = (role: string, seed: number) => `${role}|${seed}`;
  const want = plannedRuns(plan).map((p) => key(p.role, p.seed));
  const have = results.map((r) => key(r.role, r.row.seed));
  const dup = have.filter((k, i) => have.indexOf(k) !== i);
  const missing = want.filter((k) => !have.includes(k));
  const extra = have.filter((k) => !want.includes(k));
  if (dup.length || missing.length || extra.length) {
    throw new Error(
      `manipulation check 3 failed — grid: ${dup.length} duplicated [${dup.join(", ")}], ` +
        `${missing.length} missing [${missing.join(", ")}], ${extra.length} unexpected [${extra.join(", ")}]. 007 is VOID.`,
    );
  }
}

/** Check 4 — every run carries the registered horizon for its role. */
export function check4Horizon(results: Result[], plan: Plan): void {
  const bad = results.filter(
    (r) =>
      r.row.horizon !== (r.role === "control" ? plan.controlHorizon : plan.H),
  );
  if (bad.length > 0) {
    throw new Error(
      `manipulation check 4 failed — horizon: ${bad
        .map((r) => `${r.role} ${r.row.seed} horizon ${r.row.horizon}`)
        .join("; ")}. 007 is VOID.`,
    );
  }
}

/** Check 5 — every run's series is exactly the samples it must have. */
export function check5Series(results: Result[], plan: Plan): void {
  for (const r of results) {
    const stoppedEarly = r.row.saturated === 1 || r.row.extinct === 1;
    const want = expectedSampleGenerations(
      r.row.stoppedAt,
      stoppedEarly,
      plan.sampleEvery,
    );
    const have = r.series.map((s) => s.generation);
    if (want.length !== have.length || want.some((g, i) => g !== have[i])) {
      throw new Error(
        `manipulation check 5 failed — series of ${r.role} ${r.row.seed}: ${have.length} samples, ` +
          `expected ${want.length} (first mismatch at index ${want.findIndex((g, i) => g !== have[i])}). 007 is VOID.`,
      );
    }
  }
}

/** Check 6 — the model's code (comments removed) is the frozen model's. */
export function check6Model(): string {
  const digest = (args: string[]) =>
    execFileSync("node", ["scripts/sim-code-digest.mjs", ...args], {
      encoding: "utf8",
    }).trim();
  const now = digest(["--dir", "sim"]);
  const frozen = digest(["--ref", MODEL_COMMIT]);
  if (now !== frozen) {
    throw new Error(
      `manipulation check 6 failed — sim/ code digest ${now} != ${MODEL_COMMIT}'s ${frozen}. 007 is VOID.`,
    );
  }
  console.log(
    `MANIPULATION CHECK 6 — model code digest ${now} = ${MODEL_COMMIT}. PASSED`,
  );
  return now;
}

// ---------------------------------------------------------------------------
// 006's CSV — the replay targets, and the constants it also fixes.

function read006(): Row[] {
  const lines = readFileSync(CSV_006, "utf8").trim().split("\n");
  const cols = lines[0]!.split(",");
  const at = (f: string[], n: string) => {
    const i = cols.indexOf(n);
    if (i < 0) throw new Error(`${CSV_006} has no column ${n}`);
    return f[i]!;
  };
  return lines.slice(1).map((line) => {
    const f = line.split(",");
    const sg = at(f, "saturation_generation");
    return {
      phi: Number(at(f, "phi")),
      ratio: at(f, "ratio"),
      seed: Number(at(f, "seed")),
      horizon: Number(at(f, "horizon")),
      stoppedAt: Number(at(f, "stopped_at")),
      extinct: Number(at(f, "extinct")),
      saturated: Number(at(f, "saturated")),
      saturationGeneration: sg === "NA" ? "NA" : Number(sg),
      hash: at(f, "hash"),
    } as Row;
  });
}

const same = (a: number, b: number) => Math.abs(a - b) < 1e-12;

/** The replay targets, and an assertion that the registered constants are 006's. */
export function targetsFrom006(plan: Plan): {
  named: Map<number, string>;
  control: Map<number, Target>;
} {
  const rows = read006().filter((r) => r.ratio === RATIO.label);
  const cell = rows.filter((r) => same(r.phi, plan.cellPhi));
  const latest = Math.max(
    ...cell
      .filter((r) => r.saturated === 1)
      .map((r) => Number(r.saturationGeneration)),
  );
  if (latest !== LATEST_SATURATION_006 || plan.H !== 10 * latest) {
    throw new Error(
      `registered H assumes latest saturation ${LATEST_SATURATION_006}; 006's CSV gives ${latest}`,
    );
  }
  const named = new Map<number, string>();
  for (const seed of plan.named) {
    const r = cell.find((x) => x.seed === seed);
    if (
      !r ||
      r.saturated !== 0 ||
      r.extinct !== 0 ||
      r.stoppedAt !== plan.replayGen
    ) {
      throw new Error(
        `seed ${seed} is not a run 006 recorded as controlled at ${plan.replayGen}`,
      );
    }
    named.set(seed, r.hash);
  }
  const control = new Map<number, Target>();
  for (const seed of plan.controlSeeds) {
    const r = rows.find((x) => same(x.phi, plan.controlPhi) && x.seed === seed);
    if (!r || r.horizon !== plan.controlHorizon) {
      throw new Error(
        `006 has no phi ${plan.controlPhi} row for seed ${seed} at horizon ${plan.controlHorizon}`,
      );
    }
    control.set(seed, {
      saturated: r.saturated,
      saturationGeneration: r.saturationGeneration,
      hash: r.hash,
    });
  }
  return { named, control };
}

// ---------------------------------------------------------------------------
// CSV I/O

const RUN_COLS = [
  "role",
  "phi",
  "ratio",
  "seed",
  "horizon",
  "stopped_at",
  "copies_per_genome",
  "silenced_fraction",
  "extinct",
  "saturated",
  "saturation_generation",
  "hash",
  "replay_hash",
  "model_digest",
] as const;

const runLine = (r: Result, digest: string) =>
  [
    r.role,
    r.row.phi,
    r.row.ratio,
    r.row.seed,
    r.row.horizon,
    r.row.stoppedAt,
    r.row.copiesPerGenome,
    r.row.silencedFraction,
    r.row.extinct,
    r.row.saturated,
    r.row.saturationGeneration,
    r.row.hash,
    r.replayHash,
    digest,
  ].join(",");

const seriesLines = (r: Result) =>
  r.series.map((s) =>
    [r.role, r.row.seed, s.generation, s.copiesPerGenome].join(","),
  );

function readResults(
  runsPath: string,
  seriesPath: string,
): { results: Result[]; digests: string[] } {
  if (!existsSync(runsPath) || !existsSync(seriesPath)) {
    throw new Error(`missing ${runsPath} or ${seriesPath}`);
  }
  const rl = readFileSync(runsPath, "utf8").trim().split("\n");
  if (rl[0] !== RUN_COLS.join(","))
    throw new Error(`${runsPath}: unexpected header`);
  const bySeries = new Map<string, Sample[]>();
  const sl = readFileSync(seriesPath, "utf8").trim().split("\n");
  if (sl[0] !== "role,seed,generation,copies_per_genome")
    throw new Error(`${seriesPath}: unexpected header`);
  for (const line of sl.slice(1)) {
    const [role, seed, g, c] = line.split(",");
    const k = `${role}|${seed}`;
    bySeries.set(k, [
      ...(bySeries.get(k) ?? []),
      { generation: Number(g), copiesPerGenome: Number(c) },
    ]);
  }
  const digests: string[] = [];
  const results = rl.slice(1).map((line) => {
    const f = line.split(",");
    const v = (n: (typeof RUN_COLS)[number]) => f[RUN_COLS.indexOf(n)]!;
    digests.push(v("model_digest"));
    const sg = v("saturation_generation");
    const role = v("role") as Role;
    return {
      role,
      row: {
        phi: Number(v("phi")),
        ratio: v("ratio"),
        seed: Number(v("seed")),
        horizon: Number(v("horizon")),
        stoppedAt: Number(v("stopped_at")),
        copiesPerGenome: Number(v("copies_per_genome")),
        silencedFraction: Number(v("silenced_fraction")),
        extinct: Number(v("extinct")),
        saturated: Number(v("saturated")),
        saturationGeneration: sg === "NA" ? "NA" : Number(sg),
        hash: v("hash"),
      } as Row,
      replayHash: v("replay_hash"),
      series: bySeries.get(`${role}|${v("seed")}`) ?? [],
    };
  });
  return { results, digests };
}

// ---------------------------------------------------------------------------
// SHARDS — independent runs, one jobd job each.

export const SHARDS: Record<string, (p: Planned) => boolean> = {
  control: (p) => p.role === "control",
  "named-6005": (p) => p.role === "named" && p.seed === 6005,
  "named-6006": (p) => p.role === "named" && p.seed === 6006,
  "named-6008": (p) => p.role === "named" && p.seed === 6008,
  "fresh-1": (p) => p.role === "fresh" && p.seed >= 7001 && p.seed <= 7005,
  "fresh-2": (p) => p.role === "fresh" && p.seed >= 7006 && p.seed <= 7010,
  "fresh-3": (p) => p.role === "fresh" && p.seed >= 7011 && p.seed <= 7015,
  "fresh-4": (p) => p.role === "fresh" && p.seed >= 7016 && p.seed <= 7020,
};

function runShard(name: string): void {
  const pick = SHARDS[name];
  if (!pick)
    throw new Error(
      `unknown shard ${name}; known: ${Object.keys(SHARDS).join(", ")}`,
    );
  const digest = check6Model();
  const targets = targetsFrom006(FULL);
  const todo = plannedRuns(FULL).filter(pick);
  mkdirSync(SHARD_DIR, { recursive: true });
  const runs = [RUN_COLS.join(",")];
  const series = ["role,seed,generation,copies_per_genome"];
  for (const p of todo) {
    console.log(`shard ${name}: ${p.role} seed ${p.seed} at phi ${p.phi}`);
    // FAIL FAST: a named seed that does not replay 006 is void at 70013, not
    // after six more hours.
    const r = runPlanned(p, FULL, {}, (h) => {
      if (p.role === "named" && h !== targets.named.get(p.seed)) {
        throw new Error(
          `manipulation check 1 failed at generation ${FULL.replayGen} — seed ${p.seed} hash ${h} != 006's ${targets.named.get(p.seed)}. 007 is VOID.`,
        );
      }
      if (p.role === "named")
        console.log(`  seed ${p.seed} replays 006 at ${FULL.replayGen}: ${h}`);
    });
    if (p.role === "control") check2Control([r], targets.control, FULL);
    check5Series([r], FULL);
    console.log(
      `  -> stopped ${r.row.stoppedAt}, saturated ${r.row.saturated}, extinct ${r.row.extinct}, ${r.row.copiesPerGenome.toFixed(1)} copies/genome`,
    );
    runs.push(runLine(r, digest));
    series.push(...seriesLines(r));
  }
  writeFileSync(`${SHARD_DIR}/${name}.runs.csv`, runs.join("\n") + "\n");
  writeFileSync(`${SHARD_DIR}/${name}.series.csv`, series.join("\n") + "\n");
  console.log(`shard ${name} written: ${todo.length} runs`);
}

/** Concatenate every registered shard, check the whole, write the named CSVs. */
function merge(): void {
  const runs = [RUN_COLS.join(",")];
  const series = ["role,seed,generation,copies_per_genome"];
  for (const name of Object.keys(SHARDS)) {
    const rp = `${SHARD_DIR}/${name}.runs.csv`;
    const sp = `${SHARD_DIR}/${name}.series.csv`;
    if (!existsSync(rp) || !existsSync(sp))
      throw new Error(`shard ${name} has not been run: ${rp}`);
    runs.push(...readFileSync(rp, "utf8").trim().split("\n").slice(1));
    series.push(...readFileSync(sp, "utf8").trim().split("\n").slice(1));
  }
  writeFileSync(RUNS_CSV, runs.join("\n") + "\n");
  writeFileSync(SERIES_CSV, series.join("\n") + "\n");
  const { results } = readResults(RUNS_CSV, SERIES_CSV);
  check3Grid(results, FULL);
  check5Series(results, FULL);
  console.log(
    `merged ${results.length} runs into ${RUNS_CSV} and ${SERIES_CSV}`,
  );
}

// ---------------------------------------------------------------------------
// ANALYSIS

export function verdicts(results: Result[], plan: Plan): string[] {
  const out: string[] = [];
  const named = plan.named.map(
    (seed) => results.find((r) => r.role === "named" && r.row.seed === seed)!,
  );
  const labels: Label[] = named.map((r) => labelOf(r.row, r.series, plan.H));
  out.push("=== PRIMARY — delay: all three named seeds saturate before H ===");
  named.forEach((r, i) => {
    const l = labels[i]!;
    let detail = "";
    if (l === "saturated") detail = `t_sat ${r.row.saturationGeneration}`;
    else if (l === "extinct") detail = `extinct at ${r.row.stoppedAt}`;
    else {
      const t = trendOf(r.series, plan.H);
      detail = `slope ${t.slope.toExponential(3)}/gen over ${t.samples} samples, fitted ${Math.exp(t.fittedAt2H).toFixed(0)} copies/genome at 2H`;
    }
    out.push(`  seed ${r.row.seed}: ${l} (${detail})`);
  });
  out.push(`  PRIMARY: ${primaryHeld(labels) ? "HELD" : "FALSIFIED"}`);
  out.push(
    `  OVERALL: ${overallOf(labels)}; extinctions ${labels.filter((l) => l === "extinct").length}`,
  );
  const fresh = results.filter((r) => r.role === "fresh");
  const n = fresh.length;
  const at70 = fresh.filter((r) => controlledAt(r.row, plan.replayGen)).length;
  const fl = fresh.map((r) => labelOf(r.row, r.series, plan.H));
  const atH = fl.filter((l) => l.startsWith("controlled")).length;
  const ci = ([lo, hi]: [number, number]) =>
    `[${lo.toFixed(3)}, ${hi.toFixed(3)}]`;
  out.push("=== SECONDARY — fresh seeds, descriptive, no verdict ===");
  out.push(
    `  controlled at ${plan.replayGen}: ${at70} of ${n} ${ci(wilson(at70, n))}`,
  );
  out.push(`  controlled at H: ${atH} of ${n} ${ci(wilson(atH, n))}`);
  out.push(
    `  saturated ${fl.filter((l) => l === "saturated").length}, extinct ${fl.filter((l) => l === "extinct").length}, controlled-flat ${fl.filter((l) => l === "controlled-flat").length}, controlled-trending ${fl.filter((l) => l === "controlled-trending").length}`,
  );
  return out;
}

function analyse(): void {
  const { results, digests } = readResults(RUNS_CSV, SERIES_CSV);
  const targets = targetsFrom006(FULL);
  const frozen = execFileSync(
    "node",
    ["scripts/sim-code-digest.mjs", "--ref", MODEL_COMMIT],
    { encoding: "utf8" },
  ).trim();
  if (digests.some((d) => d !== frozen))
    throw new Error(
      `manipulation check 6 failed — a run recorded a model digest other than ${MODEL_COMMIT}'s. 007 is VOID.`,
    );
  check1Replay(results, targets.named);
  check2Control(results, targets.control, FULL);
  check3Grid(results, FULL);
  check4Horizon(results, FULL);
  check5Series(results, FULL);
  console.log("MANIPULATION CHECKS 1-6 PASSED\n");
  for (const line of verdicts(results, FULL)) console.log(line);
}

// ---------------------------------------------------------------------------
// SMOKE — the whole pipeline at scaled-down horizons, with replay targets taken
// from the smoke itself. Minutes, not hours. The mutation table runs it once
// per fault and requires it to fail.

export const SMOKE: Plan = {
  cellPhi: 0.0005,
  controlPhi: 0.001,
  named: [6005, 6006, 6008],
  fresh: [7001, 7002],
  controlSeeds: [6001, 6002],
  H: 400,
  controlHorizon: 150,
  replayGen: 200,
  // 20, not 100: the trend window [H/2, H] must hold at least 10 samples.
  sampleEvery: 20,
  requireControlSaturates: false,
};

export function smoke(faults: Faults = {}): void {
  const plan = SMOKE;
  // Targets, by independent plain runs of 006's loop with no observer: a named
  // target is the end state of a run whose horizon IS the replay generation,
  // exactly as 006's end-state hash is.
  const named = new Map<number, string>();
  for (const seed of plan.named) {
    named.set(
      seed,
      runOne(plan.cellPhi, RATIO, seed, plan.replayGen, "smoke-target", 0).hash,
    );
  }
  const control = new Map<number, Target>();
  for (const seed of plan.controlSeeds) {
    const r = runOne(
      plan.controlPhi,
      RATIO,
      seed,
      plan.controlHorizon,
      "smoke-target",
      0,
    );
    control.set(seed, {
      saturated: r.saturated,
      saturationGeneration: r.saturationGeneration,
      hash: r.hash,
    });
  }
  const results = plannedRuns(plan, faults).map((p) =>
    runPlanned(p, plan, faults),
  );
  check1Replay(results, named);
  check2Control(results, control, plan);
  check3Grid(results, plan);
  check4Horizon(results, plan);
  check5Series(results, plan);
  console.log(
    "(smoke verdicts below are on SCALED-DOWN horizons: they exercise the code and mean nothing)",
  );
  for (const line of verdicts(results, plan)) console.log(line);
  console.log(
    "SMOKE PASSED — every check ran on real runs of 006's loop and passed.",
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--run");
  if (argv.includes("--smoke")) smoke();
  else if (i >= 0) runShard(argv[i + 1] ?? "");
  else if (argv.includes("--merge")) merge();
  else if (argv.includes("--analyse")) analyse();
  else {
    console.error(
      "usage: 007-do-the-controlled-seeds-saturate.ts --smoke | --run <shard> | --merge | --analyse",
    );
    process.exit(2);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].split("/").pop() ?? "\u0000");
if (invokedDirectly) main();
