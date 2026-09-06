# Transposons as genome ecology — ROADMAP

**Canonical for "what phase, what's next".** If a later document supersedes this
one, banner this file and redirect from it in the same commit.

## Where this stands

➡️➡️ **THE DESIGN IS DONE AND LIVES IN
[`superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`](superpowers/specs/2026-09-02-transposon-genome-ecology-design.md).**
That document is now canonical for the model, the verb, the screen, validation and
layout. **This roadmap is canonical only for what remains unbuilt** (the checklist
at the bottom). Where the two disagree, the spec wins.

Settled there, and **superseding the two sections immediately below**:

- **The unit is the COPY**, not the family and not the host. Rate is a per-copy
  heritable trait; "family" is emergent, never declared. The reason is mechanical —
  it is the only candidate with a **variation generator**, and "rate is heritable"
  is meaningless without one. See spec §2.
- **The verb is PERTURBING THE WORLD, never the element.** You do not choose a
  transposition rate; you change the conditions under which heritable rates are
  selected. The constraint below stops being an obstacle and becomes the reason the
  toy works. See spec §4.
- **Shape:** a poke-and-watch toy, minutes per session, playable-first with
  scientific correctness as the floor. One TypeScript core, browser UI, node
  runners. See spec §1 and §7.

~~**Nothing is designed yet.**~~ Superseded 2026-09-02. ~~Scaffolded 2026-09-01;
still no code, no runner, no measurement~~ — superseded again 2026-09-03: the
model, the toy, all seven guards, one registered question and its result are
built and committed on `impl/sim-core-v1`. See the checklist at the bottom.

## The constraint that shapes everything else

⚠️⚠️ **The player moves a LINEAGE'S EVOLVABLE STRATEGY, not an element making
choices. Transposition rate is HERITABLE, NOT A DECISION.**

This is not flavour. It rules out the most obvious design — a player who chooses
when to copy — because that models something biology does not do. The verb has to
be "carry a strategy and be selected", and finding a verb that is both accurate
and playable is the central design problem, not a detail to settle later.

## The first decision — ⛔ CLOSED 2026-09-02: the answer is the COPY

**Kept for the reasoning, not as an open question. Decided in spec §2.**

⚠️ The table below records the framing at filing time, and **its verdict on the
first row was wrong**. It rejected copy-as-unit because "the strategy is invisible
at this scale" — but under a poke-and-watch toy the strategy _is_ the distribution
over copies, and a distribution renders trivially. What is invisible in one copy is
visible in ten thousand. The row that actually failed was **element FAMILY**: a
family-level scalar rate has no within-family variation, so rate changes without
ever evolving, which guts the constraint above.

⚠️ **What is the individual?** Three candidates, and the choice is not obvious:

| unit           | what a "player" then is                | what gets lost                            |
| -------------- | -------------------------------------- | ----------------------------------------- |
| element copy   | one insertion's fate                   | the strategy is invisible at this scale   |
| element FAMILY | a lineage with a heritable rate        | within-family variation                   |
| genome/host    | the suppressor's side of the arms race | the parasite is no longer the protagonist |

`deep-sim-design` covers exactly this (individual vs field) and should be run
before committing.

## Mechanics identified at filing

- **Frequency-dependent payoff against TWO opponents** — host silencing and rival
  families. Not one arms race, two, and they interact.
- ⚠️ **piRNA clusters are built from captured element fragments**, so inserting
  into one conscripts you into your own suppression. **The trap is made of you.**
  This is the mechanic most worth getting right and most likely to be wrong if
  taken from a summary rather than the pathway.
- **Domestication as an ALTERNATE WIN** — syncytin, RAG. Ceasing to be a parasite
  is a way to persist. A design with only "spread or die" throws this away.

## Should double as a research asset

TE data is open and abundant, so the model can be checked against reality rather
than only against itself: Petersen arthropod repertoires, Asparagales,
**Dfam/Repbase**.

➡️ **ALL CHECKED LIVE 2026-09-02 — `REFERENCES.md` §8 supersedes this list.**
**Dfam 4.0** (CC0, open API, 7.6M families / 6,549 taxa) is the usable one.
**Repbase is CLOSED** and its licence forbids redistribution in a public artifact
— drop it. **Asparagales resolves** to Hertweck 2013. The widest validation arm is
Osmanski et al. 2023 (248 mammal genomes, deposited into Dfam, so CC0).

## Prior grounding that already exists — read before re-running it

➡️ **SUPERSEDED IN PART by [`REFERENCES.md`](REFERENCES.md) (built 2026-09-02).**
That file carries 38 registry-verified works (42 DOIs), the null model this roadmap lacks
(Charlesworth & Charlesworth 1983), a calibration number for the piRNA trap
(cluster size >0.2% of genome), and a **re-derived artifact-gap finding that
contradicts the second bullet below**. Read it before the brainstorm.

A sweep on **2026-07-31** (`bio_sim_candidates_grounded_2026-07-31.md` §1, in the
`-home-mjarnold` memory dir) already covered this candidate. Two results the rest
of this roadmap does not carry, both worth having before the brainstorm:

- ⚠️⚠️ **"Genome as ecosystem" is the FIELD'S OWN framing, not a fresh lens.**
  Brookfield, _Nat Rev Genet_, "The ecology of the genome"; PMID 17188821; PLOS
  Genet 2021 on the maize TE genomic ecosystem. Pop-gen is mature here too
  (Bourgeois & Boissinot 2019, Blumenstiel 2019, Hua-Van 2011, Lü & Clark 2009 on
  piRNA). That sweep recorded pitching the framing as its own and being wrong —
  **the concept gap is closed, so novelty cannot be claimed there.**
- ⛔ **STALE — this bullet's conclusion no longer holds. See `REFERENCES.md` §7.**
  It said the surviving ARTIFACT gap was wide, naming only `SimulaTE`
  (10.1093/bioinformatics/btx772, reads for benchmarking) and `VisualTE` (a static
  GUI). Both check out, but the sweep **missed SLiM 4** (Haller & Messer 2022, 378
  cites — a forward simulator with a GUI already used for TE work), and **three
  more TE simulators have appeared since**: TESS (2025-06), TEvarSim (2026-01),
  TEgenomeSimulator (2026-03). The defensible gap is now much narrower — every one
  of these is a batch instrument (parameters in, dataset out), none is watchable
  mid-run, perturbable, or playable. That is a claim about INTERACTION MODE, not
  capability, and it is the only version the evidence supports.
