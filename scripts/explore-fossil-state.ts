// Counterfactual for the fossil-state divergence recorded on
// tests/guards/three-phases-arm.ts and in docs/ROADMAP.md. Run:
//   npx tsx scripts/explore-fossil-state.ts
//
// THE QUESTION. Our `lose` (sim/phases/lifecycle.ts) excises every
// non-domesticated copy at rate `v`, silenced or not, so a fully silenced
// family cannot replace its losses and decay to zero is guaranteed. Kofler
// 2019 (10.1093/molbev/msz079, Methods) gates excision on the SAME activity
// switch as transposition — verbatim: "we assume that TEs are inactive
// (transpositions as well as excisions) in individuals with a cluster
// insertion" — and reports the resulting inactive phase as having "stable TE
// copy numbers" and infinite length. The mechanism is that a DNA transposon's
// excision is catalysed by its own transposase, which piRNA silencing
// suppresses along with transposition.
//
// This script measures what that one gate is worth in OUR model. It does NOT
// change sim/: gating `lose` removes an RNG draw for every silenced copy, which
// moves the whole draw stream and invalidates every calibration in the suite
// and both golden pins in tests/step.test.ts. That is why this is an
// exploration and not a fix.
//
// THE POSITIVE CONTROL IS THE POINT. This file composes its own generation loop
// so it can swap one phase. A composed loop is a SECOND implementation of
// sim/step.ts and could silently describe a different model, so ARM 0 runs the
// composed loop with the SHIPPED `lose` and requires its stateHash to equal a
// world driven by sim's own `step` over the same seeds and generations. If that
// check fails, nothing below means anything and the script says so and exits 1.
import {
  createWorld,
  defaultParams,
  observe,
  stateHash,
  step,
  isSilenced,
  type Params,
  type World,
} from "../sim/index.js";
import { domesticate, lose } from "../sim/phases/lifecycle.js";
import { reproduce } from "../sim/phases/reproduce.js";
import { transpose } from "../sim/phases/transpose.js";
import { trap } from "../sim/phases/trap.js";

const pad = (x: unknown, n: number) => String(x).padStart(n);

/** Shipped `lose`, re-expressed: excise at rate v unless domesticated. */
type LosePhase = (world: World) => void;

/**
 * Kofler's gate: a copy the genome's own piRNAs have silenced is not excised
 * either, because the transposase that would catalyse the excision is the same
 * transcript the silencing suppresses. Domesticated copies stay exempt as
 * before. `||` short-circuits, so an exempt copy consumes NO draw — which is
 * exactly why this cannot be dropped into sim/ without re-deriving everything.
 */
function loseGated(world: World): void {
  const p = world.params;
  for (const genome of world.genomes) {
    genome.copies = genome.copies.filter(
      (c) =>
        c.domesticated ||
        isSilenced(c, genome, p) ||
        world.rng.next() >= p.v,
    );
  }
}

/** sim/step.ts's phase order, with `lose` swapped. Phase 4 is the only variable. */
function stepWith(world: World, losePhase: LosePhase): void {
  transpose(world); // 1
  trap(world); // 2
  domesticate(world); // 3
  losePhase(world); // 4
  reproduce(world); // 5 selection, 6 reproduction
  world.generation++;
}

const SEEDS = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29] as const;

/**
 * The claim under test is about what happens AFTER full inactivation, so the
 * arms are aligned on THAT EVENT, not on absolute generation: the three arms
 * consume different numbers of RNG draws and their generation-g worlds are not
 * comparable. `BASE` raises `c` from defaultParams' 0.01 so that capture is
 * near-certain and every seed actually reaches active = 0 — at defaultParams
 * most seeds never inactivate at all and instead run to ~10,000 copies, which
 * is why a fixed-horizon comparison could not answer this question.
 * theta/sigmaS is left at defaultParams' 5.0, the ratio web/params.ts measured
 * as "no daughter can diverge out of the window": escape is what would restart
 * the family, and this asks what happens when it cannot.
 */
const BASE: Partial<Params> = { c: 0.05 };
const HORIZON = 1200;
/** Generations AFTER the first pass with zero active copies. */
const OFFSETS = [0, 25, 50, 100, 200, 400] as const;

function armParams(seed: number, overrides: Partial<Params> = {}): Params {
  return defaultParams({ ...BASE, ...overrides, seed });
}

/**
 * Step until the first generation with no active copies, then report total
 * copies at each offset past it. Returns null if the family never inactivates
 * (or dies before it does) inside HORIZON — those seeds cannot speak to the
 * claim and are reported as such rather than silently averaged in.
 */
