# Registered question 005 — does the delay diverge, or is there a floor?
# `docs/pre-registrations/2026-09-05-does-the-delay-diverge.md`.
#
# COMMITTED WITH THE RUNNER, BEFORE ANY DATA EXISTS. Nothing below was chosen
# after seeing a result.
#
# ⚠️ EVERY PREDICATE CARRIES POSITIVE **AND** NEGATIVE CONTROLS, ASSERTED BEFORE
# THE PREDICATE IS USED ON REAL DATA. 004's analysis shipped six guards of the
# form `grepl(v, sprintf("...v..."))` and five of the form
# `v %in% c("HELD","FALSIFIED")` — all tautologies — and three of its four verdict
# guards re-ran the same expression on the same object, which a reviewer
# demonstrated by injecting a wrong cell class and watching the script finish
# green with a different answer. Every verdict here is RECOUNTED FROM THE RAW CSV.
#
# ⚠️ THE CLASS RULE, from 004's ROADMAP entry: no mark may sit at a level the data
# does not measure. In 005 that binds on CENSORED CELLS — a run that never
# saturated has no t_sat, and must never be drawn at one. It is drawn as an
# upward arrow AT ITS HORIZON, which is a lower bound the data does support.

source("docs/analysis/theme.R")
library(patchwork)

CSV     <- "experiments/005-delay-divergence.csv"
CSV_004 <- "experiments/004-fidelity-band.csv"
FIG_MAIN  <- "docs/analysis/fig-005-divergence.png"
FIG_RESID <- "docs/analysis/fig-005-residuals.png"

# ---------------------------------------------------------------------------
# THE REGISTRATION'S FROZEN CONSTANTS.
#
# Hard-coded here AND re-derived from 004's committed CSV below. The runner makes
# the same assertion (its check 6); it is repeated because the analysis is what
# computes every band and every residual, and a constant that drifted between the
# two would silently mean the figure and the runner tested different models.
FROZEN <- rbind(
  "2.00" = c(a = 0.7304, C = 35.2258),
  "3.33" = c(a = 0.7360, C = 38.7872),
  "5.00" = c(a = 0.7447, C = 43.5347)
)
RATIOS <- rownames(FROZEN)
GRID   <- c(0.002, 0.004, 0.0113, 0.0226, 0.0453)
LOW    <- c(0.002, 0.004)            # below the fitted range — PRIMARY, SECONDARY 1
MID    <- c(0.0113, 0.0226, 0.0453)  # inside it              — SECONDARY 2
BASE_PHI <- 0.0226                   # SECONDARY 3's comparison baseline
HORIZONS <- c("0.002" = 8000, "0.004" = 5000, "0.0113" = 2500,
              "0.0226" = 1500, "0.0453" = 1000)
TOL_LOW <- 0.25   # SECONDARY 1
TOL_MID <- 0.10   # SECONDARY 2
PRIMARY_PHI <- 0.002
SEEDS_PER_CELL <- 10
MAX_EXTINCT_EVALUABLE <- 3

predicted <- function(ratio, phi) FROZEN[ratio, "C"] * phi^(-FROZEN[ratio, "a"])

# Arithmetic the registration prints, asserted rather than trusted.
stopifnot(abs(predicted("2.00", 0.002) - 3298) < 1)
stopifnot(abs(predicted("5.00", 0.002) - 4454) < 1)
stopifnot(abs(predicted("2.00", 0.0453) - 338) < 1)
# The horizon table's own rule: >= 1.75x the largest predicted t_sat, rounded up
# to 500, floor 1000. Re-derived so the table cannot drift from the rule.
for (p in GRID) {
  worst <- max(vapply(RATIOS, predicted, numeric(1), phi = p))
  stopifnot(HORIZONS[[as.character(p)]] == max(1000, ceiling(worst * 1.75 / 500) * 500))
}

# ---------------------------------------------------------------------------
# PREDICATES, each exercised on cases that must pass AND cases that must fail.

