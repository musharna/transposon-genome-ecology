/**
 * GUARD 7 (spec §6): one implementation.
 *
 * The strongest claim in the project is that THE ARTIFACT PLAYED IS THE
 * ARTIFACT VALIDATED. Six guards validate the model by running `sim/` in node.
 * The toy runs a Vite bundle in a browser. Nothing in the other eighteen test
 * files touches that bundle's copy of the model, so "one implementation" is,
 * until this file exists, a sentence in a design document.
 *
 * What makes byte-identical agreement a real claim rather than a coincidence:
 * `stateHash` digests the ORDERED world state, and `sim/rng.ts` is a mulberry32
 * whose `normal()` (Marsaglia polar) carries a closure-scoped spare. THE NUMBER
 * AND ORDER OF RNG DRAWS IS PART OF REPRODUCIBLE STATE. Two environments that
 * implemented every formula identically but consumed randomness in a different
 * order, or consumed one extra draw, would produce different hashes. So
 * agreement on eight hex characters says the two environments walked the same
 * path through the same code, not merely that they compute similar numbers.
 *
 * TWO CLAIMS LIVE HERE, and they fail for different reasons:
 *   1. the browser and node agree on the hash for a given seed;
 *   2. the browser is RUNNING the model rather than reporting a value.
 * Claim 2 is not decorative. A harness that set `__stateHash` from a constant, a
 * cached string or a build-time inlined literal would satisfy claim 1 forever,
 * and guard 7 would certify agreement between node and a string. Claim 2 drives
 * the page at two seeds and requires the two browser hashes to DIFFER while each
 * still matches its own node hash.
 *
 * IT BUILDS FIRST, like `tests/layout.test.ts`, and for a sharper version of the
 * same reason: a stale `dist/` is precisely the failure this guard exists to
 * disprove. If the bundle were built from different source, a guard that served
 * whatever happened to be on disk would compare node against a model nobody is
 * shipping and report agreement — asserting the exact opposite of its claim,
 * silently. Building inside the test also means the guard does not depend on
 * invocation order, and `npm test` alone is enough.
 *
 * IT BUILDS TO ITS OWN DIRECTORY. `tests/layout.test.ts` owns `dist/` and vitest
 * runs test files in parallel workers; two concurrent builds with
 * `emptyOutDir: true` on the same directory would race, and the loser would see
 * its own pages deleted mid-serve. The output location is the only thing
 * overridden — `vite.config.ts` supplies the root, the entries and every other
 * setting, so this is the shipped build, relocated.
 */
import { chromium, type Browser } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";
import { createWorld, defaultParams, run, stateHash } from "../../sim/index.js";

/**
 * Relative to the vite root (`web/`), so this lands beside `dist/` in the
 * project root. Gitignored.
 */
const OUT_DIR = "../dist-guard7";

/** The scenario, stated once. `web/hash-harness.ts` defaults to the same numbers. */
const N = 120;
const S = 1500;
const GENERATIONS = 120;
const SEED_A = 31337;
const SEED_B = 424242;

/**
 * One entry in the build's own manifest of what it wrote. Typed structurally
 * rather than as Rollup's `OutputChunk | OutputAsset`: this repo has no
 * `@types/node`, and the two fields read below are all that is needed.
 */
interface Emitted {
  fileName: string;
  type: string;
  source?: string | Uint8Array;
}

let server: PreviewServer | undefined;
let browser: Browser | undefined;
let origin = "";
let emitted: Emitted[] = [];

beforeAll(async () => {
  const result = await build({ logLevel: "warn", build: { outDir: OUT_DIR } });
  emitted = (result as unknown as { output: Emitted[] }).output;
  server = await preview({
    build: { outDir: OUT_DIR },
    // NOT `strictPort`. `tests/layout.test.ts` binds a preview server in the
    // same run; a hard port would turn an unrelated collision into a failure
    // of this guard, which would then be reporting on the wrong thing.
    preview: { port: 4321, strictPort: false },
  });
  origin = server.resolvedUrls!.local[0]!.replace(/\/$/, "");
  // If this throws it usually says "Executable doesn't exist" and means
  // `npx playwright install chromium` has not been run -- see README setup.
  browser = await chromium.launch();
}, 180_000);

/**
 * Every handle is optional because `beforeAll` can die halfway: a machine with
 * no browser binary leaves `server` set and `browser` undefined, and an
 * unguarded teardown would throw a TypeError that REPLACES the real error.
 * Same shape, and same reason, as `tests/layout.test.ts`.
 */
afterAll(async () => {
  await browser?.close();
  const http = server?.httpServer;
  if (!http) return;
  await new Promise<void>((res, rej) =>
    http.close((e?: Error) => (e ? rej(e) : res())),
  );
});

/** Runs the scenario in node. */
function nodeHash(seed: number): string {
  const world = createWorld(defaultParams({ N, S, seed }));
  run(world, GENERATIONS);
  return stateHash(world);
}

interface BrowserRun {
  hash: string;
  /** What the page says it was asked for. Diagnostic only -- see below. */
  seed: number;
  generations: number;
  status: number;
}

/**
 * Page-side snippet as a STRING, not a closure: `tsx` compiles this file with
 * esbuild's keepNames on, which rewrites named inner functions into calls to a
 * `__name` helper that exists in this process and not in the page.
 */
const READ_RESULT = `({
  hash: window.__stateHash,
  seed: window.__stateHashSeed,
  generations: window.__stateHashGenerations
})`;

const cache = new Map<number, BrowserRun>();

