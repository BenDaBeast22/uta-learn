"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TrackPlayer from "@/components/TrackPlayer";
import type { Track } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function CustomTrackLoader({ id }: { id: string }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrack() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const supabase = createClient();
        const targetId = decodeURIComponent(id);

        const { data, error } = await supabase
          .from("custom_tracks")
          .select("id, track_data")
          .eq("id", targetId)
          .single();

        if (error) {
          console.error("Supabase fetch error:", error.message);
          setErrorMsg(error.message);
          setTrack(null);
          return;
        }

        if (data && data.track_data) {
          const loadedTrack: Track = {
            ...data.track_data,
            id: data.id,
            isCustom: true,
          };
          setTrack(loadedTrack);
        } else {
          setTrack(null);
        }
      } catch (err: unknown) {
        console.error("Failed to load track from Supabase:", err);
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("An unexpected error occurred while fetching the track.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchTrack();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="flex justify-center items-center min-h-[300px]">
          <span className="font-mono text-xs text-gold animate-pulse">Loading custom track from database...</span>
        </div>
      </main>
    );
  }

  if (!track) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16 text-center">
        <h1 className="font-display text-2xl text-paper mb-4">Track Not Found</h1>
        <p className="text-sm text-paper/60 mb-6">
          {errorMsg || "This custom track couldn't be found in your database library."}
        </p>
        <Link
          href="/my-tracks"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-gold hover:underline"
        >
          ← Return to My Tracks
        </Link>
      </main>
    );
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
