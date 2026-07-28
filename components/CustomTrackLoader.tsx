"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrackPlayer from "@/components/TrackPlayer";
import type { Track } from "@/lib/types";

const STORAGE_KEY = "lingotrack_custom_tracks";

export default function CustomTrackLoader({ id }: { id: string }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const customTracks: Track[] = JSON.parse(saved);
        const found = customTracks.find((t) => t.id === id);
        if (found) {
          setTrack(found);
        }
      }
    } catch (err) {
      console.error("Failed to read custom track from localStorage", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="flex justify-center items-center min-h-[300px]">
          <span className="font-mono text-xs text-gold animate-pulse">Loading custom track...</span>
        </div>
      </main>
    );
  }

  if (!track) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <Link
        href="/my-tracks"
        className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-paper/50 transition-colors hover:text-gold"
      >
        ← My Tracks
      </Link>

      <div className="seam mb-8 pl-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-3xl text-paper sm:text-4xl">{track.title}</h1>
          {track.titleRomaji && <span className="font-mono text-sm text-paper/40">{track.titleRomaji}</span>}
        </div>
        <p className="mt-2 text-sm text-paper/60">
          {track.artist} · {track.level || "Custom"} · {track.duration}
        </p>
      </div>

      <TrackPlayer track={track} />
    </main>
  );
}
