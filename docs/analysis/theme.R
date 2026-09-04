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
