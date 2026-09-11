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
