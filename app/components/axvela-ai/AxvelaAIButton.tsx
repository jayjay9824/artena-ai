"use client";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../../i18n/useLanguage";

const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

const STYLE_ID = "axvela-ai-cta-styles";

/**
 * Phase 1 idle styling — "premium AI mode entry", not a button.
 *
 *   • Dark glass body (rgba 15/15/20 .78 + 18px backdrop blur)
 *   • Hairline violet border (rgba 168/85/247 .35)
 *   • Subtle top-down purple highlight gradient layered onto the
 *     dark glass — gives the material a faint sheen without
 *     turning into a neon rectangle
 *   • Three-layer shadow:
 *       - a deep drop (0 12px 36px black .45) for floating weight
 *       - a soft violet halo (0 0 26px violet .26) for life
 *       - an inner top highlight (inset 0 1px 0 white .08) for the
 *         hand-finished glass edge
 *
 * The aiMaterialBreath keyframe animates scale 1 → 1.012 → 1
 * along with a subtle violet halo intensification, four-second
 * cycle. Reads as "living glass material" not a pulsing CTA.
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
  /* Initial shadow so the button reads as glass even before
     the keyframe's first tick lands. */
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.45),
    0 0 26px rgba(168, 85, 247, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.axvela-ai-cta:hover {
  border-color: rgba(168, 85, 247, 0.55);
}
.axvela-ai-cta:focus-visible {
  outline:        2px solid rgba(168, 85, 247, 0.7);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .axvela-ai-cta {
    animation: none !important;
    transform: none !important;
  }
}
`;

interface Props {
  onOpen: () => void;
}

export function AxvelaAIButton({ onOpen }: Props) {
  const { t } = useLanguage();

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.985 }}
      style={{
        position:         "relative",
        zIndex:           10,
        height:           56,
        minWidth:         160,
        padding:          "0 32px",
        // Subtle top-down purple highlight stacked on top of the
        // dark glass color — gives the material a faint inner sheen
        // without ever crossing into neon territory.
        background:
          "linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0) 38%), " +
          "rgba(15, 15, 20, 0.78)",
        backdropFilter:        "blur(18px) saturate(115%)",
        WebkitBackdropFilter:  "blur(18px) saturate(115%)",
        border:           "1px solid rgba(168, 85, 247, 0.35)",
        borderRadius:     9999,
        cursor:           "pointer",
        color:            "#FFFFFF",
        fontFamily:       FONT_HEAD,
        WebkitTapHighlightColor: "transparent",
        display:          "inline-flex",
        alignItems:       "center",
        justifyContent:   "center",
        gap:              10,
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
    </motion.button>
  );
}
