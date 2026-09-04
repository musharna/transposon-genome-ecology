# Pre-registration — how fresh must the trap be?

**Registered:** 2026-09-04, before any runner existed.
**Model frozen at:** `12e7b08`, the same freeze questions 001 and 002 used.
`sim/` is byte-identical to that commit at time of writing (`git diff 12e7b08 HEAD
-- sim/` is empty) and is not touched by this experiment.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
§3.3 (why the sequence coordinate earns its place).
**Sited by:** registered question 002, `2026-09-04-conscription-vs-innate-silencer.md`,
whose primary prediction was falsified and whose Result names this question.
**Companion:** registered question 001, `2026-09-02-per-copy-vs-family-rate.md`.

## Question

002 asked whether a silencer rebuilt from the element (tracking) differs from one
fixed at the ancestral sequence (non-tracking). It found that at shallow traps
both arms persist, so the structural claim "non-tracking is useless or lethal"
is false — but that they persist in completely different ways: the tracking arm
sits at an equilibrium, the fixed arm runs away into the stopping rule.

Both arms are extremes. The shipped trap is rebuilt from the element **with
perfect fidelity** — the entry is the capturing copy's exact current coordinate.
The null arm has **zero** fidelity — the entry is the ancestral 0 regardless of
where the copy has gone. No real piRNA cluster is either. So:

> **How much fidelity does the trap need? Is the tracking advantage a threshold
> the trap falls off, or a gradient it degrades along — and where is the edge?**

## Why it is worth asking

Three reasons, in order of how much they change what the project can claim.

1. **002's answer is about the character of persistence, and character is a
   continuum question.** Its Result closes: "Tracking is what converts
   survival-by-runaway into survival-at-an-equilibrium. That is a claim about
   the CHARACTER of persistence, not about whether persistence happens, and it
   is 003's question." A two-point contrast cannot say whether that conversion
   is fragile or robust. A dial can.
2. **It is the first thing that makes the mechanic falsifiable as a mechanic
   rather than as a switch.** "The trap is made of you" is the README's
   most-likely-to-be-wrong claim and is ours, not Kofler 2019's
   (`../pathway-mechanics.md` §1). A switch tests whether the mechanic is on. A
   dial tests how much of it is load-bearing — and if control collapses at tiny
   infidelity, the mechanic is a knife-edge that no biological trap could sit on.
3. **The endpoints are already measured**, on committed data, which turns them
   into a positive control the runner can be held to exactly. See manipulation
   check 2.

---

## What 002 left, and why its pre-committed test is not worth running as registered

002 committed to "003, sited at that point, with the t-test that this
registration could not place", at `theta/sigmaS` ∈ {3.33, 5.00}. That commitment
is discharged here, but **it is not the primary**, and the reason is stated
before any new data exists.

Recomputed from `../../experiments/002-conscription-vs-innate.csv` (180 rows),
under the criterion 002's Result says 003 must adopt — **CONTROLLED** = alive at
the horizon **and** never saturated:

| `theta/sigmaS` | A CONTROLLED | A extinct | A runaway | B CONTROLLED | B extinct | B runaway |
|---|---|---|---|---|---|---|
| 3.33 | **10/10** | 0 | 0 | **0/10** | 0 | 10 |
| 5.00 | **20/20** | 0 | 0 | **0/20** | 0 | 20 |
| 6.67 | 18/20 | 2 | 0 | **0/20** | 12 | 8 |
| 7.50 | 5/10 | 5 | 0 | **0/10** | 7 | 3 |
| 10.00 | 0/20 | 20 | 0 | 0/20 | 20 | 0 |
| 13.33 | 0/10 | 10 | 0 | 0/10 | 10 | 0 |

