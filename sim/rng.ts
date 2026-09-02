export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Standard normal, mean 0, variance 1. */
  normal(): number;
}

/**
 * mulberry32 — small, fast, and adequate for a toy. Chosen over Math.random
 * because every run in this project must be reproducible from its seed.
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  let spare: number | null = null;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Marsaglia polar method; caches the second variate.
  const normal = (): number => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    let u = 0;
    let v = 0;
    let sSq = 0;
    do {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      sSq = u * u + v * v;
    } while (sSq >= 1 || sSq === 0);
    const mul = Math.sqrt((-2 * Math.log(sSq)) / sSq);
    spare = v * mul;
    return u * mul;
  };

  return { next, normal };
}
