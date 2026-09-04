# Registered question 003 — how fresh must the trap be?
#
# Registration: ../pre-registrations/2026-09-04-how-fresh-must-the-trap-be.md,
# committed ALONE at 126e3bd before the runner existed. This script implements
# the analysis that document pre-specifies. IF THIS SCRIPT AND THE DOCUMENT
# DISAGREE, THE DOCUMENT IS RIGHT AND THIS SCRIPT IS A BUG.
#
# WRITTEN BEFORE THE DATA EXISTED, which is the point of a pre-specified
# analysis: no choice here was made after seeing a result.
#
# Styling comes from theme.R and is defined nowhere else (spec §7).

source("docs/analysis/theme.R")

CSV <- "experiments/003-trap-fidelity.csv"
if (!file.exists(CSV)) {
  stop("missing ", CSV, " — run experiments/003-trap-fidelity.ts first. ",
       "Failing loudly rather than plotting nothing.")
}
d <- read.csv(CSV, stringsAsFactors = FALSE)
d$ratio <- sprintf("%.2f", as.numeric(d$ratio))

REGISTERED_RATIOS <- c("3.33", "5.00")
EXPLORATORY_RATIO <- "2.00"
PHIS <- c(0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1)
SEEDS_PER_CELL <- 10

cat("=== registered question 003 —", nrow(d), "runs ===\n\n")

# ---------------------------------------------------------------------------
# MANIPULATION CHECKS 3 AND 4, RE-ASSERTED ON THE CSV
#
# Checks 1 and 2 live in the runner: they compare a composed loop against
# sim/step.ts and against 002's committed CSV, and neither comparison can be
# rebuilt from this file. Checks 3 and 4 are recorded per run and are re-asserted
# here, so the figure cannot be drawn from a void CSV.

stopifnot(all(d$ever_had_repertoire == 1))          # check 4
stopifnot(all(d$captures > 0))

zero <- d[d$phi == 0, ]
one <- d[d$phi == 1, ]
mid <- d[d$phi > 0 & d$phi < 1, ]
stopifnot(nrow(zero) > 0, nrow(one) > 0, nrow(mid) > 0)
stopifnot(all(zero$mean_displacement == 0))          # check 3, phi = 0
stopifnot(all(zero$max_abs_entry > 1e-9))
stopifnot(all(one$max_abs_entry == 0))               # check 3, phi = 1
stopifnot(all(mid$mean_displacement > 0))            # check 3, interior
stopifnot(all(mid$max_abs_entry > 1e-9))
cat("manipulation checks 3 and 4 re-assert on the CSV: PASS\n")

# The outcome classes must be exhaustive and mutually exclusive. 002's VIABLE
# silently merged two of these, so the partition is asserted, not assumed.
stopifnot(all(d$outcome %in% c("EXTINCT", "CONTROLLED", "RUNAWAY")))
stopifnot(all((d$outcome == "EXTINCT") == (d$extinct == 1)))
stopifnot(all((d$outcome == "RUNAWAY") == (d$saturated == 1)))
stopifnot(all(d$extinct + d$saturated <= 1))
cat("outcome classes are exhaustive and mutually exclusive: PASS\n\n")

# ---------------------------------------------------------------------------
# CELLS

cell_of <- function(ratio, phi) d[d$ratio == ratio & d$phi == phi, ]

modal_outcome <- function(rows) {
  tab <- table(factor(rows$outcome, levels = c("EXTINCT", "CONTROLLED", "RUNAWAY")))
  top <- names(tab)[tab == max(tab)]
  if (length(top) > 1) paste0("TIE(", paste(top, collapse = "/"), ")") else top
}

cells <- do.call(rbind, lapply(sort(unique(d$ratio)), function(r) {
  do.call(rbind, lapply(PHIS, function(p) {
    rows <- cell_of(r, p)
    if (nrow(rows) == 0) return(NULL)
    data.frame(
      ratio = r, phi = p, n = nrow(rows),
      extinct = sum(rows$outcome == "EXTINCT"),
      controlled = sum(rows$outcome == "CONTROLLED"),
      runaway = sum(rows$outcome == "RUNAWAY"),
      modal = modal_outcome(rows),
      copies = mean(rows$copies_per_genome),
      silenced = mean(rows$silenced_fraction),
      exploratory = rows$exploratory[1],
      stringsAsFactors = FALSE
    )
  }))
}))

