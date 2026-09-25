# Changelog

Milestone-boundary entries. Appended in the commit that closes a milestone.

## Unreleased

### Added

- **The repertoire lookup's cost is now tested, counted in entries read.** The 2026-09-03 fix
  (`isSilenced` binary-searches the sorted repertoire instead of scanning it) was guarded
  only on its ANSWER (`tests/silencing.test.ts`, which the scan also passes) and on the
  flooded-frame ceiling of 20 000 ms in `tests/layout.test.ts`, which the 1 ms → 36 ms
  regression also passes. `tests/silencing-cost.test.ts` wraps each real genome's
  repertoire in a Proxy and requires every lookup to read at most ⌈log₂(n + 1)⌉ + 2
  entries, for `isSilenced` and for the render field's `nearestSignedDistance`. Seen to
  fail: with either function put back to a scan, only this file fails ("read 38 of 41
  repertoire entries (ceiling 8)"), while the 18 silencing and 15 render-field tests pass.

## [1.0.2] — 2026-09-17

### Added

- **Basic accessibility of the page.** `<main>`/`<aside>` landmarks, an `h1` in the masthead
  and `h2` panel titles (drawn exactly as the divs they replace, so `tests/layout.test.ts`'s
  measured heights hold); every slider named through `<label for>`; `role="img"` and an
  `aria-label` on all four canvases; a visually-hidden `aria-live="polite"` mirror of the
  readout's counts (`liveSentence` in `web/tally.ts`, same snapshot fields, rewritten at most
  every 3 s); `:focus-visible` styles; a `prefers-reduced-motion` block. CSS only for the
  latter: `frame()` in `web/main.ts` steps the model and paints in the same rAF callback, so
  lowering the render cadence would slow the simulation. Pinned by `tests/a11y.test.ts`.

### Fixed

- **`tests/layout.test.ts`'s flood waits were budgeted in the wrong unit.** They gated on
  `occupancy > 0.9` — an event that arrives after some number of **generations**, with the
  page advancing one generation per animation frame — using a **240 s wall-clock** budget.
  Generations-per-second is set by how much CPU the host has spare, so the budget silently
  shrank, measured in generations, exactly when the box was busy. Measured on one machine,
  one tree, one commit: **~9 s at load average 10, and the full 240 s blown at load average
  20.5** with four foreign processes pinning all 16 cores.

  Concurrency inside vitest was ruled out by measurement rather than assumed: the same test
  takes **9.1 s isolated against 9.9 s inside the full 22-file suite**, a 9% difference, so
  the sibling files are not the cause.

  Replaced by `waitForWorld`, which fails only when the world has genuinely **stopped** —
  `stallMs` of wall clock with no change in `generation`. A freeze is a real event and is
  legitimately measured in seconds; a merely slow host now waits longer and passes, which is
  the correct outcome. The failure message names the stall instead of blaming an occupancy
  that was still climbing. This applies to the waits the rule the file already stated for its
  assertions: "a frame-time threshold is a property of the machine running it; what is
  asserted is the part that is not".

### Added

- **A guard on that guard** (199 tests, up from 198). `waitForWorld` can fail exactly one
  way, so an untested failure path would not report a slow failure — it would report nothing
  and hang until vitest killed the file. The new test freezes the page by starving its
  animation-frame loop and asserts the stall is both detected and named, with a positive
  control asserted first in the same body (the world IS advancing before the freeze), so it
  cannot pass on a page that never ran.

## [1.0.1] — 2026-09-11

A documentation-correctness release, from a 10-judge review panel on v1.0.0. **Every
change here changes what is SAID, never what was measured.** No `sim/` behaviour, no
`defaultParams`, no `TOY_DEFAULTS`, no constant, no pre-registration and no experiment
was touched; nothing was re-run to produce a different number.

### Fixed — claims that disagreed with the tree

- **"The validation surface is seven guards" was wrong; there are nine.**
  `tests/guards/` has held `domestication.test.ts` (guard 8) and `tolerance.test.ts`
  (guard 9) since before v1.0, and README already cited "guard 8's arm" twice while its
  own table stopped at seven. The table is now nine rows, each new row carrying what the
  guard does **not** claim: guard 8 does not locate a threshold in the model, guard 9
  does not claim the dial is graded. The same count is fixed in `docs/RELEASE-1.0.md`
  and, as a consequence of it, in two "the other six guards" sentences
  (`README.md`, `tests/guards/one-implementation.test.ts`) that are now eight. The v1
  entry below is left as written — it was true on 2026-09-03 — with the later count in
  parentheses.
- **"Two of them falsified the thing they were testing" counted nothing in particular.**
  The verdict table bolded only 002. Counted one way and made to match: one registered
  **primary** was falsified (002); registered **secondaries** were falsified in 003, 004
  and 005; and 004's third secondary was later **retracted** as unresolvable. Each row of
  the table now says which level the falsification was at.
- **A direction error in `docs/FINDINGS.md`.** 004's controlled edge `phi = 0.016` was
  described as "four doublings **above** 003's first nonzero grid step of 0.125". It is
  three doublings **below** it (0.016 → 0.032 → 0.064 → 0.125), which is the whole reason
  003 saw control only at exactly zero — the controlled region sat underneath 003's first
  step. The same sentence is corrected in `docs/ROADMAP.md`.
