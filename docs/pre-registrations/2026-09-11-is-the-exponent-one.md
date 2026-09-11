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
- **Horizon for Phase 2** = 2.5 × the **largest** `t_sat` any of the three
  candidates predicts for that cell, not the selected one's. 005 used 1.75× its
  favoured candidate and realised 1.31×. Taking the max across candidates and
  raising the factor is the direct repair.

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

_Not yet run. This registration is committed alone, before its runner exists._
