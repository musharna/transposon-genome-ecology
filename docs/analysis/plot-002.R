# Registered question 002 — conscription versus an innate silencer.
# One graph, one figure. Sources the house theme; defines no styling of its own.
#
# Registration: docs/pre-registrations/2026-09-04-conscription-vs-innate-silencer.md
# (committed ALONE at 82ab678, before the runner existed). The analysis below is
# the one that document pre-specifies, and NOTHING MORE: the grid table and two
# counts. No t-test and no p-value appears here, because the registration fixes
# that reporting one would be the "rank tables invite a comparison their CIs
# cannot support" failure — with 10 seeds per cell these are proportions, and
# they are reported with their denominators.
source("docs/analysis/theme.R")

d <- read.csv("experiments/002-conscription-vs-innate.csv")
d$arm <- factor(d$arm, levels = c("A-conscription", "B-innate"))

# --- manipulation checks, re-run here on the CSV rather than trusted ---------
# The runner throws if these fail; re-asserting them on the CSV means the figure
# cannot be built from a file produced by a broken pair of arms. Check 1 (the
# composed loop reproduces sim/step.ts's stateHash) is not re-assertable from a
# CSV — it lives in the runner, where the two worlds exist.
stopifnot(all(d$ever_had_repertoire == 1))                                   # 4
stopifnot(all(d$saw_nonzero_entry[d$arm == "A-conscription"] == 1))          # 2
stopifnot(all(d$saw_nonzero_entry[d$arm == "B-innate"] == 0))                # 3
cat("manipulation checks 2-4 re-asserted on the CSV: PASS\n")
stopifnot(nrow(d) == 180)
cat(sprintf("%d runs, %d grid points, %d seeds per cell\n",
            nrow(d), length(unique(paste(d$theta, d$sigma_s))),
            length(unique(d$seed))))

# --- the pre-specified outcomes, per grid point per arm ---------------------
# VIABLE, fixed by the registration: fewer than half the seeds at that grid
# point are extinct at the horizon. Saturation counts as NOT extinct.
grid <- aggregate(
  cbind(extinct, silenced_fraction, copies_per_genome, saturated) ~
    theta + sigma_s + k_star + arm,
  data = d, FUN = mean
)
grid$viable <- grid$extinct < 0.5
grid <- grid[order(grid$theta, grid$sigma_s, grid$arm), ]

cat("\n=== the grid: pre-specified outcomes, per point per arm ===\n")
print(grid, row.names = FALSE, digits = 3)

# --- the two registered counts ----------------------------------------------
wide <- reshape(
  grid[, c("theta", "sigma_s", "arm", "viable", "silenced_fraction")],
  idvar = c("theta", "sigma_s"), timevar = "arm", direction = "wide"
)
names(wide) <- c("theta", "sigma_s", "viable_A", "sil_A", "viable_B", "sil_B")

both_viable <- sum(wide$viable_A & wide$viable_B)
a_viable <- wide[wide$viable_A, ]
b_still_silencing <- sum(a_viable$sil_B >= 0.05)

cat("\n=== registered prediction (PRIMARY), as registered, on all 9 points ===\n")
cat(sprintf("grid points where BOTH arms are viable: %d of %d   (predicted: 0)\n",
            both_viable, nrow(wide)))
cat(sprintf("  -> %s\n", if (both_viable == 0) {
  "PREDICTION HELD"
} else {
  "PREDICTION FALSIFIED - those points are gradable, and 003 is sited there"
}))

cat("\n=== secondary registered prediction ===\n")
cat(sprintf("grid points where arm A is viable: %d\n", nrow(a_viable)))
if (nrow(a_viable) > 0) {
  cat(sprintf("  of those, arm B mean silenced fraction >= 0.05: %d   (predicted: 0)\n",
              b_still_silencing))
  print(a_viable[, c("theta", "sigma_s", "sil_A", "sil_B")],
        row.names = FALSE, digits = 3)
} else {
  cat("  arm A is viable NOWHERE on this grid, so the secondary prediction is\n")
  cat("  VACUOUS here - it is reported as untested, not as held.\n")
}

# --- ADDENDUM, NOT REGISTERED: the two axes are ONE axis ---------------------
# Recorded as a deviation in the registration. `s`-space carries no constant
# other than theta and sigmaS: `s` is generated as parent.s + N(0,1)*sigmaS
# (sim/phases/transpose.ts:37), compared only as |copy.s - entry| <= theta
# (sim/silencing.ts:86-87), and otherwise only copied (trap.ts:44, reproduce.ts:48);
# every copy is founded at s = 0. So rescaling (s, sigmaS, theta) by any lambda
# maps trajectories onto trajectories, consuming the same RNG draws in the same
# order. Arm B is invariant too: its inserted value 0 is a fixed point.
#
# THIS IS ASSERTED HERE, NOT ASSUMED. If the collapse is not exact the script
# says so and stops, rather than quietly reporting 6 regimes that are really 9.
d$ratio <- d$theta / d$sigma_s
OUTCOMES <- c("copies_per_genome", "silenced_fraction", "extinct", "stopped_at",
              "entries_per_genome")
# Compared as an unnamed numeric matrix, NOT as a data.frame: `identical` on a
# data.frame also compares row.names, which differ between two grid points by
# construction, so it would report a difference that is not in the numbers. The
# comparison stays EXACT (no tolerance) - these are doubles read from one CSV.
outcomes_of <- function(theta, sigma_s, arm) {
  r <- d[d$theta == theta & d$sigma_s == sigma_s & d$arm == arm, ]
  unname(as.matrix(r[order(r$seed), OUTCOMES]))
}

