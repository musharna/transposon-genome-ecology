# Registered question 004 — a band, or only a delay?
#
# Pre-specified analysis. Registration:
#   docs/pre-registrations/2026-09-04-a-band-or-only-a-delay.md
# committed ALONE at cec9955 before the runner existed. This script is committed
# WITH the runner and BEFORE any data exists. If this script and the registration
# disagree, the registration is right and this script is a bug.
#
# ⚠️ THIS SCRIPT EVALUATES THE PREDICTIONS, NEVER THE FALSIFICATION CLAUSES.
# That inversion is the specific defect 003's Result records: plot-003.R encoded
# secondary 1's one-sided clause instead of its two-sided prediction and printed
# HELD for a prediction that was false.
#
# ⚠️ EVERY PREDICATE CARRIES POSITIVE **AND** NEGATIVE CONTROLS, ASSERTED BEFORE
# ANY DATA IS READ. A predicate that has never been seen to return FALSE is not
# a predicate, it is a constant.
#
# Usage:  Rscript docs/analysis/plot-004.R
# Run from the repository root.

suppressPackageStartupMessages({
  library(ggplot2)
  library(patchwork)
})
source("docs/analysis/theme.R")

CSV      <- "experiments/004-fidelity-band.csv"
CSV_003  <- "experiments/003-trap-fidelity.csv"
FIG_MAIN <- "docs/analysis/fig-004-band.png"

# ---------------------------------------------------------------------------
# REGISTERED CONSTANTS — restated from the document so the two can be compared.

GRID     <- c(0, 0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.125)
RATIOS   <- c("2.00", "3.33", "5.00")
HORIZONS <- c(600, 1800)
N_SEEDS  <- 10

# Secondary 2's registered prediction: phi* = theta / max|s|, with max|s| from
# 003's phi = 0 cells (18.678, 10.367, 6.211) and theta = 0.10.
PHI_STAR <- c("2.00" = 0.0054, "3.33" = 0.0096, "5.00" = 0.0161)

# Secondary 3: "within a factor of 2 (one grid step)". The grid is log2, so one
# grid step IS a factor of 2; the constant is written once and named.
SPREAD_TOL <- 2

# ---------------------------------------------------------------------------
# PREDICATES. Controls first, before the data file is even opened.

#' The cell's outcome is the MODAL class over its seeds; ties are reported as
#' ties and are NOT resolved in favour of either neighbour.
modal_class <- function(v) {
  tb <- table(factor(v, levels = c("EXTINCT", "CONTROLLED", "RUNAWAY")))
  top <- names(tb)[tb == max(tb)]
  if (length(top) > 1) "TIE" else top
}
stopifnot(modal_class(c("CONTROLLED", "CONTROLLED", "RUNAWAY")) == "CONTROLLED")
stopifnot(modal_class(c("RUNAWAY", "RUNAWAY", "CONTROLLED")) == "RUNAWAY")
stopifnot(modal_class(rep("EXTINCT", 3)) == "EXTINCT")
# The negative control that matters: a tie must NOT silently pick a winner.
stopifnot(modal_class(c("CONTROLLED", "RUNAWAY")) == "TIE")

#' The edge: the largest grid phi whose cell is CONTROLLED, or 0 if none is.
edge_of <- function(phi, cls) {
  ok <- phi[cls == "CONTROLLED"]
  if (length(ok) == 0) 0 else max(ok)
}
stopifnot(edge_of(c(0, 0.001, 0.002), c("CONTROLLED", "CONTROLLED", "RUNAWAY")) == 0.001)
stopifnot(edge_of(c(0, 0.001), c("CONTROLLED", "RUNAWAY")) == 0)
stopifnot(edge_of(c(0, 0.001), c("RUNAWAY", "RUNAWAY")) == 0)
# Re-entrant control: the edge is the LARGEST controlled phi by definition, even
# when the CONTROLLED set is not contiguous. Reported separately as a surprise.
stopifnot(edge_of(c(0, 0.001, 0.002, 0.004),
                  c("CONTROLLED", "RUNAWAY", "RUNAWAY", "CONTROLLED")) == 0.004)

#' PRIMARY: at this ratio, is at least one phi > 0 CONTROLLED?
band_nonempty <- function(phi, cls) any(cls == "CONTROLLED" & phi > 0)
stopifnot(band_nonempty(c(0, 0.001), c("CONTROLLED", "CONTROLLED")))
stopifnot(band_nonempty(c(0, 0.001, 0.002), c("RUNAWAY", "RUNAWAY", "CONTROLLED")))
stopifnot(!band_nonempty(c(0, 0.001), c("CONTROLLED", "RUNAWAY")))
stopifnot(!band_nonempty(c(0, 0.001), c("RUNAWAY", "RUNAWAY")))
# ⚠️ THE CONTROL THAT DEFINES THE QUESTION. A CONTROLLED set of exactly {0} is
# 003's result on its coarse grid, and it is NOT a band. If this assertion ever
# fails, the primary has been coded to hold on the outcome it exists to exclude.
stopifnot(!band_nonempty(0, "CONTROLLED"))

#' The edge interval: half-open, from the edge to the next grid point above it.
edge_interval <- function(edge, grid = GRID) {
  above <- grid[grid > edge]
  c(lo = edge, hi = if (length(above) == 0) Inf else min(above))
}
stopifnot(all(edge_interval(0) == c(lo = 0, hi = 0.001)))
stopifnot(all(edge_interval(0.008) == c(lo = 0.008, hi = 0.016)))
stopifnot(is.infinite(edge_interval(0.125)[["hi"]]))

#' Half-open containment: lo < x <= hi.
interval_contains <- function(iv, x) unname(x > iv[["lo"]] & x <= iv[["hi"]])
stopifnot(interval_contains(c(lo = 0.008, hi = 0.016), 0.0096))
stopifnot(interval_contains(c(lo = 0.008, hi = 0.016), 0.016))   # closed above
stopifnot(!interval_contains(c(lo = 0.008, hi = 0.016), 0.008))  # open below
stopifnot(!interval_contains(c(lo = 0.008, hi = 0.016), 0.02))
# Ratio 5.00's registered weakness, made mechanical: phi* = 0.0161 sits a hair
# above the grid point 0.016, so it falls in (0.016, 0.032], not in (0.008,0.016].
stopifnot(interval_contains(c(lo = 0.016, hi = 0.032), 0.0161))
stopifnot(!interval_contains(c(lo = 0.008, hi = 0.016), 0.0161))

