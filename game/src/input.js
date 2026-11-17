// Ember Harvest — mouse and keyboard state. The canvas is a fixed logical
// field scaled by CSS, so mouse coordinates are mapped back into field space.
export class Input {
  constructor(canvas, toField) {
    this.mouse = { x: 0, y: 0, inside: false, down: false };
    this.keys = new Set();
    this.pressed = new Set();
    this.toField = toField;
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const point = this.toField(event.clientX - rect.left, event.clientY - rect.top, rect);
      this.mouse.x = point.x;
      this.mouse.y = point.y;
      this.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }
  /** True while the key is held. */
  held(key) {
    return this.keys.has(key);
  }
  /** True once, on the frame the key went down; consumed by reading. */
  wasPressed(key) {
    if (!this.pressed.has(key)) return false;
    this.pressed.delete(key);
    return true;
  }
  /** Clear edge-triggered presses at the end of a frame. */
  endFrame() {
    this.pressed.clear();
  }
  /** Arrow/WASD steering as a unit-ish vector. */
  steer() {
    let x = 0;
    let y = 0;
    if (this.held('arrowleft') || this.held('a')) x -= 1;
    if (this.held('arrowright') || this.held('d')) x += 1;
    if (this.held('arrowup') || this.held('w')) y -= 1;
    if (this.held('arrowdown') || this.held('s')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
