import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import kuromoji from "kuromoji";
import * as wanakana from "wanakana";

const JISHO_DELAY_MS = 200;
const meaningCache = new Map();

// Helper: Check if string contains any Japanese characters (Kanji, Hiragana, Katakana)
function isJapaneseText(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(text);
}

// Helper: Convert MM:SS or M:SS string into total seconds
function parseDurationToSeconds(durationStr) {
  if (!durationStr) return null;

  if (durationStr.includes(":")) {
    const parts = durationStr.split(":");
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (!isNaN(minutes) && !isNaN(seconds)) {
      return minutes * 60 + seconds;
    }
  }

  const rawSeconds = parseFloat(durationStr);
  return isNaN(rawSeconds) ? null : rawSeconds;
}

// Parse CLI Arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/generate-lyrics.mjs "<songName>" "<artist>" [--duration=1:30]');
  process.exit(1);
}

const songName = args[0];
const artist = args[1];

let durationInSeconds = null;
const durationOpt = args.find((arg) => arg.startsWith("--duration="));
if (durationOpt) {
  const durationVal = durationOpt.split("=")[1];
  durationInSeconds = parseDurationToSeconds(durationVal);
}

// Helper: Kuromoji Initializer
function getTokenizer() {
  const dictPath = path.join(process.cwd(), "node_modules", "kuromoji", "dict");
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: dictPath }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

