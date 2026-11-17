// Ember Harvest — bootstrap: canvas, loop, screens and the ?shot= scenes
// used for the entry's screenshots. The loop runs on a fixed step so play
// and screenshots stay deterministic.
import { FIELD, STEP } from './config.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { World, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const sound = new Sound();
const input = new Input(canvas, (x, y, rect) => ({
  x: (x / rect.width) * FIELD.width,
  y: (y / rect.height) * FIELD.height,
}));
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const world = new World(shot ? 20261117 : (Date.now() % 2147483647));

try {
  world.best = Number(window.localStorage.getItem('ember-harvest-best') || 0);
} catch {
  world.best = 0;
}

let shotScreen = null;
if (shot) {
  const staged = stageShot(shot, world);
  shotScreen = staged.screen;
  world.best = staged.best;
  world.screen = staged.screen;
  render(ctx, world);
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      tick();
    }
    render(ctx, world);
    input.endFrame();
  }
  function tick() {
    if (input.wasPressed('m')) {
      sound.ensure();
      sound.toggleMute();
    }
    if (world.screen === SCREEN_TITLE) {
      if (input.mouse.down || input.wasPressed('enter') || input.wasPressed(' ')) {
        sound.ensure();
        sound.startPad();
        world.start();
      }
      world.step(STEP, null, null);
      return;
    }
    if (world.screen === SCREEN_PLAY) {
      if (input.wasPressed('p') || input.wasPressed('escape')) {
        world.screen = SCREEN_PAUSED;
        return;
      }
      world.step(STEP, input, sound);
      return;
    }
    if (world.screen === SCREEN_PAUSED) {
      if (input.wasPressed('p') || input.wasPressed('escape') || input.mouse.down) {
        world.screen = SCREEN_PLAY;
      }
      return;
    }
    if (world.screen === SCREEN_OVER) {
      if (world.score > world.best) {
        world.best = world.score;
        try {
          window.localStorage.setItem('ember-harvest-best', String(world.best));
        } catch {
          // Best score is nice-to-have; private mode must not break the game.
        }
      }
      if (input.wasPressed('r') || input.mouse.down || input.wasPressed('enter')) {
        world.start();
      }
    }
  }
  requestAnimationFrame(frame);
}
