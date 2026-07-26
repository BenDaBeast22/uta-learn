"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WordToken as WordTokenData } from "@/lib/types";

const POPOVER_WIDTH = 208; // px — matches max-w-[13rem] below
const POPOVER_EST_HEIGHT = 132; // px — rough estimate, used to decide whether to flip below
const VIEWPORT_MARGIN = 8;

export default function WordToken({ token, active = false }: { token: WordTokenData; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; flip: boolean } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  if (token.skip) {
    return <span>{token.surface}</span>;
  }

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Not enough room above the word (e.g. it's near the top of the
    // viewport) -> show the card below the word instead.
    const flip = rect.top < POPOVER_EST_HEIGHT + VIEWPORT_MARGIN;

    // Keep the card from running off the left/right edge of the screen.
    const halfWidth = POPOVER_WIDTH / 2;
    const centerX = Math.min(
      Math.max(rect.left + rect.width / 2, VIEWPORT_MARGIN + halfWidth),
      window.innerWidth - VIEWPORT_MARGIN - halfWidth,
    );

    setCoords({
      left: centerX,
      top: flip ? rect.bottom + 10 : rect.top - 10,
      flip,
    });
  }

  function show() {
    updatePosition();
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  return (
    <span
      ref={triggerRef}
      className="group relative inline-block cursor-help"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
    >
      <span
        className={`rounded-sm px-0.5 transition-colors duration-150 group-hover:bg-gold group-hover:text-ink group-focus:bg-gold group-focus:text-ink ${
          active ? "bg-seal text-paper" : ""
        }`}
      >
        {token.surface}
      </span>

      {open &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            className="pop-in pointer-events-none fixed z-50 w-max max-w-[13rem]"
            style={{
              left: coords.left,
              top: coords.top,
              transform: `translate(-50%, ${coords.flip ? "0" : "-100%"})`,
            }}
          >
            <span className="relative block rounded-lg border border-gold/40 bg-paper px-3 py-2 text-left shadow-tag">
              {/* punch hole, nafuda tag style */}
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-gold/50 bg-ink" />
              <span className="block font-mono text-[0.7rem] uppercase tracking-wide text-seal">{token.romaji}</span>
              <span className="mt-0.5 block font-body text-sm leading-snug text-ink">{token.meaning}</span>
              {token.pos && (
                <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-wider text-ink/50">
                  {token.pos}
                </span>
              )}
              {/* little tail/string, pointing toward whichever side the word is on */}
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