// Helper: Fetch LRCLIB Lyrics
async function fetchLrclibLyrics(trackName, artistName, durationSeconds) {
  let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
    trackName,
  )}&artist_name=${encodeURIComponent(artistName)}`;

  if (durationSeconds) {
    getUrl += `&duration=${durationSeconds}`;
  }

  const res = await fetch(getUrl, {
    headers: { "User-Agent": "LingoTrackScript/1.0" },
  });

  if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
    const data = await res.json();
    if (data.syncedLyrics) return data;
  }

  // Fallback: Search API
  const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${trackName} ${artistName}`)}`;
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "LingoTrackScript/1.0" },
  });

  if (searchRes.ok && searchRes.headers.get("content-type")?.includes("application/json")) {
    const results = await searchRes.json();
    if (durationSeconds && results.length > 0) {
      const sorted = results
        .filter((i) => i.syncedLyrics && i.duration)
        .sort((a, b) => Math.abs(a.duration - durationSeconds) - Math.abs(b.duration - durationSeconds));
      if (sorted[0]) return sorted[0];
    }
    return results.find((i) => i.syncedLyrics) || null;
  }

  return null;
}

// Helper: Parse LRC string
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
    parsed.push({ start: round2(time), text: trimmed });
  }

  return parsed.map((line, i) => ({
    start: line.start,
    end: round2(parsed[i + 1] ? parsed[i + 1].start : line.start + 4),
    text: line.text,
  }));
}

// Helper: Google GTX Batch Translation
async function batchTranslateLines(lines) {
  if (lines.length === 0) return [];
  try {
    const joinedText = lines.join("\n");
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=en&dt=t&q=${encodeURIComponent(
      joinedText,
    )}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data || !data[0]) return [];

    const translatedText = data[0].map((chunk) => chunk[0] || "").join("");
    return translatedText.split("\n");
  } catch (err) {
    console.error("Batch translate error:", err);
    return [];
  }
}

// Helper: Map POS tags
function mapPos(pos, detail) {
  switch (pos) {
    case "名詞":
      return "noun";
    case "動詞":
      return "verb";
    case "形容詞":
      return "adjective";
    case "副詞":
      return "adverb";
    case "助詞":
      return "particle";
    case "助動詞":
      return "auxiliary verb";
    case "連体詞":
      return "adjectival";
    case "接続詞":
      return "conjunction";
    case "感動詞":
      return "interjection";
    default:
      return detail && detail !== "*" ? detail : pos;
  }
}

// Helper: Jisho API lookup with throttle
async function lookupMeaning(word) {
  if (meaningCache.has(word)) return meaningCache.get(word);

  let meaning = "";
  try {
    const res = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const data = await res.json();
      const senses = data?.data?.[0]?.senses;
      if (senses && senses.length > 0) {
        meaning = senses[0].english_definitions?.join("; ") ?? "";
      }
    }
  } catch {
    // Fallback on error
  }

  if (!meaning) meaning = "(no dictionary match — fill in manually)";
  meaningCache.set(word, meaning);
  await new Promise((r) => setTimeout(r, JISHO_DELAY_MS));
  return meaning;
}

// Helper: Tokenize Japanese Line
async function tokenizeLine(tokenizer, text) {
  const kuromojiTokens = tokenizer.tokenize(text);
  const tokens = [];

  for (const t of kuromojiTokens) {
    const isJp = isJapaneseText(t.surface_form);

    // Skip dictionary lookups for punctuation OR non-Japanese text (English, numbers, etc.)
    if (t.pos === "記号" || !isJp) {
      tokens.push({
        surface: t.surface_form,
        romaji: wanakana.toRomaji(t.surface_form),
        meaning: "",
        pos: mapPos(t.pos, t.pos_detail_1),
        skip: true,
      });
      continue;
    }

    const reading = t.reading && t.reading !== "*" ? t.reading : t.surface_form;
    const romaji = wanakana.toRomaji(reading);
    const lookupWord = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    const meaning = await lookupMeaning(lookupWord);

    tokens.push({
      surface: t.surface_form,
      romaji,
      meaning,
      pos: mapPos(t.pos, t.pos_detail_1),
    });
  }

  return tokens;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function camelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => (index === 0 ? letter.toLowerCase() : letter.toUpperCase()))
    .replace(/[^a-zA-Z0-9]/g, "");
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// MAIN EXECUTION
async function main() {
  console.log(`🔎 Searching LRCLIB for "${songName}" by "${artist}"...`);
  const lrcData = await fetchLrclibLyrics(songName, artist, durationInSeconds);

  if (!lrcData || !lrcData.syncedLyrics) {
    console.error("❌ Error: No synced lyrics found on LRCLIB.");
    process.exit(1);
  }

  console.log("📝 Parsing LRC timestamps...");
  const rawLines = parseLrc(lrcData.syncedLyrics);

  console.log(`🌐 Translating ${rawLines.length} lines via Google Translate...`);
  const plainSentences = rawLines.map((l) => l.text);
  const translations = await batchTranslateLines(plainSentences);

  console.log("🧠 Initializing Kuromoji dictionary tokenizer...");
  const tokenizer = await getTokenizer();

  console.log("📖 Tokenizing lines and querying word definitions from Jisho...");
  const processedLines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    process.stdout.write(`   Processing line ${i + 1}/${rawLines.length}\r`);
    const tokens = await tokenizeLine(tokenizer, line.text);

    processedLines.push({
      id: `l${i + 1}`,
      start: line.start,
      end: line.end,
      tokens,
      translation: translations[i] || "",
    });
  }
  console.log("\n✅ Tokenization and translation complete.");

  // Output formatting & setup
  const camelSongName = camelCase(slugify(songName));
  const exportVarName = `${camelSongName}Lyrics`;
  const fileSlug = slugify(songName);

  const outputDir = path.join(process.cwd(), "data", "imports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${fileSlug}.lyrics.generated.ts`);

  const fileContent = `import { LyricLine } from "@/lib/types";

// Auto-generated by scripts/generate-lyrics.mjs for "${songName}" by ${artist}.
// Words come from kuromoji (segmentation), wanakana (romaji), and Jisho
// (dictionary meanings) — spot-check before shipping, don't trust blindly.
export const ${exportVarName}: LyricLine[] = ${JSON.stringify(processedLines, null, 2)};
`;

  fs.writeFileSync(outputPath, fileContent, "utf-8");
  console.log(`🚀 Successfully generated lyrics file at: ${outputPath}`);
  console.log(`📦 Named export: "${exportVarName}"`);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
