/**
 * PART 5 — stable per-browser user_id.
 *
 * Persists in localStorage so subsequent sessions on the same device
 * still resolve to the same user. SSR / private mode falls back to
 * an ephemeral id so events never crash, even if they can't be
 * de-duped across reloads.
 */

import { nanoid } from "nanoid";

const KEY = "artena_user_id";

let cached: string | null = null;

export function getOrCreateUserId(): string {
  if (cached) return cached;
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh = nanoid(16);
    window.localStorage.setItem(KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // Storage blocked (private mode, etc) — use an ephemeral id.
    cached = "ephemeral_" + nanoid(8);
    return cached;
  }
}
