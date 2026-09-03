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

/**
 * Alpha of the wash INSIDE a span. The only tint that touches the data plane,
 * and it is capped so it cannot meaningfully move a mark's contrast: at 0.08
 * the composited field rises by dL = 0.0043 and marks inside a span read
 * 4.06:1 (active) and 2.25:1 (silenced), against 4.36:1 and 2.42:1 on plain
 * field. The wash exists only to close the gap between the two edge rules; the
 * rails, rules and label carry the visibility.
 */
export const SPAN_FILL_ALPHA = 0.08;

/** Field inset, and the gutters the span annotation lives in. */
const PAD_L = 12;
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
 * The point is cost. `isSilenced` scans the whole repertoire per copy, which is
 * O(copies x repertoire) per frame over a repertoire that grows without bound
 * (see the degradation note in `web/main.ts`). This is O(copies x log
 * repertoire) after one O(R log R) sort per genome. Measured speedup per
 * full-population pass: 3.5x at repertoire 20, 8.8x at 54, 6.5x at 184, 7.2x at
 * 486. Below about a dozen entries the sort costs more than the scan it
 * replaces (0.41x at repertoire 7) — 0.3ms against 0.13ms, which is why there
 * is no threshold here to get wrong.
 */
export function silencedBySorted(
  s: number,
  sorted: number[],
  theta: number,
): boolean {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! < s) lo = mid + 1;
    else hi = mid;
  }
  if (lo < sorted.length && Math.abs(sorted[lo]! - s) <= theta) return true;
  if (lo > 0 && Math.abs(sorted[lo - 1]! - s) <= theta) return true;
  return false;
}

/**
 * A per-frame, read-only sorted view of a genome's repertoire.
 *
 * THE `.slice()` IS LOAD-BEARING AND ITS REMOVAL IS SILENT. `genome.repertoire`
 * is ORDERED state: `sim/observe.ts`'s `stateHash` digests it in order and
 * `reproduce` copies it into every daughter, so sorting it in place would move
 * golden hash `9c15fd28` and change the model, while every mark on screen kept
 * looking exactly right. Measured: with the `.slice()` deleted, the colour
 * equivalence test still passes and only the order test fails. That is why
 * `tests/render-field.test.ts` deep-equals the repertoire against a pre-draw
 * snapshot as a SEPARATE assertion.
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
    return { sites: count, x, w, pxPerSite: w / count };
  };

  return {
    cluster: span(0, clusterSites),
    beneficial: span(p.S - beneficialSites, beneficialSites),
  };
}

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
  // Inside the data plane: a capped wash and two hairline rules. Nothing else.
  ctx.fillStyle = fill;
  ctx.fillRect(span.x, field.y, span.w, field.h);
  ctx.fillStyle = tint;
  ctx.fillRect(span.x, field.y, 1, field.h);
  ctx.fillRect(span.x + span.w - 1, field.y, 1, field.h);

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

  const order = world.genomes.map((_, i) => i);
  order.sort((i, j) => {
    const d = world.genomes[j]!.copies.length - world.genomes[i]!.copies.length;
    return d !== 0 ? d : i - j; // stable, so equal rows do not jitter
  });

  const rowH = Math.max(1, field.h / world.genomes.length);
  const markW = markWidth(p, field);
  const markH = Math.max(1, rowH - 0.5);
  const siteX = (site: number) => field.x + (site / p.S) * (field.w - markW);

  const domW = Math.max(3, markW);
  const domH = Math.max(3, markH);
  const domX: number[] = [];
  const domY: number[] = [];

  for (let row = 0; row < order.length; row++) {
    const genome = world.genomes[order[row]!]!;
    const y = field.y + row * rowH;
    const sorted = sortedRepertoire(genome);
    for (const copy of genome.copies) {
      const x = siteX(copy.site);
      if (copy.domesticated) {
        // Centred on the mark it replaces, so an enlarged glyph does not
        // systematically overhang the right-hand end of its own span, and
        // clamped so it can never leave the field.
        domX.push(
          Math.min(
            Math.max(field.x, x - (domW - markW) / 2),
            field.x + field.w - domW,
          ),
        );
        domY.push(y);
        continue;
      }
      ctx.fillStyle = silencedBySorted(copy.s, sorted, p.theta)
        ? SILENCED_COLOUR
        : ACTIVE_COLOUR;
      ctx.fillRect(x, y, markW, markH);
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
  ctx.fillStyle = DOMESTICATED_COLOUR;
  for (let i = 0; i < domX.length; i++) {
    ctx.fillRect(domX[i]!, domY[i]!, domW, domH);
  }
}
