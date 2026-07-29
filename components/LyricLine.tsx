"use client";

import type { WordToken as WordTokenData } from "@/lib/types";
import WordToken from "./WordToken";

interface LyricLineProps {
  tokens: WordTokenData[];
  songTitle?: string;
  displayMode: string;
  translation?: string; // 👈 Read directly from line.translation
}

export default function LyricLine({ tokens, songTitle, displayMode, translation }: LyricLineProps) {
  const fullSentence = tokens.map((t) => t.surface).join("");

  return (
    <div className="space-y-1.5">
      {/* Primary Token Line */}
      <div
        className={`text-lg leading-relaxed text-paper sm:text-xl ${
          displayMode === "romaji" ? "font-mono tracking-normal" : "font-display tracking-wide"
        }`}
      >
        {tokens.map((token, index) => (
          <WordToken
            key={`${token.surface}-${index}`}
            token={token}
            songTitle={songTitle}
            contextSentence={fullSentence}
            displayMode={displayMode === "english" ? "kanji" : displayMode}
          />
        ))}
      </div>

      {/* English Translation (Shows in 'english' mode) */}
      {displayMode === "english" && translation && (
        <p className="text-sm text-paper/70 font-sans italic">{translation}</p>
      )}
    </div>
  );
}
