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

~~**Nothing is designed yet.**~~ Superseded 2026-09-02. Scaffolded 2026-09-01;
still no code, no runner, no measurement — but the design is no longer open.

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

⚠️ Those are pointers from the filing note, not verified facts about current
contents. Query a live registry before asserting what any of them holds or
whether a given comparison already exists.

## Prior grounding that already exists — read before re-running it

➡️ **SUPERSEDED IN PART by [`REFERENCES.md`](REFERENCES.md) (built 2026-09-02).**
That file carries 34 registry-verified works, the null model this roadmap lacks
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
- [ ] Build `sim/` core + guards 1–7, then `web/` — **in progress on
      `impl/sim-core-v1`;** core (tasks 1–9) and guard 5 (task 10) are committed
- [x] **DONE 2026-09-02** — Read Charlesworth & Charlesworth 1983 in full, not the
      abstract → [`charlesworth-1983-equilibrium.md`](charlesworth-1983-equilibrium.md).
      Unblocks guard 1. ⚠️ **Guard 1 is re-specified**: it asserts the paper's
      qualitative predictions, not a numeric equilibrium. Our haploid recombination
      deduplicates sites shared by both parents, a copy sink the diploid null model
      does not have, so the analytic constant does not transfer — measured
      no-selection 150, linear 124–148, quadratic 3–9, against a predicted 48.
- [~] `bio-grounding` on piRNA conscription and on domestication, against the
  actual pathways rather than the summary — **literature base built
  (`REFERENCES.md` §3, §5); the pathway mechanics themselves still need
  reading past the abstracts.**
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
- [ ] Verify Dfam / Repbase access terms and the Asparagales pointer
      (`REFERENCES.md` §8) — both unchecked
- [ ] First registered question + pre-registration, before any runner exists
