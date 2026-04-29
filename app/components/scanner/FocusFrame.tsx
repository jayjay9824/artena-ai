"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { tinyHaptic } from "../../lib/scanner/haptic";

export type FocusFrameState = "idle" | "detecting" | "locked" | "hidden";
export type DistanceCue     = "normal" | "too_close" | "too_far";

interface Props {
  state:        FocusFrameState;
  /** Visual feedback only — no warning text. */
  distanceCue?: DistanceCue;
  /**
   * STEP 2 — when true, the viewfinder springs from the default
   * artwork-friendly square to a wide horizontal rectangle suited
   * to a museum label. Spec: spring + haptic on transition.
   */
  labelMode?:   boolean;
}

const CORNER_LEN_PX = 26;
const FRAME_RADIUS  = 14;

/**
 * PART 2 — Unified center-anchored focus frame.
 *
 *   idle      Thin outer ring + 4 corners, soft 2.4s pulse.
 *   detecting Corners thicken, frame scales to 1.02.
 *   locked    Snap-shrink keyframe [1.0 → 0.94 → 1.0] + crisp haptic.
 *   hidden    Returns null (rendered while capturing / transitioning).
 *
 * Distance cues:
 *   too_close  → corners take a soft red tint
 *   too_far    → whole frame opacity drops to 0.55
 */
export function FocusFrame({ state, distanceCue = "normal", labelMode = false }: Props) {
  // One crisp haptic on every locked entry. Silently no-ops on iOS Safari.
  useEffect(() => {
    if (state === "locked") tinyHaptic(40);
  }, [state]);

  // STEP 2 — second crisp haptic on entering label mode.
  useEffect(() => {
    if (labelMode) tinyHaptic(30);
  }, [labelMode]);

  if (state === "hidden") return null;

  const isDetecting = state === "detecting";
  const isLocked    = state === "locked";

  const cornerColor = distanceCue === "too_close"
    ? "rgba(220, 80, 80, 0.92)"
    : "rgba(255, 255, 255, 0.95)";
  const baseOpacity = distanceCue === "too_far" ? 0.55 : 1;
  const cornerThick = isDetecting || isLocked ? 1.8 : 1.15;

  return (
    <motion.div
      animate={{
        opacity: baseOpacity,
        scale:   isLocked
          ? [1.0, 0.94, 1.0]
          : isDetecting
            ? 1.02
            : 1.0,
        // STEP 2 — wide horizontal frame in label mode, square-ish
        // otherwise. Animated together so the morph springs from
        // one rectangle to the other.
        width:   labelMode ? "82%" : "62%",
        height:  labelMode ? "18%" : "44%",
      }}
      transition={{
        opacity: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
        scale:   isLocked
          ? { times: [0, 0.45, 1], duration: 0.32, ease: [0.22, 1, 0.36, 1] }
          : { type: "spring", stiffness: 380, damping: 32 },
        width:   { type: "spring", stiffness: 200, damping: 22 },
        height:  { type: "spring", stiffness: 200, damping: 22 },
      }}
      style={{
        position:      "absolute",
        left:          "50%",
        top:           "50%",
        translate:     "-50% -50%",
        pointerEvents: "none",
        zIndex:        25,
      }}
    >
      {/* Idle pulse — soft outer ring; hidden once detection begins. */}
      {state === "idle" && (
        <motion.div
          animate={{ opacity: [0.28, 0.55, 0.28] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position:     "absolute",
            inset:        0,
            border:       "1px solid rgba(255,255,255,0.55)",
            borderRadius: FRAME_RADIUS,
          }}
        />
      )}

      <Corner pos="tl" color={cornerColor} thickness={cornerThick} />
      <Corner pos="tr" color={cornerColor} thickness={cornerThick} />
      <Corner pos="bl" color={cornerColor} thickness={cornerThick} />
      <Corner pos="br" color={cornerColor} thickness={cornerThick} />
    </motion.div>
  );
}

function Corner({ pos, color, thickness }: {
  pos:       "tl" | "tr" | "bl" | "br";
  color:     string;
  thickness: number;
}) {
  const bts = `${thickness}px solid ${color}`;
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: -1,    left:  -1, borderTop:    bts, borderLeft:  bts, borderTopLeftRadius:     FRAME_RADIUS - 2 },
    tr: { top: -1,    right: -1, borderTop:    bts, borderRight: bts, borderTopRightRadius:    FRAME_RADIUS - 2 },
    bl: { bottom: -1, left:  -1, borderBottom: bts, borderLeft:  bts, borderBottomLeftRadius:  FRAME_RADIUS - 2 },
    br: { bottom: -1, right: -1, borderBottom: bts, borderRight: bts, borderBottomRightRadius: FRAME_RADIUS - 2 },
  };
  return (
    <div style={{
      position:   "absolute",
      width:      CORNER_LEN_PX,
      height:     CORNER_LEN_PX,
      transition: "border-color .3s ease, border-width .25s ease",
      ...styles[pos],
    }} />
  );
}
