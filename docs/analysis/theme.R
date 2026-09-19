# The project's single plotting house style. Every figure script sources this
# file and defines no styling of its own; restyle here, never inline.
#
# Spec §7: analysis figures are R + ggplot2 from one sourced theme file, and the
# runners emit CSV. The canvas rendering inside the toy is not a plot and does
# not come through here.
library(ggplot2)

# Declared before `theme_tge()` so the theme and every guard read ONE literal.
# When the grid colour lived only inside the theme body, a figure script
# re-typed the hex into its contrast guard — so restyling here would have left
# the guard measuring a colour the figure no longer draws, which is this
# project's signature defect re-armed.
tge_ink_gridline <- "#8c95a0"

# The two arms of registered question 001. Named, not positional, so a figure
# cannot silently swap them by reordering a factor.
palette_tge <- c("per-copy" = "#bf616a", "family-level" = "#5e81ac")

theme_tge <- function(base_size = 11) {
  theme_minimal(base_size = base_size) +
    theme(
      panel.grid.minor = element_blank(),
      # ⚠️ NOT grey90. Measured at #e5e5e5 = 1.26:1 against a white panel, against
      # this project's own WCAG_NONTEXT_FLOOR of 3 — and on a log-scaled panel the
      # gridlines are the ONLY reference for reading a value off the axis. Found by
      # an adversarial figure review after four rounds in which the contrast guard
      # checked the series colours and never the theme's own. #8c95a0 is the
      # lightest grey that clears the floor: measured 3.03:1. ⚠️ linewidth 0.4, not
      # 0.25: at 0.25 a gridline is ~1.5 device px, so any line not landing on a
      # pixel boundary is split across two pixels at partial coverage and renders
      # at 2.1-2.8:1 — the nominal hex the guard measures was reached by only 5 of
      # 20 gridlines. Antialiased EDGE pixels are always lighter; what matters is
      # that each line has at least one full-strength pixel.
      panel.grid.major = element_line(colour = tge_ink_gridline, linewidth = 0.4),
      axis.title = element_text(colour = "grey25"),
      plot.title = element_text(face = "bold", size = base_size + 2),
      plot.subtitle = element_text(colour = "grey35"),
      plot.caption = element_text(colour = "grey45", hjust = 0, size = rel(0.75)),
      legend.position = "top"
    )
}

# The two arms of registered question 002. Named, not positional, for the same
# reason as above. Deliberately NOT 001's two colours: a figure from one question
# should not be mistakable for a figure from the other at a glance.
palette_002 <- c("A-conscription" = "#a3be8c", "B-innate" = "#d08770")

# The three ratios of registered question 003. Named, not positional, for the
# same reason as above, and deliberately a third set of hues: 001, 002 and 003
# figures should not be mistakable for one another at a glance. The exploratory
# ratio is distinguished by LINETYPE rather than by colour, so that its status
# survives being printed or read in greyscale.
# Darkened from the Nord pastels on an adversarial figure review: the originals
# measured 2.83:1, 2.00:1 and 1.56:1 against white — all under the 3:1 WCAG floor
# for non-text graphics — and the teal/yellow pair was 1.28:1 against each other,
# with purple and teal collapsing together under deuteranopia. Shapes carry the
# same distinction redundantly, so the series stay separable without colour.
palette_003 <- c("2.00" = "#7d4e79", "3.33" = "#2b6d84", "5.00" = "#9a6b16")
shape_003 <- c("2.00" = 17, "3.33" = 16, "5.00" = 15)
# The OPEN counterparts, for a second data source on the same panel. ⚠️ Setting
# `fill = NA` on 15/16/17 is a NO-OP — those glyphs have no fill aesthetic — so a
# caption promising "open marks" beside them is simply false. 005 shipped exactly
# that and an adversarial review caught it. 21/22/24 are the fillable versions.
shape_003_open <- c("2.00" = 24, "3.33" = 21, "5.00" = 22)
linetype_003 <- c("registered" = "solid", "exploratory" = "22")

# Annotation styling for a composed (patchwork) figure. Kept HERE rather than
# inline in a plotting script, per the one-house-style rule.
#
# ⚠️ THIS MUST BE A PARTIAL `theme()`, NOT A COMPLETE THEME. patchwork's
# `plot_annotation(theme = ...)` rejects a complete theme (anything built from
# `theme_minimal()` and friends): under ggplot2 4.0.2 it warns "annotation$theme
# is not a valid theme" and then dies inside `set_border_sizes` with "object is
# not coercible to a unit". Passing `theme_tge()` there is the mistake; the
# panels get `theme_tge()` themselves and only the annotation text needs styling.
theme_tge_annotation <- function(title_size = 13, subtitle_size = 8.5,
                                 caption_size = 7) {
  theme(
    plot.title    = element_text(face = "bold", size = title_size),
    plot.subtitle = element_text(colour = "grey35", size = subtitle_size,
                                 lineheight = 1.25),
    plot.caption  = element_text(colour = "grey45", size = caption_size,
                                 lineheight = 1.25, hjust = 0)
  )
}

