/**
 * The field render's countability instrument, shared by
 * `tests/render-field.test.ts` and `scripts/explore-field-undercount.ts` so the
 * assertion and the sweep cannot describe different measurements.
 *
 * WHY IT EXISTS. `web/render/field.ts`'s `markWidth` comment and
 * `docs/ROADMAP.md` both carried "1383 / 1714 / 1237 detected against
 * 1551 / 1923 / 1416 actual — an 11%..13% shortfall", and NOTHING IN THE REPO
 * PRODUCED THOSE NUMBERS. Re-derived here, the shortfall is 0.4%..4.9% across
 * every world state measured; the sweep has the table.
 *
 * TWO OBSERVABLES, NEITHER CARRYING A THRESHOLD.
 *
 *   `analyse` — exact rectangle geometry over the recorded fills. A mark is
 *   VISIBLE iff some part of it is still topmost after every later fill.
 *   Survivors group into BLOBS: same row band, same colour, extents touching.
 *   Ignores antialiasing, so it is the UPPER bound on what a viewer can count.
 *
 *   `inkRuns` — device columns, where a column is inked if any mark covers any
 *   part of it and contiguous same-colour columns are one thing. The most
 *   pessimistic reading, so it is the LOWER bound.
 *
 * The truth is between them, and the two agree closely, which is the useful
 * part: the residual shortfall is copies at ADJACENT SITES merging, and that is
 * a resolution limit rather than a defect — 1000 sites do not fit in ~844 px at
 * any mark width (`scripts/explore-field-undercount.ts` ARM 4 sweeps the width
 * and countability does not improve).
 *
 * BURIAL IS THE PART THAT IS A DEFECT, and it is what the guard asserts.
 */
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  SILENCED_COLOUR,
  fieldRect,
  rowOrder,
  silencedBySorted,
  sortedRepertoire,
} from "../../web/render/field.js";
import type { World } from "../../sim/index.js";

