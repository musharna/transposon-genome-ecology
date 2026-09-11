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
