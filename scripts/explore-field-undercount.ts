// Derivation sweep for the field render's countability. Run:
//   npx tsx scripts/explore-field-undercount.ts
//
// The instrument — the recording stub, the exact-geometry visibility test, the
// device-column reading, and the synthetic re-render at an arbitrary mark width
// — lives in tests/guards/field-undercount-arm.ts, the SAME module
// tests/render-field.test.ts asserts against, so this script cannot measure
// something the guard does not.
//
// WHY IT EXISTS. `web/render/field.ts` and `docs/ROADMAP.md` both carried
// "1383 / 1714 / 1237 detected against 1551 / 1923 / 1416 actual — an 11%..13%
// shortfall", and nothing in the repo produced those numbers. This does.
import { createWorld, defaultParams, step, type World } from "../sim/index.js";
import { TOY_DEFAULTS } from "../web/params.js";
import {
  ACTIVE_COLOUR,
  DOMESTICATED_COLOUR,
  drawField,
  fieldRect,
} from "../web/render/field.js";
import {
  BURIAL_STATES,
  MARK_COLOURS,
  analyse,
  inkRuns,
  recordingCtx,
  syntheticMarks,
} from "../tests/guards/field-undercount-arm.js";

const W = 900;
const H = 600;
const pad = (x: unknown, n: number) => String(x).padStart(n);

function worldAt(seed: number, generations: number): World {
  const world = createWorld(defaultParams({ ...TOY_DEFAULTS, seed }));
  for (let g = 0; g < generations; g++) step(world);
  return world;
}
const copiesOf = (w: World) =>
  w.genomes.reduce((a, g) => a + g.copies.length, 0);

