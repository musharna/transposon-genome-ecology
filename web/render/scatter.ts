import type { Params, World } from "../../sim/index.js";
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  FIELD_BG,
  SILENCED_COLOUR,
  nearestSignedDistance,
  sortedRepertoire,
  type Rect,
} from "./field.js";

/* -------------------------------------------------------------------------- *
 * THE HORIZONTAL AXIS IS NOT `s`.
 *
 * It is the SIGNED DISTANCE from a copy's `s` to the nearest entry in its own
 * genome's piRNA repertoire -- the exact quantity `sim/silencing.ts` thresholds:
 * `Math.abs(copy.s - entry) <= p.theta`. Measured at `TOY_DEFAULTS`, seed 1, the
 * population's absolute `s` range:
 *
 *     gen    10   [-0.05,  0.21]   width 0.25   centre  0.08
 *     gen   100   [-0.78,  0.41]   width 1.18   centre -0.18
 *     gen   400   [-1.94,  1.17]   width 3.11   centre -0.39
 *     gen   800   [ 1.23,  3.25]   width 2.01   centre  2.24
 *     gen  1600   [ 7.33,  8.97]   width 1.64   centre  8.15
 *     gen  3200   [19.14, 21.09]   width 1.94   centre 20.11
 *     gen  4000   [25.31, 27.17]   width 1.87   centre 26.24
 *
 * THE CLOUD DOES NOT SPREAD, IT MARCHES. Width settles near 2 while the centre
 * walks to +26 (seeds 1, 5, 7) or to -26 (seeds 2, 3 -- the direction is not
 * fixed, so the axis has to be symmetric). Plotting absolute `s` on an
 * autoscaled axis, as the brief did, therefore renormalises the whole panel
 * every frame: the cloud fills the width forever and never appears to move, so
 * the one large-scale behaviour the panel exists to show is the one the axis
 * erases. That is the same defect as a bar whose length disagrees with its own
 * label, and it is the third time the defect has been caught in this project.
 *
 * Measured against the trap instead, the axis is stable, `theta` is a pair of
 * fixed vertical rules, and escape from silencing is literally a cluster
 * crossing a threshold. The absolute `s` range is real and now otherwise
 * invisible, so it is printed.
 *
 * WHAT THIS AXIS COSTS, stated because it is not free: the reference is
 * PER-GENOME. Repertoires converge -- the population-wide union is 1.04x the
 * mean per-genome repertoire by generation 2000 -- but they are not identical,
 * and the nearest-entry distance for one fixed `s` still varies across genomes
 * by a mean of 0.106 and a max of 0.261 at generation 4000 (50-point `s` grid),
 * i.e. by several theta. A horizontal cluster here is therefore a family sharing
 * a RELATIONSHIP TO THE TRAP, which is not quite the same thing as sharing an
 * `s`. What is bought for that is a threshold that is exact for every row at
 * once.
 * -------------------------------------------------------------------------- */

/**
 * Half-width of the distance axis, in `s` units.
 *
 * NOT autoscaled -- see the note above. Measured over seeds 1/2/3/5/7 at
 * generations 200/800/2000/4000, 30,722 copies with a non-empty reference: the
 * largest |distance| seen anywhere was 1.126 (seed 5, generation 4000), and
 * 99.8% of copies fall inside 1.0. 1.5 is a 1.33x margin on that worst measured
 * case. Anything beyond it is neither dropped nor silently clamped into the
 * data: it is drawn on the boundary AND counted in the readout, so an off-scale
 * population announces itself instead of piling up invisibly against the edge.
 */
export const X_LIMIT = 1.5;

/** Side of a copy's square mark, px. */
export const MARK = 2;

const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 22;
const PAD_B = 32;
/** The no-reference lane, and the gutter separating it from the data plane. */
const LANE_W = 26;
const LANE_GAP = 14;

