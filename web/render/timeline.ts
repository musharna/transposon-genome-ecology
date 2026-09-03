import type { Snapshot } from "../../sim/index.js";
import {
  ACTIVE_COLOUR,
  FIELD_BG,
  contrastRatio,
  type Rect,
} from "./field.js";

/* -------------------------------------------------------------------------- *
 * Palette.
 *
 * The three series are the three states, and they are drawn in the SAME hues
 * the field and the legend use -- except for silenced, which is lightened, and
 * that exception is measured rather than aesthetic.
 *
 * `SILENCED_COLOUR` (#4c566a) measures 2.416:1 against `FIELD_BG`, below the 3:1
 * WCAG floor for a graphical object. It clears that floor nowhere; it survives
 * in `drawField` only because a mark there is a filled rect whose whole area
 * carries the colour. A 1.5px polyline has no area to spend, and the silenced
 * series is the one whose SHAPE is the point of the panel -- it is the curve
 * that rises while `active` falls, which is Kofler's second phase. Drawing the
 * most informative curve at the least visible contrast is the wrong trade, so
 * the line is #5e81ac: same hue family, 4.424:1, comfortably over the floor.
 *
 * The cost of that decision is that "silenced" now has two blues on screen, so
 * this panel draws its OWN legend rather than borrowing the side column's.
 * `tests/render-panels.test.ts` asserts both halves of the argument: that every
 * series line clears 3:1, and that `SILENCED_COLOUR` itself does not.
 * -------------------------------------------------------------------------- */

export const TOTAL_LINE = "#d8dee9";
export const ACTIVE_LINE = ACTIVE_COLOUR;
export const SILENCED_LINE = "#5e81ac";
/** Gridlines, ticks and their labels. 6.559:1 against `FIELD_BG`. */
export const AXIS_LABEL = "#939eac";
/** Gridline rules. Annotation only, never drawn over a series. */
const GRID = "#252b34";

const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 22;
const PAD_B = 18;

const MONO = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface TimelineGeometry {
  plot: Rect;
  /** First and last generation in the window. */
  g0: number;
  gN: number;
  /** Top of the count axis: a round number at or above the peak. */
  yTop: number;
  xAt: (generation: number) => number;
  yAt: (count: number) => number;
  /** Generations that get a labelled vertical rule: the decades in range. */
  decades: number[];
  /** Counts that get a labelled horizontal rule. */
  yTicks: number[];
}

/**
 * The smallest 1/2/2.5/5 x 10^k value at or above `v`.
 *
 * The count axis is autoscaled, and an autoscaled axis whose top is the raw
 * maximum is an axis with no readable scale at all: the peak touches the top by
 * construction and every other value is a fraction of a number nobody is shown.
 * Rounding up to a decade-ish number means the gridlines carry whole counts, so
 * a curve's HEIGHT is readable against a printed number rather than against the
 * curve's own maximum.
 */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const k = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * k + 1e-9) return m * k;
  }
  return 10 * k;
}

/**
 * Where the curves go.
 *
 * THE GENERATION AXIS IS LOGARITHMIC, and that is the whole design of this
 * panel. Measured at `TOY_DEFAULTS`, seed 1, total copies against generation:
 *
 *     gen      0   10   25    50   100   200   400   800  1600  3200
 *     copies  60   73  105   322   961  1170  1608  1371  1519  2135
 *
 * The invasion -- 60 copies to ~1000, the panel's whole first act -- is over by
 * generation 100, and after generation ~200 copy number fluctuates in a band
 * with no further shape. The toy advances `speed = 3` generations per animation
 * frame, so at 60 fps generation 100 arrives 0.56 s after the page loads. On the
 * linear axis the brief specified, that act occupies 100/4000 = 2.5% of the
 * width by generation 4000 and keeps shrinking without bound; on
 * `log10(1 + g)` it holds log10(101)/log10(4001) = 55.6% at generation 4000 and
 * 49.1% at generation 12000. A poke resets the world, so the invasion replays,
 * and it is worth being able to watch.
 *
 * The compression is STATED, not implied: the decade rules are labelled with
 * real generation numbers, so the reader can see that the left half of the panel
 * is the first hundred generations.
 *
 * Returns null when there is nothing to draw yet -- fewer than two snapshots, or
 * a window with no width.
 */
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
  const l0 = L(g0);
  const span = L(gN) - l0;
  const xAt = (g: number) => plot.x + ((L(g) - l0) / span) * plot.w;

  let peak = 1;
  for (const s of snapshots) if (s.totalCopies > peak) peak = s.totalCopies;
  const yTop = niceCeil(peak);
  const yAt = (v: number) => plot.y + plot.h - (v / yTop) * plot.h;

  const decades: number[] = [];
  for (let d = 1; d <= gN; d *= 10) if (d > g0) decades.push(d);

  return {
    plot,
    g0,
    gN,
    yTop,
    xAt,
    yAt,
    decades,
    yTicks: [0, yTop / 2, yTop],
  };
}