cat("=== the grid, counts out of", SEEDS_PER_CELL, "seeds ===\n")
print(cells[, c("ratio", "phi", "n", "extinct", "controlled", "runaway",
                "modal", "copies", "silenced")], row.names = FALSE, digits = 4)
cat("\n")

# ---------------------------------------------------------------------------
# PRIMARY — the CONTROLLED set in phi is a contiguous down-set from phi = 0.
#
# ⚠️ THE CHECKER CARRIES ITS OWN POSITIVE CONTROL, ASSERTED FIRST. A predicate
# that cannot report a violation would pass on every input, and "a check that
# cannot discriminate" is this project's signature defect.

is_downset <- function(v) {
  # TRUE iff every TRUE precedes every FALSE: a contiguous prefix.
  if (!any(v)) return(TRUE)
  last_true <- max(which(v))
  all(v[seq_len(last_true)])
}
stopifnot(is_downset(c(TRUE, TRUE, FALSE, FALSE)))    # a down-set
stopifnot(is_downset(c(FALSE, FALSE)))                # the empty down-set
stopifnot(!is_downset(c(TRUE, FALSE, TRUE, FALSE)))   # re-entrant: MUST be caught
stopifnot(!is_downset(c(FALSE, TRUE)))                # control returning: MUST be caught
cat("down-set checker positive control (it can report a violation): PASS\n\n")

cat("=== PRIMARY: is the CONTROLLED set a contiguous down-set from phi = 0? ===\n")
primary_ok <- TRUE
for (r in REGISTERED_RATIOS) {
  cr <- cells[cells$ratio == r, ]
  cr <- cr[order(cr$phi), ]
  v <- cr$modal == "CONTROLLED"
  ok <- is_downset(v)
  primary_ok <- primary_ok && ok
  cat(sprintf("  ratio %s: %s\n", r,
              paste(ifelse(v, "C", "."), collapse = "")))
  cat(sprintf("    phi:   %s\n", paste(sprintf("%-5g", cr$phi), collapse = "")))
  if (!ok) {
    bad <- cr$phi[which(v)[which(v) > min(which(!v))]]
    cat(sprintf("    ⚠️ VIOLATED — control returns at phi = %s\n",
                paste(bad, collapse = ", ")))
  } else {
    cat("    down-set HELD\n")
  }
}
cat(sprintf("\nPRIMARY PREDICTION: %s\n\n", if (primary_ok) "HELD" else "FALSIFIED"))

# ---------------------------------------------------------------------------
# SECONDARY 1 — the edge is interior: some phi in (0,1) is CONTROLLED and a
# larger phi is not. Falsified if the cell at phi = 0.875 is CONTROLLED.