# PRIMARY: every non-extinct seed in the cell saturated before the horizon.
# `sat` is the per-seed saturation generation, NA where the run never saturated.
all_saturated <- function(sat, extinct) {
  live <- sat[extinct == 0]
  length(live) > 0 && !any(is.na(live))
}
stopifnot(all_saturated(c(100, 200, 300), c(0, 0, 0)))
stopifnot(!all_saturated(c(100, NA, 300), c(0, 0, 0)))
# An extinct seed is excluded, not counted as a failure to saturate.
stopifnot(all_saturated(c(100, NA, 300), c(0, 1, 0)))
# A cell with nothing left to score is FALSE, never a silent pass.
stopifnot(!all_saturated(c(NA, NA), c(1, 1)))
stopifnot(!all_saturated(numeric(0), numeric(0)))

# SECONDARY 1 and 2: the cell mean lies within `tol` of the prediction.
# ⚠️ A CENSORED SEED COUNTS AS "OUTSIDE, ABOVE" — a run that never saturated
# cannot have finished early, so it can only push the verdict one way. Returning
# NA here instead would let censoring read as "not evaluable" and quietly rescue
# a falsified prediction.
within_band <- function(sat, extinct, pred, tol) {
  live <- sat[extinct == 0]
  if (length(live) == 0) return(FALSE)
  if (any(is.na(live))) return(FALSE)
  m <- mean(live)
  m >= pred * (1 - tol) && m <= pred * (1 + tol)
}
stopifnot(within_band(c(100, 100), c(0, 0), 100, 0.25))
stopifnot(within_band(c(120, 130), c(0, 0), 100, 0.25))   # +25% edge, inclusive
stopifnot(!within_band(c(130, 130), c(0, 0), 100, 0.25))  # above
stopifnot(!within_band(c(70, 70), c(0, 0), 100, 0.25))    # below
stopifnot(!within_band(c(100, NA), c(0, 0), 100, 0.25))   # censored => outside
stopifnot(!within_band(c(NA, NA), c(1, 1), 100, 0.25))    # nothing to score

# SECONDARY 3: the low-phi log-residual is positive AND exceeds the mid-range one.
log_resid <- function(sat, extinct, pred) {
  live <- sat[extinct == 0]
  if (length(live) == 0 || any(is.na(live))) return(NA_real_)
  log(mean(live)) - log(pred)
}
stopifnot(abs(log_resid(c(110, 110), c(0, 0), 100) - log(1.1)) < 1e-12)
stopifnot(is.na(log_resid(c(100, NA), c(0, 0), 100)))

curvature_up <- function(low, mid) {
  if (any(is.na(c(low, mid)))) return(NA)
  low > 0 && low > mid
}
stopifnot(isTRUE(curvature_up(0.06, -0.05)))
stopifnot(isFALSE(curvature_up(-0.01, -0.05)))  # not positive
stopifnot(isFALSE(curvature_up(0.02, 0.05)))    # positive but not larger
stopifnot(is.na(curvature_up(NA, -0.05)))

# Evaluability: a cell with too many extinct seeds is NOT EVALUABLE, never
# falsified. 004 had zero extinctions in 270 runs; that is not a guarantee.
evaluable <- function(extinct) sum(extinct) <= MAX_EXTINCT_EVALUABLE
stopifnot(evaluable(rep(0, 10)))
stopifnot(evaluable(c(rep(1, 3), rep(0, 7))))
stopifnot(!evaluable(c(rep(1, 4), rep(0, 6))))

# The house palette must clear the project's non-text contrast floor. Measured,
# not asserted in a comment — a number you can compute is never a number you claim.
for (h in palette_003) stopifnot(contrast_ratio(h) >= WCAG_NONTEXT_FLOOR)

# ---------------------------------------------------------------------------
# THE DATA, and the positive controls on it, asserted before anything is derived.

if (!file.exists(CSV)) {
  stop(sprintf("%s does not exist yet. This script is committed WITH the runner and BEFORE any data, by the registration's rule; run the experiment first.", CSV))
}
d <- read.csv(CSV, colClasses = c(ratio = "character"), stringsAsFactors = FALSE)

stopifnot(setequal(unique(d$phi), GRID))
stopifnot(setequal(unique(d$ratio), RATIOS))
stopifnot(nrow(d) == length(GRID) * length(RATIOS) * SEEDS_PER_CELL)
stopifnot(all(table(d$phi, d$ratio) == SEEDS_PER_CELL))
# The horizon actually used must be the registered one, per row.
stopifnot(all(d$horizon == HORIZONS[as.character(d$phi)]))
# The runner's own predicted column must agree with this script's arithmetic; if
# it does not, the two halves of the pipeline are testing different models.
stopifnot(all(abs(d$predicted_t_sat -
                  mapply(predicted, d$ratio, d$phi)) < 1e-6))

