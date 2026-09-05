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
# ⚠️ ONE PRE-REGISTERED PLOTTING DECISION, BECAUSE IT CAN ENCODE A LIE.
# The phi axis is logarithmic and phi = 0 CANNOT BE PLACED ON IT. phi = 0 is
# therefore drawn in its own narrow left-hand panel, NOT at some small positive
# position on the log axis. Placing it at, say, 0.0005 would assert a location
# the point does not have and would let the eye interpolate between 0 and 0.001
# — which is the exact inference this whole question exists to avoid, since the
# difference between "control at 0 only" and "control on a band above 0" is the
# question. Registered in advance; see the registration's analysis section.
#
# Series are dodged HORIZONTALLY (multiplicatively, because the axis is log), not
# vertically. 003's first figure copied a vertical offset onto a FRACTION axis
# and put one series above 1.0 and another below 0.0; an adversarial critic
# caught it and the author did not.
#
# No plotmath anywhere: 003's `expression(theta/sigma[S])` rendered the "/" as
# the division LAYOUT operator, stacking the symbols.

DODGE <- c("2.00" = 1 / 1.07, "3.33" = 1, "5.00" = 1.07)   # multiplicative, log axis
Y_LO <- -0.04
Y_HI <- 1.06

cells$ratio <- factor(cells$ratio, levels = RATIOS)
cells$horizon_lab <- factor(sprintf("%d generations", cells$horizon),
                            levels = sprintf("%d generations", HORIZONS))
cells$xd <- cells$phi * DODGE[as.character(cells$ratio)]

zero <- cells[cells$phi == 0, ]
pos  <- cells[cells$phi > 0, ]

star <- data.frame(
  ratio = factor(RATIOS, levels = RATIOS),
  phi_star = as.numeric(PHI_STAR[RATIOS])
)

common <- list(
  scale_colour_manual(values = palette_003, name = "theta / sigmaS"),
  scale_shape_manual(values = shape_003, name = "theta / sigmaS"),
  coord_cartesian(ylim = c(Y_LO, Y_HI)),
  theme_tge()
)

p_zero <- ggplot(zero, aes(x = "0", y = frac, colour = ratio, shape = ratio)) +
  geom_errorbar(aes(ymin = lo, ymax = hi), width = 0.18,
                position = position_dodge(width = 0.55), linewidth = 0.4) +
  geom_point(position = position_dodge(width = 0.55), size = 2.4) +
  facet_grid(horizon_lab ~ .) +
  common +
  labs(x = "exact", y = "fraction of seeds CONTROLLED") +
  theme(legend.position = "none",
        strip.text.y = element_blank(),
        plot.margin = margin(5, 2, 5, 5))

p_pos <- ggplot(pos, aes(x = xd, y = frac, colour = ratio, shape = ratio)) +
  geom_vline(data = star, aes(xintercept = phi_star, colour = ratio),
             linetype = "22", linewidth = 0.4, alpha = 0.8, show.legend = FALSE) +
  geom_line(aes(group = ratio), linewidth = 0.4, alpha = 0.85) +
  geom_errorbar(aes(ymin = lo, ymax = hi), width = 0.05, linewidth = 0.4) +
  geom_point(size = 2.4) +
  facet_grid(horizon_lab ~ .) +
  scale_x_log10(breaks = GRID[GRID > 0],
                labels = format(GRID[GRID > 0], scientific = FALSE, trim = TRUE)) +
  common +
  labs(x = "trap infidelity phi (log scale)", y = NULL) +
  theme(axis.text.y = element_blank(),
        axis.ticks.y = element_blank(),
        plot.margin = margin(5, 5, 5, 2))

fig <- (p_zero | p_pos) +
  plot_layout(widths = c(1, 7), guides = "collect") +
  plot_annotation(
    title = "Does any imperfect trap control the element, and does it last?",
    subtitle = paste0(
      "Fraction of 10 seeds CONTROLLED, per cell, with Wilson intervals. Dashed verticals mark each ratio's\n",
      "registered edge prediction phi* = theta / max abs(s). phi = 0 is EXACT and sits in its own panel: it\n",
      "has no position on a log axis, and interpolating toward it is the inference this question exists to test."
    ),
    caption = paste0(
      "Registered question 004. Pre-registration committed alone at cec9955 before the runner existed; ",
      "this analysis committed with the runner, before any data.\nModel frozen at 12e7b08. ",
      "Seeds 3001-3010. Every run goes to 1800 generations and is scored at 600 as well, out of one run ",
      "(manipulation check 3a)."
    ),
    theme = theme_tge() + theme(
      plot.title = element_text(face = "bold", size = 13),
      plot.subtitle = element_text(size = 8.5, lineheight = 1.25),
      plot.caption = element_text(size = 7, lineheight = 1.25, hjust = 0)
    )
  )

ggsave(FIG_MAIN, fig, width = 10.5, height = 7.4, dpi = 150, bg = "white")
cat(sprintf("\nwrote %s\n", FIG_MAIN))
