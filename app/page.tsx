import Link from "next/link";
import { tracks } from "@/data/tracks";
import TrackCard from "@/components/TrackCard";
import { createClient } from "@/lib/supabase/server";

export default async function TracksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <header className="seam mb-12 pl-5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase text-gold border border-gold/20">
            Curated Path
          </span>
        </div>

        <h1 className="mt-3 font-display text-4xl leading-tight text-paper sm:text-5xl">
          Learn Japanese,
          <br />
          one song at a time.
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60 sm:text-base">
          Pick a track from our curated curriculum. Tracks are ordered by difficulty with hand-crafted translations and
          readings.
        </p>

        {/* Guest Teaser Banner */}
        {!user && (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-paper/10 bg-paper/5 px-4 py-3 text-xs text-paper/70 sm:text-sm">
            <span className="font-semibold text-gold">Want more?</span>
            <span>Sign in to save custom tracks, collect vocabulary, and track your progress.</span>
            <Link
              href="/login"
              className="ml-auto font-mono text-xs underline decoration-gold/50 underline-offset-4 transition hover:text-gold hover:decoration-gold"
            >
              Create account →
            </Link>
          </div>
        )}
      </header>

      {/* Track Grid */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </section>
    </main>
  );
}
