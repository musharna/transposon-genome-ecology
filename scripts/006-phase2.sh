#!/usr/bin/env bash
#
# Phase 2 of registered question 006, as a jobd launcher.
#
# Phase 2 runs the out-of-sample `phi` cells (column A 0.001 and, if the column B
# gate passes, column B 0.0005) at three ratios and ten seeds. Its horizons come
# from Phase 1, so experiments/006-phase1.csv must be committed first. The gate
# evaluated on Phase 1's data passes (horizon 70013 <= 75000), so this is 60 runs.
#
# Cost, measured rather than guessed: Phase 1 spent ~8.3 h on 257579 generations
# outside its manipulation checks, ~0.116 s/generation. Phase 2's predicted
# saturation times sum to ~1.1M generations, so ~36 h before accounting for the
# deeper cells carrying more copies per genome. That is too close to the fleet's
# 48 h max_wall, so it is submitted with a longer wall; the idle timeout stays at
# the default, because `runOne`'s heartbeat prints every 1000 generations.
#
# Unsharded for the same reason as Phase 1: runPhase2 has no shard mode, and a
# merge nobody has written is not detectable from the CSV afterwards.
#
# ⚠️ It OVERWRITES experiments/006-phase2.csv.
#
# The PATH line: this repo needs Node >= 22, system node here is v18, and a jobd
# worker does not source an interactive profile.
set -euo pipefail

export PATH="$HOME/.local/node-22/bin:$PATH"

cd "$(dirname "$0")/.."

echo "host      $(hostname)"
echo "node      $(node -v)"
echo "commit    $(git rev-parse --short HEAD)"
echo "dirty     $(git status --porcelain | wc -l) file(s)"
echo "started   $(date -Is)"
echo

npx tsx experiments/006-is-the-exponent-one.ts --phase 2

echo
echo "finished  $(date -Is)"
wc -l experiments/006-phase2.csv
