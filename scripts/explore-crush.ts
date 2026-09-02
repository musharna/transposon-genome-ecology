// Guard 5 crush arm: the only host-selection strength at which mean rate appears to
// fall below r0 (a = 0.1, b = 0.05). Prints copies, mean r and genome count every
// generation so the collapse can be read directly — the point being that the mean
// only "falls" once totalCopies hits 0 and observe() reports 0, i.e. extinction
// reported as a rate. Cited by the Test C comment in tests/guards/rate-evolves.test.ts.
// Run: npx tsx scripts/explore-crush.ts [seed] [generations]
import { createWorld, defaultParams, observe, step } from "../sim/index.js";
import { BASE } from "./explore-common.js";

const seed = Number(process.argv[2] ?? 101);
const generations = Number(process.argv[3] ?? 60);

const world = createWorld(
  defaultParams({ ...BASE, a: 0.1, b: 0.05, seed }),
);
let lastAlive = "(none)";
for (let g = 1; g <= generations; g++) {
  step(world);
  const s = observe(world);
  console.log(
    `g=${String(g).padStart(3)} copies=${String(s.totalCopies).padStart(5)} ` +
      `meanRate=${s.meanRate} genomes=${world.genomes.length}`,
  );
  if (s.totalCopies > 0) {
    lastAlive = `g=${g} copies=${s.totalCopies} meanRate=${s.meanRate}`;
  }
}
console.log(`last generation with any copy alive: ${lastAlive}`);
