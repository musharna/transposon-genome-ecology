# The project's single plotting house style. Every figure script sources this
# file and defines no styling of its own; restyle here, never inline.
#
# Spec §7: analysis figures are R + ggplot2 from one sourced theme file, and the
# runners emit CSV. The canvas rendering inside the toy is not a plot and does
# not come through here.
library(ggplot2)

# The two arms of registered question 001. Named, not positional, so a figure
# cannot silently swap them by reordering a factor.
palette_tge <- c("per-copy" = "#bf616a", "family-level" = "#5e81ac")

theme_tge <- function(base_size = 11) {
  theme_minimal(base_size = base_size) +
    theme(
      panel.grid.minor = element_blank(),
      panel.grid.major = element_line(colour = "grey90", linewidth = 0.3),
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
contrast_ratio <- function(hex_a, hex_b = "#ffffff") {
  lum <- function(h) {
    v <- grDevices::col2rgb(h)[, 1] / 255
    v <- ifelse(v <= 0.03928, v / 12.92, ((v + 0.055) / 1.055)^2.4)
    sum(v * c(0.2126, 0.7152, 0.0722))
  }
  a <- lum(hex_a); b <- lum(hex_b)
  (max(a, b) + 0.05) / (min(a, b) + 0.05)
}
# The floor this project holds non-text graphics to.
WCAG_NONTEXT_FLOOR <- 3
