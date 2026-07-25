"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate: (seconds: number) => void;
  onReady?: (player: any) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export default function YouTubePlayer({
  videoId,
  onTimeUpdate,
  onReady,
  onPlayStateChange,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            onReady?.(playerRef.current);
          },
          onStateChange: (event: any) => {
            const isPlaying = event.data === window.YT.PlayerState.PLAYING;
            onPlayStateChange?.(isPlaying);

            if (isPlaying) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerRef.current?.getCurrentTime) {
                  onTimeUpdate(playerRef.current.getCurrentTime());
                }
              }, 200);
            } else if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-card">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