cat("=== SECONDARY 1: is the fidelity edge inside the grid? ===\n")
edge <- setNames(rep(NA_real_, length(REGISTERED_RATIOS)), REGISTERED_RATIOS)
for (r in REGISTERED_RATIOS) {
  cr <- cells[cells$ratio == r, ]
  ctrl <- cr$phi[cr$modal == "CONTROLLED"]
  edge[r] <- if (length(ctrl) == 0) NA_real_ else max(ctrl)
  at875 <- cr$modal[cr$phi == 0.875]
  cat(sprintf("  ratio %s: largest CONTROLLED phi = %s; cell at phi=0.875 is %s\n",
              r, ifelse(is.na(edge[r]), "none", edge[r]), at875))
}
# ⚠️ THIS EVALUATES THE PREDICTION, NOT THE FALSIFICATION CLAUSE, AND THE FIRST
# VERSION DID THE OPPOSITE. Secondary 1 predicts "there is a phi in the OPEN
# interval (0,1) whose cell is CONTROLLED and a larger phi whose cell is not".
# The registration attached the falsifier "falsified if the cell at phi = 0.875
# is CONTROLLED", which only covers the edge sitting too HIGH. The edge can also
# fall BELOW the grid's first step — which is what happened — and that clause is
# blind to it. The first version of this script encoded the clause and therefore
# inherited the same blind spot, printing HELD for a prediction that is false.
# A criterion that can only detect one of the two ways its prediction can fail
# is this project's signature defect; it is fixed here and recorded as a
# deviation in the registration.
has_interior_edge <- function(ctrl_phis) any(ctrl_phis > 0 & ctrl_phis < 1)
# POSITIVE CONTROL FOR THE PREDICATE, ASSERTED FIRST.
stopifnot(has_interior_edge(c(0, 0.125, 0.25)))  # an interior edge exists
stopifnot(!has_interior_edge(c(0)))              # control ONLY at exact fidelity: MUST be caught
stopifnot(!has_interior_edge(numeric(0)))        # no control anywhere: MUST be caught
stopifnot(!has_interior_edge(c(0, 1)))           # endpoints only: MUST be caught

sec1_ok <- all(sapply(REGISTERED_RATIOS, function(r) {
  ctrl <- cells$phi[cells$ratio == r & cells$modal == "CONTROLLED"]
  has_interior_edge(ctrl) && !(1 %in% ctrl)
}))
for (r in REGISTERED_RATIOS) {
  ctrl <- cells$phi[cells$ratio == r & cells$modal == "CONTROLLED"]
  cat(sprintf("  ratio %s: CONTROLLED at phi = {%s}; any in the OPEN interval (0,1)? %s\n",
              r, paste(ctrl, collapse = ", "),
              if (has_interior_edge(ctrl)) "yes" else "NO"))
}
cat(sprintf("SECONDARY 1: %s\n", if (sec1_ok) "HELD" else "FALSIFIED"))
if (!sec1_ok) {
  cat("  ⚠️ FALSIFIED IN A DIRECTION THE REGISTRATION'S OWN FALSIFICATION CLAUSE\n",
      "     COULD NOT SEE: the edge fell BELOW the grid's first step (0.125),\n",
      "     not above 0.875. The grid is too coarse near zero to locate it.\n", sep = "")
}
cat("\n")

# ---------------------------------------------------------------------------
# SECONDARY 2 — the dial is not a relabelling of the ratio. If phi only rescaled
# escape time, the boundary would sit at a constant value of ratio/phi*.

cat("=== SECONDARY 2: does the boundary sit at a constant ratio/phi*? ===\n")
all_ratios <- sort(unique(cells$ratio))
edge_all <- sapply(all_ratios, function(r) {
  ctrl <- cells$phi[cells$ratio == r & cells$modal == "CONTROLLED"]
  if (length(ctrl) == 0) NA_real_ else max(ctrl)
})
collapsed <- as.numeric(all_ratios) / edge_all
for (i in seq_along(all_ratios)) {
  cat(sprintf("  ratio %s: phi* = %-6s  ratio/phi* = %s\n",
              all_ratios[i], ifelse(is.na(edge_all[i]), "none", edge_all[i]),
              ifelse(is.na(collapsed[i]), "NA", sprintf("%.2f", collapsed[i]))))
}
usable <- collapsed[!is.na(collapsed) & is.finite(collapsed)]
if (length(usable) >= 2) {
  spread <- max(usable) - min(usable)
  cat(sprintf("  spread in ratio/phi* = %.2f\n", spread))
  cat(sprintf("SECONDARY 2 (boundary is NOT at constant ratio/phi*): %s\n",
              if (spread > 0) "HELD" else "FALSIFIED"))
} else {
  cat("SECONDARY 2: NOT EVALUABLE — fewer than two ratios have an interior edge.\n")
}
cat("  ⚠️ Weakly powered by construction: three ratios. Stated in the registration in advance.\n\n")

