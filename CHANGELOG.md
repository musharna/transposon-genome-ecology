# Changelog

Milestone-boundary entries. Appended in the commit that closes a milestone.

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
