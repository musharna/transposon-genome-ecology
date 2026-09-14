# Findings

## What this is

This is a model of transposable elements — "jumping genes" — as an **ecosystem living
inside a genome**, where the unit of individuality is the **copy**: each inserted copy
carries its own transposition rate `r`, inherited by the copies it makes, so the
population of copies inside a genome evolves the way a population of organisms does.
You never choose when an element copies itself; the only verb is **perturbing the
world** — knock out the host's silencing, seed a fresh invasion, switch the population
from sexual to asexual, shrink it — and then watching what selection does with the
change. Transposition rate is **heritable, not a decision**, which is the constraint the
whole design is built to respect: a version that let you press "copy now" would be
modelling something that does not exist.

Six questions were registered in advance — each written down, with its prediction and
its falsification condition, and committed to git **before the code that answers it
existed** — and then answered. This page is what they found. Scientific correctness is
the floor here, not the point: the thing being built is a toy you can poke.

**How to read a verdict.** A prediction that HELD survived a test that could have killed
it. A prediction that was FALSIFIED was wrong, and the wrongness is the result — nothing
below was re-fitted, re-tuned, or quietly re-scoped after the data arrived. Where a
verdict does not survive inspection, that is said too.

---

## The six questions

### 001 — Does it matter that rate is per-copy rather than per-family?

**Registered** at [`f5ae5b1`](pre-registrations/2026-09-02-per-copy-vs-family-rate.md),
before the runner existed. Runner `experiments/001-per-copy-vs-family-rate.ts`, committed
with the result at `4995f3b`. Data: `experiments/001-per-copy-vs-family-rate.csv`
(80 runs — 40 seeds × 2 arms, 600 generations). Figure:
`analysis/fig-001-peak-copies.png`.

The design decision under test was the expensive one: making rate a property of each
copy rather than of the family. The registration named the outcome that would count
against it — **if the two arms are indistinguishable on all three pre-specified
outcomes, the decision bought nothing** — and committed to publishing that result rather
than burying it.

**Verdict: the falsification clause does not fire.** Peak copy number per genome averages
**58.65** in the per-copy arm against **21.49** in the family-level arm (Welch
t = 4.6675, df = 42.07, **p = 3.1e-05**). Time to inactivation: 261.95 vs 138.75
generations (t = 2.8154, p = 0.0067). **17 of 40** per-copy runs exceeded 60 copies per
genome; **0 of 40** family-level runs did.

**What it does not show.** Extinction by generation 600 was **21/40 vs 25/40**,
p = 0.4975, a confidence interval spanning zero. Per-copy heritability changes the
**size** and **duration** of an invasion and **not its eventual fate** at this horizon.
It is one regime and one horizon: a result here is evidence about the design decision,
not a proof about every regime.

### 002 — Conscription, or just an innate silencer?

**Registered** at [`82ab678`](pre-registrations/2026-09-04-conscription-vs-innate-silencer.md),
committed alone before any runner. Pilot at `58b0656`; runner
`experiments/002-conscription-vs-innate.ts`. Data:
`experiments/002-conscription-vs-innate.csv` (180 runs). Figure:
`analysis/fig-002-viability.png`.

The model's signature mechanic is that the host's piRNA trap is _built out of captured
element fragments_ — inserting into the trap conscripts you into your own suppression.
Arm A has that; arm B replaces it with an innate silencer that does the same job without
being made of the element. The registered prediction was that **no grid point has both
arms viable** (fewer than half the seeds extinct).

**Verdict: FALSIFIED.** Both arms are viable at **3 of the 9 registered grid points**
— at `theta/sigmaS` = 3.33 and 5.00. The secondary prediction held (arm B's silenced
fraction stays below the registered 0.05 wherever arm A is viable — the worst cell mean
is 0.0223 and the worst single run 0.0348). The falsification lives in the range
**the pilot never swept**: the pilot's grid floor was `theta = 0.15` and the registered
grid went down to `0.10`. Registering wider than the pilot is the only reason it was
found.

