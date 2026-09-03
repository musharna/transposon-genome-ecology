import {
  createWorld,
  defaultParams,
  isClusterSite,
  observe,
  step,
  type Params,
  type Snapshot,
  type World,
} from "../sim/index.js";
import { TOY_DEFAULTS } from "./params.js";
import { drawField } from "./render/field.js";

export { TOY_DEFAULTS };

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

/** Copies currently sitting in a piRNA cluster site, population-wide. */
function copiesInCluster(w: World): number {
  let n = 0;
  for (const genome of w.genomes) {
    for (const copy of genome.copies) {
      if (isClusterSite(copy.site, w.params)) n++;
    }
  }
  return n;
}

/** Mean piRNA repertoire size. The trap's own state, and what degrades. */
function meanRepertoire(w: World): number {
  if (w.genomes.length === 0) return 0;
  let n = 0;
  for (const genome of w.genomes) n += genome.repertoire.length;
  return n / w.genomes.length;
}

function pad(label: string, value: string): string {
  return label.padEnd(14) + value.padStart(7);
}

function frame(): void {
  for (let i = 0; i < speed; i++) step(world);
  const snap = observe(world);
  snapshots.push(snap);
  if (snapshots.length > 4000) snapshots = snapshots.slice(-4000);

  const rect = fieldCanvas.getBoundingClientRect();
  drawField(fit(fieldCanvas), world, rect.width, rect.height);

  // Every row here has to be a row that MOVES. `fractionWithRepertoire` used to
  // sit in this block and read 100.0% at every timepoint of every session --
  // once the trap has spread it never falls again, so it carried no information
  // for the whole run. Mean repertoire size is the same quantity's live edge,
  // and it is also the number the degradation note below is about.
  readout.textContent = [
    pad("gen", String(snap.generation)),
    pad("copies", String(snap.totalCopies)),
    pad("active", String(snap.activeCopies)),
    pad("silenced", String(snap.silencedCopies)),
    pad("domesticated", String(snap.domesticatedCopies)),
    pad("in cluster", String(copiesInCluster(world))),
    pad("piRNA entries", meanRepertoire(world).toFixed(1)),
    pad("mean rate", snap.meanRate.toFixed(3)),
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
 * runs. Measured at `TOY_DEFAULTS`, seed 1, as mean entries per genome. The
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
 * TREAT THAT SECOND TABLE AS A CEILING ON A FLOOR, AND DO NOT QUOTE IT AS THE
 * FRAME RATE. It was produced by a harness that ran the steps, `observe` and the
 * silencing pass but NOT `ctx.fillRect` (1300-2000 calls per frame at these
 * defaults) and NOT `fit()`'s per-frame backing-store reallocation, so real
 * in-browser fps is lower than every figure in it — by an amount nobody has
 * measured yet. It was also taken on a box under unrelated load that timed the
 * same workload at 9.4 and 23.6 ms/step on two separate runs. The 20 s row sits
 * on the 25 fps bar in the harness, which means in a browser it is under it.
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
