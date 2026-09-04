# What the pathways actually do — read past the abstracts

Closes the last `[~]` on the reading list: "`bio-grounding` on piRNA conscription
and on domestication, against the actual pathways rather than the summary".
`docs/REFERENCES.md` built the literature base and verified the citations; this
is the read of the mechanics, and it is written to be **checkable against the
model**, one verdict per mechanic.

**Method.** Full text pulled from Europe PMC (`/fullTextXML`) and read directly,
not through a summarising fetch. Every quotation below is verbatim from the full
text and was grepped out of it rather than recalled.

**What could NOT be obtained, so it stays abstract-level:**

- **Lavialle et al. 2013** (syncytins, `10.1098/rstb.2012.0507`). PMC3758191
  exists but Europe PMC reports `isOpenAccess=N` and returns an empty body. So
  §5's syncytin claims — including the one the design leans on, that syncytins
  were domesticated **independently in multiple mammalian lineages** and are
  therefore evidence domestication is reachable rather than a fluke — are STILL
  unverified past the abstract. RAG1 carries §5 alone until that is fixed.
- **de Vanssay et al. 2012** (`10.1038/nature11416`). No PMC record; Nature,
  paywalled. The "acquisition event" claim in §3 is unread.

---

## 1. What a cluster insertion actually does — and where our model generalises it

**Kofler 2019** (`10.1093/molbev/msz079`), the direct simulation of the trap
model. Verbatim, from Methods and Discussion:

> "We assumed that a TE is active until a member of the family jumps into a
> piRNA cluster, whereupon all members of the family are inactivated."

> "A fixed cluster insertion permanently inactivates the TE."

> "In case, cluster insertions are segregating (shotgun phase), the TE may still
> be active in a few individuals which randomly end up without any cluster
> insertion."

**MATCHES.** Our repertoire is per-genome (`sim/state.ts`), inherited from the
mother (`sim/phases/reproduce.ts`), and a genome that never captured anything
has no repertoire and its copies stay active — which is exactly the third quote.
Silencing being derived per generation rather than stored (`sim/silencing.ts`)
matches a defence re-established each generation from the cluster, not a mark
written onto a copy.

**DIVERGES, deliberately.** Kofler's capture inactivates **the whole family**;
ours silences only what lies within `theta` of the captured `s`
(`sim/silencing.ts:isSilenced`). Ours is the more general rule — Kofler's is our
limit case, the one where `theta` exceeds the family's spread in `s` — and the
window is the entire reason "family" is emergent here rather than declared.

⚠️ **But that window is currently ungrounded in our reference base.** See §4.

---

## 2. The three phases, with Kofler's operational definitions

Kofler's boundaries are defined on **cluster-insertion prevalence**, not on copy
number:

- **rapid invasion** → **shotgun**: "we use the moment at which 99% of the
  individuals acquired at least one cluster insertion as the onset of the
  shotgun phase". At that moment "each individual had on the average acquired
  3.8 cluster insertions".
- **shotgun** → **inactive**: a cluster insertion **fixes** (reaches frequency
  1). "Solely, fixation of a cluster insertions results in permanent
  inactivation of the TE and thus in stable TE copy numbers." The inactive
  phase's length is infinite.
- Population size is the major determinant of the shotgun phase's length; the
  transposition rate governs the rapid-invasion phase's length but has "little
  influence on other properties, including the abundance of TE insertions".
- The shotgun phase is significantly **less stable** than the inactive phase.

**Our detector reads a different observable.** `sim/phases-detect.ts` locates
amplification / plateau / inactivation from the **copy-number trajectory**.
Kofler locates his from **repertoire prevalence**. Neither is wrong, but they are
not the same measurement and a match on one does not imply a match on the other.

**Directly available follow-up, not done here:** `Snapshot.fractionWithRepertoire`
(`sim/observe.ts`) is already the exact analogue of "fraction of individuals with
at least one cluster insertion", so Kofler's shotgun-onset definition —
`fractionWithRepertoire >= 0.99` — is computable in our model today, as an
independent second detector on the observable he actually used. Recorded as a
task, not claimed as a result.

