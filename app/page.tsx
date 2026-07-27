import Link from "next/link";
import { tracks } from "@/data/tracks";
import TrackCard from "@/components/TrackCard";
import UserMenu from "@/components/UserMenu";
import { createClient } from "@/lib/supabase/server";

export default async function TracksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-paper/10 pb-6 mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">歌 — Uta Learn</p>

        {/* Dynamic Auth Action */}
        {user ? (
          <UserMenu email={user.email ?? ""} />
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-paper/20 px-5 py-2 font-mono text-xs text-paper transition hover:border-gold hover:text-gold"
          >
            Sign In
          </Link>
        )}
      </div>

      <header className="seam mb-12 pl-5">
        <h1 className="font-display text-4xl leading-tight text-paper sm:text-5xl">
          Learn Japanese,
          <br />
          one song at a time.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60 sm:text-base">
          Pick a track. Follow the lyrics as they line up with the music, and hover any word to see how it&apos;s read
          and what it means.
        </p>

        {/* Feature Teaser for Guests ONLY */}
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

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </section>
    </main>
  );
}
