"use client";
import React, { useEffect } from "react";
import { ScanOrb } from "./ScanOrb";
import { HomeDock } from "./HomeDock";
import { OceanBackground } from "./OceanBackground";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

/* Text constants — kept here so an i18n pass can lift them without
   chasing magic strings. The wordmark + tagline have moved to the
   logo asset (axvela-mark.png) so the home reads as a single mark
   over the ocean rather than competing layers of text. */
const TEXT = {
  scanLabel:  "SCAN",
  collection: "Collection",
  profile:    "Profile",
} as const;

interface Props {
  onOpenScanner:  () => void;
  onCollection:   () => void;
  onProfile:      () => void;
  /** Invisible power-user feature: clipboard paste of an image still
   *  routes through the analyze pipeline. Surface stays unchanged. */
  onFileSelected?: (file: File) => void;
}

/**
 * AXVELA AI — full home replacement.
 *
 * Four blocks only:
 *   1. Top brand    "AXVELA" + "AI ART ANALYSIS"
 *   2. Scan orb     centered black 240px CTA inside 380px dotted ring
 *   3. Home dock    Collection · Camera (FAB) · Profile
 *   4. Camera FAB   mirrors the Scan orb route
 *
 * Replaces the legacy card-based Home + 5-tab BottomNav. Existing
 * features (upload / text search / QR) move to the Scanner surface;
 * underlying routes (/collection, /my, /report, /taste, etc) remain
 * reachable.
 */
export function MinimalHomeScreen({
  onOpenScanner,
  onCollection,
  onProfile,
  onFileSelected,
}: Props) {
  /* Invisible clipboard-paste path. Power users still get instant
     analyze when pasting a screenshot anywhere on the home surface. */
  useEffect(() => {
    if (!onFileSelected) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { onFileSelected(file); return; }
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [onFileSelected]);

  return (
    <div style={{
      width:        "100%",
      maxWidth:     430,
      margin:       "0 auto",
      minHeight:    "100dvh",
      background:   "#0E3E5F",
      position:     "relative",
      overflow:     "hidden",
      fontFamily:   FONT,
      display:      "flex",
      flexDirection: "column",
      alignItems:   "center",
      paddingBottom: "calc(140px + env(safe-area-inset-bottom, 0px))",
    }}>
      {/* ── 0. Aerial ocean background (z-index 0) ──────────────── */}
      <OceanBackground />

      {/* ── 1. Top brand mark (logo, no wordmark text) ──────────── */}
      <a
        href="/"
        aria-label="AXVELA AI"
        style={{
          display:        "block",
          textDecoration: "none",
          marginTop:      "calc(56px + env(safe-area-inset-top, 0px))",
          position:       "relative" as const,
          zIndex:         1,
          lineHeight:     0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/axvela-mark.png"
          alt="AXVELA AI"
          width={140}
          height={140}
          style={{
            display:   "block",
            width:     140,
            height:    140,
            objectFit: "contain",
            // Soft drop shadow so the dark X reads cleanly even when
            // the ocean band underneath turns very dark.
            filter:    "drop-shadow(0 2px 12px rgba(0,0,0,0.18))",
          }}
        />
      </a>

      {/* ── 2. Center scan orb ────────────────────────────────────── */}
      <div style={{
        flex:           1,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        width:          "100%",
        // Pulls the orb visually below the geometric center of the
        // viewport — spec: "원은 화면 중앙보다 약간 아래에 위치".
        marginTop:      24,
        position:       "relative" as const,
        zIndex:         1,
      }}>
        <ScanOrb onClick={onOpenScanner} label={TEXT.scanLabel} />
      </div>

      {/* ── 3 & 4. Bottom dock with Camera FAB ───────────────────── */}
      <HomeDock
        onCollection={onCollection}
        onCamera={onOpenScanner}
        onProfile={onProfile}
        collectionLabel={TEXT.collection}
        profileLabel={TEXT.profile}
      />
    </div>
  );
}
