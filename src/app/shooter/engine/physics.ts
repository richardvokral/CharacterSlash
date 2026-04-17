import type { Bullet, Enemy, Projected } from "./types";

export const FOCAL = 320;
export const FAR_Z = 1000;
export const NEAR_Z = 20;
export const BULLET_SPEED = 900;

export function project(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number
): Projected {
  if (z <= 1) return { sx: 0, sy: 0, scale: 0, visible: false };
  const scale = FOCAL / z;
  return {
    sx: w / 2 + x * scale,
    sy: h / 2 + y * scale,
    scale,
    visible: z > NEAR_Z && z < FAR_Z + 200,
  };
}

export function updateEnemies(enemies: Enemy[], dt: number): void {
  for (const e of enemies) {
    e.z -= e.speed * dt;
    if (e.fireCooldown !== undefined) {
      e.fireCooldown -= dt;
    }
  }
}

export function updateBullets(bullets: Bullet[], dt: number): void {
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  }
}

export function bulletEnemyHit(
  b: Bullet,
  e: Enemy,
  w: number,
  h: number
): boolean {
  if (Math.abs(b.z - e.z) > 80) return false;
  const pe = project(e.x, e.y, e.z, w, h);
  const pb = project(b.x, b.y, b.z, w, h);
  if (!pe.visible || !pb.visible) return false;
  const dx = pb.sx - pe.sx;
  const dy = pb.sy - pe.sy;
  const hitRadius = 24 * pe.scale * e.size;
  return dx * dx + dy * dy < hitRadius * hitRadius;
}

export function enemyBulletHitsPlayer(b: Bullet): boolean {
  return b.fromEnemy && b.z <= NEAR_Z;
}
