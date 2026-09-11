# Release evidence — transposon-genome-ecology v1.0.1

> **Release evidence log, not a findings document.** Nothing here is a claim about the
> model. The findings are in [`FINDINGS.md`](FINDINGS.md); this file records what was run
> for the v1.0.1 documentation-correctness release and what it printed.

**Branch.** `release/1.0.1-rc`, cut from `master` at
`53c0e12` ("docs: v1.0.1 plan — executor brief from the post-ship panel audit").

**RC.** Branch `release/1.0.1-rc`, three commits on top of `53c0e12`:

| commit    | what                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| `b2a6ce9` | the punch list — all 14 items                                                                |
| `126ac33` | the critic gate — 9 class-1 and 2 class-3 findings, two of them self-inflicted               |
| tip       | this evidence log (its own SHA cannot be quoted inside it; `git rev-parse release/1.0.1-rc`) |

Every measurement below was taken at `126ac33`, whose tree differs from the tip only
by the addition of this file.

**Plan.** [`docs/superpowers/specs/2026-09-11-v1.0.1-plan.md`](superpowers/specs/2026-09-11-v1.0.1-plan.md).

**Scope held.** The plan's allowlist was "a fix changes what is SAID, never what was
MEASURED". Verified by diff: no file under `sim/` changed behaviour (the two `sim/` edits
are both comments), no `defaultParams` or `TOY_DEFAULTS` value moved, no constant moved,
no pre-registration was touched, and no experiment was re-run.

```
$ git diff --stat 53c0e12..126ac33 -- sim/
 sim/params.ts    | 6 +++++-
 sim/silencing.ts | 9 ++++++---
```

Both are comment-only. `docs/pre-registrations/` and `experiments/` are absent from the
diff entirely.

## Toolchain

Same as v1.0. All commands run with `export PATH="$HOME/.local/node-22/bin:$PATH"`.

| Tool      | Version                             |
| --------- | ----------------------------------- |
| node      | v22.14.0 (local user-level install) |
| npm       | 10.9.2                              |
| `.nvmrc`  | 22                                  |
| ghostcite | 0.5.2                               |
| gitleaks  | 8.30.1                              |

## Per-item disposition

| #   | item                                                  | disposition                 | where                                                                                                        |
| --- | ----------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A1  | guard count 7 → 9                                     | DONE                        | `README.md` table is nine rows + a does-not-claim paragraph; `docs/RELEASE-1.0.md`; CHANGELOG parentheticals |
| A1+ | consequential "other six guards" count                | DONE (extra)                | `README.md`, `tests/guards/one-implementation.test.ts` → "eight"                                             |
| A2  | recount "two falsified", fix table bolding            | DONE                        | `README.md` intro + verdict table, per-row falsification level                                               |
| A3  | `phi = 0.016` direction and count                     | DONE                        | `docs/FINDINGS.md` → "three doublings **below** 0.125"                                                       |
| A3+ | same error in ROADMAP                                 | DONE (extra)                | `docs/ROADMAP.md`                                                                                            |
| A3− | same error in a pre-registration                      | **NOT DONE — out of scope** | see "Found but NOT fixed" below                                                                              |
| A4  | toy header line + legend qualifier                    | DONE                        | `web/index.html` `#masthead`; legend note names guard 8's arm                                                |
| A5  | stale perf numbers in `sim/silencing.ts`              | DONE                        | 1.06 → 35.73 ms, **33.7×**, with the quantity named                                                          |
| B6  | Setup / Reproducing: Node 22, Playwright, R, 005 cost | DONE                        | `README.md` Setup; `docs/FINDINGS.md` "Reproducing this"                                                     |
| B7  | `## Unreleased` under `## [1.0.0]`                    | DONE                        | folded into 1.0.0 (it shipped — see below)                                                                   |
| C8  | `Mirrors _pm/` → `Layout:`; drop `_scratch/`          | DONE                        | `README.md`                                                                                                  |
| C9  | re-tally references                                   | DONE, **revised by critic** | 51 DOIs, dated, with its command; no entries/works count published — see the critic section                  |
| C10 | `TOY_DEFAULTS` override count                         | DONE                        | 12 of 17 listed, of 20 `Params` keys; `sim/params.ts`                                                        |
| C11 | `CITATION.cff` licence URLs                           | DONE, **deviation**         | field removed rather than doubled — see below                                                                |
| C12 | `hash-harness.html` noindex + fixture note            | DONE                        | `web/hash-harness.html`; not removed, guard 7 loads it                                                       |
| C13 | `RELEASE-1.0.md` banner                               | DONE                        | top of that file                                                                                             |
| C14 | CHANGELOG `[1.0.1]`                                   | DONE                        | every item above, with reasons                                                                               |

