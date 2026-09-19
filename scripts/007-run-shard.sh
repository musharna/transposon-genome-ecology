#!/usr/bin/env bash
#
# One shard of registered question 007, as a jobd launcher:
#   scripts/007-run-shard.sh <shard>
# Shards: control, named-6005, named-6006, named-6008, fresh-1 .. fresh-4.
#
# Each shard writes experiments/007-shards/<shard>.{runs,series}.csv. When every
# shard is done, `--merge` checks the whole grid and writes the two CSVs the
# registration names; `--analyse` then scores them.
#
# Cost, from 006's Phase 2 (jobd 3757): ~0.094 s/generation on average. A named
# seed that stays controlled runs 239,030 generations, ~6.2 h; a fresh seed that
# saturates stops near 23k. Named shards fail fast at generation 70013 if the
# replay hash does not match 006.
#
# `runOne`'s heartbeat prints every 1000 generations, so the jobd idle watchdog
# never mistakes a working run for a hung one.
#
# The PATH line: this repo needs Node >= 22, system node here is v18, and a jobd
# worker does not source an interactive profile. Check 6 calls the system node,
# which is fine (sim-code-digest.mjs runs on v18).
set -euo pipefail

shard="${1:?usage: scripts/007-run-shard.sh <shard>}"
export PATH="$HOME/.local/node-22/bin:$PATH"

cd "$(dirname "$0")/.."

echo "host      $(hostname)"
echo "node      $(node -v)"
echo "commit    $(git rev-parse --short HEAD)"
echo "dirty     $(git status --porcelain | wc -l) file(s)"
echo "shard     $shard"
echo "started   $(date -Is)"
echo

npx tsx experiments/007-do-the-controlled-seeds-saturate.ts --run "$shard"

echo
echo "finished  $(date -Is)"
