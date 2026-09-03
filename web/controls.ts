import {
  createWorld,
  defaultParams,
  type Params,
  type World,
} from "../sim/index.js";

/**
 * The pokes. THE PLAYER PERTURBS THE WORLD, NEVER THE ELEMENT — there is no
 * control here that reaches into a copy's rate or its sequence coordinate,
 * because the whole point of the model is that those are the element's to
 * choose and the host only ever changes the conditions they are chosen under.
 *
 * The split below is load-bearing and is the reason this file has two groups:
 * the sliders and the two toggles mutate a RUNNING world, and only "seed a
 * fresh invasion" and "shrink the population" restart, because those change the
 * founding condition rather than the conditions the population is living under.
 * Restarting for a knockout would destroy the thing you wanted to watch.
 */

/** The four params a slider may reach. All numeric, all read live by `step`. */
type SliderKey = "c" | "t" | "v" | "pDom";

export interface Slider {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  stepSize: number;
}

/** Continuous pokes. These take effect MID-RUN — that is the session shape. */
export const SLIDERS: Slider[] = [
  {
    key: "c",
    label: "piRNA cluster size (fraction of genome)",
    min: 0,
    max: 0.05,
    stepSize: 0.001,
  },
  {
    key: "t",
    label: "resistance ← → tolerance",
    min: 0,
    max: 1,
    stepSize: 0.01,
  },
  { key: "v", label: "excision rate", min: 0, max: 0.05, stepSize: 0.001 },
  {
    key: "pDom",
    label: "domestication probability",
    min: 0,
    max: 0.02,
    stepSize: 0.0005,
  },
];

/**
 * Smallest population "shrink" will go to.
 *
 * NOT the brief's 40. At the toy's `N = 60`, `max(40, floor(N/2))` is 40 on the
 * first press and 40 on every press after it, so the button silently stops
 * doing anything after one click while still looking live — the exact class of
 * defect this project keeps finding. 20 gives two real presses, 60 -> 30 -> 20,
 * and the button DISABLES itself at the floor rather than no-opping.
 *
 * Where the floor comes from. Survival to generation 2000 at `TOY_DEFAULTS`,
 * seeds 1/2/3, everything else unchanged (n = 3 per row, so read these as the
 * regime and not as a rate):
 *
 *     N=60  3/3 alive     N=30  1/3 alive, deaths at gen 941, 1357
 *     N=40  3/3 alive     N=20  3/3 alive
 *                         N=15  0/3 alive, deaths at gen 37, 113, 1125
 *                         N=12  0/3 alive, deaths at gen 13, 30, 1064
 *
 * Extinction at 30 is the poke WORKING — `web/params.ts` states the model's
 * position, that "EXTINCTION IS NOT A BUG TO BE TUNED AWAY". Below about 15 the
 * run is usually over inside a hundred generations, which is not something a
 * visitor can watch, so the floor sits above it.
 */
export const N_FLOOR = 20;

/** Population size the next "shrink" press would produce. */
export function shrinkTarget(n: number): number {
  return Math.max(N_FLOOR, Math.floor(n / 2));
}

/**
 * Decimals needed to print any value this slider can reach.
 *
 * A FIXED PRECISION WOULD MAKE THE LABEL LIE. `pDom` steps by 0.0005, so at two
 * decimals the readout would print "0.02" for 0.0195, 0.02 and 0.0205 alike
 * while the simulation read three different numbers — a printed value that is
 * not the value the model uses, which is the defect this project has now hit
 * four times in the renderers.
 */
export function decimalsFor(stepSize: number): number {
  for (let d = 0; d <= 10; d++) {
    const scaled = stepSize * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return d;
  }
  return 10;
}

/**
 * Whether `value` is a position this slider's thumb can actually occupy.
 *
 * A range input SNAPS an off-grid or out-of-range value to the nearest legal
 * one without telling anybody. The thumb would then sit somewhere the params
 * object never was, and the first drag would jump the model to the snapped
 * value rather than continuing from where the run actually is. Asserted for
 * every slider against `TOY_DEFAULTS` in `tests/controls.test.ts`.
 */
