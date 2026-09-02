# Transposons as genome ecology — design

**Date:** 2026-09-02 · **Status:** approved in brainstorm, not yet planned
**Grounding:** `docs/REFERENCES.md` (37 works, registry-verified 2026-09-02)
**Supersedes:** the open questions in `docs/ROADMAP.md` §"The first decision"

---

## 1. What this is and what "done" means

A **poke-and-watch toy**: you open it, a population is already evolving, you
perturb it, and you watch the consequence resolve over hundreds of generations in
seconds. Minutes per session. No win state, no progression.

**Playable artifact first; scientific correctness is the floor, not the point.**
The toy must reproduce the Charlesworth 1983 copy-number equilibrium and the
Kofler 2019 three-phase invasion. Failing those means it is wrong. Passing them
is not the contribution.

**The contribution is interaction mode.** `REFERENCES.md` §7 establishes, against
OpenAlex, WebSearch, GitHub, CRAN, PyPI, itch.io and Steam, that every existing TE
artifact is a batch instrument — parameters in, dataset out. None is watchable
mid-run, perturbable, or playable. That gap is narrow but real, and it is the only
one this project can defensibly claim. **Novelty may not be claimed on the
"genome as ecosystem" framing** (§1) — that is the field's own, since 2005.

## 2. Decisions taken, and why

| decision                  | choice                                | why                                                                                                                            |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Primary aim               | Playable first                        | The verified gap is interaction mode; a merely-correct instrument competes with SLiM and Kofler where this project has no edge |
| Session shape             | Poke-and-watch, minutes               | Smallest thing occupying the gap; every §6 counterfactual is literally a poke                                                  |
| Stack                     | One TS core, browser UI, node runners | One implementation, so the thing played is provably the thing validated                                                        |
| **Unit of individuality** | **The copy**                          | Below                                                                                                                          |

### The unit decision — this closes ROADMAP's "first decision"

**The copy is the individual. Transposition rate is a per-copy heritable trait.
"Family" is an emergent label, never declared.**

The roadmap rejected copy-as-unit because "the strategy is invisible at this
scale". Under poke-and-watch that reasoning does not hold: at this scale the
strategy is a _distribution_, and a distribution renders trivially. What is
invisible in one copy is visible in ten thousand.

The decisive argument is mechanical. The project's load-bearing constraint is that
**transposition rate is heritable, not chosen** — and heritable means _varies and
is selected_. Per-copy rate with inheritance and mutation is a **variation
generator**; a family-level scalar rate is not, and would leave the premise as
static decoration. Rejected alternatives:

- **Family as unit** — closest to Kofler's published models and easiest to
  validate, but no within-family variation, so rate changes without evolving.
- **Host as unit** — more viable than the roadmap credits, since the host has two
  strategies (resistance and tolerance, §4). But it inverts the premise and demotes
  the parasite. **Held as a possible second toy, not this one.** Its substance is
  absorbed here as the resistance↔tolerance poke.

⚠️ **Known risk.** No published simulation in `REFERENCES.md` models per-copy rate
evolution; they all model families. This is a step past the literature. It is
defensible as the honest reading of "heritable", but it makes the Charlesworth
equilibrium guard load-bearing as proof the model has not wandered off — and it is
why §8's registered question exists.

## 3. The model

### 3.1 State

A population of `N` genomes. Each genome has `S` occupiable sites, of which a
contiguous span of fraction `c` are **piRNA cluster sites**. Each genome holds a
set of insertions.

**Every copy carries two independent heritable traits:**

- `r` — transposition rate. The **strategy**. Never chosen; inherited and mutated.
- `s` — a scalar sequence coordinate. The **identity**.

Plus per-copy non-heritable state: `site`, `domesticated` flag.

**Each genome also carries a `piRNA repertoire`** — the set of `s`-values it has
captured into clusters. This, not a per-copy flag, is the heritable defence.
**A copy's `silenced` status is derived, not stored:** a copy is silenced iff its
`s` lies within `θ` of any entry in its genome's repertoire. Deriving rather than
storing is what makes escape-by-divergence fall out automatically — a daughter that
mutates far enough in `s` is simply no longer matched.

### 3.2 One generation

1. **Transpose.** Each active, unsilenced copy transposes with probability `r`
   into a uniformly chosen empty site in its own genome. The daughter inherits
   `r` and `s`, each with mutation (`r' = r · exp(𝒩(0, σ_r))`, clipped to
   `[0, r_max]`; `s' = s + 𝒩(0, σ_s)`).
