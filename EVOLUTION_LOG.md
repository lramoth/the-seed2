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

## Generation 2

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-2-1781650866)

Intent:
Address the Director's dominant pressure — the movement model. Generation 1
pinned the player to the left 60% of the screen, fixed the ship's nose pointing
right, sent enemies only from the right, and auto-scrolled the starfield.
DIRECTOR.md repeatedly asks for the opposite: player-controlled movement instead
of automatic scrolling, freedom to move both directions, a ship that faces where
it flies, threats from multiple directions, and a ground reference for
navigation. The highest-value mutation is to turn the loop into self-directed
flight.

Mutation:
Reworked movement and combat into a free-flight, two-front loop — one coherent
idea, no new external subsystems:

- Free roaming across the whole field (removed the 60% horizontal clamp); the
  ship stays in the sky above a new ground band (`CFG.world.groundHeight`).
- The ship faces its horizontal heading, and firing follows facing — bullets
  carry a signed velocity and leave the correct side of the nose. `drawPlayer`
  and `drawEnemies` now render in a mirrored local frame so the nose, thruster,
  and muzzle all point the way of travel.
- Enemies spawn from *either* edge with a travel `dir`; a "breach" is now
  leaving through either edge, generalized with a pure `offscreenX` helper.
- The world only moves when the player does: per-frame `scrollDX` (the player's
  actual travel) drives a depth-layered starfield parallax and a rolling,
  sine-based ground terrain. The constant automatic scroll is gone.
- Ready-screen copy, README, and PROJECT_MAP updated. Audio (the one remaining
  Director note) was deliberately deferred to keep this a single idea rather
  than two major systems in one generation.

Rationale:
This folds five tightly-coupled Director notes into one change and creates a
genuinely new decision: you can only fire one way at a time, so each run is
about reading both fronts and pivoting to the more urgent threat. It improves
the *feel* of movement and combat — the Director's stated priority over new
systems — without introducing a disconnected subsystem, and all balance still
lives in `CFG`.

Tests / Verification:
- Pure helper `offscreenX` exposed on `window.__seed` and asserted (past either
  edge → true; on-field and edge-touching → false).
- Deterministic in-browser simulation (one synchronous eval, so the live rAF
  loop could not interleave): start → `playing`; pressing right/left sets
  `facing` +1/-1 with matching ±34px travel and `scrollDX`; facing-based fire
  produced correctly-signed and -positioned bullets; 60 spawns split across both
  edges (22 left / 38 right) with 0 misplacements; enemies past each edge both
  breached, hull 100 → 76 (2 × 12). No console errors.
- Visual screenshot confirmed the player facing right, enemies converging from
  both edges nose-first, the movement-driven starfield, and the rolling ground
  terrain.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Resolves the movement-model tension at the center of DIRECTOR.md and makes
"which way do I face?" the core moment-to-moment decision. The playfield is now
symmetric and player-piloted — a better substrate for threats from any
direction in future generations.

Future Work Enabled:
- Audio (blaster, kills, thrusters, game-over, music) — the deferred Director note
- Threats from above/below or corners, now that the field is symmetric
- Enemies that shoot back or telegraph attacks, rewarding correct facing
- Weapon variety and pickups for meaningful choices
- Tuning the two-front spawn rate and pacing via `CFG`