const AXIS_LABEL = "#939eac";
/** The theta rules and the rate ceiling. 4.830:1 against `FIELD_BG`. */
export const THRESHOLD_RULE = "#7286a8";
const MONO = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface ScatterGeometry {
  /** The distance-axis data plane. */
  plot: Rect;
  /**
   * The lane for copies whose genome has captured nothing yet. It is a
   * CATEGORY, not a position: its width is arbitrary and carries no quantity,
   * which is why it is separated from the plot by a visible gutter, labelled
   * `none`, and why its population is printed as a count rather than read off
   * an axis. Measured at `TOY_DEFAULTS`, seed 1, it holds every copy in the
   * world until generation ~25, 252 of 322 copies at generation 50, 20 of 961
   * at generation 100 and none from generation 200 -- so it is the first second
   * of every session and of every poke. Dropping those copies would blank the
   * panel for exactly the phase the toy opens on, and dividing by an empty
   * repertoire would put them at NaN.
   */
  lane: Rect;
  /** Distance to px. NOT clamped -- callers decide what to do off-scale. */
  xAt: (d: number) => number;
  /** Rate to px, over the model's own [0, rMax]. */
  yAt: (r: number) => number;
}

export function scatterGeometry(
  p: Params,
  width: number,
  height: number,
): ScatterGeometry {
  const y = PAD_T;
  const h = Math.max(1, height - PAD_T - PAD_B);
  const lane: Rect = { x: PAD_L, y, w: LANE_W, h };
  const plotX = PAD_L + LANE_W + LANE_GAP;
  const plot: Rect = { x: plotX, y, w: Math.max(1, width - plotX - PAD_R), h };
  return {
    plot,
    lane,
    xAt: (d) => plot.x + ((d + X_LIMIT) / (2 * X_LIMIT)) * plot.w,
    yAt: (r) =>
      plot.y + plot.h - (Math.min(Math.max(r, 0), p.rMax) / p.rMax) * plot.h,
  };
}

/** One copy's mark, before it is squared off and clamped into its own region. */
export interface Placed {
  /** Centre of the mark. */
  x: number;
  y: number;
  colour: string;
  /** Signed distance to the nearest piRNA entry, or null with no repertoire. */
  d: number | null;
  /** |d| exceeded `X_LIMIT`, so `x` is the boundary rather than a measurement. */
  offScale: boolean;
}

export interface Placement {
  marks: Placed[];
  offScale: number;
  noReference: number;
  atCeiling: number;
  sMin: number;
  sMax: number;
}

/**
 * Where every live copy goes, as data rather than as pixels, so the suite can
 * check the panel's claims without a canvas.
 *
 * COLOUR AND POSITION ARE THE SAME CLAIM, which is the property that makes this
 * axis worth having: a non-domesticated copy is grey exactly when it lies
 * between the two theta rules, because the colour and the coordinate come from
 * one `nearestSignedDistance` call. `tests/render-panels.test.ts` asserts that
 * mark by mark against `sim/silencing.ts`'s own `isSilenced`.
 *
 * Domesticated copies are exempt from silencing -- `isSilenced` returns false
 * for them whatever their `s` -- so a green mark may sit inside the band. That
 * is the model, not a mis-colouring.
 *
 * Uses `sortedRepertoire`'s per-frame COPY of the repertoire and one binary
 * search per copy, not `isSilenced`'s full scan. `genome.repertoire` is ORDERED
 * state that `stateHash` and `reproduce` both read, so the `.slice()` is
 * load-bearing; the repertoire reaches ~246 entries by generation 4000 and grows
 * without bound, so the scan is a growing per-frame cost.
 */
