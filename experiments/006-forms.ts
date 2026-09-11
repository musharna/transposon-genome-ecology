/**
 * The analysis half of registered question 006 — "is the exponent one?"
 * (`docs/pre-registrations/2026-09-11-is-the-exponent-one.md`).
 *
 * Split out of the runner deliberately. The registration forbids committing the
 * runner until every row of its mutation table has been SEEN TO FAIL, and
 * running the experiment to find that out costs about sixteen hours. Every
 * mutation the table names lands in one of these functions, and every one of
 * them is pure, so `tests/006-forms.test.ts` exercises the lot against
 * synthetic data with known answers in milliseconds.
 *
 * Nothing here touches `sim/`. These are fits over `(phi, t_sat)` cell means.
 */

export interface Point {
  /** Trap infidelity. */
  phi: number;
  /** Cell-mean generations to saturation. */
  t: number;
}

export type Fit =
  | { form: "power-law"; a: number; C: number }
  | { form: "mechanism"; K: number }
  | { form: "quadratic"; q0: number; q1: number; q2: number };

export type FormName = Fit["form"];

/** Parameters each candidate spends. Used only to break exact ties. */
const PARAMETERS: Record<FormName, number> = {
  mechanism: 1,
  "power-law": 2,
  quadratic: 3,
};

const mean = (xs: number[]): number =>
  xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * CANDIDATE A — the null. `log t = c + b*log phi`, both free. This is 005's own
 * fit, and the form this question exists to kill.
 */
export function fitPowerLaw(pts: Point[]): Extract<Fit, { form: "power-law" }> {
  const X = pts.map((p) => Math.log(p.phi));
  const Y = pts.map((p) => Math.log(p.t));
  const mx = mean(X);
  const my = mean(Y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < X.length; i++) {
    num += (X[i]! - mx) * (Y[i]! - my);
    den += (X[i]! - mx) ** 2;
  }
  const b = num / den;
  return { form: "power-law", a: -b, C: Math.exp(my - b * mx) };
}

/**
 * CANDIDATE B — the mechanism. `t = K / phi`: the exponent is FIXED at one and
 * is not fitted. Only `K` is free.
 *
 * The fixed exponent is the whole point and the reason this candidate is worth
 * registering: it is derived from the model's structure rather than read off
 * the data. See the registration's "Where `a = 1` comes from" — the trap is
 * escaped by the MAXIMUM over a population that is itself growing, so the
 * frontier advances linearly in time rather than diffusively, and saturation at
 * a reach of `theta/phi` then lands at `t ∝ 1/phi`.
 */
export function fitMechanism(
  pts: Point[],
): Extract<Fit, { form: "mechanism" }> {
  // log t = log K - log phi, so log K is the mean of (log t + log phi).
  return {
    form: "mechanism",
    K: Math.exp(mean(pts.map((p) => Math.log(p.t) + Math.log(p.phi)))),
  };
}

/**
 * CANDIDATE C — the minimal "keeps drifting" alternative.
 * `log t = q0 + q1*log phi + q2*(log phi)^2`. A positive `q2` is exactly the
 * convex residual signature 005 found in every power-law fit.
 */
export function fitQuadratic(
  pts: Point[],
): Extract<Fit, { form: "quadratic" }> {
  const X = pts.map((p) => Math.log(p.phi));
  const Y = pts.map((p) => Math.log(p.t));
  // Normal equations for a quadratic, solved by Gauss-Jordan with partial
  // pivoting. Three unknowns; the explicit solve keeps this dependency-free.
  const M: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const row: number[] = [];
    for (let j = 0; j < 3; j++)
      row.push(X.reduce((s, x) => s + x ** (i + j), 0));
    row.push(X.reduce((s, x, k) => s + x ** i * Y[k]!, 0));
    M.push(row);
  }
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++)
      if (Math.abs(M[r]![i]!) > Math.abs(M[piv]![i]!)) piv = r;
    [M[i], M[piv]] = [M[piv]!, M[i]!];
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = M[r]![i]! / M[i]![i]!;
      for (let k = i; k < 4; k++) M[r]![k]! -= f * M[i]![k]!;
    }
  }
  return {
    form: "quadratic",
    q0: M[0]![3]! / M[0]![0]!,
    q1: M[1]![3]! / M[1]![1]!,
    q2: M[2]![3]! / M[2]![2]!,
  };
}