# WCAG relative-luminance contrast ratio between two hex colours.
#
# ⚠️ THIS EXISTS BECAUSE COMMENTS CLAIMING A CONTRAST MEASUREMENT KEPT BEING
# WRONG. A figure comment in this project asserted "#8fae8f measured 3.0:1 vs
# white"; it is 2.44:1. The palette note above quotes 2.83 / 2.00 / 1.56 for the
# original Nord hues and a 3:1 floor for non-text graphics. A number you can
# compute should never be a number you assert.
# ⚠️ `alpha` IS NOT OPTIONAL SUGAR — OMITTING IT WAS ITSELF A DEFECT. Until
# 2026-09-05 this function took no alpha, so every caller measured the RAW hex
# while the figure rendered the colour COMPOSITED OVER THE BACKGROUND. The guard
# in plot-005.R passed at 6.49 / 5.80 / 4.68 against a floor of 3 while the
# ribbons it was protecting actually rendered at 1.26 / 1.25 / 1.23 and the
# faded series at 1.87 / 1.81 / 1.71. A guard measuring a colour the figure never
# draws is the project's signature defect — a check that cannot observe what it
# is trusted for — and it was sitting under the comment above telling you not to
# assert a number you can compute. Found by an adversarial figure review.
contrast_ratio <- function(hex_a, hex_b = "#ffffff", alpha = 1, bg = "#ffffff") {
  composite <- function(h, a) {
    if (a >= 1) return(grDevices::col2rgb(h)[, 1] / 255)
    f <- grDevices::col2rgb(h)[, 1] / 255
    b <- grDevices::col2rgb(bg)[, 1] / 255
    a * f + (1 - a) * b
  }
  lum <- function(v) {
    v <- ifelse(v <= 0.03928, v / 12.92, ((v + 0.055) / 1.055)^2.4)
    sum(v * c(0.2126, 0.7152, 0.0722))
  }
  a <- lum(composite(hex_a, alpha)); b <- lum(composite(hex_b, 1))
  (max(a, b) + 0.05) / (min(a, b) + 0.05)
}
# The floor this project holds non-text graphics to.
WCAG_NONTEXT_FLOOR <- 3

# ⚠️ AND THE CLAIM ABOVE THAT DARKENING FIXED THE DEUTERANOPIA COLLAPSE IS FALSE.
# The series lose most of their separation under deuteranopia. ⚠️ NO SPECIFIC
# RATIO IS QUOTED HERE ANY MORE: an earlier version asserted 1.02 / 1.38 / 1.35,
# and an independent Brettel/Viénot implementation reproduced none of them
# (1.71 / 1.41 / 2.41). Two simulations disagreeing means the number is not
# established, and this file exists because asserted contrast numbers kept being
# wrong — so the qualitative claim stays and the unreproduced figures go. Adding
# a `deuteranopia_ratio()` beside `contrast_ratio()` would settle it; until then
# treat the collapse as real but unquantified. The darkening fixed contrast
# against WHITE, which is a
# different quantity from contrast against EACH OTHER, and the note conflated
# them. `shape_003` carries the distinction redundantly for POINTS only, so any
# line, ribbon or segment mapped to colour alone is unreadable to a deuteranope.
# Use `linetype_ratio` below on every non-point geom.
linetype_ratio <- c("2.00" = "solid", "3.33" = "42", "5.00" = "12")

# Non-series colours that figure scripts draw. Kept HERE, not inline in a script,
# per the one-house-style rule at the top of this file — 005 defined its bracket
# grey inline and a review scored it as an unlogged deviation from that rule.
# ⚠️ `gridline` REFERENCES THE LITERAL, IT DOES NOT RE-TYPE IT. Re-typing the
# same hex here meant `theme_tge()` drew with the declaration above while the
# figure script's contrast guard measured this copy — so changing one left the
# guard passing on a colour the figure no longer drew. That is the precise
# defect the comment above says this declaration exists to prevent, re-created
# in the same file by the fix for it. Demonstrated: set the literal above to
# "#e5e5e5" and the script still exited 0 with every gridline at 1.26:1.
# `band_fill` is the area fill of a registered band (006's [0.95, 1.05]); an area
# fill that cleared 3:1 against white would hide the gridlines inside it, so the
# band's non-text contrast is carried by its outline in `bracket`, not the fill.
tge_ink <- c(bracket = "#4b5563", rule = "grey35", extrapolation_rule = "grey45",
             gridline = tge_ink_gridline, band_fill = "grey90")

# Panel adjustments a figure may need. Also kept here rather than inline.
# ⚠️ SPLIT IN TWO. Bundling the spacing with the y-grid blanking meant figure 1,
# which needs its y grid, could not have the spacing — and its facet seams then
# put "0.0453" 12 px from the next panel's "0.002", reading as one run of digits.
# Two figures in a pair with different facet geometry, because one helper did two
# unrelated things.
theme_tge_facet_spacing <- function() {
  theme(panel.spacing.x = unit(1.1, "lines"))
}
theme_tge_facets <- function() {
  theme_tge_facet_spacing() + theme(panel.grid.major.y = element_blank())
}
theme_tge_margin <- function() {
  # ⚠️ The axis TITLE margin matters too: on a rotated y title ending in "t_sat"
  # the underscore came within 8 px of the "on the law" tick label and rendered
  # as a bar attached to it.
  theme(plot.margin = margin(10, 16, 10, 10),
        axis.text.y = element_text(margin = margin(r = 6)),
        axis.title.y = element_text(margin = margin(r = 10)))
}
