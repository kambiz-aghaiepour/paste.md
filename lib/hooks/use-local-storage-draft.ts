"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "paste-md-draft";

export function useLocalStorageDraft() {
  const [restoredDraft, setRestoredDraft] = useState<string | null>(null);
  const [wasRestored, setWasRestored] = useState(false);

  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRestoredDraft(saved);
        setWasRestored(true);
      }
    } catch {
      // localStorage unavailable (SSR, private browsing)
    }
  }, []);

  // Save (called with debounced value)
  const saveDraft = useCallback((content: string) => {
    try {
      if (content) {
        localStorage.setItem(STORAGE_KEY, content);
      }
    } catch {
      // QuotaExceededError -- silently ignore
    }
  }, []);

  // Clear after successful creation
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently ignore
    }
  }, []);

  const dismissRestored = useCallback(() => {
    setWasRestored(false);
  }, []);

  return { restoredDraft, wasRestored, saveDraft, clearDraft, dismissRestored };
}
