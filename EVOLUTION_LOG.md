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
