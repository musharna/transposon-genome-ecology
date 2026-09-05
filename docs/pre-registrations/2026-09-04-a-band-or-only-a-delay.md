# Pre-registration — a band, or only a delay?

**Registered:** 2026-09-04, before any runner existed.
**Model frozen at:** `12e7b08`, the same freeze questions 001, 002 and 003 used.
`sim/` is byte-identical to that commit at time of writing — `git rev-parse
12e7b08:sim` and `git rev-parse HEAD:sim` are both `b1e69c2` — and is not touched
by this experiment.
**Spec:** `../superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
§3.3 (why the sequence coordinate earns its place).
**Sited by:** registered question 003, `2026-09-04-how-fresh-must-the-trap-be.md`,
whose grid was too coarse below `phi = 0.125` — which is where its entire result
turned out to live — and whose Result names this question.
**Companions:** 001 `2026-09-02-per-copy-vs-family-rate.md`, 002
`2026-09-04-conscription-vs-innate-silencer.md`.

## Question

003 found the element CONTROLLED at `phi = 0` and at no other point on its grid.
Two readings survive that result and **nothing in 003's data separates them**:

- **A limit artefact.** Control exists only where the trap reproduces the
  element's coordinate exactly. No biological cluster does that, so the
  controlled state is a mathematical corner and the model's central mechanic
  does not describe anything real.
- **A narrow band.** Control extends to some `phi > 0` and 003's grid, whose
  first step above zero was `0.125`, simply stepped over it.

**Is there a `phi > 0` at which this model controls the element, and if so, is
that band a property of the model or only a property of the horizon it was
measured at?**

The second clause is the part 003 could not have asked. It is the difference
between a band and a delay, and it is developed below because it changes what a
positive answer would even mean.

## Why it is worth asking

003 closed with a claim **against** the model's ambitions: "in this model that
conversion requires the trap to track EXACTLY, and it is gone by `phi = 0.125`."
That sentence is currently load-bearing for how the whole project reads, and it
rests on a grid whose resolution near zero is nil. 003 said so in its own Scope
section rather than repairing it with an unregistered finer sweep. This is the
registered repair.

It also matters which way it comes out. If the band is empty, the honest
position is that the sequence coordinate buys families and escape but not
control, and spec §3.3's third claim should be withdrawn. If the band exists but
closes as the horizon lengthens, the mechanic is a **delay** — the element is
not controlled, it is slowed — and that is a different and more interesting
claim than either reading above. Only a two-horizon design can tell those apart,
and 003 ran one horizon.

## What 003 established, and the one number it could not measure

Carried forward as fact, from `../../experiments/003-trap-fidelity.csv` (270
runs, all four manipulation checks passed, endpoints reproducing 002's committed
CSV exactly):

- CONTROLLED at `phi = 0` at all three ratios, 10/10 seeds, 600 generations.
- RUNAWAY at every `phi >= 0.125`, saturating past 1500 copies per genome by
  generation ~120–175.
- Silencing is **not** binary across the dial: mean silenced fraction at ratio
  3.33 runs 0.942 → 0.173 → 0.107 → … → 0.017. Partial fidelity buys partial
  silencing and no control at all.

The number 003 never measured is **where between 0 and 0.125 the outcome
changes**, because it has no grid point there.

## The mechanism this registration tests

### Self-coverage reach

A copy at coordinate `s`, captured at infidelity `phi`, deposits a repertoire
entry at `(1 - phi) * s`. That entry covers the capturing copy iff
`phi * |s| <= theta` — a **self-coverage reach of `theta / phi`** measured from
the ancestral sequence. At `phi = 0` the reach is infinite: the entry *is* the
copy's coordinate, so a captured copy is silenced by its own capture however far
its lineage has travelled. At any `phi > 0` the reach is finite.

### The fixed point: the reach must outrun the walk

`s` is a random walk. Daughters are placed at the parent's coordinate plus a
`N(0, sigmaS)` step (`sim/phases/transpose.ts:37`), and every copy is founded at
0, so a lineage's coordinate after `k` transposition events is distributed as
`N(0, sigmaS * sqrt(k))`. Control therefore requires the reach to exceed how far
the lineage actually gets — and how far it gets is itself conditional on being
controlled long enough to get there. **The edge is a fixed point, not a
threshold on an independent quantity.**

Measured in 003 at `phi = 0`, where the walk runs unimpeded for 600 generations,
the mean of the largest `|entry|` per run (which at `phi = 0` is the largest
`|s|` among captured copies):

| `theta/sigmaS` | mean max abs(s) at 600 gen | implied edge `phi* = theta / max abs(s)` |
|---|---|---|
| 2.00 | 18.678 | **0.0054** |
| 3.33 | 10.367 | **0.0096** |
| 5.00 | 6.211 | **0.0161** |

`theta` is 0.10 throughout. These three numbers are the quantitative content of
this registration, and they are stated before any run below `phi = 0.125` exists.

**On circularity, named rather than hoped away.** The constants come from 003's
own `phi = 0` cells, so they are not independent of 003. What makes this a
prediction rather than a curve fit is that it uses cells at `phi = 0` to predict
the location of an edge at `phi > 0` that 003 never observed, on seeds 003 never
ran. The failure mode this project has recorded before — a constant calibrated
from the artifact under test — would apply if the edge were fitted to the cells
it is then said to explain. It is not.

### The horizon is not a detail; it is half the question

If `max|s|` grows like `sqrt(k)` and `k` grows with generations, then `max|s|`
**grows without bound** and the reach `theta/phi` is fixed. For any `phi > 0`
there is then a horizon at which the walk outruns the reach. Under that reading
there is no band at all: there is a **delay**, longer for smaller `phi`, and
003's `phi = 0` result is the only genuinely controlled state because it is the
only one whose reach also grows without bound.

This is directly testable and it is the reason this registration runs two
horizons. Tripling the horizon should shrink the edge by roughly `sqrt(3)`:

| `theta/sigmaS` | predicted edge at 600 gen | predicted edge at 1800 gen |
|---|---|---|
| 2.00 | 0.0054 | 0.0031 |
| 3.33 | 0.0096 | 0.0056 |
| 5.00 | 0.0161 | 0.0093 |

Both columns fall inside the grid below, at every ratio. That is a design
requirement, not a coincidence: a grid that could only resolve one of the two
horizons could not answer the question.

## The two standing rules this registration must satisfy

Both are open ROADMAP items, and both were written because an earlier
registration here violated them. They are discharged explicitly rather than
implicitly:

1. **A grid on `s`-space parameters must be stated in the ratio.** `theta` and
   `sigmaS` are one axis: rescaling `(s, sigmaS, theta)` by any λ maps
   trajectories onto trajectories with the same RNG draws in the same order, so
   002's 9 registered points were 6 regimes. This grid is stated as
   `theta/sigmaS` throughout. `phi` is dimensionless and is therefore invariant
   under the same rescaling, so the `(ratio, phi)` plane is a genuine
   two-parameter grid — **except possibly for what secondary 3 tests**, below.
2. **A falsification clause must be the negation of its prediction, not one
   scenario that would falsify it.** 003's secondary 1 was two-sided, its clause
   covered only one side, the edge fell out the uncovered side, and the analysis
   code inherited the blind spot and printed HELD for a false prediction. Every
   clause below is written as the literal negation, and the analysis script must
   evaluate **the prediction**, with a positive control for each predicate
   asserted first.

## What is registered

### The criterion, carried from 003 unchanged

Three-way, mutually exclusive and exhaustive, per run, **evaluated at a stated
generation**:

- **EXTINCT** — `totalCopies == 0` at that generation.
- **RUNAWAY** — the run hit the saturation stop (copies per genome > 1500, half
  of `S`) at or before that generation.
- **CONTROLLED** — neither: alive at that generation, never saturated up to it.

A cell's outcome is the **modal** class over its 10 seeds; ties are reported as
ties and are not resolved in favour of either neighbour.

### Two horizons out of one run

Every grid run goes to **1800 generations** and its state is recorded at
generation **600** as well as at its stop. The saturation rule is unchanged, so
a run that saturates at generation 300 is RUNAWAY at both horizons, a run alive
at 1800 is CONTROLLED at both, and a run that saturates at generation 900 is
CONTROLLED at 600 and RUNAWAY at 1800 — which is the horizon-dependence signal.

This is sound only because the RNG stream does not depend on the horizon: a run
to 1800 passes through exactly the state a run to 600 reaches. **That is not
assumed, it is manipulation check 3.**

### The edge, defined before it is measured

At a given ratio and horizon, the **edge** is the largest grid `phi` whose cell
is CONTROLLED. The **edge interval** is the half-open interval from that `phi` to
the next grid point above it. If no `phi > 0` is CONTROLLED the edge is `0` and
the edge interval is `(0, 0.001]`.

---

> **PRIMARY registered prediction — the band is non-empty.** At every registered
> ratio, at horizon 600, at least one `phi > 0` in the grid is CONTROLLED.

**Falsified iff** at some registered ratio, no `phi > 0` in the grid is
CONTROLLED at horizon 600 — that is, the CONTROLLED set at that ratio is `{0}`
or empty. *(This is the literal negation. A CONTROLLED set of `{0}` is the
outcome 003 produced on its coarse grid; if it survives a grid three orders of
magnitude finer, "control requires exact tracking" stops being a resolution
artefact and becomes the finding.)*

> **SECONDARY 1 — and it is the decisive one: the band is a delay.** At every
> registered ratio, the edge at horizon 1800 is **strictly smaller** than the
> edge at horizon 600.

**Falsified iff** at some registered ratio the edge at horizon 1800 is greater
than or equal to the edge at horizon 600. *(Literal negation. If this holds, no
`phi > 0` is controlled in the limit and the band is a slowly-closing window;
if it fails, there is a horizon-stable band and the mechanic is real.)*

> **SECONDARY 2 — the edge sits where the reach meets the walk.** At every
> registered ratio, the horizon-600 edge interval **contains** `phi* = theta /
> max abs(s)`, with `max abs(s)` taken from 003's `phi = 0` cells: `phi*` =
> 0.0054 at ratio 2.00, 0.0096 at 3.33, 0.0161 at 5.00.

**Falsified iff** at some registered ratio the horizon-600 edge interval does not
contain that ratio's `phi*`. *(Literal negation. Registered weakness, stated in
advance: at ratio 5.00, `phi*` = 0.0161 sits a hair above the grid point 0.016,
so that ratio's test is decided by the narrowest margin of the three and a small
error in `max abs(s)` moves it across a grid line. This is the least
informative of the three ratios and is not to be quoted as if it were the
strongest.)*

> **SECONDARY 3 — `phi` is nearly a third name for the same axis, reversing
> 003's secondary 2.** The three values of `(theta/sigmaS) / phi_edge` at
> horizon 600 agree across the registered ratios to within a factor of 2 (one
> grid step).

**Falsified iff** the three values of `(theta/sigmaS) / phi_edge` span more than
a factor of 2.

### ⚠️ Evaluability precondition, registered before any data existed

**All three secondaries presuppose the primary at the ratio being scored.** If no
`phi > 0` is CONTROLLED at a ratio, that ratio's edge is 0, and then: secondary
1 compares 0 against 0 and reads FALSIFIED; secondary 2's edge interval is
`(0, 0.001]`, which contains no `phi*`, and reads FALSIFIED; secondary 3 divides
by zero. **Every one of those verdicts would be an artefact of the primary
failing, not a test of the secondary.**

So, registered here rather than discovered in the analysis: at any ratio where
the primary is falsified, the three secondaries are **NOT EVALUABLE at that
ratio** and must be reported as such — never as falsified. A secondary is
evaluated only at ratios where at least one `phi > 0` is CONTROLLED at horizon
600, and its verdict names which ratios it was evaluated on.

This is the third time this project has met the same defect: a check that
returns a verdict for a reason unrelated to what it tests. 003's secondary 2 was
reported NOT EVALUABLE for exactly this reason after the fact — `ratio/phi` was
infinite everywhere because the only CONTROLLED cells sat at `phi = 0`. 003's
Amendment 1 fixed a cross-world comparison of the same shape. Writing the
precondition down in advance is the only version of this that costs nothing.

**This deliberately reverses 003's secondary 2**, which predicted the boundary
would *not* sit at a constant `(theta/sigmaS)/phi` and was reported NOT
EVALUABLE because `ratio/phi` is infinite everywhere on 003's grid — the only
CONTROLLED cells were at `phi = 0`. The reversal is not a change of mind about
the data; it is a consequence of the mechanism, which 003 did not have when it
wrote that prediction. Under `phi* = theta / (K * sigmaS)` the quantity
`ratio/phi*` is just `K = max abs(s) / sigmaS`, whose measured values are 373.6,
345.6 and 310.6 — a spread of 1.20, comfortably inside a factor of 2.

**This is the least risky of the four predictions and is labelled so here rather
than discovered afterwards.** It is registered anyway because of what it would
mean: it says `phi` is not an independent axis but nearly a relabelling of the
ratio, which is the same collapse the `theta`/`sigmaS` ROADMAP item records, now
suspected in a third parameter. A grid that treats them as independent would be
making the 002 mistake again.

### Grid, seeds, horizon

    theta/sigmaS ∈ {2.00, 3.33, 5.00}                          all registered
    phi          ∈ {0, 0.001, 0.002, 0.004, 0.008, 0.016,
                    0.032, 0.064, 0.125}

`phi` is log2-spaced from 0.001 to 0.064, with two anchors: `phi = 0`, and
`phi = 0.125` rather than the sequence's own next point 0.128, so that both
anchors are **exactly** 003 grid cells and manipulation check 2 can compare
against committed data. The sweep spans a factor of 125 in `phi`, and its lowest
point sits at least a factor of 3 below every predicted edge at **both**
horizons (the smallest is 0.0031, at ratio 2.00 at 1800 generations), so a null
result cannot be attributed to the grid stopping too high — which is precisely
the criticism 003 earned.

The ratio is realised with `theta` pinned at **0.10** and `sigmaS` pinned at
**{0.05, 0.03, 0.02}**. `sigmaS` is pinned rather than derived as
`theta / ratio`, for the reason 003 records: the labels 3.33 and 2.00 are
rounded, `0.10 / 3.33` is `0.03003` rather than `0.03`, and deriving it would
put the cell a hair off 003's grid and silently break check 2. The exact ratios
are `2`, `10/3` and `5`.

**All three ratios are registered, including 2.00, which was exploratory in
003.** The exploratory label existed to stop 003 promoting a result on data it
had already seen. 004 tests that ratio on **new seeds**, in a **region of `phi`
003 never sampled**, against a **numeric prediction stated in advance**. That is
an out-of-sample test, not a promotion, and the distinction is recorded here so
it cannot be blurred later.

- **Grid:** 3 ratios × 9 `phi` × **seeds 3001–3010** × 1800 generations =
  **270 runs**. Seeds 3001–3010 are disjoint from 003's 2001–2010, 002's 1–10
  and the 002 pilot's 1001–1006.
- **Reproduction control:** 3 ratios × `phi ∈ {0, 0.125}` × **seeds 2001–2010**
  × 600 generations = **60 runs**, existing only to be compared against 003's
  committed rows.

Everything else pinned at 002's and 003's values, unchanged so the reproduction
control is exact:

    N = 300, S = 3000, c = 0.02, r0 = 0.2, rMax = 1, sigmaR = 0.05,
    v = 0.005, a = 0.0004, b = 0.00001, d = 0.0005, dTol = 0.002, t = 0,
    beta = 0.005, pDom = 0, wDom = 0.01, sexual = true, silencingOn = true

## Pre-specified outcomes, per cell

1. **Outcome class at generation 600** — counts of EXTINCT / CONTROLLED /
   RUNAWAY over the 10 seeds. **Primary.**
2. **Outcome class at generation 1800** — same counts. **Primary for secondary
   1.**
3. Copies per genome, at 600 and at stop.
4. Silenced fraction, at 600 and at stop.

Also recorded, descriptive and NOT tested: repertoire entries per genome, the
maximum `|entry|` (which is the walk's reach, and is the quantity secondary 2's
constants came from — recording it here lets 004 check whether 003's numbers
were themselves stable), captures and their mean displacement `|entry - copy.s|`,
saturation generation, extinction generation, and the maximum number of genomes
holding a repertoire.

## Manipulation checks — the experiment is void if these fail

1. **The composed loop is the shipped model.** At `phi = 0` the composed loop
   must reproduce `sim/step.ts`'s `stateHash` at every seed used, at a horizon
   short enough that no run has gone extinct. **Its positive control is reported
   with it:** the smallest surviving population at that horizon must be printed,
   so it is visible that no comparison was between two extinct worlds hashing
   identically. Carried from 002 and 003 unchanged; 003 ran it at 50
   configurations with a smallest surviving population of 3839 copies.
2. **The anchors reproduce 003 exactly.** At `phi ∈ {0, 0.125}`, all three
   ratios, **seeds 2001–2010**, the generation-600 record must equal the
   corresponding row of `../../experiments/003-trap-fidelity.csv` exactly on
   outcome class, copies per genome, silenced fraction, entries per genome,
   stopping generation, extinct, saturated, and whether a nonzero entry was ever
   seen. This is the strongest control available here, because the oracle is
   **already committed to the repository** and was written by a different
   runner. A resumed run must **re-compare** cached rows rather than skip them.
3. **The horizon extension is inert at generation 600.** For at least one seed
   at every ratio and at a `phi` strictly inside `(0, 0.125)`, a run to 1800 and
   an independent run to 600 must agree **bit-for-bit** on `stateHash` at
   generation 600. This is what licenses reading two horizons out of one run;
   without it the dual-horizon design is an assumption wearing a result's
   clothes. **And the horizon must actually be reached:** a run recording
   `stopped_at = 600` with **no stop reason recorded** is a silently truncated
   horizon, and would make secondary 1 unfalsifiable in the direction it
   predicts.

   > **Amendment 1 — 2026-09-05, made before any data existed and while the
   > runner was being written.** Check 3's second half first read: "for every
   > `phi = 0` cell, each run must either record generation 1800 or record a
   > saturation stop at a generation in `(600, 1800]`." **That form can fail for
   > a reason unrelated to what it tests.** A `phi = 0` run that legitimately
   > saturated at generation 400 on one of the new seeds would void the entire
   > experiment — but an early saturation is a *scientific* outcome, not an
   > instrument failure, and 004's seeds 3001–3010 are ones 003 never ran. What
   > the check exists to catch is a **truncated horizon**: the loop stopping at
   > the checkpoint because the checkpoint stopped it. The replacement fires only
   > on that — `stopped_at == 600` with no saturation recorded — and cannot fire
   > on a real early saturation, which is instead **REPORTED as a surprise**
   > alongside the check. Same defect class as 003's Amendment 1 and as this
   > registration's own evaluability precondition; third instance in this
   > project. Recorded here rather than under "Deviations" because it was made
   > **before any data existed**, which is the only time a registration may be
   > changed without the change being a deviation.

   > **Note on how 3a is implemented, added at the same time.** The 600-generation
   > comparison run must **not itself take a checkpoint**. If it did, both sides
   > of the comparison would execute the checkpoint code and any side effect of
   > taking a checkpoint would be present on both and cancel — the check would
   > pass on exactly the bug it exists to detect. The runner guards the
   > checkpoint with `horizon > CHECKPOINT`, so the comparison is genuinely
   > "with checkpoint" against "without". This is an implementation requirement
   > the registration did not state and now does.
4. **The dial is live at the smallest registered setting.** The risk unique to
   004 is that `phi = 0.001` is not a small perturbation but *no* perturbation.
   **Positive control asserted first:** at `phi = 0` mean displacement must be
   **exactly 0** and max `|entry|` must exceed `1e-9`. Then at every `phi > 0`:
   mean displacement must be **> 0**, and must agree with `phi * mean|s at
   insertion|` to within 1e-9. And at `phi = 0.001` specifically, the
   generation-600 `stateHash` must **differ** from the `phi = 0` run at the same
   ratio and seed — a dial whose smallest setting produces a bit-identical world
   is not a dial with a small setting, it is a dial with a broken one, and every
   cell below the edge would be a false CONTROLLED.

## Pre-specified analysis

The predictions are structural claims about a grid, so they are reported as
**counts with their denominators** — 10 seeds per cell — with Wilson intervals
on the CONTROLLED fraction, and no p-value. Following 002 and 003.

Each predicate — "is the edge interval containing `phi*`", "is the 1800 edge
strictly below the 600 edge", "do the three `ratio/phi_edge` agree within a
factor of 2" — is implemented as a named function in `docs/analysis/plot-004.R`
with **its own positive and negative controls asserted first**, before any data
is read, in the manner 003's `has_interior_edge()` was repaired to use. The
analysis script is committed **with the runner and before any data exists.**

**The analysis evaluates the prediction, never the falsification clause.** That
inversion is the specific defect 003's Result records.

**One pre-registered plotting decision, because it can encode a lie.** The
`phi` axis is logarithmic and `phi = 0` cannot be placed on it. `phi = 0` is
therefore drawn in a **separate narrow left-hand facet** labelled as exact, not
at some small positive position on the log axis — placing it at, say, 0.0005
would assert a location the point does not have and would visually interpolate
between `0` and `0.001`, which is exactly the inference this whole question
exists to avoid. Two panels, one per horizon; one series per ratio, reusing
`palette_003`/`shape_003` from `docs/analysis/theme.R` since the ratios are the
same three; predicted `phi*` marked per ratio. Every figure goes through an
independent adversarial critic before use, per the project rule — on 003 that
gate caught three rounds of defects, including one that put a fraction series
above 1.0, none of which were visible to the author.

## What "biologically reachable" would mean, and why no threshold is registered

The question names biological reachability and this registration deliberately
does **not** register a numeric threshold for it. The reference base does not
supply one: no source read for this project measures the fidelity with which a
piRNA cluster reproduces the sequence of the element it captured. Inventing a
cutoff now and testing against it would be a number I chose deciding the
project's headline claim.

What is registered is the measurement. What each answer buys, stated in advance:

- **Primary falsified** (no `phi > 0` controlled at any ratio, on a grid reaching
  0.001): control requires exact tracking. Spec §3.3's third claim should be
  withdrawn, and 003's Result stands as written rather than as provisional.
- **Primary holds, secondary 1 falsified** (a horizon-stable band): the mechanic
  is real at imperfect fidelity. The band's width in `phi` becomes the number the
  project has to defend, and finding a source that bounds cluster fidelity
  becomes a blocking ROADMAP item rather than an optional one.
- **Primary holds, secondary 1 holds** (a band that closes with the horizon):
  the model does not control the element at any imperfect fidelity — it delays
  it, for a time set by how long the walk takes to outrun the reach. This is
  neither of the two readings 003 left open, and it is the outcome the mechanism
  actually predicts.

## Scope, stated in advance

Three ratios, one base configuration, two horizons, ten seeds, nine points on one
dial. The dial is still **linear shrinkage toward the ancestral coordinate** —
one of several ways a trap could be stale, inherited from 003 because its
endpoints are exactly 002's two arms. A trap that decayed by accumulating
independent noise, or by losing entries, is a different experiment and is not
this one.

`sqrt(3)` is a leading-order expectation for the horizon effect, not a
registered quantity: the number of transposition events per lineage per
generation is only approximately constant, and the extreme-value factor over a
fluctuating copy number is not modelled. **Secondary 1 registers the direction,
not the factor.** The predicted 1800-generation column above is stated to show
the grid can resolve it, and is explicitly not a prediction under test.

1800 generations is three times 003's horizon and is still finite. A band that
survives 1800 is not thereby shown to survive forever; it is shown not to close
between 600 and 1800. That is what the design can support and it is what
secondary 1 is worded to claim.

## Deviations

None yet. Any change made after data exists is recorded here, with its date and
reason. A change made **before any data exists** is recorded inline as an
amendment, as 003's Amendment 1 was, and is not a deviation.

## Result

Not yet run. This registration was committed alone, before any runner existed.
