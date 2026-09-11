# Changelog

Milestone-boundary entries. Appended in the commit that closes a milestone.

## [1.0.0] — 2026-09-10

First public release: the toy goes on GitHub Pages and the findings become
readable by a stranger. **The registered model ships as registered** — questions
001–005 are answered and their limitations ship as limitations, not as fixes. No
`sim/` behaviour, no `defaultParams`, and no constant changed in this release.

### Added

- **`docs/FINDINGS.md`** — the five registered questions written for a stranger:
  prediction as registered → result → verdict → what it does not show, with each
  number carrying its CSV, its runner and its commit. Every headline number was
  recomputed from `experiments/*.csv` independently of the R analysis before it
  was written down.
- **`docs/RELEASE-1.0.md`** — the release evidence log, including a disposition
  table classifying all 23 open roadmap items as claim-invalidating,
  interpretation-limiting, or future work.
- **`docs/THIRD-PARTY.md`** — no code, fonts or data are vendored; Repbase
  appears only as a statement that it is closed.
- **`LICENSE`** (MIT, code) and **`LICENSE-docs`** (CC BY 4.0, documentation,
  figures and data), with the boundary stated in `README.md`.
- **`CITATION.cff`**.
- **`.github/workflows/pages.yml`** — build, test and publish to Pages. It
  installs Chromium before `npm test`, because two test files drive a real
  browser and the suite cannot pass without it.
- `engines: { node: ">=22" }` in `package.json`.

### Changed

- **`vite.config.ts` sets `base: "/transposon-genome-ecology/"`**, which a
  project site on GitHub Pages requires; without it the page loads and every
  asset 404s. The base is exported as `BASE` and imported by guard 7 rather than
  re-typed, so the guard cannot pass against a stale literal after the base moves.
- **Figures `fig-001` … `fig-004` re-rendered under the current house style.**
  They predated the gridline change made during 005's review and were still
  drawing the retired `grey90` at 1.26:1, below this project's own 3:1 floor, so
  "one house style per project" was false until now.
- **`README.md`**: a play link, a link to FINDINGS, and the licence boundary at
  the top. Its claim that "**one** registered question has been asked and
  answered" was false — five have been — and is replaced by a verdict table.
- **The toy's legend** now states the domestication limitation where a visitor
  meets it.

### Fixed

- **`fig-001` was not reproducible.** `plot-001.R` called `geom_jitter` with no
  seed anywhere in the file, so the figure differed on every run and "re-run the
  script to reproduce it" was untrue. Pinned with `set.seed(1)`; three
  consecutive runs now produce one hash, with the primary statistic unchanged.
  It was the only RNG call in any plot script, which is why the other four were
  already byte-stable.
- **`.superpowers/` added to `.gitignore`.** It was hidden only by a
  machine-local global excludesfile, which does not travel with a clone.

### Known limitations, shipped deliberately

- **Domestication cannot happen at the shipped defaults.** `wDom = 0.01` sits
  below the measured persistence threshold of `0.03 < wDom* ≤ 0.075`, so
  domesticated copies appear, peak, and are lost to zero at every seed. It is a
  calibration limit, not a missing mechanism. Retuning it would invalidate every
  registered result above, so it was left alone.
- **`t_sat` is not a power law in `phi`**, and the exponent measured is a
  property of the fitting window. No shipped sentence quotes an exponent as a
  property of the system. The next registration must test a functional _form_.

## Unreleased

### The repertoire lookup is bounded — `sim/silencing.ts`, `sim/phases/trap.ts`

First of v1's four carried-forward limitations to close. `Genome.repertoire` is
now kept **sorted ascending** and `isSilenced` binary-searches it, testing only
the insertion point's two neighbours — exhaustive for the minimum in any sorted
array, so it holds without any assumption about the repertoire's spacing or
distinctness. The scan it replaces was `O(copies × repertoire)` per pass over a
repertoire that nothing ever shrinks, which is why **the toy got slower the
longer anyone watched it**. Profile at `TOY_DEFAULTS`, seed 1, on `reset()` in
`web/main.ts`. The model's behaviour is unchanged: no phase consumes a different
number of RNG draws and every `Snapshot` field is bit-identical at five seeds and
eight generation marks.

Three things this found that were believed and are false:

- **Golden hash `9c15fd28` did not move.** `docs/ROADMAP.md`, `web/main.ts` and
  `web/render/field.ts` all recorded that a sorted repertoire "changes that
  array's ORDER, which `stateHash` reads", so the change needed "a check against
  golden hash `9c15fd28`". Every genome holds exactly ONE repertoire entry at
  generation 15 of that configuration — `θ/σ_s` is 5 there, the regime where one
  entry silences a whole family — and a one-element array digests identically in
  any order. The project's determinism oracle **could not fail** for the only
  observable this change has. `tests/step.test.ts` now carries a second pin at a
  multi-entry configuration, with the push-order hash measured alongside the
  sorted-order one so the coverage claim is checkable.
- **The two render no-mutation tests were what actually broke**, and they broke
  on their own fixture controls rather than on their claims: a repertoire that is
  already ascending cannot be re-sorted, so `sortedRepertoire`'s load-bearing
  `.slice()` could have been deleted with both tests still green. Both now hand
  the render a deliberately reversed repertoire.
- **`tests/render-field.test.ts` (a2) stopped being a cross-check.** It held
  `web/render/field.ts`'s binary search against `sim/silencing.ts`'s linear
  scan; both sides are searches now. The scan moved into
  `tests/silencing.test.ts` as an explicit reference, checked over 20 000
  generated repertoires (empties, duplicates, exact-θ ties) and over every copy
  of every genome across real generations.

