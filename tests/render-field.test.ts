/**
 * The render accelerator's equivalence guard.
 *
 * `web/render/field.ts` does not call `sim/silencing.ts`'s `isSilenced`. It
 * reimplements the predicate over a sorted copy of the repertoire — originally
 * because `isSilenced` scanned the whole repertoire per copy and that repertoire
 * grows without bound; since 2026-09-03 `isSilenced` is itself a binary search
 * over the same sorted array, and what keeps the local copy is that `sim/` must
 * not import from `web/` and the scatter needs the signed distance rather than
 * the boolean. Two things can go wrong with that, and only one of them is
 * visible on screen:
 *
 *   1. THE PREDICATE DIVERGES. Marks get the wrong colour. Loud, but nothing in
 *      the suite watched for it before this file. ⚠️ AND (a2) BELOW IS NOW A
 *      WEAKER CHECK THAN IT WAS: it held a binary search against a linear scan,
 *      and both sides are binary searches now, so an error the two share would
 *      pass. The scan survives as an explicit reference in
 *      `tests/silencing.test.ts`, which is where a search-versus-scan
 *      disagreement is caught.
 *
 *   2. THE SORT ESCAPES ONTO SIM STATE. `sortedRepertoire` sorts a `.slice()`.
 *      Delete those eight characters and it sorts `genome.repertoire` IN PLACE.
 *      `genome.repertoire` is ORDERED state: `sim/observe.ts`'s `stateHash`
 *      digests it in order, so the model changes -- while every mark on screen
 *      still looks exactly right, because the sorted array answers the same
 *      questions. A one-character deletion silently corrupting the science, with
 *      no observable, is the reason (b) below exists. ⚠️ AND (b) NEEDED A
 *      PERTURBED FIXTURE TO KEEP SEEING IT once `sim/` started handing it
 *      already-sorted repertoires; the reason is written on (b) itself.
 *      ("and `reproduce` copies it into every daughter" stood here as a second
 *      order-sensitive consumer. `reproduce` copies the array wholesale with no
 *      positional read; `stateHash` is the only one.)
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
  BURIAL_STATES,
  MARK_COLOURS,
  analyse,
  recordingCtx as instrumentCtx,
} from "./guards/field-undercount-arm.js";
import { BAR_FLOOR_PX, barLength, sharePercent } from "../web/tally.js";
import {
  ACTIVE_COLOUR,
  BENEFICIAL_FILL,
  edgeRuleRanges,
  BENEFICIAL_TINT,
  CLUSTER_FILL,
  CLUSTER_TINT,
  DOMESTICATED_COLOUR,
  FIELD_BG,
  SILENCED_COLOUR,
  SPAN_FILL_ALPHA,
  contrastRatio,
  drawField,
  fieldRect,
  relativeLuminance,
  silencedBySorted,
  sortedRepertoire,
  spanGeometry,
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
 * is drawn beyond its right edge -- and the field rect comes from `field.ts`
 * itself rather than being restated here, so a layout change cannot quietly
 * reclassify rects.
 */
function markColoursDrawn(fills: Fill[]): string[] {
  const mark = new Set([ACTIVE_COLOUR, SILENCED_COLOUR, DOMESTICATED_COLOUR]);
  const field = fieldRect(W, H);
  return fills
    .filter(
      (f) =>
        mark.has(f.colour) &&
        f.x >= field.x - 2 &&
        f.x <= field.x + field.w + 2,
    )
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

  /**
   * ⚠️ THE FIXTURE STOPPED BEING ABLE TO SEE THE DEFECT, AND SAID SO.
   *
   * Until 2026-09-03 this test drove `drawField` over worlds straight out of
   * `step` and asserted that every repertoire came back in its original order.
   * `sim/` now keeps `Genome.repertoire` SORTED ASCENDING (`sim/state.ts`), so
   * sorting one of those arrays in place is a NO-OP — a deleted `.slice()` in
   * `sortedRepertoire` would leave every assertion above green. The fixture
   * control that used to close this test caught exactly that when the invariant
   * landed: `anyUnsorted` went false and the test failed on its own control
   * rather than on its claim, which is the correct outcome for a check whose
   * subject has moved out from under it.
   *
   * The claim is still worth making — `sortedRepertoire` must not mutate sim
   * state, and a future `trap` that appended out of order would restore the
   * old exposure — so the detecting power is restored by handing the render an
   * array a sort WOULD move. `sortedRepertoire` sorts a copy and its
   * correctness rests on no property of its input's order, so a reversed
   * repertoire is a legitimate input to the render even though it is not
   * legitimate sim state; the perturbation happens after the last mark and
   * nothing steps the world afterwards.
   */
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
    }

    // Everything above is satisfied by a render that sorts sim state in place,
    // because sim state is already sorted. This is not.
    const victim = world.genomes.find((g) => g.repertoire.length > 20);
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

    const { ctx } = recordingCtx();
    drawField(ctx, world, W, H);
    expect(
      victim!.repertoire,
      "drawField reordered a repertoire it was given",
    ).toEqual(scrambled);
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

