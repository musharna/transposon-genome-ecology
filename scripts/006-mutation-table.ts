/**
 * The mutation table for registered question 006, executed.
 *
 * `docs/pre-registrations/2026-09-11-is-the-exponent-one.md` forbids committing
 * the runner until every row has been SEEN TO FAIL for its stated reason. A row
 * that stays green means the check does not test what it claims to.
 *
 * Rows 2 and 4 live in `experiments/006-forms.ts` and are exercised by
 * `tests/006-forms.test.ts`. The rows here are the ones that live in the
 * runner's manipulation checks, and they run against SYNTHETIC rows rather than
 * a real sweep — the point of the table is that a check fires, and finding that
 * out must not cost sixteen hours.
 *
 *     npx tsx scripts/006-mutation-table.ts
 */
import {
  manipulationCheck3,
  manipulationCheck5,
  keysFor,
  assertInRange,
  PHASE1_PHIS,
  RATIOS,
  SEEDS,
  type Row,
} from "../experiments/006-is-the-exponent-one.js";

const row = (
  phi: number,
  ratio: string,
  seed: number,
  over: Partial<Row> = {},
): Row => ({
  phi,
  ratio,
  theta: 0.1,
  sigmaS: 0.05,
  seed,
  horizon: 10_000,
  horizonFrom: "mechanism",
  horizonPredicted: 4000,
  stoppedAt: 4000,
  copiesPerGenome: 1500,
  silencedFraction: 0.5,
  extinct: 0,
  saturated: 1,
  saturationGeneration: 4000,
  entriesPerGenome: 10,
  captures: 100,
  meanAbsS: 1,
  maxAbsEntry: 50,
  hash: "deadbeef",
  ...over,
});

/** A clean Phase 1 grid: every registered (phi, ratio, seed). */
const cleanPhase1 = (): Row[] => {
  const out: Row[] = [];
  for (const phi of PHASE1_PHIS)
    for (const r of RATIOS)
      for (const s of SEEDS) out.push(row(phi, r.label, s));
  return out;
};

let failures = 0;
function mutation(
  n: number,
  what: string,
  caughtBy: string,
  run: () => void,
): void {
  process.stdout.write(
    `ROW ${n} — ${what}\n  must be caught by: ${caughtBy}\n  `,
  );
  try {
    run();
    console.log("*** SURVIVED — THE CHECK DOES NOT TEST WHAT IT CLAIMS ***\n");
    failures++;
  } catch (e) {
    console.log(`CAUGHT: ${(e as Error).message.slice(0, 140)}\n`);
  }
}

// Positive control, first: the clean grid must PASS, or every row below would
// "fail" for the trivial reason that the check rejects everything.
console.log("POSITIVE CONTROL — the unmutated Phase 1 grid passes\n");
manipulationCheck5(cleanPhase1(), keysFor(PHASE1_PHIS, RATIOS), "control");
manipulationCheck3([row(0.001, "2.00", 6001)]);
assertInRange(
  [
    { phi: 0.002, t: 4720 },
    { phi: 0.0453, t: 321 },
  ],
  "control",
);
console.log("control passed — the checks accept a clean grid.\n");

mutation(
  1,
  "one Phase 2 cell's phi silently set to 0.002",
  "manipulation check 5",
  () => {
    const rows = cleanPhase1();
    rows[0] = row(0.002, rows[0]!.ratio, rows[0]!.seed);
    manipulationCheck5(rows, keysFor(PHASE1_PHIS, RATIOS), "mutation 1");
  },
);

mutation(
  3,
  "a censored run's t_sat recorded as its horizon",
  "manipulation check 3",
  () => {
    manipulationCheck3([
      row(0.001, "2.00", 6001, {
        saturated: 1,
        saturationGeneration: 10_000,
        horizon: 10_000,
      }),
    ]);
  },
);

mutation(
  5,
  "a Phase 2 cell included in the candidate fits",
  "analysis assertion",
  () => {
    assertInRange(
      [
        { phi: 0.002, t: 4720 },
        { phi: 0.001, t: 9440 },
      ],
      "mutation 5",
    );
  },
);

mutation(
  6,
  "one seed duplicated across two cells",
  "manipulation check 5",
  () => {
    const rows = cleanPhase1();
    rows[1] = row(rows[0]!.phi, rows[0]!.ratio, rows[0]!.seed);
    manipulationCheck5(rows, keysFor(PHASE1_PHIS, RATIOS), "mutation 6");
  },
);

console.log(
  failures === 0
    ? "ALL ROWS CAUGHT. The runner may be committed."
    : `${failures} ROW(S) SURVIVED. The runner must NOT be committed.`,
);
process.exit(failures === 0 ? 0 : 1);
