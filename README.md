# Transposons as genome ecology

A watchable, pokeable model of transposable elements as an ecosystem inside a
genome. **The unit of individuality is the COPY**, and transposition rate is a
per-copy heritable trait — so you never choose when an element copies itself.
What you move are the conditions a lineage lives under; what happens next is
selection.

**▶ [Play it](https://musharna.github.io/transposon-genome-ecology/)** ·
**📄 [What it found](docs/FINDINGS.md)** — six questions, each registered with its
prediction and its falsification condition and committed to git _before_ the code that
answered it existed.

- **One registered primary was falsified:** 002.
- **Registered secondaries were falsified** in 003, 004, 005 and 006.
- **004's third secondary was later retracted** as unresolvable.
- **006's primary held as registered, but is not robust:** counting three censored runs
  at their horizon falsifies it.

Code is **MIT** (`sim/ web/ scripts/ tools/ tests/`, `experiments/**/*.ts`, and
`docs/analysis/*.R` — source code is MIT wherever it lives, including under `docs/`);
prose, figures and data are **CC BY 4.0** (`docs/**` otherwise, the figures, and
`experiments/**/*.csv`). See [LICENSE](LICENSE), [LICENSE-docs](LICENSE-docs) and
[CITATION.cff](CITATION.cff).

⚠️ **You play a LINEAGE'S EVOLVABLE STRATEGY, not an element making choices.**
This is an accuracy constraint and it is load-bearing: **transposition rate is
heritable, not a decision.** A design that lets the player choose when to copy is
modelling something that does not exist.

The payoff is frequency-dependent against two opponents at once — host silencing
and the element's own descendants — and two mechanics carry that:

- **piRNA clusters are built from captured element fragments**, so inserting into
  one conscripts you into your own suppression. The trap is made of you.
- **Domestication is an alternate win** (syncytin, RAG). Ceasing to be a parasite
  is a way to persist, not a way to lose.
  ⚠️ **Not at the shipped defaults.** `wDom = 0.01` sits below the persistence
  threshold measured on guard 8's arm (`0.03 < wDom* ≤ 0.075`, bounds that are a
  property of that arm rather than of the model), so domesticated copies are made,
  peak, and are then lost to zero at every seed. It is a calibration limit, not a
  missing mechanism, and the constant was deliberately **not** retuned for the
  release — every registered question above was answered at this value.
  [Details](docs/FINDINGS.md#what-is-open).

## What is here

**The model** (`sim/`) is ~1,000 lines of TypeScript (999 at v1.0.1): six phases composed by
`step(world)` — transpose, trap, domesticate, excise, select, reproduce — over a
population of genomes, each a sorted array of copies plus a piRNA repertoire.
Silencing is not a phase but a derived predicate (`sim/silencing.ts`) that
`transpose` consults. Phases 1, 4, 5 and 6 alone are the Charlesworth 1983
model; phase 2 adds Kofler's trap and phase 3 adds domestication. It is seeded
and deterministic; `stateHash` digests the ordered world state and
`tests/step.test.ts` pins the RNG draw stream to golden hash `9c15fd28`.

**The toy** (`web/`) runs that same model in a browser and lets a visitor perturb
it: four buttons — knock out silencing, seed a fresh invasion, switch sex to
asex, shrink the population — and four sliders: piRNA cluster size, the
resistance↔tolerance dial, excision rate and domestication probability. Four
linked panels: the site field, a copy-number timeline, an `r`-versus-`s` scatter
and a cluster inset.

The piRNA repertoire only ever grows — nothing removes an entry — so a silencing
pass used to cost `O(copies × repertoire)` and **the toy got slower the longer it
ran**. `Genome.repertoire` is now kept sorted ascending and `isSilenced`
binary-searches it, testing the insertion point's two neighbours, which is
exhaustive for the minimum in any sorted array. Measured at `TOY_DEFAULTS`,
seed 1, one `step` + one `observe`: 1.06 → 35.73 ms at generations 200 → 6000
before, **0.74 → 1.03 ms after**, i.e. the cost stopped tracking the repertoire
rather than merely tracking it more slowly. The full table, and what has _not_
been re-measured since (in-browser frame rate), are on `reset()` in
`web/main.ts`.

**The validation surface** (`tests/guards/`) is nine guards, each asserting one
claim the model makes, each against its own matched null:

| #   | claim                                                                                                                                                                                                                              | file                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Charlesworth 1983's qualitative equilibrium: a LINEAR fitness function does not control copy number, a quadratic one does                                                                                                          | `equilibrium.test.ts`        |
| 2   | Kofler 2019's three phases — invasion, plateau, inactivation — are detectable, and the detector reports failure rather than guessing                                                                                               | `three-phases.test.ts`       |
| 3   | Repression switches on as the piRNA cluster grows, with onset inside Kofler 2020's 0.2–3% band — at every reduction constant from 20% to 85%, and the window is asserted to have two ends (below the band at 15%, above it at 90%) | `cluster-threshold.test.ts`  |
| 4   | Knocking out silencing produces genome bloat — direction only, not magnitude                                                                                                                                                       | `bloat.test.ts`              |
| 5   | Per-copy transposition rate actually EVOLVES, and not from mutational bias — the geometric mean rises too                                                                                                                          | `rate-evolves.test.ts`       |
| 6   | A diverged sublineage escapes an established trap                                                                                                                                                                                  | `escape.test.ts`             |
| 7   | The browser and Node run one model, byte for byte                                                                                                                                                                                  | `one-implementation.test.ts` |
| 8   | Domestication is an alternate win ABOVE a benefit threshold, and the shipped `wDom = 0.01` is below it — asserted as loss at the default and persistence-through-family-death above it                                             | `domestication.test.ts`      |
| 9   | The resistance↔tolerance dial is a difference in KIND: a purely tolerant host never forms a repertoire, so it cannot be conscripted at all                                                                                         | `tolerance.test.ts`          |

Guard 8 does **not** locate a threshold in the model — the band `0.03 < wDom* ≤ 0.075`
belongs to that arm's `N`, `v`, `beta`, `pDom` and horizon, and it asserts no domesticated
count as a prediction. Guard 9 does **not** claim the dial is graded in the population;
that was measured and is false at its arm, and its fitness tests are arithmetic on
constructed genomes rather than a population result.

Every guard carries a **WHAT THIS GUARD DOES NOT CLAIM** section. Read it before
quoting a result: several of these are fixed-horizon comparisons at one pinned
arm, and guard 4's direction reverses past generation 180.

**Six registered questions** have been asked and answered. Each pre-registration in
`docs/pre-registrations/` was committed **alone, before its runner existed**, and each
runner in `experiments/` answers exactly one of them. Results, verdicts and the limits
on each: **[docs/FINDINGS.md](docs/FINDINGS.md)**.

| #   | question                                     | verdict                                                                                                                           |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 001 | per-copy vs family-level rate                | the arms differ — the falsification clause does not fire                                                                          |
| 002 | conscription vs an innate silencer           | **primary FALSIFIED** — both arms viable at 3 of 9 grid points; the secondary held                                                |
| 003 | how fresh must the trap be?                  | primary held trivially; **secondary 1 FALSIFIED** — control only at `phi = 0`, and that is a resolution artefact                  |
| 004 | a band, or only a delay?                     | primary held — a delay: the edge moves 0.016 → 0.004 with the horizon; **secondary 2 FALSIFIED**, secondary 3's verdict retracted |
| 005 | does the delay diverge, or is there a floor? | primary held — no floor above `phi = 0.002`, 150/150 saturate; **secondary 1 FALSIFIED**                                          |
| 006 | is the exponent one?                         | primary held 2/3 as registered but **not robust** — 3 censored runs counted at horizon falsify it; **secondary 1 FALSIFIED**      |

## Setup

**Node ≥ 22 is required**, and it is a hard floor rather than a preference: on
Node 18 both `vitest run` and `vite build` crash at startup, because the
toolchain imports `styleText` from `node:util` and Node 18 has no such export.
`.nvmrc` pins 22 and `package.json` declares `engines.node >= 22`.

    npm ci
    npx playwright install chromium     # REQUIRED -- see below
    npm test

**If Chromium then fails to launch for a missing system library**, and only
then, add `--with-deps`:

    npx playwright install --with-deps chromium

⚠️ `--with-deps` is **Linux-only and needs root** — it runs the distro's package
manager to install Chromium's shared libraries, so it prompts for a password and
**fails outright where sudo is non-interactive** (`sudo: a password is required`,
then `Failed to install browsers`). That is why it is not the first line: CI can
use it because a GitHub runner has passwordless sudo (`.github/workflows/pages.yml`
does exactly that), and a developer machine that already has the libraries does not
need it at all. Plain `npx playwright install chromium` needs no privileges and is
enough in that case.

Playwright is a **test** dependency only: `npm run build` and `npm run preview`
do not touch it, so a browserless machine can still build and serve the toy. It
is `npm test` that cannot pass without it.

**The second line is not optional.** Two test files drive a real Chromium
against the built page, and neither of their claims is decidable from Node:

- `tests/layout.test.ts` — that the pokes are actually on screen, and that the
  flooded toy still answers its own button.
- `tests/guards/one-implementation.test.ts` (guard 7) — that the model running
  in the browser and the model running in Node produce a byte-identical state
  hash, at BOTH the plain scenario and the toy's own parameters. This is the
  claim that the artifact played is the artifact validated; the other eight
  guards check `sim/` in Node, and without this one nothing connects those
  results to the bundle a visitor loads.

  ⚠️ **It does not establish engine-independence.** Node and Playwright's
  Chromium are both V8. What it establishes is one codebase, through one
  bundler, on one engine family — that Vite's transform and minification did not
  change the model's behaviour. The model reaches `r` and `s` through `Math.exp`,
  `Math.log` and `Math.sqrt`, which ECMA-262 permits an implementation to
  approximate, so a second engine family could in principle diverge. Nobody has
  run one.

`vitest.config.ts` includes every `tests/**/*.test.ts`, so both always run;
without the browser binary the suite fails at `chromium.launch()` with
"Executable doesn't exist", which is the truth and is meant to be visible.

Both build first rather than trusting whatever is on disk — a stale bundle
would make either of them pass on a page nobody is shipping. `layout.test.ts`
builds `dist/`; guard 7 builds `dist-guard7/`, because vitest runs files in
parallel and two concurrent builds with `emptyOutDir` on one directory would
race. Both are gitignored, and neither needs a dev server.

Other commands:

    npm run build      # vite build -> dist/
    npm run typecheck  # tsc --noEmit

There is no dev server in any of the above and none is needed to verify a
change.

## Layout

Layout:

    docs/         ROADMAP.md is canonical for "what phase, what's next";
                  the design spec, the reference base, pre-registrations
                  and results live here, dated
    sim/          the model itself — six phases, RNG, observables. FROZEN:
                  every guard is calibrated against it and the golden hash
                  pins the draw stream
    web/          the toy — entry point, params, controls, four renderers,
                  and the guard-7 hash harness
    experiments/  runners that ask one registered question each
    tests/        guards (`tests/guards/`) and per-phase unit tests; every
                  claim the model makes should have one
    tools/        production probes shared with the browser — the cluster
                  sweep behind the threshold readout lives here
    scripts/      exploratory sweeps, committed so every number quoted in a
                  guard docstring can be reproduced

## Grounding

`docs/REFERENCES.md` carries 51 distinct DOIs (re-tallied 2026-09-11), every one
resolved live against OpenAlex on 2026-09-02 or 2026-09-03 — first-author surname,
year, venue and DOI from the registry, not from recall. `docs/dois.txt` is that DOI
set and nothing else. That file states no count of "works": one work is entered in
two sections and §8 cites several DOIs under one bullet, so the DOI count is the
only tally with a reproducible command behind it. `docs/charlesworth-1983-equilibrium.md` is a full read of the null
model, including the reason its analytic constant does NOT transfer to this
model (ours is haploid and deduplicates sites shared by both parents; theirs is
diploid).

⚠️ Before asserting what any external dataset contains, query a live registry.
**Dfam 4.0** is CC0 with an open API and is the usable one; **Repbase is CLOSED**
and its licence forbids redistribution in a public artifact.
