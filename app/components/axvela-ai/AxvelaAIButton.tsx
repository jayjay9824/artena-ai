"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

const STYLE_ID = "axvela-ai-cta-styles";

/**
 * Phase 1 styling + Phase 2 press / ripple / activation feedback.
 *
 * Idle (Phase 1):
 *   • Dark glass body, hairline violet border, three-layer shadow
 *   • aiMaterialBreath keyframe — scale 1 → 1.012 → 1 over 4s
 *
 * Press (Phase 2):
 *   • whileTap scale 0.96 (ride atop the breath transform — framer
 *     wins during press, the keyframe resumes on release)
 *   • aiPressFlash class layers a momentary stronger violet halo
 *     so the press registers visually within ~140ms
 *
 * Ripple (Phase 2):
 *   • One-shot expanding violet ring keyed off rippleKey, scale
 *     0.9 → 2.0, opacity 0.45 → 0, 600ms ease-out
 *
 * Activation handoff (Phase 2):
 *   • While the parent's isModeOn is true the button accepts no
 *     further clicks — `disabled` short-circuits onClick. The
 *     visual styling is unchanged so the button reads as the
 *     transition source, the still center of the dim/blur shift.
 *
 * Reduced motion:
 *   • prefers-reduced-motion: reduce → idle keyframe + ripple are
 *     suppressed entirely.
 */
const KEYFRAMES = `
@keyframes aiMaterialBreath {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 12px 36px rgba(0, 0, 0, 0.45),
      0 0 26px rgba(168, 85, 247, 0.26),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  50% {
    transform: scale(1.012);
    box-shadow:
      0 14px 40px rgba(0, 0, 0, 0.50),
      0 0 36px rgba(168, 85, 247, 0.36),
      inset 0 1px 0 rgba(255, 255, 255, 0.10);
  }
}

.axvela-ai-cta {
  animation: aiMaterialBreath 4s ease-in-out infinite;
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.45),
    0 0 26px rgba(168, 85, 247, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  will-change: transform, box-shadow;
}
.axvela-ai-cta:hover {
  border-color: rgba(168, 85, 247, 0.55);
}
.axvela-ai-cta:focus-visible {
  outline:        2px solid rgba(168, 85, 247, 0.7);
  outline-offset: 4px;
}

/* Press flash — momentary halo bump while finger is down. The
   transition smooths re-entry to the breath-driven shadow on
   release; box-shadow is high specificity vs. the keyframe. */
.axvela-ai-cta--pressed {
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.55),
    0 0 44px rgba(168, 85, 247, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  transition: box-shadow 140ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .axvela-ai-cta {
    animation: none !important;
    transform: none !important;
    will-change: auto;
  }
  .axvela-ai-ripple { display: none !important; }
}
`;

interface Props {
  /** Activation entrypoint. Wired to the parent's "AI mode" state
   *  machine; the parent decides whether to start the transition,
   *  open an overlay, etc. */
  onActivate: () => void;
  /** True while activation is in progress or AI mode is active.
   *  The button visuals are unchanged so it stays the focal point,
   *  but onClick is short-circuited to prevent re-entry. */
  disabled?: boolean;
  /** Bumped by the parent on each activation request so child
   *  ripple can re-key in sync with the orb ripple. Falls back to
   *  the local press counter if not supplied. */
  rippleKey?: number;
}

export function AxvelaAIButton({ onActivate, disabled = false, rippleKey }: Props) {
  const { t } = useLanguage();

  const [isPressed,    setIsPressed]    = React.useState(false);
  const [localRippleK, setLocalRippleK] = React.useState(0);

  // Use the parent's rippleKey when provided so the orb + button
  // ripples fire on the same React key, otherwise track locally.
  const effectiveRippleKey = rippleKey ?? localRippleK;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.textContent = KEYFRAMES;
    document.head.appendChild(tag);
  }, []);

  const handleClick = () => {
    if (disabled) return;
    setLocalRippleK(k => k + 1);
    onActivate();
  };

  const className = `axvela-ai-cta${isPressed ? " axvela-ai-cta--pressed" : ""}`;

  return (
    <motion.button
      type="button"
      aria-label="Open AXVELA AI assistant"
      onClick={handleClick}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.96, transition: { duration: 0.13, ease: "easeOut" } }}
      disabled={disabled}
      style={{
        position:         "relative",
        zIndex:           10,
        height:           56,
        minWidth:         160,
        padding:          "0 32px",
        background:
          "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0) 38%), " +
          "rgba(15, 15, 20, 0.78)",
        backdropFilter:        "blur(18px) saturate(115%)",
        WebkitBackdropFilter:  "blur(18px) saturate(115%)",
        border:           "1px solid rgba(168, 85, 247, 0.35)",
        borderRadius:     9999,
        cursor:           disabled ? "default" : "pointer",
        color:            "#FFFFFF",
        fontFamily:       FONT_HEAD,
        WebkitTapHighlightColor: "transparent",
        display:          "inline-flex",
        alignItems:       "center",
        justifyContent:   "center",
        gap:              10,
        // The button itself is the ripple anchor — keep it relative
        // so the absolute ripple element sits inside the visual
        // bounds.
      }}
    >
      <Sparkles
        size={17}
        strokeWidth={1.7}
        color="#C4B5FD"
        aria-hidden
      />
      <span style={{
        fontSize:       13,
        fontWeight:     600,
        letterSpacing:  "0.17em",
        color:          "#FFFFFF",
        lineHeight:     1,
      }}>
        {t("axvela.cta.title")}
      </span>

      {/* Ripple — one-shot violet ring expanding outward. Re-keyed
          per click so AnimatePresence cleanly tears down + remounts. */}
      <AnimatePresence>
        {effectiveRippleKey > 0 && (
          <motion.span
            key={effectiveRippleKey}
            className="axvela-ai-ripple"
            initial={{ scale: 0.9, opacity: 0.45 }}
            animate={{ scale: 2.0, opacity: 0    }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position:     "absolute",
              inset:        -2,
              borderRadius: 9999,
              border:       "1.5px solid rgba(168, 85, 247, 0.6)",
              pointerEvents: "none",
              willChange:    "transform, opacity",
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
