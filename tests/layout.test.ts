/**
 * The right column, measured in a real browser.
 *
 * Everything else in this suite can be checked by reasoning about numbers.
 * Layout cannot: the defect this file exists for shipped through a green suite,
 * a passing build and a code review, because "the controls are in the panel" is
 * true and "a visitor can see them" is a different claim that only a rendering
 * engine can settle. At 1280x800 every slider and every button sat below the
 * fold — the first at y=807 — and the panel's only affordance was a scrollbar.
 *
 * So this drives Chromium against the BUILT artifact. It builds first rather
 * than trusting whatever is in `dist/`, because a stale `dist/` would make this
 * guard pass on a page nobody is shipping. Same shape as Task 19's guard 7.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";

/** The viewport the toy is shipped at, and the one the defect was found at. */
const W = 1280;
const H = 800;

/**
 * `#trap-panel`'s CSS floor: 21px of title plus the 140px inset height Task 17
 * measured. Mirrored from `web/index.html` the way `TRACK_PX` in
 * `web/main.ts` mirrors `#tally .track`.
 */
const TRAP_FLOOR_PX = 161;

interface Box {
  kind: string;
  poke: string;
  top: number;
  bottom: number;
}
interface Panel {
  scrollHeight: number;
  clientHeight: number;
  sections: string[];
  controls: Box[];
  deadSpace: number;
  trapHeight: number;
  insetHeight: number;
  readoutLines: number;
}

/**
 * Page-side snippets are STRINGS, not closures. `tsx` compiles this file with
 * esbuild's keepNames on, which rewrites a named inner function into a call to
 * a `__name` helper -- a helper that exists in the test process and not in the
 * page, so a perfectly ordinary `page.evaluate(() => {...})` dies with
 * "ReferenceError: __name is not defined".
 */
const READOUT_FILLED = `(document.getElementById("readout") || {}).textContent`;
const COPIES = `(function(){var w=window.__sim.world,c=0;
  for(var i=0;i<w.genomes.length;i++)c+=w.genomes[i].copies.length;
  return {generation:w.generation,copies:c,occupancy:c/(w.params.N*w.params.S)};})()`;

interface SimState {
  generation: number;
  copies: number;
  occupancy: number;
}

async function state(page: Page): Promise<SimState> {
  return (await page.evaluate(COPIES)) as SimState;
}

/**
 * Wait until `done(s)` holds, failing ONLY if the world stops advancing.
 *
 * WHY THIS IS NOT `page.waitForFunction(..., { timeout })`. It was, at 240 s,
 * and that budget is the wrong unit. What this test waits for -- the genome
 * filling past 90% -- arrives after some number of GENERATIONS, and the page
 * advances one generation per animation frame. Generations-per-second is
 * therefore a property of how much CPU the host has spare, so a wall-clock
 * budget silently shrinks, measured in generations, exactly when the box is
 * busy. Measured on this machine, same tree, same commit: the test takes
 * ~9.1 s at load average 10 and blew the whole 240 s at load average 20.5 with
 * four foreign processes pinning all 16 cores. Concurrency inside vitest is
 * NOT the cause and was ruled out by measurement: isolated 9.1 s against 9.9 s
 * inside the full 22-file suite, a 9% difference.
 *
 * This file already draws that distinction for its ASSERTIONS -- "a frame-time
 * threshold is a property of the machine running it; what is asserted is the
 * part that is not". The waits were left coupled to the machine. This applies
 * the same rule to them.
 *
 * So the only thing that fails here is a world that has STOPPED: `stallMs` of
 * wall clock with no change in `generation`. That is a real freeze and it is
 * legitimately measured in seconds. A merely slow host waits longer and still
 * passes, which is the correct outcome -- and the failure message now names
 * what actually went wrong instead of blaming an occupancy that was still
 * climbing.
 */
async function waitForWorld(
  page: Page,
  done: (s: SimState) => boolean,
  what: string,
  stallMs = 45_000,
): Promise<SimState> {
  let last = await state(page);
  let lastAdvance = Date.now();
  for (;;) {
    const s = await state(page);
    if (done(s)) return s;
    if (s.generation !== last.generation) {
      last = s;
      lastAdvance = Date.now();
    } else if (Date.now() - lastAdvance > stallMs) {
      throw new Error(
        `the world stopped advancing while waiting for ${what}: ` +
          `generation stuck at ${s.generation} for ${stallMs} ms, ` +
          `occupancy ${s.occupancy.toFixed(3)}`,
      );
    }
    await page.waitForTimeout(250);
  }
}

