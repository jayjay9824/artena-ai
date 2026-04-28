"use client";
import React from "react";
import { ScanFrameIcon } from "../icons/ScanFrameIcon";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

interface Props {
  onClick: () => void;
  label?:  string;
}

/**
 * Center scan orb — a black circular CTA at ~240px diameter sitting
 * inside a 380px dotted ring. SVG dotted circle gives clean,
 * platform-stable dots (CSS `dotted` borders render as squares on
 * some Chromium builds).
 */
export function ScanOrb({ onClick, label = "SCAN" }: Props) {
  return (
    <div style={{
      position:       "relative",
      width:          380,
      height:         380,
      maxWidth:       "92vw",
      maxHeight:      "92vw",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
    }}>
      {/* Dotted guide ring */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 380 380"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden
      >
        <circle
          cx="190"
          cy="190"
          r="188"
          fill="none"
          stroke="rgba(0,0,0,0.14)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
      </svg>

      {/* Black orb CTA */}
      <button
        onClick={onClick}
        aria-label={label}
        style={{
          width:           240,
          height:          240,
          borderRadius:    "50%",
          background:      "#0F0F0F",
          border:          "none",
          cursor:          "pointer",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             14,
          color:           "#FFFFFF",
          fontFamily:      FONT,
          boxShadow:       "0 18px 50px rgba(0,0,0,0.18), 0 6px 18px rgba(0,0,0,0.10)",
          transition:      "transform .15s ease, box-shadow .2s ease",
        }}
      >
        <ScanFrameIcon size={48} color="#FFFFFF" />
        <span style={{
          fontSize:      13,
          fontWeight:    600,
          letterSpacing: "0.34em",
          paddingLeft:   "0.34em", // optical centering with the wide tracking
          color:         "#FFFFFF",
        }}>
          {label}
        </span>
      </button>
    </div>
  );
}
