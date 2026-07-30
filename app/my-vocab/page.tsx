"use client";

import { useState } from "react";
import Link from "next/link";
import { useVocabStore } from "@/hooks/useVocabStore";

export default function MyVocabPage() {
  const { vocab, isLoaded, removeVocab } = useVocabStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVocab = vocab.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.token.surface.toLowerCase().includes(query) ||
      (item.token.romaji && item.token.romaji.toLowerCase().includes(query)) ||
      (item.token.meaning && item.token.meaning.toLowerCase().includes(query))
    );
  });

  const handleExportAnki = () => {
    if (vocab.length === 0) return;

    const escapeCsv = (str?: string) => {
      if (!str) return "";
      return str.replace(/"/g, '""');
    };

    const rows = vocab.map((item) => {
      // Column 1 (Front): Japanese Word
      const front = `"${escapeCsv(item.token.surface)}"`;

      // Column 2 (Back): Styled HTML structure for clean rendering
      let backHtmlParts: string[] = [];

      // Romaji / Reading
      if (item.token.romaji) {
        backHtmlParts.push(
          `<div style="font-size: 1.2em; color: #d97706; font-weight: 600; font-family: monospace;">${item.token.romaji}</div>`,
        );
      }

      // Meaning / Definition
      if (item.token.meaning) {
        backHtmlParts.push(
          `<div style="margin-top: 6px; font-size: 1.1em; line-height: 1.4;">${item.token.meaning}</div>`,
        );
      }

      // Part of Speech Tag
      if (item.token.pos) {
        backHtmlParts.push(
          `<div style="margin-top: 6px; display: inline-block; padding: 2px 6px; font-size: 0.7em; text-transform: uppercase; border: 1px solid #ccc; border-radius: 4px; opacity: 0.6;">${item.token.pos}</div>`,
        );
      }

      // Context Sentence
      if (item.contextSentence) {
        backHtmlParts.push(`<hr style="margin: 12px 0 8px 0; border: none; border-top: 1px solid #eee;" />`);
        backHtmlParts.push(
          `<div style="font-style: italic; font-size: 0.9em; opacity: 0.8; line-height: 1.4;">"${item.contextSentence}"</div>`,
        );
      }

      // Song Source
      if (item.songTitle) {
        backHtmlParts.push(
          `<div style="margin-top: 4px; font-size: 0.75em; opacity: 0.5;">🎵 From: ${item.songTitle}</div>`,
        );
      }

      const back = `"${escapeCsv(backHtmlParts.join(""))}"`;

      return `${front},${back}`;
    });

    // 1. Directives to auto-detect commas & enable HTML in Anki
    // 2. UTF-8 BOM (\uFEFF) for correct character encoding
    const headerDirectives = "#separator:Comma\n#html:true\n";
    const csvContent = "\uFEFF" + headerDirectives + rows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "lingotrack-anki-vocab.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <header className="seam mb-12 pl-5">
        <div className="flex items-center gap-2">
          <span className="rounded border border-gold/20 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase text-gold">
            Study Deck
          </span>
        </div>

        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-4xl leading-tight text-paper sm:text-5xl">My Vocabulary</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper/60 sm:text-base">
              {vocab.length} {vocab.length === 1 ? "word" : "words"} collected from your saved song lyrics.
            </p>
          </div>

          {/* Action Controls */}
          {vocab.length > 0 && (
            <button
              type="button"
              onClick={handleExportAnki}
              className="inline-flex items-center justify-center rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 font-mono text-xs font-semibold text-gold transition hover:border-gold hover:bg-gold hover:text-ink"
            >
              Export to Anki (.csv)
            </button>
          )}
        </div>
      </header>

      {/* Filter / Search Bar */}
      {vocab.length > 0 && (
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search saved words, readings, or meanings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-paper/10 bg-paper/5 px-4 py-3 font-body text-sm text-paper placeholder-paper/40 outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/50"
          />
        </div>
      )}

      {/* Empty State */}
      {vocab.length === 0 && (
        <div className="rounded-xl border border-dashed border-paper/10 bg-paper/5 p-12 text-center">
          <p className="font-display text-xl text-paper">Your vocabulary deck is empty</p>
          <p className="mt-2 text-sm text-paper/60">
            Hover over Japanese words while listening to tracks and click "+ Add to Vocab".
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/10 px-4 py-2 font-mono text-xs text-gold transition hover:border-gold hover:bg-gold hover:text-ink"
            >
              Browse Tracks →
            </Link>
          </div>
        </div>
      )}

      {/* Vocab List Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVocab.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between rounded-lg border border-paper/10 bg-paper/5 p-5 shadow-tag transition hover:border-gold/40"
          >
            <div>
              {/* Header: Surface + Romaji */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl font-bold text-paper">{item.token.surface}</span>
                {item.token.romaji && (
                  <span className="font-mono text-xs uppercase tracking-wider text-gold">{item.token.romaji}</span>
                )}
              </div>

              {/* Translation */}
              <p className="mt-2 font-body text-sm text-paper/90 leading-snug">{item.token.meaning}</p>

              {/* POS Tag */}
              {item.token.pos && (
                <span className="mt-3 inline-block rounded border border-paper/10 bg-paper/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper/50">
                  {item.token.pos}
                </span>
              )}

              {/* Lyric Context Sentence */}
              {item.contextSentence && (
                <div className="mt-4 border-t border-paper/10 pt-3 font-body text-xs italic text-paper/60">
                  "{item.contextSentence}"
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-paper/10 pt-3 font-mono text-[10px] text-paper/40">
              <span className="truncate max-w-[140px]">
                {item.songTitle ? `From: ${item.songTitle}` : "Saved word"}
              </span>
              <button
                type="button"
                onClick={() => removeVocab(item.id)}
                className="text-paper/40 transition hover:text-gold hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
