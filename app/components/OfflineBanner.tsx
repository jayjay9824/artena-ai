"use client";
import React, { useEffect, useRef } from "react";
import { useOfflineQueue } from "../analyze/hooks/useOfflineQueue";
import { clearPendingScans, type PendingScan } from "../services/offlineQueue";

const CLEANUP_FLAG_KEY = "artena_offline_cleanup_v2";

/**
 * Default sync transport — re-issues a queued scan against /api/analyze.
 * Returns true to dequeue, false to keep the scan in the queue for
 * the next online cycle.
 */
async function defaultSender(scan: PendingScan): Promise<boolean> {
  try {
    if (scan.imageBlob) {
      const fd = new FormData();
      fd.append("image", scan.imageBlob, "scan.jpg");
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      return res.ok;
    }
    if (scan.extractedText) {
      const res = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: scan.extractedText }),
      });
      return res.ok;
    }
    return true; // empty record — drop it
  } catch {
    return false;
  }
}

/**
 * Headless offline orchestrator.
 *
 * Earlier builds queued legitimate online scans by mistake (the
 * `if (!navigator.onLine)` pre-check used a flaky API). Those stale
 * entries persist in IndexedDB across deploys and were causing the
 * "Saved locally" pill to render on Home for users who never went
 * offline.
 *
 * This component:
 *   1. Runs a one-time queue clear (gated by a localStorage version
 *      flag) so each browser drops pre-fix residue exactly once.
 *   2. Drains any future legitimate offline queue when connectivity
 *      returns — silent, no UI.
 *   3. Renders nothing — the offline state surfaces inline within
 *      specific surfaces (e.g., the scanner) rather than as a global
 *      banner.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount, syncNow } = useOfflineQueue();
  const cleanupRanRef = useRef(false);

  // One-time cleanup of pre-fix residue. Gated by a localStorage
  // version flag so it runs at most once per browser per version.
  useEffect(() => {
    if (cleanupRanRef.current) return;
    cleanupRanRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const done = window.localStorage.getItem(CLEANUP_FLAG_KEY);
      if (done === "1") return;
      window.localStorage.setItem(CLEANUP_FLAG_KEY, "1");
      void clearPendingScans();
    } catch {
      /* localStorage blocked — skip; queue will drain via auto-sync */
    }
  }, []);

  // Drain the queue whenever online with pending scans. Effect re-runs
  // on every transition so a single transient offline cycle settles.
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      void syncNow(defaultSender);
    }
  }, [isOnline, pendingCount, syncNow]);

  return null;
}
