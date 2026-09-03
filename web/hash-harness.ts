import { createWorld, defaultParams, run, stateHash } from "../sim/index.js";
import { TOY_DEFAULTS } from "./params.js";

/**
 * Runs a fixed scenario in the browser and publishes its state hash for guard 7
 * (`tests/guards/one-implementation.test.ts`). Not part of the toy.
 *
 * THE SEED IS A QUERY PARAMETER, NOT A LITERAL, and that is load-bearing. With a
 * hard-coded seed the guard could only ever ask "does the browser report the
 * value node computed?", which a page that set `__stateHash` from a constant, a
 * cached string or a build-time inlined literal would answer correctly forever.
 * Driving this page at two seeds and requiring two DIFFERENT hashes, each
 * matching its own node hash, is what makes the browser side an execution of the
 * model rather than a report about one.
 *
 * SO IS THE PRESET, and for a different reason. Guard 7's claim is that THE
 * ARTIFACT PLAYED IS THE ARTIFACT VALIDATED. Until 2026-09-03 this page ran only
 * `defaultParams({ N, S, seed })` — a regime the toy does not run and, by
 * `web/params.ts`'s own measurement, one that goes extinct by generation 300 and
 * is "unwatchable as a toy". Ten of `TOY_DEFAULTS`' seventeen fields differ from
 * `defaultParams`, and two of the differences change which code paths are live:
 * `rMax` 1 -> 0.2 makes `Math.min(p.rMax, ...)` in `sim/phases/transpose.ts:33`
 * routinely binding rather than near-dead, and `theta`/`sigmaS` 5.0 -> 0.5 is the
 * opposite silencing regime by this project's own classification. A guard that
 * compared node against the browser only on the plain regime was certifying the
 * two environments on a scenario nobody plays.
 *
 * `TOY_DEFAULTS` is IMPORTED, not restated, so the coupling to the toy is
 * compile-checked. `N` and `S` below apply to the plain preset only; the toy
 * preset takes `TOY_DEFAULTS`' own `N` and `S`, because overriding those would
 * reintroduce exactly the mismatch this preset exists to close.
 */
const query = new URL(window.location.href).searchParams;

const N = 120;
const S = 1500;
const DEFAULT_SEED = 31337;
const DEFAULT_GENERATIONS = 120;
const DEFAULT_PRESET = "plain";

const seedParam = query.get("seed");
const generationsParam = query.get("generations");
const presetParam = query.get("preset");
const seed = seedParam === null ? DEFAULT_SEED : Number(seedParam);
const generations =
  generationsParam === null ? DEFAULT_GENERATIONS : Number(generationsParam);
const preset = presetParam === null ? DEFAULT_PRESET : presetParam;

// Loud, not defaulted. A silently coerced NaN seed would make every run agree
// with every other, and the guard's second claim would evaporate. An unknown
// preset silently falling back to `plain` would be worse still: the guard would
// compare the toy regime in node against the plain regime in the browser, get a
// mismatch, and report it as a cross-environment divergence in the model.
if (!Number.isInteger(seed) || !Number.isInteger(generations)) {
  throw new Error(
    `hash-harness: bad query ?seed=${seedParam}&generations=${generationsParam}`,
  );
}
if (preset !== "plain" && preset !== "toy") {
  throw new Error(`hash-harness: unknown ?preset=${presetParam}`);
}

const params =
  preset === "toy"
    ? defaultParams({ ...TOY_DEFAULTS, seed })
    : defaultParams({ N, S, seed });

const world = createWorld(params);
run(world, generations);
const hash = stateHash(world);

// `__stateHash` is what the guard reads. The others are diagnostic: they let a
// failure message say WHICH run produced the hash it is complaining about.
Object.assign(window, {
  __stateHash: hash,
  __stateHashSeed: seed,
  __stateHashGenerations: generations,
  __stateHashPreset: preset,
});

const out = document.getElementById("out");
if (out) {
  out.textContent = `preset=${preset} seed=${seed} generations=${generations} ${hash}`;
}
