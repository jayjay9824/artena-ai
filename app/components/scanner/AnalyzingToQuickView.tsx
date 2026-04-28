"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";
import { trackEvent, startTimer } from "../../services/tracking/trackEvent";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

export interface MinimalQuickAnalysis {
  artist:         string;
  year?:          string;
  /** Single short sentence — sets the tone, italic-displayed. */
  oneLineInsight: string;
  /** One key trait OR market signal. Kept short — "Blue-chip", "Minimalism", etc. */
  keyTrait?:      string;
}

interface Props {
  /** Captured camera frame — used both as frosted backdrop and as the
   *  artwork imagery in the morphing card. */
  imageURI:  string;
  /** When null, screen stays in "Analyzing…" frost. When supplied,
   *  the spring transition runs and the Quick View card reveals. */
  analysis:  MinimalQuickAnalysis | null;
  /** PART 4 — single Save toggle. true → button reads "Saved" + bronze
   *  outline. false → "Save" filled white. */
  saved?:    boolean;
  onAsk:     () => void;
  onSave:    () => void;
  onClose:   () => void;
}

/**
 * PART 3 — Snap → Frost → Quick View transition.
 *
 *   Frost phase:
 *     • frozen camera frame as background, blur(40px) + dark tint
 *     • artwork rendered centered, scale 1.05
 *     • "Analyzing…" text breathing-opacity (no spinner)
 *
 *   Reveal phase (when analysis arrives, after a 400ms minimum):
 *     • shared-element layoutId="artwork" springs the image from
 *       center → header position (stiffness 200 / damping 20)
 *     • card content reveals with 100ms stagger:
 *         0  one-line insight (italic)
 *         1  artist + year
 *         2  one key trait / market signal
 *         3  Ask / Save buttons
 */