- **`sim/silencing.ts` quoted a superseded profile.** It read "0.67 ms at generation 200
  against 15.97 ms at 6000, a 24x slowdown" and cited `web/main.ts`, which holds
  1.06 → 35.73 ms. Those were the pre-implementation brief's numbers and were never
  updated to the measured ones. Now 1.06 → 35.73 ms, a **33.7x degradation** — and the
  comment now names the quantity, because 33.7x (before-at-6000 over before-at-200) is
  not the 34.7x **speedup** in the same row of that table (before over after, at
  generation 6000). `web/main.ts` already warned "name the quantity before quoting a
  multiple"; this is the sentence that did not.
- **`sim/params.ts` said `TOY_DEFAULTS` "overrides ten of them".** It lists 17 of the 20
  `Params` keys and actually changes **12**; the other five — `a`, `d`, `dTol`, `t`,
  `wDom` — restate the default rather than override it. `wDom` in particular is the same
  0.01 in the toy as in `defaultParams`, which is exactly the constant the domestication
  limitation is about.
- **`docs/REFERENCES.md` undercounted itself.** The header said "38 works / 42 DOIs" from
  2026-09-03 and was never updated when §7's registry sweep and §8's dataset resolutions
  added their own citations. Re-tallied 2026-09-11: **51 distinct DOIs across 41
  DOI-bearing entries**, with the reproduction command in the header and the dated
  earlier figures kept as the record of what the base held then. `docs/dois.txt` is
  verified to be exactly that DOI set, in both directions. `README.md`'s "38 works"
  follows.

### Fixed — the toy page

- **It said what it was nowhere.** A visitor landing on the Pages site got canvases and
  no sentence. There is now a one-line masthead: what the model is, the constraint that
  shapes it, and links to the findings, the source and the licences. It is a row of
  `#stage` rather than of `#app` or `#controls`, deliberately — a child of `#controls`
  becomes a sixth entry in the section list `tests/layout.test.ts` asserts by exact
  equality, and a full-width row shortens the control column, where `#trap-panel` has
  only 28px of measured slack above its 161px floor. Taking the height from the field
  canvas costs no claim.
- **The legend stated a measured band as a model property.** "the measured persistence
  threshold of 0.03–0.075" now says it was measured **on guard 8's arm**, with that arm's
  constants (`beta` 0.1, `pDom` 0.2, `N` 200, generation 600) and the explicit statement
  that the band belongs to the arm and not to the model — which is what guard 8's own
  test says and what `FINDINGS.md` already said.

### Fixed — reproducing it

- **Setup did not mention its hardest requirement.** `README.md` now leads with Node ≥ 22
  and the reason (Node 18 has no `styleText` in `node:util`, and both `vitest run` and
  `vite build` crash at startup), and says Playwright is needed by `npm test` and not by
  `npm run build` or `npm run preview`. `FINDINGS.md`'s "Reproducing this" gains the same
  Playwright line.
- **`--with-deps` is the fallback, not the first line — and the clean-clone check is what
  proved it.** This release first wrote `npx playwright install --with-deps chromium` into
  Setup as the required step. Running it from an actual fresh clone failed:
  `sudo: a password is required` / `Failed to install browsers`. `--with-deps` invokes the
  distro package manager for Chromium's shared libraries, so it needs root and dies where
  sudo is non-interactive. Setup now leads with plain `npx playwright install chromium`,
  which needs no privileges, and presents `--with-deps` as what to reach for if Chromium
  then fails on a missing library — marked Linux-only **and** root-only, noting that
  `.github/workflows/pages.yml` can use it because a GitHub runner has passwordless sudo.
- **Re-running experiment 005 was presented as a casual check.** It is not: the
  registered cost table budgets **~16 h** single-process or **~6 h** sharded across three
  ratios, and the runner `writeFileSync`s the committed
  `experiments/005-delay-divergence.csv` and truncates it before the first row. Both
  facts now sit beside the command, with "do not run this to check the figures" and a
  pointer to `Rscript docs/analysis/plot-005.R` instead.

### Fixed — found by the release's own critic pass

A fresh critic was run against the rendered toy and the prose, told to falsify rather
than approve. It returned nine class-1 findings (a count disagreeing with the tree), zero
class-2 (broken links) and two class-3 (an unqualified threshold claim). All are fixed
here; two of them were introduced by this release.

- **Introduced here, and caught here: `web/index.html`'s stage arithmetic went stale the
  moment the masthead was added.** The box-sizing comment proved the layout with
  `8 + 368 + 8 + 180 + 8 + 220 + 8 = 800`, which is three rows and two gaps. Adding the
  masthead made `#stage` four rows and three gaps. Re-measured and rewritten, with the
  old identity kept as the "before": `8 + 32 + 8 + 328 + 8 + 180 + 8 + 220 + 8 = 800`,
  still exact.
