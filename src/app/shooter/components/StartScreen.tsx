type Props = { onStart: () => void };

export function StartScreen({ onStart }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/60 backdrop-blur-sm">
      <div className="text-center">
        <h1 className="font-mono text-6xl font-bold tracking-tight text-white drop-shadow-lg">
          CharacterSlash
        </h1>
        <p className="mt-3 font-mono text-sm text-white/70">
          Letters attack. Punctuation defends.
        </p>
      </div>
      <ul className="font-mono text-sm text-white/80 space-y-1 text-center">
        <li>
          <span className="text-amber-200">Mouse</span> — aim
        </li>
        <li>
          <span className="text-amber-200">Click / Space</span> — fire
        </li>
        <li>
          <span className="text-amber-200">1-4</span> — switch weapon
        </li>
        <li>
          <span className="text-amber-200">P / Esc</span> — pause
        </li>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="rounded-md bg-white px-8 py-3 font-mono text-lg font-semibold text-black transition hover:bg-amber-200"
      >
        Start
      </button>
    </div>
  );
}
