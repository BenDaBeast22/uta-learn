"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({ email }: { email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Refresh page to update server component state
  };

  const initial = email ? email[0].toUpperCase() : "U";

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold border border-gold/40 font-mono text-xs font-semibold hover:bg-gold/30 transition"
        title={email}
      >
        {initial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to click outside */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-paper/10 bg-black/90 p-2 shadow-lg backdrop-blur-md">
            <div className="px-3 py-2 border-b border-paper/10 text-xs">
              <p className="text-paper/40 font-mono text-[10px]">Signed in as</p>
              <p className="text-paper truncate font-mono text-xs">{email}</p>
            </div>

            <button
              onClick={handleSignOut}
              className="mt-1 w-full text-left rounded px-3 py-1.5 font-mono text-xs text-red-400 hover:bg-paper/5 transition"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
