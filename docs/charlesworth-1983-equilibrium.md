# The Charlesworth null model — read from the source

Charlesworth, B. & Charlesworth, D. (1983). "The population dynamics of
transposable elements." _Genetical Research_ **42**(1):1–27.
doi:[10.1017/S0016672300021455](https://doi.org/10.1017/S0016672300021455)

Read 2026-09-02 from the full OA PDF, not from an abstract or a summary. Page and
equation numbers below are the paper's own. This file discharges Step 1 of plan
Task 15 and the ROADMAP checklist item "Read Charlesworth 1983 fitness form".

## The three questions Task 15 asks

### 1. The exact fitness function

> "In our simulation work we used functions of the form
> **w_n = 1 − s·n^t.** (23)" — p. 13

`n` is copy number per individual; `s` scales the strength of selection; `t`
controls curvature. Figure 3 (p. 12) explores `t ∈ {1, 1.2, 1.3, 1.5, 2}` at
`T ∈ {124, 500}` sites with `u − v = 0.0025`.

The paper is explicit that **`t = 1` is not viable**. A linear `w_n = 1 − ns`
admits an equilibrium only when `T > 1/(u − v)` — "a very large number of
occupable sites, in view of the probable low values of u and v" — and even then
`s` "must be closely adjusted to the other parameters". Their verdict: "A linear
fitness function thus seems unlikely; a more strongly convex function of n is
less tightly constrained." (pp. 12–13)

### 2. The transposition–selection balance

The direction of change in mean copy number is the sign of `u − v − f(n)`
(eq. 20a, p. 11), so an equilibrium `n̄` exists where `f(n̄) = 0`, subject to
`0 < n̄ < T`.

Two conditions, both stated on p. 11:

- **For copy number to increase from zero:** `f(0) < u − v`.
- **Necessary for a biologically meaningful `n̄`:** `∂² ln w_n / ∂n² < 0` — the
  _log_ fitness must be strictly concave in copy number.

The paper draws the consequence directly: "fitness must fall off more steeply
with n than does a multiplicative function `w_n = (1 − s)^n` corresponding to
independent effects s of each element on fitness." (p. 12). Brookfield (1983)
reached the same conclusion by another route.

The balance condition in the regime that matters — p. 16, eq. (29), "If n is
small compared with T":

> **−∂ ln w_n / ∂n ≈ u − v** (29)

The paper notes this is Haldane's (1937) mutation–selection load result, and that
it means "a small decrement in fitness is sufficient to balance the increase in
copy number by transposition". At the Table 2 parameters, equilibrium mean fitness
is ~95.5% of a copy-free individual — copy number stabilises far below the point
where fitness collapses.

### 3. Is excision a separate rate?

Yes. §4 opens (p. 11): "We assume that the probabilities of both transposition and
loss are constants (`u` and `v`), independent of copy number." Loss is a per-element
per-generation constant, and it enters the balance **only through the difference
`u − v`** (eqs. 20a and 29). In their simulations both transposition and loss
counts per individual are Poisson with mean = per-element probability × `n`
(p. 3).

## What this means for our model — the conditions hold, the constant does not

Our implementation (`sim/phases/select.ts`) is

```
copyNumberLoad(n) = a·n + b·n²
ln w_n            = -(a·n + b·n²)          [+ wDom·nDom, zero in the null regime]
w_n               = exp(-(a·n + b·n²))
```

This is a _different functional family_ from eq. (23) — exponential-of-polynomial
rather than one-minus-power — so it has to be checked against the paper's
**conditions**, not pattern-matched to its formula. On the conditions it passes:

| Paper's condition                             | Our form                                                          | Verdict                                   |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `∂² ln w_n/∂n² < 0` (p. 11)                   | `∂² ln w/∂n² = -2b`                                               | satisfied **iff `b > 0`**                 |
| steeper than multiplicative `(1-s)^n` (p. 12) | at `b = 0`, `w = (e^{-a})^n` — _exactly_ the multiplicative model | the `b` term is what clears the bar       |
| `f(0) < u - v`                                | `f(0) = a`, so need `r > v + a`                                   | a parameter constraint, not a form defect |

Our form is also better-behaved than theirs: `1 - s·n^t` goes negative for large
`n` and needs truncation, while `exp(-(an + bn²))` is positive everywhere and
strictly decreasing. Keeping our form is the right modelling choice.

**`b` is the entire ballgame.** At `b = 0` our model degenerates precisely to the
independent-effects multiplicative case the paper rules out.

### Measured: the qualitative predictions reproduce, the analytic constant does not

Substituting our form into eq. (29) with `u ≡ r` gives `n̄ = (r - v - a)/(2b)` =
**48** at the current defaults. **This prediction is wrong, and it was measured
wrong before it was written into any guard.**

Measured on the live model (`silencingOn: false, pDom: 0, c: 0, beta: 0,
sigmaR: 0, d: 0, dTol: 0, r0: 0.05, v: 0.001, S: 2000`, sexual, approached from a
high-copy start so that early drift cannot dominate):

| arm                                        | predicted   | observed n̄                |
| ------------------------------------------ | ----------- | ------------------------- |
| `a = 0, b = 0` — no host selection at all  | ∞ (runaway) | **~150**                  |
| `a = 0.001, b = 0` — linear/multiplicative | ∞ (runaway) | **~124–148**              |
| `a = 0.001, b = 0.0005` — quadratic        | 48          | **~3–9**, and N-dependent |

⚠️ **The three `observed n̄` figures in the table above are SUPERSEDED.** They
were taken on commit `c1bc201`, at an unrecorded `N`, with the Task 10
`transpose.ts` mutation still in the tree. Task 15 re-measured all three on the
unmutated model at `N = 200, S = 2000`, five seeds, generation 300, and the
no-selection and quadratic arms are both roughly twice the values above:

no-selection **308.2**, linear **299.1**, quadratic **26.8** (means of five
seeds). The per-seed table, the three ratio rows and the limits on what they
license are NOT repeated here — they are defined once, on `ARMS` in
`tests/guards/equilibrium-arm.ts`, and printed by
`scripts/explore-equilibrium.ts`. A measured table transcribed into three files
is a table that will stop agreeing with itself.

The N-dependence the table asserts is confirmed and quantified: the quadratic
arm sits at 19.2 copies per genome at `N = 100`, 26.8 at `N = 200` and 31.3 at
`N = 400`. So is the direction of every qualitative claim below — the RATIOS,
which are what Guard 1 asserts, reproduce (linear 97.0% of no selection with a
per-seed minimum of 94.0%; quadratic 8.7% with a per-seed maximum of 9.4%). The
absolute numbers did not. `scripts/explore-equilibrium.ts` prints all of it and
`tests/guards/equilibrium-arm.ts` records the derivation.

Two things follow, and they point in opposite directions.

**The paper's central qualitative claim reproduces exactly.** A linear fitness
function does not control copy number: at `a = 0.001, b = 0` the equilibrium
stays within a few percent of having no host selection whatsoever — re-measured
in Task 15 at `N = 200`, 299.1 against 308.2, i.e. 97.0%, per-seed minimum
94.0%. (The phrase "statistically indistinguishable" stood here and is WRONG;
see the correction in item 2 of "Consequence for Guard 1" below, which this
sentence contradicted. Linear selection has a small but consistent effect.)
Turning on the quadratic term collapses copy number by more than an order of
magnitude. That is precisely "fitness must fall off more steeply with n
than does a multiplicative function" (p. 12), and it is falsifiable: set `b = 0`
and copy-number control disappears.

**The analytic constant does not, because our model is haploid and theirs is
diploid.** Charlesworth's `n` counts elements in a diploid individual — eq. (18b)
carries `dn/dx_i = 2` for exactly that reason, and p. 16 states `n` "would refer
to the number of heterozygous elements carried by an individual". Our `Genome` is
a single `copies` array, and `sim/phases/reproduce.ts:63–73` builds an offspring
by taking each of the mother's copies with probability ½, each of the father's
with probability ½, and then **deduplicating shared sites**.

That dedup is a copy sink with no counterpart in the null model. If the parents'
site sets were independent, it would cost `n²/(4S)` per generation — predicting a
selection-free equilibrium of `4S(k-1)/k² ≈ 356` at `k = (1+r)(1-v)`. The observed
selection-free equilibrium is ~150, well below that, because at equilibrium the
parents' sites are **not** independent: identity by descent makes shared sites
common, and every shared site is destroyed rather than transmitted twice. In a
true diploid, an individual homozygous at a site transmits that element to every
offspring; our haploid collapses the homozygote into one copy and throws the
second away. The sink is therefore both density- and relatedness-dependent, which
is also why the quadratic arm is N-dependent.

This is not a bug in `reproduce.ts` — dedup is correct for a haploid. It is a
structural mismatch between our life cycle and the null model's.

### Consequence for Guard 1

**Guard 1 cannot assert a Charlesworth-derived numeric equilibrium**, because our
model is not Charlesworth's model — it carries an extra sink. Calibrating the
constant from our own simulation instead would be circular: a constant read off
the artifact under test cannot falsify that artifact.

What Guard 1 _can_ assert, and what makes it a real external check, are the
paper's qualitative predictions, each with the negative control the paper itself
supplies:

1. **Log-fitness concavity is required.** With `b > 0` copy number settles to a
   stable, finite, non-saturating value; with `b = 0` control is lost and copy
   number rises to the recombination-limited ceiling. (p. 11 condition
   `∂² ln w_n/∂n² < 0`; p. 12 "more steeply than multiplicative".)
2. **A linear fitness function is not sufficient.** ⚠️ An earlier draft of this
   file said `a > 0, b = 0` must be "statistically indistinguishable" from
   `a = 0, b = 0`. **Measured, that is false** and it is corrected here: linear
   selection has a small but consistent effect. At `N = 200, S = 2000`, five seeds,
   generation 800, the linear arm sits at **97.2%** of the no-selection arm
   (per-seed minimum 95.4%). ⚠️ That draft also said "the two ranges do not
   overlap", which is **true only at generation 800 and false at the horizon
   Guard 1 actually runs**: Task 15 measured generation 300, where the per-seed
   ranges DO overlap and linear reaches 100.7% of no-selection at seed 5. Both
   arms are still climbing at 300. **Never assert a per-seed ordering between
   these two arms** — Guard 1 correctly asserts a floor/ceiling pair on the
   ratio of means instead. The claim the paper
   actually supports is comparative, and the separation is an order of magnitude:
   linear stays within a few percent of no selection at all, while the quadratic
   arm falls to **9.1%** of it (per-seed maximum 9.4%). Assert that shape, not
   indistinguishability. (pp. 12–13.)
3. **The equilibrium is approached from both directions.** A model that reaches a
   value from below but not from above has a bug, not an equilibrium.
4. **Copy number stabilises far below saturation** — `0 < n̄ < T`, p. 11. Guard 1
   asserts this as SITE occupancy, which is the quantity it measures.

⚠️ **What does NOT reproduce: the fitness decrement.** Item 4 above previously
read "far below the point of substantial fitness loss (p. 16, mean fitness
≈95.5% of copy-free at their Table 2 parameters)", which reads as though our
equilibrium lands in the same regime. Measured, it does not, and the gap is
sevenfold:

