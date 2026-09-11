#!/usr/bin/env bash
#
# Phase 1 of registered question 006, as a jobd launcher.
#
# Phase 1 runs the five in-range `phi` cells at three ratios and ten seeds --
# 150 runs, roughly 005's scale, on the order of sixteen hours. It is run
# UNSHARDED on purpose: sharding by ratio would need a merge step nobody has
# written and a sharded-vs-unsharded invariance check nobody has run, and a
# wrong merge is not detectable from the CSV afterwards.
#
# ⚠️ It OVERWRITES experiments/006-phase1.csv.
#
# The PATH line is not incidental. This repo needs Node >= 22 (`styleText` from
# `node:util`), the system node on this host is v18, and a jobd worker does not
# source an interactive profile -- so without it the job dies at dispatch with a
# SyntaxError from inside rolldown, hours after it was submitted.
set -euo pipefail

export PATH="$HOME/.local/node-22/bin:$PATH"

cd "$(dirname "$0")/.."

echo "host      $(hostname)"
echo "node      $(node -v)"
echo "commit    $(git rev-parse --short HEAD)"
echo "dirty     $(git status --porcelain | wc -l) file(s)"
echo "started   $(date -Is)"
echo

npx tsx experiments/006-is-the-exponent-one.ts --phase 1

echo
echo "finished  $(date -Is)"
wc -l experiments/006-phase1.csv
