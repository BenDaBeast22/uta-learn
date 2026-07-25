import { LyricLine } from "./types";

/** Formats seconds as an LRC timestamp, e.g. 75.4 -> "01:15.40" */
function toLrcTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`;
}

/**
 * Builds an LRC-format string from our line/token data so it can be handed
 * to Liricle, which does the actual time -> active line/word lookup.
 *
 * If every token in a line has a `time`, that line is emitted in "enhanced"
 * LRC format (`<mm:ss.xx>` before each word), which lets Liricle report the
 * exact word being sung. Otherwise the line is emitted as plain text, and
 * only line-level sync is available for it.
 */
export function buildLrc(lines: LyricLine[]): string {
  return lines
    .map((line) => {
      const timestamp = `[${toLrcTimestamp(line.start)}]`;
      const hasWordTimes =
        line.tokens.length > 0 && line.tokens.every((t) => typeof t.time === "number");

      const body = hasWordTimes
        ? line.tokens.map((t) => `<${toLrcTimestamp(t.time as number)}>${t.surface}`).join("")
        : line.tokens.map((t) => t.surface).join("");

      return `${timestamp}${body}`;
    })
    .join("\n");
}
