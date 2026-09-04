# Pre-registration — conscription versus an innate silencer

**Registered:** 2026-09-04, before any runner existed.
**Model frozen at:** `12e7b08`. `sim/` is not touched by this experiment.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
§3.3 (why the sequence coordinate earns its place).
**Companion:** registered question 001,
`2026-09-02-per-copy-vs-family-rate.md`.

## Question

Spec §3.3 justifies keying silencing on the sequence coordinate because one
mechanism yields three behaviours: families emerge as clusters in `s`-space, a
diverging sublineage escapes an established trap, and escape after suppression is
resurrection. **The first two of those survive if the silencer never tracks the
element.** A trap fixed at the ancestral sequence still produces clusters and
still gets escaped. What only a self-supplied trap can give is **re-capture**:
the trap, rebuilt from the element's own trapped copies, catching up with a
lineage that has already diverged.

> **Does a silencer rebuilt from the element (tracking) change invasion outcomes
> relative to one fixed at the ancestral sequence (non-tracking), holding capture
> rate and everything else fixed?**

## Why it is worth asking

"The trap is made of you" is this model's most distinctive mechanic and the one
the README flags as most likely to be wrong if taken from a summary. Kofler 2019,
the direct simulation of the trap model, does not have it in this form: there a
cluster insertion inactivates the WHOLE FAMILY, with no sequence window and
therefore no possibility of escape or of re-capture (`../pathway-mechanics.md`
§1). So the tracking property is ours, it is a step past the reference base, and
like §2's unit decision it should be made to pay for itself.

---

## The arms

`createWorld` founds **every** copy at `s = 0` exactly (`sim/state.ts`), and `s`
is a random walk along lineages, `s_daughter = s_parent + 𝒩(0, sigmaS)`
(`sim/phases/transpose.ts`). **The ancestral sequence is therefore exactly 0, and
the null arm needs no distribution to be chosen and no constant to be tuned.**
That is the whole reason this particular null is available.

- **A — conscription (shipped).** The repertoire entry is the capturing copy's
  current `s`. `sim/phases/trap.ts`, unmodified.
- **B — innate.** The repertoire entry is the ancestral `0`.

**Both arms insert on the SAME EVENT** — a non-domesticated copy occupying a
cluster site, past the same `(1 - t)` tolerance gate, evaluated in the same order
— so **capture rate is matched by construction**. Without that matching the null
arm is guard 2's silencing knockout wearing a disguise, and guard 2 already
answers that question.

**`sim/` is not modified.** The arm switch is composed in the experiment's own
module, in `sim/step.ts`'s phase order with phase 2 substituted. The positive
control is that the composed loop running the **shipped** `trap` reproduces
`sim/step.ts`'s `stateHash`; the pilot asserts it on every seed it uses and the
runner will assert it before recording anything. This is the pattern established
and validated in `../../scripts/explore-fossil-state.ts`.

### ⚠️ The first draft of arm B was not a faithful translation

Recorded because it changes what the arm means, not merely how fast it runs.
`trap.ts` skips a copy that is already silenced, under the comment "already
covered by an existing entry — capturing again would be a no-op". There, the
value inserted **is** `copy.s`, so "already covered" and "already silenced" are
the same test. In arm B the value inserted is `0`, so a copy that has diverged
past `theta` is **not silenced** and still inserts a duplicate zero. Measured at
`theta = 0.05`: **11,045 repertoire entries per genome by generation 300 and
1.09 GB resident, growing linearly**, which is what killed the first pilot.

The duplicates are semantically inert — `isSilenced` asks only whether *some*
entry lies within `theta` — so this was a pure translation error. The faithful
guard asks whether **the value about to be inserted** is already covered, which
bounds arm B's repertoire to one entry and changes no semantics. Arm B as
registered carries that guard.

---

## A pilot informed this registration, and killed the design it started as

Everything in this section was measured at `12e7b08` on **held-out seeds
1001–1006**, disjoint from the seeds the experiment will use. The registration
that follows is shaped by it, which is stated here rather than hidden.