**Arm B is CONTROLLED in 0 of all 90 runs, at every ratio 002 swept.** Arm A is
CONTROLLED in 53 of 90. At the two ratios 002 pre-committed 003 to, the contrast
is **30/30 against 0/30**. A two-sample test there is a foregone conclusion, and
registering a test whose answer the committed data already gives at complete
separation would be this project's signature defect — a check that cannot fail —
installed deliberately.

So the endpoints are run, on fresh seeds, and reported as a two-proportion test
to discharge the commitment. **The registered question is what happens between
them**, which nothing in the repo has measured.

---

## From two arms to one dial

### The phase

The arm switch becomes a single dimensionless knob **`phi` ∈ [0, 1]**, the
**infidelity** of the trap. On capture, the value entering the repertoire is

    entry = (1 - phi) * copy.s

- **`phi = 0`** — the entry is the copy's exact coordinate. This is the shipped
  `trap`, i.e. 002's arm A.
- **`phi = 1`** — the entry is the ancestral `0`. This is 002's arm B.
- **`0 < phi < 1`** — the trap is rebuilt from the element but pulled toward the
  ancestral sequence: it remembers *roughly* where the element was.

As in 002, `sim/` is **not modified**. The phase is composed in the experiment's
own module, in `sim/step.ts`'s order (`transpose → trap → domesticate → lose →
reproduce → generation++`) with phase 2 substituted, and the composed loop
running the shipped phase must reproduce `sim/step.ts`'s `stateHash`.

### The guard, carried forward from 002 unchanged

`sim/phases/trap.ts:42` skips a copy that `isSilenced`, under the comment
"already covered by an existing entry — capturing again would be a no-op". There
the inserted value **is** `copy.s`, so "already covered" and "already silenced"
coincide. Once the inserted value is something else, they do not, and 002 records
what that cost: the first arm-B draft inserted duplicate zeros forever — 11,045
entries per genome by generation 300 and 1.09 GB resident. The faithful guard
asks whether **the value about to be inserted** is already covered:

    valueCovered((1 - phi) * copy.s, genome, p)

It is semantically inert (`isSilenced` asks only whether *some* entry lies within
`theta`) and it bounds the repertoire. This registration carries it at every
`phi`.

### Why the endpoints are bit-exact, not merely similar

This is load-bearing for manipulation check 2, so the argument is given rather
than asserted.

At `phi = 0` the inserted value is `copy.s`, so `valueCovered(copy.s, genome, p)`
and `isSilenced(copy, genome, p)` are the same predicate on the same arguments —
`isSilenced` (`sim/silencing.ts:82-89`) differs only by returning `false` for a
domesticated copy, and `trap.ts:39` has already `continue`d on domesticated
before that test is reached. Every other line is unchanged, so the same copies
reach `world.rng.next()` in the same order and **the same draws are consumed**.
At `phi = 1` the inserted value is exactly `0`, which is 002's arm B including
its guard. Determinism doctrine applies: the number of RNG draws consumed in
order is part of reproducible state, and here it is identical at both endpoints.

### The analytic handle, and where it stops working

A copy at coordinate `s`, captured at infidelity `phi`, deposits an entry at
`(1 - phi)s`. That entry covers the capturing copy iff `phi*|s| <= theta`, so a
single capture's **reach from the ancestral sequence is `theta / phi`**. Since
`|s|` after `k` transposition events is about `sqrt(k) * sigmaS`, self-coverage
fails past

    k*_eff = (theta / (phi * sigmaS))^2 = k* / phi^2

which would make `phi` a pure rescaling of 002's escape-time axis — a relabelling
of the ratio, not a new axis.

**It almost certainly is not, and the reason is measured.** Arm A's silencing at
these ratios is not a copy covering itself; it is the **union** of a large
repertoire. From 002's committed CSV, arm A carries **142.7 entries per genome
at ratio 3.33 and 77.3 at ratio 5.00**, while arm B carries exactly **1.00** at
both. A union of ~100 windows is not described by one window's reach. Secondary
prediction 2 below tests the rescaling directly rather than assuming it fails.

### Scale invariance is preserved, and the grid is stated in the ratio

002 found that `theta` and `sigmaS` are one axis: `s`-space carries no other
constant, so rescaling `(s, sigmaS, theta)` by any λ maps trajectories onto
trajectories consuming the same draws in the same order. **`phi` is
dimensionless and multiplies `s`, so it is invariant under that rescaling too.**
The grid below is therefore stated in `theta/sigmaS`, not in `theta` and `sigmaS`
separately — the defect 002 recorded in its own design, fixed here rather than
repeated.

---

## What is registered

### The criterion, replacing 002's `VIABLE`

002's `VIABLE` — fewer than half the seeds extinct — could not tell a controlled
equilibrium from a runaway, and its Result names that as the thing 003 must fix.
The replacement is a **three-way, mutually exclusive and exhaustive** outcome
class per run:

- **EXTINCT** — `totalCopies == 0` at the horizon.
- **RUNAWAY** — the run hit the pre-specified saturation stop (below).
- **CONTROLLED** — neither: alive at generation 600, never saturated.

A cell's outcome is the **modal** class over its 10 seeds; ties are reported as
ties and are not resolved in favour of either neighbour.

> **Primary registered prediction.** At each registered ratio, the set of `phi`
> at which the cell is CONTROLLED is a **contiguous down-set from `phi = 0`**:
> control degrades monotonically as the trap gets staler and never returns.

**Falsified by re-entrant control** — any `phi` whose cell is CONTROLLED sitting
above a `phi` whose cell is not.

> **Secondary registered prediction 1 — the edge is inside the grid.** At each
> registered ratio there is a `phi` in `(0, 1)` whose cell is CONTROLLED and a
> larger `phi` whose cell is not.

**Falsified if** the cell at `phi = 0.875` is CONTROLLED at either registered
ratio — the collapse would then happen only at exact zero fidelity and the grid
could not resolve the edge. **No location is predicted.** Betting on a band I
chose is a failure mode this project has already caught once, and the honest
statement is that an interior edge exists, not where it sits.

> **Secondary registered prediction 2 — the dial is not a relabelling of the
> ratio.** The CONTROLLED/RUNAWAY boundary does **not** sit at a constant value
> of `(theta/sigmaS) / phi` across the swept ratios.

**Falsified if** the boundary's `(theta/sigmaS)/phi` agrees across all three
ratios to within one grid step. Power is limited with three ratios, which is
stated here rather than discovered afterwards.

### Grid, seeds, horizon

    theta/sigmaS ∈ {3.33, 5.00}        registered
    theta/sigmaS ∈ {2.00}              PRE-REGISTERED EXPLORATORY (see below)
    phi          ∈ {0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1}

The ratio is realised with `theta` pinned at **0.10** and `sigmaS` pinned at
**{0.05, 0.03, 0.02}** respectively. `sigmaS` is pinned rather than derived as
`theta / ratio`, because the labels 3.33 and 2.00 are rounded — `0.10 / 3.33` is
`0.03003`, not `0.03`, and deriving it would put the cell a hair off 002's grid
and silently break check 2. The exact ratios are `10/3`, `5`, and `2`; they are
written 3.33 and 5.00 throughout to match 002's tables. Ratios 3.33 and 5.00 are
therefore **exactly** 002's `(theta 0.10, sigmaS 0.03)` and `(theta 0.10, sigmaS
0.02)` cells, which is what makes manipulation check 2 possible.

3 ratios × 9 `phi` × **seeds 2001–2010** × 600 generations = **270 runs**, plus
the 40-run reproduction control of check 2. Seeds 2001–2010 are disjoint from
002's 1–10 and from its pilot's 1001–1006.

**The `phi` axis is swept closed, endpoints included.** 002's falsification lived
below the floor its pilot swept; the lesson is applied here by leaving no
unswept region on the registered axis rather than by writing about it.

**Ratio 2.00 is exploratory, and is labelled so in advance.** It sits below every
ratio 002 swept, so neither arm's behaviour there is known and the primary
prediction is **not** stated on it. Its results are reported and cannot be
promoted to confirmatory afterwards. Applying 002's lesson to the ratio axis
means actually sweeping below the floor; pre-registering the exploratory status
is what stops that from becoming a second bite at the primary claim.

Everything else pinned at 002's values, unchanged so the reproduction control is
exact:

    N = 300, S = 3000, c = 0.02, r0 = 0.2, rMax = 1, sigmaR = 0.05,
    v = 0.005, a = 0.0004, b = 0.00001, d = 0.0005, dTol = 0.002, t = 0,
    beta = 0.005, pDom = 0, wDom = 0.01, sexual = true, silencingOn = true

**Pre-specified stopping rule, carried from 002 unchanged.** A run whose
copies-per-genome exceeds 1500 (half of `S`) is stopped and recorded as RUNAWAY
with the generation at which it happened. It is unchanged precisely so that
check 2 can compare against 002's rows bit-for-bit.

## Pre-specified outcomes, per cell

1. **Outcome class** — the counts of EXTINCT / CONTROLLED / RUNAWAY over the 10
   seeds. **Primary**, since both the primary and first secondary predictions are
   stated on it.
2. **Horizon copies per genome.**
3. **Horizon silenced fraction** (`silencedCopies / totalCopies`, zero when
   extinct).

Also recorded, descriptive and NOT tested: repertoire entries per genome, the
maximum `|entry|`, the number of captures and their mean displacement
`|entry - copy.s|` (which manipulation check 3 is stated on), the generation of
any saturation stop, the generation of extinction, and the maximum number of
genomes holding a repertoire.

## Manipulation checks — the experiment is void if these fail

1. **The composed loop is the shipped model.** At `phi = 0`, the composed loop
   must reproduce `sim/step.ts`'s `stateHash` at every seed used, at a horizon
   short enough that no run has gone extinct. **Its positive control is reported
   with it, not separately:** the smallest surviving population at that horizon
   must be printed, so it is visible that no comparison was between two extinct
   worlds hashing identically. 002 ran this at 90 configurations with a smallest
   surviving population of 891 copies; a silent pass here is not acceptable
   evidence.
2. **The endpoints reproduce 002 exactly.** At `phi = 0` and `phi = 1`, at ratios
   3.33 and 5.00, on **seeds 1–10**, every recorded outcome must equal the
   corresponding row of `../../experiments/002-conscription-vs-innate.csv`
   exactly — outcome class, copies per genome, silenced fraction, entries per
   genome and stopping generation. This is what proves the dial's endpoints
   **are** 002's arms rather than resembling them, and it is a check that can
   fail loudly against data already committed to the repo.
3. **The dial moves the entry, in the stated direction.** Measured at the point
   of insertion, within a single run. Every capture records its **displacement**
   `|entry - copy.s|`, which is `phi * |copy.s|` by construction. Then in every
   run that formed a repertoire:
   - at `phi = 0`, mean displacement must be **exactly 0** and the maximum
     `|entry|` must exceed `1e-9` — the entry is the copy's own coordinate;
   - at `phi = 1`, the maximum `|entry|` must be **exactly 0** — every entry is
     the ancestral sequence;
   - at every `phi` in `(0, 1)`, mean displacement must be **> 0** (the cell is
     not silently arm A) **and** the maximum `|entry|` must exceed `1e-9` (the
     cell is not silently arm B).

   Both halves of the interior case are required: either alone passes on a dial
   stuck at one end.

   > **Amendment 1 — 2026-09-04, made before any data existed and before the
   > runner was written.** Check 3's second half first read: "the mean `|entry|`
   > must be strictly less than the mean `|entry|` of the `phi = 0` run at the
   > **same ratio and seed**". **That is a comparison between two different
   > worlds.** The instant two `phi` values disagree on one `valueCovered` test
   > they consume different numbers of RNG draws, and every later draw is
   > displaced — the two runs share a seed and nothing else. A run at
   > `phi = 0.5` whose element happened to wander three times as far as the
   > `phi = 0` run would have a larger mean `|entry|` despite the dial working
   > exactly as specified, and the check would void a sound experiment. A check
   > that can fail for a reason unrelated to what it tests is not a control. The
   > replacement measures the dial where the dial acts — at insertion, inside one
   > run — and cannot fail for that reason. Recorded here rather than in
   > "Deviations" because it was made **before any data existed**, which is the
   > only time a registration may be changed without the change being a
   > deviation.
4. **No cell manufactures a null by capturing nothing.** In every run of every
   cell, the number of genomes holding a repertoire must exceed zero at some
   point. Carried forward from 002 check 4: without it, a cell where nothing is
   ever captured is the silencing knockout wearing a dial's clothes.

## Pre-specified analysis

The primary and first secondary predictions are structural claims about a grid,
so they are reported as **counts with their denominators** — 10 seeds per cell —
and no p-value, following 002. Reporting a t-test over cell proportions would be
the "rank tables invite a comparison their CIs cannot support" failure.

- **Primary:** the CONTROLLED set at each registered ratio, printed as the
  ordered `phi` sequence of modal outcomes, with the down-set property stated as
  held or violated and the violating `phi` named if any.
- **Secondary 1:** the largest `phi` whose cell is CONTROLLED, per registered
  ratio, and whether it is below `0.875`.
- **Secondary 2:** the boundary `phi*` per ratio (the largest CONTROLLED `phi`),
  converted to `(theta/sigmaS)/phi*` and compared across the three ratios.
- **The discharged commitment:** `phi = 0` versus `phi = 1` at ratios 3.33 and
  5.00, on the fresh seeds, CONTROLLED proportion, two-proportion test
  (`prop.test`, two-sided, continuity-corrected), α = 0.05. Reported as
  confirmation of 002 out of sample, **designated non-primary in advance.**

Figure: one graph, R + ggplot2 sourcing `../analysis/theme.R`, no inline styling
— x = `phi`, y = fraction of seeds CONTROLLED, one line per ratio, the
exploratory ratio visually distinguished as exploratory.

## What would falsify the design decision, and what each answer buys

- **Control collapses at small `phi`** (the edge sits at 0.125 or 0.25): the
  tracking mechanic is a knife-edge. It works, but only at a fidelity no real
  piRNA cluster has, and spec §3.3's justification of the sequence coordinate
  would then rest on a property the biology does not supply. That is a finding
  against the model's ambitions and it gets written up as one.
- **Control survives to large `phi`**: tracking is robust, an approximate memory
  of where the element was is enough, and the mechanic is doing real work across
  a wide band rather than at a point. §3.3 is then stronger than it states.
- **Re-entrant or non-monotone control**: the primary is falsified and something
  is happening that neither the single-window reach argument nor 002's union
  reading predicts — which would be the most interesting outcome of the three.

## Scope, stated in advance

Three ratios at one base configuration, one horizon, ten seeds, nine points on
one dial. This cannot say where the fidelity edge sits for any parameterisation
other than this one, and with three ratios secondary prediction 2 is weakly
powered by construction.

It also inherits 002's unswept regions on the ratio axis: below 2.00, and
between the swept points. 002's falsification lived exactly in such a gap, so the
honest statement is that this registration narrows the gap by one point and does
not close it.

`phi` interpolates linearly toward the ancestral coordinate. That is one of many
ways a trap could be stale — a lag in generations, a decay of old entries, or a
noisy readout of `s` would each be different dials with possibly different edges.
This registers the linear-shrinkage dial because its endpoints are exactly the
two arms already measured, which is what buys the reproduction control; it does
not claim to be the general form of trap staleness.
