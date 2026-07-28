import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import kuromoji from "kuromoji";
import * as wanakana from "wanakana";

export const maxDuration = 60; // Allows execution time for Jisho lookups on longer songs

export type Level = "N5" | "N4" | "N3" | "N2" | "N1";

export interface Token {
  surface: string;
  romaji: string;
  meaning: string;
  pos?: string;
  skip?: boolean;
}

export interface LyricLine {
  id: string;
  start: number;
  end: number;
  tokens: Token[];
}

export interface Track {
  id: string;
  title: string;
  titleRomaji: string;
  artist: string;
  level: Level;
  duration: string;
  /** YouTube video id, e.g. the "v=" parameter */
  youtubeId: string;
  /** Accent color for the track's card and active-line marker */
  accent: string;
  summary: string;
  lyrics: LyricLine[];
}

// Default accent class for user-imported custom tracks
const CUSTOM_ACCENT = "from-purple-500/20 to-purple-500/10";

// In-memory singletons across requests
let tokenizerInstance: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
const meaningCache = new Map<string, string>();
const JISHO_DELAY_MS = 200; // Throttle to stay within Jisho rate limits

async function getTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  if (tokenizerInstance) return tokenizerInstance;

  // Point directly to kuromoji's dict inside node_modules
  const dictPath = path.join(process.cwd(), "node_modules", "kuromoji", "dict");

  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: dictPath }).build((err, tokenizer) => {
      if (err) {
        console.error("Failed to load Kuromoji dict from:", dictPath, err);
        reject(err);
      } else {
        tokenizerInstance = tokenizer;
        resolve(tokenizer);
      }
    });
  });
}

/** Utility to extract an 11-character YouTube video ID from various URL formats */
function extractYoutubeId(url?: string): string {
  if (!url) return "";
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, artist, youtubeUrl } = body;

    if (!title || !artist) {
      return NextResponse.json({ error: "Both title and artist are required." }, { status: 400 });
    }

    // Extract YouTube ID if a YouTube URL was provided
    const youtubeId = extractYoutubeId(youtubeUrl);

    // 1. Fetch synced lyrics from LRCLIB (with search fallback)
    let lrcData = null;

    const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      title,
    )}&artist_name=${encodeURIComponent(artist)}`;

    const getRes = await fetch(getUrl, {
      headers: { "User-Agent": "LingoTrack/1.0" },
    });

    const getContentType = getRes.headers.get("content-type") || "";

    if (getRes.ok && getContentType.includes("application/json")) {
      lrcData = await getRes.json();
    } else {
      // Direct match failed — try searching LRCLIB
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "LingoTrack/1.0" },
      });

      const searchContentType = searchRes.headers.get("content-type") || "";

      if (searchRes.ok && searchContentType.includes("application/json")) {
        const searchResults = await searchRes.json();
        lrcData = searchResults.find((item: any) => item.syncedLyrics) || null;
      }
    }

    if (!lrcData || !lrcData.syncedLyrics) {
      return NextResponse.json(
        { error: "No line-synced lyrics found on LRCLIB for this track/artist." },
        { status: 404 },
      );
    }

    // 2. Parse LRC timestamps
    const rawLines = parseLrc(lrcData.syncedLyrics);
    if (rawLines.length === 0) {
      return NextResponse.json({ error: "Failed to parse line timestamps from lyrics." }, { status: 422 });
    }

    // 3. Load Kuromoji Tokenizer
    const tokenizer = await getTokenizer();

    // 4. Tokenize, Romanize & Gloss each line
    const processedLines: LyricLine[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const tokens = await tokenizeLine(tokenizer, line.text);

      processedLines.push({
        id: `l${i + 1}`,
        start: line.start,
        end: line.end,
        tokens,
      });
    }

    // 5. Construct track payload matching Track interface signature
    const outputId = slugify(title);
    const duration = formatDuration(lrcData.duration);
    const trackName = lrcData.trackName || title;

    const track: Track = {
      id: outputId,
      title: trackName,
      titleRomaji: wanakana.toRomaji(trackName) || trackName,
      artist: lrcData.artistName || artist,
      level: "N3",
      duration: duration || "0:00",
      youtubeId,
      accent: CUSTOM_ACCENT,
      summary: `Custom track with ${processedLines.length} tokenized lyric lines.`,
      lyrics: processedLines,
    };

    return NextResponse.json({ track }, { status: 200 });
  } catch (err: any) {
    console.error("Error in /api/import-track:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred during import." }, { status: 500 });
  }
}

/** Parses basic LRC string into line objects with timestamps */
function parseLrc(lrcText: string): Array<{ start: number; end: number; text: string }> {
  const lineRe = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;
  const parsed: Array<{ start: number; text: string }> = [];

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
    start: round2(line.start),
    end: round2(parsed[i + 1] ? parsed[i + 1].start : line.start + 4),
    text: line.text,
  }));
}

/** Tokenizes a single line of Japanese text */
async function tokenizeLine(tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>, text: string): Promise<Token[]> {
  const kuromojiTokens = tokenizer.tokenize(text);
  const tokens: Token[] = [];

  for (const t of kuromojiTokens) {
    const isSymbol = t.pos === "記号";

    if (isSymbol) {
      tokens.push({ surface: t.surface_form, romaji: "", meaning: "", skip: true });
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

/** Maps Japanese POS tags to simplified English labels */
function mapPos(pos: string, detail: string): string {
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

/** Queries Jisho's REST API with in-memory caching and throttling */
async function lookupMeaning(word: string): Promise<string> {
  if (meaningCache.has(word)) {
    return meaningCache.get(word)!;
  }

  let meaning = "";
  try {
    const res = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    });

    const contentType = res.headers.get("content-type") || "";

    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      const senses = data?.data?.[0]?.senses;
      if (senses && senses.length > 0) {
        meaning = senses[0].english_definitions?.join("; ") ?? "";
      }
    }
  } catch {
    // Graceful fallback on network glitch
  }

  if (!meaning) {
    meaning = "(no definition found)";
  }

  meaningCache.set(word, meaning);

  await new Promise((r) => setTimeout(r, JISHO_DELAY_MS));

  return meaning;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
