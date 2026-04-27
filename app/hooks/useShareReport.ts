"use client";
import { useCallback, useState } from "react";
import { buildShareUrl } from "../services/reportService";
import { recordInteraction } from "../services/interactionService";

/**
 * useShareReport — share a saved report via the Web Share API,
 * with a clipboard fallback. The hook keeps the UI logic out of
 * components: pass it a reportId and call share().
 *
 * Returns:
 *   share(opts?)  — opens the platform share sheet or copies the URL
 *   copy()        — clipboard-only path
 *   url           — the canonical share URL (or null if no reportId)
 *   lastResult    — "shared" | "copied" | "no-id" | "error" | null
 */

export interface UseShareReportOptions {
  reportId: string | null | undefined;
  /** Optional fields used by the Web Share sheet's preview. */
  artist?: string;
  title?:  string;
  /** Fired on every successful share/copy — used for analytics. */
  onShared?: (channel: "native" | "clipboard") => void;
}

export type ShareResult = "shared" | "copied" | "no-id" | "error" | null;

export function useShareReport(opts: UseShareReportOptions) {
  const { reportId, artist, title, onShared } = opts;
  const [lastResult, setLastResult] = useState<ShareResult>(null);

  const url = reportId ? buildShareUrl(reportId) : null;

  const share = useCallback(async (override?: { artist?: string; title?: string }): Promise<ShareResult> => {
    if (!reportId || !url) {
      setLastResult("no-id");
      return "no-id";
    }
    const shareTitle = override?.artist ?? artist ?? "ARTENA";
    const shareText  = override?.title  ?? title  ?? "Cultural Intelligence Report";

    // Record the interaction first so we don't lose the signal if the
    // user dismisses the native share sheet without picking a channel.
    recordInteraction({
      interactionType: "shared",
      reportId,
      meta: { surface: "report" },
    });

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        setLastResult("shared");
        onShared?.("native");
        return "shared";
      } catch {
        /* user dismissed or share unavailable — fall through to copy */
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setLastResult("copied");
        onShared?.("clipboard");
        return "copied";
      } catch {
        setLastResult("error");
        return "error";
      }
    }

    setLastResult("error");
    return "error";
  }, [reportId, url, artist, title, onShared]);

  const copy = useCallback(async (): Promise<ShareResult> => {
    if (!reportId || !url) { setLastResult("no-id"); return "no-id"; }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setLastResult("copied");
        onShared?.("clipboard");
        return "copied";
      } catch {
        setLastResult("error");
        return "error";
      }
    }
    setLastResult("error");
    return "error";
  }, [reportId, url, onShared]);

  return { share, copy, url, lastResult };
}