---

## 3. Cluster size — the one hard number, and why it does not transfer

**Kofler 2020** (`10.1093/gbe/evaa064`), verbatim:

> "To control TE invasions over a wide range of parameters, piRNA clusters need
> to have a minimum size of 0.2% of the genome."

> "In a worst-case scenario involving small populations and recessive
> insertions, clusters accounting for up to 3% of the genome may be necessary to
> control TEs."

> "This demonstrates that transposon traps, such as piRNA clusters, need a
> minimum size to prevent the extinction of populations."

Real values it reports: *Drosophila* germline clusters ~3–3.5% of the genome;
koala 0.17%; mouse, human and rat pachytene clusters ~0.1%.

**Ours:** `defaultParams().c = 0.01` (1%) and `TOY_DEFAULTS.c = 0.005` (0.5%)
(`sim/params.ts`, `web/params.ts`). Both sit above the 0.2% figure and inside the
range real genomes span (0.17% – 3.5%).

⚠️ **Do not quote that as validation.** Kofler's 0.2% is a property of **his
silencing rule** as much as of `c`: one capture inactivates the whole family,
permanently, with no escape. Ours silences a `theta`-window that daughters
routinely escape — `TOY_DEFAULTS` sets `sigmaS/theta = 2.0` **on purpose**,
measured in `web/params.ts` as the ratio at which 7 of 7 seeds survive to
generation 6000. At equal `c` our trap is therefore weaker than his, and his
threshold is not a threshold for our model. This is the same non-transfer already
recorded for Charlesworth 1983 in `docs/charlesworth-1983-equilibrium.md`:
the qualitative structure transfers, the number does not.

---

## 4. A correction to our own reference base: what Kelleher 2012 actually found

`REFERENCES.md` §3 glosses **Kelleher, Edelman & Barbash 2012**
(`10.1371/journal.pbio.1001428`) as "**The defence is maternally inherited** —
females deposit piRNAs into eggs, so immunity to a specific TE propagates to
future generations."

Read in full, **that is background the paper cites (its refs 18 and 29), not a
result it produced.** Its own results run the other way:

- TE families with reduced abundance in the maternal piRNA pool are **not** more
  likely to be derepressed in interspecific hybrids — "z value = −0.44, df = 257,
  p = 0.66", and the reciprocal test is also null.
- Verbatim: "**These results demonstrate that mismatches between piRNAs and TE
  transcripts cannot explain the pattern of TE derepression in hybrids.**"
  Derepressed families showed **lower** interspecific divergence, the opposite of
  the prediction.
- What the paper supports is **functional divergence of the piRNA effector
  proteins** — hybrids phenocopy piRNA-pathway mutants, with deficient ping-pong
  amplification and mislocalisation of Aubergine and Ago3.

**Two consequences.**

1. The §3 gloss attributes a claim the paper does not make, and is corrected in
   `REFERENCES.md` in the same commit as this file.
2. ⚠️ **I was about to cite this paper as the grounding for our `theta`
   window** — sequence-similarity-graded silencing — and in its own system it
   argues against exactly that. It does not refute a `theta` window in general;
   its test is specific to interspecific hybrids. But it does mean **the `theta`
   window is currently grounded by nothing in our reference base.** Its
   justification is a *design* one, and a good one — it is what makes "family"
   emergent rather than declared — and it should be labelled as design, not as
   biology, until a source that actually addresses target-complementarity
   tolerance is read.

---

## 5. Tolerance: the primary study, read — and what our `t` dial really does

`REFERENCES.md` §4 flagged that the tolerance branch rested on a **Primer**, and
that "the primary study it comments on has not been read". That study is
**Kelleher, Jaweria, Akoma, Ortega & Tang 2018**, "QTL mapping of natural
variation reveals that the developmental regulator *bruno* reduces tolerance to
P-element transposition in the *Drosophila* female germline", *PLoS Biol*
16(10):e2006040, `10.1371/journal.pbio.2006040` — same journal, same issue, same
date as the Primer, and in the Primer's reference list. **Read now.**

