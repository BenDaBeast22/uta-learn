"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Track } from "@/lib/types";

interface TrackCardProps {
  track: Track;
  index: number;
  onDelete?: (id: string, title: string) => void;
}

export default function TrackCard({ track, index, onDelete }: TrackCardProps) {
  // 1. Set preferred high-res URL as initial state
  const highResUrl = `https://i.ytimg.com/vi/${track.youtubeId}/hq720.jpg`;
  const fallbackUrl = `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg`;

  const [imgSrc, setImgSrc] = useState(highResUrl);
  const [isFallback, setIsFallback] = useState(false);

  // Custom tracks live under /my-tracks/[id], curated tracks under /track/[id]
  const destinationHref = track.isCustom ? `/my-tracks/${track.id}` : `/track/${track.id}`;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevents navigating via <Link> when clicking delete
    e.stopPropagation();
    onDelete?.(track.id, track.title);
  };

  return (
    <Link
      href={destinationHref}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-line bg-ink-soft p-6 shadow-card transition-transform duration-200 hover:-translate-y-1"
    >
      <span
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-35"
        style={{ backgroundColor: track.accent }}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-paper/40">{String(index + 1).padStart(2, "0")}</span>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider"
              style={{ borderColor: `${track.accent}66`, color: track.accent }}
            >
              {track.level}
            </span>
          </div>
        </div>

        {/* Thumbnail Wrapper */}
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-ink-line">
          <Image
            src={imgSrc}
            alt={`${track.title} thumbnail`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            // Switch to fallback URL if 404
            onError={() => {
              if (!isFallback) {
                setImgSrc(fallbackUrl);
                setIsFallback(true);
              }
            }}
            // Apply scale crop only if dropped back to the letterboxed hqdefault
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              isFallback ? "scale-[1.35] group-hover:scale-[1.42]" : ""
            }`}
          />
        </div>

        <h2 className="font-display text-2xl leading-snug text-paper">{track.title}</h2>
        <p className="mt-1 font-mono text-sm text-paper/50">{track.titleRomaji}</p>
        <p className="mt-4 text-sm leading-relaxed text-paper/70">{track.summary}</p>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-ink-line pt-4 text-xs text-paper/40">
        <span>{track.artist}</span>

        <div className="flex items-center gap-3">
          <span className="font-mono">{track.duration}</span>

          {/* Delete Button - Renders ONLY for custom tracks */}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Delete track"
              className="rounded-lg p-1 text-paper/40 transition-all duration-150 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
