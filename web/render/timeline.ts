import type { Snapshot } from "../../sim/index.js";
import {
  ACTIVE_COLOUR,
  FIELD_BG,
  SILENCED_SMALL,
  compositeOver,
  contrastRatio,
  type Rect,
} from "./field.js";

/* -------------------------------------------------------------------------- *
 * TWO REGIMES ON ONE AXIS, AND WHY NEITHER ALONE WORKS.
 *
 * A LINEAR generation axis loses the past. Measured at `TOY_DEFAULTS`, total
 * copies run 60 / 73 / 105 / 322 / 961 at generations 0 / 10 / 25 / 50 / 100 and
 * then fluctuate in a band with no further shape, so the whole invasion is over
 * by generation 100 -- 0.56 s after load at `speed = 3` and 60 fps. On a linear
 * axis it is 2.5% of the width by generation 4000 and shrinks without bound.
 *
 * A LOGARITHMIC axis loses the present, which is worse, because the present is
 * what this panel is for. Pixels per generation at the right edge of a log axis
 * are `w / (ln10 * g)`: measured 0.318 px/gen two seconds in, and 0.027 px/gen
 * at thirty seconds. A poke lands at the CURRENT generation, so its consequence
 * over the following 100 generations would occupy 2.7 px at 30 s and about
 * 1.3 px at 60 s, shrinking as 1/g. A panel titled "where a poke's consequence
 * becomes legible" cannot put its most compressed point at the moment of the
 * poke.
 *
 * So the axis is SPLIT: `log10(1 + g)` over the left 70%, a hard break, then a
 * LINEAR window over the last `LINEAR_SPAN` generations over the right 30%. At
 * a 1048px plot that is 1.56 px/generation in the window -- 58x the log axis'
 * 0.027 px/gen at thirty seconds -- while the invasion still holds ~39% of the
 * full width at generation 4000 and ~34% at 12000, against 2.5% and 0.8%
 * linear. Both sections are captioned, so a reader is never guessing which
 * regime a stretch of curve is in.
 * -------------------------------------------------------------------------- */

/** Generations held by the linear window on the right. */
export const LINEAR_SPAN = 200;
/** Share of the plot given to the logarithmic overview. */
const LOG_FRACTION = 0.7;
/** The gutter between the two regimes. */
const BREAK_PX = 10;

/* -------------------------------------------------------------------------- *
 * Palette.
 *
 * `silenced` is drawn in `SILENCED_SMALL`, the project's thin-mark blue, NOT in
 * the field's `SILENCED_COLOUR`; `web/render/field.ts` carries the measurement
 * and `web/index.html`'s legend carries the one note that explains it. There is
 * no panel-local legend here -- two legends showing one state in two colours
 * document a contradiction rather than resolving it.
 * -------------------------------------------------------------------------- */

export const TOTAL_LINE = "#d8dee9";
export const ACTIVE_LINE = ACTIVE_COLOUR;
export const SILENCED_LINE = SILENCED_SMALL;
/** Gridlines, ticks and their labels. 6.559:1 against `FIELD_BG`. */
export const AXIS_LABEL = "#939eac";
/** Gridline rules. Annotation only, never drawn over a series. */
const GRID = "#252b34";
/** The page ground, painted into the break so the cut reads as a cut. */
const PAGE_BG = "#0d0f12";

/**
 * Alpha of a series' min-max band.
 *
 * Measured composites over `FIELD_BG`: a band clears 1.88:1 (silenced), 1.84:1
 * (active) and 4.19:1 (total) against the ground, so it is visible; and the
 * full-strength median line drawn on top clears 2.15:1, 2.17:1 and 3.15:1
 * against its own band, so the centre is legible inside the spread. Both halves
 * are asserted.
 */
export const BAND_ALPHA = 0.5;
export const BAND_FILL: Record<string, string> = {
  [TOTAL_LINE]: compositeOver(TOTAL_LINE, FIELD_BG, BAND_ALPHA),
  [SILENCED_LINE]: compositeOver(SILENCED_LINE, FIELD_BG, BAND_ALPHA),
  [ACTIVE_LINE]: compositeOver(ACTIVE_LINE, FIELD_BG, BAND_ALPHA),
};

const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 22;
const PAD_B = 32;

