"use strict";

/*
 * The Seed 2 — Generation 11
 * Free-flight space combat where enemy fire burns friend and foe alike, the
 * ship flies with momentum, and crates parachute in to be caught — health to
 * patch the hull, a "3X" boost for a burst of spread fire. The enemies are
 * bright plasma orbs that flash through vivid colors and stream a comet tail
 * behind them, then flare red before firing so each threat's heading and next
 * shot read at a glance against the dark.
 *
 * The player pilots a ship freely across the field, facing whichever way they
 * fly and firing homing missiles that curve toward the nearest enemy *ahead* of
 * them. The enemies — drifting plasma orbs trailing comet tails — close in from
 * BOTH edges and return fire: each flares red as it charges, then lobs its own
 * seeking missile at the player, but slower and turning more lazily than the
 * player's, so it seeks for real yet can be out-flown and juked. Those enemy
 * missiles are now indiscriminate — once armed, an enemy missile that strikes
 * another enemy detonates on it, so the two-front geometry can be turned against
 * them: slip out of the way and an enemy's shot may gut a ship on the far front.
 * The threat lives on enemy *weapons* — the hull only takes damage from an enemy
 * missile or a ram, never from letting a ship slip off an edge. The fight stays
 * a two-front problem: pick the side that is shooting at you, seek it clear, bait
 * the crossfire, and dodge the rest while you pivot. The blaster builds heat as
 * it fires; holding the trigger too long overheats it, forcing a brief vent
 * window that asks for bursts instead of infinite spam. The ship flies with
 * momentum — input accelerates it toward a top speed and it glides to a stop when
 * you let go, so dodging is about managing inertia — and it is held clear of the
 * outer edges so threats are visible before they close. Now and then a health
 * crate parachutes down from the top: fly into it to patch the hull, but you have
 * to break formation and cross the fire to reach it before it sinks past the
 * ground. Some crates are instead a gold "3X" weapon boost — catch one and every
 * trigger pull fires a homing spread for a few seconds, shown by a countdown bar
 * under the ship. The world only moves
 * when the player moves — a parallax starfield and rolling ground terrain make
 * that self-directed flight legible. Survive as the pressure ramps up. Score is
 * the reason to play again.
 *
 * Everything runs in a single canvas with no build step: open index.html.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CFG = {
  width: 960,
  height: 540,

  // The bottom band is distant ground terrain — a spatial reference, not a
  // collision surface. The player and enemies fly in the sky above it.
  world: {
    groundHeight: 70,
  },

  player: {
    w: 46,
    h: 24,
    // Momentum-based flight: input accelerates the ship toward a capped top
    // speed, and velocity carries (and glides to a stop) when keys release, so
    // the ship has weight and dodging becomes about managing inertia.
    maxSpeed: 360, // px/sec — top speed the thrusters can reach
    accel: 2400, // px/sec^2 — how hard input pushes toward top speed
    // Fraction of velocity retained per second with no input. Small number =
    // strong drag; applied frame-rate-independently via Math.pow(drag, dt).
    // ~0.21s to shed half your speed, so the glide is felt but stays controllable.
    drag: 0.04,
    // The ship is held out of the outer edgeBuffer of the field on each side, so
    // threats closing from either edge are always visible before they reach you.
    edgeBuffer: 0.2,
    fireCooldown: 0.16, // seconds between shots
    heatPerShot: 0.1,
    heatCoolRate: 0.34, // heat cleared per second while the blaster vents
    overheatRelease: 0.38, // heat level where an overheated blaster comes back
    maxHull: 100,
  },

  // The player's weapon: fast, tight-turning homing missiles.
  missile: {
    w: 16,
    h: 6,
    speed: 640, // px/sec — a touch slower than a straight shot; it makes up for
    // it by steering, and the lower speed lets far crossers still escape.
    turnRate: Math.PI * 1.15, // radians/sec the missile can rotate toward a target
    life: 2.4, // seconds before a missile that found no target burns out
  },

  // The enemies' weapon: deliberately worse than the player's. Slower and
  // turning roughly half as fast, so its seek is real but easy to out-fly — the
  // "less accurate" return fire the Director asked for. Its fire is also
  // indiscriminate: once armed it detonates on any ship it strikes, the player
  // or another enemy.
  enemyMissile: {
    w: 14,
    h: 6,
    speed: 300,
    turnRate: Math.PI * 0.6,
    life: 2.2,
    damage: 14, // hull lost when an enemy missile connects
    // The missile cannot strike an enemy for this long after launch, so it never
    // detonates on its own launcher or a neighbor at the muzzle. It can still hit
    // the player immediately. After it arms, friendly fire is live.
    armTime: 0.18,
  },

  enemy: {
    w: 36,
    h: 28,
    minSpeed: 130,
    maxSpeed: 230,
    collideDamage: 34, // hull lost when an enemy rams the player
    score: 100,
    // Enemies return fire on a per-ship cooldown (seconds). The first shot is
    // also delayed by a value picked from this range, so freshly spawned ships
    // neither all fire in unison nor snipe the instant they appear.
    fireCooldownMin: 1.6,
    fireCooldownMax: 3.2,
    // The orb gives a visible charge cue before firing. It does not change the
    // shot timing; it exposes the cooldown so the player can read which threat
    // is about to add a missile to the crossfire.
    fireWarnTime: 0.55,
    fireFlashTime: 0.12,
    // Plasma-orb look: each enemy flashes through vivid colors at its own rate
    // (degrees/sec around the color wheel), picked from this range so the swarm
    // shimmers out of sync rather than pulsing in unison.
    hueRateMin: 50,
    hueRateMax: 150,
  },

  spawn: {
    startInterval: 1.3, // seconds between spawns at the start
    minInterval: 0.45, // fastest spawn rate
    rampSeconds: 75, // time to reach the fastest spawn rate
  },

  // Health crates parachute down occasionally. The player flies into one to
  // restore hull — a positive object in a field of threats, so chasing it
  // through the crossfire is a real spatial decision when you are hurt.
  pickup: {
    w: 26,
    h: 22,
    fallSpeed: 70, // px/sec descent — slow, like a parachute
    swayAmp: 26, // horizontal sway amplitude as it drifts down
    swaySpeed: 1.6, // sway frequency (radians/sec)
    heal: 34, // hull restored on pickup (capped at maxHull)
    // Seconds between crate drops (the first is staggered too). Rare enough that
    // grabbing one matters; the timer is independent of enemy spawning.
    intervalMin: 9,
    intervalMax: 14,
    // A drop is sometimes a weapon-boost ("3X") crate instead of a health crate.
    // Boost crates are the rarer find, so chasing one is a genuine gamble.
    salvoChance: 0.4,
  },

  // The "3X" weapon boost a salvo crate grants for a limited time: each shot
  // fires a spread of homing missiles instead of one. It is temporary and the
  // crate is rare, so it is a burst of power you cross the crossfire to earn,
  // not a permanent upgrade.
  salvo: {
    count: 3, // missiles launched per shot while the boost is active
    spread: 0.16, // radians between adjacent missiles in the spread
    duration: 7, // seconds the boost lasts after pickup
  },
};

// ---------------------------------------------------------------------------
// Pure helpers (kept side-effect free so they are easy to reason about/test)
// ---------------------------------------------------------------------------
function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randRange(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

// A ship has fully left the playfield through either the left or right edge.
function offscreenX(rect, width) {
  return rect.x + rect.w < 0 || rect.x > width;
}

// A rect has fully left the playfield through any of the four edges. Missiles
// can curve off the top or bottom, so they need the full test, not just X.
function offscreen(rect, width, height) {
  return (
    rect.x + rect.w < 0 ||
    rect.x > width ||
    rect.y + rect.h < 0 ||
    rect.y > height
  );
}

// Smallest signed rotation (radians, in [-PI, PI]) to turn from angle a to b.
function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Rotate `current` toward `target` by at most `maxStep` radians. This is what
// caps a missile's turn rate so it cannot instantly reverse onto a target
// behind it — facing still decides which front the player can hit.
function steerAngle(current, target, maxStep) {
  const d = angleDelta(current, target);
  if (d > maxStep) return current + maxStep;
  if (d < -maxStep) return current - maxStep;
  return target;
}

// Bottom of the flyable sky — everything below this is ground terrain.
function playBottom() {
  return CFG.height - CFG.world.groundHeight;
}

// The inclusive horizontal range the player's top-left x may occupy. The ship is
// held a `buffer` fraction of the field away from each edge so threats closing
// from either side are visible before they arrive.
function playerBoundsX(width, w, buffer) {
  const margin = width * buffer;
  return { lo: margin, hi: width - margin - w };
}

// Symmetric angular offsets for a salvo of `count` missiles, `spread` radians
// apart and centered on 0 — e.g. (3, 0.16) → [-0.16, 0, 0.16]. The set is
// symmetric, so it reads the same fired left or right and a single straight
// shot (count <= 1) is just [0].
function salvoOffsets(count, spread) {
  if (count <= 1) return [0];
  const mid = (count - 1) / 2;
  const offs = [];
  for (let i = 0; i < count; i++) offs.push((i - mid) * spread);
  return offs;
}

// Advance a hue (degrees) around the color wheel from a per-entity `base` at
// `speed` degrees/sec, wrapped into [0, 360). This is what makes each plasma
// orb flash through vivid colors; a per-enemy base + rate keeps the swarm out
// of sync. Pure, so the flashing is deterministic and testable.
function cycleHue(base, t, speed) {
  return (((base + t * speed) % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------
// Canvas + input
// ---------------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = Object.create(null);
const FIRE_KEYS = new Set(["Space"]);

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  // Prevent the page from scrolling while playing.
  if (
    [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  ) {
    e.preventDefault();
  }
  if (state.phase === "ready" && (e.code === "Space" || e.code === "Enter")) {
    startGame();
  } else if (state.phase === "gameover" && e.code === "KeyR") {
    startGame();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

function isDown(...codes) {
  return codes.some((c) => keys[c]);
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
let state;

function newState() {
  return {
    phase: "ready", // "ready" | "playing" | "gameover"
    time: 0,
    score: 0,
    best: state ? state.best : 0,
    shake: 0,
    spawnTimer: 0,
    pickupTimer: randRange(CFG.pickup.intervalMin, CFG.pickup.intervalMax),
    scrollDX: 0, // player's horizontal travel this frame, drives parallax
    groundScroll: 0, // accumulated ground-terrain offset
    player: {
      x: CFG.width / 2 - CFG.player.w / 2,
      y: CFG.height / 2 - CFG.player.h / 2,
      w: CFG.player.w,
      h: CFG.player.h,
      vx: 0, // current velocity (px/sec) — momentum carries between frames
      vy: 0,
      facing: 1, // +1 faces/fires right, -1 faces/fires left
      cooldown: 0,
      hull: CFG.player.maxHull,
      heat: 0,
      overheated: false,
      salvo: 0, // seconds of "3X" spread-fire boost remaining (0 = off)
      flash: 0, // brief hit flash timer
      heal: 0, // brief heal flash timer (green) when a crate is grabbed
      muzzle: 0, // muzzle flash timer
    },
    missiles: [],
    enemyMissiles: [],
    enemies: [],
    pickups: [],
    particles: [],
    stars: makeStars(),
  };
}

function makeStars() {
  const stars = [];
  // Three depth layers. Nearer layers (higher parallax) slide faster as the
  // player flies, selling self-directed motion instead of an automatic scroll.
  const layers = [
    { count: 40, parallax: 0.2, size: 1, alpha: 0.35 },
    { count: 30, parallax: 0.5, size: 1.5, alpha: 0.55 },
    { count: 18, parallax: 1.0, size: 2, alpha: 0.85 },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x: Math.random() * CFG.width,
        y: Math.random() * CFG.height,
        parallax: layer.parallax,
        size: layer.size,
        alpha: layer.alpha,
      });
    }
  }
  return stars;
}

function startGame() {
  const best = state ? state.best : 0;
  state = newState();
  state.best = best;
  state.phase = "playing";
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------
function currentSpawnInterval() {
  const t = clamp(state.time / CFG.spawn.rampSeconds, 0, 1);
  return lerp(CFG.spawn.startInterval, CFG.spawn.minInterval, t);
}

function spawnEnemy() {
  const speedRamp = clamp(state.time / CFG.spawn.rampSeconds, 0, 1);
  const maxSpeed = lerp(CFG.enemy.maxSpeed, CFG.enemy.maxSpeed + 90, speedRamp);
  // Threats close in from either edge. dir is the direction they travel.
  const fromLeft = Math.random() < 0.5;
  state.enemies.push({
    x: fromLeft ? -CFG.enemy.w : CFG.width + CFG.enemy.w,
    y: randRange(20, playBottom() - CFG.enemy.h - 20),
    w: CFG.enemy.w,
    h: CFG.enemy.h,
    dir: fromLeft ? 1 : -1,
    speed: randRange(CFG.enemy.minSpeed, maxSpeed),
    // Gentle vertical drift makes enemies feel alive and harder to line up.
    drift: randRange(-40, 40),
    phase: Math.random() * Math.PI * 2,
    // Time until this ship's next shot (also staggers the very first one).
    fireCooldown: randRange(CFG.enemy.fireCooldownMin, CFG.enemy.fireCooldownMax),
    fireFlash: 0,
    // Plasma-orb color: a random starting hue and its own cycle rate, so every
    // orb flashes through vivid colors independently of its neighbors.
    hue: Math.random() * 360,
    hueRate: randRange(CFG.enemy.hueRateMin, CFG.enemy.hueRateMax),
  });
}

// A crate enters from the top and parachutes down. It spawns within the
// player's horizontal band so it is always reachable, then sways as it falls.
// Most crates restore hull; some are the rarer "3X" weapon boost.
function spawnPickup() {
  const bounds = playerBoundsX(CFG.width, CFG.pickup.w, CFG.player.edgeBuffer);
  const baseX = randRange(bounds.lo, bounds.hi);
  state.pickups.push({
    kind: Math.random() < CFG.pickup.salvoChance ? "salvo" : "health",
    baseX, // sway oscillates around this
    x: baseX, // updated to baseX + sway each frame
    y: -CFG.pickup.h - 24,
    w: CFG.pickup.w,
    h: CFG.pickup.h,
    phase: Math.random() * Math.PI * 2,
  });
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
function spawnExplosion(cx, cy, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(40, 260);
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randRange(0.3, 0.7),
      maxLife: 0.7,
      size: randRange(1.5, 3.5),
      color,
    });
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  state.time += dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 60);

  state.scrollDX = 0; // set by updatePlayer; stays 0 when not flying
  if (state.phase === "playing") {
    updatePlayer(dt);
    updateSpawning(dt);
    updateMissiles(dt);
    updateEnemies(dt);
    updateEnemyMissiles(dt);
    updatePickups(dt);
  }

  // The world only moves because the player moved through it.
  state.groundScroll += state.scrollDX * 0.6;
  updateStars(dt);
  updateParticles(dt);
}

function updateStars(dt) {
  // Stars slide opposite the player's travel, faster for nearer layers, and
  // wrap around either edge so the field is seamless in both directions.
  for (const s of state.stars) {
    s.x -= state.scrollDX * s.parallax;
    if (s.x < 0) s.x += CFG.width;
    else if (s.x > CFG.width) s.x -= CFG.width;
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updatePlayer(dt) {
  const p = state.player;
  let dx = 0;
  let dy = 0;
  if (isDown("ArrowLeft", "KeyA")) dx -= 1;
  if (isDown("ArrowRight", "KeyD")) dx += 1;
  if (isDown("ArrowUp", "KeyW")) dy -= 1;
  if (isDown("ArrowDown", "KeyS")) dy += 1;

  // Face the direction of horizontal travel; this is also the aim direction.
  if (dx < 0) p.facing = -1;
  else if (dx > 0) p.facing = 1;

  // Normalize diagonal input so it isn't a stronger push than cardinal input.
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  // Momentum: input accelerates the ship; with no input, drag bleeds velocity
  // off so it glides to a stop. Drag is applied frame-rate-independently.
  p.vx += dx * CFG.player.accel * dt;
  p.vy += dy * CFG.player.accel * dt;
  const damp = Math.pow(CFG.player.drag, dt);
  p.vx *= damp;
  p.vy *= damp;

  // Cap the speed (on the combined vector so diagonals aren't faster).
  const spd = Math.hypot(p.vx, p.vy);
  if (spd > CFG.player.maxSpeed) {
    const k = CFG.player.maxSpeed / spd;
    p.vx *= k;
    p.vy *= k;
  }

  // Integrate, then clamp inside the field. Hitting a bound kills that axis's
  // velocity so momentum doesn't pin the ship against the wall.
  const bounds = playerBoundsX(CFG.width, p.w, CFG.player.edgeBuffer);
  const prevX = p.x;
  const nextX = p.x + p.vx * dt;
  p.x = clamp(nextX, bounds.lo, bounds.hi);
  if (p.x !== nextX) p.vx = 0;
  const nextY = p.y + p.vy * dt;
  p.y = clamp(nextY, 0, playBottom() - p.h);
  if (p.y !== nextY) p.vy = 0;
  state.scrollDX = p.x - prevX; // how far we actually flew this frame

  if (p.cooldown > 0) p.cooldown -= dt;
  if (p.heat > 0) {
    p.heat = Math.max(0, p.heat - CFG.player.heatCoolRate * dt);
  }
  if (p.overheated && p.heat <= CFG.player.overheatRelease) {
    p.overheated = false;
  }
  if (p.salvo > 0) p.salvo = Math.max(0, p.salvo - dt);
  if (p.flash > 0) p.flash -= dt;
  if (p.heal > 0) p.heal -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;

  if (isDown(...FIRE_KEYS) && p.cooldown <= 0 && !p.overheated) {
    fire();
    p.cooldown = CFG.player.fireCooldown;
  }
}

function fire() {
  const p = state.player;
  // The missiles leave the nose along the facing direction. Heading is an angle
  // so they can steer afterward; 0 points right, PI points left. With the "3X"
  // salvo boost active, a single trigger pull launches a symmetric spread; each
  // missile still homes independently, so the spread widens the front you cover
  // rather than concentrating fire on one target.
  const base = p.facing === 1 ? 0 : Math.PI;
  const nose = p.facing === 1 ? p.x + p.w : p.x - CFG.missile.w;
  const offsets = p.salvo > 0 ? salvoOffsets(CFG.salvo.count, CFG.salvo.spread) : [0];
  for (const off of offsets) {
    state.missiles.push({
      x: nose,
      y: p.y + p.h / 2 - CFG.missile.h / 2,
      w: CFG.missile.w,
      h: CFG.missile.h,
      angle: base + off,
      speed: CFG.missile.speed,
      life: CFG.missile.life,
    });
  }
  // Heat is per trigger pull, not per missile, so the boost stays a clear reward.
  p.heat = clamp(p.heat + CFG.player.heatPerShot, 0, 1);
  if (p.heat >= 1) p.overheated = true;
  p.muzzle = 0.06;
}

// An enemy lobs a seeking missile from its center toward the player's current
// position. It launches already pointed at the player; the lazy turn rate in
// updateEnemyMissiles is what makes the seek beatable.
function enemyFire(e) {
  const ex = e.x + e.w / 2;
  const ey = e.y + e.h / 2;
  const p = state.player;
  const angle = Math.atan2(p.y + p.h / 2 - ey, p.x + p.w / 2 - ex);
  state.enemyMissiles.push({
    x: ex - CFG.enemyMissile.w / 2,
    y: ey - CFG.enemyMissile.h / 2,
    w: CFG.enemyMissile.w,
    h: CFG.enemyMissile.h,
    angle,
    speed: CFG.enemyMissile.speed,
    life: CFG.enemyMissile.life,
    armTime: CFG.enemyMissile.armTime, // delay before it can strike other enemies
  });
}

function updateSpawning(dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = currentSpawnInterval();
  }
}

// Health crates parachute in on their own slow timer, drift down with a gentle
// sway, and either restore hull when the player flies into one or are lost when
// they sink past the ground. Grabbing one when hurt is worth detouring for;
// grabbing at full hull simply tops out (the heal is capped).
function updatePickups(dt) {
  const p = state.player;

  state.pickupTimer -= dt;
  if (state.pickupTimer <= 0) {
    spawnPickup();
    state.pickupTimer = randRange(CFG.pickup.intervalMin, CFG.pickup.intervalMax);
  }

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const c = state.pickups[i];
    c.phase += dt * CFG.pickup.swaySpeed;
    c.y += CFG.pickup.fallSpeed * dt;
    c.x = c.baseX + Math.sin(c.phase) * CFG.pickup.swayAmp;

    if (rectsOverlap(c, p)) {
      state.pickups.splice(i, 1);
      if (c.kind === "salvo") {
        p.salvo = CFG.salvo.duration; // (re)start the 3X spread-fire window
        spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, "#ffd23c", 18);
      } else {
        p.hull = Math.min(CFG.player.maxHull, p.hull + CFG.pickup.heal);
        p.heal = 0.4; // green flash on the ship + hull bar as feedback
        spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, "#4dffa6", 18);
      }
      continue;
    }

    // Sank past the ground without being caught — it is gone.
    if (c.y > playBottom()) {
      state.pickups.splice(i, 1);
    }
  }
}

// The nearest enemy that lies ahead of the missile's current heading. The
// forward-only test is what keeps facing meaningful: a missile cannot lock onto
// a target behind it, so a shot fired right will never wheel around to a threat
// on the left. It only forgives where the enemy has drifted, not which way you
// chose to face.
function nearestSeekTarget(m) {
  const mx = m.x + m.w / 2;
  const my = m.y + m.h / 2;
  const hx = Math.cos(m.angle);
  const hy = Math.sin(m.angle);
  let best = null;
  let bestDist = Infinity;
  for (const e of state.enemies) {
    const rx = e.x + e.w / 2 - mx;
    const ry = e.y + e.h / 2 - my;
    if (rx * hx + ry * hy <= 0) continue; // behind the missile — ignore
    const d = rx * rx + ry * ry;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

function updateMissiles(dt) {
  for (let i = state.missiles.length - 1; i >= 0; i--) {
    const m = state.missiles[i];
    m.life -= dt;

    // Steer toward the nearest enemy ahead, capped by the turn rate.
    const target = nearestSeekTarget(m);
    if (target) {
      const desired = Math.atan2(
        target.y + target.h / 2 - (m.y + m.h / 2),
        target.x + target.w / 2 - (m.x + m.w / 2)
      );
      m.angle = steerAngle(m.angle, desired, CFG.missile.turnRate * dt);
    }

    m.x += Math.cos(m.angle) * m.speed * dt;
    m.y += Math.sin(m.angle) * m.speed * dt;

    if (m.life <= 0 || offscreen(m, CFG.width, CFG.height)) {
      state.missiles.splice(i, 1);
    }
  }
}

// Enemy missiles always re-aim at the player, but at a low turn rate (set in
// CFG.enemyMissile) so they carve wide arcs the player can juke instead of
// snapping on. The seek targets the player, but the warhead is indiscriminate:
// once armed, a missile that overlaps any enemy detonates on it — so dodging out
// of the way can feed an enemy's shot into a ship on the other front. They
// connect for hull damage on the player, then retire on lifetime or by leaving
// any edge.
function updateEnemyMissiles(dt) {
  const p = state.player;
  const tx = p.x + p.w / 2;
  const ty = p.y + p.h / 2;
  for (let i = state.enemyMissiles.length - 1; i >= 0; i--) {
    const m = state.enemyMissiles[i];
    m.life -= dt;
    if (m.armTime > 0) m.armTime -= dt;

    const desired = Math.atan2(ty - (m.y + m.h / 2), tx - (m.x + m.w / 2));
    m.angle = steerAngle(m.angle, desired, CFG.enemyMissile.turnRate * dt);

    m.x += Math.cos(m.angle) * m.speed * dt;
    m.y += Math.sin(m.angle) * m.speed * dt;

    // Crossfire: an armed enemy missile that catches another enemy guts it. An
    // intervening ship soaks the shot before it can reach the player, so it is
    // checked first. The kill scores like any other — baiting it is a real play,
    // and surviving in the line of fire to set it up is the cost.
    if (m.armTime <= 0) {
      let fragged = false;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (rectsOverlap(m, e)) {
          state.enemies.splice(j, 1);
          spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ff5a6e", 14);
          state.score += CFG.enemy.score;
          fragged = true;
          break;
        }
      }
      if (fragged) {
        state.enemyMissiles.splice(i, 1);
        continue;
      }
    }

    if (rectsOverlap(m, p)) {
      state.enemyMissiles.splice(i, 1);
      damagePlayer(CFG.enemyMissile.damage, false);
      continue;
    }

    if (m.life <= 0 || offscreen(m, CFG.width, CFG.height)) {
      state.enemyMissiles.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  const p = state.player;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.x += e.dir * e.speed * dt;
    e.phase += dt * 3;
    if (e.fireFlash > 0) e.fireFlash = Math.max(0, e.fireFlash - dt);
    e.y = clamp(e.y + Math.sin(e.phase) * e.drift * dt, 0, playBottom() - e.h);

    // Slipping off either edge is now harmless — the threat is enemy fire, not
    // position, so an uncleared ship simply leaves the field.
    if (offscreenX(e, CFG.width)) {
      state.enemies.splice(i, 1);
      continue;
    }

    // Enemy rams the player.
    if (rectsOverlap(e, p)) {
      state.enemies.splice(i, 1);
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ff7a3c", 16);
      damagePlayer(CFG.enemy.collideDamage, true);
      continue;
    }

    // Missile hits enemy.
    let hit = false;
    for (let j = state.missiles.length - 1; j >= 0; j--) {
      if (rectsOverlap(state.missiles[j], e)) {
        state.missiles.splice(j, 1);
        hit = true;
        break;
      }
    }
    if (hit) {
      state.enemies.splice(i, 1);
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ffd23c", 14);
      state.score += CFG.enemy.score;
      continue;
    }

    // Still alive and fully on the field — return fire on this ship's cooldown.
    e.fireCooldown -= dt;
    if (e.fireCooldown <= 0 && e.x > 0 && e.x + e.w < CFG.width) {
      enemyFire(e);
      e.fireFlash = CFG.enemy.fireFlashTime;
      e.fireCooldown = randRange(CFG.enemy.fireCooldownMin, CFG.enemy.fireCooldownMax);
    }
  }
}

function damagePlayer(amount, ram) {
  const p = state.player;
  p.hull -= amount;
  p.flash = 0.18;
  state.shake = ram ? 12 : 6;
  spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ff4d4d", ram ? 14 : 8);
  if (p.hull <= 0) {
    p.hull = 0;
    endGame();
  }
}

function endGame() {
  state.phase = "gameover";
  state.best = Math.max(state.best, state.score);
  spawnExplosion(
    state.player.x + state.player.w / 2,
    state.player.y + state.player.h / 2,
    "#ff7a3c",
    40
  );
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render() {
  ctx.clearRect(0, 0, CFG.width, CFG.height);

  ctx.save();
  if (state.shake > 0) {
    ctx.translate(
      randRange(-state.shake, state.shake),
      randRange(-state.shake, state.shake)
    );
  }

  drawStars();
  drawGround();
  drawParticles();

  if (state.phase !== "ready") {
    drawPickups();
    drawMissiles();
    drawEnemyMissiles();
    drawEnemies();
    if (state.phase === "playing") {
      drawPlayer();
      if (state.player.salvo > 0) drawSalvoBar();
    }
  }

  ctx.restore();

  drawHUD();
  if (state.phase === "ready") drawReadyScreen();
  if (state.phase === "gameover") drawGameOver();
}

function drawStars() {
  for (const s of state.stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#9fd6ff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

// Distant rolling terrain along the bottom. Two layered sine waves give a
// seamless ridge that slides with the player, anchoring left/right navigation.
function drawGround() {
  const top = playBottom();
  const off = state.groundScroll;
  ctx.fillStyle = "#0a1226";
  ctx.beginPath();
  ctx.moveTo(0, CFG.height);
  for (let x = 0; x <= CFG.width; x += 8) {
    const w = x + off;
    const y = top + Math.sin(w * 0.012) * 10 + Math.sin(w * 0.031) * 6;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CFG.width, CFG.height);
  ctx.closePath();
  ctx.fill();

  // A faint glowing ridge line picks out the horizon.
  ctx.strokeStyle = "rgba(54, 215, 255, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= CFG.width; x += 8) {
    const w = x + off;
    const y = top + Math.sin(w * 0.012) * 10 + Math.sin(w * 0.031) * 6;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// Shared dart sprite for both the player's and the enemies' missiles, rotated
// to its heading with a trailing exhaust plume so its curve reads clearly. Only
// the palette differs: the player's missiles glow gold, the enemies' burn red,
// so incoming fire is easy to tell from your own at a glance.
function drawMissileSprite(m, exhaust, body, glow) {
  ctx.save();
  ctx.translate(m.x + m.w / 2, m.y + m.h / 2);
  ctx.rotate(m.angle); // body and exhaust point the way the missile flies

  // Exhaust plume trailing behind the nose sells motion and heading.
  ctx.fillStyle = exhaust;
  ctx.beginPath();
  ctx.moveTo(-m.w * 1.6, 0);
  ctx.lineTo(-m.w * 0.5, -m.h * 0.5);
  ctx.lineTo(-m.w * 0.5, m.h * 0.5);
  ctx.closePath();
  ctx.fill();

  // Glowing missile body — a pointed dart aimed along its heading.
  ctx.fillStyle = body;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(m.w / 2, 0); // nose
  ctx.lineTo(-m.w / 2, -m.h / 2);
  ctx.lineTo(-m.w / 2, m.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// A crate hanging under a parachute: a canopy with suspension lines down to a
// boxed emblem. Health crates wear a green cross; the rarer "3X" salvo boost
// wears a gold emblem — the palette tells the two apart at a glance, both
// distinct from the red of enemy fire.
const PICKUP_SKIN = {
  health: { canopy: "#3ce896", glow: "#4dffa6", box: "#0d2a1e", lines: "rgba(180, 255, 220, 0.45)" },
  salvo: { canopy: "#ffce4d", glow: "#ffd23c", box: "#2a210d", lines: "rgba(255, 235, 180, 0.45)" },
};

function drawPickups() {
  for (const c of state.pickups) {
    const skin = PICKUP_SKIN[c.kind] || PICKUP_SKIN.health;
    const cx = c.x + c.w / 2;
    const top = c.y;
    const chuteW = c.w * 1.9;
    const chuteH = c.h * 0.95;
    const chuteY = top - chuteH - 10;

    // Suspension lines from the canopy rim to the crate corners.
    ctx.strokeStyle = skin.lines;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - chuteW / 2, chuteY + chuteH);
    ctx.lineTo(c.x, top);
    ctx.moveTo(cx + chuteW / 2, chuteY + chuteH);
    ctx.lineTo(c.x + c.w, top);
    ctx.moveTo(cx, chuteY + chuteH);
    ctx.lineTo(cx, top);
    ctx.stroke();

    // Canopy — a soft dome with a scalloped lower edge.
    ctx.fillStyle = skin.canopy;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(cx - chuteW / 2, chuteY + chuteH);
    ctx.quadraticCurveTo(cx - chuteW / 2, chuteY, cx, chuteY);
    ctx.quadraticCurveTo(cx + chuteW / 2, chuteY, cx + chuteW / 2, chuteY + chuteH);
    ctx.quadraticCurveTo(cx, chuteY + chuteH + 7, cx - chuteW / 2, chuteY + chuteH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Crate body with a glowing border.
    ctx.fillStyle = skin.box;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = skin.glow;
    ctx.lineWidth = 2;
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 8;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = skin.glow;
    if (c.kind === "salvo") {
      // "3X" emblem so the boost reads exactly as the Director described.
      ctx.font = "bold 14px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("3X", cx, c.y + c.h / 2 + 1);
      ctx.textBaseline = "alphabetic";
    } else {
      // Health cross.
      ctx.fillRect(c.x + c.w * 0.4, c.y + c.h * 0.22, c.w * 0.2, c.h * 0.56);
      ctx.fillRect(c.x + c.w * 0.2, c.y + c.h * 0.4, c.w * 0.6, c.h * 0.2);
    }
  }
}

function drawMissiles() {
  for (const m of state.missiles) {
    drawMissileSprite(m, "rgba(255, 150, 60, 0.55)", "#fff27a", "#ffae3c");
  }
}

function drawEnemyMissiles() {
  for (const m of state.enemyMissiles) {
    drawMissileSprite(m, "rgba(255, 70, 70, 0.5)", "#ff7a8f", "#ff3b3b");
  }
}

function drawPlayer() {
  const p = state.player;
  const hw = p.w / 2;
  const hh = p.h / 2;

  // Draw in a local frame centered on the ship, mirrored to face its heading,
  // so the nose, thruster, and muzzle all point the way the player is flying.
  ctx.save();
  ctx.translate(p.x + hw, p.y + hh);
  ctx.scale(p.facing, 1);

  // Thruster flame flickers behind the ship.
  const flame = randRange(10, 22);
  ctx.fillStyle = "#36d7ff";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh * 0.4);
  ctx.lineTo(-hw - flame, 0);
  ctx.lineTo(-hw, hh * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Hull — white flash when hit, green flash briefly when a crate restores hull,
  // and a gold tint for as long as the 3X salvo boost is active.
  ctx.fillStyle =
    p.flash > 0 ? "#ffffff" : p.heal > 0 ? "#4dffa6" : p.salvo > 0 ? "#ffe27a" : "#dfe9ff";
  ctx.beginPath();
  ctx.moveTo(hw, 0); // nose
  ctx.lineTo(-hw, -hh);
  ctx.lineTo(-hw * 0.5, 0);
  ctx.lineTo(-hw, hh);
  ctx.closePath();
  ctx.fill();

  // Cockpit accent.
  ctx.fillStyle = p.flash > 0 ? "#ffffff" : "#36d7ff";
  ctx.fillRect(-p.w * 0.05, -hh * 0.24, 6, hh * 0.48);

  // Muzzle flash.
  if (p.muzzle > 0) {
    ctx.fillStyle = "#fff27a";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(hw + 4, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// A short countdown bar pinned under the ship while the 3X boost is active, so
// the player can see how much spread-fire time is left at a glance — drawn in
// world space so it tracks the ship rather than living in the corner HUD.
function drawSalvoBar() {
  const p = state.player;
  const frac = clamp(p.salvo / CFG.salvo.duration, 0, 1);
  const w = p.w;
  const h = 4;
  const x = p.x;
  const y = p.y + p.h + 8;
  ctx.fillStyle = "rgba(20, 24, 40, 0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#ffd23c";
  ctx.fillRect(x, y, w * frac, h);
}

// Enemies render as bright, diffuse plasma orbs that flash through vivid colors
// and stream a comet tail behind them. The tail points opposite the travel
// direction (with a soft vertical lean from the drift, so it whips as the orb
// weaves), which makes each threat's heading read at a glance — reinforcing the
// "which front do I face?" decision. A red charge ring and aiming bead appear
// just before the orb fires, exposing the imminent shot without changing the
// cooldown. The hitbox is unchanged; the bright core sits on the orb's center
// and the halo is just glow.
function drawEnemies() {
  const PUFFS = 6;
  for (const e of state.enemies) {
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const r = e.h * 0.5; // bright core radius, ~ the hitbox
    const hue = cycleHue(e.hue, state.time, e.hueRate);
    const fullyOnField = e.x > 0 && e.x + e.w < CFG.width;
    const warn = fullyOnField
      ? clamp(1 - e.fireCooldown / CFG.enemy.fireWarnTime, 0, 1)
      : 0;
    const flash = e.fireFlash > 0
      ? clamp(e.fireFlash / CFG.enemy.fireFlashTime, 0, 1)
      : 0;

    // Unit vector for the tail: behind the orb (-dir), leaning with the drift.
    const tdx = -e.dir;
    const tdy = Math.sin(e.phase) * 0.35;
    const tlen = Math.hypot(tdx, tdy);
    const ux = tdx / tlen;
    const uy = tdy / tlen;
    const tailLen = e.w * 2.6;

    ctx.save();

    // Comet tail: layered translucent puffs, brightest and widest just behind
    // the orb, tapering and fading to nothing at the tip.
    for (let i = PUFFS; i >= 1; i--) {
      const f = i / PUFFS; // 1 at the tip, → 0 near the orb
      const px = cx + ux * tailLen * f;
      const py = cy + uy * tailLen * f;
      const pr = Math.max(1, r * (1.05 - f * 0.8));
      const a = (1 - f) * 0.5;
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `hsla(${hue}, 100%, 70%, ${a})`);
      g.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Diffuse halo around the orb.
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.9);
    halo.addColorStop(0, `hsla(${hue}, 100%, 75%, 0.85)`);
    halo.addColorStop(0.5, `hsla(${hue}, 100%, 60%, 0.5)`);
    halo.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // White-hot core that bleeds into the flashing hue.
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    core.addColorStop(0.6, `hsl(${hue}, 100%, 80%)`);
    core.addColorStop(1, `hsla(${hue}, 100%, 65%, 0.25)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    if (warn > 0 || flash > 0) {
      const charge = Math.max(warn, flash);
      const pulse = 0.65 + Math.sin(state.time * 36) * 0.35;
      const player = state.player;
      const ax = player.x + player.w / 2 - cx;
      const ay = player.y + player.h / 2 - cy;
      const alen = Math.hypot(ax, ay) || 1;
      const uxAim = ax / alen;
      const uyAim = ay / alen;
      const beadX = cx + uxAim * r * 1.15;
      const beadY = cy + uyAim * r * 1.15;

      ctx.shadowColor = "#ff4d5e";
      ctx.shadowBlur = 8 + charge * 14;
      ctx.strokeStyle = `rgba(255, 77, 94, ${0.2 + charge * 0.6})`;
      ctx.lineWidth = 1 + charge * 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (1.2 + charge * 0.45 + pulse * 0.08), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 210, 60, ${0.15 + charge * 0.45})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(beadX, beadY);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 238, 190, ${0.35 + charge * 0.55})`;
      ctx.beginPath();
      ctx.arc(beadX, beadY, 2.5 + charge * 4 + flash * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

function drawHUD() {
  ctx.fillStyle = "#c8d4f0";
  ctx.font = "20px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("SCORE " + String(state.score).padStart(6, "0"), 16, 30);

  ctx.textAlign = "right";
  ctx.fillStyle = "#5e6b8c";
  ctx.fillText("BEST " + String(state.best).padStart(6, "0"), CFG.width - 16, 30);

  // Hull bar.
  const barW = 180;
  const barH = 12;
  const bx = 16;
  const by = 44;
  const frac = state.player ? state.player.hull / CFG.player.maxHull : 0;
  ctx.fillStyle = "#1a2440";
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = frac > 0.5 ? "#36d7ff" : frac > 0.25 ? "#ffd23c" : "#ff4d4d";
  ctx.fillRect(bx, by, barW * clamp(frac, 0, 1), barH);
  ctx.strokeStyle = "#2a3a66";
  ctx.strokeRect(bx, by, barW, barH);
  ctx.fillStyle = "#5e6b8c";
  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("HULL", bx, by - 4);

  // Blaster heat bar. Continuous fire fills it; red means the weapon is venting.
  const heatY = by + 28;
  const heatFrac = state.player ? clamp(state.player.heat, 0, 1) : 0;
  ctx.fillStyle = "#1a2440";
  ctx.fillRect(bx, heatY, barW, barH);
  ctx.fillStyle = state.player.overheated
    ? "#ff4d4d"
    : heatFrac > 0.72
      ? "#ffd23c"
      : "#36d7ff";
  ctx.fillRect(bx, heatY, barW * heatFrac, barH);
  ctx.strokeStyle = "#2a3a66";
  ctx.strokeRect(bx, heatY, barW, barH);
  ctx.fillStyle = state.player.overheated ? "#ff7a8f" : "#5e6b8c";
  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText(state.player.overheated ? "VENTING" : "HEAT", bx, heatY - 4);
}

function drawCenteredText(lines) {
  ctx.textAlign = "center";
  let y = CFG.height / 2 - (lines.length - 1) * 22;
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, CFG.width / 2, y);
    y += line.gap || 44;
  }
}

function drawReadyScreen() {
  ctx.fillStyle = "rgba(2, 3, 10, 0.55)";
  ctx.fillRect(0, 0, CFG.width, CFG.height);
  drawCenteredText([
    { text: "SPACE COMBAT", font: "44px 'Courier New', monospace", color: "#36d7ff", gap: 50 },
    { text: "Enemies close from both sides and flare before firing — their shots burn friend and foe.", font: "18px 'Courier New', monospace", color: "#c8d4f0", gap: 34 },
    { text: "Catch green crates to patch your hull — and gold 3X crates for a burst of spread fire.", font: "18px 'Courier New', monospace", color: "#4dffa6", gap: 34 },
    { text: "Fly WASD / Arrows   ·   Fire seeking missiles SPACE   ·   Burst fire manages heat", font: "16px 'Courier New', monospace", color: "#5e6b8c", gap: 44 },
    { text: "PRESS SPACE TO LAUNCH", font: "22px 'Courier New', monospace", color: "#fff27a", gap: 0 },
  ]);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(2, 3, 10, 0.6)";
  ctx.fillRect(0, 0, CFG.width, CFG.height);
  const newBest = state.score >= state.best && state.score > 0;
  drawCenteredText([
    { text: "HULL BREACHED", font: "44px 'Courier New', monospace", color: "#ff4d4d", gap: 50 },
    { text: "SCORE " + state.score, font: "24px 'Courier New', monospace", color: "#c8d4f0", gap: 36 },
    { text: newBest ? "NEW BEST!" : "BEST " + state.best, font: "18px 'Courier New', monospace", color: newBest ? "#ffd23c" : "#5e6b8c", gap: 46 },
    { text: "PRESS R TO RELAUNCH", font: "22px 'Courier New', monospace", color: "#fff27a", gap: 0 },
  ]);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let lastTime = 0;

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // clamp big gaps
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

state = newState();
requestAnimationFrame((t) => {
  lastTime = t;
  requestAnimationFrame(loop);
});

// Expose pure helpers for potential future tests without affecting gameplay.
if (typeof window !== "undefined") {
  window.__seed = {
    clamp,
    rectsOverlap,
    lerp,
    offscreenX,
    offscreen,
    angleDelta,
    steerAngle,
    playerBoundsX,
    salvoOffsets,
    cycleHue,
  };
}
