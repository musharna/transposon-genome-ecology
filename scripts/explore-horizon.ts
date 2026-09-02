// Guard 5 horizon sweep: prints generation, mean r, geometric mean r, total copies
// and mean occupancy every 10 generations for each arm, stopping an arm at 55%
// occupancy. Used to locate the region where the Test A and Test C contrasts open
// up. Run: npx tsx scripts/explore-horizon.ts [N] [maxGenerations] [seed,seed,...]
import {
  createWorld,
  defaultParams,
  type Params,
  step,
  type World,
} from "../sim/index.js";
import { ARMS, BASE, stats } from "./explore-common.js";

const N = Number(process.argv[2] ?? 300);
const maxG = Number(process.argv[3] ?? 110);
const seeds = (process.argv[4] ?? "101").split(",").map(Number);

for (const seed of seeds) {
  for (const [name, overrides] of Object.entries(ARMS)) {
    const world: World = createWorld(
      defaultParams({ ...BASE, ...overrides, N, seed } as Partial<Params>),
    );
    const t0 = Date.now();
    for (let g = 1; g <= maxG; g++) {
      step(world);
      if (g % 10 !== 0) continue;
      const s = stats(world);
      console.log(
        `seed=${seed} N=${N} ${name.padEnd(8)} g=${String(g).padStart(3)} ` +
          `mean=${s.mean.toFixed(4)} geo=${s.geo.toFixed(4)} copies=${s.n} ` +
          `occ=${(s.occ * 100).toFixed(2)}% t=${Date.now() - t0}ms`,
      );
      if (s.n === 0) {
        console.log("  -> all copies lost, stopping arm");
        break;
      }
      if (s.occ > 0.55) {
        console.log("  -> occupancy over 55% of S, stopping arm");
        break;
      }
    }
  }
}
