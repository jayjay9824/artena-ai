"use client";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT      = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans',   -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

const STYLE_ID = "axvela-ai-cta-styles";

const KEYFRAMES = `
@keyframes axvelaPulse {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(139, 92, 246, 0.40),
      0 0 40px rgba(139, 92, 246, 0.25),
      0 0 60px rgba(139, 92, 246, 0.15),
      inset 0 0 12px rgba(167, 139, 250, 0.20);
    border-color: rgba(139, 92, 246, 0.60);
  }
  50% {
    box-shadow:
      0 0 28px rgba(139, 92, 246, 0.60),
      0 0 56px rgba(139, 92, 246, 0.40),
      0 0 84px rgba(139, 92, 246, 0.25),
      inset 0 0 16px rgba(167, 139, 250, 0.32);
    border-color: rgba(167, 139, 250, 0.90);
  }
}

@keyframes axvelaSparkleTwinkle {
  0%, 100% { opacity: 1;   transform: scale(1)    rotate(0deg); }
  50%      { opacity: 0.6; transform: scale(1.15) rotate(15deg); }
}

@keyframes axvelaFloat {
  0%, 100% { transform: translate3d(-50%, 0, 0); }
  50%      { transform: translate3d(-50%, -4px, 0); }
}

.axvela-ai-cta {
  animation: axvelaPulse 2.8s ease-in-out infinite,
             axvelaFloat 4s ease-in-out infinite;
}
.axvela-ai-cta .axvela-ai-sparkle {
  animation: axvelaSparkleTwinkle 2s ease-in-out infinite;
}
.axvela-ai-cta:hover {
  filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.5));
}
.axvela-ai-cta:focus-visible {
  outline:        2px solid #A78BFA;
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .axvela-ai-cta,
  .axvela-ai-cta .axvela-ai-sparkle {
    animation: none !important;
  }
}
`;

/**
 * Floating AXVELA AI launcher pill — black/violet glow with a
 * subtle pulse + float, sparkle that twinkles. Fixed centered
 * just above the HomeDock so it's the most prominent
 * always-available CTA on the home surface.
 *
 * Visual ownership is the launcher only — the modal it opens
 * is a separate component (AxvelaAIChatModal). Parent supplies
 * the open handler and decides when (if ever) to hide the
 * button (e.g. while scanning).
 */
interface Props {
  onOpen: () => void;
  /** Optional override of the bottom anchor; defaults sit above
   *  the HomeDock (which is 120px tall + safe area). */
  bottomOffset?: string;
}

export function AxvelaAIButton({ onOpen, bottomOffset }: Props) {
  const { t } = useLanguage();

  // Inject keyframes once per session — keeps the multi-layer
  // glow + pulse + sparkle out of the inline-style hot path.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.textContent = KEYFRAMES;
    document.head.appendChild(tag);
  }, []);

  return (
    <motion.button
      type="button"
      aria-label="Open AXVELA AI assistant"
      onClick={onOpen}
      className="axvela-ai-cta"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.97 }}
      style={{
        position:        "fixed",
        left:            "50%",
        // The keyframe animation owns transform — we use it for the
        // float bob with the -50% X offset. Initial mount uses framer
        // y, then the CSS animation takes over.
        bottom:          bottomOffset ?? "calc(168px + env(safe-area-inset-bottom, 0px))",
        zIndex:          50,
        // Half-sized single-line pill. The subtitle was dropped —
        // at this footprint it would be sub-9px and unreadable;
        // the icon + title carry the brand on its own.
        minWidth:        140,
        padding:         "7px 16px",
        background:      "linear-gradient(135deg, #0A0A14 0%, #1A1A2E 100%)",
        border:          "1.25px solid rgba(139, 92, 246, 0.6)",
        borderRadius:    999,
        cursor:          "pointer",
        color:           "#FFFFFF",
        fontFamily:      FONT,
        WebkitTapHighlightColor: "transparent",
        display:         "inline-flex",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             6,
      }}
    >
      <span style={{
        fontSize:        11.5,
        fontWeight:      600,
        letterSpacing:   "0.10em",
        color:           "#FFFFFF",
        fontFamily:      FONT_HEAD,
        lineHeight:      1,
      }}>
        {t("axvela.cta.title")}
      </span>
      <Sparkles
        className="axvela-ai-sparkle"
        size={11}
        strokeWidth={1.8}
        color="#A78BFA"
        aria-hidden
      />
    </motion.button>
  );
}
