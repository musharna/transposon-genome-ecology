import { type Genome, type Params, type World } from "../../sim/index.js";

/* -------------------------------------------------------------------------- *
 * Palette.
 *
 * `FIELD_BG` is painted by `drawField` itself rather than inherited from the
 * canvas element's CSS, because the contrast ratios asserted in
 * `tests/render-field.test.ts` are ratios against it — if it lived only in
 * `web/index.html` the test would be asserting against a value the render does
 * not use.
 * -------------------------------------------------------------------------- */

export const FIELD_BG = "#14181d";
export const ACTIVE_COLOUR = "#bf616a";
export const SILENCED_COLOUR = "#4c566a";
export const DOMESTICATED_COLOUR = "#a3be8c";

/**
 * SILENCED, FOR THIN MARKS. One state, two weights, one legend entry.
 *
 * `SILENCED_COLOUR` measures 2.416:1 against `FIELD_BG` -- under the 3:1 WCAG
 * floor for a graphical object. It survives in `drawField` because a mark there
 * is a filled rect a whole row tall, and area buys back what contrast does not.
 * Nothing else in this project draws silenced that way: the timeline's 1.5px
 * polyline, the scatter's 2px dots and the inset's 2px-tall cells are all thin,
 * and the dots are the stronger case of the two, not the weaker one. So every
 * thin mark uses this lightened blue -- same hue family, 4.424:1 -- and the
 * global legend in `web/index.html` carries ONE entry showing both weights with
 * one label.
 *
 * That is the whole rule, and it is deliberately not "two legends". A viewer who
 * sees the word `silenced` twice, in two colours, in two legends, has been shown
 * a contradiction and told to live with it.
 */
export const SILENCED_SMALL = "#5e81ac";
/** Drawn under domesticated marks so a 3px glyph still has an edge. */
const DOMESTICATED_HALO = "#113311";

/**
 * The two marked places on the horizontal axis, at full strength: 3.445:1 and
 * 3.658:1 against `FIELD_BG`, comfortably over the 3:1 WCAG floor for a
 * graphical object.
 *
 * THESE COLOURS ARE NEVER PAINTED BEHIND DATA. They appear only in the gutter
 * rails, the 1px span-edge rules and the labels — all annotation. Painting
 * them as a full-height block, which is what this file used to do, was a
 * measured disaster: their luminances (0.153 and 0.166) sit BETWEEN silenced
 * (0.092) and active (0.207), so every copy inside a span collapsed to
 * 1.27:1 (active) and 1.43:1 (silenced) at full opacity, against 4.36:1 and
 * 2.42:1 on plain field. The two places the toy is about — capture in the
 * trap, domestication at a beneficial site — became the two places a copy
 * could not be seen, and the grey-out that IS the mechanism happened at
 * 1.24:1. A place-marker that clears 3:1 while blinding its own contents is
 * worse than no marker, and only a mark-against-tint measurement catches it.
 */
export const CLUSTER_TINT = "#4a6f9e";
export const BENEFICIAL_TINT = "#8a6d2f";
const CLUSTER_LABEL = "#9ab6d9";
const BENEFICIAL_LABEL = "#d4b878";
/** Row-axis label and ticks. 6.56:1 against the field background. */
const AXIS_LABEL = "#939eac";

/**
 * Alpha of the wash INSIDE a span. The only tint that touches the data plane,
 * and it is capped so it cannot meaningfully move a mark's contrast: at 0.08
 * the composited field rises by dL = 0.0043 and marks inside a span read
 * 4.06:1 (active) and 2.25:1 (silenced), against 4.36:1 and 2.42:1 on plain
 * field. The wash exists only to close the gap between the two edge rules; the
 * rails, rules and label carry the visibility.
 */
export const SPAN_FILL_ALPHA = 0.08;

