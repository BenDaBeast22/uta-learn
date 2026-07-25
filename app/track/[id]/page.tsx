import Link from "next/link";
import { notFound } from "next/navigation";
import { tracks, getTrack } from "@/data/tracks";
import TrackPlayer from "@/components/TrackPlayer";

export function generateStaticParams() {
  return tracks.map((track) => ({ id: track.id }));
}

export default function TrackPage({ params }: { params: { id: string } }) {
  const track = getTrack(params.id);
  if (!track) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-paper/50 transition-colors hover:text-gold"
      >
        ← All tracks
      </Link>

      <div className="seam mb-8 pl-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-3xl text-paper sm:text-4xl">{track.title}</h1>
          <span className="font-mono text-sm text-paper/40">{track.titleRomaji}</span>
        </div>
        <p className="mt-2 text-sm text-paper/60">
          {track.artist} · {track.level} · {track.duration}
        </p>
      </div>

      <TrackPlayer track={track} />
    </main>
  );
}
