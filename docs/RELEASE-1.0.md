# Release evidence — transposon-genome-ecology v1.0

> **Release evidence log, not a findings document.** Nothing here is a claim about the
> model or a result you should quote. The findings are in
> [`FINDINGS.md`](FINDINGS.md); this file only records what was run during the v1.0
> release and what it printed.

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
a local user-level install and satisfies the actual constraint ("Node 22"), so it was used
instead of creating a redundant environment. Exact versions are recorded below, which is
what the plan asks for. Cost if wrong: none — the recorded versions identify the
toolchain either way.

**Versions.**

| Tool             | Version                             |
| ---------------- | ----------------------------------- |
| node             | v22.14.0 (local user-level install) |
| npm              | 10.9.2                              |
| `.nvmrc`         | 22                                  |
| typescript       | 5.9.3                               |
| vite             | 8.2.2                               |
| vitest           | 5.0.0                               |
| tsx              | 4.23.13                             |
| @playwright/test | 1.62.1                              |
| @types/node      | 22.20.1                             |
| R                | 4.3.3 (2024-02-29)                  |
| ggplot2          | 4.0.2                               |
| patchwork        | 1.2.0                               |
| png              | 0.1.8                               |

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

| File                      | md5 before                         | md5 after                          |
| ------------------------- | ---------------------------------- | ---------------------------------- |
| `fig-001-peak-copies.png` | `8ded7d77926ce41ac08ce8252e6d3258` | `2154b2972dafcde61a03926aedbe298a` |
| `fig-002-viability.png`   | `25bccf553ff1e070329482303a4fb1ae` | `12abf606a2f5696e3a13b5caf8799a1a` |
| `fig-003-fidelity.png`    | `2a6bbbe9ce3366082b692eb497121da8` | `e3f67614a25cb4b5220d490a84b4ffcf` |
| `fig-003-silencing.png`   | `6ec604f4eb0f590f80158eebd87b5863` | `cee8b202c9e43d99de42a744b0c32c60` |
| `fig-004-band.png`        | `38732afefa3a83d45b21d13dac9c9379` | `9c7a3afc236bdbd583e95666cbe31af1` |
| `fig-005-divergence.png`  | `44d1cf6c20e59568b986e817ff9311bd` | unchanged (not re-rendered)        |
| `fig-005-tolerance.png`   | `82d1ae047c55c55f23cb19f54f5697fa` | unchanged (not re-rendered)        |

**The house style actually changed, with a control.** Counting pixels of each gridline
colour in every figure:

| figure              | size      | `#8C95A0` (current) | `#E5E5E5` (retired) |
| ------------------- | --------- | ------------------- | ------------------- |
| fig-001-peak-copies | 1300×1000 | 5 685               | 107                 |
| fig-002-viability   | 1400×1000 | 11 633              | 186                 |
| fig-003-fidelity    | 1880×1200 | 12 437              | 228                 |
| fig-003-silencing   | 1880×1200 | 21 894              | 170                 |
| fig-004-band        | 2100×1470 | 5 479               | 506                 |
| fig-005-divergence  | 2600×1440 | 22 195              | 577                 |
| fig-005-tolerance   | 2600×1440 | 15 205              | 661                 |

The residual `#E5E5E5` counts are **not** leftover gridlines. `fig-005` was not
re-rendered and is the reference for the current style, and it carries _more_ of that
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

| Figure            | axes labelled with units                                                                                | glyphs the caption names are drawn                                                      | legend                                                        | overplotted text | file is the one the doc links                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| fig-001           | ✅ "peak copies per genome"; x is the two arms                                                          | ✅ boxplot + jittered points                                                            | n/a — arms are the x axis, fill guide suppressed deliberately | none             | ✅ linked from `2026-09-02-per-copy-vs-family-rate.md:264`               |
| fig-002           | ✅ "fraction of seeds extinct" vs "theta / sigmaS"                                                      | ✅ both arm series with points                                                          | ✅ A-conscription / B-innate                                  | none             | ✅ `ROADMAP.md:192`, `2026-09-04-conscription-vs-innate-silencer.md:294` |
| fig-003-fidelity  | ✅ "fraction of 10 seeds CONTROLLED" vs phi with its definition                                         | ✅ triangle / circle / square at all three ratios, Wilson bars                          | ✅ three ratios, glyph-coded                                  | none             | ✅ `ROADMAP.md:226`, `…how-fresh-must-the-trap-be.md:428`                |
| fig-003-silencing | ✅ "mean silenced fraction at the run's stop (log scale)" vs phi                                        | ✅ three series, SE bars                                                                | ✅ three ratios                                               | none             | ✅ `ROADMAP.md:227`, `…how-fresh-must-the-trap-be.md:418,429`            |
| fig-004           | ✅ "fraction of 10 seeds CONTROLLED" vs "trap infidelity phi (log scale)", both horizon strips labelled | ✅ triangle / circle / square for the three predicted `phi*`, bars, observed-edge cells | ✅ "predicted phi\* for theta/sigmaS"                         | see note         | ✅ `ROADMAP.md:267`, `2026-09-04-a-band-or-only-a-delay.md:476`          |