Also corrected: `web/controls.ts` attributed the asexual flood's frame cost to
`O(copies × repertoire)` in a sentence directly contradicted by the paragraph
below it, which measures most of that cost as one `fillRect` per copy.

## v1 — the model, seven guards, the toy, one registered question (2026-09-03)

First milestone. Closes `impl/sim-core-v1`. Backfilled in one entry: the branch
covers the whole of the 20-task implementation plan, and there was no earlier
milestone to record.

### The model — `sim/`

Six phases composed by `step(world)` over a population of `N` genomes, each a
sorted array of copies plus a piRNA repertoire:

1. **transpose** — each active, unsilenced copy inserts with probability `r` into
   a rejection-sampled empty site; the daughter inherits `r` and `s` with
   mutation (`r' = r · exp(𝒩(0, σ_r))` clipped to `[0, r_max]`).
2. **trap** — a copy landing in a cluster site adds its `s` to the genome's
   repertoire, silencing everything within `θ` **by similarity, not by label**.
   Gated by the tolerance dial, so a tolerating host is never conscripted.
3. **domesticate** — a copy in a beneficial site may be co-opted: fitness bonus,
   transposition permanently off, exempt from silencing, never reverts.
4. **lose** — excision at rate `v`; domesticated copies are structural and stay.
5. **select** — fitness falls with copy number (Charlesworth) and rises with
   domesticated count; the damage term's SHAPE is what `t` moves.
6. **reproduce** — fitness-proportionate, sexual with free recombination or
   clonal; offspring inherit the mother's repertoire.

**The unit of individuality is the COPY.** Transposition rate is a per-copy
heritable trait and "family" is an emergent label, never declared — the copy is
the only candidate that carries a variation generator. Silencing is derived, not
stored, which is what makes escape-by-divergence fall out rather than be coded.

Deterministic and seeded (mulberry32 + Marsaglia polar). `tests/step.test.ts`
pins the RNG draw stream to golden hash `9c15fd28`.

### The seven guards — `tests/guards/`

Each asserts one claim against its own matched null, with the positive control
in the same test body, and each carries a **WHAT THIS GUARD DOES NOT CLAIM**
section.

1. **Charlesworth equilibrium** — a linear fitness function does not control copy
   number; the quadratic term does.
2. **Three phases** — Kofler 2019's invasion/plateau/inactivation are detectable,
   and `detectPhases` reports a named failure rather than guessing.
3. **Cluster threshold** — repression onset lands inside Kofler 2020's 0.2–3%
   band, asserted at fourteen reduction constants rather than one.
4. **Knockout → bloat** — direction only, eleven seeds, non-overlapping ranges.
5. **Rate evolves** — the kill-switch on copy-as-unit.
6. **Escape** — a diverged sublineage escapes an established trap.
7. **One implementation** — browser and node agree on the state hash, byte for
   byte.

### The toy — `web/`

Four linked panels (site field, copy-number timeline, `r`-versus-`s` scatter,
cluster inset), four buttons and four sliders. The verb is **perturbing the
world, never the element**: rate is never chosen, only selected.

### One registered question — `docs/pre-registrations/`, `experiments/`

`2026-09-02-per-copy-vs-family-rate.md` was written before the runner existed
(`f5ae5b1`); `001-per-copy-vs-family-rate.ts` answers it (`4995f3b`). The result
reproduces from its committed CSV.

### Grounding — `docs/`

`REFERENCES.md`, 38 works resolved live against OpenAlex.
`charlesworth-1983-equilibrium.md` is a full read of the null model, including
the structural reason its analytic constant does not transfer.

### Pre-merge fix wave (2026-09-03)

Two independent reviews found no code defect in the model. `sim/` is verified
code-identical to its pre-review state — comments only. The wave fixed:

- **Guard 7 validated a regime the toy does not run.** It compared node against
  the browser only at `defaultParams({N, S, seed})`, while the toy runs
  `TOY_DEFAULTS`, which differs in ten fields — including `rMax` 1 → 0.2, which
  makes the transposition clamp routinely binding. Both regimes now run, and
  `TOY_DEFAULTS` is imported so the coupling is compile-checked. A new positive
  control asserts the two presets are actually two scenarios in both
  environments.
- **Guard 5 was the only single-seed guard in the body**, while it justifies
  copy-as-unit. All three tests now loop five seeds. Looping exposed that the
  file's own occupancy rationale was a seed-101 artefact: the NEUTRAL arm reaches
  74% occupancy at two of five seeds, not "under 9%".
- **Guard 5 rested on a biased statistic.** `E[exp(𝒩(0,σ))] > 1`, so the
  arithmetic mean of `r` rises from mutational bias alone. The guard now also
  asserts the **geometric** mean, which mutational bias cannot move.
- **The README said its own contents did not exist** ("the design has NOT been
  done yet"). Rewritten to describe the built artifact.
- **`ROADMAP.md` was nine tasks behind** and its "Not yet done" list omitted every
  known limitation. It now carries the four carried-forward defects.
- **Guard 7's engine scope was unstated.** Node and Playwright Chromium are both
  V8; the guard establishes one codebase through one bundler on one engine
  family, not engine-independence. Narrowed in the guard, the spec and the README.
- **An uncited literature claim** ("silenced TE insertions persist as genomic
  fossils") was split into a cited part (Brouha et al. 2003) and a stated
  modelling assumption.
- Corrections to a superseded equilibrium figure, a misattributed `stateHash`
  consumer, a false `toFixed(9)` tolerance guarantee, three unlabelled entailed
  assertions, and an overstated poke table. Cross-guard corroboration between
  guards 3 and 4 recorded in both files.
