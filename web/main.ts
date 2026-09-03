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
import { mountControls, rebuildWorld } from "./controls.js";
import { BAR_FLOOR_PX, barLength, sharePercent } from "./tally.js";
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  SILENCED_COLOUR,
  drawField,
  fieldRect,
  spanGeometry,
} from "./render/field.js";
import { drawTimeline } from "./render/timeline.js";
import { drawScatter } from "./render/scatter.js";
import { drawClusterInset } from "./render/cluster-inset.js";

export { TOY_DEFAULTS };

/**
 * ONE PARAMS OBJECT FOR THE WHOLE SESSION, AND IT NEVER GETS REPLACED.
 *
 * `createWorld` stores this object by reference, so `world.params === params`
 * and every phase of `step` reads what the controls write. `reset()` below
 * rebuilds the world through `rebuildWorld`, which assigns INTO this object
 * rather than making a new one — see the note there for why a `let` and a
 * reassignment would silently break every slider on the first restart.
 */
const params: Params = defaultParams(TOY_DEFAULTS);
let world: World = createWorld(params);
let snapshots: Snapshot[] = [observe(world)];
/** Generations advanced per animation frame. The toy must feel fast. */
let speed = 3;

const fieldCanvas = document.getElementById("field") as HTMLCanvasElement;
const timelineCanvas = document.getElementById("timeline") as HTMLCanvasElement;
const scatterCanvas = document.getElementById("scatter") as HTMLCanvasElement;
const insetCanvas = document.getElementById(
  "cluster-inset",
) as HTMLCanvasElement;
const readout = document.getElementById("readout") as HTMLDivElement;
const el = (id: string) => document.getElementById(id) as HTMLElement;

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

/**
 * Quantities the readout shows that `Snapshot` does not carry, kept on the same
 * ring as the snapshots so they can have deltas too. `in cluster` is the one
 * number the whole cluster feature exists to make legible, and it was the only
 * row without one.
 */
interface Trace {
  generation: number;
  inCluster: number;
  meanRepertoire: number;
}
let traces: Trace[] = [];

/**
 * Change in `pick` over the last `gens` generations, or null if the session is
 * not that old yet.
 *
 * `copies`, `active` and `mean rate` all move by only a few percent from one
 * look to the next -- `active` 1289/1273/1246 and `mean rate` 0.180/0.184/0.186
 * across a whole session -- so at a glance only the last digit changes and they
 * read as constants even though they are not. The delta is the cheapest thing
 * that shows the direction of travel. It is measured over GENERATIONS, not over
 * frames, so it means the same thing on a fast machine and a slow one.
 */
function deltaOver(gens: number, pick: (s: Snapshot) => number): number | null {
  return deltaIn(snapshots, gens, pick, (s) => s.generation);
}

function traceDelta(gens: number, pick: (t: Trace) => number): number | null {
  return deltaIn(traces, gens, pick, (t) => t.generation);
}

function deltaIn<T>(
  ring: T[],
  gens: number,
  pick: (x: T) => number,
  gen: (x: T) => number,
): number | null {
  if (ring.length === 0) return null;
  const now = ring[ring.length - 1]!;
  for (let i = ring.length - 1; i >= 0; i--) {
    if (gen(now) - gen(ring[i]!) >= gens) return pick(now) - pick(ring[i]!);
  }
  return null;
}

/**
 * One readout line, as HTML so the delta can carry a sign colour.
 *
 * THE THREE STATES OF THE DELTA COLUMN ARE DISTINCT, which they were not:
 *   blank  this row has no delta -- either untracked (`gen`, which is the
 *          clock and cannot meaningfully have one) or the session is younger
 *          than the window
 *   ~      tracked, and genuinely unchanged over the window
 *   +N/-N  tracked, and changed
 *
 * Previously `null` and "unchanged" both rendered `~`, so `gen`, `in cluster`
 * and `piRNA entries` displayed `~` in every frame of a session in which they
 * ran 453->4413, 1->14 and 17.4->271.2. Two of those are monotone-increasing
 * and can never be unchanged, so the glyph was not merely uninformative, it was
 * false. `in cluster` and `piRNA entries` now have real deltas; only `gen`
 * blanks, and it blanks rather than tildes.
 */
function row(
  label: string,
  value: string,
  delta: number | null,
  digits = 0,
  tracked = true,
): string {
  let d: string;
  let cls = "";
  if (!tracked || delta === null) {
    d = "";
  } else if (Math.abs(delta) < (digits > 0 ? 5e-4 : 0.5)) {
    d = "~";
  } else {
    d = (delta > 0 ? "+" : "-") + Math.abs(delta).toFixed(digits);
    cls = delta > 0 ? "up" : "dn";
  }
  const cell = d.padStart(8);
  const body = cls ? `<span class="${cls}">${cell}</span>` : cell;
  return label.padEnd(14) + value.padStart(7) + body;
}

