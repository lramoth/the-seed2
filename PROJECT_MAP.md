# Project Map

This document describes the current structure of the project.

Its purpose is to help future agents quickly understand the architecture, major systems, data flow, and overall organization of the repository.

Keep this document concise.

Update it when your contribution significantly changes the structure of the project.

Describe what currently exists, not what may exist in the future.

---

## Overview

A browser-based, free-flight space combat game. The player pilots a ship across
the field and faces the direction they fly. The ship flies with momentum —
input accelerates it toward a top speed and it glides to a stop when released —
and is held clear of the outer fifth of each side so threats are visible as they
close. Firing launches enemy-seeking
missiles that curve toward the nearest enemy ahead of them, while threats close
in from both edges, flare red just before firing, and fire their own
(deliberately less accurate) seeking missiles back. Those enemy missiles are
indiscriminate — once armed, one that strikes another enemy detonates on it, so
the player can bait the two fronts into culling each other. The player's blaster
builds heat while firing and briefly locks out when overheated, with heat shown
in the HUD. The hull only takes damage from an enemy missile or a ram.
Occasionally a crate parachutes down from the top of the field; a green one
restores hull, while the rarer gold "3X" one grants a timed spread-fire boost
(every shot becomes a fan of homing missiles), with a countdown bar drawn under
the ship. Either must be caught before it sinks past the ground. The starfield
and ground ridge are stable visual references rather than parallax layers, so
background motion no longer reads differently from enemies or crates. Chaining
kills before a short window lapses builds a score-multiplier streak (shown as a
top-center COMBO readout), which baited crossfire kills also feed, deepening the
score chase. It runs as a single static page with no build step, no dependencies,
and no server requirement — opening `index.html` is enough to play.

## Files

- `index.html` — Page shell. Holds the `<canvas id="game">` (960×540 internal
  resolution) and loads the stylesheet and script.
- `style.css` — Page and canvas presentation. The canvas scales responsively
  while keeping a 16:9 aspect ratio.
- `game.js` — The entire game. Vanilla JavaScript, no modules, no libraries.

## game.js structure

The file is organized top-to-bottom into clear sections:

- **Configuration (`CFG`)** — All tunable gameplay values (world/ground band,
  player movement / blaster heat, missile, enemy speed/fire cadence/fire
  telegraph, spawn pacing, crate pickups and their salvo-vs-health odds,
  salvo-boost count/spread/duration, kill-streak combo window/cap) in one object.
  Balance changes live here.
- **Pure helpers** — `clamp`, `rectsOverlap`, `lerp`, `randRange`,
  `offscreenX` (left/right edge test), `offscreen` (all-four-edges test for
  missiles), `angleDelta` / `steerAngle` (capped rotation toward a heading, the
  basis of missile turning), `playBottom` (sky/ground divide), `playerBoundsX`
  (the horizontal range the player may occupy, given the edge buffer),
  `salvoOffsets` (the symmetric angular spread of a 3X salvo), `cycleHue`
  (advances a hue around the color wheel, the basis of the plasma-orb color
  flashing), `comboMultiplier` (the capped score multiplier for a kill streak of
  N consecutive kills). Side-effect free; the testable ones are exposed on
  `window.__seed`.
- **Canvas + input** — Keyboard state tracking and phase transitions
  (launch / restart).
- **Game state** — A single `state` object rebuilt by `newState()` /
  `startGame()`. Holds the phase, score, the player (including `facing`, velocity, heat,
  and overheat lockout, plus a `salvo` boost timer), the crate `pickupTimer`,
  the kill-streak fields (`combo`, `comboTimer`, `comboFlash`), and entity arrays
  (`missiles`, `enemyMissiles`, `enemies`, `pickups`,
  `particles`, `stars`).
- **Spawning / effects** — Enemies spawn from either edge (each with a travel
  `dir`, a randomized fire cooldown, a short `fireFlash` timer for shot
  feedback, and a per-orb `hue` + `hueRate` for its color flashing) on a
  difficulty ramp; crates
  (`spawnPickup`) drop from the top on an independent timer within the player's
  horizontal band, each tagged a `kind` (`health` or the rarer `salvo`, by
  `CFG.pickup.salvoChance`); plus particle explosions.
- **Update** — Fixed responsibilities per entity type, driven by delta time so
  motion is frame-rate independent. The player accelerates under input and
  retains velocity (`player.vx` / `vy`), with drag bleeding it off when input
  stops, a capped top speed, and a horizontal clamp (`playerBoundsX`) that keeps
  the ship out of the outer edge buffer — hitting a bound zeroes that axis's
  velocity. Background stars and the ground ridge stay fixed, so the combat
  field has one readable screen frame instead of multiple apparent movement
  layers. Player missiles carry a heading angle: each frame they steer
  toward the nearest enemy *ahead* of them (`nearestSeekTarget`) at a capped turn
  rate, then advance along that heading, and are retired by `offscreen` or a
  short lifetime. Each player shot adds blaster heat; cooling happens every
  playing frame, and a full heat bar locks firing until it vents below the
  release threshold. Enemies travel a signed direction and, once fully on-field,
  return fire on a per-ship cooldown (`enemyFire`); each enemy also decays a
  short `fireFlash` timer after shooting, while the upcoming shot telegraph is
  derived from the remaining cooldown. A ship leaving either edge (`offscreenX`)
  is simply removed — breaches are harmless. Enemy missiles
  re-aim at the player every frame at a lower turn rate (`updateEnemyMissiles`,
  reusing `steerAngle`), so they seek but stay dodgeable; after a short arming
  delay (`CFG.enemyMissile.armTime`) they also detonate on — and score — any
  enemy they strike, so their crossfire can be turned against the swarm. The hull
  only loses health to an enemy missile or a ram. Each shot adds blaster heat,
  and while the `salvo` boost timer is active `fire` launches a symmetric spread
  of missiles (angles from `salvoOffsets`) for one trigger pull's heat instead of
  one missile; the timer decays each playing frame. Crates (`updatePickups`)
  parachute down on their own timer, swaying as they fall; flying into a `health`
  crate restores hull (capped at `maxHull`) while a `salvo` crate (re)starts the
  boost window, and a crate that sinks past the ground is lost. Every scored kill
  — by player missile or baited crossfire — routes through `scoreKill`, which
  advances the kill streak and awards `CFG.enemy.score × comboMultiplier`;
  `updateCombo` resets the streak when the chain window (`CFG.combo.window`)
  lapses without a kill (a ram is not a scored kill and does not feed it).
- **Render** — Draws the stable starfield, fixed ground ridge, entities
  (including crates drawn as a parachute-and-emblem sprite —
  a green cross for health, a gold "3X" for the salvo boost — and a countdown bar
  under the ship while boosted), particle effects, HUD (score, best, hull,
  blaster heat, and a top-center COMBO multiplier with a shrinking chain-window
  bar while a streak is live), and the ready / game-over overlays. The player ship is drawn in
  a mirrored local frame so its nose, thruster, and muzzle face the direction of
  travel; enemies render as diffuse plasma orbs (a radial-gradient white-hot core
  and halo) that flash through cycling hues (`cycleHue`) and stream a tapering,
  fading comet tail opposite their travel, then add a red charge ring plus an
  aiming bead as their fire cooldown reaches zero; missiles are rotated to
  their heading so the dart and its exhaust point where they fly. Screen shake is
  applied as a canvas transform during damage.
- **Main loop** — `requestAnimationFrame` loop computing `dt` and calling
  `update` then `render`.

## Game phases

`ready` → `playing` → `gameover`, driven by player input and player hull
reaching zero.
