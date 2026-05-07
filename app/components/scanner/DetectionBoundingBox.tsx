"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import type { DetectionTarget } from "../../types/scanner";
import { ConfidencePill } from "./ConfidencePill";
import { useLanguage } from "../../i18n/useLanguage";
import { tinyHaptic } from "../../lib/scanner/haptic";

export interface BoxRect {
  /** All values in % of viewport. */
  x: number; y: number; w: number; h: number;
}

interface Props {
  target:     Exclude<DetectionTarget, "none">;
  box:        BoxRect;
  confidence: number;
  /** True while scannerState === "locking" — fires the snap pulse + haptic. */
  isLocking:  boolean;
  /**
   * STEP 4 — true while the screen runs the spatial-transition exit
   * (success → Quick View). Box scales out softly and fades while
   * the camera preview blurs.
   */
  isExiting?: boolean;
}

/**
 * STEP 3 — Target-aware detection bounding box.
 *
 * Style by target:
 *   • artwork  white border, white glow, "Artwork detected"
 *   • label    warm gray #B8B2A8, "Label detected"
 *   • qr       muted bronze #8A6A3F, "QR detected"
 *
 * Lock sequence (scannerState → "locking"):
 *   1. Box snap [1.0 → 1.02 → 1.0]
 *   2. Pulse ring expands + fades once
 *   3. navigator.vibrate(30) attempt
 *
 * 1.25px stroke + 14px corner radius + soft glow. No neon, no thick
 * strokes — Apple-tier rather than gaming UI.
 */

const TARGET_STYLE: Record<Exclude<DetectionTarget, "none">, {
  border:    string;
  glow:      string;
  labelKey:  string;
}> = {
  artwork: {
    border:   "rgba(255,255,255,0.92)",
    glow:     "rgba(255,255,255,0.18)",
    labelKey: "scanner.box_artwork",
  },
  label: {
    border:   "#B8B2A8",
    glow:     "rgba(184,178,168,0.22)",
    labelKey: "scanner.box_label",
  },
  qr: {
    border:   "#8A6A3F",
    glow:     "rgba(138,106,63,0.26)",
    labelKey: "scanner.box_qr",
  },
};

export function DetectionBoundingBox({ target, box, confidence, isLocking, isExiting = false }: Props) {
  const { t } = useLanguage();
  const cfg = TARGET_STYLE[target];

  // Haptic fires once each time the lock transition fires.
  useEffect(() => {
    if (isLocking) tinyHaptic();
  }, [isLocking]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{
        opacity: isExiting ? 0.4 : 1,
        scale:   isExiting ? 1.18 : isLocking ? [1.0, 1.02, 1.0] : 1.0,
      }}
      transition={{
        opacity: { duration: isExiting ? 0.55 : 0.25, ease: [0.32, 0.72, 0, 1] },
        scale:   isExiting
          ? { duration: 0.55, ease: [0.32, 0.72, 0, 1] }
          : isLocking
            ? { times: [0, 0.45, 1], duration: 0.42, ease: [0.22, 1, 0.36, 1] }
            : { type: "spring", stiffness: 380, damping: 32 },
      }}
      style={{
        position:      "absolute",
        left:          `${box.x}%`,
        top:           `${box.y}%`,
        width:         `${box.w}%`,
        height:        `${box.h}%`,
        border:        `1.25px solid ${cfg.border}`,
        borderRadius:  14,
        boxShadow:     `0 0 24px ${cfg.glow}, inset 0 0 14px ${cfg.glow}`,
        pointerEvents: "none",
        zIndex:        25,
      }}
    >
      {/* Lock pulse — outer ring that expands and fades once */}
      {isLocking && (
        <motion.div
          key="lock-pulse"
          initial={{ opacity: 0.55, scale: 0.98 }}
          animate={{ opacity: 0,    scale: 1.14 }}
          transition={{ duration: 0.5, ease: [0.22, 0, 0.6, 1] }}
          style={{
            position:     "absolute",
            inset:        -3,
            borderRadius: 16,
            border:       `1.25px solid ${cfg.border}`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Confidence pill — sits above the box */}
      <div style={{
        position:      "absolute",
        top:           -34,
        left:          0,
        pointerEvents: "none",
      }}>
        <ConfidencePill
          label={t(cfg.labelKey)}
          confidence={confidence}
          accent={cfg.border}
        />
      </div>
    </motion.div>
  );
}
