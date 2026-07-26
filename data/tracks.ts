import { Track } from "@/lib/types";
import { mirageLyrics } from "./imports/mirage.lyrics.generated";
import { maMeuilleureEnnemieLyrics } from "./imports/ma-meilleure-ennemie.lyrics.generated";

/**
 * NOTE ON CONTENT:
 * The first two tracks ("natsu-no-kaze", "tsuki-akari") ship with original,
 * simple demo lyrics written for this app — not transcriptions of real
 * copyrighted songs — plus placeholder YouTube ids.
 *
 * The "mirage" track uses a real song's YouTube video, but its `lyrics`
 * array is intentionally left empty as a skeleton for you to fill in. I
 * can't transcribe, translate, or otherwise reproduce a real song's lyrics
 * (that applies to any copyrighted song, not just this one). To fill it in:
 *   1. Find the official/licensed lyrics (e.g. a lyrics site, the single's
 *      liner notes, or a licensed lyrics API) and use those with rights you
 *      have to them.
 *   2. Paste each line's Japanese text into a `tokens` array, splitting it
 *      into words/particles.
 *   3. Add romaji + an English gloss per word. Ask me to help with the
 *      grammar breakdown or romaji for words you paste in one at a time —
 *      I just can't assemble the full song's lyrics myself.
 *   4. Time each line by ear against the video for `start`/`end` (seconds).
 *   5. Optional, for karaoke-style word highlighting: give every token in a
 *      line a `time` (seconds) too. Lines where every token has a `time`
 *      get word-level sync via Liricle; lines missing any are still
 *      highlighted at the line level.
 */

