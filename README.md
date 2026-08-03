# Uta Learn

Learn Japanese through songs. Browse tracks, open one, and follow lyrics that
highlight in sync with the YouTube video. Hover (or tab to) any word to see
its romaji and meaning.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/
  page.tsx               Tracks list (home page)
  track/[id]/page.tsx    Track detail page
  api/lyrics/route.ts    Proxies LRCLIB's search API
components/
  YouTubePlayer.tsx      Wraps the YouTube IFrame API, reports currentTime
  TrackPlayer.tsx        Player + lyrics panel, holds playback state, seeks on line click
  LyricsPanel.tsx        Renders lines, highlights the active one/word, auto-scrolls
  WordToken.tsx          A hoverable word + its translation popover (portaled to <body>)
  TrackCard.tsx          Card on the tracks list
data/tracks.ts           Track + lyric data (see "Adding a track" below)
lib/types.ts             Track / LyricLine / WordToken types
lib/useLyricSync.ts      Drives line/word highlighting via Liricle
scripts/                 CLI tools for pulling in lyrics — see below
```

## Adding a track

Add an entry to the `tracks` array in `data/tracks.ts`:

```ts
{
  id: "your-track-slug",      // used in the URL: /track/your-track-slug
  title: "曲のタイトル",
  titleRomaji: "Kyoku no Taitoru",
  artist: "Artist Name",
  level: "Beginner",           // "Beginner" | "Intermediate" | "Advanced"
  duration: "3:42",
  youtubeId: "dQw4w9WgXcQ",    // the ?v= id from the YouTube URL
  accent: "#6F9E8C",           // any hex color, used as the track's highlight color
  summary: "One line describing the song.",
  lyrics: [
    {
      id: "l1",
      start: 12.4,             // seconds into the video when this line starts
      end: 16.8,
      tokens: [
        { surface: "言葉", romaji: "kotoba", meaning: "word, language", pos: "noun" },
        // one entry per word/particle, in order. Add `time` (seconds) to
        // every token in a line for karaoke-style word-by-word highlighting.
      ],
    },
  ],
}
```

You can type this by hand, or generate most of it — see below.

## Importing lyrics

```bash
npm run import-lyrics -- "Mirage" "Creepy Nuts" mirage [--duration=2:19]   # terminal 2
```

This fetches synced lyrics from [LRCLIB](https://lrclib.net) (via
`app/api/lyrics/route.ts`), then splits each line into words using
[kuromoji](https://www.npmjs.com/package/kuromoji) (segmentation),
[wanakana](https://www.npmjs.com/package/wanakana) (romaji), and
[Jisho](https://jisho.org) (English glosses). It needs `npm run dev` running
in another terminal since it calls your local API route. The third argument
is optional — it defaults to a slugified track name.

It writes, to `data/imports/`:

- `mirage.json` — raw line timestamps + text
- `mirage.tokens.json` — same, tokenized
- `mirage.lyrics.generated.ts` — a `LyricLine[]` ready to import

Wire it up in `data/tracks.ts`:

```ts
import { generatedLyrics } from "./imports/mirage.lyrics.generated";
// ...
{ id: "mirage", ..., lyrics: generatedLyrics },
```

**Treat the output as a first draft.** Known rough edges:

- は and へ come back romanized as "ha"/"he" even when used as the
  wa/e-pronounced particles — fix these by hand.
- `"(no dictionary match — fill in manually)"` shows up when Jisho has
  nothing for a word (slang, names, mis-split compounds).
- Jisho returns its top definition, which isn't always the right sense in
  context — and kuromoji glosses the dictionary form, not the inflected one.

Prefer to run the two halves separately (e.g. to check LRCLIB matched the
right song before tokenizing)? `npm run fetch-lyrics -- "<track>" "<artist>"
[id]` and `npm run tokenize-lyrics -- data/imports/<id>.json` do the same
work as two steps.

No synced lyrics on LRCLIB, or don't want to use it? Time lines by ear
instead — play the video and note each line's start/end in seconds.

## Demo data

The three tracks that ship with the app (`natsu-no-kaze`, `tsuki-akari`,
`ashita-e`) use original placeholder lyrics written for this project, not
real songs, with placeholder `youtubeId`s. The `mirage` entry points at a
real video but ships with empty `lyrics` — fill it in via the import flow
above. `data/imports/` is gitignored, since what lands there is real
copyrighted lyrics text.

## Notes on scope

A starting point, not a full product. Likely next steps:

- A database instead of the static `data/tracks.ts` file
- A lyrics-timing editor UI instead of hand-editing JSON
- User accounts and progress tracking