| mean fitness at equilibrium, as a fraction of copy-free | ours                         | Charlesworth Table 2, p. 16 |
| ------------------------------------------------------- | ---------------------------- | --------------------------- |
|                                                         | **≈0.680** (32.0% decrement) | ≈0.955 (≈4.5% decrement)    |

Arithmetic, at `n̄ = 26.8`, `a = 0.001`, `b = 0.0005`:
`load = 0.001·26.8 + 0.0005·26.8² = 0.0268 + 0.3591 = 0.3859`, so
`w = exp(-0.3859) = 0.6798`. Cross-checked against the live `fitness()` on a
27-copy genome: 0.6760.

Our equilibrium is therefore **not** in the regime the eq. (29) discussion is
about: the paper's remark that "a small decrement in fitness is sufficient to
balance the increase in copy number by transposition" (p. 16) is a statement
about their parameterisation, and ours pays seven times as much. **This is a
parameterisation difference, not a reproduced result, and it is deliberately not
tuned away** — `a` and `b` are the `defaultParams` values every other guard in
the suite is calibrated against, and changing them would move the golden hash
`9c15fd28` and invalidate every downstream derivation. It is recorded here and
in the "WHAT THIS GUARD DOES NOT CLAIM" block of
`tests/guards/equilibrium.test.ts` so that nobody reads Guard 1's
non-saturation assertion as having reproduced the paper's fitness figure. It has
not; nothing in Guard 1 measures fitness at all.