- It also named a counterfactual knob with real cross-taxon measurement behind it:
  **disable silencing → genome bloat.**

⚠️ **Neither bullet discharges the prior-art item below.** Both are >30 days old,
and the artifact-gap one is an absence claim — it has to be re-derived against a
live registry and the null stated as "checked HERE", naming where.

## Not yet done

- [x] **DONE 2026-09-02** — Brainstorm the design → spec at
      `superpowers/specs/2026-09-02-transposon-genome-ecology-design.md`
- [x] **DONE 2026-09-02** — Unit of individuality settled: **the COPY**, because it
      is the only candidate carrying a variation generator (spec §2)
- [x] **DONE 2026-09-02** — Player verb settled: **perturb the world, never the
      element** (spec §4). Rate is never chosen, only selected
- [x] **DONE 2026-09-02** — Write the implementation plan
      (`superpowers/plans/2026-09-02-transposon-genome-ecology.md`, 20 tasks)
- [x] **DONE 2026-09-03** — Build `sim/` core + guards 1–7, then `web/`. All 20
      tasks of the plan are committed on `impl/sim-core-v1`. `sim/` is 14 files;
      all seven guard files exist under `tests/guards/`; `web/` is 10 files. Suite
      is 20 files / 177 tests, `tsc --noEmit` and `vite build` clean.
- [x] **DONE 2026-09-03** — Guards **8 (domestication)** and **9 (tolerance)**, the
      two spec-claimed mechanisms a phase-coverage audit found with NOTHING
      asserting anything about them. Before this, `pDom = 0` in all six scientific
      arms and `t = 0` in all seven **and** in `defaultParams` **and** in
      `TOY_DEFAULTS`, so `domesticate` never fired inside a guard and the tolerance
      branch of `damageLoad` never executed in a population run anywhere in the
      repository. `tests/guards/domestication{-arm.ts,.test.ts}` +
      `scripts/explore-domestication.ts`, `tests/guards/tolerance{-arm.ts,.test.ts}` + `scripts/explore-tolerance.ts`. `sim/` is byte-identical: these are guards
      over existing behaviour, both golden pins unmoved. ⚠️ Guard 8 shipped with a
      NEGATIVE finding about the shipped defaults — see the two new open items
      below.
- [x] **DONE 2026-09-02** — Read Charlesworth & Charlesworth 1983 in full, not the
      abstract → [`charlesworth-1983-equilibrium.md`](charlesworth-1983-equilibrium.md).
      Unblocks guard 1. ⚠️ **Guard 1 is re-specified**: it asserts the paper's
      qualitative predictions, not a numeric equilibrium. Our haploid recombination
      deduplicates sites shared by both parents, a copy sink the diploid null model
      does not have, so the analytic constant does not transfer. ⚠️ **The figures
      that stood here — "no-selection 150, linear 124–148, quadratic 3–9" — are
      SUPERSEDED.** They were taken on commit `c1bc201` at an unrecorded `N` with
      a mutation still in the tree. Re-measured at `N = 200`, five seeds,
      generation 300: no-selection **308.2**, linear **299.1**, quadratic
      **26.8**. The RATIOS are what guard 1 asserts and they reproduce; the
      absolute numbers did not. Canonical definition:
      `tests/guards/equilibrium-arm.ts`.
- [x] **DONE 2026-09-02** — Prior-art check against live registries, null stated as
      "checked HERE". OpenAlex + WebSearch + GitHub + CRAN + PyPI + itch.io + Steam,
      all named in `REFERENCES.md` §7. **The interaction-mode gap SURVIVES**: no
      watchable / perturbable / playable TE ecosystem exists on any of them. Not
      checked: Zenodo, SourceForge, Bioconductor, app stores, non-English sources.
- [x] **DONE 2026-09-02** — "Blumenstiel 2019" **is real and cleared to cite**:
      _Genes_ 10(5):336, 10.3390/genes10050336. Keyword search missed it twice;
      author-scoped lookup found it at once (`REFERENCES.md` §9). ⚠️ Keyword search had
      returned a _plausible substitute_ by different authors — a near-miss reads as
      confirmation, so **use author-scoped lookup before calling any citation missing**.
- [x] **DONE 2026-09-02** — Dfam / Repbase access terms and the Asparagales pointer,
      all checked live (`REFERENCES.md` §8). **Dfam 4.0 is CC0 with an open API and is
      the one usable option; Repbase is CLOSED and its licence forbids redistribution
      in a public artifact, so stop naming it.** ⚠️ **The Asparagales entry was a FALSE
      NULL** — "no corresponding resource located" was a failure to look, not an
      absence: Hertweck 2013 (`10.1139/gen-2013-0042`) is exactly the pointer. Best
      validation set is Osmanski et al. 2023, 248 mammal genomes, deposited into Dfam.
- [x] **DONE 2026-09-02** — First registered question + pre-registration, written
      before any runner existed. Pre-registration `f5ae5b1`
      ([`pre-registrations/2026-09-02-per-copy-vs-family-rate.md`](pre-registrations/2026-09-02-per-copy-vs-family-rate.md));
      runner and result `4995f3b`
      (`experiments/001-per-copy-vs-family-rate.ts`). The result reproduces from
      its committed CSV.

