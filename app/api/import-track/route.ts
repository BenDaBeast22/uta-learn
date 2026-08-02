import { NextRequest, NextResponse } from "next/server";
import { Track, LyricLine, WordToken } from "@/lib/types";
import path from "node:path";
import kuromoji from "kuromoji";
import * as wanakana from "wanakana";

export const maxDuration = 60; // Max allowed runtime on Pro/Self-hosted Next.js

// Default accent class for user-imported custom tracks
const CUSTOM_ACCENT = "#8C86C9";

// In-memory singletons and cache across warm lambda invocations
let tokenizerInstance: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
const meaningCache = new Map<string, string>();
const LRCLIB_TIMEOUT_MS = 8000;

// Identify your client properly according to LRCLIB rules
const LRCLIB_HEADERS = {
  "User-Agent": "uta-learn/1.0.0 (https://github.com/BenDaBeast22/uta-learn)",
  "Lrclib-Client": "uta-learn/1.0.0",
};

// Helper: Check if string contains any Japanese characters
function isJapaneseText(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(text);
}

async function getTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  if (tokenizerInstance) return tokenizerInstance;

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

function extractYoutubeId(url?: string): string {
  if (!url) return "";
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : "";
}

async function getYoutubeDurationSeconds(youtubeId: string): Promise<number | null> {
  if (!youtubeId) return null;

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const res = await fetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/"lengthSeconds":"(\d+)"/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  } catch (err) {
    console.warn("Could not fetch YouTube duration:", err);
  }

  return null;
}