# ---------------------------------------------------------------------------
# THE DISCHARGED COMMITMENT — 002 pre-committed 003 to a two-arm test at these
# ratios. It is reported, and it is NOT the primary: 002's own committed data
# already separates the arms completely, so this confirms out of sample rather
# than discovering anything. Designated non-primary in the registration, before
# any data existed.

cat("=== 002's pre-committed two-arm contrast, out of sample, NON-PRIMARY ===\n")
for (r in REGISTERED_RATIOS) {
  a <- cell_of(r, 0)
  b <- cell_of(r, 1)
  ca <- sum(a$outcome == "CONTROLLED")
  cb <- sum(b$outcome == "CONTROLLED")
  tst <- prop.test(c(ca, cb), c(nrow(a), nrow(b)), correct = TRUE)
  cat(sprintf("  ratio %s: phi=0 CONTROLLED %d/%d, phi=1 CONTROLLED %d/%d, p = %.4g\n",
              r, ca, nrow(a), cb, nrow(b), tst$p.value))
}
cat("\n")

# ---------------------------------------------------------------------------
# FIGURES
#
# Rebuilt twice against an adversarial review. Both rounds of defects are
# recorded because each one is a trap worth not falling into again:
#
#  ROUND 1 (draft 1 -> draft 2)
#   - The three coincident curves were offset VERTICALLY by 0.018, which put one
#     ratio visibly ABOVE y = 1.0 and another BELOW y = 0.0: a fraction reading
#     over 100% and negative. The dodge is on X now, where a small displacement
#     cannot manufacture an impossible fraction.
#   - The vertical offset was 8.4 px against a 17.5 px marker, so markers still
#     occluded even where lines separated. Distinct SHAPES now carry the
#     distinction; they do more work than the dodge does.
#   - Both figures drew a straight segment from phi = 0 to phi = 0.125, across
#     the interval THE WHOLE RESULT LIVES IN AND WHICH WAS NEVER SAMPLED. No
#     line crosses the gap now; it is shaded and labelled.
#   - The colour legend drew every key solid including the dashed exploratory
#     ratio, so the legend contradicted the plot.
#   - Neither figure showed dispersion on n = 10.
#
#  ROUND 2 (draft 2 -> this) — draft 2's own regressions
#   - TEXT WAS HARD-CLIPPED off the right edge of both canvases: fig 1's title
#     sliced mid-glyph, fig 2's subtitle cut mid-word. ggplot does not wrap.
#     Titles are now hand-wrapped and the canvas is wider.
#   - Fig 2's subtitle said "2-17%", which is the range over the REGISTERED
#     ratios only, while the exploratory curve is plotted right there at 28.7%.
#     A headline number its own plot contradicted. Corrected to 2-29%.
#   - The phi = 0 markers, dodged by +/-0.010, sat INSIDE the "NOT SAMPLED"
#     band, asserting that sampled points were unsampled. The band now starts
#     clear of them at x = 0.022.
#   - Fig 2's "NOT SAMPLED" label sat at y = 0.30 and was struck through by the
#     2.00 series at 0.2874. Moved clear.
#   - PLOTMATH IS GONE. expression(theta/sigma[S]) renders "/" as the division
#     LAYOUT operator, drawing theta with a slash through it; paste(phi, ")")
#     kerned the paren into the phi's bowl. Two garbled-glyph defects from one
#     feature is enough: plain text everywhere.
#   - override.aes for the dashed key was POSITIONAL and worked only because the
#     exploratory label happened to sort first. Derived from the data now.

cells$frac_controlled <- cells$controlled / cells$n
cells$status <- ifelse(cells$exploratory == 1, "exploratory", "registered")
cells$ratio_lab <- ifelse(cells$exploratory == 1,
                          paste0(cells$ratio, " (exploratory)"), cells$ratio)

GAP_HI <- 0.125    # the grid's first step above zero; (0, GAP_HI) is unsampled
BAND_LO <- 0.022   # clear of the dodged phi = 0 markers and their error caps
DODGE <- 0.010