- **Introduced here: "51 DOIs across 41 cited entries" was not reproducible.** The 51 is
  right and has a command behind it; the 41 came from a segmentation script that
  captured only 48 of the 51 DOIs, and "cited entries" contradicted the very next
  sentence, which said a cited tool was _not_ among the 41. **No works/entries count is
  published any more** — `REFERENCES.md` now says why (one work is entered in two
  sections, and §8 cites up to six DOIs under one bullet, so "entry" has no segmentation
  rule a reader would reproduce) and states only the DOI count, with its command.
- **The guard-count fix missed the top of the file it was fixing.**
  `tests/guards/one-implementation.test.ts` had "Six guards validate the model by running
  `sim/` in node" four lines above the "other six guards" that _was_ corrected. Both now
  read eight. The same docblock's "the other eighteen test files" is now twenty-one
  (there are 22), and its "TEN of `TOY_DEFAULTS`' seventeen fields differ" — followed by
  a parenthetical listing twelve — now leads with twelve and explains that ten is the
  count once `N` and `S` are set aside.
- **`docs/RELEASE-1.0.md` did not just carry the stale "38 works / 42 DOIs" — its
  explanation was falsified.** It accounted for `docs/dois.txt`'s 51 by saying `docs/`
  cites works outside `REFERENCES.md`. `REFERENCES.md` itself holds all 51, and
  `dois.txt` is exactly its DOI set; there was never an excess to explain. Both halves
  corrected in place, with the withdrawn reasoning recorded.
- **`docs/ROADMAP.md` carried both retired counts** — "38 registry-verified works (42
  DOIs)" and "all seven guards" — in the file `FINDINGS.md` names as the running record.
- **`docs/FINDINGS.md` named two of the five things the domestication band depends on.**
  It said the bounds are "a property of that arm's `beta` and `pDom`". The guard says the
  band moves with `N`, with `v`, with `beta` and `pDom`, **and with the horizon** — and
  demonstrates the last one numerically: at `wDom = 0.05`, five of eleven seeds hold
  copies at generation 600 and none do at 1000. FINDINGS is the page a reader is sent to
  for this limitation and was the weakest statement of it; it now carries all five and
  the generation-1000 result. `README.md` was missing `v` and now lists all five.
- **Guard 3's README row stated Kofler's band unconditionally.** The guard asserts onset
  inside the 0.2–3% band _at every reduction constant from 20% to 85%_, and separately
  asserts the window has two ends — below the band at 15%, above it at 90%. The row now
  says both.
- **`README.md` "~990 lines"** is 999.

### Fixed — metadata and hygiene

- **`web/hash-harness.html` was a visitor-reachable URL on the published site.** It
  builds into `dist/`, so it is served. It now carries
  `<meta name="robots" content="noindex">` and says in its body that it is a test fixture,
  with a link back to the toy. It is **not** removed — guard 7 loads it.
- **`CITATION.cff` named one licence for a dual-licensed work.** `license-url` pointed at
  the MIT text alone. CFF 1.2.0 types that field as a **single** url and scopes it to
  "non-standard licenses not included in the SPDX License List", so it can neither name
  two licences nor apply to these two — both are SPDX identifiers, which is what the
  `license` list is for. The field is removed and the reason recorded in the file.
  `date-released` stays 2026-09-10: the tag was cut at 23:45 EDT that day.
- **`docs/RELEASE-1.0.md` reads like a findings document and is not one.** It now opens
  with a banner saying so and pointing at `FINDINGS.md`.
- **`README.md`'s layout section** referenced a sibling project a reader has no access to
  ("Mirrors `_pm/`…") and listed `_scratch/`, which is untracked and not in a clone.
- **`## Unreleased` sat underneath `## [1.0.0]`**, so the file read as if it were part of
  it. Its content — the bounded repertoire lookup — did ship in v1.0.0
  (`repertoireInsertionIndex` is present at tag `v1.0.0`, and `README.md` quotes its
  timings), so it is folded into the 1.0.0 entry rather than moved.

## [1.0.0] — 2026-09-10

First public release: the toy goes on GitHub Pages and the findings become
readable by a stranger. **The registered model ships as registered** — questions
001–005 are answered and their limitations ship as limitations, not as fixes. No
`sim/` behaviour, no `defaultParams`, and no constant changed in this release —
the one `sim/` edit, the bounded repertoire lookup below, is an implementation
change measured bit-identical on every `Snapshot` field.

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

### Known limitations, shipped deliberately

- **Domestication cannot happen at the shipped defaults.** `wDom = 0.01` sits
  below the measured persistence threshold of `0.03 < wDom* ≤ 0.075`, so
  domesticated copies appear, peak, and are lost to zero at every seed. It is a
  calibration limit, not a missing mechanism. Retuning it would invalidate every
  registered result above, so it was left alone.
- **`t_sat` is not a power law in `phi`**, and the exponent measured is a
  property of the fitting window. No shipped sentence quotes an exponent as a
  property of the system. The next registration must test a functional _form_.

## v1 — the model, seven guards (nine by v1.0), the toy, one registered question (2026-09-03)

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

### The seven guards (nine by v1.0) — `tests/guards/`

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
