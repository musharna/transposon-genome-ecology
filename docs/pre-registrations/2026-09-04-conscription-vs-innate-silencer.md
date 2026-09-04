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

*(none yet — this section records changes made after this file is committed)*

## Result

*(not yet run)*
