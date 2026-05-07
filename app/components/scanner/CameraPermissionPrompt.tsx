"use client";
import React from "react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

interface Props {
  onEnableCamera: () => void;
  onUploadImage:  () => void;
  onSearchByText: () => void;
  /**
   * When true the user has already denied permission — hide the
   * Enable button (it would just retrigger the OS deny path) and
   * lead with the fallback actions per spec rule.
   */
  denied?: boolean;
}

/**
 * STEP 1 — Soft permission prompt.
 *
 * Rendered before any getUserMedia call so the user understands
 * what the camera is for. Doubles as the post-denial screen — same
 * layout, no Enable button, no technical browser error string.
 */
export function CameraPermissionPrompt({
  onEnableCamera,
  onUploadImage,
  onSearchByText,
  denied = false,
}: Props) {
  const { t } = useLanguage();
  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        300,
      background:    "#0D0D0D",
      color:         "#FFFFFF",
      display:       "flex",
      flexDirection: "column",
      padding:       "60px 28px calc(40px + env(safe-area-inset-bottom, 0px))",
      fontFamily:    FONT,
    }}>
      <div style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth:      420,
        margin:        "0 auto",
        width:         "100%",
      }}>
        <p style={{
          fontSize:       9,
          color:          "#8A6A3F",
          letterSpacing:  "0.22em",
          textTransform:  "uppercase" as const,
          margin:         "0 0 18px",
          fontWeight:     600,
        }}>
          {t("scanner.title")}
        </p>
        <h2 style={{
          fontSize:    22,
          fontWeight:  600,
          color:       "#FFFFFF",
          margin:      "0 0 14px",
          fontFamily:  FONT_HEAD,
          letterSpacing: "-0.01em",
          lineHeight:  1.3,
        }}>
          {denied ? t("scanner.denied_title") : t("scanner.permission_title")}
        </h2>
        <p style={{
          fontSize:   13,
          color:      "rgba(255,255,255,0.7)",
          margin:     0,
          lineHeight: 1.6,
        }}>
          {t("scanner.permission_body")}
        </p>
      </div>

      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           10,
        maxWidth:      420,
        margin:        "0 auto",
        width:         "100%",
      }}>
        {!denied && (
          <button
            onClick={onEnableCamera}
            style={{
              width:        "100%",
              padding:      "14px 0",
              background:   "#FFFFFF",
              color:        "#0D0D0D",
              border:       "none",
              borderRadius: 999,
              fontSize:     13,
              fontWeight:   600,
              letterSpacing: "0.04em",
              cursor:       "pointer",
              fontFamily:   FONT,
            }}
          >
            {t("scanner.enable_camera")}
          </button>
        )}
        <button
          onClick={onUploadImage}
          style={{
            width:        "100%",
            padding:      "13px 0",
            background:   "transparent",
            color:        "#FFFFFF",
            border:       "0.5px solid rgba(255,255,255,0.4)",
            borderRadius: 999,
            fontSize:     13,
            letterSpacing: "0.02em",
            cursor:       "pointer",
            fontFamily:   FONT,
          }}
        >
          {t("scanner.upload_image")}
        </button>
        <button
          onClick={onSearchByText}
          style={{
            width:        "100%",
            padding:      "13px 0",
            background:   "transparent",
            color:        "#FFFFFF",
            border:       "0.5px solid rgba(255,255,255,0.4)",
            borderRadius: 999,
            fontSize:     13,
            letterSpacing: "0.02em",
            cursor:       "pointer",
            fontFamily:   FONT,
          }}
        >
          {t("scanner.search_by_text")}
        </button>
      </div>
    </div>
  );
}