const BARS = {
  active: { bar: "bar-active", n: "n-active", colour: ACTIVE_COLOUR },
  silenced: { bar: "bar-silenced", n: "n-silenced", colour: SILENCED_COLOUR },
  domesticated: {
    bar: "bar-domesticated",
    n: "n-domesticated",
    colour: DOMESTICATED_COLOUR,
  },
};
/** Track width in px, matching `#tally .track` in index.html. */
const TRACK_PX = 114;

/**
 * NORMALISED TO TOTAL, NOT TO THE LARGEST BAR -- see `web/tally.ts`, which owns
 * the arithmetic so `tests/render-field.test.ts` can assert that a bar's length
 * and its printed share are the same quantity.
 */
function setBar(key: keyof typeof BARS, count: number, total: number): void {
  const spec = BARS[key];
  const bar = el(spec.bar);
  const { px, floored } = barLength(count, total, TRACK_PX, BAR_FLOOR_PX);
  bar.style.width = `${px}px`;
  bar.style.background = floored ? "transparent" : spec.colour;
  bar.style.border = floored ? `1px solid ${spec.colour}` : "none";
  el(spec.n).textContent =
    `${count} · ${sharePercent(count, total).toFixed(1)}%`;
}

function frame(): void {
  for (let i = 0; i < speed; i++) step(world);
  const snap = observe(world);
  snapshots.push(snap);
  if (snapshots.length > 4000) snapshots = snapshots.slice(-4000);

  const rect = fieldCanvas.getBoundingClientRect();
  drawField(fit(fieldCanvas), world, rect.width, rect.height);

  const tRect = timelineCanvas.getBoundingClientRect();
  drawTimeline(fit(timelineCanvas), snapshots, tRect.width, tRect.height);

  const sRect = scatterCanvas.getBoundingClientRect();
  drawScatter(fit(scatterCanvas), world, sRect.width, sRect.height);

  // The inset's magnification is stated on the inset itself, so it is derived
  // from the field's LIVE px/site rather than from a remembered constant: the
  // field canvas is `1fr` in a viewport-sized grid, so its scale changes with
  // the window and a hard-coded factor would be wrong at every size but one.
  const iRect = insetCanvas.getBoundingClientRect();
  const cluster = spanGeometry(
    world.params,
    fieldRect(rect.width, rect.height),
  ).cluster;
  drawClusterInset(
    fit(insetCanvas),
    world,
    iRect.width,
    iRect.height,
    cluster ? cluster.pxPerSite : 0,
  );

  const inCluster = copiesInCluster(world);
  const meanRep = meanRepertoire(world);
  traces.push({
    generation: snap.generation,
    inCluster,
    meanRepertoire: meanRep,
  });
  if (traces.length > 4000) traces = traces.slice(-4000);

  // Every row has to be a row that MOVES. `fractionWithRepertoire` used to sit
  // in this block and read 100.0% at every timepoint of every session -- once
  // the trap has spread it never falls again, so it carried no information for
  // the whole run. Mean repertoire size is the same quantity's live edge, and
  // it is also the number the degradation note below is about.
  readout.innerHTML = [
    row("gen", String(snap.generation), null, 0, false),
    row(
      "copies",
      String(snap.totalCopies),
      deltaOver(600, (s) => s.totalCopies),
    ),
    row(
      "active",
      String(snap.activeCopies),
      deltaOver(600, (s) => s.activeCopies),
    ),
    row(
      "silenced",
      String(snap.silencedCopies),
      deltaOver(600, (s) => s.silencedCopies),
    ),
    row(
      "domesticated",
      String(snap.domesticatedCopies),
      deltaOver(600, (s) => s.domesticatedCopies),
    ),
    row(
      "in cluster",
      String(inCluster),
      traceDelta(600, (t) => t.inCluster),
    ),
    row(
      "piRNA entries",
      meanRep.toFixed(1),
      traceDelta(600, (t) => t.meanRepertoire),
      1,
    ),
    row(
      "mean rate",
      snap.meanRate.toFixed(3),
      deltaOver(600, (s) => s.meanRate),
      3,
    ),
  ].join("\n");

  const total =
    snap.activeCopies + snap.silencedCopies + snap.domesticatedCopies;
  setBar("active", snap.activeCopies, total);
  setBar("silenced", snap.silencedCopies, total);
  setBar("domesticated", snap.domesticatedCopies, total);

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
 * silencing pass but NOT `ctx.fillRect` (about 1900 calls per frame at these
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
function reset(overrides: Partial<Params> = {}): void {
  world = rebuildWorld(params, overrides);
  snapshots = [observe(world)];
  traces = [];
  // A reset can move ANY param -- `__sim.reset({ c: 0.04 })` from the console
  // is a supported thing to do -- and a control still showing the old number is
  // a control that lies about what the simulation is reading. The panel's own
  // buttons repaint themselves; this covers everything else.
  panel.repaint();
}

// Exposed for guard 7 and for poking from the console.
Object.assign(window, {
  __sim: {
    get world() {
      return world;
    },
    get snapshots() {
      return snapshots;
    },
    get params() {
      return params;
    },
    setSpeed(n: number) {
      speed = n;
    },
    reset,
  },
});

const panel = mountControls(el("controls-slot"), params, reset);

requestAnimationFrame(frame);