/**
 * Median interval between animation frames, in ms, over `ms` of wall clock.
 *
 * The sampler drops a timestamp it has already seen: when a frame takes 266ms
 * the browser delivers several queued rAF callbacks bearing ONE timestamp, and
 * counting those as zero-length frames drags the median to 0 and reports
 * infinite fps on the slowest page in the toy.
 */
async function frameTime(page: Page, ms: number): Promise<number> {
  await page.evaluate(
    `window.__fps = [];
     (function loop(t){ var a = window.__fps;
       if (a.length === 0 || t > a[a.length - 1]) a.push(t);
       requestAnimationFrame(loop); })(performance.now());`,
  );
  await page.waitForTimeout(ms);
  return (await page.evaluate(
    `(function(){ var t = window.__fps, d = [];
       for (var i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
       d.sort(function(a, b){ return a - b; });
       return d.length ? d[Math.floor(d.length / 2)] : Infinity; })()`,
  )) as number;
}

let server: PreviewServer | undefined;
let browser: Browser | undefined;
let origin = "";

beforeAll(async () => {
  await build({ logLevel: "warn" });
  server = await preview({ preview: { port: 4319, strictPort: false } });
  // Keep the trailing slash. Vite resolves this to the served BASE url, which
  // under `base: "/transposon-genome-ecology/"` is `http://host:port/<repo>/`,
  // and preview serves that path only WITH the slash -- the bare `/<repo>` 404s
  // and is not redirected. Stripping it was harmless only while the base was
  // `/`, where `http://host:port/` and `http://host:port` are the same request.
  origin = server.resolvedUrls!.local[0]!;
  // If this throws, it usually says "Executable doesn't exist" and means
  // `npx playwright install chromium` has not been run -- see README setup.
  browser = await chromium.launch();
}, 180_000);

/**
 * EVERY HANDLE HERE IS OPTIONAL BECAUSE `beforeAll` CAN DIE HALFWAY.
 *
 * `chromium.launch()` fails on a machine with no browser binary, which leaves
 * `server` set and `browser` undefined. An unguarded `server.httpServer` in
 * teardown then throws a TypeError that REPLACES the real error, and the reader
 * is told the wrong thing about why their suite failed. The setup failure has
 * to be the one that surfaces.
 */
afterAll(async () => {
  await browser?.close();
  const http = server?.httpServer;
  if (!http) return;
  await new Promise<void>((res, rej) =>
    http.close((e?: Error) => (e ? rej(e) : res())),
  );
});

async function measure(height: number): Promise<Panel> {
  const page = await browser!.newPage({ viewport: { width: W, height } });
  try {
    await page.goto(origin);
    // The readout is filled by JS after first layout and is 156px of text; the
    // panel's height is not final until it is there. Waiting for it is also
    // what makes this a check on the RUNNING toy rather than on the markup.
    await page.waitForFunction(READOUT_FILLED, undefined, { timeout: 30_000 });
    return await page.evaluate(() => {
      const panel = document.getElementById("controls")!;
      const trap = document.getElementById("trap-panel")!;
      const inset = document.getElementById("cluster-inset")!;
      return {
        scrollHeight: panel.scrollHeight,
        clientHeight: panel.clientHeight,
        // VISUAL order, not DOM order. What a visitor reads down the column
        // is where the boxes are, and CSS `order` can separate the two.
        sections: [...panel.children]
          .map((el) => ({
            name: (
              el.querySelector(".panel-title")?.textContent ?? el.id
            ).trim(),
            top: el.getBoundingClientRect().top,
          }))
          .sort((a, b) => a.top - b.top)
          .map((x) => x.name),
        controls: [
          ...panel.querySelectorAll('input[type="range"], button'),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            kind: el.tagName.toLowerCase(),
            poke: (el as HTMLElement).dataset["poke"] ?? "",
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
          };
        }),
        // Unpainted column below the last section. NOT `scrollHeight -
        // clientHeight`: scrollHeight is floored at clientHeight, so it reads
        // exactly zero whether the column is perfectly filled or half empty,
        // and a dead-space assertion written on it cannot fail for the reason
        // it is there to catch.
        deadSpace: Math.round(
          panel.getBoundingClientRect().bottom -
            parseFloat(getComputedStyle(panel).paddingBottom) -
            (panel.lastElementChild as HTMLElement).getBoundingClientRect()
              .bottom,
        ),
        trapHeight: Math.round(trap.getBoundingClientRect().height),
        insetHeight: Math.round(inset.getBoundingClientRect().height),
        readoutLines: (
          document.getElementById("readout")!.textContent ?? ""
        ).split("\n").length,
      };
    });
  } finally {
    await page.close();
  }
}

