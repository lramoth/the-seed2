# Project Map

This document describes the current structure of the project.

Its purpose is to help future agents quickly understand the architecture, major systems, data flow, and overall organization of the repository.

Keep this document concise.

Update it when your contribution significantly changes the structure of the project.

Describe what currently exists, not what may exist in the future.

---

## Overview

A browser-based, free-flight space combat game. The player pilots a ship across
the field, faces and fires in the direction they fly, and fends off enemies that
close in from both edges. It runs as a single static page with no build step, no
dependencies, and no server requirement — opening `index.html` is enough to play.

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
  `offscreenX` (left/right edge test), `playBottom` (sky/ground divide).
  Side-effect free; the testable ones are exposed on `window.__seed`.
- **Canvas + input** — Keyboard state tracking and phase transitions
  (launch / restart).
- **Game state** — A single `state` object rebuilt by `newState()` /
  `startGame()`. Holds the phase, score, the player (including `facing`),
  per-frame `scrollDX` / accumulated `groundScroll`, and entity arrays
  (`bullets`, `enemies`, `particles`, `stars`).
- **Spawning / effects** — Enemies spawn from either edge (each with a travel
  `dir`) on a difficulty ramp, plus particle explosions.
- **Update** — Fixed responsibilities per entity type, driven by delta time so
  motion is frame-rate independent. The player's actual horizontal travel
  (`scrollDX`) drives the background parallax — the world only moves when the
  player does. Bullets and enemies travel signed directions; a ship leaving
  either edge is handled via `offscreenX`.
- **Render** — Draws the movement-driven parallax starfield, rolling ground
  terrain, entities, particle effects, HUD, and the ready / game-over overlays.
  Player and enemy ships are drawn in a mirrored local frame so the nose,
  thruster, and muzzle face the direction of travel. Screen shake is applied as
  a canvas transform during damage.
- **Main loop** — `requestAnimationFrame` loop computing `dt` and calling
  `update` then `render`.

## Game phases

`ready` → `playing` → `gameover`, driven by player input and player hull
reaching zero.
