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
 * path through the same source, not merely that they compute similar numbers.
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
 * ------------------------------------------------------------------------------
 * BOTH CLAIMS ARE MADE AT TWO PARAMETER REGIMES, AND THE SECOND IS THE TOY'S
 * ------------------------------------------------------------------------------
 * Until 2026-09-03 this guard ran only `defaultParams({ N, S, seed })`. The toy
 * runs `defaultParams(TOY_DEFAULTS)` (`web/main.ts:37`), and TEN of
 * `TOY_DEFAULTS`' seventeen fields differ from `defaultParams` (`N`, `S`, `c`,
 * `r0`, `rMax`, `sigmaR`, `sigmaS`, `theta`, `v`, `b`, `beta`, `pDom` — twelve
 * counting `N` and `S`, which the plain scenario already overrode). Two of those
 * differences change which code paths are live rather than merely which numbers
 * flow through them:
 *
 *   - `rMax` 1 -> 0.2 makes the `Math.min(p.rMax, ...)` clamp at
 *     `sim/phases/transpose.ts:33` routinely binding rather than near-dead;
 *   - `theta`/`sigmaS` 5.0 -> 0.5 is the OPPOSITE silencing regime by this
 *     project's own classification (`web/params.ts:22-23` and
 *     `tests/guards/bloat-arm.ts`: at a ratio of 2 "escape by divergence is
 *     routine"; at 5 "one captured entry silences a whole family at once").
 *
 * And `web/params.ts:13-19` records that `defaultParams()` at its own values is
 * extinct by generation 300 and "unwatchable as a toy". So the guard whose stated
 * purpose is that the artifact played is the artifact validated was comparing the
 * two environments on a scenario nobody plays. Both regimes now run.
 *
 * `TOY_DEFAULTS` is IMPORTED from `web/params.ts` rather than restated, so the
 * coupling is compile-checked: a change to the toy's parameters cannot leave this
 * guard silently validating the old ones. The toy scenario takes `TOY_DEFAULTS`'
 * OWN `N` and `S` and overrides only `seed` — overriding `N`/`S` to the plain
 * scenario's values would reintroduce exactly the mismatch this closes.
 *
 * ------------------------------------------------------------------------------
 * WHAT THIS GUARD DOES NOT CLAIM
 * ------------------------------------------------------------------------------
 * IT DOES NOT ESTABLISH ENGINE-INDEPENDENCE. Node and Playwright's bundled
 * Chromium are both V8. What is established is ONE CODEBASE, THROUGH ONE
 * BUNDLER, ON ONE ENGINE FAMILY — that Vite's transform, tree-shaking and
 * minification did not change the model's behaviour, and that the bundle a
 * visitor loads is the source the other six guards validate. That is the claim
 * the project needs and it is worth having; it is strictly weaker than "any
 * conforming JavaScript engine reproduces these hashes".
 *
 * The gap is not hypothetical. `stateHash` digests `r` and `s` at nine decimals,
 * and the model reaches them through functions ECMA-262 explicitly permits an
 * implementation to approximate: `Math.exp` at `sim/phases/transpose.ts:35` and
 * `sim/phases/select.ts:103` and `:147`, and `Math.sqrt`/`Math.log` in
 * `sim/rng.ts:39`. Two engines whose `Math.exp` differ in the last ulp would
 * diverge here — and because `normal()` feeds the RNG stream, they would diverge
 * in the ORDER of draws, not merely in a low digit. Demonstrating that would take
 * a second engine family (SpiderMonkey or JavaScriptCore) in CI; nobody has run
 * it, and no sentence in this repo should imply otherwise.
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
import { BASE } from "../../vite.config.js";
import {
  createWorld,
  defaultParams,
  type Params,
  run,
  stateHash,
} from "../../sim/index.js";
import { TOY_DEFAULTS } from "../../web/params.js";

/**
 * Relative to the vite root (`web/`), so this lands beside `dist/` in the
 * project root. Gitignored.
 */
const OUT_DIR = "../dist-guard7";

/**
 * The scenarios, stated once. `web/hash-harness.ts` defaults to the same numbers
 * for `plain` and reads `TOY_DEFAULTS` from the same module this file imports.
 */
