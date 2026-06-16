# Agent Instructions

This repository is an experiment in evolutionary game development.

A human Director defines the vision.

AI agents propose mutations.

The Director evaluates competing mutations and selects which ones become part of the lineage.

The goal is not to maximize features.

The goal is to evolve a game that becomes more fun to play.

Before making changes, review:

- README.md
- AGENTS.md
- DIRECTOR.md
- PROJECT_MAP.md
- EVOLUTION_LOG.md

Use PROJECT_MAP.md to understand the current structure of the project.

Verify your understanding against the relevant source code before making changes.

Understand the current state of the game before proposing a mutation.

## Project Purpose

This project is building a browser-based space combat game.

The exact mechanics are not fully known.

The gameplay will evolve through mutation, evaluation, and selection.

Agents should evolve the game toward:

- Fun moment-to-moment gameplay
- Clear player feedback
- Satisfying combat
- Interesting decisions
- Simplicity
- Playability

Agents should avoid:

- Excessive complexity
- Large rewrites
- Feature accumulation without purpose
- Mechanics that make the game harder to understand
- Mechanics that add complexity without improving gameplay

## Director Guidance

DIRECTOR.md is part of the project's source material.

It contains:

- Current vision
- Observations from playtesting
- Areas worth exploring
- Known problems
- Current preferences

Agents should treat DIRECTOR.md as guidance, not a specification.

The Director does not define solutions.

The Director defines pressures.

Agents are encouraged to explore multiple possible solutions.

## Mutation Philosophy

A strong mutation does one or more of the following:

- Makes the game more fun
- Improves combat
- Improves responsiveness
- Improves game clarity
- Improves player feedback
- Simplifies a confusing mechanic
- Makes the game easier to evaluate

A weak mutation:

- Adds complexity without improving gameplay
- Introduces systems disconnected from the current gameplay loop
- Prioritizes technical novelty over player experience
- Solves a problem the player does not have

## Scope

Prefer small, reviewable changes.

A generation should usually focus on one idea.

Examples:

- Improve ship controls
- Improve shooting feedback
- Add a simple enemy type
- Improve visual feedback
- Introduce a new combat mechanic

Avoid implementing multiple major systems in a single generation.

## Gameplay First

When choosing between:

- Better architecture
- Better gameplay

Prefer better gameplay.

Technical improvements are valuable when they enable future gameplay evolution.

The game itself is the primary artifact.

## You Must

- Keep changes small and coherent
- Explain your reasoning
- Update EVOLUTION_LOG.md
- Leave the game playable
- Include tests when appropriate
- Justify how the mutation improves the game

## Evolution Log Format

Append entries to `EVOLUTION_LOG.md` using the following format:

## Generation N

Agent:
Date:
Commit / PR:
Intent:
Mutation:
Rationale:
Tests / Verification:
Effect on Project Direction:
Future Work Enabled:

## Branch Guidance

Agents should create work on a uniquely named branch.

Branch names must follow the format:

`gen-N-<unix_timestamp>`

Examples:

- `gen-2-1750089012`
- `gen-3-1750089258`

The generation number `N` must be the next available generation number.

The next available generation number is determined by the most recent accepted generation recorded in `EVOLUTION_LOG.md`.

If the accepted lineage ends at Generation 4 and no Generation 5 candidate has been accepted, future candidates should continue creating Generation 5 branches.

Rejected, deferred, abandoned, or unselected candidate branches do not advance the lineage.

Agents must not create branches for future generations.

For example, if the accepted lineage ends at Generation 2, valid branch names begin with:

`gen-3-`

and branches such as:

`gen-4-*`
`gen-5-*`

are invalid.

Multiple candidate branches for the same generation are encouraged.

Competing ideas are a core part of the experiment.

Agents should commit their changes.

Branches should remain available for review and selection.

Agents must not:

- Create pull requests
- Merge branches
- Delete branches

Only accepted generations advance the lineage.

## Selection

Not all mutations survive.

A contribution may be accepted or rejected based on:

- Gameplay impact
- Quality of player decisions
- Clarity of feedback
- Simplicity
- Maintainability
- Coherence with the current vision
- Quality of rationale

Selection is performed by the Director.

The Director evaluates the game as a player, reviewer, and steward of the lineage.

A technically strong contribution may still be rejected if it does not improve the game.

A simple contribution may be accepted if it meaningfully improves player experience.

## Current State

The current state of the project is defined by:

1. The contents of the `main` branch.
2. The evolution history recorded in `EVOLUTION_LOG.md`.
3. The current direction described in `DIRECTOR.md`.
4. Previously accepted generations.

If a proposed change conflicts with a previously accepted generation or current Director guidance, the agent should explicitly explain why the change is justified.

## Director

The Director is responsible for guiding the long-term evolution of the game.

The Director may:

- Evaluate competing mutations
- Compare candidate branches
- Update `DIRECTOR.md`
- Accept a candidate
- Reject a candidate
- Reject all candidates
- Refine the project's vision over time

The Director should focus on:

- Fun gameplay
- Player experience
- Combat satisfaction
- Clarity
- Long-term game potential

The Director does not prescribe specific implementations.

The Director creates evolutionary pressure through selection and guidance.

## Null Selection

A generation is accepted only if it improves the game.

If no candidate meaningfully improves gameplay, player understanding, or future game potential, the generation may be skipped.

The lineage remains unchanged.

Future candidates may continue competing for the same generation number.

No generation is guaranteed acceptance.

Choosing nothing is a valid outcome.

## Project Map

Before making changes, review `PROJECT_MAP.md` if it exists.

Use it to understand the current structure of the project before exploring the source code.

If your contribution significantly changes the architecture, major systems, data flow, or project organization, update `PROJECT_MAP.md` as part of the same mutation.

Keep the document concise and focused on the current state of the project.
