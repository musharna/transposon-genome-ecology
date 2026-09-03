/**
 * Guards for the pokes.
 *
 * THE ASSERTION HAS TO REACH `world.params` AND THEN THE NEXT `step`. "The
 * handler fired" is not evidence a poke works — the defect this whole file
 * exists to catch is a control that mutates an object the simulation has
 * stopped reading, which moves the UI, fires every listener, and changes
 * nothing. So every test here drives the REAL `mountControls` against a REAL
 * `World` through a DOM stub, and then reads the answer out of the model:
 * `observe`, `stateHash`, or the genomes themselves.
 *
 * The stub snaps and clamps a range input's value the way a browser does, and
 * it does so with its own arithmetic rather than the module's `decimalsFor`, so
 * a defect in that function cannot calibrate the instrument that checks it.
 */
import { describe, expect, it } from "vitest";
import {
  createWorld,
  defaultParams,
  observe,
  stateHash,
  step,
  type Params,
  type World,
} from "../sim/index.js";
import { TOY_DEFAULTS } from "../web/params.js";
import {
  N_FLOOR,
  SLIDERS,
  decimalsFor,
  invadeCaption,
  mountControls,
  onSliderGrid,
  rebuildWorld,
  shrinkCaption,
  shrinkTarget,
  sliderCaption,
} from "../web/controls.js";

// --------------------------------------------------------------------------
// DOM stub
// --------------------------------------------------------------------------

class StubEl {
  readonly tagName: string;
  readonly ownerDocument: unknown;
  className = "";
  textContent = "";
  disabled = false;
  type = "";
  min = "";
  max = "";
  step = "";
  value = "";
  readonly dataset: Record<string, string> = {};
  readonly children: StubEl[] = [];
  private readonly listeners = new Map<string, Array<() => void>>();

