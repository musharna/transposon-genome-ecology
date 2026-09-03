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
import { chromium, type Browser } from "@playwright/test";
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

let server: PreviewServer;
let browser: Browser;
let origin: string;

beforeAll(async () => {
  await build({ logLevel: "warn" });
  server = await preview({ preview: { port: 4319, strictPort: false } });
  origin = server.resolvedUrls!.local[0]!.replace(/\/$/, "");
  browser = await chromium.launch();
}, 180_000);

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((res, rej) =>
    server.httpServer.close((e?: Error) => (e ? rej(e) : res())),
  );
});

async function measure(height: number): Promise<Panel> {
  const page = await browser.newPage({ viewport: { width: W, height } });
  try {
    await page.goto(origin);
    // The readout is filled by JS after first layout and is 156px of text; the
    // panel's height is not final until it is there. Waiting for it is also
    // what makes this a check on the RUNNING toy rather than on the markup.
    await page.waitForFunction(
      () => (document.getElementById("readout")?.textContent ?? "").length > 0,
      undefined,
      { timeout: 30_000 },
    );
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
    expect(
      tall.scrollHeight,
      "at 1440px there is spare height to spend",
    ).toBe(tall.clientHeight);
    expect(
      tall.deadSpace,
      "and it is spent: nothing unpainted below the last section",
    ).toBeLessThanOrEqual(1);
    expect(tall.trapHeight, "and the trap is what grew").toBeGreaterThan(
      short.trapHeight,
    );
  }, 180_000);
});
