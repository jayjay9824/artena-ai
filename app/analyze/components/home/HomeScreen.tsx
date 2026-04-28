"use client";
import React, { useEffect } from "react";
import { useLanguage } from "../../../i18n/useLanguage";

interface HomeScreenProps {
  /** Opens SmartScanner (QR / artwork / label) */
  onOpenScanner: () => void;
  /**
   * Existing feature preserved — clipboard paste of an image silently
   * routes through the analyze pipeline so power users can drop screenshots
   * onto the home surface. No visible UI here.
   */
  onFileSelected: (file: File) => void;
  /** Reserved — kept on the prop surface for back-compat with the shell. */
  onTextSubmit: (query: string) => void;
  /** Optional: error message to show below the scan button. */
  error?: string | null;
}

/**
 * ARTENA Home — Scan-first.
 *
 * Three elements only: ARTENA brand line, AI ART ANALYSIS subtitle,
 * a single dominant Scan button inside a soft dotted guide ring.
 * No instructional copy, no alternate-input grid — those features
 * still work (camera fallback, upload, text search) but are reached
 * through the scanner surface, not advertised here.
 */
export function HomeScreen({ onOpenScanner, onFileSelected, error }: HomeScreenProps) {
  const { t } = useLanguage();

  // Clipboard paste support — kept invisible. Existing feature.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { onFileSelected(file); return; }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFileSelected]);

  return (
    <div style={{
      maxWidth:      430,
      margin:        "0 auto",
      background:    "#FFFFFF",
      minHeight:     "100vh",
      boxSizing:     "border-box" as const,
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      justifyContent: "center",
      padding:       "0 22px 120px",
      fontFamily:    "'KakaoSmallSans', system-ui, sans-serif",
      position:      "relative",
    }}>
      {/* ── Top brand ─────────────────────────────────────────────── */}
      <div style={{
        position:  "absolute",
        top:       "calc(64px + env(safe-area-inset-top, 0px))",
        left:      0,
        right:     0,
        textAlign: "center" as const,
      }}>
        <p style={{
          margin:        "0 0 6px",
          fontSize:      22,
          fontWeight:    700,
          letterSpacing: ".24em",
          color:         "#0D0D0D",
          fontFamily:    "'KakaoBigSans', system-ui, sans-serif",
        }}>
          ARTENA
        </p>
        <p style={{
          margin:        0,
          fontSize:      9,
          letterSpacing: ".22em",
          color:         "#9A9A9A",
          fontFamily:    "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          {t("home.subtitle")}
        </p>
      </div>

      {/* ── Center: dotted guide + scan button ───────────────────── */}
      <div style={{
        position:       "relative",
        width:          280,
        height:         280,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        {/* Dotted guide ring */}
        <svg
          width="280"
          height="280"
          viewBox="0 0 280 280"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx="140"
            cy="140"
            r="138"
            stroke="#D8D8D8"
            strokeWidth="1"
            fill="none"
            strokeDasharray="2 6"
          />
        </svg>

        {/* Scan button — dominant */}
        <button
          onClick={onOpenScanner}
          aria-label={t("home.scan_label")}
          style={{
            width:           140,
            height:          140,
            borderRadius:    "50%",
            background:      "#0D0D0D",
            border:          "none",
            cursor:          "pointer",
            display:         "flex",
            flexDirection:   "column",
            alignItems:      "center",
            justifyContent:  "center",
            gap:             8,
            color:           "#FFFFFF",
            transition:      "transform .15s ease",
            boxShadow:       "0 16px 40px rgba(0,0,0,0.16)",
          }}
        >
          {/* Viewfinder corners icon */}
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
            <path d="M5 11V8a3 3 0 0 1 3-3h3"   stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M23 5h3a3 3 0 0 1 3 3v3"   stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M29 23v3a3 3 0 0 1-3 3h-3" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 29H8a3 3 0 0 1-3-3v-3" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{
            fontSize:      11,
            letterSpacing: ".24em",
            fontWeight:    600,
            color:         "#FFFFFF",
          }}>
            {t("home.scan_label")}
          </span>
        </button>
      </div>

      {/* Inline error — only shown on actual failure. No instructional copy. */}
      {error && (
        <div style={{
          position:  "absolute",
          bottom:    130,
          left:      22,
          right:     22,
          background: "#FEF2F2",
          border:    "0.5px solid #FECACA",
          borderRadius: 10,
          padding:   "11px 14px",
          textAlign: "center" as const,
        }}>
          <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{error}</p>
        </div>
      )}
    </div>
  );
}
