# Pre-registration — do the controlled seeds saturate?

**Registered:** 2026-09-19, before any runner existed.
**Model frozen at:** `12e7b08`, the same freeze questions 001–006 used. `sim/`'s tree
hash at HEAD (`23a9842`) is `562fcea2d8a97a833a7b83da8eabb7ad88c4a21d` against
`12e7b08:sim` = `b1e69c26a1856c9ab17963550f58e3082e8b05be`. **That difference is
comments only.** `node scripts/sim-code-digest.mjs`, which compiles every file in
`sim/` with comments removed, returns
`07f0ccabe735a307e24e7a45b1b1327df531a65b7a1e076780d045ad8608c5de` for both. The
golden hash `9c15fd28` in `tests/step.test.ts` has not moved.
**Sited by:** registered question 006, `2026-09-11-is-the-exponent-one.md`. Its Result
leaves this question open and says it "must not be answered by extending those runs
and re-scoring 006".
**Companions:** 005 `2026-09-05-does-the-delay-diverge.md` (the "no floor" claim this
question tests below `phi = 0.002`); 006 as above.

## Question

In 006's Phase 2, at `phi = 0.0005` and ratio 5.00 (`theta = 0.10`, `sigmaS = 0.02`),
seven of ten seeds saturated between generations 21899 and 23903. The other three
— **seeds 6005, 6006 and 6008** — ran the full 70013-generation horizon without
saturating or going extinct:

| seed | stopped at | copies/genome | end-state hash (006) |
| ---- | ---------- | ------------- | -------------------- |
| 6005 | 70013      | 493.64        | `6036f311`           |
| 6006 | 70013      | 573.09        | `1ba1bbf0`           |
| 6008 | 70013      | 573.21        | `6b518b4c`           |

Over the run their copy number wandered between roughly 200 and 900 per genome.
Saturation is 1500. 006's Result says they are "consistent with a floor at some
seeds, and equally with a delay longer than 2.9× the cell's latest saturation".
006 cannot tell those two apart.

**007 asks: given a registered horizon of 10× the cell's latest saturation, do these
three seeds saturate?**

## Why it is worth asking

005 registered and held "no floor above `phi = 0.002`": every seed at every tested
`phi` eventually saturated. 006 went deeper and found a cell where three seeds had not
saturated at 2.9× the latest saturation of the other seven, with nothing in between. If
some seeds are held indefinitely, 005's "no floor" does not extend below 0.002, and
the regime changes character at low infidelity. If they are only slow, 005's claim
extends. 006 was never designed to tell which, and must not be re-scored to find out.

## Why this is not re-scoring 006

006's cell, its method and its verdicts stand exactly as registered. The censored runs
stay excluded from 006's primary as registered, and the censored-at-horizon treatment
stays the robustness reading its Result gives. 007 is a separate question, with its
own horizon rule stated here before any run, and it reports its own outcome. Nothing
007 finds is written back into 006's tables.

The three seeds are **re-run from generation 0**, not resumed. The model is
deterministic, so under the same seed they pass through the same states 006 recorded.
That is not assumed: manipulation check 1 requires each seed's state hash at generation
70013 to equal 006's recorded end-state hash.

## What is registered

### The cell and the seeds

- **Cell:** `phi = 0.0005`, ratio 5.00, with every other parameter exactly as 006's
  Phase 2 ran it.
- **Named seeds:** 6005, 6006, 6008. These carry the PRIMARY.
- **Fresh seeds:** 7001–7020, twenty seeds no earlier question has used. These carry
  the SECONDARY, which is descriptive.
- **Positive control:** `phi = 0.001`, ratio 5.00, seeds 6001–6010, replaying 006's
  Phase 2 cell. All ten saturated there, at 10512–12646.

### The horizon

