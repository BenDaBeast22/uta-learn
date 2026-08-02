// hooks/useVocabStore.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WordToken {
  surface: string;
  romaji?: string;
  meaning?: string;
  pos?: string;
}

export interface SavedVocabItem {
  id: string;
  token: WordToken;
  contextSentence?: string;
  songTitle?: string;
  songId?: string;
}

interface VocabContextType {
  vocab: SavedVocabItem[];
  isLoaded: boolean;
  addVocab: (item: Omit<SavedVocabItem, "id">) => Promise<void>;
  removeVocab: (idOrSurface: string) => Promise<void>;
}

const VocabContext = createContext<VocabContextType | undefined>(undefined);

export function VocabProvider({ children }: { children: React.ReactNode }) {
  const [vocab, setVocab] = useState<SavedVocabItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const supabase = createClient();

  // 1. Load initial user vocab
  useEffect(() => {
    async function loadVocab() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from("user_vocab")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const formatted: SavedVocabItem[] = data.map((row) => ({
          id: row.id,
          token: {
            surface: row.surface,
            romaji: row.romaji,
            meaning: row.meaning,
            pos: row.pos,
          },
          contextSentence: row.context_sentence,
          songTitle: row.song_title,
          songId: row.song_id,
        }));
        setVocab(formatted);
      }
      setIsLoaded(true);
    }

    loadVocab();
  }, []);

  // 2. Optimistic Add (Updates UI in 0ms)
  const addVocab = useCallback(async (item: Omit<SavedVocabItem, "id">) => {
    const tempId = `temp-${Date.now()}`;
    const tempItem: SavedVocabItem = { id: tempId, ...item };

    // ⚡ Immediately update UI state
    setVocab((prev) => {
      if (prev.some((v) => v.token.surface === item.token.surface)) return prev;
      return [tempItem, ...prev];
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("User not authenticated. Reverting vocab save.");
      setVocab((prev) => prev.filter((v) => v.id !== tempId));
      return;
    }

    const { data, error } = await supabase
      .from("user_vocab")
      .insert({
        user_id: user.id,
        surface: item.token.surface,
        romaji: item.token.romaji,
        meaning: item.token.meaning,
        pos: item.token.pos,
        context_sentence: item.contextSentence,
        song_title: item.songTitle,
        song_id: item.songId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to persist vocab in Supabase:", error);
      setVocab((prev) => prev.filter((v) => v.id !== tempId));
    } else if (data) {
      setVocab((prev) =>
        prev.map((v) => (v.id === tempId ? { ...v, id: data.id } : v))
      );
    }
  }, [supabase]);

  // 3. Optimistic Delete
  const removeVocab = useCallback(async (idOrSurface: string) => {
    let targetId = idOrSurface;

    setVocab((prev) => {
      const found = prev.find((v) => v.id === idOrSurface || v.token.surface === idOrSurface);
      if (found) targetId = found.id;
      return prev.filter((v) => v.id !== idOrSurface && v.token.surface !== idOrSurface);
    });

    if (targetId.startsWith("temp-")) return;

    const { error } = await supabase.from("user_vocab").delete().eq("id", targetId);
    if (error) {
      console.error("Failed to delete vocab from Supabase:", error);
    }
  }, [supabase]);

  return (
    <VocabContext.Provider value={{ vocab, isLoaded, addVocab, removeVocab }}>
      {children}
    </VocabContext.Provider>
  );
}

export function useVocabStore() {
  const context = useContext(VocabContext);
  if (!context) {
    throw new Error("useVocabStore must be used within a VocabProvider");
  }
  return context;
}