import Link from "next/link";
import { notFound } from "next/navigation";
import { tracks, getTrack } from "@/data/tracks";
import TrackPlayer from "@/components/TrackPlayer";

// Allow static generation for all curated tracks while returning 404 for unknown slugs
export const dynamicParams = false;

export function generateStaticParams() {
  return tracks.map((track) => ({ id: track.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrackPage({ params }: PageProps) {
  const { id } = await params;
  const staticTrack = getTrack(id);

  if (!staticTrack) {
    notFound();
  }

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
          <h1 className="font-display text-3xl text-paper sm:text-4xl">{staticTrack.title}</h1>
          {staticTrack.titleRomaji && (
            <span className="font-mono text-sm text-paper/40">{staticTrack.titleRomaji}</span>
          )}
        </div>
        <p className="mt-2 text-sm text-paper/60">
          {staticTrack.artist} · {staticTrack.level || "Curated"} · {staticTrack.duration}
        </p>
      </div>

      <TrackPlayer track={staticTrack} />
    </main>
  );
}
