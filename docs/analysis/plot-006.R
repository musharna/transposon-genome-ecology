# Registered question 006 — is the exponent one?
# `docs/pre-registrations/2026-09-11-is-the-exponent-one.md`.
#
# ⚠️ NOTHING HERE WAS REGISTERED. The registration names no figure and this
# script was written on 2026-09-18, after the Result. It DESCRIBES the result and
# tests nothing. Its design (which steps, what marks, the bound as an arrow) was
# settled before any code. Its WORDING, the label placement, the arrow length and
# the rule weight were then revised over six rounds of adversarial review of
# rendered draws; no number it shows was changed by that review.
#
# The verdicts are the RUNNER'S (`npx tsx experiments/006-is-the-exponent-one.ts
# --analyse`). This script recounts only what it draws, and refuses to draw if a
# recount disagrees with the runner:
#   - Phase 2's grid: exactly 60 rows, the registered (phi, ratio, seed) set;
#   - how every Phase 2 run ended: saturated / extinct / censored at horizon;
#   - the cell means and SEMs, and the local exponent on each registered step,
#     which must match the runner's printed values to 3 dp;
#   - the primary verdict, as registered AND with the censored runs counted at
#     their horizon;
#   - Secondary 2's one decrease, for the caption.
# SECONDARY 1 IS NOT RECOUNTED AND NOT DRAWN; it stays a table in FINDINGS.md.
# Secondary 3 is not drawn either.
#
# Every predicate carries positive AND negative controls, asserted before it is
# used on the data. `PLOT006_FAULT=<name>` corrupts the data after it is read;
# every named fault must stop the script before a PNG is written.
#
# Usage:  Rscript docs/analysis/plot-006.R      (from the repository root)

suppressPackageStartupMessages(library(ggplot2))
source("docs/analysis/theme.R")

CSV_005 <- "experiments/005-delay-divergence.csv"
CSV_P2  <- "experiments/006-phase2.csv"
CSV_P1  <- "experiments/006-phase1.csv"   # read only to name what is NOT drawn
FIG     <- "docs/analysis/fig-006-local-exponent.png"
SHIP_W <- 13; SHIP_H <- 7.2; SHIP_DPI <- 200

# ---------------------------------------------------------------------------
# REGISTERED CONSTANTS, restated from the registration.

RATIOS  <- c("2.00", "3.33", "5.00")
SEEDS   <- 6001:6010
P2_PHIS <- c(0.001, 0.0005)
# Secondary 2's registered cells, largest phi first (runner's SECONDARY2_PHIS
# plus column B, which ran). The four above 0.001 come from 005's CSV.
STEP_PHIS <- c(0.0226, 0.0113, 0.004, 0.002, 0.001, 0.0005)
BAND <- c(lo = 0.95, hi = 1.05)
PRIMARY_STEP <- c(lo = 0.0005, hi = 0.001)

# The runner's printed values: `--analyse`, Secondary 2 block, unchanged since
# `ba9ca86`. Typed because R cannot run the runner; they are what the recount
# must reproduce, not what it draws.
RUNNER <- data.frame(
  ratio = rep(RATIOS, each = 5),
  lo = rep(c(0.0113, 0.004, 0.002, 0.001, 0.0005), 3),
  a = c(0.865, 0.906, 0.967, 0.931, 1.027,
        0.789, 0.910, 0.962, 0.910, 1.099,
        0.865, 0.888, 0.974, 0.955, 0.958),
  sem = c(0.037, 0.019, 0.038, 0.064, 0.065,
          0.038, 0.017, 0.030, 0.031, 0.035,
          0.038, 0.018, 0.036, 0.040, 0.031))
# The censored-at-horizon treatment, FINDINGS.md under 006's PRIMARY table.
RUNNER_CENSORED <- c(ratio = "5.00", a = "1.648", sem = "0.281")

