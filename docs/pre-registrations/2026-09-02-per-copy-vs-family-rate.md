# Pre-registration — per-copy versus family-level rate heritability

**Registered:** 2026-09-03, before any runner existed. The filename carries the
planning date (2026-09-02); the registration was written and committed on 09-03.
**Model frozen at:** `b7ec9c2`. `sim/` is not touched by this experiment.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
(§2 unit decision, §8 this question).

## Question

Does per-copy rate heritability change invasion outcomes relative to family-level
rate, holding everything else fixed?

## Why it is worth asking

Every simulation in `../REFERENCES.md` models transposition rate at the family
level — Kofler 2019 and 2020, Bourgeois et al. 2020, Tomar et al. 2023. This model
places it on the copy. If the two agree, the literature's abstraction is
vindicated and this model is a more expensive way to get the same answer. If they
disagree, the abstraction is hiding something. Spec §2 records per-copy rate as
the design's one step past the literature and names this question as the way that
risk gets paid for.

---

## A pilot informed this registration

**This registration is pilot-informed, and that is stated here rather than
hidden.** A registration whose outcomes cannot vary is not a stronger claim than
one informed by a pilot; it is a weaker one. Everything below was measured at
`b7ec9c2` before the runner existed; the "Deviations" section at the bottom
covers changes made *after* this file is committed.

### 1. The regime this experiment was first drafted against is degenerate

The first draft used Guard 2's invasion arm unchanged (`tests/guards/three-phases-arm.ts`:
`N=300, S=3000, c=0.02, r0=0.2, sigmaS=0.005, theta=0.15, v=0.005, a=0.0004,
b=0.00001, pDom=0, t=0`) with final copy number, extinction rate and time to
inactivation as the three outcomes. Run at that arm, 600 generations, seeds 1–6,
both arms — **12 runs of 12 went extinct.**

| arm | seed | final copies/genome | extinct | time to inactivation |
| --- | --- | --- | --- | --- |
| per-copy | 1 | 0.00 | 1 | 27 |
| family-level | 1 | 0.00 | 1 | 30 |
| per-copy | 2 | 0.00 | 1 | 33 |
| family-level | 2 | 0.00 | 1 | 33 |
| per-copy | 3 | 0.00 | 1 | 31 |
| family-level | 3 | 0.00 | 1 | 26 |
| per-copy | 4 | 0.00 | 1 | 27 |
| family-level | 4 | 0.00 | 1 | 28 |
| per-copy | 5 | 0.00 | 1 | 28 |
| family-level | 5 | 0.00 | 1 | 32 |
| per-copy | 6 | 0.00 | 1 | 29 |
| family-level | 6 | 0.00 | 1 | 26 |

Final copy number is 0 versus 0. Extinction rate is 100% versus 100%. Two of the
three outcomes cannot vary, so two of the three tests are arithmetic on constants.
A near-null there would have been produced **by universal extinction, not by the
model's response to rate heritability** — and the falsification clause below would
have fired on it.

### 2. The structural tension, faced rather than tuned around

Task 13 established a property of this model and
`tests/guards/three-phases-arm.ts` states it canonically: **full inactivation
implies the family eventually dies.** `sim/phases/lifecycle.ts`'s `lose` exempts
only domesticated copies from excision, so silenced copies keep being lost at rate
`v` while silencing prevents them replacing themselves.

Therefore **time to inactivation requires inactivation, while extinction rate and
any surviving-copy-number outcome require survival.** They cannot all be
informative at one horizon in a regime that sits wholly on one side of that line.
Picking a regime where nothing dies is not a fix: 0% versus 0% extinction is
exactly as uninformative as 100% versus 100%.

Two consequences, both adopted:

- **The outcome that measures the invasion is its amplitude, not its residue.**
  Final copy number is 0 in every extinct run, so wherever extinction is common it
  is a near-deterministic restatement of the extinction outcome and carries almost
  no independent information. **Peak copy number per genome** — the maximum over
  the run of `totalCopies / N` — is defined in every run whether or not the family
  later dies, and is closer to what "does per-copy heritability change invasion
  outcomes" is asking. Final copy number is still recorded in the CSV as a
  descriptive column; it is not a pre-specified outcome.
