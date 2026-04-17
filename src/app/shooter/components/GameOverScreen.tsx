type Props = {
  score: number;
  wave: number;
  onRestart: () => void;
};

export function GameOverScreen({ score, wave, onRestart }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/75 backdrop-blur-sm">
      <h2 className="font-mono text-5xl font-bold text-red-400">Game Over</h2>
      <div className="font-mono text-center text-white">
        <div className="text-sm uppercase tracking-wider text-white/60">Final Score</div>
        <div className="text-4xl font-bold">{score}</div>
        <div className="mt-3 text-sm text-white/70">Reached wave {wave}</div>
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-md bg-white px-8 py-3 font-mono text-lg font-semibold text-black transition hover:bg-amber-200"
      >
        Play Again
      </button>
    </div>
  );
}