feq <- function(x, y) abs(x - y) < 1e-12
# A step's name. NOT sprintf("%s"): that prints 0.0005 as "5e-04".
num <- function(x) vapply(x, format, character(1), scientific = FALSE, drop0trailing = TRUE, trim = TRUE)
step_name <- function(lo, hi) paste0(num(lo), "→", num(hi))
stopifnot(identical(step_name(0.0005, 0.001), "0.0005→0.001"))

# ---------------------------------------------------------------------------
# PREDICATES, each with positive and negative controls before any data is read.

# How a run ended. The flag is not the evidence: a run flagged saturated AT its
# horizon ran out, it did not saturate (the runner's check 3).
outcome_of <- function(d) {
  bad <- d$saturated == 1 & d$saturation_generation >= d$horizon
  if (any(bad, na.rm = TRUE)) stop("a run is flagged saturated at or past its horizon — a censored run recorded as saturated")
  ifelse(d$saturated == 1, "saturated",
         ifelse(d$extinct == 1, "extinct",
                ifelse(d$stopped_at >= d$horizon, "censored", "stopped early")))
}
local({
  z <- data.frame(saturated = c(1, 0, 0, 0), extinct = c(0, 1, 0, 0),
                  stopped_at = c(50, 40, 100, 60), horizon = 100,
                  saturation_generation = c(50, NA, NA, NA))
  stopifnot(identical(outcome_of(z), c("saturated", "extinct", "censored", "stopped early")))
  z$saturation_generation[1] <- 100
  stopifnot(inherits(tryCatch(outcome_of(z), error = identity), "error"))
})

# A cell: mean and SEM of t, needing at least two values (the runner's rule).
cell_of <- function(ts) {
  if (length(ts) < 2) stop(sprintf("a cell has %d value(s); an SEM needs two", length(ts)))
  c(t = mean(ts), sem = sd(ts) / sqrt(length(ts)), n = length(ts))
}
stopifnot(all(feq(cell_of(c(1, 3)), c(2, 1, 2))),
          inherits(tryCatch(cell_of(5), error = identity), "error"))

# -dln t / dln phi, positive when t falls as phi rises, with each cell's
# relative error propagated (the runner's `localExponentWithSem`).
step_of <- function(lo, hi, c_lo, c_hi) {
  L <- log(hi / lo)
  c(a = -(log(c_hi[["t"]]) - log(c_lo[["t"]])) / L,
    sem = sqrt((c_lo[["sem"]] / c_lo[["t"]])^2 + (c_hi[["sem"]] / c_hi[["t"]])^2) / L)
}
local({
  s <- step_of(1, 2, c(t = 200, sem = 0), c(t = 100, sem = 0))
  stopifnot(feq(s[["a"]], 1), feq(s[["sem"]], 0))
  s <- step_of(1, 2, c(t = 100, sem = 0), c(t = 200, sem = 0))
  stopifnot(feq(s[["a"]], -1))                              # a flipped sign is visible
  stopifnot(feq(step_of(1, exp(1), c(t = 10, sem = 1), c(t = 10, sem = 0))[["sem"]], 0.1))
})

# The primary: out of band at two or more ratios falsifies. The band is closed.
primary_of <- function(a) {
  out <- a < BAND[["lo"]] | a > BAND[["hi"]]
  list(verdict = if (sum(out) >= 2) "FALSIFIED" else "HELD",
       in_band = sum(!out), out_high = sum(a > BAND[["hi"]]), out_low = sum(a < BAND[["lo"]]))
}
stopifnot(primary_of(c(1, 1, 1))$verdict == "HELD",
          primary_of(c(0.95, 1.05, 1.2))$verdict == "HELD",
          primary_of(c(1.06, 0.94, 1))$verdict == "FALSIFIED",
          primary_of(c(1.1, 1.1, 1.1))$out_high == 3)

