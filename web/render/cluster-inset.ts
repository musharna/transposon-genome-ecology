import { isClusterSite, type Params, type World } from "../../sim/index.js";
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  FIELD_BG,
  SILENCED_COLOUR,
  rowOrder,
  silencedBySorted,
  sortedRepertoire,
  type Rect,
} from "./field.js";

/* -------------------------------------------------------------------------- *
 * A MAGNIFIED VIEW OF THE TRAP, drawn outside the field's data plane.
 *
 * The piRNA cluster is `floor(c * S)` = 5 sites of 1000 at `TOY_DEFAULTS`. In
 * `drawField` those five sites are drawn at the field's true scale -- about
 * 1.05 px/site on a 1104px-wide canvas, so the whole trap is a ~5px hairline at
 * the left edge, which reads as a plot border rather than as a place. That
 * scale is not negotiable inside the field: `web/render/field.ts` documents at
 * length why a place-marker may never claim territory in the data plane, after
 * a version that floored the cluster to 15px painted ~17 copies as though they
 * were in a trap holding 1.
 *
 * The resolution is a SEPARATE, LABELLED canvas at a stated magnification. Here
 * the five sites get 30 px each and every genome gets a row, so cluster
 * occupancy is readable as a picture instead of only as the readout's scalar.
 * It is worth the space: measured at `TOY_DEFAULTS` over seeds 1/2/3/5/7 at
 * generations 200/800/2000/4000, between 1 and 23 of the 60 genomes hold a copy
 * in a cluster site at any moment, and those copies are the ONLY source of new
 * piRNA entries in the model.
 *
 * THE MAGNIFICATION IS PRINTED AND IT IS EXACT. `zoom` is
 * `pxPerSite / fieldPxPerSite`, the caller passes the field's own
 * `spanGeometry(...).cluster.pxPerSite` rather than a remembered constant, and
 * `tests/render-panels.test.ts` asserts both that the ratio holds and that the
 * printed figure matches it. A zoom whose stated factor is not its actual factor
 * would be the same defect as the 3.3x cluster tint this panel exists to
 * replace.
 * -------------------------------------------------------------------------- */

const PAD_L = 8;
const PAD_T = 16;
const PAD_B = 8;
const TEXT_GAP = 12;
/** Widest a magnified site may be drawn. Caps the block on a wide panel. */
const MAX_SITE_PX = 30;
/** Column separators, and the empty-cell ground. */
const GRID = "#20252d";
const LABEL = "#939eac";
const MONO = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface ClusterInsetGeometry {
  /** The magnified block: `sites` columns by `rows` rows. */
  block: Rect;
  sites: number;
  rows: number;
  pxPerSite: number;
  rowH: number;
  /** `pxPerSite / fieldPxPerSite`. What the printed label must say. */
  zoom: number;
}

export function clusterInsetGeometry(
  p: Params,
  width: number,
  height: number,
  fieldPxPerSite: number,
  rows: number,
): ClusterInsetGeometry {
  const sites = Math.max(1, Math.floor(p.c * p.S));
  const availW = Math.max(1, width - 2 * PAD_L);
  const pxPerSite = Math.min(MAX_SITE_PX, availW / sites);
  const h = Math.max(1, height - PAD_T - PAD_B);
  return {
    block: { x: PAD_L, y: PAD_T, w: pxPerSite * sites, h },
    sites,
    rows: Math.max(1, rows),
    pxPerSite,
    rowH: h / Math.max(1, rows),
    zoom: fieldPxPerSite > 0 ? pxPerSite / fieldPxPerSite : 0,
  };
}

/** The magnification as the label prints it, so a test can compare the two. */
export function zoomLabel(zoom: number): string {
  return `${zoom.toFixed(1)}x`;
}

/**
 * One row per genome, in the SAME order `drawField` uses (`rowOrder`), five
 * columns for the five cluster sites, one cell per (genome, site).
 *
 * A cell is filled iff that genome has a copy in that site, in the copy's own
 * state colour -- so a grey cell is a captured, silenced copy sitting in the
 * trap that silences it, which is the mechanism the whole toy is about.
 * Silencing is decided by `silencedBySorted` over a per-frame sorted COPY of the
 * repertoire, exactly as `drawField` does; nothing here touches sim state.
 */
export function drawClusterInset(
  ctx: CanvasRenderingContext2D,
  world: World,
  width: number,
  height: number,
  fieldPxPerSite: number,
): void {
  const p = world.params;
  ctx.clearRect(0, 0, width, height);
  if (world.genomes.length === 0) return;

  const geom = clusterInsetGeometry(
    p,
    width,
    height,
    fieldPxPerSite,
    world.genomes.length,
  );
  const { block, sites, pxPerSite, rowH } = geom;

  ctx.fillStyle = FIELD_BG;
  ctx.fillRect(block.x, block.y, block.w, block.h);

  // Column separators, so five sites are five countable columns.
  ctx.fillStyle = GRID;
  for (let i = 1; i < sites; i++) {
    ctx.fillRect(block.x + i * pxPerSite, block.y, 1, block.h);
  }

  const order = rowOrder(world);
  const markH = Math.max(1, rowH);
  let occupied = 0;
  for (let row = 0; row < order.length; row++) {
    const genome = world.genomes[order[row]!]!;
    const y = block.y + row * rowH;
    // The repertoire is sorted lazily, and only for a genome that has something
    // in the trap. Between 1 and 23 of 60 genomes do at any moment, so sorting
    // all 60 unconditionally cost 0.547 ms per frame at generation 4000 against
    // 0.05 ms here -- almost all of it spent sorting ~246 entries for rows with
    // no mark to draw.
    let sorted: number[] | null = null;
    for (const copy of genome.copies) {
      if (!isClusterSite(copy.site, p)) continue;
      occupied++;
      sorted ??= sortedRepertoire(genome);
      ctx.fillStyle = copy.domesticated
        ? DOMESTICATED_COLOUR
        : silencedBySorted(copy.s, sorted, p.theta)
          ? SILENCED_COLOUR
          : ACTIVE_COLOUR;
      ctx.fillRect(block.x + copy.site * pxPerSite, y, pxPerSite, markH);
    }
  }

  ctx.font = MONO;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = LABEL;
  ctx.fillText(
    `${sites} cluster sites, ${zoomLabel(geom.zoom)} the field's scale`,
    block.x,
    block.y - 5,
  );

  const tx = block.x + block.w + TEXT_GAP;
  const lines = [
    `${world.genomes.length} genomes,`,
    `same row order`,
    `as the field.`,
    ``,
    `in trap: ${occupied}`,
  ];
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, tx, block.y + 9 + i * 13);
  }
}