- [x] **ANSWERED 2026-09-04 — question 002, conscription versus an innate
      silencer. THE REGISTERED PREDICTION WAS FALSIFIED.** Pre-registration
      `82ab678`
      ([`pre-registrations/2026-09-04-conscription-vs-innate-silencer.md`](pre-registrations/2026-09-04-conscription-vs-innate-silencer.md)),
      committed alone before any runner existed; pilot `58b0656`; runner
      `experiments/002-conscription-vs-innate.ts`, 180 runs, all four
      manipulation checks passed. Figure `docs/analysis/fig-002-viability.png`.
      Registered: **no grid point with both arms viable.** Measured: **3 of 9
      points, at `theta/sigmaS` = 3.33 and 5.00.** The secondary prediction held
      (arm B silencing ≤ 0.022 wherever arm A is viable).
      **The pilot's grid floor was `theta = 0.15` and the registered grid went to
      0.10 — the falsification lives in the range the pilot never swept.**
      Registering wider than the pilot is the only reason it was found.
      ⚠️ **`VIABLE` COULD NOT DISCRIMINATE, AND IT WAS THE REGISTERED CRITERION.**
      At both both-viable regimes every arm-B run hit the saturation stop
      (1580–1593 copies/genome, ~2% silenced) while arm A sat at ~200 and 95%
      silenced. "Controlled at equilibrium" and "exploding into the stopping
      rule" score the same. This does not rescue the prediction — it was stated
      on that criterion — but it is what 003 must fix.

- [ ] ⚠️ **THE `theta` AND `sigmaS` AXES ARE ONE AXIS, AND THE REGISTRATION BUILT
      A 3x3 GRID ON THEM.** `s`-space carries no constant but `theta` and
      `sigmaS`: `s` is made at `sim/phases/transpose.ts:37`, compared only at
      `sim/silencing.ts:86-87`, elsewhere only copied, and every copy is founded
      at 0. Rescaling `(s, sigmaS, theta)` by any λ maps trajectories onto
      trajectories with the same RNG draws in the same order. Measured: the three
      duplicate pairs are identical on all 10 seeds in both arms, exact, and
      `plot-002.R` asserts it behind a positive control. **So the 9 registered
      points are 6 regimes**, and 002's own §2 had `k* = (theta/sigmaS)²` in hand
      while treating the axes as independent. Any future grid on `s`-space
      parameters must be stated in the ratio. **Question 003 is the first grid
      to comply**; the rule stays open because it binds every later grid too.

- [x] **ANSWERED 2026-09-04 — question 003, how fresh must the trap be? THE
      TRAP MUST BE PERFECTLY FRESH, AND MY OWN FALSIFICATION CLAUSE COULD NOT
      SEE THE FALSIFICATION.** Pre-registration `126e3bd`
      ([`pre-registrations/2026-09-04-how-fresh-must-the-trap-be.md`](pre-registrations/2026-09-04-how-fresh-must-the-trap-be.md)),
      committed alone before the runner existed; check-3 amendment `778fe9c`,
      made before any data; runner + analysis `e0af8b2`. 270 runs,
      `experiments/003-trap-fidelity.csv`. Figures
      `docs/analysis/fig-003-fidelity.png` and (unregistered addendum)
      `docs/analysis/fig-003-silencing.png`.
      **CONTROLLED occurs at `phi = 0` and nowhere else, at all three ratios.**
      At `phi = 0` the element holds 197-345 copies/genome at 93-95% silenced for
      600 generations; at the next grid step it saturates past 1500 by generation
      ~120-175, every ratio, every seed.
      ⚠️ **SECONDARY 1 IS FALSIFIED AND ITS ATTACHED CLAUSE NEVER FIRES.** The
      prediction was "some `phi` in (0,1) is CONTROLLED"; the clause was
      "falsified if `phi = 0.875` is CONTROLLED", which covers only the edge
      being too HIGH. The edge fell BELOW the grid's first step. A falsifier that
      detects only one of the two directions its prediction can fail in — the
      signature defect, in the falsifier itself. The first `plot-003.R` encoded
      the clause rather than the prediction and printed HELD for a false
      prediction; fixed, with a positive control on the predicate.
      ⚠️ **THE PRIMARY HELD BUT IS WEAK**: `{0}` is trivially a down-set, so it
      cannot distinguish a knife-edge from a broad band — the question it is
      named after.
      **Mechanism:** self-coverage reach is `theta/phi`, INFINITE at `phi = 0`
      and 0.8 at `phi = 0.125`, while `|s|` wanders to ~10. So the edge sits near
      `phi ~ 0.01`, an order of magnitude below the grid — POST-HOC, 004 must
      register it before testing.
      **Manipulation check 2 is the strongest control built so far:** both dial
      endpoints reproduce 002's committed CSV EXACTLY on 002's own seeds. All
      four checks were seen to FAIL against three targeted mutants before being
      trusted.

- [ ] ⚠️ **A FALSIFICATION CLAUSE MUST COVER EVERY DIRECTION ITS PREDICTION CAN
      FAIL IN.** 003's secondary 1 is the instance: the prediction was
      two-sided, the clause was one-sided, and the analysis code inherited the
      clause's blind spot. Rule for every future registration here: write the
      falsifier as the negation of the prediction, not as one scenario that
      would falsify it, and have the analysis evaluate THE PREDICTION.

