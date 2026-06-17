"use strict";

/*
 * The Seed 2 — Generation 7
 * Free-flight space combat where enemy fire burns friend and foe alike, and the
 * ship flies with momentum.
 *
 * The player pilots a ship freely across the field, facing whichever way they
 * fly and firing homing missiles that curve toward the nearest enemy *ahead* of
 * them. Enemy ships close in from BOTH edges and return fire: each lobs its own
 * seeking missiles at the player, but slower and turning more lazily than the
 * player's, so they seek for real yet can be out-flown and juked. Those enemy
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
 * outer edges so threats are visible before they close. The world only moves
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
  },

  spawn: {
    startInterval: 1.3, // seconds between spawns at the start
    minInterval: 0.45, // fastest spawn rate
    rampSeconds: 75, // time to reach the fastest spawn rate
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
      flash: 0, // brief hit flash timer
      muzzle: 0, // muzzle flash timer
    },
    missiles: [],
    enemyMissiles: [],
    enemies: [],
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
  if (p.flash > 0) p.flash -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;

  if (isDown(...FIRE_KEYS) && p.cooldown <= 0 && !p.overheated) {
    fire();
    p.cooldown = CFG.player.fireCooldown;
  }
}

function fire() {
  const p = state.player;
  // The missile leaves the nose along the facing direction. Its heading is an
  // angle so it can steer afterward; 0 points right, PI points left.
  const angle = p.facing === 1 ? 0 : Math.PI;
  const nose = p.facing === 1 ? p.x + p.w : p.x - CFG.missile.w;
  state.missiles.push({
    x: nose,
    y: p.y + p.h / 2 - CFG.missile.h / 2,
    w: CFG.missile.w,
    h: CFG.missile.h,
    angle,
    speed: CFG.missile.speed,
    life: CFG.missile.life,
  });
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
    drawMissiles();
    drawEnemyMissiles();
    drawEnemies();
    if (state.phase === "playing") drawPlayer();
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

  // Hull — white flash briefly when hit.
  ctx.fillStyle = p.flash > 0 ? "#ffffff" : "#dfe9ff";
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

function drawEnemies() {
  for (const e of state.enemies) {
    const hw = e.w / 2;
    const hh = e.h / 2;
    ctx.save();
    ctx.translate(e.x + hw, e.y + hh);
    ctx.scale(-e.dir, 1); // nose leads in the travel direction

    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(-hw, 0); // nose
    ctx.lineTo(hw, -hh);
    ctx.lineTo(hw * 0.5, 0);
    ctx.lineTo(hw, hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffb3b3";
    ctx.fillRect(-e.w * 0.05, -e.h * 0.1, 5, e.h * 0.2);

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
    { text: "Enemies close from both sides and shoot back — their fire burns friend and foe.", font: "18px 'Courier New', monospace", color: "#c8d4f0", gap: 34 },
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
  };
}
