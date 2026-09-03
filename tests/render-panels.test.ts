/**
 * Guards for the two data panels and the magnified trap.
 *
 * `web/render/timeline.ts`, `web/render/scatter.ts` and
 * `web/render/cluster-inset.ts` all make claims that are invisible in their own
 * output: an axis that says which regime it is in, a mark whose colour claims to
 * agree with its position, a rule that claims to sit at theta. None of those can
 * be checked by looking at the picture, which is why the defects they were built
 * to avoid have survived review repeatedly in this project.
 *
 * Everything here drives the REAL draw functions through a recording stub, or
 * the real exported geometry, rather than re-deriving what they would have done.
 * Where a claim is about a DRAWN object -- a theta rule, a ceiling, a band -- the
 * assertion reads the recorded fill back rather than recomputing the coordinate,
 * because a guard that recomputes what the renderer computed cannot see the
 * renderer change.
 */
import { describe, expect, it } from "vitest";
import {
  createWorld,
  defaultParams,
  history,
  isClusterSite,
  isSilenced,
  step,
  type Copy,
  type Genome,
  type Snapshot,
  type World,
} from "../sim/index.js";
import { TOY_DEFAULTS } from "../web/params.js";
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  FIELD_BG,
  SILENCED_COLOUR,
  SILENCED_SMALL,
  contrastRatio,
  drawField,
  fieldRect,
  nearestSignedDistance,
  rowOrder,
  spanGeometry,
} from "../web/render/field.js";
import {
  ADVANCE,
  BAND_FILL,
  LINEAR_SPAN,
  SERIES,
  SILENCED_LINE,
  TOTAL_LINE,
  drawTimeline,
  logColumns,
  niceCeil,
  placeLabels,
  timelineGeometry,
  type Label,
} from "../web/render/timeline.js";
import {
  MARK,
  OFF_SCALE_MARK,
  THETA_BAND_FILL,
  THRESHOLD_RULE,
  X_LIMIT,
  drawScatter,
  placeCopies,
  scatterGeometry,
  thetaRules,
} from "../web/render/scatter.js";
import {
  clusterInsetGeometry,
  drawClusterInset,
} from "../web/render/cluster-inset.js";

const PARAMS = defaultParams(TOY_DEFAULTS);
/** Canvas sizes close to what `web/index.html` gives each panel at 1440x900. */
const TL_W = 1104;
const TL_H = 180;
const SC_W = 1104;
const SC_H = 220;
const IN_W = 296;
const IN_H = 140;
const FIELD_W = 1104;
const FIELD_H = 368;

