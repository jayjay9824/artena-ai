"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

interface Props {
  onUploadImage:       () => void;
  onScanLabelManually: () => void;
  onSearchByText:      () => void;
  onDismiss:           () => void;
}

/**
 * STEP 4 — Bottom action sheet shown when detection fails or times
 * out. Three vertical actions per spec:
 *   • Upload Image
 *   • Scan Label Manually
 *   • Search by Text
 *
 * Backdrop tap dismisses. Motion: slide up, ease-out cubic; backdrop
 * fades. Spec rule: "Never dead-end the user" — every path resolves
 * into one of these three actions.
 */
export function ScannerFallbackSheet({
  onUploadImage,
  onScanLabelManually,
  onSearchByText,
  onDismiss,
}: Props) {
  const { t } = useLanguage();
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{    opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset:    0,
          background: "rgba(0,0,0,0.5)",
          zIndex:   350,
        }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{    y: "100%" }}
        transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
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
          zIndex:       360,
          fontFamily:   FONT,
          boxShadow:    "0 -12px 40px rgba(0,0,0,0.42)",
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
          fontSize:    15,
          color:       "#FFFFFF",
          fontWeight:  600,
          margin:      "0 0 6px",
          fontFamily:  FONT_HEAD,
          letterSpacing: "-0.01em",
        }}>
          {t("scanner.fallback_title")}
        </p>
        <p style={{
          fontSize:   11,
          color:      "rgba(255,255,255,0.55)",
          margin:     "0 0 18px",
          lineHeight: 1.55,
        }}>
          {t("scanner.fallback_subtitle")}
        </p>

        <FallbackButton onClick={onUploadImage}       label={t("scanner.fallback_upload")} />
        <FallbackButton onClick={onScanLabelManually} label={t("scanner.fallback_label")} />
        <FallbackButton onClick={onSearchByText}      label={t("scanner.fallback_search")} />
      </motion.div>
    </>
  );
}

function FallbackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:        "100%",
        padding:      "13px 16px",
        margin:       "0 0 8px",
        background:   "rgba(255,255,255,0.06)",
        border:       "0.5px solid rgba(255,255,255,0.16)",
        borderRadius: 12,
        color:        "#FFFFFF",
        fontSize:     13,
        textAlign:    "left",
        cursor:       "pointer",
        fontFamily:   "'KakaoSmallSans', system-ui, sans-serif",
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </button>
  );
}
