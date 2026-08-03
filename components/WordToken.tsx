"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { WordToken as WordTokenData, LyricDisplayMode } from "@/lib/types";
import { useVocabStore } from "@/hooks/useVocabStore";
import { createClient } from "@/lib/supabase/client";

const POPOVER_WIDTH = 208;
const POPOVER_EST_HEIGHT = 180;
const VIEWPORT_MARGIN = 8;

export function isJapaneseText(text?: string): boolean {
  if (!text) return false;
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(text);
}

interface WordTokenProps {
  token: WordTokenData;
  songTitle?: string;
  contextSentence?: string;
  active?: boolean;
  displayMode?: LyricDisplayMode;
}

export default function WordToken({
  token,
  songTitle,
  contextSentence,
  active = false,
  displayMode = "kanji",
}: WordTokenProps) {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; flip: boolean } | null>(null);

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Derive target dictionary headword (e.g., "変える" over "変えて")
  const headword = token.baseForm || token.surface;

  // 1. Pull `vocab` array directly from store
  const { vocab, addVocab, removeVocab, isLoaded } = useVocabStore();

  // 2. Derive saved state based on dictionary base form (headword)
  const saved = useMemo(() => {
    if (!isLoaded || !headword) return false;
    return vocab.some((v) => v.token.surface === headword || v.token.baseForm === headword);
  }, [vocab, isLoaded, headword]);

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [supabase]);

  const isJp = isJapaneseText(token.surface);
  if (token.skip || !isJp) {
    return <span>{displayMode === "romaji" ? token.romaji || token.surface : token.surface}</span>;
  }

  function getCalculatedPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const flip = rect.top < POPOVER_EST_HEIGHT + VIEWPORT_MARGIN;
    const halfWidth = POPOVER_WIDTH / 2;
    const centerX = Math.min(
      Math.max(rect.left + rect.width / 2, VIEWPORT_MARGIN + halfWidth),
      window.innerWidth - VIEWPORT_MARGIN - halfWidth,
    );

    return {
      left: centerX,
      top: flip ? rect.bottom + 8 : rect.top - 8,
      flip,
    };
  }

  function handleMouseEnter() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsHovered(true);

    const newCoords = getCalculatedPosition();
    if (newCoords) {
      setCoords(newCoords);
      setOpen(true);
      setIsVisible(true);
    }
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setIsVisible(false);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      setShowAuthWarning(false); // Reset warning state when tooltip hides
    }, 120);
  }

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if user is authenticated
    if (!user) {
      setShowAuthWarning(true);
      return;
    }

    if (saved) {
      removeVocab(headword);
    } else {
      addVocab({
        token: {
          surface: headword, // Saves base form "変える"
          romaji: token.romaji,
          meaning: token.meaning,
          pos: token.pos,
          baseForm: headword,
          conjugation: token.conjugation,
        },
        songTitle,
        contextSentence, // Lyrics line context
        contextSurface: token.surface, // Lyric token context "変えて"
      });
    }
  };

  const renderInlineContent = () => {
    if (displayMode === "romaji") {
      return <span className="font-mono text-sm sm:text-base">{token.romaji}</span>;
    }

    if (displayMode === "furigana") {
      return (
        <ruby className="inline-flex flex-col-reverse items-center align-bottom">
          <span>{token.surface}</span>
          <rt className="font-mono text-[0.65rem] tracking-normal opacity-80 group-hover:text-ink group-focus:text-ink">
            {token.romaji}
          </rt>
        </ruby>
      );
    }

    return token.surface;
  };

  const isHighlighted = isHovered || active;

  return (
    <span
      ref={triggerRef}
      className="group relative mx-0.5 inline-block cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      tabIndex={0}
    >
      <span className={`rounded-sm px-0.5 transition-colors duration-150 ${isHighlighted ? "bg-gold text-ink" : ""}`}>
        {renderInlineContent()}
      </span>

      {open &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`pointer-events-auto fixed z-50 w-max max-w-[13.5rem] transition-all duration-100 ease-out ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
            style={{
              left: coords.left,
              top: coords.top,
              transform: `translate(-50%, ${coords.flip ? "0" : "-100%"}) ${isVisible ? "scale(1)" : "scale(0.95)"}`,
            }}
          >
            {/* Seamless Hover Bridge Buffer */}
            <span
              className="absolute left-0 right-0 h-3"
              style={{
                top: coords.flip ? "-0.75rem" : "auto",
                bottom: coords.flip ? "auto" : "-0.75rem",
              }}
            />

            <span className="relative block rounded-lg border border-gold/40 bg-paper px-3 py-2.5 text-left shadow-tag">
              {/* Nafuda tag punch hole */}
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-gold/50 bg-ink" />

              {/* Title / Reading / Conjugation Header */}
              <div className="flex items-start justify-between gap-1">
                <div>
                  {displayMode === "romaji" ? (
                    <span className="block font-display text-base font-semibold leading-tight text-seal">
                      {token.surface}
                    </span>
                  ) : (
                    <span className="block font-mono text-[0.7rem] uppercase tracking-wide text-seal">
                      {token.romaji}
                    </span>
                  )}
                </div>

                {token.conjugation && (
                  <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold text-seal border border-gold/40">
                    {token.conjugation}
                  </span>
                )}
              </div>

              {/* Base Form Indicator (if conjugated) */}
              {token.baseForm && token.baseForm !== token.surface && (
                <span className="mt-0.5 block font-mono text-[0.65rem] text-ink/70">
                  Base: <strong className="font-semibold text-seal">{token.baseForm}</strong>
                </span>
              )}

              {/* Translation */}
              <span className="mt-1 block font-body text-sm leading-snug text-ink">{token.meaning}</span>

              {token.pos && (
                <span className="mt-0.5 block font-mono text-[0.6rem] uppercase tracking-wider text-ink/50">
                  {token.pos}
                </span>
              )}

              {/* Action Area */}
              <div className="mt-2.5 border-t border-ink/10 pt-2">
                {showAuthWarning ? (
                  <div className="rounded border border-red-900/30 bg-red-500/10 p-2 space-y-1.5">
                    <p className="font-body text-[0.68rem] font-medium leading-tight text-red-900">
                      Sign in to save words to your vocabulary list.
                    </p>
                    <Link
                      href="/login?mode=signup"
                      className="flex w-full items-center justify-center rounded bg-seal px-2 py-1 font-mono text-[0.65rem] font-semibold text-paper transition hover:opacity-90"
                    >
                      Create Account →
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.7rem] font-medium transition ${
                      saved ? "bg-seal/10 text-seal hover:bg-seal/20" : "bg-ink text-paper hover:bg-gold hover:text-ink"
                    }`}
                  >
                    {saved ? `✓ Saved "${headword}" to vocab` : `Add "${headword}" to Vocab`}
                  </button>
                )}
              </div>

              {/* Tail pointing toward word */}
              {coords.flip ? (
                <span className="absolute bottom-full left-1/2 h-2 w-px -translate-x-1/2 bg-gold/50" />
              ) : (
                <span className="absolute left-1/2 top-full h-2 w-px -translate-x-1/2 bg-gold/50" />
              )}
            </span>
          </span>,
          document.body,
        )}
    </span>
  );
}
