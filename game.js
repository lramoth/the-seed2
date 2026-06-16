"use strict";

/*
 * The Seed 2 — Generation 2
 * A free-flight space combat core loop.
 *
 * The player pilots a ship freely across the field, facing whichever way they
 * fly and firing in that direction. Enemy ships close in from BOTH edges, so
 * the fight is a two-front problem: pick a side, clear it, and pivot before
 * anything slips past. The world only moves when the player moves — a parallax
 * starfield and rolling ground terrain make that self-directed flight legible.
 * Survive as the pressure ramps up. Score is the reason to play again.
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
    speed: 340, // px/sec
    fireCooldown: 0.16, // seconds between shots
    maxHull: 100,
  },

  bullet: {
    w: 14,
    h: 4,
    speed: 760,
  },

  enemy: {
    w: 36,
    h: 28,
    minSpeed: 130,
    maxSpeed: 230,
    breachDamage: 12, // hull lost when an enemy slips past either edge
    collideDamage: 34, // hull lost when an enemy rams the player
    score: 100,
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

// Bottom of the flyable sky — everything below this is ground terrain.
function playBottom() {
  return CFG.height - CFG.world.groundHeight;
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
      facing: 1, // +1 faces/fires right, -1 faces/fires left
      cooldown: 0,
      hull: CFG.player.maxHull,
      flash: 0, // brief hit flash timer
      muzzle: 0, // muzzle flash timer
    },
    bullets: [],
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
    updateBullets(dt);
    updateEnemies(dt);
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

  // Normalize diagonal movement so it isn't faster than cardinal movement.
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  // Free roaming across the whole field, but stay in the sky above the ground.
  const prevX = p.x;
  p.x = clamp(p.x + dx * CFG.player.speed * dt, 0, CFG.width - p.w);
  p.y = clamp(p.y + dy * CFG.player.speed * dt, 0, playBottom() - p.h);
  state.scrollDX = p.x - prevX; // how far we actually flew this frame

  if (p.cooldown > 0) p.cooldown -= dt;
  if (p.flash > 0) p.flash -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;

  if (isDown(...FIRE_KEYS) && p.cooldown <= 0) {
    fire();
    p.cooldown = CFG.player.fireCooldown;
  }
}

function fire() {
  const p = state.player;
  // Bullet leaves the nose and travels in the facing direction.
  const nose = p.facing === 1 ? p.x + p.w : p.x - CFG.bullet.w;
  state.bullets.push({
    x: nose,
    y: p.y + p.h / 2 - CFG.bullet.h / 2,
    w: CFG.bullet.w,
    h: CFG.bullet.h,
    vx: CFG.bullet.speed * p.facing,
  });
  p.muzzle = 0.06;
}

function updateSpawning(dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = currentSpawnInterval();
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    if (offscreenX(b, CFG.width)) state.bullets.splice(i, 1);
  }
}

function updateEnemies(dt) {
  const p = state.player;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.x += e.dir * e.speed * dt;
    e.phase += dt * 3;
    e.y = clamp(e.y + Math.sin(e.phase) * e.drift * dt, 0, playBottom() - e.h);

    // Enemy slipped past either edge — a breach.
    if (offscreenX(e, CFG.width)) {
      state.enemies.splice(i, 1);
      damagePlayer(CFG.enemy.breachDamage, false);
      continue;
    }

    // Enemy rams the player.
    if (rectsOverlap(e, p)) {
      state.enemies.splice(i, 1);
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ff7a3c", 16);
      damagePlayer(CFG.enemy.collideDamage, true);
      continue;
    }

    // Bullet hits enemy.
    let hit = false;
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      if (rectsOverlap(state.bullets[j], e)) {
        state.bullets.splice(j, 1);
        hit = true;
        break;
      }
    }
    if (hit) {
      state.enemies.splice(i, 1);
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ffd23c", 14);
      state.score += CFG.enemy.score;
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
    drawBullets();
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

function drawBullets() {
  ctx.fillStyle = "#fff27a";
  ctx.shadowColor = "#ffd23c";
  ctx.shadowBlur = 8;
  for (const b of state.bullets) {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  ctx.shadowBlur = 0;
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
    { text: "Enemies close from both sides. Face them and fire.", font: "18px 'Courier New', monospace", color: "#c8d4f0", gap: 34 },
    { text: "Fly WASD / Arrows   ·   Fire SPACE   ·   You face where you fly", font: "16px 'Courier New', monospace", color: "#5e6b8c", gap: 44 },
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
  window.__seed = { clamp, rectsOverlap, lerp, offscreenX };
}