The definition, verbatim:

> "By contrast, mechanisms of tolerance do not affect propagation but rather
> limit the fitness costs to the host."

What it measured: >32,000 dysgenic F1 offspring phenotyped across the DSPR
recombinant lines; **two allelic classes**, tolerant and sensitive, sufficient to
explain the variation; the candidate is *bruno*, a germline developmental
regulator, and the difference is **regulatory, not coding** — "none of the 36
in-phase SNPs are nonsynonymous", with tolerant alleles carrying a **20%
reduction in *bruno* expression** (95% CI 14%–26%). Effect sizes: **39% less F1
ovarian atrophy**, **54% reduction in sterility**, and *no* effect on brood size
among F1 females that were fertile. It is "the first demonstration of natural
variation in TE tolerance in any organism".

**MATCHES:** `damageLoad` (`sim/phases/select.ts`). Tolerance there reweights
*what the host pays* — per active copy instead of per silenced copy — and does
not touch the element's propagation. That is precisely "do not affect
propagation but rather limit the fitness costs to the host."

⚠️ **DOES NOT MATCH: the conscription gate in `sim/phases/trap.ts`.** Our `t`
*also* gates capture (`if (world.rng.next() >= 1 - p.t) continue;`), so a fully
tolerant host **mechanically cannot form a repertoire**. Tolerance in Kelleher
2018 is variation in germline development and the DNA-damage response, sitting
entirely outside the piRNA pathway; nothing in it prevents a cluster insertion
from happening or from being transmitted. `REFERENCES.md` §4's line — "tolerance
does not create a piRNA cluster, so it never triggers the §3 conscription trap" —
is **our inference**, and the primary does not support it.

The inference is defensible at the *evolutionary* scale: a host that pays little
for TE activity is under weak selection to maintain resistance. Our model
implements it at the *mechanical* scale, as a per-capture gate. That is a much
stronger claim than the evolutionary argument earns.

**And it is the whole source of guard 9's headline result.** The discontinuity
guard 9 asserts — `t = 0.99` conscripts every genome, `t = 1` conscripts none,
while thousands of copies sit in cluster sites — is the gate, working exactly as
written. Guard 9 is correct about the code. What overreaches is calling that a
finding that **resistance and tolerance are different in kind**: in this model
they are different in kind *because the gate makes them so*, and biology's
tolerance is an independent axis rather than the negation of resistance.

---

## 6. Domestication: what the RAG1 paper actually says

**Kapitonov & Jurka 2005** (`10.1371/journal.pbio.0030181`), read in full. The
RAG1 core derives from a Transib transposase and the RSSs from Transib TIRs,
supported by shared 5-bp TSDs and TIR structure. On what happened **after**
capture:

> "the RAG1 core most likely went through a period of intensive transformations
> due to diversifying/positive selection. Afterwards, the RAG1 genes continued to
> evolve at a slow and steady pace under stabilizing selection"

— 79% identity between sharks and mammals. And on the shape of an autonomous
family:

> "Typically, TPase-coding autonomous DNA transposons are present in only a few
> complete copies per genome."

**This reframes guard 8's finding.** Domestication in the biology is capture
followed by **strong positive selection**, then conservation. Our `wDom` *is*
that selection coefficient. Guard 8 measured that domesticated copies persist
only for `0.03 < wDom* <= 0.075`, while the shipped default is `0.01`. Against
this source, the honest reading is **the model is right and the shipped constant
is unrealistically small** — becoming the adaptive immune system is not a 1%
fitness nudge. The ROADMAP item currently frames it as the spec overreaching;
it is better framed as the *constant* being too small to express a mechanism the
model implements correctly.

