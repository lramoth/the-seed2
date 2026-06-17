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

## Generation 3

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-3-1781653195)

Intent:
Give the player the weapon DIRECTOR.md asks for — "enemy seeking missiles" —
without softening the decision that makes Generation 2 work. Gen 2's core
moment is "which front do I face?": you can only fire one way at a time, so each
run is about reading both edges and pivoting to the more urgent threat. Straight
bullets made that decision *and* demanded pixel-perfect vertical alignment
against enemies that drift, so clean shots often whiffed. The highest-value
mutation is to keep the facing decision and remove the busywork.

Mutation:
Replaced straight bullets with homing missiles — one coherent idea, no new
external subsystems:

- Missiles carry a heading `angle` instead of a fixed `vx`. Each frame a missile
  finds the nearest enemy *ahead of its current heading* (`nearestSeekTarget`,
  forward-hemisphere only) and rotates toward it at a capped turn rate
  (`CFG.missile.turnRate`) via the new pure helpers `angleDelta` / `steerAngle`,
  then advances along that heading.
- The forward-only lock plus the capped turn rate are deliberate: a missile
  fired right cannot wheel around onto a threat behind it, so facing still
  decides which front you can actually hit. The homing only forgives an enemy's
  *vertical* drift, not the player's *horizontal* choice.
- Missiles retire on a short lifetime (`CFG.missile.life`) or by leaving any edge
  (new all-four-edges `offscreen` helper, since a curving missile can exit top or
  bottom — enemies still use the left/right-only `offscreenX`).
- Rendering: missiles are drawn as a glowing dart rotated to their heading with a
  trailing exhaust plume, so their curve reads clearly.
- `bullet`/`bullets` renamed to `missile`/`missiles` throughout so the code's
  names match the behavior. Ready-screen copy and README/PROJECT_MAP updated.
  Enemy fire, plasma-orb visuals, momentum, powerups, and audio were left for
  separate generations to keep this a single idea.

Rationale:
This implements a named Director request while *reinforcing* the accepted
lineage instead of fighting it. Combat feels more satisfying — a missile curving
into a drifting orb is its own reward — and the "satisfying combat" /
"responsiveness" pressures are served without auto-aim trivializing the game:
wrong-facing still lets enemies breach, and the lower missile speed lets far
crossers escape. It is deliberately one mechanic, all tunable from `CFG`.

Tests / Verification:
- New pure helpers exposed on `window.__seed` and asserted in-browser:
  `offscreen` (all four edges true, interior false), `angleDelta` (small and
  PI-wrapping cases), `steerAngle` (caps a large step to ±maxStep, snaps when
  within range) — all passed.
- Deterministic synchronous simulation (single eval, so the live rAF loop could
  not interleave): firing right launched exactly one missile at angle 0; against
  an enemy 95px above the launch line the missile curved up and destroyed it
  (score +100); firing right at an enemy positioned behind-left scored 0 and the
  missile flew off the right edge — confirming facing is preserved.
- Live run with autofire and staggered enemies: missiles fired continuously,
  homed, and scored (observed SCORE 000600) with no console errors. Screenshot
  captured missiles in flight leaving the player's nose.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Establishes the player's weapon identity as a guided missile and proves homing
can coexist with — and sharpen — the two-front facing decision. The angle-based
missile and the `angleDelta`/`steerAngle` helpers are reusable substrate for
future steering behavior (enemy missiles, telegraphed attacks, alternate
weapons).

Future Work Enabled:
- Enemies that shoot back (now that a steering primitive exists for projectiles)
- Plasma-orb enemy visuals with vibrant flashing tails — the deferred Director note
- Power-ups (e.g. multi-missile salvos) and a powerup duration bar
- Movement feel: edge buffer and momentum
- Audio (blaster, kills, thrusters, game-over, music)
- Tuning missile turn rate / speed / fire rate against spawn pacing via `CFG`

## Generation 4

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-4-1781654882)

Intent:
Make the enemies a threat in their own right and fix the damage model the
Director flagged first. DIRECTOR.md's opening playtesting note is "No hull
damage should occur unless the user collides with an enemy or is hit by an enemy
weapon," yet through Generation 3 an enemy slipping off either edge (a "breach")
drained the hull — pure positional punishment. The very next Director note asks
for enemies that "shoot seeking missiles at the player but less accurately," and
Generation 3's own log lists "enemies that shoot back" as its first enabled
future-work item now that a projectile steering primitive exists. These are the
same subsystem — *how enemies threaten the player* — so the highest-value
mutation is to relocate the threat from position to weapons.

Mutation:
Enemies now return fire, and the damage model becomes weapon-and-collision only
— one coherent change to what hurts the player, reusing the existing steering
helpers rather than adding a new subsystem:

- Each enemy carries a randomized `fireCooldown`. Once it is fully on-field (not
  still entering an edge) the cooldown elapses and `enemyFire` launches a seeking
  missile from the enemy's center, aimed at the player's current position. The
  initial cooldown is randomized too, so freshly spawned ships neither fire in
  unison nor snipe the instant they appear.
- A new `enemyMissiles` array is updated by `updateEnemyMissiles`, which re-aims
  each missile at the player every frame via the existing `steerAngle` /
  `angleDelta` helpers — but at a deliberately lower turn rate and speed than the
  player's (`CFG.enemyMissile`: turn ≈ half, speed 300 vs 640). The seek is real
  but carves wide arcs the player can out-fly and juke — the "less accurate"
  return fire the Director asked for. Missiles retire on lifetime or by leaving
  any edge (`offscreen`).
- Breaches are now harmless: an enemy leaving either edge (`offscreenX`) is
  simply removed with no hull cost. The hull only loses health to an enemy
  missile (`CFG.enemyMissile.damage`) or a ram (`CFG.enemy.collideDamage`), which
  is exactly the Director's stated rule. `CFG.enemy.breachDamage` is removed.
- Rendering: the player's missile dart was extracted into a shared
  `drawMissileSprite`; player missiles glow gold, enemy missiles burn red, so
  incoming fire reads at a glance against your own. Ready-screen copy, README,
  and PROJECT_MAP updated. Plasma-orb visuals, power-ups, momentum/edge-buffer,
  and audio were left for separate generations to keep this a single idea.

Rationale:
This implements two named Director notes at once while *reinforcing* the
accepted lineage instead of fighting it. It keeps Generation 2/3's core decision
— "which front do I face?" — and sharpens it: you now face the side that is
actively shooting at you, and a wrong facing means eating missiles rather than
merely conceding a harmless breach. Removing breach damage is a change to
accepted Gen-2 behavior, justified because (a) it is the Director's first
explicit playtesting request, and (b) adding enemy fire supplies the replacement
threat, so the run stays tense without the positional punishment the Director
rejected. The enemy weapon is strictly worse than the player's, preserving the
guided-missile weapon identity established in Generation 3. All new values live
in `CFG`.

Tests / Verification:
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all passed:
  - An on-field enemy with cooldown 0 fired exactly one missile, aimed into the
    correct quadrant toward the player (player placed below-right → angle in
    (0, PI/2)), at speed 300.
  - An enemy missile overlapping the player dealt exactly `CFG.enemyMissile.damage`
    (hull 100 → 86) and was consumed.
  - An enemy slipping off the right edge left the hull at 100 and despawned —
    breaches are harmless.
  - Regression: a player missile overlapping an enemy still destroyed it
    (+100 score) and was consumed.
  - Fire gate: an enemy still entering from the left edge (x < 0) held fire,
    while a fully on-field enemy fired.
  - Config sanity: `enemyMissile.turnRate < missile.turnRate`,
    `enemyMissile.speed < missile.speed`, and `enemy.breachDamage` is gone.
