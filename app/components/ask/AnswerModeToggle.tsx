"use client";
import React from "react";
import { motion } from "framer-motion";
import { useAnswerMode } from "../../context/AnswerModeContext";
import { useLanguage } from "../../i18n/useLanguage";
import type { AnswerMode } from "../../types/ai";

/**
 * AXVELA Mode System — Apple-level segmented control.
 *
 * Three options: Appreciation / 감상, Investment / 투자, Expert / 전문가.
 *
 * Visual spec:
 *   Container — pill, #F8F7F4, 999px radius, 4px padding, 0.5px
 *               #E7E2D8 border (very light, easily replaced with
 *               none if the surface needs it).
 *   Active    — #111111 background, white text.
 *   Inactive  — #6F6F6F text, no background.
 *
 * Motion:
 *   The active pill animates between segments via framer-motion's
 *   layoutId. Spring stiffness 380 / damping 32 lands inside the
 *   spec's 120-180ms feel without overshoot.
 *
 * Behavior:
 *   onClick fires navigator.vibrate(10) (silent fail on unsupported
 *   browsers / iOS Safari) and then setMode(), which already flips
 *   isManualModeOverride to true (see AnswerModeContext) — auto
 *   detection in modeDetection.ts respects the override.
 *
 * This component is purely the toggle. It does not render any
 * answer surface and does not modify any existing screen.
 */

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

const MODES: AnswerMode[] = ["appreciation", "investment", "expert"];

interface Props {
  /** Optional className hook for callers that want to constrain
   *  width or position the control inside their own layout. */
  className?: string;
  /** Optional inline style passthrough — merges over the defaults. */
  style?:     React.CSSProperties;
}

export function AnswerModeToggle({ className, style }: Props) {
  const { selectedMode, setMode } = useAnswerMode();
  const { t } = useLanguage();

  const labelFor: Record<AnswerMode, string> = {
    appreciation: t("mode.appreciation"),
    investment:   t("mode.investment"),
    expert:       t("mode.expert"),
  };

  const handleClick = (mode: AnswerMode) => {
    if (mode === selectedMode) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch { /* unsupported — silent */ }
    setMode(mode);
  };

  return (
    <div
      role="tablist"
      aria-label="AXVELA answer mode"
      className={className}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        background:     "#F8F7F4",
        border:         "0.5px solid #E7E2D8",
        borderRadius:   999,
        padding:        4,
        gap:            2,
        fontFamily:     FONT,
        userSelect:     "none",
        ...style,
      }}
    >
      {MODES.map((mode) => {
        const active = mode === selectedMode;
        return (
          <button
            key={mode}
            role="tab"
            aria-selected={active}
            onClick={() => handleClick(mode)}
            style={{
              position:        "relative" as const,
              border:          "none",
              background:      "transparent",
              padding:         "8px 18px",
              minWidth:        72,
              borderRadius:    999,
              cursor:          active ? "default" : "pointer",
              fontFamily:      FONT,
              fontSize:        12.5,
              fontWeight:      active ? 600 : 500,
              letterSpacing:   "0.005em",
              color:           "transparent", // overridden by the inner span; lets layoutId pill ride underneath
              WebkitTapHighlightColor: "transparent",
              outline:         "none",
            }}
          >
            {/* Active sliding pill — framer-motion layoutId handles
                the spring transition between segments without any
                manual position math. */}
            {active && (
              <motion.span
                layoutId="axvela-mode-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.6 }}
                style={{
                  position:     "absolute",
                  inset:        0,
                  background:   "#111111",
                  borderRadius: 999,
                  zIndex:       0,
                }}
              />
            )}
            {/* Label — always rendered above the pill via z-index. */}
            <span
              style={{
                position: "relative",
                zIndex:   1,
                color:    active ? "#FFFFFF" : "#6F6F6F",
                transition: "color 140ms ease",
              }}
            >
              {labelFor[mode]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
