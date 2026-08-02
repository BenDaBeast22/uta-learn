import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import kuromoji from "kuromoji";
import * as wanakana from "wanakana";

const JISHO_DELAY_MS = 900; // Paced delay to respect Jisho's ~1 req/sec limit
const CACHE_FILE_PATH = path.join(process.cwd(), "data", "jisho-cache.json");

// Persistent dictionary cache stored on disk
let meaningCache = new Map();

// Load persistent cache from disk if available
function loadMeaningCache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const rawData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const json = JSON.parse(rawData);
      meaningCache = new Map(Object.entries(json));
      console.log(`📦 Loaded ${meaningCache.size} cached word definitions from disk.`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to load Jisho cache file, starting with fresh cache:", err.message);
  }
}

// Save updated cache to disk
function saveMeaningCache() {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj = Object.fromEntries(meaningCache);
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
    console.log(`💾 Saved ${meaningCache.size} word definitions to ${CACHE_FILE_PATH}`);
  } catch (err) {
    console.warn("⚠️ Failed to save Jisho cache to disk:", err.message);
  }
}

// Standard headers for LRCLIB and external APIs
const APP_HEADERS = {
  "User-Agent": "uta-learn/1.0.0 (https://github.com/BenDaBeast22/uta-learn)",
  "Lrclib-Client": "uta-learn/1.0.0",
};

// Explicit particle dictionary using Jisho-style plain definitions.
const PARTICLE_DEFINITIONS = {
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

// Helper: Check if string contains Japanese characters
function isJapaneseText(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(text);
}

// Helper: Capitalize first letter of translation line
function capitalizeFirstLetter(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
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

  try {
    const res = await fetch(getUrl, { headers: APP_HEADERS });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After") || "5";
      console.warn(`⚠️ LRCLIB rate limit reached. Waiting ${retryAfter} seconds...`);
      await new Promise((r) => setTimeout(r, parseInt(retryAfter, 10) * 1000));
      return fetchLrclibLyrics(trackName, artistName, durationSeconds);
    }

    if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
      const data = await res.json();
      if (data.syncedLyrics) return data;
    }

    if (res.status === 404) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${trackName} ${artistName}`)}`;
      const searchRes = await fetch(searchUrl, { headers: APP_HEADERS });

      if (searchRes.status === 429) {
        console.warn("⚠️ LRCLIB search rate limited.");
        return null;
      }

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
    }
  } catch (err) {
    console.error("LRCLIB Network Error:", err);
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

// Helper: Check if translation is exact Romaji phonetic echo
function isTransliteration(translated, original) {
  if (!translated) return true;
  const cleanTrans = translated.toLowerCase().replace(/[^a-z0-9]/g, "");
  const romajiOrig = wanakana
    .toRomaji(original)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return cleanTrans === romajiOrig;
}

// Clean & Direct Google GTX translation
async function translateSingleLine(text) {
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
      .map((c) => c[0] || "")
      .join("")
      .replace(/[.。]$/, "")
      .trim();
  } catch {
    return "";
  }
}

// Helper: Google GTX Chunked Batch Translation
async function batchTranslateLines(lines) {
  if (lines.length === 0) return [];
  const CHUNK_SIZE = 20;
  const results = [];

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

// Helper: Merge te-form, ta-form, and auxiliary verb endings into previous verb tokens
function mergeVerbConjugations(tokens) {
  const merged = [];

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

// Fetch single word definition from Jisho with retry and exponential backoff
async function fetchJishoWithRetry(word, retries = 3) {
  const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: APP_HEADERS });

      if (res.status === 429 || res.status === 403) {
        const delay = (attempt + 1) * 2500;
        console.warn(`\n⚠️ Jisho rate limit hit on "${word}". Waiting ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const senses = data?.data?.[0]?.senses;
        if (senses && senses.length > 0) {
          return senses[0].english_definitions?.join("; ") ?? "";
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return "";
}

// Bulk pre-fetch all unique words from Jisho sequentially
async function prefetchJishoMeanings(wordPairs) {
  const uncached = wordPairs.filter(({ lookupWord }) => lookupWord && !meaningCache.has(lookupWord));
  if (uncached.length === 0) {
    console.log("⚡ All words found in local cache! Skipped Jisho API network calls.");
    return;
  }

  console.log(`🌐 Fetching ${uncached.length} new words from Jisho API...`);

  for (let i = 0; i < uncached.length; i++) {
    const { lookupWord, surface } = uncached[i];
    process.stdout.write(`   Fetching dictionary definitions: ${i + 1}/${uncached.length} ("${lookupWord}")\r`);

    let meaning = await fetchJishoWithRetry(lookupWord);

    if (!meaning && surface && surface !== lookupWord) {
      meaning = await fetchJishoWithRetry(surface);
    }

    meaningCache.set(lookupWord, meaning || "(no dictionary match — fill in manually)");

    // Delay between consecutive API calls to respect ~1 req/sec limit
    if (i < uncached.length - 1) {
      await new Promise((r) => setTimeout(r, JISHO_DELAY_MS));
    }
  }
  console.log("\n");
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
  loadMeaningCache();

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

  console.log("📖 Tokenizing lyrics into memory...");
  const tokenizedLines = rawLines.map((line) => {
    const kuromojiTokens = tokenizer.tokenize(line.text);

    const mapped = kuromojiTokens.map((t) => {
      const isJp = isJapaneseText(t.surface_form);

      if (t.pos === "記号" || !isJp) {
        return {
          surface: t.surface_form,
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

  // Collect unique word pairs for dictionary fetching
  const uniqueWordMap = new Map();
  tokenizedLines.flat().forEach((t) => {
    if (!t.skip && t.lookupWord && !uniqueWordMap.has(t.lookupWord)) {
      uniqueWordMap.set(t.lookupWord, { lookupWord: t.lookupWord, surface: t.surface });
    }
  });

  const uniqueWordPairs = Array.from(uniqueWordMap.values());

  console.log(`📚 Querying Jisho for ${uniqueWordPairs.length} unique words...`);
  await prefetchJishoMeanings(uniqueWordPairs);
  saveMeaningCache();

  // Map processed tokens and meanings back into final LyricLine structure
  const processedLines = tokenizedLines.map((tokens, i) => {
    let lineTranslation = translations[i] || "";

    // Fallback: If Google failed/echoed Romaji AND it's strictly a 1-word line, use Jisho definition
    const interactiveTokens = tokens.filter((t) => !t.skip);
    if (!lineTranslation && interactiveTokens.length === 1) {
      const singleToken = interactiveTokens[0];
      const jishoMeaning = singleToken.meaning || meaningCache.get(singleToken.lookupWord) || "";
      lineTranslation = jishoMeaning.split(";")[0].trim();
    }

    // Capitalize first letter of translation line if present
    lineTranslation = capitalizeFirstLetter(lineTranslation);

    return {
      id: `l${i + 1}`,
      start: rawLines[i].start,
      end: rawLines[i].end,
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

  console.log("✅ Tokenization and translation complete.");

  // Output formatting & file generation
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
