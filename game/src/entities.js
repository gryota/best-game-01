// Ember Harvest — the things that fall and drift: embers to collect, wisps
// to dodge, power-ups to grab. Creation and movement live here; the world
// decides when they spawn and what a touch means.
import { EMBER, FIELD, POWERUP, WISP } from './config.js';

export const KIND_EMBER = 'ember';
export const KIND_WISP = 'wisp';
export const KIND_POWERUP = 'powerup';
export const POWER_BLOOM = 'bloom';
export const POWER_MAGNET = 'magnet';
export const POWER_STILLNESS = 'stillness';

export function makeEmber(rng, level) {
  const speed = rng.range(EMBER.fallSpeedMin, EMBER.fallSpeedMax) + level * EMBER.fallSpeedPerLevel;
  return {
    kind: KIND_EMBER,
    x: rng.range(24, FIELD.width - 24),
    y: -20,
    radius: EMBER.radius,
    speed,
    sway: rng.range(0, Math.PI * 2),
    swaySpeed: rng.range(0.8, 1.8),
    swayAmp: rng.range(12, 30),
    flicker: rng.range(0, Math.PI * 2),
    active: true,
  };
}

export function makeWisp(rng, level, player) {
  // Spawn on a random edge, away from the player so it never appears on top of them.
  const side = rng.int(0, 3);
  let x;
  let y;
  if (side === 0) {
    x = rng.range(0, FIELD.width);
    y = -24;
  } else if (side === 1) {
    x = FIELD.width + 24;
    y = rng.range(0, FIELD.height);
  } else if (side === 2) {
    x = rng.range(0, FIELD.width);
    y = FIELD.height + 24;
  } else {
    x = -24;
    y = rng.range(0, FIELD.height);
  }
  if (Math.hypot(x - player.x, y - player.y) < 220) {
    x = FIELD.width - x;
    y = FIELD.height - y;
  }
  return {
    kind: KIND_WISP,
    x,
    y,
    radius: WISP.radius,
    speed: WISP.speedBase + level * WISP.speedPerLevel,
    wobble: rng.range(0, Math.PI * 2),
    wobbleSpeed: rng.range(1.2, 2.4),
    active: true,
  };
}

export function makePowerup(rng) {
  return {
    kind: KIND_POWERUP,
    power: rng.pick([POWER_BLOOM, POWER_MAGNET, POWER_STILLNESS]),
    x: rng.range(60, FIELD.width - 60),
    y: -24,
    radius: POWERUP.radius,
    speed: 42,
    sway: rng.range(0, Math.PI * 2),
    active: true,
  };
}

export function updateEmber(ember, dt, time, magnet, player) {
  ember.y += ember.speed * dt;
  ember.sway += ember.swaySpeed * dt;
  ember.x += Math.sin(ember.sway) * ember.swayAmp * dt;
  ember.flicker += dt * 6;
  if (magnet > 0) {
    const dx = player.x - ember.x;
    const dy = player.y - ember.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 1 && distance < POWERUP.magnetRadius) {
      const pull = 420 * (1 - distance / POWERUP.magnetRadius) * dt;
      ember.x += (dx / distance) * pull;
      ember.y += (dy / distance) * pull;
    }
  }
  if (ember.y - ember.radius > FIELD.height + 30) ember.active = false;
  return ember.active;
}

export function updateWisp(wisp, dt, time, player, stillness) {
  const dx = player.x - wisp.x;
  const dy = player.y - wisp.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = wisp.speed * (stillness > 0 ? POWERUP.stillnessFactor : 1);
  wisp.x += (dx / distance) * speed * dt;
  wisp.y += (dy / distance) * speed * dt;
  wisp.wobble += wisp.wobbleSpeed * dt;
  wisp.x += Math.cos(wisp.wobble) * WISP.wobble * dt;
  wisp.y += Math.sin(wisp.wobble * 0.7) * WISP.wobble * 0.6 * dt;
  return wisp.x > -80 && wisp.x < FIELD.width + 80 && wisp.y > -80 && wisp.y < FIELD.height + 80;
}

export function updatePowerup(powerup, dt) {
  powerup.y += powerup.speed * dt;
  powerup.sway += dt * 2;
  powerup.x += Math.sin(powerup.sway) * 14 * dt;
  if (powerup.y - powerup.radius > FIELD.height + 30) powerup.active = false;
  return powerup.active;
}