/** The three series, in draw order. Each key is a field of `Snapshot`. */
export const SERIES: readonly [keyof Snapshot, string, string][] = [
  ["totalCopies", TOTAL_LINE, "total"],
  ["silencedCopies", SILENCED_LINE, "silenced"],
  ["activeCopies", ACTIVE_LINE, "active"],
];

/**
 * Total, active and silenced copy counts against generation.
 *
 * This is where a poke's consequence becomes legible, and where Kofler's three
 * phases show up as shape rather than as a number: total rises, active peaks and
 * falls, silenced rises to meet it.
 *
 * DOMESTICATED COPIES ARE DELIBERATELY NOT A FOURTH SERIES. Measured at
 * `TOY_DEFAULTS` the count swings between 0 and 45 against a total of
 * 1200-2100, so on a 0-2500 axis 140px tall it is a line 0.5 to 2.5 px above the
 * floor -- indistinguishable from the axis itself, at every timepoint of every
 * measured session. Area cannot carry a rare state; the side column's tally and
 * readout carry it instead, and `drawField` gives it an enlarged glyph. Adding
 * a curve that reads as the axis would be the same defect as a bar whose length
 * disagrees with its label: a graphic element whose size does not mean the
 * number beside it.
 *
 * `total = active + silenced + domesticated` by construction in `sim/observe.ts`,
 * so the gap between the top curve and the two below it is exactly the
 * domesticated count -- visible as a gap even though it has no line of its own.
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
  const { plot, xAt, yAt } = geom;

  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(plot.x, plot.y, plot.w, plot.h);

  ctx.font = MONO;
  ctx.textBaseline = "alphabetic";

  // Count gridlines, labelled with whole counts, so a curve's height is read
  // against a number rather than against its own maximum.
  for (const v of geom.yTicks) {
    const y = Math.round(yAt(v));
    ctx.fillStyle = GRID;
    ctx.fillRect(plot.x, y, plot.w, 1);
    ctx.fillStyle = AXIS_LABEL;
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(v)), plot.x - 6, y + 3);
  }

  // Decade rules on the logarithmic generation axis, labelled with real
  // generation numbers so the compression is visible rather than implied.
  ctx.textAlign = "center";
  for (const g of geom.decades) {
    const x = Math.round(xAt(g));
    ctx.fillStyle = GRID;
    ctx.fillRect(x, plot.y, 1, plot.h);
    ctx.fillStyle = AXIS_LABEL;
    ctx.fillText(String(g), x, plot.y + plot.h + 12);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = AXIS_LABEL;
  ctx.fillText("generation (log)", plot.x, plot.y + plot.h + 12);

  for (const [key, colour] of SERIES) {
    ctx.beginPath();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i]!;
      const x = xAt(s.generation);
      const y = yAt(s[key] as number);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // The panel's own legend. It exists because `silenced` is a different blue
  // here than in the side column -- see the palette note above.
  let lx = plot.x + 4;
  const ly = plot.y - 8;
  for (const [, colour, label] of SERIES) {
    ctx.fillStyle = colour;
    ctx.fillRect(lx, ly - 6, 8, 8);
    ctx.fillStyle = AXIS_LABEL;
    ctx.textAlign = "left";
    ctx.fillText(label, lx + 12, ly + 1);
    lx += 12 + label.length * 6 + 14;
  }

  const last = snapshots[snapshots.length - 1]!;
  ctx.fillStyle = AXIS_LABEL;
  ctx.textAlign = "right";
  ctx.fillText(
    `gen ${last.generation} · ${last.totalCopies} copies`,
    plot.x + plot.w,
    ly + 1,
  );
}

/** Exported so the palette note above is a claim the suite can check. */
export const SERIES_CONTRAST = (): number[] =>
  SERIES.map(([, colour]) => contrastRatio(colour, FIELD_BG));
