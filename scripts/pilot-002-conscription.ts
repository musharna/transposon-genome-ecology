// PILOT for registered question 002 — conscription versus an innate silencer.
// Nothing here is the experiment. Run:
//   npx tsx scripts/pilot-002-conscription.ts
// Writes incrementally to _scratch/pilot-002.txt so a crash loses nothing.
//
// THE QUESTION. Spec §3.3 justifies keying silencing on the sequence coordinate
// because it yields three behaviours from one mechanism: families emerge, a
// diverging sublineage ESCAPES an established trap, and escape after suppression
// is resurrection. The first two survive if the silencer never tracks. What only
// a self-supplied trap gives is RE-CAPTURE: the trap rebuilt from the element
// catches up with a lineage that has diverged. That is what 002 tests.
//
//   A  conscription (shipped): the entry is the capturing copy's current `s`.
//   B  innate:                 the entry is the ancestral 0.
//
// `createWorld` founds every copy at `s = 0` exactly and `s` is a random walk
// along lineages, so the ancestral sequence IS 0 and the null needs no tuned
// distribution. Both arms insert on the SAME EVENT — a copy in a cluster site
// past the same tolerance gate — so capture rate is matched by construction.
//
// ⚠️ THE FIRST DRAFT OF ARM B WAS NOT A FAITHFUL TRANSLATION, and the pilot
// found it by running out of memory. `sim/phases/trap.ts` skips a copy that is
// already silenced, under the comment "capturing again would be a no-op" — the
// value it would insert is `copy.s`, so "already covered" and "already silenced"
// are the same test THERE. In arm B the value inserted is 0, so a copy that has
// diverged past theta is NOT silenced and still inserts a duplicate 0. Measured
// at theta = 0.05: 11,045 entries per genome by generation 300 and 1.09 GB
// resident, still climbing linearly. The duplicates are semantically inert —
// `isSilenced` asks only whether SOME entry is within theta — so this was a pure
// translation error, and the faithful guard asks whether the VALUE TO BE
// INSERTED is already covered. That bounds arm B's repertoire to one entry and
// changes no semantics.
import {
  createWorld,
  defaultParams,
  isClusterSite,
  isSilenced,
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
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

const OUT = "_scratch/pilot-002.txt";
mkdirSync("_scratch", { recursive: true });
// Stages are selected on the command line and APPEND, so a stage that dies (the
// saturated arm-B runs are memory-hungry and one was killed under load) does not
// take the earlier stages' results with it:
//   npx tsx scripts/pilot-002-conscription.ts 0 1 2
const STAGES = new Set(process.argv.slice(2));
if (STAGES.size === 0) {
  console.error("usage: pilot-002-conscription.ts <stage...>   e.g. 0 1 2");
  process.exit(2);
}
if (!existsSync(OUT)) writeFileSync(OUT, "");
const say = (line: string) => {
  console.log(line);
  appendFileSync(OUT, line + "\n");
};
const pad = (x: unknown, n: number) => String(x).padStart(n);
const f = (x: number, n = 2) => x.toFixed(n);

/** The ancestral sequence coordinate. `createWorld` founds every copy at 0. */
const ANCESTRAL_S = 0;

/** Is `value` already within theta of some entry? The two-neighbour argument in
 *  `sim/silencing.ts` applies unchanged: the nearest entry is one of the two at
 *  the insertion point. */
function valueCovered(value: number, genome: Genome, p: Params): boolean {
  const rep = genome.repertoire;
  const i = repertoireInsertionIndex(rep, value);
  if (i < rep.length && Math.abs(value - rep[i]!) <= p.theta) return true;
  if (i > 0 && Math.abs(value - rep[i - 1]!) <= p.theta) return true;
  return false;
}

type TrapPhase = (world: World) => void;

function trapInnate(world: World): void {
  const p = world.params;
  if (!p.silencingOn) return;
  for (const genome of world.genomes) {
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      if (!isClusterSite(copy.site, p)) continue;
      // The faithful translation of trap.ts's no-op guard: not "is this copy
      // silenced" but "is the value about to be inserted already covered".
      if (valueCovered(ANCESTRAL_S, genome, p)) continue;
      if (world.rng.next() >= 1 - p.t) continue;
      const at = repertoireInsertionIndex(genome.repertoire, ANCESTRAL_S);
      genome.repertoire.splice(at, 0, ANCESTRAL_S);
    }
  }
}

function stepWith(world: World, trapPhase: TrapPhase): void {
  transpose(world);
  trapPhase(world);
  domesticate(world);
  lose(world);
  reproduce(world);
  world.generation++;
}