# Secondary 2: a step whose exponent FALLS, as phi falls, by more than the
# combined SEM of the two steps. Steps are ordered largest phi first.
decreases_of <- function(a, sem) {
  i <- seq_len(length(a) - 1)
  drop <- a[i] - a[i + 1]; comb <- sqrt(sem[i]^2 + sem[i + 1]^2)
  data.frame(from = i, drop = drop, comb = comb)[drop > comb, ]
}
stopifnot(nrow(decreases_of(c(0.8, 0.9, 1.0), rep(0.01, 3))) == 0,
          nrow(decreases_of(c(1.0, 0.9, 1.0), rep(0.01, 3))) == 1,
          nrow(decreases_of(c(1.0, 0.99, 1.0), rep(0.01, 3))) == 0)

# 3-dp agreement with the runner.
matches_runner <- function(x, printed) identical(sprintf("%.3f", x), sprintf("%.3f", printed))
stopifnot(matches_runner(1.0266, 1.027), !matches_runner(1.0276, 1.027))

# ---------------------------------------------------------------------------
# DATA

d5 <- read.csv(CSV_005, colClasses = c(ratio = "character"))
p2 <- read.csv(CSV_P2, colClasses = c(ratio = "character"))
D5_UNDRAWN <- setdiff(sort(unique(d5$phi)), STEP_PHIS)
stopifnot(length(D5_UNDRAWN) >= 1, all(D5_UNDRAWN > max(STEP_PHIS)))
P1_PHIS <- sort(unique(read.csv(CSV_P1, colClasses = c(ratio = "character"))$phi))
# Phase 1 must interleave the drawn cells, never coincide with one: a shared phi
# would mean a drawn cell silently omits Phase 1 seeds.
stopifnot(length(P1_PHIS) == 5, !any(outer(P1_PHIS, STEP_PHIS, feq)))

# --- Phase 2's grid ---------------------------------------------------------
key <- function(phi, ratio, seed) sprintf("%.6f|%s|%d", phi, ratio, seed)
grid_ok <- function(d) {
  want <- with(expand.grid(phi = P2_PHIS, ratio = RATIOS, seed = SEEDS, stringsAsFactors = FALSE),
               key(phi, ratio, seed))
  have <- key(d$phi, d$ratio, d$seed)
  nrow(d) == length(want) && !anyDuplicated(have) && setequal(have, want)
}
# Negative controls, run on the frame AS READ and BEFORE any fault is injected:
# each corruption must fail. (Run after injection, `dup_row` made the drop-a-row
# control return to a complete grid and fail for the wrong reason.) The positive
# case is the real check below.
stopifnot(!grid_ok(p2[-1, ]), !grid_ok(rbind(p2, p2[1, ])),
          !grid_ok(transform(p2, phi = replace(phi, 1, 0.0007))))

FAULTS <- list(
  drop_row      = function() p2 <<- p2[-1, ],
  dup_row       = function() p2 <<- rbind(p2, p2[1, ]),
  foreign_cell  = function() p2$phi[1] <<- 0.0007,
  perturb_tsat  = function() {
    i <- which(p2$phi == 0.0005 & p2$ratio == "2.00" & p2$saturated == 1)[1]
    p2$saturation_generation[i] <<- p2$saturation_generation[i] * 1.05
  },
  censor_as_sat = function() {
    i <- which(p2$saturated == 0 & p2$extinct == 0)[1]
    p2$saturated[i] <<- 1; p2$saturation_generation[i] <<- p2$horizon[i]
  },
  drop_005_row  = function() d5 <<- d5[-which(feq(d5$phi, 0.002) & d5$ratio == "3.33")[1], ],
  perturb_005   = function() {
    i <- which(feq(d5$phi, 0.0113) & d5$ratio == "5.00" & d5$saturated == 1)[1]
    d5$saturation_generation[i] <<- d5$saturation_generation[i] * 1.05
  })
FAULT <- Sys.getenv("PLOT006_FAULT")
if (nzchar(FAULT)) {
  if (!FAULT %in% names(FAULTS)) stop(sprintf("unknown PLOT006_FAULT '%s'; known: %s", FAULT, paste(names(FAULTS), collapse = ", ")))
  FAULTS[[FAULT]]()
  cat(sprintf("⚠️ FAULT INJECTED: %s — this run must stop before writing %s\n", FAULT, FIG))
}