Whether to close the haploid/diploid gap in the model itself is a separate
decision, recorded in the ledger, and is deliberately **not** bundled into
Guard 1: changing `reproduce.ts` alters the RNG stream and invalidates the golden
hash and every guard calibration downstream.

### Two corrections to the Task 15 brief

Both are conditions the brief's `pre` block omits, and both would break the
comparison rather than merely loosen it.

1. **`sigmaR` must be 0.** Charlesworth's `u` is a _constant_. Ours is a heritable
   per-copy trait, and it does not sit still: measured on the live model, mean `r`
   climbs 0.1 → 0.85 in ~100 generations with no host selection at all. With
   `sigmaR > 0` there is no fixed `r` to compare a balance condition against.
2. **`d` and `dTol` must be 0.** The paper's selection is on copy number alone.
   Our damage-load terms are an addition to the null model, not part of it.

The brief's existing `c: 0, beta: 0, silencingOn: false, pDom: 0, sexual: true`
are all correct and stay. `sexual: true` is load-bearing and not a stylistic
choice: the paper assumes random mating, free recombination and no linkage
disequilibrium, and measured asexually the same parameters saturate the genome
(1994 of 2000 sites) instead of equilibrating.

### A measurement caveat worth keeping

Approaching the equilibrium **from below** from the default one-copy-per-genome
start is unreliable at these parameters: a founding copy is a single allele at
frequency 1/N, so its fixation probability is roughly `2s` with `s ≈ r - v`, and
most founding lineages drift out before growth takes hold. Measured at
`a = b = 0, S = 2000`: `r = 0.02 → 0` copies, `r = 0.05 → 4`, `r = 0.1 → 104`.
That is a drift signature, not an equilibrium. Guard 1 must seed a high-copy
start for at least one arm, and must not read a low number as "the equilibrium".

