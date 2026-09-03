import { describe, expect, it } from "vitest";
import { defaultParams } from "../sim/params.js";
import { createWorld, type Copy, type Genome } from "../sim/state.js";
import { makeRng } from "../sim/rng.js";
import { step } from "../sim/step.js";
import {
  activeCopies,
  isSilenced,
  repertoireInsertionIndex,
  silencedCopies,
} from "../sim/silencing.js";
import { TOY_DEFAULTS } from "../web/params.js";

const copy = (over: Partial<Copy> = {}): Copy => ({
  id: 0,
  site: 100,
  r: 0.05,
  s: 0,
  domesticated: false,
  ...over,
});

/**
 * `isSilenced` as it was written before 2026-09-03: a full linear scan of the
 * repertoire, order-independent by construction.
 *
 * THIS IS THE REFERENCE, and it is a copy rather than an import on purpose.
 * `isSilenced` now tests two neighbours of a binary-search position, so the
 * only way to check it against something that is not itself a binary search is
 * to keep the scan. `tests/render-field.test.ts` (a2) used to serve this
 * purpose — it held `web/render/field.ts`'s accelerator against the sim's
 * scan — and after this change both sides of that comparison are binary
 * searches, so it can no longer catch an error the two share. The scan lives
 * here instead, at the level the predicate lives at.
 */
function silencedByScan(c: Copy, genome: Genome, theta: number): boolean {
  if (c.domesticated) return false;
  for (const entry of genome.repertoire) {
    if (Math.abs(c.s - entry) <= theta) return true;
  }
  return false;
}

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

  /* ------------------------------------------------------------------------ *
   * The two neighbours of the binary-search position are TWO BRANCHES, and a
   * predicate that checked only one of them would still pass every test above:
   * `[-2, 0.5, 3]` with `s = 3.05` matches the entry BELOW the insertion point
   * (there is nothing above it), and `[0.5]` with `s = 0.45` matches the entry
   * AT it. Neither case has a live neighbour on the other side to be wrong
   * about. These two do — same repertoire, one match on each side, the other
   * neighbour present and out of range — so deleting either branch fails
   * exactly one of them.
   * ------------------------------------------------------------------------ */

  it("matches the entry BELOW the insertion point when the entry at it is out of range", () => {
    const g: Genome = { copies: [], repertoire: [0, 5] };
    // s = 0.05 inserts at index 1 (5 is the first entry >= it). The entry AT
    // the insertion point is 4.95 away; the one below it is 0.05 away.
    expect(repertoireInsertionIndex(g.repertoire, 0.05)).toBe(1);
    expect(isSilenced(copy({ s: 0.05 }), g, p)).toBe(true);
  });

  it("matches the entry AT the insertion point when the entry below it is out of range", () => {
    const g: Genome = { copies: [], repertoire: [0, 5] };
    // s = 4.95 also inserts at index 1, but now it is the entry AT the
    // insertion point that is 0.05 away and the one below it that is 4.95.
    expect(repertoireInsertionIndex(g.repertoire, 4.95)).toBe(1);
    expect(isSilenced(copy({ s: 4.95 }), g, p)).toBe(true);
  });
});

/* ========================================================================== *
 * repertoireInsertionIndex
 *
 * The one primitive both the sorted invariant and the accelerated predicate go
 * through. Asserted on literals rather than through `isSilenced`'s boolean,
 * because a boolean cannot distinguish "found the right position" from "found
 * a position whose neighbour happened to match too".
 * ========================================================================== */

describe("repertoireInsertionIndex", () => {
  it("returns 0 for an empty repertoire — there is nowhere else to insert", () => {
    expect(repertoireInsertionIndex([], 1.5)).toBe(0);
  });

  it("returns length when every entry is below s, and 0 when every entry is above", () => {
    expect(repertoireInsertionIndex([-2, 0.5, 3], 4)).toBe(3);
    expect(repertoireInsertionIndex([-2, 0.5, 3], -9)).toBe(0);
  });

  it("returns the index of the first entry >= s", () => {
    expect(repertoireInsertionIndex([-2, 0.5, 3], 0.4)).toBe(1);
    expect(repertoireInsertionIndex([-2, 0.5, 3], 0.6)).toBe(2);
  });

  it("returns the FIRST of a run of equals, so an insert never splits the run", () => {
    // `trap` skips a copy already within theta of an entry and |s - s| = 0 is
    // within any theta >= 0, so an exact duplicate cannot reach the insert.
    // The primitive handles them anyway, and this pins WHICH end.
    expect(repertoireInsertionIndex([1, 2, 2, 2, 3], 2)).toBe(1);
    expect(repertoireInsertionIndex([2, 2, 2], 2)).toBe(0);
  });

  it("returns a position that keeps the array ascending, for every position in it", () => {
    const sorted = [-2, 0.5, 3, 7];
    for (const s of [-9, -2, -1, 0.5, 1, 3, 5, 7, 9]) {
      const at = repertoireInsertionIndex(sorted, s);
      const inserted = sorted.slice();
      inserted.splice(at, 0, s);
      expect(
        inserted.every((x, i) => i === 0 || x >= inserted[i - 1]!),
        `inserting ${s} at ${at} gave ${JSON.stringify(inserted)}`,
      ).toBe(true);
    }
  });
});

