import type { Enemy, WaveConfig } from "./types";
import { FAR_Z } from "./physics";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function getWaveConfig(wave: number): WaveConfig {
  const isBossWave = wave > 0 && wave % 5 === 0;
  const poolSize = Math.min(3 + wave, ALPHABET.length);
  const letterPool = ALPHABET.slice(0, poolSize).split("");
  return {
    wave,
    letterPool,
    baseHp: 1 + Math.floor(wave / 2),
    baseSpeed: 40 + wave * 6,
    spawnRate: Math.min(2.5, 0.5 + wave * 0.15),
    killsToClear: 5 + wave * 2,
    isBossWave,
    bossChar: isBossWave ? String(wave / 5) : undefined,
  };
}

let nextId = 1;

export function makeEnemyId(): number {
  return nextId++;
}

export function spawnEnemy(cfg: WaveConfig): Enemy {
  const char = cfg.letterPool[Math.floor(Math.random() * cfg.letterPool.length)];
  const x = (Math.random() - 0.5) * 600;
  const y = (Math.random() - 0.5) * 200;
  const speedJitter = 0.8 + Math.random() * 0.4;
  return {
    id: makeEnemyId(),
    char,
    x,
    y,
    z: FAR_Z,
    hp: cfg.baseHp,
    maxHp: cfg.baseHp,
    speed: cfg.baseSpeed * speedJitter,
    size: 1,
    isBoss: false,
  };
}

export function spawnBoss(cfg: WaveConfig): Enemy {
  const hp = 30 + cfg.wave * 5;
  return {
    id: makeEnemyId(),
    char: cfg.bossChar ?? String(Math.max(1, Math.floor(cfg.wave / 5))),
    x: 0,
    y: 0,
    z: FAR_Z,
    hp,
    maxHp: hp,
    speed: cfg.baseSpeed * 0.6,
    size: 3,
    isBoss: true,
    fireCooldown: 2,
  };
}