2. **Trap.** A copy landing in a cluster site adds its `s` to that genome's piRNA
   repertoire. Everything within `θ` of it is thereby silenced — by similarity,
   not by label. **Gated by the tolerance dial:** a genome only captures when it
   is resisting. At `t = 1` (pure tolerance) no capture occurs and no repertoire
   ever forms, which is precisely why a tolerating host cannot be conscripted.
3. **Domesticate.** A fraction `β` of sites are beneficial. A copy occupying one
   may be co-opted with probability `p_dom`: it gains the genome a fitness bonus,
   its transposition is permanently off, and it is exempt from silencing. Once
   domesticated, never reverts.
4. **Lose.** Each copy excises with probability `v`. Domesticated copies do not.
5. **Select.** Genome fitness falls with copy count (Charlesworth) and rises with
   domesticated-copy count. The **damage term is what the tolerance dial moves**:
   at `t = 0` the host pays per silenced copy (Hollister & Gaut's neighbouring-gene
   cost); at `t = 1` it pays a flat absorption cost per _active_ copy instead.
   Intermediate `t` interpolates. Resistance and tolerance are therefore two costs
   with different shapes, not one cost with a knob.
6. **Reproduce.** Offspring are sampled by fitness to restore `N`.
   - **Sexual** (`sexual = true`): pair genomes, free recombination across sites.
   - **Asexual** (`sexual = false`): clonal, no recombination.
     In both cases **offspring inherit the mother's piRNA repertoire** — maternal
     deposition, per Kelleher et al. 2012 — so the defence is heritable on the same
     footing as the strategy.

Steps 1, 4, 5 and 6 alone constitute the Charlesworth 1983 model. Step 2 adds
Kofler's trap; step 3 adds domestication. The correctness floor is therefore
reachable by construction, and guard 1 runs with steps 2 and 3 disabled.

### 3.3 Why the sequence coordinate earns its place

The trap must silence _something_, and biologically piRNA silencing acts by
sequence homology rather than taxonomy. Keying silencing on similarity in `s`
yields three behaviours from one mechanism, none of them separately implemented:

- **Families emerge** as clusters in `s`-space.
- **A diverging sublineage escapes** an established trap.
- **Escape after suppression is "resurrection"** — Blumenstiel 2019's fourth life
  stage, obtained for free rather than scripted.

`s` is a scalar in v1. A vector would give richer divergence topology and is not
needed to get clustering, escape, or resurrection.

### 3.4 Parameters

`N` population size · `S` sites per genome · `c` cluster fraction · `r0` initial
rate · `r_max` rate ceiling · `σ_r` rate mutation sd · `σ_s` sequence drift sd ·
`θ` silencing similarity threshold · `v` excision rate · `a`, `b` copy-number
fitness coefficients · `d` per-silenced-copy cost (resistance) · `d_tol` per-active-copy
absorption cost (tolerance) · `t` resistance↔tolerance dial · `β` beneficial-site
fraction · `p_dom` domestication probability · `w_dom` domestication fitness bonus ·
`sexual` flag · `seed`.

**Runtime toggles** (`silencing_on`, and the pokes of §4) are parameters too, and
must be settable mid-run without restarting — that is the whole session shape.

⚠️ **Defaults are not yet set, and one functional form is unconfirmed.** The
fitness function `w(n)` is written here as falling with copy count under
synergistic epistasis, but **the exact form and coefficients must be read out of
Charlesworth & Charlesworth 1983 itself before the equilibrium guard can be
calibrated** — the reference base was built from abstracts and registry metadata,
not full texts. This is ROADMAP task #4 and it **blocks guard 1**, not the build.

## 4. The pokes

Each maps to a counterfactual or calibration target, so the interactions are also
the validation surface.

| poke                                   | what it exercises                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Silencing knockout                     | Genome bloat (§6)                                                                                                                                                |
| Cluster-size slider, 0→5%              | Kofler 2020's threshold — the player finds ~0.2%                                                                                                                 |
| Seed an invasion (new `s`, chosen `r`) | Kofler 2019's three phases, live                                                                                                                                 |
| Sex ↔ asex                             | Nowell 2021's bdelloids — theory predicts disruption; reality does not                                                                                           |
| **Resistance ↔ tolerance** (`t`)       | Resistance silences: pays the neighbour cost, builds clusters, **is conscriptable**. Tolerance absorbs damage: flat cost, no clusters, **cannot be conscripted** |
| Population size                        | Drift                                                                                                                                                            |
| Domestication                          | A copy landing in a beneficial site may be co-opted: fitness bonus, transposition permanently off. The alternate win                                             |