# Wilson score interval — the honest interval at 10/10 and 0/10, where the normal
# approximation has width exactly zero and would draw no bar at all.
wilson <- function(x, n, z = 1.96) {
  p <- x / n; d <- 1 + z^2 / n
  centre <- (p + z^2 / (2 * n)) / d
  half <- z * sqrt(p * (1 - p) / n + z^2 / (4 * n^2)) / d
  c(max(0, centre - half), min(1, centre + half))
}
ci <- t(mapply(wilson, cells$controlled, cells$n))
cells$lo <- ci[, 1]; cells$hi <- ci[, 2]

xoff <- c("2.00" = -DODGE, "3.33" = 0, "5.00" = DODGE)
cells$x_draw <- cells$phi + xoff[cells$ratio]

lab_of <- function(r) ifelse(r == "2.00", paste0(r, " (exploratory)"), r)
palette_lab <- setNames(palette_003, lab_of(names(palette_003)))
shape_lab <- setNames(shape_003, lab_of(names(shape_003)))
# Derived from the labels, NOT positional: adding a second exploratory ratio or
# reordering the factor cannot now silently dash the wrong key.
key_levels <- sort(unique(cells$ratio_lab))
key_linetype <- ifelse(grepl("exploratory", key_levels, fixed = TRUE), "22", "solid")

LEGEND_TITLE <- "theta / sigma_S"
X_LAB <- "phi    (trap infidelity:  entry = (1 - phi) * copy.s)"

fig1 <- ggplot(cells, aes(x = x_draw, y = frac_controlled,
                          colour = ratio_lab, shape = ratio_lab)) +
  annotate("rect", xmin = BAND_LO, xmax = GAP_HI, ymin = -Inf, ymax = Inf,
           fill = "grey70", alpha = 0.18) +
  annotate("text", x = (BAND_LO + GAP_HI) / 2, y = 0.52,
           label = "NOT\nSAMPLED", size = 2.7, colour = "grey25", lineheight = 0.95) +
  # NO geom_line, and the reason is OCCLUSION, not connectivity. phi = 0.25 and
  # 0.375 are adjacent sampled points and a line between them would be perfectly
  # legitimate — fig 2 draws exactly that. But here all three series sit at y = 0
  # for phi >= 0.125, so three paths would be exactly superimposed and the last
  # drawn would hide the other two: the same occlusion the dodge was added to
  # fix, one layer down. The first caption gave connectivity as the reason, which
  # was false and contradicted fig 2 in the same figure set.
  geom_errorbar(aes(ymin = lo, ymax = hi), width = 0.016, linewidth = 0.4, alpha = 0.8) +
  geom_point(size = 2.3) +
  scale_colour_manual(values = palette_lab, name = LEGEND_TITLE) +
  scale_shape_manual(values = shape_lab, name = LEGEND_TITLE) +
  guides(colour = guide_legend(override.aes = list(linetype = key_linetype))) +
  coord_cartesian(ylim = c(-0.02, 1.02), xlim = c(-0.04, 1.04)) +
  labs(
    title = "How much fidelity does the trap need?\nMore than this grid can resolve",
    subtitle = "Control exists at phi = 0 and at no sampled point above it.\nAll three ratios are identical IN CONTROL at every phi - though not in silencing.",
    x = X_LAB,
    y = "fraction of 10 seeds CONTROLLED",
    caption = paste0(
      "Registered question 003. 10 seeds per cell (seeds 2001-2010), 600 generations.\n",
      "Bars are 95% Wilson intervals. Points only: all three ratios are exactly coincident,\n",
      "so a line would show one series and hide two. No line crosses the unsampled\n",
      "interval (0, 0.125) in either figure; the shaded band starts at 0.022 to clear the dodge.\n",
      "Ratios are dodged horizontally by 0.010 to be visible; y values are exact.\n",
      "Question 002 swept ratios 3.33-13.33; ratio 2.00 is below all of them, PRE-REGISTERED EXPLORATORY."
    )
  ) +
  theme_tge()

ggsave("docs/analysis/fig-003-fidelity.png", fig1, width = 9.4, height = 6.0, dpi = 200)
cat("wrote docs/analysis/fig-003-fidelity.png\n")

