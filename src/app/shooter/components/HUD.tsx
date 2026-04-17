import type { GameStats } from "../engine/types";

type Props = { stats: GameStats };

export function HUD({ stats }: Props) {
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const hpColor =
    hpPct > 60 ? "bg-emerald-400" : hpPct > 30 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 font-mono text-sm">
      <div className="rounded-md bg-black/50 px-3 py-2 backdrop-blur-sm">
        <div className="text-white/60 text-xs uppercase tracking-wider">Score</div>
        <div className="text-xl font-bold text-white">{stats.score}</div>
      </div>
      <div className="rounded-md bg-black/50 px-3 py-2 backdrop-blur-sm text-center">
        <div className="text-white/60 text-xs uppercase tracking-wider">
          Wave {stats.wave}
        </div>
        <div className="text-sm text-white">
          {stats.waveKills} / {stats.waveTarget}
        </div>
      </div>
      <div className="rounded-md bg-black/50 px-3 py-2 backdrop-blur-sm w-48">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-white/60 uppercase tracking-wider">HP</span>
          <span className="text-white">
            {Math.round(stats.hp)} / {stats.maxHp}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-sm bg-white/10">
          <div
            className={`h-full ${hpColor} transition-all duration-150`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>
      <div className="rounded-md bg-black/50 px-3 py-2 backdrop-blur-sm text-center">
        <div className="text-white/60 text-xs uppercase tracking-wider">Ammo</div>
        <div className="text-2xl font-bold text-amber-200">{stats.ammoChar}</div>
      </div>
    </div>
  );
}