**What it does not show.** Two things, both of which limit it more than the verdict
suggests. First, **`VIABLE` could not discriminate, and it was the registered
criterion**: at both both-viable regimes, every arm-B run had hit the saturation stop
(cell means 1580.0 and 1593.3 copies per genome, ~2% silenced) while arm A sat at 195.5
and 262.6 copies at 94.5–95.5% silenced. "Controlled at equilibrium" and "exploding into the stopping rule" score
identically under it. That does not rescue the prediction — it was stated on that
criterion — but it is a real limit on what the number means. Second, **`theta` and
`sigmaS` are not independent axes**: sequence space carries no other constant, so
rescaling both leaves trajectories identical. The **9 registered grid points are 6
distinct regimes** (verified: the CSV contains exactly 6 distinct values of
`k* = (theta/sigmaS)²`), and the 3 both-viable points are **2** distinct regimes.

### 003 — How fresh must the trap be?

**Registered** at [`126e3bd`](pre-registrations/2026-09-04-how-fresh-must-the-trap-be.md),
committed alone; check-3 amended at `778fe9c` before any data; runner and analysis at
`e0af8b2`. Data: `experiments/003-trap-fidelity.csv` (270 runs). Figures:
`analysis/fig-003-fidelity.png`, `analysis/fig-003-silencing.png`.

A "fidelity dial" `phi` degrades what the trap captures: the entry recorded is
`(1 - phi) × copy.s`, so `phi = 0` is a perfect record of the captured copy and larger
`phi` is a blurrier one. The question is how much blur the host can tolerate.

