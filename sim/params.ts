export interface Params {
  /** Population size (number of genomes). */
  N: number;
  /** Occupiable sites per genome. */
  S: number;
  /** Fraction of sites that are piRNA cluster sites (a span at the genome start). */
  c: number;
  /** Initial transposition rate of the founding copies. */
  r0: number;
  /** Ceiling on transposition rate. */
  rMax: number;
  /** SD of the multiplicative lognormal mutation applied to r on transposition. */
  sigmaR: number;
  /** SD of the additive mutation applied to s on transposition. */
  sigmaS: number;
  /** Silencing similarity threshold in s-space. */
  theta: number;
  /** Per-copy excision probability per generation. */
  v: number;
  /** Linear copy-number fitness coefficient. */
  a: number;
  /** Quadratic copy-number fitness coefficient (synergistic epistasis). */
  b: number;
  /** Per-silenced-copy cost, paid under resistance. */
  d: number;
  /** Per-active-copy damage-absorption cost, paid under tolerance. */
  dTol: number;
  /** Host strategy dial: 0 = pure resistance, 1 = pure tolerance. */
  t: number;
  /** Fraction of sites that are beneficial (a span at the genome end). */
  beta: number;
  /** Per-generation probability a copy in a beneficial site is domesticated. */
  pDom: number;
  /** Fitness bonus per domesticated copy. */
  wDom: number;
  /** Sexual reproduction with free recombination, versus clonal. */
  sexual: boolean;
  /** Master switch for the piRNA trap. Off reproduces the pre-trap model. */
  silencingOn: boolean;
  seed: number;
}

/**
 * Provisional defaults. These have NOT been calibrated against any published
 * equilibrium, and nothing is scheduled to calibrate them. They are chosen only
 * to keep the model numerically well-behaved.
 *
 * Task 15 deliberately DECLINED to set them from Charlesworth & Charlesworth
 * 1983, and the reason is structural rather than a matter of scheduling: that
 * paper's model is diploid and ours is haploid with a recombination dedup sink
 * it has no counterpart for, so its analytic constant does not transfer. See
 * `sim/phases/select.ts:47-49` and spec §10; the full derivation is in
 * `docs/charlesworth-1983-equilibrium.md`.
 *
 * Moving any value here would also move the golden hash in `tests/step.test.ts`
 * and every guard derivation at once, so this is not a cheap change.
 *
 * NOTE: the toy does NOT run at these values — see `TOY_DEFAULTS` in
 * `web/params.ts`. It lists 17 of the 20 keys here and actually CHANGES 12 of
 * them (`N`, `S`, `c`, `r0`, `rMax`, `sigmaR`, `sigmaS`, `theta`, `v`, `b`,
 * `beta`, `pDom`); the other five — `a`, `d`, `dTol`, `t`, `wDom` — restate the
 * value below rather than change it, so `wDom` in particular is the same 0.01
 * in the toy as it is here.
 */
export function defaultParams(overrides: Partial<Params> = {}): Params {
  return {
    N: 300,
    S: 2000,
    c: 0.01,
    r0: 0.05,
    rMax: 1,
    sigmaR: 0.1,
    sigmaS: 0.02,
    theta: 0.1,
    v: 0.001,
    a: 0.001,
    b: 0.0005,
    d: 0.0005,
    dTol: 0.002,
    t: 0,
    beta: 0.005,
    pDom: 0.001,
    wDom: 0.01,
    sexual: true,
    silencingOn: true,
    seed: 1,
    ...overrides,
  };
}
