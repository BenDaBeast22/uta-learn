#!/usr/bin/env node
/**
 * Fetches synced lyrics for a track via /api/lyrics and writes a skeleton
 * file to data/imports/<id>.json with each line's start/end time and its
 * raw text. It does NOT split lines into word tokens or add romaji/meaning
 * — that part is manual (or ask Claude to help with one line/word at a
 * time). Move the finished result into data/tracks.ts when it's ready.
 *
 * Requires the Next.js dev server to already be running (npm run dev),
 * since this hits your local /api/lyrics route.
 *
 * Usage:
 *   node scripts/fetch-lyrics.mjs "<track name>" "<artist name>" [output-id]
 *
 * Example:
 *   node scripts/fetch-lyrics.mjs "Mirage" "Creepy Nuts" mirage
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const [, , trackName, artistName, outputIdArg] = process.argv;

if (!trackName || !artistName) {
  console.error('Usage: node scripts/fetch-lyrics.mjs "<track>" "<artist>" [output-id]');
  process.exit(1);
}

const outputId = outputIdArg || slugify(trackName);
const devServerUrl = process.env.DEV_SERVER_URL || "http://localhost:3000";

async function main() {
  const url = `${devServerUrl}/api/lyrics?track=${encodeURIComponent(
    trackName
  )}&artist=${encodeURIComponent(artistName)}`;

  console.log(`Fetching from ${url} ...`);
  const res = await fetch(url);

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await res.text();
    console.error(
      `Expected JSON from ${url} but got "${contentType || "unknown content-type"}" ` +
        `(HTTP ${res.status}). This usually means:\n` +
        `  - the dev server isn't running (start it with \`npm run dev\` in another terminal), or\n` +
        `  - something else is already running on port 3000, or\n` +
        `  - the route hit an uncaught error — check the terminal running \`npm run dev\` for a stack trace.\n\n` +
        `First 300 characters of the response body:\n${body.slice(0, 300)}`
    );
    process.exit(1);
  }

  const data = await res.json();

  if (!res.ok) {
    console.error(`Request failed: ${data.error || res.statusText}`);
    process.exit(1);
  }

  if (!data.syncedLyrics) {
    console.error(
      "LRCLIB has no line-synced lyrics for that track/artist. Try a slightly " +
        "different spelling, or check https://lrclib.net directly."
    );
    process.exit(1);
  }

  const lines = parseLrc(data.syncedLyrics);

  const skeleton = {
    id: outputId,
    title: data.trackName,
    artist: data.artistName,
    duration: formatDuration(data.duration),
    // One entry per sung line, in order. `text` is the raw line as returned
    // by LRCLIB — split it into a `tokens` array (see README) before using
    // it in data/tracks.ts.
    lines,
  };

  const outDir = path.join(process.cwd(), "data", "imports");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${outputId}.json`);
  await writeFile(outPath, JSON.stringify(skeleton, null, 2), "utf-8");

  console.log(`Wrote ${lines.length} lines to data/imports/${outputId}.json`);
  console.log(
    "Next: open that file, split each line's `text` into word tokens with " +
      "romaji + meaning, then move the result into data/tracks.ts."
  );
}

/** Parses basic (non-enhanced) LRC text into [{ start, end, text }]. */
function parseLrc(lrcText) {
  const lineRe = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;
  const parsed = [];

  for (const rawLine of lrcText.split("\n")) {
    const m = rawLine.match(lineRe);
    if (!m) continue;
    const [, minutes, seconds, text] = m;
    const time = Number(minutes) * 60 + Number(seconds);
    const trimmed = text.trim();
    if (!trimmed) continue;
    parsed.push({ start: time, text: trimmed });
  }

  return parsed.map((line, i) => ({
    id: `l${i + 1}`,
    start: round2(line.start),
    end: round2(parsed[i + 1] ? parsed[i + 1].start : line.start + 4),
    text: line.text,
  }));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatDuration(totalSeconds) {
  if (!totalSeconds) return undefined;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
