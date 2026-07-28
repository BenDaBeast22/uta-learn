import Link from "next/link";
import { notFound } from "next/navigation";
import { tracks, getTrack } from "@/data/tracks";
import TrackPlayer from "@/components/TrackPlayer";
import CustomTrackLoader from "@/components/CustomTrackLoader";

export const dynamicParams = true;

export function generateStaticParams() {
  return tracks.map((track) => ({ id: track.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrackPage({ params }: PageProps) {
  const { id } = await params;
  const staticTrack = getTrack(id);

  // If found in static tracks, render immediately with SSR
  if (staticTrack) {
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
            {staticTrack.artist} · {staticTrack.level || "Custom"} · {staticTrack.duration}
          </p>
        </div>

        <TrackPlayer track={staticTrack} />
      </main>
    );
  }

  // Otherwise delegate to client component to read browser localStorage
  return <CustomTrackLoader id={id} />;
}