interface Fill {
  colour: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Text {
  text: string;
  x: number;
  y: number;
  align: string;
}
interface Stroke {
  colour: string;
  points: [number, number][];
}

function recordingCtx(): {
  ctx: CanvasRenderingContext2D;
  fills: Fill[];
  texts: Text[];
  strokes: Stroke[];
} {
  const fills: Fill[] = [];
  const texts: Text[] = [];
  const strokes: Stroke[] = [];
  let fillStyle = "";
  let strokeStyle = "";
  let path: [number, number][] = [];
  const stub = {
    clearRect(): void {},
    fillRect(x: number, y: number, w: number, h: number): void {
      fills.push({ colour: fillStyle, x, y, w, h });
    },
    fillText(text: string, x: number, y: number): void {
      texts.push({ text, x, y, align: stub.textAlign });
    },
    beginPath(): void {
      path = [];
    },
    moveTo(x: number, y: number): void {
      path.push([x, y]);
    },
    lineTo(x: number, y: number): void {
      path.push([x, y]);
    },
    stroke(): void {
      strokes.push({ colour: strokeStyle, points: path });
    },
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
    set strokeStyle(v: string) {
      strokeStyle = v;
    },
    get strokeStyle(): string {
      return strokeStyle;
    },
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
  };
  return {
    ctx: stub as unknown as CanvasRenderingContext2D,
    fills,
    texts,
    strokes,
  };
}

/** The box a drawn label occupies, using the renderer's own advance bound. */
function textBox(t: Text): [number, number] {
  const w = t.text.length * ADVANCE;
  const left = t.align === "left" ? t.x : t.align === "right" ? t.x - w : t.x - w / 2;
  return [left, left + w];
}

function freshWorld(): World {
  return createWorld(defaultParams(TOY_DEFAULTS));
}

/**
 * Generations this file inspects. One run of the model is walked past all of
 * them once and a copy of the genome array is kept at each; re-running the sim
 * from scratch per call cost 87s in this file against about a quarter of that
 * for the ladder, and it is the same trajectory either way because the RNG
 * stream is deterministic from the seed.
 */
const LADDER_MARKS = [10, 250, 400, 600, 800, 1500, 2500, 4000] as const;
let ladder: Map<number, World> | null = null;

function at(generation: number): World {
  if (!ladder) {
    ladder = new Map();
    const w = freshWorld();
    let cur = 0;
    for (const m of LADDER_MARKS) {
      while (cur < m) {
        step(w);
        cur++;
      }
      ladder.set(m, { ...w, genomes: structuredClone(w.genomes) });
    }
  }
  const w = ladder.get(generation);
  if (!w) throw new Error(`gen ${generation} is not on the ladder; add it`);
  return { ...w, genomes: structuredClone(w.genomes) };
}

/**
 * Snapshots spaced as the page produces them: `speed = 3` generations per
 * animation frame, so consecutive snapshots are 3 generations apart and the
 * array index is NOT the generation. Where a claim is about the axis rather than
 * about the data, the counts are irrelevant and the SPACING is what has to be
 * real.
 */
function paced(gens: number, from = 0, counts?: (g: number) => number): Snapshot[] {
  const out: Snapshot[] = [];
  for (let g = from; g <= from + gens; g += 3) {
    const total = counts ? counts(g) : 60 + (g - from);
    const active = Math.round(total * 0.6);
    const silenced = Math.round(total * 0.35);
    out.push({
      generation: g,
      totalCopies: total,
      activeCopies: active,
      silencedCopies: silenced,
      domesticatedCopies: total - active - silenced,
      meanRate: 0.15,
      fractionWithRepertoire: 1,
    });
  }
  return out;
}

/* ========================================================================== *
 * TIMELINE — the split axis
 * ========================================================================== */

describe("drawTimeline: the axis serves the past AND the present", () => {
  it("keeps the invasion a readable share of the width", () => {
    // At TOY_DEFAULTS total copies run 60 / 73 / 105 / 322 / 961 at generations
    // 0/10/25/50/100 and then fluctuate with no further shape; at speed 3 and
    // 60fps generation 100 arrives 0.56s after the page loads. On a purely
    // linear axis that whole act is 2.5% of the width by generation 4000 and
    // keeps shrinking without bound.
    const share = (gN: number, upTo: number): number => {
      const geom = timelineGeometry(paced(gN), TL_W, TL_H)!;
      return (geom.xAt(upTo) - geom.plot.x) / geom.plot.w;
    };
    // Positive control: inside the linear span the panel is one linear axis and
    // the last generation fills it, so the compression below is a real change.
    expect(timelineGeometry(paced(99), TL_W, TL_H)!.split).toBeNull();
    expect(share(99, 99)).toBeCloseTo(1, 9);

    expect(share(4000, 100)).toBeGreaterThan(0.35);
    expect(share(12000, 100)).toBeGreaterThan(0.3);

    const linear = (gN: number, upTo: number) => upTo / gN;
    expect(linear(4000, 100)).toBeLessThan(0.03);
    expect(share(4000, 100) / linear(4000, 100)).toBeGreaterThan(12);
  });

  it("gives the present a linear window whose px/generation does not decay", () => {
    // THE DEFECT THIS EXISTS TO FORBID, and it was mine: a pure log axis has
    // w/(ln10*g) px per generation at its right edge -- 0.318 at two seconds
    // and 0.027 at thirty. A poke lands at the CURRENT generation, so its next
    // hundred generations would have occupied 2.7px at 30s and ~1.3px at 60s,
    // in the panel whose whole job is making a poke's consequence legible.
    let previous = Infinity;
    const ratios: [number, number][] = [];
    for (const gN of [400, 4000, 12000, 40000]) {
      const geom = timelineGeometry(paced(gN), TL_W, TL_H)!;
      const split = geom.split!;
      expect(split, `no split at gen ${gN}`).not.toBeNull();
      // The window is the same width in pixels AND in generations at every
      // session length: it does not decay, which is the entire point.
      expect(split.pxPerGen, `px/gen at gen ${gN}`).toBeGreaterThan(1.4);
      if (previous !== Infinity) expect(split.pxPerGen).toBeCloseTo(previous, 9);
      previous = split.pxPerGen;
      expect(split.gBreak).toBe(geom.gN - LINEAR_SPAN);
      // ...and the log section's right edge, which is where a pure log axis put
      // the present, decays as 1/g while the window does not.
      const logEdgePxPerGen =
        geom.xAt(split.gBreak) - geom.xAt(split.gBreak - 1);
      ratios.push([gN, split.pxPerGen / logEdgePxPerGen]);
    }
    // The gap the split exists to open, measured: 2.3x at generation 400 and
    // 197x at 40,000, because one side shrinks and the other does not.
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]![1], `ratio at gen ${ratios[i]![0]}`).toBeGreaterThan(
        ratios[i - 1]![1],
      );
    }
    expect(ratios[0]![1]).toBeGreaterThan(2);
    expect(ratios.find(([g]) => g === 12000)![1]).toBeGreaterThan(50);
  });

  it("positions a point by its GENERATION, not by its index in the array", () => {
    // `window.__sim.setSpeed` already lets a visitor change the ratio
    // mid-session, so the ring can hold frames 3 generations apart followed by
    // frames 12 apart. Under the brief's `i / (length - 1)` mapping the dial
    // would visibly rescale history.
    const uniform = paced(3000);
    const dialled: Snapshot[] = uniform
      .filter((s) => s.generation < 1000)
      .concat(uniform.filter((s) => s.generation >= 1000 && s.generation % 12 === 0));
    if (dialled[dialled.length - 1]!.generation !== 3000) {
      dialled.push(uniform[uniform.length - 1]!);
    }
    // Positive control: the fixtures really do differ in index density over the
    // same generation span, so the equality below is not trivially true.
    expect(dialled[0]!.generation).toBe(uniform[0]!.generation);
    expect(dialled[dialled.length - 1]!.generation).toBe(3000);
    expect(uniform.length / dialled.length).toBeGreaterThan(1.7);

    const a = timelineGeometry(uniform, TL_W, TL_H)!;
    const b = timelineGeometry(dialled, TL_W, TL_H)!;
    for (const g of [0, 3, 96, 999, 1008, 2820, 3000]) {
      expect(
        b.xAt(g),
        `generation ${g} moved when the frame rate changed`,
      ).toBeCloseTo(a.xAt(g), 9);
    }
    for (let i = 1; i < uniform.length; i++) {
      expect(a.xAt(uniform[i]!.generation)).toBeGreaterThan(
        a.xAt(uniform[i - 1]!.generation),
      );
    }
  });
});