### 1. The criterion I wrote first could not discriminate

The first regime criterion was "choose the grid point whose **pooled** horizon
silenced fraction is nearest 0.5", pooled across arms so the choice could not
favour either — 001's device. It was written specifically to exclude regimes
where the innate arm has stopped silencing altogether.

It scored `theta = 0.15` at **0.407**, from `(0.813 + 0.001) / 2`. One healthy
arm carrying a dead one. **Pooling made the criterion arm-blind; it did not make
it able to see the thing it was written to see.** Retired, and recorded because
"a check that cannot discriminate" is this project's signature defect and this is
an instance of it in the instrument rather than in the model.

### 2. Varying `theta` moves two things at once

`theta` sets both the escape threshold and the total silencing pressure. The
axis that isolates the mechanism is **escape time**: a lineage's `s` after `k`
transposition events is `𝒩(0, k·sigmaS²)`, so escape from a window of half-width
`theta` takes about

    k* = (theta / sigmaS)²

transposition events. `k*` is computed from the parameters alone, needs no
simulation, and therefore cannot be steered by either arm's behaviour.

### 3. The grid, and the wall it hit

Six held-out seeds, 600 generations, `N = 300, S = 3000, c = 0.02, r0 = 0.2,
rMax = 1, sigmaR = 0.05, v = 0.005, a = 0.0004, b = 0.00001, d = 0.0005, t = 0,
beta = 0.005, pDom = 0, sexual = true`.

| `theta` | `sigmaS` | `k*` | arm | copies/genome | silenced | extinct |
|---|---|---|---|---|---|---|
| 0.15 | 0.005 | 900 | A | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.005 | 900 | B | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.0075 | 400 | A | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.0075 | 400 | B | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.010 | 225 | A | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.010 | 225 | B | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.015 | 100 | A | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.015 | 100 | B | 0.00 | 0.000 | 6/6 |
| 0.15 | 0.020 | 56 | **A** | **78.19** | **0.813** | **1/6** |
| 0.15 | 0.020 | 56 | B | 373.55 | 0.001 | 5/6 |
| 0.30 | 0.020 | 225 | A | 0.00 | 0.000 | 6/6 |
| 0.30 | 0.020 | 225 | B | 0.00 | 0.000 | 6/6 |
| 0.60 | 0.020 | 900 | A | 0.00 | 0.000 | 6/6 |
| 0.60 | 0.020 | 900 | B | 0.00 | 0.000 | 6/6 |
| 1.00 | 0.020 | 2500 | A | 0.00 | 0.000 | 6/6 |
| 1.00 | 0.020 | 2500 | B | 0.00 | 0.000 | 6/6 |

