/**
 * Guards for the two data panels and the magnified trap.
 *
 * `web/render/timeline.ts`, `web/render/scatter.ts` and
 * `web/render/cluster-inset.ts` all make claims that are invisible in their own
 * output: an axis that says it is logarithmic, a mark whose colour claims to
 * agree with its position, a label that prints a magnification factor. None of
 * those can be checked by looking at the picture, which is exactly why the
 * defects they were built to avoid survived review three times in this project.
 *
 * Everything here drives the REAL draw functions through a recording stub, or
 * the real exported geometry, rather than re-deriving what they would have done.
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
  contrastRatio,
  drawField,
  fieldRect,
  nearestSignedDistance,
  rowOrder,
  spanGeometry,
} from "../web/render/field.js";
import {
  SERIES,
  SILENCED_LINE,
  TOTAL_LINE,
  drawTimeline,
  niceCeil,
  timelineGeometry,
} from "../web/render/timeline.js";
import {
  MARK,
  X_LIMIT,
  drawScatter,
  placeCopies,
  scatterGeometry,
} from "../web/render/scatter.js";
import {
  clusterInsetGeometry,
  drawClusterInset,
  zoomLabel,
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
      texts.push({ text, x, y });
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

function freshWorld(seed?: number): World {
  return createWorld(
    defaultParams(
      seed === undefined ? TOY_DEFAULTS : { ...TOY_DEFAULTS, seed },
    ),
  );
}

/**
 * Generations this file inspects. One run of the model is walked past all of
 * them once and a copy of the genome array is kept at each; re-running the sim
 * from scratch per call cost 87s in this file against about a tenth of that for
 * the ladder, and it is the same trajectory either way because the RNG stream is
 * deterministic from the seed.
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
  // A fresh genome array per caller, so no test can leak state into another.
  return { ...w, genomes: structuredClone(w.genomes) };
}

/**
 * Snapshots spaced as the page actually produces them: `speed = 3` generations
 * per animation frame, so consecutive snapshots are 3 generations apart and the
 * array index is NOT the generation. The counts come from a real run at
 * `TOY_DEFAULTS` where a real run is affordable; where a claim is about the
 * axis rather than about the data, the counts are irrelevant and the SPACING is
 * the part that has to be real.
 */
function paced(gens: number, counts?: (g: number) => number): Snapshot[] {
  const out: Snapshot[] = [];
  for (let g = 0; g <= gens; g += 3) {
    const total = counts ? counts(g) : 60 + g;
    out.push({
      generation: g,
      totalCopies: total,
      activeCopies: Math.round(total * 0.6),
      silencedCopies: Math.round(total * 0.35),
      domesticatedCopies:
        total - Math.round(total * 0.6) - Math.round(total * 0.35),
      meanRate: 0.15,
      fractionWithRepertoire: 1,
    });
  }
  return out;
}

/* ========================================================================== *
 * TIMELINE
 * ========================================================================== */

