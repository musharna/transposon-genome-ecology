import { createWorld, defaultParams, run, stateHash } from "../sim/index.js";

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
 * `N` and `S` are fixed here and restated in the guard. The duplication is safe
 * in the only direction that matters: if the two ever drift apart the hashes
 * stop matching and the guard fails loudly, which is the failure it exists to
 * detect anyway.
 */
const query = new URL(window.location.href).searchParams;

const N = 120;
const S = 1500;
const DEFAULT_SEED = 31337;
const DEFAULT_GENERATIONS = 120;

const seedParam = query.get("seed");
const generationsParam = query.get("generations");
const seed = seedParam === null ? DEFAULT_SEED : Number(seedParam);
const generations =
  generationsParam === null ? DEFAULT_GENERATIONS : Number(generationsParam);

// Loud, not defaulted. A silently coerced NaN seed would make every run agree
// with every other, and the guard's second claim would evaporate.
if (!Number.isInteger(seed) || !Number.isInteger(generations)) {
  throw new Error(
    `hash-harness: bad query ?seed=${seedParam}&generations=${generationsParam}`,
  );
}

const world = createWorld(defaultParams({ N, S, seed }));
run(world, generations);
const hash = stateHash(world);

// `__stateHash` is what the guard reads. The other two are diagnostic: they let
// a failure message say WHICH run produced the hash it is complaining about.
Object.assign(window, {
  __stateHash: hash,
  __stateHashSeed: seed,
  __stateHashGenerations: generations,
});

const out = document.getElementById("out");
if (out) out.textContent = `seed=${seed} generations=${generations} ${hash}`;