describe("the control panel at the shipped viewport", () => {
  it("puts every slider and every button inside an 800px viewport", async () => {
    const panel = await measure(H);

    // Positive control, asserted first: the page really ran and really built
    // the controls, so an empty result cannot pass as "nothing is off-screen".
    expect(panel.readoutLines, "the toy is running").toBeGreaterThan(4);
    expect(
      panel.controls.map((c) => c.poke),
      "every poke is mounted",
    ).toEqual([
      "c",
      "t",
      "v",
      "pDom",
      "silencing",
      "sexual",
      "invade",
      "shrink",
    ]);

    const offscreen = panel.controls.filter((c) => c.top < 0 || c.bottom > H);
    expect(
      offscreen.map((c) => `${c.poke} ${c.top}->${c.bottom}`),
      `viewport is ${W}x${H}`,
    ).toEqual([]);
  }, 120_000);

  it("keeps the readout adjacent to the pokes, and the reference material last", async () => {
    const panel = await measure(H);
    expect(panel.sections).toEqual([
      "population",
      "pokes — the world, not the element",
      "all copies, by state",
      "the trap, magnified",
      "legend",
    ]);
  }, 120_000);

  /**
   * The column overflows at 800 and has spare height at 1440, and the same
   * `flex: 1 1 0` on `#trap-panel` has to be right in both directions: at its
   * floor when there is nothing to spare, and exactly filling the panel when
   * there is. Asserting only one end passes on both of the arrangements that
   * were measured wrong — `flex: 1 1 auto; min-height: 0` collapses the panel
   * to zero and still fills a tall column; `flex: 1 0 auto` holds its floor at
   * 800 and overflows a tall one by 156px.
   */
  it("spends spare column height on the trap instead of leaving a hole", async () => {
    const short = await measure(H);
    // Positive control, asserted first: at 800 there IS no spare height, so the
    // tall case below is measuring a distribution and not a coincidence.
    expect(short.scrollHeight, "the column overflows at 800px").toBeGreaterThan(
      short.clientHeight,
    );
    expect(short.trapHeight, "so the trap sits at its floor").toBe(
      TRAP_FLOOR_PX,
    );
    expect(
      short.insetHeight,
      "and the inset is not collapsed",
    ).toBeGreaterThanOrEqual(140);

    const tall = await measure(1440);
    // PRECONDITION, not the claim. `scrollHeight` is floored at
    // `clientHeight`, so this can only ever say "the column does not overflow";
    // it cannot report spare height, and the dead-space assertion below is what
    // proves the spare height was spent.
    expect(tall.scrollHeight, "at 1440px the column does not overflow").toBe(
      tall.clientHeight,
    );
    expect(
      tall.deadSpace,
      "and it is spent: nothing unpainted below the last section",
    ).toBeLessThanOrEqual(1);
    expect(tall.trapHeight, "and the trap is what grew").toBeGreaterThan(
      short.trapHeight,
    );
  }, 180_000);
});

/**
 * "GO ASEXUAL LEAVES THE POPULATION RUNNING RATHER THAN COLLAPSING" was the one
 * claim in this task with no evidence behind it. The headless measurement said
 * a step goes from 1.8ms to 36ms while flooded, but that harness ran no
 * `fillRect` and no `fit()`, and `drawField` issues about 59,000 fills per
 * frame at 98% occupancy -- so "the toy crawls but stays usable" was an
 * inference about a number nobody had taken. This takes it, in Chromium,
 * against the built page, by flipping the real button.
 *
 * Measured here (median inter-frame interval over a 6-second window, from a
 * rAF sampler that dedupes coalesced timestamps -- without the dedupe a slow
 * frame delivers several callbacks at one timestamp and the median reads 0):
 *
 *     sexual, 2.4% of sites occupied     16.7 ms   59.9 fps   (vsync-capped)
 *     asexual, 98.6% occupied           250.0 ms    4.0 fps
 *     asexual, 98.1% occupied, held     266.6 ms    3.8 fps
 *     back to sexual                     16.7 ms   59.9 fps
 *
 * and clicking back cleared the flood inside a single frame, 0.07s of wall
 * clock. So: it crawls, it is legible, it still takes a click, and the way out
 * is instant. The panel note carries the 4 fps figure.
 *
 * THE ASSERTIONS BELOW ARE NOT THE FPS TABLE. A frame-time threshold is a
 * property of the machine running it; what is asserted is the part that is not
 * -- that a flooded page is still ADVANCING and still ANSWERS ITS OWN BUTTON.
 * The one timing bound is deliberately two orders of magnitude looser than the
 * measurement, so it fails for "frozen", not for "busy CI".
 */