The resistance↔tolerance dial is the only poke that changes whether the trap can
exist at all, which is what makes §3 and §4 of the reference base interact rather
than sit side by side.

## 5. The screen

Three regions.

1. **The field** (hero) — genomes as rows, sites as cells, insertions as marks,
   cluster span highlighted, silenced copies dimmed. The texture you watch.
2. **The timeline** — copy count over generations. Where a poke's consequence
   becomes legible, and where the three phases appear as shape.
3. **One scatter** — `s` on x, `r` on y, one point per live copy. Families are
   clusters along x; strategy is height; selection on rate is the cloud drifting
   vertically; escape is a cluster budding sideways. One panel, both heritable
   dimensions, and the mechanics hardest to describe become easiest to see.

## 6. Validation

One guard per claim, in `tests/`:

1. **Charlesworth equilibrium** (trap off) — copy number converges to a stable,
   non-zero, non-saturating equilibrium, asserted against the analytic prediction.
   _The floor._ Blocked on §3.4's open item.
2. **Three phases** (trap on) — assert the _ordering_ amplification → plateau via
   segregating cluster insertions → inactivation, not merely the endpoint.
3. **Cluster threshold** — sweep `c`; repression onset must land in Kofler's
   0.2–3% band under matching conditions.
4. **Knockout → bloat** — direction only, not magnitude.
5. **Rate evolves** — mean `r` moves under selection and does _not_ move with
   selection off. Guards the entire justification for copy-as-unit.
6. **Escape** — a diverged sublineage escapes an established trap.
7. **One implementation** — a headless-browser run of `n` generations must produce
   a state hash identical to the node run. Without this, "the thing you play is
   the thing that is validated" is an unbacked assertion.

### Testing disciplines, committed to explicitly

- **Every guard is run against a deliberately broken model first and must fail for
  the stated reason.** Guard 5 especially: with `σ_r = 0` it must go red. A test
  never watched failing is not evidence.
- **Every negative assertion carries a positive control in the same test**, so a
  broken harness reads as broken rather than as "suppression confirmed".
- **Seeded RNG alone does not give reproducibility.** Iteration over insertions
  must be deterministic — ordered arrays, never `Set`/`Map` traversal order. This
  failure mode produces runs that are half byte-stable and half not.

## 7. Layout

```
sim/          pure TS core — state, step, params, explicit seeded RNG. No DOM, no I/O.
experiments/  node runners, one registered question each, emit CSV
tests/        vitest guards, one per §6 claim
tools/        sweeps and probes
web/          browser UI importing sim/ — no second model
docs/         ROADMAP.md canonical; REFERENCES.md; dated pre-registrations and results
```

Follows the `_pm` convention recorded in `README.md`. **Analysis figures are R +
ggplot2** from one sourced theme file — experiments emit CSV, R renders. The
canvas rendering inside the toy is not a plot and does not go through that path.

## 8. First registered question

Every simulation in `REFERENCES.md` models transposition rate at the **family**
level. This design models it **per copy**. Therefore:

> **Does per-copy rate heritability change invasion outcomes relative to
> family-level rate, holding everything else fixed?**

Answerable, unasked in the reference base, and directly derived from §2's unit
decision — which converts that decision's one real risk into the project's
registered contribution. **Pre-registers in `docs/` before the runner exists**, per
convention (ROADMAP task #7).

## 9. Out of scope

No meta-progression, no save/load, no tech tree, no multiple chromosomes, no
nested insertions (SLiM's stated limitation; not competing there), no vector-valued
`s`, no sequence-level mutation beyond the scalar coordinate, no host-as-protagonist
mode (held as a possible second toy).

## 10. Open items carried into planning

- **Blocks guard 1:** confirm the Charlesworth 1983 fitness form and coefficients
  from the paper itself (ROADMAP task #4). The reference base was built from
  abstracts and registry metadata.
- **Confirm before repeating:** the claim that SLiM "compresses TEs into individual
  units, precluding TE sequence mutagenesis and nested insertion" comes from a
  competing tool's preprint, not SLiM's own docs (`REFERENCES.md` §7).
- **Still unverified:** Dfam, Repbase and the Asparagales pointer (§8 of the
  reference base). Not on the critical path for v1.
- **Parameter defaults** are unset; they need a first calibration pass against
  guards 1–3.
