import { type Params } from "../sim/index.js";

/**
 * The toy's parameters: a `web/`-level layer over `defaultParams`, which is NOT
 * touched. Every guard in the suite is calibrated against those values and
 * `tests/step.test.ts` pins the RNG draw stream to golden hash `9c15fd28`.
 *
 * This lives in its own module rather than in `web/main.ts` because
 * `tests/render-field.test.ts` steps a world at these values, and `main.ts`
 * reaches for `document` at module scope — importing it from a test would need
 * a DOM. There is still exactly one definition and every consumer reaches it.
 *
 * `defaultParams()` itself is unwatchable as a toy. Measured here before these
 * were derived, at its own values, seed 1, one observation per generation:
 *
 *     gen  30   954 copies   902 active    52 silenced
 *     gen  60  1080 copies   318 active   762 silenced
 *     gen 120   273 copies     0 active   273 silenced   <- nothing can transpose
 *     gen 300     0 copies                                <- extinct
 *
 * At `speed = 3` and 60 fps that is about 1.7 seconds: a red bloom, a grey
 * field, an empty screen. Its `theta` is 5x its `sigmaS`, so one captured entry
 * silences a whole family at once and no daughter can diverge out of the window.
 *
 * WHY THESE VALUES. Two requirements pull against each other, and these are
 * where they were measured to separate.
 *
 *  - SURVIVAL is set by the escape ratio `sigmaS / theta`: a daughter's
 *    sequence coordinate must outrun its own family's trap. Measured over seeds
 *    1/2/3/5/7/11/13, everything else at the values below, counting worlds
 *    still alive at generation 6000:
 *
 *        ratio 1.50 (sigmaS 0.06)   4 of 7   deaths at gen 2598, 4133, 4506
 *        ratio 1.75 (sigmaS 0.07)   6 of 7   death  at gen 714
 *        ratio 2.00 (sigmaS 0.08)   7 of 7
 *        ratio 2.50 (sigmaS 0.10)   7 of 7
 *
 *    `sigmaS = 0.08` is that 2.0. `tests/guards/bloat-arm.ts` reaches the same
 *    regime from the other side and documents it: at 2x, "escape by divergence
 *    is routine", and its silenced arm settles instead of dying.
 *
 *  - SPEED is set by repertoire growth, which is the CAPTURE rate: `c`, and the
 *    transposition rate that feeds copies into cluster sites. `rMax = 0.2` is
 *    the load-bearing one. Left at 1, `r` evolves upward without a ceiling
 *    (0.87 on the arm this replaced) and the element explores sequence space
 *    fast enough that the repertoire runs away. Measured at `c = 0.005`, seeds
 *    1/2/3/5/7, horizon 2500: with `rMax = 1`, 0 of 5 survive — three pass 6000
 *    copies by generation 536 and two die by generation 965; with `rMax = 0.2`,
 *    5 of 5 are alive.
 *
 * EXTINCTION IS NOT A BUG TO BE TUNED AWAY. `tests/guards/three-phases-arm.ts`
 * states it canonically: "Full inactivation implies the family eventually DIES
 * in this model", because `lose` keeps excising silenced copies that silencing
 * prevents from replacing themselves. No parameter set is extinction-proof.
 * These are chosen so full inactivation is not REACHED inside a session: 7 of 7
 * seeds alive at generation 6000, and seeds 1 and 2 still alive at 11000 with
 * active, silenced and domesticated copies all present throughout.
 */
export const TOY_DEFAULTS: Partial<Params> = {
  N: 60,
  S: 1000,
  c: 0.005,
  r0: 0.1,
  rMax: 0.2,
  sigmaR: 0.05,
  sigmaS: 0.08,
  theta: 0.04,
  v: 0.01,
  a: 0.001,
  b: 0.001,
  d: 0.0005,
  dTol: 0.002,
  t: 0,
  beta: 0.02,
  pDom: 0.02,
  wDom: 0.01,
};
