# Transposons as genome ecology

A sim-zoo design track. **Scaffolded 2026-09-01; the design has NOT been done
yet** — this directory exists so development can start, not because anything is
settled. Tracked as task #11.

## The brief, as filed

In-depth iterative design.

⚠️⚠️ **You play a LINEAGE'S EVOLVABLE STRATEGY, not an element making choices.**
This is an accuracy constraint and it is load-bearing: **transposition rate is
heritable, not a decision.** A design that lets the player choose when to copy is
modelling something that does not exist. What the player moves is the strategy a
lineage carries; what happens next is selection.

**The payoff is frequency-dependent**, against two different opponents at once:
host silencing, and rival element families.

**Key mechanics identified at filing:**

- **piRNA clusters are built from captured element fragments** — so inserting
  into one conscripts you into your own suppression. The trap is made of you.
- **domestication as an alternate win** — syncytin, RAG. Ceasing to be a parasite
  is a way to persist, not a way to lose.

## It should double as a research asset

TE data is open and abundant, so this is a track where the model can be checked
against reality rather than only against itself: Petersen arthropod repertoires,
Asparagales, **Dfam/Repbase**.

⚠️ Before asserting what any of those datasets contain or whether a comparison
has been done, query a live registry this session. A dataset named in a brief is
a pointer, not a verified fact about its current contents.

## Before writing code here

- `superpowers:brainstorming` before implementation — the design track IS the
  work.
- `deep-sim-design` for the individual-versus-field question, which is sharp
  here: elements, families, and genomes are three candidate units and the design
  has to pick deliberately.
- `bio-grounding` before any borrowed mechanism becomes a design primitive. The
  piRNA-conscription mechanic above is precisely the kind of elegant story that
  needs checking against how the pathway actually works.

## Setup

    npm install
    npx playwright install chromium     # REQUIRED -- see below
    npm test

**The second line is not optional.** `tests/layout.test.ts` drives a real
Chromium against the built page: it is the only thing in the suite that can
check that the pokes are actually on screen and that the flooded toy still
answers its own button, and neither of those claims is decidable from Node.
`vitest.config.ts` includes every `tests/**/*.test.ts`, so that file always
runs; without the browser binary the suite fails at `chromium.launch()` with
"Executable doesn't exist", which is the truth and is meant to be visible.

Other commands:

    npm run build      # vite build -> dist/
    npm run typecheck  # tsc --noEmit

There is no dev server in any of the above and none is needed to verify a
change.

## Layout

Mirrors `_pm/`, which is the sibling project furthest along:

    docs/         ROADMAP.md is canonical for "what phase, what's next";
                  pre-registrations and results live here, dated
    sim/          the model itself
    experiments/  runners that ask one registered question each
    tests/        guards; every claim the model makes should have one
    tools/        probes, gradients, one-off measurement scripts
    _scratch/     untracked working area