/** Runs the scenario in Chromium, against the page the build just emitted. */
async function browserRun(seed: number): Promise<BrowserRun> {
  const cached = cache.get(seed);
  if (cached) return cached;

  const page = await browser!.newPage();
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") failures.push(`console: ${m.text()}`);
  });
  try {
    const url = `${origin}/hash-harness.html?seed=${seed}&generations=${GENERATIONS}`;
    const response = await page.goto(url);
    // Asserted, not retried. A 404 here means the second Vite entry emitted
    // nothing; swallowing it is how a guard turns into a skipped test.
    expect(response?.status(), `GET ${url}`).toBe(200);
    await page.waitForFunction(
      `typeof window.__stateHash === "string"`,
      undefined,
      { timeout: 120_000 },
    );
    const result = (await page.evaluate(READ_RESULT)) as Omit<
      BrowserRun,
      "status"
    >;
    const run_: BrowserRun = { ...result, status: response!.status() };
    cache.set(seed, run_);
    return run_;
  } catch (e) {
    // The page's own errors are far more informative than a waitForFunction
    // timeout, so put them in front of the reader.
    throw new Error(
      `hash-harness at seed ${seed} failed: ${(e as Error).message}` +
        (failures.length ? `\npage said:\n  ${failures.join("\n  ")}` : ""),
    );
  } finally {
    await page.close();
  }
}

const HEX8 = /^[0-9a-f]{8}$/;

describe("guard 7: one implementation", () => {
  /**
   * The build has to actually emit the harness page. A misconfigured second
   * entry that silently emits nothing would 404, and the failure would arrive
   * as a browser-side timeout that reads like a slow machine.
   */
  it("emits the harness page, and still emits the toy", () => {
    const names = emitted.map((f) => f.fileName);
    const html = (name: string): string => {
      const file = emitted.find((f) => f.fileName === name);
      return typeof file?.source === "string" ? file.source : "";
    };
    const entryScript = (page: string): string[] =>
      [...html(page).matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(
        (m) => m[1]!,
      );

    // Positive control, asserted first: adding a second Rollup entry can
    // displace the first, and a harness page in an otherwise empty build would
    // say nothing about the artifact anyone actually plays.
    expect(names, "the toy page is still emitted").toContain("index.html");
    expect(
      entryScript("index.html"),
      "and it still carries exactly one built entry script",
    ).toHaveLength(1);

    expect(names, "the harness page is emitted").toContain("hash-harness.html");
    const harnessScript = entryScript("hash-harness.html");
    expect(harnessScript, "with one built entry script").toHaveLength(1);
    // A page still pointing at the TypeScript source was never bundled: it
    // works under a dev server and 404s against a built one.
    expect(
      html("hash-harness.html"),
      "and not at the raw source",
    ).not.toContain("hash-harness.ts");
    // And the chunk that script names was actually written.
    expect(names, `${harnessScript[0]} was written`).toContain(
      harnessScript[0]!.replace(/^\//, ""),
    );
  });

  /**
   * CLAIM 1. Byte-identical, or there are two models and validating one says
   * nothing about the other.
   */
  it("browser and node agree on the state hash, byte for byte", async () => {
    const node = nodeHash(SEED_A);
    const web = await browserRun(SEED_A);

    // Positive control, asserted first, in the same body as the comparison:
    // both sides produced a well-formed, non-trivial digest. Without this, two
    // environments agreeing on an empty string would pass by agreeing on
    // nothing.
    expect(node, "node produced a digest").toMatch(HEX8);
    expect(node, "and not the FNV offset basis over an empty world").not.toBe(
      "811c9dc5",
    );
    expect(web.hash, "the browser produced a digest").toMatch(HEX8);
    expect(web.status, "served, not 404").toBe(200);

    expect(
      web.hash,
      `seed ${SEED_A}, ${GENERATIONS} generations, N=${N} S=${S}: ` +
        `browser ${web.hash} vs node ${node}`,
    ).toBe(node);
  }, 300_000);

  /**
   * CLAIM 2, and the reason claim 1 means anything. Two seeds, two DIFFERENT
   * browser hashes, each matching its own node hash. A page that reported a
   * constant would satisfy claim 1 and die here.
   */
  it("POSITIVE CONTROL: the browser is running the model, not reporting a value", async () => {
    const nodeA = nodeHash(SEED_A);
    const nodeB = nodeHash(SEED_B);

    // Precondition, asserted first: the two seeds discriminate AT ALL. If node
    // gave the same hash for both, "the browser hashes differ" would be
    // testing the wrong thing and "each matches its node hash" would be
    // vacuously compatible with a constant.
    expect(nodeA, "node discriminates the two seeds").not.toBe(nodeB);

    const webA = await browserRun(SEED_A);
    const webB = await browserRun(SEED_B);

    expect(
      webB.hash,
      `the browser answered ${webA.hash} at seed ${SEED_A} ` +
        `(page reports seed=${webA.seed}, generations=${webA.generations}) ` +
        `and ${webB.hash} at seed ${SEED_B} ` +
        `(page reports seed=${webB.seed}, generations=${webB.generations}): ` +
        `identical means the page is not running the model`,
    ).not.toBe(webA.hash);

    // And the variation is the MODEL's variation, not noise: each browser hash
    // lands on its own node counterpart.
    expect(webA.hash, `seed ${SEED_A}`).toBe(nodeA);
    expect(webB.hash, `seed ${SEED_B}`).toBe(nodeB);
  }, 300_000);

  /**
   * Node-side floor, kept from the task brief. Cheap, and it means the
   * well-formedness claim survives any restructuring of the two tests above.
   */
  it("POSITIVE CONTROL: the node hash is non-trivial", () => {
    const h = nodeHash(SEED_A);
    expect(h).toMatch(HEX8);
    expect(h).not.toBe("00000000");
    // FNV-1a's offset basis, i.e. what `stateHash` returns for an empty input.
    expect(h).not.toBe("811c9dc5");
  }, 120_000);
});