const BASE: Partial<Params> = {
  N: 300, S: 3000, c: 0.02, r0: 0.2, rMax: 1, sigmaR: 0.05, sigmaS: 0.02,
  v: 0.005, a: 0.0004, b: 0.00001, d: 0.0005, dTol: 0.002, t: 0,
  beta: 0.005, pDom: 0, wDom: 0.01, sexual: true, silencingOn: true,
};
const HELD_OUT = [1001, 1002, 1003, 1004, 1005, 1006];
const GENERATIONS = 600;

interface Run {
  copiesPerGenome: number;
  silencedFraction: number;
  extinct: boolean;
  entriesPerGenome: number;
  nonZeroEntries: number;
}

function runOne(seed: number, phase: TrapPhase, theta: number): Run {
  const world = createWorld(defaultParams({ ...BASE, theta, seed }));
  for (let g = 0; g < GENERATIONS; g++) stepWith(world, phase);
  const s = observe(world);
  let entries = 0;
  let nonZero = 0;
  for (const genome of world.genomes) {
    for (const e of genome.repertoire) {
      entries++;
      if (Math.abs(e) > 1e-9) nonZero++;
    }
  }
  return {
    copiesPerGenome: s.totalCopies / world.genomes.length,
    silencedFraction: s.totalCopies === 0 ? 0 : s.silencedCopies / s.totalCopies,
    extinct: s.totalCopies === 0,
    entriesPerGenome: entries / world.genomes.length,
    nonZeroEntries: nonZero,
  };
}

// ---------------------------------------------------------------------------
if (STAGES.has("0")) {
say("PILOT 0 - POSITIVE CONTROL: the composed loop IS sim/step.ts.");
  let ok = true;
  for (const seed of [1, 2, 3]) {
    const a = createWorld(defaultParams({ ...BASE, theta: 0.15, seed }));
    const b = createWorld(defaultParams({ ...BASE, theta: 0.15, seed }));
    for (let g = 0; g < 80; g++) stepWith(a, trap);
    for (let g = 0; g < 80; g++) step(b);
    const same = stateHash(a) === stateHash(b);
    if (!same) ok = false;
    say(`  seed ${pad(seed, 3)}  ${stateHash(a)}  ${stateHash(b)}  ${same ? "match" : "MISMATCH"}`);
  }
  if (!ok) {
    console.error("CONTROL FAILED: the composed loop is not the shipped model.");
    process.exit(1);
  }
  say("  control passes.\n");
}

// ---------------------------------------------------------------------------
// PILOT 1 - the regime grid, POOLED ACROSS ARMS so the choice cannot favour one.
// The criterion, fixed here before any arm contrast is looked at: take the theta
// whose POOLED horizon silenced fraction is nearest 0.5. Nearer 0 and the innate
// arm has stopped silencing at all, so the experiment is "conscription versus no
// silencing" and guard 2 already answers that; nearer 1 and nothing escapes, so
// the arms cannot differ by construction.
if (STAGES.has("1")) {
say(`PILOT 1 - REGIME GRID (held-out seeds ${HELD_OUT[0]}-${HELD_OUT[HELD_OUT.length - 1]}, gen ${GENERATIONS})`);
say("  theta   arm  copies/genome  silenced frac  extinct  entries/genome  nonzero");
const pooled = new Map<number, number[]>();
for (const theta of [0.15, 0.3, 0.6, 1.0]) {
  for (const [name, phase] of [["A", trap], ["B", trapInnate]] as const) {
    const runs = HELD_OUT.map((s) => runOne(s, phase, theta));
    const mean = (g: (r: Run) => number) =>
      runs.reduce((a, r) => a + g(r), 0) / runs.length;
    const sil = mean((r) => r.silencedFraction);
    if (!pooled.has(theta)) pooled.set(theta, []);
    pooled.get(theta)!.push(sil);
    say(
      `  ${pad(f(theta, 2), 5)}   ${name}   ${pad(f(mean((r) => r.copiesPerGenome)), 12)}  ${pad(f(sil, 3), 13)}  ${pad(`${runs.filter((r) => r.extinct).length}/${HELD_OUT.length}`, 7)}  ${pad(f(mean((r) => r.entriesPerGenome), 1), 14)}  ${pad(mean((r) => r.nonZeroEntries).toFixed(0), 7)}`,
    );
  }
}
say("\n  POOLED silenced fraction (mean of the two arms) and distance from 0.5:");
let best = { theta: 0, d: Infinity, pooledSil: 0 };
for (const [theta, sils] of [...pooled.entries()].sort((a, b) => a[0] - b[0])) {
  const p = sils.reduce((a, b) => a + b, 0) / sils.length;
  const d = Math.abs(p - 0.5);
  if (d < best.d) best = { theta, d, pooledSil: p };
  say(`    theta ${pad(f(theta, 2), 5)}   pooled ${f(p, 3)}   |pooled - 0.5| = ${f(d, 3)}`);
}
say(`\n  CHOSEN BY THE PRE-STATED CRITERION: theta = ${best.theta} (pooled ${f(best.pooledSil, 3)})`);

}

