"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TrackCard from "@/components/TrackCard";
import type { Track } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// Instantiate Supabase client outside the render cycle
const supabase = createClient();

export default function MyTracksPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  // 1. Fetch user & load their custom tracks from Supabase
  const loadUserTracks = useCallback(async (userId: string) => {
    try {
      setTracksLoading(true);
      const { data, error } = await supabase
        .from("custom_tracks")
        .select("id, track_data")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load tracks from Supabase:", error.message);
        return;
      }

      if (data) {
        const parsedTracks: Track[] = data.map((row) => ({
          ...row.track_data,
          id: row.id, // Ensure Supabase row UUID is used as the primary track ID
          isCustom: true,
        }));
        setTracks(parsedTracks);
      }
    } finally {
      setTracksLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        await loadUserTracks(currentUser.id);
      } else {
        setTracksLoading(false);
      }
    }

    checkUser();
  }, [loadUserTracks]);

  // 2. Delete track from Supabase
  const handleDeleteTrack = async (trackId: string, trackTitle: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete "${trackTitle}"?`)) return;

    // Optimistic UI update
    setTracks((prev) => prev.filter((t) => t.id !== trackId));

    const { error } = await supabase.from("custom_tracks").delete().eq("id", trackId).eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete track from Supabase:", error.message);
      // Revert on failure
      await loadUserTracks(user.id);
    }
  };

  // 3. Import & Save track to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !artist.trim()) return;

    setLoading(true);
    setError(null);
    setStatusText("Searching LRCLIB for synced lyrics...");

    const statusTimer = setTimeout(() => {
      setStatusText("Tokenizing Japanese text & fetching word definitions...");
    }, 2500);

    try {
      const res = await fetch("/api/import-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          youtubeUrl: youtubeUrl.trim(),
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server returned an invalid response (${res.status}). Check server logs.`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import track.");
      }

      const rawTrack = data.track;

      // 1. Insert initial row to retrieve generated Supabase UUID
      const { data: dbData, error: dbError } = await supabase
        .from("custom_tracks")
        .insert({
          user_id: user.id,
          title: title.trim(),
          artist: artist.trim(),
          youtube_url: youtubeUrl.trim() || null,
          track_data: { ...rawTrack, isCustom: true },
        })
        .select("id")
        .single();

      if (dbError) {
        throw new Error(`Failed to save track to database: ${dbError.message}`);
      }

      // 2. Sync UUID inside track payload
      const finalTrack: Track = {
        ...rawTrack,
        id: dbData.id,
        isCustom: true,
      };

      // 3. Update row so embedded track_data matches the assigned ID
      await supabase.from("custom_tracks").update({ track_data: finalTrack }).eq("id", dbData.id);

      setTracks((prev) => [finalTrack, ...prev]);

      // Reset form
      setTitle("");
      setArtist("");
      setYoutubeUrl("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while importing the track.");
      }
    } finally {
      clearTimeout(statusTimer);
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      {/* Page Header */}
      <header className="seam mb-12 pl-5">
        <div className="flex items-center gap-2">
          <span className="rounded border border-gold/20 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase text-gold">
            Library
          </span>
        </div>

        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-paper sm:text-5xl">My Tracks</h1>
            <p className="mt-4 max-w-xl font-body text-sm leading-relaxed text-paper/60 sm:text-base">
              Add custom Japanese tracks by title, artist, and YouTube link to parse synced lyrics, romaji, and word
              definitions.
            </p>
          </div>
        </div>
      </header>

      {/* Guest Lock Banner */}
      {!authLoading && !user && (
        <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-xl border border-gold/30 bg-gold/5 p-6">
          <div>
            <h3 className="font-display text-lg font-bold text-gold">Account Required</h3>
            <p className="mt-1 text-xs text-paper/70 font-body">
              Sign in or create an account to save custom tracks and access them across all your devices.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold px-4 py-2 font-mono text-xs font-semibold text-ink transition hover:bg-gold/90"
          >
            Sign In / Register →
          </Link>
        </div>
      )}

      {/* Add Track Form Panel */}
      <div
        className={`mb-12 rounded-xl border border-paper/10 bg-paper/5 p-6 shadow-tag sm:p-8 ${
          !user ? "opacity-50 pointer-events-none select-none" : ""
        }`}
      >
        <h2 className="font-display text-xl font-bold text-paper mb-4">Add a New Track</h2>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-xs font-mono leading-relaxed">
              <span className="font-bold block mb-0.5 text-red-200">Import Failed</span>
              {error}
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-paper/60 mb-1.5">
                Song Title <span className="text-gold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Otonoke"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading || !user}
                className="w-full rounded-lg border border-paper/10 bg-paper/5 px-4 py-2.5 font-body text-sm text-paper placeholder-paper/30 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/50 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-paper/60 mb-1.5">
                Artist Name <span className="text-gold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Creepy Nuts"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                disabled={loading || !user}
                className="w-full rounded-lg border border-paper/10 bg-paper/5 px-4 py-2.5 font-body text-sm text-paper placeholder-paper/30 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/50 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-paper/60 mb-1.5">
              YouTube URL <span className="text-paper/40">(Optional)</span>
            </label>
            <input
              type="url"
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={loading || !user}
              className="w-full rounded-lg border border-paper/10 bg-paper/5 px-4 py-2.5 font-body text-sm text-paper placeholder-paper/30 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/50 disabled:opacity-50"
            />
          </div>

          {/* Progress Indicator Banner */}
          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-gold/20 bg-gold/5 p-3.5 text-gold">
              <svg
                className="h-4 w-4 animate-spin shrink-0 text-gold"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="font-mono text-xs animate-pulse">{statusText}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading || !user || !title.trim() || !artist.trim()}
              className="inline-flex items-center justify-center rounded-lg border border-gold/30 bg-gold/10 px-5 py-2.5 font-mono text-xs font-semibold text-gold transition hover:border-gold hover:bg-gold hover:text-ink disabled:opacity-40 disabled:hover:border-gold/30 disabled:hover:bg-gold/10 disabled:hover:text-gold"
            >
              {loading ? "Processing..." : "Add Track"}
            </button>
          </div>
        </form>
      </div>

      {/* Track List Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-paper/10 pb-3">
          <h2 className="font-display text-2xl text-paper">Imported Tracks</h2>
          <span className="font-mono text-xs text-paper/50">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </span>
        </div>

        {tracksLoading ? (
          <div className="py-12 text-center font-mono text-xs text-gold animate-pulse">Loading your library...</div>
        ) : tracks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper/10 bg-paper/5 p-12 text-center">
            <p className="font-display text-xl text-paper">No custom tracks imported yet</p>
            <p className="mt-2 font-body text-sm text-paper/60">
              {user
                ? "Enter a song title and artist above to fetch synced lyrics and definitions."
                : "Sign in to add custom tracks to your account."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} onDelete={handleDeleteTrack} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
