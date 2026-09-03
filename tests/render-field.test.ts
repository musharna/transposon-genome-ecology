/**
 * The render accelerator's equivalence guard.
 *
 * `web/render/field.ts` does not call `sim/silencing.ts`'s `isSilenced`. It
 * reimplements the predicate over a sorted copy of the repertoire, because
 * `isSilenced` scans the whole repertoire per copy and that repertoire grows
 * without bound. Two things can go wrong with that, and only one of them is
 * visible on screen:
 *
 *   1. THE PREDICATE DIVERGES. Marks get the wrong colour. Loud, but nothing in
 *      the suite watched for it before this file.
 *
 *   2. THE SORT ESCAPES ONTO SIM STATE. `sortedRepertoire` sorts a `.slice()`.
 *      Delete those eight characters and it sorts `genome.repertoire` IN PLACE.
 *      `genome.repertoire` is ORDERED state: `sim/observe.ts`'s `stateHash`
 *      digests it in order and `reproduce` copies it into every daughter, so the
 *      golden hash moves and the model changes -- while every mark on screen
 *      still looks exactly right, because the sorted array answers the same
 *      questions. A one-character deletion silently corrupting the science, with
 *      no observable, is the reason (b) below exists.
 *
 * These run against `TOY_DEFAULTS`, the parameters the page actually ships, and
 * they drive the REAL `drawField` through a recording stub rather than
 * re-deriving what it would have drawn.
 */
import { describe, expect, it } from "vitest";
import {
  createWorld,
  defaultParams,
  isSilenced,
  step,
  type World,
} from "../sim/index.js";
import { TOY_DEFAULTS } from "../web/params.js";
import {
  ACTIVE_COLOUR,
  BENEFICIAL_TINT,
  CLUSTER_TINT,
  DOMESTICATED_COLOUR,
  FIELD_BG,
  SILENCED_COLOUR,
  contrastRatio,
  drawField,
  fieldRect,
  tallyRect,
  silencedBySorted,
  sortedRepertoire,
} from "../web/render/field.js";

/** Generations at which the world is inspected. Spans an empty repertoire
 *  (~7 entries) to a large one (~250), so the binary search is exercised at
 *  both ends of the range the toy actually reaches. */
const MARKS = [50, 250, 750, 1500, 2500, 4000] as const;
const PARAMS = defaultParams(TOY_DEFAULTS);

