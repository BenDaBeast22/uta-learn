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
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
      <header className="seam mb-10 pl-5">
        <div className="flex items-center gap-2">
          <span className="rounded border border-gold/20 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase text-gold">
            Curated Path
          </span>
        </div>

        <h1 className="mt-3 font-display text-4xl leading-tight text-paper sm:text-5xl">
          Learn Japanese, <span className="block sm:inline">one song at a time.</span>
        </h1>

        <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-paper/60 sm:text-base">
          Pick a track from our curated curriculum. Tracks are ordered by difficulty with hand-crafted translations and
          readings.
        </p>

        {/* Guest Teaser Banner */}
        {!user && (
          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-paper/10 bg-paper/5 p-4 text-xs text-paper/80 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-gold">Want more?</span>
              <span>Create a free account to save custom tracks, collect vocabulary, and track your progress.</span>
            </div>
            <Link
              href="/login?mode=signup"
              className="inline-flex shrink-0 font-mono text-xs text-gold underline decoration-gold/50 underline-offset-4 transition hover:decoration-gold"
            >
              Create account →
            </Link>
          </div>
        )}
      </header>

      {/* Track Grid Section */}
      <section className="mt-12">
        <div className="mb-6 flex items-center justify-between border-b border-paper/10 pb-4">
          <h2 className="font-display text-xl font-bold text-paper sm:text-2xl">Curated Tracks</h2>
          <span className="font-mono text-xs text-paper/40">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"} available
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track, i) => (
            <TrackCard key={track.id} track={track} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
