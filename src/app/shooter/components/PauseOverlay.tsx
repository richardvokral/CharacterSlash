type Props = { onResume: () => void };

export function PauseOverlay({ onResume }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm">
      <h2 className="font-mono text-4xl font-bold text-white">Paused</h2>
      <p className="font-mono text-sm text-white/70">
        Press <span className="text-amber-200">P</span> to resume
      </p>
      <button
        type="button"
        onClick={onResume}
        className="rounded-md bg-white px-6 py-2 font-mono text-sm font-semibold text-black transition hover:bg-amber-200"
      >
        Resume
      </button>
    </div>
  );
}