export function onSliderGrid(value: number, s: Slider): boolean {
  if (!(value >= s.min && value <= s.max)) return false;
  const steps = (value - s.min) / s.stepSize;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/** What a slider's caption reads. Sourced from the model, never from the input. */
export function sliderCaption(s: Slider, value: number): string {
  return `${s.label}: ${value.toFixed(decimalsFor(s.stepSize))}`;
}

export function silencingCaption(on: boolean): string {
  return on ? "knock out silencing" : "restore silencing";
}

export function sexCaption(sexual: boolean): string {
  // Labelled with what it MEASURABLY does here, not with what it is called.
  // See the note in `mountControls` for the numbers.
  return sexual
    ? "go asexual — floods the genome"
    : "go sexual — recombination clears it";
}

export function invadeCaption(seed: number): string {
  return `seed a fresh invasion — now on seed ${seed}`;
}

export function shrinkCaption(n: number): string {
  return n <= N_FLOOR
    ? `shrink the population — at the floor, N=${n}`
    : `shrink the population (more drift) — N=${n}`;
}

/**
 * Restart the run, KEEPING THE PARAMS OBJECT'S IDENTITY.
 *
 * This is the whole reason the pokes keep working after a restart, and it is
 * subtler than it looks. `mountControls` closes over the params object it was
 * handed at mount time, so it is not enough for `web/main.ts` to hold a fresh
 * object in a `let` and reassign it: the module binding would move and every
 * slider's listener would go on writing to the object it captured, which the
 * simulation no longer reads. The controls would die silently while the UI
 * carried on moving. `Object.assign` into the SAME object is what makes
 * `world.params === params` true for every world this session ever builds, and
 * `tests/controls.test.ts` pins it by dragging a slider AFTER a restart and
 * checking the next `step` behaves like the new value and not the old one.
 *
 * Overrides land on top of the LIVE params, so a restart changes only the
 * founding condition and carries every mid-run poke forward.
 */
export function rebuildWorld(
  params: Params,
  overrides: Partial<Params>,
): World {
  Object.assign(params, defaultParams({ ...params, ...overrides }));
  return createWorld(params);
}

/**
 * Build the control panel into `host`.
 *
 * Nothing here restarts the run except the two buttons in the second group.
 * Every other control mutates the live params object, which `step` re-reads at
 * the top of every phase, so a poke lands on the very next generation.
 */
export function mountControls(
  host: HTMLElement,
  params: Params,
  onReset: (overrides: Partial<Params>) => void,
): void {
  const doc = host.ownerDocument;

  const title = doc.createElement("div");
  title.className = "panel-title";
  title.textContent = "pokes — the world, not the element";
  host.append(title);

  const live = doc.createElement("div");
  live.className = "poke-group";
  live.dataset["group"] = "live";
  const restarting = doc.createElement("div");
  restarting.className = "poke-group";
  restarting.dataset["group"] = "restart";

  for (const s of SLIDERS) {
    const caption = doc.createElement("label");
    caption.className = "poke-row";
    caption.textContent = sliderCaption(s, params[s.key]);

    const input = doc.createElement("input");
    input.className = "poke-slider";
    input.type = "range";
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.stepSize);
    input.value = String(params[s.key]);
    input.dataset["poke"] = s.key;

    input.addEventListener("input", () => {
      params[s.key] = Number(input.value);
      // Painted from PARAMS, not from `input.value`: the caption's job is to
      // report the number the simulation is reading, so it reads it back.
      caption.textContent = sliderCaption(s, params[s.key]);
    });

    live.append(caption, input);
  }

  /**
   * THE KNOCKOUT IS NOT INERT MID-RUN, THOUGH THE CODE READS AS IF IT WERE.
   *
   * `silencingOn` gates capture in `sim/phases/trap.ts`, while `isSilenced`
   * (`sim/silencing.ts`) consults only `domesticated` and the genome's
   * repertoire, and nothing anywhere ever removes a repertoire entry. From that
   * it follows — wrongly — that flipping the switch off should leave every
   * already-silenced copy silenced and change nothing you can see.
   *
   * What actually happens, measured at `TOY_DEFAULTS`, seed 1, running to
   * generation 1000 and then flipping the flag, against a control arm that runs
   * the same world on without flipping anything:
   *
   *                        gen    total   active   silenced   mean repertoire
   *     silencing ON      1000     1494     1019        471              53.7
   *     +100 knocked out  1100     1519     1460         52              53.2
   *     +300 knocked out  1300     2147     2114         32              53.0
   *     +600 knocked out  1600     2723     2701          0              53.0
   *     +600 CONTROL      1600     1519      979        537              97.2
   *
   * The mechanism is drift in s. A repertoire entry is a FIXED sequence
   * coordinate, and the family keeps walking away from it, so a trap that stops
   * taking on new entries stops matching the population it is aimed at within
   * about a hundred generations. Read the two right-hand columns together: the
   * knocked-out arm's repertoire is frozen at 53 and its silencing decays to
   * nothing, while the control's climbs to 97 and holds 537 copies down. The
   * trap is not a state the host reaches, it is a rate the host has to keep
   * paying.
   */
  const silencing = doc.createElement("button");
  silencing.className = "poke-btn";
  silencing.dataset["poke"] = "silencing";
  const paintSilencing = (): void => {
    silencing.textContent = silencingCaption(params.silencingOn);
  };
  silencing.addEventListener("click", () => {
    params.silencingOn = !params.silencingOn;
    paintSilencing();
  });
  paintSilencing();

  /**
   * GOING ASEXUAL FLOODS THE GENOME. It does not collapse the population and it
   * does not stall the run, but it is not the mild thing the phrase suggests
   * and the button says so on its face.
   *
   * Charlesworth & Charlesworth's containment result assumes free
   * recombination; `sim/phases/reproduce.ts` is the only place that assumption
   * lives, and turning it off removes the mechanism that was holding copy
   * number down. Guard 1 already measured the same thing from the other side
   * (1994 of 2000 sites occupied asexually at its own parameters). At
   * `TOY_DEFAULTS`, seed 1, flipping at generation 300 — the cap is
   * `N * S = 60 * 1000 = 60000` sites:
   *
   *     sexual      gen 300     1170 copies    2.0% of sites
   *     asexual     gen 360    15968 copies   26.6%
   *     asexual     gen 400    59129 copies   98.6%
   *     back to sexual, +20    1490 copies     2.5%
   *     control, still sexual, gen 400   1608 copies   2.7%
   *
   * It is fully reversible and reverses fast, which is what makes it worth
   * shipping rather than removing: it is the clearest statement in the toy of
   * what recombination is actually for. The cost is that while it is flooded a
   * step goes from about 1.8 ms to about 36 ms on the machine this was measured
   * on, so the toy crawls until the visitor flips it back — hence the note in
   * the panel and the wording on the button.
   */
  const sex = doc.createElement("button");
  sex.className = "poke-btn";
  sex.dataset["poke"] = "sexual";
  const paintSex = (): void => {
    sex.textContent = sexCaption(params.sexual);
  };
  sex.addEventListener("click", () => {
    params.sexual = !params.sexual;
    paintSex();
  });
  paintSex();

  const note = doc.createElement("div");
  note.className = "poke-note";
  note.textContent =
    "Asexual fills nearly every site within about a hundred generations and the toy crawls until you go sexual again, which clears it in about twenty.";

  live.append(silencing, sex, note);

  const restartTitle = doc.createElement("div");
  restartTitle.className = "poke-sub";
  restartTitle.textContent = "these restart the run";

  /**
   * Deterministic, not `Math.random()`. Every run in this project has to be
   * reproducible from its seed — `sim/rng.ts` says so as its reason for
   * existing — and a control that reaches for a source of randomness outside
   * the sim's own draws puts a session beyond reproducing. The seed advances by
   * one and the button prints the one currently running, so a visitor who sees
   * something interesting can say which world it was. mulberry32 hashes a
   * counter, so consecutive seeds give unrelated streams.
   */
  const invade = doc.createElement("button");
  invade.className = "poke-btn";
  invade.dataset["poke"] = "invade";
  const paintInvade = (): void => {
    invade.textContent = invadeCaption(params.seed);
  };
  invade.addEventListener("click", () => {
    onReset({ seed: params.seed + 1 });
    paintInvade();
  });
  paintInvade();

  const shrink = doc.createElement("button");
  shrink.className = "poke-btn";
  shrink.dataset["poke"] = "shrink";
  const paintShrink = (): void => {
    shrink.textContent = shrinkCaption(params.N);
    shrink.disabled = params.N <= N_FLOOR;
  };
  shrink.addEventListener("click", () => {
    onReset({ N: shrinkTarget(params.N) });
    paintShrink();
    paintInvade();
  });
  paintShrink();

  restarting.append(restartTitle, invade, shrink);
  host.append(live, restarting);
}
