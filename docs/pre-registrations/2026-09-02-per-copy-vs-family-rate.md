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
  that run's `r0` to within 1e-12.
- In **every** per-copy run, it must differ from `r0` by more than 1e-6.
- In **every** run, the peak generation must be ≥ 1 (at generation 0 every copy
  carries `r0` in both arms by construction, so a peak there would make the check
  vacuous).

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

**2026-09-03 — manipulation-check tolerance.** As first committed (`f5ae5b1`) the
check demanded that the family-level arm's mean copy rate equal `r0` *exactly*.
That is not a property of the model. `sim/observe.ts` computes `meanRate` as a
running sum divided by a count, so it is exact only up to floating-point
summation error even when every copy carries `r0` as the identical double —
`tests/guards/rate-evolves.test.ts` (guard 5) measures that error at 1.54e-14
over 9361 copies and asserts `toBeCloseTo(r0, 12)` rather than equality for
exactly this reason. The check is therefore stated with tolerances: 1e-12 for the
family-level arm (a 65x margin over guard 5's measured worst case) and 1e-6 for
the per-copy arm's required departure. Bit-exactness of the individual copies
under `sigmaR = 0` is already asserted at every generation by guard 5's test B,
so nothing is lost. **Recorded before the runner was written and before any
confirmatory run existed** — no outcome data informed it.

## Result

**Run 2026-09-03 at `f5ae5b1` + the runner. 80 runs (40 seeds x 2 arms), 600
generations, 202.2 s. Manipulation check passed on all 80.** Data:
`../../experiments/001-per-copy-vs-family-rate.csv`. Figure:
`../analysis/fig-001-peak-copies.png`. Tests: `../analysis/plot-001.R`.

**The arms are not indistinguishable. The falsification clause does not fire.**

| outcome | per-copy | family-level | pre-specified test | p |
| --- | --- | --- | --- | --- |
| 1. peak copies/genome (primary) | 58.65 | 21.49 | Welch t = 4.6675, df = 42.07 | **3.1e-05** |
| 2. extinct by generation 600 | 21/40 (52.5%) | 25/40 (62.5%) | chi-sq = 0.4604, df = 1 | 0.4975 |
| 3. time to inactivation | 261.95 (n = 37) | 138.75 (n = 40) | Welch t = 2.8154, df = 57.48 | **0.0067** |

95% CIs: outcome 1, difference in means [21.09, 53.23] copies per genome;
outcome 2, difference in proportions [-0.341, 0.141]; outcome 3, [35.59, 210.80]
generations.

**Exclusions for outcome 3:** 3 per-copy runs and 0 family-level runs, every one
of them `no-inactivation` — the family never reached the point where silenced
copies outnumbered active ones. Those are the per-copy arm's *most* trap-resistant
runs, so dropping them biases outcome 3 towards the null: the measured effect is
conservative, not inflated.

**What the numbers say.** Per-copy rate heritability changes the SIZE and the
DURATION of an invasion but not its eventual FATE at this horizon.

- Amplitude. Per-copy peaks: min 9.6, quartiles 16.1 / 27.7 / 106.0, max 172.0
  copies per genome. Family-level: 9.6, 13.7 / 18.8 / 26.0, max 44.2. **17 of 40
  per-copy runs exceeded 60 copies per genome; 0 of 40 family-level runs did.**
  The per-copy distribution is visibly bimodal in the figure — runs either escape
  the trap and bloat or are caught and stay small — while the family-level
  distribution is unimodal and tight. Per-copy peaked higher in 27 of the 40
  seed-matched pairs.
- Duration. Median time to inactivation 165 versus 90 generations; median peak
  generation 250.5 versus 81.5. The per-copy invasion keeps growing for roughly
  three times as long.
- Fate. Extinction 52.5% versus 62.5%, p = 0.50, CI spanning zero. **A bigger,
  longer invasion is not a more survivable one.** That is consistent with the
  model property recorded in `tests/guards/three-phases-arm.ts` — inactivation
  implies eventual death — and says the mechanism operates on the invasion's
  shape rather than on its endpoint.

**The mechanism, read off the manipulation-check columns.** In the per-copy arm
mean transposition rate at the peak had risen to **2.51x its founding value**
(range 1.01x to 4.81x), and among the 19 per-copy survivors it stood at **4.15x**
at generation 600 (max 4.91x). In the family-level arm it was **exactly 1.000x in
all 40 runs**, by construction. This is guard 5's within-genome selection
(`tests/guards/rate-evolves.test.ts`, test C: a higher-`r` copy out-replicates its
neighbours inside a genome whatever the host pays) operating over an invasion:
the family is not a fixed strategy meeting the trap, it is a strategy that gets
faster while the trap forms.

**Robustness, NOT pre-specified and labelled as such.** Outcome 1's distribution
is bimodal and right-skewed, which Welch's t is not ideally suited to. A
Mann-Whitney test on the same data gives W = 1100, p = 0.0036 for outcome 1 and
W = 949, p = 0.033 for outcome 3 — same directions, same conclusions. Reported
because the pre-specified test's assumptions are imperfect here, not to replace
it: the table above is the registered analysis.

**What this does and does not establish.** At this arm, this regime and this
horizon, the family-level abstraction understates an invasion's amplitude by
roughly a factor of three and its persistence by roughly a factor of two, and it
cannot produce the bimodal escape-or-be-caught outcome distribution at all,
because the thing that separates the two modes — a lineage that has evolved a
higher rate — does not exist in a model with one rate per family. It gets the
extinction probability right. This is one regime and one horizon; it is evidence
that spec §2's unit decision buys something real, not proof that it always does.
