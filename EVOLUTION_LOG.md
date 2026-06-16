# Evolution Log

This file records the evolution of the repository.

Each generation should describe not only what changed, but why the change was made.

## Generation 0

Agent: Human Seed

Date: Initial Creation

Commit / PR: Initial Seed

Intent:
Create an empty environment for AI-directed game development.

Mutation:
Added the initial repository documents.

Rationale:
The project begins with a broad game direction but no established gameplay loop.

Tests / Verification:
Not applicable.

Effect on Project Direction:
No direction has been chosen.

Future Work Enabled:
AI agents may now create the first generation of the project.

## Generation 1

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-1-1781647824)

Intent:
Establish the genesis core gameplay loop. Generation 0 contained only seed
documents and no playable game, so the highest-value mutation is to give the
project an actual, immediately playable game to evolve from.

Mutation:
Added a self-contained, browser-based, side-scrolling space combat game:

- `index.html`, `style.css`, `game.js` (vanilla JS canvas, no build step, no
  dependencies — opening the file plays the game).
- Core loop: the player holds the left side of the screen, moves freely
  (WASD / Arrows), and fires (Space). Enemy ships scroll in from the right.
- Stakes: enemies that ram the player or slip past the left edge damage the
  hull; at zero hull the run ends. Score rewards destroying ships.
- Difficulty ramp: spawn rate and enemy speed increase over time, creating
  rising tension.
- Feedback (juice): parallax starfield for motion, thruster flame, muzzle
  flash, explosion particles, hit flash, and screen shake on damage.
- Loop framing: ready screen, in-run HUD (score / best / hull bar), and a
  game-over screen with an instant restart (R) and best-score tracking.

Rationale:
This directly matches every current Director preference — space combat,
side-scrolling presentation, responsive controls, clear visual feedback, and a
spatial game world that is easy to learn. It is deliberately one coherent idea
(the combat loop) rather than several systems, and it is immediately verifiable
by the Director with no setup. It answers the open "What is the core gameplay
loop?" question with a concrete, mutable starting point.

Tests / Verification:
- Pure logic (`clamp`, `rectsOverlap`, `lerp`) exposed on `window.__seed` and
  verified with assertions in-browser — all passed.
- Played in a browser via a local static server: confirmed launch, movement,
  firing, enemy spawning/advance, kills incrementing score (observed SCORE
  000200), hull depletion from collisions, game over ("HULL BREACHED"), and
  restart returning to full hull. No console errors.
- Run instructions: open `index.html` directly, or
  `python3 -m http.server 8000` and visit `http://localhost:8000`.

Effect on Project Direction:
Gives the lineage its first playable artifact. Future generations now have
concrete material to mutate: enemy variety, enemy fire, weapon types,
power-ups, scoring depth, audio, and balance tuning (all gameplay values live
in the `CFG` object in `game.js`).

Future Work Enabled:
- New enemy types and movement patterns
- Enemies that shoot back (raising combat tension)
- Weapon variety and pickups for meaningful choices
- Audio feedback
- Balance and pacing tuning via `CFG`