#' SECONDARY 3: do these values agree to within `tol`?
#' ⚠️ RETURNS NA, NOT FALSE, WHEN THE INPUT IS DEGENERATE. An edge of 0 makes
#' ratio/edge infinite, and reporting that as "spread exceeded" would be a
#' verdict about the primary failing, not about this prediction. The registered
#' evaluability precondition, made mechanical.
spread_within <- function(v, tol = SPREAD_TOL) {
  if (length(v) == 0 || any(!is.finite(v)) || any(v <= 0)) return(NA)
  (max(v) / min(v)) <= tol
}
stopifnot(isTRUE(spread_within(c(310.6, 345.6, 373.6))))
stopifnot(isFALSE(spread_within(c(100, 300))))
stopifnot(is.na(spread_within(c(100, Inf))))
stopifnot(is.na(spread_within(c(100, 0))))
stopifnot(is.na(spread_within(numeric(0))))

#' Is the CONTROLLED set a contiguous down-set from phi = 0? Not registered for
#' 004 (it was 003's primary); reported because re-entrant control would be a
#' surprise worth naming rather than averaging away.
is_down_set <- function(phi, cls) {
  o <- order(phi)
  c2 <- (cls[o] == "CONTROLLED")
  if (!any(c2)) return(TRUE)
  all(c2[seq_len(max(which(c2)))])
}
stopifnot(is_down_set(c(0, 0.001, 0.002), c("CONTROLLED", "CONTROLLED", "RUNAWAY")))
stopifnot(is_down_set(c(0, 0.001), c("RUNAWAY", "RUNAWAY")))
stopifnot(!is_down_set(c(0, 0.001, 0.002), c("CONTROLLED", "RUNAWAY", "CONTROLLED")))

#' Wilson score interval. Reported instead of a p-value: the predictions are
#' structural claims about a grid, following 002 and 003.
wilson <- function(k, n, z = 1.96) {
  if (n == 0) return(c(lo = NA_real_, hi = NA_real_))
  p <- k / n
  d <- 1 + z^2 / n
  c(lo = max(0, ((p + z^2 / (2 * n)) - z * sqrt(p * (1 - p) / n + z^2 / (4 * n^2))) / d),
    hi = min(1, ((p + z^2 / (2 * n)) + z * sqrt(p * (1 - p) / n + z^2 / (4 * n^2))) / d))
}
stopifnot(all(wilson(10, 10) > c(0.6, 0.99)))
stopifnot(wilson(0, 10)[["lo"]] == 0)
stopifnot(wilson(5, 10)[["lo"]] < 0.5 && wilson(5, 10)[["hi"]] > 0.5)

cat("all predicate controls passed\n\n")
# ---------------------------------------------------------------------------
# DATA

if (!file.exists(CSV)) {
  stop(sprintf("%s does not exist. Run:\n  node node_modules/tsx/dist/cli.mjs experiments/004-fidelity-band.ts", CSV))
}
d <- read.csv(CSV, colClasses = c(ratio = "character"), stringsAsFactors = FALSE)

# POSITIVE CONTROLS ON THE DATA, asserted before anything is computed from it.
# A grid that is not the registered grid would make every verdict below a
# statement about a different experiment.
stopifnot(setequal(unique(d$phi), GRID))
stopifnot(setequal(unique(d$ratio), RATIOS))
stopifnot(all(d$horizon == 1800))
stopifnot(nrow(d) == length(RATIOS) * length(GRID) * N_SEEDS)
# The 600-record and the final record must be different questions somewhere, or
# the dual-horizon design collapsed into one horizon and secondary 1 is vacuous.
stopifnot(any(d$outcome_600 != d$outcome))

# The exact ratio, from the run's own parameters rather than the rounded label:
# "3.33" is 10/3, and secondary 3 divides by this.
ratio_exact <- vapply(RATIOS, function(r) {
  v <- unique(d$theta[d$ratio == r] / d$sigma_s[d$ratio == r])
  stopifnot(length(v) == 1)
  v
}, numeric(1))

# ---------------------------------------------------------------------------
# THE POST-HOC POWER LAW, FITTED HERE RATHER THAN QUOTED.
#
# ⚠️ The numbers that decide how claim (c) reads -- "the post-hoc edges move
# 1.4x", "miss by 1.8x to 3.8x", "the spread is 1.74x and HOLDS" (cut 7 s literals)
# -- were typed literals in cut 7, with no estimator anywhere in this script.
# They are the numbers that turn SECONDARY 3 from FALSIFIED into NOT RESOLVED.
# Under this script's own doctrine they are computed and asserted.
sat <- d[!is.na(d$saturation_generation), ]
PL <- t(vapply(RATIOS, function(r) {
  z <- aggregate(saturation_generation ~ phi, data = sat[sat$ratio == r, ], FUN = mean)
  m <- stats::lm(log(saturation_generation) ~ log(phi), data = z)
  c(a = -unname(coef(m)[2]), C = unname(exp(coef(m)[1])), n = nrow(z),
    r2 = summary(m)$r.squared)
}, numeric(4)))
# The registration records a = 0.730 / 0.736 / 0.745 and R^2 ~ 0.994. If this
# ever drifts, every post-hoc number below is stale and the figure must not ship.
stopifnot(abs(PL[, "a"] - c(0.730, 0.736, 0.745)) < 0.005, PL[, "r2"] > 0.99,
          PL[, "n"] == 5)
