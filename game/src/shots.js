// Ember Harvest — the screenshot scenes behind ?shot=start|play|end. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (chase the nearest ember, keep clear
// of wisps), so the frame is what a short game really looks like and the
// same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { KIND_EMBER, KIND_WISP } from './entities.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;
/** How far the play pilot plans ahead; the end pilot is short-sighted. */
const HORIZON_PLAY = 0.9;
const HORIZON_END = 0.22;

/** Would the player be hit within `horizon` seconds if it moved with `vx, vy`? */
function timeToHit(state, vx, vy, horizon) {
  const player = state.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.max(14, Math.min(FIELD.width - 14, player.x + vx * t));
    const y = Math.max(14, Math.min(FIELD.height - 14, player.y + vy * t));
    for (const item of state.items) {
      if (!item.active || item.kind !== KIND_WISP) continue;
      const dx = item.x - x;
      const dy = item.y - y;
      if (Math.hypot(dx, dy) < item.radius + player.radius + 6) return t;
    }
  }
  return Infinity;
}

/**
 * Steer toward the nearest ember; if a wisp is close, run from it instead.
 * Returns a fake input object the world can step with.
 */
function autopilot(state, horizon) {
  const player = state.player;
  let threat = null;
  let threatDistance = Infinity;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_WISP) continue;
    const distance = Math.hypot(item.x - player.x, item.y - player.y);
    if (distance < threatDistance) {
      threatDistance = distance;
      threat = item;
    }
  }
  let targetX = FIELD.width / 2;
  let targetY = FIELD.height / 2;
  if (threat && threatDistance < 150) {
    targetX = player.x + (player.x - threat.x);
    targetY = player.y + (player.y - threat.y);
  } else {
    let ember = null;
    let emberDistance = Infinity;
    for (const item of state.items) {
      if (!item.active || item.kind !== KIND_EMBER) continue;
      const distance = Math.hypot(item.x - player.x, item.y - player.y);
      if (distance < emberDistance) {
        emberDistance = distance;
        ember = item;
      }
    }
    if (ember) {
      targetX = ember.x;
      targetY = ember.y;
    }
  }
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = 460;
  const vx = (dx / length) * speed;
  const vy = (dy / length) * speed;
  if (timeToHit(state, vx, vy, horizon) < horizon) {
    // Try sliding sideways instead of into the wisp.
    const options = [
      { vx: -vy, vy: vx },
      { vx: vy, vy: -vx },
      { vx: 0, vy: 0 },
    ];
    for (const option of options) {
      if (timeToHit(state, option.vx, option.vy, horizon) === Infinity) {
        return fakeInput(option.vx, option.vy);
      }
    }
  }
  return fakeInput(vx, vy);
}

/** An input-shaped object that steers with a fixed velocity vector. */
function fakeInput(vx, vy) {
  return {
    mouse: { x: 0, y: 0, inside: false, down: false },
    steer() {
      const length = Math.hypot(vx, vy) || 1;
      return { x: vx / length, y: vy / length };
    },
  };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    world.screen = SCREEN_TITLE;
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, null, null);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.screen = SCREEN_PLAY;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    const pilot = autopilot(world.state, horizon);
    if (world.step(STEP, pilot, null) & EVENT_OVER) break;
  }
  const over = world.state.lights === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