const MONO = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
/**
 * Advance of one character in `MONO`, used to reserve label boxes.
 *
 * A canvas 2D context can measure text and this code does not, because the
 * suite drives the real draw functions through a recording stub that has no
 * font engine; a layout depending on `measureText` would be a layout no test
 * could check. 6.0 is an UPPER BOUND on the real advance -- the audited render
 * measured 5.9 px for this font at this size -- so every reserved box is at
 * least as wide as the glyphs it stands for, and over-reserving can only
 * suppress a label, never overlap one.
 */
export const ADVANCE = 6;

export interface AxisSplit {
  /** The logarithmic overview, `[g0, gBreak]`. */
  logRect: Rect;
  /** The linear window, `[gBreak, gN]`. */
  linRect: Rect;
  gBreak: number;
  /** Pixels per generation inside the linear window. */
  pxPerGen: number;
}

export interface TimelineGeometry {
  plot: Rect;
  g0: number;
  gN: number;
  yTop: number;
  /** Null when the whole window already fits inside the linear span. */
  split: AxisSplit | null;
  xAt: (generation: number) => number;
  yAt: (count: number) => number;
  /** Decades inside the logarithmic section, if any. */
  decades: number[];
  /**
   * Generations labelled because the log section holds fewer than two decades.
   *
   * THE RING MAKES THIS THE NORMAL CASE EVENTUALLY, not an edge case.
   * `web/main.ts` caps `snapshots` at 4000 frames, which at `speed = 3` is
   * 12,000 generations, so about 67 s in `g0` starts walking forward. From
   * roughly generation 22,000 to 100,000 the window `[g0, gN]` contains NO power
   * of ten, so `decades` was empty and an axis with zero labelled references was
   * captioned "log" while `log10` is near-affine across it. Every fixture in the
   * suite started at generation 0, so the case was never exercised.
   */
  endpointTicks: number[];
  yTicks: number[];
}

/**
 * The smallest 1/2/2.5/5 x 10^k value at or above `v`.
 *
 * An autoscaled axis topped at the raw maximum has no readable scale: the peak
 * touches the ceiling by construction and every other height is a fraction of a
 * number nobody is shown. Rounding up means the gridlines carry whole counts.
 */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const k = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * k + 1e-9) return m * k;
  }
  return 10 * k;
}

export function timelineGeometry(
  snapshots: readonly Snapshot[],
  width: number,
  height: number,
): TimelineGeometry | null {
  if (snapshots.length < 2) return null;
  const g0 = snapshots[0]!.generation;
  const gN = snapshots[snapshots.length - 1]!.generation;
  if (!(gN > g0)) return null;

  const plot: Rect = {
    x: PAD_L,
    y: PAD_T,
    w: Math.max(1, width - PAD_L - PAD_R),
    h: Math.max(1, height - PAD_T - PAD_B),
  };

  const L = (g: number) => Math.log10(1 + g);
  let split: AxisSplit | null = null;
  if (gN - g0 > LINEAR_SPAN) {
    const usable = Math.max(1, plot.w - BREAK_PX);
    const logW = usable * LOG_FRACTION;
    const linW = usable - logW;
    split = {
      logRect: { x: plot.x, y: plot.y, w: logW, h: plot.h },
      linRect: { x: plot.x + logW + BREAK_PX, y: plot.y, w: linW, h: plot.h },
      gBreak: gN - LINEAR_SPAN,
      pxPerGen: linW / LINEAR_SPAN,
    };
  }

  let xAt: (g: number) => number;
  if (!split) {
    xAt = (g) => plot.x + ((g - g0) / (gN - g0)) * plot.w;
  } else {
    const s = split;
    const l0 = L(g0);
    const span = Math.max(1e-12, L(s.gBreak) - l0);
    xAt = (g) =>
      g <= s.gBreak
        ? s.logRect.x + ((L(g) - l0) / span) * s.logRect.w
        : s.linRect.x + ((g - s.gBreak) / LINEAR_SPAN) * s.linRect.w;
  }

  let peak = 1;
  for (const s of snapshots) if (s.totalCopies > peak) peak = s.totalCopies;
  const yTop = niceCeil(peak);
  const yAt = (v: number) => plot.y + plot.h - (v / yTop) * plot.h;

  const logEnd = split ? split.gBreak : gN;
  const decades: number[] = [];
  for (let d = 1; d <= logEnd; d *= 10) if (d > g0) decades.push(d);
  const endpointTicks = decades.length < 2 ? [g0, logEnd] : [];

  return {
    plot,
    g0,
    gN,
    yTop,
    split,
    xAt,
    yAt,
    decades,
    endpointTicks,
    yTicks: [0, yTop / 2, yTop],
  };
}