_Note on fig-004._ It is by far the densest figure — several annotation blocks sit
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

| Question | Claim in FINDINGS                                                 | Recomputed from the CSV                                                                           |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 001      | 80 runs, 40 seeds × 2 arms                                        | 80 rows, 40 distinct seeds                                                                        |
| 001      | peak copies/genome 58.65 vs 21.49                                 | 58.6520 vs 21.4907                                                                                |
| 001      | extinct 21/40 vs 25/40                                            | 21/40 vs 25/40                                                                                    |
| 001      | 17 of 40 per-copy runs over 60 copies; 0 of 40 family-level       | 17 and 0                                                                                          |
| 002      | 180 runs; both arms viable at 3 of 9 grid points                  | 180 rows; 9 grid points, 3 both-viable                                                            |
| 002      | the 9 points are 6 distinct regimes                               | 6 distinct `k_star` values                                                                        |
| 003      | 270 runs; CONTROLLED only at `phi = 0`, all three ratios          | 270 rows; fully-controlled phi = [0.0] at 2.00, 3.33 and 5.00                                     |
| 004      | 270 runs + 60 control; edge 0.016 at gen 600                      | 270 + 60; max fully-controlled phi = 0.016 at all three ratios                                    |
| 004      | edge 0.004 at gen 1800                                            | max fully-controlled phi = 0.004 at all three ratios                                              |
| 005      | 150 runs + 90 control; 150/150 saturated, 0 censored, 0 extinct   | 150 + 90; saturated 150/150, censored 0, extinct 0                                                |
| 005      | 15 cells, no duplicated (ratio, phi, seed)                        | 15 cells; 150 distinct keys over 150 rows → 0 duplicates                                          |
| 005      | secondary 1 falsified by +43.1 / +42.2 / +37.0 % at `phi = 0.002` | observed 4720.1 / 5345.5 / 6101.9 vs predicted 3297.5 / 3759.5 / 4454.1 → +43.1 / +42.2 / +37.0 % |

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

_Ruling (deviation from the plan)._ The plan's extraction command is
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
records the works resolved live against OpenAlex on 2026-09-02 and 2026-09-03 with
first-author surname, year, venue and DOI taken from the registry.

⚠️ **Corrected 2026-09-11 (v1.0.1).** This paragraph read "all 38 works / 42 DOIs" and
explained the gap to 51 by saying `docs/` cites works outside `REFERENCES.md`
(pre-registrations, the Charlesworth read, `pathway-mechanics.md`). **Both halves were
wrong.** `REFERENCES.md` itself carries 51 distinct DOIs — its own header was the stale
thing, never updated after §7 and §8 grew — and `docs/dois.txt` is exactly that file's
DOI set, verified identical in both directions. There is no excess to explain. See the
re-tally note at the top of `REFERENCES.md`.

**Each FINDINGS headline that rests on a source was checked against a full-text read**,
recorded in `docs/pathway-mechanics.md`, not against recall:

| FINDINGS sentence                                                                        | Source                           | Confirmed by                                                                                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| tolerance "limits fitness cost without affecting propagation", outside the piRNA pathway | Kelleher et al. 2018             | §5, verbatim: "mechanisms of tolerance do not affect propagation but rather limit the fitness costs to the host"                         |
| Kelleher 2012 "argues the other way in its own system"                                   | Kelleher, Edelman & Barbash 2012 | §4, verbatim: "mismatches between piRNAs and TE transcripts cannot explain the pattern of TE derepression in hybrids"                    |
| the model is right and the shipped `wDom` is unrealistically small                       | Kapitonov & Jurka 2005           | §6, verbatim: "a period of intensive transformations due to diversifying/positive selection", then stabilizing selection at 79% identity |
| Kofler's 0.2% is a property of his silencing rule and does not transfer                  | Kofler 2020                      | §3, verbatim minimum-size quote plus the recorded non-transfer argument                                                                  |

`npm test` after stage 4: **22 files, 198 tests, all passed.**

DONE: FINDINGS numbers agree with the CSVs they cite (checked above), ghostcite clean
with its control seen to fire, README rewritten.

## Stage 5 — site, licensing, hygiene

### The site builds for a project Pages path

`vite.config.ts` now sets `base: "/transposon-genome-ecology/"`. GitHub Pages serves a
project site under `/<repo>/`, so without it the page would load and every asset would 404. Verified in the emitted HTML:

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

| Site                         | Was                                   | Now                                                                                                        |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| both test files              | `.replace(/\/$/, "")`                 | keep the trailing slash; it is the served base URL                                                         |
| `one-implementation.test.ts` | `` `${origin}/hash-harness.html` ``   | `new URL("hash-harness.html…", origin).href` — the join cannot reintroduce a double slash                  |
| `one-implementation.test.ts` | `/src="(\/assets\/[^"]+\.js)"/`       | regex built from `BASE`, imported from `vite.config.ts`                                                    |
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

| Step                     | Result                              |
| ------------------------ | ----------------------------------- |
| clone HEAD               | `964d902`                           |
| `npm ci`                 | 0 vulnerabilities                   |
| `npm test`               | **22 files, 198 tests, all passed** |
| `npm run build`          | built in 173 ms                     |
| `dist/index.html`        | present                             |
| `dist/.nojekyll`         | present                             |
| `dist/hash-harness.html` | present                             |

### Headless smoke against the built site

Served with `vite preview` and driven with the Playwright Chromium already in
devDependencies.

| Check                                          | Result                                   |
| ---------------------------------------------- | ---------------------------------------- |
| toy HTTP status                                | **200** at `/transposon-genome-ecology/` |
| `hash-harness.html` HTTP status                | **200**                                  |
| responses ≥ 400                                | **none**                                 |
| console errors / page errors / failed requests | **none**                                 |
| controls present                               | 4 buttons, 4 sliders                     |
| sim advances                                   | `gen` 93 → 459 over 2 s                  |
| sim still advances after poking every button   | `gen` 255 → 525                          |

⚠️ **The first two smoke runs reported FAIL, and both were the harness's fault, not the
toy's.** Recorded because a smoke test that only ever passes is worthless:

1. The first version scraped `document.body.innerText` for `/generation[^0-9]*([0-9]+)/`.
   The string "generation" does not appear in `web/index.html` at all, so it matched an
   unrelated number that never moved. The real counter is the `gen` row of `#readout`.
2. The second version asserted `gen_after_poking > gen_before_poking`. One of the four
   pokes **seeds a fresh invasion**, which resets the counter — so a lower value after
   poking is correct behaviour, and that predicate **cannot discriminate a reset from a
   stall**. Replaced with two samples taken _after_ the pokes, which can.

Having watched it print FAIL twice for real reasons, the PASS is informative.

### Licensing and provenance

| File                  | Content                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `LICENSE`             | MIT, © 2026 Jaret Arnold                                                                                          |
| `LICENSE-docs`        | CC BY 4.0, covering `docs/**`, `docs/analysis/fig-*.png`, `experiments/**/*.csv`                                  |
| `docs/THIRD-PARTY.md` | no vendored code, no embedded fonts, no redistributed data                                                        |
| `CITATION.cff`        | Jaret Arnold, ORCID 0009-0003-4055-5238, version 1.0.0. **No DOI** — the coordinator mints the Zenodo concept DOI |
| `CHANGELOG.md`        | `## [1.0.0] — 2026-09-10`                                                                                         |

The boundary (`sim/ web/ scripts/ tools/ tests/ experiments/**/*.ts` → MIT;
`docs/** experiments/**/*.csv` and figures → CC BY 4.0) is stated in `README.md`.