pl_edge <- function(r, T) unname((PL[r, "C"] / T)^(1 / PL[r, "a"]))
PL600  <- vapply(RATIOS, pl_edge, numeric(1), T = 600)
PL_SPREAD_EDGE <- max(PL600) / min(PL600)                 # "the edges move 1.4x"
PL_K     <- ratio_exact[RATIOS] / PL600
PL_SPREAD_K <- max(PL_K) / min(PL_K)                      # the secondary-3 spread
PL_MISS  <- PL600 / PHI_STAR[RATIOS]                      # "miss by 1.8x to 3.8x"
# ⚠️ NOT `stopifnot(PL_SPREAD_K <= SPREAD_TOL)`. That was cut 8's form, and it
# ABORTS THE SCRIPT ON THE ONE OUTCOME THAT WOULD CHANGE THE FIGURE'S MESSAGE --
# an assertion that can only pass if the desired conclusion holds is not a check,
# it is a ratchet. These are computed and the text branches on them.
PL_S3_WORD   <- if (PL_SPREAD_K   <= SPREAD_TOL) "HOLDS" else "ALSO FAILS"
PL_MISS_WORD <- if (all(PL_MISS > 1)) "ALL THREE phi* miss" else "not all phi* miss"
cat(sprintf("post-hoc fit: a = %s; edges@600 = %s (spread %.2fx); K spread %.2fx -> %s; misses %.1fx-%.1fx\n",
            paste(sprintf("%.3f", PL[, "a"]), collapse = " / "),
            paste(sprintf("%.5f", PL600), collapse = " / "),
            PL_SPREAD_EDGE, PL_SPREAD_K, PL_S3_WORD, min(PL_MISS), max(PL_MISS)))
# M6: the same estimator applied to BOTH horizons, so claim (b)'s magnitude is
# not a point value quoted against bracketed edges.
PL1800 <- vapply(RATIOS, pl_edge, numeric(1), T = 1800)
PL_SHRINK <- PL600 / PL1800

cells <- do.call(rbind, lapply(HORIZONS, function(h) {
  col <- if (h == 600) "outcome_600" else "outcome"
  do.call(rbind, lapply(RATIOS, function(r) {
    do.call(rbind, lapply(GRID, function(p) {
      v <- d[[col]][d$ratio == r & d$phi == p]
      stopifnot(length(v) == N_SEEDS)
      w <- wilson(sum(v == "CONTROLLED"), length(v))
      data.frame(
        horizon = h, ratio = r, phi = p, n = length(v),
        n_controlled = sum(v == "CONTROLLED"),
        n_runaway    = sum(v == "RUNAWAY"),
        n_extinct    = sum(v == "EXTINCT"),
        frac = mean(v == "CONTROLLED"),
        lo = w[["lo"]], hi = w[["hi"]],
        cls = modal_class(v), stringsAsFactors = FALSE
      )
    }))
  }))
}))

edge_at <- function(h, r) {
  s <- cells[cells$horizon == h & cells$ratio == r, ]
  edge_of(s$phi, s$cls)
}
edges <- expand.grid(horizon = HORIZONS, ratio = RATIOS, stringsAsFactors = FALSE)
edges$edge <- mapply(edge_at, edges$horizon, edges$ratio)

# ---------------------------------------------------------------------------
# THE REGISTERED PREDICTIONS. Counts with denominators, no p-value.

cat("=== CELL TABLE (CONTROLLED / RUNAWAY / EXTINCT out of", N_SEEDS, "seeds) ===\n")
for (h in HORIZONS) {
  cat(sprintf("\n-- horizon %d --\n", h))
  cat(sprintf("%-8s", "ratio"), sprintf("%9s", format(GRID)), "\n")
  for (r in RATIOS) {
    s <- cells[cells$horizon == h & cells$ratio == r, ]
    s <- s[match(GRID, s$phi), ]
    cat(sprintf("%-8s", r),
        sprintf("%9s", sprintf("%dC/%dR/%dE", s$n_controlled, s$n_runaway, s$n_extinct)), "\n")
    cat(sprintf("%-8s", ""),
        sprintf("%9s", sprintf("%.2f-%.2f", s$lo, s$hi)), " Wilson 95%\n")
  }
}

cat("\n=== EDGES ===\n")
for (r in RATIOS) {
  e6 <- edges$edge[edges$horizon == 600 & edges$ratio == r]
  e18 <- edges$edge[edges$horizon == 1800 & edges$ratio == r]
  iv <- edge_interval(e6)
  cat(sprintf("  ratio %-5s  edge@600 = %-7g (interval (%g, %g])  edge@1800 = %-7g  phi* = %g\n",
              r, e6, iv[["lo"]], iv[["hi"]], e18, PHI_STAR[[r]]))
}

# ---- PRIMARY -------------------------------------------------------------
prim <- vapply(RATIOS, function(r) {
  s <- cells[cells$horizon == 600 & cells$ratio == r, ]
  band_nonempty(s$phi, s$cls)
}, logical(1))
names(prim) <- RATIOS

cat("\n=== PRIMARY — the band is non-empty ===\n")
cat("   prediction: at EVERY registered ratio, at horizon 600, at least one phi > 0 is CONTROLLED\n")
for (r in RATIOS) cat(sprintf("   ratio %-5s : %s\n", r, if (prim[[r]]) "band present" else "NO phi > 0 controlled"))
cat(sprintf("   VERDICT: %s\n", if (all(prim)) "HELD" else "FALSIFIED"))
if (!all(prim)) {
  cat("   -> control requires exact tracking on a grid reaching 0.001; 003's result stands\n")
  cat("      as written rather than as provisional, and spec 3.3's third claim should be withdrawn.\n")
}

# ⚠️ THE REGISTERED EVALUABILITY PRECONDITION. Every secondary is stated on the
# EDGE, and where the primary fails the edge is 0 — which would make secondary 1
# compare 0 against 0, secondary 2's interval (0, 0.001] contain no phi*, and
# secondary 3 divide by zero. Three FALSIFIED verdicts, none of them a test of
# anything. Secondaries are scored ONLY at ratios where the primary holds.
evaluable <- RATIOS[prim]
not_evaluable <- RATIOS[!prim]
if (length(not_evaluable) > 0) {
  cat(sprintf("\n   ⚠️ NOT EVALUABLE at ratio(s) %s — the primary fails there, so every\n",
              paste(not_evaluable, collapse = ", ")))
  cat("      secondary below has no domain at those ratios. Registered in advance.\n")
}

