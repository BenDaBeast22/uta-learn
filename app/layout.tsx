import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import "./globals.css";

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
      <body className=" min-h-screen bg-ink text-paper antialiased">
        <Navbar userEmail={user?.email ?? null} />
        {children}
      </body>
    </html>
  );
}