- `node --check game.js` passed; no browser console errors during play.
- Visual confirmation: a staged frame showed the player firing gold seeking
  missiles while four red enemy missiles homed in from multiple angles and the
  hull bar reflected incoming damage — the two missile types clearly
  distinguishable.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Resolves the damage-model conflict at the top of DIRECTOR.md and turns the fight
into a genuine duel of weapons: enemies are now dangerous because they shoot, not
because they exist near an edge. The `enemyMissiles` array and the per-ship fire
cooldown are reusable substrate for telegraphed or varied enemy attacks, and the
shared `drawMissileSprite` makes new projectile types cheap to render.

Future Work Enabled:
- Plasma-orb enemy visuals with vibrant flashing tails — the deferred Director note
- Power-ups (e.g. multi-missile salvos) and a powerup duration bar
- Movement feel: edge buffer and momentum
- Audio (blaster, enemy fire, kills, thrusters, game-over, music)
- Enemy variety: telegraphed shots, burst fire, or aimed-vs-lead firing
- Tuning enemy fire rate / missile speed / turn rate against spawn pacing via `CFG`

## Generation 5

Agent: Codex (GPT-5)

Date: 2026-06-16

Commit / PR: (branch gen-5-1781656390)

Intent:
Add a small firing decision to the current weapon loop. Generation 4 made the
fight a duel of seeking missiles, but the player could still hold Space forever.
DIRECTOR.md explicitly asks for player blaster overheat and a HUD indicator, and
that request fits the existing two-front combat without adding a new subsystem.

Mutation:
Added blaster heat management:

- Each player missile adds heat to the blaster.
- Heat cools continuously while playing.
- Filling the heat bar overheats the blaster, preventing shots until it vents
  below a release threshold.
- The HUD now shows a second bar under HULL: HEAT during normal firing, VENTING
  in red while locked out.
- Ready-screen copy, README, and PROJECT_MAP were updated to describe the heat
  behavior. Run instructions are unchanged: open `index.html` directly, or serve
  the folder and visit it in a browser.

Rationale:
This makes the current missile loop more interesting with one readable question:
do you hold fire for a fast clear now, or feather bursts so the weapon stays
online when enemy missiles arrive? It supports the Director's desire for an
overheat feature while preserving the accepted Generation 2-4 decisions: facing
still chooses the front, homing still forgives vertical drift, and enemies are
still dangerous because they shoot back. The values live in `CFG.player`, so the
pressure can be tuned without changing the structure.

Tests / Verification:
- `node --check game.js` passed.
- Loaded the game through a local static server at `http://127.0.0.1:8765/`;
  confirmed the 960x540 canvas loads and the browser console has no errors.
- Live canvas check confirmed the new HEAT / VENTING HUD bar renders alongside
  HULL during play.
- Deterministic runtime simulation with a stubbed canvas passed:
  - Holding Space overheated the blaster after 211 frames / 22 shots.
  - While overheated, 30 more frames of held Space fired no additional shots.
  - After venting for 80 frames, the blaster rearmed below the configured release
    threshold.
  - A rearmed blaster fired again and added heat.

Effect on Project Direction:
Adds a lightweight resource-management pressure directly to moment-to-moment
combat. The player now has a reason to burst fire, pause, and time shots around
enemy missile pressure, which makes the existing weapon duel more expressive
without introducing menus, ammo pickups, or hidden rules.

Future Work Enabled:
- Heat tuning against spawn rate and enemy missile pressure
- Powerups that temporarily widen heat capacity, improve cooling, or fire
  multi-missile salvos
- Audio / visual feedback for near-overheat, venting, and rearm moments
- Enemy or hazard variants that pressure the player into deliberate burst timing

## Generation 6

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-6-1781657772)

Intent:
Make enemy fire indiscriminate, implementing the Director's playtesting note
"Enemy missiles should be able to kill other enemies." Through Generation 5 the
enemies' seeking missiles only ever threatened the player. This note is the
first unaddressed item the existing systems already support — Generation 4 built
the `enemyMissiles` array and per-frame collision, so the highest-value mutation
is to let that same fire also strike enemies, turning the lineage's signature
two-front geometry into something the player can exploit instead of only endure.

Mutation:
Enemy missiles now detonate on enemies as well as the player — one coherent
change to who their fire hurts, reusing the existing update path with no new
subsystem:

- After a short arming delay (`CFG.enemyMissile.armTime`, 0.18s), an enemy
  missile that overlaps any enemy destroys that enemy, scores like a normal kill,
  and is consumed. The arming delay is the only new field; it exists so a
  freshly-launched missile cannot detonate on its own launcher or a neighbor at
  the muzzle. It does not delay damage to the player.
- An intervening enemy is checked before the player, so a ship caught between the
  missile and the player soaks the shot — enemies can body-block their own fire.
- The seek itself is unchanged: enemy missiles still home only on the player at
  their deliberately lazy turn rate. Crossfire is therefore incidental unless the
  player baits it by positioning, which keeps it from trivializing the fight.
- The crossfire kill bursts in the enemy-missile red palette (`#ff5a6e`) instead
  of the gold of a player kill, so the cause of the explosion reads at a glance.
- A ready-screen line, the README "The Game" narrative, and PROJECT_MAP were
  updated to describe the indiscriminate fire. Plasma-orb enemy visuals,
  power-ups, momentum/edge-buffer, and audio were left for separate generations
  to keep this a single idea.

Rationale:
This implements a named Director note while *reinforcing* the accepted lineage
rather than fighting it. Generations 2–4 made "which front do I face?" the core
decision; crossfire adds a second axis to it — the enemies' positions relative to
*each other* now matter, because you can slip aside and feed one front's shot
into the other. It is purely additive (no control or damage-model change for the
player), so it carries little risk of making the game feel worse, and surviving
in the line of fire to set up a bait is its own cost. Scoring the kill makes the
crossfire a play the player pursues — an "interesting decision," per the
Director's optimization targets — rather than a neutral curiosity. All new
behavior is one tunable value in `CFG`.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play.
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all passed:
  - An armed enemy missile overlapping an enemy destroyed it, added exactly
    `CFG.enemy.score` (100), was consumed, and left the player's hull untouched.
  - Arming gate: an enemy missile still within its `armTime` overlapping an enemy
    did NOT destroy it (enemy alive, no score), confirming the muzzle-safety gate.
  - Regression: an armed enemy missile overlapping the player still dealt exactly
    `CFG.enemyMissile.damage` (14) and was consumed.
  - Ordering: a missile overlapping both an enemy and the player detonated on the
    enemy and left the player unharmed — an interposing ship shields the player.
  - Config sanity: `CFG.enemyMissile.armTime` is a positive number (0.18).
- Visual confirmation: a staged, frozen frame showed the player firing gold
  missiles right while a red enemy missile fragged a right-front enemy — the
  crossfire burst rendering in enemy-red, clearly distinct from a gold player
  kill — with the score reflecting the +100.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Turns the two-front swarm from a pure threat into a system the player can
manipulate, deepening the established facing decision without adding controls,
menus, or hidden rules. Enemy missiles are now a field hazard to every ship,
which is reusable substrate for denser formations, enemy variety, or hazards that
lean on friendly fire.

Future Work Enabled:
- Plasma-orb enemy visuals with vibrant flashing tails — the deferred Director note
- Power-ups (health pickups; multi-missile salvos) and a duration bar
- Movement feel: edge buffer and momentum
- Audio (blaster, enemy fire, kills, thrusters, game-over, music)
- Tuning `armTime` and spawn density so crossfire is a frequent-enough reward

## Generation 7

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-7-1781667843)

