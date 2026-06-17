# Project Map

This document describes the current structure of the project.

Its purpose is to help future agents quickly understand the architecture, major systems, data flow, and overall organization of the repository.

Keep this document concise.

Update it when your contribution significantly changes the structure of the project.

Describe what currently exists, not what may exist in the future.

---

## Overview

A browser-based, free-flight space combat game set in a twenty-screen patrol
sector. The player pilots a ship through one shared world/camera frame and faces
the direction they fly. The ship flies with momentum — input accelerates it
toward a top speed and it glides to a stop when released — while the camera keeps
it clear of the outer fifth of each side so threats are visible as they close.
Firing launches enemy-seeking
missiles that curve toward the nearest enemy ahead of them, while threats close
in from both edges. Some waves enter as two- or three-orb squadrons from one
edge, sharing speed, drift, a loose vertical formation, and related hues so they
read as a group rather than isolated ships. If every member of a squadron is
killed before any member escapes or rams the player, the game awards a visible
SQUAD CLEAR bonus scaled by the current combo multiplier, making clean formation
wipes a deliberate score play. Each orb flares red just before firing and shoots
its own (deliberately less accurate) seeking missile back.
Those enemy missiles deal a lighter, recoverable hull hit than a ram and are
indiscriminate — once armed, one that strikes another enemy detonates on it, so
the player can bait the two fronts into culling each other. The player's blaster
builds heat while firing and briefly locks out when overheated, with heat shown
in the HUD. The player ship renders with a soft luminous aura, cyan rails,
bright cockpit, and strobing running lights so it remains the visual anchor in
the crossfire; in-canvas text uses a brighter Segoe-style sans-serif stack. The
hull only takes damage from an enemy missile or a ram.
Occasionally a crate parachutes down from the top of the field; a green one
restores hull, while the rarer gold "3X" one grants a timed spread-fire boost
(every shot becomes a fan of homing missiles), with a countdown bar drawn under
the ship. Either must be caught before it sinks past the ground. Stars, terrain,
small ground structures, enemies, crates, missiles, particles, and the player all
use world coordinates and render through the same camera, so horizontal flight
reveals a long world without the old separate parallax motion. A compact SECTOR
readout in the HUD shows the player's position across the 20-screen patrol.
Chaining kills before a short window lapses builds a score-multiplier streak
(shown as a top-center COMBO readout), which baited crossfire kills also feed,
deepening the score chase; squadron-clear bonuses sit on top of that same
multiplier. Procedural Web Audio starts on launch: a soft pad backs the run, a
restrained thruster hum follows movement input, and short cues mark player/enemy
fire, kills, squadron clears, combo climbs, pickups, hull hits, overheat, and
game over. It runs as a single static page with no build step, no dependencies,
and no server requirement — opening `index.html` is enough to play.

## Files

- `index.html` — Page shell. Holds the `<canvas id="game">` (960×540 internal
  resolution) and loads the stylesheet and script.
- `style.css` — Page and canvas presentation. The canvas scales responsively
  while keeping a 16:9 aspect ratio.
- `game.js` — The entire game. Vanilla JavaScript, no modules, no libraries.

## game.js structure

The file is organized top-to-bottom into clear sections:

- **Configuration (`CFG`)** — All tunable gameplay values (world length,
  ground band, camera/despawn margins, terrain structure density, player movement
  / blaster heat, missile, enemy speed/fire cadence/fire telegraph, spawn pacing,
  enemy squadron chance/shape/stagger/timer cost/clear bonus, crate pickups and
  their salvo-vs-health odds, salvo-boost count/spread/duration, kill-streak
  combo window/cap, audio volume mix) in one object. Balance changes live here.
- **Pure helpers** — `clamp`, `rectsOverlap`, `lerp`, `randRange`,
  `offscreenX` (left/right viewport edge test, camera-aware with old screen-space
  defaults), `offscreen` (all-four-edges viewport test for missiles),
  `angleDelta` / `steerAngle` (capped rotation toward a heading, the basis of
  missile turning), `playBottom` (sky/ground divide), `worldWidth`,
  `worldToScreenX`, `groundY`, `playerBoundsX` (the horizontal safe band the
  camera preserves), `cameraForPlayer` (dead-zone camera follow within the long
  sector), `salvoOffsets` (the symmetric angular spread of a 3X salvo),
  `squadronOffsets` (vertical slots for two- and three-orb enemy formations),
  `cycleHue` (advances a hue around the color wheel, the basis of the plasma-orb
  color flashing), `comboMultiplier` (the capped score multiplier for a kill
  streak of N consecutive kills). Side-effect free; the testable ones are exposed
  on `window.__seed`.
- **Canvas + input** — Keyboard state tracking and phase transitions
  (launch / restart).
- **Audio** — A small procedural Web Audio manager, created lazily on the first
  launch/restart keypress so browser autoplay rules are respected. It owns the
  master/effects/music/thrust gains, a calm looping pad, a fading thruster hum,
  and short synthesized tones/noise bursts for player shots, enemy shots, kills,
  squadron clears, combo climbs, health and 3X pickups, hull hits, overheat, and
  game over. No audio files are loaded.