describe("drawField: the marked places are visible AND do not blind their contents", () => {
  it("marks each span at >= 3:1 against the field background", () => {
    // 3:1 is the WCAG floor for a graphical object. The tint these replaced,
    // #1d2530, measures 1.154:1 -- against a field-to-page ratio of 1.077:1,
    // i.e. about twice as visible as a seam nobody was meant to notice.
    expect(contrastRatio(CLUSTER_TINT, FIELD_BG)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(BENEFICIAL_TINT, FIELD_BG)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio("#1d2530", FIELD_BG)).toBeLessThan(1.2);
  });

  it("keeps every mark legible INSIDE a span, which the 3:1 test alone does not", () => {
    // The failure this exists to catch: painting the full-strength tint behind
    // the data. Both tint luminances sit BETWEEN silenced and active, so a span
    // that clears 3:1 against the field can still collapse its own contents.
    // Measured at full opacity: active-on-cluster 1.265:1, silenced-on-cluster
    // 1.426:1 -- against 4.357:1 and 2.416:1 on plain field.
    const lTint = relativeLuminance(CLUSTER_TINT);
    expect(lTint).toBeGreaterThan(relativeLuminance(SILENCED_COLOUR));
    expect(lTint).toBeLessThan(relativeLuminance(ACTIVE_COLOUR));
    expect(contrastRatio(ACTIVE_COLOUR, CLUSTER_TINT)).toBeLessThan(1.5);

    // What is actually painted inside a span is the capped wash, and every mark
    // type must still clear 2:1 on it -- close to its plain-field value.
    for (const fill of [CLUSTER_FILL, BENEFICIAL_FILL]) {
      expect(relativeLuminance(fill) - relativeLuminance(FIELD_BG)).toBeLessThanOrEqual(0.01);
      expect(contrastRatio(ACTIVE_COLOUR, fill)).toBeGreaterThanOrEqual(3.5);
      expect(contrastRatio(SILENCED_COLOUR, fill)).toBeGreaterThanOrEqual(2);
      expect(contrastRatio(DOMESTICATED_COLOUR, fill)).toBeGreaterThanOrEqual(7);
    }
    expect(SPAN_FILL_ALPHA).toBeLessThanOrEqual(0.1);
  });

  it("draws both spans at the SAME site scale as the marks", () => {
    // The failure this exists to catch: the cluster drawn at 3.00 px/site while
    // the true axis was 0.90 px/site, because its width was floored at 15px
    // while copies stayed at true scale. ~17 copies were painted as though in
    // the trap while the readout said `in cluster: 1`.
    const field = fieldRect(W, H);
    const { cluster, beneficial } = spanGeometry(PARAMS, field);
    expect(cluster).not.toBeNull();
    expect(beneficial).not.toBeNull();

    // The pitch the marks themselves are drawn on.
    const markW = Math.max(1, field.w / PARAMS.S);
    const pitch = (field.w - markW) / PARAMS.S;
    for (const span of [cluster!, beneficial!]) {
      expect(Math.abs(span.pxPerSite - pitch)).toBeLessThan(1e-9);
    }
    // ...so a 5-site span and a 20-site span are on exactly the same scale.
    expect(cluster!.pxPerSite).toBeCloseTo(beneficial!.pxPerSite, 12);
  });

  it("puts exactly the in-span sites inside each span's drawn extent", () => {
    // This is what N2 was really about: ~17 copies were painted inside the blue
    // block while the readout said `in cluster: 1`, because the block was drawn
    // at 3.00 px/site and the copies at 0.90. The property that forbids it is
    // that a site's mark starts inside its span's drawn extent if and only if
    // the site is IN the span -- so the picture and the readout count the same
    // copies. Verified at both ends of both spans, including the boundaries.
    const field = fieldRect(W, H);
    const { cluster, beneficial } = spanGeometry(PARAMS, field);
    const markW = Math.max(1, field.w / PARAMS.S);
    const siteX = (site: number) =>
      field.x + (site / PARAMS.S) * (field.w - markW);
    const EPS = 1e-9;

    const check = (
      span: { x: number; w: number },
      first: number,
      count: number,
    ) => {
      for (const site of [first, first + 1, first + count - 2, first + count - 1]) {
        expect(siteX(site), `site ${site} must start inside`).toBeGreaterThanOrEqual(span.x - EPS);
        expect(siteX(site), `site ${site} must start inside`).toBeLessThan(span.x + span.w + EPS);
      }
      if (first > 0) expect(siteX(first - 1)).toBeLessThan(span.x - EPS);
      if (first + count < PARAMS.S) {
        expect(
          siteX(first + count),
          "the first site OUTSIDE the span must not start inside it",
        ).toBeGreaterThanOrEqual(span.x + span.w - EPS);
      }
      // A mark is floored at 1px while the pitch is ~0.92px, so the last mark
      // overhangs its own cell -- but by less than one pixel, not by 4.
      const overhang = siteX(first + count - 1) + markW - (span.x + span.w);
      expect(overhang).toBeLessThan(markW);
    };

    check(cluster!, 0, Math.floor(PARAMS.c * PARAMS.S));
    const benefSites = Math.floor(PARAMS.beta * PARAMS.S);
    check(beneficial!, PARAMS.S - benefSites, benefSites);

    // No MARK escapes the field, and nothing at all escapes the canvas. The
    // field-relative bound is on marks only: the row-axis label, its ticks and
    // a span's outer edge rule legitimately live in the left margin.
    const world = freshWorld();
    for (let i = 0; i < 600; i++) step(world);
    const { ctx, fills } = recordingCtx();
    drawField(ctx, world, W, H);
    const marks = new Set([ACTIVE_COLOUR, SILENCED_COLOUR, DOMESTICATED_COLOUR]);
    for (const f of fills) {
      expect(f.x, "a rect escaped the canvas").toBeGreaterThanOrEqual(0);
      expect(f.x + f.w, "a rect escaped the canvas").toBeLessThanOrEqual(W + EPS);
      if (!marks.has(f.colour)) continue;
      expect(f.x, "a mark escaped the field's left edge").toBeGreaterThanOrEqual(field.x - EPS);
      expect(f.x + f.w, "a mark escaped the field's right edge").toBeLessThanOrEqual(field.x + field.w + EPS);
    }
  });

  it("keeps every edge rule off the sites of its own span", () => {
    // The rules are full-strength tint, so a mark landing on one blends with it
    // instead of covering it: measured at 1.11-1.26:1, the round-2 blindness
    // relocated onto sites 0 and 4 of the cluster's five. In one frame the only
    // copy in the trap in the whole population was on a rule. Each rule now
    // occupies the 1px immediately OUTSIDE the span's site extent.
    const field = fieldRect(W, H);
    const { cluster, beneficial } = spanGeometry(PARAMS, field);
    const markW = Math.max(1, field.w / PARAMS.S);
    const siteX = (site: number) =>
      field.x + (site / PARAMS.S) * (field.w - markW);

    const spans: [typeof cluster, number, number][] = [
      [cluster, 0, Math.floor(PARAMS.c * PARAMS.S)],
      [
        beneficial,
        PARAMS.S - Math.floor(PARAMS.beta * PARAMS.S),
        Math.floor(PARAMS.beta * PARAMS.S),
      ],
    ];
    let checkedSites = 0;
    for (const [span, first, count] of spans) {
      for (const [a, b] of edgeRuleRanges(span!)) {
        for (let site = first; site < first + count; site++) {
          const x = siteX(site);
          expect(
            x < b && x + markW > a,
            `site ${site} of its span must not overlap an edge rule`,
          ).toBe(false);
          checkedSites++;
        }
      }
    }
    expect(checkedSites).toBe(2 * (5 + 20));
  });

  it("knocks the rule out from under any mark that still overlaps one", () => {
    // The out-of-span site immediately past a span does sit under that span's
    // outer rule -- one site, unavoidably, since the field is fully tiled. Such
    // a mark is backed with FIELD_BG first so it renders against the same
    // ground as every other mark instead of blending into the rule.
    const world = freshWorld();
    for (let i = 0; i < 600; i++) step(world);
    const field = fieldRect(W, H);
    const { cluster, beneficial } = spanGeometry(PARAMS, field);
    const rules = [...edgeRuleRanges(cluster!), ...edgeRuleRanges(beneficial!)];
    const markW = Math.max(1, field.w / PARAMS.S);

    const { ctx, fills } = recordingCtx();
    drawField(ctx, world, W, H);
    const marks = new Set([ACTIVE_COLOUR, SILENCED_COLOUR]);
    let onRule = 0;
    for (let i = 0; i < fills.length; i++) {
      const f = fills[i]!;
      if (!marks.has(f.colour)) continue;
      if (!rules.some(([a, b]) => f.x < b && f.x + f.w > a)) continue;
      onRule++;
      const prev = fills[i - 1]!;
      expect(prev.colour, "a mark on a rule must be backed by FIELD_BG").toBe(FIELD_BG);
      expect(prev.x).toBeLessThanOrEqual(f.x);
      expect(prev.x + prev.w).toBeGreaterThanOrEqual(f.x + markW);
    }
    // Positive control: if no mark ever landed on a rule this would pass empty.
    expect(onRule).toBeGreaterThan(0);
  });

  it("paints no full-strength tint behind the data plane", () => {
    // Only hairline rules (1px) and the capped wash may carry a tint colour
    // across the field's height. A full-height block in CLUSTER_TINT is the
    // regression this forbids.
    const world = freshWorld();
    for (let i = 0; i < 300; i++) step(world);
    const { ctx, fills } = recordingCtx();
    drawField(ctx, world, W, H);
    const field = fieldRect(W, H);

    for (const f of fills) {
      if (f.colour !== CLUSTER_TINT && f.colour !== BENEFICIAL_TINT) continue;
      if (f.h < field.h) continue; // gutter rails and brackets are not in the field
      expect(f.w, `full-height ${f.colour} rect must be a hairline`).toBeLessThanOrEqual(1);
    }
    // ...and the wash that IS full height is the capped composite.
    const washes = fills.filter((f) => f.h >= field.h && (f.colour === CLUSTER_FILL || f.colour === BENEFICIAL_FILL));
    expect(washes.length).toBe(2);
  });

  it("lets no ANNOTATION bury a copy, and prices the one thing that does", () => {
    // THE FAILURE THIS EXISTS TO CATCH, measured rather than hypothetical:
    // DOMESTICATED_HALO used to be painted AFTER the marks. A halo is 5px wide
    // against a ~0.84px pitch, so it spans about six sites, and a plain mark
    // under one vanished outright. `scripts/explore-field-undercount.ts` ARM 5
    // found it in 4 of 21 world states. The three states below are exactly the
    // failing ones, so this is asserted against known-bad worlds and not
    // against worlds chosen after the fix. Move the halo back to a trailing
    // pass and BURIED_BY_ANNOTATION goes to 8.
    //
    // TWO COUNTS, BECAUSE THEY ARE TWO DIFFERENT THINGS.
    //
    //   ANNOTATION burying data is a RULE, and the rule is `spanGeometry`'s:
    //   emphasis may be applied outside the data plane, never inside it. Zero,
    //   and no tolerance.
    //
    //   DATA burying data is a PRICED TRADE. The domesticated glyph is drawn at
    //   `Math.max(3, markW)` = 3px against a 0.844px pitch, i.e. 3.6x true site
    //   scale, because a domesticated copy at true scale is a sub-pixel smear
    //   and it is the rarest state the toy has to show. That enlargement costs
    //   exactly the 6 buried copies pinned here, out of 4718 marks across these
    //   three worlds. It is pinned rather than bounded so that enlarging the
    //   glyph turns this red instead of quietly costing more; whether the trade
    //   is worth making at all is an open item in docs/ROADMAP.md.
    //
    // MERGING IS NOT ASSERTED. Copies at adjacent sites blur into one blob and
    // NO mark width prevents it — ARM 4 sweeps the width and countability does
    // not improve; narrowing it makes the device-pixel figure slightly worse.
    // 1000 sites do not fit in ~844 px. That is a resolution limit, not a bug.
    let buriedByAnnotation = 0;
    let buriedByData = 0;
    let totalMarks = 0;
    for (const { seed, generations } of BURIAL_STATES) {
      const world = createWorld(defaultParams({ ...TOY_DEFAULTS, seed }));
      for (let i = 0; i < generations; i++) step(world);

      // The instrument's own stub, not this file's copy of one, so the guard
      // and `scripts/explore-field-undercount.ts` record identically.
      const { ctx, fills } = instrumentCtx();
      drawField(ctx, world, W, H);
      const { marks } = analyse(fills);
      totalMarks += marks.length;

      // POSITIVE CONTROLS, asserted first: without marks and without
      // domesticated copies there is no halo painted at all, and "nothing was
      // buried" would be true of an empty canvas.
      expect(marks.length, `seed ${seed}: no marks drawn`).toBeGreaterThan(500);
      expect(
        marks.filter((m) => m.fill.colour === DOMESTICATED_COLOUR).length,
        `seed ${seed}: no domesticated copies, so no halo is painted at all`,
      ).toBeGreaterThan(0);

      for (const m of marks) {
        if (m.visible) continue;
        if (m.hiddenBy && MARK_COLOURS.has(m.hiddenBy)) buriedByData++;
        else {
          buriedByAnnotation++;
          expect.soft(
            m.hiddenBy,
            `seed ${seed} gen ${generations}: annotation ${m.hiddenBy} completely covers a copy`,
          ).toBe(null);
        }
      }
    }
    expect(totalMarks).toBe(4718);
    expect(
      buriedByAnnotation,
      "no annotation may completely cover a copy",
    ).toBe(0);
    expect(
      buriedByData,
      "the enlarged domesticated glyph's measured cost; re-derive if it moves",
    ).toBe(6);
  });
});