Intent:
Give the ship the *feel* the Director's top playtesting notes ask for. DIRECTOR.md's
first three priority-ordered notes are all about how the ship moves: a ~20% buffer
from each edge "so that the user can see enemies quickly," and "allow momentum in
the user's movements." Every generation since Gen 3 has listed "movement feel:
edge buffer and momentum" as enabled-but-unaddressed future work. Through
Generation 6 the ship moved with instantaneous velocity (position set directly
from input) and could slide flush to either screen edge. These two notes are one
coherent idea — the flight model — so the highest-value mutation is to make the
ship fly with weight and hold it clear of the edges.

Mutation:
Reworked player movement into momentum-based flight with a symmetric edge buffer
— one coherent change to how the ship moves, reusing the existing update path and
parallax with no new subsystem:

- The player now carries velocity (`player.vx` / `vy`). Input applies
  acceleration (`CFG.player.accel`) toward a capped top speed
  (`CFG.player.maxSpeed`); with no input, drag (`CFG.player.drag`, applied
  frame-rate-independently as `Math.pow(drag, dt)`) bleeds velocity off so the
  ship glides to a stop. The speed cap is applied to the combined vector, so
  diagonals are not faster. `CFG.player.speed` is replaced by these values.
- The ship is held a `CFG.player.edgeBuffer` (0.2) fraction of the field away
  from each side via the new pure helper `playerBoundsX`. Hitting a horizontal
  bound zeroes `vx` so built-up momentum does not pin the ship to the wall; the
  vertical clamp (sky above the ground band) zeroes `vy` the same way.
- Facing still follows steering *input*, not velocity, so you can brake or fire
  the way you came while still drifting — responsiveness is preserved.
- The world-moves-when-you-move parallax is unchanged: it reads `scrollDX` (the
  ship's actual travel this frame), which momentum now produces naturally.
- Header comment, README ("The Game", Controls, Current State), and PROJECT_MAP
  updated. Plasma-orb visuals, power-ups, fonts, and audio were left for separate
  generations to keep this a single idea.

Rationale:
This implements the Director's three highest-priority notes at once while
*reinforcing* the accepted lineage rather than fighting it. Momentum makes the
core two-front dodge — "which front do I face, and can I get out of the way?" —
more expressive: you must lead your turns and respect inertia, which rewards
mastery without adding rules, menus, or hidden state. The edge buffer is a
deliberate, Director-requested refinement of Gen 2's removal of the old left-side
clamp: rather than re-pinning the player, it keeps a symmetric central band so
both fronts stay visible, which is exactly the reason the Director gave. All new
behavior is tunable from `CFG.player`, so the feel can be dialed in without
structural change.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play.
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all passed:
  - `playerBoundsX(960, 46, 0.2)` returned `{lo: 192, hi: 722}`.
  - Holding right for 0.3s accelerated `vx` to exactly the cap (360) and no
    higher; facing was +1.
  - On release, velocity decayed from 360 to 179.2 over ~one configured
    half-life (~0.216s) and to ~0.29 after a long glide — confirming inertia.
  - Shoving right into the wall clamped `x` to 722 (the right bound) with `vx`
    zeroed; shoving left clamped `x` to 192 (the left bound) with `vx` zeroed and
    facing -1 — momentum does not pin the ship to an edge.
- Visual confirmation: a staged, frozen frame rendered the player ship (with
  thruster) mid-field, gold missiles in flight, enemies entering from both edges
  at different heights, and red enemy missiles — HUD intact, no rendering
  regressions.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Resolves the movement-feel pressure at the top of DIRECTOR.md and makes the ship
feel like a piloted craft with weight rather than a cursor. The velocity model
(`vx` / `vy` with accel + drag) and the `playerBoundsX` helper are reusable
substrate for future feel work — thruster-strength power-ups, knockback from
impacts, or hazards that push the ship.

Future Work Enabled:
- Plasma-orb enemy visuals with vibrant flashing tails — the deferred Director note
- Power-ups (health pickups; multi-missile salvos) and a duration bar, with
  parachute-drop crates
- Convert fonts to sans-serif and brighten the HUD — the deferred Director notes
- Audio (blaster, enemy fire, kills, thrusters, game-over, music)
- Tuning accel / drag / top speed / edge buffer against spawn pacing via `CFG`

## Generation 8

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-8-1781668654)

Intent:
Give the player something positive to chase, implementing the Director's
highest-priority unaddressed gameplay note. DIRECTOR.md asks for "occasional
health powerups which increase the player's health stat" and, separately, that
powerups arrive as "boxes which float from above with parachutes that float down
slowly so I can run into" them. Through Generation 7 every object on the field
was a threat and the hull only ever decreased — there was no way to recover and
no reason to move *toward* anything. These two Director notes are the same idea
(a parachuted pickup) and every generation since Gen 6 has listed health
pickups with parachute crates as enabled-but-unaddressed future work, so the
highest-value mutation is to add the first friendly object: a health crate that
parachutes in.

Mutation:
Added health crates that parachute down and restore hull — one coherent new
subsystem (`pickups`), reusing the existing collision (`rectsOverlap`), the
player bounds helper (`playerBoundsX`), and the explosion effect:

- A crate enters from the top on its own independent timer
  (`CFG.pickup.intervalMin`/`intervalMax`, randomized so the first is staggered),
  spawning within the player's horizontal band so it is always reachable.
- It descends slowly (`CFG.pickup.fallSpeed`) and sways side to side
  (`swayAmp` / `swaySpeed`) around its spawn column, selling the parachute drift.
- Flying into a crate restores `CFG.pickup.heal` hull, capped at `maxHull`, and
  triggers a green ship/burst flash (`player.heal`) so the rescue reads clearly.
  A crate that sinks past the ground (`playBottom`) without being caught is lost.
- Rendering: `drawPickups` draws a green parachute canopy with suspension lines
  down to a boxed, glowing health cross — the one green (friendly) object on a
  field of red/gold weapons fire, so it is unmistakable.
- Header comment, ready-screen copy, README ("The Game", Current State), and
  PROJECT_MAP updated. Plasma-orb visuals, multi-missile salvos, fonts, and audio
  were left for separate generations to keep this a single idea.

Rationale:
This implements two named Director notes at once while *reinforcing* the
accepted lineage rather than fighting it. Generations 2–7 made movement and
facing the core decisions; the crate adds a new spatial decision on the same
axis — do you break your favourable dodging position and cross the two-front
crossfire to grab health, especially when you are hurt? It is purely additive
(no control, weapon, or damage-model change) so it carries little risk of making
the game feel worse, and the heal cap plus the "catch it before it lands" window
keep it from trivializing the run. The momentum model from Gen 7 makes the
detour cost real: you must lead your turn toward the falling crate and respect
your inertia getting back. All new behavior is tunable from `CFG.pickup`.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play.
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all passed:
  - A crate overlapping a hurt player (hull 50) healed to exactly 84
    (50 + `CFG.pickup.heal` 34), was consumed, and set the green heal flash.
  - Heal is capped: a crate caught at hull 90 topped out at exactly 100, not 124.
  - A crate placed below the ground line (`playBottom`) was removed with no heal —
    a missed crate is lost.
  - A crate above the player fell `fallSpeed × dt` (7px in 0.1s), swayed off its
    base column, stayed alive, and did not heal.
  - The spawn timer firing produced exactly one crate, within `playerBoundsX`,
    starting above the top edge, and reset the timer to a positive interval.
- Visual confirmation: a staged, frozen frame showed two health crates
  parachuting down (green canopy, suspension lines, glowing cross) clearly
  distinct from the red enemies and gold/red weapon fire, with the player ship,
  missiles, HUD, and ground all intact — no rendering regressions.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Adds the first friendly object and the first way to *recover* hull, turning the
