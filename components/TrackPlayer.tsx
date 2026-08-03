"use client";

import { useEffect, useRef, useState } from "react";
import { Track } from "@/lib/types";
import { LyricDisplayMode } from "@/lib/types";
import YouTubePlayer from "./YouTubePlayer";
import LyricsPanel from "./LyricsPanel";

const MODE_DESCRIPTIONS: Record<LyricDisplayMode, string> = {
  furigana: "Displays Japanese kanji with furigana readings above.",
  english: "Displays Japanese with full English translations below line by line.",
  romaji: "Displays english pronunciations (Romaji).",
  kanji: "Displays original Japanese only.",
};

export default function TrackPlayer({ track }: { track: Track }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [displayMode, setDisplayMode] = useState<LyricDisplayMode>("furigana");
  const playerRef = useRef<any>(null);

  // Calculate adjusted time taking into account the track's offset
  const offset = track.lyricsOffset ?? 0;
  const adjustedTime = currentTime - offset;

  // Spacebar hotkey listener to play/pause video
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        const activeEl = document.activeElement;

        // Check if activeEl is an HTMLElement to safely access isContentEditable
        const isEditable = activeEl instanceof HTMLElement && activeEl.isContentEditable;
        const isInteractive =
          activeEl?.tagName === "INPUT" ||
          activeEl?.tagName === "TEXTAREA" ||
          activeEl?.tagName === "BUTTON" ||
          isEditable;

        if (isInteractive) return;

        // Prevent page scrolling on Spacebar press
        e.preventDefault();

        const player = playerRef.current;
        if (!player || typeof player.getPlayerState !== "function") return;

        // YT.PlayerState: 1 = PLAYING
        const state = player.getPlayerState();
        if (state === 1) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        <div className="rounded-lg border border-paper/10 bg-paper/5 p-1 py-3 sm:p-3">
          <div className="flex flex-wrap items-center sm:gap-7 gap-2">
            <span className="font-mono text-xs text-paper/70 ml-2 mb-1">Lyric View:</span>
            <div className="flex flex-wrap sm:gap-1 rounded-full border border-paper/10 bg-black/30 p-1">
              <button
                onClick={() => setDisplayMode("furigana")}
                className={`rounded-full px-3 py-1 font-mono text-[10px] sm:text-xs transition ${
                  displayMode === "furigana" ? "bg-gold font-semibold text-black" : "text-paper/60 hover:text-paper"
                }`}
              >
                Readings
              </button>
              <button
                onClick={() => setDisplayMode("english")}
                className={`rounded-full px-3 py-1 font-mono text-[10px] sm:text-xs transition ${
                  displayMode === "english" ? "bg-gold font-semibold text-black" : "text-paper/60 hover:text-paper"
                }`}
              >
                English Subs
              </button>
              <button
                onClick={() => setDisplayMode("romaji")}
                className={`rounded-full px-3 py-1 font-mono text-[10px] sm:text-xs transition ${
                  displayMode === "romaji" ? "bg-gold font-semibold text-black" : "text-paper/60 hover:text-paper"
                }`}
              >
                Romaji
              </button>
              <button
                onClick={() => setDisplayMode("kanji")}
                className={`rounded-full px-3 py-1 font-mono text-[10px]  sm:text-xs transition ${
                  displayMode === "kanji" ? "bg-gold font-semibold text-black" : "text-paper/60 hover:text-paper"
                }`}
              >
                Japanese
              </button>
            </div>
          </div>

          {/* Active Mode Explanation Line - Left-aligned */}
          <div className="mt-2.5 ml-2 flex items-center gap-1.5 font-mono text-[11px] text-gold/80">
            <span>•</span>
            <p>{MODE_DESCRIPTIONS[displayMode]}</p>
          </div>
        </div>

        <p className="font-body text-sm leading-relaxed text-paper/60">
          Hover — or tab to — any word in the lyrics to see its translation. Click a line to jump the video to that
          point. Press{" "}
          <kbd className="rounded border border-paper/20 bg-paper/10 px-1 py-0.5 font-mono text-xs">Space</kbd> to
          play/pause.
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