function afterInactivation(
  seed: number,
  losePhase: LosePhase,
  overrides: Partial<Params> = {},
): { at: number; totals: (number | null)[] } | null {
  const world = createWorld(armParams(seed, overrides));
  let at = -1;
  for (let g = 0; g < HORIZON; g++) {
    stepWith(world, losePhase);
    const s = observe(world);
    if (s.totalCopies === 0) return null; // died before inactivating
    if (s.activeCopies === 0) {
      at = world.generation;
      break;
    }
  }
  if (at < 0) return null;
  const totals: (number | null)[] = [];
  let next = 0;
  const start = observe(world).totalCopies;
  totals.push(start);
  next = 1;
  for (let g = 1; g <= OFFSETS[OFFSETS.length - 1]!; g++) {
    stepWith(world, losePhase);
    if (next < OFFSETS.length && g === OFFSETS[next]) {
      totals.push(observe(world).totalCopies);
      next++;
    }
  }
  return { at, totals };
}

// ---------------------------------------------------------------------------
console.log(
  "ARM 0 - POSITIVE CONTROL: the composed loop with the SHIPPED lose must be",
);
console.log("        byte-identical to sim/step.ts. If it is not, stop reading.");
console.log("  seed  composed stateHash   sim step stateHash   match");
let controlOk = true;
for (const seed of SEEDS) {
  const a = createWorld(armParams(seed));
  const b = createWorld(armParams(seed));
  for (let g = 0; g < 120; g++) stepWith(a, lose);
  for (let g = 0; g < 120; g++) step(b);
  const ha = stateHash(a);
  const hb = stateHash(b);
  const ok = ha === hb;
  if (!ok) controlOk = false;
  console.log(
    `  ${pad(seed, 4)}  ${pad(ha, 16)}   ${pad(hb, 17)}   ${ok ? "yes" : "NO"}`,
  );
}
if (!controlOk) {
  console.error(
    "\nCONTROL FAILED: the composed loop is not sim/step.ts. Nothing below is valid.",
  );
  process.exit(1);
}
console.log("  control passes: the composed loop IS the shipped model.\n");

// ---------------------------------------------------------------------------
// Three arms, discriminating WHY a fully inactivated family decays.
//   1 shipped        - silenced copies excised at v, and selected against at d
//   2 excision gated - Kofler's rule; selection against silenced copies remains
//   3 gated + d = 0  - excision gated AND silenced copies cost the host nothing
// If 2 rescues the family, excision is the cause. If only 3 does, SELECTION is.
const ARMS: [string, LosePhase, Partial<Params>][] = [
  ["ARM 1 - SHIPPED (excise silenced at v, damage d)", lose, {}],
  ["ARM 2 - EXCISION GATED (Kofler), damage d unchanged", loseGated, {}],
  // d = 0 removes the DAMAGE term only. A silenced copy still counts in
  // copyNumberLoad (select.ts: n = active + silenced), so it is NOT free here.
  ["ARM 3 - EXCISION GATED, d = 0 (no damage; copy-number load REMAINS)", loseGated, { d: 0 }],
  // a = b = d = 0 removes every selective cost of carrying a copy. What is left
  // is drift plus reproduce.ts's site dedup, and nothing else.
  ["ARM 4 - EXCISION GATED, a = b = d = 0 (NO selection on copy number at all)", loseGated, { a: 0, b: 0, d: 0 }],
  // Guard 8 found domesticated copies persist under asexual reproduction and
  // vanish under sexual. If silenced copies do the same, the two findings are
  // one mechanism.
  ["ARM 5 - EXCISION GATED, ASEXUAL (shipped costs)", loseGated, { sexual: false }],
];

for (const [label, phase, overrides] of ARMS) {
  console.log(label);
  console.log(
    "  seed  inactive@" +
      OFFSETS.map((o) => pad(`+${o}`, 9)).join(""),
  );
  const survived: number[] = [];
  let usable = 0;
  for (const seed of SEEDS) {
    const r = afterInactivation(seed, phase, overrides);
    if (!r) {
      console.log(`  ${pad(seed, 4)}  never inactivated inside ${HORIZON} generations`);
      continue;
    }
    usable++;
    survived.push(r.totals[r.totals.length - 1] ?? 0);
    console.log(
      `  ${pad(seed, 4)}  ${pad(r.at, 9)}` +
        r.totals.map((t) => pad(t ?? "-", 9)).join(""),
    );
  }
  const alive = survived.filter((x) => x > 0).length;
  const mean = survived.length
    ? survived.reduce((a, b) => a + b, 0) / survived.length
    : 0;
  console.log(
    `  ${OFFSETS[OFFSETS.length - 1]} generations after inactivation: ${alive}/${usable} still hold copies, mean ${mean.toFixed(1)}\n`,
  );
}