fight from pure attrition into a push-your-luck decision about when to leave
cover for a resource. The `pickups` array, the independent pickup timer, and the
parachute-crate sprite are reusable substrate for the Director's other requested
crate (multi-missile salvos with a duration bar) and for any future floating
pickup.

Future Work Enabled:
- Multi-missile salvo power-up delivered by the same parachute crate, with the
  duration bar the Director described — now that the crate subsystem exists
- Plasma-orb enemy visuals with vibrant flashing tails — the deferred Director note
- Convert fonts to sans-serif and brighten the HUD — the deferred Director notes
- Audio (blaster, enemy fire, kills, thrusters, game-over, music)
- Tuning crate drop rate / heal amount / fall speed against spawn pacing via `CFG`

## Generation 9

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-9-1781669814)

Intent:
Give the player the offensive power-up the Director asks for and turn the Gen 8
crate into a real choice between two rewards. DIRECTOR.md asks for "shooting
boosts that allow the player to shoot multiple missiles at a time for a limited
time" that "can drop from parachutes like health does. Example: 3X. Show a
progress bar below the user's ship to show how long the shooter boost exists."
Generation 8 built the parachute-crate subsystem and listed this exact item —
"Multi-missile salvo power-up delivered by the same parachute crate, with the
duration bar the Director described" — as its first enabled-but-unaddressed
future work. Through Generation 8 every crate was a health crate and the only
reason to chase one was to recover; there was no positive offensive objective.
The highest-value mutation is to add the boost crate on top of the existing
subsystem.

Mutation:
Crates now come in two kinds and a gold "3X" crate grants timed spread fire —
one coherent change reusing the Gen 8 pickup subsystem, the collision path, and
the player-bounds helper, with no new array or update loop:

- `spawnPickup` tags each crate with a `kind`: `health` (the existing hull
  patch) or the rarer `salvo`, chosen by `CFG.pickup.salvoChance`. Both fall,
  sway, and are caught/lost exactly as before.
- Catching a `salvo` crate sets `player.salvo` to `CFG.salvo.duration`; the
  timer decays each playing frame in `updatePlayer`. While it is positive,
  `fire` launches a symmetric spread of `CFG.salvo.count` homing missiles
  (angles from the new pure helper `salvoOffsets`, `CFG.salvo.spread` apart)
  instead of one. Each missile still homes independently, so the boost widens
  the front you cover rather than stacking fire on a single target — it
  reinforces the lineage's "homing forgives vertical drift" identity. Heat is
  charged per trigger pull, not per missile, so the boost reads as a clean
  reward.
- Feedback: the boosted ship is tinted gold for the whole window, a gold
  countdown bar is drawn directly under the ship (`drawSalvoBar`, in world space
  so it tracks the ship — exactly the Director's "progress bar below the user's
  ship"), and the salvo crate wears a gold canopy and a "3X" emblem so it reads
  at a glance against the green health crate and the red enemy fire.
- New pure helper `salvoOffsets` exposed on `window.__seed`. Header comment,
  ready-screen copy, README, and PROJECT_MAP updated. Plasma-orb visuals, the
  UAP ship redesign, sans-serif fonts, and audio were left for separate
  generations to keep this a single idea.

Rationale:
This implements a named Director note while *reinforcing* the accepted lineage
rather than fighting it. Generation 8 made the crate a push-your-luck detour
("do I cross the crossfire to recover?"); Gen 9 deepens that same decision by
making the crate a *choice of reward* — break formation for hull when hurt, or
for offense when you can capitalize — and adds a follow-on decision once boosted:
press the advantage before the bar empties. It is almost purely additive (no
control or damage-model change), so it carries little risk of making the game
feel worse, and the boost is self-limiting: the crate is rare, the window short,
and reaching it still costs you your favourable position under the Gen 7 momentum
model. All new behavior is tunable from `CFG.salvo` and `CFG.pickup.salvoChance`.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play.
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all 14 assertions passed:
  - `salvoOffsets(3, 0.16)` returned `[-0.16, 0, 0.16]`; `salvoOffsets(1, …)`
    returned `[0]`.
  - With no boost, `fire` launched exactly one missile at angle 0.
  - With the boost active, `fire` launched exactly `CFG.salvo.count` (3) missiles
    at the symmetric spread `[-0.16, 0, 0.16]`, and facing left the same spread
    landed around PI — the spread reads the same fired either way.
  - A salvo burst added exactly one `heatPerShot` increment (heat per trigger
    pull, not per missile).
  - A `salvo` crate overlapping the player set `player.salvo` to the full
    duration, did NOT change hull, and was consumed; a `health` crate still
    healed (hull 50 → 84).
  - The boost timer decayed by dt in `updatePlayer` (1.0 → 0.9 over 0.1s).
  - `spawnPickup` assigned a valid `kind`.
- Visual confirmation: a staged, frozen frame showed a green health crate and a
  gold "3X" crate parachuting, the gold-tinted boosted ship firing a gold spread
  with its gold countdown bar underneath, and red enemies/fire on both fronts —
  the two crate kinds clearly distinct, no rendering regressions.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Adds the first offensive power-up and turns the crate from a single recovery
option into a meaningful choice of reward, giving the player a positive objective
to chase and a short window of mastery to exploit. The `kind`-tagged pickup, the
`player.salvo` timed-boost pattern, the under-ship duration bar, and the
`salvoOffsets` helper are reusable substrate for further boosts (wider heat
capacity, faster cooling, shields) and for the multi-fire weapon variety the
Director may want next.

Future Work Enabled:
- More boost crate kinds reusing the same `kind` + timed-boost pattern (shield,
  rapid cooling, overcharge)
- Plasma-orb enemy visuals with vibrant flashing tails — the deferred Director note
- Redesign the ship as an alien UAP with strobing lights — the deferred Director note
- Convert fonts to sans-serif and brighten the HUD — the deferred Director notes
- Audio (blaster, enemy fire, kills, thrusters, game-over, music)
- Tuning salvo count / spread / duration and `salvoChance` against spawn pacing
  via `CFG`

## Generation 10

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-10-1781671830)

Intent:
Give the enemies the look the Director has asked for since the beginning.
DIRECTOR.md lists, high in its priority order, "Enemies should be bright diffuse
plasma orbs (appear comet like) with plasma tails which are vibrant and flash
different colors." Every generation since Gen 3 has carried "plasma-orb enemy
visuals with vibrant flashing tails" as enabled-but-unaddressed future work, so
it is the oldest standing Director note. Through Generation 9 the enemies were
flat red triangular ships — functional but visually generic, and their only
heading cue was a mirrored nose. The remaining notes ranked above it are either
already satisfied (enemies move both directions) or a large spatial rewrite (a
circular 4–5-screen world) that would fight the accepted two-front / edge-buffer
design, so the highest-value *small, coherent* mutation is the plasma-orb look.

Mutation:
Replaced the triangular enemy sprite with a bright, diffuse plasma orb that
flashes through vivid colors and streams a comet tail — one coherent change
confined to enemy spawn data and `drawEnemies`, with no gameplay-logic change:

- Each enemy gains a `hue` (random starting color) and a `hueRate` (its own
  cycle speed, from `CFG.enemy.hueRateMin`/`hueRateMax`). A new pure helper
  `cycleHue(base, t, speed)` advances the hue around the color wheel, wrapped
  into [0, 360); the per-orb base + rate keep the swarm flashing out of sync
  rather than pulsing in unison.
- `drawEnemies` now renders, per orb: a tapering, fading **comet tail** of
  layered translucent radial puffs pointing opposite the travel direction (with
  a soft vertical lean from the existing drift `phase`, so it whips as the orb
  weaves), a **diffuse halo**, and a **white-hot core** that bleeds into the
  flashing hue. All colors are HSL driven by `cycleHue`.