# 004's constants, re-derived HERE from 004's committed CSV by the registered
# recipe, and compared against the frozen pair this script predicts with.
f <- read.csv(CSV_004, colClasses = c(ratio = "character"), stringsAsFactors = FALSE)
f <- f[!is.na(f$saturation_generation), ]
for (r in RATIOS) {
  z <- aggregate(saturation_generation ~ phi, data = f[f$ratio == r, ], FUN = mean)
  stopifnot(nrow(z) == 5)
  m <- stats::lm(log(saturation_generation) ~ log(phi), data = z)
  stopifnot(abs(-unname(coef(m)[2]) - FROZEN[r, "a"]) < 1e-3)
  stopifnot(abs(exp(unname(coef(m)[1])) - FROZEN[r, "C"]) < 1e-3)
}

# ---------------------------------------------------------------------------
# CELLS, and the four verdicts — EACH RECOUNTED FROM THE RAW CSV.
#
# ⚠️ `cells` below is a convenience for plotting ONLY. Every verdict is computed
# by `raw_*`, which re-reads `d` and never touches `cells`. 004 shipped three
# verdict guards that re-ran the same expression on the same intermediate frame;
# a reviewer injected a wrong cell class and the script finished green with a
# different answer. The guards at the end of this file inject exactly that.

cell_of <- function(dat, r, p) dat[dat$ratio == r & dat$phi == p, ]

cells <- do.call(rbind, lapply(RATIOS, function(r) {
  do.call(rbind, lapply(GRID, function(p) {
    z <- cell_of(d, r, p)
    live <- z$saturation_generation[z$extinct == 0]
    data.frame(
      ratio = r, phi = p,
      pred = predicted(r, p),
      n_extinct = sum(z$extinct),
      n_censored = sum(is.na(live)),
      t_sat = if (length(live) == 0 || any(is.na(live))) NA_real_ else mean(live),
      sem = if (length(live) < 2 || any(is.na(live))) NA_real_ else
              stats::sd(live) / sqrt(length(live)),
      horizon = HORIZONS[[as.character(p)]],
      stringsAsFactors = FALSE
    )
  }))
}))
cells$resid <- log(cells$t_sat) - log(cells$pred)

# --- verdicts, from the raw rows -------------------------------------------
raw_primary <- function(dat) {
  all(vapply(RATIOS, function(r) {
    z <- cell_of(dat, r, PRIMARY_PHI)
    evaluable(z$extinct) && all_saturated(z$saturation_generation, z$extinct)
  }, logical(1)))
}
raw_band <- function(dat, phis, tol) {
  all(unlist(lapply(RATIOS, function(r) lapply(phis, function(p) {
    z <- cell_of(dat, r, p)
    !evaluable(z$extinct) ||
      within_band(z$saturation_generation, z$extinct, predicted(r, p), tol)
  }))))
}
raw_curvature <- function(dat) {
  all(vapply(RATIOS, function(r) {
    lows <- vapply(LOW, function(p) {
      z <- cell_of(dat, r, p)
      log_resid(z$saturation_generation, z$extinct, predicted(r, p))
    }, numeric(1))
    zb <- cell_of(dat, r, BASE_PHI)
    base <- log_resid(zb$saturation_generation, zb$extinct, predicted(r, BASE_PHI))
    isTRUE(curvature_up(mean(lows), base))
  }, logical(1)))
}

PRIMARY <- raw_primary(d)
SEC1    <- raw_band(d, LOW, TOL_LOW)
SEC2    <- raw_band(d, MID, TOL_MID)
SEC3    <- raw_curvature(d)
verdict <- function(x) if (isTRUE(x)) "HELD" else "FALSIFIED"

# ⚠️ NOT-EVALUABLE CELLS ARE REPORTED, NEVER FOLDED INTO A VERDICT.
not_evaluable <- cells[cells$n_extinct > MAX_EXTINCT_EVALUABLE, ]
censored <- cells[cells$n_censored > 0, ]

