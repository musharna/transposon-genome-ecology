# Transposons as genome ecology — design

**Date:** 2026-09-02 · **Status:** approved in brainstorm, not yet planned
**Grounding:** `docs/REFERENCES.md` (38 works, registry-verified 2026-09-02, extended 2026-09-03)
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
| Session shape             | Poke-and-watch, minutes               | Smallest thing occupying the gap; guards 1, 3 and 4 are literally pokes — see the note below                                   |
| Stack                     | One TS core, browser UI, node runners | One implementation, so the thing played is provably the thing validated                                                        |
| **Unit of individuality** | **The copy**                          | Below                                                                                                                          |

⚠️ **"Every §6 counterfactual is literally a poke" stood in that cell and is
narrowed as of 2026-09-03.** Three of the seven are: guard 1's fitness arms are
reachable through the sliders, guard 3's cluster sweep is the cluster-size
slider, and guard 4's knockout is the silencing button. **Guards 5 and 6 have no
poke at all** — guard 5 contrasts `sigmaR` on and off, and the toy exposes no
`sigmaR` control (turning the variation generator off would freeze evolution,
which is a debugging state, not a perturbation); guard 6 hand-places copies at
chosen `s` coordinates, which is the injection poke §4 records as unbuilt. Guard
2 is a detector over a trajectory rather than a counterfactual, and guard 7 is a
build-integrity check. So the honest form of the claim is that the validation
surface and the interaction surface OVERLAP substantially, not that they
coincide.

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

**RESOLVED (Task 15).** Charlesworth & Charlesworth 1983 has been read from the
OA PDF; the reading is `docs/charlesworth-1983-equilibrium.md` and the summary
lives on `copyNumberLoad` in `sim/phases/select.ts`. Three findings:

1. **The fitness form stays.** The paper's own form is `w_n = 1 - s·n^t`
   (eq. 23, p. 13), a different functional family from our
   `w_n = exp(-(a·n + b·n²))`. Ours was checked against the paper's _conditions_
   rather than pattern-matched to its formula, and it satisfies them:
   `∂² ln w_n/∂n² = -2b < 0` is the p. 11 requirement for an interior
   equilibrium, and at `b = 0` our model degenerates to exactly the
   independent-effects multiplicative case p. 12 rules out. Ours is also better
   behaved — eq. (23) goes negative for large `n` and needs truncation. The form
   was NOT replaced.
2. **Excision is a separate constant per-element rate** (`v` here, `v` there,
   p. 11) and enters the balance only as the difference `u - v` (eqs. 20a, 29).
   That is what our `lose` phase already does.
3. **The paper's NUMBER does not transfer, and guard 1 asserts none.** Eq. (29),
   p. 16 gives `-∂ ln w_n/∂n ≈ u - v`, predicting `n̄ = (r - v - a)/(2b) = 48` at
   our defaults; measured it is 26.8. Charlesworth is diploid, our genome is
   haploid, and `reproduce.ts` discards a site inherited from both parents — a
   relatedness-dependent copy sink the null model has no counterpart for, which
   also makes the equilibrium N-dependent (19.2 / 26.8 / 31.3 copies per genome
   at N = 100 / 200 / 400). Calibrating the constant off our own simulation
   instead would be circular. Guard 1 asserts the paper's qualitative
   predictions against the paper's own negative controls; see §6.

**Coefficient defaults were NOT changed by Task 15.** Every other guard in the
suite is derived against the current `defaultParams` values and the golden hash
in `tests/step.test.ts` pins the number of RNG draws consumed.

## 4. The pokes

Each maps to a counterfactual or calibration target, so the interactions are also
the validation surface.

| poke                              | what it exercises                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Silencing knockout                | Genome bloat (§6)                                                                                                                                                |
| Cluster-size slider, 0→5%         | Kofler 2020's threshold — the player finds ~0.2%                                                                                                                 |
| Seed a fresh invasion (next seed) | Kofler 2019's three phases, live                                                                                                                                 |
| Sex ↔ asex                        | Nowell 2021's bdelloids — theory predicts disruption; reality does not                                                                                           |
| **Resistance ↔ tolerance** (`t`)  | Resistance silences: pays the neighbour cost, builds clusters, **is conscriptable**. Tolerance absorbs damage: flat cost, no clusters, **cannot be conscripted** |
| Population size (shrink only)     | Drift                                                                                                                                                            |
| Domestication                     | A copy landing in a beneficial site may be co-opted: fitness bonus, transposition permanently off. The alternate win                                             |

The resistance↔tolerance dial is the only poke that changes whether the trap can
exist at all, which is what makes §3 and §4 of the reference base interact rather
than sit side by side.

### ⚠️ Three rows narrowed against what was built (2026-09-03)

All three rows above overstated what shipped, and all three are corrected in
place rather than left to be discovered from the code.

