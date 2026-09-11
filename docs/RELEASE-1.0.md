# Release evidence — transposon-genome-ecology v1.0

This file is the executor's evidence log for the v1.0 release candidate. Every stage of
`docs/superpowers/specs/2026-09-10-ship-plan.md` appends here. Nothing in this file is a
claim about the model; it is a record of what was run and what it printed.

## Stage 1 — toolchain and baseline

**Branch.** `release/1.0-rc`, cut from `acf530c2a46f5b871ead5f54867c608969dd0c15`.

_Ruling (deviation from the plan)._ The plan says cut from `2ab527c`. `acf530c` is
exactly `2ab527c` plus the commit that added the ship plan itself, so cutting from
`acf530c` keeps the plan on the release candidate it governs. Cost if wrong: the RC
carries one extra documentation file.

_Ruling (deviation from the plan)._ The plan prescribes building a conda `node22`
environment because system Node is v18.19.1 and crashes both `vitest run` and
`vite build`. A Node 22.14.0 toolchain already exists on this machine at
`~/.local/node-22/bin` and satisfies the actual constraint ("Node 22"), so it was used
instead of creating a redundant environment. Exact versions are recorded below, which is
what the plan asks for. Cost if wrong: none — the recorded versions identify the
toolchain either way.

**Versions.**

| Tool             | Version                                |
| ---------------- | -------------------------------------- |
| node             | v22.14.0 (`~/.local/node-22/bin/node`) |
| npm              | 10.9.2                                 |
| `.nvmrc`         | 22                                     |
| typescript       | 5.9.3                                  |
| vite             | 8.2.2                                  |
| vitest           | 5.0.0                                  |
| tsx              | 4.23.13                                |
| @playwright/test | 1.62.1                                 |
| @types/node      | 22.20.1                                |
| R                | 4.3.3 (2024-02-29)                     |
| ggplot2          | 4.0.2                                  |
| patchwork        | 1.2.0                                  |
| png              | 0.1.8                                  |

**Commands and results.** All run from the repo root with
`export PATH="$HOME/.local/node-22/bin:$PATH"`.

| Command             | Result                                             |
| ------------------- | -------------------------------------------------- |
| `npm ci`            | 0 vulnerabilities                                  |
| `npm test`          | **22 test files, 198 tests, all passed** (69.16 s) |
| `npm run typecheck` | `tsc --noEmit`, no output, exit 0                  |
| `npm run build`     | 27 modules transformed, built in 102 ms            |

Build output: `dist/index.html` (13.25 kB), `dist/hash-harness.html` (0.69 kB),
`dist/assets/main-*.js` (16.96 kB), `dist/assets/params-*.js` (5.10 kB),
`dist/assets/harness-*.js` (0.73 kB).

**Change.** `package.json` gained `"engines": { "node": ">=22" }`.

DONE: all three commands green under Node 22, recorded above.

## Stage 2 — scientific disposition

Every open `[ ]` item in `docs/ROADMAP.md` as of `acf530c`, classified. There are 23,
enumerated by `grep -c '^\s*-\s*\[ \]' docs/ROADMAP.md`. The "What is actually left"
section's items are the same checklist entries at lines 570–646 and are not counted twice.

Classes: **CI** = claim-invalidating (the shipped claim is wrong as stated; fix the
statement or withdraw it — never the model). **IL** = interpretation-limiting (a
qualifier ships beside the result). **FW** = future work (listed under Open).