describe("drawTimeline: the axis always carries labelled references", () => {
  it("rules and labels the real decades when they are in range", () => {
    const snaps = paced(3000);
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    expect(geom.decades).toEqual([1, 10, 100, 1000]);
    expect(geom.endpointTicks).toEqual([]);
    const { ctx, texts } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);
    for (const d of geom.decades) {
      const label = texts.find(
        (t) => t.text === String(d) && Math.abs(t.x - geom.xAt(d)) < 1.5,
      );
      expect(label, `no label '${d}' at its own rule`).toBeDefined();
    }
    // Positive control: both regimes are named where the reader is.
    expect(texts.some((t) => t.text === "generation, log")).toBe(true);
    expect(texts.some((t) => t.text === `last ${LINEAR_SPAN}, linear`)).toBe(true);
  });

  it("labels the window's own endpoints once the ring has walked past every decade", () => {
    // THE CASE NO FIXTURE EXERCISED. `web/main.ts` caps the ring at 4000 frames
    // = 12,000 generations at speed 3, so about 67s in `g0` starts walking
    // forward, and from roughly generation 22,000 to 100,000 the window holds NO
    // power of ten. The panel then captioned an axis "log" with zero labelled
    // references on it.
    const snaps = paced(11997, 20003);
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    // Positive control on the fixture: this really is the empty-decade case.
    expect(geom.g0).toBe(20003);
    expect(geom.decades).toEqual([]);

    expect(geom.endpointTicks).toEqual([geom.g0, geom.split!.gBreak]);
    const { ctx, texts } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);
    for (const g of geom.endpointTicks) {
      expect(
        texts.some((t) => t.text === String(g)),
        `no label for endpoint ${g}`,
      ).toBe(true);
    }
    // ...and the linear window still names both of its own ends.
    expect(texts.some((t) => t.text === String(geom.gN))).toBe(true);
  });

  it("never lets two tick labels touch, at any session length", () => {
    // The live collision: `generation (log)1`, a decade label 3px from a caption
    // where the advance is 5.9px, SLIDING THROUGH the caption as the domain
    // grew. Labels now reserve boxes; the reservation is what is asserted.
    let rows = 0;
    for (const gN of [400, 1200, 4000, 12000, 40000]) {
      const { ctx, texts } = recordingCtx();
      drawTimeline(ctx, paced(gN), TL_W, TL_H);
      const byRow = new Map<number, Text[]>();
      for (const t of texts) {
        const row = byRow.get(t.y);
        if (row) row.push(t);
        else byRow.set(t.y, [t]);
      }
      for (const [, row] of byRow) {
        rows++;
        const boxes = row.map(textBox).sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < boxes.length; i++) {
          expect(
            boxes[i]![0],
            `labels overlap at gen ${gN}: ${row.map((t) => t.text).join("|")}`,
          ).toBeGreaterThanOrEqual(boxes[i - 1]![1]);
        }
      }
    }
    // Positive control: rows with several labels really were checked.
    expect(rows).toBeGreaterThan(10);
  });

  it("reserves two character widths around every label it does place", () => {
    const candidates: Label[] = [
      { x: 100, text: "1000", align: "center" },
      { x: 124, text: "2000", align: "center" },
      { x: 400, text: "3000", align: "center" },
    ];
    // Positive control: the first and last are far apart and both survive.
    const placed = placeLabels(candidates);
    expect(placed.map((l) => l.text)).toEqual(["1000", "3000"]);
    // The suppressed one was within 2 advances of the one before it.
    expect(Math.abs(124 - 100)).toBeLessThan(4 * ADVANCE + 4 * ADVANCE);
  });
});

describe("drawTimeline: the count axis is readable against printed numbers", () => {
  it("rounds the top to a whole number at or above the peak", () => {
    for (const [v, want] of [
      [1, 1],
      [60, 100],
      [961, 1000],
      [1170, 2000],
      [2135, 2500],
      [4200, 5000],
    ] as const) {
      expect(niceCeil(v), `niceCeil(${v})`).toBe(want);
      expect(niceCeil(v)).toBeGreaterThanOrEqual(v);
    }
  });

  it("draws every gridline label at the height that value actually maps to", () => {
    const snaps = paced(1200, 0, (g) => (g < 100 ? 60 + g * 9 : 1100 + (g % 400)));
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    const { ctx, texts } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);

    for (const v of geom.yTicks) {
      const t = texts.find(
        (t) => t.text === String(Math.round(v)) && t.align === "right",
      );
      expect(t, `no label for ${v}`).toBeDefined();
      expect(Math.abs(t!.y - 3 - geom.yAt(v)), `label ${v} off its rule`).toBeLessThan(1.5);
    }
    const peak = Math.max(...snaps.map((s) => s.totalCopies));
    expect(geom.yAt(peak)).toBeGreaterThan(geom.plot.y);
    expect(geom.yAt(0)).toBeCloseTo(geom.plot.y + geom.plot.h, 9);
  });

  it("keeps every drawn vertex and band inside the plot rect", () => {
    const world = freshWorld();
    const snaps = history(world, 600);
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    const { ctx, strokes, fills } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);

    // One median line and one linear-window line per series.
    expect(strokes.length).toBe(SERIES.length * 2);
    let vertices = 0;
    for (const s of strokes) {
      for (const [x, y] of s.points) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(geom.plot.x - 1e-9);
        expect(x).toBeLessThanOrEqual(geom.plot.x + geom.plot.w + 1e-9);
        expect(y).toBeGreaterThanOrEqual(geom.plot.y - 1e-9);
        expect(y).toBeLessThanOrEqual(geom.plot.y + geom.plot.h + 1e-9);
        vertices++;
      }
    }
    const bands = fills.filter((f) => Object.values(BAND_FILL).includes(f.colour));
    expect(bands.length).toBeGreaterThan(100);
    for (const b of bands) {
      expect(b.y).toBeGreaterThanOrEqual(geom.plot.y - 1e-9);
      expect(b.y + b.h).toBeLessThanOrEqual(geom.plot.y + geom.plot.h + 1e-9);
    }
    expect(vertices).toBeGreaterThan(300);
  });

  it("draws nothing at all before there are two snapshots to join", () => {
    const world = freshWorld();
    const one = history(world, 0);
    expect(timelineGeometry(one, TL_W, TL_H)).toBeNull();
    const { ctx, fills, strokes } = recordingCtx();
    drawTimeline(ctx, one, TL_W, TL_H);
    expect(fills.length + strokes.length).toBe(0);
  });
});