describe("drawTimeline: the generation axis is logarithmic and says so", () => {
  it("keeps the invasion a readable share of the width instead of a few pixels", () => {
    // The measured defect. At `TOY_DEFAULTS` total copies run 60 -> 73 -> 105 ->
    // 322 -> 961 at generations 0/10/25/50/100 and then fluctuate with no
    // further shape; at speed 3 and 60fps generation 100 arrives 0.56s after the
    // page loads. On a linear axis that whole act is 2.5% of the width by
    // generation 4000 and keeps shrinking without bound.
    const share = (gN: number, upTo: number): number => {
      const geom = timelineGeometry(paced(gN), TL_W, TL_H)!;
      return (geom.xAt(upTo) - geom.plot.x) / geom.plot.w;
    };
    // Positive control: at the moment the invasion ends it fills the panel, so
    // the assertions below are about compression over time, not about a
    // constant. `paced` steps 3 generations at a time, so the last snapshot of
    // a 100-generation fixture is generation 99.
    expect(share(100, 99)).toBeCloseTo(1, 9);

    expect(share(4000, 100)).toBeGreaterThan(0.45);
    expect(share(12000, 100)).toBeGreaterThan(0.4);

    // ...against what a linear axis would have given, on the same fixtures.
    const linear = (gN: number, upTo: number) => upTo / gN;
    expect(linear(4000, 100)).toBeLessThan(0.03);
    expect(share(4000, 100) / linear(4000, 100)).toBeGreaterThan(15);
  });

  it("positions a point by its GENERATION, not by its index in the array", () => {
    // The two are not the same number and `window.__sim.setSpeed` already lets
    // a visitor change the ratio mid-session, so the ring can hold frames 3
    // generations apart followed by frames 12 apart. Under the brief's
    // `i / (length - 1)` mapping the dial would visibly rescale history.
    const uniform = paced(300);
    const dialled: Snapshot[] = uniform
      .filter((s) => s.generation < 100)
      .concat(
        uniform.filter((s) => s.generation >= 100 && s.generation % 12 === 0),
      );
    if (dialled[dialled.length - 1]!.generation !== 300) {
      dialled.push(uniform[uniform.length - 1]!);
    }
    // Positive control: the two fixtures really do differ in index density over
    // the same generation span, so the equality below is not trivially true.
    expect(dialled[0]!.generation).toBe(uniform[0]!.generation);
    expect(dialled[dialled.length - 1]!.generation).toBe(300);
    expect(uniform.length / dialled.length).toBeGreaterThan(1.7);

    const a = timelineGeometry(uniform, TL_W, TL_H)!;
    const b = timelineGeometry(dialled, TL_W, TL_H)!;
    for (const g of [0, 3, 96, 108, 156, 300]) {
      expect(
        b.xAt(g),
        `generation ${g} moved when the frame rate changed`,
      ).toBeCloseTo(a.xAt(g), 9);
    }
    // ...and the mapping is monotone in generation over the whole fixture.
    for (let i = 1; i < uniform.length; i++) {
      expect(a.xAt(uniform[i]!.generation)).toBeGreaterThan(
        a.xAt(uniform[i - 1]!.generation),
      );
    }
  });

  it("rules and labels the real decades, not fractions of the window", () => {
    // The compression has to be STATED. A rule at 25%/50%/75% of the width would
    // be drawn in the same places on a linear axis and says nothing about which
    // generations the left half of the panel holds.
    const geom = timelineGeometry(paced(3000), TL_W, TL_H)!;
    expect(geom.decades).toEqual([1, 10, 100, 1000]);
    for (const d of geom.decades) {
      expect(geom.xAt(d)).toBeGreaterThanOrEqual(geom.plot.x - 1e-9);
      expect(geom.xAt(d)).toBeLessThanOrEqual(geom.plot.x + geom.plot.w + 1e-9);
    }
    const { ctx, texts } = recordingCtx();
    drawTimeline(ctx, paced(3000), TL_W, TL_H);
    for (const d of geom.decades) {
      const label = texts.find(
        (t) => t.text === String(d) && Math.abs(t.x - geom.xAt(d)) < 1.5,
      );
      expect(label, `no label '${d}' at its own rule`).toBeDefined();
    }
    // Positive control: the axis is named as logarithmic where the reader is.
    expect(texts.some((t) => t.text === "generation (log)")).toBe(true);
  });
});