if (!grid_ok(p2)) stop(sprintf("%s is not the registered Phase 2 grid (%d rows; want 60, one per phi x ratio x seed)", CSV_P2, nrow(p2)))

p2$outcome <- outcome_of(p2)
if (any(p2$outcome == "stopped early")) stop("a Phase 2 run stopped early without saturating or going extinct")
censored <- p2[p2$outcome == "censored", ]
extinct  <- p2[p2$outcome == "extinct", ]

# --- the six registered cells per ratio --------------------------------------
# Above 0.001 from 005 (saturated seeds only); 0.001 and 0.0005 from Phase 2.
# `treatment = "censored"` adds each censored run at its horizon, the least its
# t_sat could be. Extinct runs have no t_sat under either treatment.
cells_for <- function(r, treatment = c("registered", "censored")) {
  treatment <- match.arg(treatment)
  t(vapply(STEP_PHIS, function(phi) {
    if (phi %in% P2_PHIS) {
      z <- p2[feq(p2$phi, phi) & p2$ratio == r, ]
      ts <- z$saturation_generation[z$outcome == "saturated"]
      if (treatment == "censored") ts <- c(ts, z$stopped_at[z$outcome == "censored"])
    } else {
      z <- d5[feq(d5$phi, phi) & d5$ratio == r, ]
      if (nrow(z) != 10) stop(sprintf("005 cell phi=%s ratio=%s has %d rows, not 10", phi, r, nrow(z)))
      ts <- z$saturation_generation[z$saturated == 1]
    }
    cell_of(ts)
  }, c(t = 0, sem = 0, n = 0)))
}
steps_for <- function(r, treatment = "registered") {
  cl <- cells_for(r, treatment)
  do.call(rbind, lapply(seq_len(nrow(cl) - 1), function(i) {
    hi <- STEP_PHIS[i]; lo <- STEP_PHIS[i + 1]
    s <- step_of(lo, hi, cl[i + 1, ], cl[i, ])
    data.frame(ratio = r, lo = lo, hi = hi, a = s[["a"]], sem = s[["sem"]])
  }))
}
steps <- do.call(rbind, lapply(RATIOS, steps_for))

# --- agreement with the runner, to 3 dp --------------------------------------
agree <- function(st) {
  m <- merge(st, RUNNER, by = c("ratio", "lo"), suffixes = c("", ".runner"))
  nrow(m) == nrow(RUNNER) &&
    all(mapply(matches_runner, m$a, m$a.runner)) &&
    all(mapply(matches_runner, m$sem, m$sem.runner))
}
# Negative control: the same recount on a perturbed copy must disagree.
local({
  st <- steps; i <- which(st$ratio == "3.33" & st$lo == 0.0005)
  st$a[i] <- st$a[i] + 0.002
  stopifnot(!agree(st))
})
if (!agree(steps)) {
  print(merge(steps, RUNNER, by = c("ratio", "lo"), suffixes = c("", ".runner"), all = TRUE))
  stop("the recount does not reproduce the runner's printed local exponents to 3 dp — refusing to draw")
}

cens_steps <- do.call(rbind, lapply(RATIOS, steps_for, treatment = "censored"))
primary_reg  <- steps[steps$lo == PRIMARY_STEP[["lo"]], ]
primary_cens <- cens_steps[cens_steps$lo == PRIMARY_STEP[["lo"]], ]
stopifnot(identical(primary_reg$ratio, RATIOS), identical(primary_cens$ratio, RATIOS))
moved <- primary_cens$ratio[abs(primary_cens$a - primary_reg$a) > 1e-12]
if (!identical(moved, unique(censored$ratio)))
  stop("the censored treatment changed a ratio that has no censored runs, or missed one that does")