/**
 * Field inset, and the gutters the span annotation lives in.
 *
 * `PAD_L` is 44, not 12, and the reason is a MISREADING rather than a
 * visibility failure. The cluster's edge rules are legible on their own — a
 * hairline pair running the field's full height — but flush against the canvas
 * margin, two thin vertical lines at the extreme left are the universal
 * signature of a y-axis or a plot border, so a viewer files them as chrome and
 * never sees a place. The gold beneficial span at 18px reads unmistakably as a
 * marked band, and that reading does not transfer, because the two look like
 * different kinds of object. Moving the rules bodily inside the plot removes
 * the border reading without touching the axis. The margin it opens also
 * carries the row-order label.
 */
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 30;
const PAD_B = 12;
/** Height of the tinted rail above and below the field. */
const RAIL_H = 6;

/* -------------------------------------------------------------------------- *
 * Colour arithmetic, exported so the test asserts the same numbers the palette
 * notes claim. WCAG 2.x relative luminance and contrast ratio.
 * -------------------------------------------------------------------------- */

function channel(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `fg` at `alpha` over `bg`, as an opaque hex. Precomputed rather than left to
 *  `globalAlpha` so the composited colour is a value the test can measure. */
export function compositeOver(fg: string, bg: string, alpha: number): string {
  const f = rgb(fg);
  const b = rgb(bg);
  return (
    "#" +
    f
      .map((c, i) =>
        Math.round(alpha * c + (1 - alpha) * b[i]!)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export const CLUSTER_FILL = compositeOver(
  CLUSTER_TINT,
  FIELD_BG,
  SPAN_FILL_ALPHA,
);
export const BENEFICIAL_FILL = compositeOver(
  BENEFICIAL_TINT,
  FIELD_BG,
  SPAN_FILL_ALPHA,
);

/* -------------------------------------------------------------------------- *
 * The silencing predicate, accelerated.
 * -------------------------------------------------------------------------- */

/**
 * Is `s` within `theta` of any entry in `sorted`?
 *
 * Exactly equivalent to `sim/silencing.ts`'s `isSilenced` for a non-domesticated
 * copy, and NOT by way of any invariant about the repertoire's spacing: if any
 * entry lies within theta of `s`, then the entry nearest to `s` does, and in a
 * sorted array the nearest entry is either the first one >= `s` or the last one
 * < `s`. Checking those two neighbours is exhaustive for ANY sorted array of any
 * contents, so nothing a future change to `trap` could do can break it.
 *
 * The point WAS cost, and as of 2026-09-03 it is not. `isSilenced` used to scan
 * the whole repertoire per copy — O(copies x repertoire) per frame over a
 * repertoire that grows without bound — and this replaced it with O(copies x log
 * repertoire) after one O(R log R) sort per genome. Measured speedup per
 * full-population pass at the time: 3.5x at repertoire 20, 8.8x at 54, 6.5x at
 * 184, 7.2x at 486. Below about a dozen entries the sort cost more than the scan
 * it replaced (0.41x at repertoire 7) — 0.3ms against 0.13ms, which is why there
 * is no threshold here to get wrong.
 *
 * `sim/silencing.ts` now keeps `Genome.repertoire` sorted and binary-searches it
 * itself, so THE COST GAP THIS FUNCTION EXISTED TO CLOSE IS GONE. It stays for
 * two reasons that are not cost: `sim/` must not import from `web/`, and
 * `nearestSignedDistance` below returns the signed DISTANCE that
 * `web/render/scatter.ts` plots, which no predicate in `sim/` exposes. Being a
 * second, independently-derived implementation of the same search is now its
 * main hazard rather than its purpose, and `tests/render-field.test.ts` (a2)
 * holds the two to each other copy by copy.
 */
export function silencedBySorted(
  s: number,
  sorted: number[],
  theta: number,
): boolean {
  const d = nearestSignedDistance(s, sorted);
  return d !== null && Math.abs(d) <= theta;
}

/**
 * Signed distance from `s` to the NEAREST entry in `sorted`, or null when the
 * repertoire is empty. Positive means `s` sits above its nearest entry.
 *
 * `silencedBySorted` is this predicate's yes/no; `web/render/scatter.ts` plots
 * the magnitude, so the two are one search rather than two implementations that
 * can drift apart. The same exhaustiveness argument holds: the nearest entry to
 * `s` in a sorted array is either the first one >= `s` or the last one < `s`,
 * for any sorted array of any contents.
 *
 * TIES ARE RESOLVED TOWARDS THE LOWER ENTRY, so an exactly-between `s` returns
 * a POSITIVE distance. Both answers are equally true and `silencedBySorted`
 * cannot tell them apart, but the scatter puts the mark at `+d` or `-d`
 * depending on the answer, and a rule nobody wrote down is a rule that differs
 * between the two neighbours' floating-point paths.
 */
export function nearestSignedDistance(
  s: number,
  sorted: number[],
): number | null {
  if (sorted.length === 0) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! < s) lo = mid + 1;
    else hi = mid;
  }
  // `above` is <= 0 (its entry is >= s); `below` is > 0 (its entry is < s).
  const above = lo < sorted.length ? s - sorted[lo]! : null;
  const below = lo > 0 ? s - sorted[lo - 1]! : null;
  if (above === null) return below!;
  if (below === null) return above;
  return below <= -above ? below : above;
}

/**
 * A per-frame, read-only sorted view of a genome's repertoire.
 *
 * THE `.slice()` IS LOAD-BEARING AND ITS REMOVAL IS SILENT. `genome.repertoire`
 * is ORDERED state that `sim/observe.ts`'s `stateHash` digests in order, so
 * sorting it in place would change the model while every mark on screen kept
 * looking exactly right. Measured: with the `.slice()` deleted, the colour
 * equivalence test still passes and only the order test fails. That is why
 * `tests/render-field.test.ts` deep-equals the repertoire against a pre-draw
 * snapshot as a SEPARATE assertion.
 *
 * ⚠️ AND SINCE 2026-09-03 THAT ASSERTION NEEDS A PERTURBED FIXTURE TO SEE IT.
 * `sim/` now keeps the repertoire sorted ascending, so an in-place sort of a
 * repertoire straight out of `step` moves nothing at all: for a while the order
 * test would have passed with the `.slice()` deleted too. It is
 * `tests/render-field.test.ts` (b) that hands the render a deliberately
 * reversed repertoire, and the reason is written there.
 */
export function sortedRepertoire(genome: Genome): number[] {
  return genome.repertoire.slice().sort((a, b) => a - b);
}

/* -------------------------------------------------------------------------- *
 * Geometry.
 * -------------------------------------------------------------------------- */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Indices into `world.genomes`, sorted by copy count descending, stably so that
 * equal rows do not jitter between frames. NEVER sorts `world.genomes` itself.
 *
 * Exported because `web/render/cluster-inset.ts` magnifies five columns of the
 * SAME rows, and two panels claiming to show the same genome in the same row
 * must derive that row from one function rather than from two copies of a sort
 * comparator that can drift apart.
 */
export function rowOrder(world: World): number[] {
  const order = world.genomes.map((_, i) => i);
  order.sort((i, j) => {
    const d = world.genomes[j]!.copies.length - world.genomes[i]!.copies.length;
    return d !== 0 ? d : i - j;
  });
  return order;
}

/** The field's rectangle inside the canvas. */
export function fieldRect(width: number, height: number): Rect {
  return {
    x: PAD_L,
    y: PAD_T,
    w: Math.max(1, width - PAD_L - PAD_R),
    h: Math.max(1, height - PAD_T - PAD_B),
  };
}

export interface SpanGeometry {
  /** Sites in the span. */
  sites: number;
  /** Left edge and width in canvas px. */
  x: number;
  w: number;
  /** `w / sites`. Both spans must agree, or the axis is lying somewhere. */
  pxPerSite: number;
  /** Drawn width of one mark. Floored at 1px, so it exceeds `pxPerSite`
   *  whenever the field is narrower than one pixel per site -- which is why
   *  `edgeRuleRanges` cannot place a rule at the site-cell boundary. */
  markW: number;
}

/**
 * Where the two spans are, IN THE SAME COORDINATES THE MARKS USE.
 *
 * This exists because the two spans were previously drawn at different site
 * scales — beneficial at 0.90 px/site (the true axis) and cluster at 3.00
 * px/site, because the cluster's drawn width was floored at 15px while copies
 * were still drawn at true scale. The consequence was not cosmetic: about 17
 * copies sat inside the blue block while the readout said `in cluster: 1`, so
 * the picture contradicted its own number by ~17x. A place-marker may be
 * emphasised OUTSIDE the data plane; it may never claim territory inside it,
 * and there is no width floor anywhere in this file any more.
 *
 * Both spans are derived from `siteX`, the same mapping the marks use, so
 * `pxPerSite` agreeing between them is a property the test can assert rather
 * than a convention to remember.
 *
 * ⚠️ "and there is no width floor anywhere in this file any more" STOOD ABOVE
 * AND WAS FALSE when written or soon after: `markWidth` floors at 1px and the
 * domesticated glyph floors at 3px in both axes. Three floors. The RULE the
 * sentence was defending is intact and is restated without the false claim: a
 * place-marker may be emphasised outside the data plane, never inside it. What
 * the floors do inside the plane is measured rather than asserted --
 * `scripts/explore-field-undercount.ts`, and the guard in
 * `tests/render-field.test.ts` pins the one cost that is real.
 */
export function spanGeometry(
  p: Params,
  field: Rect,
): { cluster: SpanGeometry | null; beneficial: SpanGeometry | null } {
  const markW = markWidth(p, field);
  const siteX = (site: number) => field.x + (site / p.S) * (field.w - markW);

  const clusterSites = Math.floor(p.c * p.S);
  const beneficialSites = Math.floor(p.beta * p.S);

  // The span runs to the SITE-GRID boundary between its last site and the
  // first site outside it, not to the right edge of the last site's mark. A
  // mark is floored at 1px while the pitch here is 0.92px, so a mark overhangs
  // its own site's cell by ~0.08px; defining the span by the mark would let the
  // next site's mark start inside the span and make `pxPerSite` differ between
  // a 5-site span and a 20-site one. On the site grid both are exactly the
  // pitch, which is the property the test asserts.
  const span = (first: number, count: number): SpanGeometry | null => {
    if (count <= 0) return null;
    const x = siteX(first);
    const w = (count / p.S) * (field.w - markW);
    return { sites: count, x, w, pxPerSite: w / count, markW };
  };

  return {
    cluster: span(0, clusterSites),
    beneficial: span(p.S - beneficialSites, beneficialSites),
  };
}

/**
 * ⚠️ THE "ROUGHLY 12% UNDERCOUNT, AND THIS FLOOR IS WHY" THAT STOOD HERE WAS
 * WRONG IN BOTH HALVES. Corrected 2026-09-03, by measurement.
 *
 * It read: "the field is ~919 px wide for S = 1000 sites... Measured by counting
 * distinguishable marks against `totalCopies` on three worlds: 1383 / 1714 /
 * 1237 detected against 1551 / 1923 / 1416 actual — an 11%..13% shortfall."
 * NOTHING IN THE REPO PRODUCED THOSE NUMBERS. There is now a producer:
 * `scripts/explore-field-undercount.ts`, on the instrument in
 * `tests/guards/field-undercount-arm.ts` that the render guard also uses.
 *
 * THE MAGNITUDE IS 0.4%..4.9%, not 11%..13%. Two threshold-free observables
 * bracket it from both sides — exact rectangle geometry, which ignores
 * antialiasing and so bounds countability from above, and device-column ink
 * runs, which merge anything contiguous and so bound it from below. Twelve
 * world states, generations 300..6000, copy counts 1157..1893, which brackets
 * the density the retired figure was quoted at. It never approaches 12%.
 *
 * AND THE FLOOR IS NOT THE CAUSE. Sweeping the mark width (ARM 2) at seed 1,
 * generation 3000: at exact pitch (x1.000) the shortfall is 1.5%, and at the
 * shipped floor (x1.185 here) it is ALSO 1.5% — identical. On the device grid
 * narrowing the mark makes it slightly WORSE, 2.2% at x0.25 against 2.2% at the
 * floor, peaking at 2.7% around x0.75. Removing the floor buys nothing.
 *
 * What is left is the real mechanism: copies at ADJACENT SITES merge into one
 * blob, and no mark width separates them, because 1000 sites do not fit in
 * ~844 px. It is a resolution limit, not a defect. It is also VIEWPORT
 * DEPENDENT — the canvas is `width: 100%`, so the pitch tracks the window, and
 * at a canvas wider than about 1056 CSS px the floor stops binding at all.
 *
 * (The floor's own stated justification — that below 1px a mark could land
 * between two device pixels and vanish — is UNTESTED here; a sub-pixel rect
 * dims rather than disappears. It is moot either way, since narrowing gains
 * nothing measurable.)
 *
 * The defect that WAS real is burial, and it was elsewhere: `DOMESTICATED_HALO`
 * painted after the marks erased whole copies. That is fixed above and guarded.
 *
 * Do not quote a mark count off this panel as a copy number. `observe()` is the
 * count; this is the picture.
 */
function markWidth(p: Params, field: Rect): number {
  return Math.max(1, field.w / p.S);
}

/* -------------------------------------------------------------------------- *
 * Drawing.
 * -------------------------------------------------------------------------- */

/**
 * Everything that marks a span, drawn OUTSIDE the data plane except for two
 * 1px edge rules and a capped wash: a tinted rail in the gutter above and
 * below the field, the two rules, a bracket with ticks, a leader, and the
 * label carrying the span's TRUE site count.
 */
function drawSpan(
  ctx: CanvasRenderingContext2D,
  field: Rect,
  span: SpanGeometry,
  text: string,
  tint: string,
  fill: string,
  label: string,
  align: "left" | "right",
): void {
  // Inside the data plane: the capped wash, and nothing else.
  ctx.fillStyle = fill;
  ctx.fillRect(span.x, field.y, span.w, field.h);

  // The edge rules sit OUTSIDE the span's site extent, in the 1px immediately
  // before its first site and immediately after its last. Drawn ON the extent,
  // as they were, they landed squarely on sites 0 and 4 of the cluster's five:
  // a 1px mark over a 1px rule at a fractional pixel offset blends rather than
  // covers, and those marks measured 1.11-1.26:1 -- the same blindness the wash
  // was introduced to remove, relocated onto 40% of the cluster's sites. In one
  // measured frame the ONLY copy in the trap in the whole population was one of
  // them. `edgeRuleRanges` below lets `drawField` knock the rule out from under
  // any mark that still overlaps one.
  ctx.fillStyle = tint;
  for (const [rx] of edgeRuleRanges(span))
    ctx.fillRect(rx, field.y, 1, field.h);

  // Gutter rails, above and below, at the span's true extent.
  ctx.fillRect(span.x, field.y - 3 - RAIL_H, span.w, RAIL_H);
  ctx.fillRect(span.x, field.y + field.h + 3, span.w, RAIL_H);

  // Bracket with ticks pointing at the rail, and a leader up to the label.
  const by = field.y - 14;
  ctx.fillRect(span.x, by, span.w, 1);
  ctx.fillRect(span.x, by, 1, 4);
  ctx.fillRect(span.x + span.w - 1, by, 1, 4);
  ctx.fillRect(align === "left" ? span.x : span.x + span.w - 1, by - 4, 1, 4);

  ctx.fillStyle = label;
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, align === "left" ? span.x : span.x + span.w, field.y - 20);
}

/**
 * The two 1px columns a span's edge rules occupy: the pixel before its first
 * mark begins, and the pixel after its last mark ends.
 *
 * The right-hand one is NOT at the site-cell boundary `span.x + span.w`. A mark
 * is floored at 1px while the pitch here is ~0.89px, so the last in-span mark
 * overhangs its own cell by `markW - pxPerSite` and a rule at the cell boundary
 * still clips it -- which is exactly what the test caught, on the cluster's
 * site 4, after the rules had already been moved off the cell. Anchoring to the
 * MARK's right edge removes the overlap by construction.
 *
 * Exported so the test can assert no in-span site sits under one.
 */
export function edgeRuleRanges(span: SpanGeometry): [number, number][] {
  const lastMarkEnd = span.x + span.w + (span.markW - span.pxPerSite);
  return [
    [span.x - 1, span.x],
    [lastMarkEnd, lastMarkEnd + 1],
  ];
}

/**
 * The row-order label, written up the left margin `PAD_L` opens.
 *
 * Rows are sorted, and until now nothing on screen said so. The vertical
 * gradient IS the copy-number distribution the toy is about — measured 72 marks
 * in the top row against 14 in the bottom, with the envelope correlating
 * 0.91-0.95 across frames — and a viewer with no cue reads sorted rows as
 * unsorted ones, which turns the single most informative axis into noise.
 */
function drawRowAxis(ctx: CanvasRenderingContext2D, field: Rect): void {
  ctx.fillStyle = AXIS_LABEL;
  ctx.fillRect(field.x - 6, field.y, 4, 1);
  ctx.fillRect(field.x - 6, field.y + field.h - 1, 4, 1);
  ctx.fillRect(field.x - 4, field.y, 1, field.h);

  ctx.save();
  ctx.translate(field.x - 12, field.y + field.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("genomes, sorted by copy number", 0, 0);
  ctx.restore();
}

/**
 * Genomes as rows, sites as horizontal position.
 *
 * Two places on the axis are marked — the piRNA cluster at the start and the
 * beneficial span at the end — so the horizontal axis reads as TERRAIN rather
 * than as a strip. Both are drawn at their TRUE width; see `spanGeometry`.
 *
 * ROWS ARE SORTED BY COPY COUNT, descending. The sim's own `world.genomes`
 * order is untouched — a local index array is sorted, never the array itself.
 * Measured Spearman(row, marks) of -0.910 / -0.846 / -0.817 at p ~ 1e-24, so
 * vertical position genuinely encodes the distribution. What it does NOT do is
 * keep moving: the sorted profile deforms hard over the first ten seconds and
 * then holds shape, because the model reaches a quasi-stationary distribution
 * and the sorted profile of a stationary distribution is stationary. That is
 * the science, not a rendering defect, and no sort key fixes it. The quantity
 * that genuinely never stops moving is the repertoire, and it is in the
 * readout.
 *
 * Colour carries the states: red active, grey silenced, green domesticated.
 * Domesticated copies are drawn LAST, enlarged and haloed, because area cannot
 * carry a rare state — the count swings between 5 and 45 across a session, and
 * at 5 the green is ~40px of ~440,000 and simply disappears.
 */
export function drawField(
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number,
): void {
  const p: Params = world.params;
  ctx.clearRect(0, 0, width, height);
  if (world.genomes.length === 0) return;

  const field = fieldRect(width, height);
  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(field.x, field.y, field.w, field.h);

  const { cluster, beneficial } = spanGeometry(p, field);
  if (cluster) {
    drawSpan(
      ctx,
      field,
      cluster,
      `piRNA cluster · ${cluster.sites} sites`,
      CLUSTER_TINT,
      CLUSTER_FILL,
      CLUSTER_LABEL,
      "left",
    );
  }
  if (beneficial) {
    drawSpan(
      ctx,
      field,
      beneficial,
      `beneficial · ${beneficial.sites} sites`,
      BENEFICIAL_TINT,
      BENEFICIAL_FILL,
      BENEFICIAL_LABEL,
      "right",
    );
  }

  const order = rowOrder(world);

  const rowH = Math.max(1, field.h / world.genomes.length);
  const markW = markWidth(p, field);
  const markH = Math.max(1, rowH - 0.5);
  const siteX = (site: number) => field.x + (site / p.S) * (field.w - markW);

  const domW = Math.max(3, markW);
  const domH = Math.max(3, markH);
  const domX: number[] = [];
  const domY: number[] = [];

  // ⚠️ THE HALO IS PAINTED BEFORE THE MARKS, AND THAT ORDER IS THE WHOLE POINT.
  //
  // It used to be painted after them, and it is the ONLY thing in this panel
  // that ever buried a copy completely. Measured by
  // `scripts/explore-field-undercount.ts` ARM 5 across 21 world states: zero
  // buried marks in 17 of them, and 1..4 in the other four -- every single one
  // under `DOMESTICATED_HALO`, never under a mark or a span. A halo is 5px wide
  // against a ~0.84px pitch, so it spans about six sites, and a plain mark under
  // it vanished outright rather than merging with a neighbour.
  //
  // That is annotation claiming territory inside the data plane, which is the
  // rule `spanGeometry` above states and the failure this file has already been
  // through twice (the cluster tint at 3.3x true scale; the edge rules landing
  // on 40% of the cluster's sites). The magnitude here is far smaller and the
  // rule is the same, so the fix is the same: the emphasis goes UNDER the data.
  // The glyph itself still paints over its neighbours, and that is left alone --
  // a domesticated copy IS data, and data covering data at this pitch is the
  // resolution limit, not a layering mistake.
  //
  // The cost is that a plain mark can now nick the halo's edge. That reads
  // correctly: the copy is in front, which is what it is.
  for (let row = 0; row < order.length; row++) {
    const genome = world.genomes[order[row]!]!;
    const y = field.y + row * rowH;
    for (const copy of genome.copies) {
      if (!copy.domesticated) continue;
      // Centred on the mark it replaces, so an enlarged glyph does not
      // systematically overhang the right-hand end of its own span, and
      // clamped so it can never leave the field.
      domX.push(
        Math.min(
          Math.max(field.x, siteX(copy.site) - (domW - markW) / 2),
          field.x + field.w - domW,
        ),
      );
      domY.push(y);
    }
  }

  ctx.fillStyle = DOMESTICATED_HALO;
  for (let i = 0; i < domX.length; i++) {
    const hx = Math.max(field.x, domX[i]! - 1);
    ctx.fillRect(
      hx,
      domY[i]! - 1,
      Math.min(domW + 2, field.x + field.w - hx),
      domH + 2,
    );
  }

  // Any 1px column a full-height edge rule occupies. A mark landing on one
  // would blend with it rather than cover it -- a 1px rect at a fractional
  // offset paints two device columns partially -- so such a mark gets a
  // knockout of field background under it first and renders against the same
  // ground as every other mark. Data wins over annotation; the rule shows a
  // small nick where a copy crosses it, which reads correctly as the mark
  // being in front.
  const rules: [number, number][] = [];
  for (const span of [cluster, beneficial]) {
    if (span) rules.push(...edgeRuleRanges(span));
  }
  const onRule = (x: number, w: number): boolean =>
    rules.some(([a, b]) => x < b && x + w > a);

  for (let row = 0; row < order.length; row++) {
    const genome = world.genomes[order[row]!]!;
    const y = field.y + row * rowH;
    const sorted = sortedRepertoire(genome);
    for (const copy of genome.copies) {
      const x = siteX(copy.site);
      // Collected and haloed in the pre-pass above; the glyph is painted last.
      if (copy.domesticated) continue;
      if (onRule(x, markW)) {
        ctx.fillStyle = FIELD_BG;
        ctx.fillRect(x - 0.5, y, markW + 1, markH);
      }
      ctx.fillStyle = silencedBySorted(copy.s, sorted, p.theta)
        ? SILENCED_COLOUR
        : ACTIVE_COLOUR;
      ctx.fillRect(x, y, markW, markH);
    }
  }

  ctx.fillStyle = DOMESTICATED_COLOUR;
  for (let i = 0; i < domX.length; i++) {
    ctx.fillRect(domX[i]!, domY[i]!, domW, domH);
  }

  drawRowAxis(ctx, field);
}