export interface Fill {
  colour: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MARK_COLOURS = new Set([
  ACTIVE_COLOUR,
  SILENCED_COLOUR,
  DOMESTICATED_COLOUR,
]);

/** Records every fillRect in order, with the fillStyle in force at the time. */
export function recordingCtx(): {
  ctx: CanvasRenderingContext2D;
  fills: Fill[];
} {
  const fills: Fill[] = [];
  let fillStyle = "";
  const stub = {
    clearRect(): void {},
    fillRect(x: number, y: number, w: number, h: number): void {
      fills.push({ colour: fillStyle, x, y, w, h });
    },
    fillText(): void {},
    save(): void {},
    restore(): void {},
    translate(): void {},
    rotate(): void {},
    set fillStyle(v: string) {
      fillStyle = v;
    },
    get fillStyle(): string {
      return fillStyle;
    },
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
  };
  return { ctx: stub as unknown as CanvasRenderingContext2D, fills };
}

/** Area of `r` NOT covered by any rect in `later`, by coordinate compression. */
export function uncoveredArea(r: Fill, later: readonly Fill[]): number {
  const cand = later.filter(
    (o) =>
      o.x < r.x + r.w && o.x + o.w > r.x && o.y < r.y + r.h && o.y + o.h > r.y,
  );
  if (cand.length === 0) return r.w * r.h;
  const xs = new Set<number>([r.x, r.x + r.w]);
  const ys = new Set<number>([r.y, r.y + r.h]);
  for (const o of cand) {
    if (o.x > r.x && o.x < r.x + r.w) xs.add(o.x);
    if (o.x + o.w > r.x && o.x + o.w < r.x + r.w) xs.add(o.x + o.w);
    if (o.y > r.y && o.y < r.y + r.h) ys.add(o.y);
    if (o.y + o.h > r.y && o.y + o.h < r.y + r.h) ys.add(o.y + o.h);
  }
  const xa = [...xs].sort((a, b) => a - b);
  const ya = [...ys].sort((a, b) => a - b);
  let free = 0;
  for (let i = 0; i < xa.length - 1; i++) {
    for (let j = 0; j < ya.length - 1; j++) {
      const cx = (xa[i]! + xa[i + 1]!) / 2;
      const cy = (ya[j]! + ya[j + 1]!) / 2;
      const covered = cand.some(
        (o) => cx > o.x && cx < o.x + o.w && cy > o.y && cy < o.y + o.h,
      );
      if (!covered) free += (xa[i + 1]! - xa[i]!) * (ya[j + 1]! - ya[j]!);
    }
  }
  return free;
}

export interface MarkReport {
  fill: Fill;
  visible: boolean;
  /** Colour of the single later fill that covers it, when one does. */
  hiddenBy: string | null;
}

export function analyse(fills: readonly Fill[]): {
  marks: MarkReport[];
  blobs: number;
} {
  const marks: MarkReport[] = [];
  for (let i = 0; i < fills.length; i++) {
    const f = fills[i]!;
    if (!MARK_COLOURS.has(f.colour)) continue;
    const later = fills.slice(i + 1);
    const free = uncoveredArea(f, later);
    let hiddenBy: string | null = null;
    if (free <= 0) {
      const cover = later.find(
        (o) =>
          o.x <= f.x &&
          o.x + o.w >= f.x + f.w &&
          o.y <= f.y &&
          o.y + o.h >= f.y + f.h,
      );
      hiddenBy = cover ? cover.colour : "(several fills together)";
    }
    marks.push({ fill: f, visible: free > 0, hiddenBy });
  }

  const byKey = new Map<string, Fill[]>();
  for (const m of marks) {
    if (!m.visible) continue;
    const k = `${m.fill.y}|${m.fill.h}|${m.fill.colour}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(m.fill);
  }
  let blobs = 0;
  for (const group of byKey.values()) {
    group.sort((a, b) => a.x - b.x);
    let end = -Infinity;
    for (const f of group) {
      if (f.x > end) blobs++;
      end = Math.max(end, f.x + f.w);
    }
  }
  return { marks, blobs };
}

/** Contiguous inked device columns of one colour set count as ONE thing. */
export function inkRuns(fills: readonly Fill[], dpr: number): number {
  const rows = new Map<string, Map<number, Set<string>>>();
  for (const f of fills) {
    if (!MARK_COLOURS.has(f.colour)) continue;
    const key = `${f.y}|${f.h}`;
    if (!rows.has(key)) rows.set(key, new Map());
    const cols = rows.get(key)!;
    const a = Math.floor(f.x * dpr);
    const b = Math.ceil((f.x + f.w) * dpr);
    for (let c = a; c < b; c++) {
      if (!cols.has(c)) cols.set(c, new Set());
      cols.get(c)!.add(f.colour);
    }
  }
  let runs = 0;
  for (const cols of rows.values()) {
    const keys = [...cols.keys()].sort((a, b) => a - b);
    let prev = -Infinity;
    let prevColours = "";
    for (const c of keys) {
      const sig = [...cols.get(c)!].sort().join(",");
      if (c !== prev + 1 || sig !== prevColours) runs++;
      prev = c;
      prevColours = sig;
    }
  }
  return runs;
}

/**
 * Plain marks rebuilt from the world at an ARBITRARY width, using the same
 * geometry `drawField` uses (`siteX` depends on `markW`, so it is recomputed).
 * Lets the sweep ask what a different mark width would buy.
 */
export function syntheticMarks(
  world: World,
  markW: number,
  W: number,
  H: number,
): Fill[] {
  const p = world.params;
  const field = fieldRect(W, H);
  const order = rowOrder(world);
  const rowH = Math.max(1, field.h / world.genomes.length);
  const markH = Math.max(1, rowH - 0.5);
  const siteX = (site: number) => field.x + (site / p.S) * (field.w - markW);
  const out: Fill[] = [];
  for (let row = 0; row < order.length; row++) {
    const genome = world.genomes[order[row]!]!;
    const y = field.y + row * rowH;
    const sorted = sortedRepertoire(genome);
    for (const copy of genome.copies) {
      if (copy.domesticated) continue;
      out.push({
        colour: silencedBySorted(copy.s, sorted, p.theta)
          ? SILENCED_COLOUR
          : ACTIVE_COLOUR,
        x: siteX(copy.site),
        y,
        w: markW,
        h: markH,
      });
    }
  }
  return out;
}

/**
 * The three world states that had buried marks BEFORE the halo moved under the
 * data (4, 1 and 3 respectively, all under `DOMESTICATED_HALO`). The guard runs
 * exactly these, so it is asserted against states known to have failed rather
 * than against states chosen after the fix.
 */
export const BURIAL_STATES: readonly { seed: number; generations: number }[] = [
  { seed: 3, generations: 3000 },
  { seed: 5, generations: 300 },
  { seed: 11, generations: 300 },
];
