"use strict";

/*
 * The Seed 2 — Generation 19
 * Free-flight space combat where enemy fire burns friend and foe alike, the
 * ship flies with momentum under a futuristic luminous hull, and crates
 * parachute in to be caught — health to patch the hull, a "3X" boost for a
 * burst of spread fire. The enemies are bright plasma orbs that sometimes enter
 * as small color-matched squadrons, flash through vivid colors, stream a thin
 * light trail along their weaving path, and flare red before firing so each
 * threat's heading, group, and next shot read at a glance against the dark.
 *
 * The player pilots a ship freely across the field, facing whichever way they
 * fly and firing homing missiles that curve toward the nearest enemy *ahead* of
 * them. The enemies — drifting plasma orbs trailing thin light trails — close in
 * from BOTH edges, sometimes as two- or three-orb squadrons that share an entry
 * side, speed, and loose vertical formation, then return fire: each flares red
 * as it charges, then lobs its own seeking missile at the player, but slower and
 * turning more lazily than the player's, so it seeks for real yet can be
 * out-flown and juked; a hit hurts without gutting the run, leaving more room to
 * recover, chase crates, and keep fighting. Those enemy
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
 * under the ship. The patrol sector is twenty screens wide, with one shared
 * camera/world frame for the ship, enemies, crates, missiles, stars, ground, and
 * small terrain structures. Flying horizontally scrolls that whole world
 * together instead of putting the background in a different motion frame, so the
 * battlefield finally feels long without reviving the old parallax confusion.
 * Procedural Web Audio adds soft gameplay music, thruster hum, weapon, hit,
 * pickup, kill, combo, and game-over cues so combat feedback is felt as well as
 * seen, while bright Segoe-style canvas text keeps the HUD readable against the
 * field. Survive as the pressure ramps up. Chaining kills before a short window
 * lapses builds a score-multiplier streak, so pressing the attack is worth more
 * than picking ships off one at a time. Score is the reason to play again.
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
    screens: 20,
    despawnMargin: 160,
    structuresPerScreen: 3,
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
    damage: 10, // hull lost when an enemy missile connects
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
    // Light trail: the orb records its recent center positions (world-space) and
    // draws a thin, fading ribbon through them, so the tail follows the orb's
    // actual weaving path rather than pointing in a fixed geometric direction.
    // Kept short and faint so it reads as a light trail, not a dominant comet.
    trailMax: 12, // number of recent positions retained for the trail
  },

  spawn: {
    startInterval: 1.3, // seconds between spawns at the start
    minInterval: 0.45, // fastest spawn rate
    rampSeconds: 75, // time to reach the fastest spawn rate
  },

  // Enemy flights sometimes enter as a small squadron instead of a lone orb.
  // The group shares a side, speed, and drift so it reads as one formation, but
  // shot cooldowns are staggered so it creates a front to answer rather than an
  // instant wall of red missiles.
  squadron: {
    chance: 0.52,
    tripleChance: 0.34, // chance a squadron is three orbs instead of two
    verticalGap: 42,
    entrySpacing: 42,
    fireStagger: 0.24,
    intervalCost: 0.55, // extra delay per extra orb spawned in one wave
  },

  // A kill streak: each kill chained within a short window raises a score
  // multiplier, so sustained aggression is worth more than picking off the odd
  // ship. Let the window lapse without a kill and the streak resets to nothing —
  // pressing the attack to keep it alive is a real gamble against playing safe.
  combo: {
    window: 2.5, // seconds after a kill to land the next before the streak resets
    max: 6, // highest multiplier the streak can reach
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

  // Procedural audio keeps the project asset-free while giving each combat
  // moment a distinct cue. Volumes are intentionally restrained so the calm pad
  // supports play and effects punctuate decisions instead of overwhelming them.
  audio: {
    master: 0.55,
    effects: 0.42,
    music: 0.045,
    thrust: 0.055,
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
function offscreenX(rect, width, cameraX = 0, margin = 0) {
  return rect.x + rect.w < cameraX - margin || rect.x > cameraX + width + margin;
}

// A rect has fully left the playfield through any of the four edges. Missiles
// can curve off the top or bottom, so they need the full test, not just X.
function offscreen(rect, width, height, cameraX = 0, margin = 0) {
  return (
    rect.x + rect.w < cameraX - margin ||
    rect.x > cameraX + width + margin ||
    rect.y + rect.h < -margin ||
    rect.y > height + margin
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

function worldWidth() {
  return CFG.width * CFG.world.screens;
}

function worldToScreenX(x, cameraX) {
  return x - cameraX;
}

function groundY(worldX) {
  return playBottom() + Math.sin(worldX * 0.012) * 10 + Math.sin(worldX * 0.031) * 6;
}

// The inclusive horizontal range the player's top-left x may occupy. The ship is
// held a `buffer` fraction of the field away from each edge so threats closing
// from either side are visible before they arrive.
function playerBoundsX(width, w, buffer) {
  const margin = width * buffer;
  return { lo: margin, hi: width - margin - w };
}

// Move the camera only when the player would leave the safe center band. That
// preserves the accepted edge-buffer feel while still allowing a long patrol
// sector: hold a direction and the whole shared world scrolls together.
function cameraForPlayer(playerX, playerW, cameraX, width, worldW, buffer) {
  const bounds = playerBoundsX(width, playerW, buffer);
  const screenPlayerX = playerX - cameraX;
  let nextCameraX = cameraX;
  if (screenPlayerX < bounds.lo) nextCameraX = playerX - bounds.lo;
  else if (screenPlayerX > bounds.hi) nextCameraX = playerX - bounds.hi;
  return clamp(nextCameraX, 0, Math.max(0, worldW - width));
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

// Vertical slots for a small enemy squadron, centered on the leader. The leader
// takes the anchor lane, then wingmates alternate above and below it, keeping a
// two- or three-orb group readable without building a large formation system.
function squadronOffsets(count, gap) {
  const offsets = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) offsets.push(0);
    else offsets.push((i % 2 === 1 ? -1 : 1) * Math.ceil(i / 2) * gap);
  }
  return offsets;
}

// Advance a hue (degrees) around the color wheel from a per-entity `base` at
// `speed` degrees/sec, wrapped into [0, 360). This is what makes each plasma
// orb flash through vivid colors; a per-enemy base + rate keeps the swarm out
// of sync. Pure, so the flashing is deterministic and testable.
function cycleHue(base, t, speed) {
  return (((base + t * speed) % 360) + 360) % 360;
}

// The score multiplier for a kill streak of `combo` consecutive kills, capped at
// `max`. A streak of 0 or 1 pays the base (x1); each further chained kill raises
// the multiplier up to the cap. Pure, so scoring stays deterministic/testable.
function comboMultiplier(combo, max) {
  return clamp(combo, 1, max);
}

// ---------------------------------------------------------------------------
// Canvas + input
// ---------------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const UI_FONT = "'Segoe UI', 'Trebuchet MS', system-ui, -apple-system, sans-serif";
const HUD_BRIGHT = "#eef7ff";
const HUD_MUTED = "#9fb4d9";

function uiFont(size, weight = "") {
  return (weight ? weight + " " : "") + size + "px " + UI_FONT;
}

const keys = Object.create(null);
const FIRE_KEYS = new Set(["Space"]);

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------
const audio = (() => {
  const AudioCtor =
    typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  let ctx = null;
  let masterGain = null;
  let effectsGain = null;
  let musicGain = null;
  let thrustGain = null;
  let thrustOsc = null;
  let musicNodes = [];

  function ensure() {
    if (!AudioCtor) return false;
    if (!ctx) {
      ctx = new AudioCtor();
      masterGain = ctx.createGain();
      masterGain.gain.value = CFG.audio.master;
      masterGain.connect(ctx.destination);

      effectsGain = ctx.createGain();
      effectsGain.gain.value = CFG.audio.effects;
      effectsGain.connect(masterGain);

      musicGain = ctx.createGain();
      musicGain.gain.value = 0.0001;
      musicGain.connect(masterGain);

      thrustGain = ctx.createGain();
      thrustGain.gain.value = 0.0001;
      thrustGain.connect(masterGain);
      setupThrust();
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function setupThrust() {
    if (thrustOsc) return;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 68;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 6.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 7;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(thrustGain);
    osc.start();
    lfo.start();
    thrustOsc = osc;
  }

  function setGainTarget(gain, value, timeConstant = 0.08) {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(Math.max(0.0001, value), t, timeConstant);
  }

  function stopNodeLater(node, when) {
    try {
      node.stop(when);
    } catch (_) {
      // Some browsers throw if a node has already been stopped; sound cleanup
      // should never interrupt gameplay.
    }
  }

  function tone({
    freq,
    endFreq = freq,
    duration = 0.12,
    type = "sine",
    volume = 0.08,
    attack = 0.006,
    delay = 0,
  }) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(effectsGain);
    osc.start(t);
    stopNodeLater(osc, t + duration + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  function noise({ duration = 0.12, volume = 0.06, filterFreq = 700, delay = 0 }) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const fade = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * fade;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(effectsGain);
    source.start(t);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  function stopMusic(fade = 0.8) {
    if (!ctx || !musicGain) return;
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setTargetAtTime(0.0001, t, Math.max(0.05, fade));
    const oldNodes = musicNodes;
    musicNodes = [];
    for (const node of oldNodes) {
      stopNodeLater(node.osc, t + fade + 0.25);
      node.osc.onended = () => {
        node.osc.disconnect();
        node.gain.disconnect();
      };
    }
  }

  function startMusic() {
    if (!ensure()) return;
    stopMusic(0.08);
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(0.0001, t);
    musicGain.gain.linearRampToValueAtTime(CFG.audio.music, t + 1.6);

    const voices = [
      { freq: 110.0, type: "sine", gain: 0.8 },
      { freq: 164.81, type: "triangle", gain: 0.5 },
      { freq: 220.0, type: "sine", gain: 0.35 },
      { freq: 293.66, type: "sine", gain: 0.22 },
    ];
    for (const voice of voices) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.freq, t);
      osc.detune.value = randRange(-4, 4);
      gain.gain.value = voice.gain;
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(t);
      musicNodes.push({ osc, gain });
    }
  }

  function startRun() {
    if (!ensure()) return;
    startMusic();
    tone({ freq: 440, endFreq: 660, duration: 0.16, type: "triangle", volume: 0.06 });
    tone({ freq: 880, endFreq: 990, duration: 0.18, type: "sine", volume: 0.035, delay: 0.08 });
  }

  function setThrusting(on) {
    if (!ctx && !on) return;
    if (!ensure()) return;
    setGainTarget(thrustGain, on ? CFG.audio.thrust : 0.0001, on ? 0.06 : 0.12);
  }

  function playerShot(count) {
    tone({
      freq: count > 1 ? 760 : 620,
      endFreq: 260,
      duration: 0.09,
      type: "square",
      volume: count > 1 ? 0.075 : 0.055,
    });
    if (count > 1) {
      tone({ freq: 980, endFreq: 720, duration: 0.08, type: "sine", volume: 0.035 });
    }
  }

  function enemyShot() {
    tone({ freq: 240, endFreq: 90, duration: 0.15, type: "sawtooth", volume: 0.04 });
  }

  function kill(combo) {
    noise({ duration: 0.11, volume: 0.035, filterFreq: 950 });
    tone({ freq: 180, endFreq: 420, duration: 0.13, type: "triangle", volume: 0.055 });
    if (combo >= 2) {
      const capped = combo >= CFG.combo.max;
      tone({
        freq: capped ? 720 : 560,
        endFreq: capped ? 1080 : 820,
        duration: 0.11,
        type: "sine",
        volume: capped ? 0.055 : 0.04,
        delay: 0.06,
      });
    }
  }

  function pickup(kind) {
    if (kind === "salvo") {
      tone({ freq: 520, endFreq: 780, duration: 0.12, type: "triangle", volume: 0.055 });
      tone({ freq: 780, endFreq: 1040, duration: 0.12, type: "triangle", volume: 0.045, delay: 0.08 });
      tone({ freq: 1040, endFreq: 1320, duration: 0.12, type: "sine", volume: 0.035, delay: 0.16 });
    } else {
      tone({ freq: 330, endFreq: 660, duration: 0.18, type: "triangle", volume: 0.05 });
      tone({ freq: 495, endFreq: 880, duration: 0.16, type: "sine", volume: 0.03, delay: 0.06 });
    }
  }

  function hit(ram) {
    noise({ duration: ram ? 0.2 : 0.13, volume: ram ? 0.07 : 0.045, filterFreq: ram ? 520 : 820 });
    tone({
      freq: ram ? 120 : 160,
      endFreq: ram ? 48 : 70,
      duration: ram ? 0.22 : 0.15,
      type: "sawtooth",
      volume: ram ? 0.055 : 0.035,
    });
  }

  function overheat() {
    noise({ duration: 0.24, volume: 0.035, filterFreq: 1100 });
    tone({ freq: 260, endFreq: 120, duration: 0.22, type: "triangle", volume: 0.035 });
  }

  function gameOver() {
    if (!ensure()) return;
    setThrusting(false);
    stopMusic(0.75);
    noise({ duration: 0.22, volume: 0.045, filterFreq: 480 });
    tone({ freq: 220, endFreq: 164, duration: 0.26, type: "triangle", volume: 0.06 });
    tone({ freq: 164, endFreq: 110, duration: 0.3, type: "triangle", volume: 0.05, delay: 0.16 });
    tone({ freq: 110, endFreq: 55, duration: 0.42, type: "sine", volume: 0.045, delay: 0.34 });
  }

  return {
    startRun,
    setThrusting,
    playerShot,
    enemyShot,
    kill,
    pickup,
    hit,
    overheat,
    gameOver,
  };
})();

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
  const ww = worldWidth();
  const player = {
    x: ww / 2 - CFG.player.w / 2,
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
  };

  return {
    phase: "ready", // "ready" | "playing" | "gameover"
    time: 0,
    score: 0,
    best: state ? state.best : 0,
    shake: 0,
    cameraX: clamp(player.x + player.w / 2 - CFG.width / 2, 0, ww - CFG.width),
    spawnTimer: 0,
    combo: 0, // current kill-streak length (0 = no active streak)
    comboTimer: 0, // seconds left to chain the next kill before the streak resets
    comboFlash: 0, // brief pop when the multiplier ticks up
    pickupTimer: randRange(CFG.pickup.intervalMin, CFG.pickup.intervalMax),
    player,
    missiles: [],
    enemyMissiles: [],
    enemies: [],
    pickups: [],
    particles: [],
    stars: makeStars(),
    structures: makeStructures(),
  };
}

function makeStars() {
  const stars = [];
  // A single shared world starfield keeps the combat frame readable. Earlier
  // parallax layers implied that the background moved differently from enemies
  // and pickups; now the stars are long-world landmarks in the same camera frame
  // as every gameplay object.
  for (let i = 0; i < 88 * CFG.world.screens; i++) {
    const bright = Math.random();
    stars.push({
      x: Math.random() * worldWidth(),
      y: Math.random() * CFG.height,
      size: bright > 0.82 ? 2 : bright > 0.48 ? 1.5 : 1,
      alpha: lerp(0.3, 0.85, bright),
    });
  }
  return stars;
}

function makeStructures() {
  const structures = [];
  const count = CFG.world.screens * CFG.world.structuresPerScreen;
  for (let i = 0; i < count; i++) {
    structures.push({
      x: randRange(80, worldWidth() - 80),
      w: randRange(18, 42),
      h: randRange(16, 48),
      kind: Math.random() < 0.55 ? "mast" : "dome",
      light: Math.random() < 0.5 ? "#36d7ff" : "#ffd23c",
    });
  }
  return structures.sort((a, b) => a.x - b.x);
}

function startGame() {
  const best = state ? state.best : 0;
  state = newState();
  state.best = best;
  state.phase = "playing";
  audio.startRun();
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------
function currentSpawnInterval() {
  const t = clamp(state.time / CFG.spawn.rampSeconds, 0, 1);
  return lerp(CFG.spawn.startInterval, CFG.spawn.minInterval, t);
}

function makeEnemy(options = {}) {
  const speedRamp = clamp(state.time / CFG.spawn.rampSeconds, 0, 1);
  const maxSpeed = lerp(CFG.enemy.maxSpeed, CFG.enemy.maxSpeed + 90, speedRamp);
  // Threats close in from either visible edge of the camera. dir is the
  // direction they travel through the shared world.
  const fromLeft = options.fromLeft ?? (Math.random() < 0.5);
  return {
    x:
      options.x ??
      (fromLeft ? state.cameraX - CFG.enemy.w : state.cameraX + CFG.width + CFG.enemy.w),
    y: options.y ?? randRange(20, playBottom() - CFG.enemy.h - 20),
    w: CFG.enemy.w,
    h: CFG.enemy.h,
    dir: fromLeft ? 1 : -1,
    speed: options.speed ?? randRange(CFG.enemy.minSpeed, maxSpeed),
    // Gentle vertical drift makes enemies feel alive and harder to line up.
    drift: options.drift ?? randRange(-40, 40),
    phase: options.phase ?? Math.random() * Math.PI * 2,
    // Time until this ship's next shot (also staggers the very first one).
    fireCooldown:
      options.fireCooldown ?? randRange(CFG.enemy.fireCooldownMin, CFG.enemy.fireCooldownMax),
    fireFlash: 0,
    // Plasma-orb color: a random starting hue and its own cycle rate, so every
    // orb flashes through vivid colors independently of its neighbors.
    hue: options.hue ?? Math.random() * 360,
    hueRate: options.hueRate ?? randRange(CFG.enemy.hueRateMin, CFG.enemy.hueRateMax),
    // Recent center positions (world-space) for the light trail, newest last.
    trail: [],
    squadron: options.squadron ?? null,
  };
}

function spawnEnemy(options = {}) {
  state.enemies.push(makeEnemy(options));
  return 1;
}

function spawnSquadron(count) {
  const size = clamp(count, 2, 3);
  const fromLeft = Math.random() < 0.5;
  const speedRamp = clamp(state.time / CFG.spawn.rampSeconds, 0, 1);
  const maxSpeed = lerp(CFG.enemy.maxSpeed, CFG.enemy.maxSpeed + 90, speedRamp);
  const offsets = squadronOffsets(size, CFG.squadron.verticalGap);
  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const minY = 20 - minOffset;
  const maxY = playBottom() - CFG.enemy.h - 20 - maxOffset;
  const anchorY = randRange(minY, Math.max(minY, maxY));
  const baseX = fromLeft
    ? state.cameraX - CFG.enemy.w
    : state.cameraX + CFG.width + CFG.enemy.w;
  const entryDir = fromLeft ? -1 : 1;
  const baseSpeed = randRange(CFG.enemy.minSpeed, maxSpeed);
  const drift = randRange(-34, 34);
  const phase = Math.random() * Math.PI * 2;
  const fireBase = randRange(CFG.enemy.fireCooldownMin, CFG.enemy.fireCooldownMax);
  const hueBase = Math.random() * 360;
  const hueRate = randRange(CFG.enemy.hueRateMin, CFG.enemy.hueRateMax);
  const squadron = "sq-" + Math.floor(state.time * 1000) + "-" + state.enemies.length;

  for (let i = 0; i < size; i++) {
    spawnEnemy({
      fromLeft,
      x: baseX + entryDir * CFG.squadron.entrySpacing * i,
      y: anchorY + offsets[i],
      speed: baseSpeed,
      drift,
      phase,
      fireCooldown: fireBase + CFG.squadron.fireStagger * i,
      hue: (hueBase + i * 18) % 360,
      hueRate,
      squadron,
    });
  }
  return size;
}

function spawnEnemyWave() {
  if (Math.random() >= CFG.squadron.chance) return spawnEnemy();
  const count = Math.random() < CFG.squadron.tripleChance ? 3 : 2;
  return spawnSquadron(count);
}

// A crate enters from the top and parachutes down. It spawns within the
// player's horizontal band so it is always reachable, then sways as it falls.
// Most crates restore hull; some are the rarer "3X" weapon boost.
function spawnPickup() {
  const bounds = playerBoundsX(CFG.width, CFG.pickup.w, CFG.player.edgeBuffer);
  const baseX = state.cameraX + randRange(bounds.lo, bounds.hi);
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

  if (state.phase === "playing") {
    updatePlayer(dt);
    updateSpawning(dt);
    updateMissiles(dt);
    updateEnemies(dt);
    updateEnemyMissiles(dt);
    updatePickups(dt);
    updateCombo(dt);
  }

  updateParticles(dt);
}

// Register a scored enemy kill: advance the kill streak, award score scaled by
// the current multiplier, and pop the combo readout. Both the player's missiles
// and baited crossfire route through here, so any engineered kill keeps the
// streak alive — a rammed enemy is not a scored kill and does not feed it.
function scoreKill() {
  state.combo += 1;
  state.comboTimer = CFG.combo.window;
  state.score += CFG.enemy.score * comboMultiplier(state.combo, CFG.combo.max);
  if (state.combo >= 2) state.comboFlash = 0.25;
  audio.kill(state.combo);
}

// The kill streak survives only as long as kills keep landing inside the window.
// Once the window lapses the streak resets to nothing, so the multiplier has to
// be earned again — the pressure that makes chasing it a decision.
function updateCombo(dt) {
  if (state.comboFlash > 0) state.comboFlash = Math.max(0, state.comboFlash - dt);
  if (state.combo > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
      state.comboTimer = 0;
    }
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
  audio.setThrusting(dx !== 0 || dy !== 0);

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

  // Integrate, then clamp inside the long world. Hitting the far ends kills that
  // axis's velocity so momentum doesn't pin the ship against the boundary. The
  // viewport edge buffer is enforced by the camera below, not by trapping the
  // player in one screen.
  const nextX = p.x + p.vx * dt;
  p.x = clamp(nextX, 0, worldWidth() - p.w);
  if (p.x !== nextX) p.vx = 0;
  const nextY = p.y + p.vy * dt;
  p.y = clamp(nextY, 0, playBottom() - p.h);
  if (p.y !== nextY) p.vy = 0;
  state.cameraX = cameraForPlayer(
    p.x,
    p.w,
    state.cameraX,
    CFG.width,
    worldWidth(),
    CFG.player.edgeBuffer
  );

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
  audio.playerShot(offsets.length);
  // Heat is per trigger pull, not per missile, so the boost stays a clear reward.
  const wasOverheated = p.overheated;
  p.heat = clamp(p.heat + CFG.player.heatPerShot, 0, 1);
  if (p.heat >= 1) {
    p.overheated = true;
    if (!wasOverheated) audio.overheat();
  }
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
  audio.enemyShot();
}

function updateSpawning(dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const spawned = spawnEnemyWave();
    state.spawnTimer =
      currentSpawnInterval() * (1 + Math.max(0, spawned - 1) * CFG.squadron.intervalCost);
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
      audio.pickup(c.kind);
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

    if (
      m.life <= 0 ||
      offscreen(m, CFG.width, CFG.height, state.cameraX, CFG.world.despawnMargin)
    ) {
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
          scoreKill();
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

    if (
      m.life <= 0 ||
      offscreen(m, CFG.width, CFG.height, state.cameraX, CFG.world.despawnMargin)
    ) {
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

    // Record the orb's current center for its light trail, then trim to length.
    // World-space, so camera scroll never smears the trail.
    e.trail.push({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
    if (e.trail.length > CFG.enemy.trailMax) e.trail.shift();

    // Slipping off either edge is now harmless — the threat is enemy fire, not
    // position, so an uncleared ship simply leaves the field.
    if (offscreenX(e, CFG.width, state.cameraX, CFG.world.despawnMargin)) {
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
      scoreKill();
      continue;
    }

    // Still alive and fully on the field — return fire on this ship's cooldown.
    e.fireCooldown -= dt;
    if (
      e.fireCooldown <= 0 &&
      e.x > state.cameraX &&
      e.x + e.w < state.cameraX + CFG.width
    ) {
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
  audio.hit(ram);
  spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ff4d4d", ram ? 14 : 8);
  if (p.hull <= 0) {
    p.hull = 0;
    endGame();
  }
}

function endGame() {
  state.phase = "gameover";
  state.best = Math.max(state.best, state.score);
  audio.gameOver();
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
  drawStructures();
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
    const sx = worldToScreenX(s.x, state.cameraX);
    if (sx < -3 || sx > CFG.width + 3) continue;
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#9fd6ff";
    ctx.fillRect(sx, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

// Distant terrain along the bottom. Two layered sine waves are sampled in world
// coordinates, so the ridge scrolls in the same camera frame as enemies/crates.
function drawGround() {
  ctx.fillStyle = "#0a1226";
  ctx.beginPath();
  ctx.moveTo(0, CFG.height);
  for (let x = 0; x <= CFG.width; x += 8) {
    const y = groundY(state.cameraX + x);
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
    const y = groundY(state.cameraX + x);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawStructures() {
  for (const s of state.structures) {
    const sx = worldToScreenX(s.x, state.cameraX);
    if (sx < -80 || sx > CFG.width + 80) continue;
    const baseY = groundY(s.x);
    const w = s.w;
    const h = s.h;

    ctx.save();
    ctx.translate(sx, baseY);
    ctx.fillStyle = "rgba(16, 28, 52, 0.95)";
    ctx.strokeStyle = "rgba(90, 150, 200, 0.38)";
    ctx.lineWidth = 1;

    if (s.kind === "mast") {
      ctx.fillRect(-w * 0.12, -h, w * 0.24, h);
      ctx.beginPath();
      ctx.moveTo(-w * 0.45, -h * 0.7);
      ctx.lineTo(0, -h);
      ctx.lineTo(w * 0.45, -h * 0.7);
      ctx.stroke();
      ctx.shadowColor = s.light;
      ctx.shadowBlur = 8;
      ctx.fillStyle = s.light;
      ctx.beginPath();
      ctx.arc(0, -h - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.18, w * 0.5, h * 0.36, 0, Math.PI, 0);
      ctx.lineTo(w * 0.5, 0);
      ctx.lineTo(-w * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(54, 215, 255, 0.45)";
      ctx.fillRect(-w * 0.22, -h * 0.24, w * 0.44, 2);
    }

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const sx = worldToScreenX(p.x, state.cameraX);
    if (sx < -20 || sx > CFG.width + 20) continue;
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(sx - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// Shared dart sprite for both the player's and the enemies' missiles, rotated
// to its heading with a trailing exhaust plume so its curve reads clearly. Only
// the palette differs: the player's missiles glow gold, the enemies' burn red,
// so incoming fire is easy to tell from your own at a glance.
function drawMissileSprite(m, exhaust, body, glow) {
  ctx.save();
  ctx.translate(worldToScreenX(m.x, state.cameraX) + m.w / 2, m.y + m.h / 2);
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
    const sx = worldToScreenX(c.x, state.cameraX);
    if (sx < -80 || sx > CFG.width + 80) continue;
    const cx = sx + c.w / 2;
    const top = c.y;
    const chuteW = c.w * 1.9;
    const chuteH = c.h * 0.95;
    const chuteY = top - chuteH - 10;

    // Suspension lines from the canopy rim to the crate corners.
    ctx.strokeStyle = skin.lines;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - chuteW / 2, chuteY + chuteH);
    ctx.lineTo(sx, top);
    ctx.moveTo(cx + chuteW / 2, chuteY + chuteH);
    ctx.lineTo(sx + c.w, top);
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
    ctx.fillRect(sx, c.y, c.w, c.h);
    ctx.strokeStyle = skin.glow;
    ctx.lineWidth = 2;
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 8;
    ctx.strokeRect(sx, c.y, c.w, c.h);
    ctx.shadowBlur = 0;

    ctx.fillStyle = skin.glow;
    if (c.kind === "salvo") {
      // "3X" emblem so the boost reads exactly as the Director described.
      ctx.font = uiFont(14, "700");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("3X", cx, c.y + c.h / 2 + 1);
      ctx.textBaseline = "alphabetic";
    } else {
      // Health cross.
      ctx.fillRect(sx + c.w * 0.4, c.y + c.h * 0.22, c.w * 0.2, c.h * 0.56);
      ctx.fillRect(sx + c.w * 0.2, c.y + c.h * 0.4, c.w * 0.6, c.h * 0.2);
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
  const glowColor =
    p.flash > 0 ? "#ffffff" : p.heal > 0 ? "#4dffa6" : p.salvo > 0 ? "#ffd23c" : "#36d7ff";
  const hullColor =
    p.flash > 0 ? "#ffffff" : p.heal > 0 ? "#b9ffd8" : p.salvo > 0 ? "#ffe27a" : "#edf6ff";
  const pulse = 0.78 + Math.sin(state.time * 7) * 0.12;
  const strobe = 0.35 + (Math.sin(state.time * 18) + 1) * 0.32;

  // Draw in a local frame centered on the ship, mirrored to face its heading,
  // so the nose, thruster, and muzzle all point the way the player is flying.
  ctx.save();
  ctx.translate(worldToScreenX(p.x, state.cameraX) + hw, p.y + hh);
  ctx.scale(p.facing, 1);

  // A soft aura makes the player ship the luminous focal point without changing
  // its hitbox; the crisp hull drawn below still carries the readable shape.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.24 * pulse;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 26;
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.moveTo(hw + 2, 0);
  ctx.lineTo(-hw - 4, -hh - 5);
  ctx.lineTo(-hw * 0.62, 0);
  ctx.lineTo(-hw - 4, hh + 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Thruster flame flickers behind the ship.
  const flame = randRange(10, 22);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = "#36d7ff";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#36d7ff";
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh * 0.4);
  ctx.lineTo(-hw - flame, 0);
  ctx.lineTo(-hw, hh * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#bff7ff";
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh * 0.22);
  ctx.lineTo(-hw - flame * 0.58, 0);
  ctx.lineTo(-hw, hh * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Hull — white flash when hit, green flash briefly when a crate restores hull,
  // and a gold tint for as long as the 3X salvo boost is active.
  const hullGradient = ctx.createLinearGradient(-hw, 0, hw, 0);
  hullGradient.addColorStop(0, "#8fb6ff");
  hullGradient.addColorStop(0.45, hullColor);
  hullGradient.addColorStop(1, "#ffffff");
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = hullGradient;
  ctx.beginPath();
  ctx.moveTo(hw, 0); // nose
  ctx.lineTo(-hw, -hh);
  ctx.lineTo(-hw * 0.5, 0);
  ctx.lineTo(-hw, hh);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Luminous rails and strobing running lights sell the ship as a futuristic
  // craft while preserving the original triangular silhouette at speed.
  ctx.strokeStyle = "rgba(54, 215, 255, 0.78)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-hw * 0.58, -hh * 0.52);
  ctx.lineTo(hw * 0.45, -hh * 0.08);
  ctx.moveTo(-hw * 0.58, hh * 0.52);
  ctx.lineTo(hw * 0.45, hh * 0.08);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 242, 122, " + strobe + ")";
  ctx.shadowColor = "#fff27a";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-hw * 0.42, -hh * 0.66, 2.2, 0, Math.PI * 2);
  ctx.arc(-hw * 0.42, hh * 0.66, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cockpit accent.
  ctx.fillStyle = p.flash > 0 ? "#ffffff" : "#36d7ff";
  ctx.shadowColor = "#36d7ff";
  ctx.shadowBlur = 10;
  ctx.fillRect(-p.w * 0.05, -hh * 0.28, 7, hh * 0.56);
  ctx.shadowBlur = 0;

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
  const x = worldToScreenX(p.x, state.cameraX);
  const y = p.y + p.h + 8;
  ctx.fillStyle = "rgba(20, 24, 40, 0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#ffd23c";
  ctx.fillRect(x, y, w * frac, h);
}

// Enemies render as bright, diffuse plasma orbs that flash through vivid colors
// and stream a light trail behind them. The trail is a thin, fading ribbon
// drawn through the orb's recent positions, so it traces the orb's actual
// weaving path — heading and drift read at a glance — while staying subtle
// enough not to dominate the ship. A red charge ring and aiming bead appear
// just before the orb fires, exposing the imminent shot without changing the
// cooldown. The hitbox is unchanged; the bright core sits on the orb's center
// and the halo is just glow.
function drawEnemies() {
  for (const e of state.enemies) {
    const sx = worldToScreenX(e.x, state.cameraX);
    if (sx < -120 || sx > CFG.width + 120) continue;
    const cx = sx + e.w / 2;
    const cy = e.y + e.h / 2;
    const r = e.h * 0.5; // bright core radius, ~ the hitbox
    const hue = cycleHue(e.hue, state.time, e.hueRate);
    const fullyOnField = e.x > state.cameraX && e.x + e.w < state.cameraX + CFG.width;
    const warn = fullyOnField
      ? clamp(1 - e.fireCooldown / CFG.enemy.fireWarnTime, 0, 1)
      : 0;
    const flash = e.fireFlash > 0
      ? clamp(e.fireFlash / CFG.enemy.fireFlashTime, 0, 1)
      : 0;

    ctx.save();

    // Light trail: a thin, fading ribbon through the orb's recent positions.
    // Oldest samples are faint and narrow, the freshest (nearest the orb) the
    // brightest and widest — but the whole trail stays a fraction of the core
    // radius so it reads as a streak of light, not a dominant comet. Drawn with
    // additive blending so it glows without overpowering the field.
    const trail = e.trail;
    if (trail.length > 1) {
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < trail.length; i++) {
        const f = i / (trail.length - 1); // 0 at the oldest, → 1 at the orb
        const ax = worldToScreenX(trail[i - 1].x, state.cameraX);
        const ay = trail[i - 1].y;
        const bx = worldToScreenX(trail[i].x, state.cameraX);
        const by = trail[i].y;
        ctx.strokeStyle = `hsla(${hue}, 100%, 72%, ${f * f * 0.32})`;
        ctx.lineWidth = Math.max(0.5, r * 0.45 * f);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
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
      const ax = player.x + player.w / 2 - (e.x + e.w / 2);
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
  ctx.fillStyle = HUD_BRIGHT;
  ctx.font = uiFont(20, "600");
  ctx.textAlign = "left";
  ctx.fillText("SCORE " + String(state.score).padStart(6, "0"), 16, 30);

  ctx.textAlign = "right";
  ctx.fillStyle = HUD_MUTED;
  ctx.fillText("BEST " + String(state.best).padStart(6, "0"), CFG.width - 16, 30);

  // A compact position readout makes the long patrol sector legible without
  // adding a new objective: score is still the chase, but the world now has
  // visible length and place.
  const worldFrac = state.player
    ? clamp((state.player.x + state.player.w / 2) / worldWidth(), 0, 1)
    : 0;
  const sector = clamp(Math.floor(worldFrac * CFG.world.screens) + 1, 1, CFG.world.screens);
  const navW = 150;
  const navH = 4;
  const navX = CFG.width - 16 - navW;
  const navY = 44;
  ctx.fillStyle = HUD_MUTED;
  ctx.font = uiFont(11, "600");
  ctx.fillText(
    "SECTOR " + String(sector).padStart(2, "0") + "/" + CFG.world.screens,
    CFG.width - 16,
    navY - 5
  );
  ctx.fillStyle = "#1a2440";
  ctx.fillRect(navX, navY, navW, navH);
  ctx.fillStyle = "#36d7ff";
  ctx.fillRect(navX, navY, navW * worldFrac, navH);

  // Kill-streak multiplier — shown top-center only while a bonus streak is live
  // (multiplier above x1), with a shrinking bar for the window left to chain the
  // next kill. It pops briefly each time the multiplier ticks up.
  if (state.combo >= 2) {
    const mult = comboMultiplier(state.combo, CFG.combo.max);
    const capped = mult >= CFG.combo.max;
    const hot = capped ? "#ff7a3c" : "#ffd23c";
    const cxm = CFG.width / 2;
    const pop = 1 + clamp(state.comboFlash / 0.25, 0, 1) * 0.5;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = hot;
    ctx.font = uiFont(Math.round(22 * pop), "700");
    ctx.fillText("COMBO x" + mult, cxm, 28);
    const cbW = 120;
    const cbH = 4;
    const cbX = cxm - cbW / 2;
    const cbY = 36;
    const cbFrac = clamp(state.comboTimer / CFG.combo.window, 0, 1);
    ctx.fillStyle = "#1a2440";
    ctx.fillRect(cbX, cbY, cbW, cbH);
    ctx.fillStyle = hot;
    ctx.fillRect(cbX, cbY, cbW * cbFrac, cbH);
    ctx.restore();
  }

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
  ctx.fillStyle = HUD_MUTED;
  ctx.font = uiFont(11, "600");
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
  ctx.fillStyle = state.player.overheated ? "#ff9bad" : HUD_MUTED;
  ctx.font = uiFont(11, "600");
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
    { text: "SPACE COMBAT", font: uiFont(44, "700"), color: "#36d7ff", gap: 50 },
    { text: "Patrol a 20-screen sector while enemies flare before firing from both sides.", font: uiFont(18, "600"), color: HUD_BRIGHT, gap: 34 },
    { text: "Catch green crates to patch your hull — and gold 3X crates for a burst of spread fire.", font: uiFont(18, "600"), color: "#7dffbd", gap: 34 },
    { text: "Fly WASD / Arrows   ·   Fire seeking missiles SPACE   ·   Burst fire manages heat", font: uiFont(16, "600"), color: HUD_MUTED, gap: 44 },
    { text: "PRESS SPACE TO LAUNCH", font: uiFont(22, "700"), color: "#fff27a", gap: 0 },
  ]);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(2, 3, 10, 0.6)";
  ctx.fillRect(0, 0, CFG.width, CFG.height);
  const newBest = state.score >= state.best && state.score > 0;
  drawCenteredText([
    { text: "HULL BREACHED", font: uiFont(44, "700"), color: "#ff4d4d", gap: 50 },
    { text: "SCORE " + state.score, font: uiFont(24, "600"), color: HUD_BRIGHT, gap: 36 },
    { text: newBest ? "NEW BEST!" : "BEST " + state.best, font: uiFont(18, "600"), color: newBest ? "#ffd23c" : HUD_MUTED, gap: 46 },
    { text: "PRESS R TO RELAUNCH", font: uiFont(22, "700"), color: "#fff27a", gap: 0 },
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
    worldWidth,
    worldToScreenX,
    groundY,
    playerBoundsX,
    cameraForPlayer,
    salvoOffsets,
    squadronOffsets,
    cycleHue,
    comboMultiplier,
  };
}
