// Ember Harvest — tuning and palette. One place for every number the game
// balances on, so a tweak here retunes the whole game without touching logic.
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  keyboardSpeed: 460,
  mouseFollow: 10,
  glowStart: 92,
  glowMin: 42,
  glowMax: 132,
  glowDrainPerSecond: 1.1,
  glowPerEmber: 6,
  invulnerableSeconds: 1.6,
};

export const EMBER = {
  radius: 9,
  value: 10,
  comboWindowSeconds: 2.5,
  comboMax: 8,
  spawnIntervalSeconds: 0.8,
  spawnSpeedUpPerLevel: 0.06,
  fallSpeedMin: 55,
  fallSpeedMax: 100,
  fallSpeedPerLevel: 6,
};

export const WISP = {
  radius: 16,
  spawnIntervalSeconds: 2.1,
  spawnSpeedUpPerLevel: 0.1,
  speedBase: 58,
  speedPerLevel: 9,
  wobble: 34,
};

export const POWERUP = {
  spawnEverySeconds: 14,
  radius: 15,
  magnetSeconds: 8,
  magnetRadius: 230,
  stillnessSeconds: 6,
  stillnessFactor: 0.35,
};

export const LEVEL = { secondsPerLevel: 25, levelBonus: 100 };
export const LIGHTS = 3;

export const COLORS = {
  skyTop: '#0a0e24',
  skyBottom: '#18204a',
  star: '#cdd7ff',
  emberCore: '#ffd97a',
  emberGlow: '#ff9d2e',
  wispBody: '#241a3d',
  wispEye: '#c86bff',
  playerCore: '#fff3b0',
  playerGlow: '#ffb52e',
  hudText: '#f4ead2',
  hudDim: '#9aa5d6',
  banner: '#ffd97a',
  danger: '#ff5d73',
};
