/**
 * The mutation table for registered question 007, executed.
 *
 * `docs/pre-registrations/2026-09-19-do-the-controlled-seeds-saturate.md`
 * forbids committing the runner until every row has been SEEN TO FAIL for its
 * stated reason. Rows 4-7 live in `experiments/007-analysis.ts` and are pinned
 * by `tests/007-analysis.test.ts`. The rows here live in the runner's
 * manipulation checks, and each runs the REAL smoke pipeline — real runs of
 * 006's loop at scaled-down horizons — with one deliberate defect injected.
 *
 * The clean smoke runs first and must PASS: a table where every row "fails"
 * proves nothing if the harness fails on everything.
 *
 *     npx tsx scripts/007-mutation-table.ts
 */
import {
  SMOKE,
  smoke,
  type Faults,
} from "../experiments/007-do-the-controlled-seeds-saturate.js";

const ROWS: { row: number; what: string; faults: Faults; check: number }[] = [
  {
    row: 1,
    what: "replay hash taken one generation early",
    faults: { replayGenOffset: -1 },
    check: 1,
  },
  {
    row: 2,
    what: "positive control run at seed + 1",
    faults: { controlSeedOffset: 1 },
    check: 2,
  },
  {
    row: 3,
    what: "named-seed horizon left at the replay generation",
    faults: { namedHorizon: SMOKE.replayGen },
    check: 4,
  },
  {
    row: 8,
    what: "the observer consumes one RNG draw",
    faults: { observerDraws: true },
    check: 1,
  },
  {
    row: 9,
    what: "series sampled one generation short of the interval",
    faults: { sampleEvery: SMOKE.sampleEvery - 1 },
    check: 5,
  },
  {
    row: 10,
    what: "one fresh seed duplicated",
    faults: { duplicateFresh: true },
    check: 3,
  },
];

const quiet = <T>(f: () => T): T => {
  const log = console.log;
  console.log = () => {};
  try {
    return f();
  } finally {
    console.log = log;
  }
};

quiet(() => smoke());
console.log("clean smoke: PASSED (the harness can pass)");

let bad = 0;
for (const r of ROWS) {
  let msg = "";
  try {
    quiet(() => smoke(r.faults));
  } catch (e) {
    msg = (e as Error).message;
  }
  const ok = msg.includes(`manipulation check ${r.check} failed`);
  if (!ok) bad++;
  console.log(
    `row ${r.row} (${r.what}): ${ok ? "FAILED as required, by check " + r.check : "NOT CAUGHT as registered"}` +
      (msg
        ? `\n    ${msg.slice(0, 200)}`
        : "\n    the smoke PASSED with the defect in place"),
  );
}
if (bad > 0) {
  console.error(
    `\n${bad} row(s) not caught for their stated reason — the runner must not be committed.`,
  );
  process.exit(1);
}
console.log("\nEvery row failed for its stated reason.");