# ⚠️ SECONDARY 1 IMPLIES THE PRIMARY AT phi = 0.002, and the registration says so.
# If both hold, that is ONE finding reported twice. Computed rather than asserted,
# so the Result cannot quietly present it as two.
sec1_implies_primary <- predicted("5.00", PRIMARY_PHI) * (1 + TOL_LOW) <
                        HORIZONS[[as.character(PRIMARY_PHI)]]
stopifnot(sec1_implies_primary)
BITS_NOTE <- if (PRIMARY && SEC1) {
  "PRIMARY and SECONDARY 1 both held; SECONDARY 1 entails the PRIMARY here, so this is one finding reported twice."
} else if (PRIMARY && !SEC1) {
  "PRIMARY held and SECONDARY 1 failed — the case in which the pair carries two bits: everything saturates, but not when the law says."
} else {
  "The PRIMARY failed, which SECONDARY 1 cannot survive; the pair carries one bit."
}

# ---------------------------------------------------------------------------
# FIGURE 1 — t_sat against phi, log-log, with the frozen law and its bands.
#
# ⚠️ CENSORED CELLS ARE NOT PLOTTED AT A t_sat. They have none. They are drawn as
# an upward arrow AT THE HORIZON, which is the lower bound the run actually
# established, and the caption says how many there are. Drawing them at the
# horizon as if it were a measurement would be the "mark at a level the data does
# not measure" defect that 004 shipped twice.

law <- do.call(rbind, lapply(RATIOS, function(r) {
  p <- exp(seq(log(min(GRID) * 0.85), log(max(GRID) * 1.15), length.out = 200))
  data.frame(ratio = r, phi = p, t_sat = predicted(r, p), stringsAsFactors = FALSE)
}))
band_low <- do.call(rbind, lapply(RATIOS, function(r) {
  p <- exp(seq(log(min(LOW) * 0.85), log(max(LOW) * 1.15), length.out = 80))
  data.frame(ratio = r, phi = p, lo = predicted(r, p) * (1 - TOL_LOW),
             hi = predicted(r, p) * (1 + TOL_LOW), stringsAsFactors = FALSE)
}))
band_mid <- do.call(rbind, lapply(RATIOS, function(r) {
  p <- exp(seq(log(min(MID) * 0.9), log(max(MID) * 1.1), length.out = 80))
  data.frame(ratio = r, phi = p, lo = predicted(r, p) * (1 - TOL_MID),
             hi = predicted(r, p) * (1 + TOL_MID), stringsAsFactors = FALSE)
}))

measured <- cells[!is.na(cells$t_sat), ]
right_censored <- cells[is.na(cells$t_sat) & cells$n_extinct <= MAX_EXTINCT_EVALUABLE, ]

p_main <- ggplot() +
  geom_ribbon(data = band_low, aes(phi, ymin = lo, ymax = hi, fill = ratio),
              alpha = 0.16, colour = NA) +
  geom_ribbon(data = band_mid, aes(phi, ymin = lo, ymax = hi, fill = ratio),
              alpha = 0.16, colour = NA) +
  geom_line(data = law, aes(phi, t_sat, colour = ratio), linewidth = 0.5) +
  geom_errorbar(data = measured,
                aes(phi, ymin = t_sat - sem, ymax = t_sat + sem, colour = ratio),
                width = 0.03, linewidth = 0.4, na.rm = TRUE) +
  geom_point(data = measured, aes(phi, t_sat, colour = ratio, shape = ratio),
             size = 2.4) +
  scale_colour_manual(values = palette_003, name = "theta / sigmaS") +
  scale_fill_manual(values = palette_003, guide = "none") +
  scale_shape_manual(values = shape_003, name = "theta / sigmaS") +
  scale_x_log10(breaks = GRID, labels = format(GRID, drop0trailing = TRUE)) +
  scale_y_log10() +
  labs(x = "trap infidelity  phi", y = "generations to saturation  t_sat") +
  theme_tge()

if (nrow(right_censored) > 0) {
  p_main <- p_main +
    geom_segment(data = right_censored,
                 aes(x = phi, xend = phi, y = horizon * 0.82, yend = horizon,
                     colour = ratio),
                 arrow = grid::arrow(length = unit(0.14, "cm")), linewidth = 0.5)
}