- [x] **ANSWERED 2026-09-05 — question 004, a band or only a delay? THE BAND IS
      REAL AND IT IS A DELAY.** Pre-registration
      `docs/pre-registrations/2026-09-04-a-band-or-only-a-delay.md` (committed
      alone at `cec9955`, amended `5468d97`, both before any runner). Runner
      `experiments/004-fidelity-band.ts`, analysis `docs/analysis/plot-004.R`,
      both committed at `9201d74` before any data. Data
      `experiments/004-fidelity-band.csv` (270 runs) and
      `experiments/004-reproduction-control.csv` (60). Figure
      `docs/analysis/fig-004-band.png`.
      All four manipulation checks passed, including the strongest: `phi = 0` and
      `phi = 0.125` reproduce 003's committed CSV **exactly** on 003's own seeds.
      ⚠️ **003's HEADLINE WAS A RESOLUTION ARTEFACT.** Control reaches
      `phi = 0.016` at 600 generations, 10/10 seeds at every ratio — four
      doublings above 003's first grid step, which is why 003 saw control only at
      exactly 0. PRIMARY HELD.
      ⚠️ **BUT THE EDGE MOVES WITH THE HORIZON: 0.016 at 600 generations, 0.004
      at 1800.** SECONDARY 1 HELD at every ratio. It is a delay, not a band.
      ⚠️⚠️ **SECONDARY 3 IS FALSIFIED AS REGISTERED AND THE VERDICT DOES NOT
      SURVIVE INSPECTION — 004 DOES NOT RESOLVE IT.** Measured
      125.0 / 208.3 / 312.5, spread 2.50x. But `phi_edge` is the same grid point
      at all three ratios, so that spread is IDENTICALLY the ratio spread
      (5.00/2.00 = 2.50) and carries no information; and the estimator is
      quantised to a factor of 2 while the registered tolerance IS a factor of 2.
      Scored on the post-hoc power-law edges the same quantity spans 1.75x and
      HOLDS. **The verdict flips with the estimator.** The first draft of the
      Result read FALSIFIED as settling the matter against me and for 003's
      secondary 2; that reading is retracted. Whether `phi` is an independent
      axis is UNRESOLVED. Secondary 2, by contrast, is falsified robustly (all
      three `phi*` miss by 1.8x-3.8x under the finer estimate too).
      ⚠️ **THE MECHANISM IS REFUTED ON ITS OWN DIAGNOSTIC.** It said control needs
      reach `theta/phi` > wander `max|s|`. At ratio 2.00, `phi = 0.004`: reach
      25.0 against wander 60.8, CONTROLLED 10/10. Also `max|s|` grows LINEARLY in
      `t` (18.678 -> 61.29 from 600 to 1800 generations, factor 3.28), not as
      `sqrt(t)`. SECONDARY 2 FALSIFIED.

- [x] **ANSWERED 2026-09-05 — question 005, does the delay diverge or is there a
      floor? THERE IS NO FLOOR ABOVE `phi = 0.002`, AND THE PUBLISHED LAW DOES
      NOT PREDICT WHEN.**
      [`pre-registrations/2026-09-05-does-the-delay-diverge.md`](pre-registrations/2026-09-05-does-the-delay-diverge.md),
      registered alone before any runner; runner + analysis committed together
      before any data; 243 runs, **all seven manipulation checks passed**,
      including 90 control runs reproducing 004's committed CSV exactly — on both
      records for the 60 non-saturating ones; the 30 at `phi = 0.125` saturate
      before generation 600, so their two records are one record checked twice and a horizon-8000 run reproducing its generation-600 and -1800
      hashes. **150/150 saturated, 0 censored, 0 extinct.**
      PRIMARY **HELD**, SECONDARY 1 **FALSIFIED**, SECONDARY 2 **HELD**,
      SECONDARY 3 **HELD** — the one combination the registration named in
      advance as carrying two bits rather than one.
      Deviations 1-4, all made before any data and all forced by the mutation
      table, are in the registration — **plus Deviation 5 (figure spec) and
      Deviation 6 (the ANALYSIS: four verdict-path functions changed after the
      data existed), both POST-DATA and both marked as such**, covering the
      figure spec (no tolerance bands on figure 1; a
      ratio axis instead of the registered log-residual; both figures faceted, where
      the spec says three ratios on one panel).

- [ ] ⚠️⚠️ **`t_sat` IS NOT A POWER LAW IN `phi`, AND THE EXPONENT YOU MEASURE IS
      A PROPERTY OF THE WINDOW YOU FIT IN.** 004 fitted `phi` in [0.008, 0.125]
      and got `a` = 0.73; 005 fitted [0.002, 0.0453] and got **0.87** — a gap of
      0.132-0.139, **3.2-3.8 standard errors** once both fits' errors are counted (5.1-7.3 treating
      004's exponent as exact; an earlier draft said "about seven"). Both fits have R² >= 0.993,
      and **both leave a convex residual pattern at 1.9-2.9x the noise floor** —
      `+ − − − +` at 004's three ratios and at 005's 2.00 and 5.00, with 005's
      3.33 showing `+ − − 0 +` (its mid-cell at +0.04%, inside its own SEM).
      ⚠️ An earlier version of this line claimed the identical sign sequence at
      all three; that was false for 005. Against its own refit 005's worst
      cell deviates 5.0-7.8%; against 004's law, 43%. So the whole discrepancy is
      one exponent — the law's SHAPE (a shared exponent, ratio entering only
      through the prefactor) survives — but the number is not a property of the
      system. **005's exponent will not extrapolate either.** A question 006 that
      froze `a = 0.87` and tested below 0.002 should expect to falsify it exactly
      as 005 falsified 004. **The next registration must test a functional FORM,
      not refit the same one on a third window.** Declaring the corrected
      exponent the answer is the precise mistake 004 made.

- [ ] ⚠️ **A HORIZON SIZED FROM THE MODEL UNDER TEST INHERITS THAT MODEL'S
      ERROR.** 005 set every horizon at >= 1.75x the **predicted** `t_sat` and
      called that the headroom that made the "too late" direction observable. The
      prediction was 43% low, so the realised headroom at `phi = 0.002` was
      **1.31x, not 1.80x** like for like (1.21x is horizon over the worst observed
      SEED; 1.80x is horizon over the PREDICTED cell mean — two different bases), and the worst SEED consumed **82% of its horizon** (6593/8000); the worst cell MEAN
      consumed 76%.
      At +80% instead of +43% the cells would have censored and the falsified
      prediction's magnitude would have been unmeasurable. The sizing rule is
      circular: it assumes the thing being tested. Size a horizon from the
      model's **worst plausible error**, which here was knowable in advance from
      004's own residual structure.

- [ ] ⚠️ **A GUARD THAT CHECKS SOME OF WHAT IT IS TRUSTED FOR IS THE SAME DEFECT
      AS ONE THAT CHECKS NONE — AND THIS ONE FAILED TWICE THE SAME WAY.** 005's
      contrast guard (a) measured the RAW hex while the figure composited over
      white, passing at 6.49/5.80/4.68 while the marks it protected rendered at
      1.26/1.25/1.23; then, fixed for alpha, (b) still looped over `palette_003`
      only, so the two tolerance fills — the most load-bearing marks on the
      verdict figure — went unchecked at 1.12:1 vs white and **1.014:1 vs each
      other**. A colour guard must enumerate **every colour handed to any scale**,
      at the alpha it is drawn with. Related: `theme.R`'s claim that darkening
      `palette_003` fixed the deuteranopia collapse was FALSE — 2.00 vs 3.33 collapses under
      Viénot (no specific ratio is quoted: two implementations disagreed, 1.02:1
      against 1.71:1, so the number is not established — the collapse is); darkening fixed contrast vs WHITE, which
      is a different quantity from contrast vs EACH OTHER.

