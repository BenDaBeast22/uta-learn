import Link from "next/link";
import { Track } from "@/lib/types";

export default function TrackCard({ track, index }: { track: Track; index: number }) {
  return (
    <Link
      href={`/track/${track.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-line bg-ink-soft p-6 shadow-card transition-transform duration-200 hover:-translate-y-1"
    >
      <span
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-200 group-hover:opacity-35"
        style={{ backgroundColor: track.accent }}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-paper/40">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className="rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider"
            style={{ borderColor: `${track.accent}66`, color: track.accent }}
          >
            {track.level}
          </span>
        </div>

        <h2 className="font-display text-2xl leading-snug text-paper">{track.title}</h2>
        <p className="mt-1 font-mono text-sm text-paper/50">{track.titleRomaji}</p>
        <p className="mt-4 text-sm leading-relaxed text-paper/70">{track.summary}</p>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-ink-line pt-4 text-xs text-paper/40">
        <span>{track.artist}</span>
        <span className="font-mono">{track.duration}</span>
      </div>
    </Link>
  );
}