// ---------------------------------------------------------------------------
// PILOT 2 - THE GRID ABOVE WAS THE WRONG AXIS, AND THE CRITERION COULD NOT
// DISCRIMINATE. Both are recorded rather than quietly replaced.
//
// What PILOT 1 showed:
//   - theta >= 0.30: BOTH arms extinct 6/6. A wide window silences the whole
//     family, and a fully silenced family dies in this model (the sexual-path
//     mechanism measured in scripts/explore-fossil-state.ts). Unusable.
//   - theta = 0.15: arm A healthy (81.3% silenced, 78 copies/genome, 1/6
//     extinct); arm B silencing 0.1% at the horizon — effectively NO silencing.
//
//   ⚠️ AND THE POOLED CRITERION PICKED THAT POINT ANYWAY. "Pooled silenced
//   fraction nearest 0.5" scored 0.407 there, from (0.813 + 0.001)/2 — one
//   healthy arm carrying a dead one. The criterion was written to exclude
//   exactly the case where the innate arm has stopped silencing, and it could
//   not see it. Pooling makes a criterion arm-blind; it does not make it able
//   to discriminate.
//
// THE AXIS THAT MATTERS IS ESCAPE TIME, NOT theta. A lineage's `s` after k
// transposition events is 𝒩(0, k·sigmaS²) (sim/phases/transpose.ts), so escape
// from a window of half-width theta takes about
//
//     k* = (theta / sigmaS)^2
//
// transposition events. PILOT 1 varied theta with sigmaS fixed, which moved k*
// and the total silencing pressure together.
//
// THE REPLACEMENT CRITERION, STATED BEFORE THIS SWEEP RUNS: choose the grid
// point whose k* is nearest 100 events. It is computed FROM THE PARAMETERS
// ALONE, needs no simulation, and therefore cannot be steered by either arm's
// behaviour — which is the property the pooled criterion only appeared to have.
// With theta = 0.15 that selects sigmaS = 0.015. The sweep below is DESCRIPTIVE:
// it checks the precondition that neither arm is degenerate there. If that fails
// the point is unusable and this says so rather than moving the criterion.
if (STAGES.has("2")) {
say("\nPILOT 2 - ESCAPE-TIME AXIS: sigmaS at theta = 0.15");
say("  a priori criterion: k* = (theta/sigmaS)^2 nearest 100 events");
say("  sigmaS   k*    arm  copies/genome  silenced frac  extinct  entries/genome");
for (const sigmaS of [0.005, 0.0075, 0.01, 0.015, 0.02]) {
  const kStar = Math.round((0.15 / sigmaS) ** 2);
  for (const [name, phase] of [["A", trap], ["B", trapInnate]] as const) {
    const runs = HELD_OUT.map((s) => {
      const world = createWorld(
        defaultParams({ ...BASE, theta: 0.15, sigmaS, seed: s }),
      );
      for (let g = 0; g < GENERATIONS; g++) stepWith(world, phase);
      const o = observe(world);
      let entries = 0;
      for (const gn of world.genomes) entries += gn.repertoire.length;
      return {
        copiesPerGenome: o.totalCopies / world.genomes.length,
        silencedFraction:
          o.totalCopies === 0 ? 0 : o.silencedCopies / o.totalCopies,
        extinct: o.totalCopies === 0,
        entriesPerGenome: entries / world.genomes.length,
      };
    });
    const mean = (g: (r: (typeof runs)[number]) => number) =>
      runs.reduce((a, r) => a + g(r), 0) / runs.length;
    say(
      `  ${pad(f(sigmaS, 4), 6)} ${pad(kStar, 5)}    ${name}   ${pad(f(mean((r) => r.copiesPerGenome)), 12)}  ${pad(f(mean((r) => r.silencedFraction), 3), 13)}  ${pad(`${runs.filter((r) => r.extinct).length}/${HELD_OUT.length}`, 7)}  ${pad(f(mean((r) => r.entriesPerGenome), 1), 14)}`,
    );
  }
}
}