### Deviations, and why

**C11 — `license-url` was removed, not duplicated.** The plan asks for "`license-url` for
both licences". That is not expressible: CFF 1.2.0 types `license-url` as a **single**
`url` and its own description scopes it to "non-standard licenses not included in the SPDX
License List". Fetched and checked against the live schema this session:

```
$ python3 -c "...schema.json..."
license-url: {"$ref": "#/definitions/url", "description": "The URL of the license text
under which the software or dataset is licensed (only for non-standard licenses not
included in the SPDX License List)."}
```

MIT and CC-BY-4.0 are both SPDX identifiers, so the field does not apply to either, and a
list would be schema-invalid. The defect the plan names — the file asserting MIT alone for
a dual-licensed work — is fixed by removing the field and leaving the two SPDX ids in
`license:`, with the reasoning recorded in the file itself. `date-released` kept at
`2026-09-10`; the tag was cut 2026-09-10 23:45 EDT (`git for-each-ref` on `v1.0.0`).

**A5 — the multiplier is 33.7×, not the plan's 34.7×.** The plan reports `web/main.ts` as
holding "1.06 → 35.73 ms / 34.7×". Those are two different quantities in the same table
row. 34.7× is the **speedup** at generation 6000 (35.73 ms before ÷ 1.03 ms after).
The sentence in `sim/silencing.ts` is about the **degradation** — cost at 6000 against
cost at 200 — which is 35.73 ÷ 1.06 = **33.71×**. Writing 34.7 there would have reproduced
the exact error `web/main.ts` warns about three lines above its own table ("NAME THE
QUANTITY BEFORE QUOTING A MULTIPLE"). The comment now gives 33.7× and says explicitly
which ratio it is and which it is not. Origin of the stale figures, for the record: they
are the pre-implementation brief's numbers, and the implementation report records that the
measured values differ from the brief's by 1.6–2.2×.

**B7 — folded rather than moved.** The plan allows either. `Unreleased` was folded into
`[1.0.0]` because the work shipped there, verified at the tag rather than inferred:

```
$ git show v1.0.0:sim/silencing.ts | grep -c repertoireInsertionIndex
2
$ git show v1.0.0:README.md | grep -c 35.73
1
```

The 1.0.0 preamble's "No `sim/` behaviour … changed in this release" was qualified in the
same edit, since the folded entry is a `sim/` change — a behaviour-preserving one, measured
bit-identical on every `Snapshot` field.

**A4 — where the masthead went, and why it is not where you would expect.** It is a row of
`#stage`, not of `#app` and not a child of `#controls`. Both of the obvious placements
break a shipped assertion, measured before choosing:

- a child of `#controls` becomes a sixth entry in `panel.sections`, which
  `tests/layout.test.ts` asserts by **exact equality** against a five-item list;
- a full-width row of `#app` shortens the control column, and at 1440px `#trap-panel`
  carries only **28px** above its 161px CSS floor (measured: `trapHeight` 189 at 1440,
  161 at 800), so a taller header collapses the trap onto its floor and
  `tall.trapHeight > short.trapHeight` can no longer pass.

Taking the 32px out of the field canvas costs no assertion and no claim.

The legend qualifier had a cost of its own and it was paid in words, not in layout: the
first draft added 47px of prose, which pushed the column to `scrollHeight` 1471 against
`clientHeight` 1424 at 1440px and pinned the trap to its floor — two failing assertions.
The note was rewritten to carry the qualifier at no net height. Measured after:

| viewport  | scrollHeight | clientHeight | deadSpace | trapHeight  | lowest poke bottom | offscreen |
| --------- | ------------ | ------------ | --------- | ----------- | ------------------ | --------- |
| 1280×800  | 1411         | 784          | —         | 161 (floor) | 667                | none      |
| 1280×1440 | 1424         | 1424         | 0         | 174         | 667                | none      |

`panel.sections` is unchanged at both heights, and no poke moved.

## Acceptance

### Suites

**`npm run typecheck` — clean.** `tsc --noEmit`, no output, exit 0, 2.98 s wall.

**`npm run build` — clean**, 123 ms, five artefacts:

```
dist/hash-harness.html            1.31 kB │ gzip: 0.70 kB
dist/index.html                  16.54 kB │ gzip: 5.51 kB
dist/assets/harness-Bn08ftXm.js   0.73 kB │ gzip: 0.45 kB
dist/assets/params-jPj0KOgw.js    5.10 kB │ gzip: 2.16 kB
dist/assets/main-3rlMxbCi.js     16.96 kB │ gzip: 6.71 kB
```

All three JS content hashes (`Bn08ftXm`, `jPj0KOgw`, `3rlMxbCi`) are **unchanged across
every build in this release**, including the builds before and after the `sim/` edits.
Only the two HTML files changed size. That is a second, independent confirmation that the
`sim/` changes are comments: had either edit altered emitted code, Vite's content hash
would have moved.

**Guard 7's state hash is unchanged.** `tests/guards/one-implementation.test.ts` asserts a
byte-identical `stateHash` between the browser bundle and node, at both the plain scenario
and `TOY_DEFAULTS`. Run twice against this tree — after the punch-list commit and again
after the critic-gate commit — green both times:

```
$ npx vitest run tests/layout.test.ts tests/guards/one-implementation.test.ts
Test Files  2 passed (2)
     Tests  11 passed (11)
```

**`npm test` — 22 files, 198 tests, all passed**, 40.69 s, exit 0, against the RC tree:

```
$ npm test
 Test Files  22 passed (22)
      Tests  198 passed (198)
   Start at  04:51:14
   Duration  40.69s (tests 97%, transform 2%, import 1%)
```

_Note on how this was run._ It was first submitted to the `jobd` broker (job 3720) rather
than run inline, because the host was saturated by other projects' work. It never
dispatched: the laptop worker is `max_concurrent: 1`, and `jepagame` jobs at priority 78
held the only slot for ~70 minutes — job 3713 ran to completion and job 3727 claimed the
slot immediately after, with this job queued at priority 40 behind both. It was cancelled
and run inline once the host had gone quiet (load average **1.44**, 13 idle CPUs, 32.7 GB
free RAM), at which point an inline run starved nothing. Preempting another project's
running job was never done.

**That run also settles the environment question below.** The same suite, same tree, took
**249 s and failed one test** under load average 20.5, and **40.69 s with everything
green** at load average 1.4 — a 6.1× wall-clock difference on identical code. The failure
was contention, and nothing about it was a property of this release.

### Clean clone

Ran from a fresh `git clone` of `release/1.0.1-rc` into an empty temp directory at
`361d74b`, with no `node_modules` and no `dist`:

```
HEAD=361d74b582b7e577dc91422d706a6ce6948480f3
=== npm ci ===        13 packages looking for funding; found 0 vulnerabilities
=== npm test ===      Test Files 22 passed (22) | Tests 198 passed (198)   41.42s
=== typecheck ===     tsc --noEmit, no output
=== build ===         built in 101ms
                      dist/hash-harness.html            1.31 kB
                      dist/index.html                  16.54 kB
                      dist/assets/harness-Bn08ftXm.js   0.73 kB
                      dist/assets/params-jPj0KOgw.js    5.10 kB
                      dist/assets/main-3rlMxbCi.js     16.96 kB
```

Green, and the three JS content hashes are **identical to the in-tree build** — the build
is reproducible from a clean checkout, not just incrementally correct here.

⚠️ **One step in it failed, and it found a real defect in this release's own
documentation.**

```
=== playwright ===
sudo: a password is required
Failed to install browsers
Error: Installation process exited with code: 1
```

The clean clone ran `npx playwright install --with-deps chromium` — the command **B6 had
just written into `README.md` as the first-line setup step** — and it failed. `--with-deps`
shells out to the distro package manager to install Chromium's shared libraries, so it
needs root; under non-interactive sudo it exits 1. The suite passed anyway only because
Playwright's browser cache is user-global (`~/.cache/ms-playwright`) and was already
populated, which means **this run did not verify the documented install path** — it
verified `npm ci` → `npm test` on a machine that happened to already have a browser.

Fixed rather than noted: `README.md` and `FINDINGS.md` now lead with plain
`npx playwright install chromium`, which needs no privileges (verified: exit 0 in the
clean clone as a non-root user), and present `--with-deps` as the fallback for a missing
system library, marked Linux-only **and root-only**, with the reason CI can use it
(`.github/workflows/pages.yml:46` runs it on a GitHub runner, which has passwordless
sudo). The plan's B6 asked for `--with-deps` with a Linux-only caveat; the caveat was
incomplete, and a clean-clone run is what showed it.

**Still not verified by anything here:** installation of Chromium on a machine with an
empty `~/.cache/ms-playwright` **and** missing system libraries. That path needs a
container.

### ghostcite

```
$ ghostcite docs/dois.txt --json
{ "summary": { "total": 51, "with_doi": 51, "findings": 0,
               "retraction_source": "Retraction Watch snapshot 2026-07-14 (71059 rows)" },
  "findings": [] }
```

Clean. Note this independently corroborates C9's re-tally: ghostcite counts **51**, which
is what the corrected `REFERENCES.md` header now claims and what the old "42 DOIs" did not.

### gitleaks

```
$ gitleaks git --no-banner --redact
INF 93 commits scanned. (2.28 MB in 672ms)
INF no leaks found

$ gitleaks dir dist --no-banner --redact
INF scanned ~40103 bytes (40.10 KB) in 10.3ms
INF no leaks found
```

Both clean — history and the built `dist/`.

### Served smoke test

Built `dist/`, served it with `vite preview`, drove it with Chromium at 1280×800:

```
origin: http://localhost:5201/transposon-genome-ecology/
HTTP status: 200
masthead links: [
  'https://github.com/musharna/transposon-genome-ecology/blob/master/docs/FINDINGS.md',
  'https://github.com/musharna/transposon-genome-ecology' ]
harness status: 200 | noindex: true
CONSOLE ERRORS: none
```

200, zero console errors, both new header links present and absolute, and
`hash-harness.html` still served (guard 7 needs it) but now carrying its `noindex`.

### Fresh-critic pass

One pass, run against the rendered toy (screenshot at 1280×800) and the prose, instructed
to falsify rather than approve, using the three non-waivable classes from the plan. It
reported **9 class-1** (a count or number disagreeing with the tree; one marked minor),
**0 class-2** (missing or broken links), **2 class-3** (unqualified threshold claim).

**Every finding in all three classes is fixed** — the CHANGELOG's "found by the release's
own critic pass" section lists them. Two were **introduced by this release**, and those
are the ones worth naming here:

1. **The stage arithmetic in `web/index.html`.** Adding the masthead turned `#stage` from
   three rows and two gaps into four and three, and left the box-sizing comment proving
   `8 + 368 + 8 + 180 + 8 + 220 + 8 = 800` untouched. Re-measured in a real browser and
   rewritten: `8 + 32 + 8 + 328 + 8 + 180 + 8 + 220 + 8 = 800`, still exact. This is
   precisely the defect class the release exists to remove, committed by the release
   itself.
2. **"51 DOIs across 41 cited entries".** The 41 came from my own segmentation script and
   is provably wrong — it captured 48 of the 51 DOIs, so three belonged to entries it
   never saw. "cited entries" also contradicted the next sentence, which said a cited tool
   was _not_ among the 41. Withdrawn: `REFERENCES.md` now publishes **only** the DOI count,
   with the command that reproduces it, and says why no works count is given.

The critic also independently reproduced from the tree every number this release asserts
and did not falsify any of them: the nine guards, 12-of-17 `TOY_DEFAULTS`, 22 files / 198
tests, 33.7× against 34.7× and which is which, the 51 DOIs, the 003 and 004 grids, and the
headline statistics of all five experiments. Class 2 came back empty — every relative
link, anchor, figure path and cited commit hash in `FINDINGS.md` and `README.md` resolves.

## Found but NOT fixed — for a coordinator ruling

Recorded rather than actioned, each with its reason.

1. **`docs/pre-registrations/2026-09-04-a-band-or-only-a-delay.md:511` carries the same
   "four doublings" arithmetic error that A3 fixed elsewhere.** It reads "a grid whose
   first step above zero was 0.125, four doublings above the real edge". The **direction**
   is right there (0.125 is above 0.016); the **count** is wrong — three doublings, on
   004's own grid (`0.016 → 0.032 → 0.064 → 0.125`, read out of
   `experiments/004-fidelity-band.csv`). Not fixed because the scope allowlist says in
   terms: "You MAY NOT change … any pre-registration." The freeze is the method; silently
   correcting arithmetic inside a registration would cost more than the error does.
