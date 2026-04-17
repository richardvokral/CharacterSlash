"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const WIDTH = 960;
const HEIGHT = 600;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BULLET_CHARS = [".", "/", ";"];

type Enemy = {
  id: string;
  ch: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  speed: number;
  wobble: number;
  phase: number;
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

type GameState = {
  enemies: Enemy[];
  shots: Shot[];
  particles: Particle[];
  spawnTimer: number;
  hitFlash: number;
  score: number;
  hp: number;
  wave: number;
  gameOver: boolean;
};

function makeInitialState(): GameState {
  return {
    enemies: [],
    shots: [],
    particles: [],
    spawnTimer: 0,
    hitFlash: 0,
    score: 0,
    hp: 5,
    wave: 1,
    gameOver: false,
  };
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function createEnemy(wave: number): Enemy {
  const angle = rand(0, Math.PI * 2);
  const radius = rand(220, 340);
  const letterIndexMax = Math.min(LETTERS.length - 1, 4 + wave);
  const ch = LETTERS[Math.floor(rand(0, letterIndexMax + 1))];
  return {
    id: uid(),
    ch,
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
    z: rand(0.15, 0.45),
    hp: 1 + Math.floor(wave / 4),
    speed: 0.22 + wave * 0.018 + rand(0, 0.08),
    wobble: rand(0, Math.PI * 2),
    phase: rand(0, Math.PI * 2),
  };
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

export default function ShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: CENTER_X, y: CENTER_Y });
  const frameRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const pointerDownRef = useRef(false);
  const ammoModeRef = useRef(0);
  const startedRef = useRef(false);
  const stateRef = useRef<GameState>(makeInitialState());

  const [started, setStarted] = useState(false);
  const [hp, setHp] = useState(5);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [ammoMode, setAmmoMode] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const weaponLabel = useMemo(() => BULLET_CHARS[ammoMode], [ammoMode]);

  useEffect(() => {
    ammoModeRef.current = ammoMode;
  }, [ammoMode]);
  useEffect(() => {
    startedRef.current = started;
  }, [started]);

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

  const restart = useCallback(() => {
    stateRef.current = makeInitialState();
    setScore(0);
    setHp(5);
    setWave(1);
    setGameOver(false);
    setStarted(true);
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

    const setAim = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((clientX - rect.left) / rect.width) * WIDTH,
        y: ((clientY - rect.top) / rect.height) * HEIGHT,
      };
    };

    const explode = (x: number, y: number, ch: string) => {
      const s = stateRef.current;
      for (let i = 0; i < 10; i++) {
        s.particles.push({
          id: uid(),
          x,
          y,
          vx: rand(-2.5, 2.5),
          vy: rand(-2.5, 2.5),
          life: rand(18, 34),
          ch,
        });
      }
    };

    const update = (dt: number) => {
      const s = stateRef.current;
      if (s.gameOver) return;

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

        if (
          Math.hypot(enemy.x - CENTER_X, enemy.y - CENTER_Y) < 28 ||
          enemy.z > 1.4
        ) {
          s.hp -= 1;
          s.hitFlash = 10;
          explode(enemy.x, enemy.y, enemy.ch);
          enemy.dead = true;
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
          const hitRadius = 12 + scale * 8;
          const d = Math.hypot(shot.x - enemy.x, shot.y - enemy.y);
          if (d < hitRadius) {
            enemy.hp -= 1;
            shot.life = 0;
            if (enemy.hp <= 0) {
              enemy.dead = true;
              s.score += 10 + s.wave * 2;
              explode(enemy.x, enemy.y, enemy.ch);
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

      setScore(s.score);
      setHp(s.hp);
      setWave(s.wave);

      if (keysRef.current[" "] || pointerDownRef.current) shoot();
    };

    const draw = (now: number) => {
      const s = stateRef.current;
      drawBackground(ctx, now);

      ctx.save();
      ctx.font = "16px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(`HP ${s.hp}`, 20, 30);
      ctx.fillText(`SCORE ${s.score}`, 100, 30);
      ctx.fillText(`WAVE ${s.wave}`, 230, 30);
      ctx.fillText(`AMMO ${BULLET_CHARS[ammoModeRef.current]}`, 340, 30);
      ctx.fillStyle = "rgba(170,190,255,0.9)";
      ctx.fillText(
        "Aim with mouse or finger \u2022 tap / click / SPACE to shoot \u2022 1 2 3 switch ammo",
        20,
        HEIGHT - 18
      );
      ctx.restore();

      const enemies = [...s.enemies].sort((a, b) => a.z - b.z);
      for (const enemy of enemies) {
        const size = 18 + enemy.z * 42;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${size}px monospace`;
        ctx.fillStyle = `rgba(255,${180 - enemy.z * 40},${
          140 - enemy.z * 30
        },0.95)`;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "rgba(255,120,80,0.35)";
        ctx.fillText(enemy.ch, 0, 0);
        ctx.restore();
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

  // Draw the idle/start screen when not playing.
  useEffect(() => {
    if (started) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawBackground(ctx, performance.now());
    ctx.fillStyle = "rgba(4,8,20,0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 44px monospace";
    ctx.fillText("LETTER FPS", CENTER_X, CENTER_Y - 60);
    ctx.font = "20px monospace";
    ctx.fillText("Shoot A, B, C ... as they rush toward you", CENTER_X, CENTER_Y - 16);
    ctx.fillText("Your bullets are .   /   ;", CENTER_X, CENTER_Y + 16);
    ctx.fillText("Tap Start below", CENTER_X, CENTER_Y + 60);
  }, [started]);

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
      if (e.pointerType === "touch") {
        e.preventDefault();
      }
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
    <div className="min-h-[100svh] bg-slate-950 text-slate-100 p-3 sm:p-6 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-6xl">
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Letter FPS prototype
            </h1>
            <p className="text-slate-300 text-sm sm:text-base">
              A lightweight browser shooter where letters become the enemies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="touch-manipulation rounded-2xl bg-white/10 px-4 py-2 text-sm sm:text-base hover:bg-white/20 active:bg-white/30"
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
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        />

        <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
          {BULLET_CHARS.map((ch, i) => (
            <button
              key={ch}
              type="button"
              onClick={() => setAmmoMode(i)}
              className={`touch-manipulation rounded-xl px-4 py-2 font-mono text-lg ${
                ammoMode === i
                  ? "bg-cyan-400/30 text-white"
                  : "bg-white/10 text-slate-200"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Core idea</div>
            <div className="mt-1 text-sm">
              Letters rush the player from the screen depth plane. Difficulty
              rises by faster spawns and tougher letters.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Ammo gimmick</div>
            <div className="mt-1 text-sm">
              Bullets are punctuation marks:{" "}
              <span className="font-mono">.</span>,{" "}
              <span className="font-mono">/</span>,{" "}
              <span className="font-mono">;</span>. Current:{" "}
              <span className="font-mono">{weaponLabel}</span>
              <span className="text-slate-400"> • HP {hp} • Score {score} • Wave {wave}</span>
              {gameOver && <span className="text-rose-300"> • Game over</span>}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Deployment</div>
            <div className="mt-1 text-sm">
              This prototype is static and deploys to Vercel, Cloudflare Pages,
              Netlify, or GitHub Pages.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
