"use client";
import React from "react";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

interface Props {
  label:      string;
  confidence: number;  // 0..100
  /** Accent dot color — typically the bounding box's border color. */
  accent:     string;
}

/**
 * STEP 3 — Detection confidence pill.
 *
 * Anchored above the bounding box. Charcoal backdrop-blur, warm
 * white text, tabular numerics so the percentage doesn't reflow as
 * the value drifts.
 */
export function ConfidencePill({ label, confidence, accent }: Props) {
  return (
    <span style={{
      display:         "inline-flex",
      alignItems:      "center",
      gap:             8,
      padding:         "5px 11px",
      background:      "rgba(20,20,20,0.78)",
      backdropFilter:  "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderRadius:    999,
      border:          "0.5px solid rgba(255,255,255,0.16)",
      whiteSpace:      "nowrap" as const,
      boxShadow:       "0 4px 16px rgba(0,0,0,0.32)",
    }}>
      <span style={{
        width:      6,
        height:     6,
        borderRadius: "50%",
        background: accent,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize:      10.5,
        color:         "#FFFFFF",
        letterSpacing: "0.02em",
        fontFamily:    FONT,
        fontWeight:    600,
      }}>
        {label}
      </span>
      <span style={{
        fontSize:           10.5,
        color:              "rgba(255,255,255,0.72)",
        fontVariantNumeric: "tabular-nums",
        fontFamily:         "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}>
        {confidence.toFixed(1)}%
      </span>
    </span>
  );
}