2. **`web/controls.ts:435` — the shrink button's caption is not what the button does.**
   It renders `shrinkCaption(params.N)` → "shrink the population (more drift) — N=60",
   while pressing it calls `shrinkTarget(60)` → **30**. The trailing number is the
   _current_ population, not the result. Not fixed: outside the punch list, the label is
   ambiguous rather than false, and a wider caption risks the 1440px column budget this
   release tuned to exactly zero dead space. It deserves its own change.
3. ~~**`CITATION.cff` still reads `version: 1.0.0` / `date-released: 2026-09-10`.**~~
   **RESOLVED at tag time, exactly as this item asked** — bumped to `version: 1.0.1` /
   `date-released: "2026-09-11"` in `5fcb497`, the commit `v1.0.1` points at. The plan's
   instruction to keep `2026-09-10` was scoped to the RC, when no new tag existed yet.
   _(This entry described itself as outstanding inside the very commit that discharged it;
   corrected after the release.)_
4. **`tests/render-panels.test.ts:84` `const FIELD_H = 368;`** mirrors the pre-masthead
   field height (now 328 at 800px). Its comment says the constants are "close to" what the
   page gives each panel, so it is approximate by design, and changing a render test's
   fixture dimensions changes what that test exercises — a behaviour-adjacent edit this
   scope excludes.
