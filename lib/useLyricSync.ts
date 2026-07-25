"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Liricle from "liricle";
import { LyricLine } from "./types";
import { buildLrc } from "./buildLrc";

export interface LyricSyncState {
  /** Index into the `lines` array of the currently active line, or -1 */
  lineIndex: number;
  /** Index into the active line's tokens of the currently sung word, or null */
  wordIndex: number | null;
}

/**
 * Feeds our line/token data to Liricle as LRC text once, then re-syncs
 * against the given `currentTime` on every change. Liricle owns the actual
 * "which line/word is active right now" lookup.
 */
export function useLyricSync(lines: LyricLine[], currentTime: number): LyricSyncState {
  const liricleRef = useRef<Liricle | null>(null);
  const [state, setState] = useState<LyricSyncState>({ lineIndex: -1, wordIndex: null });

  // Only rebuild the LRC text (and the Liricle instance) when the actual
  // line/token data changes, not on every render.
  const lrcText = useMemo(() => buildLrc(lines), [lines]);

  useEffect(() => {
    const liricle = new Liricle();
    liricleRef.current = liricle;

    liricle.on("sync", (line: any, word: any) => {
      const lineIndex = line ? (line.index as number) : -1;
      let wordIndex: number | null = null;
      if (line && word) {
        wordIndex =
          typeof word.index === "number" ? word.index : (line.words?.indexOf(word) ?? null);
      }
      setState({ lineIndex, wordIndex });
    });

    liricle.load({ text: lrcText });

    return () => {
      liricleRef.current = null;
    };
  }, [lrcText]);

  useEffect(() => {
    liricleRef.current?.sync(currentTime);
  }, [currentTime]);

  return state;
}
