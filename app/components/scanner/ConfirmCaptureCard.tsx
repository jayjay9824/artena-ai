"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans',   system-ui, sans-serif";
const BRONZE    = "#C9A56C";

interface Props {
  onConfirm: () => void;
  onRescan:  () => void;
  /** 0..100 — surfaced as a small confidence pill on the card. */
  confidence: number;
}

/**
 * Bottom-anchored confirm card. Shown when the scanner has
 * detected a target and requireConfirmation is on — the user
 * decides whether to analyze or recompose.
 */
export function ConfirmCaptureCard({ onConfirm, onRescan, confidence }: Props) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      style={{
        position:     "absolute",
        left:         "50%",
        bottom:       "calc(36px + env(safe-area-inset-bottom, 0px))",
        transform:    "translateX(-50%)",
        width:        "min(360px, calc(100% - 36px))",
        zIndex:       40,
        background:   "rgba(20,20,20,0.78)",
        backdropFilter:        "blur(18px)",
        WebkitBackdropFilter:  "blur(18px)",
        border:       "0.5px solid rgba(255,255,255,0.18)",
        borderRadius: 18,
        padding:      "18px 18px 16px",
        boxShadow:    "0 14px 48px rgba(0,0,0,0.45)",
        fontFamily:   FONT,
      }}
    >
      {/* Top row: caption + confidence pill */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   8,
      }}>
        <span style={{
          fontSize:      9.5,
          letterSpacing: ".22em",
          textTransform: "uppercase" as const,
          color:         BRONZE,
          fontWeight:    600,
        }}>
          ◆ {t("scanner.confirm_caption")}
        </span>
        <span style={{
          fontSize:        10,
          letterSpacing:   ".06em",
          color:           "rgba(255,255,255,0.62)",
          fontVariantNumeric: "tabular-nums" as const,
        }}>
          {confidence.toFixed(1)}%
        </span>
      </div>

      {/* Question */}
      <p style={{
        margin:        "0 0 14px",
        fontSize:      15,
        color:         "#FFFFFF",
        fontFamily:    FONT_HEAD,
        fontWeight:    600,
        letterSpacing: "-0.005em",
        lineHeight:    1.35,
      }}>
        {t("scanner.confirm_question")}
      </p>

      {/* Primary CTA */}
      <button
        onClick={onConfirm}
        style={{
          width:        "100%",
          padding:      "13px 16px",
          background:   BRONZE,
          border:       "none",
          borderRadius: 12,
          color:        "#0D0D0D",
          fontSize:     13.5,
          fontWeight:   700,
          letterSpacing: ".04em",
          cursor:       "pointer",
          fontFamily:   FONT,
          transition:   "transform .12s, opacity .12s",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.985)")}
        onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
      >
        {t("scanner.confirm_cta")}
      </button>

      {/* Secondary — rescan */}
      <button
        onClick={onRescan}
        style={{
          width:        "100%",
          padding:      "10px 12px 2px",
          background:   "transparent",
          border:       "none",
          color:        "rgba(255,255,255,0.55)",
          fontSize:     12,
          letterSpacing: ".02em",
          cursor:       "pointer",
          fontFamily:   FONT,
        }}
      >
        {t("scanner.confirm_rescan")}
      </button>
    </motion.div>
  );
}