verdict <- function(name, statement, per_ratio) {
  cat(sprintf("\n=== %s ===\n   prediction: %s\n", name, statement))
  if (length(evaluable) == 0) {
    cat("   VERDICT: NOT EVALUABLE at any ratio (the primary failed everywhere)\n")
    return(invisible("NOT EVALUABLE"))
  }
  for (r in evaluable) cat(sprintf("   ratio %-5s : %s\n", r, per_ratio[[r]]$note))
  ok <- vapply(evaluable, function(r) isTRUE(per_ratio[[r]]$ok), logical(1))
  v <- if (all(ok)) "HELD" else "FALSIFIED"
  cat(sprintf("   VERDICT: %s (evaluated on ratio(s) %s%s)\n", v,
              paste(evaluable, collapse = ", "),
              if (length(not_evaluable)) sprintf("; NOT EVALUABLE on %s", paste(not_evaluable, collapse = ", ")) else ""))
  invisible(v)
}

# ---- SECONDARY 1 — the band is a delay -----------------------------------
s1 <- lapply(RATIOS, function(r) {
  e6  <- edges$edge[edges$horizon == 600  & edges$ratio == r]
  e18 <- edges$edge[edges$horizon == 1800 & edges$ratio == r]
  list(ok = e18 < e6,
       note = sprintf("edge %g at 1800 vs %g at 600 -> %s", e18, e6,
                      if (e18 < e6) "shrank" else "did NOT shrink"))
})
names(s1) <- RATIOS
v1 <- verdict("SECONDARY 1 — the band is a delay, not a band",
              "at EVERY registered ratio the edge at horizon 1800 is STRICTLY SMALLER than at 600", s1)

# ---- SECONDARY 2 — the edge sits where the reach meets the walk -----------
s2 <- lapply(RATIOS, function(r) {
  iv <- edge_interval(edges$edge[edges$horizon == 600 & edges$ratio == r])
  hit <- interval_contains(iv, PHI_STAR[[r]])
  list(ok = hit,
       note = sprintf("phi* = %g %s edge interval (%g, %g]", PHI_STAR[[r]],
                      if (hit) "IS IN" else "is NOT in", iv[["lo"]], iv[["hi"]]))
})
names(s2) <- RATIOS
v2 <- verdict("SECONDARY 2 — the edge is at theta / max abs(s)",
              "at EVERY registered ratio the horizon-600 edge interval CONTAINS phi*", s2)

# ---- SECONDARY 3 — phi is nearly a third name for the same axis -----------
k_of <- function(r) {
  e6 <- edges$edge[edges$horizon == 600 & edges$ratio == r]
  if (e6 <= 0) Inf else ratio_exact[[r]] / e6
}
ks <- vapply(evaluable, k_of, numeric(1))
cat("\n=== SECONDARY 3 — the boundary is at near-constant ratio/phi ===\n")
cat("   prediction: the three values of (theta/sigmaS)/phi_edge agree within a factor of", SPREAD_TOL, "\n")
cat("   NOTE: this REVERSES 003's secondary 2, and was labelled in advance as the\n")
cat("         least risky of the four. Predicted K = max abs(s)/sigmaS = 373.6, 345.6, 310.6.\n")
if (length(ks) == 0) {
  cat("   VERDICT: NOT EVALUABLE at any ratio\n"); v3 <- "NOT EVALUABLE"
} else {
  for (r in evaluable) cat(sprintf("   ratio %-5s : ratio/phi_edge = %.1f\n", r, k_of(r)))
  sw <- spread_within(ks)
  v3 <- if (is.na(sw)) "NOT EVALUABLE" else if (sw) "HELD" else "FALSIFIED"
  cat(sprintf("   spread = %s\n", if (all(is.finite(ks)) && min(ks) > 0) sprintf("%.2fx", max(ks)/min(ks)) else "undefined"))
  cat(sprintf("   VERDICT: %s (evaluated on ratio(s) %s)\n", v3, paste(evaluable, collapse = ", ")))
}

# ---- DESCRIPTIVE, NOT REGISTERED -----------------------------------------
cat("\n=== NOT REGISTERED, reported because it would be a surprise ===\n")
for (h in HORIZONS) for (r in RATIOS) {
  s <- cells[cells$horizon == h & cells$ratio == r, ]
  if (!is_down_set(s$phi, s$cls)) {
    cat(sprintf("   ⚠️ horizon %d ratio %s: the CONTROLLED set is NOT a contiguous down-set (re-entrant control)\n", h, r))
  }
}
ties <- cells[cells$cls == "TIE", ]
if (nrow(ties) > 0) {
  cat(sprintf("   %d cell(s) tied and are NOT resolved in favour of either neighbour:\n", nrow(ties)))
  for (i in seq_len(nrow(ties))) {
    cat(sprintf("     horizon %d ratio %s phi %g: %dC/%dR/%dE\n", ties$horizon[i], ties$ratio[i],
                ties$phi[i], ties$n_controlled[i], ties$n_runaway[i], ties$n_extinct[i]))
  }
} else cat("   no tied cells\n")

# ---------------------------------------------------------------------------
# THE FIGURE
#
# ⚠️ TENTH CUT. Nine independent adversarial critics, nine NO-GO verdicts. The
# full round-by-round table is in the registration's Result; the items that
# recurred, and the controls now standing against them, are below. None of it
# was visible to the author.
#
#  1. Cut 1 marked only the FALSIFIED predictions, never the observed edge -- and
#     one prediction fell 2 px from the true edge, so the panel read as partial
#     confirmation of a prediction reported as refuted.
#  2. Cut 2's multiplicative x-dodge MANUFACTURED ratio-ordered edge separation in
#     the predicted direction, from data with zero between-ratio variation.
#  3. Cut 3 claimed "byte-identical outcomes", which is FALSE and threw away the
#     best evidence: only the CLASSIFICATION is identical.
#  4. Cut 4 PRINTED AN ARITHMETIC A READER CAN CHECK AND FIND WRONG. It labelled
#     each prediction with 004's own max|s| (61.3 / 35.7 / 22.6) while saying
#     phi* is computed from max|s| -- but 0.10/61.3 = 0.00163, not the 0.0054
#     printed beside it. phi* was computed from 003's max|s| AT 600 GENERATIONS
#     (18.678 / 10.367 / 6.211), numbers cut 4 never showed. On a figure whose
#     whole premise is auditable pre-registration, an arithmetic claim that fails
#     in five seconds discredits everything else on the panel. The two quantities
#     are now printed SEPARATELY and each is labelled with its horizon.
#     Cut 4 also showed only ONE of the four registered verdicts -- the one that
#     reads as failure -- and clipped its own caption mid-word.
#
# ⚠️ ONE PRE-REGISTERED PLOTTING DECISION, KEPT THROUGHOUT. phi = 0 is drawn in
# its own panel, never at a small positive position on the log axis.
# No plotmath: 003's expression(theta/sigma[S]) rendered "/" as division layout.