# ---------------------------------------------------------------------------
# FIGURE 2 — the residual, because SECONDARY 3 is a statement about it.
#
# A prediction whose figure does not show its own observable is not being
# reported. 004's in-sample residuals are drawn alongside as open marks: they are
# where SECONDARY 3's motivation came from, and showing them is what makes the
# out-of-sample points readable as a test rather than a description.

resid_004 <- do.call(rbind, lapply(RATIOS, function(r) {
  z <- aggregate(saturation_generation ~ phi, data = f[f$ratio == r, ], FUN = mean)
  m <- stats::lm(log(saturation_generation) ~ log(phi), data = z)
  data.frame(ratio = r, phi = z$phi, resid = unname(residuals(m)),
             src = "004, in-sample", stringsAsFactors = FALSE)
}))
resid_005 <- data.frame(ratio = cells$ratio, phi = cells$phi, resid = cells$resid,
                        src = "005, out-of-sample", stringsAsFactors = FALSE)
resid_005 <- resid_005[!is.na(resid_005$resid), ]

p_resid <- ggplot(rbind(resid_004, resid_005),
                  aes(phi, resid, colour = ratio, shape = ratio)) +
  geom_hline(yintercept = 0, colour = "grey55", linewidth = 0.3) +
  geom_line(aes(group = interaction(ratio, src), linetype = src), linewidth = 0.4) +
  geom_point(aes(alpha = src), size = 2.2) +
  scale_colour_manual(values = palette_003, name = "theta / sigmaS") +
  scale_shape_manual(values = shape_003, name = "theta / sigmaS") +
  scale_alpha_manual(values = c("004, in-sample" = 0.4, "005, out-of-sample" = 1),
                     name = NULL) +
  scale_linetype_manual(values = c("004, in-sample" = "22", "005, out-of-sample" = "solid"),
                        name = NULL) +
  scale_x_log10() +
  labs(x = "trap infidelity  phi",
       y = "log(observed) - log(predicted)") +
  theme_tge() +
  # The ratio key is already on the panel above; only the 004/005 distinction is
  # new here. Suppressed explicitly rather than collected — see the note at the
  # composition step for why `guides = "collect"` cannot be used on this stack.
  guides(colour = "none", shape = "none")

# ---------------------------------------------------------------------------
# BUILD-TIME GUARD — a layer whose positions were censored by the scale limits is
# SILENTLY DROPPED, and the plot renders without it.
#
# ⚠️ 004 shipped a white mask at xmax = 0.139 under `scale_x_log10(limits =
# c(..., 0.135))`. ggplot censored it to NA, dropped the layer, and the figure
# was published with a comment asserting the fix worked. This runs
# `ggplot_build()` on every plot before it is saved and aborts if any layer lost
# a finite position, so the same class of defect cannot ship again — it is a
# CLASS check over every layer, not a check on the one geom that did it.

assert_nothing_censored <- function(p, nm) {
  built <- ggplot_build(p)
  for (i in seq_along(built$data)) {
    ld <- built$data[[i]]
    for (col in intersect(c("x", "y", "xmin", "xmax", "ymin", "ymax", "xend", "yend"),
                          names(ld))) {
      if (any(is.na(ld[[col]]))) {
        stop(sprintf(
          "%s: layer %d has NA in `%s` after scale training — the scale limits censored a position and ggplot will drop it silently. Fix the limits or the data, do not ship the plot.",
          nm, i, col))
      }
    }
  }
  invisible(TRUE)
}

# ⚠️ THE GUARD IS SEEN TO FAIL BEFORE IT IS TRUSTED. A guard that has only ever
# passed is a guard whose predicate has never been exercised; this project has
# shipped several. The injected plot puts a point outside deliberately narrowed
# limits, which is exactly the 004 defect.
canary <- ggplot(data.frame(x = c(1, 100), y = c(1, 1)), aes(x, y)) +
  geom_point() + scale_x_log10(limits = c(0.5, 10))
stopifnot(inherits(try(assert_nothing_censored(canary, "canary"), silent = TRUE), "try-error"))
# ... and seen to PASS on the same shape with limits that contain the data, so the
# canary is not failing for some unrelated reason.
canary_ok <- ggplot(data.frame(x = c(1, 5), y = c(1, 1)), aes(x, y)) +
  geom_point() + scale_x_log10(limits = c(0.5, 10))
stopifnot(isTRUE(assert_nothing_censored(canary_ok, "canary_ok")))