export const tracks: Track[] = [
  {
    id: "mirage",
    title: "Mirage",
    titleRomaji: "Mirage",
    artist: "Creepy Nuts",
    level: "Advanced",
    duration: "3:47", // update to the real runtime
    youtubeId: "ce6yxES9oLA",
    accent: "#C6A15B",
    summary: "Add your own one-line summary here.",
    // I can't fill the lyrics in for you — see the note below the array.
    // Copy the shape of this line once per lyric line in the song:
    lyrics: mirageLyrics,
  },
  {
    id: "ma-meilleure-ennemie",
    title: "Ma Meilleure Ennemie",
    titleRomaji: "Ma Meuilleueure Ennemie",
    artist: "Stromae",
    level: "Beginner",
    duration: "2:48",
    youtubeId: "34O4TxvuEKE",
    accent: "#6F9E8C",
    summary: "A gentle walk under a summer sky — short lines, everyday words.",
    lyrics: maMeuilleureEnnemieLyrics,
  },
  {
    id: "tsuki-akari",
    title: "月明かり",
    titleRomaji: "Tsuki Akari",
    artist: "Uta Learn Demo",
    level: "Intermediate",
    duration: "0:26",
    youtubeId: "REPLACE_WITH_YOUTUBE_ID_2",
    accent: "#8C86C9",
    summary: "A quiet nocturne about distant lights and old memories.",
    lyrics: [
      {
        id: "l1",
        start: 2,
        end: 6,
        tokens: [
          { surface: "静か", romaji: "shizuka", meaning: "quiet", pos: "na-adjective" },
          { surface: "な", romaji: "na", meaning: "(links the adjective)", pos: "particle" },
          { surface: "夜", romaji: "yoru", meaning: "night", pos: "noun" },
          { surface: "に", romaji: "ni", meaning: "in, at", pos: "particle" },
        ],
      },
      {
        id: "l2",
        start: 6,
        end: 10,
        tokens: [
          { surface: "月", romaji: "tsuki", meaning: "moon", pos: "noun" },
          { surface: "が", romaji: "ga", meaning: "(marks the subject)", pos: "particle" },
          { surface: "浮かんでいる", romaji: "ukande iru", meaning: "is floating", pos: "verb" },
        ],
      },
      {
        id: "l3",
        start: 10,
        end: 15,
        tokens: [
          { surface: "遠く", romaji: "tooku", meaning: "a distant place", pos: "noun" },
          { surface: "の", romaji: "no", meaning: "'s / of", pos: "particle" },
          { surface: "街", romaji: "machi", meaning: "town", pos: "noun" },
          { surface: "の", romaji: "no", meaning: "'s / of", pos: "particle" },
          { surface: "灯り", romaji: "akari", meaning: "light, glow", pos: "noun" },
        ],
      },
      {
        id: "l4",
        start: 15,
        end: 19,
        tokens: [
          { surface: "思い出", romaji: "omoide", meaning: "memories", pos: "noun" },
          { surface: "が", romaji: "ga", meaning: "(marks the subject)", pos: "particle" },
          { surface: "よみがえる", romaji: "yomigaeru", meaning: "to come back, revive", pos: "verb" },
        ],
      },
    ],
  },
  {
    id: "ashita-e",
    title: "明日へ",
    titleRomaji: "Ashita e",
    artist: "Uta Learn Demo",
    level: "Advanced",
    duration: "0:28",
    youtubeId: "REPLACE_WITH_YOUTUBE_ID_3",
    accent: "#B23A32",
    summary: "An anthem about moving forward one small, uncertain step at a time.",
    lyrics: [
      {
        id: "l1",
        start: 2,
        end: 6,
        tokens: [
          { surface: "涙", romaji: "namida", meaning: "tears", pos: "noun" },
          { surface: "を", romaji: "wo", meaning: "(marks the object)", pos: "particle" },
          { surface: "拭いて", romaji: "fuite", meaning: "wipe, and...", pos: "verb" },
          { surface: "前", romaji: "mae", meaning: "front, ahead", pos: "noun" },
          { surface: "を", romaji: "wo", meaning: "(marks the object)", pos: "particle" },
          { surface: "向く", romaji: "muku", meaning: "to face, turn toward", pos: "verb" },
        ],
      },
      {
        id: "l2",
        start: 6,
        end: 11,
        tokens: [
          { surface: "誰", romaji: "dare", meaning: "who", pos: "pronoun" },
          { surface: "も", romaji: "mo", meaning: "even, also", pos: "particle" },
          { surface: "が", romaji: "ga", meaning: "(marks the subject)", pos: "particle" },
          { surface: "迷い", romaji: "mayoi", meaning: "wandering, hesitation", pos: "noun" },
          { surface: "ながら", romaji: "nagara", meaning: "while (doing)", pos: "particle" },
          { surface: "進む", romaji: "susumu", meaning: "to move forward", pos: "verb" },
        ],
      },
      {
        id: "l3",
        start: 11,
        end: 16,
        tokens: [
          { surface: "小さな", romaji: "chiisana", meaning: "small", pos: "adjective" },
          { surface: "一歩", romaji: "ippo", meaning: "one step", pos: "noun" },
          { surface: "でも", romaji: "demo", meaning: "even (if)", pos: "particle" },
          { surface: "構わない", romaji: "kamawanai", meaning: "it doesn't matter, that's fine", pos: "verb" },
        ],
      },
      {
        id: "l4",
        start: 16,
        end: 21,
        tokens: [
          { surface: "明日", romaji: "ashita", meaning: "tomorrow", pos: "noun" },
          { surface: "へ", romaji: "e", meaning: "toward", pos: "particle" },
          { surface: "続く", romaji: "tsuzuku", meaning: "to continue", pos: "verb" },
          { surface: "道", romaji: "michi", meaning: "road, path", pos: "noun" },
          { surface: "を", romaji: "wo", meaning: "(marks the object)", pos: "particle" },
          { surface: "歩こう", romaji: "arukou", meaning: "let's walk", pos: "verb" },
        ],
      },
    ],
  },
];

export function getTrack(id: string): Track | undefined {
  return tracks.find((t) => t.id === id);
}
