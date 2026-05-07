"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

export type QRNoticeVariant = "app" | "unsupported";

interface Props {
  variant:         QRNoticeVariant;
  onScanArtwork:   () => void;
  onScanLabel:     () => void;
  onSearchByText:  () => void;
}

/**
 * STEP 3 — Bottom sheet for app-download QRs and unanalyzable QRs.
 *
 * No report is created. No native browser is opened. Three calm
 * fallback actions point the user to a path AXVELA can reason
 * about: scan the artwork, scan the label, or search by text.
 */
export function QRNoticeSheet({
  variant,
  onScanArtwork,
  onScanLabel,
  onSearchByText,
}: Props) {
  const { t } = useLanguage();

  const titleKey = variant === "app"
    ? "qr.app_detected_title"
    : "qr.cannot_analyze_title";
  const bodyKey  = variant === "app"
    ? "qr.app_detected_body"
    : "qr.cannot_analyze_body";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{    opacity: 0 }}
        transition={{ duration: 0.28 }}
        style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(0,0,0,0.45)",
          zIndex:     380,
        }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{    y: "100%" }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        style={{
          position:     "fixed",
          bottom:       0,
          left:         "50%",
          transform:    "translateX(-50%)",
          width:        "100%",
          maxWidth:     640,
          background:   "#1A1A1A",
          color:        "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          padding:      "18px 22px calc(36px + env(safe-area-inset-bottom, 0px))",
          zIndex:       390,
          fontFamily:   FONT,
          boxShadow:    "0 -12px 40px rgba(0,0,0,0.44)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{
            width:        36,
            height:       4,
            borderRadius: 2,
            background:   "rgba(255,255,255,0.18)",
          }} />
        </div>

        <p style={{
          fontSize:      14,
          fontWeight:    600,
          margin:        "0 0 8px",
          letterSpacing: "-0.01em",
          fontFamily:    FONT_HEAD,
          lineHeight:    1.45,
        }}>
          {t(titleKey)}
        </p>
        <p style={{
          fontSize:   12,
          color:      "rgba(255,255,255,0.62)",
          margin:     "0 0 22px",
          lineHeight: 1.65,
        }}>
          {t(bodyKey)}
        </p>

        <SheetButton primary onClick={onScanArtwork}  label={t("qr.scan_artwork")} />
        <SheetButton          onClick={onScanLabel}    label={t("qr.scan_label_fallback")} />
        <SheetButton muted    onClick={onSearchByText} label={t("qr.search_by_text")} />
      </motion.div>
    </>
  );
}

function SheetButton({ onClick, label, primary = false, muted = false }: {
  onClick:  () => void;
  label:    string;
  primary?: boolean;
  muted?:   boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width:        "100%",
        padding:      "13px 16px",
        margin:       "0 0 8px",
        background:   primary ? "rgba(201,165,108,0.16)"
                              : "rgba(255,255,255,0.06)",
        border:       primary ? "0.5px solid rgba(201,165,108,0.42)"
                              : "0.5px solid rgba(255,255,255,0.16)",
        borderRadius: 12,
        color:        primary ? "#C9A56C"
                              : muted ? "rgba(255,255,255,0.55)"
                                      : "#FFFFFF",
        fontSize:     13,
        fontWeight:   primary ? 600 : 500,
        textAlign:    "left" as const,
        cursor:       "pointer",
        fontFamily:   "'KakaoSmallSans', system-ui, sans-serif",
        letterSpacing: "0.01em",
        transition:   "background .12s, border-color .12s",
      }}
    >
      {label}
    </button>
  );
}