interface Fill {
  colour: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Canvas size used by every drawField call here. */
const W = 900;
const H = 600;

/** Records every fillRect in order, with the fillStyle in force at the time. */
function recordingCtx(): {
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

/** The colour `sim/` says each copy should be, in `drawField`'s draw order:
 *  every non-domesticated copy row by row, then the domesticated ones. */
function expectedMarkColours(world: World): string[] {
  const p = world.params;
  const order = world.genomes.map((_, i) => i);
  order.sort((i, j) => {
    const d = world.genomes[j]!.copies.length - world.genomes[i]!.copies.length;
    return d !== 0 ? d : i - j;
  });
  const plain: string[] = [];
  let domesticated = 0;
  for (const idx of order) {
    const genome = world.genomes[idx]!;
    for (const copy of genome.copies) {
      if (copy.domesticated) domesticated++;
      else
        plain.push(
          isSilenced(copy, genome, p) ? SILENCED_COLOUR : ACTIVE_COLOUR,
        );
    }
  }
  // Domesticated marks are drawn last, each preceded by its halo rect.
  return plain.concat(Array<string>(domesticated).fill(DOMESTICATED_COLOUR));
}

/**
 * Only the rects that are MARKS.
 *
 * Colour alone is not enough to identify one: the tally bar deliberately reuses
 * the same three colours, because it is a second channel for the same states.
 * Position separates them — every mark lands inside the field rect, and the bar
 * is drawn beyond its right edge — and both rects come from `field.ts` itself
 * rather than being restated here, so a layout change cannot quietly turn tally
 * segments back into "marks".
 */
function markColoursDrawn(fills: Fill[]): string[] {
  const mark = new Set([ACTIVE_COLOUR, SILENCED_COLOUR, DOMESTICATED_COLOUR]);
  const field = fieldRect(W, H);
  const bar = tallyRect(W, H);
  return fills
    .filter((f) => mark.has(f.colour) && f.x < bar.x && f.x >= field.x - 2)
    .map((f) => f.colour);
}

function freshWorld(): World {
  return createWorld(defaultParams(TOY_DEFAULTS));
}

describe("drawField: the render accelerator agrees with sim/silencing", () => {
  it("(a) gives every copy the colour isSilenced says it should have, at every mark", () => {
    const world = freshWorld();
    let generation = 0;
    let checked = 0;

    for (const mark of MARKS) {
      while (generation < mark) {
        step(world);
        generation++;
      }
      expect(world.genomes.length).toBeGreaterThan(0);

      const { ctx, fills } = recordingCtx();
      drawField(ctx, world, W, H);

      const drawn = markColoursDrawn(fills);
      const expected = expectedMarkColours(world);
      expect(drawn.length, `mark count at gen ${mark}`).toBe(expected.length);
      expect(drawn, `mark colours at gen ${mark}`).toEqual(expected);
      checked += drawn.length;
    }

    // A test that checked nothing would also pass every assertion above.
    expect(checked).toBeGreaterThan(5000);
  });

  it("(a2) silencedBySorted matches isSilenced copy by copy, including both boundary neighbours", () => {
    const world = freshWorld();
    let generation = 0;
    let silencedSeen = 0;
    let activeSeen = 0;

    for (const mark of MARKS) {
      while (generation < mark) {
        step(world);
        generation++;
      }
      for (const genome of world.genomes) {
        const sorted = sortedRepertoire(genome);
        for (const copy of genome.copies) {
          if (copy.domesticated) continue;
          const viaSort = silencedBySorted(copy.s, sorted, PARAMS.theta);
          const viaSim = isSilenced(copy, genome, PARAMS);
          expect(viaSort, `copy ${copy.id} at gen ${mark}`).toBe(viaSim);
          if (viaSim) silencedSeen++;
          else activeSeen++;
        }
      }
    }
    // Positive control on the fixture: an arm with no silenced copies, or none
    // active, would satisfy the equality above for the wrong reason.
    expect(silencedSeen).toBeGreaterThan(100);
    expect(activeSeen).toBeGreaterThan(100);
  });

  it("(b) leaves genome.repertoire in exactly the order it found it", () => {
    const world = freshWorld();
    let generation = 0;

    for (const mark of MARKS) {
      while (generation < mark) {
        step(world);
        generation++;
      }
      const before = world.genomes.map((g) => [...g.repertoire]);
      const { ctx } = recordingCtx();
      drawField(ctx, world, W, H);
      const after = world.genomes.map((g) => [...g.repertoire]);

      expect(after, `repertoire order at gen ${mark}`).toEqual(before);

      // The check is only meaningful once repertoires are long enough to be
      // reordered by a sort, and once at least one is not already ascending.
      if (mark === MARKS[MARKS.length - 1]) {
        const longest = Math.max(...before.map((r) => r.length));
        expect(longest).toBeGreaterThan(20);
        const anyUnsorted = before.some((r) =>
          r.some((x, i) => i > 0 && x < r[i - 1]!),
        );
        expect(
          anyUnsorted,
          "fixture cannot detect an in-place sort if every repertoire is already ascending",
        ).toBe(true);
      }
    }
  });

  it("(c) leaves copies, sites and every other field of sim state untouched", () => {
    const world = freshWorld();
    for (let i = 0; i < 800; i++) step(world);

    const before = JSON.stringify(world.genomes);
    const generation = world.generation;
    const nextCopyId = world.nextCopyId;

    const { ctx } = recordingCtx();
    drawField(ctx, world, W, H);

    expect(JSON.stringify(world.genomes)).toBe(before);
    expect(world.generation).toBe(generation);
    expect(world.nextCopyId).toBe(nextCopyId);
  });
});

describe("drawField: the marked places are above the visibility floor", () => {
  it("tints both spans at >= 3:1 against the field background", () => {
    // 3:1 is the WCAG floor for a graphical object. The tint these replaced,
    // #1d2530, measures 1.154:1 -- against a field-to-page ratio of 1.077:1,
    // i.e. about twice as visible as a seam nobody was meant to notice.
    expect(contrastRatio(CLUSTER_TINT, FIELD_BG)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(BENEFICIAL_TINT, FIELD_BG)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio("#1d2530", FIELD_BG)).toBeLessThan(1.2);
  });

  it("draws both span tints, at no less than the 15px place-marker floor", () => {
    const world = freshWorld();
    for (let i = 0; i < 300; i++) step(world);

    const widths: Record<string, number> = {};
    let fillStyle = "";
    const stub = {
      clearRect(): void {},
      fillRect(_x: number, _y: number, w: number, h: number): void {
        // The full-height bands are the only rects spanning the field's height.
        if (h > 400) widths[fillStyle] = w;
      },
      fillText(): void {},
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
    drawField(stub as unknown as CanvasRenderingContext2D, world, W, H);

    expect(widths[CLUSTER_TINT], "cluster band drawn").toBeGreaterThanOrEqual(
      15,
    );
    expect(
      widths[BENEFICIAL_TINT],
      "beneficial band drawn",
    ).toBeGreaterThanOrEqual(15);
  });
});