## Provenance

Verified against the full text of the OA PDF (27 pp.), extracted locally.
Author, year, journal, volume, pages and DOI cross-checked against the PDF's own
title page: "Genet. Res., Camb. (1983), 42, pp. 1-27", B. Charlesworth and
Deborah Charlesworth, School of Biological Sciences, University of Sussex;
received 19 August 1982, revised 14 February 1983.

Simulation measurements in this file were taken on commit `c1bc201` with
`sigmaR: 0`, a regime in which the Task 10 see-it-fail mutation then present in
`sim/phases/transpose.ts` is both value-identical and draw-identical to the
unmutated code. They are to be re-confirmed once that mutation is reverted.

**Re-confirmed in Task 15**, on the unmutated model, at `N = 200, S = 2000`,
five seeds, horizon 300, by `scripts/explore-equilibrium.ts`. Result: the
QUALITATIVE claims all reproduce and are what Guard 1 asserts; the three
absolute `n̄` figures in the first measured table do not, and are marked
superseded above. Two further claims in this file were re-measured and hold:
`sigmaR > 0` destroys the constant-`u` assumption (mean `r` 0.050 -> 0.852 by
generation 200 with no host selection, at 75.0% site occupancy), and `sexual`
is load-bearing (run asexually the no-selection arm passes 48% occupancy by
generation 150, the linear arm goes extinct, and the quadratic arm settles 16x
higher than its sexual value).
