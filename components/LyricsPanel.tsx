"use client";

import { useEffect, useRef } from "react";
import { LyricLine } from "@/lib/types";
import { useLyricSync } from "@/lib/useLyricSync";
import WordToken from "./WordToken";

interface LyricsPanelProps {
  lyrics: LyricLine[];
  currentTime: number;
  accent: string;
  onLineClick?: (start: number) => void;
}

export default function LyricsPanel({ lyrics, currentTime, accent, onLineClick }: LyricsPanelProps) {
  const { lineIndex: activeIndex, wordIndex: activeWordIndex } = useLyricSync(lyrics, currentTime);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (activeIndex >= 0) {
      lineRefs.current[activeIndex]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  return (
    <div className="lyric-scroll max-h-[420px] space-y-1 overflow-y-auto rounded-2xl border border-ink-line bg-ink-soft/60 p-4 sm:p-6">
      {lyrics.map((line, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        const progress = isActive
          ? Math.min(1, Math.max(0, (currentTime - line.start) / (line.end - line.start)))
          : isPast
            ? 1
            : 0;

        return (
          <div
            key={line.id}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            role={onLineClick ? "button" : undefined}
            tabIndex={onLineClick ? 0 : undefined}
            onClick={() => onLineClick?.(line.start)}
            onKeyDown={(e) => {
              if (!onLineClick) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onLineClick(line.start);
              }
            }}
            className={`relative rounded-xl px-3 py-2.5 transition-all duration-200 ${
              onLineClick ? "cursor-pointer" : ""
            } ${isActive ? "bg-ink-line/70" : "opacity-50 hover:opacity-80"}`}
          >
            {isActive && (
              <span
                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: accent }}
              />
            )}
            <div className="relative pl-3">
              <div className="font-display text-lg leading-relaxed tracking-wide text-paper sm:text-xl">
                {line.tokens.map((token, ti) => (
                  <WordToken key={ti} token={token} active={isActive && ti === activeWordIndex} />
                ))}
              </div>
              {isActive && (
                <div className="mt-1.5 h-px w-full bg-paper/10">
                  <div
                    className="h-px transition-[width] duration-150 ease-linear"
                    style={{ width: `${progress * 100}%`, backgroundColor: accent }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
