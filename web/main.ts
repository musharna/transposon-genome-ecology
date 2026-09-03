import {
  createWorld,
  defaultParams,
  observe,
  step,
  type Params,
  type Snapshot,
  type World,
} from "../sim/index.js";
import { drawField } from "./render/field.js";

/**
 * The toy's parameters: a `web/`-level layer over `defaultParams`, which is NOT
 * touched. Every guard in the suite is calibrated against those values and
 * `tests/step.test.ts` pins the RNG draw stream to golden hash `9c15fd28`.
 *
 * `defaultParams()` itself is unwatchable as a toy. Measured here before these
 * were derived, at its own values, seed 1, one observation per generation:
 *
 *     gen  30   954 copies   902 active    52 silenced
 *     gen  60  1080 copies   318 active   762 silenced
 *     gen 120   273 copies     0 active   273 silenced   <- nothing can transpose
 *     gen 300     0 copies                                <- extinct
 *
 * At `speed` below and 60 fps that is about 1.7 seconds: a red bloom, a grey
 * field, an empty screen. Its `theta` is 5x its `sigmaS`, so one captured entry
 * silences a whole family at once and no daughter can diverge out of the window.
 *
 * WHY THESE VALUES. Two requirements pull against each other, and these are
 * where they were measured to separate.
 *
 *  - SURVIVAL is set by the escape ratio `sigmaS / theta`: a daughter's
 *    sequence coordinate has to be able to outrun its own family's trap.
 *    Measured over seeds 1/2/3/5/7/11/13, everything else held at the values
 *    below, counting worlds still alive at generation 6000:
 *
 *        ratio 1.50 (sigmaS 0.06)   4 of 7   deaths at gen 2598, 4133, 4506
 *        ratio 1.75 (sigmaS 0.07)   6 of 7   death  at gen 714
 *        ratio 2.00 (sigmaS 0.08)   7 of 7
 *        ratio 2.50 (sigmaS 0.10)   7 of 7
 *
 *    `sigmaS = 0.08` is that 2.0. `tests/guards/bloat-arm.ts` reaches the same
 *    regime from the other side and documents it: at 2x, "escape by divergence
 *    is routine", and its silenced arm settles instead of dying.
 *
 *  - SPEED is set by repertoire growth, which is the CAPTURE rate: `c`, and the
 *    transposition rate that feeds copies into cluster sites. `rMax = 0.2` is
 *    the load-bearing one. Left at 1, `r` evolves upward without a ceiling
 *    (0.87 on the arm this replaced) and the element explores sequence space
 *    fast enough that the repertoire runs away. Measured at `c = 0.005`,
 *    seeds 1/2/3/5/7, horizon 2500: with `rMax = 1`, 0 of 5 survive — three
 *    pass 6000 copies by generation 536 and two die by generation 965; with
 *    `rMax = 0.2`, 5 of 5 are alive.
 *
 * EXTINCTION IS NOT A BUG TO BE TUNED AWAY. `tests/guards/three-phases-arm.ts`
 * states it canonically: "Full inactivation implies the family eventually DIES
 * in this model", because `lose` keeps excising silenced copies that silencing
 * prevents from replacing themselves. No parameter set is extinction-proof.
 * These are chosen so full inactivation is not REACHED inside a session: 7 of 7
 * seeds alive at generation 6000, and seeds 1 and 2 still alive at 11000 with
 * active, silenced and domesticated copies all present throughout.
 */
export const TOY_DEFAULTS: Partial<Params> = {
  N: 60,
  S: 1000,
  c: 0.005,
  r0: 0.1,
  rMax: 0.2,
  sigmaR: 0.05,
  sigmaS: 0.08,
  theta: 0.04,
  v: 0.01,
  a: 0.001,
  b: 0.001,
  d: 0.0005,
  dTol: 0.002,
  t: 0,
  beta: 0.02,
  pDom: 0.02,
  wDom: 0.01,
};

const params: Params = defaultParams(TOY_DEFAULTS);
let world: World = createWorld(params);
let snapshots: Snapshot[] = [observe(world)];
/** Generations advanced per animation frame. The toy must feel fast. */
let speed = 3;

