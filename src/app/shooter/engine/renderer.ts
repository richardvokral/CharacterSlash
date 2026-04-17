import type { Bullet, Enemy, Vec2 } from "./types";
import { project } from "./physics";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#020617");
  sky.addColorStop(0.55, "#0f172a");
  sky.addColorStop(0.6, "#1e293b");
  sky.addColorStop(1, "#020617");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const horizon = h * 0.6;

  ctx.strokeStyle = "rgba(56,189,248,0.28)";
  ctx.lineWidth = 1;

  const rows = 16;
  for (let i = 1; i <= rows; i++) {
    const p = i / rows;
    const eased = Math.pow(p, 2.2);
    const y = horizon + (h - horizon) * eased;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const cols = 20;
  for (let i = -cols; i <= cols; i++) {
    const offset = ((i + (t * 0.00002) * cols) % (cols * 2)) - cols;
    const x = w / 2 + offset * (w / cols);
    ctx.beginPath();
    ctx.moveTo(w / 2, horizon);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(148,163,184,0.12)";
  for (let i = 0; i < 40; i++) {
    const sx = (i * 127 + Math.floor(t * 0.02)) % w;
    const sy = (i * 53) % (horizon - 20);
    ctx.fillRect(sx, sy, 2, 2);
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  w: number,
  h: number
): void {
  const p = project(e.x, e.y, e.z, w, h);
  if (!p.visible) return;
  const size = 40 * p.scale * e.size;
  if (size < 2) return;
  const hpRatio = e.hp / e.maxHp;
  const r = Math.round(239 - hpRatio * 80);
  const g = Math.round(68 + hpRatio * 100);
  const b = Math.round(68 + hpRatio * 20);
  ctx.font = `bold ${size}px var(--font-geist-mono), ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;
  ctx.shadowBlur = Math.min(24, size * 0.4);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(e.char, p.sx, p.sy);
  ctx.shadowBlur = 0;

  if (e.isBoss || hpRatio < 1) {
    const barW = size * 1.2;
    const barH = Math.max(3, size * 0.08);
    const bx = p.sx - barW / 2;
    const by = p.sy - size * 0.7;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(bx, by, barW * hpRatio, barH);
  }
}

export function drawBullet(
  ctx: CanvasRenderingContext2D,
  b: Bullet,
  w: number,
  h: number
): void {
  const p = project(b.x, b.y, b.z, w, h);
  if (!p.visible) return;
  const size = 28 * p.scale;
  if (size < 1) return;
  ctx.font = `bold ${size}px var(--font-geist-mono), ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = b.fromEnemy ? "#f87171" : "#fef08a";
  ctx.shadowColor = b.fromEnemy ? "#dc2626" : "#facc15";
  ctx.shadowBlur = 10;
  ctx.fillText(b.char, p.sx, p.sy);
  ctx.shadowBlur = 0;
}

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  m: Vec2
): void {
  ctx.strokeStyle = "rgba(250,250,250,0.85)";
  ctx.lineWidth = 1.5;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(m.x - r, m.y);
  ctx.lineTo(m.x - 4, m.y);
  ctx.moveTo(m.x + 4, m.y);
  ctx.lineTo(m.x + r, m.y);
  ctx.moveTo(m.x, m.y - r);
  ctx.lineTo(m.x, m.y - 4);
  ctx.moveTo(m.x, m.y + 4);
  ctx.lineTo(m.x, m.y + r);
  ctx.stroke();
  ctx.fillStyle = "rgba(250,250,250,0.9)";
  ctx.beginPath();
  ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}
