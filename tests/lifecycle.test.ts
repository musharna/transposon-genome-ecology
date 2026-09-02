import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld } from "../sim/state.js";
import { domesticate, lose } from "../sim/phases/lifecycle.js";

describe("domesticate", () => {
  it("can domesticate a copy in a beneficial site", () => {
    const p = defaultParams({ N: 200, S: 1000, beta: 0.01, pDom: 1, seed: 5 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 999, r: 0.1, s: 0, domesticated: false }];
    }
    domesticate(w);
    expect(w.genomes.every((g) => g.copies[0]!.domesticated)).toBe(true);
  });

  it("never domesticates a copy outside a beneficial site", () => {
    const p = defaultParams({ N: 50, S: 1000, beta: 0.01, pDom: 1 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 500, r: 0.1, s: 0, domesticated: false }];
    }
    domesticate(w);
    expect(w.genomes.every((g) => !g.copies[0]!.domesticated)).toBe(true);
  });

  it("never reverts a domesticated copy", () => {
    const p = defaultParams({ N: 50, S: 1000, beta: 0.01, pDom: 0 });
    const w = createWorld(p);
    for (const g of w.genomes) {
      g.copies = [{ id: 0, site: 999, r: 0.1, s: 0, domesticated: true }];
    }
    domesticate(w);
    expect(w.genomes.every((g) => g.copies[0]!.domesticated)).toBe(true);
  });

  // Gap: the test above cannot distinguish "skipped, already true" from
  // "re-drawn against pDom, still ends up true" since both leave the final
  // state unchanged. Pin the draw count directly instead: two worlds built
  // from the same seed/params reach an identical rng stream position after
  // createWorld (same N/S/beta consume the same draws). domesticate() on an
  // already-domesticated copy must consume zero draws, so the next value
  // pulled from each world's rng must still agree.
  it("does not consume an rng draw for an already-domesticated copy", () => {
    const p = defaultParams({ N: 1, S: 1000, beta: 0.01, pDom: 0.5, seed: 42 });
    const wA = createWorld(p);
    const wB = createWorld(p);
    wA.genomes[0]!.copies = [
      { id: 0, site: 999, r: 0.1, s: 0, domesticated: true },
    ];
    wB.genomes[0]!.copies = [
      { id: 0, site: 999, r: 0.1, s: 0, domesticated: true },
    ];
    domesticate(wA);
    expect(wA.rng.next()).toBe(wB.rng.next());
  });
});

describe("lose", () => {
  it("removes nothing when v is zero", () => {
    const w = createWorld(defaultParams({ N: 50, v: 0 }));
    lose(w);
    expect(w.genomes.every((g) => g.copies.length === 1)).toBe(true);
  });

  it("removes everything undomesticated when v is one", () => {
    const w = createWorld(defaultParams({ N: 50, v: 1 }));
    lose(w);
    expect(w.genomes.every((g) => g.copies.length === 0)).toBe(true);
  });

  it("never excises a domesticated copy", () => {
    const w = createWorld(defaultParams({ N: 50, v: 1 }));
    for (const g of w.genomes) g.copies[0]!.domesticated = true;
    lose(w);
    expect(w.genomes.every((g) => g.copies.length === 1)).toBe(true);
  });

  it("removes roughly the expected fraction", () => {
    const w = createWorld(defaultParams({ N: 1, S: 5000, v: 0.2, seed: 11 }));
    w.genomes[0]!.copies = Array.from({ length: 2000 }, (_, i) => ({
      id: i,
      site: i,
      r: 0.1,
      s: 0,
      domesticated: false,
    }));
    lose(w);
    const remaining = w.genomes[0]!.copies.length;
    expect(remaining).toBeGreaterThan(1500);
    expect(remaining).toBeLessThan(1700);
  });

  // Gap: the fraction-window test above tolerates the systematic under-removal
  // caused by an index-based removal that skips the element shifted into a
  // just-vacated slot (a classic forward-splice-without-decrement bug) — the
  // bias is small enough to still land inside [1500, 1700]. Pin the draw count
  // directly instead: lose() must call rng.next() exactly once per
  // non-domesticated copy (domesticated copies short-circuit before the draw),
  // regardless of which copies survive, and must never skip testing one. Two
  // worlds from the same seed/params share an rng stream after createWorld; if
  // lose() on A consumes exactly N draws, manually draining N draws from B's
  // rng lands both at the same position, so their next draw must agree.
  it("consumes exactly one rng draw per non-domesticated copy (no skipped elements)", () => {
    const p = defaultParams({ N: 1, S: 5000, v: 0.3, seed: 7 });
    const wA = createWorld(p);
    const wB = createWorld(p);
    const copies = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      site: i,
      r: 0.1,
      s: 0,
      domesticated: i % 3 === 0,
    }));
    wA.genomes[0]!.copies = copies.map((c) => ({ ...c }));
    const nonDomesticatedCount = copies.filter((c) => !c.domesticated).length;
    lose(wA);
    for (let i = 0; i < nonDomesticatedCount; i++) wB.rng.next();
    expect(wA.rng.next()).toBe(wB.rng.next());
  });

  // Gap: no existing test checks that copies stays sorted by site after
  // removal (the documented invariant in sim/state.ts). A removal technique
  // that reorders survivors (e.g. swap-with-last-and-pop, or an incidental
  // re-sort) would pass every other test in this file since they only check
  // counts. Sites are constructed in strictly increasing order, so any
  // survivor subsequence of a correctly order-preserving removal is also
  // strictly increasing; a reordering removal breaks that.
  it("keeps surviving copies sorted by site", () => {
    const p = defaultParams({ N: 1, S: 5000, v: 1, seed: 3 });
    const w = createWorld(p);
    w.genomes[0]!.copies = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      site: i,
      r: 0.1,
      s: 0,
      domesticated: i % 4 === 0,
    }));
    lose(w);
    const sites = w.genomes[0]!.copies.map((c) => c.site);
    const sorted = [...sites].sort((a, b) => a - b);
    expect(sites).toEqual(sorted);
  });
});