**Dependency licences were read from `node_modules`, not recalled**: vite MIT,
vitest MIT, typescript Apache-2.0, tsx MIT, @playwright/test Apache-2.0,
@types/node MIT. All six are devDependencies; the shipped bundle contains no
third-party runtime code.

⚠️ **The Repbase evidence line was wrong twice, and the second time taught the real
lesson.** It first said `grep -rni repbase` "returns exactly one hit"; corrected to "16
lines across 5 files"; and the stage 6 critic then measured **23 lines across 8 files**.
The correction had been invalidated by the commits that followed it — including the
commit that wrote the correction, because **writing a count of Repbase mentions adds
Repbase mentions**. The sentence was self-defeating.

The fix is not a third count. `THIRD-PARTY.md` now states the **invariant** — every line
the command returns is a statement _about_ Repbase, never content _from_ it — and prints
the command so a reader can run it, with no number to go stale. A live count in a shipped
line is a staleness generator: it is falsified by the next edit to any file it counts.
Re-typing "23 across 8" would have relocated the hole rather than closed it.

The substantive requirement was never in doubt: the critic read all 23 hits independently
and confirmed no Repbase sequence, annotation or derived content exists anywhere in the
tree.

### Sweeps

| Sweep                            | Result                                            |
| -------------------------------- | ------------------------------------------------- |
| `gitleaks git --redact -v .`     | **no leaks found** — 87 commits, ~2.22 MB scanned |
| `gitleaks dir --redact -v dist/` | **no leaks found** — ~37.66 KB scanned            |
| private-path grep, tracked files | **4 hits, enumerated and justified** (below)      |
| private-path grep, `dist/`       | **0 hits**                                        |

**gitleaks was seen to fire before its clean result was accepted.** Scanned a control
directory holding a planted GitHub PAT and AWS-style credentials: it returned
`leaks found: 1`, `RuleID: github-pat`. The scanner discriminates, so "no leaks found" on
the real tree means something.

Local-path disclosures in tracked files, enumerated rather than counted from memory —
`git ls-files -z | xargs -0 grep -nE '<home-dir>|<memory-dir>'` (the author's home and notes paths, redacted here):

| Site                                                 | What it is                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `docs/superpowers/specs/2026-09-10-ship-plan.md:135` | the ship plan quoting this very grep pattern — self-referential |
| `docs/superpowers/specs/2026-09-10-ship-plan.md:7`   | the path of the coordinator's memo, which is not in this repo   |
| `docs/ROADMAP.md:98`                                 | a path in the historical record                                 |
| `docs/RELEASE-1.0.md:482`                            | this table                                                      |

⚠️ An earlier draft of this paragraph named only the two ship-plan sites and so
**undercounted by one** — `docs/ROADMAP.md:98` went unlisted. Found by the stage 6 critic.
The table above is generated from the command rather than recalled.

All are **justified rather than removed**: these documents are the record of what this
release was executed against, and the only thing the paths disclose is a local username
that maps to the author's real name, which already ships in `LICENSE` and `CITATION.cff`.
**`dist/` contains none of them**, so nothing reaches the published site.

`.superpowers/` was added to `.gitignore`. It is untracked today only because a
**machine-local** global excludesfile hides it, and that protection does not travel with
a clone — on any other checkout a wildcard `git add` could have committed the workflow's
ledgers and review packages.

DONE: files exist, proofs and sweeps recorded, both scanners seen to fire first.

## Stage 6 — critic gate

One fresh subagent with **no context from this session**, served `dist/`, `docs/FINDINGS.md`,
all seven figures, the licensing files and `experiments/*.csv`, and told to find reasons
the release must not ship.

**Result: zero non-waivable defects. One escalation, ten waivable findings, two checks it
declared incomplete rather than passing silently.** One round; a second was not needed
because the escalation was a documentation statement, not a defect in the artifact.

### What the critic verified independently

It wrote its own Python against the raw CSVs and did not read the R scripts first. **Every
number in `FINDINGS.md` matched**, including ones the write-up did not claim were checked:

- 001: 58.652000 / 21.490667, t = 4.6675, df = 42.07, p = 3.100e-05; 17 and 0 above 60
  copies; 21/40 and 25/40 extinct; 3 `no-inactivation` exclusions.
- 002: 3 of 9 grid points both-viable, 6 distinct `k*`, 2 distinct regimes among the three.
- 003: fully CONTROLLED at `phi = 0` and nowhere else, all three ratios.
- 004: edge 0.016 at generation 600 and 0.004 at 1800, all three ratios; every cell
  unanimous 10/10 or 0/10; the mechanism's own diagnostic refuted (reach 25.0 vs wander
  60.8, controlled 10/10).
