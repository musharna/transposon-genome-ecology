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

- [ ] **The field render undercounts copies by ~12%.** `markWidth` in
      `web/render/field.ts` floors a mark at 1 px against a 0.919 px/site pitch,
      so adjacent occupied sites overlap. Measured 1383/1714/1237 marks against
      1551/1923/1416 actual copies. The undercount is consistent and monotone, so
      it never reverses the direction of a change a visitor is watching — but it
      is on the hero panel, and a visitor counts. Fix needs sub-pixel accumulation
      rather than a wider mark. Recorded on `markWidth`.
- [x] **The piRNA repertoire scan is unbounded.** ~~Nothing removes a repertoire
      entry, so one silencing pass costs `O(copies × repertoire)` and the cost
      grows.~~ CLOSED — see the note above this list. Nothing still removes a
      repertoire entry and it still grows without bound; what is bounded now is
      the cost of looking one up.
- [ ] **Full inactivation implies the family DIES, which diverges from biology.**
      `lose` keeps excising silenced copies that silencing prevents from
      replacing themselves, so decay to zero is guaranteed; real silenced TE
      insertions largely persist as genomic fossils. Not fixed because changing
      `lose` would alter the RNG draw stream and invalidate every calibration in
      the suite. Recorded on `tests/guards/three-phases-arm.ts` and in spec §10.
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

- [~] `bio-grounding` on piRNA conscription and on domestication, against the
  actual pathways rather than the summary — literature base built
  (`REFERENCES.md` §3, §5); the pathway mechanics themselves still need
  reading past the abstracts.
