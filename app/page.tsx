import { tracks } from "@/data/tracks";
import TrackCard from "@/components/TrackCard";

export default function TracksPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <header className="seam mb-12 pl-5">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">歌 — Uta Learn</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-paper sm:text-5xl">
          Learn Japanese,
          <br />
          one song at a time.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60 sm:text-base">
          Pick a track. Follow the lyrics as they line up with the music, and
          hover any word to see how it&apos;s read and what it means.
        </p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </section>
    </main>
  );
}