bound <- primary_cens[primary_cens$ratio %in% moved, ]
if (nrow(bound) != 1 || bound$ratio != RUNNER_CENSORED[["ratio"]] ||
    sprintf("%.3f", bound$a) != RUNNER_CENSORED[["a"]] ||
    sprintf("%.3f", bound$sem) != RUNNER_CENSORED[["sem"]])
  stop("the censored-at-horizon treatment does not reproduce FINDINGS.md's 1.648 ± 0.281")

V_REG  <- primary_of(primary_reg$a)
V_CENS <- primary_of(primary_cens$a)
if (V_REG$verdict != "HELD") stop("the recount does not reproduce the runner's PRIMARY: HELD")

dec <- do.call(rbind, lapply(RATIOS, function(r) {
  z <- steps[steps$ratio == r, ]
  q <- decreases_of(z$a, z$sem)
  if (nrow(q) == 0) return(NULL)
  cbind(ratio = r, from = step_name(z$lo[q$from], z$hi[q$from]),
        to = step_name(z$lo[q$from + 1], z$hi[q$from + 1]), q[, c("drop", "comb")])
}))

# ---------------------------------------------------------------------------
# DERIVED TEXT. Every data-dependent string below is computed, never typed.

fmt <- function(x) format(x, drop0trailing = TRUE, scientific = FALSE, trim = TRUE)
nw <- c("no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten")
cnt <- function(n) if (n < length(nw)) nw[n + 1] else as.character(n)
# The strip carries each ratio's primary-step value, so the verdict can be read
# as a number and not only by judging a mark against the band edge (5.00 sits
# 0.0075 inside it — about 6 px).
band_word <- function(a) if (a > BAND[["hi"]]) "out, high" else if (a < BAND[["lo"]]) "out, low" else "in band"
strip_fmt <- function(r) {
  a <- primary_reg$a[match(r, primary_reg$ratio)]
  sprintf("theta/sigmaS = %s     primary step: a = %.3f, %s", r, a, vapply(a, band_word, character(1)))
}
stopifnot(band_word(0.95) == "in band", band_word(1.0501) == "out, high", band_word(0.9499) == "out, low")
hard_wrap <- function(x, width) paste(strwrap(x, width = width), collapse = "\n")

headline <- sprintf(
  "Primary %s as registered (%d of 3 ratios in band); %s if the %d censored runs count at their horizon",
  tolower(V_REG$verdict), V_REG$in_band,
  if (V_CENS$verdict == "FALSIFIED") "falsified" else "still held", nrow(censored))

cens_cell <- unique(censored[, c("phi", "ratio")])
stopifnot(nrow(cens_cell) == 1)
sat_same <- p2[feq(p2$phi, cens_cell$phi) & p2$ratio == cens_cell$ratio & p2$outcome == "saturated", ]
ext_txt <- paste(vapply(split(extinct, extinct$ratio, drop = TRUE), function(z) {
  per_phi <- vapply(split(z, z$phi), function(w) sprintf("%s at phi = %s", cnt(nrow(w)), fmt(w$phi[1])), character(1))
  sprintf("ratio %s: %s", z$ratio[1], paste(rev(per_phi), collapse = ", "))
}, character(1)), collapse = "; ")
n_dec <- if (is.null(dec)) 0L else length(unique(dec$ratio))
dec_txt <- paste0(
  if (n_dec >= 2) "FALSIFIED" else "HELD", " (a decrease beyond one combined SEM at ", n_dec,
  " of 3 ratios; falsified at 2 or more)",
  if (n_dec == 0) "" else paste0(": ", paste(sprintf(
    "at ratio %s, step %s to step %s fell %.3f against %.3f",
    dec$ratio, dec$from, dec$to, dec$drop, dec$comb), collapse = "; "),
    ". Adjacent steps share a cell, so their estimates covary negatively; that combined SEM ignores this, so it understates the SEM of the difference"))