**"Domestication — the alternate win" IS A REAL BEHAVIOUR OF THIS MODEL AND AN
UNREACHABLE ONE AT THE SHIPPED DEFAULTS.** Guard 8
(`tests/guards/domestication.test.ts`) measured it at eleven seeds after this row
was written. Above a bonus threshold the win is exactly as described, and
stronger than described: domesticated copies persist through the total extinction
of the still-transposing family, holding 17.84–22.16 copies per genome at
generation 600 and still 16.98–19.57 at generation 2000 (three-seed probe) with
zero parasitic copies left. **Below
the threshold they are made and then lost to zero at every seed, and
`defaultParams`' `wDom = 0.01` is below it** — the measured band at that guard's
arm is `0.03 < wDom* <= 0.075`, so the shipped value is 7.5x under the lowest
bonus at which every seed keeps a copy, with `beta = 0.005, pDom = 0.001` making
the event rare on top of that. The loss route is **segregation**, not excision and
not selection: a domesticated copy is exempt from `lose` and from `isSilenced`,
but not from the free-recombination draw in `reproduce`, and by ceasing to
transpose it has given up the only mechanism that could restore its own
frequency. The same arm under `sexual: false` keeps them at every seed. **The
defaults were NOT changed** — that would move every guard derivation and the
golden hash — so the row stands as a statement about the model, not about the
configuration the toy runs at. `docs/ROADMAP.md` carries it as an open
calibration item.

**And one claim in the "Resistance ↔ tolerance" row is now measured and holds in
a stronger form than "cannot be conscripted" suggests.** Guard 9
(`tests/guards/tolerance.test.ts`): at `t = 1` no genome holds a repertoire entry
at any generation, at any seed, while 268..463 copies sit in cluster sites — the
trap is offered material and declines it. The boundary is a DISCONTINUITY rather
than the end of a gradient: at `t = 0.99` every genome at every seed still forms a
repertoire. ⚠️ The corollary the row invites — that intermediate `t` interpolates
observably in the population — was measured and is FALSE at that arm: mean
repertoire size is non-monotone in `t` over {0, 0.25, 0.5, 0.75} at ten of eleven
seeds, because the repertoire saturates. §3.2 step 5's "intermediate `t`
interpolates" is exact for the FITNESS term (`damageLoad` is linear in `t`, and
the guard asserts the ordering reversal and its crossing at `t = 0.5`) and is not
a claim the population's repertoire supports.

**"Seed an invasion (new `s`, chosen `r`)" was not built, and should not have
been promised.** `web/controls.ts:409-411` fires `onReset({ seed: params.seed + 1 })`
— a full restart of the world on the next seed. There is no injection of a
lineage at a chosen `s` and `r` into a _running_ world. That is a different and
considerably harder poke: it needs a UI for two continuous parameters, a rule for
where the invader lands, and a decision about whether the resident family's
established trap already covers the invader's `s` — which is guard 6's question,
not a control. What shipped is a fresh world, which still exercises Kofler's
three phases from generation 0 and is honestly captioned as "seed a fresh
invasion". **Injecting into a live world remains unbuilt.**

**"Population size" is shrink-only, with a floor of 20, and the asymmetry is
deliberate.** `web/controls.ts:101-105` halves `N` down to `N_FLOOR = 20` and
there is no grow button. The reasoning belongs here rather than only in the
control: _every other poke changes the conditions a population lives under, and a
grow-the-population button would be manufacturing the population itself, which is
not a poke in this toy's grammar._ It is also the honest behaviour — drift is not
reversible in a real population either. A session that has shrunk to the floor
needs a reload, and the floor caption says so, because a state you cannot leave
has to name the way out or a visitor reads a disabled button as a broken one.

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
   non-zero, non-saturating equilibrium, reached from a high-copy start as well
   as from below; a LINEAR fitness function does not control copy number while
   the quadratic term does. Asserted qualitatively, against the paper's own
   negative controls (`b = 0` is the multiplicative model of p. 12; no selection
   at all is the `f(0) < u - v` baseline of p. 11), and NOT against an analytic
   constant — see §3.4 finding 3 for why there is no constant to assert.
   _The floor._ `tests/guards/equilibrium.test.ts` + `equilibrium-arm.ts`,
   derived by `scripts/explore-equilibrium.ts`.
2. **Three phases** (trap on) — assert the _ordering_ amplification → plateau via
   segregating cluster insertions → inactivation, not merely the endpoint.
3. **Cluster threshold** — sweep `c`; repression onset must land in Kofler's
   0.2–3% band under matching conditions.
4. **Knockout → bloat** — direction only, not magnitude.
5. **Rate evolves** — mean `r` moves with the variation generator ON and does
   _not_ move with it OFF. Guards the entire justification for copy-as-unit.
   ⚠️ As built, the null is `sigmaR = 0`, **not** "selection off": a
   selection-off arm still moves the mean, because the mutation `r · exp(𝒩(0,σ))`
   has `E[multiplier] > 1`. The guard therefore also asserts the **geometric**
   mean, which mutational bias cannot move. Runs at five seeds.