export function predict(fit: Fit, phi: number): number {
  switch (fit.form) {
    case "power-law":
      return fit.C * phi ** -fit.a;
    case "mechanism":
      return fit.K / phi;
    case "quadratic": {
      const L = Math.log(phi);
      return Math.exp(fit.q0 + fit.q1 * L + fit.q2 * L * L);
    }
  }
}

/**
 * The local exponent between two cells: `-dlog(t) / dlog(phi)`.
 *
 * SIGN CONVENTION, PINNED. `t_sat` FALLS as `phi` RISES, so this is POSITIVE,
 * and the registration's PRIMARY is that it lands in [0.95, 1.05]. A flipped
 * sign reads about -1 and fails the primary for a reason that has nothing to do
 * with the model — mutation table row 4. It is also order-independent: both the
 * numerator and the denominator change sign together.
 */
export function localExponent(a: Point, b: Point): number {
  return -(Math.log(b.t) - Math.log(a.t)) / (Math.log(b.phi) - Math.log(a.phi));
}

const FITTERS: Record<FormName, (pts: Point[]) => Fit> = {
  "power-law": fitPowerLaw,
  mechanism: fitMechanism,
  quadratic: fitQuadratic,
};

export interface Selection {
  winner: FormName;
  /** Leave-one-out mean absolute relative error, per candidate. */
  scores: Record<FormName, number>;
}

/**
 * Choose the form that will size Phase 2's horizon, by leave-one-out mean
 * absolute relative error.
 *
 * NOT by R², and the registration says so in terms: 005's finding is that R²
 * between 0.993 and 0.9986 failed to separate a misspecified form from a right
 * one. An in-sample criterion would hand this to the most flexible candidate
 * every time, which is precisely the failure mode.
 *
 * TIES. On exactly-degenerate data more than one candidate can score zero — a
 * quadratic fitted to exact power-law data recovers `q2 = 0` and reproduces it.
 * A tie within `TIE` is broken toward the candidate spending FEWER parameters.
 * Recorded as an amendment on the registration, made before any data existed.
 */
const TIE = 1e-9;

export function selectForm(pts: Point[]): Selection {
  const scores = {} as Record<FormName, number>;
  for (const name of Object.keys(FITTERS) as FormName[]) {
    const errs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const rest = pts.filter((_, j) => j !== i);
      const held = pts[i]!;
      errs.push(
        Math.abs(predict(FITTERS[name](rest), held.phi) - held.t) / held.t,
      );
    }
    scores[name] = mean(errs);
  }
  const names = Object.keys(scores) as FormName[];
  let winner = names[0]!;
  for (const n of names) {
    const better = scores[n] < scores[winner] - TIE;
    const tiedButCheaper =
      Math.abs(scores[n] - scores[winner]) <= TIE &&
      PARAMETERS[n] < PARAMETERS[winner];
    if (better || tiedButCheaper) winner = n;
  }
  return { winner, scores };
}

/** Registered headroom. 005 used 1.75x and realised 1.31x; see HORIZON_RULE. */
export const HEADROOM = 2.5;

/**
 * The horizon for a Phase 2 cell.
 *
 * `HEADROOM` times the LARGEST prediction across ALL THREE candidates — not the
 * selected one's, and not the favoured one's. This is the direct repair to the
 * defect 005 recorded against itself: it sized its horizon at 1.75x its own
 * candidate's prediction, that prediction came in 43% low, the realised headroom
 * was 1.31x, and the worst seed consumed 82% of the horizon. A horizon taken
 * from the model under test inherits that model's error. Mutation table row 2.
 */
export function horizonFor(phi: number, inRange: Point[]): number {
  const all = (Object.keys(FITTERS) as FormName[]).map((n) =>
    predict(FITTERS[n](inRange), phi),
  );
  return HEADROOM * Math.max(...all);
}
