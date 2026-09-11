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

## Stage 4 — write-up

**New: `docs/FINDINGS.md`.** Written for a stranger. Three sentences on what the model
is (the unit is the copy; the verb is perturbing the world; rate is heritable, not
chosen), then one section per registered question — prediction as registered → result →
verdict → what it does not show — followed by what is open and how to reproduce. Every
number carries its CSV, its runner and its commit.

**Every headline number was recomputed from the CSVs**, independently of the R analysis,
before it was written down. The verification script reads only `experiments/*.csv`:

| Question | Claim in FINDINGS | Recomputed from the CSV |
| --- | --- | --- |
| 001 | 80 runs, 40 seeds × 2 arms | 80 rows, 40 distinct seeds |
| 001 | peak copies/genome 58.65 vs 21.49 | 58.6520 vs 21.4907 |
| 001 | extinct 21/40 vs 25/40 | 21/40 vs 25/40 |
| 001 | 17 of 40 per-copy runs over 60 copies; 0 of 40 family-level | 17 and 0 |
| 002 | 180 runs; both arms viable at 3 of 9 grid points | 180 rows; 9 grid points, 3 both-viable |
| 002 | the 9 points are 6 distinct regimes | 6 distinct `k_star` values |
| 003 | 270 runs; CONTROLLED only at `phi = 0`, all three ratios | 270 rows; fully-controlled phi = [0.0] at 2.00, 3.33 and 5.00 |
| 004 | 270 runs + 60 control; edge 0.016 at gen 600 | 270 + 60; max fully-controlled phi = 0.016 at all three ratios |
| 004 | edge 0.004 at gen 1800 | max fully-controlled phi = 0.004 at all three ratios |
| 005 | 150 runs + 90 control; 150/150 saturated, 0 censored, 0 extinct | 150 + 90; saturated 150/150, censored 0, extinct 0 |
| 005 | 15 cells, no duplicated (ratio, phi, seed) | 15 cells; 150 distinct keys over 150 rows → 0 duplicates |
| 005 | secondary 1 falsified by +43.1 / +42.2 / +37.0 % at `phi = 0.002` | observed 4720.1 / 5345.5 / 6101.9 vs predicted 3297.5 / 3759.5 / 4454.1 → +43.1 / +42.2 / +37.0 % |

Every row agrees. The 005 percentages are computed against the `predicted_t_sat` column
the runner wrote from 004's frozen constants, so both sides of that comparison come from
the CSV and neither is re-derived here.

**Commits cited in FINDINGS were each verified to exist** with `git log -1`: `f5ae5b1`,
`4995f3b`, `82ab678`, `58b0656`, `126e3bd`, `778fe9c`, `e0af8b2`, `cec9955`, `5468d97`,
`9201d74`, `909aeb0`, `3e88479`. All resolve, with the dates and subjects the write-up
implies.

