"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";
import type { QRDetection, QRPurpose } from "../../types/scanner";
import { sortByQRPriority } from "../../services/scanner/qrPurpose";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

interface Props {
  detections: QRDetection[];
  onPick:     (d: QRDetection) => void;
}

const PURPOSE_LABEL_KEY: Record<QRPurpose, string> = {
  artwork_info:    "qr.label_artwork_info",
  exhibition_info: "qr.label_exhibition_info",
  museum_guide:    "qr.label_museum_guide",
  ios_app:         "qr.label_ios_app",
  android_app:     "qr.label_android_app",
  unknown:         "qr.label_unknown",
};

const PURPOSE_ACCENT: Record<QRPurpose, string> = {
  artwork_info:    "#C9A56C",
  exhibition_info: "#C9A56C",
  museum_guide:    "rgba(255,255,255,0.85)",
  ios_app:         "rgba(255,255,255,0.55)",
  android_app:     "rgba(255,255,255,0.55)",
  unknown:         "rgba(255,255,255,0.45)",
};

/**
 * STEP 3 — AR-style overlay for multi-QR scenes.
 *
 * Renders a chip per detected QR. When the producer supplies
 * positional data we anchor the chip directly over the code; when
 * positions are missing the chips stack near the bottom of the
 * viewport so the user can still pick one. Highest-priority chip
 * gets a bronze accent so the eye lands there first.
 *
 * Spring animation per the global motion rule. No harsh borders,
 * no error iconography.
 */
export function QRPurposeOverlay({ detections, onPick }: Props) {
  const { t } = useLanguage();
  const sorted = sortByQRPriority(detections);
  const hasPositions = sorted.some(d => d.position);

  return (
    <>
      {/* Positioned AR chips when each detection carries coordinates */}
      {hasPositions && sorted.map((d, i) => d.position && (
        <PositionedChip
          key={`pos-${i}`}
          detection={d}
          label={t(PURPOSE_LABEL_KEY[d.purpose])}
          accent={PURPOSE_ACCENT[d.purpose]}
          onPick={onPick}
          delay={i * 0.05}
        />
      ))}

      {/* Stacked fallback list — shown when positions are missing */}
      {!hasPositions && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          style={{
            position:        "absolute",
            left:            "50%",
            bottom:          "calc(120px + env(safe-area-inset-bottom, 0px))",
            transform:       "translateX(-50%)",
            zIndex:          32,
            display:         "flex",
            flexDirection:   "column",
            gap:             8,
            maxWidth:        "calc(100vw - 36px)",
            width:           "min(360px, calc(100vw - 36px))",
            padding:         "14px",
            background:      "rgba(20,20,20,0.92)",
            backdropFilter:  "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border:          "0.5px solid rgba(255,255,255,0.18)",
            borderRadius:    16,
            boxShadow:       "0 12px 36px rgba(0,0,0,0.4)",
          }}
        >
          <p style={{
            fontSize:      9.5,
            color:         "rgba(255,255,255,0.55)",
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            margin:        "0 0 4px",
            fontWeight:    600,
            fontFamily:    FONT,
          }}>
            ◆ {t("qr.multiple_detected")}
          </p>
          {sorted.map((d, i) => (
            <button
              key={`stack-${i}`}
              onClick={() => onPick(d)}
              style={{
                width:        "100%",
                padding:      "10px 14px",
                background:   "rgba(255,255,255,0.06)",
                border:       `0.5px solid ${PURPOSE_ACCENT[d.purpose] === "#C9A56C" ? "rgba(201,165,108,0.42)" : "rgba(255,255,255,0.14)"}`,
                borderRadius: 10,
                color:        PURPOSE_ACCENT[d.purpose] === "#C9A56C" ? "#C9A56C" : "#FFFFFF",
                fontSize:     12.5,
                fontWeight:   PURPOSE_ACCENT[d.purpose] === "#C9A56C" ? 600 : 500,
                textAlign:    "left" as const,
                cursor:       "pointer",
                fontFamily:   FONT,
                letterSpacing: "0.01em",
              }}
            >
              {t(PURPOSE_LABEL_KEY[d.purpose])}
            </button>
          ))}
        </motion.div>
      )}
    </>
  );
}

function PositionedChip({
  detection, label, accent, onPick, delay,
}: {
  detection: QRDetection;
  label:     string;
  accent:    string;
  onPick:    (d: QRDetection) => void;
  delay:     number;
}) {
  const pos = detection.position;
  if (!pos) return null;
  const isPrimary = accent === "#C9A56C";

  return (
    <motion.button
      onClick={() => onPick(detection)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 22, delay }}
      style={{
        position:     "absolute",
        left:         `${pos.x}%`,
        top:          `${pos.y}%`,
        width:        `${pos.width}%`,
        height:       `${pos.height}%`,
        background:   "rgba(0,0,0,0.30)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border:       `1.5px solid ${accent}`,
        borderRadius: 10,
        cursor:       "pointer",
        zIndex:       28,
        padding:      0,
        boxShadow:    isPrimary ? "0 0 24px rgba(201,165,108,0.32)" : "0 0 18px rgba(255,255,255,0.12)",
        fontFamily:   FONT,
      }}
    >
      <span style={{
        position:     "absolute",
        bottom:       "calc(100% + 8px)",
        left:         "50%",
        transform:    "translateX(-50%)",
        padding:      "4px 10px",
        background:   isPrimary ? "rgba(201,165,108,0.92)" : "rgba(20,20,20,0.92)",
        color:        isPrimary ? "#0D0D0D" : "#FFFFFF",
        fontSize:     10,
        fontWeight:   600,
        letterSpacing: "0.06em",
        borderRadius: 999,
        whiteSpace:   "nowrap" as const,
      }}>
        {label}
      </span>
    </motion.button>
  );
}