- [ ] ⚠️ **THE "NO MARK AT AN UNMEASURED LEVEL" RULE APPLIES ON BOTH AXES, AND A
      CAPTION MUST NAME A CUE THAT ACTUALLY RENDERS.** Two 005 figure defects,
      both caught by review, both of classes this roadmap already carried.
      (i) The rule was enforced on y and then the tolerance was drawn as a
      continuous rect across x, spanning `phi` where no tolerance was registered
      and swallowing two 004 points, which then read as having passed a test they
      were never subject to. (ii) A caption said "open marks are 004's" beside
      `fill = NA` on shapes 15/16/17 — fill is a **no-op** on those glyphs, so
      there were no open marks. The previous review round had flagged the
      previous caption for the same lie; the wording was changed and the
      rendering was not. Use `shape_003_open`.

- [x] **THE 005 FIGURE GATE IS CLOSED AT 29 ROUNDS — and the reason to stop is
      evidence, not fatigue.** Rounds 23-29 found **zero** defects in the shipped
      figures or verdicts: every round independently recomputed the science from
      the CSV and reproduced it exactly, and every finding was a guard whose
      SCOPE excluded something it was trusted for. That is a real class of defect
      and the guards are much stronger for it — seven numbered guards now, plus
      the cell set, both x axes, the legend, the strips, text contrast, clipping
      on both axes, and every marker constant measured by rendering it. But the
      frontier does not close: any finite guard set has an edge, and a reviewer
      editing the source can always find it. The stopping rule is that the
      ARTIFACT is correct and independently reproducible, not that no further
      guard could be written.

      ⚠️⚠️ **THE LESSON WORTH CARRYING: A FIX RELOCATES THE HOLE UNLESS IT CLOSES
      A CLASS.** Seven times in this arc a fix moved the defect instead of
      removing it — asserted `caps` when the reader sees the built segment;
      measured px-per-decade and left px-per-size-unit asserted; closed the set
      of LAYERS and left the set of AESTHETICS open, then the set of CELLS;
      clipped y and left x; bound one figure's y axis and left both x axes;
      resolved parent theme elements and never the children; re-derived a guard's
      VALUE column while its KEY SET still came from the plotted frame. What
      works is a CLOSED manifest that fails on anything unaccounted, not a list
      of what you remembered.

      ⚠️ **AND AN EXPECTATION MUST BE INDEPENDENT OF WHAT IT CHECKS.** Twice a
      guard's expected value was computed from the very object under test, so
      both sides moved together and the check passed: `xend` derived from
      `CAP_W`, and figure 1's expected y being `measured$t_sat` itself. The tell
      is that the guard cannot fail when you edit the thing it names.

      ⚠️ **The last defect of the arc I found by reading the script's own
      stderr**, not from a review: `assert_text_fits` measured on a device that
      could not encode the em-dashes in its own titles, printing `mbcsToSbcs: dot
      substituted` on every run for 29 rounds — under-measuring the text, in the
      direction that lets a clipped title pass — while every reviewer watched the
      warning scroll past.

