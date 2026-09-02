# Transposons as genome ecology — ROADMAP

**Canonical for "what phase, what's next".** If a later document supersedes this
one, banner this file and redirect from it in the same commit.

## Where this stands

**Nothing is designed yet.** Scaffolded 2026-09-01 so development could start;
no model, no registered question, no measurement.

## The constraint that shapes everything else

⚠️⚠️ **The player moves a LINEAGE'S EVOLVABLE STRATEGY, not an element making
choices. Transposition rate is HERITABLE, NOT A DECISION.**

This is not flavour. It rules out the most obvious design — a player who chooses
when to copy — because that models something biology does not do. The verb has to
be "carry a strategy and be selected", and finding a verb that is both accurate
and playable is the central design problem, not a detail to settle later.

## The first decision

⚠️ **What is the individual?** Three candidates, and the choice is not obvious:

| unit           | what a "player" then is                | what gets lost                            |
| -------------- | -------------------------------------- | ----------------------------------------- |
| element copy   | one insertion's fate                   | the strategy is invisible at this scale   |
| element FAMILY | a lineage with a heritable rate        | within-family variation                   |
| genome/host    | the suppressor's side of the arms race | the parasite is no longer the protagonist |

`deep-sim-design` covers exactly this (individual vs field) and should be run
before committing.

## Mechanics identified at filing

- **Frequency-dependent payoff against TWO opponents** — host silencing and rival
  families. Not one arms race, two, and they interact.
- ⚠️ **piRNA clusters are built from captured element fragments**, so inserting
  into one conscripts you into your own suppression. **The trap is made of you.**
  This is the mechanic most worth getting right and most likely to be wrong if
  taken from a summary rather than the pathway.
- **Domestication as an ALTERNATE WIN** — syncytin, RAG. Ceasing to be a parasite
  is a way to persist. A design with only "spread or die" throws this away.

## Should double as a research asset

TE data is open and abundant, so the model can be checked against reality rather
than only against itself: Petersen arthropod repertoires, Asparagales,
**Dfam/Repbase**.

⚠️ Those are pointers from the filing note, not verified facts about current
contents. Query a live registry before asserting what any of them holds or
whether a given comparison already exists.

## Not yet done

- [ ] Brainstorm the design (`superpowers:brainstorming`, then `deep-sim-design`)
- [ ] Settle the unit of individuality and record WHY
- [ ] Find a player verb that respects "rate is heritable, not chosen"
- [ ] `bio-grounding` on piRNA conscription and on domestication, against the
      actual pathways rather than the summary
- [ ] Prior-art check against live registries, with the null stated as "checked
      HERE" rather than "not found"
- [ ] First registered question + pre-registration, before any runner exists