assert_nothing_censored(p_main, "fig-005-divergence")
assert_nothing_censored(p_resid, "fig-005-residuals")

# ---------------------------------------------------------------------------
# THE VERDICT GUARDS — each re-derived from an INJECTED CSV, not re-run on `d`.
#
# ⚠️ THIS IS THE CONTROL 004's ANALYSIS DID NOT HAVE. Three of its four verdict
# guards re-ran the same expression on the same object, so a corrupted cell
# changed the answer and left every guard green. Here each verdict is recomputed
# on a COPY OF THE RAW DATA WITH A TARGETED CORRUPTION, and the guard asserts the
# verdict MOVES. A guard that cannot be made to fail is not a guard.

inject <- function(dat, r, p, f) { i <- dat$ratio == r & dat$phi == p; dat[i, ] <- f(dat[i, ]); dat }

# PRIMARY: censor one seed at phi = 0.002 and the primary must fall.
d_no_sat <- inject(d, RATIOS[1], PRIMARY_PHI, function(z) {
  z$saturation_generation[1] <- NA; z$extinct[1] <- 0; z
})
stopifnot(isFALSE(raw_primary(d_no_sat)))
# ... and the same seed made extinct instead must NOT falsify it — extinction is
# not evidence of a floor, and the registration says so.
d_extinct <- inject(d, RATIOS[1], PRIMARY_PHI, function(z) {
  z$saturation_generation[1] <- NA; z$extinct[1] <- 1; z
})
stopifnot(isTRUE(raw_primary(d_extinct)) == isTRUE(raw_primary(d)))

# SECONDARY 1 and 2: push one cell far outside its band and the verdict must fall.
d_off_low <- inject(d, RATIOS[1], LOW[1], function(z) {
  z$saturation_generation <- z$saturation_generation * 3; z
})
stopifnot(isFALSE(raw_band(d_off_low, LOW, TOL_LOW)))
d_off_mid <- inject(d, RATIOS[1], MID[1], function(z) {
  z$saturation_generation <- z$saturation_generation * 3; z
})
stopifnot(isFALSE(raw_band(d_off_mid, MID, TOL_MID)))
# ... and a cell perturbed WELL INSIDE its band must not move the verdict, so the
# guard is testing the band and not merely reacting to any change at all.
d_inside <- inject(d, RATIOS[1], MID[1], function(z) {
  z$saturation_generation <- z$saturation_generation * 1.01; z
})
stopifnot(raw_band(d_inside, MID, TOL_MID) == raw_band(d, MID, TOL_MID))

# SECONDARY 3: drive the low-phi cells below the prediction and the curvature
# claim must fall.
d_flat <- d
for (r in RATIOS) for (p in LOW) {
  d_flat <- inject(d_flat, r, p, function(z) {
    z$saturation_generation <- z$saturation_generation * 0.5; z
  })
}
stopifnot(isFALSE(raw_curvature(d_flat)))
# ... and raising them must make it hold, so the guard responds to the DIRECTION
# it names rather than to disturbance.
d_up <- d
for (r in RATIOS) for (p in LOW) {
  d_up <- inject(d_up, r, p, function(z) {
    z$saturation_generation <- z$saturation_generation * 1.6; z
  })
}
stopifnot(isTRUE(raw_curvature(d_up)))

# ---------------------------------------------------------------------------
# COMPOSE, SAVE, REPORT.

subtitle <- sprintf(
  paste0("PRIMARY (no floor above phi = %s): %s   |   SECONDARY 1 (+-%d%% below the fitted range): %s\n",
         "SECONDARY 2 (+-%d%% inside it): %s   |   SECONDARY 3 (curvature continues, upward): %s"),
  PRIMARY_PHI, verdict(PRIMARY), round(TOL_LOW * 100), verdict(SEC1),
  round(TOL_MID * 100), verdict(SEC2), verdict(SEC3))

