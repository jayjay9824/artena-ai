"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

interface Props {
  onDismiss?: () => void;
}

/**
 * STEP 2 — Subtle top toast for `partial` recognition.
 *
 * Non-blocking. Renders as a small dark pill near the top of the
 * Quick Report so the user sees the caveat without losing the report
 * surface. Dismissible. Spring animation per the global style rule.
 */
export function PartialRecognitionToast({ onDismiss }: Props) {
  const { t } = useLanguage();
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      style={{
        position:        "fixed",
        top:             "calc(16px + env(safe-area-inset-top, 0px))",
        left:            "50%",
        transform:       "translateX(-50%)",
        zIndex:          120,
        maxWidth:        "calc(100vw - 32px)",
        width:           "auto",
        padding:         "10px 14px",
        background:      "rgba(20,20,20,0.92)",
        backdropFilter:  "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border:          "0.5px solid rgba(255,255,255,0.18)",
        borderRadius:    14,
        color:           "#FFFFFF",
        fontSize:        11.5,
        lineHeight:      1.55,
        fontFamily:      FONT,
        display:         "flex",
        alignItems:      "flex-start",
        gap:             10,
        boxShadow:       "0 6px 24px rgba(0,0,0,0.32)",
      }}
    >
      <span style={{ fontSize: 8, color: "#C9A56C", marginTop: 4, flexShrink: 0 }}>◆</span>
      <span style={{ flex: 1 }}>{t("recognition.partial_notice")}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="dismiss"
          style={{
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      "rgba(255,255,255,0.55)",
            padding:    0,
            fontSize:   16,
            lineHeight: 1,
            marginTop:  -2,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </motion.div>
  );
}