| #   | Line | Item                                                                                               | Class                      | Reason                                                                                                                                                                   |
| --- | ---- | -------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 206  | `theta` and `sigmaS` are one axis; 002's 3×3 grid is 6 regimes                                     | **IL**                     | The measurement is right; what it covers is smaller than the grid suggests. 002's coverage ships stated in the ratio `k* = (theta/sigmaS)²`.                             |
| 2   | 252  | A falsification clause must cover every direction its prediction can fail in                       | **FW**                     | Method rule for future registrations; 003's affected verdict is already restated as FALSIFIED.                                                                           |
| 3   | 315  | `t_sat` is not a power law; the exponent is a property of the fitting window                       | **CI**                     | Any sentence quoting an exponent as a property of the system is wrong. Surviving claim: "every `phi` > 0.002 saturates; no floor found." Sweep below.                    |
| 4   | 334  | A horizon sized from the model under test inherits that model's error                              | **FW**                     | Method rule. 005's result is unaffected — 150/150 saturated, 0 censored — so it qualifies the _sizing rule_, not the finding.                                            |
| 5   | 347  | A guard that checks some of what it is trusted for                                                 | **FW**                     | Method rule. Both instances are fixed in `theme.R`, which now states the correction itself (lines 121–133).                                                              |
| 6   | 361  | "No mark at an unmeasured level" applies on both axes; a caption must name a cue that renders      | **FW**                     | Method rule; both 005 instances were fixed before the figure shipped.                                                                                                    |
| 7   | 410  | Re-render `fig-001` … `fig-004` under the current house style                                      | **FW → closed in stage 3** | Not a claim. Executed this release; see stage 3.                                                                                                                         |
| 8   | 421  | An inherited guard is not automatically load-bearing — mutate it and find out                      | **FW**                     | Method rule; 005 already replaced the inert row with the hazard its check covers.                                                                                        |
| 9   | 440  | A check can be permanently shadowed by an earlier one and look tested                              | **FW**                     | Method rule; 005's 4a was isolated and shown to have real power.                                                                                                         |
| 10  | 450  | The fix for a coarse grid is usually not a finer grid                                              | **FW**                     | Method rule; supersedes an earlier, wrong prescription.                                                                                                                  |
| 11  | 467  | A high R² is not evidence the functional form is right                                             | **FW**                     | Method rule. Its _consequence_ for 004's "clean power law" is carried by row 3, which is the claim-bearing one.                                                          |
| 12  | 477  | A defect fixed at the instance comes back at the class                                             | **FW**                     | Method rule.                                                                                                                                                             |
| 13  | 486  | Check registered predictions are not reparameterisations of each other                             | **IL**                     | 004's four registered predictions carried three bits, and one near-hit was counted twice. 004's result ships saying so.                                                  |
| 14  | 497  | A doubling grid cannot measure a sub-doubling effect, and such a verdict flips with the estimator  | **IL**                     | 004's secondary 3 is UNRESOLVED, not FALSIFIED. The retraction is already in the Result and ships with it.                                                               |
| 15  | 570  | The domesticated glyph is drawn at 3.6× true site scale and buries 6 copies                        | **IL**                     | A render-scale limitation of the toy's field view; stated, and pinned by the render guard.                                                                               |
| 16  | 585  | Full inactivation kills the family — it is the sexual path, not excision                           | **IL**                     | A divergence from biology with a measured mechanism; ships as a limitation.                                                                                              |
| 17  | 613  | Guard 4's bloat result is one arm at one horizon and its direction reverses                        | **IL**                     | Must not be quoted as a general property of the model; the guard's own block says so.                                                                                    |
| 18  | 619  | The shipped `wDom = 0.01` is below the persistence threshold (`0.03 < wDom* ≤ 0.075`)              | **IL**                     | The toy's "alternate win" is unreachable at shipped defaults. Ships in the write-up **and** in the toy's UI where domestication is mentioned. `wDom` is **not** retuned. |
| 19  | 646  | Why more domestication bonus gives fewer domesticated copies above `wDom ≈ 0.3` is uncharacterised | **FW**                     | Recorded as an observation with no mechanism asserted; no guard depends on it.                                                                                           |
| 20  | 676  | The `t` dial conflates tolerance with the piRNA pathway                                            | **IL**                     | Defensible as an evolutionary argument, implemented as a mechanical one; labelled as a design decision.                                                                  |
| 21  | 690  | The `theta` window is grounded by nothing in the reference base                                    | **IL**                     | It is a design choice — what makes "family" emergent rather than declared — and ships labelled as design, not biology.                                                   |
| 22  | 699  | A second phase detector on Kofler's own observable                                                 | **FW**                     | Computable today from `fractionWithRepertoire`; not built.                                                                                                               |
| 23  | 709  | Our cluster fraction sits in the biological range, and that is **not** a validation                | **IL**                     | Kofler's threshold is a property of his silencing rule; at equal `c` our trap is weaker, so the number does not transfer.                                                |

Totals: **1 claim-invalidating, 10 interpretation-limiting, 12 future work** (one of
which, row 7, is discharged by stage 3 of this release).

### The one claim-invalidating row, discharged

Row 3 requires that no shipped sentence quote a `t_sat` exponent as a property of the
system. Sweep run across `docs/`, `README.md`, `CHANGELOG.md` and the figure captions:

```
grep -rn -E '0\.73|0\.87|exponent' docs README.md CHANGELOG.md
grep -rn -i 'power.law'            docs README.md CHANGELOG.md
```

