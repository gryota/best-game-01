// Ember Harvest — every sound is synthesized with WebAudio. No audio files,
// no network, and nothing happens until the player first interacts, so a
// suspended AudioContext is normal and safe.
export class Sound {
  constructor() {
    this.context = null;
    this.muted = false;
    this.padNodes = null;
  }
  /** Create the context lazily, on first user gesture. */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    } catch {
      this.context = null;
    }
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.padNodes) this.padNodes.gain.gain.value = this.muted ? 0 : 0.05;
    return this.muted;
  }
  tone(frequency, duration, type, volume, slideTo) {
    if (!this.context || this.muted) return;
    try {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }
  /** Pickup chime; the pitch climbs with the combo. */
  pickup(combo) {
    const base = 520 * Math.pow(1.059, Math.min(combo, 12));
    this.tone(base, 0.16, 'sine', 0.16);
    this.tone(base * 1.5, 0.22, 'sine', 0.08);
  }
  /** Losing a light: a low thud. */
  hit() {
    this.tone(160, 0.3, 'triangle', 0.25, 55);
    this.tone(90, 0.35, 'sine', 0.2, 40);
  }
  /** Level up: a short rising arpeggio. */
  levelUp() {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.22, 'sine', 0.12), index * 70);
    });
  }
  /** Power-up collected. */
  powerup() {
    this.tone(392, 0.14, 'sine', 0.14);
    setTimeout(() => this.tone(587, 0.2, 'sine', 0.14), 90);
  }
  /** Game over: a slow descending phrase. */
  gameOver() {
    [392, 330, 262, 196].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.5, 'sine', 0.12), index * 220);
    });
  }
  /** A soft ambient pad under the game; starts on first interaction. */
  startPad() {
    if (!this.context || this.padNodes) return;
    try {
      const gain = this.context.createGain();
      gain.gain.value = this.muted ? 0 : 0.05;
      gain.connect(this.context.destination);
      const oscillators = [110, 164.8, 220].map((frequency) => {
        const oscillator = this.context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      this.padNodes = { gain, oscillators };
    } catch {
      this.padNodes = null;
    }
  }
}
