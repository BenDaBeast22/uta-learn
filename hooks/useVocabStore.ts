"use client";

import { useState, useEffect } from "react";
import { WordToken, SavedVocabItem } from "@/lib/types";

const STORAGE_KEY = "japanese_app_vocab_v1";

export function useVocabStore() {
  const [vocab, setVocab] = useState<SavedVocabItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial vocab from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVocab(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load vocabulary from storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage whenever vocab changes
  const saveToStorage = (items: SavedVocabItem[]) => {
    setVocab(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save vocabulary to storage", e);
    }
  };

  const addVocab = (token: WordToken, songTitle?: string, contextSentence?: string) => {
    const id = `${token.surface}_${token.romaji || ""}`;

    // Prevent duplicates
    if (vocab.some((item) => item.id === id)) return;

    const newItem: SavedVocabItem = {
      id,
      token,
      songTitle,
      contextSentence,
      savedAt: Date.now(),
    };

    saveToStorage([newItem, ...vocab]);
  };

  const removeVocab = (id: string) => {
    saveToStorage(vocab.filter((item) => item.id !== id));
  };

  const isSaved = (token: WordToken) => {
    const id = `${token.surface}_${token.romaji || ""}`;
    return vocab.some((item) => item.id === id);
  };

  return {
    vocab,
    isLoaded,
    addVocab,
    removeVocab,
    isSaved,
  };
}