- 005: 150/150 saturated, 0 censored, 0 extinct, 150 unique keys; +43.141 / +42.186 /
  +36.996 % at `phi = 0.002`; worst interpolation −8.633%; worst seed at 82.4% of horizon;
  realised headroom 1.311× against 1.796× predicted.
- **The refits, recomputed from scratch:** a = 0.869472 / 0.873357 / 0.876611, SE 0.0274 /
  0.0189 / 0.0192, and 004's frozen exponents backed out of the `predicted_t_sat` column
  as 0.7304 / 0.7360 / 0.7447. Combined-SE separation 3.15 / 3.83 / 3.53 — the claimed
  "3.2 to 3.8".

It rebuilt `dist/` from clean and drove it with Playwright: clicked all four buttons three
times each, swept all four sliders to max/min/midpoint with real events, and ran to
**generation 8331**. Zero console errors, zero page errors, zero failed requests, zero
responses ≥ 400, on both `index.html` and `hash-harness.html`. It re-ran `plot-001.R`
twice and got `2154b2972dafcde61a03926aedbe298a` both times, byte-identical to the
committed figure. It read all seven figures as images and checked plotted values against
its own recomputation. It confirmed no exponent is quoted as a system property, no
secrets, and all four source claims against the verbatim quotes in `pathway-mechanics.md`.

### The escalation, and what was done about it

Covered above under Sweeps: the Repbase evidence line quoted a hit count that its own
writing invalidated. Fixed by replacing the count with an invariant plus the command.

### The waivable findings, and which were fixed anyway

Eight of the ten were statements that were imprecise or wrong. None required a model
change; all were fixed by correcting the statement, which is the only remedy this
release's scope allows.

| Finding              | Was                                                                                                                                      | Now                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 002 secondary bound  | "silenced fraction stays ≤ 0.022" — violated by the true 0.02227                                                                         | states the registered 0.05 criterion, worst cell mean 0.0223, worst run 0.0348                       |
| 002 arm A copies     | "sat near 200 copies" — the two regimes are 195.5 and 262.6                                                                              | both means given, with the 94.5–95.5% silenced range                                                 |
| 005 residual pattern | "a systematic `+ − − − +`" — 005's 3.33 fourth residual is +0.0004, inside its own SEM                                                   | `+ − − − +` at 004's three and 005's 2.00/5.00, `+ − − 0 +` at 005's 3.33, stated                    |
| 004 secondary 2      | "miss by 1.8× to 3.8×" compressed two different comparisons                                                                              | names the post-hoc edge explicitly and gives the registered-grid near-hit beside it                  |
| `wDom` band          | `0.03 < wDom* ≤ 0.075` quoted unqualified in FINDINGS and README, while the guard's own test says "0.075 is not a property of the model" | both now say the band is measured **on guard 8's arm** and is a property of that arm's `beta`/`pDom` |
| README `sim/` size   | "~850 lines"; `wc -l` gives 992                                                                                                          | "~990 lines"                                                                                         |
| licence boundary     | `LICENSE-docs` claimed all of `docs/**`, sweeping ~275 KB of R **source** into CC BY while README said code is MIT                       | `LICENSE-docs` carves out `docs/analysis/*.R` as MIT; README states the boundary glob by glob        |
| `CITATION.cff`       | `license: MIT` alone, though the work is dual-licensed                                                                                   | `license: [MIT, CC-BY-4.0]`                                                                          |

Two findings were accepted without change: fig-001's missing lower whisker (pure
aesthetics) and the workflow triggering only on `master` (deliberate — this branch is
handed off, not deployed).