caption <- paste0(
  "Model frozen at 12e7b08. Constants a and C carried from 004 and re-derived from its committed CSV; ",
  "the law and both bands are 004's fit, not a fit to these data.\n",
  sprintf("%d runs, seeds 4001-4010, per-phi horizons %s. Error bars are +-1 SEM over 10 seeds.\n",
          nrow(d), paste(sprintf("%s:%d", names(HORIZONS), HORIZONS), collapse = " ")),
  if (nrow(right_censored) > 0)
    sprintf("%d cells never saturated and have NO t_sat; they are drawn as upward arrows at their horizon, which is a lower bound.\n",
            nrow(right_censored)) else "Every cell saturated; no censored points.\n",
  if (nrow(not_evaluable) > 0)
    sprintf("%d cells NOT EVALUABLE (more than %d extinct seeds) and excluded from every verdict.\n",
            nrow(not_evaluable), MAX_EXTINCT_EVALUABLE) else "",
  BITS_NOTE)

# ⚠️ TWO PATCHWORK TRAPS ON THIS STACK (patchwork 1.2.0, ggplot2 4.0.2), both hit
# while writing this file and both fatal at `ggsave`, not at composition:
#
#   1. `<patchwork> & <theme>` has no method: "Can't find method for generic `&`".
#      The legend position it used to set is already `theme_tge()`'s, so the
#      operator was redundant as well as fatal.
#   2. `plot_layout(guides = "collect")` dies in `guides_build` with "object is
#      not coercible to a unit", with or without an annotation theme. Duplicate
#      keys are suppressed on the lower panel with `guides(... = "none")` instead.
#
# ⚠️ AND ONE NON-TRAP, CHECKED RATHER THAN ASSUMED: `plot_annotation(theme = )`
# emits "annotation$theme is not a valid theme" on this stack because a ggplot2
# 4.0 theme is an S7 object patchwork's validity check does not recognise. THE
# THEME IS STILL APPLIED — measured, by rendering the same annotation at 6pt and
# 60pt title size and comparing grob heights (97.2pt vs 148.1pt). The warning is
# spurious; 004's figure was styled correctly. Recorded so the next reader does
# not "fix" a bug that is not there.
fig <- (p_main / p_resid) +
  plot_layout(heights = c(1.5, 1)) +
  plot_annotation(
    title = "Does the delay diverge, or is there a floor?",
    subtitle = subtitle, caption = caption,
    theme = theme_tge_annotation()
  )

ggsave(FIG_MAIN, fig, width = 9, height = 9.5, dpi = 200)
ggsave(FIG_RESID, p_resid +
         labs(title = "The residual, which is what SECONDARY 3 is about",
              subtitle = "004's in-sample residuals are the open series; they are where the prediction came from.") +
         theme_tge(), width = 9, height = 5, dpi = 200)

cat("\n=== QUESTION 005 ===\n")
cat(sprintf("PRIMARY      no floor above phi = %s ................ %s\n", PRIMARY_PHI, verdict(PRIMARY)))
cat(sprintf("SECONDARY 1  t_sat within +-%2d%% below fitted range ... %s\n", round(TOL_LOW * 100), verdict(SEC1)))
cat(sprintf("SECONDARY 2  t_sat within +-%2d%% inside it ............ %s\n", round(TOL_MID * 100), verdict(SEC2)))
cat(sprintf("SECONDARY 3  curvature continues, upward ............ %s\n", verdict(SEC3)))
cat("\n", BITS_NOTE, "\n\n", sep = "")
print(cells[, c("ratio", "phi", "pred", "t_sat", "sem", "resid", "n_censored", "n_extinct")],
      row.names = FALSE, digits = 4)

# The exponent's ratio-dependence is REPORTED AND NOT SCORED. The registration
# declines to predict it because SE(a) = 0.032 against an observed spread of
# 0.0143 — the estimator cannot resolve the effect. Printed with its standard
# error so the reason is visible rather than merely stated.
cat("\nrefitted exponents (DESCRIPTIVE, no verdict attached — see the registration):\n")
for (r in RATIOS) {
  z <- cells[cells$ratio == r & !is.na(cells$t_sat), ]
  if (nrow(z) < 3) { cat(sprintf("  ratio %s: only %d measured cells, not fitted\n", r, nrow(z))); next }
  m <- stats::lm(log(t_sat) ~ log(phi), data = z)
  s <- summary(m)$coefficients[2, 2]
  cat(sprintf("  ratio %s: a = %.4f +- %.4f (004 froze %.4f), over %d cells\n",
              r, -unname(coef(m)[2]), s, FROZEN[r, "a"], nrow(z)))
}
cat(sprintf("\nwrote %s and %s\n", FIG_MAIN, FIG_RESID))
