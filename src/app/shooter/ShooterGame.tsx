"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const WIDTH = 960;
const HEIGHT = 600;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BULLET_CHARS = [".", "/", ";"];
const BOSS_WORDS = [
  "RUSH",
  "FIRE",
  "RAGE",
  "DOOM",
  "BURN",
  "KILL",
  "HUNT",
  "WAVE",
  "CHAR",
  "SLAM",
  "NUKE",
  "MAUL",
  "BANE",
  "VOID",
];
const PLAYER_FONT_PX = 52;
const PLAYER_LETTER_W = 34;
const PLAYER_HALF_H = 34;

type Enemy = {
  id: string;
  ch: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  wobble: number;
  phase: number;
  groupId: string | null;
  isWordBoss: boolean;
  dead?: boolean;
};

type Shot = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ch: string;
  life: number;
};

type Particle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ch: string;
};

type WordGroup = { word: string; remaining: number };

type Banner = { text: string; life: number };

type GameState = {
  enemies: Enemy[];
  shots: Shot[];
  particles: Particle[];
  groups: Record<string, WordGroup>;
  spawnTimer: number;
  wordTimer: number;
  hitFlash: number;
  score: number;
  hp: number;
  wave: number;
  gameOver: boolean;
  banner: Banner | null;
};

function makeInitialState(): GameState {
  return {
    enemies: [],
    shots: [],
    particles: [],
    groups: {},
    spawnTimer: 0,
    wordTimer: 6000,
    hitFlash: 0,
    score: 0,
    hp: 5,
    wave: 1,
    gameOver: false,
    banner: null,
  };
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function createEnemy(wave: number): Enemy {
  const angle = rand(0, Math.PI * 2);
  const radius = rand(240, 360);
  const letterIndexMax = Math.min(LETTERS.length - 1, 4 + wave);
  const ch = LETTERS[Math.floor(rand(0, letterIndexMax + 1))];
  const hp = 1 + Math.floor(wave / 4);
  return {
    id: uid(),
    ch,
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
    z: rand(0.15, 0.45),
    hp,
    maxHp: hp,
    speed: 0.22 + wave * 0.018 + rand(0, 0.08),
    wobble: rand(0, Math.PI * 2),
    phase: rand(0, Math.PI * 2),
    groupId: null,
    isWordBoss: false,
  };
}

function createWordBoss(wave: number, word: string): Enemy[] {
  const angle = rand(0, Math.PI * 2);
  const radius = 420;
  const cx = CENTER_X + Math.cos(angle) * radius;
  const cy = CENTER_Y + Math.sin(angle) * radius;
  const tangentX = -Math.sin(angle);
  const tangentY = Math.cos(angle);
  const spacing = 46;
  const groupId = uid();
  const hp = 3 + Math.floor(wave * 0.75);
  const speed = 0.16 + wave * 0.013;
  const phase = rand(0, Math.PI * 2);
  const out: Enemy[] = [];
  for (let i = 0; i < word.length; i++) {
    const off = (i - (word.length - 1) / 2) * spacing;
    out.push({
      id: uid(),
      ch: word[i],
      x: cx + tangentX * off,
      y: cy + tangentY * off,
      z: 0.32,
      hp,
      maxHp: hp,
      speed,
      wobble: 0.2,
      phase,
      groupId,
      isWordBoss: true,
    });
  }
  return out;
}

function createShot(targetX: number, targetY: number, ch: string): Shot {
  const dx = targetX - CENTER_X;
  const dy = targetY - CENTER_Y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 11;
  return {
    id: uid(),
    x: CENTER_X,
    y: CENTER_Y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    ch,
    life: 55,
  };
}

function drawBackground(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.translate(CENTER_X, CENTER_Y);
  for (let i = 0; i < 11; i++) {
    const r = 40 + i * 45 + ((t * 0.05) % 45);
    ctx.strokeStyle = `rgba(120,160,255,${0.12 - i * 0.007})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + t * 0.0005;
    ctx.strokeStyle = "rgba(120,160,255,0.09)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
    ctx.lineTo(Math.cos(a) * 420, Math.sin(a) * 420);
    ctx.stroke();
  }
  ctx.restore();
}

function playerBox(name: string): {
  halfW: number;
  halfH: number;
} {
  return {
    halfW: Math.max(1, name.length) * PLAYER_LETTER_W,
    halfH: PLAYER_HALF_H,
  };
}

function drawPlayerArea(
  ctx: CanvasRenderingContext2D,
  name: string,
  t: number,
  flashing: boolean
): void {
  const { halfW, halfH } = playerBox(name);
  const pulse = 0.25 + 0.15 * Math.sin(t * 0.005);
  ctx.save();
  ctx.strokeStyle = flashing
    ? `rgba(255,120,120,${0.55 + pulse})`
    : `rgba(120,220,255,${0.35 + pulse})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  const pad = 10;
  const x = CENTER_X - halfW - pad;
  const y = CENTER_Y - halfH - pad;
  const w = halfW * 2 + pad * 2;
  const h = halfH * 2 + pad * 2;
  const r = 12;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  ctx.font = `bold ${PLAYER_FONT_PX}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 22;
  ctx.shadowColor = flashing
    ? "rgba(255,120,120,0.8)"
    : "rgba(100,180,255,0.65)";
  ctx.fillStyle = flashing
    ? "rgba(255,200,200,0.98)"
    : "rgba(200,240,255,0.98)";
  ctx.fillText(name, CENTER_X, CENTER_Y);
  ctx.restore();
}

function sanitizeName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

function finalizeName(raw: string): string {
  const cleaned = sanitizeName(raw);
  if (cleaned.length === 0) return "AAA";
  return cleaned.padEnd(3, cleaned[cleaned.length - 1]);
}

export default function ShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: CENTER_X, y: CENTER_Y });
  const frameRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const pointerDownRef = useRef(false);
  const ammoModeRef = useRef(0);
  const startedRef = useRef(false);
  const playerNameRef = useRef("AAA");
  const stateRef = useRef<GameState>(makeInitialState());

  const [started, setStarted] = useState(false);
  const [hp, setHp] = useState(5);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [ammoMode, setAmmoMode] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("AAA");

  const weaponLabel = useMemo(() => BULLET_CHARS[ammoMode], [ammoMode]);

  useEffect(() => {
    ammoModeRef.current = ammoMode;
  }, [ammoMode]);
  useEffect(() => {
    startedRef.current = started;
  }, [started]);
  useEffect(() => {
    playerNameRef.current = playerName.length === 0 ? "AAA" : playerName;
  }, [playerName]);

  const shoot = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver || !startedRef.current) return;
    s.shots.push(
      createShot(
        mouseRef.current.x,
        mouseRef.current.y,
        BULLET_CHARS[ammoModeRef.current]
      )
    );
  }, []);

  const startGame = useCallback(() => {
    setPlayerName((n) => finalizeName(n));
    stateRef.current = makeInitialState();
    setScore(0);
    setHp(5);
    setWave(1);
    setGameOver(false);
    setStarted(true);
  }, []);

  const restart = useCallback(() => {
    startGame();
  }, [startGame]);

  const onNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPlayerName(sanitizeName(e.target.value));
  }, []);

  const onNameBlur = useCallback(() => {
    setPlayerName((n) => finalizeName(n));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setAim = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((clientX - rect.left) / rect.width) * WIDTH,
        y: ((clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (e: MouseEvent) => setAim(e.clientX, e.clientY);
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        return;
      }
      keysRef.current[e.key.toLowerCase()] = true;
      if (["1", "2", "3"].includes(e.key)) setAmmoMode(Number(e.key) - 1);
      if (e.key.toLowerCase() === "r" && stateRef.current.gameOver) restart();
      if (e.code === "Space") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [restart]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let last = performance.now();

    const explode = (x: number, y: number, ch: string, big: boolean) => {
      const s = stateRef.current;
      const count = big ? 22 : 10;
      for (let i = 0; i < count; i++) {
        s.particles.push({
          id: uid(),
          x,
          y,
          vx: rand(-3, 3),
          vy: rand(-3, 3),
          life: rand(18, big ? 52 : 34),
          ch,
        });
      }
    };

    const update = (dt: number) => {
      const s = stateRef.current;
      if (s.gameOver) return;

      const playerName = playerNameRef.current;
      const { halfW, halfH } = playerBox(playerName);

      s.spawnTimer -= dt;
      const spawnEvery = Math.max(210, 900 - s.wave * 45);
      const desiredCount = Math.min(20, 3 + s.wave);
      if (s.spawnTimer <= 0 && s.enemies.length < desiredCount) {
        s.enemies.push(createEnemy(s.wave));
        if (s.wave > 3 && Math.random() < 0.25) {
          s.enemies.push(createEnemy(s.wave));
        }
        s.spawnTimer = spawnEvery;
      }

      s.wordTimer -= dt;
      if (s.wave >= 2 && s.wordTimer <= 0) {
        const word = pick(BOSS_WORDS);
        const letters = createWordBoss(s.wave, word);
        if (letters[0]?.groupId) {
          s.groups[letters[0].groupId] = {
            word,
            remaining: word.length,
          };
        }
        s.enemies.push(...letters);
        s.wordTimer = Math.max(3500, 8500 - s.wave * 350);
      }

      for (const shot of s.shots) {
        shot.x += shot.vx;
        shot.y += shot.vy;
        shot.life -= 1;
      }
      s.shots = s.shots.filter(
        (shot) =>
          shot.life > 0 &&
          shot.x > -40 &&
          shot.x < WIDTH + 40 &&
          shot.y > -40 &&
          shot.y < HEIGHT + 40
      );

      for (const enemy of s.enemies) {
        enemy.phase += 0.02;
        const toCX = CENTER_X - enemy.x;
        const toCY = CENTER_Y - enemy.y;
        const len = Math.hypot(toCX, toCY) || 1;
        const nx = toCX / len;
        const ny = toCY / len;
        const strafeX = -ny * Math.sin(enemy.phase + enemy.wobble) * 0.6;
        const strafeY = nx * Math.sin(enemy.phase + enemy.wobble) * 0.6;
        enemy.x += (nx * enemy.speed + strafeX) * (dt / 16);
        enemy.y += (ny * enemy.speed + strafeY) * (dt / 16);
        enemy.z += 0.0025 * (enemy.speed + s.wave * 0.05) * (dt / 16);

        const dx = Math.abs(enemy.x - CENTER_X);
        const dy = Math.abs(enemy.y - CENTER_Y);
        if ((dx < halfW + 8 && dy < halfH + 8) || enemy.z > 1.5) {
          s.hp -= enemy.isWordBoss ? 2 : 1;
          s.hitFlash = 12;
          explode(enemy.x, enemy.y, enemy.ch, enemy.isWordBoss);
          enemy.dead = true;
          if (enemy.groupId && s.groups[enemy.groupId]) {
            s.groups[enemy.groupId].remaining -= 1;
            if (s.groups[enemy.groupId].remaining <= 0) {
              delete s.groups[enemy.groupId];
            }
          }
          if (s.hp <= 0) {
            s.gameOver = true;
            setGameOver(true);
          }
        }
      }

      for (const shot of s.shots) {
        for (const enemy of s.enemies) {
          if (enemy.dead) continue;
          const scale = 0.7 + enemy.z * 1.6;
          const hitRadius = (enemy.isWordBoss ? 18 : 12) + scale * 8;
          const d = Math.hypot(shot.x - enemy.x, shot.y - enemy.y);
          if (d < hitRadius) {
            enemy.hp -= 1;
            shot.life = 0;
            if (enemy.hp <= 0) {
              enemy.dead = true;
              s.score += enemy.isWordBoss
                ? 25 + s.wave * 4
                : 10 + s.wave * 2;
              explode(enemy.x, enemy.y, enemy.ch, enemy.isWordBoss);
              if (enemy.groupId && s.groups[enemy.groupId]) {
                s.groups[enemy.groupId].remaining -= 1;
                if (s.groups[enemy.groupId].remaining <= 0) {
                  const completed = s.groups[enemy.groupId].word;
                  const bonus = 100 + s.wave * 25;
                  s.score += bonus;
                  s.banner = {
                    text: `${completed} destroyed  +${bonus}`,
                    life: 110,
                  };
                  delete s.groups[enemy.groupId];
                }
              }
            }
            break;
          }
        }
      }

      s.enemies = s.enemies.filter((e) => !e.dead);
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      const nextWave = 1 + Math.floor(s.score / 120);
      if (nextWave !== s.wave) s.wave = nextWave;
      if (s.hitFlash > 0) s.hitFlash -= 1;
      if (s.banner) {
        s.banner.life -= 1;
        if (s.banner.life <= 0) s.banner = null;
      }

      setScore(s.score);
      setHp(s.hp);
      setWave(s.wave);

      if (keysRef.current[" "] || pointerDownRef.current) shoot();
    };

    const draw = (now: number) => {
      const s = stateRef.current;
      drawBackground(ctx, now);
      drawPlayerArea(ctx, playerNameRef.current, now, s.hitFlash > 0);

      // Connecting underlines for word bosses.
      const byGroup: Record<string, Enemy[]> = {};
      for (const e of s.enemies) {
        if (!e.groupId) continue;
        (byGroup[e.groupId] ??= []).push(e);
      }
      for (const gid in byGroup) {
        const group = byGroup[gid];
        if (group.length < 2) continue;
        ctx.save();
        ctx.strokeStyle = "rgba(255,210,120,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        group.sort((a, b) => a.x - b.x);
        ctx.moveTo(group[0].x, group[0].y + 18);
        for (let i = 1; i < group.length; i++) {
          ctx.lineTo(group[i].x, group[i].y + 18);
        }
        ctx.stroke();
        ctx.restore();
      }

      const enemies = [...s.enemies].sort((a, b) => a.z - b.z);
      for (const enemy of enemies) {
        const size =
          (enemy.isWordBoss ? 26 : 18) + enemy.z * (enemy.isWordBoss ? 54 : 42);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${enemy.isWordBoss ? "bold " : ""}${size}px monospace`;
        if (enemy.isWordBoss) {
          ctx.fillStyle = `rgba(255,${220 - enemy.z * 30},${
            120 - enemy.z * 20
          },0.98)`;
          ctx.shadowBlur = 24;
          ctx.shadowColor = "rgba(255,180,60,0.6)";
        } else {
          ctx.fillStyle = `rgba(255,${180 - enemy.z * 40},${
            140 - enemy.z * 30
          },0.95)`;
          ctx.shadowBlur = 16;
          ctx.shadowColor = "rgba(255,120,80,0.35)";
        }
        ctx.fillText(enemy.ch, 0, 0);
        ctx.restore();

        if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) {
          const barW = size * 0.9;
          const barH = 3;
          const bx = enemy.x - barW / 2;
          const by = enemy.y - size * 0.75;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(bx, by, barW, barH);
          ctx.fillStyle = "rgba(255,140,100,0.9)";
          ctx.fillRect(bx, by, barW * (enemy.hp / enemy.maxHp), barH);
        }
      }

      for (const shot of s.shots) {
        ctx.save();
        ctx.font = "24px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(200,240,255,0.98)";
        ctx.fillText(shot.ch, shot.x, shot.y);
        ctx.restore();
      }

      for (const p of s.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 34);
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,220,180,0.85)";
        ctx.fillText(p.ch, p.x, p.y);
        ctx.restore();
      }

      // HUD
      ctx.save();
      ctx.font = "16px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(`HP ${s.hp}`, 20, 30);
      ctx.fillText(`SCORE ${s.score}`, 100, 30);
      ctx.fillText(`WAVE ${s.wave}`, 230, 30);
      ctx.fillText(`AMMO ${BULLET_CHARS[ammoModeRef.current]}`, 340, 30);
      ctx.fillText(`NAME ${playerNameRef.current}`, 460, 30);
      ctx.fillStyle = "rgba(170,190,255,0.85)";
      ctx.fillText(
        "Aim with mouse or finger \u2022 tap / click / SPACE to shoot \u2022 1 2 3 switch ammo",
        20,
        HEIGHT - 18
      );
      ctx.restore();

      if (s.banner) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 28px monospace";
        ctx.fillStyle = `rgba(255,210,120,${Math.min(1, s.banner.life / 30)})`;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "rgba(255,180,60,0.6)";
        ctx.fillText(s.banner.text, CENTER_X, 80);
        ctx.restore();
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      ctx.save();
      ctx.strokeStyle = "rgba(220,240,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 14, my);
      ctx.lineTo(mx - 4, my);
      ctx.moveTo(mx + 4, my);
      ctx.lineTo(mx + 14, my);
      ctx.moveTo(mx, my - 14);
      ctx.lineTo(mx, my - 4);
      ctx.moveTo(mx, my + 4);
      ctx.lineTo(mx, my + 14);
      ctx.stroke();
      ctx.restore();

      if (s.hitFlash > 0) {
        ctx.fillStyle = `rgba(255,0,0,${s.hitFlash / 30})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      if (s.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.font = "bold 38px monospace";
        ctx.fillText("GAME OVER", CENTER_X, CENTER_Y - 20);
        ctx.font = "20px monospace";
        ctx.fillText(`Final score: ${s.score}`, CENTER_X, CENTER_Y + 18);
        ctx.fillText("Tap Reset or press R to restart", CENTER_X, CENTER_Y + 52);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(33, now - last);
      last = now;
      update(dt);
      draw(now);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    const setAim = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((clientX - rect.left) / rect.width) * WIDTH,
        y: ((clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const t = e.touches[0];
      setAim(t.clientX, t.clientY);
    };
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [started, shoot]);

  // Draw idle/start screen.
  useEffect(() => {
    if (started) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const tick = (now: number) => {
      drawBackground(ctx, now);
      drawPlayerArea(
        ctx,
        playerName.length === 0 ? "AAA" : playerName,
        now,
        false
      );
      ctx.fillStyle = "rgba(4,8,20,0.45)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.font = "bold 46px monospace";
      ctx.fillText("LETTER FPS", CENTER_X, 130);
      ctx.font = "20px monospace";
      ctx.fillStyle = "rgba(220,230,255,0.92)";
      ctx.fillText(
        "Letters rush you. Words form and hit harder.",
        CENTER_X,
        170
      );
      ctx.fillStyle = "rgba(170,220,255,0.85)";
      ctx.fillText(
        "Your name is your body - defend it.",
        CENTER_X,
        HEIGHT - 120
      );
      ctx.fillText(
        "Pick a 3-letter name above, then tap Start.",
        CENTER_X,
        HEIGHT - 90
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, playerName]);

  const onCanvasPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * WIDTH,
        y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
      };
      pointerDownRef.current = true;
      if (e.pointerType === "touch") e.preventDefault();
      shoot();
    },
    [shoot]
  );
  const onCanvasPointerUp = useCallback(() => {
    pointerDownRef.current = false;
  }, []);
  const onCanvasPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType !== "touch") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * WIDTH,
        y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
      };
    },
    []
  );

  return (
    <div className="min-h-[100svh] bg-slate-950 text-slate-100 p-2 sm:p-6 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-6xl">
        <div className="mb-2 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
              Letter FPS prototype
            </h1>
            <p className="text-slate-300 text-xs sm:text-base">
              Letters rush you. Words form and hit harder. Your name is your
              body.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm">
              <span className="text-slate-400 uppercase tracking-wider text-xs">
                Name
              </span>
              <input
                value={playerName}
                onChange={onNameChange}
                onBlur={onNameBlur}
                maxLength={3}
                disabled={started && !gameOver}
                placeholder="AAA"
                className="w-14 bg-transparent font-mono text-lg uppercase outline-none placeholder:text-slate-500 disabled:opacity-60"
                aria-label="Three letter player name"
              />
            </label>
            <button
              type="button"
              onClick={startGame}
              disabled={started && !gameOver}
              className="touch-manipulation rounded-2xl bg-white/10 px-4 py-2 text-sm sm:text-base hover:bg-white/20 active:bg-white/30 disabled:opacity-40"
            >
              Start
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                shoot();
              }}
              className="touch-manipulation rounded-2xl bg-cyan-400/20 px-4 py-2 text-sm sm:text-base hover:bg-cyan-400/30 active:bg-cyan-400/40"
            >
              Fire
            </button>
            <button
              type="button"
              onClick={restart}
              className="touch-manipulation rounded-2xl bg-white/10 px-4 py-2 text-sm sm:text-base hover:bg-white/20 active:bg-white/30"
            >
              Reset
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={onCanvasPointerDown}
          onPointerUp={onCanvasPointerUp}
          onPointerMove={onCanvasPointerMove}
          onPointerCancel={onCanvasPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="block w-full touch-none select-none rounded-2xl border border-white/10 bg-slate-900 shadow-2xl sm:rounded-3xl"
          style={{
            aspectRatio: `${WIDTH} / ${HEIGHT}`,
            maxHeight: "72svh",
          }}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">
            Ammo
          </span>
          {BULLET_CHARS.map((ch, i) => (
            <button
              key={ch}
              type="button"
              onClick={() => setAmmoMode(i)}
              className={`touch-manipulation rounded-xl px-4 py-2 font-mono text-lg transition ${
                ammoMode === i
                  ? "bg-cyan-400/30 text-white ring-1 ring-cyan-300/60"
                  : "bg-white/10 text-slate-200 hover:bg-white/20"
              }`}
              aria-pressed={ammoMode === i}
              aria-label={`Ammo ${ch}`}
            >
              {ch}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            HP {hp} &bull; Score {score} &bull; Wave {wave} &bull; Ammo{" "}
            <span className="font-mono text-slate-200">{weaponLabel}</span>
            {gameOver && <span className="text-rose-300"> &bull; Game over</span>}
          </span>
        </div>

        <div className="mt-4 hidden gap-3 sm:grid md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Player zone</div>
            <div className="mt-1 text-sm">
              The dashed outline around{" "}
              <span className="font-mono">{playerName || "AAA"}</span> is the
              area attackers need to reach. Pick a shorter name for a smaller
              hitbox.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Word bosses</div>
            <div className="mt-1 text-sm">
              From wave 2, letters arrive in coordinated words
              (<span className="font-mono">RUSH</span>,{" "}
              <span className="font-mono">DOOM</span>,{" "}
              <span className="font-mono">FIRE</span> ...). They are tougher,
              hit harder, and pay a bonus when fully destroyed.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Ammo gimmick</div>
            <div className="mt-1 text-sm">
              Bullets are punctuation marks:{" "}
              <span className="font-mono">.</span>,{" "}
              <span className="font-mono">/</span>,{" "}
              <span className="font-mono">;</span>. Switch with 1 2 3 or the
              buttons above.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
