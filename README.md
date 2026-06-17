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

Generation 20

A free-flight space combat loop set in a twenty-screen patrol sector, where the
camera keeps the ship readable while the whole world scrolls in one shared
frame: stars, ground, terrain structures, enemies, crates, missiles, and the
player all agree about motion. The enemies are bright plasma orbs that sometimes
enter as two- or three-orb squadrons from one edge, flash through vivid colors,
trail a thin light trail along their weaving path, and flare red before shooting
back; wiping every orb in a squadron before any member escapes or rams awards a
visible SQUAD CLEAR score bonus, so grouped fronts are tempting targets instead
of only denser pressure. Their missiles burn friend and foe alike but deal
reduced hull damage, the
player's blaster can overheat, the ship flies with momentum under a futuristic
luminous hull, and crates parachute in to be caught — health to patch the hull,
a "3X" boost for a burst of spread fire. Procedural audio now adds a calm in-run
pad, thruster hum, weapon shots, enemy shots, kill bursts, combo chimes, pickup
cues, hull-hit alerts, overheat venting, and a game-over falloff. The canvas UI
uses brighter Segoe-style text, and the HUD includes a compact sector readout so
the Director can verify the long-world mutation immediately.

### The Game

You pilot a ship through a *twenty-screen patrol sector*. The ship flies with
*momentum*: thrust accelerates it toward a top speed and it *glides to a stop*
when you let go, so dodging is about reading and managing your own inertia
rather than stopping on a dime. The ship is a luminous, cyan-edged craft with a
soft aura, bright cockpit, and strobing running lights so the player stays easy
to find in the crossfire. The camera keeps the ship clear of the *outer fifth of
each side*, so enemies closing from either edge are always in view before they
reach you, but sustained horizontal flight now carries you through a longer
world instead of trapping the whole run on one fixed screen. Stars, ground,
small terrain structures, enemies, crates, missiles, and the player all share
the same camera frame, so the world feels long without the old parallax
confusion. The ship faces whichever way you fly,
and firing launches *enemy-seeking missiles* along that heading — each curves
toward the nearest enemy ahead of it. A missile can only lock onto targets in
front of it and can't whip around, so *which way you face still decides which
front you defend*; the homing just forgives an enemy's vertical drift instead
of punishing a near miss. Continuous fire now builds blaster heat. If the heat
bar fills, the weapon overheats and briefly vents before it can fire again, so
controlled bursts keep you dangerous longer than holding Space forever. The
enemies are *bright plasma orbs* that flash through vivid colors and stream a
thin *light trail* tracing the weaving path they actually fly — so each threat's
heading and drift read at a glance without the trail dominating the orb.
Some waves now arrive as *small squadrons*: two or three color-matched orbs
enter from one edge in a loose vertical formation, with shared speed and
staggered fire timers, so the player reads them as a front to answer rather than
as isolated targets. Clear every orb in that group before one drifts away or
rams you and the game flashes a *SQUAD CLEAR* bonus near the last kill, with the
bonus scaled by your current combo multiplier — making a clean formation wipe a
score play worth chasing. They close in from *both* edges at once and *return fire* —
a red charge ring and hot aiming bead flare around an orb just before it shoots,
then it lobs its own seeking missile at you, slower and turning more lazily than
yours, so you can out-fly and juke it; when one connects, it now strips a
smaller chunk of hull so the mistake stings without ending the run too quickly.
Those enemy
missiles are *indiscriminate*: once armed,
one that catches another enemy detonates on it, so dodging out of the way can
feed an enemy's shot into a ship on the far front — *bait that crossfire* and the
two-front swarm thins itself. That makes the threat your enemies' *weapons*, not
their position: your hull only takes damage from an enemy missile or a ram —
letting a ship slip off an edge costs you nothing. Each run is a two-front
problem: face the side that's charging a shot, manage blaster heat, seek it
clear, bait the crossfire, and dodge the incoming fire while you pivot. At zero
hull the run ends.
Now and then a *crate parachutes down* from the top of the field — fly
into it, but you have to *break formation and cross the fire* to reach it before
it sinks past the ground, so each one is its own gamble. *Green crates patch your
hull*; the rarer *gold "3X" crates* grant a few seconds of *spread fire*, where
every trigger pull launches a fan of homing missiles instead of one, with a
*countdown bar under your ship* showing the time left — catch one and press the
advantage before it runs out.
*Chaining kills builds a score-multiplier streak*: each kill landed before a
short window lapses raises a **COMBO** multiplier (shown top-center with a
shrinking timer bar) up to a cap, and the bonus applies to baited crossfire kills
too — so pressing the attack and keeping the chain alive is worth far more than
picking ships off one at a time, while a lull lets the streak reset to nothing.
Sound starts when you launch the run: a soft procedural music bed supports play,
the thruster hum rises only while you push the ship, and short cues mark shots,
enemy fire, kills, squadron clears, combo climbs, pickups, hull loss, overheat,
and game over without adding any audio files or setup steps. In-canvas text uses a
Segoe-style sans-serif stack with brighter HUD labels for readability against
the dark field.
Score is the reason to play again.

### Controls

- Fly: WASD or Arrow Keys (the ship accelerates with momentum and faces the
  direction you fly; it coasts to a stop when you release)
- Fire: Space (launches seeking missiles in the direction you are facing; the
  blaster overheats under sustained fire, and fires a spread while a "3X" boost
  is active)
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
