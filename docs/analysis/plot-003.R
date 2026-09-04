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
sec1_ok <- all(!is.na(edge)) &&
  all(sapply(REGISTERED_RATIOS,
             function(r) cells$modal[cells$ratio == r & cells$phi == 0.875] != "CONTROLLED"))
cat(sprintf("SECONDARY 1: %s\n\n", if (sec1_ok) "HELD" else "FALSIFIED"))

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
# FIGURE — one graph. x = phi, y = fraction of seeds CONTROLLED, one line per
# ratio. The exploratory ratio is dashed, not recoloured, so its status survives
# greyscale.

cells$frac_controlled <- cells$controlled / cells$n
cells$status <- ifelse(cells$exploratory == 1, "exploratory", "registered")

p <- ggplot(cells, aes(x = phi, y = frac_controlled,
                       colour = ratio, linetype = status)) +
  geom_line(linewidth = 0.7) +
  geom_point(size = 2) +
  scale_colour_manual(values = palette_003, name = "theta/sigmaS") +
  scale_linetype_manual(values = linetype_003, name = NULL) +
  # ⚠️ coord_cartesian, NOT scale_y_continuous(limits=): 002 silently DROPPED
  # four of twelve points that way. Zoom, never filter.
  coord_cartesian(ylim = c(-0.04, 1.04)) +
  labs(
    title = "How much fidelity does the trap need?",
    subtitle = paste("phi = 0 is the shipped tracking trap; phi = 1 is the ancestral-fixed trap.",
                     "\nCONTROLLED = the element persists to generation 600 and never saturates."),
    x = "phi  (trap infidelity: entry = (1 - phi) * copy.s)",
    y = "fraction of seeds CONTROLLED",
    caption = paste0(
      "Registered question 003. ", SEEDS_PER_CELL, " seeds per cell, seeds 2001-2010, 600 generations.\n",
      "Ratio 2.00 is PRE-REGISTERED EXPLORATORY (dashed) — below every ratio question 002 swept."
    )
  ) +
  theme_tge()

ggsave("docs/analysis/fig-003-fidelity.png", p, width = 7.2, height = 4.8, dpi = 200)
cat("wrote docs/analysis/fig-003-fidelity.png\n")
