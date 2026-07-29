"use client";

import { useState, useEffect } from "react";
import TrackCard from "@/components/TrackCard";
import type { Track } from "@/lib/types";

const STORAGE_KEY = "lingotrack_custom_tracks";

export default function MyTracksPage() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  // Load custom tracks from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTracks(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to load tracks from localStorage", err);
    }
  }, []);

  // Sync tracks state to localStorage whenever tracks change
  const saveTracksToStorage = (updatedTracks: Track[]) => {
    setTracks(updatedTracks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracks));
    } catch (err) {
      console.error("Failed to save tracks to localStorage", err);
    }
  };

  // Delete handler strictly for custom imported tracks
  const handleDeleteTrack = (trackId: string, trackTitle: string) => {
    if (confirm(`Are you sure you want to delete "${trackTitle}"?`)) {
      const updated = tracks.filter((t) => t.id !== trackId);
      saveTracksToStorage(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Explicitly flag imported tracks as custom
      const newTrack: Track = { ...data.track, isCustom: true };

      // Add new track and persist to localStorage
      const updated = [newTrack, ...tracks];
      saveTracksToStorage(updated);

      // Reset form fields
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
            <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-paper/60 sm:text-base">
              Add custom Japanese tracks by title, artist, and YouTube link to parse synced lyrics, romaji, and word
              definitions.
            </p>
          </div>
        </div>
      </header>

      {/* Add Track Form Panel */}
      <div className="mb-12 rounded-xl border border-paper/10 bg-paper/5 p-6 shadow-tag sm:p-8">
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
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
              className="w-full rounded-lg border border-paper/10 bg-paper/5 px-4 py-2.5 font-body text-sm text-paper placeholder-paper/30 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/50 disabled:opacity-50"
            />
          </div>

          {/* Progress Indicator Banner when loading */}
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
              disabled={loading || !title.trim() || !artist.trim()}
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

        {/* Empty State */}
        {tracks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper/10 bg-paper/5 p-12 text-center">
            <p className="font-display text-xl text-paper">No custom tracks imported yet</p>
            <p className="mt-2 font-body text-sm text-paper/60">
              Enter a song title and artist above to fetch synced lyrics and definitions.
            </p>
          </div>
        ) : (
          /* Track Grid using TrackCard */
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
