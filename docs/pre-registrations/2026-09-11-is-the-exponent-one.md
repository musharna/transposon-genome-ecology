# Pre-registration — is the exponent one?

**Registered:** 2026-09-11, before any runner existed.
**Model frozen at:** `12e7b08`, the same freeze questions 001–005 used. `sim/`'s
tree hash at time of writing is `562fcea2d8a97a833a7b83da8eabb7ad88c4a21d`
against `12e7b08:sim` = `b1e69c26a1856c9ab17963550f58e3082e8b05be`, and **that
difference is comments only** — `git diff 12e7b08 HEAD -- sim/` is 11 insertions
and 4 deletions across `sim/params.ts` and `sim/silencing.ts`, with **zero
non-comment lines**, all of them documentation corrections made in v1.0.1. The
golden hash `9c15fd28` in `tests/step.test.ts` is unmoved. The model this
question runs on is behaviourally the model 001–005 ran on, and is not touched by
this experiment.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
§3.3 (why the sequence coordinate earns its place).
**Sited by:** registered question 005, `2026-09-05-does-the-delay-diverge.md`,
whose Result states that `t_sat` is not a power law in `phi` and hands the
functional form to this registration.
**Companions:** 001 `2026-09-02-per-copy-vs-family-rate.md`, 002
`2026-09-04-conscription-vs-innate-silencer.md`, 003
`2026-09-04-how-fresh-must-the-trap-be.md`, 004
`2026-09-04-a-band-or-only-a-delay.md`.

## Question

005 established that `t_sat(phi)` is **not** a power law: every fit leaves the
same convex residual signature, and the exponent you measure is a property of the
window you fit in — 004's window gave 0.73, 005's gave 0.87. 005 stopped there,
correctly, because a third refit on a third window would have been the same
mistake a third time.

The question this asks is not "what is the exponent". It is:

**Does the local exponent CONVERGE, as `phi` falls, to the value the model's own
mechanism predicts — one — or does it keep drifting?**

That is a question about **form**, it is scale-free, and it has a mechanistic
answer to be right or wrong about rather than a curve to be fitted.

## Why it is worth asking

Three reasons, in order of weight.

1. **The mechanism makes a parameter-free prediction and nothing has tested it.**
   `a = 1` is derived below from the model's own structure, with no fitted
   exponent. Either the model's saturation is governed by the mechanism its own
   design documents describe, or it is not. 004 asked a mechanistic question of
   this kind (`phi* = theta / max|s|`) and the mechanism **failed**, which was
   informative. This is the second such question and it is sharper, because it
   predicts a number rather than a cell.
2. **It is the registered way out of an exponent-refitting loop.** 005 named the
   trap: "a question 006 that froze `a = 0.87` and tested below `phi = 0.002`
   should expect to falsify it exactly as 005 falsified 004." Testing a
   **fixed, derived** exponent against a **fitted** one and a **drifting** one is
   a form test, not a refit.
3. **It repairs 005's recorded circularity.** 005 sized its horizon from the
   model under test, was 43% low, and consumed 82% of the horizon at its worst
   seed. This design sizes Phase 2's horizon from the form **Phase 1 selects**,
   which is a different model from the one Phase 2 tests.

## What 005 established, carried forward as fact

From `../../experiments/005-delay-divergence.csv`, 150 runs, all four
manipulation checks passed, 150/150 saturated and 0 censored. Cell means over 10
seeds:

| ratio | `phi`=0.0020 | 0.0040 | 0.0113 | 0.0226 | 0.0453 |
| ----- | ------------ | ------ | ------ | ------ | ------ |
| 2.00  | 4720         | 2414   | 942    | 517    | 321    |
| 3.33  | 5346         | 2743   | 1066   | 617    | 349    |
| 5.00  | 6102         | 3107   | 1235   | 678    | 398    |

Per-cell SEMs ran **0.86%–2.48%**. Global power-law fits give `a` = 0.8695 /
0.8734 / 0.8766, each leaving convex residuals at 1.9–2.9× the sampling noise
floor with R² between 0.993 and 0.9986.

**The local exponent between consecutive cells, which is what this question is
about, is already drifting and already close to one at the small-`phi` end:**

| ratio | 0.0020→0.0040 | 0.0040→0.0113 | 0.0113→0.0226 | 0.0226→0.0453 |
| ----- | ------------- | ------------- | ------------- | ------------- |
| 2.00  | **0.967**     | 0.906         | 0.865         | 0.686         |
| 3.33  | **0.962**     | 0.910         | 0.789         | 0.822         |
| 5.00  | **0.974**     | 0.888         | 0.865         | 0.764         |

