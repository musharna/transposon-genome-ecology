import { type Genome, type Params, type World } from "../../sim/index.js";

/* -------------------------------------------------------------------------- *
 * Palette. Every colour the field paints is declared here, INCLUDING the field
 * background, which `drawField` paints itself rather than inheriting from the
 * canvas element's CSS. That is deliberate: the tint contrast asserted in
 * `tests/render-field.test.ts` is a ratio against `FIELD_BG`, and if the
 * background lived only in `web/index.html` the test would be asserting against
 * a value the render does not actually use.
 * -------------------------------------------------------------------------- */

export const FIELD_BG = "#14181d";
export const ACTIVE_COLOUR = "#bf616a";
export const SILENCED_COLOUR = "#4c566a";
export const DOMESTICATED_COLOUR = "#a3be8c";
/** Drawn under domesticated marks so a 3px glyph still has an edge. */
const DOMESTICATED_HALO = "#113311";

/**
 * The two marked places on the horizontal axis. Both were chosen to clear a
 * 3:1 contrast ratio against `FIELD_BG` — the WCAG floor for a graphical
 * object — and both are checked against that floor by
 * `tests/render-field.test.ts` rather than trusted.
 *
 * The tint they replace, `#1d2530`, measures 1.154:1. For scale, `FIELD_BG`
 * against the page background is 1.077:1, so the old trap tint was about twice
 * as distinguishable as a seam nobody was meant to notice: discoverable only
 * from the legend, which is exactly what the field is supposed to make
 * unnecessary.
 */
export const CLUSTER_TINT = "#4a6f9e";
export const BENEFICIAL_TINT = "#8a6d2f";
const CLUSTER_LABEL = "#9ab6d9";
const BENEFICIAL_LABEL = "#d4b878";

/**
 * Floor on a tinted band's drawn width. A band is a PLACE MARKER, not a
 * faithful area encoding: at the toy defaults the cluster is 5 sites of 1000,
 * which is ~4.5px on a 900px field and sub-threshold no matter how much
 * contrast it carries. The label states the true site count so the widening
 * cannot mislead, and the readout carries the live occupancy.
 */
const MIN_BAND_PX = 15;

/** Field inset. The bands must not sit against the canvas border, where a thin
 * vertical feature reads as a bevel rather than as part of the data. */
const PAD_L = 12;
const PAD_R = 12;
/** Room above the field for the two span brackets and their labels. */
const PAD_T = 26;
const PAD_B = 10;
/** The per-state tally bar, and its gap from the field. */
const BAR_W = 10;
const BAR_GAP = 10;
/** Every non-empty tally segment gets at least this, so a rare state still reads. */
const MIN_SEGMENT_PX = 5;

/* -------------------------------------------------------------------------- *
 * Contrast, exported so the test asserts the same arithmetic the palette notes
 * claim. WCAG 2.x relative luminance and contrast ratio.
 * -------------------------------------------------------------------------- */

function channel(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

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
 *
 * Exported so `tests/render-field.test.ts` can assert the equivalence copy by
 * copy against `isSilenced` on a live world, rather than leaving it as a claim
 * in a comment.
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
 * looking exactly right. `tests/render-field.test.ts` deep-equals the
 * repertoire against a pre-draw snapshot for that reason and no other.
 */
export function sortedRepertoire(genome: Genome): number[] {
  return genome.repertoire.slice().sort((a, b) => a - b);
}

/* -------------------------------------------------------------------------- *
 * The field.
 * -------------------------------------------------------------------------- */

/**
 * The field's rectangle inside the canvas, and the tally bar's beside it.
 *
 * Exported because `tests/render-field.test.ts` has to tell a MARK from a TALLY
 * SEGMENT, and the two are drawn in the same three colours on purpose — the bar
 * is a second channel for the same states, so giving it its own palette would
 * break the one thing it is for. The test separates them by position, and
 * taking the position from here rather than restating the padding constants is
 * what stops the test from silently mis-classifying rects if the layout moves.
 */
export function fieldRect(
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: PAD_L,
    y: PAD_T,
    w: Math.max(1, width - PAD_L - PAD_R - BAR_GAP - BAR_W),
    h: Math.max(1, height - PAD_T - PAD_B),
  };
}

export function tallyRect(
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const f = fieldRect(width, height);
  return { x: f.x + f.w + BAR_GAP, y: f.y, w: BAR_W, h: f.h };
}

/** A span bracket with downward ticks, and its label, above the field. */
function drawSpanLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  fieldY: number,
  text: string,
  colour: string,
  tint: string,
  align: "left" | "right",
): void {
  ctx.fillStyle = colour;
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, align === "left" ? x : x + w, fieldY - 13);

  ctx.fillStyle = tint;
  const by = fieldY - 9;
  ctx.fillRect(x, by, w, 1); // bracket
  ctx.fillRect(x, by, 1, 5); // left tick, pointing at the band
  ctx.fillRect(x + w - 1, by, 1, 5); // right tick
  // Leader from the label down to the bracket.
  ctx.fillRect(align === "left" ? x : x + w - 1, fieldY - 11, 1, 2);
}