# ---------------------------------------------------------------------------
# ADDENDUM FIGURE — NOT REGISTERED, labelled so on its face.
#
# The registered figure is degenerate: control on at phi = 0, off everywhere
# else, identically at all three ratios. That is the result, but it hides what
# the data also shows — silencing does not collapse with control. LOG y, because
# on a linear axis every value above phi = 0.375 is pinned to the floor and the
# decay this figure exists to show is invisible. Separate standalone figure: the
# house rule is one graph per figure, never a stitched panel.

per <- do.call(rbind, lapply(split(d, list(d$ratio, d$phi), drop = TRUE), function(g) {
  data.frame(ratio = g$ratio[1], phi = g$phi[1],
             mean = mean(g$silenced_fraction),
             se = sd(g$silenced_fraction) / sqrt(nrow(g)),
             exploratory = g$exploratory[1], stringsAsFactors = FALSE)
}))
per$status <- ifelse(per$exploratory == 1, "exploratory", "registered")
per$ratio_lab <- lab_of(per$ratio)
per$x_draw <- per$phi + xoff[per$ratio]
per$lo <- pmax(per$mean - per$se, 1e-4); per$hi <- per$mean + per$se

# FINITE ymin/ymax, never -Inf/Inf: this panel is log-y and log(-Inf) is NaN.
# The first version emitted "NaNs produced" and drew the band wrong — the same
# class of silent failure as 002's scale_y_continuous(limits=) dropping points.
Y_LO <- 0.008; Y_HI <- 1.30

fig2 <- ggplot(per, aes(x = x_draw, y = mean, colour = ratio_lab, shape = ratio_lab)) +
  annotate("rect", xmin = BAND_LO, xmax = GAP_HI, ymin = Y_LO, ymax = Y_HI,
           fill = "grey70", alpha = 0.18) +
  annotate("text", x = (BAND_LO + GAP_HI) / 2, y = 0.75,
           label = "NOT\nSAMPLED", size = 2.7, colour = "grey25", lineheight = 0.95) +
  geom_line(data = per[per$phi >= GAP_HI, ], aes(linetype = status), linewidth = 0.7) +
  geom_errorbar(aes(ymin = lo, ymax = hi), width = 0.016, linewidth = 0.4, alpha = 0.8) +
  geom_point(size = 2.3) +
  scale_colour_manual(values = palette_lab, name = LEGEND_TITLE) +
  scale_shape_manual(values = shape_lab, name = LEGEND_TITLE) +
  scale_linetype_manual(values = linetype_003, guide = "none") +
  guides(colour = guide_legend(override.aes = list(linetype = key_linetype))) +
  scale_y_log10(breaks = c(0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0),
                labels = c("0.01", "0.02", "0.05", "0.10", "0.20", "0.50", "1.00")) +
  coord_cartesian(xlim = c(-0.04, 1.04), ylim = c(Y_LO, Y_HI)) +
  labs(
    title = "Control is binary; silencing is not",
    subtitle = "Mean silenced fraction at the run's stop.\nEvery cell above phi = 0 is RUNAWAY, yet 2-29% of copies are still silenced.",
    x = X_LAB,
    y = "mean silenced fraction at the run's stop  (log scale)",
    caption = paste0(
      "UNREGISTERED ADDENDUM to question 003 - descriptive; no prediction was stated on it.\n",
      "Bars are +/-1 SE over 10 seeds. LOG y: on a linear axis the whole tail is pinned to zero.\n",
      "Ratios are dodged horizontally by 0.010. The 3.33 and 5.00 curves differ by less than\n",
      "their standard errors past phi = 0.5, and should not be read as a ratio effect there.\n",
      "The 2-29% range spans all three plotted series; over the two REGISTERED ratios it is 2-17%."
    )
  ) +
  theme_tge()

ggsave("docs/analysis/fig-003-silencing.png", fig2, width = 9.4, height = 6.0, dpi = 200)
cat("wrote docs/analysis/fig-003-silencing.png (unregistered addendum)\n")