- The hitbox (`e.w` × `e.h`) and every gameplay rule are untouched: spawning,
  movement, drift, ramming, missile kills, return fire, and indiscriminate
  crossfire all behave exactly as in Gen 9. Explosion-burst colors are also
  unchanged, preserving the Gen 6 "cause reads by color" feedback (gold = player
  kill, red = crossfire).
- Header comment, README ("Current State", "The Game"), and PROJECT_MAP
  (pure-helpers list, spawning, render) updated. The UAP ship redesign,
  on-terrain structures, sans-serif/brighter fonts, and audio were left for
  separate generations to keep this a single idea.

Rationale:
This implements the Director's oldest-standing named note while *reinforcing*
the accepted lineage rather than fighting it. It is almost purely cosmetic, so
it carries little risk of making the game feel worse, yet it is more than polish:
the comet tail points opposite each orb's heading, so a glance now reads which
way every threat is crossing — directly serving the lineage's core "which front
do I face?" decision (Gens 2–4) and the Director's "clear player feedback" /
"satisfying combat" targets. Distinct, vivid, out-of-sync colors also make the
orbs pop against the dark field and the red/gold weapon fire, improving combat
legibility. All new behavior is tunable from `CFG.enemy`, and the one new helper
is pure and tested.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play.
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all passed:
  - `cycleHue`: (0,0,100)→0, (10,1,100)→110, (350,1,100)→90 (wrap), (0,1,400)→40
    (wrap), (0,-1,100)→260 (negative wrap), (360,0,0)→0; every result in [0,360).
  - `spawnEnemy` assigned a `hue` in [0,360) and a `hueRate` within
    `CFG.enemy.hueRateMin`/`hueRateMax`.
  - `drawEnemies` rendered staged orbs traveling both directions without
    throwing.
  - Regression: a player missile overlapping a staged enemy still destroyed it
    (enemy removed) and scored exactly `CFG.enemy.score` (+100) — gameplay logic
    is unchanged.
- Visual confirmation: a staged, frozen frame showed five plasma orbs in
  distinct vivid colors (blue, purple, pink, green, gold), each trailing a
  tapering comet tail pointing opposite its travel direction, with the player
  ship, gold/red missiles, green health crate, gold "3X" crate, HUD, starfield,
  and ground all intact — no rendering regressions.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Resolves the lineage's longest-deferred Director note and gives the enemies a
strong visual identity that also improves heading legibility. The per-entity
`hue`/`hueRate` color-cycling pattern and the `cycleHue` helper are reusable
substrate for further "vibrant, flashing" feedback the Director favors — e.g.
the requested UAP ship's strobing lights, color-coded enemy variants, or pulsing
hazards.

Future Work Enabled:
- Redesign the ship as an alien UAP with strobing lights — the deferred Director
  note (now with a hue-cycling pattern to reuse)
- Color- or behavior-varied enemy types built on the same orb sprite
- Build random small structures on the terrain — the deferred Director note
- Convert fonts to sans-serif and brighten the HUD — the deferred Director notes
- Audio (blaster, enemy fire, kills, thrusters, game-over, music)
- Tuning orb size / tail length / hue-cycle rate for readability via `CFG`

## Generation 11

Agent: Codex (GPT-5)

Date: 2026-06-16

Commit / PR: (branch gen-11-1781673214)

Intent:
Make enemy fire fairer to read without changing the two-front missile duel.
Generation 10 gave enemies a strong plasma-orb identity and tails that show
their travel direction, but their shots could still appear with little warning
once an orb's hidden cooldown elapsed. The highest-value small mutation is to
surface that existing timing as a readable threat cue.

Mutation:
Enemies now visibly telegraph their next shot:

- Added `CFG.enemy.fireWarnTime` and `CFG.enemy.fireFlashTime` so the warning
  window and post-shot flash are tunable alongside the existing fire cadence.
- Each enemy carries a short `fireFlash` timer. When `enemyFire` triggers from
  the existing cooldown path, the timer is set and the cooldown is reset exactly
  as before; shot timing, missile speed, turn rate, damage, and crossfire logic
  are unchanged.
- `drawEnemies` now derives a warning fraction from the remaining fire cooldown
  when an enemy is fully on-field. During the final warning window the orb draws
  a pulsing red charge ring and a hot aiming bead toward the player; immediately
  after firing the bead blooms briefly from `fireFlash`.
- Ready-screen copy, README, and PROJECT_MAP were updated to describe the firing
  cue. Run instructions are unchanged: open `index.html` directly, or serve the
  folder and visit it in a browser.

Rationale:
This reinforces the accepted lineage instead of adding a new system. The core
decision remains "which front is about to matter?", but the player now has a
split-second visual tell before a plasma orb adds another red missile to the
field. That supports the Director's priorities — clear feedback, satisfying
combat, playability, and mastery — while preserving the danger: the missile is
not delayed, weakened, or made less accurate. It simply stops being hidden
information. The aiming bead also makes the incoming lane easier to read, which
helps players deliberately juke shots into enemy crossfire.

Tests / Verification:
- `node --check game.js` passed.
- Deterministic runtime check with a stubbed canvas passed:
  - An on-field enemy at fire cooldown 0 fired exactly one enemy missile.
  - The same shot set `fireFlash` above zero.
  - A staged enemy at half the warning window produced a warning fraction of
    exactly 0.5 and `drawEnemies` completed without throwing.
- Loaded the modified game through a local static server at
  `http://127.0.0.1:8765/`; launched a run, let enemies spawn and fire, captured
  a gameplay screenshot, and confirmed the browser console reported no errors.

Effect on Project Direction:
Improves combat readability by turning an invisible enemy cooldown into an
in-world plasma charge cue. The game stays simple and immediately playable, but
the Director can better evaluate whether deaths and dodges feel fair because
incoming enemy fire now has a readable wind-up.

Future Work Enabled:
- Tune `fireWarnTime` and `fireFlashTime` against spawn density and missile
  pressure.
- Reuse the warning cue for future enemy variants with different attack rhythms.
- Redesign the ship as an alien UAP with strobing lights — the deferred Director
  note.
- Build random small structures on the terrain — the deferred Director note.
- Convert canvas HUD text to brighter sans-serif styling — the deferred Director
  note.
- Audio (blaster, enemy fire, kills, thrusters, game-over, music).

## Generation 12

Agent: Codex (GPT-5)

Date: 2026-06-17

Commit / PR: (branch gen-12-1781674152)

Intent:
Remove the confusing movement-frame conflict called out in the current Director
notes. Generations 2 and 7 made the background slide when the player moved, but
the Director now explicitly asks to remove the near/far starscape effect and the
parallax that makes enemies and powerups appear to move differently from the
player's current direction. The smallest coherent mutation is to make the
combat field use one stable screen frame again.

Mutation:
Removed movement-driven background parallax:

- Removed the `scrollDX` / `groundScroll` state and the `updateStars` parallax
  update path.
- Replaced the layered moving starfield with a single stable starfield. Stars
  still vary in size and brightness for atmosphere, but they no longer carry
  per-layer parallax values or shift when the player flies.
- Anchored the ground ridge so it stays fixed as a bottom reference instead of
  sliding independently from enemies, crates, and missiles.
- Updated the header comment, README, and PROJECT_MAP to describe the stable
  battlefield backdrop. Run instructions are unchanged: open `index.html`
  directly, or serve the folder and visit it in a browser.

Rationale:
This deliberately changes an accepted motion cue because the Director's latest
playtest notes identify that cue as disorienting. The game already asks the
player to read two fronts, enemy charge tells, missile crossfire, blaster heat,
and falling crates; a background that moves in a different apparent frame adds
visual noise without improving those decisions. Keeping the stars and ground
fixed makes dodging, crate chasing, and crossfire baiting easier to evaluate
while preserving the actual combat mechanics, momentum, enemy spawning, and
powerups.