**H = 10 × 23903 = 239,030 generations**, where 23903 is the latest saturation in the
cell (006's Phase 2). It applies to the named and the fresh seeds. A run stops at
saturation, at extinction, or at H. The positive-control runs use 006's horizon for
that cell, 35007, so that a replay is a replay.

### Definitions, unchanged from 006

**Saturated** means the first generation at which total copies exceed 1500 × N
(`SATURATION_COPIES_PER_GENOME`, `experiments/006-is-the-exponent-one.ts:109`).
**Extinct** means zero copies. **Controlled** means neither by H. 007 imports these
from 006's runner rather than restating them, so they cannot drift.

### What is recorded per run

- 006's `Row`, unchanged.
- **The series:** copies per genome every 1000 generations, from 1000 up to the
  generation the run stopped, to `experiments/007-series.csv`.
- **The replay hash:** `stateHash(world)` at generation 70013, for runs that reach it.

### How the loop is observed

006's `runOne` gains an optional `onGeneration(world)` parameter. 006 never passes it.
It is called at the point where the heartbeat already runs, and like the heartbeat it
**reads no RNG and changes no state**. This is a post-data change to a registered
runner, so before 007's runner is committed it must be shown to leave 006 untouched:

- `--analyse` output is byte-identical before and after;
- the step golden hash `9c15fd28` is unmoved;
- every existing test passes;
- a dated addendum is appended to 006's registration.

Mutation-table row 8 checks that an observer which did consume a draw would be caught.

## Pre-specified outcomes

### Per seed, exactly one label

- **saturated**, with its `t_sat`;
- **extinct**, with its generation;
- **controlled-flat**;
- **controlled-trending**.

**Trending rule.** Take the recorded series over the last half of the run, generations
`H/2` to `H`, which is 120 samples for a run that reaches H. Fit `ln(copies/genome)`
against generation by ordinary least squares. The seed is **controlled-trending** if
the fitted line, extended to generation `2H`, reaches `ln 1500`. Otherwise it is
**controlled-flat**. A slope of zero or below is always flat. There is no significance
test. The series is autocorrelated, so a naive p-value would overstate what it knows.
The rule instead asks whether the seed's own recent drift would carry it to the
model's saturation threshold within one more horizon.

### PRIMARY — delay

> **All three named seeds saturate before H.**

**Falsified if any named seed is not saturated at H,** whether extinct,
controlled-flat or controlled-trending.

### Overall outcome, for the named seeds

- **delay** — all three saturated.
- **floor-consistent** — otherwise, if at least one is controlled-flat.
- **undecided** — otherwise. That is, none is controlled-flat, and at least one is
  extinct or controlled-trending.

**Extinctions are reported as their own count and are never read as a floor.** An
extinct seed was not held at a controlled level. It was lost.

### SECONDARY — how common is the controlled mode? Descriptive, no verdict

For the 20 fresh seeds, report the number and fraction still controlled at generation
70013 and at H, each with a Wilson 95% interval. Also report the counts saturated and
extinct, and each fresh seed's label under the rule above. Nothing in the model
predicts this fraction, so any registered number would be invented. None is
registered.

### What each outcome licenses about 005's "no floor"

- **delay:** "no floor" extends to `phi = 0.0005` at ratio 5.00, for these seeds, up
  to H.
- **floor-consistent:** "no floor" is **not supported** below `phi = 0.002` at ratio
  5.00. **A floor is not claimed.** A flat run over a finite horizon cannot establish
  one.
- **undecided:** no claim either way. The Result names which seeds were still
  trending, or went extinct.

## Manipulation checks — the experiment is void if these fail

1. **Replay.** Each named seed's `stateHash` at generation 70013 equals its 006
   end-state hash in the table above. Any mismatch voids 007: the named seeds would
   not be the runs 006 recorded.
2. **Positive control.** At `phi = 0.001`, ratio 5.00, each of seeds 6001–6010
   saturates, with `t_sat` and end-state hash identical to its row in
   `experiments/006-phase2.csv`. Any mismatch voids 007. This shows both that 007's
   runner replays 006 faithfully and that saturation is reachable under it.
3. **Grid integrity.** Exactly the registered (cell, seed) set: 3 named, 20 fresh and
   10 control runs. No run is duplicated or missing.
4. **Horizon provenance.** Every named and fresh row records `horizon = 239030`, and
   every control row records `horizon = 35007`.
5. **Series integrity.** Every run's series has one sample per 1000 generations, from
   1000 to the last multiple of 1000 not past its stopping generation, with no gaps
   and no duplicates.
6. **Model.** At run time, `node scripts/sim-code-digest.mjs --dir sim` equals the
   digest of `12e7b08`. The value is recorded in the run log.

## Pre-specified analysis

- Labels, the PRIMARY and the overall outcome are computed by the runner from the
  CSVs, by functions unit-tested against synthetic series with known answers before
  any data exists.
- The trending rule is the only fitted quantity, specified in full above.
- Wilson intervals use z = 1.96.

## Mutation table — the runner is not committed until each is seen to fail

| #  | mutation                                                                  | must be caught by                    |
| -- | ------------------------------------------------------------------------- | ------------------------------------ |
| 1  | replay hash taken at generation 70012 instead of 70013                    | manipulation check 1                 |
| 2  | positive control run at seed `s + 1`                                      | manipulation check 2                 |
| 3  | named-seed horizon left at 006's 70013                                    | manipulation check 4                 |
| 4  | trend fitted over the whole run instead of the last half                  | `tests/007-analysis.test.ts`         |
| 5  | trend extrapolated to `H` instead of `2H`                                 | `tests/007-analysis.test.ts`         |
| 6  | an extinct seed labelled controlled                                       | `tests/007-analysis.test.ts`         |
| 7  | overall outcome "floor-consistent" when every controlled seed is trending | `tests/007-analysis.test.ts`         |
| 8  | the observer consumes one RNG draw                                        | manipulation checks 1 and 2          |
| 9  | series sampled every 999 generations                                      | manipulation check 5                 |
| 10 | one fresh seed duplicated                                                 | manipulation check 3                 |

Rows 1, 2, 3, 8, 9 and 10 are shown to fail on a short smoke version of the pipeline,
with horizons scaled down and the replay target taken from the smoke itself. That keeps
the check machinery honest without spending the full runs.

## Cost, measured rather than guessed

006's Phase 2 ran 1,063,507 generations in 27.85 h (jobd job 3757), about 0.094 s per
generation. The actual cost depends on copy number: controlled runs carry about
200–900 copies per genome, and saturating runs climb to 1500.

- Named seeds: up to 3 × 239,030 generations, about 6.2 h each, run in parallel.
- Control: about 119k generations, a few hours.
- Fresh seeds: about 23k generations each for those that saturate, and about 6 h
  each for any that stay controlled.

The runs go through jobd, sharded so that independent runs run in parallel.

## Scope, stated in advance

- **One model, one freeze.** Nothing here is a claim about transposable elements in
  any organism.
- **One cell.** Ratio 3.33's extinction regime at `phi = 0.0005`, any `phi` below
  0.0005, and the other ratios are out of scope.
- **No constant is changed.**
- **A finite horizon cannot prove a floor.** The strongest statement 007 can make
  against "no floor" is "not supported".
- **006 is not re-scored**, whatever 007 finds.

## Result — 2026-09-19

**Provenance.** Commit `1531adc`, clean tree, node v22.14.0, host SCAR18. Eight jobd
shards, 3881–3888, ran from 01:47:54 to 15:53:30 EDT on 2026-09-19, three at a time.
Data: `experiments/007-runs.csv`, 33 runs, and `experiments/007-series.csv`. Scored by
`npx tsx experiments/007-do-the-controlled-seeds-saturate.ts --analyse`, whose output
is quoted below in full.

### Manipulation checks 1–6: all passed

1. **Replay.** Each named seed's `stateHash` at generation 70013 equalled its 006
   end-state hash: 6005 `6036f311`, 6006 `1ba1bbf0`, 6008 `6b518b4c`.
2. **Positive control.** All ten seeds 6001–6010 at `phi = 0.001` saturated, each with
   `t_sat` and end-state hash identical to its row in `experiments/006-phase2.csv`
   (10512–12646).
3. **Grid.** Exactly 3 named, 20 fresh and 10 control runs; none duplicated or missing.
4. **Horizon.** Every named and fresh row records 239030; every control row 35007.
5. **Series.** One sample per 1000 generations for every run, no gaps, no duplicates.
6. **Model.** `07f0ccabe735a307e24e7a45b1b1327df531a65b7a1e076780d045ad8608c5de`, the
   digest of `12e7b08`, in every shard log.

### PRIMARY — FALSIFIED

> All three named seeds saturate before H.

None of the three saturated.

| seed | label            | stopped at | copies/genome | the fit over `H/2`–`H`                          |
| ---- | ---------------- | ---------- | ------------- | ----------------------------------------------- |
| 6005 | extinct          | 230096     | 0             | not fitted; an extinct run is labelled from its row |
| 6006 | controlled-flat  | 239030     | 714.90        | slope 3.2584e-7/gen over 120 samples; fitted 702.6 at `H`, 759.5 at `2H` |
| 6008 | controlled-flat  | 239030     | 474.63        | slope 8.6836e-7/gen over 120 samples; fitted 587.2 at `H`, 722.6 at `2H` |

Both surviving seeds drift upward, and both drift far too slowly: extended a full
second horizon, each fitted line is still under half of the 1500 threshold.

### Overall outcome — floor-consistent, with 1 extinction

Two named seeds are controlled-flat, so the registered rule gives **floor-consistent**.
The third, 6005, went **extinct** at generation 230096 and is reported as its own
count. It is not read as a floor: it was not held at a controlled level, it was lost.

### What this licenses about 005's "no floor" — the registered wording

> **"No floor" is not supported below `phi = 0.002` at ratio 5.00. A floor is not
> claimed.** A flat run over a finite horizon cannot establish one.

005's registered claim, "no floor above `phi = 0.002`", is untouched — 007 tested a
cell below it. 006's cell, method and verdicts are likewise untouched.

### SECONDARY — how common is the controlled mode? Descriptive, no verdict

Of the 20 fresh seeds 7001–7020:

- **19 saturated**, between generations 20916 (seed 7003) and 24380 (seed 7012) — the
  same band as the seven that saturated in 006's Phase 2, 21899–23903.
- **1 went extinct**: seed 7007, at generation 113878.
- **controlled-flat: 0. controlled-trending: 0.** No fresh seed reached H.
- Still controlled at generation 70013: **1 of 20**, Wilson 95% [0.009, 0.236] — that
  one being 7007, which later went extinct rather than being held.
- Still controlled at H: **0 of 20**, Wilson 95% [0.000, 0.161].

So the controlled mode did not recur in twenty fresh draws of the same cell. Nothing
in the model predicts this fraction and none was registered; the interval is the whole
statement.

### Unregistered observations — not scored, not claims

Recorded because they are visible in the series and would otherwise be lost. Neither
was registered, so neither is evidence for anything here.

- **Both extinctions were abrupt**, not a decline. Seed 6005 sampled 492.2
  copies/genome at generation 229000 and 0.14 at 230000, dying at 230096; seed 7007
  sampled 593.5 at 113000 and died at 113878. A controlled seed appears to end by
  collapsing from its usual level, not by sinking through it.
- **The two survivors sat where 006 left them.** Over the whole 239030 generations,
  6006 ranged 200.3–1011.7 copies/genome (mean 670.1) and 6008 ranged 220.3–855.9
  (mean 557.8) — the same 200–900 band 006 reported at a horizon 3.4× shorter. Their
  silenced fractions at H were 0.633 and 0.751.

### The analyse output, verbatim

```
MANIPULATION CHECKS 1-6 PASSED

=== PRIMARY — delay: all three named seeds saturate before H ===
  seed 6005: extinct (extinct at 230096)
  seed 6006: controlled-flat (slope 3.258e-7/gen over 120 samples, fitted 760 copies/genome at 2H)
  seed 6008: controlled-flat (slope 8.684e-7/gen over 120 samples, fitted 723 copies/genome at 2H)
  PRIMARY: FALSIFIED
  OVERALL: floor-consistent; extinctions 1
=== SECONDARY — fresh seeds, descriptive, no verdict ===
  controlled at 70013: 1 of 20 [0.009, 0.236]
  controlled at H: 0 of 20 [0.000, 0.161]
  saturated 19, extinct 1, controlled-flat 0, controlled-trending 0
```

### What 007 does not say

- It does not establish a floor. Two seeds flat over 239030 generations is consistent
  with a floor and equally with a delay longer than 10× the cell's latest saturation.
  That is a statement about the horizon, not about the model.
- It says nothing about `phi` below 0.0005, about ratio 3.33, or about any organism.
- It does not re-score 006, and 006's tables are unchanged.