caption <- paste(
  hard_wrap(paste0(
    "Each line spans one registered step, lo→hi in phi; its mark and bar sit at the geometric midpoint. ",
    "Bars are ±1 SEM, propagated from each cell's relative error, over saturated seeds only. ",
    "The steps are Secondary 2's registered sequence: cells above phi = 0.001 come from 005, the cells at 0.001 and 0.0005 are 006's Phase 2. ",
    "Phase 1's ", cnt(length(P1_PHIS)), " cells (phi = ", paste(fmt(P1_PHIS), collapse = ", "),
    ") were fitted for Secondary 1 and sized Phase 2's horizon; they are not in Secondary 2's sequence and are not drawn, nor is 005's phi = ",
    paste(fmt(D5_UNDRAWN), collapse = ", "), ". The grey band is the registered [", fmt(BAND[["lo"]]), ", ", fmt(BAND[["hi"]]),
    "], and the primary scores only the ", fmt(PRIMARY_STEP[["lo"]]), "→", fmt(PRIMARY_STEP[["hi"]]),
    " step; it is drawn there and nowhere else. The dark line marks a = 1 for reference; this figure does not claim a = 1."), 190),
  hard_wrap(paste0(
    "Open mark and arrow (ratio ", bound$ratio, ", primary step, drawn without a step line): at phi = ", fmt(cens_cell$phi), ", ", cnt(nrow(censored)),
    " of 10 seeds were still controlled at ", fmt(round(min(censored$copies_per_genome))), "–",
    fmt(round(max(censored$copies_per_genome))), " copies/genome when the ", fmt(censored$horizon[1]),
    "-generation horizon ended; the other ", cnt(nrow(sat_same)), " saturated at ",
    fmt(min(sat_same$saturation_generation)), "–", fmt(max(sat_same$saturation_generation)),
    ". As registered they are excluded. Counted at the horizon, the earliest they could still saturate, a = ",
    sprintf("%.3f", bound$a), " ± ", sprintf("%.3f", bound$sem),
    "; if they do saturate the value is higher still, hence the arrow (a run that goes extinct instead drops out of both counts); as the Result says, the 0.281 comes from the bimodality, not from sampling noise. It is a bound, so no bar is drawn."), 190),
  hard_wrap(paste0(
    "Not marked: ", cnt(nrow(extinct)), " runs went extinct (", ext_txt, ") and have no t_sat under either count, so ratio ",
    paste(unique(extinct$ratio), collapse = ", "), "'s steps that touch phi = ", paste(fmt(sort(unique(extinct$phi))), collapse = " or "),
    " (", paste(unique(step_name(steps$lo[steps$lo %in% extinct$phi | steps$hi %in% extinct$phi],
                              steps$hi[steps$lo %in% extinct$phi | steps$hi %in% extinct$phi])), collapse = ", "),
    ") are over surviving seeds only. ",
    "Secondary 2: ", dec_txt, ". Secondary 1 (form selection) is a table in docs/FINDINGS.md and is not drawn. ",
    "Made after the Result; the registration names no figure. Rscript docs/analysis/plot-006.R"), 190),
  sep = "\n\n")

# ---------------------------------------------------------------------------
# FIGURE

steps$mid <- sqrt(steps$lo * steps$hi)
steps$ratio <- factor(steps$ratio, levels = RATIOS)
band <- data.frame(ratio = factor(RATIOS, levels = RATIOS),
                   xmin = PRIMARY_STEP[["lo"]], xmax = PRIMARY_STEP[["hi"]],
                   ymin = BAND[["lo"]], ymax = BAND[["hi"]])
bound$mid <- sqrt(bound$lo * bound$hi)
bound$ratio <- factor(bound$ratio, levels = RATIOS)
# Short enough that the head stays below the next y gridline: a head past it
# would read as a value (1.79) the data never measured.
ARROW_LEN <- 0.08
bound$yend <- bound$a + ARROW_LEN
# The label ties the bound to the registered value in the same panel: that solid
# mark is drawn like every other step, but it EXCLUDES the censored runs, which
# biases it low. A bound, so "≥".
bound$label <- sprintf("≥ %.3f if the %s censored runs\nsaturate (counted at their horizon);\nthe filled %.3f below excludes them",
                       bound$a, cnt(nrow(censored)), primary_reg$a[match(bound$ratio, primary_reg$ratio)])