  constructor(tagName: string, ownerDocument: unknown) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
  }

  append(...kids: StubEl[]): void {
    this.children.push(...kids);
  }

  addEventListener(type: string, fn: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  fire(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

function makeHost(): StubEl {
  const doc = {
    createElement: (tagName: string): StubEl => new StubEl(tagName, doc),
  };
  return new StubEl("div", doc);
}

/** Decimals a step needs. Local on purpose — see the file header. */
function stepDecimals(stepSize: number): number {
  const text = String(stepSize);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

/**
 * Drag a range input the way a browser would: clamp into [min, max], snap onto
 * the step grid, and serialise at the step's precision.
 */
function drag(input: StubEl, requested: number): void {
  const min = Number(input.min);
  const max = Number(input.max);
  const size = Number(input.step);
  const clamped = Math.min(max, Math.max(min, requested));
  const steps = Math.round((clamped - min) / size);
  const snapped = Math.min(max, min + steps * size);
  input.value = snapped.toFixed(stepDecimals(size));
  input.fire("input");
}

function walk(el: StubEl, out: StubEl[] = []): StubEl[] {
  out.push(el);
  for (const kid of el.children) walk(kid, out);
  return out;
}

function poke(root: StubEl, name: string): StubEl {
  const hit = walk(root).filter((e) => e.dataset["poke"] === name);
  expect(hit, `exactly one control named ${name}`).toHaveLength(1);
  return hit[0]!;
}

function group(root: StubEl, name: string): StubEl {
  const hit = walk(root).filter((e) => e.dataset["group"] === name);
  expect(hit, `exactly one group named ${name}`).toHaveLength(1);
  return hit[0]!;
}

/**
 * A mounted panel wired the way `web/main.ts` wires it. `main.ts` itself
 * reaches for `document` at module scope and cannot be imported here, so the
 * reset semantics live in `rebuildWorld`, which both this and `main.ts` call —
 * there is one definition of what a restart does and it is the one under test.
 */
interface Session {
  host: StubEl;
  params: Params;
  world: World;
  resets: number;
}

function mount(overrides: Partial<Params> = {}): Session {
  const params = defaultParams({ ...TOY_DEFAULTS, ...overrides });
  const session: Session = {
    host: makeHost(),
    params,
    world: createWorld(params),
    resets: 0,
  };
  mountControls(session.host as unknown as HTMLElement, params, (o) => {
    session.world = rebuildWorld(params, o);
    session.resets++;
  });
  return session;
}

function advance(world: World, generations: number): void {
  for (let i = 0; i < generations; i++) step(world);
}

/** Distinct sequence coordinates captured anywhere in the population. */
function repertoireValues(world: World): Set<number> {
  const out = new Set<number>();
  for (const genome of world.genomes) {
    for (const entry of genome.repertoire) out.add(entry);
  }
  return out;
}

function occupiedFraction(world: World): number {
  return observe(world).totalCopies / (world.params.N * world.params.S);
}

// --------------------------------------------------------------------------

describe("the pokes reach the model", () => {
  /**
   * The identity claim, and the foundation of every other test in this file.
   *
   * `mountControls` closes over the params object it is handed. If a restart
   * hands the world a DIFFERENT object — which `defaultParams({...})` returns,
   * and which is what a `let params = defaultParams(...)` reassignment would
   * leave behind — then every slider goes on writing to the object the closure
   * captured while `step` reads the other one. Nothing throws, the captions
   * still move, and the toy is dead.
   *
   * The assertion is deliberately NOT "the control mutated params", because
   * that passes on the broken version. It is a three-way race between the world
   * the panel is driving and two twins built from the same seed at the two
   * candidate values of `v`, run forward and compared with the project's own
   * determinism oracle.
   */
  it("keeps a slider wired to the live world across a restart", () => {
    const s = mount();
    const vSlider = poke(s.host, "v");

    // Positive control, asserted first: before any restart the poke lands.
    expect(s.params.v).toBe(TOY_DEFAULTS.v);
    drag(vSlider, 0.03);
    expect(s.world.params.v, "the poke lands before a restart").toBe(0.03);

    // Restart. `shrink` is used rather than `invade` only because it is the
    // one that also changes something structural we can see (N).
    poke(s.host, "shrink").fire("click");
    expect(s.resets).toBe(1);
    drag(vSlider, 0.05);

    // THE MODEL-LEVEL ASSERTION COMES FIRST, and the object-identity one after
    // it, deliberately. Every way of breaking this — including reassigning a
    // `let` on the far side of the closure — also makes `world.params.v` read
    // the old number, so an identity check placed here would fail first and the
    // claim that actually matters, that the NEXT GENERATION obeys the slider,
    // would never be exercised by the mutant that breaks it.
    //
    // Both twins start from the identical founding draw, so the only thing that
    // can separate them is the excision rate `lose` reads.
    const twinNew = createWorld(defaultParams({ ...s.params, v: 0.05 }));
    const twinOld = createWorld(defaultParams({ ...s.params, v: 0.03 }));
    expect(stateHash(twinNew), "the twins start identical").toBe(
      stateHash(twinOld),
    );
    advance(s.world, 30);
    advance(twinNew, 30);
    advance(twinOld, 30);
    expect(stateHash(twinNew), "the two rates do diverge").not.toBe(
      stateHash(twinOld),
    );
    expect(stateHash(s.world), "the run follows the NEW rate").toBe(
      stateHash(twinNew),
    );

    expect(s.world.params, "world.params IS the object the panel holds").toBe(
      s.params,
    );
    expect(s.world.params.v, "the poke lands AFTER a restart").toBe(0.05);
  });

  it("applies a restart's overrides on top of the live params", () => {
    const s = mount();

    // Positive control: the founding condition before anyone presses anything.
    expect(s.params.N).toBe(60);
    expect(s.world.genomes).toHaveLength(60);

    // A mid-run poke made before the restart has to survive it: a restart
    // changes the founding condition, not the conditions the population lives
    // under.
    poke(s.host, "silencing").fire("click");
    expect(s.params.silencingOn).toBe(false);

    poke(s.host, "shrink").fire("click");
    expect(
      s.world.genomes,
      "the override reached the world that got built",
    ).toHaveLength(30);
    expect(s.params.N, "and the panel is looking at the same number").toBe(30);
    expect(s.params.silencingOn, "the mid-run poke survived the restart").toBe(
      false,
    );
  });

  /**
   * Cluster size. `isClusterSite` is `site < floor(c * S)`, so at `c = 0` the
   * trap has no sites, nothing is ever captured, and no copy can be silenced.
   * Raising the slider mid-run has to produce silenced copies out of a
   * population that had none.
   */
  it("makes silenced copies appear when the cluster slider is raised", () => {
    const s = mount({ c: 0 });
    const control = createWorld(defaultParams({ ...TOY_DEFAULTS, c: 0 }));

    // Positive control, asserted first: with the slider left alone, the trap
    // never appears, so a later count above zero cannot be the run's own drift.
    advance(control, 300);
    expect(observe(control).silencedCopies, "no trap, no silencing").toBe(0);
    expect(
      observe(control).totalCopies,
      "and the control is alive",
    ).toBeGreaterThan(0);

    advance(s.world, 200);
    expect(observe(s.world).silencedCopies).toBe(0);
    drag(poke(s.host, "c"), 0.02);
    advance(s.world, 100);
    expect(
      observe(s.world).silencedCopies,
      "raising the cluster builds a trap within 100 generations",
    ).toBeGreaterThan(100);
    expect(s.world.params.c, "and the world is reading the slider").toBe(0.02);
  });

  /**
   * Tolerance. `trap` captures with probability `1 - t`, so at `t = 1` a genome
   * can never form a repertoire and therefore cannot be conscripted — the gate
   * that makes resistance and tolerance differ in kind rather than degree.
   *
   * THE INSTRUMENT IS THE SET OF DISTINCT CAPTURED VALUES, NOT A COUNT. Total
   * repertoire entries across the population keeps moving after `t = 1` (236 ->
   * 300 in the measurement this test is cut from) because offspring inherit the
   * mother's repertoire and fecund lineages copy theirs into more genomes. That
   * is inheritance, not capture. A count cannot express the assertion; the
   * arrival of a value that was not there before can.
   */
  it("stops new captures dead when tolerance is pushed to 1", () => {
    const s = mount();
    const control = createWorld(defaultParams(TOY_DEFAULTS));

    advance(control, 200);
    const controlBefore = repertoireValues(control);
    advance(control, 400);
    const controlNovel = [...repertoireValues(control)].filter(
      (x) => !controlBefore.has(x),
    );
    // Positive control, asserted first: at t = 0 this instrument is not stuck
    // at zero — captures are happening and it sees them.
    expect(
      controlNovel.length,
      "a resistant host keeps capturing",
    ).toBeGreaterThan(10);

    advance(s.world, 200);
    const before = repertoireValues(s.world);
    expect(
      before.size,
      "the poked arm had a trap to begin with",
    ).toBeGreaterThan(0);
    drag(poke(s.host, "t"), 1);
    advance(s.world, 400);
    const novel = [...repertoireValues(s.world)].filter((x) => !before.has(x));
    expect(novel, "a purely tolerant host captures nothing at all").toEqual([]);
    expect(s.world.params.t, "and the world is reading the slider").toBe(1);
  });

  /**
   * The knockout. Its interest is that it is NOT inert mid-run even though
   * `silencingOn` gates only capture and nothing ever clears a repertoire: the
   * family drifts away from the fixed sequence coordinates already in the trap,
   * so a trap that stops taking on new entries stops matching within about a
   * hundred generations.
   *
   * TWO OBSERVABLES, ONE MECHANISM, ONE MUTATION. Silencing collapsing and copy
   * number climbing are the same fact seen twice, and there is no change to
   * `web/controls.ts` that produces one without the other, so they are asserted
   * together and this test is not claiming two independent demonstrations.
   */
  it("releases the element when silencing is knocked out mid-run", () => {
    const s = mount();
    const control = createWorld(defaultParams(TOY_DEFAULTS));

    advance(s.world, 1000);
    advance(control, 1000);
    const opening = observe(s.world);
    expect(stateHash(s.world), "the arms are the same run so far").toBe(
      stateHash(control),
    );
    expect(
      opening.silencedCopies,
      "there is a trap to knock out",
    ).toBeGreaterThan(100);

    poke(s.host, "silencing").fire("click");
    advance(s.world, 600);
    advance(control, 600);

    const after = observe(s.world);
    const stillOn = observe(control);
    // Positive control, asserted first: the arm that was never poked still has
    // its trap and its copy number is still held down, so neither of the two
    // assertions below can be the run drifting there on its own.
    expect(
      stillOn.silencedCopies,
      "the unpoked arm keeps its trap",
    ).toBeGreaterThan(100);
    expect(after.silencedCopies, "silencing decays to nothing").toBeLessThan(
      10,
    );
    expect(
      after.totalCopies,
      "and copy number climbs away from the control",
    ).toBeGreaterThan(stillOn.totalCopies * 1.5);
    expect(s.world.params.silencingOn, "and the switch is off").toBe(false);
  });

  /**
   * Going asexual. The button is labelled with what this measures, because
   * "leaves the population running rather than collapsing" is true and
   * misleading: the population does keep running, and it does so with nearly
   * every site in every genome occupied.
   *
   * Free recombination is the assumption Charlesworth's containment result
   * rests on, and `sim/phases/reproduce.ts` is the only place it lives.
   */
  it("floods the genome when the population goes asexual, and clears it again", () => {
    const s = mount();
    const control = createWorld(defaultParams(TOY_DEFAULTS));

    advance(s.world, 300);
    advance(control, 400);
    // Positive control, asserted first: a sexual run of the same length sits at
    // a low percent of the available sites, so saturation below is the poke.
    expect(
      occupiedFraction(control),
      "recombination holds copy number down",
    ).toBeLessThan(0.1);

    poke(s.host, "sexual").fire("click");
    advance(s.world, 100);
    expect(
      occupiedFraction(s.world),
      "asexual fills the genome",
    ).toBeGreaterThan(0.9);
    expect(s.world.params.sexual, "and the world is reading the toggle").toBe(
      false,
    );

    poke(s.host, "sexual").fire("click");
    advance(s.world, 20);
    expect(
      occupiedFraction(s.world),
      "and going sexual again clears it",
    ).toBeLessThan(0.1);
    expect(s.world.params.sexual).toBe(true);
  });
});

describe("the panel says what the model is doing", () => {
  /**
   * A slider's thumb is a graphic element whose position claims to be the
   * number printed beside it. A range input silently snaps an off-grid or
   * out-of-range value, and the thumb would then sit somewhere the params
   * object never was — the first drag would jump the model rather than
   * continuing the run.
   */
  it("puts every toy default on its own slider's grid", () => {
    const params = defaultParams(TOY_DEFAULTS);
    // Positive control, asserted first: the predicate can say no, so a slider
    // passing below is a fact about the value and not about the predicate.
    const cSlider = SLIDERS.find((s) => s.key === "c")!;
    expect(onSliderGrid(0.0005, cSlider), "off the grid").toBe(false);
    expect(onSliderGrid(0.9, cSlider), "past the max").toBe(false);

    for (const s of SLIDERS) {
      expect(
        onSliderGrid(params[s.key], s),
        `${s.key} = ${params[s.key]}`,
      ).toBe(true);
    }
  });

  it("prints a slider value at a precision that can express every step", () => {
    const pDom = SLIDERS.find((s) => s.key === "pDom")!;
    // Positive control, asserted first, and it depends on nothing in the module
    // under test: two adjacent positions on this slider are genuinely different
    // numbers, so a caption that renders them the same is losing information
    // rather than reporting a tie.
    expect(pDom.stepSize).toBe(0.0005);
    expect(0.0015).not.toBe(0.002);

    const s = mount();
    const input = poke(s.host, "pDom");
    const caption = walk(s.host).find(
      (e) => e.tagName === "label" && e.textContent.startsWith(pDom.label),
    )!;
    drag(input, 0.0015);
    expect(s.world.params.pDom, "the model got the snapped value").toBe(0.0015);
    expect(
      caption.textContent,
      "and the caption prints that same number",
    ).toContain("0.0015");
    expect(sliderCaption(pDom, 0.0015)).not.toBe(sliderCaption(pDom, 0.002));
    expect(decimalsFor(pDom.stepSize)).toBe(4);
  });

  /**
   * The split the panel draws is the one thing a visitor has to be able to see
   * before clicking: two of these cost you your run and the rest do not.
   */
  it("keeps the restarting pokes in their own group", () => {
    const s = mount();
    const live = walk(group(s.host, "live")).map((e) => e.dataset["poke"]);
    const restart = walk(group(s.host, "restart")).map(
      (e) => e.dataset["poke"],
    );

    expect(live).toEqual(
      expect.arrayContaining(["c", "t", "v", "pDom", "silencing", "sexual"]),
    );
    expect(restart.filter(Boolean)).toEqual(["invade", "shrink"]);
    for (const name of ["invade", "shrink"]) {
      expect(live, `${name} must not sit among the live pokes`).not.toContain(
        name,
      );
    }
  });

  /**
   * `max(40, floor(N/2))` at the toy's N = 60 is 40 forever after one press:
   * the button would go on looking live while doing nothing. The floor is lower
   * and the button disables itself when it reaches it.
   */
  it("disables the shrink button at the floor instead of no-opping", () => {
    const s = mount();
    const shrink = poke(s.host, "shrink");

    // Positive control, asserted first: the button starts live and names the N
    // the simulation is actually running.
    expect(shrink.disabled).toBe(false);
    expect(shrink.textContent).toContain("N=60");
    expect(s.world.genomes).toHaveLength(60);

    shrink.fire("click");
    expect(s.params.N).toBe(30);
    expect(shrink.disabled, "30 is above the floor").toBe(false);
    expect(shrink.textContent).toContain("N=30");

    shrink.fire("click");
    expect(s.params.N).toBe(N_FLOOR);
    expect(shrinkTarget(N_FLOOR), "and there is nowhere left to go").toBe(
      N_FLOOR,
    );
    expect(shrink.disabled, "so the button stops offering").toBe(true);
    expect(shrink.textContent).toBe(shrinkCaption(N_FLOOR));
  });

  /**
   * A fresh invasion has to be a world somebody can get back to. `sim/rng.ts`
   * exists because every run in this project is reproducible from its seed, and
   * a control that drew from `Math.random` would put a session beyond that.
   */
  it("advances the seed deterministically and prints the one running", () => {
    const s = mount();
    const invade = poke(s.host, "invade");

    // Positive control, asserted first: the caption names the seed that built
    // the world now on screen.
    expect(s.params.seed).toBe(1);
    expect(invade.textContent).toBe(invadeCaption(1));

    invade.fire("click");
    expect(s.params.seed, "the next invasion, not a random one").toBe(2);
    expect(invade.textContent).toBe(invadeCaption(2));
    expect(stateHash(s.world), "and the world is the one seed 2 builds").toBe(
      stateHash(createWorld(defaultParams({ ...s.params, seed: 2 }))),
    );

    invade.fire("click");
    expect(s.params.seed).toBe(3);
    expect(stateHash(s.world)).not.toBe(
      stateHash(createWorld(defaultParams({ ...s.params, seed: 2 }))),
    );
  });
});
