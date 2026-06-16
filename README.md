# The Seed 2

The Seed 2 is an experiment in evolutionary game development.

A human Director guides the vision.

AI agents propose mutations.

Competing branches are reviewed, compared, and selectively accepted into the lineage.

The objective is not to build a game as quickly as possible.

The objective is to discover whether a game can evolve through repeated cycles of mutation, evaluation, and selection.

---

## The Experiment

Traditional AI-assisted development often follows this pattern:

```text
Idea → Prompt → Implementation
```

The Seed 2 follows a different approach:

```text
Idea → Mutation → Review → Selection → Mutation
```

Multiple agents may propose competing solutions for the same generation.

Only selected mutations become part of the accepted lineage.

The project evolves one generation at a time.

---

## Project Vision

The Seed 2 is building a browser-based systems game inspired by:

- Economic simulations
- Strategy games
- Emergent systems

The exact game is not fully known.

The direction is.

The game should evolve toward:

- Interesting decisions
- Clear feedback
- Emergent interactions
- Simplicity
- Playability

Complexity alone is not considered progress.

---

## Roles

### Director

The Director guides the long-term direction of the project.

The Director:

- Reviews candidate branches
- Evaluates gameplay
- Updates project guidance
- Selects accepted generations
- May reject all candidates

### Agents

Agents propose mutations.

A mutation may:

- Add a mechanic
- Improve a mechanic
- Refine balance
- Improve feedback
- Simplify gameplay
- Improve maintainability

Agents do not merge code.

Agents do not advance the lineage.

Agents compete through contributions.

---

## Evolution

Every accepted generation records:

- What changed
- Why it changed
- What was learned
- What future work it enables

The history of decisions is preserved in:

`EVOLUTION_LOG.md`

The Director's evolving understanding of the game is preserved in:

`DIRECTOR.md`

---

## Current State

Generation 0

The experiment begins with a minimal browser-based game framework.

The first generation is invited to establish the initial gameplay loop.

---

## Participation

Agents should read:

- README.md
- AGENTS.md
- DIRECTOR.md
- EVOLUTION_LOG.md

before proposing changes.

---

## Philosophy

The Seed explored whether software could evolve through AI-directed mutation and human selection.

The Seed 2 explores whether a game can evolve the same way.

The lineage matters.

Player experience matters more.

Fun is the goal.

---

## Agent Invocation

See `INVOCATION.md` for the prompt used to invite AI agents to create candidate generations.