export function AnalyzingToQuickView({
  imageURI,
  analysis,
  saved = false,
  onAsk,
  onSave,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<"frost" | "reveal">("frost");

  // Hold frost ≥ 400ms even if analysis arrives instantly so the
  // morph is perceivable. Spec timing: 400ms.
  useEffect(() => {
    if (!analysis) return;
    const tt = setTimeout(() => setPhase("reveal"), 400);
    return () => clearTimeout(tt);
  }, [analysis]);

  const reveal = phase === "reveal";

  /* PART 5 — tracking edges. Refs guarantee one fire per session
     even if React re-mounts in strict mode. */
  const startedRef        = useRef(false);
  const completedRef      = useRef(false);
  const viewedRef         = useRef(false);
  const viewElapsedRef    = useRef<(() => number) | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("ANALYSIS_STARTED");
  }, []);

  useEffect(() => {
    if (!analysis) return;
    if (completedRef.current) return;
    completedRef.current = true;
    trackEvent("ANALYSIS_COMPLETED");
  }, [analysis]);

  useEffect(() => {
    if (!reveal) return;
    if (viewedRef.current) return;
    viewedRef.current = true;
    viewElapsedRef.current = startTimer();
    trackEvent("VIEW_RESULT");
  }, [reveal]);

  const handleAsk = () => {
    trackEvent("ASK", {
      duration: viewElapsedRef.current?.(),
    });
    onAsk();
  };

  const handleSave = () => {
    trackEvent("SAVE", {
      duration: viewElapsedRef.current?.(),
    });
    onSave();
  };

  return (
    <div style={{
      position:   "fixed",
      inset:      0,
      zIndex:     250,
      background: "#0D0D0D",
      overflow:   "hidden",
      fontFamily: FONT,
    }}>
      {/* ── Frosted background ────────────────────────────────── */}
      <div style={{
        position:           "absolute",
        inset:              0,
        backgroundImage:    `url(${imageURI})`,
        backgroundSize:     "cover",
        backgroundPosition: "center",
        filter:             "blur(40px) brightness(0.55)",
        transform:          "scale(1.15)",
        zIndex:             0,
      }} />
      {/* Subtle dark tint for text contrast */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "rgba(0,0,0,0.22)",
        zIndex:     1,
      }} />

      {/* ── × Close button (top-left) ─────────────────────────── */}
      <button
        onClick={onClose}
        aria-label={t("common.close")}
        style={{
          position:        "absolute",
          top:             "calc(20px + env(safe-area-inset-top, 0px))",
          left:            18,
          zIndex:          50,
          width:           36,
          height:          36,
          borderRadius:    "50%",
          background:      "rgba(0,0,0,0.4)",
          backdropFilter:  "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border:          "none",
          color:           "#FFFFFF",
          cursor:          "pointer",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* ── Artwork — shared element across phases ───────────── */}
      {!reveal ? (
        <motion.div
          layoutId="artena-quick-artwork"
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{
            position:    "absolute",
            top:         "50%",
            left:        "50%",
            translateX:  "-50%",
            translateY:  "-50%",
            width:       "62vw",
            height:      "62vw",
            scale:       1.05,
            borderRadius: 14,
            overflow:    "hidden",
            background:  "#0D0D0D",
            boxShadow:   "0 20px 50px rgba(0,0,0,0.55)",
            zIndex:      10,
          }}
        >
          <img
            src={imageURI}
            alt=""
            style={{
              width:    "100%",
              height:   "100%",
              objectFit: "cover",
              display:  "block",
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          layoutId="artena-quick-artwork"
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{
            position:     "absolute",
            top:          "calc(76px + env(safe-area-inset-top, 0px))",
            left:         "50%",
            translateX:   "-50%",
            width:        "92vw",
            height:       "58vw",
            borderRadius: 16,
            overflow:     "hidden",
            background:   "#0D0D0D",
            boxShadow:    "0 16px 44px rgba(0,0,0,0.45)",
            zIndex:       10,
          }}
        >
          <img
            src={imageURI}
            alt={analysis?.artist ?? ""}
            style={{
              width:    "100%",
              height:   "100%",
              objectFit: "cover",
              display:  "block",
            }}
          />
        </motion.div>
      )}

      {/* ── Frost phase: "Analyzing…" — breathing opacity, no spinner ── */}
      {!reveal && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position:      "absolute",
            left:          0,
            right:         0,
            bottom:        "calc(22% + env(safe-area-inset-bottom, 0px))",
            textAlign:     "center" as const,
            fontSize:      14,
            fontWeight:    500,
            color:         "#FFFFFF",
            letterSpacing: "0.05em",
            fontFamily:    FONT,
            margin:        0,
            zIndex:        20,
          }}
        >
          {t("transition.analyzing")}
        </motion.p>
      )}

      {/* ── Reveal phase: Quick View card content ─────────────── */}
      {reveal && analysis && (
        <div style={{
          position:  "absolute",
          left:      0,
          right:     0,
          top:       "calc(76px + env(safe-area-inset-top, 0px) + 58vw + 32px)",
          padding:   "0 22px",
          maxWidth:  440,
          margin:    "0 auto",
          zIndex:    20,
        }}>
          <Reveal index={0}>
            <p style={{
              fontSize:      18,
              fontWeight:    400,
              color:         "#FFFFFF",
              lineHeight:    1.45,
              fontStyle:     "italic",
              fontFamily:    "Georgia, 'Times New Roman', serif",
              margin:        "0 0 18px",
              letterSpacing: "-0.005em",
            }}>
              &ldquo;{analysis.oneLineInsight}&rdquo;
            </p>
          </Reveal>

          <Reveal index={1}>
            <p style={{
              fontSize:      13,
              color:         "rgba(255,255,255,0.78)",
              margin:        "0 0 8px",
              letterSpacing: "0.02em",
              fontFamily:    FONT_HEAD,
            }}>
              {analysis.artist}{analysis.year ? ` · ${analysis.year}` : ""}
            </p>
          </Reveal>

          {analysis.keyTrait && (
            <Reveal index={2}>
              <p style={{
                fontSize:      11,
                color:         "#C9A56C",
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                margin:        "0 0 24px",
                fontWeight:    600,
                fontFamily:    FONT,
              }}>
                {analysis.keyTrait}
              </p>
            </Reveal>
          )}

          <Reveal index={3}>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={handleAsk}
                style={{
                  flex:          1,
                  padding:       "13px 0",
                  background:    "#FFFFFF",
                  color:         "#0D0D0D",
                  border:        "none",
                  borderRadius:  999,
                  fontSize:      13,
                  fontWeight:    600,
                  letterSpacing: "0.06em",
                  cursor:        "pointer",
                  fontFamily:    FONT,
                }}
              >
                {t("quick.ask")}
              </button>
              <button
                onClick={handleSave}
                aria-pressed={saved}
                style={{
                  flex:          1,
                  padding:       "13px 0",
                  background:    saved ? "rgba(201,165,108,0.12)" : "transparent",
                  color:         saved ? "#C9A56C" : "#FFFFFF",
                  border:        `0.5px solid ${saved ? "rgba(201,165,108,0.6)" : "rgba(255,255,255,0.45)"}`,
                  borderRadius:  999,
                  fontSize:      13,
                  fontWeight:    saved ? 600 : 500,
                  letterSpacing: "0.06em",
                  cursor:        "pointer",
                  fontFamily:    FONT,
                  transition:    "background .15s, color .15s, border-color .15s",
                }}
              >
                {saved ? t("quick.saved") : t("quick.save")}
              </button>
            </div>
          </Reveal>
        </div>
      )}
    </div>
  );
}

/* Stagger child — fades in + slight slide-up after a delay tied to
   `index`. 100ms stagger per spec. The 0.4 base waits for the
   shared-element morph to finish before content lands. */
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.36,
        delay:    0.4 + index * 0.1,
        ease:     [0.32, 0.72, 0, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