## The mechanism this registration tests

### Where `a = 2` comes from, and why it is wrong

004 registered the governing picture: a copy at coordinate `s` captured at
infidelity `phi` deposits an entry at `(1 - phi) * s`, which covers the capturing
copy iff `phi * |s| <= theta`. So a captured copy has a **self-coverage reach of
`theta / phi`**, and control fails once the lineage's coordinate outruns it.

`s` is a random walk: a daughter sits at its parent's coordinate plus a
`N(0, sigmaS)` step, so a lineage `k` transposition events deep is distributed
`N(0, sigmaS * sqrt(k))`. Setting `sigmaS * sqrt(k) = theta / phi` gives
`k* ∝ phi^-2`, and **if events accrued at a constant rate, `t_sat ∝ phi^-2`, i.e.
`a = 2`.**

The measured exponent is nowhere near 2. So the constant-rate assumption is wrong.

### Where `a = 1` comes from

The quantity that has to outrun the reach is not one lineage's coordinate, it is
the **maximum over the population** — the trap is escaped when *some* copy gets
far enough. The maximum of `N` draws from `N(0, sigmaS*sqrt(k))` grows as
`sigmaS * sqrt(k) * sqrt(2 ln N)`. During an invasion the population of copies
grows roughly exponentially, so `ln N` is roughly **linear in `t`**, and

```
max|s| ~ sigmaS * sqrt(k) * sqrt(2 ln N)  ~  sqrt(t) * sqrt(t)  =  t
```

The walk's frontier advances **linearly in time**, not diffusively. Setting it
equal to the reach `theta / phi` gives `t_sat ∝ 1 / phi`:

> **`a = 1`, with no fitted exponent.**

### This is checkable on data 005 already has, and it checks out

005 recorded `max_abs_entry` per run. Averaged per cell:

| scaling                      | spread within a ratio, across the 22× `phi` range |
| ---------------------------- | ------------------------------------------------- |
| `max\|s\| / sqrt(t)` (diffusive) | **5.21× – 5.38×** — badly wrong                |
| `max\|s\| / t` (linear)          | **1.33× – 1.38×** — and it tightens as `phi` falls |

At the three smallest `phi` at ratio 2.00, `max|s| / t` reads 33.86, 32.99, 31.22
— within 8% across a 5.6× change in `phi`. The frontier is linear in time, which
is the mechanism's load-bearing step.

`max|s|` at saturation also sits at a near-constant multiple of the reach within
each ratio — 3.20/3.19/3.32/3.38/3.56 at ratio 2.00, a 1.12× spread across the
whole range — which is the mechanism's other claim: saturation happens when the
frontier reaches a fixed multiple of `theta/phi`.

### ⚠️ The circularity, named rather than hoped away

**The `a = 1` mechanism was derived while looking at 005's data, so 005 cannot
confirm it.** The tables above are the reason to think the mechanism is worth
registering; they are not evidence for it. What makes this a prediction rather
than a fit is that `a = 1` is **derived, carries no free exponent**, and is
scored on `phi` cells **below 0.002 that no experiment in this project has ever
run**. This is structurally what 004 did — use 003's `phi = 0` cells to predict
an edge at `phi > 0` that 003 never observed — and 004's mechanism failed under
exactly this arrangement, which is the point of arranging it this way.

## The three things this design must not repeat

1. **A one-sided falsification clause.** 003's secondary 1 covered only the edge
   being too high, the edge fell out the low side, and the analysis printed HELD
   for a false prediction. Every clause below is a literal two-sided negation.
2. **A horizon sized from the model under test.** 005 sized from its own
   candidate, was 43% low, and nearly censored its headline cells. Phase 2's
   horizon comes from **Phase 1's selected form**, and from the most pessimistic
   of the three candidates, not the favoured one.
3. **A third refit presented as an answer.** The primary below is scored on a
   **fixed** exponent. No exponent is fitted and then reported as the finding.

## What is registered

### Phase 1 — in-range, and it sizes Phase 2

`phi ∈ {0.0028, 0.0057, 0.0080, 0.0160, 0.0320}`, all three ratios
(`theta/sigmaS` ∈ {2.00, 3.33, 5.00}), 10 seeds, horizon as 005 used. These
interleave 005's grid rather than repeat it, so Phase 1 and 005 together give a
10-point `phi` ladder per ratio.

