# Registered question 005 — does the delay diverge, or is there a floor?
# `docs/pre-registrations/2026-09-05-does-the-delay-diverge.md`.
#
# ⚠️ PROVENANCE, PRECISELY. The VERDICT LOGIC below — the predicates, the
# tolerances, the `raw_*` recounts and their injection controls — is as committed
# with the runner at `58af15c`, BEFORE ANY DATA EXISTED, with ONE EXCEPTION,
# named because the previous version of this paragraph — itself written to
# correct a false provenance claim — asserted "none of it has been touched
# since" and was wrong: **`raw_primary` was rewritten after the data existed**,
# to return NA rather than FALSE for a cell with too many extinct seeds. See
# Deviation 6 in the registration.
#
# ⚠️ AND NOT ONLY `raw_primary`. A previous version of this paragraph claimed
# every other predicate, tolerance, recount AND INJECTION CONTROL was
# byte-identical to `58af15c`. Also false: `verdict()` went from two-way to
# three-way, `BITS_NOTE` was rewritten to survive NA, `log_resid` now drops
# censored seeds instead of poisoning the cell, `raw_curvature` propagates NA
# instead of collapsing it to FALSE, and every injection control was re-pointed to
# a de-censored `d_ctl`. All are in Deviation 6. ⚠️ NO COUNT HERE: this sentence
# said SEVEN when there were nine, the same way the pixels-per-decade figure was
# wrong five times. The controls are registered in `INJECTION_CONTROLS` and
# counted there, where a count can be checked.
#
# ⚠️ FOUR SUCCESSIVE VERSIONS OF THIS PARAGRAPH HAVE BEEN FALSE, each written to
# correct the last, and each narrowed the claim by one item instead of diffing
# against `git show 58af15c:docs/analysis/plot-005.R` once. The fourth also
# called "the verdict recount structure" byte-identical while two of its three
# recounts had changed. The list below IS that diff.
# ⚠️ THE NEXT LINE IS PARSED BY GUARD 6, NOT TRUSTED. It listed SEVEN names
# while `UNCHANGED_POST_DATA` listed nine — `inject` and `assert_nothing_censored`
# were in the code's list and not in the header's — which is this file's signature
# defect (a re-typed copy drifting from the thing it copies) sitting inside the
# guard written to stop provenance prose from drifting. Guard 6 now extracts the
# backticked names from this one line and requires set equality with the code.
# BYTE-IDENTICAL-TO-PRE-DATA: `predicted`, `all_saturated`, `within_band`,
# `curvature_up`, `evaluable`, `raw_band`, `cell_of`, `inject`,
# `assert_nothing_censored` -- plus every tolerance and grid constant.
# The FIGURE CODE has been revised extensively after the data
# existed, during the review gate: see Deviation 5 in the registration. Several
# figure choices are explicitly data-dependent (the y breaks are computed from
# the observed cell means; the axis range is set from them). An earlier version
# of this header said "Nothing below was chosen after seeing a result", which was
# true of the verdicts and false of the file.
#
# ⚠️ EVERY PREDICATE CARRIES POSITIVE **AND** NEGATIVE CONTROLS, ASSERTED BEFORE
# THE PREDICATE IS USED ON REAL DATA. During 004's review six guards of the form
# `grepl(v, sprintf("...v..."))` were found to be tautologies and REMOVED BEFORE
# 004 SHIPPED — `plot-004.R` contains no `grepl` at any revision. ⚠️ An earlier
# version of this comment said 004 SHIPPED them and added "five of the form
# `v %in% c(HELD,FALSIFIED)`", a shape present in no `.R` file at any revision
# here: a fabricated characterisation of another experiment's code, in the header
# of the file whose doctrine is never to assert what you can check. Three of its
# four verdict
# guards re-ran the same expression on the same object, which a reviewer
# demonstrated by injecting a wrong cell class and watching the script finish
# green with a different answer. Every verdict here is RECOUNTED FROM THE RAW CSV.
#
# ⚠️ THE CLASS RULE, from 004's ROADMAP entry: no mark may sit at a level the data
# does not measure. In 005 that binds on CENSORED CELLS — a run that never
# saturated has no t_sat, and must never be drawn at one. It is drawn as an
# upward arrow AT ITS HORIZON, which is a lower bound the data does support.

source("docs/analysis/theme.R")

CSV     <- "experiments/005-delay-divergence.csv"
CSV_004 <- "experiments/004-fidelity-band.csv"
FIG_MAIN <- "docs/analysis/fig-005-divergence.png"
FIG_REL  <- "docs/analysis/fig-005-tolerance.png"

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
# ⚠️ CENSORED SEEDS ARE DROPPED, NOT PROPAGATED AS NA. The registration says a
# censored seed makes the low-phi residual a LOWER BOUND, which can only support
# SECONDARY 3, and that a cell with any censored seed is scored on the
# non-censored seeds alone. The previous version returned NA for the whole cell,
# `curvature_up` passed the NA on, `raw_curvature` collapsed it with `isTRUE`,
# and `verdict()` printed FALSIFIED — the exact word the registration forbids
# for this case, and the same class as Deviation 6 one function over, under a
# banner in this file reading "NA IS NOT EVALUABLE, NOT FALSIFIED".
log_resid <- function(sat, extinct, pred) {
  live <- sat[extinct == 0]
  live <- live[!is.na(live)]
  if (length(live) == 0) return(NA_real_)
  log(mean(live)) - log(pred)
}
stopifnot(abs(log_resid(c(110, 110), c(0, 0), 100) - log(1.1)) < 1e-12)
# A censored seed is DROPPED (the surviving seeds still score the cell), and
# only a cell with nothing left is NA. The previous control asserted the old
# semantics and caught this change, which is what a control is for.
stopifnot(abs(log_resid(c(100, NA), c(0, 0), 100)) < 1e-12)
stopifnot(is.na(log_resid(c(NA, NA), c(0, 0), 100)))
stopifnot(is.na(log_resid(c(NA, 100), c(0, 1), 100)))   # last live seed censored

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
# ⚠️ TWO NAMES, BECAUSE ONE WAS REUSED AND IT PUT FALSE NUMBERS ON THE FIGURE.
# `f` was read whole and then overwritten with the SATURATING subset. A later
# subtitle derived "004 ran N runs below phi = 0.008" from it — and every 004
# row below 0.008 is non-saturating BY DEFINITION, so the shipped figure said
# "004 ran 0 runs there, all still CONTROLLED at 1785" (truth: 90 runs, horizon
# 1800; 1785 is the largest saturation generation ABOVE 0.008, not a horizon).
# That sentence has now been wrong three times, and this time it was wrong
# BECAUSE it was derived: deriving beats asserting only when you derive from the
# right frame. Both numbers are pinned below.
f_all <- read.csv(CSV_004, colClasses = c(ratio = "character"), stringsAsFactors = FALSE)
f <- f_all[!is.na(f_all$saturation_generation), ]   # the FITTED cells only
N_004_SUB <- sum(f_all$phi > 0 & f_all$phi < 0.008)
H_004_SUB <- max(f_all$stopped_at[f_all$phi > 0 & f_all$phi < 0.008])
stopifnot(N_004_SUB == 90, H_004_SUB == 1800,
          all(f_all$outcome[f_all$phi > 0 & f_all$phi < 0.008] == "CONTROLLED"))
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
# ⚠️ EXTINCTION MUST NEVER FALSIFY THE PRIMARY, and the first version of this
# function did exactly that: `evaluable(...) && all_saturated(...)` returns FALSE
# for a cell with too many extinct seeds, which the caption then printed as
# "PRIMARY ... FALSIFIED". The registration says in as many words that an element
# which died did not demonstrate a floor. Inert on this data (0 extinctions in
# 150 runs) and fixed anyway, because it is the caption's own generator.
raw_primary <- function(dat) {
  ok <- vapply(RATIOS, function(r) {
    z <- cell_of(dat, r, PRIMARY_PHI)
    if (!evaluable(z$extinct)) return(NA)     # NOT EVALUABLE, never falsified
    all_saturated(z$saturation_generation, z$extinct)
  }, logical(1))
  if (all(is.na(ok))) return(NA)
  all(ok[!is.na(ok)])
}
raw_band <- function(dat, phis, tol) {
  all(unlist(lapply(RATIOS, function(r) lapply(phis, function(p) {
    z <- cell_of(dat, r, p)
    !evaluable(z$extinct) ||
      within_band(z$saturation_generation, z$extinct, predicted(r, p), tol)
  }))))
}
# ⚠️ NON-EVALUABLE CELLS ARE EXCLUDED HERE TOO. `log_resid` drops censored and
# extinct SEEDS, but a cell with more than three extinct seeds is excluded from
# every OTHER verdict — and the caption says so in as many words — while this
# function still scored it. One image then carried "2.00: censored" for
# SECONDARY 3's comparison and a flat SECONDARY 3 HELD that included ratio 2.00.
# Returns the per-ratio verdict vector so the scored count and the verdict come
# from ONE definition — they had two, and disagreed: a ratio dropped for an
# unscorable LOW cell still counted as scored because the count looked only at
# the baseline cell.
curvature_per_ratio <- function(dat) {
  # NA (nothing left to score at some ratio) propagates as NOT EVALUABLE, never
  # as FALSIFIED.
  per <- vapply(RATIOS, function(r) {
    lows <- vapply(LOW, function(p) {
      z <- cell_of(dat, r, p)
      if (!evaluable(z$extinct)) return(NA_real_)
      log_resid(z$saturation_generation, z$extinct, predicted(r, p))
    }, numeric(1))
    zb <- cell_of(dat, r, BASE_PHI)
    base <- if (!evaluable(zb$extinct)) NA_real_ else
      log_resid(zb$saturation_generation, zb$extinct, predicted(r, BASE_PHI))
    if (any(is.na(lows)) || is.na(base)) NA else curvature_up(mean(lows), base)
  }, logical(1))
  per
}
raw_curvature <- function(dat) {
  per <- curvature_per_ratio(dat)
  if (all(is.na(per))) return(NA)
  all(per[!is.na(per)])
}

PRIMARY <- raw_primary(d)
# How much of each universally-quantified prediction was actually scorable.
n_scored_ratio <- function() sum(vapply(RATIOS, function(r) {
  z <- cell_of(d, r, PRIMARY_PHI); evaluable(z$extinct)
}, logical(1)))
SCORED_PRIMARY <- n_scored_ratio()
# Scored-cell counts for the two band predictions, so a verdict resting on
# fewer cells than registered says so instead of printing a flat HELD.
# ⚠️ ONE DEFINITION: a cell is scored iff `raw_band` scores it, i.e. iff it is
# EVALUABLE. The extra `!all(is.na(...))` made a fully-censored cell "unscored"
# while `raw_band` scored it as OUTSIDE — so the summary printed
# "FALSIFIED (3 of 6 scored)" with every scored cell inside its band and the
# falsifiers filed under "unscored".
n_scored_cells <- function(phis) sum(unlist(lapply(RATIOS, function(r)
  lapply(phis, function(pp) evaluable(cell_of(d, r, pp)$extinct)))))
SCORED_LOW <- n_scored_cells(LOW)
SCORED_MID <- n_scored_cells(MID)
SCORED_SEC3 <- sum(!is.na(curvature_per_ratio(d)))
SEC1    <- raw_band(d, LOW, TOL_LOW)
SEC2    <- raw_band(d, MID, TOL_MID)
SEC3    <- raw_curvature(d)
# ⚠️ NA IS "NOT EVALUABLE", NOT "FALSIFIED". `raw_primary` was changed to return
# NA for a cell with too many extinct seeds precisely so extinction could never
# falsify the primary — and this function then mapped that NA straight to
# "FALSIFIED", printing it into both captions and the summary. The fix did not
# reach the thing its own comment said it existed to protect. It is also the one
# predicate in this file that had no controls, under a header demanding them.
# ⚠️ AND HOW MUCH WAS SCORED. These predictions are universally quantified ("at
# EVERY registered ratio"), and `raw_curvature`/`raw_band` drop a ratio or cell
# they cannot score — so a run with one ratio entirely censored printed a flat
# HELD for a verdict resting on two of three ratios, with nothing anywhere
# saying so.
verdict <- function(x, scored = NA_integer_, total = NA_integer_) {
  v <- if (isTRUE(x)) "HELD" else if (isFALSE(x)) "FALSIFIED" else "NOT EVALUABLE"
  if (!is.na(scored) && !is.na(total) && scored < total) {
    v <- sprintf("%s (%d of %d scored)", v, scored, total)
  }
  v
}
stopifnot(verdict(TRUE) == "HELD", verdict(FALSE) == "FALSIFIED",
          verdict(NA) == "NOT EVALUABLE",
          # ⚠️ AND THE QUALIFIER BRANCH, which Deviation 6 added and nothing
          # exercised: blanking it left every control green.
          verdict(TRUE, 2, 3) == "HELD (2 of 3 scored)",
          verdict(TRUE, 3, 3) == "HELD",
          verdict(FALSE, 5, 6) == "FALSIFIED (5 of 6 scored)",
          verdict(NA, 1, 3) == "NOT EVALUABLE (1 of 3 scored)")

# ⚠️ NOT-EVALUABLE AND CENSORED CELLS ARE REPORTED, NEVER FOLDED INTO A VERDICT —
# and "reported" must mean PRINTED. The previous cut computed both frames under
# this comment and referenced neither again, so on a run with extinctions the
# script would have discarded them silently: the caption-naming-a-missing-glyph
# class, relocated from the figure into the analysis.
not_evaluable <- cells[cells$n_extinct > MAX_EXTINCT_EVALUABLE, ]
censored <- cells[cells$n_censored > 0, ]
cat(sprintf("cells NOT EVALUABLE (>%d extinct seeds): %d;  cells with any censored seed: %d\n",
            MAX_EXTINCT_EVALUABLE, nrow(not_evaluable), nrow(censored)))
if (nrow(not_evaluable) > 0) print(not_evaluable[, c("ratio", "phi", "n_extinct")], row.names = FALSE)
if (nrow(censored) > 0) print(censored[, c("ratio", "phi", "n_censored")], row.names = FALSE)

# ⚠️ SECONDARY 1 IMPLIES THE PRIMARY AT phi = 0.002, and the registration says so.
# If both hold, that is ONE finding reported twice. Computed rather than asserted,
# so the Result cannot quietly present it as two.
sec1_implies_primary <- predicted("5.00", PRIMARY_PHI) * (1 + TOL_LOW) <
                        HORIZONS[[as.character(PRIMARY_PHI)]]
stopifnot(sec1_implies_primary)
BITS_NOTE <- if (!isTRUE(PRIMARY) && !isFALSE(PRIMARY)) {
  "The PRIMARY is NOT EVALUABLE, so the pair carries no bits."
} else if (isTRUE(PRIMARY) && isTRUE(SEC1)) {
  "PRIMARY and SECONDARY 1 both held; SECONDARY 1 entails the PRIMARY here, so this is one finding reported twice."
} else if (isTRUE(PRIMARY) && !isTRUE(SEC1)) {
  "PRIMARY held and SECONDARY 1 failed — the case in which the pair carries two bits: everything saturates, but not when the law says."
} else {
  "The PRIMARY failed, which SECONDARY 1 cannot survive; the pair carries one bit."
}

# ⚠️ ONE SCORED SET, READ BY EVERY DERIVED STRING AND EVERY GEOM. They had
# drifted apart: the geoms dropped censored and NOT-EVALUABLE cells while
# `rel_low2`, `devs_at`, `marginal` and `sem_pct` still read all of `cells`. The
# consequences were both live — the title printed "wrong by NA% to NA%" when the
# phi = 0.002 cell was censored (the PRIMARY's own falsification), and it took
# its headline range from a NOT-EVALUABLE cell that is excluded from every
# verdict and drawn on neither figure.
ne_key0 <- paste(not_evaluable$ratio, not_evaluable$phi)
scored <- cells[!is.na(cells$t_sat) & !(paste(cells$ratio, cells$phi) %in% ne_key0), ]
rel_low2 <- scored$t_sat[scored$phi == PRIMARY_PHI] / scored$pred[scored$phi == PRIMARY_PHI]