/* ========================================================================== *
 * The accelerated predicate against the scan it replaced.
 * ========================================================================== */

describe("isSilenced agrees with a full scan of the repertoire", () => {
  it("on 20 000 generated sorted repertoires, including empties, duplicates and exact-theta ties", () => {
    // The lattice is 1/32 and theta is 2/32, both exact in IEEE-754, so a
    // difference of two lattice steps is EXACTLY theta rather than 2e-17 off
    // it. On a decimal lattice `Math.abs(0.06 - 0.02) === 0.04` is false and
    // the boundary case this test claims to cover would never occur.
    const lattice = 1 / 32;
    const theta = 2 * lattice;
    const params = defaultParams({ theta });
    const rng = makeRng(20260903);
    let trueSeen = 0;
    let falseSeen = 0;
    let tiesSeen = 0;
    let dupsSeen = 0;
    let emptiesSeen = 0;

    const onLattice = (u: number): number =>
      (Math.floor(u * 129) - 64) * lattice;

    for (let trial = 0; trial < 20_000; trial++) {
      const n = Math.floor(rng.next() * 41);
      const rep: number[] = [];
      for (let i = 0; i < n; i++) rep.push(onLattice(rng.next()));
      rep.sort((a, b) => a - b);
      if (n === 0) emptiesSeen++;
      if (rep.some((x, i) => i > 0 && x === rep[i - 1]!)) dupsSeen++;

      const s = onLattice(rng.next());
      const g: Genome = { copies: [], repertoire: rep };
      const c = copy({ s });
      if (rep.some((e) => Math.abs(s - e) === theta)) tiesSeen++;

      const viaScan = silencedByScan(c, g, theta);
      const viaSearch = isSilenced(c, g, params);
      expect(
        viaSearch,
        `s=${s} theta=${theta} rep=${JSON.stringify(rep)}`,
      ).toBe(viaScan);
      if (viaScan) trueSeen++;
      else falseSeen++;
    }

    // POSITIVE CONTROLS ON THE FIXTURE. An equality that only ever compared
    // `false` to `false`, or never produced a duplicate, a tie or an empty
    // repertoire, would pass while testing none of the cases it names.
    expect(trueSeen).toBeGreaterThan(1000);
    expect(falseSeen).toBeGreaterThan(1000);
    expect(tiesSeen).toBeGreaterThan(100);
    expect(dupsSeen).toBeGreaterThan(100);
    expect(emptiesSeen).toBeGreaterThan(100);
  });

  it("on every copy of every genome across real generations at the toy's own parameters", () => {
    const p = defaultParams(TOY_DEFAULTS);
    const world = createWorld(p);
    let generation = 0;
    let checked = 0;
    let silencedSeen = 0;
    let activeSeen = 0;
    let longestRepertoire = 0;

    // Spans an empty repertoire through ~150 entries per genome, which is the
    // range where a scan and a search could plausibly disagree at all.
    for (const mark of [0, 100, 800, 2500]) {
      while (generation < mark) {
        step(world);
        generation++;
      }
      for (const genome of world.genomes) {
        longestRepertoire = Math.max(
          longestRepertoire,
          genome.repertoire.length,
        );
        for (const c of genome.copies) {
          const viaScan = silencedByScan(c, genome, p.theta);
          const viaSearch = isSilenced(c, genome, p);
          expect(viaSearch, `copy ${c.id} at gen ${mark}`).toBe(viaScan);
          if (c.domesticated) continue;
          if (viaScan) silencedSeen++;
          else activeSeen++;
          checked++;
        }
      }
    }

    // POSITIVE CONTROLS. Both answers must occur, and the repertoire must
    // actually get long enough for a binary search to differ from a scan by
    // more than one comparison.
    expect(checked).toBeGreaterThan(3000);
    expect(silencedSeen).toBeGreaterThan(100);
    expect(activeSeen).toBeGreaterThan(100);
    expect(longestRepertoire).toBeGreaterThan(100);
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
