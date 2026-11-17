// Ember Harvest — every pixel the player sees. The world decides what
// happens; this file only draws it, so a screenshot shows exactly the game.
import { COLORS, FIELD } from './config.js';
import { KIND_EMBER, KIND_POWERUP, KIND_WISP, POWER_BLOOM, POWER_MAGNET, POWER_STILLNESS } from './entities.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

function glowCircle(ctx, x, y, radius, inner, outer) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground(ctx, world) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, COLORS.skyTop);
  gradient.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const star of world.stars) {
    const alpha = 0.35 + 0.4 * Math.abs(Math.sin(star.twinkle));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.star;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
  // Soft distant glow-orbs, like a garden breathing in the dark.
  glowCircle(ctx, FIELD.width * 0.16, FIELD.height * 0.86, 150, 'rgba(46, 80, 160, 0.20)', 'rgba(46, 80, 160, 0)');
  glowCircle(ctx, FIELD.width * 0.84, FIELD.height * 0.9, 170, 'rgba(90, 60, 160, 0.18)', 'rgba(90, 60, 160, 0)');
  // Ground line of sleeping grass.
  ctx.strokeStyle = 'rgba(120, 160, 90, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, FIELD.height - 26);
  for (let x = 0; x <= FIELD.width; x += 26) {
    ctx.lineTo(x, FIELD.height - 26 - Math.abs(Math.sin(x * 0.05 + 1.2)) * 12);
  }
  ctx.stroke();
}