- **The regime has to straddle the escape boundary**, so that some runs inactivate
  and die and others escape and persist. That is not a fudge: it is the only regime
  in which invasion outcome is not already fixed by the parameters, and it is
  therefore the only regime in which the question has an answer that is about rate
  heritability rather than about the arm's coefficients.

### 3. What decides which side of the boundary a run lands on

Escape by divergence is governed by the ratio `sigmaS / theta` — how far a
daughter's sequence coordinate moves per transposition, relative to the silencing
window (`sim/silencing.ts`). Guard 2's arm sits at `0.005 / 0.15 = 0.033`, deep in
the "trap holds, family dies" regime. Measured at that arm with `theta` held at
0.15 and only `sigmaS` moved, `sigmaR = 0.05`, seeds 1–3, 400 generations:

| sigmaS | sigmaS/theta | alive at horizon | inactivation detected | mean peak copies/genome |
| --- | --- | --- | --- | --- |
| 0.008 | 0.053 | 0/3 | 3/3 | 17.7 |
| 0.012 | 0.080 | 0/3 | 3/3 | 17.5 |
| 0.016 | 0.107 | 1/3 | 3/3 | 25.1 |
| 0.020 | 0.133 | 2/3 | 3/3 | 73.8 |
| 0.030 | 0.200 | 3/3 | 0/3 | 187.2 |

The boundary lies between 0.11 and 0.20, and at 0.20 the other degeneracy has
arrived: nothing dies and nothing inactivates.

### 4. Choosing the regime without looking at the arm contrast

The regime was chosen on **held-out seeds 1001–1010**, disjoint from the
confirmatory seed set (1–40), by a criterion fixed before the sweep was run and
computed on **both arms pooled**, so arm identity plays no part in it:

> Take the grid value of `sigmaS` whose **pooled** extinction fraction is closest
> to 0.5.

Grid, 10 seeds × 2 arms = 20 runs per row, 600 generations:

| sigmaS | sigmaS/theta | pooled extinct | pooled inactivation detected | peak copies/genome range | inactivation-time range | runtime |
| --- | --- | --- | --- | --- | --- | --- |
| 0.016 | 0.107 | 20/20 (1.00) | 20/20 | 8.5–30.1 | 24–33 | 3.2 s |
| 0.018 | 0.120 | 16/20 (0.80) | 20/20 | 8.5–103.5 | 24–450 | 14.8 s |
| **0.020** | **0.133** | **11/20 (0.55)** | **20/20** | **7.8–114.9** | **21–596** | **55.6 s** |
| 0.022 | 0.147 | 7/20 (0.35) | 16/20 | 7.4–181.1 | 22–598 | 90.3 s |
| 0.024 | 0.160 | 1/20 (0.05) | 14/20 | 14.8–191.3 | 23–598 | 230.8 s |

**Selected: `sigmaS = 0.020`** (|0.55 − 0.5| = 0.05, the smallest deviation in the
grid). Each pre-specified outcome demonstrably varies there, on held-out seeds:

1. Peak copy number per genome spans 7.8 to 114.9 — a 15-fold range.
2. Extinction is 11/20, neither floor nor ceiling.
3. Inactivation is detected in 20/20 runs and its time spans 21 to 596
   generations — so outcome 3 is defined everywhere and its exclusion count is
   expected to be 0 rather than a selected subsample.

### 5. What else was looked at before registering, disclosed

One earlier exploratory pass **did** see per-arm output on seeds that overlap the
confirmatory set: 12 seeds × 2 arms at `sigmaS = 0.016`, 600 generations, on
seeds 1–12. It is not the registered regime (every run there was extinct, 24/24)
and it played no part in choosing `sigmaS = 0.020`, which was decided on seeds
1001–1010 by the pooled criterion above. For completeness, what it showed: mean
peak copies per genome 18.08 (per-copy) versus 15.93 (family-level), with the
per-copy arm higher in 7 of the 12 seed-matched pairs. No test was run on it and
none is derived from it.

