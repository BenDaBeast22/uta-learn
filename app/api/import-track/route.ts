import { NextRequest, NextResponse } from "next/server";
import { Track, LyricLine } from "@/lib/types";
import path from "node:path";
import kuromoji from "kuromoji";
import * as wanakana from "wanakana";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60; // Max allowed runtime on Pro/Self-hosted Next.js

// Initialize Supabase admin/service client for server-side cache checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Default accent class for user-imported custom tracks
const CUSTOM_ACCENT = "#8C86C9";

// In-memory singletons and cache across warm lambda invocations
let tokenizerInstance: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
const meaningCache = new Map<string, string>();
const LRCLIB_TIMEOUT_MS = 8000;

// Identify client according to LRCLIB rules
const LRCLIB_HEADERS = {
  "User-Agent": "uta-learn/1.0.0 (https://github.com/BenDaBeast22/uta-learn)",
  "Lrclib-Client": "uta-learn/1.0.0",
};

// Explicit particle dictionary using Jisho-style plain definitions.
const PARTICLE_DEFINITIONS: Record<string, string> = {
  て: "indicates continuous action or connects clauses (-te form)",
  で: "indicates location of action, means, or method (at / by / with)",
  に: "indicates direction, destination, time, or target (to / at / in)",
  を: "indicates direct object of an action",
  は: "indicates topic of a sentence",
  が: "indicates subject of a sentence",
  か: "indicates a question or alternative (or)",
  の: "indicates possession or noun modification (of / 's)",
  も: "indicates addition or inclusion (also / too / as well)",
  と: "indicates togetherness or quotation (and / with)",
  へ: "indicates direction or goal (towards / to)",
  から: "indicates starting point or cause (from / because)",
  まで: "indicates endpoint or limit (until / as far as)",
  ね: "indicates request for confirmation (isn't it? / right?)",
  よ: "indicates new information or emphasis (you know)",
};

// Helper: Check if string contains any Japanese characters
function isJapaneseText(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(text);
}

