"use client";

import { useRef, useState } from "react";
import { Track } from "@/lib/types";
import { LyricDisplayMode } from "@/lib/types";
import YouTubePlayer from "./YouTubePlayer";
import LyricsPanel from "./LyricsPanel";

export default function TrackPlayer({ track }: { track: Track }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [displayMode, setDisplayMode] = useState<LyricDisplayMode>("furigana");
  const playerRef = useRef<any>(null);

  // Calculate adjusted time taking into account the track's offset
  const offset = track.lyricsOffset ?? 0;
  const adjustedTime = currentTime - offset;

  function handleSeek(seconds: number) {
    const player = playerRef.current;
    if (!player) return;

    // When seeking from a line click, add back the offset so the video seeks correctly
    const targetVideoTime = seconds + offset;
    player.seekTo(targetVideoTime, true);
    player.playVideo();
    setCurrentTime(targetVideoTime);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
      {/* Video & Controls Column */}
      <div className="space-y-4">
        <YouTubePlayer
          videoId={track.youtubeId}
          onTimeUpdate={setCurrentTime}
          onReady={(player) => {
            playerRef.current = player;
          }}
        />

        {/* Display Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-paper/10 bg-paper/5 p-3">
          <span className="font-mono text-xs text-paper/70">Lyric View:</span>
          <div className="flex flex-wrap gap-1 rounded-full bg-black/30 p-1 border border-paper/10">
            <button
              onClick={() => setDisplayMode("furigana")}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                displayMode === "furigana" ? "bg-gold text-black font-semibold" : "text-paper/60 hover:text-paper"
              }`}
            >
              Readings
            </button>
            <button
              onClick={() => setDisplayMode("english")}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                displayMode === "english" ? "bg-gold text-black font-semibold" : "text-paper/60 hover:text-paper"
              }`}
            >
              English Subs
            </button>
            <button
              onClick={() => setDisplayMode("romaji")}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                displayMode === "romaji" ? "bg-gold text-black font-semibold" : "text-paper/60 hover:text-paper"
              }`}
            >
              Romaji
            </button>
            <button
              onClick={() => setDisplayMode("kanji")}
              className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                displayMode === "kanji" ? "bg-gold text-black font-semibold" : "text-paper/60 hover:text-paper"
              }`}
            >
              Japanese
            </button>
          </div>
        </div>

        <p className="font-body text-sm leading-relaxed text-paper/60">
          Hover — or tab to — any word in the lyrics to see its translation. Click a line to jump the video to that
          point.
        </p>
      </div>

      {/* Lyrics Panel */}
      <LyricsPanel
        songTitle={track.title}
        lyrics={track.lyrics}
        currentTime={adjustedTime}
        accent={track.accent}
        displayMode={displayMode}
        onLineClick={handleSeek}
      />
    </div>
  );
}