Phase 1 fits the three candidates below and **selects one** by the pre-specified
criterion in "Pre-specified analysis". Its only other job is to produce the
horizon for Phase 2.

### Phase 2 — below anything ever run

- **Column A: `phi = 0.001`**, all three ratios, 10 seeds. Unconditional.
- **Column B: `phi = 0.0005`**, all three ratios, 10 seeds. **Conditional**, on a
  criterion fixed here in advance: it runs iff Phase 1's selected form predicts
  `t_sat(0.0005) <= 30000` generations at ratio 5.00, so that a horizon at
  2.5× the prediction fits the compute budget. If the criterion fails, Column B
  is **not** run, that is recorded as a registered deviation, and the primary is
  scored on Column A alone with the reduced power stated in the Result.
  - ⚠️ **AMENDED 2026-09-11, before any data existed**, while smoke-testing the
    runner: **the clause above names the wrong quantity.** What column B costs
    is not the selected form's point prediction; it is the horizon the runner
    actually sets, and the horizon rule in "Pre-specified analysis" takes 2.5×
    the **largest** of the three candidates, not the selected one. Those differ.
    On exact power-law data the mechanism's extrapolation to `phi = 0.0005`
    exceeds the selected power law's by about 1.5×, so the original clause could
    wave through a column costing far more than it read — and, in the other
    direction, cancel an affordable one because a contest among candidates
    happened to be won by the most convex of them. Neither direction is about
    affordability, which is the only thing this gate exists to decide.
    **The gate is therefore keyed on the horizon that will actually be spent:
    column B runs iff `horizonFor(0.0005)` at ratio 5.00 is ≤ 75000
    generations.** That is 2.5 × 30000 — the original clause's own stated
    rationale — so the compute this project agreed to spend is unchanged; only
    the quantity compared against it is corrected.
  - ⚠️ **What the amendment does NOT fix, recorded rather than hidden.** Any
    compute gate is anti-correlated with curvature, and curvature is exactly
    what makes column B worth running: the more the data curves, the larger
    every extrapolation to `phi = 0.0005`, and the likelier the column is
    cancelled — precisely when it is the only thing that could separate the
    mechanism from a still-drifting exponent. That tension is real and cannot be
    designed away, because deep `phi` genuinely does cost more. It is stated
    here so that a cancelled column B is read as an **affordability** outcome
    and never as a null result, and so that the Result is obliged to report the
    gate's inputs — the selected form, all three candidates' predictions, and
    the horizon — whichever way it falls.

**Why Column B is registered rather than deferred.** At `phi = 0.001` the
mechanism and the quadratic are nearly indistinguishable — predicted local
exponents 1.000 against 1.010 and 1.020 at ratios 3.33 and 5.00. **Column A can
kill the power law but cannot separate the mechanism from a still-drifting
exponent.** Only Column B does that. Registering it conditionally, with the
condition stated before any data, is the honest way to keep it in the design
without pretending the compute is free.

### The three candidates, frozen here

Each is fitted on Phase 1 ∪ 005 (the in-range cells only) and then **scored on
Phase 2's cells, which none of them saw**.

- **A — POWER LAW.** `log t = c + b·log phi`, `b` free. This is 005's own fit and
  the null this question exists to kill. Predicted local exponent below 0.002:
  **0.869 / 0.873 / 0.877**, constant, by construction.
- **B — MECHANISM.** `t = K / phi`, **exponent fixed at 1**, one free constant.
  Predicted local exponent below 0.002: **1.000**, at every ratio, on every
  interval.
- **C — QUADRATIC IN LOG-LOG.** `log t = q0 + q1·log phi + q2·(log phi)²`, the
  minimal "keeps drifting" alternative. Fitted on 005's five cells it gives
  `q2` = +0.0527 / +0.0362 / +0.0378, predicting local exponents of **1.068 /
  1.010 / 1.020** on `0.001→0.002` and **1.141 / 1.060 / 1.072** on
  `0.0005→0.001`.

### PRIMARY

**The local exponent converges to 1.** Measured on the deepest interval Phase 2
provides — `0.0005→0.001` if Column B runs, otherwise `0.001→0.002` — the local
exponent `a_local` lies in **[0.95, 1.05]** at all three ratios.

> **FALSIFIED IF** `a_local` lies outside [0.95, 1.05] at two or more of the three
> ratios — **in either direction**. Below 0.95 falsifies it (the exponent never
> reaches one; A or something flatter survives). Above 1.05 falsifies it equally
> (the exponent overshoots one and is still drifting; C survives). Both
> directions are named because this project's signature defect is a clause that
> covers only one of them.

