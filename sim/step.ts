import { domesticate, lose } from "./phases/lifecycle.js";
import { reproduce } from "./phases/reproduce.js";
import { transpose } from "./phases/transpose.js";
import { trap } from "./phases/trap.js";
import type { World } from "./state.js";

/**
 * One generation, in the order specified by the design.
 *
 * Phases 1, 4, 5 and 6 alone are the Charlesworth 1983 model; phase 2 adds
 * Kofler's trap and phase 3 adds domestication. Guard 1 runs with silencingOn
 * false and pDom zero, which disables exactly phases 2 and 3.
 */
export function step(world: World): void {
  transpose(world); // 1
  trap(world); // 2
  domesticate(world); // 3
  lose(world); // 4
  reproduce(world); // 5 selection, 6 reproduction
  world.generation++;
}

export function run(world: World, generations: number): void {
  for (let i = 0; i < generations; i++) step(world);
}