- **Game state** — A single `state` object rebuilt by `newState()` /
  `startGame()`. Holds the phase, score, `cameraX`, the player (including
  world-space `x`, `facing`, velocity, heat, and overheat lockout, plus a
  `salvo` boost timer), the crate `pickupTimer`, the kill-streak fields
  (`combo`, `comboTimer`, `comboFlash`), squadron bookkeeping (`squadrons`), and
  entity/feedback arrays (`missiles`, `enemyMissiles`, `enemies`, `pickups`,
  `particles`, `floaters`, `stars`, `structures`).
- **Spawning / effects** — Enemy waves spawn from either visible camera edge on a
  difficulty ramp. `spawnEnemyWave` usually produces a lone orb but sometimes
  produces a small squadron via `spawnSquadron`: two or three orbs from one side
  with shared speed/drift, staggered entry x positions and fire cooldowns, a
  loose vertical formation from `squadronOffsets`, related hues, and a shared
  `squadron` id, with `state.squadrons` tracking whether the full group survives
  long enough to be cleanly cleared. The next spawn timer pays an extra cost per
  extra orb so groups create a stronger front without flooding the field. Each
  enemy still carries a travel `dir`, a short `fireFlash` timer for shot
  feedback, a per-orb `hue` +
  `hueRate` for its color flashing, and a `trail` of recent world-space centers
  for its light trail; crates
  (`spawnPickup`) drop from the top on an independent timer within the player's
  current camera band, each tagged a `kind` (`health` or the rarer `salvo`, by
  `CFG.pickup.salvoChance`); plus particle explosions.
- **Update** — Fixed responsibilities per entity type, driven by delta time so
  motion is frame-rate independent. The player accelerates under input and
  retains velocity (`player.vx` / `vy`), with drag bleeding it off when input
  stops, a capped top speed, and a world clamp at the far ends of the 20-screen
  sector — hitting a bound zeroes that axis's velocity. `cameraForPlayer` keeps
  the player inside the viewport's safe central band, and all x-positioned
  entities remain in world coordinates. Player missiles carry a heading angle:
  each frame they steer
  toward the nearest enemy *ahead* of them (`nearestSeekTarget`) at a capped turn
  rate, then advance along that heading, and are retired by `offscreen` or a
  short lifetime. Each player shot adds blaster heat; cooling happens every
  playing frame, and a full heat bar locks firing until it vents below the
  release threshold. Enemies travel a signed direction; squadron orbs use the
  same speed and drift so they hold a loose group as they cross the visible
  field. Once fully on-field, each orb returns fire on its own staggered
  cooldown (`enemyFire`); each enemy also decays a short `fireFlash` timer after
  shooting, records its current center into a capped `trail`
  (`CFG.enemy.trailMax`) for its light trail, while the upcoming shot telegraph
  is derived from the remaining cooldown. A ship leaving either edge
  (`offscreenX`) is simply removed — breaches are harmless. Enemy missiles
  re-aim at the player every frame at a lower turn rate (`updateEnemyMissiles`,
  reusing `steerAngle`), so they seek but stay dodgeable; after a short arming
  delay (`CFG.enemyMissile.armTime`) they also detonate on — and score — any
  enemy they strike, so their crossfire can be turned against the swarm. The hull
  only loses health to an enemy missile or a ram, and enemy missile hits are a
  lighter damage event than a collision so the player has room to recover. Every
  enemy removal routes through squadron bookkeeping: scored kills advance a
  group's kill count, while an escape or ram marks that group broken; only killing
  all members before it breaks awards the SQUAD CLEAR bonus and floating text.
  Each shot adds blaster heat,
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
  Floating score text rises and fades from the world position where a squadron
  clear completes. These same event chokepoints trigger the procedural audio
  cues, so sound reflects the existing gameplay state instead of adding parallel
  rules.
- **Render** — Draws the world starfield, procedural ground ridge, small terrain
  structures, and entities by projecting world x positions through
  `worldToScreenX(x, state.cameraX)`. Crates render as a parachute-and-emblem sprite
  — a green cross for health, a gold "3X" for the salvo boost — and a countdown
  bar appears under the ship while boosted. HUD shows score, best, hull, blaster
  heat, a compact SECTOR position bar, and a top-center COMBO multiplier with a
  shrinking chain-window bar while a streak is live; HUD and menu text use the
  shared Segoe-style canvas font and brighter label colors. The player ship is
  drawn in a mirrored local frame so its nose, thruster, and muzzle face the
  direction of travel, with a cyan/gold/green state-aware glow, luminous rails,
  cockpit light, and running-light strobes layered around the same hitbox;
  enemies render as diffuse plasma orbs (a radial-gradient white-hot core and
  halo) that flash through cycling hues (`cycleHue`) and stream a thin, fading
  light trail through their recent `trail` positions — tracing the orb's weaving
  path without dominating it — then add a red charge ring plus an aiming bead as
  their fire cooldown reaches zero; missiles are rotated to their heading so the
  dart and its exhaust point where they fly. Squadron-clear floaters are drawn in
  world space, rising from the final kill. Screen shake is applied as a canvas
  transform during damage.
- **Main loop** — `requestAnimationFrame` loop computing `dt` and calling
  `update` then `render`.

## Game phases

`ready` → `playing` → `gameover`, driven by player input and player hull
reaching zero.