**Links.** All 7 relative links in `FINDINGS.md` resolve to files that exist (checked by
resolving each against the file's own directory). Separately, every `fig-*.png` referenced
anywhere under `docs/` or in `README.md` exists — see stage 3.

**`README.md`.** The top now carries a one-line play link
(`https://musharna.github.io/transposon-genome-ecology/` — a placeholder the coordinator
verifies live), a link to FINDINGS, and the licence boundary. Two corrections:

- The line "**One registered question** has been asked and answered" was **false** — five
  have been. Replaced with a five-row verdict table linking to FINDINGS.
- The "domestication is an alternate win" bullet now carries the limitation inline.

**The toy's UI.** `web/index.html` gained one note, beside the `domesticated` legend
entry, saying that at the shipped `wDom = 0.01` domesticated copies appear, peak and are
lost to zero, and that this is calibration rather than a missing mechanism. Nothing else
in `web/` changed. Two errors were caught in that note before it shipped: it originally
said "raise the bonus and they stay", implying a control that **does not exist** (the
toy's sliders are cluster size, the `t` dial, excision rate and `pDom` — there is no
`wDom` slider, and `pDom` changes how often the event fires, not whether it sticks); and
it used markdown backticks inside HTML, which render literally.

**Citations.**

`docs/dois.txt` holds **51** unique DOIs harvested from `docs/`, `README.md` and
`CHANGELOG.md`.

*Ruling (deviation from the plan).* The plan's extraction command is
`grep -rhoE '10\.[0-9]{4,9}/[^ )>\]"]+'`. That pattern is **malformed** and silently
matches nothing: in POSIX ERE a backslash inside a bracket expression is a literal
backslash, so `\]` closes the class early. Run verbatim it returned **0 DOIs**, which
would have read as "no citations to check" — the project's own silent-zero failure mode.
Replaced with `'10\.[0-9]{4,9}/[^] )>"]+'`, which places `]` first in the class where it
is literal, plus a `sed` pass stripping trailing punctuation and backticks (10 DOIs were
captured with a trailing backtick from inline code spans). Positive control: the known
DOI `10.1038/nrg1524` appears in the output exactly once, and no entry still contains a
backtick.

`ghostcite 0.5.2` on that file:

```
total 51 · with_doi 51 · findings 0
retraction_source: Retraction Watch snapshot 2026-07-14 (71059 rows)
```

**Zero findings — and the check was seen to fail first.** A clean result from a checker
that cannot fail is worth nothing, so ghostcite was run on a three-line control holding
two real DOIs and one fabricated one. It returned exactly one finding — tier `U`, line 2,
`"DOI does not resolve (dead or fabricated DOI)"` — and passed the two real ones. The
checker discriminates.

⚠️ **Scope of that check, stated rather than implied.** `docs/dois.txt` is a bare DOI
list, so every finding carries `claimed_author: null` and `claimed_year: null`: ghostcite
verified that all 51 DOIs **resolve** and that none appears in the Retraction Watch
snapshot. It did **not** verify that each DOI is the work the surrounding prose names —
the wrong-author-for-right-DOI failure mode. That check is `docs/REFERENCES.md`'s, which
records all 38 works / 42 DOIs resolved live against OpenAlex on 2026-09-02 with
first-author surname, year, venue and DOI taken from the registry. The 51 here exceed 42
because `docs/` also cites works outside `REFERENCES.md` (pre-registrations, the
Charlesworth read, `pathway-mechanics.md`).

**Each FINDINGS headline that rests on a source was checked against a full-text read**,
recorded in `docs/pathway-mechanics.md`, not against recall:

| FINDINGS sentence | Source | Confirmed by |
| --- | --- | --- |
| tolerance "limits fitness cost without affecting propagation", outside the piRNA pathway | Kelleher et al. 2018 | §5, verbatim: "mechanisms of tolerance do not affect propagation but rather limit the fitness costs to the host" |
| Kelleher 2012 "argues the other way in its own system" | Kelleher, Edelman & Barbash 2012 | §4, verbatim: "mismatches between piRNAs and TE transcripts cannot explain the pattern of TE derepression in hybrids" |
| the model is right and the shipped `wDom` is unrealistically small | Kapitonov & Jurka 2005 | §6, verbatim: "a period of intensive transformations due to diversifying/positive selection", then stabilizing selection at 79% identity |
| Kofler's 0.2% is a property of his silencing rule and does not transfer | Kofler 2020 | §3, verbatim minimum-size quote plus the recorded non-transfer argument |

`npm test` after stage 4: **22 files, 198 tests, all passed.**

DONE: FINDINGS numbers agree with the CSVs they cite (checked above), ghostcite clean
with its control seen to fire, README rewritten.

## Stage 5 — site, licensing, hygiene

### The site builds for a project Pages path

`vite.config.ts` now sets `base: "/transposon-genome-ecology/"`. GitHub Pages serves a
project site under `/<repo>/`, so without it the page would load and every asset would
404. Verified in the emitted HTML:

```
src="/transposon-genome-ecology/assets/main-3rlMxbCi.js"
href="/transposon-genome-ecology/assets/params-jPj0KOgw.js"
```

`web/public/.nojekyll` was added and lands in the build as `dist/.nojekyll` (Vite copies
`publicDir`, which resolves to `<root>/public` = `web/public` because `root` is `web`).

**The base broke five tests, and they were right to break.** `npm test` went from 198/198
to 5 failures across `tests/layout.test.ts` and `tests/guards/one-implementation.test.ts`.
Root cause, established by direct measurement rather than inference — a probe against a
live preview server printed:

```
resolvedUrls.local: ["http://localhost:4399/transposon-genome-ecology/"]
404 http://localhost:4399/transposon-genome-ecology     (no redirect)
200 http://localhost:4399/transposon-genome-ecology/
200 http://localhost:4399/transposon-genome-ecology/hash-harness.html
```

Both test files did `server.resolvedUrls.local[0].replace(/\/$/, "")`. **That strip was
harmless only while the base was `/`**, where `http://host:port/` and `http://host:port`
are the same request; under a non-root base it produces a path preview 404s and does not
redirect. Three candidate causes were considered — `resolvedUrls` missing the base, an
in-page asset assertion, and the trailing-slash strip — and the probe above discriminated
between them rather than a guess being adopted.

Fixes, each at the layer the defect lives at:

| Site | Was | Now |
| --- | --- | --- |
| both test files | `.replace(/\/$/, "")` | keep the trailing slash; it is the served base URL |
| `one-implementation.test.ts` | `` `${origin}/hash-harness.html` `` | `new URL("hash-harness.html…", origin).href` — the join cannot reintroduce a double slash |
| `one-implementation.test.ts` | `/src="(\/assets\/[^"]+\.js)"/` | regex built from `BASE`, imported from `vite.config.ts` |
| `one-implementation.test.ts` | `harnessScript[0].replace(/^\//, "")` | `.slice(BASE.length)` — under a non-root base, "strip one slash" and "strip the base" are not the same cut |

`BASE` is **exported from `vite.config.ts` and imported by the guard**, never re-typed.
A second hand-copied literal in the test would be a constant calibrated against the
artifact under test: change the base and the guard would go on passing against its own
stale value.

After the fixes: `npm run typecheck` clean, `npm test` **22 files, 198 tests, all
passed.**

### Clean-checkout proof

```
git clone --depth=1 -b release/1.0-rc file://$PWD <tmp>/tge-verify
cd <tmp>/tge-verify && npm ci && npm test && npm run build
```

| Step | Result |
| --- | --- |
| clone HEAD | `964d902` |
| `npm ci` | 0 vulnerabilities |
| `npm test` | **22 files, 198 tests, all passed** |
| `npm run build` | built in 173 ms |
| `dist/index.html` | present |
| `dist/.nojekyll` | present |
| `dist/hash-harness.html` | present |

### Headless smoke against the built site

Served with `vite preview` and driven with the Playwright Chromium already in
devDependencies.

| Check | Result |
| --- | --- |
| toy HTTP status | **200** at `/transposon-genome-ecology/` |
| `hash-harness.html` HTTP status | **200** |
| responses ≥ 400 | **none** |
| console errors / page errors / failed requests | **none** |
| controls present | 4 buttons, 4 sliders |
| sim advances | `gen` 93 → 459 over 2 s |
| sim still advances after poking every button | `gen` 255 → 525 |

⚠️ **The first two smoke runs reported FAIL, and both were the harness's fault, not the
toy's.** Recorded because a smoke test that only ever passes is worthless:

1. The first version scraped `document.body.innerText` for `/generation[^0-9]*([0-9]+)/`.
   The string "generation" does not appear in `web/index.html` at all, so it matched an
   unrelated number that never moved. The real counter is the `gen` row of `#readout`.
2. The second version asserted `gen_after_poking > gen_before_poking`. One of the four
   pokes **seeds a fresh invasion**, which resets the counter — so a lower value after
   poking is correct behaviour, and that predicate **cannot discriminate a reset from a
   stall**. Replaced with two samples taken *after* the pokes, which can.

Having watched it print FAIL twice for real reasons, the PASS is informative.

### Licensing and provenance

| File | Content |
| --- | --- |
| `LICENSE` | MIT, © 2026 Jaret Arnold |
| `LICENSE-docs` | CC BY 4.0, covering `docs/**`, `docs/analysis/fig-*.png`, `experiments/**/*.csv` |
| `docs/THIRD-PARTY.md` | no vendored code, no embedded fonts, no redistributed data |
| `CITATION.cff` | Jaret Arnold, ORCID 0009-0003-4055-5238, version 1.0.0. **No DOI** — the coordinator mints the Zenodo concept DOI |
| `CHANGELOG.md` | `## [1.0.0] — 2026-09-10` |

The boundary (`sim/ web/ scripts/ tools/ tests/ experiments/**/*.ts` → MIT;
`docs/** experiments/**/*.csv` and figures → CC BY 4.0) is stated in `README.md`.

**Dependency licences were read from `node_modules`, not recalled**: vite MIT,
vitest MIT, typescript Apache-2.0, tsx MIT, @playwright/test Apache-2.0,
@types/node MIT. All six are devDependencies; the shipped bundle contains no
third-party runtime code.

⚠️ **A claim in `THIRD-PARTY.md` was wrong on first writing and was corrected before
commit.** It said `grep -rni repbase` over the tracked tree "returns exactly one hit".
It returns **16 lines across 5 files** (`README.md`, `docs/REFERENCES.md`,
`docs/ROADMAP.md`, and the two specs under `docs/superpowers/`). Every one is a statement
*about* Repbase — that it is closed, that its licence forbids redistribution, that it was
dropped in favour of Dfam — so the plan's actual requirement is met, but the sentence as
drafted was false and now states the real counts.

### Sweeps

| Sweep | Result |
| --- | --- |
| `gitleaks git --redact -v .` | **no leaks found** — 87 commits, ~2.22 MB scanned |
| `gitleaks dir --redact -v dist/` | **no leaks found** — ~37.66 KB scanned |
| private-path grep, tracked files | **1 hit, justified** (below) |
| private-path grep, `dist/` | **0 hits** |

**gitleaks was seen to fire before its clean result was accepted.** Scanned a control
directory holding a planted GitHub PAT and AWS-style credentials: it returned
`leaks found: 1`, `RuleID: github-pat`. The scanner discriminates, so "no leaks found" on
the real tree means something.

The one private-path hit is `docs/superpowers/specs/2026-09-10-ship-plan.md:135`, which
is **the ship plan quoting this very grep pattern** — self-referential, not a leak. The
same plan also names `~/.claude/projects/-home-mjarnold/memory/…` as the coordinator's
memo. Both are **justified rather than removed**: the plan is the record of what this
release was executed against, and the only thing the local path discloses is a username
that maps to the author's real name, which already ships in `LICENSE` and `CITATION.cff`.

`.superpowers/` was added to `.gitignore`. It is untracked today only because a
**machine-local** global excludesfile hides it, and that protection does not travel with
a clone — on any other checkout a wildcard `git add` could have committed the workflow's
ledgers and review packages.

DONE: files exist, proofs and sweeps recorded, both scanners seen to fire first.
