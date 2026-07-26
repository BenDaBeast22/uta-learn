"use client";

import { useRef, useState } from "react";
import { Track } from "@/lib/types";
import YouTubePlayer from "./YouTubePlayer";
import LyricsPanel from "./LyricsPanel";

export default function TrackPlayer({ track }: { track: Track }) {
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<any>(null);

  function handleSeek(seconds: number) {
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(seconds, true);
    player.playVideo();
    setCurrentTime(seconds);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
      <div className="space-y-4">
        <YouTubePlayer
          videoId={track.youtubeId}
          onTimeUpdate={setCurrentTime}
          onReady={(player) => {
            playerRef.current = player;
          }}
        />
        <p className="font-body text-sm leading-relaxed text-paper/60">
          Hover — or tab to — any word in the lyrics to see its romaji and meaning. Click a line to jump the video to
          that point.
        </p>
      </div>

      <LyricsPanel lyrics={track.lyrics} currentTime={currentTime} accent={track.accent} onLineClick={handleSeek} />
    </div>
  );
}