const N = 120;
const S = 1500;
const GENERATIONS = 120;
const SEED_A = 31337;
const SEED_B = 424242;

type Preset = "plain" | "toy";
const PRESETS: readonly Preset[] = ["plain", "toy"];

/**
 * `plain` is the original scenario, kept: it exercises `defaultParams` at values
 * every unit test is written against. `toy` is what a visitor actually runs.
 */
function paramsFor(preset: Preset, seed: number): Params {
  return preset === "toy"
    ? defaultParams({ ...TOY_DEFAULTS, seed })
    : defaultParams({ N, S, seed });
}

/**
 * One entry in the build's own manifest of what it wrote.
 *
 * Typed structurally, and the reason is NOT that the real types are unreachable:
 * `vite` re-exports the whole Rollup namespace (`export { rollup as Rollup }`),
 * so `Rollup.OutputChunk | Rollup.OutputAsset` is available here. It is narrowed
 * on purpose. `build()` returns `RollupOutput | RollupOutput[] | RollupWatcher`,
 * which the cast below already has to collapse; naming exactly the three fields
 * this file reads means no discrimination of the chunk/asset union, and a `type`
 * widened to `string` because the guard never branches on it.
 *
 * (An earlier version of this comment said "this repo has no `@types/node`".
 * That was false — it is a devDependency in `package.json`, and has been since
 * commit `4995f3b`.)
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
  // Keep the trailing slash -- this is the served BASE url, and under a
  // non-root `base` preview serves it only with the slash. See the same note in
  // `tests/layout.test.ts`. Pages are derived from it with `new URL`, not by
  // string concatenation, so the join cannot reintroduce a double slash.
  origin = server.resolvedUrls!.local[0]!;
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
function nodeHash(preset: Preset, seed: number): string {
  const world = createWorld(paramsFor(preset, seed));
  run(world, GENERATIONS);
  return stateHash(world);
}

interface BrowserRun {
  hash: string;
  /** What the page says it was asked for. Diagnostic only -- see below. */
  seed: number;
  generations: number;
  preset: string;
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
  generations: window.__stateHashGenerations,
  preset: window.__stateHashPreset
})`;

const cache = new Map<string, BrowserRun>();

/** Runs the scenario in Chromium, against the page the build just emitted. */
async function browserRun(preset: Preset, seed: number): Promise<BrowserRun> {
  const key = `${preset}:${seed}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const page = await browser!.newPage();
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") failures.push(`console: ${m.text()}`);
  });
  try {
    const url = new URL(
      `hash-harness.html?seed=${seed}&generations=${GENERATIONS}&preset=${preset}`,
      origin,
    ).href;
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
    cache.set(key, run_);
    return run_;
  } catch (e) {
    // The page's own errors are far more informative than a waitForFunction
    // timeout, so put them in front of the reader.
    throw new Error(
      `hash-harness at preset ${preset} seed ${seed} failed: ${(e as Error).message}` +
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
    // The prefix comes from `vite.config.ts`, never re-typed here: a built page
    // emits `src="<base>assets/...js"`, so a hand-copied literal would go on
    // matching its own stale value after the base changed.
    const assetSrc = new RegExp(
      `src="(${BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}assets/[^"]+\\.js)"`,
      "g",
    );
    const entryScript = (page: string): string[] =>
      [...html(page).matchAll(assetSrc)].map((m) => m[1]!);

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
    // And the chunk that script names was actually written. Rollup's fileNames
    // are relative to outDir (`assets/harness-*.js`) while the emitted `src` is
    // a URL path carrying the base, so strip the base rather than one leading
    // slash -- under a non-root base those are not the same cut.
    expect(names, `${harnessScript[0]} was written`).toContain(
      harnessScript[0]!.slice(BASE.length),
    );
  });

  for (const preset of PRESETS) {
    /**
     * CLAIM 1. Byte-identical, or there are two models and validating one says
     * nothing about the other.
     */
    it(`[${preset}] browser and node agree on the state hash, byte for byte`, async () => {
      const node = nodeHash(preset, SEED_A);
      const web = await browserRun(preset, SEED_A);

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
      // The page ran the regime it was ASKED for. Without this the toy arm
      // could be the plain arm again, agreeing with a node hash computed for
      // the wrong parameters would then be impossible -- but the failure would
      // read as a model divergence rather than as an ignored query parameter.
      expect(web.preset, "the page honoured ?preset=").toBe(preset);

      expect(
        web.hash,
        `preset ${preset}, seed ${SEED_A}, ${GENERATIONS} generations: ` +
          `browser ${web.hash} vs node ${node}`,
      ).toBe(node);
    }, 300_000);

    /**
     * CLAIM 2, and the reason claim 1 means anything. Two seeds, two DIFFERENT
     * browser hashes, each matching its own node hash. A page that reported a
     * constant would satisfy claim 1 and die here.
     */
    it(`[${preset}] POSITIVE CONTROL: the browser is running the model, not reporting a value`, async () => {
      const nodeA = nodeHash(preset, SEED_A);
      const nodeB = nodeHash(preset, SEED_B);

      // Precondition, asserted first: the two seeds discriminate AT ALL. If node
      // gave the same hash for both, "the browser hashes differ" would be
      // testing the wrong thing and "each matches its node hash" would be
      // vacuously compatible with a constant.
      expect(nodeA, "node discriminates the two seeds").not.toBe(nodeB);

      const webA = await browserRun(preset, SEED_A);
      const webB = await browserRun(preset, SEED_B);

      expect(
        webB.hash,
        `preset ${preset}: the browser answered ${webA.hash} at seed ${SEED_A} ` +
          `(page reports seed=${webA.seed}, generations=${webA.generations}) ` +
          `and ${webB.hash} at seed ${SEED_B} ` +
          `(page reports seed=${webB.seed}, generations=${webB.generations}): ` +
          `identical means the page is not running the model`,
      ).not.toBe(webA.hash);

      // And the variation is the MODEL's variation, not noise: each browser hash
      // lands on its own node counterpart.
      expect(webA.hash, `preset ${preset}, seed ${SEED_A}`).toBe(nodeA);
      expect(webB.hash, `preset ${preset}, seed ${SEED_B}`).toBe(nodeB);
    }, 300_000);
  }

  /**
   * POSITIVE CONTROL FOR THE PRESET ITSELF. The two scenarios must actually be
   * two scenarios, in BOTH environments.
   *
   * Without this, a `?preset=` the page silently ignored would run `plain`
   * twice; both arms above would still pass, and the guard would report that it
   * validates the toy's regime while never having run it. `__stateHashPreset`
   * alone cannot carry this — a page could echo the parameter back and still
   * feed the wrong values to `createWorld`.
   */
  it("POSITIVE CONTROL: the two presets are two different scenarios, in both environments", async () => {
    const nodePlain = nodeHash("plain", SEED_A);
    const nodeToy = nodeHash("toy", SEED_A);
    expect(
      nodeToy,
      `node gave the same hash for both presets at seed ${SEED_A}, so the ` +
        `toy arm is not a second scenario`,
    ).not.toBe(nodePlain);

    const webPlain = await browserRun("plain", SEED_A);
    const webToy = await browserRun("toy", SEED_A);
    expect(
      webToy.hash,
      `the browser gave ${webPlain.hash} for preset=plain and ${webToy.hash} ` +
        `for preset=toy: identical means the page ignored ?preset= and the ` +
        `toy regime was never run in a browser`,
    ).not.toBe(webPlain.hash);
  }, 300_000);

  /**
   * Node-side floor, kept from the task brief. Cheap, and it means the
   * well-formedness claim survives any restructuring of the tests above.
   */
  it("POSITIVE CONTROL: the node hash is non-trivial", () => {
    for (const preset of PRESETS) {
      const h = nodeHash(preset, SEED_A);
      expect(h, preset).toMatch(HEX8);
      expect(h, preset).not.toBe("00000000");
      // FNV-1a's offset basis, i.e. what `stateHash` returns for an empty input.
      expect(h, preset).not.toBe("811c9dc5");
    }
  }, 120_000);
});