Tests / Verification:
- `node --check game.js` passed.
- Deterministic runtime simulation with a stubbed canvas passed:
  - Starting a run and holding right moved the player.
  - Star positions, sizes, and alpha values stayed unchanged during player
    movement.
  - Stars no longer carry a `parallax` property.
  - The old `scrollDX` and `groundScroll` state fields are no longer present.
- Served the folder with `python3 -m http.server 8765`; `curl -I` returned
  `200 OK` for `/` and `/game.js`.

Effect on Project Direction:
Improves playability and clarity by removing a confusing visual system rather
than adding a new one. The field now reads as a stable combat arena where
enemies, crates, missiles, and the background agree about the player's frame of
reference.

Future Work Enabled:
- If the Director still wants a world that appears 20 screens long, implement it
  as one shared world/camera coordinate system so enemies, pickups, terrain, and
  background all agree.
- Build random small structures on the fixed terrain ridge without inheriting
  the old parallax confusion.
- Redesign the ship as an alien UAP with strobing lights.
- Convert canvas HUD text to brighter sans-serif styling.
- Audio (blaster, enemy fire, kills, thrusters, game-over, music).

## Generation 13

Agent: Claude (Opus 4.8)

Date: 2026-06-16

Commit / PR: (branch gen-13-1781674959)

Intent:
Give the score chase the depth the project keeps pointing at. README states
plainly that "Score is the reason to play again," and DIRECTOR.md lists
"gameplay that rewards mastery" among its likes, yet through Generation 12 every
kill was worth a flat 100 — there was no mechanical reward for playing
aggressively or stringing kills together, so the score number measured survival
time more than skill. The remaining Director notes are either a large spatial
rewrite (a 20-screen world that would fight the accepted edge-buffer design) or
cosmetic/infrastructure items (UAP ship, terrain structures, fonts, audio); the
task asks to prefer a gameplay improvement, so the highest-value small, coherent
mutation is to make sustained, skillful offense pay.

Mutation:
Added a kill-streak score multiplier — one coherent change to scoring, routing
the two existing scored-kill sites through a single new function with no new
entity array or update subsystem:

- A new pure helper `comboMultiplier(combo, max)` returns the capped score
  multiplier for a streak of N consecutive kills (a streak of 0/1 pays the base
  x1; each further chained kill raises it up to `CFG.combo.max`). Exposed on
  `window.__seed`.
- `scoreKill()` advances `state.combo`, refreshes `state.comboTimer` to
  `CFG.combo.window`, awards `CFG.enemy.score × comboMultiplier`, and pops a brief
  `comboFlash`. Both the player-missile kill (`updateEnemies`) and the baited
  crossfire kill (`updateEnemyMissiles`) now call it, so any engineered kill keeps
  the chain alive — reinforcing the Generation 6 crossfire play.
- `updateCombo(dt)` ticks the window down each playing frame and resets the
  streak to nothing once it lapses without a kill, so the multiplier must be
  re-earned. A ram (which already scored nothing) deliberately does not feed the
  streak.
- Feedback: a top-center "COMBO xN" readout (gold, hot-orange at the cap) with a
  shrinking chain-window bar, shown only while a bonus streak is live (multiplier
  above x1) and briefly enlarging when the multiplier ticks up.
- All new behavior is two tunable values in `CFG.combo`. The header comment,
  README ("The Game", "Current State"), and PROJECT_MAP were updated. The UAP
  ship redesign, terrain structures, fonts, and audio were left for separate
  generations to keep this a single idea.

Rationale:
This deepens the score chase the README centers on while *reinforcing* the
accepted lineage rather than fighting it. It is almost purely additive — no
control, damage, spawn, or movement change — so it carries little risk of making
the game feel worse, yet it adds a genuine moment-to-moment decision: press the
attack and cross into the crossfire to keep the chain alive, or play it safe and
let the streak lapse. It directly serves the Director's "rewards mastery" and
"interesting decisions" likes and the "replayability" vision target, and a single
visible number that climbs is immediately legible — the opposite of the
"spreadsheet gameplay" and "hidden information" the Director rejects. Letting
baited crossfire kills feed the same streak ties the new system to the lineage's
signature two-front geometry.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play
  (`preview_console_logs` level=error returned none).
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all 17 assertions passed:
  - `comboMultiplier`: (0,6)→1, (1,6)→1, (3,6)→3, (9,6)→6 (capped).
  - Three chained player-missile kills inside the window built combo 1→2→3 and
    scored 100, +200, +300 (total 600 = x1+x2+x3), refreshing the timer each kill
    and popping `comboFlash` once combo ≥ 2.
  - Letting the window lapse with no kill reset `combo` and `comboTimer` to 0.
  - A crossfire kill (armed enemy missile striking an enemy) advanced the combo
    and scored +100 — the second scored-kill path feeds the same streak.
  - A ram added no score and did not advance the combo.
- Visual confirmation: a frozen staged frame (live `update` no-opped so the rAF
  loop could not overwrite it) showed the gold "COMBO x4" readout and its
  shrinking window bar top-center alongside two plasma orbs with comet tails, a
  gold player missile and a red enemy missile in flight, and the HUD intact — no
  rendering regressions.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Turns the score from a survival-time readout into a measure of skill, giving the
player a positive, self-set goal (keep the chain alive) layered on top of the
existing dodge-and-pivot combat without adding controls, menus, or hidden rules.
The `scoreKill` chokepoint and the `combo`/`comboTimer` pattern are reusable
substrate for further reward feedback — kill-streak audio stingers, score-pop
particles, or multiplier-gated events.

Future Work Enabled:
- Audio/visual stingers on multiplier-up and streak-loss (pairs naturally with
  the deferred audio note)
- Tuning `CFG.combo.window`/`max` against spawn density so the streak is
  sustainable but not automatic
- Redesign the ship as an alien UAP with strobing lights — the deferred Director note
- Build random small structures on the fixed terrain ridge — the deferred Director note
- Convert canvas HUD text to brighter sans-serif styling — the deferred Director note

## Generation 14

Agent: Codex (GPT-5)

Date: 2026-06-17

Commit / PR: (branch gen-14-1781675986)

Intent:
Address the Director's highest current pressure: "The player's world should
appear at least 20 screens in length." Generation 12 intentionally removed
confusing background parallax and left a note that any long world should use one
shared world/camera coordinate system. The smallest coherent gameplay mutation is
to make the accepted two-front combat happen inside a real long patrol sector
without bringing back separate motion frames.

Mutation:
Added a 20-screen shared world/camera frame:

- Player, enemies, missiles, enemy missiles, pickups, particles, stars, ground,
  and terrain structures now use world-space x coordinates and render through
  one camera.
- The player starts near the middle of a 20-screen patrol sector. Horizontal
  thrust moves through that sector; `cameraForPlayer` keeps the ship inside the
  accepted central safe band so enemies entering from visible edges remain
  readable.
- Enemies still spawn from the visible left/right camera edges and move in their
  signed travel direction, preserving the two-front combat loop.
- Crates spawn within the current camera band, then remain world objects while
  they fall and sway.
- The starfield and ground ridge now span the full sector and scroll in the same
  frame as gameplay entities. Sparse terrain structures sit on the ridge as
  landmarks, making the world length visible without adding a new objective.
- The HUD adds a compact `SECTOR NN/20` readout and position bar so the Director
  can verify the long-world mutation immediately.
- README and PROJECT_MAP were updated. Run instructions are unchanged: open
  `index.html` directly, or serve the folder and visit it in a browser.

