import type { WordToken as WordTokenData } from "@/lib/types";
import WordToken from "./WordToken";

interface LyricLineProps {
  tokens: WordTokenData[];
  songTitle?: string;
  displayMode: string;
}

export default function LyricLine({ tokens, songTitle, displayMode }: LyricLineProps) {
  // Calculate the sentence here, right before rendering the tokens
  const fullSentence = tokens.map((t) => t.surface).join("");

  return (
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
        />
      ))}
    </div>
  );
}