fig <- ggplot(steps) +
  geom_rect(data = band, aes(xmin = xmin, xmax = xmax, ymin = ymin, ymax = ymax),
            inherit.aes = FALSE, fill = tge_ink[["band_fill"]],
            colour = tge_ink[["bracket"]], linewidth = 0.3) +
  geom_hline(yintercept = 1, colour = tge_ink[["rule"]], linewidth = 0.8) +
  geom_segment(aes(x = lo, xend = hi, y = a, yend = a, colour = ratio, linetype = ratio),
               linewidth = 0.8) +
  geom_linerange(aes(x = mid, ymin = a - sem, ymax = a + sem, colour = ratio), linewidth = 0.6) +
  geom_point(aes(mid, a, colour = ratio, shape = ratio), size = 2.4) +
  geom_segment(data = bound, aes(x = mid, xend = mid, y = a, yend = yend, colour = ratio),
               arrow = grid::arrow(length = unit(0.14, "cm")), linewidth = 0.6) +
  # The OPEN counterpart: `shape_003` has no fill, so "open mark" needs 21/22/24.
  geom_point(data = bound, aes(mid, a, colour = ratio),
             shape = shape_003_open[[as.character(bound$ratio)]],
             size = 2.6, fill = "white", stroke = 0.9) +
  # A label, not text: its white backing keeps the phi = 0.001 and 0.002
  # gridlines from striking through the words.
  geom_label(data = bound, aes(mid, a, label = label), hjust = 0, nudge_x = 0.07,
             size = 3, colour = tge_ink[["bracket"]], lineheight = 0.95,
             fill = "white", linewidth = 0, label.padding = unit(0.12, "lines")) +
  scale_colour_manual(values = palette_003, limits = RATIOS, guide = "none") +
  scale_linetype_manual(values = linetype_ratio, limits = RATIOS, guide = "none") +
  scale_shape_manual(values = shape_003, limits = RATIOS, guide = "none") +
  scale_x_log10(breaks = STEP_PHIS, labels = fmt) +
  facet_wrap(~ratio, nrow = 1, labeller = labeller(ratio = strip_fmt)) +
  labs(title = headline,
       subtitle = "Local exponent a = -dln t_sat / dln phi on each of Secondary 2's registered steps; the primary scores the leftmost (log axis)",
       x = "trap infidelity  phi", y = "local exponent  a", caption = caption) +
  theme_tge() + theme_tge_facet_spacing() + theme_tge_margin()

# ---------------------------------------------------------------------------
# GUARDS ON THE BUILT PLOT

bd <- ggplot_build(fig)
geoms <- unname(vapply(fig$layers, function(l) class(l$geom)[1], character(1)))
stopifnot(identical(geoms, c("GeomRect", "GeomHline", "GeomSegment", "GeomLinerange",
                             "GeomPoint", "GeomSegment", "GeomPoint", "GeomLabel")))
panel_ratio <- function(b) as.character(bd$layout$layout$ratio[match(b$PANEL, bd$layout$layout$PANEL)])
same <- function(x, y) length(x) == length(y) && all(abs(sort(x) - sort(y)) < 1e-9)
# The band is drawn once per panel and only over the primary step.
b1 <- bd$data[[1]]
stopifnot(nrow(b1) == 3, same(10^b1$xmin, rep(PRIMARY_STEP[["lo"]], 3)),
          same(10^b1$xmax, rep(PRIMARY_STEP[["hi"]], 3)))