Provenance of one cell: the `theta = 0.15, sigmaS = 0.020` **arm B** row was
killed under system memory pressure in the escape-time sweep and is taken from
the `theta` sweep, which is the SAME configuration (`sigmaS = 0.020` is that
sweep's base value) and whose arm A row reproduces the escape-time sweep's arm A
row exactly — `78.19 / 0.813 / 1 of 6`. Every other cell is as printed.

**There is no grid point at which both arms are alive.** The a priori criterion
(`k*` nearest 100) selects `sigmaS = 0.015`, where **everything is extinct** —
the precondition fails at the very point the criterion picks, which is why the
criterion is reported here and not used to site a t-test.

### 4. Why that is structural rather than a gap in the grid

> ⚠️ **THIS SECTION'S ARGUMENT DID NOT SURVIVE THE EXPERIMENT. It is left
> unedited because it is what was registered, but see "Result" below: both arms
> are viable at `theta/sigmaS` = 3.33 and 5.00, and the pilot grid this argument
> generalises from never went below `theta = 0.15`.**


The two failure modes are the two sides of one mechanism, and the mechanism is
already measured elsewhere in this repo:

- **When the element cannot escape** (`k*` large), the trap silences the whole
  family — and a fully silenced family dies. That is not a parameter accident:
  `../../scripts/explore-fossil-state.ts` established it is the **sexual path**,
  not excision and not selection (excision gated 0/10, all selection removed
  0/10, asexual 10/11 and flat). A copy that cannot transpose cannot restore its
  own frequency. Both arms die together, so they cannot differ.
- **When the element can escape** (`k*` small), the innate trap is fixed at a
  sequence the element has left, and does nothing — 0.1% silenced at the horizon.
  The element then proliferates unchecked and the *population* dies of copy-number
  load, 5/6.

So arm B can only be viable where nothing escapes, and where nothing escapes both
arms are extinct. **The comparison is not gradable, and that is the finding.**

---

## What is registered

Because the pilot shows the two-arm t-test has no regime to live in, what is
registered is the **structural claim**, tested on a grid, with a stated
falsification.

> **Registered prediction.** Over the grid below, there is **no grid point at
> which both arms are VIABLE.**

> ⚠️ **FALSIFIED — 3 of 9 points, 2 of 6 distinct regimes. See "Result".**

**VIABLE**, fixed here: fewer than half the seeds at that grid point are extinct
(`totalCopies == 0`) at the horizon.

**Secondary registered prediction.** At every grid point where **arm A is
viable**, arm B's mean horizon silenced fraction is **below 0.05** — the innate
trap has stopped working wherever the tracking one is doing anything.

### Grid, seeds, horizon

    theta  ∈ {0.10, 0.15, 0.20}
    sigmaS ∈ {0.015, 0.020, 0.030}

9 points x 2 arms x **seeds 1–10** x 600 generations = 180 runs. Seeds 1–10 are
disjoint from the pilot's 1001–1006.

Everything else pinned, at the pilot's values:

    N = 300, S = 3000, c = 0.02, r0 = 0.2, rMax = 1, sigmaR = 0.05,
    v = 0.005, a = 0.0004, b = 0.00001, d = 0.0005, dTol = 0.002, t = 0,
    beta = 0.005, pDom = 0, wDom = 0.01, sexual = true, silencingOn = true

**Pre-specified stopping rule.** A run whose copies-per-genome exceeds 1500 (half
of `S`) is stopped and recorded as `SATURATED`, with the generation at which it
happened. Saturation counts as NOT extinct for viability. This bounds cost and
memory — the first pilot was killed twice by runaway arm-B runs — and it is fixed
in advance so it cannot be adjusted after seeing results.

## Pre-specified outcomes, per grid point per arm

1. **Viability** — fraction of seeds extinct at the horizon. **Primary**, since
   the registered prediction is stated on it.
2. **Horizon silenced fraction** — `silencedCopies / totalCopies`, zero in
   extinct runs.
3. **Horizon copies per genome.**

Also recorded, descriptive and NOT tested: repertoire entries per genome, the
generation of any saturation stop, and the generation of extinction.

## Manipulation check — the experiment is void if this fails

1. The composed loop with the **shipped** `trap` must reproduce `sim/step.ts`'s
   `stateHash` at every seed used, at a horizon short enough that neither arm has
   gone extinct. Without this the arms are not the shipped model.
2. In **every** arm-A run that formed any repertoire, at least one entry must
   differ from 0 by more than `1e-9`.
3. In **every** arm-B run, **every** entry must be exactly 0.
4. In **every** run of both arms, the number of genomes holding a repertoire must
   exceed zero at some point in the run.

Check 4 is the one that stops a null being manufactured by nothing happening: if
no genome ever captures anything, both arms are the silencing knockout and the
comparison is empty. Checks 2 and 3 are the positive control for the arm switch
itself — the pilot confirms they separate (arm A entries `0.0267`, arm B `0`).

## Pre-specified analysis

The registered prediction is a statement about a grid, not a two-sample contrast,
so the analysis is the grid table plus two counts:

- the number of grid points at which both arms are viable (**predicted: 0**);
- among grid points where arm A is viable, the number at which arm B's mean
  silenced fraction is ≥ 0.05 (**predicted: 0**).

No p-values, because no test is being run: with 10 seeds per cell these are
proportions reported with their denominators. Reporting a t-test here would be
the "rank tables invite a comparison their CIs cannot support" failure.

Figure: one graph, R + ggplot2 from `../analysis/theme.R`, no inline styling.

## What would falsify the design decision

**A grid point at which both arms are viable falsifies the structural claim**, and
the two-arm comparison becomes gradable there — in which case the honest next step
is 003, sited at that point, with the t-test that this registration could not
place. **That result gets written up, not buried.**

If instead the prediction holds, the claim is: **in this model the tracking
property is not a refinement of silencing, it is what makes silencing survivable.**
A non-tracking trap is either useless or lethal. Spec §3.3's justification of the
sequence coordinate is then stronger than it states — the coordinate does not just
buy escape and resurrection, it is load-bearing for the element persisting at all.

**Scope, stated in advance.** A grid is not a proof. Nine points on two axes at one
base configuration, one horizon, ten seeds. It would not say that no regime
anywhere makes both arms viable; it would say that none does on this grid, and
that the mechanism forbidding it is the one already measured in
`../../scripts/explore-fossil-state.ts`.

## Deviations

**2026-09-04, after the runner was written and run.**

1. **The figure's x axis is `theta/sigmaS`, not `sigmaS` faceted by `theta`.**
   The registration specifies only "one graph, R + ggplot2 from the house theme".
   The axis changed because of deviation 2: plotting nine points on two axes
   would have drawn three pairs of exactly coincident curves without saying so.
2. **The analysis reports the grid twice — as registered on 9 points, and on the
   6 distinct regimes those 9 collapse to.** The registered counts are reported
   first and unchanged. See "the two axes are one axis" below.
3. **The arms are offset vertically by 0.012 in the figure only.** They coincide
   exactly at 0 and at 1, and an overplotted point would have hidden the finding.
   The printed and tabulated values are unmodified.

## Result

**Run 2026-09-04 at `12e7b08`'s model.** Runner
`../../experiments/002-conscription-vs-innate.ts`, data
`../../experiments/002-conscription-vs-innate.csv` (180 rows), analysis
`../analysis/plot-002.R`, figure `../analysis/fig-002-viability.png`.

### The manipulation checks passed, and check 1 was not vacuous

All four passed on all 180 runs. Check 1 ran at every grid point and every seed
— 90 configurations — and the composed loop reproduced `sim/step.ts`'s
`stateHash` at all of them. **Its own positive control is reported with it:** the
smallest surviving population at the control horizon was 891 copies, so no
comparison was between two extinct worlds hashing identically. Checks 2 and 3
separated the arms on every run (arm A always formed a non-ancestral entry; arm B
never did), and check 4 held everywhere — no run manufactured a null by capturing
nothing.

### ⚠️ THE PRIMARY REGISTERED PREDICTION IS FALSIFIED

> Registered: **no grid point at which both arms are VIABLE.** Predicted 0.

**Measured: 3 of the 9 registered grid points, which are 2 of the 6 distinct
regimes.** Both arms are viable at `theta/sigmaS` = 3.33 and 5.00.

| `theta/sigmaS` | `k*` | A viable | A silenced | B viable | B silenced |
|---|---|---|---|---|---|
| 3.33 | 11 | **yes** | 0.945 | **yes** | 0.019 |
| 5.00 | 25 | **yes** | 0.955 | **yes** | 0.022 |
| 6.67 | 44 | yes | 0.868 | no | 0.008 |
| 7.50 | 56 | no | 0.486 | no | 0.004 |
| 10.00 | 100 | no | 0.000 | no | 0.000 |
| 13.33 | 178 | no | 0.000 | no | 0.000 |

**The pilot's grid floor was `theta = 0.15`; the registered grid went down to
0.10, and that is where the falsification lives.** The pilot's "no grid point at
which both arms are alive" was true of the grid it swept and did not survive
being asked below it. Registering a grid wider than the pilot's is the only
reason this was found.

Per the registration's own terms, **that result is written up, not buried**, and
**003 is sited at `theta/sigmaS` ∈ {3.33, 5.00}** with the two-arm test this
registration could not place.

### The secondary prediction held

Arm A is viable at 5 of the 9 registered points. At **0** of them is arm B's mean
horizon silenced fraction ≥ 0.05 (predicted: 0). The highest is 0.022. Wherever
the tracking trap is doing anything at all, the fixed trap has stopped working.

### ⚠️ BUT `VIABLE` CANNOT DISCRIMINATE, AND THAT IS THIS PROJECT'S SIGNATURE DEFECT — HERE IN THE REGISTERED CRITERION ITSELF

`VIABLE` was fixed as "fewer than half the seeds extinct", a statement about the
ELEMENT persisting. At the two both-viable regimes the arms are in states about
as different as this model can produce:

| regime | arm | copies/genome | silenced | saturated |
|---|---|---|---|---|
| 3.33 | A | 262.6 | 0.945 | 0/10 |
| 3.33 | B | **1580.0** | **0.019** | **10/10** |
| 5.00 | A | 195.5 | 0.955 | 0/20 |
| 5.00 | B | **1593.3** | **0.022** | **20/20** |

**Every single arm-B run at both regimes hit the saturation stop.** Arm B is
"viable" there in exactly one sense: the element had not died by the time it ran
away to the 1500-copy ceiling. Arm A sits at a seventh of that copy number, 95%
silenced, and never saturates.

So the criterion counts "controlled at an equilibrium" and "exploding into the
stopping rule" as the same outcome. **This does not rescue the prediction** — the
prediction was stated on this criterion and is falsified on it. It does say what
003 has to fix: viability has to separate persistence from runaway, and the
saturation flag already in the CSV is the obvious instrument.

### The two axes are one axis

`s`-space carries **no constant other than `theta` and `sigmaS`**. `s` is
generated as `parent.s + 𝒩(0,1)·sigmaS` (`sim/phases/transpose.ts:37`), compared
only as `|copy.s − entry| <= theta` (`sim/silencing.ts:86-87`), and otherwise only
copied (`sim/phases/trap.ts:44`, `sim/phases/reproduce.ts:48`); `createWorld`
founds every copy at exactly 0. So rescaling `(s, sigmaS, theta)` by any λ maps
trajectories onto trajectories, consuming the same RNG draws in the same order —
every branch on `s` is either a `theta`-comparison (scale-covariant) or an
ordering (scale-invariant). Arm B is invariant too: its inserted value `0` is a
fixed point of the rescaling.

**Measured, not assumed.** The three pairs of grid points sharing a ratio are
identical on every one of their 10 seeds, in both arms, on all five recorded
outcomes — 6 pairs verified, exact equality, no tolerance. `plot-002.R` asserts
this and **carries a positive control asserted first**: two points at different
ratios must differ under the same comparison, so an equality test that could
never report a difference cannot pass silently.

**The registration built a 3×3 grid on two axes that are one.** Its own §2
derived `k* = (theta/sigmaS)²` and still treated `theta` and `sigmaS` as
independent. The effective grid is 6 points, not 9, and the registered count
"3 of 9" over-counts the regime at ratio 5.00, which appears twice.

### What this does to the claim

The registered claim — that in this model tracking is not a refinement of
silencing but what makes silencing survivable — **is not supported as stated.**
A non-tracking trap is not always useless-or-lethal: at shallow traps the element
survives without tracking. What the data do support is narrower and still worth
having: **wherever the fixed trap leaves the element alive, it does so by not
silencing it** (≤ 0.022 everywhere) **and every such run saturates.** Tracking is
what converts survival-by-runaway into survival-at-an-equilibrium. That is a
claim about the CHARACTER of persistence, not about whether persistence happens,
and it is 003's question.
