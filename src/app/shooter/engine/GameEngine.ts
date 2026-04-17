import type { Bullet, Enemy, GameStats, Phase, WaveConfig } from "./types";
import { getWaveConfig, spawnBoss, spawnEnemy } from "./spawner";
import {
  BULLET_SPEED,
  FAR_Z,
  NEAR_Z,
  bulletEnemyHit,
  enemyBulletHitsPlayer,
  project,
  updateBullets,
  updateEnemies,
} from "./physics";
import {
  drawBackground,
  drawBullet,
  drawCrosshair,
  drawEnemy,
} from "./renderer";
import { InputManager } from "./input";

const AMMO_POOL = [".", ",", "/", ";", ":", "-", "'"];
const WEAPONS = [".", "/", ":", ";"];

type StatsListener = (s: GameStats) => void;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private input: InputManager;
  private onStats: StatsListener;

  private phase: Phase = "start";
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private wave = 0;
  private waveConfig: WaveConfig;
  private score = 0;
  private hp = 100;
  private maxHp = 100;
  private waveKills = 0;
  private spawnAccumulator = 0;
  private ammoIndex = 0;
  private bossSpawned = false;

  private lastFrame = 0;
  private rafId: number | null = null;
  private running = false;
  private bulletId = 1;

  private statsTimer = 0;
  private lastEmitted = "";

  constructor(
    canvas: HTMLCanvasElement,
    target: HTMLElement,
    onStats: StatsListener
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.input = new InputManager(target);
    this.onStats = onStats;
    this.waveConfig = getWaveConfig(1);
  }

  start(): void {
    this.input.attach();
    this.resetGame();
    this.phase = "playing";
    this.running = true;
    this.lastFrame = performance.now();
    this.loop(this.lastFrame);
    this.emitStats(true);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.input.detach();
  }

  pause(): void {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.emitStats(true);
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.lastFrame = performance.now();
    this.emitStats(true);
  }

  restart(): void {
    this.resetGame();
    this.phase = "playing";
    this.lastFrame = performance.now();
    this.emitStats(true);
  }

  private resetGame(): void {
    this.enemies = [];
    this.bullets = [];
    this.wave = 1;
    this.waveConfig = getWaveConfig(1);
    this.score = 0;
    this.hp = this.maxHp;
    this.waveKills = 0;
    this.spawnAccumulator = 0;
    this.ammoIndex = 0;
    this.bossSpawned = false;
  }

  private loop = (ts: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (ts - this.lastFrame) / 1000);
    this.lastFrame = ts;

    this.handleInput();

    if (this.phase === "playing") {
      this.update(dt);
    }
    this.render(ts);

    this.statsTimer += dt;
    if (this.statsTimer > 0.1) {
      this.emitStats(false);
      this.statsTimer = 0;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private handleInput(): void {
    if (this.input.consumePause()) {
      if (this.phase === "playing") this.pause();
      else if (this.phase === "paused") this.resume();
    }
    const wi = this.input.consumeWeapon();
    if (wi !== null && wi >= 0 && wi < WEAPONS.length) {
      this.ammoIndex = wi;
    }
    if (this.phase === "playing" && this.input.consumeFire()) {
      this.fire();
    }
  }

  private fire(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const m = this.input.state.mouse;
    const aimZ = 300;
    const scaleAtAim = 320 / aimZ;
    const worldX = (m.x - w / 2) / scaleAtAim;
    const worldY = (m.y - h / 2) / scaleAtAim;

    const dx = worldX;
    const dy = worldY;
    const dz = aimZ - NEAR_Z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const vx = (dx / len) * BULLET_SPEED;
    const vy = (dy / len) * BULLET_SPEED;
    const vz = (dz / len) * BULLET_SPEED;

    const weaponChar = WEAPONS[this.ammoIndex] ?? AMMO_POOL[0];
    this.bullets.push({
      id: this.bulletId++,
      char: weaponChar,
      x: 0,
      y: 0,
      z: NEAR_Z + 5,
      vx,
      vy,
      vz,
      fromEnemy: false,
    });
  }

  private enemyFire(e: Enemy): void {
    const dx = -e.x;
    const dy = -e.y;
    const dz = -(e.z - NEAR_Z);
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const speed = 220;
    this.bullets.push({
      id: this.bulletId++,
      char: "*",
      x: e.x,
      y: e.y,
      z: e.z,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      vz: (dz / len) * speed,
      fromEnemy: true,
    });
  }

  private update(dt: number): void {
    updateEnemies(this.enemies, dt);
    updateBullets(this.bullets, dt);

    if (this.waveConfig.isBossWave) {
      if (!this.bossSpawned) {
        this.enemies.push(spawnBoss(this.waveConfig));
        this.bossSpawned = true;
      }
      for (const e of this.enemies) {
        if (e.isBoss && e.fireCooldown !== undefined && e.fireCooldown <= 0) {
          this.enemyFire(e);
          e.fireCooldown = 1.5 + Math.random() * 1.5;
        }
      }
    } else {
      this.spawnAccumulator += dt;
      const spawnInterval = 1 / this.waveConfig.spawnRate;
      while (this.spawnAccumulator >= spawnInterval) {
        this.spawnAccumulator -= spawnInterval;
        this.enemies.push(spawnEnemy(this.waveConfig));
      }
    }

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    for (const b of this.bullets) {
      if (b.fromEnemy) continue;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (bulletEnemyHit(b, e, w, h)) {
          e.hp -= 1;
          b.z = -1;
          if (e.hp <= 0) {
            this.score += e.isBoss ? 500 : 10 * this.wave;
            this.waveKills += 1;
          }
          break;
        }
      }
    }

    for (const b of this.bullets) {
      if (enemyBulletHitsPlayer(b)) {
        this.hp = Math.max(0, this.hp - 8);
      }
    }

    for (const e of this.enemies) {
      if (e.hp > 0 && e.z <= NEAR_Z) {
        this.hp = Math.max(0, this.hp - (e.isBoss ? 25 : 10));
        e.hp = 0;
      }
    }

    this.enemies = this.enemies.filter((e) => e.hp > 0 && e.z > NEAR_Z - 5);
    this.bullets = this.bullets.filter(
      (b) => b.z > NEAR_Z - 20 && b.z < FAR_Z + 100
    );

    if (this.hp <= 0) {
      this.phase = "gameover";
      this.emitStats(true);
      return;
    }

    const target = this.waveConfig.killsToClear;
    const cleared = this.waveConfig.isBossWave
      ? this.waveKills >= 1
      : this.waveKills >= target;
    if (cleared) {
      this.wave += 1;
      this.waveConfig = getWaveConfig(this.wave);
      this.waveKills = 0;
      this.spawnAccumulator = 0;
      this.bossSpawned = false;
    }
  }

  private render(ts: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
    drawBackground(this.ctx, w, h, ts);

    const sorted = [...this.enemies].sort((a, b) => b.z - a.z);
    for (const e of sorted) drawEnemy(this.ctx, e, w, h);

    for (const b of this.bullets) drawBullet(this.ctx, b, w, h);

    if (this.phase === "playing") {
      drawCrosshair(this.ctx, this.input.state.mouse);
    }
  }

  private emitStats(force: boolean): void {
    const kt = this.waveConfig.isBossWave ? 1 : this.waveConfig.killsToClear;
    const stats: GameStats = {
      phase: this.phase,
      score: this.score,
      wave: this.wave,
      hp: this.hp,
      maxHp: this.maxHp,
      ammoChar: WEAPONS[this.ammoIndex] ?? ".",
      ammoIndex: this.ammoIndex,
      waveKills: this.waveKills,
      waveTarget: kt,
    };
    const key = `${stats.phase}|${stats.score}|${stats.wave}|${stats.hp}|${stats.ammoIndex}|${stats.waveKills}`;
    if (!force && key === this.lastEmitted) return;
    this.lastEmitted = key;
    this.onStats(stats);
  }

  // Kept for tests / potential tooling.
  static _project = project;
}
