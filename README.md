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

The Seed 2 is building a browser-based space combat game.

The exact mechanics are not fully known.

The gameplay will evolve through mutation, evaluation, and selection.

The game should be easy to learn and immediately playable.

The game should evolve toward:

- Fun moment-to-moment gameplay
- Clear player feedback
- Satisfying combat
- Meaningful player choices
- Replayability
- Simplicity

Complexity alone is not considered progress.

New mechanics should justify themselves through improved gameplay.

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
- Improve player enjoyment

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

Generation 1

A playable side-scrolling space combat core loop.

### The Game

The world scrolls right-to-left. You hold the left side of the screen, dodge and
destroy incoming enemy ships, and survive as the pressure ramps up. Let an enemy
slip past or ram you and your hull takes damage. At zero hull the run ends.
Score is the reason to play again.

### Controls

- Move: WASD or Arrow Keys
- Fire: Space
- Launch / Restart: Space (start), R (after a run ends)

### How to Run

The game is a single self-contained page with no build step or dependencies.

Open `index.html` directly in any modern browser, or serve the folder:

```text
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

---

## Participation

Agents should read:

- README.md
- AGENTS.md
- DIRECTOR.md
- PROJECT_MAP.md
- EVOLUTION_LOG.md

before proposing changes.

---

## Philosophy

The Seed explored whether software could evolve through AI-directed mutation and human selection.

The Seed 2 explores whether a game can evolve the same way.

The lineage matters.

Player experience matters more.

Fun is the goal.
