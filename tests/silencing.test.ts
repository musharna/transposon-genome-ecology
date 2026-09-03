import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import type { Copy, Genome } from "../sim/state.js";
import { activeCopies, isSilenced, silencedCopies } from "../sim/silencing.js";

const copy = (over: Partial<Copy> = {}): Copy => ({
  id: 0,
  site: 100,
  r: 0.05,
  s: 0,
  domesticated: false,
  ...over,
});

describe("isSilenced", () => {
  const p = defaultParams({ theta: 0.1 });

  it("is false when the repertoire is empty", () => {
    const g: Genome = { copies: [], repertoire: [] };
    expect(isSilenced(copy({ s: 0 }), g, p)).toBe(false);
  });

  it("is true within theta of a repertoire entry", () => {
    const g: Genome = { copies: [], repertoire: [0.5] };
    expect(isSilenced(copy({ s: 0.55 }), g, p)).toBe(true);
    expect(isSilenced(copy({ s: 0.45 }), g, p)).toBe(true);
  });

  it("is false beyond theta — this is escape by divergence", () => {
    const g: Genome = { copies: [], repertoire: [0.5] };
    expect(isSilenced(copy({ s: 0.65 }), g, p)).toBe(false);
    expect(isSilenced(copy({ s: -0.5 }), g, p)).toBe(false);
  });

  it("matches against any entry, not only the first", () => {
    const g: Genome = { copies: [], repertoire: [-2, 0.5, 3] };
    expect(isSilenced(copy({ s: 3.05 }), g, p)).toBe(true);
  });

  it("exempts domesticated copies even inside theta", () => {
    const g: Genome = { copies: [], repertoire: [0.5] };
    expect(isSilenced(copy({ s: 0.5, domesticated: true }), g, p)).toBe(false);
  });

  // Not in the brief's verbatim suite: none of the cases above land at exactly
  // |s - entry| === theta, so a <= vs < off-by-one at the boundary passes all
  // of them unchanged (confirmed by mutation during self-review). entry: 0 is
  // deliberate — it makes the subtraction exact (0.1 - 0 === 0.1 in floating
  // point), whereas e.g. 0.6 - 0.5 === 0.09999999999999998 would mask the bug.
  it("is true exactly at theta — the boundary is inclusive", () => {
    const g: Genome = { copies: [], repertoire: [0] };
    expect(isSilenced(copy({ s: 0.1 }), g, p)).toBe(true);
  });
});

describe("activeCopies / silencedCopies", () => {
  const p = defaultParams({ theta: 0.1 });

  it("partition the genome's copies", () => {
    const g: Genome = {
      copies: [
        copy({ id: 1, s: 0.5 }),
        copy({ id: 2, s: 5 }),
        copy({ id: 3, s: 0.52 }),
        copy({ id: 4, s: 0.5, domesticated: true }),
      ],
      repertoire: [0.5],
    };
    expect(silencedCopies(g, p).map((c) => c.id)).toEqual([1, 3]);
    expect(activeCopies(g, p).map((c) => c.id)).toEqual([2]);
  });

  it("treats every copy as active when the repertoire is empty", () => {
    const g: Genome = {
      copies: [copy({ id: 1 }), copy({ id: 2 })],
      repertoire: [],
    };
    expect(activeCopies(g, p)).toHaveLength(2);
    expect(silencedCopies(g, p)).toHaveLength(0);
  });
});
