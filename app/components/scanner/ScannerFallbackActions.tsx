"use client";
import React from "react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

interface Props {
  onUploadImage:  () => void;
  onSearchByText: () => void;
}

/**
 * STEP 1 — Bottom fallback row.
 *
 * Two pill buttons (Upload / Search) under the camera preview.
 * Always rendered when the scanner has access — gives users an
 * out without leaving the screen — and is the post-denial CTA row
 * inside CameraPermissionPrompt.
 */
export function ScannerFallbackActions({ onUploadImage, onSearchByText }: Props) {
  const { t } = useLanguage();
  return (
    <div style={{
      display:        "flex",
      justifyContent: "center",
      gap:            10,
      padding:        "0 18px",
    }}>
      <button
        onClick={onUploadImage}
        style={{
          flex:           1,
          padding:        "11px 0",
          background:     "rgba(255,255,255,0.08)",
          border:         "0.5px solid rgba(255,255,255,0.22)",
          borderRadius:   999,
          color:          "#FFFFFF",
          fontSize:       12,
          letterSpacing:  "0.02em",
          fontFamily:     FONT,
          cursor:         "pointer",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          maxWidth:       200,
        }}
      >
        {t("scanner.upload_image")}
      </button>
      <button
        onClick={onSearchByText}
        style={{
          flex:           1,
          padding:        "11px 0",
          background:     "rgba(255,255,255,0.08)",
          border:         "0.5px solid rgba(255,255,255,0.22)",
          borderRadius:   999,
          color:          "#FFFFFF",
          fontSize:       12,
          letterSpacing:  "0.02em",
          fontFamily:     FONT,
          cursor:         "pointer",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          maxWidth:       200,
        }}
      >
        {t("scanner.search_by_text")}
      </button>
    </div>
  );
}