### SECONDARY 1 — out-of-sample form selection

Of the three frozen candidates, **B has the smallest mean absolute relative
prediction error** on Phase 2's cells, at each of the three ratios independently.

> **FALSIFIED IF** any other candidate has a smaller mean absolute relative error
> than B at two or more of the three ratios.

### SECONDARY 2 — convergence, not coincidence

The local exponent **approaches** 1 monotonically from below: at each ratio, the
sequence of local exponents over the intervals `0.0113→0.0226`, `0.004→0.0113`,
`0.002→0.004`, `0.001→0.002` (and `0.0005→0.001` if Column B runs) is
non-decreasing, within one combined SEM per step.

> **FALSIFIED IF** the sequence decreases by more than one combined SEM at any
> step, at two or more ratios — which would mean the value near 1 at `phi=0.002`
> is a local feature rather than a limit.

### SECONDARY 3 — the mechanism's own internal claim

If the mechanism is why `a = 1`, then its intermediate quantity must behave too:
`max|s| / t` at saturation is **constant to within 15%** across Phase 2's cells
at each ratio.

> **FALSIFIED IF** the spread of `max|s| / t` exceeds 1.15× at two or more
> ratios. This can fail while the primary holds — that combination would mean
> `a = 1` is real and the derivation offered for it is wrong, which is a
> different and worse outcome for the mechanism than the primary failing.

## Pre-specified outcomes, per cell

Identical to 005: a cell is CONTROLLED, RUNAWAY (saturated), or EXTINCT, with
`t_sat` the first generation at which the saturation predicate fires.
`saturation_generation`, `max_abs_entry`, `mean_abs_s`, `copies_per_genome` and
`captures` are recorded per run, as 005 recorded them.

## Manipulation checks — the experiment is void if these fail

1. **The composed loop is the shipped model.** At `phi = 0` the runner's loop
   reproduces `sim/step.ts` exactly, at ≥3 configurations, as 003, 004 and 005
   each asserted.
2. **Reproduction of 005.** Re-running `phi = 0.002` and `phi = 0.0453` at 005's
   own seeds reproduces `../../experiments/005-delay-divergence.csv` **exactly**.
   Any difference voids the experiment and indicts the model freeze.
3. **No censoring.** Every Phase 2 cell saturates strictly inside its horizon at
   every seed. A censored cell is reported as censored and its `t_sat` is
   **excluded**, never treated as the horizon — with the count in the Result.
4. **Horizon provenance.** The horizon actually used for each Phase 2 cell is
   recorded per row, alongside which candidate produced it, so the claim "the
   horizon did not come from the model under test" is checkable from the CSV and
   not just from this document.
5. **Grid integrity.** No duplicated `(ratio, phi, seed)`; every registered cell
   present.

## Pre-specified analysis

- `a_local` between adjacent cells is `-Δlog(mean t_sat) / Δlog(phi)`, on cell
  means over 10 seeds, with its SEM propagated from the two cells' SEMs.
- Candidate fitting is ordinary least squares on `log t` against `log phi`, over
  **in-range cells only** (005's five plus Phase 1's five). Phase 2 cells are
  never used to fit anything they are then used to score.
