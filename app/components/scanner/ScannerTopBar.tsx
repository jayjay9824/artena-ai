"use client";
import React from "react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

interface Props {
  onBack:        () => void;
  flashOn:       boolean;
  onToggleFlash: () => void;
  /** PART 2 — hide the title chrome. Default true for back-compat. */
  showTitle?:    boolean;
  /** PART 2 — only render the flash button when needed (low-light). Default true. */
  showFlash?:    boolean;
}

/**
 * STEP 1 — Scanner top bar.
 *
 *   ◀ Back        |  ARTENA SCANNER  |  ⚡ Flash toggle
 *
 * Translucent gradient header so it sits over the live camera
 * preview without obscuring detail at the top of the frame.
 */
export function ScannerTopBar({
  onBack,
  flashOn,
  onToggleFlash,
  showTitle = true,
  showFlash = true,
}: Props) {
  const { t } = useLanguage();
  return (
    <div style={{
      position:        "absolute",
      top:             0,
      left:            0,
      right:           0,
      zIndex:          30,
      padding:         "calc(20px + env(safe-area-inset-top, 0px)) 18px 14px",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "space-between",
      background:      "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)",
      pointerEvents:   "auto",
    }}>
      <button
        onClick={onBack}
        aria-label={t("common.back")}
        style={{
          width:           38,
          height:          38,
          borderRadius:    "50%",
          background:      "rgba(0,0,0,0.4)",
          border:          "none",
          backdropFilter:  "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          cursor:          "pointer",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showTitle ? (
        <p style={{
          margin:        0,
          fontSize:      12,
          color:         "#FFFFFF",
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          fontFamily:    FONT,
          fontWeight:    600,
        }}>
          {t("scanner.title")}
        </p>
      ) : (
        <span />
      )}

      {showFlash ? (
        <button
          onClick={onToggleFlash}
          aria-label={t("scanner.toggle_flash")}
          aria-pressed={flashOn}
          style={{
            width:           38,
            height:          38,
            borderRadius:    "50%",
            background:      flashOn ? "#FFD580" : "rgba(0,0,0,0.4)",
            border:          "none",
            backdropFilter:  "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            cursor:          "pointer",
            transition:      "background .15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M9 1L3 9H7L7 15L13 7H9L9 1Z"
              stroke={flashOn ? "#0D0D0D" : "#FFFFFF"}
              fill={flashOn ? "#0D0D0D" : "none"}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <span style={{ width: 38 }} />
      )}
    </div>
  );
}