export function placeCopies(world: World, geom: ScatterGeometry): Placement {
  const p = world.params;
  const marks: Placed[] = [];
  let offScale = 0;
  let noReference = 0;
  let atCeiling = 0;
  let sMin = Infinity;
  let sMax = -Infinity;

  for (const genome of world.genomes) {
    const sorted = sortedRepertoire(genome);
    for (const copy of genome.copies) {
      if (copy.s < sMin) sMin = copy.s;
      if (copy.s > sMax) sMax = copy.s;
      if (copy.r >= p.rMax) atCeiling++;

      const d = nearestSignedDistance(copy.s, sorted);
      const y = geom.yAt(copy.r);

      if (d === null) {
        noReference++;
        marks.push({
          x: geom.lane.x + geom.lane.w / 2,
          y,
          colour: copy.domesticated ? DOMESTICATED_COLOUR : ACTIVE_COLOUR,
          d: null,
          offScale: false,
        });
        continue;
      }

      const over = Math.abs(d) > X_LIMIT;
      if (over) offScale++;
      marks.push({
        x: geom.xAt(Math.min(Math.max(d, -X_LIMIT), X_LIMIT)),
        y,
        colour: copy.domesticated
          ? DOMESTICATED_COLOUR
          : Math.abs(d) <= p.theta
            ? SILENCED_COLOUR
            : ACTIVE_COLOUR,
        d,
        offScale: over,
      });
    }
  }
  return { marks, offScale, noReference, atCeiling, sMin, sMax };
}

/**
 * Every live copy as (distance-to-nearest-piRNA, transposition rate): the trap
 * on x, strategy on y. Both heritable dimensions in one panel.
 *
 * Selection on rate is the whole cloud drifting UP -- measured median `r` runs
 * 0.100 at generation 10 to 0.185 at generation 800 against `rMax = 0.2`, so it
 * climbs from half height to 92% of it and stays there. Between 10% and 27% of
 * copies then sit EXACTLY on `rMax`, because `transpose` clamps there, which is
 * why the ceiling is a drawn rule with its own count: without it that pile-up
 * reads as marks falling off the top of the panel rather than as the model
 * hitting its own limit.
 */
export function drawScatter(
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number,
): void {
  const p = world.params;
  ctx.clearRect(0, 0, width, height);
  if (world.genomes.length === 0) return;

  const geom = scatterGeometry(p, width, height);
  const { plot, lane, xAt, yAt } = geom;

  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
  ctx.fillRect(lane.x, lane.y, lane.w, lane.h);

  ctx.font = MONO;
  ctx.textBaseline = "alphabetic";

  // The threshold, at exactly +/- theta ON THE DATA PLANE'S OWN SCALE, so the
  // band between the rules IS the silenced set rather than an emphasis of it.
  ctx.fillStyle = THRESHOLD_RULE;
  for (const d of [-p.theta, p.theta]) ctx.fillRect(xAt(d), plot.y, 1, plot.h);
  ctx.fillRect(plot.x, yAt(p.rMax), plot.w, 1);

  const placement = placeCopies(world, geom);
  for (const m of placement.marks) {
    const region = m.d === null ? lane : plot;
    ctx.fillStyle = m.colour;
    ctx.fillRect(
      Math.min(Math.max(m.x - MARK / 2, region.x), region.x + region.w - MARK),
      Math.min(Math.max(m.y - MARK / 2, plot.y), plot.y + plot.h - MARK),
      MARK,
      MARK,
    );
  }

  const baseline = plot.y + plot.h + 13;
  ctx.fillStyle = AXIS_LABEL;
  ctx.textAlign = "center";
  ctx.fillText(`-${X_LIMIT}`, plot.x, baseline);
  ctx.fillText("0", xAt(0), baseline);
  ctx.fillText(`+${X_LIMIT}`, plot.x + plot.w, baseline);
  ctx.fillText("none", lane.x + lane.w / 2, baseline);
  ctx.fillText(
    `distance to nearest piRNA match, in s -- between the rules (${"±"}${p.theta}) is silenced`,
    plot.x + plot.w / 2,
    baseline + 12,
  );

  ctx.textAlign = "right";
  ctx.fillText(`r ${p.rMax}`, lane.x - 6, yAt(p.rMax) + 9);
  ctx.fillText("0", lane.x - 6, plot.y + plot.h);

  ctx.textAlign = "left";
  const bits = [
    `s in [${placement.sMin.toFixed(2)}, ${placement.sMax.toFixed(2)}] width ${(placement.sMax - placement.sMin).toFixed(2)}`,
    `no reference ${placement.noReference}`,
    `at rMax ${placement.atCeiling}`,
  ];
  if (placement.offScale > 0) bits.push(`OFF-SCALE ${placement.offScale}`);
  ctx.fillText(bits.join("   ·   "), plot.x, plot.y - 8);
}
