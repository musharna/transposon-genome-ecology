// Guard 5 crush arm: host selection strong enough to drive the element extinct
// (a = 0.1, b = 0.05). Prints the FULL per-generation trace — copies, mean r, genome
// count — and then a summary block naming every qualitative fact the Test C comment
// in tests/guards/rate-evolves.test.ts asserts about this arm: the generations where
// copy number RISES (so "monotone" is checkable), the generations where mean r sits
// below r0 and how deep, the first crossing back above r0, the last survivor, and the
// generation from which observe() reports meanRate 0 on an extinct population.
// Read the summary, not a sampled subset of the trace.
// Run: npx tsx scripts/explore-crush.ts [seed] [generations]
import { createWorld, defaultParams, observe, step } from "../sim/index.js";
import { BASE } from "./explore-common.js";

const seed = Number(process.argv[2] ?? 101);
const generations = Number(process.argv[3] ?? 60);

const world = createWorld(defaultParams({ ...BASE, a: 0.1, b: 0.05, seed }));

interface Row {
  g: number;
  copies: number;
  meanRate: number;
}
const rows: Row[] = [];

for (let g = 1; g <= generations; g++) {
  step(world);
  const s = observe(world);
  rows.push({ g, copies: s.totalCopies, meanRate: s.meanRate });
  console.log(
    `g=${String(g).padStart(3)} copies=${String(s.totalCopies).padStart(5)} ` +
      `meanRate=${s.meanRate} genomes=${world.genomes.length}`,
  );
}

const alive = rows.filter((r) => r.copies > 0);
console.log(`\n===== summary (seed ${seed}, a=0.1, b=0.05, r0=${BASE.r0}) =====`);

if (alive.length === 0) {
  console.log("no generation had a live copy");
} else {
  const rises = rows
    .slice(1)
    .map((r, i) => ({ prev: rows[i]!, cur: r }))
    .filter((x) => x.cur.copies > x.prev.copies)
    .map((x) => `g=${x.prev.g}->${x.cur.g} ${x.prev.copies}->${x.cur.copies}`);
  console.log(
    `copy-number increases (monotone decline iff this is empty): ` +
      `${rises.length === 0 ? "none" : rises.join(", ")}`,
  );

  const below = alive.filter((r) => r.meanRate < BASE.r0);
  console.log(
    `generations with a live copy and meanRate < r0: ` +
      `${below.length === 0 ? "none" : below.map((r) => r.g).join(",")}`,
  );
  if (below.length > 0) {
    const deepest = below.reduce((a, r) => (r.meanRate < a.meanRate ? r : a));
    console.log(
      `  deepest dip: g=${deepest.g} meanRate=${deepest.meanRate} ` +
        `copies=${deepest.copies} ` +
        `(${((1 - deepest.meanRate / BASE.r0) * 100).toFixed(3)}% below r0)`,
    );
  }

  const firstAbove = alive.find((r) => r.meanRate > BASE.r0);
  console.log(
    firstAbove === undefined
      ? "first generation above r0 while alive: never"
      : `first generation above r0 while alive: g=${firstAbove.g} ` +
          `meanRate=${firstAbove.meanRate} copies=${firstAbove.copies}`,
  );

  const last = alive[alive.length - 1]!;
  console.log(
    `last generation with a live copy: g=${last.g} copies=${last.copies} ` +
      `meanRate=${last.meanRate} ` +
      `(${last.meanRate > BASE.r0 ? "ABOVE" : "BELOW"} r0)`,
  );

  const extinct = rows.find((r) => r.g > last.g && r.copies === 0);
  console.log(
    extinct === undefined
      ? `still alive at the horizon (g=${generations})`
      : `extinct from g=${extinct.g}: observe() reports meanRate 0 because ` +
          `totalCopies is 0, population still ${world.genomes.length} genomes`,
  );
}
