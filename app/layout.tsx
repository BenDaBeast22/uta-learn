import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uta Learn — Learn Japanese through song",
  description:
    "Learn Japanese through songs. Follow synced lyrics as you listen, and hover any word for its romaji and meaning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