/** Robust Batch Translation using chunks to avoid HTTP 414 URL length limit */
async function batchTranslateLines(lines: string[]): Promise<string[]> {
  if (lines.length === 0) return [];

  // Break lines into chunks of 20 to avoid exceeding URL parameter limits
  const CHUNK_SIZE = 20;
  const results: string[] = [];

  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    const chunk = lines.slice(i, i + CHUNK_SIZE);
    const joinedText = chunk.join("\n");

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=en&dt=t&q=${encodeURIComponent(
        joinedText,
      )}`;

      const res = await fetch(url);
      if (!res.ok) {
        results.push(...chunk.map(() => ""));
        continue;
      }

      const data = await res.json();
      if (!data || !data[0]) {
        results.push(...chunk.map(() => ""));
        continue;
      }

      const translatedText = data[0].map((c: any) => c[0] || "").join("");
      const splitTranslated = translatedText.split("\n");

      results.push(...splitTranslated);
    } catch (err) {
      console.error("Failed chunk translation:", err);
      results.push(...chunk.map(() => ""));
    }
  }

  return results;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = LRCLIB_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, artist, youtubeUrl } = body;

    if (!title || !artist) {
      return NextResponse.json({ error: "Both title and artist are required." }, { status: 400 });
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    const ytDurationSeconds = await getYoutubeDurationSeconds(youtubeId);

    // 1. Fetch synced lyrics from LRCLIB
    let lrcData: any = null;

    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      title,
    )}&artist_name=${encodeURIComponent(artist)}`;

    if (ytDurationSeconds) {
      getUrl += `&duration=${ytDurationSeconds}`;
    }

    try {
      const getRes = await fetchWithTimeout(getUrl, { headers: LRCLIB_HEADERS });

      // Handle LRCLIB Rate Limiting (429) & Capacity Errors (502, 503, 504)
      if (getRes.status === 429) {
        const retryAfter = getRes.headers.get("Retry-After") || "5";
        return NextResponse.json(
          { error: `LRCLIB rate limit reached. Please wait ${retryAfter} seconds before trying again.` },
          { status: 429 },
        );
      }

      if ([502, 503, 504].includes(getRes.status)) {
        return NextResponse.json(
          { error: "LRCLIB servers are currently overloaded. Please try again in a moment." },
          { status: 503 },
        );
      }

      const getContentType = getRes.headers.get("content-type") || "";

      if (getRes.ok && getContentType.includes("application/json")) {
        lrcData = await getRes.json();
      } else if (getRes.status === 404) {
        // Direct match failed — attempt searching LRCLIB
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`)}`;
        const searchRes = await fetchWithTimeout(searchUrl, { headers: LRCLIB_HEADERS });

        if (searchRes.status === 429) {
          return NextResponse.json({ error: "LRCLIB rate limit reached." }, { status: 429 });
        }

        const searchContentType = searchRes.headers.get("content-type") || "";

        if (searchRes.ok && searchContentType.includes("application/json")) {
          const searchResults: any[] = await searchRes.json();

          if (ytDurationSeconds && searchResults.length > 0) {
            const syncedWithDuration = searchResults
              .filter((item: any) => item.syncedLyrics && item.duration)
              .sort((a, b) => Math.abs(a.duration - ytDurationSeconds) - Math.abs(b.duration - ytDurationSeconds));

            lrcData = syncedWithDuration[0] || null;
          }

          if (!lrcData) {
            lrcData = searchResults.find((item: any) => item.syncedLyrics) || null;
          }
        }
      }
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "LRCLIB took too long to respond. Please try again shortly." },
          { status: 504 },
        );
      }
      throw fetchErr;
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

    // 3. Batch translate raw Japanese sentences
    const plainSentences = rawLines.map((line) => line.text);
    const translations = await batchTranslateLines(plainSentences);

    // 4. Load Kuromoji Tokenizer
    const tokenizer = await getTokenizer();

    // 5. Tokenize all lines into memory first
    const tokenizedLines = rawLines.map((line) => {
      const kuromojiTokens = tokenizer.tokenize(line.text);
      return kuromojiTokens.map((t) => {
        const isJp = isJapaneseText(t.surface_form);

        if (t.pos === "記号" || !isJp) {
          return {
            surface: t.surface_form,
            romaji: wanakana.toRomaji(t.surface_form),
            meaning: "",
            pos: mapPos(t.pos, t.pos_detail_1),
            skip: true,
            lookupWord: "",
          };
        }

        const reading = t.reading && t.reading !== "*" ? t.reading : t.surface_form;
        const romaji = wanakana.toRomaji(reading);
        const lookupWord = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;

        return {
          surface: t.surface_form,
          romaji,
          meaning: "",
          pos: mapPos(t.pos, t.pos_detail_1),
          lookupWord,
        };
      });
    });

    // 6. Bulk pre-fetch all unique words from Jisho with concurrency (Fast & avoids timeouts)
    const uniqueLookupWords = Array.from(
      new Set(
        tokenizedLines
          .flat()
          .filter((t) => !t.skip && t.lookupWord)
          .map((t) => t.lookupWord),
      ),
    );

    await prefetchJishoMeanings(uniqueLookupWords);

    // 7. Map meanings back to tokens
    const processedLines: LyricLine[] = tokenizedLines.map((tokens, i) => ({
      id: `l${i + 1}`,
      start: rawLines[i].start,
      end: rawLines[i].end,
      tokens: tokens.map(({ lookupWord, ...token }) => ({
        ...token,
        meaning: token.skip ? "" : meaningCache.get(lookupWord) || "(no definition found)",
      })),
      translation: translations[i] || "",
    }));

    // 8. Construct final track payload
    const outputId = slugify(title);
    const finalDurationSeconds = ytDurationSeconds || lrcData.duration;
    const duration = formatDuration(finalDurationSeconds);
    const trackName = lrcData.trackName || title;

    const track: Track = {
      id: outputId,
      title: trackName,
      titleRomaji: wanakana.toRomaji(trackName) || trackName,
      artist: lrcData.artistName || artist,
      level: "",
      duration: duration || "0:00",
      youtubeId,
      accent: CUSTOM_ACCENT,
      summary: `Custom track with ${processedLines.length} tokenized lyric lines.`,
      lyrics: processedLines,
      isCustom: true,
    };

    return NextResponse.json({ track }, { status: 200 });
  } catch (err: any) {
    console.error("Error in /api/import-track:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred during import." }, { status: 500 });
  }
}

/** Pre-fetches Jisho words in small concurrent batches (3 requests at a time with 150ms delay) */
async function prefetchJishoMeanings(words: string[]) {
  const uncached = words.filter((w) => !meaningCache.has(w));
  if (uncached.length === 0) return;

  const BATCH_SIZE = 3; // Keep concurrent requests low to avoid Jisho IP bans
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (word) => {
        let meaning = "";
        try {
          const res = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            },
          });

          if (res.ok) {
            const data = await res.json();
            const senses = data?.data?.[0]?.senses;
            if (senses && senses.length > 0) {
              meaning = senses[0].english_definitions?.join("; ") ?? "";
            }
          }
        } catch {
          // Graceful fallback
        }

        meaningCache.set(word, meaning || "(no definition found)");
      }),
    );

    // Brief pause between batches
    await new Promise((r) => setTimeout(r, 150));
  }
}

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
