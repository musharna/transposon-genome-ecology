/**
 * The tally bar's length, as a pure function so it can be asserted.
 *
 * NORMALISED TO TOTAL, NOT TO THE LARGEST COUNT. A bar's length has to mean
 * what the number printed beside it means, and it did not: lengths were
 * max-normalised while the labels were percent-of-total, so `active` rendered
 * the full track in every measured frame while labelled 83.1% / 71.1% / 57.4%,
 * and `silenced` rendered 18.7% / 40.0% / 70.7% of track against labels of
 * 15.5% / 28.5% / 40.6%. Two things follow, and the second is worse than the
 * first: the graphic disagreed with its own caption by up to 30 points, and the
 * largest bar was pinned to full width by construction, so the collapse of
 * active copies from 83% to 57% -- the story of the session -- could not appear
 * in the one graphic built to show it.
 */
export interface BarLength {
  /** Drawn length in px. */
  px: number;
  /** True when `px` is the floor rather than a measurement, so the caller can
   *  draw it outlined instead of filled and the floor reads as a floor. */
  floored: boolean;
}

/** Shortest bar drawn for a non-zero count. */
export const BAR_FLOOR_PX = 3;

export function barLength(
  count: number,
  total: number,
  trackPx: number,
  floorPx: number = BAR_FLOOR_PX,
): BarLength {
  if (count <= 0 || total <= 0) return { px: 0, floored: false };
  const exact = (count / total) * trackPx;
  return exact < floorPx
    ? { px: floorPx, floored: true }
    : { px: exact, floored: false };
}

/** The share a bar claims to show, as the caller prints it beside the bar. */
export function sharePercent(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

/**
 * The readout's counts as one sentence, for the `aria-live` mirror in
 * web/index.html. SAME NUMBERS, SAME SOURCE: it reads the snapshot the readout
 * rows are printed from and computes nothing of its own, so the spoken and the
 * printed population cannot disagree.
 */
export function liveSentence(snap: {
  generation: number;
  totalCopies: number;
  activeCopies: number;
  silencedCopies: number;
  domesticatedCopies: number;
}): string {
  return (
    `generation ${snap.generation}: ${snap.totalCopies} copies, ` +
    `${snap.activeCopies} active, ${snap.silencedCopies} silenced, ` +
    `${snap.domesticatedCopies} domesticated`
  );
}