cat(sprintf("\n=== ADDENDUM: scale invariance in s-space (NOT registered) ===\n"))

# POSITIVE CONTROL, ASSERTED FIRST. An equality check that cannot report a
# difference proves nothing, and "a check that cannot discriminate" is this
# project's signature defect. Two grid points with DIFFERENT theta/sigmaS must
# come out DIFFERENT under exactly the comparison used below.
ctrl_a <- outcomes_of(0.10, 0.015, "A-conscription")   # ratio 6.67
ctrl_b <- outcomes_of(0.10, 0.020, "A-conscription")   # ratio 5.00
stopifnot(!identical(ctrl_a, ctrl_b))
cat("  positive control: two points at DIFFERENT theta/sigmaS differ under this\n")
cat("  same comparison, so it can report a difference when one exists.\n")

cells <- split(d, list(d$arm, round(d$ratio, 9)), drop = TRUE)
dup_checked <- 0
for (nm in names(cells)) {
  cell <- cells[[nm]]
  pts <- unique(cell[, c("theta", "sigma_s")])
  if (nrow(pts) < 2) next
  ref <- outcomes_of(pts$theta[1], pts$sigma_s[1], as.character(cell$arm[1]))
  for (i in 2:nrow(pts)) {
    oth <- outcomes_of(pts$theta[i], pts$sigma_s[i], as.character(cell$arm[1]))
    stopifnot(identical(ref, oth))
    dup_checked <- dup_checked + 1
  }
}
stopifnot(dup_checked > 0)
cat(sprintf("  verified %d duplicate grid-point pairs identical on every seed\n", dup_checked))

reg <- unique(grid[, c("theta", "sigma_s")])
cat(sprintf("the %d registered grid points are %d DISTINCT regimes (by theta/sigmaS)\n",
            nrow(reg), length(unique(round(reg$theta / reg$sigma_s, 9)))))

grid$ratio <- grid$theta / grid$sigma_s
dgrid <- grid[!duplicated(paste(grid$arm, round(grid$ratio, 9))), ]
dwide <- reshape(
  dgrid[, c("ratio", "k_star", "arm", "viable", "silenced_fraction")],
  idvar = c("ratio", "k_star"), timevar = "arm", direction = "wide"
)
names(dwide) <- c("ratio", "k_star", "viable_A", "sil_A", "viable_B", "sil_B")
dwide <- dwide[order(dwide$k_star), ]
cat(sprintf("both arms viable at %d of %d DISTINCT regimes\n",
            sum(dwide$viable_A & dwide$viable_B), nrow(dwide)))
print(dwide, row.names = FALSE, digits = 3)

# --- the figure: the primary outcome on the axis that actually varies --------
# One graph. Extinction fraction against theta/sigmaS, which the addendum shows
# is the model's only s-space axis. The registration's VIABLE threshold is drawn,
# so the registered prediction is checkable by eye: it is falsified exactly where
# both arms sit below the line above the same x position.
# The arms coincide exactly at 0 and at 1, and an overplotted point would hide
# the very thing this figure exists to show - that BOTH arms are below the line
# at the two shallowest traps. A small vertical dodge keeps both visible; it
# moves nothing horizontally, so no point is displaced along the axis that
# carries the meaning.
dodge <- position_dodge(width = 0)
dgrid$shown <- dgrid$extinct + ifelse(dgrid$arm == "A-conscription", -0.012, 0.012)
p <- ggplot(dgrid, aes(x = ratio, y = shown, colour = arm, group = arm)) +
  geom_hline(yintercept = 0.5, linetype = "22", colour = "grey45") +
  geom_line(linewidth = 0.6) +
  geom_point(size = 2.8) +
  scale_colour_manual(values = palette_002, name = NULL) +
  # coord_cartesian, NOT scale_y_continuous(limits=): a scale limit DROPS points
  # outside it, and the 0.012 offset puts the coincident pairs at -0.012 and
  # 1.012. Clipping them silently removed 4 points - including the ones the
  # figure is about. This zooms instead of filtering.
  scale_y_continuous(breaks = seq(0, 1, 0.25)) +
  coord_cartesian(ylim = c(-0.04, 1.04)) +
  scale_x_continuous(breaks = sort(unique(dgrid$ratio)),
                     labels = function(x) sprintf("%.2f", x)) +
  labs(
    title = "Both arms survive together at the two shallowest traps",
    subtitle = "Fraction of seeds extinct at generation 600; 10 seeds per point",
    caption = paste0(
      "Registered outcome 1 (primary). Below the dashed line = VIABLE (fewer than\n",
      "half the seeds extinct), as fixed by the pre-registration, which predicted\n",
      "NO x position with both arms below it. Two positions have both, so the\n",
      "prediction is FALSIFIED. x is theta/sigmaS because that is the model's only\n",
      "s-space axis - the 9 registered grid points collapse onto these 6 exactly.\n",
      "Arms are offset vertically by 0.012 so a coincident pair stays visible;\n",
      "the plotted values are 0 and 1 exactly."
    ),
    x = "theta / sigmaS   (smaller = shallower trap, faster escape)",
    y = "fraction of seeds extinct"
  ) +
  theme_tge()

ggsave("docs/analysis/fig-002-viability.png", p, width = 7, height = 5, dpi = 200)
cat("\nwrote docs/analysis/fig-002-viability.png\n")