Findings:

- `README.md` and `CHANGELOG.md`: **no hits at all** for the exponents or for
  "power law". Neither file mentions questions 004 or 005.
- `docs/pre-registrations/2026-09-05-does-the-delay-diverge.md`: every occurrence of
  0.7304/0.8695 etc. is inside the section that _establishes_ the window-dependence,
  and the file's own conclusion (line 701–704) reads "the honest conclusion is not 'the
  exponent is 0.87'… the exponent you measure is a property of the window". Qualifier
  present at the point of use. No change needed.
- `docs/analysis/plot-004.R:191–193` and `plot-005.R:78–79`: the numbers appear as a
  frozen reference in a `stopifnot` guard and in 005's `FROZEN` table. These are
  assertions about what a previous fit produced, not claims about the system. No change.
- No other shipped prose states an exponent.

So the surviving claim — "every `phi` > 0.002 saturates; no floor was found" — is the
one `docs/FINDINGS.md` states for question 005, and no exponent is quoted as a property
of the system anywhere that ships. This row is discharged without a model change.

`npm test` after stage 2: **22 files, 198 tests, all passed** (no code changed).

## Stage 3 — figures

Re-rendered `fig-001` … `fig-004` with their existing scripts under the current
`docs/analysis/theme.R`. This closes the open ROADMAP item at line 410: before this
release, 001–004 carried the retired `grey90` gridline (measured 1.26:1, under the
project's own 3:1 floor) while 005 carried `#8c95a0`, so "ONE house style per project"
was false.

**Environment.** `Rscript (R) version 4.3.3 (2024-02-29)`, platform
`x86_64-pc-linux-gnu (64-bit)`. `sessionInfo()` attached packages: ggplot2 4.0.2,
patchwork 1.2.0, png 0.1-8.

**Commands.** Each is run from the repository root — the scripts `source()` the theme by
the repo-relative path `docs/analysis/theme.R`, so they fail from inside `docs/analysis`.

```
Rscript docs/analysis/plot-001.R
Rscript docs/analysis/plot-002.R
Rscript docs/analysis/plot-003.R
Rscript docs/analysis/plot-004.R
```

All four exited 0. `plot-004.R` emits one warning, `annotation$theme is not a valid
theme` — the known ggplot2 4.0.2 behaviour where `plot_annotation(theme=)` warns and
then applies; the theme is applied. No script emitted an error.

**Before / after.**

| File | md5 before | md5 after |
| --- | --- | --- |
| `fig-001-peak-copies.png` | `8ded7d77926ce41ac08ce8252e6d3258` | `2154b2972dafcde61a03926aedbe298a` |
| `fig-002-viability.png` | `25bccf553ff1e070329482303a4fb1ae` | `12abf606a2f5696e3a13b5caf8799a1a` |
| `fig-003-fidelity.png` | `2a6bbbe9ce3366082b692eb497121da8` | `e3f67614a25cb4b5220d490a84b4ffcf` |
| `fig-003-silencing.png` | `6ec604f4eb0f590f80158eebd87b5863` | `cee8b202c9e43d99de42a744b0c32c60` |
| `fig-004-band.png` | `38732afefa3a83d45b21d13dac9c9379` | `9c7a3afc236bdbd583e95666cbe31af1` |
| `fig-005-divergence.png` | `44d1cf6c20e59568b986e817ff9311bd` | unchanged (not re-rendered) |
| `fig-005-tolerance.png` | `82d1ae047c55c55f23cb19f54f5697fa` | unchanged (not re-rendered) |

**The house style actually changed, with a control.** Counting pixels of each gridline
colour in every figure:

| figure | size | `#8C95A0` (current) | `#E5E5E5` (retired) |
| --- | --- | --- | --- |
| fig-001-peak-copies | 1300×1000 | 5 685 | 107 |
| fig-002-viability | 1400×1000 | 11 633 | 186 |
| fig-003-fidelity | 1880×1200 | 12 437 | 228 |
| fig-003-silencing | 1880×1200 | 21 894 | 170 |
| fig-004-band | 2100×1470 | 5 479 | 506 |
| fig-005-divergence | 2600×1440 | 22 195 | 577 |
| fig-005-tolerance | 2600×1440 | 15 205 | 661 |

The residual `#E5E5E5` counts are **not** leftover gridlines. `fig-005` was not
re-rendered and is the reference for the current style, and it carries *more* of that
colour (577 and 661) than any re-rendered figure — so those pixels come from
antialiasing and other elements, not from a stale grid. That comparison is the control;
without it the nonzero counts would be unreadable either way.

**Defect found and fixed: `fig-001` was not reproducible.**
`plot-001.R` drew `geom_jitter(width = 0.12, …)` with no `set.seed()` anywhere in the
file, so the figure differed on every run. Measured: two consecutive runs gave
`4c4453104e735ef98f50bb6443be1e38` then `53ee5de1be3c52f2dc661ef708fecb36`, while
`plot-002.R` over the same interval reproduced `12abf606…` exactly. A grep for
`geom_jitter|position_jitter|sample(|runif|rnorm|set.seed` across all five plot scripts
and `theme.R` returns exactly one line — `plot-001.R:24` — which is why the other four
are byte-stable: they touch the RNG not at all.

Fixed by adding `set.seed(1)` immediately before the plot is built. Verified over three
consecutive runs: `2154b2972dafcde61a03926aedbe298a` all three times, with the primary
statistic unchanged at `t = 4.6675, df = 42.074, p = 3.1e-05` — the seed moves the
x-offsets of the plotted points and nothing else. This is an analysis-script change; no
`sim/` behaviour, no `defaultParams`, and no constant was retuned.

**Objective acceptance**, per the plan (objective only; the 29-round subjective loop is
not reopened):

| Figure | axes labelled with units | glyphs the caption names are drawn | legend | overplotted text | file is the one the doc links |
| --- | --- | --- | --- | --- | --- |
| fig-001 | ✅ "peak copies per genome"; x is the two arms | ✅ boxplot + jittered points | n/a — arms are the x axis, fill guide suppressed deliberately | none | ✅ linked from `2026-09-02-per-copy-vs-family-rate.md:264` |
| fig-002 | ✅ "fraction of seeds extinct" vs "theta / sigmaS" | ✅ both arm series with points | ✅ A-conscription / B-innate | none | ✅ `ROADMAP.md:192`, `2026-09-04-conscription-vs-innate-silencer.md:294` |
| fig-003-fidelity | ✅ "fraction of 10 seeds CONTROLLED" vs phi with its definition | ✅ triangle / circle / square at all three ratios, Wilson bars | ✅ three ratios, glyph-coded | none | ✅ `ROADMAP.md:226`, `…how-fresh-must-the-trap-be.md:428` |
| fig-003-silencing | ✅ "mean silenced fraction at the run's stop (log scale)" vs phi | ✅ three series, SE bars | ✅ three ratios | none | ✅ `ROADMAP.md:227`, `…how-fresh-must-the-trap-be.md:418,429` |
| fig-004 | ✅ "fraction of 10 seeds CONTROLLED" vs "trap infidelity phi (log scale)", both horizon strips labelled | ✅ triangle / circle / square for the three predicted `phi*`, bars, observed-edge cells | ✅ "predicted phi* for theta/sigmaS" | see note | ✅ `ROADMAP.md:267`, `2026-09-04-a-band-or-only-a-delay.md:476` |

*Note on fig-004.* It is by far the densest figure — several annotation blocks sit
inside the panels, and the new gridline is darker than the one they were composed
against, so those blocks now cross a more visible line than before. No text overlaps
other text; the crossings are text-over-gridline. Per the plan ("if a figure's science is
stable, style is not a blocker") this is recorded, not treated as a blocker, and the
figure is included in the stage 6 critic's scope so a fresh reader judges it.

**Verdicts are unchanged by the re-render.** Each script recomputes its science from its
CSV on every run; the printed verdicts match what the ROADMAP already records — 001
primary `t = 4.6675, p = 3.1e-05`; 002 "both arms viable at 2 of 6 DISTINCT regimes";
003 CONTROLLED at `phi = 0` only, at every ratio; 004 PRIMARY HELD, SECONDARY 1 HELD,
SECONDARY 2 FALSIFIED, SECONDARY 3 FALSIFIED-as-registered-but-not-resolved.

**Figure links resolve.** Every `fig-*.png` referenced anywhere under `docs/` or in
`README.md` exists on disk. Two filenames appear in prose but are not links and have no
file: `fig-005-residuals.png` (named only in the 005 registration's account of the
rename to `fig-005-tolerance.png`) and `fig-001-final-copies.png` (named only inside a
code block in the superseded build plan). Neither is a broken image link.

DONE: four scripts re-rendered deterministically under one house style, recorded above.