/** The three series, in draw order. Each key is a field of `Snapshot`. */
export const SERIES: readonly [keyof Snapshot, string, string][] = [
  ["totalCopies", TOTAL_LINE, "total"],
  ["silencedCopies", SILENCED_LINE, "silenced"],
  ["activeCopies", ACTIVE_LINE, "active"],
];

export interface ColumnStat {
  /** Pixel column, rounded. */
  x: number;
  min: number;
  max: number;
  median: number;
  n: number;
}

/**
 * One min/max/median per PIXEL COLUMN of the logarithmic section.
 *
 * A plain polyline over the log section is a lie about resolution: measured, the
 * tail was 1673 vertices in 60 px, drawn as a 393-copy-tall smear -- 16% of the
 * y range -- in every column. Two of Kofler's three phases live inside that band
 * and neither read as shape. A min-max band plus a median line carries the same
 * information and gives the plateau a stable centre.
 */
export function logColumns(
  snapshots: readonly Snapshot[],
  key: keyof Snapshot,
  geom: TimelineGeometry,
): ColumnStat[] {
  const end = geom.split ? geom.split.gBreak : geom.gN;
  const buckets = new Map<number, number[]>();
  for (const s of snapshots) {
    if (s.generation > end) continue;
    const x = Math.round(geom.xAt(s.generation));
    const bucket = buckets.get(x);
    if (bucket) bucket.push(s[key] as number);
    else buckets.set(x, [s[key] as number]);
  }
  const out: ColumnStat[] = [];
  for (const [x, vs] of buckets) {
    vs.sort((a, b) => a - b);
    out.push({
      x,
      min: vs[0]!,
      max: vs[vs.length - 1]!,
      median: vs[Math.floor(vs.length / 2)]!,
      n: vs.length,
    });
  }
  out.sort((a, b) => a.x - b.x);
  return out;
}

export interface Label {
  x: number;
  text: string;
  align: "left" | "center" | "right";
}

/**
 * The tick labels that fit, in priority order, each reserving its own box plus
 * two character widths of clearance.
 *
 * The collision this prevents was live: `generation (log)1`, a decade label
 * 3 px from the caption where the advance is 5.9 px, SLIDING THROUGH the
 * caption as the domain grew.
 */
export function placeLabels(candidates: Label[]): Label[] {
  const placed: Label[] = [];
  const boxes: [number, number][] = [];
  for (const c of candidates) {
    const w = c.text.length * ADVANCE;
    const left =
      c.align === "left" ? c.x : c.align === "right" ? c.x - w : c.x - w / 2;
    const a = left - 2 * ADVANCE;
    const b = left + w + 2 * ADVANCE;
    if (boxes.some(([p, q]) => a < q && b > p)) continue;
    boxes.push([a, b]);
    placed.push(c);
  }
  return placed;
}

/**
 * Total, active and silenced copy counts against generation: total rises,
 * active peaks and falls, silenced rises to meet it.
 *
 * DOMESTICATED COPIES ARE DELIBERATELY NOT A FOURTH SERIES. Measured, the count
 * swings between 0 and 45 against totals of 1200-2100, so on a 0-2500 axis
 * 140 px tall it is a line 0.5 to 2.5 px above the floor at every timepoint of
 * every measured session. `total = active + silenced + domesticated` by
 * construction in `sim/observe.ts`, so the gap between the top curve and the two
 * below it IS the domesticated count.
 */
