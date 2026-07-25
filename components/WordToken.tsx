"use client";

import { useState } from "react";
import { WordToken as WordTokenData } from "@/lib/types";

export default function WordToken({
  token,
  active = false,
}: {
  token: WordTokenData;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (token.skip) {
    return <span>{token.surface}</span>;
  }

  return (
    <span
      className="group relative inline-block cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <span
        className={`rounded-sm px-0.5 transition-colors duration-150 group-hover:bg-gold/25 group-focus:bg-gold/25 ${
          active ? "bg-seal/30 text-paper" : ""
        }`}
      >
        {token.surface}
      </span>

      {open && (
        <span
          role="tooltip"
          className="pop-in pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-max max-w-[13rem] -translate-x-1/2"
        >
          <span className="relative block rounded-lg border border-gold/40 bg-paper px-3 py-2 text-left shadow-tag">
            {/* punch hole, nafuda tag style */}
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-gold/50 bg-ink" />
            <span className="block font-mono text-[0.7rem] uppercase tracking-wide text-seal">
              {token.romaji}
            </span>
            <span className="mt-0.5 block font-body text-sm leading-snug text-ink">
              {token.meaning}
            </span>
            {token.pos && (
              <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-wider text-ink/50">
                {token.pos}
              </span>
            )}
            {/* little tail/string */}
            <span className="absolute left-1/2 top-full h-2 w-px -translate-x-1/2 bg-gold/50" />
          </span>
        </span>
      )}
    </span>
  );
}