Rationale:
This directly serves the Director's top priority while respecting the accepted
Generation 12 correction. The game now feels like a longer patrol instead of a
single fixed arena, but the movement is not a detached parallax layer: enemies,
powerups, weapons, stars, ground, and terrain all agree about the camera. That
keeps the current readable two-front combat intact while adding spatial texture
and a stronger sense of place. The mutation is structural but focused on one
gameplay feel goal, and it avoids new rules, menus, objectives, or resource
systems.

Tests / Verification:
- `node --check game.js` passed.
- Helper assertions passed in a stubbed Node VM via `window.__seed`:
  `worldWidth`, `worldToScreenX`, default and camera-aware `offscreenX`,
  `cameraForPlayer` stable/follow/clamp behavior, and `groundY`.
- Loaded the game at `http://127.0.0.1:8765/`, launched a run, confirmed the
  browser console reported no errors, and visually verified the sector readout,
  long-world terrain structures, player ship, HUD, and enemy plasma orb rendered
  correctly.

Effect on Project Direction:
Moves the game toward the Director's long-world vision while preserving the
lineage's strongest current combat decisions: momentum, facing, heat, pickups,
enemy telegraphs, crossfire, and combo scoring. The project now has a simple
world/camera substrate for future spatial mutations instead of needing to fake
distance with background-only motion.

Future Work Enabled:
- Tune camera dead-zone and world length feel after playtesting.
- Add richer terrain landmarks or small structure variants along the patrol
  sector.
- Explore objectives or events tied to sector position without replacing score
  as the main replay chase.
- Redesign the ship as an alien UAP with strobing lights.
- Convert canvas HUD text to brighter sans-serif styling.
- Audio (blaster, enemy fire, kills, thrusters, game-over, music).

## Generation 15

Agent: Claude (Opus 4.8)

Date: 2026-06-17

Commit / PR: (branch gen-15-1781709461)

Intent:
Address the Director's current highest-priority note. DIRECTOR.md's top
playtesting line now reads: "Improve the enemy plasma orb tails so that they
appear like a light trail and follows the movement of the enemy orb. The tail
should not be a dominant feature of the enemy ships." Through Generation 14 the
enemy tail was a static fan of six translucent radial puffs pointing in a fixed
geometric direction (opposite `dir`, with a constant sine lean). It did not
trace where the orb had actually been, and its wide, bright puffs read as a
dominant comet rather than a light trail — exactly the two things the Director
flagged. The highest-value small, coherent mutation is to rework the tail into a
true motion trail.

Mutation:
Replaced the static comet-puff tail with a light trail that follows the orb's
real path — one coherent change confined to enemy spawn data, `updateEnemies`,
and `drawEnemies`, with no gameplay-logic change:

- Each enemy now carries a `trail`: a capped list (`CFG.enemy.trailMax`, 12) of
  its recent center positions in *world* coordinates. `updateEnemies` pushes the
  current center each frame after moving and trims the oldest, so the trail is a
  genuine record of the orb's weaving path (including its vertical drift), not a
  fixed direction.
- `drawEnemies` draws a thin, fading ribbon through those points: each segment is
  projected through the camera (`worldToScreenX`), stroked in the orb's current
  flashing hue, and ramped by position so the oldest end is faint and narrow and
  the freshest (nearest the orb) is the brightest — but the whole trail is capped
  at ~0.45× the core radius in width and ~0.32 max alpha, drawn with `lighter`
  compositing, so it reads as a streak of light rather than a dominant comet.
- The hitbox (`e.w` × `e.h`) and every gameplay rule — spawning, movement,
  drift, ramming, missile kills, return fire, charge telegraph, indiscriminate
  crossfire, scoring — are untouched. The halo, white-hot core, and red
  charge-ring/aiming-bead rendering are unchanged. The old `PUFFS` constant and
  the geometric tail-direction vectors are removed.
- All new behavior is one tunable value in `CFG.enemy` (`trailMax`). The header
  comment, README ("Current State", "The Game"), and PROJECT_MAP (state,
  spawning, update, render) were updated. The UAP ship redesign, the hull-damage
  reduction, sans-serif/brighter fonts, and audio were left for separate
  generations to keep this a single idea.

Rationale:
This implements the Director's current top-ranked note precisely and literally —
"a light trail" that "follows the movement of the enemy orb" and is "not a
dominant feature." It reinforces the accepted lineage rather than fighting it:
the trail now traces each orb's actual weave, so heading *and* drift read at a
glance, directly serving the lineage's core "which front do I face?" decision
(Gens 2–4) and the Director's "clear player feedback" target — while the thinner,
fainter look removes the visual heaviness the Director rejected. It is purely
cosmetic with no control, damage, spawn, or movement change, so it carries little
risk of making the game feel worse, and recording world-space centers means the
camera scroll (Gen 14) never smears the trail.

Tests / Verification:
- `node --check game.js` passed; no browser console errors during play
  (`preview_console_logs` level=error returned none).
- Deterministic in-browser simulation (single synchronous eval, so the live rAF
  loop could not interleave), all passed: a hand-placed orb run through 30 frames
  of `updateEnemies` grew its `trail` and capped it at exactly `CFG.enemy.trailMax`
  (12); the recorded centers advanced in x with the orb's travel and varied in y
  with its drift — confirming the trail follows real movement, in world space.
- Visual confirmation: a frozen staged frame (live `update` no-opped so the rAF
  loop could not overwrite it) showed three plasma orbs in distinct vivid colors,
  each trailing a thin, curving, fading light trail along its weaving path —
  clearly subordinate to the bright orb core — with the player ship, HUD,
  starfield, ground, and terrain structures all intact and no rendering
  regressions.
- Run instructions unchanged: open `index.html`, or `python3 -m http.server`
  and visit the page.

Effect on Project Direction:
Resolves the Director's current top note and gives the enemies a cleaner, more
legible identity: the trail now reads as motion (where the orb has been) rather
than decoration. The per-enemy world-space `trail` buffer is reusable substrate
for any future "follows its path" feedback (e.g. player thruster trails, missile
ribbons, or trails on new enemy variants).

Future Work Enabled:
- Reduce hull damage from enemy fire — the next Director playtesting note.
- Redesign the ship as an alien UAP with strobing lights — the deferred Director note.
- Convert fonts to Segoe UI / sans-serif and brighten the HUD — the deferred Director notes.
- Audio (blaster, enemy fire, kills, thrusters, game-over, music).
- Tune `trailMax` and trail width/alpha for readability via `CFG`.

## Generation 16

Agent: Codex (GPT-5)

Date: 2026-06-17

Commit / PR: (branch gen-16-1781709861)

Intent:
Address the Director's next gameplay-pressure note: reduce hull damage when hit
by enemy fire. Generation 15 made plasma-orb motion easier to read, but a single
enemy missile still removed 14 hull — enough that a few readable-but-human
mistakes could end a run before the player had much chance to recover, chase
crates, or keep a combo alive. The smallest coherent mutation is a balance
change to the damage value itself.

Mutation:
Reduced enemy missile damage from 14 to 10:

- `CFG.enemyMissile.damage` is now 10, while ram damage remains 34.
- Enemy missiles still seek lazily, telegraph from their launcher, arm for
  friendly fire, and score crossfire kills exactly as before.
- No spawn, movement, heat, pickup, scoring, camera, or rendering rules changed.
- README, PROJECT_MAP, and the game header were updated to describe the current
  Generation 16 behavior. Run instructions are unchanged: open `index.html`
  directly, or serve the folder and visit it in a browser.

Rationale:
This follows the Director's priority list without adding a new system. Enemy
fire should still matter — dodging red missiles remains the core pressure — but
a lighter hit makes the combat more forgiving and gives the existing recovery
mechanics more room to breathe. Health crates become more meaningful because a
player who takes one or two shots can still decide whether to cross the field
for a patch, and the combo chase has more space for near-miss survival instead
of abrupt attrition. Keeping ram damage high preserves the clear lesson that
colliding with an orb is the bigger mistake.