X_LEFT  <- 0.00072
X_RIGHT <- 0.135
Y_LO <- -0.58
Y_HI <- 1.12
ROW  <- c("2.00" = -0.150, "3.33" = -0.310, "5.00" = -0.470)
BAR  <- 0.013          # half-height of a strip bar
OFF  <- 0.026          # observed sits this far above predicted, WITHIN a row
# ⚠️ THE GAP IS 2*(OFF - BAR), NOT 2*OFF. Cut 7's comment measured centre-to-
# centre and reported 0.052 while the drawn gap was 0.002 -- one pixel -- so the
# paired bars fused into a single two-tone object and the guard against cut 5's
# defect was measuring the wrong quantity. Now 2*(0.026-0.013) = 0.026 within a
# row against 0.160 between rows.

# ⚠️ ASSERTED, NOT ASSUMED: one curve is honest only if the CLASSIFICATIONS are
# identical across ratios. The figure refuses to render otherwise.
ident <- do.call(rbind, lapply(HORIZONS, function(h) {
  do.call(rbind, lapply(GRID, function(ph) {
    v <- cells$n_controlled[cells$horizon == h & cells$phi == ph]
    stopifnot(length(v) == length(RATIOS))
    data.frame(horizon = h, phi = ph, k = v[1], agree = length(unique(v)) == 1)
  }))
}))
stopifnot(all(ident$agree), all(ident$k %in% c(0, N_SEEDS)))
cat(sprintf("figure precondition: %d cells agree on class across ratios and are unanimous\n",
            nrow(ident) * length(RATIOS)))

# THE TWO max|s| VALUES ARE DIFFERENT QUANTITIES AND ARE KEPT APART.
#  - WALK_003: 003's phi = 0 cells at 600 generations. phi* was computed FROM
#    these, so these are the ones whose division must check out on the figure.
#  - walk_004: this experiment's own phi = 0 cells at 1800 generations.
# ⚠️ DERIVED FROM 003's OWN CSV AND ASSERTED. The rendered note used to say
# "003's grid started at phi = 0.125", which is FALSE -- 003's grid was
# {0, 0.125, 0.25, ...}: it sampled phi = 0 and was 30/30 CONTROLLED there, which
# is its entire positive result and is plotted in this figure's left panel. The
# true statement is about its smallest POSITIVE phi, and the word was dropped.
g003 <- sort(unique(read.csv(CSV_003)$phi))
P003_MIN_POS <- min(g003[g003 > 0])
stopifnot(0 %in% g003, P003_MIN_POS == 0.125)
P003_NOTE <- sprintf(paste0("003 sampled phi = 0 (the left panel, 30/30 controlled)\n",
                            "and then nothing until phi = %s (dashed).\n",
                            "The whole band found here lives in that gap."),
                     format(P003_MIN_POS, scientific = FALSE, trim = TRUE))
WALK_003 <- c("2.00" = 18.678, "3.33" = 10.367, "5.00" = 6.211)
walk_004 <- vapply(RATIOS, function(r) mean(d$max_abs_entry[d$ratio == r & d$phi == 0]), numeric(1))
stopifnot(all(abs(0.10 / WALK_003[RATIOS] - PHI_STAR[RATIOS]) < 5e-5))   # the printed arithmetic

ident$horizon_lab <- factor(sprintf("%d generations\n(same 10 runs)", ident$horizon),
                            levels = sprintf("%d generations\n(same 10 runs)", HORIZONS))
ident$frac <- ident$k / N_SEEDS
ident$count <- sprintf("%d/%d", ident$k, N_SEEDS)
HL <- levels(ident$horizon_lab)
zero <- ident[ident$phi == 0, ]
stopifnot(all(zero$k == N_SEEDS))   # claim (a)'s baseline, asserted not assumed
pos  <- ident[ident$phi > 0, ]

region <- do.call(rbind, lapply(seq_along(HORIZONS), function(j) {
  e <- unique(edges$edge[edges$horizon == HORIZONS[j]]); stopifnot(length(e) == 1)
  iv <- edge_interval(e)
  data.frame(horizon_lab = factor(HL[j], levels = HL),
             edge = e, slo = iv[["lo"]], shi = iv[["hi"]])
}))
iv600 <- edge_interval(region$edge[region$horizon_lab == HL[1]])

pred <- data.frame(
  ratio = factor(RATIOS, levels = RATIOS),
  phi_star = as.numeric(PHI_STAR[RATIOS]),
  w003 = as.numeric(WALK_003[RATIOS]),
  w004 = as.numeric(walk_004[RATIOS]),
  y = as.numeric(ROW[RATIOS]),
  horizon_lab = factor(HL[1], levels = HL)
)
pred$plo    <- vapply(pred$phi_star, function(x) max(GRID[GRID < x]), numeric(1))
pred$phi_hi <- vapply(pred$phi_star, function(x) min(GRID[GRID >= x]), numeric(1))
pred$hit    <- factor(vapply(pred$phi_star, function(x) interval_contains(iv600, x), logical(1)))
pred$olo <- iv600[["lo"]]; pred$ohi <- iv600[["hi"]]
# The arithmetic, printed so it can be checked: theta / (003's max|s|) = phi*.
pred$left <- sprintf("ratio %s:  phi* = 0.10 / %.3f ~= %s",
                     pred$ratio, pred$w003,
                     format(pred$phi_star, scientific = FALSE, trim = TRUE))
pred$right <- ifelse(pred$hit == "TRUE",
                     sprintf("same cell - by %.1f%%; but misses the post-hoc edge by %.1fx",
                             100 * (pred$phi_star / iv600[["lo"]] - 1),
                             PL_MISS[as.character(pred$ratio)]),
                     sprintf("a DIFFERENT cell - %.1fx below the observed edge",
                             iv600[["lo"]] / pred$phi_star))
