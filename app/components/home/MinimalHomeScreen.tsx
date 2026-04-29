"use client";
import React, { useEffect } from "react";
import { ScanOrb } from "./ScanOrb";
import { HomeDock } from "./HomeDock";
import { OceanBackground } from "./OceanBackground";

const FONT      = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans',   -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

/* Text constants — kept here so an i18n pass can lift them without
   chasing magic strings. */
const TEXT = {
  brand:      "AXVELA",
  subtitle:   "AI ART ANALYSIS",
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

      {/* ── 1. Top brand ─────────────────────────────────────────── */}
      <a
        href="/"
        style={{
          display:        "inline-block",
          textDecoration: "none",
          textAlign:      "center" as const,
          marginTop:      "calc(72px + env(safe-area-inset-top, 0px))",
          position:       "relative" as const,
          zIndex:         1,
        }}
      >
        <p style={{
          margin:        "0 0 9px",
          fontSize:      22,
          fontWeight:    700,
          letterSpacing: "0.30em",
          color:         "#111111",
          fontFamily:    FONT_HEAD,
          // Optical centering for wide letter-spacing
          paddingLeft:   "0.30em",
        }}>
          {TEXT.brand}
        </p>
        <p style={{
          margin:        0,
          fontSize:      9.5,
          letterSpacing: "0.32em",
          color:         "#777777",
          fontFamily:    FONT,
          paddingLeft:   "0.32em",
        }}>
          {TEXT.subtitle}
        </p>
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
