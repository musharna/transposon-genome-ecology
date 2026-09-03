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
