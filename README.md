# Uta Learn

Learn Japanese through songs. Browse tracks, open one, and follow lyrics that
highlight in sync with the YouTube video. Hover (or tab to) any word to see
its romaji and meaning in a small popup.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/
  page.tsx              Tracks list (home page)
  track/[id]/page.tsx    Track detail page
  layout.tsx, globals.css
components/
  YouTubePlayer.tsx      Wraps the YouTube IFrame API, reports currentTime
  TrackPlayer.tsx        Combines the player + lyrics panel, holds playback state
  LyricsPanel.tsx        Renders lines, highlights the active one, auto-scrolls
  WordToken.tsx          A single hoverable word + its translation popover
  TrackCard.tsx          Card on the tracks list
data/tracks.ts           Track + lyric data (see "Adding a track" below)
lib/types.ts             Track / LyricLine / WordToken types
```

## Adding your own track

Open `data/tracks.ts` and add an entry to the `tracks` array:

```ts
{
  id: "your-track-slug",         // used in the URL: /track/your-track-slug
  title: "曲のタイトル",
  titleRomaji: "Kyoku no Taitoru",
  artist: "Artist Name",
  level: "Beginner",              // "Beginner" | "Intermediate" | "Advanced"
  duration: "3:42",
  youtubeId: "dQw4w9WgXcQ",       // the ?v= id from the YouTube URL
  accent: "#6F9E8C",              // any hex color, used as the track's highlight color
  summary: "One line describing the song.",
  lyrics: [
    {
      id: "l1",
      start: 12.4,                // seconds into the video when this line starts
      end: 16.8,                  // seconds when this line ends
      tokens: [
        { surface: "言葉", romaji: "kotoba", meaning: "word, language", pos: "noun" },
        // one entry per word/particle in the line, in order
      ],
    },
    // ...more lines
  ],
}
```

### Finding line timestamps

The easiest way is to play the video and jot down the timestamp each line
starts and ends, in seconds (e.g. 1:23 → 83). There's no automatic
transcription in the app — it's built around lyrics you (or a transcription
tool) provide.

### Importing timestamps from LRCLIB

You can also pull timestamps from [LRCLIB](https://lrclib.net), a free
community database of synced lyrics, instead of timing lines by ear:

```bash
npm run dev                 # in one terminal — the script calls your local API route
npm run fetch-lyrics -- "Mirage" "Creepy Nuts" mirage   # in another terminal
```

This calls `app/api/lyrics/route.ts` (which proxies LRCLIB's search API) and
writes `data/imports/mirage.json` with one entry per line: `start`, `end`
(both in seconds, derived from the line timestamps), and the raw line `text`.

That file is a starting skeleton, not a finished track entry:

- It is **not** split into word tokens, and has no romaji or meaning yet.
- LRCLIB's coverage varies — some tracks have no synced lyrics at all, in
  which case the script says so instead of writing a file.
- `data/imports/` is gitignored by default, since the fetched text is the
  song's actual copyrighted lyrics — keep that in mind if you publish or
  share your fork.

To finish a line: copy its `text` into a `tokens` array in `data/tracks.ts`,
splitting it into words/particles, and add `romaji`/`meaning` per word. Ask
for help with the grammar breakdown or romaji for a line or word you paste in
— that's fine a piece at a time, it's just a whole song's lyrics that can't
be reproduced wholesale.

Or automate that splitting step — see the next section.

### Auto-splitting into word tokens

```bash
npm run tokenize-lyrics -- data/imports/mirage.json
```

This reads the skeleton from `fetch-lyrics` and, for each line:

1. Splits it into words with [kuromoji](https://www.npmjs.com/package/kuromoji), a Japanese morphological analyzer (segmentation + part of speech).
2. Romanizes each word's reading with [wanakana](https://www.npmjs.com/package/wanakana).
3. Looks up an English gloss for each word from [Jisho](https://jisho.org)'s public dictionary API, caching repeated words (particles especially) so it doesn't refetch the same word twice.

It writes two files next to the input:

- `data/imports/mirage.tokens.json` — plain data, useful for a quick look.
- `data/imports/mirage.lyrics.generated.ts` — a `LyricLine[]` you can import
  directly. In `data/tracks.ts`, add
  `import { generatedLyrics } from "./imports/mirage.lyrics.generated";`
  near the top, then set that track's `lyrics: generatedLyrics`.

**This is a first draft, not a finished translation.** Things worth checking
by hand afterward:

- **は and へ**: as a topic-marker particle, は is pronounced/romanized "wa,"
  not "ha" — kuromoji reports the raw reading, so the script doesn't correct
  this. Same for へ ("e," not "he") as the "toward" particle. Fix these
  manually wherever they show up.
- **Missing definitions**: `meaning` is filled in as `"(no dictionary match —
  fill in manually)"` when Jisho has nothing for that word — common for
  slang, names, or compound words kuromoji split incorrectly.
- **Wrong sense picked**: Jisho returns its first/most common definition,
  which isn't always the one that fits the line — words with several
  unrelated meanings need a manual check against the actual context.
- **Verb/adjective conjugations**: kuromoji looks up the dictionary form
  (e.g. 好き for 好きな), so the gloss may read slightly differently than the
  inflected surface form in the line.

### Demo data

The three tracks that ship with the app use **original placeholder lyrics**
written for this project, not transcriptions of real songs, and their
`youtubeId`s are placeholders (`REPLACE_WITH_YOUTUBE_ID_1`, etc.). Replace
both the `youtubeId` and `lyrics` for each entry with a real video and its
matching, properly-timed lyrics before using it for real practice — the two
need to line up.

## Notes on scope

This is a solid starting point, not a full product. Things you'll likely want
to add next:

- A database (e.g. Postgres via Prisma, or Supabase) instead of the static
  `data/tracks.ts` file, so tracks can be added without redeploying.
- A lyrics editor UI for setting line timestamps by ear instead of hand-editing JSON.
- Per-word (not just per-line) timing, if you want karaoke-style word-by-word highlighting.
- User accounts and progress tracking (words learned, tracks completed).
- A real Japanese dictionary/API (e.g. Jisho) instead of hand-written glosses,
  if you want translations for arbitrary songs rather than curated ones.