# Every drawn step value is the recounted one, in its own panel.
b3 <- bd$data[[3]]; b5 <- bd$data[[5]]; b4 <- bd$data[[4]]
for (r in RATIOS) {
  z <- steps[steps$ratio == r, ]
  stopifnot(same(b3$y[panel_ratio(b3) == r], z$a), same(b5$y[panel_ratio(b5) == r], z$a),
            same(b4$ymin[panel_ratio(b4) == r], z$a - z$sem), same(b4$ymax[panel_ratio(b4) == r], z$a + z$sem))
}
# The bound appears in exactly one panel, the censored ratio, with no bar, and
# its mark is the open shape.
b7 <- bd$data[[7]]
stopifnot(nrow(b7) == 1, panel_ratio(b7) == bound$ratio, same(b7$y, bound$a),
          b7$shape == shape_003_open[[as.character(bound$ratio)]], nrow(bd$data[[6]]) == 1)
# Nothing is clipped: the y range holds the bound's arrowhead and every bar.
yr <- bd$layout$panel_params[[1]]$y.range
stopifnot(yr[2] >= max(bound$yend), yr[1] <= min(steps$a - steps$sem))
yb <- bd$layout$panel_params[[1]]$y$breaks; yb <- yb[!is.na(yb)]
stopifnot(bound$yend < min(yb[yb > bound$a]))   # the arrowhead stops short of the next gridline
# Contrast: every series colour and the band outline clear the non-text floor.
stopifnot(all(vapply(c(palette_003, tge_ink[["bracket"]]), contrast_ratio, numeric(1)) >= WCAG_NONTEXT_FLOOR))
# No number anywhere in the text is in scientific notation.
stopifnot(!grepl("[0-9]e[-+]?[0-9]", c(headline, caption, bound$label, strip_fmt(RATIOS))))
# The headline agrees with both verdicts.
stopifnot(grepl(tolower(V_REG$verdict), headline, fixed = TRUE),
          grepl(if (V_CENS$verdict == "FALSIFIED") "falsified" else "still held", headline, fixed = TRUE))

TMP <- tempfile(fileext = ".png")
ggsave(TMP, fig, width = SHIP_W, height = SHIP_H, dpi = SHIP_DPI, bg = "white")
# NO INK AT THE PAGE EDGE, measured on the rendered pixels. The headline was
# clipped off the right edge twice while every layer guard above passed: text
# overflow is visible only in the PNG.
EDGE_PX <- 12
edge_ink <- function(path) {
  img <- png::readPNG(path)[, , 1:3]
  ink <- apply(img, c(1, 2), min) < 0.95
  h <- nrow(ink); w <- ncol(ink)
  any(ink[c(seq_len(EDGE_PX), h - seq_len(EDGE_PX) + 1), ]) ||
    any(ink[, c(seq_len(EDGE_PX), w - seq_len(EDGE_PX) + 1)])
}
local({  # controls: a clean page has no edge ink; text run off the edge does
  f <- tempfile(fileext = ".png")
  ggsave(f, ggplot() + theme_void(), width = 2, height = 1, dpi = 100, bg = "white")
  stopifnot(!edge_ink(f))
  ggsave(f, ggplot() + theme_void() + labs(title = strrep("W", 60)), width = 2, height = 1, dpi = 100, bg = "white")
  stopifnot(edge_ink(f)); unlink(f)
})
if (edge_ink(TMP)) stop("ink within ", EDGE_PX, " px of the page edge — something is clipped; refusing to write the figure")
stopifnot(file.copy(TMP, FIG, overwrite = TRUE)); unlink(TMP)

cat("\n=== QUESTION 006 — figure ===\n")
cat(sprintf("headline: %s\n", headline))
cat(sprintf("PRIMARY as registered ........ %s (%d in band, %d high, %d low)\n", V_REG$verdict, V_REG$in_band, V_REG$out_high, V_REG$out_low))
cat(sprintf("PRIMARY, censored at horizon . %s (%d in band, %d high, %d low)\n", V_CENS$verdict, V_CENS$in_band, V_CENS$out_high, V_CENS$out_low))
print(transform(steps[, c("ratio", "lo", "hi", "a", "sem")], a = round(a, 4), sem = round(sem, 4)), row.names = FALSE)
cat(sprintf("\nwrote %s\n", FIG))