const fieldCanvas = document.getElementById("field") as HTMLCanvasElement;
const readout = document.getElementById("readout") as HTMLDivElement;

function fit(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function frame(): void {
  for (let i = 0; i < speed; i++) step(world);
  const snap = observe(world);
  snapshots.push(snap);
  if (snapshots.length > 4000) snapshots = snapshots.slice(-4000);

  const rect = fieldCanvas.getBoundingClientRect();
  drawField(fit(fieldCanvas), world, rect.width, rect.height);

  readout.textContent = [
    `gen        ${snap.generation}`,
    `copies     ${snap.totalCopies}`,
    `active     ${snap.activeCopies}`,
    `silenced   ${snap.silencedCopies}`,
    `domestic.  ${snap.domesticatedCopies}`,
    `mean rate  ${snap.meanRate.toFixed(4)}`,
    `w/ piRNA   ${(snap.fractionWithRepertoire * 100).toFixed(1)}%`,
  ].join("\n");

  requestAnimationFrame(frame);
}

/**
 * THE TOY GETS SLOWER THE LONGER IT RUNS, WITHOUT BOUND — AND A POKE FIXES IT.
 *
 * `isSilenced` (`sim/silencing.ts`) scans a genome's whole piRNA repertoire for
 * every copy, and `trap` (`sim/phases/trap.ts`) only ever APPENDS to that
 * repertoire — nothing removes an entry — so one silencing pass costs
 * O(copies x repertoire) over a repertoire that grows for as long as the world
 * runs. Measured at the defaults above, seed 1, as mean entries per genome. The
 * count is deterministic and reproduces on any machine, which is why it, and
 * not a wall-clock figure, is the number quoted first:
 *
 *     gen     250   1000   2000   4500   6000   8000  11000
 *     rep       7     54    122    276    358    486    660
 *     copies 1096   1494   1750    782   1893   1550   1512
 *
 * Copy number has no trend across that whole range; the growth is entirely the
 * repertoire's, and the cost of a pass rises about 125x while the population it
 * scans does not change size.
 *
 * What that costs in practice, on the machine this was derived on, at
 * `speed = 3` (fps at wall-clock marks, seed 1):
 *
 *      2 s  gen  774   rep  40   129 fps
 *     10 s  gen 1878   rep 115    39 fps
 *     20 s  gen 2706   rep 167    28 fps
 *     30 s  gen 3294   rep 203    20 fps
 *     90 s  gen 5736   rep 345    12 fps
 *
 * So roughly the first 20 seconds are above 25 fps. That box was under load
 * from unrelated work and timed the same workload at 9.4 and 23.6 ms/step on
 * two separate runs, so treat every figure in that second table as a floor
 * rather than a measurement of the model.
 *
 * `reset()` below rebuilds the world from scratch, which empties the repertoire
 * and returns the frame rate to its opening value. That is the session shape
 * this toy is for — the verb is PERTURBING THE WORLD, so every perturbation is
 * also a reprieve, and the degradation is bounded in practice by how often the
 * visitor pokes it.
 *
 * The unbounded cost is a real defect in the core and is deliberately NOT fixed
 * here. The obvious fix — keep `repertoire` sorted and binary-search it —
 * changes that array's ORDER, which `reproduce`'s dedup and `stateHash` both
 * read, so it needs its own task and a check against golden hash `9c15fd28`.
 * `drawField` gets the same speedup without that risk by sorting a per-frame
 * COPY; see `web/render/field.ts`.
 */
// Exposed for guard 7 and for poking from the console.
Object.assign(window, {
  __sim: {
    get world() {
      return world;
    },
    get snapshots() {
      return snapshots;
    },
    setSpeed(n: number) {
      speed = n;
    },
    reset(overrides: Partial<Params> = {}) {
      world = createWorld(defaultParams({ ...params, ...overrides }));
      snapshots = [observe(world)];
    },
  },
});

requestAnimationFrame(frame);