function drawEmber(ctx, ember) {
  const flicker = 0.75 + 0.25 * Math.sin(ember.flicker);
  glowCircle(ctx, ember.x, ember.y, ember.radius * 3.2 * flicker, 'rgba(255, 157, 46, 0.55)', 'rgba(255, 157, 46, 0)');
  ctx.fillStyle = COLORS.emberCore;
  ctx.beginPath();
  ctx.arc(ember.x, ember.y, ember.radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(ember.x - 2.5, ember.y - 2.5, ember.radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawWisp(ctx, wisp, time) {
  const pulse = 1 + 0.08 * Math.sin(time * 3 + wisp.wobble);
  glowCircle(ctx, wisp.x, wisp.y, wisp.radius * 2.4, 'rgba(120, 60, 200, 0.30)', 'rgba(120, 60, 200, 0)');
  ctx.fillStyle = COLORS.wispBody;
  ctx.beginPath();
  ctx.arc(wisp.x, wisp.y, wisp.radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(60, 30, 90, 0.8)';
  ctx.beginPath();
  ctx.arc(wisp.x - 6, wisp.y + 8, wisp.radius * 0.45, 0, Math.PI * 2);
  ctx.arc(wisp.x + 7, wisp.y + 6, wisp.radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  // Two watching eyes.
  ctx.fillStyle = COLORS.wispEye;
  ctx.beginPath();
  ctx.arc(wisp.x - 5, wisp.y - 3, 2.6, 0, Math.PI * 2);
  ctx.arc(wisp.x + 5, wisp.y - 3, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPowerup(ctx, powerup, time) {
  const bob = Math.sin(time * 3 + powerup.sway) * 2;
  const y = powerup.y + bob;
  const color = powerup.power === POWER_BLOOM ? '#8ef0c1' : powerup.power === POWER_MAGNET ? '#7fd4ff' : '#e8c8ff';
  const glow = powerup.power === POWER_BLOOM
    ? 'rgba(142, 240, 193, 0.45)'
    : powerup.power === POWER_MAGNET
      ? 'rgba(127, 212, 255, 0.45)'
      : 'rgba(232, 200, 255, 0.45)';
  glowCircle(ctx, powerup.x, y, powerup.radius * 2.6, glow, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = '#101830';
  ctx.beginPath();
  ctx.arc(powerup.x, y, powerup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = powerup.power === POWER_BLOOM ? '+' : powerup.power === POWER_MAGNET ? '◎' : '❄';
  ctx.fillText(glyph, powerup.x, y + 1);
}

function drawPlayer(ctx, world) {
  const player = world.player;
  const blink = world.invulnerable > 0 && Math.floor(world.time * 12) % 2 === 0;
  // Trail of fading light.
  for (const point of player.trail) {
    ctx.globalAlpha = Math.max(0, point.life) * 0.5;
    ctx.fillStyle = COLORS.playerGlow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The glow that is also the pickup radius.
  glowCircle(ctx, player.x, player.y, world.glow, 'rgba(255, 181, 46, 0.16)', 'rgba(255, 181, 46, 0)');
  if (!blink) {
    // Fluttering wings.
    const wingFlap = Math.sin(player.wing) * 7;
    ctx.fillStyle = 'rgba(255, 240, 180, 0.75)';
    ctx.beginPath();
    ctx.ellipse(player.x - 10, player.y - 8 + wingFlap * 0.3, 9, 4.5, -0.6, 0, Math.PI * 2);
    ctx.ellipse(player.x + 10, player.y - 8 - wingFlap * 0.3, 9, 4.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Body.
    glowCircle(ctx, player.x, player.y, player.radius * 2.1, 'rgba(255, 211, 92, 0.85)', 'rgba(255, 211, 92, 0)');
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1c05';
    ctx.beginPath();
    ctx.arc(player.x - 3, player.y - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(player.x + 3, player.y - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, world) {
  for (const particle of world.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
  for (const floater of world.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, floater.life));
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.fillText(`Score ${world.score}`, 24, 44);
  if (world.combo > 1) {
    ctx.fillStyle = COLORS.banner;
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.fillText(`Combo x${world.combo}`, 24, 72);
    const width = 120 * (world.comboTimer / 2.5);
    ctx.fillStyle = 'rgba(255, 217, 122, 0.85)';
    ctx.fillRect(24, 80, Math.max(0, width), 5);
  }
  // Lights and level, top right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`Level ${world.level}`, FIELD.width - 24, 40);
  for (let i = 0; i < 3; i += 1) {
    const x = FIELD.width - 36 - i * 30;
    const y = 62;
    if (i < world.lights) {
      glowCircle(ctx, x, y, 12, 'rgba(255, 181, 46, 0.8)', 'rgba(255, 181, 46, 0)');
      ctx.fillStyle = COLORS.playerCore;
    } else {
      ctx.fillStyle = 'rgba(120, 120, 140, 0.4)';
    }
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Active effects and time, bottom left.
  ctx.textAlign = 'left';
  ctx.font = '16px "Trebuchet MS", sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  const effects = [];
  if (world.magnet > 0) effects.push(`Magnet ${Math.ceil(world.magnet)}s`);
  if (world.stillness > 0) effects.push(`Stillness ${Math.ceil(world.stillness)}s`);
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.fillText(`${effects.join('  ·  ')}${effects.length ? '  ·  ' : ''}${minutes}:${seconds}`, 24, FIELD.height - 20);
  ctx.textAlign = 'right';
  ctx.fillText('P pause · M sound', FIELD.width - 24, FIELD.height - 20);
  // Level banner.
  if (world.bannerTimer > 0) {
    ctx.globalAlpha = Math.min(1, world.bannerTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.banner;
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.fillText(world.banner, FIELD.width / 2, 130);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(8, 10, 28, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 74px "Trebuchet MS", sans-serif';
  ctx.fillText('EMBER HARVEST', FIELD.width / 2, 250);
  ctx.fillStyle = COLORS.banner;
  ctx.font = '22px "Trebuchet MS", sans-serif';
  ctx.fillText('A firefly gathers the last light of the garden', FIELD.width / 2, 292);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '19px "Trebuchet MS", sans-serif';
  ctx.fillText('Move with the mouse or WASD / arrow keys', FIELD.width / 2, 380);
  ctx.fillText('Catch golden embers · dodge the shadow wisps · keep your light alive', FIELD.width / 2, 412);
  ctx.fillText('3 lights · combos multiply your score · a new level every 25 seconds', FIELD.width / 2, 444);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.banner;
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText('Click or press Enter to begin', FIELD.width / 2, 540);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '15px "Trebuchet MS", sans-serif';
  ctx.fillText('P pause · M sound · R restart', FIELD.width / 2, 590);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8, 10, 28, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 52px "Trebuchet MS", sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10);
  ctx.font = '20px "Trebuchet MS", sans-serif';
  ctx.fillText('Press P or click to keep playing', FIELD.width / 2, FIELD.height / 2 + 34);
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(8, 8, 22, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.danger;
  ctx.font = 'bold 60px "Trebuchet MS", sans-serif';
  ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 260);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.fillText(`Score ${world.score}`, FIELD.width / 2, 330);
  ctx.font = '21px "Trebuchet MS", sans-serif';
  ctx.fillText(`Best ${Math.max(world.best, world.score)}   ·   Embers ${world.embersCollected}   ·   Level ${world.level}`, FIELD.width / 2, 372);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.banner;
  ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
  ctx.fillText('Press R or click to play again', FIELD.width / 2, 452);
  ctx.globalAlpha = 1;
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const magnitude = world.shake * 14;
    ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
  }
  drawBackground(ctx, world);
  for (const item of world.items) {
    if (!item.active) continue;
    if (item.kind === KIND_EMBER) drawEmber(ctx, item);
    else if (item.kind === KIND_WISP) drawWisp(ctx, item, world.time);
    else if (item.kind === KIND_POWERUP) drawPowerup(ctx, item, world.time);
  }
  drawParticles(ctx, world);
  drawPlayer(ctx, world);
  drawFloaters(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED) drawHud(ctx, world);
  if (world.screen === SCREEN_PAUSED) drawPaused(ctx);
  if (world.screen === SCREEN_OVER) drawOver(ctx, world);
  // Vignette, to hold the scene together.
  const vignette = ctx.createRadialGradient(
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(4, 6, 18, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.restore();
}
