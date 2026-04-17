"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine } from "./engine/GameEngine";
import type { GameStats } from "./engine/types";
import { HUD } from "./components/HUD";
import { StartScreen } from "./components/StartScreen";
import { PauseOverlay } from "./components/PauseOverlay";
import { GameOverScreen } from "./components/GameOverScreen";

const INITIAL_STATS: GameStats = {
  phase: "start",
  score: 0,
  wave: 1,
  hp: 100,
  maxHp: 100,
  ammoChar: ".",
  ammoIndex: 0,
  waveKills: 0,
  waveTarget: 7,
};

export default function ShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);

  const handleStats = useCallback((s: GameStats) => {
    setStats(s);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const engine = new GameEngine(canvas, wrapper, handleStats);
    engineRef.current = engine;

    return () => {
      window.removeEventListener("resize", resize);
      engine.stop();
      engineRef.current = null;
    };
  }, [handleStats]);

  const onStart = useCallback(() => {
    engineRef.current?.start();
  }, []);
  const onResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);
  const onRestart = useCallback(() => {
    engineRef.current?.restart();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative h-screen w-screen cursor-crosshair overflow-hidden bg-black select-none"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {stats.phase !== "start" && stats.phase !== "gameover" && (
        <HUD stats={stats} />
      )}
      {stats.phase === "start" && <StartScreen onStart={onStart} />}
      {stats.phase === "paused" && <PauseOverlay onResume={onResume} />}
      {stats.phase === "gameover" && (
        <GameOverScreen
          score={stats.score}
          wave={stats.wave}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