---

## Arms

- **per-copy:** `sigmaR = 0.05`. A daughter inherits a mutated rate, so rate
  varies WITHIN a run and is exposed to selection.
- **family-level:** `sigmaR = 0`. Every copy carries exactly the founding rate for
  the whole run (`sim/phases/transpose.ts` computes
  `min(rMax, max(0, r · exp(𝒩(0,0))))`, which is `r` identically for any
  `0 < r ≤ rMax`). Rate varies
  BETWEEN runs, never within one.

**Both arms draw the founding rate from the same distribution, and at a given seed
they draw the SAME VALUE.** `r0 = 0.2 · exp(𝒩(0, 0.05))`, from a jitter stream
seeded `seed · 7919` that is independent of the world RNG and identical across
arms. This is a deliberate correction to the first draft, which gave the
between-run founding-rate spread to the family-level arm only and left the
per-copy arm at exactly 0.2 — two differences between the arms under a sentence
claiming one. Here the arms differ in **exactly one thing: whether rate mutates
within a run.**

Note on the mutation kernel: `exp(𝒩(0, 0.05))` is median-preserving but
mean-inflating by `exp(0.05²/2) = 1.00125` per transposition event, so the
per-copy arm carries a ~0.125%-per-event upward drift in rate even with no
selection. It is recorded here as a known property of the kernel, not corrected —
correcting it would change `sim/`, which is frozen.

Everything else identical, and pinned in the runner:

    N = 300, S = 3000, c = 0.02, rMax = 1, theta = 0.15, v = 0.005,
    a = 0.0004, b = 0.00001, d = 0.0005, dTol = 0.002, t = 0,
    beta = 0.005, pDom = 0, wDom = 0.01, sexual = true, silencingOn = true,
    sigmaS = 0.020

**40 seeds per arm (seeds 1–40), 600 generations.**

## Pre-specified outcomes

1. **Peak copy number per genome** — `max` over the run's history of
   `totalCopies / N`. **Primary.**
2. **Extinction rate** — the fraction of seeds at zero total copies at generation
   600.
3. **Time to inactivation** — `detectPhases(history).inactivation`. Runs where it
   is null are excluded and the exclusion count is reported per arm, together with
   the `detectPhasesDetailed` failure reason.

Also recorded, descriptive, NOT pre-specified outcomes and not tested: final copy
number per genome, the generation at which the peak occurred, the founding rate,
and mean copy rate at the peak generation and at the horizon.

## Manipulation check — the experiment is void if this fails

Measured inside the same runs, on the same CSV:

- In **every** family-level run, mean copy rate at the peak generation must equal
  that run's `r0` exactly.
- In **every** per-copy run, it must differ from `r0`.

This is the positive control for the arm switch itself: without it, a bug that
silently gave both arms the same `sigmaR` would produce a clean null and read as
an answer.

## Pre-specified analysis

- Outcome 1: Welch's two-sample t-test, two-sided.
- Outcome 2: two-proportion test (`prop.test`, two-sided, with continuity
  correction).
- Outcome 3: Welch's two-sample t-test, two-sided, over the runs in which
  inactivation was detected.

α = 0.05, two-sided throughout. All three p-values are reported raw, with no
multiplicity correction; outcome 1 is designated primary in advance so that the
headline claim does not depend on a choice made after seeing the numbers.

## What would falsify the design decision

If the arms are indistinguishable on all three outcomes — **in this regime, where
the pilot above shows every one of the three can vary** — then per-copy
heritability buys nothing here, and the spec §2 unit decision was more expensive
than it was worth. **That result gets written up, not buried.**

Scope, stated in advance: a null at one regime and one horizon is evidence
against the decision, not a proof against it. It would say that at the escape
boundary of this arm, over 600 generations, within-run rate variation does not
move invasion outcomes. It would not say that no regime exists where it does.

## Deviations

Any change to arms, seeds, generations or outcomes after this file is committed
must be recorded below with its date and reason.

_None._

## Result

_To be written after the confirmatory run, whatever it says._
