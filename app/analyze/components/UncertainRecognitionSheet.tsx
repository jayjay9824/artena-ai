"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

interface Props {
  onScanLabel:      () => void;
  onSearchByText:   () => void;
  onContinueAnyway: () => void;
}

/**
 * STEP 2 — Premium bottom sheet for `uncertain` recognition.
 *
 * Replaces a harsh error modal. Three actions:
 *   1. Scan Label         (primary — bronze tinted)
 *   2. Search by Text     (secondary)
 *   3. Continue Anyway    (muted)
 *
 * Spring animation. Spec rule: no red, no error iconography, calm tone.
 */
export function UncertainRecognitionSheet({
  onScanLabel,
  onSearchByText,
  onContinueAnyway,
}: Props) {
  const { t } = useLanguage();
  return (
    <>
      {/* Backdrop — soft fade, not pure black */}
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
          fontSize:      15,
          fontWeight:    600,
          margin:        "0 0 8px",
          letterSpacing: "-0.01em",
          fontFamily:    FONT_HEAD,
        }}>
          {t("recognition.uncertain_title")}
        </p>
        <p style={{
          fontSize:   12,
          color:      "rgba(255,255,255,0.62)",
          margin:     "0 0 22px",
          lineHeight: 1.6,
        }}>
          {t("recognition.uncertain_description")}
        </p>

        <SheetButton primary onClick={onScanLabel}      label={t("recognition.scan_label")} />
        <SheetButton          onClick={onSearchByText}  label={t("recognition.search_by_text")} />
        <SheetButton muted    onClick={onContinueAnyway} label={t("recognition.continue_anyway")} />
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
        fontFamily:   FONT,
        letterSpacing: "0.01em",
        transition:   "background .12s, border-color .12s",
      }}
    >
      {label}
    </button>
  );
}