- **Form selection** (which form sizes Phase 2's horizon) is by mean absolute
  relative error on a leave-one-out pass over the in-range cells, not by R² —
  005's whole finding is that R² between 0.993 and 0.9986 failed to distinguish a
  misspecified form from a right one.
  - **AMENDED 2026-09-11, before any data existed**, while implementing
    `experiments/006-forms.ts`: the clause above does not say how to break a
    tie, and ties are reachable. A quadratic fitted to exact power-law data
    recovers `q2 = 0` and reproduces it, so two candidates can both score zero.
    **Ties within 1e-9 go to the candidate spending fewer parameters**
    (mechanism 1, power law 2, quadratic 3). Recorded here rather than decided
    at analysis time, which is the whole point of the freeze.
- **Horizon for Phase 2** = 2.5 × the **largest** `t_sat` any of the three
  candidates predicts for that cell, not the selected one's. 005 used 1.75× its
  favoured candidate and realised 1.31×. Taking the max across candidates and
  raising the factor is the direct repair.
  - ⚠️ **RECORDED 2026-09-11, before any data existed: on 005's cells this rule
    does not bite.** Fitting the three candidates to 005's five in-range cells
    and extrapolating, the mechanism is already the largest at both Phase 2
    cells — 11055 against the power law's 8202 and the quadratic's 9977 at
    `phi = 0.001`, and 22110 against 14985 and 22009 at `phi = 0.0005`. So "2.5×
    the max" and "2.5× the mechanism" coincide here. The rule stays, because
    which candidate is largest cannot be known before Phase 1 runs and Phase 1
    may move it. But it must not be reported as having protected anything it did
    not: the runner records per row which candidate supplied the horizon, and
    the Result states whether the max was ever a candidate other than B.

## Mutation table — the runner is not committed until each is seen to fail

Each row is a deliberate defect introduced into the runner or analysis; the
check named must go red. A row that stays green means the check does not test
what it claims, and the runner is not committed until every row has been seen to
fail for its stated reason.

| # | mutation                                                     | must be caught by       |
| - | ------------------------------------------------------------ | ----------------------- |
| 1 | `phi` for one Phase 2 cell silently set to 0.002              | manipulation check 5    |
| 2 | horizon taken from candidate B rather than the max            | manipulation check 4    |
| 3 | a censored run's `t_sat` recorded as the horizon              | manipulation check 3    |
| 4 | `a_local` computed with the sign flipped                      | PRIMARY (reads ≈ −1)    |
| 5 | Phase 2 cells included in the candidate fits                  | analysis assertion      |
| 6 | one seed duplicated across two cells                          | manipulation check 5    |
| 7 | the falsification clause's upper bound removed                | this table's own review |
| 8 | column B's gate keyed on the selected form's prediction        | `tests/006-column-b-gate.test.ts` |
| 9 | column B cancelled at ratio 5.00 only, the other two left running | `tests/006-column-b-gate.test.ts` |

Rows 8 and 9 were **added 2026-09-11 with the amendment above, before any data
existed**, because the amendment changes the runner and an unchecked change to a
runner is exactly what this table exists to prevent. Row 9 is not a design
defect but an implementation one: the first runner cancelled column B only at
ratio 5.00, which is not what "Column B is **not** run" says.

## Scope, stated in advance

- **One model, one freeze.** Nothing here licenses a claim about transposable
  elements in any organism. `a = 1` would be a property of *this* model's
  saturation under *this* trap rule.
- **`a = 1` is asymptotic and the registration says so.** The mechanism does not
  claim `t·phi` is constant across the measured range, and it demonstrably is not
  — `t·phi` runs 9.44 → 14.55 at ratio 2.00 over 005's grid. The claim is about
  the limit, which is why the primary is scored on the deepest interval and not
  on a global fit.
- **Three ratios are not a sweep of `theta/sigmaS`.** They are the same three 004
  and 005 used, kept for comparability.
- **If Column B does not run**, the primary is scored on `0.001→0.002`, where B
  and C are nearly indistinguishable, and the Result must say that the mechanism
  was separated from the power law but **not** from a still-drifting exponent.
- **The derivation could be right about `a` and wrong about why.** Secondary 3
  exists to catch that, and it is reported whichever way the primary goes.

## Result

**Run 2026-09-11 → 2026-09-13**, on SCAR18 under jobd, both phases unsharded.

- **Phase 1:** job 3743 at `6a465db`, 2026-09-11 21:39 → 2026-09-12 08:11 EDT.
  It made 150 grid runs plus the 60 runs of check 2, in
  `../../experiments/006-phase1.csv` and `../../experiments/006-reproduction-control.csv`,
  committed at `1d8a4b6`.
- **Phase 2:** job 3757 at `ee489f5`, 2026-09-12 16:21 → 2026-09-13 20:12 EDT.
  It made 60 runs, in `../../experiments/006-phase2.csv`, committed at `268ad22`.

Every registered-runner number below was re-printed by
`npx tsx experiments/006-is-the-exponent-one.ts --analyse` on the committed CSVs on
2026-09-14. Numbers marked **off-runner** come from read-only scripts over the same
CSVs, and are marked because the runner does not produce them. **No figure has been
made.**

### Manipulation checks

- **1, composed loop = shipped model.** PASSED in both phases, on 60 configurations.
  The smallest surviving population was 4402 copies, so no comparison was vacuous.
- **2, reproduction of 005.** PASSED. All 60 of 005's cells reproduce exactly on both
  `t_sat` and state hash.
- **3, no censoring.** ⚠️ **3 of 60 Phase 2 runs are censored at their horizon, all
  in one cell.** How that is read is recorded below under the primary.
- **4, horizon provenance.** PASSED. Every Phase 2 row names the candidate that sized
  its horizon, and **every one is the mechanism.**
  - **The max rule did not bite.** "2.5× the largest candidate" and "2.5× the
    mechanism" were the same number throughout, as recorded pre-data. The max was
    never a candidate other than B.
- **5, grid integrity.** PASSED for Phase 1 in the runner.
  - ⚠️ **The runner does not apply check 5 to Phase 2.** Verified **off-runner** from
    the CSV: 60 rows, 60 distinct `(ratio, phi, seed)`, exactly the registered set
    (3 ratios × {0.001, 0.0005} × seeds 6001–6010).

### The column B gate, with the inputs the registration requires

At ratio 5.00 the selected form was the **quadratic**, with LOO MARE 2.02% against
3.68% for the power law and 10.87% for the mechanism. The quadratic was also the
selected form at 2.00 and 3.33.

The three candidates' predictions of `t_sat(0.0005)` were:

| candidate | `t_sat(0.0005)` |
| --- | --- |
| quadratic (selected) | 26148 |
| power law | 19873 |
| mechanism | 28005 |

The horizon is 2.5 × 28005 = **70013 ≤ 75000**, so **column B ran at all three
ratios.** The pre-amendment clause (selected form ≤ 30000) would also have run it, so
the amendment did not change the outcome.

### Per-cell outcomes, Phase 2

Means and SEMs are over **saturated runs only**.

| ratio | `phi` | horizon | saturated | extinct | censored | mean `t_sat` (SEM) | range |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.00 | 0.001 | 27153 | 10 | 0 | 0 | 9001 (3.70%) | 6636–10469 |
| 2.00 | 0.0005 | 54306 | 10 | 0 | 0 | 18338 (2.54%) | 16659–21355 |
| 3.33 | 0.001 | 30883 | 9 | **1** | 0 | 10044 (1.04%) | 9499–10484 |
| 3.33 | 0.0005 | 61766 | 8 | **2** | 0 | 21510 (2.22%) | 19851–23342 |
| 5.00 | 0.001 | 35007 | 10 | 0 | 0 | 11830 (1.69%) | 10512–12646 |
| 5.00 | 0.0005 | 70013 | 7 | 0 | **3** | 22972 (1.29%) | 21899–23903 |

**Extinction, the first in this project since 003.** 004, 005 and Phase 1 had none.

- All three extinct runs are at ratio 3.33:
  - seed 6001 at `phi = 0.001`, extinct at generation 9848;
  - seeds 6004 and 6005 at `phi = 0.0005`, extinct at generations 15576 and 13074.
- The two at `phi = 0.0005` went extinct before any seed in their cell had saturated
  (earliest saturation: 19851).
- Seed 6001 went extinct inside its cell's saturation range (9499–10484).
- Each collapsed from 460–730 copies per genome within 1000 generations of its last
  heartbeat. These are sudden losses, not a slow decline.
- EXTINCT is a registered outcome, and an extinct run has no `t_sat`.
- Excluding extinct runs conditions the cell mean on survival, because extinction
  competes with saturation. **Which way that biases the mean is not shown.**

**Censoring.** Seeds 6005, 6006 and 6008 at `phi = 0.0005`, ratio 5.00, ran the full
70013 generations.

- None of the three saturated or went extinct. They stopped CONTROLLED, at 494, 573
  and 573 copies per genome.
- Over the run, their heartbeats ranged between roughly 200 and 900 copies per genome.
- **The cell is bimodal.** Seven seeds saturated between 21899 and 23903. The other
  three were still controlled at 2.9× the cell's latest saturation, and nothing fell
  in between.

### Verdicts

| | as registered (censored runs excluded) | censored runs counted at their horizon |
| --- | --- | --- |
| PRIMARY | **HELD**, 2 of 3 | **FALSIFIED**, 2 of 3 |
| SECONDARY 1 | **FALSIFIED** | **FALSIFIED** |
| SECONDARY 2 | not computed by the runner; **off-runner: HELD** | HELD |
| SECONDARY 3 | **HELD** | unchanged, because it is defined at saturation only |

### PRIMARY — held by the registered procedure, NOT robust to censoring, and this Result does not claim `a = 1`

`a_local` on the deepest interval, `0.0005→0.001`, with SEM propagated:

| ratio | as registered | censored runs counted at their horizon |
| --- | --- | --- |
| 2.00 | 1.027 ± 0.065 — in | same; the cell has no censoring |
| 3.33 | **1.099 ± 0.035 — out, high** | same; the cell has no censoring |
| 5.00 | 0.9575 ± 0.031 — in | **1.648 ± 0.281 — out, high** |

**1. The verdict turns on one cell, and exclusion biases that cell toward holding, in
a known direction.**

- Any censored run that ever saturates does so after generation 70013.
- Excluding those runs lowers the mean at `phi = 0.0005`, and that lowers the
  exponent.
- Counting them at the horizon, the smallest value they could take, puts ratio 5.00 at
  1.648. **That falsifies the primary.**
- If those seeds ever saturate, the true value is higher still.
- The 0.281 SEM on the counted version comes from the bimodality, not from sampling
  noise.

**2. Even as registered, ratio 5.00 sits 0.0075 inside the band.**

- The rule is point-based, and the point is in.
- Its ±1 SEM interval reaches down to 0.927.

**3. The ratio that falls outside the band outright is also the only ratio with
extinctions.**

- At 3.33 the exponent is 1.4 SEM above the upper bound.
- Survivor conditioning may move that value in an unknown direction.

⚠️ **The reading of check 3 is a decision taken AFTER the data existed, and it is
marked as such.**

**The tension.** The registration pulls two ways:

- The section heading says the experiment "is void if these fail".
- Check 3 says every cell saturates inside its horizon.
- But check 3's own text also says a censored cell "is reported as censored and its
  `t_sat` is **excluded**".

The runner, committed pre-data at `26a3a12`, implements exclude-and-report.

**The decision.** On 2026-09-14, three readings were laid out: void; held; and held
but not robust. The project owner chose the third:

- the experiment is **not void**;
- the registered verdict (HELD) is reported as printed, beside the censored-at-horizon
  bound (FALSIFIED);
- the primary is recorded as **not robust to censoring**.

No number was changed to reach that reading.

### SECONDARY 1 — FALSIFIED at all three ratios, and the mechanism is WORST at all three

Mean absolute relative prediction error on Phase 2's cells:

| ratio | power law | mechanism | quadratic |
| --- | --- | --- | --- |
| 2.00 | 15.07% | 19.56% | **11.05%** |
| 3.33 | 15.04% | 18.92% | **7.13%** |
| 5.00 | 11.22% | 20.14% | **9.58%** |

The runner prints the per-ratio winner and no verdict word. FALSIFIED is read directly
off the clause, since another candidate beats B at all three ratios, not just two.

**Robust to censoring.** Ratios 2.00 and 3.33 have no censored runs, and the clause
already fires on those two alone.

**Every candidate misses in the same direction at every cell.** Nothing brackets the
data:

| candidate | error at each Phase 2 cell (off-runner) |
| --- | --- |
| power law | −8.3% to −21.8% (under-predicts) |
| mechanism | +14.9% to +23.0% (over-predicts) |
| quadratic | +5.3% to +14.1% (over-predicts) |

⚠️ **What this does and does not say about the exponent.**

- B as frozen is `t = K / phi`, with `K` fitted on in-range cells.
- In that range `t·phi` was still falling: 14.55 → 9.44 across 005's grid at ratio
  2.00.
- So B scores the frozen constant as well as the exponent, and **can fail this clause
  while the local exponent is 1.**
- That does not rescue it. Freezing `K` in-range was registered on purpose.

**Descriptive, post-hoc, not a verdict.** Past `phi = 0.002`, `t·phi` flattens:

| ratio | 0.002 | 0.001 | 0.0005 (censored runs excluded) |
| --- | --- | --- | --- |
| 2.00 | 9.44 | 9.00 | 9.17 |
| 3.33 | 10.69 | 10.04 | 10.76 |
| 5.00 | 12.20 | 11.83 | 11.49 |

### SECONDARY 2 — NOT IMPLEMENTED IN THE REGISTERED RUNNER; HOLDS off-runner

**Registered, never coded, and found only while writing this Result.** It was computed
**off-runner** from the committed CSVs, over the registered intervals.

The step SEM is `√(se_i² + se_j²)`. That ignores the covariance from the cell two
adjacent intervals share. The covariance is negative, so ignoring it **understates**
the step SEM, which makes a falsifying decrease easier to find, not harder.

| ratio | 0.0113→0.0226 | 0.004→0.0113 | 0.002→0.004 | 0.001→0.002 | 0.0005→0.001 | decreases > 1 SEM |
| --- | --- | --- | --- | --- | --- | --- |
| 2.00 | 0.865 ± 0.037 | 0.906 ± 0.019 | 0.967 ± 0.038 | 0.931 ± 0.064 | 1.027 ± 0.065 | none |
| 3.33 | 0.789 ± 0.038 | 0.910 ± 0.017 | 0.962 ± 0.030 | 0.910 ± 0.031 | 1.099 ± 0.035 | one: 0.052 against 0.043 |
| 5.00 | 0.865 ± 0.038 | 0.888 ± 0.018 | 0.974 ± 0.036 | 0.955 ± 0.040 | 0.958 ± 0.031 | none |

- Falsification needs a decrease at two or more ratios, and only one ratio has one,
  so the clause **holds**.
- It also holds with censored runs counted. Only ratio 5.00's last value moves, to
  1.648, which is an increase.
- ⚠️ **Non-decreasing within one SEM is not the same as converging to one.** At ratio
  5.00 the last three intervals read 0.974, 0.955 and 0.958. That is flat, not rising.
- Until this is implemented test-first in the runner, it carries less weight than the
  other three verdicts.

### SECONDARY 3 — HELD

The spread of `max|s| / t` is **1.084 / 1.060 / 1.072** at the three ratios, all
within 1.15.

- The runner takes the spread over individual saturated runs, not over cells as
  registered.
- A cell-level summary cannot fall outside its runs' range, whether it is a mean of
  ratios or a ratio of means. So the cell-level spread cannot be larger, and **the
  verdict holds on the registered statistic too.**

### What 006 establishes

> **006 does not show that the exponent is one.** The registered primary held 2 of 3.
> That verdict rests on excluding three runs whose exclusion biases it toward holding,
> and it flips when they are counted at their smallest possible value. What does
> stand:
>
> - The power law under-predicts every cell below the fitted range.
> - The mechanism, as frozen, predicts worst of the three candidates.
> - The quadratic predicts best and still misses every cell high.
> - At deep `phi` a regime appears that no earlier question saw: extinction at ratio
>   3.33, and a bimodal cell at 5.00 where three seeds were still controlled at nearly
>   3× the latest saturation.

### Scope, restated because the result invites over-reading

- **Whether the three controlled seeds at `phi = 0.0005`, ratio 5.00, ever saturate is
  not established.**
  - They are consistent with a floor at some seeds, and equally with a delay longer
    than 2.9× the cell's latest saturation. 006 cannot tell those apart.
  - This is 005's floor question, reopened below `phi = 0.002`.
  - ⚠️ **It must not be answered by extending those runs and re-scoring 006.** That
    would change a registered cell's method after seeing its result. It is a
    candidate for a separately registered question.
- **The direction of survivor bias from extinction is not shown.**
- **One model, one freeze.** As registered, nothing here is a claim about transposable
  elements in any organism.

### Post-data items, marked

1. **The reading of check 3**, decided by the owner on 2026-09-14 (above).
2. **Secondary 2 was computed off-runner.** The registered runner has no
   implementation.
3. **Check 5 for Phase 2 was verified off-runner.** The runner does not run it for
   Phase 2.
4. **Check 3's printed message is wrong about the extinct runs.** It reports all six
   non-saturated runs, the 3 extinct and the 3 censored, as runs that "did NOT
   saturate inside their horizon". That wording misdescribes the extinctions.
   - Both kinds are excluded from every `t_sat` statistic, which is correct for each
     (an extinct run has no `t_sat`).
   - The wording is not yet fixed, and the fix will change wording only, not numbers.

### Addendum, 2026-09-14 — items 2 and 4 above are resolved in the runner at `ba9ca86`

Appended rather than edited in, so the list above stays as it was written.

- **Item 2: Secondary 2 is now implemented in the runner, test-first, POST-DATA.**
  - The code is in `experiments/006-forms.ts`, with tests in
    `tests/006-secondary2.test.ts`. Nine mutations were each seen to fail their
    named test.
  - It scores only the registered intervals. Phase 1's interleaved cells are
    refused, and so is any missing registered cell.
  - On the committed CSVs, `--analyse` prints **SECONDARY 2: HELD (a decrease beyond
    one SEM at 1 of 3 ratios)**.
  - Every exponent, SEM and the one decrease match the off-runner table above
    exactly. The verdict above therefore now comes from the registered runner, and
    it was implemented after the data existed.
- **Item 4: check 3's message now reports censored, extinct and
  stopped-early-without-either as separate classes.** Tests are in
  `tests/006-check3.test.ts`.
  - The rows it returns are unchanged.
  - The rest of `--analyse`'s output is byte-identical before and after, so no
    number moved.
- **Item 3 is unchanged.** The runner still does not apply check 5 to Phase 2.
