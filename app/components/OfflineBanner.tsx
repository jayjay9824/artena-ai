"use client";
import React, { useEffect } from "react";
import { useOfflineQueue } from "../analyze/hooks/useOfflineQueue";
import { useLanguage } from "../i18n/useLanguage";
import type { PendingScan } from "../services/offlineQueue";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

/**
 * STEP 3 — Default sync transport.
 *
 * Re-issues a queued scan against /api/analyze. Returns true so the
 * queue dequeues the entry; transport / 5xx failures return false so
 * the scan stays queued for the next online cycle. Spec rule: "If
 * network fails: save scan data locally."
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
    // Empty record (shouldn't happen) — drop it.
    return true;
  } catch {
    return false;
  }
}

/**
 * STEP 3 — Persistent offline indicator.
 *
 * Renders a minimal pill ("Saved locally. Will analyze when online.")
 * whenever the device is offline. Auto-drains the IndexedDB queue
 * via /api/analyze the moment connectivity returns; no banner shown
 * during the silent sync.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount, syncNow } = useOfflineQueue();
  const { t } = useLanguage();

  // Drain the queue whenever online with pending scans. Effect re-runs
  // on every transition (offline→online, or new enqueue while online),
  // so a single transient offline cycle settles cleanly.
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      void syncNow(defaultSender);
    }
  }, [isOnline, pendingCount, syncNow]);

  // Only show the "Saved locally" pill when there is actually
  // something queued to sync — being offline alone isn't enough.
  // Avoids false positives from flaky navigator.onLine readings on
  // first paint, and matches the spec semantics ("saved locally"
  // implies something was in fact saved).
  if (isOnline) return null;
  if (pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:        "fixed",
        bottom:          92,
        left:            "50%",
        transform:       "translateX(-50%)",
        zIndex:          150,
        background:      "rgba(15,15,15,0.92)",
        color:           "#FFFFFF",
        padding:         "10px 18px",
        borderRadius:    999,
        fontSize:        11.5,
        letterSpacing:   "0.02em",
        backdropFilter:  "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow:       "0 4px 22px rgba(0,0,0,0.22)",
        fontFamily:      FONT,
        display:         "flex",
        alignItems:      "center",
        gap:             10,
        maxWidth:        "calc(100vw - 36px)",
        animation:       "ob-slide-up .3s ease",
      }}
    >
      <style>{`
        @keyframes ob-slide-up {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes ob-pulse {
          0%, 100% { opacity: .55 } 50% { opacity: 1 }
        }
      `}</style>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "#E04848",
        flexShrink: 0,
        animation: "ob-pulse 1.6s ease infinite",
      }} />
      <span>{t("offline.saved_locally")}</span>
      {pendingCount > 0 && (
        <span style={{
          fontSize: 9.5,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.08em",
        }}>
          · {pendingCount}
        </span>
      )}
    </div>
  );
}
