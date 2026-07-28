"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { WordToken as WordTokenData, LyricDisplayMode } from "@/lib/types";

const POPOVER_WIDTH = 208;
const POPOVER_EST_HEIGHT = 160;
const VIEWPORT_MARGIN = 8;

interface WordTokenProps {
  token: WordTokenData;
  active?: boolean;
  displayMode?: LyricDisplayMode;
  onSaveVocab?: (token: WordTokenData) => void;
  isSaved?: boolean;
}

export default function WordToken({
  token,
  active = false,
  displayMode = "kanji",
  onSaveVocab,
  isSaved = false,
}: WordTokenProps) {
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; flip: boolean } | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (token.skip) {
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
    // Instantly cancel any closing timer from leaving previous elements
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
    }, 120);
  }

  const renderInlineContent = () => {
    if (displayMode === "romaji") {
      return <span className="font-mono text-sm sm:text-base">{token.romaji}</span>;
    }

    if (displayMode === "dual") {
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

  // Combine active state, CSS hover, and state-driven hover so the highlight never drops
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
            className={`pointer-events-auto fixed z-50 w-max max-w-[13rem] transition-all duration-100 ease-out ${
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

              {/* Title / Reading */}
              {displayMode === "romaji" ? (
                <span className="block font-display text-base font-semibold leading-tight text-seal">
                  {token.surface}
                </span>
              ) : (
                <span className="block font-mono text-[0.7rem] uppercase tracking-wide text-seal">{token.romaji}</span>
              )}

              {/* Translation */}
              <span className="mt-0.5 block font-body text-sm leading-snug text-ink">{token.meaning}</span>

              {token.pos && (
                <span className="mt-0.5 block font-mono text-[0.6rem] uppercase tracking-wider text-ink/50">
                  {token.pos}
                </span>
              )}

              {/* Action Button */}
              <div className="mt-2.5 border-t border-ink/10 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveVocab?.(token);
                  }}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.7rem] font-medium transition ${
                    isSaved ? "bg-seal/10 text-seal cursor-default" : "bg-ink text-paper hover:bg-gold hover:text-ink"
                  }`}
                >
                  {isSaved ? "✓ Saved to Vocab" : "+ Add to Vocab"}
                </button>
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