describe("drawTimeline: the count axis is readable against printed numbers", () => {
  it("rounds the top to a whole number at or above the peak", () => {
    // An autoscaled axis topped at the raw maximum has no readable scale: the
    // peak touches the ceiling by construction and every other height is a
    // fraction of a number nobody is shown.
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
    const snaps = paced(1200, (g) => (g < 100 ? 60 + g * 9 : 1100 + (g % 400)));
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    const { ctx, texts } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);

    // Positive control: the labels exist at all.
    const labelled = geom.yTicks.map((v) => String(Math.round(v)));
    for (const want of labelled) {
      expect(
        texts.some((t) => t.text === want),
        `label ${want}`,
      ).toBe(true);
    }
    for (const v of geom.yTicks) {
      const t = texts.find((t) => t.text === String(Math.round(v)))!;
      // The label is drawn 3px below the rule it names.
      expect(
        Math.abs(t.y - 3 - geom.yAt(v)),
        `label ${v} off its rule`,
      ).toBeLessThan(1.5);
    }
    // The peak is inside the plot, not on its edge or beyond it.
    const peak = Math.max(...snaps.map((s) => s.totalCopies));
    expect(geom.yAt(peak)).toBeGreaterThan(geom.plot.y);
    expect(geom.yAt(0)).toBeCloseTo(geom.plot.y + geom.plot.h, 9);
  });

  it("keeps every drawn series vertex inside the plot rect", () => {
    const world = freshWorld();
    const snaps = history(world, 600);
    const geom = timelineGeometry(snaps, TL_W, TL_H)!;
    const { ctx, strokes } = recordingCtx();
    drawTimeline(ctx, snaps, TL_W, TL_H);

    expect(strokes.length).toBe(SERIES.length);
    let vertices = 0;
    for (const s of strokes) {
      expect(s.points.length).toBe(snaps.length);
      for (const [x, y] of s.points) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(geom.plot.x - 1e-9);
        expect(x).toBeLessThanOrEqual(geom.plot.x + geom.plot.w + 1e-9);
        expect(y).toBeGreaterThanOrEqual(geom.plot.y - 1e-9);
        expect(y).toBeLessThanOrEqual(geom.plot.y + geom.plot.h + 1e-9);
        vertices++;
      }
    }
    // A run that drew nothing would satisfy every bound above.
    expect(vertices).toBeGreaterThan(1500);
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

describe("drawTimeline: every series line clears the 3:1 graphical-object floor", () => {
  it("lightens silenced because the field's own silenced colour does not", () => {
    // The argument, both halves. `SILENCED_COLOUR` survives in `drawField`
    // because a mark there is a filled rect whose whole area carries it; a
    // 1.5px polyline has no area to spend, and the silenced curve is the one
    // whose shape is the point of this panel.
    expect(contrastRatio(SILENCED_COLOUR, FIELD_BG)).toBeLessThan(3);
    for (const [, colour, label] of SERIES) {
      expect(
        contrastRatio(colour, FIELD_BG),
        `${label} line`,
      ).toBeGreaterThanOrEqual(3);
    }
    // ...and the two that need no lightening are the field's own colours.
    expect(SERIES.map(([, c]) => c)).toEqual([
      TOTAL_LINE,
      SILENCED_LINE,
      ACTIVE_COLOUR,
    ]);
  });
});

/* ========================================================================== *
 * SCATTER
 * ========================================================================== */

describe("drawScatter: colour and position are the same claim", () => {
  it("greys a copy exactly when its mark lies between the theta rules", () => {
    // This is what the distance axis buys. Under the brief's absolute-`s` axis
    // there was no position a grey mark had to occupy, so a divergence between
    // the colour rule and the coordinate could not be detected at all.
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const lo = geom.xAt(-PARAMS.theta);
    const hi = geom.xAt(PARAMS.theta);
    let grey = 0;
    let red = 0;
    let green = 0;

    for (const gen of [250, 800, 2500, 4000]) {
      const world = at(gen);
      const placement = placeCopies(world, geom);
      // Every mark, against `sim/silencing.ts` itself, in draw order.
      const expected: string[] = [];
      for (const g of world.genomes) {
        for (const c of g.copies) {
          expected.push(
            c.domesticated
              ? DOMESTICATED_COLOUR
              : isSilenced(c, g, PARAMS)
                ? SILENCED_COLOUR
                : ACTIVE_COLOUR,
          );
        }
      }
      expect(
        placement.marks.map((m) => m.colour),
        `colours at gen ${gen}`,
      ).toEqual(expected);

      for (const m of placement.marks) {
        if (m.d === null) continue;
        const inside = m.x >= lo - 1e-9 && m.x <= hi + 1e-9;
        if (m.colour === SILENCED_COLOUR) {
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
});

describe("drawScatter: copies with no piRNA reference get a lane, not a NaN", () => {
  it("puts the whole opening population in the lane and empties it as the trap spreads", () => {
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    // Measured at TOY_DEFAULTS seed 1: every genome's repertoire is empty until
    // ~gen 25, 252 of 322 copies are still unreferenced at gen 50, 20 of 961 at
    // gen 100, and none from gen 200.
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
      // ...and never inside the distance plot, whose left edge means -1.5.
      expect(m.x).toBeLessThan(geom.plot.x);
    }

    const settled = placeCopies(at(400), geom);
    expect(settled.noReference).toBe(0);
    expect(settled.marks.length).toBeGreaterThan(500);
  });
});

describe("drawScatter: an off-scale copy is counted, never silently absorbed", () => {
  it("clamps it to the boundary and reports it, while an in-range copy is untouched", () => {
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const copy = (id: number, s: number): Copy => ({
      id,
      site: 500,
      r: 0.1,
      s,
      domesticated: false,
    });
    const genome: Genome = {
      copies: [copy(1, 0.5), copy(2, 9)],
      repertoire: [0],
    };
    const world: World = {
      ...freshWorld(),
      genomes: [genome],
    };
    const placement = placeCopies(world, geom);

    // Positive control, asserted first: the in-range copy is not counted and
    // lands at its true distance.
    expect(placement.marks[0]!.offScale).toBe(false);
    expect(placement.marks[0]!.x).toBeCloseTo(geom.xAt(0.5), 9);

    expect(placement.offScale).toBe(1);
    expect(placement.marks[1]!.offScale).toBe(true);
    expect(placement.marks[1]!.d).toBe(9);
    expect(placement.marks[1]!.x).toBeCloseTo(geom.xAt(X_LIMIT), 9);
    expect(placement.marks.length).toBe(2); // nothing dropped

    // ...and the readout says so, rather than leaving the pile-up unexplained.
    const { ctx, texts } = recordingCtx();
    drawScatter(ctx, world, SC_W, SC_H);
    expect(texts.some((t) => t.text.includes("OFF-SCALE 1"))).toBe(true);
  });

  it("says nothing about off-scale copies when there are none", () => {
    const { ctx, texts } = recordingCtx();
    drawScatter(ctx, at(2500), SC_W, SC_H);
    // Positive control: the readout was drawn.
    expect(texts.some((t) => t.text.includes("no reference"))).toBe(true);
    expect(texts.some((t) => t.text.includes("OFF-SCALE"))).toBe(false);
  });
});

describe("drawScatter: every mark stays inside the region that gives it meaning", () => {
  it("keeps marks off the ceiling rule's far side and out of the gutter", () => {
    // 10-27% of copies sit EXACTLY on rMax, so the top edge is where a missing
    // clamp shows up: at r = rMax the unclamped rect starts at plot.y - 1.
    const world = at(2500);
    const geom = scatterGeometry(PARAMS, SC_W, SC_H);
    const { ctx, fills } = recordingCtx();
    drawScatter(ctx, world, SC_W, SC_H);

    const markColours = new Set([
      ACTIVE_COLOUR,
      SILENCED_COLOUR,
      DOMESTICATED_COLOUR,
    ]);
    const marks = fills.filter(
      (f) => markColours.has(f.colour) && f.w === MARK,
    );
    const copies = world.genomes.reduce((n, g) => n + g.copies.length, 0);
    expect(marks.length).toBe(copies);

    let atTop = 0;
    for (const m of marks) {
      expect(m.y).toBeGreaterThanOrEqual(geom.plot.y - 1e-9);
      expect(m.y + m.h).toBeLessThanOrEqual(geom.plot.y + geom.plot.h + 1e-9);
      const inLane =
        m.x >= geom.lane.x - 1e-9 &&
        m.x + m.w <= geom.lane.x + geom.lane.w + 1e-9;
      const inPlot =
        m.x >= geom.plot.x - 1e-9 &&
        m.x + m.w <= geom.plot.x + geom.plot.w + 1e-9;
      expect(
        inLane || inPlot,
        "a mark landed in the gutter between the two",
      ).toBe(true);
      if (Math.abs(m.y - geom.plot.y) < 1e-9) atTop++;
    }
    // Positive control: copies really are piled on the ceiling in this fixture,
    // so the top-edge bound above is exercised rather than vacuous.
    expect(atTop).toBeGreaterThan(50);
  });
});

describe("drawScatter: the render leaves sim state exactly as it found it", () => {
  it("does not reorder genome.repertoire, which stateHash and reproduce both read", () => {
    // The same one-character failure `tests/render-field.test.ts` guards for
    // `drawField`: `sortedRepertoire`'s `.slice()` deleted sorts sim state in
    // place, the picture stays right, and the golden hash moves.
    const world = at(2500);
    const before = world.genomes.map((g) => [...g.repertoire]);
    const genomesBefore = JSON.stringify(world.genomes);

    const { ctx } = recordingCtx();
    drawScatter(ctx, world, SC_W, SC_H);

    expect(world.genomes.map((g) => [...g.repertoire])).toEqual(before);
    expect(JSON.stringify(world.genomes)).toBe(genomesBefore);

    // The fixture can only detect an in-place sort if some repertoire is not
    // already ascending, and only if they are long enough to be reordered.
    expect(Math.max(...before.map((r) => r.length))).toBeGreaterThan(20);
    expect(
      before.some((r) => r.some((x, i) => i > 0 && x < r[i - 1]!)),
      "fixture cannot detect an in-place sort if every repertoire is ascending",
    ).toBe(true);
  });
});

/* ========================================================================== *
 * nearestSignedDistance
 * ========================================================================== */

describe("nearestSignedDistance: the magnitude the scatter plots is the true nearest", () => {
  it("agrees with a full scan of the repertoire, copy by copy", () => {
    // `silencedBySorted` only needs SOME entry within theta, so it cannot catch
    // a nearest-neighbour that picks the wrong side; the scatter's x coordinate
    // can. Brute force over the whole repertoire is the oracle.
    let checked = 0;
    let signsSeen = new Set<number>();
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
          expect(
            nearestSignedDistance(c.s, sorted),
            `copy ${c.id} gen ${gen}`,
          ).toBe(best);
          if (best !== null) signsSeen.add(Math.sign(best));
          checked++;
        }
      }
    }
    // Positive controls: a fixture with distances of one sign only, or none at
    // all, would satisfy the equality above without exercising either branch.
    expect(checked).toBeGreaterThan(3000);
    expect(signsSeen.has(1) && signsSeen.has(-1)).toBe(true);
  });

  it("resolves an exact tie towards the lower entry, and reports none for an empty repertoire", () => {
    expect(nearestSignedDistance(1, [])).toBeNull();
    // Exactly between 0 and 2: both answers are +1 and -1, and the rule picks +1.
    expect(nearestSignedDistance(1, [0, 2])).toBe(1);
    // Off-tie either way, as controls that the rule is not just "always +".
    expect(nearestSignedDistance(1.1, [0, 2])).toBeCloseTo(-0.9, 12);
    expect(nearestSignedDistance(0.9, [0, 2])).toBeCloseTo(0.9, 12);
    // Beyond both ends, where only one neighbour exists.
    expect(nearestSignedDistance(-5, [0, 2])).toBe(-5);
    expect(nearestSignedDistance(7, [0, 2])).toBe(5);
  });
});

/* ========================================================================== *
 * CLUSTER INSET
 * ========================================================================== */

describe("drawClusterInset: the magnification it prints is the magnification it draws", () => {
  it("states a factor equal to its own px/site over the field's px/site", () => {
    // The defect this replaces: the cluster tint drawn at 3.3x the true site
    // scale INSIDE the field, so ~17 copies looked like they were in a trap the
    // readout said held 1. A zoom is legitimate only outside the data plane and
    // only with its factor stated -- and a stated factor that is not the real
    // one is the same lie with an extra step.
    const field = fieldRect(FIELD_W, FIELD_H);
    const cluster = spanGeometry(PARAMS, field).cluster!;
    const geom = clusterInsetGeometry(
      PARAMS,
      IN_W,
      IN_H,
      cluster.pxPerSite,
      60,
    );

    expect(geom.sites).toBe(Math.floor(PARAMS.c * PARAMS.S));
    expect(geom.zoom).toBeCloseTo(geom.pxPerSite / cluster.pxPerSite, 12);
    // Positive control: the inset really is a magnification, not a relabelling.
    expect(geom.zoom).toBeGreaterThan(5);

    const { ctx, texts } = recordingCtx();
    drawClusterInset(ctx, at(600), IN_W, IN_H, cluster.pxPerSite);
    const printed = texts.find((t) => t.text.includes("cluster sites"))!;
    expect(printed).toBeDefined();
    expect(printed.text).toContain(zoomLabel(geom.zoom));
    // ...and the printed figure is the true one to within its own rounding.
    const shown = Number.parseFloat(printed.text.match(/([\d.]+)x/)![1]!);
    expect(Math.abs(shown - geom.zoom)).toBeLessThanOrEqual(0.05);
  });

  it("tiles the block exactly: one cell per site, one row per genome", () => {
    const field = fieldRect(FIELD_W, FIELD_H);
    const px = spanGeometry(PARAMS, field).cluster!.pxPerSite;
    const world = at(600);
    const geom = clusterInsetGeometry(
      PARAMS,
      IN_W,
      IN_H,
      px,
      world.genomes.length,
    );
    expect(geom.pxPerSite * geom.sites).toBeCloseTo(geom.block.w, 9);
    expect(geom.rowH * world.genomes.length).toBeCloseTo(geom.block.h, 9);

    const { ctx, fills } = recordingCtx();
    drawClusterInset(ctx, world, IN_W, IN_H, px);

    const markColours = new Set([
      ACTIVE_COLOUR,
      SILENCED_COLOUR,
      DOMESTICATED_COLOUR,
    ]);
    const marks = fills.filter((f) => markColours.has(f.colour));
    const inCluster = world.genomes.reduce(
      (n, g) =>
        n + g.copies.filter((c) => isClusterSite(c.site, PARAMS)).length,
      0,
    );
    // Positive control: the fixture has copies in the trap to draw.
    expect(inCluster).toBeGreaterThan(0);
    expect(
      marks.length,
      "one mark per copy in a cluster site, and no others",
    ).toBe(inCluster);

    for (const m of marks) {
      expect(m.w).toBeCloseTo(geom.pxPerSite, 9);
      expect(m.x).toBeGreaterThanOrEqual(geom.block.x - 1e-9);
      expect(m.x + m.w).toBeLessThanOrEqual(geom.block.x + geom.block.w + 1e-9);
      expect(m.y).toBeGreaterThanOrEqual(geom.block.y - 1e-9);
      expect(m.y + m.h).toBeLessThanOrEqual(geom.block.y + geom.block.h + 1e-9);
      // Every mark starts on a site-cell boundary, so a cell means one site.
      const cell = (m.x - geom.block.x) / geom.pxPerSite;
      expect(Math.abs(cell - Math.round(cell))).toBeLessThan(1e-9);
      expect(Math.round(cell)).toBeLessThan(geom.sites);
    }
    // ...and the count it prints is the count it drew.
    const { texts } = (() => {
      const rec = recordingCtx();
      drawClusterInset(rec.ctx, world, IN_W, IN_H, px);
      return rec;
    })();
    expect(texts.some((t) => t.text === `in trap: ${inCluster}`)).toBe(true);
  });

  it("puts a genome in the same row the field puts it in", () => {
    // Two panels that both claim to show 'the same genome, one row each' must
    // agree, or the inset is a magnification of a different picture.
    const world = at(600);
    const order = rowOrder(world);
    const field = fieldRect(FIELD_W, FIELD_H);
    const px = spanGeometry(PARAMS, field).cluster!.pxPerSite;
    const geom = clusterInsetGeometry(
      PARAMS,
      IN_W,
      IN_H,
      px,
      world.genomes.length,
    );

    const { ctx, fills } = recordingCtx();
    drawClusterInset(ctx, world, IN_W, IN_H, px);
    const markColours = new Set([
      ACTIVE_COLOUR,
      SILENCED_COLOUR,
      DOMESTICATED_COLOUR,
    ]);
    const marks = fills.filter((f) => markColours.has(f.colour));

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
    // Positive control, plus the ordering property the field itself asserts.
    expect(checked).toBeGreaterThan(0);
    const counts = order.map((i) => world.genomes[i]!.copies.length);
    expect(counts.every((c, i) => i === 0 || c <= counts[i - 1]!)).toBe(true);

    // The field draws the same rows in the same order, so the two panels agree.
    const rec = recordingCtx();
    drawField(rec.ctx, world, FIELD_W, FIELD_H);
    expect(rowOrder(world)).toEqual(order);
  });
});