**The exponent sweep was widened, because the claim was wider than its evidence.**
`FINDINGS.md` says "nothing in this repository quotes an exponent as a property of the
system", but the stage 2 discharge only grepped `docs/`, `README.md` and `CHANGELOG.md`.
Re-run across every tracked file: every hit is either `0.875` (a `phi` grid value in 003)
or a frozen-reference constant in a guard or runner (`plot-004.R:191-193`,
`plot-005.R:78-80`, `experiments/005-delay-divergence.ts:67-69`). The critic separately
flagged `web/params.ts:45`'s "0.87"; read in context it is an **evolved transposition rate
`r` under `rMax = 1`**, not a `t_sat` exponent. The claim holds tree-wide, and now the
evidence covers what the claim covers.

### What the critic could not finish, recorded rather than passed

- **"1.9–2.9× the sampling noise floor"** could not be reproduced exactly, because
  "sampling noise floor" is not defined in shipped prose and the critic was told not to
  trust the R scripts. Its closest reconstruction gave 2.99 / 2.12 / 2.13 for 005's three
  fits — same order and direction, and 004's fit extends the low end. The per-cell SEMs it
  _could_ check matched exactly (0.86%–2.48%). Corroborated, not independently confirmed.
- **Guard-level claims** (the nine guards, golden hash `9c15fd28`, the `wDom` band, the
  domestication peaks) were traced to their recorded measurements in
  `tests/guards/domestication-arm.ts` and `docs/ROADMAP.md` but not re-run. The passing
  198-test suite is the evidence for those, not an independent recomputation.

DONE: zero non-waivable defects remain.

### Re-verification after the stage 6 corrections

`npm run typecheck` clean. `npm test` **22 files, 198 tests, all passed** (68.75 s).

⚠️ **An intermediate run of that suite reported 4 failures and is recorded rather than
quietly discarded.** It took 281 s against a normal ~69 s, and `pgrep` found a second
`vitest` process alive at 301% CPU — the stage 6 critic's own `npm test` still draining.
Two concurrent suites contend for CPU and for the preview server's port, and both browser
test files bind one. The failures were the harness colliding with itself, not a
regression: after waiting for the other run to exit, a single clean run passes 198/198.
The lesson is the `pgrep`-before-a-long-pipeline rule, applied to a suite this repo runs
constantly.

Also re-checked after the edits: `CITATION.cff` still parses as valid CFF 1.2.0 with
`license: [MIT, CC-BY-4.0]`; all relative links in `FINDINGS.md` still resolve (0 broken);
no stale claim survives anywhere except inside the correction records that quote it
deliberately.

One correction was made beyond the critic's list. `docs/ROADMAP.md:195` carried the same
"≤ 0.022" bound that was fixed in FINDINGS, and the ROADMAP ships too — it now states the
registered 0.05 criterion with the worst cell mean and worst run, and flags the earlier
wording. The critic did not look at the ROADMAP; the defect class it found there did not
stop at the file it happened to be reading.

## Stage 7 — handoff

`release/1.0-rc` is pushed. **Nothing else was done to the remote**: the merge to
`master`, the visibility flip, Pages enablement, the tag and the release are the
coordinator's, and none of them was touched from here.

**RC SHA.** The head of `release/1.0-rc` — the commit this section lands in. Resolve it
with `git rev-parse release/1.0-rc` rather than reading a literal here; a SHA written
into the commit it names cannot be correct, and a stale one is the same defect the
Repbase line taught this release.

**Commit chain**, cut from `acf530c` (which is `2ab527c` plus the ship plan itself):

| Commit    | What                                                             |
| --------- | ---------------------------------------------------------------- |
| `71d2e2c` | pin Node >=22, start this evidence log                           |
| `fb71a8e` | classify all 23 open roadmap items; discharge the exponent claim |
| `46aeac0` | re-render figs 001–004; pin `plot-001.R`'s jitter                |
| `787b7d1` | `FINDINGS.md`, README top, the domestication limit in the toy    |
| `964d902` | Pages workflow, licensing, the site base                         |
| `0fc0e88` | stage 5 proofs and sweeps                                        |
| `7c4558f` | close the critic gate; fix every statement it falsified          |

### Toolchain

node v22.14.0 · npm 10.9.2 · typescript 5.9.3 · vite 8.2.2 · vitest 5.0.0 · tsx 4.23.13 ·
@playwright/test 1.62.1 · R 4.3.3 · ggplot2 4.0.2 · patchwork 1.2.0 · png 0.1-8.

