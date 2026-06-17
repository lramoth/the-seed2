# Project Map

This document describes the current structure of the project.

Its purpose is to help future agents quickly understand the architecture, major systems, data flow, and overall organization of the repository.

Keep this document concise.

Update it when your contribution significantly changes the structure of the project.

Describe what currently exists, not what may exist in the future.

---

## Overview

A browser-based, free-flight space combat game. The player pilots a ship across
the field and faces the direction they fly; firing launches enemy-seeking
missiles that curve toward the nearest enemy ahead of them, while threats close
in from both edges and fire their own (deliberately less accurate) seeking
missiles back. The hull only takes damage from an enemy missile or a ram. It
runs as a single static page with no build step, no dependencies, and no server
requirement — opening `index.html` is enough to play.

## Files

- `index.html` — Page shell. Holds the `<canvas id="game">` (960×540 internal
  resolution) and loads the stylesheet and script.
- `style.css` — Page and canvas presentation. The canvas scales responsively
  while keeping a 16:9 aspect ratio.
- `game.js` — The entire game. Vanilla JavaScript, no modules, no libraries.

## game.js structure

The file is organized top-to-bottom into clear sections:

- **Configuration (`CFG`)** — All tunable gameplay values (world/ground band,
  player, bullet, enemy, spawn pacing) in one object. Balance changes live here.
- **Pure helpers** — `clamp`, `rectsOverlap`, `lerp`, `randRange`,
  `offscreenX` (left/right edge test), `offscreen` (all-four-edges test for
  missiles), `angleDelta` / `steerAngle` (capped rotation toward a heading, the
  basis of missile turning), `playBottom` (sky/ground divide). Side-effect free;
  the testable ones are exposed on `window.__seed`.
- **Canvas + input** — Keyboard state tracking and phase transitions
  (launch / restart).
- **Game state** — A single `state` object rebuilt by `newState()` /
  `startGame()`. Holds the phase, score, the player (including `facing`),
  per-frame `scrollDX` / accumulated `groundScroll`, and entity arrays
  (`missiles`, `enemyMissiles`, `enemies`, `particles`, `stars`).
- **Spawning / effects** — Enemies spawn from either edge (each with a travel
  `dir` and a randomized fire cooldown) on a difficulty ramp, plus particle
  explosions.
- **Update** — Fixed responsibilities per entity type, driven by delta time so
  motion is frame-rate independent. The player's actual horizontal travel
  (`scrollDX`) drives the background parallax — the world only moves when the
  player does. Player missiles carry a heading angle: each frame they steer
  toward the nearest enemy *ahead* of them (`nearestSeekTarget`) at a capped turn
  rate, then advance along that heading, and are retired by `offscreen` or a
  short lifetime. Enemies travel a signed direction and, once fully on-field,
  return fire on a per-ship cooldown (`enemyFire`); a ship leaving either edge
  (`offscreenX`) is simply removed — breaches are harmless. Enemy missiles re-aim
  at the player every frame at a lower turn rate (`updateEnemyMissiles`, reusing
  `steerAngle`), so they seek but stay dodgeable. The hull only loses health to
  an enemy missile or a ram.
- **Render** — Draws the movement-driven parallax starfield, rolling ground
  terrain, entities, particle effects, HUD, and the ready / game-over overlays.
  Player and enemy ships are drawn in a mirrored local frame so the nose,
  thruster, and muzzle face the direction of travel; missiles are rotated to
  their heading so the dart and its exhaust point where they fly. Screen shake is
  applied as a canvas transform during damage.
- **Main loop** — `requestAnimationFrame` loop computing `dt` and calling
  `update` then `render`.

## Game phases

`ready` → `playing` → `gameover`, driven by player input and player hull
reaching zero.
