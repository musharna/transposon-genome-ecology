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
 * equilibrium; Task 15 sets them from Charlesworth & Charlesworth 1983.
 * They are chosen only to keep the model numerically well-behaved in early tasks.
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