**Not supported by the source:** that a domesticated copy is **exempt from
silencing** (`sim/silencing.ts:isSilenced` returns `false` for it). Nothing in
Kapitonov & Jurka addresses piRNA at all. My reasoning is that a domesticated
copy is under host transcriptional control rather than being a piRNA target —
**that is an inference, and it is labelled as one.**

**Minor fidelity note:** our domesticated copy freezes at its `s` forever; the
real one diverges rapidly and only then conserves. Immaterial for a toy.

**Consistent:** "only a few complete copies per genome" is the same shape as
Brouha 2003's 80–100 retrotransposition-competent L1s out of a family occupying
17% of the human genome, already in §4. Two independent families, one structure:
the active fraction is tiny.

---

## 7. ⚠️ The fossil-state divergence is MIS-DIAGNOSED in our own ROADMAP

`docs/ROADMAP.md` and `tests/guards/three-phases-arm.ts` both state the cause as
excision: "`lose` keeps excising silenced copies that silencing prevents from
replacing themselves, so decay to zero is guaranteed."

Kofler's model does gate exactly that. Verbatim, from his Methods:

> "With our model, excisions from piRNA clusters are not feasible as we assume
> that TEs are inactive (transpositions as well as excisions) in individuals with
> a cluster insertion."

The biological reading is clean: a DNA transposon's excision is catalysed by its
own transposase, which piRNA silencing suppresses along with transposition, so
excising a silenced copy is a channel that should not exist. **I predicted that
gating it in our model would stabilise an inactivated family. Measured, it does
not.**

`scripts/explore-fossil-state.ts`. `defaultParams` with `c = 0.05` so that every
seed actually reaches full inactivation (at the shipped `c` most seeds never
inactivate at all and run to ~10,000 copies, so a fixed-horizon comparison cannot
answer this). Eleven seeds, each arm **aligned on the first generation with zero
active copies** rather than on absolute generation, because the arms consume
different numbers of RNG draws and their generation-*g* worlds are not
comparable.

**Positive control:** the script composes its own generation loop so it can swap
one phase, which is a second implementation of `sim/step.ts` and could silently
describe a different model. Run with the **shipped** `lose`, it reproduces
`sim/step.ts`'s `stateHash` on **11 of 11 seeds**. Without that, nothing below
means anything.

Copies still held 400 generations after inactivation:

| arm | change | seeds holding copies | mean |
|---|---|---|---|
| 1 | shipped | 0 / 11 | 0.0 |
| 2 | excision gated (Kofler's rule) | 0 / 10 | 0.0 |
| 3 | + `d = 0` (no damage term) | 0 / 11 | 0.0 |
| 4 | + `a = b = d = 0`, **no selection on copy number at all** | 0 / 10 | 0.0 |
| 5 | excision gated + **asexual**, shipped costs | **10 / 11** | **884.9** |

Arm 5 is flat, not merely slower: seed 7 holds 600 copies at +50, +100, +200 and
+400; seed 19 holds 2039 → 1800 over the same span.

**So it is neither excision nor selection. It is the sexual path.** A copy that
cannot transpose cannot restore its own frequency, and in this model that is
fatal whatever the reason it stopped.

**That is the same mechanism guard 8 discriminated for domesticated copies** —
asexual keeps them (2761 → 2800) where sexual loses them (169 → 0). Two
subsystems, two independent experiments, one mechanism. Ceasing to transpose is
fatal in a sexual population here, and the only thing that rescues it is a
positive fitness term large enough for selection to beat drift — which
domestication has and silencing does not.

**NOT separated, and not claimed:** drift-to-absorption versus the site dedup in
`sim/phases/reproduce.ts`. Both live on the sexual path; which dominates is
unmeasured.

**What this changes.** The fossil-state item's implied fix — gate `lose` — would
**not** achieve what the item wants, and arm 2 is the evidence. Persistence of an
inactive family in a sexual population needs a positive fitness term or a
replacement channel, not an excision gate. The item is still open, its blast
radius is still every calibration in the suite, but its *scope* is now a
different and larger thing than "one predicate in `lose`".