Tests / Verification:
- `node --check game.js` passed.
- Deterministic Node VM assertion passed: `CFG.enemyMissile.damage` is 10,
  `CFG.enemy.collideDamage` remains 34, and the damage helper applies exactly 10
  hull loss for an enemy missile hit (100 -> 90) without ending the run.

Effect on Project Direction:
Softens the punishment curve while preserving the two-front missile duel,
crossfire baiting, and crate-chasing decisions. The game should be easier to
evaluate as a run now lasts a little longer after imperfect dodges, without
making enemy fire harmless.

Future Work Enabled:
- Redesign the ship as an alien UAP with strobing lights.
- Convert fonts to Segoe UI / sans-serif and brighten the HUD.
- Audio (blaster, enemy fire, kills, thrusters, powerups, hull reduction,
  game-over, and calm gameplay music).
- Tune enemy missile damage further after playtesting against crate frequency
  and combo sustainability.

## Generation 17

Agent: Codex (GPT-5)

Date: 2026-06-17

Commit / PR: (branch gen-17-1781712326)

Intent:
Address the Director's current highest-priority pressure: have enemy ships form
squadrons or groups. Through Generation 16, enemies spawned as independent
single plasma orbs. That kept the two-front duel readable, but it made enemy
pressure feel like scattered individual targets instead of purposeful fronts.
The smallest coherent gameplay mutation is to make some enemy waves arrive as
small formations.

Mutation:
Added grouped enemy waves:

- New `CFG.squadron` values control squadron chance, two-vs-three size odds,
  vertical spacing, entry spacing, staggered firing, and the extra spawn-timer
  cost for extra orbs.
- Added the pure helper `squadronOffsets`, exposed through `window.__seed`, to
  keep two- and three-orb formations centered and readable.
- Refactored enemy creation into `makeEnemy`, `spawnEnemy`, `spawnSquadron`,
  and `spawnEnemyWave`.
- Some spawn events now produce two or three color-related plasma orbs entering
  from the same visible edge. They share speed and drift, keep a loose vertical
  formation, enter with slight x spacing, and have staggered fire cooldowns so a
  squadron reads as a front to answer rather than an unfair instant volley.
- The next spawn timer is multiplied by a small cost for each extra orb in the
  wave, so formations increase pressure without simply flooding the field.
- README, PROJECT_MAP, and the game header were updated. Run instructions are
  unchanged: open `index.html` directly, or serve the folder and visit it in a
  browser.

Rationale:
This directly follows the Director's top note while reinforcing the accepted
combat loop. A squadron creates a clearer tactical question than another lone
orb: do you pivot to clear the grouped front, bait one side's missiles through
the formation, or spend heat/spread-fire to cash in a combo before the staggered
shots arrive? Matching speed, drift, and hue makes the grouping legible without
adding new rules, controls, UI, or enemy classes. The staggered fire timers and
spawn interval cost preserve playability.

Tests / Verification:
- `node --check game.js` passed.
- Deterministic Node VM assertions passed:
  - `squadronOffsets(1/2/3, 42)` returns `[0]`, `[0, -42]`, and
    `[0, -42, 42]`.
  - A forced three-orb squadron spawns from one edge with one shared squadron id,
    matching direction, exact entry spacing, exact vertical spacing, shared
    speed/drift, and fire cooldowns staggered by `CFG.squadron.fireStagger`.
  - A forced triple wave applies the configured extra spawn-timer cost, while a
    forced single wave keeps the base spawn interval.
- Loaded the branch at `http://127.0.0.1:8765/`, launched a run, let it play for
  several seconds, confirmed the 960x540 canvas rendered, and saw no browser
  console errors.

Effect on Project Direction:
Moves enemy behavior from a stream of independent ships toward readable combat
groups, making each front feel more intentional while keeping the game simple.
Squadrons also make the existing systems matter more: spread fire can clear a
cluster, combo scoring rewards quick formation clears, and crossfire baiting can
turn a grouped wave against itself.

Future Work Enabled:
- Tune `CFG.squadron.chance`, `tripleChance`, `intervalCost`, and spacing after
  playtesting against heat, combo, and crate frequency.
- Add formation-specific visual or audio stingers if groups need stronger
  readability.
- Explore simple enemy variants inside the squadron system without adding large
  rule sets.
- Enhance the player's ship with a futuristic luminous glow.
- Audio (blaster, enemy fire, kills, thrusters, powerups, hull reduction,
  game-over, and calm gameplay music).

## Generation 18

Agent: Codex (GPT-5)

Date: 2026-06-17

Commit / PR: (branch gen-18-1781713154)

Intent:
Address the Director's highest current pressure: sound effects and calm gameplay
music. Through Generation 17 the game had strong visual feedback — plasma trails,
enemy charge tells, muzzle flashes, screen shake, pickup colors, and combo UI —
but every combat event was silent. The smallest coherent mutation is to add
procedural audio cues to the existing gameplay moments without adding assets,
build steps, or new rules.

Mutation:
Added procedural Web Audio feedback:

- Added `CFG.audio` mix values for master, effects, music, and thrust volumes.
- Added a lazy Web Audio manager that is created on launch/restart keypress, so
  browser autoplay rules are respected and no audio files are required.
- Added a soft looping music pad during play and a restrained thruster hum that
  fades in only while the player presses movement input.
- Added short synthesized cues for player shots, spread-fire shots, enemy shots,
  enemy kills, combo climbs, health pickups, 3X pickups, hull damage, overheat
  venting, and game over.
- Hooked audio into the existing event chokepoints (`startGame`, `fire`,
  `enemyFire`, `scoreKill`, `updatePickups`, `damagePlayer`, and `endGame`) so
  sound reflects the current gameplay state instead of becoming a parallel
  system.
- README and PROJECT_MAP were updated. Run instructions are unchanged: open
  `index.html` directly, or serve the folder and visit it in a browser.

Rationale:
This follows the Director's top priority while keeping the generation focused.
Audio improves moment-to-moment feel and clarity without changing the accepted
combat rules: the player still reads two fronts, manages heat, chases crates,
baits crossfire, and builds combos. The cues make those events more satisfying
and easier to parse — a shot has snap, a pickup feels rewarding, damage warns
immediately, combo climbs sing, and game over has a distinct falloff — while the
calm pad keeps the run from feeling empty between bursts. Procedural synthesis
keeps the game self-contained and reviewable.

Tests / Verification:
- `node --check game.js` passed.
- Deterministic Node VM runtime assertions passed with no `AudioContext`
  available, confirming the audio hooks fail gracefully in non-audio
  environments while launch, normal fire, salvo fire, enemy fire, scoring,
  pickups, damage, and game over still work.
- Deterministic Node VM runtime assertions passed with a fake `AudioContext`,
  exercising the Web Audio path for launch/music, thrust, shots, kills, pickups,
  hit, overheat, and game-over cues without throwing.
- Served the folder with `python3 -m http.server 8765 --bind 127.0.0.1`;
  `curl -I` returned `200 OK` for `/` and `/game.js`.

Effect on Project Direction:
Adds the first audio layer to the game, making combat feedback felt as well as
seen while preserving the simple static-page architecture. The procedural audio
manager gives future generations a lightweight substrate for richer feedback
without forcing asset management or a build pipeline.

Future Work Enabled:
- Tune the audio mix and individual cue shapes after playtesting.
- Add a clearer squadron-arrival or formation-clear stinger if grouped waves need
  stronger readability.
- Enhance the player's ship with a futuristic luminous glow.
- Brighten the HUD fonts further if readability still suffers against the dark
  field.
