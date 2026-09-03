// Guard 5 candidate-horizon resolver: same arms as explore-horizon.ts, but reports
// only at the generations named on the command line, so candidate marks off the
// decade grid (g=55, 65) can be compared across seeds. This is what the four
// thresholds in tests/guards/rate-evolves.test.ts were derived from; re-run it
// after any recalibration of sim/ and re-derive them rather than nudging them.
// Run: npx tsx scripts/explore-candidates.ts 300 55,60,65 101,202,303,404,505
import {
  createWorld,
  defaultParams,
  type Params,
  step,
  type World,
} from "../sim/index.js";
import { ARMS, BASE, stats } from "./explore-common.js";

const N = Number(process.argv[2] ?? 300);
const marks = (process.argv[3] ?? "55,60,65").split(",").map(Number);
const seeds = (process.argv[4] ?? "101").split(",").map(Number);
const maxG = Math.max(...marks);

for (const seed of seeds) {
  for (const [name, overrides] of Object.entries(ARMS)) {
    const world: World = createWorld(
      defaultParams({ ...BASE, ...overrides, N, seed } as Partial<Params>),
    );
    const t0 = Date.now();
    for (let g = 1; g <= maxG; g++) {
      step(world);
      if (!marks.includes(g)) continue;
      const s = stats(world);
      console.log(
        `seed=${seed} ${name.padEnd(8)} g=${String(g).padStart(3)} ` +
          `mean=${s.mean.toPrecision(17)} geo=${s.geo.toFixed(4)} copies=${s.n} ` +
          `occ=${(s.occ * 100).toFixed(2)}% exactR0=${s.exact}/${s.n} ` +
          `t=${Date.now() - t0}ms`,
      );
    }
  }
}
