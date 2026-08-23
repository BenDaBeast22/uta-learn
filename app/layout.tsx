import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import "./globals.css";
import { VocabProvider } from "@/hooks/useVocabStore";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Uta Learn — Learn Japanese through song",
  description:
    "Learn Japanese through songs. Follow synced lyrics as you listen, and hover any word for its romaji and meaning.",
  other: {
    google: "notranslate",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      {/*Title: Keep under 60 characters with your core hook */}
      <title>UTA Learn | Learn Japanese with Synchronized Song Lyrics</title>

      {/* Description: Keep under 160 characters, highly actionable --> */}
      <meta
        name="description"
        content="Master Japanese vocabulary using your favorite YouTube music. Get real-time synchronized lyrics, instant Jisho translations, Furigana toggle, and export to Anki."
      />

      {/*Open Graph tags for rich previews when shared on X/Twitter, Reddit, Discord */}
      <meta property="og:title" content="UTA Learn - Learn Japanese via YouTube Music & Synced Lyrics" />
      <meta
        property="og:description"
        content="Import any track to instantly generate synced lyrics, tap tokens for Jisho translations, and sync directly to Anki decks."
      />
      <meta property="og:image" content="https://uta-learn.vercel.app/uta-learn-screenshot.png" />

      <meta property="og:type" content="website" />

      <body className=" min-h-screen bg-ink text-paper antialiased">
        <Navbar userEmail={user?.email ?? null} />
        <VocabProvider>{children}</VocabProvider>
        <Analytics />
      </body>
    </html>
  );
}