6. **Escape** — a diverged sublineage escapes an established trap.
7. **One implementation** — a headless-browser run of `n` generations must produce
   a state hash identical to the node run, at the plain scenario **and at the
   toy's own parameters**. Without this, "the thing you play is the thing that is
   validated" is an unbacked assertion.

   ⚠️ **SCOPE, and it is narrower than the sentence above suggests.** Node and
   Playwright's Chromium are both V8, so what this establishes is ONE CODEBASE,
   THROUGH ONE BUNDLER, ON ONE ENGINE FAMILY — that Vite's transform and
   minification did not change the model's behaviour. It is **not**
   engine-independence. The model reaches `r` and `s` through `Math.exp`
   (`sim/phases/transpose.ts:35`, `sim/phases/select.ts:103` and `:147`) and
   `Math.sqrt`/`Math.log` (`sim/rng.ts:39`), all of which ECMA-262 permits an
   implementation to approximate; because `normal()` feeds the RNG stream, a
   last-ulp difference would diverge the ORDER of draws, not just a low digit.
   A second engine family in CI would be needed to say more, and none has run.

8. **Domestication is an alternate win, above a benefit threshold** — added
   2026-09-03, when a phase-coverage audit found `pDom = 0` in all six scientific
   arms and therefore nothing asserting anything about §3.2 step 3. Asserts the
   CONTRAST, at eleven seeds: below the threshold domesticated copies are made and
   lost to zero; above it they persist THROUGH THE FAMILY'S TOTAL EXTINCTION; and
   the same below-threshold bonus under `sexual: false` keeps them, which pins the
   loss route to segregation rather than to excision or selection. ⚠️ Its
   below-threshold arm is the SHIPPED DEFAULT `wDom`, so the guard is also the
   record of the calibration finding in §4. `tests/guards/domestication.test.ts` +
   `domestication-arm.ts`, derived by `scripts/explore-domestication.ts`.

9. **Resistance and tolerance differ in kind, not degree** — added 2026-09-03,
   when the same audit found `t = 0` in all seven arms and in both parameter
   defaults, so `damageLoad`'s tolerance branch had never executed in a population
   run. Three claims: at `t = 1` no repertoire forms at any generation at any
   seed while hundreds of copies sit in cluster sites; `t = 0.99` still forms one
   in every genome, so the boundary is a discontinuity rather than the end of a
   slope; and the fitness ORDERING between an active-heavy and a silenced-heavy
   genome of equal copy number REVERSES between `t = 0` and `t = 1`. ⚠️ It
   deliberately asserts NO mid-dial population gradient — see §4.
   `tests/guards/tolerance.test.ts` + `tolerance-arm.ts`, derived by
   `scripts/explore-tolerance.ts`.

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

- ~~**Blocks guard 1:** confirm the Charlesworth 1983 fitness form and
  coefficients from the paper itself (ROADMAP task #4).~~ **RESOLVED in Task 15**
  — read from the OA PDF, written up in `docs/charlesworth-1983-equilibrium.md`,
  summarised in §3.4. The form is confirmed as-is and the coefficients are
  unchanged; what the paper does NOT supply is a transferable equilibrium value,
  for the structural reason recorded there.
- **Confirm before repeating:** the claim that SLiM "compresses TEs into individual
  units, precluding TE sequence mutagenesis and nested insertion" comes from a
  competing tool's preprint, not SLiM's own docs (`REFERENCES.md` §7).
- **Still unverified:** Dfam, Repbase and the Asparagales pointer (§8 of the
  reference base). Not on the critical path for v1.
- **Parameter defaults** are unset; they need a first calibration pass against
  guards 1–3. Task 15 deliberately did NOT do this: guards 2–6 are each derived
  against their own pinned arm, and moving a default would move the golden hash
  and every one of those derivations at once.
- ⚠️ **KNOWN DIVERGENCE FROM BIOLOGY — full inactivation implies the family DIES.**
  `lose` keeps excising silenced copies that silencing prevents from replacing
  themselves, so once a family is fully silenced its decay to zero is guaranteed.
  Measured in ARM 4 of `scripts/explore-three-phases.ts`: total copies fall from a
  peak of 3400–6847 to 249–818 by generation 120 and 9–201 by generation 200, and
  8 of 11 seeds reach zero on or before generation 300 (earliest 205).

  Real silenced TE insertions largely persist as **genomic fossils** rather than
  being purged, so this is a genuine divergence and not merely a parameter choice.
  It is NOT fixed: changing `lose` would alter the RNG draw stream and invalidate
  every calibration in the suite at once. It is the direct reason `detectPhases`
  conjoins `totalCopies > 0` and `silencedCopies > activeCopies` onto the
  crossing — without those, this arm run far enough would report a
  spike-and-crash to extinction as Kofler's inactivation phase.

  `tests/guards/three-phases-arm.ts` says this divergence "is flagged for the spec
  instead". **This bullet is that flag** — before 2026-09-03 the sentence pointed
  at nothing.
