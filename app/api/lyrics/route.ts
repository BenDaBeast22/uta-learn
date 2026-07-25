import { NextResponse } from "next/server";

// App router path: app/api/lyrics/route.ts
//
// Proxies LRCLIB's search endpoint so the client never has to call a
// third-party API directly. LRCLIB is a free, community-maintained lyrics
// database (https://lrclib.net) — see their site for usage terms. This
// route only fetches; it doesn't store anything.

const LRCLIB_SEARCH_URL = "https://lrclib.net/api/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackName = searchParams.get("track");
  const artistName = searchParams.get("artist");

  if (!trackName || !artistName) {
    return NextResponse.json(
      { error: "Both `track` and `artist` query params are required." },
      { status: 400 }
    );
  }

  const url = new URL(LRCLIB_SEARCH_URL);
  url.searchParams.set("track_name", trackName);
  url.searchParams.set("artist_name", artistName);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        // LRCLIB asks API consumers to identify their app.
        "User-Agent": "UtaLearn/0.1.0 (personal Japanese-learning project)",
      },
      // Search results change rarely; avoid hammering LRCLIB on every request.
      next: { revalidate: 60 * 60 },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach LRCLIB." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `LRCLIB returned ${res.status} ${res.statusText}` },
      { status: 502 }
    );
  }

  const results = await res.json();

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "No matches found on LRCLIB for that track/artist." },
      { status: 404 }
    );
  }

  // Prefer a result that actually has line-synced lyrics; fall back to the
  // first match (which may only have plain lyrics, or none at all).
  const match = results.find((item: any) => item.syncedLyrics) ?? results[0];

  return NextResponse.json({
    trackName: match.trackName,
    artistName: match.artistName,
    albumName: match.albumName,
    duration: match.duration,
    instrumental: Boolean(match.instrumental),
    syncedLyrics: match.syncedLyrics ?? null,
    plainLyrics: match.plainLyrics ?? null,
  });
}
