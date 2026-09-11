# Registered question 001 — per-copy versus family-level rate heritability.
# One graph, one figure. Sources the house theme; defines no styling of its own.
#
# Registration: docs/pre-registrations/2026-09-02-per-copy-vs-family-rate.md
# (committed at f5ae5b1, before the runner existed). The three tests below are
# the ones that document pre-specifies, in the order it specifies them.
source("docs/analysis/theme.R")

d <- read.csv("experiments/001-per-copy-vs-family-rate.csv")
d$arm <- factor(d$arm, levels = c("per-copy", "family-level"))

# --- manipulation check, re-run here on the CSV rather than trusted ----------
# The runner throws if this fails; re-asserting it in the analysis means the
# figure cannot be built from a CSV produced by a broken pair of arms.
dev <- abs(d$mean_rate_at_peak - d$r0)
stopifnot(all(d$peak_generation >= 1))
stopifnot(all(dev[d$arm == "family-level"] <= 1e-12))
stopifnot(all(dev[d$arm == "per-copy"] > 1e-6))
cat("manipulation check re-asserted on the CSV: PASS\n")

# --- the figure: pre-specified outcome 1, the primary -----------------------
# geom_jitter draws from R's RNG, so without a seed this figure is different on
# every run and "re-run the script to reproduce it" is false. The seed moves the
# x-offsets of the plotted points only; every y value, the boxplot, and all three
# tests below are computed from the CSV and do not touch the RNG.
set.seed(1)
p <- ggplot(d, aes(x = arm, y = peak_copies_per_genome, fill = arm)) +
  geom_boxplot(outlier.shape = NA, alpha = 0.55, width = 0.5) +
  geom_jitter(width = 0.12, size = 1.2, alpha = 0.7) +
  scale_fill_manual(values = palette_tge, guide = "none") +
  labs(
    title = "Peak copy number per genome, by rate-heritability arm",
    subtitle = "40 seeds per arm, 600 generations, sigmaS/theta = 0.133",
    caption = paste0(
      "Registered outcome 1 (primary). Peak rather than final: final copy\n",
      "number is 0 in every extinct run, so it restates outcome 2.\n",
      "Regime picked on held-out seeds 1001-1010 by a pooled, arm-blind\n",
      "criterion - see the pre-registration."
    ),
    x = NULL, y = "peak copies per genome"
  ) +
  theme_tge()

ggsave("docs/analysis/fig-001-peak-copies.png", p, width = 6.5, height = 5, dpi = 200)

# --- the three pre-specified tests ------------------------------------------
cat("\n=== group summaries ===\n")
print(aggregate(
  cbind(peak_copies_per_genome, final_copies_per_genome, extinct) ~ arm,
  data = d, FUN = mean
))

cat("\n--- outcome 1 (PRIMARY): Welch's t on peak copies per genome ---\n")
print(t.test(peak_copies_per_genome ~ arm, data = d))

cat("\n--- outcome 2: two-proportion test on extinction by generation 600 ---\n")
ext <- tapply(d$extinct, d$arm, sum)
n <- tapply(d$extinct, d$arm, length)
cat(sprintf("per-copy %d/%d, family-level %d/%d\n",
            ext[["per-copy"]], n[["per-copy"]],
            ext[["family-level"]], n[["family-level"]]))
print(prop.test(c(ext[["per-copy"]], ext[["family-level"]]),
                c(n[["per-copy"]], n[["family-level"]])))

cat("\n--- outcome 3: Welch's t on time to inactivation, detected runs only ---\n")
excl <- tapply(is.na(d$time_to_inactivation), d$arm, sum)
print(data.frame(arm = names(excl), excluded_runs = as.integer(excl), row.names = NULL))
print(table(d$arm, d$phase_failure))
di <- d[!is.na(d$time_to_inactivation), ]
if (length(unique(di$arm)) == 2 && min(table(di$arm)) >= 2) {
  print(t.test(time_to_inactivation ~ arm, data = di))
} else {
  cat("not enough detected runs in both arms to test\n")
}