/**
 * THE GUARD ON THE GUARD. `waitForWorld` can only fail one way -- the world
 * stopped advancing -- so if that path is broken it does not report a slow
 * failure, it reports NOTHING and waits until vitest kills the file. A wait
 * whose only failure mode is untested is a wait that silently cannot fail.
 *
 * This freezes the page by starving its animation-frame loop (`web/main.ts`
 * drives every generation from `requestAnimationFrame`) and asserts the stall
 * is both DETECTED and NAMED. It is fast -- a 4 s stall budget -- because it
 * is testing the detector, not the toy.
 */
describe("the stall detector that the flood waits depend on", () => {
  it("reports a frozen world instead of waiting forever", async () => {
    const page = await browser!.newPage({ viewport: { width: W, height: H } });
    try {
      await page.goto(origin);
      await page.waitForFunction(READOUT_FILLED, undefined, {
        timeout: 30_000,
      });

      // POSITIVE CONTROL, asserted first and inside this same body: the world
      // IS advancing before the freeze, so the stall reported below cannot be
      // "it never started" -- which would pass on a page that never ran.
      const a = await state(page);
      await page.waitForTimeout(500);
      const b = await state(page);
      expect(
        b.generation,
        "the world is advancing before the freeze",
      ).toBeGreaterThan(a.generation);

      await page.evaluate(
        `window.requestAnimationFrame = function(){ return 0; };`,
      );

      let err: Error | undefined;
      try {
        await waitForWorld(
          page,
          (s) => s.occupancy > 0.9,
          "a flood that will never come",
          4_000,
        );
      } catch (e) {
        err = e as Error;
      }
      expect(err, "it threw rather than hanging until the file timed out").toBeDefined();
      expect(err!.message).toContain("the world stopped advancing");
      expect(err!.message).toContain("generation stuck at");
    } finally {
      await page.close();
    }
  }, 120_000);
});

describe("the page while the genome is flooded", () => {
  it("keeps running and still answers the button that undoes it", async () => {
    const page = await browser!.newPage({ viewport: { width: W, height: H } });
    try {
      await page.goto(origin);
      await page.waitForFunction(READOUT_FILLED, undefined, {
        timeout: 30_000,
      });

      // Positive control, asserted first: a sexual page advances and is nowhere
      // near full, so the flooded numbers below are the poke and the "still
      // advancing" assertion is not trivially true of a frozen page.
      const before = await state(page);
      await page.waitForTimeout(500);
      const moved = await state(page);
      expect(moved.generation, "the toy is running").toBeGreaterThan(
        before.generation,
      );
      expect(moved.occupancy, "and is not flooded to begin with").toBeLessThan(
        0.1,
      );

      await page.click('[data-poke="sexual"]');
      const flooded = await waitForWorld(
        page,
        (s) => s.occupancy > 0.9,
        "the genome to flood past 90% occupancy",
      );
      expect(flooded.occupancy, "the genome is full").toBeGreaterThan(0.9);
      const frame = await frameTime(page, 4000);
      expect(
        frame,
        `flooded frame time ${frame.toFixed(0)}ms -- the page is not frozen`,
      ).toBeLessThan(20_000);

      const held = await state(page);
      expect(
        held.generation,
        "and generations still advance while it is full",
      ).toBeGreaterThan(flooded.generation);

      await page.click('[data-poke="sexual"]');
      const cleared = await waitForWorld(
        page,
        (s) => s.occupancy < 0.1,
        "the flood to clear back under 10% occupancy",
      );
      expect(cleared.occupancy, "and the way out works").toBeLessThan(0.1);
    } finally {
      await page.close();
    }
  }, 300_000);
});