- [ ] **RE-RENDER `fig-001` … `fig-004` UNDER THE CURRENT HOUSE STYLE.** 005's
      review changed `theme.R` materially — the gridline went from `grey90`
      (measured 1.26:1, under this project's own 3:1 floor) to `#8c95a0` at
      `linewidth 0.4`, and `contrast_ratio()` gained the `alpha` argument
      without which every earlier contrast check measured a colour the figure
      never drew. The four committed figures predate all of it, so "ONE house
      style per project" is currently false: 001-004 are in the old style and
      005 in the new. Re-running each `plot-00N.R` is the whole fix; the
      question is whether the earlier Results' figure-review findings still
      hold once the grid changes under them.

- [ ] ⚠️ **A GUARD INHERITED FROM THE PREVIOUS EXPERIMENT IS NOT AUTOMATICALLY
      LOAD-BEARING IN THIS ONE — MUTATE IT AND FIND OUT.** 005 carried 004's
      `horizon > CHECKPOINT` checkpoint guard forward with a comment explaining,
      correctly, why 004 needed it, and a registered mutant claiming check 3
      would catch its removal. **The mutant SURVIVED**: check 3's three
      comparisons still matched 004's committed hashes exactly. The guard is
      inert in 005 for a structural reason — no grid horizon equals a checkpoint,
      and the control run's 1800-checkpoint is provably identical to its final
      record — and it was inert because 005's check 3 compares against a
      COMMITTED FILE where 004's check 3a compared against a freshly-run short
      arm. The prose was true about 004 and false about the experiment shipping
      it. The rule: when a guard is copied forward, the mutant that justified it
      must be re-run, not re-quoted; and when it survives, replace the table row
      with the hazard the check actually covers here (for 005, horizon-dependence
      in the trajectory — one extra RNG draw on any run longer than the control
      horizon, invisible to check 2 by construction, caught by check 3 on all
      three comparisons). **Nothing in the experiment had tested the determinism
      doctrine's own failure mode until that replacement.**

- [ ] ⚠️ **A CHECK CAN BE PERMANENTLY SHADOWED BY AN EARLIER ONE AND LOOK
      TESTED.** 005's "dial applies half of `phi`" mutant is registered against
      check 4a but is caught by check 2, which runs first and whose control cells
      are dial cells — so check 4a never executes on it. Re-running the same
      mutant with check 2 switched off produces 9 violations reading "the dial is
      live but MIS-SCALED", so 4a has real power; it simply never gets to
      demonstrate it. The rule: if a mutant is caught by an EARLIER check than
      the one it was written for, the intended check is still untested — isolate
      it and re-run, or admit the check is unexercised.

- [ ] ⚠️ **THE FIX FOR A COARSE GRID IS USUALLY NOT A FINER GRID — IT IS TO STOP
      SCORING THE COARSENED OBSERVABLE.** This supersedes the prescription this
      roadmap carried until 2026-09-05 ("use a grid finer than a doubling so the
      ratio-dependence is resolvable at all"), which was the wrong repair.
      004's secondary 3 scored `ratio/phi_edge`, where `phi_edge` was located by
      **bracketing on a doubling grid**, so the estimator's resolution was a
      factor of 2 and the effect was 1.43x. But `t_sat` is a **continuous**
      observable measured on the same runs, and the same ratio effect in it is
      1.26x–1.33x at **z = 6.6 to 11.7 in every one of the five cells** — it was
      decisively resolved all along. The edge is a monotone transform of `t_sat`
      (`spread_edge = spread_tsat^(1/a)`), so nothing was missing from the data;
      roughly an order of magnitude of resolution was thrown away by pushing a
      continuous measurement through a threshold. **Before buying more runs to
      resolve an effect, check whether a continuous observable already in the CSV
      resolves it for free.** 005 scores `t_sat` directly and never brackets an
      edge.

- [ ] ⚠️ **A HIGH R² IS NOT EVIDENCE THE FUNCTIONAL FORM IS RIGHT — COMPARE THE
      RESIDUALS TO THE SAMPLING NOISE.** 004 reported R² ≈ 0.994 and called the
      power law "clean". Its residuals are 2.8x the SEM of the cell means and
      carry the same sign pattern at all three ratios, which is misspecification,
      not scatter. R² measures variance explained against the spread of the
      predictor, which a wide log-spaced grid makes large no matter how wrong the
      shape is. The rule: whenever cell means have a measurable standard error,
      report **mean |residual| / mean SEM** beside R², and treat anything above
      ~1.5 as structure the model is missing.

- [ ] ⚠️ **A DEFECT FIXED AT THE INSTANCE COMES BACK AT THE CLASS.** 004's
      figure asserted control across the un-measured bracketed interval by
      drawing a line at fraction 1.0 through it. That was found, named in the
      Result's own defect log, and fixed by removing `geom_step` — and then
      returned two cuts later as a `geom_rect` whose top edge was also at
      fraction 1.0. The rule: when a defect is found, state the CLASS ("no mark
      may sit at the controlled level inside the bracketed interval") and grep
      for every geom that can produce it, rather than editing the one that did.

- [ ] **BEFORE REGISTERING MORE THAN ONE PREDICTION, CHECK THEY ARE NOT
      REPARAMETERISATIONS OF EACH OTHER.** 004's instance: secondary 2 asked
      whether `phi*` falls in the observed edge cell, secondary 3 whether the
      three `ratio/phi_edge` agree. Algebraically
      `K_obs/K_pred = phi*/phi_edge` exactly, and the measured columns are
      identical to three decimals (0.335 / 0.603 / 1.006). Four registered
      predictions carried three bits, and the same ratio-5.00 near-hit appeared
      in both as if it were two independent confirmations. The inflation flatters
      whichever way the result goes — here a falsification, which flatters the
      write-up rather than the model, and is no more acceptable for that.

- [ ] ⚠️ **A GRID THAT DOUBLES CANNOT MEASURE AN EFFECT SMALLER THAN A
      DOUBLING, AND WILL REPORT IT AS ZERO — AND A VERDICT SCORED ON SUCH A GRID
      CAN FLIP WITH THE ESTIMATOR.** 004's instance is the sharpest available:
      the edge's ratio-dependence is 1.43x against a 2x grid step, so three
      genuinely different edges were recorded as one identical value; the
      quantity secondary 3 tested then reduced to the ratio spread itself
      (exactly 5.00/2.00) and carried no information; and re-scoring the SAME
      DATA on a finer edge estimate turns FALSIFIED into HELD. The registered
      tolerance was a factor of 2 and the estimator's own resolution was a factor
      of 2 — a test cannot resolve an effect the size of its own quantisation. The rule
      for every later grid here: state the smallest effect the grid can resolve
      BEFORE registering a prediction about an effect size, and if the prediction
      is smaller than one step, the grid is wrong rather than the prediction
      falsified.
      ⚠️ **"The grid is wrong" does NOT mean "buy a finer grid"** — see the
      superseding item above. In 004's own case the grid was never the limiting
      instrument; scoring through a bracketed threshold was, and the continuous
      observable in the same CSV resolved the effect at z ≈ 7–12 for free. Check
      the estimator before you buy runs. **005 applied this rule prospectively
      for the first time, and its output was to DECLINE to register a
      prediction** (the exponent's ratio-dependence, effect 0.0143 against
      SE 0.032) rather than to enlarge the design.

## What is actually left — three of the four carried-forward limitations

Everything in the plan is built. These are the known defects and scope limits the
build carried forward deliberately; none is a blocker for merge, and each is
recorded at its own site in tracked code so it survives a clone.

**Closed since:** the unbounded repertoire scan. `Genome.repertoire` is now kept
sorted ascending and `isSilenced` binary-searches it, testing only the insertion
point's two neighbours. Recorded on `sim/silencing.ts`, `sim/phases/trap.ts` and
`Genome.repertoire` in `sim/state.ts`; the before/after profile is on `reset()`
in `web/main.ts`. Two things the item predicted turned out to be wrong and are
worth keeping written down:

- **golden hash `9c15fd28` DID NOT MOVE.** Every genome's repertoire holds
  exactly one entry at generation 15 of the pinned configuration, and a
  one-element array is identical under insertion order and sorted order — so the
  project's determinism oracle is BLIND to the only observable this change has.
  `tests/step.test.ts` now carries a second pin at a configuration whose
  repertoires are multi-entry, which is the one that can see it.
- the item said the fix "changes that array's ORDER, which `stateHash` reads, so
  it needs its own task". True of `stateHash`, and it is still the only consumer
  of repertoire order — but the two render tests that assert the renderers do not
  reorder sim state were the ones the change actually broke, because a sorted
  repertoire cannot be re-sorted and their fixture controls said so.

- [x] **RESOLVED 2026-09-03, and the item was wrong in both halves.** It read
      "the field render undercounts copies by ~12%... `markWidth` floors a mark at
      1 px against a 0.919 px/site pitch, so adjacent occupied sites overlap.
      Measured 1383/1714/1237 marks against 1551/1923/1416 actual copies... Fix
      needs sub-pixel accumulation rather than a wider mark."
      **Nothing in the repo produced those numbers.** There is a producer now:
      `scripts/explore-field-undercount.ts`, on the instrument in
      `tests/guards/field-undercount-arm.ts` that the render guard shares. - **The magnitude is 0.4%–4.9%, not 11%–13%**, bracketed by two
      threshold-free observables — exact rectangle geometry (ignores
      antialiasing, so bounds countability from above) and device-column ink
      runs (merges anything contiguous, so bounds it from below) — over twelve
      world states, generations 300–6000, copy counts 1157–1893, which brackets
      the density the retired figure was quoted at. - **The 1px floor is not the cause.** Sweeping the width: at exact pitch
      the shortfall is 1.5%, at the shipped floor it is also 1.5%; on the
      device grid narrowing the mark makes it slightly worse. Removing the
      floor buys nothing, so "sub-pixel accumulation rather than a wider mark"
      was right that a wider mark is not the answer and wrong about why. - **What remains is a resolution limit, not a defect.** Copies at adjacent
      sites merge and no width separates them: 1000 sites do not fit in ~844 px.
      It is also viewport-dependent — the canvas is `width: 100%`, and above a
      canvas of about 1056 CSS px the floor stops binding at all. - **The defect that WAS real was somewhere else.** `DOMESTICATED_HALO` was
      painted AFTER the marks and erased whole copies — 8 across the three
      states now in `BURIAL_STATES`, in 4 of 21 states swept. The halo now goes
      under the marks, and `tests/render-field.test.ts` asserts zero annotation
      burials, having been seen to fail at 8 on the pre-fix renderer.

- [ ] **The domesticated glyph is drawn at 3.6x true site scale, and it buries
      6 copies.** `Math.max(3, markW)` against a 0.844 px pitch. It is data over
      data rather than annotation over data, so it does not break the rule
      `spanGeometry` states, and the enlargement is why the rarest state the toy
      shows is visible at all — but it is the same shape as the cluster tint that
      was fixed for being 3.3x true scale. The cost is pinned by the render guard
      rather than bounded, so enlarging the glyph turns it red. **Open question,
      not a bug: is the trade worth making, or should the emphasis move outside
      the data plane** (a gutter tick) the way every other place-marker in that
      file already did?
- [x] **The piRNA repertoire scan is unbounded.** ~~Nothing removes a repertoire
      entry, so one silencing pass costs `O(copies × repertoire)` and the cost
      grows.~~ CLOSED — see the note above this list. Nothing still removes a
      repertoire entry and it still grows without bound; what is bounded now is
      the cost of looking one up.
- [ ] **Full inactivation implies the family DIES, which diverges from biology.**
      ⚠️ **MECHANISM CORRECTED 2026-09-03 — this item blamed the wrong thing.**
      It used to read "`lose` keeps excising silenced copies that silencing
      prevents from replacing themselves, so decay to zero is guaranteed". That
      is excision, and `scripts/explore-fossil-state.ts` measures that it is not
      the cause. Eleven seeds, aligned on the first generation with zero active
      copies, positive control that the composed loop reproduces `sim/step.ts`'s
      `stateHash` 11/11. Copies held 400 generations after inactivation:
      shipped **0/11**; excision gated as Kofler 2019 gates it **0/10**; plus
      `d = 0` **0/11**; plus `a = b = d = 0`, no selection on copy number at all,
      **0/10**; excision gated and **asexual, 10/11, mean 884.9 and flat**.
      **It is the sexual path, not excision and not selection** — a copy that
      cannot transpose cannot restore its own frequency, and here that is fatal
      whatever stopped it. Same mechanism guard 8 discriminated for domesticated
      copies (asexual 2761 -> 2800, sexual 169 -> 0): two subsystems, two
      experiments, one mechanism. Not separated: drift-to-absorption versus
      `reproduce.ts`'s site dedup, both on that path.
      **What this changes:** the fix this item implied — gate `lose` — would NOT
      achieve what the item wants. Persistence of an inactive family in a sexual
      population needs a positive fitness term (as domestication has) or a
      replacement channel. Still open, still blocked by the same blast radius
      (any change to `lose` moves the RNG draw stream and invalidates every
      calibration and both golden pins), but the scope is a different and larger
      thing than one predicate. Gating `lose` is still worth doing on its own
      merits — Kofler 2019 gates it, and excising a copy whose own silenced
      transposase would have to catalyse the excision is unphysical — it just is
      not the fossil-state fix. Recorded on `tests/guards/three-phases-arm.ts`,
      in spec §10, and `docs/pathway-mechanics.md` §7.
- [ ] **Guard 4's bloat result is one arm at one horizon, and its direction
      reverses.** The knockout/silenced ratio decays from 2.63 at generation 120
      to 1.30 by 160, and at 180 the direction REVERSES. The guard asserts
      direction only, at a fixed horizon, and says so — but the result must not be
      quoted as a general property of the model. Recorded in the
      "WHAT THIS GUARD DOES NOT CLAIM" block of `tests/guards/bloat.test.ts`.
- [ ] ⚠️ **THE SHIPPED `wDom` IS BELOW THE PERSISTENCE THRESHOLD, SO THE
      "ALTERNATE WIN" CANNOT HAPPEN AT THE DEFAULTS.** Spec §3.2 step 3 and §4
      present domestication as a way for a copy to persist by ceasing to be a
      parasite. Measured by guard 8 at eleven seeds: at `defaultParams`'
      `wDom = 0.01` domesticated copies are made, peak (195..595 copies at
      generation 26..44 in the guard's arm) and are then lost to ZERO at every
      seed. The threshold at that arm is `0.03 < wDom* <= 0.075` — the shipped
      value is 3x below the highest all-seeds-lost bonus and 7.5x below the lowest
      all-seeds-kept one — and `beta = 0.005, pDom = 0.001` make the event rare on
      top of that. **This is a calibration finding, not a missing mechanism:** the
      model expresses persistence perfectly well above the threshold, including
      persistence through the family's total extinction.
      **REFRAMED 2026-09-03 after reading Kapitonov & Jurka 2005 in full.** The
      biology is capture followed by "a period of intensive transformations due
      to diversifying/positive selection", then stabilizing selection (79%
      identity sharks to mammals). `wDom` IS that selection coefficient, so the
      honest reading is that the MODEL IS RIGHT AND THE SHIPPED CONSTANT IS
      UNREALISTICALLY SMALL — becoming the adaptive immune system is not a 1%
      fitness nudge — rather than that the spec overreaches.
      `docs/pathway-mechanics.md` §6.
      **NOT FIXED HERE ON PURPOSE.** Moving `wDom` moves every other guard's
      derivation and the golden hash in `tests/step.test.ts`. Guard 8's
      below-threshold arm IS the shipped default and asserts equality with
      `defaultParams().wDom`, so the finding is pinned rather than merely noted,
      and any recalibration turns that assertion red until the arm is re-derived.
      Full grid and margins: `tests/guards/domestication-arm.ts`, reproduced by
      `scripts/explore-domestication.ts` ARM 2.
- [ ] **Why more domestication bonus gives FEWER domesticated copies above
      `wDom ~ 0.3` is uncharacterised.** The response is non-monotone at all
      eleven seeds (mean per genome at generation 1000: 19.71 at `wDom = 0.3`,
      falling to 10.14 at `wDom = 5`). Established: it is differential
      ACCUMULATION, not retention — the whole difference is set by generation ~60
      and every trajectory is flat after. Two candidates move together and NEITHER
      was isolated: the still-transposing family (the only source of new
      domestication) dies earlier, and lineage diversity collapses (200/200
      distinct domesticated-site sets at `wDom = 0.2` against 106/200 at
      `wDom = 5`). Recorded as an observation, with no mechanism asserted; no guard
      assertion depends on it. `tests/guards/domestication-arm.ts`,
      `scripts/explore-domestication.ts` ARM 5.

Still open from the reading list, and unchanged:

- [x] **DONE 2026-09-03** — `bio-grounding` on piRNA conscription and on
      domestication, against the actual pathways rather than the summary. Seven full
      texts pulled from Europe PMC and read: Kofler 2019, Kofler 2020, Kofler 2018,
      Kelleher 2012, Kelleher 2018 (the tolerance primary, previously flagged
      unread), the 2018 Primer, and Kapitonov & Jurka 2005. Write-up with a verdict
      per model mechanic: **`docs/pathway-mechanics.md`**. It corrected three glosses
      in `REFERENCES.md` and one canonical statement in
      `tests/guards/three-phases-arm.ts`. **Two sources could NOT be obtained and
      remain abstract-level: Lavialle 2013 (syncytins, not OA via Europe PMC) and
      de Vanssay 2012 (no PMC record)** — so §5's "domesticated independently in
      multiple mammalian lineages", the detail the design leans on for "domestication
      is reachable", is still unverified past the abstract, and RAG1 carries §5 alone.

Opened by that read, all still open:

- [ ] **The `t` dial conflates two things biology keeps separate.**
      `sim/phases/trap.ts` gates conscription on `t`, so a tolerant host
      mechanically cannot form a repertoire. Kelleher et al. 2018 — the primary,
      now read — defines tolerance as mechanisms that "do not affect propagation
      but rather limit the fitness costs to the host", mapped to _bruno_ and the
      DNA-damage response, entirely outside the piRNA pathway. `damageLoad`
      matches that; the trap gate does not. The gate is defensible as an
      EVOLUTIONARY argument and is implemented as a MECHANICAL one. It is also
      the entire source of guard 9's `t = 0.99` / `t = 1` discontinuity, so that
      guard is right about the code while the "different in kind" framing around
      it describes a design decision, not biology. Not changed: the gate is load
      bearing for guard 9 and for the spec's two-strategy opponent.
      `docs/pathway-mechanics.md` §5.

- [ ] **The `theta` window is grounded by nothing in the reference base.**
      Kelleher 2012 was the intended source and argues the other way in its own
      system ("mismatches between piRNAs and TE transcripts cannot explain the
      pattern of TE derepression in hybrids"). The window's justification is a
      DESIGN one — it is what makes "family" emergent rather than declared — and
      is now labelled as design, not biology. Closing this needs a source that
      actually addresses piRNA target-complementarity tolerance.
      `docs/pathway-mechanics.md` §4.

- [ ] **A second phase detector on Kofler's own observable.** Ours reads the
      copy-number trajectory (`sim/phases-detect.ts`); Kofler's boundaries are
      defined on repertoire prevalence — shotgun onset is "the moment at which
      99% of the individuals acquired at least one cluster insertion", inactive
      onset is a cluster insertion fixing. `Snapshot.fractionWithRepertoire`
      already IS that observable, so `fractionWithRepertoire >= 0.99` is
      computable today as an independent second detector. Cheap, and it would
      make guard 3 comparable to the paper it is named for.
      `docs/pathway-mechanics.md` §2.

- [ ] **Our cluster fraction is inside the biological range, and that is NOT a
      validation.** `defaultParams().c = 0.01` and `TOY_DEFAULTS.c = 0.005` sit
      above Kofler 2020's "minimum size of 0.2% of the genome" and inside the
      span real genomes cover (koala 0.17%, _Drosophila_ ~3–3.5%). But his
      threshold is a property of HIS silencing rule — one capture, whole family,
      permanent, no escape — and ours silences a `theta` window that daughters
      routinely escape by construction (`sigmaS/theta = 2.0`). At equal `c` our
      trap is weaker, so the number does not transfer. Same non-transfer already
      recorded for Charlesworth 1983. `docs/pathway-mechanics.md` §3.
