import { Track } from "@/lib/types";
import { mirageLyrics } from "./imports/mirage.lyrics.generated";
import { newGenesis } from "./imports/new-genesis.lyrics.generated";
import { idolLyrics } from "./imports/idol.lyrics.generated";
import { irisOutLyrics } from "./imports/iris-out.lyrics.generated";
import { groovinMagicLyrics } from "./imports/groovin-magic.lyrics.generated";
import { pipoPipoLyrics } from "./imports/pipo-pipo.lyrics.generated";
import { somedayLyrics } from "./imports/someday.lyrics.generated";
import { colorsLyrics } from "./imports/colors.lyrics.generated";

const accentColors = {
  beginner: "#6F9E8C",
  intermediate: "#8C86C9",
  advanced: "#B23A32",
};

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
    id: "new-genesis",
    title: "New Genesis",
    titleRomaji: "New Genesis",
    artist: "Ado",
    level: "Beginner",
    duration: "3:57",
    youtubeId: "1FliVTcX8bQ",
    accent: accentColors.beginner,
    summary: "Lets create our own new world!",
    lyrics: newGenesis,
  },
  {
    id: "iris-out",
    title: "Iris Out",
    titleRomaji: "Iris Out",
    artist: "Kenshi Yonezu",
    level: "Intermediate",
    duration: "2:31",
    youtubeId: "ux3QETpLcPs",
    accent: accentColors.intermediate,
    summary: "Chainsaw go brrrrrrrrrrr",
    lyrics: irisOutLyrics,
  },
  {
    id: "idol",
    title: "アイドル",
    titleRomaji: "Idol",
    artist: "Yaosobi",
    level: "Intermediate",
    duration: "0:26",
    youtubeId: "ZRtdQ81jPUQ",
    accent: accentColors.intermediate,
    summary: "To be or not to be an Idol...",
    lyrics: idolLyrics,
  },
  {
    id: "mirage",
    title: "Mirage",
    titleRomaji: "Mirage",
    artist: "Creepy Nuts",
    level: "Advanced",
    duration: "3:47", // update to the real runtime
    youtubeId: "ce6yxES9oLA",
    accent: "#C6A15B",
    summary: "Deez nuts creepy! Goteem!",
    // I can't fill the lyrics in for you — see the note below the array.
    // Copy the shape of this line once per lyric line in the song:
    lyrics: mirageLyrics,
  },
  {
    id: "groovin-magic",
    title: "Groovin' Magic",
    titleRomaji: "Groovin' Magic",
    artist: "Nino",
    level: "Intermediate",
    duration: "0:26",
    youtubeId: "SlH0gRVzkjM",
    accent: accentColors.intermediate,
    summary: "A quiet nocturne about distant lights and old memories.",
    lyrics: groovinMagicLyrics,
  },
  {
    id: "pipo-pipo",
    title: "ぴぽぴぽ",
    titleRomaji: "Pipo Pipo",
    artist: "Serani Poji",
    level: "Advanced",
    duration: "4:24",
    youtubeId: "53XduToEF_g",
    accent: "#B23A32",
    summary: "Pipo Pipoooo!!!",
    lyrics: pipoPipoLyrics,
  },
  {
    id: "colors",
    title: "Colors",
    titleRomaji: "Colors",
    artist: "Flow",
    level: "Intermediate",
    duration: "3:38",
    youtubeId: "OLVyJl87_CI",
    accent: accentColors.intermediate,
    summary: "Jibun Wooooo!!!",
    lyrics: colorsLyrics,
  },
];

export function getTrack(id: string): Track | undefined {
  return tracks.find((t) => t.id === id);
}