/**
 * Genomes as rows, sites as horizontal position.
 *
 * Two places on the axis are tinted — the piRNA cluster at the start and the
 * beneficial span at the end — so the horizontal axis reads as TERRAIN rather
 * than as a strip, and so the trap is visible as a place rather than as an
 * event somebody has to be told about. Both are bracketed and labelled with
 * their true site counts.
 *
 * ROWS ARE SORTED BY COPY COUNT, descending. The sim's own `world.genomes`
 * order is untouched — a local index array is sorted, never the array itself.
 * Unsorted, the field is near-total churn (2-3% mark overlap between frames)
 * whose left/mid/right thirds carry statistically identical ink at 2s and at
 * 30s: it reads as red static. Per-genome load genuinely varies threefold, so
 * the information is there; sorting is what puts it where it can be seen, and
 * the deforming profile is what turns turnover into a story.
 *
 * Colour carries the states: red active, grey silenced, green domesticated.
 * Domesticated copies are drawn LAST, enlarged and haloed, because area cannot
 * carry a rare state — the count swings between 5 and 45 across a session, and
 * at 5 the green is ~40px of ~440,000 and simply disappears. The tally bar
 * beside the field gives every state a channel that does not depend on count.
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
  const fieldX = field.x;
  const fieldY = field.y;
  const fieldW = field.w;
  const fieldH = field.h;

  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

  // --- the two marked places -------------------------------------------------
  const clusterSites = Math.floor(p.c * p.S);
  const beneficialSites = Math.floor(p.beta * p.S);
  const clusterW =
    clusterSites > 0 ? Math.max(MIN_BAND_PX, (clusterSites / p.S) * fieldW) : 0;
  const beneficialW =
    beneficialSites > 0
      ? Math.max(MIN_BAND_PX, (beneficialSites / p.S) * fieldW)
      : 0;

  if (clusterW > 0) {
    ctx.fillStyle = CLUSTER_TINT;
    ctx.fillRect(fieldX, fieldY, clusterW, fieldH);
    drawSpanLabel(
      ctx,
      fieldX,
      clusterW,
      fieldY,
      `piRNA cluster · ${clusterSites} sites`,
      CLUSTER_LABEL,
      CLUSTER_TINT,
      "left",
    );
  }
  if (beneficialW > 0) {
    const bx = fieldX + fieldW - beneficialW;
    ctx.fillStyle = BENEFICIAL_TINT;
    ctx.fillRect(bx, fieldY, beneficialW, fieldH);
    drawSpanLabel(
      ctx,
      bx,
      beneficialW,
      fieldY,
      `beneficial · ${beneficialSites} sites`,
      BENEFICIAL_LABEL,
      BENEFICIAL_TINT,
      "right",
    );
  }

  // --- rows, ordered by copy count ------------------------------------------
  const order = world.genomes.map((_, i) => i);
  order.sort((i, j) => {
    const d = world.genomes[j]!.copies.length - world.genomes[i]!.copies.length;
    return d !== 0 ? d : i - j; // stable, so equal rows do not jitter
  });

  const rowH = Math.max(1, fieldH / world.genomes.length);
  const markW = Math.max(1, fieldW / p.S);
  const markH = Math.max(1, rowH - 0.5);

  // Domesticated marks are collected and drawn after everything else, so a
  // handful of them can never be overpainted by the thousands of others.
  const domX: number[] = [];
  const domY: number[] = [];
  let nActive = 0;
  let nSilenced = 0;

  for (let row = 0; row < order.length; row++) {
    const genome = world.genomes[order[row]!]!;
    const y = fieldY + row * rowH;
    const sorted = sortedRepertoire(genome);
    for (const copy of genome.copies) {
      const x = fieldX + (copy.site / p.S) * fieldW;
      if (copy.domesticated) {
        domX.push(x);
        domY.push(y);
        continue;
      }
      if (silencedBySorted(copy.s, sorted, p.theta)) {
        ctx.fillStyle = SILENCED_COLOUR;
        nSilenced++;
      } else {
        ctx.fillStyle = ACTIVE_COLOUR;
        nActive++;
      }
      ctx.fillRect(x, y, markW, markH);
    }
  }

  const domW = Math.max(3, markW);
  const domH = Math.max(3, markH);
  for (let i = 0; i < domX.length; i++) {
    ctx.fillStyle = DOMESTICATED_HALO;
    ctx.fillRect(domX[i]! - 1, domY[i]! - 1, domW + 2, domH + 2);
  }
  ctx.fillStyle = DOMESTICATED_COLOUR;
  for (let i = 0; i < domX.length; i++) {
    ctx.fillRect(domX[i]!, domY[i]!, domW, domH);
  }

  const tally = tallyRect(width, height);
  drawTally(
    ctx,
    tally.x,
    tally.y,
    tally.w,
    tally.h,
    nActive,
    nSilenced,
    domX.length,
  );
}

/**
 * Per-state stacked tally beside the field. Segment heights are proportional,
 * EXCEPT that every non-empty state is floored at `MIN_SEGMENT_PX` before the
 * remainder is shared out — a proportional bar reproduces exactly the failure
 * it is here to fix, since 5 domesticated copies of 1500 is 0.3% of the bar.
 * The floor is a legibility guarantee, not a measurement; the readout carries
 * the numbers.
 */
function drawTally(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  active: number,
  silenced: number,
  domesticated: number,
): void {
  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(x, y, w, h);

  const counts = [active, silenced, domesticated];
  const colours = [ACTIVE_COLOUR, SILENCED_COLOUR, DOMESTICATED_COLOUR];
  const total = active + silenced + domesticated;
  if (total === 0) return;

  const nonEmpty = counts.filter((c) => c > 0).length;
  const share = Math.max(0, h - nonEmpty * MIN_SEGMENT_PX);

  let top = y;
  for (let i = 0; i < counts.length; i++) {
    const n = counts[i]!;
    if (n === 0) continue;
    const seg = MIN_SEGMENT_PX + (share * n) / total;
    ctx.fillStyle = colours[i]!;
    ctx.fillRect(x, top, w, seg);
    top += seg;
  }
}