// Helper: Capitalize first word of a sentence or text string ("new world" -> "New world")
function capitalizeFirstWord(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Helper: Check if translation is exact Romaji phonetic echo
function isTransliteration(translated: string, original: string): boolean {
  if (!translated) return true;
  const cleanTrans = translated.toLowerCase().replace(/[^a-z0-9]/g, "");
  const romajiOrig = wanakana
    .toRomaji(original)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return cleanTrans === romajiOrig;
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

// Clean & Direct Google GTX translation
async function translateSingleLine(text: string): Promise<string> {
  if (!text || !text.trim()) return "";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=en&dt=t&q=${encodeURIComponent(
      text.trim(),
    )}`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = await res.json();
    if (!data || !data[0]) return "";

    return data[0]
      .map((c: any) => c[0] || "")
      .join("")
      .replace(/[.。]$/, "")
      .trim();
  } catch {
    return "";
  }
}

/** Robust Batch Translation using chunks to avoid HTTP 414 URL length limit */
async function batchTranslateLines(lines: string[]): Promise<string[]> {
  if (lines.length === 0) return [];

  const CHUNK_SIZE = 20;
  const results: string[] = [];

  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    const chunk = lines.slice(i, i + CHUNK_SIZE);

    const translatedChunk = await Promise.all(
      chunk.map(async (line) => {
        const singleTrans = await translateSingleLine(line);
        if (!singleTrans || isTransliteration(singleTrans, line)) {
          return "";
        }
        return singleTrans;
      }),
    );

    results.push(...translatedChunk);
  }

  return results;
}

// Helper: Merge te-form, ta-form, and auxiliary verb endings into previous verb tokens
function mergeVerbConjugations(tokens: any[]) {
  const merged: any[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const prev = merged[merged.length - 1];

    if (!prev) {
      merged.push({ ...curr });
      continue;
    }

    const isPrevVerb = prev.pos === "verb" || prev.rawPos === "動詞";
    const isTeParticle =
      (curr.rawPos === "助詞" || curr.pos === "particle") && (curr.surface === "て" || curr.surface === "で");
    const isAuxiliary = curr.rawPos === "助動詞" || curr.pos === "auxiliary verb";

    if (isPrevVerb && (isTeParticle || isAuxiliary)) {
      prev.surface += curr.surface;
      prev.romaji += curr.romaji;

      if (isTeParticle) {
        prev.conjugation = "te-form";
      } else if (!prev.conjugation) {
        prev.conjugation = "auxiliary / conjugated";
      }

      prev.baseForm = prev.lookupWord;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
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

/** Helper to fetch Jisho with exponential backoff retries on rate-limits (429) or failures */
async function fetchJishoWithRetry(url: string, retries = 3, delayMs = 300): Promise<any | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        },
      });

      if (res.ok) {
        return await res.json();
      }

      // Retry on rate-limits (429) or server errors (5xx)
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }

      break;
    } catch {
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  return null;
}

/** Pre-fetches Jisho words in small concurrent batches with retries */
async function prefetchJishoMeanings(wordPairs: Array<{ lookupWord: string; surface: string }>) {
  const uncached = wordPairs.filter(({ lookupWord }) => !meaningCache.has(lookupWord));
  if (uncached.length === 0) return;

  const BATCH_SIZE = 2; // Small batch size to respect Jisho limits
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ lookupWord, surface }) => {
        let meaning = "";

        // 1. Primary lookup using lemma/basic form
        const url1 = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(lookupWord)}`;
        const data1 = await fetchJishoWithRetry(url1);
        const senses1 = data1?.data?.[0]?.senses;
        if (senses1 && senses1.length > 0) {
          meaning = senses1[0].english_definitions?.join("; ") ?? "";
        }

        // 2. Fallback lookup using surface form if basic_form returned no matches
        if (!meaning && surface && surface !== lookupWord) {
          const url2 = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(surface)}`;
          const data2 = await fetchJishoWithRetry(url2);
          const senses2 = data2?.data?.[0]?.senses;
          if (senses2 && senses2.length > 0) {
            meaning = senses2[0].english_definitions?.join("; ") ?? "";
          }
        }

        meaningCache.set(lookupWord, meaning || "(no dictionary match — fill in manually)");
      }),
    );

    // Stagger batch intervals slightly to prevent rapid 429 triggers
    await new Promise((r) => setTimeout(r, 250));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, artist, youtubeUrl } = body;

    if (!title || !artist) {
      return NextResponse.json({ error: "Both title and artist are required." }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();
    const youtubeId = extractYoutubeId(youtubeUrl);

    // Fetch duration first so we can include it in the cache check
    const ytDurationSeconds = await getYoutubeDurationSeconds(youtubeId);

    // =========================================================================
    // SUPABASE CACHE LOOKUP (Includes duration tolerance check)
    // =========================================================================
    try {
      let cacheQuery = supabase
        .from("custom_tracks")
        .select("track_data, youtube_url")
        .ilike("title", trimmedTitle)
        .ilike("artist", trimmedArtist);

      const { data: cachedRows, error: cacheError } = await cacheQuery;

      if (!cacheError && cachedRows && cachedRows.length > 0) {
        // If duration is available, find a cached version within 3 seconds tolerance
        const matchedRow = cachedRows.find((row) => {
          const cachedTrack: Track = row.track_data;
          if (!ytDurationSeconds || !cachedTrack.duration) return true;

          const cachedDurationSec = parseDurationToSeconds(cachedTrack.duration);
          return Math.abs(cachedDurationSec - ytDurationSeconds) <= 3;
        });

        if (matchedRow) {
          const cachedTrack: Track = matchedRow.track_data;

          // Attach YouTube ID if original didn't have one
          if (youtubeId && !cachedTrack.youtubeId) {
            cachedTrack.youtubeId = youtubeId;
          }

          return NextResponse.json({ track: cachedTrack, cached: true }, { status: 200 });
        }
      }
    } catch (cacheFetchErr) {
      console.warn("Supabase cache check failed, falling back to full import:", cacheFetchErr);
    }

    // =========================================================================
    // CACHE MISS: RUN FULL IMPORT WORKFLOW
    // =========================================================================

    // 1. Fetch synced lyrics from LRCLIB
    let lrcData: any = null;

    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      trimmedTitle,
    )}&artist_name=${encodeURIComponent(trimmedArtist)}`;

    if (ytDurationSeconds) {
      getUrl += `&duration=${ytDurationSeconds}`;
    }

    try {
      const getRes = await fetchWithTimeout(getUrl, { headers: LRCLIB_HEADERS });

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
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${trimmedTitle} ${trimmedArtist}`)}`;
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

    // 5. Tokenize all lines into memory
    const tokenizedLines = rawLines.map((line) => {
      const kuromojiTokens = tokenizer.tokenize(line.text);
      let hasSeenFirstNonJpWord = false;

      const mapped = kuromojiTokens.map((t) => {
        const isJp = isJapaneseText(t.surface_form);

        if (t.pos === "記号" || !isJp) {
          let formattedSurface = t.surface_form;
          const trimmed = t.surface_form.trim();

          if (!hasSeenFirstNonJpWord && trimmed.length > 0) {
            formattedSurface = capitalizeFirstWord(t.surface_form);
            hasSeenFirstNonJpWord = true;
          }

          return {
            surface: formattedSurface,
            romaji: wanakana.toRomaji(t.surface_form),
            meaning: "",
            pos: mapPos(t.pos, t.pos_detail_1),
            rawPos: t.pos,
            skip: true,
            lookupWord: "",
          };
        }

        if (t.pos === "助詞" && PARTICLE_DEFINITIONS[t.surface_form]) {
          return {
            surface: t.surface_form,
            romaji: wanakana.toRomaji(t.surface_form),
            meaning: PARTICLE_DEFINITIONS[t.surface_form],
            pos: "particle",
            rawPos: t.pos,
            skip: false,
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
          rawPos: t.pos,
          skip: false,
          lookupWord,
        };
      });

      return mergeVerbConjugations(mapped);
    });

    // 6. Bulk pre-fetch all unique words from Jisho with retries & rate-limit throttling
    const uniqueWordMap = new Map<string, { lookupWord: string; surface: string }>();
    tokenizedLines.flat().forEach((t) => {
      if (!t.skip && t.lookupWord && !uniqueWordMap.has(t.lookupWord)) {
        uniqueWordMap.set(t.lookupWord, { lookupWord: t.lookupWord, surface: t.surface });
      }
    });

    const uniqueWordPairs = Array.from(uniqueWordMap.values());
    await prefetchJishoMeanings(uniqueWordPairs);

    // 7. Map meanings back to tokens
    const processedLines: LyricLine[] = tokenizedLines.map((tokens, i) => {
      let lineTranslation = translations[i] || "";

      const interactiveTokens = tokens.filter((t) => !t.skip);
      if (!lineTranslation && interactiveTokens.length === 1) {
        const singleToken = interactiveTokens[0];
        const jishoMeaning = singleToken.meaning || meaningCache.get(singleToken.lookupWord) || "";
        lineTranslation = jishoMeaning.split(";")[0].trim();
      }

      lineTranslation = capitalizeFirstWord(lineTranslation);
      const rawText = capitalizeFirstWord(rawLines[i].text);

      return {
        id: `l${i + 1}`,
        start: rawLines[i].start,
        end: rawLines[i].end,
        text: rawText,
        tokens: tokens.map(({ lookupWord, rawPos, baseForm, conjugation, ...token }) => {
          if (token.meaning) return token;

          return {
            ...token,
            lookupWord,
            baseForm: baseForm || (token.skip ? "" : lookupWord),
            conjugation: conjugation || null,
            meaning: token.skip ? "" : meaningCache.get(lookupWord) || "(no dictionary match — fill in manually)",
          };
        }),
        translation: lineTranslation,
      };
    });

    // 8. Construct final track payload
    const outputId = slugify(trimmedTitle);
    const finalDurationSeconds = ytDurationSeconds || lrcData.duration;
    const duration = formatDuration(finalDurationSeconds);
    const trackName = lrcData.trackName || trimmedTitle;

    const track: Track = {
      id: outputId,
      title: trackName,
      titleRomaji: wanakana.toRomaji(trackName) || trackName,
      artist: lrcData.artistName || trimmedArtist,
      level: "Custom",
      duration: duration || "0:00",
      youtubeId,
      accent: CUSTOM_ACCENT,
      summary: `Custom track with ${processedLines.length} tokenized lyric lines.`,
      lyrics: processedLines,
      isCustom: true,
    };

    return NextResponse.json({ track, cached: false }, { status: 200 });
  } catch (err: any) {
    console.error("Error in /api/import-track:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred during import." }, { status: 500 });
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

function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return 0;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
