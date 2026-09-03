import type { Params, World } from "../../sim/index.js";
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  FIELD_BG,
  SILENCED_SMALL,
  compositeOver,
  nearestSignedDistance,
  sortedRepertoire,
  type Rect,
} from "./field.js";
import { placeLabels } from "./timeline.js";

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
 * NOT autoscaled -- see the note above -- but SIZED TO THE DATA rather than to
 * the all-time maximum, which are different things and the first round got the
 * second one. Measured over seeds 1/2/3/5/7 at generations 200/800/2000/4000,
 * 30,722 copies with a non-empty reference:
 *
 *     |d| > 0.3   11.44%        p95  0.444
 *     |d| > 0.4    6.53%        p99  0.717
 *     |d| > 0.5    3.60%        max  1.126
 *     |d| > 0.6    1.92%
 *     |d| > 0.75   0.76%
 *     |d| > 1.0    0.07%
 *
 * At the 1.5 this used to be -- a margin on the 1.126 maximum -- the axis was
 * about twice as wide as its data: binned into thirty tenth-unit bins, 11 of 30
 * were empty two seconds in and 20 of 30 at thirty seconds, with the cloud in
 * 250 px of an 847 px axis and the empty half all on one side, so it read as
 * mis-centred rather than as sparse. 0.6 is still 1.35x p99 and over 4x the
 * observed spread, and it takes the theta separation from 23 px to about 53 px
 * -- which matters, because those two rules carry the panel's whole claim.
 *
 * The price is 1.92% of copies off-scale at any moment. They are neither dropped
 * nor drawn as though they were AT the boundary: an off-scale copy is a 1px
 * TICK rather than a 2px square, flush against the edge, and the count is
 * printed. A pile at the boundary then reads as a pile at the boundary.
 */
export const X_LIMIT = 0.6;

/** Side of a copy's square mark, px. */
export const MARK = 2;
/** Width of an off-scale copy's tick. Narrower than `MARK`, deliberately. */
export const OFF_SCALE_MARK = 1;

const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 22;
const PAD_B = 32;
/**
 * The no-reference lane, and the gutter separating it from the data plane.
 *
 * The gutter is 30px, not 14, and the reason is TEXT rather than graphics: the
 * lane's `none` and the axis' `-0.6` are labels for different things, and at 14
 * their boxes sat 4px apart -- under one character at a 5.9px advance -- so they
 * read as one string. At 30 the reservation pass in `placeLabels` fits both with
 * about five characters of clearance.
 */
const LANE_W = 26;
const LANE_GAP = 30;

const AXIS_LABEL = "#939eac";
/**
 * The theta rules and the rate ceiling. 4.830:1 against `FIELD_BG` AS A COLOUR
 * -- but a 1px rect at a fractional x is painted across two device columns at
 * partial coverage, and the audited render measured the two drawn rules at
 * 1.53:1 and 2.97:1 for exactly that reason. `xAt(±theta)` is therefore rounded
 * to a whole pixel before it is drawn, so a rule paints one full column at its
 * declared colour. Fractional geometry was the same mechanism behind the field's
 * knocked-out edge rules; the fix there was to move the rule, and here it is to
 * land it on the grid.
 */
export const THRESHOLD_RULE = "#7286a8";
/**
 * The wash between the two theta rules, so `between the rules` reads as a REGION
 * rather than as two lines with a gap.
 *
 * Capped exactly as `field.ts`'s span wash is capped, and for the same reason:
 * this is the one tint that touches the data plane, so it may not move a mark's
 * contrast. Measured at alpha 0.10 the composite is #1d232b, dL = 0.0075 over
 * `FIELD_BG`, and marks inside read 3.867:1 (active), 3.926:1 (silenced) and
 * 7.760:1 (domesticated) -- all still over the 3:1 floor. Asserted.
 */
export const THETA_BAND_ALPHA = 0.1;
export const THETA_BAND_FILL = compositeOver(
  THRESHOLD_RULE,
  FIELD_BG,
  THETA_BAND_ALPHA,
);
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

/** The drawn threshold geometry, in whole pixels. */
export interface ThetaRules {
  /** Left and right theta rules, and the rate ceiling. */
  lo: number;
  hi: number;
  ceiling: number;
}

/**
 * Where the three annotation rules are actually painted.
 *
 * THIS EXISTS SO THE DRAWN RULES AND THE TESTED RULES ARE ONE EXPRESSION. In
 * round one they were two: `drawScatter` painted `xAt(±theta)` while the guard
 * derived its band from `geom.xAt(±theta)` independently and never looked at
 * the recorded fills, so changing the drawn coordinate to `xAt(d * 2)` left the
 * whole suite green while the picture asserted a band twice the true silencing
 * width beside a caption still printing the true theta. That is this project's
 * signature defect -- a graphic element whose size does not mean the number
 * beside it -- reintroduced in the very panel built to avoid it.
 *
 * Rounded to whole pixels: see the note on `THRESHOLD_RULE`.
 */
export function thetaRules(p: Params, geom: ScatterGeometry): ThetaRules {
  return {
    lo: Math.round(geom.xAt(-p.theta)),
    hi: Math.round(geom.xAt(p.theta)),
    ceiling: Math.round(geom.yAt(p.rMax)),
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
            ? SILENCED_SMALL
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

  // The threshold. `thetaRules` owns the arithmetic so the drawn geometry and
  // the tested geometry are the same expression, and the rules land on whole
  // pixels so each paints one full column at its declared colour.
  const rules = thetaRules(p, geom);
  ctx.fillStyle = THETA_BAND_FILL;
  ctx.fillRect(rules.lo, plot.y, rules.hi - rules.lo + 1, plot.h);
  ctx.fillStyle = THRESHOLD_RULE;
  ctx.fillRect(rules.lo, plot.y, 1, plot.h);
  ctx.fillRect(rules.hi, plot.y, 1, plot.h);
  ctx.fillRect(plot.x, rules.ceiling, plot.w, 1);

  const placement = placeCopies(world, geom);
  for (const m of placement.marks) {
    const region = m.d === null ? lane : plot;
    const w = m.offScale ? OFF_SCALE_MARK : MARK;
    ctx.fillStyle = m.colour;
    ctx.fillRect(
      Math.min(Math.max(m.x - w / 2, region.x), region.x + region.w - w),
      Math.min(Math.max(m.y - MARK / 2, plot.y), plot.y + plot.h - MARK),
      w,
      MARK,
    );
  }

  // Tick labels, through the timeline's reservation pass, because `none` and
  // `-0.6` are labels for different things that sat 4px apart -- under one
  // character -- and read as one string.
  const baseline = plot.y + plot.h + 13;
  ctx.fillStyle = AXIS_LABEL;
  for (const l of placeLabels([
    { x: lane.x + lane.w / 2, text: "none", align: "center" },
    { x: plot.x, text: `-${X_LIMIT}`, align: "left" },
    { x: plot.x + plot.w, text: `+${X_LIMIT}`, align: "right" },
    { x: xAt(0), text: "0", align: "center" },
  ])) {
    ctx.textAlign = l.align;
    ctx.fillText(l.text, l.x, baseline);
  }
  ctx.textAlign = "center";
  ctx.fillText(
    `distance to nearest piRNA match, in s \u2014 inside the band (\u00b1${p.theta}) is silenced`,
    plot.x + plot.w / 2,
    baseline + 12,
  );

  ctx.textAlign = "right";
  ctx.fillText(`r ${p.rMax}`, lane.x - 6, rules.ceiling + 9);
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
