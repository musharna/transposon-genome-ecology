# Reference base — transposons as genome ecology

**Built 2026-09-02** (37 works / 41 DOIs). Every entry below was resolved against
**OpenAlex live**: first-author surname, year, venue and DOI all came back from
the registry, not from recall. Citation counts are as of 2026-09-02 and will drift.

**Status:** §7's registry sweep is **complete** — the interaction-mode gap survives
GitHub, CRAN, PyPI, itch.io and Steam. §9's failed citation is **resolved**. The
only rows still unverified are the Dfam / Repbase / Asparagales pointers in §8.

⚠️ **What this check is and is not.** Byline+year+DOI+venue are registry-confirmed.
The full `CLAUDE.md` chain (Zotero → PubMed/DOI → CrossRef byline compare) has
**not** been run on these, and abstracts were read as returned by OpenAlex rather
than from the papers. Before any of these lands in a manuscript, run the full
chain. Entries under §9 failed verification and must not be cited at all.

---

## §1 The framing is not novel — settle this before pitching anything

The 2026-07-31 sweep recorded pitching "genome as ecosystem" as an original lens
and being wrong. That still holds, and the registry makes it worse, not better:
the framing is the field's own, it is decades old, and it is in review journals.

| work                                                                                                                                                                                                            | why it closes the novelty question                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Brookfield 2005**, "The ecology of the genome — mobile DNA elements and their hosts", _Nat Rev Genet_, [10.1038/nrg1524](https://doi.org/10.1038/nrg1524), 231 cites                                          | The exact framing, in the field's flagship review journal, **2005** — note the roadmap implied ~2006/07 via a PMID; the Brookfield paper is 2005.                                                                        |
| **Kidwell & Lisch 2001**, "Transposable elements, parasitic DNA, and genome evolution", _Evolution_, [10.1111/j.0014-3820.2001.tb01268.x](https://doi.org/10.1111/j.0014-3820.2001.tb01268.x), 577 cites        | Argues "selfish DNA"/"junk DNA" are misleading and that the TE–host relationship is **a continuum from extreme parasitism to mutualism**. The domestication-as-alternate-win mechanic is this paper's thesis, from 2001. |
| **Stitzer et al. 2021**, "The genomic ecosystem of transposable elements in maize", _PLoS Genet_ 17(10):e1009768, [10.1371/journal.pgen.1009768](https://doi.org/10.1371/journal.pgen.1009768), 144 cites       | The literal phrase "genomic ecosystem", applied genome-wide. >85% of maize is past transposition.                                                                                                                        |
| **Cosby, Chang & Feschotte 2019**, "Host–transposon interactions: conflict, cooperation, and cooption", _Genes Dev_ 33(17–18):1098, [10.1101/gad.327312.119](https://doi.org/10.1101/gad.327312.119), 332 cites | Explicitly argues TE success **cannot** be explained by evasion alone — commensal and mutualistic strategies included.                                                                                                   |

**Consequence for the design.** Novelty cannot be claimed on the framing. If this
project has a contribution it is in the _artifact_ (§7) or in a _registered
question_ nobody has asked — not in noticing that genomes look like ecosystems.

---

## §2 The mathematical spine — copy number is a dynamical system

This is the part the roadmap does not have at all, and it matters more than
anything else: **there is a 40-year-old quantitative model of exactly the thing
the sim would simulate.** Building without reading it means reinventing it badly.

- **Charlesworth & Charlesworth 1983**, "The population dynamics of transposable
  elements", _Genet Res_, [10.1017/s0016672300021455](https://doi.org/10.1017/s0016672300021455), 471 cites.
  The founding model. Finite occupiable sites; copy frequencies move by
  replicative transposition, element loss, **selection on copy number per
  individual**, and drift. Shows an equilibrium exists in an infinite population
  where not all sites are occupied. **This is the sim's default null model** — if
  the sim cannot reproduce this equilibrium, the sim is wrong.
- **Hua-Van, Le Rouzic, Boutin, Filée & Capy 2011**, "The struggle for life of the
  genome's selfish architects", _Biol Direct_ 6:19,
  [10.1186/1745-6150-6-19](https://doi.org/10.1186/1745-6150-6-19), 260 cites.
  ✅ _Roadmap citation — verified._ The TE-as-organism-under-selection framing.
- **Bourgeois & Boissinot 2019**, "On the population dynamics of junk", _Genes_
  10(6):419, [10.3390/genes10060419](https://doi.org/10.3390/genes10060419), 144 cites.
  ✅ _Roadmap citation — verified._ Modern review of what conditions TE abundance.
- **Lü & Clark 2010**, "Population dynamics of PIWI-interacting RNAs (piRNAs) and
  their targets in Drosophila", _Genome Res_ 20(2):212,
  [10.1101/gr.095406.109](https://doi.org/10.1101/gr.095406.109), 98 cites.
  ✅ \*Roadmap citation ("Lü & Clark 2009") — verified, but the issue is **2010\***
  (online 2009-11-30). Quantifies 32 TE families in piRNA-pathway mutants and
  **puts piRNAs inside a population-genetic framework** — the direct precedent for
  coupling the two halves of this sim.
- **Tomar, Hua-Van & Le Rouzic 2023**, "A population genetics theory for
  piRNA-regulated transposable elements", _Theor Popul Biol_,
  [10.1016/j.tpb.2023.02.001](https://doi.org/10.1016/j.tpb.2023.02.001), 9 cites.
  **The most design-relevant paper found.** Classical models cap copy number
  either by copy-number-dependent transposition or by purifying selection. piRNA
  regulation is neither: it needs **a specific mutational event — insertion into a
  piRNA cluster — to switch on.** That is the conscription mechanic, already
  formalised analytically.
- **Petrov, Fiston-Lavier, Lipatov, Lenkov & González 2011**, "Population genomics
  of transposable elements in _Drosophila melanogaster_", _MBE_ 28(5):1633,
  [10.1093/molbev/msq337](https://doi.org/10.1093/molbev/msq337), 191 cites.
  Different TE families behave differently — a warning against one global rate.

---

## §3 The piRNA trap — the conscription mechanic, and it has a hard number

The README calls this "the trap is made of you" and flags it as the mechanic most
likely to be wrong if taken from a summary. It is also the one with the most
quantitative support, so there is no excuse for taking it from a summary.

- **Kofler 2019**, "Dynamics of transposable element invasions with piRNA
  clusters", _MBE_ 36(7):1457, [10.1093/molbev/msz079](https://doi.org/10.1093/molbev/msz079), 87 cites.
  Simulates the trap model directly. Finds invasions have **three distinct
  phases**: TE amplifies → proliferation stopped by segregating cluster insertions
  → TE inactivated. Also finds clusters prevent host-population extinction.
  **A sim that does not show three phases is not showing the trap model.**
- ⭐ **Kofler 2020**, "piRNA clusters need a minimum size to control transposable
  element invasions", _GBE_ 12(5):736, [10.1093/gbe/evaa064](https://doi.org/10.1093/gbe/evaa064), 44 cites.
  **A falsifiable number to build against: piRNA clusters must exceed ~0.2% of the
  genome to repress invasion, rising to ~3% when populations are small,
  transposition rates high, and insertions recessive.** This is the single best
  calibration target in the whole reference base — it turns "does the trap work?"
  into a measurable threshold the sim either reproduces or does not.
- **Kofler, Senti, Nolte, Tobler & Schlötterer 2018**, "Molecular dissection of a
  natural transposable element invasion", _Genome Res_ 28(6):824,
  [10.1101/gr.228627.117](https://doi.org/10.1101/gr.228627.117), 105 cites.
  A **real P-element invasion caught in progress** in _D. simulans_ and run through
  replicated experimental evolution, hot vs cold. Spread for ~20 generations then
  plateaued. This is the empirical arm — a real invasion with a real time axis.
- **de Vanssay et al. 2012**, "Paramutation in Drosophila linked to emergence of a
  piRNA-producing locus", _Nature_, [10.1038/nature11416](https://doi.org/10.1038/nature11416), 273 cites.
  The **acquisition event** itself: a locus becoming a piRNA producer, heritably.
- **Kelleher, Edelman & Barbash 2012**, "Drosophila interspecific hybrids phenocopy
  piRNA-pathway mutants", _PLoS Biol_, [10.1371/journal.pbio.1001428](https://doi.org/10.1371/journal.pbio.1001428), 115 cites.
  **The defence is maternally inherited** — females deposit piRNAs into eggs, so
  immunity to a specific TE propagates to future generations. If the player's
  strategy is heritable, so is the host's; the arms race is symmetric in this
  respect and a design that makes only the element heritable is asymmetric by
  mistake, not by choice.
- **Yamanaka, Siomi & Siomi 2014**, "piRNA clusters and open chromatin structure",
  _Mobile DNA_ 5:22, [10.1186/1759-8753-5-22](https://doi.org/10.1186/1759-8753-5-22), 123 cites.
- **Luo & Lü 2017**, "Silencing of transposable elements by piRNAs in Drosophila:
  an evolutionary perspective", _GPB_ 15(3):164,
  [10.1016/j.gpb.2017.01.006](https://doi.org/10.1016/j.gpb.2017.01.006), 47 cites.

---

## §4 Silencing is not free — the host pays too

Load-bearing for the _second_ opponent. If host silencing is costless in the sim,
the host has no reason not to max it, and the arms race collapses into a solved
game. Both papers below say silencing is genuinely double-edged, with measurement.

- **Hollister & Gaut 2009**, "Epigenetic silencing of transposable elements: a
  trade-off between reduced transposition and deleterious effects on neighboring
  gene expression", _Genome Res_ 19(8):1419,
  [10.1101/gr.091678.109](https://doi.org/10.1101/gr.091678.109), 710 cites.
  In _Arabidopsis_: silencing a TE **suppresses its neighbours' expression too**.
  The host's weapon damages the host. This is the cost term.
- **Choi & Lee 2020**, "Double-edged sword: the evolutionary consequences of the
  epigenetic silencing of transposable elements", _PLoS Genet_,
  [10.1371/journal.pgen.1008872](https://doi.org/10.1371/journal.pgen.1008872), 142 cites.
  Argues epigenetic silencing is an under-recognised _source_ of TE harm, distinct
  from insertional disruption.

### ⭐ And the host has a SECOND strategy the roadmap never names: tolerance

**Meiklejohn & Blumenstiel 2018**, "Invasion of the P elements: tolerance is not
futile", _PLoS Biol_, [10.1371/journal.pbio.3000036](https://doi.org/10.1371/journal.pbio.3000036)
(found 2026-09-02 via the §9 author lookup).

Before a host acquires **resistance** (silencing the element), individuals vary in
their capacity to **tolerate** TE activity — ignoring or repairing the damage while
the element stays active. This is the standard resistance/tolerance distinction from
host–parasite ecology, and it applies here.

**Why it matters for the design.** The roadmap frames the second opponent as "host
silencing", singular. That is one of two host strategies, and they differ in kind:
resistance suppresses the element (and pays the §4 cost above, damaging neighbouring
genes); tolerance leaves the element active and absorbs the harm instead. They have
different costs, different equilibria, and — critically for a game — **tolerance does
not create a piRNA cluster, so it never triggers the §3 conscription trap.** A host
that tolerates rather than resists is an opponent the element cannot conscript.
Modelling only silencing collapses a two-strategy opponent into one.

---

## §5 Domestication as an alternate win — both named examples check out

- **Kapitonov & Jurka 2005**, "RAG1 core and V(D)J recombination signal sequences
  were derived from Transib transposons", _PLoS Biol_,
  [10.1371/journal.pbio.0030181](https://doi.org/10.1371/journal.pbio.0030181), 499 cites.
  The ~600-aa catalytic core of RAG1 is a Transib transposase. **The adaptive
  immune system is a domesticated transposon.**
- **Kapitonov & Koonin 2015**, "Evolution of the RAG1-RAG2 locus: both proteins
  came from the same transposon", _Biol Direct_,
  [10.1186/s13062-015-0055-8](https://doi.org/10.1186/s13062-015-0055-8), 136 cites.
- **Carmona & Schatz 2016**, "New insights into the evolutionary origins of the
  recombination-activating gene proteins and V(D)J recombination", _FEBS J_,
  [10.1111/febs.13990](https://doi.org/10.1111/febs.13990), 111 cites.
- **Lavialle et al. 2013**, "Paleovirology of 'syncytins', retroviral env genes
  exapted for a role in placentation", _Phil Trans R Soc B_,
  [10.1098/rstb.2012.0507](https://doi.org/10.1098/rstb.2012.0507), 418 cites.
  Syncytins verified — captured env genes, domesticated **independently in
  multiple mammalian lineages**. The repeated-independent-origin detail is the
  interesting one for a sim: domestication is not a fluke path, it is reachable.

---

## §6 Natural experiments — the counterfactual arms

Candidates for "the sim should reproduce this without being told to".

- ⭐ **Disable silencing → genome bloat.** Named by the 2026-07-31 sweep as the
  counterfactual knob with real cross-taxon measurement behind it. Cross-check
  against Chalopin et al. 2015 below before relying on the effect size.
- **Nowell et al. 2021**, "Evolutionary dynamics of transposable elements in
  bdelloid rotifers", _eLife_, [10.7554/elife.63194](https://doi.org/10.7554/elife.63194), 52 cites.
  Theory says obligate asexuality should wreck TE dynamics. **It does not** — TE
  frequencies sit within the sexual range. A genuine falsified prediction, and
  therefore a much better test than a confirmation.
- **Mérel et al. 2021**, "The worldwide invasion of _Drosophila suzukii_ is
  accompanied by a large increase of transposable element load", _MBE_ 38(10):4252,
  [10.1093/molbev/msab155](https://doi.org/10.1093/molbev/msab155), 65 cites.
  Ecological invasion and TE invasion coupled in one system.
- **Bourgeois, Ruggiero, Hariyani & Boissinot 2020**, "Disentangling the
  determinants of transposable elements dynamics in vertebrate genomes using
  empirical evidences and simulations", _PLoS Genet_,
  [10.1371/journal.pgen.1009082](https://doi.org/10.1371/journal.pgen.1009082), 27 cites.
  Green anole; **empirical + simulation in one paper** — the closest existing thing
  to this project's validation design. Read before designing the validation.
- **Chalopin, Naville, Plard, Galiana & Volff 2015**, "Comparative analysis of
  transposable elements highlights mobilome diversity and evolution in
  vertebrates", _GBE_ 7(2):567, [10.1093/gbe/evv005](https://doi.org/10.1093/gbe/evv005), 420 cites.
  TE content spans **6% (tetraodon) to 55% (zebrafish)** across 23 vertebrates —
  the cross-taxon spread any bloat claim has to live inside.
- **Schrader et al. 2014**, "Transposable element islands facilitate adaptation to
  novel environments in an invasive species", _Nat Commun_,
  [10.1038/ncomms6495](https://doi.org/10.1038/ncomms6495), 245 cites.

---

## §7 ⚠️ The artifact gap has ERODED — re-derived live, 2026-09-02

**This section supersedes the roadmap's artifact-gap bullet.** The 2026-07-31
sweep concluded the surviving gap was an artifact gap, naming only SimulaTE and
VisualTE. That conclusion is **13 months stale and no longer safe to repeat.**

Confirmed still true:

- **SimulaTE** — Kofler 2018, _Bioinformatics_ 34(8):1419,
  [10.1093/bioinformatics/btx772](https://doi.org/10.1093/bioinformatics/btx772), **7 cites**.
  ✅ Verified. Simulates _reads_ to benchmark TE-detection tools. Not an ecosystem.
- **VisualTE** — 2015, _BMC Genomics_,
  [10.1186/s12864-015-1351-5](https://doi.org/10.1186/s12864-015-1351-5).
  ✅ Verified as a static Java analysis GUI over annotated genomes.

**What the sweep missed or postdates it — found this session:**

- ⚠️⚠️ **SLiM 4** — Haller & Messer 2022, "SLiM 4: multispecies eco-evolutionary
  modeling", _Am Nat_, [10.1086/723601](https://doi.org/10.1086/723601), **378 cites**.
  A genetically explicit forward simulator with a scripting language **and a
  cross-platform GUI (SLiMgui)**, now supporting multispecies eco-evolutionary
  models. Published TE work already modifies stock Haller/Messer recipes to
  simulate TE dynamics (e.g. Bourgeois et al. 2020, §6). **This is the strongest
  challenge to the artifact gap and it was not in the sweep at all** — a
  population geneticist asked to simulate TE ecology would reach for SLiM.
- **TESS** — bioRxiv 2025-06-04, [10.1101/2025.06.04.657780](https://doi.org/10.1101/2025.06.04.657780),
  code at `github.com/cwb14/PrinTE`. Forward simulation of TEs driving genome
  expansion/contraction.
- **TEvarSim** — Jan 2026, PMC12875575. TE variant simulator across genomes,
  reads and VCF, modelling haplotype/individual/population variation.
- **TEgenomeSimulator** — bioRxiv 2026-03-09,
  [10.64898/2026.03.09.710711](https://doi.org/10.64898/2026.03.09.710711).
  Configurable TE landscapes.
- **GraffiTE** — Groza et al. 2024, _Nat Commun_,
  [10.1038/s41467-024-53294-2](https://doi.org/10.1038/s41467-024-53294-2), 27 cites.
  Analysis pipeline, not a sim, but shows the tooling space is active.

### Registry sweep — COMPLETED 2026-09-02

All five outstanding registries checked. **The interaction-mode gap survives.**

| registry    | what is there                                                                                                                                                                        | ecosystem/playable?              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **GitHub**  | `MesserLab/SLiM`; `cwb14/PrinTE` (= TESS); `JialiUMassWengLab/TEMP` (polymorphism analysis); `nixonlab/awesome-transposable-elements`, the community's own curated TE-software index | **No.** All batch.               |
| **CRAN**    | **`TE`** v0.3-0, "Insertion/Deletion Dynamics for Transposable Elements" — estimates insertion/deletion rates and age distributions for TE families                                  | **No.** An estimator, not a sim. |
| **PyPI**    | TEtranscripts (TE-aware differential expression); Repsc (single-cell TE expression, R)                                                                                               | **No.** Analysis only.           |
| **itch.io** | Adjacent evolution sandboxes exist — Genomeia, GeneBox, Vilmonic, Genoma Games — but **none is about transposons or selfish DNA**                                                    | **No TE game found.**            |
| **Steam**   | _Intelligent Design: An Evolutionary Sandbox_ (Pill Bug Interactive) — god-game with simulated genetics and evolving ecosystems, **not TE-specific**                                 | **No TE game found.**            |

Two details worth carrying forward:

- ⚠️ **A limitation of SLiM that partly restores the gap.** The PrinTE/TESS
  preprint states SLiM "compresses TEs into individual units, precluding modeling
  of TE sequence mutagenesis and nested insertion." So SLiM is not a drop-in for
  element-level TE ecology — a point in this project's favour, but it comes from a
  competing tool's preprint and should be confirmed against SLiM's own docs before
  being repeated.
- The `awesome-transposable-elements` list has a **Visualization section that is
  empty**. Weak evidence for the gap — the list is an admittedly sparse living
  document, so absence there is thin. Do not lean on it.

**Where checked, stated:** OpenAlex works + author search, WebSearch, and a direct
fetch of the awesome-list README — all 2026-09-02. **Not checked:** Zenodo,
SourceForge, Bioconductor, app stores, or non-English sources.

**Honest reading of the null.** Three TE simulators appeared in the 14 months
since the sweep, and a mature general-purpose forward simulator with a GUI was
never accounted for. The defensible surviving claim is **narrower** than "no
running ecosystem exists": every artifact above is a _batch research instrument
producing files for analysis_ — parameters in, dataset out. None is
**watchable while it runs, perturbable mid-run, or built to be played.** That is
a real distinction, but it is a claim about _interaction mode_, not about
capability, and it is the only version of the gap the evidence currently supports.
Say that, or say nothing.

---

## §8 Datasets — the roadmap's pointers, checked

- ✅ **Petersen arthropod repertoires** — Petersen et al. 2019, "Diversity and
  evolution of the transposable element repertoire in arthropods with particular
  reference to insects", _BMC Ecol Evol_,
  [10.1186/s12862-018-1324-9](https://doi.org/10.1186/s12862-018-1324-9), 265 cites.
  **Real, and it is a standardised order-level comparison across 62 insect + 11
  outgroup species.** The roadmap's pointer resolves to an actual usable
  cross-taxon resource. Companion: Gilbert, Peccoud & Cordaux 2020, _Annu Rev
  Entomol_, [10.1146/annurev-ento-070720-074650](https://doi.org/10.1146/annurev-ento-070720-074650), 154 cites.
- ⬜ **Dfam / Repbase** — **not checked this session.** Both are real, but their
  current licensing, coverage and access terms were not verified and Repbase in
  particular has had access changes. Query before asserting anything about
  contents.
- ⬜ **Asparagales** — **not checked this session.** No corresponding resource
  located; treat as an unresolved pointer, not a dataset.

Background/orientation, if the element taxonomy needs settling:
**Wells & Feschotte 2020**, "A field guide to eukaryotic transposable elements",
_Annu Rev Genet_, [10.1146/annurev-genet-040620-022145](https://doi.org/10.1146/annurev-genet-040620-022145), 720 cites ·
**Bourque et al. 2018**, "Ten things you should know about transposable elements",
_Genome Biol_, [10.1186/s13059-018-1577-z](https://doi.org/10.1186/s13059-018-1577-z), 1533 cites.

---

## §9 ✅ Previously-failed citation — RESOLVED 2026-09-02

**"Blumenstiel 2019" is real.** Two keyword searches missed it; an author-scoped
lookup found it immediately (OpenAlex `A5023270559`, ORCID
[0000-0001-6221-9292](https://orcid.org/0000-0001-6221-9292), Univ. of Kansas).

- **Blumenstiel 2019**, "Birth, school, work, death, and resurrection: the life
  stages and dynamics of transposable element proliferation", _Genes_ 10(5):336,
  [10.3390/genes10050336](https://doi.org/10.3390/genes10050336), 66 cites,
  single-author, gold OA. ✅ **Cleared to cite.**

⚠️ **Method tell worth keeping.** Keyword search returned a _plausible substitute_
(Cosby, Chang & Feschotte 2019 — right topic, right year, wrong authors) rather
than nothing. **A near-miss is more dangerous than an empty result**, because it
reads as confirmation. Author-scoped lookup discriminates; keyword search cannot.
Run `search_authors` → `get_author_works` before calling any author-year missing.

**And the paper matters for the design**, which is what leaving it unresolved would
have cost: it traces **the life stages of a TE lineage — birth, proliferation,
extinction, and "resurrection"** — and the strategies available across them, from
long-term coexistence to horizontal transfer across species boundaries. That is
the unit-of-individuality question (task #2) posed as a **lifecycle rather than a
taxonomy**, and it is the closest thing in the literature to "what does the player
actually carry, over what span".

Two further Blumenstiel-lab papers surfaced by the same lookup, both load-bearing:

- ⭐ **Meiklejohn & Blumenstiel 2018**, "Invasion of the P elements: tolerance is
  not futile", _PLoS Biol_, [10.1371/journal.pbio.3000036](https://doi.org/10.1371/journal.pbio.3000036).
  **The host has TWO counter-strategies, not one.** Before acquiring _resistance_
  (suppression), individuals vary in their ability to **tolerate** TE activity —
  ignoring or repairing the damage rather than silencing the element. Tolerance
  and resistance have different costs and different evolutionary dynamics. A design
  with only a silencing axis models half the host. See §4.
- **Kelleher, Barbash & Blumenstiel 2020**, "Taming the turmoil within: new
  insights on the containment of transposable elements", _Trends Genet_,
  [10.1016/j.tig.2020.04.007](https://doi.org/10.1016/j.tig.2020.04.007), 51 cites.
  The containment review to read alongside §3.

---

## What this base changes about the design

1. **§1 kills novelty-on-framing.** Do not open the brainstorm by proposing the
   ecosystem lens as the idea.
2. **§2 supplies the null model.** Charlesworth & Charlesworth 1983 equilibrium is
   the thing to reproduce before adding anything. Tomar et al. 2023 already
   formalises piRNA regulation as a mutational-activation event.
3. **§3 supplies a calibration target with a number** — the 0.2%/3% cluster-size
   threshold, plus a three-phase invasion signature.
4. **§4 fixes an incentive bug before it is written**: host silencing must cost
   the host, or the arms race is a solved game.
5. **§4 also splits the opponent in two.** Resistance (silence it) and tolerance
   (absorb the damage) are different host strategies with different costs — and
   **tolerance never builds a piRNA cluster, so it cannot be conscripted.** The
   roadmap's "host silencing" is half an opponent.
6. **§7 survived the full registry sweep.** GitHub, CRAN, PyPI, itch.io and Steam
   all checked: no watchable, perturbable, playable TE ecosystem exists. The gap is
   interaction mode, not capability — and four simulators arrived in 14 months, so
   assume more and re-check before publishing any null.
7. **§9 gives the lifecycle framing for task #2.** Blumenstiel 2019 poses the unit
   question as birth → proliferation → extinction → resurrection, which is a more
   tractable handle than the roadmap's three-way copy/family/host taxonomy.
8. **§8's unchecked rows are the remaining open work** — Dfam, Repbase, Asparagales.