# Distinct border linetypes: the fills are 1.00:1 under deuteranopia.
# PLINE removed: a 1-on/1-off border on a 6 px rect consumed both long edges,
# so ratio 5.00 rendered as a dotted rule beside two solid slabs -- the third
# channel through which the landing prediction kept being de-weighted.

# ⚠️ BUILT FROM THE COMPUTED VERDICTS, NOT RETYPED. Cut 6 hard-coded these
# strings and "guarded" them with `stopifnot(nrow(verdicts) == length(verdicts$lab))`,
# which is TRUE for every data.frame that has ever existed -- A CHECK THAT CANNOT
# FAIL, added while fixing another defect. Values now come from `prim`, `v1`,
# `v2`, `v3` and `region$edge`, and are asserted against them.
pv <- if (all(prim)) "HELD" else "FALSIFIED"
e600  <- region$edge[region$horizon_lab == HL[1]]
e1800 <- region$edge[region$horizon_lab == HL[2]]
# ⚠️ The four `%in%` membership tests cut 8 had here were exhaustive over the
# codomain of the expressions that produced them, and `e600 > e1800` asserted
# secondary 1's own verdict -- the script could only ever render a figure in
# which it held. Both classes removed; the cross-checks below do the work.
fmt <- function(x) format(x, scientific = FALSE, trim = TRUE)
vlab <- c(
  sprintf("PRIMARY:      %-10s- control does exist above phi = 0, up to %s at 600 generations", pv, fmt(e600)),
  sprintf("SECONDARY 1:  %-10s- the edge falls to %s by 1800 generations; the post-hoc power law", v1, fmt(e1800)),
  sprintf("                           puts that shrink at %.1fx to %.1fx. It shrinks with the horizon.", min(PL_SHRINK), max(PL_SHRINK)),
  sprintf("SECONDARY 2:  %-10s- it named three different cells; the observed edge is one cell. On the", v2),
  sprintf("                           post-hoc power-law edges %s, by %.1fx to %.1fx, so THIS", PL_MISS_WORD, min(PL_MISS), max(PL_MISS)),
  "                           falsification is the robust one.",
  sprintf("SECONDARY 3:  %-9s* - as registered: ratio/phi_edge spans 2.50x, tolerance was 2x. BUT phi_edge", v3),
  "                           is ONE grid point at all three ratios, so 2.50x is exactly theta/sigmaS's",
  "                           own spread (5.00/2.00) and measures nothing; and the grid brackets the edge",
  "                           to a factor of 2, the same size as the tolerance. On the post-hoc power-law",
  sprintf("                           edges the spread is %.2fx and it %s.  * NOT RESOLVED BY THIS EXPERIMENT.", PL_SPREAD_K, PL_S3_WORD),
  "",
  "NOTE: SECONDARY 2 and SECONDARY 3 are not independent. K_obs/K_pred = phi*/phi_edge exactly,",
  "      so they are one test in two framings, and the ratio-5.00 near-hit in both is ONE fact.")
# ⚠️ ALL FOUR RE-DERIVED FROM THE RAW CSV. Cut 9's versions re-executed the same
# expressions on the same `cells` object -- `chk_prim` was literally the body of
# `band_nonempty`, `chk_s1`/`chk_s2` called the `edge_at` that had built `edges`.
# A reviewer DEMONSTRATED they cannot fail: injecting a wrong class into `cells`
# let the script run to completion with all four guards green, a different green
# extent, and a DIFFERENT prediction "landing" -- a different answer to the
# question, silently. The failure mode is a wrong `cells`, which only a route
# that never touches `cells` can catch.
raw <- read.csv(CSV, colClasses = c(ratio = "character"), stringsAsFactors = FALSE)
raw_edge <- function(r, col) {
  ph <- sort(unique(raw$phi))
  ok <- ph[vapply(ph, function(x) {
    v <- raw[[col]][raw$ratio == r & raw$phi == x]
    sum(v == "CONTROLLED") > length(v) / 2
  }, logical(1))]
  if (length(ok) == 0) 0 else max(ok)
}
raw_band <- function(r) {
  ph <- sort(unique(raw$phi)); ph <- ph[ph > 0]
  any(vapply(ph, function(x) {
    v <- raw$outcome_600[raw$ratio == r & raw$phi == x]
    sum(v == "CONTROLLED") > length(v) / 2
  }, logical(1)))
}
chk_prim <- all(vapply(RATIOS, raw_band, logical(1)))
chk_s1 <- all(vapply(RATIOS, function(r) raw_edge(r, "outcome") < raw_edge(r, "outcome_600"), logical(1)))
chk_s2 <- all(vapply(RATIOS, function(r)
  interval_contains(edge_interval(raw_edge(r, "outcome_600")), PHI_STAR[[r]]), logical(1)))
raw_k  <- vapply(RATIOS, function(r) (raw$theta[raw$ratio == r][1] /
                   raw$sigma_s[raw$ratio == r][1]) / raw_edge(r, "outcome_600"), numeric(1))
chk_s3 <- (max(raw_k) / min(raw_k)) <= SPREAD_TOL
# And the rendered edges themselves, not just the verdict words.
stopifnot(e600 == raw_edge(RATIOS[1], "outcome_600"), e1800 == raw_edge(RATIOS[1], "outcome"),
          pv == if (chk_prim) "HELD" else "FALSIFIED",
          v1 == if (chk_s1)  "HELD" else "FALSIFIED",
          v2 == if (chk_s2)  "HELD" else "FALSIFIED",
          v3 == if (chk_s3)  "HELD" else "FALSIFIED")
verdicts <- data.frame(
  horizon_lab = factor(HL[2], levels = HL),
  y = seq(0.985, by = -0.0555, length.out = length(vlab)),
  lab = vlab)

INK <- "#2f3640"; GREEN <- "#739873"
# ⚠️ ASSERTED, NOT COMMENTED. Three successive cuts wrote a contrast figure into
# a comment and two of them were wrong (#cfe0cf claimed fixed at 1.38:1;
# #8fae8f commented "3.0:1", actually 2.44:1).
stopifnot(contrast_ratio(GREEN) >= WCAG_NONTEXT_FLOOR)

