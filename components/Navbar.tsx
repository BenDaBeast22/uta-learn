"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/UserMenu";

interface NavbarProps {
  userEmail: string | null;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();

  // Navigation items for logged-in users
  const navLinks = [
    { name: "Curated Tracks", href: "/" },
    { name: "My Tracks", href: "/my-tracks" },
    { name: "My Vocab", href: "/my-vocab" },
  ];

  return (
    <nav className="border-b border-paper/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Brand Logo */}
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.3em] text-gold hover:opacity-80 transition">
          歌 — Uta Learn
        </Link>

        {/* Authenticated Navigation Links */}
        {userEmail ? (
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition hover:text-gold ${
                      isActive
                        ? "text-gold font-semibold underline underline-offset-4 decoration-gold/50"
                        : "text-paper/70"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Profile Dropdown */}
            <UserMenu email={userEmail} />
          </div>
        ) : (
          /* Unauthenticated State */
          <Link
            href="/login"
            className="rounded-full border border-paper/20 px-5 py-2 font-mono text-xs text-paper transition hover:border-gold hover:text-gold"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
