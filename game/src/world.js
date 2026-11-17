// Ember Harvest — the game itself: state, rules, spawning, collisions and
// scoring. Rendering lives in render.js; this file only decides what happens.
import { EMBER, FIELD, LEVEL, LIGHTS, PLAYER, POWERUP, STEP, WISP } from './config.js';
import { Rng } from './random.js';
import {
  KIND_EMBER,
  KIND_POWERUP,
  KIND_WISP,
  POWER_BLOOM,
  POWER_MAGNET,
  POWER_STILLNESS,
  makeEmber,
  makePowerup,
  makeWisp,
  updateEmber,
  updatePowerup,
  updateWisp,
} from './entities.js';

export const EVENT_NONE = 0;
export const EVENT_OVER = 1;
export const EVENT_LEVEL = 2;
export const EVENT_HIT = 4;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export class World {
  constructor(seed) {
    this.rng = new Rng(seed);
    this.reset();
  }
  reset() {
    this.screen = SCREEN_TITLE;
    this.time = 0;
    this.score = 0;
    this.best = 0;
    this.embersCollected = 0;
    this.lights = LIGHTS;
    this.level = 1;
    this.levelTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.glow = PLAYER.glowStart;
    this.magnet = 0;
    this.stillness = 0;
    this.invulnerable = 0;
    this.shake = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.emberTimer = 0.4;
    this.wispTimer = 2.4;
    this.powerupTimer = POWERUP.spawnEverySeconds;
    this.items = [];
    this.particles = [];
    this.floaters = [];
    this.stars = [];
    for (let i = 0; i < 110; i += 1) {
      this.stars.push({
        x: this.rng.range(0, FIELD.width),
        y: this.rng.range(0, FIELD.height),
        size: this.rng.range(0.6, 2.2),
        twinkle: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(0.2, 1),
      });
    }
    this.player = {
      x: FIELD.width / 2,
      y: FIELD.height * 0.62,
      radius: PLAYER.radius,
      wing: 0,
      trail: [],
    };
    this.events = EVENT_NONE;
  }
  /** Begin a run from the title screen. */
  start() {
    this.reset();
    this.screen = SCREEN_PLAY;
  }
  get state() {
    return this;
  }
  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng.range(0, Math.PI * 2);
      const velocity = this.rng.range(speed * 0.3, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: this.rng.range(0.35, 0.8),
        maxLife: 0.8,
        size: this.rng.range(1.5, 4),
        color,
      });
    }
  }
  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1 });
  }
  collectEmber(ember, sound) {
    ember.active = false;
    this.embersCollected += 1;
    this.combo = this.comboTimer > 0 ? Math.min(this.combo + 1, EMBER.comboMax) : 1;
    this.comboTimer = EMBER.comboWindowSeconds;
    const points = EMBER.value * this.combo;
    this.score += points;
    this.glow = Math.min(PLAYER.glowMax, this.glow + PLAYER.glowPerEmber);
    this.burst(ember.x, ember.y, '#ffd97a', 10, 130);
    this.floater(ember.x, ember.y - 14, `+${points}`, '#ffd97a');
    if (sound) sound.pickup(this.combo);
  }
  collectPowerup(powerup, sound) {
    powerup.active = false;
    this.burst(powerup.x, powerup.y, '#8ef0c1', 14, 150);
    if (powerup.power === POWER_BLOOM) {
      if (this.lights < LIGHTS) {
        this.lights += 1;
        this.floater(powerup.x, powerup.y - 14, '+1 light', '#8ef0c1');
      } else {
        this.score += 250;
        this.floater(powerup.x, powerup.y - 14, '+250', '#8ef0c1');
      }
    } else if (powerup.power === POWER_MAGNET) {
      this.magnet = POWERUP.magnetSeconds;
      this.floater(powerup.x, powerup.y - 14, 'Magnet!', '#8ef0c1');
    } else if (powerup.power === POWER_STILLNESS) {
      this.stillness = POWERUP.stillnessSeconds;
      this.floater(powerup.x, powerup.y - 14, 'Stillness!', '#8ef0c1');
    }
    if (sound) sound.powerup();
  }
  hitWisp(wisp, sound) {
    wisp.active = false;
    this.lights -= 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.invulnerable = PLAYER.invulnerableSeconds;
    this.shake = 0.45;
    this.burst(this.player.x, this.player.y, '#ff5d73', 18, 200);
    this.burst(this.player.x, this.player.y, '#c86bff', 10, 140);
    if (sound) sound.hit();
    if (this.lights <= 0) {
      this.screen = SCREEN_OVER;
      if (sound) sound.gameOver();
      return EVENT_OVER;
    }
    return EVENT_HIT;
  }
  /** One fixed step. `steer` is -1/0/1 or a mouse target; `sound` may be null. */
  step(dt, input, sound) {
    this.events = EVENT_NONE;
    if (this.screen === SCREEN_TITLE) {
      // Attract mode: embers drift, the firefly idles, nothing can hurt it.
      this.time += dt;
      this.emberTimer -= dt;
      if (this.emberTimer <= 0) {
        this.emberTimer = EMBER.spawnIntervalSeconds * 1.4;
        this.items.push(makeEmber(this.rng, 1));
      }
      for (const item of this.items) {
        if (item.kind === KIND_EMBER) updateEmber(item, dt, this.time, 0, this.player);
      }
      this.items = this.items.filter((item) => item.active);
      this.player.wing += dt * 10;
      this.player.x = FIELD.width / 2 + Math.sin(this.time * 0.6) * 60;
      this.player.y = FIELD.height * 0.62 + Math.sin(this.time * 1.1) * 14;
      return EVENT_NONE;
    }
    if (this.screen !== SCREEN_PLAY) return EVENT_NONE;

    this.time += dt;
    this.levelTimer += dt;
    if (this.levelTimer >= LEVEL.secondsPerLevel) {
      this.levelTimer -= LEVEL.secondsPerLevel;
      this.level += 1;
      this.score += LEVEL.levelBonus;
      this.banner = `Level ${this.level} — the dark thickens`;
      this.bannerTimer = 2.2;
      this.events |= EVENT_LEVEL;
      if (sound) sound.levelUp();
    }
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.magnet > 0) this.magnet -= dt;
    if (this.stillness > 0) this.stillness -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    this.glow = Math.max(PLAYER.glowMin, this.glow - PLAYER.glowDrainPerSecond * dt);

    // Steering: keyboard vector wins; otherwise the firefly follows the mouse.
    const steer = input ? input.steer() : { x: 0, y: 0 };
    if (steer.x !== 0 || steer.y !== 0) {
      this.player.x += steer.x * PLAYER.keyboardSpeed * dt;
      this.player.y += steer.y * PLAYER.keyboardSpeed * dt;
    } else if (input && input.mouse.inside) {
      const follow = 1 - Math.exp(-PLAYER.mouseFollow * dt);
      this.player.x += (input.mouse.x - this.player.x) * follow;
      this.player.y += (input.mouse.y - this.player.y) * follow;
    }
    this.player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, this.player.x));
    this.player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, this.player.y));
    this.player.wing += dt * 14;
    this.player.trail.unshift({ x: this.player.x, y: this.player.y, life: 0.35 });
    if (this.player.trail.length > 14) this.player.trail.pop();
    for (const point of this.player.trail) point.life -= dt;
    this.player.trail = this.player.trail.filter((point) => point.life > 0);

    // Spawning.
    this.emberTimer -= dt;
    if (this.emberTimer <= 0) {
      this.emberTimer = EMBER.spawnIntervalSeconds * Math.pow(1 - EMBER.spawnSpeedUpPerLevel, this.level - 1);
      this.items.push(makeEmber(this.rng, this.level));
    }
    this.wispTimer -= dt;
    if (this.wispTimer <= 0) {
      this.wispTimer = WISP.spawnIntervalSeconds * Math.pow(1 - WISP.spawnSpeedUpPerLevel, this.level - 1);
      this.items.push(makeWisp(this.rng, this.level, this.player));
    }
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.powerupTimer = POWERUP.spawnEverySeconds;
      this.items.push(makePowerup(this.rng));
    }

    // Movement and touches.
    for (const item of this.items) {
      if (!item.active) continue;
      if (item.kind === KIND_EMBER) {
        updateEmber(item, dt, this.time, this.magnet, this.player);
        const distance = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (distance < this.glow * 0.85 + item.radius) this.collectEmber(item, sound);
      } else if (item.kind === KIND_WISP) {
        updateWisp(item, dt, this.time, this.player, this.stillness);
        const distance = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (this.invulnerable <= 0 && distance < item.radius + this.player.radius - 2) {
          const event = this.hitWisp(item, sound);
          this.events |= event;
          if (event & EVENT_OVER) break;
        }
      } else if (item.kind === KIND_POWERUP) {
        updatePowerup(item, dt);
        const distance = Math.hypot(item.x - this.player.x, item.y - this.player.y);
        if (distance < item.radius + this.player.radius + 6) this.collectPowerup(item, sound);
      }
    }
    this.items = this.items.filter((item) => item.active);

    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - 2.2 * dt;
      particle.vy *= 1 - 2.2 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const floater of this.floaters) {
      floater.y -= 34 * dt;
      floater.life -= dt * 0.9;
    }
    this.floaters = this.floaters.filter((floater) => floater.life > 0);
    for (const star of this.stars) {
      star.twinkle += dt * star.speed * 2;
      star.y += star.speed * 2 * dt;
      if (star.y > FIELD.height) {
        star.y = -2;
        star.x = this.rng.range(0, FIELD.width);
      }
    }
    return this.events;
  }
}

export { STEP };