common <- list(
  scale_y_continuous(breaks = c(0, 0.5, 1), labels = c("0", "0.5", "1")),
  coord_cartesian(ylim = c(Y_LO, Y_HI)),
  theme_tge())

p_zero <- ggplot(zero, aes(x = "0", y = frac)) +
  # ⚠️ DATA-DRIVEN, not annotate(). As a constant this rect was drawn at full
  # height in both facets whatever the phi = 0 cells said -- the baseline for
  # claim (a), painted by something that could not disagree with the data.
  geom_rect(data = zero, inherit.aes = FALSE,
            aes(xmin = -Inf, xmax = Inf, ymin = 0, ymax = frac),
            fill = GREEN, colour = "grey55", linewidth = 0.3) +
  geom_point(size = 2.8, colour = INK) +
  geom_text(aes(label = count), vjust = -1.2, size = 2.7, colour = INK) +
  facet_grid(horizon_lab ~ .) + common +
  labs(x = "phi = 0\n(exact)", y = "fraction of 10 seeds CONTROLLED") +
  theme(strip.text.y = element_blank(), plot.margin = margin(5, 1, 5, 5))

p_pos <- ggplot(pos, aes(x = phi, y = frac)) +
  geom_rect(data = region, inherit.aes = FALSE,
            aes(xmin = X_LEFT, xmax = edge, ymin = 0, ymax = 1),
            fill = GREEN, colour = "grey55", linewidth = 0.3) +
  # ⚠️ ymax MUST STAY BELOW 1. At ymax = 1 this rect's top edge drew a dashed
  # line at fraction 1.0 across the bracketed interval, butted onto the end of
  # the solid 10/10 line -- reading as "still controlled, just less certain"
  # across a span whose right end is measured 0/10. That is the SAME assertion
  # geom_step was removed for making; the defect returned in a different geom.
  geom_rect(data = region, inherit.aes = FALSE,
            aes(xmin = slo, xmax = shi, ymin = 0.14, ymax = 0.90),
            fill = NA, colour = "grey40", linetype = "22", linewidth = 0.4) +
  geom_text(data = region, inherit.aes = FALSE, size = 2.5, colour = "grey30",
            aes(x = sqrt(slo * shi), y = 1.08, label = "edge is\nin here"), lineheight = 0.95) +
  # Claim (a) is only news against 003's grid, whose smallest positive phi was
  # 0.125 -- the RIGHT-HAND END of this axis. Without it on the canvas a reader
  # cannot see why "control above phi = 0" is a new result.
  # ⚠️ xintercept AS AN AESTHETIC, not a parameter: passed as a parameter it is a
  # constant and ggplot draws it in EVERY facet, so it ran through the verdict
  # block in the other row.
  # ⚠️ A SEGMENT, NOT A VLINE. As a full-height vline this struck through the
  # 0/10 count label at 0.125. Cut 8 "fixed" that with a white mask whose
  # xmax = 0.139 sat outside scale_x_log10(limits = c(X_LEFT, 0.135)), so the
  # scale CENSORED IT TO NA AND GGPLOT DROPPED THE LAYER WITHOUT A WARNING --
  # a fix that never once rendered, under a comment asserting it had. Bounding
  # the line so it cannot reach the label needs no mask.
  geom_segment(data = region[1, ], inherit.aes = FALSE,
               aes(x = 0.125, xend = 0.125, y = 0.14, yend = Y_HI),
               colour = "grey45", linetype = "42", linewidth = 0.4) +

  geom_text(data = region[1, ], inherit.aes = FALSE, hjust = 0, size = 2.4,
            colour = "grey30", lineheight = 1.05,
            aes(x = 0.036, y = 0.42, label = P003_NOTE)) +
  geom_hline(data = region[1, ], inherit.aes = FALSE, aes(yintercept = -0.03),
             colour = "grey75", linewidth = 0.3) +
  geom_text(data = region[1, ], inherit.aes = FALSE, hjust = 0, size = 2.4,
            colour = "grey30",
            aes(x = X_LEFT * 1.06, y = -0.048,
                label = "below: grey = the OBSERVED edge cell, identical at all three ratios; colour = the grid cell each predicted phi* falls in; point = phi* itself; at ratio 5.00 the predicted and observed bars span the SAME cell")) +
  geom_line(aes(group = frac), linewidth = 0.6, colour = INK) +
  geom_point(size = 2.8, colour = INK) +
  geom_text(aes(label = count), vjust = -1.2, size = 2.7, colour = INK) +
  # ---- all four registered verdicts, one block, equal weight ---------------
  geom_text(data = verdicts, inherit.aes = FALSE, hjust = 0, size = 2.2,
            colour = "grey15", fontface = "bold", family = "mono",
            aes(x = 0.0088, y = y, label = lab)) +
  geom_rect(data = pred, inherit.aes = FALSE,
            aes(xmin = X_LEFT, xmax = X_RIGHT, ymin = y - 0.098, ymax = y + 0.070),
            fill = "grey96", colour = NA) +
  # ---- THREE observed bars against THREE predicted bars -------------------
  # The observed cell is identical at all three ratios; drawing it three times,
  # opposite three predictions that sit in three different cells, IS the
  # falsification. Cut 4 asserted the identity in a sentence instead.
  geom_rect(data = pred, inherit.aes = FALSE,
            aes(xmin = olo, xmax = ohi, ymin = y + OFF - BAR, ymax = y + OFF + BAR),
            fill = "grey55", colour = "grey30", linewidth = 0.25) +
  geom_rect(data = pred, inherit.aes = FALSE,
            aes(xmin = plo, xmax = phi_hi, ymin = y - OFF - BAR, ymax = y - OFF + BAR,
                fill = ratio, alpha = hit),
            colour = "grey25", linewidth = 0.4) +
  # ⚠️ ALL THREE AT FULL ALPHA. De-weighting the landing prediction to 0.18 and
  # then 0.30 put it at 1.25:1 and 1.47:1 -- below the 3:1 floor this same script
  # asserts for the green -- so the one prediction that hit became the least
  # visible object. The registration licenses PARITY, not suppression; the caveat
  # is carried by its label.
  scale_alpha_manual(values = c("FALSE" = 1, "TRUE" = 1), guide = "none") +
  # The marker sits ABOVE its bar: at ratio 5.00 phi* is 2 px from the cell
  # boundary, and drawn on the bar it rendered as an end-cap rather than a point.
  geom_point(data = pred, inherit.aes = FALSE, size = 2.1, stroke = 0.7,
             aes(x = phi_star, y = y - OFF - BAR - 0.030, colour = ratio, shape = ratio)) +
  geom_text(data = pred, inherit.aes = FALSE, hjust = 1, size = 2.45,
            show.legend = FALSE, colour = "grey20",
            aes(x = pmin(plo, olo) / 1.12, y = y, label = left)) +
  geom_text(data = pred, inherit.aes = FALSE, hjust = 0, size = 2.45,
            show.legend = FALSE, colour = "grey20",
            aes(x = phi_hi * 1.08, y = y - OFF - 0.012, label = right)) +
  geom_text(data = pred, inherit.aes = FALSE, hjust = 0, size = 2.45,
            show.legend = FALSE, colour = "grey30",
            aes(x = ohi * 1.08, y = y + OFF + 0.012, label = "observed edge cell")) +
  scale_fill_manual(values = palette_003, guide = "none") +
  scale_colour_manual(values = palette_003, name = "predicted phi* for theta/sigmaS =") +
  scale_shape_manual(values = shape_003, name = "predicted phi* for theta/sigmaS =") +
  facet_grid(horizon_lab ~ .) +
  scale_x_log10(breaks = GRID[GRID > 0], limits = c(X_LEFT, X_RIGHT), expand = c(0, 0),
                labels = format(GRID[GRID > 0], scientific = FALSE, trim = TRUE)) +
  common +
  labs(x = "trap infidelity phi (log scale; the grid steps by 2, so the edge is bracketed to one step)", y = NULL) +
  theme(axis.text.y = element_blank(), axis.ticks.y = element_blank(),
        plot.margin = margin(5, 5, 5, 1))