# ⚠️ DERIVED, NOT TYPED. Every data-dependent phrase below used to be a string
# literal, including the clause naming WHICH cells falsified SECONDARY 1. A
# reviewer multiplied the phi = 0.004 rows by 1.05 so that secondary 1 also fails
# there, re-ran, and the script exited 0 with all five guards green while
# shipping a caption reading "failed at phi = 0.002 ONLY ... 0.004 is INSIDE" —
# false on the panel it was printed on, and contradicting the title on the same
# image, which WAS derived. The doctrine is in theme.R and this file asserted it
# 300 lines above while violating it here.
failing_cells <- do.call(rbind, lapply(RATIOS, function(r) {
  do.call(rbind, lapply(GRID, function(pp) {
    z <- cell_of(d, r, pp)
    tol <- if (pp %in% LOW) TOL_LOW else TOL_MID
    if (!evaluable(z$extinct)) return(NULL)
    if (within_band(z$saturation_generation, z$extinct, predicted(r, pp), tol)) return(NULL)
    data.frame(ratio = r, phi = pp, stringsAsFactors = FALSE)
  }))
}))
# ⚠️ CELLS, NOT PHI. Collapsing (ratio, phi) to phi and then printing all three
# ratios under "Outside tolerance" presented passing ratios as failing ones —
# inert here only because all three ratios fail together at phi = 0.002.
fail_phi <- if (is.null(failing_cells)) numeric(0) else sort(unique(failing_cells$phi))
pass_low <- setdiff(LOW, fail_phi)
# ⚠️ A CENSORED CELL HAS NO MAGNITUDE AND MUST NOT PRINT ONE. This produced
# "NA%" inline in a list of deviations — the registration says in as many words
# that the Result must not present a censored cell as if it carried a magnitude.
devs_at <- function(pp) {
  v <- scored$t_sat[scored$phi == pp] / scored$pred[scored$phi == pp]
  if (length(v) == 0) return("no scored cell")
  # ⚠️ LABELLED. An unlabelled positional list silently mis-attributes: with one
  # cell unscored the remaining two values shift left and read as belonging to
  # the wrong ratios. The censored branch below is also unreachable now that `v`
  # comes from `scored` — the cell VANISHES rather than printing NA%, which is
  # why the labels matter.
  rr <- scored$ratio[scored$phi == pp]
  paste(sprintf("%s %+.1f%%", rr, 100 * (v - 1)), collapse = " / ")
}
# Failing CELLS spelled out, so a caption can never present a passing ratio as
# a failing one.
fail_txt <- if (is.null(failing_cells)) "" else paste(
  sprintf("%s@%s", failing_cells$ratio, failing_cells$phi), collapse = ", ")

scope_line <- if (length(fail_phi) == 0) {
  "No cell fell outside its registered tolerance."
} else {
  paste0("Outside tolerance at ", fail_txt,
         if (length(pass_low) > 0)
           paste0("; phi = ", paste(pass_low, collapse = ", "), " (",
                  paste(sapply(pass_low, devs_at), collapse = "; "),
                  ") is INSIDE the registered +-", round(TOL_LOW * 100), "%.")
         else ".")
}

# The marginal-cell sentence, derived. It was a literal reading "One cell's
# mean is inside its tolerance ...", which shipped unchanged beside a caption
# that had counted two.
# ⚠️ CONTROLS FOR THE MARGINAL PREDICATE, which generates the Result's own
# scientific caveat and had none, under a header demanding them for every
# predicate. `is_marginal` is the same test `marginal` applies, exercised on
# constructed cells rather than on today's data.
is_marginal <- function(rel, se, tol) {
  ((rel - se) < (1 - tol) || (rel + se) > (1 + tol)) && rel >= 1 - tol && rel <= 1 + tol
}

tol_of <- function(pp) if (pp %in% LOW) TOL_LOW else TOL_MID
marginal <- do.call(rbind, lapply(seq_len(nrow(scored)), function(i) {
  cc <- scored[i, ]; if (is.na(cc$t_sat)) return(NULL)
  tol <- tol_of(cc$phi); rel <- cc$t_sat / cc$pred; se <- cc$sem / cc$pred
  # ⚠️ CALLS `is_marginal`, which the controls exercise. This was a re-typed copy
  # of that predicate, so changing the copy alone left every control green — the
  # fourth "canary tests a re-typed expression" in this file.
  if (is_marginal(rel, se, tol)) {
    return(cbind(cc, rel = rel, se = se))
  }
  NULL
}))
n_marg <- if (is.null(marginal)) 0 else nrow(marginal)
# (0.914/0.014 rounds to exactly 0.900 and is NOT a crossing — the first canary
# used those and correctly failed. The shipped cell is 0.91367/0.01401.)
stopifnot(isTRUE(is_marginal(0.91367, 0.01401, 0.10)))  # mean inside, SEM crosses
stopifnot(isFALSE(is_marginal(0.950, 0.005, 0.10)))   # comfortably inside
stopifnot(isFALSE(is_marginal(0.850, 0.005, 0.10)))   # mean already outside
stopifnot(n_marg == sum(vapply(seq_len(nrow(scored)), function(i) {
  cc <- scored[i, ]
  is_marginal(cc$t_sat / cc$pred, cc$sem / cc$pred, tol_of(cc$phi))
}, logical(1))))
marg_subtitle <- if (n_marg == 0) {
  "No cell holds on its mean with a +-1 SEM interval crossing its bound."
} else {
  sprintf("%d cell%s hold%s on the mean with a +-1 SEM interval crossing the bound; the caption names %s.",
          n_marg, if (n_marg == 1) "" else "s", if (n_marg == 1) "s" else "",
          if (n_marg == 1) "it" else "them")
}

sem_pct <- 100 * scored$sem / scored$t_sat
sem_line <- sprintf("The SEM is %.2f-%.2f%% of the cell mean", min(sem_pct, na.rm = TRUE), max(sem_pct, na.rm = TRUE))

# ---------------------------------------------------------------------------
# THE FIGURES — ONE GRAPH PER FIGURE.
#
# ⚠️ THIS FIGURE WENT THROUGH A LONG ADVERSARIAL GATE AND SEVERAL ROUNDS FOUND
# DEFECTS THE PREVIOUS ROUND'S FIX HAD CREATED. THE CANONICAL ROUND-BY-ROUND
# RECORD IS IN THE REGISTRATION'S Result — do not restate a count here, because
# three different counts once shipped across this file and that document. What changed and why, so none of it is re-introduced:
#
#  (Round numbers are NOT given here; the canonical table is in the registration
#  and an earlier version of this block mis-attributed the faceting fix by nine
#  rounds.) All three ratios' +-25% ribbons were drawn on one absolute panel at
#  alpha 0.16 and overplotted into a blob whose only visible upper edge belonged
#  to the WIDEST ratio. Two of the three cells that FALSIFY secondary 1 rendered
#  INSIDE the shading and the ranking was inverted — the two largest deviations
#  looked contained, the smallest looked like the only escape. Fixed by scoring on
#  a RATIO-NORMALISED axis, where each cell is expressed against its own
#  prediction so one tolerance serves all three.
#
#  Later rounds: (a) Titles and captions were TRUNCATED at the canvas edge: figure 1's
#  read "...is wrong below", losing "its range" and turning a scoped claim into an
#  unscoped one. Now wrapped, and guarded by reading the rendered PNG. (b) The
#  caption said "open marks are 004's" while `fill = NA` on shapes 15/16/17 is a
#  NO-OP — there were no open marks. (`shape_003_open` went into theme.R for this
#  and is unused here now: 004's points were removed from the figure two rounds
#  later.) (c) The tolerance was
#  drawn as a CONTINUOUS RECT spanning phi where no tolerance was registered,
#  swallowing 004 points that were never subject to it — the class rule applied on
#  X, which round 1 only applied on Y. Now a bracket at each registered phi and
#  nowhere else. (d) The fills were never contrast-checked because the guard
#  looped over `palette_003` only: they rendered at 1.12:1 and were 1.014:1 from
#  each other. The guard now covers every colour any scale draws. (e) Ratio 2.00
#  was occluded at three of five cells, including the +43.1% cell that carries the
#  headline. Now faceted, so nothing overplots.

lab_phi <- function(x) format(x, drop0trailing = TRUE, scientific = FALSE)
FITTED_LO <- min(f$phi[f$phi > 0 & !is.na(f$saturation_generation)])   # 004 fitted from here up
stopifnot(FITTED_LO == 0.008)

law <- do.call(rbind, lapply(RATIOS, function(r) {
  p <- exp(seq(log(min(GRID)), log(max(GRID)), length.out = 200))
  data.frame(ratio = r, phi = p, t_sat = predicted(r, p), stringsAsFactors = FALSE)
}))
measured <- cells[!is.na(cells$t_sat) &
                  !(paste(cells$ratio, cells$phi) %in% paste(not_evaluable$ratio, not_evaluable$phi)), ]
# ⚠️ DERIVED, NOT ASSERTED. The title once said "wrong by more than 37%" while
# ratio 5.00 is +36.996% — a numeric floor manufactured by rounding, in the one
# line every reader takes away, in a project whose theme file says a number you
# can compute should never be a number you assert.

