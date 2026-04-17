export type Vec2 = { x: number; y: number };

export type Phase = "start" | "playing" | "paused" | "gameover";

export type Enemy = {
  id: number;
  char: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  isBoss: boolean;
  fireCooldown?: number;
};

export type Bullet = {
  id: number;
  char: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fromEnemy: boolean;
};

export type WaveConfig = {
  wave: number;
  letterPool: string[];
  baseHp: number;
  baseSpeed: number;
  spawnRate: number;
  killsToClear: number;
  isBossWave: boolean;
  bossChar?: string;
};

export type GameStats = {
  phase: Phase;
  score: number;
  wave: number;
  hp: number;
  maxHp: number;
  ammoChar: string;
  ammoIndex: number;
  waveKills: number;
  waveTarget: number;
};

export type InputState = {
  mouse: Vec2;
  firing: boolean;
  pauseRequested: boolean;
  weaponIndex: number | null;
};

export type Projected = {
  sx: number;
  sy: number;
  scale: number;
  visible: boolean;
};
