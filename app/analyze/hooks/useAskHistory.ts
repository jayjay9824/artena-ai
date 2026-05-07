"use client";
import { useCallback, useEffect, useState } from "react";
import type { ChatMessage } from "../../types/assistant";

/**
 * BLOCK C — per-artwork Ask history persistence.
 *
 * localStorage-backed, no server. Each artwork_id maps to a capped
 * list of past Q/A messages. Loaded once on mount; new exchanges
 * write through to storage but DO NOT mutate the in-memory `past`
 * (so the current session's screen stays clean — past is the
 * frozen "before this session" view, current is what the user is
 * generating now).
 *
 *   past      messages from prior sessions for this artwork
 *   append()  persist (storage only) — visible on next mount
 */

const STORAGE_KEY      = "artena_ask_history_v1";
const MAX_PER_ARTWORK  = 40;

type HistoryStore = Record<string, ChatMessage[]>;

function readStore(): HistoryStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as HistoryStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: HistoryStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode — silently no-op */
  }
}

/**
 * BLOCK D — synchronous predicate used by Collection / tracking
 * callsites to detect a revisit (artwork has prior Ask exchanges).
 * Reads localStorage directly; safe to call outside React.
 */
export function hasAskHistory(artworkId: string): boolean {
  if (!artworkId) return false;
  const store = readStore();
  return Array.isArray(store[artworkId]) && store[artworkId].length > 0;
}

export function useAskHistory(artworkId: string): {
  past:   ChatMessage[];
  append: (messages: ChatMessage[]) => void;
} {
  const [past, setPast] = useState<ChatMessage[]>([]);

  // Frozen for the session — read once per artwork_id change.
  useEffect(() => {
    if (!artworkId) {
      setPast([]);
      return;
    }
    const store = readStore();
    setPast(store[artworkId] ?? []);
  }, [artworkId]);

  const append = useCallback((messages: ChatMessage[]) => {
    if (!artworkId || messages.length === 0) return;
    const store = readStore();
    const list  = store[artworkId] ?? [];
    const next  = [...list, ...messages].slice(-MAX_PER_ARTWORK);
    store[artworkId] = next;
    writeStore(store);
    // Intentionally NOT touching `past` — keeps current session's
    // surface uncluttered. Next mount will pick up the new entries.
  }, [artworkId]);

  return { past, append };
}