describe("the tally bar means what its own label says", () => {
  it("normalises length to TOTAL, so length and printed share agree", () => {
    // The measured defect: lengths were max-normalised while labels were
    // percent-of-total. `active` rendered full track in every frame while
    // labelled 83.1% / 71.1% / 57.4%; `silenced` rendered 18.7% / 40.0% /
    // 70.7% of track against labels of 15.5% / 28.5% / 40.6%.
    const TRACK = 114;
    const frames = [
      { active: 1289, silenced: 240, domesticated: 22 },
      { active: 1367, silenced: 548, domesticated: 8 },
      { active: 813, silenced: 575, domesticated: 28 },
    ];
    for (const f of frames) {
      const total = f.active + f.silenced + f.domesticated;
      for (const count of [f.active, f.silenced, f.domesticated]) {
        const { px, floored } = barLength(count, total, TRACK);
        const share = sharePercent(count, total);
        if (floored) continue; // the floor is declared as a floor, not a share
        expect(
          (px / TRACK) * 100,
          `bar length must equal the share it prints (${count}/${total})`,
        ).toBeCloseTo(share, 9);
      }
      // ...and no bar is pinned to the full track by construction.
      const longest = barLength(Math.max(f.active, f.silenced, f.domesticated), total, TRACK);
      expect(longest.px).toBeLessThan(TRACK);
    }
  });

  it("declares the floor rather than overstating a rare state", () => {
    const TRACK = 114;
    // 3 and 5 of ~1500 both fall under the floor. Both are marked floored, so
    // the caller draws them outlined and the reader takes the count, not the
    // length -- the previous stacked bar showed 9px for a 1.4% share.
    for (const n of [3, 5]) {
      const b = barLength(n, 1500, TRACK);
      expect(b.floored).toBe(true);
      expect(b.px).toBe(BAR_FLOOR_PX);
    }
    expect(barLength(0, 1500, TRACK)).toEqual({ px: 0, floored: false });
    const big = barLength(900, 1500, TRACK);
    expect(big.floored).toBe(false);
    expect(big.px).toBeCloseTo(TRACK * 0.6, 9);
  });
});