describe("drawTimeline: the log section is a spread, not a smear", () => {
  it("bins by pixel column and draws each band from that column's min to its max", () => {
    // Measured, the tail was 1673 vertices in 60px drawn as a 393-copy-tall
    // smear -- 16% of the y range -- in every column. A polyline through that is
    // a claim about resolution the data does not support.
    const snaps = paced(4000, 0, (g) => 900 + ((g * 37) % 700));
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    const cols = logColumns(snaps, "totalCopies", geom);

    // Positive control: columns really are crowded, or a band would be a point.
    const crowded = cols.filter((c) => c.n > 5);
    expect(crowded.length).toBeGreaterThan(20);
    expect(Math.max(...cols.map((c) => c.n))).toBeGreaterThan(10);

    // Against a brute-force bucketing of the same snapshots.
    for (const c of cols) {
      const vs = snaps
        .filter(
          (s) =>
            s.generation <= geom.split!.gBreak &&
            Math.round(geom.xAt(s.generation)) === c.x,
        )
        .map((s) => s.totalCopies)
        .sort((a, b) => a - b);
      expect(c.n).toBe(vs.length);
      expect(c.min).toBe(vs[0]);
      expect(c.max).toBe(vs[vs.length - 1]);
      expect(c.median).toBe(vs[Math.floor(vs.length / 2)]);
    }

    const { ctx, fills } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);
    const bands = fills.filter((f) => f.colour === BAND_FILL[TOTAL_LINE]);
    expect(bands.length).toBe(cols.length);
    for (const c of cols) {
      const band = bands.find((b) => b.x === c.x)!;
      expect(band, `no band at column ${c.x}`).toBeDefined();
      expect(band.y).toBeCloseTo(geom.yAt(c.max), 9);
      expect(band.y + band.h).toBeCloseTo(
        Math.min(
          geom.plot.y + geom.plot.h,
          Math.max(geom.yAt(c.min), geom.yAt(c.max) + 1),
        ),
        9,
      );
      expect(band.w).toBe(1);
    }
  });

  it("keeps the band visible against the ground and the median visible on the band", () => {
    for (const [, colour, label] of SERIES) {
      const band = BAND_FILL[colour]!;
      expect(contrastRatio(band, FIELD_BG), `${label} band vs ground`).toBeGreaterThanOrEqual(1.8);
      expect(contrastRatio(colour, band), `${label} median on its band`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("drawTimeline: one state, one colour, one legend", () => {
  it("uses the project's thin-mark blue and draws no legend of its own", () => {
    // The first round lightened the line and then explained it in a SECOND
    // legend, so a viewer saw the word `silenced` twice, in two colours, in two
    // legends. The colour rule now lives in `field.ts` and the single note lives
    // in `web/index.html`.
    expect(contrastRatio(SILENCED_COLOUR, FIELD_BG)).toBeLessThan(3);
    expect(SILENCED_LINE).toBe(SILENCED_SMALL);
    for (const [, colour, label] of SERIES) {
      expect(contrastRatio(colour, FIELD_BG), `${label} line`).toBeGreaterThanOrEqual(3);
    }
    expect(SERIES.map(([, c]) => c)).toEqual([
      TOTAL_LINE,
      SILENCED_SMALL,
      ACTIVE_COLOUR,
    ]);

    const { ctx, texts } = recordingCtx();
    drawTimeline(ctx, paced(4000), TL_W, TL_H);
    for (const [, , label] of SERIES) {
      expect(
        texts.some((t) => t.text === label),
        `panel drew its own legend entry '${label}'`,
      ).toBe(false);
    }
    // Positive control: the panel does draw text, so the absence above is real.
    expect(texts.length).toBeGreaterThan(5);
  });
});

/* ========================================================================== *
 * SCATTER
 * ========================================================================== */

describe("drawScatter: colour and position are the same claim", () => {
  it("greys a copy exactly when its mark lies between the DRAWN theta rules", () => {
    // Round one derived the band from `geom.xAt(±theta)` and never looked at the
    // recorded fills, so changing the drawn coordinate to `xAt(d*2)` left every
    // test green while the picture asserted a band twice the true silencing
    // width beside a caption printing the true theta. The rules are now read
    // back off the stub.
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    let grey = 0;
    let red = 0;
    let green = 0;

    for (const gen of [250, 800, 2500, 4000]) {
      const world = at(gen);
      const { ctx, fills } = recordingCtx();
      drawScatter(ctx, world, SC_W, SC_H);

      // The two 1px full-height rules the renderer actually painted.
      const drawn = fills
        .filter(
          (f) =>
            f.colour === THRESHOLD_RULE && f.w === 1 && f.h === geom.plot.h,
        )
        .map((f) => f.x)
        .sort((a, b) => a - b);
      expect(drawn.length, `theta rules at gen ${gen}`).toBe(2);
      // The rules the renderer painted are the rules theta asks for, to within
      // the half pixel that landing them on the pixel grid costs. This is the
      // link that was missing: `THRESHOLD_RULE` was exported and never imported,
      // so the drawn coordinate was free to be anything.
      expect(Math.abs(drawn[0]! - geom.xAt(-PARAMS.theta))).toBeLessThanOrEqual(0.5);
      expect(Math.abs(drawn[1]! - geom.xAt(PARAMS.theta))).toBeLessThanOrEqual(0.5);
      // ...and the ceiling, likewise read back.
      const ceiling = fills.filter(
        (f) => f.colour === THRESHOLD_RULE && f.h === 1 && f.w === geom.plot.w,
      );
      expect(ceiling.length).toBe(1);
      expect(
        Math.abs(ceiling[0]!.y - geom.yAt(PARAMS.rMax)),
      ).toBeLessThanOrEqual(0.5);

      const placement = placeCopies(world, geom);
      const expected: string[] = [];
      for (const g of world.genomes) {
        for (const c of g.copies) {
          expected.push(
            c.domesticated
              ? DOMESTICATED_COLOUR
              : isSilenced(c, g, PARAMS)
                ? SILENCED_SMALL
                : ACTIVE_COLOUR,
          );
        }
      }
      expect(
        placement.marks.map((m) => m.colour),
        `colours at gen ${gen}`,
      ).toEqual(expected);

      // Every grey mark is inside the drawn rules; every red one is outside.
      for (const m of placement.marks) {
        if (m.d === null) continue;
        const inside =
          m.x >= geom.xAt(-PARAMS.theta) - 1e-9 &&
          m.x <= geom.xAt(PARAMS.theta) + 1e-9;
        if (m.colour === SILENCED_SMALL) {
          expect(inside, "a grey mark outside the theta rules").toBe(true);
          grey++;
        } else if (m.colour === ACTIVE_COLOUR) {
          expect(inside, "a red mark inside the theta rules").toBe(false);
          red++;
        } else {
          green++;
        }
      }
    }
    // Positive controls: an arm with no greys, or no reds, satisfies the
    // implications above for the wrong reason.
    expect(grey).toBeGreaterThan(500);
    expect(red).toBeGreaterThan(500);
    expect(green).toBeGreaterThan(0);
  });

  it("washes the band between the rules without blinding what is inside it", () => {
    // The field's own lesson, applied here: the one tint that touches the data
    // plane must not move a mark's contrast. Measured dL = 0.0075 over the
    // ground, and every mark type still over the 3:1 floor on the wash.
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const { ctx, fills } = recordingCtx();
    drawScatter(ctx, at(2500), SC_W, SC_H);

    const wash = fills.filter((f) => f.colour === THETA_BAND_FILL);
    expect(wash.length).toBe(1);
    const rules = thetaRules(PARAMS, geom);
    expect(wash[0]!.x).toBe(rules.lo);
    expect(wash[0]!.x + wash[0]!.w).toBe(rules.hi + 1);
    expect(wash[0]!.h).toBe(geom.plot.h);

    for (const mark of [ACTIVE_COLOUR, SILENCED_SMALL, DOMESTICATED_COLOUR]) {
      expect(contrastRatio(mark, THETA_BAND_FILL)).toBeGreaterThanOrEqual(3);
    }
    // Positive control that the cap is doing work: full-strength tint behind the
    // data would collapse a silenced mark to well under the floor.
    expect(contrastRatio(SILENCED_SMALL, THRESHOLD_RULE)).toBeLessThan(1.5);
  });
});

describe("drawScatter: the domain is sized to the data, not to the all-time max", () => {
  it("covers p99 of the observed distance without being twice as wide as the cloud", () => {
    // Round one used 1.5, a margin on the 1.126 all-time maximum, and the
    // audited render found 20 of 30 tenth-unit bins empty at thirty seconds
    // with the cloud in 250px of an 847px axis. Both bounds are asserted, so
    // widening the axis back fails as loudly as narrowing it past the data.
    const abs: number[] = [];
    for (const gen of [250, 800, 2500, 4000]) {
      const world = at(gen);
      for (const g of world.genomes) {
        const sorted = [...g.repertoire].sort((a, b) => a - b);
        for (const c of g.copies) {
          const d = nearestSignedDistance(c.s, sorted);
          if (d !== null) abs.push(Math.abs(d));
        }
      }
    }
    abs.sort((a, b) => a - b);
    const q = (f: number) => abs[Math.floor(f * (abs.length - 1))]!;
    // Positive control on the fixture: a real, spread population.
    expect(abs.length).toBeGreaterThan(3000);
    expect(q(0.99)).toBeGreaterThan(0.3);

    expect(X_LIMIT, "axis narrower than p99 of its own data").toBeGreaterThanOrEqual(q(0.99));
    expect(X_LIMIT, "axis more than 3x p95, i.e. mostly empty").toBeLessThanOrEqual(3 * q(0.95));
  });
});

describe("drawScatter: copies with no piRNA reference get a lane, not a NaN", () => {
  it("puts the whole opening population in the lane and empties it as the trap spreads", () => {
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const opening = at(10);
    const openPlacement = placeCopies(opening, geom);
    const openCopies = opening.genomes.reduce((n, g) => n + g.copies.length, 0);
    expect(openCopies).toBeGreaterThan(0); // positive control on the fixture
    expect(openPlacement.noReference).toBe(openCopies);
    for (const m of openPlacement.marks) {
      expect(m.d).toBeNull();
      expect(Number.isFinite(m.x) && Number.isFinite(m.y)).toBe(true);
      expect(m.x).toBeGreaterThanOrEqual(geom.lane.x);
      expect(m.x).toBeLessThanOrEqual(geom.lane.x + geom.lane.w);
      expect(m.x).toBeLessThan(geom.plot.x);
    }
    const settled = placeCopies(at(400), geom);
    expect(settled.noReference).toBe(0);
    expect(settled.marks.length).toBeGreaterThan(500);
  });
});

describe("drawScatter: an off-scale copy is counted and drawn as one", () => {
  it("draws it as a narrower tick at the boundary, reports it, and drops nothing", () => {
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const copy = (id: number, s: number): Copy => ({
      id,
      site: 500,
      r: 0.1,
      s,
      domesticated: false,
    });
    const genome: Genome = { copies: [copy(1, 0.5), copy(2, 9)], repertoire: [0] };
    const world: World = { ...freshWorld(), genomes: [genome] };
    const placement = placeCopies(world, geom);

    // Positive control, asserted first: the in-range copy is not counted and
    // lands at its true distance, as a full-width mark.
    expect(placement.marks[0]!.offScale).toBe(false);
    expect(placement.marks[0]!.x).toBeCloseTo(geom.xAt(0.5), 9);

    expect(placement.offScale).toBe(1);
    expect(placement.marks[1]!.offScale).toBe(true);
    expect(placement.marks[1]!.d).toBe(9);
    expect(placement.marks[1]!.x).toBeCloseTo(geom.xAt(X_LIMIT), 9);
    expect(placement.marks.length).toBe(2);

    const { ctx, fills, texts } = recordingCtx();
    drawScatter(ctx, world, SC_W, SC_H);
    const marks = fills.filter((f) => f.colour === ACTIVE_COLOUR && f.h === MARK);
    expect(marks.length).toBe(2);
    const widths = marks.map((m) => m.w).sort((a, b) => a - b);
    // A pile at the boundary must read as a pile at the boundary, so an
    // off-scale copy is NOT the same glyph as a copy at |d| = X_LIMIT.
    expect(widths).toEqual([OFF_SCALE_MARK, MARK]);
    expect(OFF_SCALE_MARK).toBeLessThan(MARK);
    expect(texts.some((t) => t.text.includes("OFF-SCALE 1"))).toBe(true);
  });

  it("says nothing about off-scale copies when there are none", () => {
    const { ctx, texts } = recordingCtx();
    const world = at(2500);
    const geom = scatterGeometry(world.params, SC_W, SC_H);
    // Positive control: this fixture genuinely has none to report.
    expect(placeCopies(world, geom).offScale).toBe(0);
    drawScatter(ctx, world, SC_W, SC_H);
    expect(texts.some((t) => t.text.includes("no reference"))).toBe(true);
    expect(texts.some((t) => t.text.includes("OFF-SCALE"))).toBe(false);
  });
});

describe("drawScatter: every mark stays inside the region that gives it meaning", () => {
  it("keeps marks off the ceiling rule's far side and out of the gutter", () => {
    const world = at(2500);
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const { ctx, fills } = recordingCtx();
    drawScatter(ctx, world, SC_W, SC_H);

    const markColours = new Set([ACTIVE_COLOUR, SILENCED_SMALL, DOMESTICATED_COLOUR]);
    const marks = fills.filter((f) => markColours.has(f.colour) && f.h === MARK);
    const copies = world.genomes.reduce((n, g) => n + g.copies.length, 0);
    expect(marks.length).toBe(copies);

    let atTop = 0;
    for (const m of marks) {
      expect(m.y).toBeGreaterThanOrEqual(geom.plot.y - 1e-9);
      expect(m.y + m.h).toBeLessThanOrEqual(geom.plot.y + geom.plot.h + 1e-9);
      const inLane =
        m.x >= geom.lane.x - 1e-9 && m.x + m.w <= geom.lane.x + geom.lane.w + 1e-9;
      const inPlot =
        m.x >= geom.plot.x - 1e-9 && m.x + m.w <= geom.plot.x + geom.plot.w + 1e-9;
      expect(inLane || inPlot, "a mark landed in the gutter between the two").toBe(true);
      if (Math.abs(m.y - geom.plot.y) < 1e-9) atTop++;
    }
    // Positive control: copies really are piled on the ceiling here, so the
    // top-edge bound is exercised rather than vacuous.
    expect(atTop).toBeGreaterThan(50);
  });

  it("keeps its own axis labels from running into each other", () => {
    // `none` and `-1.5` had a 4px gap -- under one character -- so two labels
    // for different things read as one string.
    const { ctx, texts } = recordingCtx();
    drawScatter(ctx, at(2500), SC_W, SC_H);
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const baseline = geom.plot.y + geom.plot.h + 13;
    const row = texts.filter((t) => t.y === baseline);
    // Positive control: all four ticks were placed, none suppressed.
    expect(row.map((t) => t.text).sort()).toEqual(
      ["+0.6", "-0.6", "0", "none"].sort(),
    );
    const boxes = row.map(textBox).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < boxes.length; i++) {
      expect(
        boxes[i]![0] - boxes[i - 1]![1],
        `labels too close: ${row.map((t) => t.text).join("|")}`,
      ).toBeGreaterThanOrEqual(2 * ADVANCE);
    }
  });

  it("writes its caption with real typography", () => {
    const { ctx, texts } = recordingCtx();
    drawScatter(ctx, at(2500), SC_W, SC_H);
    const caption = texts.find((t) => t.text.includes("nearest piRNA match"))!;
    expect(caption).toBeDefined();
    expect(caption.text).toContain("—");
    expect(caption.text).toContain("±");
    expect(caption.text).not.toContain("--");
  });
});

describe("drawScatter: the render leaves sim state exactly as it found it", () => {
  /**
   * ⚠️ SAME FIXTURE PROBLEM AS `tests/render-field.test.ts` (b), same fix, and
   * for the same reason: `sim/` keeps `Genome.repertoire` sorted ascending
   * since 2026-09-03, so an in-place sort of a repertoire that came out of
   * `step` moves nothing and the `.slice()` in `sortedRepertoire` could be
   * deleted with every assertion below still green. The old control asserted
   * that at least one repertoire was NOT ascending and it went false when the
   * invariant landed.
   *
   * The world is deep-cloned before it is perturbed because `at()` hands out a
   * cached snapshot that other tests in this file read.
   */
  it("does not reorder genome.repertoire, which stateHash reads", () => {
    const world = at(2500);
    const before = world.genomes.map((g) => [...g.repertoire]);
    const genomesBefore = JSON.stringify(world.genomes);

    const { ctx } = recordingCtx();
    drawScatter(ctx, world, SC_W, SC_H);

    expect(world.genomes.map((g) => [...g.repertoire])).toEqual(before);
    expect(JSON.stringify(world.genomes)).toBe(genomesBefore);
    expect(Math.max(...before.map((r) => r.length))).toBeGreaterThan(20);

    // Detecting power, on an array a sort would actually move.
    const scratch: World = {
      ...world,
      genomes: structuredClone(world.genomes),
    };
    const victim = scratch.genomes.find((g) => g.repertoire.length > 20);
    expect(
      victim,
      "no genome reached 20 repertoire entries, so nothing here could detect a sort",
    ).toBeDefined();
    const scrambled = [...victim!.repertoire].reverse();
    victim!.repertoire = [...scrambled];
    expect(
      scrambled.some((x, i) => i > 0 && x < scrambled[i - 1]!),
      "the perturbed repertoire is still ascending, so a sort would not move it",
    ).toBe(true);

    const second = recordingCtx();
    drawScatter(second.ctx, scratch, SC_W, SC_H);
    expect(
      victim!.repertoire,
      "drawScatter reordered a repertoire it was given",
    ).toEqual(scrambled);
  });
});

/* ========================================================================== *
 * nearestSignedDistance
 * ========================================================================== */

describe("nearestSignedDistance: the magnitude the scatter plots is the true nearest", () => {
  it("agrees with a full scan of the repertoire, copy by copy", () => {
    let checked = 0;
    const signsSeen = new Set<number>();
    for (const gen of [250, 1500, 4000]) {
      const world = at(gen);
      for (const g of world.genomes) {
        const sorted = [...g.repertoire].sort((a, b) => a - b);
        for (const c of g.copies) {
          let best: number | null = null;
          for (const e of g.repertoire) {
            const d = c.s - e;
            if (best === null || Math.abs(d) < Math.abs(best)) best = d;
          }
          expect(nearestSignedDistance(c.s, sorted), `copy ${c.id} gen ${gen}`).toBe(best);
          if (best !== null) signsSeen.add(Math.sign(best));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(3000);
    expect(signsSeen.has(1) && signsSeen.has(-1)).toBe(true);
  });

  it("resolves an exact tie towards the lower entry, and reports none for an empty repertoire", () => {
    expect(nearestSignedDistance(1, [])).toBeNull();
    expect(nearestSignedDistance(1, [0, 2])).toBe(1);
    expect(nearestSignedDistance(1.1, [0, 2])).toBeCloseTo(-0.9, 12);
    expect(nearestSignedDistance(0.9, [0, 2])).toBeCloseTo(0.9, 12);
    expect(nearestSignedDistance(-5, [0, 2])).toBe(-5);
    expect(nearestSignedDistance(7, [0, 2])).toBe(5);
  });
});

/* ========================================================================== *
 * CLUSTER INSET
 * ========================================================================== */

describe("drawClusterInset: the magnification is drawn, not asserted in words", () => {
  it("draws a scale bar exactly as wide as those sites are in the field", () => {
    // Round one printed a factor, and the audited render measured 30.6x under a
    // caption saying 33.8x. A stated magnification that is not the real one is
    // the defect this panel exists to replace, so the number is gone: the bar's
    // WIDTH is the claim, and it is derived from the field's live px/site.
    const field = fieldRect(FIELD_W, FIELD_H);
    const cluster = spanGeometry(PARAMS, field).cluster!;
    const world = at(600);
    const geom = clusterInsetGeometry(
      PARAMS,
      IN_W,
      IN_H,
      cluster.pxPerSite,
      world.genomes.length,
    );
    expect(geom.sites).toBe(Math.floor(PARAMS.c * PARAMS.S));
    expect(geom.fieldBarW).toBeCloseTo(geom.sites * cluster.pxPerSite, 12);
    // Positive control: the inset really is a magnification, so the bar is much
    // shorter than the block beside it.
    expect(geom.block.w / geom.fieldBarW).toBeGreaterThan(5);

    const { ctx, fills, texts } = recordingCtx();
    drawClusterInset(ctx, world, IN_W, IN_H, cluster.pxPerSite);
    const bar = fills.find((f) => f.colour === ACTIVE_COLOUR && f.h === 4);
    expect(bar, "no scale bar drawn").toBeDefined();
    expect(bar!.w).toBeCloseTo(geom.fieldBarW, 9);
    expect(texts.some((t) => t.text === "same, in the field:")).toBe(true);
    // ...and no factor is printed anywhere, since none can be checked by eye.
    expect(texts.some((t) => /\dx\b/.test(t.text))).toBe(false);
  });

  it("draws every cell boundary, so five sites read as five cells", () => {
    // Interior-only separators gave 4 rules under a caption saying "5 cluster
    // sites": a reader counts 4 lines and 3 columns, and the mark in the last
    // site floats past the final rule looking like an overflow.
    const field = fieldRect(FIELD_W, FIELD_H);
    const px = spanGeometry(PARAMS, field).cluster!.pxPerSite;
    const world = at(600);
    const geom = clusterInsetGeometry(PARAMS, IN_W, IN_H, px, world.genomes.length);
    const { ctx, fills, texts } = recordingCtx();
    drawClusterInset(ctx, world, IN_W, IN_H, px);

    const verticals = fills
      .filter((f) => f.w === 1 && f.h === geom.block.h)
      .map((f) => f.x)
      .sort((a, b) => a - b);
    expect(verticals.length, "one boundary per cell edge").toBe(geom.sites + 1);
    for (let i = 0; i <= geom.sites; i++) {
      expect(verticals[i]).toBeCloseTo(geom.block.x + i * geom.pxPerSite, 9);
    }
    expect(texts.some((t) => t.text === `${geom.sites} cluster sites`)).toBe(true);
  });

  it("tiles the block exactly: one cell per site, one row per genome", () => {
    const field = fieldRect(FIELD_W, FIELD_H);
    const px = spanGeometry(PARAMS, field).cluster!.pxPerSite;
    const world = at(600);
    const geom = clusterInsetGeometry(PARAMS, IN_W, IN_H, px, world.genomes.length);
    expect(geom.pxPerSite * geom.sites).toBeCloseTo(geom.block.w, 9);
    expect(geom.rowH * world.genomes.length).toBeCloseTo(geom.block.h, 9);

    const { ctx, fills, texts } = recordingCtx();
    drawClusterInset(ctx, world, IN_W, IN_H, px);

    const markColours = new Set([ACTIVE_COLOUR, SILENCED_SMALL, DOMESTICATED_COLOUR]);
    const marks = fills.filter(
      (f) => markColours.has(f.colour) && Math.abs(f.w - geom.pxPerSite) < 1e-9,
    );
    const inCluster = world.genomes.reduce(
      (n, g) => n + g.copies.filter((c) => isClusterSite(c.site, PARAMS)).length,
      0,
    );
    expect(inCluster).toBeGreaterThan(0);
    expect(marks.length, "one mark per copy in a cluster site, and no others").toBe(inCluster);

    for (const m of marks) {
      expect(m.x).toBeGreaterThanOrEqual(geom.block.x - 1e-9);
      expect(m.x + m.w).toBeLessThanOrEqual(geom.block.x + geom.block.w + 1e-9);
      expect(m.y).toBeGreaterThanOrEqual(geom.block.y - 1e-9);
      expect(m.y + m.h).toBeLessThanOrEqual(geom.block.y + geom.block.h + 1e-9);
      const cell = (m.x - geom.block.x) / geom.pxPerSite;
      expect(Math.abs(cell - Math.round(cell))).toBeLessThan(1e-9);
      expect(Math.round(cell)).toBeLessThan(geom.sites);
    }
    expect(texts.some((t) => t.text === `in trap: ${inCluster}`)).toBe(true);
  });

  it("puts a genome in the same row the field puts it in", () => {
    const world = at(600);
    const order = rowOrder(world);
    const field = fieldRect(FIELD_W, FIELD_H);
    const px = spanGeometry(PARAMS, field).cluster!.pxPerSite;
    const geom = clusterInsetGeometry(PARAMS, IN_W, IN_H, px, world.genomes.length);

    const { ctx, fills } = recordingCtx();
    drawClusterInset(ctx, world, IN_W, IN_H, px);
    const markColours = new Set([ACTIVE_COLOUR, SILENCED_SMALL, DOMESTICATED_COLOUR]);
    const marks = fills.filter(
      (f) => markColours.has(f.colour) && Math.abs(f.w - geom.pxPerSite) < 1e-9,
    );

    let checked = 0;
    for (const m of marks) {
      const row = Math.round((m.y - geom.block.y) / geom.rowH);
      const genome = world.genomes[order[row]!]!;
      const site = Math.round((m.x - geom.block.x) / geom.pxPerSite);
      expect(
        genome.copies.some((c) => c.site === site),
        `row ${row} has no copy at cluster site ${site}`,
      ).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
    const counts = order.map((i) => world.genomes[i]!.copies.length);
    expect(counts.every((c, i) => i === 0 || c <= counts[i - 1]!)).toBe(true);

    const rec = recordingCtx();
    drawField(rec.ctx, world, FIELD_W, FIELD_H);
    expect(rowOrder(world)).toEqual(order);
  });
});