### Results at handoff

| Check                                                        | Result                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `npm test`                                                   | **22 files, 198 tests, all passed** (68.75 s)                                              |
| `npm run typecheck`                                          | clean                                                                                      |
| `npm run build`                                              | 27 modules, `dist/` with `index.html`, `hash-harness.html`, `.nojekyll`                    |
| clean-checkout clone → `npm ci && npm test && npm run build` | **198/198**, all three artifacts present                                                   |
| headless smoke on the built site                             | 200 / 200, zero console errors, zero failed requests, sim advances and survives every poke |
| `gitleaks git`                                               | no leaks — 90 commits                                                                      |
| `gitleaks dir dist/`                                         | no leaks                                                                                   |
| ghostcite on `docs/dois.txt`                                 | 51 DOIs, **0 findings**                                                                    |
| critic gate                                                  | **0 non-waivable defects**                                                                 |

### Figure render commands, and the hashes they produce

Run from the repository root; the scripts source `docs/analysis/theme.R` by a
repo-relative path and fail from anywhere else.

| Command                            | Output                    | md5                                |
| ---------------------------------- | ------------------------- | ---------------------------------- |
| `Rscript docs/analysis/plot-001.R` | `fig-001-peak-copies.png` | `2154b2972dafcde61a03926aedbe298a` |
| `Rscript docs/analysis/plot-002.R` | `fig-002-viability.png`   | `12abf606a2f5696e3a13b5caf8799a1a` |
| `Rscript docs/analysis/plot-003.R` | `fig-003-fidelity.png`    | `e3f67614a25cb4b5220d490a84b4ffcf` |
| `Rscript docs/analysis/plot-003.R` | `fig-003-silencing.png`   | `cee8b202c9e43d99de42a744b0c32c60` |
| `Rscript docs/analysis/plot-004.R` | `fig-004-band.png`        | `9c7a3afc236bdbd583e95666cbe31af1` |
| `Rscript docs/analysis/plot-005.R` | `fig-005-divergence.png`  | `44d1cf6c20e59568b986e817ff9311bd` |
| `Rscript docs/analysis/plot-005.R` | `fig-005-tolerance.png`   | `82d1ae047c55c55f23cb19f54f5697fa` |

### Rebuild from nothing

```sh
git clone -b release/1.0-rc https://github.com/musharna/transposon-genome-ecology.git
cd transposon-genome-ecology
npm ci
npx playwright install chromium     # required: two test files drive a real browser
npm test && npm run typecheck && npm run build
npm run preview                     # serves dist/ under /transposon-genome-ecology/
for n in 001 002 003 004 005; do Rscript docs/analysis/plot-$n.R; done
```

### The scope allowlist held

Verified by diff against the base, not by recollection:

- `git diff --quiet acf530c..HEAD -- sim` → **`sim/` unchanged**.
- `defaultParams` unchanged; **`wDom` is still the registered 0.01** in both
  `sim/params.ts` and `web/params.ts`.
- `theta`, `sigmaS`, `phi` and every other constant unchanged; no law refitted; no new
  question registered or run.
- The golden hash pin `9c15fd28` in `tests/step.test.ts` is untouched.

Every defect found in this release was fixed by **correcting a statement**, which is the
only remedy the plan allows — never by moving the model toward a nicer answer.

### What the coordinator still owns

1. Verify `https://musharna.github.io/transposon-genome-ecology/` serves once Pages is
   enabled — the README links it as a placeholder and nothing here could confirm it live.
2. Merge `release/1.0-rc` to `master`. The Pages workflow triggers on `master`, so the
   site publishes on that merge and not before.
3. Flip the repository public.
4. Tag `v1.0.0` and cut the release.
5. Mint the Zenodo concept DOI and add it to `CITATION.cff`, which deliberately ships
   without one.

### Two things to carry forward

- **A live count in a shipped line is a staleness generator.** The Repbase evidence line
  was wrong twice; the second wrong version was created by the act of writing it. What
  works is an invariant plus the command that tests it.
- **An intermediate `npm test` reporting 4 failures was contention, not a regression** —
  a second `vitest` was alive at 301% CPU. `pgrep` before a long pipeline, including for
  suites this repo runs constantly.

STOP. The remote holds `release/1.0-rc` and nothing else changed.
