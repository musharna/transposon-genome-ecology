/**
 * Basic accessibility of the page and the generated controls.
 *
 * Two instruments. The static page is read as TEXT from `web/index.html`,
 * because the claims about it -- landmarks, headings, a role and a name on
 * every canvas, the reduced-motion block -- are claims about what ships, and
 * the file is what ships. The controls are built by `mountControls` into the
 * same DOM stub `tests/controls.test.ts` drives, extended with the two things a
 * name needs that a poke does not: `id`/`htmlFor`, and attributes.
 *
 * The live region is asserted through `liveSentence`, which is the ONLY thing
 * `web/main.ts` writes into it, and which reads the same snapshot fields the
 * readout prints -- so "mirrors the readout, no new stats" is checked at the
 * one function that could break it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultParams, observe, createWorld } from "../sim/index.js";
import { TOY_DEFAULTS } from "../web/params.js";
import { SLIDERS, mountControls } from "../web/controls.js";

const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

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
  id = "";
  htmlFor = "";
  readonly attrs = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  readonly children: StubEl[] = [];
  constructor(tagName: string, ownerDocument: unknown) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
  }
  append(...kids: StubEl[]): void {
    this.children.push(...kids);
  }
  addEventListener(): void {}
  setAttribute(k: string, v: string): void {
    this.attrs.set(k, v);
  }
  getAttribute(k: string): string | null {
    return this.attrs.get(k) ?? null;
  }
}

function mount(): StubEl {
  const doc = {
    createElement: (tagName: string): StubEl => new StubEl(tagName, doc),
  };
  const host = new StubEl("div", doc);
  mountControls(host as unknown as HTMLElement, defaultParams(TOY_DEFAULTS), () => {});
  return host;
}

function walk(el: StubEl, out: StubEl[] = []): StubEl[] {
  out.push(el);
  for (const kid of el.children) walk(kid, out);
  return out;
}

/** The accessible name a browser would compute, reduced to the cases here. */
function nameOf(el: StubEl, all: StubEl[]): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  if (el.id) {
    const label = all.find((e) => e.tagName === "LABEL" && e.htmlFor === el.id);
    if (label) return label.textContent.trim();
  }
  if (el.tagName === "BUTTON") return el.textContent.trim();
  return "";
}

// --------------------------------------------------------------------------
// generated controls
// --------------------------------------------------------------------------

describe("every generated control has an accessible name", () => {
  const host = mount();
  const all = walk(host);
  const inputs = all.filter((e) => e.tagName === "INPUT");
  const buttons = all.filter((e) => e.tagName === "BUTTON");

  it("builds the controls it is about to name", () => {
    expect(inputs).toHaveLength(SLIDERS.length);
    expect(buttons).toHaveLength(4);
  });

  it("names every slider through a <label for>", () => {
    for (const input of inputs) {
      expect(input.id, `slider ${input.dataset["poke"]} has an id`).not.toBe("");
      expect(nameOf(input, all), `slider ${input.dataset["poke"]}`).not.toBe("");
    }
    const ids = inputs.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names every button", () => {
    for (const b of buttons)
      expect(nameOf(b, all), `button ${b.dataset["poke"]}`).not.toBe("");
  });

  it("makes the panel title a heading", () => {
    const titles = all.filter((e) => e.className === "panel-title");
    expect(titles).toHaveLength(1);
    expect(titles[0]!.tagName).toMatch(/^H[1-6]$/);
  });
});

// --------------------------------------------------------------------------
// static page
// --------------------------------------------------------------------------

function tags(name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "g")) ?? [];
}

describe("the page has landmarks and headings", () => {
  it("has one <main> and one <h1>", () => {
    expect(tags("main")).toHaveLength(1);
    expect(tags("h1")).toHaveLength(1);
  });
  it("makes every panel title a heading, not a div", () => {
    const divs = html.match(/<div[^>]*class="panel-title"/g) ?? [];
    expect(divs).toEqual([]);
    expect(html.match(/<h2[^>]*class="panel-title"/g)?.length).toBeGreaterThanOrEqual(4);
  });
});

describe("every canvas has a role and a name", () => {
  const canvases = tags("canvas");
  it("finds the four canvases", () => {
    expect(canvases).toHaveLength(4);
  });
  it.each(canvases)("%s", (tag) => {
    expect(tag).toMatch(/\brole="img"/);
    expect(tag).toMatch(/\baria-label="[^"]+"/);
  });
});

describe("the live region mirrors the readout", () => {
  it("has exactly one polite live region, visually hidden", () => {
    const regions = html.match(/<[^>]*aria-live="polite"[^>]*>/g) ?? [];
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatch(/visually-hidden/);
  });
  it("speaks the same counts the readout prints and nothing else", async () => {
    // Imported here rather than at the top so a tree without `liveSentence`
    // fails THIS assertion and not the whole file.
    const { liveSentence } = await import("../web/tally.js");
    const snap = observe(createWorld(defaultParams(TOY_DEFAULTS)));
    const s = liveSentence(snap);
    expect(s).toContain(`generation ${snap.generation}`);
    expect(s).toContain(`${snap.totalCopies} copies`);
    expect(s).toContain(`${snap.activeCopies} active`);
    expect(s).toContain(`${snap.silencedCopies} silenced`);
    expect(s).toContain(`${snap.domesticatedCopies} domesticated`);
    // Every number in the sentence is one the readout already shows.
    const printed = new Set(
      [
        snap.generation,
        snap.totalCopies,
        snap.activeCopies,
        snap.silencedCopies,
        snap.domesticatedCopies,
      ].map(String),
    );
    for (const n of s.match(/\d+/g) ?? []) expect(printed.has(n), n).toBe(true);
  });
});

describe("motion and focus", () => {
  it("has a prefers-reduced-motion block", () => {
    expect(html).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
  it("styles keyboard focus", () => {
    expect(html).toMatch(/:focus-visible\s*\{/);
  });
});
