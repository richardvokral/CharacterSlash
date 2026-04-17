import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="font-mono text-5xl font-bold tracking-tight sm:text-7xl">
        CharacterSlash
      </h1>
      <p className="max-w-prose text-balance text-lg text-white/70">
        A first-person shooter where bullets are punctuation and enemies are letters.
        Every 5th wave spawns a numbered boss.
      </p>
      <Link
        href="/shooter"
        className="rounded-md bg-white px-6 py-3 font-mono text-lg font-semibold text-black transition hover:bg-white/90"
      >
        Play /shooter
      </Link>
    </main>
  );
}
