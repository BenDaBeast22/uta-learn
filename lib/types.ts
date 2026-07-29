export type Level = "Beginner" | "Intermediate" | "Advanced";

export interface WordToken {
  /** The word exactly as it appears in the lyric line (kanji/kana/punctuation) */
  surface: string;
  /** Romanized reading, e.g. "natsu" */
  romaji: string;
  /** Short English gloss, e.g. "summer" */
  meaning: string;
  /** Optional part of speech tag, e.g. "noun", "verb", "particle" */
  pos?: string;
  /** If true, this token is punctuation/whitespace and isn't hoverable */
  skip?: boolean;
  /**
   * Optional word-level timestamp in seconds. If every token in a line has
   * this set, the app builds an "enhanced" LRC line so Liricle can report
   * exactly which word is being sung, for karaoke-style highlighting. If
   * any token in the line omits it, that line falls back to line-level sync.
   */
  time?: number;
}

export interface LyricLine {
  id: string;
  /** Line start time in seconds, relative to the YouTube video */
  start: number;
  /** Line end time in seconds */
  end: number;
  tokens: WordToken[];
  translation?: string; // english translation
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
  isCustom?: boolean;
}

export interface SavedVocabItem {
  id: string; // Unique identifier (e.g., token surface + reading or timestamp)
  token: WordToken;
  songTitle?: string;
  artist?: string;
  contextSentence?: string; // The full lyric line where the word was found
  savedAt: number; // Date timestamp
}

export type LyricDisplayMode = "kanji" | "romaji" | "dual" | "english";