**Verdict: the trap must be perfectly fresh — and the registered secondary was
FALSIFIED by its own falsifier's blind spot.** Control occurs at `phi = 0` and at no
other sampled point, at all three ratios. The primary (that the controlled set is a
contiguous down-set from zero) HELD, but **trivially**: `{0}` is a down-set, so it
cannot tell a knife-edge from a broad band, which is the question it is named after.
Secondary 1 predicted that _some_ `phi` strictly between 0 and 1 is controlled; it is
**FALSIFIED**, and its attached falsification clause ("falsified if `phi = 0.875` is
controlled") **never fires**, because it covered only the edge being too _high_. The
edge fell _below_ the grid's first step. A falsifier that detects only one of the two
directions its prediction can fail in — the project's signature defect, occurring in the
falsifier itself.

**What it does not show.** The headline turned out to be a **resolution artefact**: 004
found control up to `phi = 0.016`, which is three doublings **below** 003's first nonzero
grid step of 0.125 (0.016 → 0.032 → 0.064 → 0.125). The whole controlled region sat
underneath 003's first step, which is precisely why 003 saw control only at exactly zero.
003's answer is correct about 003's grid and wrong about the model.

### 004 — A band, or only a delay?

**Registered** at [`cec9955`](pre-registrations/2026-09-04-a-band-or-only-a-delay.md),
committed alone; check 3b amended at `5468d97` before any data; runner and analysis
committed together at `9201d74`, before any data existed. Data:
`experiments/004-fidelity-band.csv` (270 runs) and `experiments/004-reproduction-control.csv`
(60). Figure: `analysis/fig-004-band.png`.

**Verdict: the band is real, and it is a delay.** PRIMARY **HELD** — control does exist
above `phi = 0`, up to **`phi = 0.016` at generation 600**, at all three ratios (verified
from the CSV: the largest fully-controlled `phi` is 0.016 at every ratio). SECONDARY 1
**HELD** — scored at the longer horizon the edge falls to **`phi = 0.004` at generation
1800**, again at all three ratios. So an imperfect trap does control the element, but
only for a while: the controlled region shrinks as you watch it, and nothing here shows
it converging on a floor.

SECONDARY 2 (that a mechanistic prediction `phi* = theta / max|s|` lands in the observed
edge cell) is **FALSIFIED robustly** — on the post-hoc power-law edge all three predicted
values miss by 1.8× to 3.8×. Scored instead on the registered grid, the ratio-5.00
prediction does land in the observed edge cell, by 0.6%; the registration named that
ratio in advance as the least informative of the three, and the two framings are quoted
separately here because they are different comparisons.
The mechanism is also **refuted on its own diagnostic**: it said control requires reach
`theta/phi` to exceed wander `max|s|`, yet at ratio 2.00, `phi = 0.004`, reach is 25.0
against wander 60.8 and the cell is controlled 10/10.

**What it does not show — and a retraction.** SECONDARY 3 reads FALSIFIED **as
registered**, and that verdict **does not survive inspection**. It scored
`ratio / phi_edge`, but `phi_edge` is the same grid point at all three ratios, so the
measured 2.50× spread _is_ identically the ratio spread (5.00/2.00) and carries no
information; and the estimator is quantised to a factor of 2 while the registered
tolerance _was_ a factor of 2 — a test cannot resolve an effect the size of its own
quantisation. Re-scored on a finer edge estimate the same quantity spans 1.75× and
HOLDS. **The verdict flips with the estimator, so 004 does not resolve it.** An earlier
draft of this result read the falsification as settling the matter; that reading is
retracted. Note also that secondaries 2 and 3 are **not independent** —
`K_obs/K_pred = phi*/phi_edge` exactly — so four registered predictions carried three
bits, and one ratio-5.00 near-hit appeared in both as though it were two confirmations.

### 005 — Does the delay diverge, or is there a floor?

**Registered** at [`909aeb0`](pre-registrations/2026-09-05-does-the-delay-diverge.md),
committed alone before any runner; runner and analysis committed together at `3e88479`,
before any data. Data: `experiments/005-delay-divergence.csv` (150 runs) plus
`experiments/005-reproduction-control.csv` (90 control runs). Figures:
`analysis/fig-005-divergence.png`, `analysis/fig-005-tolerance.png`.

If the controlled edge keeps shrinking with the horizon, either it shrinks forever (a
delay) or it stops at some `phi` the host can always hold (a floor). 004's fitted power
law `t_sat = C · phi^(-a)` was carried forward as the thing to test, with its constants
**frozen from 004 before any 005 data existed**.

**Verdict: no floor above `phi = 0.002` — and the published law does not predict
_when_.**

- **PRIMARY — HELD.** Every run saturates. **150/150 saturated, 0 censored, 0 extinct**,
  15 cells × 10 seeds with no duplicated `(ratio, phi, seed)` — all verified straight
  from the CSV. No floor.
- **SECONDARY 1 — FALSIFIED.** The law was predicted to place cell-mean `t_sat` within
  ±25% below its fitted range. At `phi = 0.002` the observed means exceed the prediction
  by **+43.1% / +42.2% / +37.0%** at ratios 2.00 / 3.33 / 5.00 (observed 4720.1 / 5345.5
  / 6101.9 against predicted 3297.5 / 3759.5 / 4454.1). It predicts _whether_, not
  _when_.
- **SECONDARY 2 — HELD.** Inside the fitted range, at three `phi` no experiment here had
  ever run, the law interpolates within ±10% (worst −8.63%).
- **SECONDARY 3 — HELD.** The curvature continues and points up.

That combination — a primary and two secondaries holding while the extrapolation
secondary fails — is the one the registration **named in advance** as carrying two bits
rather than one.

**What it does not show, and this is the real finding.** Refitting on 005's own data
gives `a` = **0.8695 / 0.8734 / 0.8766** (SE ≈ 0.02) against 004's frozen **0.7304 /
0.7360 / 0.7447** — 3.2 to 3.8 combined standard errors apart. But **both fits are
misspecified by the same diagnostic**: each leaves a convex residual pattern — `+ − − − +`
at 004's three ratios and at 005's 2.00 and 5.00, with 005's 3.33 reading `+ − − 0 +`,
its fourth cell sitting inside its own standard error — running at **1.9–2.9× the
sampling noise floor**, with R² between 0.993 and 0.9986. A high R² is not evidence that
a functional form is right.

> **`t_sat` is not a power law in `phi`, and the exponent you measure is a property of
> the window you fit in.** Nothing in this repository quotes an exponent as a property
> of the system, and a question 006 that froze `a = 0.87` and tested below `phi = 0.002`
> should expect to falsify it exactly as 005 falsified 004.

One more limit, recorded against ourselves: **the horizon was sized from the model under
test**, at ≥1.75× the _predicted_ `t_sat`. Since the prediction was 43% low, the realised
headroom at `phi = 0.002` was **1.31×, not 1.80×**, and the worst single seed consumed
**82% of its horizon**. Had the error been +80% instead of +43%, the cells would have
censored and the falsified prediction's magnitude would have been unmeasurable. That
sizing rule is circular and should have come from the model's worst plausible error.

### 006 — Is the exponent one?

**Registered** at [`f457e3a`](pre-registrations/2026-09-11-is-the-exponent-one.md),
committed alone before any runner. It was amended twice before any data existed
(`333ce8d`, `eec8d95`). The runner, `experiments/006-is-the-exponent-one.ts`, was committed
at `26a3a12` with every mutation-table row seen to fail. Data:

- `experiments/006-phase1.csv`: 150 runs;
- `experiments/006-reproduction-control.csv`: 60 runs;
- `experiments/006-phase2.csv`: 60 runs, at `phi` = 0.001 and 0.0005.

**No figure yet.**

005 showed that the exponent is a property of the fitting window, so this question does
not fit one. It asks whether the **local** exponent converges, as `phi` falls, to the
value the model's own mechanism derives with no free parameter: **`a = 1`**. It scores
that on two `phi` cells below anything run before.

**Verdict: the registered primary HELD, and it does not survive a change in how three
runs are counted. This page does not claim `a = 1`.**

- **PRIMARY — HELD, 2 of 3 as registered, and NOT ROBUST.** The local exponent on
  `0.0005→0.001` must lie in [0.95, 1.05]. The primary is falsified if it lies outside
  that band at two or more ratios:

  | ratio | as registered                 | censored runs counted at their horizon |
  | ----- | ----------------------------- | -------------------------------------- |
  | 2.00  | 1.027 ± 0.065 — in            | same                                   |
  | 3.33  | **1.099 ± 0.035 — out, high** | same                                   |
  | 5.00  | 0.958 ± 0.031 — in            | **1.648 ± 0.281 — out, high**          |
  - At `phi = 0.0005`, ratio 5.00, three of ten seeds never saturated inside the
    70013-generation horizon. They were still controlled at 494–573 copies per genome.
    The other seven saturated at 21899–23903, so the cell is bimodal.
  - As registered, those three runs are excluded. **Exclusion lowers the cell mean, so
    it biases the verdict toward holding.**
  - Counting them at the horizon, the least they could be, falsifies the primary.

- **SECONDARY 1 — FALSIFIED**, with the mechanism worst at every ratio.

  | ratio | power law | mechanism | quadratic |
  | ----- | --------- | --------- | --------- |
  | 2.00  | 15.1%     | 19.6%     | **11.1%** |
  | 3.33  | 15.0%     | 18.9%     | **7.1%**  |
  | 5.00  | 11.2%     | 20.1%     | **9.6%**  |

  The table shows each form's out-of-sample error. The power law under-predicts every
  deep cell, and the other two over-predict every one. The verdict does not depend on
  the censored runs.

- **SECONDARY 2 — HELD**, with a decrease beyond one SEM at 1 of 3 ratios; it takes 2 to
  falsify. ⚠️ The pre-data runner never implemented it. It was first computed by a
  read-only script, then added to the runner test-first at `ba9ca86`, after the data
  existed, and the runner reproduces the script's numbers exactly. At ratio 5.00 the last
  three local exponents read 0.974, 0.955 and 0.958. That is flat, not rising.
- **SECONDARY 3 — HELD.** The spread of `max|s| / t` is 1.08 / 1.06 / 1.07, against a
  1.15 bound.

**How the censoring was read, decided after the data.** The registration is internally
inconsistent:

- its manipulation-check heading says a failed check voids the experiment;
- check 3 itself says censored runs are excluded and counted.

The runner, committed before any data, implemented exclude-and-count. The owner
decided the Result would report that verdict **beside** the censored-at-horizon bound
and call it not robust. No number moved.

**What it does not show.**

- It does not show that the exponent is one.
- It does not show whether the three controlled seeds ever saturate. That is 005's
  floor question, reopened below `phi = 0.002`, and it must be answered by a new
  registration, not by extending 006's runs.
- It does not show which way extinction biases a cell mean. **The first extinctions
  since 003** are all at ratio 3.33: one seed at `phi = 0.001` and two at 0.0005.
  004, 005 and Phase 1 had none. Each was a sudden collapse from 460–730 copies per
  genome.

**Why Secondary 1 can fail while the exponent is one.**

- The mechanism is `t = K / phi`, with `K` frozen from in-range cells where `t·phi` was
  still falling.
- So it over-predicts every deep cell by 15–23%, and Secondary 1 scores that constant
  as well as the exponent.
- That explains the failure. It does not excuse it, because freezing `K` was
  registered.

---

## What is open

**The limitation that matters most for anyone playing the toy.** The model presents
**domestication** — an element ceasing to be a parasite and being kept for a job the
host needs, as with syncytin and RAG — as an _alternate win_. **At the shipped defaults
it cannot happen.** `defaultParams().wDom = 0.01`, and the persistence threshold measured
across eleven seeds **on guard 8's arm** sits at `0.03 < wDom* ≤ 0.075`. Those bounds are
a property of **that arm and not of the model**, and the guard's own test says so: the
band is a drift-versus-selection balance, so it moves with `N` (200 here), with `v`, with
`beta` and `pDom` (0.1 and 0.2 here, which set the supply), and **with the horizon** —
at `wDom = 0.05`, five of eleven seeds still hold domesticated copies at generation 600
and **none do at generation 1000**. Nothing here licenses quoting 0.075 as the model's
domestication threshold. The shipped value is 3× below the
highest bonus at which every seed still loses its domesticated copies, and 7.5× below
the lowest at which every seed keeps them. Domesticated copies are made, peak at
195–595 copies around generation 26–44, and are then lost **to zero at every seed**.

This is a **calibration** finding, not a missing mechanism — the model expresses
persistence perfectly well above the threshold, including persistence through the
family's total extinction. Read against Kapitonov & Jurka 2005, the honest reading is
that the _model is right and the shipped constant is unrealistically small_: becoming
part of the adaptive immune system is not a 1% fitness nudge. **`wDom` was deliberately
not changed for this release.** Moving it moves every other guard's derivation and the
golden hash that pins the RNG draw stream, and the registered questions above were all
answered at the shipped value. Retuning a constant so that a nicer outcome appears is
exactly the post-hoc move this project's whole method exists to prevent.

**The next registration.** 006 tested the functional form, as 005 asked. It left one
question open that it cannot answer itself:

> **At `phi = 0.0005`, ratio 5.00, do the three seeds still controlled at generation
> 70013 ever saturate?**

That question decides whether 005's "no floor" survives below `phi = 0.002`. It needs its
own registration, with its own horizon rule, and must not be answered by extending 006's
runs. Also owed on 006: a figure.

**Also open, carried deliberately:**

- **Full inactivation kills the family**, which diverges from biology. Measured across
  eleven seeds, the cause is the **sexual path**, not excision and not selection: a copy
  that cannot transpose cannot restore its own frequency. Gated excision, `d = 0`, and
  no selection on copy number at all each still give 0/10–0/11 survival; excision gated
  **and asexual** gives 10/11. Fixing it needs a positive fitness term or a replacement
  channel, not the one predicate the item originally blamed.
- **The `t` dial conflates two things biology keeps separate.** It gates trap
  conscription, but Kelleher et al. 2018 defines tolerance as mechanisms that limit
  fitness cost _without_ affecting propagation — entirely outside the piRNA pathway. The
  gate is defensible as an evolutionary argument and implemented as a mechanical one. It
  is a design decision, labelled as one.
- **The `theta` window is grounded by nothing in the reference base.** Kelleher 2012 was
  the intended source and argues the other way in its own system. The window's
  justification is a **design** one — it is what makes "family" emergent rather than
  declared — and is labelled design, not biology.
- **Our cluster fraction sits inside the biological range, and that is not a
  validation.** Kofler 2020's 0.2% minimum is a property of _his_ silencing rule — one
  capture, whole family, permanent, no escape — while ours silences a window daughters
  routinely escape by construction. At equal cluster size our trap is weaker, so the
  number does not transfer.
- **Guard 4's bloat result is one arm at one horizon and its direction reverses** past
  generation 180. It asserts direction only and must not be quoted as a general property
  of the model.
- **The domesticated glyph is drawn at 3.6× true site scale** in the field view and
  buries 6 copies. It is the reason the rarest state the toy shows is visible at all;
  whether the trade is worth making is an open question, not a bug.
- **Why more domestication bonus gives _fewer_ domesticated copies above `wDom ≈ 0.3`**
  is uncharacterised. Two candidate mechanisms move together and neither was isolated.
- A **second phase detector on Kofler's own observable** (`fractionWithRepertoire ≥ 0.99`)
  is computable today and would make guard 3 comparable to the paper it is named for.
  Not built.

A full classification of every open item — 23 of them, each marked claim-invalidating,
interpretation-limiting, or future work — is in [`RELEASE-1.0.md`](RELEASE-1.0.md), and
the running record with full measurements is [`ROADMAP.md`](ROADMAP.md).

---

## Reproducing this

**Requirements: Node ≥ 22** (the toolchain crashes at startup on Node 18 — `styleText` is
missing from `node:util`), **Playwright's Chromium** for the two browser-driven test files,
and **R 4.3.3** with ggplot2 4.0.2, patchwork 1.2.0 and png 0.1-8 for the figures.

```sh
npm ci
npx playwright install chromium   # tests only
npm test            # 28 files, 260 tests
npm run typecheck
npm run build       # -> dist/
npm run preview     # serve the built toy
```

Chromium is needed by `npm test` and by nothing else: `tests/layout.test.ts` and guard 7
(`tests/guards/one-implementation.test.ts`) drive a real browser against the built page,
and without the binary the suite fails at `chromium.launch()`. `npm run build` and
`npm run preview` do not use it, so the toy builds and serves on a machine that has no
browser installed.

If Chromium launches but dies on a missing shared library, add `--with-deps` — but note
it is **Linux-only and needs root**, so it fails where sudo is non-interactive. The
README's Setup section has the detail.

Every figure regenerates from its committed CSV. Run these **from the repository root**
— each script sources the shared house theme by the repo-relative path
`docs/analysis/theme.R` and fails from anywhere else:

```sh
Rscript docs/analysis/plot-001.R
Rscript docs/analysis/plot-002.R
Rscript docs/analysis/plot-003.R
Rscript docs/analysis/plot-004.R
Rscript docs/analysis/plot-005.R
```

Each script re-asserts its experiment's manipulation checks against the CSV before it
draws anything, so a figure cannot be built from data produced by a broken runner, and
each prints its verdicts to stdout. The figures are byte-reproducible: repeated runs
produce identical files.

Re-running an **experiment** from scratch (rather than re-drawing from the committed
CSV) uses the runner named in each section above, for example:

```sh
npx tsx experiments/005-delay-divergence.ts    # ~16 h single-process, ~6 h sharded
```

⚠️ **Do not run this to check the figures.** Two reasons. It is expensive — the
registered cost table budgets **~16 hours** of wall time for all 243 runs in one
process, or **~6 hours** if you shard by ratio across three (the runner accepts a shard
label, and the sharded output is asserted byte-identical to the unsharded one). And it
**overwrites the committed CSV**: the runner opens `experiments/005-delay-divergence.csv`
with `writeFileSync` and truncates it before the first row. If you want to verify the
published result, re-draw from the committed data with `Rscript docs/analysis/plot-005.R`
— that takes seconds and re-asserts the manipulation checks on the way.

The model is seeded and deterministic — `stateHash` digests the ordered world state, and
`tests/step.test.ts` pins the RNG draw stream to golden hash `9c15fd28`, so a change that
perturbs the draw order turns the suite red rather than silently moving every result.
