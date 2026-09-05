# Pre-registration — does the delay diverge, or is there a floor?

**Registered:** 2026-09-05, before any runner existed.
**Model frozen at:** `12e7b08`, the same freeze questions 001, 002, 003 and 004
used. `sim/` is byte-identical to that commit at time of writing — `git rev-parse
12e7b08:sim` and `git rev-parse HEAD:sim` are both
`b1e69c26a1856c9ab17963550f58e3082e8b05be` — and is not touched by this
experiment.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
§3.3 (why the sequence coordinate earns its place).
**Sited by:** registered question 004,
`2026-09-04-a-band-or-only-a-delay.md`, whose Result closes on a model it
labels POST-HOC and explicitly hands to this registration.
**Companions:** 001 `2026-09-02-per-copy-vs-family-rate.md`, 002
`2026-09-04-conscription-vs-innate-silencer.md`, 003
`2026-09-04-how-fresh-must-the-trap-be.md`.

## Question

004 answered "is there a band?" with: yes, and it is a delay. Its closing claim
is the strongest thing this project has said about its own central mechanic:

> Every `phi > 0` saturates; `phi` sets _when_, not _whether_. Only `phi = 0` is
> a genuine equilibrium, because only there is the reach infinite.

**That claim is an extrapolation.** It rests on `t_sat = C * phi^(-a)` fitted to
five `phi` values between 0.008 and 0.125, extended downward to assert that
`phi = 0.001` saturates near generation 5470. **No run in this project has ever
observed a saturation below `phi = 0.008`.** 004 ran `phi ∈ {0.001, 0.002,
0.004}` and every one of those 90 runs was still CONTROLLED when its horizon of
1800 generations ran out.

Two readings survive 004's data and nothing in it separates them:

- **Divergence.** `t_sat` grows without bound as `phi -> 0`, continuously. The
  controlled state exists at exactly one point of a continuous parameter and
  everywhere else the mechanic buys time. This is 004's stated position.
- **A floor.** Some `phi_c > 0` exists below which the element never saturates
  at all. Then the controlled band has non-zero width in `phi`, 003's escape
  hatch was real, and spec §3.3 survives in a weakened but non-trivial form.

Both readings predict exactly what 004 observed at `phi ∈ {0.001, 0.002,
0.004}`: CONTROLLED at 1800 generations. The power law predicts saturation at
1987 / 3297 / 5470 generations at ratio 2.00 — all beyond the horizon 004 ran.
**004's null result at small `phi` is consistent with both readings and
discriminates neither.**

**Does the element at small but non-zero `phi` saturate at all, and if it does,
does it do so when the published model says?**

## Why it is worth asking

The claim under test is already on the record, is load-bearing for how the whole
project reads, and was labelled post-hoc by its own author in the document that
made it. 004 wrote: _"This model is post-hoc and is not a result of this
registration. It was fitted to the data it explains. What it earns is a
registered successor, not a claim."_ This is that successor.

It also matters which way it comes out. If there is no floor above `phi =
0.002`, 004's headline hardens: the mechanic is a delay and spec §3.3's third
claim should be rewritten to say so. If there is a floor, 004's headline is
wrong in the direction that flatters the model, and the finding — a genuine
controlled band of non-zero width — is the more interesting result.

## What 004 established, carried forward as fact