export function drawTimeline(
  ctx: CanvasRenderingContext2D,
  snapshots: readonly Snapshot[],
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  const geom = timelineGeometry(snapshots, width, height);
  if (!geom) return;
  const { plot, xAt, yAt, split } = geom;

  ctx.fillStyle = FIELD_BG;
  if (split) {
    ctx.fillRect(split.logRect.x, plot.y, split.logRect.w, plot.h);
    ctx.fillRect(split.linRect.x, plot.y, split.linRect.w, plot.h);
    ctx.fillStyle = PAGE_BG;
    ctx.fillRect(split.logRect.x + split.logRect.w, plot.y, BREAK_PX, plot.h);
  } else {
    ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
  }

  ctx.font = MONO;
  ctx.textBaseline = "alphabetic";

  for (const v of geom.yTicks) {
    const y = Math.round(yAt(v));
    ctx.fillStyle = GRID;
    if (split) {
      ctx.fillRect(split.logRect.x, y, split.logRect.w, 1);
      ctx.fillRect(split.linRect.x, y, split.linRect.w, 1);
    } else {
      ctx.fillRect(plot.x, y, plot.w, 1);
    }
    ctx.fillStyle = AXIS_LABEL;
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(v)), plot.x - 6, y + 3);
  }

  // The break, marked on both faces so the discontinuity is a drawn object.
  if (split) {
    ctx.fillStyle = AXIS_LABEL;
    ctx.fillRect(split.logRect.x + split.logRect.w, plot.y, 1, plot.h);
    ctx.fillRect(split.linRect.x - 1, plot.y, 1, plot.h);
  }

  // Tick rules, then labels. The linear window's endpoints are placed first,
  // because that section is what the panel is for; the log section's references
  // take what is left.
  ctx.fillStyle = GRID;
  for (const g of [...geom.endpointTicks, ...geom.decades]) {
    const x = Math.round(xAt(g));
    if (x > plot.x && x < plot.x + plot.w) ctx.fillRect(x, plot.y, 1, plot.h);
  }

  const baseline = plot.y + plot.h + 13;
  const candidates: Label[] = [];
  if (split) {
    candidates.push(
      { x: split.linRect.x, text: String(split.gBreak), align: "left" },
      {
        x: split.linRect.x + split.linRect.w,
        text: String(geom.gN),
        align: "right",
      },
    );
  }
  for (const g of [...geom.endpointTicks, ...geom.decades]) {
    candidates.push({ x: xAt(g), text: String(g), align: "center" });
  }
  ctx.fillStyle = AXIS_LABEL;
  for (const l of placeLabels(candidates)) {
    ctx.textAlign = l.align;
    ctx.fillText(l.text, l.x, baseline);
  }

  // Section captions, on their own row so they can never collide with a tick.
  ctx.textAlign = "center";
  if (split) {
    ctx.fillText(
      "generation, log",
      split.logRect.x + split.logRect.w / 2,
      baseline + 12,
    );
    ctx.fillText(
      `last ${LINEAR_SPAN}, linear`,
      split.linRect.x + split.linRect.w / 2,
      baseline + 12,
    );
  } else {
    ctx.fillText("generation, linear", plot.x + plot.w / 2, baseline + 12);
  }

  for (const [key, colour] of SERIES) {
    // Logarithmic section: a min-max band per pixel column, with a median line.
    const cols = logColumns(snapshots, key, geom);
    ctx.fillStyle = BAND_FILL[colour]!;
    for (const c of cols) {
      const top = yAt(c.max);
      // A column whose spread is zero still gets a 1px band, but never one that
      // hangs below the plot: at count 0 the top and bottom coincide ON the
      // floor, and an unclamped 1px band put a painted row outside the panel.
      const bottom = Math.min(plot.y + plot.h, Math.max(top + 1, yAt(c.min)));
      ctx.fillRect(c.x, top, 1, bottom - top);
    }
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    cols.forEach((c, i) => {
      const y = yAt(c.median);
      if (i === 0) ctx.moveTo(c.x, y);
      else ctx.lineTo(c.x, y);
    });
    ctx.stroke();

    // Linear window: every snapshot, as itself. At `speed = 3` that is about 67
    // vertices across ~310 px, so nothing is being hidden by drawing them all.
    if (split) {
      const tail = snapshots.filter((s) => s.generation > split.gBreak);
      ctx.beginPath();
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      tail.forEach((s, i) => {
        const x = xAt(s.generation);
        const y = yAt(s[key] as number);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  const last = snapshots[snapshots.length - 1]!;
  ctx.fillStyle = AXIS_LABEL;
  ctx.textAlign = "right";
  ctx.fillText(
    `gen ${last.generation} · ${last.totalCopies} copies`,
    plot.x + plot.w,
    plot.y - 8,
  );
}

/** Exported so the palette notes above are claims the suite can check. */
export const SERIES_CONTRAST = (): number[] =>
  SERIES.map(([, colour]) => contrastRatio(colour, FIELD_BG));
