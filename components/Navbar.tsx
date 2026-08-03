"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/UserMenu";

interface NavbarProps {
  userEmail: string | null;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Curated Tracks", href: "/" },
    { name: "My Tracks", href: "/my-tracks" },
    { name: "My Vocab", href: "/my-vocab" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-paper/10 bg-black/40 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        {/* Brand Logo - Compact on Mobile, Full on Desktop */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-mono text-xs uppercase text-gold transition hover:opacity-80 sm:gap-2"
        >
          <span className="font-bold tracking-[0.2em] sm:font-normal sm:tracking-[0.3em]">歌学</span>
          <span className="hidden text-gold sm:inline">—</span>
          <span className="hidden tracking-wide sm:inline">Uta Learn</span>
        </Link>

        {/* Navigation Links & Profile */}
        {userEmail ? (
          <>
            {/* Centered on mobile | Right-aligned on desktop */}
            <div className="absolute left-1/2 -translate-x-1/2 sm:static sm:ml-auto sm:mr-6 sm:translate-x-0">
              <div className="flex items-center gap-3 font-mono text-[11px] sm:gap-6 sm:text-xs">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`whitespace-nowrap transition hover:text-gold ${
                        isActive
                          ? "font-semibold text-gold underline decoration-gold/50 underline-offset-4"
                          : "text-paper/70"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Profile Dropdown pinned far right */}
            <div className="shrink-0">
              <UserMenu email={userEmail} />
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-paper/20 px-3.5 py-1 font-mono text-xs text-paper transition hover:border-gold hover:text-gold sm:px-5 sm:py-2"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