5. **The legend's new qualifier sits below the fold at the shipped 1280×800 viewport.**
   `#controls` is `overflow-y: auto`, and `tests/layout.test.ts:243` asserts _as a positive
   control_ that the column overflows at 800px — so this cannot be fixed by shortening
   something else. The correction is less immediately visible than the claim it corrects.
   The same qualifier is above the fold in both `README.md` and `FINDINGS.md`.

## Environment note — why the first suite run was red

The first full `npm test` of this session failed, on the **untouched** tree, before any
edit was made: `tests/layout.test.ts > the page while the genome is flooded` exceeded its
240 000 ms budget waiting for occupancy to pass 0.9, and the whole run took **249 s**
against the **69.16 s** recorded for the same suite on 2026-09-10.

That is the box, not the tree. At the time, `uptime` reported a load average of **20.47**
on 16 cores, with four foreign `python` processes at ~100% CPU, an `R` at 105%, and a
`gpu_dol_multibe` four hours in — none of them this project's. Re-running the identical
file in isolation on the identical tree: **4 passed in 9.96 s**. The failing test is
wall-clock-bounded and vitest runs files in parallel, so under saturation the flooded-page
test loses its budget to its own siblings.

The acceptance runs were therefore submitted through the `jobd` broker rather than run
inline. When the broker's single laptop slot proved to be held continuously by a
higher-priority project, they were run inline instead — but only after the host had gone
quiet, so the measurement would mean something.

**Resolved, and the numbers are worth keeping.** The same suite on the same tree:

| load average | wall time | result            |
| ------------ | --------- | ----------------- |
| 20.47        | 249 s     | 197/198, one FAIL |
| 1.44         | 40.69 s   | **198/198**       |

A 6.1× spread on identical code, with the slow end crossing a hard 240 s timeout. Two
things follow, neither of them about this release:

1. **v1.0.0's recorded "198 tests, all passed (69.16 s)" is not reproducible on a busy
   machine**, and nothing in the suite says so.
2. **`tests/layout.test.ts`'s flooded-page test is wall-clock-bounded at 240 s while
   vitest runs its 22 files in parallel**, so its budget is shared with every sibling and
   with whatever else the host is doing. It is the only test in the suite that can go red
   for reasons that have nothing to do with the model. Making it robust — a generation
   budget rather than a time budget, or serialising that one file — is a real follow-up,
   and it is out of this release's scope because it would change a test's behaviour rather
   than a statement.