fig <- (p_zero | p_pos) + plot_layout(widths = c(1, 9)) +
  plot_annotation(
    title = "An imperfect trap does control the element - but only for a while",
    subtitle = paste0(
      "ONE curve, because all three theta/sigmaS ratios gave the SAME CONTROLLED/RUNAWAY classification in every one of the 54 cells, and every cell is unanimous\n",
      "(10/10 or 0/10 - no intermediate cell anywhere). The runs are NOT otherwise identical: phi* = theta / max abs(s) was computed from 003's max abs(s) at 600\n",
      sprintf("generations, which spans %.1fx across the ratios (%s); this experiment's own at 1800 spans %.1fx (%s).\n",
              max(WALK_003)/min(WALK_003), paste(sprintf("%.1f", WALK_003[RATIOS]), collapse = " / "),
              max(walk_004)/min(walk_004), paste(sprintf("%.1f", walk_004[RATIOS]), collapse = " / ")),
      sprintf("SECONDARY 2 IS %s: phi* named three DIFFERENT grid cells and the observed edge is ONE cell; on the post-hoc power-law edges %s, by %.1fx to %.1fx.\n",
              v2, PL_MISS_WORD, min(PL_MISS), max(PL_MISS)),
      sprintf("That prediction spanned %.1fx, which is ABOVE this grid's 2x resolution - the grid was adequate to it and rejected it. The resolution caveat attaches only to\n",
              max(PHI_STAR)/min(PHI_STAR)),
      sprintf("the post-hoc %.1fx movement of the edge itself, and hence to SECONDARY 3. Green = the controlled region: phi = %s at 600 generations and %s at 1800, a shrink\n",
              PL_SPREAD_EDGE, fmt(e600), fmt(e1800)),
      sprintf("the same power law puts at %.1fx to %.1fx (the grid itself brackets it at 2x to 8x). A DELAY over these two horizons - nothing here shows the band closes in\n",
              min(PL_SHRINK), max(PL_SHRINK)),
      "the limit. One prediction does land in the observed cell, by 0.6%, at the ratio the registration named\n",
      "in advance as the LEAST informative of the three and said was not to be quoted as if it were the strongest - and it misses the post-hoc edge by 1.8x."),
    caption = paste0(
      "Registered question 004. Pre-registration committed alone at cec9955 before the runner existed; analysis committed with the runner, before any data. Model frozen at 12e7b08, seeds 3001-3010.\n",
      "CONTROLLED = alive and never saturated at the scored generation; RUNAWAY = copies per genome exceeded 1500, half the genome's sites, and the run was stopped there. NO RUN WENT EXTINCT at either horizon (0 of 270), so every 0/10 is RUNAWAY.\n",
      "theta = 0.10, the silencing window in sequence space; sigmaS = the per-transposition step in that space; max abs(s) = the largest coordinate a captured lineage reached. 003 measured it at 600 generations, 004 at 1800; the two are printed separately above.\n",
      "Both rows are the SAME 10 runs per cell, scored twice out of a single run (manipulation check 3a), so they are not independent samples: 60 of the 270 runs are CONTROLLED at 600 and RUNAWAY at 1800."),
    theme = theme_tge_annotation())

# ⚠️ GUARD FOR THE CLASS. scale_x_log10(limits = ...) censors out-of-range
# positions to NA and ggplot DROPS THE LAYER WITHOUT WARNING -- cut 8 shipped a
# "fix" that never rendered once, under a comment asserting it had.
for (nm in c("p_zero", "p_pos")) {
  ld <- ggplot_build(get(nm))$data
  for (i in seq_along(ld)) {
    for (col in intersect(c("x", "xmin", "xmax", "xend"), names(ld[[i]]))) {
      if (anyNA(ld[[i]][[col]])) {
        stop(sprintf("%s layer %d: %s censored to NA by the scale limits; the layer would be silently dropped", nm, i, col))
      }
    }
  }
}
ggsave(FIG_MAIN, fig, width = 14, height = 9.8, dpi = 150, bg = "white")
cat(sprintf("\nwrote %s\n", FIG_MAIN))
