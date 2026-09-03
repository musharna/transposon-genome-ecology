# Transposons as genome ecology

A watchable, pokeable model of transposable elements as an ecosystem inside a
genome. **The unit of individuality is the COPY**, and transposition rate is a
per-copy heritable trait — so you never choose when an element copies itself.
What you move are the conditions a lineage lives under; what happens next is
selection.

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

## What is here

**The model** (`sim/`) is ~850 lines of TypeScript: six phases composed by
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

⚠️ **Frame rate degrades as a session runs**, and the cause is a real defect in
the core: the piRNA repertoire only ever grows, so one silencing pass costs
`O(copies × repertoire)`. The measurement and the reasons not to quote its
second table as a frame rate are on `reset()` in `web/main.ts`. Every poke
rebuilds the world, so every perturbation is also a reprieve.

**The validation surface** (`tests/guards/`) is seven guards, each asserting one
claim the model makes, each against its own matched null:

| #   | claim                                                                                                                                | file                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1   | Charlesworth 1983's qualitative equilibrium: a LINEAR fitness function does not control copy number, a quadratic one does            | `equilibrium.test.ts`        |
| 2   | Kofler 2019's three phases — invasion, plateau, inactivation — are detectable, and the detector reports failure rather than guessing | `three-phases.test.ts`       |
| 3   | Repression switches on as the piRNA cluster grows, with onset inside Kofler 2020's 0.2–3% band                                       | `cluster-threshold.test.ts`  |
| 4   | Knocking out silencing produces genome bloat — direction only, not magnitude                                                         | `bloat.test.ts`              |
| 5   | Per-copy transposition rate actually EVOLVES, and not from mutational bias — the geometric mean rises too                            | `rate-evolves.test.ts`       |
| 6   | A diverged sublineage escapes an established trap                                                                                    | `escape.test.ts`             |
| 7   | The browser and Node run one model, byte for byte                                                                                    | `one-implementation.test.ts` |

Every guard carries a **WHAT THIS GUARD DOES NOT CLAIM** section. Read it before
quoting a result: several of these are fixed-horizon comparisons at one pinned
arm, and guard 4's direction reverses past generation 180.

**One registered question** has been asked and answered:
`docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md` was written before
the runner existed, and `experiments/001-per-copy-vs-family-rate.ts` answers it.

## Setup

    npm ci
    npx playwright install chromium     # REQUIRED -- see below
    npm test

**The second line is not optional.** Two test files drive a real Chromium
against the built page, and neither of their claims is decidable from Node:

- `tests/layout.test.ts` — that the pokes are actually on screen, and that the
  flooded toy still answers its own button.
- `tests/guards/one-implementation.test.ts` (guard 7) — that the model running
  in the browser and the model running in Node produce a byte-identical state
  hash, at BOTH the plain scenario and the toy's own parameters. This is the
  claim that the artifact played is the artifact validated; the other six guards
  check `sim/` in Node, and without this one nothing connects those results to
  the bundle a visitor loads.

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

Mirrors `_pm/`, which is the sibling project furthest along:

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
    _scratch/     untracked working area

## Grounding

`docs/REFERENCES.md` carries 38 works, every one resolved live against OpenAlex
on 2026-09-02 — first-author surname, year, venue and DOI from the registry, not
from recall. `docs/charlesworth-1983-equilibrium.md` is a full read of the null
model, including the reason its analytic constant does NOT transfer to this
model (ours is haploid and deduplicates sites shared by both parents; theirs is
diploid).

⚠️ Before asserting what any external dataset contains, query a live registry.
**Dfam 4.0** is CC0 with an open API and is the usable one; **Repbase is CLOSED**
and its licence forbids redistribution in a public artifact.