# ⚠️ A GRIDLINE MUST NOT PASS UNDER A MARKER. A size-2.2 pch-17 marker's apex
# reaches roughly 0.029 decades above its datum on this panel, so a break within that of a cell
# mean is erased by the mark a reader is trying to read against it. Asserted, not
# eyeballed: two eyeballed sets in a row failed this.
# ⚠️ SEARCHED, NOT TYPED. This was a literal under a comment reading "BREAKS
# CHOSEN BY COMPUTATION" — only the CHECK was computed — and the guard then
# turned a perfectly plausible dataset into a hard abort: scaling the phi = 0.002
# rows by 0.85 (the world in which secondary 1 HELD) made a break collide with a
# cell mean and the pre-specified analysis exited 1 with no figure, unable to
# render one of the two outcomes it was registered to distinguish.
Y_BREAKS <- local({
  cand <- as.vector(outer(c(1, 1.5, 2, 2.5, 3, 4, 5, 6, 8), 10^(2:4)))
  cand <- sort(cand[cand > min(cells$t_sat, na.rm = TRUE) * 0.72 &
                    cand < max(cells$t_sat, na.rm = TRUE) * 1.28])
  ok <- cand[vapply(cand, function(b)
    min(abs(log10(b) - log10(cells$t_sat[!is.na(cells$t_sat)]))) > 0.030, logical(1))]
  if (length(ok) < 3) stop("no y break set clears every cell mean by a marker half-height")
  # Thin to a readable set: keep breaks at least 0.28 decades apart.
  keep <- ok[1]
  for (b in ok[-1]) if (log10(b) - log10(keep[length(keep)]) >= 0.28) keep <- c(keep, b)
  keep
})
# ⚠️ 0.030, NOT 0.020 — AND THE OLD VALUE WAS WRONG FOR ONE OF THE THREE SHAPES.
# The constant was derived from a circle/square half-height of ~7 px, but
# `shape_003["2.00"]` is pch 17, whose apex sits a full radius above the datum
# (not half). ⚠️ NO PIXEL MEASUREMENT IS QUOTED: "10.4 px = 0.0253 in log10 on the
# shipped render" stood here, in the same file that struck five successive
# pixels-per-decade numbers for being asserted rather than derived, and a render
# at a different size makes it false. What is checkable is the assertion below.
# The previous break set
# cleared 0.020 and the triangle at the +43.1% headline cell then erased a pixel
# of the 5000 gridline. A per-shape constant would be better still; 0.030 bounds
# the largest shape this figure draws, and the assertion below is what makes the
# claim checkable rather than asserted.
MARKER_HALF_LOG10 <- 0.030
# ⚠️ A FUNCTION WITH CANARIES, LIKE EVERY OTHER GUARD. The first cut of this
# check was a bare `if` whose "seen to fail" line asserted the EXPRESSION, not
# the guard — so replacing the `if` with `if (FALSE)` left the script green.
# That is verbatim the defect this file diagnoses for guard 2 four hundred
# lines below, committed in the guard written after reading it.
assert_no_break_under_mark <- function(breaks, vals, half) {
  g <- min(vapply(breaks, function(b) min(abs(log10(b) - log10(vals))), numeric(1)))
  if (g <= half) {
    stop(sprintf("a y break is %.4f in log10 from a cell mean, inside the %.3f marker half-height — the mark will erase the gridline",
                 g, half))
  }
  invisible(TRUE)
}
stopifnot(inherits(try(assert_no_break_under_mark(c(1000), c(1000), 0.03), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_no_break_under_mark(c(1000), c(4000), 0.03)))
assert_no_break_under_mark(Y_BREAKS, measured$t_sat, MARKER_HALF_LOG10)
right_censored <- cells[is.na(cells$t_sat) & cells$n_extinct <= MAX_EXTINCT_EVALUABLE, ]
# ⚠️ THE PREDICATE FIGURE 1'S HEADLINE NEEDS, WHICH `PRIMARY` IS NOT. `PRIMARY`
# reads phi = 0.002 only; "every registered infidelity" ranges over all 15 cells.
ALL_CELLS_SATURATED <- all(!is.na(cells$t_sat))
stopifnot(is.logical(ALL_CELLS_SATURATED), !is.na(ALL_CELLS_SATURATED),
          # It must be able to see a cell the PRIMARY cannot: censoring the
          # highest-phi cell must flip it, and that is asserted, not assumed.
          isFALSE(all(!is.na(replace(cells$t_sat, which.max(cells$phi), NA)))))

wrap <- function(...) paste(..., sep = "\n")
# ⚠️ HARD-WRAPPED. `scope_line` and `prov` grow with the data — a censored cell
# lengthens both — and guard 3 then aborts on ink at the canvas edge, i.e. the
# analysis failed to render in exactly the world the PRIMARY's falsification
# lives in. Derived text must be wrapped, not assumed short.
hard_wrap <- function(x, width = 150) paste(strwrap(x, width = width), collapse = "\n")
# ⚠️ `hard_wrap` COLLAPSES DELIBERATE LINE BREAKS: strwrap treats a single \n as
# ordinary whitespace, so wrapping a multi-line block with it reflows the block
# into one paragraph. The provenance block is three lines ON PURPOSE and was
# therefore left unwrapped entirely — which meant its longest line was bounded by
# nothing but the run count and the horizon list. Wrap each line separately.
wrap_lines <- function(x, width = 150) {
  paste(vapply(strsplit(x, "\n", fixed = TRUE)[[1]], hard_wrap, character(1),
               width = width, USE.NAMES = FALSE), collapse = "\n")
}
# Both halves of the reason this exists, asserted: it must wrap a long line AND
# it must not merge two short ones.
stopifnot(grepl("\n", wrap_lines(strrep("x123456789 ", 30), 40), fixed = TRUE),
          identical(wrap_lines("aa\nbb", 150), "aa\nbb"))

# --- FIGURE 1: the law and the data, absolute ------------------------------
# ⚠️ NO SHADED REGION. Two cuts of it were defective and the second was worse
# than the first: as an `annotate("rect")` drawn after the theme's grid it PAINTED
# OVER the y-gridlines at exactly phi = 0.002 and 0.004 — the two columns carrying
# the +43% headline — leaving the reader no reference to read them against, and
# its hard top and bottom edges sat at `max*1.45` and `min*0.62`, arbitrary
# t_sat levels the data never measured. That is this project's own class rule
# broken on the y-axis by the layer added to mark something on the x-axis. A
# dashed rule and one sentence carry the same information and assert nothing.
Y_LO <- min(measured$t_sat) * 0.80
Y_HI <- max(measured$t_sat) * 1.20
p_main <- ggplot() +
  geom_vline(xintercept = FITTED_LO, colour = tge_ink[["extrapolation_rule"]], linetype = "22", linewidth = 0.4) +
  geom_line(data = law, aes(phi, t_sat, colour = ratio, linetype = ratio),
            linewidth = 0.55) +
  # ⚠️ NO ERROR BARS ON THIS FIGURE, AND THAT IS THE HONEST ANSWER RATHER THAN A
  # SMALLER MARKER. Measured: the SEM is 0.86%-2.48% of each cell mean, and this
  # panel is log-scaled and wide, so a 0.86-2.48% SEM is a few pixels — under any
  # legible marker. ⚠️ "1.3 decades over ~7 inches" stood here: BOTH numbers were
  # wrong (the panel spans the range set by the cell means, and the device is 13 in
  # wide across three facets), in the very block below that swears off quoting a
  # pixel figure. The percentage is the derived quantity and the only one needed.
  #
  # ⚠️ NO PIXELS-PER-DECADE NUMBER IS QUOTED HERE, DELIBERATELY. This comment
  # asserted ~500, then 432, then 412, then 392, each time calling it measured;
  # the last version cited "gridline rows" one of which was a MARKER. The
  # quantity is also data-dependent — the y range comes from the cell means, so a
  # censored cell moves it — and computing it from the built grob disagreed with
  # counting it off the render. Six attempts, six different values,
  # and the caption never needed it: what a reader needs is that the interval is
  # smaller than the marker, which is stated as a percentage that IS derived.
  # any legible marker. Three successive cuts tried to draw it (caps on, caps
  # off, marker shrunk) and every one shipped a subtitle naming bars that were
  # invisible inside their own glyphs. An interval that cannot be drawn at this
  # scale should be reported as a number, which the caption now does — the same
  # call already made for the SEM crossing. Figure 2's panels are far shorter in
  # data range, so the same interval is legible there and it keeps its bars — the
  # difference is the RANGE, which is derived, not a pixel count, which is not.
  # ⚠️ '9-26 px' stood here and was the HALF-interval, two lines below a sentence
  # that defines the quantity as the whole one.
  # ⚠️ SIZE 2.2, ENLARGED once faceting removed the collision that three
  # successive shrinks (2.4 -> 2.3 -> 1.8) each failed to remove: on one panel the
  # 3.33 circle held the TERMINUS of 2.00's own law line. With one series per
  # panel that cannot happen at any legible size.
  geom_point(data = measured, aes(phi, t_sat, colour = ratio, shape = ratio),
             size = 2.2) +
  # ⚠️ `limits`/`drop = FALSE` on all three. Without them a ratio with no drawn
  # points trains the shape scale on two levels while colour and linetype train
  # on three, ggplot cannot merge the guides, and the figure ships TWO legends
  # both titled "theta / sigmaS".
  scale_colour_manual(values = palette_003, name = "theta / sigmaS", limits = RATIOS, drop = FALSE) +
  scale_shape_manual(values = shape_003, name = "theta / sigmaS", limits = RATIOS, drop = FALSE) +
  scale_linetype_manual(values = linetype_ratio, name = "theta / sigmaS", limits = RATIOS, drop = FALSE) +
  # ⚠️ NO TICK AT 0.008. 005 measured nothing there; the dashed rule and the
  # subtitle carry it. A labelled tick with no data is a mark at a position the
  # data does not measure — this figure's own class rule.
  scale_x_log10(breaks = GRID, labels = lab_phi) +
  # ⚠️ BREAKS CHOSEN BY COMPUTATION, AND ASSERTED. Two hand-picked sets in a row
  # put a gridline under a marker: 6000 sat 3 px below the phi = 0.002 cell at
  # ratio 5.00 and was blanked over 16 px, and the "fix" to 7000 simply moved
  # the collision to 3000 under the phi = 0.004 cell — 16 px again, under a
  # comment claiming the class was handled. A mark that ERASES the only
  # reference for reading its own value is worse than a faint one, and eyeballing
  # break positions had already failed twice. `Y_BREAKS` is verified below to
  # clear every one of the 15 cell means by more than a marker half-height.
  scale_y_log10(breaks = Y_BREAKS) +
  # ⚠️ FACETED, LIKE FIGURE 2, BECAUSE SHRINKING MARKERS DID NOT WORK THREE TIMES.
  # On one panel the three series share every x, so a marker of any legible size
  # can contain another series' law-line vertex: at phi = 0.0453 the 3.33 circle
  # held the TERMINUS of 2.00's law line, and at phi = 0.004 it overpainted
  # 5.00's. Each shrink removed one collision and left another,
  # under a comment claiming the class was gone. Faceting removes the
  # POSSIBILITY rather than the instance.
  facet_wrap(~ratio, nrow = 1,
             labeller = labeller(ratio = function(x) paste("theta/sigmaS =", x))) +
  expand_limits(y = c(Y_LO, Y_HI)) +
  guides(linetype = guide_legend(keywidth = unit(1.7, "cm")),
         colour = guide_legend(keywidth = unit(1.7, "cm"))) +
  # ⚠️ AFTER `theme_tge()`, NOT BEFORE. `theme_tge()` returns `theme_minimal() +
  # theme(...)`, a COMPLETE theme, and ggplot2 replaces the accumulated theme with
  # a complete one — so a partial added earlier is silently discarded. The first
  # attempt put `theme_tge_facet_spacing()` before it and the figure rendered at
  # the 5.5 pt default: proven by setting the spacing to 8 lines and getting a
  # BYTE-IDENTICAL png. Figure 2 escaped only because it happened to add the
  # partial after. Third silent no-op of this session, first one in R.
  labs(x = "trap infidelity  phi", y = "generations to saturation  t_sat",
       # ⚠️⚠️ "EVERY REGISTERED INFIDELITY" IS FIFTEEN CELLS; `PRIMARY` OBSERVES ONE.
       # `raw_primary` and `n_scored_ratio` both read `cell_of(dat, r, PRIMARY_PHI)`
       # and nothing else, so gating this headline on `PRIMARY && SCORED_PRIMARY ==
       # length(RATIOS)` gated a claim about all five phi on a predicate that can only
       # see phi = 0.002. Demonstrated: censor one seed at (2.00, 0.0453) and the
       # figure shipped, exit 0 with six guards green, carrying this headline above a
       # panel with a visible upward censoring arrow in it. An earlier version of this
       # comment reasoned carefully about the RATIO dimension and never once about the
       # PHI dimension, which is the dimension the word "every" ranges over.
       title = wrap(if (isTRUE(PRIMARY) && SCORED_PRIMARY == length(RATIOS) && ALL_CELLS_SATURATED)
                      "Every registered infidelity saturates."
                    else if (isTRUE(PRIMARY))
                      hard_wrap(sprintf("The PRIMARY holds at phi = %s, but %d of the %d registered cells did not saturate within their horizon — so 'every' is not claimed here.",
                                        PRIMARY_PHI, sum(is.na(cells$t_sat)), nrow(cells)), 92)
                    else if (isFALSE(PRIMARY)) "NOT every registered infidelity saturates — the PRIMARY is FALSIFIED."
                    else "Whether every registered infidelity saturates is NOT EVALUABLE here.",
                    if (length(rel_low2) == 0) "The frozen law says WHEN — and at phi = 0.002 no cell was scored."
                    else sprintf("The frozen law says WHEN — and at phi = 0.002 it is wrong by %+.1f%% to %+.1f%%%s.",
                            min(100 * (rel_low2 - 1)), max(100 * (rel_low2 - 1)),
                            # ⚠️ Say when the range is over fewer than the three
                            # registered cells: a censored cell is a LOWER bound
                            # far above any of these numbers, so silently
                            # dropping it understates the falsification.
                            if (length(rel_low2) < length(RATIOS))
                              sprintf(" (%d of %d cells scored)", length(rel_low2), length(RATIOS)) else "")),
       subtitle = wrap(sprintf("Points are 005's cell means, up to %d seeds; extinct seeds are excluded and a cell with ANY censored seed has no mean.", SEEDS_PER_CELL),
                       # ⚠️ GATED. Stated unconditionally, this promised an arrow
                       # on a figure that has none — and stayed on the image even
                       # in the one case `cens_main` is gated FOR (a cell with
                       # both extinct and censored seeds, drawn nowhere).
                       if (nrow(right_censored) > 0)
                         "Such a cell is drawn as an upward arrow at its horizon, not as a point." else
                         "No cell is censored in this run.",
                       "Lines are 004's law with its constants FROZEN — not a fit to these data.",
                       sprintf("Left of the dashed rule is phi < 0.008: 004 ran %d runs there, all still CONTROLLED at %d, so it",
                               N_004_SUB, H_004_SUB),
                       "measured no t_sat and the law is EXTRAPOLATED below it — the whole premise of 005.",
                       "")) +   # scope_line is in the caption; printing it here too duplicated it verbatim
  theme_tge() +
  theme_tge_facet_spacing()

if (nrow(right_censored) > 0) {
  p_main <- p_main +
    geom_segment(data = right_censored,
                 aes(x = phi, xend = phi, y = horizon * 0.82, yend = horizon, colour = ratio),
                 arrow = grid::arrow(length = unit(0.14, "cm")), linewidth = 0.5,
                 # ⚠️ NOT IN THE LEGEND. Mapped to `ratio`, this layer put an
                 # ARROWHEAD on whichever ratio happened to have a censored
                 # cell, inside a legend titled "theta / sigmaS" — encoding a
                 # property of the DATA as a property of the SERIES.
                 show.legend = FALSE)
}

# --- FIGURE 2: observed / predicted, faceted, where the verdicts are read ---
rel_005 <- data.frame(ratio = cells$ratio, phi = cells$phi,
                      rel = cells$t_sat / cells$pred, stringsAsFactors = FALSE)
# ⚠️ NOT-EVALUABLE CELLS ARE NOT PLOTTED. A cell with more than three extinct
# seeds is excluded from every verdict, but its surviving seeds were still drawn
# as an ordinary diamond — so a cell excluded from SECONDARY 2 could render far
# outside its cap beside a caption reading HELD. Round 1's "the figure argues
# against its own verdict", re-created through evaluability rather than shading.
ne_key <- paste(not_evaluable$ratio, not_evaluable$phi)
rel_005 <- rel_005[!is.na(rel_005$rel) & !(paste(rel_005$ratio, rel_005$phi) %in% ne_key), ]
# 004's in-sample fit residuals. NOT plotted (they are a different quantity from
# 005's out-of-sample errors) and PRINTED below, because an earlier cut computed
# them under a comment saying they were printed and then never referenced them —
# the same defect as a caption naming a glyph that is not drawn.
rel_004 <- do.call(rbind, lapply(RATIOS, function(r) {
  z <- aggregate(saturation_generation ~ phi, data = f[f$ratio == r, ], FUN = mean)
  m <- stats::lm(log(saturation_generation) ~ log(phi), data = z)
  data.frame(ratio = r, phi = z$phi, rel = exp(unname(residuals(m))), stringsAsFactors = FALSE)
}))

# ⚠️ A BRACKET AT EACH REGISTERED PHI, NOT A BAND ACROSS THE SPAN. The tolerance
# was registered at five specific phi. Drawing it as a continuous rect asserted it
# over the gaps too, and put 004's phi = 0.016 and 0.032 inside a +-10% region
# they were never tested against.
# ⚠️ ASSERTED AFTER CONSTRUCTION. Editing these literals drew mid brackets at
# +-20% under a title reading "the REGISTERED tolerance" and a caption reading
# "+-10% ... HELD", with the marginal cell then sitting comfortably inside the
# drawn bracket. Guard 6 pins the VERDICT call sites; the FIGURE call site — the
# one the reader actually sees the tolerance at — was free.
brackets <- rbind(
  data.frame(ratio = rep(RATIOS, each = length(LOW)), phi = rep(LOW, times = length(RATIOS)),
             lo = 1 - TOL_LOW, hi = 1 + TOL_LOW),
  data.frame(ratio = rep(RATIOS, each = length(MID)), phi = rep(MID, times = length(RATIOS)),
             lo = 1 - TOL_MID, hi = 1 + TOL_MID)
)
# ⚠️ DERIVED FROM THE LAYER'S OWN `size`, not a literal measured once. As a
# hand-measured constant it was tied to nothing: changing the diamond from
# size 2.0 to 4.5 left the guard green while the mark overlapped a cap by 4 px
# on each side — the pairing guard 4 says it enforces.
DIAMOND_SIZE <- 2.0
MARKER_HALF_W_LOG10 <- (DIAMOND_SIZE * 3.25) / 445

stopifnot(
  all(abs(brackets$hi[brackets$phi %in% LOW] - (1 + TOL_LOW)) < 1e-12),
  all(abs(brackets$lo[brackets$phi %in% LOW] - (1 - TOL_LOW)) < 1e-12),
  all(abs(brackets$hi[brackets$phi %in% MID] - (1 + TOL_MID)) < 1e-12),
  all(abs(brackets$lo[brackets$phi %in% MID] - (1 - TOL_MID)) < 1e-12),
  setequal(unique(brackets$phi), GRID))
BRACKET_GREY <- tge_ink[["bracket"]]   # from theme.R; not defined inline

# ⚠️ THE LESSON FROM THE REVIEW GATE IS TO DRAW LESS (round count: see the
# registration, not here). Every round, a mark
# added to fix the previous round's finding created the next one: ribbons that
# inverted the verdict, a rect that asserted a tolerance where none was
# registered, an errorbar whose hidden spine put 12 marks on grey, and bespoke
# SECONDARY 3 glyphs that transplanted a phi = 0.0226 measurement to x = 0.0028
# and were drawn in a tan measuring 1.26:1 against the ratio-5.00 series. This
# cut removes ink instead of adding it. SECONDARY 3's observable IS the diamonds
# — it compares their values — so it needs no glyphs of its own, only a sentence.

# Tolerance caps: two SHORT ticks per bound with a narrow corridor for the mark.
# ⚠️ The previous cut used CAP_W 0.115 / gap 0.038, which made each dash ~32 px
# and each gap ~33 px — a uniform dashed rule in which the corridor inside a
# bracket was indistinguishable from the empty span between brackets, and in fact
# slightly wider. The bracket must read as a bracket.
CAP_W   <- 0.055
CAP_GAP <- 0.020
caps <- do.call(rbind, lapply(seq_len(nrow(brackets)), function(i) {
  b <- brackets[i, ]; lx <- log10(b$phi)
  do.call(rbind, lapply(c(-1, 1), function(side) {
    data.frame(ratio = b$ratio, y = c(b$lo, b$hi), phi_key = b$phi,
               x = 10^(lx + side * CAP_GAP), xend = 10^(lx + side * CAP_W),
               stringsAsFactors = FALSE)
  }))
}))

# ⚠️⚠️ THE READER SEES `caps`, NOT `brackets`. The tolerance assertion above binds
# `brackets`; `caps` is DERIVED from it and was checked by nothing on `y`.
# Demonstrated: `y = c(b$lo, b$hi)` -> `y = 1 + (c(b$lo, b$hi) - 1) * 2` exited 0
# with every guard green, drew the ticks at +-50%/+-20% under a title reading
# "the REGISTERED tolerance", and put all three FALSIFYING cells inside their own
# drawn bracket — the figure arguing against its own verdict, which is round 1's
# finding reproduced with the whole suite passing. Same class as the `Y_BREAKS`
# call-site bypass, in the one geometry the verdict figure is read against.
local({
  want <- ifelse(caps$phi_key %in% LOW, TOL_LOW, TOL_MID)
  dev <- abs(abs(caps$y - 1) - want)
  if (max(dev) > 1e-12) {
    stop(sprintf("a drawn tolerance tick sits at %+.4f where the registered tolerance is %+.4f",
                 caps$y[which.max(dev)] - 1, want[which.max(dev)]))
  }
  if (nrow(caps) != nrow(brackets) * 4L) stop("the cap layer does not carry two ticks per bound per side")
})

key <- match(paste(rel_005$ratio, rel_005$phi), paste(cells$ratio, cells$phi))
rel_005$sem_rel <- cells$sem[key] / cells$pred[key]
# The cell(s) whose +-1 SEM interval crosses a registered bound although the cell
# mean — the registered statistic — is inside.
#
# ⚠️ THIS IS REPORTED AS A NUMBER AND NOT DRAWN, AND THAT IS DELIBERATE. A ring
# was added here to let a reader find the cell; it landed ON the -10% cap it was
# pointing at, overpainting 44% of it at 1.672:1, and both guards missed it (one
# filters point layers by ratio colour, the other checked the ring against white
# rather than against the cap). And the crossing it flagged is -10.034% against
# -10.000%: on this scale, **0.4 pixels**. No glyph can honestly show a 0.4 px
# difference, so drawing one asserts a distinction the figure cannot support —
# the same class as a mark at a level the data does not measure. The caption
# states the cell and both numbers instead.
# (The crossing predicate lives in ONE place — `marginal`, below. It was computed
# here as well and never read: two copies of one predicate, which is how they
# drift apart, and the same dead-computation defect this file names twice.)

# ⚠️ BUILT FROM `cells`, NOT FROM `rel_005`. `rel_005` drops censored rows, so a
# censored seed at phi = 0.0226 left `z$rel[z$phi == BASE_PHI]` length zero and
# `data.frame()` aborted the whole script — while Deviation 6 claimed the
# censored case had been exercised end to end. It had been exercised at
# phi = 0.002 only, and generalised.
# ⚠️ FROM `log_resid`, THE SAME VALUES THE VERDICT USES. Built from `cells$t_sat`
# — NA if ANY seed is censored — it printed "2.00: censored" beside a caption
# reading "SECONDARY 3 ... HELD" with ratio 2.00 fully scored, because
# `log_resid` drops censored SEEDS while `cells` drops the whole cell.
sec3 <- do.call(rbind, lapply(RATIOS, function(r) {
  zb <- cell_of(d, r, BASE_PHI)
  b_l <- if (!evaluable(zb$extinct)) NA_real_ else
    log_resid(zb$saturation_generation, zb$extinct, predicted(r, BASE_PHI))
  lw_l <- vapply(LOW, function(pp) {
    zz <- cell_of(d, r, pp)
    if (!evaluable(zz$extinct)) return(NA_real_)
    log_resid(zz$saturation_generation, zz$extinct, predicted(r, pp))
  }, numeric(1))
  b <- if (is.na(b_l)) numeric(0) else exp(b_l)
  lw <- if (any(is.na(lw_l))) NA_real_ else exp(lw_l)
  data.frame(ratio = r,
             base = if (length(b) == 1) b else NA_real_,
             mean_low = if (all(!is.na(lw)) && length(lw) > 0) exp(mean(log(lw))) else NA_real_,
             stringsAsFactors = FALSE)
}))
# ⚠️ "censored" was printed for ANY NA, including a ratio dropped for EXTINCTION
# — so a run with 20 extinct seeds and no censored seed said "2.00: censored"
# beside a caption reporting the extinctions.
sec3_reason <- vapply(RATIOS, function(r) {
  zz <- rbind(cell_of(d, r, BASE_PHI),
              do.call(rbind, lapply(LOW, function(pp) cell_of(d, r, pp))))
  if (sum(zz$extinct) > MAX_EXTINCT_EVALUABLE) "not evaluable" else "censored"
}, character(1))
sec3_txt <- paste(ifelse(is.na(sec3$mean_low) | is.na(sec3$base),
                         sprintf("%s: %s", sec3$ratio, sec3_reason),
                         sprintf("%s: %+.0f%% vs %+.0f%%", sec3$ratio,
                                 100 * (sec3$mean_low - 1), 100 * (sec3$base - 1))), collapse = ";  ")

# ⚠️ 004's POINTS ARE NOT ON THIS FIGURE. They sat at x positions with no tick,
# the caption and subtitle described them incompatibly, and they are IN-SAMPLE
# fit residuals — not the out-of-sample errors this axis measures. They are
# discussed in the Result, where the distinction can be stated in words.

p_rel <- ggplot() +
  geom_hline(yintercept = 1, colour = tge_ink[["rule"]], linewidth = 0.35) +
  geom_vline(xintercept = FITTED_LO, colour = tge_ink[["extrapolation_rule"]], linetype = "22", linewidth = 0.4) +
  geom_segment(data = caps, aes(x = x, xend = xend, y = y, yend = y),
               colour = BRACKET_GREY, linewidth = 0.8) +
  geom_linerange(data = rel_005,
                 # ⚠️ WIDER THAN A GRIDLINE. Every mark here sits on a vertical
                 # gridline (marks are AT the ticks), and at 0.55 the whisker was
                 # the same width as the 3 px grid, so where a whisker ENDS was
                 # not separable from the grid continuing past it — the one thing
                 # a reader needs to judge "does this interval cross the cap".
                 aes(x = phi, ymin = rel - sem_rel, ymax = rel + sem_rel, colour = ratio),
                 linewidth = 1.0) +
  # ⚠️ SIZE 2.0, NOT 3.4 — AND THE FIRST ATTEMPT TO MAKE THIS CHANGE SILENTLY
  # DID NOT APPLY. At 3.4 the diamond's half-height is 10.5 px against +-1 SEM
  # half-lengths of 8.67 and 9.24 px at phi = 0.004, so TWO of the fifteen
  # intervals put ZERO ink outside their own marker while the subtitle named them. A
  # comment two rounds ago claimed this was "handled by construction: the marker
  # is sized below the smallest interval"; it was wrong by measurement, because
  # the edit that would have made it true was a no-op nobody asserted.
  geom_point(data = rel_005, aes(phi, rel, colour = ratio), shape = 18, size = DIAMOND_SIZE) +
  scale_colour_manual(values = palette_003, guide = "none") +
  scale_x_log10(breaks = GRID, labels = lab_phi) +
  # ⚠️ THE TOLERANCE LEVELS ARE LABELS, NOT GRIDLINES. When 0.75/0.9/1.1/1.25
  # were major breaks, `theme_tge()` drew a full-panel rule at each — so +-10%
  # was asserted across phi = 0.002 and 0.004 (where +-25% applies) and +-25%
  # across the three mid cells. That is the round-2 "a band across the whole
  # span" defect returning through the AXIS rather than through a geom, and it
  # made the bracket geometry pointless. The y grid is off; the caps carry it.
  # ⚠️ NO "+50%" LABEL. Every other level on this axis names a registered
  # tolerance bound or the law itself, so a sibling-formatted "+50%" reads as a
  # fourth registered level — and no data reaches it (the largest value including
  # its whisker is +46.7%). Exactly the reasoning that removed the data-free
  # phi = 0.008 tick from figure 1's x-axis, applied to this axis too.
  # ⚠️ NUMERIC LABELS. Naming these levels "-25% / -10% / +10% / +25%" asserted
  # four registered tolerances on every panel at every phi, when +-25% is
  # registered at two phi and +-10% at three. That is the round-2 "band across
  # the whole span" defect re-entering through the axis text after it had been
  # removed from the geoms and then from the gridlines. The caps name the
  # tolerance where it applies; the axis just gives the ratio.
  # ⚠️ NO 1.40 BREAK. It was added so the three falsifying cells (1.37-1.43) had
  # a reference instead of floating ~136 px above the topmost one — but with the
  # y grid blank and `theme_minimal` drawing no ticks, a break yields a LEFT
  # MARGIN LABEL AND NO PANEL INK, so it referenced nothing. It was also
  # formatted identically to the registered bounds, the exact argument used three
  # lines above to delete "+50%". The magnitudes are in `scope_line`, derived.
  scale_y_log10(breaks = c(0.75, 0.9, 1, 1.1, 1.25),
                labels = c("0.75", "0.90", "1.00 = on the law", "1.10", "1.25")) +
  expand_limits(y = c(0.74, max(rel_005$rel + rel_005$sem_rel) * 1.06)) +
  facet_wrap(~ratio, nrow = 1, labeller = labeller(ratio = function(x) paste("theta/sigmaS =", x))) +
  labs(x = "trap infidelity  phi", y = "observed t_sat / predicted t_sat",
       # ⚠️ "every cell" IS A COUNT, SO IT IS DERIVED FROM THE COUNT. `rel_005` drops
       # censored and NOT-EVALUABLE cells, so on any run where one is dropped this
       # title promised a panel showing cells the panel does not contain.
       # ⚠️ HARD-WRAPPED, AND THAT IS NOT COSMETIC. The else-branch is a 131-character
       # single line at bold 13 pt, so the FIRST run with a censored seed aborted in
       # `assert_text_fits` — 14.25 in against 12.64 in of usable width — and the
       # pre-specified analysis could not render a figure for the censored case at ANY
       # phi, INCLUDING phi = 0.002, where the PRIMARY's own falsification lives. Only
       # `scope_line` and `prov` had been wrapped; the DERIVED TITLES had not, under a
       # Deviation-6 sentence claiming the censored case was "exercised end to end".
       # It had not been. This is the `Y_BREAKS` failure re-committed elsewhere in the
       # same file: the analysis refusing to draw one of the two outcomes it was
       # registered to distinguish.
       title = wrap(if (nrow(rel_005) == length(RATIOS) * length(GRID))
                      "Read SECONDARY 1-3 here: every cell against its own prediction."
                    else hard_wrap(sprintf("Read SECONDARY 1-3 here: %d of the %d cells against their own prediction; the rest are censored or NOT EVALUABLE (see the caption).",
                                           nrow(rel_005), length(RATIOS) * length(GRID)), 92),
                    # ⚠️ "appear only at the five phi where one was registered" STOOD HERE
                    # AND COULD NOT BE FALSE: `brackets` is built from `GRID`, asserted
                    # `setequal(unique(brackets$phi), GRID)`, and the x breaks ARE `GRID`,
                    # so there is no position on the panel where a tick could wrongly
                    # appear. It read as the scope guarantee answering an earlier round's
                    # "band across the whole span" defect while guaranteeing nothing. What
                    # actually varies is the WIDTH, so the width is what this now says.
                    sprintf("Grey ticks bracket the REGISTERED tolerance: +-%d%% at the %d lowest phi, +-%d%% at the other %d.",
                            round(TOL_LOW * 100), length(LOW), round(TOL_MID * 100), length(MID))),
       subtitle = wrap(
         sprintf("Diamonds are 005's cells, +-1 SEM over up to %d seeds. Dashed rule: phi = 0.008, where 004's fitted range begins.", SEEDS_PER_CELL),
         "SECONDARY 3 compares the GEOMETRIC MEAN of the two leftmost diamonds with the phi = 0.0226 diamond; it must",
         paste0("exceed that and 'on the law' (mean vs baseline, ", sec3_txt, ")."),
         marg_subtitle)) +
  theme_tge() +
  theme_tge_facets()   # from theme.R; not defined inline

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
# ⚠️ AND AN xmin/xmax CANARY, because the 004 defect this guard exists for was a
# RECT censored on `xmax` — and with both canaries on a point censored on `x`,
# narrowing the guard's field list to just "x" left the script exiting 0.
.rect_bad <- ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point() +
  annotate("rect", xmin = 1, xmax = 500, ymin = 0, ymax = 2) + scale_x_log10(limits = c(0.5, 10))
stopifnot(inherits(try(assert_nothing_censored(.rect_bad, "canary-xmax"), silent = TRUE), "try-error"))

# (the shipping objects are asserted at save time, below)

# ---------------------------------------------------------------------------
# THE VERDICT GUARDS — each re-derived from an INJECTED CSV, not re-run on `d`.
#
# ⚠️ THIS IS THE CONTROL 004's ANALYSIS DID NOT HAVE. Three of its four verdict
# guards re-ran the same expression on the same object, so a corrupted cell
# changed the answer and left every guard green. Here each verdict is recomputed
# on a COPY OF THE RAW DATA WITH A TARGETED CORRUPTION, and the guard asserts the
# verdict MOVES. A guard that cannot be made to fail is not a guard.

inject <- function(dat, r, p, f) { i <- dat$ratio == r & dat$phi == p; dat[i, ] <- f(dat[i, ]); dat }

# ⚠️ THE CONTROLS RUN ON A DE-CENSORED COPY, AND THAT IS DELIBERATE. They exist
# to prove the VERDICT FUNCTIONS respond to a change, which is a property of the
# functions, not of today's data. Run against `d` directly they abort the whole
# script the moment any seed is censored — and a censored seed at phi = 0.002 is
# exactly the PRIMARY's registered falsification, so the pre-specified analysis
# could not produce a figure in the one world it was written to detect. It
# failed there naming an injection control, not the finding. Censored seeds are
# replaced by their horizon (a lower bound on t_sat) FOR THE CONTROLS ONLY; no
# verdict, figure or caption reads `d_ctl`.
# ⚠️ AND EXTINCTION IS DE-CENSORED TOO. The first version of `d_ctl` handled
# censoring only, so four extinct seeds in ONE cell still aborted the script in
# `d_off_mid` — `raw_band` short-circuits on a non-evaluable cell, the injected
# cell stopped failing, and the control's `isFALSE` blew up. The registration
# wrote an entire evaluability precondition for extinction; the fix that claimed
# to remove this class had only removed the censored half of it.
# ⚠️ TO THE CELL'S OWN LIVE MAXIMUM, NOT THE HORIZON. Substituting the horizon
# made a censored MID cell's baseline residual +98%, which the low-phi injection
# (x1.6) cannot exceed — so the SECONDARY 3 control aborted the whole script on
# data the design must render. Third time this class has been 'fixed' at one phi
# and generalised: exercised at 0.002 (horizon/prediction ~1.8) and never at a
# mid cell (~2.1-2.7). The live maximum keeps the frame in the data's own range.
d_ctl <- d
for (r in RATIOS) for (pp in GRID) {
  i <- d_ctl$ratio == r & d_ctl$phi == pp
  live <- d_ctl$saturation_generation[i & !is.na(d_ctl$saturation_generation)]
  fill <- if (length(live) > 0) max(live) else predicted(r, pp)
  d_ctl$saturation_generation[i & is.na(d_ctl$saturation_generation)] <- fill
}
d_ctl$extinct <- 0
stopifnot(!any(is.na(d_ctl$saturation_generation)), all(d_ctl$extinct == 0))

# PRIMARY: censor one seed at phi = 0.002 and the primary must fall.
d_no_sat <- inject(d_ctl, RATIOS[1], PRIMARY_PHI, function(z) {
  z$saturation_generation[1] <- NA; z$extinct[1] <- 0; z
})
stopifnot(isFALSE(raw_primary(d_no_sat)))
# ... and the same seed made extinct instead must NOT falsify it — extinction is
# not evidence of a floor, and the registration says so.
# ⚠️ MORE THAN THREE, because the branch this control exists for is
# `!evaluable(...)`, and one extinct seed never reaches it. With a single seed
# the control passed while `return(NA)` could be reverted to `return(FALSE)` —
# and that build printed "PRIMARY ... FALSIFIED" for a cell killed by
# extinction, the one word the registration forbids.
d_extinct <- d_ctl
for (r in RATIOS) d_extinct <- inject(d_extinct, r, PRIMARY_PHI, function(z) {
  k <- MAX_EXTINCT_EVALUABLE + 1
  z$saturation_generation[seq_len(k)] <- NA; z$extinct[seq_len(k)] <- 1; z
})
# All three ratios non-evaluable => NOT EVALUABLE, never FALSIFIED. (`raw_primary`
# returns NA only when EVERY ratio is unscorable; injecting one ratio leaves the
# other two scoring, which is why the first version of this control asserted the
# wrong thing and failed.)
stopifnot(is.na(raw_primary(d_extinct)))
stopifnot(verdict(raw_primary(d_extinct)) == "NOT EVALUABLE")
# One ratio killed leaves the verdict intact but scored 2 of 3.
d_extinct_one <- inject(d_ctl, RATIOS[1], PRIMARY_PHI, function(z) {
  k <- MAX_EXTINCT_EVALUABLE + 1
  z$saturation_generation[seq_len(k)] <- NA; z$extinct[seq_len(k)] <- 1; z
})
stopifnot(isTRUE(raw_primary(d_extinct_one)))
# ... and one extinct seed must NOT change the verdict.
d_extinct1 <- inject(d_ctl, RATIOS[1], PRIMARY_PHI, function(z) {
  z$saturation_generation[1] <- NA; z$extinct[1] <- 1; z
})
stopifnot(isTRUE(raw_primary(d_extinct1)) == isTRUE(raw_primary(d_ctl)))

# SECONDARY 1 and 2: push one cell far outside its band and the verdict must fall.
d_off_low <- inject(d_ctl, RATIOS[1], LOW[1], function(z) {
  z$saturation_generation <- z$saturation_generation * 3; z
})
stopifnot(isFALSE(raw_band(d_off_low, LOW, TOL_LOW)))
d_off_mid <- inject(d_ctl, RATIOS[1], MID[1], function(z) {
  z$saturation_generation <- z$saturation_generation * 3; z
})
stopifnot(isFALSE(raw_band(d_off_mid, MID, TOL_MID)))
# ... and a cell perturbed WELL INSIDE its band must not move the verdict, so the
# guard is testing the band and not merely reacting to any change at all.
d_inside <- inject(d_ctl, RATIOS[1], MID[1], function(z) {
  z$saturation_generation <- z$saturation_generation * 1.01; z
})
stopifnot(raw_band(d_inside, MID, TOL_MID) == raw_band(d_ctl, MID, TOL_MID))

# SECONDARY 3: drive the low-phi cells below the prediction and the curvature
# claim must fall.
d_flat <- d_ctl
for (r in RATIOS) for (p in LOW) {
  d_flat <- inject(d_flat, r, p, function(z) {
    z$saturation_generation <- z$saturation_generation * 0.5; z
  })
}
stopifnot(isFALSE(raw_curvature(d_flat)))
# ... and raising them must make it hold, so the guard responds to the DIRECTION
# it names rather than to disturbance.
d_up <- d_ctl
for (r in RATIOS) for (p in LOW) {
  d_up <- inject(d_up, r, p, function(z) {
    z$saturation_generation <- z$saturation_generation * 1.6; z
  })
}
stopifnot(isTRUE(raw_curvature(d_up)))

# ⚠️ THE CONTROLS ARE REGISTERED, BECAUSE A COUNT IN A COMMENT DRIFTS AND AN
# INJECTION THAT SILENTLY DID NOTHING WOULD PASS. Every frame above is asserted
# to (a) keep the shape of `d_ctl`, so a control cannot be scoring a different
# set of cells than the verdict does, and (b) actually DIFFER from `d_ctl` --
# an `inject` whose mutator missed its target returns the frame unchanged, and
# then `stopifnot(isFALSE(...))` is testing the baseline, not an injection. That
# is the unasserted-no-op failure this project has shipped before.
INJECTION_CONTROLS <- list(
  d_no_sat = d_no_sat, d_extinct = d_extinct, d_extinct_one = d_extinct_one,
  d_extinct1 = d_extinct1, d_off_low = d_off_low, d_off_mid = d_off_mid,
  d_inside = d_inside, d_flat = d_flat, d_up = d_up)
injection_is_live <- function(z) {
  identical(dim(z), dim(d_ctl)) && !isTRUE(all.equal(z, d_ctl))
}
# Negative control: `d_ctl` against itself is the no-op an injection must not be.
stopifnot(!injection_is_live(d_ctl), injection_is_live(d_up))
stopifnot(length(INJECTION_CONTROLS) == 9L,
          all(vapply(INJECTION_CONTROLS, injection_is_live, logical(1))))

# ---------------------------------------------------------------------------
# SAVE, WITH SIX BUILD-TIME GUARDS ON WHAT ACTUALLY SHIPS (plus the cap-corridor,
# break-placement and text-fit assertions, each with its own canary). ⚠️ This
# said FIVE while six were numbered below — a fourth conflicting count in a file
# whose own comment records that three once shipped.


verdict_line <- sprintf(
  "PRIMARY (no floor above phi = %s): %s  |  SECONDARY 1 (+-%d%%, below the fitted range): %s\nSECONDARY 2 (+-%d%%, inside it): %s  |  SECONDARY 3 (curvature continues, upward): %s",
  PRIMARY_PHI, verdict(PRIMARY, SCORED_PRIMARY, length(RATIOS)), round(TOL_LOW * 100), verdict(SEC1, SCORED_LOW, length(RATIOS) * length(LOW)),
  round(TOL_MID * 100), verdict(SEC2, SCORED_MID, length(RATIOS) * length(MID)), verdict(SEC3, SCORED_SEC3, length(RATIOS)))

# ⚠️ ONE CAPTION PER FIGURE. A single caption pasted onto both was false on each:
# it promised "both bands" on the figure that deliberately has none, and "error
# bars" on the figure that has none either.
prov <- sprintf(
  "Model frozen at 12e7b08; a and C carried from 004 and re-derived from its committed CSV.\n%d runs, seeds %d-%d, per-phi horizons %s.\n%s",
  nrow(d), min(d$seed), max(d$seed), paste(sprintf("%s:%d", names(HORIZONS), HORIZONS), collapse = " "),
  # ⚠️ DERIVED. This sentence was a literal chosen on the censored count alone, so
  # with extinct seeds injected it still shipped "no extinctions" verbatim — and
  # the pre-data commit DID carry a NOT-EVALUABLE line that the post-data rewrite
  # dropped without logging it.
  paste0(
    # ⚠️ NO GLYPH IS NAMED HERE. `prov` is pasted into BOTH captions, and the
    # arrow layer exists only on figure 1 — so a censored run shipped a tolerance
    # figure whose caption promised an upward arrow its panel does not draw. The
    # per-figure sentence is added to each caption separately below.
    if (nrow(censored) > 0)
      # ⚠️ "never saturated" is false for a cell where nine of ten seeds did and
      # one was censored; what such a cell lacks is a CELL t_sat.
      sprintf("%d cell%s ha%s at least one censored seed and therefore no cell t_sat. ",
              nrow(censored), if (nrow(censored) == 1) "" else "s", if (nrow(censored) == 1) "s" else "ve")
    else if (sum(d$extinct) == 0) "Every cell saturated. " else "",
    if (sum(d$extinct) > 0)
      sprintf("%d extinct seed%s across %d cell%s; %d cell%s NOT EVALUABLE (>%d extinct) and excluded from every verdict.",
              sum(d$extinct), if (sum(d$extinct) == 1) "" else "s",
              length(unique(paste(d$ratio, d$phi)[d$extinct == 1])),
              if (length(unique(paste(d$ratio, d$phi)[d$extinct == 1])) == 1) "" else "s",
              nrow(not_evaluable), if (nrow(not_evaluable) == 1) "" else "s", MAX_EXTINCT_EVALUABLE)
    else "No extinctions."))

# ⚠️ A VERDICT WITHIN ONE SEM OF ITS BOUND IS REPORTED AS SUCH. SECONDARY 2 held
# on the registered statistic — the cell mean — but one cell's +-1 SEM interval
# crosses its tolerance. Printing a flat "HELD" beside a figure that shows no
# uncertainty was a round-4 finding; the margin is now computed and stated.
marg_note <- if (n_marg == 0) {
  "No cell holds on its mean with a +-1 SEM interval crossing its registered tolerance."
} else {
  paste0(sprintf("%d cell%s HELD on the cell mean with a +-1 SEM interval CROSSING the bound: ", n_marg, if (n_marg == 1) "" else "s"),
         paste(sprintf("ratio %s phi %s (%.2f%%, 1-SEM limit %.2f%%)", marginal$ratio, marginal$phi,
                       100 * (marginal$rel - 1), 100 * (marginal$rel - marginal$se - 1)), collapse = "; "), ".")
}

# ⚠️ THIS CAPTION ONCE PROMISED "hollow marks are 15 cell means from 004" on a
# figure whose own subtitle said 004 is NOT plotted — a caption contradicting the
# panel and contradicting the subtitle three lines above it, on the same image.

# ⚠️ NAME THE CELL. Figure 1 has no tolerance drawn on it, so a bare
# "SECONDARY 1: FALSIFIED" invites attributing the failure to both low-phi
# columns. It failed at phi = 0.002 ONLY; phi = 0.004 is inside +-25%.
cap_main <- paste0(wrap_lines(prov),
  sprintf("\nEach point is a mean of up to %d seeds. %s, which on this panel is a few pixels — smaller than the marker,",
          SEEDS_PER_CELL, sem_line),
  "\nso it is NOT drawn here. fig-005-tolerance.png spans a far narrower range and does draw it. This figure carries no tolerance marks.",
  paste0("\n", hard_wrap(scope_line), "\n"),
  hard_wrap(marg_note), "\n", verdict_line)
cap_rel <- paste0(wrap_lines(prov),
  paste0("\n", hard_wrap(scope_line), "\n"),
                  BITS_NOTE, "\n", marg_note, "\n", verdict_line)

# ⚠️ AN EXPLICIT MARGIN, NOT THE THEME DEFAULT. `theme_minimal`'s 5.5pt margin
# lets ink land within 2px of the border on a small device, which is both a
# clipping risk and enough to make guard 3 unable to distinguish "clipped" from
# "merely tight". Widening it makes the guard's predicate meaningful.
SAFE_MARGIN <- theme_tge_margin()   # from theme.R; not defined inline
# ⚠️ GATED ON THE ARROW LAYER'S OWN PREDICATE, not on `censored`. A cell with
# both extinct and censored seeds is in `censored` but not in `right_censored`,
# so the caption promised an arrow that no layer drew.
cens_main <- if (nrow(right_censored) > 0) "\nCensored cells are drawn as an upward arrow at their horizon, a lower bound." else ""
# ⚠️ Gated on the SAME predicate as the arrow layer, and it says where the cell
# actually is. A cell with >3 extinct seeds AND censored seeds is in `censored`
# but in neither figure, and the old sentence sent the reader to a panel that
# does not draw it.
cens_rel <- if (nrow(right_censored) > 0) {
  "\nCensored cells are OMITTED here; fig-005-divergence.png draws them as an upward arrow at the horizon."
} else if (nrow(censored) > 0) {
  "\nCensored cells are omitted from BOTH figures (they are also NOT EVALUABLE); the caption above counts them."
} else ""
fig_main <- p_main + labs(caption = paste0(cap_main, cens_main)) + SAFE_MARGIN
# ⚠️ RE-RUN AGAINST THE BREAKS THE FIGURE ACTUALLY DREW. The call above passes
# `Y_BREAKS`, so the guard was severable at the scale call site: editing
# `scale_y_log10(breaks = ...)` to any other set left the guard verifying a
# vector the panel no longer used. A guard that observes a variable rather than
# the rendered object is this project's signature defect. `panel_params$y$breaks`
# comes back in DATA space (log10 here) and carries NAs for out-of-range breaks.
local({
  br <- ggplot2::ggplot_build(fig_main)$layout$panel_params[[1]]$y$breaks
  br <- 10^br[!is.na(br)]
  if (length(br) == 0) stop("guard: the built panel reports no y breaks — it inspected nothing")
  assert_no_break_under_mark(br, measured$t_sat, MARKER_HALF_LOG10)
})
fig_rel  <- p_rel  + labs(caption = paste0(cap_rel, cens_rel)) + SAFE_MARGIN

# GUARD 1 — no layer position censored to NA. Run on the objects that SHIP, not
# on the pre-caption versions: `assert_nothing_censored(p_main, ...)` earlier in
# this file checks a different object from the one `ggsave` writes.
assert_nothing_censored(fig_main, "fig-005-divergence")
assert_nothing_censored(fig_rel, "fig-005-tolerance")

# GUARD 2 — CONTRAST, ON EVERY COLOUR ANY SCALE DRAWS, AT THE ALPHA IT DRAWS IT.
# ⚠️ THIS GUARD HAS NOW FAILED TWICE IN THE SAME WAY AND BOTH WERE THE SAME CLASS.
# First it measured the raw hex while the figure composited over white. Then,
# fixed for alpha, it still looped over `palette_003` ONLY — so the two tolerance
# fills, the single most load-bearing marks on the verdict figure, went unchecked
# and rendered at 1.12:1 against white and 1.014:1 against each other. A guard
# that measures SOME of what it is trusted for is the same defect as one that
# measures none. Every colour handed to any scale is enumerated here.
# ⚠️ PAIRS, NOT COLOURS. This guard has now failed THREE TIMES in the same class
# and each fix exposed the next: (1) it measured raw hex while the figure
# composited over white; (2) alpha-aware, it still looped over `palette_003` only,
# missing the tolerance fills at 1.12:1; (3) covering every colour, it measured
# them all against WHITE — while twelve of fifteen verdict diamonds were drawn on
# a grey bracket at 1.17-1.62:1. A contrast guard's unit is a (mark, background)
# PAIR that the figure actually renders, not a colour.
BG_WHITE <- "#ffffff"
# ⚠️ THE COMMENT MUST MATCH THE CODE. A previous cut of this block claimed it
# checked "the two pairings that actually failed … the colours must stay
# separable when they overlap" while checking every mark against WHITE only —
# a comment describing a check the code did not perform, which is the same
# defect as no check at all. The mark-over-mark case is now prevented
# GEOMETRICALLY for CAPS and asserted by guard 4. ⚠️ It is NOT true that
# "nothing is drawn over anything else" — an earlier version of this sentence
# said so while all 30 marks on figure 2 were drawn over vertical gridlines at
# 1.54-2.14:1. Marks over gridlines are unavoidable, because a mark sits at its
# own tick; they are handled by making the mark WIDER than the grid, not by
# recolouring. What this list checks is every rendered mark against the panel.
PAIRS <- c(
  lapply(unname(palette_003), function(h) list(mark = h, bg = BG_WHITE, a = 1, what = "ratio mark on panel")),
  list(list(mark = BRACKET_GREY, bg = BG_WHITE, a = 1, what = "tolerance cap on panel")),
  # ⚠️ THE THEME'S OWN INK, which four earlier versions of this guard omitted
  # while their comments claimed to cover "every rendered mark". A gridline is
  # the only reference for reading a value off a log axis; it is a rendered mark.
  list(list(mark = tge_ink[["gridline"]],        bg = BG_WHITE, a = 1, what = "panel gridline")),
  list(list(mark = tge_ink[["rule"]],            bg = BG_WHITE, a = 1, what = "'on the law' rule")),
  list(list(mark = tge_ink[["extrapolation_rule"]], bg = BG_WHITE, a = 1, what = "phi = 0.008 rule"))
)

# ⚠️ THE MARK-OVER-REFERENCE-RULE PAIRINGS ARE REPORTED, NOT ENFORCED, AND HERE
# IS THE DISTINCTION — because "exempt the inconvenient case" is how a guard
# stops guarding. A TOLERANCE CAP is a THRESHOLD: the reader's question is
# "inside or outside", the ambiguous answer is "on it", and a diamond covering
# a cap destroys the comparison. That case is ENFORCED, geometrically, by
# guard 4. A REFERENCE RULE ("on the law", the phi = 0.008 rule) is not a
# threshold any verdict is scored against: no registered prediction turns on
# whether a cell is exactly 1.000 or 1.012, the mark is drawn on top and stays
# legible, and what is interrupted is the furniture. Measured and printed so
# the exemption is quantified rather than assumed.
for (h in unname(palette_003)) {
  cat(sprintf("  note: series %s over the on-the-law rule %.2f:1, over the phi=0.008 rule %.2f:1 (reference rules, not thresholds; see above).\n",
              h, contrast_ratio(h, tge_ink[["rule"]]), contrast_ratio(h, tge_ink[["extrapolation_rule"]])))
}
assert_contrast_pairs <- function(pairs) {
  for (q in pairs) {
    cr <- contrast_ratio(q$mark, q$bg, alpha = q$a, bg = q$bg)
    if (cr < WCAG_NONTEXT_FLOOR) {
      stop(sprintf("%s: %s on %s renders at %.2f:1, below the %d:1 floor",
                   q$what, q$mark, q$bg, cr, WCAG_NONTEXT_FLOOR))
    }
  }
  invisible(TRUE)
}
# ⚠️ SEEN TO FAIL — WHICH IT NEVER WAS UNTIL NOW. The previous cut asserted three
# `contrast_ratio()` calls in isolation and never pushed a failing pair through
# the LOOP, so replacing the `if` with `if (FALSE)` left the script green. Every
# other guard here runs its assert FUNCTION on a canary; this one did not, while
# the registration claimed all five had been seen to fail.
stopifnot(inherits(try(assert_contrast_pairs(
  list(list(mark = "#fdfdfd", bg = BG_WHITE, a = 1, what = "canary"))), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_contrast_pairs(
  list(list(mark = "#000000", bg = BG_WHITE, a = 1, what = "canary-ok")))))
assert_contrast_pairs(PAIRS)

# ⚠️ AND EVERY COLOUR THE BUILT PLOT ACTUALLY DRAWS, because the manifest above
# is hand-written under a comment claiming "every rendered mark". Proven: giving
# the +-1 SEM whiskers a fixed #e8e8e8 (1.23:1) left the script exiting 0 with
# every canary green. Guard 5 has a manifest AND a sweep; this had only the
# manifest.
rendered_colours <- function(p) {
  bd <- ggplot_build(p)$data
  cols <- unlist(lapply(bd, function(l) c(l$colour, l$fill)))
  cols <- unique(cols[!is.na(cols) & nzchar(cols)])
  setdiff(cols, c("NA", "transparent"))
}
EXEMPT_INK <- unname(c(tge_ink[["gridline"]], tge_ink[["rule"]],
                       tge_ink[["extrapolation_rule"]], "grey35", "grey45"))
assert_rendered_contrast <- function(p, nm) {
  for (h in rendered_colours(p)) {
    if (tolower(h) %in% tolower(EXEMPT_INK)) next
    cr <- contrast_ratio(h, BG_WHITE)
    if (cr < WCAG_NONTEXT_FLOOR) {
      stop(sprintf("%s: rendered colour %s is %.2f:1 against the panel, below the %d:1 floor",
                   nm, h, cr, WCAG_NONTEXT_FLOOR))
    }
  }
  invisible(TRUE)
}
# Seen to fail on a plot carrying a near-white mark, and to pass on one that does not.
.pale <- ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point(colour = "#e8e8e8")
stopifnot(inherits(try(assert_rendered_contrast(.pale, "canary"), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_rendered_contrast(
  ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point(colour = "#000000"), "canary-ok")))
assert_rendered_contrast(fig_main, "fig-005-divergence")
assert_rendered_contrast(fig_rel, "fig-005-tolerance")
# Seen to fail, or it proves nothing.
stopifnot(contrast_ratio("#ffffff") < WCAG_NONTEXT_FLOOR)
stopifnot(contrast_ratio(palette_003[["2.00"]], alpha = 0.16) < WCAG_NONTEXT_FLOOR)   # the round-1 ribbon
# ⚠️ THE NEGATIVE CONTROL MUST NOT BE A PAIRING THE FIGURE RENDERS. The previous
# cut asserted `contrast_ratio("#9a6b16", "#6b7280") < 3` as its seen-to-fail
# case — which was precisely the diamond-on-bracket pairing being drawn twelve
# times on the shipped figure. A canary that names the live defect as its example
# of failure is worse than no canary. Two colours that never co-occur:
stopifnot(contrast_ratio("#fdfdfd", "#ffffff") < WCAG_NONTEXT_FLOOR)

# ⚠️ WRITTEN TO A TEMPORARY PATH FIRST. Guards 3, 4 and 5 run after this point,
# and the previous cut saved straight to the shipped filenames — so a guard
# failure left an UNVALIDATED png on disk under the name everything cites,
# while the script exited non-zero. The rename happens only once every guard
# has passed.
TMP_MAIN <- tempfile(fileext = ".png"); TMP_REL <- tempfile(fileext = ".png")
# ⚠️ ONE LITERAL. Guard 5 hard-coded `dpi = 110` while these shipped at 200, so
# the guard that certifies "this layer puts visible pixels on the page" measured
# a 1430x792 page and certified a 2600x1440 one. Its minimum-pixel threshold is
# in device pixels, which scale with dpi — a guard reading a resolution the
# figure is not drawn at cannot report on the figure. Both now read this.
SHIP_DPI <- 200
ggsave(TMP_MAIN, fig_main, width = 13, height = 7.2, dpi = SHIP_DPI)
ggsave(TMP_REL, fig_rel, width = 13, height = 7.2, dpi = SHIP_DPI)

# GUARD 4 — NO VERDICT MARK IS DRAWN ON A TOLERANCE CAP.
# ⚠️ Read from the BUILT plot, so it tests the geometry that ships rather than
# the geometry intended. Round 4 found 12 of 15 marks sitting on the tolerance
# because `geom_errorbar` silently includes a vertical spine, under a comment
# asserting the opposite. A comment is not a measurement.
assert_no_mark_on_cap <- function(p, nm) {
  bd <- ggplot_build(p)$data
  # ⚠️ SCOPED TO THE PAIRING THAT IS FORBIDDEN, not "any point on any rule". The
  # first version flagged SECONDARY 3's own cross sitting inside its own baseline
  # dash — same series, same colour, deliberately adjacent. A guard that fires on
  # intended geometry gets switched off, which is how a guard stops guarding.
  # Forbidden pairing: ANY mark inside a TOLERANCE-CAP span.
  segs <- Filter(function(l) all(c("x", "xend", "y", "yend") %in% names(l)) &&
                   nrow(l) > 0 && all(abs(l$y - l$yend) < 1e-9) &&
                   all(tolower(l$colour) == tolower(BRACKET_GREY)), bd)
  # ⚠️ EVERY POINT LAYER, NOT JUST THE RATIO-COLOURED ONES. Filtering by colour
  # meant a grey annotation layer was never inspected — and that is exactly the
  # layer that ended up drawn over a cap.
  # ⚠️ AND ANY ymin/ymax LAYER. Filtering on `shape` excluded `geom_linerange` —
  # and the round-4 defect this guard exists for was an errorbar SPINE, i.e.
  # exactly such a layer. Harmless in this geometry only because the whisker
  # shares its point's x.
  pts  <- Filter(function(l) nrow(l) > 0 &&
                   ("shape" %in% names(l) || all(c("ymin", "ymax") %in% names(l))), bd)
  # ⚠️ AN EMPTY INSPECTION IS A FAILURE, NOT A PASS. `segs` is colour-filtered, so
  # recolouring the cap layer at its call site emptied it and the guard returned
  # TRUE having checked nothing — the project's own rule for check 4b, applied
  # here after a reviewer walked straight through it.
  if (length(segs) == 0 || length(pts) == 0) {
    stop(sprintf("%s: guard 4 found no cap segments or no marks to compare — it inspected nothing and must not report a pass", nm))
  }
  hits <- 0
  for (sg in segs) for (pt in pts) {
    for (i in seq_len(nrow(sg))) {
      lo <- min(sg$x[i], sg$xend[i]); hi <- max(sg$x[i], sg$xend[i])
      same <- if ("PANEL" %in% names(pt) && "PANEL" %in% names(sg)) pt$PANEL == sg$PANEL[i] else TRUE
      hits <- hits + sum(same & pt$x >= lo & pt$x <= hi)
    }
  }
  if (hits > 0) {
    stop(sprintf("%s: %d verdict mark(s) fall inside a horizontal rule's x-span — a mark drawn on a tolerance cap cannot be read against it.", nm, hits))
  }
  invisible(TRUE)
}
# Seen to fail: a mark placed inside a segment's span must trip it, and the same
# mark outside the span must not.
.mk <- unname(palette_003)[1]
.bad <- ggplot(data.frame(x = 2, y = 1), aes(x, y)) +
  geom_segment(aes(x = 1, xend = 3, y = 1, yend = 1), colour = BRACKET_GREY) +
  geom_point(colour = .mk)
stopifnot(inherits(try(assert_no_mark_on_cap(.bad, "canary"), silent = TRUE), "try-error"))
.ok <- ggplot(data.frame(x = 5, y = 1), aes(x, y)) +
  geom_segment(aes(x = 1, xend = 3, y = 1, yend = 1), colour = BRACKET_GREY) +
  geom_point(colour = .mk)
stopifnot(isTRUE(assert_no_mark_on_cap(.ok, "canary-ok")))
assert_no_mark_on_cap(fig_rel, "fig-005-tolerance")

# ⚠️ AND THE CAP CORRIDOR MUST EXCEED THE MARKER'S HALF-WIDTH, which the guard
# above cannot see: it compares a point's CENTRE x to the cap's x-span, so
# shrinking CAP_GAP to 0.004 left it exiting 0 while 12 cap pixels were
# overpainted. Its stop message describes ink overlap; its predicate described
# centre containment. This closes the gap in the units the corridor is defined
# in. Marker half-width: shape 18 at size 2.0 renders ~12 px across, and this
# panel's x scale is measured below.
# 445 px per decade of phi, measured off the shipped tolerance figure's vertical
# gridline columns, and a 13 px diamond (half-width 6.5, not 6). ⚠️ This said
# 468 px and 6 px — both asserted — setting the threshold 8% below the true
# half-width. Latent: the shipped corridor clears either.
assert_cap_corridor <- function(gap, half) {
  if (gap <= half) {
    stop(sprintf("cap corridor %.4f decades is inside the marker half-width %.4f — a mark will overlap a cap",
                 gap, half))
  }
  invisible(TRUE)
}
# ⚠️ THE "SEEN TO PASS" CONTROL WAS THE SHIPPED VALUE ITSELF — `assert_cap_corridor(
# 0.020, ...)` is `CAP_GAP` re-typed, so the control and the case under test were
# the same measurement, and it could report nothing about either. A positive
# control has to be a value the live configuration is NOT. Both controls are now
# derived from the threshold, so they bracket it from each side by construction
# and stay correct if the marker size changes.
stopifnot(inherits(try(assert_cap_corridor(MARKER_HALF_W_LOG10 * 0.5, MARKER_HALF_W_LOG10), silent = TRUE), "try-error"))
stopifnot(inherits(try(assert_cap_corridor(MARKER_HALF_W_LOG10, MARKER_HALF_W_LOG10), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_cap_corridor(MARKER_HALF_W_LOG10 * 1.001, MARKER_HALF_W_LOG10)))
assert_cap_corridor(CAP_GAP, MARKER_HALF_W_LOG10)

# GUARD 5 — EVERY GLYPH THE TEXT NAMES MUST ACTUALLY PUT INK ON THE PAGE.
#
# ⚠️ THIS IS THE GENERAL FIX FOR THIS REVIEW'S MOST PERSISTENT DEFECT. Four
# separate rounds shipped a caption or subtitle describing a glyph that was not
# rendered: "open marks" beside `fill = NA` on shapes that have no fill; "hollow
# marks are 15 cell means" on a figure whose 004 series had been deleted; "a grey
# ring marks a cell" after the ring was removed; and "Bars are +-1 SEM" when
# `width = 0` had made every whisker shorter than the marker sitting on it, so
# all 15 were invisible. Prose and geometry drifted apart every time, and reading
# the code never caught it because the code was fine — the PIXELS were not.
#
# So this measures pixels: zero the layer's alpha, re-render, and require the
# image to change. A layer that changes nothing is a layer the reader cannot see,
# whatever the caption says about it.
#
# ⚠️ WHAT IT CANNOT DO, STATED PLAINLY BECAUSE THE FIRST VERSION OF THIS COMMENT
# DID NOT. It is a LAYER-level predicate: it certifies that a layer puts ink
# somewhere, not that every mark within it is legible. A review found three of
# fifteen +-1 SEM intervals hidden inside their own markers while the other
# thirteen rendered (⚠️ the geom comment says TWO and is right: only 8.71 and
# 9.29 px fall under a 10.5 px half-height; two counts for one defect, in the
# guard whose subject is checks that cannot discriminate), so
# this guard passed — the signature defect of this project
# (a check that cannot discriminate) inside the guard written to prevent it. The per-mark case is
# handled by CONSTRUCTION instead: figure 1 draws no interval at all because at
# this panel's scale a 0.86-2.48% SEM makes the whole +-1 SEM interval a few px, under
# any legible marker; figure 2's marker is sized below the smallest interval it
# sits on. ⚠️ These read '~500 px/decade' and '2-5 px' until a review measured
# the render — superseded values left standing 480 lines from the geom that had
# already corrected them. Both choices are
# recorded with their measured numbers at the geoms.
layer_index <- function(p, cls) {
  which(vapply(p$layers, function(l) inherits(l$geom, cls), logical(1)))
}
assert_layer_visible <- function(p, cls, nm, min_px = 150, w = 9, h = 6) {
  idx <- layer_index(p, cls)
  if (length(idx) == 0) stop(sprintf("%s: no %s layer at all, but the figure's text names one", nm, cls))
  # When several layers share a geom class, check the one this call names.
  want <- suppressWarnings(as.integer(sub(".*layer ([0-9]+).*", "\\1", nm)))
  if (!is.na(want) && want %in% idx) idx <- want
  # ⚠️ ALPHA TO ZERO, NOT LAYER REMOVED. Deleting a layer also un-trains the
  # scales it contributed to, so the panel range shifts and every pixel differs —
  # the first version of this guard passed on a deliberately invisible canary for
  # exactly that reason. Zeroing alpha keeps the scales identical and isolates
  # the one question being asked: does this layer put ink on the page?
  # ⚠️ DEEP-COPY THE LAYER. A ggproto `Layer` is an ENVIRONMENT, so `q <- p`
  # aliases it and `q$layers[[i]]$aes_params$alpha <- 0` mutates the ORIGINAL.
  # The previous cut did exactly that: after checking figure 1's points, the
  # points were left at alpha 0, so the next call certified a page that is not
  # the page that ships, and calling this guard twice on the same layer FAILED
  # on a layer that plainly renders. The shipped PNGs escaped only because
  # `ggsave` runs earlier — an ordering accident, not a defence.
  f1 <- tempfile(fileext = ".png"); f2 <- tempfile(fileext = ".png")
  suppressWarnings(ggsave(f1, p, width = w, height = h, dpi = SHIP_DPI))
  q <- p
  q$layers[[idx[1]]] <- ggproto(NULL, p$layers[[idx[1]]],
    aes_params = modifyList(p$layers[[idx[1]]]$aes_params, list(alpha = 0)))
  suppressWarnings(ggsave(f2, q, width = w, height = h, dpi = SHIP_DPI))
  a <- png::readPNG(f1); b <- png::readPNG(f2)
  # ⚠️ AN EMPTY INSPECTION IS A FAILURE, NOT A PASS — the rule guard 4 states three
  # functions above and this one broke: a dimension mismatch returned a silent TRUE,
  # so a render that changed size certified every layer it never compared.
  if (!identical(dim(a), dim(b))) {
    stop(sprintf("%s: the ablated render is %s and the reference is %s — the two pages cannot be compared, so this guard inspected nothing and must not report a pass",
                 nm, paste(dim(b), collapse = "x"), paste(dim(a), collapse = "x")))
  }
  n <- sum(abs(a - b) > 0.02)
  if (n < min_px) {
    stop(sprintf("%s: removing the %s layer changes only %d subpixels — it renders no visible ink, yet the figure's text describes it.",
                 nm, cls, n))
  }
  invisible(TRUE)
}
# Seen to fail before it is trusted: an invisible layer must trip it, and the
# same layer made visible must not.
.base <- ggplot(data.frame(x = 1:5, y = 1:5), aes(x, y)) + geom_point(size = 6) + theme_tge()
stopifnot(inherits(try(assert_layer_visible(
  .base + geom_errorbar(aes(ymin = y - 0.001, ymax = y + 0.001), width = 0, alpha = 0),
  "GeomErrorbar", "canary"), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_layer_visible(
  .base + geom_errorbar(aes(ymin = y - 1, ymax = y + 1), width = 0.4),
  "GeomErrorbar", "canary-ok")))
# ⚠️ AND IDEMPOTENT: the same plot checked twice must pass twice. The aliasing
# bug above made the second call fail, which is how it was found.
.twice <- .base + geom_errorbar(aes(ymin = y - 1, ymax = y + 1), width = 0.4)
stopifnot(isTRUE(assert_layer_visible(.twice, "GeomErrorbar", "canary-twice-1")))
stopifnot(isTRUE(assert_layer_visible(.twice, "GeomErrorbar", "canary-twice-2")))

# ⚠️ EVERY LAYER, NOT A HAND-WRITTEN LIST. The previous cut named four layers
# under a header reading "EVERY GLYPH THE TEXT NAMES MUST ACTUALLY PUT INK ON THE
# PAGE" — and a reviewer zeroed the alpha on the DIAMONDS, on both dashed rules
# and on the "on the law" rule, all of which the figures' own text names, and the
# script exited 0 each time. That is the instance-vs-class failure guard 1's
# comment forbids, committed in the guard written to enforce it.
# `GeomBlank` is excluded because `expand_limits()` emits one and it draws
# nothing by design; every other layer must be visible.
assert_every_layer_visible <- function(p, nm, w, h) {
  cls <- vapply(p$layers, function(l) class(l$geom)[1], character(1))
  for (i in seq_along(p$layers)) {
    if (cls[i] == "GeomBlank") next
    assert_layer_visible(p, cls[i], sprintf("%s: layer %d (%s)", nm, i, cls[i]), w = w, h = h)
  }
  invisible(TRUE)
}
# ⚠️ A MANIFEST, BECAUSE ITERATING EXISTING LAYERS CANNOT SEE A DELETED ONE — and
# three of the four findings that motivated this guard were captions naming a
# layer that had been REMOVED. Proven: deleting the phi = 0.008 rule from fig 2,
# or the law lines from fig 1, left the script exiting 0 with their subtitles
# still naming them. The sweep below covers what exists; this covers what the
# text promises.
REQUIRED_LAYERS <- list(
  # ⚠️ DATA-DEPENDENT, BECAUSE A FIXED MANIFEST CANNOT SEE A CONDITIONAL LAYER.
  # The censored-cell arrow is drawn only when `nrow(right_censored) > 0`, and the
  # subtitle and caption that promise it are gated on the same condition — so with
  # a hard-coded manifest, neutering the arrow block while a censored cell existed
  # left the script exiting 0 with both texts naming a layer nothing drew. That is
  # exactly the failure this manifest was added for, surviving inside it.
  list(p = quote(fig_main), nm = "fig-005-divergence",
       cls = c("GeomVline", "GeomLine", "GeomPoint",
               if (nrow(right_censored) > 0) "GeomSegment")),
  list(p = quote(fig_rel), nm = "fig-005-tolerance",
       cls = c("GeomHline", "GeomVline", "GeomSegment", "GeomLinerange", "GeomPoint"))
)
# ⚠️ A FUNCTION WITH THE STOP INSIDE, CANARIED BY CALLING IT. The first cut
# inlined the check and then "canaried" it by re-implementing the same predicate
# beside it — so `if (FALSE)` on the real check left the script green while the
# copy stayed happy. Third time this file has shipped a canary that tests a
# re-typed expression instead of the guard.
assert_required_layers <- function(p, cls, nm) {
  have <- vapply(p$layers, function(l) class(l$geom)[1], character(1))
  miss <- setdiff(cls, have)
  if (length(miss) > 0) {
    stop(sprintf("%s: the figure's text names a %s layer and there is none",
                 nm, paste(miss, collapse = ", ")))
  }
  invisible(TRUE)
}
stopifnot(inherits(try(assert_required_layers(fig_main, "GeomRibbon", "canary"),
                       silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_required_layers(fig_main, "GeomPoint", "canary-ok")))
# ⚠️ WHAT A SELF-TEST CANNOT COVER, SAID PLAINLY: deleting a guard's CALL is
# undetectable from inside the guard. Asserting the manifest's shape catches the
# cheap version (emptying the list); nothing here catches someone removing the
# loop. That is a limit, not a claim of coverage.
stopifnot(length(REQUIRED_LAYERS) == 2L,
          all(vapply(REQUIRED_LAYERS, function(r) length(r$cls) >= 3L, logical(1))))
for (rq in REQUIRED_LAYERS) assert_required_layers(eval(rq$p), rq$cls, rq$nm)

# And the sweep itself is canaried, which it was not: its wrapper had no control,
# only the inner per-layer assert did.
stopifnot(inherits(try(assert_every_layer_visible(
  fig_main + geom_point(data = measured, aes(phi, t_sat), alpha = 0),
  "canary-sweep", w = 6, h = 4), silent = TRUE), "try-error"))

assert_every_layer_visible(fig_main, "fig-005-divergence", w = 13, h = 7.2)
assert_every_layer_visible(fig_rel, "fig-005-tolerance", w = 13, h = 7.2)

# GUARD 6 — THE PROVENANCE CLAIM IN THE HEADER IS CHECKED, NOT ASSERTED.
#
# ⚠️ FOUR SUCCESSIVE VERSIONS OF THAT PARAGRAPH WERE FALSE, each narrowed by one
# item after a reviewer diffed it. A prose claim about which functions changed
# since the pre-data commit is exactly the kind of thing that should be
# mechanical, and it never was. This extracts each named function from
# `PRE_DATA_COMMIT` and from this file and compares them.
PRE_DATA_COMMIT <- "58af15c"
# ⚠️ AND `theme.R` IS INSIDE THE SAME WINDOW. Guard 6 checked only this script,
# while every colour, shape and contrast number the figure guards measure is
# DEFINED in `theme.R` — `tge_ink_gridline` is read by guard 2, `contrast_ratio`
# IS guard 2's instrument, and both changed after the data existed. A provenance
# guard that cannot see the file its own instrument lives in is the signature
# defect again: a check whose scope excludes what it is trusted for.
THEME_CHANGED_POST_DATA <- c("contrast_ratio", "theme_tge")
THEME_UNCHANGED_POST_DATA <- c("WCAG_NONTEXT_FLOOR", "linetype_003", "palette_002",
                               "palette_003", "palette_tge", "shape_003",
                               "theme_tge_annotation")
THEME_ADDED_POST_DATA <- c("linetype_ratio", "shape_003_open", "tge_ink",
                           "tge_ink_gridline", "theme_tge_facet_spacing",
                           "theme_tge_facets", "theme_tge_margin")
CHANGED_POST_DATA <- c("log_resid", "raw_primary", "raw_curvature", "verdict")
# Added post-data (absent from the pre-data commit entirely), so they cannot be
# compared body-for-body: named here so the header's list is complete.
# ⚠️ THE FULL SET, checked by set equality below. The first version named 13 of
# 21 and the check was one-way, so it printed "provenance verified" under a
# header claiming "the list below IS that diff". `assert_provenance` is not
# here because it is nested inside the guard block and the scan is top-level.
ADDED_POST_DATA <- c("curvature_per_ratio", "n_scored_ratio", "n_scored_cells",
                     "is_marginal", "assert_required_layers",
                     "assert_text_fits", "assert_cap_corridor",
                     "assert_no_break_under_mark", "assert_every_layer_visible",
                     "assert_contrast_pairs", "hard_wrap", "extract_fn",
                     "assert_layer_visible", "assert_no_edge_ink",
                     "assert_no_mark_on_cap", "devs_at", "lab_phi",
                     "layer_index", "tol_of", "wrap",
                     "rendered_colours", "assert_rendered_contrast",
                     "wrap_lines", "injection_is_live", "assert_pre_data_commit")
UNCHANGED_POST_DATA <- c("predicted", "all_saturated", "within_band", "curvature_up",
                         "evaluable", "raw_band", "cell_of",
                         # ⚠️ `inject` and `assert_nothing_censored` were in
                         # NEITHER list — present in both revisions and
                         # therefore unchecked, so editing `inject` post-data
                         # left this guard printing "provenance verified".
                         # Both verified byte-identical.
                         "inject", "assert_nothing_censored")
# The constants every verdict is scored against. Named here so the guard reads
# the same list the header promises.
# ⚠️⚠️ `PRE_DATA_COMMIT` IS FIRST, AND IT WAS NOT IN THIS LIST. Guard 6 is the
# only pin on every constant below, and its own reference commit sat one line
# above it, unpinned, with an unreadable ref falling through to a `cat()`.
# Demonstrated with a two-line edit — `PRE_DATA_COMMIT <- "0000000"` and
# `TOL_LOW <- 0.45` — exit 0, one note on stdout, and the shipped figure read
# "SECONDARY 1 (+-45%): HELD" with brackets drawn at +-45%: the registered
# headline finding INVERTED. A guard with an unpinned off switch is not a guard.
# ⚠️ IT IS NOT IN THIS LIST, THOUGH, AND CANNOT BE: this list pins a declaration by
# comparing it to the same declaration at the pre-data commit, and
# `PRE_DATA_COMMIT` did not exist there. It is validated instead by what it must
# NAME — see `assert_pre_data_commit` below. A body-pin would have been the easy
# answer and it would have been circular.
PINNED_CONSTANTS <- c("TOL_LOW", "TOL_MID", "GRID", "LOW", "MID", "BASE_PHI",
                      "PRIMARY_PHI", "SEEDS_PER_CELL", "MAX_EXTINCT_EVALUABLE",
                      # ⚠️ AND THE VERDICT CALL SITES. Pinning the tolerance
                      # DECLARATION left the USE free: editing
                      # `SEC1 <- raw_band(d, LOW, TOL_LOW)` to `raw_band(d, LOW,
                      # 0.45)` flipped FALSIFIED to HELD, under a "+-25%" label
                      # still derived from the pinned constant, with this guard
                      # printing "provenance verified". The guard's own
                      # demonstration, one level up.
                      "PRIMARY", "SEC1", "SEC2", "SEC3")
# ⚠️ BRACE-MATCHED, NOT "SCAN TO THE NEXT LINE STARTING WITH }". The first cut
# did the latter, so a ONE-LINE definition swallowed everything down to the next
# closing brace anywhere in the file — `predicted` came out as twelve lines
# including a horizon loop, `evaluable` as fifteen including a CSV check, and
# `inject`, byte-identical in both revisions, compared as DIFFERENT. A provenance
# guard whose extractor is wrong asserts something other than what it claims.
extract_fn <- function(txt, fn) {
  i <- grep(paste0("^", fn, " <- "), txt)
  if (length(i) == 0) return(NA_character_)
  st <- i[1]
  opens <- 0L; j <- st; started <- FALSE
  repeat {
    line <- txt[j]
    opens <- opens + lengths(regmatches(line, gregexpr("\\{", line)))
    if (opens > 0) started <- TRUE
    opens <- opens - lengths(regmatches(line, gregexpr("\\}", line)))
    if (started && opens <= 0) break
    if (!started && j > st) break          # one-line definition, no braces
    j <- j + 1
    if (j > length(txt)) break
  }
  if (!started) j <- st                     # one-liner: the definition line only
  paste(txt[st:min(j, length(txt))], collapse = "\n")
}
# Seen to fail and to pass: a one-liner must not absorb the block after it.
.probe <- c("foo <- function(x) x + 1", "", "bar <- function(y) {", "  y", "}")
stopifnot(extract_fn(.probe, "foo") == "foo <- function(x) x + 1")
stopifnot(extract_fn(.probe, "bar") == "bar <- function(y) {\n  y\n}")
pre_txt <- suppressWarnings(tryCatch(
  system2("git", c("show", paste0(PRE_DATA_COMMIT, ":docs/analysis/plot-005.R")),
          stdout = TRUE, stderr = FALSE),
  error = function(e) character(0)))
# ⚠️ FATAL, NOT A NOTE. This was a soft `cat()`, so pointing `PRE_DATA_COMMIT` at
# a nonexistent ref DISABLED every pin in this file and the script still exited 0.
# There is no legitimate run of this analysis in which the pre-data commit is
# unreachable: it is in the repository this script lives in.
# ⚠️⚠️ THE REFERENCE COMMIT IS VALIDATED BY WHAT IT CONTAINS, NOT TAKEN ON TRUST.
# `PRE_DATA_COMMIT` is the off switch for every pin in this file, so pointing it
# anywhere else must not be survivable. A pin against its own past value is
# impossible (it is a post-data addition), so this asserts the DEFINING PROPERTY
# instead: the pre-data commit is the one where the analysis and the runner exist
# and THE DATA DOES NOT. A commit that fails either half is not a pre-data commit,
# whatever it is called, and a later commit that carries the CSVs fails the second
# half by construction — which is exactly the substitution that must be refused.
assert_pre_data_commit <- function(ref) {
  ls_tree <- suppressWarnings(tryCatch(
    system2("git", c("ls-tree", "-r", "--name-only", ref), stdout = TRUE, stderr = FALSE),
    error = function(e) character(0)))
  if (length(ls_tree) == 0) stop(sprintf("GUARD 6: %s is not a readable commit in this repository", ref))
  must_have <- c("docs/analysis/plot-005.R", "experiments/005-delay-divergence.ts")
  missing <- setdiff(must_have, ls_tree)
  if (length(missing) > 0) {
    stop(sprintf("GUARD 6: %s is not the pre-data commit — it does not contain %s",
                 ref, paste(missing, collapse = ", ")))
  }
  data_there <- grep("^experiments/005-.*\\.csv$", ls_tree, value = TRUE)
  if (length(data_there) > 0) {
    stop(sprintf("GUARD 6: %s already carries 005 data (%s) — it is not BEFORE the data and cannot anchor provenance",
                 ref, paste(data_there, collapse = ", ")))
  }
  invisible(TRUE)
}
# Seen to fail on both halves and to pass on the real one. HEAD carries the
# analysis; the parent of the commit that introduced it does not.
stopifnot(inherits(try(assert_pre_data_commit("0000000"), silent = TRUE), "try-error"))
stopifnot(inherits(try(assert_pre_data_commit(paste0(PRE_DATA_COMMIT, "~3")), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_pre_data_commit(PRE_DATA_COMMIT)))

if (length(pre_txt) < 10) {
  stop(sprintf("GUARD 6 cannot read %s:docs/analysis/plot-005.R — provenance and every pinned constant are unverifiable, so this analysis must not report a verdict",
               PRE_DATA_COMMIT))
} else {
  # ⚠️ THE SCRIPT THAT IS RUNNING, NOT THE PATH IT IS SUPPOSED TO BE. The first
  # cut read the tracked file from disk, so copying this script elsewhere,
  # changing TOL_MID to 0.20 and running it from the repo root produced exit 0,
  # "provenance verified", and "SECONDARY 2 ... +-20% ... HELD" — the exact
  # demonstration this guard was added to close, run around by not being the
  # file it checked.
  const_line <- function(txt, nm) {
    i <- grep(paste0("^", nm, "( *<-| +<-)"), txt)
    if (length(i) == 0) NA_character_ else txt[i[1]]
  }
  self_path <- sub("^--file=", "",
                   grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE))
  if (length(self_path) != 1 || !nzchar(self_path)) {
    stop("GUARD 6 cannot identify the running script; refusing to certify provenance")
  }
  if (normalizePath(self_path, mustWork = FALSE) !=
      normalizePath("docs/analysis/plot-005.R", mustWork = FALSE)) {
    stop(sprintf("GUARD 6: running %s, not the tracked docs/analysis/plot-005.R — provenance cannot be certified for a copy",
                 self_path))
  }
  now_txt <- readLines(self_path, warn = FALSE)
  bad <- character(0)
  # ⚠️ AND THE CONSTANTS, which the header's claim explicitly covers ("every
  # tolerance and grid constant") and the first cut of this guard did not read.
  # Demonstrated: widening TOL_LOW from 0.25 to 0.45 post-data left the script
  # exiting 0, this guard printing "provenance verified", and SECONDARY 1
  # flipping FALSIFIED -> HELD. A provenance guard that misses the constants the
  # verdicts are scored against is worse than none, because it certifies them.
  # ⚠️ THE COMPARISON ITSELF IS CANARIED, not just `extract_fn`. Replacing this
  # `if` with `if (FALSE)` left the script green while printing "provenance
  # verified" — the same "the canary tests the expression, not the guard" defect
  # this file has now shipped three times.
  # ⚠️ THE STOP IS INSIDE THE FUNCTION. With the comparison in a function and the
  # `stop` in a separate `if` at the call site, canarying the function still left
  # `if (FALSE)` exiting 0 — the canary covered the comparison and not the abort.
  # A guard whose abort lives outside the thing its canary exercises is a guard
  # with an off switch.
  assert_provenance <- function(pre, now, fns_changed, fns_same, consts) {
    b <- character(0)
    for (fn in fns_same) if (!identical(extract_fn(pre, fn), extract_fn(now, fn)))
      b <- c(b, sprintf("%s listed unchanged but differs", fn))
    for (fn in fns_changed) if (identical(extract_fn(pre, fn), extract_fn(now, fn)))
      b <- c(b, sprintf("%s listed changed but is identical", fn))
    for (k in consts) if (!identical(const_line(pre, k), const_line(now, k)))
      b <- c(b, sprintf("%s differs but the header calls the constants byte-identical", k))
    if (length(b) > 0) {
      stop(paste0("the header's provenance claim does not match the diff:\n  ",
                  paste(b, collapse = "\n  ")))
    }
    invisible(TRUE)
  }
  # Seen to fail on an injected constant change, and to pass on the real pair.
  .fake <- sub("^TOL_LOW <- .*$", "TOL_LOW <- 0.99", now_txt)
  stopifnot(inherits(try(assert_provenance(pre_txt, .fake, CHANGED_POST_DATA,
                                           UNCHANGED_POST_DATA, PINNED_CONSTANTS),
                         silent = TRUE), "try-error"))
  stopifnot(isTRUE(assert_provenance(pre_txt, now_txt, CHANGED_POST_DATA,
                                     UNCHANGED_POST_DATA, PINNED_CONSTANTS)))
  # Every function the header calls an ADDITION must be absent pre-data.
  # ⚠️ SET EQUALITY, NOT ONE-WAY. The first cut checked only that LISTED names
  # were absent pre-data and never the converse, so a list naming 13 of the 22
  # added functions printed "provenance verified" under a header saying "the
  # list below IS that diff". Fifth incomplete version of that paragraph.
  fn_names <- function(txt) sort(unique(sub(" *<-.*$", "",
    grep("^[A-Za-z_.][A-Za-z0-9_.]* *<- *function", txt, value = TRUE))))
  added_actual <- setdiff(fn_names(now_txt), fn_names(pre_txt))
  # ⚠️ THE SHARED SET MUST BE PARTITIONED TOO. Checking only that listed names
  # were added left `inject` and `assert_nothing_censored` — present in both
  # revisions and in NEITHER list — unchecked: editing `inject` post-data left
  # this guard printing "provenance verified".
  shared <- intersect(fn_names(pre_txt), fn_names(now_txt))
  if (!setequal(shared, c(CHANGED_POST_DATA, UNCHANGED_POST_DATA))) {
    stop(sprintf("the changed/unchanged lists do not partition the shared functions.\n  unlisted: %s\n  listed but not shared: %s",
                 paste(setdiff(shared, c(CHANGED_POST_DATA, UNCHANGED_POST_DATA)), collapse = ", "),
                 paste(setdiff(c(CHANGED_POST_DATA, UNCHANGED_POST_DATA), shared), collapse = ", ")))
  }
  if (!setequal(added_actual, ADDED_POST_DATA)) {
    stop(sprintf("ADDED_POST_DATA does not match the diff.\n  missing from the list: %s\n  listed but not added: %s",
                 paste(setdiff(added_actual, ADDED_POST_DATA), collapse = ", "),
                 paste(setdiff(ADDED_POST_DATA, added_actual), collapse = ", ")))
  }
  # ⚠️ AND THE HEADER'S OWN LIST IS PARSED, NOT TAKEN ON TRUST. Everything above
  # compares the CODE's two lists against the diff; the sentence a reader actually
  # reads is a third list, and it had drifted from both.
  hdr <- grep("^# BYTE-IDENTICAL-TO-PRE-DATA:", now_txt)
  if (length(hdr) != 1L) stop("guard 6: the header's byte-identical line is missing or duplicated")
  hdr_block <- now_txt[hdr:(hdr + 2L)]
  hdr_names <- unlist(regmatches(hdr_block, gregexpr("`[^`]+`", hdr_block)))
  hdr_names <- gsub("`", "", hdr_names)
  if (!setequal(hdr_names, UNCHANGED_POST_DATA)) {
    stop(sprintf("the header's byte-identical list disagrees with UNCHANGED_POST_DATA.\n  in the code, not the header: %s\n  in the header, not the code: %s",
                 paste(setdiff(UNCHANGED_POST_DATA, hdr_names), collapse = ", "),
                 paste(setdiff(hdr_names, UNCHANGED_POST_DATA), collapse = ", ")))
  }
  cat(sprintf("  GUARD 6: provenance verified against %s — %d changed, %d unchanged, and the header names the same %d.\n",
              PRE_DATA_COMMIT, length(CHANGED_POST_DATA), length(UNCHANGED_POST_DATA), length(hdr_names)))

  # --- and the same partition for `theme.R` ---
  # ⚠️ BLOCKS, NOT FUNCTIONS. `theme.R` holds palettes and constants as well as
  # functions, and `extract_fn` only understands `name <- function`. This splits
  # BOTH revisions at top-level `name <-` lines by the identical rule, so the
  # comparison is between like and like; a comment change inside a block counts as
  # a change, which for a file whose comments carry the measured contrast numbers
  # is the behaviour we want.
  theme_blocks <- function(txt) {
    at <- grep("^[A-Za-z_.][A-Za-z0-9_.]* *<-", txt)
    if (length(at) == 0) return(list())
    ends <- c(at[-1] - 1L, length(txt))
    out <- list()
    for (k in seq_along(at)) {
      blk <- txt[at[k]:ends[k]]
      while (length(blk) > 1 && (grepl("^\\s*$", blk[length(blk)]) ||
                                 grepl("^\\s*#", blk[length(blk)]))) blk <- blk[-length(blk)]
      out[[sub(" *<-.*$", "", txt[at[k]])]] <- paste(blk, collapse = "\n")
    }
    out
  }
  # Seen to fail and to pass, on the same shape the real file has.
  .tp <- theme_blocks(c("a <- 1", "# trailing note", "b <- function() {", "  2", "}"))
  stopifnot(identical(names(.tp), c("a", "b")), .tp[["a"]] == "a <- 1")
  theme_pre <- suppressWarnings(tryCatch(
    system2("git", c("show", paste0(PRE_DATA_COMMIT, ":docs/analysis/theme.R")),
            stdout = TRUE, stderr = FALSE), error = function(e) character(0)))
  if (length(theme_pre) < 10) stop("GUARD 6: cannot read theme.R at ", PRE_DATA_COMMIT)
  tb_pre <- theme_blocks(theme_pre)
  tb_now <- theme_blocks(readLines("docs/analysis/theme.R", warn = FALSE))
  t_shared <- intersect(names(tb_pre), names(tb_now))
  t_changed <- t_shared[vapply(t_shared, function(n) tb_pre[[n]] != tb_now[[n]], logical(1))]
  t_unchanged <- setdiff(t_shared, t_changed)
  t_added <- setdiff(names(tb_now), names(tb_pre))
  t_removed <- setdiff(names(tb_pre), names(tb_now))
  for (cmp in list(list("changed", t_changed, THEME_CHANGED_POST_DATA),
                   list("unchanged", t_unchanged, THEME_UNCHANGED_POST_DATA),
                   list("added", t_added, THEME_ADDED_POST_DATA),
                   list("removed", t_removed, character(0)))) {
    if (!setequal(cmp[[2]], cmp[[3]])) {
      stop(sprintf("theme.R %s since %s does not match the declared list.\n  in the file, not the list: %s\n  in the list, not the file: %s",
                   cmp[[1]], PRE_DATA_COMMIT,
                   paste(setdiff(cmp[[2]], cmp[[3]]), collapse = ", "),
                   paste(setdiff(cmp[[3]], cmp[[2]]), collapse = ", ")))
    }
  }
  cat(sprintf("  GUARD 6: theme.R verified against %s — %d changed, %d unchanged, %d added, 0 removed.\n",
              PRE_DATA_COMMIT, length(t_changed), length(t_unchanged), length(t_added)))
}

# GUARD 3 — NOTHING IS TRUNCATED AT THE CANVAS EDGE.
# ⚠️ THE ROUND-2 REVIEW FOUND BOTH TITLES AND ALL FOUR CAPTIONS RUNNING OFF THE
# RIGHT EDGE. Figure 1's title rendered as "...is wrong below", losing "its
# range" — a scoped claim silently became an unscoped one. Text overflow is
# invisible to `ggplot_build`, which knows nothing about the device, so this
# reads the WRITTEN PNG and asserts no ink touches the outer border.
assert_no_edge_ink <- function(path, margin = 2) {
  img <- png::readPNG(path)
  if (length(dim(img)) == 3) img <- apply(img[, , seq_len(min(3, dim(img)[3])), drop = FALSE], c(1, 2), min)
  ink <- img < 0.97
  h <- nrow(ink); w <- ncol(ink)
  hits <- c(
    top    = sum(ink[seq_len(margin), , drop = FALSE]),
    bottom = sum(ink[seq(h - margin + 1, h), , drop = FALSE]),
    left   = sum(ink[, seq_len(margin), drop = FALSE]),
    right  = sum(ink[, seq(w - margin + 1, w), drop = FALSE])
  )
  if (any(hits > 0)) {
    stop(sprintf("%s: ink touches the canvas border (%s) — text or a mark is being clipped. Wrap the string or widen the device.",
                 basename(path), paste(sprintf("%s=%d", names(hits), hits), collapse = " ")))
  }
  invisible(TRUE)
}
# Seen to fail first: a deliberately over-long title on a narrow device must trip
# it, and the same plot on a wide device must not.
.canary <- file.path(tempdir(), "edge-canary.png")
ggsave(.canary, ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point() +
         labs(title = paste(rep("truncate me", 40), collapse = " ")) + theme_tge() + SAFE_MARGIN,
       width = 3, height = 3, dpi = 100)
stopifnot(inherits(try(assert_no_edge_ink(.canary), silent = TRUE), "try-error"))
ggsave(.canary, ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point() +
         labs(title = "short") + theme_tge() + SAFE_MARGIN, width = 6, height = 4, dpi = 100)
stopifnot(isTRUE(assert_no_edge_ink(.canary)))

# ⚠️ AND THE TEXT ITSELF, BECAUSE BORDER INK IS NOT TRUNCATION. grid clips a
# too-long string INSIDE the device, so a cut title can leave the outer pixels
# clean and `assert_no_edge_ink` never fires — the predicate is "ink at the
# border" and the name is "nothing is truncated". This measures each text grob
# against the width it has.
assert_text_fits <- function(p, nm, w_in) {
  g <- ggplotGrob(p)
  avail <- grid::unit(w_in, "in")
  for (lab in c("title", "subtitle", "caption")) {
    gr <- grep(paste0("^", lab, "$"), g$layout$name)
    if (length(gr) == 0) next
    tg <- g$grobs[[gr[1]]]
    if (inherits(tg, "zeroGrob")) next
    wd <- grid::convertWidth(grid::grobWidth(tg), "in", valueOnly = TRUE)
    # ⚠️ CALIBRATED AND MARGIN-AWARE. `grobWidth` under-measures the 200-dpi
    # render by ~20% (measured: fig 1 title 6.87 in reported against 8.34 in of
    # ink; subtitle 10.20 against 11.48), and the raw comparison also ignored the
    # 26 pt plot margin — together they reported 2.80 in of headroom where the
    # render had 0.50. The factor is empirical, from those six measurements, and
    # the guard is therefore NECESSARY, NOT SUFFICIENT: a pass means "not
    # obviously clipped", and the border check is the second half.
    GROB_UNDERMEASURE <- 1.22
    # `theme_tge_margin()` is margin(10, 16, 10, 10) pt — 26 pt TOTAL across the
    # two sides, not 26 per side as this line first assumed.
    avail_in <- w_in - 26 / 72
    if (wd * GROB_UNDERMEASURE > avail_in) {
      stop(sprintf("%s: the %s measures %.2f in (x%.2f calibration = %.2f) against %.2f in of usable width — it will be clipped",
                   nm, lab, wd, GROB_UNDERMEASURE, wd * GROB_UNDERMEASURE, avail_in))
    }
  }
  invisible(TRUE)
}
# Seen to fail on a string too wide for its device, and to pass on the same
# string given room.
.long <- ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point() +
  labs(title = paste(rep("truncate me", 30), collapse = " ")) + theme_tge()
stopifnot(inherits(try(assert_text_fits(.long, "canary", 3), silent = TRUE), "try-error"))
stopifnot(isTRUE(assert_text_fits(.long, "canary-ok", 40)))
assert_text_fits(fig_main, "fig-005-divergence", 13)
assert_text_fits(fig_rel, "fig-005-tolerance", 13)

assert_no_edge_ink(TMP_MAIN)
assert_no_edge_ink(TMP_REL)

stopifnot(file.rename(TMP_MAIN, FIG_MAIN), file.rename(TMP_REL, FIG_REL))

cat("\n=== QUESTION 005 ===\n")
# ⚠️ THE HEADLINES ARE PRINTED, BECAUSE A TITLE IS THE CLAIM A READER TAKES AWAY
# AND IT WAS ONLY INSPECTABLE BY OPENING THE PNG. Two rounds shipped a headline
# that contradicted the panel under it; printing them makes the sentence a run
# actually produced checkable from the log, at any input.
cat(sprintf("figure 1 headline: %s\n", strsplit(fig_main$labels$title, "\n")[[1]][1]))
cat(sprintf("figure 2 headline: %s\n", strsplit(fig_rel$labels$title, "\n")[[1]][1]))
cat(sprintf("PRIMARY      no floor above phi = %s ................ %s\n", PRIMARY_PHI, verdict(PRIMARY, SCORED_PRIMARY, length(RATIOS))))
cat(sprintf("SECONDARY 1  t_sat within +-%2d%% below fitted range ... %s\n", round(TOL_LOW * 100), verdict(SEC1, SCORED_LOW, length(RATIOS) * length(LOW))))
cat(sprintf("SECONDARY 2  t_sat within +-%2d%% inside it ............ %s\n", round(TOL_MID * 100), verdict(SEC2, SCORED_MID, length(RATIOS) * length(MID))))
cat(sprintf("SECONDARY 3  curvature continues, upward ............ %s\n", verdict(SEC3, SCORED_SEC3, length(RATIOS))))
cat("\n", BITS_NOTE, "\n", marg_note, "\n\n", sep = "")
print(cells[, c("ratio", "phi", "pred", "t_sat", "sem", "resid", "n_censored", "n_extinct")],
      row.names = FALSE, digits = 4)

# The exponent's ratio-dependence is REPORTED AND NOT SCORED. The registration
# declines to predict it because 004's SE(a) = 0.032 against an observed spread of
# 0.0143 could not resolve the effect — and 005 does not rescue it: the values
# printed below are SE 0.019-0.027 against a between-ratio spread of 0.0071.
# ⚠️ This comment quoted 004's pair as if it were the pair being printed.
# Printed with its standard error so the reason is visible, not merely stated.
cat("\n004's in-sample fit residuals (context for SECONDARY 3; NOT out-of-sample errors):\n")
print(within(rel_004, {pct <- round(100 * (rel - 1), 2); rm(rel)}), row.names = FALSE)

cat("\nrefitted exponents (DESCRIPTIVE, no verdict attached — see the registration):\n")
for (r in RATIOS) {
  z <- cells[cells$ratio == r & !is.na(cells$t_sat), ]
  if (nrow(z) < 3) { cat(sprintf("  ratio %s: only %d measured cells, not fitted\n", r, nrow(z))); next }
  m <- stats::lm(log(t_sat) ~ log(phi), data = z)
  s <- summary(m)$coefficients[2, 2]
  cat(sprintf("  ratio %s: a = %.4f +- %.4f (004 froze %.4f), over %d cells\n",
              r, -unname(coef(m)[2]), s, FROZEN[r, "a"], nrow(z)))
}
cat(sprintf("\nwrote %s and %s\n", FIG_MAIN, FIG_REL))