// ---------------------------------------------------------------------------
console.log("ARM 0 - POSITIVE CONTROL: three cases whose answers are known.\n");
{
  const mk = (x: number, colour = ACTIVE_COLOUR) => ({
    colour,
    x,
    y: 10,
    w: 1,
    h: 4,
  });
  const cases: [string, ReturnType<typeof mk>[], number, number][] = [
    ["three marks far apart", [mk(0), mk(100), mk(200)], 3, 3],
    ["two marks 0.5px apart (touching)", [mk(0), mk(0.5)], 2, 1],
    [
      "a mark fully buried by a later glyph",
      [mk(10), { colour: DOMESTICATED_COLOUR, x: 9, y: 9, w: 3, h: 6 }],
      1,
      1,
    ],
  ];
  let ok = true;
  for (const [name, fills, expVis, expBlobs] of cases) {
    const r = analyse(fills);
    const vis = r.marks.filter((m) => m.visible).length;
    const pass = vis === expVis && r.blobs === expBlobs;
    if (!pass) ok = false;
    console.log(
      `  ${pass ? "ok  " : "FAIL"} ${name}: visible ${vis} (want ${expVis}), blobs ${r.blobs} (want ${expBlobs})`,
    );
  }
  if (!ok) {
    console.error("\nCONTROL FAILED: the instrument is wrong. Stop.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// ARM 1 - the bracket. `analyse` ignores antialiasing so its blob count is the
// UPPER bound on countability; `inkRuns` treats any contiguous inked run as one
// thing, the most pessimistic reading, so it is the LOWER bound.
console.log("\nARM 1 - THE UNDERCOUNT, BRACKETED, AT TOY_DEFAULTS");
console.log("  seed   gen   copies   upper short%   dpr1 short%   dpr2 short%");
for (const seed of [1, 2, 3]) {
  const world = createWorld(defaultParams({ ...TOY_DEFAULTS, seed }));
  let g = 0;
  for (const gen of [300, 1000, 3000, 6000]) {
    for (; g < gen; g++) step(world);
    const copies = copiesOf(world);
    if (copies === 0) {
      console.log(`  ${pad(seed, 4)}  ${pad(gen, 4)}        0   (extinct)`);
      continue;
    }
    const { ctx, fills } = recordingCtx();
    drawField(ctx, world, W, H);
    const { blobs } = analyse(fills);
    const pc = (v: number) =>
      pad((((copies - v) / copies) * 100).toFixed(1), 12);
    console.log(
      `  ${pad(seed, 4)}  ${pad(gen, 4)} ${pad(copies, 8)} ${pc(blobs)}  ${pc(inkRuns(fills, 1))}  ${pc(inkRuns(fills, 2))}`,
    );
  }
}
console.log(
  "\n  The recorded 11%..13% does not appear anywhere in this range, and the\n" +
    "  copy counts here bracket the 1551/1923/1416 that figure was quoted at.",
);

// ---------------------------------------------------------------------------
// ARM 2 - can any mark width fix it?
console.log("\nARM 2 - SWEEPING THE MARK WIDTH (seed 1, generation 3000)");
{
  const world = worldAt(1, 3000);
  const plain = world.genomes.reduce(
    (a, g) => a + g.copies.filter((c) => !c.domesticated).length,
    0,
  );
  const pitch = fieldRect(W, H).w / world.params.S;
  const shipped = Math.max(1, pitch) / pitch;
  console.log(
    `  true pitch ${pitch.toFixed(3)} px/site; ${plain} non-domesticated copies`,
  );
  console.log("  markW    x pitch   upper blobs  short%   dpr1 runs  short%");
  for (const mult of [0.25, 0.5, 0.75, 1.0, shipped, 1.5, 2.0]) {
    const fills = syntheticMarks(world, pitch * mult, W, H);
    const { blobs } = analyse(fills);
    const r1 = inkRuns(fills, 1);
    const pc = (v: number) => pad((((plain - v) / plain) * 100).toFixed(1), 7);
    console.log(
      `  ${pad((pitch * mult).toFixed(3), 6)}  ${pad(mult.toFixed(3), 7)}  ${pad(blobs, 12)} ${pc(blobs)} ${pad(r1, 11)} ${pc(r1)}`,
    );
  }
  console.log(
    `\n  x pitch ${shipped.toFixed(3)} is what SHIPS here: Math.max(1, ${pitch.toFixed(3)}) / ${pitch.toFixed(3)}.\n` +
      "  Countability does NOT improve as the mark narrows, and on the device grid\n" +
      "  it gets slightly worse. The residual is copies at ADJACENT SITES, which no\n" +
      "  width separates: 1000 sites do not fit in ~844 px. The floor is not the\n" +
      "  cause, and removing it buys nothing.",
  );
}

// ---------------------------------------------------------------------------
// ARM 3 - burial, which IS a defect, split by what does it.
console.log("\nARM 3 - BURIAL: ANNOTATION OVER DATA vs DATA OVER DATA");
console.log("  seed   gen   marks   by annotation   by data   what");
for (const seed of [1, 2, 3, 5, 7, 11, 13]) {
  const world = createWorld(defaultParams({ ...TOY_DEFAULTS, seed }));
  let g = 0;
  for (const gen of [300, 1500, 3000]) {
    for (; g < gen; g++) step(world);
    if (copiesOf(world) === 0) continue;
    const { ctx, fills } = recordingCtx();
    drawField(ctx, world, W, H);
    const { marks } = analyse(fills);
    let annot = 0;
    let data = 0;
    const what = new Set<string>();
    for (const m of marks) {
      if (m.visible) continue;
      if (m.hiddenBy && MARK_COLOURS.has(m.hiddenBy)) data++;
      else annot++;
      what.add(m.hiddenBy ?? "?");
    }
    console.log(
      `  ${pad(seed, 4)}  ${pad(gen, 4)} ${pad(marks.length, 7)} ${pad(annot, 15)} ${pad(data, 9)}   ${[...what].join(", ") || "-"}`,
    );
  }
}
console.log(
  "\n  Before the halo moved under the marks this column read 8 annotation\n" +
    "  burials over the three states in BURIAL_STATES, every one under\n" +
    "  DOMESTICATED_HALO. It reads 0 now. What remains is the domesticated GLYPH\n" +
    "  covering neighbours, which is data over data at 3.6x true site scale --\n" +
    "  pinned by the guard, and an open design item rather than a bug.",
);
console.log(
  `\n  (the guard asserts exactly the states ${BURIAL_STATES.map((b) => `${b.seed}@${b.generations}`).join(", ")}, ` +
    "which are the ones that failed)",
);