From `../../experiments/004-fidelity-band.csv` (270 runs, all four manipulation
checks passed, 60 anchor runs reproducing 003's committed CSV exactly):

- CONTROLLED at `phi = 0.016` at 600 generations, 10/10 seeds, all three ratios;
  the edge falls to `0.004` by 1800 generations at every ratio.
- 150 of the 270 runs saturated, all of them at `phi >= 0.008`.
- `t_sat = C * phi^(-a)` fitted per ratio on the five saturating cells, cell
  means over 10 seeds, `lm(log(t_sat) ~ log(phi))`:

| ratio | `a`    | `C`    | R²     | SE(`a`) |
| ----- | ------ | ------ | ------ | ------- |
| 2.00  | 0.7304 | 35.226 | 0.9933 | 0.0346  |
| 3.33  | 0.7360 | 38.787 | 0.9949 | 0.0305  |
| 5.00  | 0.7447 | 43.535 | 0.9944 | 0.0321  |

**These six constants are frozen by this registration.** They are the numbers
005 predicts with. The analysis script must re-derive them from 004's committed
CSV by the recipe just stated and assert they equal these values, so that a
mistyped constant cannot silently redefine the prediction.

### ⚠️ Two things in 004's Result do not survive re-reading its own data

Both were found while writing this registration, before any 005 run existed.
Both are post-hoc re-analyses of 004 and are recorded here as corrections to
that document, **not** as results of this one.

**1. "The exponent is the same at all three ratios" was never measured.** The
observed spread is 0.0143 (0.7304 / 0.7360 / 0.7447, max deviation 0.0077 from
their mean). The standard error on each exponent is **0.032** — the spread is
less than _half of one standard error_. 004's sentence "the exponent is the same
at all three ratios; only the prefactor moves" describes an estimator that could
not have distinguished sameness from a 4% difference. It is not false; it is
unfalsifiable on that design.

Consequence for this registration, and this is the standing rule working
prospectively for the first time in this project: **005 does not register a
prediction about the exponent's ratio-dependence.** Registering one would set a
tolerance no smaller than the estimator's own resolution, which is the exact
defect 004's secondary 3 died of. Declining to register it is the fix.

**2. 004's secondary 3 was decidable on the data 004 already had, using a
different estimator.** Secondary 3 asked whether `ratio / phi_edge` agrees
across ratios within a factor of 2, scored on `phi_edge` — an edge located by
bracketing on a doubling grid, so its resolution _was_ a factor of 2. 004's
Result says so and reports the verdict as "not resolved by this grid".

What that Result does not say is that the underlying effect is not marginal at
all. `t_sat` is a continuous observable, measured with 10 seeds, and the
ratio effect in it is decisive in **every** cell of 004's grid:

| `phi` | `t_sat` @ 2.00 | `t_sat` @ 5.00 | ratio | z    |
| ----- | -------------- | -------------- | ----- | ---- |
| 0.008 | 1275.7 ± 25.8  | 1690.4 ± 24.7  | 1.325 | 11.6 |
| 0.016 | 700.9 ± 11.6   | 915.9 ± 14.3   | 1.307 | 11.7 |
| 0.032 | 411.8 ± 4.1    | 531.8 ± 14.1   | 1.291 | 8.2  |
| 0.064 | 248.1 ± 3.7    | 324.8 ± 8.7    | 1.309 | 8.1  |
| 0.125 | 173.8 ± 4.0    | 219.0 ± 5.6    | 1.260 | 6.6  |

The ratio-dependence of the edge is a monotone transform of this
(`spread_edge = spread_tsat^(1/a)`, 1.30^1.35 ≈ 1.43), so it was resolved at
z ≈ 7–12 all along. **The grid was never the limiting instrument. The
coarsening was.** Scoring a continuous measurement through a bracketed
threshold threw away roughly an order of magnitude of resolution.

The registered verdict on 004's secondary 3 stands as FALSIFIED, because that is
what its registered estimator returned and re-scoring a registered prediction
after seeing the data is exactly what pre-registration exists to prevent. What
changes is its _weight_: the verdict is uninformative about the model, and 004's
ROADMAP entry — "use a grid finer than a doubling" — prescribes the wrong
repair. **The repair is to score the continuous observable, not to refine the
grid.** This registration adopts that and never brackets an edge.

### ⚠️ And the fitted law is measurably the wrong functional form

Residuals of the 004 fit, as (observed / predicted − 1), against the standard
error of each cell mean:

| `phi` | ratio 2.00 | ratio 3.33 | ratio 5.00 | typical SEM |
| ----- | ---------- | ---------- | ---------- | ----------- |
| 0.008 | **+6.51%** | **+5.81%** | **+6.58%** | ±1.6%       |
| 0.016 | −2.92%     | −1.83%     | −3.24%     | ±1.5%       |
| 0.032 | −5.37%     | −8.17%     | −5.86%     | ±1.7%       |
| 0.064 | −5.41%     | −0.17%     | −3.66%     | ±2.0%       |
| 0.125 | **+8.04%** | **+5.02%** | **+6.93%** | ±2.2%       |

The sign pattern is `+ − − − +` at **all three ratios, identically**. Mean
|residual| is 5.03% against a mean SEM of 1.78% — **2.8× the noise floor**. This
is systematic curvature, not sampling scatter: the true relation is convex in
log-log and a two-parameter power law is an approximation to it.

That has a direction, and the direction is the whole point. At the low-`phi` end
of the fitted range the law **underpredicts** `t_sat` by 6–7%, at all three
ratios, at 3–5 SEM. If that curvature continues below the fitted range, the
downward extrapolation this registration tests will underpredict — and a floor
is the limiting case of exactly that curvature.

**So the registered primary is a prediction its author has specific reason to
expect may fail.** That is stated here, in advance, rather than discovered
afterwards.

## The two things this design must not repeat

Both are open ROADMAP items written because an earlier registration here
violated them. Discharged explicitly:

1. **A grid on `s`-space parameters must be stated in the ratio.** `theta` and
   `sigmaS` are one axis. This grid is stated as `theta/sigmaS` throughout;
   `phi` is dimensionless and invariant under the same rescaling.
2. **State the smallest effect the design can resolve BEFORE registering a
   prediction about an effect size, and if the prediction is smaller than the
   estimator's resolution, the design is wrong rather than the prediction
   falsified.** Applied above to decline the exponent prediction, and applied
   to every tolerance below, each of which is quoted against the measured
   noise floor it must beat.

A third rule — **check registered predictions are not reparameterisations of
each other** — gets its own section, because the honest answer here is that one
pair _is_ nested and saying so is the discharge.

## What is registered

### The criterion, carried from 002/003/004 unchanged

Three-way, mutually exclusive and exhaustive, per run, evaluated at a stated
generation:

- **EXTINCT** — `totalCopies == 0` at that generation.
- **RUNAWAY** — the run hit the saturation stop (copies per genome > 1500, half
  of `S`) at or before that generation.
- **CONTROLLED** — neither: alive at that generation, never saturated up to it.

`t_sat` is the generation at which the saturation stop fired. It is defined only
for RUNAWAY runs; for CONTROLLED and EXTINCT runs it is censored and recorded as
NA. A cell's `t_sat` is the **mean over its non-censored seeds**, and the count
of censored seeds is reported beside it always.

### The model under test, stated as a formula before any data

    t_sat(phi, ratio) = C_ratio * phi^(-a_ratio)

with `(a, C)` = (0.7304, 35.226) / (0.7360, 38.787) / (0.7447, 43.535) at ratios
2.00 / 3.33 / 5.00, frozen from 004 as above.

---

> **PRIMARY registered prediction — there is no floor above `phi = 0.002`.** At
> every registered ratio, all ten seeds at `phi = 0.002` are RUNAWAY by
> generation 8000.

**Falsified iff** at some registered ratio, at `phi = 0.002`, at least one
non-extinct seed is still CONTROLLED at generation 8000.

_This is binary and carries no tolerance to argue about. It is the literal
negation: the prediction is "all saturate", and the only way for it to be false
is that one does not. The one remaining direction — a run that is neither
RUNAWAY nor CONTROLLED because it went EXTINCT — is handled by the evaluability
precondition below and is reported, never scored as a falsification._

_Horizon 8000 is 1.80× the largest predicted `t_sat` at `phi = 0.002` (4454, at
ratio 5.00) and 2.43× the smallest (3298, at ratio 2.00). A floor at or above
`phi = 0.002` therefore shows up as censoring; so, indistinguishably, does a
finite `t_sat` beyond 8000. **The design cannot separate "a floor" from "a delay
longer than 2.4× the prediction", and does not claim to.** What it can do is
exclude both, which is what the prediction asserts._

> **SECONDARY 1 — the published law predicts _when_, not merely _whether_, below
> its fitted range.** At every registered ratio, at `phi ∈ {0.002, 0.004}`, the
> cell-mean `t_sat` lies within **±25%** of `C * phi^(-a)`.

**Falsified iff** at some registered ratio and some `phi ∈ {0.002, 0.004}` the
cell-mean `t_sat` lies outside `[0.75, 1.25] × C * phi^(-a)`, censored seeds
counting as "outside, above" _(a seed that never saturated cannot have finished
early)_.

_Tolerance justification, against the resolution rule: the noise floor is the
SEM of a cell mean, measured at 1.3–2.7% in 004; the fit's own worst
**in-sample** residual is 8.0%. ±25% is ~10 SEM and ~3× the worst in-sample
error. The design therefore resolves a systematic deviation of ≈8% at 3 SEM,
and the band is set deliberately looser than that so ordinary extrapolation
slop is not read as a floor. It is nonetheless a band the observed curvature
could plausibly consume: the in-sample residual moves 11.9 percentage points
across one factor-4 step in `phi` (+6.51% at 0.008 to −5.37% at 0.032, ratio
2.00), and `phi = 0.002` is one factor-4 step below the fitted range, so a
continuation of that curvature lands near **+18%** — inside the band, but with
only 7 points to spare._

> **SECONDARY 2 — the law interpolates.** At every registered ratio, at
> `phi ∈ {0.0113, 0.0226, 0.0453}` — three points inside the fitted range that
> no experiment in this repository has ever run — the cell-mean `t_sat` lies
> within **±10%** of `C * phi^(-a)`.

**Falsified iff** at some registered ratio and some such `phi` the cell-mean
lies outside `[0.90, 1.10] × C * phi^(-a)`, censored seeds counting as "outside,
above".

_Tighter than secondary 1 because interpolation is a weaker demand than
extrapolation, and because the worst in-sample residual the fit already
tolerates is 8.0%. ±10% is ~5 SEM. This is the least risky of the three
predictions and is labelled so here rather than discovered afterwards._

> **SECONDARY 3 — the curvature continues, and it points up.** At every
> registered ratio, the mean log-residual `log(t_sat_obs) − log(t_sat_pred)`
> over `phi ∈ {0.002, 0.004}` is **positive**, and **greater** than the
> log-residual at `phi = 0.0226`.

**Falsified iff** at some registered ratio either the mean low-`phi`
log-residual is ≤ 0, or it is ≤ the log-residual at `phi = 0.0226`. _(Both
conjuncts are stated so that the two ways the prediction can fail — no upward
bias, or an upward bias no larger than mid-range — are each covered. Censored
seeds make the low-`phi` residual a lower bound, which can only support the
prediction; a cell with any censored seed is therefore scored as holding only if
it holds on the non-censored seeds alone, and this is stated so a censoring
artefact cannot manufacture a confirmation.)_

_Motivated by 004's in-sample residual pattern, which is post-hoc; tested on
data that does not exist. The effect size is the 6–7% low-end residual against a
~2.5% log-SEM, so z ≈ 2.5 per cell and ≈ 6 pooled over the six low-`phi` cells.
Resolvable._

### ⚠️ How these four predictions depend on each other

Registered here rather than left for a reader to notice, because 004 registered
four predictions that carried three bits and did not say so.

- **SECONDARY 1 implies the PRIMARY at `phi = 0.002`.** A cell mean within +25%
  of a prediction below 4454 has saturated well before 8000. So the pair carries
  two bits **only in the case where the primary holds and secondary 1 fails** —
  everything saturates, but not when the law says. If both hold, that is one
  finding reported twice, and the Result must say so.
- **SECONDARY 2 is nearly independent of both.** A floor, or any strong
  low-`phi` curvature, leaves interpolation inside the fitted range untouched:
  the signature of the interesting outcome is _secondary 2 holds while secondary
  1 fails_. That combination is why secondary 2 is registered despite being the
  safest prediction — it is the control that tells a real low-`phi` breakdown
  apart from a fit that was simply never any good.
- **SECONDARY 3 overlaps secondary 2 at one cell.** Its comparison baseline is
  the residual at `phi = 0.0226`, which secondary 2 also scores. If secondary 2
  holds tightly there, secondary 3 reduces to "the low-`phi` residual is
  positive". It remains distinct from secondary 1, which scores magnitude and
  not sign: residuals of +15% (secondary 1 holds, secondary 3 holds) and +40%
  (secondary 1 fails, secondary 3 holds) and −30% (both fail) are all reachable.
- **The exponent's ratio-dependence is NOT registered**, for the resolution
  reason given above. It will be reported descriptively, with its standard
  error, and no verdict attached.

### ⚠️ Evaluability precondition, registered before any data existed

004 had zero EXTINCT runs anywhere in 270. That is not a guarantee.

If a cell contains any EXTINCT seed, the extinct seeds are excluded from the
cell mean, the count is reported beside every number derived from that cell, and
**a cell with more than three extinct seeds is NOT EVALUABLE** for secondaries 1
and 2 — reported as such, never as falsified. Extinction never falsifies the
primary: an element that died did not demonstrate a floor.

Separately: the analysis must not silently treat a censored `t_sat` as missing.
Every prediction above states what censoring does to it, and the analysis script
must carry a positive control asserting that an injected censored seed changes
the verdict it is supposed to change.

### Grid, seeds, horizons

    theta/sigmaS ∈ {2.00, 3.33, 5.00}                      all registered
    phi          ∈ {0.002, 0.004, 0.0113, 0.0226, 0.0453}

`phi` is chosen, not swept. The two low points are the only values below the
fitted range at which 004 established the run is still alive at 1800
generations, so the extrapolation is tested where the answer is genuinely open.
The three upper points are the **geometric midpoints of 004's doubling grid**
(√(0.008·0.016) = 0.0113, √(0.016·0.032) = 0.0226, √(0.032·0.064) = 0.0453) and
are therefore maximally distant, in log-`phi`, from every point the law was
fitted to.

**None of the five has ever been run at any ratio in this repository**, checked
against every CSV in `../../experiments/`: 003 ran `phi ∈ {0, 0.125, 0.25,
0.375, 0.5, 0.625, 0.75, 0.875, 1}`, 004 ran `phi ∈ {0, 0.001, 0.002, 0.004,
0.008, 0.016, 0.032, 0.064, 0.125}`, and 001/002 have no `phi` column. `0.002`
and `0.004` appear in 004's grid, but **only as CONTROLLED runs at horizon 1800
that produced no `t_sat`** — the observable this registration predicts has never
been measured at any `phi` below 0.008, which is the entire reason for the
question.

The ratio is realised with `theta` pinned at **0.10** and `sigmaS` pinned at
**{0.05, 0.03, 0.02}**, not derived as `theta / ratio`, for the reason 003 and
004 both record: `0.10 / 3.33` is `0.03003` and deriving it would put the cell a
hair off the grid the reproduction control compares against. Exact ratios are
`2`, `10/3`, `5`.

Horizon is **per `phi`**, set by a formula stated here so no discretion enters
later: the smallest multiple of 500, floor 1000, that is at least **1.75×** the
largest predicted `t_sat` at that `phi` across the three ratios.

| `phi`  | predicted `t_sat` (2.00 / 3.33 / 5.00) | horizon  | headroom   |
| ------ | -------------------------------------- | -------- | ---------- |
| 0.002  | 3298 / 3760 / 4454                     | **8000** | 1.80–2.43× |
| 0.004  | 1988 / 2257 / 2658                     | **5000** | 1.88–2.52× |
| 0.0113 | 931 / 1051 / 1227                      | **2500** | 2.04–2.69× |
| 0.0226 | 561 / 631 / 732                        | **1500** | 2.05–2.67× |
| 0.0453 | 338 / 378 / 436                        | **1000** | 2.29–2.96× |

_The headroom is what makes the "too late" direction of secondary 1
observable rather than merely censored. At ≥1.75× the prediction, an overshoot
anywhere inside the ±25% band is measured as a number; overshoot up to +80% is
still measured; beyond that the run is censored and reported as "outside,
above" without a value. **The design quantifies lateness up to roughly +80% and
merely detects it beyond.** Said here so the Result cannot present a censored
cell as if it carried a magnitude._

- **Grid:** 3 ratios × 5 `phi` × **seeds 4001–4010** × the horizon table =
  **150 runs**. Seeds 4001–4010 are disjoint from 004's 3001–3010, 003's
  2001–2010, 002's 1–10 and the 002 pilot's 1001–1006.
- **Reproduction control:** 3 ratios × `phi ∈ {0.002, 0.004}` × **seeds
  3001–3010** × horizon **1800** = **60 runs**, existing only to be compared
  against 004's committed rows.
- **Horizon-extension control:** 3 ratios × `phi = 0.002` × **seed 3001** ×
  horizon **8000** = **3 runs**, whose generation-600 and generation-1800
  snapshots must equal 004's committed rows.

Everything else pinned at 002's, 003's and 004's values, unchanged so the
reproduction control is exact:

    N = 300, S = 3000, c = 0.02, r0 = 0.2, rMax = 1, sigmaR = 0.05,
    v = 0.005, a = 0.0004, b = 0.00001, d = 0.0005, dTol = 0.002, t = 0,
    beta = 0.005, pDom = 0, wDom = 0.01, sexual = true, silencingOn = true

### Cost, stated in advance

Measured before registering, on a probe that ran only 004-published cells to
horizons 004 had already published, so it produced no information this
registration could have been tuned on: **0.45–0.81 µs per copy-generation**
(`_scratch/`, not committed). The cost is **not** flat: it rises with repertoire
size, so it is highest exactly where this experiment spends most of its time —
0.735 µs at `phi = 0.002` and 0.814 µs at `phi = 0.004`, both ratio 2.00, both
measured to generation 1800. The budget below uses **0.74 µs** and is therefore
an estimate that can run ~10% long at the low-`phi` cells.

| arm                       | runs    | estimated hours |
| ------------------------- | ------- | --------------- |
| grid                      | 150     | ~13.3           |
| reproduction control      | 60      | ~2.0            |
| horizon-extension control | 3       | ~0.6            |
| **total, single process** | **213** | **~16**         |

This is registered because 004 discovered its 5-hour cost at run time. The
runner **may** shard by ratio across three processes (~6 hours wall), and if it
does, **the sharded output must be byte-identical to the unsharded output** —
every run is a pure function of `(phi, ratio, seed, horizon)` and nothing in the
loop reads another run's state. That invariance is asserted, not assumed:
manipulation check 5.

The job runs detached under `systemd-run --user --unit`, never `nohup &`.

## Pre-specified outcomes, per cell

1. **`t_sat`, mean over non-censored seeds, with the censored count.**
   Primary observable for all four predictions.
2. Outcome class counts (EXTINCT / CONTROLLED / RUNAWAY) at the cell's horizon.
3. `t_sat` standard deviation and standard error across seeds — required,
   because every tolerance above is quoted against it.
4. Copies per genome and silenced fraction, at generation 600 and at the stop.

Also recorded, descriptive and NOT tested: repertoire entries per genome, the
maximum `|entry|`, captures and their mean displacement `|entry − copy.s|`,
extinction generation, the maximum number of genomes holding a repertoire, and
the per-ratio refitted exponent with its standard error.

## Manipulation checks — the experiment is void if these fail

1. **The composed loop is the shipped model.** At `phi = 0` the composed loop
   must reproduce `sim/step.ts`'s `stateHash` at every registered seed, at a
   horizon short enough that no run has gone extinct. **Its positive control is
   reported with it:** the smallest surviving population at that horizon is
   printed, so it is visible that no comparison was between two extinct worlds
   hashing identically. Carried from 002, 003 and 004 unchanged.

2. **The anchors reproduce 004 exactly.** At `phi ∈ {0.002, 0.004}`, all three
   ratios, seeds 3001–3010, horizon 1800, the generation-600 **and**
   generation-1800 records must equal the corresponding row of
   `../../experiments/004-fidelity-band.csv` exactly on outcome class, copies
   per genome, silenced fraction, entries per genome, stopping generation,
   extinct, saturated, whether a non-zero entry was ever written, and
   `stateHash`. 60 comparisons, each on both records.

   **The oracle's horizon is asserted before the comparison.** 004's check 2
   compared against 003 at a horizon that happened to match; the guard that
   caught it is carried here, in the form 004 shipped: the runner reads 004's
   CSV, computes the maximum **`stopped_at`**, and aborts unless it is 1800 —
   the horizon this check is written against. `stopped_at` rather than the
   `horizon` column because it is evidence that at least one run was actually
   allowed to reach 1800, where the column is only a claim that it was.

3. **Horizon extension is inert.** The three horizon-8000 runs at `phi = 0.002`,
   seed 3001, must produce generation-600 and generation-1800 snapshots
   identical to the horizon-1800 runs' — which are themselves pinned to 004's
   committed rows by check 2. This is strictly stronger than 004's check 3a,
   which compared two runs of this experiment against each other; here the
   comparison lands on **committed data from a different experiment**.

   ⚠️ The check is able to fail only because the checkpoint branch is guarded by
   `horizon > CHECKPOINT`. Without that guard the 1800-run would also take a
   checkpoint at 1800, both sides would execute the same branch, and any side
   effect of taking one would cancel — the check would pass on exactly the bug
   it exists to detect. 004 shipped this guard after finding the defect; it is
   carried, and the mutant that removes it is in the mutation table below.

4. **The dial is real, and the world uses it.** Two halves, both required:
   (a) the capture probe's mean displacement `mean|entry − copy.s|` equals
   `phi * mean|copy.s|` — the two quantities it records over the same captures —
   to within 1e-9 at every registered `phi`; and (b) at the
   smallest registered `phi` the run is **not** bit-identical to the same seed
   at `phi = 0`. Half (b) exists because 004 found a mutant in which the world
   silently used `copy.s` while the probe reported the correct displacement, and
   **every probe-based check passed on it**.

5. **Sharding is inert.** If the runner shards, one cell from each shard is
   re-run in a single process and its row must be byte-identical. If the runner
   does not shard, this check is reported as NOT RUN rather than passed — a
   check that reports "passed" when it did not execute is the defect this
   project has met more than twenty times.

6. **The frozen constants are the fitted constants.** The runner re-derives
   `(a, C)` from 004's committed CSV by the registered recipe and aborts unless
   all six agree with the values in this document to 1e-3. This is not a
   scientific check; it is the guard that stops a typo from redefining the
   prediction after the fact.

## Pre-specified analysis

`docs/analysis/plot-005.R`, committed **with the runner and before any data
exists**, sourcing the project's single house theme `docs/analysis/theme.R`. No
inline styling; R and ggplot2 only.

- One figure per graph. The main figure is `t_sat` against `phi`, log-log, three
  ratios, with the frozen power law drawn as a line and the ±25% / ±10% bands
  drawn as the registered tolerances they are.
- A second figure is the residual plot — `log(obs) − log(pred)` against `phi` —
  because secondary 3 is a statement about it and a prediction whose figure does
  not show its own observable is not being reported.
- **Every verdict is recounted from the raw CSV**, not re-derived from an
  intermediate frame. 004's analysis had three of four verdict guards re-running
  the same expression on the same object, demonstrated by a reviewer injecting a
  wrong cell class and watching the script finish green with a different answer.
- **Every predicate carries a positive control asserted first**, and each
  control must be seen to fail against an injected violation before the analysis
  is committed. Tautological guards — `grepl(v, sprintf("...v..."))`,
  `nrow(df) == length(df$col)`, `v %in% c("HELD","FALSIFIED")` — are the
  specific shapes this project has shipped before and are forbidden.
- **A build-time guard against silently censored layers.** `ggplot_build` is run
  on every saved plot and the analysis aborts if any layer's data contains an
  `NA` position that was finite before scale limits were applied. 004 shipped a
  "fix" that never rendered, under a comment asserting it worked.
- ⚠️ **The class rule, from 004's ROADMAP entry:** no mark may sit at a level
  the data does not measure. When a defect of that kind is found, the class is
  stated and every geom that can produce it is grepped — not the one that did.

## Mutation table — the runner is not committed until each is seen to fail

Registered in advance so the harness cannot be written to the mutants it finds:

| mutation                                                        | must be caught by              |
| --------------------------------------------------------------- | ------------------------------ |
| dial applies `phi + 1e-9`                                       | check 1                        |
| dial applies half of `phi`                                      | check 4a                       |
| world uses `copy.s` while the probe reports the displaced value | check 4b                       |
| checkpoint branch loses its `horizon > CHECKPOINT` guard        | check 3                        |
| 004 oracle read at the wrong horizon                            | check 2's oracle-horizon guard |
| saturation ceiling moved from 1500 to 1400                      | check 2                        |
| a frozen constant mistyped                                      | check 6                        |
| shard boundary changes a row                                    | check 5                        |

## Scope, stated in advance

- **One model, one freeze.** Every statement is about the model at `12e7b08`.
- **Three ratios, five `phi`, ten seeds.** Nothing is claimed about `phi` below
  0.002 — the region where 004's `phi = 0.001` cell lives is deliberately not
  registered, because at ratio 5.00 it would need a horizon near 13000 and the
  cost was not defensible. **A floor below `phi = 0.002` is therefore untested
  by this design and remains live whatever the result.** This is the honest
  boundary of the primary and the Result must repeat it.
- **The primary cannot distinguish a floor from a delay longer than 2.4× the
  prediction.** It can exclude both.
- Nothing here is claimed about biology. `phi` is a dial in a toy; whether real
  piRNA clusters track element sequence at any fidelity is not addressed by any
  run in this registration.

## Deviations

None yet. Any change after this commit is appended here with its date and
reason, and any change made after data exists is marked as such.
